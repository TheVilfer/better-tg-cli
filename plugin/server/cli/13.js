    let entities = params.entities;
    if (caption != null && entities == undefined) {
      [caption, entities] = await (0, messageParse_1._parseMessageText)(client, caption, params.parseMode);
    }
    return client.invoke(new tl_1.Api.stories.EditStory({
      peer,
      id: storyId,
      media: params.media ? await _toStoryMedia(client, params.media) : undefined,
      caption,
      entities,
      privacyRules: params.privacyRules,
      mediaAreas: params.mediaAreas,
      music: params.music
    }));
  }
  async function deleteStories(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.DeleteStories({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    }));
  }
  async function toggleStoriesPinned(client, entity, ids, pinned = true) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.TogglePinned({
      peer,
      id: Array.isArray(ids) ? ids : [ids],
      pinned
    }));
  }
  async function canSendStory(client, entity) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.canSendStory({ peer });
  }
  async function getAllStories(client, params = {}) {
    return client.api.stories.getAllStories({
      next: params.next,
      hidden: params.hidden,
      state: params.state
    });
  }
  async function getPeerStories(client, entity) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getPeerStories({ peer });
  }
  async function getStoriesByID(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getStoriesByID({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    });
  }
  async function getPinnedStories(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getPinnedStories({
      peer,
      offsetId: params.offsetId ?? 0,
      limit: params.limit ?? 100
    });
  }
  async function getStoriesArchive(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getStoriesArchive({
      peer,
      offsetId: params.offsetId ?? 0,
      limit: params.limit ?? 100
    });
  }
  async function readStories(client, entity, maxId) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.readStories({
      peer,
      maxId: maxId ?? 0
    });
  }
  async function incrementStoryViews(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.incrementStoryViews({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    });
  }
  async function getStoryViewsList(client, entity, storyId, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.GetStoryViewsList({
      peer,
      id: storyId,
      justContacts: params.justContacts,
      reactionsFirst: params.reactionsFirst,
      forwardsFirst: params.forwardsFirst,
      q: params.search,
      offset: params.offset ?? "",
      limit: params.limit ?? 100
    }));
  }
  async function exportStoryLink(client, entity, storyId) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.exportStoryLink({ peer, id: storyId });
  }
  async function sendStoryReaction(client, entity, storyId, reaction, params = {}) {
    const peer = await client.getInputEntity(entity);
    let resolved;
    if (reaction == undefined) {
      resolved = new tl_1.Api.ReactionEmpty;
    } else if (typeof reaction === "string") {
      resolved = new tl_1.Api.ReactionEmoji({ emoticon: reaction });
    } else if (reaction instanceof tl_1.Api.ReactionEmoji || reaction instanceof tl_1.Api.ReactionCustomEmoji || reaction instanceof tl_1.Api.ReactionPaid || reaction instanceof tl_1.Api.ReactionEmpty) {
      resolved = reaction;
    } else {
      resolved = new tl_1.Api.ReactionCustomEmoji({
        documentId: reaction
      });
    }
    return client.invoke(new tl_1.Api.stories.SendReaction({
      peer,
      storyId,
      reaction: resolved,
      addToRecent: params.addToRecent
    }));
  }
});

// node_modules/teleproto/client/folders.js
var require_folders = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.getDialogFilters = getDialogFilters;
  exports2.updateDialogFilter = updateDialogFilter;
  exports2.updateDialogFiltersOrder = updateDialogFiltersOrder;
  var tl_1 = require_tl();
  async function getDialogFilters(client) {
    return client.api.messages.getDialogFilters({});
  }
  async function updateDialogFilter(client, id, filter) {
    return client.invoke(new tl_1.Api.messages.UpdateDialogFilter({
      id,
      filter
    }));
  }
  async function updateDialogFiltersOrder(client, order) {
    return client.api.messages.updateDialogFiltersOrder({ order });
  }
});

// node_modules/teleproto/client/stickers.js
var require_stickers = __commonJS((exports2) => {
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
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.getStickerSet = getStickerSet;
  exports2.getAllStickers = getAllStickers;
  exports2.installStickerSet = installStickerSet;
  exports2.uninstallStickerSet = uninstallStickerSet;
  exports2.getRecentStickers = getRecentStickers;
  exports2.saveRecentSticker = saveRecentSticker;
  exports2.clearRecentStickers = clearRecentStickers;
  exports2.getFavedStickers = getFavedStickers;
  exports2.faveSticker = faveSticker;
  exports2.getCustomEmojiDocuments = getCustomEmojiDocuments;
  var big_integer_1 = __importDefault(require_BigInteger());
  var utils = __importStar(require_Utils());
  var tl_1 = require_tl();
  function _toInputStickerSet(set) {
    if (typeof set === "string") {
      return new tl_1.Api.InputStickerSetShortName({ shortName: set });
    }
    return set;
  }
  async function getStickerSet(client, set) {
    return client.invoke(new tl_1.Api.messages.GetStickerSet({
      stickerset: _toInputStickerSet(set),
      hash: 0
    }));
  }
  async function getAllStickers(client) {
    return client.api.messages.getAllStickers({ hash: big_integer_1.default.zero });
  }
  async function installStickerSet(client, set, params = {}) {
    return client.invoke(new tl_1.Api.messages.InstallStickerSet({
      stickerset: _toInputStickerSet(set),
      archived: params.archived ?? false
    }));
  }
  async function uninstallStickerSet(client, set) {
    return client.invoke(new tl_1.Api.messages.UninstallStickerSet({
      stickerset: _toInputStickerSet(set)
    }));
  }
  async function getRecentStickers(client, params = {}) {
    return client.api.messages.getRecentStickers({
      hash: big_integer_1.default.zero,
      attached: params.attached
    });
  }
  async function saveRecentSticker(client, document, params = {}) {
    return client.invoke(new tl_1.Api.messages.SaveRecentSticker({
      id: utils.getInputDocument(document),
      unsave: params.unsave ?? false,
      attached: params.attached
    }));
  }
  async function clearRecentStickers(client, params = {}) {
    return client.api.messages.clearRecentStickers({
      attached: params.attached
    });
  }
  async function getFavedStickers(client) {
    return client.api.messages.getFavedStickers({ hash: big_integer_1.default.zero });
  }
  async function faveSticker(client, document, params = {}) {
    return client.invoke(new tl_1.Api.messages.FaveSticker({
      id: utils.getInputDocument(document),
      unfave: params.unfave ?? false
    }));
  }
  async function getCustomEmojiDocuments(client, documentIds) {
    return client.api.messages.getCustomEmojiDocuments({
      documentId: documentIds
    });
  }
});

// node_modules/teleproto/tl/runtime/apiProxy.js
var require_apiProxy = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.createApiProxy = createApiProxy;
  function upperFirst(value) {
    return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
  }
  function asRequestClass(value) {
    return typeof value === "function" && value.classType === "request" ? value : undefined;
  }
  function createApiProxy(api, invoke) {
    const lookup = (name) => {
      const parts = name.split(".");
      if (parts.length === 1)
        return asRequestClass(api[upperFirst(name)]);
      if (parts.length !== 2)
        return;
      const ns = api[parts[0]];
      return ns && typeof ns === "object" ? asRequestClass(ns[upperFirst(parts[1])]) : undefined;
    };
    const call = async (request, options) => {
      if (request && "classType" in request && request.classType === "request") {
        return invoke(request, options?.dcId, options);
      }
      const tag = request?._;
      const Ctor = typeof tag === "string" ? lookup(tag) : undefined;
      if (!Ctor)
        throw new TypeError(`Unknown raw API method: ${String(tag)}`);
      return invoke(new Ctor(request), options?.dcId, options);
    };
    const namespaceProxy = (ns, root = false) => {
      const cache = new Map;
      return new Proxy(Object.create(null), {
        get(_target, key) {
          if (typeof key !== "string" || key === "then")
            return;
          if (root && key === "call")
            return call;
          if (cache.has(key))
            return cache.get(key);
          const Ctor = asRequestClass(ns[upperFirst(key)]);
          if (Ctor) {
            const method = async (params, opts) => {
              const options = Ctor.hasParameters ? opts : opts ?? params;
              return invoke(new Ctor(Ctor.hasParameters ? params : {}), options?.dcId, options);
            };
            cache.set(key, method);
            return method;
          }
          const value = ns[key];
          if (root && value && typeof value === "object" && Object.values(value).some(asRequestClass)) {
            const proxy = namespaceProxy(value);
            cache.set(key, proxy);
            return proxy;
          }
          return;
        }
      });
    };
    return namespaceProxy(api, true);
  }
});

