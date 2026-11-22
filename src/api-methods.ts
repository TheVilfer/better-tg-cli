import { Api } from "teleproto";

function methodPart(name: string): string {
  const dot = name.indexOf(".");
  return dot === -1 ? name : name.slice(dot + 1);
}

const NAMESPACE = (name: string): string => {
  const dot = name.indexOf(".");
  return dot === -1 ? "" : name.slice(0, dot);
};

const READ_PREFIX = /^(get|check|search|resolve)/;

const FORCE_WRITE = new Set([
  "messages.getbotcallbackanswer",
  "ephemeral.getcallbackanswer",
  "messages.getinlinebotresults",
]);

const EXTRA_READ = new Set<string>();

/** True if the method only reads data and may run through the MCP read tool. Case-insensitive. */
export function isApiReadMethod(name: string): boolean {
  const lower = name.toLowerCase();
  if (FORCE_WRITE.has(lower)) {
    return false;
  }
  if (EXTRA_READ.has(lower)) {
    return true;
  }
  return READ_PREFIX.test(methodPart(lower));
}

/**
 * A read call that may spend Stars is a write: `channels.SearchPosts` with `allowPaidStars` pays for
 * a full-text search once the free quota is used up. Checked by param, so a future paid read is
 * covered too.
 */
export function isApiReadCall(
  name: string,
  params?: Record<string, unknown>
): boolean {
  return (
    isApiReadMethod(name) &&
    !hasPaidStars(params) &&
    !incrementsViews(name, params)
  );
}

function incrementsViews(
  name: string,
  params?: Record<string, unknown>
): boolean {
  return (
    name.toLowerCase() === "messages.getmessagesviews" &&
    !!params &&
    isSet(params, "increment")
  );
}

function isSet(params: Record<string, unknown>, key: string): boolean {
  if (!Object.hasOwn(params, key)) {
    return false;
  }
  const v = params[key];
  return v != null && v !== false;
}

function hasPaidStars(params?: Record<string, unknown>): boolean {
  return (
    !!params &&
    Object.hasOwn(params, "allowPaidStars") &&
    params.allowPaidStars != null
  );
}

/**
 * Over MCP (TG_MCP or TG_READ_ONLY) a call that would pay Stars is refused for every method class
 * and in every write mode, "on" included: the model must not spend the user's Stars. That covers a
 * paid search (`channels.SearchPosts`) and a message, media, album or forward to a chat that
 * charges for delivery (`messages.SendMessage`, `SendMedia`, `SendMultiMedia`, `ForwardMessages`,
 * and any other method with the field). In a terminal a paid read stays a write behind the guard.
 * Checked on the prototype-free params and again on the built request.
 */
export function mcpPaidStarsRefusal(
  _name: string,
  params?: Record<string, unknown>
): string | null {
  if (!process.env.TG_MCP && !process.env.TG_READ_ONLY) {
    return null;
  }
  return hasPaidStars(params) ? PAID_STARS_REFUSAL : null;
}

export const PAID_STARS_REFUSAL =
  "Refused over MCP: allowPaidStars spends the user's Stars (a paid search, or a message to a chat that charges for it); do it in a terminal.";

function typeNameOf(value: object): string | undefined {
  const v = value as { _?: unknown; className?: unknown; classType?: unknown };
  if (typeof v._ === "string") {
    return v._;
  }
  if (v.classType === "constructor" && typeof v.className === "string") {
    return v.className;
  }
  return undefined;
}

function walkObjects(
  value: unknown,
  visit: (
    obj: Record<string, unknown>,
    key: string | undefined
  ) => string | null,
  key?: string
): string | null {
  if (Array.isArray(value)) {
    for (const v of value) {
      const r = walkObjects(v, visit, key);
      if (r) {
        return r;
      }
    }
    return null;
  }
  if (!value || typeof value !== "object" || value instanceof Uint8Array) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  const hit = visit(obj, key);
  if (hit) {
    return hit;
  }
  for (const [k, v] of Object.entries(obj)) {
    const r = walkObjects(v, visit, k);
    if (r) {
      return r;
    }
  }
  return null;
}

const GEO_TYPE = /geo|venue|pageblockmap/i;

