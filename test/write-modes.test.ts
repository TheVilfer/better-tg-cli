import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';

// Before any module under test is imported: HOME (and the Windows dirs) point at a temp root, so
// no path these tests touch can resolve into the real ~/.config
const home = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const original = { ...process.env };
  const root = mkdtempSync(join(tmpdir(), 'tg-modes-home-'));
  process.env.HOME = root;
  process.env.USERPROFILE = root;
  process.env.APPDATA = join(root, 'AppData');
  // What each test returns to: the temp home, never the real one
  return { root, original, saved: { ...process.env } };
});
// Linux, as on a cloud agent computer: the file fallback is allowed only off macOS and Windows
vi.mock('node:os', async orig => ({ ...(await orig<typeof import('node:os')>()), platform: () => 'linux' }));
// An in-memory secret store, switchable to "none" (a cloud agent computer): the real Keychain is never touched
const store = vi.hoisted(() => ({ available: true, values: new Map<string, string>() }));
vi.mock('../src/secrets.js', () => ({
  isSecretStoreAvailable: () => store.available,
  secretGet: (k: string) => (store.available ? store.values.get(k) ?? null : null),
  secretSet: (k: string, v: string) => (store.available ? (store.values.set(k, v), true) : false),
  secretDelete: (k: string) => store.values.delete(k),
  // the strict read loadConfig uses once secrets resolve through it
  secretGetStrict: (k: string) => ({ ok: true, value: (store.available ? store.values.get(k) ?? null : null) }),
  SECRET_KEYS: new Set(['apiHash', 'sessionString', 'writeEnabled']),
  isSecretKey: (k: string) => ['apiHash', 'sessionString', 'writeEnabled'].includes(k),
  migrateSecretsToStore: (c: Record<string, unknown>) => c,
}));
// stdin for "-": the guard reads it through this helper; the tests feed it directly
const stdin = vi.hoisted(() => ({ text: '' }));
vi.mock('../src/text.js', async orig => ({ ...(await orig<typeof import('../src/text.js')>()), readStdinOnce: () => stdin.text }));
// Who can confirm: a terminal / dialog or nobody
const human = vi.hoisted(() => ({ channel: false, answer: true, asked: [] as string[] }));
vi.mock('../src/confirm.js', () => ({
  confirmByHuman: async (q: string) => (human.asked.push(q), human.answer),
  windowsConfirmScript: () => '',
}));
vi.mock('../src/write-store.js', async orig => {
  const real = await orig<typeof import('../src/write-store.js')>();
  return { ...real, hasHumanChannel: () => human.channel, mayTrustUnconfirmedChoice: () => !human.channel && !store.available };
});

import { describeWriteState, encodeWriteState, parseWriteState } from '../src/write-state.js';
import { actionHash, consumeApproval, createApproval, describeAction, APPROVAL_TTL_MS, EXIT_NEEDS_APPROVAL } from '../src/approval.js';
import { assertLocalWriteAllowed, assertWriteEnabled } from '../src/guard.js';
import { auditLog } from '../src/audit.js';
import { applyModeChoice } from '../src/write-mode.js';
import { getWriteValue, isFileFallbackAllowed } from '../src/write-store.js';
import { configDir } from '../src/paths.js';
import { elicitApproved, gateWrite } from '../src/mcp.js';
import { getSessionString } from '../src/config.js';

// A home of its own for each test: the profile dir lives under it, and only that root is deleted
let root: string | undefined;
let dir: string;
beforeEach(() => {
  for (const k of ['TG_MOCK', 'TG_READ_ONLY', 'TG_APPROVE', 'TG_MCP']) delete process.env[k];
  root = mkdtempSync(join(tmpdir(), 'tg-modes-'));
  process.env.HOME = root;
  process.env.USERPROFILE = root;
  process.env.APPDATA = join(root, 'AppData');
  process.env.TG_PROFILE = 'test-modes';
  dir = configDir();
  const inside = relative(root, dir);
  expect(inside && !inside.startsWith('..') && !isAbsolute(inside)).toBeTruthy();
  store.available = true;
  store.values.clear();
  human.channel = false;
  human.answer = true;
  human.asked = [];
  stdin.text = '';
});
afterEach(() => {
  // In place: a replaced process.env is a plain object that os.homedir() no longer reads
  for (const k of Object.keys(process.env)) if (!(k in home.saved)) delete process.env[k];
  Object.assign(process.env, home.saved);
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
  vi.restoreAllMocks();
});
afterAll(() => {
  for (const k of Object.keys(process.env)) if (!(k in home.original)) delete process.env[k];
  Object.assign(process.env, home.original);
  rmSync(home.root, { recursive: true, force: true });
});

