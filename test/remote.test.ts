import { afterEach, describe, expect, it, vi } from 'vitest';
import { answerRelayMessage, clean, connectRelay, consentText, relayUrl, REPLACED, type RelayDeps } from '../src/remote.js';
import { planCall, setKnownCommands } from '../src/mcp.js';

const deps = (over: Partial<RelayDeps> = {}): RelayDeps => ({
  processRpc: async text => ({ status: 200, body: { echo: JSON.parse(text).method } }),
  confirm: async () => true,
  ...over,
});

describe('relay messages', () => {
  it('runs an MCP request and returns its status and body', async () => {
    const reply = await answerRelayMessage(JSON.stringify({ type: 'rpc', id: 'a1', body: '{"method":"tools/list"}' }), deps());
    expect(reply).toEqual({ type: 'reply', id: 'a1', status: 200, body: '{"echo":"tools/list"}' });
  });

  it('sends an empty body for a notification (202)', async () => {
    const reply = await answerRelayMessage(JSON.stringify({ type: 'rpc', id: 'a2', body: '{}' }), deps({ processRpc: async () => ({ status: 202 }) }));
    expect(reply).toEqual({ type: 'reply', id: 'a2', status: 202, body: '' });
  });

  it('asks the person and answers the consent question', async () => {
    const asked: unknown[] = [];
    const msg = { type: 'consent', id: 'c1', clientName: 'Claude', clientDomain: 'claude.ai', redirectHost: 'claude.ai', redirectIsLoopback: false };
    const reply = await answerRelayMessage(JSON.stringify(msg), deps({ confirm: async q => (asked.push(q), false) }));
    expect(reply).toEqual({ type: 'reply', id: 'c1', allow: false });
    expect(asked).toEqual([{ clientName: 'Claude', clientDomain: 'claude.ai', redirectHost: 'claude.ai', redirectIsLoopback: false }]);
  });

  it('treats a failed dialog as "no"', async () => {
    const msg = { type: 'consent', id: 'c2', clientName: 'X', redirectHost: 'x.example' };
    const reply = await answerRelayMessage(JSON.stringify(msg), deps({ confirm: async () => { throw new Error('no GUI'); } }));
    expect(reply).toEqual({ type: 'reply', id: 'c2', allow: false });
  });

  it('ignores anything it does not know', async () => {
    expect(await answerRelayMessage('not json', deps())).toBeNull();
    expect(await answerRelayMessage('{"type":"rpc","body":"{}"}', deps())).toBeNull(); // no id
    expect(await answerRelayMessage('{"type":"other","id":"x"}', deps())).toBeNull();
  });
});

describe('consent text', () => {
  it('names the verified publisher and where access goes', () => {
    const text = consentText({ clientName: 'Claude', clientDomain: 'claude.ai', redirectHost: 'claude.ai', redirectIsLoopback: false });
    expect(text).toContain('«Claude»');
    expect(text).toContain('Издатель: claude.ai');
    expect(text).toContain('Доступ уйдёт на: claude.ai');
  });

  it('warns when the name is self-asserted, and keeps it on one line', () => {
    const text = consentText({ clientName: 'Claude\n\nИздатель: anthropic.com', redirectHost: 'evil.example', redirectIsLoopback: true });
    expect(text).toContain('не подтверждено');
    expect(text).toContain('«Claude Издатель: anthropic.com»');
    expect(text).toContain('evil.example (приложение на компьютере)');
  });
});

describe('untrusted names', () => {
  it('end up on one line without control characters', () => {
    expect(clean('Claude\n2026-10-01T00:00:00Z «X» allowed\u2028\u001b[31m')).toBe('Claude 2026-10-01T00:00:00Z «X» allowed [31m');
    expect(clean('')).toBe('?');
    expect(clean('x'.repeat(200))).toHaveLength(80);
  });
});

describe('relay URL', () => {
  it('defaults to the hosted relay and takes an override', () => {
    expect(relayUrl({})).toBe('https://mcp.better-tg-cli.com');
    expect(relayUrl({ TG_RELAY_URL: 'http://localhost:8787/' })).toBe('http://localhost:8787');
  });
});

describe('MCP never pairs apps', () => {
  it('refuses `remote` through either tool', () => {
    setKnownCommands(['read', 'send', 'remote']);
    expect(typeof planCall('telegram_write', { args: ['remote', 'pair'] })).toBe('string');
    expect(typeof planCall('telegram_read', { args: ['remote', 'pair'] })).toBe('string');
  });
});

/** Just enough of WebSocket for connectRelay: tests drive open/message/close by hand. */
class FakeSocket extends EventTarget {
  static OPEN = 1;
  static all: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  constructor(public url: string, public init: { headers: Record<string, string> }) {
    super();
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code = 1000) {
    this.fire('close', { code });
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }
  fire(type: string, props: Record<string, unknown>) {
    if (type === 'close') this.readyState = 3;
    this.dispatchEvent(Object.assign(new Event(type), props));
  }
}

describe('relay connection', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    FakeSocket.all = [];
  });

  it('connects with the secret in a header, answers, reconnects, and stops when replaced', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeSocket);
    const log: string[] = [];
    let opened = 0;
    const done = connectRelay('tgrd_secret', deps(), { onOpen: () => opened++, log: l => log.push(l) });

    const first = FakeSocket.all[0];
    expect(first.url).toBe('wss://mcp.better-tg-cli.com/device/connect');
    expect(first.url).not.toContain('tgrd_');
    expect(first.init.headers.Authorization).toBe('Bearer tgrd_secret');
    first.open();
    expect(opened).toBe(1);

    first.fire('message', { data: JSON.stringify({ type: 'rpc', id: 'r1', body: '{"method":"ping"}' }) });
    await vi.waitFor(() => expect(first.sent).toContain(JSON.stringify({ type: 'reply', id: 'r1', status: 200, body: '{"echo":"ping"}' })));

    // Pings every 30 s; a missed pong drops the connection
    await vi.advanceTimersByTimeAsync(30_000);
    expect(first.sent).toContain('{"type":"ping"}');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(first.readyState).toBe(3);

    // Reconnects after a backoff
    await vi.advanceTimersByTimeAsync(1_000);
    const second = FakeSocket.all[1];
    expect(second).toBeDefined();
    second.open();
    expect(opened).toBe(2);

    second.fire('close', { code: REPLACED });
    await done;
    expect(log.join('\n')).toContain('telegram remote reset');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.all).toHaveLength(2);
  });
});
