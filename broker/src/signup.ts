/**
 * Self-serve invites: the page at / trades an email (kept only for notifications) for a one-login
 * invite. This hands the maintainer's app keys to strangers, so every guard fails closed:
 * signups are off unless KV `config:signups` is "on", Turnstile must pass server-side, and there
 * are per-IP and daily caps. `invite.mjs signups off` closes the page; `/v1/credentials` and
 * invites already issued keep working.
 */
import { sha256Hex, type Env, type Invite } from './handler';

export const SIGNUPS_KEY = 'config:signups';
const DAILY_CAP_DEFAULT = 30;
const PER_IP_PER_DAY = 2;
const DAY_SECONDS = 86_400;

export type SelfServeInvite = Invite & { source: 'self-serve' };
export interface EmailRecord { email: string; inviteKey: string; createdAt: string }

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function signupsOpen(env: Env): Promise<boolean> {
  return (await env.INVITES.get(SIGNUPS_KEY)) === 'on' && Boolean(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY);
}

/** Lowercased, trimmed, one @, a dot in the domain, no spaces; null when it doesn't look like an email. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export type TurnstileVerify = (secret: string, token: string, ip: string) => Promise<boolean>;

export const verifyTurnstile: TurnstileVerify = async (secret, token, ip) => {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!res.ok) return false;
  return ((await res.json()) as { success?: boolean }).success === true;
};

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return 'tgi_' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Soft counter in KV (eventually consistent, so caps may overshoot slightly under a burst). */
async function bump(env: Env, key: string, cap: number): Promise<boolean> {
  const n = parseInt((await env.INVITES.get(key)) ?? '0', 10) || 0;
  if (n >= cap) return false;
  await env.INVITES.put(key, String(n + 1), { expirationTtl: 2 * DAY_SECONDS });
  return true;
}

export async function handleSignup(request: Request, env: Env, now = new Date(), verify = verifyTurnstile): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (env.SIGNUP_LIMITER && !(await env.SIGNUP_LIMITER.limit({ key: ip })).success) {
    return json(429, { error: 'rate_limited' });
  }
  // Closed unless explicitly opened and fully configured (keys, Turnstile)
  if (!(await signupsOpen(env)) || !parseInt(env.API_ID, 10) || !env.API_HASH) {
    return json(503, { error: 'signups_closed' });
  }

  let body: { email?: unknown; turnstile?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json(400, { error: 'bad_request' });
  }
  const email = normalizeEmail(body.email);
  if (!email) return json(400, { error: 'bad_email' });
  if (typeof body.turnstile !== 'string' || !body.turnstile || body.turnstile.length > 4096) {
    return json(400, { error: 'captcha_failed' });
  }
  if (!(await verify(env.TURNSTILE_SECRET!, body.turnstile, ip))) return json(403, { error: 'captcha_failed' });

  const emailKey = `email:${await sha256Hex(email)}`;
  if (await env.INVITES.get(emailKey)) return json(409, { error: 'email_used' });

  const day = now.toISOString().slice(0, 10);
  const cap = parseInt(env.SIGNUP_DAILY_CAP ?? '', 10) || DAILY_CAP_DEFAULT;
  if (!(await bump(env, `count:ip:${day}:${await sha256Hex(ip)}`, PER_IP_PER_DAY))) return json(429, { error: 'rate_limited' });
  if (!(await bump(env, `count:day:${day}`, cap))) return json(429, { error: 'daily_limit' });

  const token = newToken();
  const inviteKey = `invite:${await sha256Hex(token)}`;
  const createdAt = now.toISOString();
  const invite: SelfServeInvite = { name: email, createdAt, uses: 0, maxUses: 1, source: 'self-serve' };
  await env.INVITES.put(inviteKey, JSON.stringify(invite));
  const record: EmailRecord = { email, inviteKey, createdAt };
  await env.INVITES.put(emailKey, JSON.stringify(record));
  return json(201, { invite: token });
}
