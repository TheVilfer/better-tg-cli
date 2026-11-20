import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedWorld } from '../src/mock/world.js';
import { cliArgs } from './cli.js';
import { Api } from 'teleproto';
import bigInt from 'big-integer';
import {
  clickButton, forwardMessages, getDialogs, maskLoginCodes, messageText, serializeApiResult, toMessageInfo,
} from '../src/client.js';
import { mcpParamRefusal } from '../src/api-methods.js';
import { isMcpApiAllowed, mcpApiAllowlistRefusal } from '../src/mcp-api-allowlist.js';
import { classifyCall, cliResult as mcpToolResult } from '../src/mcp.js';
import { maskGiftCodes } from '../src/mcp-output.js';

// Over MCP (TG_MCP on every call, TG_READ_ONLY on the read tool) the model must not see login codes,
// redeemable gift links or a venue's place ID, and must not forward a contact card or a location.

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});
const overMcp = () => { process.env.TG_MCP = '1'; };
const inTerminal = () => { delete process.env.TG_MCP; delete process.env.TG_READ_ONLY; };

const SERVICE = bigInt(777000);
const LOGIN_TEXT = 'Login code: 52813. Do not give this code to anyone, even if they say they are from Telegram!';
const WEB_TEXT = 'Web login code. Dear Ann, we received a request to log in on my.telegram.org.\n\nThis is your login code:\nEeKyAb7Qe0M\n\nIf you did not request it, ignore this message.';
const RU_TEXT = 'Код для входа в Telegram: 52813. Никому не давайте код.';

const serviceMessage = (message: string, id = 1) => new Api.Message({
  id, date: 1_700_000_000, message, peerId: new Api.PeerUser({ userId: SERVICE }),
});

