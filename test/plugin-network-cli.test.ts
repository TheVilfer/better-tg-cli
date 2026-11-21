import { afterAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cliArgs } from './cli.js';

// Before any module under test is imported: a temp HOME, so nothing here touches a real profile.
// Every child runs with TG_MOCK=<a file in its own HOME>: HTTP is answered from the mock's
// fixtures (mock-http/*.json beside it), secrets from the mock's file; no network, no secret store.
const env = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'tg-plugin-net-'));
  Object.assign(process.env, { HOME: root, USERPROFILE: root, APPDATA: join(root, 'AppData'), TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' });
  delete process.env.TG_MOCK;
  return { root };
});

import { childEnv, classifyCall, handleMessage, planCall, result, setKnownCommands, type RunOutput } from '../src/mcp.js';

const LAB = resolve('test/fixtures/plugins/net-lab');
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
  for (const k of ['TG_MOCK_ASK', 'TG_MOCK_HUMAN', 'TG_APPROVE', 'TG_MCP', 'TG_READ_ONLY', 'TG_MCP_WORKER', 'HTTPS_PROXY', 'HTTP_PROXY']) delete e[k];
  for (const [k, v] of Object.entries(extra)) { if (v === undefined) delete e[k]; else e[k] = v; }
  return e;
}
function cli(home: string, args: string[], extra: Record<string, string | undefined> = {}, input = ''): Run {
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], { encoding: 'utf8', env: homeEnv(home, extra), input });
  let json: unknown;
  try { json = JSON.parse(r.stdout.trim().split('\n').at(-1) ?? ''); } catch { json = undefined; }
  return { code: r.status, out: r.stdout, err: r.stderr, json };
}
const plugins = (home: string) => join(home, 'mock-state.plugins');
const install = (home: string, dir = LAB) => {
  const r = cli(home, ['plugin', 'install', dir, '--json'], { TG_MOCK_HUMAN: 'yes' });
  expect(r.json, r.err).toMatchObject({ ok: true });
  return { ...(r.json as { installId: string; revision: string }), summary: r.err };
};
/** HTTP answers of the mock account (what a request under TG_MOCK gets instead of the network). */
function mockHttp(home: string, fixtures: unknown[]) {
  mkdirSync(join(plugins(home), 'mock-http'), { recursive: true });
  writeFileSync(join(plugins(home), 'mock-http', 'api.json'), JSON.stringify(fixtures));
}
/** A secret as the mock account keeps it (its own file, never a real store), under the core's key. */
function mockSecret(home: string, installId: string, name: string, value: string) {
  const file = join(plugins(home), 'plugin-secrets.json');
  const all = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  all[`plugin-secret-mock-${installId}-${name}`] = value;
  writeFileSync(file, JSON.stringify(all), { mode: 0o600 });
}
const profileDir = (home: string, name: string) => (process.platform === 'win32' ? join(home, 'AppData', name) : join(home, '.config', name));
const audit = (home: string) => readFileSync(join(profileDir(home, 'tg-mock'), 'audit.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
const fetch = (home: string, url: string, extra: Record<string, string | undefined> = {}, command = 'fetch') =>
  cli(home, ['plugin', 'run', 'net-lab', command, '--input', JSON.stringify({ url }), '--json'], extra);

const SECRET = 'mock-secret-value-1234';
const ECHO = [
  { request: { url: 'https://api.example.com/v1/hello?token=abc' }, response: { headers: { 'x-echo': `Bearer ${SECRET}`, 'set-cookie': 'a=b' }, json: { echo: SECRET, b64: Buffer.from(`Bearer ${SECRET}`).toString('base64') } } },
  { request: { url: 'https://api.example.com/v2/open' }, response: { body: 'open' } },
];

describe('install, run and audit of a network plugin (mock account, fixtures)', { timeout: 60_000 }, () => {
  it('the install summary names every data source with the destinations, and each secret with where it goes', () => {
    const h = newHome();
    const { summary } = install(h);
    expect(summary).toContain('Sends data:  may send your own messages, your name and ID, its saved data and its settings to: https://api.example.com, https://other.example.com, https://wrong.example.net');
    expect(summary).toMatch(/Secret apikey: .*only to https:\/\/api\.example\.com \(paths \/v1\) as Authorization/);
    expect(summary).toMatch(/Secret other: .*only to https:\/\/other\.example\.com as X-Api-Key/);
    expect(summary).toContain('you type them yourself later: telegram plugin secret set net-lab <name>');
  });

  it('runs against fixtures: the secret is injected and stripped, cookies dropped; the audit has origins and a count only', () => {
    const h = newHome();
    const { installId } = install(h);
    mockHttp(h, ECHO);
    mockSecret(h, installId, 'apikey', SECRET);
    const r = fetch(h, 'https://api.example.com/v1/hello?token=abc');
    expect(r.code, r.err).toBe(0);
    expect(r.json.data).toMatchObject({ ok: true, response: { status: 200, headers: { 'x-echo': '[secret]' } } });
    expect(r.json.data.response.headers['set-cookie']).toBeUndefined();
    expect(JSON.parse(r.json.data.response.body)).toEqual({ echo: '[secret]', b64: '[secret]' });
    expect(r.out).not.toContain(SECRET);
    // An unmatched request is an error, never the network
    expect(fetch(h, 'https://api.example.com/v2/none').json.data).toMatchObject({ ok: false, error: { code: 'fixture_missing' } });
    const runs = audit(h).filter(a => a.command === 'plugin run');
    expect(runs.at(-2).plugin).toMatchObject({ command: 'fetch', apis: ['http.fetch'], network: { requests: 1, origins: ['https://api.example.com'] } });
    const text = readFileSync(join(profileDir(h, 'tg-mock'), 'audit.jsonl'), 'utf8');
    for (const s of [SECRET, 'token=abc', '/v1/hello', 'echo']) expect(text).not.toContain(s);
  });

  it('a missing secret ends the run with secret_missing and the command for the human\'s own terminal', () => {
    const h = newHome();
    install(h);
    mockHttp(h, ECHO);
    const r = fetch(h, 'https://api.example.com/v1/hello?token=abc', {}, 'fetch-raw');
    expect(r.code).toBe(1);
    expect(r.json.error).toMatchObject({ code: 'secret_missing', command: ['plugin', 'secret', 'set', 'net-lab', 'apikey'] });
    // The mock's own state in the command (quoted as the shell needs it), so it never runs on a real profile
    expect(r.json.error.hint).toContain('TG_MOCK=');
    expect(r.json.error.hint).toContain('mock-state.json');
    expect(r.json.error.hint).toContain('telegram plugin secret set net-lab apikey');
    // A path the secret does not cover needs none
    expect(fetch(h, 'https://api.example.com/v2/open').json.data).toMatchObject({ ok: true, response: { body: 'open' } });
  });

  it('secret set needs a terminal: from a pipe or with a value argument it is refused, never stored', () => {
    const h = newHome();
    install(h);
    const piped = cli(h, ['plugin', 'secret', 'set', 'net-lab', 'apikey', '--json'], {}, 'sk-from-a-pipe-123\n');
    expect(piped.code).toBe(1);
    expect(piped.json.error).toMatchObject({ code: 'human_required', command: ['plugin', 'secret', 'set', 'net-lab', 'apikey'] });
    const argv = cli(h, ['plugin', 'secret', 'set', 'net-lab', 'apikey', 'sk-in-argv-123456']);
    expect(argv.code).not.toBe(0);
    expect(existsSync(join(plugins(h), 'plugin-secrets.json'))).toBe(false);
    expect(cli(h, ['plugin', 'show', 'net-lab', '--json']).json.secrets.map((s: { state: string }) => s.state)).toEqual(['not set', 'not set']);
  });

  it('removing the plugin removes its secrets', () => {
    const h = newHome();
    const { installId } = install(h);
    mockSecret(h, installId, 'apikey', SECRET);
    expect(cli(h, ['plugin', 'show', 'net-lab', '--json']).json.secrets[0]).toMatchObject({ name: 'apikey', state: 'set' });
    expect(cli(h, ['plugin', 'remove', 'net-lab', '--keep-data', '--json'], { TG_MOCK_HUMAN: 'yes' }).json).toMatchObject({ ok: true });
    expect(readFileSync(join(plugins(h), 'plugin-secrets.json'), 'utf8')).not.toContain(SECRET);
  });
});

describe('the guard in each mode and transport (mock account)', { timeout: 60_000 }, () => {
  it('the MCP read tool (TG_READ_ONLY) refuses a network command before any request', () => {
    const h = newHome();
    const { installId, revision } = install(h);
    mockHttp(h, ECHO);
    // As the server starts the child: the installation it classified the call by
    const r = fetch(h, 'https://api.example.com/v2/open', { TG_READ_ONLY: '1', TG_MCP: '1', TG_PLUGIN_EXPECT: `${installId} ${revision}` });
    expect(r.code).toBe(1);
    expect(r.json.error.code).toBe('write_on_read_tool');
    expect(audit(h).filter(a => a.command === 'plugin run')).toEqual([]);
  });

  it('mode "ask" in the shell: approval lists the destinations; the code runs it once', () => {
    const h = newHome();
    install(h);
    mockHttp(h, ECHO);
    const ask = fetch(h, 'https://api.example.com/v2/open', { TG_MOCK_ASK: '1' });
    expect(ask.code).toBe(3);
    expect(ask.json.action.description).toMatch(/Effects: network \(it can send data to the internet\)[\s\S]*Sends to: https:\/\/api\.example\.com, https:\/\/other\.example\.com, https:\/\/wrong\.example\.net/);
    const ok = fetch(h, 'https://api.example.com/v2/open', { TG_MOCK_ASK: '1', TG_APPROVE: ask.json.code });
    expect(ok.code, ok.err).toBe(0);
    expect(ok.json.data.response.body).toBe('open');
    expect(fetch(h, 'https://api.example.com/v2/open', { TG_MOCK_ASK: '1', TG_APPROVE: ask.json.code }).code).toBe(3);
  });

  it('an approval is bound to the origins: a reinstall that adds a destination needs a new one', () => {
    const h = newHome();
    const dir = join(h, 'lab');
    cpSync(LAB, dir, { recursive: true });
    install(h, dir);
    mockHttp(h, ECHO);
    const ask = fetch(h, 'https://api.example.com/v2/open', { TG_MOCK_ASK: '1' });
    expect(ask.code).toBe(3);
    expect(cli(h, ['plugin', 'remove', 'net-lab', '--json'], { TG_MOCK_HUMAN: 'yes' }).json).toMatchObject({ ok: true });
    const m = JSON.parse(readFileSync(join(dir, 'tg-plugin.json'), 'utf8'));
    m.network.push('https://exfil.example.org');
    writeFileSync(join(dir, 'tg-plugin.json'), JSON.stringify(m));
    install(h, dir);
    const used = fetch(h, 'https://api.example.com/v2/open', { TG_MOCK_ASK: '1', TG_APPROVE: ask.json.code });
    expect(used.code).toBe(3);
    expect(used.json.action.description).toContain('https://exfil.example.org');
    expect(used.json.rejected).toBeDefined();
  });

  it('MCP: a network command is classified telegram_write; secret set/rm are the human\'s with the exact command; settings set is a write', async () => {
    const h = newHome();
    install(h);
    const help = spawnSync(process.execPath, [...cliArgs(), 'help-all'], { encoding: 'utf8', env: homeEnv(h) }).stdout;
    const names = help.split('\n').filter(l => /^[a-z]/.test(l) && l.includes(' — ')).map(l => l.slice(0, l.indexOf(' — ')).split(' ').filter((_w, i, all) => !all.slice(0, i + 1).some(x => /^[<[]/.test(x))).join(' '));
    setKnownCommands([...new Set(names.flatMap(p => p.split(' ').map((_, i, w) => w.slice(0, i + 1).join(' '))))]);
    const saved: Record<string, string | undefined> = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, TG_MOCK: process.env.TG_MOCK };
    Object.assign(process.env, { HOME: h, USERPROFILE: h, APPDATA: join(h, 'AppData'), TG_MOCK: join(h, 'mock-state.json') });
    try {
      expect(classifyCall(['plugin', 'run', 'net-lab', 'fetch', '--input', '{"url":"https://api.example.com/x"}'])).toMatchObject({ group: 'write' });
      expect(classifyCall(['plugin', 'run', 'net-lab', 'setting', '--input', '{"key":"mode"}'])).toMatchObject({ group: 'read' });
      expect(classifyCall(['plugin', 'settings', 'set', 'net-lab', 'mode', '"slow"'])).toMatchObject({ group: 'write' });
      expect(classifyCall(['plugin', 'settings', 'get', 'net-lab'])).toMatchObject({ group: 'read' });
      const set = classifyCall(['plugin', 'secret', 'set', 'net-lab', 'apikey']);
      expect(set.group).toBe('never');
      expect((set as { reason: string }).reason).toContain(`telegram plugin secret set net-lab apikey`);
      // A value the model added is never echoed into a command
      const withValue = classifyCall(['plugin', 'secret', 'set', 'net-lab', 'apikey', 'sk-leaked-123']);
      expect(withValue.group).toBe('never');
      expect((withValue as { reason: string }).reason).not.toContain('sk-leaked-123');
      expect(classifyCall(['plugin', 'secret', 'rm', 'net-lab', 'apikey']).group).toBe('never');
      expect(planCall('telegram_read', { args: ['plugin', 'run', 'net-lab', 'fetch', '--input', '{"url":"https://api.example.com/x"}'] })).toMatch(/use telegram_write/);
      // A read-only MCP server refuses it
      const call = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'telegram_write', arguments: { args: ['plugin', 'run', 'net-lab', 'fetch', '--input', '{"url":"https://api.example.com/v2/open"}'] } } };
      const run = async (plan: Parameters<typeof childEnv>[0]) => {
        const r = spawnSync(process.execPath, [...cliArgs(), ...plan.argv], { encoding: 'utf8', input: plan.stdin ?? '', env: childEnv(plan) });
        return result(plan, { code: r.status, timedOut: false, out: r.stdout, err: r.stderr } as RunOutput);
      };
      const ro = await handleMessage(call, run, { readOnly: true }) as { result: { content: { text: string }[] } };
      expect(ro.result.content[0].text).toMatch(/read-only/);
      mockHttp(h, ECHO);
      const ok = await handleMessage(call, run) as { result: { content: { text: string }[]; isError?: boolean } };
      expect(ok.result.isError, ok.result.content[0].text).toBeUndefined();
      expect(ok.result.content[0].text).toContain('open');
    } finally {
      // An undefined value would become the string "undefined": such a key is deleted
      for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
  });

  for (const worker of [false, true]) {
    it(`MCP mode "ask" (${worker ? 'worker thread' : 'child process'}): approval_required names the destinations; the code runs it`, async () => {
      const h = newHome();
      install(h);
      mockHttp(h, ECHO);
      const help = spawnSync(process.execPath, [...cliArgs(), 'help-all'], { encoding: 'utf8', env: homeEnv(h) }).stdout;
      const names = help.split('\n').filter(l => /^[a-z]/.test(l) && l.includes(' — ')).map(l => l.slice(0, l.indexOf(' — ')).split(' ').filter((_w, i, all) => !all.slice(0, i + 1).some(x => /^[<[]/.test(x))).join(' '));
      setKnownCommands([...new Set(names.flatMap(p => p.split(' ').map((_, i, w) => w.slice(0, i + 1).join(' '))))]);
      const vars: Record<string, string> = { HOME: h, USERPROFILE: h, APPDATA: join(h, 'AppData'), TG_MOCK: join(h, 'mock-state.json'), TG_MOCK_ASK: '1', ...(worker ? { TG_MCP_WORKER: '1' } : {}) };
      const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
      Object.assign(process.env, vars);
      try {
        const run = async (plan: Parameters<typeof childEnv>[0]) => {
          const r = spawnSync(process.execPath, [...cliArgs(), ...plan.argv], { encoding: 'utf8', input: plan.stdin ?? '', env: childEnv(plan) });
          return result(plan, { code: r.status, timedOut: false, out: r.stdout, err: r.stderr } as RunOutput);
        };
        type Reply = { result: { content: { text: string }[]; isError?: boolean; structuredContent?: Record<string, any> } };
        const args = ['plugin', 'run', 'net-lab', 'fetch', '--input', '{"url":"https://api.example.com/v2/open"}', '--json'];
        const call = (extra: Record<string, unknown> = {}) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'telegram_write', arguments: { args, ...extra } } });
        const first = (await handleMessage(call(), run) as Reply).result.structuredContent!;
        expect(first.status).toBe('approval_required');
        expect(first.action.description).toMatch(/Effects: network[\s\S]*Sends to: https:\/\/api\.example\.com, https:\/\/other\.example\.com, https:\/\/wrong\.example\.net/);
        const ok = await handleMessage(call({ approval: first.code }), run) as Reply;
        expect(ok.result.isError, ok.result.content[0].text).toBeUndefined();
        expect(ok.result.content[0].text).toContain('open');
      } finally {
        for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
      }
    });
  }
});

