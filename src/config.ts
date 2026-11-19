import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { configFile } from './paths.js';
import { parseConfigText, stringifyConfig } from './config-format.js';
import {
  isSecretKey,
  isSecretStoreAvailable,
  secretDelete,
  secretGetStrict,
  secretSet,
} from './secrets.js';

export interface TgConfig {
  apiId?: number;
  apiHash?: string;
  sessionString?: string;
  defaultFormat?: 'plain' | 'json' | 'markdown';
  opVault?: string;
  /** 'invite': api credentials came from the broker; api_hash is deliberately not stored. */
  credentialSource?: 'own' | 'invite';
  /** Session lives on Telegram's test DCs (`telegram auth --test-dc`). */
  testServers?: boolean;
  /** How to reach Telegram: saved as "wss" when TCP is blocked (see src/transport.ts). */
  transport?: 'tcp' | 'wss';
}

const DEFAULT_CONFIG: TgConfig = {
  defaultFormat: 'plain',
};

// Cache loaded config to avoid repeated file I/O
let cachedConfig: TgConfig | null = null;
/** Per loaded snapshot: where each secret came from and which file copies differ from the store. */
interface SecretsInfo {
  conflicts: string[];
  sources: Partial<Record<SecretKey, 'store' | 'file'>>;
}
const secretsInfo = new WeakMap<TgConfig, SecretsInfo>();
let cachedConfigTime: number = 0;
const CONFIG_CACHE_TTL_MS = 1000; // 1 second cache

