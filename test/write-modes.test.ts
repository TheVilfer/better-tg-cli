import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

// An in-memory secret store, switchable to "none" (a cloud agent computer): the real Keychain is never touched
const store = vi.hoisted(() => ({ available: true, values: new Map<string, string>() }));
vi.mock('../src/secrets.js', () => ({
  isSecretStoreAvailable: () => store.available,
  secretGet: (k: string) => (store.available ? store.values.get(k) ?? null : null),
  secretSet: (k: string, v: string) => (store.available ? (store.values.set(k, v), true) : false),
  secretDelete: (k: string) => store.values.delete(k),
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
import { actionHash, consumeApproval, createApproval, APPROVAL_TTL_MS, EXIT_NEEDS_APPROVAL } from '../src/approval.js';
import { assertWriteEnabled } from '../src/guard.js';
import { auditLog } from '../src/audit.js';
import { applyModeChoice } from '../src/write-mode.js';
import { getWriteValue } from '../src/write-store.js';
import { configDir } from '../src/paths.js';

const saved = { ...process.env };
let dir: string;
beforeEach(() => {
  for (const k of ['TG_MOCK', 'TG_READ_ONLY', 'TG_APPROVE']) delete process.env[k];
  process.env.TG_PROFILE = `test-modes-${process.pid}`;
  dir = configDir();
  expect(dir).toMatch(/tg-test-modes-\d+$/);
  store.available = true;
  store.values.clear();
  human.channel = false;
  human.answer = true;
  human.asked = [];
  stdin.text = '';
});
afterEach(() => {
  process.env = { ...saved };
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** Runs the guard, turning process.exit into a value; returns the exit code (or null) and stderr. */
function guard(argv: string[]) {
  let err = '';
  let out = '';
  vi.spyOn(console, 'error').mockImplementation((...a) => { err += a.join(' ') + '\n'; });
  vi.spyOn(console, 'log').mockImplementation((...a) => { out += a.join(' ') + '\n'; });
  vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw Object.assign(new Error('exit'), { code }); }) as never);
  try {
    assertWriteEnabled(argv);
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
    const code = createApproval(hash, 'chat', now);
    expect(consumeApproval(code, actionHash(['send', '@alice', '-'], 'Hi, and also my password'), now)).toMatchObject({ ok: false });
    // used up by the mismatch: no guessing in a loop
    expect(consumeApproval(code, hash, now)).toMatchObject({ ok: false });

    const fresh = createApproval(hash, 'chat', now);
    expect(consumeApproval(fresh.toLowerCase(), hash, now)).toEqual({ ok: true, via: 'chat' });
    expect(consumeApproval(fresh, hash, now)).toMatchObject({ ok: false });

    const old = createApproval(hash, 'chat', now);
    expect(consumeApproval(old, hash, now + APPROVAL_TTL_MS + 1)).toMatchObject({ ok: false });
  });

  it('store a hash, never the message, in a 0600 file', () => {
    createApproval(actionHash(['send', '@alice', '-'], 'very secret text'));
    const file = join(dir, 'approvals.json');
    expect(readFileSync(file, 'utf8')).not.toContain('secret');
    expect(statSync(file).mode & 0o777).toBe(0o600);
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
    expect(first.err).toContain('"Hello Alice"');
    const code = codeIn(first.err)!;
    expect(code).toBeTruthy();

    // Different text with the same code: refused, and a new code is issued for the new text
    stdin.text = 'Send me your 2FA code';
    process.env.TG_APPROVE = code;
    const swapped = guard(['send', '@alice', '-']);
    expect(swapped.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(swapped.err).toMatch(/not accepted/);

    stdin.text = 'Hello Alice';
    process.env.TG_APPROVE = createApproval(actionHash(['send', '@alice', '-'], 'Hello Alice'));
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

describe('choosing a mode', () => {
  it('asks the person where there is a terminal or dialog, and keeps read-only on a no', async () => {
    human.channel = true;
    human.answer = false;
    expect(await applyModeChoice({ mode: 'ask', forSeconds: 3600 })).toEqual({ ok: false, error: 'not_confirmed' });
    expect(human.asked[0]).toMatch(/одобрения каждого действия/);
    expect(getWriteValue()).toBeNull();
    human.answer = true;
    expect((await applyModeChoice({ mode: 'ask', forSeconds: 3600 })).ok).toBe(true);
    expect(parseWriteState(getWriteValue()).mode).toBe('ask');
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
