      return userMethods.isBot(this);
    }
    isUserAuthorized() {
      return userMethods.isUserAuthorized(this);
    }
    getEntity(entity) {
      return userMethods.getEntity(this, entity);
    }
    getInputEntity(entity) {
      return userMethods.getInputEntity(this, entity);
    }
    getPeerId(peer, addMark = true) {
      return userMethods.getPeerId(this, peer, addMark);
    }
    _getInputDialog(peer) {
      return userMethods._getInputDialog(this, peer);
    }
    _getInputNotify(notify) {
      return userMethods._getInputNotify(this, notify);
    }
    async _handleReconnect() {
      this._log.info("Handling reconnect!");
      try {
        await this.getMe();
      } catch (e) {
        if (this._sender?.userDisconnected) {
          this._log.debug(`Reconnect probe cancelled by disconnect: ${e instanceof Error ? e.message : e}`);
          return;
        }
        if (e?.code === 401) {
          this._log.debug(`Reconnect probe skipped: not authorized yet (${e.errorMessage})`);
        } else {
          this._log.error(`Error while trying to reconnect`, e);
          if (this._errorHandler) {
            await this._errorHandler(e);
          }
        }
      }
      if (!this._loopStarted && !this._destroyed) {
        this._log.info("Restarting update loop after reconnect");
        (0, dispatch_1._updateLoop)(this);
        this._loopStarted = true;
      }
      if (!this._destroyed && !this._sender?.userDisconnected) {
        await this.updateManager.catchUp();
        if (!this._destroyed && !this._sender?.userDisconnected) {
          this._emitLifecycle("reconnect");
        }
      }
    }
    connect() {
      if (this._destroyed)
        return Promise.reject(new Error("Cannot connect a destroyed client"));
      if (this._connectTask)
        return this._connectTask;
      const task = this._connectOnce();
      this._connectTask = task;
      task.finally(() => {
        if (this._connectTask === task)
          this._connectTask = undefined;
      }).catch(() => {});
      return task;
    }
    async _connectOnce() {
      await this._initSession();
      if (this._destroyed)
        throw new Error("Cannot connect a destroyed client");
      const hasSessionKey = Boolean(this.session.getAuthKey(this.session.dcId)?.getKey());
      if (this._sender === undefined) {
        const dcId = this.session.dcId || 4;
        const sessionKey = this.session.getAuthKey(dcId);
        const dcenter = this._dcenters.get(dcId, sessionKey);
        if (sessionKey && sessionKey !== dcenter.authKey) {
          await dcenter.authKey.setKey(sessionKey.getKey());
        }
        this.session.setAuthKey(dcenter.authKey, dcId);
        this._sender = new network_1.MTProtoSender(dcenter.authKey, {
          logger: this._log,
          dcId,
          retries: this._connectionRetries,
          delay: this._retryDelay,
          autoReconnect: this._autoReconnect,
          connectTimeout: this._timeout,
          authKeyCallback: this._authKeyCallback.bind(this),
          updateCallback: dispatch_1._handleUpdate.bind(this),
          isMainSender: true,
          client: this,
          securityChecks: this._securityChecks,
          autoReconnectCallback: this._handleReconnect.bind(this),
          lifecycleCallback: this._handleConnectionLifecycle.bind(this),
          reconnectRetries: this._reconnectRetries,
          dcenter
        });
      }
      if (this._sender.isConnected()) {
        if (!this._loopStarted) {
          (0, dispatch_1._updateLoop)(this);
          this._loopStarted = true;
        }
        return false;
      }
      const connection = new this._connection({
        ip: this.session.serverAddress,
        port: this.session.port || 80,
        dcId: this.session.dcId,
        loggers: this._log,
        proxy: this._proxy,
        socket: this.networkSocket,
        keepAliveInterval: this._keepAliveInterval,
        testServers: this._testServers
      });
      this._log.info(`Using LAYER ${registry_1.LAYER} for initial connect`);
      await this._connectSender(this._sender, this.session.dcId, connection);
      if (this._destroyed || this._sender.userDisconnected) {
        throw new Error("Connection attempt cancelled");
      }
      this.session.setAuthKey(this._sender.authKey);
      this.session.save();
      if (!this._loopStarted) {
        (0, dispatch_1._updateLoop)(this, hasSessionKey);
        this._loopStarted = true;
      }
      this._connectedDeferred.resolve();
      this._isSwitchingDc = false;
      return true;
    }
    async _switchDC(newDc) {
      this._log.info(`Reconnecting to new data center ${newDc}`);
      const DC = await this.getDC(newDc);
      this.session.setDC(newDc, DC.ipAddress, DC.port);
      this.session.save();
      this._isSwitchingDc = true;
      await this._media.purge();
      await this._network.purge();
      await this._disconnect();
      this._sender = undefined;
      return await this.connect();
    }
    async getDC(dcId, downloadDC = false) {
      this._log.debug(`Getting DC ${dcId}`);
      if (this.networkSocket.isWebSocket) {
        const address = (0, telegramBaseClient_1.webSocketDcAddress)(dcId, downloadDC);
        if (address) {
          return { id: dcId, ipAddress: address, port: 443 };
        }
        throw new Error(`Cannot find the DC with the ID of ${dcId}`);
      }
      if (!this._config) {
        try {
          this._config = await this.api.help.getConfig();
        } catch (e) {
          this._log.warn(`help.GetConfig failed, falling back to built-in DC seeds: ${e}`);
        }
      }
      const lookup = this._lookupDcOption(dcId, downloadDC);
      if (lookup) {
        return lookup;
      }
      const ipv4Table = this._testServers ? telegramBaseClient_1.TEST_DC_IPV4 : telegramBaseClient_1.PROD_DC_IPV4;
      const ipv6Table = this._testServers ? telegramBaseClient_1.TEST_DC_IPV6 : telegramBaseClient_1.PROD_DC_IPV6;
      const ipAddress = (this._useIPV6 ? ipv6Table : ipv4Table)[dcId];
      if (ipAddress) {
        return { id: dcId, ipAddress, port: 443 };
      }
      throw new Error(`Cannot find the DC with the ID of ${dcId}`);
    }
    _lookupDcOption(dcId, mediaCluster) {
      if (!this._config)
        return;
      let candidates = this._config.dcOptions.filter((DC) => {
        if (DC.id !== dcId)
          return false;
        if (DC.cdn)
          return false;
        if (DC.mediaOnly && !mediaCluster)
          return false;
        if (DC.secret && DC.secret.length)
          return false;
        if (DC.tcpoOnly)
          return false;
        return !!DC.ipv6 === this._useIPV6;
      });
      if (!candidates.length)
        return;
      if (mediaCluster && candidates.some((DC) => DC.mediaOnly)) {
        candidates = candidates.filter((DC) => DC.mediaOnly);
      }
      if (this._proxy && candidates.some((DC) => DC.static)) {
        candidates = candidates.filter((DC) => DC.static);
      }
      const failures = this._dcConnectFailures.get(`${dcId}:${mediaCluster}`) ?? 0;
      const chosen = candidates[failures % candidates.length];
      return {
        id: chosen.id,
        ipAddress: chosen.ipAddress,
        port: chosen.port || 443
      };
    }
    async _getDownloadConcurrency(fileSize) {
      if (!this._appConfig) {
        try {
          const result = await this.api.help.getAppConfig({ hash: 0 });
          if (result instanceof tl_1.Api.help.AppConfig) {
            this._appConfig = {};
            const walk = (v) => {
              if (v instanceof tl_1.Api.JsonObject) {
                const obj = {};
                for (const kv of v.value) {
                  obj[kv.key] = walk(kv.value);
                }
                return obj;
              }
              if (v instanceof tl_1.Api.JsonArray)
                return v.value.map(walk);
              if (v instanceof tl_1.Api.JsonString)
                return v.value;
              if (v instanceof tl_1.Api.JsonNumber)
                return v.value;
              if (v instanceof tl_1.Api.JsonBool)
                return v.value;
              if (v instanceof tl_1.Api.JsonNull)
                return null;
              return v;
            };
            this._appConfig = walk(result.config);
          }
        } catch {
          this._appConfig = {};
        }
      }
      const smallLimit = this._appConfig?.small_queue_max_active_operations_count ?? 4;
      const largeLimit = this._appConfig?.large_queue_max_active_operations_count ?? 8;
      return fileSize > 20 * 1024 * 1024 ? largeLimit : smallLimit;
    }
    _getResponseMessage(req, result, inputChat) {
      return parseMethods._getResponseMessage(this, req, result, inputChat);
    }
    static get events() {
      return require_events();
    }
  }
  exports2.TelegramClient = TelegramClient;
});

// node_modules/teleproto/client/updates/index.js
var require_updates = __commonJS((exports2) => {
  var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p))
        __createBinding(exports3, m, p);
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.UpdateContext = exports2.ClientUpdates = exports2.WAIT_FOR_SKIPPED_TIMEOUT_MS = exports2.PtsWaiter = exports2.UpdateManager = undefined;
  __exportStar(require_dispatch(), exports2);
  var manager_1 = require_manager();
  Object.defineProperty(exports2, "UpdateManager", { enumerable: true, get: function() {
    return manager_1.UpdateManager;
  } });
  var ptsWaiter_1 = require_ptsWaiter();
  Object.defineProperty(exports2, "PtsWaiter", { enumerable: true, get: function() {
    return ptsWaiter_1.PtsWaiter;
  } });
  Object.defineProperty(exports2, "WAIT_FOR_SKIPPED_TIMEOUT_MS", { enumerable: true, get: function() {
    return ptsWaiter_1.WAIT_FOR_SKIPPED_TIMEOUT_MS;
  } });
  var composer_1 = require_composer();
  Object.defineProperty(exports2, "ClientUpdates", { enumerable: true, get: function() {
    return composer_1.ClientUpdates;
  } });
  var context_1 = require_context();
  Object.defineProperty(exports2, "UpdateContext", { enumerable: true, get: function() {
    return context_1.UpdateContext;
  } });
});

// node_modules/teleproto/client/index.js
var require_client = __commonJS((exports2) => {
  var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports2 && exports2.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2)
          if (Object.prototype.hasOwnProperty.call(o2, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.users = exports2.uploads = exports2.updates = exports2.tgClient = exports2.telegramBaseClient = exports2.message = exports2.messageParse = exports2.downloads = exports2.dialogs = exports2.communities = exports2.chats = exports2.buttons = exports2.bots = exports2.auth = exports2.twoFA = undefined;
  var twoFA = __importStar(require_2fa());
  exports2.twoFA = twoFA;
  var auth = __importStar(require_auth());
  exports2.auth = auth;
  var bots = __importStar(require_bots());
  exports2.bots = bots;
  var buttons = __importStar(require_buttons());
  exports2.buttons = buttons;
  var chats = __importStar(require_chats());
  exports2.chats = chats;
  var communities = __importStar(require_communities());
  exports2.communities = communities;
  var dialogs = __importStar(require_dialogs());
  exports2.dialogs = dialogs;
  var downloads = __importStar(require_downloads());
  exports2.downloads = downloads;
  var messageParse = __importStar(require_messageParse());
  exports2.messageParse = messageParse;
  var message = __importStar(require_messages2());
  exports2.message = message;
  var telegramBaseClient = __importStar(require_telegramBaseClient());
  exports2.telegramBaseClient = telegramBaseClient;
  var tgClient = __importStar(require_TelegramClient());
  exports2.tgClient = tgClient;
  var updates = __importStar(require_updates());
  exports2.updates = updates;
  var uploads = __importStar(require_uploads());
  exports2.uploads = uploads;
  var users = __importStar(require_users());
  exports2.users = users;
});

// node_modules/teleproto/index.js
var require_teleproto = __commonJS((exports2) => {
  var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports2 && exports2.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2)
          if (Object.prototype.hasOwnProperty.call(o2, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.events = exports2.client = exports2.password = exports2.tl = exports2.helpers = exports2.extensions = exports2.sessions = exports2.errors = exports2.utils = exports2.Logger = exports2.version = exports2.ConnectionWebProxy = exports2.Connection = exports2.Keyboard = exports2.ReplyKeyboard = exports2.InlineKeyboard = exports2.Button = exports2.TelegramClient = exports2.Rich = exports2.Api = undefined;
  var tl_1 = require_tl();
  Object.defineProperty(exports2, "Api", { enumerable: true, get: function() {
    return tl_1.Api;
  } });
  exports2.Rich = __importStar(require_richMessage());
  var tl = __importStar(require_tl());
  exports2.tl = tl;
  var TelegramClient_1 = require_TelegramClient();
  Object.defineProperty(exports2, "TelegramClient", { enumerable: true, get: function() {
    return TelegramClient_1.TelegramClient;
  } });
  var button_1 = require_button();
  Object.defineProperty(exports2, "Button", { enumerable: true, get: function() {
    return button_1.Button;
  } });
  var keyboard_1 = require_keyboard();
  Object.defineProperty(exports2, "InlineKeyboard", { enumerable: true, get: function() {
    return keyboard_1.InlineKeyboard;
  } });
  Object.defineProperty(exports2, "ReplyKeyboard", { enumerable: true, get: function() {
    return keyboard_1.ReplyKeyboard;
  } });
  Object.defineProperty(exports2, "Keyboard", { enumerable: true, get: function() {
    return keyboard_1.Keyboard;
  } });
  var network_1 = require_network();
  Object.defineProperty(exports2, "Connection", { enumerable: true, get: function() {
    return network_1.Connection;
  } });
  var WebProxy_1 = require_WebProxy();
  Object.defineProperty(exports2, "ConnectionWebProxy", { enumerable: true, get: function() {
    return WebProxy_1.ConnectionWebProxy;
  } });
  var Version_1 = require_Version();
  Object.defineProperty(exports2, "version", { enumerable: true, get: function() {
    return Version_1.version;
  } });
  var Logger_1 = require_Logger();
  Object.defineProperty(exports2, "Logger", { enumerable: true, get: function() {
    return Logger_1.Logger;
  } });
  var utils = __importStar(require_Utils());
  exports2.utils = utils;
  var errors = __importStar(require_errors());
  exports2.errors = errors;
  var sessions = __importStar(require_sessions());
  exports2.sessions = sessions;
  var extensions = __importStar(require_extensions());
  exports2.extensions = extensions;
  var helpers = __importStar(require_Helpers());
  exports2.helpers = helpers;
  var client = __importStar(require_client());
  exports2.client = client;
  var password = __importStar(require_Password());
  exports2.password = password;
  var events = __importStar(require_events());
  exports2.events = events;
});

// src/api-methods.ts
var exports_api_methods = {};
__export(exports_api_methods, {
  resolveApiMethod: () => resolveApiMethod,
  isApiReadMethod: () => isApiReadMethod,
  apiRefusalReason: () => apiRefusalReason
});
function methodPart(name) {
  const dot = name.indexOf(".");
  return dot < 0 ? name : name.slice(dot + 1);
}
function isApiReadMethod(name) {
  const lower = name.toLowerCase();
  if (FORCE_WRITE.has(lower))
    return false;
  if (EXTRA_READ.has(lower))
    return true;
  return READ_PREFIX.test(methodPart(lower));
}
function nestedTypeNames(value, out = []) {
  if (Array.isArray(value)) {
    for (const v of value)
      nestedTypeNames(v, out);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if ((k === "_" || k === "className") && typeof v === "string")
        out.push(v);
      else
        nestedTypeNames(v, out);
    }
  }
  return out;
}
function apiRefusalReason(name, params) {
  const lower = name.toLowerCase();
  if (WRAPPERS.has(lower)) {
    return "Refused: wrapper requests (InvokeWithLayer, InvokeWithoutUpdates, InitConnection, …) can carry any other request; call the inner method directly.";
  }
  const nsRefusal = REFUSED_NAMESPACES[NAMESPACE(lower)];
  if (nsRefusal)
    return nsRefusal;
  const fixed = ALWAYS_REFUSED.get(lower);
  if (fixed)
    return fixed;
  if (NAMESPACE(lower) === "payments" && !isApiReadMethod(name)) {
    return "Refused: payment / Stars-spending methods are never run. Read-only payments methods (balances, transactions) are allowed.";
  }
  if (params) {
    for (const inner of nestedTypeNames(params)) {
      const innerLower = inner.toLowerCase();
      const innerRefusal = REFUSED_NAMESPACES[NAMESPACE(innerLower)] ?? ALWAYS_REFUSED.get(innerLower);
      if (innerRefusal)
        return innerRefusal;
    }
    if (lower === "contacts.addcontact" && params.addPhonePrivacyException) {
      return "Refused: addPhonePrivacyException shares your phone number with this contact.";
    }
    if ((lower === "messages.sendmedia" || lower === "messages.editmessage" || lower === "messages.sendmultimedia") && SHARED_MEDIA.test(JSON.stringify(params))) {
      return "Refused: this sends a contact card or a geographic location.";
    }
  }
  return null;
}
function isRequestCtor(value) {
  const c = value;
  return typeof value === "function" && c?.classType === "request" && typeof c.className === "string";
}
function resolveApiMethod(name) {
  const trimmed = name.trim();
  if (!trimmed)
    throw new Error('Specify a method, e.g. "messages.GetHistory" or "help.GetConfig".');
  const dot = trimmed.indexOf(".");
  const api = import_teleproto.Api;
  if (dot < 0) {
    const ctor2 = findCaseInsensitive(api, trimmed);
    if (ctor2 && isRequestCtor(ctor2))
      return { ctor: ctor2, className: ctorName(ctor2) };
    throw new Error(`Unknown method "${name}". Top-level requests look like "InvokeWithLayer"; most methods are namespaced, e.g. "messages.GetHistory".`);
  }
  const ns = trimmed.slice(0, dot);
  const method = trimmed.slice(dot + 1);
  const nsKey = NAMESPACES.find((n) => n.toLowerCase() === ns.toLowerCase());
  if (!nsKey) {
    throw new Error(`Unknown namespace "${ns}". Known namespaces: ${NAMESPACES.join(", ")}.`);
  }
  const nsObj = api[nsKey];
  const ctor = nsObj && findCaseInsensitive(nsObj, method);
  if (ctor && isRequestCtor(ctor))
    return { ctor, className: ctorName(ctor) };
  throw new Error(`Unknown method "${nsKey}.${method}". It is not a request in this TL layer.`);
}
function ctorName(ctor) {
  return ctor.className;
}
function findCaseInsensitive(obj, key) {
  if (key in obj)
    return obj[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj))
    if (k.toLowerCase() === lower)
      return obj[k];
  return;
}
var import_teleproto, NAMESPACE = (name) => {
  const dot = name.indexOf(".");
  return dot < 0 ? "" : name.slice(0, dot);
}, READ_PREFIX, FORCE_WRITE, EXTRA_READ, REFUSED_NAMESPACES, ALWAYS_REFUSED, WRAPPERS, SHARED_MEDIA, NAMESPACES;
var init_api_methods = __esm(() => {
  import_teleproto = __toESM(require_teleproto(), 1);
  READ_PREFIX = /^(get|check|search|resolve)/;
  FORCE_WRITE = new Set([
    "messages.getbotcallbackanswer",
    "ephemeral.getcallbackanswer",
    "messages.getmessagesviews"
  ]);
  EXTRA_READ = new Set([]);
  REFUSED_NAMESPACES = {
    auth: "Refused: login and session management must go through `telegram auth` / `telegram onboard` in a terminal, never through the api command, a generated API command, or MCP."
  };
  ALWAYS_REFUSED = new Map([
    ["account.deleteaccount", "Refused: deleting the account is irreversible."],
    ["account.resetauthorization", "Refused: terminating a login session."],
    ["account.resetwebauthorization", "Refused: terminating a web-login session."],
    ["account.resetwebauthorizations", "Refused: terminating all web-login sessions."],
    ["account.setauthorizationttl", "Refused: changing how long other sessions stay logged in is security-sensitive."],
    ["account.changeauthorizationsettings", "Refused: changing a session's settings is security-sensitive."],
    ["account.updatepasswordsettings", "Refused: changing the 2FA password is security-sensitive; do it in an official client."],
    ["account.resetpassword", "Refused: resetting the 2FA password is security-sensitive."],
    ["account.declinepasswordreset", "Refused: 2FA password-reset management is security-sensitive."],
    ["account.getpasswordsettings", "Refused: this reveals 2FA password settings and needs the password."],
    ["account.gettmppassword", "Refused: this mints a temporary password token."],
    ["account.changephone", "Refused: changing the account phone number is security-sensitive."],
    ["account.sendchangephonecode", "Refused: part of changing the account phone number."],
    ["account.confirmphone", "Refused: phone-number confirmation is security-sensitive."],
    ["account.sendconfirmphonecode", "Refused: phone-number confirmation is security-sensitive."],
    ["account.sendverifyphonecode", "Refused: phone-number verification is security-sensitive."],
    ["account.verifyphone", "Refused: phone-number verification is security-sensitive."],
    ["account.sendverifyemailcode", "Refused: email verification is security-sensitive."],
    ["account.verifyemail", "Refused: email verification is security-sensitive."],
    ["account.inittakeoutsession", "Refused: starting a data-export (takeout) session."],
    ["account.finishtakeoutsession", "Refused: takeout-session management."],
    ["account.acceptauthorization", "Refused: Telegram Passport — this shares identity documents."],
    ["account.savesecurevalue", "Refused: Telegram Passport — this stores identity documents."],
    ["account.deletesecurevalue", "Refused: Telegram Passport identity-document management."],
    ["account.setprivacy", "Refused: changing privacy rules can expose your phone number or let strangers add you; do it in an official client."],
    ["account.updatebusinesslocation", "Refused: this shares a geographic location."],
    ["channels.editlocation", "Refused: this sets (shares) a geographic location."],
    ["contacts.getlocated", "Refused: this publishes your geolocation to find people nearby."],
    ["contacts.acceptcontact", "Refused: accepting a contact shares your phone number."],
    ["messages.accepturlauth", "Refused: this logs into an external website with your account."],
    ["messages.requesturlauth", "Refused: this is part of logging into an external website."],
    ["messages.checkurlauthmatchcode", "Refused: this completes a url-auth login."],
    ["channels.editcreator", "Refused: transferring ownership needs the 2FA password. Use `telegram transfer-owner`."],
    ["messages.editchatcreator", "Refused: transferring ownership needs the 2FA password. Use `telegram transfer-owner`."],
    ["payments.getstarsrevenuewithdrawalurl", "Refused: this mints a URL that can withdraw Stars revenue."],
    ["payments.getstargiftwithdrawalurl", "Refused: this mints a URL that can withdraw a star gift."],
    ["payments.getstarsrevenueadsaccounturl", "Refused: this mints a URL into the Stars ad account."],
    ["payments.resolvestargiftoffer", "Refused: resolving/redeeming a star-gift offer is a paying action."],
    ["phone.getgroupcallstreamrtmpurl", "Refused: this mints a stream key (a credential)."]
  ]);
  WRAPPERS = new Set([
    "invokeaftermsg",
    "invokeaftermsgs",
    "initconnection",
    "invokewithlayer",
    "invokewithoutupdates",
    "invokewithmessagesrange",
    "invokewithtakeout",
    "invokewithbusinessconnection",
    "invokewithgoogleplayintegrity",
    "invokewithapnssecret",
    "invokewithrecaptcha"
  ]);
  SHARED_MEDIA = /InputMediaContact|InputMediaGeoPoint|InputMediaGeoLive|InputMediaVenue/i;
  NAMESPACES = [
    "auth",
    "account",
    "users",
    "contacts",
    "messages",
    "updates",
    "photos",
    "upload",
    "help",
    "channels",
    "bots",
    "payments",
    "stickers",
    "phone",
    "stats",
    "stories",
    "premium",
    "smsjobs",
    "fragment",
    "chatlists",
    "folders",
    "langpack",
    "aicompose",
    "communities",
    "ephemeral"
  ];
});

