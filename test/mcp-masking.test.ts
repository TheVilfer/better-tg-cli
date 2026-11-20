import { afterEach, describe, expect, it } from 'vitest';
import { Api } from 'teleproto';
import bigInt from 'big-integer';
import { buildMessageFull, maskLoginCodes, messageText, serializeApiResult, toMessageInfo } from '../src/client.js';
import { describeParsedAction, parsedAction } from '../src/approval-action.js';
import { cliResult, handleMessage, result, setKnownCommands } from '../src/mcp.js';
import { holdsMaskedValue, maskForModel, maskGiftCodes, maskOutput } from '../src/mcp-output.js';

// The review of the MCP masking (docs/api-coverage.md §5): login codes and redeemable gift codes
// never reach the model on any output path; ordinary content, chat IDs, message IDs and approval
// codes stay as they are.

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

const GIFT = 'Gift code: tg://giftcode?slug=SAMPLE_ONLY';

describe('service messages: gift links are masked before login codes (finding 3)', () => {
  const from = (userId: number, message: string) => new Api.Message({
    id: 1, date: 0, message, peerId: new Api.PeerUser({ userId: bigInt(userId) }),
  });

  for (const sender of [777000, 489000]) {
    it(`from ${sender}: plain read and raw JSON`, () => {
      process.env.TG_MCP = '1';
      const plain = messageText(from(sender, GIFT));
      expect(plain).not.toContain('SAMPLE_ONLY');
      expect(plain).toContain('giftcode?slug=[gift code hidden]');
      const raw = serializeApiResult({ messages: [from(sender, GIFT)] });
      expect(raw).not.toContain('SAMPLE_ONLY');
      expect(JSON.parse(raw).messages[0].message).toContain('[gift code hidden]');
    });
  }

  it('a quote of a service message and maskLoginCodes itself mask the gift first', () => {
    expect(maskLoginCodes(GIFT)).not.toContain('SAMPLE_ONLY');
    process.env.TG_MCP = '1';
    const quoting = new Api.Message({
      id: 2, date: 0, message: 'see', peerId: new Api.PeerUser({ userId: bigInt(42) }),
      replyTo: new Api.MessageReplyHeader({ replyToMsgId: 1, quoteText: GIFT, replyToPeerId: new Api.PeerUser({ userId: bigInt(777000) }) }),
    });
    expect(serializeApiResult(quoting)).not.toContain('SAMPLE_ONLY');
  });
});

describe('percent-encoded gift slugs (finding 4)', () => {
  it('the whole slug value or path segment is masked, %HH included', () => {
    for (const link of [
      'tg://giftcode?slug=%53AMPLE_ONLY',
      'tg://giftcode?ref=1&slug=SAMP%4CE_ONLY',
      'https://t.me/giftcode/%53AMPLE_ONLY',
      'telegram.me/giftcode/SAMP%4CE_ONLY',
      'TG://GIFTCODE?SLUG=%53AMPLE_ONLY',
    ]) {
      const out = maskGiftCodes(`Take ${link}.`);
      expect(out).not.toMatch(/AMPLE|ONLY|%53|%4C/);
      expect(out).toMatch(/\[gift code hidden\]\.$/);
      expect(holdsMaskedValue(link)).toBe(true);
    }
    // Other links and a Markdown link around a gift link keep their shape
    expect(maskGiftCodes('[gift](https://t.me/giftcode/ABC) and t.me/durov')).toBe('[gift](https://t.me/giftcode/[gift code hidden]) and t.me/durov');
  });

  it('retry does not echo a lone encoded link back', () => {
    const argv = ['send', '-1', 'tg://giftcode?slug=%53AMPLE_ONLY'];
    const line = JSON.stringify({ error: 'approval_required', code: 'ABCDEF', expiresInMinutes: 10, action: { description: 'x', argv } });
    const r = result({ argv }, { code: 3, timedOut: false, out: `${line}\n`, err: 'Approval needed' });
    expect(r.structuredContent).toMatchObject({ code: 'ABCDEF', retry: { sameArgumentsAsThisCall: true } });
    expect(JSON.stringify(r)).not.toContain('AMPLE_ONLY');
  });
});

