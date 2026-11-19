import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { renderSVG } from 'uqr';
import type { LoginDriver, LoginUser } from './auth.js';
import { onboardPage } from './onboard-page.js';
import { errorMessage } from './text.js';
import type { WriteMode } from './write-state.js';

/**
 * `telegram onboard`: a one-shot page on 127.0.0.1 where the person logs in, so an agent can start
 * the whole setup without ever seeing a login key, API hash, QR code or 2FA password. The agent
 * runs the command; the human gets a login key (better-tg-cli.com hands it back here), scans the QR
 * and types the password on the page.
 *
 * Any site in the same browser can send requests to 127.0.0.1, so the server answers only under a
 * random secret path, checks Host (DNS rebinding) and Origin (cross-site POSTs), keeps nothing on
 * disk until Telegram accepts the login, and shuts down when done.
 */

export const ONBOARD_SITE = 'https://better-tg-cli.com';
const MAX_BODY = 16_000;

export type OnboardStep = 'invite' | 'connecting' | 'scan' | 'password' | 'mode' | 'done' | 'error';

export interface OnboardState {
  step: OnboardStep;
  qrSvg?: string;
  hint?: string;
  error?: string;
  /** With a mode error: the term of the refused choice ('1h', '1d', '1w'), absent for no end */
  errorFor?: string;
  user?: LoginUser;
  /** The write mode in effect: the default after the login, then the one picked on the page */
  mode?: WriteMode;
  /** Only the mode step is shown: `write-access` without a terminal, not a login */
  modeOnly?: boolean;
}

export type OnboardEvent =
  | { event: 'url'; url: string }
  | { event: 'waiting_invite' }
  | { event: 'waiting_scan' }
  | { event: 'need_password' }
  | { event: 'logged_in'; user: LoginUser }
  | { event: 'waiting_mode' }
  | { event: 'mode'; mode: WriteMode; until?: string }
  | { event: 'done'; user?: LoginUser; mode?: WriteMode }
  | { event: 'error'; message: string };

/** A write mode picked on the page: how long it lasts, if it should end by itself. */
export interface ModeChoice { mode: WriteMode; forSeconds?: number }
/** `until`: the end that was written (whole seconds); none for no end */
export type ModeResult = { ok: true; until?: Date } | { ok: false; error: 'not_confirmed' | 'needs_terminal' | 'store_failed' };
/** A write mode as read back from the store, with the moment it ends if it ends by itself. */
export interface SavedMode { mode: WriteMode; until?: Date }

/** Choices the page offers for "until": nothing (no end), an hour, a day, a week. */
const MODE_SPANS: Record<string, number | undefined> = { '': undefined, '1h': 3600, '1d': 86_400, '1w': 604_800 };
/** The mode step gives up after this long and leaves the profile as it is (read-only by default) */
const MODE_WAIT_MS = 10 * 60_000;

export interface OnboardOptions {
  driver: LoginDriver;
  /** Turns a login key into app credentials (the broker); called once per session */
  redeemInvite(token: string): Promise<{ apiId: number; apiHash: string }>;
  /** Stores the finished login */
  save(session: string, creds: { apiId: number; apiHash: string }, invite: boolean): void;
  emit(event: OnboardEvent): void;
  site?: string;
  port?: number;
  /**
   * Saves a write mode picked on the page (after the login, or alone with `modeOnly`). It decides
   * whether the click is enough or the person still has to confirm in a dialog or terminal.
   * Without it there is no mode step and `done` follows the login, as before.
   */
  applyMode?(choice: ModeChoice): Promise<ModeResult>;
  /** Skip the login and show only the mode step */
  modeOnly?: boolean;
  /** What the profile is set to right after the login, before (or without) a choice on the page */
  defaultMode?: WriteMode;
  /**
   * Reads the write mode back from the store, so only a mode actually saved with the asked-for end
   * counts: otherwise the step stays open with `store_failed`.
   */
  currentMode?(): SavedMode;
  /** How long the mode step waits for a choice (tests); 10 minutes by default */
  modeWaitMs?: number;
}

