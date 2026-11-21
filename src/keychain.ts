import { execFileSync, spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { platform, userInfo } from "node:os";

import { secretPrefix } from "./paths.js";
import { spawnAsync } from "./spawn-async.js";
import type { SpawnResult } from "./spawn-async.js";

const SECURITY_PATH = "/usr/bin/security";
export const SECRET_KEYS = new Set([
  "apiHash",
  "sessionString",
  "writeEnabled",
]);

let keychainAvailableCache: boolean | null = null;

export function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key);
}

/**
 * Why `security` must not run here, or null. `security` finds the login keychain through HOME: with
 * a temporary HOME (tests, sandboxes) it cannot, and macOS answers with a "Keychain Not Found"
 * dialog whose default button resets the user's login keychain. Tests never reach the real Keychain:
 * vitest sets VITEST, and child processes inherit it.
 */
export function keychainBlocked(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  if (env.VITEST && env.TG_TEST_REAL_KEYCHAIN !== "1") {
    return "tests never use the real Keychain";
  }
  const home = env.HOME;
  if (!home) {
    return "HOME is not set";
  }
  let real: string;
  try {
    real = userInfo().homedir;
  } catch {
    return null;
  }
  const canon = (p: string) => {
    try {
      return realpathSync(p);
    } catch {
      return p;
    }
  };
  return canon(home) === canon(real)
    ? null
    : `HOME (${home}) is not the user's home folder, so the login keychain cannot be found`;
}

export function isKeychainAvailable(): boolean {
  if (keychainAvailableCache !== null) {
    return keychainAvailableCache;
  }

  if (platform() !== "darwin" || keychainBlocked() !== null) {
    keychainAvailableCache = false;
    return false;
  }

  try {
    // Verify the security binary exists and is executable
    execFileSync(SECURITY_PATH, ["help"], { stdio: "ignore" });
    keychainAvailableCache = true;
  } catch {
    keychainAvailableCache = false;
  }

  return keychainAvailableCache;
}

/**
 * A store read that tells a missing item from a failed read. loadConfig uses it for the session and
 * api_hash: a wrong "missing" would make it fall back to a file copy that may be another account.
 */
export type StrictRead =
  | { ok: true; value: string | null }
  | { ok: false; reason: string };

/** `security` exits 44 (errSecItemNotFound) for a missing item; anything else is a failed read. */
export function keychainGetStrict(key: string): StrictRead {
  if (!isKeychainAvailable()) {
    return { ok: false, reason: "the macOS Keychain is not available" };
  }
  const r = spawnSync(
    SECURITY_PATH,
    ["find-generic-password", "-s", secretPrefix(), "-a", key, "-w"],
    {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    }
  );
  return keychainRead(r);
}

/** keychainGetStrict without blocking the event loop; `security` is killed when `signal` aborts. */
export async function keychainGetStrictAsync(
  key: string,
  signal?: AbortSignal
): Promise<StrictRead> {
  if (!isKeychainAvailable()) {
    return { ok: false, reason: "the macOS Keychain is not available" };
  }
  return keychainRead(
    await spawnAsync(
      SECURITY_PATH,
      ["find-generic-password", "-s", secretPrefix(), "-a", key, "-w"],
      { timeout: 30_000, signal }
    )
  );
}

function keychainRead(r: SpawnResult): StrictRead {
  if (r.status === 0 && !r.error) {
    return { ok: true, value: r.stdout.trimEnd() || null };
  }
  if (r.status === 44) {
    return { ok: true, value: null };
  }
  const why = (r.error?.message || r.stderr || "").trim().split("\n")[0];
  return {
    ok: false,
    reason: `macOS Keychain read failed (exit ${r.status ?? "none"}${why ? `: ${why}` : ""})`,
  };
}

export function keychainGet(key: string): string | null {
  if (!isKeychainAvailable()) {
    return null;
  }

  try {
    const result = execFileSync(
      SECURITY_PATH,
      ["find-generic-password", "-s", secretPrefix(), "-a", key, "-w"],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
    );

    return result.trimEnd();
  } catch {
    return null;
  }
}

/** Quote a value for `security -i`'s command parser (double quotes, backslash escapes). */
export function quoteForSecurityShell(value: string): string {
  if (/[\r\n\0]/.test(value)) {
    throw new Error("Secret values cannot contain newlines or NUL");
  }
  return `"${value.replaceAll(/[\\"]/g, (ch) => `\\${ch}`)}"`;
}

export function keychainSet(key: string, value: string): boolean {
  if (!isKeychainAvailable()) {
    return false;
  }

  try {
    // Feed the command through stdin (`security -i`) instead of argv, so the secret
    // (e.g. the session string) never shows up in `ps` output while it is written.
    const command = [
      "add-generic-password",
      "-s",
      quoteForSecurityShell(secretPrefix()),
      "-a",
      quoteForSecurityShell(key),
      "-w",
      quoteForSecurityShell(value),
      "-U", // update if entry already exists
    ].join(" ");
    execFileSync(SECURITY_PATH, ["-i"], {
      input: `${command}\n`,
      stdio: ["pipe", "ignore", "ignore"],
    });

    return keychainGet(key) === value;
  } catch {
    return false;
  }
}

export function keychainDelete(key: string): boolean {
  if (!isKeychainAvailable()) {
    return false;
  }

  try {
    execFileSync(
      SECURITY_PATH,
      ["delete-generic-password", "-s", secretPrefix(), "-a", key],
      { stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}

let migrationDone = false;

/**
 * Migrate secret fields from a config object into the keychain.
 * Returns a new config object with successfully migrated secrets removed.
 */
export function migrateSecretsToKeychain(
  config: Record<string, unknown>
): Record<string, unknown> {
  if (migrationDone || !isKeychainAvailable()) {
    return config;
  }
  migrationDone = true;

  let needsRewrite = false;
  const cleaned = { ...config };

  for (const key of SECRET_KEYS) {
    const value = config[key];
    if (typeof value === "string" && value !== "" && keychainSet(key, value)) {
      delete cleaned[key];
      needsRewrite = true;
    }
  }

  if (!needsRewrite) {
    return config;
  }
  return cleaned;
}