describe('a gift link is one of the Telegram hosts, matched whole (review 3, finding 3)', () => {
  it('t.me, telegram.me and telegram.dog, with or without www. and a scheme, hide the slug', () => {
    for (const host of ['t.me', 'telegram.me', 'telegram.dog', 'www.t.me', 'WWW.Telegram.Me']) {
      for (const link of [`https://${host}/giftcode/SAMPLE_ONLY`, `http://${host}/giftcode/SAMPLE_ONLY`, `${host}/giftcode/SAMPLE_ONLY`]) {
        expect(maskGiftCodes(`(${link})`), link).toBe(`(${link.replace('SAMPLE_ONLY', '[gift code hidden]')})`);
      }
    }
  });

  it('a host that only ends in one of them stays intact', () => {
    for (const text of [
      'https://support.me/giftcode/ORDER-42',
      'support.me/giftcode/ORDER-42',
      'https://evilt.me/giftcode/ORDER-42',
      'https://shop.t.me/giftcode/ORDER-42',
      'https://my-telegram.dog/giftcode/ORDER-42',
      'https://t.dog/giftcode/ORDER-42',
      'https://notelegram.me/giftcode/ORDER-42',
    ]) {
      expect(maskGiftCodes(text), text).toBe(text);
      expect(holdsMaskedValue(text), text).toBe(false);
    }
    // Side by side: the foreign link keeps its path, the Telegram one loses its slug
    expect(maskGiftCodes('support.me/giftcode/ORDER-42 vs t.me/giftcode/ORDER-42'))
      .toBe('support.me/giftcode/ORDER-42 vs t.me/giftcode/[gift code hidden]');
  });
});

describe('errors reach the model masked (finding 5)', () => {
  it('stderr: the text and structuredContent.stderr', () => {
    const r = cliResult(1, false, '', 'Login code: SAMPLE_ONLY');
    expect(JSON.stringify(r)).not.toContain('SAMPLE_ONLY');
    expect(r).toMatchObject({ isError: true, structuredContent: { exitCode: 1, stderr: 'Login code: [login code hidden]' } });
  });

  it('a JSON error keeps its structure and numbers', () => {
    const out = JSON.stringify({ error: { code: 'flood_wait', message: `Failed: ${GIFT} / Login code:\n52813`, retryAfterSeconds: 52813, candidates: [{ id: '-1004001' }] } });
    const r = cliResult(1, false, out, 'MOCK MODE');
    const parsed = JSON.parse((r.content[0] as { text: string }).text);
    expect(parsed.error.code).toBe('flood_wait');
    expect(parsed.error.retryAfterSeconds).toBe(52813);
    expect(parsed.error.candidates).toEqual([{ id: '-1004001' }]);
    expect(parsed.error.message).not.toMatch(/SAMPLE_ONLY|:\n52813/);
    expect(parsed.error.message).toContain('Login code:\n[login code hidden]');
  });

  it('a failed describe run, an unknown tool or command and an unknown method', async () => {
    process.env.TG_MOCK = '1';
    process.env.TG_MOCK_ASK = '1';
    setKnownCommands(['send', 'read']);
    const call = (name: string, args: Record<string, unknown>) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
    const never = async () => { throw new Error('must not run'); };
    const failed = await handleMessage(call('telegram_write', { args: ['send', '-1', 'hi'] }), never, {
      elicit: async () => true,
      describe: async () => ({ error: 'x', exitCode: 1, run: { code: 1, timedOut: false, out: '', err: 'Login code: SAMPLE_ONLY' } }),
    });
    expect(JSON.stringify(failed)).not.toContain('SAMPLE_ONLY');
    expect(JSON.stringify(failed)).toContain('Nothing was sent');
    const tool = await handleMessage(call(`x ${GIFT}`, {}), never);
    expect(JSON.stringify(tool)).not.toContain('SAMPLE_ONLY');
    const command = await handleMessage(call('telegram_read', { args: [GIFT.split(' ')[2]] }), never);
    expect(JSON.stringify(command)).toMatch(/Unknown|unknown/);
    expect(JSON.stringify(command)).not.toContain('SAMPLE_ONLY');
    const method = await handleMessage({ jsonrpc: '2.0', id: 1, method: GIFT } as never, never);
    expect(JSON.stringify(method)).toContain('Method not found');
    expect(JSON.stringify(method)).not.toContain('SAMPLE_ONLY');
  });
});

