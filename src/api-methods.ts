import { Api } from 'teleproto';

/**
 * Read/write classification and hard refusals for the generic `api` command, which can invoke any
 * TL method from teleproto's schema. A schema method carries no read/write flag, so the safe
 * default is "write unless it is clearly a read" (issue #47). This module is the single source of
 * truth, shared by the command (guard + audit) and by the MCP read/write split (src/mcp.ts).
 */

/** Method part of a `namespace.Method` (or the whole name for a top-level request). */
function methodPart(name: string): string {
  const dot = name.indexOf('.');
  return dot < 0 ? name : name.slice(dot + 1);
}

const NAMESPACE = (name: string): string => {
  const dot = name.indexOf('.');
  return dot < 0 ? '' : name.slice(0, dot);
};

/** Read-only prefixes: these methods, by default, only fetch data. */
const READ_PREFIX = /^(get|check|search|resolve)/;

/**
 * Named like a read (`Get…`/`Check…`) but it actually changes state, so it is a write. Audited
 * from the schema; the user-facing list lives in docs/api-coverage.md.
 */
const FORCE_WRITE = new Set([
  'messages.getbotcallbackanswer', // presses a bot button
  'ephemeral.getcallbackanswer',
  'messages.getmessagesviews', // increments the view counter when `increment` is set
]);

/** Reads whose name does not start with a read prefix (none needed today; kept for review). */
const EXTRA_READ = new Set<string>([]);

/** True if the method only reads data and may run through the MCP read tool. Case-insensitive. */
export function isApiReadMethod(name: string): boolean {
  const lower = name.toLowerCase();
  if (FORCE_WRITE.has(lower)) return false;
  if (EXTRA_READ.has(lower)) return true;
  return READ_PREFIX.test(methodPart(lower));
}

/**
 * Whole namespaces refused through the generic `api` command regardless of read/write:
 * `auth.*` is login / session management (belongs to `telegram auth` / `onboard`, never automated).
 */
const REFUSED_NAMESPACES: Record<string, string> = {
  auth: 'Refused: login and session management must go through `telegram auth` / `telegram onboard` in a terminal, never the generic api command.',
};

/**
 * Methods refused outright, even with write access — the categories issue #47 and `click` refuse:
 * account/session takeover, 2FA / password / phone changes, data-export (takeout), Telegram
 * Passport (identity docs), sharing the phone number or location, money-withdrawal tokens, and
 * chat-ownership transfer. Paying is handled separately (any non-read `payments.*`).
 */
const ALWAYS_REFUSED = new Map<string, string>([
  ['account.deleteaccount', 'Refused: deleting the account is irreversible.'],
  // Session / authorization takeover
  ['account.resetauthorization', 'Refused: terminating a login session.'],
  ['account.resetwebauthorization', 'Refused: terminating a web-login session.'],
  ['account.resetwebauthorizations', 'Refused: terminating all web-login sessions.'],
  ['account.setauthorizationttl', 'Refused: changing how long other sessions stay logged in is security-sensitive.'],
  ['account.changeauthorizationsettings', 'Refused: changing a session\'s settings is security-sensitive.'],
  // 2FA / password
  ['account.updatepasswordsettings', 'Refused: changing the 2FA password is security-sensitive; do it in an official client.'],
  ['account.resetpassword', 'Refused: resetting the 2FA password is security-sensitive.'],
  ['account.declinepasswordreset', 'Refused: 2FA password-reset management is security-sensitive.'],
  ['account.getpasswordsettings', 'Refused: this reveals 2FA password settings and needs the password.'],
  ['account.gettmppassword', 'Refused: this mints a temporary password token.'],
  // Phone / email number changes and verification
  ['account.changephone', 'Refused: changing the account phone number is security-sensitive.'],
  ['account.sendchangephonecode', 'Refused: part of changing the account phone number.'],
  ['account.confirmphone', 'Refused: phone-number confirmation is security-sensitive.'],
  ['account.sendconfirmphonecode', 'Refused: phone-number confirmation is security-sensitive.'],
  ['account.sendverifyphonecode', 'Refused: phone-number verification is security-sensitive.'],
  ['account.verifyphone', 'Refused: phone-number verification is security-sensitive.'],
  ['account.sendverifyemailcode', 'Refused: email verification is security-sensitive.'],
  ['account.verifyemail', 'Refused: email verification is security-sensitive.'],
  // Data export (takeout) and Telegram Passport (identity documents)
  ['account.inittakeoutsession', 'Refused: starting a data-export (takeout) session.'],
  ['account.finishtakeoutsession', 'Refused: takeout-session management.'],
  ['account.acceptauthorization', 'Refused: Telegram Passport — this shares identity documents.'],
  ['account.savesecurevalue', 'Refused: Telegram Passport — this stores identity documents.'],
  ['account.deletesecurevalue', 'Refused: Telegram Passport identity-document management.'],
  // Privacy that can widen phone-number / added-by-phone visibility
  ['account.setprivacy', 'Refused: changing privacy rules can expose your phone number or let strangers add you; do it in an official client.'],
  ['account.updatebusinesslocation', 'Refused: this shares a geographic location.'],
  ['channels.editlocation', 'Refused: this sets (shares) a geographic location.'],
  // Location / phone sharing via contacts
  ['contacts.getlocated', 'Refused: this publishes your geolocation to find people nearby.'],
  ['contacts.acceptcontact', 'Refused: accepting a contact shares your phone number.'],
  // Logging into external sites with the account
  ['messages.accepturlauth', 'Refused: this logs into an external website with your account.'],
  ['messages.requesturlauth', 'Refused: this is part of logging into an external website.'],
  ['messages.checkurlauthmatchcode', 'Refused: this completes a url-auth login.'],
  // Chat-ownership transfer (needs the 2FA password; use `telegram transfer-owner`)
  ['channels.editcreator', 'Refused: transferring ownership needs the 2FA password. Use `telegram transfer-owner`.'],
  ['messages.editchatcreator', 'Refused: transferring ownership needs the 2FA password. Use `telegram transfer-owner`.'],
  // Money: withdrawal / revenue-account tokens, and star-gift offer redemption
  ['payments.getstarsrevenuewithdrawalurl', 'Refused: this mints a URL that can withdraw Stars revenue.'],
  ['payments.getstargiftwithdrawalurl', 'Refused: this mints a URL that can withdraw a star gift.'],
  ['payments.getstarsrevenueadsaccounturl', 'Refused: this mints a URL into the Stars ad account.'],
  ['payments.resolvestargiftoffer', 'Refused: resolving/redeeming a star-gift offer is a paying action.'],
  // Group-call stream credentials
  ['phone.getgroupcallstreamrtmpurl', 'Refused: this mints a stream key (a credential).'],
]);