// node_modules/teleproto/extensions/html.js
var require_html = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.HTMLParser = undefined;
  var big_integer_1 = __importDefault(require_BigInteger());
  var tl_1 = require_tl();
  var Helpers_1 = require_Helpers();

  class HTMLParser {
    static {
      this._tag = /<(\/?)([a-z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
    }
    static {
      this._ref = /&(#x?[0-9a-f]+;?|[a-z][a-z0-9]*;?)/gi;
    }
    static {
      this._attr = /([a-z0-9-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s/>]+))?/gi;
    }
    static {
      this._esc = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;"
      };
    }
    static parse(html) {
      if (!html) {
        return [html, []];
      }
      const pieces = [];
      let length = 0;
      const entities = [];
      const open = [];
      const append = (chunk) => {
        if (chunk) {
          pieces.push(chunk);
          length += chunk.length;
        }
      };
      let cursor = 0;
      for (const match of html.matchAll(HTMLParser._tag)) {
        const at = match.index ?? 0;
        append(HTMLParser._decode(html.slice(cursor, at)));
        cursor = at + match[0].length;
        const [, slash, rawName, rawAttrs] = match;
        const name = rawName.toLowerCase();
        if (slash) {
          for (let i = open.length - 1;i >= 0; i--) {
            if (open[i].name === name) {
              const tag = open.splice(i, 1)[0];
              if (tag.entity) {
                tag.entity.length = length - tag.start;
                entities.push(tag.entity);
              }
              break;
            }
          }
          continue;
        }
        if (name === "br") {
          append(`
`);
          continue;
        }
        if (rawAttrs.trimEnd().endsWith("/")) {
          continue;
        }
        const attrs = HTMLParser._readAttributes(rawAttrs);
        open.push({ name, start: length, entity: HTMLParser._entityFor(name, attrs, length, open) });
      }
      append(HTMLParser._decode(html.slice(cursor)));
      return [(0, Helpers_1.stripText)(pieces.join(""), entities), entities];
    }
    static unparse(text, entities, _offset, _length) {
      if (!text) {
        return text;
      }
      if (!entities?.length) {
        return HTMLParser._escapeHtml(text);
      }
      const marks = entities.flatMap((entity, order) => {
        const markup = HTMLParser._markupFor(entity, text);
        if (!markup) {
          return [];
        }
        const end = entity.offset + entity.length;
        return [
          { at: entity.offset, open: true, span: entity.length, order, html: markup[0] },
          { at: end, open: false, span: entity.length, order, html: markup[1] }
        ];
      });
      marks.sort((a, b) => {
        if (a.at !== b.at)
          return a.at - b.at;
        if (a.open !== b.open)
          return a.open ? 1 : -1;
        if (a.span !== b.span)
          return a.open ? b.span - a.span : a.span - b.span;
        return a.open ? a.order - b.order : b.order - a.order;
      });
      const out = [];
      let last = 0;
      for (const mark of marks) {
        if (mark.at > last) {
          out.push(HTMLParser._escapeHtml(text.slice(last, mark.at)));
          last = mark.at;
        }
        out.push(mark.html);
      }
      out.push(HTMLParser._escapeHtml(text.slice(last)));
      return out.join("");
    }
    static _decode(text) {
      if (!text.includes("&")) {
        return text;
      }
      return text.replace(HTMLParser._ref, (whole, ref) => {
        if (ref[0] === "#") {
          const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
          return code <= 1114111 && (code < 55296 || code > 57343) ? String.fromCodePoint(code) : whole;
        }
        return ENTITIES.get(ref) ?? whole;
      });
    }
    static _escapeHtml(text) {
      return text.replace(/[&<>"']/g, (c) => HTMLParser._esc[c]);
    }
    static _readAttributes(source) {
      const attrs = {};
      for (const m of source.matchAll(HTMLParser._attr)) {
        const raw = m[2] ?? "";
        const value = raw[0] === '"' || raw[0] === "'" ? raw.slice(1, -1) : raw;
        attrs[m[1].toLowerCase()] = HTMLParser._decode(value);
      }
      return attrs;
    }
    static _entityFor(name, attrs, offset, stack) {
      switch (name) {
        case "b":
        case "strong":
          return new tl_1.Api.MessageEntityBold({ offset, length: 0 });
        case "i":
        case "em":
          return new tl_1.Api.MessageEntityItalic({ offset, length: 0 });
        case "u":
        case "ins":
          return new tl_1.Api.MessageEntityUnderline({ offset, length: 0 });
        case "s":
        case "del":
        case "strike":
          return new tl_1.Api.MessageEntityStrike({ offset, length: 0 });
        case "spoiler":
        case "tg-spoiler":
          return new tl_1.Api.MessageEntitySpoiler({ offset, length: 0 });
        case "span":
          return attrs.class?.split(/\s+/).includes("tg-spoiler") ? new tl_1.Api.MessageEntitySpoiler({ offset, length: 0 }) : undefined;
        case "blockquote":
          return new tl_1.Api.MessageEntityBlockquote(attrs.expandable !== undefined ? { offset, length: 0, collapsed: true } : { offset, length: 0 });
        case "pre":
          return new tl_1.Api.MessageEntityPre({ offset, length: 0, language: "" });
        case "code": {
          const pre = stack.find((t) => t.entity instanceof tl_1.Api.MessageEntityPre);
          if (pre) {
            const cls = attrs.class;
            if (cls?.startsWith("language-")) {
              pre.entity.language = cls.slice("language-".length);
            }
            return;
          }
          return new tl_1.Api.MessageEntityCode({ offset, length: 0 });
        }
        case "a": {
          const href = attrs.href;
          if (!href) {
            return;
          }
          if (href.startsWith("mailto:")) {
            return new tl_1.Api.MessageEntityEmail({ offset, length: 0 });
          }
          const mention = href.match(/^tg:\/\/user\?id=(\d+)/);
          if (mention) {
            return new tl_1.Api.MessageEntityMentionName({
              offset,
              length: 0,
              userId: (0, big_integer_1.default)(mention[1])
            });
          }
          return new tl_1.Api.MessageEntityTextUrl({ offset, length: 0, url: href });
        }
        case "tg-emoji":
          return new tl_1.Api.MessageEntityCustomEmoji({
            offset,
            length: 0,
            documentId: (0, big_integer_1.default)(attrs["emoji-id"] || "0")
          });
        case "tg-date":
          return new tl_1.Api.MessageEntityFormattedDate({
            offset,
            length: 0,
            date: parseInt(attrs.timestamp ?? "0", 10) || 0,
            relative: attrs.relative !== undefined,
            shortTime: attrs["short-time"] !== undefined,
            longTime: attrs["long-time"] !== undefined,
            shortDate: attrs["short-date"] !== undefined,
            longDate: attrs["long-date"] !== undefined,
            dayOfWeek: attrs["day-of-week"] !== undefined
          });
        default:
          return;
      }
    }
    static _markupFor(entity, text) {
      const body = () => HTMLParser._escapeHtml(text.slice(entity.offset, entity.offset + entity.length));
      switch (entity.className) {
        case "MessageEntityBold":
          return ["<strong>", "</strong>"];
        case "MessageEntitySpoiler":
          return ["<tg-spoiler>", "</tg-spoiler>"];
        case "MessageEntityItalic":
          return ["<em>", "</em>"];
        case "MessageEntityCode":
          return ["<code>", "</code>"];
        case "MessageEntityUnderline":
          return ["<u>", "</u>"];
        case "MessageEntityStrike":
          return ["<del>", "</del>"];
        case "MessageEntityBlockquote":
          return [entity.collapsed ? "<blockquote expandable>" : "<blockquote>", "</blockquote>"];
        case "MessageEntityPre":
          return entity.language ? [`<pre><code class="language-${HTMLParser._escapeHtml(entity.language)}">`, "</code></pre>"] : ["<pre>", "</pre>"];
        case "MessageEntityEmail":
          return [`<a href="mailto:${body()}">`, "</a>"];
        case "MessageEntityUrl":
          return [`<a href="${body()}">`, "</a>"];
        case "MessageEntityTextUrl":
          return [`<a href="${HTMLParser._escapeHtml(entity.url)}">`, "</a>"];
        case "MessageEntityMentionName":
          return [`<a href="tg://user?id=${entity.userId}">`, "</a>"];
        case "MessageEntityCustomEmoji":
          return [`<tg-emoji emoji-id="${entity.documentId}">`, "</tg-emoji>"];
        case "MessageEntityFormattedDate": {
          const flags = [
            entity.relative && "relative",
            entity.shortTime && "short-time",
            entity.longTime && "long-time",
            entity.shortDate && "short-date",
            entity.longDate && "long-date",
            entity.dayOfWeek && "day-of-week"
          ].filter(Boolean).join(" ");
          return [`<tg-date timestamp="${entity.date}"${flags ? " " + flags : ""}>`, "</tg-date>"];
        }
        default:
          return null;
      }
    }
  }
  exports2.HTMLParser = HTMLParser;
  var ENTITIES = new Map(Object.entries({
    AElig: "Æ",
    "AElig;": "Æ",
    AMP: "&",
    "AMP;": "&",
    Aacute: "Á",
    "Aacute;": "Á",
    "Abreve;": "Ă",
    Acirc: "Â",
    "Acirc;": "Â",
    "Acy;": "А",
    "Afr;": "\uD835\uDD04",
    Agrave: "À",
    "Agrave;": "À",
    "Alpha;": "Α",
    "Amacr;": "Ā",
    "And;": "⩓",
    "Aogon;": "Ą",
    "Aopf;": "\uD835\uDD38",
    "ApplyFunction;": "⁡",
    Aring: "Å",
    "Aring;": "Å",
    "Ascr;": "\uD835\uDC9C",
    "Assign;": "≔",
    Atilde: "Ã",
    "Atilde;": "Ã",
    Auml: "Ä",
    "Auml;": "Ä",
    "Backslash;": "∖",
    "Barv;": "⫧",
    "Barwed;": "⌆",
    "Bcy;": "Б",
    "Because;": "∵",
    "Bernoullis;": "ℬ",
    "Beta;": "Β",
    "Bfr;": "\uD835\uDD05",
    "Bopf;": "\uD835\uDD39",
    "Breve;": "˘",
    "Bscr;": "ℬ",
    "Bumpeq;": "≎",
    "CHcy;": "Ч",
    COPY: "©",
    "COPY;": "©",
    "Cacute;": "Ć",
    "Cap;": "⋒",
    "CapitalDifferentialD;": "ⅅ",
    "Cayleys;": "ℭ",
    "Ccaron;": "Č",
    Ccedil: "Ç",
    "Ccedil;": "Ç",
    "Ccirc;": "Ĉ",
    "Cconint;": "∰",
    "Cdot;": "Ċ",
    "Cedilla;": "¸",
    "CenterDot;": "·",
    "Cfr;": "ℭ",
    "Chi;": "Χ",
    "CircleDot;": "⊙",
    "CircleMinus;": "⊖",
    "CirclePlus;": "⊕",
    "CircleTimes;": "⊗",
    "ClockwiseContourIntegral;": "∲",
    "CloseCurlyDoubleQuote;": "”",
    "CloseCurlyQuote;": "’",
    "Colon;": "∷",
    "Colone;": "⩴",
    "Congruent;": "≡",
    "Conint;": "∯",
    "ContourIntegral;": "∮",
    "Copf;": "ℂ",
    "Coproduct;": "∐",
    "CounterClockwiseContourIntegral;": "∳",
    "Cross;": "⨯",
    "Cscr;": "\uD835\uDC9E",
    "Cup;": "⋓",
    "CupCap;": "≍",
    "DD;": "ⅅ",
    "DDotrahd;": "⤑",
    "DJcy;": "Ђ",
    "DScy;": "Ѕ",
    "DZcy;": "Џ",
    "Dagger;": "‡",
    "Darr;": "↡",
    "Dashv;": "⫤",
    "Dcaron;": "Ď",
    "Dcy;": "Д",
    "Del;": "∇",
    "Delta;": "Δ",
    "Dfr;": "\uD835\uDD07",
    "DiacriticalAcute;": "´",
    "DiacriticalDot;": "˙",
    "DiacriticalDoubleAcute;": "˝",
    "DiacriticalGrave;": "`",
    "DiacriticalTilde;": "˜",
    "Diamond;": "⋄",
    "DifferentialD;": "ⅆ",
    "Dopf;": "\uD835\uDD3B",
    "Dot;": "¨",
    "DotDot;": "⃜",
    "DotEqual;": "≐",
    "DoubleContourIntegral;": "∯",
    "DoubleDot;": "¨",
    "DoubleDownArrow;": "⇓",
    "DoubleLeftArrow;": "⇐",
    "DoubleLeftRightArrow;": "⇔",
    "DoubleLeftTee;": "⫤",
    "DoubleLongLeftArrow;": "⟸",
    "DoubleLongLeftRightArrow;": "⟺",
    "DoubleLongRightArrow;": "⟹",
    "DoubleRightArrow;": "⇒",
    "DoubleRightTee;": "⊨",
    "DoubleUpArrow;": "⇑",
    "DoubleUpDownArrow;": "⇕",
    "DoubleVerticalBar;": "∥",
    "DownArrow;": "↓",
    "DownArrowBar;": "⤓",
    "DownArrowUpArrow;": "⇵",
    "DownBreve;": "̑",
    "DownLeftRightVector;": "⥐",
    "DownLeftTeeVector;": "⥞",
    "DownLeftVector;": "↽",
    "DownLeftVectorBar;": "⥖",
    "DownRightTeeVector;": "⥟",
    "DownRightVector;": "⇁",
    "DownRightVectorBar;": "⥗",
    "DownTee;": "⊤",
    "DownTeeArrow;": "↧",
    "Downarrow;": "⇓",
    "Dscr;": "\uD835\uDC9F",
    "Dstrok;": "Đ",
    "ENG;": "Ŋ",
    ETH: "Ð",
    "ETH;": "Ð",
    Eacute: "É",
    "Eacute;": "É",
    "Ecaron;": "Ě",
    Ecirc: "Ê",
    "Ecirc;": "Ê",
    "Ecy;": "Э",
    "Edot;": "Ė",
    "Efr;": "\uD835\uDD08",
    Egrave: "È",
    "Egrave;": "È",
    "Element;": "∈",
    "Emacr;": "Ē",
    "EmptySmallSquare;": "◻",
    "EmptyVerySmallSquare;": "▫",
    "Eogon;": "Ę",
    "Eopf;": "\uD835\uDD3C",
    "Epsilon;": "Ε",
    "Equal;": "⩵",
    "EqualTilde;": "≂",
    "Equilibrium;": "⇌",
    "Escr;": "ℰ",
    "Esim;": "⩳",
    "Eta;": "Η",
    Euml: "Ë",
    "Euml;": "Ë",
    "Exists;": "∃",
    "ExponentialE;": "ⅇ",
    "Fcy;": "Ф",
    "Ffr;": "\uD835\uDD09",
    "FilledSmallSquare;": "◼",
    "FilledVerySmallSquare;": "▪",
    "Fopf;": "\uD835\uDD3D",
    "ForAll;": "∀",
    "Fouriertrf;": "ℱ",
    "Fscr;": "ℱ",
    "GJcy;": "Ѓ",
    GT: ">",
    "GT;": ">",
    "Gamma;": "Γ",
    "Gammad;": "Ϝ",
    "Gbreve;": "Ğ",
    "Gcedil;": "Ģ",
    "Gcirc;": "Ĝ",
    "Gcy;": "Г",
    "Gdot;": "Ġ",
    "Gfr;": "\uD835\uDD0A",
    "Gg;": "⋙",
    "Gopf;": "\uD835\uDD3E",
    "GreaterEqual;": "≥",
    "GreaterEqualLess;": "⋛",
    "GreaterFullEqual;": "≧",
    "GreaterGreater;": "⪢",
    "GreaterLess;": "≷",
    "GreaterSlantEqual;": "⩾",
    "GreaterTilde;": "≳",
    "Gscr;": "\uD835\uDCA2",
    "Gt;": "≫",
    "HARDcy;": "Ъ",
    "Hacek;": "ˇ",
    "Hat;": "^",
    "Hcirc;": "Ĥ",
    "Hfr;": "ℌ",
    "HilbertSpace;": "ℋ",
    "Hopf;": "ℍ",
    "HorizontalLine;": "─",
    "Hscr;": "ℋ",
    "Hstrok;": "Ħ",
    "HumpDownHump;": "≎",
    "HumpEqual;": "≏",
    "IEcy;": "Е",
    "IJlig;": "Ĳ",
    "IOcy;": "Ё",
    Iacute: "Í",
    "Iacute;": "Í",
    Icirc: "Î",
    "Icirc;": "Î",
    "Icy;": "И",
    "Idot;": "İ",
    "Ifr;": "ℑ",
    Igrave: "Ì",
    "Igrave;": "Ì",
    "Im;": "ℑ",
    "Imacr;": "Ī",
    "ImaginaryI;": "ⅈ",
    "Implies;": "⇒",
    "Int;": "∬",
    "Integral;": "∫",
    "Intersection;": "⋂",
    "InvisibleComma;": "⁣",
    "InvisibleTimes;": "⁢",
    "Iogon;": "Į",
    "Iopf;": "\uD835\uDD40",
    "Iota;": "Ι",
    "Iscr;": "ℐ",
    "Itilde;": "Ĩ",
    "Iukcy;": "І",
    Iuml: "Ï",
    "Iuml;": "Ï",
    "Jcirc;": "Ĵ",
    "Jcy;": "Й",
    "Jfr;": "\uD835\uDD0D",
    "Jopf;": "\uD835\uDD41",
    "Jscr;": "\uD835\uDCA5",
    "Jsercy;": "Ј",
    "Jukcy;": "Є",
    "KHcy;": "Х",
    "KJcy;": "Ќ",
    "Kappa;": "Κ",
    "Kcedil;": "Ķ",
    "Kcy;": "К",
    "Kfr;": "\uD835\uDD0E",
    "Kopf;": "\uD835\uDD42",
    "Kscr;": "\uD835\uDCA6",
    "LJcy;": "Љ",
    LT: "<",
    "LT;": "<",
    "Lacute;": "Ĺ",
    "Lambda;": "Λ",
    "Lang;": "⟪",
    "Laplacetrf;": "ℒ",
    "Larr;": "↞",
    "Lcaron;": "Ľ",
    "Lcedil;": "Ļ",
    "Lcy;": "Л",
    "LeftAngleBracket;": "⟨",
    "LeftArrow;": "←",
    "LeftArrowBar;": "⇤",
    "LeftArrowRightArrow;": "⇆",
    "LeftCeiling;": "⌈",
    "LeftDoubleBracket;": "⟦",
    "LeftDownTeeVector;": "⥡",
    "LeftDownVector;": "⇃",
    "LeftDownVectorBar;": "⥙",
    "LeftFloor;": "⌊",
    "LeftRightArrow;": "↔",
    "LeftRightVector;": "⥎",
    "LeftTee;": "⊣",
    "LeftTeeArrow;": "↤",
    "LeftTeeVector;": "⥚",
    "LeftTriangle;": "⊲",
    "LeftTriangleBar;": "⧏",
    "LeftTriangleEqual;": "⊴",
    "LeftUpDownVector;": "⥑",
    "LeftUpTeeVector;": "⥠",
    "LeftUpVector;": "↿",
    "LeftUpVectorBar;": "⥘",
    "LeftVector;": "↼",
    "LeftVectorBar;": "⥒",
    "Leftarrow;": "⇐",
    "Leftrightarrow;": "⇔",
    "LessEqualGreater;": "⋚",
    "LessFullEqual;": "≦",
    "LessGreater;": "≶",
    "LessLess;": "⪡",
    "LessSlantEqual;": "⩽",
    "LessTilde;": "≲",
    "Lfr;": "\uD835\uDD0F",
    "Ll;": "⋘",
    "Lleftarrow;": "⇚",
    "Lmidot;": "Ŀ",
    "LongLeftArrow;": "⟵",
    "LongLeftRightArrow;": "⟷",
    "LongRightArrow;": "⟶",
    "Longleftarrow;": "⟸",
    "Longleftrightarrow;": "⟺",
    "Longrightarrow;": "⟹",
    "Lopf;": "\uD835\uDD43",
    "LowerLeftArrow;": "↙",
    "LowerRightArrow;": "↘",
    "Lscr;": "ℒ",
    "Lsh;": "↰",
    "Lstrok;": "Ł",
    "Lt;": "≪",
    "Map;": "⤅",
    "Mcy;": "М",
    "MediumSpace;": " ",
    "Mellintrf;": "ℳ",
    "Mfr;": "\uD835\uDD10",
    "MinusPlus;": "∓",
    "Mopf;": "\uD835\uDD44",
    "Mscr;": "ℳ",
    "Mu;": "Μ",
    "NJcy;": "Њ",
    "Nacute;": "Ń",
    "Ncaron;": "Ň",
    "Ncedil;": "Ņ",
    "Ncy;": "Н",
    "NegativeMediumSpace;": "​",
    "NegativeThickSpace;": "​",
    "NegativeThinSpace;": "​",
    "NegativeVeryThinSpace;": "​",
    "NestedGreaterGreater;": "≫",
    "NestedLessLess;": "≪",
    "NewLine;": `
`,
    "Nfr;": "\uD835\uDD11",
    "NoBreak;": "⁠",
    "NonBreakingSpace;": " ",
    "Nopf;": "ℕ",
    "Not;": "⫬",
    "NotCongruent;": "≢",
    "NotCupCap;": "≭",
    "NotDoubleVerticalBar;": "∦",
    "NotElement;": "∉",
    "NotEqual;": "≠",
    "NotEqualTilde;": "≂̸",
    "NotExists;": "∄",
    "NotGreater;": "≯",
    "NotGreaterEqual;": "≱",
    "NotGreaterFullEqual;": "≧̸",
    "NotGreaterGreater;": "≫̸",
    "NotGreaterLess;": "≹",
    "NotGreaterSlantEqual;": "⩾̸",
    "NotGreaterTilde;": "≵",
    "NotHumpDownHump;": "≎̸",
    "NotHumpEqual;": "≏̸",
    "NotLeftTriangle;": "⋪",
    "NotLeftTriangleBar;": "⧏̸",
    "NotLeftTriangleEqual;": "⋬",
    "NotLess;": "≮",
    "NotLessEqual;": "≰",
    "NotLessGreater;": "≸",
    "NotLessLess;": "≪̸",
    "NotLessSlantEqual;": "⩽̸",
    "NotLessTilde;": "≴",
    "NotNestedGreaterGreater;": "⪢̸",
    "NotNestedLessLess;": "⪡̸",
    "NotPrecedes;": "⊀",
    "NotPrecedesEqual;": "⪯̸",
    "NotPrecedesSlantEqual;": "⋠",
    "NotReverseElement;": "∌",
    "NotRightTriangle;": "⋫",
    "NotRightTriangleBar;": "⧐̸",
    "NotRightTriangleEqual;": "⋭",
    "NotSquareSubset;": "⊏̸",
    "NotSquareSubsetEqual;": "⋢",
    "NotSquareSuperset;": "⊐̸",
    "NotSquareSupersetEqual;": "⋣",
    "NotSubset;": "⊂⃒",
    "NotSubsetEqual;": "⊈",
    "NotSucceeds;": "⊁",
    "NotSucceedsEqual;": "⪰̸",
    "NotSucceedsSlantEqual;": "⋡",
    "NotSucceedsTilde;": "≿̸",
    "NotSuperset;": "⊃⃒",
    "NotSupersetEqual;": "⊉",
    "NotTilde;": "≁",
    "NotTildeEqual;": "≄",
    "NotTildeFullEqual;": "≇",
    "NotTildeTilde;": "≉",
    "NotVerticalBar;": "∤",
    "Nscr;": "\uD835\uDCA9",
    Ntilde: "Ñ",
    "Ntilde;": "Ñ",
    "Nu;": "Ν",
    "OElig;": "Œ",
    Oacute: "Ó",
    "Oacute;": "Ó",
    Ocirc: "Ô",
    "Ocirc;": "Ô",
    "Ocy;": "О",
    "Odblac;": "Ő",
    "Ofr;": "\uD835\uDD12",
    Ograve: "Ò",
    "Ograve;": "Ò",
    "Omacr;": "Ō",
    "Omega;": "Ω",
    "Omicron;": "Ο",
    "Oopf;": "\uD835\uDD46",
    "OpenCurlyDoubleQuote;": "“",
    "OpenCurlyQuote;": "‘",
    "Or;": "⩔",
    "Oscr;": "\uD835\uDCAA",
    Oslash: "Ø",
    "Oslash;": "Ø",
    Otilde: "Õ",
    "Otilde;": "Õ",
    "Otimes;": "⨷",
    Ouml: "Ö",
    "Ouml;": "Ö",
    "OverBar;": "‾",
    "OverBrace;": "⏞",
    "OverBracket;": "⎴",
    "OverParenthesis;": "⏜",
    "PartialD;": "∂",
    "Pcy;": "П",
    "Pfr;": "\uD835\uDD13",
    "Phi;": "Φ",
    "Pi;": "Π",
    "PlusMinus;": "±",
    "Poincareplane;": "ℌ",
    "Popf;": "ℙ",
    "Pr;": "⪻",
    "Precedes;": "≺",
    "PrecedesEqual;": "⪯",
    "PrecedesSlantEqual;": "≼",
    "PrecedesTilde;": "≾",
    "Prime;": "″",
    "Product;": "∏",
    "Proportion;": "∷",
    "Proportional;": "∝",
    "Pscr;": "\uD835\uDCAB",
    "Psi;": "Ψ",
    QUOT: '"',
    "QUOT;": '"',
    "Qfr;": "\uD835\uDD14",
    "Qopf;": "ℚ",
    "Qscr;": "\uD835\uDCAC",
    "RBarr;": "⤐",
    REG: "®",
    "REG;": "®",
    "Racute;": "Ŕ",
    "Rang;": "⟫",
    "Rarr;": "↠",
    "Rarrtl;": "⤖",
    "Rcaron;": "Ř",
    "Rcedil;": "Ŗ",
    "Rcy;": "Р",
    "Re;": "ℜ",
    "ReverseElement;": "∋",
    "ReverseEquilibrium;": "⇋",
    "ReverseUpEquilibrium;": "⥯",
    "Rfr;": "ℜ",
    "Rho;": "Ρ",
    "RightAngleBracket;": "⟩",
    "RightArrow;": "→",
    "RightArrowBar;": "⇥",
    "RightArrowLeftArrow;": "⇄",
    "RightCeiling;": "⌉",
    "RightDoubleBracket;": "⟧",
    "RightDownTeeVector;": "⥝",
    "RightDownVector;": "⇂",
    "RightDownVectorBar;": "⥕",
    "RightFloor;": "⌋",
    "RightTee;": "⊢",
    "RightTeeArrow;": "↦",
    "RightTeeVector;": "⥛",
    "RightTriangle;": "⊳",
    "RightTriangleBar;": "⧐",
    "RightTriangleEqual;": "⊵",
    "RightUpDownVector;": "⥏",
    "RightUpTeeVector;": "⥜",
    "RightUpVector;": "↾",
    "RightUpVectorBar;": "⥔",
    "RightVector;": "⇀",
    "RightVectorBar;": "⥓",
    "Rightarrow;": "⇒",
    "Ropf;": "ℝ",
    "RoundImplies;": "⥰",
    "Rrightarrow;": "⇛",
    "Rscr;": "ℛ",
    "Rsh;": "↱",
    "RuleDelayed;": "⧴",
    "SHCHcy;": "Щ",
    "SHcy;": "Ш",
    "SOFTcy;": "Ь",
    "Sacute;": "Ś",
    "Sc;": "⪼",
    "Scaron;": "Š",
    "Scedil;": "Ş",
    "Scirc;": "Ŝ",
    "Scy;": "С",
    "Sfr;": "\uD835\uDD16",
    "ShortDownArrow;": "↓",
    "ShortLeftArrow;": "←",
    "ShortRightArrow;": "→",
    "ShortUpArrow;": "↑",
    "Sigma;": "Σ",
    "SmallCircle;": "∘",
    "Sopf;": "\uD835\uDD4A",
    "Sqrt;": "√",
    "Square;": "□",
    "SquareIntersection;": "⊓",
    "SquareSubset;": "⊏",
    "SquareSubsetEqual;": "⊑",
    "SquareSuperset;": "⊐",
    "SquareSupersetEqual;": "⊒",
    "SquareUnion;": "⊔",
    "Sscr;": "\uD835\uDCAE",
    "Star;": "⋆",
    "Sub;": "⋐",
    "Subset;": "⋐",
    "SubsetEqual;": "⊆",
    "Succeeds;": "≻",
    "SucceedsEqual;": "⪰",
    "SucceedsSlantEqual;": "≽",
    "SucceedsTilde;": "≿",
    "SuchThat;": "∋",
    "Sum;": "∑",
    "Sup;": "⋑",
    "Superset;": "⊃",
    "SupersetEqual;": "⊇",
    "Supset;": "⋑",
    THORN: "Þ",
    "THORN;": "Þ",
    "TRADE;": "™",
    "TSHcy;": "Ћ",
    "TScy;": "Ц",
    "Tab;": "\t",
    "Tau;": "Τ",
    "Tcaron;": "Ť",
    "Tcedil;": "Ţ",
    "Tcy;": "Т",
    "Tfr;": "\uD835\uDD17",
    "Therefore;": "∴",
    "Theta;": "Θ",
    "ThickSpace;": "  ",
    "ThinSpace;": " ",
    "Tilde;": "∼",
    "TildeEqual;": "≃",
    "TildeFullEqual;": "≅",
    "TildeTilde;": "≈",
    "Topf;": "\uD835\uDD4B",
    "TripleDot;": "⃛",
    "Tscr;": "\uD835\uDCAF",
    "Tstrok;": "Ŧ",
    Uacute: "Ú",
    "Uacute;": "Ú",
    "Uarr;": "↟",
    "Uarrocir;": "⥉",
    "Ubrcy;": "Ў",
    "Ubreve;": "Ŭ",
    Ucirc: "Û",
    "Ucirc;": "Û",
    "Ucy;": "У",
    "Udblac;": "Ű",
    "Ufr;": "\uD835\uDD18",
    Ugrave: "Ù",
    "Ugrave;": "Ù",
    "Umacr;": "Ū",
    "UnderBar;": "_",
    "UnderBrace;": "⏟",
    "UnderBracket;": "⎵",
    "UnderParenthesis;": "⏝",
    "Union;": "⋃",
    "UnionPlus;": "⊎",
    "Uogon;": "Ų",
    "Uopf;": "\uD835\uDD4C",
    "UpArrow;": "↑",
    "UpArrowBar;": "⤒",
    "UpArrowDownArrow;": "⇅",
    "UpDownArrow;": "↕",
    "UpEquilibrium;": "⥮",
    "UpTee;": "⊥",
    "UpTeeArrow;": "↥",
    "Uparrow;": "⇑",
    "Updownarrow;": "⇕",
    "UpperLeftArrow;": "↖",
    "UpperRightArrow;": "↗",
    "Upsi;": "ϒ",
    "Upsilon;": "Υ",
    "Uring;": "Ů",
    "Uscr;": "\uD835\uDCB0",
    "Utilde;": "Ũ",
    Uuml: "Ü",
    "Uuml;": "Ü",
    "VDash;": "⊫",
    "Vbar;": "⫫",
    "Vcy;": "В",
    "Vdash;": "⊩",
    "Vdashl;": "⫦",
    "Vee;": "⋁",
    "Verbar;": "‖",
    "Vert;": "‖",
    "VerticalBar;": "∣",
    "VerticalLine;": "|",
    "VerticalSeparator;": "❘",
    "VerticalTilde;": "≀",
    "VeryThinSpace;": " ",
    "Vfr;": "\uD835\uDD19",
    "Vopf;": "\uD835\uDD4D",
    "Vscr;": "\uD835\uDCB1",
    "Vvdash;": "⊪",
    "Wcirc;": "Ŵ",
    "Wedge;": "⋀",
    "Wfr;": "\uD835\uDD1A",
    "Wopf;": "\uD835\uDD4E",
    "Wscr;": "\uD835\uDCB2",
    "Xfr;": "\uD835\uDD1B",
    "Xi;": "Ξ",
    "Xopf;": "\uD835\uDD4F",
    "Xscr;": "\uD835\uDCB3",
    "YAcy;": "Я",
    "YIcy;": "Ї",
    "YUcy;": "Ю",
    Yacute: "Ý",
    "Yacute;": "Ý",
    "Ycirc;": "Ŷ",
    "Ycy;": "Ы",
    "Yfr;": "\uD835\uDD1C",
    "Yopf;": "\uD835\uDD50",
    "Yscr;": "\uD835\uDCB4",
    "Yuml;": "Ÿ",
    "ZHcy;": "Ж",
    "Zacute;": "Ź",
    "Zcaron;": "Ž",
    "Zcy;": "З",
    "Zdot;": "Ż",
    "ZeroWidthSpace;": "​",
    "Zeta;": "Ζ",
    "Zfr;": "ℨ",
    "Zopf;": "ℤ",
    "Zscr;": "\uD835\uDCB5",
    aacute: "á",
    "aacute;": "á",
    "abreve;": "ă",
    "ac;": "∾",
    "acE;": "∾̳",
    "acd;": "∿",
    acirc: "â",
    "acirc;": "â",
    acute: "´",
    "acute;": "´",
    "acy;": "а",
    aelig: "æ",
    "aelig;": "æ",
    "af;": "⁡",
    "afr;": "\uD835\uDD1E",
    agrave: "à",
    "agrave;": "à",
    "alefsym;": "ℵ",
    "aleph;": "ℵ",
    "alpha;": "α",
    "amacr;": "ā",
    "amalg;": "⨿",
    amp: "&",
    "amp;": "&",
    "and;": "∧",
    "andand;": "⩕",
    "andd;": "⩜",
    "andslope;": "⩘",
    "andv;": "⩚",
    "ang;": "∠",
    "ange;": "⦤",
    "angle;": "∠",
    "angmsd;": "∡",
    "angmsdaa;": "⦨",
    "angmsdab;": "⦩",
    "angmsdac;": "⦪",
    "angmsdad;": "⦫",
    "angmsdae;": "⦬",
    "angmsdaf;": "⦭",
    "angmsdag;": "⦮",
    "angmsdah;": "⦯",
    "angrt;": "∟",
    "angrtvb;": "⊾",
    "angrtvbd;": "⦝",
    "angsph;": "∢",
    "angst;": "Å",
    "angzarr;": "⍼",
    "aogon;": "ą",
    "aopf;": "\uD835\uDD52",
    "ap;": "≈",
    "apE;": "⩰",
    "apacir;": "⩯",
    "ape;": "≊",
    "apid;": "≋",
    "apos;": "'",
    "approx;": "≈",
    "approxeq;": "≊",
    aring: "å",
    "aring;": "å",
    "ascr;": "\uD835\uDCB6",
    "ast;": "*",
    "asymp;": "≈",
    "asympeq;": "≍",
    atilde: "ã",
    "atilde;": "ã",
    auml: "ä",
    "auml;": "ä",
    "awconint;": "∳",
    "awint;": "⨑",
    "bNot;": "⫭",
    "backcong;": "≌",
    "backepsilon;": "϶",
    "backprime;": "‵",
    "backsim;": "∽",
    "backsimeq;": "⋍",
    "barvee;": "⊽",
    "barwed;": "⌅",
    "barwedge;": "⌅",
    "bbrk;": "⎵",
    "bbrktbrk;": "⎶",
    "bcong;": "≌",
    "bcy;": "б",
    "bdquo;": "„",
    "becaus;": "∵",
    "because;": "∵",
    "bemptyv;": "⦰",
    "bepsi;": "϶",
    "bernou;": "ℬ",
    "beta;": "β",
    "beth;": "ℶ",
    "between;": "≬",
    "bfr;": "\uD835\uDD1F",
    "bigcap;": "⋂",
    "bigcirc;": "◯",
    "bigcup;": "⋃",
    "bigodot;": "⨀",
    "bigoplus;": "⨁",
    "bigotimes;": "⨂",
    "bigsqcup;": "⨆",
    "bigstar;": "★",
    "bigtriangledown;": "▽",
    "bigtriangleup;": "△",
    "biguplus;": "⨄",
    "bigvee;": "⋁",
    "bigwedge;": "⋀",
    "bkarow;": "⤍",
    "blacklozenge;": "⧫",
    "blacksquare;": "▪",
    "blacktriangle;": "▴",
    "blacktriangledown;": "▾",
    "blacktriangleleft;": "◂",
    "blacktriangleright;": "▸",
    "blank;": "␣",
    "blk12;": "▒",
    "blk14;": "░",
    "blk34;": "▓",
    "block;": "█",
    "bne;": "=⃥",
    "bnequiv;": "≡⃥",
    "bnot;": "⌐",
    "bopf;": "\uD835\uDD53",
    "bot;": "⊥",
    "bottom;": "⊥",
    "bowtie;": "⋈",
    "boxDL;": "╗",
    "boxDR;": "╔",
    "boxDl;": "╖",
    "boxDr;": "╓",
    "boxH;": "═",
    "boxHD;": "╦",
    "boxHU;": "╩",
    "boxHd;": "╤",
    "boxHu;": "╧",
    "boxUL;": "╝",
    "boxUR;": "╚",
    "boxUl;": "╜",
    "boxUr;": "╙",
    "boxV;": "║",
    "boxVH;": "╬",
    "boxVL;": "╣",
    "boxVR;": "╠",
    "boxVh;": "╫",
    "boxVl;": "╢",
    "boxVr;": "╟",
    "boxbox;": "⧉",
    "boxdL;": "╕",
    "boxdR;": "╒",
    "boxdl;": "┐",
    "boxdr;": "┌",
    "boxh;": "─",
    "boxhD;": "╥",
    "boxhU;": "╨",
    "boxhd;": "┬",
    "boxhu;": "┴",
    "boxminus;": "⊟",
    "boxplus;": "⊞",
    "boxtimes;": "⊠",
    "boxuL;": "╛",
    "boxuR;": "╘",
    "boxul;": "┘",
    "boxur;": "└",
    "boxv;": "│",
    "boxvH;": "╪",
    "boxvL;": "╡",
    "boxvR;": "╞",
    "boxvh;": "┼",
    "boxvl;": "┤",
    "boxvr;": "├",
    "bprime;": "‵",
    "breve;": "˘",
    brvbar: "¦",
    "brvbar;": "¦",
    "bscr;": "\uD835\uDCB7",
    "bsemi;": "⁏",
    "bsim;": "∽",
    "bsime;": "⋍",
    "bsol;": "\\",
    "bsolb;": "⧅",
    "bsolhsub;": "⟈",
    "bull;": "•",
    "bullet;": "•",
    "bump;": "≎",
    "bumpE;": "⪮",
    "bumpe;": "≏",
    "bumpeq;": "≏",
    "cacute;": "ć",
    "cap;": "∩",
    "capand;": "⩄",
    "capbrcup;": "⩉",
    "capcap;": "⩋",
    "capcup;": "⩇",
    "capdot;": "⩀",
    "caps;": "∩︀",
    "caret;": "⁁",
    "caron;": "ˇ",
    "ccaps;": "⩍",
    "ccaron;": "č",
    ccedil: "ç",
    "ccedil;": "ç",
    "ccirc;": "ĉ",
    "ccups;": "⩌",
    "ccupssm;": "⩐",
    "cdot;": "ċ",
    cedil: "¸",
    "cedil;": "¸",
    "cemptyv;": "⦲",
    cent: "¢",
    "cent;": "¢",
    "centerdot;": "·",
    "cfr;": "\uD835\uDD20",
    "chcy;": "ч",
    "check;": "✓",
    "checkmark;": "✓",
    "chi;": "χ",
    "cir;": "○",
    "cirE;": "⧃",
    "circ;": "ˆ",
    "circeq;": "≗",
    "circlearrowleft;": "↺",
    "circlearrowright;": "↻",
    "circledR;": "®",
    "circledS;": "Ⓢ",
    "circledast;": "⊛",
    "circledcirc;": "⊚",
    "circleddash;": "⊝",
    "cire;": "≗",
    "cirfnint;": "⨐",
    "cirmid;": "⫯",
    "cirscir;": "⧂",
    "clubs;": "♣",
    "clubsuit;": "♣",
    "colon;": ":",
    "colone;": "≔",
    "coloneq;": "≔",
    "comma;": ",",
    "commat;": "@",
    "comp;": "∁",
    "compfn;": "∘",
    "complement;": "∁",
    "complexes;": "ℂ",
    "cong;": "≅",
    "congdot;": "⩭",
    "conint;": "∮",
    "copf;": "\uD835\uDD54",
    "coprod;": "∐",
    copy: "©",
    "copy;": "©",
    "copysr;": "℗",
    "crarr;": "↵",
    "cross;": "✗",
    "cscr;": "\uD835\uDCB8",
    "csub;": "⫏",
    "csube;": "⫑",
    "csup;": "⫐",
    "csupe;": "⫒",
    "ctdot;": "⋯",
    "cudarrl;": "⤸",
    "cudarrr;": "⤵",
    "cuepr;": "⋞",
    "cuesc;": "⋟",
    "cularr;": "↶",
    "cularrp;": "⤽",
    "cup;": "∪",
    "cupbrcap;": "⩈",
    "cupcap;": "⩆",
    "cupcup;": "⩊",
    "cupdot;": "⊍",
    "cupor;": "⩅",
    "cups;": "∪︀",
    "curarr;": "↷",
    "curarrm;": "⤼",
    "curlyeqprec;": "⋞",
    "curlyeqsucc;": "⋟",
    "curlyvee;": "⋎",
    "curlywedge;": "⋏",
    curren: "¤",
    "curren;": "¤",
    "curvearrowleft;": "↶",
    "curvearrowright;": "↷",
    "cuvee;": "⋎",
    "cuwed;": "⋏",
    "cwconint;": "∲",
    "cwint;": "∱",
    "cylcty;": "⌭",
    "dArr;": "⇓",
    "dHar;": "⥥",
    "dagger;": "†",
    "daleth;": "ℸ",
    "darr;": "↓",
    "dash;": "‐",
    "dashv;": "⊣",
    "dbkarow;": "⤏",
    "dblac;": "˝",
    "dcaron;": "ď",
    "dcy;": "д",
    "dd;": "ⅆ",
    "ddagger;": "‡",
    "ddarr;": "⇊",
    "ddotseq;": "⩷",
    deg: "°",
    "deg;": "°",
    "delta;": "δ",
    "demptyv;": "⦱",
    "dfisht;": "⥿",
    "dfr;": "\uD835\uDD21",
    "dharl;": "⇃",
    "dharr;": "⇂",
    "diam;": "⋄",
    "diamond;": "⋄",
    "diamondsuit;": "♦",
    "diams;": "♦",
    "die;": "¨",
    "digamma;": "ϝ",
    "disin;": "⋲",
    "div;": "÷",
    divide: "÷",
    "divide;": "÷",
    "divideontimes;": "⋇",
    "divonx;": "⋇",
    "djcy;": "ђ",
    "dlcorn;": "⌞",
    "dlcrop;": "⌍",
    "dollar;": "$",
    "dopf;": "\uD835\uDD55",
    "dot;": "˙",
    "doteq;": "≐",
    "doteqdot;": "≑",
    "dotminus;": "∸",
    "dotplus;": "∔",
    "dotsquare;": "⊡",
    "doublebarwedge;": "⌆",
    "downarrow;": "↓",
    "downdownarrows;": "⇊",
    "downharpoonleft;": "⇃",
    "downharpoonright;": "⇂",
    "drbkarow;": "⤐",
    "drcorn;": "⌟",
    "drcrop;": "⌌",
    "dscr;": "\uD835\uDCB9",
    "dscy;": "ѕ",
    "dsol;": "⧶",
    "dstrok;": "đ",
    "dtdot;": "⋱",
    "dtri;": "▿",
    "dtrif;": "▾",
    "duarr;": "⇵",
    "duhar;": "⥯",
    "dwangle;": "⦦",
    "dzcy;": "џ",
    "dzigrarr;": "⟿",
    "eDDot;": "⩷",
    "eDot;": "≑",
    eacute: "é",
    "eacute;": "é",
    "easter;": "⩮",
    "ecaron;": "ě",
    "ecir;": "≖",
    ecirc: "ê",
    "ecirc;": "ê",
    "ecolon;": "≕",
    "ecy;": "э",
    "edot;": "ė",
    "ee;": "ⅇ",
    "efDot;": "≒",
    "efr;": "\uD835\uDD22",
    "eg;": "⪚",
    egrave: "è",
    "egrave;": "è",
    "egs;": "⪖",
    "egsdot;": "⪘",
    "el;": "⪙",
    "elinters;": "⏧",
    "ell;": "ℓ",
    "els;": "⪕",
    "elsdot;": "⪗",
    "emacr;": "ē",
    "empty;": "∅",
    "emptyset;": "∅",
    "emptyv;": "∅",
    "emsp13;": " ",
    "emsp14;": " ",
    "emsp;": " ",
    "eng;": "ŋ",
    "ensp;": " ",
    "eogon;": "ę",
    "eopf;": "\uD835\uDD56",
    "epar;": "⋕",
    "eparsl;": "⧣",
    "eplus;": "⩱",
    "epsi;": "ε",
    "epsilon;": "ε",
    "epsiv;": "ϵ",
    "eqcirc;": "≖",
    "eqcolon;": "≕",
    "eqsim;": "≂",
    "eqslantgtr;": "⪖",
    "eqslantless;": "⪕",
    "equals;": "=",
    "equest;": "≟",
    "equiv;": "≡",
    "equivDD;": "⩸",
    "eqvparsl;": "⧥",
    "erDot;": "≓",
    "erarr;": "⥱",
    "escr;": "ℯ",
    "esdot;": "≐",
    "esim;": "≂",
    "eta;": "η",
    eth: "ð",
    "eth;": "ð",
    euml: "ë",
    "euml;": "ë",
    "euro;": "€",
    "excl;": "!",
    "exist;": "∃",
    "expectation;": "ℰ",
    "exponentiale;": "ⅇ",
    "fallingdotseq;": "≒",
    "fcy;": "ф",
    "female;": "♀",
    "ffilig;": "ﬃ",
    "fflig;": "ﬀ",
    "ffllig;": "ﬄ",
    "ffr;": "\uD835\uDD23",
    "filig;": "ﬁ",
    "fjlig;": "fj",
    "flat;": "♭",
    "fllig;": "ﬂ",
    "fltns;": "▱",
    "fnof;": "ƒ",
    "fopf;": "\uD835\uDD57",
    "forall;": "∀",
    "fork;": "⋔",
    "forkv;": "⫙",
    "fpartint;": "⨍",
    frac12: "½",
    "frac12;": "½",
    "frac13;": "⅓",
    frac14: "¼",
    "frac14;": "¼",
    "frac15;": "⅕",
    "frac16;": "⅙",
    "frac18;": "⅛",
    "frac23;": "⅔",
    "frac25;": "⅖",
    frac34: "¾",
    "frac34;": "¾",
    "frac35;": "⅗",
    "frac38;": "⅜",
    "frac45;": "⅘",
    "frac56;": "⅚",
    "frac58;": "⅝",
    "frac78;": "⅞",
    "frasl;": "⁄",
    "frown;": "⌢",
    "fscr;": "\uD835\uDCBB",
    "gE;": "≧",
    "gEl;": "⪌",
    "gacute;": "ǵ",
    "gamma;": "γ",
    "gammad;": "ϝ",
    "gap;": "⪆",
    "gbreve;": "ğ",
    "gcirc;": "ĝ",
    "gcy;": "г",
    "gdot;": "ġ",
    "ge;": "≥",
    "gel;": "⋛",
    "geq;": "≥",
    "geqq;": "≧",
    "geqslant;": "⩾",
    "ges;": "⩾",
    "gescc;": "⪩",
    "gesdot;": "⪀",
    "gesdoto;": "⪂",
    "gesdotol;": "⪄",
    "gesl;": "⋛︀",
    "gesles;": "⪔",
    "gfr;": "\uD835\uDD24",
    "gg;": "≫",
    "ggg;": "⋙",
    "gimel;": "ℷ",
    "gjcy;": "ѓ",
    "gl;": "≷",
    "glE;": "⪒",
    "gla;": "⪥",
    "glj;": "⪤",
    "gnE;": "≩",
    "gnap;": "⪊",
    "gnapprox;": "⪊",
    "gne;": "⪈",
    "gneq;": "⪈",
    "gneqq;": "≩",
    "gnsim;": "⋧",
    "gopf;": "\uD835\uDD58",
    "grave;": "`",
    "gscr;": "ℊ",
    "gsim;": "≳",
    "gsime;": "⪎",
    "gsiml;": "⪐",
    gt: ">",
    "gt;": ">",
    "gtcc;": "⪧",
    "gtcir;": "⩺",
    "gtdot;": "⋗",
    "gtlPar;": "⦕",
    "gtquest;": "⩼",
    "gtrapprox;": "⪆",
    "gtrarr;": "⥸",
    "gtrdot;": "⋗",
    "gtreqless;": "⋛",
    "gtreqqless;": "⪌",
    "gtrless;": "≷",
    "gtrsim;": "≳",
    "gvertneqq;": "≩︀",
    "gvnE;": "≩︀",
    "hArr;": "⇔",
    "hairsp;": " ",
    "half;": "½",
    "hamilt;": "ℋ",
    "hardcy;": "ъ",
    "harr;": "↔",
    "harrcir;": "⥈",
    "harrw;": "↭",
    "hbar;": "ℏ",
    "hcirc;": "ĥ",
    "hearts;": "♥",
    "heartsuit;": "♥",
    "hellip;": "…",
    "hercon;": "⊹",
    "hfr;": "\uD835\uDD25",
    "hksearow;": "⤥",
    "hkswarow;": "⤦",
    "hoarr;": "⇿",
    "homtht;": "∻",
    "hookleftarrow;": "↩",
    "hookrightarrow;": "↪",
    "hopf;": "\uD835\uDD59",
    "horbar;": "―",
    "hscr;": "\uD835\uDCBD",
    "hslash;": "ℏ",
    "hstrok;": "ħ",
    "hybull;": "⁃",
    "hyphen;": "‐",
    iacute: "í",
    "iacute;": "í",
    "ic;": "⁣",
    icirc: "î",
    "icirc;": "î",
    "icy;": "и",
    "iecy;": "е",
    iexcl: "¡",
    "iexcl;": "¡",
    "iff;": "⇔",
    "ifr;": "\uD835\uDD26",
    igrave: "ì",
    "igrave;": "ì",
    "ii;": "ⅈ",
    "iiiint;": "⨌",
    "iiint;": "∭",
    "iinfin;": "⧜",
    "iiota;": "℩",
    "ijlig;": "ĳ",
    "imacr;": "ī",
    "image;": "ℑ",
    "imagline;": "ℐ",
    "imagpart;": "ℑ",
    "imath;": "ı",
    "imof;": "⊷",
    "imped;": "Ƶ",
    "in;": "∈",
    "incare;": "℅",
    "infin;": "∞",
    "infintie;": "⧝",
    "inodot;": "ı",
    "int;": "∫",
    "intcal;": "⊺",
    "integers;": "ℤ",
    "intercal;": "⊺",
    "intlarhk;": "⨗",
    "intprod;": "⨼",
    "iocy;": "ё",
    "iogon;": "į",
    "iopf;": "\uD835\uDD5A",
    "iota;": "ι",
    "iprod;": "⨼",
    iquest: "¿",
    "iquest;": "¿",
    "iscr;": "\uD835\uDCBE",
    "isin;": "∈",
    "isinE;": "⋹",
    "isindot;": "⋵",
    "isins;": "⋴",
    "isinsv;": "⋳",
    "isinv;": "∈",
    "it;": "⁢",
    "itilde;": "ĩ",
    "iukcy;": "і",
    iuml: "ï",
    "iuml;": "ï",
    "jcirc;": "ĵ",
    "jcy;": "й",
    "jfr;": "\uD835\uDD27",
    "jmath;": "ȷ",
    "jopf;": "\uD835\uDD5B",
    "jscr;": "\uD835\uDCBF",
    "jsercy;": "ј",
    "jukcy;": "є",
    "kappa;": "κ",
    "kappav;": "ϰ",
    "kcedil;": "ķ",
    "kcy;": "к",
    "kfr;": "\uD835\uDD28",
    "kgreen;": "ĸ",
    "khcy;": "х",
    "kjcy;": "ќ",
    "kopf;": "\uD835\uDD5C",
    "kscr;": "\uD835\uDCC0",
    "lAarr;": "⇚",
    "lArr;": "⇐",
    "lAtail;": "⤛",
    "lBarr;": "⤎",
    "lE;": "≦",
    "lEg;": "⪋",
    "lHar;": "⥢",
    "lacute;": "ĺ",
    "laemptyv;": "⦴",
    "lagran;": "ℒ",
    "lambda;": "λ",
    "lang;": "⟨",
    "langd;": "⦑",
    "langle;": "⟨",
    "lap;": "⪅",
    laquo: "«",
    "laquo;": "«",
    "larr;": "←",
    "larrb;": "⇤",
    "larrbfs;": "⤟",
    "larrfs;": "⤝",
    "larrhk;": "↩",
    "larrlp;": "↫",
    "larrpl;": "⤹",
    "larrsim;": "⥳",
    "larrtl;": "↢",
    "lat;": "⪫",
    "latail;": "⤙",
    "late;": "⪭",
    "lates;": "⪭︀",
    "lbarr;": "⤌",
    "lbbrk;": "❲",
    "lbrace;": "{",
    "lbrack;": "[",
    "lbrke;": "⦋",
    "lbrksld;": "⦏",
    "lbrkslu;": "⦍",
    "lcaron;": "ľ",
    "lcedil;": "ļ",
    "lceil;": "⌈",
    "lcub;": "{",
    "lcy;": "л",
    "ldca;": "⤶",
    "ldquo;": "“",
    "ldquor;": "„",
    "ldrdhar;": "⥧",
    "ldrushar;": "⥋",
    "ldsh;": "↲",
    "le;": "≤",
    "leftarrow;": "←",
    "leftarrowtail;": "↢",
    "leftharpoondown;": "↽",
    "leftharpoonup;": "↼",
    "leftleftarrows;": "⇇",
    "leftrightarrow;": "↔",
    "leftrightarrows;": "⇆",
    "leftrightharpoons;": "⇋",
    "leftrightsquigarrow;": "↭",
    "leftthreetimes;": "⋋",
    "leg;": "⋚",
    "leq;": "≤",
    "leqq;": "≦",
    "leqslant;": "⩽",
    "les;": "⩽",
    "lescc;": "⪨",
    "lesdot;": "⩿",
    "lesdoto;": "⪁",
    "lesdotor;": "⪃",
    "lesg;": "⋚︀",
    "lesges;": "⪓",
    "lessapprox;": "⪅",
    "lessdot;": "⋖",
    "lesseqgtr;": "⋚",
    "lesseqqgtr;": "⪋",
    "lessgtr;": "≶",
    "lesssim;": "≲",
    "lfisht;": "⥼",
    "lfloor;": "⌊",
    "lfr;": "\uD835\uDD29",
    "lg;": "≶",
    "lgE;": "⪑",
    "lhard;": "↽",
    "lharu;": "↼",
    "lharul;": "⥪",
    "lhblk;": "▄",
    "ljcy;": "љ",
    "ll;": "≪",
    "llarr;": "⇇",
    "llcorner;": "⌞",
    "llhard;": "⥫",
    "lltri;": "◺",
    "lmidot;": "ŀ",
    "lmoust;": "⎰",
    "lmoustache;": "⎰",
    "lnE;": "≨",
    "lnap;": "⪉",
    "lnapprox;": "⪉",
    "lne;": "⪇",
    "lneq;": "⪇",
    "lneqq;": "≨",
    "lnsim;": "⋦",
    "loang;": "⟬",
    "loarr;": "⇽",
    "lobrk;": "⟦",
    "longleftarrow;": "⟵",
    "longleftrightarrow;": "⟷",
    "longmapsto;": "⟼",
    "longrightarrow;": "⟶",
    "looparrowleft;": "↫",
    "looparrowright;": "↬",
    "lopar;": "⦅",
    "lopf;": "\uD835\uDD5D",
    "loplus;": "⨭",
    "lotimes;": "⨴",
    "lowast;": "∗",
    "lowbar;": "_",
    "loz;": "◊",
    "lozenge;": "◊",
    "lozf;": "⧫",
    "lpar;": "(",
    "lparlt;": "⦓",
    "lrarr;": "⇆",
    "lrcorner;": "⌟",
    "lrhar;": "⇋",
    "lrhard;": "⥭",
    "lrm;": "‎",
    "lrtri;": "⊿",
    "lsaquo;": "‹",
    "lscr;": "\uD835\uDCC1",
    "lsh;": "↰",
    "lsim;": "≲",
    "lsime;": "⪍",
    "lsimg;": "⪏",
    "lsqb;": "[",
    "lsquo;": "‘",
    "lsquor;": "‚",
    "lstrok;": "ł",
    lt: "<",
    "lt;": "<",
    "ltcc;": "⪦",
    "ltcir;": "⩹",
    "ltdot;": "⋖",
    "lthree;": "⋋",
    "ltimes;": "⋉",
    "ltlarr;": "⥶",
    "ltquest;": "⩻",
    "ltrPar;": "⦖",
    "ltri;": "◃",
    "ltrie;": "⊴",
    "ltrif;": "◂",
    "lurdshar;": "⥊",
    "luruhar;": "⥦",
    "lvertneqq;": "≨︀",
    "lvnE;": "≨︀",
    "mDDot;": "∺",
    macr: "¯",
    "macr;": "¯",
    "male;": "♂",
    "malt;": "✠",
    "maltese;": "✠",
    "map;": "↦",
    "mapsto;": "↦",
    "mapstodown;": "↧",
    "mapstoleft;": "↤",
    "mapstoup;": "↥",
    "marker;": "▮",
    "mcomma;": "⨩",
    "mcy;": "м",
    "mdash;": "—",
    "measuredangle;": "∡",
    "mfr;": "\uD835\uDD2A",
    "mho;": "℧",
    micro: "µ",
    "micro;": "µ",
    "mid;": "∣",
    "midast;": "*",
    "midcir;": "⫰",
    middot: "·",
    "middot;": "·",
    "minus;": "−",
    "minusb;": "⊟",
    "minusd;": "∸",
    "minusdu;": "⨪",
    "mlcp;": "⫛",
    "mldr;": "…",
    "mnplus;": "∓",
    "models;": "⊧",
    "mopf;": "\uD835\uDD5E",
    "mp;": "∓",
    "mscr;": "\uD835\uDCC2",
    "mstpos;": "∾",
    "mu;": "μ",
    "multimap;": "⊸",
    "mumap;": "⊸",
    "nGg;": "⋙̸",
    "nGt;": "≫⃒",
    "nGtv;": "≫̸",
    "nLeftarrow;": "⇍",
    "nLeftrightarrow;": "⇎",
    "nLl;": "⋘̸",
    "nLt;": "≪⃒",
    "nLtv;": "≪̸",
    "nRightarrow;": "⇏",
    "nVDash;": "⊯",
    "nVdash;": "⊮",
    "nabla;": "∇",
    "nacute;": "ń",
    "nang;": "∠⃒",
    "nap;": "≉",
    "napE;": "⩰̸",
    "napid;": "≋̸",
    "napos;": "ŉ",
    "napprox;": "≉",
    "natur;": "♮",
    "natural;": "♮",
    "naturals;": "ℕ",
    nbsp: " ",
    "nbsp;": " ",
    "nbump;": "≎̸",
    "nbumpe;": "≏̸",
    "ncap;": "⩃",
    "ncaron;": "ň",
    "ncedil;": "ņ",
    "ncong;": "≇",
    "ncongdot;": "⩭̸",
    "ncup;": "⩂",
    "ncy;": "н",
    "ndash;": "–",
    "ne;": "≠",
    "neArr;": "⇗",
    "nearhk;": "⤤",
    "nearr;": "↗",
    "nearrow;": "↗",
    "nedot;": "≐̸",
    "nequiv;": "≢",
    "nesear;": "⤨",
    "nesim;": "≂̸",
    "nexist;": "∄",
    "nexists;": "∄",
    "nfr;": "\uD835\uDD2B",
    "ngE;": "≧̸",
    "nge;": "≱",
    "ngeq;": "≱",
    "ngeqq;": "≧̸",
    "ngeqslant;": "⩾̸",
    "nges;": "⩾̸",
    "ngsim;": "≵",
    "ngt;": "≯",
    "ngtr;": "≯",
    "nhArr;": "⇎",
    "nharr;": "↮",
    "nhpar;": "⫲",
    "ni;": "∋",
    "nis;": "⋼",
    "nisd;": "⋺",
    "niv;": "∋",
    "njcy;": "њ",
    "nlArr;": "⇍",
    "nlE;": "≦̸",
    "nlarr;": "↚",
    "nldr;": "‥",
    "nle;": "≰",
    "nleftarrow;": "↚",
    "nleftrightarrow;": "↮",
    "nleq;": "≰",
    "nleqq;": "≦̸",
    "nleqslant;": "⩽̸",
    "nles;": "⩽̸",
    "nless;": "≮",
    "nlsim;": "≴",
    "nlt;": "≮",
    "nltri;": "⋪",
    "nltrie;": "⋬",
    "nmid;": "∤",
    "nopf;": "\uD835\uDD5F",
    not: "¬",
    "not;": "¬",
    "notin;": "∉",
    "notinE;": "⋹̸",
    "notindot;": "⋵̸",
    "notinva;": "∉",
    "notinvb;": "⋷",
    "notinvc;": "⋶",
    "notni;": "∌",
    "notniva;": "∌",
    "notnivb;": "⋾",
    "notnivc;": "⋽",
    "npar;": "∦",
    "nparallel;": "∦",
    "nparsl;": "⫽⃥",
    "npart;": "∂̸",
    "npolint;": "⨔",
    "npr;": "⊀",
    "nprcue;": "⋠",
    "npre;": "⪯̸",
    "nprec;": "⊀",
    "npreceq;": "⪯̸",
    "nrArr;": "⇏",
    "nrarr;": "↛",
    "nrarrc;": "⤳̸",
    "nrarrw;": "↝̸",
    "nrightarrow;": "↛",
    "nrtri;": "⋫",
    "nrtrie;": "⋭",
    "nsc;": "⊁",
    "nsccue;": "⋡",
    "nsce;": "⪰̸",
    "nscr;": "\uD835\uDCC3",
    "nshortmid;": "∤",
    "nshortparallel;": "∦",
    "nsim;": "≁",
    "nsime;": "≄",
    "nsimeq;": "≄",
    "nsmid;": "∤",
    "nspar;": "∦",
    "nsqsube;": "⋢",
    "nsqsupe;": "⋣",
    "nsub;": "⊄",
    "nsubE;": "⫅̸",
    "nsube;": "⊈",
    "nsubset;": "⊂⃒",
    "nsubseteq;": "⊈",
    "nsubseteqq;": "⫅̸",
    "nsucc;": "⊁",
    "nsucceq;": "⪰̸",
    "nsup;": "⊅",
    "nsupE;": "⫆̸",
    "nsupe;": "⊉",
    "nsupset;": "⊃⃒",
    "nsupseteq;": "⊉",
    "nsupseteqq;": "⫆̸",
    "ntgl;": "≹",
    ntilde: "ñ",
    "ntilde;": "ñ",
    "ntlg;": "≸",
    "ntriangleleft;": "⋪",
    "ntrianglelefteq;": "⋬",
    "ntriangleright;": "⋫",
    "ntrianglerighteq;": "⋭",
    "nu;": "ν",
    "num;": "#",
    "numero;": "№",
    "numsp;": " ",
    "nvDash;": "⊭",
    "nvHarr;": "⤄",
    "nvap;": "≍⃒",
    "nvdash;": "⊬",
    "nvge;": "≥⃒",
    "nvgt;": ">⃒",
    "nvinfin;": "⧞",
    "nvlArr;": "⤂",
    "nvle;": "≤⃒",
    "nvlt;": "<⃒",
    "nvltrie;": "⊴⃒",
    "nvrArr;": "⤃",
    "nvrtrie;": "⊵⃒",
    "nvsim;": "∼⃒",
    "nwArr;": "⇖",
    "nwarhk;": "⤣",
    "nwarr;": "↖",
    "nwarrow;": "↖",
    "nwnear;": "⤧",
    "oS;": "Ⓢ",
    oacute: "ó",
    "oacute;": "ó",
    "oast;": "⊛",
    "ocir;": "⊚",
    ocirc: "ô",
    "ocirc;": "ô",
    "ocy;": "о",
    "odash;": "⊝",
    "odblac;": "ő",
    "odiv;": "⨸",
    "odot;": "⊙",
    "odsold;": "⦼",
    "oelig;": "œ",
    "ofcir;": "⦿",
    "ofr;": "\uD835\uDD2C",
    "ogon;": "˛",
    ograve: "ò",
    "ograve;": "ò",
    "ogt;": "⧁",
    "ohbar;": "⦵",
    "ohm;": "Ω",
    "oint;": "∮",
    "olarr;": "↺",
    "olcir;": "⦾",
    "olcross;": "⦻",
    "oline;": "‾",
    "olt;": "⧀",
    "omacr;": "ō",
    "omega;": "ω",
    "omicron;": "ο",
    "omid;": "⦶",
    "ominus;": "⊖",
    "oopf;": "\uD835\uDD60",
    "opar;": "⦷",
    "operp;": "⦹",
    "oplus;": "⊕",
    "or;": "∨",
    "orarr;": "↻",
    "ord;": "⩝",
    "order;": "ℴ",
    "orderof;": "ℴ",
    ordf: "ª",
    "ordf;": "ª",
    ordm: "º",
    "ordm;": "º",
    "origof;": "⊶",
    "oror;": "⩖",
    "orslope;": "⩗",
    "orv;": "⩛",
    "oscr;": "ℴ",
    oslash: "ø",
    "oslash;": "ø",
    "osol;": "⊘",
    otilde: "õ",
    "otilde;": "õ",
    "otimes;": "⊗",
    "otimesas;": "⨶",
    ouml: "ö",
    "ouml;": "ö",
    "ovbar;": "⌽",
    "par;": "∥",
    para: "¶",
    "para;": "¶",
    "parallel;": "∥",
    "parsim;": "⫳",
    "parsl;": "⫽",
    "part;": "∂",
    "pcy;": "п",
    "percnt;": "%",
    "period;": ".",
    "permil;": "‰",
    "perp;": "⊥",
    "pertenk;": "‱",
    "pfr;": "\uD835\uDD2D",
    "phi;": "φ",
    "phiv;": "ϕ",
    "phmmat;": "ℳ",
    "phone;": "☎",
    "pi;": "π",
    "pitchfork;": "⋔",
    "piv;": "ϖ",
    "planck;": "ℏ",
    "planckh;": "ℎ",
    "plankv;": "ℏ",
    "plus;": "+",
    "plusacir;": "⨣",
    "plusb;": "⊞",
    "pluscir;": "⨢",
    "plusdo;": "∔",
    "plusdu;": "⨥",
    "pluse;": "⩲",
    plusmn: "±",
    "plusmn;": "±",
    "plussim;": "⨦",
    "plustwo;": "⨧",
    "pm;": "±",
    "pointint;": "⨕",
    "popf;": "\uD835\uDD61",
    pound: "£",
    "pound;": "£",
    "pr;": "≺",
    "prE;": "⪳",
    "prap;": "⪷",
    "prcue;": "≼",
    "pre;": "⪯",
    "prec;": "≺",
    "precapprox;": "⪷",
    "preccurlyeq;": "≼",
    "preceq;": "⪯",
    "precnapprox;": "⪹",
    "precneqq;": "⪵",
    "precnsim;": "⋨",
    "precsim;": "≾",
    "prime;": "′",
    "primes;": "ℙ",
    "prnE;": "⪵",
    "prnap;": "⪹",
    "prnsim;": "⋨",
    "prod;": "∏",
    "profalar;": "⌮",
    "profline;": "⌒",
    "profsurf;": "⌓",
    "prop;": "∝",
    "propto;": "∝",
    "prsim;": "≾",
    "prurel;": "⊰",
    "pscr;": "\uD835\uDCC5",
    "psi;": "ψ",
    "puncsp;": " ",
    "qfr;": "\uD835\uDD2E",
    "qint;": "⨌",
    "qopf;": "\uD835\uDD62",
    "qprime;": "⁗",
    "qscr;": "\uD835\uDCC6",
    "quaternions;": "ℍ",
    "quatint;": "⨖",
    "quest;": "?",
    "questeq;": "≟",
    quot: '"',
    "quot;": '"',
    "rAarr;": "⇛",
    "rArr;": "⇒",
    "rAtail;": "⤜",
    "rBarr;": "⤏",
    "rHar;": "⥤",
    "race;": "∽̱",
    "racute;": "ŕ",
    "radic;": "√",
    "raemptyv;": "⦳",
    "rang;": "⟩",
    "rangd;": "⦒",
    "range;": "⦥",
    "rangle;": "⟩",
    raquo: "»",
    "raquo;": "»",
    "rarr;": "→",
    "rarrap;": "⥵",
    "rarrb;": "⇥",
    "rarrbfs;": "⤠",
    "rarrc;": "⤳",
    "rarrfs;": "⤞",
    "rarrhk;": "↪",
    "rarrlp;": "↬",
    "rarrpl;": "⥅",
    "rarrsim;": "⥴",
    "rarrtl;": "↣",
    "rarrw;": "↝",
    "ratail;": "⤚",
    "ratio;": "∶",
    "rationals;": "ℚ",
    "rbarr;": "⤍",
    "rbbrk;": "❳",
    "rbrace;": "}",
    "rbrack;": "]",
    "rbrke;": "⦌",
    "rbrksld;": "⦎",
    "rbrkslu;": "⦐",
    "rcaron;": "ř",
    "rcedil;": "ŗ",
    "rceil;": "⌉",
    "rcub;": "}",
    "rcy;": "р",
    "rdca;": "⤷",
    "rdldhar;": "⥩",
    "rdquo;": "”",
    "rdquor;": "”",
    "rdsh;": "↳",
    "real;": "ℜ",
    "realine;": "ℛ",
    "realpart;": "ℜ",
    "reals;": "ℝ",
    "rect;": "▭",
    reg: "®",
    "reg;": "®",
    "rfisht;": "⥽",
    "rfloor;": "⌋",
    "rfr;": "\uD835\uDD2F",
    "rhard;": "⇁",
    "rharu;": "⇀",
    "rharul;": "⥬",
    "rho;": "ρ",
    "rhov;": "ϱ",
    "rightarrow;": "→",
    "rightarrowtail;": "↣",
    "rightharpoondown;": "⇁",
    "rightharpoonup;": "⇀",
    "rightleftarrows;": "⇄",
    "rightleftharpoons;": "⇌",
    "rightrightarrows;": "⇉",
    "rightsquigarrow;": "↝",
    "rightthreetimes;": "⋌",
    "ring;": "˚",
    "risingdotseq;": "≓",
    "rlarr;": "⇄",
    "rlhar;": "⇌",
    "rlm;": "‏",
    "rmoust;": "⎱",
    "rmoustache;": "⎱",
    "rnmid;": "⫮",
    "roang;": "⟭",
    "roarr;": "⇾",
    "robrk;": "⟧",
    "ropar;": "⦆",
    "ropf;": "\uD835\uDD63",
    "roplus;": "⨮",
    "rotimes;": "⨵",
    "rpar;": ")",
    "rpargt;": "⦔",
    "rppolint;": "⨒",
    "rrarr;": "⇉",
    "rsaquo;": "›",
    "rscr;": "\uD835\uDCC7",
    "rsh;": "↱",
    "rsqb;": "]",
    "rsquo;": "’",
    "rsquor;": "’",
    "rthree;": "⋌",
    "rtimes;": "⋊",
    "rtri;": "▹",
    "rtrie;": "⊵",
    "rtrif;": "▸",
    "rtriltri;": "⧎",
    "ruluhar;": "⥨",
    "rx;": "℞",
    "sacute;": "ś",
    "sbquo;": "‚",
    "sc;": "≻",
    "scE;": "⪴",
    "scap;": "⪸",
    "scaron;": "š",
    "sccue;": "≽",
    "sce;": "⪰",
    "scedil;": "ş",
    "scirc;": "ŝ",
    "scnE;": "⪶",
    "scnap;": "⪺",
    "scnsim;": "⋩",
    "scpolint;": "⨓",
    "scsim;": "≿",
    "scy;": "с",
    "sdot;": "⋅",
    "sdotb;": "⊡",
    "sdote;": "⩦",
    "seArr;": "⇘",
    "searhk;": "⤥",
    "searr;": "↘",
    "searrow;": "↘",
    sect: "§",
    "sect;": "§",
    "semi;": ";",
    "seswar;": "⤩",
    "setminus;": "∖",
    "setmn;": "∖",
    "sext;": "✶",
    "sfr;": "\uD835\uDD30",
    "sfrown;": "⌢",
    "sharp;": "♯",
    "shchcy;": "щ",
    "shcy;": "ш",
    "shortmid;": "∣",
    "shortparallel;": "∥",
    shy: "­",
    "shy;": "­",
    "sigma;": "σ",
    "sigmaf;": "ς",
    "sigmav;": "ς",
    "sim;": "∼",
    "simdot;": "⩪",
    "sime;": "≃",
    "simeq;": "≃",
    "simg;": "⪞",
    "simgE;": "⪠",
    "siml;": "⪝",
    "simlE;": "⪟",
    "simne;": "≆",
    "simplus;": "⨤",
    "simrarr;": "⥲",
    "slarr;": "←",
    "smallsetminus;": "∖",
    "smashp;": "⨳",
    "smeparsl;": "⧤",
    "smid;": "∣",
    "smile;": "⌣",
    "smt;": "⪪",
    "smte;": "⪬",
    "smtes;": "⪬︀",
    "softcy;": "ь",
    "sol;": "/",
    "solb;": "⧄",
    "solbar;": "⌿",
    "sopf;": "\uD835\uDD64",
    "spades;": "♠",
    "spadesuit;": "♠",
    "spar;": "∥",
    "sqcap;": "⊓",
    "sqcaps;": "⊓︀",
    "sqcup;": "⊔",
    "sqcups;": "⊔︀",
    "sqsub;": "⊏",
    "sqsube;": "⊑",
    "sqsubset;": "⊏",
    "sqsubseteq;": "⊑",
    "sqsup;": "⊐",
    "sqsupe;": "⊒",
    "sqsupset;": "⊐",
    "sqsupseteq;": "⊒",
    "squ;": "□",
    "square;": "□",
    "squarf;": "▪",
    "squf;": "▪",
    "srarr;": "→",
    "sscr;": "\uD835\uDCC8",
    "ssetmn;": "∖",
    "ssmile;": "⌣",
    "sstarf;": "⋆",
    "star;": "☆",
    "starf;": "★",
    "straightepsilon;": "ϵ",
    "straightphi;": "ϕ",
    "strns;": "¯",
    "sub;": "⊂",
    "subE;": "⫅",
    "subdot;": "⪽",
    "sube;": "⊆",
    "subedot;": "⫃",
    "submult;": "⫁",
    "subnE;": "⫋",
    "subne;": "⊊",
    "subplus;": "⪿",
    "subrarr;": "⥹",
    "subset;": "⊂",
    "subseteq;": "⊆",
    "subseteqq;": "⫅",
    "subsetneq;": "⊊",
    "subsetneqq;": "⫋",
    "subsim;": "⫇",
    "subsub;": "⫕",
    "subsup;": "⫓",
    "succ;": "≻",
    "succapprox;": "⪸",
    "succcurlyeq;": "≽",
    "succeq;": "⪰",
    "succnapprox;": "⪺",
    "succneqq;": "⪶",
    "succnsim;": "⋩",
    "succsim;": "≿",
    "sum;": "∑",
    "sung;": "♪",
    sup1: "¹",
    "sup1;": "¹",
    sup2: "²",
    "sup2;": "²",
    sup3: "³",
    "sup3;": "³",
    "sup;": "⊃",
    "supE;": "⫆",
    "supdot;": "⪾",
    "supdsub;": "⫘",
    "supe;": "⊇",
    "supedot;": "⫄",
    "suphsol;": "⟉",
    "suphsub;": "⫗",
    "suplarr;": "⥻",
    "supmult;": "⫂",
    "supnE;": "⫌",
    "supne;": "⊋",
    "supplus;": "⫀",
    "supset;": "⊃",
    "supseteq;": "⊇",
    "supseteqq;": "⫆",
    "supsetneq;": "⊋",
    "supsetneqq;": "⫌",
    "supsim;": "⫈",
    "supsub;": "⫔",
    "supsup;": "⫖",
    "swArr;": "⇙",
    "swarhk;": "⤦",
    "swarr;": "↙",
    "swarrow;": "↙",
    "swnwar;": "⤪",
    szlig: "ß",
    "szlig;": "ß",
    "target;": "⌖",
    "tau;": "τ",
    "tbrk;": "⎴",
    "tcaron;": "ť",
    "tcedil;": "ţ",
    "tcy;": "т",
    "tdot;": "⃛",
    "telrec;": "⌕",
    "tfr;": "\uD835\uDD31",
    "there4;": "∴",
    "therefore;": "∴",
    "theta;": "θ",
    "thetasym;": "ϑ",
    "thetav;": "ϑ",
    "thickapprox;": "≈",
    "thicksim;": "∼",
    "thinsp;": " ",
    "thkap;": "≈",
    "thksim;": "∼",
    thorn: "þ",
    "thorn;": "þ",
    "tilde;": "˜",
    times: "×",
    "times;": "×",
    "timesb;": "⊠",
    "timesbar;": "⨱",
    "timesd;": "⨰",
    "tint;": "∭",
    "toea;": "⤨",
    "top;": "⊤",
    "topbot;": "⌶",
    "topcir;": "⫱",
    "topf;": "\uD835\uDD65",
    "topfork;": "⫚",
    "tosa;": "⤩",
    "tprime;": "‴",
    "trade;": "™",
    "triangle;": "▵",
    "triangledown;": "▿",
    "triangleleft;": "◃",
    "trianglelefteq;": "⊴",
    "triangleq;": "≜",
    "triangleright;": "▹",
    "trianglerighteq;": "⊵",
    "tridot;": "◬",
    "trie;": "≜",
    "triminus;": "⨺",
    "triplus;": "⨹",
    "trisb;": "⧍",
    "tritime;": "⨻",
    "trpezium;": "⏢",
    "tscr;": "\uD835\uDCC9",
    "tscy;": "ц",
    "tshcy;": "ћ",
    "tstrok;": "ŧ",
    "twixt;": "≬",
    "twoheadleftarrow;": "↞",
    "twoheadrightarrow;": "↠",
    "uArr;": "⇑",
    "uHar;": "⥣",
    uacute: "ú",
    "uacute;": "ú",
    "uarr;": "↑",
    "ubrcy;": "ў",
    "ubreve;": "ŭ",
    ucirc: "û",
    "ucirc;": "û",
    "ucy;": "у",
    "udarr;": "⇅",
    "udblac;": "ű",
    "udhar;": "⥮",
    "ufisht;": "⥾",
    "ufr;": "\uD835\uDD32",
    ugrave: "ù",
    "ugrave;": "ù",
    "uharl;": "↿",
    "uharr;": "↾",
    "uhblk;": "▀",
    "ulcorn;": "⌜",
    "ulcorner;": "⌜",
    "ulcrop;": "⌏",
    "ultri;": "◸",
    "umacr;": "ū",
    uml: "¨",
    "uml;": "¨",
    "uogon;": "ų",
    "uopf;": "\uD835\uDD66",
    "uparrow;": "↑",
    "updownarrow;": "↕",
    "upharpoonleft;": "↿",
    "upharpoonright;": "↾",
    "uplus;": "⊎",
    "upsi;": "υ",
    "upsih;": "ϒ",
    "upsilon;": "υ",
    "upuparrows;": "⇈",
    "urcorn;": "⌝",
    "urcorner;": "⌝",
    "urcrop;": "⌎",
    "uring;": "ů",
    "urtri;": "◹",
    "uscr;": "\uD835\uDCCA",
    "utdot;": "⋰",
    "utilde;": "ũ",
    "utri;": "▵",
    "utrif;": "▴",
    "uuarr;": "⇈",
    uuml: "ü",
    "uuml;": "ü",
    "uwangle;": "⦧",
    "vArr;": "⇕",
    "vBar;": "⫨",
    "vBarv;": "⫩",
    "vDash;": "⊨",
    "vangrt;": "⦜",
    "varepsilon;": "ϵ",
    "varkappa;": "ϰ",
    "varnothing;": "∅",
    "varphi;": "ϕ",
    "varpi;": "ϖ",
    "varpropto;": "∝",
    "varr;": "↕",
    "varrho;": "ϱ",
    "varsigma;": "ς",
    "varsubsetneq;": "⊊︀",
    "varsubsetneqq;": "⫋︀",
    "varsupsetneq;": "⊋︀",
    "varsupsetneqq;": "⫌︀",
    "vartheta;": "ϑ",
    "vartriangleleft;": "⊲",
    "vartriangleright;": "⊳",
    "vcy;": "в",
    "vdash;": "⊢",
    "vee;": "∨",
    "veebar;": "⊻",
    "veeeq;": "≚",
    "vellip;": "⋮",
    "verbar;": "|",
    "vert;": "|",
    "vfr;": "\uD835\uDD33",
    "vltri;": "⊲",
    "vnsub;": "⊂⃒",
    "vnsup;": "⊃⃒",
    "vopf;": "\uD835\uDD67",
    "vprop;": "∝",
    "vrtri;": "⊳",
    "vscr;": "\uD835\uDCCB",
    "vsubnE;": "⫋︀",
    "vsubne;": "⊊︀",
    "vsupnE;": "⫌︀",
    "vsupne;": "⊋︀",
    "vzigzag;": "⦚",
    "wcirc;": "ŵ",
    "wedbar;": "⩟",
    "wedge;": "∧",
    "wedgeq;": "≙",
    "weierp;": "℘",
    "wfr;": "\uD835\uDD34",
    "wopf;": "\uD835\uDD68",
    "wp;": "℘",
    "wr;": "≀",
    "wreath;": "≀",
    "wscr;": "\uD835\uDCCC",
    "xcap;": "⋂",
    "xcirc;": "◯",
    "xcup;": "⋃",
    "xdtri;": "▽",
    "xfr;": "\uD835\uDD35",
    "xhArr;": "⟺",
    "xharr;": "⟷",
    "xi;": "ξ",
    "xlArr;": "⟸",
    "xlarr;": "⟵",
    "xmap;": "⟼",
    "xnis;": "⋻",
    "xodot;": "⨀",
    "xopf;": "\uD835\uDD69",
    "xoplus;": "⨁",
    "xotime;": "⨂",
    "xrArr;": "⟹",
    "xrarr;": "⟶",
    "xscr;": "\uD835\uDCCD",
    "xsqcup;": "⨆",
    "xuplus;": "⨄",
    "xutri;": "△",
    "xvee;": "⋁",
    "xwedge;": "⋀",
    yacute: "ý",
    "yacute;": "ý",
    "yacy;": "я",
    "ycirc;": "ŷ",
    "ycy;": "ы",
    yen: "¥",
    "yen;": "¥",
    "yfr;": "\uD835\uDD36",
    "yicy;": "ї",
    "yopf;": "\uD835\uDD6A",
    "yscr;": "\uD835\uDCCE",
    "yucy;": "ю",
    yuml: "ÿ",
    "yuml;": "ÿ",
    "zacute;": "ź",
    "zcaron;": "ž",
    "zcy;": "з",
    "zdot;": "ż",
    "zeetrf;": "ℨ",
    "zeta;": "ζ",
    "zfr;": "\uD835\uDD37",
    "zhcy;": "ж",
    "zigrarr;": "⇝",
    "zopf;": "\uD835\uDD6B",
    "zscr;": "\uD835\uDCCF",
    "zwj;": "‍",
    "zwnj;": "‌"
  }));
});

// node_modules/teleproto/extensions/markdownv2.js
var require_markdownv2 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MarkdownV2Parser = undefined;
  var tl_1 = require_tl();
  var html_1 = require_html();
  var delimiters = {
    "*": "b",
    _: "i",
    __: "u",
    "~": "s",
    "||": "tg-spoiler"
  };
  function readUntil(source, start, end, escapes) {
    let value = "";
    for (let i = start;i < source.length; i++) {
      if (!escapes && source[i] === "`") {
        const marker = source.startsWith("```", i) ? "```" : "`";
        const code = readUntil(source, i + marker.length, marker, "\\`");
        if (code) {
          value += source.slice(i, code.end);
          i = code.end - 1;
          continue;
        }
      }
      if (source[i] === "\\" && i + 1 < source.length) {
        const next = source[i + 1];
        if (!escapes) {
          value += source.slice(i, i + 2);
          i++;
          continue;
        }
        if (escapes.includes(next)) {
          value += next;
          i++;
          continue;
        }
      }
      if (source.startsWith(end, i))
        return { value, end: i + end.length };
      value += source[i];
    }
    return;
  }
  function toHtml(source, links = true, quotes = true) {
    const parts = [];
    const opened = new Map;
    const escape = html_1.HTMLParser._escapeHtml;
    let i = 0;
    while (i < source.length) {
      const char = source[i];
      if (char === "\\" && source.charCodeAt(i + 1) >= 1 && source.charCodeAt(i + 1) <= 126) {
        parts.push(escape(source[i + 1]));
        i += 2;
        continue;
      }
      if (char === "\r") {
        i++;
        continue;
      }
      if (char === "`") {
        const marker2 = source.startsWith("```", i) ? "```" : "`";
        const code = readUntil(source, i + marker2.length, marker2, "\\`");
        if (code) {
          let body = code.value;
          let language = "";
          if (marker2 === "```") {
            const header = /^([\w.+-]*)\r?\n/.exec(body);
            if (header) {
              language = header[1];
              body = body.slice(header[0].length);
            }
          }
          parts.push(marker2 === "`" ? `<code>${escape(body)}</code>` : `<pre><code class="language-${escape(language)}">${escape(body)}</code></pre>`);
          i = code.end;
          continue;
        }
      }
      if (quotes && (i === 0 || source[i - 1] === `
`) && (char === ">" || source.startsWith("**>", i))) {
        const lines = [];
        let cursor = i + (char === ">" ? 0 : 2);
        while (source[cursor] === ">") {
          const newline = source.indexOf(`
`, cursor);
          const end = newline < 0 ? source.length : newline;
          lines.push(source.slice(cursor + 1, end));
          cursor = end;
          if (newline < 0 || source[newline + 1] !== ">")
            break;
          cursor++;
        }
        let body = lines.join(`
`);
        const suffix2 = /(\\*)\|\|$/.exec(body);
        let html = toHtml(body, links, false);
        const collapsed = !!suffix2 && suffix2[1].length % 2 === 0 && html.endsWith("||");
        if (collapsed)
          body = body.slice(0, -2);
        if (collapsed)
          html = toHtml(body, links, false);
        parts.push(`<blockquote${collapsed ? " expandable" : ""}>${html}</blockquote>`);
        i = cursor;
        continue;
      }
      const emoji = source.startsWith("![", i);
      if (links && (char === "[" || emoji)) {
        const label = readUntil(source, i + (emoji ? 2 : 1), "]");
        const url = label && source[label.end] === "(" ? readUntil(source, label.end + 1, ")", "\\)") : undefined;
        if (label && url) {
          const body = toHtml(label.value, false, false);
          const id = /^tg:\/\/emoji\?id=(\d+)$/.exec(url.value);
          if (emoji && id) {
            parts.push(`<tg-emoji emoji-id="${id[1]}">${body}</tg-emoji>`);
          } else {
            parts.push(`${emoji ? "!" : ""}<a href="${escape(url.value)}">${body}</a>`);
          }
          i = url.end;
          continue;
        }
      }
      const marker = source.startsWith("__", i) ? "__" : source.startsWith("||", i) ? "||" : char;
      if (source.startsWith("**", i) && source[i - 1] === "_" && source[i + 2] === "_") {
        i += 2;
        continue;
      }
      const tag = delimiters[marker];
      if (tag) {
        const at = opened.get(marker);
        if (at === undefined) {
          opened.set(marker, parts.length);
          parts.push(marker);
        } else {
          parts[at] = `<${tag}>`;
          parts.push(`</${tag}>`);
          opened.delete(marker);
        }
        i += marker.length;
        continue;
      }
      parts.push(escape(char));
      i++;
    }
    return parts.join("");
  }
  function escapeText(text) {
    return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
  }
  function escapeCode(text) {
    return text.replace(/[\\`]/g, "\\$&");
  }
  function escapeUrl(url) {
    return url.replace(/[\\)]/g, "\\$&");
  }
  function joinMarkup(left, right) {
    return left + (left.endsWith("_") && right.startsWith("_") ? "**" : "") + right;
  }
  function render(text, start, end, nodes) {
    let output = "";
    let cursor = start;
    for (const { entity, children } of nodes) {
      output = joinMarkup(output, escapeText(text.slice(cursor, entity.offset)));
      const raw = text.slice(entity.offset, entity.offset + entity.length);
      const body = render(text, entity.offset, entity.offset + entity.length, children);
      let value;
      const wrap = (marker) => joinMarkup(joinMarkup(marker, body), marker);
      switch (entity.className) {
        case "MessageEntityBold":
          value = wrap("*");
          break;
        case "MessageEntityItalic":
          value = wrap("_");
          break;
        case "MessageEntityUnderline":
          value = wrap("__");
          break;
        case "MessageEntityStrike":
          value = wrap("~");
          break;
        case "MessageEntitySpoiler":
          value = wrap("||");
          break;
        case "MessageEntityCode":
          value = "`" + escapeCode(raw) + "`";
          break;
        case "MessageEntityPre":
          value = "```" + (entity.language || "") + `
` + escapeCode(raw) + "```";
          break;
        case "MessageEntityBlockquote":
          value = "**>" + body.replace(/\n/g, `
>`) + (entity.collapsed ? "||" : "");
          break;
        case "MessageEntityTextUrl":
          value = `[${body}](${escapeUrl(entity.url)})`;
          break;
        case "MessageEntityUrl":
          value = `[${body}](${escapeUrl(raw)})`;
          break;
        case "MessageEntityEmail":
          value = `[${body}](${escapeUrl("mailto:" + raw)})`;
          break;
        case "MessageEntityMentionName":
          value = `[${body}](tg://user?id=${entity.userId})`;
          break;
        case "MessageEntityCustomEmoji":
          value = `![${body}](tg://emoji?id=${entity.documentId})`;
          break;
        default:
          value = body;
      }
      output = joinMarkup(output, value);
      cursor = entity.offset + entity.length;
    }
    return joinMarkup(output, escapeText(text.slice(cursor, end)));
  }

  class MarkdownV2Parser {
    static parse(message) {
      const [text, entities] = html_1.HTMLParser.parse(toHtml(message));
      return [text, entities.filter((entity) => entity.length > 0)];
    }
    static unparse(text, entities) {
      const roots = [];
      const stack = [];
      const sorted = [...entities ?? []].sort((a, b) => a.offset - b.offset || b.length - a.length || Number(b instanceof tl_1.Api.MessageEntityBlockquote) - Number(a instanceof tl_1.Api.MessageEntityBlockquote));
      for (const entity of sorted) {
        if (entity.length <= 0 || entity.offset < 0 || entity.offset + entity.length > text.length)
          continue;
        while (stack.length && entity.offset >= stack[stack.length - 1].entity.offset + stack[stack.length - 1].entity.length) {
          stack.pop();
        }
        const parent = stack[stack.length - 1];
        if (parent && entity.offset + entity.length > parent.entity.offset + parent.entity.length)
          continue;
        const node = { entity, children: [] };
        (parent ? parent.children : roots).push(node);
        stack.push(node);
      }
      return render(text, 0, text.length, roots);
    }
  }
  exports2.MarkdownV2Parser = MarkdownV2Parser;
});

