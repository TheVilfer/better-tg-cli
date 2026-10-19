import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import apiDefinitions from 'teleproto/tl/generated/api-definitions.js';
import { generateSource, generateDocsSource } from '../scripts/gen-tl-commands.mjs';
import { TL_METHODS } from '../src/generated/tl-commands.js';
import { buildParams, paramsOf, access, methodSchema, exampleInvocation } from '../src/commands/generated.js';
import { methodDoc, paramDoc, docsUrl, TL_DOCS_META } from '../src/tl-docs.js';
import { resolveGeneratedCommand, methodClassName, rootMethodClassName, kebabCase } from '../src/generated-registry.js';
import { spawnSync } from 'node:child_process';
import { planCall } from '../src/mcp.js';
import { disconnectClient } from '../src/client.js';
import { setStrictChatResolution } from '../src/resolve-mode.js';

const schemaFunctionCount = (apiDefinitions as unknown as { isFunction: boolean }[]).filter(d => d.isFunction).length;

describe('generated API command table', () => {
  it('has exactly one entry per TL schema method (823 functions)', () => {
    expect(TL_METHODS.length).toBe(schemaFunctionCount);
    expect(TL_METHODS.length).toBe(823);
    expect(new Set(TL_METHODS.map(m => m[2])).size).toBe(TL_METHODS.length);
  });

  it('is up to date with the schema and free of curated-command clashes (generator check)', () => {
    // generateSource() throws if a namespace/root-method would shadow a curated command.
    const fresh = generateSource();
    expect(readFileSync('src/generated/tl-commands.ts', 'utf8')).toBe(fresh);
  });

  it('maps kebab command paths to the canonical className (top-level + root forms)', () => {
    expect(methodClassName('messages', 'get-history')).toBe('messages.GetHistory');
    expect(methodClassName('help', 'get-config')).toBe('help.GetConfig');
    expect(methodClassName('stats', 'get-broadcast-stats')).toBe('stats.GetBroadcastStats');
    expect(methodClassName('messages', 'nope')).toBeUndefined();
    expect(rootMethodClassName('ping')).toBe('Ping');
    expect(rootMethodClassName('invoke-with-layer')).toBe('InvokeWithLayer');
    expect(rootMethodClassName('messages')).toBeUndefined();
  });

  it('keeps plural acronyms whole in kebab names (IDs, not i-ds)', () => {
    expect(kebabCase('GetContactIDs')).toBe('get-contact-ids');
    expect(kebabCase('GetPeerMaxIDs')).toBe('get-peer-max-ids');
    // other acronym handling is unchanged
    expect(kebabCase('GetDHParams')).toBe('get-dh-params');
    expect(kebabCase('GetHistory')).toBe('get-history');
    expect(kebabCase('SetClientDHParams')).toBe('set-client-dh-params');
    // and the generated table uses the fixed names
    expect(methodClassName('contacts', 'get-contact-ids')).toBe('contacts.GetContactIDs');
    expect(methodClassName('stories', 'get-peer-max-ids')).toBe('stories.GetPeerMaxIDs');
    expect(methodClassName('contacts', 'get-contact-i-ds')).toBeUndefined();
  });

  it('resolves an argv tail only when the operand is a real method (clash-safe)', () => {
    expect(resolveGeneratedCommand(['messages', 'get-history', '--peer', '@x'])).toBe('messages.GetHistory');
    expect(resolveGeneratedCommand(['ping'])).toBe('Ping');
    expect(resolveGeneratedCommand(['stats', 'get-broadcast-stats', '--channel', '@c'])).toBe('stats.GetBroadcastStats');
    expect(resolveGeneratedCommand(['stats', '@chat'])).toBeNull(); // curated keeps it
    expect(resolveGeneratedCommand(['stats'])).toBeNull();
    expect(resolveGeneratedCommand(['contacts'])).toBeNull();
    expect(resolveGeneratedCommand(['stories', '@u'])).toBeNull();
    expect(resolveGeneratedCommand(['help', 'get-config'])).toBe('help.GetConfig');
    expect(resolveGeneratedCommand(['nope', 'thing'])).toBeNull();
  });
});

