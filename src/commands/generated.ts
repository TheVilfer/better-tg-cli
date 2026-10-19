import { Command, Option } from 'commander';
import { readFileSync } from 'node:fs';
import apiDefinitions from 'teleproto/tl/generated/api-definitions.js';
import { runApiMethod } from '../api-run.js';
import { apiRefusalReason } from '../api-methods.js';
import chalk from '../colors.js';
import {
  isGeneratedNamespace,
  namespaceMethodList,
  namespaceCounts,
  methodClassName,
  rootMethodClassName,
  rootMethods,
  kebabCase,
} from '../generated-registry.js';

/**
 * A dedicated command for every one of teleproto's TL schema methods (issue #47), in the standard
 * top-level form: `telegram <namespace> <method>` (e.g. `telegram messages get-history`) and
 * `telegram <method>` for the root-level invoke/transport wrappers (e.g. `telegram ping`). The name
 * mapping is the checked-in src/generated/tl-commands.ts; parameter types are read here from the TL
 * schema that is already bundled, so nothing extra is shipped. Execution goes through the exact same
 * path as `api` (runApiMethod → same refusals, read/write guard, audit).
 *
 * Registration is lazy (registerGeneratedCommands): only the namespace/method actually on the
 * command line is built, so startup, top-level `--help` and `help-all` stay fast and uncluttered.
 * Where a namespace name collides with a curated command (auth, stories, contacts, stats, folders,
 * help) the curated command keeps its behaviour and the generated methods attach to it as
 * subcommands — picked only when the first operand exactly equals a generated method name.
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
 * `messages get-history --peer @x --limit 20` works without spelling out every zeroed cursor.
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

/**
 * One leaf command for a single TL method. `nsKebab` is '' for a root method. `withFlags` builds the
 * typed flags + action; without it the leaf is name/description only (for a namespace's help list).
 */
export function buildLeaf(nsKebab: string, methodKebab: string, className: string, withFlags: boolean): Command {
  const d = defByClassName.get(className);
  // Param-independent hard refusal (auth.*, account/session/2FA/phone, paying, location sharing…).
  // Param-dependent refusals (sharing contact/geo media) still fire later in runApiMethod.
  const refusal = apiRefusalReason(className);
  const base = `Call ${className}${d?.result ? ` → ${d.result}` : ''}`;
  const leaf = new Command(methodKebab).description(refusal ? `${base} [always refused]` : base);
  if (!withFlags) {
    // Name + description only, for a namespace's `--help` listing. The invoked method is always
    // built with flags by registerGeneratedCommands, so this branch only ever renders help.
    leaf.allowUnknownOption(true).allowExcessArguments(true).action(() => leaf.help());
    return leaf;
  }
  for (const p of paramsOf(className)) leaf.addOption(optionFor(p));
  leaf.option('--json-params <json>', 'Extra params as a JSON object ("-" reads JSON from stdin); typed flags override it');
  leaf.option('--json', 'Accepted for consistency; API output is always JSON');
  leaf.option('--write', 'Acknowledge this is a write (optional; writes still need write access)');
  leaf.addHelpText('after', refusal ? `\nAlways refused: ${refusal}\n${LEAF_HELP}` : LEAF_HELP);
  const auditCommand = nsKebab ? `${nsKebab} ${methodKebab}` : methodKebab;
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
    await runApiMethod(className, params, { auditCommand });
  });
  return leaf;
}

/** A namespace group command (`telegram messages …`) with one leaf per method; `focusMethod` gets flags. */
function buildNamespaceGroup(nsKebab: string, focusMethod?: string): Command {
  const methods = namespaceMethodList(nsKebab);
  const group = new Command(nsKebab).description(`${nsKebab}.* — ${methods.length} TL API methods`);
  for (const [, methodKebab, className] of methods) {
    group.addCommand(buildLeaf(nsKebab, methodKebab, className, methodKebab === focusMethod));
  }
  group.action(() => group.help());
  return group;
}