// node_modules/teleproto/client/updates/context.js
var require_context = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.UpdateContext = undefined;
  var common_1 = require_common();
  var Utils_1 = require_Utils();
  var big_integer_1 = __importDefault(require_BigInteger());

  class UpdateContext extends common_1.EventCommon {
    constructor(client, peerId, entities) {
      super({ chatPeer: peerId === undefined ? undefined : (0, Utils_1.getPeer)((0, big_integer_1.default)(peerId)) });
      this._entities = entities ?? new Map;
      this._setClient(client);
    }
    get peers() {
      return this._entities;
    }
    async getChat() {
      if (!this.pendingChat) {
        this.pendingChat = super.getChat();
      }
      const pending = this.pendingChat;
      try {
        return await pending;
      } finally {
        if (this.pendingChat === pending)
          this.pendingChat = undefined;
      }
    }
  }
  exports2.UpdateContext = UpdateContext;
});

// node_modules/teleproto/client/updates/composer.js
var require_composer = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ClientUpdates = undefined;
  var events_1 = require("events");
  var tl_1 = require_tl();
  var common_1 = require_common();
  var Utils_1 = require_Utils();
  var Helpers_1 = require_Helpers();
  var network_1 = require_network();
  var context_1 = require_context();
  var dispatch_1 = require_dispatch();
  var fieldsOf = (update) => update ?? {};
  function nameOf(update) {
    const className = fieldsOf(update).className;
    if (!className) {
      return update instanceof network_1.UpdateConnectionState ? "connectionState" : undefined;
    }
    const bare = className.startsWith("Update") ? className.slice("Update".length) : className;
    return bare.charAt(0).toLowerCase() + bare.slice(1);
  }
  function expandShortMessage(update, selfId) {
    const short = update instanceof tl_1.Api.UpdateShortMessage || update instanceof tl_1.Api.UpdateShortChatMessage;
    if (!short)
      return;
    const peerId = update instanceof tl_1.Api.UpdateShortMessage ? new tl_1.Api.PeerUser({ userId: update.userId }) : new tl_1.Api.PeerChat({ chatId: update.chatId });
    const fromUser = update instanceof tl_1.Api.UpdateShortMessage ? update.userId : update.fromId;
    return new tl_1.Api.UpdateNewMessage({
      message: new tl_1.Api.Message({
        out: update.out,
        mentioned: update.mentioned,
        mediaUnread: update.mediaUnread,
        silent: update.silent,
        id: update.id,
        peerId,
        fromId: new tl_1.Api.PeerUser({
          userId: update.out && selfId ? selfId : fromUser
        }),
        message: update.message,
        date: update.date,
        fwdFrom: update.fwdFrom,
        viaBotId: update.viaBotId,
        replyTo: update.replyTo,
        entities: update.entities,
        ttlPeriod: update.ttlPeriod
      }),
      pts: update.pts,
      ptsCount: update.ptsCount
    });
  }
  function peerOf(update) {
    const fields = fieldsOf(update);
    if (fields.peer instanceof tl_1.Api.DialogPeerCommunity || fields.peer instanceof tl_1.Api.NotifyCommunity) {
      return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChannel({ channelId: fields.peer.communityId }));
    }
    const peer = fields.message?.peerId ?? (fields.peer instanceof tl_1.Api.DialogPeer || fields.peer instanceof tl_1.Api.NotifyPeer ? fields.peer.peer : undefined) ?? (fields.peer instanceof tl_1.Api.PeerUser || fields.peer instanceof tl_1.Api.PeerChat || fields.peer instanceof tl_1.Api.PeerChannel ? fields.peer : undefined);
    if (peer)
      return (0, Utils_1.getPeerId)(peer);
    if (fields.channelId) {
      return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChannel({ channelId: fields.channelId }));
    }
    if (fields.chatId) {
      return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChat({ chatId: fields.chatId }));
    }
    if (fields.userId) {
      return (0, Utils_1.getPeerId)(new tl_1.Api.PeerUser({ userId: fields.userId }));
    }
    return;
  }

  class ClientUpdates {
    constructor(client) {
      this.chain = [];
      this.independent = new Set;
      this.registrations = new Map;
      this.watches = new Set;
      this.client = client;
    }
    use(middleware) {
      if (this.client._destroyed)
        throw new Error("Cannot subscribe to a destroyed client");
      if (typeof middleware !== "function") {
        throw new TypeError("Update middleware must be a function");
      }
      this.chain.push(middleware);
      return () => this.remove(middleware);
    }
    on(target, handler, options = {}) {
      const run = compose(handler);
      if (typeof target !== "string" && !Array.isArray(target)) {
        return this.register(this.builderMiddleware(target, run, options), handler, options.independent);
      }
      const names = new Set((Array.isArray(target) ? target : [target]).map((name) => name.charAt(0).toLowerCase() + name.slice(1)));
      const matchesChat = this.chatMatcher(options);
      return this.register(async (update, next) => {
        const name = nameOf(update);
        if (!name || !names.has(name))
          return next();
        if (!await matchesChat(update))
          return next();
        if (options.func && !await options.func(update))
          return next();
        await run(update, next);
      }, handler, options.independent);
    }
    watch(chats, handler, options = {}) {
      if (this.client._destroyed)
        throw new Error("Cannot subscribe to a destroyed client");
      const wanted = (0, Helpers_1.isArrayLike)(chats) ? chats : [chats];
      let offHandler;
      if (handler) {
        const events = options.events ?? ["newMessage", "newChannelMessage"];
        offHandler = typeof events === "string" || Array.isArray(events) ? this.on(events, handler, {
          chats: wanted,
          func: options.func,
          independent: options.independent
        }) : this.on(events, handler, {
          chats: wanted,
          func: options.func,
          independent: options.independent
        });
      }
      const entry = {
        chats: wanted,
        channels: new Set,
        stopped: false,
        controller: watchController(),
        retryDelay: 1000
      };
      this.watches.add(entry);
      this.arm(entry);
      return () => {
        if (entry.stopped)
          return;
        entry.stopped = true;
        this.watches.delete(entry);
        offHandler?.();
        entry.controller.abort();
        if (entry.retryTimer)
          clearTimeout(entry.retryTimer);
        entry.channels.clear();
      };
    }
    async arm(entry) {
      if (entry.stopped || entry.arming || this.blockedAuthorization || !this.client.updateManager.isRunning)
        return;
      const controller = entry.controller;
      const active = () => !controller.signal.aborted && !entry.stopped;
      const task = (async () => {
        await this.client._connectedDeferred.promise;
        if (!active() || !this.client.updateManager.isRunning)
          return;
        let retry = false;
        const pending = [];
        const pendingChannels = new Set;
        const failed = async (error) => {
          if (!active())
            return;
          if (this._suspendAuthorization(error))
            return;
          const code = error.errorMessage;
          retry ||= !(error instanceof TypeError || error instanceof RangeError) && !["CHANNEL_PRIVATE", "CHANNEL_INVALID", "USERNAME_INVALID", "USERNAME_NOT_OCCUPIED", "PEER_ID_INVALID"].includes(code ?? "");
          await this.reportError(error, undefined);
        };
        for (const chat of entry.chats) {
          if (!active())
            return;
          try {
            const input = await this.client.getInputEntity(chat);
            if (!active())
              return;
            if (!(input instanceof tl_1.Api.InputPeerChannel))
              continue;
            const channelId = input.channelId.toString();
            if (entry.channels.has(channelId) || pendingChannels.has(channelId))
              continue;
            pendingChannels.add(channelId);
            const subscription = this.client.updateManager.watchChannel(channelId, new tl_1.Api.InputChannel({
              channelId: input.channelId,
              accessHash: input.accessHash
            }), controller.signal);
            pending.push(subscription.then(() => {
              if (active())
                entry.channels.add(channelId);
            }).catch(failed));
          } catch (error) {
            await failed(error);
          }
        }
        await Promise.all(pending);
        if (retry && active()) {
          entry.retryTimer = setTimeout(() => {
            entry.retryTimer = undefined;
            this.arm(entry);
          }, entry.retryDelay);
          entry.retryTimer.unref?.();
          entry.retryDelay = Math.min(entry.retryDelay * 2, 64000);
        } else {
          entry.retryDelay = 1000;
        }
      })();
      entry.arming = task;
      try {
        await task;
      } catch (error) {
        this.client._log.error(`Error arming channel watch: ${error}`);
      } finally {
        if (entry.arming === task)
          entry.arming = undefined;
      }
    }
    _pause() {
      for (const entry of this.watches) {
        entry.controller.abort();
        entry.controller = watchController();
        entry.channels.clear();
        entry.arming = undefined;
        if (entry.retryTimer)
          clearTimeout(entry.retryTimer);
        entry.retryTimer = undefined;
      }
    }
    _resume() {
      if (this.blockedAuthorization)
        return;
      const alive = new Set(this.client.updateManager.watchedChannelIds());
      for (const entry of this.watches) {
        if (entry.stopped)
          continue;
        for (const channelId of [...entry.channels]) {
          if (!alive.has(channelId))
            entry.channels.delete(channelId);
        }
        if (entry.retryTimer)
          clearTimeout(entry.retryTimer);
        entry.retryTimer = undefined;
        if (entry.channels.size < entry.chats.length)
          this.arm(entry);
      }
    }
    get authorizationError() {
      return this.blockedAuthorization;
    }
    _suspendAuthorization(error) {
      const code = error?.errorMessage;
      if (![
        "AUTH_KEY_UNREGISTERED",
        "AUTH_KEY_INVALID",
        "AUTH_KEY_DUPLICATED",
        "SESSION_REVOKED",
        "SESSION_EXPIRED",
        "USER_DEACTIVATED",
        "USER_DEACTIVATED_BAN"
      ].includes(code ?? ""))
        return false;
      if (!this.blockedAuthorization) {
        this.blockedAuthorization = error;
        this._pause();
        this.reportError(error);
      }
      return true;
    }
    _resumeAuthorization() {
      if (this.client._destroyed)
        return;
      this.blockedAuthorization = undefined;
      this._resume();
      this.client.updateManager.catchUp();
    }
    get watched() {
      return this.client.updateManager.watchedChannelIds();
    }
    get polling() {
      return this.client.updateManager.polling;
    }
    off(middleware) {
      this.remove(middleware);
      for (const [registered, handlers] of this.registrations) {
        if (handlers.includes(middleware))
          this.remove(registered);
      }
    }
    catch(handler) {
      this.onError = handler;
      return this;
    }
    get handlers() {
      return [...this.chain, ...this.independent];
    }
    _destroy() {
      for (const entry of this.watches) {
        entry.stopped = true;
        entry.controller.abort();
        if (entry.retryTimer)
          clearTimeout(entry.retryTimer);
        entry.channels.clear();
      }
      this.watches.clear();
      this.chain.length = 0;
      this.independent.clear();
      this.registrations.clear();
      this.onError = undefined;
      this.blockedAuthorization = undefined;
    }
    get state() {
      const state = this.client.updateManager.state;
      return state ? { ...state } : undefined;
    }
    async catchUp() {
      await this.client.updateManager.catchUp();
    }
    async dispatch(update, peers) {
      if (this.client._destroyed)
        throw new Error("Cannot dispatch through a destroyed client");
      if (peers)
        fieldsOf(update)._entities = new Map(peers);
      await (0, dispatch_1._dispatchUpdate)(this.client, { update });
    }
    async _dispatch(update) {
      if (update instanceof network_1.UpdateConnectionState && update.state === network_1.UpdateConnectionState.connected) {
        this._resume();
      }
      if (!this.chain.length && !this.independent.size)
        return;
      const expanded = expandShortMessage(update, this.client._selfInputPeer?.userId);
      if (expanded) {
        fieldsOf(expanded)._entities = fieldsOf(update)._entities;
        update = expanded;
      }
      const message = fieldsOf(update).message;
      if ((message instanceof tl_1.Api.Message || message instanceof tl_1.Api.MessageService) && message._client !== this.client) {
        message._finishInit(this.client, fieldsOf(update)._entities ?? new Map);
      }
      if (update && typeof update === "object" && !("state" in update)) {
        Object.defineProperty(update, "state", {
          value: {},
          enumerable: false,
          writable: true
        });
      }
      this.attachContext(update);
      const chain = [...this.chain];
      const branches = [...this.independent];
      const deliver = async (handlers) => {
        try {
          await runChain(handlers, update, async () => {});
        } catch (e) {
          await this.reportError(e, update);
        }
      };
      await Promise.all([deliver(chain), ...branches.map((handler) => deliver([handler]))]);
    }
    attachContext(event, update = event) {
      if ("context" in event)
        return;
      let context;
      Object.defineProperty(event, "context", {
        get: () => context ??= new context_1.UpdateContext(this.client, peerOf(update), fieldsOf(update)._entities),
        enumerable: false
      });
    }
    register(middleware, handler, independent = false) {
      if (this.client._destroyed)
        throw new Error("Cannot subscribe to a destroyed client");
      this.registrations.set(middleware, Array.isArray(handler) ? handler.slice() : [handler]);
      if (independent) {
        this.independent.add(middleware);
        return () => this.remove(middleware);
      }
      return this.use(middleware);
    }
    remove(middleware) {
      this.registrations.delete(middleware);
      this.independent.delete(middleware);
      const index = this.chain.indexOf(middleware);
      if (index >= 0)
        this.chain.splice(index, 1);
    }
    async reportError(error, update) {
      if (this.onError) {
        try {
          await this.onError(error, update);
          return;
        } catch (e) {
          error = e;
        }
      }
      if (this.client._errorHandler) {
        try {
          await this.client._errorHandler(error);
          return;
        } catch (handlerError) {
          error = handlerError;
        }
      }
      this.client._log.error(`Error in the update chain: ${error}`);
    }
    chatMatcher(options) {
      if (options.chats === undefined)
        return async () => true;
      let ids;
      const wanted = (0, Helpers_1.isArrayLike)(options.chats) ? options.chats : [options.chats];
      return async (update) => {
        if (!ids) {
          ids = new Set(await (0, common_1._intoIdSet)(this.client, wanted) ?? []);
        }
        const peer = peerOf(update);
        const listed = peer !== undefined && ids.has(peer);
        return options.blacklistChats ? !listed : listed;
      };
    }
    builderMiddleware(builder, run, options) {
      const matchesChat = this.chatMatcher(options);
      builder.client = this.client;
      return async (update, next) => {
        if (!builder.resolved)
          await builder.resolve(this.client);
        let event = builder.build(update, undefined, this.client._selfInputPeer ? this.client._selfInputPeer.userId : undefined);
        if (!event)
          return next();
        event._client = this.client;
        if ("_eventName" in event) {
          event.originalUpdate = update;
          event._entities = update._entities ?? new Map;
          event._setClient(this.client);
        }
        this.attachContext(event, update);
        if (!await builder.filter(event))
          return next();
        if (!await matchesChat(update))
          return next();
        if (options.func && !await options.func(update))
          return next();
        await run(event, next);
      };
    }
  }
  exports2.ClientUpdates = ClientUpdates;
  function compose(handler) {
    if (!Array.isArray(handler)) {
      if (typeof handler !== "function") {
        throw new TypeError("Update handler must be a function");
      }
      return handler;
    }
    const handlers = handler.slice();
    for (const item of handlers) {
      if (typeof item !== "function") {
        throw new TypeError("Update handler must be a function");
      }
    }
    return (update, next) => runChain(handlers, update, next);
  }
  async function runChain(handlers, update, next) {
    let last = -1;
    const run = async (index) => {
      if (index <= last)
        throw new Error("next() called multiple times");
      last = index;
      if (index >= handlers.length)
        return next();
      await handlers[index](update, () => run(index + 1));
    };
    await run(0);
  }
  function watchController() {
    const controller = new AbortController;
    (0, events_1.setMaxListeners)(0, controller.signal);
    return controller;
  }
});

