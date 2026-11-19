import {
  SECRET_KEYS,
  isKeychainAvailable,
  isSecretKey,
  keychainDelete,
  keychainGet,
  keychainSet,
} from './keychain.js';
import {
  isOnePasswordAvailable,
  opDelete,
  opGet,
  opSet,
} from './onepassword.js';
import { isLibsecretAvailable, libsecretDelete, libsecretGet, libsecretSet } from './libsecret.js';
import { dpapiDelete, dpapiGet, dpapiSet, isDpapiAvailable } from './dpapi.js';

export { SECRET_KEYS, isSecretKey };

type Provider = 'op' | 'keychain' | 'libsecret' | 'dpapi' | 'none';

function activeProvider(): Provider {
  if (isOnePasswordAvailable()) return 'op';
  if (isKeychainAvailable()) return 'keychain';
  if (isLibsecretAvailable()) return 'libsecret';
  if (isDpapiAvailable()) return 'dpapi';
  return 'none';
}

export function isSecretStoreAvailable(): boolean {
  return activeProvider() !== 'none';
}

export function secretGet(key: string): string | null {
  const provider = activeProvider();
  if (provider === 'op') return opGet(key);
  if (provider === 'keychain') return keychainGet(key);
  if (provider === 'libsecret') return libsecretGet(key);
  if (provider === 'dpapi') return dpapiGet(key);
  return null;
}

export function secretSet(key: string, value: string): boolean {
  const provider = activeProvider();
  if (provider === 'op') return opSet(key, value);
  if (provider === 'keychain') return keychainSet(key, value);
  if (provider === 'libsecret') return libsecretSet(key, value);
  if (provider === 'dpapi') return dpapiSet(key, value);
  return false;
}

export function secretDelete(key: string): boolean {
  const provider = activeProvider();
  if (provider === 'op') return opDelete(key);
  if (provider === 'keychain') return keychainDelete(key);
  if (provider === 'libsecret') return libsecretDelete(key);
  if (provider === 'dpapi') return dpapiDelete(key);
  return false;
}

let migrationDone = false;

/**
 * Secrets that may move from an old config file into the store. Not `writeEnabled`: the write mode
 * was never saved to the file (only `write-access` sets it, straight in the store), so one found
 * there was put in by hand, and taking it would let a config-file edit turn writes on.
 */
const MIGRATED_KEYS = ['apiHash', 'sessionString'];

/**
 * Migrate secret fields from a config object into the active secret store, only where the store has
 * no value: the store always wins, as it does when the config is read (loadConfig overlays it), so a
 * read and a later write resolve the same account. A file copy that differs from the stored value is
 * left in the file with a warning (resolving that conflict is issue #116); one equal to it is dropped.
 * Returns a new config object with migrated (or duplicate) secrets removed.
 */
export function migrateSecretsToStore(
  config: Record<string, unknown>,
  warn: (message: string) => void = m => console.error(m),
): Record<string, unknown> {
  if (migrationDone || !isSecretStoreAvailable()) return config;
  migrationDone = true;

  let needsRewrite = false;
  const cleaned = { ...config };

  for (const key of MIGRATED_KEYS) {
    const value = config[key];
    if (typeof value !== 'string' || value === '') continue;
    const stored = secretGet(key);
    if (stored) {
      if (stored === value) {
        delete cleaned[key];
        needsRewrite = true;
      } else {
        warn(`config.json5 has a ${key} that differs from the secret store; using the stored one and leaving the file copy as it is.`);
      }
      continue;
    }
    if (secretSet(key, value)) {
      delete cleaned[key];
      needsRewrite = true;
    }
  }

  if (!needsRewrite) return config;
  return cleaned;
}
