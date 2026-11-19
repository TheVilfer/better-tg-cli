import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { cliArgs } from './cli.js';
import { seedWorld, type MockWorld } from '../src/mock/world.js';

// Review round 1 of the agent-ready CLI: the CLI as an agent runs it (a child process, stdin
// closed, no TTY) on the mock account, so nothing reaches Telegram.
const home = mkdtempSync(join(tmpdir(), 'tg-agent-ux-r1-'));
afterAll(() => rmSync(home, { recursive: true, force: true }));
let n = 0;

function env(extra: NodeJS.ProcessEnv = {}, state = join(home, `state-${n++}.json`)): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(TG|OP)_/i.test(k)));
  return Object.assign(e, { HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: state, TG_NO_UPDATE_CHECK: '1' }, extra);
}

function cli(args: string[], extra: NodeJS.ProcessEnv = {}, state?: string) {
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], { encoding: 'utf8', env: env(extra, state), stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
  return { code: r.status, out: r.stdout, err: r.stderr.replace(/^MOCK MODE.*\n/m, '') };
}

/** stdout must be exactly one JSON value (one line outside a terminal). */
function oneJson(out: string): any {
  const lines = out.trim().split('\n');
  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0]);
}

describe('2/3 --json always yields one complete JSON object', () => {
  it('a missing folder is a JSON error, exit 1', () => {
    const r = cli(['folder', 'NoSuchFolder', '--json']);
    expect(r.code).toBe(1);
    expect(oneJson(r.out).error.code).toBe('folder_not_found');
  }, 30_000);

  it('skill install with an unknown agent is a JSON usage error, exit 2', () => {
    const r = cli(['skill', 'install', '-a', 'xyz', '--json']);
    expect(r.code).toBe(2);
    expect(oneJson(r.out).error.code).toBe('invalid_argument');
  }, 30_000);

  it('a long error is written in full before the process exits, even to a slow reader', async () => {
    const name = 'x'.repeat(180_000);
    const child = spawn(process.execPath, [...cliArgs(), 'read', name, '--json'], { env: env(), stdio: ['ignore', 'pipe', 'ignore'] });
    // Read nothing for a while: the pipe fills up and the CLI must wait for it
    child.stdout.pause();
    await new Promise(r => setTimeout(r, 1500));
    let out = '';
    child.stdout.setEncoding('utf8').on('data', d => { out += d; });
    child.stdout.resume();
    const code = await new Promise(r => child.on('close', r));
    expect(code).toBe(1);
    expect(oneJson(out).error.message).toContain(name);
  }, 30_000);

  it('sync with a chat that does not exist is an error with JSON, not a silent 0', () => {
    const r = cli(['sync', '--chat', 'NoSuchChat', '--json', '--output', join(home, `sync-${n++}`)]);
    expect(r.code).toBe(1);
    expect(oneJson(r.out).error.code).toBe('chat_not_found');
  }, 30_000);
});

/** The seeded mock account plus `extra` chats, as a TG_MOCK state file. */
async function worldFile(extra: (w: MockWorld) => void): Promise<string> {
  const w = seedWorld();
  extra(w);
  const file = join(home, `world-${n++}.json`);
  writeFileSync(file, JSON.stringify(w));
  return file;
}

/** `count` supergroups older than every seeded chat, then one more "Team" older still, past them all. */
const crowd = (count: number, duplicate = true) => (w: MockWorld) => {
  for (let i = 0; i < count; i++) {
    w.chats.push({ id: 100_000 + i, kind: 'supergroup', title: `Filler ${i}`, messages: [{ id: 1, ago: 300 * 86400, from: 1002, text: 'x' }] } as never);
  }
  if (duplicate) w.chats.push({ id: 9000, kind: 'supergroup', title: 'Team', messages: [{ id: 1, ago: 900 * 86400, from: 1002, text: 'other team' }] } as never);
};

describe('1 a title is unique only when the whole dialog list was seen', () => {
  it('a duplicate title beyond the first 500 dialogs makes a read ambiguous', async () => {
    const state = await worldFile(crowd(520));
    const r = cli(['read', 'Team', '--json'], {}, state);
    expect(r.code).toBe(2);
    const error = oneJson(r.out).error;
    expect(error.code).toBe('ambiguous_chat');
    expect(error.candidates.map((c: { id: string }) => c.id)).toEqual(['-1004001', '-1009000']);
  }, 60_000);

  it('... and a write to it too', async () => {
    const state = await worldFile(crowd(520));
    const r = cli(['send', 'Team', 'hi', '--json'], {}, state);
    expect(r.code).toBe(2);
    expect(oneJson(r.out).error.code).toBe('ambiguous_chat');
    // Nothing was sent: the newest message of Team is still the seeded one
    const read = cli(['read', '-1004001', '-n', '1', '--json'], {}, state);
    expect(JSON.parse(read.out).messages[0].text).not.toBe('hi');
  }, 60_000);

  it('past 5000 dialogs a title is not proven unique: an ID or @username is required', async () => {
    const state = await worldFile(crowd(5000, false));
    for (const args of [['read', 'Team', '--json'], ['send', 'Team', 'hi', '--json']]) {
      const r = cli(args, {}, state);
      expect(r.code).toBe(2);
      const error = oneJson(r.out).error;
      expect(error.code).toBe('ambiguous_or_unverified');
      expect(error.candidates).toEqual([{ id: '-1004001', title: 'Team', type: 'supergroup' }]);
    }
    expect(cli(['read', '-1004001', '-n', '1', '--json'], {}, state).code).toBe(0);
    expect(cli(['read', '@mock_team', '-n', '1', '--json'], {}, state).code).toBe(0);
  }, 120_000);
});

