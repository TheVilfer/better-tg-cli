import {
  AuthorizationError,
  CimdFetchError,
  OAuthProvider,
  type ConsentDescription,
  type OAuthHelpers,
} from '@cloudflare/workers-oauth-provider';
import type { DeviceRelay, PairingCodes } from './device';
import { consentPage, homePage, messagePage, type ConsentInfo } from './page';


/**
 * The relay is an OAuth 2.1 authorization server and the MCP resource in one Worker. A grant's
 * user is a device: `telegram mcp --remote` on someone's computer. Granting needs two things the
 * browser alone can't give: a pairing code printed in that computer's terminal, and a yes from
 * the person at that computer (a terminal prompt or an OS dialog an agent can't answer).
 */

export const ORIGIN = 'https://mcp.better-tg-cli.com';
export const RESOURCE = `${ORIGIN}/mcp`;
export const SCOPE = 'telegram';

export interface Env {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  DEVICES: DurableObjectNamespace<DeviceRelay>;
  PAIRING: DurableObjectNamespace<PairingCodes>;
  PAIR_LIMITER: RateLimit;
  DEVICE_LIMITER: RateLimit;
  MCP_LIMITER: RateLimit;
  /** Cloudflare Email Sending; without it (or MAIL_FROM) email sign-in is off and pairing codes remain. */
  EMAIL?: { send(message: { to: string; from: { email: string; name?: string }; subject: string; text: string }): Promise<unknown> };
  MAIL_FROM?: string;
}

type Props = { deviceId: string };

const PAIR_TTL = 600;
const MAX_BODY = 1_000_000;
const OFFLINE_TEXT =
  'Your computer is offline. better-tg-cli runs on your own machine: start `telegram mcp --remote` there, then try again.';

const enc = new TextEncoder();
const b64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** A device is whoever holds its secret; the id is derived from it, so the relay stores nothing. */
export async function deviceIdOf(secret: string): Promise<string> {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(secret))).slice(0, 32);
}

