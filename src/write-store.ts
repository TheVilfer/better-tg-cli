import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { isSecretStoreAvailable, secretDelete, secretGet, secretSet } from './secrets.js';
import { configDir, configFile } from './paths.js';

/**
 * Where the write mode lives. With a secret store (Keychain, Secret Service, DPAPI, 1Password) it
 * sits there next to the session, out of reach of a config-file edit. Without one, as on cloud agent
 * computers (Grok Bot: Debian, no D-Bus, no TTY), it falls back to a 0600 file in the profile dir.
 * There the session itself is in a plain file the agent can read, so the mode is a guard against
 * mistakes, not a security boundary, and every status line and audit entry says so ("unprotected").
 */

const FILE = 'write-access';

export function isWriteModeProtected(): boolean {
  return isSecretStoreAvailable();
}

export function getWriteValue(): string | null {
  if (isWriteModeProtected()) return secretGet('writeEnabled');
  try {
    return readFileSync(configFile(FILE), 'utf8').trim() || null;
  } catch {
    return null;
  }
}

export function setWriteValue(value: string): boolean {
  if (isWriteModeProtected()) return secretSet('writeEnabled', value);
  try {
    const dir = configDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(configFile(FILE), `${value}\n`, { encoding: 'utf8', mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

export function deleteWriteValue(): void {
  if (isWriteModeProtected()) secretDelete('writeEnabled');
  rmSync(configFile(FILE), { force: true });
}

/** A way to ask the person that an agent can't answer for them: a real terminal or an OS dialog. */
export function hasHumanChannel(): boolean {
  if (process.stdin.isTTY && process.stdout.isTTY) return true;
  const os = platform();
  return os === 'darwin' || os === 'win32';
}

/**
 * A mode chosen without that channel (on the local page an agent could also reach) is accepted only
 * where writes are unprotected anyway. Otherwise the person runs `telegram write-access` in a terminal.
 */
export function mayTrustUnconfirmedChoice(): boolean {
  return !hasHumanChannel() && !isWriteModeProtected();
}
