import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TelegramClient } from 'teleproto';
import { buttonFingerprint, clickButton, disconnectClient, expectButton, getClient, resolveChat, sendFileMessage, setProfilePhoto } from '../src/client.js';
import { lookupPeers } from '../src/peer-lookup.js';
import { fileSnapshot, forgetFileSnapshots } from '../src/file-snapshot.js';
import { seedWorld } from '../src/mock/world.js';
import { setStrictChatResolution } from '../src/resolve-mode.js';

/**
 * The write takes what the approval was checked against, in the same process: the recipient object
 * the guard resolved, the file bytes it hashed, the button it showed. The mock account stands in
 * for Telegram (TG_MOCK), nothing leaves the machine.
 */
const dir = mkdtempSync(join(tmpdir(), 'tg-bound-write-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
let state: string;
let n = 0;
beforeEach(() => {
  state = join(dir, `state-${++n}.json`);
  process.env.TG_MOCK = state;
  forgetFileSnapshots();
});
afterEach(async () => {
  await disconnectClient();
  delete process.env.TG_MOCK;
  expectButton(undefined);
});

describe('the recipient the guard resolved is the one the write gets', () => {
  it('as the same object, even after a disconnect and with other matching', async () => {
    setStrictChatResolution(true);
    const peers = await lookupPeers(['@alice_example']);
    expect(peers.get('@alice_example')).toMatchObject({ ok: true, id: '1001' });
    const first = await resolveChat(await getClient(), '@alice_example');
    await disconnectClient(); // drops the lookup cache
    setStrictChatResolution(false);
    expect(await resolveChat(await getClient(), '@alice_example')).toBe(first);
  });
});

/** A client that records what an upload was given, and nothing else. */
function recorder() {
  const got: unknown[] = [];
  const entity = { className: 'User' };
  const client = {
    sendFile: async (_e: unknown, p: { file: unknown }) => (got.push(p.file), { id: 1 }),
    uploadFile: async (p: { file: unknown }) => (got.push(p.file), {}),
    invoke: async () => ({}),
    getMe: async () => entity,
  } as unknown as TelegramClient;
  return { client, got };
}

async function bytesOf(file: unknown): Promise<string> {
  expect(typeof file).toBe('object'); // never the path: it would be read again
  return Buffer.from(await (file as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer()).toString();
}

describe('an upload sends the snapshot the approval hashed, never the path again', () => {
  it('send-file', async () => {
    const f = join(dir, 'a.txt');
    writeFileSync(f, 'approved bytes');
    fileSnapshot(f); // what the guard hashed
    writeFileSync(f, 'swapped later!');
    const { client, got } = recorder();
    await sendFileMessage(client, 'me', f);
    expect(await bytesOf(got[0])).toBe('approved bytes');
    expect((got[0] as { name: string }).name).toBe('a.txt');
  });

  it('set-avatar', async () => {
    const f = join(dir, 'me.jpg');
    writeFileSync(f, 'approved photo');
    fileSnapshot(f);
    writeFileSync(f, 'another photo!');
    const { client, got } = recorder();
    await setProfilePhoto(client, f);
    expect(await bytesOf(got[0])).toBe('approved photo');
  });
});

describe('click presses only the button the person approved', () => {
  it('refuses when the keyboard changed between the approval and the press', async () => {
    const world = seedWorld();
    const menu = world.chats.find(c => c.id === 2001)!.messages[1];
    // What the person approved: #2 "Status", payload "status"
    const approved = buttonFingerprint({ index: 2, row: 0, col: 1, text: 'Status', type: 'callback', data: Buffer.from('status').toString('base64') });
    menu.buttons![0][1] = { text: 'Status', data: 'order', answer: 'Order created', reply: { text: 'Order #42 is confirmed.' } };
    writeFileSync(state, JSON.stringify(world));
    expectButton(approved);
    await expect(clickButton(await getClient(), '2001', 2, { index: 2 }, { waitMs: 0 })).rejects.toThrow(/changed after the approval; nothing was pressed/);
    // Unchanged, it is pressed
    expectButton(buttonFingerprint({ index: 1, row: 0, col: 0, text: 'Catalog', type: 'callback', data: Buffer.from('catalog').toString('base64') }));
    expect(await clickButton(await getClient(), '2001', 2, { index: 1 }, { waitMs: 0 })).toMatchObject({ action: 'callback' });
  });
});
