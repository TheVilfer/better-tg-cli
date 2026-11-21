import {
  dpapiDelete,
  dpapiGet,
  dpapiGetStrict,
  dpapiGetStrictAsync,
  dpapiSet,
  isDpapiAvailable,
} from "./dpapi.js";
import {
  isKeychainAvailable,
  isSecretKey,
  keychainDelete,
  keychainGet,
  keychainGetStrict,
  keychainGetStrictAsync,
  keychainSet,
} from "./keychain.js";
import type { StrictRead } from "./keychain.js";
import {
  isLibsecretAvailable,
  libsecretDelete,
  libsecretGet,
  libsecretGetStrict,
  libsecretGetStrictAsync,
  libsecretSet,
} from "./libsecret.js";
import {
  isOnePasswordAvailable,
  opDelete,
  opGet,
  opGetStrict,
  opGetStrictAsync,
  opSet,
} from "./onepassword.js";

export { isSecretKey };

type Provider = "op" | "keychain" | "libsecret" | "dpapi" | "none";

function activeProvider(): Provider {
  if (isOnePasswordAvailable()) {
    return "op";
  }
  if (isKeychainAvailable()) {
    return "keychain";
  }
  if (isLibsecretAvailable()) {
    return "libsecret";
  }
  if (isDpapiAvailable()) {
    return "dpapi";
  }
  return "none";
}

export function isSecretStoreAvailable(): boolean {
  return activeProvider() !== "none";
}

/**
 * `fresh`: skip any value cached in this process (DPAPI decrypts its file once per process), for a
 * read-back that must see what another process wrote since. The other stores always ask anew.
 */
export function secretGet(key: string, fresh = false): string | null {
  const provider = activeProvider();
  if (provider === "op") {
    return opGet(key);
  }
  if (provider === "keychain") {
    return keychainGet(key);
  }
  if (provider === "libsecret") {
    return libsecretGet(key);
  }
  if (provider === "dpapi") {
    return dpapiGet(key, fresh);
  }
  return null;
}

/**
 * secretGet that tells a missing key ({ok: true, value: null}) from a failed read ({ok: false}).
 * `fileHasValue`: config.json5 holds this key too. 1Password can only tell "missing" by its error
 * text, so it may say "missing" only when nothing else could be used instead (see opGetStrict).
 */
export function secretGetStrict(key: string, fileHasValue = false): StrictRead {
  const provider = activeProvider();
  if (provider === "op") {
    return opGetStrict(key, fileHasValue);
  }
  if (provider === "keychain") {
    return keychainGetStrict(key);
  }
  if (provider === "libsecret") {
    return libsecretGetStrict(key);
  }
  if (provider === "dpapi") {
    return dpapiGetStrict(key);
  }
  return { ok: false, reason: "no secret store is available" };
}

/**
 * secretGetStrict without blocking the event loop (the store's tool runs as a child process that is
 * killed when `signal` aborts). For a read inside a deadline, such as a plugin request's secret.
 */
export async function secretGetStrictAsync(
  key: string,
  signal?: AbortSignal
): Promise<StrictRead> {
  const provider = activeProvider();
  if (provider === "op") {
    return opGetStrictAsync(key, signal);
  }
  if (provider === "keychain") {
    return keychainGetStrictAsync(key, signal);
  }
  if (provider === "libsecret") {
    return libsecretGetStrictAsync(key, signal);
  }
  if (provider === "dpapi") {
    return dpapiGetStrictAsync(key, signal);
  }
  return { ok: false, reason: "no secret store is available" };
}

export function secretSet(key: string, value: string): boolean {
  const provider = activeProvider();
  if (provider === "op") {
    return opSet(key, value);
  }
  if (provider === "keychain") {
    return keychainSet(key, value);
  }
  if (provider === "libsecret") {
    return libsecretSet(key, value);
  }
  if (provider === "dpapi") {
    return dpapiSet(key, value);
  }
  return false;
}

export function secretDelete(key: string): boolean {
  const provider = activeProvider();
  if (provider === "op") {
    return opDelete(key);
  }
  if (provider === "keychain") {
    return keychainDelete(key);
  }
  if (provider === "libsecret") {
    return libsecretDelete(key);
  }
  if (provider === "dpapi") {
    return dpapiDelete(key);
  }
  return false;
}