// node_modules/ws/lib/constants.js
var require_constants = __commonJS((exports2, module2) => {
  var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
  var hasBlob = typeof Blob !== "undefined";
  if (hasBlob)
    BINARY_TYPES.push("blob");
  module2.exports = {
    BINARY_TYPES,
    CLOSE_TIMEOUT: 30000,
    EMPTY_BUFFER: Buffer.alloc(0),
    GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
    hasBlob,
    kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
    kListener: Symbol("kListener"),
    kStatusCode: Symbol("status-code"),
    kWebSocket: Symbol("websocket"),
    NOOP: () => {}
  };
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS((exports2, module2) => {
  var { websocketMask, websocketUnmask } = require("http");
  var { EMPTY_BUFFER } = require_constants();
  var FastBuffer = Buffer[Symbol.species];
  function concat(list, totalLength) {
    if (list.length === 0)
      return EMPTY_BUFFER;
    if (list.length === 1)
      return list[0];
    const target = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (let i = 0;i < list.length; i++) {
      const buf = list[i];
      target.set(buf, offset);
      offset += buf.length;
    }
    if (offset < totalLength) {
      return new FastBuffer(target.buffer, target.byteOffset, offset);
    }
    return target;
  }
  function _mask(source, mask, output, offset, length) {
    for (let i = 0;i < length; i++) {
      output[offset + i] = source[i] ^ mask[i & 3];
    }
  }
  function _unmask(buffer, mask) {
    for (let i = 0;i < buffer.length; i++) {
      buffer[i] ^= mask[i & 3];
    }
  }
  function toArrayBuffer(buf) {
    if (buf.length === buf.buffer.byteLength) {
      return buf.buffer;
    }
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  }
  function toBuffer(data) {
    toBuffer.readOnly = true;
    if (Buffer.isBuffer(data))
      return data;
    let buf;
    if (data instanceof ArrayBuffer) {
      buf = new FastBuffer(data);
    } else if (ArrayBuffer.isView(data)) {
      buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
    } else {
      buf = Buffer.from(data);
      toBuffer.readOnly = false;
    }
    return buf;
  }
  module2.exports = {
    concat,
    mask: _mask,
    toArrayBuffer,
    toBuffer,
    unmask: _unmask
  };
  if (websocketMask) {
    module2.exports.mask = function(source, mask, output, offset, length) {
      if (length < 24)
        _mask(source, mask, output, offset, length);
      else
        websocketMask(source, mask, output, offset, length);
    };
    module2.exports.unmask = function(buffer, mask) {
      if (buffer.length < 24)
        _unmask(buffer, mask);
      else
        websocketUnmask(buffer, mask);
    };
  } else if (!process.env.WS_NO_BUFFER_UTIL) {
    try {
      const bufferUtil = (()=>{throw new Error("Cannot require module "+"bufferutil");})();
      module2.exports.mask = function(source, mask, output, offset, length) {
        if (length < 48)
          _mask(source, mask, output, offset, length);
        else
          bufferUtil.mask(source, mask, output, offset, length);
      };
      module2.exports.unmask = function(buffer, mask) {
        if (buffer.length < 32)
          _unmask(buffer, mask);
        else
          bufferUtil.unmask(buffer, mask);
      };
    } catch (e) {}
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS((exports2, module2) => {
  var kDone = Symbol("kDone");
  var kRun = Symbol("kRun");

  class Limiter {
    constructor(concurrency) {
      this[kDone] = () => {
        this.pending--;
        this[kRun]();
      };
      this.concurrency = concurrency || Infinity;
      this.jobs = [];
      this.pending = 0;
    }
    add(job) {
      this.jobs.push(job);
      this[kRun]();
    }
    [kRun]() {
      if (this.pending === this.concurrency)
        return;
      if (this.jobs.length) {
        const job = this.jobs.shift();
        this.pending++;
        job(this[kDone]);
      }
    }
  }
  module2.exports = Limiter;
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS((exports2, module2) => {
  var zlib = require("zlib");
  var bufferUtil = require_buffer_util();
  var Limiter = require_limiter();
  var { kStatusCode } = require_constants();
  var FastBuffer = Buffer[Symbol.species];
  var TRAILER = Buffer.from([0, 0, 255, 255]);
  var kPerMessageDeflate = Symbol("permessage-deflate");
  var kTotalLength = Symbol("total-length");
  var kCallback = Symbol("callback");
  var kBuffers = Symbol("buffers");
  var kError = Symbol("error");
  var zlibLimiter;

  class PerMessageDeflate {
    constructor(options) {
      this._options = options || {};
      this._threshold = this._options.threshold !== undefined ? this._options.threshold : 1024;
      this._maxPayload = this._options.maxPayload | 0;
      this._isServer = !!this._options.isServer;
      this._deflate = null;
      this._inflate = null;
      this.params = null;
      if (!zlibLimiter) {
        const concurrency = this._options.concurrencyLimit !== undefined ? this._options.concurrencyLimit : 10;
        zlibLimiter = new Limiter(concurrency);
      }
    }
    static get extensionName() {
      return "permessage-deflate";
    }
    offer() {
      const params = {};
      if (this._options.serverNoContextTakeover) {
        params.server_no_context_takeover = true;
      }
      if (this._options.clientNoContextTakeover) {
        params.client_no_context_takeover = true;
      }
      if (this._options.serverMaxWindowBits) {
        params.server_max_window_bits = this._options.serverMaxWindowBits;
      }
      if (this._options.clientMaxWindowBits) {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      } else if (this._options.clientMaxWindowBits == null) {
        params.client_max_window_bits = true;
      }
      return params;
    }
    accept(configurations) {
      configurations = this.normalizeParams(configurations);
      this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
      return this.params;
    }
    cleanup() {
      if (this._inflate) {
        this._inflate.close();
        this._inflate = null;
      }
      if (this._deflate) {
        const callback = this._deflate[kCallback];
        this._deflate.close();
        this._deflate = null;
        if (callback) {
          callback(new Error("The deflate stream was closed while data was being processed"));
        }
      }
    }
    acceptAsServer(offers) {
      const opts = this._options;
      const accepted = offers.find((params) => {
        if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
          return false;
        }
        return true;
      });
      if (!accepted) {
        throw new Error("None of the extension offers can be accepted");
      }
      if (opts.serverNoContextTakeover) {
        accepted.server_no_context_takeover = true;
      }
      if (opts.clientNoContextTakeover) {
        accepted.client_no_context_takeover = true;
      }
      if (typeof opts.serverMaxWindowBits === "number") {
        accepted.server_max_window_bits = opts.serverMaxWindowBits;
      }
      if (typeof opts.clientMaxWindowBits === "number") {
        accepted.client_max_window_bits = opts.clientMaxWindowBits;
      } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
        delete accepted.client_max_window_bits;
      }
      return accepted;
    }
    acceptAsClient(response) {
      const params = response[0];
      if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
        throw new Error('Unexpected parameter "client_no_context_takeover"');
      }
      if (!params.client_max_window_bits) {
        if (typeof this._options.clientMaxWindowBits === "number") {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        }
      } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
        throw new Error('Unexpected or invalid parameter "client_max_window_bits"');
      }
      return params;
    }
    normalizeParams(configurations) {
      configurations.forEach((params) => {
        Object.keys(params).forEach((key) => {
          let value = params[key];
          if (value.length > 1) {
            throw new Error(`Parameter "${key}" must have only a single value`);
          }
          value = value[0];
          if (key === "client_max_window_bits") {
            if (value !== true) {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
              }
              value = num;
            } else if (!this._isServer) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
          } else if (key === "server_max_window_bits") {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
            value = num;
          } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
            if (value !== true) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
          } else {
            throw new Error(`Unknown parameter "${key}"`);
          }
          params[key] = value;
        });
      });
      return configurations;
    }
    decompress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._decompress(data, fin, (err, result2) => {
          done();
          callback(err, result2);
        });
      });
    }
    compress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._compress(data, fin, (err, result2) => {
          done();
          callback(err, result2);
        });
      });
    }
    _decompress(data, fin, callback) {
      const endpoint = this._isServer ? "client" : "server";
      if (!this._inflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._inflate = zlib.createInflateRaw({
          ...this._options.zlibInflateOptions,
          windowBits
        });
        this._inflate[kPerMessageDeflate] = this;
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];
        this._inflate.on("error", inflateOnError);
        this._inflate.on("data", inflateOnData);
      }
      this._inflate[kCallback] = callback;
      this._inflate.write(data);
      if (fin)
        this._inflate.write(TRAILER);
      this._inflate.flush(() => {
        const err = this._inflate[kError];
        if (err) {
          this._inflate.close();
          this._inflate = null;
          callback(err);
          return;
        }
        const data2 = bufferUtil.concat(this._inflate[kBuffers], this._inflate[kTotalLength]);
        if (this._inflate._readableState.endEmitted) {
          this._inflate.close();
          this._inflate = null;
        } else {
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._inflate.reset();
          }
        }
        callback(null, data2);
      });
    }
    _compress(data, fin, callback) {
      const endpoint = this._isServer ? "server" : "client";
      if (!this._deflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._deflate = zlib.createDeflateRaw({
          ...this._options.zlibDeflateOptions,
          windowBits
        });
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        this._deflate.on("data", deflateOnData);
      }
      this._deflate[kCallback] = callback;
      this._deflate.write(data);
      this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
        if (!this._deflate) {
          return;
        }
        let data2 = bufferUtil.concat(this._deflate[kBuffers], this._deflate[kTotalLength]);
        if (fin) {
          data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
        }
        this._deflate[kCallback] = null;
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._deflate.reset();
        }
        callback(null, data2);
      });
    }
  }
  module2.exports = PerMessageDeflate;
  function deflateOnData(chunk) {
    this[kBuffers].push(chunk);
    this[kTotalLength] += chunk.length;
  }
  function inflateOnData(chunk) {
    this[kTotalLength] += chunk.length;
    if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
      this[kBuffers].push(chunk);
      return;
    }
    this[kError] = new RangeError("Max payload size exceeded");
    this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
    this[kError][kStatusCode] = 1009;
    this.removeListener("data", inflateOnData);
    this.reset();
  }
  function inflateOnError(err) {
    this[kPerMessageDeflate]._inflate = null;
    if (this[kError]) {
      this[kCallback](this[kError]);
      return;
    }
    err[kStatusCode] = 1007;
    this[kCallback](err);
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS((exports2, module2) => {
  var { isUtf8 } = require("buffer");
  var { hasBlob } = require_constants();
  var tokenChars = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    1,
    0,
    1,
    0
  ];
  function isValidStatusCode(code) {
    return code >= 1000 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3000 && code <= 4999;
  }
  function _isValidUTF8(buf) {
    const len = buf.length;
    let i = 0;
    while (i < len) {
      if ((buf[i] & 128) === 0) {
        i++;
      } else if ((buf[i] & 224) === 192) {
        if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
          return false;
        }
        i += 2;
      } else if ((buf[i] & 240) === 224) {
        if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || buf[i] === 237 && (buf[i + 1] & 224) === 160) {
          return false;
        }
        i += 3;
      } else if ((buf[i] & 248) === 240) {
        if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
          return false;
        }
        i += 4;
      } else {
        return false;
      }
    }
    return true;
  }
  function isBlob(value) {
    return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
  }
  module2.exports = {
    isBlob,
    isValidStatusCode,
    isValidUTF8: _isValidUTF8,
    tokenChars
  };
  if (isUtf8) {
    module2.exports.isValidUTF8 = function(buf) {
      return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
    };
  } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
    try {
      const isValidUTF8 = (()=>{throw new Error("Cannot require module "+"utf-8-validate");})();
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
      };
    } catch (e) {}
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS((exports2, module2) => {
  var { Writable } = require("stream");
  var PerMessageDeflate = require_permessage_deflate();
  var {
    BINARY_TYPES,
    EMPTY_BUFFER,
    kStatusCode,
    kWebSocket
  } = require_constants();
  var { concat, toArrayBuffer, unmask } = require_buffer_util();
  var { isValidStatusCode, isValidUTF8 } = require_validation();
  var FastBuffer = Buffer[Symbol.species];
  var GET_INFO = 0;
  var GET_PAYLOAD_LENGTH_16 = 1;
  var GET_PAYLOAD_LENGTH_64 = 2;
  var GET_MASK = 3;
  var GET_DATA = 4;
  var INFLATING = 5;
  var DEFER_EVENT = 6;

  class Receiver extends Writable {
    constructor(options = {}) {
      super();
      this._allowSynchronousEvents = options.allowSynchronousEvents !== undefined ? options.allowSynchronousEvents : true;
      this._binaryType = options.binaryType || BINARY_TYPES[0];
      this._extensions = options.extensions || {};
      this._isServer = !!options.isServer;
      this._maxBufferedChunks = options.maxBufferedChunks | 0;
      this._maxFragments = options.maxFragments | 0;
      this._maxPayload = options.maxPayload | 0;
      this._skipUTF8Validation = !!options.skipUTF8Validation;
      this[kWebSocket] = undefined;
      this._bufferedBytes = 0;
      this._buffers = [];
      this._compressed = false;
      this._payloadLength = 0;
      this._mask = undefined;
      this._fragmented = 0;
      this._masked = false;
      this._fin = false;
      this._opcode = 0;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._numFragments = 0;
      this._fragments = [];
      this._errored = false;
      this._loop = false;
      this._state = GET_INFO;
    }
    _write(chunk, encoding, cb) {
      if (this._opcode === 8 && this._state == GET_INFO)
        return cb();
      if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
        cb(this.createError(RangeError, "Too many buffered chunks", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS"));
        return;
      }
      this._bufferedBytes += chunk.length;
      this._buffers.push(chunk);
      this.startLoop(cb);
    }
    consume(n) {
      this._bufferedBytes -= n;
      if (n === this._buffers[0].length)
        return this._buffers.shift();
      if (n < this._buffers[0].length) {
        const buf = this._buffers[0];
        this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
        return new FastBuffer(buf.buffer, buf.byteOffset, n);
      }
      const dst = Buffer.allocUnsafe(n);
      do {
        const buf = this._buffers[0];
        const offset = dst.length - n;
        if (n >= buf.length) {
          dst.set(this._buffers.shift(), offset);
        } else {
          dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
          this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
        }
        n -= buf.length;
      } while (n > 0);
      return dst;
    }
    startLoop(cb) {
      this._loop = true;
      do {
        switch (this._state) {
          case GET_INFO:
            this.getInfo(cb);
            break;
          case GET_PAYLOAD_LENGTH_16:
            this.getPayloadLength16(cb);
            break;
          case GET_PAYLOAD_LENGTH_64:
            this.getPayloadLength64(cb);
            break;
          case GET_MASK:
            this.getMask();
            break;
          case GET_DATA:
            this.getData(cb);
            break;
          case INFLATING:
          case DEFER_EVENT:
            this._loop = false;
            return;
        }
      } while (this._loop);
      if (!this._errored)
        cb();
    }
    getInfo(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      const buf = this.consume(2);
      if ((buf[0] & 48) !== 0) {
        const error = this.createError(RangeError, "RSV2 and RSV3 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_2_3");
        cb(error);
        return;
      }
      const compressed = (buf[0] & 64) === 64;
      if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
        const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
        cb(error);
        return;
      }
      this._fin = (buf[0] & 128) === 128;
      this._opcode = buf[0] & 15;
      this._payloadLength = buf[1] & 127;
      if (this._opcode === 0) {
        if (compressed) {
          const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
          cb(error);
          return;
        }
        if (!this._fragmented) {
          const error = this.createError(RangeError, "invalid opcode 0", true, 1002, "WS_ERR_INVALID_OPCODE");
          cb(error);
          return;
        }
        this._opcode = this._fragmented;
      } else if (this._opcode === 1 || this._opcode === 2) {
        if (this._fragmented) {
          const error = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
          cb(error);
          return;
        }
        this._compressed = compressed;
      } else if (this._opcode > 7 && this._opcode < 11) {
        if (!this._fin) {
          const error = this.createError(RangeError, "FIN must be set", true, 1002, "WS_ERR_EXPECTED_FIN");
          cb(error);
          return;
        }
        if (compressed) {
          const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
          cb(error);
          return;
        }
        if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
          const error = this.createError(RangeError, `invalid payload length ${this._payloadLength}`, true, 1002, "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");
          cb(error);
          return;
        }
      } else {
        const error = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
        cb(error);
        return;
      }
      if (!this._fin && !this._fragmented)
        this._fragmented = this._opcode;
      this._masked = (buf[1] & 128) === 128;
      if (this._isServer) {
        if (!this._masked) {
          const error = this.createError(RangeError, "MASK must be set", true, 1002, "WS_ERR_EXPECTED_MASK");
          cb(error);
          return;
        }
      } else if (this._masked) {
        const error = this.createError(RangeError, "MASK must be clear", true, 1002, "WS_ERR_UNEXPECTED_MASK");
        cb(error);
        return;
      }
      if (this._payloadLength === 126)
        this._state = GET_PAYLOAD_LENGTH_16;
      else if (this._payloadLength === 127)
        this._state = GET_PAYLOAD_LENGTH_64;
      else
        this.haveLength(cb);
    }
    getPayloadLength16(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      this._payloadLength = this.consume(2).readUInt16BE(0);
      this.haveLength(cb);
    }
    getPayloadLength64(cb) {
      if (this._bufferedBytes < 8) {
        this._loop = false;
        return;
      }
      const buf = this.consume(8);
      const num = buf.readUInt32BE(0);
      if (num > Math.pow(2, 53 - 32) - 1) {
        const error = this.createError(RangeError, "Unsupported WebSocket frame: payload length > 2^53 - 1", false, 1009, "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");
        cb(error);
        return;
      }
      this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
      this.haveLength(cb);
    }
    haveLength(cb) {
      if (this._payloadLength && this._opcode < 8) {
        this._totalPayloadLength += this._payloadLength;
        if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
          const error = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
          cb(error);
          return;
        }
      }
      if (this._masked)
        this._state = GET_MASK;
      else
        this._state = GET_DATA;
    }
    getMask() {
      if (this._bufferedBytes < 4) {
        this._loop = false;
        return;
      }
      this._mask = this.consume(4);
      this._state = GET_DATA;
    }
    getData(cb) {
      let data = EMPTY_BUFFER;
      if (this._payloadLength) {
        if (this._bufferedBytes < this._payloadLength) {
          this._loop = false;
          return;
        }
        data = this.consume(this._payloadLength);
        if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
          unmask(data, this._mask);
        }
      }
      if (this._opcode > 7) {
        this.controlMessage(data, cb);
        return;
      }
      if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
        const error = this.createError(RangeError, "Too many message fragments", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS");
        cb(error);
        return;
      }
      if (this._compressed) {
        this._state = INFLATING;
        this.decompress(data, cb);
        return;
      }
      if (data.length) {
        this._messageLength = this._totalPayloadLength;
        this._fragments.push(data);
      }
      this.dataMessage(cb);
    }
    decompress(data, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      perMessageDeflate.decompress(data, this._fin, (err, buf) => {
        if (err)
          return cb(err);
        if (buf.length) {
          this._messageLength += buf.length;
          if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
            cb(error);
            return;
          }
          this._fragments.push(buf);
        }
        this.dataMessage(cb);
        if (this._state === GET_INFO)
          this.startLoop(cb);
      });
    }
    dataMessage(cb) {
      if (!this._fin) {
        this._state = GET_INFO;
        return;
      }
      const messageLength = this._messageLength;
      const fragments = this._fragments;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._fragmented = 0;
      this._numFragments = 0;
      this._fragments = [];
      if (this._opcode === 2) {
        let data;
        if (this._binaryType === "nodebuffer") {
          data = concat(fragments, messageLength);
        } else if (this._binaryType === "arraybuffer") {
          data = toArrayBuffer(concat(fragments, messageLength));
        } else if (this._binaryType === "blob") {
          data = new Blob(fragments);
        } else {
          data = fragments;
        }
        if (this._allowSynchronousEvents) {
          this.emit("message", data, true);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", data, true);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      } else {
        const buf = concat(fragments, messageLength);
        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
          const error = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
          cb(error);
          return;
        }
        if (this._state === INFLATING || this._allowSynchronousEvents) {
          this.emit("message", buf, false);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", buf, false);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
    }
    controlMessage(data, cb) {
      if (this._opcode === 8) {
        if (data.length === 0) {
          this._loop = false;
          this.emit("conclude", 1005, EMPTY_BUFFER);
          this.end();
        } else {
          const code = data.readUInt16BE(0);
          if (!isValidStatusCode(code)) {
            const error = this.createError(RangeError, `invalid status code ${code}`, true, 1002, "WS_ERR_INVALID_CLOSE_CODE");
            cb(error);
            return;
          }
          const buf = new FastBuffer(data.buffer, data.byteOffset + 2, data.length - 2);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
            cb(error);
            return;
          }
          this._loop = false;
          this.emit("conclude", code, buf);
          this.end();
        }
        this._state = GET_INFO;
        return;
      }
      if (this._allowSynchronousEvents) {
        this.emit(this._opcode === 9 ? "ping" : "pong", data);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    }
    createError(ErrorCtor, message, prefix, statusCode, errorCode) {
      this._loop = false;
      this._errored = true;
      const err = new ErrorCtor(prefix ? `Invalid WebSocket frame: ${message}` : message);
      Error.captureStackTrace(err, this.createError);
      err.code = errorCode;
      err[kStatusCode] = statusCode;
      return err;
    }
  }
  module2.exports = Receiver;
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS((exports2, module2) => {
  var { Duplex } = require("stream");
  var { randomFillSync } = require("crypto");
  var {
    types: { isUint8Array }
  } = require("util");
  var PerMessageDeflate = require_permessage_deflate();
  var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
  var { isBlob, isValidStatusCode } = require_validation();
  var { mask: applyMask, toBuffer } = require_buffer_util();
  var kByteLength = Symbol("kByteLength");
  var maskBuffer = Buffer.alloc(4);
  var RANDOM_POOL_SIZE = 8 * 1024;
  var randomPool;
  var randomPoolPointer = RANDOM_POOL_SIZE;
  var DEFAULT = 0;
  var DEFLATING = 1;
  var GET_BLOB_DATA = 2;

  class Sender {
    constructor(socket, extensions, generateMask) {
      this._extensions = extensions || {};
      if (generateMask) {
        this._generateMask = generateMask;
        this._maskBuffer = Buffer.alloc(4);
      }
      this._socket = socket;
      this._firstFragment = true;
      this._compress = false;
      this._bufferedBytes = 0;
      this._queue = [];
      this._state = DEFAULT;
      this.onerror = NOOP;
      this[kWebSocket] = undefined;
    }
    static frame(data, options) {
      let mask;
      let merge = false;
      let offset = 2;
      let skipMasking = false;
      if (options.mask) {
        mask = options.maskBuffer || maskBuffer;
        if (options.generateMask) {
          options.generateMask(mask);
        } else {
          if (randomPoolPointer === RANDOM_POOL_SIZE) {
            if (randomPool === undefined) {
              randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
            }
            randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
            randomPoolPointer = 0;
          }
          mask[0] = randomPool[randomPoolPointer++];
          mask[1] = randomPool[randomPoolPointer++];
          mask[2] = randomPool[randomPoolPointer++];
          mask[3] = randomPool[randomPoolPointer++];
        }
        skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
        offset = 6;
      }
      let dataLength;
      if (typeof data === "string") {
        if ((!options.mask || skipMasking) && options[kByteLength] !== undefined) {
          dataLength = options[kByteLength];
        } else {
          data = Buffer.from(data);
          dataLength = data.length;
        }
      } else {
        dataLength = data.length;
        merge = options.mask && options.readOnly && !skipMasking;
      }
      let payloadLength = dataLength;
      if (dataLength >= 65536) {
        offset += 8;
        payloadLength = 127;
      } else if (dataLength > 125) {
        offset += 2;
        payloadLength = 126;
      }
      const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
      target[0] = options.fin ? options.opcode | 128 : options.opcode;
      if (options.rsv1)
        target[0] |= 64;
      target[1] = payloadLength;
      if (payloadLength === 126) {
        target.writeUInt16BE(dataLength, 2);
      } else if (payloadLength === 127) {
        target[2] = target[3] = 0;
        target.writeUIntBE(dataLength, 4, 6);
      }
      if (!options.mask) {
        return dataLength ? [target, data] : [target];
      }
      target[1] |= 128;
      target[offset - 4] = mask[0];
      target[offset - 3] = mask[1];
      target[offset - 2] = mask[2];
      target[offset - 1] = mask[3];
      if (!dataLength)
        return [target];
      if (skipMasking)
        return [target, data];
      if (merge) {
        applyMask(data, mask, target, offset, dataLength);
        return [target];
      }
      applyMask(data, mask, data, 0, dataLength);
      return [target, data];
    }
    close(code, data, mask, cb) {
      let buf;
      if (code === undefined) {
        buf = EMPTY_BUFFER;
      } else if (typeof code !== "number" || !isValidStatusCode(code)) {
        throw new TypeError("First argument must be a valid error code number");
      } else if (data === undefined || !data.length) {
        buf = Buffer.allocUnsafe(2);
        buf.writeUInt16BE(code, 0);
      } else {
        const length = Buffer.byteLength(data);
        if (length > 123) {
          throw new RangeError("The message must not be greater than 123 bytes");
        }
        buf = Buffer.allocUnsafe(2 + length);
        buf.writeUInt16BE(code, 0);
        if (typeof data === "string") {
          buf.write(data, 2);
        } else if (isUint8Array(data)) {
          buf.set(data, 2);
        } else {
          throw new TypeError("Second argument must be a string or a Uint8Array");
        }
      }
      const options = {
        [kByteLength]: buf.length,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 8,
        readOnly: false,
        rsv1: false
      };
      if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, buf, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(buf, options), cb);
      }
    }
    ping(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 9,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    pong(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 10,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    send(data, options, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      let opcode = options.binary ? 2 : 1;
      let rsv1 = options.compress;
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (this._firstFragment) {
        this._firstFragment = false;
        if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
          rsv1 = byteLength >= perMessageDeflate._threshold;
        }
        this._compress = rsv1;
      } else {
        rsv1 = false;
        opcode = 0;
      }
      if (options.fin)
        this._firstFragment = true;
      const opts = {
        [kByteLength]: byteLength,
        fin: options.fin,
        generateMask: this._generateMask,
        mask: options.mask,
        maskBuffer: this._maskBuffer,
        opcode,
        readOnly,
        rsv1
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
        } else {
          this.getBlobData(data, this._compress, opts, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, this._compress, opts, cb]);
      } else {
        this.dispatch(data, this._compress, opts, cb);
      }
    }
    getBlobData(blob, compress, options, cb) {
      this._bufferedBytes += options[kByteLength];
      this._state = GET_BLOB_DATA;
      blob.arrayBuffer().then((arrayBuffer) => {
        if (this._socket.destroyed) {
          const err = new Error("The socket was closed while the blob was being read");
          process.nextTick(callCallbacks, this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        const data = toBuffer(arrayBuffer);
        if (!compress) {
          this._state = DEFAULT;
          this.sendFrame(Sender.frame(data, options), cb);
          this.dequeue();
        } else {
          this.dispatch(data, compress, options, cb);
        }
      }).catch((err) => {
        process.nextTick(onError, this, err, cb);
      });
    }
    dispatch(data, compress, options, cb) {
      if (!compress) {
        this.sendFrame(Sender.frame(data, options), cb);
        return;
      }
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      this._bufferedBytes += options[kByteLength];
      this._state = DEFLATING;
      perMessageDeflate.compress(data, options.fin, (_, buf) => {
        if (this._socket.destroyed) {
          const err = new Error("The socket was closed while data was being compressed");
          callCallbacks(this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        this._state = DEFAULT;
        options.readOnly = false;
        this.sendFrame(Sender.frame(buf, options), cb);
        this.dequeue();
      });
    }
    dequeue() {
      while (this._state === DEFAULT && this._queue.length) {
        const params = this._queue.shift();
        this._bufferedBytes -= params[3][kByteLength];
        Reflect.apply(params[0], this, params.slice(1));
      }
    }
    enqueue(params) {
      this._bufferedBytes += params[3][kByteLength];
      this._queue.push(params);
    }
    sendFrame(list, cb) {
      if (list.length === 2) {
        this._socket.cork();
        this._socket.write(list[0]);
        this._socket.write(list[1], cb);
        this._socket.uncork();
      } else {
        this._socket.write(list[0], cb);
      }
    }
  }
  module2.exports = Sender;
  function callCallbacks(sender, err, cb) {
    if (typeof cb === "function")
      cb(err);
    for (let i = 0;i < sender._queue.length; i++) {
      const params = sender._queue[i];
      const callback = params[params.length - 1];
      if (typeof callback === "function")
        callback(err);
    }
  }
  function onError(sender, err, cb) {
    callCallbacks(sender, err, cb);
    sender.onerror(err);
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS((exports2, module2) => {
  var { kForOnEventAttribute, kListener } = require_constants();
  var kCode = Symbol("kCode");
  var kData = Symbol("kData");
  var kError = Symbol("kError");
  var kMessage = Symbol("kMessage");
  var kReason = Symbol("kReason");
  var kTarget = Symbol("kTarget");
  var kType = Symbol("kType");
  var kWasClean = Symbol("kWasClean");

  class Event {
    constructor(type) {
      this[kTarget] = null;
      this[kType] = type;
    }
    get target() {
      return this[kTarget];
    }
    get type() {
      return this[kType];
    }
  }
  Object.defineProperty(Event.prototype, "target", { enumerable: true });
  Object.defineProperty(Event.prototype, "type", { enumerable: true });

  class CloseEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kCode] = options.code === undefined ? 0 : options.code;
      this[kReason] = options.reason === undefined ? "" : options.reason;
      this[kWasClean] = options.wasClean === undefined ? false : options.wasClean;
    }
    get code() {
      return this[kCode];
    }
    get reason() {
      return this[kReason];
    }
    get wasClean() {
      return this[kWasClean];
    }
  }
  Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });

  class ErrorEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kError] = options.error === undefined ? null : options.error;
      this[kMessage] = options.message === undefined ? "" : options.message;
    }
    get error() {
      return this[kError];
    }
    get message() {
      return this[kMessage];
    }
  }
  Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
  Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });

  class MessageEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kData] = options.data === undefined ? null : options.data;
    }
    get data() {
      return this[kData];
    }
  }
  Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
  var EventTarget = {
    addEventListener(type, handler, options = {}) {
      for (const listener of this.listeners(type)) {
        if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          return;
        }
      }
      let wrapper;
      if (type === "message") {
        wrapper = function onMessage(data, isBinary) {
          const event = new MessageEvent("message", {
            data: isBinary ? data : data.toString()
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "close") {
        wrapper = function onClose(code, message) {
          const event = new CloseEvent("close", {
            code,
            reason: message.toString(),
            wasClean: this._closeFrameReceived && this._closeFrameSent
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "error") {
        wrapper = function onError(error) {
          const event = new ErrorEvent("error", {
            error,
            message: error.message
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "open") {
        wrapper = function onOpen() {
          const event = new Event("open");
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else {
        return;
      }
      wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
      wrapper[kListener] = handler;
      if (options.once) {
        this.once(type, wrapper);
      } else {
        this.on(type, wrapper);
      }
    },
    removeEventListener(type, handler) {
      for (const listener of this.listeners(type)) {
        if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          this.removeListener(type, listener);
          break;
        }
      }
    }
  };
  module2.exports = {
    CloseEvent,
    ErrorEvent,
    Event,
    EventTarget,
    MessageEvent
  };
  function callListener(listener, thisArg, event) {
    if (typeof listener === "object" && listener.handleEvent) {
      listener.handleEvent.call(listener, event);
    } else {
      listener.call(thisArg, event);
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS((exports2, module2) => {
  var { tokenChars } = require_validation();
  function push(dest, name, elem) {
    if (dest[name] === undefined)
      dest[name] = [elem];
    else
      dest[name].push(elem);
  }
  function parse(header) {
    const offers = Object.create(null);
    let params = Object.create(null);
    let mustUnescape = false;
    let isEscaping = false;
    let inQuotes = false;
    let extensionName;
    let paramName;
    let start = -1;
    let code = -1;
    let end = -1;
    let i = 0;
    for (;i < header.length; i++) {
      code = header.charCodeAt(i);
      if (extensionName === undefined) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          const name = header.slice(start, end);
          if (code === 44) {
            push(offers, name, params);
            params = Object.create(null);
          } else {
            extensionName = name;
          }
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (paramName === undefined) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (code === 32 || code === 9) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          push(params, header.slice(start, end), true);
          if (code === 44) {
            push(offers, extensionName, params);
            params = Object.create(null);
            extensionName = undefined;
          }
          start = end = -1;
        } else if (code === 61 && start !== -1 && end === -1) {
          paramName = header.slice(start, i);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else {
        if (isEscaping) {
          if (tokenChars[code] !== 1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (start === -1)
            start = i;
          else if (!mustUnescape)
            mustUnescape = true;
          isEscaping = false;
        } else if (inQuotes) {
          if (tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (code === 34 && start !== -1) {
            inQuotes = false;
            end = i;
          } else if (code === 92) {
            isEscaping = true;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
          inQuotes = true;
        } else if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (start !== -1 && (code === 32 || code === 9)) {
          if (end === -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          let value = header.slice(start, end);
          if (mustUnescape) {
            value = value.replace(/\\/g, "");
            mustUnescape = false;
          }
          push(params, paramName, value);
          if (code === 44) {
            push(offers, extensionName, params);
            params = Object.create(null);
            extensionName = undefined;
          }
          paramName = undefined;
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
    }
    if (start === -1 || inQuotes || code === 32 || code === 9) {
      throw new SyntaxError("Unexpected end of input");
    }
    if (end === -1)
      end = i;
    const token = header.slice(start, end);
    if (extensionName === undefined) {
      push(offers, token, params);
    } else {
      if (paramName === undefined) {
        push(params, token, true);
      } else if (mustUnescape) {
        push(params, paramName, token.replace(/\\/g, ""));
      } else {
        push(params, paramName, token);
      }
      push(offers, extensionName, params);
    }
    return offers;
  }
  function format(extensions) {
    return Object.keys(extensions).map((extension) => {
      let configurations = extensions[extension];
      if (!Array.isArray(configurations))
        configurations = [configurations];
      return configurations.map((params) => {
        return [extension].concat(Object.keys(params).map((k) => {
          let values = params[k];
          if (!Array.isArray(values))
            values = [values];
          return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
        })).join("; ");
      }).join(", ");
    }).join(", ");
  }
  module2.exports = { format, parse };
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS((exports2, module2) => {
  var EventEmitter2 = require("events");
  var https = require("https");
  var http = require("http");
  var net = require("net");
  var tls = require("tls");
  var { randomBytes: randomBytes3, createHash: createHash3 } = require("crypto");
  var { Duplex, Readable } = require("stream");
  var { URL: URL2 } = require("url");
  var PerMessageDeflate = require_permessage_deflate();
  var Receiver = require_receiver();
  var Sender = require_sender();
  var { isBlob } = require_validation();
  var {
    BINARY_TYPES,
    CLOSE_TIMEOUT,
    EMPTY_BUFFER,
    GUID,
    kForOnEventAttribute,
    kListener,
    kStatusCode,
    kWebSocket,
    NOOP
  } = require_constants();
  var {
    EventTarget: { addEventListener, removeEventListener }
  } = require_event_target();
  var { format, parse } = require_extension();
  var { toBuffer } = require_buffer_util();
  var kAborted = Symbol("kAborted");
  var protocolVersions = [8, 13];
  var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
  var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;

  class WebSocket extends EventEmitter2 {
    constructor(address, protocols, options) {
      super();
      this._binaryType = BINARY_TYPES[0];
      this._closeCode = 1006;
      this._closeFrameReceived = false;
      this._closeFrameSent = false;
      this._closeMessage = EMPTY_BUFFER;
      this._closeTimer = null;
      this._errorEmitted = false;
      this._extensions = {};
      this._paused = false;
      this._protocol = "";
      this._readyState = WebSocket.CONNECTING;
      this._receiver = null;
      this._sender = null;
      this._socket = null;
      if (address !== null) {
        this._bufferedAmount = 0;
        this._isServer = false;
        this._redirects = 0;
        if (protocols === undefined) {
          if (!options || options.protocols === undefined) {
            protocols = [];
          } else if (Array.isArray(options.protocols)) {
            protocols = options.protocols;
          } else {
            protocols = [options.protocols];
          }
        } else if (!Array.isArray(protocols)) {
          if (typeof protocols === "object" && protocols !== null) {
            options = protocols;
            if (options.protocols === undefined) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else {
            protocols = [protocols];
          }
        }
        initAsClient(this, address, protocols, options);
      } else {
        this._autoPong = options.autoPong;
        this._closeTimeout = options.closeTimeout;
        this._isServer = true;
      }
    }
    get binaryType() {
      return this._binaryType;
    }
    set binaryType(type) {
      if (!BINARY_TYPES.includes(type))
        return;
      this._binaryType = type;
      if (this._receiver)
        this._receiver._binaryType = type;
    }
    get bufferedAmount() {
      if (!this._socket)
        return this._bufferedAmount;
      return this._socket._writableState.length + this._sender._bufferedBytes;
    }
    get extensions() {
      return Object.keys(this._extensions).join();
    }
    get isPaused() {
      return this._paused;
    }
    get onclose() {
      return null;
    }
    get onerror() {
      return null;
    }
    get onopen() {
      return null;
    }
    get onmessage() {
      return null;
    }
    get protocol() {
      return this._protocol;
    }
    get readyState() {
      return this._readyState;
    }
    get url() {
      return this._url;
    }
    setSocket(socket, head, options) {
      const receiver = new Receiver({
        allowSynchronousEvents: options.allowSynchronousEvents,
        binaryType: this.binaryType,
        extensions: this._extensions,
        isServer: this._isServer,
        maxBufferedChunks: options.maxBufferedChunks,
        maxFragments: options.maxFragments,
        maxPayload: options.maxPayload,
        skipUTF8Validation: options.skipUTF8Validation
      });
      const sender = new Sender(socket, this._extensions, options.generateMask);
      this._receiver = receiver;
      this._sender = sender;
      this._socket = socket;
      receiver[kWebSocket] = this;
      sender[kWebSocket] = this;
      socket[kWebSocket] = this;
      receiver.on("conclude", receiverOnConclude);
      receiver.on("drain", receiverOnDrain);
      receiver.on("error", receiverOnError);
      receiver.on("message", receiverOnMessage);
      receiver.on("ping", receiverOnPing);
      receiver.on("pong", receiverOnPong);
      sender.onerror = senderOnError;
      if (socket.setTimeout)
        socket.setTimeout(0);
      if (socket.setNoDelay)
        socket.setNoDelay();
      if (head.length > 0)
        socket.unshift(head);
      socket.on("close", socketOnClose);
      socket.on("data", socketOnData);
      socket.on("end", socketOnEnd);
      socket.on("error", socketOnError);
      this._readyState = WebSocket.OPEN;
      this.emit("open");
    }
    emitClose() {
      if (!this._socket) {
        this._readyState = WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
        return;
      }
      if (this._extensions[PerMessageDeflate.extensionName]) {
        this._extensions[PerMessageDeflate.extensionName].cleanup();
      }
      this._receiver.removeAllListeners();
      this._readyState = WebSocket.CLOSED;
      this.emit("close", this._closeCode, this._closeMessage);
    }
    close(code, data) {
      if (this.readyState === WebSocket.CLOSED)
        return;
      if (this.readyState === WebSocket.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this.readyState === WebSocket.CLOSING) {
        if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
          this._socket.end();
        }
        return;
      }
      this._sender.close(code, data, !this._isServer, (err) => {
        if (err)
          return;
        this._closeFrameSent = true;
        if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
          this._socket.end();
        }
      });
      this._readyState = WebSocket.CLOSING;
      setCloseTimer(this);
    }
    pause() {
      if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
        return;
      }
      this._paused = true;
      this._socket.pause();
    }
    ping(data, mask, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = undefined;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = undefined;
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === undefined)
        mask = !this._isServer;
      this._sender.ping(data || EMPTY_BUFFER, mask, cb);
    }
    pong(data, mask, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = undefined;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = undefined;
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === undefined)
        mask = !this._isServer;
      this._sender.pong(data || EMPTY_BUFFER, mask, cb);
    }
    resume() {
      if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
        return;
      }
      this._paused = false;
      if (!this._receiver._writableState.needDrain)
        this._socket.resume();
    }
    send(data, options, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      const opts = {
        binary: typeof data !== "string",
        mask: !this._isServer,
        compress: true,
        fin: true,
        ...options
      };
      if (!this._extensions[PerMessageDeflate.extensionName]) {
        opts.compress = false;
      }
      this._sender.send(data || EMPTY_BUFFER, opts, cb);
    }
    terminate() {
      if (this.readyState === WebSocket.CLOSED)
        return;
      if (this.readyState === WebSocket.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this._socket) {
        this._readyState = WebSocket.CLOSING;
        this._socket.destroy();
      }
    }
  }
  Object.defineProperty(WebSocket, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket.prototype, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket.prototype, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket.prototype, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  Object.defineProperty(WebSocket.prototype, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  [
    "binaryType",
    "bufferedAmount",
    "extensions",
    "isPaused",
    "protocol",
    "readyState",
    "url"
  ].forEach((property) => {
    Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
  });
  ["open", "error", "close", "message"].forEach((method) => {
    Object.defineProperty(WebSocket.prototype, `on${method}`, {
      enumerable: true,
      get() {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute])
            return listener[kListener];
        }
        return null;
      },
      set(handler) {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute]) {
            this.removeListener(method, listener);
            break;
          }
        }
        if (typeof handler !== "function")
          return;
        this.addEventListener(method, handler, {
          [kForOnEventAttribute]: true
        });
      }
    });
  });
  WebSocket.prototype.addEventListener = addEventListener;
  WebSocket.prototype.removeEventListener = removeEventListener;
  module2.exports = WebSocket;
  function initAsClient(websocket, address, protocols, options) {
    const opts = {
      allowSynchronousEvents: true,
      autoPong: true,
      closeTimeout: CLOSE_TIMEOUT,
      protocolVersion: protocolVersions[1],
      maxBufferedChunks: 256 * 1024,
      maxFragments: 16 * 1024,
      maxPayload: 100 * 1024 * 1024,
      skipUTF8Validation: false,
      perMessageDeflate: true,
      followRedirects: false,
      maxRedirects: 10,
      ...options,
      socketPath: undefined,
      hostname: undefined,
      protocol: undefined,
      protocols: undefined,
      timeout: undefined,
      method: "GET",
      host: undefined,
      path: undefined,
      port: undefined
    };
    websocket._autoPong = opts.autoPong;
    websocket._closeTimeout = opts.closeTimeout;
    if (!protocolVersions.includes(opts.protocolVersion)) {
      throw new RangeError(`Unsupported protocol version: ${opts.protocolVersion} ` + `(supported versions: ${protocolVersions.join(", ")})`);
    }
    let parsedUrl;
    if (address instanceof URL2) {
      parsedUrl = address;
    } else {
      try {
        parsedUrl = new URL2(address);
      } catch {
        throw new SyntaxError(`Invalid URL: ${address}`);
      }
    }
    if (parsedUrl.protocol === "http:") {
      parsedUrl.protocol = "ws:";
    } else if (parsedUrl.protocol === "https:") {
      parsedUrl.protocol = "wss:";
    }
    websocket._url = parsedUrl.href;
    const isSecure = parsedUrl.protocol === "wss:";
    const isIpcUrl = parsedUrl.protocol === "ws+unix:";
    let invalidUrlMessage;
    if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
      invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", ` + '"http:", "https:", or "ws+unix:"';
    } else if (isIpcUrl && !parsedUrl.pathname) {
      invalidUrlMessage = "The URL's pathname is empty";
    } else if (parsedUrl.hash) {
      invalidUrlMessage = "The URL contains a fragment identifier";
    }
    if (invalidUrlMessage) {
      const err = new SyntaxError(invalidUrlMessage);
      if (websocket._redirects === 0) {
        throw err;
      } else {
        emitErrorAndClose(websocket, err);
        return;
      }
    }
    const defaultPort = isSecure ? 443 : 80;
    const key = randomBytes3(16).toString("base64");
    const request = isSecure ? https.request : http.request;
    const protocolSet = new Set;
    let perMessageDeflate;
    opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
    opts.defaultPort = opts.defaultPort || defaultPort;
    opts.port = parsedUrl.port || defaultPort;
    opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
    opts.headers = {
      ...opts.headers,
      "Sec-WebSocket-Version": opts.protocolVersion,
      "Sec-WebSocket-Key": key,
      Connection: "Upgrade",
      Upgrade: "websocket"
    };
    opts.path = parsedUrl.pathname + parsedUrl.search;
    opts.timeout = opts.handshakeTimeout;
    if (opts.perMessageDeflate) {
      perMessageDeflate = new PerMessageDeflate({
        ...opts.perMessageDeflate,
        isServer: false,
        maxPayload: opts.maxPayload
      });
      opts.headers["Sec-WebSocket-Extensions"] = format({
        [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
      });
    }
    if (protocols.length) {
      for (const protocol of protocols) {
        if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
          throw new SyntaxError("An invalid or duplicated subprotocol was specified");
        }
        protocolSet.add(protocol);
      }
      opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
    }
    if (opts.origin) {
      if (opts.protocolVersion < 13) {
        opts.headers["Sec-WebSocket-Origin"] = opts.origin;
      } else {
        opts.headers.Origin = opts.origin;
      }
    }
    if (parsedUrl.username || parsedUrl.password) {
      opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
    }
    if (isIpcUrl) {
      const i = opts.path.indexOf(":");
      if (i === -1) {
        opts.socketPath = opts.path;
        opts.path = "";
      } else {
        opts.socketPath = opts.path.slice(0, i);
        opts.path = opts.path.slice(i + 1);
      }
    }
    let req;
    if (opts.followRedirects) {
      if (websocket._redirects === 0) {
        websocket._originalIpc = isIpcUrl;
        websocket._originalSecure = isSecure;
        websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
        const headers = options && options.headers;
        options = { ...options, headers: {} };
        if (headers) {
          for (const [key2, value] of Object.entries(headers)) {
            options.headers[key2.toLowerCase()] = value;
          }
        }
      } else if (websocket.listenerCount("redirect") === 0) {
        const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
        if (!isSameHost || websocket._originalSecure && !isSecure) {
          delete opts.headers.authorization;
          delete opts.headers.cookie;
          if (!isSameHost)
            delete opts.headers.host;
          opts.auth = undefined;
        }
      }
      if (opts.auth && !options.headers.authorization) {
        options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
      }
      req = websocket._req = request(opts);
      if (websocket._redirects) {
        websocket.emit("redirect", websocket.url, req);
      }
    } else {
      req = websocket._req = request(opts);
    }
    if (opts.timeout) {
      req.on("timeout", () => {
        abortHandshake(websocket, req, "Opening handshake has timed out");
      });
    }
    req.on("error", (err) => {
      if (req === null || req[kAborted])
        return;
      req = websocket._req = null;
      emitErrorAndClose(websocket, err);
    });
    req.on("response", (res) => {
      const location = res.headers.location;
      const statusCode = res.statusCode;
      if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
        if (++websocket._redirects > opts.maxRedirects) {
          abortHandshake(websocket, req, "Maximum redirects exceeded");
          return;
        }
        req.abort();
        let addr;
        try {
          addr = new URL2(location, address);
        } catch (e) {
          const err = new SyntaxError(`Invalid URL: ${location}`);
          emitErrorAndClose(websocket, err);
          return;
        }
        initAsClient(websocket, addr, protocols, options);
      } else if (!websocket.emit("unexpected-response", req, res)) {
        abortHandshake(websocket, req, `Unexpected server response: ${res.statusCode}`);
      }
    });
    req.on("upgrade", (res, socket, head) => {
      websocket.emit("upgrade", res);
      if (websocket.readyState !== WebSocket.CONNECTING)
        return;
      req = websocket._req = null;
      const upgrade = res.headers.upgrade;
      if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
        abortHandshake(websocket, socket, "Invalid Upgrade header");
        return;
      }
      const digest2 = createHash3("sha1").update(key + GUID).digest("base64");
      if (res.headers["sec-websocket-accept"] !== digest2) {
        abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
        return;
      }
      const serverProt = res.headers["sec-websocket-protocol"];
      let protError;
      if (serverProt !== undefined) {
        if (!protocolSet.size) {
          protError = "Server sent a subprotocol but none was requested";
        } else if (!protocolSet.has(serverProt)) {
          protError = "Server sent an invalid subprotocol";
        }
      } else if (protocolSet.size) {
        protError = "Server sent no subprotocol";
      }
      if (protError) {
        abortHandshake(websocket, socket, protError);
        return;
      }
      if (serverProt)
        websocket._protocol = serverProt;
      const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
      if (secWebSocketExtensions !== undefined) {
        if (!perMessageDeflate) {
          const message = "Server sent a Sec-WebSocket-Extensions header but no extension " + "was requested";
          abortHandshake(websocket, socket, message);
          return;
        }
        let extensions;
        try {
          extensions = parse(secWebSocketExtensions);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket, socket, message);
          return;
        }
        const extensionNames = Object.keys(extensions);
        if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
          const message = "Server indicated an extension that was not requested";
          abortHandshake(websocket, socket, message);
          return;
        }
        try {
          perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket, socket, message);
          return;
        }
        websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
      }
      websocket.setSocket(socket, head, {
        allowSynchronousEvents: opts.allowSynchronousEvents,
        generateMask: opts.generateMask,
        maxBufferedChunks: opts.maxBufferedChunks,
        maxFragments: opts.maxFragments,
        maxPayload: opts.maxPayload,
        skipUTF8Validation: opts.skipUTF8Validation
      });
    });
    if (opts.finishRequest) {
      opts.finishRequest(req, websocket);
    } else {
      req.end();
    }
  }
  function emitErrorAndClose(websocket, err) {
    websocket._readyState = WebSocket.CLOSING;
    websocket._errorEmitted = true;
    websocket.emit("error", err);
    websocket.emitClose();
  }
  function netConnect(options) {
    options.path = options.socketPath;
    return net.connect(options);
  }
  function tlsConnect(options) {
    options.path = undefined;
    if (!options.servername && options.servername !== "") {
      options.servername = net.isIP(options.host) ? "" : options.host;
    }
    return tls.connect(options);
  }
  function abortHandshake(websocket, stream, message) {
    websocket._readyState = WebSocket.CLOSING;
    const err = new Error(message);
    Error.captureStackTrace(err, abortHandshake);
    if (stream.setHeader) {
      stream[kAborted] = true;
      stream.abort();
      if (stream.socket && !stream.socket.destroyed) {
        stream.socket.destroy();
      }
      process.nextTick(emitErrorAndClose, websocket, err);
    } else {
      stream.destroy(err);
      stream.once("error", websocket.emit.bind(websocket, "error"));
      stream.once("close", websocket.emitClose.bind(websocket));
    }
  }
  function sendAfterClose(websocket, data, cb) {
    if (data) {
      const length = isBlob(data) ? data.size : toBuffer(data).length;
      if (websocket._socket)
        websocket._sender._bufferedBytes += length;
      else
        websocket._bufferedAmount += length;
    }
    if (cb) {
      const err = new Error(`WebSocket is not open: readyState ${websocket.readyState} ` + `(${readyStates[websocket.readyState]})`);
      process.nextTick(cb, err);
    }
  }
  function receiverOnConclude(code, reason) {
    const websocket = this[kWebSocket];
    websocket._closeFrameReceived = true;
    websocket._closeMessage = reason;
    websocket._closeCode = code;
    if (websocket._socket[kWebSocket] === undefined)
      return;
    websocket._socket.removeListener("data", socketOnData);
    process.nextTick(resume, websocket._socket);
    if (code === 1005)
      websocket.close();
    else
      websocket.close(code, reason);
  }
  function receiverOnDrain() {
    const websocket = this[kWebSocket];
    if (!websocket.isPaused)
      websocket._socket.resume();
  }
  function receiverOnError(err) {
    const websocket = this[kWebSocket];
    if (websocket._socket[kWebSocket] !== undefined) {
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      websocket.close(err[kStatusCode]);
    }
    if (!websocket._errorEmitted) {
      websocket._errorEmitted = true;
      websocket.emit("error", err);
    }
  }
  function receiverOnFinish() {
    this[kWebSocket].emitClose();
  }
  function receiverOnMessage(data, isBinary) {
    this[kWebSocket].emit("message", data, isBinary);
  }
  function receiverOnPing(data) {
    const websocket = this[kWebSocket];
    if (websocket._autoPong)
      websocket.pong(data, !this._isServer, NOOP);
    websocket.emit("ping", data);
  }
  function receiverOnPong(data) {
    this[kWebSocket].emit("pong", data);
  }
  function resume(stream) {
    stream.resume();
  }
  function senderOnError(err) {
    const websocket = this[kWebSocket];
    if (websocket.readyState === WebSocket.CLOSED)
      return;
    if (websocket.readyState === WebSocket.OPEN) {
      websocket._readyState = WebSocket.CLOSING;
      setCloseTimer(websocket);
    }
    this._socket.end();
    if (!websocket._errorEmitted) {
      websocket._errorEmitted = true;
      websocket.emit("error", err);
    }
  }
  function setCloseTimer(websocket) {
    websocket._closeTimer = setTimeout(websocket._socket.destroy.bind(websocket._socket), websocket._closeTimeout);
  }
  function socketOnClose() {
    const websocket = this[kWebSocket];
    this.removeListener("close", socketOnClose);
    this.removeListener("data", socketOnData);
    this.removeListener("end", socketOnEnd);
    websocket._readyState = WebSocket.CLOSING;
    if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
      const chunk = this.read(this._readableState.length);
      websocket._receiver.write(chunk);
    }
    websocket._receiver.end();
    this[kWebSocket] = undefined;
    clearTimeout(websocket._closeTimer);
    if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
      websocket.emitClose();
    } else {
      websocket._receiver.on("error", receiverOnFinish);
      websocket._receiver.on("finish", receiverOnFinish);
    }
  }
  function socketOnData(chunk) {
    if (!this[kWebSocket]._receiver.write(chunk)) {
      this.pause();
    }
  }
  function socketOnEnd() {
    const websocket = this[kWebSocket];
    websocket._readyState = WebSocket.CLOSING;
    websocket._receiver.end();
    this.end();
  }
  function socketOnError() {
    const websocket = this[kWebSocket];
    this.removeListener("error", socketOnError);
    this.on("error", NOOP);
    if (websocket) {
      websocket._readyState = WebSocket.CLOSING;
      this.destroy();
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS((exports2, module2) => {
  var WebSocket = require_websocket();
  var { Duplex } = require("stream");
  function emitClose(stream) {
    stream.emit("close");
  }
  function duplexOnEnd() {
    if (!this.destroyed && this._writableState.finished) {
      this.destroy();
    }
  }
  function duplexOnError(err) {
    this.removeListener("error", duplexOnError);
    this.destroy();
    if (this.listenerCount("error") === 0) {
      this.emit("error", err);
    }
  }
  function createWebSocketStream(ws, options) {
    let terminateOnDestroy = true;
    const duplex = new Duplex({
      ...options,
      autoDestroy: false,
      emitClose: false,
      objectMode: false,
      writableObjectMode: false
    });
    ws.on("message", function message(msg, isBinary) {
      const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
      if (!duplex.push(data))
        ws.pause();
    });
    ws.once("error", function error(err) {
      if (duplex.destroyed)
        return;
      terminateOnDestroy = false;
      duplex.destroy(err);
    });
    ws.once("close", function close() {
      if (duplex.destroyed)
        return;
      duplex.push(null);
    });
    duplex._destroy = function(err, callback) {
      if (ws.readyState === ws.CLOSED) {
        callback(err);
        process.nextTick(emitClose, duplex);
        return;
      }
      let called = false;
      ws.once("error", function error(err2) {
        called = true;
        callback(err2);
      });
      ws.once("close", function close() {
        if (!called)
          callback(err);
        process.nextTick(emitClose, duplex);
      });
      if (terminateOnDestroy)
        ws.terminate();
    };
    duplex._final = function(callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._final(callback);
        });
        return;
      }
      if (ws._socket === null)
        return;
      if (ws._socket._writableState.finished) {
        callback();
        if (duplex._readableState.endEmitted)
          duplex.destroy();
      } else {
        ws._socket.once("finish", function finish() {
          callback();
        });
        ws.close();
      }
    };
    duplex._read = function() {
      if (ws.isPaused)
        ws.resume();
    };
    duplex._write = function(chunk, encoding, callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._write(chunk, encoding, callback);
        });
        return;
      }
      ws.send(chunk, callback);
    };
    duplex.on("end", duplexOnEnd);
    duplex.on("error", duplexOnError);
    return duplex;
  }
  module2.exports = createWebSocketStream;
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS((exports2, module2) => {
  var { tokenChars } = require_validation();
  function parse(header) {
    const protocols = new Set;
    let start = -1;
    let end = -1;
    let i = 0;
    for (i;i < header.length; i++) {
      const code = header.charCodeAt(i);
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1)
          start = i;
      } else if (i !== 0 && (code === 32 || code === 9)) {
        if (end === -1 && start !== -1)
          end = i;
      } else if (code === 44) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (end === -1)
          end = i;
        const protocol2 = header.slice(start, end);
        if (protocols.has(protocol2)) {
          throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
        }
        protocols.add(protocol2);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
    if (start === -1 || end !== -1) {
      throw new SyntaxError("Unexpected end of input");
    }
    const protocol = header.slice(start, i);
    if (protocols.has(protocol)) {
      throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
    }
    protocols.add(protocol);
    return protocols;
  }
  module2.exports = { parse };
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS((exports2, module2) => {
  var EventEmitter2 = require("events");
  var http = require("http");
  var { Duplex } = require("stream");
  var { createHash: createHash3 } = require("crypto");
  var extension = require_extension();
  var PerMessageDeflate = require_permessage_deflate();
  var subprotocol = require_subprotocol();
  var WebSocket = require_websocket();
  var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
  var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
  var RUNNING = 0;
  var CLOSING = 1;
  var CLOSED = 2;

  class WebSocketServer extends EventEmitter2 {
    constructor(options, callback) {
      super();
      options = {
        allowSynchronousEvents: true,
        autoPong: true,
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: false,
        handleProtocols: null,
        clientTracking: true,
        closeTimeout: CLOSE_TIMEOUT,
        verifyClient: null,
        noServer: false,
        backlog: null,
        server: null,
        host: null,
        path: null,
        port: null,
        WebSocket,
        ...options
      };
      if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
        throw new TypeError('One and only one of the "port", "server", or "noServer" options ' + "must be specified");
      }
      if (options.port != null) {
        this._server = http.createServer((req, res) => {
          const body = http.STATUS_CODES[426];
          res.writeHead(426, {
            "Content-Length": body.length,
            "Content-Type": "text/plain"
          });
          res.end(body);
        });
        this._server.listen(options.port, options.host, options.backlog, callback);
      } else if (options.server) {
        this._server = options.server;
      }
      if (this._server) {
        const emitConnection = this.emit.bind(this, "connection");
        this._removeListeners = addListeners(this._server, {
          listening: this.emit.bind(this, "listening"),
          error: this.emit.bind(this, "error"),
          upgrade: (req, socket, head) => {
            this.handleUpgrade(req, socket, head, emitConnection);
          }
        });
      }
      if (options.perMessageDeflate === true)
        options.perMessageDeflate = {};
      if (options.clientTracking) {
        this.clients = new Set;
        this._shouldEmitClose = false;
      }
      this.options = options;
      this._state = RUNNING;
    }
    address() {
      if (this.options.noServer) {
        throw new Error('The server is operating in "noServer" mode');
      }
      if (!this._server)
        return null;
      return this._server.address();
    }
    close(cb) {
      if (this._state === CLOSED) {
        if (cb) {
          this.once("close", () => {
            cb(new Error("The server is not running"));
          });
        }
        process.nextTick(emitClose, this);
        return;
      }
      if (cb)
        this.once("close", cb);
      if (this._state === CLOSING)
        return;
      this._state = CLOSING;
      if (this.options.noServer || this.options.server) {
        if (this._server) {
          this._removeListeners();
          this._removeListeners = this._server = null;
        }
        if (this.clients) {
          if (!this.clients.size) {
            process.nextTick(emitClose, this);
          } else {
            this._shouldEmitClose = true;
          }
        } else {
          process.nextTick(emitClose, this);
        }
      } else {
        const server = this._server;
        this._removeListeners();
        this._removeListeners = this._server = null;
        server.close(() => {
          emitClose(this);
        });
      }
    }
    shouldHandle(req) {
      if (this.options.path) {
        const index = req.url.indexOf("?");
        const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
        if (pathname !== this.options.path)
          return false;
      }
      return true;
    }
    handleUpgrade(req, socket, head, cb) {
      socket.on("error", socketOnError);
      const key = req.headers["sec-websocket-key"];
      const upgrade = req.headers.upgrade;
      const version = +req.headers["sec-websocket-version"];
      if (req.method !== "GET") {
        const message = "Invalid HTTP method";
        abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
        return;
      }
      if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
        const message = "Invalid Upgrade header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (key === undefined || !keyRegex.test(key)) {
        const message = "Missing or invalid Sec-WebSocket-Key header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (version !== 13 && version !== 8) {
        const message = "Missing or invalid Sec-WebSocket-Version header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
          "Sec-WebSocket-Version": "13, 8"
        });
        return;
      }
      if (!this.shouldHandle(req)) {
        abortHandshake(socket, 400);
        return;
      }
      const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
      let protocols = new Set;
      if (secWebSocketProtocol !== undefined) {
        try {
          protocols = subprotocol.parse(secWebSocketProtocol);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Protocol header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
      const extensions = {};
      if (this.options.perMessageDeflate && secWebSocketExtensions !== undefined) {
        const perMessageDeflate = new PerMessageDeflate({
          ...this.options.perMessageDeflate,
          isServer: true,
          maxPayload: this.options.maxPayload
        });
        try {
          const offers = extension.parse(secWebSocketExtensions);
          if (offers[PerMessageDeflate.extensionName]) {
            perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
            extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
          }
        } catch (err) {
          const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      if (this.options.verifyClient) {
        const info = {
          origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
          secure: !!(req.socket.authorized || req.socket.encrypted),
          req
        };
        if (this.options.verifyClient.length === 2) {
          this.options.verifyClient(info, (verified, code, message, headers) => {
            if (!verified) {
              return abortHandshake(socket, code || 401, message, headers);
            }
            this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
          });
          return;
        }
        if (!this.options.verifyClient(info))
          return abortHandshake(socket, 401);
      }
      this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
    }
    completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
      if (!socket.readable || !socket.writable)
        return socket.destroy();
      if (socket[kWebSocket]) {
        throw new Error("server.handleUpgrade() was called more than once with the same " + "socket, possibly due to a misconfiguration");
      }
      if (this._state > RUNNING)
        return abortHandshake(socket, 503);
      const digest2 = createHash3("sha1").update(key + GUID).digest("base64");
      const headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${digest2}`
      ];
      const ws = new this.options.WebSocket(null, undefined, this.options);
      if (protocols.size) {
        const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
        if (protocol) {
          headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
          ws._protocol = protocol;
        }
      }
      if (extensions[PerMessageDeflate.extensionName]) {
        const params = extensions[PerMessageDeflate.extensionName].params;
        const value = extension.format({
          [PerMessageDeflate.extensionName]: [params]
        });
        headers.push(`Sec-WebSocket-Extensions: ${value}`);
        ws._extensions = extensions;
      }
      this.emit("headers", headers, req);
      socket.write(headers.concat(`\r
`).join(`\r
`));
      socket.removeListener("error", socketOnError);
      ws.setSocket(socket, head, {
        allowSynchronousEvents: this.options.allowSynchronousEvents,
        maxBufferedChunks: this.options.maxBufferedChunks,
        maxFragments: this.options.maxFragments,
        maxPayload: this.options.maxPayload,
        skipUTF8Validation: this.options.skipUTF8Validation
      });
      if (this.clients) {
        this.clients.add(ws);
        ws.on("close", () => {
          this.clients.delete(ws);
          if (this._shouldEmitClose && !this.clients.size) {
            process.nextTick(emitClose, this);
          }
        });
      }
      cb(ws, req);
    }
  }
  module2.exports = WebSocketServer;
  function addListeners(server, map) {
    for (const event of Object.keys(map))
      server.on(event, map[event]);
    return function removeListeners() {
      for (const event of Object.keys(map)) {
        server.removeListener(event, map[event]);
      }
    };
  }
  function emitClose(server) {
    server._state = CLOSED;
    server.emit("close");
  }
  function socketOnError() {
    this.destroy();
  }
  function abortHandshake(socket, code, message, headers) {
    message = message || http.STATUS_CODES[code];
    headers = {
      Connection: "close",
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(message),
      ...headers
    };
    socket.once("finish", socket.destroy);
    socket.end(`HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join(`\r
`) + `\r
\r
` + message);
  }
  function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
    if (server.listenerCount("wsClientError")) {
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
      server.emit("wsClientError", err, socket, req);
    } else {
      abortHandshake(socket, code, message, headers);
    }
  }
});

// src/mock/world.ts
function seedWorld() {
  return {
    version: 1,
    me: 1000,
    users: [
      { id: 1000, firstName: "Mock", lastName: "Owner", username: "mock_owner", phone: "15550000000", about: "The account TG_MOCK logs you in as" },
      { id: 1001, firstName: "Alice", lastName: "Example", username: "alice_example", phone: "15550000001", contact: true, mutual: true, about: "Designer. Replies slowly on Fridays.", profilePhotos: 2 },
      { id: 1002, firstName: "Bob", lastName: "Sample", username: "bob_sample", contact: true },
      { id: 1003, firstName: "Carol", phone: "15550000003", contact: true, mutual: true },
      {
        id: 2001,
        firstName: "Demo Bot",
        username: "demo_bot",
        bot: true,
        about: "A scripted bot: /start, /menu, /keyboard",
        commands: {
          "/start": START_MENU,
          "/menu": { text: "Menu", buttons: [[{ text: "Status", data: "status", answer: "All systems normal" }]] },
          "/keyboard": { text: "Choose an option", keyboard: true, buttons: [[{ text: "Yes" }, { text: "No" }]] },
          Yes: { text: "You said yes." },
          No: { text: "You said no." }
        }
      }
    ],
    chats: [
      {
        id: 1000,
        kind: "user",
        messages: [
          { id: 1, ago: 6 * DAY, out: true, text: "Note to self: renew the domain" },
          { id: 2, ago: 2 * DAY, out: true, text: "Draft: https://example.com/draft", media: { kind: "document", fileName: "draft.pdf", mimeType: "application/pdf", size: 48213 } }
        ]
      },
      {
        id: 1001,
        kind: "user",
        unread: 2,
        readInboxMaxId: 3,
        draft: "Let us pick the deadline on the call tomorrow",
        messages: [
          { id: 1, ago: 3 * DAY, text: "Hi! Did you get the mockups?" },
          { id: 2, ago: 3 * DAY - 5 * MIN, out: true, text: "Yes, looking now", replyTo: 1 },
          { id: 3, ago: 1 * DAY, text: "Here is the new header", media: { kind: "photo" } },
          { id: 4, ago: 2 * HOUR, text: "Can we talk about the deadline tomorrow?" },
          { id: 5, ago: 25 * MIN, text: "Ping me when you are free", edited: true, reactions: [
            { userId: 1000, emoji: "\uD83D\uDC4D" },
            { userId: 1002, emoji: "\uD83D\uDC4D" },
            { userId: 1003, emoji: "❤️" },
            { userId: 1001, customEmojiId: "5201" },
            { userId: 1002, paid: true }
          ] }
        ],
        scheduled: [
          { id: 1001, date: 4102444800, out: true, text: "Happy New Year! \uD83C\uDF89" }
        ]
      },
      {
        id: 1002,
        kind: "user",
        mutedUntil: 4102444800,
        unread: 1,
        readInboxMaxId: 1,
        messages: [
          { id: 1, ago: 9 * DAY, text: "Voice note", media: { kind: "voice", mimeType: "audio/ogg", size: 20480, duration: 12 } },
          { id: 2, ago: 5 * HOUR, text: "lol look at this" }
        ]
      },
      {
        id: 2001,
        kind: "user",
        messages: [
          { id: 1, ago: 4 * DAY, out: true, text: "/start" },
          { id: 2, ago: 4 * DAY - 2, ...START_MENU }
        ]
      },
      {
        id: 3001,
        kind: "group",
        title: "Family",
        role: "admin",
        about: "Weekend plans",
        members: [{ userId: 1003, role: "creator" }, { userId: 1000, role: "admin" }, { userId: 1001 }],
        unread: 3,
        readInboxMaxId: 2,
        messages: [
          { id: 1, ago: 2 * DAY, from: 1003, text: "Dinner on Saturday?" },
          { id: 2, ago: 2 * DAY - 10 * MIN, out: true, text: "I am in" },
          { id: 3, ago: 3 * HOUR, from: 1001, text: "Me too, 7pm works" },
          { id: 4, ago: 2 * HOUR, from: 1003, text: "Booked a table", pinned: true },
          { id: 5, ago: 90 * MIN, from: 1003, text: "Who is bringing dessert?" }
        ]
      },
      {
        id: 4001,
        kind: "supergroup",
        title: "Team",
        username: "mock_team",
        role: "creator",
        about: "Work chat",
        membersCount: 4,
        onlineCount: 2,
        slowModeSeconds: 10,
        stats: true,
        members: [{ userId: 1000, role: "creator" }, { userId: 1001, role: "admin" }, { userId: 1002 }, { userId: 1003 }],
        unread: 1,
        readInboxMaxId: 2,
        adminLog: [
          { id: 1, userId: 1000, action: "title", prev: "Project", now: "Team", ago: 9 * DAY },
          { id: 2, userId: 1002, action: "join", ago: 5 * DAY },
          { id: 3, userId: 1003, action: "leave", ago: 2 * HOUR }
        ],
        joinRequests: [{ userId: 1003, about: "Please add me", ago: 3 * HOUR }],
        messages: [
          { id: 1, ago: 5 * DAY, from: 1001, text: "Release checklist is in the doc: https://example.com/checklist", viaBotId: 2001, groupedId: 7001, reactions: [{ userId: 1000, emoji: "\uD83D\uDE80" }, { userId: 1002, emoji: "\uD83D\uDE80" }] },
          { id: 2, ago: 4 * DAY, out: true, text: "Shipping on Thursday", pinned: true, silent: true },
          { id: 3, ago: 40 * MIN, from: 1002, text: "CI is green again" }
        ]
      },
      {
        id: 4002,
        kind: "supergroup",
        title: "Team Design",
        membersCount: 2,
        members: [{ userId: 1001, role: "creator" }, { userId: 1000 }],
        messages: [{ id: 1, ago: 8 * DAY, from: 1001, text: "New palette attached", media: { kind: "document", fileName: "palette.zip", mimeType: "application/zip", size: 1048576 } }]
      },
      {
        id: 4003,
        kind: "supergroup",
        title: "Dev Forum",
        username: "mock_forum",
        forum: true,
        membersCount: 120,
        members: [{ userId: 1002, role: "creator" }, { userId: 1000 }, { userId: 1001 }],
        topics: [
          { id: 1, title: "General", pinned: true },
          { id: 10, title: "Bugs", unread: 2 },
          { id: 20, title: "Ideas", closed: true }
        ],
        unread: 2,
        readInboxMaxId: 22,
        messages: [
          { id: 10, ago: 7 * DAY, from: 1002, text: "Bugs" },
          { id: 20, ago: 7 * DAY - MIN, from: 1002, text: "Ideas" },
          { id: 21, ago: 6 * DAY + 2 * HOUR, from: 1003, text: "Dark theme for the dashboard", thread: 20, replyTo: 20 },
          { id: 22, ago: 6 * DAY, from: 1001, text: "Login fails on the second device", thread: 10, replyTo: 10 },
          { id: 23, ago: 4 * HOUR, from: 1002, text: "Reproduced, looking into it", thread: 10, replyTo: 22 },
          { id: 24, ago: 1 * HOUR, from: 1001, text: "Thanks! Any ETA?", thread: 10, replyTo: 23 }
        ]
      },
      {
        id: 5001,
        kind: "channel",
        title: "Mock News",
        username: "mock_news",
        about: "Announcements",
        membersCount: 15230,
        onlineCount: 320,
        kickedCount: 4,
        bannedCount: 1,
        verified: true,
        stats: true,
        linkedChatId: 5002,
        unread: 2,
        readInboxMaxId: 1,
        messages: [
          { id: 1, ago: 6 * DAY, text: "Version 1.0 is out", replies: 2, pinned: true, views: 15230, forwards: 42, postAuthor: "Editor", reactions: [{ userId: 1001, emoji: "\uD83C\uDF89" }, { userId: 1002, emoji: "\uD83C\uDF89" }, { userId: 1003, emoji: "\uD83D\uDC4D" }] },
          { id: 2, ago: 1 * DAY, text: "Maintenance window on Sunday", media: { kind: "photo" }, replies: 0, views: 9800, forwards: 5 },
          { id: 3, ago: 3 * HOUR, text: "Weekly digest: three things shipped", views: 12044, forwards: 18, media: { kind: "video", fileName: "digest.mp4", mimeType: "video/mp4", size: 5242880, duration: 34 } }
        ]
      },
      {
        id: 5002,
        kind: "supergroup",
        title: "Mock News Chat",
        archived: true,
        membersCount: 310,
        members: [{ userId: 1002, role: "creator" }, { userId: 1000 }],
        messages: [
          { id: 1, ago: 6 * DAY, text: "Version 1.0 is out", forwardedFrom: 5001 },
          { id: 2, ago: 6 * DAY - HOUR, from: 1001, text: "Congrats!", thread: 1, replyTo: 1 },
          { id: 3, ago: 5 * DAY, from: 1003, text: "Finally", thread: 1, replyTo: 1 }
        ]
      }
    ],
    folders: [{ id: 2, title: "Work", emoticon: "\uD83D\uDCBC", include: [4001, 4002, 1001], exclude: [5002] }],
    stars: 250
  };
}
function mockStatePath(value = process.env.TG_MOCK ?? "") {
  return /^(1|true|yes|on)$/i.test(value) ? configFile("mock-state.json") : value;
}
function loadWorld(path2 = mockStatePath()) {
  if (import_node_fs9.existsSync(path2)) {
    const world = JSON.parse(import_node_fs9.readFileSync(path2, "utf8"));
    if (world?.version !== 1 || !Array.isArray(world.chats) || !Array.isArray(world.users)) {
      throw new Error(`${path2} is not a mock state file (expected {"version":1,"me":…,"users":[…],"chats":[…]}). Delete it to start from the built-in account.`);
    }
    return world;
  }
  return seedWorld();
}
function saveWorld(world, path2 = mockStatePath()) {
  import_node_fs9.mkdirSync(import_node_path9.dirname(path2), { recursive: true, mode: 448 });
  import_node_fs9.writeFileSync(path2, JSON.stringify(world, null, 1) + `
`, { encoding: "utf8", mode: 384 });
}
var import_node_fs9, import_node_path9, MIN = 60, HOUR = 3600, DAY = 86400, START_MENU;
var init_world = __esm(() => {
  init_paths();
  import_node_fs9 = require("node:fs");
  import_node_path9 = require("node:path");
  START_MENU = {
    text: "Welcome! Pick a section.",
    buttons: [
      [
        {
          text: "Catalog",
          data: "catalog",
          edit: { text: "Catalog: 3 items", buttons: [[{ text: "« Back", data: "back", edit: "/start" }]] }
        },
        { text: "Status", data: "status", answer: "All systems normal" }
      ],
      [
        { text: "Docs", url: "https://example.com/docs" },
        { text: "Order", data: "order", answer: "Order created", alert: true, reply: { text: "Order #42 is confirmed." } }
      ]
    ]
  };
});

// src/mock/client.ts
var exports_client = {};
__export(exports_client, {
  createMockClient: () => createMockClient,
  MockClient: () => MockClient
});
function notImplemented(what) {
  throw new Error(`mock: ${what} is not implemented. Add it to src/mock/client.ts, or run without TG_MOCK against a dev profile.`);
}

class MockClient {
  world;
  persist;
  connected = true;
  session = { save: () => "" };
  constructor(world, persist = () => {}) {
    this.world = world;
    this.persist = persist;
  }
  user(u) {
    return new import_teleproto3.Api.User({
      id: import_big_integer.default(u.id),
      accessHash: HASH,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      phone: u.phone,
      bot: u.bot,
      contact: u.contact,
      mutualContact: u.mutual,
      self: u.id === this.world.me
    });
  }
  findUser(id) {
    return this.world.users.find((u) => u.id === id);
  }
  entityOf(chat) {
    if (chat.kind === "user") {
      const u = this.findUser(chat.id);
      if (!u)
        throw new Error(`mock state: chat ${chat.id} is a private chat but there is no user ${chat.id}`);
      return this.user(u);
    }
    if (chat.kind === "group") {
      return new import_teleproto3.Api.Chat(args({
        id: import_big_integer.default(chat.id),
        title: chat.title ?? "Group",
        photo: new import_teleproto3.Api.ChatPhotoEmpty,
        participantsCount: chat.membersCount ?? chat.members?.length ?? 0,
        date: 0,
        version: 1,
        creator: chat.role === "creator"
      }));
    }
    return new import_teleproto3.Api.Channel(args({
      id: import_big_integer.default(chat.id),
      accessHash: HASH,
      title: chat.title ?? "Channel",
      username: chat.username,
      photo: new import_teleproto3.Api.ChatPhotoEmpty,
      date: 0,
      megagroup: chat.kind === "supergroup",
      broadcast: chat.kind === "channel",
      forum: chat.forum,
      verified: chat.verified,
      scam: chat.scam,
      fake: chat.fake,
      creator: chat.role === "creator",
      adminRights: chat.role ? new import_teleproto3.Api.ChatAdminRights({ changeInfo: true, deleteMessages: true, banUsers: true, inviteUsers: true, pinMessages: true }) : undefined,
      participantsCount: chat.membersCount ?? chat.members?.length
    }));
  }
  peerOf(chat) {
    if (chat.kind === "user")
      return new import_teleproto3.Api.PeerUser({ userId: import_big_integer.default(chat.id) });
    if (chat.kind === "group")
      return new import_teleproto3.Api.PeerChat({ chatId: import_big_integer.default(chat.id) });
    return new import_teleproto3.Api.PeerChannel({ channelId: import_big_integer.default(chat.id) });
  }
  locate(like) {
    const users = this.world.users;
    const chats = this.world.chats;
    const byUser = (id) => ({ chat: chats.find((c) => c.kind === "user" && c.id === id), user: users.find((u) => u.id === id) });
    const byGroup = (id) => ({ chat: chats.find((c) => c.kind === "group" && c.id === id) });
    const byChannel = (id) => ({ chat: chats.find((c) => (c.kind === "supergroup" || c.kind === "channel") && c.id === id) });
    if (typeof like === "string") {
      const text2 = like.trim();
      if (/^-?\d+$/.test(text2))
        return this.locate(import_big_integer.default(text2));
      const name = text2.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "").toLowerCase();
      if (["me", "self"].includes(name))
        return byUser(this.world.me);
      const u = users.find((x) => x.username?.toLowerCase() === name || x.phone === name.replace(/^\+/, ""));
      if (u)
        return byUser(u.id);
      return { chat: chats.find((c) => c.username?.toLowerCase() === name) };
    }
    if (typeof like === "number")
      return this.locate(import_big_integer.default(like));
    if (import_big_integer.default.isInstance(like)) {
      const marked = like.toString();
      if (marked.startsWith("-100"))
        return byChannel(Number(marked.slice(4)));
      if (marked.startsWith("-"))
        return byGroup(Number(marked.slice(1)));
      const id = Number(marked);
      const found = byUser(id);
      return found.user ? found : byChannel(id).chat ? byChannel(id) : byGroup(id);
    }
    if (like && typeof like === "object") {
      const o = like;
      switch (o.className) {
        case "User":
          return byUser(o.id.toJSNumber());
        case "Chat":
          return byGroup(o.id.toJSNumber());
        case "Channel":
          return byChannel(o.id.toJSNumber());
        case "PeerUser":
        case "InputPeerUser":
        case "InputUser":
          return byUser(o.userId.toJSNumber());
        case "PeerChat":
        case "InputPeerChat":
          return byGroup(o.chatId.toJSNumber());
        case "PeerChannel":
        case "InputPeerChannel":
        case "InputChannel":
          return byChannel(o.channelId.toJSNumber());
        case "InputPeerSelf":
        case "InputUserSelf":
          return byUser(this.world.me);
        case "InputNotifyPeer":
        case "InputDialogPeer":
        case "InputFolderPeer":
          return this.locate(o.peer);
      }
    }
    return {};
  }
  chat(like, create = false) {
    const { chat, user } = this.locate(like);
    if (chat)
      return chat;
    if (user) {
      const opened = { id: user.id, kind: "user", messages: [] };
      if (create)
        this.world.chats.push(opened);
      return opened;
    }
    throw new Error(`Cannot find any entity corresponding to "${describe(like)}"`);
  }
  async getMe() {
    return this.user(this.findUser(this.world.me));
  }
  async getEntity(like) {
    const { chat, user } = this.locate(like);
    if (chat)
      return this.entityOf(chat);
    if (user)
      return this.user(user);
    throw new Error(`Cannot find any entity corresponding to "${describe(like)}"`);
  }
  async getInputEntity(like) {
    return import_teleproto3.utils.getInputPeer(await this.getEntity(like));
  }
  date(m) {
    return m.date ?? now() - (m.ago ?? 0);
  }
  senderId(chat, m) {
    if (m.from)
      return m.from;
    if (m.out)
      return this.world.me;
    return chat.kind === "user" ? chat.id : undefined;
  }
  markup(m) {
    if (!m.buttons?.length)
      return;
    if (m.keyboard) {
      return new import_teleproto3.Api.ReplyKeyboardMarkup({
        rows: m.buttons.map((row) => new import_teleproto3.Api.KeyboardButtonRow({
          buttons: row.map((b) => new import_teleproto3.Api.KeyboardButton({ text: b.text, type: new import_teleproto3.Api.ButtonTypeDefault }))
        }))
      });
    }
    return new import_teleproto3.Api.ReplyInlineMarkup({
      rows: m.buttons.map((row) => new import_teleproto3.Api.KeyboardInlineButtonRow({
        buttons: row.map((b) => new import_teleproto3.Api.KeyboardInlineButton({
          text: b.text,
          type: b.url ? new import_teleproto3.Api.InlineButtonTypeUrl({ url: b.url }) : new import_teleproto3.Api.InlineButtonTypeCallback({ data: Buffer.from(b.data ?? b.text) })
        }))
      }))
    });
  }
  media(m) {
    const media = m.media;
    if (!media)
      return;
    if (media.kind === "photo")
      return new import_teleproto3.Api.MessageMediaPhoto({ photo: new import_teleproto3.Api.PhotoEmpty({ id: import_big_integer.default(m.id) }) });
    const attributes = [];
    if (media.fileName)
      attributes.push(new import_teleproto3.Api.DocumentAttributeFilename({ fileName: media.fileName }));
    if (media.kind === "video")
      attributes.push(new import_teleproto3.Api.DocumentAttributeVideo({ duration: media.duration ?? 0, w: 1280, h: 720 }));
    if (media.kind === "voice")
      attributes.push(new import_teleproto3.Api.DocumentAttributeAudio({ duration: media.duration ?? 0, voice: true }));
    return new import_teleproto3.Api.MessageMediaDocument({
      document: new import_teleproto3.Api.Document({
        id: import_big_integer.default(m.id),
        accessHash: HASH,
        fileReference: Buffer.alloc(0),
        date: this.date(m),
        mimeType: media.mimeType ?? "application/octet-stream",
        size: import_big_integer.default(media.size ?? 0),
        dcId: 1,
        attributes
      })
    });
  }
  reactionOf(r) {
    if (r.paid)
      return new import_teleproto3.Api.ReactionPaid;
    if (r.customEmojiId)
      return new import_teleproto3.Api.ReactionCustomEmoji({ documentId: import_big_integer.default(r.customEmojiId) });
    return new import_teleproto3.Api.ReactionEmoji({ emoticon: r.emoji ?? "\uD83D\uDC4D" });
  }
  reactions(m) {
    if (!m.reactions?.length)
      return;
    const groups = new Map;
    for (const r of m.reactions) {
      const key = r.paid ? "paid" : r.customEmojiId ? `c:${r.customEmojiId}` : `e:${r.emoji}`;
      const g = groups.get(key) ?? { reaction: this.reactionOf(r), count: 0 };
      g.count += 1;
      if (r.userId === this.world.me)
        g.chosenOrder = 0;
      groups.set(key, g);
    }
    return new import_teleproto3.Api.MessageReactions(args({
      results: [...groups.values()].map((g) => new import_teleproto3.Api.ReactionCount(args({ reaction: g.reaction, count: g.count, chosenOrder: g.chosenOrder }))),
      recentReactions: m.reactions.map((r) => new import_teleproto3.Api.MessagePeerReaction(args({
        peerId: new import_teleproto3.Api.PeerUser({ userId: import_big_integer.default(r.userId) }),
        date: now(),
        reaction: this.reactionOf(r),
        my: r.userId === this.world.me || undefined
      }))),
      canSeeList: true
    }));
  }
  pollMedia(poll) {
    const answers = poll.options.map((o, i) => new import_teleproto3.Api.PollAnswer({ text: new import_teleproto3.Api.TextWithEntities({ text: o.text, entities: [] }), option: Buffer.from([i]) }));
    return new import_teleproto3.Api.MessageMediaPoll({
      poll: new import_teleproto3.Api.Poll(args({ id: HASH, question: new import_teleproto3.Api.TextWithEntities({ text: poll.question, entities: [] }), answers, quiz: poll.quiz, multipleChoice: poll.multiple, closed: poll.closed })),
      results: new import_teleproto3.Api.PollResults(args({
        totalVoters: poll.totalVoters,
        results: poll.options.map((o, i) => new import_teleproto3.Api.PollAnswerVoters(args({ option: Buffer.from([i]), voters: o.voters ?? 0, chosen: o.chosen, correct: o.correct })))
      }))
    });
  }
  message(chat, m) {
    const from = chat.kind === "group" || chat.kind === "supergroup" ? this.senderId(chat, m) : undefined;
    return new import_teleproto3.Api.Message(args({
      id: m.id,
      date: this.date(m),
      message: m.text,
      out: m.out,
      post: chat.kind === "channel" || undefined,
      silent: m.silent,
      noforwards: m.noforwards,
      peerId: this.peerOf(chat),
      fromId: from ? new import_teleproto3.Api.PeerUser({ userId: import_big_integer.default(from) }) : undefined,
      replyTo: m.replyTo || m.thread ? new import_teleproto3.Api.MessageReplyHeader({ replyToMsgId: m.replyTo ?? m.thread, replyToTopId: m.thread, forumTopic: chat.forum && !!m.thread }) : undefined,
      media: m.poll ? this.pollMedia(m.poll) : this.media(m),
      replyMarkup: this.markup(m),
      replies: m.replies === undefined ? undefined : new import_teleproto3.Api.MessageReplies(args({ replies: m.replies, repliesPts: 0, comments: chat.kind === "channel" || undefined, channelId: chat.linkedChatId ? import_big_integer.default(chat.linkedChatId) : undefined })),
      reactions: this.reactions(m),
      views: m.views,
      forwards: m.forwards,
      viaBotId: m.viaBotId ? import_big_integer.default(m.viaBotId) : undefined,
      groupedId: m.groupedId ? import_big_integer.default(m.groupedId) : undefined,
      postAuthor: m.postAuthor,
      ttlPeriod: m.ttlPeriod,
      pinned: m.pinned,
      editDate: m.edited ? this.date(m) : undefined,
      fwdFrom: m.forwardedFrom ? new import_teleproto3.Api.MessageFwdHeader({ date: this.date(m), fromId: this.peerOf(this.chat(import_big_integer.default(m.forwardedFrom))) }) : undefined
    }));
  }
  newest(chat) {
    return [...chat.messages].sort((a, b) => b.id - a.id);
  }
  nextId(chat) {
    return chat.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  }
  save() {
    this.persist(this.world);
  }
  async getMessages(like, params = {}) {
    const chat = this.chat(like);
    if (params.ids !== undefined) {
      const ids = Array.isArray(params.ids) ? params.ids : [params.ids];
      return ids.map((id) => {
        const m = chat.messages.find((x) => x.id === id);
        return m ? this.message(chat, m) : undefined;
      });
    }
    let list = this.newest(chat);
    if (params.filter?.className === "InputMessagesFilterPinned")
      list = list.filter((m) => m.pinned);
    if (params.offsetId)
      list = list.filter((m) => m.id < params.offsetId);
    if (params.offsetDate)
      list = list.filter((m) => this.date(m) < params.offsetDate);
    if (params.minId)
      list = list.filter((m) => m.id > params.minId);
    if (params.maxId)
      list = list.filter((m) => m.id < params.maxId);
    if (params.fromUser) {
      const sender = this.locate(params.fromUser).user?.id;
      list = list.filter((m) => this.senderId(chat, m) === sender);
    }
    return list.slice(0, params.limit ?? 100).map((m) => this.message(chat, m));
  }
  async sendMessage(like, params = {}) {
    const chat = this.chat(like, true);
    const reply = typeof params.replyTo === "object" ? params.replyTo : { replyToMsgId: params.replyTo, topMsgId: undefined };
    const repliedTo = reply.replyToMsgId ? chat.messages.find((m) => m.id === reply.replyToMsgId) : undefined;
    if (reply.replyToMsgId && !repliedTo)
      throw new Error("MSG_ID_INVALID: the message to reply to does not exist");
    const sent = this.append(chat, {
      out: true,
      text: params.message ?? "",
      replyTo: reply.replyToMsgId,
      thread: reply.topMsgId ?? repliedTo?.thread,
      date: params.schedule
    });
    this.botAnswers(chat, sent.text);
    this.save();
    return this.message(chat, sent);
  }
  append(chat, m) {
    const message = { ...m, id: this.nextId(chat), date: m.date ?? now() };
    for (const key of Object.keys(message))
      if (message[key] === undefined)
        delete message[key];
    chat.messages.push(message);
    return message;
  }
  botAnswers(chat, text2) {
    const reply = chat.kind === "user" ? this.findUser(chat.id)?.commands?.[text2.trim()] : undefined;
    if (reply)
      this.append(chat, { text: reply.text, buttons: reply.buttons, keyboard: reply.keyboard });
  }
  async editMessage(like, params) {
    const chat = this.chat(like);
    const m = chat.messages.find((x) => x.id === params.message);
    if (!m)
      throw new Error("MESSAGE_ID_INVALID: no such message");
    if (!m.out)
      throw new Error("MESSAGE_AUTHOR_REQUIRED: you can't edit someone else's message");
    m.text = params.text ?? m.text;
    m.edited = true;
    this.save();
    return this.message(chat, m);
  }
  async deleteMessages(like, ids) {
    const chat = this.chat(like);
    chat.messages = chat.messages.filter((m) => !ids.includes(m.id));
    this.save();
    return [];
  }
  async markAsRead(like) {
    const chat = this.chat(like);
    chat.unread = 0;
    chat.readInboxMaxId = this.newest(chat)[0]?.id ?? 0;
    this.save();
    return true;
  }
  async pinMessage(like, id) {
    const chat = this.chat(like);
    const m = chat.messages.find((x) => x.id === id);
    if (!m)
      throw new Error("MESSAGE_ID_INVALID: no such message");
    m.pinned = true;
    this.save();
  }
  async unpinMessage(like, id) {
    const chat = this.chat(like);
    for (const m of chat.messages)
      if (id === undefined || m.id === id)
        delete m.pinned;
    this.save();
  }
  async forwardMessages(like, params) {
    const to = this.chat(like, true);
    const from = this.chat(params.fromPeer);
    const ids = Array.isArray(params.messages) ? params.messages : [params.messages];
    const sent = ids.map((id) => {
      const m = from.messages.find((x) => x.id === id);
      if (!m)
        throw new Error(`MESSAGE_ID_INVALID: no message ${id} to forward`);
      return this.append(to, { out: true, text: m.text, media: m.media, forwardedFrom: from.kind === "user" ? undefined : from.id });
    });
    this.save();
    return sent.map((m) => this.message(to, m));
  }
  async sendFile(like, params) {
    if (typeof params.file !== "string" || !import_node_fs10.existsSync(params.file))
      throw new Error(`File not found: ${String(params.file)}`);
    const chat = this.chat(like, true);
    const reply = typeof params.replyTo === "object" ? params.replyTo : { replyToMsgId: params.replyTo, topMsgId: undefined };
    const ext = import_node_path10.extname(params.file).toLowerCase();
    const kind = params.forceDocument ? "document" : [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? "photo" : [".mp4", ".mov", ".webm"].includes(ext) ? "video" : [".ogg", ".oga"].includes(ext) ? "voice" : "document";
    const sent = this.append(chat, {
      out: true,
      text: params.caption ?? "",
      replyTo: reply.replyToMsgId,
      thread: reply.topMsgId,
      media: { kind, fileName: kind === "photo" ? undefined : import_node_path10.basename(params.file) }
    });
    this.save();
    return this.message(chat, sent);
  }
  async downloadMedia(message, params = {}) {
    const content = Buffer.from(`mock media of message ${message.id}
`);
    if (typeof params.outputFile !== "string")
      return content;
    import_node_fs10.mkdirSync(import_node_path10.dirname(params.outputFile), { recursive: true });
    import_node_fs10.writeFileSync(params.outputFile, content);
    return params.outputFile;
  }
  async downloadProfilePhoto() {
    return;
  }
  async getDialogs(params = {}) {
    const entities = new Map;
    let chats = this.world.chats.filter((c) => c.messages.length > 0 || c.kind !== "user");
    if (params.archived !== undefined)
      chats = chats.filter((c) => !!c.archived === params.archived);
    const rows = chats.map((chat) => {
      const entity = this.entityOf(chat);
      entities.set(import_teleproto3.utils.getPeerId(entity).toString(), entity);
      const top = this.newest(chat)[0];
      return { chat, top, date: top ? this.date(top) : 0 };
    });
    rows.sort((a, b) => b.date - a.date);
    return rows.slice(0, params.limit ?? 100).map(({ chat, top }) => new import_dialog.Dialog(this, new import_teleproto3.Api.Dialog(args({
      peer: this.peerOf(chat),
      topMessage: top?.id ?? 0,
      readInboxMaxId: chat.readInboxMaxId ?? top?.id ?? 0,
      readOutboxMaxId: 0,
      unreadCount: chat.unread ?? 0,
      unreadMentionsCount: 0,
      unreadReactionsCount: 0,
      notifySettings: new import_teleproto3.Api.PeerNotifySettings({ muteUntil: chat.mutedUntil }),
      folderId: chat.archived ? 1 : undefined
    })), entities, top ? this.message(chat, top) : undefined));
  }
  statsGraph(data) {
    return new import_teleproto3.Api.StatsGraph(args({ json: new import_teleproto3.Api.DataJSON({ data }) }));
  }
  asyncGraph(token) {
    return new import_teleproto3.Api.StatsGraphAsync({ token });
  }
  errorGraph(error) {
    return new import_teleproto3.Api.StatsGraphError({ error });
  }
  async invoke(request) {
    switch (request.className) {
      case "messages.GetReplies":
        return this.getReplies(request);
      case "messages.Search":
        return this.search([this.chat(request.peer)], request);
      case "messages.SearchGlobal":
        return this.search(this.world.chats, request);
      case "users.GetFullUser": {
        const user = this.locate(request.id).user;
        if (!user)
          throw new Error("USER_ID_INVALID");
        return { fullUser: { about: user.about, blocked: user.blocked, commonChatsCount: this.commonChats(user.id) }, users: [this.user(user)], chats: [] };
      }
      case "channels.GetFullChannel": {
        const chat = this.chat(request.channel);
        return {
          fullChat: new import_teleproto3.Api.ChannelFull(args({
            id: import_big_integer.default(chat.id),
            about: chat.about ?? "",
            participantsCount: chat.membersCount ?? chat.members?.length,
            adminsCount: chat.members?.filter((m) => m.role).length,
            kickedCount: chat.kickedCount,
            bannedCount: chat.bannedCount,
            onlineCount: chat.onlineCount,
            slowmodeSeconds: chat.slowModeSeconds,
            unreadCount: chat.unread ?? 0,
            linkedChatId: chat.linkedChatId ? import_big_integer.default(chat.linkedChatId) : undefined
          })),
          chats: [this.entityOf(chat)],
          users: []
        };
      }
      case "stats.GetBroadcastStats": {
        const chat = this.chat(request.channel);
        if (!chat.stats)
          throw new Error("CHAT_ADMIN_REQUIRED");
        const avp = (current, previous = current) => new import_teleproto3.Api.StatsAbsValueAndPrev({ current, previous });
        const g = this.statsGraph('{"columns":[["x",1,2],["y",10,20]]}');
        return new import_teleproto3.Api.stats.BroadcastStats(args({
          period: new import_teleproto3.Api.StatsDateRangeDays({ minDate: 1700000000, maxDate: 1700600000 }),
          followers: avp(chat.membersCount ?? 0, (chat.membersCount ?? 0) - 50),
          viewsPerPost: avp(12044, 11000),
          sharesPerPost: avp(18, 12),
          reactionsPerPost: avp(9, 7),
          viewsPerStory: avp(400, 380),
          sharesPerStory: avp(3, 2),
          reactionsPerStory: avp(5, 4),
          enabledNotifications: new import_teleproto3.Api.StatsPercentValue({ part: 62, total: 100 }),
          growthGraph: g,
          followersGraph: this.asyncGraph("async-followers"),
          muteGraph: this.errorGraph("no data"),
          topHoursGraph: g,
          interactionsGraph: g,
          ivInteractionsGraph: g,
          viewsBySourceGraph: g,
          newFollowersBySourceGraph: g,
          languagesGraph: g,
          reactionsByEmotionGraph: g,
          storyInteractionsGraph: g,
          storyReactionsByEmotionGraph: g,
          recentPostsInteractions: chat.messages.slice(0, 3).map((m) => new import_teleproto3.Api.PostInteractionCountersMessage({ msgId: m.id, views: m.views ?? 0, forwards: m.forwards ?? 0, reactions: (m.reactions ?? []).length }))
        }));
      }
      case "stats.GetMegagroupStats": {
        const chat = this.chat(request.channel);
        if (!chat.stats)
          throw new Error("CHAT_ADMIN_REQUIRED");
        const avp = (current, previous = current) => new import_teleproto3.Api.StatsAbsValueAndPrev({ current, previous });
        const g = this.statsGraph('{"columns":[["x",1,2],["y",3,4]]}');
        const members = chat.members ?? [];
        return new import_teleproto3.Api.stats.MegagroupStats(args({
          period: new import_teleproto3.Api.StatsDateRangeDays({ minDate: 1700000000, maxDate: 1700600000 }),
          members: avp(chat.membersCount ?? members.length, (chat.membersCount ?? members.length) - 2),
          messages: avp(chat.messages.length, chat.messages.length - 1),
          viewers: avp(3, 2),
          posters: avp(2, 2),
          growthGraph: g,
          membersGraph: this.asyncGraph("async-members"),
          newMembersBySourceGraph: g,
          languagesGraph: this.errorGraph("not enough data"),
          messagesGraph: g,
          actionsGraph: g,
          topHoursGraph: g,
          weekdaysGraph: g,
          topPosters: members.slice(0, 2).map((m, i) => new import_teleproto3.Api.StatsGroupTopPoster({ userId: import_big_integer.default(m.userId), messages: 20 - i * 5, avgChars: 80 - i * 10 })),
          topAdmins: members.filter((m) => m.role).map((m) => new import_teleproto3.Api.StatsGroupTopAdmin({ userId: import_big_integer.default(m.userId), deleted: 2, kicked: 1, banned: 0 })),
          topInviters: members.slice(0, 1).map((m) => new import_teleproto3.Api.StatsGroupTopInviter({ userId: import_big_integer.default(m.userId), invitations: 7 })),
          users: members.flatMap((m) => {
            const u = this.findUser(m.userId);
            return u ? [this.user(u)] : [];
          })
        }));
      }
      case "stats.LoadAsyncGraph": {
        return this.statsGraph(`{"token":"${request.token}","columns":[["x",1,2],["y",5,6]]}`);
      }
      case "stats.GetMessagePublicForwards":
      case "stats.GetStoryPublicForwards": {
        const chat = this.chat(request.channel ?? request.peer);
        if (!chat.stats)
          throw new Error("CHAT_ADMIN_REQUIRED");
        const into = this.world.chats.find((c) => c.kind === "supergroup" && c.id !== chat.id) ?? chat;
        const fwdMsg = new import_teleproto3.Api.Message(args({ id: 999, date: now(), message: "reposted", peerId: this.peerOf(into), views: 123 }));
        return new import_teleproto3.Api.stats.PublicForwards(args({
          count: 1,
          forwards: [new import_teleproto3.Api.PublicForwardMessage({ message: fwdMsg })],
          chats: [this.entityOf(into)],
          users: [],
          nextOffset: undefined
        }));
      }
      case "stats.GetMessageStats":
      case "stats.GetStoryStats": {
        const chat = this.chat(request.channel ?? request.peer);
        if (!chat.stats)
          throw new Error("CHAT_ADMIN_REQUIRED");
        const g = this.statsGraph('{"columns":[["x",1,2],["y",7,8]]}');
        return new import_teleproto3.Api.stats.MessageStats(args({ viewsGraph: g, reactionsByEmotionGraph: this.errorGraph("no reactions") }));
      }
      case "messages.GetFullChat":
        return this.fullChat(this.chat(import_big_integer.default(`-${request.chatId.toString()}`)));
      case "channels.GetParticipants":
        return this.participants(request);
      case "messages.GetDialogFilters":
        return { filters: (this.world.folders ?? []).map((f) => this.folder(f)) };
      case "messages.UpdateDialogFilter": {
        const folders = this.world.folders ??= [];
        const index = folders.findIndex((f) => f.id === request.id);
        if (!request.filter) {
          if (index >= 0)
            folders.splice(index, 1);
        } else {
          const title = typeof request.filter.title === "string" ? request.filter.title : request.filter.title?.text ?? "Untitled";
          const ids = (peers = []) => peers.map((p) => this.chat(p).id);
          const next = { id: request.id, title, emoticon: request.filter.emoticon, include: ids(request.filter.includePeers), exclude: ids(request.filter.excludePeers) };
          if (index >= 0)
            folders[index] = next;
          else
            folders.push(next);
        }
        this.save();
        return true;
      }
      case "messages.GetForumTopics": {
        const chat = this.chat(request.peer);
        const q = request.q?.toLowerCase();
        const topics = (chat.topics ?? []).filter((t) => !q || t.title.toLowerCase().includes(q)).slice(0, request.limit ?? 100);
        return {
          topics: topics.map((t) => new import_teleproto3.Api.ForumTopic(args({
            id: t.id,
            date: 0,
            title: t.title,
            iconColor: 0,
            topMessage: chat.messages.filter((m) => m.thread === t.id || m.id === t.id).reduce((max, m) => Math.max(max, m.id), t.id),
            readInboxMaxId: 0,
            readOutboxMaxId: 0,
            unreadCount: t.unread ?? 0,
            unreadMentionsCount: 0,
            unreadReactionsCount: 0,
            fromId: new import_teleproto3.Api.PeerUser({ userId: import_big_integer.default(this.world.me) }),
            notifySettings: new import_teleproto3.Api.PeerNotifySettings({}),
            closed: t.closed,
            pinned: t.pinned
          }))),
          count: topics.length
        };
      }
      case "contacts.GetContacts": {
        const users = this.world.users.filter((u) => u.contact).map((u) => this.user(u));
        return new import_teleproto3.Api.contacts.Contacts({ contacts: [], savedCount: users.length, users });
      }
      case "channels.ExportMessageLink": {
        const chat = this.chat(request.channel);
        if (!chat.messages.some((m) => m.id === request.id))
          throw new Error("MESSAGE_ID_INVALID: no such message");
        return { link: `https://t.me/${chat.username ?? `c/${chat.id}`}/${request.id}${request.thread ? "?thread=1" : ""}`, html: "" };
      }
      case "messages.SendReaction": {
        const m = this.findMessage(request.peer, request.msgId);
        const others = (m.reactions ?? []).filter((r) => r.userId !== this.world.me);
        const mine = (request.reaction ?? []).map((r) => ({ userId: this.world.me, emoji: r.emoticon ?? "?" }));
        m.reactions = [...others, ...mine];
        if (!m.reactions.length)
          delete m.reactions;
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [], date: now(), seq: 0 }));
      }
      case "messages.GetMessageReactionsList": {
        const m = this.findMessage(request.peer, request.id);
        const reactions = (m.reactions ?? []).slice(0, request.limit ?? 50);
        return {
          count: reactions.length,
          reactions: reactions.map((r) => new import_teleproto3.Api.MessagePeerReaction({
            peerId: new import_teleproto3.Api.PeerUser({ userId: import_big_integer.default(r.userId) }),
            date: now(),
            reaction: this.reactionOf(r)
          })),
          users: reactions.flatMap((r) => {
            const u = this.findUser(r.userId);
            return u ? [this.user(u)] : [];
          }),
          chats: []
        };
      }
      case "messages.GetBotCallbackAnswer":
        return this.pressButton(request);
      case "messages.SetTyping":
        return true;
      case "account.UpdateNotifySettings": {
        const chat = this.chat(request.peer);
        const until = request.settings?.muteUntil ?? 0;
        if (until > now())
          chat.mutedUntil = until;
        else
          delete chat.mutedUntil;
        this.save();
        return true;
      }
      case "contacts.Block":
      case "contacts.Unblock": {
        const user = this.locate(request.id).user;
        if (!user)
          throw new Error("CONTACT_ID_INVALID");
        user.blocked = request.className === "contacts.Block" || undefined;
        this.save();
        return true;
      }
      case "contacts.AddContact": {
        const user = this.locate(request.id).user;
        if (!user)
          throw new Error("CONTACT_ID_INVALID");
        user.contact = true;
        if (request.firstName)
          user.firstName = request.firstName;
        if (request.lastName)
          user.lastName = request.lastName;
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [this.user(user)], chats: [], date: now(), seq: 0 }));
      }
      case "contacts.DeleteContacts": {
        for (const id of request.id ?? []) {
          const user = this.locate(id).user;
          if (user)
            delete user.contact;
        }
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [], date: now(), seq: 0 }));
      }
      case "channels.GetParticipant": {
        const chat = this.chat(request.channel);
        const userId = this.locate(request.participant).user?.id;
        const member = chat.members?.find((m) => m.userId === userId);
        if (!member)
          throw new Error("USER_NOT_PARTICIPANT");
        const uid = import_big_integer.default(member.userId);
        const rights = new import_teleproto3.Api.ChatAdminRights({ changeInfo: true, deleteMessages: true, banUsers: true, inviteUsers: true, pinMessages: true });
        const participant = member.role === "creator" ? new import_teleproto3.Api.ChannelParticipantCreator({ userId: uid, adminRights: rights }) : member.role === "admin" ? new import_teleproto3.Api.ChannelParticipantAdmin(args({ userId: uid, promotedBy: uid, date: 0, adminRights: rights })) : new import_teleproto3.Api.ChannelParticipant({ userId: uid, date: 0 });
        const u = this.findUser(member.userId);
        return new import_teleproto3.Api.channels.ChannelParticipant(args({ participant, chats: [this.entityOf(chat)], users: u ? [this.user(u)] : [] }));
      }
      case "messages.EditChatDefaultBannedRights": {
        const chat = this.chat(request.peer);
        chat.defaultBannedFlags = bannedFlags(request.bannedRights);
        if (!chat.defaultBannedFlags.length)
          delete chat.defaultBannedFlags;
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [this.entityOf(chat)], date: now(), seq: 0 }));
      }
      case "channels.EditBanned": {
        const chat = this.chat(request.channel);
        const userId = this.locate(request.participant).user?.id;
        if (userId === undefined)
          throw new Error("USER_ID_INVALID");
        const flags = bannedFlags(request.bannedRights);
        const list = (chat.bannedUsers ??= []).filter((b) => b.userId !== userId);
        if (flags.length)
          list.push({ userId, flags, until: request.bannedRights?.untilDate || undefined });
        chat.bannedUsers = list;
        if (!chat.bannedUsers.length)
          delete chat.bannedUsers;
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [this.entityOf(chat)], date: now(), seq: 0 }));
      }
      case "messages.CreateForumTopic": {
        const chat = this.chat(request.peer);
        const topics = chat.topics ??= [];
        const id = topics.reduce((max, t) => Math.max(max, t.id), 1) + 1;
        topics.push({ id, title: request.title });
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [this.entityOf(chat)], date: now(), seq: 0 }));
      }
      case "messages.EditForumTopic": {
        const chat = this.chat(request.peer);
        const topic = (chat.topics ?? []).find((t) => t.id === request.topicId);
        if (!topic)
          throw new Error("TOPIC_ID_INVALID");
        if (request.title !== undefined)
          topic.title = request.title;
        if (request.closed !== undefined)
          topic.closed = request.closed || undefined;
        if (request.hidden !== undefined)
          topic.hidden = request.hidden || undefined;
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [this.entityOf(chat)], date: now(), seq: 0 }));
      }
      case "messages.UpdatePinnedForumTopic": {
        const chat = this.chat(request.peer);
        const topic = (chat.topics ?? []).find((t) => t.id === request.topicId);
        if (!topic)
          throw new Error("TOPIC_ID_INVALID");
        topic.pinned = request.pinned || undefined;
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [this.entityOf(chat)], date: now(), seq: 0 }));
      }
      case "account.GetAuthorizations": {
        return new import_teleproto3.Api.account.Authorizations(args({
          authorizationTtlDays: 180,
          authorizations: [
            new import_teleproto3.Api.Authorization(args({ current: true, officialApp: true, hash: import_big_integer.default(0), deviceModel: "CLI", platform: "Linux", systemVersion: "6.12", apiId: 1, appName: "better-tg-cli", appVersion: "0", dateCreated: now() - 86400, dateActive: now(), ip: "127.0.0.1", country: "Nowhere", region: "" })),
            new import_teleproto3.Api.Authorization(args({ hash: import_big_integer.default(2), deviceModel: "iPhone", platform: "iOS", systemVersion: "18", apiId: 2, appName: "Telegram", appVersion: "11", dateCreated: now() - 30 * 86400, dateActive: now() - 3600, ip: "10.0.0.2", country: "Elsewhere", region: "" }))
          ]
        }));
      }
      case "payments.GetStarsStatus": {
        return new import_teleproto3.Api.payments.StarsStatus(args({ balance: new import_teleproto3.Api.StarsAmount({ amount: import_big_integer.default(this.world.stars ?? 0), nanos: 0 }), history: [], chats: [], users: [] }));
      }
      case "payments.GetStarsTransactions": {
        const tx = (id, stars, title, refund = false) => new import_teleproto3.Api.StarsTransaction(args({
          id,
          amount: new import_teleproto3.Api.StarsAmount({ amount: import_big_integer.default(stars), nanos: 0 }),
          date: now() - 3600,
          title,
          refund: refund || undefined,
          peer: new import_teleproto3.Api.StarsTransactionPeerAppStore
        }));
        return new import_teleproto3.Api.payments.StarsStatus(args({
          balance: new import_teleproto3.Api.StarsAmount({ amount: import_big_integer.default(this.world.stars ?? 0), nanos: 0 }),
          history: [tx("t1", 100, "Top-up"), tx("t2", 25, "Reaction", true)],
          chats: [],
          users: []
        }));
      }
      case "messages.GetExportedChatInvites": {
        const chat = this.chat(request.peer);
        const invites = chat.role ? [new import_teleproto3.Api.ChatInviteExported(args({ link: `https://t.me/+mock${chat.id}`, permanent: true, adminId: import_big_integer.default(this.world.me), date: now() - 86400, usage: 12 }))] : [];
        return new import_teleproto3.Api.messages.ExportedChatInvites(args({ count: invites.length, invites, users: [] }));
      }
      case "messages.GetChatInviteImporters": {
        const chat = this.chat(request.peer);
        const reqs = request.requested ? chat.joinRequests ?? [] : [];
        return new import_teleproto3.Api.messages.ChatInviteImporters(args({
          count: reqs.length,
          importers: reqs.map((r) => new import_teleproto3.Api.ChatInviteImporter(args({ requested: true, userId: import_big_integer.default(r.userId), date: now() - (r.ago ?? 0), about: r.about }))),
          users: reqs.flatMap((r) => {
            const u = this.findUser(r.userId);
            return u ? [this.user(u)] : [];
          })
        }));
      }
      case "messages.GetScheduledHistory": {
        const chat = this.chat(request.peer);
        const list = chat.scheduled ?? [];
        return new import_teleproto3.Api.messages.Messages(args({ messages: list.map((m) => this.message(chat, m)), chats: [], users: [] }));
      }
      case "messages.GetAllDrafts": {
        const drafts = this.world.chats.filter((c) => c.draft);
        return new import_teleproto3.Api.Updates(args({
          updates: drafts.map((c) => new import_teleproto3.Api.UpdateDraftMessage({ peer: this.peerOf(c), draft: new import_teleproto3.Api.DraftMessage({ message: c.draft, date: now() }) })),
          users: this.world.users.map((u) => this.user(u)),
          chats: this.world.chats.filter((c) => c.kind !== "user").map((c) => this.entityOf(c)),
          date: now(),
          seq: 0
        }));
      }
      case "channels.GetAdminLog": {
        const chat = this.chat(request.channel);
        const toAction = (e) => e.action === "title" ? new import_teleproto3.Api.ChannelAdminLogEventActionChangeTitle({ prevValue: e.prev ?? "", newValue: e.now ?? "" }) : e.action === "join" ? new import_teleproto3.Api.ChannelAdminLogEventActionParticipantJoin : new import_teleproto3.Api.ChannelAdminLogEventActionParticipantLeave;
        const events = [...chat.adminLog ?? []].reverse().map((e) => new import_teleproto3.Api.ChannelAdminLogEvent(args({
          id: import_big_integer.default(e.id),
          date: now() - (e.ago ?? 0),
          userId: import_big_integer.default(e.userId),
          action: toAction(e)
        })));
        return new import_teleproto3.Api.channels.AdminLogResults(args({
          events,
          chats: [this.entityOf(chat)],
          users: this.world.users.map((u) => this.user(u))
        }));
      }
      case "photos.GetUserPhotos": {
        const user = this.locate(request.userId).user;
        if (!user)
          throw new Error("USER_ID_INVALID");
        const count = user.profilePhotos ?? 0;
        const photos = Array.from({ length: count }, (_unused, i) => new import_teleproto3.Api.Photo(args({
          id: import_big_integer.default(user.id * 100 + i),
          accessHash: HASH,
          fileReference: Buffer.alloc(0),
          date: now() - i * 86400,
          sizes: [],
          dcId: 1
        })));
        return new import_teleproto3.Api.photos.PhotosSlice(args({ count, photos, users: [this.user(user)] }));
      }
      case "messages.ToggleDialogPin": {
        const chat = this.chat(request.peer);
        if (request.pinned)
          chat.pinnedDialog = true;
        else
          delete chat.pinnedDialog;
        this.save();
        return true;
      }
      case "messages.MarkDialogUnread": {
        const chat = this.chat(request.peer);
        if (request.unread)
          chat.markedUnread = true;
        else
          delete chat.markedUnread;
        this.save();
        return true;
      }
      case "messages.DeleteHistory": {
        const chat = this.chat(request.peer);
        if (request.justClear)
          chat.messages = [];
        else {
          const i = this.world.chats.indexOf(chat);
          if (i >= 0)
            this.world.chats.splice(i, 1);
        }
        this.save();
        return new import_teleproto3.Api.messages.AffectedHistory(args({ pts: 0, ptsCount: 0, offset: 0 }));
      }
      case "channels.LeaveChannel": {
        const chat = this.chat(request.channel);
        const i = this.world.chats.indexOf(chat);
        if (i >= 0)
          this.world.chats.splice(i, 1);
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [], date: now(), seq: 0 }));
      }
      case "folders.EditPeerFolders": {
        for (const item of request.folderPeers ?? []) {
          const chat = this.chat(item.peer);
          if (item.folderId === 1)
            chat.archived = true;
          else
            delete chat.archived;
        }
        this.save();
        return new import_teleproto3.Api.Updates(args({ updates: [], users: [], chats: [], date: now(), seq: 0 }));
      }
      default:
        return notImplemented(`the request ${request.className}`);
    }
  }
  findMessage(peer, id) {
    const m = this.chat(peer).messages.find((x) => x.id === id);
    if (!m)
      throw new Error("MESSAGE_ID_INVALID: no such message");
    return m;
  }
  commonChats(userId) {
    return this.world.chats.filter((c) => c.kind !== "user" && c.members?.some((m) => m.userId === userId)).length;
  }
  getReplies(request) {
    let chat = this.chat(request.peer);
    let rootId = request.msgId;
    if (chat.kind === "channel" && chat.linkedChatId) {
      const post = chat.messages.find((m) => m.id === rootId);
      const discussion = this.chat(import_big_integer.default(`-100${chat.linkedChatId}`));
      const copy = discussion.messages.find((m) => m.forwardedFrom === chat.id && m.text === post?.text);
      if (!copy)
        return { messages: [], chats: [], users: [], count: 0 };
      chat = discussion;
      rootId = copy.id;
    }
    let list = this.newest(chat).filter((m) => m.thread === rootId);
    if (request.offsetId)
      list = list.filter((m) => m.id < request.offsetId);
    if (request.offsetDate)
      list = list.filter((m) => this.date(m) < request.offsetDate);
    if (request.minId)
      list = list.filter((m) => m.id > request.minId);
    return { messages: list.slice(0, request.limit ?? 100).map((m) => this.message(chat, m)), chats: [], users: [], count: list.length };
  }
  search(chats, request) {
    const q = String(request.q ?? "").toLowerCase();
    const from = request.fromId ? this.locate(request.fromId).user?.id : undefined;
    const filter = request.filter?.className ?? "InputMessagesFilterEmpty";
    const kinds = {
      InputMessagesFilterEmpty: () => true,
      InputMessagesFilterPhotos: (m) => m.media?.kind === "photo",
      InputMessagesFilterVideo: (m) => m.media?.kind === "video",
      InputMessagesFilterPhotoVideo: (m) => m.media?.kind === "photo" || m.media?.kind === "video",
      InputMessagesFilterDocument: (m) => m.media?.kind === "document",
      InputMessagesFilterVoice: (m) => m.media?.kind === "voice",
      InputMessagesFilterUrl: (m) => /https?:\/\//.test(m.text)
    };
    const matchesKind = kinds[filter] ?? ((m) => !!m.media);
    const hits = [];
    for (const chat of chats) {
      for (const m of chat.messages) {
        if (q && !m.text.toLowerCase().includes(q))
          continue;
        if (!matchesKind(m))
          continue;
        if (from !== undefined && this.senderId(chat, m) !== from)
          continue;
        const date = this.date(m);
        if (request.minDate && date < request.minDate)
          continue;
        if (request.maxDate && date > request.maxDate)
          continue;
        hits.push({ chat, m });
      }
    }
    hits.sort((a, b) => this.date(b.m) - this.date(a.m));
    const shown = hits.slice(0, request.limit ?? 100);
    const entities = [...new Set(shown.map((h) => h.chat))].map((c) => this.entityOf(c));
    return {
      messages: shown.map((h) => this.message(h.chat, h.m)),
      chats: entities.filter((e) => !(e instanceof import_teleproto3.Api.User)),
      users: entities.filter((e) => e instanceof import_teleproto3.Api.User),
      count: hits.length
    };
  }
  fullChat(chat) {
    const members = chat.members ?? [];
    const participants = members.map((m) => {
      const userId = import_big_integer.default(m.userId);
      if (m.role === "creator")
        return new import_teleproto3.Api.ChatParticipantCreator({ userId });
      if (m.role === "admin")
        return new import_teleproto3.Api.ChatParticipantAdmin({ userId, inviterId: userId, date: 0 });
      return new import_teleproto3.Api.ChatParticipant({ userId, inviterId: userId, date: 0 });
    });
    return {
      fullChat: new import_teleproto3.Api.ChatFull(args({
        id: import_big_integer.default(chat.id),
        about: chat.about ?? "",
        participants: new import_teleproto3.Api.ChatParticipants({ chatId: import_big_integer.default(chat.id), participants, version: 1 }),
        notifySettings: new import_teleproto3.Api.PeerNotifySettings({})
      })),
      chats: [this.entityOf(chat)],
      users: members.flatMap((m) => {
        const u = this.findUser(m.userId);
        return u ? [this.user(u)] : [];
      })
    };
  }
  participants(request) {
    const chat = this.chat(request.channel);
    const filter = request.filter?.className ?? "ChannelParticipantsRecent";
    let members = chat.members ?? [];
    if (filter === "ChannelParticipantsAdmins")
      members = members.filter((m) => m.role);
    if (filter === "ChannelParticipantsSearch" && request.filter.q) {
      const q = String(request.filter.q).toLowerCase();
      members = members.filter((m) => {
        const u = this.findUser(m.userId);
        return !!u && (`${u.firstName} ${u.lastName ?? ""}`.toLowerCase().includes(q) || !!u.username?.toLowerCase().includes(q));
      });
    }
    members = members.slice(request.offset ?? 0, (request.offset ?? 0) + (request.limit ?? 200));
    const rights = new import_teleproto3.Api.ChatAdminRights({ changeInfo: true, deleteMessages: true, banUsers: true, inviteUsers: true, pinMessages: true });
    return new import_teleproto3.Api.channels.ChannelParticipants({
      count: members.length,
      participants: members.map((m) => {
        const userId = import_big_integer.default(m.userId);
        if (m.role === "creator")
          return new import_teleproto3.Api.ChannelParticipantCreator({ userId, adminRights: rights });
        if (m.role === "admin")
          return new import_teleproto3.Api.ChannelParticipantAdmin({ userId, promotedBy: userId, date: 0, adminRights: rights });
        return new import_teleproto3.Api.ChannelParticipant({ userId, date: 0 });
      }),
      chats: [],
      users: members.flatMap((m) => {
        const u = this.findUser(m.userId);
        return u ? [this.user(u)] : [];
      })
    });
  }
  folder(f) {
    const peers = (ids = []) => ids.flatMap((id) => {
      const chat = this.world.chats.find((c) => c.id === id);
      return chat ? [import_teleproto3.utils.getInputPeer(this.entityOf(chat))] : [];
    });
    return new import_teleproto3.Api.DialogFilter(args({
      id: f.id,
      title: new import_teleproto3.Api.TextWithEntities({ text: f.title, entities: [] }),
      emoticon: f.emoticon,
      pinnedPeers: [],
      includePeers: peers(f.include),
      excludePeers: peers(f.exclude)
    }));
  }
  pressButton(request) {
    const chat = this.chat(request.peer);
    const m = this.findMessage(request.peer, request.msgId);
    const data = request.data ? Buffer.from(request.data).toString() : undefined;
    const button = (m.buttons ?? []).flat().find((b) => (b.data ?? b.text) === data);
    if (!button)
      throw new Error("DATA_INVALID: the message has no button with this payload");
    const apply = (target, reply) => {
      target.text = reply.text;
      target.buttons = reply.buttons;
      target.keyboard = reply.keyboard;
      if (!target.buttons)
        delete target.buttons;
      if (!target.keyboard)
        delete target.keyboard;
    };
    const scripted = (value) => {
      if (typeof value !== "string")
        return value;
      const command = this.findUser(chat.id)?.commands?.[value];
      if (!command)
        throw new Error(`mock state: button "${button.text}" points at the command "${value}", which this bot does not have`);
      return command;
    };
    if (button.edit)
      apply(m, scripted(button.edit));
    if (button.reply) {
      const reply = scripted(button.reply);
      this.append(chat, { text: reply.text, buttons: reply.buttons, keyboard: reply.keyboard });
    }
    if (button.edit || button.reply)
      this.save();
    return { message: button.answer, alert: button.alert, url: undefined, cacheTime: 0 };
  }
  async connect() {
    return true;
  }
  async isUserAuthorized() {
    return true;
  }
  async disconnect() {}
  async destroy() {}
  removeEventHandler() {}
  addEventHandler() {
    return notImplemented("live updates (`watch`)");
  }
  uploadFile() {
    return notImplemented("uploadFile (profile photos)");
  }
}
function bannedFlags(rights) {
  if (!rights)
    return [];
  return Object.entries(rights).filter(([k, v]) => v === true && k !== "className").map(([k]) => k);
}
function describe(like) {
  if (typeof like === "string")
    return like;
  if (import_big_integer.default.isInstance(like))
    return like.toString();
  return like?.className ?? String(like);
}
function createMockClient(path2 = mockStatePath()) {
  if (!announced) {
    announced = true;
    process.stderr.write(`MOCK MODE (TG_MOCK): fake account, nothing reaches Telegram
`);
  }
  return new MockClient(loadWorld(path2), (world) => saveWorld(world, path2));
}
var import_teleproto3, import_dialog, import_big_integer, import_node_fs10, import_node_path10, args = (value) => value, now = () => Math.floor(Date.now() / 1000), HASH, announced = false;
var init_client = __esm(() => {
  init_world();
  import_teleproto3 = __toESM(require_teleproto(), 1);
  import_dialog = __toESM(require_dialog(), 1);
  import_big_integer = __toESM(require_BigInteger(), 1);
  import_node_fs10 = require("node:fs");
  import_node_path10 = require("node:path");
  HASH = import_big_integer.default(1);
});

