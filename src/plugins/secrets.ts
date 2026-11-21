/**
 * Plugin secrets (docs/plugins.md §6): values only a human enters, kept in the profile's secret
 * store under a key the core builds (profile, installation, secret name, generation). The plugin
 * never sees one: the host puts it into a request header itself (http.ts) and strips it from the
 * response.
 *
 * The generation is a hash of the secret's inject rule (origin, paths, header, format): a value is
 * stored for one rule only. An update that keeps the rule keeps the generation, so the value
 * carries over; one that changes it moves the secret to a new generation, which starts empty (the
 * human types it again), and a run still on the old revision reads only the old generation. So a
 * value typed for one destination is never sent to another, whatever runs at the same time.
 *
 * Where the values live, in this order:
 *   - a store a test injected (`pluginSecretDeps.store`), in memory;
 *   - under TG_MOCK, a 0600 file in the mock plugin home (fake values; never the real store);
 *   - under VITEST otherwise, nowhere: every call is refused, so no test can reach the Keychain,
 *     Secret Service, DPAPI or 1Password through this module;
 *   - the profile's secret store (src/secrets.ts), the one that holds the session.
 */
import { mkdirSync } from 'node:fs';
import { isMock, profile } from '../paths.js';
import { CliError, EXIT } from '../errors.js';
import { isSecretStoreAvailable, secretDelete, secretGetStrict, secretGetStrictAsync, secretSet } from '../secrets.js';
import type { StrictRead } from '../keychain.js';
import { secretStoreHint } from '../write-store.js';
import { KEY_RE } from './manifest.js';
import { GEN_RE, slotOf, type SecretDecl, type SecretSlot } from './secret-slots.js';

export * from './secret-slots.js';
import { anchor, readRegular, writeRegular } from './safe-fs.js';
import { pluginHome, withPluginLock } from './store.js';

export interface PluginSecretStore {
  /**
   * The value, or null when none is set. Throws when the store cannot be read. Never a copy this
   * process cached: what it decides (delete it, say it is set) may have changed in another process.
   */
  get(key: string): string | null;
  /** get without blocking the event loop, stopped when `signal` aborts (a request's deadline). */
  getAsync?(key: string, signal: AbortSignal): Promise<string | null>;
  set(key: string, value: string): boolean;
  delete(key: string): boolean;
}

/** Test seam: an in-memory store. */
export const pluginSecretDeps: { store?: PluginSecretStore } = {};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The length and alphabet a secret value must have: printable ASCII, safe in a header, long enough to strip. */
export const SECRET_MIN = 8;
export const SECRET_MAX = 4096;

export function secretValueProblem(value: string): string | undefined {
  if (value.length < SECRET_MIN) return `is shorter than ${SECRET_MIN} characters`;
  if (value.length > SECRET_MAX) return `is longer than ${SECRET_MAX} characters`;
  if (!/^[\x21-\x7e]([\x20-\x7e]*[\x21-\x7e])?$/.test(value)) return 'must be printable ASCII without line breaks or leading/trailing spaces';
  return undefined;
}

/**
 * The store key of a plugin secret, built by the core only: profile, installation ID, secret name
 * and generation (a slot without one is the key an install before generations used).
 */
export function pluginSecretKey(installId: string, slot: SecretSlot | { name: string; gen?: string }): string {
  if (!UUID_RE.test(installId) && installId !== 'plugin-dev') throw new CliError('Invalid installation ID', 'plugin_lock_invalid', EXIT.ERROR);
  if (!KEY_RE.test(slot.name)) throw new CliError(`Invalid secret name "${slot.name}"`, 'invalid_argument', EXIT.USAGE);
  if (slot.gen !== undefined && !GEN_RE.test(slot.gen)) throw new CliError('Invalid secret generation', 'plugin_lock_invalid', EXIT.ERROR);
  return `plugin-secret-${profile() ?? 'default'}-${installId}-${slot.name}${slot.gen ? `-g${slot.gen}` : ''}`;
}

const unavailable = (why: string) => new CliError(`The secret store is unavailable (${why}); plugin secrets are kept only there`, 'secret_store_unavailable', EXIT.ERROR, {
  hint: secretStoreHint(),
});

const MOCK_FILE = 'plugin-secrets.json';

/** The mock account's secrets: fake values in a 0600 file beside the mock plugin data. */
const mockStore: PluginSecretStore = {
  get: key => {
    const all = readMock();
    return Object.hasOwn(all, key) ? all[key] : null;
  },
  set: (key, value) => withPluginLock(() => {
    const all = readMock();
    all[key] = value;
    writeRegular(mockRoot(true), MOCK_FILE, JSON.stringify(all));
    return true;
  }),
  delete: key => withPluginLock(() => {
    const all = readMock();
    if (!Object.hasOwn(all, key)) return false;
    delete all[key];
    writeRegular(mockRoot(true), MOCK_FILE, JSON.stringify(all));
    return true;
  }),
};

function mockRoot(create = false): string {
  if (create) mkdirSync(pluginHome(), { recursive: true, mode: 0o700 });
  return anchor(pluginHome());
}

