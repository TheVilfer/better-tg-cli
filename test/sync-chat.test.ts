import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MockWorld } from '../src/mock/world.js';

// sync over MCP in mock mode is refused by the guard, so the guard is lifted here and the mock
// account is served straight to the command; nothing reaches Telegram.
const state = vi.hoisted(() => ({ world: undefined as MockWorld | undefined }));
vi.mock('../src/guard.js', async orig => ({ ...(await orig<typeof import('../src/guard.js')>()), assertLocalWriteAllowed: () => {} }));
vi.mock('../src/client.js', async orig => {
  const { MockClient } = await import('../src/mock/client.js');
  return {
    ...(await orig<typeof import('../src/client.js')>()),
    getClient: async () => new MockClient(state.world!),
    disconnectClient: async () => {},
  };
});

const saved = { ...process.env };
let root: string;
let out: string;
let exits: number[];
let err: string[];

async function sync(...args: string[]) {
  vi.resetModules();
  const { syncCommand } = await import('../src/commands/sync.js');
  await syncCommand.parseAsync([...args, '--output', out, '--all'], { from: 'user' });
}

/** The IDs `getDialogs` gives the mock chats 4001 and 4002 (supergroups). */
const A = '-1004001';
const B = '-1004002';

/** The seeded account with chats 4001 and 4002 renamed. */
async function world(a: string, b: string): Promise<MockWorld> {
  const { seedWorld } = await import('../src/mock/world.js');
  const w = seedWorld();
  w.chats.find(c => c.id === 4001)!.title = a;
  w.chats.find(c => c.id === 4002)!.title = b;
  return w;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tg-sync-'));
  out = join(root, 'export');
  exits = [];
  err = [];
  vi.spyOn(process, 'exit').mockImplementation(((code: number) => { exits.push(code); }) as never);
  vi.spyOn(console, 'error').mockImplementation(m => { err.push(String(m)); });
  vi.spyOn(process.stderr, 'write').mockImplementation(((m: string) => (err.push(String(m)), true)) as never);
});
afterEach(() => {
  for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
  Object.assign(process.env, saved);
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe('sync --chat over MCP names exactly one chat', () => {
  beforeEach(() => { process.env.TG_MCP = '1'; });

  it('a partial title ("Team" for Team A and Team B) stops before any file is created', async () => {
    state.world = await world('Team A', 'Team B');
    await sync('--chat', 'Team');
    expect(exits).toEqual([1]);
    expect(err.join('\n')).toMatch(/No chat is exactly "Team"/);
    expect(existsSync(out)).toBe(false);
  });

  it('two chats with the same exact title stop with both IDs, before any file is created', async () => {
    state.world = await world('Team', 'Team');
    await sync('--chat', 'Team');
    expect(exits).toEqual([1]);
    expect(err.join('\n')).toMatch(/"Team" matches 2 chats; use an ID/);
    expect(existsSync(out)).toBe(false);
  });

  it('an exact title, @username or ID syncs that one chat only', async () => {
    state.world = await world('Team A', 'Team B');
    await sync('--chat', 'Team A');
    expect(exits).toEqual([0]);
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', `Team A (${A}).md`]);
    rmSync(out, { recursive: true });
    await sync('--chat', '@mock_team');
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', `Team A (${A}).md`]);
    const [id] = Object.keys(JSON.parse(readFileSync(join(out, '.sync-meta.json'), 'utf8')));
    rmSync(out, { recursive: true });
    await sync('--chat', id);
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', `Team A (${A}).md`]);
    expect(exits).toEqual([0, 0, 0]);
  });
});

describe('sync --chat in a terminal is unchanged', () => {
  it('a partial title still syncs every chat that contains it', async () => {
    state.world = await world('Team A', 'Team B');
    await sync('--chat', 'Team');
    expect(exits).toEqual([0]);
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', `Team A (${A}).md`, `Team B (${B}).md`]);
  });
});

describe('sync --media stays inside the output directory', () => {
  it('a chat titled ".." keeps its media under DIR/media/<chat id>', async () => {
    state.world = await world('Team A', '..');
    await sync('--chat', '..', '--media');
    expect(exits).toEqual([0]);
    expect(err.join('\n')).not.toMatch(/Could not sync|outside/);
    expect(readdirSync(out).sort()).toEqual([`.. (${B}).md`, '.sync-meta.json', 'media']);
    expect(readdirSync(root)).toEqual(['export']); // nothing next to the export folder
    expect(existsSync(join(root, 'media'))).toBe(false);
    const [chatDir] = readdirSync(join(out, 'media'));
    expect(chatDir).toMatch(/^-?\d+$/);
    expect(readdirSync(join(out, 'media', chatDir))).toEqual(['1_palette.zip']);
  });

  it('insideDir refuses a path that is the folder itself or leaves it', async () => {
    const { insideDir } = await import('../src/commands/sync.js');
    expect(insideDir('/x/out', '/x/out/media/1')).toBe('/x/out/media/1');
    expect(insideDir('/x/out', '/x/out/...md')).toBe('/x/out/...md'); // the markdown of a chat titled ".."
    expect(() => insideDir('/x/out', '/x/out')).toThrow(/outside/);
    expect(() => insideDir('/x/out', '/x/out/../media')).toThrow(/outside/);
    expect(() => insideDir('/x/out', '/x/outside')).toThrow(/outside/);
  });
});

describe('sync --chat: an empty or numeric name never widens the export', () => {
  it.each([['MCP', '1'], ['terminal', '']])('an explicitly empty --chat stops before any file (%s)', async (_where, mcp) => {
    process.env.TG_MCP = mcp;
    state.world = await world('Team A', 'Team B');
    for (const name of ['', ' ']) {
      await sync('--chat', name);
      expect(err.join('\n')).toMatch(/--chat needs a chat/);
      expect(existsSync(out)).toBe(false);
    }
    expect(exits).toEqual(mcp ? [1, 1] : []);
  });

  it.each([['MCP', '1'], ['terminal', '']])('a numeric --chat matches only an ID, never a title (%s)', async (_where, mcp) => {
    process.env.TG_MCP = mcp;
    state.world = await world('123', '1001'); // 1001 is also the ID of the user Alice
    await sync('--chat', '123');
    expect(err.join('\n')).toMatch(/No chat has the ID 123/);
    expect(existsSync(out)).toBe(false);
    await sync('--chat', '1001');
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', 'Alice Example (1001).md']);
    expect(exits).toEqual(mcp ? [1, 0] : [0]);
  });
});

// A file symlink needs a privilege on Windows; the check itself (lstat) is the same there
describe.skipIf(process.platform === 'win32')('sync never writes through a symbolic link in the export folder', () => {
  let sentinel: string;
  beforeEach(() => {
    sentinel = join(root, 'outside.txt');
    writeFileSync(sentinel, 'keep me');
    mkdirSync(out);
  });
  const intact = () => {
    expect(readFileSync(sentinel, 'utf8')).toBe('keep me');
    expect(readdirSync(root).sort()).toEqual(['export', 'outside.txt']);
    expect(err.join('\n')).toMatch(/symbolic link/);
    expect(exits).toEqual([1]);
  };

  it('the Markdown file', async () => {
    state.world = await world('Team A', 'Team B');
    symlinkSync(sentinel, join(out, `Team A (${A}).md`));
    await sync('--chat', A);
    intact();
  });

  it('.sync-meta.json, refused before any Markdown is written', async () => {
    state.world = await world('Team A', 'Team B');
    symlinkSync(sentinel, join(out, '.sync-meta.json'));
    await sync('--chat', A);
    intact();
    expect(readdirSync(out)).toEqual(['.sync-meta.json']);
  });

  it('a media folder that links outside', async () => {
    state.world = await world('Team A', 'Team B');
    const elsewhere = join(root, 'elsewhere');
    mkdirSync(elsewhere);
    symlinkSync(elsewhere, join(out, 'media'));
    await sync('--chat', B, '--media');
    expect(readdirSync(elsewhere)).toEqual([]);
    rmSync(elsewhere, { recursive: true });
    intact();
  });

  it('a media file', async () => {
    state.world = await world('Team A', 'Team B');
    mkdirSync(join(out, 'media', B), { recursive: true });
    symlinkSync(sentinel, join(out, 'media', B, '1_palette.zip'));
    await sync('--chat', B, '--media');
    intact();
  });
});

describe('sync names each Markdown file by chat ID', () => {
  it('two chats with equal (or equal after sanitizing) titles get one file each', async () => {
    for (const [a, b] of [['Team', 'Team'], ['Team:', 'Team?']]) {
      state.world = await world(a, b);
      await sync('--chat', A);
      await sync('--chat', B);
      const files = readdirSync(out).filter(f => f.endsWith('.md')).sort();
      expect(files).toEqual([`Team- (${A}).md`, `Team- (${B}).md`].map(f => (a === 'Team' ? f.replace('Team-', 'Team') : f)).sort());
      expect(readFileSync(join(out, files.find(f => f.includes(A))!), 'utf8')).toMatch(/CI is green again/);
      expect(readFileSync(join(out, files.find(f => f.includes(A))!), 'utf8')).toContain(`Chat ID: ${A}`);
      expect(readFileSync(join(out, files.find(f => f.includes(B))!), 'utf8')).toContain(`Chat ID: ${B}`);
      expect(readFileSync(join(out, files.find(f => f.includes(B))!), 'utf8')).not.toMatch(/CI is green again/);
      rmSync(out, { recursive: true });
    }
    expect(exits).toEqual([0, 0, 0, 0]);
  });

  it('--resume appends to the file of that chat, and a file that does not name it is exported again', async () => {
    state.world = await world('Team', 'Team');
    await sync('--chat', A);
    await sync('--chat', B);
    const fileA = join(out, `Team (${A}).md`);
    const fileB = join(out, `Team (${B}).md`);
    const before = readFileSync(fileB, 'utf8');
    state.world.chats.find(c => c.id === 4001)!.messages.push({ id: 99, ago: 0, from: 1002, text: 'fresh news' } as never);
    // A marker only an append keeps: a full re-export would drop it
    writeFileSync(fileA, readFileSync(fileA, 'utf8') + '\nMARKER kept by append\n');
    await sync('--chat', A, '--resume');
    const resumed = readFileSync(fileA, 'utf8');
    expect(resumed).toMatch(/CI is green again[\s\S]*MARKER kept by append[\s\S]*fresh news/);
    expect(resumed.match(/CI is green again/g)).toHaveLength(1);
    expect(resumed.match(/^# Team$/gm)).toHaveLength(1);
    expect(readFileSync(fileB, 'utf8')).toBe(before);
    // A's file name holding someone else's export: resume rewrites it in full instead of appending
    writeFileSync(fileA, before);
    await sync('--chat', A, '--resume');
    const rewritten = readFileSync(fileA, 'utf8');
    expect(rewritten).toContain(`Chat ID: ${A}`);
    expect(rewritten).not.toContain(`Chat ID: ${B}`);
    expect(rewritten).toMatch(/CI is green again/);
    expect(exits).toEqual([0, 0, 0, 0]);
  });
});
