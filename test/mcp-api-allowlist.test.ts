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
  ['channels.GetFullChannel', { channel: '@c' }, ['--channel', '@c']],
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

  it('an off-list method is refused in both forms with the terminal hint', () => {
    for (const args of [['api', 'account.GetPasskeys'], ['account', 'get-passkeys'], ['api', 'payments.GetStarsStatus', '--params', '{"peer":{"_chat":"me"}}']]) {
      const r = run(args);
      expect(r.status, args.join(' ')).toBe(1);
      expect(r.stderr).toMatch(/not available over MCP; run it in a terminal/);
    }
  });
});
