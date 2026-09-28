import { homedir, platform } from 'node:os';
import { join } from 'node:path';

/**
 * TG_PROFILE isolates every piece of local state: config dir (config, audit log,
 * update cache), Keychain service (session, write access) and 1Password item names.
 * No profile = the historical locations, which existing installs depend on.
 */
export function profile(): string | undefined {
  const p = process.env.TG_PROFILE;
  if (!p) return undefined;
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(p)) {
    throw new Error(`Invalid TG_PROFILE "${p}": use lowercase letters, digits and dashes`);
  }
  return p;
}

const suffix = (): string => (profile() ? `-${profile()}` : '');

/** ~/.config/tg on macOS and Linux (existing installs depend on it), %APPDATA%\\tg on Windows. */
export function configDir(env: NodeJS.ProcessEnv = process.env, os: NodeJS.Platform = platform()): string {
  if (os === 'win32' && env.APPDATA) return join(env.APPDATA, `tg${suffix()}`);
  return join(homedir(), '.config', `tg${suffix()}`);
}

export function configFile(name: string): string {
  return join(configDir(), name);
}

/** Keychain service; 1Password items are named `<prefix>-<key>`. */
export function secretPrefix(): string {
  return `tg-cli${suffix()}`;
}