/** Media classes that share your phone number or location — refused in SendMedia/EditMessage. */
const SHARED_MEDIA = /InputMediaContact|InputMediaGeoPoint|InputMediaGeoLive|InputMediaVenue/;

/**
 * Should the call be refused? `params` enables param-level checks (sharing a contact/geo media,
 * or AddContact with a phone-privacy exception). Returns a reason, or null if allowed.
 */
export function apiRefusalReason(name: string, params?: Record<string, unknown>): string | null {
  const lower = name.toLowerCase();
  const nsRefusal = REFUSED_NAMESPACES[NAMESPACE(lower)];
  if (nsRefusal) return nsRefusal;
  const fixed = ALWAYS_REFUSED.get(lower);
  if (fixed) return fixed;
  // Paying stays refused; read-only payments (balances, transactions) are allowed.
  if (NAMESPACE(lower) === 'payments' && !isApiReadMethod(name)) {
    return 'Refused: payment / Stars-spending methods are never run. Read-only payments methods (balances, transactions) are allowed.';
  }
  if (params) {
    if (lower === 'contacts.addcontact' && params.addPhonePrivacyException) {
      return 'Refused: addPhonePrivacyException shares your phone number with this contact.';
    }
    if ((lower === 'messages.sendmedia' || lower === 'messages.editmessage' || lower === 'messages.sendmultimedia') && SHARED_MEDIA.test(JSON.stringify(params))) {
      return 'Refused: this sends a contact card or a geographic location.';
    }
  }
  return null;
}

export interface ResolvedApiMethod {
  /** The request constructor. */
  ctor: new (args: Record<string, unknown>) => InstanceType<typeof Api.messages.GetHistory>;
  /** Canonical `namespace.Method` (or `Method` for a top-level request). */
  className: string;
}

/** TL namespaces that hold request classes (the schema's request namespaces). */
const NAMESPACES = [
  'auth', 'account', 'users', 'contacts', 'messages', 'updates', 'photos', 'upload', 'help',
  'channels', 'bots', 'payments', 'stickers', 'phone', 'stats', 'stories', 'premium', 'smsjobs',
  'fragment', 'chatlists', 'folders', 'langpack', 'aicompose', 'communities', 'ephemeral',
];

/** Does an object look like a request constructor (not a plain TL constructor)? */
function isRequestCtor(value: unknown): value is ResolvedApiMethod['ctor'] {
  const c = value as { classType?: string; className?: string } | undefined;
  return typeof value === 'function' && c?.classType === 'request' && typeof c.className === 'string';
}

/**
 * Resolve a user-typed `namespace.Method` (case-insensitive) to its request constructor.
 * Accepts top-level requests (e.g. `InvokeWithLayer`) too. Throws a helpful error otherwise.
 */
export function resolveApiMethod(name: string): ResolvedApiMethod {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Specify a method, e.g. "messages.GetHistory" or "help.GetConfig".');
  const dot = trimmed.indexOf('.');
  const api = Api as unknown as Record<string, unknown>;

  if (dot < 0) {
    const ctor = findCaseInsensitive(api, trimmed);
    if (ctor && isRequestCtor(ctor)) return { ctor, className: ctorName(ctor) };
    throw new Error(`Unknown method "${name}". Top-level requests look like "InvokeWithLayer"; most methods are namespaced, e.g. "messages.GetHistory".`);
  }

  const ns = trimmed.slice(0, dot);
  const method = trimmed.slice(dot + 1);
  const nsKey = NAMESPACES.find(n => n.toLowerCase() === ns.toLowerCase());
  if (!nsKey) {
    throw new Error(`Unknown namespace "${ns}". Known namespaces: ${NAMESPACES.join(', ')}.`);
  }
  const nsObj = api[nsKey] as Record<string, unknown> | undefined;
  const ctor = nsObj && findCaseInsensitive(nsObj, method);
  if (ctor && isRequestCtor(ctor)) return { ctor, className: ctorName(ctor) };
  throw new Error(`Unknown method "${nsKey}.${method}". It is not a request in this TL layer.`);
}

function ctorName(ctor: ResolvedApiMethod['ctor']): string {
  return (ctor as unknown as { className: string }).className;
}

function findCaseInsensitive(obj: Record<string, unknown>, key: string): unknown {
  if (key in obj) return obj[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) if (k.toLowerCase() === lower) return obj[k];
  return undefined;
}