/** The account as the guard reads it: the stored session of the profile. */
const account = () => getSessionString();

/** Runs the guard, turning process.exit into a value; returns the exit code (or null) and stderr. */
function guard(argv: string[], check: (argv: string[]) => void = assertWriteEnabled) {
  let err = '';
  let out = '';
  vi.spyOn(console, 'error').mockImplementation((...a) => { err += a.join(' ') + '\n'; });
  vi.spyOn(console, 'log').mockImplementation((...a) => { out += a.join(' ') + '\n'; });
  vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw Object.assign(new Error('exit'), { code }); }) as never);
  try {
    check(argv);
    return { code: null as number | null, err, out };
  } catch (e) {
    return { code: (e as { code: number }).code, err, out };
  } finally {
    vi.restoreAllMocks();
  }
}

const codeIn = (s: string) => /TG_APPROVE=([A-Z2-9]{6})/.exec(s)?.[1];

describe('write state', () => {
  const now = Date.UTC(2026, 10, 4, 12);

  it('keeps the meaning of the values existing installs have', () => {
    expect(parseWriteState('true', now)).toEqual({ mode: 'on', enabled: true });
    expect(parseWriteState(null, now)).toEqual({ mode: 'read-only', enabled: false });
    expect(parseWriteState(encodeWriteState(3600, now), now)).toMatchObject({ mode: 'on', enabled: true });
    expect(encodeWriteState(undefined, now)).toBe('true');
  });

  it('adds ask, with and without an end', () => {
    expect(parseWriteState('ask', now)).toEqual({ mode: 'ask', enabled: true });
    const value = encodeWriteState(3600, now, 'ask');
    expect(value).toMatch(/^ask:until:\d+$/);
    expect(parseWriteState(value, now + 30 * 60e3)).toMatchObject({ mode: 'ask', enabled: true });
    expect(parseWriteState(value, now + 61 * 60e3)).toMatchObject({ mode: 'read-only', enabled: false, expired: true });
    expect(parseWriteState('ask:junk', now).mode).toBe('read-only');
    expect(describeWriteState(parseWriteState('ask', now))).toMatch(/^ask/);
  });
});

describe('approvals', () => {
  it('are single-use, bound to the exact command and text, and expire', () => {
    const now = Date.now();
    const hash = actionHash(['send', '@alice', '-'], 'Hi');
    const code = createApproval(hash, account(), 'chat', now);
    expect(consumeApproval(code, actionHash(['send', '@alice', '-'], 'Hi, and also my password'), account(), now)).toMatchObject({ ok: false });
    // used up by the mismatch: no guessing in a loop
    expect(consumeApproval(code, hash, account(), now)).toMatchObject({ ok: false });

    const fresh = createApproval(hash, account(), 'chat', now);
    expect(consumeApproval(fresh.toLowerCase(), hash, account(), now)).toEqual({ ok: true, via: 'chat' });
    expect(consumeApproval(fresh, hash, account(), now)).toMatchObject({ ok: false });

    const old = createApproval(hash, account(), 'chat', now);
    expect(consumeApproval(old, hash, account(), now + APPROVAL_TTL_MS + 1)).toMatchObject({ ok: false });
  });

  it('store a hash, never the message, one 0600 file per code', () => {
    const code = createApproval(actionHash(['send', '@alice', '-'], 'very secret text'), account());
    const file = join(dir, 'approvals', `${code}.json`);
    expect(readFileSync(file, 'utf8')).not.toContain('secret');
    if (process.platform !== 'win32') expect(statSync(file).mode & 0o777).toBe(0o600); // Windows reports 0o666
    expect(readdirSync(join(dir, 'approvals'))).toEqual([`${code}.json`]);
  });

  it('reject a record dropped into the store by hand (forged, e.g. as "elicitation")', () => {
    const hash = actionHash(['send', '@alice', 'hi']);
    createApproval(hash, account()); // creates the store and the signing key
    writeFileSync(join(dir, 'approvals', 'FAKE22.json'), JSON.stringify({ hash, expiresAt: Date.now() + 60_000, via: 'elicitation', mac: '00'.repeat(32) }));
    expect(consumeApproval('FAKE22', hash, account())).toEqual({ ok: false, reason: 'the approval record is not genuine' });
    const code = createApproval(hash, account());
    const rec = JSON.parse(readFileSync(join(dir, 'approvals', `${code}.json`), 'utf8'));
    writeFileSync(join(dir, 'approvals', `${code}.json`), JSON.stringify({ ...rec, via: 'elicitation' })); // relabelled
    expect(consumeApproval(code, hash, account())).toMatchObject({ ok: false });
  });

  it('cover the contents of files named in the arguments, also as --opt=path', () => {
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 'doc.txt');
    writeFileSync(f, 'v1');
    const a = actionHash(['send-file', '@alice', f]);
    const b = actionHash(['send-file', '@alice', `--file=${f}`]);
    writeFileSync(f, 'v2'); // same size, changed contents
    expect(actionHash(['send-file', '@alice', f])).not.toBe(a);
    expect(actionHash(['send-file', '@alice', `--file=${f}`])).not.toBe(b);
  });

  it('show the whole text, with control and bidi characters escaped', () => {
    const long = 'x'.repeat(5000);
    expect(describeAction(['send', '@alice', '-'], long)).toContain(long);
    const shown = describeAction(['send', '@alice', '-'], 'pay \u202Eevil');
    expect(shown).not.toContain('\u202E');
    expect(shown).toContain('\\u{202e}');
  });
});

