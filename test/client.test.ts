import { afterEach, describe, expect, it, vi } from 'vitest';
import { Api } from 'teleproto';
import bigInt from 'big-integer';
import { disconnectClient, getMessages, parseTimeOffset, resolveChat, searchMessages } from '../src/client.js';

type Fake = Record<string, ReturnType<typeof vi.fn>>;

const user = (id: number, firstName: string, self = false) =>
  new Api.User({ id: bigInt(id), firstName, self, accessHash: bigInt(1) });
const channel = (id: number, title: string) =>
  new Api.Channel({ id: bigInt(id), title, photo: new Api.ChatPhotoEmpty(), date: 0, accessHash: bigInt(1) });
const dialog = (id: string, title: string, entity: unknown) => ({ id: bigInt(id), title, entity });

const message = (id: number, date: number) =>
  new Api.Message({ id, date, message: `m${id}`, peerId: new Api.PeerChannel({ channelId: bigInt(5) }) });
const service = (id: number, date: number) =>
  new Api.MessageService({
    id,
    date,
    peerId: new Api.PeerChannel({ channelId: bigInt(5) }),
    action: new Api.MessageActionPinMessage(),
  });

const me = user(1, 'Me', true);
const news = channel(5, 'News');
const game = channel(6, 'Gamers');

function fakeClient(over: Partial<Fake> = {}): Fake {
  return {
    getMe: vi.fn(async () => me),
    getEntity: vi.fn(async () => news),
    getDialogs: vi.fn(async () => [
      dialog('-1006', 'Gamers', game), // contains "me" as a substring
      dialog('-1005', 'News', news),
    ]),
    getMessages: vi.fn(async () => []),
    invoke: vi.fn(),
    ...over,
  };
}

afterEach(async () => {
  await disconnectClient(); // clears the resolve and dialog caches
});

describe('parseTimeOffset', () => {
  it('parses relative offsets including weeks', () => {
    const now = Date.now();
    expect(now - parseTimeOffset('30m').getTime()).toBeGreaterThanOrEqual(30 * 60e3 - 50);
    expect(now - parseTimeOffset('2w').getTime()).toBeGreaterThanOrEqual(14 * 86400e3 - 50);
  });

  it('parses absolute dates', () => {
    expect(parseTimeOffset('2026-09-01').toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('rejects garbage', () => {
    expect(() => parseTimeOffset('soon')).toThrow(/Invalid time/);
  });
});

describe('resolveChat', () => {
  it('maps me/Saved Messages/Избранное to our own account, never to a title substring', async () => {
    for (const alias of ['me', 'ME', 'Saved Messages', 'Избранное', 'self']) {
      const client = fakeClient();
      expect(await resolveChat(client as never, alias)).toBe(me);
      expect(client.getDialogs).not.toHaveBeenCalled();
      await disconnectClient();
    }
  });

  it('matches numeric IDs against dialog IDs only', async () => {
    const client = fakeClient();
    expect(await resolveChat(client as never, '-1005')).toBe(news);
  });

  it('prefers exact titles, then substrings', async () => {
    expect(await resolveChat(fakeClient() as never, 'news')).toBe(news);
    await disconnectClient();
    expect(await resolveChat(fakeClient() as never, 'gamer')).toBe(game);
  });

  it('fetches the dialog list once per process', async () => {
    const client = fakeClient();
    await resolveChat(client as never, 'News');
    await resolveChat(client as never, 'Gamers');
    await resolveChat(client as never, '-1006');
    expect(client.getDialogs).toHaveBeenCalledTimes(1);
  });
});

describe('getMessages pagination', () => {
  it('pages by the oldest real message even when a batch ends with a service message', async () => {
    // 300 messages of history; every full batch ends with a service item (pin/join marker)
    const history = (offsetId: number | undefined, limit: number) => {
      const top = (offsetId ?? 301) - 1;
      const out = [];
      for (let id = top; id > top - limit && id > 0; id--) {
        out.push(id === top - limit + 1 ? service(id, id * 10) : message(id, id * 10));
      }
      return out;
    };
    const client = fakeClient({
      getMessages: vi.fn(async (_e: unknown, p: { offsetId?: number; limit: number }) => history(p.offsetId, p.limit)),
    });
    const { messages } = await getMessages(client as never, 'News', { limit: 120 });
    expect(messages).toHaveLength(120);
    expect(messages[0].id).toBe(300);
    // Continued past the first batch's trailing service message instead of stopping there
    expect(client.getMessages.mock.calls.length).toBeGreaterThan(1);
    const firstBatch = history(undefined, client.getMessages.mock.calls[0][1].limit);
    const oldestReal = [...firstBatch].reverse().find(m => m instanceof Api.Message)!;
    expect(client.getMessages.mock.calls[1][1].offsetId).toBe(oldestReal.id);
  });

  it('stops at minDate and skips messages after maxDate', async () => {
    const client = fakeClient({
      getMessages: vi.fn(async () => [message(5, 500), message(4, 400), message(3, 300), message(2, 200)]),
    });
    const { messages } = await getMessages(client as never, 'News', {
      limit: 50,
      maxDate: new Date(450 * 1000),
      minDate: new Date(250 * 1000),
    });
    expect(messages.map(m => m.id)).toEqual([4, 3]);
  });

  it('passes minId through for --after / sync --resume', async () => {
    const client = fakeClient({ getMessages: vi.fn(async () => []) });
    await getMessages(client as never, 'News', { minId: 42 });
    expect(client.getMessages.mock.calls[0][1].minId).toBe(42);
  });
});

describe('searchMessages validation', () => {
  it('rejects unknown --type values', async () => {
    await expect(searchMessages(fakeClient() as never, 'x', { type: 'pdf' })).rejects.toThrow(/Unknown --type/);
  });

  it('refuses --from without --chat (global search cannot filter by sender)', async () => {
    await expect(searchMessages(fakeClient() as never, 'x', { from: '@a' })).rejects.toThrow(/--from needs --chat/);
  });
});

describe('admin requests serialize on TL layer 229', () => {
  const ch = new Api.InputChannel({ channelId: bigInt(1), accessHash: bigInt(2) });
  const u = new Api.InputUser({ userId: bigInt(3), accessHash: bigInt(4) });

  it('channels.EditAdmin (promote)', () => {
    const req = new Api.channels.EditAdmin({ channel: ch, userId: u, adminRights: new Api.ChatAdminRights({}), rank: 'Mod' });
    expect(req.getBytes().length).toBeGreaterThan(0);
  });

  it('messages.EditChatCreator (transfer-owner)', () => {
    const req = new Api.messages.EditChatCreator({
      peer: new Api.InputPeerChannel({ channelId: bigInt(1), accessHash: bigInt(2) }),
      userId: u,
      password: new Api.InputCheckPasswordEmpty(),
    });
    expect(req.getBytes().length).toBeGreaterThan(0);
  });
});