describe('8 links, candidates and hints', () => {
  it('a t.me link names its chat before any title search', async () => {
    const state = await worldFile(w => {
      w.chats.find(c => c.id === 4002)!.title = 'Read https://t.me/mock_team A';
      w.chats.push({ id: 4100, kind: 'supergroup', title: 'Read https://t.me/mock_team B', messages: [{ id: 1, ago: 60, from: 1002, text: 'x' }] } as never);
    });
    for (const link of ['https://t.me/mock_team', 't.me/mock_team/2', 'https://t.me/c/4001/2', 'tg://resolve?domain=mock_team']) {
      const r = cli(['read', link, '-n', '1', '--json'], {}, state);
      expect(r.code, link).toBe(0);
      expect(JSON.parse(r.out).chatId, link).toBe('-1004001');
    }
    const invite = cli(['read', 'https://t.me/+AbCdEf123', '--json'], {}, state);
    expect(invite.code).toBe(2);
    expect(oneJson(invite.out).error.code).toBe('invalid_argument');
  }, 60_000);

  it('candidates carry id, title and type only; the hint is an argv with --preview 0', () => {
    const ambiguous = oneJson(cli(['read', 'Tea', '--json']).out).error;
    for (const c of ambiguous.candidates) expect(Object.keys(c).sort()).toEqual(['id', 'title', 'type']);
    expect(cli(['read', 'Tea']).err).not.toMatch(/@mock_team/);
    const name = `it's "odd" $(x)`;
    const notFound = oneJson(cli(['read', name, '--json']).out).error;
    expect(notFound.hint).toEqual(['chats', '-q', name, '--preview', '0']);
    expect(cli(['read', name]).err).toContain(`telegram chats -q 'it'\\''s "odd" $(x)' --preview 0`);
  }, 30_000);
});

describe('2 a question to the user never lands on stdout', () => {
  it('prompt() asks on stderr', async () => {
    const { Readable } = await import('node:stream');
    const { prompt } = await import('../src/prompt.js');
    const stdin = Object.getOwnPropertyDescriptor(process, 'stdin')!;
    const outWrite = process.stdout.write.bind(process.stdout);
    const errWrite = process.stderr.write.bind(process.stderr);
    let out = '';
    let err = '';
    process.stdout.write = ((c: string) => (out += c, true)) as never;
    process.stderr.write = ((c: string) => (err += c, true)) as never;
    Object.defineProperty(process, 'stdin', { value: Readable.from(['y\n']), configurable: true });
    try {
      expect(await prompt('Allow? [y/N] ')).toBe('y');
    } finally {
      Object.defineProperty(process, 'stdin', stdin);
      process.stdout.write = outWrite;
      process.stderr.write = errWrite;
    }
    expect(out).toBe('');
    expect(err).toContain('Allow? [y/N] ');
  });
});

describe('7 --topic: bot forums count, and an empty unread page is checked like any other', () => {
  it('a bot with topics (botForumView) reads a topic; a bot without them is not_a_forum', async () => {
    const forum = await worldFile(w => { w.users.find(u => u.id === 2001)!.forumView = true; });
    const r = cli(['read', '@demo_bot', '--topic', '1', '--json'], {}, forum);
    expect(r.code, r.out + r.err).toBe(0);
    expect(JSON.parse(r.out).chatId).toBe('2001');
    const plain = cli(['read', '@demo_bot', '--topic', '1', '--json']);
    expect(plain.code).toBe(2);
    expect(oneJson(plain.out).error.code).toBe('not_a_forum');
  }, 30_000);

  it('read --unread --topic on a chat without topics is refused even with nothing unread', () => {
    const r = cli(['read', 'me', '--unread', '--topic', '10', '--json']);
    expect(r.code).toBe(2);
    expect(oneJson(r.out).error.code).toBe('not_a_forum');
  }, 30_000);

  it('an empty --unread page still names its chat', () => {
    const r = cli(['read', 'me', '--unread', '--json']);
    expect(r.code).toBe(0);
    expect(oneJson(r.out)).toEqual({ chatTitle: 'Mock', chatId: '1000', messages: [] });
  }, 30_000);
});

describe('11 hasMore only when a next page was seen', () => {
  it('read: a page of exactly limit at the start of history has no hasMore; one less has', () => {
    // Team has exactly 3 messages
    const exact = cli(['read', 'Team', '-n', '3', '--json']);
    expect(JSON.parse(exact.out).messages).toHaveLength(3);
    expect(JSON.parse(exact.out).hasMore).toBeUndefined();
    expect(cli(['read', 'Team', '-n', '3']).out).not.toMatch(/more: --before/);
    const page = JSON.parse(cli(['read', 'Team', '-n', '2', '--json']).out);
    expect(page.messages).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    // The promised next page is not empty
    expect(JSON.parse(cli(['read', 'Team', '-n', '2', '--before', String(page.nextBefore), '--json']).out).messages.length).toBeGreaterThan(0);
  }, 30_000);

  it('search: exactly limit results is the end; one less says more exist', () => {
    // An empty query matches every message: fewer than the default 50
    const all = JSON.parse(cli(['search', '', '--json']).out)[0].messages.length;
    expect(all).toBeGreaterThan(1);
    expect(JSON.parse(cli(['search', '', '-n', String(all), '--json']).out)[0].hasMore).toBeUndefined();
    expect(JSON.parse(cli(['search', '', '-n', String(all - 1), '--json']).out)[0].hasMore).toBe(true);
    const inChat = JSON.parse(cli(['search', '', '--chat', 'Team', '--json']).out)[0].messages.length;
    expect(JSON.parse(cli(['search', '', '--chat', 'Team', '-n', String(inChat), '--json']).out)[0].hasMore).toBeUndefined();
  }, 30_000);
});
