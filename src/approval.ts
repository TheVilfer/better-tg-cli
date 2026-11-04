import { createHash, randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { configDir, configFile } from './paths.js';

/**
 * Approvals for write mode "ask": each write runs only with an approval of that exact action.
 *
 * Without one, the guard records a pending approval (a hash of the command, never its text) and
 * prints the action with a short code. The agent shows it to the user and, after an explicit yes,
 * runs the same command again with TG_APPROVE=<code> (over MCP: the `approval` argument). Over MCP
 * with a client that supports elicitation, the server asks the user itself and mints the approval,
 * so the model never handles a code.
 *
 * A chat code is a speed bump, not proof that a human said yes: an agent can pass the code without
 * asking. Elicitation is the stronger path, which is why the MCP server refuses chat codes when it
 * can elicit.
 */

export type ApprovedVia = 'chat' | 'elicitation';

interface Pending {
  hash: string;
  expiresAt: number;
  via: ApprovedVia;
}

export const APPROVAL_TTL_MS = 10 * 60_000;
/** Exit code of a write that is waiting for approval (distinct from errors, which exit 1). */
export const EXIT_NEEDS_APPROVAL = 3;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

function storePath(): string {
  return configFile('approvals.json');
}

function load(now: number): Record<string, Pending> {
  try {
    const all = JSON.parse(readFileSync(storePath(), 'utf8')) as Record<string, Pending>;
    // Expired entries are dropped on every read, so the file never grows
    return Object.fromEntries(Object.entries(all).filter(([, p]) => p && p.expiresAt > now));
  } catch {
    return {};
  }
}

function save(all: Record<string, Pending>): void {
  const dir = configDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(storePath(), JSON.stringify(all), { encoding: 'utf8', mode: 0o600 });
}

/**
 * What an approval covers: the arguments, the text on stdin (if the command reads "-"), and the
 * size and mtime of any argument that is an existing file (so `--file x.pdf` can't be swapped).
 */
export function actionHash(argv: string[], stdin?: string): string {
  const files = argv.map(a => {
    try {
      const st = statSync(a);
      return st.isFile() ? `${a}:${st.size}:${st.mtimeMs}` : '';
    } catch {
      return '';
    }
  });
  return createHash('sha256').update(JSON.stringify({ argv, stdin: stdin ?? null, files })).digest('hex');
}

function newCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** The command takes text from stdin ("-" or --params=-), so the approval has to cover it too. */
export function readsStdin(argv: string[]): boolean {
  return argv.some(a => a === '-' || a.endsWith('=-'));
}

/** Records a pending approval for this action and returns its code. */
export function createApproval(hash: string, via: ApprovedVia = 'chat', now = Date.now()): string {
  const all = load(now);
  let code = newCode();
  while (all[code]) code = newCode();
  all[code] = { hash, expiresAt: now + APPROVAL_TTL_MS, via };
  save(all);
  return code;
}

/**
 * Uses up an approval: it must exist, be unexpired and match this exact action. Returns how it was
 * approved, or why not. A code is single-use even when it does not match (no guessing in a loop).
 */
export function consumeApproval(code: string, hash: string, now = Date.now()): { ok: true; via: ApprovedVia } | { ok: false; reason: string } {
  const all = load(now);
  const key = code.trim().toUpperCase();
  const pending = all[key];
  if (!pending) return { ok: false, reason: 'unknown or expired approval code' };
  delete all[key];
  save(all);
  if (pending.hash !== hash) return { ok: false, reason: 'the approval was for a different command or text' };
  return { ok: true, via: pending.via };
}

/** The action as the user should see it: the exact command, plus the stdin text if any. */
export function describeAction(argv: string[], stdin?: string): string {
  const quote = (a: string) => (/^[\w@./:=+-]+$/.test(a) ? a : JSON.stringify(a));
  const lines = [`  telegram ${argv.map(quote).join(' ')}`];
  if (stdin !== undefined) {
    const text = stdin.replace(/\r?\n$/, '');
    lines.push(`  text (stdin): ${JSON.stringify(text.length > 1000 ? `${text.slice(0, 1000)}…` : text)}`);
  }
  return lines.join('\n');
}
