import { DurableObject } from 'cloudflare:workers';

/**
 * One Durable Object per device (`idFromName(deviceId)`). The device is `telegram mcp --remote` on
 * the user's machine, connected over an outbound WebSocket that the Worker has already
 * authenticated. The object forwards MCP requests and consent questions to it and waits for the
 * answers. It stores nothing: no request or response bodies, no logs.
 */

export type ConsentQuestion = {
  clientName: string;
  clientDomain?: string;
  redirectHost: string;
  redirectIsLoopback: boolean;
};

export type RelayReply = { status: number; body: string };

type Pending = { resolve: (value: unknown) => void; timer: ReturnType<typeof setTimeout> };

/** A tool call can run long (downloads, sync); the client gives up long before this. */
const CALL_TIMEOUT_MS = 5 * 60_000;
/** The local dialog gives up after 120 s; a little slack for the round trip. */
const CONSENT_TIMEOUT_MS = 130_000;

export const OFFLINE = Symbol('offline');

export class DeviceRelay extends DurableObject<Record<string, unknown>> {
  private pending = new Map<string, Pending>();

  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    // Keepalives are answered without waking the object, so an idle device costs nothing.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'));
  }

  /** The Worker forwards the WebSocket upgrade here only after checking the device secret. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    // One live connection per device: a new one (a restart, another terminal) replaces the old.
    // Calls waiting on the old socket can't be answered by the new one, so they end now.
    this.settleAll();
    for (const old of this.ctx.getWebSockets()) old.close(4000, 'Replaced by a newer connection');
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  online(): boolean {
    return this.socket() !== null;
  }

  /** Forward one MCP JSON-RPC body; the device runs it and returns the HTTP status and body. */
  async call(body: string): Promise<RelayReply | null> {
    const reply = await this.ask({ type: 'rpc', body }, CALL_TIMEOUT_MS);
    if (reply === OFFLINE) return null;
    const r = reply as { status?: unknown; body?: unknown };
    return { status: typeof r.status === 'number' ? r.status : 502, body: typeof r.body === 'string' ? r.body : '' };
  }

  /** Ask the person at the machine whether this client may connect. Offline or no answer is "no". */
  async consent(question: ConsentQuestion): Promise<boolean | null> {
    const reply = await this.ask({ type: 'consent', ...question }, CONSENT_TIMEOUT_MS);
    if (reply === OFFLINE) return null;
    return (reply as { allow?: unknown }).allow === true;
  }

  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let msg: { type?: unknown; id?: unknown };
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    if (msg.type !== 'reply' || typeof msg.id !== 'string') return;
    const waiting = this.pending.get(msg.id);
    if (!waiting) return;
    this.pending.delete(msg.id);
    clearTimeout(waiting.timer);
    waiting.resolve(msg);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    // Anything still waiting on this socket gets the offline answer instead of a long timeout.
    if (!this.socket()) this.settleAll();
    try {
      ws.close(code, reason);
    } catch {
      // already closed
    }
  }

  async webSocketError(): Promise<void> {
    if (!this.socket()) this.settleAll();
  }

  private socket(): WebSocket | null {
    return this.ctx.getWebSockets().find(ws => ws.readyState === WebSocket.OPEN) ?? null;
  }

  private ask(payload: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    const ws = this.socket();
    if (!ws) return Promise.resolve(OFFLINE);
    const id = crypto.randomUUID();
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve(payload.type === 'consent' ? { allow: false } : { status: 504, body: '' });
      }, timeoutMs);
      this.pending.set(id, { resolve, timer });
      try {
        ws.send(JSON.stringify({ ...payload, id }));
      } catch {
        clearTimeout(timer);
        this.pending.delete(id);
        resolve(OFFLINE);
      }
    });
  }

  private settleAll(): void {
    for (const [id, waiting] of this.pending) {
      clearTimeout(waiting.timer);
      waiting.resolve(OFFLINE);
      this.pending.delete(id);
    }
  }
}

/**
 * The relay's small directory, in one Durable Object: pairing codes, emails bound to devices and
 * one-time email codes. A code typed on a phone must work seconds after it was made (KV can take a
 * minute to show a write elsewhere), and using a code must be atomic so it works once.
 * Keys are hashes; only a bound email is kept in plain text, to show it back to its device.
 */
type Expiring = { expires: number };
type CodeEntry = Expiring & { deviceId: string };
type MailCode = Expiring & { codeHash: string; deviceId: string; tries: number };

