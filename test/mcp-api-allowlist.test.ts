import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Write mode "on" for the in-process runs: the guard lets every write through, so only a refusal
// can stop a call before the (mocked) client is reached.
const assertWriteEnabled = vi.hoisted(() => vi.fn());
const getClient = vi.hoisted(() => vi.fn(async () => ({})));
const invokeApi = vi.hoisted(() => vi.fn(async (_client: unknown, _method: string, _params?: unknown) => true));
vi.mock('../src/guard.js', async orig => ({ ...(await orig<typeof import('../src/guard.js')>()), assertWriteEnabled }));
vi.mock('../src/client.js', async orig => ({
  ...(await orig<typeof import('../src/client.js')>()),
  getClient,
  invokeApi,
  disconnectClient: async () => {},
}));
vi.mock('../src/audit.js', () => ({ auditLog: () => {} }));

import { MCP_API_ALLOWLIST, isMcpApiAllowed, mcpApiAllowlistRefusal } from '../src/mcp-api-allowlist.js';
import { apiRefusalReason, isApiReadMethod, resolveApiMethod } from '../src/api-methods.js';
import { TL_METHODS } from '../src/generated/tl-commands.js';
import { classifyCall, planCall } from '../src/mcp.js';
import { apiCommand } from '../src/commands/api.js';
import { buildLeaf } from '../src/commands/generated.js';
import { cliArgs } from './cli.js';

const ALLOWED = MCP_API_ALLOWLIST.flatMap(g => g.methods);
/** className → [namespaceKebab, methodKebab] of its generated command. */
const GENERATED = new Map(TL_METHODS.map(([ns, method, className]) => [className, [ns, method] as const]));
/** The argv of the generated command for a TL method (`["messages","get-history"]`, `["ping"]`). */
const generatedArgs = (className: string): string[] => {
  const [ns, method] = GENERATED.get(className)!;
  return ns ? [ns, method] : [method];
};

