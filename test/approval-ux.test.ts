import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeParsedAction, normalizedForm, type ParsedAction } from '../src/approval-action.js';
import { isMockAsk } from '../src/paths.js';
import { cliArgs } from './cli.js';

/**
 * The approval flow of write mode "ask" as an agent meets it, rehearsed on the mock account
 * (TG_MOCK_ASK=1): the real CLI, the real guard and the real chat lookup, nothing reaches Telegram
 * and no secret store is touched (the mock profile keeps its key in a file).
 */
const home = mkdtempSync(join(tmpdir(), 'tg-approval-ux-'));
afterAll(() => rmSync(home, { recursive: true, force: true }));
let n = 0;

/** A fresh mock account per test: its own state file, the same temp home. */
function account(extra: Record<string, string> = { TG_MOCK_ASK: '1' }) {
  const state = join(home, `state-${++n}.json`);
  return (args: string[], opts: { approve?: string; stdin?: string; env?: Record<string, string> } = {}) => {
    const r = spawnSync(process.execPath, [...cliArgs(), ...args], {
      encoding: 'utf8',
      input: opts.stdin ?? '',
      env: {
        ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: state, TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '',
        TG_APPROVE: '', TG_MCP: '', ...extra, ...(opts.approve ? { TG_APPROVE: opts.approve } : {}), ...opts.env,
      },
    });
    const json = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l) as Record<string, any>);
    return { code: r.status, out: r.stdout, err: r.stderr, json: json.at(-1) };
  };
}