// node_modules/teleproto/events/NewMessage.js
var require_NewMessage = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.NewMessageEvent = exports2.NewMessage = undefined;
  var common_1 = require_common();
  var tl_1 = require_tl();

  class NewMessage extends common_1.EventBuilder {
    constructor(newMessageParams = {}) {
      let { chats, func, incoming, outgoing, fromUsers, forwards, pattern, blacklistChats = false } = newMessageParams;
      if (incoming && outgoing) {
        incoming = outgoing = undefined;
      } else if (incoming != null && outgoing == undefined) {
        outgoing = !incoming;
      } else if (outgoing != null && incoming == undefined) {
        incoming = !outgoing;
      } else if (outgoing == false && incoming == false) {
        throw new Error("Don't create an event handler if you don't want neither incoming nor outgoing!");
      }
      super({ chats, blacklistChats, func });
      this.incoming = incoming;
      this.outgoing = outgoing;
      this.fromUsers = fromUsers;
      this.forwards = forwards;
      this.pattern = pattern;
      this._noCheck = [
        incoming,
        outgoing,
        chats,
        pattern,
        fromUsers,
        forwards,
        func
      ].every((v) => v == undefined);
    }
    async _resolve(client) {
      await super._resolve(client);
      this.fromUsers = await (0, common_1._intoIdSet)(client, this.fromUsers);
    }
    build(update, callback, selfId) {
      if (update instanceof tl_1.Api.UpdateNewMessage || update instanceof tl_1.Api.UpdateNewChannelMessage) {
        if (!(update.message instanceof tl_1.Api.Message)) {
          return;
        }
        const event = new NewMessageEvent(update.message, update);
        this.addAttributes(event);
        return event;
      } else if (update instanceof tl_1.Api.UpdateShortMessage) {
        return new NewMessageEvent(new tl_1.Api.Message({
          out: update.out,
          mentioned: update.mentioned,
          mediaUnread: update.mediaUnread,
          silent: update.silent,
          id: update.id,
          peerId: new tl_1.Api.PeerUser({ userId: update.userId }),
          fromId: new tl_1.Api.PeerUser({
            userId: update.out ? selfId : update.userId
          }),
          message: update.message,
          date: update.date,
          fwdFrom: update.fwdFrom,
          viaBotId: update.viaBotId,
          replyTo: update.replyTo,
          entities: update.entities,
          ttlPeriod: update.ttlPeriod
        }), update);
      } else if (update instanceof tl_1.Api.UpdateShortChatMessage) {
        return new NewMessageEvent(new tl_1.Api.Message({
          out: update.out,
          mentioned: update.mentioned,
          mediaUnread: update.mediaUnread,
          silent: update.silent,
          id: update.id,
          peerId: new tl_1.Api.PeerChat({ chatId: update.chatId }),
          fromId: new tl_1.Api.PeerUser({
            userId: update.out ? selfId : update.fromId
          }),
          message: update.message,
          date: update.date,
          fwdFrom: update.fwdFrom,
          viaBotId: update.viaBotId,
          replyTo: update.replyTo,
          entities: update.entities,
          ttlPeriod: update.ttlPeriod
        }), update);
      }
    }
    filter(event) {
      if (this._noCheck) {
        return event;
      }
      if (this.incoming && event.message.out) {
        return;
      }
      if (this.outgoing && !event.message.out) {
        return;
      }
      if (this.forwards != null) {
        if (this.forwards != !!event.message.fwdFrom) {
          return;
        }
      }
      if (this.fromUsers != null) {
        if (!event.message.senderId || !this.fromUsers.includes(event.message.senderId.toString())) {
          return;
        }
      }
      if (this.pattern) {
        const match = event.message.message?.match(this.pattern);
        if (!match) {
          return;
        }
        event.message.patternMatch = match;
      }
      return super.filter(event);
    }
    addAttributes(update) {}
  }
  exports2.NewMessage = NewMessage;

  class NewMessageEvent extends common_1.EventCommon {
    constructor(message, originalUpdate) {
      super({
        msgId: message.id,
        chatPeer: message.peerId,
        broadcast: message.post
      });
      this.originalUpdate = originalUpdate;
      this.message = message;
    }
    _setClient(client) {
      super._setClient(client);
      const m = this.message;
      try {
        m._finishInit(client, this.originalUpdate._entities || new Map, undefined);
      } catch (e) {
        client._log.error("Got error while trying to finish init message with id " + m.id, e);
        if (client._errorHandler) {
          client._errorHandler(e);
        }
      }
    }
    get patternMatch() {
      return this.message.patternMatch;
    }
    async reply(params) {
      if (!this._client)
        return;
      return this._client.sendMessage(this.message.peerId, {
        message: params.message,
        parseMode: params.parseMode,
        formattingEntities: params.formattingEntities,
        file: params.file,
        linkPreview: params.linkPreview,
        silent: params.silent,
        replyTo: this.message.id
      });
    }
    async respond(params) {
      if (!this._client)
        return;
      return this._client.sendMessage(this.message.peerId, {
        message: params.message,
        parseMode: params.parseMode,
        formattingEntities: params.formattingEntities,
        file: params.file,
        linkPreview: params.linkPreview,
        silent: params.silent
      });
    }
    async delete(params = {}) {
      if (!this._client)
        return;
      return this._client.deleteMessages(this.message.peerId, [this.message.id], params);
    }
    async forward(chat) {
      if (!this._client)
        return;
      return this._client.forwardMessages(chat, {
        messages: [this.message.id],
        fromPeer: this.message.peerId
      });
    }
    async edit(params) {
      if (!this._client)
        return;
      return this._client.editMessage(this.message.peerId, {
        message: this.message.id,
        text: params.message,
        parseMode: params.parseMode,
        formattingEntities: params.formattingEntities,
        file: params.file
      });
    }
    async markRead() {
      if (!this._client)
        return;
      return this._client.markAsRead(this.message.peerId, this.message.id);
    }
    async pin(params) {
      if (!this._client)
        return;
      return this._client.pinMessage(this.message.peerId, this.message.id, params);
    }
    async unpin() {
      if (!this._client)
        return;
      await this._client.unpinMessage(this.message.peerId, this.message.id);
    }
  }
  exports2.NewMessageEvent = NewMessageEvent;
});

