import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { EXIT_NEEDS_APPROVAL } from '../src/approval.js';
import {
  RUN_ALLOWLIST, SETUP_EXIT, SETUP_SCHEMA, TERMINAL_EVENTS,
  runRefusal, setupEventErrors, setupExitCode, setupResultErrors, type SetupResult,
} from '../src/setup-contract.js';
import { cliArgs } from './cli.js';

const fixtures = JSON.parse(readFileSync('test/fixtures/setup-contract.json', 'utf8'));

// Every child process runs on a throwaway home with a profile of its own: nothing here can reach
// a real account, config or Keychain item, and the mock never sees the real one either
const home = mkdtempSync(join(tmpdir(), 'tg-contract-'));
afterAll(() => rmSync(home, { recursive: true, force: true }));
const baseEnv = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_NO_UPDATE_CHECK: '1', TG_PROFILE: 'contract-test' };
  delete env.TG_MOCK;
  return env;
};
const cli = (args: string[], env: NodeJS.ProcessEnv = baseEnv()) =>
  spawnSync(process.execPath, [...cliArgs(), ...args], { encoding: 'utf8', env, timeout: 30_000 });

describe('setup contract, schema 1', () => {
  it('is schema 1, and its approval exit code is the write guard\'s', () => {
    expect(SETUP_SCHEMA).toBe(1);
    expect(SETUP_EXIT).toEqual({ ok: 0, error: 1, needsHuman: 2, needsApproval: 3 });
    expect(SETUP_EXIT.needsApproval).toBe(EXIT_NEEDS_APPROVAL);
  });

  it.each(fixtures.valid.map((f: { name: string }) => [f.name, f]))('accepts: %s', (_name, f: { result: SetupResult; exit: number }) => {
    expect(setupResultErrors(f.result)).toEqual([]);
    expect(setupExitCode(f.result)).toBe(f.exit);
  });

  it.each(fixtures.invalid.map((f: { name: string }) => [f.name, f]))('refuses: %s', (_name, f: { result: unknown; error: string }) => {
    const errors = setupResultErrors(f.result);
    expect(errors.join('\n')).toContain(f.error);
  });

  it('accepts event streams that end in exactly one terminal event, and refuses bad lines', () => {
    for (const stream of fixtures.events.valid as Record<string, unknown>[][]) {
      for (const line of stream) expect(setupEventErrors(line)).toEqual([]);
      const terminal = stream.map(l => (TERMINAL_EVENTS as readonly unknown[]).includes(l.event));
      expect(terminal.lastIndexOf(true)).toBe(stream.length - 1);
      expect(terminal.filter(Boolean)).toHaveLength(1);
    }
    for (const f of fixtures.events.invalid as { event: unknown; error: string }[]) {
      expect(setupEventErrors(f.event).join('\n')).toContain(f.error);
    }
  });

  it('every example in docs/setup-contract.md is valid', () => {
    const doc = readFileSync('docs/setup-contract.md', 'utf8');
    const blocks = [...doc.matchAll(/```(json|jsonl)\n([\s\S]*?)```/g)];
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    for (const [, kind, body] of blocks) {
      if (kind === 'json') expect(setupResultErrors(JSON.parse(body))).toEqual([]);
      else for (const line of body.trim().split('\n')) expect(setupEventErrors(JSON.parse(line))).toEqual([]);
    }
  });

  it('the doc names exactly the commands of the allowlist', () => {
    const doc = readFileSync('docs/setup-contract.md', 'utf8');
    const line = doc.slice(doc.indexOf('Allowed today:'), doc.indexOf('Later PRs add'));
    const named = [...line.matchAll(/`([a-z][a-z ]*?)(?: \[|`)/g)].map(m => m[1].trim());
    expect(named).toEqual(RUN_ALLOWLIST.map(e => e.command.join(' ')));
  });

  it('every allowlisted command and flag exists in the CLI (no entry silently stops matching)', () => {
    for (const entry of RUN_ALLOWLIST) {
      const help = cli([...entry.command, '--help']);
      expect(help.status, entry.command.join(' ')).toBe(0);
      expect(help.stdout).toMatch(new RegExp(`^Usage: \\S+ ${entry.command.join(' ')}\\b`, 'm'));
      for (const flag of Object.keys(entry.flags)) expect(help.stdout, `${entry.command.join(' ')} ${flag}`).toContain(flag);
    }
  });

  it('never allows commands that change authority or credentials, or a Telegram write', () => {
    for (const argv of [
      ['write-access', 'on'], ['write-access', 'ask'], ['auth'], ['logout'], ['mcp'], ['api', 'messages.sendMessage'],
      ['send', 'me', 'hi'], ['skill', 'install', '--force'], ['skill', 'uninstall'], ['onboard', '--broker', 'https://evil.example'],
      ['update', '--json'], ['update', 'constructor', 'x'], ['update', '__proto__', 'x'], ['skill', 'install', 'toString', 'x'],
      ['sh', '-c', 'telegram update'], [],
    ]) expect(runRefusal(argv), argv.join(' ')).not.toBeNull();
    expect(runRefusal(['skill', 'install'])).toBeNull();
    expect(runRefusal(['onboard', '--no-open', '--json'])).toBeNull();
  });
});