describe('the MCP allowlist data', () => {
  it('names only real TL schema methods, spelled as the schema spells them', () => {
    for (const m of ALLOWED) {
      expect(GENERATED.has(m), m).toBe(true);
      expect(resolveApiMethod(m).className, m).toBe(m);
    }
    expect(new Set(ALLOWED).size, 'no duplicates').toBe(ALLOWED.length);
  });

  it('puts each method in the group that matches its read/write classification', () => {
    for (const g of MCP_API_ALLOWLIST) {
      for (const m of g.methods) expect(isApiReadMethod(m) ? 'read' : 'write', `${g.title}: ${m}`).toBe(g.access);
    }
  });

  it('holds no denylisted method, wrapper or auth.* method', () => {
    for (const m of ALLOWED) expect(apiRefusalReason(m), m).toBeNull();
    expect(ALLOWED.filter(m => !m.includes('.') || m.startsWith('auth.'))).toEqual([]);
  });

  it('gives every group a title and a one-line reason that the doc generator can read', () => {
    for (const g of MCP_API_ALLOWLIST) {
      expect(g.title).toMatch(/\S/);
      expect(g.reason).toMatch(/\S/);
      expect(g.reason).not.toMatch(/[\n']/);
      expect(g.methods.length).toBeGreaterThan(0);
    }
    // scripts/api-coverage.mjs parses this file as text; it must see exactly the same groups
    const r = spawnSync(process.execPath, ['scripts/api-coverage.mjs', '--allowlist-json'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual(MCP_API_ALLOWLIST.map(g => ({ ...g, methods: [...g.methods] })));
  });

  it('is case-insensitive like the method resolver', () => {
    expect(isMcpApiAllowed('MESSAGES.gethistory')).toBe(true);
    expect(isMcpApiAllowed('account.GetPasskeys')).toBe(false);
  });
});

/** One or more dangerous methods per category that is deliberately off the list. */
const DANGEROUS: [string, string][] = [
  ['payments', 'payments.GetStarsStatus'],
  ['payments', 'payments.SendStarsForm'],
  ['Stars', 'payments.GetStarsTransactions'],
  ['account', 'account.UpdateProfile'],
  ['auth', 'auth.ExportAuthorization'],
  ['Passport', 'account.GetAllSecureValues'],
  ['Passport', 'users.SetSecureValueErrors'],
  ['passkeys', 'account.GetPasskeys'],
  ['privacy', 'account.GetPrivacy'],
  ['security settings', 'account.GetGlobalPrivacySettings'],
  ['sessions', 'account.GetAuthorizations'],
  ['sessions', 'account.GetWebAuthorizations'],
  ['takeout', 'account.InitTakeoutSession'],
  ['takeout', 'messages.GetSplitRanges'],
  ['phone calls', 'phone.RequestCall'],
  ['phone calls', 'phone.GetCallConfig'],
  ['sticker sets', 'stickers.CreateStickerSet'],
  ['sticker sets', 'messages.InstallStickerSet'],
  ['business', 'account.UpdateBusinessWorkHours'],
  ['premium', 'premium.GetBoostsStatus'],
  ['premium', 'payments.GetPremiumGiftCodeOptions'],
  ['geo', 'contacts.GetLocated'],
  ['geo', 'messages.GetRecentLocations'],
  ['bots admin', 'bots.SetBotCommands'],
  ['bots admin', 'bots.ExportBotToken'],
  ['folders', 'messages.UpdateDialogFilter'],
  ['folders', 'folders.EditPeerFolders'],
  ['folders', 'chatlists.ExportChatlistInvite'],
  ['import', 'messages.InitHistoryImport'],
  ['import', 'messages.StartHistoryImport'],
  ['export', 'contacts.ExportContactToken'],
  ['plumbing', 'help.GetConfig'],
  ['plumbing', 'upload.GetFile'],
  ['plumbing', 'Ping'],
  // Removed after review: profiles, chat internals, invite links, who read what, blocked list
  ['sensitive reads', 'users.GetFullUser'],
  ['sensitive reads', 'channels.GetFullChannel'],
  ['sensitive reads', 'messages.GetFullChat'],
  ['sensitive reads', 'channels.GetAdminLog'],
  ['sensitive reads', 'messages.GetExportedChatInvites'],
  ['sensitive reads', 'messages.GetExportedChatInvite'],
  ['sensitive reads', 'messages.GetChatInviteImporters'],
  ['sensitive reads', 'channels.GetMessageAuthor'],
  ['sensitive reads', 'contacts.GetBlocked'],
  ['sensitive reads', 'contacts.GetStatuses'],
  ['sensitive reads', 'messages.GetMessageReadParticipants'],
  ['sensitive reads', 'messages.GetOutboxReadDate'],
  // An inline result is sent by ID, so its geo or contact content cannot be checked
  ['inline result', 'messages.SendInlineBotResult'],
  // Adding a contact widens who sees the phone number; the curated add-contact stays
  ['phone visibility', 'contacts.AddContact'],
];

describe('over MCP, a method off the allowlist never runs', () => {
  it('the sample covers real methods that are all off the list', () => {
    for (const [, m] of DANGEROUS) {
      expect(GENERATED.has(m), m).toBe(true);
      expect(isMcpApiAllowed(m), m).toBe(false);
    }
  });

  it.each(DANGEROUS)('%s: %s is "never" in the classifier, in both forms, on both tools', (_cat, m) => {
    // The denylist message wins when there is one; otherwise the allowlist message
    const reason = apiRefusalReason(m) ? /^Refused/ : /not available over MCP; run it in a terminal/;
    for (const args of [['api', m], ['api', m, '--params', '{}'], generatedArgs(m)]) {
      const c = classifyCall(args);
      expect(c.group, args.join(' ')).toBe('never');
      expect('reason' in c && c.reason, args.join(' ')).toMatch(reason);
      for (const tool of ['telegram_read', 'telegram_write'] as const) {
        expect(planCall(tool, { args }), `${tool} ${args.join(' ')}`).toMatch(reason);
      }
    }
  });

  it('a pure help request still prints help for any method', () => {
    expect(classifyCall(['account', 'get-passkeys', '--help'])).toMatchObject({ group: 'read', help: true });
    expect(classifyCall(['api', '--help'])).toMatchObject({ group: 'read', help: true });
  });
});

/** Allowed reads and writes in both forms, with params a run needs. */
const ALLOWED_READS: [string, Record<string, unknown>, string[]][] = [
  ['messages.GetHistory', { peer: '@c', limit: 5 }, ['--peer', '@c', '--limit', '5']],
  ['users.GetUsers', { id: ['me'] }, ['--id', 'me']],
  ['messages.GetMessagesViews', { peer: '@c', id: [1], increment: false }, ['--peer', '@c', '--id', '1', '--increment', 'false']],
  ['messages.GetCustomEmojiDocuments', { documentId: ['1'] }, ['--document-id', '1']],
  ['contacts.ResolveUsername', { username: 'x' }, ['--username', 'x']],
  ['messages.GetForumTopics', { peer: '@c', limit: 5 }, ['--peer', '@c', '--limit', '5']],
];
const ALLOWED_WRITES: [string, Record<string, unknown>, string[]][] = [
  ['messages.SendMessage', { peer: '@c', message: 'hi' }, ['--peer', '@c', '--message', 'hi']],
  ['messages.SendReaction', { peer: '@c', msgId: 1 }, ['--peer', '@c', '--msg-id', '1']],
  ['messages.ReadHistory', { peer: '@c' }, ['--peer', '@c']],
  ['messages.SendVote', { peer: '@c', msgId: 1, options: [{ _base64: 'MA==' }] }, ['--peer', '@c', '--msg-id', '1', '--json-params', '{"options":[{"_base64":"MA=="}]}']],
];

describe('allowed methods still classify by read/write', () => {
  it.each(ALLOWED_READS)('%s is a read in both forms', m => {
    for (const args of [['api', m], generatedArgs(m)]) {
      expect(classifyCall(args), args.join(' ')).toMatchObject({ group: 'read' });
      expect(planCall('telegram_read', { args })).toMatchObject({ readOnly: true });
    }
  });
  it.each(ALLOWED_WRITES)('%s is a write in both forms', m => {
    for (const args of [['api', m], generatedArgs(m)]) {
      expect(classifyCall(args), args.join(' ')).toMatchObject({ group: 'write' });
      expect(planCall('telegram_write', { args })).toMatchObject({ readOnly: false });
      expect(planCall('telegram_read', { args })).toMatch(/use telegram_write/);
    }
  });
  it('the param checks stay as a second layer on an allowed method', () => {
    expect(classifyCall(['api', 'messages.SendMessage', '--params', '{"peer":"@c","message":"x","allowPaidStars":5}']).group).toBe('never');
  });
});

describe('the CLI refuses an off-list method before anything runs, and runs an allowed one', () => {
  const saved = { ...process.env };
  let err: string[];
  beforeEach(() => {
    err = [];
    vi.spyOn(console, 'error').mockImplementation(m => { err.push(String(m)); });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw new Error(`exit ${code}`); }) as never);
    assertWriteEnabled.mockClear();
    getClient.mockClear();
    invokeApi.mockClear();
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  const OFF_LIST: [string, string[], Record<string, unknown>][] = [
    ['account.GetPasskeys', [], {}],
    ['payments.GetStarsStatus', ['--peer', 'me'], { peer: 'me' }],
    ['account.GetAuthorizations', [], {}],
    ['messages.GetRecentLocations', ['--peer', '@c', '--limit', '1'], { peer: '@c', limit: 1 }],
    ['bots.SetBotCommands', ['--json-params', '{"scope":{"_":"botCommandScopeDefault"},"langCode":"","commands":[]}'], { scope: { _: 'botCommandScopeDefault' }, langCode: '', commands: [] }],
  ];

  describe.each([['MCP', { TG_MCP: '1' }], ['MCP read-only', { TG_MCP: '1', TG_READ_ONLY: '1' }], ['read-only', { TG_READ_ONLY: '1' }]])('%s', (_where, env) => {
    beforeEach(() => { Object.assign(process.env, env); });

    it.each(OFF_LIST)('%s: the raw api form is refused', async (m, _args, params) => {
      await expect(apiCommand.parseAsync([m, '--params', JSON.stringify(params)], { from: 'user' })).rejects.toThrow('exit 1');
      expect(err.join('\n')).toMatch(/not available over MCP; run it in a terminal/);
      expect(getClient).not.toHaveBeenCalled();
      expect(invokeApi).not.toHaveBeenCalled();
    });

    it.each(OFF_LIST)('%s: the generated command is refused', async (m, args) => {
      const [ns, method] = GENERATED.get(m)!;
      await expect(buildLeaf(ns, method, m, true).parseAsync(args, { from: 'user' })).rejects.toThrow('exit 1');
      expect(err.join('\n')).toMatch(/not available over MCP; run it in a terminal/);
      expect(getClient).not.toHaveBeenCalled();
      expect(invokeApi).not.toHaveBeenCalled();
    });

    it.each(DANGEROUS)('%s: %s is refused in both forms before anything runs', async (_cat, m) => {
      const reason = apiRefusalReason(m) ? /^Refused/m : /not available over MCP; run it in a terminal/;
      await expect(apiCommand.parseAsync([m], { from: 'user' })).rejects.toThrow('exit 1');
      const [ns, method] = GENERATED.get(m)!;
      await expect(buildLeaf(ns, method, m, true).parseAsync([], { from: 'user' })).rejects.toThrow('exit 1');
      expect(err.length).toBe(2);
      for (const e of err) expect(e).toMatch(reason);
      expect(getClient).not.toHaveBeenCalled();
      expect(invokeApi).not.toHaveBeenCalled();
    });

    it('a refused method that is also denylisted keeps its own reason', async () => {
      await expect(apiCommand.parseAsync(['account.DeleteAccount', '--params', '{"reason":"x"}'], { from: 'user' })).rejects.toThrow('exit 1');
      expect(err.join('\n')).toMatch(/irreversible/);
      expect(invokeApi).not.toHaveBeenCalled();
    });

    it.each(ALLOWED_READS)('%s: an allowed read runs in both forms', async (m, params, args) => {
      await apiCommand.parseAsync([m, '--params', JSON.stringify(params)], { from: 'user' });
      const [ns, method] = GENERATED.get(m)!;
      await buildLeaf(ns, method, m, true).parseAsync(args, { from: 'user' });
      expect(invokeApi).toHaveBeenCalledTimes(2);
      expect(invokeApi.mock.calls.map(c => c[1])).toEqual([m, m]);
    });
  });

  it.each(ALLOWED_WRITES)('MCP write tool: %s runs in both forms', async (m, params, args) => {
    process.env.TG_MCP = '1';
    await apiCommand.parseAsync([m, '--params', JSON.stringify(params)], { from: 'user' });
    const [ns, method] = GENERATED.get(m)!;
    await buildLeaf(ns, method, m, true).parseAsync(args, { from: 'user' });
    expect(invokeApi.mock.calls.map(c => c[1])).toEqual([m, m]);
    expect(assertWriteEnabled).toHaveBeenCalledTimes(2);
  });

  it('in a terminal an off-list method runs as before', async () => {
    await apiCommand.parseAsync(['account.GetPasskeys'], { from: 'user' });
    const [ns, method] = GENERATED.get('account.GetPasskeys')!;
    await buildLeaf(ns, method, 'account.GetPasskeys', true).parseAsync([], { from: 'user' });
    expect(invokeApi).toHaveBeenCalledTimes(2);
    expect(mcpApiAllowlistRefusal('account.GetPasskeys')).toBeNull();
  });
});

// The whole CLI on the mock account, as the MCP read tool starts it (TG_MCP + TG_READ_ONLY)
describe('end to end on the mock account', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-allowlist-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const run = (args: string[], extra: Record<string, string> = {}) => spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: 'utf8',
    env: { ...process.env, TG_MOCK: join(dir, 'state.json'), TG_PROFILE: `mcp-allowlist-${process.pid}`, TG_NO_UPDATE_CHECK: '1', TG_MCP: '1', TG_READ_ONLY: '1', ...extra },
  });

  it('an allowed read returns data in both forms', () => {
    const raw = run(['api', 'contacts.GetContacts', '--params', '{"hash":0}']);
    expect(raw.status, raw.stderr).toBe(0);
    expect(raw.stdout).toMatch(/"users"/);
    const gen = run(['contacts', 'get-contacts']);
    expect(gen.status, gen.stderr).toBe(0);
    expect(gen.stdout).toMatch(/"users"/);
  });

  it('an allowed write runs through the write tool (no TG_READ_ONLY)', () => {
    const r = run(['api', 'messages.SendReaction', '--params', '{"peer":{"_chat":"@alice_example"},"msgId":4,"reaction":[{"_":"reactionEmoji","emoticon":"🔥"}]}'], { TG_READ_ONLY: '' });
    expect(r.status, r.stderr).toBe(0);
  });

  it('a raw result over MCP shows phone numbers as "[redacted]"', () => {
    const r = run(['api', 'contacts.GetContacts', '--params', '{"hash":0}']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/"phone":"\[redacted\]"/);
    expect(r.stdout).not.toMatch(/1555000000/);
  });

  it('the inline command is a write: the read tool refuses it', () => {
    const r = run(['inline', '@some_bot', 'cats']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/cannot run as a read/);
  });

  it('--help and schema state the terminal and the MCP access separately', () => {
    const help = run(['account', 'get-passkeys', '--help']);
    expect(help.stdout).toMatch(/Access in a terminal: read/);
    expect(help.stdout).toMatch(/Access over MCP: refused — not available over MCP/);
    const schema = run(['schema', 'account.GetPasskeys']);
    expect(schema.status, schema.stderr).toBe(0);
    expect(JSON.parse(schema.stdout)).toMatchObject({ access: 'read', mcpAccess: 'refused' });
  });

  it('an off-list method is refused in both forms with the terminal hint', () => {
    for (const args of [['api', 'account.GetPasskeys'], ['account', 'get-passkeys'], ['api', 'payments.GetStarsStatus', '--params', '{"peer":{"_chat":"me"}}']]) {
      const r = run(args);
      expect(r.status, args.join(' ')).toBe(1);
      expect(r.stderr).toMatch(/not available over MCP; run it in a terminal/);
    }
  });
});