// src/env.ts
delete globalThis.localStorage;

// src/index.ts
var import_node_worker_threads2 = require("node:worker_threads");

// src/text.ts
var import_fs = require("fs");
function errorMessage(error) {
  return error instanceof Error ? error.message : "Unexpected error";
}
var stdinText;
function primeStdin(text) {
  stdinText = text;
}
function readStdinOnce() {
  stdinText ??= import_fs.readFileSync(0, "utf-8");
  return stdinText;
}
function readTextArg(value) {
  if (value !== "-")
    return value;
  const text = readStdinOnce().replace(/\r?\n$/, "");
  if (!text)
    throw new Error("Empty message on stdin");
  return text;
}

// src/version.ts
var VERSION = "0.39.1";

// node_modules/commander/lib/error.js
class CommanderError extends Error {
  constructor(exitCode, code, message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
    this.nestedError = undefined;
  }
}

class InvalidArgumentError extends CommanderError {
  constructor(message) {
    super(1, "commander.invalidArgument", message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

// node_modules/commander/lib/argument.js
class Argument {
  constructor(name, description) {
    this.description = description || "";
    this.variadic = false;
    this.parseArg = undefined;
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.argChoices = undefined;
    switch (name[0]) {
      case "<":
        this.required = true;
        this._name = name.slice(1, -1);
        break;
      case "[":
        this.required = false;
        this._name = name.slice(1, -1);
        break;
      default:
        this.required = true;
        this._name = name;
        break;
    }
    if (this._name.endsWith("...")) {
      this.variadic = true;
      this._name = this._name.slice(0, -3);
    }
  }
  name() {
    return this._name;
  }
  _collectValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }
    previous.push(value);
    return previous;
  }
  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }
  argParser(fn) {
    this.parseArg = fn;
    return this;
  }
  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
      }
      if (this.variadic) {
        return this._collectValue(arg, previous);
      }
      return arg;
    };
    return this;
  }
  argRequired() {
    this.required = true;
    return this;
  }
  argOptional() {
    this.required = false;
    return this;
  }
}
function humanReadableArgName(arg) {
  const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
  return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
}

