import { beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  NEVER_COMMANDS, PER_CALL_COMMANDS, PLUGIN_PATHS, READ_COMMANDS, WRITE_COMMANDS, WRITE_SUBCOMMANDS, classifyCall, commandPaths, handleMessage, isWriteCommand, planCall,
  setKnownCommands, useWorkers,
} from '../src/mcp.js';
import { rootMethodClassName } from '../src/generated-registry.js';

const CLI = 'dist/telegram.mjs';
// Unconfigured profile: nothing here can reach a real account
// TG_MOCK off: an inherited TG_MOCK=1 would run file commands with no write guard at all
const env = { ...process.env, TG_MOCK: '', TG_PROFILE: 'mcp-test', TG_NO_UPDATE_CHECK: '1' };

let helpAllText: string | undefined;
// `help-all` from one CLI process for the whole file
const helpAll = (): string => (helpAllText ??= spawnSync(process.execPath, [CLI, 'help-all'], { encoding: 'utf8', env }).stdout);
function commandNames(): string[] {
  return helpAll().split('\n').filter(l => /^[a-z]/.test(l)).map(l => l.split(' ')[0]);
}

/** Full paths of the subcommands help-all lists, at any depth, e.g. "topic create" (help-all lists a
 * group through its leaves; the path is every word before the first `<arg>`, `[arg]` or ` — `). */
