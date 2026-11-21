import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { platform } from "node:os";
import { dirname, join } from "node:path";

import { withLockFile } from "./file-lock.js";
import type { StrictRead } from "./keychain.js";
import { configFile } from "./paths.js";
import { spawnAsync } from "./spawn-async.js";

const PS = join(
  process.env.SystemRoot || "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe"
);
const ENTROPY = "better-tg-cli";

/** PowerShell reads the script as UTF-16LE base64, so no quoting can break it. */
export function encodedCommand(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

function dpapiScript(op: "Protect" | "Unprotect"): string {
  return (
    "Add-Type -AssemblyName System.Security;" +
    "$in = [Console]::In.ReadToEnd().Trim();" +
    `$e = [Text.Encoding]::UTF8.GetBytes('${ENTROPY}');` +
    `$out = [Security.Cryptography.ProtectedData]::${op}([Convert]::FromBase64String($in), $e, 'CurrentUser');` +
    "[Console]::Out.Write([Convert]::ToBase64String($out))"
  );
}

function runPowerShell(script: string, input: string): string {
  const res = spawnSync(
    PS,
    [
      "-NoProfile",
      "-NonInteractive",
      "-NoLogo",
      "-EncodedCommand",
      encodedCommand(script),
    ],
    {
      input,
      encoding: "utf-8",
      timeout: 20_000,
      windowsHide: true,
    }
  );
  if (res.status !== 0 || res.error) {
    const why = (res.stderr || res.error?.message || "").trim().split("\n")[0];
    throw new Error(
      `Windows DPAPI via PowerShell failed${why ? `: ${why}` : ""}. ` +
        "If PowerShell is restricted here (Constrained Language Mode), use 1Password instead: telegram auth --op-vault <vault>"
    );
  }
  return res.stdout.trim();
}

async function runPowerShellAsync(
  script: string,
  input: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await spawnAsync(
    PS,
    [
      "-NoProfile",
      "-NonInteractive",
      "-NoLogo",
      "-EncodedCommand",
      encodedCommand(script),
    ],
    { input, timeout: 20_000, signal }
  );
  if (res.status !== 0 || res.error) {
    throw new Error("Windows DPAPI via PowerShell failed");
  }
  return res.stdout.trim();
}

/**
 * - `unprotectAsync`: unprotect without blocking the event loop (a slow PowerShell start), stopped by `signal`.
 */
export interface Crypter {
  protect(plainBase64: string): string;
  unprotect(blobBase64: string): string;
  unprotectAsync?(blobBase64: string, signal?: AbortSignal): Promise<string>;
}

const powershellCrypter: Crypter = {
  protect: (b64) => runPowerShell(dpapiScript("Protect"), b64),
  unprotect: (b64) => runPowerShell(dpapiScript("Unprotect"), b64),
  unprotectAsync: (b64, signal) =>
    runPowerShellAsync(dpapiScript("Unprotect"), b64, signal),
};

/** How long a change waits for another process's change of the same file. */
export const DPAPI_LOCK = { timeoutMs: 20_000, staleMs: 2 * 60_000 };

/**
 * Windows secret store: every secret sits in one file (`secrets.dpapi` in the config dir),
 * encrypted with DPAPI for the current Windows user through the built-in PowerShell 5.1. Only this
 * user on this machine can decrypt it. PowerShell is slow to start (~0.3–0.6 s), so the file is
 * decrypted once per process and cached for reads; a read that decides something another process
 * may have changed meanwhile (a plugin secret before it is deleted, the plugin registry key before
 * one is made) asks for a fresh copy. Every change (set, delete), whoever makes it (the session,
 * write access, plugin secrets), holds the lock file `secrets.dpapi.lock` across its whole
 * read-modify-replace: it decrypts the file again under the lock and replaces it atomically (temp
 * file in the same folder, then rename), so two processes never write back each other's old copy
 * (`write-access off` in one terminal is not undone by a plugin update in another).
 *
 * The store itself, with the crypto passed in so tests run on any OS.
 */
export function dpapiStore(
  file: () => string,
  crypter: Crypter = powershellCrypter
) {
  const cache = new Map<string, Record<string, string>>();

  function locked<T>(fn: () => T): T {
    const path = file();
    mkdirSync(dirname(path), { recursive: true });
    return withLockFile(
      `${path}.lock`,
      {
        ...DPAPI_LOCK,
        busy: () =>
          new Error(`Another telegram process is changing ${path} right now`),
      },
      fn
    );
  }

  function load(fresh = false): Record<string, string> {
    const path = file();
    if (fresh) {
      cache.delete(path);
    }
    const hit = cache.get(path);
    if (hit) {
      return hit;
    }
    let map: Record<string, string> = {};
    if (existsSync(path)) {
      const plain = Buffer.from(
        crypter.unprotect(readFileSync(path, "utf-8").trim()),
        "base64"
      ).toString("utf-8");
      map = JSON.parse(plain) as Record<string, string>;
    }
    cache.set(path, map);
    return map;
  }

  function save(map: Record<string, string>): void {
    const path = file();
    mkdirSync(dirname(path), { recursive: true });
    const blob = crypter.protect(
      Buffer.from(JSON.stringify(map), "utf-8").toString("base64")
    );
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, blob, { encoding: "utf-8", mode: 0o600 });
    renameSync(tmp, path);
    cache.set(path, map);
  }

  return {
    get(key: string, fresh = false): string | null {
      try {
        return load(fresh)[key] ?? null;
      } catch {
        return null;
      }
    },
    async getStrictAsync(
      key: string,
      signal?: AbortSignal
    ): Promise<StrictRead> {
      const path = file();
      try {
        let map = cache.get(path);
        if (!map) {
          map = {};
          if (existsSync(path)) {
            const blob = readFileSync(path, "utf-8").trim();
            const plain = crypter.unprotectAsync
              ? await crypter.unprotectAsync(blob, signal)
              : crypter.unprotect(blob);
            map = JSON.parse(
              Buffer.from(plain, "base64").toString("utf-8")
            ) as Record<string, string>;
          }
          cache.set(path, map);
        }
        return { ok: true, value: map[key] ?? null };
      } catch {
        return {
          ok: false,
          reason:
            "Windows DPAPI read failed: secrets.dpapi could not be decrypted or parsed",
        };
      }
    },
    getStrict(key: string, fresh = false): StrictRead {
      try {
        return { ok: true, value: load(fresh)[key] ?? null };
      } catch {
        return {
          ok: false,
          reason:
            "Windows DPAPI read failed: secrets.dpapi could not be decrypted or parsed",
        };
      }
    },
    set(key: string, value: string): boolean {
      try {
        locked(() => save({ ...load(true), [key]: value }));
        return true;
      } catch {
        return false;
      }
    },
    delete(key: string): boolean {
      try {
        locked(() => {
          const map = { ...load(true) };
          if (!(key in map)) {
            return;
          }
          delete map[key];
          if (Object.keys(map).length) {
            save(map);
          } else {
            rmSync(file(), { force: true });
            cache.set(file(), {});
          }
        });
        return true;
      } catch {
        return false;
      }
    },
  };
}

