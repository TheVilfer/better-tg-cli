import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import apiDefinitions from 'teleproto/tl/generated/api-definitions.js';
import { generateSource } from '../scripts/gen-tl-commands.mjs';
import { TL_METHODS } from '../src/generated/tl-commands.js';
import { buildParams, paramsOf } from '../src/commands/tl.js';
import { resolveTlPath } from '../src/tl-registry.js';
import { planCall, tlPositionals } from '../src/mcp.js';
import { disconnectClient } from '../src/client.js';
import { setStrictChatResolution } from '../src/resolve-mode.js';

afterEach(async () => {
  await disconnectClient();
  setStrictChatResolution(false);
});

const schemaFunctionCount = (apiDefinitions as unknown as { isFunction: boolean }[]).filter(d => d.isFunction).length;

describe('generated tl command table', () => {
  it('has exactly one entry per TL schema method (823 functions)', () => {
    expect(TL_METHODS.length).toBe(schemaFunctionCount);
    expect(TL_METHODS.length).toBe(823);
    // Every className unique
    expect(new Set(TL_METHODS.map(m => m[2])).size).toBe(TL_METHODS.length);
  });

  it('is up to date with the schema (generator drift check)', () => {
    const fresh = generateSource();
    const committed = readFileSync('src/generated/tl-commands.ts', 'utf8');
    expect(committed).toBe(fresh);
  });

  it('maps kebab command paths back to the canonical className', () => {
    expect(resolveTlPath(['messages', 'get-history'])).toEqual({ className: 'messages.GetHistory' });
    expect(resolveTlPath(['help', 'get-config'])).toEqual({ className: 'help.GetConfig' });
    expect(resolveTlPath(['ping'])).toEqual({ className: 'Ping' }); // top-level wrapper
    expect(resolveTlPath(['messages', 'nope'])).toMatchObject({ error: expect.stringMatching(/Unknown method/) });
    expect(resolveTlPath(['nope'])).toMatchObject({ error: expect.stringMatching(/Unknown tl command/) });
    expect(resolveTlPath(['messages'])).toMatchObject({ error: expect.stringMatching(/needs a method/) });
  });
});

describe('tl flag parsing (typed params → request body)', () => {
  it('coerces ints, longs, strings, true-flags and resolves peers via {_chat}', () => {
    const params = buildParams('messages.SendMessage', {
      peer: '@durov',
      message: 'hi',
      silent: true,
      scheduleDate: '1700000000',
      effect: '42', // long (flag) → bigint marker
    });
    expect(params.peer).toEqual({ _chat: '@durov' });
    expect(params.message).toBe('hi');
    expect(params.silent).toBe(true);
    expect(params.scheduleDate).toBe(1700000000); // int
    expect(params.effect).toEqual({ _bigint: '42' }); // long
  });

  it('parses vectors (comma list) and bytes', () => {
    const del = buildParams('messages.DeleteMessages', { id: '1,2,3' });
    expect(del.id).toEqual([1, 2, 3]);
    const part = buildParams('upload.SaveFilePart', { fileId: '5', filePart: '0', bytes: 'aGVsbG8=' });
    expect(part.fileId).toEqual({ _bigint: '5' });
    expect(part.filePart).toBe(0);
    expect(part.bytes).toEqual({ _base64: 'aGVsbG8=' });
  });

  it('merges --json-params under the typed flags (flags win)', () => {
    const params = buildParams('messages.GetHistory', {
      peer: '@x',
      jsonParams: JSON.stringify({ limit: 5, offsetId: 10 }),
      limit: '20',
    });
    expect(params).toMatchObject({ peer: { _chat: '@x' }, limit: 20, offsetId: 10 });
  });

  it('defaults omitted paging/cache cursors to 0 (short get-history works)', () => {
    const params = buildParams('messages.GetHistory', { peer: '@durov', limit: '20' });
    expect(params).toMatchObject({
      peer: { _chat: '@durov' }, limit: 20,
      offsetId: 0, offsetDate: 0, addOffset: 0, maxId: 0, minId: 0,
      hash: { _bigint: '0' }, // long cursor defaulted as a bigint
    });
    // an explicit cursor flag still wins over the 0 default
    expect(buildParams('messages.GetHistory', { peer: '@x', limit: '5', offsetId: '900' }).offsetId).toBe(900);
  });

  it('requires genuinely-required params but not cursors or the auto-filled randomId', () => {
    expect(() => buildParams('channels.GetFullChannel', {})).toThrow(/Missing required option\(s\): --channel/);
    // get-history with nothing: --peer and --limit are required, the cursors are not listed
    try {
      buildParams('messages.GetHistory', {});
      throw new Error('expected a missing-required error');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/--peer/);
      expect(msg).toMatch(/--limit/);
      expect(msg).not.toMatch(/--offset-id|--hash|--max-id|--min-id/);
    }
    // messages.SendMessage omits randomId without complaint (teleproto fills it)
    const ok = buildParams('messages.SendMessage', { peer: '@x', message: 'hi' });
    expect('randomId' in ok).toBe(false);
  });

  it('exposes TL types on each parameter for --help', () => {
    const p = paramsOf('messages.GetHistory');
    const peer = p.find(x => x.name === 'peer');
    expect(peer).toMatchObject({ kebab: 'peer', type: 'InputPeer', optional: false });
    expect(p.find(x => x.name === 'offsetId')).toMatchObject({ kebab: 'offset-id', type: 'int' });
  });
});

