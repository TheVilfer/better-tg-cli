import {
  SECRET_KEYS,
  isKeychainAvailable,
  isSecretKey,
  keychainDelete,
  keychainGet,
  keychainGetStrict,
  keychainSet,
  type StrictRead,
} from './keychain.js';
import {
  isOnePasswordAvailable,
  opDelete,
  opGet,
  opGetStrict,
  opSet,
} from './onepassword.js';
import { isLibsecretAvailable, libsecretDelete, libsecretGet, libsecretGetStrict, libsecretSet } from './libsecret.js';
import { dpapiDelete, dpapiGet, dpapiGetStrict, dpapiSet, isDpapiAvailable } from './dpapi.js';

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

/** secretGet that tells a missing key ({ok: true, value: null}) from a failed read ({ok: false}). */
export function secretGetStrict(key: string): StrictRead {
  const provider = activeProvider();
  if (provider === 'op') return opGetStrict(key);
  if (provider === 'keychain') return keychainGetStrict(key);
  if (provider === 'libsecret') return libsecretGetStrict(key);
  if (provider === 'dpapi') return dpapiGetStrict(key);
  return { ok: false, reason: 'no secret store is available' };
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
let migrationReadError: string | null = null;

/**
 * Set when the migration could not read a key it found in the file: the file copy may be another
 * account than the stored one, so neither may be used until the store reads again (loadConfig throws).
 */
export function secretMigrationError(): string | null {
  return migrationReadError;
}

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
 * If any store read fails (locked Keychain, 1Password offline), nothing is written or removed for any
 * key and the file is left as it is; the failure is kept for secretMigrationError(), so a write stops instead of using the file copy.
 * The conflict warning goes to stderr by default, whatever the caller does with parse warnings.
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
  // Read every key before changing anything: if one read fails, the file stays exactly as it is
  const reads = new Map<string, StrictRead>();
  for (const key of MIGRATED_KEYS) {
    const value = config[key];
    if (typeof value !== 'string' || value === '') continue;
    const read = secretGetStrict(key);
    if (!read.ok) {
      migrationReadError = `Could not read ${key} from the secret store (${read.reason}). ` +
        `config.json5 holds a ${key} too, which may belong to another account, so nothing was changed. ` +
        'Fix access to the secret store (unlock the Keychain, sign in to 1Password) and run the command again.';
      return config;
    }
    reads.set(key, read);
  }

  for (const key of MIGRATED_KEYS) {
    const value = config[key];
    if (typeof value !== 'string' || value === '') continue;
    const read = reads.get(key);
    const stored = read?.ok ? read.value : null;
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
