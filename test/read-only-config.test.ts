import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// An in-memory Keychain under the real secrets.ts, so the real secret resolution runs and the real
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

/** Fresh modules for each test (config.ts caches the loaded config for a second). */
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
  it('outside a read, writeEnabled in the file is ignored and nothing moves into the store', async () => {
    writeFileSync(file, OLD);
    store.set('writeEnabled', 'ask');
    const { config } = await modules();
    const loaded = config.loadConfig(() => {}) as Record<string, unknown>;
    expect(loaded.writeEnabled).toBeUndefined();
    expect(loaded.sessionString).toBe('file-session');
    expect(store.get('writeEnabled')).toBe('ask');
    expect(store.has('apiHash')).toBe(false);
    expect(readFileSync(file, 'utf8')).toBe(OLD);
  });

  it('read-only (no stored mode) stays read-only after a run with writeEnabled planted in the file', async () => {
    writeFileSync(file, OLD);
    const { config } = await modules();
    config.loadConfig(() => {});
    expect(store.has('writeEnabled')).toBe(false);
  });
});

// Review rounds 2–4: a read and the write after it must use the same account. One resolution for
// both: one strict store read per key; stored wins, missing falls back to the file, a failed read
// stops. Nothing is written on load.
describe('whoami → write resolve the same account', () => {
  const B = '{"apiId": 1, "apiHash": "file-hash", "sessionString": "session-B"}';

  it('with session A in the store and B in the file, both the read and the write use A; check reports it', async () => {
    writeFileSync(file, B);
    store.set('apiHash', 'store-hash');
    store.set('sessionString', 'session-A');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // whoami through telegram_read
    process.env.TG_READ_ONLY = '1';
    let { config } = await modules();
    expect(config.getSessionString()).toBe('session-A');
    expect(config.getCredentials().apiHash).toBe('store-hash');

    // the next write (telegram_write, its own process)
    delete process.env.TG_READ_ONLY;
    ({ config } = await modules());
    expect(config.isConfigured()).toBe(true);
    expect(config.getSessionString()).toBe('session-A');
    expect(config.getCredentials().apiHash).toBe('store-hash');
    // the conflict is only reported by `telegram check`, never printed on load
    expect(config.secretFileConflicts()).toEqual(['apiHash', 'sessionString']);
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
    // nothing changed anywhere
    expect(readFileSync(file, 'utf8')).toBe(B);
    expect(store.get('sessionString')).toBe('session-A');
    expect(store.get('apiHash')).toBe('store-hash');
  });

  it('a file-only profile (empty store): read and write both use the file, and nothing moves', async () => {
    writeFileSync(file, B);
    process.env.TG_READ_ONLY = '1';
    let { config } = await modules();
    expect(config.getSessionString()).toBe('session-B');
    delete process.env.TG_READ_ONLY;
    ({ config } = await modules());
    expect(config.getSessionString()).toBe('session-B');
    expect(config.getCredentials().apiHash).toBe('file-hash');
    expect(config.secretFileConflicts()).toEqual([]);
    expect(readFileSync(file, 'utf8')).toBe(B);
    expect(store.size).toBe(0);
  });

  it('a one-time store read failure stops both the read and the write; the next run uses A', async () => {
    writeFileSync(file, B);
    store.set('sessionString', 'session-A');

    for (const readOnly of [true, false]) {
      if (readOnly) process.env.TG_READ_ONLY = '1'; else delete process.env.TG_READ_ONLY;
      failNextRead.add('sessionString');
      const { config } = await modules();
      let error: unknown;
      try { config.getSessionString(); } catch (e) { error = e; }
      expect(String(error)).toMatch(/Could not read sessionString from the secret store \(macOS Keychain read failed.*nothing was used or changed/s);
      expect(String(error)).not.toMatch(/session-[AB]|hash/);
      // nothing was cached from the failed load: the next call reads the store again and gets A
      expect(config.getSessionString()).toBe('session-A');
    }
    expect(store.get('sessionString')).toBe('session-A');
    expect(readFileSync(file, 'utf8')).toBe(B);
  });

  it('a failure even with no file copy stops (an unreadable store is not "not logged in")', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "h"}');
    store.set('sessionString', 'session-A');
    failNextRead.add('sessionString');
    const { config } = await modules();
    expect(() => config.isConfigured()).toThrow(/Could not read sessionString/);
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

  it('a WSS fallback in a write keeps the file secrets (only transport is saved)', async () => {
    writeFileSync(file, B);
    store.set('sessionString', 'session-A');
    vi.resetModules();
    const config = await import('../src/config.js');
    const { connectClient } = await import('../src/transport.js');
    expect(config.getSessionString()).toBe('session-A');
    const make = (t: string) => ({
      connect: async () => { if (t === 'tcp') throw Object.assign(new Error('NetSocket was closed'), { name: 'NetSocketClosedError' }); return true; },
      destroy: async () => {},
    }) as never;
    await connectClient(make, { setting: 'auto', notice: () => {} });
    const text = readFileSync(file, 'utf8');
    expect(text).toMatch(/transport.*wss/);
    expect(text).toMatch(/session-B/);
    expect(text).toMatch(/file-hash/); // a file-only api_hash: its only copy
    expect(store.get('sessionString')).toBe('session-A');
  });

  it('saving a secret drops its own file copy, and only that one', async () => {
    writeFileSync(file, B);
    store.set('sessionString', 'session-A');
    const { config } = await modules();
    config.setSessionString('session-C');
    expect(store.get('sessionString')).toBe('session-C');
    const text = readFileSync(file, 'utf8');
    expect(text).not.toMatch(/session-B/);
    expect(text).toMatch(/file-hash/);
  });

  it('switching to invite credentials drops the file api_hash in the same write', async () => {
    writeFileSync(file, B);
    const { config } = await modules();
    config.setInviteCredentials(7);
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    expect(saved).toMatchObject({ apiId: 7, credentialSource: 'invite', sessionString: 'session-B' });
    expect('apiHash' in saved).toBe(false);
    expect(config.getCredentials()).toEqual({ apiId: 7, apiHash: config.INVITE_HASH_PLACEHOLDER });
  });

  it('auth and onboard report an unreadable store at their first check; onboard --json as an error event', async () => {
    writeFileSync(file, B);
    store.set('sessionString', 'session-A');
    const exit = vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw new Error(`exit ${code}`); }) as never);
    const out: string[] = [];
    const err: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation(m => { out.push(String(m)); });
    const error = vi.spyOn(console, 'error').mockImplementation(m => { err.push(String(m)); });
    try {
      failNextRead.add('sessionString');
      vi.resetModules();
      const { onboardCommand } = await import('../src/commands/onboard.js');
      await expect(onboardCommand.parseAsync(['--json'], { from: 'user' })).rejects.toThrow('exit 1');
      expect(out).toHaveLength(1);
      expect(JSON.parse(out[0])).toEqual({ event: 'error', message: expect.stringMatching(/^Could not read sessionString from the secret store/) });

      failNextRead.add('sessionString');
      vi.resetModules();
      const { authCommand } = await import('../src/commands/auth.js');
      await expect(authCommand.parseAsync([], { from: 'user' })).rejects.toThrow('exit 1');
      expect(err.join('\n')).toMatch(/^Authentication failed: Could not read sessionString/);

      // onboard without --json: the plain message on stderr, nothing on stdout
      out.length = 0;
      err.length = 0;
      failNextRead.add('sessionString');
      vi.resetModules();
      const plain = (await import('../src/commands/onboard.js')).onboardCommand;
      await expect(plain.parseAsync([], { from: 'user' })).rejects.toThrow('exit 1');
      expect(out).toEqual([]);
      expect(err.join('\n')).toMatch(/^Could not read sessionString/);
      expect([...out, ...err].join('\n')).not.toMatch(/session-[AB]/);
    } finally {
      exit.mockRestore();
      log.mockRestore();
      error.mockRestore();
    }
    expect(readFileSync(file, 'utf8')).toBe(B);
  });
});