// node_modules/teleproto/events/EditedMessage.js
var require_EditedMessage = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.EditedMessageEvent = exports2.EditedMessage = undefined;
  var tl_1 = require_tl();
  var NewMessage_1 = require_NewMessage();

  class EditedMessage extends NewMessage_1.NewMessage {
    constructor(editedMessageParams) {
      super(editedMessageParams);
    }
    build(update, callback, selfId) {
      if (update instanceof tl_1.Api.UpdateEditChannelMessage || update instanceof tl_1.Api.UpdateEditMessage) {
        if (!(update.message instanceof tl_1.Api.Message)) {
          return;
        }
        const event = new EditedMessageEvent(update.message, update);
        this.addAttributes(event);
        return event;
      }
    }
  }
  exports2.EditedMessage = EditedMessage;

  class EditedMessageEvent extends NewMessage_1.NewMessageEvent {
    constructor(message, originalUpdate) {
      super(message, originalUpdate);
    }
  }
  exports2.EditedMessageEvent = EditedMessageEvent;
});

// node_modules/teleproto/events/UserUpdate.js
var require_UserUpdate = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.UserUpdateEvent = exports2.UserUpdate = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();
  var big_integer_1 = __importDefault(require_BigInteger());

  class UserUpdate extends common_1.EventBuilder {
    constructor(params = {}) {
      super({
        chats: params.chats,
        blacklistChats: params.blacklistChats,
        func: params.func
      });
    }
    async _resolve(client) {
      this.chats = await (0, common_1._intoIdSet)(client, this.chats);
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateUserStatus) {
        return new UserUpdateEvent(update);
      }
      if (update instanceof tl_1.Api.UpdateUserTyping || update instanceof tl_1.Api.UpdateChatUserTyping || update instanceof tl_1.Api.UpdateChannelUserTyping) {
        return new UserUpdateEvent(update);
      }
      return;
    }
    filter(event) {
      if (this.chats != null) {
        const userId = event.userId?.toString();
        if (!userId || !this.chats.includes(userId)) {
          if (!this.blacklistChats) {
            return;
          }
        } else if (this.blacklistChats) {
          return;
        }
      }
      if (this.func && !this.func(event)) {
        return;
      }
      return event;
    }
  }
  exports2.UserUpdate = UserUpdate;

  class UserUpdateEvent extends common_1.EventCommonSender {
    constructor(update) {
      let chatPeer;
      let userId;
      if (update instanceof tl_1.Api.UpdateUserStatus) {
        userId = update.userId;
        chatPeer = new tl_1.Api.PeerUser({ userId: update.userId });
      } else if (update instanceof tl_1.Api.UpdateUserTyping) {
        userId = update.userId;
        chatPeer = new tl_1.Api.PeerUser({ userId: update.userId });
      } else if (update instanceof tl_1.Api.UpdateChatUserTyping) {
        userId = update.fromId instanceof tl_1.Api.PeerUser ? update.fromId.userId : big_integer_1.default.zero;
        chatPeer = new tl_1.Api.PeerChat({ chatId: update.chatId });
      } else {
        userId = update.fromId instanceof tl_1.Api.PeerUser ? update.fromId.userId : big_integer_1.default.zero;
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
      }
      super({ chatPeer });
      this._eventName = "UserUpdate";
      this.originalUpdate = update;
      this._userId = userId;
      if (update instanceof tl_1.Api.UpdateUserStatus) {
        this._status = update.status;
      } else {
        this._action = update.action;
        if (update instanceof tl_1.Api.UpdateChatUserTyping) {
          this._chatId = update.chatId;
        } else if (update instanceof tl_1.Api.UpdateChannelUserTyping) {
          this._chatId = update.channelId;
        }
      }
    }
    get userId() {
      return this._userId;
    }
    get status() {
      return this._status;
    }
    get action() {
      return this._action;
    }
    get online() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusOnline;
    }
    get offline() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusOffline;
    }
    get until() {
      if (this._status instanceof tl_1.Api.UserStatusOnline) {
        return new Date(this._status.expires * 1000);
      }
      return;
    }
    get lastSeen() {
      if (this._status instanceof tl_1.Api.UserStatusOffline) {
        return new Date(this._status.wasOnline * 1000);
      }
      return;
    }
    get recently() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusRecently;
    }
    get withinWeeks() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusLastWeek;
    }
    get withinMonths() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusLastMonth;
    }
    get typing() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageTypingAction;
    }
    get cancel() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageCancelAction;
    }
    get recording() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageRecordVideoAction || this._action instanceof tl_1.Api.SendMessageRecordAudioAction || this._action instanceof tl_1.Api.SendMessageRecordRoundAction;
    }
    get uploading() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageUploadVideoAction || this._action instanceof tl_1.Api.SendMessageUploadAudioAction || this._action instanceof tl_1.Api.SendMessageUploadPhotoAction || this._action instanceof tl_1.Api.SendMessageUploadDocumentAction || this._action instanceof tl_1.Api.SendMessageUploadRoundAction;
    }
    get audio() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageRecordAudioAction || this._action instanceof tl_1.Api.SendMessageUploadAudioAction;
    }
    get video() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageRecordVideoAction || this._action instanceof tl_1.Api.SendMessageUploadVideoAction;
    }
    get round() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageRecordRoundAction || this._action instanceof tl_1.Api.SendMessageUploadRoundAction;
    }
    get photo() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageUploadPhotoAction;
    }
    get document() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageUploadDocumentAction;
    }
    get geo() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageGeoLocationAction;
    }
    get contact() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageChooseContactAction;
    }
    get playing() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageGamePlayAction;
    }
    get sticker() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageChooseStickerAction;
    }
    get uploadProgress() {
      if (this._action instanceof tl_1.Api.SendMessageUploadVideoAction || this._action instanceof tl_1.Api.SendMessageUploadAudioAction || this._action instanceof tl_1.Api.SendMessageUploadPhotoAction || this._action instanceof tl_1.Api.SendMessageUploadDocumentAction || this._action instanceof tl_1.Api.SendMessageUploadRoundAction) {
        return this._action.progress;
      }
      return;
    }
    async getUser() {
      if (!this._client)
        return;
      try {
        const result = await this._client.getEntity(new tl_1.Api.PeerUser({ userId: this._userId }));
        if (result instanceof tl_1.Api.User) {
          return result;
        }
      } catch {
        return;
      }
      return;
    }
    async getInputUser() {
      if (!this._client)
        return;
      try {
        return await this._client.getInputEntity(new tl_1.Api.PeerUser({ userId: this._userId }));
      } catch {
        return;
      }
    }
  }
  exports2.UserUpdateEvent = UserUpdateEvent;
});