// node_modules/commander/lib/command.js
var import_node_events = require("node:events");
var import_node_child_process = __toESM(require("node:child_process"));
var import_node_path = __toESM(require("node:path"));
var import_node_fs = __toESM(require("node:fs"));
var import_node_process = __toESM(require("node:process"));
var import_node_util2 = require("node:util");

// node_modules/commander/lib/help.js
var import_node_util = require("node:util");

class Help {
  constructor() {
    this.helpWidth = undefined;
    this.minWidthToWrap = 40;
    this.sortSubcommands = false;
    this.sortOptions = false;
    this.showGlobalOptions = false;
  }
  prepareContext(contextOptions) {
    this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
  }
  visibleCommands(cmd) {
    const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
    const helpCommand = cmd._getHelpCommand();
    if (helpCommand && !helpCommand._hidden) {
      visibleCommands.push(helpCommand);
    }
    if (this.sortSubcommands) {
      visibleCommands.sort((a, b) => {
        return a.name().localeCompare(b.name());
      });
    }
    return visibleCommands;
  }
  compareOptions(a, b) {
    const getSortKey = (option) => {
      return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
    };
    return getSortKey(a).localeCompare(getSortKey(b));
  }
  visibleOptions(cmd) {
    const visibleOptions = cmd.options.filter((option) => !option.hidden);
    const helpOption = cmd._getHelpOption();
    if (helpOption && !helpOption.hidden) {
      const removeShort = helpOption.short && cmd._findOption(helpOption.short);
      const removeLong = helpOption.long && cmd._findOption(helpOption.long);
      if (!removeShort && !removeLong) {
        visibleOptions.push(helpOption);
      } else if (helpOption.long && !removeLong) {
        visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
      } else if (helpOption.short && !removeShort) {
        visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
      }
    }
    if (this.sortOptions) {
      visibleOptions.sort(this.compareOptions);
    }
    return visibleOptions;
  }
  visibleGlobalOptions(cmd) {
    if (!this.showGlobalOptions)
      return [];
    const globalOptions = [];
    for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
      const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
      globalOptions.push(...visibleOptions);
    }
    if (this.sortOptions) {
      globalOptions.sort(this.compareOptions);
    }
    return globalOptions;
  }
  visibleArguments(cmd) {
    if (cmd._argsDescription) {
      cmd.registeredArguments.forEach((argument) => {
        argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
      });
    }
    if (cmd.registeredArguments.find((argument) => argument.description)) {
      return cmd.registeredArguments;
    }
    return [];
  }
  subcommandTerm(cmd) {
    const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
    return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
  }
  optionTerm(option) {
    return option.flags;
  }
  argumentTerm(argument) {
    return argument.name();
  }
  longestSubcommandTermLength(cmd, helper) {
    return helper.visibleCommands(cmd).reduce((max, command) => {
      return Math.max(max, this.displayWidth(helper.styleSubcommandTerm(helper.subcommandTerm(command))));
    }, 0);
  }
  longestOptionTermLength(cmd, helper) {
    return helper.visibleOptions(cmd).reduce((max, option) => {
      return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
    }, 0);
  }
  longestGlobalOptionTermLength(cmd, helper) {
    return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
      return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
    }, 0);
  }
  longestArgumentTermLength(cmd, helper) {
    return helper.visibleArguments(cmd).reduce((max, argument) => {
      return Math.max(max, this.displayWidth(helper.styleArgumentTerm(helper.argumentTerm(argument))));
    }, 0);
  }
  commandUsage(cmd) {
    let cmdName = cmd._name;
    if (cmd._aliases[0]) {
      cmdName = cmdName + "|" + cmd._aliases[0];
    }
    let ancestorCmdNames = "";
    for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
      ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
    }
    return ancestorCmdNames + cmdName + " " + cmd.usage();
  }
  commandDescription(cmd) {
    return cmd.description();
  }
  subcommandDescription(cmd) {
    return cmd.summary() || cmd.description();
  }
  optionDescription(option) {
    const extraInfo = [];
    if (option.argChoices) {
      extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
    }
    if (option.defaultValue !== undefined) {
      const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
      if (showDefault) {
        extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
      }
    }
    if (option.presetArg !== undefined && option.optional) {
      extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
    }
    if (option.envVar !== undefined) {
      extraInfo.push(`env: ${option.envVar}`);
    }
    if (extraInfo.length > 0) {
      const extraDescription = `(${extraInfo.join(", ")})`;
      if (option.description) {
        return `${option.description} ${extraDescription}`;
      }
      return extraDescription;
    }
    return option.description;
  }
  argumentDescription(argument) {
    const extraInfo = [];
    if (argument.argChoices) {
      extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
    }
    if (argument.defaultValue !== undefined) {
      extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
    }
    if (extraInfo.length > 0) {
      const extraDescription = `(${extraInfo.join(", ")})`;
      if (argument.description) {
        return `${argument.description} ${extraDescription}`;
      }
      return extraDescription;
    }
    return argument.description;
  }
  formatItemList(heading, items, helper) {
    if (items.length === 0)
      return [];
    return [helper.styleTitle(heading), ...items, ""];
  }
  groupItems(unsortedItems, visibleItems, getGroup) {
    const result = new Map;
    unsortedItems.forEach((item) => {
      const group = getGroup(item);
      if (!result.has(group))
        result.set(group, []);
    });
    visibleItems.forEach((item) => {
      const group = getGroup(item);
      if (!result.has(group)) {
        result.set(group, []);
      }
      result.get(group).push(item);
    });
    return result;
  }
  formatHelp(cmd, helper) {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth ?? 80;
    function callFormatItem(term, description) {
      return helper.formatItem(term, termWidth, description, helper);
    }
    let output = [
      `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
      ""
    ];
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output = output.concat([
        helper.boxWrap(helper.styleCommandDescription(commandDescription), helpWidth),
        ""
      ]);
    }
    const argumentList = helper.visibleArguments(cmd).map((argument) => {
      return callFormatItem(helper.styleArgumentTerm(helper.argumentTerm(argument)), helper.styleArgumentDescription(helper.argumentDescription(argument)));
    });
    output = output.concat(this.formatItemList("Arguments:", argumentList, helper));
    const optionGroups = this.groupItems(cmd.options, helper.visibleOptions(cmd), (option) => option.helpGroupHeading ?? "Options:");
    optionGroups.forEach((options, group) => {
      const optionList = options.map((option) => {
        return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
      });
      output = output.concat(this.formatItemList(group, optionList, helper));
    });
    if (helper.showGlobalOptions) {
      const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
        return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
      });
      output = output.concat(this.formatItemList("Global Options:", globalOptionList, helper));
    }
    const commandGroups = this.groupItems(cmd.commands, helper.visibleCommands(cmd), (sub) => sub.helpGroup() || "Commands:");
    commandGroups.forEach((commands, group) => {
      const commandList = commands.map((sub) => {
        return callFormatItem(helper.styleSubcommandTerm(helper.subcommandTerm(sub)), helper.styleSubcommandDescription(helper.subcommandDescription(sub)));
      });
      output = output.concat(this.formatItemList(group, commandList, helper));
    });
    return output.join(`
`);
  }
  displayWidth(str) {
    return import_node_util.stripVTControlCharacters(str).length;
  }
  styleTitle(str) {
    return str;
  }
  styleUsage(str) {
    return str.split(" ").map((word) => {
      if (word === "[options]")
        return this.styleOptionText(word);
      if (word === "[command]")
        return this.styleSubcommandText(word);
      if (word[0] === "[" || word[0] === "<")
        return this.styleArgumentText(word);
      return this.styleCommandText(word);
    }).join(" ");
  }
  styleCommandDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleOptionDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleSubcommandDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleArgumentDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleDescriptionText(str) {
    return str;
  }
  styleOptionTerm(str) {
    return this.styleOptionText(str);
  }
  styleSubcommandTerm(str) {
    return str.split(" ").map((word) => {
      if (word === "[options]")
        return this.styleOptionText(word);
      if (word[0] === "[" || word[0] === "<")
        return this.styleArgumentText(word);
      return this.styleSubcommandText(word);
    }).join(" ");
  }
  styleArgumentTerm(str) {
    return this.styleArgumentText(str);
  }
  styleOptionText(str) {
    return str;
  }
  styleArgumentText(str) {
    return str;
  }
  styleSubcommandText(str) {
    return str;
  }
  styleCommandText(str) {
    return str;
  }
  padWidth(cmd, helper) {
    return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
  }
  preformatted(str) {
    return /\n[^\S\r\n]/.test(str);
  }
  formatItem(term, termWidth, description, helper) {
    const itemIndent = 2;
    const itemIndentStr = " ".repeat(itemIndent);
    if (!description)
      return itemIndentStr + term;
    const paddedTerm = term.padEnd(termWidth + term.length - helper.displayWidth(term));
    const spacerWidth = 2;
    const helpWidth = this.helpWidth ?? 80;
    const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
    let formattedDescription;
    if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
      formattedDescription = description;
    } else {
      const wrappedDescription = helper.boxWrap(description, remainingWidth);
      formattedDescription = wrappedDescription.replace(/\n/g, `
` + " ".repeat(termWidth + spacerWidth));
    }
    return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
  }
  boxWrap(str, width) {
    if (width < this.minWidthToWrap)
      return str;
    const rawLines = str.split(/\r\n|\n/);
    const chunkPattern = /[\s]*[^\s]+/g;
    const wrappedLines = [];
    rawLines.forEach((line) => {
      const chunks = line.match(chunkPattern);
      if (chunks === null) {
        wrappedLines.push("");
        return;
      }
      let sumChunks = [chunks.shift()];
      let sumWidth = this.displayWidth(sumChunks[0]);
      chunks.forEach((chunk) => {
        const visibleWidth = this.displayWidth(chunk);
        if (sumWidth + visibleWidth <= width) {
          sumChunks.push(chunk);
          sumWidth += visibleWidth;
          return;
        }
        wrappedLines.push(sumChunks.join(""));
        const nextChunk = chunk.trimStart();
        sumChunks = [nextChunk];
        sumWidth = this.displayWidth(nextChunk);
      });
      wrappedLines.push(sumChunks.join(""));
    });
    return wrappedLines.join(`
`);
  }
}

// node_modules/commander/lib/option.js
class Option {
  constructor(flags, description) {
    this.flags = flags;
    this.description = description || "";
    this.required = flags.includes("<");
    this.optional = flags.includes("[");
    this.variadic = /\w\.\.\.[>\]]$/.test(flags);
    this.mandatory = false;
    const optionFlags = splitOptionFlags(flags);
    this.short = optionFlags.shortFlag;
    this.long = optionFlags.longFlag;
    this.negate = false;
    if (this.long) {
      this.negate = this.long.startsWith("--no-");
    }
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.presetArg = undefined;
    this.envVar = undefined;
    this.parseArg = undefined;
    this.hidden = false;
    this.argChoices = undefined;
    this.conflictsWith = [];
    this.implied = undefined;
    this.helpGroupHeading = undefined;
  }
  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }
  preset(arg) {
    this.presetArg = arg;
    return this;
  }
  conflicts(names) {
    this.conflictsWith = this.conflictsWith.concat(names);
    return this;
  }
  implies(impliedOptionValues) {
    let newImplied = impliedOptionValues;
    if (typeof impliedOptionValues === "string") {
      newImplied = { [impliedOptionValues]: true };
    }
    this.implied = Object.assign(this.implied || {}, newImplied);
    return this;
  }
  env(name) {
    this.envVar = name;
    return this;
  }
  argParser(fn) {
    this.parseArg = fn;
    return this;
  }
  makeOptionMandatory(mandatory = true) {
    this.mandatory = !!mandatory;
    return this;
  }
  hideHelp(hide = true) {
    this.hidden = !!hide;
    return this;
  }
  _collectValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }
    previous.push(value);
    return previous;
  }
  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
      }
      if (this.variadic) {
        return this._collectValue(arg, previous);
      }
      return arg;
    };
    return this;
  }
  name() {
    if (this.long) {
      return this.long.replace(/^--/, "");
    }
    return this.short.replace(/^-/, "");
  }
  attributeName() {
    if (this.negate) {
      return camelcase(this.name().replace(/^no-/, ""));
    }
    return camelcase(this.name());
  }
  helpGroup(heading) {
    this.helpGroupHeading = heading;
    return this;
  }
  is(arg) {
    return this.short === arg || this.long === arg;
  }
  isBoolean() {
    return !this.required && !this.optional && !this.negate;
  }
}

class DualOptions {
  constructor(options) {
    this.positiveOptions = new Map;
    this.negativeOptions = new Map;
    this.dualOptions = new Set;
    options.forEach((option) => {
      if (option.negate) {
        this.negativeOptions.set(option.attributeName(), option);
      } else {
        this.positiveOptions.set(option.attributeName(), option);
      }
    });
    this.negativeOptions.forEach((value, key) => {
      if (this.positiveOptions.has(key)) {
        this.dualOptions.add(key);
      }
    });
  }
  valueFromOption(value, option) {
    const optionKey = option.attributeName();
    if (!this.dualOptions.has(optionKey))
      return true;
    const preset = this.negativeOptions.get(optionKey).presetArg;
    const negativeValue = preset !== undefined ? preset : false;
    return option.negate === (negativeValue === value);
  }
}
function camelcase(str) {
  return str.split("-").reduce((str2, word) => {
    return str2 + word[0].toUpperCase() + word.slice(1);
  });
}
function splitOptionFlags(flags) {
  let shortFlag;
  let longFlag;
  const shortFlagExp = /^-[^-]$/;
  const longFlagExp = /^--[^-]/;
  const flagParts = flags.split(/[ |,]+/).concat("guard");
  if (shortFlagExp.test(flagParts[0]))
    shortFlag = flagParts.shift();
  if (longFlagExp.test(flagParts[0]))
    longFlag = flagParts.shift();
  if (!shortFlag && shortFlagExp.test(flagParts[0]))
    shortFlag = flagParts.shift();
  if (!shortFlag && longFlagExp.test(flagParts[0])) {
    shortFlag = longFlag;
    longFlag = flagParts.shift();
  }
  if (flagParts[0].startsWith("-")) {
    const unsupportedFlag = flagParts[0];
    const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
    if (/^-[^-][^-]/.test(unsupportedFlag))
      throw new Error(`${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`);
    if (shortFlagExp.test(unsupportedFlag))
      throw new Error(`${baseError}
- too many short flags`);
    if (longFlagExp.test(unsupportedFlag))
      throw new Error(`${baseError}
- too many long flags`);
    throw new Error(`${baseError}
- unrecognised flag format`);
  }
  if (shortFlag === undefined && longFlag === undefined)
    throw new Error(`option creation failed due to no flags found in '${flags}'.`);
  return { shortFlag, longFlag };
}

// node_modules/commander/lib/suggestSimilar.js
var maxDistance = 3;
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > maxDistance)
    return Math.max(a.length, b.length);
  const d = [];
  for (let i = 0;i <= a.length; i++) {
    d[i] = [i];
  }
  for (let j = 0;j <= b.length; j++) {
    d[0][j] = j;
  }
  for (let j = 1;j <= b.length; j++) {
    for (let i = 1;i <= a.length; i++) {
      let cost;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
      } else {
        cost = 1;
      }
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}
function suggestSimilar(word, candidates) {
  if (!candidates || candidates.length === 0)
    return "";
  candidates = Array.from(new Set(candidates));
  const searchingOptions = word.startsWith("--");
  if (searchingOptions) {
    word = word.slice(2);
    candidates = candidates.map((candidate) => candidate.slice(2));
  }
  let similar = [];
  let bestDistance = maxDistance;
  const minSimilarity = 0.4;
  candidates.forEach((candidate) => {
    if (candidate.length <= 1)
      return;
    const distance = editDistance(word, candidate);
    const length = Math.max(word.length, candidate.length);
    const similarity = (length - distance) / length;
    if (similarity > minSimilarity) {
      if (distance < bestDistance) {
        bestDistance = distance;
        similar = [candidate];
      } else if (distance === bestDistance) {
        similar.push(candidate);
      }
    }
  });
  similar.sort((a, b) => a.localeCompare(b));
  if (searchingOptions) {
    similar = similar.map((candidate) => `--${candidate}`);
  }
  if (similar.length > 1) {
    return `
(Did you mean one of ${similar.join(", ")}?)`;
  }
  if (similar.length === 1) {
    return `
(Did you mean ${similar[0]}?)`;
  }
  return "";
}

// node_modules/commander/lib/command.js
class Command extends import_node_events.EventEmitter {
  constructor(name) {
    super();
    this.commands = [];
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = false;
    this.registeredArguments = [];
    this._args = this.registeredArguments;
    this.args = [];
    this.rawArgs = [];
    this.processedArgs = [];
    this._scriptPath = null;
    this._name = name || "";
    this._optionValues = {};
    this._optionValueSources = {};
    this._storeOptionsAsProperties = false;
    this._actionHandler = null;
    this._executableHandler = false;
    this._executableFile = null;
    this._executableDir = null;
    this._defaultCommandName = null;
    this._exitCallback = null;
    this._aliases = [];
    this._combineFlagAndOptionalValue = true;
    this._description = "";
    this._summary = "";
    this._argsDescription = undefined;
    this._enablePositionalOptions = false;
    this._passThroughOptions = false;
    this._lifeCycleHooks = {};
    this._showHelpAfterError = false;
    this._showSuggestionAfterError = true;
    this._savedState = null;
    this._outputConfiguration = {
      writeOut: (str) => import_node_process.default.stdout.write(str),
      writeErr: (str) => import_node_process.default.stderr.write(str),
      outputError: (str, write) => write(str),
      getOutHelpWidth: () => import_node_process.default.stdout.isTTY ? import_node_process.default.stdout.columns : undefined,
      getErrHelpWidth: () => import_node_process.default.stderr.isTTY ? import_node_process.default.stderr.columns : undefined,
      getOutHasColors: () => useColor() ?? (import_node_process.default.stdout.isTTY && import_node_process.default.stdout.hasColors?.()),
      getErrHasColors: () => useColor() ?? (import_node_process.default.stderr.isTTY && import_node_process.default.stderr.hasColors?.()),
      stripColor: (str) => import_node_util2.stripVTControlCharacters(str)
    };
    this._hidden = false;
    this._helpOption = undefined;
    this._addImplicitHelpCommand = undefined;
    this._helpCommand = undefined;
    this._helpConfiguration = {};
    this._helpGroupHeading = undefined;
    this._defaultCommandGroup = undefined;
    this._defaultOptionGroup = undefined;
  }
  copyInheritedSettings(sourceCommand) {
    this._outputConfiguration = sourceCommand._outputConfiguration;
    this._helpOption = sourceCommand._helpOption;
    this._helpCommand = sourceCommand._helpCommand;
    this._helpConfiguration = sourceCommand._helpConfiguration;
    this._exitCallback = sourceCommand._exitCallback;
    this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
    this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
    this._allowExcessArguments = sourceCommand._allowExcessArguments;
    this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
    this._showHelpAfterError = sourceCommand._showHelpAfterError;
    this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
    return this;
  }
  _getCommandAndAncestors() {
    const result = [];
    for (let command = this;command; command = command.parent) {
      result.push(command);
    }
    return result;
  }
  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === "object" && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
    const cmd = this.createCommand(name);
    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault)
      this._defaultCommandName = cmd._name;
    cmd._hidden = !!(opts.noHelp || opts.hidden);
    cmd._executableFile = opts.executableFile || null;
    if (args)
      cmd.arguments(args);
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd.copyInheritedSettings(this);
    if (desc)
      return this;
    return cmd;
  }
  createCommand(name) {
    return new Command(name);
  }
  createHelp() {
    return Object.assign(new Help, this.configureHelp());
  }
  configureHelp(configuration) {
    if (configuration === undefined)
      return this._helpConfiguration;
    this._helpConfiguration = configuration;
    return this;
  }
  configureOutput(configuration) {
    if (configuration === undefined)
      return this._outputConfiguration;
    this._outputConfiguration = {
      ...this._outputConfiguration,
      ...configuration
    };
    return this;
  }
  showHelpAfterError(displayHelp = true) {
    if (typeof displayHelp !== "string")
      displayHelp = !!displayHelp;
    this._showHelpAfterError = displayHelp;
    return this;
  }
  showSuggestionAfterError(displaySuggestion = true) {
    this._showSuggestionAfterError = !!displaySuggestion;
    return this;
  }
  addCommand(cmd, opts) {
    if (!cmd._name) {
      throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
    }
    opts = opts || {};
    if (opts.isDefault)
      this._defaultCommandName = cmd._name;
    if (opts.noHelp || opts.hidden)
      cmd._hidden = true;
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd._checkForBrokenPassThrough();
    return this;
  }
  createArgument(name, description) {
    return new Argument(name, description);
  }
  argument(name, description, parseArg, defaultValue) {
    const argument = this.createArgument(name, description);
    if (typeof parseArg === "function") {
      argument.default(defaultValue).argParser(parseArg);
    } else {
      argument.default(parseArg);
    }
    this.addArgument(argument);
    return this;
  }
  arguments(names) {
    names.trim().split(/ +/).forEach((detail) => {
      this.argument(detail);
    });
    return this;
  }
  addArgument(argument) {
    const previousArgument = this.registeredArguments.slice(-1)[0];
    if (previousArgument?.variadic) {
      throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
    }
    if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
      throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
    }
    this.registeredArguments.push(argument);
    return this;
  }
  helpCommand(enableOrNameAndArgs, description) {
    if (typeof enableOrNameAndArgs === "boolean") {
      this._addImplicitHelpCommand = enableOrNameAndArgs;
      if (enableOrNameAndArgs && this._defaultCommandGroup) {
        this._initCommandGroup(this._getHelpCommand());
      }
      return this;
    }
    const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
    const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
    const helpDescription = description ?? "display help for command";
    const helpCommand = this.createCommand(helpName);
    helpCommand.helpOption(false);
    if (helpArgs)
      helpCommand.arguments(helpArgs);
    if (helpDescription)
      helpCommand.description(helpDescription);
    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    if (enableOrNameAndArgs || description)
      this._initCommandGroup(helpCommand);
    return this;
  }
  addHelpCommand(helpCommand, deprecatedDescription) {
    if (typeof helpCommand !== "object") {
      this.helpCommand(helpCommand, deprecatedDescription);
      return this;
    }
    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    this._initCommandGroup(helpCommand);
    return this;
  }
  _getHelpCommand() {
    const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
    if (hasImplicitHelpCommand) {
      if (this._helpCommand === undefined) {
        this.helpCommand(undefined, undefined);
      }
      return this._helpCommand;
    }
    return null;
  }
  hook(event, listener) {
    const allowedValues = ["preSubcommand", "preAction", "postAction"];
    if (!allowedValues.includes(event)) {
      throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    if (this._lifeCycleHooks[event]) {
      this._lifeCycleHooks[event].push(listener);
    } else {
      this._lifeCycleHooks[event] = [listener];
    }
    return this;
  }
  exitOverride(fn) {
    if (fn) {
      this._exitCallback = fn;
    } else {
      this._exitCallback = (err) => {
        if (err.code !== "commander.executeSubCommandAsync") {
          throw err;
        } else {}
      };
    }
    return this;
  }
  _exit(exitCode, code, message) {
    if (this._exitCallback) {
      this._exitCallback(new CommanderError(exitCode, code, message));
    }
    import_node_process.default.exit(exitCode);
  }
  action(fn) {
    const listener = (args) => {
      const expectedArgsCount = this.registeredArguments.length;
      const actionArgs = args.slice(0, expectedArgsCount);
      if (this._storeOptionsAsProperties) {
        actionArgs[expectedArgsCount] = this;
      } else {
        actionArgs[expectedArgsCount] = this.opts();
      }
      actionArgs.push(this);
      return fn.apply(this, actionArgs);
    };
    this._actionHandler = listener;
    return this;
  }
  createOption(flags, description) {
    return new Option(flags, description);
  }
  _callParseArg(target, value, previous, invalidArgumentMessage) {
    try {
      return target.parseArg(value, previous);
    } catch (err) {
      if (err.code === "commander.invalidArgument") {
        const message = `${invalidArgumentMessage} ${err.message}`;
        this.error(message, { exitCode: err.exitCode, code: err.code });
      }
      throw err;
    }
  }
  _registerOption(option) {
    const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
    if (matchingOption) {
      const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
      throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
    }
    this._initOptionGroup(option);
    this.options.push(option);
  }
  _registerCommand(command) {
    const knownBy = (cmd) => {
      return [cmd.name()].concat(cmd.aliases());
    };
    const alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
    if (alreadyUsed) {
      const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
      const newCmd = knownBy(command).join("|");
      throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
    }
    this._initCommandGroup(command);
    this.commands.push(command);
  }
  addOption(option) {
    this._registerOption(option);
    const oname = option.name();
    const name = option.attributeName();
    if (option.defaultValue !== undefined) {
      this.setOptionValueWithSource(name, option.defaultValue, "default");
    }
    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
      if (val == null && option.presetArg !== undefined) {
        val = option.presetArg;
      }
      const oldValue = this.getOptionValue(name);
      if (val !== null && option.parseArg) {
        val = this._callParseArg(option, val, oldValue, invalidValueMessage);
      } else if (val !== null && option.variadic) {
        val = option._collectValue(val, oldValue);
      }
      if (val == null) {
        if (option.negate) {
          val = false;
        } else if (option.isBoolean() || option.optional) {
          val = true;
        } else {
          val = "";
        }
      }
      this.setOptionValueWithSource(name, val, valueSource);
    };
    this.on("option:" + oname, (val) => {
      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
      handleOptionValue(val, invalidValueMessage, "cli");
    });
    if (option.envVar) {
      this.on("optionEnv:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "env");
      });
    }
    return this;
  }
  _optionEx(config, flags, description, fn, defaultValue) {
    if (typeof flags === "object" && flags instanceof Option) {
      throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
    }
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === "function") {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }
    return this.addOption(option);
  }
  option(flags, description, parseArg, defaultValue) {
    return this._optionEx({}, flags, description, parseArg, defaultValue);
  }
  requiredOption(flags, description, parseArg, defaultValue) {
    return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
  }
  combineFlagAndOptionalValue(combine = true) {
    this._combineFlagAndOptionalValue = !!combine;
    return this;
  }
  allowUnknownOption(allowUnknown = true) {
    this._allowUnknownOption = !!allowUnknown;
    return this;
  }
  allowExcessArguments(allowExcess = true) {
    this._allowExcessArguments = !!allowExcess;
    return this;
  }
  enablePositionalOptions(positional = true) {
    this._enablePositionalOptions = !!positional;
    return this;
  }
  passThroughOptions(passThrough = true) {
    this._passThroughOptions = !!passThrough;
    this._checkForBrokenPassThrough();
    return this;
  }
  _checkForBrokenPassThrough() {
    if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
      throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
    }
  }
  storeOptionsAsProperties(storeAsProperties = true) {
    if (this.options.length) {
      throw new Error("call .storeOptionsAsProperties() before adding options");
    }
    if (Object.keys(this._optionValues).length) {
      throw new Error("call .storeOptionsAsProperties() before setting option values");
    }
    this._storeOptionsAsProperties = !!storeAsProperties;
    return this;
  }
  getOptionValue(key) {
    if (this._storeOptionsAsProperties) {
      return this[key];
    }
    return this._optionValues[key];
  }
  setOptionValue(key, value) {
    return this.setOptionValueWithSource(key, value, undefined);
  }
  setOptionValueWithSource(key, value, source) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
    this._optionValueSources[key] = source;
    return this;
  }
  getOptionValueSource(key) {
    return this._optionValueSources[key];
  }
  getOptionValueSourceWithGlobals(key) {
    let source;
    this._getCommandAndAncestors().forEach((cmd) => {
      if (cmd.getOptionValueSource(key) !== undefined) {
        source = cmd.getOptionValueSource(key);
      }
    });
    return source;
  }
  _prepareUserArgs(argv, parseOptions) {
    if (argv !== undefined && !Array.isArray(argv)) {
      throw new Error("first parameter to parse must be array or undefined");
    }
    parseOptions = parseOptions || {};
    if (argv === undefined && parseOptions.from === undefined) {
      if (import_node_process.default.versions?.electron) {
        parseOptions.from = "electron";
      }
      const execArgv = import_node_process.default.execArgv ?? [];
      if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
        parseOptions.from = "eval";
      }
    }
    if (argv === undefined) {
      argv = import_node_process.default.argv;
    }
    this.rawArgs = argv.slice();
    let userArgs;
    switch (parseOptions.from) {
      case undefined:
      case "node":
        this._scriptPath = argv[1];
        userArgs = argv.slice(2);
        break;
      case "electron":
        if (import_node_process.default.defaultApp) {
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
        } else {
          userArgs = argv.slice(1);
        }
        break;
      case "user":
        userArgs = argv.slice(0);
        break;
      case "eval":
        userArgs = argv.slice(1);
        break;
      default:
        throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
    }
    if (!this._name && this._scriptPath)
      this.nameFromFilename(this._scriptPath);
    this._name = this._name || "program";
    return userArgs;
  }
  parse(argv, parseOptions) {
    this._prepareForParse();
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    this._parseCommand([], userArgs);
    return this;
  }
  async parseAsync(argv, parseOptions) {
    this._prepareForParse();
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    await this._parseCommand([], userArgs);
    return this;
  }
  _prepareForParse() {
    if (this._savedState === null) {
      this.options.filter((option) => option.negate && option.defaultValue === undefined && this.getOptionValue(option.attributeName()) === undefined).forEach((option) => {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(option.attributeName(), true, "default");
        }
      });
      this.saveStateBeforeParse();
    } else {
      this.restoreStateBeforeParse();
    }
  }
  saveStateBeforeParse() {
    this._savedState = {
      _name: this._name,
      _optionValues: { ...this._optionValues },
      _optionValueSources: { ...this._optionValueSources }
    };
  }
  restoreStateBeforeParse() {
    if (this._storeOptionsAsProperties)
      throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
    this._name = this._savedState._name;
    this._scriptPath = null;
    this.rawArgs = [];
    this._optionValues = { ...this._savedState._optionValues };
    this._optionValueSources = { ...this._savedState._optionValueSources };
    this.args = [];
    this.processedArgs = [];
  }
  _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
    if (import_node_fs.default.existsSync(executableFile))
      return;
    const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
    const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
    throw new Error(executableMissing);
  }
  _executeSubCommand(subcommand, args) {
    args = args.slice();
    const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
    function findFile(baseDir, baseName) {
      const localBin = import_node_path.default.resolve(baseDir, baseName);
      if (import_node_fs.default.existsSync(localBin))
        return localBin;
      if (sourceExt.includes(import_node_path.default.extname(baseName)))
        return;
      const foundExt = sourceExt.find((ext) => import_node_fs.default.existsSync(`${localBin}${ext}`));
      if (foundExt)
        return `${localBin}${foundExt}`;
      return;
    }
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();
    let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
    let executableDir = this._executableDir || "";
    if (this._scriptPath) {
      let resolvedScriptPath;
      try {
        resolvedScriptPath = import_node_fs.default.realpathSync(this._scriptPath);
      } catch {
        resolvedScriptPath = this._scriptPath;
      }
      executableDir = import_node_path.default.resolve(import_node_path.default.dirname(resolvedScriptPath), executableDir);
    }
    if (executableDir) {
      let localFile = findFile(executableDir, executableFile);
      if (!localFile && !subcommand._executableFile && this._scriptPath) {
        const legacyName = import_node_path.default.basename(this._scriptPath, import_node_path.default.extname(this._scriptPath));
        if (legacyName !== this._name) {
          localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
        }
      }
      executableFile = localFile || executableFile;
    }
    const launchWithNode = sourceExt.includes(import_node_path.default.extname(executableFile));
    let proc;
    if (import_node_process.default.platform !== "win32") {
      if (launchWithNode) {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(import_node_process.default.execArgv).concat(args);
        proc = import_node_child_process.default.spawn(import_node_process.default.argv[0], args, { stdio: "inherit" });
      } else {
        proc = import_node_child_process.default.spawn(executableFile, args, { stdio: "inherit" });
      }
    } else {
      this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
      args.unshift(executableFile);
      args = incrementNodeInspectorPort(import_node_process.default.execArgv).concat(args);
      proc = import_node_child_process.default.spawn(import_node_process.default.execPath, args, { stdio: "inherit" });
    }
    if (!proc.killed) {
      const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
      signals.forEach((signal) => {
        import_node_process.default.on(signal, () => {
          if (proc.killed === false && proc.exitCode === null) {
            proc.kill(signal);
          }
        });
      });
    }
    const exitCallback = this._exitCallback;
    proc.on("close", (code) => {
      code = code ?? 1;
      if (!exitCallback) {
        import_node_process.default.exit(code);
      } else {
        exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
      }
    });
    proc.on("error", (err) => {
      if (err.code === "ENOENT") {
        this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
      } else if (err.code === "EACCES") {
        throw new Error(`'${executableFile}' not executable`);
      }
      if (!exitCallback) {
        import_node_process.default.exit(1);
      } else {
        const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
        wrappedError.nestedError = err;
        exitCallback(wrappedError);
      }
    });
    this.runningCommand = proc;
  }
  _dispatchSubcommand(commandName, operands, unknown) {
    const subCommand = this._findCommand(commandName);
    if (!subCommand)
      this.help({ error: true });
    subCommand._prepareForParse();
    let promiseChain;
    promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
    promiseChain = this._chainOrCall(promiseChain, () => {
      if (subCommand._executableHandler) {
        this._executeSubCommand(subCommand, operands.concat(unknown));
      } else {
        return subCommand._parseCommand(operands, unknown);
      }
    });
    return promiseChain;
  }
  _dispatchHelpCommand(subcommandName) {
    if (!subcommandName) {
      this.help();
    }
    const subCommand = this._findCommand(subcommandName);
    if (subCommand && !subCommand._executableHandler) {
      subCommand.help();
    }
    return this._dispatchSubcommand(subcommandName, [], [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]);
  }
  _checkNumberOfArguments() {
    this.registeredArguments.forEach((arg, i) => {
      if (arg.required && this.args[i] == null) {
        this.missingArgument(arg.name());
      }
    });
    if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
      return;
    }
    if (this.args.length > this.registeredArguments.length) {
      this._excessArguments(this.args);
    }
  }
  _processArguments() {
    const myParseArg = (argument, value, previous) => {
      let parsedValue = value;
      if (value !== null && argument.parseArg) {
        const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
        parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
      }
      return parsedValue;
    };
    this._checkNumberOfArguments();
    const processedArgs = [];
    this.registeredArguments.forEach((declaredArg, index) => {
      let value = declaredArg.defaultValue;
      if (declaredArg.variadic) {
        if (index < this.args.length) {
          value = this.args.slice(index);
          if (declaredArg.parseArg) {
            value = value.reduce((processed, v) => {
              return myParseArg(declaredArg, v, processed);
            }, declaredArg.defaultValue);
          }
        } else if (value === undefined) {
          value = [];
        }
      } else if (index < this.args.length) {
        value = this.args[index];
        if (declaredArg.parseArg) {
          value = myParseArg(declaredArg, value, declaredArg.defaultValue);
        }
      }
      processedArgs[index] = value;
    });
    this.processedArgs = processedArgs;
  }
  _chainOrCall(promise, fn) {
    if (promise?.then && typeof promise.then === "function") {
      return promise.then(() => fn());
    }
    return fn();
  }
  _chainOrCallHooks(promise, event) {
    let result = promise;
    const hooks = [];
    this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== undefined).forEach((hookedCommand) => {
      hookedCommand._lifeCycleHooks[event].forEach((callback) => {
        hooks.push({ hookedCommand, callback });
      });
    });
    if (event === "postAction") {
      hooks.reverse();
    }
    hooks.forEach((hookDetail) => {
      result = this._chainOrCall(result, () => {
        return hookDetail.callback(hookDetail.hookedCommand, this);
      });
    });
    return result;
  }
  _chainOrCallSubCommandHook(promise, subCommand, event) {
    let result = promise;
    if (this._lifeCycleHooks[event] !== undefined) {
      this._lifeCycleHooks[event].forEach((hook) => {
        result = this._chainOrCall(result, () => {
          return hook(this, subCommand);
        });
      });
    }
    return result;
  }
  _parseCommand(operands, unknown) {
    const parsed = this.parseOptions(unknown);
    this._parseOptionsEnv();
    this._parseOptionsImplied();
    operands = operands.concat(parsed.operands);
    unknown = parsed.unknown;
    this.args = operands.concat(unknown);
    if (operands && this._findCommand(operands[0])) {
      return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
    }
    if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
      return this._dispatchHelpCommand(operands[1]);
    }
    if (this._defaultCommandName) {
      this._outputHelpIfRequested(unknown);
      return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
    }
    if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
      this.help({ error: true });
    }
    this._outputHelpIfRequested(parsed.unknown);
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();
    const checkForUnknownOptions = () => {
      if (parsed.unknown.length > 0) {
        this.unknownOption(parsed.unknown[0]);
      }
    };
    const commandEvent = `command:${this.name()}`;
    if (this._actionHandler) {
      checkForUnknownOptions();
      this._processArguments();
      let promiseChain;
      promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
      promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
      if (this.parent) {
        promiseChain = this._chainOrCall(promiseChain, () => {
          this.parent.emit(commandEvent, operands, unknown);
        });
      }
      promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
      return promiseChain;
    }
    if (this.parent?.listenerCount(commandEvent)) {
      checkForUnknownOptions();
      this._processArguments();
      this.parent.emit(commandEvent, operands, unknown);
    } else if (operands.length) {
      if (this._findCommand("*")) {
        return this._dispatchSubcommand("*", operands, unknown);
      }
      if (this.listenerCount("command:*")) {
        this.emit("command:*", operands, unknown);
      } else if (this.commands.length) {
        this.unknownCommand();
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    } else if (this.commands.length) {
      checkForUnknownOptions();
      this.help({ error: true });
    } else {
      checkForUnknownOptions();
      this._processArguments();
    }
  }
  _findCommand(name) {
    if (!name)
      return;
    return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
  }
  _findOption(arg) {
    return this.options.find((option) => option.is(arg));
  }
  _checkForMissingMandatoryOptions() {
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd.options.forEach((anOption) => {
        if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined) {
          cmd.missingMandatoryOptionValue(anOption);
        }
      });
    });
  }
  _checkForConflictingLocalOptions() {
    const definedNonDefaultOptions = this.options.filter((option) => {
      const optionKey = option.attributeName();
      if (this.getOptionValue(optionKey) === undefined) {
        return false;
      }
      return this.getOptionValueSource(optionKey) !== "default";
    });
    const optionsWithConflicting = definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0);
    optionsWithConflicting.forEach((option) => {
      const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
      if (conflictingAndDefined) {
        this._conflictingOption(option, conflictingAndDefined);
      }
    });
  }
  _checkForConflictingOptions() {
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd._checkForConflictingLocalOptions();
    });
  }
  parseOptions(args) {
    const operands = [];
    const unknown = [];
    let dest = operands;
    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === "-";
    }
    const negativeNumberArg = (arg) => {
      if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg))
        return false;
      return !this._getCommandAndAncestors().some((cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short)));
    };
    let activeVariadicOption = null;
    let activeGroup = null;
    let i = 0;
    while (i < args.length || activeGroup) {
      const arg = activeGroup ?? args[i++];
      activeGroup = null;
      if (arg === "--") {
        if (dest === unknown)
          dest.push(arg);
        dest.push(...args.slice(i));
        break;
      }
      if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;
      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        if (option) {
          if (option.required) {
            const value = args[i++];
            if (value === undefined)
              this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
              value = args[i++];
            }
            this.emit(`option:${option.name()}`, value);
          } else {
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }
      if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (option.required || option.optional && this._combineFlagAndOptionalValue) {
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            this.emit(`option:${option.name()}`);
            activeGroup = `-${arg.slice(2)}`;
          }
          continue;
        }
      }
      if (/^--[^=]+=/.test(arg)) {
        const index = arg.indexOf("=");
        const option = this._findOption(arg.slice(0, index));
        if (option && (option.required || option.optional)) {
          this.emit(`option:${option.name()}`, arg.slice(index + 1));
          continue;
        }
      }
      if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
        dest = unknown;
      }
      if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
        if (this._findCommand(arg)) {
          operands.push(arg);
          unknown.push(...args.slice(i));
          break;
        } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
          operands.push(arg, ...args.slice(i));
          break;
        } else if (this._defaultCommandName) {
          unknown.push(arg, ...args.slice(i));
          break;
        }
      }
      if (this._passThroughOptions) {
        dest.push(arg, ...args.slice(i));
        break;
      }
      dest.push(arg);
    }
    return { operands, unknown };
  }
  opts() {
    if (this._storeOptionsAsProperties) {
      const result = {};
      const len = this.options.length;
      for (let i = 0;i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] = key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }
    return this._optionValues;
  }
  optsWithGlobals() {
    return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
  }
  error(message, errorOptions) {
    this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
    if (typeof this._showHelpAfterError === "string") {
      this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
    } else if (this._showHelpAfterError) {
      this._outputConfiguration.writeErr(`
`);
      this.outputHelp({ error: true });
    }
    const config = errorOptions || {};
    const exitCode = config.exitCode || 1;
    const code = config.code || "commander.error";
    this._exit(exitCode, code, message);
  }
  _parseOptionsEnv() {
    this.options.forEach((option) => {
      if (option.envVar && option.envVar in import_node_process.default.env) {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
          if (option.required || option.optional) {
            this.emit(`optionEnv:${option.name()}`, import_node_process.default.env[option.envVar]);
          } else {
            this.emit(`optionEnv:${option.name()}`);
          }
        }
      }
    });
  }
  _parseOptionsImplied() {
    const dualHelper = new DualOptions(this.options);
    const hasCustomOptionValue = (optionKey) => {
      return this.getOptionValue(optionKey) !== undefined && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
    };
    this.options.filter((option) => option.implied !== undefined && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
      Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
        this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
      });
    });
  }
  missingArgument(name) {
    const message = `error: missing required argument '${name}'`;
    this.error(message, { code: "commander.missingArgument" });
  }
  optionMissingArgument(option) {
    const message = `error: option '${option.flags}' argument missing`;
    this.error(message, { code: "commander.optionMissingArgument" });
  }
  missingMandatoryOptionValue(option) {
    const message = `error: required option '${option.flags}' not specified`;
    this.error(message, { code: "commander.missingMandatoryOptionValue" });
  }
  _conflictingOption(option, conflictingOption) {
    const findBestOptionFromValue = (option2) => {
      const optionKey = option2.attributeName();
      const optionValue = this.getOptionValue(optionKey);
      const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
      const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
      if (negativeOption && (negativeOption.presetArg === undefined && optionValue === false || negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg)) {
        return negativeOption;
      }
      return positiveOption || option2;
    };
    const getErrorMessage = (option2) => {
