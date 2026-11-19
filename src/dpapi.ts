import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { configFile } from './paths.js';
import type { StrictRead } from './keychain.js';

/**
 * Windows secret store: every secret sits in one file (`secrets.dpapi` in the config dir),
 * encrypted with DPAPI for the current Windows user through the built-in PowerShell 5.1. Only this
 * user on this machine can decrypt it. PowerShell is slow to start (~0.3–0.6 s), so the file is
 * decrypted once per process and cached for reads. A change (set, delete) decrypts the file again
 * right before it, so a key another process changed since the cache was filled is not written back
 * from the stale copy, and replaces the file atomically (temp file in the same folder, then rename).
 * There is no cross-process lock: two changes that interleave between their read and their rename
 * still lose one of the two (last rename wins), but a value is never brought back from an old cache.
 */

const PS = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
// Extra entropy: a DPAPI blob made by another program for this user doesn't decrypt as ours
const ENTROPY = 'better-tg-cli';

/** PowerShell reads the script as UTF-16LE base64, so no quoting can break it. */
export function encodedCommand(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64');
}

function dpapiScript(op: 'Protect' | 'Unprotect'): string {
  // Stdin carries base64 only: PowerShell 5.1 reads stdin in the OEM codepage
  return 'Add-Type -AssemblyName System.Security;' +
    '$in = [Console]::In.ReadToEnd().Trim();' +
    `$e = [Text.Encoding]::UTF8.GetBytes('${ENTROPY}');` +
    `$out = [Security.Cryptography.ProtectedData]::${op}([Convert]::FromBase64String($in), $e, 'CurrentUser');` +
    '[Console]::Out.Write([Convert]::ToBase64String($out))';
}

function runPowerShell(script: string, input: string): string {
  const res = spawnSync(PS, ['-NoProfile', '-NonInteractive', '-NoLogo', '-EncodedCommand', encodedCommand(script)], {
    input,
    encoding: 'utf8',
    timeout: 20_000,
    windowsHide: true,
  });
  if (res.status !== 0 || res.error) {
    const why = (res.stderr || res.error?.message || '').trim().split('\n')[0];
    throw new Error(`Windows DPAPI via PowerShell failed${why ? `: ${why}` : ''}. ` +
      'If PowerShell is restricted here (Constrained Language Mode), use 1Password instead: telegram auth --op-vault <vault>');
  }
  return res.stdout.trim();
}

export interface Crypter {
  protect(plainBase64: string): string;
  unprotect(blobBase64: string): string;
}

const powershellCrypter: Crypter = {
  protect: b64 => runPowerShell(dpapiScript('Protect'), b64),
  unprotect: b64 => runPowerShell(dpapiScript('Unprotect'), b64),
};

/** The store itself, with the crypto passed in so tests run on any OS. */
export function dpapiStore(file: () => string, crypter: Crypter = powershellCrypter) {
  const cache = new Map<string, Record<string, string>>();

  function load(fresh = false): Record<string, string> {
    const path = file();
    if (fresh) cache.delete(path);
    const hit = cache.get(path);
    if (hit) return hit;
    let map: Record<string, string> = {};
    if (existsSync(path)) {
      const plain = Buffer.from(crypter.unprotect(readFileSync(path, 'utf8').trim()), 'base64').toString('utf8');
      map = JSON.parse(plain) as Record<string, string>;
    }
    cache.set(path, map);
    return map;
  }

  function save(map: Record<string, string>): void {
    const path = file();
    mkdirSync(dirname(path), { recursive: true });
    const blob = crypter.protect(Buffer.from(JSON.stringify(map), 'utf8').toString('base64'));
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, blob, { encoding: 'utf8', mode: 0o600 });
    renameSync(tmp, path);
    cache.set(path, map);
  }

  return {
    /** `fresh`: read the file again, for a value another process may have changed since */
    get(key: string, fresh = false): string | null {
      try {
        return load(fresh)[key] ?? null;
      } catch {
        return null;
      }
    },
    /** Like get, but a file that cannot be decrypted or parsed is an error, not a missing key. */
    getStrict(key: string): StrictRead {
      try {
        return { ok: true, value: load()[key] ?? null };
      } catch {
        // A fixed text: a JSON.parse message would quote the decrypted content, i.e. the secrets
        return { ok: false, reason: 'Windows DPAPI read failed: secrets.dpapi could not be decrypted or parsed' };
      }
    },
    set(key: string, value: string): boolean {
      try {
        save({ ...load(true), [key]: value });
        return true;
      } catch {
        return false;
      }
    },
    delete(key: string): boolean {
      try {
        const map = { ...load(true) };
        if (!(key in map)) return true;
        delete map[key];
        if (Object.keys(map).length) save(map);
        else {
          rmSync(file(), { force: true });
          cache.set(file(), {});
        }
        return true;
      } catch {
        return false;
      }
    },
  };
}

const store = dpapiStore(() => configFile('secrets.dpapi'));

export function isDpapiAvailable(): boolean {
  return platform() === 'win32' && existsSync(PS);
}

export const dpapiGet = (key: string, fresh = false) => (isDpapiAvailable() ? store.get(key, fresh) : null);
export const dpapiGetStrict = (key: string): StrictRead =>
  (isDpapiAvailable() ? store.getStrict(key) : { ok: false, reason: 'Windows DPAPI is not available' });
export const dpapiSet = (key: string, value: string) => isDpapiAvailable() && store.set(key, value);
export const dpapiDelete = (key: string) => isDpapiAvailable() && store.delete(key);
