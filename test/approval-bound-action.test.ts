import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cliArgs } from './cli.js';
import { seedWorld } from '../src/mock/world.js';

/**
 * What a "yes" covers is what Telegram gets: every recipient as the ID it was approved with, the
 * button as it was shown, the bytes of a file as they were hashed, messages only of the chat shown,
 * and a code given for a call holds in any mode. Rehearsed on the mock account (TG_MOCK_ASK=1):
 * the real CLI, guard and lookups, nothing reaches Telegram.
 */
const home = mkdtempSync(join(tmpdir(), 'tg-bound-'));
afterAll(() => rmSync(home, { recursive: true, force: true }));
let n = 0;

type World = { chats: { id: number; kind: string; title?: string; messages: { id: number; text?: string; out?: boolean; media?: { fileName?: string } }[] }[] };

/** A fresh mock account per test: its own state file, the same temp home. */
function account() {
  const state = join(home, `state-${++n}.json`);
  const run = (args: string[], opts: { approve?: string; stdin?: string; env?: Record<string, string> } = {}) => {
    const r = spawnSync(process.execPath, [...cliArgs(), ...args], {
      encoding: 'utf8',
      input: opts.stdin ?? '',
      env: {
        ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: state, TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '',
        TG_APPROVE: '', TG_MCP: '', TG_MOCK_ASK: '1', ...(opts.approve ? { TG_APPROVE: opts.approve } : {}), ...opts.env,
      },
    });
    const json = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l) as Record<string, any>);
    return { code: r.status, out: r.stdout, err: r.stderr, json: json.at(-1) };
  };
  /** The mock account's data as the last run left it (the built-in one until something is written). */
  const world = (): World => (existsSync(state) ? JSON.parse(readFileSync(state, 'utf8')) : seedWorld()) as World;
  const chat = (id: number) => world().chats.find(c => c.id === id)!;
  return Object.assign(run, { world, chat, state });
}

describe('a code given for a call must hold in any write mode', () => {
  it('the mock account, which writes without asking, still refuses a code for another action', () => {
    const cli = account();
    const asked = cli(['send', '-1004001', 'ship it', '--json']);
    expect(asked.code).toBe(3);
    // The same code on a run that would write freely (no TG_MOCK_ASK), for other text
    const r = cli(['send', '-1004001', 'drop the table'], { approve: asked.json!.code, env: { TG_MOCK_ASK: '' } });
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/Not sent: approval [A-Z2-9]{6} not accepted: the approval was for a different command or text/);
    expect(r.err).toContain('Run the command again without TG_APPROVE');
    expect(cli.chat(4001).messages.map(m => m.text)).not.toContain('drop the table');
  });

  it('over MCP it says to call again without "approval"', () => {
    const cli = account();
    const r = cli(['send', '-1004001', 'hi'], { approve: 'ZZZZZZ', env: { TG_MOCK_ASK: '', TG_MCP: '1' } });
    expect(r.code).toBe(1);
    expect(r.err).toContain('Call telegram_write again without "approval"');
    expect(cli.chat(4001).messages.map(m => m.text)).not.toContain('hi');
  });
});
