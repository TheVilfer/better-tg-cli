import { qrLoginDriver, saveLogin } from './auth.js';
import { fetchInviteCredentials } from './broker.js';
import { disconnectClient, getClient, SESSION_EXPIRED } from './client.js';
import { getSessionString, isConfigured } from './config.js';
import { ONBOARD_SITE, startOnboarding, type OnboardEvent, type OnboardSession } from './onboard.js';
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
    // getClient's own "not authorized" answer, or Telegram refusing the stored key outright
    if (message.startsWith(SESSION_EXPIRED) || /AUTH_KEY_UNREGISTERED|SESSION_REVOKED|SESSION_EXPIRED|USER_DEACTIVATED/.test(message)) return 'expired';
    throw e;
  } finally {
    await disconnectClient();
  }
}

/**
 * The local login page of `telegram onboard` (and of telegram_setup over MCP): a login, then the
 * choice of the write mode, which defaults to "ask". With `modeOnly`, only the mode choice for a
 * profile that is logged in already; it has no default, so opening it changes nothing by itself.
 */
export function openSetupPage(options: { emit(e: OnboardEvent): void; modeOnly?: boolean; testDc?: boolean; broker?: string }): Promise<OnboardSession> {
  const notLogin = () => Promise.reject(new Error('not a login'));
  return startOnboarding({
    driver: options.modeOnly ? { login: notLogin } : qrLoginDriver(!!options.testDc),
    redeemInvite: options.modeOnly ? notLogin : token => fetchInviteCredentials(token, options.broker),
    save: options.modeOnly ? () => {} : (s, creds, invite) => saveLogin(s, creds, invite, !!options.testDc),
    emit: options.emit,
    site: process.env.TG_ONBOARD_SITE || ONBOARD_SITE,
    applyMode: choice => applyModeChoice(choice),
    currentMode: savedMode,
    ...(options.modeOnly
      ? { modeOnly: true }
      // Writes are possible right away, each one after the user's yes in the chat; the page can change it
      : { defaultMode: 'ask' as const }),
  });
}
