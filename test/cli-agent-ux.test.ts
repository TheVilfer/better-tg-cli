import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { cliArgs } from './cli.js';
import { TOOLS } from '../src/mcp.js';

// The CLI as an agent runs it: a child process with stdin closed and no TTY, on the mock account
// (TG_MOCK, a state file of its own), so nothing reaches Telegram and no secret store is asked.
const home = mkdtempSync(join(tmpdir(), 'tg-agent-ux-'));
afterAll(() => rmSync(home, { recursive: true, force: true }));
let n = 0;

function cli(args: string[], extra: NodeJS.ProcessEnv = {}, state = join(home, `state-${n++}.json`)) {
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(TG|OP)_/i.test(k)));
  Object.assign(env, { HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: state, TG_NO_UPDATE_CHECK: '1' }, extra);
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
  const strip = (s: string) => s.replace(/^MOCK MODE.*\n/m, '');
  return { code: r.status, out: strip(r.stdout), err: strip(r.stderr), state };
}

/** The one JSON line an error prints on stdout with --json. */
const jsonError = (out: string) => JSON.parse(out.trim()).error;

describe('discovery', () => {
  it('1.1 names itself telegram, the binary, in usage and in the hints it prints', () => {
    expect(cli(['read', '--help']).out).toMatch(/^Usage: telegram read /m);
    const buttons = cli(['buttons', '@demo_bot', '2']);
    expect(buttons.code).toBe(0);
    expect(buttons.out).toMatch(/Press one with: telegram click "@demo_bot" 2/);
    expect(buttons.out).not.toMatch(/\btg click/);
  }, 30_000);

  it('1.2 finds the history export by "export" and "backup"', () => {
    expect(cli(['help-all', '-g', 'export']).out).toMatch(/^sync — Export or incrementally sync chat history/m);
    expect(cli(['help-all', '-g', 'backup']).out).toMatch(/^sync /m);
  }, 30_000);

  it('1.3 marks the commands that take --json / --markdown, and only those', () => {
    const all = cli(['help-all']).out;
    expect(all).toMatch(/^read <chat> — .* \[json, markdown\]$/m);
    expect(all).toMatch(/^check — .* \[json\]$/m);
    expect(all).toMatch(/^info <chat> — .* \[json\]$/m);
    expect(all).toMatch(/^onboard — .* \[json\]$/m);
    expect(all).toMatch(/^logout — [^[]*$/m);
  }, 30_000);

  it('1.4 a search prints only its matches, and says so when there are none', () => {
    const none = cli(['help-all', '-g', 'nonsensexyz']);
    expect(none.out.trim()).toBe('No commands match "nonsensexyz". Try a shorter word, or run `telegram help-all` without -g. Raw Telegram API methods are not listed here: `telegram schema` shows them.');
    expect(cli(['help-all', '-g', 'unread']).out).not.toMatch(/Telegram API/);
    expect(cli(['help-all']).out).toMatch(/Telegram API/);
  }, 30_000);

  it('1.5 lists no hidden flag with an empty description', () => {
    expect(cli(['help-all']).out).not.toMatch(/--invite \[key\] — $/m);
  }, 30_000);

  it('1.6 send --help says what --markdown does not do', () => {
    expect(cli(['send', '--help']).out).toMatch(/--markdown\s+Parse the message as GramJS Markdown.*links do not work, use --html/s);
  }, 30_000);

  it('6.1 --help ends with the exit codes', () => {
    const help = cli(['--help']).out;
    expect(help).toMatch(/^Usage: telegram /m);
    expect(help).toMatch(/Exit codes:\n {2}0 {2}ok\n {2}1 {2}runtime error.*\n {2}2 {2}usage.*\n {2}3 {2}write approval needed.*\n {2}4 {2}write access is disabled.*\n {2}5 {2}not logged in/);
  }, 30_000);
});

describe('input validation (exit 2, never a silent default)', () => {
  it.each([
    [['read', 'Team', '-n', 'abc']],
    [['read', 'Team', '-n', '-5']],
    [['read', 'Team', '-n', '0']],
    [['read', 'Team', '--max-text', 'x']],
    [['read', 'Team', '--before', 'abc']],
    [['read', 'Team', '--since', 'yesterday']],
    [['get', 'Team', '3', 'abc']],
    [['chats', '--preview', 'none']],
    [['inbox', '--type', 'robot']],
    [['chats', '--type', 'bots']],
    [['search', 'x', '--type', 'pictures']],
    [['topic', 'create', 'Dev Forum', 'T', '--icon-color', 'red']],
    [['topic', 'edit', 'Dev Forum', 'abc', '--title', 'x']],
    [['topic', 'close', 'Dev Forum', '0']],
    [['unpin', 'Team', 'abc']],
    [['typing', 'Team', 'dance']],
    [['mute', 'Team', '-d', 'soon']],
    [['edit-permissions', 'Team', '@alice', '--mute', '--until', 'later']],
    [['write-access', 'ask', '--for', '3x']],
  ])('3.1/3.4 %j', args => {
    const r = cli(args);
    expect(r.code).toBe(2);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/^error: (option|command-argument|argument)/m);
  }, 30_000);

  it('3.1 --preview 0 stays valid (no preview)', () => {
    const r = cli(['chats', '--preview', '0', '-n', '2']);
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/\|/);
  }, 30_000);

  it('4.6 a bad --reply-to or --topic stops the send before anything is sent', () => {
    const state = join(home, 'state-46.json');
    for (const flag of ['--reply-to', '--topic']) {
      const r = cli(['send', 'Team', `with ${flag}`, flag, 'abc'], {}, state);
      expect(r.code, flag).toBe(2);
      expect(r.err).toMatch(new RegExp(`option '${flag} <id>' argument 'abc' is invalid`));
    }
    const read = cli(['read', 'Team', '--json'], {}, state);
    expect(JSON.parse(read.out).messages.map((m: { text: string }) => m.text)).not.toContain('with --reply-to');
  }, 30_000);

  it('4.6 a bad message ID list stops delete and forward', () => {
    expect(cli(['delete', 'Team', '3,x']).code).toBe(2);
    expect(cli(['forward', 'Team', 'abc', 'me']).code).toBe(2);
    expect(cli(['vote', 'Team', '3', 'first']).code).toBe(2);
  }, 30_000);

  it('4.8 a bad --schedule is a usage error, not a stack trace', () => {
    const r = cli(['send', 'Team', 'y', '--schedule', 'soon']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/--schedule <when>' argument 'soon' is invalid\. Use "30m", "2h", "1d" or an ISO date/);
    expect(r.err).not.toMatch(/^\s+at /m);
  }, 30_000);

  it('6.1 unknown options and commands exit 2; with --json the error is one JSON line on stdout', () => {
    expect(cli(['read', 'Team', '--bogus']).code).toBe(2);
    const r = cli(['read', 'Team', '-n', 'abc', '--json']);
    expect(r.code).toBe(2);
    expect(r.err).toBe('');
    expect(jsonError(r.out)).toMatchObject({ code: 'invalid_argument', message: expect.stringMatching(/argument 'abc' is invalid/) });
    const unknown = cli(['frobnicate', '--json']);
    expect(unknown.code).toBe(2);
    expect(jsonError(unknown.out).code).toBe('usage');
  }, 30_000);
});