describe('login codes from the service account 777000', () => {
  it('maskLoginCodes hides numeric, alphanumeric and Russian codes and keeps the rest', () => {
    expect(maskLoginCodes(LOGIN_TEXT)).toBe('Login code: [login code hidden]. Do not give this code to anyone, even if they say they are from Telegram!');
    const web = maskLoginCodes(WEB_TEXT);
    expect(web).not.toMatch(/EeKyAb7Qe0M/);
    expect(web).toMatch(/This is your login code:\n\[login code hidden\]\n\nIf you did not request it/);
    expect(web).toMatch(/my\.telegram\.org/);
    expect(maskLoginCodes(RU_TEXT)).toBe('Код для входа в Telegram: [login code hidden]. Никому не давайте код.');
    // An older form without "code:" in front of it
    expect(maskLoginCodes('Your Telegram code is 52-813')).not.toMatch(/52|813/);
  });

  it('curated: messageText masks them over MCP (both tools) and nowhere else', () => {
    overMcp();
    expect(messageText(serviceMessage(LOGIN_TEXT))).not.toMatch(/52813/);
    expect(messageText(serviceMessage(LOGIN_TEXT))).toMatch(/\[login code hidden\]\. Do not give this code/);
    // Sent by 777000 in a group (fromId) or forwarded from it
    const inGroup = new Api.Message({ id: 2, date: 0, message: LOGIN_TEXT, peerId: new Api.PeerChat({ chatId: bigInt(5) }), fromId: new Api.PeerUser({ userId: SERVICE }) });
    expect(messageText(inGroup)).not.toMatch(/52813/);
    const forwarded = new Api.Message({ id: 3, date: 0, message: LOGIN_TEXT, peerId: new Api.PeerUser({ userId: bigInt(42) }), fwdFrom: new Api.MessageFwdHeader({ date: 0, fromId: new Api.PeerUser({ userId: SERVICE }) }) });
    expect(messageText(forwarded)).not.toMatch(/52813/);
    // A message from anyone else keeps its numbers
    const other = new Api.Message({ id: 4, date: 0, message: 'Order 52813 shipped', peerId: new Api.PeerUser({ userId: bigInt(42) }) });
    expect(messageText(other)).toBe('Order 52813 shipped');
    delete process.env.TG_MCP;
    process.env.TG_READ_ONLY = '1';
    expect(messageText(serviceMessage(LOGIN_TEXT))).not.toMatch(/52813/);
    inTerminal();
    expect(messageText(serviceMessage(LOGIN_TEXT))).toBe(LOGIN_TEXT);
  });

  it('curated: read/get/search (toMessageInfo) and the chats/inbox preview (getDialogs) are masked', async () => {
    overMcp();
    const telegram = new Api.User({ id: SERVICE, firstName: 'Telegram' });
    const client = {
      getEntity: async () => telegram,
      getDialogs: async () => [{ id: SERVICE, title: 'Telegram', isUser: true, entity: telegram, unreadCount: 1, message: serviceMessage(WEB_TEXT) }],
    } as never;
    const info = await toMessageInfo(client, serviceMessage(LOGIN_TEXT));
    expect(info.text).not.toMatch(/52813/);
    expect(info.text).toMatch(/Do not give this code/);
    const [chat] = await getDialogs(client, 10);
    expect(chat.lastMessage).not.toMatch(/EeKyAb7Qe0M/);
    expect(chat.lastMessage).toMatch(/This is your login code/);
  });

  it('raw: a history page (TL objects and JSON) and a short update are masked over MCP', () => {
    const page = {
      messages: [
        serviceMessage(LOGIN_TEXT),
        { _: 'message', id: 9, message: RU_TEXT, peerId: { _: 'peerUser', userId: 777000 } },
        new Api.Message({ id: 10, date: 0, message: 'Order 52813 shipped', peerId: new Api.PeerUser({ userId: bigInt(42) }) }),
      ],
      updates: [new Api.UpdateShortMessage({ id: 11, userId: SERVICE, message: LOGIN_TEXT, pts: 1, ptsCount: 1, date: 0 })],
    };
    overMcp();
    const j = JSON.parse(serializeApiResult(page));
    expect(j.messages[0].message).toBe('Login code: [login code hidden]. Do not give this code to anyone, even if they say they are from Telegram!');
    expect(j.messages[0].peerId.userId).toBe('777000');
    expect(j.messages[1].message).toMatch(/^Код для входа в Telegram: \[login code hidden\]\./);
    expect(j.messages[2].message).toBe('Order 52813 shipped');
    expect(j.updates[0].message).not.toMatch(/52813/);
    inTerminal();
    expect(serializeApiResult(page).match(/52813/g)).toHaveLength(4);
  });

  it('raw: the texts of a rich service message are masked too', () => {
    const msg = new Api.Message({
      id: 1, date: 0, message: '', peerId: new Api.PeerUser({ userId: SERVICE }),
      richMessage: { _: 'richMessage', blocks: [{ _: 'pageBlockParagraph', text: { _: 'textPlain', text: 'Login code: 52813' } }] },
    } as never);
    process.env.TG_READ_ONLY = '1';
    const out = serializeApiResult({ messages: [msg] });
    expect(out).not.toMatch(/52813/);
    expect(out).toMatch(/Login code: \[login code hidden\]/);
  });
});

describe('venue IDs and gift-code slugs in a raw result', () => {
  const venue = () => new Api.MessageMediaVenue({
    geo: new Api.GeoPoint({ lat: 1, long: 2, accessHash: bigInt(0) }), title: 'Cafe', address: 'Main St 1',
    provider: 'foursquare', venueId: '4b5c1f2af964a520', venueType: 'food/cafe',
  });
  const gift = () => new Api.MessageService({
    id: 7, date: 0, peerId: new Api.PeerUser({ userId: bigInt(42) }),
    action: new Api.MessageActionGiftCode({ days: 90, slug: 'aBcDeFgHiJ', unclaimed: true }),
  });
  const inputVenue = { _: 'inputMediaVenue', title: 'Cafe', provider: 'gplaces', venueId: 'ChIJxyz', venueType: '', address: 'x', geoPoint: { _: 'inputGeoPointEmpty' } };

  it('over MCP: venueId and provider of a venue and the slug of a gift code are "[redacted]"', () => {
    overMcp();
    const j = JSON.parse(serializeApiResult({ media: venue(), input: inputVenue, messages: [gift()] }));
    expect(j.media).toMatchObject({ title: 'Cafe', venueType: 'food/cafe', venueId: '[redacted]', provider: '[redacted]' });
    expect(j.input).toMatchObject({ venueId: '[redacted]', provider: '[redacted]' });
    expect(j.messages[0].action).toMatchObject({ days: 90, slug: '[redacted]' });
    // A giveaway result and a boost carry the gift code's slug under other names
    const more = JSON.parse(serializeApiResult({ r: { _: 'payments.giveawayInfoResults', giftCodeSlug: 'gGgGgG' }, b: { _: 'boost', usedGiftSlug: 'uUuUuU' } }));
    expect(more).toEqual({ r: { _: 'payments.giveawayInfoResults', giftCodeSlug: '[redacted]' }, b: { _: 'boost', usedGiftSlug: '[redacted]' } });
    // Other constructors keep a field of the same name
    const other = JSON.parse(serializeApiResult({ theme: { _: 'theme', slug: 'night' }, inv: { _: 'invoice', provider: 'x' } }));
    expect(other).toEqual({ theme: { _: 'theme', slug: 'night' }, inv: { _: 'invoice', provider: 'x' } });
  });

  it('in a terminal they stay', () => {
    inTerminal();
    const out = serializeApiResult({ media: venue(), messages: [gift()] });
    expect(out).toMatch(/4b5c1f2af964a520/);
    expect(out).toMatch(/foursquare/);
    expect(out).toMatch(/aBcDeFgHiJ/);
  });
});

