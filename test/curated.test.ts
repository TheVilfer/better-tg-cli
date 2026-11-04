import { afterEach, describe, expect, it } from 'vitest';
import type { TelegramClient } from 'teleproto';
import {
  getDrafts, getAdminLog, getProfilePhotos, getPermissions, getScheduledMessages, getSessions, getStars,
  getInviteLinks, getJoinRequests, toggleDialogPin, markDialogUnread, deleteDialog,
  setChatPermissions, permissionPresets, createForumTopic, editForumTopic, pinForumTopic, disconnectClient,
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

describe('scheduled messages', () => {
  it('lists messages queued to send later (not in normal history)', async () => {
    const { chatTitle, messages } = await getScheduledMessages(mock(), 'alice');
    expect(chatTitle).toBe('Alice');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: 1001, text: 'Happy New Year! 🎉', isOutgoing: true });
  });

  it('is empty for a chat with none', async () => {
    expect((await getScheduledMessages(mock(), 'Family')).messages).toHaveLength(0);
  });
});

describe('sessions / stars / invites (read-only)', () => {
  it('lists active login sessions with the current one flagged', async () => {
    const { ttlDays, sessions } = await getSessions(mock());
    expect(ttlDays).toBe(180);
    expect(sessions.find(s => s.current)).toBeDefined();
    expect(sessions).toHaveLength(2);
  });

  it('reports the Stars balance and transactions', async () => {
    const { balance, transactions } = await getStars(mock());
    expect(balance).toBe(250);
    expect(transactions.map(t => t.title)).toContain('Top-up');
    expect(transactions.find(t => t.title === 'Reaction')).toMatchObject({ refund: true, stars: 25 });
  });

  it('lists a chat\'s invite links and pending join requests', async () => {
    const links = await getInviteLinks(mock(), 'Team');
    expect(links.count).toBe(1);
    expect(links.invites[0]).toMatchObject({ permanent: true, usage: 12 });

    const reqs = await getJoinRequests(mock(), 'Team');
    expect(reqs.count).toBe(1);
    expect(reqs.requests[0]).toMatchObject({ name: 'Carol', about: 'Please add me' });
  });
});

describe('edit-permissions (write)', () => {
  it('sets default permissions, restricts a member, and lifts restrictions', async () => {
    const world = seedWorld();
    const client = mock(world);
    const team = () => world.chats.find(c => c.id === 4001)!;

    await setChatPermissions(client, 'Team', undefined, permissionPresets.MUTE_RIGHTS);
    expect(team().defaultBannedFlags).toContain('sendMessages');

    const until = Math.floor(Date.now() / 1000) + 3600;
    const res = await setChatPermissions(client, 'Team', '@alice_example', ['sendMessages', 'sendMedia'], until);
    expect(res).toMatchObject({ chatTitle: 'Team', target: 'Alice' });
    expect(team().bannedUsers).toEqual([{ userId: 1001, flags: ['sendMessages', 'sendMedia'], until }]);

    await setChatPermissions(client, 'Team', '@alice_example', []);
    expect(team().bannedUsers).toBeUndefined();
  });

  it('refuses per-user restrictions on a basic group', async () => {
    await expect(setChatPermissions(mock(), 'Family', '@alice_example', ['sendMessages'])).rejects.toThrow(/supergroup or channel/);
  });
});

describe('forum topics (write)', () => {
  it('creates, edits, closes and pins topics on a forum', async () => {
    const world = seedWorld();
    const client = mock(world);
    const forum = () => world.chats.find(c => c.id === 4003)!;

    await createForumTopic(client, 'Dev Forum', 'Release 2.0');
    expect(forum().topics!.some(t => t.title === 'Release 2.0')).toBe(true);

    await editForumTopic(client, 'Dev Forum', 10, { title: 'Bugs (triaged)' });
    expect(forum().topics!.find(t => t.id === 10)!.title).toBe('Bugs (triaged)');

    await editForumTopic(client, 'Dev Forum', 10, { closed: true });
    expect(forum().topics!.find(t => t.id === 10)!.closed).toBe(true);

    await pinForumTopic(client, 'Dev Forum', 10, true);
    expect(forum().topics!.find(t => t.id === 10)!.pinned).toBe(true);
  });

  it('refuses a non-forum chat', async () => {
    await expect(createForumTopic(mock(), 'Team', 'X')).rejects.toThrow(/not a forum/);
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