const MCP_INPUT_MEDIA = new Set([
  "inputmediauploadedphoto",
  "inputmediauploadeddocument",
  "inputmediaphoto",
  "inputmediadocument",
  "inputmediapoll",
  "inputmediadice",
]);

const INPUT_MEDIA_KEYS = new Set([
  "media",
  "attachedMedia",
  "solutionMedia",
  "extendedMedia",
  "invoiceMedia",
  "newMedia",
]);

function mcpMediaRefusal(value: unknown): string | null {
  const refuse = (type: string) =>
    `Refused over MCP: ${type} is not a media type MCP sends; it may send an uploaded or existing photo or document, a poll or a dice.`;
  const visit = (v: unknown): string | null => {
    if (Array.isArray(v)) {
      for (const x of v) {
        const r = visit(x);
        if (r) {
          return r;
        }
      }
      return null;
    }
    if (!v || typeof v !== "object" || v instanceof Uint8Array) {
      return null;
    }
    for (const [k, x] of Object.entries(v)) {
      if (INPUT_MEDIA_KEYS.has(k) && x != null && x !== false) {
        for (const m of Array.isArray(x) ? x : [x]) {
          const type = m && typeof m === "object" ? typeNameOf(m) : undefined;
          if (!type || !MCP_INPUT_MEDIA.has(type.toLowerCase())) {
            return refuse(type ?? `a ${typeof m} in "${k}"`);
          }
        }
      }
      const r = visit(x);
      if (r) {
        return r;
      }
    }
    return null;
  };
  return visit(value);
}

/**
 * Params an allowlisted method may carry that go beyond what MCP allows, refused over MCP (TG_MCP
 * or TG_READ_ONLY) in every write mode. Checked on the prototype-free params in runApiMethod and
 * again on the built request in invokeApi; null in a terminal or when nothing matches.
 */
export function mcpParamRefusal(
  name: string,
  params?: Record<string, unknown>
): string | null {
  if (!process.env.TG_MCP && !process.env.TG_READ_ONLY) {
    return null;
  }
  if (!params) {
    return null;
  }
  const lower = name.toLowerCase();
  if (isSet(params, "allowPaidFloodskip")) {
    return "Refused over MCP: allowPaidFloodskip pays to skip the flood limit; do it in a terminal.";
  }
  const nested = walkObjects(params, (obj, key) => {
    const type = typeNameOf(obj)?.toLowerCase();
    if (
      (type === "suggestedpost" || key === "suggestedPost") &&
      obj.price != null
    ) {
      return "Refused over MCP: a suggested post with a price is paid by the user when the channel accepts it; do it in a terminal.";
    }
    if (type === "inputmediastakedice") {
      return "Refused over MCP: a dice with a stake bets TON; do it in a terminal.";
    }
    if (type && GEO_TYPE.test(type)) {
      return "Refused over MCP: this carries a geographic location (a geo point, venue or map block).";
    }
    return null;
  });
  if (nested) {
    return nested;
  }
  const media = mcpMediaRefusal(params);
  if (media) {
    return media;
  }
  if (
    lower === "contacts.resolveusername" &&
    isSet(params, "referer") &&
    params.referer !== ""
  ) {
    return "Refused over MCP: referer imports an affiliate link; resolve the username without it.";
  }
  if (
    lower === "messages.exportchatinvite" &&
    isSet(params, "subscriptionPricing")
  ) {
    return "Refused over MCP: subscriptionPricing makes joining paid; create the link without it, or in a terminal.";
  }
  if (
    (lower === "contacts.block" || lower === "contacts.unblock") &&
    isSet(params, "myStoriesFrom")
  ) {
    return "Refused over MCP: myStoriesFrom changes who sees your stories; do it in a terminal.";
  }
  if (lower === "messages.getbotcallbackanswer" && isSet(params, "password")) {
    return "Refused over MCP: a button protected by the 2FA password is pressed in a terminal.";
  }
  if (lower === "messages.getmessagesviews" && isSet(params, "increment")) {
    return "Refused over MCP: increment adds a view; read the counters with increment=false.";
  }
  return null;
}