describe('forwarding over MCP', () => {
  it('messages.ForwardMessages is off the raw allowlist', () => {
    expect(isMcpApiAllowed('messages.ForwardMessages')).toBe(false);
    overMcp();
    expect(mcpApiAllowlistRefusal('messages.ForwardMessages')).toMatch(/not available over MCP/);
    expect(classifyCall(['api', 'messages.ForwardMessages', '-p{"fromPeer":"@a","toPeer":"@c","id":[1]}']).group).toBe('never');
    expect(classifyCall(['messages', 'forward-messages', '--from-peer', '@a', '--to-peer', '@c', '--id', '1']).group).toBe('never');
  });

  const me = new Api.User({ id: bigInt(1), firstName: 'Me', self: true });
  const bob = new Api.User({ id: bigInt(2), firstName: 'Bob', username: 'bob' });
  const withMedia = (id: number, media?: Api.TypeMessageMedia) => new Api.Message({ id, date: 0, message: '', peerId: new Api.PeerUser({ userId: bigInt(1) }), media });
  const fakeClient = (sources: Api.Message[]) => {
    const forward = vi.fn(async () => []);
    const getMessages = vi.fn(async () => sources);
    const client = { getMe: async () => me, getEntity: async () => bob, getMessages, forwardMessages: forward } as never;
    return { client, forward, getMessages };
  };
  const contact = new Api.MessageMediaContact({ phoneNumber: '15550000009', firstName: 'Bob', lastName: '', vcard: '', userId: bigInt(0) });
  const geo = new Api.MessageMediaGeo({ geo: new Api.GeoPoint({ lat: 1, long: 2, accessHash: bigInt(0) }) });
  const live = new Api.MessageMediaGeoLive({ geo: new Api.GeoPoint({ lat: 1, long: 2, accessHash: bigInt(0) }), period: 900 });
  const venue = new Api.MessageMediaVenue({ geo: new Api.GeoPoint({ lat: 1, long: 2, accessHash: bigInt(0) }), title: 'Cafe', address: 'x', provider: 'p', venueId: 'v', venueType: '' });

  it.each([['a contact card', contact], ['a geo point', geo], ['a live location', live], ['a venue', venue]])('the curated forward refuses %s and sends nothing', async (_what, media) => {
    overMcp();
    const { client, forward, getMessages } = fakeClient([withMedia(1), withMedia(2, media)]);
    await expect(forwardMessages(client, 'me', [1, 2], '@bob')).rejects.toThrow(/Refused over MCP: message 2 holds a contact card or a location/);
    expect(getMessages).toHaveBeenCalledWith(me, { ids: [1, 2] });
    expect(forward).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing message', [withMedia(1), undefined]],
    ['a short answer', [withMedia(1)]],
    ['a different message in its place', [withMedia(1), withMedia(7)]],
  ])('the curated forward fails closed on %s', async (_what, sources) => {
    overMcp();
    const { client, forward } = fakeClient(sources as Api.Message[]);
    await expect(forwardMessages(client, 'me', [1, 2], '@bob')).rejects.toThrow(/message 2 was not found or cannot be checked/);
    expect(forward).not.toHaveBeenCalled();
  });

  it('the curated forward refuses a login-service message and a rich message with a map block', async () => {
    overMcp();
    const login = fakeClient([serviceMessage(LOGIN_TEXT, 1)]);
    await expect(forwardMessages(login.client, 'me', [1], '@bob')).rejects.toThrow(/login-code service account \(777000 or 489000\)/);
    expect(login.forward).not.toHaveBeenCalled();
    const map = new Api.Message({
      id: 1, date: 0, message: '', peerId: new Api.PeerUser({ userId: bigInt(1) }),
      richMessage: { _: 'richMessage', blocks: [{ _: 'pageBlockMap', geo: { _: 'geoPoint', lat: 1, long: 2, accessHash: '0' }, zoom: 1, w: 1, h: 1 }] },
    } as never);
    const rich = fakeClient([map]);
    await expect(forwardMessages(rich.client, 'me', [1], '@bob')).rejects.toThrow(/contact card or a location/);
    expect(rich.forward).not.toHaveBeenCalled();
  });

  it('the curated forward sends text and photos over MCP, and anything in a terminal', async () => {
    overMcp();
    const photo = new Api.MessageMediaPhoto({ photo: new Api.PhotoEmpty({ id: bigInt(1) }) });
    const ok = fakeClient([withMedia(1), withMedia(2, photo)]);
    await expect(forwardMessages(ok.client, 'me', [1, 2], '@bob')).resolves.toMatchObject({ count: 2 });
    expect(ok.forward).toHaveBeenCalledTimes(1);
    inTerminal();
    const t = fakeClient([withMedia(1, contact)]);
    await forwardMessages(t.client, 'me', [1], '@bob');
    expect(t.getMessages).not.toHaveBeenCalled();
    expect(t.forward).toHaveBeenCalledTimes(1);
  });
});

