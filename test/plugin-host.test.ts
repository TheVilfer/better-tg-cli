import { afterEach, describe, expect, it } from 'vitest';
import type { TelegramClient } from 'teleproto';
import { MockClient, resetMockHistoryFlood } from '../src/mock/client.js';
import { seedWorld, type MockWorld } from '../src/mock/world.js';
import { grantedApi, PAGE_CHARS, type HostContext, type HostState } from '../src/plugins/host.js';
import { buildProposal } from '../src/plugins/proposals.js';
import { memoryStorage } from '../src/plugins/run.js';
import { HostError } from '../src/plugins/sandbox-types.js';
import type { Effect, Manifest, Permission } from '../src/plugins/manifest.js';

const ALL: Permission[] = ['identity:read', 'messages:read-own', 'chats:read', 'messages:read', 'messages:read-target', 'storage:read', 'storage:write', 'settings:read', 'actions'];
const LOGIN = 'Login code: 52813. Do not give it to anyone';

/** The built-in account plus the two login-code services, a forward and a quote of them, own text with codes. */
function world(): MockWorld {
  const w = seedWorld();
  w.users.push({ id: 777000, firstName: 'Telegram' }, { id: 489000, firstName: 'Verification Codes' });
  w.chats.push(
    { id: 777000, kind: 'user', messages: [{ id: 1, ago: 60, text: LOGIN }] },
    { id: 489000, kind: 'user', messages: [{ id: 1, ago: 70, text: 'Your code 4417 for Shop' }] },
  );
  const alice = w.chats.find(c => c.id === 1001)!;
  alice.messages.push(
    { id: 50, ago: 10, out: true, text: 'your code: 99887 and t.me/giftcode/ABCDEF' },
    { id: 51, ago: 9, out: true, text: LOGIN, forwardedFrom: 777000 },
    { id: 52, ago: 8, out: true, text: 'thanks, got 52813', quoteFrom: 777000, quoteText: LOGIN },
    { id: 53, ago: 7, text: 'incoming text' },
  );
  return w;
}

function setup(opts: { permissions?: Permission[]; effects?: Effect[]; target?: HostContext['target']; mcp?: boolean; w?: MockWorld; account?: string; log?: boolean } = {}) {
  const w = opts.w ?? world();
  const client = new MockClient(w) as unknown as TelegramClient;
  const manifest = {
    name: 'lab', version: '1.0.0', permissions: opts.permissions ?? ALL, storage: { keys: ['notes'], quotaBytes: 4096 },
    settings: { tone: { type: 'string', description: 'Tone', default: 'warm' } },
  } as unknown as Manifest;
  const command = { name: 'go', description: '', effects: opts.effects ?? [], input: { type: 'object' }, output: { type: 'object' } };
  const storage = memoryStorage(manifest);
  const state: HostState = { proposals: [] };
  const logged: string[] = [];
  const ctx: HostContext = {
    manifest, command, client: async () => client, account: async () => opts.account ?? String(w.me), storage: () => storage,
    target: opts.target, maskProposals: !!opts.mcp, ...(opts.log ? { log: (l: string) => logged.push(l) } : {}),
  };
  const api = grantedApi(ctx, state);
  const call = async (name: string, ...args: unknown[]) => {
    if (!Object.hasOwn(api, name)) throw new Error(`not granted: ${name}`);
    // What the guest gets is JSON: round-trip it the same way
    return JSON.parse(JSON.stringify(await api[name](JSON.parse(JSON.stringify(args)) as unknown[], new AbortController().signal))) as any;
  };
  return { api, call, state, storage, logged, w };
}

const texts = (v: unknown) => JSON.stringify(v);

afterEach(() => {
  delete process.env.TG_MOCK_FLOOD_HISTORY;
  resetMockHistoryFlood();
});

