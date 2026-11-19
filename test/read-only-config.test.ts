import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// An in-memory Keychain under the real secrets.ts, so the real migration code runs and the real
// Keychain is never touched; 1Password, Secret Service and DPAPI are off.
const store = vi.hoisted(() => new Map<string, string>());
// Keys whose next strict read fails once (a locked Keychain, 1Password offline)
const failNextRead = vi.hoisted(() => new Set<string>());
vi.mock('../src/keychain.js', async orig => ({
  ...(await orig<typeof import('../src/keychain.js')>()),
  isKeychainAvailable: () => true,
  keychainGet: (k: string) => store.get(k) ?? null,
  keychainGetStrict: (k: string) => failNextRead.delete(k)
    ? { ok: false, reason: 'macOS Keychain read failed (exit 36: User interaction is not allowed.)' }
    : { ok: true, value: store.get(k) ?? null },
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
  failNextRead.clear();
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

    // the next write (telegram_write, its own process): the migration runs, but the store stays A.
    // getClient() reads through isConfigured()/getSessionString(), which silence loadConfig's
    // parse warnings; the conflict warning must reach stderr anyway.
    delete process.env.TG_READ_ONLY;
    ({ config } = await modules());
    const warnings: string[] = [];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(m => { warnings.push(String(m)); });
    expect(config.isConfigured()).toBe(true);
    expect(config.getSessionString()).toBe('session-A');
    errSpy.mockRestore();
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
    const errSpy = vi.spyOn(console, 'error').mockImplementation(m => { warnings.push(String(m)); });
    config.loadConfig(m => warnings.push(m));
    errSpy.mockRestore();
    expect(warnings).toEqual([]);
    expect(store.get('sessionString')).toBe('session-A');
    expect(readFileSync(file, 'utf8')).not.toMatch(/session-A/);
  });

  // Review round 3: a failed store read is not "no session"
  it('a one-time read failure of the stored session: the write stops, nothing changes, the next run uses A', async () => {
    const before = '{"apiId": 1, "sessionString": "session-B"}';
    writeFileSync(file, before);
    store.set('sessionString', 'session-A');
    failNextRead.add('sessionString');
    let { config } = await modules();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => config.getSessionString()).toThrow(/Could not read sessionString from the secret store \(macOS Keychain read failed.*nothing was changed/s);
    // the same process keeps refusing (the migration runs once, the error stays)
    expect(() => config.isConfigured()).toThrow(/secret store/);
    errSpy.mockRestore();
    expect(store.get('sessionString')).toBe('session-A');
    expect(readFileSync(file, 'utf8')).toBe(before);
    // the error names no secret
    try { config.loadConfig(() => {}); } catch (e) { expect(String(e)).not.toMatch(/session-[AB]/); }

    // the store reads again: the next run resolves A, and B is still not written anywhere
    ({ config } = await modules());
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(config.getSessionString()).toBe('session-A');
    quiet.mockRestore();
    expect(store.get('sessionString')).toBe('session-A');
  });

  // Only the migration reads strictly. The overlay after it (and a read's overlay) still uses the
  // lenient secretGet, so a failed overlay read would fall back to the file copy; that is issue #115.
  it('a read (TG_READ_ONLY) skips the migration, so its strict read is never made and never stops it', async () => {
    writeFileSync(file, '{"apiId": 1, "sessionString": "session-B"}');
    store.set('sessionString', 'session-A');
    failNextRead.add('sessionString');
    process.env.TG_READ_ONLY = '1';
    const { config } = await modules();
    expect(config.getSessionString()).toBe('session-A');
  });

  it('a WSS fallback in a write keeps the conflicting file session (only transport is saved)', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "file-hash", "sessionString": "session-B"}');
    store.set('apiHash', 'store-hash');
    store.set('sessionString', 'session-A');
    vi.resetModules();
    const config = await import('../src/config.js');
    const { connectClient } = await import('../src/transport.js');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(config.getSessionString()).toBe('session-A'); // the migration ran and kept B in the file
    errSpy.mockRestore();
    const make = (t: string) => ({
      connect: async () => { if (t === 'tcp') throw Object.assign(new Error('NetSocket was closed'), { name: 'NetSocketClosedError' }); return true; },
      destroy: async () => {},
    }) as never;
    await connectClient(make, { setting: 'auto', notice: () => {} });
    const text = readFileSync(file, 'utf8');
    expect(text).toMatch(/transport.*wss/);
    expect(text).toMatch(/session-B/);
    expect(text).toMatch(/file-hash/);
    expect(store.get('sessionString')).toBe('session-A');
  });

  it('saving a secret still drops its own file copy, and only that one', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "file-hash", "sessionString": "session-B"}');
    store.set('apiHash', 'store-hash');
    store.set('sessionString', 'session-A');
    const { config } = await modules();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    config.setSessionString('session-C');
    errSpy.mockRestore();
    expect(store.get('sessionString')).toBe('session-C');
    const text = readFileSync(file, 'utf8');
    expect(text).not.toMatch(/session-B/);
    expect(text).toMatch(/file-hash/);
  });

  it('a failed read of one key changes nothing for the other either: the file stays as it is', async () => {
    const before = '{"apiId": 1, "apiHash": "file-hash", "sessionString": "session-B"}';
    writeFileSync(file, before);
    store.set('sessionString', 'session-A'); // apiHash is not in the store: it alone would migrate
    failNextRead.add('sessionString');
    const { config } = await modules();
    expect(() => config.loadConfig(() => {})).toThrow(/Could not read sessionString/);
    expect(readFileSync(file, 'utf8')).toBe(before);
    expect(store.has('apiHash')).toBe(false);
  });

  it('getClient() stops with the store error and never connects', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "h", "sessionString": "session-B"}');
    store.set('sessionString', 'session-A');
    failNextRead.add('sessionString');
    vi.resetModules();
    const connectClient = vi.fn();
    vi.doMock('../src/transport.js', () => ({ connectClient }));
    try {
      const { getClient } = await import('../src/client.js');
      await expect(getClient()).rejects.toThrow(/Could not read sessionString from the secret store/);
      expect(connectClient).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock('../src/transport.js');
    }
  });
});