export interface OnboardSession {
  url: string;
  /** Resolves once the login (and the mode step, if any) is finished */
  done: Promise<{ user?: LoginUser; mode?: WriteMode }>;
  close(): void;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

export async function startOnboarding(options: OnboardOptions): Promise<OnboardSession> {
  const secret = randomBytes(32).toString('base64url');
  const state: OnboardState = options.modeOnly ? { step: 'mode', modeOnly: true } : { step: 'invite' };
  const abort = new AbortController();
  let creds: { apiId: number; apiHash: string; invite: boolean } | undefined;
  let running = false;
  let passwordWaiter: ((password: string) => void) | undefined;
  let resolveDone!: (result: { user?: LoginUser; mode?: WriteMode }) => void;
  const done = new Promise<{ user?: LoginUser; mode?: WriteMode }>(r => (resolveDone = r));
  let modeTimer: ReturnType<typeof setTimeout> | undefined;
  /** When the mode step gives up; `modeLeft` is the time still left while a choice is being applied */
  let modeDeadline = 0;
  let modeLeft = 0;
  let applying = false;
  let finished = false;

  const set = (patch: Partial<OnboardState>) => Object.assign(state, { error: undefined, errorFor: undefined }, patch);

  /** The mode in the store now (read once), or `expected` when there is no way to read it back */
  const readBack = (expected: WriteMode | undefined): SavedMode | undefined =>
    options.currentMode ? options.currentMode() : expected && { mode: expected };

  /**
   * The store holds exactly the choice: the same mode and, for "ask" and "on", the same end. A timed
   * choice must match the end applyMode reports as written (`written`) to the second, so an older
   * value with the same mode name does not pass; without `written` it cannot be checked and fails.
   */
  function holds(saved: SavedMode | undefined, choice: ModeChoice, written: Date | undefined): boolean {
    if (!options.currentMode) return true; // nothing to check against
    if (!saved || saved.mode !== choice.mode) return false;
    if (choice.mode === 'read-only') return true;
    if (!choice.forSeconds) return !saved.until;
    if (!saved.until) return false;
    const end = Math.floor(saved.until.getTime() / 1000);
    return !!written && end === Math.floor(written.getTime() / 1000);
  }

  function finish(mode: WriteMode | undefined = options.modeOnly ? undefined : readBack(options.defaultMode)?.mode): void {
    // Exactly one done, whatever comes first: a saved choice or the time running out
    if (finished) return;
    finished = true;
    if (modeTimer) clearTimeout(modeTimer);
    modeTimer = undefined;
    set({ step: 'done', mode, qrSvg: undefined });
    options.emit({ event: 'done', ...(state.user ? { user: state.user } : {}), ...(mode ? { mode } : {}) });
    resolveDone({ user: state.user, mode });
  }

  /** After the login: the page asks what the agent may do; skipping or waiting too long keeps read-only. */
  function askMode(error?: string): void {
    set({ step: 'mode', qrSvg: undefined, error });
    options.emit({ event: 'waiting_mode' });
    waitMode(options.modeWaitMs ?? MODE_WAIT_MS);
  }

  function waitMode(ms: number): void {
    if (modeTimer) clearTimeout(modeTimer);
    modeDeadline = Date.now() + ms;
    modeTimer = setTimeout(() => finish(), ms);
    modeTimer.unref?.();
  }

  /**
   * The clock stops while a choice is applied (a dialog may stay open for long): running out then
   * would send done with the old mode, and the approval a second done. A refusal resumes it.
   */
  function pauseMode(): void {
    if (modeTimer) clearTimeout(modeTimer);
    modeTimer = undefined;
    modeLeft = Math.max(0, modeDeadline - Date.now());
  }

  async function runLogin(): Promise<void> {
    if (!creds || running) return;
    running = true;
    set({ step: 'connecting', qrSvg: undefined });
    try {
      const result = await options.driver.login(creds, {
        onQr: url => {
          const first = state.step !== 'scan';
          set({ step: 'scan', qrSvg: renderSVG(url, { border: 2 }) });
          if (first) options.emit({ event: 'waiting_scan' });
        },
        password: hint => new Promise<string>(resolve => {
          // Keep "wrong password" from the previous try visible on the page
          const wrong = state.error === 'wrong_password';
          set({ step: 'password', hint, qrSvg: undefined });
          if (wrong) state.error = 'wrong_password';
          options.emit({ event: 'need_password' });
          passwordWaiter = resolve;
        }),
        onPasswordError: () => { state.error = 'wrong_password'; },
        signal: abort.signal,
      });
      options.save(result.session, creds, creds.invite);
      set({ user: result.user, mode: options.defaultMode });
      let modeError: string | undefined;
      if (options.applyMode && options.defaultMode) {
        // The session is saved either way; a refused mode must not show up as in effect
        const choice: ModeChoice = { mode: options.defaultMode };
        const applied = await options.applyMode(choice).catch((): ModeResult => ({ ok: false, error: 'store_failed' }));
        const saved = readBack(applied.ok ? options.defaultMode : undefined);
        if (!applied.ok) modeError = applied.error;
        else if (!holds(saved, choice, applied.until)) modeError = 'store_failed';
        state.mode = saved?.mode;
      }
      if (options.applyMode) {
        options.emit({ event: 'logged_in', user: result.user });
        askMode(modeError);
      } else finish();
    } catch (e) {
      if (abort.signal.aborted) return;
      const message = errorMessage(e);
      set({ step: 'error', error: message, qrSvg: undefined });
      options.emit({ event: 'error', message });
    } finally {
      running = false;
    }
  }

  let origin = '';
  const base = `/s/${secret}/`;

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // Only our exact host: a rebinding domain pointing at 127.0.0.1 sends its own Host
    if (req.headers.host !== origin.slice('http://'.length)) return json(res, 421, { error: 'wrong_host' });
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith(base)) return json(res, 404, { error: 'not_found' });
    const route = path.slice(base.length);

