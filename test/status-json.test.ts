import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Before any module under test is imported: a temp HOME, so no path reaches the real ~/.config
const home = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'tg-status-home-'));
  Object.assign(process.env, { HOME: root, USERPROFILE: root, APPDATA: join(root, 'AppData'), TG_NO_UPDATE_CHECK: '1' });
  for (const k of ['TG_MOCK', 'TG_PROFILE', 'TG_MCP', 'TG_READ_ONLY', 'TG_APPROVE', 'OP_SERVICE_ACCOUNT_TOKEN']) delete process.env[k];
  return root;
});
// An in-memory secret store; the real Keychain, 1Password, libsecret and DPAPI are never asked
const store = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock('../src/secrets.js', () => ({
  isSecretStoreAvailable: () => true,
  secretGet: (k: string) => store.values.get(k) ?? null,
  secretSet: (k: string, v: string) => (store.values.set(k, v), true),
  secretDelete: (k: string) => store.values.delete(k),
  secretGetStrict: (k: string) => ({ ok: true, value: store.values.get(k) ?? null }),
  SECRET_KEYS: new Set(['apiHash', 'sessionString', 'writeEnabled']),
  isSecretKey: (k: string) => ['apiHash', 'sessionString', 'writeEnabled'].includes(k),
  migrateSecretsToStore: (c: Record<string, unknown>) => c,
}));
vi.mock('../src/keychain.js', async orig => ({ ...(await orig<typeof import('../src/keychain.js')>()), isKeychainAvailable: () => true }));
vi.mock('../src/onepassword.js', async orig => ({ ...(await orig<typeof import('../src/onepassword.js')>()), isOnePasswordAvailable: () => false }));
vi.mock('../src/libsecret.js', async orig => ({ ...(await orig<typeof import('../src/libsecret.js')>()), isLibsecretAvailable: () => false }));
vi.mock('../src/dpapi.js', async orig => ({ ...(await orig<typeof import('../src/dpapi.js')>()), isDpapiAvailable: () => false }));

import { writeAccessCommand } from '../src/commands/write-access.js';
import { checkCommand } from '../src/commands/check.js';
import { EXIT } from '../src/errors.js';

let out = '';
let err = '';
beforeEach(() => {
  out = ''; err = '';
  store.values.clear();
  vi.spyOn(console, 'log').mockImplementation((...a) => { out += a.join(' ') + '\n'; });
  vi.spyOn(console, 'error').mockImplementation((...a) => { err += a.join(' ') + '\n'; });
  vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw Object.assign(new Error('exit'), { code }); }) as never);
});
afterEach(() => vi.restoreAllMocks());

async function run(cmd: typeof checkCommand, args: string[]): Promise<number | null> {
  try {
    await cmd.parseAsync(args, { from: 'user' });
    return null;
  } catch (e) {
    return (e as { code: number }).code;
  }
}

describe('2.1 status an agent can read', () => {
  it('write-access --json prints the mode as one JSON line', async () => {
    store.values.set('writeEnabled', 'ask');
    expect(await run(writeAccessCommand, ['--json'])).toBeNull();
    expect(JSON.parse(out)).toEqual({
      writeMode: 'ask', writeModeProtected: true, writeModeStorable: true, secretStore: 'macOS Keychain', profile: null,
    });
  });

  it('write-access ask --json reports the mode it set; the prose goes to stderr', async () => {
    expect(await run(writeAccessCommand, ['ask', '--for', '1h', '--json'])).toBeNull();
    const status = JSON.parse(out);
    expect(status).toMatchObject({ writeMode: 'ask', writeModeProtected: true });
    expect(Date.parse(status.writeUntil)).toBeGreaterThan(Date.now());
    expect(err).toMatch(/Write access: ask/);
  });

  it('write-access with an unknown action is a usage error', async () => {
    expect(await run(writeAccessCommand, ['maybe'])).toBe(EXIT.USAGE);
    expect(store.values.has('writeEnabled')).toBe(false);
  });

  it('check --json without a login: configured false, the write mode, exit 5', async () => {
    store.values.set('writeEnabled', 'true');
    expect(await run(checkCommand, ['--json'])).toBe(EXIT.NOT_LOGGED_IN);
    expect(JSON.parse(out)).toMatchObject({
      configured: false, authenticated: false, writeMode: 'on', writeModeProtected: true, profile: null,
      transport: 'auto', testServers: false, version: expect.any(String),
      error: { code: 'not_configured' },
    });
    expect(home).toBeTruthy();
  });
});
