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

/** Read-only prefixes: these methods only fetch data. */
const READ_PREFIX = /^(get|check|search|resolve)/;

/** `Get…`/`Check…` named methods that actually change something, so they are writes. */
const FORCE_WRITE = new Set([
  'messages.getbotcallbackanswer', // presses a bot button
  'ephemeral.getcallbackanswer',
  'messages.checkurlauthmatchcode', // completes a url-auth login
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
 * Methods refused outright, even with write access — the same categories `click` refuses:
 * account deletion, session termination, 2FA/password changes, and sharing location. Paying is
 * handled separately (any non-read `payments.*`). Returns a reason, or null if allowed.
 */
const ALWAYS_REFUSED = new Map<string, string>([
  ['account.deleteaccount', 'Refused: deleting the account is irreversible.'],
  ['auth.logout', 'Refused: terminating this session. Use `telegram logout` in a terminal instead.'],
  ['auth.resetauthorizations', 'Refused: this logs out every other session.'],
  ['account.resetauthorization', 'Refused: terminating a login session.'],
  ['account.resetwebauthorization', 'Refused: terminating a web-login session.'],
  ['account.resetwebauthorizations', 'Refused: terminating all web-login sessions.'],
  ['account.updatepasswordsettings', 'Refused: changing the 2FA password is a security-sensitive action; do it in an official client.'],
  ['account.resetpassword', 'Refused: resetting the 2FA password is security-sensitive.'],
  ['account.declinepasswordreset', 'Refused: 2FA password-reset management is security-sensitive.'],
  ['account.updatebusinesslocation', 'Refused: this shares a geographic location.'],
  ['channels.editlocation', 'Refused: this sets (shares) a geographic location.'],
]);

export function apiRefusalReason(name: string): string | null {
  const lower = name.toLowerCase();
  const fixed = ALWAYS_REFUSED.get(lower);
  if (fixed) return fixed;
  // Paying stays refused; read-only payments (balances, transactions) are allowed.
  if (NAMESPACE(lower) === 'payments' && !isApiReadMethod(name)) {
    return 'Refused: payment / Stars-spending methods are never run. Read-only payments methods (balances, transactions) are allowed.';
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
