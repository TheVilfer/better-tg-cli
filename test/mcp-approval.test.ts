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
    // Nor in the action or the text: the human sees the full action in the dialog or terminal
    expect(JSON.stringify(login.result)).not.toContain('52813');
    expect(JSON.stringify(login.result.structuredContent!.action)).toContain('[login code hidden]');
    // Still approvable: the same call with the code sends the code as written
    const sent = await handleMessage(call({ args: ['send', '-1004001', 'Login code: 52813'], approval: login.result.structuredContent!.code }), run) as Reply;
    expect(sent.result.isError).toBeUndefined();
    expect(sent.result.content[0].text).toMatch(/Message ID: \d+/);
  });

  it('a code on its own line, or a gift link after "code:", stays hidden in the action and the text', async () => {
    const split = await handleMessage(call({ args: ['send', '-1004001', '-'], stdin: 'Login code:\n52813' }), run) as Reply;
    expect(split.result.structuredContent!.status).toBe('approval_required');
    expect(JSON.stringify(split.result)).not.toContain('52813');
    const gift = await handleMessage(call({ args: ['send', '-1004001', 'Gift code: tg://giftcode?slug=SAMPLE_ONLY'] }), run) as Reply;
    expect(gift.result.structuredContent!.status).toBe('approval_required');
    expect(JSON.stringify(gift.result)).not.toContain('SAMPLE_ONLY');
  });

  it('masks only a code the call carries, never the guard\'s own wording (a plain call, a wrong approval)', async () => {
    const plain = await handleMessage(call({ args: ['send', '-1004001', 'hi'] }), run) as Reply;
    expect(plain.result.structuredContent!.status).toBe('approval_required');
    const wrong = await handleMessage(call({ args: ['send', '-1004001', 'hi'], approval: 'ZZZZZZ' }), run) as Reply;
    const other = await handleMessage(call({ args: ['send', '-1004001', 'bye'], approval: plain.result.structuredContent!.code }), run) as Reply;
    for (const r of [plain, wrong, other]) expect(JSON.stringify(r.result)).not.toContain('hidden]');
    expect(other.result.structuredContent!.rejected).toBeDefined();
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

describe('click: the human sees the real button, the model a masked one (finding 9)', () => {
  const GIFT_URL = 'https://t.me/giftcode/SAMPLE_ONLY';
  const withGiftButton = async () => {
    const { seedWorld, saveWorld } = await import('../src/mock/world.js');
    const world = seedWorld();
    const team = world.chats.find(c => c.id === 4001)!;
    const id = Math.max(...team.messages.map(m => m.id)) + 1;
    team.messages.push({ id, ago: 60, from: 1001, text: 'Your gift', buttons: [[{ text: 'Open gift', url: GIFT_URL }]] });
    saveWorld(world, process.env.TG_MOCK!);
    setKnownCommands(['send', 'read', 'click']);
    return ['click', '-1004001', String(id), '1'];
  };

  it('the describe run (the dialog) shows the real link, the approval copy for the model hides it', async () => {
    const argv = await withGiftButton();
    const d = await describeWithCli({ argv, readOnly: false, stdin: '' }, spawnCli);
    expect(d).toMatchObject({ description: expect.stringContaining(`Pressing: #1 "Open gift": a link button (url), nothing is sent; it shows "${GIFT_URL}"`) });
    const r = await handleMessage(call({ args: argv }), run) as Reply;
    expect(r.result.structuredContent!.status).toBe('approval_required');
    expect(JSON.stringify(r.result)).not.toContain('SAMPLE_ONLY');
    expect(r.result.structuredContent!.action.description).toContain('it shows "https://t.me/giftcode/[gift code hidden]"');
  });

  it('the elicitation text has the real link; the click goes through and the model gets it masked', async () => {
    const argv = [...await withGiftButton(), '--json'];
    const asked: string[] = [];
    const r = await handleMessage(call({ args: argv }), run, {
      elicit: async m => (asked.push(m), true),
      describe: p => describeWithCli(p, spawnCli),
    }) as Reply;
    expect(asked).toHaveLength(1);
    expect(asked[0]).toContain(`it shows "${GIFT_URL}"`);
    // The press after the yes succeeded: a URL button, its link masked for the model
    expect(r.result.isError, r.result.content[0].text).toBeUndefined();
    const out = JSON.parse(r.result.content[0].text);
    expect(out).toMatchObject({ action: 'url', url: 'https://t.me/giftcode/[gift code hidden]' });
    expect(JSON.stringify(r.result)).not.toContain('SAMPLE_ONLY');
  });
});

describe('a document from 777000 keeps its code out of read in every view (finding 5)', () => {
  it('read plain, --json and --json --full: no file name with the code, the message id a number', async () => {
    const { seedWorld, saveWorld } = await import('../src/mock/world.js');
    const world = seedWorld();
    world.users.push({ id: 777000, firstName: 'Telegram' });
    world.chats.push({ id: 777000, kind: 'user', messages: [
      { id: 5, ago: 60, from: 777000, text: 'Your file', media: { kind: 'document', fileName: 'Login code: 52813.txt', mimeType: 'text/plain', size: 52813 } },
    ] });
    saveWorld(world, process.env.TG_MOCK!);
    for (const extra of [[], ['--json'], ['--json', '--full']]) {
      const r = await spawnCli({ argv: ['read', '777000', '-n', '5', ...extra], readOnly: true });
      expect(r.code, extra.join(' ') + r.err).toBe(0);
      expect(r.out, extra.join(' ')).not.toContain('52813.txt');
      expect(r.out, extra.join(' ')).toContain('[login code hidden]');
      if (extra.length) {
        const parsed = JSON.parse(r.out);
        const msg = (parsed.messages ?? parsed).find((m: { id: number }) => m.id === 5);
        expect(msg.id).toBe(5);
        expect(msg.media).toMatchObject({ kind: 'document', size: 52813 });
      }
    }
  });
});

describe('read keeps a link on another host whole (review 3, finding 3)', () => {
  it('support.me/giftcode/… stays, t.me/giftcode/… loses its slug', async () => {
    const { seedWorld, saveWorld } = await import('../src/mock/world.js');
    const world = seedWorld();
    const team = world.chats.find(c => c.id === 4001)!;
    const id = Math.max(...team.messages.map(m => m.id)) + 1;
    team.messages.push({ id, ago: 30, from: 1001, text: 'Order: https://support.me/giftcode/ORDER-42 gift: https://t.me/giftcode/SAMPLE_ONLY' });
    saveWorld(world, process.env.TG_MOCK!);
    for (const extra of [[], ['--json']]) {
      const r = await spawnCli({ argv: ['read', '-1004001', '-n', '1', ...extra], readOnly: true });
      expect(r.code, r.err).toBe(0);
      expect(r.out).toContain('https://support.me/giftcode/ORDER-42');
      expect(r.out).toContain('https://t.me/giftcode/[gift code hidden]');
      expect(r.out).not.toContain('SAMPLE_ONLY');
    }
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

  it('a trailing CRLF on stdin is neither shown nor sent: the dialog shows the body that goes out', async () => {
    const { readFileSync } = await import('node:fs');
    const asked: string[] = [];
    const r = await handleMessage(call({ args: ['send', '-1004001', '-', '--json'], stdin: 'Ship it\r\n' }), run, {
      elicit: async m => (asked.push(m), true),
      describe: describe_,
    }) as Reply;
    expect(asked).toHaveLength(1);
    expect(asked[0]).toContain('  Text (7 characters):\n    | Ship it\n  Command:');
    expect(r.result.isError, r.result.content[0].text).toBeUndefined();
    const id = JSON.parse(r.result.content[0].text).messageId as number;
    const world = JSON.parse(readFileSync(process.env.TG_MOCK!, 'utf8')) as { chats: { id: number; messages: { id: number; out?: boolean; text: string }[] }[] };
    const sent = world.chats.find(c => c.id === 4001)!.messages.filter(m => m.out && m.text.startsWith('Ship it'));
    expect(sent).toEqual([expect.objectContaining({ id, text: 'Ship it' })]);
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

describe('login codes stay out of what the model gets on every write path (masking review)', () => {
  const approveAndRun = async (args: Record<string, unknown>) => {
    const first = await handleMessage(call(args), run) as Reply;
    expect(first.result.structuredContent!.status).toBe('approval_required');
    const second = await handleMessage(call({ ...args, approval: first.result.structuredContent!.code }), run) as Reply;
    return { first, second };
  };

  it('a line break or tab next to the code (argv LF, stdin CRLF and TAB) never shows it in the action or Command', async () => {
    const cases = [
      { args: ['send', '-1004001', 'Login code:\n52813'] },
      { args: ['send', '-1004001', '-'], stdin: 'Login code:\r\n52813' },
      { args: ['send', '-1004001', '-'], stdin: 'Login code:\t52813' },
    ];
    for (const c of cases) {
      const r = await handleMessage(call(c), run) as Reply;
      const s = r.result.structuredContent!;
      expect(s.status).toBe('approval_required');
      expect(JSON.stringify(r.result)).not.toContain('52813');
      expect(s.action.description).toContain('[login code hidden]');
      expect(s.action.description).toMatch(/Command: telegram send -1004001 /);
      expect(s.retry).toMatchObject({ sameArgumentsAsThisCall: true });
      // The approval covers the raw value: the same call with the code sends it as written
      const sent = await handleMessage(call({ ...c, approval: s.code }), run) as Reply;
      expect(sent.result.isError).toBeUndefined();
    }
  });

  it('the body sent after approval is the approved text byte for byte, and a changed digit needs a new code (finding 10)', async () => {
    const { existsSync, readFileSync, writeFileSync } = await import('node:fs');
    setKnownCommands(['send', 'read', 'send-file']);
    const file = join(env.root, 'note.txt');
    writeFileSync(file, 'hello');
    const { seedWorld, saveWorld } = await import('../src/mock/world.js');
    saveWorld(seedWorld(), process.env.TG_MOCK!);
    // Every outgoing message in Team, oldest first: a resend of the same body shows up as a new ID
    const outgoing = () => {
      expect(existsSync(process.env.TG_MOCK!)).toBe(true);
      const world = JSON.parse(readFileSync(process.env.TG_MOCK!, 'utf8')) as { chats: { id: number; messages: { id: number; out?: boolean; text: string }[] }[] };
      const team = world.chats.find(c => c.id === 4001)!;
      return team.messages.filter(m => m.out).map(m => ({ id: m.id, text: m.text })).sort((a, b) => a.id - b.id);
    };
    const ids = () => outgoing().map(m => m.id);
    // `shown`: the text block the person approves, which is exactly what goes out
    const cases = [
      { c: { args: ['send', '-1004001', 'Login code:\n52813'] }, body: 'Login code:\n52813', shown: 'Text (17 characters)' },
      { c: { args: ['send', '-1004001', '-'], stdin: 'Login code:\r\n52813' }, body: 'Login code:\r\n52813', shown: 'Text (18 characters)' },
      { c: { args: ['send', '-1004001', '-'], stdin: 'Login code:\t52813' }, body: 'Login code:\t52813', shown: 'Text (17 characters)' },
      { c: { args: ['send-file', '-1004001', file, '-c', 'Login code:\n52813'] }, body: 'Login code:\n52813', shown: 'Caption (17 characters)' },
      // stdin ends with one line break, as `echo` and editors leave it: it is not part of the body,
      // neither in what the person approves nor in what is sent
      { c: { args: ['send', '-1004001', '-'], stdin: 'Готово 52813\n' }, body: 'Готово 52813', shown: 'Text (12 characters):\n    | Готово 52813\n' },
      { c: { args: ['send', '-1004001', '-'], stdin: 'Готово 52813\r\n' }, body: 'Готово 52813', shown: 'Text (12 characters):\n    | Готово 52813\n' },
      { c: { args: ['send-file', '-1004001', file, '-c', '-'], stdin: 'Готово 52813\n' }, body: 'Готово 52813', shown: 'Caption (12 characters):\n    | Готово 52813\n' },
      { c: { args: ['send-file', '-1004001', file, '-c', '-'], stdin: 'Готово 52813\r\n' }, body: 'Готово 52813', shown: 'Caption (12 characters):\n    | Готово 52813\n' },
    ];
    for (const { c, body, shown } of cases) {
      const label = JSON.stringify(c);
      const changed = JSON.parse(label.replace('52813', '52814')) as typeof c;
      // What the person approves: the body as it will be sent
      const d = await describeWithCli({ argv: c.args, readOnly: false, stdin: c.stdin ?? '' }, spawnCli);
      expect((d as { description: string }).description, label).toContain(shown);
      // One digit changed under the code for the original: refused as another action (the code burns), nothing sent
      const before = ids();
      const code0 = ((await handleMessage(call(c), run)) as Reply).result.structuredContent!.code as string;
      const swapped = await handleMessage(call({ ...changed, approval: code0 }), run) as Reply;
      expect(swapped.result.structuredContent, label).toMatchObject({ status: 'approval_required', rejected: { reason: 'different_action' } });
      expect(ids(), label).toEqual(before);
      // A fresh code: the call as approved sends exactly one message with exactly the approved body
      const code = ((await handleMessage(call(c), run)) as Reply).result.structuredContent!.code as string;
      expect(ids(), label).toEqual(before);
      const sent = await handleMessage(call({ ...c, approval: code }), run) as Reply;
      expect(sent.result.isError, label).toBeUndefined();
      const after = outgoing();
      const added = after.filter(m => !before.includes(m.id));
      expect(added, label).toHaveLength(1);
      expect(added[0].text, label).toBe(body);
      expect(sent.result.content[0].text, label).toContain(`Message ID: ${added[0].id}`);
      // The same code again, for the changed body and for the same one: refused, nothing more sent
      for (const retry of [changed, c]) {
        const again = await handleMessage(call({ ...retry, approval: code }), run) as Reply;
        expect(again.result.structuredContent, label).toMatchObject({ status: 'approval_required', rejected: { code } });
        expect(outgoing(), label).toEqual(after);
      }
    }
  }, 60_000);

  it('a code in a recipient or in the approval value, escaped by the CLI, stays hidden too', async () => {
    for (const args of [
      { args: ['send', 'Login code:\n52813', 'hi'] },
      { args: ['send', 'Login code:\n52813', 'hi', '--json'] },
      { args: ['send', '-1004001', 'hi'], approval: 'Login code:\n52813' },
    ]) {
      const r = await handleMessage(call(args), run) as Reply;
      expect(JSON.stringify(r.result), JSON.stringify(args)).not.toContain('52813');
    }
  });

  it('the human dialog still shows the raw code (the describe run is not masked)', async () => {
    const d = await describeWithCli({ argv: ['send', '-1004001', 'Login code:\n52813'], readOnly: false, stdin: '' }, spawnCli);
    expect(d).toMatchObject({ description: expect.stringContaining('52813') });
  });

  it('send, reply and send-file --json results mask the outgoing text and keep IDs exact', async () => {
    setKnownCommands(['send', 'read', 'reply', 'send-file']);
    const file = join(env.root, 'note.txt');
    (await import('node:fs')).writeFileSync(file, 'hello');
    const calls = [
      { args: ['send', '-1004001', 'Login code: 52813', '--json'], field: 'text' },
      { args: ['reply', '-1004001', '1', '-', '--json'], stdin: 'Login code:\n52813', field: 'text' },
      { args: ['send-file', '-1004001', file, '-c', 'Login code: 52813', '--json'], field: 'caption' },
    ];
    for (const { field, ...c } of calls) {
      const { second } = await approveAndRun(c);
      expect(second.result.isError).toBeUndefined();
      const text = second.result.content[0].text;
      expect(text).not.toContain('52813');
      const parsed = JSON.parse(text);
      expect(parsed[field]).toContain('[login code hidden]');
      expect(parsed.chatId).toBe('-1004001');
      expect(typeof parsed.messageId).toBe('number');
      expect(parsed.id).toBe(parsed.messageId);
      expect(Number.isInteger(parsed.messageId)).toBe(true);
    }
    // Plain text output keeps the message ID and the chat ID
    const { second } = await approveAndRun({ args: ['send', '-1004001', 'Login code: 52813'] });
    expect(second.result.content[0].text).toMatch(/Message ID: \d+ in Team \(-1004001\)/);
  });
});
