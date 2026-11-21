import { mkdirSync } from "node:fs";

import { CliError, EXIT } from "../errors.js";
import { isMock, profile } from "../paths.js";
import {
  isSecretStoreAvailable,
  secretDelete,
  secretGetStrict,
  secretGetStrictAsync,
  secretSet,
} from "../secrets.js";
import { secretStoreHint } from "../write-store.js";
import { KEY_RE } from "./manifest.js";
import { anchor, readRegular, writeRegular } from "./safe-fs.js";
import { pluginHome, withPluginLock } from "./store.js";

/**
 * - `get`: The value, or null when none is set. Throws when the store cannot be read.
 * - `getAsync`: get without blocking the event loop, stopped when `signal` aborts (a request's deadline).
 */
export interface PluginSecretStore {
  get(key: string): string | null;
  getAsync?(key: string, signal: AbortSignal): Promise<string | null>;
  set(key: string, value: string): boolean;
  delete(key: string): boolean;
}

/** Test seam: an in-memory store. */
export const pluginSecretDeps: { store?: PluginSecretStore } = {};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The length and alphabet a secret value must have: printable ASCII, safe in a header, long enough to strip. */
export const SECRET_MIN = 8;
export const SECRET_MAX = 4096;

export function secretValueProblem(value: string): string | undefined {
  if (value.length < SECRET_MIN) {
    return `is shorter than ${SECRET_MIN} characters`;
  }
  if (value.length > SECRET_MAX) {
    return `is longer than ${SECRET_MAX} characters`;
  }
  if (!/^[\u0021-\u007E]([\u0020-\u007E]*[\u0021-\u007E])?$/.test(value)) {
    return "must be printable ASCII without line breaks or leading/trailing spaces";
  }
  return undefined;
}

/** The store key of a plugin secret, built by the core only: profile, installation ID, secret name. */
export function pluginSecretKey(installId: string, name: string): string {
  if (!UUID_RE.test(installId) && installId !== "plugin-dev") {
    throw new CliError(
      "Invalid installation ID",
      "plugin_lock_invalid",
      EXIT.ERROR
    );
  }
  if (!KEY_RE.test(name)) {
    throw new CliError(
      `Invalid secret name "${name}"`,
      "invalid_argument",
      EXIT.USAGE
    );
  }
  return `plugin-secret-${profile() ?? "default"}-${installId}-${name}`;
}

const unavailable = (why: string) =>
  new CliError(
    `The secret store is unavailable (${why}); plugin secrets are kept only there`,
    "secret_store_unavailable",
    EXIT.ERROR,
    {
      hint: secretStoreHint(),
    }
  );

const MOCK_FILE = "plugin-secrets.json";

const mockStore: PluginSecretStore = {
  get: (key) => {
    const all = readMock();
    return Object.hasOwn(all, key) ? all[key] : null;
  },
  set: (key, value) =>
    withPluginLock(() => {
      const all = readMock();
      all[key] = value;
      writeRegular(mockRoot(true), MOCK_FILE, JSON.stringify(all));
      return true;
    }),
  delete: (key) =>
    withPluginLock(() => {
      const all = readMock();
      if (!Object.hasOwn(all, key)) {
        return false;
      }
      delete all[key];
      writeRegular(mockRoot(true), MOCK_FILE, JSON.stringify(all));
      return true;
    }),
};

function mockRoot(create = false): string {
  if (create) {
    mkdirSync(pluginHome(), { recursive: true, mode: 0o700 });
  }
  return anchor(pluginHome());
}

function readMock(): Record<string, string> {
  let bytes: Uint8Array | undefined;
  try {
    bytes = readRegular(mockRoot(), MOCK_FILE, {
      singleLink: true,
      maxBytes: 1024 * 1024,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return Object.create(null) as Record<string, string>;
    }
    throw error;
  }
  const out = Object.create(null) as Record<string, string>;
  if (!bytes) {
    return out;
  }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (parsed && typeof parsed === "object") {
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") {
        out[k] = v;
      }
    }
  }
  return out;
}

const testRefusal: PluginSecretStore = {
  get: () => {
    throw unavailable("tests never use the real secret store");
  },
  set: () => {
    throw unavailable("tests never use the real secret store");
  },
  delete: () => {
    throw unavailable("tests never use the real secret store");
  },
};

const systemStore: PluginSecretStore = {
  get: (key) => {
    if (!isSecretStoreAvailable()) {
      throw unavailable(
        "no macOS Keychain, Secret Service, DPAPI or 1Password here"
      );
    }
    const r = secretGetStrict(key);
    if (!r.ok) {
      throw unavailable(r.reason);
    }
    return r.value;
  },
  getAsync: async (key, signal) => {
    if (!isSecretStoreAvailable()) {
      throw unavailable(
        "no macOS Keychain, Secret Service, DPAPI or 1Password here"
      );
    }
    const r = await secretGetStrictAsync(key, signal);
    if (!r.ok) {
      throw unavailable(r.reason);
    }
    return r.value;
  },
  set: (key, value) => {
    if (!isSecretStoreAvailable()) {
      throw unavailable(
        "no macOS Keychain, Secret Service, DPAPI or 1Password here"
      );
    }
    return secretSet(key, value);
  },
  delete: (key) => (isSecretStoreAvailable() ? secretDelete(key) : false),
};

export function pluginSecretStore(): PluginSecretStore {
  if (pluginSecretDeps.store) {
    return pluginSecretDeps.store;
  }
  if (isMock()) {
    return mockStore;
  }
  if (process.env.VITEST) {
    return testRefusal;
  }
  return systemStore;
}

/** The value of a declared secret of an installation, or null when the human has not set it. */
export function getPluginSecret(
  installId: string,
  name: string
): string | null {
  return pluginSecretStore().get(pluginSecretKey(installId, name));
}

/** getPluginSecret for a request: asynchronous where the store can be, stopped when `signal` aborts. */
export async function getPluginSecretAsync(
  installId: string,
  name: string,
  signal: AbortSignal
): Promise<string | null> {
  const key = pluginSecretKey(installId, name);
  const store = pluginSecretStore();
  return store.getAsync ? store.getAsync(key, signal) : store.get(key);
}

export function setPluginSecret(
  installId: string,
  name: string,
  value: string
): void {
  const problem = secretValueProblem(value);
  if (problem) {
    throw new CliError(`The secret ${problem}`, "invalid_argument", EXIT.USAGE);
  }
  const key = pluginSecretKey(installId, name);
  const store = pluginSecretStore();
  if (!store.set(key, value) || store.get(key) !== value) {
    throw unavailable("it did not save the secret");
  }
}

export function deletePluginSecret(installId: string, name: string): boolean {
  return pluginSecretStore().delete(pluginSecretKey(installId, name));
}

/** Which declared secrets hold a value (never the values). A store that cannot be read gives `unknown`. */
export function secretStates(
  installId: string,
  names: string[]
): Record<string, "set" | "not set" | "unknown"> {
  const out: Record<string, "set" | "not set" | "unknown"> = {};
  for (const n of names) {
    try {
      out[n] = getPluginSecret(installId, n) === null ? "not set" : "set";
    } catch {
      out[n] = "unknown";
    }
  }
  return out;
}