// node_modules/teleproto/events/MessageRead.js
var require_MessageRead = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MessageReadEvent = exports2.MessageRead = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();

  class MessageRead extends common_1.EventBuilder {
    constructor(params = {}) {
      super({
        chats: params.chats,
        blacklistChats: params.blacklistChats,
        func: params.func
      });
      this._inbox = params.inbox;
    }
    async _resolve(client) {
      await super._resolve(client);
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateReadHistoryInbox || update instanceof tl_1.Api.UpdateReadHistoryOutbox || update instanceof tl_1.Api.UpdateReadChannelInbox || update instanceof tl_1.Api.UpdateReadChannelOutbox || update instanceof tl_1.Api.UpdateReadMessagesContents || update instanceof tl_1.Api.UpdateChannelReadMessagesContents) {
        return new MessageReadEvent(update);
      }
      return;
    }
    filter(event) {
      if (this._inbox !== undefined) {
        if (this._inbox !== event.inbox) {
          return;
        }
      }
      if (this.chats !== undefined && event.chatId) {
        const chatIdStr = event.chatId.toString();
        const inside = this.chats.includes(chatIdStr);
        if (inside === this.blacklistChats) {
          return;
        }
      }
      if (this.func && !this.func(event)) {
        return;
      }
      return event;
    }
  }
  exports2.MessageRead = MessageRead;

  class MessageReadEvent extends common_1.EventCommon {
    constructor(update) {
      let chatPeer;
      let isOutbox = false;
      let isContents = false;
      let maxId = 0;
      let messageIds = [];
      if (update instanceof tl_1.Api.UpdateReadHistoryInbox) {
        chatPeer = update.peer;
        isOutbox = false;
        maxId = update.maxId;
      } else if (update instanceof tl_1.Api.UpdateReadHistoryOutbox) {
        chatPeer = update.peer;
        isOutbox = true;
        maxId = update.maxId;
      } else if (update instanceof tl_1.Api.UpdateReadChannelInbox) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
        isOutbox = false;
        maxId = update.maxId;
      } else if (update instanceof tl_1.Api.UpdateReadChannelOutbox) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
        isOutbox = true;
        maxId = update.maxId;
      } else if (update instanceof tl_1.Api.UpdateReadMessagesContents) {
        isContents = true;
        messageIds = update.messages;
        maxId = messageIds.length > 0 ? Math.max(...messageIds) : 0;
      } else if (update instanceof tl_1.Api.UpdateChannelReadMessagesContents) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
        isContents = true;
        messageIds = update.messages;
        maxId = messageIds.length > 0 ? Math.max(...messageIds) : 0;
      }
      super({ chatPeer });
      this._eventName = "MessageRead";
      this.originalUpdate = update;
      this._outbox = isOutbox;
      this._contents = isContents;
      this._maxId = maxId;
      this._messageIds = messageIds;
    }
    get maxId() {
      return this._maxId;
    }
    get outbox() {
      return this._outbox;
    }
    get inbox() {
      return !this._outbox;
    }
    get contents() {
      return this._contents;
    }
    get messageIds() {
      return this._messageIds;
    }
    get isRead() {
      return this._maxId > 0 || this._messageIds.length > 0;
    }
    async getMessages() {
      if (!this._client || this._messageIds.length === 0) {
        return;
      }
      if (!this.chatId) {
        return;
      }
      try {
        return await this._client.getMessages(this.chatId, {
          ids: this._messageIds
        });
      } catch {
        return;
      }
    }
  }
  exports2.MessageReadEvent = MessageReadEvent;
});

// node_modules/teleproto/events/DeletedMessage.js
var require_DeletedMessage = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.DeletedMessageEvent = exports2.DeletedMessage = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();

  class DeletedMessage extends common_1.EventBuilder {
    constructor(eventParams = {}) {
      super(eventParams);
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateDeleteChannelMessages) {
        return new DeletedMessageEvent(update.messages, update, new tl_1.Api.PeerChannel({ channelId: update.channelId }));
      } else if (update instanceof tl_1.Api.UpdateDeleteMessages) {
        return new DeletedMessageEvent(update.messages, update);
      }
      return;
    }
  }
  exports2.DeletedMessage = DeletedMessage;

  class DeletedMessageEvent extends common_1.EventCommon {
    constructor(deletedIds, originalUpdate, peer) {
      super({
        chatPeer: peer,
        msgId: Array.isArray(deletedIds) && deletedIds.length > 0 ? deletedIds[0] : undefined
      });
      this.originalUpdate = originalUpdate;
      this.deletedIds = deletedIds;
      this.peer = peer;
    }
    get deletedId() {
      return this.deletedIds.length > 0 ? this.deletedIds[0] : undefined;
    }
    get isChannel() {
      return this.originalUpdate instanceof tl_1.Api.UpdateDeleteChannelMessages;
    }
  }
  exports2.DeletedMessageEvent = DeletedMessageEvent;
});

