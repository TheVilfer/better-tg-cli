import { Command, Option } from 'commander';
import { readFileSync } from 'node:fs';
import apiDefinitions from 'teleproto/tl/generated/api-definitions.js';
import { runApiMethod } from '../api-run.js';
import { apiRefusalReason } from '../api-methods.js';
import chalk from '../colors.js';
import { TL_METHODS } from '../generated/tl-commands.js';
import {
  isTlNamespace,
  tlNamespaceMethods,
  tlTopLevelMethods,
  tlTopLevelClassName,
  kebabCase,
} from '../tl-registry.js';

/**
 * `telegram tl <namespace> <method> [--flags]`: a dedicated command for every one of teleproto's
 * TL schema methods (issue #47 — the 823 generated commands complement the generic `api`). The
 * name mapping is the checked-in src/generated/tl-commands.ts; parameter types are read here from
 * the TL schema that is already bundled, so nothing extra is shipped. Execution goes through the
 * exact same path as `api` (runApiMethod → same refusals, read/write guard, audit), so these
 * commands never widen what the account can do.
 *
 * Registration is lazy: only the namespace actually on the command line is built (and only the
 * invoked method gets its flags), so startup and `--help`/`help-all` stay fast and uncluttered.
 */

interface RawArg {
  type: string | null;
  isVector: boolean;
  isFlag: boolean;
  flagIndicator: boolean;
}
interface RawDef {
  name: string;
  namespace?: string;
  isFunction: boolean;
  result: string;
  argsConfig: Record<string, RawArg>;
}

const defByClassName = new Map<string, RawDef>();
for (const d of apiDefinitions as unknown as RawDef[]) {
  if (!d.isFunction) continue;
  defByClassName.set(d.namespace ? `${d.namespace}.${d.name}` : d.name, d);
}

interface TlParam {
  name: string;
  kebab: string;
  type: string;
  isVector: boolean;
  optional: boolean;
  trueFlag: boolean;
}

/** Entity-like fields resolved with the same chat resolver every command uses ({_chat}). */
const PEER_TYPES = new Set(['InputPeer', 'InputUser', 'InputChannel']);

/**
 * Pure paging / cache-cursor parameter names. When one of these is a required `int`/`long` and the
 * user omits it, we default it to 0 (the schema's "start from the beginning / no cache" value), so
 * `tl messages get-history --peer @x --limit 20` works without spelling out every zeroed cursor.
 * Only these exact names, and only numeric types — never ids (msgId/id/userId), never `offsetPeer`
 * (an InputPeer), never a string `hash`/`offset`, and `limit` stays required.
 */
const CURSOR_NAMES = new Set([
  'offsetId', 'offsetDate', 'addOffset', 'offsetRate', 'offsetTopic', 'offset',
  'maxId', 'minId', 'maxDate', 'minDate', 'hash',
]);

/** A required numeric paging cursor that defaults to 0 when omitted. */
function isCursorDefault(p: TlParam): boolean {
  return !p.optional && !p.isVector && (p.type === 'int' || p.type === 'long') && CURSOR_NAMES.has(p.name);
}

/** The settable parameters of a method (the flag bitmask field is computed by teleproto, skipped). */
export function paramsOf(className: string): TlParam[] {
  const d = defByClassName.get(className);
  if (!d) return [];
  const out: TlParam[] = [];
  for (const [name, a] of Object.entries(d.argsConfig)) {
    if (a.flagIndicator) continue;
    const type = a.type ?? 'X';
    out.push({ name, kebab: kebabCase(name), type, isVector: a.isVector, optional: a.isFlag, trueFlag: type === 'true' });
  }
  return out;
}

function optionFor(p: TlParam): Option {
  const state = isCursorDefault(p) ? 'default 0' : p.optional ? 'optional' : 'required';
  const tag = `${p.type}${p.isVector ? '[]' : ''}, ${state}`;
  if (p.trueFlag) {
    const o = new Option(`--${p.kebab}`, tag);
    // Keep `--no-*` true-flags (noWebpage, noMuted…) as plain booleans that set the param true,
    // not commander negations that would store the opposite under a different key.
    o.negate = false;
    return o;
  }
  return new Option(`--${p.kebab} <value>`, tag);
}