describe('the login-code phrase (finding 6)', () => {
  it('masks a code split by spaces or dashes whole, after any colon form', () => {
    for (const text of [
      'Login code: 52 813', 'Login code: 52-813', 'Login code: 52–813', 'Login code: 52—813', 'Login code: 52‑813',
      'Login code﹕ 52813', 'Login code： 52813', 'Код для входа в Telegram: 52 813',
    ]) {
      const out = maskForModel(text, 'echo');
      expect(out, text).not.toMatch(/52|813/);
      expect(out, text).toMatch(/\[login code hidden\]$/);
    }
    // The sentence after a code stays
    expect(maskForModel('Login code: 52813 Do not share it', 'echo')).toBe('Login code: [login code hidden] Do not share it');
  });

  it('needs "code" as a word of its own: IDs after other labels stay', () => {
    for (const text of ['Decode message ID: 42', 'Encoded chat: -1004001', 'Barcode: 4006381333931', 'Message ID: 52813 in Team (-1004001)']) {
      expect(maskForModel(text, 'echo')).toBe(text);
      expect(holdsMaskedValue(text)).toBe(false);
    }
  });

  it('never masks chat IDs, message IDs or approval codes in JSON or text', () => {
    const json = '{"ok":true,"action":"send","chatId":"-1004001","chatTitle":"Team","messageId":52813,"id":52813,"text":"Login code: 52813"}';
    const out = JSON.parse(maskOutput(json, 'echo'));
    expect(out).toMatchObject({ chatId: '-1004001', messageId: 52813, id: 52813, text: 'Login code: [login code hidden]' });
    const note = 'After a yes, call telegram_write again with the same args and stdin plus "approval": "H5SCNT". The code works once.';
    expect(maskOutput(note, 'echo')).toBe(note);
    // Through a whole approval result: the code and the chat stay readable
    const line = JSON.stringify({ error: 'approval_required', code: 'H5SCNT', expiresInMinutes: 10, action: { description: '  To: Team (supergroup, id -1004001)\n  msg-id: #52813', argv: ['reply', '-1004001', '52813', 'hi'] } });
    const r = result({ argv: ['reply', '-1004001', '52813', 'hi'] }, { code: 3, timedOut: false, out: `${line}\n`, err: note });
    expect(r.structuredContent).toMatchObject({ code: 'H5SCNT', retry: { arguments: { args: ['reply', '-1004001', '52813', 'hi'], approval: 'H5SCNT' } } });
    expect(JSON.stringify(r)).not.toContain('hidden]');
  });

  it('reads, and writes whose call holds no code, stay readable: gift links only', () => {
    const out = `Promo code: SUMMER and ${GIFT}`;
    const shown = 'Promo code: SUMMER and Gift code: tg://giftcode?slug=[gift code hidden]';
    const read = result({ argv: ['read', 'x'], readOnly: true }, { code: 0, timedOut: false, out, err: '' });
    expect((read.content[0] as { text: string }).text).toBe(shown);
    // A bot's answer to a click is chat content too
    const click = result({ argv: ['click', '@shop_bot', '2', 'Buy'], readOnly: false }, { code: 0, timedOut: false, out, err: '' });
    expect((click.content[0] as { text: string }).text).toBe(shown);
    // A write that carried a code gets its echo masked
    const send = result({ argv: ['send', '-1', 'Login code: 52813'], readOnly: false }, { code: 0, timedOut: false, out: 'Sent: Login code: 52813', err: '' });
    expect((send.content[0] as { text: string }).text).toBe('Sent: Login code: [login code hidden]');
  });

  it('a placeholder is not a label: masking twice changes nothing, IDs after it stay', () => {
    expect(maskForModel('t.me/giftcode/ABC, message ID: 42', 'echo')).toBe('t.me/giftcode/[gift code hidden], message ID: 42');
    const once = maskForModel('Login code: 52813, valid: 5 min', 'echo');
    expect(once).toBe('Login code: [login code hidden], valid: 5 min');
    expect(maskForModel(once, 'echo')).toBe(once);
    expect(maskForModel(maskForModel(GIFT, 'service'), 'service')).toBe(maskForModel(GIFT, 'service'));
  });

  it('a line break someone else already escaped does not split the code from its label', () => {
    for (const text of [
      'No chat is titled exactly "Login code:\\u{a}52813"',
      'Approval Login code:\\u{a}52813 not accepted',
      'Login code:\\n52813', 'Login code:\\\\r\\\\n52813', 'Login code:\\u000a52813', 'Login code:\\x0952813',
    ]) {
      expect(maskForModel(text, 'echo'), text).not.toContain('52813');
    }
  });

  it('a model-facing description masks before escaping; the human one is raw', () => {
    const action = parsedAction(['send', '-1004001', 'Login code:\n52813']);
    const human = describeParsedAction(action, new Map());
    expect(human).toContain('52813');
    const model = describeParsedAction(action, new Map(), undefined, [], t => maskForModel(t, 'echo'));
    expect(model).not.toContain('52813');
    expect(model).toMatch(/Login code:\\+u\{a\}\[login code hidden\]/);
  });

  // A time limit on these inputs, one size each: it catches a catastrophic backtrack, not a proof of linearity
  it('finishes in time on hostile inputs', () => {
    const hostile = [
      'tg://giftcode?'.repeat(40_000),
      'tg://giftcode?a=1&'.repeat(20_000),
      't.me/giftcode/'.repeat(40_000),
      `code${'x'.repeat(39)}:${' |'.repeat(100_000)}`,
      'code: '.repeat(50_000),
      `Login code: ${'1 '.repeat(100_000)}x`,
      'Code '.repeat(100_000),
      '"a\\'.repeat(50_000),
      `code:${'\\'.repeat(100_000)}`,
      'code:\\\\'.repeat(30_000),
      `t.me/giftcode/A${'.'.repeat(50_000)}Z`,
      `tg://giftcode?slug=A${'.'.repeat(50_000)}Z`,
      `Код${' '.repeat(100_000)}x`,
      'support.me/giftcode/'.repeat(40_000),
      `https://${'www.'.repeat(50_000)}t.me/giftcode/A`,
    ];
    for (const s of hostile) {
      const t = Date.now();
      maskForModel(s, 'service');
      maskOutput(s, 'echo');
      expect(Date.now() - t, s.slice(0, 20)).toBeLessThan(2000);
    }
  });
});

