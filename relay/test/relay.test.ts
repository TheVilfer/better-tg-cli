import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestHarness } from 'wrangler';

// The relay runs in workerd with its Durable Object, KV and rate limiters; a fake device connects
// over a real WebSocket, the way `telegram mcp --remote` does.
const harness = createTestHarness({ workers: [{ configPath: './wrangler.toml' }] });
const ORIGIN = 'https://mcp.better-tg-cli.com';
const RESOURCE = `${ORIGIN}/mcp`;
const REDIRECT_URI = 'https://client.example/callback';

let base: URL;
beforeAll(async () => {
  base = (await harness.listen()).url;
});
afterAll(() => harness.close());

// Each test comes from its own address, so the per-IP limiters don't carry over between tests.
let ip = '';
beforeEach(() => {
  ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
});
const relay = (path: string, init: RequestInit = {}) =>
  harness.fetch(`${ORIGIN}${path}`, { redirect: 'manual', ...init, headers: { 'CF-Connecting-IP': ip, ...(init.headers as Record<string, string>) } });
const newSecret = () => 'tgrd_' + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const auth = (secret: string) => ({ Authorization: `Bearer ${secret}` });

type Consent = { clientName: string; redirectHost: string };

/** A stand-in for `telegram mcp --remote`: answers consent with `allow`, echoes MCP calls. */
async function connectDevice(secret: string, allow = true, answerCalls = true) {
  const asked: Consent[] = [];
  const url = new URL('/device/connect', base);
  url.protocol = 'ws:';
  const ws = new WebSocket(url, { headers: { ...auth(secret), 'CF-Connecting-IP': ip } } as unknown as string[]);
  ws.addEventListener('message', event => {
    const msg = JSON.parse(String(event.data));
    if (msg.type === 'consent') {
      asked.push(msg);
      ws.send(JSON.stringify({ type: 'reply', id: msg.id, allow }));
    } else if (msg.type === 'rpc' && answerCalls) {
      const call = JSON.parse(msg.body);
      const body = JSON.stringify({ jsonrpc: '2.0', id: call.id, result: { echo: call.method } });
      ws.send(JSON.stringify({ type: 'reply', id: msg.id, status: 200, body }));
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  return { ws, asked };
}

async function pkce() {
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: Buffer.from(digest).toString('base64url') };
}

/** Register a client and open the consent page, as claude.ai or ChatGPT would. */
async function startAuthorization(scope = 'telegram offline_access') {
  const reg = await relay('/oauth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_name: 'Test Client', redirect_uris: [REDIRECT_URI], token_endpoint_auth_method: 'none' }),
  });
  expect(reg.status).toBe(201);
  const { client_id } = (await reg.json()) as { client_id: string };
  const { verifier, challenge } = await pkce();
  const url = new URL(`${ORIGIN}/authorize`);
  for (const [k, v] of Object.entries({
    response_type: 'code',
    client_id,
    redirect_uri: REDIRECT_URI,
    scope,
    state: 'st8',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: RESOURCE,
  }))
    url.searchParams.set(k, v);
  const page = await relay(url.pathname + url.search);
  expect(page.status).toBe(200);
  const text = await page.text();
  const handle = /name="handle" value="([^"]+)"/.exec(text)![1];
  const cookie = page.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  return { client_id, verifier, handle, cookie, text };
}

const submit = (flow: { handle: string; cookie: string }, fields: Record<string, string>) =>
  relay('/authorize', {
    method: 'POST',
    headers: { Cookie: flow.cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ handle: flow.handle, ...fields }),
  });

async function pairingCode(secret: string) {
  const res = await relay('/device/pair', { method: 'POST', headers: auth(secret) });
  expect(res.status).toBe(200);
  return ((await res.json()) as { code: string }).code;
}

async function exchange(flow: { client_id: string; verifier: string }, location: string) {
  const code = new URL(location).searchParams.get('code')!;
  const res = await relay('/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: flow.client_id,
      code_verifier: flow.verifier,
      resource: RESOURCE,
    }),
  });
  expect(res.status).toBe(200);
  return ((await res.json()) as { access_token: string }).access_token;
}

