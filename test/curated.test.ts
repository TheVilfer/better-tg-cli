import { afterEach, describe, expect, it } from 'vitest';
import type { TelegramClient } from 'teleproto';
import {
  getDrafts, getAdminLog, getProfilePhotos, getPermissions, toggleDialogPin, markDialogUnread, deleteDialog, disconnectClient,
} from '../src/client.js';
import { setStrictChatResolution } from '../src/resolve-mode.js';
import { MockClient } from '../src/mock/client.js';
import { seedWorld, type MockWorld } from '../src/mock/world.js';

const mock = (world: MockWorld = seedWorld(), saved?: (w: MockWorld) => void) =>
  new MockClient(world, saved) as unknown as TelegramClient;

afterEach(async () => {
  await disconnectClient();
  setStrictChatResolution(false);
});

describe('drafts', () => {
  it('lists saved drafts with their chat and text', async () => {
    const drafts = await getDrafts(mock());
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ chatTitle: 'Alice Example', text: 'Let us pick the deadline on the call tomorrow' });
  });
});

describe('admin-log', () => {
  it('returns recent actions newest first with a readable summary', async () => {
    const { chatTitle, entries } = await getAdminLog(mock(), 'Team');
    expect(chatTitle).toBe('Team');
    expect(entries.map(e => e.action)).toEqual(['ParticipantLeave', 'ParticipantJoin', 'ChangeTitle']);
    expect(entries[0].user).toBe('Carol');
    expect(entries[2].detail).toBe('"Project" → "Team"');
  });

  it('refuses a private chat', async () => {
    await expect(getAdminLog(mock(), 'alice')).rejects.toThrow(/supergroups and channels/);
  });
});

describe('profile-photos', () => {
  it('lists a user\'s photos', async () => {
    const { title, count, photos } = await getProfilePhotos(mock(), 'alice');
    expect(title).toBe('Alice');
    expect(count).toBe(2);
    expect(photos).toHaveLength(2);
  });

  it('is empty for a user with none', async () => {
    expect((await getProfilePhotos(mock(), 'me')).photos).toHaveLength(0);
  });
});

describe('permissions', () => {
  it('reports an admin\'s rights and the chat default', async () => {
    const admin = await getPermissions(mock(), 'Team', '@alice_example');
    expect(admin).toMatchObject({ user: 'Alice Example', status: 'admin' });
    expect(admin.adminRights).toContain('banUsers');

    const def = await getPermissions(mock(), 'Team');
    expect(def).toMatchObject({ chatTitle: 'Team', status: 'default' });

    const member = await getPermissions(mock(), 'Team', '@bob_sample');
    expect(member.status).toBe('member');
  });

  it('refuses a basic group / private chat', async () => {
    await expect(getPermissions(mock(), 'Family')).rejects.toThrow(/supergroups and channels/);
  });
});

describe('dialog state writes persist on the mock', () => {
  it('pins and unpins a chat', async () => {
    let saved: MockWorld | undefined;
    const world = seedWorld();
    await toggleDialogPin(mock(world, w => { saved = w; }), '@alice_example', true);
    expect(saved!.chats.find(c => c.id === 1001)!.pinnedDialog).toBe(true);
    await toggleDialogPin(mock(world, w => { saved = w; }), '@alice_example', false);
    expect(saved!.chats.find(c => c.id === 1001)!.pinnedDialog).toBeUndefined();
  });

  it('marks a chat unread and clears it', async () => {
    let saved: MockWorld | undefined;
    const world = seedWorld();
    await markDialogUnread(mock(world, w => { saved = w; }), '@alice_example', true);
    expect(saved!.chats.find(c => c.id === 1001)!.markedUnread).toBe(true);
    await markDialogUnread(mock(world, w => { saved = w; }), '@alice_example', false);
    expect(saved!.chats.find(c => c.id === 1001)!.markedUnread).toBeUndefined();
  });

  it('deletes a private conversation (clears history) and leaves a supergroup', async () => {
    const world = seedWorld();
    const user = await deleteDialog(mock(world), '@bob_sample');
    expect(user).toMatchObject({ title: 'Bob', left: false });

    const world2 = seedWorld();
    const before = world2.chats.length;
    const group = await deleteDialog(mock(world2), 'Team Design');
    expect(group).toMatchObject({ left: true });
    expect(world2.chats.length).toBe(before - 1);
  });
});
