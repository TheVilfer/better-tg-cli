import { afterAll, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cliArgs } from './cli.js';

// Before any module under test is imported: a temp HOME, so nothing here touches a real profile
const env = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'tg-plugin-run-'));
  Object.assign(process.env, { HOME: root, USERPROFILE: root, APPDATA: join(root, 'AppData'), TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' });
  delete process.env.TG_MOCK;
  return { root };
});

import { classifyCall, childEnv, handleMessage, planCall, PluginRuns, result, setKnownCommands, type RunOutput } from '../src/mcp.js';
import { commandPaths } from '../src/mcp.js';
import { devLog } from '../src/plugins/run.js';

const TONE = resolve('test/fixtures/plugins/tone-of-voice');
const LAB = resolve('test/fixtures/plugins/sandbox-lab');
afterAll(() => rmSync(env.root, { recursive: true, force: true }));

let n = 0;
function newHome(): string {
  const h = join(env.root, `h${++n}`);
  mkdirSync(h);
  return h;
}

interface Run { code: number | null; out: string; err: string; json: any }
function homeEnv(home: string, extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = {
    ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: join(home, 'mock-state.json'),
    TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '',
  };
  for (const k of ['TG_MOCK_ASK', 'TG_MOCK_HUMAN', 'TG_APPROVE', 'TG_MCP', 'TG_READ_ONLY', 'TG_MCP_WORKER']) delete e[k];
  for (const [k, v] of Object.entries(extra)) { if (v === undefined) delete e[k]; else e[k] = v; }
  return e;
}
function cli(home: string, args: string[], extra: Record<string, string | undefined> = {}, input = ''): Run {
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], { encoding: 'utf8', env: homeEnv(home, extra), input });
  let json: unknown;
  try { json = JSON.parse(r.stdout.trim().split('\n').at(-1) ?? ''); } catch { json = undefined; }
  return { code: r.status, out: r.stdout, err: r.stderr, json };
}
const install = (home: string, dir: string) => {
  const r = cli(home, ['plugin', 'install', dir, '--json'], { TG_MOCK_HUMAN: 'yes' });
  expect(r.json, r.err).toMatchObject({ ok: true });
  return r.json as { installId: string; revision: string };
};
/** The profile's config folder as configDir() builds it for this HOME (APPDATA on Windows). */
const profileDir = (home: string, name: string) => (process.platform === 'win32' ? join(home, 'AppData', name) : join(home, '.config', name));
const audit = (home: string) => readFileSync(join(profileDir(home, 'tg-mock'), 'audit.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
const lab = (home: string, args: string[], extra: Record<string, string | undefined> = {}, input = '') => cli(home, ['plugin', 'run', 'sandbox-lab', ...args, '--json'], extra, input);
const probe = (home: string, op: string, args: unknown[] = [], extra: Record<string, string | undefined> = {}) =>
  lab(home, ['probe', '--input', JSON.stringify({ op, args })], extra);

const paths = (() => {
  const help = spawnSync(process.execPath, [...cliArgs(), 'help-all'], { encoding: 'utf8', env: homeEnv(env.root) }).stdout;
  const names = help.split('\n').filter(l => /^[a-z]/.test(l) && l.includes(' — ')).map(l => l.slice(0, l.indexOf(' — ')).split(' ').filter((w, i, all) => !all.slice(0, i + 1).some(x => /^[<[]/.test(x))).join(' '));
  return [...new Set(names.flatMap(p => p.split(' ').map((_, i, w) => w.slice(0, i + 1).join(' '))))];
})();

type Reply = { result: { content: { text: string }[]; isError?: boolean; structuredContent?: Record<string, any> } };
const call = (name: string, args: Record<string, unknown>, id = 1) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

/** Runs `fn` with this home's mock as the MCP server's environment; calls go to a child CLI. */
async function asServer<T>(home: string, extra: Record<string, string>, fn: (run: (plan: Parameters<typeof childEnv>[0]) => Promise<ReturnType<typeof result>>) => Promise<T>): Promise<T> {
  setKnownCommands(paths);
  const vars: Record<string, string> = { HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: join(home, 'mock-state.json'), TG_PROFILE: '', ...extra };
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  Object.assign(process.env, vars);
  try {
    return await fn(async plan => {
      const r = spawnSync(process.execPath, [...cliArgs(), ...plan.argv], { encoding: 'utf8', input: plan.stdin ?? '', env: childEnv(plan) });
      return result(plan, { code: r.status, timedOut: false, out: r.stdout, err: r.stderr } as RunOutput);
    });
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

describe('plugin run: the reference Tone of Voice collect', { timeout: 120_000 }, () => {
  it('pages with cursor and limit = remaining until done; the last page keeps cursor: null (shell and MCP)', async () => {
    const h = newHome();
    install(h, TONE);
    const collected: string[] = [];
    let input: Record<string, unknown> = { limit: 4, types: ['private', 'group'] };
    let last: Run | undefined;
    for (let i = 0; i < 10; i++) {
      last = cli(h, ['plugin', 'run', 'tone-of-voice', 'collect', '--input', JSON.stringify(input), '--json']);
      expect(last.code, last.out + last.err).toBe(0);
      const { data, proposals } = last.json;
      expect(proposals).toEqual([]);
      collected.push(...data.messages.map((m: { text: string }) => m.text));
      if (data.done || data.remaining === 0) {
        if (data.done) break;
        input = { limit: 4, cursor: data.cursor };
        continue;
      }
      input = { limit: data.remaining, cursor: data.cursor };
    }
    expect(last!.json.data.done).toBe(true);
    // The actual JSON from the shell: null is there, not dropped
    expect(last!.out).toContain('"cursor":null');
    expect(new Set(collected).size).toBe(collected.length);
    expect(collected).toContain('Note to self: renew the domain');
    // The same last page over MCP
    await asServer(h, {}, async run => {
      const r = await handleMessage(call('telegram_read', { args: ['plugin', 'run', 'tone-of-voice', 'collect', '--input', JSON.stringify({ limit: 2000, types: ['private', 'group'] }), '--json'] }), run) as Reply;
      expect(r.result.isError).toBeUndefined();
      expect(r.result.content[0].text).toContain('"cursor":null');
      expect(JSON.parse(r.result.content[0].text).data.messages).toHaveLength(collected.length);
    });
    // The audit: plugin, revision, command, API names, outcome; no input, no result
    const entry = audit(h).filter(e => e.command === 'plugin run').at(-1);
    expect(entry).toMatchObject({ target: 'tone-of-voice', plugin: { command: 'collect', apis: ['messages.mine'], proposals: [] }, result: { success: true } });
    expect(JSON.stringify(audit(h))).not.toContain('renew the domain');
    expect(JSON.stringify(audit(h))).not.toContain('"limit"');
  });

  it('a FLOOD_WAIT the command passes on is an error with retryAfterSeconds, the cursor and the partial page', () => {
    const h = newHome();
    install(h, TONE);
    const r = cli(h, ['plugin', 'run', 'tone-of-voice', 'collect', '--input', '{"limit":50,"types":["private","group"]}', '--json'], { TG_MOCK_FLOOD_HISTORY: '2:9' });
    expect(r.code).toBe(1);
    expect(r.json.error).toMatchObject({ code: 'flood_wait', retryAfterSeconds: 9, cursor: expect.any(String), partial: { count: expect.any(Number) } });
    const rest = cli(h, ['plugin', 'run', 'tone-of-voice', 'collect', '--input', JSON.stringify({ limit: 50, cursor: r.json.error.cursor }), '--json']);
    const all = cli(h, ['plugin', 'run', 'tone-of-voice', 'collect', '--input', '{"limit":50,"types":["private","group"]}', '--json']);
    const got = [...r.json.error.partial.messages, ...rest.json.data.messages].map((m: { text: string }) => m.text);
    expect(got).toEqual(all.json.data.messages.map((m: { text: string }) => m.text));
  });
});

describe('plugin run: input, output, target, proposals', { timeout: 120_000 }, () => {
  const h = newHome();
  it('installs the lab', () => { install(h, LAB); });

  it('input is checked by the schema (exit 2) before anything runs; --input - reads stdin', () => {
    const bad = lab(h, ['probe', '--input', '{"op":1}']);
    expect(bad.code).toBe(2);
    expect(bad.json.error).toMatchObject({ code: 'invalid_argument', issues: [{ path: '/op' }] });
    expect(lab(h, ['probe', '--input', 'not json']).code).toBe(2);
    const piped = lab(h, ['probe', '--input', '-'], {}, '{"op":"me"}');
    expect(piped.json.data).toEqual({ op: 'me', result: { id: '1000', name: 'Mock Owner', username: 'mock_owner' } });
    expect(lab(h, ['nope']).json.error).toMatchObject({ code: 'invalid_argument' });
  });

  it('output is checked by the schema; null survives', () => {
    const ok = lab(h, ['strict', '--input', '{"value":{"n":1,"next":null}}']);
    expect(ok.out).toContain('{"data":{"n":1,"next":null},"proposals":[]}');
    const bad = lab(h, ['strict', '--input', '{"value":{"n":"one","next":null}}']);
    expect(bad.code).toBe(1);
    expect(bad.json.error).toMatchObject({ code: 'plugin_error', issues: [{ path: '/n' }] });
  });

  it('limits and escapes surface as plugin_limit / plugin_error with exit 1', () => {
    expect(probe(h, 'burst').json.error).toMatchObject({ code: 'plugin_limit', limit: 'concurrentCalls' });
    expect(probe(h, 'many').json.error).toMatchObject({ code: 'plugin_limit', limit: 'hostCalls' });
    expect(probe(h, 'bigArgs').json.error).toMatchObject({ code: 'plugin_limit', limit: 'callBytes' });
    expect(probe(h, 'hugeOutput').json.error).toMatchObject({ code: 'plugin_limit', limit: 'output' });
    expect(probe(h, 'big').json.error).toMatchObject({ code: 'plugin_limit', limit: 'memory' });
    expect(probe(h, 'never').json.error).toMatchObject({ code: 'plugin_error' });
    expect(probe(h, 'globals').json.data.result).toMatchObject({ require: 'undefined', process: 'undefined', bridge: 'undefined', viaFunction: 'undefined' });
    expect(probe(h, 'granted').json.data.result).toEqual({ set: 'undefined', propose: 'undefined', log: 'undefined' });
    expect(probe(h, 'proto').code).toBe(0);
  });

  it('--target: one message, or nothing without it; a plugin without the permission refuses it', () => {
    const t = lab(h, ['probe', '--input', '{"op":"target"}', '--target', '1001:5']);
    expect(t.json.data.result).toMatchObject({ chatId: '1001', message: { id: 5 } });
    expect(probe(h, 'target').json.error.message).toMatch(/no --target/);
    expect(lab(h, ['probe', '--input', '{"op":"me"}', '--target', 'Alice:5']).code).toBe(2);
    expect(lab(h, ['probe', '--input', '{"op":"me"}', '--thread']).code).toBe(2);
    install(h, TONE);
    expect(cli(h, ['plugin', 'run', 'tone-of-voice', 'collect', '--input', '{"limit":1}', '--target', '1001:5', '--json']).code).toBe(2);
  });

  it('proposals: only the host writes the field; a plugin\'s own "proposals" stay inside data', () => {
    const r = lab(h, ['propose', '--input', JSON.stringify({ actions: [{ type: 'reply', chat: '1001', msgId: 5, text: 'On my way' }, { type: 'react', chat: '1001', msgId: 5, emoji: '👍' }] })]);
    expect(r.code, r.out).toBe(0);
    expect(r.json.proposals).toEqual([
      { id: 'p1', type: 'reply', confirm: true, stdin: 'On my way', argv: ['reply', '1001', '5', '-'], summary: 'Reply in 1001 to message 5: "On my way"' },
      { id: 'p2', type: 'react', confirm: true, argv: ['react', '1001', '5', '👍'], summary: 'React in 1001 to message 5 with 👍' },
    ]);
    expect(r.json.data.proposals[0]).toMatchObject({ id: 'forged' });
    expect(r.json.data.ids).toEqual(['p1', 'p2']);
    const forged = lab(h, ['propose', '--input', JSON.stringify({ actions: [{ type: 'send', chat: '1001', text: 'x', argv: ['delete', '1001', '5'] }] })]);
    expect(forged.code).toBe(1);
    expect(forged.json.error.code).toBe('plugin_error');
    expect(audit(h).filter(e => e.command === 'plugin run' && e.plugin.command === 'propose' && e.result.success).at(-1).plugin.proposals).toEqual(['reply', 'react']);
  });

  it('effects storage: a local write in the shell, refused on the MCP read tool (TG_READ_ONLY) with nothing saved', () => {
    expect(lab(h, ['save', '--input', '{"value":"first"}']).json.data).toEqual({ saved: 5 });
    expect(probe(h, 'get').json.data.result).toBe('first');
    const refused = lab(h, ['save', '--input', '{"value":"second"}'], { TG_MCP: '1', TG_READ_ONLY: '1' });
    expect(refused.code).toBe(1);
    expect(refused.json.error.code).toBe('write_on_read_tool');
    expect(probe(h, 'get').json.data.result).toBe('first');
    expect(cli(h, ['plugin', 'data', 'get', 'sandbox-lab', 'notes']).out).toBe('first\n');
  });
});

describe('plugin run over MCP: classification, approval, snapshot binding', { timeout: 120_000 }, () => {
  it('classified per call from the installed manifest: no effects → read; storage/actions → write; dev never', async () => {
    const h = newHome();
    install(h, LAB);
    await asServer(h, {}, async run => {
      const cls = (args: string[]) => classifyCall(args);
      expect(cls(['plugin', 'run', 'sandbox-lab', 'probe', '--input', '{"op":"me"}'])).toMatchObject({ group: 'read' });
      expect(cls(['plugin', 'run', '--input', '{}', 'sandbox-lab', 'save'])).toMatchObject({ group: 'write' });
      expect(cls(['plugin', 'run', 'sandbox-lab', 'propose', '--target', '1:2', '--json'])).toMatchObject({ group: 'write' });
      // Unknown plugin or command: routed as a read; the run itself reports it
      expect(cls(['plugin', 'run', 'missing', 'x'])).toMatchObject({ group: 'read' });
      expect(cls(['plugin', 'dev', LAB, 'probe', '--mock'])).toMatchObject({ group: 'never' });
      expect(planCall('telegram_read', { args: ['plugin', 'run', 'sandbox-lab', 'save', '--input', '{"value":"x"}'] })).toMatch(/use telegram_write/);
      expect(planCall('telegram_write', { args: ['plugin', 'run', 'sandbox-lab', 'probe', '--input', '{"op":"me"}'] })).toMatch(/use telegram_read/);
      const missing = await handleMessage(call('telegram_read', { args: ['plugin', 'run', 'missing', 'x', '--json'] }), run) as Reply;
      expect(missing.result.isError).toBe(true);
      expect(missing.result.content[0].text).toMatch(/plugin_not_found|No plugin named/);
      const ro = await handleMessage(call('telegram_write', { args: ['plugin', 'run', 'sandbox-lab', 'save', '--input', '{"value":"x"}'] }), run, { readOnly: true }) as Reply;
      expect(ro.result.content[0].text).toMatch(/read-only/);
      // Over MCP the output is masked too (the lab's own data echoes a code)
      const saved = await handleMessage(call('telegram_write', { args: ['plugin', 'run', 'sandbox-lab', 'save', '--input', '{"value":"Your code: 12345"}', '--json'] }), run) as Reply;
      expect(saved.result.isError, saved.result.content[0].text).toBeUndefined();
      const got = await handleMessage(call('telegram_read', { args: ['plugin', 'run', 'sandbox-lab', 'probe', '--input', '{"op":"get"}', '--json'] }), run) as Reply;
      expect(got.result.content[0].text).toContain('[login code hidden]');
      expect(got.result.content[0].text).not.toContain('12345');
    });
  });

  it('mode "ask": the approval shows installation, effects and input; a snapshot swapped in between is not run', async () => {
    const h = newHome();
    // A copy of the lab whose content can change, installed from a folder of its own
    const dir = join(h, 'lab');
    cpSync(LAB, dir, { recursive: true });
    install(h, dir);
    await asServer(h, { TG_MOCK_ASK: '1' }, async run => {
      const args = ['plugin', 'run', 'sandbox-lab', 'save', '--input', '-', '--json'];
      const first = await handleMessage(call('telegram_write', { args, stdin: '{"value":"approved"}' }), run) as Reply;
      const s = first.result.structuredContent!;
      expect(s.status).toBe('approval_required');
      expect(s.action.description).toMatch(/Run a plugin command[\s\S]*Plugin: sandbox-lab[\s\S]*Command: save[\s\S]*Installation: [0-9a-f-]{36}[\s\S]*Effects: storage[\s\S]*Input: \{"value":"approved"\}/);
      const ok = await handleMessage(call('telegram_write', { args, stdin: '{"value":"approved"}', approval: s.code }), run) as Reply;
      expect(ok.result.content[0].text).toContain('"saved":8');
      // A second approval, then the plugin is replaced by another snapshot (same name, new content)
      const again = (await handleMessage(call('telegram_write', { args, stdin: '{"value":"swapped"}' }), run) as Reply).result.structuredContent!;
      expect(again.status).toBe('approval_required');
      expect(cli(h, ['plugin', 'remove', 'sandbox-lab', '--keep-data', '--json'], { TG_MOCK_HUMAN: 'yes' }).json).toMatchObject({ ok: true });
      writeFileSync(join(dir, 'code', 'lab.js'), readFileSync(join(dir, 'code', 'lab.js'), 'utf8') + '\n// changed\n');
      install(h, dir);
      const used = await handleMessage(call('telegram_write', { args, stdin: '{"value":"swapped"}', approval: again.code }), run) as Reply;
      expect(used.result.content[0].text).not.toContain('"saved"');
      // The code was for the old installation: the action now hashes differently and needs a new yes
      expect(used.result.structuredContent?.status).toBe('approval_required');
      const installation = (d: string) => /Installation: ([0-9a-f-]{36})/.exec(d)?.[1];
      expect(installation(used.result.structuredContent?.action.description)).not.toBe(installation(again.action.description));
    });
    // Nothing ran under the old approval: the new installation has no data
    expect(cli(h, ['plugin', 'data', 'list', 'sandbox-lab', '--json']).json.items).toEqual([]);
    // The guard's own exits (describe runs, approval_required) are no runs: only the approved one is audited
    expect(audit(h).filter(e => e.command === 'plugin run').map(e => e.result)).toEqual([{ success: true }]);
  });
});

describe('PluginRuns: what a cancellation reaches', () => {
  it('a waiting call is skipped; a cancel for an id that is not waiting or running is forgotten', () => {
    const runs = new PluginRuns();
    runs.arrived(5);
    runs.cancel(5);
    expect(runs.begin(5).aborted).toBe(true);
    runs.end(5);
    runs.settled(5);
    // A finished call's id (HTTP sessions reuse ids) and an id never seen: a later run with it still runs
    runs.cancel(5);
    runs.cancel('never');
    runs.arrived(5);
    expect(runs.begin(5).aborted).toBe(false);
    runs.end(5);
    runs.settled(5);
    runs.arrived('never');
    expect(runs.begin('never').aborted).toBe(false);
  });

  it('a running call is aborted; after the channel closed nothing starts', () => {
    const runs = new PluginRuns();
    runs.arrived(1);
    const signal = runs.begin(1);
    runs.cancel(1);
    expect(signal.aborted).toBe(true);
    runs.cancelAll();
    runs.arrived(2);
    expect(runs.begin(2).aborted).toBe(true);
  });
});

describe('plugin run over MCP: cancellation', { timeout: 120_000 }, () => {
  /** A real `telegram mcp` server over stdio. */
  function server(home: string, extra: Record<string, string> = {}) {
    const p = spawn(process.execPath, [...cliArgs(), 'mcp'], { env: homeEnv(home, extra), stdio: ['pipe', 'pipe', 'pipe'] });
    const replies = new Map<unknown, (m: unknown) => void>();
    const got = new Set<unknown>();
    let buf = '';
    p.stdout.on('data', d => {
      buf += d;
      for (let i; (i = buf.indexOf('\n')) >= 0;) {
        const m = JSON.parse(buf.slice(0, i)) as { id?: unknown };
        buf = buf.slice(i + 1);
        got.add(m.id);
        replies.get(m.id)?.(m);
      }
    });
    const send = (m: object) => p.stdin.write(JSON.stringify(m) + '\n');
    const request = (id: number, m: object) => new Promise<any>(r => { replies.set(id, r); send({ jsonrpc: '2.0', id, ...m }); });
    const exited = new Promise<number | null>(r => p.on('exit', code => r(code)));
    return { p, send, request, got, exited };
  }

  for (const [label, extra] of [['child process', {}], ['worker thread', { TG_MCP_WORKER: '1' }]] as const) {
    it(`${label}: a running and a queued run are cancelled past the queue, get no reply, and the next call runs`, async () => {
      const h = newHome();
      install(h, LAB);
      const s = server(h, extra);
      await s.request(0, { method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {} } });
      const started = Date.now();
      void s.request(1, { method: 'tools/call', params: { name: 'telegram_read', arguments: { args: ['plugin', 'run', 'sandbox-lab', 'probe', '--input', '{"op":"spin"}', '--json'] } } });
      void s.request(2, { method: 'tools/call', params: { name: 'telegram_read', arguments: { args: ['plugin', 'run', 'sandbox-lab', 'probe', '--input', '{"op":"me"}', '--json'] } } });
      await new Promise(r => setTimeout(r, 1500));
      s.send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1, reason: 'user' } });
      s.send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 2 } });
      const next = await s.request(3, { method: 'tools/call', params: { name: 'telegram_read', arguments: { args: ['plugin', 'list', '--json'] } } });
      expect(next.result.isError).toBeUndefined();
      expect(Date.now() - started).toBeLessThan(20_000);
      expect(s.got.has(1)).toBe(false);
      expect(s.got.has(2)).toBe(false);
      s.p.stdin.end();
      await s.exited;
      // In a worker the shared flag stops the busy sandbox itself, so the run is audited as cancelled
      if (label === 'worker thread') {
        expect(audit(h).filter(e => e.command === 'plugin run').at(-1)).toMatchObject({ result: { success: false, error: 'cancelled' } });
      }
    });
  }

  it('closing stdio cancels a run in progress', async () => {
    const h = newHome();
    install(h, LAB);
    const s = server(h);
    await s.request(0, { method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {} } });
    void s.request(1, { method: 'tools/call', params: { name: 'telegram_read', arguments: { args: ['plugin', 'run', 'sandbox-lab', 'probe', '--input', '{"op":"spin"}', '--json'] } } });
    await new Promise(r => setTimeout(r, 1500));
    const t = Date.now();
    s.p.stdin.end();
    await s.exited;
    expect(Date.now() - t).toBeLessThan(15_000);
    expect(s.got.has(1)).toBe(false);
  });
});