/** Wrapped "ns count" tokens for the help summary. */
function wrapNamespaceList(): string[] {
  const tokens = namespaceCounts().map(({ ns, count }) => `${ns} ${count}`);
  const lines: string[] = [];
  let line = ' ';
  for (const t of tokens) {
    if ((line + ' ' + t).length > 92) { lines.push(line); line = ' '; }
    line += ' ' + t;
  }
  if (line.trim()) lines.push(line);
  return lines;
}

/** The "Telegram API" section shown under top-level `--help` and `help-all`. */
export function generatedSummaryLines(): string[] {
  return [
    'Telegram API — a dedicated command for every TL method (telegram <namespace> <method>):',
    ...wrapNamespaceList(),
    "  Run `telegram <namespace> --help` to list a namespace's methods.",
    `  Root-level API methods are top-level commands too (e.g. ${rootMethods().slice(0, 3).map(m => m[1]).join(', ')}, … — ${rootMethods().length}).`,
  ];
}

/** Short pointer appended to a clash command's `--help`, listing its generated API methods. */
function clashPointer(ns: string): string {
  const names = namespaceMethodList(ns).map(m => m[1]);
  const wrapped: string[] = [];
  let line = ' ';
  for (const n of names) {
    if ((line + ' ' + n).length > 92) { wrapped.push(line); line = ' '; }
    line += ' ' + n;
  }
  if (line.trim()) wrapped.push(line);
  return [
    '',
    `Generated API methods (telegram ${ns} <method>, picked only on an exact method name):`,
    ...wrapped,
    `Run \`telegram ${ns} <method> --help\` for a method's flags.`,
  ].join('\n');
}

/** The custom `help` command (commander's built-in is disabled): show help for a command/namespace,
 * while `telegram help <help-method>` runs that help.* method (added as a subcommand on demand). */
export function buildHelpCommand(program: Command): Command {
  const help = new Command('help')
    .description('Show help for a command or namespace, or run a help.* API method (e.g. help get-config)')
    .argument('[topic]', 'command name, namespace, or help.* method')
    .allowUnknownOption(true)
    .action((topic?: string) => {
      if (!topic) { program.outputHelp(); return; }
      const curated = program.commands.find(c => c.name() === topic);
      if (curated) { curated.outputHelp(); return; }
      if (isGeneratedNamespace(topic)) { buildNamespaceGroup(topic).outputHelp(); return; }
      const rootClass = rootMethodClassName(topic);
      if (rootClass) { buildLeaf('', topic, rootClass, true).outputHelp(); return; }
      console.error(`Unknown help topic "${topic}". Run "telegram --help" or "telegram help-all".`);
      process.exit(1);
    });
  return help;
}

/**
 * Attach the generated commands to `program`, lazily, before `program.parse`. Always adds the help
 * summary and the clash-command pointers (cheap text). Then, for the command actually on `argv`,
 * builds just that namespace/method or root method:
 *  - a namespace with a curated command of the same name (clash): the generated method is added as a
 *    subcommand only when the first operand exactly equals a method name (else the curated command
 *    keeps the operand);
 *  - a namespace with no curated command: a fresh group is added (the invoked method gets its flags);
 *  - a root method kebab: a top-level leaf.
 */
export function registerGeneratedCommands(program: Command, argv: string[]): void {
  program.addHelpText('after', '\n' + generatedSummaryLines().join('\n'));
  for (const { ns } of namespaceCounts()) {
    const curated = program.commands.find(c => c.name() === ns);
    if (curated) curated.addHelpText('after', clashPointer(ns));
  }

  const cmd = argv[2];
  if (!cmd || cmd.startsWith('-')) return;
  const next = argv[3];
  const method = next && !next.startsWith('-') ? next : undefined;

  if (isGeneratedNamespace(cmd)) {
    const curated = program.commands.find(c => c.name() === cmd);
    if (curated) {
      // Clash namespace: only hijack the operand when it is exactly a generated method name.
      if (method) {
        const className = methodClassName(cmd, method);
        if (className) curated.addCommand(buildLeaf(cmd, method, className, true));
      }
    } else {
      program.addCommand(buildNamespaceGroup(cmd, method));
    }
    return;
  }
  const rootClass = rootMethodClassName(cmd);
  if (rootClass) program.addCommand(buildLeaf('', cmd, rootClass, true));
}
