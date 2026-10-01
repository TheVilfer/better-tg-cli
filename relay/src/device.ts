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