function coerceScalar(p: TlParam, raw: unknown): unknown {
  if (PEER_TYPES.has(p.type)) return typeof raw === 'string' ? { _chat: raw } : raw;
  switch (p.type) {
    case 'int':
    case 'double': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) throw new Error(`--${p.kebab} expects a number`);
      return n;
    }
    case 'long':
    case 'int128':
    case 'int256':
      return { _bigint: String(raw) };
    case 'Bool': {
      if (typeof raw === 'boolean') return raw;
      const s = String(raw).toLowerCase();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
      throw new Error(`--${p.kebab} expects true or false`);
    }
    case 'string':
      return String(raw);
    case 'bytes': {
      const s = String(raw);
      if (s.startsWith('hex:')) return { _hex: s.slice(4) };
      if (s.startsWith('base64:')) return { _base64: s.slice(7) };
      return { _base64: s };
    }
    default:
      // Constructor/complex types (InputMedia, ReplyMarkup, DataJSON, X, …): accept per-param JSON.
      if (typeof raw !== 'string') return raw; // already an element of a parsed JSON array
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`--${p.kebab} (${p.type}) expects a JSON value, e.g. '{"_chat":"@x"}' or '{"className":"…"}'`);
      }
  }
}

function coerce(p: TlParam, raw: string): unknown {
  if (!p.isVector) return coerceScalar(p, raw);
  const list = raw.trim().startsWith('[') ? JSON.parse(raw) : raw.split(',').map((s) => s.trim()).filter((s) => s.length);
  if (!Array.isArray(list)) throw new Error(`--${p.kebab} must be a JSON array or a comma-separated list`);
  return list.map((v) => coerceScalar(p, v));
}