/** Wrong guesses allowed per email code before it is thrown away. */
export const MAX_TRIES = 5;

export class PairingCodes extends DurableObject<Record<string, unknown>> {
  private async putExpiring<T extends Expiring>(key: string, value: T): Promise<void> {
    await this.ctx.storage.put(key, value);
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm === null || alarm > value.expires) await this.ctx.storage.setAlarm(value.expires);
  }

  private async live<T extends Expiring>(key: string): Promise<T | null> {
    const entry = await this.ctx.storage.get<T>(key);
    return entry && entry.expires > Date.now() ? entry : null;
  }

  async put(key: string, deviceId: string, ttlSeconds: number): Promise<void> {
    await this.putExpiring(key, { deviceId, expires: Date.now() + ttlSeconds * 1000 } satisfies CodeEntry);
  }

  async peek(key: string): Promise<string | null> {
    return (await this.live<CodeEntry>(key))?.deviceId ?? null;
  }

  /** Get and delete in one step: a second use, even a concurrent one, gets null. */
  async take(key: string): Promise<string | null> {
    const deviceId = await this.peek(key);
    await this.ctx.storage.delete(key);
    return deviceId;
  }

  /** Bind a verified email to a device; the email moves if another device had it. */
  async bindEmail(emailKey: string, email: string, deviceId: string): Promise<void> {
    const previous = await this.ctx.storage.get<string>(`device:${deviceId}`);
    if (previous && previous !== emailKey) await this.ctx.storage.delete(`email:${previous}`);
    const owner = await this.ctx.storage.get<{ deviceId: string }>(`email:${emailKey}`);
    if (owner && owner.deviceId !== deviceId) await this.ctx.storage.delete(`device:${owner.deviceId}`);
    await this.ctx.storage.put(`email:${emailKey}`, { deviceId, email });
    await this.ctx.storage.put(`device:${deviceId}`, emailKey);
  }

  async unbindDevice(deviceId: string): Promise<void> {
    const emailKey = await this.ctx.storage.get<string>(`device:${deviceId}`);
    if (emailKey) await this.ctx.storage.delete(`email:${emailKey}`);
    await this.ctx.storage.delete(`device:${deviceId}`);
  }

  async deviceForEmail(emailKey: string): Promise<string | null> {
    return (await this.ctx.storage.get<{ deviceId: string }>(`email:${emailKey}`))?.deviceId ?? null;
  }

  async emailOfDevice(deviceId: string): Promise<string | null> {
    const emailKey = await this.ctx.storage.get<string>(`device:${deviceId}`);
    return emailKey ? ((await this.ctx.storage.get<{ email: string }>(`email:${emailKey}`))?.email ?? null) : null;
  }

  /**
   * Count a send against a window; false when over `max`. Used for "one email a minute" and
   * "N emails a day" per address, so a bound address can't be flooded through the relay.
   */
  async allowSend(key: string, max: number, windowSeconds: number): Promise<boolean> {
    const entry = await this.live<Expiring & { count: number }>(key);
    if (entry && entry.count >= max) return false;
    await this.putExpiring(key, { count: (entry?.count ?? 0) + 1, expires: entry?.expires ?? Date.now() + windowSeconds * 1000 });
    return true;
  }

  async putMailCode(key: string, codeHash: string, deviceId: string, ttlSeconds: number): Promise<void> {
    await this.putExpiring(key, { codeHash, deviceId, tries: 0, expires: Date.now() + ttlSeconds * 1000 } satisfies MailCode);
  }

  /** The device id when the code matches (and the code is gone); null otherwise, counting a try. */
  async checkMailCode(key: string, codeHash: string): Promise<string | null> {
    const entry = await this.live<MailCode>(key);
    if (!entry) return null;
    if (entry.codeHash === codeHash) {
      await this.ctx.storage.delete(key);
      return entry.deviceId;
    }
    if (entry.tries + 1 >= MAX_TRIES) await this.ctx.storage.delete(key);
    else await this.ctx.storage.put(key, { ...entry, tries: entry.tries + 1 });
    return null;
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    let next: number | null = null;
    for (const [key, entry] of await this.ctx.storage.list<Partial<Expiring>>()) {
      if (typeof entry?.expires !== 'number') continue; // bindings don't expire
      if (entry.expires <= now) await this.ctx.storage.delete(key);
      else next = next === null ? entry.expires : Math.min(next, entry.expires);
    }
    if (next !== null) await this.ctx.storage.setAlarm(next);
  }
}