const defaultStore = dpapiStore(() => configFile("secrets.dpapi"));

/**
 * Test seam: a store over a fake crypter and a temp file, standing in for PowerShell on any OS, so
 * the functions below (what secrets.ts calls) are exercised as on Windows.
 */
export const dpapiDeps: {
  store?: ReturnType<typeof dpapiStore>;
  available?: boolean;
} = {};
const store = () => dpapiDeps.store ?? defaultStore;

export function isDpapiAvailable(): boolean {
  if (dpapiDeps.available !== undefined) {
    return dpapiDeps.available;
  }
  return platform() === "win32" && existsSync(PS);
}

export const dpapiGet = (key: string, fresh = false) =>
  isDpapiAvailable() ? store().get(key, fresh) : null;
/**
 * Like get, but a file that cannot be decrypted or parsed is an error, not a missing key. `fresh`:
 * bypass this process's decrypted copy (a value another process may have changed since).
 */
export const dpapiGetStrict = (key: string, fresh = false): StrictRead =>
  isDpapiAvailable()
    ? store().getStrict(key, fresh)
    : { ok: false, reason: "Windows DPAPI is not available" };
export const dpapiGetStrictAsync = async (
  key: string,
  signal?: AbortSignal
): Promise<StrictRead> =>
  isDpapiAvailable()
    ? store().getStrictAsync(key, signal)
    : { ok: false, reason: "Windows DPAPI is not available" };
export const dpapiSet = (key: string, value: string) =>
  isDpapiAvailable() && store().set(key, value);
export const dpapiDelete = (key: string) =>
  isDpapiAvailable() && store().delete(key);