describe('input media over MCP: only the safe types', () => {
  it('passes uploaded and existing photos and documents, polls and dice, as JSON and as TL objects', () => {
    overMcp();
    const ok = [
      { _: 'inputMediaUploadedPhoto', file: { _: 'inputFile', id: '1', parts: 1, name: 'a.jpg', md5Checksum: '' } },
      { _: 'inputMediaUploadedDocument', file: { _: 'inputFile', id: '1', parts: 1, name: 'a.pdf', md5Checksum: '' }, mimeType: 'application/pdf', attributes: [] },
      { _: 'InputMediaPhoto', id: { _: 'inputPhoto', id: '1', accessHash: '1', fileReference: { _base64: '' } } },
      { _: 'inputMediaDocument', id: { _: 'inputDocument', id: '1', accessHash: '1', fileReference: { _base64: '' } } },
      { _: 'inputMediaPoll', poll: { _: 'poll', id: '1', question: { _: 'textWithEntities', text: 'q', entities: [] }, answers: [] } },
      { _: 'inputMediaDice', emoticon: '🎲' },
      new Api.InputMediaPhoto({ id: new Api.InputPhotoEmpty() }),
    ];
    for (const media of ok) expect(mcpParamRefusal('messages.SendMedia', { peer: '@c', message: '', media }), JSON.stringify(media)).toBeNull();
    expect(mcpParamRefusal('messages.EditMessage', { peer: '@c', id: 1, message: 'x' })).toBeNull();
  });

  it('refuses a built MessageMedia* object, a Message, a string and a nested unsafe media', () => {
    overMcp();
    const contact = new Api.MessageMediaContact({ phoneNumber: '15550000009', firstName: 'Bob', lastName: '', vcard: '', userId: bigInt(0) });
    expect(mcpParamRefusal('messages.SendMedia', { media: contact })).toMatch(/MessageMediaContact is not a media type MCP sends/);
    expect(mcpParamRefusal('messages.SendMedia', { media: { _: 'message', id: 1, media: contact } })).toMatch(/message is not a media type/);
    expect(mcpParamRefusal('messages.SendMedia', { media: 'photo.jpg' })).toMatch(/a string in "media"/);
    const poll = { _: 'inputMediaPoll', poll: { _: 'poll' }, solutionMedia: { _: 'inputMediaDocumentExternal', url: 'https://x' } };
    expect(mcpParamRefusal('messages.SendMedia', { media: poll })).toMatch(/inputMediaDocumentExternal/);
    inTerminal();
    expect(mcpParamRefusal('messages.SendMedia', { media: contact })).toBeNull();
  });
});

