/**
 * The rules of setup contract schema 1 (docs/setup-contract.md) as a checker for the fixtures and
 * the doc's examples. Kept out of src/ on purpose (#110: src/setup-contract.ts is types only); the
 * first command that emits the contract moves what it needs into src/ with it.
 */
import type { Problem, SetupExitCode, SetupResult } from '../src/setup-contract.js';

export const SETUP_SCHEMA = 1;
export const SETUP_EXIT = { ok: 0, error: 1, needsHuman: 2, needsApproval: 3 } as const satisfies Record<string, SetupExitCode>;
export const TERMINAL_EVENTS = ['done', 'error', 'timeout'] as const;

/**
 * Commands a `fix.run` may name: the exact subcommand path and the flags allowed after it (`bool`
 * takes no value, `values` one or more plain values). Positional arguments are not allowed. Later
 * PRs add their own entries (`doctor --fix`, `connect --refresh`). Never here: anything that
 * changes write authority or credentials (`write-access`, `auth`, `logout`), `onboard` (its local
 * page carries a secret that sets the write mode), `update` (it runs the system package manager,
 * a global npm install or a source build, outside any profile), `mcp`, `api`, any Telegram write,
 * and `skill install --force`.
 */
export const RUN_ALLOWLIST: readonly { command: readonly string[]; flags: Readonly<Record<string, 'bool' | 'values'>> }[] = [
  { command: ['skill', 'install'], flags: { '--agent': 'values', '--json': 'bool' } },
];

const ID = /^[a-z][a-z0-9_]*$/;
const PROFILE = /^[a-z0-9][a-z0-9-]{0,31}$/; // the TG_PROFILE rule of src/paths.ts
const PLAIN_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:@/-]*$/;

/** Why `argv` is not an allowed `fix.run`, or null when it is. */
export function runRefusal(argv: unknown): string | null {
  if (!Array.isArray(argv) || argv.length === 0) return 'run must be a non-empty argv array';
  if (!argv.every(a => typeof a === 'string')) return 'run must hold only strings';
  const entry = RUN_ALLOWLIST.find(e => e.command.every((c, i) => argv[i] === c));
  if (!entry) return `"${argv.slice(0, 2).join(' ')}" is not an allowed command`;
  const rest = argv.slice(entry.command.length) as string[];
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    // Own keys only: "constructor" or "__proto__" must not pass as a flag
    const kind = Object.hasOwn(entry.flags, flag) ? entry.flags[flag] : undefined;
    if (!kind) return `${flag.startsWith('-') ? 'flag' : 'argument'} "${flag}" is not allowed after "${entry.command.join(' ')}"`;
    if (kind === 'bool') continue;
    let n = 0;
    while (i + 1 < rest.length && !rest[i + 1].startsWith('-')) {
      if (!PLAIN_VALUE.test(rest[++i])) return `value "${rest[i]}" of ${flag} is not a plain value`;
      n++;
    }
    if (n === 0) return `${flag} needs a value`;
  }
  return null;
}

function fixRefusal(fix: unknown): string | null {
  if (!fix || typeof fix !== 'object' || Array.isArray(fix)) return 'fix must be an object';
  const f = fix as Record<string, unknown>;
  const kinds = ['run', 'human', 'unavailable'].filter(k => k in f);
  if (kinds.length !== 1) return 'fix must have exactly one of run, human, unavailable';
  const allowed: Record<string, string[]> = { run: ['run', 'profile', 'expect'], human: ['human', 'url'], unavailable: ['unavailable'] };
  const extra = Object.keys(f).filter(k => !allowed[kinds[0]].includes(k));
  if (extra.length) return `unexpected field ${extra[0]} in a fix of kind ${kinds[0]}`;
  if (kinds[0] === 'run') {
    const refused = runRefusal(f.run);
    if (refused) return refused;
    if (f.profile !== null && (typeof f.profile !== 'string' || !PROFILE.test(f.profile))) return 'profile must be a profile name or null';
    const expect = f.expect as Record<string, unknown> | undefined;
    if (!expect || typeof expect !== 'object' || Object.keys(expect).join() !== 'exit' || expect.exit !== 0) {
      return 'expect must be { exit: 0 }';
    }
    return null;
  }
  if (kinds[0] === 'human') {
    if (typeof f.human !== 'string' || !f.human.trim()) return 'human must be a non-empty string';
    if ('url' in f) {
      if (typeof f.url !== 'string') return 'url must be a string';
      let url: URL;
      try { url = new URL(f.url); } catch { return 'url must be an absolute URL'; }
      if (url.protocol !== 'https:') return 'url must be https';
    }
    return null;
  }
  return typeof f.unavailable === 'string' && f.unavailable.trim() ? null : 'unavailable must be a non-empty string';
}