describe('chat names', () => {
  it('3.2 a name that fits several chats is an error with the candidates, not a silent pick', () => {
    const r = cli(['read', 'Tea', '-n', '1']);
    expect(r.code).toBe(2);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/"Tea" is part of 2 chat titles; use an ID or the exact title:\n {2}-1004001 supergroup Team @mock_team\n {2}-1004002 supergroup Team Design/);
    const json = jsonError(cli(['read', 'Tea', '--json']).out);
    expect(json).toMatchObject({ code: 'ambiguous_chat' });
    expect(json.candidates).toEqual([
      { id: '-1004001', title: 'Team', type: 'supergroup', username: 'mock_team' },
      { id: '-1004002', title: 'Team Design', type: 'supergroup' },
    ]);
    // One exact title or one partial match still reads
    expect(cli(['read', 'Team', '-n', '1']).code).toBe(0);
    expect(cli(['read', 'Desig', '-n', '1']).out).toMatch(/^# Team Design /m);
  }, 30_000);

  it('3.2 a write to a partial title stays refused, now with exit 2 and the candidates in JSON', () => {
    const r = cli(['send', 'Tea', 'hi', '--json']);
    expect(r.code).toBe(2);
    const json = jsonError(r.out);
    expect(json).toMatchObject({ code: 'chat_not_exact' });
    expect(json.candidates.map((c: { id: string }) => c.id)).toEqual(['-1004001', '-1004002']);
  }, 30_000);

  it('3.3 "Chat not found" names the closest titles and the command to look further', () => {
    const r = cli(['read', 'Tem']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/Chat not found: Tem\nClosest titles:\n {2}-1004001 supergroup Team @mock_team/);
    expect(r.err).toMatch(/List matching chats: telegram chats -q "Tem"/);
    const json = jsonError(cli(['read', 'Tem', '--json']).out);
    expect(json).toMatchObject({ code: 'chat_not_found', hint: 'List matching chats: telegram chats -q "Tem"' });
    expect(json.candidates[0]).toMatchObject({ id: '-1004001', title: 'Team' });
  }, 30_000);

  it('5.5 over MCP the error has no spinner glyph', () => {
    const r = cli(['read', 'NoSuchChatAtAll'], { TG_MCP: '1' });
    expect(r.code).toBe(1);
    expect(r.err).not.toMatch(/✖/);
    expect(r.err).toMatch(/^Chat not found: NoSuchChatAtAll\nList matching chats: telegram chats -q "NoSuchChatAtAll"/);
  }, 30_000);

  it('3.4 bots are a type of their own in chats and inbox; user still includes them', () => {
    const bots = JSON.parse(cli(['chats', '--type', 'bot', '--json']).out);
    expect(bots.map((c: { title: string }) => c.title)).toEqual(['Demo Bot']);
    expect(bots[0]).toMatchObject({ type: 'user', bot: true });
    expect(cli(['chats', '--type', 'bot']).out).toMatch(/^2001 user bot Demo Bot @demo_bot/m);
    const users = JSON.parse(cli(['chats', '--type', 'user', '--json']).out);
    expect(users.map((c: { title: string }) => c.title)).toContain('Demo Bot');
  }, 30_000);
});

