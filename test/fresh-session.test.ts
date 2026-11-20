import { afterAll, describe, expect, it, vi } from 'vitest';

// A temp home: nothing here reads or writes the real profile
const home = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const original = { ...process.env };
  const root = mkdtempSync(join(tmpdir(), 'tg-fresh-session-'));
  Object.assign(process.env, { HOME: root, USERPROFILE: root, APPDATA: join(root, 'AppData'), TG_PROFILE: 'fresh-session-test' });
  return { root, original };
});
afterAll(async () => {
  for (const k of Object.keys(process.env)) if (!(k in home.original)) delete process.env[k];
  Object.assign(process.env, home.original);
  (await import('node:fs')).rmSync(home.root, { recursive: true, force: true });
});

/**
 * A store that keeps its own per-process cache (Windows DPAPI decrypts its file once): a plain read
 * returns what this process saw first, only a fresh read sees another process's login.
 */
const dpapi = vi.hoisted(() => ({ seen: 'session-A', now: 'session-A' }));
vi.mock('../src/secrets.js', () => ({
  isSecretStoreAvailable: () => true,
  secretGet: (k: string, fresh = false) => (k === 'sessionString' ? (fresh ? dpapi.now : dpapi.seen) : null),
  secretGetStrict: (k: string) => ({ ok: true, value: k === 'sessionString' ? dpapi.seen : null }),
  secretSet: () => true,
  secretDelete: () => {},
  SECRET_KEYS: new Set(['apiHash', 'sessionString', 'writeEnabled']),
  isSecretKey: (k: string) => ['apiHash', 'sessionString', 'writeEnabled'].includes(k),
  migrateSecretsToStore: (c: Record<string, unknown>) => c,
}));

import { freshSessionString, getSessionString } from '../src/config.js';

describe('freshSessionString', () => {
  it('sees a login another process stored, past the store\'s own cache', () => {
    expect(getSessionString()).toBe('session-A');
    dpapi.now = 'session-B';
    expect(freshSessionString()).toBe('session-B');
  });
});
