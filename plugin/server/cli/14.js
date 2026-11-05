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
  if (import_node_fs8.existsSync(path2)) {
    const world = JSON.parse(import_node_fs8.readFileSync(path2, "utf8"));
    if (world?.version !== 1 || !Array.isArray(world.chats) || !Array.isArray(world.users)) {
      throw new Error(`${path2} is not a mock state file (expected {"version":1,"me":…,"users":[…],"chats":[…]}). Delete it to start from the built-in account.`);
    }
    return world;
  }
  return seedWorld();
}
function saveWorld(world, path2 = mockStatePath()) {
  import_node_fs8.mkdirSync(import_node_path8.dirname(path2), { recursive: true, mode: 448 });
  import_node_fs8.writeFileSync(path2, JSON.stringify(world, null, 1) + `
`, { encoding: "utf8", mode: 384 });
}
var import_node_fs8, import_node_path8, MIN = 60, HOUR = 3600, DAY = 86400, START_MENU;
var init_world = __esm(() => {
  init_paths();
  import_node_fs8 = require("node:fs");
  import_node_path8 = require("node:path");
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
    if (typeof params.file !== "string" || !import_node_fs9.existsSync(params.file))
      throw new Error(`File not found: ${String(params.file)}`);
    const chat = this.chat(like, true);
    const reply = typeof params.replyTo === "object" ? params.replyTo : { replyToMsgId: params.replyTo, topMsgId: undefined };
    const ext = import_node_path9.extname(params.file).toLowerCase();
    const kind = params.forceDocument ? "document" : [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? "photo" : [".mp4", ".mov", ".webm"].includes(ext) ? "video" : [".ogg", ".oga"].includes(ext) ? "voice" : "document";
    const sent = this.append(chat, {
      out: true,
      text: params.caption ?? "",
      replyTo: reply.replyToMsgId,
      thread: reply.topMsgId,
      media: { kind, fileName: kind === "photo" ? undefined : import_node_path9.basename(params.file) }
    });
    this.save();
    return this.message(chat, sent);
  }
  async downloadMedia(message, params = {}) {
    const content = Buffer.from(`mock media of message ${message.id}
`);
    if (typeof params.outputFile !== "string")
      return content;
    import_node_fs9.mkdirSync(import_node_path9.dirname(params.outputFile), { recursive: true });
    import_node_fs9.writeFileSync(params.outputFile, content);
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
var import_teleproto3, import_dialog, import_big_integer, import_node_fs9, import_node_path9, args = (value) => value, now = () => Math.floor(Date.now() / 1000), HASH, announced = false;
var init_client = __esm(() => {
  init_world();
  import_teleproto3 = __toESM(require_teleproto(), 1);
  import_dialog = __toESM(require_dialog(), 1);
  import_big_integer = __toESM(require_BigInteger(), 1);
  import_node_fs9 = require("node:fs");
  import_node_path9 = require("node:path");
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
var VERSION = "0.39.2";

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
      const bestOption = findBestOptionFromValue(option2);
      const optionKey = bestOption.attributeName();
      const source = this.getOptionValueSource(optionKey);
      if (source === "env") {
        return `environment variable '${bestOption.envVar}'`;
      }
      return `option '${bestOption.flags}'`;
    };
    const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
    this.error(message, { code: "commander.conflictingOption" });
  }
  unknownOption(flag) {
    if (this._allowUnknownOption)
      return;
    let suggestion = "";
    if (flag.startsWith("--") && this._showSuggestionAfterError) {
      let candidateFlags = [];
      let command = this;
      do {
        const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
        candidateFlags = candidateFlags.concat(moreFlags);
        command = command.parent;
      } while (command && !command._enablePositionalOptions);
      suggestion = suggestSimilar(flag, candidateFlags);
    }
    const message = `error: unknown option '${flag}'${suggestion}`;
    this.error(message, { code: "commander.unknownOption" });
  }
  _excessArguments(receivedArgs) {
    if (this._allowExcessArguments)
      return;
    const expected = this.registeredArguments.length;
    const s = expected === 1 ? "" : "s";
    const received = receivedArgs.length;
    const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
    const details = receivedArgs.join(", ");
    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${received}: ${details}.`;
    this.error(message, { code: "commander.excessArguments" });
  }
  unknownCommand() {
    const unknownName = this.args[0];
    let suggestion = "";
    if (this._showSuggestionAfterError) {
      const candidateNames = [];
      this.createHelp().visibleCommands(this).forEach((command) => {
        candidateNames.push(command.name());
        if (command.alias())
          candidateNames.push(command.alias());
      });
      suggestion = suggestSimilar(unknownName, candidateNames);
    }
    const message = `error: unknown command '${unknownName}'${suggestion}`;
    this.error(message, { code: "commander.unknownCommand" });
  }
  version(str, flags, description) {
    if (str === undefined)
      return this._version;
    this._version = str;
    flags = flags || "-V, --version";
    description = description || "output the version number";
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this._registerOption(versionOption);
    this.on("option:" + versionOption.name(), () => {
      this._outputConfiguration.writeOut(`${str}
`);
      this._exit(0, "commander.version", str);
    });
    return this;
  }
  description(str, argsDescription) {
    if (str === undefined && argsDescription === undefined)
      return this._description;
    this._description = str;
    if (argsDescription) {
      this._argsDescription = argsDescription;
    }
    return this;
  }
  summary(str) {
    if (str === undefined)
      return this._summary;
    this._summary = str;
    return this;
  }
  alias(alias) {
    if (alias === undefined)
      return this._aliases[0];
    let command = this;
    if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
      command = this.commands[this.commands.length - 1];
    }
    if (alias === command._name)
      throw new Error("Command alias can't be the same as its name");
    const matchingCommand = this.parent?._findCommand(alias);
    if (matchingCommand) {
      const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
      throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
    }
    command._aliases.push(alias);
    return this;
  }
  aliases(aliases) {
    if (aliases === undefined)
      return this._aliases;
    aliases.forEach((alias) => this.alias(alias));
    return this;
  }
  usage(str) {
    if (str === undefined) {
      if (this._usage)
        return this._usage;
      const args = this.registeredArguments.map((arg) => {
        return humanReadableArgName(arg);
      });
      return [].concat(this.options.length || this._helpOption !== null ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
    }
    this._usage = str;
    return this;
  }
  name(str) {
    if (str === undefined)
      return this._name;
    this._name = str;
    return this;
  }
  helpGroup(heading) {
    if (heading === undefined)
      return this._helpGroupHeading ?? "";
    this._helpGroupHeading = heading;
    return this;
  }
  commandsGroup(heading) {
    if (heading === undefined)
      return this._defaultCommandGroup ?? "";
    this._defaultCommandGroup = heading;
    return this;
  }
  optionsGroup(heading) {
    if (heading === undefined)
      return this._defaultOptionGroup ?? "";
    this._defaultOptionGroup = heading;
    return this;
  }
  _initOptionGroup(option) {
    if (this._defaultOptionGroup && !option.helpGroupHeading)
      option.helpGroup(this._defaultOptionGroup);
  }
  _initCommandGroup(cmd) {
    if (this._defaultCommandGroup && !cmd.helpGroup())
      cmd.helpGroup(this._defaultCommandGroup);
  }
  nameFromFilename(filename) {
    this._name = import_node_path.default.basename(filename, import_node_path.default.extname(filename));
    return this;
  }
  executableDir(path2) {
    if (path2 === undefined)
      return this._executableDir;
    this._executableDir = path2;
    return this;
  }
  helpInformation(contextOptions) {
    const helper = this.createHelp();
    const context = this._getOutputContext(contextOptions);
    helper.prepareContext({
      error: context.error,
      helpWidth: context.helpWidth,
      outputHasColors: context.hasColors
    });
    const text = helper.formatHelp(this, helper);
    if (context.hasColors)
      return text;
    return this._outputConfiguration.stripColor(text);
  }
  _getOutputContext(contextOptions) {
    contextOptions = contextOptions || {};
    const error = !!contextOptions.error;
    let baseWrite;
    let hasColors;
    let helpWidth;
    if (error) {
      baseWrite = (str) => this._outputConfiguration.writeErr(str);
      hasColors = this._outputConfiguration.getErrHasColors();
      helpWidth = this._outputConfiguration.getErrHelpWidth();
    } else {
      baseWrite = (str) => this._outputConfiguration.writeOut(str);
      hasColors = this._outputConfiguration.getOutHasColors();
      helpWidth = this._outputConfiguration.getOutHelpWidth();
    }
    const write = (str) => {
      if (!hasColors)
        str = this._outputConfiguration.stripColor(str);
      return baseWrite(str);
    };
    return { error, write, hasColors, helpWidth };
  }
  outputHelp(contextOptions) {
    let deprecatedCallback;
    if (typeof contextOptions === "function") {
      deprecatedCallback = contextOptions;
      contextOptions = undefined;
    }
    const outputContext = this._getOutputContext(contextOptions);
    const eventContext = {
      error: outputContext.error,
      write: outputContext.write,
      command: this
    };
    this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
    this.emit("beforeHelp", eventContext);
    let helpInformation = this.helpInformation({ error: outputContext.error });
    if (deprecatedCallback) {
      helpInformation = deprecatedCallback(helpInformation);
      if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
        throw new Error("outputHelp callback must return a string or a Buffer");
      }
    }
    outputContext.write(helpInformation);
    if (this._getHelpOption()?.long) {
      this.emit(this._getHelpOption().long);
    }
    this.emit("afterHelp", eventContext);
    this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", eventContext));
  }
  helpOption(flags, description) {
    if (typeof flags === "boolean") {
      if (flags) {
        if (this._helpOption === null)
          this._helpOption = undefined;
        if (this._defaultOptionGroup) {
          this._initOptionGroup(this._getHelpOption());
        }
      } else {
        this._helpOption = null;
      }
      return this;
    }
    this._helpOption = this.createOption(flags ?? "-h, --help", description ?? "display help for command");
    if (flags || description)
      this._initOptionGroup(this._helpOption);
    return this;
  }
  _getHelpOption() {
    if (this._helpOption === undefined) {
      this.helpOption(undefined, undefined);
    }
    return this._helpOption;
  }
  addHelpOption(option) {
    this._helpOption = option;
    this._initOptionGroup(option);
    return this;
  }
  help(contextOptions) {
    this.outputHelp(contextOptions);
    let exitCode = Number(import_node_process.default.exitCode ?? 0);
    if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
      exitCode = 1;
    }
    this._exit(exitCode, "commander.help", "(outputHelp)");
  }
  addHelpText(position, text) {
    const allowedValues = ["beforeAll", "before", "after", "afterAll"];
    if (!allowedValues.includes(position)) {
      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    const helpEvent = `${position}Help`;
    this.on(helpEvent, (context) => {
      let helpStr;
      if (typeof text === "function") {
        helpStr = text({ error: context.error, command: context.command });
      } else {
        helpStr = text;
      }
      if (helpStr) {
        context.write(`${helpStr}
`);
      }
    });
    return this;
  }
  _outputHelpIfRequested(args) {
    const helpOption = this._getHelpOption();
    const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
    if (helpRequested) {
      this.outputHelp();
      this._exit(0, "commander.helpDisplayed", "(outputHelp)");
    }
  }
}
function incrementNodeInspectorPort(args) {
  return args.map((arg) => {
    if (!arg.startsWith("--inspect")) {
      return arg;
    }
    let debugOption;
    let debugHost = "127.0.0.1";
    let debugPort = "9229";
    let match;
    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
      debugOption = match[1];
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
      debugOption = match[1];
      if (/^\d+$/.test(match[3])) {
        debugPort = match[3];
      } else {
        debugHost = match[3];
      }
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
      debugOption = match[1];
      debugHost = match[3];
      debugPort = match[4];
    }
    if (debugOption && debugPort !== "0") {
      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
    }
    return arg;
  });
}
function useColor() {
  if (import_node_process.default.env.NO_COLOR || import_node_process.default.env.FORCE_COLOR === "0" || import_node_process.default.env.FORCE_COLOR === "false")
    return false;
  if (import_node_process.default.env.FORCE_COLOR || import_node_process.default.env.CLICOLOR_FORCE !== undefined)
    return true;
  return;
}

// node_modules/commander/index.js
var program = new Command;

// src/index.ts
init_paths();

// src/mcp.ts
var import_node_child_process6 = require("node:child_process");
var import_node_path6 = require("node:path");
var import_node_readline = require("node:readline");
var import_node_worker_threads = require("node:worker_threads");

// src/update.ts
var BACKGROUND_CHECK_COMMAND = "__update-check";
function isCompiledBinary() {
  return false;
}
function maybeNotifyUpdate() {}
async function runBackgroundCheck() {}

// src/mcp.ts
init_api_methods();

// src/generated/tl-commands.ts
var TL_METHODS = [
  ["account", "accept-authorization", "account.AcceptAuthorization"],
  ["account", "cancel-password-email", "account.CancelPasswordEmail"],
  ["account", "change-authorization-settings", "account.ChangeAuthorizationSettings"],
  ["account", "change-phone", "account.ChangePhone"],
  ["account", "check-username", "account.CheckUsername"],
  ["account", "clear-recent-emoji-statuses", "account.ClearRecentEmojiStatuses"],
  ["account", "confirm-bot-connection", "account.ConfirmBotConnection"],
  ["account", "confirm-password-email", "account.ConfirmPasswordEmail"],
  ["account", "confirm-phone", "account.ConfirmPhone"],
  ["account", "create-business-chat-link", "account.CreateBusinessChatLink"],
  ["account", "create-theme", "account.CreateTheme"],
  ["account", "decline-password-reset", "account.DeclinePasswordReset"],
  ["account", "delete-account", "account.DeleteAccount"],
  ["account", "delete-auto-save-exceptions", "account.DeleteAutoSaveExceptions"],
  ["account", "delete-business-chat-link", "account.DeleteBusinessChatLink"],
  ["account", "delete-passkey", "account.DeletePasskey"],
  ["account", "delete-secure-value", "account.DeleteSecureValue"],
  ["account", "delete-web-browser-settings-exceptions", "account.DeleteWebBrowserSettingsExceptions"],
  ["account", "disable-peer-connected-bot", "account.DisablePeerConnectedBot"],
  ["account", "edit-business-chat-link", "account.EditBusinessChatLink"],
  ["account", "finish-takeout-session", "account.FinishTakeoutSession"],
  ["account", "get-account-ttl", "account.GetAccountTTL"],
  ["account", "get-all-secure-values", "account.GetAllSecureValues"],
  ["account", "get-authorization-form", "account.GetAuthorizationForm"],
  ["account", "get-authorizations", "account.GetAuthorizations"],
  ["account", "get-auto-download-settings", "account.GetAutoDownloadSettings"],
  ["account", "get-auto-save-settings", "account.GetAutoSaveSettings"],
  ["account", "get-bot-business-connection", "account.GetBotBusinessConnection"],
  ["account", "get-business-chat-links", "account.GetBusinessChatLinks"],
  ["account", "get-channel-default-emoji-statuses", "account.GetChannelDefaultEmojiStatuses"],
  ["account", "get-channel-restricted-status-emojis", "account.GetChannelRestrictedStatusEmojis"],
  ["account", "get-chat-themes", "account.GetChatThemes"],
  ["account", "get-collectible-emoji-statuses", "account.GetCollectibleEmojiStatuses"],
  ["account", "get-connected-bots", "account.GetConnectedBots"],
  ["account", "get-contact-sign-up-notification", "account.GetContactSignUpNotification"],
  ["account", "get-content-settings", "account.GetContentSettings"],
  ["account", "get-default-background-emojis", "account.GetDefaultBackgroundEmojis"],
  ["account", "get-default-emoji-statuses", "account.GetDefaultEmojiStatuses"],
  ["account", "get-default-group-photo-emojis", "account.GetDefaultGroupPhotoEmojis"],
  ["account", "get-default-profile-photo-emojis", "account.GetDefaultProfilePhotoEmojis"],
  ["account", "get-global-privacy-settings", "account.GetGlobalPrivacySettings"],
  ["account", "get-multi-wall-papers", "account.GetMultiWallPapers"],
  ["account", "get-notify-exceptions", "account.GetNotifyExceptions"],
  ["account", "get-notify-settings", "account.GetNotifySettings"],
  ["account", "get-paid-messages-revenue", "account.GetPaidMessagesRevenue"],
  ["account", "get-passkeys", "account.GetPasskeys"],
  ["account", "get-password", "account.GetPassword"],
  ["account", "get-password-settings", "account.GetPasswordSettings"],
  ["account", "get-privacy", "account.GetPrivacy"],
  ["account", "get-reactions-notify-settings", "account.GetReactionsNotifySettings"],
  ["account", "get-recent-emoji-statuses", "account.GetRecentEmojiStatuses"],
  ["account", "get-saved-music-ids", "account.GetSavedMusicIds"],
  ["account", "get-saved-ringtones", "account.GetSavedRingtones"],
  ["account", "get-secure-value", "account.GetSecureValue"],
  ["account", "get-theme", "account.GetTheme"],
  ["account", "get-themes", "account.GetThemes"],
  ["account", "get-tmp-password", "account.GetTmpPassword"],
  ["account", "get-unique-gift-chat-themes", "account.GetUniqueGiftChatThemes"],
  ["account", "get-wall-paper", "account.GetWallPaper"],
  ["account", "get-wall-papers", "account.GetWallPapers"],
  ["account", "get-web-authorizations", "account.GetWebAuthorizations"],
  ["account", "get-web-browser-settings", "account.GetWebBrowserSettings"],
  ["account", "init-passkey-registration", "account.InitPasskeyRegistration"],
  ["account", "init-takeout-session", "account.InitTakeoutSession"],
  ["account", "install-theme", "account.InstallTheme"],
  ["account", "install-wall-paper", "account.InstallWallPaper"],
  ["account", "invalidate-sign-in-codes", "account.InvalidateSignInCodes"],
  ["account", "register-device", "account.RegisterDevice"],
  ["account", "register-passkey", "account.RegisterPasskey"],
  ["account", "reorder-usernames", "account.ReorderUsernames"],
  ["account", "report-peer", "account.ReportPeer"],
  ["account", "report-profile-photo", "account.ReportProfilePhoto"],
  ["account", "resend-password-email", "account.ResendPasswordEmail"],
  ["account", "reset-authorization", "account.ResetAuthorization"],
  ["account", "reset-notify-settings", "account.ResetNotifySettings"],
  ["account", "reset-password", "account.ResetPassword"],
  ["account", "reset-wall-papers", "account.ResetWallPapers"],
  ["account", "reset-web-authorization", "account.ResetWebAuthorization"],
  ["account", "reset-web-authorizations", "account.ResetWebAuthorizations"],
  ["account", "resolve-business-chat-link", "account.ResolveBusinessChatLink"],
  ["account", "save-auto-download-settings", "account.SaveAutoDownloadSettings"],
  ["account", "save-auto-save-settings", "account.SaveAutoSaveSettings"],
  ["account", "save-music", "account.SaveMusic"],
  ["account", "save-ringtone", "account.SaveRingtone"],
  ["account", "save-secure-value", "account.SaveSecureValue"],
  ["account", "save-theme", "account.SaveTheme"],
  ["account", "save-wall-paper", "account.SaveWallPaper"],
  ["account", "send-change-phone-code", "account.SendChangePhoneCode"],
  ["account", "send-confirm-phone-code", "account.SendConfirmPhoneCode"],
  ["account", "send-verify-email-code", "account.SendVerifyEmailCode"],
  ["account", "send-verify-phone-code", "account.SendVerifyPhoneCode"],
  ["account", "set-account-ttl", "account.SetAccountTTL"],
  ["account", "set-authorization-ttl", "account.SetAuthorizationTTL"],
  ["account", "set-contact-sign-up-notification", "account.SetContactSignUpNotification"],
  ["account", "set-content-settings", "account.SetContentSettings"],
  ["account", "set-global-privacy-settings", "account.SetGlobalPrivacySettings"],
  ["account", "set-main-profile-tab", "account.SetMainProfileTab"],
  ["account", "set-privacy", "account.SetPrivacy"],
  ["account", "set-reactions-notify-settings", "account.SetReactionsNotifySettings"],
  ["account", "toggle-connected-bot-paused", "account.ToggleConnectedBotPaused"],
  ["account", "toggle-no-paid-messages-exception", "account.ToggleNoPaidMessagesException"],
  ["account", "toggle-sponsored-messages", "account.ToggleSponsoredMessages"],
  ["account", "toggle-username", "account.ToggleUsername"],
  ["account", "toggle-web-browser-settings-exception", "account.ToggleWebBrowserSettingsException"],
  ["account", "unregister-device", "account.UnregisterDevice"],
  ["account", "update-birthday", "account.UpdateBirthday"],
  ["account", "update-business-away-message", "account.UpdateBusinessAwayMessage"],
  ["account", "update-business-greeting-message", "account.UpdateBusinessGreetingMessage"],
  ["account", "update-business-intro", "account.UpdateBusinessIntro"],
  ["account", "update-business-location", "account.UpdateBusinessLocation"],
  ["account", "update-business-work-hours", "account.UpdateBusinessWorkHours"],
  ["account", "update-color", "account.UpdateColor"],
  ["account", "update-connected-bot", "account.UpdateConnectedBot"],
  ["account", "update-device-locked", "account.UpdateDeviceLocked"],
  ["account", "update-emoji-status", "account.UpdateEmojiStatus"],
  ["account", "update-notify-settings", "account.UpdateNotifySettings"],
  ["account", "update-password-settings", "account.UpdatePasswordSettings"],
  ["account", "update-personal-channel", "account.UpdatePersonalChannel"],
  ["account", "update-profile", "account.UpdateProfile"],
  ["account", "update-status", "account.UpdateStatus"],
  ["account", "update-theme", "account.UpdateTheme"],
  ["account", "update-username", "account.UpdateUsername"],
  ["account", "update-web-browser-settings", "account.UpdateWebBrowserSettings"],
  ["account", "upload-ringtone", "account.UploadRingtone"],
  ["account", "upload-theme", "account.UploadTheme"],
  ["account", "upload-wall-paper", "account.UploadWallPaper"],
  ["account", "verify-email", "account.VerifyEmail"],
  ["account", "verify-phone", "account.VerifyPhone"],
  ["aicompose", "create-tone", "aicompose.CreateTone"],
  ["aicompose", "delete-tone", "aicompose.DeleteTone"],
  ["aicompose", "get-tone", "aicompose.GetTone"],
  ["aicompose", "get-tone-example", "aicompose.GetToneExample"],
  ["aicompose", "get-tones", "aicompose.GetTones"],
  ["aicompose", "save-tone", "aicompose.SaveTone"],
  ["aicompose", "update-tone", "aicompose.UpdateTone"],
  ["auth", "accept-login-token", "auth.AcceptLoginToken"],
  ["auth", "bind-temp-auth-key", "auth.BindTempAuthKey"],
  ["auth", "cancel-code", "auth.CancelCode"],
  ["auth", "check-paid-auth", "auth.CheckPaidAuth"],
  ["auth", "check-password", "auth.CheckPassword"],
  ["auth", "check-recovery-password", "auth.CheckRecoveryPassword"],
  ["auth", "drop-temp-auth-keys", "auth.DropTempAuthKeys"],
  ["auth", "export-authorization", "auth.ExportAuthorization"],
  ["auth", "export-login-token", "auth.ExportLoginToken"],
  ["auth", "finish-firebase-pnv-login", "auth.FinishFirebasePnvLogin"],
  ["auth", "finish-passkey-login", "auth.FinishPasskeyLogin"],
  ["auth", "firebase-pnv-sign-up", "auth.FirebasePnvSignUp"],
  ["auth", "import-authorization", "auth.ImportAuthorization"],
  ["auth", "import-bot-authorization", "auth.ImportBotAuthorization"],
  ["auth", "import-login-token", "auth.ImportLoginToken"],
  ["auth", "import-web-token-authorization", "auth.ImportWebTokenAuthorization"],
  ["auth", "init-firebase-pnv-login", "auth.InitFirebasePnvLogin"],
  ["auth", "init-passkey-login", "auth.InitPasskeyLogin"],
  ["auth", "log-out", "auth.LogOut"],
  ["auth", "recover-password", "auth.RecoverPassword"],
  ["auth", "report-missing-code", "auth.ReportMissingCode"],
  ["auth", "request-firebase-sms", "auth.RequestFirebaseSms"],
  ["auth", "request-password-recovery", "auth.RequestPasswordRecovery"],
  ["auth", "resend-code", "auth.ResendCode"],
  ["auth", "reset-authorizations", "auth.ResetAuthorizations"],
  ["auth", "reset-login-email", "auth.ResetLoginEmail"],
  ["auth", "send-code", "auth.SendCode"],
  ["auth", "sign-in", "auth.SignIn"],
  ["auth", "sign-up", "auth.SignUp"],
  ["bots", "add-preview-media", "bots.AddPreviewMedia"],
  ["bots", "allow-send-message", "bots.AllowSendMessage"],
  ["bots", "answer-webhook-json-query", "bots.AnswerWebhookJSONQuery"],
  ["bots", "can-send-message", "bots.CanSendMessage"],
  ["bots", "check-download-file-params", "bots.CheckDownloadFileParams"],
  ["bots", "check-username", "bots.CheckUsername"],
  ["bots", "create-bot", "bots.CreateBot"],
  ["bots", "delete-preview-media", "bots.DeletePreviewMedia"],
  ["bots", "edit-access-settings", "bots.EditAccessSettings"],
  ["bots", "edit-preview-media", "bots.EditPreviewMedia"],
  ["bots", "export-bot-token", "bots.ExportBotToken"],
  ["bots", "get-access-settings", "bots.GetAccessSettings"],
  ["bots", "get-admined-bots", "bots.GetAdminedBots"],
  ["bots", "get-bot-commands", "bots.GetBotCommands"],
  ["bots", "get-bot-info", "bots.GetBotInfo"],
  ["bots", "get-bot-menu-button", "bots.GetBotMenuButton"],
  ["bots", "get-bot-recommendations", "bots.GetBotRecommendations"],
  ["bots", "get-popular-app-bots", "bots.GetPopularAppBots"],
  ["bots", "get-preview-info", "bots.GetPreviewInfo"],
  ["bots", "get-preview-medias", "bots.GetPreviewMedias"],
  ["bots", "get-requested-web-view-button", "bots.GetRequestedWebViewButton"],
  ["bots", "invoke-web-view-custom-method", "bots.InvokeWebViewCustomMethod"],
  ["bots", "reorder-preview-medias", "bots.ReorderPreviewMedias"],
  ["bots", "reorder-usernames", "bots.ReorderUsernames"],
  ["bots", "request-web-view-button", "bots.RequestWebViewButton"],
  ["bots", "reset-bot-commands", "bots.ResetBotCommands"],
  ["bots", "send-custom-request", "bots.SendCustomRequest"],
  ["bots", "set-bot-broadcast-default-admin-rights", "bots.SetBotBroadcastDefaultAdminRights"],
  ["bots", "set-bot-commands", "bots.SetBotCommands"],
  ["bots", "set-bot-group-default-admin-rights", "bots.SetBotGroupDefaultAdminRights"],
  ["bots", "set-bot-info", "bots.SetBotInfo"],
  ["bots", "set-bot-menu-button", "bots.SetBotMenuButton"],
  ["bots", "set-custom-verification", "bots.SetCustomVerification"],
  ["bots", "set-join-chat-results", "bots.SetJoinChatResults"],
  ["bots", "toggle-user-emoji-status-permission", "bots.ToggleUserEmojiStatusPermission"],
  ["bots", "toggle-username", "bots.ToggleUsername"],
  ["bots", "update-star-ref-program", "bots.UpdateStarRefProgram"],
  ["bots", "update-user-emoji-status", "bots.UpdateUserEmojiStatus"],
  ["channels", "check-search-posts-flood", "channels.CheckSearchPostsFlood"],
  ["channels", "check-username", "channels.CheckUsername"],
  ["channels", "convert-to-gigagroup", "channels.ConvertToGigagroup"],
  ["channels", "create-channel", "channels.CreateChannel"],
  ["channels", "deactivate-all-usernames", "channels.DeactivateAllUsernames"],
  ["channels", "delete-channel", "channels.DeleteChannel"],
  ["channels", "delete-history", "channels.DeleteHistory"],
  ["channels", "delete-messages", "channels.DeleteMessages"],
  ["channels", "delete-participant-history", "channels.DeleteParticipantHistory"],
  ["channels", "edit-admin", "channels.EditAdmin"],
  ["channels", "edit-banned", "channels.EditBanned"],
  ["channels", "edit-location", "channels.EditLocation"],
  ["channels", "edit-photo", "channels.EditPhoto"],
  ["channels", "edit-title", "channels.EditTitle"],
  ["channels", "export-message-link", "channels.ExportMessageLink"],
  ["channels", "get-admined-public-channels", "channels.GetAdminedPublicChannels"],
  ["channels", "get-admin-log", "channels.GetAdminLog"],
  ["channels", "get-channel-recommendations", "channels.GetChannelRecommendations"],
  ["channels", "get-channels", "channels.GetChannels"],
  ["channels", "get-full-channel", "channels.GetFullChannel"],
  ["channels", "get-groups-for-discussion", "channels.GetGroupsForDiscussion"],
  ["channels", "get-inactive-channels", "channels.GetInactiveChannels"],
  ["channels", "get-left-channels", "channels.GetLeftChannels"],
  ["channels", "get-message-author", "channels.GetMessageAuthor"],
  ["channels", "get-messages", "channels.GetMessages"],
  ["channels", "get-participant", "channels.GetParticipant"],
  ["channels", "get-participants", "channels.GetParticipants"],
  ["channels", "get-send-as", "channels.GetSendAs"],
  ["channels", "invite-to-channel", "channels.InviteToChannel"],
  ["channels", "join-channel", "channels.JoinChannel"],
  ["channels", "leave-channel", "channels.LeaveChannel"],
  ["channels", "read-history", "channels.ReadHistory"],
  ["channels", "read-message-contents", "channels.ReadMessageContents"],
  ["channels", "reorder-usernames", "channels.ReorderUsernames"],
  ["channels", "report-anti-spam-false-positive", "channels.ReportAntiSpamFalsePositive"],
  ["channels", "report-spam", "channels.ReportSpam"],
  ["channels", "restrict-sponsored-messages", "channels.RestrictSponsoredMessages"],
  ["channels", "search-posts", "channels.SearchPosts"],
  ["channels", "set-boosts-to-unblock-restrictions", "channels.SetBoostsToUnblockRestrictions"],
  ["channels", "set-discussion-group", "channels.SetDiscussionGroup"],
  ["channels", "set-emoji-stickers", "channels.SetEmojiStickers"],
  ["channels", "set-main-profile-tab", "channels.SetMainProfileTab"],
  ["channels", "set-stickers", "channels.SetStickers"],
  ["channels", "toggle-anti-spam", "channels.ToggleAntiSpam"],
  ["channels", "toggle-autotranslation", "channels.ToggleAutotranslation"],
  ["channels", "toggle-forum", "channels.ToggleForum"],
  ["channels", "toggle-join-request", "channels.ToggleJoinRequest"],
  ["channels", "toggle-join-to-send", "channels.ToggleJoinToSend"],
  ["channels", "toggle-participants-hidden", "channels.ToggleParticipantsHidden"],
  ["channels", "toggle-pre-history-hidden", "channels.TogglePreHistoryHidden"],
  ["channels", "toggle-signatures", "channels.ToggleSignatures"],
  ["channels", "toggle-slow-mode", "channels.ToggleSlowMode"],
  ["channels", "toggle-username", "channels.ToggleUsername"],
  ["channels", "toggle-view-forum-as-messages", "channels.ToggleViewForumAsMessages"],
  ["channels", "update-color", "channels.UpdateColor"],
  ["channels", "update-emoji-status", "channels.UpdateEmojiStatus"],
  ["channels", "update-paid-messages-price", "channels.UpdatePaidMessagesPrice"],
  ["channels", "update-username", "channels.UpdateUsername"],
  ["chatlists", "check-chatlist-invite", "chatlists.CheckChatlistInvite"],
  ["chatlists", "delete-exported-invite", "chatlists.DeleteExportedInvite"],
  ["chatlists", "edit-exported-invite", "chatlists.EditExportedInvite"],
  ["chatlists", "export-chatlist-invite", "chatlists.ExportChatlistInvite"],
  ["chatlists", "get-chatlist-updates", "chatlists.GetChatlistUpdates"],
  ["chatlists", "get-exported-invites", "chatlists.GetExportedInvites"],
  ["chatlists", "get-leave-chatlist-suggestions", "chatlists.GetLeaveChatlistSuggestions"],
  ["chatlists", "hide-chatlist-updates", "chatlists.HideChatlistUpdates"],
  ["chatlists", "join-chatlist-invite", "chatlists.JoinChatlistInvite"],
  ["chatlists", "join-chatlist-updates", "chatlists.JoinChatlistUpdates"],
  ["chatlists", "leave-chatlist", "chatlists.LeaveChatlist"],
  ["communities", "create", "communities.Create"],
  ["communities", "get-joined-communities", "communities.GetJoinedCommunities"],
  ["communities", "get-participant-joined-chats", "communities.GetParticipantJoinedChats"],
  ["communities", "get-peer-link-requests", "communities.GetPeerLinkRequests"],
  ["communities", "toggle-all-peer-link-request-approval", "communities.ToggleAllPeerLinkRequestApproval"],
  ["communities", "toggle-community-collapsed-in-dialogs", "communities.ToggleCommunityCollapsedInDialogs"],
  ["communities", "toggle-participant-banned", "communities.ToggleParticipantBanned"],
  ["communities", "toggle-peer-link", "communities.TogglePeerLink"],
  ["communities", "toggle-peer-link-request-approval", "communities.TogglePeerLinkRequestApproval"],
  ["contacts", "accept-contact", "contacts.AcceptContact"],
  ["contacts", "add-contact", "contacts.AddContact"],
  ["contacts", "block", "contacts.Block"],
  ["contacts", "block-from-replies", "contacts.BlockFromReplies"],
  ["contacts", "delete-by-phones", "contacts.DeleteByPhones"],
  ["contacts", "delete-contacts", "contacts.DeleteContacts"],
  ["contacts", "edit-close-friends", "contacts.EditCloseFriends"],
  ["contacts", "export-contact-token", "contacts.ExportContactToken"],
  ["contacts", "get-birthdays", "contacts.GetBirthdays"],
  ["contacts", "get-blocked", "contacts.GetBlocked"],
  ["contacts", "get-contact-ids", "contacts.GetContactIDs"],
  ["contacts", "get-contacts", "contacts.GetContacts"],
  ["contacts", "get-located", "contacts.GetLocated"],
  ["contacts", "get-saved", "contacts.GetSaved"],
  ["contacts", "get-sponsored-peers", "contacts.GetSponsoredPeers"],
  ["contacts", "get-statuses", "contacts.GetStatuses"],
  ["contacts", "get-top-peers", "contacts.GetTopPeers"],
  ["contacts", "import-contacts", "contacts.ImportContacts"],
  ["contacts", "import-contact-token", "contacts.ImportContactToken"],
  ["contacts", "reset-saved", "contacts.ResetSaved"],
  ["contacts", "reset-top-peer-rating", "contacts.ResetTopPeerRating"],
  ["contacts", "resolve-phone", "contacts.ResolvePhone"],
  ["contacts", "resolve-username", "contacts.ResolveUsername"],
  ["contacts", "search", "contacts.Search"],
  ["contacts", "set-blocked", "contacts.SetBlocked"],
  ["contacts", "toggle-top-peers", "contacts.ToggleTopPeers"],
  ["contacts", "unblock", "contacts.Unblock"],
  ["contacts", "update-contact-note", "contacts.UpdateContactNote"],
  ["", "destroy-auth-key", "DestroyAuthKey"],
  ["", "destroy-session", "DestroySession"],
  ["ephemeral", "delete-all-welcome-messages", "ephemeral.DeleteAllWelcomeMessages"],
  ["ephemeral", "delete-message", "ephemeral.DeleteMessage"],
  ["ephemeral", "delete-welcome-message", "ephemeral.DeleteWelcomeMessage"],
  ["ephemeral", "edit-message", "ephemeral.EditMessage"],
  ["ephemeral", "get-callback-answer", "ephemeral.GetCallbackAnswer"],
  ["ephemeral", "get-welcome-messages", "ephemeral.GetWelcomeMessages"],
  ["ephemeral", "report-message", "ephemeral.ReportMessage"],
  ["ephemeral", "send-message", "ephemeral.SendMessage"],
  ["folders", "edit-peer-folders", "folders.EditPeerFolders"],
  ["fragment", "get-collectible-info", "fragment.GetCollectibleInfo"],
  ["", "get-future-salts", "GetFutureSalts"],
  ["help", "accept-terms-of-service", "help.AcceptTermsOfService"],
  ["help", "dismiss-suggestion", "help.DismissSuggestion"],
  ["help", "edit-user-info", "help.EditUserInfo"],
  ["help", "get-app-config", "help.GetAppConfig"],
  ["help", "get-app-update", "help.GetAppUpdate"],
  ["help", "get-cdn-config", "help.GetCdnConfig"],
  ["help", "get-config", "help.GetConfig"],
  ["help", "get-countries-list", "help.GetCountriesList"],
  ["help", "get-deep-link-info", "help.GetDeepLinkInfo"],
  ["help", "get-invite-text", "help.GetInviteText"],
  ["help", "get-nearest-dc", "help.GetNearestDc"],
  ["help", "get-passport-config", "help.GetPassportConfig"],
  ["help", "get-peer-colors", "help.GetPeerColors"],
  ["help", "get-peer-profile-colors", "help.GetPeerProfileColors"],
  ["help", "get-premium-promo", "help.GetPremiumPromo"],
  ["help", "get-promo-data", "help.GetPromoData"],
  ["help", "get-recent-me-urls", "help.GetRecentMeUrls"],
  ["help", "get-support", "help.GetSupport"],
  ["help", "get-support-name", "help.GetSupportName"],
  ["help", "get-terms-of-service-update", "help.GetTermsOfServiceUpdate"],
  ["help", "get-timezones-list", "help.GetTimezonesList"],
  ["help", "get-user-info", "help.GetUserInfo"],
  ["help", "hide-promo-data", "help.HidePromoData"],
  ["help", "save-app-log", "help.SaveAppLog"],
  ["help", "set-bot-updates-status", "help.SetBotUpdatesStatus"],
  ["", "init-connection", "InitConnection"],
  ["", "invoke-after-msg", "InvokeAfterMsg"],
  ["", "invoke-after-msgs", "InvokeAfterMsgs"],
  ["", "invoke-with-apns-secret", "InvokeWithApnsSecret"],
  ["", "invoke-with-business-connection", "InvokeWithBusinessConnection"],
  ["", "invoke-with-google-play-integrity", "InvokeWithGooglePlayIntegrity"],
  ["", "invoke-with-layer", "InvokeWithLayer"],
  ["", "invoke-with-messages-range", "InvokeWithMessagesRange"],
  ["", "invoke-without-updates", "InvokeWithoutUpdates"],
  ["", "invoke-with-re-captcha", "InvokeWithReCaptcha"],
  ["", "invoke-with-takeout", "InvokeWithTakeout"],
  ["langpack", "get-difference", "langpack.GetDifference"],
  ["langpack", "get-lang-pack", "langpack.GetLangPack"],
  ["langpack", "get-language", "langpack.GetLanguage"],
  ["langpack", "get-languages", "langpack.GetLanguages"],
  ["langpack", "get-strings", "langpack.GetStrings"],
  ["messages", "accept-encryption", "messages.AcceptEncryption"],
  ["messages", "accept-url-auth", "messages.AcceptUrlAuth"],
  ["messages", "add-chat-user", "messages.AddChatUser"],
  ["messages", "add-poll-answer", "messages.AddPollAnswer"],
  ["messages", "append-todo-list", "messages.AppendTodoList"],
  ["messages", "check-chat-invite", "messages.CheckChatInvite"],
  ["messages", "check-history-import", "messages.CheckHistoryImport"],
  ["messages", "check-history-import-peer", "messages.CheckHistoryImportPeer"],
  ["messages", "check-quick-reply-shortcut", "messages.CheckQuickReplyShortcut"],
  ["messages", "check-url-auth-match-code", "messages.CheckUrlAuthMatchCode"],
  ["messages", "clear-all-drafts", "messages.ClearAllDrafts"],
  ["messages", "clear-recent-reactions", "messages.ClearRecentReactions"],
  ["messages", "clear-recent-stickers", "messages.ClearRecentStickers"],
  ["messages", "click-sponsored-message", "messages.ClickSponsoredMessage"],
  ["messages", "compose-message-with-ai", "messages.ComposeMessageWithAI"],
  ["messages", "compose-rich-message-with-ai", "messages.ComposeRichMessageWithAI"],
  ["messages", "create-chat", "messages.CreateChat"],
  ["messages", "create-forum-topic", "messages.CreateForumTopic"],
  ["messages", "decline-url-auth", "messages.DeclineUrlAuth"],
  ["messages", "delete-chat", "messages.DeleteChat"],
  ["messages", "delete-chat-user", "messages.DeleteChatUser"],
  ["messages", "delete-exported-chat-invite", "messages.DeleteExportedChatInvite"],
  ["messages", "delete-fact-check", "messages.DeleteFactCheck"],
  ["messages", "delete-history", "messages.DeleteHistory"],
  ["messages", "delete-messages", "messages.DeleteMessages"],
  ["messages", "delete-participant-reaction", "messages.DeleteParticipantReaction"],
  ["messages", "delete-participant-reactions", "messages.DeleteParticipantReactions"],
  ["messages", "delete-phone-call-history", "messages.DeletePhoneCallHistory"],
  ["messages", "delete-poll-answer", "messages.DeletePollAnswer"],
  ["messages", "delete-quick-reply-messages", "messages.DeleteQuickReplyMessages"],
  ["messages", "delete-quick-reply-shortcut", "messages.DeleteQuickReplyShortcut"],
  ["messages", "delete-revoked-exported-chat-invites", "messages.DeleteRevokedExportedChatInvites"],
  ["messages", "delete-saved-history", "messages.DeleteSavedHistory"],
  ["messages", "delete-scheduled-messages", "messages.DeleteScheduledMessages"],
  ["messages", "delete-topic-history", "messages.DeleteTopicHistory"],
  ["messages", "discard-encryption", "messages.DiscardEncryption"],
  ["messages", "edit-chat-about", "messages.EditChatAbout"],
  ["messages", "edit-chat-admin", "messages.EditChatAdmin"],
  ["messages", "edit-chat-creator", "messages.EditChatCreator"],
  ["messages", "edit-chat-default-banned-rights", "messages.EditChatDefaultBannedRights"],
  ["messages", "edit-chat-participant-rank", "messages.EditChatParticipantRank"],
  ["messages", "edit-chat-photo", "messages.EditChatPhoto"],
  ["messages", "edit-chat-title", "messages.EditChatTitle"],
  ["messages", "edit-exported-chat-invite", "messages.EditExportedChatInvite"],
  ["messages", "edit-fact-check", "messages.EditFactCheck"],
  ["messages", "edit-forum-topic", "messages.EditForumTopic"],
  ["messages", "edit-inline-bot-message", "messages.EditInlineBotMessage"],
  ["messages", "edit-message", "messages.EditMessage"],
  ["messages", "edit-quick-reply-shortcut", "messages.EditQuickReplyShortcut"],
  ["messages", "export-chat-invite", "messages.ExportChatInvite"],
  ["messages", "fave-sticker", "messages.FaveSticker"],
  ["messages", "forward-messages", "messages.ForwardMessages"],
  ["messages", "get-admins-with-invites", "messages.GetAdminsWithInvites"],
  ["messages", "get-all-drafts", "messages.GetAllDrafts"],
  ["messages", "get-all-stickers", "messages.GetAllStickers"],
  ["messages", "get-archived-stickers", "messages.GetArchivedStickers"],
  ["messages", "get-attached-stickers", "messages.GetAttachedStickers"],
  ["messages", "get-attach-menu-bot", "messages.GetAttachMenuBot"],
  ["messages", "get-attach-menu-bots", "messages.GetAttachMenuBots"],
  ["messages", "get-available-effects", "messages.GetAvailableEffects"],
  ["messages", "get-available-reactions", "messages.GetAvailableReactions"],
  ["messages", "get-bot-app", "messages.GetBotApp"],
  ["messages", "get-bot-callback-answer", "messages.GetBotCallbackAnswer"],
  ["messages", "get-chat-invite-importers", "messages.GetChatInviteImporters"],
  ["messages", "get-chats", "messages.GetChats"],
  ["messages", "get-common-chats", "messages.GetCommonChats"],
  ["messages", "get-custom-emoji-documents", "messages.GetCustomEmojiDocuments"],
  ["messages", "get-default-history-ttl", "messages.GetDefaultHistoryTTL"],
  ["messages", "get-default-tag-reactions", "messages.GetDefaultTagReactions"],
  ["messages", "get-dh-config", "messages.GetDhConfig"],
  ["messages", "get-dialog-filters", "messages.GetDialogFilters"],
  ["messages", "get-dialogs", "messages.GetDialogs"],
  ["messages", "get-dialog-unread-marks", "messages.GetDialogUnreadMarks"],
  ["messages", "get-discussion-message", "messages.GetDiscussionMessage"],
  ["messages", "get-document-by-hash", "messages.GetDocumentByHash"],
  ["messages", "get-emoji-game-info", "messages.GetEmojiGameInfo"],
  ["messages", "get-emoji-groups", "messages.GetEmojiGroups"],
  ["messages", "get-emoji-keywords", "messages.GetEmojiKeywords"],
  ["messages", "get-emoji-keywords-difference", "messages.GetEmojiKeywordsDifference"],
  ["messages", "get-emoji-keywords-languages", "messages.GetEmojiKeywordsLanguages"],
  ["messages", "get-emoji-profile-photo-groups", "messages.GetEmojiProfilePhotoGroups"],
  ["messages", "get-emoji-status-groups", "messages.GetEmojiStatusGroups"],
  ["messages", "get-emoji-sticker-groups", "messages.GetEmojiStickerGroups"],
  ["messages", "get-emoji-stickers", "messages.GetEmojiStickers"],
  ["messages", "get-emoji-url", "messages.GetEmojiURL"],
  ["messages", "get-exported-chat-invite", "messages.GetExportedChatInvite"],
  ["messages", "get-exported-chat-invites", "messages.GetExportedChatInvites"],
  ["messages", "get-extended-media", "messages.GetExtendedMedia"],
  ["messages", "get-fact-check", "messages.GetFactCheck"],
  ["messages", "get-faved-stickers", "messages.GetFavedStickers"],
  ["messages", "get-featured-emoji-stickers", "messages.GetFeaturedEmojiStickers"],
  ["messages", "get-featured-stickers", "messages.GetFeaturedStickers"],
  ["messages", "get-forum-topics", "messages.GetForumTopics"],
  ["messages", "get-forum-topics-by-id", "messages.GetForumTopicsByID"],
  ["messages", "get-full-chat", "messages.GetFullChat"],
  ["messages", "get-future-chat-creator-after-leave", "messages.GetFutureChatCreatorAfterLeave"],
  ["messages", "get-game-high-scores", "messages.GetGameHighScores"],
  ["messages", "get-history", "messages.GetHistory"],
  ["messages", "get-inline-bot-results", "messages.GetInlineBotResults"],
  ["messages", "get-inline-game-high-scores", "messages.GetInlineGameHighScores"],
  ["messages", "get-mask-stickers", "messages.GetMaskStickers"],
  ["messages", "get-message-edit-data", "messages.GetMessageEditData"],
  ["messages", "get-message-reactions-list", "messages.GetMessageReactionsList"],
  ["messages", "get-message-read-participants", "messages.GetMessageReadParticipants"],
  ["messages", "get-messages", "messages.GetMessages"],
  ["messages", "get-messages-reactions", "messages.GetMessagesReactions"],
  ["messages", "get-messages-views", "messages.GetMessagesViews"],
  ["messages", "get-my-stickers", "messages.GetMyStickers"],
  ["messages", "get-old-featured-stickers", "messages.GetOldFeaturedStickers"],
  ["messages", "get-onlines", "messages.GetOnlines"],
  ["messages", "get-outbox-read-date", "messages.GetOutboxReadDate"],
  ["messages", "get-paid-reaction-privacy", "messages.GetPaidReactionPrivacy"],
  ["messages", "get-peer-dialogs", "messages.GetPeerDialogs"],
  ["messages", "get-peer-settings", "messages.GetPeerSettings"],
  ["messages", "get-personal-channel-history", "messages.GetPersonalChannelHistory"],
  ["messages", "get-pinned-dialogs", "messages.GetPinnedDialogs"],
  ["messages", "get-pinned-saved-dialogs", "messages.GetPinnedSavedDialogs"],
  ["messages", "get-poll-results", "messages.GetPollResults"],
  ["messages", "get-poll-votes", "messages.GetPollVotes"],
  ["messages", "get-prepared-inline-message", "messages.GetPreparedInlineMessage"],
  ["messages", "get-quick-replies", "messages.GetQuickReplies"],
  ["messages", "get-quick-reply-messages", "messages.GetQuickReplyMessages"],
  ["messages", "get-recent-locations", "messages.GetRecentLocations"],
  ["messages", "get-recent-reactions", "messages.GetRecentReactions"],
  ["messages", "get-recent-stickers", "messages.GetRecentStickers"],
  ["messages", "get-replies", "messages.GetReplies"],
  ["messages", "get-rich-message", "messages.GetRichMessage"],
  ["messages", "get-saved-dialogs", "messages.GetSavedDialogs"],
  ["messages", "get-saved-dialogs-by-id", "messages.GetSavedDialogsByID"],
  ["messages", "get-saved-gifs", "messages.GetSavedGifs"],
  ["messages", "get-saved-history", "messages.GetSavedHistory"],
  ["messages", "get-saved-reaction-tags", "messages.GetSavedReactionTags"],
  ["messages", "get-scheduled-history", "messages.GetScheduledHistory"],
  ["messages", "get-scheduled-messages", "messages.GetScheduledMessages"],
  ["messages", "get-search-counters", "messages.GetSearchCounters"],
  ["messages", "get-search-results-calendar", "messages.GetSearchResultsCalendar"],
  ["messages", "get-search-results-positions", "messages.GetSearchResultsPositions"],
  ["messages", "get-split-ranges", "messages.GetSplitRanges"],
  ["messages", "get-sponsored-messages", "messages.GetSponsoredMessages"],
  ["messages", "get-stickers", "messages.GetStickers"],
  ["messages", "get-sticker-set", "messages.GetStickerSet"],
  ["messages", "get-suggested-dialog-filters", "messages.GetSuggestedDialogFilters"],
  ["messages", "get-top-reactions", "messages.GetTopReactions"],
  ["messages", "get-unread-mentions", "messages.GetUnreadMentions"],
  ["messages", "get-unread-poll-votes", "messages.GetUnreadPollVotes"],
  ["messages", "get-unread-reactions", "messages.GetUnreadReactions"],
  ["messages", "get-web-page", "messages.GetWebPage"],
  ["messages", "get-web-page-preview", "messages.GetWebPagePreview"],
  ["messages", "hide-all-chat-join-requests", "messages.HideAllChatJoinRequests"],
  ["messages", "hide-chat-join-request", "messages.HideChatJoinRequest"],
  ["messages", "hide-peer-settings-bar", "messages.HidePeerSettingsBar"],
  ["messages", "import-chat-invite", "messages.ImportChatInvite"],
  ["messages", "init-history-import", "messages.InitHistoryImport"],
  ["messages", "install-sticker-set", "messages.InstallStickerSet"],
  ["messages", "mark-dialog-unread", "messages.MarkDialogUnread"],
  ["messages", "migrate-chat", "messages.MigrateChat"],
  ["messages", "prolong-web-view", "messages.ProlongWebView"],
  ["messages", "rate-transcribed-audio", "messages.RateTranscribedAudio"],
  ["messages", "read-discussion", "messages.ReadDiscussion"],
  ["messages", "read-encrypted-history", "messages.ReadEncryptedHistory"],
  ["messages", "read-featured-stickers", "messages.ReadFeaturedStickers"],
  ["messages", "read-history", "messages.ReadHistory"],
  ["messages", "read-mentions", "messages.ReadMentions"],
  ["messages", "read-message-contents", "messages.ReadMessageContents"],
  ["messages", "read-poll-votes", "messages.ReadPollVotes"],
  ["messages", "read-reactions", "messages.ReadReactions"],
  ["messages", "read-saved-history", "messages.ReadSavedHistory"],
  ["messages", "received-messages", "messages.ReceivedMessages"],
  ["messages", "received-queue", "messages.ReceivedQueue"],
  ["messages", "reorder-pinned-dialogs", "messages.ReorderPinnedDialogs"],
  ["messages", "reorder-pinned-forum-topics", "messages.ReorderPinnedForumTopics"],
  ["messages", "reorder-pinned-saved-dialogs", "messages.ReorderPinnedSavedDialogs"],
  ["messages", "reorder-quick-replies", "messages.ReorderQuickReplies"],
  ["messages", "reorder-sticker-sets", "messages.ReorderStickerSets"],
  ["messages", "report", "messages.Report"],
  ["messages", "report-encrypted-spam", "messages.ReportEncryptedSpam"],
  ["messages", "report-messages-delivery", "messages.ReportMessagesDelivery"],
  ["messages", "report-music-listen", "messages.ReportMusicListen"],
  ["messages", "report-reaction", "messages.ReportReaction"],
  ["messages", "report-read-metrics", "messages.ReportReadMetrics"],
  ["messages", "report-spam", "messages.ReportSpam"],
  ["messages", "report-sponsored-message", "messages.ReportSponsoredMessage"],
  ["messages", "request-app-web-view", "messages.RequestAppWebView"],
  ["messages", "request-chat-join-web-view", "messages.RequestChatJoinWebView"],
  ["messages", "request-encryption", "messages.RequestEncryption"],
  ["messages", "request-main-web-view", "messages.RequestMainWebView"],
  ["messages", "request-simple-web-view", "messages.RequestSimpleWebView"],
  ["messages", "request-url-auth", "messages.RequestUrlAuth"],
  ["messages", "request-web-view", "messages.RequestWebView"],
  ["messages", "save-default-send-as", "messages.SaveDefaultSendAs"],
  ["messages", "save-draft", "messages.SaveDraft"],
  ["messages", "save-gif", "messages.SaveGif"],
  ["messages", "save-prepared-inline-message", "messages.SavePreparedInlineMessage"],
  ["messages", "save-recent-sticker", "messages.SaveRecentSticker"],
  ["messages", "search", "messages.Search"],
  ["messages", "search-custom-emoji", "messages.SearchCustomEmoji"],
  ["messages", "search-emoji-sticker-sets", "messages.SearchEmojiStickerSets"],
  ["messages", "search-global", "messages.SearchGlobal"],
  ["messages", "search-sent-media", "messages.SearchSentMedia"],
  ["messages", "search-stickers", "messages.SearchStickers"],
  ["messages", "search-sticker-sets", "messages.SearchStickerSets"],
  ["messages", "send-bot-requested-peer", "messages.SendBotRequestedPeer"],
  ["messages", "send-encrypted", "messages.SendEncrypted"],
  ["messages", "send-encrypted-file", "messages.SendEncryptedFile"],
  ["messages", "send-encrypted-service", "messages.SendEncryptedService"],
  ["messages", "send-inline-bot-result", "messages.SendInlineBotResult"],
  ["messages", "send-media", "messages.SendMedia"],
  ["messages", "send-message", "messages.SendMessage"],
  ["messages", "send-multi-media", "messages.SendMultiMedia"],
  ["messages", "send-paid-reaction", "messages.SendPaidReaction"],
  ["messages", "send-quick-reply-messages", "messages.SendQuickReplyMessages"],
  ["messages", "send-reaction", "messages.SendReaction"],
  ["messages", "send-scheduled-messages", "messages.SendScheduledMessages"],
  ["messages", "send-screenshot-notification", "messages.SendScreenshotNotification"],
  ["messages", "send-vote", "messages.SendVote"],
  ["messages", "send-web-view-data", "messages.SendWebViewData"],
  ["messages", "send-web-view-result-message", "messages.SendWebViewResultMessage"],
  ["messages", "set-bot-callback-answer", "messages.SetBotCallbackAnswer"],
  ["messages", "set-bot-guest-chat-result", "messages.SetBotGuestChatResult"],
  ["messages", "set-bot-precheckout-results", "messages.SetBotPrecheckoutResults"],
  ["messages", "set-bot-shipping-results", "messages.SetBotShippingResults"],
  ["messages", "set-chat-available-reactions", "messages.SetChatAvailableReactions"],
  ["messages", "set-chat-theme", "messages.SetChatTheme"],
  ["messages", "set-chat-wall-paper", "messages.SetChatWallPaper"],
  ["messages", "set-default-history-ttl", "messages.SetDefaultHistoryTTL"],
  ["messages", "set-default-reaction", "messages.SetDefaultReaction"],
  ["messages", "set-encrypted-typing", "messages.SetEncryptedTyping"],
  ["messages", "set-game-score", "messages.SetGameScore"],
  ["messages", "set-history-ttl", "messages.SetHistoryTTL"],
  ["messages", "set-inline-bot-results", "messages.SetInlineBotResults"],
  ["messages", "set-inline-game-score", "messages.SetInlineGameScore"],
  ["messages", "set-typing", "messages.SetTyping"],
  ["messages", "start-bot", "messages.StartBot"],
  ["messages", "start-history-import", "messages.StartHistoryImport"],
  ["messages", "summarize-text", "messages.SummarizeText"],
  ["messages", "toggle-bot-in-attach-menu", "messages.ToggleBotInAttachMenu"],
  ["messages", "toggle-dialog-filter-tags", "messages.ToggleDialogFilterTags"],
  ["messages", "toggle-dialog-pin", "messages.ToggleDialogPin"],
  ["messages", "toggle-no-forwards", "messages.ToggleNoForwards"],
  ["messages", "toggle-paid-reaction-privacy", "messages.TogglePaidReactionPrivacy"],
  ["messages", "toggle-peer-translations", "messages.TogglePeerTranslations"],
  ["messages", "toggle-saved-dialog-pin", "messages.ToggleSavedDialogPin"],
  ["messages", "toggle-sticker-sets", "messages.ToggleStickerSets"],
  ["messages", "toggle-suggested-post-approval", "messages.ToggleSuggestedPostApproval"],
  ["messages", "toggle-todo-completed", "messages.ToggleTodoCompleted"],
  ["messages", "transcribe-audio", "messages.TranscribeAudio"],
  ["messages", "translate-rich-message", "messages.TranslateRichMessage"],
  ["messages", "translate-text", "messages.TranslateText"],
  ["messages", "uninstall-sticker-set", "messages.UninstallStickerSet"],
  ["messages", "unpin-all-messages", "messages.UnpinAllMessages"],
  ["messages", "update-dialog-filter", "messages.UpdateDialogFilter"],
  ["messages", "update-dialog-filters-order", "messages.UpdateDialogFiltersOrder"],
  ["messages", "update-pinned-forum-topic", "messages.UpdatePinnedForumTopic"],
  ["messages", "update-pinned-message", "messages.UpdatePinnedMessage"],
  ["messages", "update-saved-reaction-tag", "messages.UpdateSavedReactionTag"],
  ["messages", "upload-encrypted-file", "messages.UploadEncryptedFile"],
  ["messages", "upload-imported-media", "messages.UploadImportedMedia"],
  ["messages", "upload-media", "messages.UploadMedia"],
  ["messages", "view-sponsored-message", "messages.ViewSponsoredMessage"],
  ["payments", "apply-gift-code", "payments.ApplyGiftCode"],
  ["payments", "assign-app-store-transaction", "payments.AssignAppStoreTransaction"],
  ["payments", "assign-play-market-transaction", "payments.AssignPlayMarketTransaction"],
  ["payments", "bot-cancel-stars-subscription", "payments.BotCancelStarsSubscription"],
  ["payments", "can-purchase-store", "payments.CanPurchaseStore"],
  ["payments", "change-stars-subscription", "payments.ChangeStarsSubscription"],
  ["payments", "check-can-send-gift", "payments.CheckCanSendGift"],
  ["payments", "check-gift-code", "payments.CheckGiftCode"],
  ["payments", "clear-saved-info", "payments.ClearSavedInfo"],
  ["payments", "connect-star-ref-bot", "payments.ConnectStarRefBot"],
  ["payments", "convert-star-gift", "payments.ConvertStarGift"],
  ["payments", "craft-star-gift", "payments.CraftStarGift"],
  ["payments", "create-star-gift-collection", "payments.CreateStarGiftCollection"],
  ["payments", "delete-star-gift-collection", "payments.DeleteStarGiftCollection"],
  ["payments", "edit-connected-star-ref-bot", "payments.EditConnectedStarRefBot"],
  ["payments", "export-invoice", "payments.ExportInvoice"],
  ["payments", "fulfill-stars-subscription", "payments.FulfillStarsSubscription"],
  ["payments", "get-bank-card-data", "payments.GetBankCardData"],
  ["payments", "get-connected-star-ref-bot", "payments.GetConnectedStarRefBot"],
  ["payments", "get-connected-star-ref-bots", "payments.GetConnectedStarRefBots"],
  ["payments", "get-craft-star-gifts", "payments.GetCraftStarGifts"],
  ["payments", "get-giveaway-info", "payments.GetGiveawayInfo"],
  ["payments", "get-payment-form", "payments.GetPaymentForm"],
  ["payments", "get-payment-receipt", "payments.GetPaymentReceipt"],
  ["payments", "get-premium-gift-code-options", "payments.GetPremiumGiftCodeOptions"],
  ["payments", "get-resale-star-gifts", "payments.GetResaleStarGifts"],
  ["payments", "get-saved-info", "payments.GetSavedInfo"],
  ["payments", "get-saved-star-gift", "payments.GetSavedStarGift"],
  ["payments", "get-saved-star-gifts", "payments.GetSavedStarGifts"],
  ["payments", "get-star-gift-active-auctions", "payments.GetStarGiftActiveAuctions"],
  ["payments", "get-star-gift-auction-acquired-gifts", "payments.GetStarGiftAuctionAcquiredGifts"],
  ["payments", "get-star-gift-auction-state", "payments.GetStarGiftAuctionState"],
  ["payments", "get-star-gift-collections", "payments.GetStarGiftCollections"],
  ["payments", "get-star-gifts", "payments.GetStarGifts"],
  ["payments", "get-star-gift-upgrade-attributes", "payments.GetStarGiftUpgradeAttributes"],
  ["payments", "get-star-gift-upgrade-preview", "payments.GetStarGiftUpgradePreview"],
  ["payments", "get-star-gift-withdrawal-url", "payments.GetStarGiftWithdrawalUrl"],
  ["payments", "get-stars-gift-options", "payments.GetStarsGiftOptions"],
  ["payments", "get-stars-giveaway-options", "payments.GetStarsGiveawayOptions"],
  ["payments", "get-stars-revenue-ads-account-url", "payments.GetStarsRevenueAdsAccountUrl"],
  ["payments", "get-stars-revenue-stats", "payments.GetStarsRevenueStats"],
  ["payments", "get-stars-revenue-withdrawal-url", "payments.GetStarsRevenueWithdrawalUrl"],
  ["payments", "get-stars-status", "payments.GetStarsStatus"],
  ["payments", "get-stars-subscriptions", "payments.GetStarsSubscriptions"],
  ["payments", "get-stars-topup-options", "payments.GetStarsTopupOptions"],
  ["payments", "get-stars-transactions", "payments.GetStarsTransactions"],
  ["payments", "get-stars-transactions-by-id", "payments.GetStarsTransactionsByID"],
  ["payments", "get-suggested-star-ref-bots", "payments.GetSuggestedStarRefBots"],
  ["payments", "get-unique-star-gift", "payments.GetUniqueStarGift"],
  ["payments", "get-unique-star-gift-value-info", "payments.GetUniqueStarGiftValueInfo"],
  ["payments", "launch-prepaid-giveaway", "payments.LaunchPrepaidGiveaway"],
  ["payments", "refund-stars-charge", "payments.RefundStarsCharge"],
  ["payments", "reorder-star-gift-collections", "payments.ReorderStarGiftCollections"],
  ["payments", "resolve-star-gift-offer", "payments.ResolveStarGiftOffer"],
  ["payments", "save-star-gift", "payments.SaveStarGift"],
  ["payments", "send-payment-form", "payments.SendPaymentForm"],
  ["payments", "send-star-gift-offer", "payments.SendStarGiftOffer"],
  ["payments", "send-stars-form", "payments.SendStarsForm"],
  ["payments", "toggle-chat-star-gift-notifications", "payments.ToggleChatStarGiftNotifications"],
  ["payments", "toggle-star-gifts-pinned-to-top", "payments.ToggleStarGiftsPinnedToTop"],
  ["payments", "transfer-star-gift", "payments.TransferStarGift"],
  ["payments", "update-star-gift-collection", "payments.UpdateStarGiftCollection"],
  ["payments", "update-star-gift-price", "payments.UpdateStarGiftPrice"],
  ["payments", "upgrade-star-gift", "payments.UpgradeStarGift"],
  ["payments", "validate-requested-info", "payments.ValidateRequestedInfo"],
  ["phone", "accept-call", "phone.AcceptCall"],
  ["phone", "check-group-call", "phone.CheckGroupCall"],
  ["phone", "confirm-call", "phone.ConfirmCall"],
  ["phone", "create-conference-call", "phone.CreateConferenceCall"],
  ["phone", "create-group-call", "phone.CreateGroupCall"],
  ["phone", "decline-conference-call-invite", "phone.DeclineConferenceCallInvite"],
  ["phone", "delete-conference-call-participants", "phone.DeleteConferenceCallParticipants"],
  ["phone", "delete-group-call-messages", "phone.DeleteGroupCallMessages"],
  ["phone", "delete-group-call-participant-messages", "phone.DeleteGroupCallParticipantMessages"],
  ["phone", "discard-call", "phone.DiscardCall"],
  ["phone", "discard-group-call", "phone.DiscardGroupCall"],
  ["phone", "edit-group-call-participant", "phone.EditGroupCallParticipant"],
  ["phone", "edit-group-call-title", "phone.EditGroupCallTitle"],
  ["phone", "export-group-call-invite", "phone.ExportGroupCallInvite"],
  ["phone", "get-call-config", "phone.GetCallConfig"],
  ["phone", "get-group-call", "phone.GetGroupCall"],
  ["phone", "get-group-call-chain-blocks", "phone.GetGroupCallChainBlocks"],
  ["phone", "get-group-call-join-as", "phone.GetGroupCallJoinAs"],
  ["phone", "get-group-call-stars", "phone.GetGroupCallStars"],
  ["phone", "get-group-call-stream-channels", "phone.GetGroupCallStreamChannels"],
  ["phone", "get-group-call-stream-rtmp-url", "phone.GetGroupCallStreamRtmpUrl"],
  ["phone", "get-group-participants", "phone.GetGroupParticipants"],
  ["phone", "invite-conference-call-participant", "phone.InviteConferenceCallParticipant"],
  ["phone", "invite-to-group-call", "phone.InviteToGroupCall"],
  ["phone", "join-group-call", "phone.JoinGroupCall"],
  ["phone", "join-group-call-presentation", "phone.JoinGroupCallPresentation"],
  ["phone", "leave-group-call", "phone.LeaveGroupCall"],
  ["phone", "leave-group-call-presentation", "phone.LeaveGroupCallPresentation"],
  ["phone", "received-call", "phone.ReceivedCall"],
  ["phone", "request-call", "phone.RequestCall"],
  ["phone", "save-call-debug", "phone.SaveCallDebug"],
  ["phone", "save-call-log", "phone.SaveCallLog"],
  ["phone", "save-default-group-call-join-as", "phone.SaveDefaultGroupCallJoinAs"],
  ["phone", "save-default-send-as", "phone.SaveDefaultSendAs"],
  ["phone", "send-conference-call-broadcast", "phone.SendConferenceCallBroadcast"],
  ["phone", "send-group-call-encrypted-message", "phone.SendGroupCallEncryptedMessage"],
  ["phone", "send-group-call-message", "phone.SendGroupCallMessage"],
  ["phone", "send-signaling-data", "phone.SendSignalingData"],
  ["phone", "set-call-rating", "phone.SetCallRating"],
  ["phone", "start-scheduled-group-call", "phone.StartScheduledGroupCall"],
  ["phone", "toggle-group-call-record", "phone.ToggleGroupCallRecord"],
  ["phone", "toggle-group-call-settings", "phone.ToggleGroupCallSettings"],
  ["phone", "toggle-group-call-start-subscription", "phone.ToggleGroupCallStartSubscription"],
  ["photos", "delete-photos", "photos.DeletePhotos"],
  ["photos", "get-user-photos", "photos.GetUserPhotos"],
  ["photos", "update-profile-photo", "photos.UpdateProfilePhoto"],
  ["photos", "upload-contact-profile-photo", "photos.UploadContactProfilePhoto"],
  ["photos", "upload-profile-photo", "photos.UploadProfilePhoto"],
  ["", "ping", "Ping"],
  ["", "ping-delay-disconnect", "PingDelayDisconnect"],
  ["premium", "apply-boost", "premium.ApplyBoost"],
  ["premium", "get-boosts-list", "premium.GetBoostsList"],
  ["premium", "get-boosts-status", "premium.GetBoostsStatus"],
  ["premium", "get-my-boosts", "premium.GetMyBoosts"],
  ["premium", "get-user-boosts", "premium.GetUserBoosts"],
  ["", "req-dh-params", "ReqDHParams"],
  ["", "req-pq", "ReqPq"],
  ["", "req-pq-multi", "ReqPqMulti"],
  ["", "rpc-drop-answer", "RpcDropAnswer"],
  ["", "set-client-dh-params", "SetClientDHParams"],
  ["smsjobs", "finish-job", "smsjobs.FinishJob"],
  ["smsjobs", "get-sms-job", "smsjobs.GetSmsJob"],
  ["smsjobs", "get-status", "smsjobs.GetStatus"],
  ["smsjobs", "is-eligible-to-join", "smsjobs.IsEligibleToJoin"],
  ["smsjobs", "join", "smsjobs.Join"],
  ["smsjobs", "leave", "smsjobs.Leave"],
  ["smsjobs", "update-settings", "smsjobs.UpdateSettings"],
  ["stats", "get-broadcast-stats", "stats.GetBroadcastStats"],
  ["stats", "get-megagroup-stats", "stats.GetMegagroupStats"],
  ["stats", "get-message-public-forwards", "stats.GetMessagePublicForwards"],
  ["stats", "get-message-stats", "stats.GetMessageStats"],
  ["stats", "get-poll-stats", "stats.GetPollStats"],
  ["stats", "get-story-public-forwards", "stats.GetStoryPublicForwards"],
  ["stats", "get-story-stats", "stats.GetStoryStats"],
  ["stats", "load-async-graph", "stats.LoadAsyncGraph"],
  ["stickers", "add-sticker-to-set", "stickers.AddStickerToSet"],
  ["stickers", "change-sticker", "stickers.ChangeSticker"],
  ["stickers", "change-sticker-position", "stickers.ChangeStickerPosition"],
  ["stickers", "check-short-name", "stickers.CheckShortName"],
  ["stickers", "create-sticker-set", "stickers.CreateStickerSet"],
  ["stickers", "delete-sticker-set", "stickers.DeleteStickerSet"],
  ["stickers", "remove-sticker-from-set", "stickers.RemoveStickerFromSet"],
  ["stickers", "rename-sticker-set", "stickers.RenameStickerSet"],
  ["stickers", "replace-sticker", "stickers.ReplaceSticker"],
  ["stickers", "set-sticker-set-thumb", "stickers.SetStickerSetThumb"],
  ["stickers", "suggest-short-name", "stickers.SuggestShortName"],
  ["stories", "activate-stealth-mode", "stories.ActivateStealthMode"],
  ["stories", "can-send-story", "stories.CanSendStory"],
  ["stories", "create-album", "stories.CreateAlbum"],
  ["stories", "delete-album", "stories.DeleteAlbum"],
  ["stories", "delete-stories", "stories.DeleteStories"],
  ["stories", "edit-story", "stories.EditStory"],
  ["stories", "export-story-link", "stories.ExportStoryLink"],
  ["stories", "get-albums", "stories.GetAlbums"],
  ["stories", "get-album-stories", "stories.GetAlbumStories"],
  ["stories", "get-all-read-peer-stories", "stories.GetAllReadPeerStories"],
  ["stories", "get-all-stories", "stories.GetAllStories"],
  ["stories", "get-chats-to-send", "stories.GetChatsToSend"],
  ["stories", "get-peer-max-ids", "stories.GetPeerMaxIDs"],
  ["stories", "get-peer-stories", "stories.GetPeerStories"],
  ["stories", "get-pinned-stories", "stories.GetPinnedStories"],
  ["stories", "get-stories-archive", "stories.GetStoriesArchive"],
  ["stories", "get-stories-by-id", "stories.GetStoriesByID"],
  ["stories", "get-stories-views", "stories.GetStoriesViews"],
  ["stories", "get-story-reactions-list", "stories.GetStoryReactionsList"],
  ["stories", "get-story-views-list", "stories.GetStoryViewsList"],
  ["stories", "increment-story-views", "stories.IncrementStoryViews"],
  ["stories", "read-stories", "stories.ReadStories"],
  ["stories", "reorder-albums", "stories.ReorderAlbums"],
  ["stories", "report", "stories.Report"],
  ["stories", "search-posts", "stories.SearchPosts"],
  ["stories", "send-reaction", "stories.SendReaction"],
  ["stories", "send-story", "stories.SendStory"],
  ["stories", "start-live", "stories.StartLive"],
  ["stories", "toggle-all-stories-hidden", "stories.ToggleAllStoriesHidden"],
  ["stories", "toggle-peer-stories-hidden", "stories.TogglePeerStoriesHidden"],
  ["stories", "toggle-pinned", "stories.TogglePinned"],
  ["stories", "toggle-pinned-to-top", "stories.TogglePinnedToTop"],
  ["stories", "update-album", "stories.UpdateAlbum"],
  ["updates", "get-channel-difference", "updates.GetChannelDifference"],
  ["updates", "get-difference", "updates.GetDifference"],
  ["updates", "get-state", "updates.GetState"],
  ["upload", "get-cdn-file", "upload.GetCdnFile"],
  ["upload", "get-cdn-file-hashes", "upload.GetCdnFileHashes"],
  ["upload", "get-file", "upload.GetFile"],
  ["upload", "get-file-hashes", "upload.GetFileHashes"],
  ["upload", "get-web-file", "upload.GetWebFile"],
  ["upload", "reupload-cdn-file", "upload.ReuploadCdnFile"],
  ["upload", "save-big-file-part", "upload.SaveBigFilePart"],
  ["upload", "save-file-part", "upload.SaveFilePart"],
  ["users", "get-full-user", "users.GetFullUser"],
  ["users", "get-requirements-to-contact", "users.GetRequirementsToContact"],
  ["users", "get-saved-music", "users.GetSavedMusic"],
  ["users", "get-saved-music-by-id", "users.GetSavedMusicByID"],
  ["users", "get-users", "users.GetUsers"],
  ["users", "set-secure-value-errors", "users.SetSecureValueErrors"],
  ["users", "suggest-birthday", "users.SuggestBirthday"]
];
var TL_NAMESPACES = ["account", "aicompose", "auth", "bots", "channels", "chatlists", "communities", "contacts", "ephemeral", "folders", "fragment", "help", "langpack", "messages", "payments", "phone", "photos", "premium", "smsjobs", "stats", "stickers", "stories", "updates", "upload", "users"];

// src/generated-registry.ts
var byPath = new Map;
var rootMethodMap = new Map;
var namespaceMethods = new Map;
for (const m of TL_METHODS) {
  const [ns, method, className] = m;
  if (ns) {
    byPath.set(`${ns}/${method}`, className);
    const list = namespaceMethods.get(ns);
    if (list)
      list.push(m);
    else
      namespaceMethods.set(ns, [m]);
  } else {
    rootMethodMap.set(method, className);
  }
}
var NAMESPACE_SET = new Set(TL_NAMESPACES);
function isGeneratedNamespace(ns) {
  return NAMESPACE_SET.has(ns);
}
function namespaceMethodList(ns) {
  return namespaceMethods.get(ns) ?? [];
}
function methodClassName(ns, method) {
  return byPath.get(`${ns}/${method}`);
}
function rootMethodClassName(method) {
  return rootMethodMap.get(method);
}
function rootMethods() {
  return TL_METHODS.filter((m) => !m[0]);
}
function namespaceCounts() {
  return [...namespaceMethods.entries()].map(([ns, list]) => ({ ns, count: list.length })).sort((a, b) => b.count - a.count);
}
function resolveGeneratedCommand(args) {
  const [c0, c1] = args;
  if (!c0)
    return null;
  if (isGeneratedNamespace(c0) && typeof c1 === "string") {
    return methodClassName(c0, c1) ?? null;
  }
  return rootMethodClassName(c0) ?? null;
}
function kebabCase(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z]+)([A-Z][a-z]{2,})/g, "$1-$2").toLowerCase();
}

// src/approval.ts
init_paths();