describe('flag parsing (typed params → request body)', () => {
  it('coerces ints, longs, strings, true-flags and resolves peers via {_chat}', () => {
    const params = buildParams('messages.SendMessage', { peer: '@durov', message: 'hi', silent: true, scheduleDate: '1700000000', effect: '42' });
    expect(params).toMatchObject({ peer: { _chat: '@durov' }, message: 'hi', silent: true, scheduleDate: 1700000000, effect: { _bigint: '42' } });
  });

  it('parses vectors (comma list) and bytes', () => {
    expect(buildParams('messages.DeleteMessages', { id: '1,2,3' }).id).toEqual([1, 2, 3]);
    const part = buildParams('upload.SaveFilePart', { fileId: '5', filePart: '0', bytes: 'aGVsbG8=' });
    expect(part).toMatchObject({ fileId: { _bigint: '5' }, filePart: 0, bytes: { _base64: 'aGVsbG8=' } });
  });

  it('merges --json-params under the typed flags (flags win)', () => {
    const params = buildParams('messages.GetHistory', { peer: '@x', jsonParams: JSON.stringify({ limit: 5, offsetId: 10 }), limit: '20' });
    expect(params).toMatchObject({ peer: { _chat: '@x' }, limit: 20, offsetId: 10 });
  });

  it('defaults omitted paging/cache cursors to 0, keeps real required params required', () => {
    const params = buildParams('messages.GetHistory', { peer: '@durov', limit: '20' });
    expect(params).toMatchObject({ peer: { _chat: '@durov' }, limit: 20, offsetId: 0, offsetDate: 0, addOffset: 0, maxId: 0, minId: 0, hash: { _bigint: '0' } });
    expect(buildParams('messages.GetHistory', { peer: '@x', limit: '5', offsetId: '900' }).offsetId).toBe(900);
    try {
      buildParams('messages.GetHistory', {});
      throw new Error('expected a missing-required error');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/--peer/);
      expect(msg).toMatch(/--limit/);
      expect(msg).not.toMatch(/--offset-id|--hash|--max-id|--min-id/);
    }
    expect('randomId' in buildParams('messages.SendMessage', { peer: '@x', message: 'hi' })).toBe(false);
  });

  it('exposes TL types on each parameter for --help', () => {
    const p = paramsOf('messages.GetHistory');
    expect(p.find(x => x.name === 'peer')).toMatchObject({ kebab: 'peer', type: 'InputPeer', optional: false });
    expect(p.find(x => x.name === 'offsetId')).toMatchObject({ kebab: 'offset-id', type: 'int' });
  });
});

