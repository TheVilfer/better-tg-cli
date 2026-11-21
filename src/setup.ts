import { qrLoginDriver, saveLogin } from "./auth.js";
import { fetchInviteCredentials } from "./broker.js";
import {
  disconnectClient,
  getClient,
  isAuthError,
  SESSION_EXPIRED,
} from "./client.js";
import {
  freshSessionString,
  getSessionString,
  isConfigured,
  loadConfig,
} from "./config.js";
import { ONBOARD_SITE, startOnboarding } from "./onboard.js";
import type { ModeChoice, OnboardEvent, OnboardSession } from "./onboard.js";
import { applyModeChoice, savedMode } from "./write-mode.js";

/**
 * Whether the profile has a login Telegram still accepts. `none`: nothing stored. `expired`: a
 * stored session that connects but is no longer authorized (logged out on another device, revoked,
 * deleted account), so a new login replaces it. Anything else that fails (no network, a store that
 * can't be read) throws: that is not a reason to log in again.
 */
export async function sessionState(): Promise<"none" | "alive" | "expired"> {
  return (await checkStoredSession()).state;
}

/**
 * sessionState with the stored session it judged, read before the network check: a login saved by
 * another process while Telegram was being asked is then not taken for the session that was checked.
 * Pass `snapshot` to openSetupPage as `checkedSession`.
 */
export async function checkStoredSession(): Promise<{
  state: "none" | "alive" | "expired";
  snapshot: string | undefined;
}> {
  const snapshot = freshSessionString();
  if (!isConfigured() || !getSessionString()) {
    return { state: "none", snapshot };
  }
  try {
    await getClient();
    return { state: "alive", snapshot };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith(SESSION_EXPIRED) || isAuthError(error)) {
      return { state: "expired", snapshot };
    }
    throw error;
  } finally {
    await disconnectClient();
  }
}

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
 * The login replaces the profile's session only if nobody else did meanwhile: the session that was
 * checked (`checkedSession`, the snapshot of checkStoredSession, taken before its network check), or else
 * the one found when the page opened, must still be the stored one when the new login is saved.
 */
export function openSetupPage(options: {
  emit(e: OnboardEvent): void;
  modeOnly?: boolean;
  testDc?: boolean;
  broker?: string;
  fromModel?: boolean;
  readOnly?: boolean;
  checkedSession?: string;
}): Promise<OnboardSession> {
  const notLogin = () => Promise.reject(new Error("not a login"));
  const testDc = !!options.testDc || profileTestServers();
  const before = options.modeOnly
    ? undefined
    : "checkedSession" in options
      ? options.checkedSession
      : freshSessionString();
  let defaultPending = !options.modeOnly;
  const applyMode = (choice: ModeChoice) => {
    const isDefault = defaultPending;
    defaultPending = false;
    return applyModeChoice(choice, {
      fromModel: !!options.fromModel && !isDefault,
    });
  };
  const save = (
    s: string,
    creds: { apiId: number; apiHash: string },
    invite: boolean
  ) => {
    if (freshSessionString() !== before) {
      throw new Error(
        "Another login was saved in this profile while this page was open, so it was not replaced. Close this page; if the account is still not the right one, start the setup again."
      );
    }
    saveLogin(s, creds, invite, testDc);
  };
  return startOnboarding({
    driver: options.modeOnly ? { login: notLogin } : qrLoginDriver(testDc),
    redeemInvite: options.modeOnly
      ? notLogin
      : (token) => fetchInviteCredentials(token, options.broker),
    save: options.modeOnly ? () => {} : save,
    emit: options.emit,
    site: process.env.TG_ONBOARD_SITE || ONBOARD_SITE,
    currentMode: savedMode,
    ...(options.readOnly
      ? {}
      : options.modeOnly
        ? { modeOnly: true, applyMode }
        : { defaultMode: "ask" as const, applyMode }),
  });
}