describe('end to end on a mock account with a login code from 777000', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-login-code-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const state = join(dir, 'state.json');
  const world = seedWorld();
  world.users.push({ id: 777000, firstName: 'Telegram', username: undefined } as never);
  world.chats.push({ id: 777000, kind: 'user', unread: 1, messages: [{ id: 1, ago: 60, text: LOGIN_TEXT }] } as never);
  writeFileSync(state, JSON.stringify(world));
  const run = (args: string[], extra: Record<string, string> = {}) => spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: 'utf8',
    env: { ...process.env, TG_MOCK: state, TG_PROFILE: `mcp-login-code-${process.pid}`, TG_NO_UPDATE_CHECK: '1', TG_MCP: '1', TG_READ_ONLY: '1', ...extra },
  });

  it.each([
    ['read', ['read', '777000', '--json']],
    ['read --full', ['read', '777000', '--full', '--json']],
    ['read (text)', ['read', '777000']],
    ['get', ['get', '777000', '1', '--json']],
    ['search', ['search', 'Login', '--chat', '777000', '--json']],
    ['chats', ['chats', '--json']],
    ['inbox', ['inbox', '--json']],
  ])('%s over MCP never prints the code', (_what, args) => {
    const r = run(args);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).not.toMatch(/52813/);
    expect(r.stdout).toMatch(/login code hidden/);
  });

  it('a terminal still shows it', () => {
    const r = run(['read', '777000', '--json'], { TG_MCP: '', TG_READ_ONLY: '' });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/52813/);
  });
});

describe('click --data over MCP finds only what the model was shown', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-click-data-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const state = join(dir, 'state.json');
  const world = seedWorld();
  world.users.push({ id: 777000, firstName: 'Telegram', username: undefined } as never);
  world.chats.push({ id: 777000, kind: 'user', unread: 1, messages: [
    { id: 1, ago: 60, text: LOGIN_TEXT, buttons: [[{ text: 'Confirm', data: '52813', answer: 'ok' }]] },
  ] } as never);
  writeFileSync(state, JSON.stringify(world));
  const run = (args: string[]) => spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: 'utf8',
    env: { ...process.env, TG_MOCK: state, TG_MOCK_ASK: '1', TG_PROFILE: `mcp-click-data-${process.pid}`, TG_NO_UPDATE_CHECK: '1', TG_MCP: '1', TG_READ_ONLY: '' },
  });
  const b64 = (s: string) => Buffer.from(s).toString('base64');

  it('a guess of a hidden callback gets the same answer as any value that does not match', () => {
    const right = run(['click', '777000', '1', '--data', b64('52813'), '--json']);
    const wrong = run(['click', '777000', '1', '--data', b64('11111'), '--json']);
    expect(right.status).toBe(wrong.status);
    const same = (r: { stdout: string; stderr: string }, guess: string) => (r.stdout + r.stderr).replaceAll(b64(guess), '<guess>');
    expect(same(right, '52813')).toBe(same(wrong, '11111'));
    expect(right.stdout + right.stderr).not.toMatch(/approval|TG_APPROVE/i);
  });
});