/**
 * A deep copy of request params made of prototype-free objects, so no field can be inherited (a JSON
 * `"__proto__"` key stays an own key, which the TL constructor ignores).
 */
export function plainParams<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => plainParams(v)) as T;
  }
  if (
    value &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  ) {
    const out = Object.create(null) as Record<string, unknown>;
    for (const [k, v] of Object.entries(value)) {
      out[k] = plainParams(v);
    }
    return out as T;
  }
  return value;
}

const REFUSED_NAMESPACES: Record<string, string> = {
  auth: "Refused: login and session management must go through `telegram auth` / `telegram onboard` in a terminal, never through the api command, a generated API command, or MCP.",
};

const ALWAYS_REFUSED = new Map<string, string>([
  ["account.deleteaccount", "Refused: deleting the account is irreversible."],
  ["account.resetauthorization", "Refused: terminating a login session."],
  [
    "account.resetwebauthorization",
    "Refused: terminating a web-login session.",
  ],
  [
    "account.resetwebauthorizations",
    "Refused: terminating all web-login sessions.",
  ],
  [
    "account.setauthorizationttl",
    "Refused: changing how long other sessions stay logged in is security-sensitive.",
  ],
  [
    "account.changeauthorizationsettings",
    "Refused: changing a session's settings is security-sensitive.",
  ],
  [
    "account.updatepasswordsettings",
    "Refused: changing the 2FA password is security-sensitive; do it in an official client.",
  ],
  [
    "account.resetpassword",
    "Refused: resetting the 2FA password is security-sensitive.",
  ],
  [
    "account.declinepasswordreset",
    "Refused: 2FA password-reset management is security-sensitive.",
  ],
  [
    "account.getpasswordsettings",
    "Refused: this reveals 2FA password settings and needs the password.",
  ],
  ["account.gettmppassword", "Refused: this mints a temporary password token."],
  [
    "account.confirmpasswordemail",
    "Refused: 2FA recovery-email management is security-sensitive; do it in an official client.",
  ],
  [
    "account.resendpasswordemail",
    "Refused: 2FA recovery-email management is security-sensitive; do it in an official client.",
  ],
  [
    "account.cancelpasswordemail",
    "Refused: 2FA recovery-email management is security-sensitive; do it in an official client.",
  ],
  [
    "account.initpasskeyregistration",
    "Refused: registering a passkey adds a way to log in to the account; do it in an official client.",
  ],
  [
    "account.registerpasskey",
    "Refused: registering a passkey adds a way to log in to the account; do it in an official client.",
  ],
  [
    "account.deletepasskey",
    "Refused: deleting a passkey removes a way to log in to the account; do it in an official client.",
  ],
  [
    "account.changephone",
    "Refused: changing the account phone number is security-sensitive.",
  ],
  [
    "account.sendchangephonecode",
    "Refused: part of changing the account phone number.",
  ],
  [
    "account.confirmphone",
    "Refused: phone-number confirmation is security-sensitive.",
  ],
  [
    "account.sendconfirmphonecode",
    "Refused: phone-number confirmation is security-sensitive.",
  ],
  [
    "account.sendverifyphonecode",
    "Refused: phone-number verification is security-sensitive.",
  ],
  [
    "account.verifyphone",
    "Refused: phone-number verification is security-sensitive.",
  ],
  [
    "account.sendverifyemailcode",
    "Refused: email verification is security-sensitive.",
  ],
  ["account.verifyemail", "Refused: email verification is security-sensitive."],
  [
    "account.inittakeoutsession",
    "Refused: starting a data-export (takeout) session.",
  ],
  ["account.finishtakeoutsession", "Refused: takeout-session management."],
  [
    "account.acceptauthorization",
    "Refused: Telegram Passport — this shares identity documents.",
  ],
  [
    "account.savesecurevalue",
    "Refused: Telegram Passport — this stores identity documents.",
  ],
  [
    "account.deletesecurevalue",
    "Refused: Telegram Passport identity-document management.",
  ],
  [
    "account.getallsecurevalues",
    "Refused: Telegram Passport — this reveals identity data (phone, email, documents).",
  ],
  [
    "account.getsecurevalue",
    "Refused: Telegram Passport — this reveals identity data (phone, email, documents).",
  ],
  [
    "account.getauthorizationform",
    "Refused: Telegram Passport — this reveals identity data (phone, email, documents).",
  ],
  [
    "account.setprivacy",
    "Refused: changing privacy rules can expose your phone number or let strangers add you; do it in an official client.",
  ],
  [
    "account.updatebusinesslocation",
    "Refused: this shares a geographic location.",
  ],
  [
    "channels.editlocation",
    "Refused: this sets (shares) a geographic location.",
  ],
  [
    "contacts.getlocated",
    "Refused: this publishes your geolocation to find people nearby.",
  ],
  [
    "contacts.acceptcontact",
    "Refused: accepting a contact shares your phone number.",
  ],
  [
    "messages.accepturlauth",
    "Refused: this logs into an external website with your account.",
  ],
  [
    "messages.requesturlauth",
    "Refused: this is part of logging into an external website.",
  ],
  [
    "messages.checkurlauthmatchcode",
    "Refused: this completes a url-auth login.",
  ],
  [
    "messages.getemojiurl",
    "Refused: this returns a link that logs into the translation platform with your account.",
  ],
  [
    "channels.editcreator",
    "Refused: transferring ownership needs the 2FA password. Use `telegram transfer-owner`.",
  ],
  [
    "messages.editchatcreator",
    "Refused: transferring ownership needs the 2FA password. Use `telegram transfer-owner`.",
  ],
  [
    "payments.getstarsrevenuewithdrawalurl",
    "Refused: this mints a URL that can withdraw Stars revenue.",
  ],
  [
    "payments.getstargiftwithdrawalurl",
    "Refused: this mints a URL that can withdraw a star gift.",
  ],
  [
    "payments.getstarsrevenueadsaccounturl",
    "Refused: this mints a URL into the Stars ad account.",
  ],
  [
    "payments.resolvestargiftoffer",
    "Refused: resolving/redeeming a star-gift offer is a paying action.",
  ],
  [
    "messages.sendpaidreaction",
    "Refused: a paid reaction spends Stars; send it in an official client.",
  ],
  [
    "phone.getgroupcallstreamrtmpurl",
    "Refused: this mints a stream key (a credential).",
  ],
]);

