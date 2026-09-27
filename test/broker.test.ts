import { describe, expect, it } from 'vitest';
import { handle, sha256Hex, type Env, type Invite } from '../broker/src/handler.js';

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
    expect((await handle(new Request('https://broker.test/'), e)).status).toBe(404);
  });

  it('does not burn an invite use when the broker is misconfigured', async () => {
    const { e, store } = await env({}, { API_HASH: '' });
    expect((await handle(post({ invite: TOKEN }), e)).status).toBe(503);
    expect(JSON.parse([...store.values()][0]).uses).toBe(0);
  });
});