function getGlobalConfigPath(): string {
  return configFile('config.json5');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readConfigFile(path: string, warn: (message: string) => void): Partial<TgConfig> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = parseConfigText(raw);

    // Validate that parsed result is a plain object
    if (!isPlainObject(parsed)) {
      warn(`Config at ${path} must be an object, got ${typeof parsed}`);
      return {};
    }

    return parsed as Partial<TgConfig>;
  } catch (error) {
    warn(`Failed to parse config at ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

export function loadConfig(warn: (message: string) => void = console.warn): TgConfig {
  // Return cached config if still valid
  const now = Date.now();
  if (cachedConfig && (now - cachedConfigTime) < CONFIG_CACHE_TTL_MS) {
    return cachedConfig;
  }

  const globalPath = getGlobalConfigPath();
  const fileConfig = readConfigFile(globalPath, warn);

  // File values + the stored secrets, which win. writeEnabled is never taken from the file: the
  // write mode lives in the store (write-store.ts).
  const config: TgConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
  };
  delete (config as Record<string, unknown>).writeEnabled;
  secretsInfo.set(config, resolveSecrets(config, fileConfig));

  cachedConfig = config;
  cachedConfigTime = now;

  return cachedConfig;
}

/** The secrets of a config: the store holds them, config.json5 may hold an older copy. */
const CONFIG_SECRETS = ['apiHash', 'sessionString'] as const;
type SecretKey = typeof CONFIG_SECRETS[number];

/**
 * How every command, read or write, gets the session and api_hash: one strict store read per key.
 * Stored → that value; missing → the file copy, if any; a failed read (locked Keychain, 1Password
 * offline) throws, so no command connects with a file copy that may be another account. Writes
 * nothing. Returns where each secret came from and which file copies differ (for `telegram check`).
 */
function resolveSecrets(config: TgConfig, fileConfig: Partial<TgConfig>): SecretsInfo {
  const conflicts: string[] = [];
  const sources: SecretsInfo['sources'] = {};
  const storeAvailable = isSecretStoreAvailable();
  const target = config as Record<string, unknown>;
  for (const key of CONFIG_SECRETS) {
    const fileValue = fileConfig[key];
    const fileHasValue = typeof fileValue === 'string' && fileValue !== '';
    if (fileHasValue) sources[key] = 'file';
    if (!storeAvailable) continue;
    const read = secretGetStrict(key, fileHasValue);
    if (!read.ok) {
      throw new Error(`Could not read ${key} from the secret store (${read.reason}), so nothing was used or changed. ` +
        'Fix access to the secret store (unlock the Keychain, sign in to 1Password) and run the command again. ' +
        `If the store is meant to be empty here (a profile kept in config.json5, a new 1Password vault), remove ${key} ` +
        'from config.json5 or unset the 1Password vault, then log in again.');
    }
    if (read.value) {
      if (fileHasValue && fileValue !== read.value) conflicts.push(key);
      target[key] = read.value;
      sources[key] = 'store';
    }
  }
  return { conflicts, sources };
}

/**
 * Secrets whose copy in config.json5 differs from the stored one, in the given snapshot. The stored
 * value is used; the file copy is left as it is (moving or resolving it is #116).
 */
export function secretFileConflicts(config: TgConfig = loadConfig(() => {})): string[] {
  return [...(secretsInfo.get(config)?.conflicts ?? [])];
}

/** Where a secret of the given snapshot came from: the secret store, config.json5, or nowhere. */
export function secretSource(key: SecretKey, config: TgConfig): 'store' | 'file' | undefined {
  return secretsInfo.get(config)?.sources[key];
}

/** Save settings; a key given as `undefined` is removed from config.json5 in the same write. */
export function saveConfig(config: Partial<TgConfig>): void {
  const path = getGlobalConfigPath();
  const dir = dirname(path);

  // Create directory with restrictive permissions (owner only)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  // Route secrets to secret store when available
  const fileData: Partial<TgConfig> = {};
  const removed = new Set<string>();
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      removed.add(key);
    } else if (isSecretKey(key) && isSecretStoreAvailable() && typeof value === 'string') {
      if (!secretSet(key, value)) {
        // Secret store write failed — fall back to file storage
        (fileData as Record<string, unknown>)[key] = value;
      }
    } else {
      (fileData as Record<string, unknown>)[key] = value;
    }
  }

  // Load existing config and merge, with proper error handling
  let existing: Partial<TgConfig> = {};
  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = parseConfigText(raw);
      if (isPlainObject(parsed)) {
        existing = parsed as Partial<TgConfig>;
      }
    } catch (error) {
      // Log but don't fail - we'll overwrite with new config
      console.warn(`Warning: Could not read existing config, will be overwritten: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Drop the file copy of a secret this call saves to the store, and only that one: an old profile's
  // file copy may be its only copy, so saving an unrelated setting (transport, testServers) keeps it.
  if (isSecretStoreAvailable()) {
    for (const key of Object.keys(existing)) {
      if (isSecretKey(key) && key in config && !(key in fileData)) {
        delete (existing as Record<string, unknown>)[key];
      }
    }
  }

  for (const key of removed) delete (existing as Record<string, unknown>)[key];
  const merged = { ...existing, ...fileData };
  const content = stringifyConfig(merged);

  // Write with restrictive permissions (owner read/write only)
  writeFileSync(path, content, { encoding: 'utf8', mode: 0o600 });

  // Invalidate cache
  cachedConfig = null;
}

export function getConfigPath(): string {
  return getGlobalConfigPath();
}

/**
 * api_hash is only sent to Telegram at login (auth.sendCode). Invite users never keep
 * it, so after login the client runs with this placeholder; teleproto just needs a
 * non-empty value for its constructor.
 */
export const INVITE_HASH_PLACEHOLDER = 'invite-no-hash-stored';

export function isConfigured(config: TgConfig = loadConfig(() => {})): boolean {
  if ((config.apiId ?? 0) <= 0) return false;
  return (config.apiHash ?? '') !== '' || config.credentialSource === 'invite';
}

/** Save only the api_id of the broker's app; drop any stored api_hash. */
export function setInviteCredentials(apiId: number): void {
  if (isSecretStoreAvailable()) secretDelete('apiHash');
  // One write: the new source and the dropped file api_hash never exist apart
  saveConfig({ apiId, credentialSource: 'invite', apiHash: undefined });
}

export function setCredentials(apiId: number, apiHash: string): void {
  saveConfig({ apiId, apiHash, credentialSource: 'own' });
}

export function getCredentials(config: TgConfig = loadConfig(() => {})): { apiId: number; apiHash: string } {
  return {
    apiId: config.apiId ?? 0,
    apiHash: config.apiHash || (config.credentialSource === 'invite' ? INVITE_HASH_PLACEHOLDER : ''),
  };
}

export function setSessionString(session: string): void {
  saveConfig({ sessionString: session });
}

export function getSessionString(): string | undefined {
  const config = loadConfig(() => {});
  return config.sessionString;
}

/** The stored session as it is now, past this process's one-second cache (another process may have logged in). */
export function freshSessionString(): string | undefined {
  cachedConfig = null;
  return getSessionString();
}

export function clearSessionString(): void {
  // Delete from secret store
  secretDelete('sessionString');

  // Delete from file
  const path = getGlobalConfigPath();
  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = parseConfigText(raw);
      if (isPlainObject(parsed) && 'sessionString' in parsed) {
        delete parsed.sessionString;
        writeFileSync(path, stringifyConfig(parsed), { encoding: 'utf8', mode: 0o600 });
      }
    } catch {
      // If we can't parse, nothing to clear
    }
  }

  // Invalidate cache
  cachedConfig = null;
}