const WRAPPERS = new Set([
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
  "invokewithrecaptcha",
]);

const SHARED_MEDIA =
  /InputMediaContact|InputMediaGeoPoint|InputMediaGeoLive|InputMediaVenue/i;

function nestedTypeNames(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) {
      nestedTypeNames(v, out);
    }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if ((k === "_" || k === "className") && typeof v === "string") {
        out.push(v);
      } else {
        nestedTypeNames(v, out);
      }
    }
  }
  return out;
}

/**
 * Should the call be refused? `params` enables param-level checks (sharing a contact/geo media,
 * or AddContact with a phone-privacy exception). Returns a reason, or null if allowed.
 */
export function apiRefusalReason(
  name: string,
  params?: Record<string, unknown>
): string | null {
  const lower = name.toLowerCase();
  if (WRAPPERS.has(lower)) {
    return "Refused: wrapper requests (InvokeWithLayer, InvokeWithoutUpdates, InitConnection, …) can carry any other request; call the inner method directly.";
  }
  const nsRefusal = REFUSED_NAMESPACES[NAMESPACE(lower)];
  if (nsRefusal) {
    return nsRefusal;
  }
  const fixed = ALWAYS_REFUSED.get(lower);
  if (fixed) {
    return fixed;
  }
  if (NAMESPACE(lower) === "payments" && !isApiReadMethod(name)) {
    return "Refused: payment / Stars-spending methods are never run. Read-only payments methods (balances, transactions) are allowed.";
  }
  if (params) {
    for (const inner of nestedTypeNames(params)) {
      const innerLower = inner.toLowerCase();
      const innerRefusal =
        REFUSED_NAMESPACES[NAMESPACE(innerLower)] ??
        ALWAYS_REFUSED.get(innerLower);
      if (innerRefusal) {
        return innerRefusal;
      }
    }
    if (lower === "contacts.addcontact" && params.addPhonePrivacyException) {
      return "Refused: addPhonePrivacyException shares your phone number with this contact.";
    }
    const geo = geoParamRefusal(name, params);
    if (geo) {
      return geo;
    }
    if (
      (lower === "messages.sendmedia" ||
        lower === "messages.editmessage" ||
        lower === "messages.sendmultimedia") &&
      SHARED_MEDIA.test(JSON.stringify(params))
    ) {
      return "Refused: this sends a contact card or a geographic location.";
    }
  }
  return null;
}

