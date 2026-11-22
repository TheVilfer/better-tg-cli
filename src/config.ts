import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { parseConfigText, stringifyConfig } from "./config-format.js";
import { configFile } from "./paths.js";
import {
  isSecretKey,
  isSecretStoreAvailable,
  secretDelete,
  secretGet,
  secretGetStrict,
  secretSet,
} from "./secrets.js";

/**
 * - `credentialSource`: 'invite': api credentials came from the broker; api_hash is deliberately not stored.
 * - `testServers`: Session lives on Telegram's test DCs (`telegram auth --test-dc`).
 * - `transport`: How to reach Telegram: saved as "wss" when TCP is blocked (see src/transport.ts).
 */
export interface TgConfig {
  apiId?: number;
  apiHash?: string;
  sessionString?: string;
  defaultFormat?: "plain" | "json" | "markdown";
  opVault?: string;
  credentialSource?: "own" | "invite";
  testServers?: boolean;
  transport?: "tcp" | "wss";
}

const DEFAULT_CONFIG: TgConfig = {
  defaultFormat: "plain",
};

let cachedConfig: TgConfig | null = null;
interface SecretsInfo {
  conflicts: string[];
  sources: Partial<Record<SecretKey, "store" | "file">>;
}
const secretsInfo = new WeakMap<TgConfig, SecretsInfo>();
let cachedConfigTime = 0;
const CONFIG_CACHE_TTL_MS = 1000;

