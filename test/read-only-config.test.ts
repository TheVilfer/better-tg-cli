import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// An in-memory Keychain under the real secrets.ts, so the real migration code runs and the real
// Keychain is never touched; 1Password, Secret Service and DPAPI are off.
const store = vi.hoisted(() => new Map<string, string>());
vi.mock('../src/keychain.js', async orig => ({
  ...(await orig<typeof import('../src/keychain.js')>()),
  isKeychainAvailable: () => true,
  keychainGet: (k: string) => store.get(k) ?? null,
  keychainSet: (k: string, v: string) => (store.set(k, v), true),
  keychainDelete: (k: string) => store.delete(k),
}));
vi.mock('../src/onepassword.js', () => ({ isOnePasswordAvailable: () => false, opGet: () => null, opSet: () => false, opDelete: () => false }));
vi.mock('../src/libsecret.js', () => ({ isLibsecretAvailable: () => false, libsecretGet: () => null, libsecretSet: () => false, libsecretDelete: () => false }));
vi.mock('../src/dpapi.js', () => ({ isDpapiAvailable: () => false, dpapiGet: () => null, dpapiSet: () => false, dpapiDelete: () => false }));

const saved = { ...process.env };
let dir: string;
let file: string;

/** Fresh modules for each test: the migration runs once per process (a module-level flag). */
async function modules() {
  vi.resetModules();
  return { config: await import('../src/config.js'), paths: await import('../src/paths.js') };
}

beforeEach(async () => {
  for (const k of ['TG_MOCK', 'TG_READ_ONLY', 'TG_APPROVE', 'TG_TRANSPORT']) delete process.env[k];
  process.env.TG_PROFILE = `test-rocfg-${process.pid}`;
  const { paths } = await modules();
  dir = paths.configDir();
  expect(dir).toMatch(/tg-test-rocfg-\d+$/);
  file = join(dir, 'config.json5');
  mkdirSync(dir, { recursive: true });
  store.clear();
});
afterEach(() => {
  process.env = { ...saved };
  rmSync(dir, { recursive: true, force: true });
});

// An old profile: secrets still in the file, and a stray writeEnabled that must never become the mode
const OLD = '{"apiId": 1, "apiHash": "file-hash", "sessionString": "file-session", "writeEnabled": "true"}';

describe('a read (TG_READ_ONLY) never changes the profile', () => {
  it('`check` on an old profile leaves the file and the protected mode "ask" as they are', async () => {
    writeFileSync(file, OLD);
    store.set('writeEnabled', 'ask');
    process.env.TG_READ_ONLY = '1';
    const { config } = await modules();
    expect(config.isConfigured()).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(OLD);
    expect(store.get('writeEnabled')).toBe('ask');
    expect(store.has('apiHash')).toBe(false);
    expect(store.has('sessionString')).toBe(false);
  });

  it('a read that falls back to WSS does not save the transport', async () => {
    process.env.TG_READ_ONLY = '1';
    vi.resetModules();
    const { connectClient } = await import('../src/transport.js');
    const make = (t: string) => ({
      connect: async () => { if (t === 'tcp') throw Object.assign(new Error('NetSocket was closed'), { name: 'NetSocketClosedError' }); return true; },
      destroy: async () => {},
    }) as never;
    await connectClient(make, { setting: 'auto', notice: () => {} });
    expect(existsSync(file)).toBe(false);
  });
});

describe('the write mode is never taken from the config file', () => {
  it('outside a read, secrets still move to the store, but writeEnabled in the file is ignored', async () => {
    writeFileSync(file, OLD);
    store.set('writeEnabled', 'ask');
    const { config } = await modules();
    config.loadConfig(() => {});
    expect(store.get('writeEnabled')).toBe('ask');
    expect(store.get('apiHash')).toBe('file-hash');
    expect(readFileSync(file, 'utf8')).not.toMatch(/file-hash|file-session/);
  });

  it('read-only (no stored mode) stays read-only after a run with writeEnabled planted in the file', async () => {
    writeFileSync(file, OLD);
    const { config } = await modules();
    config.loadConfig(() => {});
    expect(store.has('writeEnabled')).toBe(false);
  });
});

// Review round 2: a read and the write after it must use the same account. The store wins in both:
// a session left in an old config.json5 never replaces the stored one.
describe('whoami → write resolve the same account', () => {
  it('with session A in the store and B in the file, both the read and the write use A', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "file-hash", "sessionString": "session-B"}');
    store.set('apiHash', 'store-hash');
    store.set('sessionString', 'session-A');

    // whoami through telegram_read
    process.env.TG_READ_ONLY = '1';
    let { config } = await modules();
    expect(config.getSessionString()).toBe('session-A');

    // the next write (telegram_write, its own process): the migration runs, but the store stays A
    delete process.env.TG_READ_ONLY;
    ({ config } = await modules());
    const warnings: string[] = [];
    expect(config.loadConfig(m => warnings.push(m)).sessionString).toBe('session-A');
    expect(config.loadConfig().apiHash).toBe('store-hash');
    expect(store.get('sessionString')).toBe('session-A');
    expect(store.get('apiHash')).toBe('store-hash');
    // The file copy is left alone (conflict handling is issue #116), with a one-line warning per key
    expect(readFileSync(file, 'utf8')).toMatch(/session-B/);
    expect(readFileSync(file, 'utf8')).toMatch(/file-hash/);
    expect(warnings).toHaveLength(2);
    expect(warnings.join('\n')).toMatch(/sessionString that differs from the secret store/);
    expect(warnings.join('\n')).not.toMatch(/session-[AB]|hash/);
  });

  it('with an empty store, both use the file session, and the write moves it into the store', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "file-hash", "sessionString": "session-B"}');
    process.env.TG_READ_ONLY = '1';
    let { config } = await modules();
    expect(config.getSessionString()).toBe('session-B');
    delete process.env.TG_READ_ONLY;
    ({ config } = await modules());
    expect(config.loadConfig(() => {}).sessionString).toBe('session-B');
    expect(store.get('sessionString')).toBe('session-B');
    expect(readFileSync(file, 'utf8')).not.toMatch(/session-B/);
  });

  it('a file copy equal to the stored value is dropped from the file without a warning', async () => {
    writeFileSync(file, '{"apiId": 1, "sessionString": "session-A"}');
    store.set('sessionString', 'session-A');
    const { config } = await modules();
    const warnings: string[] = [];
    config.loadConfig(m => warnings.push(m));
    expect(warnings).toEqual([]);
    expect(store.get('sessionString')).toBe('session-A');
    expect(readFileSync(file, 'utf8')).not.toMatch(/session-A/);
  });
});
