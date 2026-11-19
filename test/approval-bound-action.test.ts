import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

/** Changes the mock account between two runs, as Telegram may change between the approval and the retry. */
function edit(cli: ReturnType<typeof account>, change: (w: any) => void): void {
  const w = cli.world();
  change(w);
  writeFileSync(cli.state, JSON.stringify(w));
}
const user = (w: any, id: number) => w.users.find((u: any) => u.id === id);
const swapUsername = (from: number, to: number) => (w: any) => {
  const name = user(w, from).username;
  user(w, from).username = `${name}_old`;
  user(w, to).username = name;
};

describe('every recipient, in every role, is approved as the ID it resolves to', () => {
  it('create-group: a member @username that changed hands before the retry is refused', () => {
    const cli = account();
    const asked = cli(['create-group', 'Project', '@alice_example', '--json']);
    expect(asked.code).toBe(3);
    expect(asked.json!.action.description).toContain('Member: Alice Example (user, @alice_example, id 1001)');
    edit(cli, swapUsername(1001, 1002)); // @alice_example is Bob now
    const r = cli(['create-group', 'Project', '@alice_example', '--json'], { approve: asked.json!.code });
    expect(r.code).toBe(3);
    expect(r.json!.rejected).toMatchObject({ reason: 'different_action' });
    expect(cli.world().chats.some(c => c.title === 'Project')).toBe(false);
  });

  it('create-group: the approved members are the group, and a member that is not a user stops it', () => {
    const cli = account();
    const asked = cli(['create-group', 'Project', '@alice_example', '--json']);
    expect(cli(['create-group', 'Project', '@alice_example'], { approve: asked.json!.code }).code).toBe(0);
    expect(cli.world().chats.find(c => c.title === 'Project')).toBeTruthy();
    const team = cli(['create-group', 'Other', '@alice_example', '@mock_team', '--json']);
    const r = cli(['create-group', 'Other', '@alice_example', '@mock_team'], { approve: team.json!.code });
    expect(r.code).toBe(1);
    expect(r.err).toContain('@mock_team is not a user');
    expect(cli.world().chats.some(c => c.title === 'Other')).toBe(false);
  });

  it('join: the chat is looked up and bound; an invite link stays a link', () => {
    const cli = account();
    const asked = cli(['join', '@mock_forum', '--json']);
    expect(asked.json!.action.description).toContain('Chat: Dev Forum (forum, @mock_forum, id -1004003)');
    edit(cli, w => {
      const forum = w.chats.find((c: any) => c.id === 4003);
      const design = w.chats.find((c: any) => c.id === 4002);
      forum.username = 'mock_forum_old';
      design.username = 'mock_forum';
    });
    const r = cli(['join', '@mock_forum', '--json'], { approve: asked.json!.code });
    expect(r.json!.rejected).toMatchObject({ reason: 'different_action' });
    expect(cli(['join', 'https://t.me/+AbCdEf']).err).toContain('Invite link: https://t.me/+AbCdEf');
  });

  it('kick: the user is found as the approval found them, and the write takes that user', () => {
    const cli = account();
    const asked = cli(['kick', '-1004001', '@bob_sample', '--json']);
    expect(asked.json!.action.description).toContain('User: Bob Sample (user, @bob_sample, id 1002)');
    expect(cli(['kick', '-1004001', '@bob_sample'], { approve: asked.json!.code }).code).toBe(0);
    expect((cli.world().chats.find(c => c.id === 4001) as any).bannedUsers.map((b: any) => b.userId)).toEqual([1002]);
  });

  it('kick by name: the write removes the user the approval named (no second lookup that cannot find them)', () => {
    const cli = account();
    const asked = cli(['kick', '-1004001', 'Bob Sample', '--json']);
    expect(asked.json!.action.description).toContain('User: Bob Sample (user, @bob_sample, id 1002)');
    const r = cli(['kick', '-1004001', 'Bob Sample'], { approve: asked.json!.code });
    expect(r.code).toBe(0);
    expect((cli.world().chats.find(c => c.id === 4001) as any).bannedUsers.map((b: any) => b.userId)).toEqual([1002]);
  });

  it('api: a chat inside the params ({"_chat"}) is a recipient: shown, bound by ID, refused when it changed', () => {
    const cli = account();
    const params = JSON.stringify({ peer: { _chat: '@alice_example' }, id: [1], revoke: true });
    const asked = cli(['api', 'messages.DeleteMessages', '-p', params]);
    expect(asked.code).toBe(3);
    expect(asked.err).toContain('Chat in params.peer: Alice Example (user, @alice_example, id 1001)');
    edit(cli, swapUsername(1001, 1002));
    const r = cli(['api', 'messages.DeleteMessages', '-p', params], { approve: /TG_APPROVE=([A-Z2-9]{6})/.exec(asked.err)![1] });
    expect(r.code).toBe(3);
    expect(r.err).toContain('not accepted: the approval was for a different command or text');
    // One that does not resolve gets no code at all
    const lost = cli(['api', 'messages.DeleteMessages', '-p', JSON.stringify({ peer: { _chat: '@nobody_here' }, id: [1] })]);
    expect(lost.code).toBe(1);
    expect(lost.err).toContain('Not sent, nothing to approve');
  });
});

