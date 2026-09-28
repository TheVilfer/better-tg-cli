/**
 * Credential broker: hands the app's api_id/api_hash to invited users at login time.
 * Invites live in KV under sha256(token); the raw token is never stored or logged.
 */
import { loopbackReturn, pageResponse } from './page';
import { handleSignup, handleVerify, signupsOpen } from './signup';

export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  INVITES: KV;
  API_ID: string;
  API_HASH: string;
  /** Workers rate limiting binding ([[ratelimits]] in wrangler.toml); absent in tests */
  LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  /** Self-serve signup page (src/signup.ts): its own limiter, Turnstile keys and daily cap */
  SIGNUP_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  SIGNUP_DAILY_CAP?: string;
  SIGNUP_CODES_PER_IP?: string;
  SIGNUP_CODES_PER_EMAIL?: string;
  /** Cloudflare Email Sending ([[send_email]]) and the verified sender address for signup codes */
  EMAIL?: { send(message: { to: string; from: { email: string; name?: string }; subject: string; text: string; html: string }): Promise<unknown> };
  MAIL_FROM?: string;
}

export interface Invite {
  name: string;
  createdAt: string;
  revoked?: boolean;
  uses: number;
  maxUses: number;
  lastUsedAt?: string;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function handle(request: Request, env: Env, now = new Date()): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname === 'www.better-tg-cli.com') {
    return Response.redirect(`https://better-tg-cli.com${url.pathname}${url.search}`, 301);
  }
  if (url.pathname === '/health') return json(200, { ok: true });
  if (url.pathname === '/' && request.method === 'GET') return pageResponse(await signupsOpen(env), env.TURNSTILE_SITE_KEY, loopbackReturn(url.searchParams.get('return')));
  if (url.pathname === '/v1/invites') return handleSignup(request, env, now);
  if (url.pathname === '/v1/invites/verify') return handleVerify(request, env, now);
  if (url.pathname !== '/v1/credentials') return json(404, { error: 'not_found' });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // Per-IP limit before any KV work: slows token guessing and scripted abuse
  if (env.LIMITER) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const { success } = await env.LIMITER.limit({ key: ip });
    if (!success) return json(429, { error: 'rate_limited' });
  }

  let invite: unknown;
  try {
    invite = ((await request.json()) as { invite?: unknown }).invite;
  } catch {
    return json(400, { error: 'bad_request' });
  }
  if (typeof invite !== 'string' || invite.length < 20 || invite.length > 200) {
    return json(400, { error: 'bad_request' });
  }

  // Check config first so a misconfigured broker never burns an invite use
  const apiId = parseInt(env.API_ID, 10);
  if (!apiId || !env.API_HASH) return json(503, { error: 'broker_not_configured' });

  const key = `invite:${await sha256Hex(invite)}`;
  const raw = await env.INVITES.get(key);
  if (!raw) return json(403, { error: 'invalid_invite' });

  const record = JSON.parse(raw) as Invite;
  if (record.revoked) return json(403, { error: 'invite_revoked' });
  // KV is eventually consistent, so this cap is soft; fine for a small trusted circle
  if (record.uses >= record.maxUses) return json(429, { error: 'invite_used_up' });

  record.uses += 1;
  record.lastUsedAt = now.toISOString();
  await env.INVITES.put(key, JSON.stringify(record));

  return json(200, { apiId, apiHash: env.API_HASH });
}
