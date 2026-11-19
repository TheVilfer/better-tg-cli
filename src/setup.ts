import { qrLoginDriver, saveLogin } from './auth.js';
import { fetchInviteCredentials } from './broker.js';
import { disconnectClient, getClient, isAuthError, SESSION_EXPIRED } from './client.js';
import { freshSessionString, getSessionString, isConfigured, loadConfig } from './config.js';
import { ONBOARD_SITE, startOnboarding, type ModeChoice, type OnboardEvent, type OnboardSession } from './onboard.js';
import { applyModeChoice, savedMode } from './write-mode.js';

/**
 * Whether the profile has a login Telegram still accepts. `none`: nothing stored. `expired`: a
 * stored session that connects but is no longer authorized (logged out on another device, revoked,
 * deleted account), so a new login replaces it. Anything else that fails (no network, a store that
 * can't be read) throws: that is not a reason to log in again.
 */
export async function sessionState(): Promise<'none' | 'alive' | 'expired'> {
  if (!isConfigured() || !getSessionString()) return 'none';
  try {
    await getClient();
    return 'alive';
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // getClient's answer to an auth error code, or Telegram refusing the stored key while connecting;
    // never a guess from any other failure
    if (message.startsWith(SESSION_EXPIRED) || isAuthError(e)) return 'expired';
    throw e;
  } finally {
    await disconnectClient();
  }
}

/** The profile's test-server flag: a new login over an old one stays on the same servers. */
function profileTestServers(): boolean {
  try {
    return !!loadConfig(() => {}).testServers;
  } catch {
    return false;
  }
}

/**
 * The local login page of `telegram onboard` (and of telegram_setup over MCP): a login, then the
 * choice of the write mode, which defaults to "ask". With `modeOnly`, only the mode choice for a
 * profile that is logged in already; it has no default, so opening it changes nothing by itself.
 *
 * `fromModel` (telegram_setup: the model got the link): "ask" or "on" picked on the page needs the
 * person in a dialog or terminal, on every platform. The default a finished login sets ("ask") is
 * not a choice on the page: only the person can finish a login (the QR scan).
 * `readOnly` (a `--read-only` MCP server): the login only, no default mode and no mode step.
 *
 * The login replaces the profile's session only if nobody else did meanwhile: the session found when
 * the page opened must still be the stored one when the new login is saved.
 */
export function openSetupPage(options: { emit(e: OnboardEvent): void; modeOnly?: boolean; testDc?: boolean; broker?: string; fromModel?: boolean; readOnly?: boolean }): Promise<OnboardSession> {
  const notLogin = () => Promise.reject(new Error('not a login'));
  const testDc = !!options.testDc || profileTestServers();
  const before = options.modeOnly ? undefined : freshSessionString();
  let defaultPending = !options.modeOnly;
  const applyMode = (choice: ModeChoice) => {
    const isDefault = defaultPending;
    defaultPending = false;
    return applyModeChoice(choice, { fromModel: !!options.fromModel && !isDefault });
  };
  const save = (s: string, creds: { apiId: number; apiHash: string }, invite: boolean) => {
    if (freshSessionString() !== before) {
      throw new Error('Another login was saved in this profile while this page was open, so it was not replaced. Close this page; if the account is still not the right one, start the setup again.');
    }
    saveLogin(s, creds, invite, testDc);
  };
  return startOnboarding({
    driver: options.modeOnly ? { login: notLogin } : qrLoginDriver(testDc),
    redeemInvite: options.modeOnly ? notLogin : token => fetchInviteCredentials(token, options.broker),
    save: options.modeOnly ? () => {} : save,
    emit: options.emit,
    site: process.env.TG_ONBOARD_SITE || ONBOARD_SITE,
    currentMode: savedMode,
    ...(options.readOnly
      ? {}
      : options.modeOnly
        ? { modeOnly: true, applyMode }
        // Writes are possible right away, each one after the user's yes in the chat; the page can change it
        : { defaultMode: 'ask' as const, applyMode }),
  });
}