    if (req.method === 'GET' && (route === '' || route === 'cb')) {
      const { html, csp } = onboardPage({ site: options.site ?? ONBOARD_SITE, returnTo: `${origin}${base}cb`, modeOnly: !!options.modeOnly });
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy': csp,
        // The URL carries the secret; never send it along to another site
        'referrer-policy': 'no-referrer',
        'x-content-type-options': 'nosniff',
      });
      res.end(html);
      return;
    }
    if (req.method === 'GET' && route === 'state') return json(res, 200, state);
    if (req.method !== 'POST') return json(res, 404, { error: 'not_found' });
    // Same-origin page only; browsers always send Origin on POST
    if (req.headers.origin !== origin) return json(res, 403, { error: 'wrong_origin' });

    let body: Record<string, unknown>;
    try {
      body = (await readBody(req)) as Record<string, unknown>;
    } catch {
      return json(res, 400, { error: 'bad_request' });
    }

    if (route === 'invite') {
      if (creds) return json(res, 409, { error: 'already_started' });
      try {
        if (typeof body.invite === 'string' && body.invite.trim()) {
          creds = { ...(await options.redeemInvite(body.invite.trim())), invite: true };
        } else {
          const apiId = Number(body.apiId);
          const apiHash = typeof body.apiHash === 'string' ? body.apiHash.trim() : '';
          if (!Number.isInteger(apiId) || apiId <= 0 || !/^[0-9a-f]{32}$/i.test(apiHash)) {
            return json(res, 400, { error: 'bad_keys' });
          }
          creds = { apiId, apiHash, invite: false };
        }
      } catch (e) {
        return json(res, 400, { error: 'invite_failed', message: errorMessage(e) });
      }
      void runLogin();
      return json(res, 202, { ok: true });
    }
    if (route === 'password') {
      if (state.step !== 'password' || !passwordWaiter || typeof body.password !== 'string' || !body.password) {
        return json(res, 409, { error: 'not_waiting_for_password' });
      }
      const give = passwordWaiter;
      passwordWaiter = undefined;
      set({ step: 'connecting' });
      give(body.password);
      return json(res, 202, { ok: true });
    }
    if (route === 'mode') {
      if (state.step !== 'mode' || !options.applyMode || applying) return json(res, 409, { error: 'not_waiting_for_mode' });
      const mode = body.mode;
      const span = typeof body.for === 'string' ? body.for : '';
      if ((mode !== 'read-only' && mode !== 'ask' && mode !== 'on') || !(span in MODE_SPANS)) return json(res, 400, { error: 'bad_mode' });
      applying = true;
      pauseMode();
      try {
        const choice: ModeChoice = { mode, forSeconds: MODE_SPANS[span] };
        // May show a dialog (macOS, Windows) or a terminal prompt and wait for the person
        const result = await options.applyMode(choice);
        const saved = readBack(result.ok ? mode : state.mode);
        // A store that said yes but kept the old value (or end) fails too
        const error = !result.ok ? result.error : !holds(saved, choice, result.until) ? 'store_failed' : undefined;
        if (error) {
          state.error = error;
          state.errorFor = span || undefined;
          state.mode = saved?.mode;
          return json(res, 409, { error, ...(span ? { for: span } : {}) });
        }
        options.emit({ event: 'mode', mode, ...(result.ok && result.until ? { until: result.until.toISOString() } : {}) });
        finish(mode);
        return json(res, 202, { ok: true });
      } finally {
        applying = false;
        if (!finished && !abort.signal.aborted) waitMode(modeLeft);
      }
    }
    if (route === 'retry') {
      // Same credentials, no new invite use: a timed-out scan or a failed attempt starts over
      if (!creds || running || state.step !== 'error') return json(res, 409, { error: 'nothing_to_retry' });
      void runLogin();
      return json(res, 202, { ok: true });
    }
    return json(res, 404, { error: 'not_found' });
  };

  const server: Server = createServer((req, res) => {
    handler(req, res).catch(() => json(res, 500, { error: 'internal' }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, '127.0.0.1', () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${port}`;
  const url = `${origin}${base}`;
  options.emit({ event: 'url', url });
  if (options.modeOnly) askMode();
  else options.emit({ event: 'waiting_invite' });

  const close = () => {
    if (modeTimer) clearTimeout(modeTimer);
    abort.abort();
    server.closeAllConnections?.();
    server.close();
  };
  return { url, done, close };
}