describe('no allowlisted method can carry another request', () => {
  it('none has an argument of the generic query type (X or !X)', async () => {
    const { paramsOf } = await import('../src/commands/generated.js');
    const generic = (m: string) => paramsOf(m).filter(p => p.type === 'X' || p.type === '!X').map(p => `${m}.${p.name}`);
    // The check sees the type: a wrapper has one
    expect(generic('InvokeWithLayer')).toEqual(['InvokeWithLayer.query']);
    expect(ALLOWED.flatMap(generic)).toEqual([]);
  });
});

/**
 * Params of allowed methods that MCP refuses: [method, raw params, generated argv, reason]. Each is
 * refused on the parsed params (both forms) and on the built request.
 */
const STAKE = { _: 'inputMediaStakeDice', gameHash: 'h', tonAmount: '1', clientSeed: { _base64: 'AA==' } };
const PRICED_POST = { _: 'suggestedPost', price: { _: 'starsAmount', amount: '5', nanos: 0 } };
const MAP_BLOCK = { _: 'inputRichMessage', blocks: [{ _: 'inputPageBlockMap', geo: { _: 'inputGeoPoint', lat: 1, long: 2 }, zoom: 1, w: 1, h: 1 }] };
const REFUSED_PARAMS: [string, Record<string, unknown>, string[], RegExp][] = [
  ['messages.SendMessage', { peer: '@c', message: 'x', suggestedPost: PRICED_POST }, ['--peer', '@c', '--message', 'x', '--suggested-post', JSON.stringify(PRICED_POST)], /suggested post with a price/],
  ['messages.ForwardMessages', { fromPeer: '@c', toPeer: '@d', id: [1], suggestedPost: PRICED_POST }, ['--from-peer', '@c', '--to-peer', '@d', '--id', '1', '--json-params', JSON.stringify({ suggestedPost: PRICED_POST })], /suggested post with a price/],
  ['messages.SendMedia', { peer: '@c', message: '', media: STAKE }, ['--peer', '@c', '--message', '', '--media', JSON.stringify(STAKE)], /stake/],
  ['messages.SendMultiMedia', { peer: '@c', multiMedia: [{ _: 'inputSingleMedia', media: STAKE, randomId: '1', message: '' }] }, ['--peer', '@c', '--json-params', JSON.stringify({ multiMedia: [{ _: 'inputSingleMedia', media: STAKE, randomId: '1', message: '' }] })], /stake/],
  ['messages.SendMessage', { peer: '@c', message: 'x', allowPaidFloodskip: true }, ['--peer', '@c', '--message', 'x', '--allow-paid-floodskip'], /allowPaidFloodskip/],
  // An empty string still sets the bit of a `true` flag
  ['messages.SendMessage', { peer: '@c', message: 'x', allowPaidFloodskip: '' }, ['--peer', '@c', '--message', 'x', '--json-params', '{"allowPaidFloodskip":""}'], /allowPaidFloodskip/],
  ['contacts.Block', { id: '@x', myStoriesFrom: '' }, ['--id', '@x', '--json-params', '{"myStoriesFrom":""}'], /myStoriesFrom/],
  ['messages.SendMessage', { peer: '@c', message: 'x', richMessage: MAP_BLOCK }, ['--peer', '@c', '--message', 'x', '--json-params', JSON.stringify({ richMessage: MAP_BLOCK })], /geographic location/],
  ['messages.EditMessage', { peer: '@c', id: 1, richMessage: MAP_BLOCK }, ['--peer', '@c', '--id', '1', '--json-params', JSON.stringify({ richMessage: MAP_BLOCK })], /geographic location/],
  ['contacts.ResolveUsername', { username: 'x', referer: 'partner' }, ['--username', 'x', '--referer', 'partner'], /referer/],
  ['messages.ExportChatInvite', { peer: '@c', subscriptionPricing: { _: 'starsSubscriptionPricing', period: 2592000, amount: '10' } }, ['--peer', '@c', '--subscription-pricing', '{"_":"starsSubscriptionPricing","period":2592000,"amount":"10"}'], /subscriptionPricing/],
  ['contacts.Block', { id: '@x', myStoriesFrom: true }, ['--id', '@x', '--my-stories-from'], /myStoriesFrom/],
  ['contacts.Unblock', { id: '@x', myStoriesFrom: true }, ['--id', '@x', '--my-stories-from'], /myStoriesFrom/],
  ['messages.GetBotCallbackAnswer', { peer: '@c', msgId: 1, password: { _: 'inputCheckPasswordEmpty' } }, ['--peer', '@c', '--msg-id', '1', '--password', '{"_":"inputCheckPasswordEmpty"}'], /2FA/],
  ['messages.GetMessagesViews', { peer: '@c', id: [1], increment: true }, ['--peer', '@c', '--id', '1', '--increment', 'true'], /increment/],
];

