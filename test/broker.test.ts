import { describe, expect, it } from 'vitest';
import { handle, sha256Hex, type Env, type Invite } from '../broker/src/handler.js';
import { handleSignup, normalizeEmail, SIGNUPS_KEY } from '../broker/src/signup.js';

const TOKEN = 'tok_' + 'x'.repeat(40);

async function env(invite?: Partial<Invite>, over: Partial<Env> = {}) {
  const store = new Map<string, string>();
  if (invite) {
    store.set(
      `invite:${await sha256Hex(TOKEN)}`,
      JSON.stringify({ name: 'alice', createdAt: '2026-09-27', uses: 0, maxUses: 2, ...invite })
    );
  }
  const e: Env = {
    INVITES: { get: async k => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) },
    API_ID: '12345',
    API_HASH: 'hash123',
    ...over,
  };
  return { e, store };
}

const post = (body: unknown) =>
  new Request('https://broker.test/v1/credentials', { method: 'POST', body: JSON.stringify(body) });

describe('credential broker', () => {
  it('returns credentials for a valid invite and counts the use', async () => {
    const { e, store } = await env({});
    const res = await handle(post({ invite: TOKEN }), e);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ apiId: 12345, apiHash: 'hash123' });
    const rec = JSON.parse([...store.values()][0]);
    expect(rec.uses).toBe(1);
    expect(rec.lastUsedAt).toBeTruthy();
  });

  it('stores only the token hash, never the raw token', async () => {
    const { store } = await env({});
    expect([...store.keys()].join()).not.toContain(TOKEN);
  });

  it('rejects unknown, revoked and used-up invites', async () => {
    expect((await handle(post({ invite: 'tok_' + 'y'.repeat(40) }), (await env({})).e)).status).toBe(403);
    expect((await handle(post({ invite: TOKEN }), (await env({ revoked: true })).e)).status).toBe(403);
    expect((await handle(post({ invite: TOKEN }), (await env({ uses: 2 })).e)).status).toBe(429);
  });

  it('rejects malformed requests and other routes', async () => {
    const { e } = await env({});
    expect((await handle(post({ invite: 'short' }), e)).status).toBe(400);
    expect((await handle(new Request('https://broker.test/v1/credentials?invite=' + TOKEN), e)).status).toBe(405);
    expect((await handle(new Request('https://broker.test/nope'), e)).status).toBe(404);
    // / is the signup page now (see the signup tests below)
  });

  it('does not burn an invite use when the broker is misconfigured', async () => {
    const { e, store } = await env({}, { API_HASH: '' });
    expect((await handle(post({ invite: TOKEN }), e)).status).toBe(503);
    expect(JSON.parse([...store.values()][0]).uses).toBe(0);
  });
  it('rate-limits per IP before touching KV', async () => {
    const seen: string[] = [];
    const { e, store } = await env({});
    e.LIMITER = { limit: async ({ key }) => { seen.push(key); return { success: false }; } };
    const req = new Request('https://broker.test/v1/credentials', {
      method: 'POST', body: JSON.stringify({ invite: 'x'.repeat(30) }), headers: { 'cf-connecting-ip': '203.0.113.9' },
    });
    const res = await handle(req, e);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited' });
    expect(seen).toEqual(['203.0.113.9']);
    expect(JSON.parse(store.values().next().value!).uses).toBe(0); // no use consumed
  });
});

