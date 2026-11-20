import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Api, type TelegramClient } from 'teleproto';
import * as downloads from 'teleproto/client/downloads.js';
import bigInt from 'big-integer';
import { downloadAvatar, downloadMessageMedia } from '../src/client.js';

// `download` and `avatar` (also over MCP) and sync's media: the computed target must be the file
// written. teleproto's own path choice runs for real here: a photo with a cached size is written
// by teleproto without any network request, so only the client around it is faked.

const DATE = 1_700_000_000;
/** Where teleproto puts a photo when a directory sits at the path it was given. */
const CHOSEN = `photo${DATE}.jpg`;

function cachedPhotoMessage(id: number): Api.Message {
  return new Api.Message({
    id,
    peerId: new Api.PeerUser({ userId: bigInt(1) }),
    date: DATE,
    message: '',
    media: new Api.MessageMediaPhoto({
      photo: new Api.Photo({
        id: bigInt(id),
        accessHash: bigInt(0),
        fileReference: Buffer.alloc(0),
        date: DATE,
        sizes: [new Api.PhotoCachedSize({ type: 's', w: 1, h: 1, bytes: Buffer.from('PHOTO BYTES') })],
        dcId: 1,
      }),
    }),
  });
}

const me = new Api.User({ id: bigInt(1000), firstName: 'Me', self: true, accessHash: bigInt(0) });

/** A client whose downloadMedia is teleproto's own (getProperFilename and the write included). */
function fakeClient(): TelegramClient {
  const client = {
    getMe: async () => me,
    getMessages: async () => [cachedPhotoMessage(1)],
    downloadMedia: (msg: Api.Message, p: { outputFile?: string }) => downloads.downloadMedia(client as never, msg, p.outputFile),
    // The network boundary of downloadProfilePhoto: teleproto writes through createWriteStream
    downloadProfilePhoto: async (_e: unknown, p: { outputFile: string }) => {
      await new Promise<void>((done, fail) => createWriteStream(p.outputFile).on('error', fail).end('AVATAR', done));
      return p.outputFile;
    },
  };
  return client as unknown as TelegramClient;
}

let root: string;
let out: string;
let sentinel: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tg-dl-'));
  out = join(root, 'out');
  mkdirSync(out);
  sentinel = join(root, 'outside.txt');
  writeFileSync(sentinel, 'keep me');
});
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

const intact = () => expect(readFileSync(sentinel, 'utf8')).toBe('keep me');

describe.skipIf(process.platform === 'win32')('download (and sync media) writes only the computed file', () => {
  it('control: the computed path is the file teleproto writes', async () => {
    const r = await downloadMessageMedia(fakeClient(), 'me', 1, out);
    expect(r?.filePath).toBe(join(out, '1_photo.jpg'));
    expect(readFileSync(join(out, '1_photo.jpg'), 'utf8')).toBe('PHOTO BYTES');
  });

  it('a directory at the target is refused (teleproto would pick a file inside it)', async () => {
    mkdirSync(join(out, '1_photo.jpg'));
    // The file teleproto would choose is a link out of the folder
    symlinkSync(sentinel, join(out, '1_photo.jpg', CHOSEN));
    await expect(downloadMessageMedia(fakeClient(), 'me', 1, out)).rejects.toThrow(/not a regular file/);
    intact();
    expect(readdirSync(join(out, '1_photo.jpg'))).toEqual([CHOSEN]);
  });

  it('a symbolic link at the target is refused', async () => {
    symlinkSync(sentinel, join(out, '1_photo.jpg'));
    await expect(downloadMessageMedia(fakeClient(), 'me', 1, out)).rejects.toThrow(/symbolic link/);
    intact();
  });
});

describe.skipIf(process.platform === 'win32')('avatar writes only the computed file', () => {
  const target = () => join(out, 'avatar_1000.jpg');

  it('control: a new file is written', async () => {
    const r = await downloadAvatar(fakeClient(), 'me', out);
    expect(r.filePath).toBe(target());
    expect(readFileSync(target(), 'utf8')).toBe('AVATAR');
  });

  it('a symbolic link at the target is refused', async () => {
    symlinkSync(sentinel, target());
    await expect(downloadAvatar(fakeClient(), 'me', out)).rejects.toThrow(/symbolic link/);
    intact();
  });

  it('a directory at the target is refused', async () => {
    mkdirSync(target());
    await expect(downloadAvatar(fakeClient(), 'me', out)).rejects.toThrow(/not a regular file/);
    expect(existsSync(join(target(), 'AVATAR'))).toBe(false);
    expect(readdirSync(target())).toEqual([]);
  });
});
