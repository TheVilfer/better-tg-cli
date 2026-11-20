import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { cliArgs } from './cli.js';

// Before any module under test is imported: a temp HOME and the mock account in mode "ask", so the
// server process (approvals it mints) and its children (the CLI) share the mock profile there
const env = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'tg-mcp-approval-'));
  const vars = { HOME: root, USERPROFILE: root, APPDATA: join(root, 'AppData'), TG_MOCK_ASK: '1', TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' };
  Object.assign(process.env, vars);
  return { root, vars };
});

import { childEnv, describeWithCli, handleMessage, result, setKnownCommands, type RunOutput } from '../src/mcp.js';

afterAll(() => rmSync(env.root, { recursive: true, force: true }));

let n = 0;
beforeEach(() => {
  process.env.TG_MOCK = join(env.root, `state-${++n}.json`);
  setKnownCommands(['send', 'read']);
});

type Plan = Parameters<typeof childEnv>[0];

/** The CLI as the server runs it: a child with exactly the environment childEnv() builds. */
function spawnCli(plan: Plan): Promise<RunOutput> {
  const r = spawnSync(process.execPath, [...cliArgs(), ...plan.argv], { encoding: 'utf8', input: plan.stdin ?? '', env: childEnv(plan) });
  return Promise.resolve({ code: r.status, timedOut: false, out: r.stdout, err: r.stderr });
}
const run = async (plan: Plan) => result(plan, await spawnCli(plan));
const call = (args: Record<string, unknown>) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'telegram_write', arguments: args } });
type Reply = { result: { content: { text: string }[]; isError?: boolean; structuredContent?: Record<string, any> } };

