import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Api } from 'teleproto';
import bigInt from 'big-integer';
import type { TelegramClient } from 'teleproto';
import {
  getMessages, getMessagesByIds, getChatStats, getMessageStats, buildMessageFull, buildFullMedia, disconnectClient,
} from '../src/client.js';
import type { BroadcastActivity, MegagroupActivity } from '../src/client.js';
import { planCall } from '../src/mcp.js';
import { setStrictChatResolution } from '../src/resolve-mode.js';
import { MockClient } from '../src/mock/client.js';
import { seedWorld, type MockWorld } from '../src/mock/world.js';

const mock = (world: MockWorld = seedWorld()) => new MockClient(world) as unknown as TelegramClient;

afterEach(async () => {
  await disconnectClient();
  setStrictChatResolution(false);
});

describe('default output is unchanged (no stats unless --full)', () => {
  it('getMessages without full attaches no `full` field', async () => {
    const { messages } = await getMessages(mock(), 'alice', { limit: 5 });
    for (const m of messages) expect(m.full).toBeUndefined();
  });

  it('getMessages with full attaches a `full` field to every message', async () => {
    const { messages } = await getMessages(mock(), 'alice', { limit: 5, full: true });
    for (const m of messages) expect(m.full).toBeDefined();
  });
});

describe('--full per-message stats', () => {
  it('reports views/forwards and a full reaction breakdown incl. custom and paid', async () => {
    const { messages } = await getMessages(mock(), 'alice', { limit: 1, full: true });
    const full = messages[0].full!;
    expect(full.editDate).toBeDefined();
    const reactions = full.reactions!;
    expect(reactions.find(r => r.emoji === '👍')).toMatchObject({ count: 2, chosen: true });
    expect(reactions.find(r => r.customEmojiId === '5201')).toMatchObject({ count: 1 });
    expect(reactions.find(r => r.paid)).toMatchObject({ count: 1 });
    expect(full.recentReactors).toContain('1000');
  });

  it('reports views/forwards, author and comments on a channel post', async () => {
    const { messages } = await getMessagesByIds(mock(), 'Mock News', [1], { full: true });
    const full = messages[0].full!;
    expect(full).toMatchObject({ views: 15230, forwards: 42, postAuthor: 'Editor', pinned: true, post: true });
    expect(full.replies).toMatchObject({ count: 2, comments: true });
  });

  it('reports via_bot and grouped (album) ids and forward headers', async () => {
    const { messages } = await getMessagesByIds(mock(), 'Team', [1], { full: true });
    expect(messages[0].full).toMatchObject({ viaBotId: '2001', groupedId: '7001' });

    const fwd = await getMessagesByIds(mock(), 'Mock News Chat', [1], { full: true });
    expect(fwd.messages[0].full!.fwdFrom).toBeDefined();
  });
});

describe('rich media detail (buildFullMedia)', () => {
  const msg = (media: Api.TypeMessageMedia) => new Api.Message({ id: 1, peerId: new Api.PeerUser({ userId: bigInt(1) }), date: 0, message: '', media } as never);

  it('decodes polls with per-option votes', () => {
    const poll = new Api.MessageMediaPoll({
      poll: new Api.Poll({ id: bigInt(1), quiz: true, question: new Api.TextWithEntities({ text: 'Q?', entities: [] }), answers: [
        new Api.PollAnswer({ text: new Api.TextWithEntities({ text: 'A', entities: [] }), option: Buffer.from([0]) }),
        new Api.PollAnswer({ text: new Api.TextWithEntities({ text: 'B', entities: [] }), option: Buffer.from([1]) }),
      ] } as never),
      results: new Api.PollResults({ totalVoters: 5, results: [
        new Api.PollAnswerVoters({ option: Buffer.from([0]), voters: 4, correct: true }),
        new Api.PollAnswerVoters({ option: Buffer.from([1]), voters: 1 }),
      ] } as never),
    });
    const m = buildFullMedia(msg(poll))!;
    expect(m.type).toBe('poll');
    expect(m.poll).toMatchObject({ question: 'Q?', quiz: true, totalVoters: 5 });
    expect(m.poll!.options[0]).toMatchObject({ text: 'A', voters: 4, correct: true });
  });

  it('decodes geo, contact and webpage', () => {
    const geo = buildFullMedia(msg(new Api.MessageMediaGeo({ geo: new Api.GeoPoint({ long: 2.3, lat: 48.8, accessHash: bigInt(0) } as never) })))!;
    expect(geo).toMatchObject({ type: 'geo', lat: 48.8, long: 2.3 });

    const contact = buildFullMedia(msg(new Api.MessageMediaContact({ phoneNumber: '123', firstName: 'A', lastName: 'B', vcard: '', userId: bigInt(7) })))!;
    expect(contact).toMatchObject({ type: 'contact', phone: '123', firstName: 'A', userId: '7' });

    const web = buildFullMedia(msg(new Api.MessageMediaWebPage({ webpage: new Api.WebPage({ id: bigInt(1), url: 'https://x.io', displayUrl: 'x.io', hash: 0, siteName: 'X', title: 'T' } as never) })))!;
    expect(web).toMatchObject({ type: 'webpage', url: 'https://x.io', siteName: 'X', title: 'T' });
  });
});