describe('self-serve signup', () => {
  const NOW = new Date('2026-09-28T12:00:00Z');
  const open = async (over: Partial<Env> = {}) => {
    const r = await env(undefined, { TURNSTILE_SECRET: 'ts-secret', TURNSTILE_SITE_KEY: 'site-key', ...over });
    r.store.set(SIGNUPS_KEY, 'on');
    return r;
  };
  const signup = (body: unknown, ip = '198.51.100.7') =>
    new Request('https://broker.test/v1/invites', { method: 'POST', body: JSON.stringify(body), headers: { 'cf-connecting-ip': ip } });
  const pass = async () => true;
  const call = (req: Request, e: Env, verify = pass) => handleSignup(req, e, NOW, verify);

  it('is closed unless switched on and Turnstile is configured', async () => {
    const off = await env(undefined, { TURNSTILE_SECRET: 's', TURNSTILE_SITE_KEY: 'k' });
    expect((await call(signup({ email: 'a@b.co', turnstile: 't' }), off.e)).status).toBe(503);
    const noSecret = await open({ TURNSTILE_SECRET: undefined });
    expect((await call(signup({ email: 'a@b.co', turnstile: 't' }), noSecret.e)).status).toBe(503);
    const noKeys = await open({ API_HASH: '' });
    expect((await call(signup({ email: 'a@b.co', turnstile: 't' }), noKeys.e)).status).toBe(503);
    const page = await handle(new Request('https://broker.test/'), off.e);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('Регистрация сейчас закрыта');
  });

  it('serves the form with a nonce CSP when open', async () => {
    const { e } = await open();
    const res = await handle(new Request('https://broker.test/'), e);
    const html = await res.text();
    expect(html).toContain('data-sitekey="site-key"');
    const csp = res.headers.get('content-security-policy')!;
    const nonce = /'nonce-([^']+)'/.exec(csp)![1];
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('shows the install guide (Auto and PRO, one PRO tab per agent), open or closed', async () => {
    for (const { e } of [await open(), await env()]) {
      const html = await (await handle(new Request('https://broker.test/'), e)).text();
      const tabs = [...html.matchAll(/role="tab" id="tab-([a-z-]+)"/g)].map(m => m[1]);
      expect(tabs).toEqual(['auto', 'pro', 'claude-code', 'codex', 'cursor', 'claude-desktop']);
      expect(html).toContain('npx skills add TheVilfer/better-tg-cli -g -y'); // the Auto prompt
      expect(html).toContain('telegram auth --invite --qr');
      expect(html).not.toMatch(/ style="/); // blocked by the nonce CSP
    }
  });

  it('refuses a failed captcha and bad emails without storing anything', async () => {
    const { e, store } = await open();
    expect((await call(signup({ email: 'a@b.co', turnstile: 't' }), e, async () => false)).status).toBe(403);
    expect((await call(signup({ email: 'nope', turnstile: 't' }), e)).status).toBe(400);
    expect((await call(signup({ email: 'a@b.co' }), e)).status).toBe(400);
    expect([...store.keys()]).toEqual([SIGNUPS_KEY]);
  });

  it('issues a one-login invite that works at /v1/credentials exactly once', async () => {
    const { e, store } = await open();
    const res = await call(signup({ email: '  Alice@Example.COM ', turnstile: 't' }), e);
    expect(res.status).toBe(201);
    const { invite } = (await res.json()) as { invite: string };
    expect(invite).toMatch(/^tgi_[A-Za-z0-9_-]{43}$/);
    expect([...store.keys()].join()).not.toContain(invite);

    const rec = JSON.parse(store.get(`invite:${await sha256Hex(invite)}`)!);
    expect(rec).toMatchObject({ name: 'alice@example.com', maxUses: 1, uses: 0, source: 'self-serve' });
    const email = JSON.parse(store.get(`email:${await sha256Hex('alice@example.com')}`)!);
    expect(email).toMatchObject({ email: 'alice@example.com', inviteKey: `invite:${await sha256Hex(invite)}` });

    expect((await handle(post({ invite }), e)).status).toBe(200);
    expect((await handle(post({ invite }), e)).status).toBe(429);
  });

  it('gives one invite per email and caps per IP and per day', async () => {
    const { e } = await open({ SIGNUP_DAILY_CAP: '3' });
    expect((await call(signup({ email: 'a@b.co', turnstile: 't' }), e)).status).toBe(201);
    expect((await call(signup({ email: 'A@B.co', turnstile: 't' }, '198.51.100.8'), e)).status).toBe(409);
    expect((await call(signup({ email: 'c@b.co', turnstile: 't' }), e)).status).toBe(201);
    expect((await call(signup({ email: 'd@b.co', turnstile: 't' }), e)).status).toBe(429); // 2 per IP per day
    expect((await call(signup({ email: 'e@b.co', turnstile: 't' }, '198.51.100.9'), e)).status).toBe(201);
    const capped = await call(signup({ email: 'f@b.co', turnstile: 't' }, '198.51.100.10'), e);
    expect(capped.status).toBe(429);
    expect(await capped.json()).toEqual({ error: 'daily_limit' });
  });

  it('rate-limits per IP before any other work', async () => {
    const { e, store } = await open();
    e.SIGNUP_LIMITER = { limit: async () => ({ success: false }) };
    let verified = false;
    const res = await call(signup({ email: 'a@b.co', turnstile: 't' }), e, async () => (verified = true));
    expect(res.status).toBe(429);
    expect(verified).toBe(false);
    expect([...store.keys()]).toEqual([SIGNUPS_KEY]);
  });

  it('normalizes emails', () => {
    expect(normalizeEmail(' X@Y.Io ')).toBe('x@y.io');
    for (const bad of ['', 'a@b', 'a b@c.io', '@c.io', 'a@@c.io', 42, 'a@' + 'b'.repeat(260) + '.io']) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
});
