import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MockWorld } from '../src/mock/world.js';

// sync over MCP in mock mode is refused by the guard, so the guard is lifted here and the mock
// account is served straight to the command; nothing reaches Telegram.
const state = vi.hoisted(() => ({ world: undefined as MockWorld | undefined, realDownload: false }));
vi.mock('../src/guard.js', async orig => ({ ...(await orig<typeof import('../src/guard.js')>()), assertLocalWriteAllowed: () => {} }));
vi.mock('../src/client.js', async orig => {
  const { MockClient } = await import('../src/mock/client.js');
  return {
    ...(await orig<typeof import('../src/client.js')>()),
    getClient: async () => {
      const client = new MockClient(state.world!);
      if (state.realDownload) {
        // teleproto's own downloadMedia (its path choice and the write) on a photo with a cached
        // size, which it writes without any network request
        const { Api } = await import('teleproto');
        const downloads = await import('teleproto/client/downloads.js');
        const bigInt = (await import('big-integer')).default;
        client.downloadMedia = ((msg: InstanceType<typeof Api.Message>, p: { outputFile?: string }) => downloads.downloadMedia(client as never, new Api.Message({
          id: msg.id, peerId: msg.peerId, date: 1_700_000_000, message: '',
          media: new Api.MessageMediaPhoto({ photo: new Api.Photo({
            id: bigInt(msg.id), accessHash: bigInt(0), fileReference: Buffer.alloc(0), date: 1_700_000_000, dcId: 1,
            sizes: [new Api.PhotoCachedSize({ type: 's', w: 1, h: 1, bytes: Buffer.from('PHOTO') })],
          }) }),
        }), p.outputFile)) as never;
      }
      return client;
    },
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
  state.realDownload = false;
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

describe('sync --chat over MCP when the dialog list was cut', () => {
  beforeEach(() => { process.env.TG_MCP = '1'; });

  /** 500 more chats (older than the seed), and a second "Team A" whose last message is older than all, beyond the first 500. */
  async function crowded(): Promise<MockWorld> {
    const w = await world('Team A', 'Team B');
    for (let i = 0; i < 500; i++) {
      w.chats.push({ id: 7000 + i, kind: 'supergroup', title: `Filler ${i}`, messages: [{ id: 1, ago: 30 * 86400, from: 1002, text: 'x' }] } as never);
    }
    w.chats.push({ id: 8000, kind: 'supergroup', title: 'Team A', messages: [{ id: 1, ago: 400 * 86400, from: 1002, text: 'old' }] } as never);
    return w;
  }

  it('an exact title found on the first page is not proven unique: an ID is required', async () => {
    state.world = await crowded();
    await sync('--chat', 'Team A');
    expect(exits).toEqual([1]);
    expect(err.join('\n')).toMatch(/list was cut[\s\S]*use an ID:\n {2}-1004001 /);
    expect(existsSync(out)).toBe(false);
  });

  it('an ID or @username still syncs that one chat', async () => {
    state.world = await crowded();
    state.world.chats.find(c => c.id === 4001)!.username = 'team_a';
    await sync('--chat', '@team_a');
    expect(readdirSync(out).sort()).toEqual(['.sync-meta.json', `Team A (${A}).md`]);
    expect(exits).toEqual([0]);
  });

  it('selectSyncChats accepts the single title match only from a complete list', async () => {
    const { selectSyncChats } = await import('../src/commands/sync.js');
    const chats = [{ id: '1', title: 'Team A', type: 'group' as const }, { id: '2', title: 'X', type: 'group' as const }];
    expect(selectSyncChats(chats, 'Team A', true, true)).toEqual([chats[0]]);
    expect(selectSyncChats(chats, 'Team A', true, false)).toMatch(/list was cut/);
    // In a terminal the user picks the name and sees what was exported
    expect(selectSyncChats(chats, 'Team A', false, false)).toEqual([chats[0]]);
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

  it('a directory at a media file\'s place (teleproto would choose a file inside it)', async () => {
    state.world = await world('Team A', 'Team B');
    state.realDownload = true;
    mkdirSync(join(out, 'media', B, '1_palette.zip'), { recursive: true });
    symlinkSync(sentinel, join(out, 'media', B, '1_palette.zip', 'photo1700000000.jpg'));
    await sync('--chat', B, '--media');
    expect(readFileSync(sentinel, 'utf8')).toBe('keep me');
    expect(err.join('\n')).toMatch(/not a regular file/);
    expect(exits).toEqual([1]);
  });

  it('control: teleproto\'s own download writes the computed media file', async () => {
    state.world = await world('Team A', 'Team B');
    state.realDownload = true;
    await sync('--chat', B, '--media');
    expect(exits).toEqual([0]);
    expect(readFileSync(join(out, 'media', B, '1_palette.zip'), 'utf8')).toBe('PHOTO');
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
    // A's file name holding someone else's export: resume replaces it instead of appending, still
    // with only the messages after A's checkpoint (the checkpoint bounds the fetch either way)
    writeFileSync(fileA, before);
    state.world.chats.find(c => c.id === 4001)!.messages.push({ id: 100, ago: 0, from: 1002, text: 'newer still' } as never);
    await sync('--chat', A, '--resume');
    const rewritten = readFileSync(fileA, 'utf8');
    expect(rewritten).toContain(`Chat ID: ${A}`);
    expect(rewritten).not.toContain(`Chat ID: ${B}`);
    expect(rewritten).toContain('Continues after message #99');
    expect(rewritten).toMatch(/newer still/);
    expect(rewritten).not.toMatch(/CI is green again|fresh news/);
    expect(exits).toEqual([0, 0, 0, 0]);
  });

  it('--resume after the file name changed fetches the whole gap since the checkpoint into the new file', async () => {
    state.world = await world('Team A', 'Team B');
    // 1200 messages over 60 days; an older version exported up to #100 into "Team A.md"
    const DAY = 86400;
    state.world.chats.find(c => c.id === 4001)!.messages = Array.from({ length: 1200 }, (_, i) =>
      ({ id: i + 1, ago: Math.round((60 * DAY * (1200 - i)) / 1200), from: 1002, text: `m${i + 1}` })) as never;
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'Team A.md'), '# Team A\n\nType: supergroup\n\n---\n\n> m100\n');
    writeFileSync(join(out, '.sync-meta.json'), JSON.stringify({ [A]: { title: 'Team A', lastMessageId: 100, lastSyncDate: '2026-09-01T00:00:00Z' } }));
    // No --all: the default 7-day window and the 1000-message cap must not apply to the gap
    vi.resetModules();
    const { syncCommand } = await import('../src/commands/sync.js');
    await syncCommand.parseAsync(['--chat', A, '--resume', '--output', out], { from: 'user' });
    expect(exits).toEqual([0]);
    const text = readFileSync(join(out, `Team A (${A}).md`), 'utf8');
    const ids = [...text.matchAll(/^\*#(\d+)\*$/gm)].map(m => Number(m[1]));
    expect(ids).toHaveLength(1100);
    expect(ids[0]).toBe(101);
    expect(ids.at(-1)).toBe(1200);
    expect(text).toContain(`Chat ID: ${A}`);
    expect(text).toContain('Continues after message #100');
    expect(readFileSync(join(out, 'Team A.md'), 'utf8')).toContain('> m100');
    expect(JSON.parse(readFileSync(join(out, '.sync-meta.json'), 'utf8'))[A].lastMessageId).toBe(1200);
  });

  it('--resume into a file at the new name that names another chat still fetches the whole gap', async () => {
    state.world = await world('Team A', 'Team B');
    const DAY = 86400;
    state.world.chats.find(c => c.id === 4001)!.messages = Array.from({ length: 1200 }, (_, i) =>
      ({ id: i + 1, ago: Math.round((60 * DAY * (1200 - i)) / 1200), from: 1002, text: `m${i + 1}` })) as never;
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `Team A (${A}).md`), `# Team B\n\nChat ID: ${B}\n\n---\n`);
    writeFileSync(join(out, '.sync-meta.json'), JSON.stringify({ [A]: { title: 'Team A', lastMessageId: 100, lastSyncDate: '2026-09-01T00:00:00Z' } }));
    vi.resetModules();
    const { syncCommand } = await import('../src/commands/sync.js');
    await syncCommand.parseAsync(['--chat', A, '--resume', '--output', out], { from: 'user' });
    expect(exits).toEqual([0]);
    const text = readFileSync(join(out, `Team A (${A}).md`), 'utf8');
    const ids = [...text.matchAll(/^\*#(\d+)\*$/gm)].map(m => Number(m[1]));
    expect([ids.length, ids[0], ids.at(-1)]).toEqual([1100, 101, 1200]);
    expect(text).not.toContain(`Chat ID: ${B}`);
  });
});