describe('settings', { timeout: 60_000 }, () => {
  it('set validates against the manifest schema; get and host.settings.get see the stored value or the default', () => {
    const h = newHome();
    install(h);
    const setting = (key: string) => cli(h, ['plugin', 'run', 'net-lab', 'setting', '--input', JSON.stringify({ key }), '--json']).json.data.value;
    expect(setting('mode')).toBe('fast');
    expect(setting('count')).toBe(3);
    expect(cli(h, ['plugin', 'settings', 'set', 'net-lab', 'mode', '"slow"', '--json']).json).toMatchObject({ ok: true, key: 'mode', value: 'slow' });
    expect(setting('mode')).toBe('slow');
    for (const [key, value] of [['mode', '"medium"'], ['mode', 'slow'], ['count', '11'], ['count', '2.5'], ['count', '"3"'], ['nope', '1']]) {
      const r = cli(h, ['plugin', 'settings', 'set', 'net-lab', key, value, '--json']);
      expect(r.code, `${key}=${value}`).toBe(2);
    }
    expect(cli(h, ['plugin', 'settings', 'get', 'net-lab', '--json']).json.settings).toEqual([
      { key: 'mode', type: 'string', value: 'slow', stored: true },
      { key: 'count', type: 'integer', value: 3, stored: false },
    ]);
    // Over the MCP read tool it is a write
    expect(cli(h, ['plugin', 'settings', 'set', 'net-lab', 'count', '5', '--json'], { TG_READ_ONLY: '1', TG_MCP: '1' }).json.error.code).toBe('write_on_read_tool');
    expect(audit(h).filter(a => a.command === 'plugin settings set').map(a => a.plugin.key)).toEqual(['mode']);
  });
});

