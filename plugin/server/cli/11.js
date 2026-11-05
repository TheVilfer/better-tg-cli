  var PromisedNetSockets_1 = require_PromisedNetSockets();
  Object.defineProperty(exports2, "PromisedNetSockets", { enumerable: true, get: function() {
    return PromisedNetSockets_1.PromisedNetSockets;
  } });
  var PromisedWebSockets_1 = require_PromisedWebSockets();
  Object.defineProperty(exports2, "PromisedWebSockets", { enumerable: true, get: function() {
    return PromisedWebSockets_1.PromisedWebSockets;
  } });
  var MessagePacker_1 = require_MessagePacker();
  Object.defineProperty(exports2, "MessagePacker", { enumerable: true, get: function() {
    return MessagePacker_1.MessagePacker;
  } });
  var AsyncQueue_1 = require_AsyncQueue();
  Object.defineProperty(exports2, "AsyncQueue", { enumerable: true, get: function() {
    return AsyncQueue_1.AsyncQueue;
  } });
});

// node_modules/teleproto/crypto/AuthKey.js
var require_AuthKey = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.AuthKey = undefined;
  var Helpers_1 = require_Helpers();
  var extensions_1 = require_extensions();
  var Helpers_2 = require_Helpers();

  class AuthKey {
    constructor(value, hash) {
      if (!hash || !value) {
        return;
      }
      this._key = value;
      this._hash = hash;
      const reader = new extensions_1.BinaryReader(hash);
      this.auxHash = reader.readLong(false);
      reader.read(4);
      this.keyId = reader.readLong(false);
    }
    async setKey(value) {
      if (!value) {
        this._key = this.auxHash = this.keyId = this._hash = undefined;
        return;
      }
      if (value instanceof AuthKey) {
        this._key = value._key;
        this.auxHash = value.auxHash;
        this.keyId = value.keyId;
        this._hash = value._hash;
        return;
      }
      this._key = value;
      this._hash = await (0, Helpers_1.sha1)(this._key);
      const reader = new extensions_1.BinaryReader(this._hash);
      this.auxHash = reader.readLong(false);
      reader.read(4);
      this.keyId = reader.readLong(false);
    }
    async waitForKey() {
      while (!this.keyId) {
        if (!this._key) {
          throw new Error("Auth key is unset");
        }
        await (0, Helpers_2.sleep)(20);
      }
    }
    getKey() {
      return this._key;
    }
    async calcNewNonceHash(newNonce, number) {
      if (this.auxHash) {
        const nonce = (0, Helpers_1.toSignedLittleBuffer)(newNonce, 32);
        const n = Buffer.alloc(1);
        n.writeUInt8(number, 0);
        const data = Buffer.concat([
          nonce,
          Buffer.concat([n, (0, Helpers_1.readBufferFromBigInt)(this.auxHash, 8, true)])
        ]);
        const shaData = (await (0, Helpers_1.sha1)(data)).slice(4, 20);
        return (0, Helpers_1.readBigIntFromBuffer)(shaData, true, true);
      }
      throw new Error("Auth key not set");
    }
    equals(other) {
      return other instanceof this.constructor && this._key && Buffer.isBuffer(other.getKey()) && other.getKey()?.equals(this._key);
    }
  }
  exports2.AuthKey = AuthKey;
});

// node_modules/teleproto/sessions/StringSession.js
var require_StringSession = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.StringSession = undefined;
  var Memory_1 = require_Memory();
  var extensions_1 = require_extensions();
  var AuthKey_1 = require_AuthKey();
  var CURRENT_VERSION = "1";

  class StringSession extends Memory_1.MemorySession {
    constructor(session) {
      super();
      this._loaded = false;
      if (session) {
        if (session[0] !== CURRENT_VERSION) {
          throw new Error("Not a valid string");
        }
        session = session.slice(1);
        const r = StringSession.decode(session);
        const reader = new extensions_1.BinaryReader(r);
        this._dcId = reader.read(1).readUInt8(0);
        if (session.length == 352) {
          const ip_v4 = reader.read(4);
          this._serverAddress = ip_v4[0].toString() + "." + ip_v4[1].toString() + "." + ip_v4[2].toString() + "." + ip_v4[3].toString();
        } else {
          const serverAddressLen = reader.read(2).readInt16BE(0);
          if (serverAddressLen > 100) {
            reader.offset -= 2;
            this._serverAddress = reader.read(16).toString("hex").match(/.{1,4}/g).map((val) => val.replace(/^0+/, "")).join(":").replace(/0000\:/g, ":").replace(/:{2,}/g, "::");
          } else {
            this._serverAddress = reader.read(serverAddressLen).toString();
          }
        }
        this._port = reader.read(2).readInt16BE(0);
        this._key = reader.read(-1);
      }
    }
    static encode(x) {
      return x.toString("base64");
    }
    static decode(x) {
      return Buffer.from(x, "base64");
    }
    async load() {
      if (this._loaded)
        return;
      this._loaded = true;
      if (this._key) {
        this._authKey = new AuthKey_1.AuthKey;
        await this._authKey.setKey(this._key);
      }
    }
    delete() {
      this._loaded = false;
      this._key = undefined;
      super.delete();
    }
    save() {
      if (!this.authKey || !this.serverAddress || !this.port) {
        return "";
      }
      const key = this.authKey.getKey();
      if (!key) {
        return "";
      }
      const dcBuffer = Buffer.from([this.dcId]);
      const addressBuffer = Buffer.from(this.serverAddress);
      const addressLengthBuffer = Buffer.alloc(2);
      addressLengthBuffer.writeInt16BE(addressBuffer.length, 0);
      const portBuffer = Buffer.alloc(2);
      portBuffer.writeInt16BE(this.port, 0);
      return CURRENT_VERSION + StringSession.encode(Buffer.concat([
        dcBuffer,
        addressLengthBuffer,
        addressBuffer,
        portBuffer,
        key
      ]));
    }
  }
  exports2.StringSession = StringSession;
});

// node_modules/teleproto/sessions/StoreSession.js
var require_StoreSession = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });

  class StoreSession {
    constructor() {
      throw new Error("StoreSession is not bundled; use StringSession");
    }
  }
  exports2.StoreSession = StoreSession;
});

// node_modules/teleproto/sessions/index.js
var require_sessions = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Session = exports2.StoreSession = exports2.StringSession = exports2.MemorySession = undefined;
  var Memory_1 = require_Memory();
  Object.defineProperty(exports2, "MemorySession", { enumerable: true, get: function() {
    return Memory_1.MemorySession;
  } });
  var StringSession_1 = require_StringSession();
  Object.defineProperty(exports2, "StringSession", { enumerable: true, get: function() {
    return StringSession_1.StringSession;
  } });
  var StoreSession_1 = require_StoreSession();
  Object.defineProperty(exports2, "StoreSession", { enumerable: true, get: function() {
    return StoreSession_1.StoreSession;
  } });
  var Abstract_1 = require_Abstract();
  Object.defineProperty(exports2, "Session", { enumerable: true, get: function() {
    return Abstract_1.Session;
  } });
});

// node_modules/teleproto/entityCache.js
var require_entityCache = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.EntityCache = exports2.ENTITY_CACHE_DEFAULTS = undefined;
  var Utils_1 = require_Utils();
  var Helpers_1 = require_Helpers();
  var tl_1 = require_tl();
  var big_integer_1 = __importDefault(require_BigInteger());
  exports2.ENTITY_CACHE_DEFAULTS = {
    max: 4096,
    ttl: 0
  };
  function toCachedPeer(peer) {
    if (peer instanceof tl_1.Api.InputPeerUser) {
      return { kind: "user", id: peer.userId, hash: peer.accessHash };
    }
    if (peer instanceof tl_1.Api.InputPeerChat) {
      return { kind: "chat", id: peer.chatId };
    }
    if (peer instanceof tl_1.Api.InputPeerChannel) {
      return { kind: "channel", id: peer.channelId, hash: peer.accessHash };
    }
    if (peer instanceof tl_1.Api.InputPeerSelf) {
      return { kind: "self" };
    }
    return { kind: "raw", peer };
  }
  function buildInputPeer(cached) {
    switch (cached.kind) {
      case "self":
        return new tl_1.Api.InputPeerSelf;
      case "user":
        return new tl_1.Api.InputPeerUser({ userId: cached.id, accessHash: cached.hash });
      case "chat":
        return new tl_1.Api.InputPeerChat({ chatId: cached.id });
      case "channel":
        return new tl_1.Api.InputPeerChannel({ channelId: cached.id, accessHash: cached.hash });
      case "raw":
        return cached.peer;
      default:
        return assertNever(cached);
    }
  }
  function assertNever(value) {
    throw new Error(`Unhandled cached peer: ${JSON.stringify(value)}`);
  }
  function collectEntities(input) {
    if ((0, Helpers_1.isArrayLike)(input)) {
      return input;
    }
    if (input == undefined || typeof input !== "object") {
      return [];
    }
    const { users, chats, user } = input;
    return [
      ...(0, Helpers_1.isArrayLike)(chats) ? chats : [],
      ...(0, Helpers_1.isArrayLike)(users) ? users : [],
      ...user != null ? [user] : []
    ];
  }

  class EntityCache {
    constructor(options) {
      this.users = new Map;
      this.chats = new Map;
      this.pinnedKeys = new Set;
      this.enabled = options !== false;
      const policy = typeof options === "object" ? options : exports2.ENTITY_CACHE_DEFAULTS;
      this.max = Math.max(0, policy.max ?? 0);
      this.ttl = Math.max(0, policy.ttl ?? 0);
    }
    get size() {
      return this.users.size + this.chats.size;
    }
    add(entities) {
      if (!this.enabled)
        return;
      for (const entity of collectEntities(entities)) {
        try {
          this.write((0, Utils_1.getPeerId)(entity), toCachedPeer((0, Utils_1.getInputPeer)(entity)));
        } catch {}
      }
    }
    get(item) {
      const found = this.find(item);
      if (!found) {
        throw new Error("No cached entity for the given key");
      }
      return buildInputPeer(found);
    }
    has(item) {
      try {
        return this.find(item) !== undefined;
      } catch {
        return false;
      }
    }
    delete(item) {
      try {
        for (const key of this.candidateKeys(item)) {
          this.pinnedKeys.delete(key);
          if (this.getSegment(key).delete(key)) {
            return true;
          }
        }
      } catch {}
      return false;
    }
    clear() {
      this.users.clear();
      this.chats.clear();
      this.pinnedKeys.clear();
    }
    pin(markedId) {
      if (!this.enabled)
        return;
      this.pinnedKeys.add(markedId.toString());
    }
    unpin(markedId) {
      this.pinnedKeys.delete(markedId.toString());
    }
    getSegment(key) {
      return key.startsWith("-") ? this.chats : this.users;
    }
    write(key, peer) {
      const segment = this.getSegment(key);
      segment.delete(key);
      segment.set(key, { peer, writtenAt: Date.now() });
      this.prune(segment);
    }
    read(key) {
      const segment = this.getSegment(key);
      const entry = segment.get(key);
      if (!entry)
        return;
      if (this.isExpired(key, entry, Date.now())) {
        segment.delete(key);
        return;
      }
      segment.delete(key);
      segment.set(key, entry);
      return entry.peer;
    }
    isExpired(key, entry, now) {
      return this.ttl > 0 && now - entry.writtenAt > this.ttl && !this.pinnedKeys.has(key);
    }
    prune(segment) {
      const now = Date.now();
      if (this.ttl > 0) {
        for (const [key, entry] of segment) {
          if (this.pinnedKeys.has(key))
            continue;
          if (!this.isExpired(key, entry, now))
            break;
          segment.delete(key);
        }
      }
      if (this.max > 0 && segment.size > this.max) {
        for (const key of segment.keys()) {
          if (this.pinnedKeys.has(key))
            continue;
          segment.delete(key);
          if (segment.size <= this.max)
            break;
        }
      }
    }
    find(item) {
      if (!this.enabled)
        return;
      for (const key of this.candidateKeys(item)) {
        const cached = this.read(key);
        if (cached) {
          return cached;
        }
      }
      return;
    }
    *candidateKeys(item) {
      if (item == undefined) {
        throw new Error("No cached entity for the given key");
      }
      const id = (0, Helpers_1.returnBigInt)(item);
      if (id.lesser(big_integer_1.default.zero)) {
        let marked;
        try {
          marked = (0, Utils_1.getPeerId)(id);
        } catch {
          throw new Error("Invalid key will not have entity");
        }
        yield marked;
      }
      yield (0, Utils_1.getPeerId)(new tl_1.Api.PeerUser({ userId: id }));
      yield (0, Utils_1.getPeerId)(new tl_1.Api.PeerChat({ chatId: id }));
      yield (0, Utils_1.getPeerId)(new tl_1.Api.PeerChannel({ channelId: id }));
    }
  }
  exports2.EntityCache = EntityCache;
});

// node_modules/teleproto/extensions/markdown.js
var require_markdown = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MarkdownParser = exports2.DEFAULT_DELIMITERS = undefined;
  var tl_1 = require_tl();
  exports2.DEFAULT_DELIMITERS = {
    "**": tl_1.Api.MessageEntityBold,
    __: tl_1.Api.MessageEntityItalic,
    "~~": tl_1.Api.MessageEntityStrike,
    "`": tl_1.Api.MessageEntityCode,
    "```": tl_1.Api.MessageEntityPre
  };

  class MarkdownParser {
    static parse(message) {
      let i = 0;
      const keys = {};
      for (const k in exports2.DEFAULT_DELIMITERS) {
        keys[k] = false;
      }
      const entities = [];
      const tempEntities = {};
      while (i < message.length) {
        let foundIndex = -1;
        let foundDelim = undefined;
        for (const key of Object.keys(exports2.DEFAULT_DELIMITERS)) {
          const index = message.indexOf(key, i);
          if (index > -1 && (foundIndex === -1 || index < foundIndex)) {
            foundIndex = index;
            foundDelim = key;
          }
        }
        if (foundIndex === -1 || foundDelim == undefined) {
          break;
        }
        if (!keys[foundDelim]) {
          tempEntities[foundDelim] = new exports2.DEFAULT_DELIMITERS[foundDelim]({
            offset: foundIndex,
            length: -1,
            language: ""
          });
          keys[foundDelim] = true;
        } else {
          keys[foundDelim] = false;
          tempEntities[foundDelim].length = foundIndex - tempEntities[foundDelim].offset;
          entities.push(tempEntities[foundDelim]);
        }
        message = message.toString().replace(foundDelim, "");
        i = foundIndex;
      }
      return [message, entities];
    }
    static unparse(text, entities) {
      const delimiters = exports2.DEFAULT_DELIMITERS;
      if (!text || !entities) {
        return text;
      }
      let insertAt = [];
      const tempDelimiters = new Map;
      Object.keys(delimiters).forEach((key) => {
        tempDelimiters.set(delimiters[key].className, key);
      });
      for (const entity of entities) {
        const s = entity.offset;
        const e = entity.offset + entity.length;
        const delimiter = tempDelimiters.get(entity.className);
        if (delimiter) {
          insertAt.push([s, delimiter]);
          insertAt.push([e, delimiter]);
        }
      }
      insertAt = insertAt.sort((a, b) => {
        return a[0] - b[0];
      });
      while (insertAt.length) {
        const [at, what] = insertAt.pop();
        text = text.slice(0, at) + what + text.slice(at);
      }
      return text;
    }
  }
  exports2.MarkdownParser = MarkdownParser;
});

// node_modules/teleproto/crypto/IGE.js
var require_IGE = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.IGE = undefined;
  var cifrante_1 = require_cifrante_node();
  var Helpers_1 = require_Helpers();
  var BLOCK_SIZE = 16;

  class IGE {
    constructor(key, iv) {
      if (key.length !== 32)
        throw new Error("Key must be 32 bytes (AES-256)");
      if (iv.length !== 32)
        throw new Error("IV must be 32 bytes (2 * block size)");
      this.cipher = cifrante_1.aes.ige(key);
      this.iv = iv;
    }
    encryptIge(plainText) {
      const padding = plainText.length % BLOCK_SIZE;
      if (padding !== 0) {
        plainText = Buffer.concat([
          plainText,
          (0, Helpers_1.generateRandomBytes)(BLOCK_SIZE - padding)
        ]);
      }
      return (0, Helpers_1.asBuffer)(this.cipher.encryptSync(plainText, { iv: this.iv }));
    }
    decryptIge(cipherText) {
      if (cipherText.length % BLOCK_SIZE !== 0) {
        throw new Error("Cipher text must be multiple of 16 bytes");
      }
      return (0, Helpers_1.asBuffer)(this.cipher.decryptSync(cipherText, { iv: this.iv }));
    }
  }
  exports2.IGE = IGE;
});

// node_modules/teleproto/network/ReceivedIdsManager.js
var require_ReceivedIdsManager = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ReceivedIdsManager = undefined;
  var ID_BUFFER_SIZE = 400;

  class ReceivedIdsManager {
    constructor() {
      this.ids = [];
    }
    registerMsgId(msgId) {
      const idx = this.lowerBound(msgId);
      if (idx < this.ids.length && this.ids[idx].eq(msgId)) {
        return "duplicate";
      }
      if (this.ids.length >= ID_BUFFER_SIZE && msgId.lesser(this.ids[0])) {
        return "tooOld";
      }
      this.ids.splice(idx, 0, msgId);
      return "success";
    }
    has(msgId) {
      const idx = this.lowerBound(msgId);
      return idx < this.ids.length && this.ids[idx].eq(msgId);
    }
    shrink() {
      while (this.ids.length > ID_BUFFER_SIZE)
        this.ids.shift();
    }
    clear() {
      this.ids.length = 0;
    }
    lowerBound(msgId) {
      let lo = 0;
      let hi = this.ids.length;
      while (lo < hi) {
        const mid = lo + hi >>> 1;
        if (this.ids[mid].lesser(msgId))
          lo = mid + 1;
        else
          hi = mid;
      }
      return lo;
    }
  }
  exports2.ReceivedIdsManager = ReceivedIdsManager;
});

// node_modules/teleproto/network/MTProtoState.js
var require_MTProtoState = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MTProtoState = exports2.DuplicateMessageError = undefined;
  var node_crypto_1 = __importDefault(require("node:crypto"));
  var cifrante_1 = require_cifrante_node();
  var big_integer_1 = __importDefault(require_BigInteger());
  var Helpers_1 = require_Helpers();
  var tl_1 = require_tl();
  var Helpers_2 = require_Helpers();
  var core_1 = require_core();
  var extensions_1 = require_extensions();
  var IGE_1 = require_IGE();
  var errors_1 = require_errors();
  var ReceivedIdsManager_1 = require_ReceivedIdsManager();

  class DuplicateMessageError extends errors_1.SecurityError {
    constructor(msgId) {
      super(`Duplicate message ${msgId}`);
      this.msgId = msgId;
    }
  }
  exports2.DuplicateMessageError = DuplicateMessageError;

  class MTProtoState {
    constructor(authKey, loggers, securityChecks = true) {
      this.authKey = authKey;
      this._log = loggers;
      this.timeOffset = 0;
      this.salt = big_integer_1.default.zero;
      this._sequence = 0;
      this.id = this._lastMsgId = big_integer_1.default.zero;
      this.receivedIds = new ReceivedIdsManager_1.ReceivedIdsManager;
      this.securityChecks = securityChecks;
      this.reset();
    }
    hasReceived(msgId) {
      return this.receivedIds.has(msgId);
    }
    get sessionId() {
      return this.id;
    }
    reset() {
      this.id = (0, Helpers_1.generateRandomLong)(true);
      this._sequence = 0;
      this._lastMsgId = big_integer_1.default.zero;
      this.receivedIds.clear();
    }
    _calcKey(authKey, msgKey, client) {
      const x = client ? 0 : 8;
      const sha256a = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync.create().update(msgKey).update(authKey.subarray(x, x + 36)).digest());
      const sha256b = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync.create().update(authKey.subarray(x + 40, x + 76)).update(msgKey).digest());
      const key = Buffer.allocUnsafe(32);
      sha256a.copy(key, 0, 0, 8);
      sha256b.copy(key, 8, 8, 24);
      sha256a.copy(key, 24, 24, 32);
      const iv = Buffer.allocUnsafe(32);
      sha256b.copy(iv, 0, 0, 8);
      sha256a.copy(iv, 8, 8, 24);
      sha256b.copy(iv, 24, 24, 32);
      return { key, iv };
    }
    async writeDataAsMessage(buffer, data, contentRelated, afterId, predeterminedMsgId) {
      const msgId = predeterminedMsgId ?? this._getNewMsgId();
      const seqNo = this._getSeqNo(contentRelated);
      let body;
      if (!afterId) {
        body = await core_1.GZIPPacked.gzipIfSmaller(contentRelated, data);
      } else {
        body = await core_1.GZIPPacked.gzipIfSmaller(contentRelated, new tl_1.Api.InvokeAfterMsg({
          msgId: afterId,
          query: {
            getBytes() {
              return data;
            }
          }
        }).getBytes());
      }
      const header = Buffer.allocUnsafe(16);
      (0, Helpers_2.toSignedLittleBuffer)(msgId, 8).copy(header, 0);
      header.writeInt32LE(seqNo, 8);
      header.writeInt32LE(body.length, 12);
      buffer.write(header);
      buffer.write(body);
      return msgId;
    }
    async encryptMessageData(data) {
      if (!this.authKey) {
        throw new Error("Auth key unset");
      }
      await this.authKey.waitForKey();
      const authKey = this.authKey.getKey();
      if (!authKey) {
        throw new Error("Auth key unset");
      }
      if (!this.salt || !this.id || !authKey || !this.authKey.keyId) {
        throw new Error("Unset params");
      }
      const padLen = (0, Helpers_1.mod)(-(16 + data.length + 12), 16) + 12;
      const plain = Buffer.allocUnsafe(16 + data.length + padLen);
      (0, Helpers_2.toSignedLittleBuffer)(this.salt, 8).copy(plain, 0);
      (0, Helpers_2.toSignedLittleBuffer)(this.id, 8).copy(plain, 8);
      data.copy(plain, 16);
      node_crypto_1.default.randomFillSync(plain, 16 + data.length, padLen);
      const msgKeyLarge = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync.create().update(authKey.subarray(88, 120)).update(plain).digest());
      const msgKey = msgKeyLarge.subarray(8, 24);
      const { iv, key } = this._calcKey(authKey, msgKey, true);
      const keyId = (0, Helpers_1.readBufferFromBigInt)(this.authKey.keyId, 8);
      return Buffer.concat([
        keyId,
        msgKey,
        new IGE_1.IGE(key, iv).encryptIge(plain)
      ]);
    }
    async decryptMessageData(body) {
      if (!this.authKey) {
        throw new Error("Auth key unset");
      }
      if (body.length < 8) {
        throw new errors_1.InvalidBufferError(body);
      }
      const keyId = (0, Helpers_1.readBigIntFromBuffer)(body.slice(0, 8));
      if (!this.authKey.keyId || keyId.neq(this.authKey.keyId)) {
        throw new errors_1.SecurityError("Server replied with an invalid auth key");
      }
      const authKey = this.authKey.getKey();
      if (!authKey) {
        throw new errors_1.SecurityError("Unset AuthKey");
      }
      const msgKey = body.subarray(8, 24);
      const { iv, key } = this._calcKey(authKey, msgKey, false);
      body = new IGE_1.IGE(key, iv).decryptIge(body.subarray(24));
      const ourKey = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync.create().update(authKey.subarray(96, 128)).update(body).digest());
      if (!msgKey.equals(ourKey.subarray(8, 24))) {
        throw new errors_1.SecurityError("Received msg_key doesn't match with expected one");
      }
      const reader = new extensions_1.BinaryReader(body);
      reader.readLong();
      const serverId = reader.readLong();
      if (serverId.neq(this.id) && this.securityChecks) {
        throw new errors_1.SecurityError("Server replied with a wrong session ID");
      }
      const remoteMsgId = reader.readLong();
      const registerResult = this.receivedIds.registerMsgId(remoteMsgId);
      if (registerResult === "duplicate" && this.securityChecks) {
        throw new DuplicateMessageError(remoteMsgId);
      }
      if (registerResult !== "success" && this.securityChecks) {
        throw new errors_1.SecurityError(`Rejected message: ${registerResult}`);
      }
      this.receivedIds.shrink();
      const remoteSequence = reader.readInt();
      reader.readInt();
      const obj = reader.tgReadObject();
      return new core_1.TLMessage(remoteMsgId, remoteSequence, obj);
    }
    _getNewMsgId() {
      const now = new Date().getTime() / 1000 + this.timeOffset;
      const nanoseconds = Math.floor((now - Math.floor(now)) * 1e9);
      let newMsgId = (0, big_integer_1.default)(Math.floor(now)).shiftLeft((0, big_integer_1.default)(32)).or((0, big_integer_1.default)(nanoseconds).shiftLeft((0, big_integer_1.default)(2)));
      if (this._lastMsgId.greaterOrEquals(newMsgId)) {
        newMsgId = this._lastMsgId.add((0, big_integer_1.default)(4));
      }
      this._lastMsgId = newMsgId;
      return newMsgId;
    }
    updateTimeOffset(correctMsgId) {
      const bad = this._getNewMsgId();
      const old = this.timeOffset;
      const now = Math.floor(new Date().getTime() / 1000);
      const correct = correctMsgId.shiftRight((0, big_integer_1.default)(32)).toJSNumber();
      this.timeOffset = correct - now;
      if (this.timeOffset !== old) {
        this._lastMsgId = big_integer_1.default.zero;
        this._log.debug(`Updated time offset (old offset ${old}, bad ${bad}, good ${correctMsgId}, new ${this.timeOffset})`);
      }
      return this.timeOffset;
    }
    _getSeqNo(contentRelated) {
      if (contentRelated) {
        const result = this._sequence * 2 + 1;
        this._sequence += 1;
        return result;
      } else {
        return this._sequence * 2;
      }
    }
  }
  exports2.MTProtoState = MTProtoState;
});

// node_modules/teleproto/network/MTProtoPlainSender.js
var require_MTProtoPlainSender = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MTProtoPlainSender = undefined;
  var big_integer_1 = __importDefault(require_BigInteger());
  var MTProtoState_1 = require_MTProtoState();
  var Helpers_1 = require_Helpers();
  var errors_1 = require_errors();
  var extensions_1 = require_extensions();

  class MTProtoPlainSender {
    constructor(connection, loggers) {
      this._state = new MTProtoState_1.MTProtoState(undefined, loggers);
      this._connection = connection;
    }
    async send(request) {
      let body = request.getBytes();
      let msgId = this._state._getNewMsgId();
      const m = (0, Helpers_1.toSignedLittleBuffer)(msgId, 8);
      const b = Buffer.alloc(4);
      b.writeInt32LE(body.length, 0);
      const res = Buffer.concat([
        Buffer.concat([Buffer.alloc(8), m, b]),
        body
      ]);
      await this._connection.send(res);
      body = await this._connection.recv();
      if (body.length < 8) {
        throw new errors_1.InvalidBufferError(body);
      }
      const reader = new extensions_1.BinaryReader(body);
      const authKeyId = reader.readLong();
      if (authKeyId.neq((0, big_integer_1.default)(0))) {
        throw new Error("Bad authKeyId");
      }
      msgId = reader.readLong();
      if (msgId.eq((0, big_integer_1.default)(0))) {
        throw new Error("Bad msgId");
      }
      const length = reader.readInt();
      if (length <= 0) {
        throw new Error("Bad length");
      }
      return reader.tgReadObject();
    }
  }
  exports2.MTProtoPlainSender = MTProtoPlainSender;
});

// node_modules/teleproto/crypto/Factorizator.js
var require_Factorizator = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Factorizator = undefined;
  var big_integer_1 = __importDefault(require_BigInteger());
  var cifrante_1 = require_cifrante_node();
  function toNative(value) {
    return BigInt(value.toString());
  }
  function fromNative(value) {
    return (0, big_integer_1.default)(value.toString());
  }

  class Factorizator {
    static gcd(a, b) {
      return fromNative(cifrante_1.math.gcd(toNative(a), toNative(b)));
    }
    static factorize(pq) {
      const { p, q } = cifrante_1.math.factor(toNative(pq));
      return p < q ? { p: fromNative(p), q: fromNative(q) } : { p: fromNative(q), q: fromNative(p) };
    }
  }
  exports2.Factorizator = Factorizator;
});

