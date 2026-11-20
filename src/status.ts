import { parseWriteState, type WriteMode } from './write-state.js';
import { getWriteValue, isFileFallbackAllowed, isWriteModeProtected } from './write-store.js';
import { isOnePasswordAvailable } from './onepassword.js';
import { isKeychainAvailable } from './keychain.js';
import { isLibsecretAvailable } from './libsecret.js';
import { isDpapiAvailable } from './dpapi.js';
import { profile } from './paths.js';

export function getSecretBackendLabel(): string {
  if (isOnePasswordAvailable()) return '1Password';
  if (isKeychainAvailable()) return 'macOS Keychain';
  if (isLibsecretAvailable()) return 'Secret Service (libsecret)';
  if (isDpapiAvailable()) return 'Windows DPAPI';
  return 'config file (plaintext)';
}

/**
 * What `write-access --json` prints and `check --json` includes: can an agent write, and how.
 * - `writeMode`: "read-only" (every write refused, exit 4), "ask" (each write waits for the user's
 *   yes, exit 3 until then) or "on" (writes go through without asking);
 * - `writes`: the same in plain words: "without-confirmation" (on), "with-approval" (ask) or "off";
 * - `writeUntil`: when a time-limited mode ends (ISO); `writeModeExpired`: the last one ran out;
 * - `writeModeProtected`: the mode sits in the secret store, which an agent cannot edit; false means
 *   a plain file (cloud machines without a keyring) or no place at all (`writeModeStorable` false).
 */
export interface WriteStatus {
  writeMode: 'read-only' | 'ask' | 'on';
  writes: Writes;
  writeUntil?: string;
  writeModeExpired?: true;
  writeModeProtected: boolean;
  writeModeStorable: boolean;
  secretStore: string;
  profile: string | null;
}

/** Whether a write goes out, in words an agent can't misread. */
export type Writes = 'without-confirmation' | 'with-approval' | 'off';

export function writesOf(mode: WriteMode): Writes {
  return mode === 'on' ? 'without-confirmation' : mode === 'ask' ? 'with-approval' : 'off';
}

/** The first line `check` prints about writes: hard to miss, and the same three cases as `writes`. */
export function writesLine(mode: WriteMode): string {
  if (mode === 'on') return 'Writes: ON — messages are sent without confirmation';
  if (mode === 'ask') return 'Writes: ASK — each write waits for the user\'s approval';
  return 'Writes: OFF — read-only, every write is refused';
}

export function writeStatus(): WriteStatus {
  const state = parseWriteState(getWriteValue());
  const isProtected = isWriteModeProtected();
  return {
    writeMode: state.mode,
    writes: writesOf(state.mode),
    ...(state.until ? { writeUntil: state.until.toISOString() } : {}),
    ...(state.expired ? { writeModeExpired: true as const } : {}),
    writeModeProtected: isProtected,
    writeModeStorable: isProtected || isFileFallbackAllowed(),
    secretStore: getSecretBackendLabel(),
    profile: profile() || null,
  };
}