// Review round 5: getClient() and `telegram check` take everything from ONE loaded snapshot, so a
// store that fails after the 1 s cache expired can't break a connection whose credentials it already
// gave, and check says where the session really came from.
describe('one snapshot per connection', () => {
  const later = (ms: number) => { const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + ms); };

  it('getClient() takes the transport and testServers from its snapshot, with no second store read', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "h", "transport": "wss", "testServers": true}');
    store.set('sessionString', 'session-A');
    vi.resetModules();
    const built: unknown[][] = [];
    const seen: { setting?: string } = {};
    vi.doMock('teleproto', async orig => ({
      ...(await orig<typeof import('teleproto')>()),
      TelegramClient: class { constructor(...a: unknown[]) { built.push(a); } isUserAuthorized = async () => true; },
    }));
    vi.doMock('teleproto/sessions/index.js', () => ({ StringSession: class { constructor(public s: string) {} } }));
    vi.doMock('../src/client-options.js', () => ({ clientParams: (testServers: boolean, t: string) => ({ testServers, t }) }));
    vi.doMock('../src/transport.js', async orig => ({
      ...(await orig<typeof import('../src/transport.js')>()),
      connectClient: async (make: (t: string) => unknown, options: { setting?: string }) => {
        seen.setting = options.setting;
        // The cache has expired and the store fails now: a second loadConfig() here would throw
        later(5000);
        failNextRead.add('sessionString');
        return make('wss');
      },
    }));
    try {
      const { getClient } = await import('../src/client.js');
      await getClient();
      expect(seen.setting).toBe('wss');
      expect(built).toHaveLength(1);
      expect((built[0][0] as { s: string }).s).toBe('session-A');
      expect(built[0][3]).toEqual({ testServers: true, t: 'wss' });
      expect(failNextRead.has('sessionString')).toBe(true); // nobody read the store again
    } finally {
      for (const m of ['teleproto', 'teleproto/sessions/index.js', '../src/client-options.js', '../src/transport.js']) vi.doUnmock(m);
      vi.restoreAllMocks();
    }
  });

  async function runCheck(getClient: (c: unknown) => Promise<unknown>) {
    vi.resetModules();
    vi.doMock('../src/client.js', () => ({
      getClient,
      getMe: async () => ({ firstName: 'A', username: 'a' }),
      disconnectClient: async () => {},
    }));
    const out: string[] = [];
    const err: string[] = [];
    vi.spyOn(console, 'log').mockImplementation(m => { out.push(String(m)); });
    vi.spyOn(console, 'error').mockImplementation(m => { err.push(String(m)); });
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw new Error(`exit ${code}`); }) as never);
    let error: unknown;
    try {
      const { checkCommand } = await import('../src/commands/check.js');
      await checkCommand.parseAsync([], { from: 'user' });
    } catch (e) {
      error = e;
    } finally {
      vi.doUnmock('../src/client.js');
      vi.restoreAllMocks();
    }
    return { out: out.join('\n'), err: err.join('\n'), error };
  }

  it('check names config.json5 for a file-only session, not the reachable Keychain', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "h", "sessionString": "session-B", "testServers": true}');
    let given: unknown;
    const r = await runCheck(async c => { given = c; later(5000); failNextRead.add('sessionString'); return {}; });
    expect(r.error).toBeUndefined();
    expect(r.out).toMatch(/Session stored in: config\.json5 \(plaintext file, used as is/);
    expect(r.out).not.toMatch(/Keychain/);
    expect(r.out).toMatch(/Servers: TEST/); // from the snapshot, after the store started failing
    expect((given as { sessionString: string }).sessionString).toBe('session-B');
  });

  it('check names the store for a stored session and lists the differing file copies', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "h", "sessionString": "session-B"}');
    store.set('sessionString', 'session-A');
    let given: unknown;
    const r = await runCheck(async c => { given = c; return {}; });
    expect(r.out).toMatch(/config\.json5 also holds a sessionString that differs/);
    expect(r.out).toMatch(/Session stored in: macOS Keychain/);
    expect((given as { sessionString: string }).sessionString).toBe('session-A');
  });

  it('check reports a store read failure as one red line, never a stack', async () => {
    writeFileSync(file, '{"apiId": 1, "apiHash": "h", "sessionString": "session-B"}');
    store.set('sessionString', 'session-A');
    failNextRead.add('sessionString');
    const getClient = vi.fn();
    const r = await runCheck(getClient);
    expect(String(r.error)).toMatch(/exit 1/);
    expect(r.err).toMatch(/Could not read sessionString from the secret store/);
    expect(r.err).not.toMatch(/\n\s+at /);
    expect(getClient).not.toHaveBeenCalled();
  });
});