describe('delete touches only messages of the chat the person saw', () => {
  it('refuses, before any code, an ID that is not in the chat (it would delete in another chat)', () => {
    const cli = account();
    // Bob's chat has #1 and #2; #4 is a message in Alice's chat and in Family
    const r = cli(['delete', '1002', '4']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/Not sent, nothing to approve: Message #4 not found in Bob/);
    expect(r.json).toBeUndefined();
  });

  it('checks again at the write, also where no approval is asked', () => {
    const cli = account();
    const r = cli(['delete', '1002', '2,4'], { env: { TG_MOCK_ASK: '' } });
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/Message #4 not found in Bob.*nothing was deleted/);
    expect(cli.chat(1001).messages.map(m => m.id)).toContain(4);
    expect(cli.chat(1002).messages.map(m => m.id)).toContain(2);
  });

  it('says that a channel or supergroup deletes for everyone, whatever --just-me says', () => {
    const cli = account();
    expect(cli(['delete', '-1004001', '3', '--just-me']).err).toContain('For everyone: in a channel or supergroup Telegram deletes a message for all members');
    expect(cli(['delete', '1001', '4', '--just-me']).err).not.toContain('For everyone');
    const asked = cli(['delete', '1001', '4', '--json']);
    expect(cli(['delete', '1001', '4'], { approve: asked.json!.code }).code).toBe(0);
    expect(cli.chat(1001).messages.map(m => m.id)).not.toContain(4);
    expect(cli.chat(3001).messages.map(m => m.id)).toContain(4);
  });

  it('never reports "just for you" where Telegram deleted for everyone', () => {
    const cli = account();
    const r = cli(['delete', '-1004001', '3', '--just-me', '--json'], { env: { TG_MOCK_ASK: '' } });
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ revoke: true });
    const text = cli(['delete', '-1004001', '2', '--just-me'], { env: { TG_MOCK_ASK: '' } });
    expect(text.out).toContain('(for everyone)');
    expect(text.out).not.toContain('just for you');
    expect(cli(['delete', '1001', '4', '--just-me', '--json'], { env: { TG_MOCK_ASK: '' } }).json).toMatchObject({ revoke: false });
  });
});

describe('click: the approval names the button and what it sends', () => {
  it('shows the kind and the payload, and refuses a code when the keyboard changed meanwhile', () => {
    const cli = account();
    const asked = cli(['click', '2001', '2', '2', '--json']);
    expect(asked.code).toBe(3);
    expect(asked.json!.action.description).toContain('Pressing: #2 "Status": a bot button, sends the bot the data c3RhdHVz = "status"');
    // The bot swapped the payload behind the same label and position
    edit(cli, w => { w.chats.find((c: any) => c.id === 2001).messages[1].buttons[0][1] = { text: 'Status', data: 'order', answer: 'Order created' }; });
    const r = cli(['click', '2001', '2', '2', '--json'], { approve: asked.json!.code });
    expect(r.code).toBe(3);
    expect(r.json!.rejected).toMatchObject({ reason: 'different_action' });
    expect(r.json!.action.description).toContain('sends the bot the data b3JkZXI= = "order"');
  });

  it('a keyboard button says it sends its label as a message', () => {
    const cli = account();
    edit(cli, w => { w.chats.find((c: any) => c.id === 2001).messages.push({ id: 3, ago: 1, text: 'Choose', keyboard: true, buttons: [[{ text: 'Yes' }, { text: 'No' }]] }); });
    expect(cli(['click', '2001', '3', 'No']).err).toContain('Pressing: #2 "No": a keyboard button, sends "No" as a message to the chat');
  });
});

describe('a file is approved and sent as one snapshot of its bytes', () => {
  it('an unreadable file gets no code', () => {
    const cli = account();
    // A missing file is a usage error checked before the guard (exit 2), so no code either
    const missing = cli(['send-file', '-1004001', join(home, 'missing.pdf')]);
    expect(missing.code).toBe(2);
    expect(missing.err).toMatch(/File not found: .*missing\.pdf/);
    expect(missing.out).not.toMatch(/approval_required/);
  });

  // chmod 000 keeps the file readable on Windows and for root
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('a file that exists but cannot be read gets no code either', () => {
    const cli = account();
    // It reaches the guard's snapshot: nothing to approve, exit 1
    const locked = join(home, 'locked.pdf');
    writeFileSync(locked, 'secret');
    chmodSync(locked, 0o000);
    try {
      const r = cli(['send-file', '-1004001', locked]);
      expect(r.code).toBe(1);
      expect(r.err).toMatch(/Not sent, nothing to approve: .*locked\.pdf/);
      expect(r.out).not.toMatch(/approval_required/);
    } finally {
      chmodSync(locked, 0o600);
    }
  });

  it('a file changed after the approval is refused; the sent file has the approved size', () => {
    const cli = account();
    const f = join(home, `report-${n}.txt`);
    writeFileSync(f, 'v1 of the report');
    const asked = cli(['send-file', '-1004001', f, '--json']);
    expect(asked.json!.action.description).toContain('File size: 16 bytes');
    writeFileSync(f, 'v2, edited later');
    expect(cli(['send-file', '-1004001', f, '--json'], { approve: asked.json!.code }).json!.rejected).toMatchObject({ reason: 'different_action' });
    const again = cli(['send-file', '-1004001', f, '--json']);
    expect(cli(['send-file', '-1004001', f], { approve: again.json!.code }).code).toBe(0);
    expect(cli.chat(4001).messages.at(-1)!.media).toMatchObject({ fileName: `report-${n}.txt`, size: 16 });
  });
});