describe('round 2: narrower code label, exact placeholders, slug end, separator runs', () => {
  it('C: the label is "code"/"код" right before the colon (Russian label words may follow код)', () => {
    for (const text of [
      'See code review, message ID: 42', 'The code we wrote, see ID: 42', 'код ревью, сообщение: 42',
      'Promo code: SUMMER', 'exit code: 1', 'promo-code: X1', 'Decode: 42',
    ]) {
      expect(maskForModel(text, 'echo'), text).toBe(text);
      expect(holdsMaskedValue(text)).toBe(false);
    }
    for (const [text, lead] of [
      ['Login code: 52813', 'Login code: '],
      ['Your login code: 52813', 'Your login code: '],
      ['Telegram verification code:52813', 'Telegram verification code:'],
      ['Code: 52813', 'Code: '],
      ['Код для входа в Telegram: 52813', 'Код для входа в Telegram: '],
      ['Код подтверждения: 52813', 'Код подтверждения: '],
      ['Код входа : 52813', 'Код входа : '],
      ['Ваш код: 52813', 'Ваш код: '],
      ['Approval Login code: 52813', 'Approval Login code: '],
      ['    | Code: 52813', '    | Code: '],
    ]) {
      expect(maskForModel(text, 'echo'), text).toBe(`${lead}[login code hidden]`);
    }
  });

  it('D: only the exact placeholders are skipped; a real label in brackets is masked', () => {
    expect(maskForModel('[Login code: 52813]', 'echo')).toBe('[Login code: [login code hidden]]');
    expect(maskForModel('[Code: 52813]', 'echo')).toBe('[Code: [login code hidden]]');
    expect(holdsMaskedValue('[Login code: 52813]')).toBe(true);
    for (const kept of ['[login code hidden]', '[gift code hidden]', 'Login code: [login code hidden]']) {
      expect(maskForModel(kept, 'echo')).toBe(kept);
      expect(maskForModel(kept, 'service')).toBe(kept);
    }
    const err = cliResult(1, false, '', 'No chat "[Login code: 52813]"');
    expect(JSON.stringify(err)).not.toContain('52813');
  });

  it('E: the slug ends where slug characters end; the rest of the sentence stays', () => {
    expect(maskGiftCodes('t.me/giftcode/SAMPLE_ONLY,спасибо')).toBe('t.me/giftcode/[gift code hidden],спасибо');
    expect(maskGiftCodes('tg://giftcode?slug=SAMPLE_ONLY,спасибо')).toBe('tg://giftcode?slug=[gift code hidden],спасибо');
    expect(maskGiftCodes('t.me/giftcode/SAMPLE_ONLY,thanks')).toBe('t.me/giftcode/[gift code hidden],thanks');
    expect(maskGiftCodes('t.me/giftcode/SAMPLE_ONLY.Thanks')).toBe('t.me/giftcode/[gift code hidden].Thanks');
    expect(maskGiftCodes('tg://giftcode?slug=SAMPLE_ONLY.Thanks&x=1')).toBe('tg://giftcode?slug=[gift code hidden].Thanks&x=1');
    expect(maskGiftCodes('t.me/giftcode/SAMPLE_ONLY!!! ok')).toBe('t.me/giftcode/[gift code hidden]!!! ok');
    expect(maskGiftCodes('t.me/giftcode/SAMP%4CE_ONLY.')).toBe('t.me/giftcode/[gift code hidden].');
    const long = `t.me/giftcode/A${'.'.repeat(50_000)}Z`;
    const t = Date.now();
    expect(maskGiftCodes(long)).toBe(`t.me/giftcode/[gift code hidden]${'.'.repeat(50_000)}Z`);
    expect(maskGiftCodes(`t.me/giftcode/A${'.'.repeat(50_000)}`)).toBe(`t.me/giftcode/[gift code hidden]${'.'.repeat(50_000)}`);
    expect(Date.now() - t).toBeLessThan(2000);
  });

  it('G: a service code split by runs of spaces or tabs is masked whole', () => {
    for (const text of ['52  813', '52\t813', '52 \t 813', '5 2 8 1 3']) {
      const out = maskForModel(`Code ${text} here`, 'service');
      expect(out, text).not.toMatch(/\d/);
    }
  });
});