// Round 3: the threat model is credentials and redeemable value. Login codes come from 777000 and
// 489000 and are hidden wherever a service message's content reaches output; gift links are masked
// on every MCP output by shape.
describe('login codes in every part of a service message', () => {
  const VERIFY = bigInt(489000);
  const code = '52813';
  const richService = (userId = SERVICE) => new Api.Message({
    id: 5, date: 0, message: LOGIN_TEXT, peerId: new Api.PeerUser({ userId }),
    entities: [new Api.MessageEntityTextUrl({ offset: 0, length: 5, url: `https://example.com/login?code=${code}` })],
    replyMarkup: new Api.ReplyInlineMarkup({
      rows: [new Api.KeyboardButtonRow({
        buttons: [
          new Api.KeyboardInlineButton({ text: `Copy ${code}`, type: new Api.InlineButtonTypeCopy({ copyText: code }) }),
          new Api.KeyboardInlineButton({ text: 'Open', type: new Api.InlineButtonTypeUrl({ url: `https://t.me/login/${code}` }) }),
          new Api.KeyboardInlineButton({ text: 'Confirm', type: new Api.InlineButtonTypeCallback({ data: Buffer.from(`ok:${code}`) }) }),
        ],
      })],
    }),
    replyTo: new Api.MessageReplyHeader({ replyToMsgId: 4, quoteText: `Your code: ${code}` }),
    media: new Api.MessageMediaWebPage({
      webpage: new Api.WebPage({ id: bigInt(1), url: `https://my.telegram.org/auth?code=${code}`, displayUrl: 'my.telegram.org', hash: 0, description: `Code ${code}` }),
    }),
  } as never);

  it('raw: entity URLs, buttons (copy text, URL, callback data), the quote and the preview are masked; IDs stay', () => {
    overMcp();
    const out = serializeApiResult({ messages: [richService(), richService(VERIFY)] });
    expect(out).not.toMatch(new RegExp(code));
    expect(out).not.toMatch(new RegExp(Buffer.from(`ok:${code}`).toString('base64')));
    const j = JSON.parse(out);
    expect(j.messages[0].peerId.userId).toBe('777000');
    expect(j.messages[1].peerId.userId).toBe('489000');
    expect(j.messages[0].id).toBe(5);
    expect(j.messages[0].replyMarkup.rows[0].buttons[0].type.copyText).toBe('[login code hidden]');
    expect(j.messages[0].replyMarkup.rows[0].buttons[2].type.data).toBe('[login code hidden]');
    expect(j.messages[0].replyTo.quoteText).toBe('Your code: [login code hidden]');
    inTerminal();
    expect(serializeApiResult({ messages: [richService()] })).toMatch(new RegExp(code));
  });

  it('a copy button of a service message is hidden whole, even a code without digits', async () => {
    const letters = new Api.Message({
      id: 6, date: 0, message: 'Your code is below', peerId: new Api.PeerUser({ userId: VERIFY }),
      replyMarkup: new Api.ReplyInlineMarkup({
        rows: [new Api.KeyboardButtonRow({ buttons: [new Api.KeyboardInlineButton({ text: 'Copy', type: new Api.InlineButtonTypeCopy({ copyText: 'EeKyAbQeXM' }) })] })],
      }),
    });
    overMcp();
    expect(serializeApiResult({ messages: [letters] })).not.toMatch(/EeKyAbQeXM/);
    const client = { getEntity: async () => new Api.User({ id: VERIFY, firstName: 'Verification Codes' }) } as never;
    expect(JSON.stringify(await toMessageInfo(client, letters))).not.toMatch(/EeKyAbQeXM/);
  });

  it('raw: a JSON-form message and a short update from 489000 are masked', () => {
    process.env.TG_READ_ONLY = '1';
    const out = serializeApiResult({
      messages: [{ _: 'message', id: 1, message: `Your code: ${code}`, peerId: { _: 'peerUser', userId: '489000' }, entities: [{ _: 'messageEntityTextUrl', url: `https://x.io/${code}` }] }],
      updates: [new Api.UpdateShortMessage({ id: 2, userId: VERIFY, message: LOGIN_TEXT, pts: 1, ptsCount: 1, date: 0 })],
    });
    expect(out).not.toMatch(new RegExp(code));
    expect(JSON.parse(out).messages[0].peerId.userId).toBe('489000');
  });

  it('raw: a quote of a service message in another chat is masked', () => {
    overMcp();
    const quoting = new Api.Message({
      id: 3, date: 0, message: 'look', peerId: new Api.PeerUser({ userId: bigInt(42) }),
      replyTo: new Api.MessageReplyHeader({ replyToMsgId: 1, replyToPeerId: new Api.PeerUser({ userId: SERVICE }), quoteText: `Login code: ${code}` }),
    });
    expect(serializeApiResult({ messages: [quoting] })).not.toMatch(new RegExp(code));
  });

  it('curated: text, buttons and --full (quote, link preview) of 777000 and 489000 are masked; a terminal keeps them', async () => {
    overMcp();
    const client = { getEntity: async () => new Api.User({ id: SERVICE, firstName: 'Telegram' }) } as never;
    for (const userId of [SERVICE, VERIFY]) {
      const info = await toMessageInfo(client, richService(userId), { full: true });
      const out = JSON.stringify(info);
      expect(out).not.toMatch(new RegExp(code));
      expect(out).not.toMatch(new RegExp(Buffer.from(`ok:${code}`).toString('base64')));
      expect(info.buttons!.rows[0][0]).toMatchObject({ type: 'copy', copyText: '[login code hidden]', text: 'Copy [login code hidden]' });
      expect(info.full!.replyTo!.quoteText).toBe('Your code: [login code hidden]');
      expect(info.full!.media).toMatchObject({ type: 'webpage', url: expect.stringContaining('[login code hidden]') });
    }
    // A quote of a service message from another chat
    const quoting = new Api.Message({
      id: 3, date: 0, message: 'look', peerId: new Api.PeerUser({ userId: bigInt(42) }),
      replyTo: new Api.MessageReplyHeader({ replyToMsgId: 1, replyToPeerId: new Api.PeerUser({ userId: VERIFY }), quoteText: `Code: ${code}` }),
    });
    expect((await toMessageInfo(client, quoting, { full: true })).full!.replyTo!.quoteText).toBe('Code: [login code hidden]');
    inTerminal();
    expect(JSON.stringify(await toMessageInfo(client, richService(), { full: true }))).toMatch(new RegExp(code));
  });

  it('curated: clicking a copy or URL button of a service message does not reveal the code', async () => {
    overMcp();
    const msg = richService();
    const client = {
      getEntity: async () => new Api.User({ id: SERVICE, firstName: 'Telegram', username: 'telegram_svc' }),
      getMessages: async () => [msg],
    } as never;
    const copy = await clickButton(client, '@telegram_svc', 5, { index: 1 }, { waitMs: 0 });
    expect(copy.action).toBe('copy');
    expect(JSON.stringify(copy)).not.toMatch(new RegExp(code));
    const url = await clickButton(client, '@telegram_svc', 5, { index: 2 }, { waitMs: 0 });
    expect(url.action).toBe('url');
    expect(JSON.stringify(url)).not.toMatch(new RegExp(code));
  });

  it('forward refuses a message from 489000 too', async () => {
    overMcp();
    const me = new Api.User({ id: bigInt(1), firstName: 'Me', self: true });
    const forward = vi.fn(async () => []);
    const client = {
      getMe: async () => me, getEntity: async () => me, forwardMessages: forward,
      getMessages: async () => [new Api.Message({ id: 1, date: 0, message: `Code ${code}`, peerId: new Api.PeerUser({ userId: VERIFY }) })],
    } as never;
    await expect(forwardMessages(client, 'me', [1], '@bob')).rejects.toThrow(/may hold a login code/);
    expect(forward).not.toHaveBeenCalled();
  });
});