describe('host API: grants', () => {
  it('a command without effects gets no writes even with the permissions; host.log only in plugin dev', () => {
    const read = Object.keys(setup({ effects: [] }).api).sort();
    expect(read).not.toContain('storage.set');
    expect(read).not.toContain('storage.delete');
    expect(read).not.toContain('actions.propose');
    expect(read).not.toContain('log');
    const write = Object.keys(setup({ effects: ['storage', 'actions'] }).api);
    expect(write).toEqual(expect.arrayContaining(['storage.set', 'storage.delete', 'actions.propose']));
    expect(Object.keys(setup({ log: true }).api)).toContain('log');
  });

  it('each API needs its permission', () => {
    expect(Object.keys(setup({ permissions: [] , effects: ['storage', 'actions'] }).api)).toEqual([]);
    expect(Object.keys(setup({ permissions: ['identity:read'] }).api)).toEqual(['me']);
    expect(Object.keys(setup({ permissions: ['messages:read-target'] }).api).sort()).toEqual(['target.message', 'target.thread']);
  });

  it('storage takes declared keys and strings only; settings give the declared default', async () => {
    const { call } = setup({ effects: ['storage'] });
    await expect(call('storage.get', 'other')).rejects.toMatchObject({ code: 'invalid_argument' });
    await expect(call('storage.set', 'notes', { a: 1 })).rejects.toMatchObject({ code: 'invalid_argument' });
    await call('storage.set', 'notes', 'hello');
    expect(await call('storage.get', 'notes')).toBe('hello');
    expect((await call('storage.list')).items.map((i: { key: string }) => i.key)).toEqual(['notes']);
    expect(await call('settings.get', 'tone')).toBe('warm');
    await expect(call('settings.get', '__proto__')).rejects.toMatchObject({ code: 'invalid_argument' });
  });
});

describe('host API: masking of service sources through every read API', () => {
  it('messages.mine: own text only, no forwards, no quotes of a service, no service chats; codes masked (echo)', async () => {
    const page = await setup().call('messages.mine', { limit: 100, types: ['private', 'group'] });
    const all = texts(page);
    expect(all).not.toContain('52813');
    expect(all).not.toContain('4417');
    expect(all).not.toContain('99887');
    expect(all).not.toContain('ABCDEF');
    expect(all).not.toContain('incoming text');
    expect(all).not.toContain('thanks, got');
    expect(page.messages.some((m: { text: string }) => m.text.startsWith('your code: [login code hidden]'))).toBe(true);
    expect(page.messages.every((m: object) => Object.keys(m).sort().join() === 'chatType,date,text')).toBe(true);
    expect(page).toMatchObject({ done: true, cursor: null });
  });

  it('messages.read: a service chat, a forward and a quote of one at the level service', async () => {
    const { call } = setup();
    const service = await call('messages.read', '777000', {});
    expect(texts(service)).not.toContain('52813');
    expect(service.messages[0]).toMatchObject({ service: true });
    const alice = await call('messages.read', '1001', { limit: 10 });
    const byId = (id: number) => alice.messages.find((m: { id: number }) => m.id === id);
    expect(byId(51)).toMatchObject({ service: true, forwarded: true });
    expect(byId(52)).toMatchObject({ service: true });
    // The level service hides any code-like token, the echo level only a labelled one
    expect(byId(52).text).not.toContain('52813');
    expect(byId(50).text).toBe('your code: [login code hidden] and t.me/giftcode/[gift code hidden]');
    expect(texts(alice)).not.toMatch(/quoteText|buttons|entities/);
  });

  it('messages.search (global and in a chat) and both target APIs', async () => {
    const { call } = setup({ target: { chat: '777000', msgId: 1, thread: false } });
    const global = await call('messages.search', 'code');
    expect(global.messages.length).toBeGreaterThan(0);
    expect(texts(global)).not.toContain('52813');
    expect(texts(global)).not.toContain('4417');
    expect(texts(await call('messages.search', 'code', { chat: '489000' }))).not.toContain('4417');
    const target = await call('target.message');
    expect(target.message).toMatchObject({ id: 1, service: true });
    expect(texts(target)).not.toContain('52813');
    await expect(call('target.thread')).rejects.toMatchObject({ code: 'not_available' });
  });

  it('chats.list gives no previews; me gives the owner', async () => {
    const { call } = setup();
    const { chats } = await call('chats.list', { limit: 50 });
    expect(chats.length).toBeGreaterThan(0);
    for (const c of chats) expect(Object.keys(c).sort()).toEqual(['id', 'muted', 'title', 'type', 'unreadCount']);
    expect(texts(chats)).not.toContain('52813');
    expect(await call('me')).toEqual({ id: '1000', name: 'Mock Owner', username: 'mock_owner' });
  });

  it('a target is only what the run was given; a chat is an ID or @username, never a title', async () => {
    const none = setup();
    await expect(none.call('target.message')).rejects.toMatchObject({ code: 'no_target' });
    await expect(none.call('messages.read', 'Alice Example')).rejects.toMatchObject({ code: 'invalid_argument' });
    const thread = setup({ target: { chat: '-1004003', topic: 1, thread: false } });
    await expect(thread.call('target.message')).rejects.toMatchObject({ code: 'not_available' });
    expect(Array.isArray((await thread.call('target.thread', { limit: 5 })).messages)).toBe(true);
  });
});