// node_modules/teleproto/crypto/RSA.js
var require_RSA = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2._serverKeys = undefined;
  exports2.encrypt = encrypt;
  var big_integer_1 = __importDefault(require_BigInteger());
  var Helpers_1 = require_Helpers();
  var PUBLIC_KEYS = [
    {
      fingerprint: (0, big_integer_1.default)("-3414540481677951611"),
      n: (0, big_integer_1.default)("2937959817066933702298617714945612856538843112005886376816255642404751219133084745514657634448776440866" + "1701890505066208632169112269581063774293102577308490531282748465986139880977280302242772832972539403531" + "3160108704012876427630091361567343395380424193887227773571344877461690935390938502512438971889287359033" + "8945177273024525306296338410881284207988753897636046529094613963869149149606209957083647645485599631919" + "2747663615955633778034897140982517446405334423701359108810182097749467210509584293428076654573384828809" + "574217079944388301239431309115013843331317877374435868468779972014486325557807783825502498215169806323"),
      e: 65537
    },
    {
      fingerprint: (0, big_integer_1.default)("-5595554452916591101"),
      n: (0, big_integer_1.default)("2534288944884041556497168959071347320689884775908477905258202659454602246385394058588521595116849196570822" + "26493991806038180742006204637761354248846321625124031637930839216416315647409595294193595958529411668489405859523" + "37613333022396096584117954892216031229237302943701877588456738335398602461675225081791820393153757504952636234951" + "32323782003654358104782690612092797248736680529211579223142368426126233039432475078545094258975175539015664775146" + "07193514399690599495696153028090507215003302390050778898553239175099482557220816446894421272976054225797071426466" + "60768825302832201908302295573257427896031830742328565032949"),
      e: 65537
    }
  ];
  exports2._serverKeys = new Map;
  PUBLIC_KEYS.forEach(({ fingerprint, ...keyInfo }) => {
    exports2._serverKeys.set(fingerprint.toString(), keyInfo);
  });
  async function encrypt(fingerprint, data) {
    const key = exports2._serverKeys.get(fingerprint.toString());
    if (!key) {
      return;
    }
    const rand = (0, Helpers_1.generateRandomBytes)(235 - data.length);
    const toEncrypt = Buffer.concat([await (0, Helpers_1.sha1)(data), data, rand]);
    const payload = (0, Helpers_1.readBigIntFromBuffer)(toEncrypt, false);
    const encrypted = (0, Helpers_1.modExp)(payload, (0, big_integer_1.default)(key.e), key.n);
    return (0, Helpers_1.readBufferFromBigInt)(encrypted, 256, false);
  }
});

// node_modules/teleproto/network/Authenticator.js
var require_Authenticator = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.doAuthentication = doAuthentication;
  var Helpers_1 = require_Helpers();
  var tl_1 = require_tl();
  var errors_1 = require_errors();
  var Factorizator_1 = require_Factorizator();
  var RSA_1 = require_RSA();
  var IGE_1 = require_IGE();
  var big_integer_1 = __importDefault(require_BigInteger());
  var extensions_1 = require_extensions();
  var AuthKey_1 = require_AuthKey();
  var RETRIES = 20;
  async function doAuthentication(sender, log, temp) {
    let bytes = (0, Helpers_1.generateRandomBytes)(16);
    const nonce = (0, Helpers_1.readBigIntFromBuffer)(bytes, false, true);
    const resPQ = await sender.send(new tl_1.Api.ReqPqMulti({ nonce }));
    log.debug("Starting authKey generation step 1");
    if (!(resPQ instanceof tl_1.Api.ResPQ)) {
      throw new errors_1.SecurityError(`Step 1 answer was ${resPQ}`);
    }
    if (resPQ.nonce.neq(nonce)) {
      throw new errors_1.SecurityError("Step 1 invalid nonce from server");
    }
    const pq = (0, Helpers_1.readBigIntFromBuffer)(resPQ.pq, false, true);
    log.debug("Finished authKey generation step 1");
    const { p, q } = Factorizator_1.Factorizator.factorize(pq);
    const pBuffer = (0, Helpers_1.getByteArray)(p);
    const qBuffer = (0, Helpers_1.getByteArray)(q);
    bytes = (0, Helpers_1.generateRandomBytes)(32);
    const newNonce = (0, Helpers_1.readBigIntFromBuffer)(bytes, true, true);
    const pqInnerData = (temp ? new tl_1.Api.PQInnerDataTempDc({
      pq: (0, Helpers_1.getByteArray)(pq),
      p: pBuffer,
      q: qBuffer,
      nonce: resPQ.nonce,
      serverNonce: resPQ.serverNonce,
      newNonce,
      dc: temp.dc,
      expiresIn: temp.expiresIn
    }) : new tl_1.Api.PQInnerData({
      pq: (0, Helpers_1.getByteArray)(pq),
      p: pBuffer,
      q: qBuffer,
      nonce: resPQ.nonce,
      serverNonce: resPQ.serverNonce,
      newNonce
    })).getBytes();
    if (pqInnerData.length > 144) {
      throw new errors_1.SecurityError("Invalid nonce from server");
    }
    let targetFingerprint;
    let targetKey;
    for (const fingerprint of resPQ.serverPublicKeyFingerprints) {
      targetKey = RSA_1._serverKeys.get(fingerprint.toString());
      if (targetKey !== undefined) {
        targetFingerprint = fingerprint;
        break;
      }
    }
    if (targetFingerprint === undefined || targetKey === undefined) {
      throw new errors_1.SecurityError("Could not find a valid key for fingerprints");
    }
    const padding = (0, Helpers_1.generateRandomBytes)(192 - pqInnerData.length);
    const dataWithPadding = Buffer.concat([pqInnerData, padding]);
    const dataPadReversed = Buffer.from(dataWithPadding).reverse();
    let encryptedData;
    for (let i = 0;i < RETRIES; i++) {
      const tempKey = (0, Helpers_1.generateRandomBytes)(32);
      const shaDigestKeyWithData = await (0, Helpers_1.sha256)(Buffer.concat([tempKey, dataWithPadding]));
      const dataWithHash = Buffer.concat([
        dataPadReversed,
        shaDigestKeyWithData
      ]);
      const ige2 = new IGE_1.IGE(tempKey, Buffer.alloc(32));
      const aesEncrypted = ige2.encryptIge(dataWithHash);
      const tempKeyXor = (0, Helpers_1.bufferXor)(tempKey, await (0, Helpers_1.sha256)(aesEncrypted));
      const keyAesEncrypted = Buffer.concat([tempKeyXor, aesEncrypted]);
      const keyAesEncryptedInt = (0, Helpers_1.readBigIntFromBuffer)(keyAesEncrypted, false, false);
      if (keyAesEncryptedInt.greaterOrEquals(targetKey.n)) {
        log.debug("Aes key greater than RSA. retrying");
        continue;
      }
      const encryptedDataBuffer = (0, Helpers_1.modExp)(keyAesEncryptedInt, (0, big_integer_1.default)(targetKey.e), targetKey.n);
      encryptedData = (0, Helpers_1.readBufferFromBigInt)(encryptedDataBuffer, 256, false, false);
      break;
    }
    if (encryptedData === undefined) {
      throw new errors_1.SecurityError("Could create a secure encrypted key");
    }
    log.debug("Generated a secure aes encrypted data");
    const serverDhParams = await sender.send(new tl_1.Api.ReqDHParams({
      nonce: resPQ.nonce,
      serverNonce: resPQ.serverNonce,
      p: pBuffer,
      q: qBuffer,
      publicKeyFingerprint: targetFingerprint,
      encryptedData
    }));
    if (!(serverDhParams instanceof tl_1.Api.ServerDHParamsOk || serverDhParams instanceof tl_1.Api.ServerDHParamsFail)) {
      throw new Error(`Answer was ${serverDhParams}`);
    }
    if (serverDhParams.nonce.neq(resPQ.nonce)) {
      throw new errors_1.SecurityError("Invalid nonce from server");
    }
    if (serverDhParams.serverNonce.neq(resPQ.serverNonce)) {
      throw new errors_1.SecurityError("Invalid server nonce from server");
    }
    if (serverDhParams instanceof tl_1.Api.ServerDHParamsFail) {
      const sh = await (0, Helpers_1.sha1)((0, Helpers_1.toSignedLittleBuffer)(newNonce, 32).slice(4, 20));
      const nnh = (0, Helpers_1.readBigIntFromBuffer)(sh, true, true);
      if (serverDhParams.newNonceHash.neq(nnh)) {
        throw new errors_1.SecurityError("Invalid DH fail nonce from server");
      }
    }
    if (!(serverDhParams instanceof tl_1.Api.ServerDHParamsOk)) {
      throw new Error(`Answer was ${serverDhParams}`);
    }
    log.debug("Finished authKey generation");
    log.debug("Starting authKey generation");
    const { key, iv } = await (0, Helpers_1.generateKeyDataFromNonce)(resPQ.serverNonce, newNonce);
    if (serverDhParams.encryptedAnswer.length % 16 !== 0) {
      throw new errors_1.SecurityError("AES block size mismatch");
    }
    const ige = new IGE_1.IGE(key, iv);
    const plainTextAnswer = ige.decryptIge(serverDhParams.encryptedAnswer);
    const reader = new extensions_1.BinaryReader(plainTextAnswer);
    reader.read(20);
    const serverDhInner = reader.tgReadObject();
    if (!(serverDhInner instanceof tl_1.Api.ServerDHInnerData)) {
      throw new Error(`Answer was ${serverDhInner}`);
    }
    if (serverDhInner.nonce.neq(resPQ.nonce)) {
      throw new errors_1.SecurityError("Invalid nonce in encrypted answer");
    }
    if (serverDhInner.serverNonce.neq(resPQ.serverNonce)) {
      throw new errors_1.SecurityError("Invalid server nonce in encrypted answer");
    }
    const dhPrime = (0, Helpers_1.readBigIntFromBuffer)(serverDhInner.dhPrime, false, false);
    const ga = (0, Helpers_1.readBigIntFromBuffer)(serverDhInner.gA, false, false);
    const timeOffset = serverDhInner.serverTime - Math.floor(new Date().getTime() / 1000);
    const b = (0, Helpers_1.readBigIntFromBuffer)((0, Helpers_1.generateRandomBytes)(256), false, false);
    const gb = (0, Helpers_1.modExp)((0, big_integer_1.default)(serverDhInner.g), b, dhPrime);
    const gab = (0, Helpers_1.modExp)(ga, b, dhPrime);
    const clientDhInner = new tl_1.Api.ClientDHInnerData({
      nonce: resPQ.nonce,
      serverNonce: resPQ.serverNonce,
      retryId: big_integer_1.default.zero,
      gB: (0, Helpers_1.getByteArray)(gb, false)
    }).getBytes();
    const clientDdhInnerHashed = Buffer.concat([
      await (0, Helpers_1.sha1)(clientDhInner),
      clientDhInner
    ]);
    const clientDhEncrypted = ige.encryptIge(clientDdhInnerHashed);
    const dhGen = await sender.send(new tl_1.Api.SetClientDHParams({
      nonce: resPQ.nonce,
      serverNonce: resPQ.serverNonce,
      encryptedData: clientDhEncrypted
    }));
    const nonceTypes = [tl_1.Api.DhGenOk, tl_1.Api.DhGenRetry, tl_1.Api.DhGenFail];
    const nonceTypesString = ["DhGenOk", "DhGenRetry", "DhGenFail"];
    if (!(dhGen instanceof nonceTypes[0] || dhGen instanceof nonceTypes[1] || dhGen instanceof nonceTypes[2])) {
      throw new Error(`Answer was ${dhGen}`);
    }
    const { name } = dhGen.constructor;
    if (dhGen.nonce.neq(resPQ.nonce)) {
      throw new errors_1.SecurityError(`Invalid ${name} nonce from server`);
    }
    if (dhGen.serverNonce.neq(resPQ.serverNonce)) {
      throw new errors_1.SecurityError(`Invalid ${name} server nonce from server`);
    }
    const authKey = new AuthKey_1.AuthKey;
    await authKey.setKey((0, Helpers_1.readBufferFromBigInt)(gab, 256, false, false));
    const nonceNumber = 1 + nonceTypesString.indexOf(dhGen.className);
    const newNonceHash = await authKey.calcNewNonceHash(newNonce, nonceNumber);
    const dhHash = dhGen[`newNonceHash${nonceNumber}`];
    if (dhHash.neq(newNonceHash)) {
      throw new errors_1.SecurityError("Invalid new nonce hash");
    }
    if (!(dhGen instanceof tl_1.Api.DhGenOk)) {
      throw new Error(`Answer was ${dhGen}`);
    }
    log.debug("Finished authKey generation");
    const saltBytes = (0, Helpers_1.toSignedLittleBuffer)(newNonce, 32).subarray(0, 8);
    const serverNonceBytes = (0, Helpers_1.toSignedLittleBuffer)(resPQ.serverNonce, 16);
    for (let i = 0;i < 8; i++)
      saltBytes[i] ^= serverNonceBytes[i];
    const serverSalt = (0, Helpers_1.readBigIntFromBuffer)(saltBytes, true, true);
    return { authKey, timeOffset, serverSalt };
  }
});

// node_modules/teleproto/extensions/Deferred.js
var require_Deferred = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });

  class Deferred {
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.reject = reject;
        this.resolve = resolve;
      });
    }
    static resolved(value) {
      const deferred = new Deferred;
      deferred.resolve(value);
      return deferred;
    }
  }
  exports2.default = Deferred;
});

// node_modules/teleproto/network/RequestState.js
var require_RequestState = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.RequestState = undefined;
  var Deferred_1 = __importDefault(require_Deferred());

  class RequestState {
    constructor(request) {
      this._settled = true;
      this.cancelled = false;
      this.containerId = undefined;
      this.msgId = undefined;
      this.request = request;
      this.data = request.getBytes();
      this.after = undefined;
      this.acknowledged = false;
      this.finished = new Deferred_1.default;
      this.resetPromise();
    }
    isReady() {
      if (!this.after) {
        return true;
      }
      return this.after.finished.promise;
    }
    resetPromise() {
      if (this.promise && !this._settled) {
        return;
      }
      this._settled = false;
      this.promise = new Promise((resolve, reject) => {
        this.resolve = (value) => {
          this._settled = true;
          resolve(value);
        };
        this.reject = (reason) => {
          this._settled = true;
          reject(reason);
        };
      });
      this.promise.catch(() => {});
    }
  }
  exports2.RequestState = RequestState;
});

// node_modules/teleproto/network/MtpDispatcher.js
var require_MtpDispatcher = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MtpDispatcher = undefined;
  var big_integer_1 = __importDefault(require_BigInteger());
  var tl_1 = require_tl();
  var core_1 = require_core();
  var extensions_1 = require_extensions();
  var errors_1 = require_errors();
  var Helpers_1 = require_Helpers();
  var RequestState_1 = require_RequestState();
  var MsgsAck = tl_1.Api.MsgsAck;

  class MtpDispatcher {
    constructor(sender) {
      this.sender = sender;
      this.handlers = {
        [core_1.RPCResult.CONSTRUCTOR_ID.toString()]: this.handleRPCResult.bind(this),
        [core_1.MessageContainer.CONSTRUCTOR_ID.toString()]: this.handleContainer.bind(this),
        [core_1.GZIPPacked.CONSTRUCTOR_ID.toString()]: this.handleGzipPacked.bind(this),
        [tl_1.Api.Pong.CONSTRUCTOR_ID.toString()]: this.handlePong.bind(this),
        [tl_1.Api.BadServerSalt.CONSTRUCTOR_ID.toString()]: this.handleBadServerSalt.bind(this),
        [tl_1.Api.BadMsgNotification.CONSTRUCTOR_ID.toString()]: this.handleBadNotification.bind(this),
        [tl_1.Api.MsgDetailedInfo.CONSTRUCTOR_ID.toString()]: this.handleDetailedInfo.bind(this),
        [tl_1.Api.MsgNewDetailedInfo.CONSTRUCTOR_ID.toString()]: this.handleNewDetailedInfo.bind(this),
        [tl_1.Api.NewSessionCreated.CONSTRUCTOR_ID.toString()]: this.handleNewSessionCreated.bind(this),
        [tl_1.Api.MsgsAck.CONSTRUCTOR_ID.toString()]: this.handleAck.bind(this),
        [tl_1.Api.FutureSalts.CONSTRUCTOR_ID.toString()]: this.handleFutureSalts.bind(this),
        [tl_1.Api.MsgsStateReq.CONSTRUCTOR_ID.toString()]: this.handleStateForgotten.bind(this),
        [tl_1.Api.MsgResendReq.CONSTRUCTOR_ID.toString()]: this.handleStateForgotten.bind(this),
        [tl_1.Api.MsgsAllInfo.CONSTRUCTOR_ID.toString()]: this.handleMsgAll.bind(this),
        [tl_1.Api.MsgsStateInfo.CONSTRUCTOR_ID.toString()]: this.handleStateInfo.bind(this)
      };
    }
    async process(message) {
      this.sender.ack(message.msgId);
      message.obj = await message.obj;
      this.sender.log.debug(`[MSG] Processing msgId=${message.msgId} type=${message.obj.className} constructorId=${message.obj.CONSTRUCTOR_ID}`);
      const handler = this.handlers[message.obj.CONSTRUCTOR_ID.toString()] ?? this.handleUpdate.bind(this);
      await handler(message);
    }
    popStates(msgId) {
      const state = this.sender.pendingState.getAndDelete(msgId);
      if (state) {
        return [state];
      }
      const toPop = [];
      for (const pending of this.sender.pendingState.values()) {
        if (pending.containerId?.equals(msgId)) {
          toPop.push(pending.msgId);
        }
      }
      if (toPop.length) {
        const popped = [];
        for (const x of toPop) {
          const state2 = this.sender.pendingState.getAndDelete(x);
          if (state2)
            popped.push(state2);
        }
        return popped;
      }
      for (const ack of this.sender.lastAcks) {
        if (ack.msgId?.equals(msgId)) {
          return [ack];
        }
      }
      return [];
    }
    handleRPCResult(message) {
      const result = message.obj;
      const state = this.sender.pendingState.getAndDelete(result.reqMsgId);
      this.sender.log.debug(`Handling RPC result for message ${result.reqMsgId}`);
      if (!state) {
        if (result.error)
          return;
        try {
          const reader = new extensions_1.BinaryReader(result.body);
          if (!(reader.tgReadObject() instanceof tl_1.Api.upload.File)) {
            throw new errors_1.TypeNotFoundError(0, Buffer.alloc(0));
          }
        } catch (e) {
          if (e instanceof errors_1.TypeNotFoundError) {
            this.sender.log.info(`Received response without parent request: ${result.body}`);
            return;
          }
          throw e;
        }
        return;
      }
      if (result.error) {
        const error = (0, errors_1.RPCMessageToError)(result.error, state.request);
        this.sender.ack(state.msgId);
        state.reject(error);
        if (error.errorMessage === "AUTH_KEY_UNREGISTERED" || error.errorMessage === "SESSION_REVOKED") {
          this.sender.onBadAuthKey(true);
        }
      } else {
        try {
          const reader = new extensions_1.BinaryReader(result.body);
          const read = state.request.readResult(reader);
          this.sender.log.debug(`Handling RPC result ${read?.className}`);
          state.resolve(read);
        } catch (err) {
          state.reject(err);
          this.sender.log.error(`Failed to read result for ${state.request.className}`, err);
        }
      }
    }
    async handleContainer(message) {
      this.sender.log.debug(`[CONTAINER] msgId=${message.msgId} contains ${message.obj.messages.length} messages`);
      for (const innerMessage of message.obj.messages) {
        await this.process(innerMessage);
      }
    }
    async handleGzipPacked(message) {
      this.sender.log.debug("Handling gzipped data");
      const reader = new extensions_1.BinaryReader(message.obj.data);
      message.obj = reader.tgReadObject();
      await this.process(message);
    }
    handleUpdate(message) {
      if (message.obj.SUBCLASS_OF_ID !== (0, Helpers_1.unionId)("Updates")) {
        this.sender.log.warn(`Note: ${message.obj.className} is not an update, not dispatching it`);
        return;
      }
      this.sender.log.debug(`[UPDATE] msgId=${message.msgId} type=${message.obj.className}` + (message.obj.updates ? ` innerUpdates=${message.obj.updates.length}:[${message.obj.updates.map((u) => u.className).join(",")}]` : ""));
      this.sender.dispatchUpdate(message.obj);
    }
    handlePong(message) {
      const pong = message.obj;
      this.sender.log.debug(`Handling pong for message ${pong.msgId}`);
      const state = this.sender.pendingState.get(pong.msgId.toString());
      this.sender.pendingState.delete(pong.msgId.toString());
      if (state) {
        state.resolve(pong);
      }
    }
    handleBadServerSalt(message) {
      const badSalt = message.obj;
      this.sender.log.debug(`Handling bad salt for message ${badSalt.badMsgId}`);
      this.sender.state.salt = badSalt.newServerSalt;
      this.sender.dcenter?.updateSalt(badSalt.newServerSalt);
      const states = this.popStates(badSalt.badMsgId);
      this.sender.requeue(states);
      this.sender.log.debug(`${states.length} message(s) will be resent`);
    }
    handleBadNotification(message) {
      const badMsg = message.obj;
      const states = this.popStates(badMsg.badMsgId);
      this.sender.log.debug(`Handling bad msg ${JSON.stringify(badMsg)}`);
      if ([16, 17].includes(badMsg.errorCode)) {
        const to = this.sender.state.updateTimeOffset((0, big_integer_1.default)(message.msgId));
        this.sender.log.info(`System clock is wrong, set time offset to ${to}s`);
      } else if (badMsg.errorCode === 32) {
        this.sender.state._sequence += 64;
      } else if (badMsg.errorCode === 33) {
        this.sender.state._sequence -= 16;
      } else {
        for (const state of states) {
          if (state.request instanceof MsgsAck)
            continue;
          state.reject(new errors_1.BadMessageError(state.request, badMsg.errorCode));
        }
        return;
      }
      this.sender.requeue(states);
      this.sender.log.debug(`${states.length} messages will be resent due to bad msg`);
    }
    handleDetailedInfo(message) {
      const { msgId, answerMsgId } = message.obj;
      this.sender.log.debug(`Handling detailed info for message ${answerMsgId}`);
      if (this.sender.pendingState.get(msgId) && !this.sender.state.hasReceived(answerMsgId)) {
        this.sender.requestResend([answerMsgId]);
      } else {
        this.sender.ack(answerMsgId);
      }
    }
    handleNewDetailedInfo(message) {
      const { answerMsgId } = message.obj;
      this.sender.log.debug(`Handling new detailed info for message ${answerMsgId}`);
      if (this.sender.state.hasReceived(answerMsgId)) {
        this.sender.ack(answerMsgId);
      } else {
        this.sender.requestResend([answerMsgId]);
      }
    }
    handleNewSessionCreated(message) {
      this.sender.log.debug("Handling new session created");
      this.sender.resendBefore((0, big_integer_1.default)(message.obj.firstMsgId));
      this.sender.state.salt = message.obj.serverSalt;
      this.sender.dcenter?.updateSalt(message.obj.serverSalt);
      const uniqueId = String(message.obj.uniqueId);
      if (this._lastSessionUniqueId === undefined) {
        this._lastSessionUniqueId = uniqueId;
        return;
      }
      if (uniqueId === this._lastSessionUniqueId) {
        return;
      }
      this._lastSessionUniqueId = uniqueId;
      this.sender.markNeedsInitConnection();
      if (this.sender.isMainSender) {
        this.sender.dispatchUpdate(new tl_1.Api.UpdatesTooLong);
      }
    }
    handleAck(message) {
      if (message.obj.msgIds) {
        for (const msgId of message.obj.msgIds) {
          const state = this.sender.pendingState.get(msgId);
          if (state) {
            state.acknowledged = true;
          }
        }
      }
    }
    handleFutureSalts(message) {
      this.sender.log.debug(`Handling future salts for message ${message.msgId}`);
      const state = this.sender.pendingState.getAndDelete(message.msgId);
      if (state) {
        state.resolve(message.obj);
      }
    }
    handleStateForgotten(message) {
      this.sender.enqueue(new RequestState_1.RequestState(new tl_1.Api.MsgsStateInfo({
        reqMsgId: message.msgId,
        info: String.fromCharCode(1).repeat(message.obj.msgIds.length)
      })));
    }
    handleStateInfo(message) {
      this.sender.onStateInfo(message.obj.reqMsgId, message.obj.info);
    }
    handleMsgAll(_message) {}
  }
  exports2.MtpDispatcher = MtpDispatcher;
});

// node_modules/teleproto/network/TempAuthKey.js
var require_TempAuthKey = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.TEMP_KEY_EXPIRES_IN = undefined;
  exports2.buildBindTempAuthKeyRequest = buildBindTempAuthKeyRequest;
  var cifrante_1 = require_cifrante_node();
  var tl_1 = require_tl();
  var IGE_1 = require_IGE();
  var Helpers_1 = require_Helpers();
  exports2.TEMP_KEY_EXPIRES_IN = 24 * 60 * 60;
  function sha1(data) {
    return (0, Helpers_1.asBuffer)(cifrante_1.sha1.sync(data));
  }
  function calcKeyV1(authKey, msgKey) {
    const x = 0;
    const a = sha1(Buffer.concat([msgKey, authKey.subarray(x, x + 32)]));
    const b = sha1(Buffer.concat([
      authKey.subarray(x + 32, x + 48),
      msgKey,
      authKey.subarray(x + 48, x + 64)
    ]));
    const c = sha1(Buffer.concat([authKey.subarray(x + 64, x + 96), msgKey]));
    const d = sha1(Buffer.concat([msgKey, authKey.subarray(x + 96, x + 128)]));
    const key = Buffer.concat([
      a.subarray(0, 8),
      b.subarray(8, 20),
      c.subarray(4, 16)
    ]);
    const iv = Buffer.concat([
      a.subarray(8, 20),
      b.subarray(0, 8),
      c.subarray(16, 20),
      d.subarray(0, 8)
    ]);
    return { key, iv };
  }
  function buildBindTempAuthKeyRequest(permKey, tempKey, tempSessionId, msgId, expiresAt) {
    if (!permKey.getKey() || !permKey.keyId) {
      throw new Error("bindTempAuthKey: permanent key is not ready");
    }
    if (!tempKey.keyId) {
      throw new Error("bindTempAuthKey: temporary key is not ready");
    }
    const nonce = (0, Helpers_1.generateRandomLong)(true);
    const inner = new tl_1.Api.BindAuthKeyInner({
      nonce,
      tempAuthKeyId: tempKey.keyId,
      permAuthKeyId: permKey.keyId,
      tempSessionId,
      expiresAt
    }).getBytes();
    const head = Buffer.alloc(24);
    (0, Helpers_1.generateRandomBytes)(16).copy(head, 0);
    (0, Helpers_1.toSignedLittleBuffer)(msgId, 8).copy(head, 16);
    const meta = Buffer.alloc(8);
    meta.writeInt32LE(0, 0);
    meta.writeInt32LE(inner.length, 4);
    let payload = Buffer.concat([head, meta, inner]);
    const pad = (16 - payload.length % 16) % 16;
    if (pad)
      payload = Buffer.concat([payload, (0, Helpers_1.generateRandomBytes)(pad)]);
    const msgKey = sha1(payload.subarray(0, 24 + 8 + inner.length)).subarray(4, 20);
    const { key, iv } = calcKeyV1(permKey.getKey(), msgKey);
    const encrypted = new IGE_1.IGE(key, iv).encryptIge(payload);
    const encryptedMessage = Buffer.concat([
      (0, Helpers_1.toSignedLittleBuffer)(permKey.keyId, 8),
      msgKey,
      encrypted
    ]);
    return new tl_1.Api.auth.BindTempAuthKey({
      permAuthKeyId: permKey.keyId,
      nonce,
      expiresAt,
      encryptedMessage
    });
  }
});

// node_modules/teleproto/network/UpdateConnectionState.js
var require_UpdateConnectionState = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.UpdateConnectionState = undefined;

  class UpdateConnectionState {
    static {
      this.disconnected = -1;
    }
    static {
      this.connected = 1;
    }
    static {
      this.broken = 0;
    }
    constructor(state) {
      this.state = state;
    }
  }
  exports2.UpdateConnectionState = UpdateConnectionState;
});

// node_modules/teleproto/extensions/PendingState.js
var require_PendingState = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.PendingState = undefined;

  class PendingState {
    constructor() {
      this._pending = new Map;
    }
    set(msgId, state) {
      this._pending.set(msgId.toString(), state);
    }
    get(msgId) {
      return this._pending.get(msgId.toString());
    }
    getAndDelete(msgId) {
      const state = this.get(msgId);
      this.delete(msgId);
      return state;
    }
    values() {
      return Array.from(this._pending.values());
    }
    delete(msgId) {
      this._pending.delete(msgId.toString());
    }
    clear() {
      this._pending.clear();
    }
  }
  exports2.PendingState = PendingState;
});