/** Whether `value` serializes to a JSON object (not an array, not null). */
function isJsonObject(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  let json: unknown;
  try { json = JSON.parse(JSON.stringify(value) ?? 'null'); } catch { return false; }
  return !!json && typeof json === 'object' && !Array.isArray(json);
}

/** Every reason `value` is not a valid schema 1 result; empty when it is. */
export function setupResultErrors(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['result must be an object'];
  const r = value as Record<string, unknown>;
  const errors: string[] = [];
  if (r.schema !== SETUP_SCHEMA) errors.push(`schema must be ${SETUP_SCHEMA}`);
  const extra = Object.keys(r).filter(k => !['schema', 'ok', 'problems', 'data'].includes(k));
  if (extra.length) errors.push(`unexpected field ${extra[0]}`);
  // `data` is the one open field: command-specific content that only its command documents and
  // tests. Here it only has to be a plain JSON object, judged as it will appear on stdout (after
  // JSON serialization), so a Date or anything with a toJSON that is not an object is refused.
  if ('data' in r && !isJsonObject(r.data)) errors.push('data must be a JSON object');
  if (typeof r.ok !== 'boolean') errors.push('ok must be a boolean');
  if (!Array.isArray(r.problems)) return [...errors, 'problems must be an array'];
  const seen = new Set<string>();
  r.problems.forEach((p: unknown, i: number) => {
    const at = `problems[${i}]`;
    if (!p || typeof p !== 'object') { errors.push(`${at} must be an object`); return; }
    const q = p as Record<string, unknown>;
    const extraKeys = Object.keys(q).filter(k => !['id', 'severity', 'message', 'fix'].includes(k));
    if (extraKeys.length) errors.push(`${at}: unexpected field ${extraKeys[0]}`);
    if (typeof q.id !== 'string' || !ID.test(q.id)) errors.push(`${at}: id must be snake_case`);
    else if (seen.has(q.id)) errors.push(`${at}: duplicate id ${q.id}`);
    else seen.add(q.id);
    if (!['error', 'warning', 'info'].includes(q.severity as string)) errors.push(`${at}: severity must be error, warning or info`);
    if (typeof q.message !== 'string' || !q.message.trim() || q.message.includes('\n')) errors.push(`${at}: message must be one non-empty line`);
    const refused = fixRefusal(q.fix);
    if (refused) errors.push(`${at}.fix: ${refused}`);
  });
  if (typeof r.ok === 'boolean' && r.ok === r.problems.some(p => (p as Problem | null)?.severity === 'error')) {
    errors.push('ok must be true exactly when no problem has severity error');
  }
  return errors;
}

/**
 * The exit code for a valid result: 0 when ok; 1 when the agent can act (some error has a
 * `fix.run`) or nothing can fix it; 2 when every error waits for the person. Code 3 comes only
 * from the write guard, never from a result.
 */
export function setupExitCode(result: SetupResult): SetupExitCode {
  if (result.ok) return SETUP_EXIT.ok;
  const errors = result.problems.filter(p => p.severity === 'error');
  if (errors.some(p => 'run' in p.fix)) return SETUP_EXIT.error;
  return errors.every(p => 'human' in p.fix) ? SETUP_EXIT.needsHuman : SETUP_EXIT.error;
}

/** Every reason one parsed `--events v1` line is not valid; empty when it is. */
export function setupEventErrors(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['event must be an object'];
  const e = value as Record<string, unknown>;
  const errors: string[] = [];
  if (e.schema !== SETUP_SCHEMA) errors.push(`schema must be ${SETUP_SCHEMA}`);
  if (typeof e.event !== 'string' || !ID.test(e.event)) errors.push('event must be a snake_case name');
  if (e.event === 'done') errors.push(...setupResultErrors(e.result).map(m => `result: ${m}`));
  if (e.event === 'error' && (typeof e.message !== 'string' || !e.message.trim())) errors.push('error needs a message');
  return errors;
}