describe('host API: messages.mine pages and cursor', () => {
  function bigWorld(): MockWorld {
    const w = world();
    const alice = w.chats.find(c => c.id === 1001)!;
    for (let i = 0; i < 150; i++) alice.messages.push({ id: 100 + i, ago: 1000 + i, out: true, text: `${'long text '.repeat(50)}#${i}` });
    return w;
  }

  it('a page stays under the size bound; following the cursor gives every message once, in a stable order', async () => {
    const w = bigWorld();
    const { call } = setup({ w });
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let pages = 0; pages < 20; pages++) {
      const page = await call('messages.mine', { limit: 2000, ...(cursor ? { cursor } : {}) });
      expect(JSON.stringify(page.messages).length).toBeLessThanOrEqual(PAGE_CHARS);
      seen.push(...page.messages.map((m: { text: string }) => m.text));
      cursor = page.cursor;
      if (page.done) break;
    }
    expect(cursor).toBeNull();
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.filter(t => t.startsWith('long text')).length).toBe(150);
    // Same walk again: same order
    const again = await setup({ w }).call('messages.mine', { limit: 3 });
    expect(again.messages.map((m: { text: string }) => m.text)).toEqual(seen.slice(0, 3));
  });

  it('the cursor is checked: garbage, another account, and a forged chat list re-filtered', async () => {
    const { call } = setup();
    await expect(call('messages.mine', { cursor: 'not a cursor!' })).rejects.toMatchObject({ code: 'invalid_argument' });
    const first = await call('messages.mine', { limit: 1 });
    expect(first.cursor).toEqual(expect.any(String));
    await expect(setup({ account: '2000' }).call('messages.mine', { cursor: first.cursor })).rejects.toMatchObject({ code: 'invalid_argument' });
    // A cursor rewritten to walk the service chat and a group the listing did not ask for: both skipped
    const raw = JSON.parse(Buffer.from(first.cursor, 'base64url').toString());
    raw.c = ['777000', '489000', '-1004001'];
    raw.i = 0;
    raw.o = 0;
    const forged = await call('messages.mine', { limit: 50, cursor: Buffer.from(JSON.stringify(raw)).toString('base64url') });
    expect(forged).toMatchObject({ messages: [], count: 0, done: true, cursor: null });
    raw.t = ['private', 'channel'];
    await expect(call('messages.mine', { cursor: Buffer.from(JSON.stringify(raw)).toString('base64url') })).rejects.toMatchObject({ code: 'invalid_argument' });
  });

  it('FLOOD_WAIT: an error with retryAfterSeconds, the cursor to continue from and what was collected', async () => {
    const w = world();
    const full = await setup({ w }).call('messages.mine', { limit: 100, types: ['private', 'group'] });
    process.env.TG_MOCK_FLOOD_HISTORY = '1:7';
    resetMockHistoryFlood();
    const { call, state } = setup({ w });
    let error: { code: string; retryAfterSeconds: number; cursor: string; partial: { messages: { text: string }[]; count: number } } | undefined;
    try {
      await call('messages.mine', { limit: 100, types: ['private', 'group'] });
    } catch (e) {
      expect(e).toBeInstanceOf(HostError);
      const h = e as HostError;
      error = { code: h.code, ...(h.extra as Omit<NonNullable<typeof error>, 'code'>) };
    }
    expect(error).toMatchObject({ code: 'flood_wait', retryAfterSeconds: 7, cursor: expect.any(String) });
    expect(error!.partial.count).toBe(error!.partial.messages.length);
    expect(state.flood).toMatchObject({ retryAfterSeconds: 7, cursor: error!.cursor });
    delete process.env.TG_MOCK_FLOOD_HISTORY;
    const rest = await setup({ w }).call('messages.mine', { limit: 100, cursor: error!.cursor });
    const texts2 = [...error!.partial.messages, ...rest.messages].map(m => m.text);
    expect(texts2).toEqual(full.messages.map((m: { text: string }) => m.text));
  });
});