// The contract is opt-in: what commands print today stays as it is (#110)
describe('current consumers keep their output', () => {
  it('chats --json prints an array', () => {
    const r = cli(['chats', '--json'], { ...baseEnv(), TG_MOCK: join(home, 'mock-state.json') });
    expect(r.status, r.stderr).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]).not.toHaveProperty('schema');
  }, 30_000);

  it('skill status --json prints an array of agent rows', () => {
    const r = cli(['skill', 'status', '--json']);
    expect(r.status, r.stderr).toBe(0);
    const rows = JSON.parse(r.stdout);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(expect.arrayContaining(['agent', 'detected', 'kind', 'name', 'path']));
      expect(row).not.toHaveProperty('schema');
    }
  }, 30_000);

  it('onboard --json prints its own JSON lines, without schema, ending in timeout', () => {
    // --no-open: never a browser window; a fractional --timeout ends it on every platform
    const r = cli(['onboard', '--json', '--no-open', '--timeout', '0.02']);
    expect(r.status).toBe(1);
    const lines = r.stdout.trimEnd().split('\n').map(l => JSON.parse(l));
    expect(lines.map(l => l.event)).toEqual(['url', 'waiting_invite', 'timeout']);
    expect(lines[0].url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/s\/[\w-]+\/$/);
    for (const l of lines) {
      expect(typeof l.event).toBe('string');
      expect(l).not.toHaveProperty('schema');
    }
  }, 30_000);

  it('telegram mcp writes only JSON-RPC messages to stdout', async () => {
    const child = spawn(process.execPath, [...cliArgs(), 'mcp'], { env: baseEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    const send = (m: object) => child.stdin.write(JSON.stringify(m) + '\n');
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 't', version: '0' } } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'telegram_help', arguments: { grep: 'onboard' } } });
    // A child CLI that fails (no login here) must not leak its stderr or anything else into stdout
    send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'telegram_read', arguments: { args: ['whoami'] } } });
    child.stdin.end();
    const code = await new Promise(r => child.on('close', r));
    expect(code).toBe(0);
    expect(out.endsWith('\n')).toBe(true);
    const messages = out.slice(0, -1).split('\n').map(l => JSON.parse(l));
    expect(messages.map(m => m.id)).toEqual([1, 2, 3, 4]);
    for (const m of messages) {
      expect(m.jsonrpc).toBe('2.0');
      expect(Object.keys(m).filter(k => k !== 'jsonrpc' && k !== 'id').length).toBe(1); // result or error
    }
  }, 30_000);
});