describe('output shapes', () => {
  it('3.5 read, get and search carry the chat ID; every search result has chatId and id', () => {
    expect(JSON.parse(cli(['read', 'Team', '-n', '1', '--json']).out)).toMatchObject({ chatTitle: 'Team', chatId: '-1004001' });
    expect(JSON.parse(cli(['get', 'Team', '3', '--json']).out)).toMatchObject({ chatTitle: 'Team', chatId: '-1004001' });
    const inChat = JSON.parse(cli(['search', 'green', '--chat', 'Team', '--json']).out);
    expect(inChat[0]).toMatchObject({ chatTitle: 'Team', chatId: '-1004001' });
    expect(inChat[0].messages[0]).toMatchObject({ id: 3, chatId: '-1004001' });
    const global = JSON.parse(cli(['search', 'green', '--json']).out);
    for (const m of global[0].messages) expect(m).toMatchObject({ id: expect.any(Number), chatId: expect.any(String) });
  }, 30_000);

  it('3.6 a full page says how to get the next one; a short page does not', () => {
    const page = JSON.parse(cli(['read', 'Team', '-n', '2', '--json']).out);
    expect(page.messages).toHaveLength(2);
    expect(page).toMatchObject({ hasMore: true, nextBefore: Math.min(...page.messages.map((m: { id: number }) => m.id)) });
    expect(cli(['read', 'Team', '-n', '2']).out.trimEnd().split('\n').at(-1)).toBe(`… more: --before ${page.nextBefore}`);
    const all = JSON.parse(cli(['read', 'Team', '-n', '50', '--json']).out);
    expect(all.hasMore).toBeUndefined();
    expect(all.nextBefore).toBeUndefined();
  }, 30_000);

  it('3.8 a whole forum labels each message with its topic; --topic on a plain group is an error', () => {
    expect(cli(['read', 'Dev Forum', '-n', '3']).out).toMatch(/^#24 \S+ \S+ \[topic 10\] /m);
    expect(JSON.parse(cli(['read', 'Dev Forum', '-n', '1', '--json']).out).messages[0]).toMatchObject({ topicId: 10 });
    const r = cli(['read', 'Team', '--topic', '10']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/Team \(-1004001\) is not a forum/);
  }, 30_000);

  it('4.7 write results share one shape: ok, action, chatId, chatTitle, messageId(s); old fields stay', () => {
    const state = join(home, 'state-47.json');
    const sent = JSON.parse(cli(['send', 'Team', 'hello', '--json'], {}, state).out);
    expect(sent).toMatchObject({ ok: true, action: 'send', chatId: '-1004001', chatTitle: 'Team', messageId: sent.id, text: 'hello' });
    const reply = JSON.parse(cli(['reply', '-1004001', '3', 'ok', '--json'], {}, state).out);
    expect(reply).toMatchObject({ ok: true, action: 'reply', chatId: '-1004001', messageId: reply.id, replyToMsgId: 3 });
    const edited = JSON.parse(cli(['edit', 'Team', String(sent.id), 'hello!', '--json'], {}, state).out);
    expect(edited).toMatchObject({ ok: true, action: 'edit', chatId: '-1004001', messageId: sent.id, edited: true, chat: 'Team' });
    const deleted = JSON.parse(cli(['delete', 'Team', String(sent.id), '--json'], {}, state).out);
    expect(deleted).toMatchObject({ ok: true, action: 'delete', chatId: '-1004001', messageIds: [sent.id], deleted: [sent.id] });
    const text = cli(['send', 'Team', 'again'], {}, state).out;
    expect(text).toMatch(/^Message ID: \d+ in Team \(-1004001\)$/m);
  }, 30_000);

  it('3.9 sync --json names each chat\'s file and what was added; a second run says "up to date"', () => {
    const out = join(home, 'sync-out');
    const first = cli(['sync', '--chat', 'Team', '--output', out, '--all', '--json']);
    expect(first.code).toBe(0);
    const report = JSON.parse(first.out);
    expect(report.chats).toHaveLength(1);
    expect(report.chats[0]).toMatchObject({ chatId: '-1004001', title: 'Team', added: expect.any(Number) });
    expect(report.chats[0].added).toBeGreaterThan(0);
    expect(existsSync(report.chats[0].file)).toBe(true);
    const again = cli(['sync', '--chat', 'Team', '--output', out, '--resume'], {}, first.state);
    expect(again.code).toBe(0);
    expect(again.out).toMatch(new RegExp(`^Team \\(-1004001\\): up to date \\(last #${report.chats[0].lastId}\\)`, 'm'));
    expect(again.err).toMatch(/Synced 0 new messages in 0 chats .*\(1 already up to date\)/);
    expect(readFileSync(report.chats[0].file, 'utf8')).toMatch(/^# Team/);
  }, 30_000);

  it('3.6/3.7 search says when more may exist and names the time zone of a global result list', () => {
    const r = cli(['search', '', '-n', '1']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^# Results for "" \(times in .+, UTC[+-]\d/m);
    expect(r.out).toMatch(/^… more may exist: raise -n \(now 1\)/m);
    expect(JSON.parse(cli(['search', '', '-n', '1', '--json']).out)[0].hasMore).toBe(true);
    expect(JSON.parse(cli(['search', 'green', '--chat', 'Team', '--json']).out)[0].hasMore).toBeUndefined();
  }, 30_000);

  it('6.2 a message without media says how to look at it', () => {
    const r = cli(['download', 'Team', '3', '--json']);
    expect(r.code).toBe(1);
    expect(jsonError(r.out)).toEqual({
      code: 'no_media', message: 'Message #3 has no downloadable media',
      hint: 'Check the message: telegram get "Team" 3 (media shows as [photo …] or [document …]).',
    });
  }, 30_000);

  it('3.10 schema prints one line of JSON outside a terminal', () => {
    const r = cli(['schema', 'messages', 'get-history']);
    expect(r.code).toBe(0);
    expect(r.out.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(r.out)).toBeTypeOf('object');
    expect(cli(['schema', 'nosuchns']).code).toBe(2);
  }, 30_000);

  it('4.9 an unknown button lists the ones there are', () => {
    const r = cli(['click', '@demo_bot', '2', 'Nope']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/Button "Nope" not found on message #2\nAvailable: \[1\] Catalog, \[2\] Status/);
  }, 30_000);

  it('2.1 check shows the write mode and has --json', () => {
    expect(cli(['check']).out).toMatch(/^Write mode: on \(mock/m);
    const json = JSON.parse(cli(['check', '--json']).out);
    expect(json).toMatchObject({ configured: true, authenticated: true, mock: true, writeMode: 'on', account: { username: 'mock_owner' } });
  }, 30_000);

  it('mock refusals keep exit 2 and speak JSON with --json', () => {
    const r = cli(['write-access', '--json']);
    expect(r.code).toBe(2);
    expect(jsonError(r.out)).toMatchObject({ code: 'not_in_mock', hint: 'Unset TG_MOCK to use a real account.' });
  }, 30_000);
});

describe('MCP tool schema', () => {
  it('5.4 describes args on every tool that takes them', () => {
    for (const tool of TOOLS) {
      const props = tool.inputSchema.properties as unknown as Record<string, { description?: string } | undefined>;
      for (const [name, prop] of Object.entries(props)) expect(prop?.description, `${tool.name}.${name}`).toBeTruthy();
    }
  });
});
