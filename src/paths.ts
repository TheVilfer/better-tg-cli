import { homedir, platform } from "node:os";
import { join } from "node:path";

/**
 * TG_PROFILE isolates every piece of local state: config dir (config, audit log,
 * update cache), Keychain service (session, write access) and 1Password item names.
 * No profile = the historical locations, which existing installs depend on.
 */
export function profile(): string | undefined {
  let p = process.env.TG_PROFILE;
  if (isMock() && !p?.startsWith("mock")) {
    p = "mock";
  }
  if (!p) {
    return undefined;
  }
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(p)) {
    throw new Error(
      `Invalid TG_PROFILE "${p}": use lowercase letters, digits and dashes`
    );
  }
  return p;
}

/**
 * TG_MOCK serves a fake account from a local file instead of Telegram (src/mock/): `1` keeps it in
 * the mock profile, any other value is the path of a state file. No client is ever connected.
 */
export function isMock(): boolean {
  return !!process.env.TG_MOCK;
}

/**
 * TG_MOCK_ASK=1 (with TG_MOCK only, for development and tests): the mock account behaves as if write
 * mode were "ask", so the approval flow (code, yes, retry) can be rehearsed without a secret store.
 * Its approvals and signing key stay in the mock profile; nothing touches the Keychain.
 */
export function isMockAsk(): boolean {
  return isMock() && process.env.TG_MOCK_ASK === "1";
}

const suffix = (): string => (profile() ? `-${profile()}` : "");

/** ~/.config/tg on macOS and Linux (existing installs depend on it), %APPDATA%\\tg on Windows. */
export function configDir(
  env: NodeJS.ProcessEnv = process.env,
  os: NodeJS.Platform = platform()
): string {
  if (os === "win32" && env.APPDATA) {
    return join(env.APPDATA, `tg${suffix()}`);
  }
  return join(homedir(), ".config", `tg${suffix()}`);
}

export function configFile(name: string): string {
  return join(configDir(), name);
}

/** Keychain service; 1Password items are named `<prefix>-<key>`. */
export function secretPrefix(): string {
  return `tg-cli${suffix()}`;
}
