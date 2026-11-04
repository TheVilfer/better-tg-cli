import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { configFile } from './paths.js';
import { isSecretStoreAvailable, secretGet, secretSet } from './secrets.js';

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
  /** HMAC over the record with a key from the secret store: a file dropped in by hand doesn't verify */
  mac: string;
}

/**
 * The signing key lives in the secret store, next to the write mode, so writing a file into the
 * profile is not enough to forge an approval (or a fake "elicitation" in the audit log). An agent
 * with a shell that can read the store could still sign one; this raises the bar, it is not a wall.
 * Without a store the key sits in the profile like everything else there (unprotected).
 */
function signingKey(): Buffer {
  if (isSecretStoreAvailable()) {
    let key = secretGet('approvalKey');
    if (!key) {
      key = randomBytes(32).toString('hex');
      if (!secretSet('approvalKey', key)) throw new Error('Could not store the approval signing key in the secret store');
    }
    return Buffer.from(key, 'hex');
  }
  const file = configFile('approval-key');
  try {
    return Buffer.from(readFileSync(file, 'utf8').trim(), 'hex');
  } catch {
    const key = randomBytes(32).toString('hex');
    writeFileSync(file, key, { encoding: 'utf8', mode: 0o600 });
    return Buffer.from(key, 'hex');
  }
}

function sign(key: Buffer, code: string, p: Omit<Pending, 'mac'>): string {
  return createHmac('sha256', key).update(JSON.stringify([code, p.hash, p.expiresAt, p.via])).digest('hex');
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
  const key = signingKey();
  for (;;) {
    const code = newCode();
    const record = { hash, expiresAt: now + APPROVAL_TTL_MS, via };
    try {
      // wx: never overwrite another pending code
      writeFileSync(join(storeDir(), `${code}.json`), JSON.stringify({ ...record, mac: sign(key, code, record) }), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
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
  const expected = Buffer.from(sign(signingKey(), key, pending), 'hex');
  const got = Buffer.from(typeof pending.mac === 'string' ? pending.mac : '', 'hex');
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return { ok: false, reason: 'the approval record is not genuine' };
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