describe('TG_MOCK_ASK rehearses write mode "ask" on the mock account (4.10)', () => {
  it('stops a write with exit 3 and a code, and lets it through once after the code', () => {
    const cli = account();
    const first = cli(['send', '-1004001', 'ship it', '--json']);
    expect(first.code).toBe(3);
    expect(first.json).toMatchObject({ error: 'approval_required', expiresInMinutes: 10 });
    const ok = cli(['send', '-1004001', 'ship it', '--json'], { approve: first.json!.code });
    expect(ok.code).toBe(0);
    expect(ok.json).toMatchObject({ text: 'ship it' });
    // Single use
    expect(cli(['send', '-1004001', 'ship it', '--json'], { approve: first.json!.code }).code).toBe(3);
  });

  it('without TG_MOCK_ASK the mock still writes without asking; without TG_MOCK it means nothing', () => {
    expect(account({})(['send', '-1004001', 'ship it']).code).toBe(0);
    const saved = { mock: process.env.TG_MOCK, ask: process.env.TG_MOCK_ASK };
    try {
      delete process.env.TG_MOCK;
      process.env.TG_MOCK_ASK = '1';
      expect(isMockAsk()).toBe(false);
    } finally {
      if (saved.mock === undefined) delete process.env.TG_MOCK; else process.env.TG_MOCK = saved.mock;
      if (saved.ask === undefined) delete process.env.TG_MOCK_ASK; else process.env.TG_MOCK_ASK = saved.ask;
    }
  });

  it('keeps its approvals and key in the mock profile', () => {
    const cli = account();
    cli(['send', '-1004001', 'x']);
    const dir = process.platform === 'win32' ? join(home, 'AppData', 'tg-mock') : join(home, '.config', 'tg-mock');
    expect(readdirSync(join(dir, 'approvals')).length).toBeGreaterThan(0);
    expect(readFileSync(join(dir, 'approval-key'), 'utf8').trim()).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('the person sees who gets the write, by name (4.1)', () => {
  it('leads with the action and the recipient (name, type, @username, id), then the full text, the raw command last', () => {
    const r = account()(['send', '-1004001', '-', '--silent'], { stdin: 'See you at 7\nBring the slides' });
    expect(r.code).toBe(3);
    const lines = r.err.split('\n');
    const start = lines.findIndex(l => l.includes('Send a message'));
    expect(lines.slice(start, start + 7)).toEqual([
      '  Send a message',
      '  To: Team (supergroup, @mock_team, id -1004001)',
      '  Options: --silent',
      '  Text (29 characters):',
      '    | See you at 7',
      '    | Bring the slides',
      '  Command: telegram send -1004001 - --silent',
    ]);
  });

  it('names the topic and the replied-to message, and a user by name', () => {
    const cli = account();
    const topic = cli(['send', '@mock_forum', 'hi', '--topic', '10', '--reply-to', '11']);
    expect(topic.err).toMatch(/To: Dev Forum \(forum, @mock_forum, id -\d+\)\n {2}Topic: #10 \(a thread of a forum\)\n {2}In reply to: message #11/);
    expect(cli(['send', '1001', 'hi']).err).toContain('To: Alice Example (user, @alice_example, id 1001)');
    expect(cli(['send', 'me', 'hi']).err).toContain('To: Saved Messages (your own chat, id 1000)');
  });

  it('a user argument is looked up like every recipient, and one that does not resolve gets no code', () => {
    const cli = account();
    // kick takes the very user the approval showed (no second lookup with other rules)
    expect(cli(['kick', '-1004001', 'Alice Example']).err).toContain('User: Alice Example (user, @alice_example, id 1001)');
    expect(cli(['kick', '-1004001', '@alice_example']).err).toContain('User: Alice Example (user, @alice_example, id 1001)');
    const unknown = cli(['kick', '-1004001', 'Alice']);
    // No code; the exit code is the lookup error's own: no exact title is a usage error (2)
    expect(unknown.code).toBe(2);
    expect(unknown.err).toMatch(/Not sent, nothing to approve: No chat is titled exactly "Alice"/);
  });

  it('gives the recipients as data in the JSON answer', () => {
    const r = account()(['send', '@alice_example', 'hi', '--json']);
    expect(r.json!.action).toMatchObject({
      recipients: [{ given: '@alice_example', id: '1001', name: 'Alice Example', type: 'user', username: 'alice_example' }],
      argv: ['send', '@alice_example', 'hi', '--json'],
    });
    expect(r.json!.action.description).toContain('To: Alice Example');
  });

  it('says so plainly when a chat is not found, and asks no approval for a write that would fail', () => {
    const r = account()(['send', 'Tea', 'hi']);
    // the same exit code the write itself gives in mode "on" (2: no chat has this exact title)
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/Not sent, nothing to approve: No chat is titled exactly "Tea".*-1004001 supergroup Team(;|$)/m);
    expect(r.json).toBeUndefined();
  });

  it('a chat title cannot forge a line of its own', () => {
    const action: ParsedAction = { command: 'send', args: [{ name: 'target', value: '-1' }, { name: 'message', value: 'hi' }], options: [], argv: ['send', '-1', 'hi'], parsed: true };
    const shown = describeParsedAction(action, new Map([['-1', { ok: true, id: '-1', title: 'Evil\n  Text (2 characters):\n    | ok', type: 'group' }]]));
    expect(shown.split('\n')).toHaveLength(5);
    expect(shown).toContain('To: Evil\\u{a}  Text');
  });
});

describe('a code is bound to the action, not to the bytes of argv (4.2)', () => {
  it('survives a dropped --json, another flag order and @username instead of the id', () => {
    const cli = account();
    const first = cli(['send', '-1004001', 'hi', '--silent', '--json']);
    expect(cli(['send', '--silent', '@mock_team', 'hi'], { approve: first.json!.code }).code).toBe(0);
  });

  it('is refused for a different body, a parse-mode flag or another recipient, and says why (4.3)', () => {
    const cli = account();
    const code = cli(['send', '-1004001', 'hi', '--json']).json!.code;
    const markdown = cli(['send', '-1004001', 'hi', '--markdown', '--json'], { approve: code });
    expect(markdown.code).toBe(3);
    expect(markdown.json).toMatchObject({ rejected: { code, reason: 'different_action' } });
    expect(markdown.err).toMatch(new RegExp(`Approval ${code} not accepted: the approval was for a different command or text \\(the command, recipient, text`));

    const code2 = cli(['send', '-1004001', 'hi', '--json']).json!.code;
    expect(cli(['send', '-1004002', 'hi', '--json'], { approve: code2 }).json).toMatchObject({ rejected: { reason: 'different_action' } });
    const code3 = cli(['send', '-1004001', '-', '--json'], { stdin: 'hi' }).json!.code;
    // The body stays exact: a trailing newline is part of what was approved
    expect(cli(['send', '-1004001', '-', '--json'], { stdin: 'hi\n', approve: code3 }).json).toMatchObject({ rejected: { reason: 'different_action' } });
    expect(cli(['send', '-1004001', 'hi', '--json'], { approve: 'ZZZZZZ' }).json).toMatchObject({ rejected: { code: 'ZZZZZZ', reason: 'unknown_or_expired' } });
  });

  it('normalizes: options at their default and output-only flags are not part of it, everything parsed is', () => {
    const base: ParsedAction = { command: 'send', args: [{ name: 'target', value: '@x' }], options: [['silent', true]], argv: [], parsed: true };
    const peers = new Map([['@x', { ok: true as const, id: '42', title: 'X', type: 'user' }]]);
    expect(normalizedForm(base, peers)).toEqual({ v: 3, command: 'send', args: [{ name: 'target', value: { peer: '42' } }], options: [['silent', true]] });
    // A recipient that did not resolve has no form to approve
    expect(() => normalizedForm(base, new Map([['@x', { ok: false, error: 'no' }]]))).toThrow(/not resolved/);
  });
});

describe('the retry is spelled out (4.4)', () => {
  it('as argv and environment in JSON, and as shell and PowerShell lines in the text', () => {
    const r = account()(['send', '-1004001', 'See you', '--json']);
    const code = r.json!.code;
    expect(r.json!.retry).toEqual({ argv: ['telegram', 'send', '-1004001', 'See you', '--json'], env: { TG_APPROVE: code } });
    expect(r.err).toContain(`TG_APPROVE=${code} telegram send -1004001 'See you' --json`);
    expect(r.err).toContain(`$env:TG_APPROVE='${code}'; telegram send -1004001 'See you' --json`);
  });

  it('over MCP: always a JSON line for the server, and only the MCP instruction in the text', () => {
    const r = account()(['send', '-1004001', 'hi'], { env: { TG_MCP: '1' } });
    expect(r.code).toBe(3);
    expect(r.json).toMatchObject({ error: 'approval_required' });
    expect(r.json!.retry).toBeUndefined(); // the server adds the tool call
    expect(r.err).toContain(`"approval": "${r.json!.code}"`);
    expect(r.err).not.toMatch(/TG_APPROVE|PowerShell/);
  });
});
