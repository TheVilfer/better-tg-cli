import { createHash, randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { configFile } from './paths.js';

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

/** One file per pending code, so using one up is a single atomic unlink (no double use in a race). */
function storeDir(): string {
  return configFile('approvals');
}

function prune(now: number): void {
  try {
    for (const name of readdirSync(storeDir())) {
      try {
        const p = JSON.parse(readFileSync(join(storeDir(), name), 'utf8')) as Pending;
        if (!(p.expiresAt > now)) unlinkSync(join(storeDir(), name));
      } catch { /* a broken or vanished entry: skip */ }
    }
  } catch { /* no store yet */ }
}

/**
 * What an approval covers: the arguments, the text on stdin (if the command reads "-"), and the contents of every file an argument names, as `x.pdf` or `--opt=x.pdf`, by its
 * real path (so a file can't be swapped or edited between the approval and the run).
 */
export function actionHash(argv: string[], stdin?: string): string {
  const files = argv.map(arg => {
    const candidates = [arg, ...(arg.startsWith('-') && arg.includes('=') ? [arg.slice(arg.indexOf('=') + 1)] : [])];
    return candidates.map(c => {
      try {
        const real = realpathSync(c);
        if (!statSync(real).isFile()) return '';
        return `${real}:${createHash('sha256').update(readFileSync(real)).digest('hex')}`;
      } catch {
        return '';
      }
    }).join('|');
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
  prune(now);
  if (!existsSync(storeDir())) mkdirSync(storeDir(), { recursive: true, mode: 0o700 });
  for (;;) {
    const code = newCode();
    try {
      // wx: never overwrite another pending code
      writeFileSync(join(storeDir(), `${code}.json`), JSON.stringify({ hash, expiresAt: now + APPROVAL_TTL_MS, via }), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      return code;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    }
  }
}

/**
 * Uses up an approval: it must exist, be unexpired and match this exact action. Returns how it was
 * approved, or why not. A code is single-use even when it does not match (no guessing in a loop).
 */
export function consumeApproval(code: string, hash: string, now = Date.now()): { ok: true; via: ApprovedVia } | { ok: false; reason: string } {
  const key = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(key)) return { ok: false, reason: 'unknown or expired approval code' };
  const file = join(storeDir(), `${key}.json`);
  let pending: Pending;
  try {
    pending = JSON.parse(readFileSync(file, 'utf8')) as Pending;
    // Whoever unlinks first owns the code; a second, concurrent use fails here
    unlinkSync(file);
  } catch {
    return { ok: false, reason: 'unknown or expired approval code' };
  }
  if (!(pending.expiresAt > now)) return { ok: false, reason: 'unknown or expired approval code' };
  if (pending.hash !== hash) return { ok: false, reason: 'the approval was for a different command or text' };
  return { ok: true, via: pending.via };
}

/** Control, format and bidi characters could make the shown text differ from the sent one; show them escaped. */
function visible(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ch => (ch === '\n' ? '\n' : `\\u{${ch.codePointAt(0)!.toString(16)}}`));
}

/** The action as the user should see it: the exact command, plus the whole stdin text if any. */
export function describeAction(argv: string[], stdin?: string): string {
  const quote = (a: string) => (/^[\w@./:=+-]+$/.test(a) ? a : JSON.stringify(visible(a)));
  const lines = [`  telegram ${argv.map(quote).join(' ')}`];
  // The approval covers every byte, so the person sees every byte (no truncation)
  if (stdin !== undefined) lines.push(`  text (stdin, ${[...stdin].length} characters):\n${visible(stdin.replace(/\r?\n$/, '')).split('\n').map(l => `    | ${l}`).join('\n')}`);
  return lines.join('\n');
}