function getGlobalConfigPath(): string {
  return configFile("config.json5");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readConfigFile(
  path: string,
  warn: (message: string) => void
): Partial<TgConfig> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = parseConfigText(raw);

    if (!isPlainObject(parsed)) {
      warn(`Config at ${path} must be an object, got ${typeof parsed}`);
      return {};
    }

    return parsed as Partial<TgConfig>;
  } catch (error) {
    warn(
      `Failed to parse config at ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
    return {};
  }
}

export function loadConfig(
  warn: (message: string) => void = console.warn
): TgConfig {
  const now = Date.now();
  if (cachedConfig && now - cachedConfigTime < CONFIG_CACHE_TTL_MS) {
    return cachedConfig;
  }

  const globalPath = getGlobalConfigPath();
  const fileConfig = readConfigFile(globalPath, warn);

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

const CONFIG_SECRETS = ["apiHash", "sessionString"] as const;
type SecretKey = (typeof CONFIG_SECRETS)[number];

function resolveSecrets(
  config: TgConfig,
  fileConfig: Partial<TgConfig>
): SecretsInfo {
  const conflicts: string[] = [];
  const sources: SecretsInfo["sources"] = {};
  const storeAvailable = isSecretStoreAvailable();
  const target = config as Record<string, unknown>;
  for (const key of CONFIG_SECRETS) {
    const fileValue = fileConfig[key];
    const fileHasValue = typeof fileValue === "string" && fileValue !== "";
    if (fileHasValue) {
      sources[key] = "file";
    }
    if (!storeAvailable) {
      continue;
    }
    const read = secretGetStrict(key, fileHasValue);
    if (!read.ok) {
      throw new Error(
        `Could not read ${key} from the secret store (${read.reason}), so nothing was used or changed. ` +
          "Fix access to the secret store (unlock the Keychain, sign in to 1Password) and run the command again. " +
          `If the store is meant to be empty here (a profile kept in config.json5, a new 1Password vault), remove ${key} ` +
          "from config.json5 or unset the 1Password vault, then log in again."
      );
    }
    if (read.value) {
      if (fileHasValue && fileValue !== read.value) {
        conflicts.push(key);
      }
      target[key] = read.value;
      sources[key] = "store";
    }
  }
  return { conflicts, sources };
}

/**
 * Secrets whose copy in config.json5 differs from the stored one, in the given snapshot. The stored
 * value is used; the file copy is left as it is (moving or resolving it is #116).
 */
export function secretFileConflicts(
  config: TgConfig = loadConfig(() => {})
): string[] {
  return [...(secretsInfo.get(config)?.conflicts ?? [])];
}

/** Where a secret of the given snapshot came from: the secret store, config.json5, or nowhere. */
export function secretSource(
  key: SecretKey,
  config: TgConfig
): "store" | "file" | undefined {
  return secretsInfo.get(config)?.sources[key];
}

/** Save settings; a key given as `undefined` is removed from config.json5 in the same write. */
export function saveConfig(config: Partial<TgConfig>): void {
  const path = getGlobalConfigPath();
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const fileData: Partial<TgConfig> = {};
  const removed = new Set<string>();
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      removed.add(key);
    } else if (
      isSecretKey(key) &&
      isSecretStoreAvailable() &&
      typeof value === "string"
    ) {
      if (!secretSet(key, value)) {
        (fileData as Record<string, unknown>)[key] = value;
      }
    } else {
      (fileData as Record<string, unknown>)[key] = value;
    }
  }

  let existing: Partial<TgConfig> = {};
  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, "utf-8");
      const parsed = parseConfigText(raw);
      if (isPlainObject(parsed)) {
        existing = parsed as Partial<TgConfig>;
      }
    } catch (error) {
      console.warn(
        `Warning: Could not read existing config, will be overwritten: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (isSecretStoreAvailable()) {
    for (const key of Object.keys(existing)) {
      if (isSecretKey(key) && key in config && !(key in fileData)) {
        delete (existing as Record<string, unknown>)[key];
      }
    }
  }

  for (const key of removed) {
    delete (existing as Record<string, unknown>)[key];
  }
  const merged = { ...existing, ...fileData };
  const content = stringifyConfig(merged);

  writeFileSync(path, content, { encoding: "utf-8", mode: 0o600 });

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
export const INVITE_HASH_PLACEHOLDER = "invite-no-hash-stored";

export function isConfigured(config: TgConfig = loadConfig(() => {})): boolean {
  if ((config.apiId ?? 0) <= 0) {
    return false;
  }
  return (config.apiHash ?? "") !== "" || config.credentialSource === "invite";
}

/** Save only the api_id of the broker's app; drop any stored api_hash. */
export function setInviteCredentials(apiId: number): void {
  if (isSecretStoreAvailable()) {
    secretDelete("apiHash");
  }
  saveConfig({ apiId, credentialSource: "invite", apiHash: undefined });
}

export function setCredentials(apiId: number, apiHash: string): void {
  saveConfig({ apiId, apiHash, credentialSource: "own" });
}

export function getCredentials(config: TgConfig = loadConfig(() => {})): {
  apiId: number;
  apiHash: string;
} {
  return {
    apiId: config.apiId ?? 0,
    apiHash:
      config.apiHash ||
      (config.credentialSource === "invite" ? INVITE_HASH_PLACEHOLDER : ""),
  };
}

export function setSessionString(session: string): void {
  saveConfig({ sessionString: session });
}

export function getSessionString(): string | undefined {
  const config = loadConfig(() => {});
  return config.sessionString;
}

/**
 * The stored session as it is now, past every cache of this process: the one-second config cache
 * and a store's own (DPAPI decrypts its file once per process). Another process may have logged in.
 */
export function freshSessionString(): string | undefined {
  cachedConfig = null;
  if (isSecretStoreAvailable()) {
    const stored = secretGet("sessionString", true);
    if (stored) {
      return stored;
    }
  }
  return getSessionString();
}

export function clearSessionString(): void {
  secretDelete("sessionString");

  const path = getGlobalConfigPath();
  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, "utf-8");
      const parsed = parseConfigText(raw);
      if (isPlainObject(parsed) && "sessionString" in parsed) {
        delete parsed.sessionString;
        writeFileSync(path, stringifyConfig(parsed), {
          encoding: "utf-8",
          mode: 0o600,
        });
      }
    } catch {}
  }

  cachedConfig = null;
}