describe('MCP forwards --full and classifies stats as a read', () => {
  it('telegram_read accepts read + --full and the stats command', () => {
    expect(planCall('telegram_read', { args: ['read', '@x', '--full'] })).toEqual({ argv: ['read', '@x', '--full'], readOnly: true });
    expect(planCall('telegram_read', { args: ['stats', 'Team'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_write', { args: ['stats', 'Team'] })).toMatch(/read-only/);
  });
});

describe('chat statistics', () => {
  it('broadcast channel: counts, flags, current/previous values, period and recent posts', async () => {
    const s = await getChatStats(mock(), 'Mock News');
    expect(s).toMatchObject({ type: 'channel', verified: true, participantsCount: 15230, onlineCount: 320, kickedCount: 4, bannedCount: 1, linkedChatId: '5002' });
    const a = s.activity as BroadcastActivity;
    expect(a.kind).toBe('broadcast');
    expect(a.followers).toMatchObject({ current: 15230, previous: 15180 });
    expect(a.enabledNotificationsPct).toBe(62);
    expect(a.period).toBeDefined();
    expect(a.recentPosts![0]).toMatchObject({ msgId: 1, views: 15230, forwards: 42 });
    expect(a.graphs).toBeUndefined(); // not requested
  });

  it('broadcast --graphs: loads async graphs and reports error graphs per graph', async () => {
    const s = await getChatStats(mock(), 'Mock News', { graphs: true });
    const a = s.activity as BroadcastActivity;
    const followers = a.graphs!.find(g => g.name === 'followers')!; // StatsGraphAsync → loaded
    expect(followers.data).toMatchObject({ token: 'async-followers' });
    expect(a.graphs!.find(g => g.name === 'mute')!.error).toBe('no data'); // StatsGraphError
  });

  it('megagroup: activity with resolved top posters/admins/inviters', async () => {
    const s = await getChatStats(mock(), 'Team');
    expect(s).toMatchObject({ type: 'supergroup', slowModeSeconds: 10 });
    const a = s.activity as MegagroupActivity;
    expect(a.kind).toBe('megagroup');
    expect(a.members).toMatchObject({ current: 4 });
    expect(a.topPosters![0]).toMatchObject({ name: 'Mock Owner', messages: 20, avgChars: 80 });
    expect(a.topInviters![0]).toMatchObject({ name: 'Mock Owner', invitations: 7 });
  });

  it('gracefully reports missing rights instead of failing', async () => {
    const s = await getChatStats(mock(), 'Mock News Chat');
    expect(s.activity).toMatchObject({ error: expect.stringMatching(/Admin rights/) });
  });

  it('per-message stats: own views/forwards/reactions plus a public-forwards list', async () => {
    const s = await getMessageStats(mock(), 'Mock News', 1, { graphs: true });
    expect(s).toMatchObject({ messageId: 1, views: 15230, forwards: 42, publicForwardsCount: 1 });
    expect(s.reactions!.length).toBeGreaterThan(0);
    expect(s.publicForwards![0]).toMatchObject({ kind: 'message', chatTitle: 'Team', views: 123 });
    expect(s.graphs!.find(g => g.name === 'views')!.data).toBeDefined();
  });
});

describe('CLI surface: default read output unchanged under --full absence', () => {
  const bin = 'dist/telegram.mjs';
  const run = (...args: string[]) => execFileSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: { ...process.env, TG_MOCK: '1', TG_PROFILE: 'mock', NO_COLOR: '1', TG_NO_UPDATE_CHECK: '1' } });

  it.skipIf(!existsSync(bin))('compact read has no stats suffix by default, adds one with --full', () => {
    const def = run('get', 'Mock News', '1', '--json');
    expect(JSON.parse(def).messages[0].full).toBeUndefined();
    const full = run('get', 'Mock News', '1', '--full', '--json');
    expect(JSON.parse(full).messages[0].full).toMatchObject({ views: 15230, forwards: 42 });
    const compact = run('get', 'Mock News', '1', '--full');
    expect(compact).toMatch(/👁/);
  });
});