describe('gift-code links on every MCP output', () => {
  const LINKS = 'Gift for you: https://t.me/giftcode/AbC123xyz, telegram.me/giftcode/QwE_rty-1 and tg://giftcode?slug=ZxC987. Also t.me/durov.';

  it('maskGiftCodes hides the slug of every form and keeps other links', () => {
    const out = maskGiftCodes(LINKS);
    expect(out).not.toMatch(/AbC123xyz|QwE_rty-1|ZxC987/);
    expect(out).toBe('Gift for you: https://t.me/giftcode/[gift code hidden], telegram.me/giftcode/[gift code hidden] and tg://giftcode?slug=[gift code hidden]. Also t.me/durov.');
    expect(maskGiftCodes('{"url":"tg://giftcode?ref=1&slug=Hh7"}')).toBe('{"url":"tg://giftcode?ref=1&slug=[gift code hidden]"}');
  });

  it('the MCP tool result masks them in output and in errors', () => {
    expect(mcpToolResult(0, false, JSON.stringify({ text: LINKS, url: 'https://t.me/giftcode/AbC123xyz' }), '').content[0].text).not.toMatch(/AbC123xyz|QwE_rty-1|ZxC987/);
    expect(mcpToolResult(1, false, '', `Error: ${LINKS}`).content[0].text).not.toMatch(/AbC123xyz/);
    expect(mcpToolResult(null, true, LINKS, '').content[0].text).not.toMatch(/ZxC987/);
  });

  const giftMessage = () => new Api.Message({
    id: 8, date: 0, message: 'Here: t.me/giftcode/AbC123xyz', peerId: new Api.PeerUser({ userId: bigInt(42) }),
    entities: [new Api.MessageEntityTextUrl({ offset: 0, length: 4, url: 'https://t.me/giftcode/QwE_rty-1' })],
    replyMarkup: new Api.ReplyInlineMarkup({
      rows: [new Api.KeyboardButtonRow({ buttons: [new Api.KeyboardInlineButton({ text: 'Claim', type: new Api.InlineButtonTypeUrl({ url: 'tg://giftcode?slug=ZxC987' }) })] })],
    }),
    media: new Api.MessageMediaWebPage({ webpage: new Api.WebPage({ id: bigInt(1), url: 'https://t.me/giftcode/AbC123xyz', displayUrl: 't.me/giftcode/AbC123xyz', hash: 0 }) }),
  } as never);

  it('raw and curated output of an ordinary message masks them over MCP and keeps them in a terminal', async () => {
    const client = { getEntity: async () => new Api.User({ id: bigInt(42), firstName: 'Ann' }) } as never;
    process.env.TG_READ_ONLY = '1';
    for (const out of [serializeApiResult({ messages: [giftMessage()] }), JSON.stringify(await toMessageInfo(client, giftMessage(), { full: true }))]) {
      expect(out).not.toMatch(/AbC123xyz|QwE_rty-1|ZxC987/);
      expect(out).toMatch(/gift code hidden/);
    }
    const info = await toMessageInfo(client, giftMessage(), { full: true });
    expect(info.buttons!.rows[0][0]).toMatchObject({ type: 'url', url: 'tg://giftcode?slug=[gift code hidden]' });
    expect(info.full!.media).toMatchObject({ url: 'https://t.me/giftcode/[gift code hidden]' });
    inTerminal();
    expect(serializeApiResult({ messages: [giftMessage()] })).toMatch(/AbC123xyz/);
    expect(JSON.stringify(await toMessageInfo(client, giftMessage(), { full: true }))).toMatch(/ZxC987/);
  });

  describe('end to end on a mock account', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-gift-code-'));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));
    const state = join(dir, 'state.json');
    const world = seedWorld();
    world.users.push({ id: 4242, firstName: 'Gifter', username: 'gifter' } as never);
    world.chats.push({ id: 4242, kind: 'user', unread: 1, messages: [{ id: 1, ago: 60, text: LINKS }] } as never);
    writeFileSync(state, JSON.stringify(world));
    const run = (args: string[], extra: Record<string, string> = {}) => spawnSync(process.execPath, [...cliArgs(), ...args], {
      encoding: 'utf8',
      env: { ...process.env, TG_MOCK: state, TG_PROFILE: `mcp-gift-code-${process.pid}`, TG_NO_UPDATE_CHECK: '1', TG_MCP: '1', TG_READ_ONLY: '1', ...extra },
    });

    it.each([
      ['read', ['read', '4242', '--json']],
      ['read --full', ['read', '4242', '--full', '--json']],
      ['read (text)', ['read', '4242']],
      ['search', ['search', 'Gift', '--json']],
      ['chats', ['chats', '--json']],
    ])('%s over MCP never prints a gift slug; a terminal does', (_what, args) => {
      const r = run(args);
      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout).not.toMatch(/AbC123xyz|QwE_rty-1|ZxC987/);
      expect(r.stdout).toMatch(/gift code hidden/);
      const terminal = run(args, { TG_MCP: '', TG_READ_ONLY: '' });
      expect(terminal.status, terminal.stderr).toBe(0);
      expect(terminal.stdout).toMatch(/AbC123xyz/);
      // The server's own mask is a backstop on whatever the CLI prints
      expect(mcpToolResult(0, false, terminal.stdout, '').content[0].text).not.toMatch(/AbC123xyz|QwE_rty-1|ZxC987/);
    });
  });
});
