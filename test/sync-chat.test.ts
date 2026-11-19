import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
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
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', 'Team A.md']);
    rmSync(out, { recursive: true });
    await sync('--chat', '@mock_team');
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', 'Team A.md']);
    const [id] = Object.keys(JSON.parse(readFileSync(join(out, '.sync-meta.json'), 'utf8')));
    rmSync(out, { recursive: true });
    await sync('--chat', id);
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', 'Team A.md']);
    expect(exits).toEqual([0, 0, 0]);
  });
});

describe('sync --chat in a terminal is unchanged', () => {
  it('a partial title still syncs every chat that contains it', async () => {
    state.world = await world('Team A', 'Team B');
    await sync('--chat', 'Team');
    expect(exits).toEqual([0]);
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', 'Team A.md', 'Team B.md']);
  });
});

describe('sync --media stays inside the output directory', () => {
  it('a chat titled ".." keeps its media under DIR/media/<chat id>', async () => {
    state.world = await world('Team A', '..');
    await sync('--chat', '..', '--media');
    expect(exits).toEqual([0]);
    expect(err.join('\n')).not.toMatch(/Could not sync|outside/);
    expect(readdirSync(out).sort()).toEqual(['...md', '.sync-meta.json', 'media']);
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