describe('MCP routing of tl commands', () => {
  it('finds the leading command path', () => {
    expect(tlPositionals(['tl', 'messages', 'get-history', '--peer', '@x'])).toEqual(['messages', 'get-history']);
    expect(tlPositionals(['tl', 'ping'])).toEqual(['ping']);
    expect(tlPositionals(['tl'])).toEqual([]);
  });

  it('classifies reads, writes and refusals by the underlying method', () => {
    expect(planCall('telegram_read', { args: ['tl', 'messages', 'get-history', '--peer', '@x'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_write', { args: ['tl', 'messages', 'get-history'] })).toMatch(/use telegram_read/);
    expect(planCall('telegram_write', { args: ['tl', 'messages', 'send-message', '--peer', '@x'] })).toMatchObject({ readOnly: false });
    expect(planCall('telegram_read', { args: ['tl', 'messages', 'send-message'] })).toMatch(/use telegram_write/);
    expect(planCall('telegram_read', { args: ['tl', 'account', 'delete-account'] })).toMatch(/irreversible/);
    expect(planCall('telegram_read', { args: ['tl', 'auth', 'send-code'] })).toMatch(/login|session/i);
    // A reclassified side-effecting read is a write.
    expect(planCall('telegram_read', { args: ['tl', 'messages', 'get-messages-views', '--peer', '@x', '--id', '1'] })).toMatch(/use telegram_write/);
    // Listing / help is a harmless read; an unknown path is rejected.
    expect(planCall('telegram_read', { args: ['tl', 'messages', '--help'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_read', { args: ['tl', 'bogus', 'thing'] })).toMatch(/Unknown tl command/);
  });
});

describe('tl help stays usable (CLI, mock mode)', () => {
  const home = mkdtempSync(join(tmpdir(), 'tg-tl-home-'));
  const state = join(home, 'state.json');
  const run = (...args: string[]) => execFileSync(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: state, TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  afterAll(() => rmSync(home, { recursive: true, force: true }));

  it('top-level --help lists tl on one line, not 823 commands', () => {
    const help = run('--help');
    const tlLines = help.split('\n').filter(l => /^\s*tl\b/.test(l));
    expect(tlLines.length).toBe(1);
    expect(help.split('\n').length).toBeLessThan(120);
  });

  it('a namespace --help lists its methods', () => {
    const help = run('tl', 'messages', '--help');
    expect(help).toMatch(/get-history/);
    expect(help).toMatch(/send-message/);
    // lots of methods, but these are names only
    expect(help.split('\n').filter(l => /^\s{2}\S/.test(l)).length).toBeGreaterThan(100);
  });

  it('a method --help shows its params with TL types, required/optional and defaulted cursors', () => {
    const help = run('tl', 'messages', 'get-history', '--help');
    expect(help).toMatch(/--peer <value>/);
    expect(help).toMatch(/InputPeer, required/);
    expect(help).toMatch(/--limit <value>/);
    expect(help).toMatch(/int, required/); // limit stays required
    expect(help).toMatch(/--offset-id <value>\s+int, default 0/); // paging cursor defaulted
    expect(help).toMatch(/--hash <value>\s+long, default 0/);
    expect(help).toMatch(/--json-params/);
  });

  it('a refused method says it is always refused in --help', () => {
    const help = run('tl', 'account', 'delete-account', '--help');
    expect(help).toMatch(/always refused/i);
  });
});

describe('tl end to end (CLI, mock mode)', () => {
  const home = mkdtempSync(join(tmpdir(), 'tg-tl-e2e-'));
  const state = join(home, 'state.json');
  const run = (env: Record<string, string>, ...args: string[]) => execFileSync(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const fails = (env: Record<string, string>, ...args: string[]): string => {
    try { run(env, ...args); return ''; }
    catch (e) { return String((e as { stderr?: string; stdout?: string }).stderr ?? '') + String((e as { stdout?: string }).stdout ?? ''); }
  };
  afterAll(() => rmSync(home, { recursive: true, force: true }));

  it('runs a read through the generated command', () => {
    const out = run({ TG_MOCK: state }, 'tl', 'channels', 'get-full-channel', '--channel', 'Team');
    const json = JSON.parse(out);
    expect(json.chats[0].title).toBe('Team');
  }, 30_000);

  it('a write is blocked without write access (read-only guard)', () => {
    const err = fails({ TG_MOCK: state, TG_READ_ONLY: '1' }, 'tl', 'messages', 'delete-messages', '--id', '1');
    expect(err).toMatch(/cannot run as a read|write/i);
  }, 30_000);

  it('a refused method refuses with a clear message and exit 1', () => {
    const err = fails({ TG_MOCK: state }, 'tl', 'account', 'delete-account');
    expect(err).toMatch(/Refused:.*irreversible/i);
    const authErr = fails({ TG_MOCK: state }, 'tl', 'auth', 'send-code');
    expect(authErr).toMatch(/login|session/i);
  }, 30_000);
});
