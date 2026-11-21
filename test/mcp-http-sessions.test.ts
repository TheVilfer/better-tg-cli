import { afterAll, describe, expect, it, vi } from 'vitest';
import { rmSync } from 'node:fs';

// Before any module under test: a temp HOME and the mock account, so a plugin lookup never reaches a real profile
const env = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'tg-mcp-http-sessions-'));
  Object.assign(process.env, { HOME: root, USERPROFILE: root, APPDATA: join(root, 'AppData'), TG_MOCK: join(root, 'mock-state.json'), TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' });
  return { root };
});

import { createRpcProcessor } from '../src/mcp-http.js';
import { setKnownCommands } from '../src/mcp.js';

afterAll(() => rmSync(env.root, { recursive: true, force: true }));

const runCall = (id: number) => JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'telegram_read', arguments: { args: ['plugin', 'run', 'lab', 'probe'] } } });
const cancel = (id: number) => JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: id } });

describe('MCP over HTTP: plugin run cancellation per session (#8)', () => {
  it('initialize hands out a session id; two sessions with the same request id never cancel each other', async () => {
    setKnownCommands(['plugin', 'plugin run', 'plugin list']);
    const started: string[] = [];
    let releaseA!: () => void;
    const signals: AbortSignal[] = [];
    const run = async (plan: { argv: string[]; signal?: AbortSignal }) => {
      started.push(plan.argv.join(' '));
      signals.push(plan.signal!);
      if (started.length === 1) await new Promise<void>(r => { releaseA = r; });
      return { content: [{ type: 'text' as const, text: `run ${started.length}` }] };
    };
    const rpc = createRpcProcessor({}, run as never);
    const initA = await rpc(JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-11-25' } }));
    const initB = await rpc(JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-11-25' } }));
    const a = initA.headers?.['Mcp-Session-Id'];
    const b = initB.headers?.['Mcp-Session-Id'];
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);

    // A's id 1 runs, B's id 1 waits in the queue behind it
    const replyA = rpc(runCall(1), a);
    await new Promise(r => setTimeout(r, 50));
    const replyB = rpc(runCall(1), b);
    await new Promise(r => setTimeout(r, 50));
    expect(started).toHaveLength(1);
    // B cancels its own id 1: A's run is untouched and answers; B's never starts
    await rpc(cancel(1), b);
    expect(signals[0].aborted).toBe(false);
    releaseA();
    expect(await replyA).toMatchObject({ status: 200, body: { id: 1, result: { content: [{ text: 'run 1' }] } } });
    expect(await replyB).toMatchObject({ status: 202 });
    expect(started).toHaveLength(1);
    // Nothing in flight: no session registry is kept
    expect(rpc.sessionCount()).toBe(0);
    // A cancellation from outside a session never reaches a named one
    const replyA2 = rpc(runCall(2), a);
    await rpc(cancel(2));
    expect(await replyA2).toMatchObject({ status: 200, body: { id: 2 } });
    expect(await rpc(runCall(3), 'bad id with spaces')).toMatchObject({ status: 400 });
  });
});