async function authDevice(request: Request): Promise<string | null> {
  const match = /^Bearer (tgrd_[A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization') ?? '');
  return match ? deviceIdOf(match[1]) : null;
}

/** 8 characters from an alphabet without 0/O/1/I/L: 40 bits, readable over the shoulder. */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function newPairingCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map(b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^0-9A-Z]/g, '');

const pairKey = async (code: string) => sha256Hex(normalizeCode(code));

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

const sixDigits = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
/** Names come from whoever registered the client: one short line in an email. */
const oneLine = (value: string) => value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').trim().slice(0, 60);
const mailOn = (env: Env) => Boolean(env.EMAIL && env.MAIL_FROM);

async function sendMail(env: Env, to: string, subject: string, lines: string[]): Promise<void> {
  await env.EMAIL!.send({
    to,
    from: { email: env.MAIL_FROM!, name: 'better-tg-cli' },
    subject,
    text: [...lines, '', 'https://github.com/TheVilfer/better-tg-cli'].join('\n'),
  });
}

/**
 * Per address and purpose (linking on the computer, signing in an app): one email a minute and ten
 * a day, so a bound address can't be flooded. Separate purposes, so connecting an app right after
 * linking the email still gets its code.
 */
async function mayMail(env: Env, emailKey: string, purpose: 'link' | 'login'): Promise<boolean> {
  const dir = pairing(env);
  return (
    (await dir.allowSend(`throttle:${purpose}:min:${emailKey}`, 1, 60)) &&
    (await dir.allowSend(`throttle:${purpose}:day:${emailKey}`, 10, 86400))
  );
}
const pairing = (env: Env) => env.PAIRING.get(env.PAIRING.idFromName('codes'));
const consentKey = async (handle: string) => `relay:consent:${await sha256Hex(handle)}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const html = (body: string, status = 200, headers?: Headers) => {
  const h = new Headers(headers);
  h.set('Content-Type', 'text/html; charset=utf-8');
  h.set('Cache-Control', 'no-store');
  h.set('Content-Security-Policy', "frame-ancestors 'none'");
  h.set('X-Frame-Options', 'DENY');
  return new Response(body, { status, headers: h });
};

const redirect = (headers: Headers, location?: string) => {
  if (location) headers.set('Location', location);
  return new Response(null, { status: 302, headers });
};

const device = (env: Env, deviceId: string) => env.DEVICES.get(env.DEVICES.idFromName(deviceId));

async function limited(limiter: RateLimit, key: string): Promise<boolean> {
  const { success } = await limiter.limit({ key });
  return !success;
}

const clientIp = (request: Request) => request.headers.get('CF-Connecting-IP') ?? 'local';

function toInfo(details: ConsentDescription): ConsentInfo {
  return {
    clientName: details.clientName,
    clientDomain: details.clientDomain,
    redirectHost: details.redirectHost,
    redirectIsLoopback: details.redirectIsLoopback,
    requestedScope: details.scope,
  };
}

async function showConsent(request: Request, env: Env): Promise<Response> {
  const oauth = env.OAUTH_PROVIDER;
  const authRequest = await oauth.parseAuthRequest(request);
  const info = toInfo(await oauth.describeConsent(authRequest));
  const consent = await oauth.beginConsent(authRequest);
  // Kept server-side so the POST can ask the device about this client before the handle is used.
  await env.OAUTH_KV.put(await consentKey(consent.handle), JSON.stringify(info), { expirationTtl: PAIR_TTL });
  return html(consentPage(info, consent.handle, { mail: mailOn(env) }), 200, consent.headers);
}

/**
 * Email sign-in: a code goes only to an address a device has bound and verified, so the page never
 * reveals whether an address is known and can't be used to mail strangers.
 */
async function sendLoginCode(env: Env, handle: string, email: string, info: ConsentInfo): Promise<void> {
  const emailKey = await sha256Hex(email);
  const dir = pairing(env);
  const deviceId = await dir.deviceForEmail(emailKey);
  if (!deviceId || !(await mayMail(env, emailKey, 'login'))) return;
  const code = sixDigits();
  await dir.putMailCode(`login:${await sha256Hex(handle)}`, await sha256Hex(code), deviceId, PAIR_TTL);
  const app = `${oneLine(info.clientName)}${info.clientDomain ? ` (${oneLine(info.clientDomain)})` : ' (name not verified)'}`;
  await sendMail(env, email, `${code} is your better-tg-cli code`, [
    `${app} asks to use your Telegram through the better-tg-cli relay.`,
    '',
    `Code: ${code}`,
    '',
    'Enter it on the page that sent it. The code works for 10 minutes. Nothing connects until you also confirm on your computer.',
    "If you didn't start this, ignore this email.",
  ]);
}

async function answerConsent(request: Request, env: Env): Promise<Response> {
  const oauth = env.OAUTH_PROVIDER;
  const form = await request.formData();
  const handle = String(form.get('handle') ?? '');
  const decision = form.get('decision');
  if (decision !== 'approve' && decision !== 'send' && decision !== 'restart') {
    const denied = await oauth.denyConsent(request, handle);
    return redirect(denied.headers);
  }

  const key = await consentKey(handle);
  const stored = await env.OAUTH_KV.get(key);
  if (!stored) return html(messagePage('This page expired', 'Start connecting again from the app.'), 400);
  const info = JSON.parse(stored) as ConsentInfo;
  const page = (error?: string, status = 400) => html(consentPage(info, handle, { error, mail: mailOn(env) }), error ? status : 200);
  const save = () => env.OAUTH_KV.put(key, JSON.stringify(info), { expirationTtl: PAIR_TTL });

  if (decision === 'restart') {
    delete info.email;
    await save();
    return page();
  }
  if (await limited(env.PAIR_LIMITER, clientIp(request))) return page('Too many attempts. Wait a minute and try again.', 429);

  if (decision === 'send') {
    const email = normalizeEmail(form.get('email'));
    if (!email || !mailOn(env)) return page('Enter a valid email.');
    await sendLoginCode(env, handle, email, info);
    info.email = email;
    await save();
    return page();
  }

  const code = String(form.get('code') ?? '').trim();
  let deviceId: string | null;
  let pairingCode = false;
  if (info.email && /^\d{6}$/.test(code)) {
    deviceId = await pairing(env).checkMailCode(`login:${await sha256Hex(handle)}`, await sha256Hex(code));
    if (!deviceId) return page('That code is wrong or expired. Send a new one.');
  } else {
    deviceId = normalizeCode(code).length === 8 ? await pairing(env).peek(await pairKey(code)) : null;
    if (!deviceId) return page('That code is wrong or expired. Run `telegram remote pair` for a new one.');
    pairingCode = true;
  }

  const stub = device(env, deviceId);
  if (!(await stub.online())) {
    return page('Your computer is not connected. Start `telegram mcp --remote` on it, then try again.', 409);
  }
  // A pairing code works once, whatever the person at the computer answers (an email code already did).
  if (pairingCode && (await pairing(env).take(await pairKey(code))) !== deviceId) {
    return page('That code was just used. Run `telegram remote pair` for a new one.');
  }
  const { requestedScope, email: _email, ...question } = info;
  const allowed = await stub.consent(question);
  if (allowed !== true) {
    const denied = await oauth.denyConsent(request, handle, {
      description: allowed === null ? 'The computer went offline' : 'Declined on the computer',
    });
    return redirect(denied.headers);
  }

  const scope = [SCOPE, ...(requestedScope.includes('offline_access') ? ['offline_access'] : [])];
  const approved = await oauth.approveConsent(request, handle, { scope });
  const { redirectTo } = await oauth.completeAuthorization({
    request: approved.request,
    userId: deviceId,
    metadata: { clientName: info.clientName, clientDomain: info.clientDomain ?? null, approvedAt: new Date().toISOString() },
    scope,
    props: { deviceId } satisfies Props,
  });
  await env.OAUTH_KV.delete(key);
  return redirect(approved.headers, redirectTo);
}

async function authorize(request: Request, env: Env): Promise<Response> {
  try {
    if (request.method === 'GET') return await showConsent(request, env);
    if (request.method === 'POST') return await answerConsent(request, env);
    return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
  } catch (error) {
    if (error instanceof AuthorizationError && error.redirectTo) return Response.redirect(error.redirectTo, 302);
    if (error instanceof AuthorizationError || error instanceof CimdFetchError) {
      const text = error instanceof AuthorizationError ? error.description : 'This app could not be verified.';
      return html(messagePage('Cannot connect this app', text || 'Start connecting again from the app.'), 400);
    }
    throw error;
  }
}

/** `/device/*`: the CLI's side. Every call carries the device secret as a bearer token. */
async function deviceApi(request: Request, env: Env, path: string): Promise<Response> {
  if (await limited(env.DEVICE_LIMITER, clientIp(request))) return json({ error: 'rate_limited' }, 429);
  const deviceId = await authDevice(request);
  if (!deviceId) return json({ error: 'unauthorized' }, 401);

  if (path === '/device/connect') {
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected_websocket' }, 426);
    return device(env, deviceId).fetch(request);
  }
  if (path === '/device/pair' && request.method === 'POST') {
    const code = newPairingCode();
    await pairing(env).put(await pairKey(code), deviceId, PAIR_TTL);
    return json({ code, expiresIn: PAIR_TTL, url: RESOURCE });
  }
  if (path === '/device/email' && request.method === 'GET') {
    return json({ email: await pairing(env).emailOfDevice(deviceId) });
  }
  if (path === '/device/email' && request.method === 'POST') {
    if (!mailOn(env)) return json({ error: 'email_unavailable' }, 503);
    const body = (await request.json().catch(() => ({}))) as { email?: unknown; code?: unknown; remove?: unknown };
    const dir = pairing(env);
    if (body.remove === true) {
      await dir.unbindDevice(deviceId);
      return json({ email: null });
    }
    const email = normalizeEmail(body.email);
    if (!email) return json({ error: 'bad_email' }, 400);
    const emailKey = await sha256Hex(email);
    const key = `setup:${deviceId}:${emailKey}`;
    if (typeof body.code === 'string') {
      const owner = await dir.checkMailCode(key, await sha256Hex(body.code.trim()));
      if (owner !== deviceId) return json({ error: 'bad_code' }, 400);
      await dir.bindEmail(emailKey, email, deviceId);
      return json({ email });
    }
    if (!(await dir.allowSend(`throttle:dev:${deviceId}`, 5, 3600)) || !(await mayMail(env, emailKey, 'link'))) {
      return json({ error: 'rate_limited' }, 429);
    }
    const code = sixDigits();
    await dir.putMailCode(key, await sha256Hex(code), deviceId, PAIR_TTL);
    await sendMail(env, email, `${code} is your better-tg-cli code`, [
      'A computer running better-tg-cli asks to use this address for signing in to the relay.',
      '',
      `Code: ${code}`,
      '',
      'Type it in the terminal that asked for it. The code works for 10 minutes.',
      "If you didn't start this, ignore this email.",
    ]);
    return json({ sent: true, expiresIn: PAIR_TTL });
  }
  if (path === '/device/clients' && request.method === 'GET') {
    const { items } = await env.OAUTH_PROVIDER.listUserGrants(deviceId);
    return json({
      clients: items.map(g => ({
        id: g.id,
        name: g.metadata?.clientName ?? g.clientId,
        domain: g.metadata?.clientDomain ?? null,
        approvedAt: g.metadata?.approvedAt ?? new Date(g.createdAt * 1000).toISOString(),
      })),
    });
  }
  if (path === '/device/revoke' && request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { id?: unknown; all?: unknown };
    const { items } = await env.OAUTH_PROVIDER.listUserGrants(deviceId);
    const targets = body.all === true ? items : items.filter(g => g.id === body.id);
    if (!targets.length) return json({ error: 'not_found' }, 404);
    for (const g of targets) await env.OAUTH_PROVIDER.revokeGrant(g.id, deviceId);
    return json({ revoked: targets.length });
  }
  return json({ error: 'not_found' }, 404);
}

/** What a client gets while the computer is offline: a readable answer, not a bare 502. */
export function offlineReply(body: string): Response {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }
  const answer = (msg: { id?: unknown; method?: unknown }) => {
    if (msg.id === undefined || msg.id === null) return null; // a notification needs no answer
    return msg.method === 'tools/call'
      ? { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: OFFLINE_TEXT }], isError: true } }
      : { jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: OFFLINE_TEXT } };
  };
  if (Array.isArray(parsed)) {
    const replies = parsed.map(m => answer(m ?? {})).filter(Boolean);
    return replies.length ? json(replies) : new Response(null, { status: 202 });
  }
  const reply = answer((parsed ?? {}) as { id?: unknown });
  return reply ? json(reply) : new Response(null, { status: 202 });
}