// node_modules/teleproto/events/ChatAction.js
var require_ChatAction = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ChatActionEvent = exports2.ChatAction = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();

  class ChatAction extends common_1.EventBuilder {
    constructor(params = {}) {
      super({
        chats: params.chats,
        blacklistChats: params.blacklistChats,
        func: params.func
      });
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateChatParticipantAdd || update instanceof tl_1.Api.UpdateChatParticipantDelete || update instanceof tl_1.Api.UpdateChatParticipant || update instanceof tl_1.Api.UpdateChannelParticipant) {
        return new ChatActionEvent(update);
      }
      if (update instanceof tl_1.Api.UpdatePinnedMessages || update instanceof tl_1.Api.UpdatePinnedChannelMessages) {
        return new ChatActionEvent(update);
      }
      if (update instanceof tl_1.Api.UpdateNewMessage || update instanceof tl_1.Api.UpdateNewChannelMessage) {
        const msg = update.message;
        if (msg instanceof tl_1.Api.MessageService && msg.action) {
          if (msg.action instanceof tl_1.Api.MessageActionChatCreate || msg.action instanceof tl_1.Api.MessageActionChannelCreate || msg.action instanceof tl_1.Api.MessageActionChatEditTitle || msg.action instanceof tl_1.Api.MessageActionChatEditPhoto || msg.action instanceof tl_1.Api.MessageActionChatDeletePhoto || msg.action instanceof tl_1.Api.MessageActionChatAddUser || msg.action instanceof tl_1.Api.MessageActionChatDeleteUser || msg.action instanceof tl_1.Api.MessageActionChatJoinedByLink || msg.action instanceof tl_1.Api.MessageActionPinMessage || msg.action instanceof tl_1.Api.MessageActionChatJoinedByRequest) {
            return new ChatActionEvent(update, msg);
          }
        }
      }
      return;
    }
  }
  exports2.ChatAction = ChatAction;

  class ChatActionEvent extends common_1.EventCommon {
    constructor(update, actionMessage) {
      let chatPeer;
      if (update instanceof tl_1.Api.UpdateChatParticipantAdd) {
        chatPeer = new tl_1.Api.PeerChat({ chatId: update.chatId });
      } else if (update instanceof tl_1.Api.UpdateChatParticipantDelete) {
        chatPeer = new tl_1.Api.PeerChat({ chatId: update.chatId });
      } else if (update instanceof tl_1.Api.UpdateChatParticipant) {
        chatPeer = new tl_1.Api.PeerChat({ chatId: update.chatId });
      } else if (update instanceof tl_1.Api.UpdateChannelParticipant) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
      } else if (update instanceof tl_1.Api.UpdatePinnedMessages) {
        chatPeer = update.peer;
      } else if (update instanceof tl_1.Api.UpdatePinnedChannelMessages) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
      } else if (actionMessage) {
        chatPeer = actionMessage.peerId;
      }
      super({ chatPeer });
      this._eventName = "ChatAction";
      this.originalUpdate = update;
      this._actionMessage = actionMessage;
      this._userIds = [];
      this._pinnedIds = [];
      this._pinned = false;
      this._created = false;
      this._parseUpdate(update, actionMessage);
    }
    _parseUpdate(update, actionMessage) {
      if (update instanceof tl_1.Api.UpdateChatParticipantAdd) {
        this._userIds = [update.userId];
        this._addedBy = update.inviterId;
      } else if (update instanceof tl_1.Api.UpdateChatParticipantDelete) {
        this._userIds = [update.userId];
      } else if (update instanceof tl_1.Api.UpdateChatParticipant) {
        this._userIds = [update.userId];
        if (update.newParticipant && !update.prevParticipant) {
          this._addedBy = update.actorId;
        } else if (!update.newParticipant && update.prevParticipant) {
          this._kickedBy = update.actorId;
        }
      } else if (update instanceof tl_1.Api.UpdateChannelParticipant) {
        this._userIds = [update.userId];
        if (update.newParticipant && !update.prevParticipant) {
          this._addedBy = update.actorId;
        } else if (!update.newParticipant && update.prevParticipant) {
          this._kickedBy = update.actorId;
        }
      }
      if (update instanceof tl_1.Api.UpdatePinnedMessages) {
        this._pinnedIds = update.messages;
        this._pinned = update.pinned ?? true;
      } else if (update instanceof tl_1.Api.UpdatePinnedChannelMessages) {
        this._pinnedIds = update.messages;
        this._pinned = update.pinned ?? true;
      }
      if (actionMessage?.action) {
        const action = actionMessage.action;
        if (action instanceof tl_1.Api.MessageActionChatCreate) {
          this._created = true;
          this._newTitle = action.title;
          this._userIds = action.users;
        } else if (action instanceof tl_1.Api.MessageActionChannelCreate) {
          this._created = true;
          this._newTitle = action.title;
        } else if (action instanceof tl_1.Api.MessageActionChatEditTitle) {
          this._newTitle = action.title;
        } else if (action instanceof tl_1.Api.MessageActionChatEditPhoto) {
          this._newPhoto = action.photo;
        } else if (action instanceof tl_1.Api.MessageActionChatAddUser) {
          this._userIds = action.users;
          if (actionMessage.fromId instanceof tl_1.Api.PeerUser) {
            this._addedBy = actionMessage.fromId.userId;
          }
        } else if (action instanceof tl_1.Api.MessageActionChatDeleteUser) {
          this._userIds = [action.userId];
          if (actionMessage.fromId instanceof tl_1.Api.PeerUser) {
            if (!action.userId.eq(actionMessage.fromId.userId)) {
              this._kickedBy = actionMessage.fromId.userId;
            }
          }
        } else if (action instanceof tl_1.Api.MessageActionChatJoinedByLink) {
          if (actionMessage.fromId instanceof tl_1.Api.PeerUser) {
            this._userIds = [actionMessage.fromId.userId];
          }
          this._addedBy = action.inviterId;
        } else if (action instanceof tl_1.Api.MessageActionChatJoinedByRequest) {
          if (actionMessage.fromId instanceof tl_1.Api.PeerUser) {
            this._userIds = [actionMessage.fromId.userId];
          }
        } else if (action instanceof tl_1.Api.MessageActionPinMessage) {
          if (actionMessage.replyTo instanceof tl_1.Api.MessageReplyHeader && actionMessage.replyTo.replyToMsgId !== undefined) {
            this._pinnedIds = [actionMessage.replyTo.replyToMsgId];
          }
          this._pinned = true;
        }
      }
    }
    get actionMessage() {
      return this._actionMessage;
    }
    get userJoined() {
      const action = this._actionMessage?.action;
      return action instanceof tl_1.Api.MessageActionChatJoinedByLink || action instanceof tl_1.Api.MessageActionChatJoinedByRequest || this.originalUpdate instanceof tl_1.Api.UpdateChatParticipant && !!this.originalUpdate.newParticipant && !this.originalUpdate.prevParticipant || this.originalUpdate instanceof tl_1.Api.UpdateChannelParticipant && !!this.originalUpdate.newParticipant && !this.originalUpdate.prevParticipant;
    }
    get userAdded() {
      return this._actionMessage?.action instanceof tl_1.Api.MessageActionChatAddUser || this.originalUpdate instanceof tl_1.Api.UpdateChatParticipantAdd;
    }
    get userLeft() {
      const action = this._actionMessage?.action;
      if (action instanceof tl_1.Api.MessageActionChatDeleteUser) {
        if (this._actionMessage?.fromId instanceof tl_1.Api.PeerUser) {
          return action.userId.eq(this._actionMessage.fromId.userId);
        }
      }
      if (this.originalUpdate instanceof tl_1.Api.UpdateChatParticipant || this.originalUpdate instanceof tl_1.Api.UpdateChannelParticipant) {
        return !this.originalUpdate.newParticipant && !!this.originalUpdate.prevParticipant && this.originalUpdate.userId.eq(this.originalUpdate.actorId);
      }
      return false;
    }
    get userKicked() {
      const action = this._actionMessage?.action;
      if (action instanceof tl_1.Api.MessageActionChatDeleteUser) {
        if (this._actionMessage?.fromId instanceof tl_1.Api.PeerUser) {
          return !action.userId.eq(this._actionMessage.fromId.userId);
        }
      }
      if (this.originalUpdate instanceof tl_1.Api.UpdateChatParticipant || this.originalUpdate instanceof tl_1.Api.UpdateChannelParticipant) {
        return !this.originalUpdate.newParticipant && !!this.originalUpdate.prevParticipant && !this.originalUpdate.userId.eq(this.originalUpdate.actorId);
      }
      return this.originalUpdate instanceof tl_1.Api.UpdateChatParticipantDelete;
    }
    get userIds() {
      return this._userIds;
    }
    get userId() {
      return this._userIds.length > 0 ? this._userIds[0] : undefined;
    }
    get addedBy() {
      return this._addedBy;
    }
    get kickedBy() {
      return this._kickedBy;
    }
    get created() {
      return this._created;
    }
    get newTitle() {
      return this._newTitle;
    }
    get newPhoto() {
      return this._newPhoto !== undefined || this._actionMessage?.action instanceof tl_1.Api.MessageActionChatEditPhoto;
    }
    get photoDeleted() {
      return this._actionMessage?.action instanceof tl_1.Api.MessageActionChatDeletePhoto;
    }
    get photo() {
      return this._newPhoto;
    }
    get newPin() {
      return this._pinned && this._pinnedIds.length > 0;
    }
    get unpin() {
      return !this._pinned && this._pinnedIds.length > 0;
    }
    get pinnedMessageIds() {
      return this._pinnedIds;
    }
    get pinnedMessageId() {
      return this._pinnedIds.length > 0 ? this._pinnedIds[0] : undefined;
    }
    async getPinnedMessages() {
      if (!this._client || this._pinnedIds.length === 0 || !this.chatId) {
        return;
      }
      try {
        return await this._client.getMessages(this.chatId, {
          ids: this._pinnedIds
        });
      } catch {
        return;
      }
    }
    async getPinnedMessage() {
      const messages = await this.getPinnedMessages();
      return messages && messages.length > 0 ? messages[0] : undefined;
    }
    async getUsers() {
      if (!this._client || this._userIds.length === 0) {
        return;
      }
      try {
        const users = [];
        for (const userId of this._userIds) {
          const entity = await this._client.getEntity(new tl_1.Api.PeerUser({ userId }));
          if (entity instanceof tl_1.Api.User) {
            users.push(entity);
          }
        }
        return users.length > 0 ? users : undefined;
      } catch {
        return;
      }
    }
    async getUser() {
      const users = await this.getUsers();
      return users && users.length > 0 ? users[0] : undefined;
    }
    async respond(params) {
      if (!this._client || !this.chatId)
        return;
      return this._client.sendMessage(this.chatId, params);
    }
  }
  exports2.ChatActionEvent = ChatActionEvent;
});

