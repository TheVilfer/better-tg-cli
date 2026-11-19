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
let cachedConflicts: string[] = [];
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

  // Build config: file values + the stored secrets, which take precedence over file values.
  // writeEnabled is never part of it (the write mode is read from the store by write-store.ts), so a
  // writeEnabled put into config.json5 by hand changes nothing.
  const config: TgConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
  };
  delete (config as Record<string, unknown>).writeEnabled;
  const conflicts = resolveSecrets(config, fileConfig);

  cachedConfig = config;
  cachedConflicts = conflicts;
  cachedConfigTime = now;

  return cachedConfig;
}

/** The secrets of a config: the store holds them, config.json5 may hold an older copy. */
const CONFIG_SECRETS = ['apiHash', 'sessionString'] as const;

/**
 * The one way every command, read or write, gets the session and api_hash: ONE strict store read per
 * key. Stored → that value. Missing → the file copy, if any. A failed read (locked Keychain,
 * 1Password offline) throws, read and write alike, so no command ever connects with a file copy that
 * may be another account than the stored one. Nothing is written to the store or the file here.
 * Returns the keys whose file copy differs from the stored value (shown by `telegram check`).
 */
function resolveSecrets(config: TgConfig, fileConfig: Partial<TgConfig>): string[] {
  const conflicts: string[] = [];
  if (!isSecretStoreAvailable()) return conflicts;
  const target = config as Record<string, unknown>;
  for (const key of CONFIG_SECRETS) {
    const fileValue = fileConfig[key];
    const fileHasValue = typeof fileValue === 'string' && fileValue !== '';
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
    }
  }
  return conflicts;
}

/**
 * Secrets whose copy in config.json5 differs from the stored one. The stored value is used; the file
 * copy is left as it is (moving or resolving it is #116).
 */
export function secretFileConflicts(): string[] {
  loadConfig(() => {});
  return [...cachedConflicts];
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

  // Drop the file copy of a secret this call saves to the store. Other secrets in the file stay: an
  // old profile's file copy may be its only one (nothing moves it to the store), and a save of an
  // unrelated setting (the WSS transport, testServers) must not delete it.
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

export function clearSessionString(): void {
  // Delete from secret store
  secretDelete('sessionString');
  removeFileKey('sessionString');
}

/** Remove one key from config.json5 (a secret saveConfig no longer strips on unrelated saves). */
function removeFileKey(key: string): void {
  const path = getGlobalConfigPath();
  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = parseConfigText(raw);
      if (isPlainObject(parsed) && key in parsed) {
        delete parsed[key];
        writeFileSync(path, stringifyConfig(parsed), { encoding: 'utf8', mode: 0o600 });
      }
    } catch {
      // If we can't parse, nothing to clear
    }
  }

  // Invalidate cache
  cachedConfig = null;
}