describe('MCP routing of the top-level generated form', () => {
  it('classifies generated namespace/root/clash methods by the underlying TL method', () => {
    expect(planCall('telegram_read', { args: ['messages', 'get-history', '--peer', '@x'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_write', { args: ['messages', 'get-history'] })).toMatch(/use telegram_read/);
    expect(planCall('telegram_write', { args: ['messages', 'send-message', '--peer', '@x'] })).toMatchObject({ readOnly: false });
    expect(planCall('telegram_read', { args: ['messages', 'send-message'] })).toMatch(/use telegram_write/);
    // root method (Ping is not read-prefixed → a write)
    expect(planCall('telegram_write', { args: ['ping'] })).toMatchObject({ readOnly: false });
    // reclassified side-effecting read
    expect(planCall('telegram_read', { args: ['messages', 'get-messages-views', '--peer', '@x', '--id', '1'] })).toMatch(/use telegram_write/);
    // refusals
    expect(planCall('telegram_read', { args: ['account', 'delete-account'] })).toMatch(/irreversible/);
    expect(planCall('telegram_read', { args: ['auth', 'send-code'] })).toMatch(/login|session/i);
  });

  it('keeps curated classification for clash commands when the operand is not a method', () => {
    expect(planCall('telegram_read', { args: ['stats', '@chat'] })).toMatchObject({ readOnly: true }); // curated read
    expect(planCall('telegram_read', { args: ['stats', 'get-broadcast-stats', '--channel', '@c'] })).toMatchObject({ readOnly: true }); // generated read
    expect(planCall('telegram_read', { args: ['contacts'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_read', { args: ['stories', '@u'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_read', { args: ['help'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_read', { args: ['help', 'get-config'] })).toMatchObject({ readOnly: true });
    // auth login (no method) stays a terminal-only command
    expect(planCall('telegram_read', { args: ['auth'] })).toMatch(/not available over MCP/);
  });

  it('classifies --help as a read for any method, including write and refused ones', () => {
    for (const args of [['messages', '--help'], ['messages', 'get-history', '--help'], ['messages', 'send-message', '--help'], ['account', 'delete-account', '--help'], ['auth', 'send-code', '--help'], ['schema', 'messages']]) {
      expect(planCall('telegram_read', { args }), args.join(' ')).toMatchObject({ readOnly: true });
    }
    expect(planCall('telegram_write', { args: ['messages', 'get-history', '--help'] })).toMatch(/only prints help|telegram_read/);
  });
});

describe('embedded descriptions and schema', () => {
  it('covers every TL method with a description or a fallback line', () => {
    expect(TL_DOCS_META.official + TL_DOCS_META.fallback).toBe(823);
    const missing = TL_METHODS.filter(([, , className]) => {
      const d = methodDoc(className);
      return !d || typeof d.d !== 'string' || d.d.length === 0;
    });
    expect(missing.map(m => m[2])).toEqual([]);
  });

  it('has official text for common methods and a clear fallback otherwise', () => {
    expect(methodDoc('messages.GetHistory')!.d).toMatch(/message history/i);
    expect(paramDoc('messages.GetHistory', 'offsetId')).toMatch(/message ID/i);
    // a method new in this layer (no docs page) gets the fallback
    expect(methodDoc('Ping')!.d).toMatch(/No official description/);
    expect(docsUrl('messages.GetHistory')).toBe('https://core.telegram.org/method/messages.getHistory');
  });

  it('classifies access as read/write/refused', () => {
    expect(access('messages.GetHistory').kind).toBe('read');
    expect(access('messages.SendMessage').kind).toBe('write');
    expect(access('account.DeleteAccount')).toMatchObject({ kind: 'refused', reason: expect.stringMatching(/irreversible/) });
  });

  it('builds a method schema with params, access, example and docs link', () => {
    const s = methodSchema('messages', 'get-history', 'messages.GetHistory');
    expect(s).toMatchObject({ command: 'messages get-history', className: 'messages.GetHistory', access: 'read', returns: 'messages.Messages' });
    expect(s.docsUrl).toMatch(/core\.telegram\.org/);
    const peer = s.params.find(p => p.flag === '--peer');
    expect(peer).toMatchObject({ name: 'peer', type: 'InputPeer', required: true, description: expect.any(String) });
    expect(s.params.find(p => p.flag === '--offset-id')).toMatchObject({ required: false, default: '0' });
    expect(s.example).toBe('telegram messages get-history --peer @username --limit 20');
  });

  it('example invocations use only required (non-cursor) params and parse through buildParams', () => {
    expect(exampleInvocation('messages', 'get-history', 'messages.GetHistory')).toContain('--peer @username --limit 20');
    // the example's required flags satisfy buildParams (cursors default, no missing-required error)
    expect(() => buildParams('messages.GetHistory', { peer: '@username', limit: '20' })).not.toThrow();
  });

  it('generated docs source is stable (drift check)', () => {
    expect(readFileSync('src/generated/tl-docs.ts', 'utf8')).toBe(generateDocsSource());
  });

  it('keeps the embedded docs module a reasonable size', () => {
    // ~366 KB today (one JSON string per namespace, brotli-compressed into the bundle). Guard
    // against accidental bloat that would balloon the shipped bundle.
    expect(readFileSync('src/generated/tl-docs.ts', 'utf8').length).toBeLessThan(520_000);
  });
});

describe('CLI, mock mode (top-level form, clashes, help)', () => {
  const home = mkdtempSync(join(tmpdir(), 'tg-gen-home-'));
  const state = join(home, 'state.json');
  const run = (...args: string[]) => execFileSync(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: state, TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const fails = (...args: string[]): string => {
    try { return run(...args); }
    catch (e) { return String((e as { stderr?: string }).stderr ?? '') + String((e as { stdout?: string }).stdout ?? ''); }
  };
  afterAll(async () => { await disconnectClient(); setStrictChatResolution(false); rmSync(home, { recursive: true, force: true }); });

  it('runs a pure-generated namespace read', () => {
    const json = JSON.parse(run('channels', 'get-full-channel', '--channel', 'Team'));
    expect(json.chats[0].title).toBe('Team');
  }, 30_000);

  it('short get-history form works (paging cursors default to 0 — no missing-required error)', () => {
    const err = fails('messages', 'get-history', '--peer', 'Team', '--limit', '3');
    expect(err).not.toMatch(/Missing required/);
  }, 30_000);

  it('clash: stats <chat> is curated, stats <method> is the generated command', () => {
    const curated = JSON.parse(run('stats', 'Team', '--json'));
    expect(curated).toHaveProperty('title'); // curated shaped output
    expect(curated).not.toHaveProperty('className'); // not a raw TL object
    const generated = JSON.parse(run('stats', 'get-broadcast-stats', '--channel', 'Team'));
    expect(generated.className).toBe('stats.BroadcastStats'); // raw TL result
  }, 30_000);

  it('clash: stories only treats an exact method name as the generated command', () => {
    // generated form accepts --peer (a flag the curated `stories <user>` does not have)
    const generated = fails('stories', 'get-peer-stories', '--peer', 'alice');
    expect(generated).not.toMatch(/unknown option/i);
    // curated form treats the operand as <user>; --peer is unknown there
    const curated = fails('stories', 'alice', '--peer', 'x');
    expect(curated).toMatch(/unknown option/i);
  }, 30_000);

  it('help: `help <method>` runs it, `help <command>` shows help', () => {
    expect(fails('help', 'get-config')).toMatch(/help\.GetConfig/); // ran the method (mock: unimplemented)
    expect(run('help', 'stats')).toMatch(/Usage: tg stats/);
    expect(run('help', 'messages')).toMatch(/get-history/); // namespace help lists methods
  }, 30_000);

  it('root methods are top-level commands', () => {
    const help = run('ping', '--help');
    expect(help).toMatch(/Returns: Pong/);
    expect(help).toMatch(/--ping-id <value>\s+long, required/);
  }, 30_000);

  it('a refused method refuses with a clear message and exit 1', () => {
    expect(fails('account', 'delete-account')).toMatch(/Refused:.*irreversible/i);
    expect(fails('auth', 'send-code')).toMatch(/login|session/i);
  }, 30_000);

  it('top-level --help stays small with an API-namespace summary (no 823 lines)', () => {
    const help = run('--help');
    const n = help.split('\n').length;
    expect(n).toBeLessThan(130);
    expect(help).toMatch(/Telegram API — a dedicated command for every TL method/);
    expect(help).toMatch(/messages 259/); // summarized, not one command line each
    // pure-generated namespace groups are not registered as top-level command entries
    expect(help).not.toMatch(/TL API methods/); // the group description, shown only if one were listed
  }, 30_000);

  it('a namespace --help lists its methods with access marks + descriptions', () => {
    const ns = run('messages', '--help');
    expect(ns).toMatch(/get-history/);
    expect(ns.split('\n').filter(l => /^\s{2}\S/.test(l)).length).toBeGreaterThan(100);
    expect(ns).toMatch(/\[read\]/); // get-history etc.
    expect(ns).toMatch(/\[write\]/);
    expect(ns).toMatch(/\[refused\]/);
  }, 30_000);

  it('a method --help shows description, typed params, access, example and docs link', () => {
    const method = run('messages', 'get-history', '--help');
    expect(method).toMatch(/Returns the message history in a peer\./); // official description
    expect(method).toMatch(/--peer <value>\s+InputPeer, required — Target peer/); // type + param desc
    expect(method).toMatch(/--offset-id <value>\s+int, default 0/);
    expect(method).toMatch(/--hash <value>\s+long, default 0/);
    expect(method).toMatch(/Access: read/);
    expect(method).toMatch(/Returns: messages\.Messages/);
    expect(method).toMatch(/Example:\s+telegram messages get-history --peer @username --limit 20/);
    expect(method).toMatch(/core\.telegram\.org\/method\/messages\.getHistory/);
    expect(method).toMatch(/CHANNEL_INVALID/); // common errors
  }, 30_000);

  it('a refused method --help states the refusal + reason (and never runs anything)', () => {
    const help = run('account', 'delete-account', '--help');
    expect(help).toMatch(/Access: refused — Refused:.*irreversible/i);
    expect(help).toMatch(/Delete the user's account/); // official description still shown
  }, 30_000);

  it('schema prints JSON for a method, a namespace, and the index', () => {
    const method = JSON.parse(run('schema', 'messages', 'get-history'));
    expect(method).toMatchObject({ command: 'messages get-history', className: 'messages.GetHistory', access: 'read', returns: 'messages.Messages' });
    expect(method.params.find((p: { flag: string }) => p.flag === '--peer')).toMatchObject({ required: true });
    expect(method.example).toContain('--peer @username --limit 20');
    const nsList = JSON.parse(run('schema', 'messages'));
    expect(Array.isArray(nsList)).toBe(true);
    expect(nsList[0]).toHaveProperty('access');
    const index = JSON.parse(run('schema'));
    expect(index.namespaces.find((n: { namespace: string }) => n.namespace === 'messages')).toMatchObject({ methods: 259 });
    expect(index.rootMethods).toContain('ping');
    // className form and a refused method
    expect(JSON.parse(run('schema', 'account.DeleteAccount'))).toMatchObject({ access: 'refused' });
  }, 30_000);

  it('an auto-generated example invocation parses and satisfies required flags', () => {
    // run the get-history example in mock: it fails to resolve @username, but NOT on parsing/required
    const err = fails('messages', 'get-history', '--peer', '@username', '--limit', '20');
    expect(err).not.toMatch(/Missing required option|unknown option|error:/i);
  }, 30_000);

  it('help output is clean when the pipe closes early (no EPIPE crash)', () => {
    const env = { ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: state, TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' };
    // node stdout → head (closes early); node stderr is inherited to the shell and captured here.
    for (const cmd of ['help', 'help stats', 'help messages', 'messages --help']) {
      const r = spawnSync('sh', ['-c', `node --import tsx src/index.ts ${cmd} | head -c 20`], { env, encoding: 'utf8' });
      expect(r.stderr, `${cmd}: ${r.stderr}`).not.toMatch(/EPIPE|Unhandled 'error'/);
    }
  }, 30_000);

  it('a clash command --help shows curated usage plus a generated-methods pointer', () => {
    const help = run('stats', '--help');
    expect(help).toMatch(/Usage: tg stats \[options\] <chat>/); // curated usage intact
    expect(help).toMatch(/Generated API methods \(telegram stats <method>/);
    expect(help).toMatch(/get-broadcast-stats/);
  }, 30_000);
});
