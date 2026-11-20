import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rmSync } from 'node:fs';

/**
 * `check` on a configured profile when Telegram cannot judge the session: no network, a rate limit.
 * That says nothing about the login, so check never calls it invalid or asks for a new login, keeps
 * the error's code and exit 1, and passes on how long to wait. Only Telegram's answers are faked.
 */
const home = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'tg-check-unreachable-'));
  Object.assign(process.env, { HOME: root, USERPROFILE: root, APPDATA: join(root, 'AppData'), TG_NO_UPDATE_CHECK: '1' });
  for (const k of ['TG_MOCK', 'TG_MCP', 'TG_PROFILE']) delete process.env[k];
  return { root };
});
const machine = vi.hoisted(() => ({ error: undefined as unknown }));
vi.mock('../src/secrets.js', () => ({
  isSecretStoreAvailable: () => false,
  secretGet: () => null,
  secretSet: () => false,
  secretDelete: () => {},
  secretGetStrict: () => ({ ok: false, reason: 'none' }),
  SECRET_KEYS: new Set(['apiHash', 'sessionString', 'writeEnabled']),
  isSecretKey: (k: string) => ['apiHash', 'sessionString', 'writeEnabled'].includes(k),
  migrateSecretsToStore: (c: Record<string, unknown>) => c,
}));
vi.mock('../src/transport.js', async orig => ({
  ...(await orig<typeof import('../src/transport.js')>()),
  connectClient: async () => ({
    connected: true,
    invoke: async () => { throw machine.error; },
    getMe: async () => { throw machine.error; },
    destroy: async () => {},
    disconnect: async () => {},
  }),
}));

import { checkCommand } from '../src/commands/check.js';
import { saveConfig, setSessionString } from '../src/config.js';

afterAll(() => rmSync(home.root, { recursive: true, force: true }));

async function check(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const log = vi.spyOn(console, 'log').mockImplementation((...a) => { out += `${a.join(' ')}\n`; });
  const error = vi.spyOn(console, 'error').mockImplementation((...a) => { err += `${a.join(' ')}\n`; });
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(((s: string) => { err += s; return true; }) as never);
  const exit = vi.spyOn(process, 'exit').mockImplementation(((c?: number) => { throw Object.assign(new Error('exit'), { exitCode: c ?? 0 }); }) as never);
  let code = 0;
  try {
    await checkCommand.parseAsync(['node', 'check', ...args]);
  } catch (e) {
    code = (e as { exitCode?: number }).exitCode ?? -1;
  } finally {
    for (const s of [log, error, stderr, exit]) s.mockRestore();
  }
  return { code, out, err };
}

beforeEach(() => {
  saveConfig({ apiId: 1, apiHash: '0'.repeat(32) });
  setSessionString('session-A');
});

describe('check when Telegram cannot judge the session', () => {
  it('no network: not "invalid", no login hint, code network, exit 1', async () => {
    machine.error = Object.assign(new Error('connect ETIMEDOUT 149.154.167.50:443'), { code: 'ETIMEDOUT' });
    const r = await check([]);
    expect(r.code).toBe(1);
    expect(r.out + r.err).not.toMatch(/invalid or expired|telegram onboard|auth --qr/);
    expect(r.err).toContain('Could not reach Telegram');
    expect(r.err).toContain('no reason to log in again');
    const j = await check(['--json']);
    expect(j.code).toBe(1);
    expect(JSON.parse(j.out.trim()).error).toMatchObject({ code: 'network' });
  });

  it('FLOOD_WAIT: code flood_wait, exit 1, retryAfterSeconds in JSON', async () => {
    machine.error = Object.assign(new Error('A wait of 30 seconds is required'), { errorMessage: 'FLOOD_WAIT', seconds: 30 });
    const r = await check([]);
    expect(r.code).toBe(1);
    expect(r.out + r.err).not.toMatch(/invalid or expired|telegram onboard|auth --qr/);
    expect(r.err).toContain('wait 30 s');
    const j = await check(['--json']);
    expect(j.code).toBe(1);
    expect(JSON.parse(j.out.trim()).error).toMatchObject({ code: 'flood_wait', retryAfterSeconds: 30 });
  });

  it('a revoked session is still "invalid or expired", exit 5', async () => {
    machine.error = Object.assign(new Error('RPCError 401: SESSION_REVOKED'), { errorMessage: 'SESSION_REVOKED' });
    const r = await check([]);
    expect(r.code).toBe(5);
    expect(r.err + r.out).toMatch(/invalid or expired/);
  });
});