describe('over MCP, risky params of allowed methods are refused', () => {
  const saved = { ...process.env };
  let err: string[];
  beforeEach(() => {
    err = [];
    vi.spyOn(console, 'error').mockImplementation(m => { err.push(String(m)); });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw new Error(`exit ${code}`); }) as never);
    getClient.mockClear();
    invokeApi.mockClear();
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  it('every sample method is on the allowlist, so only the param stops it', () => {
    for (const [m] of REFUSED_PARAMS) expect(isMcpApiAllowed(m), m).toBe(true);
  });

  it.each(REFUSED_PARAMS)('%s: refused on the parsed params, raw and generated', async (m, params, args, reason) => {
    process.env.TG_MCP = '1';
    await expect(apiCommand.parseAsync([m, '--params', JSON.stringify(params)], { from: 'user' })).rejects.toThrow('exit 1');
    const [ns, method] = GENERATED.get(m)!;
    await expect(buildLeaf(ns, method, m, true).parseAsync(args, { from: 'user' })).rejects.toThrow('exit 1');
    expect(err.length).toBe(2);
    for (const e of err) expect(e).toMatch(reason);
    expect(getClient).not.toHaveBeenCalled();
    expect(invokeApi).not.toHaveBeenCalled();
  });

  it.each(REFUSED_PARAMS)('%s: refused on the built request before it is sent', async (m, params, _args, reason) => {
    process.env.TG_MCP = '1';
    const real = await vi.importActual<typeof import('../src/client.js')>('../src/client.js');
    const invoke = vi.fn(async () => true);
    const client = { invoke } as unknown as Parameters<typeof real.invokeApi>[0];
    await expect(real.invokeApi(client, m, params)).rejects.toThrow(reason);
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each(REFUSED_PARAMS)('%s: runs in a terminal', async (m, params) => {
    await apiCommand.parseAsync([m, '--params', JSON.stringify(params)], { from: 'user' });
    expect(invokeApi).toHaveBeenCalledTimes(1);
  });

  it('the checks read built TL objects too, and leave harmless values alone', async () => {
    process.env.TG_MCP = '1';
    const { Api } = await import('teleproto');
    const { mcpParamRefusal } = await import('../src/api-methods.js');
    const stake = new Api.InputMediaStakeDice({ gameHash: 'h', tonAmount: 1 as never, clientSeed: Buffer.alloc(1) });
    expect(mcpParamRefusal('messages.SendMedia', { media: stake })).toMatch(/stake/);
    expect(mcpParamRefusal('messages.SendMessage', { richMessage: { blocks: [new Api.InputPageBlockMap({ geo: new Api.InputGeoPoint({ lat: 1, long: 2 }), zoom: 1, w: 1, h: 1 })] } })).toMatch(/geographic/);
    // A suggested post without a price, false flags and an empty referer pass
    expect(mcpParamRefusal('messages.SendMessage', { suggestedPost: { _: 'suggestedPost' }, allowPaidFloodskip: false })).toBeNull();
    expect(mcpParamRefusal('contacts.ResolveUsername', { username: 'x', referer: '' })).toBeNull();
    expect(mcpParamRefusal('messages.GetMessagesViews', { peer: '@c', id: [1], increment: false })).toBeNull();
    expect(mcpParamRefusal('contacts.Block', { id: '@x', myStoriesFrom: false })).toBeNull();
    delete process.env.TG_MCP;
    expect(mcpParamRefusal('messages.SendMedia', { media: stake })).toBeNull();
  });
});

describe('over MCP a raw result hides phones, birthdays, notes and locations', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  /** A synthetic users.UserFull plus a history page with contact, geo and venue media. */
  const response = async () => {
    const { Api } = await import('teleproto');
    return {
      fullUser: {
        _: 'userFull', id: '5', about: 'hi',
        birthday: { _: 'birthday', day: 1, month: 2, year: 1990 },
        businessLocation: { _: 'businessLocation', address: 'Main St 1', geoPoint: { _: 'geoPoint', lat: 1, long: 2 } },
        note: { _: 'textWithEntities', text: 'owes me money', entities: [] },
      },
      users: [new Api.User({ id: 5 as never, firstName: 'Ann', phone: '15550000001' })],
      chats: [{ _: 'channelFull', location: { _: 'channelLocation', geoPoint: { _: 'geoPoint', lat: 1, long: 2 }, address: 'Old Town' } }],
      messages: [
        { _: 'message', id: 1, message: 'call me', media: { _: 'messageMediaContact', phoneNumber: '15550000002', firstName: 'Bob', vcard: 'TEL:15550000002' } },
        { _: 'message', id: 2, media: { _: 'messageMediaGeo', geo: { _: 'geoPoint', lat: 1, long: 2 } } },
        { _: 'message', id: 3, media: { _: 'messageMediaVenue', geo: { _: 'geoPoint', lat: 1, long: 2 }, title: 'Cafe', address: 'Main St 1' } },
      ],
    };
  };

  it('replaces each such key with "[redacted]" at any depth, keeping the key', async () => {
    process.env.TG_MCP = '1';
    const { serializeApiResult } = await vi.importActual<typeof import('../src/client.js')>('../src/client.js');
    const out = serializeApiResult(await response());
    const j = JSON.parse(out);
    expect(j.fullUser.birthday).toBe('[redacted]');
    expect(j.fullUser.businessLocation).toBe('[redacted]');
    expect(j.fullUser.note).toBe('[redacted]');
    expect(j.users[0].phone).toBe('[redacted]');
    expect(j.chats[0].location).toBe('[redacted]');
    expect(j.messages[0].media.phoneNumber).toBe('[redacted]');
    expect(j.messages[0].media.vcard).toBe('[redacted]');
    expect(j.messages[1].media.geo).toBe('[redacted]');
    expect(j.messages[2].media).toMatchObject({ geo: '[redacted]', address: '[redacted]', title: 'Cafe' });
    // What the agent needs stays
    expect(j.users[0].firstName).toBe('Ann');
    expect(j.messages[0].message).toBe('call me');
    expect(out).not.toMatch(/1555|Main St|Old Town|owes me|1990/);
  });

  it('the read tool redacts too, and a terminal shows everything', async () => {
    const { serializeApiResult } = await vi.importActual<typeof import('../src/client.js')>('../src/client.js');
    process.env.TG_READ_ONLY = '1';
    expect(serializeApiResult(await response())).not.toMatch(/1555/);
    delete process.env.TG_READ_ONLY;
    delete process.env.TG_MCP;
    const out = serializeApiResult(await response());
    expect(out).toMatch(/15550000001/);
    expect(out).toMatch(/Main St 1/);
  });
});

