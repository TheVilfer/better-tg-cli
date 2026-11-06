/**
 * Credential broker: hands the app's api_id/api_hash to invited users at login time.
 * Invites live in KV under sha256(token); the raw token is never stored or logged.
 */
import { ICON_SVG, OG_PNG_BASE64 } from './assets';
import { docResponse, isDocPath } from './docs';
import { landingResponse } from './landing';
import { LOGIN_PATH, loopbackReturn, OLD_LOGIN_PATH, pageResponse } from './page';
import { isLang, pickLang, type Lang } from './i18n';
import { INDEXNOW_KEY, LLMS_TXT, localPath, robotsTxt, sitemapXml, splitLangPath } from './seo';
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

function base64Bytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function staticFile(body: BodyInit, type: string): Response {
  return new Response(body, {
    headers: { 'content-type': type, 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' },
  });
}

/** The visitor's explicit language choice, set by the language links (?lang=), a year long. */
const LANG_COOKIE = 'lang';
const cookieLang = (request: Request): Lang | null => {
  const m = /(?:^|;\s*)lang=([a-z]{2})(?:;|$)/.exec(request.headers.get('cookie') ?? '');
  return m && isLang(m[1]) ? m[1] : null;
};

/**
 * The language of a page comes from its path alone (/es/…, /ru/…, English at the bare path), so
 * every URL has one language and one canonical, as hreflang expects.
 * - ?lang= is how released CLIs, old links and the language switch ask for a language: it redirects
 *   (301) to the same page at that language's path, keeping the rest of the query, and remembers
 *   the choice in a cookie.
 * - A bare path sends a browser that chose, or prefers, Spanish or Russian to that path (302: the
 *   preference is per visitor); everyone else, crawlers included, gets English.
 */
function pageLang(url: URL, path: string, inPath: Lang | null, request: Request): Lang | Response {
  const asked = url.searchParams.get('lang');
  if (asked !== null) {
    const q = new URLSearchParams(url.search);
    q.delete('lang');
    const chosen = isLang(asked.toLowerCase()) ? (asked.toLowerCase() as Lang) : null;
    const location = `${url.origin}${localPath(path, chosen ?? inPath ?? 'en')}${q.size ? `?${q}` : ''}`;
    const headers: Record<string, string> = { location, 'cache-control': 'no-store' };
    if (chosen) headers['set-cookie'] = `${LANG_COOKIE}=${chosen}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    return new Response(null, { status: chosen ? 301 : 302, headers });
  }
  if (inPath) return inPath;
  const lang = cookieLang(request) ?? pickLang(null, request.headers.get('accept-language'));
  if (lang === 'en') return lang;
  return new Response(null, {
    status: 302,
    headers: { location: `${url.origin}${localPath(path, lang)}${url.search}`, vary: 'Accept-Language, Cookie', 'cache-control': 'no-store' },
  });
}

export async function handle(request: Request, env: Env, now = new Date()): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname === 'www.better-tg-cli.com' || (url.hostname === 'better-tg-cli.com' && url.protocol === 'http:')) {
    return Response.redirect(`https://better-tg-cli.com${url.pathname}${url.search}`, 301);
  }
  // HEAD gets the same answer as GET (the runtime drops the body); crawlers and link checkers use it
  const read = request.method === 'GET' || request.method === 'HEAD';
  if (url.pathname === '/health') return json(200, { ok: true });
  if (url.pathname === '/og.png') return staticFile(base64Bytes(OG_PNG_BASE64), 'image/png');
  if (url.pathname === '/favicon.svg') return staticFile(ICON_SVG, 'image/svg+xml');
  if (url.pathname === '/favicon.ico') return Response.redirect(`${url.origin}/favicon.svg`, 301);
  if (url.pathname === '/robots.txt') return staticFile(robotsTxt(), 'text/plain; charset=utf-8');
  if (url.pathname === '/sitemap.xml') return staticFile(sitemapXml(), 'application/xml; charset=utf-8');
  if (url.pathname === '/llms.txt') return staticFile(LLMS_TXT, 'text/plain; charset=utf-8');
  if (url.pathname === `/${INDEXNOW_KEY}.txt`) return staticFile(INDEXNOW_KEY, 'text/plain; charset=utf-8');
  if (url.pathname === OLD_LOGIN_PATH && read) {
    return Response.redirect(`${url.origin}${LOGIN_PATH}${url.search}`, 302);
  }
  // The signup page used to live at /: telegram onboard (?return=) and guide links (?mode=, ?agent=) still arrive there
  if (url.pathname === '/' && read && ['return', 'mode', 'agent'].some(p => url.searchParams.has(p))) {
    return Response.redirect(`${url.origin}${LOGIN_PATH}${url.search}`, 302);
  }
  const { lang: inPath, path } = splitLangPath(url.pathname);
  // /ru is the Russian home page's other spelling
  if (inPath && url.pathname === `/${inPath}`) return Response.redirect(`${url.origin}/${inPath}/${url.search}`, 301);
  if ((path === '/' || isDocPath(path) || path === LOGIN_PATH) && read) {
    const lang = pageLang(url, path, inPath, request);
    if (lang instanceof Response) return lang;
    if (path === '/') return landingResponse({ lang, query: url.searchParams });
    if (path !== LOGIN_PATH) return docResponse(path, lang, url.searchParams);
    return pageResponse({
      open: await signupsOpen(env),
      siteKey: env.TURNSTILE_SITE_KEY,
      returnTo: loopbackReturn(url.searchParams.get('return')),
      lang,
      query: url.searchParams,
    });
  }
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
