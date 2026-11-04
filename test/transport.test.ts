import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { TelegramClient } from 'teleproto';
import { PromisedWebSockets } from 'teleproto/extensions/PromisedWebSockets.js';
import { clientParams } from '../src/client-options.js';
import { configDir } from '../src/paths.js';
import { saveConfig } from '../src/config.js';
import { BLOCKED_HINT, connectClient, isNetworkFailure, transportSetting, useWebSocketImpl, type Transport } from '../src/transport.js';

class NetSocketClosedError extends Error {
  constructor() { super('NetSocket was closed'); this.name = 'NetSocketClosedError'; }
}

/** A client whose connect() fails or succeeds per transport, recording what was tried. */
function fakes(outcome: Partial<Record<Transport, Error | 'ok'>>) {
  const tried: Transport[] = [];
  const destroyed: Transport[] = [];
  const make = (t: Transport) => {
    tried.push(t);
    return {
      transport: t,
      connect: async () => { const r = outcome[t] ?? 'ok'; if (r !== 'ok') throw r; return true; },
      destroy: async () => { destroyed.push(t); },
    } as unknown as TelegramClient;
  };
  return { make, tried, destroyed };
}

// A throwaway profile: the config dir follows TG_PROFILE (~/.config/tg-<profile>), never the real one
let dir: string;
const saved = { ...process.env };
beforeEach(() => {
  delete process.env.TG_TRANSPORT;
  delete process.env.TG_MOCK;
  process.env.TG_PROFILE = `test-transport-${process.pid}`;
  dir = configDir();
  expect(dir).toMatch(/tg-test-transport-\d+$/);
});
afterEach(() => {
  process.env = { ...saved };
  rmSync(dir, { recursive: true, force: true });
});

const quiet = { notice: () => {}, remember: false };

describe('connectClient', () => {
  it('uses TCP when it works and never touches WSS', async () => {
    const f = fakes({});
    const c = await connectClient(f.make, { ...quiet, setting: 'auto' });
    expect((c as unknown as { transport: string }).transport).toBe('tcp');
    expect(f.tried).toEqual(['tcp']);
  });

  it('falls back to WSS when TCP is dropped (the Grok Bot "NetSocket was closed" case)', async () => {
    const f = fakes({ tcp: new NetSocketClosedError() });
    const notes: string[] = [];
    const c = await connectClient(f.make, { setting: 'auto', remember: false, notice: m => notes.push(m) });
    expect((c as unknown as { transport: string }).transport).toBe('wss');
    expect(f.tried).toEqual(['tcp', 'wss']);
    expect(f.destroyed).toEqual(['tcp']); // the failed client is torn down, not leaked
    expect(notes.join('\n')).toMatch(/switching to WebSocket/);
  });

  it('does not switch transports on an RPC error from a server it reached', async () => {
    const f = fakes({ tcp: Object.assign(new Error('API_ID_INVALID'), { errorMessage: 'API_ID_INVALID' }) });
    await expect(connectClient(f.make, { ...quiet, setting: 'auto' })).rejects.toThrow('API_ID_INVALID');
    expect(f.tried).toEqual(['tcp']);
  });

  it('explains when both transports are blocked', async () => {
    const f = fakes({ tcp: new NetSocketClosedError(), wss: new Error('WebSocket was closed') });
    await expect(connectClient(f.make, { ...quiet, setting: 'auto' })).rejects.toThrow(BLOCKED_HINT);
  });

  it('honours an explicit transport without falling back', async () => {
    const tcp = fakes({ tcp: new NetSocketClosedError() });
    await expect(connectClient(tcp.make, { ...quiet, setting: 'tcp' })).rejects.toThrow(/try TG_TRANSPORT=wss/);
    expect(tcp.tried).toEqual(['tcp']);

    const wss = fakes({});
    await connectClient(wss.make, { ...quiet, setting: 'wss' });
    expect(wss.tried).toEqual(['wss']);
  });

  it('remembers WSS in the profile config, and the next run starts there', async () => {
    const f = fakes({ tcp: new NetSocketClosedError() });
    await connectClient(f.make, { setting: 'auto', notice: () => {} });
    expect(readFileSync(join(dir, 'config.json5'), 'utf8')).toMatch(/transport.*wss/);
    expect(transportSetting(undefined)).toBe('wss');
  });
});

describe('transportSetting', () => {
  it('reads TG_TRANSPORT and rejects unknown values', () => {
    expect(transportSetting('WSS')).toBe('wss');
    expect(transportSetting('tcp')).toBe('tcp');
    expect(transportSetting('auto')).toBe('auto');
    expect(() => transportSetting('udp')).toThrow(/Invalid TG_TRANSPORT/);
  });

  it('falls back to the saved transport, then auto', () => {
    saveConfig({ transport: 'tcp' });
    expect(transportSetting('')).toBe('tcp');
    saveConfig({ transport: undefined });
    expect(transportSetting(undefined)).toBe('auto');
  });
});

describe('isNetworkFailure', () => {
  it('separates network failures from RPC errors', () => {
    expect(isNetworkFailure(new NetSocketClosedError())).toBe(true);
    expect(isNetworkFailure(Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' }))).toBe(true);
    expect(isNetworkFailure(new Error('FLOOD_WAIT_X'))).toBe(false);
    expect(isNetworkFailure('NetSocket was closed')).toBe(false);
  });
});

describe('useWebSocketImpl', () => {
  it('gives teleproto the bundled ws only when there is no global WebSocket (Node 20)', async () => {
    const { WebSocket: Ws } = await import('ws');
    const impl = PromisedWebSockets as unknown as { webSocketImpl?: unknown };
    const before = impl.webSocketImpl;
    try {
      impl.webSocketImpl = undefined;
      useWebSocketImpl(true);
      expect(impl.webSocketImpl).toBeUndefined();
      useWebSocketImpl(false);
      expect(impl.webSocketImpl).toBe(Ws);
    } finally {
      impl.webSocketImpl = before;
    }
  });
});

describe('clientParams', () => {
  it('adds the WebSocket transport only for wss', () => {
    expect(clientParams(false, 'tcp')).not.toHaveProperty('networkSocket');
    expect(clientParams(false, 'wss').networkSocket).toBe(PromisedWebSockets);
  });
});