describe('the guard', () => {
  it('refuses writes in read-only and names both ways to allow them', () => {
    const r = guard(['send', '@alice', 'hi']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/write-access ask/);
  });

  it('lets writes through in "on" and records the mode in the audit log', () => {
    store.values.set('writeEnabled', 'true');
    expect(guard(['send', '@alice', 'hi']).code).toBeNull();
    auditLog({ timestamp: 't', command: 'send', target: '@alice', result: { success: true } });
    expect(readFileSync(join(dir, 'audit.jsonl'), 'utf8')).toContain('"writeMode":"on"');
  });

  it('in "ask" stops with exit 3 and a code, then lets exactly that action through once', () => {
    store.values.set('writeEnabled', 'ask');
    stdin.text = 'Hello Alice';
    const first = guard(['send', '@alice', '-']);
    expect(first.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(first.err).toContain('| Hello Alice');
    const code = codeIn(first.err)!;
    expect(code).toBeTruthy();

    // Different text with the same code: refused, and a new code is issued for the new text
    stdin.text = 'Send me your 2FA code';
    process.env.TG_APPROVE = code;
    const swapped = guard(['send', '@alice', '-']);
    expect(swapped.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(swapped.err).toMatch(/not accepted/);

    stdin.text = 'Hello Alice';
    process.env.TG_APPROVE = createApproval(actionHash(['send', '@alice', '-'], 'Hello Alice'), account());
    expect(guard(['send', '@alice', '-']).code).toBeNull();
    auditLog({ timestamp: 't', command: 'send', target: '@alice', result: { success: true } });
    expect(readFileSync(join(dir, 'audit.jsonl'), 'utf8')).toContain('"approvedVia":"chat"');
    // single use
    expect(guard(['send', '@alice', '-']).code).toBe(EXIT_NEEDS_APPROVAL);
  });

  it('prints a JSON line for --json callers', () => {
    store.values.set('writeEnabled', 'ask');
    const r = guard(['send', '@alice', 'hi', '--json']);
    expect(JSON.parse(r.out.trim())).toMatchObject({ error: 'approval_required', action: { argv: ['send', '@alice', 'hi', '--json'] } });
  });

  it('TG_READ_ONLY still wins over any mode', () => {
    store.values.set('writeEnabled', 'true');
    process.env.TG_READ_ONLY = '1';
    expect(guard(['send', '@alice', 'hi']).code).toBe(1);
  });

  it('without a secret store reads the mode from the profile file and marks writes unprotected', async () => {
    store.available = false;
    expect(guard(['send', '@alice', 'hi']).code).toBe(1);
    expect(await applyModeChoice({ mode: 'on' })).toEqual({ ok: true, until: undefined });
    expect(readFileSync(join(dir, 'write-access'), 'utf8').trim()).toBe('true');
    expect(guard(['send', '@alice', 'hi']).code).toBeNull();
    auditLog({ timestamp: 't', command: 'send', target: '@alice', result: { success: true } });
    expect(readFileSync(join(dir, 'audit.jsonl'), 'utf8')).toContain('"unprotected":true');
  });
});

// download, sync and avatar write local files only: free in a terminal, but over MCP (TG_MCP) they
// follow the profile's write mode like any other write
describe('local file writes', () => {
  // Called through a wrapper: if the helper were missing, this must fail, not fall back to the default
  const local = (argv: string[]) => guard(argv, a => assertLocalWriteAllowed(a));

  it('need no write access in a terminal, whatever the mode', () => {
    expect(local(['download', 'me', '1']).code).toBeNull();
    store.values.set('writeEnabled', 'ask');
    expect(local(['sync']).code).toBeNull();
  });

  it('over MCP are refused in read-only', () => {
    process.env.TG_MCP = '1';
    for (const argv of [['download', 'me', '1'], ['sync'], ['avatar', 'me']]) {
      const r = local(argv);
      expect(r.code, argv.join(' ')).toBe(1);
      expect(r.err).toMatch(/Write access is disabled/);
    }
  });

  it('over MCP in "ask" need an approval of that exact call, once', () => {
    process.env.TG_MCP = '1';
    store.values.set('writeEnabled', 'ask');
    const first = local(['download', 'me', '1', '-o', '/tmp/x']);
    expect(first.code).toBe(EXIT_NEEDS_APPROVAL);
    process.env.TG_APPROVE = codeIn(first.err)!;
    expect(local(['download', 'me', '1', '-o', '/tmp/x']).code).toBeNull();
    expect(local(['download', 'me', '1', '-o', '/tmp/x']).code).toBe(EXIT_NEEDS_APPROVAL);
  });

  it('a misrouted read never writes a file', () => {
    process.env.TG_READ_ONLY = '1';
    expect(local(['download', 'me', '1']).code).toBe(1);
  });

  // A mock write needs no approval, so over MCP the model could pick any path
  it('over MCP in mock mode are refused, whatever the mode; a terminal and a misrouted read as without mock', () => {
    process.env.TG_MOCK = '1';
    expect(local(['sync', '--output', '/tmp/x']).code).toBeNull();
    process.env.TG_MCP = '1';
    for (const mode of [undefined, 'ask', 'true']) {
      if (mode) store.values.set('writeEnabled', mode);
      for (const argv of [['download', 'me', '1'], ['sync', '--output', '/tmp/x'], ['avatar', 'me']]) {
        const r = local(argv);
        expect(r.code, `${mode} ${argv.join(' ')}`).toBe(1);
        expect(r.err).toMatch(/mock mode \(TG_MOCK\).*write no local files/);
      }
    }
    process.env.TG_READ_ONLY = '1';
    const read = local(['download', 'me', '1']);
    expect(read.code).toBe(1);
    expect(read.err).toMatch(/cannot run as a read/);
  });
});

describe('the file fallback', () => {
  it('is never used on macOS or Windows, where a missing store means a broken or disabled one', () => {
    expect(isFileFallbackAllowed('darwin')).toBe(false);
    expect(isFileFallbackAllowed('win32')).toBe(false);
  });

  it('on Linux, is used wherever the Secret Service cannot work: no secret-tool, or no session bus (#74)', () => {
    expect(isFileFallbackAllowed('linux', { secretTool: false, bus: false })).toBe(true); // Grok Bot today
    expect(isFileFallbackAllowed('linux', { secretTool: true, bus: false })).toBe(true); // secret-tool installed, still no keyring
    expect(isFileFallbackAllowed('linux', { secretTool: false, bus: true })).toBe(true);
    expect(isFileFallbackAllowed('linux', { secretTool: true, bus: true })).toBe(false); // desktop with a keyring: fail closed
  });

  it('tells agents on cloud computers not to install a keyring', () => {
    store.available = false;
    const r = guard(['send', '@alice', 'hi']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/Do not try to install one/);
  });
});

describe('choosing a mode', () => {
  it('"on" asks the person where there is a terminal or dialog, and keeps read-only on a no', async () => {
    human.channel = true;
    human.answer = false;
    expect(await applyModeChoice({ mode: 'on', forSeconds: 3600 })).toEqual({ ok: false, error: 'not_confirmed' });
    expect(human.asked[0]).toMatch(/без вопросов/);
    expect(getWriteValue()).toBeNull();
    human.answer = true;
    const r = await applyModeChoice({ mode: 'on', forSeconds: 3600 });
    expect(r.ok).toBe(true);
    expect(parseWriteState(getWriteValue()).mode).toBe('on');
    // It reports the end it wrote, to the second, so onboard can compare it with the store
    expect(r.ok && r.until?.getTime()).toBe(parseWriteState(getWriteValue()).until?.getTime());
  });

  it('"ask" needs no dialog anywhere: the yes in the chat before each write is the confirmation', async () => {
    expect((await applyModeChoice({ mode: 'ask' })).ok).toBe(true); // secret store, no terminal
    expect(parseWriteState(getWriteValue()).mode).toBe('ask');
    expect(human.asked).toEqual([]);
  });

  it('never takes a page click alone where the mode is protected (a secret store but no terminal)', async () => {
    expect(await applyModeChoice({ mode: 'on' })).toEqual({ ok: false, error: 'needs_terminal' });
    expect(getWriteValue()).toBeNull();
  });

  it('read-only needs nobody and clears both stores', async () => {
    store.values.set('writeEnabled', 'true');
    expect(await applyModeChoice({ mode: 'read-only' })).toEqual({ ok: true });
    expect(getWriteValue()).toBeNull();
    expect(existsSync(join(dir, 'write-access'))).toBe(false);
    expect(human.asked).toEqual([]);
  });
});

describe('MCP in mode "ask"', () => {
  const plan = () => ({ argv: ['send', '@alice', '-'], readOnly: false, stdin: 'Hi' } as { argv: string[]; readOnly: boolean; stdin?: string; approval?: string });

  it('asks the user through the client and mints the approval itself', async () => {
    store.values.set('writeEnabled', 'ask');
    const asked: string[] = [];
    const p = plan();
    expect(await gateWrite(p, {}, async m => (asked.push(m), true))).toBeUndefined();
    expect(asked[0]).toContain('| Hi');
    expect(consumeApproval(p.approval!, actionHash(p.argv, 'Hi'), account())).toEqual({ ok: true, via: 'elicitation' });
  });

  it('sends nothing when the user declines, and refuses codes from the model when it can ask', async () => {
    store.values.set('writeEnabled', 'ask');
    expect(await gateWrite(plan(), {}, async () => false)).toMatch(/did not approve/);
    const p = plan();
    expect(await gateWrite(p, { approval: 'ABCDEF' }, async () => true)).toMatch(/not accepted here/);
    expect(p.approval).toBeUndefined();
  });

  it('reads an elicitation answer: the ticked box, or a plain Allow from a prompt-only client', () => {
    expect(elicitApproved({ action: 'accept', content: { approve: true } })).toBe(true);
    // Hermes Agent shows Allow Once / Deny and accepts with empty content
    expect(elicitApproved({ action: 'accept', content: {} })).toBe(true);
    expect(elicitApproved({ action: 'accept' })).toBe(true);
    expect(elicitApproved({ action: 'accept', content: { approve: false } })).toBe(false);
    expect(elicitApproved({ action: 'accept', content: { approve: 'yes' } })).toBe(false);
    expect(elicitApproved({ action: 'accept', content: { other: true } })).toBe(false);
    expect(elicitApproved({ action: 'accept', content: 'ok' })).toBe(false);
    expect(elicitApproved({ action: 'decline' })).toBe(false);
    expect(elicitApproved({ action: 'cancel', content: {} })).toBe(false);
    expect(elicitApproved(undefined)).toBe(false);
  });

  it('passes the chat code on when the client has no elicitation', async () => {
    store.values.set('writeEnabled', 'ask');
    const p = plan();
    expect(await gateWrite(p, { approval: 'ABCDEF' })).toBeUndefined();
    expect(p.approval).toBe('ABCDEF');
  });

  it('does not ask in other modes', async () => {
    store.values.set('writeEnabled', 'true');
    let asked = false;
    expect(await gateWrite(plan(), {}, async () => (asked = true))).toBeUndefined();
    expect(asked).toBe(false);
  });
});