describe('F: every displayed string of a login-service message is masked (finding 5)', () => {
  const noClient = { getEntity: async () => { throw new Error('offline'); } } as never;
  const doc = (sender: number, fileName: string) => new Api.Message({
    id: 7, date: 0, message: '', peerId: new Api.PeerUser({ userId: bigInt(sender) }),
    media: new Api.MessageMediaDocument({
      document: new Api.Document({
        id: bigInt(99), accessHash: bigInt(1), fileReference: Buffer.alloc(0), date: 0, mimeType: 'audio/x-m4a',
        size: bigInt(52813), dcId: 2, attributes: [new Api.DocumentAttributeFilename({ fileName })],
      }),
    }),
  });

  it('media file name in the message info (plain, --json) and --full, IDs and numbers kept', async () => {
    process.env.TG_MCP = '1';
    for (const sender of [777000, 489000]) {
      const info = await toMessageInfo(noClient, doc(sender, 'Login code: 52813.txt'), { full: true });
      const json = JSON.stringify(info);
      expect(json, String(sender)).not.toContain('52813.txt');
      expect(info.media).toMatchObject({ kind: 'document', mimeType: 'audio/x-m4a', size: 52813, fileName: expect.stringContaining('[login code hidden]') });
      expect(info.id).toBe(7);
      expect(JSON.stringify(info.full)).not.toContain('52813.txt');
      const raw = serializeApiResult({ messages: [doc(sender, 'Login code: 52813.txt')] });
      expect(raw).not.toContain('52813.txt');
      expect(JSON.parse(raw).messages[0].media.document.size).toBe('52813');
    }
    // Another sender: the file name is chat content
    const other = await toMessageInfo(noClient, doc(42, 'Login code: 52813.txt'));
    expect(other.media!.fileName).toBe('Login code: 52813.txt');
  });

  it('a quote of a service message: its text and its entity URLs, in --full and raw JSON', () => {
    process.env.TG_MCP = '1';
    const quoting = new Api.Message({
      id: 3, date: 0, message: 'see', peerId: new Api.PeerUser({ userId: bigInt(42) }),
      replyTo: new Api.MessageReplyHeader({
        replyToMsgId: 1, quoteText: 'Войти 52813', replyToPeerId: new Api.PeerUser({ userId: bigInt(777000) }),
        quoteEntities: [new Api.MessageEntityTextUrl({ offset: 0, length: 5, url: 'https://example.invalid/?code=52813' })],
      }),
    });
    const raw = serializeApiResult(quoting);
    expect(raw).not.toContain('52813');
    const parsed = JSON.parse(raw);
    expect(parsed.replyTo.replyToMsgId).toBe(1);
    expect(parsed.replyTo.quoteEntities[0]).toMatchObject({ offset: 0, length: 5 });
    expect(parsed.replyTo.quoteText).toBe('Войти [login code hidden]');
    expect(buildMessageFull(quoting).replyTo).toMatchObject({ replyToMsgId: 1, quoteText: 'Войти [login code hidden]' });
  });
});