describe('proposals: built by the host from checked fields', () => {
  it('send, reply and react: summary, argv and stdin from the same values', () => {
    expect(buildProposal({ type: 'send', chat: '@alice_example', text: 'Hi\nthere', topic: 3 }, 1, false)).toEqual({
      id: 'p1', type: 'send', confirm: true, stdin: 'Hi\nthere', argv: ['send', '@alice_example', '-', '--topic', '3'],
      summary: 'Send to @alice_example (topic 3): "Hi\\\\u{a}there"',
    });
    expect(buildProposal({ type: 'reply', chat: 1001, msgId: 5, text: 'ok' }, 2, false)).toMatchObject({ argv: ['reply', '1001', '5', '-'], stdin: 'ok' });
    expect(buildProposal({ type: 'react', chat: '-1004001', msgId: 2, emoji: '👍' }, 3, false)).toMatchObject({ argv: ['react', '-1004001', '2', '👍'] });
    expect(buildProposal({ type: 'react', chat: '-1004001', msgId: 2, emoji: '👍' }, 3, false)).not.toHaveProperty('stdin');
  });

  it('anything else is refused: unknown types and fields, a title for a chat, an option for an emoji', () => {
    const bad = [
      { type: 'delete', chat: '1', msgId: 1 },
      { type: 'send', chat: '1', text: 'x', argv: ['send', '@x', 'y'] },
      { type: 'send', chat: '1', text: 'x', summary: 'harmless' },
      { type: 'send', chat: 'Alice Example', text: 'x' },
      { type: 'send', chat: '--help', text: 'x' },
      { type: 'send', chat: '1', text: '' },
      { type: 'send', chat: '1', text: 'x'.repeat(4097) },
      { type: 'reply', chat: '1', msgId: 1.5, text: 'x' },
      { type: 'react', chat: '1', msgId: 1, emoji: '--remove' },
      { type: 'react', chat: '1', msgId: 1, emoji: '👍 👎' },
      { __proto__: { type: 'send' }, chat: '1', text: 'x' },
      ['send'],
      null,
    ];
    for (const b of bad) expect(() => buildProposal(b, 1, false), JSON.stringify(b)).toThrow(HostError);
  });

  it('over MCP the text is masked before the command is built', () => {
    const p = buildProposal({ type: 'send', chat: '1', text: 'Your code: 12345' }, 1, true);
    expect(p.stdin).toBe('Your code: [login code hidden]');
    expect(p.summary).toContain('[login code hidden]');
  });

  it('actions.propose collects proposals for the envelope; at most 20', async () => {
    const { call, state } = setup({ effects: ['actions'] });
    expect(await call('actions.propose', { type: 'react', chat: '1001', msgId: 5, emoji: '👍' })).toEqual({ id: 'p1' });
    expect(state.proposals).toHaveLength(1);
    for (let i = 0; i < 19; i++) await call('actions.propose', { type: 'react', chat: '1001', msgId: 5, emoji: '👍' });
    await expect(call('actions.propose', { type: 'react', chat: '1001', msgId: 5, emoji: '👍' })).rejects.toMatchObject({ code: 'plugin_limit' });
  });
});

describe('command schemas', () => {
  it('no regular expressions in command schemas (the host checks plugin values on its own thread)', async () => {
    const { commandSchemaProblems } = await import('../src/plugins/json-schema.js');
    expect(commandSchemaProblems({ type: 'object', properties: { a: { type: 'string', pattern: '^(a+)+$' } } })).toEqual([expect.stringMatching(/"pattern" at \/properties\/a/)]);
    expect(commandSchemaProblems({ type: 'object', patternProperties: { '^x': {} } })).toHaveLength(1);
    expect(commandSchemaProblems({ type: 'object', unevaluatedProperties: false })).toEqual([expect.stringMatching(/Unsupported JSON Schema keyword "unevaluatedProperties"/)]);
    expect(commandSchemaProblems({ type: 'object', properties: { a: { enum: [1, null] } } })).toEqual([]);
  });

  it('a check that takes too long stops with SchemaTimeoutError', async () => {
    const { validate, SchemaTimeoutError } = await import('../src/plugins/json-schema.js');
    const value = Array.from({ length: 20_000 }, (_, i) => ({ i }));
    expect(() => validate({ type: 'array', uniqueItems: true }, value, 20, 50)).toThrow(SchemaTimeoutError);
    expect(validate({ type: 'array', uniqueItems: true }, value.slice(0, 100), 20, 1000)).toEqual([]);
  });
});