// node_modules/teleproto/network/MTProtoSender.js
var require_MTProtoSender = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MTProtoSender = undefined;
  var AuthKey_1 = require_AuthKey();
  var MTProtoState_1 = require_MTProtoState();
  var packing_1 = require_packing();
  var MtpDispatcher_1 = require_MtpDispatcher();
  var tl_1 = require_tl();
  var Helpers_1 = require_Helpers();
  var RequestState_1 = require_RequestState();
  var Authenticator_1 = require_Authenticator();
  var TempAuthKey_1 = require_TempAuthKey();
  var MTProtoPlainSender_1 = require_MTProtoPlainSender();
  var errors_1 = require_errors();
  var UpdateConnectionState_1 = require_UpdateConnectionState();
  var registry_1 = require_registry();
  var PendingState_1 = require_PendingState();
  var MsgsAck = tl_1.Api.MsgsAck;
  var WATCHDOG_INTERVAL_MS = 1000;
  var PROBE_AFTER_MS = 1e4;
  var PROBE_MAX_IDS = 64;
  var PROBE_EXPIRY_MS = 60000;
  var SILENCE_MS = 15000;
  var SEND_BYTES_PER_SECOND = 8192;
  var SEND_SILENCE_CAP_MS = 64000;
  var RECONNECT_DELAY_STEP_MS = 1000;
  var RECONNECT_DELAY_STEPS = 5;
  var TEMP_KEY_REFRESH_MARGIN_S = 3600;
  var USE_INVOKE_AFTER_WITH = new Set([
    "messages.SendMessage",
    "messages.SendMedia",
    "messages.SendMultiMedia",
    "messages.ForwardMessages",
    "messages.SendInlineBotResult"
  ]);
  var STABLE_CONNECTION_MS = 30000;
  var QUICK_CONNECT_ATTEMPTS = 3;
  var QUICK_CONNECT_DELAY_MS = 1;
  var CONNECT_DELAY_CAP_MS = 64000;
  var FLAPPING_CONNECTIONS = 5;

  class MTProtoSender {
    static {
      this.DEFAULT_OPTIONS = {
        reconnectRetries: Infinity,
        retries: Infinity,
        delay: 2000,
        autoReconnect: true,
        connectTimeout: null,
        authKeyCallback: undefined,
        updateCallback: undefined,
        autoReconnectCallback: undefined,
        onConnectionBreak: undefined,
        securityChecks: true
      };
    }
    constructor(authKey, opts) {
      this._lifecycle = "disconnected";
      this._connectedAt = 0;
      this._lastReadAt = 0;
      this._shortLived = 0;
      this._queued = [];
      this._control = [];
      this._controlStates = new WeakSet;
      this._gateOpen = true;
      this._writeDeadline = 0;
      this._keyRejections = 0;
      this._tempExpiresAt = 0;
      this._probes = new Map;
      this._needsInitConnection = true;
      this._tempBound = false;
      const args = {
        ...MTProtoSender.DEFAULT_OPTIONS,
        ...opts
      };
      this._connection = undefined;
      this._log = args.logger;
      this._dcId = args.dcId;
      this._retries = args.retries;
      this._currentRetries = 0;
      this._reconnectRetries = args.reconnectRetries;
      this._delay = args.delay;
      this._autoReconnect = args.autoReconnect;
      this._connectTimeout = args.connectTimeout;
      this._authKeyCallback = args.authKeyCallback;
      this._updateCallback = args.updateCallback;
      this._autoReconnectCallback = args.autoReconnectCallback;
      this._lifecycleCallback = args.lifecycleCallback;
      this._isMainSender = args.isMainSender;
      this._client = args.client;
      this._onConnectionBreak = args.onConnectionBreak;
      this._securityChecks = args.securityChecks;
      this._dcenter = args.dcenter;
      this._tempBinding = args.tempBinding;
      this._silenceMs = args.silenceMs ?? SILENCE_MS;
      this._authenticated = false;
      this.authKey = authKey || new AuthKey_1.AuthKey;
      this._state = new MTProtoState_1.MTProtoState(this.authKey, this._log, this._securityChecks);
      this._pendingState = new PendingState_1.PendingState;
      this._pendingAck = new Set;
      this._lastAcks = [];
      this._dispatcher = new MtpDispatcher_1.MtpDispatcher({
        log: this._log,
        pendingState: this._pendingState,
        lastAcks: this._lastAcks,
        state: this._state,
        dcenter: this._tempBinding ? undefined : this._dcenter,
        isMainSender: this._isMainSender,
        ack: (msgId) => {
          this._pendingAck.add(msgId);
          if (this._pendingAck.size >= 16) {
            this._wakeUp();
          }
        },
        enqueue: (state) => this._enqueueControl(state),
        requeue: (states) => this._requeue(states),
        resendBefore: (firstMsgId) => this._resendBefore(firstMsgId),
        requestResend: (msgIds) => this._enqueueControl(new RequestState_1.RequestState(new tl_1.Api.MsgResendReq({ msgIds }))),
        onStateInfo: (reqMsgId, info) => this._onStateInfo(reqMsgId, info),
        onBadAuthKey: (shouldSkipForMain) => this._handleBadAuthKey(shouldSkipForMain),
        markNeedsInitConnection: () => {
          this._needsInitConnection = true;
        },
        dispatchUpdate: (update) => {
          if (this._updateCallback) {
            this._updateCallback(this._client, update);
          }
        }
      });
    }
    set dcId(dcId) {
      this._dcId = dcId;
    }
    get dcId() {
      return this._dcId;
    }
    async connect(connection, force) {
      if (this._lifecycle === "connected" && !force) {
        this._log.info("User is already connected!");
        return false;
      }
      if (this._lifecycle !== "reconnecting") {
        this._lifecycle = "connecting";
      }
      this._connection = connection;
      this._lifecycleCallback?.("connecting");
      let lastError;
      let retryDelay = QUICK_CONNECT_DELAY_MS;
      for (let attempt = 0;attempt < this._retries; attempt++) {
        try {
          await this._connect();
          if (this.isConnected())
            this._announceConnected();
          return true;
        } catch (err) {
          lastError = err;
          if (this._lifecycle === "dead") {
            break;
          }
          if (this._updateCallback && attempt === 0) {
            this._updateCallback(this._client, new UpdateConnectionState_1.UpdateConnectionState(UpdateConnectionState_1.UpdateConnectionState.disconnected));
          }
          const message = `Connection to dc ${this._dcId} failed (attempt ${attempt + 1}), next try in ${retryDelay}ms`;
          if (attempt < QUICK_CONNECT_ATTEMPTS) {
            this._log.error(message, err);
          } else {
            this._log.warn(`${message}: ${err}`);
          }
          if (this._client._errorHandler) {
            await this._client._errorHandler(err);
          }
          await (0, Helpers_1.sleep)(retryDelay);
          retryDelay = attempt + 1 < QUICK_CONNECT_ATTEMPTS ? retryDelay + 1 : Math.min(Math.max(this._delay, retryDelay * 2), CONNECT_DELAY_CAP_MS);
        }
      }
      await this._disconnect().catch(() => {});
      throw lastError instanceof Error ? lastError : new Error(`Failed to connect to dc ${this._dcId}`);
    }
    isConnected() {
      return this._lifecycle === "connected";
    }
    get lifecycle() {
      return this._lifecycle;
    }
    get userDisconnected() {
      return this._lifecycle === "dead";
    }
    set userDisconnected(value) {
      if (value) {
        this._lifecycle = "dead";
      } else if (this._lifecycle === "dead") {
        this._lifecycle = "disconnected";
      }
    }
    get _userConnected() {
      return this._lifecycle === "connected";
    }
    get isReconnecting() {
      return this._lifecycle === "reconnecting";
    }
    get _disconnected() {
      return this._lifecycle !== "connected";
    }
    get isConnecting() {
      return this._lifecycle === "connecting";
    }
    get lastReadAt() {
      return Math.max(this._connectedAt, this._lastReadAt, this._connection?.socket.lastDataAt ?? 0);
    }
    get hasPendingWork() {
      return this._queued.length > 0 || this._pendingState._pending.size > 0;
    }
    async disconnect() {
      this._lifecycle = "dead";
      this._log.debug("Disconnecting...");
      await this._disconnect();
      this._failAllPending(new Error(`Disconnected from dc ${this._dcId}`));
    }
    async _connectWithTimeout(connection) {
      const seconds = typeof this._connectTimeout === "number" && this._connectTimeout > 0 ? this._connectTimeout : 10;
      let timer;
      const dial = connection.connect();
      dial.catch(() => {});
      try {
        await Promise.race([
          dial,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Connection to ${connection.toString()} timed out after ${seconds}s`)), seconds * 1000);
          })
        ]);
      } catch (err) {
        connection.socket.close().catch(() => {});
        throw err;
      } finally {
        if (timer)
          clearTimeout(timer);
      }
    }
    _failAllPending(error) {
      for (const state of this._pendingState.values()) {
        state.reject(error);
      }
      this._pendingState.clear();
      for (const state of [...this._queued, ...this._control]) {
        if (!(state.request instanceof MsgsAck))
          state.reject(error);
      }
      this._queued.length = 0;
      this._control.length = 0;
    }
    send(request) {
      if (this._lifecycle === "dead") {
        return Promise.reject(new Error(`Cannot send ${request.className}: sender for dc ${this._dcId} is disconnected`));
      }
      const state = new RequestState_1.RequestState(request);
      this._log.debug(`Send ${request.className}`);
      this._enqueue(state);
      return state.promise;
    }
    _isApiRequest(request) {
      if (typeof request.readResult !== "function")
        return false;
      if (request instanceof tl_1.Api.InvokeWithLayer)
        return false;
      if (request instanceof tl_1.Api.Ping)
        return false;
      if (request instanceof tl_1.Api.PingDelayDisconnect)
        return false;
      if (request instanceof tl_1.Api.GetFutureSalts)
        return false;
      if (request instanceof tl_1.Api.RpcDropAnswer)
        return false;
      if (request instanceof tl_1.Api.DestroySession)
        return false;
      return true;
    }
    cancelRequest(state, reason) {
      state.cancelled = true;
      for (let index = this._queued.length - 1;index >= 0; index--) {
        if (this._queued[index] === state)
          this._queued.splice(index, 1);
      }
      if (state.msgId)
        this._pendingState.delete(state.msgId);
      state.promise?.catch(() => {});
      state.reject(reason);
      state.finished.resolve();
    }
    addStateToQueue(state) {
      if (state.cancelled)
        return;
      if (this._lifecycle === "dead") {
        state.reject(new Error(`Cannot send ${state.request.className}: sender for dc ${this._dcId} is disconnected`));
        return;
      }
      this._enqueue(state);
    }
    _buildInitConnection(query) {
      return new tl_1.Api.InitConnection({
        apiId: this._client.apiId,
        deviceModel: this._client._initRequest.deviceModel,
        systemVersion: this._client._initRequest.systemVersion,
        appVersion: this._client._initRequest.appVersion,
        langCode: this._client._initRequest.langCode,
        langPack: this._client._initRequest.langPack,
        systemLangCode: this._client._initRequest.systemLangCode,
        proxy: this._client._initRequest.proxy,
        query
      });
    }
    _wrapInitConnection() {
      if (!this._needsInitConnection)
        return;
      for (const state of this._queued) {
        if (state.cancelled)
          continue;
        if (state.request instanceof tl_1.Api.InvokeWithLayer) {
          this._needsInitConnection = false;
          return;
        }
        if (!this._isApiRequest(state.request))
          continue;
        state.request = new tl_1.Api.InvokeWithLayer({
          layer: registry_1.LAYER,
          query: this._buildInitConnection(state.request)
        });
        state.data = state.request.getBytes();
        this._needsInitConnection = false;
        this._log.debug("Wrapping request with initConnection");
        return;
      }
    }
    _enqueue(state, atStart = false) {
      if (state.request.className && USE_INVOKE_AFTER_WITH.has(state.request.className)) {
        if (atStart) {
          for (const queued of this._queued) {
            if (USE_INVOKE_AFTER_WITH.has(queued.request.className)) {
              queued.after = state;
              break;
            }
          }
        } else {
          for (let i = this._queued.length - 1;i >= 0; i--) {
            if (USE_INVOKE_AFTER_WITH.has(this._queued[i].request.className)) {
              state.after = this._queued[i];
              break;
            }
          }
        }
      }
      if (atStart) {
        this._queued.unshift(state);
      } else {
        this._queued.push(state);
      }
      this._wakeUp();
    }
    _enqueueControl(state) {
      this._controlStates.add(state);
      this._control.push(state);
      this._wakeUp();
    }
    _requeue(states) {
      const normal = [];
      const control = [];
      for (const state of states) {
        if (state.cancelled)
          continue;
        state.msgId = undefined;
        state.containerId = undefined;
        (this._controlStates.has(state) ? control : normal).push(state);
      }
      this._control.unshift(...control);
      this._queued.unshift(...normal);
      this._wakeUp();
    }
    _resendBefore(firstMsgId) {
      const stale = this._pendingState.values().filter((state) => state.msgId && state.msgId.lesser(firstMsgId) && !this._controlStates.has(state));
      if (!stale.length)
        return;
      for (const state of stale)
        this._pendingState.delete(state.msgId);
      this._log.info(`Resending ${stale.length} request(s) on dc ${this._dcId} after the server started a new session`);
      this._requeue(stale);
    }
    _wakeUp() {
      const wake = this._wakeWriter;
      this._wakeWriter = undefined;
      if (wake)
        wake();
    }
    _announceConnected() {
      this._lifecycleCallback?.("connect");
      if (this._updateCallback) {
        this._updateCallback(this._client, new UpdateConnectionState_1.UpdateConnectionState(UpdateConnectionState_1.UpdateConnectionState.connected));
      }
    }
    _assertCurrent(connection) {
      if (this._lifecycle === "dead" || connection !== this._connection) {
        throw new Error("Connection attempt cancelled");
      }
    }
    _tempKeyUsable() {
      const now = Date.now() / 1000 + this._state.timeOffset;
      return this._tempBound && now < this._tempExpiresAt - TEMP_KEY_REFRESH_MARGIN_S;
    }
    _startNewSession() {
      this._state.reset();
      this._pendingAck.clear();
      this._probes.clear();
      this._needsInitConnection = true;
      const sent = this._pendingState.values();
      this._pendingState.clear();
      const resend = [];
      for (const state of sent) {
        if (this._controlStates.has(state)) {
          state.reject(new Error(`Session for dc ${this._dcId} was reset`));
        } else {
          resend.push(state);
        }
      }
      this._requeue(resend);
    }
    async _connect() {
      const connection = this._connection;
      try {
        if (!connection.isConnected()) {
          this._log.debug(`Connecting to ${connection.toString()}...`);
          await this._connectWithTimeout(connection);
          this._log.debug("Connection success!");
        }
        this._assertCurrent(connection);
        if (this._tempBinding && this.authKey.getKey() && !this._tempKeyUsable()) {
          this._tempBound = false;
          await this.authKey.setKey(undefined);
        }
        if (!this.authKey.getKey()) {
          await this._createKey(connection);
        } else {
          this._authenticated = true;
          this._log.debug("Already have an auth key ...");
        }
        this._assertCurrent(connection);
      } catch (err) {
        await connection.disconnect().catch(() => {});
        throw err;
      }
      if (!this._tempBinding && this._state.salt.isZero() && this._dcenter && !this._dcenter.salt.isZero()) {
        this._state.salt = this._dcenter.salt;
      }
      this._lifecycle = "connected";
      this._connectedAt = Date.now();
      this._gateOpen = !this._tempBinding || this._tempBound;
      this._startIo(connection);
      if (!this._gateOpen) {
        await this._bindTempKey(connection);
      }
      this._log.debug(`Connection to ${connection.toString()} complete!`);
    }
    async _createKey(connection) {
      const plain = new MTProtoPlainSender_1.MTProtoPlainSender(connection, this._log);
      this._log.debug("New auth_key attempt ...");
      const res = await (0, Authenticator_1.doAuthentication)(plain, this._log, this._tempBinding ? {
        expiresIn: this._tempBinding.expiresIn,
        dc: this._tempBinding.dcParam
      } : undefined);
      this._log.debug("Generated new auth_key successfully");
      await this.authKey.setKey(res.authKey);
      this._state.timeOffset = res.timeOffset;
      this._startNewSession();
      this._state.salt = res.serverSalt;
      if (this._tempBinding) {
        this._tempBound = false;
        this._tempExpiresAt = Math.floor(Date.now() / 1000) + res.timeOffset + this._tempBinding.expiresIn;
      } else if (this._authKeyCallback) {
        await this._authKeyCallback(this.authKey, this._dcId);
      }
    }
    async _bindTempKey(connection) {
      const binding = this._tempBinding;
      const msgId = this._state._getNewMsgId();
      const state = new RequestState_1.RequestState((0, TempAuthKey_1.buildBindTempAuthKeyRequest)(binding.permAuthKey, this.authKey, this._state.sessionId, msgId, this._tempExpiresAt));
      state.forcedMsgId = msgId;
      this._binding = state;
      this._enqueueControl(state);
      let answer;
      try {
        answer = await state.promise;
      } catch (err) {
        if (this._lifecycle !== "connected" || this._connection !== connection) {
          return;
        }
        this._failBinding(err);
        throw err;
      } finally {
        if (this._binding === state)
          this._binding = undefined;
      }
      if (answer !== true) {
        const err = new Error(`bindTempAuthKey answered ${answer}`);
        this._failBinding(err);
        throw err;
      }
      this._tempBound = true;
      this._needsInitConnection = true;
      this._gateOpen = true;
      this._log.debug(`Bound temp auth key for dc ${this._dcId}`);
      this._wakeUp();
    }
    _failBinding(err) {
      this._tempBinding.onFailed(err);
      this._giveUp(err instanceof Error ? err : new Error(String(err)), "rekey", false);
    }
    async _disconnect() {
      const connection = this._connection;
      this._lifecycleCallback?.("disconnect");
      if (this._updateCallback) {
        this._updateCallback(this._client, new UpdateConnectionState_1.UpdateConnectionState(UpdateConnectionState_1.UpdateConnectionState.disconnected));
      }
      if (connection === undefined) {
        this._log.info("Not disconnecting (already have no connection)");
        return;
      }
      this._log.debug("Disconnecting from %s...".replace("%s", connection.toString()));
      if (this._lifecycle !== "reconnecting" && this._lifecycle !== "dead") {
        this._lifecycle = "disconnected";
      }
      this._log.debug("Closing current connection...");
      this._stopIo();
      await connection.disconnect();
    }
    _startIo(connection) {
      if (this._io?.alive && this._io.connection === connection) {
        return;
      }
      const io = { alive: true, connection };
      this._io = io;
      this._writeDeadline = 0;
      if (this._watchdog)
        clearInterval(this._watchdog);
      this._watchdog = setInterval(() => this._watch(), WATCHDOG_INTERVAL_MS);
      this._watchdog.unref?.();
      this._log.debug("Starting I/O loops");
      this._readLoop(io).catch((err) => this._log.error(`Read loop crashed for dc ${this._dcId}`, err));
      this._writeLoop(io).catch((err) => this._log.error(`Write loop crashed for dc ${this._dcId}`, err));
    }
    _stopIo() {
      if (this._watchdog) {
        clearInterval(this._watchdog);
        this._watchdog = undefined;
      }
      if (this._io) {
        this._io.alive = false;
        this._io = undefined;
      }
      const binding = this._binding;
      if (binding) {
        this._binding = undefined;
        if (binding.msgId)
          this._pendingState.delete(binding.msgId);
        binding.reject(new Error(`Connection to dc ${this._dcId} was lost while binding the temporary key`));
      }
      this._wakeUp();
    }
    _watch() {
      if (this._lifecycle !== "connected" || !this._io?.alive)
        return;
      const now = Date.now();
      const waiting = this._pendingState._pending.size;
      if (waiting > 0) {
        const quietUntil = Math.max(this.lastReadAt + this._silenceMs, this._writeDeadline);
        if (now > quietUntil) {
          this._log.info(`dc ${this._dcId} sent nothing for ${Math.round((now - this.lastReadAt) / 1000)}s while ${waiting} request(s) wait, reconnecting`);
          this._transportLost();
          return;
        }
      }
      this._probeUnanswered(now, PROBE_AFTER_MS);
    }
    _probeUnanswered(now, after) {
      for (const [key, probe] of this._probes) {
        if (now - probe.at >= PROBE_EXPIRY_MS)
          this._probes.delete(key);
      }
      let ids = [];
      for (const state of this._pendingState.values()) {
        if (!state.msgId || state.sentAt === undefined)
          continue;
        if (now - (state.probedAt ?? state.sentAt) < after)
          continue;
        state.probedAt = now;
        ids.push(state.msgId);
        if (ids.length === PROBE_MAX_IDS) {
          this._sendProbe(ids, now);
          ids = [];
        }
      }
      if (ids.length)
        this._sendProbe(ids, now);
    }
    _sendProbe(ids, now) {
      const probe = new RequestState_1.RequestState(new tl_1.Api.MsgsStateReq({ msgIds: ids }));
      probe.forcedMsgId = this._state._getNewMsgId();
      this._probes.set(probe.forcedMsgId.toString(), { ids, at: now });
      this._log.debug(`Probing ${ids.length} unanswered request(s) on dc ${this._dcId}`);
      this._enqueueControl(probe);
    }
    _onStateInfo(reqMsgId, info) {
      const key = reqMsgId.toString();
      const probe = this._probes.get(key);
      if (!probe)
        return;
      this._probes.delete(key);
      const codes = Buffer.isBuffer(info) ? info : Buffer.from(String(info), "binary");
      const resend = [];
      probe.ids.forEach((id, index) => {
        if (index >= codes.length)
          return;
        const state = this._pendingState.get(id);
        if (!state || this._controlStates.has(state))
          return;
        if ((codes[index] & 7) === 4)
          return;
        this._pendingState.delete(id);
        resend.push(state);
      });
      if (!resend.length)
        return;
      this._log.info(`Resending ${resend.length} request(s) the server never received on dc ${this._dcId}`);
      this._requeue(resend);
    }
    _replyWindow(bytes) {
      return Math.max(this._silenceMs, Math.min(SEND_SILENCE_CAP_MS, bytes / SEND_BYTES_PER_SECOND * 1000));
    }
    async _writeLoop(io) {
      while (io.alive) {
        if (this._pendingAck.size) {
          const ack = new RequestState_1.RequestState(new MsgsAck({ msgIds: Array(...this._pendingAck) }));
          this._pendingAck.clear();
          this._lastAcks.push(ack);
          if (this._lastAcks.length >= 10) {
            this._lastAcks.shift();
          }
          this._controlStates.add(ack);
          this._control.push(ack);
        }
        const queue = this._control.length ? this._control : this._gateOpen && this._queued.length ? this._queued : undefined;
        if (!queue) {
          await new Promise((resolve) => {
            this._wakeWriter = resolve;
          });
          continue;
        }
        if (queue === this._queued)
          this._wrapInitConnection();
        const res = await (0, packing_1.packRequestBatch)(this._state, queue, this._log);
        if (!res)
          continue;
        let { data } = res;
        const { batch } = res;
        this._log.debug(`Sending ${batch.length} message(s): ${batch.map((m) => m.request.className).join(",")}`);
        try {
          data = await this._state.encryptMessageData(data);
        } catch (e) {
          this._requeue(batch);
          if (io.alive) {
            this._log.error(`Failed to encrypt batch for dc ${this._dcId}`, e);
            this._transportLost();
          }
          return;
        }
        if (!io.alive) {
          this._requeue(batch);
          return;
        }
        if (batch.some((state) => state.cancelled)) {
          this._requeue(batch);
          continue;
        }
        try {
          await io.connection.send(data);
        } catch (e) {
          this._requeue(batch);
          if (io.alive) {
            this._log.debug(`Connection closed while sending data ${e}`);
            this._transportLost();
          }
          return;
        }
        const sentAt = Date.now();
        let expectsReply = false;
        for (const state of batch) {
          state.sentAt = sentAt;
          state.probedAt = undefined;
          if (!state.cancelled && state.request.classType === "request") {
            this._pendingState.set(state.msgId, state);
            expectsReply = true;
          }
        }
        if (expectsReply) {
          this._writeDeadline = Math.max(this._writeDeadline, sentAt + this._replyWindow(data.length));
        }
      }
    }
    async _readLoop(io) {
      let body;
      let message;
      while (io.alive) {
        try {
          body = await io.connection.recv();
        } catch (e) {
          if (!io.alive) {
            return;
          }
          this._onReadFailure(e);
          return;
        }
        this._lastReadAt = Date.now();
        try {
          message = await this._state.decryptMessageData(body);
        } catch (e) {
          if (e instanceof MTProtoState_1.DuplicateMessageError) {
            this._pendingAck.add(e.msgId);
            continue;
          }
          this._log.debug(`Error while receiving items from the network ${e}`);
          if (e instanceof errors_1.TypeNotFoundError) {
            if (this._isMainSender)
              this._client.updateManager.catchUp();
            this._log.info(`Type ${e.invalidConstructorId} not found, remaining data ${e.remaining}`);
            continue;
          }
          if (e instanceof errors_1.SecurityError) {
            if (/invalid auth key/i.test(e.message)) {
              this._handleBadAuthKey();
              return;
            }
            this._log.warn(`Security error while unpacking a received message: ${e}`);
            continue;
          }
          if (e instanceof errors_1.InvalidBufferError && e.code === 404) {
            this._handleBadAuthKey();
            return;
          }
          if (e instanceof errors_1.InvalidBufferError) {
            await this._client._errorHandler?.(e);
          }
          continue;
        }
        this._currentRetries = 0;
        this._keyRejections = 0;
        if (this._client && this._isMainSender) {
          this._client._lastReceivedAt = Date.now();
        }
        this._log.debug(`[RECV] Decrypted msgId=${message.msgId} type=${message.obj?.className || "unknown"} bodyLen=${body.length}`);
        try {
          await this._dispatcher.process(message);
        } catch (e) {
          if (e instanceof errors_1.TypeNotFoundError) {
            if (this._isMainSender)
              this._client.updateManager.catchUp();
            this._log.info(`Unknown constructor ${e.invalidConstructorId} in update, skipping (remaining: ${e.remaining.length} bytes)`);
          } else if (!(e instanceof errors_1.RPCError)) {
            this._log.error("Unhandled error while receiving data", e);
            if (this._client._errorHandler) {
              await this._client._errorHandler(e);
            }
          }
        }
        if (this._shortLived !== 0 && Date.now() - this._connectedAt >= STABLE_CONNECTION_MS) {
          this._shortLived = 0;
        }
      }
    }
    _onReadFailure(e) {
      if (e instanceof errors_1.InvalidBufferError && e.code === 404) {
        this._handleBadAuthKey();
        return;
      }
      if (e instanceof errors_1.InvalidBufferError && e.code === 429) {
        this._log.warn(`dc ${this._dcId} refused the connection: too many connections from this address, backing off`);
        this._transportLost(RECONNECT_DELAY_STEP_MS);
        return;
      }
      if (e instanceof errors_1.InvalidBufferError) {
        this._log.warn(`Transport error ${e.code} for dc ${this._dcId}, reconnecting`);
        this._transportLost();
        return;
      }
      const aliveFor = Date.now() - this._connectedAt;
      this._shortLived = aliveFor < STABLE_CONNECTION_MS ? this._shortLived + 1 : 0;
      this._log.info(`Connection to DC ${this._dcId} closed by server after ${aliveFor}ms (${e}), reconnecting`);
      if (this._shortLived >= FLAPPING_CONNECTIONS && this._shortLived % FLAPPING_CONNECTIONS === 0) {
        this._log.warn(`Connection to DC ${this._dcId} died ${this._shortLived} times in a row without staying up for ${STABLE_CONNECTION_MS / 1000}s: the network path (or proxy) keeps dropping it`);
      }
      this._transportLost();
    }
    _handleBadAuthKey(shouldSkipForMain = false) {
      if (shouldSkipForMain) {
        if (this._isMainSender)
          return;
        this._log.info(`Authorization is not imported on dc ${this._dcId}, re-importing on a fresh session`);
        this._giveUp(new Error(`Authorization for dc ${this._dcId} was not imported`), "rekey", false);
        return;
      }
      if (this._tempBinding) {
        this._log.info(`Temp auth key for dc ${this._dcId} expired on the server, re-keying on a fresh session`);
        this._tempBound = false;
        this._transportLost();
        return;
      }
      if (this._keyRejections++ === 0) {
        this._log.info(`dc ${this._dcId} did not recognise the auth key, retrying on a fresh session`);
        this._startNewSession();
        this._transportLost();
        return;
      }
      this._log.warn(`Broken authorization key for dc ${this._dcId}, resetting...`);
      if (!this._isMainSender) {
        this._giveUp(new Error(`Authorization key for dc ${this._dcId} was rejected by the server`), "auth-broken", false);
        return;
      }
      if (this._updateCallback) {
        this._updateCallback(this._client, new UpdateConnectionState_1.UpdateConnectionState(UpdateConnectionState_1.UpdateConnectionState.broken));
      }
      this.authKey.setKey(undefined);
      this._transportLost();
      Promise.resolve(this._authKeyCallback?.(undefined, this._dcId)).catch(() => {});
    }
    reconnect() {
      this._transportLost();
    }
    _transportLost(minDelayMs = 0) {
      if (this._lifecycle !== "connected") {
        return;
      }
      if (!this._autoReconnect) {
        this._disconnect().catch(() => {});
        this._giveUp(new Error(`Connection to dc ${this._dcId} was lost`), "disconnected", false);
        return;
      }
      this._lifecycle = "reconnecting";
      this._lifecycleCallback?.("reconnecting");
      this._disconnect().catch(() => {});
      this._scheduleReconnect(minDelayMs);
    }
    _scheduleReconnect(minDelayMs) {
      const attempt = this._currentRetries++;
      const delay = Math.max(minDelayMs, Math.min(attempt, RECONNECT_DELAY_STEPS) * RECONNECT_DELAY_STEP_MS);
      (0, Helpers_1.sleep)(delay).then(() => this._reconnect()).catch((err) => {
        this._log.error(`Unexpected error during reconnect to dc ${this._dcId}`, err);
        this._giveUp(new Error(`Could not reconnect to dc ${this._dcId}`), "disconnected", true);
      });
    }
    _giveUp(error, reason, broken) {
      const wasDead = this._lifecycle === "dead";
      this._lifecycle = "dead";
      this._stopIo();
      this._connection?.disconnect().catch(() => {});
      if (broken && this._updateCallback) {
        this._updateCallback(this._client, new UpdateConnectionState_1.UpdateConnectionState(UpdateConnectionState_1.UpdateConnectionState.broken));
      }
      if (!this._isMainSender && !wasDead) {
        this._onConnectionBreak?.(this._dcId, reason);
      }
      this._failAllPending(error);
    }
    async _reconnect() {
      if (this._lifecycle !== "reconnecting")
        return;
      if (this._currentRetries > this._reconnectRetries) {
        this._giveUp(new Error("Maximum reconnection retries reached. Aborting!"), "disconnected", true);
        return;
      }
      const previous = this._connection;
      const connection = new previous.constructor({
        ip: previous._ip,
        port: previous._port,
        dcId: previous._dcId,
        loggers: previous._log,
        proxy: previous._proxy,
        socket: this._client.networkSocket,
        keepAliveInterval: previous._keepAliveInterval,
        testServers: previous._testServers
      });
      this._connection = connection;
      try {
        await this._connect();
      } catch (err) {
        if (this._lifecycle !== "reconnecting")
          return;
        this._log.warn(`Reconnect to dc ${this._dcId} failed: ${err}`);
        this._scheduleReconnect(0);
        return;
      }
      if (!this.isConnected())
        return;
      this._announceConnected();
      this._probeUnanswered(Date.now(), 0);
      this._wakeUp();
      if (this._autoReconnectCallback) {
        await this._autoReconnectCallback();
      }
    }
  }
  exports2.MTProtoSender = MTProtoSender;
});

// node_modules/teleproto/network/SenderSlot.js
var require_SenderSlot = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.SenderSlot = exports2.SlotRemovedError = undefined;

  class SlotRemovedError extends Error {
    constructor(reason) {
      super(`sender slot removed: ${reason}`);
      this.name = "SlotRemovedError";
    }
  }
  exports2.SlotRemovedError = SlotRemovedError;

  class SenderSlot {
    constructor(opts) {
      this._deathListeners = new Set;
      this._active = 0;
      this.dcId = opts.dcId;
      this._opts = opts;
    }
    get state() {
      if (this._dead)
        return "dead";
      if (this._sender?.isConnected())
        return "ready";
      if (this._connectPromise || this._sender?.isReconnecting)
        return "connecting";
      return "idle";
    }
    get sender() {
      return this._sender;
    }
    async ensureConnected() {
      if (this._dead) {
        throw new SlotRemovedError(this._dead);
      }
      if (this._sender && (this._sender.isConnected() || this._sender.isReconnecting)) {
        return this._sender;
      }
      if (this._connectPromise) {
        return this._connectPromise;
      }
      this._clearIdle();
      this._connectPromise = (async () => {
        try {
          const sender = await this._opts.connect(this);
          if (this._dead) {
            try {
              await sender.disconnect();
            } catch {}
            throw new SlotRemovedError(this._dead);
          }
          this._sender = sender;
          if (this._active === 0)
            this._armIdle();
          return sender;
        } catch (err) {
          if (this._dead) {
            if (!(err instanceof SlotRemovedError)) {
              throw new SlotRemovedError(this._dead);
            }
            throw err;
          }
          throw err;
        } finally {
          this._connectPromise = undefined;
        }
      })();
      return this._connectPromise;
    }
    enter() {
      this._active++;
      this._clearIdle();
    }
    leave() {
      if (this._active > 0)
        this._active--;
      if (this._active === 0 && this._sender)
        this._armIdle();
    }
    onDeath(listener) {
      if (this._dead) {
        listener(this._dead);
        return () => {};
      }
      this._deathListeners.add(listener);
      return () => this._deathListeners.delete(listener);
    }
    async markDead(reason) {
      if (this._dead)
        return;
      this._dead = reason;
      this._clearIdle();
      for (const listener of this._deathListeners) {
        try {
          listener(reason);
        } catch {}
      }
      this._deathListeners.clear();
      const s = this._sender;
      this._sender = undefined;
      if (s) {
        try {
          await s.disconnect();
        } catch {}
      }
    }
    _clearIdle() {
      if (this._idleTimer) {
        clearTimeout(this._idleTimer);
        this._idleTimer = undefined;
      }
    }
    _armIdle() {
      if (this._dead)
        return;
      this._clearIdle();
      if (this._opts.idleTimeoutMs <= 0)
        return;
      this._idleTimer = setTimeout(() => {
        this._idleTimer = undefined;
        this._idleTick();
      }, this._opts.idleTimeoutMs);
    }
    _idleTick() {
      if (this._dead || this._active > 0 || !this._sender)
        return;
      if (this._sender.hasPendingWork || this._sender.isReconnecting) {
        this._armIdle();
        return;
      }
      const s = this._sender;
      this._sender = undefined;
      if (s) {
        s.disconnect().catch(() => {});
      }
    }
  }
  exports2.SenderSlot = SenderSlot;
});

// node_modules/teleproto/network/core_types.js
var require_core_types = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.kBaseUploadDcShift = exports2.kBaseDownloadDcShift = exports2.kMaxMediaDcCount = exports2.kExportMediaDcShift = exports2.kExportDcShift = exports2.kUpdaterDcShift = exports2.kLogoutDcShift = exports2.kConfigDcShift = exports2.kDcShift = undefined;
  exports2.bareDcId = bareDcId;
  exports2.shiftDcId = shiftDcId;
  exports2.getDcIdShift = getDcIdShift;
  exports2.downloadDcId = downloadDcId;
  exports2.uploadDcId = uploadDcId;
  exports2.isDownloadDcId = isDownloadDcId;
  exports2.isUploadDcId = isUploadDcId;
  exports2.kDcShift = 1e4;
  exports2.kConfigDcShift = 1;
  exports2.kLogoutDcShift = 2;
  exports2.kUpdaterDcShift = 3;
  exports2.kExportDcShift = 4;
  exports2.kExportMediaDcShift = 5;
  exports2.kMaxMediaDcCount = 16;
  exports2.kBaseDownloadDcShift = 16;
  exports2.kBaseUploadDcShift = 32;
  function bareDcId(shiftedDcId) {
    return shiftedDcId % exports2.kDcShift;
  }
  function shiftDcId(dcId, shift) {
    return dcId + exports2.kDcShift * shift;
  }
  function getDcIdShift(shiftedDcId) {
    return Math.floor(shiftedDcId / exports2.kDcShift);
  }
  function downloadDcId(dcId, index) {
    return shiftDcId(dcId, exports2.kBaseDownloadDcShift + index);
  }
  function uploadDcId(dcId, index) {
    return shiftDcId(dcId, exports2.kBaseUploadDcShift + index);
  }
  function isDownloadDcId(shiftedDcId) {
    const shift = getDcIdShift(shiftedDcId);
    return shift >= exports2.kBaseDownloadDcShift && shift < exports2.kBaseDownloadDcShift + exports2.kMaxMediaDcCount;
  }
  function isUploadDcId(shiftedDcId) {
    const shift = getDcIdShift(shiftedDcId);
    return shift >= exports2.kBaseUploadDcShift && shift < exports2.kBaseUploadDcShift + exports2.kMaxMediaDcCount;
  }
});

// node_modules/teleproto/network/Network.js
var require_Network = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Network = undefined;
  var SenderSlot_1 = require_SenderSlot();
  var core_types_1 = require_core_types();
  var TempAuthKey_1 = require_TempAuthKey();
  var AuthKey_1 = require_AuthKey();
  var Helpers_1 = require_Helpers();

  class Network {
    constructor(client, opts) {
      this._slots = new Map;
      this._connectChains = new Map;
      this._lastConnectAt = new Map;
      this._closed = false;
      this._client = client;
      this._opts = opts;
    }
    dcenter(dcId) {
      return this._client._dcenters.get(dcId, this._client.session.getAuthKey(dcId));
    }
    getSession(shiftedDcId) {
      if (this._closed)
        throw new Error("Network is closed");
      let slot = this._slots.get(shiftedDcId);
      if (!slot || slot.state === "dead") {
        slot = this._makeSlot(shiftedDcId);
        this._slots.set(shiftedDcId, slot);
      }
      return slot;
    }
    async lease(dcId) {
      const slot = this.getSession(dcId);
      const sender = await slot.ensureConnected();
      slot.enter();
      let released = false;
      return {
        sender,
        release: () => {
          if (released)
            return;
          released = true;
          slot.leave();
        }
      };
    }
    removeSession(shiftedDcId) {
      const slot = this._slots.get(shiftedDcId);
      if (slot) {
        this._slots.delete(shiftedDcId);
        slot.markDead("manual").catch(() => {});
      }
    }
    _makeSlot(shiftedDcId) {
      const dcId = (0, core_types_1.bareDcId)(shiftedDcId);
      const dcenter = this.dcenter(dcId);
      const slot = new SenderSlot_1.SenderSlot({
        dcId,
        idleTimeoutMs: this._opts.idleTimeoutMs,
        log: this._client._log,
        connect: async () => {
          if (dcenter.authKey.getKey() || this._client.session.getAuthKey(dcId)?.getKey()) {
            return this._gatedConnect(dcId, shiftedDcId, slot, dcenter);
          }
          const chain = this._connectChains.get(dcId) ?? Promise.resolve();
          const ours = chain.then(() => this._gatedConnect(dcId, shiftedDcId, slot, dcenter));
          this._connectChains.set(dcId, ours.catch(() => {}));
          return ours;
        }
      });
      return slot;
    }
    async _gatedConnect(dcId, shiftedDcId, slot, dcenter) {
      const gap = this._opts.sessionStartupDelayMs;
      const last = this._lastConnectAt.get(shiftedDcId) ?? 0;
      if (gap > 0 && last > 0) {
        const wait = gap - (Date.now() - last);
        if (wait > 0)
          await (0, Helpers_1.sleep)(wait);
      }
      try {
        const sessionKey = this._client.session.getAuthKey(dcId)?.getKey();
        const ownKey = dcenter.authKey.getKey();
        const isHome = dcId === this._client.session.dcId;
        if (sessionKey && (!ownKey || isHome && !sessionKey.equals(ownKey))) {
          await dcenter.authKey.setKey(sessionKey);
        }
        const isMedia = (0, core_types_1.isDownloadDcId)(shiftedDcId) || (0, core_types_1.isUploadDcId)(shiftedDcId);
        const useTemp = isMedia && dcenter.mediaTempUsable && !!dcenter.authKey.getKey();
        const log = this._client._log;
        const sender = this._client._makeSender(dcId, (_dc, reason) => this._onSenderBreak(shiftedDcId, slot, dcenter, reason), useTemp ? new AuthKey_1.AuthKey : dcenter.authKey, true, useTemp ? {
          permAuthKey: dcenter.authKey,
          dcParam: -(dcId + (this._client._testServers ? 1e4 : 0)),
          expiresIn: TempAuthKey_1.TEMP_KEY_EXPIRES_IN,
          onFailed: (err) => {
            dcenter.mediaTempFailed = true;
            log.info(`Temp-key binding failed for dc ${dcId}, media sessions fall back to the permanent key (${err instanceof Error ? err.message : err})`);
          }
        } : undefined, isMedia ? this._client._media?.opts.requestDeadlineMs : undefined);
        return await this._client._connectSender(sender, dcId, undefined, isMedia);
      } finally {
        this._lastConnectAt.set(shiftedDcId, Date.now());
      }
    }
    _onSenderBreak(shiftedDcId, slot, dcenter, reason = "disconnected") {
      if (this._slots.get(shiftedDcId) === slot) {
        this._slots.delete(shiftedDcId);
      }
      const dcId = (0, core_types_1.bareDcId)(shiftedDcId);
      if (reason !== "disconnected")
        dcenter.needsImport = true;
      if (reason === "auth-broken" && dcId !== this._client.session.dcId) {
        dcenter.authKey.setKey(undefined).catch(() => {});
        this._client.session.setAuthKey(undefined, dcId);
      }
      slot.markDead(reason === "disconnected" ? "disconnected" : "auth-broken").catch(() => {});
    }
    async purge() {
      const dying = [...this._slots.values()];
      this._slots.clear();
      await Promise.all(dying.map((s) => s.markDead("manual").catch(() => {})));
    }
    async close() {
      this._closed = true;
      const dying = [...this._slots.values()];
      this._slots.clear();
      await Promise.all(dying.map((s) => s.markDead("pool-closed").catch(() => {})));
    }
  }
  exports2.Network = Network;
});

// node_modules/teleproto/network/BalancePolicy.js
var require_BalancePolicy = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.BalancePolicy = exports2.UPLOAD_BALANCE = exports2.DOWNLOAD_BALANCE = undefined;
  exports2.normalizeBalanceOptions = normalizeBalanceOptions;
  exports2.DOWNLOAD_BALANCE = {
    partSize: 512 * 1024,
    sessions: 4,
    inFlight: 4
  };
  exports2.UPLOAD_BALANCE = {
    partSize: 512 * 1024,
    sessions: 8,
    inFlight: 2
  };
  function normalizeBalanceOptions(opts, base) {
    const partSize = opts.partSize && opts.partSize > 0 ? opts.partSize : base.partSize;
    const sessions = Math.max(1, opts.sessions ?? opts.startSessions ?? base.sessions);
    const inFlight = Math.max(1, opts.inFlight ?? (opts.startWindow && opts.startWindow > 0 ? Math.round(opts.startWindow / partSize) : base.inFlight));
    return { ...base, ...opts, partSize, sessions, inFlight };
  }

  class BalancePolicy {
    constructor(opts, _now = Date.now) {
      this._sessions = [];
      this._nextId = 0;
      this.opts = normalizeBalanceOptions(opts, opts);
      this._window = this.opts.inFlight * this.opts.partSize;
      for (let i = 0;i < this.opts.sessions; i++) {
        this._sessions.push(this._fresh());
      }
    }
    _fresh() {
      return { id: this._nextId++, requested: 0 };
    }
    _byId(id) {
      return this._sessions.find((s) => s.id === id);
    }
    get sessionCount() {
      return this._sessions.length;
    }
    get sessionIds() {
      return this._sessions.map((s) => s.id);
    }
    get window() {
      return this._window;
    }
    pick(bytes) {
      let best = -1;
      let bestLoad = Infinity;
      for (const s of this._sessions) {
        const fits = s.requested === 0 || s.requested + bytes <= this._window;
        if (fits && s.requested < bestLoad) {
          best = s.id;
          bestLoad = s.requested;
        }
      }
      return best;
    }
    start(id, bytes) {
      const s = this._byId(id);
      if (!s)
        return { wasFull: false };
      s.requested += bytes;
      return { wasFull: s.requested >= this._window };
    }
    succeed(id, bytes, _wasFull = false, _durationMs = 0) {
      this.release(id, bytes);
      return { addedSession: false, addedId: -1 };
    }
    fail(id, bytes) {
      this.release(id, bytes);
      return { removedId: -1 };
    }
    replace(id) {
      const s = this._byId(id);
      if (!s)
        return -1;
      const fresh = this._fresh();
      this._sessions.splice(this._sessions.indexOf(s), 1, fresh);
      return fresh.id;
    }
    remove(id) {
      return this.replace(id) >= 0;
    }
    release(id, bytes) {
      const s = this._byId(id);
      if (s)
        s.requested = Math.max(0, s.requested - bytes);
    }
    get totalRequested() {
      return this._sessions.reduce((a, s) => a + s.requested, 0);
    }
  }
  exports2.BalancePolicy = BalancePolicy;
});

// node_modules/teleproto/network/MediaScheduler.js
var require_MediaScheduler = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MediaScheduler = exports2.MediaAbortError = exports2.CdnRedirectError = exports2.DEFAULT_MEDIA_SCHEDULER_OPTIONS = undefined;
  var tl_1 = require_tl();
  var BalancePolicy_1 = require_BalancePolicy();
  var core_types_1 = require_core_types();
  var SenderSlot_1 = require_SenderSlot();
  var errors_1 = require_errors();
  var ONE_MB = 1024 * 1024;
  var MIN_CHUNK = 4096;
  var LIMITED_UPLOAD_DCS = new Set([2, 4]);
  var LIMITED_UPLOAD_SESSIONS = 4;
  var SPACING_START_MS = 50;
  var SPACING_MIN_MS = 3;
  var SPACING_DECAY = 0.8;
  var SPACING_IDLE_MS = 1000;
  var SERVER_RETRY_CAP_MS = 16000;
  exports2.DEFAULT_MEDIA_SCHEDULER_OPTIONS = {
    partSize: 512 * 1024,
    requestRetries: 5,
    requestDeadlineMs: 15000,
    cdnSupported: false,
    download: BalancePolicy_1.DOWNLOAD_BALANCE,
    upload: BalancePolicy_1.UPLOAD_BALANCE
  };

  class CdnRedirectError extends Error {
    constructor(redirect) {
      super("upload.fileCdnRedirect");
      this.redirect = redirect;
      this.name = "CdnRedirectError";
    }
  }
  exports2.CdnRedirectError = CdnRedirectError;

  class MediaAbortError extends Error {
    constructor() {
      super("Media operation aborted");
      this.name = "MediaAbortError";
    }
  }
  exports2.MediaAbortError = MediaAbortError;

  class DcBalance {
    constructor(dcId, kind, opts) {
      this.dcId = dcId;
      this.kind = kind;
      this.shiftedById = new Map;
      this.waiters = [];
      this.completed = 0;
      this._spacingMs = SPACING_START_MS;
      this._nextSendAt = 0;
      if (kind === "upload" && LIMITED_UPLOAD_DCS.has(dcId)) {
        opts = {
          ...opts,
          sessions: Math.min(opts.sessions, LIMITED_UPLOAD_SESSIONS)
        };
      }
      this.policy = new BalancePolicy_1.BalancePolicy(opts);
      this.policy.sessionIds.forEach((id, i) => {
        this.shiftedById.set(id, kind === "download" ? (0, core_types_1.downloadDcId)(dcId, i) : (0, core_types_1.uploadDcId)(dcId, i));
      });
    }
    async pace(signal) {
      const now = Date.now();
      if (now - this._nextSendAt > SPACING_IDLE_MS) {
        this._spacingMs = SPACING_START_MS;
      }
      const at = Math.max(now, this._nextSendAt);
      this._nextSendAt = at + this._spacingMs;
      this._spacingMs = Math.max(SPACING_MIN_MS, this._spacingMs * SPACING_DECAY);
      if (at > now)
        await sleepOrAbort(at - now, signal);
    }
    wakeOne() {
      const w = this.waiters.shift();
      if (w)
        w();
    }
    wakeAll() {
      for (const w of this.waiters.splice(0))
        w();
    }
  }

  class MediaScheduler {
    constructor(client, network, opts) {
      this._balances = new Map;
      this._closed = false;
      this._client = client;
      this._network = network;
      const merged = {
        ...exports2.DEFAULT_MEDIA_SCHEDULER_OPTIONS,
        ...opts || {},
        download: { ...exports2.DEFAULT_MEDIA_SCHEDULER_OPTIONS.download },
        upload: { ...exports2.DEFAULT_MEDIA_SCHEDULER_OPTIONS.upload }
      };
      if (opts && typeof opts === "object") {
        if (opts.inflightPerDc && opts.inflightPerDc > 0) {
          merged.download.inFlight = opts.inflightPerDc;
          merged.upload.inFlight = opts.inflightPerDc;
        }
        if (opts.sessions && opts.sessions > 0) {
          merged.download.sessions = opts.sessions;
          merged.upload.sessions = opts.sessions;
        }
        if (opts.download) {
          merged.download = (0, BalancePolicy_1.normalizeBalanceOptions)(opts.download, merged.download);
        }
        if (opts.upload) {
          merged.upload = (0, BalancePolicy_1.normalizeBalanceOptions)(opts.upload, merged.upload);
        }
      }
      if (merged.partSize > ONE_MB)
        merged.partSize = ONE_MB;
      if (merged.partSize % MIN_CHUNK !== 0) {
        throw new Error("partSize must be a multiple of 4096");
      }
      merged.download.partSize = merged.partSize;
      merged.download = (0, BalancePolicy_1.normalizeBalanceOptions)(merged.download, merged.download);
      merged.upload = (0, BalancePolicy_1.normalizeBalanceOptions)(merged.upload, merged.upload);
      this.opts = merged;
    }
    _balance(dcId, kind) {
      const key = `${dcId}:${kind}`;
      let b = this._balances.get(key);
      if (!b) {
        b = new DcBalance(dcId, kind, kind === "download" ? this.opts.download : this.opts.upload);
        this._balances.set(key, b);
      }
      return b;
    }
    async getFile(dcId, location, offset, limit, signal, onMigrate) {
      const request = new tl_1.Api.upload.GetFile({
        location,
        offset,
        limit,
        precise: false,
        cdnSupported: this.opts.cdnSupported
      });
      let currentDc = dcId;
      let migrations = 0;
      const retry = this._retryState("download", currentDc);
      while (true) {
        if (signal?.aborted)
          throw new MediaAbortError;
        try {
          const result = await this._run(currentDc, "download", limit, request, signal, retry.retried || migrations > 0);
          if (result instanceof tl_1.Api.upload.FileCdnRedirect) {
            throw new CdnRedirectError(result);
          }
          return result.bytes;
        } catch (err) {
          if (err instanceof CdnRedirectError)
            throw err;
          if (err instanceof errors_1.FileMigrateError) {
            if (++migrations >= this.opts.requestRetries)
              throw err;
            currentDc = err.newDc;
            onMigrate?.(currentDc);
            retry.moveTo(currentDc);
            continue;
          }
          await sleepOrAbort(retry.check(err), signal);
        }
      }
    }
    async savePart(dcId, request, signal) {
      const size = request.bytes.length;
      const retry = this._retryState("upload", dcId);
      while (true) {
        if (signal?.aborted)
          throw new MediaAbortError;
        try {
          return await this._run(dcId, "upload", size, request, signal, retry.retried);
        } catch (err) {
          await sleepOrAbort(retry.check(err), signal);
        }
      }
    }
    _retryState(kind, dcId) {
      let balance = this._balance(dcId, kind);
      let seen = balance.completed;
      let failures = 0;
      let floods = 0;
      const limit = this.opts.requestRetries;
      return {
        get retried() {
          return failures > 0 || floods > 0;
        },
        moveTo: (newDc) => {
          balance = this._balance(newDc, kind);
          seen = balance.completed;
          failures = 0;
        },
        check(err) {
          if (err instanceof MediaAbortError)
            throw err;
          if (isFlood(err)) {
            floods++;
            return Math.max(1, floodSeconds(err)) * 1000;
          }
          const lost = isTransportFailure(err);
          if (!lost && !isServerFailure(err))
            throw err;
          if (balance.completed !== seen) {
            seen = balance.completed;
            failures = 0;
          }
          if (++failures >= limit)
            throw err;
          return lost ? 0 : Math.min(SERVER_RETRY_CAP_MS, 1000 * 2 ** (failures - 1));
        }
      };
    }
    async _run(dcId, kind, bytes, request, signal, priority = false) {
      if (this._closed)
        throw new Error("MediaScheduler is closed");
      const b = this._balance(dcId, kind);
      if (kind === "download")
        await b.pace(signal);
      let id = b.policy.pick(bytes);
      while (id < 0) {
        if (signal?.aborted)
          throw new MediaAbortError;
        await new Promise((resolve, reject) => {
          let off;
          const ticket = () => {
            off?.();
            resolve();
          };
          if (signal) {
            if (signal.aborted)
              return reject(new MediaAbortError);
            off = onAbort(signal, (err) => {
              const i = b.waiters.indexOf(ticket);
              if (i >= 0)
                b.waiters.splice(i, 1);
              reject(err);
            });
          }
          if (priority)
            b.waiters.unshift(ticket);
          else
            b.waiters.push(ticket);
        });
        id = b.policy.pick(bytes);
      }
      const { wasFull } = b.policy.start(id, bytes);
      const shiftedId = b.shiftedById.get(id);
      const started = Date.now();
      const slot = this._network.getSession(shiftedId);
      slot.enter();
      try {
        const sender = await slot.ensureConnected().catch((err) => {
          if (err instanceof SenderSlot_1.SlotRemovedError)
            throw err;
          this._client._log.info(`${kind} session ${shiftedId} on dc ${dcId} could not connect: ${err?.message ?? err}`);
          slot.markDead("disconnected").catch(() => {});
          throw new SenderSlot_1.SlotRemovedError("disconnected");
        });
        const result = await awaitReply(sender.send(request), slot, signal);
        b.policy.succeed(id, bytes, wasFull, Date.now() - started);
        b.completed++;
        return result;
      } catch (err) {
        if (isFlood(err)) {
          this._client._log.debug(`${kind} on dc ${dcId} hit ${err?.errorMessage ?? "FLOOD_WAIT"}, retrying that part in ${floodSeconds(err)}s`);
        }
        b.policy.release(id, bytes);
        throw err;
      } finally {
        slot.leave();
        b.wakeOne();
      }
    }
    async purge() {
      this._balances.clear();
    }
    async close() {
      this._closed = true;
      for (const b of this._balances.values())
        b.wakeAll();
      this._balances.clear();
    }
  }
  exports2.MediaScheduler = MediaScheduler;
  var abortHooks = new WeakMap;
  function onAbort(signal, hook) {
    let hooks = abortHooks.get(signal);
    if (!hooks) {
      const own2 = new Set;
      hooks = own2;
      abortHooks.set(signal, own2);
      signal.addEventListener("abort", () => {
        const pending = [...own2];
        own2.clear();
        for (const fn of pending)
          fn(new MediaAbortError);
      }, { once: true });
    }
    const own = hooks;
    own.add(hook);
    return () => own.delete(hook);
  }
  function isFlood(err) {
    return err instanceof errors_1.FloodWaitError || err instanceof errors_1.FloodTestPhoneWaitError || err?.errorMessage?.startsWith?.("FLOOD_WAIT_") || err?.errorMessage?.startsWith?.("FLOOD_PREMIUM_WAIT_");
  }
  function isTransportFailure(err) {
    return err instanceof SenderSlot_1.SlotRemovedError || err?.errorMessage === "AUTH_KEY_UNREGISTERED";
  }
  function isServerFailure(err) {
    return err instanceof errors_1.ServerError || err instanceof errors_1.TimedOutError || err?.errorMessage === "TIMEOUT" || typeof err?.code === "number" && (err.code >= 500 || err.code < 0);
  }
  function floodSeconds(err) {
    if (typeof err?.seconds === "number")
      return err.seconds;
    const tail = err?.errorMessage?.split?.("_")?.pop?.();
    const n = Number(tail);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  async function awaitReply(req, slot, signal) {
    let unsub;
    let off;
    const death = new Promise((_, reject) => {
      unsub = slot.onDeath((reason) => reject(new SenderSlot_1.SlotRemovedError(reason)));
    });
    const races = [death, req];
    if (signal) {
      races.push(new Promise((_, reject) => {
        if (signal.aborted)
          return reject(new MediaAbortError);
        off = onAbort(signal, reject);
      }));
    }
    try {
      return await Promise.race(races);
    } finally {
      unsub?.();
      off?.();
    }
  }
  async function sleepOrAbort(ms, signal) {
    if (ms <= 0)
      return;
    await new Promise((resolve, reject) => {
      let off;
      const t = setTimeout(() => {
        off?.();
        resolve();
      }, ms);
      if (signal) {
        if (signal.aborted) {
          clearTimeout(t);
          reject(new MediaAbortError);
          return;
        }
        off = onAbort(signal, (err) => {
          clearTimeout(t);
          reject(err);
        });
      }
    });
  }
});

// node_modules/teleproto/network/Dcenter.js
var require_Dcenter = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.DcenterRegistry = exports2.Dcenter = undefined;
  var big_integer_1 = __importDefault(require_BigInteger());
  var AuthKey_1 = require_AuthKey();

  class Dcenter {
    constructor(dcId, authKey) {
      this.mediaTempFailed = false;
      this.needsImport = false;
      this.dcId = dcId;
      this.authKey = authKey ?? new AuthKey_1.AuthKey;
      this._salt = big_integer_1.default.zero;
    }
    get mediaTempUsable() {
      return !this.mediaTempFailed;
    }
    get salt() {
      return this._salt;
    }
    updateSalt(salt) {
      if (salt && !salt.isZero()) {
        this._salt = salt;
      }
    }
  }
  exports2.Dcenter = Dcenter;

  class DcenterRegistry {
    constructor() {
      this._dcs = new Map;
    }
    get(dcId, seedKey) {
      let dc = this._dcs.get(dcId);
      if (!dc) {
        dc = new Dcenter(dcId, seedKey);
        this._dcs.set(dcId, dc);
      }
      return dc;
    }
    clear() {
      this._dcs.clear();
    }
  }
  exports2.DcenterRegistry = DcenterRegistry;
});

// node_modules/teleproto/network/OrderedWriter.js
var require_OrderedWriter = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.BoundedSemaphore = exports2.OrderedWriter = undefined;

  class OrderedWriter {
    constructor(writer) {
      this.nextIdx = 0;
      this._stash = new Map;
      this._draining = Promise.resolve();
      this._writer = writer;
    }
    async write(idx, data, after) {
      if (idx < this.nextIdx)
        return;
      this._stash.set(idx, data);
      this._draining = this._draining.then(() => this._drain(after));
      await this._draining;
    }
    async _drain(after) {
      while (this._stash.has(this.nextIdx)) {
        const buf = this._stash.get(this.nextIdx);
        this._stash.delete(this.nextIdx);
        if (buf.length > 0) {
          await this._writer.write(buf);
        }
        this.nextIdx++;
        if (after && buf.length > 0) {
          await after(buf.length);
        }
      }
    }
    reset(toIdx) {
      this.nextIdx = toIdx;
      for (const k of [...this._stash.keys()]) {
        if (k < toIdx)
          this._stash.delete(k);
      }
    }
  }
  exports2.OrderedWriter = OrderedWriter;

  class BoundedSemaphore {
    constructor(capacity) {
      this._waiters = [];
      if (capacity < 1)
        throw new Error("BoundedSemaphore capacity must be >= 1");
      this._available = capacity;
    }
    async acquire() {
      if (this._available > 0) {
        this._available--;
        return;
      }
      await new Promise((resolve) => this._waiters.push(resolve));
    }
    release() {
      const next = this._waiters.shift();
      if (next) {
        next();
        return;
      }
      this._available++;
    }
  }
  exports2.BoundedSemaphore = BoundedSemaphore;
});

// node_modules/teleproto/network/index.js
var require_network = __commonJS((exports2) => {
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
  exports2.BoundedSemaphore = exports2.OrderedWriter = exports2.DcenterRegistry = exports2.Dcenter = exports2.UPLOAD_BALANCE = exports2.DOWNLOAD_BALANCE = exports2.BalancePolicy = exports2.MediaAbortError = exports2.CdnRedirectError = exports2.MediaScheduler = exports2.Network = exports2.SlotRemovedError = exports2.SenderSlot = exports2.ConnectionTCPObfuscated = exports2.ConnectionTCPAbridged = exports2.ConnectionTCPFull = exports2.Connection = exports2.UpdateConnectionState = exports2.MTProtoSender = exports2.doAuthentication = exports2.MTProtoPlainSender = undefined;
  var MTProtoPlainSender_1 = require_MTProtoPlainSender();
  Object.defineProperty(exports2, "MTProtoPlainSender", { enumerable: true, get: function() {
    return MTProtoPlainSender_1.MTProtoPlainSender;
  } });
  var Authenticator_1 = require_Authenticator();
  Object.defineProperty(exports2, "doAuthentication", { enumerable: true, get: function() {
    return Authenticator_1.doAuthentication;
  } });
  var MTProtoSender_1 = require_MTProtoSender();
  Object.defineProperty(exports2, "MTProtoSender", { enumerable: true, get: function() {
    return MTProtoSender_1.MTProtoSender;
  } });
  var UpdateConnectionState_1 = require_UpdateConnectionState();
  Object.defineProperty(exports2, "UpdateConnectionState", { enumerable: true, get: function() {
    return UpdateConnectionState_1.UpdateConnectionState;
  } });
  var connection_1 = require_connection();
  Object.defineProperty(exports2, "Connection", { enumerable: true, get: function() {
    return connection_1.Connection;
  } });
  Object.defineProperty(exports2, "ConnectionTCPFull", { enumerable: true, get: function() {
    return connection_1.ConnectionTCPFull;
  } });
  Object.defineProperty(exports2, "ConnectionTCPAbridged", { enumerable: true, get: function() {
    return connection_1.ConnectionTCPAbridged;
  } });
  Object.defineProperty(exports2, "ConnectionTCPObfuscated", { enumerable: true, get: function() {
    return connection_1.ConnectionTCPObfuscated;
  } });
  var SenderSlot_1 = require_SenderSlot();
  Object.defineProperty(exports2, "SenderSlot", { enumerable: true, get: function() {
    return SenderSlot_1.SenderSlot;
  } });
  Object.defineProperty(exports2, "SlotRemovedError", { enumerable: true, get: function() {
    return SenderSlot_1.SlotRemovedError;
  } });
  var Network_1 = require_Network();
  Object.defineProperty(exports2, "Network", { enumerable: true, get: function() {
    return Network_1.Network;
  } });
  var MediaScheduler_1 = require_MediaScheduler();
  Object.defineProperty(exports2, "MediaScheduler", { enumerable: true, get: function() {
    return MediaScheduler_1.MediaScheduler;
  } });
  Object.defineProperty(exports2, "CdnRedirectError", { enumerable: true, get: function() {
    return MediaScheduler_1.CdnRedirectError;
  } });
  Object.defineProperty(exports2, "MediaAbortError", { enumerable: true, get: function() {
    return MediaScheduler_1.MediaAbortError;
  } });
  var BalancePolicy_1 = require_BalancePolicy();
  Object.defineProperty(exports2, "BalancePolicy", { enumerable: true, get: function() {
    return BalancePolicy_1.BalancePolicy;
  } });
  Object.defineProperty(exports2, "DOWNLOAD_BALANCE", { enumerable: true, get: function() {
    return BalancePolicy_1.DOWNLOAD_BALANCE;
  } });
  Object.defineProperty(exports2, "UPLOAD_BALANCE", { enumerable: true, get: function() {
    return BalancePolicy_1.UPLOAD_BALANCE;
  } });
  var Dcenter_1 = require_Dcenter();
  Object.defineProperty(exports2, "Dcenter", { enumerable: true, get: function() {
    return Dcenter_1.Dcenter;
  } });
  Object.defineProperty(exports2, "DcenterRegistry", { enumerable: true, get: function() {
    return Dcenter_1.DcenterRegistry;
  } });
  __exportStar(require_core_types(), exports2);
  var OrderedWriter_1 = require_OrderedWriter();
  Object.defineProperty(exports2, "OrderedWriter", { enumerable: true, get: function() {
    return OrderedWriter_1.OrderedWriter;
  } });
  Object.defineProperty(exports2, "BoundedSemaphore", { enumerable: true, get: function() {
    return OrderedWriter_1.BoundedSemaphore;
  } });
});

// node_modules/teleproto/client/updates/channelScheduler.js
var require_channelScheduler = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ChannelScheduler = exports2.ChannelPollCancelledError = undefined;

  class ChannelPollCancelledError extends Error {
    constructor() {
      super("Channel polling cancelled");
      this.name = "AbortError";
    }
  }
  exports2.ChannelPollCancelledError = ChannelPollCancelledError;

  class ChannelScheduler {
    constructor(interval, concurrency) {
      this.interval = interval;
      this.concurrency = concurrency;
      this.queue = [];
      this.active = new Set;
      this.running = false;
      this.nextStartAt = 0;
      this.pausedUntil = 0;
    }
    start() {
      this.running = true;
      this.pump();
    }
    stop() {
      this.running = false;
      if (this.timer)
        clearTimeout(this.timer);
      this.timer = undefined;
      for (const job of [...this.queue, ...this.active]) {
        job.reject(new ChannelPollCancelledError);
      }
      this.queue.length = 0;
      this.active.clear();
    }
    cancel(channelId) {
      for (let index = this.queue.length - 1;index >= 0; index--) {
        const job = this.queue[index];
        if (job.channelId !== channelId)
          continue;
        this.queue.splice(index, 1);
        job.reject(new ChannelPollCancelledError);
      }
      this.pump();
    }
    pause(milliseconds) {
      this.pausedUntil = Math.max(this.pausedUntil, Date.now() + milliseconds);
      this.pump();
    }
    get state() {
      return {
        pendingRequests: this.queue.length,
        activeRequests: this.active.size,
        pausedUntil: this.pausedUntil > Date.now() ? this.pausedUntil : undefined
      };
    }
    schedule(channelId, run) {
      if (!this.running)
        return Promise.reject(new ChannelPollCancelledError);
      return new Promise((resolve, reject) => {
        this.queue.push({ channelId, run, resolve, reject });
        this.pump();
      });
    }
    pump() {
      if (this.timer)
        clearTimeout(this.timer);
      this.timer = undefined;
      if (!this.running || !this.queue.length || this.active.size >= this.concurrency)
        return;
      const index = this.queue.findIndex((job2) => ![...this.active].some((active) => active.channelId === job2.channelId));
      if (index < 0)
        return;
      const delay = Math.max(this.nextStartAt, this.pausedUntil) - Date.now();
      if (delay > 0) {
        this.timer = setTimeout(() => {
          this.timer = undefined;
          this.pump();
        }, Math.min(delay, 2147483647));
        return;
      }
      const [job] = this.queue.splice(index, 1);
      this.active.add(job);
      this.nextStartAt = Date.now() + this.interval;
      Promise.resolve().then(() => {
        if (!this.running || !this.active.has(job))
          throw new ChannelPollCancelledError;
        return job.run();
      }).then(job.resolve, job.reject).finally(() => {
        this.active.delete(job);
        this.pump();
      });
      this.pump();
    }
  }
  exports2.ChannelScheduler = ChannelScheduler;
});

// node_modules/teleproto/tl/custom/chatGetter.js
var require_chatGetter = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ChatGetter = undefined;
  var Utils_1 = require_Utils();
  var api_1 = require_api2();
  var Helpers_1 = require_Helpers();

  class ChatGetter {
    static initChatClass(c, { chatPeer, inputChat, chat, broadcast }) {
      c._chatPeer = chatPeer;
      c._inputChat = inputChat;
      c._chat = chat;
      c._broadcast = broadcast;
      c._client = undefined;
    }
    get chat() {
      return this._chat;
    }
    async getChat() {
      if (!this._chat || "min" in this._chat && this._chat.min) {
        try {
          await this.getInputChat();
          if (this._inputChat) {
            this._chat = await this._client?.getEntity(this._inputChat);
          }
        } catch (e) {
          await this._refetchChat();
        }
      }
      return this._chat;
    }
    get inputChat() {
      if (!this._inputChat && this._chatPeer && this._client) {
        try {
          this._inputChat = this._client._entityCache.get((0, Utils_1.getPeerId)(this._chatPeer));
        } catch (e) {}
      }
      return this._inputChat;
    }
    async getInputChat() {
      if (!this.inputChat && this._chatPeer && this._client) {
        try {
          this._inputChat = await this._client.getInputEntity(this._chatPeer);
          return this._inputChat;
        } catch (e) {}
      }
      if (!this._inputChat && this.chatId && this._client) {
        try {
          const target = this.chatId;
          for await (const dialog of this._client.iterDialogs({
            limit: 100
          })) {
            if (dialog.id.eq(target)) {
              this._chat = dialog.entity;
              this._inputChat = dialog.inputEntity;
              break;
            }
          }
        } catch (e) {}
      }
      return this._inputChat;
    }
    get chatId() {
      return this._chatPeer ? (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(this._chatPeer)) : undefined;
    }
    get isPrivate() {
      return this._chatPeer ? this._chatPeer instanceof api_1.Api.PeerUser : undefined;
    }
    get isGroup() {
      if (!this._broadcast && this.chat && "broadcast" in this.chat) {
        this._broadcast = Boolean(this.chat.broadcast);
      }
      if (this._chatPeer instanceof api_1.Api.PeerChannel) {
        if (this._broadcast === undefined) {
          return;
        } else {
          return !this._broadcast;
        }
      }
      return this._chatPeer instanceof api_1.Api.PeerChat;
    }
    get isChannel() {
      return this._chatPeer instanceof api_1.Api.PeerChannel;
    }
    async _refetchChat() {}
  }
  exports2.ChatGetter = ChatGetter;
});

// node_modules/teleproto/tl/custom/button.js
var require_button = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Button = undefined;
  var api_1 = require_api2();
  var Utils_1 = require_Utils();

  class Button {
    constructor(button, resize, singleUse, selective) {
      this.button = button;
      this.resize = resize;
      this.singleUse = singleUse;
      this.selective = selective;
    }
    static _isInline(button) {
      return button instanceof api_1.Api.KeyboardInlineButton;
    }
    static inline(text, data, style) {
      if (!data) {
        data = Buffer.from(text, "utf-8");
      }
      if (data.length > 64) {
        throw new Error("Too many bytes for the data");
      }
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InlineButtonTypeCallback({
          data
        }),
        style
      });
    }
    static switchInline(text, query = "", samePeer = false, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InlineButtonTypeSwitchInline({
          query,
          samePeer
        }),
        style
      });
    }
    static url(text, url, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InlineButtonTypeUrl({
          url: url || text
        }),
        style
      });
    }
    static auth(text, url, bot, writeAccess, fwdText, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InputInlineButtonTypeUrlAuth({
          url: url || text,
          bot: (0, Utils_1.getInputUser)(bot || new api_1.Api.InputUserSelf),
          requestWriteAccess: writeAccess,
          fwdText
        }),
        style
      });
    }
    static text(text, resize, singleUse, selective) {
      return new this(new api_1.Api.KeyboardButton({
        text,
        type: new api_1.Api.ButtonTypeDefault
      }), resize, singleUse, selective);
    }
    static requestLocation(text, resize, singleUse, selective) {
      return new this(new api_1.Api.KeyboardButton({
        text,
        type: new api_1.Api.ButtonTypeRequestGeoLocation
      }), resize, singleUse, selective);
    }
    static requestPhone(text, resize, singleUse, selective) {
      return new this(new api_1.Api.KeyboardButton({
        text,
        type: new api_1.Api.ButtonTypeRequestPhone
      }), resize, singleUse, selective);
    }
    static requestPoll(text, resize, singleUse, selective) {
      return new this(new api_1.Api.KeyboardButton({
        text,
        type: new api_1.Api.ButtonTypeRequestPoll({})
      }), resize, singleUse, selective);
    }
    static webView(text, url, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InlineButtonTypeWebView({
          url
        }),
        style
      });
    }
    static simpleWebView(text, url, style) {
      return new api_1.Api.KeyboardButton({
        text,
        type: new api_1.Api.ButtonTypeSimpleWebView({
          url
        }),
        style
      });
    }
    static copy(text, copyText, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InlineButtonTypeCopy({
          copyText
        }),
        style
      });
    }
    static game(text, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InlineButtonTypeGame,
        style
      });
    }
    static buy(text, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InlineButtonTypeBuy,
        style
      });
    }
    static disabled(text, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InlineButtonTypeDisabled,
        style
      });
    }
    static userProfile(text, user, style) {
      return new api_1.Api.KeyboardInlineButton({
        text,
        type: new api_1.Api.InputInlineButtonTypeUserProfile({
          userId: (0, Utils_1.getInputUser)(user)
        }),
        style
      });
    }
    static requestPeer(text, buttonId, peerType, maxCount, style) {
      return new api_1.Api.KeyboardButton({
        text,
        type: new api_1.Api.InputButtonTypeRequestPeer({
          buttonId,
          peerType,
          maxQuantity: maxCount || 1
        }),
        style
      });
    }
    static {
      this.style = Object.assign((opts) => {
        return new api_1.Api.KeyboardButtonStyle(opts || {});
      }, {
        primary: () => new api_1.Api.KeyboardButtonStyle({ bgPrimary: true }),
        danger: () => new api_1.Api.KeyboardButtonStyle({ bgDanger: true }),
        success: () => new api_1.Api.KeyboardButtonStyle({ bgSuccess: true })
      });
    }
    static clear() {
      return new api_1.Api.ReplyKeyboardHide({});
    }
    static forceReply() {
      return new api_1.Api.ReplyKeyboardForceReply({});
    }
  }
  exports2.Button = Button;
});

// node_modules/teleproto/tl/custom/keyboard.js
var require_keyboard = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Keyboard = exports2.ReplyKeyboard = exports2.InlineKeyboard = undefined;
  var Helpers_1 = require_Helpers();
  var Utils_1 = require_Utils();
  var api_1 = require_api2();
  var button_1 = require_button();
  function toStyle(style) {
    if (!style)
      return;
    if (style instanceof api_1.Api.KeyboardButtonStyle)
      return style;
    return new api_1.Api.KeyboardButtonStyle({
      bgPrimary: style.color === "primary" || undefined,
      bgDanger: style.color === "danger" || undefined,
      bgSuccess: style.color === "success" || undefined,
      icon: style.icon === undefined ? undefined : (0, Helpers_1.returnBigInt)(style.icon)
    });
  }

  class KeyboardBuilder {
    constructor(rows = []) {
      this.rows = rows.map((row) => [...row]);
    }
    row() {
      this.rows.push([]);
      return this;
    }
    add(...buttons) {
      this.current().push(...buttons);
      return this;
    }
    columns(count) {
      if (count < 1)
        throw new Error("A keyboard row needs at least one button");
      const flat = this.rows.flat();
      this.rows.length = 0;
      for (let i = 0;i < flat.length; i += count) {
        this.rows.push(flat.slice(i, i + count));
      }
      return this;
    }
    get size() {
      return this.rows.reduce((total, row) => total + row.length, 0);
    }
    current() {
      if (!this.rows.length)
        this.rows.push([]);
      return this.rows[this.rows.length - 1];
    }
    filled() {
      return this.rows.filter((row) => row.length > 0);
    }
  }

  class InlineKeyboard extends KeyboardBuilder {
    constructor(rows = [], options = {}) {
      super(rows.map((row) => row.map((button) => {
        const raw = button instanceof button_1.Button ? button.button : button;
        if (!(raw instanceof api_1.Api.KeyboardInlineButton)) {
          throw new Error("An inline keyboard takes inline buttons only");
        }
        return raw;
      })));
      this.options = options;
    }
    callback(text, data, options = {}) {
      const payload = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
      if (payload.length > 64) {
        throw new Error("Callback data must not exceed 64 bytes");
      }
      return this.push(text, new api_1.Api.InlineButtonTypeCallback({
        data: payload,
        requiresPassword: options.requiresPassword
      }), options);
    }
    url(text, url, options = {}) {
      return this.push(text, new api_1.Api.InlineButtonTypeUrl({ url }), options);
    }
    urlAuth(text, url, options = {}) {
      const type = options.bot !== undefined || options.writeAccess !== undefined ? new api_1.Api.InputInlineButtonTypeUrlAuth({
        url,
        bot: (0, Utils_1.getInputUser)(options.bot ?? new api_1.Api.InputUserSelf),
        requestWriteAccess: options.writeAccess,
        fwdText: options.fwdText
      }) : new api_1.Api.InlineButtonTypeUrlAuth({
        url,
        fwdText: options.fwdText,
        buttonId: options.buttonId ?? 0
      });
      return this.push(text, type, options);
    }
    webApp(text, url, options = {}) {
      return this.push(text, new api_1.Api.InlineButtonTypeWebView({ url }), options);
    }
    switchInline(text, options = {}) {
      return this.push(text, new api_1.Api.InlineButtonTypeSwitchInline({
        query: options.query ?? "",
        samePeer: options.samePeer,
        peerTypes: options.peerTypes
      }), options);
    }
    userProfile(text, user, options = {}) {
      return this.push(text, new api_1.Api.InputInlineButtonTypeUserProfile({ userId: (0, Utils_1.getInputUser)(user) }), options);
    }
    copy(text, copyText, options = {}) {
      return this.push(text, new api_1.Api.InlineButtonTypeCopy({ copyText }), options);
    }
    game(text, options = {}) {
      return this.push(text, new api_1.Api.InlineButtonTypeGame, options);
    }
    buy(text, options = {}) {
      return this.push(text, new api_1.Api.InlineButtonTypeBuy, options);
    }
    disabled(text, options = {}) {
      return this.push(text, new api_1.Api.InlineButtonTypeDisabled, options);
    }
    forceReply(forceReply = true) {
      this.options = { ...this.options, forceReply };
      return this;
    }
    build() {
      return new api_1.Api.ReplyInlineMarkup({
        rows: this.filled().map((buttons) => new api_1.Api.KeyboardInlineButtonRow({ buttons })),
        forceReply: this.options.forceReply
      });
    }
    push(text, type, options) {
      return this.add(new api_1.Api.KeyboardInlineButton({
        text,
        type,
        style: toStyle(options.style)
      }));
    }
  }
  exports2.InlineKeyboard = InlineKeyboard;

  class ReplyKeyboard extends KeyboardBuilder {
    constructor(rows = [], options = {}) {
      super(rows.map((row) => row.map((button) => {
        const raw = button instanceof button_1.Button ? button.button : button;
        if (!(raw instanceof api_1.Api.KeyboardButton)) {
          throw new Error("A reply keyboard takes plain buttons only");
        }
        return raw;
      })));
      this.options = options;
    }
    text(text, options = {}) {
      return this.push(text, new api_1.Api.ButtonTypeDefault, options);
    }
    requestPhone(text, options = {}) {
      return this.push(text, new api_1.Api.ButtonTypeRequestPhone, options);
    }
    requestLocation(text, options = {}) {
      return this.push(text, new api_1.Api.ButtonTypeRequestGeoLocation, options);
    }
    requestPoll(text, options = {}) {
      return this.push(text, new api_1.Api.ButtonTypeRequestPoll({ quiz: options.quiz }), options);
    }
    requestPeer(text, options) {
      return this.push(text, new api_1.Api.InputButtonTypeRequestPeer({
        buttonId: options.buttonId,
        peerType: options.peerType,
        maxQuantity: options.max ?? 1,
        nameRequested: options.nameRequested,
        usernameRequested: options.usernameRequested,
        photoRequested: options.photoRequested
      }), options);
    }
    webApp(text, url, options = {}) {
      return this.push(text, new api_1.Api.ButtonTypeSimpleWebView({ url }), options);
    }
    set(options) {
      this.options = { ...this.options, ...options };
      return this;
    }
    build() {
      return new api_1.Api.ReplyKeyboardMarkup({
        rows: this.filled().map((buttons) => new api_1.Api.KeyboardButtonRow({ buttons })),
        resize: this.options.resize,
        singleUse: this.options.singleUse,
        selective: this.options.selective,
        persistent: this.options.persistent,
        forceReply: this.options.forceReply,
        placeholder: this.options.placeholder
      });
    }
    push(text, type, options) {
      return this.add(new api_1.Api.KeyboardButton({
        text,
        type,
        style: toStyle(options.style)
      }));
    }
  }
  exports2.ReplyKeyboard = ReplyKeyboard;
  exports2.Keyboard = {
    hide(options = {}) {
      return new api_1.Api.ReplyKeyboardHide({ selective: options.selective });
    },
    forceReply(options = {}) {
      return new api_1.Api.ReplyKeyboardForceReply({
        singleUse: options.singleUse,
        selective: options.selective,
        placeholder: options.placeholder
      });
    }
  };
});

// node_modules/teleproto/tl/custom/index.js
var require_custom = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Keyboard = exports2.ReplyKeyboard = exports2.InlineKeyboard = exports2.ChatGetter = undefined;
  var chatGetter_1 = require_chatGetter();
  Object.defineProperty(exports2, "ChatGetter", { enumerable: true, get: function() {
    return chatGetter_1.ChatGetter;
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
});

// node_modules/teleproto/tl/custom/senderGetter.js
var require_senderGetter = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.SenderGetter = undefined;
  var api_1 = require_api2();
  var chatGetter_1 = require_chatGetter();

  class SenderGetter extends chatGetter_1.ChatGetter {
    static initSenderClass(c, { senderId, sender, inputSender }) {
      c._senderId = senderId;
      c._sender = sender;
      c._inputSender = inputSender;
      c._client = undefined;
    }
    get sender() {
      return this._sender;
    }
    async getSender() {
      if (this._client && (!this._sender || this._sender instanceof api_1.Api.Channel && this._sender.min) && await this.getInputSender()) {
        try {
          this._sender = await this._client.getEntity(this._inputSender);
        } catch (e) {
          await this._refetchSender();
        }
      }
      return this._sender;
    }
    get inputSender() {
      if (!this._inputSender && this._senderId && this._client) {
        try {
          this._inputSender = this._client._entityCache.get(this._senderId);
        } catch (e) {}
      }
      return this._inputSender;
    }
    async getInputSender() {
      if (!this.inputSender && this._senderId && this._client) {
        try {
          this._inputSender = await this._client.getInputEntity(this._senderId);
          return this._inputSender;
        } catch (e) {}
        await this._refetchSender();
      }
      return this._inputSender;
    }
    get senderId() {
      return this._senderId;
    }
    async _refetchSender() {}
  }
  exports2.SenderGetter = SenderGetter;
});

// node_modules/teleproto/events/common.js
var require_common = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.EventCommonSender = exports2.EventCommon = exports2.EventBuilder = undefined;
  exports2._intoIdSet = _intoIdSet;
  var tl_1 = require_tl();
  var custom_1 = require_custom();
  var Helpers_1 = require_Helpers();
  var Utils_1 = require_Utils();
  var senderGetter_1 = require_senderGetter();
  var big_integer_1 = __importDefault(require_BigInteger());
  var Utils_2 = require_Utils();
  async function _intoIdSet(client, chats) {
    if (chats == undefined) {
      return;
    }
    if (!(0, Helpers_1.isArrayLike)(chats)) {
      chats = [chats];
    }
    const result = new Set;
    for (let chat of chats) {
      if (typeof chat == "number" || typeof chat == "bigint" || typeof chat == "string" && (0, Utils_2.parseID)(chat) || big_integer_1.default.isInstance(chat)) {
        chat = (0, Helpers_1.returnBigInt)(chat);
        if (chat.lesser(0)) {
          result.add(chat.toString());
        } else {
          result.add((0, Utils_1.getPeerId)(new tl_1.Api.PeerUser({
            userId: chat
          })));
          result.add((0, Utils_1.getPeerId)(new tl_1.Api.PeerChat({
            chatId: chat
          })));
          result.add((0, Utils_1.getPeerId)(new tl_1.Api.PeerChannel({
            channelId: chat
          })));
        }
      } else if (typeof chat == "object" && chat.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("Peer")) {
        result.add((0, Utils_1.getPeerId)(chat));
      } else {
        chat = await client.getInputEntity(chat);
        if (chat instanceof tl_1.Api.InputPeerSelf) {
          chat = await client.getMe(true);
        }
        result.add((0, Utils_1.getPeerId)(chat));
      }
    }
    return Array.from(result);
  }

  class EventBuilder {
    constructor(eventParams) {
      this.chats = eventParams.chats?.map((x) => x.toString());
      this.blacklistChats = eventParams.blacklistChats || false;
      this.resolved = false;
      this.func = eventParams.func;
    }
    build(update, callback, selfId) {
      if (update)
        return update;
    }
    async resolve(client) {
      if (this.resolved) {
        return;
      }
      await this._resolve(client);
      this.resolved = true;
    }
    async _resolve(client) {
      this.chats = await _intoIdSet(client, this.chats);
    }
    filter(event) {
      if (!this.resolved) {
        return;
      }
      if (this.chats != null) {
        if (event.chatId == undefined) {
          return;
        }
        const inside = this.chats.includes(event.chatId.toString());
        if (inside == this.blacklistChats) {
          return;
        }
      }
      if (this.func && !this.func(event)) {
        return;
      }
      return event;
    }
  }
  exports2.EventBuilder = EventBuilder;

  class EventCommon extends custom_1.ChatGetter {
    constructor({ chatPeer = undefined, msgId = undefined, broadcast = undefined }) {
      super();
      this._eventName = "Event";
      custom_1.ChatGetter.initChatClass(this, { chatPeer, broadcast });
      this._entities = new Map;
      this._client = undefined;
      this._messageId = msgId;
    }
    _setClient(client) {
      this._client = client;
      if (this.chatId) {
        [this._chat, this._inputChat] = (0, Utils_1._getEntityPair)(this.chatId.toString(), this._entities, client._entityCache);
      }
    }
    get client() {
      return this._client;
    }
  }
  exports2.EventCommon = EventCommon;

  class EventCommonSender extends senderGetter_1.SenderGetter {
    constructor({ chatPeer = undefined, msgId = undefined, broadcast = undefined }) {
      super();
      this._eventName = "Event";
      custom_1.ChatGetter.initChatClass(this, { chatPeer, broadcast });
      senderGetter_1.SenderGetter.initChatClass(this, { chatPeer, broadcast });
      this._entities = new Map;
      this._client = undefined;
      this._messageId = msgId;
    }
    _setClient(client) {
      this._client = client;
      if (this.chatId) {
        [this._chat, this._inputChat] = (0, Utils_1._getEntityPair)(this.chatId.toString(), this._entities, client._entityCache);
      }
    }
    get client() {
      return this._client;
    }
  }
  exports2.EventCommonSender = EventCommonSender;
});

// node_modules/teleproto/events/Raw.js
var require_Raw = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Raw = undefined;
  var common_1 = require_common();

  class Raw extends common_1.EventBuilder {
    constructor(params) {
      super({ func: params.func });
      this.types = params.types;
    }
    async resolve(client) {
      this.resolved = true;
    }
    build(update) {
      return update;
    }
    filter(event) {
      if (this.types) {
        let correct = false;
        for (const type of this.types) {
          if (event instanceof type) {
            correct = true;
            break;
          }
        }
        if (!correct) {
          return;
        }
      }
      return super.filter(event);
    }
  }
  exports2.Raw = Raw;
});

// node_modules/teleproto/client/updates/dispatch.js
var require_dispatch = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.StopPropagation = undefined;
  exports2.on = on;
  exports2.addEventHandler = addEventHandler;
  exports2.removeEventHandler = removeEventHandler;
  exports2.listEventHandlers = listEventHandlers;
  exports2.catchUp = catchUp;
  exports2._handleUpdate = _handleUpdate;
  exports2._clearUpdateQueue = _clearUpdateQueue;
  exports2._dispatchUpdate = _dispatchUpdate;
  exports2._stopUpdateLoop = _stopUpdateLoop;
  exports2._updateLoop = _updateLoop;
  var tl_1 = require_tl();
  var network_1 = require_network();
  var Helpers_1 = require_Helpers();
  var promises_1 = require("node:timers/promises");
  var PING_INTERVAL = 9000;
  var PING_TIMEOUT = 1e4;
  var PING_FAIL_ATTEMPTS = 3;
  var PING_FAIL_INTERVAL = 100;
  var PING_DISCONNECT_DELAY = 75;
  var PING_INTERVAL_TO_WAKE_UP = 5000;
  var PING_WAKE_UP_TIMEOUT = 3000;
  var PING_WAKE_UP_WARNING_TIMEOUT = 1000;

  class StopPropagation extends Error {
  }
  exports2.StopPropagation = StopPropagation;
  function on(client, event) {
    return (f) => {
      client.addEventHandler(f, event);
      return f;
    };
  }
  function addEventHandler(client, callback, event) {
    if (event == undefined) {
      const raw = require_Raw().Raw;
      event = new raw({});
    }
    event.client = client;
    client._eventBuilders.push([event, callback]);
  }
  function removeEventHandler(client, callback, event) {
    client._eventBuilders = client._eventBuilders.filter((item) => item[0] !== event && item[1] !== callback);
  }
  function listEventHandlers(client) {
    return client._eventBuilders;
  }
  async function catchUp(client) {
    await client.updateManager.catchUp();
  }
  function _handleUpdate(client, update) {
    try {
      if (typeof update === "number") {
        if ([-1, 0, 1].includes(update)) {
          _dispatchUpdate(client, {
            update: new network_1.UpdateConnectionState(update)
          }).catch((e) => {
            client._log.error(`Error dispatching connection state: ${e}`);
          });
        }
        return;
      }
      if (update instanceof network_1.UpdateConnectionState) {
        _dispatchUpdate(client, { update }).catch((e) => {
          client._log.error(`Error dispatching connection state: ${e}`);
        });
        return;
      }
      client.updateManager.onUpdates(update);
    } catch (e) {
      client._log.error(`Error handling update: ${e}`);
    }
  }
  var dispatchQueues = new WeakMap;
  function _clearUpdateQueue(client) {
    const queue = dispatchQueues.get(client);
    if (!queue)
      return;
    while (queue.head) {
      const job = queue.head;
      queue.head = job.next;
      job.next = undefined;
      job.resolve();
    }
    queue.tail = undefined;
  }
  async function drainUpdates(client, queue) {
    while (queue.head) {
      const job = queue.head;
      queue.head = job.next;
      job.next = undefined;
      if (!queue.head)
        queue.tail = undefined;
      try {
        if (!client._destroyed)
          await dispatchUpdate(client, job.args);
        job.resolve();
      } catch (error) {
        job.reject(error);
      }
    }
    dispatchQueues.delete(client);
  }
  function _dispatchUpdate(client, args) {
    if (client._destroyed)
      return Promise.resolve();
    if (!client._sequentialUpdates)
      return dispatchUpdate(client, args);
    return new Promise((resolve, reject) => {
      const job = { args, resolve, reject };
      const queue = dispatchQueues.get(client);
      if (queue) {
        if (queue.tail)
          queue.tail.next = job;
        else
          queue.head = job;
        queue.tail = job;
      } else {
        const queue2 = { head: job, tail: job };
        dispatchQueues.set(client, queue2);
        drainUpdates(client, queue2);
      }
    });
  }
  async function dispatchUpdate(client, args) {
    for (const [builder, callback] of [...client._eventBuilders]) {
      if (client._destroyed)
        return;
      if (!builder || !callback) {
        continue;
      }
      try {
        if (!builder.resolved) {
          await builder.resolve(client);
        }
      } catch (e) {
        client._log.error(`Error resolving event builder: ${e}`);
        continue;
      }
      let event = args.update;
      if (event) {
        if (!client._selfInputPeer) {
          try {
            await client.getMe(true);
          } catch {}
        }
        try {
          event = builder.build(event, callback, client._selfInputPeer ? (0, Helpers_1.returnBigInt)(client._selfInputPeer.userId) : undefined);
        } catch (e) {
          client._log.error(`Error building event: ${e}`);
          continue;
        }
        if (event) {
          event._client = client;
          if ("_eventName" in event) {
            event.originalUpdate = args.update;
            event._entities = args.update._entities ?? new Map;
            event._setClient(client);
          }
          let filter;
          try {
            filter = await builder.filter(event);
          } catch (e) {
            client._log.error(`Error in event filter: ${e}`);
            continue;
          }
          if (!filter)
            continue;
          try {
            await callback(event);
          } catch (e) {
            if (e instanceof StopPropagation)
              break;
            if (client._errorHandler) {
              try {
                await client._errorHandler(e);
              } catch (error) {
                client._log.error(`Error in update error handler: ${error}`);
              }
            }
            client._log.error(`Error in event handler: ${e}`);
          }
        }
      }
    }
    if (!client._destroyed)
      await client.updates._dispatch(args.update);
  }
  var updateLoops = new WeakMap;
  function _stopUpdateLoop(client) {
    updateLoops.get(client)?.abort();
    updateLoops.delete(client);
    client._loopStarted = false;
  }
  async function _updateLoop(client, catchUp2 = true) {
    updateLoops.get(client)?.abort();
    const controller = new AbortController;
    updateLoops.set(client, controller);
    const active = () => !controller.signal.aborted && !client._destroyed;
    client.updateManager.start();
    if (catchUp2)
      await client.updateManager.catchUp();
    let lastPongAt;
    while (active()) {
      try {
        await (0, promises_1.setTimeout)(PING_INTERVAL, undefined, { signal: controller.signal, ref: false });
      } catch {
        break;
      }
      if (!active())
        break;
      if (client._sender?.isReconnecting || client._isSwitchingDc) {
        lastPongAt = undefined;
        continue;
      }
      if (client.disconnected)
        break;
      try {
        const ping = () => {
          if (!active())
            throw new Error("Update loop stopped");
          return client._sender.send(new tl_1.Api.PingDelayDisconnect({
            pingId: (0, Helpers_1.returnBigInt)((0, Helpers_1.getRandomInt)(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)),
            disconnectDelay: PING_DISCONNECT_DELAY
          }));
        };
        const pingAt = Date.now();
        const lastInterval = lastPongAt ? pingAt - lastPongAt : undefined;
        if (!lastInterval || lastInterval < PING_INTERVAL_TO_WAKE_UP) {
          await attempts(() => timeout(ping, PING_TIMEOUT), PING_FAIL_ATTEMPTS, PING_FAIL_INTERVAL);
        } else {
          let wakeUpWarningTimeout = setTimeout(() => {
            if (active())
              _handleUpdate(client, network_1.UpdateConnectionState.disconnected);
            wakeUpWarningTimeout = undefined;
          }, PING_WAKE_UP_WARNING_TIMEOUT);
          try {
            await timeout(ping, PING_WAKE_UP_TIMEOUT);
          } finally {
            if (wakeUpWarningTimeout)
              clearTimeout(wakeUpWarningTimeout);
          }
          if (active())
            _handleUpdate(client, network_1.UpdateConnectionState.connected);
        }
        lastPongAt = Date.now();
      } catch (err) {
        lastPongAt = undefined;
        if (!active())
          break;
        if (Date.now() - client._lastReceivedAt < PING_INTERVAL + PING_TIMEOUT) {
          client._log.debug(`Ping timed out but transfer is active, ignoring`);
          continue;
        }
        if (client._errorHandler) {
          await client._errorHandler(err);
        }
        if (!active())
          break;
        client._log.warn(`Ping failed: ${err}, reconnecting`);
        if (client._sender?.isReconnecting || client._isSwitchingDc)
          continue;
        if (client.disconnected)
          break;
        client._sender.reconnect();
      }
      if (!active())
        break;
      await client.updateManager.recoverIfStale();
      if (!active())
        break;
      if (Date.now() - (client._lastRequest || 0) > 30 * 60 * 1000) {
        try {
          await client.updateManager.catchUp();
        } catch {}
        lastPongAt = undefined;
      }
    }
    if (updateLoops.get(client) === controller) {
      _stopUpdateLoop(client);
      if (client._destroyed)
        await client.disconnect();
    }
  }
  async function attempts(cb, times, pause) {
    for (let i = 0;i < times; i++) {
      try {
        return await cb();
      } catch (err) {
        if (i === times - 1)
          throw err;
        await (0, Helpers_1.sleep)(pause);
      }
    }
    return;
  }
  function timeout(cb, ms) {
    let resolved = false;
    return Promise.race([
      cb(),
      (0, Helpers_1.sleep)(ms).then(() => resolved ? undefined : Promise.reject(new Error("TIMEOUT")))
    ]).finally(() => {
      resolved = true;
    });
  }
});

// node_modules/teleproto/client/updates/ptsWaiter.js
var require_ptsWaiter = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.PtsWaiter = exports2.WAIT_FOR_SKIPPED_TIMEOUT_MS = undefined;
  exports2.WAIT_FOR_SKIPPED_TIMEOUT_MS = 500;

  class PtsWaiter {
    constructor(host) {
      this.host = host;
      this.good = 0;
      this.initialized = false;
      this.requestingFlag = false;
      this.waitingForSkipped = false;
      this.waitingForShortPoll = false;
      this.skippedKey = 0;
      this.queue = [];
    }
    inited() {
      return this.initialized;
    }
    current() {
      return this.good;
    }
    init(pts, preservePending = false) {
      this.good = pts;
      this.initialized = true;
      if (!preservePending)
        this.clearSkippedUpdates();
    }
    requesting() {
      return this.requestingFlag;
    }
    setRequesting(value) {
      this.requestingFlag = value;
      if (value)
        this.setWaitingForSkipped(-1);
      else
        this.applySkippedUpdates();
    }
    isWaitingForSkipped() {
      return this.waitingForSkipped;
    }
    isWaitingForShortPoll() {
      return this.waitingForShortPoll;
    }
    setWaitingForSkipped(ms) {
      this.waitingForSkipped = ms >= 0;
      if (ms >= 0 || !this.waitingForShortPoll)
        this.host.onWaitForSkipped(ms);
    }
    setWaitingForShortPoll(ms) {
      this.waitingForShortPoll = ms >= 0;
      if (ms >= 0)
        this.host.onWaitForShortPoll(ms);
      else if (!this.waitingForSkipped)
        this.host.onWaitForSkipped(-1);
    }
    updated(pts, count, payload) {
      if (!Number.isSafeInteger(pts) || !Number.isSafeInteger(count) || pts < 0 || count < 0) {
        this.setWaitingForSkipped(1);
        return false;
      }
      if (!this.initialized)
        this.init(Math.max(0, pts - count));
      if (pts < this.good || count > 0 && pts === this.good)
        return false;
      if (!this.requestingFlag && this.good + count === pts) {
        this.good = pts;
        return true;
      }
      if (count > 0 && this.queue.some((entry) => entry.pts === pts && entry.count === count))
        return false;
      this.queue.push({ pts, count, tieBreaker: ++this.skippedKey, ...payload });
      this.queue.sort((a, b) => a.pts - b.pts || b.count - a.count || a.tieBreaker - b.tieBreaker);
      if (!this.requestingFlag)
        this.setWaitingForSkipped(this.good + count > pts ? 1 : exports2.WAIT_FOR_SKIPPED_TIMEOUT_MS);
      return false;
    }
    updateAndApply(pts, count, payload, applyUpdate, applyUpdates) {
      const entry = { ...payload, applyUpdate, applyUpdates };
      if (!this.updated(pts, count, entry))
        return false;
      this.apply(entry);
      this.applySkippedUpdates(applyUpdate, applyUpdates);
      return true;
    }
    applySkippedUpdates(applyUpdate, applyUpdates) {
      if (this.requestingFlag)
        return;
      while (this.queue.length) {
        const entry = this.queue[0];
        if (entry.pts < this.good || entry.count > 0 && entry.pts === this.good) {
          this.queue.shift();
          continue;
        }
        if (this.good + entry.count !== entry.pts)
          break;
        this.queue.shift();
        this.good = entry.pts;
        this.apply({ ...entry, applyUpdate: entry.applyUpdate ?? applyUpdate, applyUpdates: entry.applyUpdates ?? applyUpdates });
      }
      this.setWaitingForSkipped(this.queue.length ? exports2.WAIT_FOR_SKIPPED_TIMEOUT_MS : -1);
    }
    clearSkippedUpdates() {
      this.queue.length = 0;
      this.setWaitingForSkipped(-1);
    }
    apply(entry) {
      this.host.onApplied?.(this.good);
      if (entry.tag === "update" && entry.update)
        entry.applyUpdate?.(entry.update);
      else if (entry.tag === "updates" && entry.updates)
        entry.applyUpdates?.(entry.updates);
    }
  }
  exports2.PtsWaiter = PtsWaiter;
});

// node_modules/teleproto/client/updates/manager.js
var require_manager = __commonJS((exports2) => {
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
  exports2.UpdateManager = undefined;
  var channelScheduler_1 = require_channelScheduler();
  var tl_1 = require_tl();
  var utils = __importStar(require_Utils());
  var Helpers_1 = require_Helpers();
  var dispatch_1 = require_dispatch();
  var ptsWaiter_1 = require_ptsWaiter();
  var NO_UPDATES_TIMEOUT_MS = 15 * 60 * 1000;
  var FAIL_DIFFERENCE_INITIAL_S = 1;
  var FAIL_DIFFERENCE_CAP_S = 64;
  var CHANNEL_DIFFERENCE_LIMIT = 100;
  var RECENT_MESSAGE_BUFFER_SIZE = 1000;
  var MAX_PENDING_SEQ = 1000;
  var DIFFERENCE_DEADLINE_MS = 120000;
  function isCommonPtsUpdate(update) {
    return update instanceof tl_1.Api.UpdateNewMessage || update instanceof tl_1.Api.UpdateDeleteMessages || update instanceof tl_1.Api.UpdateReadHistoryInbox || update instanceof tl_1.Api.UpdateReadHistoryOutbox || update instanceof tl_1.Api.UpdateWebPage || update instanceof tl_1.Api.UpdateReadMessagesContents || update instanceof tl_1.Api.UpdateEditMessage || update instanceof tl_1.Api.UpdateFolderPeers || update instanceof tl_1.Api.UpdatePinnedMessages;
  }
  function isChannelPtsUpdate(update) {
    return update instanceof tl_1.Api.UpdateNewChannelMessage || update instanceof tl_1.Api.UpdateEditChannelMessage || update instanceof tl_1.Api.UpdateDeleteChannelMessages || update instanceof tl_1.Api.UpdateChannelWebPage || update instanceof tl_1.Api.UpdatePinnedChannelMessages;
  }
  function getChannelId(update) {
    const u = update;
    if (u.channelId)
      return u.channelId.toString();
    const peer = u.message?.peerId;
    if (peer instanceof tl_1.Api.PeerChannel)
      return peer.channelId.toString();
    return;
  }
  function hasQts(update) {
    return typeof update.qts === "number";
  }

  class UpdateManager {
    constructor(client) {
      this.lastUpdateTime = 0;
      this.beforeState = [];
      this.channels = new Map;
      this.pendingSeq = [];
      this.recentMessageKeys = new Set;
      this.recentMessageQueue = [];
      this.fetchingDifference = false;
      this.failTimeoutS = FAIL_DIFFERENCE_INITIAL_S;
      this.channelFailTimeoutS = new Map;
      this.channelFailRetryTimers = new Map;
      this.watchedChannels = new Map;
      this.channelRequests = new WeakSet;
      this.running = false;
      this.generation = 0;
      this.client = client;
      this.channelScheduler = new channelScheduler_1.ChannelScheduler(client._channelPollRequestInterval, client._channelPollConcurrency);
      this.globalPts = this.makeGlobalWaiter();
      this.qts = this.makeGlobalWaiter(true);
    }
    start() {
      if (this.running)
        return;
      this.running = true;
      this.channelScheduler.start();
      this.client.updates._resume();
    }
    get isRunning() {
      return this.running;
    }
    reset() {
      this.state = undefined;
      this.lastUpdateTime = 0;
      this.channels.clear();
      this.recentMessageKeys.clear();
      this.recentMessageQueue.length = 0;
      this.globalPts.init(0);
      this.qts.init(0);
    }
    stop() {
      this.running = false;
      this.generation++;
      this.channelScheduler.stop();
      this.client.updates._pause();
      this.initializing = undefined;
      this.beforeState.length = 0;
      this.qts.clearSkippedUpdates();
      this.qts.setRequesting(false);
      this.globalPts.clearSkippedUpdates();
      this.globalPts.setRequesting(false);
      if (this.globalPtsTimer) {
        clearTimeout(this.globalPtsTimer);
        this.globalPtsTimer = undefined;
      }
      if (this.failRetryTimer) {
        clearTimeout(this.failRetryTimer);
        this.failRetryTimer = undefined;
      }
      if (this.seqGapTimer) {
        clearTimeout(this.seqGapTimer);
        this.seqGapTimer = undefined;
      }
      for (const t of this.channelFailRetryTimers.values())
        clearTimeout(t);
      this.channelFailRetryTimers.clear();
      for (const tracker of this.channels.values()) {
        if (tracker.timer)
          clearTimeout(tracker.timer);
        if (tracker.pollTimer)
          clearTimeout(tracker.pollTimer);
        tracker.timer = undefined;
        tracker.pollTimer = undefined;
        tracker.initializing = undefined;
        tracker.difference = undefined;
        tracker.nextPollAt = undefined;
        tracker.pts.clearSkippedUpdates();
        tracker.pts.setRequesting(false);
      }
      if (this.client._destroyed)
        this.channels.clear();
      this.watchedChannels.clear();
      this.pendingSeq.length = 0;
      this.fetchingDifference = false;
      this.failTimeoutS = FAIL_DIFFERENCE_INITIAL_S;
      this.channelFailTimeoutS.clear();
    }
    onUpdates(update, noDispatch = false) {
      if (!this.running)
        return;
      try {
        this.lastUpdateTime = Date.now();
        this.client._entityCache.add(update);
        this.saveEntities(update);
        if (noDispatch)
          this.markNoDispatch(update);
        const raw = update instanceof tl_1.Api.UpdateShort ? update.update : update;
        const stateful = update instanceof tl_1.Api.Updates || update instanceof tl_1.Api.UpdatesCombined || update instanceof tl_1.Api.UpdateShortMessage || update instanceof tl_1.Api.UpdateShortChatMessage || update instanceof tl_1.Api.UpdateShortSentMessage || update instanceof tl_1.Api.UpdatesTooLong || isCommonPtsUpdate(raw) || isChannelPtsUpdate(raw) || hasQts(raw);
        if (!this.state && stateful) {
          this.beforeState.push(update);
          this.ensureState();
          return;
        }
        if (update instanceof tl_1.Api.Updates || update instanceof tl_1.Api.UpdatesCombined) {
          this.handleContainer(update);
        } else if (update instanceof tl_1.Api.UpdateShort) {
          this.feedUpdate(update.update, { others: null });
        } else if (update instanceof tl_1.Api.UpdateShortMessage || update instanceof tl_1.Api.UpdateShortChatMessage) {
          this.handleShortMessage(update);
        } else if (update instanceof tl_1.Api.UpdateShortSentMessage) {
          this.handleShortSentMessage(update);
        } else if (update.className === "UpdatesTooLong") {
          this.client._log.warn("Received UpdatesTooLong, requesting common difference");
          this.scheduleCommonDifference();
        } else {
          this.feedUpdate(update, { others: null });
        }
      } catch (e) {
        this.client._log.error(`Error in onUpdates: ${e}`);
      }
    }
    markNoDispatch(update) {
      const mark = (obj) => Object.defineProperty(obj, "_noDispatch", {
        value: true,
        configurable: true
      });
      mark(update);
      if (update instanceof tl_1.Api.Updates || update instanceof tl_1.Api.UpdatesCombined) {
        for (const u of update.updates)
          mark(u);
      } else if (update instanceof tl_1.Api.UpdateShort) {
        mark(update.update);
      }
    }
    handleShortSentMessage(update) {
      if (!this.state)
        return;
      this.globalPts.updateAndApply(update.pts, update.ptsCount, { tag: "update", update }, () => {
        if (this.state)
          this.state.pts = this.globalPts.current();
      }, () => {});
      this.state.date = Math.max(this.state.date, update.date);
    }
    applyAffected(pts, ptsCount, channelId) {
      if (!this.running || !this.state)
        return;
      if (channelId) {
        const tracker = this.getOrCreateChannel(channelId);
        if (!tracker.pts.inited()) {
          tracker.pts.init(pts);
          return;
        }
        tracker.pts.updateAndApply(pts, ptsCount, { tag: "update" }, () => {}, () => {});
        return;
      }
      this.globalPts.updateAndApply(pts, ptsCount, { tag: "update" }, () => {}, () => {});
      this.state.pts = this.globalPts.current();
    }
    async catchUp() {
      const generation = this.generation;
      if (!this.isCurrent(generation) || this.client.updates.authorizationError)
        return;
      try {
        if (!this.state) {
          await this.ensureState();
          return;
        }
        this.client._log.debug("Catching up on missed updates...");
        await this.fetchCommonDifference();
        this.client._log.debug("Catch up complete");
      } catch (e) {
        if (!this.isCurrent(generation))
          return;
        if (this.client.updates._suspendAuthorization(e))
          return;
        this.client._log.error(`Error during catch up: ${e}`);
      }
    }
    async watchChannel(channelId, inputChannel, signal) {
      if (signal?.aborted)
        return;
      const generation = this.generation;
      if (!this.isCurrent(generation))
        throw new Error("Update manager is stopped");
      const watching = this.watchedChannels.get(channelId) ?? 0;
      this.watchedChannels.set(channelId, watching + 1);
      const tracker = this.getOrCreateChannel(channelId);
      tracker.inputChannel = inputChannel;
      let released = false;
      const release = () => {
        if (released)
          return;
        released = true;
        if (this.isCurrent(generation) && this.channels.get(channelId) === tracker) {
          this.releaseChannel(channelId);
        }
      };
      if (!tracker.initializing && (watching === 0 || !tracker.pts.inited())) {
        const task = (async () => {
          if (!tracker.pts.inited()) {
            const pts = await this.readChannelPts(inputChannel);
            if (!this.isCurrent(generation) || !this.watchedChannels.has(channelId) || this.channels.get(channelId) !== tracker)
              return;
            if (!tracker.pts.inited())
              tracker.pts.init(pts);
          }
          await this.fetchChannelDifference(channelId, { keepAlive: true });
        })();
        tracker.initializing = task;
        task.finally(() => {
          if (tracker.initializing === task)
            tracker.initializing = undefined;
        }).catch(() => {});
      }
      let onAbort;
      try {
        const task = tracker.initializing ?? Promise.resolve();
        if (signal) {
          await new Promise((resolve, reject) => {
            onAbort = () => {
              release();
              signal.removeEventListener("abort", onAbort);
              resolve();
            };
            signal.addEventListener("abort", onAbort, { once: true });
            if (signal.aborted)
              onAbort();
            task.then(resolve, reject);
          });
        } else {
          await task;
        }
      } catch (error) {
        release();
        if (onAbort)
          signal?.removeEventListener("abort", onAbort);
        throw error;
      }
    }
    releaseChannel(channelId) {
      const watching = this.watchedChannels.get(channelId);
      if (!watching)
        return;
      if (watching > 1) {
        this.watchedChannels.set(channelId, watching - 1);
        return;
      }
      this.watchedChannels.delete(channelId);
      this.channelScheduler.cancel(channelId);
      const retry = this.channelFailRetryTimers.get(channelId);
      if (retry)
        clearTimeout(retry);
      this.channelFailRetryTimers.delete(channelId);
      this.channelFailTimeoutS.delete(channelId);
      const tracker = this.channels.get(channelId);
      if (tracker)
        tracker.nextPollAt = undefined;
      if (tracker?.pollTimer) {
        clearTimeout(tracker.pollTimer);
        tracker.pollTimer = undefined;
      }
    }
    watchedChannelIds() {
      return [...this.watchedChannels.keys()];
    }
    get polling() {
      return {
        ...this.channelScheduler.state,
        channels: this.watchedChannelIds().map((channelId) => {
          const tracker = this.channels.get(channelId);
          return {
            channelId,
            lastPolledAt: tracker?.lastPolledAt,
            lastDelayMs: tracker?.lastDelayMs,
            nextPollAt: tracker?.nextPollAt
          };
        })
      };
    }
    handleChannelFloodWait(request, seconds) {
      if (!this.channelRequests.has(request))
        return false;
      if (Number.isFinite(seconds) && seconds > 0)
        this.channelScheduler.pause(seconds * 1000);
      return true;
    }
    invokeChannel(channelId, create) {
      const generation = this.generation;
      const queuedAt = Date.now();
      return this.channelScheduler.schedule(channelId, async () => {
        if (!this.isCurrent(generation))
          throw new channelScheduler_1.ChannelPollCancelledError;
        if (this.client.updates.authorizationError)
          throw this.client.updates.authorizationError;
        const request = create();
        this.channelRequests.add(request);
        const tracker = this.channels.get(channelId);
        if (tracker && request instanceof tl_1.Api.updates.GetChannelDifference) {
          tracker.pts.setRequesting(true);
          tracker.lastPolledAt = Date.now();
          tracker.lastDelayMs = tracker.lastPolledAt - queuedAt;
        }
        try {
          return await this.client.invoke(request);
        } catch (error) {
          if (this.isCurrent(generation)) {
            this.client.updates._suspendAuthorization(error);
            const flood = error;
            if (/^FLOOD_(?:PREMIUM_)?WAIT(?:_|$)/.test(flood.errorMessage ?? "")) {
              this.handleChannelFloodWait(request, flood.seconds ?? 0);
            }
          }
          throw error;
        } finally {
          this.channelRequests.delete(request);
        }
      });
    }
    async readChannelPts(inputChannel) {
      const channelId = inputChannel.channelId.toString();
      const full = await this.invokeChannel(channelId, () => new tl_1.Api.channels.GetFullChannel({ channel: inputChannel }));
      this.client._entityCache.add(full);
      if (!(full.fullChat instanceof tl_1.Api.ChannelFull)) {
        throw new Error("Cannot read the channel pts to start watching it");
      }
      return full.fullChat.pts;
    }
    async ensureState() {
      if (this.initializing)
        return this.initializing;
      const generation = this.generation;
      if (this.state || !this.isCurrent(generation) || this.client.updates.authorizationError)
        return;
      const task = (async () => {
        try {
          const state = await this.client.api.updates.getState();
          if (!this.isCurrent(generation))
            return;
          this.refreshFromState(state);
          this.lastUpdateTime = Date.now();
          const pending = this.beforeState.splice(0);
          for (const update of pending)
            this.onUpdates(update);
        } catch (error) {
          if (this.isCurrent(generation))
            this.client.updates._suspendAuthorization(error);
        }
      })();
      this.initializing = task;
      try {
        await task;
      } finally {
        if (this.initializing === task)
          this.initializing = undefined;
      }
    }
    refreshFromState(state) {
      if (this.state) {
        this.state.pts = state.pts;
        this.state.qts = state.qts;
        this.state.date = state.date;
        this.state.seq = state.seq;
      } else {
        this.state = { pts: state.pts, qts: state.qts, date: state.date, seq: state.seq };
      }
      this.globalPts.init(state.pts);
      this.qts.init(state.qts);
    }
    isStale() {
      return Boolean(this.state) && Date.now() - this.lastUpdateTime > NO_UPDATES_TIMEOUT_MS;
    }
    async recoverIfStale() {
      if (!this.isStale())
        return;
      this.client._log.debug("No updates for 15 minutes, fetching difference");
      await this.fetchCommonDifference();
      this.lastUpdateTime = Date.now();
    }
    handleContainer(update) {
      const payload = { others: update.updates, entities: this.collectEntities(update.users, update.chats) };
      const remaining = [];
      for (const item of update.updates) {
        if (isCommonPtsUpdate(item) || isChannelPtsUpdate(item) || hasQts(item) || item instanceof tl_1.Api.UpdateChannelTooLong) {
          this.feedUpdate(item, payload);
        } else {
          remaining.push(item);
        }
      }
      this.applySeq({ update, updates: remaining, payload, seqStart: "seqStart" in update ? update.seqStart : update.seq, seq: update.seq });
      this.drainPendingSeq();
    }
    applySeq(entry) {
      if (!this.state)
        return;
      const { seqStart, seq, update } = entry;
      if (seqStart !== 0 && seqStart <= this.state.seq)
        return;
      if (this.fetchingDifference || seqStart !== 0 && seqStart > this.state.seq + 1) {
        if (seqStart === 0 || !this.pendingSeq.some((pending) => pending.seqStart === seqStart && pending.seq === seq)) {
          if (this.pendingSeq.length >= MAX_PENDING_SEQ)
            this.pendingSeq.shift();
          this.pendingSeq.push(entry);
        }
        if (!this.fetchingDifference)
          this.armSeqGapTimer();
        return;
      }
      for (const item of entry.updates)
        this.feedUpdate(item, entry.payload);
      if (seq !== 0)
        this.state.seq = seq;
      this.state.date = Math.max(this.state.date, update.date);
    }
    armSeqGapTimer() {
      if (this.seqGapTimer)
        return;
      this.seqGapTimer = setTimeout(() => {
        this.seqGapTimer = undefined;
        this.client._log.debug("Seq gap was not filled in time; requesting difference");
        this.scheduleCommonDifference();
      }, ptsWaiter_1.WAIT_FOR_SKIPPED_TIMEOUT_MS);
    }
    handleShortMessage(update) {
      if (!this.state) {
        this.dispatch(update, { others: null });
        return;
      }
      const applied = this.globalPts.updateAndApply(update.pts, update.ptsCount, { tag: "update", update }, (u) => {
        if (this.state)
          this.state.pts = this.globalPts.current();
        this.dispatch(u, { others: null });
      }, () => {});
      if (applied) {
        this.state.date = Math.max(this.state.date, update.date);
      }
    }
    feedUpdate(update, payload) {
      if (!this.state) {
        this.dispatch(update, payload);
        return;
      }
      if (update instanceof tl_1.Api.UpdateChannelTooLong) {
        this.recoverChannel(update);
        return;
      }
      if (isCommonPtsUpdate(update)) {
        const u = update;
        this.globalPts.updateAndApply(u.pts, u.ptsCount, { tag: "update", update }, (applied) => {
          if (this.state)
            this.state.pts = this.globalPts.current();
          this.dispatch(applied, payload);
        }, () => {});
        return;
      }
      if (isChannelPtsUpdate(update)) {
        const u = update;
        const channelId = getChannelId(update);
        if (!channelId || !u.pts || !u.ptsCount) {
          this.dispatch(update, payload);
          return;
        }
        const tracker = this.getOrCreateChannel(channelId);
        if (!tracker.pts.inited()) {
          tracker.pts.init(u.pts);
          this.dispatch(update, payload);
          return;
        }
        tracker.pts.updateAndApply(u.pts, u.ptsCount, { tag: "update", update }, (applied) => this.dispatch(applied, payload), () => {});
        return;
      }
      if (hasQts(update)) {
        this.qts.updateAndApply(update.qts, 1, { tag: "update", update }, (applied) => {
          if (this.state)
            this.state.qts = this.qts.current();
          this.dispatch(applied, payload);
        }, () => {});
        return;
      }
      this.dispatch(update, payload);
    }
    isCurrent(generation) {
      return this.running && this.generation === generation;
    }
    async recoverChannel(update, fromDifference = false) {
      const channelId = update.channelId.toString();
      const tracker = this.getOrCreateChannel(channelId);
      if (!tracker.pts.inited()) {
        if (!fromDifference) {
          this.scheduleCommonDifference();
          return;
        }
        tracker.pts.init(1);
      } else if (update.pts !== undefined && tracker.pts.current() >= update.pts) {
        return;
      }
      await this.fetchChannelDifference(channelId);
    }
    dispatch(update, payload) {
      if (!this.running)
        return;
      if (this.isDuplicateMessage(update)) {
        this.client._log.debug("Skip duplicate message update (already dispatched)");
        return;
      }
      if (update._noDispatch) {
        return;
      }
      update._entities = payload.entities ?? new Map;
      (0, dispatch_1._dispatchUpdate)(this.client, { update }).catch((e) => this.client._log.error(`Error dispatching update: ${e}`));
    }
    isDuplicateMessage(update) {
      if (!(update instanceof tl_1.Api.UpdateNewMessage) && !(update instanceof tl_1.Api.UpdateNewChannelMessage)) {
        return false;
      }
      const message = update.message;
      if (message?.id == undefined || message.peerId == undefined)
        return false;
      let peerId;
      try {
        peerId = utils.getPeerId(message.peerId);
      } catch {
        return false;
      }
      const key = `${peerId}:${message.id}`;
      if (this.recentMessageKeys.has(key))
        return true;
      this.recentMessageKeys.add(key);
      this.recentMessageQueue.push(key);
      if (this.recentMessageQueue.length > RECENT_MESSAGE_BUFFER_SIZE) {
        const old = this.recentMessageQueue.shift();
        this.recentMessageKeys.delete(old);
      }
      return false;
    }
    async saveEntities(tlo) {
      try {
        await this.client.session.processEntities(tlo);
      } catch (e) {
        this.client._log.warn(`session.processEntities failed: ${e}`);
      }
    }
    collectEntities(users, chats) {
      const entities = new Map;
      for (const x of [...users, ...chats]) {
        try {
          entities.set(utils.getPeerId(x), x);
        } catch {}
      }
      return entities;
    }
    makeGlobalWaiter(secondary = false) {
      const timer = secondary ? "qtsTimer" : "globalPtsTimer";
      const host = {
        onApplied: (pts) => {
          if (this.state)
            this.state[secondary ? "qts" : "pts"] = pts;
        },
        onWaitForSkipped: (ms) => {
          if (ms < 0) {
            if (this[timer]) {
              clearTimeout(this[timer]);
              this[timer] = undefined;
            }
            return;
          }
          if (this[timer]) {
            if (ms > 1)
              return;
            clearTimeout(this[timer]);
          }
          this[timer] = setTimeout(() => {
            this[timer] = undefined;
            this.scheduleCommonDifference();
          }, ms);
        },
        onWaitForShortPoll: () => {}
      };
      return new ptsWaiter_1.PtsWaiter(host);
    }
    getOrCreateChannel(channelId) {
      let tracker = this.channels.get(channelId);
      if (tracker)
        return tracker;
      const host = {
        onWaitForSkipped: (ms) => {
          const t = this.channels.get(channelId);
          if (!t)
            return;
          if (ms < 0) {
            if (t.timer) {
              clearTimeout(t.timer);
              t.timer = undefined;
            }
            return;
          }
          if (t.timer) {
            if (ms > 1)
              return;
            clearTimeout(t.timer);
          }
          t.timer = setTimeout(() => {
            t.timer = undefined;
            this.fetchChannelDifference(channelId);
          }, ms);
        },
        onWaitForShortPoll: () => {}
      };
      tracker = { pts: new ptsWaiter_1.PtsWaiter(host) };
      this.channels.set(channelId, tracker);
      return tracker;
    }
    scheduleCommonDifference() {
      if (!this.state) {
        this.ensureState();
        return;
      }
      if (this.fetchingDifference)
        return;
      if (this.failRetryTimer)
        return;
      this.fetchCommonDifference();
    }
    async fetchCommonDifference() {
      const generation = this.generation;
      if (!this.isCurrent(generation) || this.client.updates.authorizationError || this.fetchingDifference || this.failRetryTimer || !this.state)
        return;
      this.fetchingDifference = true;
      this.globalPts.setRequesting(true);
      this.qts.setRequesting(true);
      let failed = false;
      try {
        await this.fetchDifferenceLoop(generation);
        if (!this.isCurrent(generation))
          return;
        this.failTimeoutS = FAIL_DIFFERENCE_INITIAL_S;
      } catch (e) {
        if (!this.isCurrent(generation))
          return;
        if (this.client.updates._suspendAuthorization(e))
          return;
        const msg = e?.errorMessage;
        if (msg === "PERSISTENT_TIMESTAMP_INVALID") {
          this.client._log.warn("Common pts is invalid; reinitializing update state");
          this.state = undefined;
          this.ensureState();
        } else {
          failed = true;
          this.client._log.warn(`fetchCommonDifference: ${e}`);
        }
      } finally {
        if (this.isCurrent(generation)) {
          if (this.state) {
            this.globalPts.init(this.state.pts, true);
            this.qts.init(this.state.qts, true);
          }
          this.fetchingDifference = false;
          this.globalPts.setRequesting(false);
          this.qts.setRequesting(false);
        }
      }
      if (failed && this.running) {
        const delayMs = this.failTimeoutS * 1000;
        this.bumpFailTimeout();
        this.client._log.debug(`Retry common difference in ${delayMs}ms`);
        this.failRetryTimer = setTimeout(() => {
          this.failRetryTimer = undefined;
          this.scheduleCommonDifference();
        }, delayMs);
      }
      this.drainPendingSeq();
    }
    async fetchDifferenceLoop(generation) {
      if (!this.state)
        return;
      let fetching = true;
      while (fetching && this.isCurrent(generation)) {
        const diff = await withDeadline(this.client.api.updates.getDifference({
          pts: this.state.pts,
          date: this.state.date,
          qts: this.state.qts
        }), DIFFERENCE_DEADLINE_MS, "updates.getDifference");
        if (!this.isCurrent(generation))
          return;
        if (diff instanceof tl_1.Api.updates.DifferenceEmpty) {
          this.state.date = diff.date;
          this.state.seq = diff.seq;
          fetching = false;
        } else if (diff instanceof tl_1.Api.updates.Difference) {
          await this.processDifference(diff, generation);
          if (!this.isCurrent(generation))
            return;
          this.state = { pts: diff.state.pts, qts: diff.state.qts, date: diff.state.date, seq: diff.state.seq };
          fetching = false;
        } else if (diff instanceof tl_1.Api.updates.DifferenceSlice) {
          await this.processDifference(diff, generation);
          if (!this.isCurrent(generation))
            return;
          this.state = { pts: diff.intermediateState.pts, qts: diff.intermediateState.qts, date: diff.intermediateState.date, seq: diff.intermediateState.seq };
        } else if (diff instanceof tl_1.Api.updates.DifferenceTooLong) {
          if (diff.pts <= this.state.pts)
            throw new Error("getDifference did not advance PTS");
          this.state.pts = diff.pts;
          this.client._log.warn("getDifference: too long, some updates may be lost");
        }
      }
    }
    async processDifference(diff, generation = this.generation) {
      const entities = this.collectEntities(diff.users, diff.chats);
      this.client._entityCache.add(diff);
      await this.saveEntities(diff);
      if (!this.isCurrent(generation))
        return;
      for (const message of diff.newMessages) {
        if (message instanceof tl_1.Api.Message || message instanceof tl_1.Api.MessageService) {
          this.dispatch(new tl_1.Api.UpdateNewMessage({ message, pts: 0, ptsCount: 0 }), { others: null, entities });
        }
      }
      for (const message of diff.newEncryptedMessages) {
        this.dispatch(new tl_1.Api.UpdateNewEncryptedMessage({ message, qts: 0 }), { others: null, entities });
      }
      for (const update of diff.otherUpdates) {
        if (update instanceof tl_1.Api.UpdateChannelTooLong) {
          await this.recoverChannel(update, true);
          if (!this.isCurrent(generation))
            return;
        } else if (isChannelPtsUpdate(update)) {
          this.feedUpdate(update, { others: diff.otherUpdates, entities });
        } else {
          this.dispatch(update, { others: diff.otherUpdates, entities });
        }
      }
    }
    drainPendingSeq() {
      if (!this.state || this.fetchingDifference)
        return;
      this.pendingSeq.sort((a, b) => a.seqStart - b.seqStart);
      while (this.pendingSeq.length) {
        const entry = this.pendingSeq[0];
        if (entry.seqStart !== 0 && entry.seqStart > this.state.seq + 1)
          break;
        this.pendingSeq.shift();
        this.applySeq(entry);
      }
      if (!this.pendingSeq.length && this.seqGapTimer) {
        clearTimeout(this.seqGapTimer);
        this.seqGapTimer = undefined;
      } else if (this.pendingSeq.length) {
        this.armSeqGapTimer();
      }
    }
    fetchChannelDifference(channelId, opts = {}) {
      const tracker = this.channels.get(channelId);
      if (!tracker)
        return Promise.resolve();
      if (tracker.difference)
        return tracker.difference;
      const task = this.fetchChannelDifferenceOnce(channelId, opts);
      tracker.difference = task;
      task.finally(() => {
        if (tracker.difference === task)
          tracker.difference = undefined;
      }).catch(() => {});
      return task;
    }
    async fetchChannelDifferenceOnce(channelId, opts = {}) {
      const generation = this.generation;
      if (!this.isCurrent(generation) || this.client.updates.authorizationError)
        return;
      const tracker = this.channels.get(channelId);
      if (!tracker || tracker.pts.requesting())
        return;
      if (!tracker.pts.inited())
        return;
      if (this.channelFailRetryTimers.has(channelId))
        return;
      const current = () => this.isCurrent(generation) && this.channels.get(channelId) === tracker;
      const active = () => current() && (!opts.keepAlive || this.watchedChannels.has(channelId));
      if (tracker.pollTimer) {
        clearTimeout(tracker.pollTimer);
        tracker.pollTimer = undefined;
      }
      tracker.nextPollAt = undefined;
      let failed = false;
      let serverTimeoutS;
      try {
        const inputChannel = await this.resolveChannel(channelId, tracker);
        if (!active())
          return;
        if (!inputChannel) {
          this.client._log.warn(`Cannot resolve channel ${channelId}; skipping diff`);
          return;
        }
        tracker.inputChannel = inputChannel;
        let fetching = true;
        while (fetching && active()) {
          const diff = await this.invokeChannel(channelId, () => new tl_1.Api.updates.GetChannelDifference({
            channel: inputChannel,
            filter: new tl_1.Api.ChannelMessagesFilterEmpty,
            pts: tracker.pts.current(),
            limit: CHANNEL_DIFFERENCE_LIMIT,
            force: opts.keepAlive ? undefined : true
          }));
          if (!active())
            return;
          if (diff.timeout !== undefined)
            serverTimeoutS = diff.timeout;
          if (diff instanceof tl_1.Api.updates.ChannelDifferenceEmpty) {
            if (diff.pts)
              tracker.pts.init(diff.pts, true);
            fetching = !diff.final;
          } else if (diff instanceof tl_1.Api.updates.ChannelDifference) {
            const entities = this.collectEntities(diff.users, diff.chats);
            this.client._entityCache.add(diff);
            await this.saveEntities(diff);
            if (!active())
              return;
            for (const message of diff.newMessages) {
              if (message instanceof tl_1.Api.Message || message instanceof tl_1.Api.MessageService) {
                this.dispatch(new tl_1.Api.UpdateNewChannelMessage({ message, pts: 0, ptsCount: 0 }), { others: null, entities });
              }
            }
            for (const update of diff.otherUpdates) {
              this.dispatch(update, { others: diff.otherUpdates, entities });
            }
            tracker.pts.init(diff.pts, true);
            fetching = !diff.final;
          } else if (diff instanceof tl_1.Api.updates.ChannelDifferenceTooLong) {
            this.client._log.warn(`Channel ${channelId} difference too long`);
            if (diff.dialog instanceof tl_1.Api.Dialog && diff.dialog.pts !== undefined) {
              tracker.pts.init(diff.dialog.pts, true);
            }
            const entities = this.collectEntities(diff.users, diff.chats);
            this.client._entityCache.add(diff);
            await this.saveEntities(diff);
            if (!active())
              return;
            const included = diff.messages.filter((m) => m instanceof tl_1.Api.Message || m instanceof tl_1.Api.MessageService);
            included.sort((a, b) => a.id - b.id);
            for (const message of included) {
              this.dispatch(new tl_1.Api.UpdateNewChannelMessage({ message, pts: 0, ptsCount: 0 }), { others: null, entities });
            }
            fetching = !diff.final;
          }
        }
        this.channelFailTimeoutS.delete(channelId);
      } catch (e) {
        if (!active() || e instanceof channelScheduler_1.ChannelPollCancelledError)
          return;
        if (this.client.updates._suspendAuthorization(e))
          return;
        const msg = e?.errorMessage;
        if (msg === "CHANNEL_PRIVATE" || msg === "CHANNEL_INVALID") {
          this.client._log.info(`Channel ${channelId} is inaccessible (${msg}); dropping difference tracking`);
          this.dropChannel(channelId);
          return;
        }
        if (msg === "PERSISTENT_TIMESTAMP_INVALID") {
          this.client._log.warn(`Channel ${channelId} pts is invalid; resetting tracker`);
          this.dropChannel(channelId);
          return;
        }
        failed = true;
        this.client._log.warn(`fetchChannelDifference ${channelId}: ${e}`);
      } finally {
        if (current())
          tracker.pts.setRequesting(false);
      }
      if (!active())
        return;
      if (!failed)
        this.scheduleChannelPoll(channelId, serverTimeoutS);
      if (failed && this.running && (!opts.keepAlive || this.watchedChannels.has(channelId))) {
        const delayMs = Math.max((this.channelFailTimeoutS.get(channelId) ?? FAIL_DIFFERENCE_INITIAL_S) * 1000, (this.channelScheduler.state.pausedUntil ?? 0) - Date.now());
        tracker.nextPollAt = Date.now() + delayMs;
        this.bumpChannelFailTimeout(channelId);
        this.client._log.debug(`Retry channel ${channelId} difference in ${delayMs}ms`);
        const timer = setTimeout(() => {
          this.channelFailRetryTimers.delete(channelId);
          this.fetchChannelDifference(channelId, opts);
        }, delayMs);
        this.channelFailRetryTimers.set(channelId, timer);
      }
    }
    async resolveChannel(channelId, tracker) {
      if (tracker.inputChannel)
        return tracker.inputChannel;
      try {
        const peer = new tl_1.Api.PeerChannel({ channelId: (0, Helpers_1.returnBigInt)(channelId) });
        const input = await this.client.getInputEntity(peer);
        if (input instanceof tl_1.Api.InputPeerChannel) {
          return new tl_1.Api.InputChannel({ channelId: input.channelId, accessHash: input.accessHash });
        }
      } catch {}
      return;
    }
    scheduleChannelPoll(channelId, serverTimeoutS) {
      if (!this.running || !this.watchedChannels.has(channelId))
        return;
      const tracker = this.channels.get(channelId);
      if (!tracker)
        return;
      if (tracker.pollTimer)
        clearTimeout(tracker.pollTimer);
      const delayMs = serverTimeoutS !== undefined && serverTimeoutS > 0 ? serverTimeoutS * 1000 : this.client._channelPollInterval;
      tracker.nextPollAt = Date.now() + delayMs;
      tracker.pollTimer = setTimeout(() => {
        tracker.pollTimer = undefined;
        this.fetchChannelDifference(channelId, { keepAlive: true });
      }, delayMs);
    }
    bumpFailTimeout() {
      if (this.failTimeoutS < FAIL_DIFFERENCE_CAP_S) {
        this.failTimeoutS = Math.min(this.failTimeoutS * 2, FAIL_DIFFERENCE_CAP_S);
      }
    }
    dropChannel(channelId) {
      this.watchedChannels.delete(channelId);
      this.channelScheduler.cancel(channelId);
      const tracker = this.channels.get(channelId);
      if (tracker) {
        if (tracker.timer)
          clearTimeout(tracker.timer);
        if (tracker.pollTimer)
          clearTimeout(tracker.pollTimer);
        tracker.pts.clearSkippedUpdates();
        this.channels.delete(channelId);
      }
      const retry = this.channelFailRetryTimers.get(channelId);
      if (retry) {
        clearTimeout(retry);
        this.channelFailRetryTimers.delete(channelId);
      }
      this.channelFailTimeoutS.delete(channelId);
    }
    bumpChannelFailTimeout(channelId) {
      const cur = this.channelFailTimeoutS.get(channelId) ?? FAIL_DIFFERENCE_INITIAL_S;
      if (cur < FAIL_DIFFERENCE_CAP_S) {
        this.channelFailTimeoutS.set(channelId, Math.min(cur * 2, FAIL_DIFFERENCE_CAP_S));
      }
    }
  }
  exports2.UpdateManager = UpdateManager;
  function withDeadline(promise, ms, what) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        promise.catch(() => {});
        reject(new Error(`${what} timed out after ${ms}ms`));
      }, ms);
      promise.then((value) => {
        clearTimeout(timer);
        resolve(value);
      }, (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
});

// node_modules/teleproto/tl/custom/forward.js
var require_forward = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Forward = undefined;
  var chatGetter_1 = require_chatGetter();
  var senderGetter_1 = require_senderGetter();
  var Helpers_1 = require_Helpers();
  var Utils_1 = require_Utils();

  class Forward extends senderGetter_1.SenderGetter {
    constructor(client, original, entities) {
      super();
      this.originalFwd = original;
      let senderId = undefined;
      let sender = undefined;
      let inputSender = undefined;
      let peer = undefined;
      let chat = undefined;
      let inputChat = undefined;
      if (original.fromId) {
        const ty = (0, Helpers_1._entityType)(original.fromId);
        if (ty === Helpers_1._EntityType.USER) {
          senderId = (0, Utils_1.getPeerId)(original.fromId);
          [sender, inputSender] = (0, Utils_1._getEntityPair)(senderId, entities, client._entityCache);
        } else if (ty === Helpers_1._EntityType.CHANNEL || ty === Helpers_1._EntityType.CHAT) {
          peer = original.fromId;
          [chat, inputChat] = (0, Utils_1._getEntityPair)((0, Utils_1.getPeerId)(peer), entities, client._entityCache);
        }
      }
      chatGetter_1.ChatGetter.initChatClass(this, {
        chatPeer: peer,
        chat,
        inputChat
      });
      senderGetter_1.SenderGetter.initSenderClass(this, {
        senderId: senderId ? (0, Helpers_1.returnBigInt)(senderId) : undefined,
        sender,
        inputSender
      });
      this._client = client;
    }
  }
  exports2.Forward = Forward;
});

// node_modules/teleproto/tl/custom/file.js
var require_file = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.File = undefined;
  var api_1 = require_api2();
  var Utils_1 = require_Utils();

  class File {
    constructor(media) {
      this.media = media;
    }
    get id() {
      throw new Error("Unsupported");
    }
    get name() {
      return this._fromAttr(api_1.Api.DocumentAttributeFilename, "fileName");
    }
    get mimeType() {
      if (this.media instanceof api_1.Api.Photo) {
        return "image/jpeg";
      } else if (this.media instanceof api_1.Api.Document) {
        return this.media.mimeType;
      }
    }
    get width() {
      return this._fromAttr([api_1.Api.DocumentAttributeImageSize, api_1.Api.DocumentAttributeVideo], "w");
    }
    get height() {
      return this._fromAttr([api_1.Api.DocumentAttributeImageSize, api_1.Api.DocumentAttributeVideo], "h");
    }
    get duration() {
      return this._fromAttr([api_1.Api.DocumentAttributeAudio, api_1.Api.DocumentAttributeVideo], "duration");
    }
    get title() {
      return this._fromAttr(api_1.Api.DocumentAttributeAudio, "title");
    }
    get performer() {
      return this._fromAttr(api_1.Api.DocumentAttributeAudio, "performer");
    }
    get emoji() {
      return this._fromAttr(api_1.Api.DocumentAttributeSticker, "alt");
    }
    get stickerSet() {
      return this._fromAttr(api_1.Api.DocumentAttributeSticker, "stickerset");
    }
    get size() {
      if (this.media instanceof api_1.Api.Photo) {
        return (0, Utils_1._photoSizeByteCount)(this.media.sizes[this.media.sizes.length - 1]);
      } else if (this.media instanceof api_1.Api.Document) {
        return this.media.size;
      }
    }
    _fromAttr(cls, field) {
      if (this.media instanceof api_1.Api.Document) {
        for (const attr of this.media.attributes) {
          if (attr instanceof cls) {
            return attr[field];
          }
        }
      }
    }
  }
  exports2.File = File;
});

// node_modules/teleproto/tl/runtime/patches/messages.js
var require_messages = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.patchAll = patchAll;
  var api_1 = require_api2();
  function getGetter(obj, prop) {
    while (obj) {
      const getter = Object.getOwnPropertyDescriptor(obj, prop);
      if (getter && getter.get) {
        return getter.get;
      }
      obj = Object.getPrototypeOf(obj);
    }
  }
  function getSetter(obj, prop) {
    while (obj) {
      const setter = Object.getOwnPropertyDescriptor(obj, prop);
      if (setter && setter.set) {
        return setter.set;
      }
      obj = Object.getPrototypeOf(obj);
    }
  }
  function getInstanceMethods(obj) {
    const keys = {
      methods: new Set,
      setters: new Set,
      getters: new Set
    };
    let topObject = obj;
    const mapAllMethods = (property) => {
      const getter = getGetter(topObject, property);
      const setter = getSetter(topObject, property);
      if (getter) {
        keys.getters.add(property);
      } else if (setter) {
        keys.setters.add(property);
      } else if (property !== "constructor") {
        keys.methods.add(property);
      }
    };
    do {
      Object.getOwnPropertyNames(obj).map(mapAllMethods);
      obj = Object.getPrototypeOf(obj);
    } while (obj && Object.getPrototypeOf(obj));
    return keys;
  }
  function patchClass(clazz, source) {
    const { getters, setters, methods } = getInstanceMethods(source.prototype);
    for (const getter of getters) {
      Object.defineProperty(clazz.prototype, getter, {
        get: getGetter(source.prototype, getter)
      });
    }
    for (const setter of setters) {
      Object.defineProperty(clazz.prototype, setter, {
        set: getSetter(source.prototype, setter)
      });
    }
    for (const method of methods) {
      clazz.prototype[method] = source.prototype[method];
    }
  }
  function patchAll(source) {
    patchClass(api_1.Api.Message, source);
    patchClass(api_1.Api.MessageService, source);
    patchClass(api_1.Api.MessageEmpty, source);
  }
});

// node_modules/teleproto/Password.js
var require_Password = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.computeCheck = computeCheck;
  exports2.computeDigest = computeDigest;
  var tl_1 = require_tl();
  var Helpers_1 = require_Helpers();
  var big_integer_1 = __importDefault(require_BigInteger());
  var cifrante_1 = require_cifrante_node();
  var SIZE_FOR_HASH = 256;
  function checkPrimeAndGood(primeBytes, g) {
    const goodPrime = Buffer.from([
      199,
      28,
      174,
      185,
      198,
      177,
      201,
      4,
      142,
      108,
      82,
      47,
      112,
      241,
      63,
      115,
      152,
      13,
      64,
      35,
      142,
      62,
      33,
      193,
      73,
      52,
      208,
      55,
      86,
      61,
      147,
      15,
      72,
      25,
      138,
      10,
      167,
      193,
      64,
      88,
      34,
      148,
      147,
      210,
      37,
      48,
      244,
      219,
      250,
      51,
      111,
      110,
      10,
      201,
      37,
      19,
      149,
      67,
      174,
      212,
      76,
      206,
      124,
      55,
      32,
      253,
      81,
      246,
      148,
      88,
      112,
      90,
      198,
      140,
      212,
      254,
      107,
      107,
      19,
      171,
      220,
      151,
      70,
      81,
      41,
      105,
      50,
      132,
      84,
      241,
      143,
      175,
      140,
      89,
      95,
      100,
      36,
      119,
      254,
      150,
      187,
      42,
      148,
      29,
      91,
      205,
      29,
      74,
      200,
      204,
      73,
      136,
      7,
      8,
      250,
      155,
      55,
      142,
      60,
      79,
      58,
      144,
      96,
      190,
      230,
      124,
      249,
      164,
      164,
      166,
      149,
      129,
      16,
      81,
      144,
      126,
      22,
      39,
      83,
      181,
      107,
      15,
      107,
      65,
      13,
      186,
      116,
      216,
      168,
      75,
      42,
      20,
      179,
      20,
      78,
      14,
      241,
      40,
      71,
      84,
      253,
      23,
      237,
      149,
      13,
      89,
      101,
      180,
      185,
      221,
      70,
      88,
      45,
      177,
      23,
      141,
      22,
      156,
      107,
      196,
      101,
      176,
      214,
      255,
      156,
      163,
      146,
      143,
      239,
      91,
      154,
      228,
      228,
      24,
      252,
      21,
      232,
      62,
      190,
      160,
      248,
      127,
      169,
      255,
      94,
      237,
      112,
      5,
      13,
      237,
      40,
      73,
      244,
      123,
      249,
      89,
      217,
      86,
      133,
      12,
      233,
      41,
      133,
      31,
      13,
      129,
      21,
      246,
      53,
      177,
      5,
      238,
      46,
      78,
      21,
      208,
      75,
      36,
      84,
      191,
      111,
      79,
      173,
      240,
      52,
      177,
      4,
      3,
      17,
      156,
      216,
      227,
      185,
      47,
      204,
      91
    ]);
    if (goodPrime.equals(primeBytes)) {
      if ([3, 4, 5, 7].includes(g)) {
        return;
      }
    }
    throw new Error("Changing passwords unsupported");
  }
  function isGoodLarge(number, p) {
    return number.greater((0, big_integer_1.default)(0)) && p.subtract(number).greater((0, big_integer_1.default)(0));
  }
  function numBytesForHash(number) {
    return Buffer.concat([Buffer.alloc(SIZE_FOR_HASH - number.length), number]);
  }
  function bigNumForHash(g) {
    return (0, Helpers_1.readBufferFromBigInt)(g, SIZE_FOR_HASH, false);
  }
  function isGoodModExpFirst(modexp, prime) {
    const diff = prime.subtract(modexp);
    const minDiffBitsCount = 2048 - 64;
    const maxModExpSize = 256;
    return !(diff.lesser((0, big_integer_1.default)(0)) || diff.bitLength().toJSNumber() < minDiffBitsCount || modexp.bitLength().toJSNumber() < minDiffBitsCount || Math.floor((modexp.bitLength().toJSNumber() + 7) / 8) > maxModExpSize);
  }
  function xor(a, b) {
    const length = Math.min(a.length, b.length);
    for (let i = 0;i < length; i++) {
      a[i] = a[i] ^ b[i];
    }
    return a;
  }
  async function pbkdf2sha512(password, salt, iterations) {
    return (0, Helpers_1.asBuffer)(await cifrante_1.kdf.pbkdf2(password, salt, { hash: "sha512", iterations, length: 64 }));
  }
  async function computeHash(algo, password) {
    const hash1 = await (0, Helpers_1.sha256)(Buffer.concat([algo.salt1, Buffer.from(password, "utf-8"), algo.salt1]));
    const hash2 = await (0, Helpers_1.sha256)(Buffer.concat([algo.salt2, hash1, algo.salt2]));
    const hash3 = await pbkdf2sha512(hash2, algo.salt1, 1e5);
    return (0, Helpers_1.sha256)(Buffer.concat([algo.salt2, hash3, algo.salt2]));
  }
  async function computeDigest(algo, password) {
    try {
      checkPrimeAndGood(algo.p, algo.g);
    } catch (e) {
      throw new Error("bad p/g in password");
    }
    const value = (0, Helpers_1.modExp)((0, big_integer_1.default)(algo.g), (0, Helpers_1.readBigIntFromBuffer)(await computeHash(algo, password), false), (0, Helpers_1.readBigIntFromBuffer)(algo.p, false));
    return bigNumForHash(value);
  }
  async function computeCheck(request, password) {
    const algo = request.currentAlgo;
    if (!(algo instanceof tl_1.Api.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow)) {
      throw new Error(`Unsupported password algorithm ${algo?.className}`);
    }
    const srp_B = request.srp_B;
    const srpId = request.srpId;
    if (!srp_B || !srpId) {
      throw new Error(`Undefined srp_b  ${request}`);
    }
    const pwHash = await computeHash(algo, password);
    const p = (0, Helpers_1.readBigIntFromBuffer)(algo.p, false);
    const g = algo.g;
    const B = (0, Helpers_1.readBigIntFromBuffer)(srp_B, false);
    try {
      checkPrimeAndGood(algo.p, g);
    } catch (e) {
      throw new Error("bad /g in password");
    }
    if (!isGoodLarge(B, p)) {
      throw new Error("bad b in check");
    }
    const x = (0, Helpers_1.readBigIntFromBuffer)(pwHash, false);
    const pForHash = numBytesForHash(algo.p);
    const gForHash = bigNumForHash((0, big_integer_1.default)(g));
    const bForHash = numBytesForHash(srp_B);
    const gX = (0, Helpers_1.modExp)((0, big_integer_1.default)(g), x, p);
    const k = (0, Helpers_1.readBigIntFromBuffer)(await (0, Helpers_1.sha256)(Buffer.concat([pForHash, gForHash])), false);
    const kgX = (0, Helpers_1.bigIntMod)(k.multiply(gX), p);
    const generateAndCheckRandom = async () => {
      const randomSize = 256;
      while (true) {
        const random = (0, Helpers_1.generateRandomBytes)(randomSize);
        const a2 = (0, Helpers_1.readBigIntFromBuffer)(random, false);
        const A = (0, Helpers_1.modExp)((0, big_integer_1.default)(g), a2, p);
        if (isGoodModExpFirst(A, p)) {
          const aForHash2 = bigNumForHash(A);
          const u2 = (0, Helpers_1.readBigIntFromBuffer)(await (0, Helpers_1.sha256)(Buffer.concat([aForHash2, bForHash])), false);
          if (u2.greater((0, big_integer_1.default)(0))) {
            return {
              a: a2,
              aForHash: aForHash2,
              u: u2
            };
          }
        }
      }
    };
    const { a, aForHash, u } = await generateAndCheckRandom();
    const gB = (0, Helpers_1.bigIntMod)(B.subtract(kgX), p);
    if (!isGoodModExpFirst(gB, p)) {
      throw new Error("bad gB");
    }
    const ux = u.multiply(x);
    const aUx = a.add(ux);
    const S = (0, Helpers_1.modExp)(gB, aUx, p);
    const [K, pSha, gSha, salt1Sha, salt2Sha] = await Promise.all([
      (0, Helpers_1.sha256)(bigNumForHash(S)),
      (0, Helpers_1.sha256)(pForHash),
      (0, Helpers_1.sha256)(gForHash),
      (0, Helpers_1.sha256)(algo.salt1),
      (0, Helpers_1.sha256)(algo.salt2)
    ]);
    const M1 = await (0, Helpers_1.sha256)(Buffer.concat([
      xor(pSha, gSha),
      salt1Sha,
      salt2Sha,
      aForHash,
      bForHash,
      K
    ]));
    return new tl_1.Api.InputCheckPasswordSRP({
      srpId,
      A: Buffer.from(aForHash),
      M1
    });
  }
});

// node_modules/teleproto/tl/custom/messageButton.js
var require_messageButton = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MessageButton = undefined;
  var api_1 = require_api2();
  var button_1 = require_button();
  var Password_1 = require_Password();

  class MessageButton {
    constructor(client, original, chat, bot, msgId) {
      this.button = original;
      this._bot = bot;
      this._chat = chat;
      this._msgId = msgId;
      this._client = client;
    }
    get client() {
      return this._client;
    }
    get text() {
      return !(this.button instanceof button_1.Button) ? this.button.text : "";
    }
    get data() {
      const type = this._inlineType;
      if (type instanceof api_1.Api.InlineButtonTypeCallback) {
        return type.data;
      }
    }
    get inlineQuery() {
      const type = this._inlineType;
      if (type instanceof api_1.Api.InlineButtonTypeSwitchInline) {
        return type.query;
      }
    }
    get url() {
      const type = this._inlineType;
      if (type instanceof api_1.Api.InlineButtonTypeUrl) {
        return type.url;
      }
    }
    get _inlineType() {
      return this.button instanceof api_1.Api.KeyboardInlineButton ? this.button.type : undefined;
    }
    async click({ sharePhone = false, shareGeo, password }) {
      const inlineType = this._inlineType;
      if (inlineType instanceof api_1.Api.InlineButtonTypeCallback) {
        let encryptedPassword;
        if (password != null) {
          const pwd = await this.client.invoke(new api_1.Api.account.GetPassword);
          encryptedPassword = await (0, Password_1.computeCheck)(pwd, password);
        }
        const request = new api_1.Api.messages.GetBotCallbackAnswer({
          peer: this._chat,
          msgId: this._msgId,
          data: inlineType.data,
          password: encryptedPassword
        });
        try {
          return await this._client.invoke(request);
        } catch (e) {
          if (e.errorMessage == "BOT_RESPONSE_TIMEOUT") {
            return null;
          }
          throw e;
        }
      } else if (inlineType instanceof api_1.Api.InlineButtonTypeSwitchInline) {
        return this._client.invoke(new api_1.Api.messages.StartBot({
          bot: this._bot,
          peer: this._chat,
          startParam: inlineType.query
        }));
      } else if (inlineType instanceof api_1.Api.InlineButtonTypeUrl) {
        return inlineType.url;
      } else if (inlineType instanceof api_1.Api.InlineButtonTypeGame) {
        const request = new api_1.Api.messages.GetBotCallbackAnswer({
          peer: this._chat,
          msgId: this._msgId,
          game: true
        });
        try {
          return await this._client.invoke(request);
        } catch (e) {
          if (e.errorMessage == "BOT_RESPONSE_TIMEOUT") {
            return null;
          }
          throw e;
        }
      } else if (this.button instanceof api_1.Api.KeyboardButton) {
        const type = this.button.type;
        if (type instanceof api_1.Api.ButtonTypeDefault) {
          return this._client.sendMessage(this._chat, {
            message: this.button.text,
            parseMode: undefined
          });
        } else if (type instanceof api_1.Api.ButtonTypeRequestPhone) {
          if (!sharePhone) {
            throw new Error("cannot click on phone buttons unless sharePhone=true");
          }
          if (sharePhone == true || typeof sharePhone == "string") {
            const me = await this._client.getMe();
            sharePhone = new api_1.Api.InputMediaContact({
              phoneNumber: (sharePhone == true ? me.phone : sharePhone) || "",
              firstName: me.firstName || "",
              lastName: me.lastName || "",
              vcard: ""
            });
          }
          return this._client.sendFile(this._chat, {
            file: sharePhone
          });
        } else if (type instanceof api_1.Api.ButtonTypeRequestGeoLocation) {
          if (!shareGeo) {
            throw new Error("cannot click on geo buttons unless shareGeo=[longitude, latitude]");
          }
          if (Array.isArray(shareGeo)) {
            shareGeo = new api_1.Api.InputMediaGeoPoint({
              geoPoint: new api_1.Api.InputGeoPoint({
                long: shareGeo[0],
                lat: shareGeo[1]
              })
            });
          }
          return this._client.sendFile(this._chat, {
            file: shareGeo
          });
        }
      }
    }
  }
  exports2.MessageButton = MessageButton;
});

// node_modules/teleproto/tl/custom/message.js
var require_message = __commonJS((exports2) => {
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
  exports2.CustomMessage = undefined;
  exports2.installMessageBehaviour = installMessageBehaviour;
  var senderGetter_1 = require_senderGetter();
  var api_1 = require_api2();
  var chatGetter_1 = require_chatGetter();
  var utils = __importStar(require_Utils());
  var forward_1 = require_forward();
  var file_1 = require_file();
  var rich = __importStar(require_richMessage());
  var Helpers_1 = require_Helpers();
  var messages_1 = require_messages();
  var messageButton_1 = require_messageButton();

  class CustomMessage extends senderGetter_1.SenderGetter {
    init({ id, peerId = undefined, date = undefined, out = undefined, mentioned = undefined, mediaUnread = undefined, silent = undefined, post = undefined, fromId = undefined, replyTo = undefined, message = undefined, fwdFrom = undefined, viaBotId = undefined, media = undefined, replyMarkup = undefined, entities = undefined, views = undefined, editDate = undefined, postAuthor = undefined, groupedId = undefined, fromScheduled = undefined, legacy = undefined, editHide = undefined, pinned = undefined, restrictionReason = undefined, forwards = undefined, replies = undefined, action = undefined, reactions = undefined, noforwards = undefined, ttlPeriod = undefined, _entities = new Map }) {
      if (!id)
        throw new Error("id is a required attribute for Message");
      let senderId = undefined;
      if (fromId) {
        senderId = utils.getPeerId(fromId);
      } else if (peerId) {
        if (post || !out && peerId instanceof api_1.Api.PeerUser) {
          senderId = utils.getPeerId(peerId);
        }
      }
      this._entities = _entities;
      this.out = out;
      this.mentioned = mentioned;
      this.mediaUnread = mediaUnread;
      this.silent = silent;
      this.post = post;
      this.post = post;
      this.fromScheduled = fromScheduled;
      this.legacy = legacy;
      this.editHide = editHide;
      this.ttlPeriod = ttlPeriod;
      this.id = id;
      this.fromId = fromId;
      this.peerId = peerId;
      this.fwdFrom = fwdFrom;
      this.viaBotId = viaBotId;
      this.replyTo = replyTo;
      this.date = date;
      this.message = message;
      this.media = media instanceof api_1.Api.MessageMediaEmpty ? media : undefined;
      this.replyMarkup = replyMarkup;
      this.entities = entities;
      this.views = views;
      this.forwards = forwards;
      this.replies = replies;
      this.editDate = editDate;
      this.pinned = pinned;
      this.postAuthor = postAuthor;
      this.groupedId = groupedId;
      this.restrictionReason = restrictionReason;
      this.action = action;
      this.noforwards = noforwards;
      this.reactions = reactions;
      this._client = undefined;
      this._text = undefined;
      this._file = undefined;
      this._replyMessage = undefined;
      this._buttons = undefined;
      this._buttonsFlat = undefined;
      this._buttonsCount = 0;
      this._viaBot = undefined;
      this._viaInputBot = undefined;
      this._actionEntities = undefined;
      chatGetter_1.ChatGetter.initChatClass(this, { chatPeer: peerId, broadcast: post });
      senderGetter_1.SenderGetter.initSenderClass(this, {
        senderId: senderId ? (0, Helpers_1.returnBigInt)(senderId) : undefined
      });
      this._forward = undefined;
    }
    constructor(args) {
      super();
      this.init(args);
    }
    _finishInit(client, entities, inputChat) {
      this._client = client;
      const cache = client._entityCache;
      if (this.senderId) {
        [this._sender, this._inputSender] = utils._getEntityPair(this.senderId.toString(), entities, cache);
      }
      if (this.chatId) {
        [this._chat, this._inputChat] = utils._getEntityPair(this.chatId.toString(), entities, cache);
      }
      if (inputChat) {
        this._inputChat = inputChat;
      }
      if (this.viaBotId) {
        [this._viaBot, this._viaInputBot] = utils._getEntityPair(this.viaBotId.toString(), entities, cache);
      }
      if (this.fwdFrom) {
        this._forward = new forward_1.Forward(this._client, this.fwdFrom, entities);
      }
      if (this.action) {
        if (this.action instanceof api_1.Api.MessageActionChatAddUser || this.action instanceof api_1.Api.MessageActionChatCreate) {
          this._actionEntities = this.action.users.map((i) => entities.get(i.toString()));
        } else if (this.action instanceof api_1.Api.MessageActionChatDeleteUser) {
          this._actionEntities = [
            entities.get(this.action.userId.toString())
          ];
        } else if (this.action instanceof api_1.Api.MessageActionChatJoinedByLink) {
          this._actionEntities = [
            entities.get(utils.getPeerId(new api_1.Api.PeerChannel({
              channelId: this.action.inviterId
            })))
          ];
        } else if (this.action instanceof api_1.Api.MessageActionChannelMigrateFrom) {
          this._actionEntities = [
            entities.get(utils.getPeerId(new api_1.Api.PeerChat({ chatId: this.action.chatId })))
          ];
        }
      }
    }
    get client() {
      return this._client;
    }
    get text() {
      if (this._text === undefined && this._client) {
        if (!this._client.parseMode) {
          this._text = this.message;
        } else {
          this._text = this._client.parseMode.unparse(this.message || "", this.entities || []);
        }
      }
      return this._text || "";
    }
    set text(value) {
      this._text = value;
      if (this._client && this._client.parseMode) {
        [this.message, this.entities] = this._client.parseMode.parse(value);
      } else {
        this.message = value;
        this.entities = [];
      }
    }
    get rawText() {
      return this.message || "";
    }
    set rawText(value) {
      this.message = value;
      this.entities = [];
      this._text = "";
    }
    get isReply() {
      return !!this.replyTo;
    }
    get forward() {
      return this._forward;
    }
    async _refetchSender() {
      await this._reloadMessage();
    }
    async _reloadMessage() {
      if (!this._client)
        return;
      let msg = undefined;
      try {
        const chat = this.isChannel ? await this.getInputChat() : undefined;
        let temp = await this._client.getMessages(chat, { ids: this.id });
        if (temp) {
          msg = temp[0];
        }
      } catch (e) {
        this._client._log.error("Got error while trying to finish init message with id " + this.id, e);
        if (this._client._errorHandler) {
          await this._client._errorHandler(e);
        }
      }
      if (msg == undefined)
        return;
      this._sender = msg._sender;
      this._inputSender = msg._inputSender;
      this._chat = msg._chat;
      this._inputChat = msg._inputChat;
      this._viaBot = msg._viaBot;
      this._viaInputBot = msg._viaInputBot;
      this._forward = msg._forward;
      this._actionEntities = msg._actionEntities;
    }
    get buttons() {
      if (!this._buttons && this.replyMarkup) {
        if (!this.inputChat) {
          return;
        }
        try {
          const bot = this._neededMarkupBot();
          this._setButtons(this.inputChat, bot);
        } catch (e) {
          return;
        }
      }
      return this._buttons;
    }
    async getButtons() {
      if (!this.buttons && this.replyMarkup) {
        const chat = await this.getInputChat();
        if (!chat)
          return;
        let bot;
        try {
          bot = this._neededMarkupBot();
        } catch (e) {
          await this._reloadMessage();
          try {
            bot = this._neededMarkupBot();
          } catch (err) {
            bot = this.viaBotId ? await this.client.getInputEntity(this.viaBotId) : await this.getInputSender();
            if (!bot)
              throw err;
          }
        }
        this._setButtons(chat, bot);
      }
      return this._buttons;
    }
    get buttonCount() {
      if (!this._buttonsCount) {
        if (this.replyMarkup instanceof api_1.Api.ReplyInlineMarkup || this.replyMarkup instanceof api_1.Api.ReplyKeyboardMarkup) {
          this._buttonsCount = this.replyMarkup.rows.map((r) => r.buttons.length).reduce(function(a, b) {
            return a + b;
          }, 0);
        } else {
          this._buttonsCount = 0;
        }
      }
      return this._buttonsCount;
    }
    get file() {
      if (!this._file) {
        const media = this.photo || this.document;
        if (media) {
          this._file = new file_1.File(media);
        }
      }
      return this._file;
    }
    get photo() {
      if (this.media instanceof api_1.Api.MessageMediaPhoto) {
        if (this.media.photo instanceof api_1.Api.Photo)
          return this.media.photo;
      } else if (this.action instanceof api_1.Api.MessageActionChatEditPhoto) {
        return this.action.photo;
      } else {
        return this.webPreview && this.webPreview.photo instanceof api_1.Api.Photo ? this.webPreview.photo : undefined;
      }
      return;
    }
    get document() {
      if (this.media instanceof api_1.Api.MessageMediaDocument) {
        if (this.media.document instanceof api_1.Api.Document)
          return this.media.document;
      } else {
        const web = this.webPreview;
        return web && web.document instanceof api_1.Api.Document ? web.document : undefined;
      }
      return;
    }
    get webPreview() {
      if (this.media instanceof api_1.Api.MessageMediaWebPage) {
        if (this.media.webpage instanceof api_1.Api.WebPage)
          return this.media.webpage;
      }
    }
    get audio() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeAudio, (attr) => !attr.voice);
    }
    get voice() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeAudio, (attr) => !!attr.voice);
    }
    get video() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeVideo);
    }
    get videoNote() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeVideo, (attr) => !!attr.roundMessage);
    }
    get gif() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeAnimated);
    }
    get sticker() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeSticker);
    }
    get contact() {
      if (this.media instanceof api_1.Api.MessageMediaContact) {
        return this.media;
      }
    }
    get game() {
      if (this.media instanceof api_1.Api.MessageMediaGame) {
        return this.media.game;
      }
    }
    get geo() {
      if (this.media instanceof api_1.Api.MessageMediaGeo || this.media instanceof api_1.Api.MessageMediaGeoLive || this.media instanceof api_1.Api.MessageMediaVenue) {
        return this.media.geo;
      }
    }
    get invoice() {
      if (this.media instanceof api_1.Api.MessageMediaInvoice) {
        return this.media;
      }
    }
    get poll() {
      if (this.media instanceof api_1.Api.MessageMediaPoll) {
        return this.media;
      }
    }
    get venue() {
      if (this.media instanceof api_1.Api.MessageMediaVenue) {
        return this.media;
      }
    }
    get dice() {
      if (this.media instanceof api_1.Api.MessageMediaDice) {
        return this.media;
      }
    }
    get actionEntities() {
      return this._actionEntities;
    }
    get viaBot() {
      return this._viaBot;
    }
    get viaInputBot() {
      return this._viaInputBot;
    }
    get replyToMsgId() {
      return this.replyTo?.replyToMsgId;
    }
    get toId() {
      if (this._client && !this.out && this.isPrivate) {
        return new api_1.Api.PeerUser({
          userId: this._client._selfInputPeer?.userId
        });
      }
      return this.peerId;
    }
    get richText() {
      return this.richMessage && this.richMessage instanceof api_1.Api.RichMessage ? rich.toPlainText(this.richMessage) : undefined;
    }
    get richMarkdown() {
      return this.richMessage && this.richMessage instanceof api_1.Api.RichMessage ? rich.toMarkdown(this.richMessage) : undefined;
    }
    get richHtml() {
      return this.richMessage && this.richMessage instanceof api_1.Api.RichMessage ? rich.toHtml(this.richMessage) : undefined;
    }
    async fetchRichMessage() {
      const current = this.richMessage;
      if (!this._client || !current || !(current instanceof api_1.Api.RichMessage) || !current.part) {
        return this;
      }
      const full = await this._client.getRichMessage(await this.getInputChat(), this.id);
      if (full && full.richMessage) {
        this.richMessage = full.richMessage;
      }
      return this;
    }
    getEntitiesText(cls) {
      let ent = this.entities;
      if (!ent || ent.length == 0)
        return;
      if (cls) {
        ent = ent.filter((v) => v instanceof cls);
      }
      const texts = utils.getInnerText(this.message || "", ent);
      const zip = (rows) => rows[0].map((_, c) => rows.map((row) => row[c]));
      return zip([ent, texts]);
    }
    async getReplyMessage() {
      if (!this._replyMessage && this._client) {
        if (!this.replyTo)
          return;
        this._replyMessage = (await this._client.getMessages(this.isChannel ? await this.getInputChat() : undefined, {
          ids: new api_1.Api.InputMessageReplyTo({ id: this.id })
        }))[0];
        if (!this._replyMessage) {
          this._replyMessage = (await this._client.getMessages(this.isChannel ? this._inputChat : undefined, {
            ids: this.replyToMsgId
          }))[0];
        }
      }
      return this._replyMessage;
    }
    async respond(params) {
      if (this._client) {
        return this._client.sendMessage(await this.getInputChat(), params);
      }
    }
    async reply(params) {
      if (this._client) {
        params.replyTo = this.id;
        return this._client.sendMessage(await this.getInputChat(), params);
      }
    }
    async forwardTo(entity, params) {
      if (this._client) {
        entity = await this._client.getInputEntity(entity);
        return this._client.forwardMessages(entity, {
          ...params,
          messages: [this.id],
          fromPeer: await this.getInputChat()
        });
      }
    }
    async edit(params) {
      const param = params;
      if (this.fwdFrom || !this._client)
        return;
      if (param.linkPreview == undefined) {
        param.linkPreview = !!this.webPreview;
      }
      if (param.buttons == undefined) {
        param.buttons = this.replyMarkup;
      }
      param.message = this.id;
      return this._client.editMessage(await this.getInputChat(), param);
    }
    async delete({ revoke = true } = {}) {
      if (this._client) {
        return this._client.deleteMessages(await this.getInputChat(), [this.id], {
          revoke
        });
      }
    }
    async pin(params) {
      if (this._client) {
        const entity = await this.getInputChat();
        if (entity === undefined) {
          throw Error("Failed to pin message due to cannot get input chat.");
        }
        return this._client.pinMessage(entity, this.id, params);
      }
    }
    async unpin(params) {
      if (this._client) {
        const entity = await this.getInputChat();
        if (entity === undefined) {
          throw Error("Failed to unpin message due to cannot get input chat.");
        }
        return this._client.unpinMessage(entity, this.id, params);
      }
    }
    async downloadMedia(params) {
      if (this._client)
        return this._client.downloadMedia(this, params || {});
    }
    async markAsRead(params) {
      if (this._client) {
        const entity = await this.getInputChat();
        if (entity === undefined) {
          throw Error(`Failed to mark message id ${this.id} as read due to cannot get input chat.`);
        }
        return this._client.markAsRead(entity, this.id, params);
      }
    }
    async react(reaction, big, addToRecent) {
      if (!this._client)
        return;
      function toReaction(r) {
        if (typeof r === "string") {
          return new api_1.Api.ReactionEmoji({ emoticon: r });
        }
        if (r instanceof api_1.Api.ReactionEmoji || r instanceof api_1.Api.ReactionCustomEmoji || r instanceof api_1.Api.ReactionPaid || r instanceof api_1.Api.ReactionEmpty) {
          return r;
        }
        return new api_1.Api.ReactionCustomEmoji({
          documentId: (0, Helpers_1.returnBigInt)(r)
        });
      }
      let reactionList;
      if (reaction == undefined) {
        reactionList = [];
      } else if (Array.isArray(reaction)) {
        reactionList = reaction.map(toReaction);
      } else {
        reactionList = [toReaction(reaction)];
      }
      return this._client.sendReaction(await this.getInputChat(), this.id, reactionList, big, addToRecent);
    }
    async getReactions(limit, reaction, offset) {
      if (!this._client)
        return;
      return this._client.getReactionUsers(await this.getInputChat(), this.id, { limit, reaction, offset });
    }
    async copy(entity, params) {
      if (!this._client)
        return;
      entity = await this._client.getInputEntity(entity);
      const sent = await this._client.forwardMessages(entity, {
        ...params,
        messages: [this.id],
        fromPeer: await this.getInputChat(),
        dropAuthor: true
      });
      return sent[0];
    }
    async click({ i, j, text, filter, data, sharePhone, shareGeo, password }) {
      if (!this.client) {
        return;
      }
      if (data) {
        const chat = await this.getInputChat();
        if (!chat) {
          return;
        }
        const button2 = new api_1.Api.KeyboardInlineButton({
          text: "",
          type: new api_1.Api.InlineButtonTypeCallback({
            data
          })
        });
        return await new messageButton_1.MessageButton(this.client, button2, chat, undefined, this.id).click({
          sharePhone,
          shareGeo,
          password
        });
      }
      if (this.poll) {
        let findPoll = function(answers) {
          if (i != null) {
            if (Array.isArray(i)) {
              const corrects = [];
              for (let x = 0;x < i.length; x++) {
                corrects.push(answers[x].option);
              }
              return corrects;
            }
            return [answers[i].option];
          }
          if (text != null) {
            if (typeof text == "function") {
              for (const answer of answers) {
                if (text(answer.text)) {
                  return [answer.option];
                }
              }
            } else {
              for (const answer of answers) {
                if (answer.text.text == text) {
                  return [answer.option];
                }
              }
            }
            return;
          }
          if (filter != null) {
            for (const answer of answers) {
              if (filter(answer)) {
                return [answer.option];
              }
            }
            return;
          }
        };
        const options = findPoll(this.poll.poll.answers) || [];
        const chat = await this.getInputChat();
        if (!chat) {
          return;
        }
        return await this.client.invoke(new api_1.Api.messages.SendVote({
          peer: chat,
          msgId: this.id,
          options
        }));
      }
      if (!await this.getButtons()) {
        return;
      }
      function findButton(self) {
        if (!self._buttonsFlat || !self._buttons) {
          return;
        }
        if (Array.isArray(i)) {
          i = i[0];
        }
        if (text != null) {
          if (typeof text == "function") {
            for (const button2 of self._buttonsFlat) {
              if (text(button2.text)) {
                return button2;
              }
            }
          } else {
            for (const button2 of self._buttonsFlat) {
              if (button2.text == text) {
                return button2;
              }
            }
          }
          return;
        }
        if (filter != null) {
          for (const button2 of self._buttonsFlat) {
            if (filter(button2)) {
              return button2;
            }
          }
          return;
        }
        if (i == undefined) {
          i = 0;
        }
        if (j == undefined) {
          return self._buttonsFlat[i];
        } else {
          return self._buttons[i][j];
        }
      }
      const button = findButton(this);
      if (button) {
        return await button.click({
          sharePhone,
          shareGeo,
          password
        });
      }
    }
    _setButtons(chat, bot) {
      if (this.client && (this.replyMarkup instanceof api_1.Api.ReplyInlineMarkup || this.replyMarkup instanceof api_1.Api.ReplyKeyboardMarkup)) {
        this._buttons = [];
        this._buttonsFlat = [];
        for (const row of this.replyMarkup.rows) {
          const tmp = [];
          for (const button of row.buttons) {
            const btn = new messageButton_1.MessageButton(this.client, button, chat, bot, this.id);
            tmp.push(btn);
            this._buttonsFlat.push(btn);
          }
          this._buttons.push(tmp);