const McpApi = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { deviceId } = (ctx as ExecutionContext & { props: Props }).props;
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (await limited(env.MCP_LIMITER, deviceId)) return json({ error: 'rate_limited' }, 429);
    const body = await request.text();
    if (body.length > MAX_BODY) return json({ error: 'too_large' }, 413);
    const reply = await device(env, deviceId).call(body);
    if (!reply) return offlineReply(body);
    return new Response(reply.body || null, {
      status: reply.status,
      headers: reply.body ? { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } : {},
    });
  },
};

const Site = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/authorize') return authorize(request, env);
    if (path.startsWith('/device/')) return deviceApi(request, env, path);
    if (path === '/' && request.method === 'GET') return html(homePage());
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    return new Response('Not found', { status: 404 });
  },
};

export default new OAuthProvider<Env>({
  apiRoute: '/mcp',
  apiHandler: McpApi,
  defaultHandler: Site,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/oauth/token',
  // ChatGPT and older clients still register dynamically; newer ones use metadata documents.
  clientRegistrationEndpoint: '/oauth/register',
  clientIdMetadataDocumentEnabled: true,
  scopesSupported: [SCOPE, 'offline_access'],
  requiredScopes: [SCOPE],
  resourceMetadata: { resource: RESOURCE, authorization_servers: [ORIGIN] },
  // Short access tokens; a grant lives while it's used and lapses after 30 idle days.
  accessTokenTTL: 3600,
  refreshTokenIdleTTL: 30 * 86400,
});