function subcommandPaths(): string[] {
  return helpAll().split('\n').filter(l => /^[a-z]/.test(l) && l.includes(' — '))
    .map(l => l.slice(0, l.indexOf(' — ')).split(' ').filter((w, i, all) => !all.slice(0, i + 1).some(x => /^[<[]/.test(x))).join(' '))
    .filter(p => p.includes(' '));
}
/** Every registered path: names, leaves and the groups in between, as commandPaths gives them. */
function allPaths(): string[] {
  return [...new Set([...commandNames(), ...subcommandPaths().flatMap(p => p.split(' ').map((_, i, w) => w.slice(0, i + 1).join(' ')))])];
}

beforeAll(() => setKnownCommands(allPaths()));

describe('command classification', () => {
  const groups = { read: READ_COMMANDS, write: WRITE_COMMANDS, never: NEVER_COMMANDS, 'per call': PER_CALL_COMMANDS };

  it('every registered command is in exactly one group (a new command without a group fails here)', () => {
    for (const c of new Set([...commandNames(), 'help-all'])) {
      const in_ = Object.entries(groups).filter(([, set]) => set.has(c)).map(([g]) => g);
      expect(in_, c).toHaveLength(1);
    }
  });

  it('every grouped name is a real command (no typos that silently disappear)', () => {
    const names = new Set([...commandNames(), 'help-all']);
    for (const set of Object.values(groups)) for (const c of set) expect(names, c).toContain(c);
  });

  it('no command name is also a root TL method, which would take its classification', () => {
    for (const c of commandNames()) expect(rootMethodClassName(c), c).toBeUndefined();
  });

  it('the write subcommands are exactly the full leaf paths of every group MCP can run (a new one fails here)', () => {
    // Full paths, not two words: a child added under `topic create` makes `topic create …` a new
    // leaf here, so it cannot inherit the permission of `topic create`. Never groups (skill) are off.
    const leaves = subcommandPaths().filter(p => !NEVER_COMMANDS.has(p.split(' ')[0]) && p.split(' ')[0] !== 'plugin');
    expect(new Set(leaves)).toEqual(WRITE_SUBCOMMANDS);
    for (const p of WRITE_SUBCOMMANDS) expect(WRITE_COMMANDS, p).toContain(p.split(' ')[0]);
  });

  it('every plugin path is classified by its full path, and a new one is refused until it is listed', () => {
    const leaves = subcommandPaths().filter(p => p.startsWith('plugin '));
    // validate and dev stay off MCP on purpose (they read a folder the model would name)
    expect(new Set(leaves)).toEqual(new Set([...Object.keys(PLUGIN_PATHS), 'plugin validate', 'plugin dev']));
    expect(classifyCall(['plugin', 'dev', './x', 'collect', '--mock']).group).toBe('never');
    setKnownCommands([...allPaths(), 'plugin publish', 'plugin data export']);
    try {
      expect(classifyCall(['plugin', 'publish', 'tone-of-voice']).group).toBe('unknown');
      expect(classifyCall(['plugin', 'data', 'export', 'x']).group).toBe('unknown');
    } finally {
      setKnownCommands(allPaths());
    }
  });

  it('the parser of help-all sees nested paths', () => {
    expect(subcommandPaths()).toContain('topic create');
    expect(subcommandPaths()).toContain('skill install');
    expect(subcommandPaths().some(p => /[<[]/.test(p))).toBe(false);
  });

  it('commandPaths lists commands at every depth', () => {
    const cmd = (n: string, ...commands: { name(): string; commands: unknown[] }[]) => ({ name: () => n, commands });
    expect(commandPaths([cmd('topic', cmd('create', cmd('sub'))), cmd('send')] as never)).toEqual(['topic', 'topic create', 'topic create sub', 'send']);
  });

  it('a flat write command that gains a subcommand does not pass it on', () => {
    setKnownCommands([...allPaths(), 'send sub']);
    try {
      expect(classifyCall(['send', 'sub', 'me']).group).toBe('unknown');
      expect(classifyCall(['send', 'me', 'hi']).group).toBe('unknown');
    } finally {
      setKnownCommands(allPaths());
    }
  });

  it('a subcommand that is listed but not registered does not run', () => {
    setKnownCommands(commandNames());
    try {
      expect(classifyCall(['topic', 'create', 'g', 't']).group).toBe('unknown');
    } finally {
      setKnownCommands(allPaths());
    }
  });

  it('a child of a listed subcommand does not inherit its permission', () => {
    setKnownCommands([...allPaths(), 'topic create sub']);
    try {
      expect(classifyCall(['topic', 'create', 'sub', 'g']).group).toBe('unknown');
      // `topic create` is now a group, so it runs only through a listed leaf
      expect(classifyCall(['topic', 'create', 'g', 't']).group).toBe('unknown');
      expect(classifyCall(['topic', 'create']).group).toBe('invalid');
    } finally {
      setKnownCommands(allPaths());
    }
  });

  it('commands that are obviously writes or local-file writers are writes', () => {
    for (const c of ['send', 'reply', 'delete', 'forward', 'block', 'archive', 'kick', 'download', 'sync', 'avatar', 'invite-link', 'topic']) {
      expect(isWriteCommand(c), c).toBe(true);
    }
  });
});

// The whole call decides, not the name: arguments of write-access, a bare --help, the TL method
// behind api and generated commands, the operand of a clash namespace (auth, contacts, stats…).
const CALLS: [string[], 'read' | 'write' | 'never' | 'unknown' | 'invalid'][] = [
  [['inbox', '-n', '5'], 'read'],
  [['send', 'me', '-'], 'write'],
  [['topic', 'create', 'g', 't'], 'write'],
  [['download', 'me', '1'], 'write'],
  [['sync'], 'write'],
  // MCP only shows the write mode
  [['write-access'], 'read'],
  [['write-access', 'on'], 'never'],
  [['write-access', 'ask'], 'never'],
  [['write-access', 'off'], 'never'],
  // ... as text or as JSON: the read-only status form
  [['write-access', '--json'], 'read'],
  [['write-access', '--json', 'on'], 'never'],
  [['write-access', '--for', '1h'], 'never'],
  // Administrative and interactive commands, with any arguments
  [['auth'], 'never'],
  [['auth', '--phone', '+1'], 'never'],
  [['logout'], 'never'],
  [['onboard'], 'never'],
  [['update'], 'never'],
  [['update', '--', '--help'], 'never'],
  [['logout', '--', '-h'], 'never'],
  [['skill', 'install'], 'never'],
  [['transfer-owner', 'g', 'u'], 'never'],
  [['mcp'], 'never'],
  [['mcp', '--token'], 'never'],
  [['mcp', '--rotate-token'], 'never'],
  [['mcp', '--http'], 'never'],
  [['help-all'], 'never'],
  // A bare --help only prints help, for any real command (even a never one); never for an unknown one
  [['send', '--help'], 'read'],
  [['mcp', '--token', '--help'], 'never'],
  [['auth', '--help'], 'read'],
  [['skill', 'install', '--help'], 'read'],
  [['messages', '--help'], 'read'],
  [['messages', 'get-history', '--help', '--json'], 'read'],
  [['send', '@x', '--', '--help'], 'write'],
  [['nope', '--help'], 'unknown'],
  // TL methods: auth.* login methods and other refused methods never run
  [['auth', 'send-code'], 'never'],
  [['api', 'auth.CheckPassword'], 'never'],
  [['api', 'account.DeleteAccount'], 'never'],
  [['account', 'delete-account'], 'never'],
  // Paid reactions spend Stars via `count`; passkeys are log-in credentials
  [['api', 'messages.SendPaidReaction'], 'never'],
  [['messages', 'send-paid-reaction', '--peer', '@c', '--msg-id', '1', '--count', '5'], 'never'],
  [['api', 'account.RegisterPasskey'], 'never'],
  [['account', 'register-passkey'], 'never'],
  [['api', 'account.DeletePasskey'], 'never'],
  [['account', 'delete-passkey', '--id', 'x'], 'never'],
  [['api', 'account.InitPasskeyRegistration'], 'never'],
  [['account', 'init-passkey-registration'], 'never'],
  [['api', 'account.GetPasskeys'], 'never'], // a read, but off the MCP allowlist
  [['api', 'help.GetConfig'], 'never'], // off the MCP allowlist
  [['api', 'messages.GetHistory'], 'read'],
  [['api', 'contacts.Block'], 'write'],
  [['api'], 'invalid'],
  [['messages', 'get-history'], 'read'],
  [['messages', 'send-message'], 'write'],
  [['ping'], 'never'], // off the MCP allowlist
  [['contacts'], 'read'],
  [['contacts', 'block'], 'write'],
  [['stats', '@chat'], 'read'],
  [['stats', 'get-broadcast-stats'], 'never'], // off the MCP allowlist
  [['help'], 'read'],
  [['help', 'get-config'], 'never'], // off the MCP allowlist
  // Not commands: refused, including future administrative commands until they get a group
  [['messages'], 'unknown'],
  [['messages', 'bogus'], 'unknown'],
  [['__update-check'], 'unknown'],
  [['connect'], 'unknown'],
  [['secrets', 'use', 'x'], 'unknown'],
  [['service', 'install'], 'unknown'],
  [['doctor', '--fix'], 'unknown'],
  [['nope'], 'unknown'],
  [['--help'], 'invalid'],
  [['watch', 'me'], 'invalid'],
  [['watch', 'me', '-t', '30'], 'read'],
  // A read method that would spend Stars never runs over MCP, in every form of params
  [['api', 'channels.SearchPosts', '--params', '{"query":"x"}'], 'read'],
  [['api', 'channels.SearchPosts', '--params', '{"query":"x","allowPaidStars":"10"}'], 'never'],
  [['api', 'channels.SearchPosts', '-p', '{"allowPaidStars":10}'], 'never'],
  [['api', 'channels.SearchPosts', '-p{"allowPaidStars":10}'], 'never'],
  [['api', 'channels.SearchPosts', '--params={"allowPaidStars":10}'], 'never'],
  [['channels', 'search-posts', '--query', 'x'], 'read'],
  [['channels', 'search-posts', '--query', 'x', '--allow-paid-stars', '10'], 'never'],
  [['channels', 'search-posts', '--allow-paid-stars=10'], 'never'],
  [['channels', 'search-posts', '--json-params', '{"allowPaidStars":10}'], 'never'],
  [['api', 'channels.SearchPosts', '--params', '{"allow\\u0050aidStars":10}'], 'never'],
  // The word itself in a query, a nested key or a null value is a free search
  [['channels', 'search-posts', '--query', 'allowPaidStars'], 'read'],
  // commander consumes a valued option's next argument, dash or not: this is a search for the text
  [['channels', 'search-posts', '--query', '--allow-paid-stars=5'], 'read'],
  [['channels', 'search-posts', '--query', '--allow-paid-stars', '--limit', '5'], 'read'],
  [['channels', 'search-posts', '--json-params', '{}', '--allow-paid-stars', '5'], 'never'],
  [['api', 'channels.SearchPosts', '-p', '{"query":"x"}', '--allow-paid-stars=5'], 'never'],
  [['api', 'channels.SearchPosts', '--params', '{"query":"allowPaidStars"}'], 'read'],
  [['api', 'channels.SearchPosts', '--params', '{"query":"x","offsetPeer":{"allowPaidStars":1}}'], 'read'],
  [['api', 'channels.SearchPosts', '--params', '{"query":"x","allowPaidStars":null}'], 'read'],
  // A paid message or forward never runs over MCP either; the free forms stay writes
  [['api', 'messages.SendMessage', '--params', '{"peer":"@c","message":"hi","allowPaidStars":5}'], 'never'],
  [['api', 'messages.ForwardMessages', '-p{"fromPeer":"@a","toPeer":"@c","id":[1],"allowPaidStars":0}'], 'never'],
  [['messages', 'send-message', '--peer', '@c', '--message', 'hi', '--allow-paid-stars', '5'], 'never'],
  [['messages', 'send-media', '--json-params', '{"allowPaidStars":5}'], 'never'],
  [['api', 'messages.SendMessage', '--params', '{"peer":"@c","message":"hi"}'], 'write'],
  [['messages', 'send-message', '--peer', '@c', '--message', '--allow-paid-stars=5'], 'write'],
  [['api', 'messages.SendMessage', '-p', '-'], 'write'], // stdin params: the CLI refuses a paid body
  // Recovery-email management and Passport values never run; an inline query is a write
  [['api', 'account.ResendPasswordEmail'], 'never'],
  [['account', 'cancel-password-email'], 'never'],
  [['api', 'account.GetAllSecureValues'], 'never'],
  [['account', 'get-secure-value'], 'never'],
  [['api', 'messages.GetInlineBotResults', '-p', '{"bot":"@b","peer":"me","query":"x","offset":""}'], 'write'],
  [['inline', '@bot', 'cats'], 'write'],
  [['api', 'account.GetAuthorizationForm', '-p', '{"botId":1,"scope":"x","publicKey":"k"}'], 'never'],
  [['account', 'get-authorization-form', '--bot-id', '1'], 'never'],
  // A geo group is classified on its method (a write); the CLI child refuses geoPoint/address
  // before getClient (test/refused-before-invoke.test.ts), like an inline query with geoPoint
  [['api', 'channels.CreateChannel', '-p', '{"title":"t","about":"","geoPoint":{"_":"inputGeoPoint","lat":1,"long":2}}'], 'write'],
  [['api', 'channels.CreateChannel', '-p', '{"title":"t","about":""}'], 'write'],
  // Inherited names of a plain object are not commands
  [['constructor'], 'unknown'],
  [['__proto__'], 'unknown'],
  [['toString'], 'unknown'],
  [['topic', 'constructor', 'g'], 'unknown'],
  [['topic', 'bogus'], 'unknown'],
  [['constructor', '--help'], 'unknown'],
  [['constructor', 'get-history'], 'unknown'],
  [['messages', 'constructor'], 'unknown'],
  // Reads that hand out a login link never run
  [['api', 'messages.GetEmojiURL', '--params', '{"langCode":"en"}'], 'never'],
  [['messages', 'get-emoji-url', '--lang-code', 'en'], 'never'],
  // api classifies the resolved method, not the raw string
  [['api', 'messages.GetNope'], 'unknown'],
  [['api', 'nope.GetHistory'], 'unknown'],
  [['api', ' account.DeleteAccount '], 'never'],
  [['api', 'MESSAGES.getHistory'], 'read'],
  // A write group runs only its registered subcommands
  [['topic', 'close', 'g', '1'], 'write'],
  [['topic', 'bogus', 'g'], 'unknown'],
  [['topic'], 'invalid'],
  [['topic', '--json'], 'invalid'],
];

describe('call → group', () => {
  it.each(CALLS)('%j is %s', (args, group) => {
    expect(classifyCall(args).group).toBe(group);
  });

  it('each tool runs only its own group; never, unknown and invalid calls run on neither', () => {
    for (const [args, group] of CALLS) {
      for (const tool of ['telegram_read', 'telegram_write'] as const) {
        const plan = planCall(tool, { args });
        const runs = (tool === 'telegram_read' && group === 'read') || (tool === 'telegram_write' && group === 'write');
        expect(typeof plan === 'object', `${tool} ${args.join(' ')}`).toBe(runs);
        if (typeof plan === 'object') expect(plan.readOnly).toBe(tool === 'telegram_read');
      }
    }
  });

  it('handleMessage never starts the CLI or asks the user for a refused call', async () => {
    const ran: string[][] = [];
    const asked: string[] = [];
    const elicit = async (m: string) => (asked.push(m), true);
    const run = async (plan: { argv: string[] }) => {
      ran.push(plan.argv);
      return { content: [{ type: 'text' as const, text: 'ran' }] };
    };
    let id = 1;
    for (const [args, group] of CALLS) {
      if (group === 'read' || group === 'write') continue;
      for (const name of ['telegram_read', 'telegram_write']) {
        const r = (await handleMessage({ jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name, arguments: { args } } }, run, { elicit })) as any;
        expect(r.result.isError, `${name} ${args.join(' ')}`).toBe(true);
      }
    }
    expect(ran).toEqual([]);
    expect(asked).toEqual([]);
  });
});

describe('planCall', () => {
  it('routes reads and writes to the right tool only', () => {
    expect(planCall('telegram_read', { args: ['inbox', '-n', '5'] })).toEqual({ argv: ['inbox', '-n', '5'], readOnly: true });
    expect(planCall('telegram_read', { args: ['send', 'me', 'x'] })).toMatch(/use telegram_write/);
    expect(planCall('telegram_write', { args: ['read', 'me'] })).toMatch(/use telegram_read/);
    expect(planCall('telegram_write', { args: ['send', 'me', '-'], stdin: 'hi' })).toEqual({ argv: ['send', 'me', '-'], readOnly: false, stdin: 'hi' });
  });

  it('refuses excluded, unknown, flag-first and unbounded calls', () => {
    expect(planCall('telegram_write', { args: ['auth'] })).toMatch(/not available over MCP/);
    expect(planCall('telegram_write', { args: ['transfer-owner', 'g', 'u'] })).toMatch(/not available/);
    expect(planCall('telegram_read', { args: ['write-access', 'on'] })).toMatch(/changed by the user, not over MCP.*telegram_setup/);
    expect(planCall('telegram_read', { args: ['write-access'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_read', { args: ['--help'] })).toMatch(/command name/);
    expect(planCall('telegram_read', { args: ['nope'] })).toMatch(/Unknown command/);
    expect(planCall('telegram_read', { args: ['watch', 'me'] })).toMatch(/-t/);
    expect(planCall('telegram_read', { args: ['watch', 'me', '-t', '30'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_read', { args: [] })).toMatch(/non-empty/);
  });
});

describe('protocol', () => {
  it('negotiates the version and ignores notifications', async () => {
    const init = (await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })) as any;
    expect(init.result.protocolVersion).toBe('2025-06-18');
    const newer = (await handleMessage({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2099-01-01' } })) as any;
    expect(newer.result.protocolVersion).toBe('2025-11-25');
    expect(await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeUndefined();
    expect(((await handleMessage({ jsonrpc: '2.0', id: 3, method: 'nope' })) as any).error.code).toBe(-32601);
  });

  it('the read tool can never run a guarded write, even if misrouted', () => {
    const r = spawnSync(process.execPath, [CLI, 'send', 'me', 'x'], { encoding: 'utf8', env: { ...env, TG_READ_ONLY: '1' } });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/cannot run as a read/);
  });
});

describe('worker mode', () => {
  it('runs calls in worker threads under Electron (Claude Desktop) or when forced', () => {
    expect(useWorkers({}, undefined)).toBe(false);
    expect(useWorkers({}, '44.4.3')).toBe(true);
    expect(useWorkers({ TG_MCP_WORKER: '1' }, undefined)).toBe(true);
  });
});

// Child processes everywhere else; worker threads inside Claude Desktop (forced here with TG_MCP_WORKER)
// The two modes are independent servers, so they run at the same time
describe.concurrent.each([
  ['child processes', {}],
  ['worker threads', { TG_MCP_WORKER: '1' }],
])('telegram mcp over stdio (%s)', (_mode, extraEnv) => {
  it('serves initialize, tools/list and real tool calls, then exits when stdin closes', async () => {
    const child = spawn(process.execPath, [CLI, 'mcp'], { env: { ...env, ...extraEnv }, stdio: ['pipe', 'pipe', 'pipe'] });
    const lines: any[] = [];
    let buf = '';
    child.stdout.on('data', d => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); }
    });
    const send = (m: object) => child.stdin.write(JSON.stringify(m) + '\n');
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 't', version: '0' } } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'telegram_help', arguments: { grep: 'thread' } } });
    send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'telegram_write', arguments: { args: ['send', 'me', '-'], stdin: 'hi' } } });
    send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'telegram_help', arguments: {} } });
    send({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'telegram_read', arguments: { args: ['whoami'] } } });
    child.stdin.end();
    const code = await new Promise(r => child.on('close', r));

    expect(code).toBe(0);
    expect(lines.map(l => l.id)).toEqual([1, 2, 3, 4, 5, 6]); // in order, nothing for the notification
    expect(lines[1].result.tools.map((t: any) => t.name)).toEqual(['telegram_help', 'telegram_read', 'telegram_write', 'telegram_setup']);
    expect(lines[2].result.content[0].text).toMatch(/read <chat>/);
    // Unconfigured profile has no write access: the guard refuses, reported as a tool error
    expect(lines[3].result.isError).toBe(true);
    expect(lines[3].result.content[0].text).toMatch(/Write access|secret store/);
    // Full output survives process.exit right after the write
    const direct = helpAll().trimEnd();
    expect(lines[4].result.content[0].text).toBe(direct);
    // A real read on the unconfigured profile fails cleanly instead of hanging on a prompt
    expect(lines[5].result.isError).toBe(true);
    expect(lines[5].result.content[0].text).toMatch(/not configured|not authenticated|auth/i);
  }, 30_000);

  it('refuses never and unknown calls without running anything or writing to disk', async () => {
    // A fresh HOME: every config path of the profile lives under it, so it must stay empty
    const home = mkdtempSync(join(tmpdir(), 'tg-mcp-never-'));
    try {
      const child = spawn(process.execPath, [CLI, 'mcp'], {
        // APPDATA too: the Windows profile (config, DPAPI file) lives there, not under HOME
        env: { ...env, ...extraEnv, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_PROFILE: 'mcp-never-test' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const lines: any[] = [];
      let buf = '';
      child.stdout.on('data', d => {
        buf += d;
        let i;
        while ((i = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); }
      });
      const refused = [['write-access', 'on'], ['write-access', 'ask'], ['mcp', '--rotate-token'], ['skill', 'install'], ['logout'], ['update'], ['__update-check'], ['connect']];
      let id = 1;
      for (const args of refused) {
        for (const name of ['telegram_read', 'telegram_write']) {
          child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name, arguments: { args } } }) + '\n');
        }
      }
      // A local file write follows the write mode over MCP (read-only here), unlike in a terminal
      const out = join(home, 'media');
      for (const args of [['download', 'me', '1', '-o', out], ['sync', '--output', out], ['avatar', 'me', '-o', out]]) {
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name: 'telegram_write', arguments: { args } } }) + '\n');
      }
      child.stdin.end();
      expect(await new Promise(r => child.on('close', r))).toBe(0);
      expect(lines).toHaveLength(refused.length * 2 + 3);
      for (const l of lines.splice(refused.length * 2)) {
        expect(l.result.isError).toBe(true);
        expect(l.result.content[0].text).toMatch(/Write access|secret store/);
      }
      for (const l of lines) {
        expect(l.result.isError).toBe(true);
        expect(l.result.content[0].text).toMatch(/not available over MCP|changed by the user|Unknown command/);
      }
      expect(readdirSync(home, { recursive: true })).toEqual([]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  }, 30_000);
});
