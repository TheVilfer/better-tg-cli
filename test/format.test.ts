import { describe, expect, it } from 'vitest';
import { formatJson } from '../src/formatters/json.js';
import { formatChats, formatMessages, truncate } from '../src/formatters/plain.js';
import type { ChatInfo, MessageInfo } from '../src/client.js';

describe('truncate', () => {
  it('keeps short text untouched', () => {
    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('hello')).toBe('hello');
  });

  it('never splits an emoji surrogate pair', () => {
    const out = truncate('ab😀😀😀', 3);
    expect(out).toBe('ab😀…');
    // A lone surrogate would make JSON.parse(JSON.stringify(...)) round-trip lossy
    expect(() => JSON.parse(formatJson({ t: out }))).not.toThrow();
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(out)).toBe(false);
  });
});

describe('formatJson', () => {
  it('is compact off a TTY and drops empty optional fields', () => {
    const json = formatJson({ id: 1, username: '', lastMessage: null, extra: undefined, list: [] });
    expect(json).toBe('{"id":1,"list":[]}');
  });

  it('always keeps text/title/sender so jq filters never hit null', () => {
    const parsed = JSON.parse(formatJson({ messages: [{ id: 1, text: '', sender: '' }], title: '' }));
    expect(parsed.messages[0].text).toBe('');
    expect(parsed.messages[0].sender).toBe('');
    expect(parsed.title).toBe('');
  });

  it('keeps top-level arrays even when empty', () => {
    expect(formatJson([])).toBe('[]');
  });
});

const msg = (over: Partial<MessageInfo>): MessageInfo => ({
  id: 10,
  date: new Date(2026, 8, 27, 13, 5),
  sender: 'Alice',
  text: 'hi',
  isOutgoing: false,
  ...over,
});

describe('compact message lines', () => {
  it('puts the ID first on one line', () => {
    expect(formatMessages([msg({})])).toBe('#10 2026-09-27 13:05 Alice: hi');
  });

  it('shows replies, comment counts, media and indents continuation lines', () => {
    const out = formatMessages([
      msg({ replyToMsgId: 7, replies: 3, text: 'line1\n\n\nline2', media: { kind: 'photo' } }),
    ]);
    expect(out).toBe('#10 2026-09-27 13:05 Alice ↩7 💬3: [📷 photo] line1\n  line2');
  });

  it('omits the sender when it is the chat itself (channel posts)', () => {
    expect(formatMessages([msg({ sender: 'News' })], 'News')).toBe('# News\n#10 2026-09-27 13:05: hi');
  });

  it('tags cross-chat results with the chat', () => {
    const out = formatMessages([msg({ chatId: '-100', chatTitle: 'Chan', sender: 'Chan' })]);
    expect(out).toBe('#10 2026-09-27 13:05 [Chan -100]: hi');
  });

  it('marks outgoing messages and truncates with --max-text', () => {
    expect(formatMessages([msg({ isOutgoing: true, text: 'abcdef' })], undefined, 3)).toBe('#10 2026-09-27 13:05 You: abc…');
  });

  it('keeps bot buttons with their indexes', () => {
    const out = formatMessages([
      msg({
        buttons: {
          isInline: true,
          rows: [[{ index: 1, text: 'Go', type: 'callback', row: 0, col: 0 } as never]],
        },
      }),
    ]);
    expect(out.split('\n')[1]).toBe('  inline keyboard: [1] Go (callback)');
  });
});

describe('compact chat lines', () => {
  it('lists ID, type, flags, unread, title, username and preview', () => {
    const chat: ChatInfo = {
      id: '-1001',
      title: 'Team',
      type: 'supergroup',
      username: 'team',
      unreadCount: 4,
      muted: true,
      lastMessage: 'multi\nline preview',
    };
    expect(formatChats([chat])).toBe('-1001 supergroup muted unread=4 Team @team | multi line preview');
    expect(formatChats([chat], 0)).toBe('-1001 supergroup muted unread=4 Team @team');
  });
});