describe('plugin dev --mock', { timeout: 60_000 }, () => {
  it('runs a folder against the mock account in memory; host.log goes to its own file only', () => {
    const h = newHome();
    const r = cli(h, ['plugin', 'dev', LAB, 'probe', '--mock', '--input', '{"op":"granted"}', '--json'], { TG_MOCK: undefined });
    expect(r.code, r.err).toBe(0);
    expect(r.json.data.result.log).toBe('function');
    expect(cli(h, ['plugin', 'dev', LAB, 'probe', '--input', '{"op":"me"}', '--json'], { TG_MOCK: undefined }).code).toBe(2);
    expect(cli(h, ['plugin', 'dev', LAB, 'probe', '--mock', '--input', '{"op":"me"}', '--json'], { TG_MCP: '1' }).json.error.code).toBe('not_available');
    const logged = cli(h, ['plugin', 'dev', LAB, 'probe', '--mock', '--input', '{"op":"log"}', '--json'], { TG_MOCK: undefined });
    expect(logged.json.data.result).toBe('logged');
    expect(logged.out + logged.err).not.toContain('debug line');
    expect(readFileSync(devLog('sandbox-lab').path, 'utf8')).toMatch(/debug line \{"n":1\}\n$/);
    // No profile was touched: no config folder, no plugin store
    expect(existsSync(profileDir(h, 'tg'))).toBe(false);
    expect(existsSync(profileDir(h, 'tg-mock'))).toBe(false);
  });
});

it('the paths helper sees plugin run and dev', () => {
  expect(paths).toEqual(expect.arrayContaining(['plugin run', 'plugin dev']));
  expect(commandPaths).toBeTypeOf('function');
});