describe('the approval knows every write and every recipient in it (scan)', () => {
  it('each write command has a description, and each argument or option that names a chat or user is a recipient', async () => {
    const { WRITE_COMMANDS, WRITE_SUBCOMMANDS } = await import('../src/mcp.js');
    const { descriptorOf } = await import('../src/approval-action.js');
    const r = spawnSync(process.execPath, [...cliArgs(), 'help-all'], { encoding: 'utf8', env: { ...process.env, TG_NO_UPDATE_CHECK: '1' } });
    const commands = new Map<string, { args: string[]; options: string[] }>();
    let current: { args: string[]; options: string[] } | undefined;
    for (const line of r.stdout.split('\n')) {
      const cmd = /^([a-z][\w-]*(?: [a-z][\w-]*)*)((?: [<[][^\]>]+[\]>])*) — /.exec(line);
      if (cmd) {
        current = { args: [...cmd[2].matchAll(/[<[]([\w]+)(?:\.\.\.)?[\]>]/g)].map(m => m[1]), options: [] };
        commands.set(cmd[1], current);
      } else if (current && /^ {2}-/.test(line)) current.options.push(...(line.match(/--[\w-]+/g) ?? []).slice(0, 1));
    }
    const writes = [...WRITE_COMMANDS, ...WRITE_SUBCOMMANDS, 'transfer-owner'].filter(w => commands.has(w));
    expect(writes.length).toBeGreaterThan(45);
    const peerName = /^(chat|user|users|group|target|fromChat|toChat|peer|bot|channel|member|members)$/;
    const peerOption = /^--(chat|user|peer|to|from|as|send-as|channel|member|bot)$/;
    // Not a recipient: sync only reads that chat into local files over MCP (nothing is sent), and picks it with its own exact-only rules
    const notRecipient = new Set(['sync --chat']);
    const missing: string[] = [];
    for (const w of writes) {
      const d = descriptorOf(w);
      if (!d) { missing.push(`${w}: no description`); continue; }
      for (const a of commands.get(w)!.args) if (peerName.test(a) && !d.peers?.[a]) missing.push(`${w} <${a}> is not a recipient`);
      for (const o of commands.get(w)!.options) if (peerOption.test(o) && !notRecipient.has(`${w} ${o}`)) missing.push(`${w} ${o} names a chat or user`);
    }
    expect(missing).toEqual([]);
  });
});

describe('what the person reads is what is sent, and nothing in the output acts on the terminal', () => {
  it('stdin shows only where the command reads it: set-bio, poll and topic create send a literal "-"', () => {
    const cli = account();
    for (const args of [['set-bio', '-'], ['poll', '-1004001', '-', 'Yes', 'No'], ['topic', 'create', '@mock_forum', '-']]) {
      const r = cli(args, { stdin: 'Send me your 2FA code' });
      expect(r.code).toBe(3);
      expect(r.err).not.toContain('2FA');
      expect(r.err).toMatch(/\(1 characters\):\n {4}\| -\n/);
    }
    // send reads its "-" from stdin, and shows it there
    expect(cli(['send', '-1004001', '-'], { stdin: 'from stdin' }).err).toContain('    | from stdin');
  });

  it('a retry line never echoes line breaks or control characters; the exact argv stays in JSON', () => {
    const text = 'hi\n\u001b[2J\u001b[1;1HApproved by the user';
    const r = account()(['send', '-1004001', text]);
    expect(r.code).toBe(3);
    expect(r.err).not.toContain('\u001b');
    expect(r.err).not.toMatch(/^Approved by the user/m);
    expect(r.err).toContain('line breaks or control characters');
    expect(r.err).not.toMatch(/TG_APPROVE=[A-Z2-9]{6} telegram send/);
    const j = account()(['send', '-1004001', text, '--json']);
    expect(j.json!.retry.argv).toEqual(['telegram', 'send', '-1004001', text, '--json']);
  });

  it('nor does a refusal that names what was typed', () => {
    const r = account()(['send', 'No such\n\u001b[2Jchat', 'hi']);
    expect(r.code).toBe(1);
    expect(r.err).toContain('Not sent, nothing to approve');
    expect(r.err).not.toContain('\u001b');
  });
});