describe('--help and schema show MCP access from the allowlist', () => {
  it('methodSchema and namespaceSchema carry mcpAccess next to the terminal access', async () => {
    const { methodSchema, namespaceSchema, mcpAccess } = await import('../src/commands/generated.js');
    const cases: [string, string, string, string, string][] = [
      ['account', 'get-passkeys', 'account.GetPasskeys', 'read', 'refused'],
      ['messages', 'get-history', 'messages.GetHistory', 'read', 'read'],
      ['messages', 'send-message', 'messages.SendMessage', 'write', 'write'],
      ['messages', 'get-inline-bot-results', 'messages.GetInlineBotResults', 'write', 'write'],
      ['account', 'delete-account', 'account.DeleteAccount', 'refused', 'refused'],
      ['users', 'get-full-user', 'users.GetFullUser', 'read', 'refused'],
    ];
    for (const [ns, method, cls, terminal, mcp] of cases) {
      expect(methodSchema(ns, method, cls), cls).toMatchObject({ access: terminal, mcpAccess: mcp });
      expect(namespaceSchema(ns).find(e => e.className === cls), cls).toMatchObject({ access: terminal, mcpAccess: mcp });
    }
    // The same table as the server: every method agrees with the allowlist
    for (const [, , cls] of TL_METHODS) {
      if (mcpAccess(cls) !== 'refused') expect(isMcpApiAllowed(cls), cls).toBe(true);
    }
    for (const m of ALLOWED) expect(mcpAccess(m), m).toBe(isApiReadMethod(m) ? 'read' : 'write');
  });
});

describe('an empty string is a set flag on the wire', () => {
  it('teleproto sets the bit of a true flag for "" (so the MCP checks count it)', async () => {
    const { Api } = await import('teleproto');
    const hex = (r: { getBytes(): Buffer }) => Buffer.from(r.getBytes()).toString('hex');
    const base = { peer: new Api.InputPeerSelf(), message: 'x', randomId: 1 as never };
    expect(hex(new Api.messages.SendMessage({ ...base, allowPaidFloodskip: '' as never }))).not.toBe(hex(new Api.messages.SendMessage(base)));
    expect(hex(new Api.messages.SendMessage({ ...base, allowPaidFloodskip: '' as never }))).toBe(hex(new Api.messages.SendMessage({ ...base, allowPaidFloodskip: true })));
  });
});
