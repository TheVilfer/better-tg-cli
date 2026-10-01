import {
  AuthorizationError,
  CimdFetchError,
  OAuthProvider,
  type ConsentDescription,
  type OAuthHelpers,
} from '@cloudflare/workers-oauth-provider';
import type { DeviceRelay } from './device';
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
  PAIR_LIMITER: RateLimit;
  DEVICE_LIMITER: RateLimit;
  MCP_LIMITER: RateLimit;
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

const pairKey = async (code: string) => `relay:pair:${await sha256Hex(normalizeCode(code))}`;
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
  return html(consentPage(info, consent.handle), 200, consent.headers);
}

async function answerConsent(request: Request, env: Env): Promise<Response> {
  const oauth = env.OAUTH_PROVIDER;
  const form = await request.formData();
  const handle = String(form.get('handle') ?? '');
  if (form.get('decision') !== 'approve') {
    const denied = await oauth.denyConsent(request, handle);
    return redirect(denied.headers);
  }

  const stored = await env.OAUTH_KV.get(await consentKey(handle));
  if (!stored) return html(messagePage('This page expired', 'Start connecting again from the app.'), 400);
  const info = JSON.parse(stored) as ConsentInfo;
  const again = (error: string, status = 400) => html(consentPage(info, handle, error), status);

  if (await limited(env.PAIR_LIMITER, clientIp(request))) return again('Too many attempts. Wait a minute and try again.', 429);
  const code = String(form.get('code') ?? '');
  const deviceId = normalizeCode(code).length === 8 ? await env.OAUTH_KV.get(await pairKey(code)) : null;
  if (!deviceId) return again('That code is wrong or expired. Run `telegram remote pair` for a new one.');

  const stub = device(env, deviceId);
  if (!(await stub.online())) {
    return again('Your computer is not connected. Start `telegram mcp --remote` on it, then press Allow again.', 409);
  }
  // One use per code, whatever the person at the computer answers.
  await env.OAUTH_KV.delete(await pairKey(code));
  const { requestedScope, ...question } = info;
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
  await env.OAUTH_KV.delete(await consentKey(handle));
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
    await env.OAUTH_KV.put(await pairKey(code), deviceId, { expirationTtl: PAIR_TTL });
    return json({ code, expiresIn: PAIR_TTL, url: RESOURCE });
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
