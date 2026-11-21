/**
 * Plugin secrets (docs/plugins.md §6): values only a human enters, kept in the profile's secret
 * store under a key the core builds (profile, installation, secret name). The plugin never sees
 * one: the host puts it into a request header itself (http.ts) and strips it from the response.
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
import { isSecretStoreAvailable, secretDelete, secretGetStrict, secretSet } from '../secrets.js';
import { secretStoreHint } from '../write-store.js';
import { KEY_RE } from './manifest.js';
import { anchor, readRegular, writeRegular } from './safe-fs.js';
import { pluginHome, withPluginLock } from './store.js';

export interface PluginSecretStore {
  /** The value, or null when none is set. Throws when the store cannot be read. */
  get(key: string): string | null;
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

/** The store key of a plugin secret, built by the core only: profile, installation ID, secret name. */
export function pluginSecretKey(installId: string, name: string): string {
  if (!UUID_RE.test(installId) && installId !== 'plugin-dev') throw new CliError('Invalid installation ID', 'plugin_lock_invalid', EXIT.ERROR);
  if (!KEY_RE.test(name)) throw new CliError(`Invalid secret name "${name}"`, 'invalid_argument', EXIT.USAGE);
  return `plugin-secret-${profile() ?? 'default'}-${installId}-${name}`;
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

/** The profile's secret store (src/secrets.ts). */
const systemStore: PluginSecretStore = {
  get: key => {
    if (!isSecretStoreAvailable()) throw unavailable('no macOS Keychain, Secret Service, DPAPI or 1Password here');
    const r = secretGetStrict(key);
    if (!r.ok) throw unavailable(r.reason);
    return r.value;
  },
  set: (key, value) => {
    if (!isSecretStoreAvailable()) throw unavailable('no macOS Keychain, Secret Service, DPAPI or 1Password here');
    return secretSet(key, value);
  },
  delete: key => (isSecretStoreAvailable() ? secretDelete(key) : false),
};

export function pluginSecretStore(): PluginSecretStore {
  if (pluginSecretDeps.store) return pluginSecretDeps.store;
  if (isMock()) return mockStore;
  if (process.env.VITEST) return testRefusal;
  return systemStore;
}

/** The value of a declared secret of an installation, or null when the human has not set it. */
export function getPluginSecret(installId: string, name: string): string | null {
  return pluginSecretStore().get(pluginSecretKey(installId, name));
}

export function setPluginSecret(installId: string, name: string, value: string): void {
  const problem = secretValueProblem(value);
  if (problem) throw new CliError(`The secret ${problem}`, 'invalid_argument', EXIT.USAGE);
  const key = pluginSecretKey(installId, name);
  const store = pluginSecretStore();
  if (!store.set(key, value) || store.get(key) !== value) throw unavailable('it did not save the secret');
}

export function deletePluginSecret(installId: string, name: string): boolean {
  return pluginSecretStore().delete(pluginSecretKey(installId, name));
}

/** Which declared secrets hold a value (never the values). A store that cannot be read gives `unknown`. */
export function secretStates(installId: string, names: string[]): Record<string, 'set' | 'not set' | 'unknown'> {
  const out: Record<string, 'set' | 'not set' | 'unknown'> = {};
  for (const n of names) {
    try {
      out[n] = getPluginSecret(installId, n) !== null ? 'set' : 'not set';
    } catch {
      out[n] = 'unknown';
    }
  }
  return out;
}