describe('plugin dev --mock answers HTTP from dev/fixtures', { timeout: 60_000 }, () => {
  it('matched by method and URL; unmatched is fixture_missing; secrets are fake placeholders, stripped like real ones', () => {
    const h = newHome();
    const dev = (input: unknown, dir = LAB) => cli(h, ['plugin', 'dev', dir, 'fetch', '--mock', '--input', JSON.stringify(input), '--json']);
    const hello = dev({ url: 'https://api.example.com/v1/hello?q=1' });
    expect(hello.code, hello.err).toBe(0);
    expect(hello.json.data.response).toEqual({ status: 200, headers: { 'x-seen': '[secret]', 'content-type': 'application/json' }, body: '{"hello":"world","echo":"[secret]"}' });
    expect(dev({ url: 'https://api.example.com/v1/hello?q=2' }).json.data).toMatchObject({ ok: false, error: { code: 'fixture_missing' } });
    expect(dev({ url: 'https://other.example.com/items', opts: { method: 'GET' } }).json.data).toMatchObject({ ok: false, error: { code: 'fixture_missing' } });
    expect(dev({ url: 'https://other.example.com/items', opts: { method: 'POST', body: '{}' } }).json.data).toMatchObject({ ok: true, response: { status: 201, body: 'created' } });
    // The origin rules hold in dev too
    expect(dev({ url: 'https://evil.example.com/x' }).json.data).toMatchObject({ ok: false, error: { code: 'network_denied' } });
    // A link in dev/fixtures is not followed
    if (process.platform !== 'win32') {
      const dir = join(h, 'lab');
      cpSync(LAB, dir, { recursive: true });
      writeFileSync(join(h, 'outside.json'), '[]');
      symlinkSync(join(h, 'outside.json'), join(dir, 'dev', 'fixtures', 'linked.json'));
      const r = dev({ url: 'https://api.example.com/v1/hello?q=1' }, dir);
      expect(r.code).toBe(2);
      expect(r.json.error.message).toMatch(/not a regular file/);
    }
  });
});