// node_modules/teleproto/events/InlineQuery.js
var require_InlineQuery = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.InlineQueryEvent = exports2.InlineBuilder = exports2.InlineQuery = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();

  class InlineQuery extends common_1.EventBuilder {
    constructor(params = {}) {
      super({
        chats: params.users,
        blacklistChats: params.blacklistUsers,
        func: params.func
      });
      this._blacklistUsers = params.blacklistUsers ?? false;
      if (params.pattern) {
        this._pattern = typeof params.pattern === "string" ? new RegExp(params.pattern) : params.pattern;
      }
    }
    async _resolve(client) {
      await super._resolve(client);
      this._users = this.chats;
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateBotInlineQuery) {
        return new InlineQueryEvent(update);
      }
      if (update instanceof tl_1.Api.UpdateBotInlineSend) {
        return new InlineQueryEvent(update);
      }
      return;
    }
    filter(event) {
      if (this._users !== undefined) {
        const userIdStr = event.userId?.toString();
        if (!userIdStr)
          return;
        const inside = this._users.includes(userIdStr);
        if (inside === this._blacklistUsers) {
          return;
        }
      }
      if (this._pattern && event.text) {
        const match = event.text.match(this._pattern);
        if (!match) {
          return;
        }
        event._patternMatch = match;
      }
      if (this.func && !this.func(event)) {
        return;
      }
      return event;
    }
  }
  exports2.InlineQuery = InlineQuery;

  class InlineBuilder {
    constructor() {
      this._resultId = 0;
    }
    _nextId() {
      return String(this._resultId++);
    }
    article(title, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageText({
        message: params.text ?? "",
        entities: params.entities,
        noWebpage: params.linkPreview === false,
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResult({
        id: params.id ?? this._nextId(),
        type: "article",
        title,
        description: params.description,
        url: params.url,
        thumb: params.thumb,
        content: params.content,
        sendMessage
      });
    }
    photo(photo, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaAuto({
        message: params.text ?? "",
        entities: params.entities,
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResultPhoto({
        id: params.id ?? this._nextId(),
        type: "photo",
        photo,
        sendMessage
      });
    }
    document(document, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaAuto({
        message: params.text ?? "",
        entities: params.entities,
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResultDocument({
        id: params.id ?? this._nextId(),
        type: params.type ?? "file",
        title: params.title,
        description: params.description,
        document,
        sendMessage
      });
    }
    game(shortName, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageGame({
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResultGame({
        id: params.id ?? this._nextId(),
        shortName,
        sendMessage
      });
    }
    geo(geoPoint, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaGeo({
        geoPoint,
        heading: params.heading,
        period: params.period,
        proximityNotificationRadius: params.proximityNotificationRadius,
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResult({
        id: params.id ?? this._nextId(),
        type: "geo",
        title: params.title,
        description: params.description,
        sendMessage
      });
    }
    venue(geoPoint, title, address, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaVenue({
        geoPoint,
        title,
        address,
        provider: params.provider ?? "",
        venueId: params.venueId ?? "",
        venueType: params.venueType ?? "",
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResult({
        id: params.id ?? this._nextId(),
        type: "venue",
        title,
        description: params.description,
        sendMessage
      });
    }
    contact(phoneNumber, firstName, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaContact({
        phoneNumber,
        firstName,
        lastName: params.lastName ?? "",
        vcard: params.vcard ?? "",
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResult({
        id: params.id ?? this._nextId(),
        type: "contact",
        title: firstName,
        description: params.description,
        sendMessage
      });
    }
  }
  exports2.InlineBuilder = InlineBuilder;

  class InlineQueryEvent extends common_1.EventCommonSender {
    constructor(update) {
      super({});
      this._eventName = "InlineQuery";
      this._answered = false;
      this.originalUpdate = update;
      this._isChosen = update instanceof tl_1.Api.UpdateBotInlineSend;
      if (update instanceof tl_1.Api.UpdateBotInlineQuery) {
        this._userId = update.userId;
        this._queryId = update.queryId;
        this._text = update.query;
        this._offset = update.offset;
        this._geo = update.geo;
        this._peerType = update.peerType;
      } else {
        this._userId = update.userId;
        this._text = update.query;
        this._offset = "";
        this._geo = update.geo;
        this._resultId = update.id;
        this._msgId = update.msgId;
      }
    }
    get id() {
      return this._queryId;
    }
    get text() {
      return this._text;
    }
    get query() {
      return this._text;
    }
    get offset() {
      return this._offset;
    }
    get userId() {
      return this._userId;
    }
    get geo() {
      return this._geo;
    }
    get peerType() {
      return this._peerType;
    }
    get isChosen() {
      return this._isChosen;
    }
    get resultId() {
      return this._resultId;
    }
    get msgId() {
      return this._msgId;
    }
    get patternMatch() {
      return this._patternMatch;
    }
    get builder() {
      if (!this._builder) {
        this._builder = new InlineBuilder;
      }
      return this._builder;
    }
    get answered() {
      return this._answered;
    }
    async answer(results = [], params = {}) {
      if (!this._client || !this._queryId) {
        return false;
      }
      if (this._answered) {
        return false;
      }
      if (results.length > 50) {
        throw new Error("Cannot send more than 50 inline results");
      }
      let switchPm;
      if (params.switchPm) {
        switchPm = new tl_1.Api.InlineBotSwitchPM({
          text: params.switchPm.text,
          startParam: params.switchPm.startParam
        });
      }
      let switchWebview;
      if (params.switchWebview) {
        switchWebview = new tl_1.Api.InlineBotWebView({
          text: params.switchWebview.text,
          url: params.switchWebview.url
        });
      }
      try {
        await this._client.invoke(new tl_1.Api.messages.SetInlineBotResults({
          queryId: this._queryId,
          results,
          cacheTime: params.cacheTime ?? 0,
          gallery: params.gallery,
          private: params.private,
          nextOffset: params.nextOffset,
          switchPm,
          switchWebview
        }));
        this._answered = true;
        return true;
      } catch {
        return false;
      }
    }
    async getUser() {
      if (!this._client)
        return;
      try {
        const entity = await this._client.getEntity(new tl_1.Api.PeerUser({ userId: this._userId }));
        if (entity instanceof tl_1.Api.User) {
          return entity;
        }
      } catch {
        return;
      }
      return;
    }
  }
  exports2.InlineQueryEvent = InlineQueryEvent;
});

// node_modules/teleproto/events/Album.js
var require_Album = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.AlbumEvent = exports2.Album = undefined;
  var common_1 = require_common();
  var tl_1 = require_tl();
  var _ALBUM_DELAY = 500;

  class Album extends common_1.EventBuilder {
    constructor(albumParams) {
      let { chats, func, blacklistChats = false } = albumParams;
      super({ chats, blacklistChats, func });
    }
    build(update, dispatch) {
      if (!(("message" in update) && update.message instanceof tl_1.Api.Message)) {
        return;
      }
      const groupedId = update.message.groupedId;
      if (!groupedId) {
        return;
      }
      const albums = this.client._ALBUMS;
      const oldTimeout = albums.get(groupedId.toString());
      let oldValues = [];
      if (oldTimeout) {
        clearTimeout(oldTimeout[0]);
        oldValues.push(...oldTimeout[1]);
      }
      albums.set(groupedId.toString(), [
        setTimeout(() => {
          const values = albums.get(groupedId.toString());
          albums.delete(groupedId.toString());
          if (!values) {
            return;
          }
          const updates = values[1];
          if (!updates) {
            return;
          }
          const messages = [];
          for (const update2 of updates) {
            if ("message" in update2 && update2.message instanceof tl_1.Api.Message) {
              messages.push(update2.message);
            }
          }
          const event = new AlbumEvent(messages, values[1]);
          event._setClient(this.client);
          event._entities = messages[0]._entities;
          dispatch(event);
        }, _ALBUM_DELAY),
        [...oldValues, update]
      ]);
    }
  }
  exports2.Album = Album;

  class AlbumEvent extends common_1.EventCommon {
    constructor(messages, originalUpdates) {
      super({
        msgId: messages[0].id,
        chatPeer: messages[0].peerId,
        broadcast: messages[0].post
      });
      this.originalUpdates = originalUpdates;
      this.messages = messages;
    }
    _setClient(client) {
      super._setClient(client);
      for (let i = 0;i < this.messages.length; i++) {
        try {
          this.messages[i]._finishInit(client, this.originalUpdates[i]._entities || new Map, undefined);
        } catch (e) {
          client._log.error("Got error while trying to finish init message with id " + this.messages[i].id, e);
          if (client._errorHandler) {
            client._errorHandler(e);
          }
        }
      }
    }
  }
  exports2.AlbumEvent = AlbumEvent;
});

// node_modules/teleproto/events/CallbackQuery.js
var require_CallbackQuery = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.CallbackQueryEvent = exports2.CallbackQuery = exports2.NewCallbackQueryDefaults = undefined;
  var common_1 = require_common();
  var tl_1 = require_tl();
  var Helpers_1 = require_Helpers();
  var Utils_1 = require_Utils();
  exports2.NewCallbackQueryDefaults = {
    chats: [],
    fromUsers: [],
    blacklistUsers: []
  };

  class CallbackQuery extends common_1.EventBuilder {
    constructor(inlineQueryParams = {}) {
      const { chats, func, pattern } = inlineQueryParams;
      super({ chats, func, blacklistChats: false });
      this.match = pattern;
      this._noCheck = [this.chats, this.func, this.match].every((i) => i === null || i === undefined);
    }
    build(update, callback, selfId = undefined) {
      if (update instanceof tl_1.Api.UpdateBotCallbackQuery) {
        return new CallbackQueryEvent(update, update.peer, update.msgId);
      } else if (update instanceof tl_1.Api.UpdateInlineBotCallbackQuery) {
        const b = (0, Helpers_1.toSignedLittleBuffer)(update.msgId.id, 8);
        const msgId = b.readInt32LE(0);
        const peerId = b.readInt32LE(4);
        const peer = peerId < 0 ? new tl_1.Api.PeerChannel({ channelId: (0, Helpers_1.returnBigInt)(-peerId) }) : new tl_1.Api.PeerUser({ userId: (0, Helpers_1.returnBigInt)(peerId) });
        return new CallbackQueryEvent(update, peer, msgId);
      }
    }
    filter(event) {
      if (this._noCheck)
        return event;
      if (this.chats) {
        let inside = this.chats.includes(event.query.chatInstance.toString());
        if (event.chatId) {
          inside = inside || this.chats.includes(event.chatId.toString());
        }
        if (inside === this.blacklistChats) {
          return;
        }
      }
      if (this.match) {
        const data = new TextDecoder().decode(event.query.data);
        const result = this.match.exec(data);
        this.match.lastIndex = 0;
        if (result) {
          event.patternMatch = result;
        } else {
          return;
        }
      }
      if (this.func) {
        return this.func(event);
      }
      return true;
    }
  }
  exports2.CallbackQuery = CallbackQuery;

  class CallbackQueryEvent extends common_1.EventCommonSender {
    constructor(query, peer, msgId) {
      super({
        msgId,
        chatPeer: peer,
        broadcast: false
      });
      this.query = query;
      this.patternMatch = undefined;
      this._senderId = (0, Helpers_1.returnBigInt)(query.userId);
      this._message = undefined;
      this._answered = false;
    }
    _setClient(client) {
      super._setClient(client);
      const [sender, inputSender] = (0, Utils_1._getEntityPair)(this._senderId.toString(), this._entities, client._entityCache);
      this._sender = sender;
      this._inputSender = inputSender;
    }
    get id() {
      return this.query.queryId;
    }
    get messageId() {
      return this._messageId;
    }
    get data() {
      return this.query.data;
    }
    get chatInstance() {
      return this.query.chatInstance;
    }
    async getMessage() {
      if (this._message) {
        return this._message;
      }
      const chat = this.isChannel ? await this.getInputChat() : undefined;
      const messages = await this._client.getMessages(chat, {
        ids: this._messageId
      });
      this._message = messages[0];
      return this._message;
    }
    async _refetchSender() {
      if (this._entities.has(this.senderId.toString())) {
        this._sender = this._entities.get(this.senderId.toString());
      }
      if (!this._sender)
        return;
      this._inputSender = (0, Utils_1.getInputPeer)(this._chat);
      if (!this._inputSender.hasOwnProperty("accessHash")) {
        try {
          this._inputSender = this._client._entityCache.get(this._senderId);
        } catch (e) {
          const m = await this.getMessage();
          if (m) {
            this._sender = m._sender;
            this._inputSender = m._inputSender;
          }
        }
      }
    }
    async answer({ message, cacheTime, url, alert } = {}) {
      if (this._answered)
        return;
      return await this._client.invoke(new tl_1.Api.messages.SetBotCallbackAnswer({
        queryId: this.query.queryId,
        cacheTime: cacheTime ?? 0,
        alert,
        message,
        url
      })).then((res) => {
        this._answered = true;
        return res;
      });
    }
    get viaInline() {
      return this.query instanceof tl_1.Api.UpdateInlineBotCallbackQuery;
    }
    async respond(params = {}) {
      await this.answer();
      const inputChat = await this.getInputChat();
      await this._client.sendMessage(inputChat, params);
    }
    async reply(params = {}) {
      await this.answer();
      params.replyTo = this.messageId;
      const inputChat = await this.getInputChat();
      await this._client.sendMessage(inputChat, params);
    }
    async edit(params) {
      if (this.query.msgId instanceof tl_1.Api.InputBotInlineMessageID) {
        return await this._client.editMessage(this.messageId, params).then(async (res) => {
          await this.answer();
          return res;
        });
      } else {
        const inputChat = await this.getInputChat();
        return await this._client.editMessage(inputChat, params).then(async (res) => {
          await this.answer();
          return res;
        });
      }
    }
    async delete({ revoke = true } = {}) {
      if (this._client) {
        return this._client.deleteMessages(await this.getInputChat(), [this.messageId], { revoke });
      }
    }
    get sender() {
      return this._sender;
    }
  }
  exports2.CallbackQueryEvent = CallbackQueryEvent;
});

// node_modules/teleproto/events/index.js
var require_events = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.CallbackQueryEvent = exports2.CallbackQuery = exports2.AlbumEvent = exports2.Album = exports2.InlineBuilder = exports2.InlineQueryEvent = exports2.InlineQuery = exports2.ChatActionEvent = exports2.ChatAction = exports2.DeletedMessageEvent = exports2.DeletedMessage = exports2.MessageReadEvent = exports2.MessageRead = exports2.UserUpdateEvent = exports2.UserUpdate = exports2.EditedMessageEvent = exports2.EditedMessage = exports2.NewMessageEvent = exports2.NewMessage = exports2.Raw = undefined;
  var Raw_1 = require_Raw();
  Object.defineProperty(exports2, "Raw", { enumerable: true, get: function() {
    return Raw_1.Raw;
  } });
  var NewMessage_1 = require_NewMessage();
  Object.defineProperty(exports2, "NewMessage", { enumerable: true, get: function() {
    return NewMessage_1.NewMessage;
  } });
  Object.defineProperty(exports2, "NewMessageEvent", { enumerable: true, get: function() {
    return NewMessage_1.NewMessageEvent;
  } });
  var EditedMessage_1 = require_EditedMessage();
  Object.defineProperty(exports2, "EditedMessage", { enumerable: true, get: function() {
    return EditedMessage_1.EditedMessage;
  } });
  Object.defineProperty(exports2, "EditedMessageEvent", { enumerable: true, get: function() {
    return EditedMessage_1.EditedMessageEvent;
  } });
  var UserUpdate_1 = require_UserUpdate();
  Object.defineProperty(exports2, "UserUpdate", { enumerable: true, get: function() {
    return UserUpdate_1.UserUpdate;
  } });
  Object.defineProperty(exports2, "UserUpdateEvent", { enumerable: true, get: function() {
    return UserUpdate_1.UserUpdateEvent;
  } });
  var MessageRead_1 = require_MessageRead();
  Object.defineProperty(exports2, "MessageRead", { enumerable: true, get: function() {
    return MessageRead_1.MessageRead;
  } });
  Object.defineProperty(exports2, "MessageReadEvent", { enumerable: true, get: function() {
    return MessageRead_1.MessageReadEvent;
  } });
  var DeletedMessage_1 = require_DeletedMessage();
  Object.defineProperty(exports2, "DeletedMessage", { enumerable: true, get: function() {
    return DeletedMessage_1.DeletedMessage;
  } });
  Object.defineProperty(exports2, "DeletedMessageEvent", { enumerable: true, get: function() {
    return DeletedMessage_1.DeletedMessageEvent;
  } });
  var ChatAction_1 = require_ChatAction();
  Object.defineProperty(exports2, "ChatAction", { enumerable: true, get: function() {
    return ChatAction_1.ChatAction;
  } });
  Object.defineProperty(exports2, "ChatActionEvent", { enumerable: true, get: function() {
    return ChatAction_1.ChatActionEvent;
  } });
  var InlineQuery_1 = require_InlineQuery();
  Object.defineProperty(exports2, "InlineQuery", { enumerable: true, get: function() {
    return InlineQuery_1.InlineQuery;
  } });
  Object.defineProperty(exports2, "InlineQueryEvent", { enumerable: true, get: function() {
    return InlineQuery_1.InlineQueryEvent;
  } });
  Object.defineProperty(exports2, "InlineBuilder", { enumerable: true, get: function() {
    return InlineQuery_1.InlineBuilder;
  } });
  var Album_1 = require_Album();
  Object.defineProperty(exports2, "Album", { enumerable: true, get: function() {
    return Album_1.Album;
  } });
  Object.defineProperty(exports2, "AlbumEvent", { enumerable: true, get: function() {
    return Album_1.AlbumEvent;
  } });
  var CallbackQuery_1 = require_CallbackQuery();
  Object.defineProperty(exports2, "CallbackQuery", { enumerable: true, get: function() {
    return CallbackQuery_1.CallbackQuery;
  } });
  Object.defineProperty(exports2, "CallbackQueryEvent", { enumerable: true, get: function() {
    return CallbackQuery_1.CallbackQueryEvent;
  } });
});

// node_modules/teleproto/client/TelegramClient.js
var require_TelegramClient = __commonJS((exports2) => {
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
  exports2.TelegramClient = undefined;
  var telegramBaseClient_1 = require_telegramBaseClient();
  var authMethods = __importStar(require_auth());
  var botMethods = __importStar(require_bots());
  var buttonsMethods = __importStar(require_buttons());
  var downloadMethods = __importStar(require_downloads());
  var parseMethods = __importStar(require_messageParse());
  var messageMethods = __importStar(require_messages2());
  var updateMethods = __importStar(require_dispatch());
  var uploadMethods = __importStar(require_uploads());
  var userMethods = __importStar(require_users());
  var chatMethods = __importStar(require_chats());
  var communityMethods = __importStar(require_communities());
  var inviteLinkMethods = __importStar(require_inviteLinks());
  var accountMethods = __importStar(require_account());
  var contactMethods = __importStar(require_contacts());
  var dialogMethods = __importStar(require_dialogs());
  var twoFA = __importStar(require_2fa());
  var forumMethods = __importStar(require_forums());
  var storyMethods = __importStar(require_stories());
  var folderMethods = __importStar(require_folders());
  var stickerMethods = __importStar(require_stickers());
  var tl_1 = require_tl();
  var apiProxy_1 = require_apiProxy();
  var html_1 = require_html();
  var markdown_1 = require_markdown();
  var markdownv2_1 = require_markdownv2();
  var network_1 = require_network();
  var registry_1 = require_registry();
  var dispatch_1 = require_dispatch();
  var composer_1 = require_composer();

  class TelegramClient extends telegramBaseClient_1.TelegramBaseClient {
    get updates() {
      if (!this._updates)
        this._updates = new composer_1.ClientUpdates(this);
      return this._updates;
    }
    constructor(session, apiId, apiHash, clientParams) {
      super(session, apiId, apiHash, clientParams);
    }
    start(authParams) {
      return authMethods.start(this, authParams);
    }
    checkAuthorization() {
      return authMethods.checkAuthorization(this);
    }
    logOut() {
      return authMethods.logOut(this);
    }
    signInUser(apiCredentials, authParams) {
      return authMethods.signInUser(this, apiCredentials, authParams);
    }
    signInUserWithQrCode(apiCredentials, authParams) {
      return authMethods.signInUserWithQrCode(this, apiCredentials, authParams);
    }
    sendCode(apiCredentials, phoneNumber, forceSMS = false, reCaptchaCallback) {
      return authMethods.sendCode(this, apiCredentials, phoneNumber, forceSMS, reCaptchaCallback);
    }
    sendVerifyEmailCode(phoneNumber, phoneCodeHash, email) {
      return authMethods.sendVerifyEmailCode(this, phoneNumber, phoneCodeHash, email);
    }
    verifyEmail(phoneNumber, phoneCodeHash, verification) {
      return authMethods.verifyEmail(this, phoneNumber, phoneCodeHash, verification);
    }
    resetLoginEmail(phoneNumber, phoneCodeHash) {
      return authMethods.resetLoginEmail(this, phoneNumber, phoneCodeHash);
    }
    signInWithPassword(apiCredentials, authParams) {
      return authMethods.signInWithPassword(this, apiCredentials, authParams);
    }
    signInBot(apiCredentials, authParams) {
      return authMethods.signInBot(this, apiCredentials, authParams);
    }
    signInWithWebToken(apiCredentials, webAuthToken) {
      return authMethods.signInWithWebToken(this, apiCredentials, webAuthToken);
    }
    async updateTwoFaSettings({ isCheckPassword, currentPassword, newPassword, hint = "", email, emailCodeCallback, onEmailCodeError }) {
      return twoFA.updateTwoFaSettings(this, {
        isCheckPassword,
        currentPassword,
        newPassword,
        hint,
        email,
        emailCodeCallback,
        onEmailCodeError
      });
    }
    inlineQuery(bot, query, entity, offset, geoPoint) {
      return botMethods.inlineQuery(this, bot, query, entity, offset, geoPoint);
    }
    buildReplyMarkup(buttons, inlineOnly = false) {
      return buttonsMethods.buildReplyMarkup(buttons, inlineOnly);
    }
    downloadFile(inputLocation, fileParams = {}) {
      return downloadMethods.downloadFile(this, inputLocation, fileParams);
    }
    downloadProfilePhoto(entity, downloadProfilePhotoParams = {
      isBig: false
    }) {
      if (typeof downloadProfilePhotoParams === "string") {
        downloadProfilePhotoParams = {
          outputFile: downloadProfilePhotoParams
        };
      }
      return downloadMethods.downloadProfilePhoto(this, entity, downloadProfilePhotoParams);
    }
    downloadMedia(messageOrMedia, downloadParams) {
      if (typeof downloadParams === "string") {
        downloadParams = { outputFile: downloadParams };
      }
      return downloadMethods.downloadMedia(this, messageOrMedia, downloadParams?.outputFile, downloadParams?.thumb, downloadParams?.progressCallback, {
        signal: downloadParams?.signal,
        requestTimeout: downloadParams?.requestTimeout
      });
    }
    get parseMode() {
      return this._parseMode;
    }
    setParseMode(mode) {
      if (mode) {
        this._parseMode = this._sanitizeParseMode(mode);
      } else {
        this._parseMode = undefined;
      }
    }
    _sanitizeParseMode(mode) {
      if (mode === "md" || mode === "markdown") {
        return markdown_1.MarkdownParser;
      }
      if (mode === "md2" || mode === "markdownv2") {
        return markdownv2_1.MarkdownV2Parser;
      }
      if (mode == "html") {
        return html_1.HTMLParser;
      }
      if (typeof mode == "object" && "parse" in mode && "unparse" in mode) {
        return mode;
      }
      throw new Error(`Invalid parse mode type ${mode}`);
    }
    iterMessages(entity, iterParams = {}) {
      return messageMethods.iterMessages(this, entity, iterParams);
    }
    getMessages(entity, getMessagesParams = {}) {
      return messageMethods.getMessages(this, entity, getMessagesParams);
    }
    getCommentData(entity, message) {
      return messageMethods.getCommentData(this, entity, message);
    }
    sendMessage(entity, sendMessageParams = {}) {
      return messageMethods.sendMessage(this, entity, sendMessageParams);
    }
    forwardMessages(entity, forwardMessagesParams) {
      return messageMethods.forwardMessages(this, entity, forwardMessagesParams);
    }
    editMessage(entity, editMessageParams) {
      return messageMethods.editMessage(this, entity, editMessageParams);
    }
    deleteMessages(entity, messageIds, { revoke = true }) {
      return messageMethods.deleteMessages(this, entity, messageIds, {
        revoke
      });
    }
    pinMessage(entity, message, pinMessageParams) {
      return messageMethods.pinMessage(this, entity, message, pinMessageParams);
    }
    unpinMessage(entity, message, unpinMessageParams) {
      return messageMethods.unpinMessage(this, entity, message, unpinMessageParams);
    }
    markAsRead(entity, message, markAsReadParams) {
      return messageMethods.markAsRead(this, entity, message, markAsReadParams);
    }
    sendReaction(entity, messageId, reaction, big, addToRecent) {
      return messageMethods.sendReaction(this, entity, messageId, reaction, big, addToRecent);
    }
    getReactionUsers(entity, messageId, params) {
      return messageMethods.getReactionUsers(this, entity, messageId, params);
    }
    sendPoll(entity, poll, params) {
      return messageMethods.sendPoll(this, entity, poll, params);
    }
    vote(entity, message, options) {
      return messageMethods.vote(this, entity, message, options);
    }
    closePoll(entity, message) {
      return messageMethods.closePoll(this, entity, message);
    }
    getScheduledMessages(entity, ids) {
      return messageMethods.getScheduledMessages(this, entity, ids);
    }
    sendScheduledMessages(entity, ids) {
      return messageMethods.sendScheduledMessages(this, entity, ids);
    }
    deleteScheduledMessages(entity, ids) {
      return messageMethods.deleteScheduledMessages(this, entity, ids);
    }
    copyMessages(entity, copyMessagesParams) {
      return messageMethods.copyMessages(this, entity, copyMessagesParams);
    }
    saveDraft(entity, params) {
      return messageMethods.saveDraft(this, entity, params);
    }
    clearDraft(entity) {
      return messageMethods.clearDraft(this, entity);
    }
    clearAllDrafts() {
      return messageMethods.clearAllDrafts(this);
    }
    getMessageByLink(link) {
      return messageMethods.getMessageByLink(this, link);
    }
    getDiscussionMessage(entity, message) {
      return messageMethods.getDiscussionMessage(this, entity, message);
    }
    getRichMessage(entity, message) {
      return messageMethods.getRichMessage(this, entity, message);
    }
    iterDialogs(iterDialogsParams = {}) {
      return dialogMethods.iterDialogs(this, iterDialogsParams);
    }
    getDialogs(params = {}) {
      return dialogMethods.getDialogs(this, params);
    }
    iterParticipants(entity, params = {}) {
      return chatMethods.iterParticipants(this, entity, params);
    }
    getParticipants(entity, params = {}) {
      return chatMethods.getParticipants(this, entity, params);
    }
    kickParticipant(entity, participant) {
      return chatMethods.kickParticipant(this, entity, participant);
    }
    getParticipant(entity, participant) {
      return chatMethods.getParticipant(this, entity, participant);
    }
    editBanned(entity, participant, params) {
      return chatMethods.editBanned(this, entity, participant, params);
    }
    editAdmin(entity, participant, params) {
      return chatMethods.editAdmin(this, entity, participant, params);
    }
    editChatDefaultBannedRights(entity, params) {
      return chatMethods.editChatDefaultBannedRights(this, entity, params);
    }
    editTitle(entity, title) {
      return chatMethods.editTitle(this, entity, title);
    }
    editPhoto(entity, photo) {
      return chatMethods.editPhoto(this, entity, photo);
    }
    editChatAbout(entity, about) {
      return chatMethods.editChatAbout(this, entity, about);
    }
    toggleSlowMode(entity, seconds) {
      return chatMethods.toggleSlowMode(this, entity, seconds);
    }
    createChannel(params) {
      return chatMethods.createChannel(this, params);
    }
    createChat(params) {
      return chatMethods.createChat(this, params);
    }
    joinChannel(entity) {
      return chatMethods.joinChannel(this, entity);
    }
    importChatInvite(link) {
      return chatMethods.importChatInvite(this, link);
    }
    leaveChannel(entity) {
      return chatMethods.leaveChannel(this, entity);
    }
    deleteHistory(entity, params) {
      return chatMethods.deleteHistory(this, entity, params);
    }
    editPeerFolders(entity, folderId) {
      return chatMethods.editPeerFolders(this, entity, folderId);
    }
    iterAdminLog(entity, params) {
      return chatMethods.iterAdminLog(this, entity, params);
    }
    getAdminLog(entity, params) {
      return chatMethods.getAdminLog(this, entity, params);
    }
    setTyping(entity, action, params) {
      return chatMethods.setTyping(this, entity, action, params);
    }
    getCommonChats(entity, params) {
      return userMethods.getCommonChats(this, entity, params);
    }
    exportChatInvite(entity, params) {
      return inviteLinkMethods.exportChatInvite(this, entity, params);
    }
    editExportedChatInvite(entity, link, params) {
      return inviteLinkMethods.editExportedChatInvite(this, entity, link, params);
    }
    getExportedChatInvite(entity, link) {
      return inviteLinkMethods.getExportedChatInvite(this, entity, link);
    }
    deleteExportedChatInvite(entity, link) {
      return inviteLinkMethods.deleteExportedChatInvite(this, entity, link);
    }
    deleteRevokedExportedChatInvites(entity, admin) {
      return inviteLinkMethods.deleteRevokedExportedChatInvites(this, entity, admin);
    }
    getAdminsWithInvites(entity) {
      return inviteLinkMethods.getAdminsWithInvites(this, entity);
    }
    iterExportedChatInvites(entity, params) {
      return inviteLinkMethods.iterExportedChatInvites(this, entity, params);
    }
    getExportedChatInvites(entity, params) {
      return inviteLinkMethods.getExportedChatInvites(this, entity, params);
    }
    iterChatInviteImporters(entity, params) {
      return inviteLinkMethods.iterChatInviteImporters(this, entity, params);
    }
    getChatInviteImporters(entity, params) {
      return inviteLinkMethods.getChatInviteImporters(this, entity, params);
    }
    hideChatJoinRequest(entity, user, params) {
      return inviteLinkMethods.hideChatJoinRequest(this, entity, user, params);
    }
    hideAllChatJoinRequests(entity, params) {
      return inviteLinkMethods.hideAllChatJoinRequests(this, entity, params);
    }
    checkChatInvite(link) {
      return inviteLinkMethods.checkChatInvite(this, link);
    }
    updateProfile(params) {
      return accountMethods.updateProfile(this, params);
    }
    updateUsername(username) {
      return accountMethods.updateUsername(this, username);
    }
    updateStatus(online) {
      return accountMethods.updateStatus(this, online);
    }
    uploadProfilePhoto(params) {
      return accountMethods.uploadProfilePhoto(this, params);
    }
    updateProfilePhoto(photo, params) {
      return accountMethods.updateProfilePhoto(this, photo, params);
    }
    deleteProfilePhotos(photos) {
      return accountMethods.deleteProfilePhotos(this, photos);
    }
    getUserPhotos(entity, params) {
      return accountMethods.getUserPhotos(this, entity, params);
    }
    getContacts() {
      return contactMethods.getContacts(this);
    }
    addContact(entity, params) {
      return contactMethods.addContact(this, entity, params);
    }
    deleteContacts(users) {
      return contactMethods.deleteContacts(this, users);
    }
    importContacts(contacts) {
      return contactMethods.importContacts(this, contacts);
    }
    block(entity, params) {
      return contactMethods.block(this, entity, params);
    }
    unblock(entity, params) {
      return contactMethods.unblock(this, entity, params);
    }
    getBlocked(params) {
      return contactMethods.getBlocked(this, params);
    }
    resetAuthorization(hash) {
      return accountMethods.resetAuthorization(this, hash);
    }
    getAuthorizations() {
      return accountMethods.getAuthorizations(this);
    }
    getPrivacy(key) {
      return accountMethods.getPrivacy(this, key);
    }
    setPrivacy(key, rules) {
      return accountMethods.setPrivacy(this, key, rules);
    }
    getNotifySettings(entity) {
      return accountMethods.getNotifySettings(this, entity);
    }
    updateNotifySettings(entity, params) {
      return accountMethods.updateNotifySettings(this, entity, params);
    }
    getAccountTTL() {
      return accountMethods.getAccountTTL(this);
    }
    setAccountTTL(days) {
      return accountMethods.setAccountTTL(this, days);
    }
    getGlobalPrivacySettings() {
      return accountMethods.getGlobalPrivacySettings(this);
    }
    setGlobalPrivacySettings(settings) {
      return accountMethods.setGlobalPrivacySettings(this, settings);
    }
    createCommunity(params) {
      return communityMethods.createCommunity(this, params);
    }
    getCommunity(community) {
      return communityMethods.getCommunity(this, community);
    }
    getJoinedCommunities() {
      return communityMethods.getJoinedCommunities(this);
    }
    getCommunityPeers(community) {
      return communityMethods.getCommunityPeers(this, community);
    }
    setCommunityPeerLink(community, peer, action) {
      return communityMethods.setCommunityPeerLink(this, community, peer, action);
    }
    setCommunityCollapsed(community, collapsed) {
      return communityMethods.setCommunityCollapsed(this, community, collapsed);
    }
    iterCommunityPeerLinkRequests(community, params = {}) {
      return communityMethods.iterCommunityPeerLinkRequests(this, community, params);
    }
    getCommunityPeerLinkRequests(community, params = {}) {
      return communityMethods.getCommunityPeerLinkRequests(this, community, params);
    }
    setCommunityPeerLinkRequestApproval(community, peer, approved) {
      return communityMethods.setCommunityPeerLinkRequestApproval(this, community, peer, approved);
    }
    setAllCommunityPeerLinkRequestsApproval(community, approved) {
      return communityMethods.setAllCommunityPeerLinkRequestsApproval(this, community, approved);
    }
    setCommunityParticipantBanned(community, participant, banned) {
      return communityMethods.setCommunityParticipantBanned(this, community, participant, banned);
    }
    getCommunityParticipantJoinedChats(community, participant) {
      return communityMethods.getCommunityParticipantJoinedChats(this, community, participant);
    }
    pinCommunity(community, pinned = true) {
      return communityMethods.pinCommunity(this, community, pinned);
    }
    getCommunityNotifySettings(community) {
      return communityMethods.getCommunityNotifySettings(this, community);
    }
    updateCommunityNotifySettings(community, params) {
      return communityMethods.updateCommunityNotifySettings(this, community, params);
    }
    createForumTopic(entity, params) {
      return forumMethods.createForumTopic(this, entity, params);
    }
    editForumTopic(entity, topicId, params) {
      return forumMethods.editForumTopic(this, entity, topicId, params);
    }
    updatePinnedForumTopic(entity, topicId, pinned) {
      return forumMethods.updatePinnedForumTopic(this, entity, topicId, pinned);
    }
    reorderPinnedForumTopics(entity, order, params) {
      return forumMethods.reorderPinnedForumTopics(this, entity, order, params);
    }
    getForumTopics(entity, params) {
      return forumMethods.getForumTopics(this, entity, params);
    }
    getForumTopicsByID(entity, topicIds) {
      return forumMethods.getForumTopicsByID(this, entity, topicIds);
    }
    toggleForum(entity, enabled, tabs) {
      return forumMethods.toggleForum(this, entity, enabled, tabs);
    }
    toggleViewForumAsMessages(entity, enabled) {
      return forumMethods.toggleViewForumAsMessages(this, entity, enabled);
    }
    sendStory(entity, params) {
      return storyMethods.sendStory(this, entity, params);
    }
    editStory(entity, storyId, params) {
      return storyMethods.editStory(this, entity, storyId, params);
    }
    deleteStories(entity, ids) {
      return storyMethods.deleteStories(this, entity, ids);
    }
    toggleStoriesPinned(entity, ids, pinned) {
      return storyMethods.toggleStoriesPinned(this, entity, ids, pinned);
    }
    canSendStory(entity) {
      return storyMethods.canSendStory(this, entity);
    }
    getAllStories(params) {
      return storyMethods.getAllStories(this, params);
    }
    getPeerStories(entity) {
      return storyMethods.getPeerStories(this, entity);
    }
    getStoriesByID(entity, ids) {
      return storyMethods.getStoriesByID(this, entity, ids);
    }
    getPinnedStories(entity, params) {
      return storyMethods.getPinnedStories(this, entity, params);
    }
    getStoriesArchive(entity, params) {
      return storyMethods.getStoriesArchive(this, entity, params);
    }
    readStories(entity, maxId) {
      return storyMethods.readStories(this, entity, maxId);
    }
    incrementStoryViews(entity, ids) {
      return storyMethods.incrementStoryViews(this, entity, ids);
    }
    getStoryViewsList(entity, storyId, params) {
      return storyMethods.getStoryViewsList(this, entity, storyId, params);
    }
    exportStoryLink(entity, storyId) {
      return storyMethods.exportStoryLink(this, entity, storyId);
    }
    sendStoryReaction(entity, storyId, reaction, params) {
      return storyMethods.sendStoryReaction(this, entity, storyId, reaction, params);
    }
    getDialogFilters() {
      return folderMethods.getDialogFilters(this);
    }
    updateDialogFilter(id, filter) {
      return folderMethods.updateDialogFilter(this, id, filter);
    }
    updateDialogFiltersOrder(order) {
      return folderMethods.updateDialogFiltersOrder(this, order);
    }
    getStickerSet(set) {
      return stickerMethods.getStickerSet(this, set);
    }
    getAllStickers() {
      return stickerMethods.getAllStickers(this);
    }
    installStickerSet(set, params) {
      return stickerMethods.installStickerSet(this, set, params);
    }
    uninstallStickerSet(set) {
      return stickerMethods.uninstallStickerSet(this, set);
    }
    getRecentStickers(params) {
      return stickerMethods.getRecentStickers(this, params);
    }
    saveRecentSticker(document, params) {
      return stickerMethods.saveRecentSticker(this, document, params);
    }
    clearRecentStickers(params) {
      return stickerMethods.clearRecentStickers(this, params);
    }
    getFavedStickers() {
      return stickerMethods.getFavedStickers(this);
    }
    faveSticker(document, params) {
      return stickerMethods.faveSticker(this, document, params);
    }
    getCustomEmojiDocuments(documentIds) {
      return stickerMethods.getCustomEmojiDocuments(this, documentIds);
    }
    setBotCommands(commands, params) {
      return botMethods.setBotCommands(this, commands, params);
    }
    getBotCommands(params) {
      return botMethods.getBotCommands(this, params);
    }
    resetBotCommands(params) {
      return botMethods.resetBotCommands(this, params);
    }
    setBotInfo(params) {
      return botMethods.setBotInfo(this, params);
    }
    getBotInfo(params) {
      return botMethods.getBotInfo(this, params);
    }
    setBotMenuButton(user, button) {
      return botMethods.setBotMenuButton(this, user, button);
    }
    getBotMenuButton(user) {
      return botMethods.getBotMenuButton(this, user);
    }
    translateText(params) {
      return messageMethods.translateText(this, params);
    }
    getMessagesViews(entity, ids, increment) {
      return messageMethods.getMessagesViews(this, entity, ids, increment);
    }
    getOutboxReadDate(entity, message) {
      return messageMethods.getOutboxReadDate(this, entity, message);
    }
    getMessageReadParticipants(entity, message) {
      return messageMethods.getMessageReadParticipants(this, entity, message);
    }
    iterDownload(file, params) {
      return downloadMethods.iterDownload(this, file, params);
    }
    on(event) {
      return updateMethods.on(this, event);
    }
    addEventHandler(callback, event) {
      return updateMethods.addEventHandler(this, callback, event);
    }
    removeEventHandler(callback, event) {
      return updateMethods.removeEventHandler(this, callback, event);
    }
    listEventHandlers() {
      return updateMethods.listEventHandlers(this);
    }
    async catchUp() {
      return (0, dispatch_1.catchUp)(this);
    }
    uploadFile(fileParams) {
      return uploadMethods.uploadFile(this, fileParams);
    }
    sendFile(entity, sendFileParams) {
      return uploadMethods.sendFile(this, entity, sendFileParams);
    }
    invoke(request, dcId, options) {
      return userMethods.invoke(this, request, dcId ?? options?.dcId, undefined, options);
    }
    invokeWithSender(request, sender) {
      return userMethods.invoke(this, request, undefined, sender);
    }
    get api() {
      if (!this._apiProxy) {
        this._apiProxy = (0, apiProxy_1.createApiProxy)(tl_1.Api, (request, dcId, options) => this.invoke(request, dcId, options));
      }
      return this._apiProxy;
    }
    getMe(inputPeer = false) {
      return userMethods.getMe(this, inputPeer);
    }
    isBot() {
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