function baseJsonParams(opts: Record<string, unknown>): Record<string, unknown> {
  const jp = opts.jsonParams;
  if (jp === undefined) return {};
  const raw = jp === '-' ? readFileSync(0, 'utf-8') : String(jp);
  if (!raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid --json-params JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('--json-params must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

/** Build the request body from the typed flags, merged over --json-params, with a required check.
 * `opts` holds commander's camelCase option values (the TL param names). Exported for tests. */
export function buildParams(className: string, opts: Record<string, unknown>): Record<string, unknown> {
  const params = baseJsonParams(opts);
  const missing: string[] = [];
  for (const p of paramsOf(className)) {
    const v = opts[p.name];
    if (p.trueFlag) {
      if (v === true) params[p.name] = true;
    } else if (v !== undefined) {
      params[p.name] = coerce(p, String(v));
    } else if (isCursorDefault(p) && !(p.name in params)) {
      // A required paging/cache cursor the user left out: default to 0 (coerced per its type).
      params[p.name] = coerceScalar(p, '0');
    }
    // `randomId` is auto-generated by teleproto when omitted; cursors defaulted above are not missing.
    if (!p.optional && !p.trueFlag && p.name !== 'randomId' && !isCursorDefault(p) && !(p.name in params)) {
      missing.push(`--${p.kebab}`);
    }
  }
  if (missing.length) {
    throw new Error(`Missing required option(s): ${missing.join(', ')} (or supply them via --json-params).`);
  }
  return params;
}

const LEAF_HELP = [
  '',
  'Peer/user/channel flags take an ID, @username, "me" or a chat title (resolved as elsewhere).',
  'Bytes: a base64 string, or "hex:…". Vectors: a comma list or a JSON array.',
  'Constructor-typed flags and --json-params accept JSON with {"_chat":"@x"} / {"_base64":"…"} markers.',
  'Output is JSON. Read methods (Get*/Check*/Search*/Resolve*) run without write access; others need',
  '`telegram write-access on`. Account/session/2FA/phone, paying and location sharing are always refused.',
].join('\n');

function buildLeaf(methodKebab: string, className: string, withFlags: boolean): Command {
  const d = defByClassName.get(className);
  // Param-independent hard refusal (auth.*, account/session/2FA/phone, paying, location sharing…).
  // Param-dependent refusals (sharing contact/geo media) still fire later in runApiMethod.
  const refusal = apiRefusalReason(className);
  const base = `Call ${className}${d?.result ? ` → ${d.result}` : ''}`;
  const leaf = new Command(methodKebab).description(refusal ? `${base} [always refused]` : base);
  if (!withFlags) {
    // Name + description only, for a namespace's `--help` listing. The invoked method is always
    // built with flags by registerTlSubcommands, so this branch only ever renders help.
    leaf.allowUnknownOption(true).allowExcessArguments(true).action(() => leaf.help());
    return leaf;
  }
  for (const p of paramsOf(className)) leaf.addOption(optionFor(p));
  leaf.option('--json-params <json>', 'Extra params as a JSON object ("-" reads JSON from stdin); typed flags override it');
  leaf.option('--json', 'Accepted for consistency; tl output is always JSON');
  leaf.option('--write', 'Acknowledge this is a write (optional; writes still need write access)');
  leaf.addHelpText('after', refusal ? `\nAlways refused: ${refusal}\n${LEAF_HELP}` : LEAF_HELP);
  leaf.action(async (opts: Record<string, unknown>) => {
    // Refuse before validating params, so a refused method reports the refusal (not a missing flag).
    if (refusal) {
      console.error(chalk.red(refusal));
      process.exit(1);
      return;
    }
    let params: Record<string, unknown>;
    try {
      params = buildParams(className, opts);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
      return;
    }
    await runApiMethod(className, params, { auditCommand: 'tl' });
  });
  return leaf;
}

function buildNamespaceGroup(nsKebab: string, focusMethod?: string): Command {
  const methods = tlNamespaceMethods(nsKebab);
  const group = new Command(nsKebab).description(`${nsKebab}.* — ${methods.length} TL methods`);
  for (const [, methodKebab, className] of methods) {
    group.addCommand(buildLeaf(methodKebab, className, methodKebab === focusMethod));
  }
  group.action(() => group.help());
  return group;
}

/** Namespace list + counts, shown by `telegram tl` and in its `--help`. */
function rootSummary(): string {
  const counts = new Map<string, number>();
  for (const [ns] of TL_METHODS) counts.set(ns || '(top-level)', (counts.get(ns || '(top-level)') ?? 0) + 1);
  const named = [...counts.entries()].filter(([ns]) => ns !== '(top-level)').sort((a, b) => b[1] - a[1]);
  const lines: string[] = [];
  lines.push(`Every TL schema method as its own command — ${TL_METHODS.length} in total.`);
  lines.push('');
  lines.push('Usage: telegram tl <namespace> <method> [--flags]   (telegram tl <namespace> --help lists methods)');
  lines.push('       telegram tl <top-level-method> [--flags]     (invoke/transport wrappers)');
  lines.push('');
  lines.push('Namespaces:');
  for (const [ns, n] of named) lines.push(`  ${ns.padEnd(12)} ${n}`);
  lines.push(`  ${'(top-level)'.padEnd(12)} ${counts.get('(top-level)') ?? 0}`);
  lines.push('');
  lines.push('Examples:');
  lines.push('  telegram tl help get-config');
  lines.push('  telegram tl messages get-history --peer @durov --limit 10');
  lines.push('  telegram tl account get-authorizations');
  return lines.join('\n');
}

export const tlCommand = new Command('tl')
  .description('Dedicated command for every raw TL method (telegram tl <namespace> <method>; run `telegram tl` to list)')
  .argument('[path...]', 'namespace and method')
  .addHelpText('after', '\n' + rootSummary())
  .action((path: string[]) => {
    if (path.length) {
      console.error(`Unknown tl command "${path.join(' ')}". Run "telegram tl" for namespaces, or "telegram tl <namespace> --help" for its methods.`);
      process.exit(1);
      return;
    }
    console.log(rootSummary());
  });

/**
 * Build only the subcommands the current argv needs, before `program.parse`. Given the full argv,
 * finds the tokens after `tl` and attaches just the invoked namespace (with the one invoked method
 * carrying its flags) or the one top-level method. A bare `tl`, `tl --help` or an unknown token
 * adds nothing and falls back to the summary.
 */
export function registerTlSubcommands(argv: string[]): void {
  const i = argv.indexOf('tl');
  if (i < 0) return;
  const positionals: string[] = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('-'); j++) positionals.push(argv[j]);
  const [first, second] = positionals;
  if (!first) return;
  if (isTlNamespace(first)) {
    const focus = second && !second.startsWith('-') ? second : undefined;
    tlCommand.addCommand(buildNamespaceGroup(first, focus));
    return;
  }
  const className = tlTopLevelClassName(first);
  if (className) tlCommand.addCommand(buildLeaf(first, className, true));
}

// Re-exported for tests: the full count and a sanity accessor.
export const TL_METHOD_COUNT = TL_METHODS.length;
export { tlTopLevelMethods };