function readMock(): Record<string, string> {
  let bytes: Uint8Array | undefined;
  try {
    bytes = readRegular(mockRoot(), MOCK_FILE, { singleLink: true, maxBytes: 1024 * 1024 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return Object.create(null) as Record<string, string>;
    throw e;
  }
  const out = Object.create(null) as Record<string, string>;
  if (!bytes) return out;
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (parsed && typeof parsed === 'object') for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') out[k] = v;
  return out;
}

/** Under VITEST without TG_MOCK or an injected store: refused, never the real backend. */
const testRefusal: PluginSecretStore = {
  get: () => { throw unavailable('tests never use the real secret store'); },
  set: () => { throw unavailable('tests never use the real secret store'); },
  delete: () => { throw unavailable('tests never use the real secret store'); },
};

/** What the profile's secret store offers this module (src/secrets.ts; a test passes the DPAPI functions over a fake crypter). */
export interface SecretBackend {
  available(): boolean;
  getStrict(key: string, fresh: boolean): StrictRead;
  getStrictAsync(key: string, signal: AbortSignal): Promise<StrictRead>;
  set(key: string, value: string): boolean;
  delete(key: string): boolean;
}

/**
 * A PluginSecretStore over a backend. `get` reads afresh (never DPAPI's per-process copy): the MCP
 * server is long-lived, and a value another process set or deleted since must count. A request's
 * read (`getAsync`) runs in a fresh `plugin run` process and may use its copy.
 */
export function backendStore(b: SecretBackend): PluginSecretStore {
  const none = () => unavailable('no macOS Keychain, Secret Service, DPAPI or 1Password here');
  return {
    get: key => {
      if (!b.available()) throw none();
      const r = b.getStrict(key, true);
      if (!r.ok) throw unavailable(r.reason);
      return r.value;
    },
    getAsync: async (key, signal) => {
      if (!b.available()) throw none();
      const r = await b.getStrictAsync(key, signal);
      if (!r.ok) throw unavailable(r.reason);
      return r.value;
    },
    set: (key, value) => {
      if (!b.available()) throw none();
      return b.set(key, value);
    },
    delete: key => (b.available() ? b.delete(key) : false),
  };
}

/** The profile's secret store (src/secrets.ts). */
const systemStore = backendStore({
  available: () => isSecretStoreAvailable(),
  getStrict: (key, fresh) => secretGetStrict(key, false, fresh),
  getStrictAsync: (key, signal) => secretGetStrictAsync(key, signal),
  set: (key, value) => secretSet(key, value),
  delete: key => secretDelete(key),
});

export function pluginSecretStore(): PluginSecretStore {
  if (pluginSecretDeps.store) return pluginSecretDeps.store;
  if (isMock()) return mockStore;
  if (process.env.VITEST) return testRefusal;
  return systemStore;
}

/** The value of a declared secret of an installation at one generation, or null when the human has not set it. */
export function getPluginSecret(installId: string, slot: SecretSlot | { name: string; gen?: string }): string | null {
  return pluginSecretStore().get(pluginSecretKey(installId, slot));
}

/** getPluginSecret for a request: asynchronous where the store can be, stopped when `signal` aborts. */
export async function getPluginSecretAsync(installId: string, slot: SecretSlot, signal: AbortSignal): Promise<string | null> {
  const key = pluginSecretKey(installId, slot);
  const store = pluginSecretStore();
  return store.getAsync ? store.getAsync(key, signal) : store.get(key);
}

export function setPluginSecret(installId: string, slot: SecretSlot, value: string): void {
  const problem = secretValueProblem(value);
  if (problem) throw new CliError(`The secret ${problem}`, 'invalid_argument', EXIT.USAGE);
  const key = pluginSecretKey(installId, slot);
  const store = pluginSecretStore();
  if (!store.set(key, value) || store.get(key) !== value) throw unavailable('it did not save the secret');
}

export function deletePluginSecret(installId: string, slot: SecretSlot | { name: string; gen?: string }): boolean {
  return pluginSecretStore().delete(pluginSecretKey(installId, slot));
}

/** Gone from the store: not there (a fresh read), or deleted now. False when it is still there or the store failed. */
export function erasePluginSecret(installId: string, slot: SecretSlot | { name: string; gen?: string }): boolean {
  try {
    return getPluginSecret(installId, slot) === null || deletePluginSecret(installId, slot);
  } catch {
    return false;
  }
}

/** Which declared secrets hold a value at their current generation (never the values). A store that cannot be read gives `unknown`. */
export function secretStates(installId: string, decls: readonly SecretDecl[]): Record<string, 'set' | 'not set' | 'unknown'> {
  const out: Record<string, 'set' | 'not set' | 'unknown'> = {};
  for (const d of decls) {
    try {
      out[d.name] = getPluginSecret(installId, slotOf(d)) !== null ? 'set' : 'not set';
    } catch {
      out[d.name] = 'unknown';
    }
  }
  return out;
}