const tokenRequest = (fields: Record<string, string>) =>
  relay('/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });

const mcp = (token: string, body: unknown) =>
  relay('/mcp', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('relay', () => {
  it('points an unauthenticated client at the authorization server', async () => {
    const challenge = await relay('/mcp', { method: 'POST', body: '{}' });
    expect(challenge.status).toBe(401);
    const header = challenge.headers.get('WWW-Authenticate')!;
    expect(header).toContain('scope="telegram"');
    const metadataUrl = /resource_metadata="([^"]+)"/.exec(header)![1];
    const prm = (await (await harness.fetch(metadataUrl)).json()) as { resource: string; authorization_servers: string[] };
    expect(prm).toMatchObject({ resource: RESOURCE, authorization_servers: [ORIGIN] });
    const as = (await (await relay('/.well-known/oauth-authorization-server')).json()) as Record<string, unknown>;
    expect(as.authorization_endpoint).toBe(`${ORIGIN}/authorize`);
    expect(as.code_challenge_methods_supported).toEqual(['S256']);
  });

  it('pairs, asks the device, and relays MCP calls to it', async () => {
    const secret = newSecret();
    const dev = await connectDevice(secret);
    const flow = await startAuthorization();
    expect(flow.text).toContain('Test Client');
    expect(flow.text).toContain('client.example');

    const res = await submit(flow, { decision: 'approve', code: (await pairingCode(secret)).toLowerCase() });
    expect(res.status).toBe(302);
    const location = res.headers.get('Location')!;
    expect(location.startsWith(REDIRECT_URI)).toBe(true);
    expect(new URL(location).searchParams.get('state')).toBe('st8');
    expect(dev.asked).toEqual([expect.objectContaining({ clientName: 'Test Client', redirectHost: 'client.example' })]);

    const token = await exchange(flow, location);
    const call = await mcp(token, { jsonrpc: '2.0', id: 7, method: 'tools/list' });
    expect(call.status).toBe(200);
    expect(await call.json()).toEqual({ jsonrpc: '2.0', id: 7, result: { echo: 'tools/list' } });

    // Offline: a readable tool result instead of a transport error
    dev.ws.close();
    await new Promise(r => setTimeout(r, 200));
    const offline = await mcp(token, { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'telegram_read' } });
    const body = (await offline.json()) as { result: { isError: boolean; content: { text: string }[] } };
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('telegram mcp --remote');
  });

  it('lists and revokes connected clients for the device only', async () => {
    const secret = newSecret();
    const dev = await connectDevice(secret);
    const flow = await startAuthorization();
    const token = await exchange(flow, (await submit(flow, { decision: 'approve', code: await pairingCode(secret) })).headers.get('Location')!);

    const other = newSecret();
    const none = (await (await relay('/device/clients', { headers: auth(other) })).json()) as { clients: unknown[] };
    expect(none.clients).toEqual([]);

    const list = (await (await relay('/device/clients', { headers: auth(secret) })).json()) as { clients: { id: string; name: string }[] };
    expect(list.clients).toEqual([expect.objectContaining({ name: 'Test Client' })]);
    const wrong = await relay('/device/revoke', { method: 'POST', headers: auth(other), body: JSON.stringify({ id: list.clients[0].id }) });
    expect(wrong.status).toBe(404);

    const revoked = await relay('/device/revoke', { method: 'POST', headers: auth(secret), body: JSON.stringify({ all: true }) });
    expect(await revoked.json()).toEqual({ revoked: 1 });
    expect((await mcp(token, { jsonrpc: '2.0', id: 1, method: 'ping' })).status).toBe(401);
    dev.ws.close();
  });

  it('refuses a wrong code without asking the device, and keeps the page usable', async () => {
    const secret = newSecret();
    const dev = await connectDevice(secret);
    const flow = await startAuthorization();
    const wrong = await submit(flow, { decision: 'approve', code: 'AAAA-AAAA' });
    expect(wrong.status).toBe(400);
    expect(await wrong.text()).toContain('wrong or expired');
    expect(dev.asked).toEqual([]);
    // The same page still works with the right code, and a code works once
    const code = await pairingCode(secret);
    expect((await submit(flow, { decision: 'approve', code })).status).toBe(302);
    const flow2 = await startAuthorization();
    expect((await submit(flow2, { decision: 'approve', code })).status).toBe(400);
    dev.ws.close();
  });

  it('denies when the person at the computer says no, or the computer is offline', async () => {
    const secret = newSecret();
    const dev = await connectDevice(secret, false);
    const flow = await startAuthorization();
    const res = await submit(flow, { decision: 'approve', code: await pairingCode(secret) });
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('Location')!).searchParams.get('error')).toBe('access_denied');
    dev.ws.close();
    await new Promise(r => setTimeout(r, 200));

    const flow2 = await startAuthorization();
    const offline = await submit(flow2, { decision: 'approve', code: await pairingCode(secret) });
    expect(offline.status).toBe(409);
    expect(await offline.text()).toContain('not connected');
  });

  it('gives a refresh token when the client asks only for the advertised scope', async () => {
    // claude.ai and ChatGPT request what the 401 names: `telegram`, without offline_access
    const secret = newSecret();
    const dev = await connectDevice(secret);
    const flow = await startAuthorization('telegram');
    const location = (await submit(flow, { decision: 'approve', code: await pairingCode(secret) })).headers.get('Location')!;
    const first = await tokenRequest({
      grant_type: 'authorization_code',
      code: new URL(location).searchParams.get('code')!,
      redirect_uri: REDIRECT_URI,
      client_id: flow.client_id,
      code_verifier: flow.verifier,
      resource: RESOURCE,
    });
    const tokens = (await first.json()) as { access_token: string; refresh_token?: string; scope: string };
    expect(tokens.refresh_token).toBeTruthy();
    const refreshed = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token!, client_id: flow.client_id });
    expect(refreshed.status).toBe(200);
    const { access_token } = (await refreshed.json()) as { access_token: string };
    expect(await (await mcp(access_token, { jsonrpc: '2.0', id: 3, method: 'ping' })).json()).toEqual({ jsonrpc: '2.0', id: 3, result: { echo: 'ping' } });
    dev.ws.close();
  });

  it('ends calls waiting on a replaced connection right away', async () => {
    const secret = newSecret();
    const silent = await connectDevice(secret, true, false); // approves, then never answers calls
    const flow = await startAuthorization();
    const token = await exchange(flow, (await submit(flow, { decision: 'approve', code: await pairingCode(secret) })).headers.get('Location')!);
    const started = Date.now();
    const waiting = mcp(token, { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'telegram_read' } });
    await new Promise(r => setTimeout(r, 300));
    const fresh = await connectDevice(secret); // a restart: replaces the silent connection
    const body = (await (await waiting).json()) as { result: { isError: boolean } };
    expect(body.result.isError).toBe(true);
    expect(Date.now() - started).toBeLessThan(5000);
    silent.ws.close();
    fresh.ws.close();
  });

  it('needs the device secret for every device call', async () => {
    expect((await relay('/device/pair', { method: 'POST' })).status).toBe(401);
    expect((await relay('/device/pair', { method: 'POST', headers: { Authorization: 'Bearer nope' } })).status).toBe(401);
    expect((await relay('/device/clients')).status).toBe(401);
  });
});