/**
 * Coordinates in the params of an otherwise allowed request are refused everywhere (read tool and
 * `--read-only` included), like the other location refusals (geo media, GetLocated, EditLocation):
 * - `messages.GetInlineBotResults` with `geoPoint` hands the user's coordinates to the bot; an
 *   inline query without one is a plain write (the bot still gets the query and the user's ID);
 * - `channels.CreateChannel` with `geoPoint` or `address` creates a public geo group at that
 *   place; a plain channel or group is still created.
 * Also checked on the built request in invokeApi.
 */
export function geoParamRefusal(
  name: string,
  params: Record<string, unknown>
): string | null {
  const lower = name.toLowerCase();
  const has = (key: string) =>
    Object.hasOwn(params, key) && params[key] != null && params[key] !== "";
  if (lower === "messages.getinlinebotresults" && has("geoPoint")) {
    return "Refused: geoPoint sends your location to the inline bot; query it without coordinates.";
  }
  if (
    lower === "channels.createchannel" &&
    (has("geoPoint") || has("address"))
  ) {
    return "Refused: geoPoint/address publish a location for the new group; create it without them.";
  }
  return null;
}

/**
 * - `ctor`: The request constructor.
 * - `className`: Canonical `namespace.Method` (or `Method` for a top-level request).
 */
export interface ResolvedApiMethod {
  ctor: new (
    args: Record<string, unknown>
  ) => InstanceType<typeof Api.messages.GetHistory>;
  className: string;
}

const NAMESPACES = [
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
  "ephemeral",
];

function isRequestCtor(value: unknown): value is ResolvedApiMethod["ctor"] {
  const c = value as { classType?: string; className?: string } | undefined;
  return (
    typeof value === "function" &&
    c?.classType === "request" &&
    typeof c.className === "string"
  );
}

/**
 * Resolve a user-typed `namespace.Method` (case-insensitive) to its request constructor.
 * Accepts top-level requests (e.g. `InvokeWithLayer`) too. Throws a helpful error otherwise.
 */
export function resolveApiMethod(name: string): ResolvedApiMethod {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error(
      'Specify a method, e.g. "messages.GetHistory" or "help.GetConfig".'
    );
  }
  const dot = trimmed.indexOf(".");
  const api = Api as unknown as Record<string, unknown>;

  if (dot === -1) {
    const ctor = findCaseInsensitive(api, trimmed);
    if (ctor && isRequestCtor(ctor)) {
      return { ctor, className: ctorName(ctor) };
    }
    throw new Error(
      `Unknown method "${name}". Top-level requests look like "InvokeWithLayer"; most methods are namespaced, e.g. "messages.GetHistory".`
    );
  }

  const ns = trimmed.slice(0, dot);
  const method = trimmed.slice(dot + 1);
  const nsKey = NAMESPACES.find((n) => n.toLowerCase() === ns.toLowerCase());
  if (!nsKey) {
    throw new Error(
      `Unknown namespace "${ns}". Known namespaces: ${NAMESPACES.join(", ")}.`
    );
  }
  const nsObj = api[nsKey] as Record<string, unknown> | undefined;
  const ctor = nsObj && findCaseInsensitive(nsObj, method);
  if (ctor && isRequestCtor(ctor)) {
    return { ctor, className: ctorName(ctor) };
  }
  throw new Error(
    `Unknown method "${nsKey}.${method}". It is not a request in this TL layer.`
  );
}

function ctorName(ctor: ResolvedApiMethod["ctor"]): string {
  return (ctor as unknown as { className: string }).className;
}

function findCaseInsensitive(
  obj: Record<string, unknown>,
  key: string
): unknown {
  if (key in obj) {
    return obj[key];
  }
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) {
      return obj[k];
    }
  }
  return undefined;
}