describe('over MCP without a dialog, "approval needed" is a result, not an error (5.3)', () => {
  it('a gift link or login code in the call is not echoed in retry: the model repeats its own call with the code', async () => {
    const args = ['send', '-1004001', '-'];
    const stdin = 'Your gift: https://t.me/giftcode/AbCd1234XyZ';
    const first = await handleMessage(call({ args, stdin }), run) as Reply;
    const s = first.result.structuredContent!;
    expect(s.status).toBe('approval_required');
    expect(s.retry).toMatchObject({ tool: 'telegram_write', sameArgumentsAsThisCall: true, arguments: { approval: s.code } });
    expect(s.retry.arguments.args).toBeUndefined();
    expect(s.retry.arguments.stdin).toBeUndefined();
    expect(JSON.stringify(first.result)).not.toContain('AbCd1234XyZ');
    expect(first.result.content[0].text).toContain(`exactly the same args and stdin as this call, plus "approval": "${s.code}"`);
    // Repeating the original call with the code goes through
    const second = await handleMessage(call({ args, stdin, approval: s.code }), run) as Reply;
    expect(second.result.isError).toBeUndefined();
    expect(second.result.content[0].text).toMatch(/Message ID: \d+/);

    const login = await handleMessage(call({ args: ['send', '-1004001', 'Login code: 52813'] }), run) as Reply;
    expect(login.result.structuredContent!.retry).toMatchObject({ sameArgumentsAsThisCall: true });
    expect(JSON.stringify(login.result.structuredContent!.retry)).not.toContain('52813');
  });

  it('has the code, the action and the exact retry call as structured content, and only MCP instructions as text', async () => {
    const first = await handleMessage(call({ args: ['send', '-1004001', '-'], stdin: 'See you at 7' }), run) as Reply;
    expect(first.result.isError).toBeUndefined();
    const s = first.result.structuredContent!;
    expect(s).toMatchObject({ status: 'approval_required', expiresInMinutes: 10 });
    expect(s.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(s.retry).toEqual({ tool: 'telegram_write', arguments: { args: ['send', '-1004001', '-'], stdin: 'See you at 7', approval: s.code } });
    expect(s.action.recipients).toEqual([{ given: '-1004001', id: '-1004001', name: 'Team', type: 'supergroup', username: 'mock_team' }]);
    const text = first.result.content[0].text;
    // Older clients drop structuredContent: the text still has the action and the code
    expect(text).toContain('To: Team (supergroup, @mock_team, id -1004001)');
    expect(text).toContain(`"approval": "${s.code}"`);
    expect(text).not.toMatch(/TG_APPROVE|PowerShell|environment/);

    // The retry it names goes through
    const second = await handleMessage(call(s.retry.arguments), run) as Reply;
    expect(second.result.isError).toBeUndefined();
    expect(second.result.content[0].text).toMatch(/Message ID: \d+/);
  });

  it('says why a code was refused', async () => {
    const r = await handleMessage(call({ args: ['send', '-1004001', 'hi'], approval: 'ZZZZZZ' }), run) as Reply;
    expect(r.result.structuredContent).toMatchObject({ status: 'approval_required', rejected: { code: 'ZZZZZZ', reason: 'unknown_or_expired' } });
  });

  it('an approval result masks gift links in its action, as every output is masked', () => {
    const line = JSON.stringify({
      error: 'approval_required', code: 'ABCDEF', expiresInMinutes: 10,
      action: { description: '  Send a message\n  To: Gifts https://t.me/giftcode/AbC123xyz (supergroup, id -1)', argv: ['send', '-1', 'x'] },
    });
    const r = result({ argv: ['send', '-1', 'x'] }, { code: 3, timedOut: false, out: `${line}\n`, err: 'Approval needed' });
    expect(r.structuredContent).toMatchObject({ status: 'approval_required', code: 'ABCDEF' });
    expect(JSON.stringify(r)).not.toContain('AbC123xyz');
  });

  it('other failures stay errors', () => {
    // with the exit code in structuredContent, as every non-approval result has it (agent-ux-cli)
    expect(result({ argv: ['send'] }, { code: 1, timedOut: false, out: '', err: 'Chat not found' })).toEqual({
      content: [{ type: 'text', text: 'Chat not found' }], isError: true, structuredContent: { exitCode: 1, stderr: 'Chat not found' },
    });
    // exit 3 without the guard's line (some other cause) is an error as before
    expect(result({ argv: ['send'] }, { code: 3, timedOut: false, out: '', err: 'x' }).isError).toBe(true);
  });
});

describe('the dialog shows who gets the write, by name (5.2)', () => {
  const describe_ = (p: Plan) => describeWithCli(p, spawnCli);

  it('asks with the human description the CLI made, then runs the write once', async () => {
    const asked: string[] = [];
    const r = await handleMessage(call({ args: ['send', '@mock_team', '-'], stdin: 'Ship it' }), run, {
      elicit: async m => (asked.push(m), true),
      describe: describe_,
    }) as Reply;
    expect(asked).toHaveLength(1);
    expect(asked[0]).toContain('  Send a message\n  To: Team (supergroup, @mock_team, id -1004001)\n  Text (7 characters):\n    | Ship it\n  Command: telegram send @mock_team -');
    expect(asked[0]).not.toMatch(/stdin/);
    expect(r.result.isError).toBeUndefined();
    expect(r.result.content[0].text).toMatch(/Message ID: \d+/);
  });

  it('a describe run never writes, whatever the mode', async () => {
    delete process.env.TG_MOCK_ASK; // the mock would write at once
    try {
      const d = await describe_({ argv: ['send', '-1004001', 'not sent'], readOnly: false });
      expect(d).toMatchObject({ description: expect.stringContaining('To: Team') });
      const read = await spawnCli({ argv: ['read', '-1004001', '-n', '1', '--json'], readOnly: true });
      expect(read.out).not.toContain('not sent');
    } finally {
      process.env.TG_MOCK_ASK = '1';
    }
  });

  it('a chat that is not found is reported, with no dialog', async () => {
    let asked = false;
    const r = await handleMessage(call({ args: ['send', 'Tea', 'hi'] }), run, { elicit: async () => (asked = true), describe: describe_ }) as Reply;
    expect(asked).toBe(false);
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toMatch(/^Nothing was sent: [^]*Not sent, nothing to approve: No chat is titled exactly "Tea"/);
    // The describe run's exit code comes back too (2: no chat has this exact title), as for any run
    expect(r.result.structuredContent).toMatchObject({ exitCode: 2 });
  });

  it('with --json the failed describe run answers like the CLI: the JSON error is the text, stderr apart', async () => {
    const r = await handleMessage(call({ args: ['send', 'Tea', 'hi', '--json'] }), run, { elicit: async () => true, describe: describe_ }) as Reply;
    expect(r.result.isError).toBe(true);
    const parsed = JSON.parse(r.result.content[0].text);
    expect(parsed.error).toMatchObject({ code: 'chat_not_exact', candidates: [{ id: '-1004001' }, { id: '-1004002' }] });
    expect(r.result.structuredContent).toMatchObject({ exitCode: 2, stderr: expect.stringContaining('MOCK MODE') });
  });

  it('childEnv sets the describe flag only for the describe run, never from the environment', () => {
    process.env.TG_APPROVAL_DESCRIBE = '1';
    try {
      expect(childEnv({ argv: ['send'], readOnly: false }).TG_APPROVAL_DESCRIBE).toBeUndefined();
      expect(childEnv({ argv: ['send'], readOnly: false, describe: true, approval: 'ABCDEF' })).toMatchObject({ TG_APPROVAL_DESCRIBE: '1' });
      expect(childEnv({ argv: ['send'], readOnly: false, describe: true, approval: 'ABCDEF' }).TG_APPROVE).toBeUndefined();
      expect(childEnv({ argv: ['read'], readOnly: true, describe: true }).TG_APPROVAL_DESCRIBE).toBeUndefined();
    } finally {
      delete process.env.TG_APPROVAL_DESCRIBE;
    }
  });
});
