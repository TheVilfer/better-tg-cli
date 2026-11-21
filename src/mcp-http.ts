import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import { handleMessage, PluginRuns, setKnownCommands } from "./mcp.js";
import { isSecretStoreAvailable, secretGet, secretSet } from "./secrets.js";

const TOKEN_KEY = "mcpToken";
const MAX_BODY = 1_000_000;

/** The HTTP token lives in the secret store, never in the config file or the environment. */
export function mcpToken(
  options: { create?: boolean; rotate?: boolean } = {}
): string | null {
  if (!isSecretStoreAvailable()) {
    return null;
  }
  const existing = options.rotate ? null : secretGet(TOKEN_KEY);
  if (existing || !(options.create || options.rotate)) {
    return existing;
  }
  const token = `tgmcp_${randomBytes(32).toString("base64url")}`;
  const saved = secretSet(TOKEN_KEY, token);
  if (options.rotate) {
    return saved && secretGet(TOKEN_KEY) === token ? token : null;
  }
  return secretGet(TOKEN_KEY) ?? (saved ? token : null);
}

const digest = (s: string) => createHash("sha256").update(s).digest();

export function checkBearer(
  header: string | undefined,
  token: string
): boolean {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return Boolean(match) && timingSafeEqual(digest(match![1]), digest(token));
}

type Json = Record<string, unknown>;

function send(
  res: ServerResponse,
  status: number,
  body?: unknown,
  headers: Record<string, string> = {}
): void {
  if (body === undefined) {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  res.writeHead(status, {
    ...headers,
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

function internalError(error: unknown): string {
  console.error(
    `${new Date().toISOString()} internal error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
  );
  return "Internal error";
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("too large"));
        req.destroy();
      } else {
        chunks.push(c);
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function logCall(msg: Json, status: string): void {
  const params = (msg.params ?? {}) as Json;
  const { args } = (params.arguments ?? {}) as Json;
  const what =
    msg.method === "tools/call"
      ? `${params.name} ${Array.isArray(args) ? String(args[0] ?? "") : ""}`.trim()
      : msg.method;
  console.error(`${new Date().toISOString()} ${what} ${status}`);
}

export interface RpcReply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

const SESSION_RE = /^[\u0021-\u007E]{1,128}$/;

class SessionRuns {
  private readonly map = new Map<string, { runs: PluginRuns; calls: number }>();

  acquire(session: string): PluginRuns {
    let s = this.map.get(session);
    if (!s) {
      this.map.set(session, (s = { runs: new PluginRuns(), calls: 0 }));
    }
    s.calls++;
    return s.runs;
  }

  release(session: string): void {
    const s = this.map.get(session);
    if (s && --s.calls <= 0) {
      this.map.delete(session);
    }
  }

  cancel(session: string, id: unknown): void {
    this.map.get(session)?.runs.cancel(id);
  }

  get size(): number {
    return this.map.size;
  }
}

/**
 * One MCP request body in, one HTTP-style answer out. `session` is the request's Mcp-Session-Id.
 * Calls run one at a time, like over stdio: parallel sessions steal updates and invite FLOOD_WAIT.
 */
export function createRpcProcessor(
  options: { readOnly?: boolean } = {},
  run?: Parameters<typeof handleMessage>[1]
) {
  let queue: Promise<unknown> = Promise.resolve();
  const sessions = new SessionRuns();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => undefined);
    return next;
  };

  const processRpc = async (
    text: string,
    sessionId?: string
  ): Promise<RpcReply> => {
    if (sessionId !== undefined && !SESSION_RE.test(sessionId)) {
      return {
        status: 400,
        body: {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32_600, message: "Invalid Mcp-Session-Id" },
        },
      };
    }
    const scope = sessionId === undefined ? "" : `s:${sessionId}`;
    let issued: string | undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        status: 400,
        body: {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32_700, message: "Parse error" },
        },
      };
    }
    const batch = Array.isArray(parsed);
    const messages = (batch ? parsed : [parsed]) as Json[];
    const replies: object[] = [];
    for (const msg of messages) {
      if (!msg || typeof msg !== "object") {
        replies.push({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32_600, message: "Invalid request" },
        });
        continue;
      }
      if (msg.method === "notifications/cancelled") {
        sessions.cancel(
          scope,
          (msg.params as { requestId?: unknown } | undefined)?.requestId
        );
        continue;
      }
      if (msg.method === "initialize" && msg.id != null) {
        issued ??= randomBytes(24).toString("base64url");
      }
      const call = msg.method === "tools/call" && msg.id != null;
      const runs = sessions.acquire(scope);
      if (call) {
        runs.arrived(msg.id);
      }
      try {
        const reply = await serial(() =>
          handleMessage(msg, run, { readOnly: options.readOnly, runs }).finally(
            () => {
              if (call) {
                runs.settled(msg.id);
              }
            }
          )
        );
        if (msg.method === "tools/call") {
          logCall(
            msg,
            (reply as { result?: { isError?: boolean } })?.result?.isError
              ? "error"
              : "ok"
          );
        }
        if (reply) {
          replies.push(reply);
        }
      } catch (error) {
        replies.push({
          jsonrpc: "2.0",
          id: (msg.id as string | number | undefined) ?? null,
          error: { code: -32_603, message: internalError(error) },
        });
      } finally {
        sessions.release(scope);
      }
    }
    const headers = issued ? { "Mcp-Session-Id": issued } : undefined;
    if (!replies.length) {
      return { status: 202, ...(headers ? { headers } : {}) };
    }
    return {
      status: 200,
      body: batch ? replies : replies[0],
      ...(headers ? { headers } : {}),
    };
  };
  return Object.assign(processRpc, { sessionCount: () => sessions.size });
}

export function createMcpHttpHandler(
  token: string,
  options: { readOnly?: boolean } = {},
  run?: Parameters<typeof handleMessage>[1]
) {
  const processRpc = createRpcProcessor(options, run);

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const path = (req.url ?? "").split("?")[0];
    if (path !== "/mcp") {
      return send(res, 404, { error: "Not found; the MCP endpoint is /mcp" });
    }
    if (req.headers.origin) {
      return send(res, 403, { error: "Browser requests are not allowed" });
    }
    if (!checkBearer(req.headers.authorization, token)) {
      return send(
        res,
        401,
        { error: "Missing or wrong bearer token" },
        { "WWW-Authenticate": "Bearer" }
      );
    }
    if (req.method !== "POST") {
      return send(res, 405, { error: "Use POST" }, { Allow: "POST" });
    }

    let text: string;
    try {
      text = await readBody(req);
    } catch {
      return send(res, 413, {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32_700, message: "Request too large" },
      });
    }
    const header = req.headers["mcp-session-id"];
    const reply = await processRpc(
      text,
      Array.isArray(header) ? header[0] : header
    );
    send(res, reply.status, reply.body, reply.headers);
  };
}

export function startMcpHttpServer(
  commands: Iterable<string>,
  options: { host: string; port: number; readOnly?: boolean }
): void {
  const token = mcpToken({ create: true });
  if (!token) {
    console.error(
      "The HTTP server needs a secret store for its token (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password)."
    );
    process.exit(1);
  }
  setKnownCommands(commands);
  const server = createServer((req, res) => {
    createHandler(req, res).catch((error) =>
      send(res, 500, { error: internalError(error) })
    );
  });
  const createHandler = createMcpHttpHandler(token, {
    readOnly: options.readOnly,
  });
  server.listen(options.port, options.host, () => {
    console.error(
      `MCP over HTTP on http://${options.host}:${options.port}/mcp${options.readOnly ? " (read-only: no telegram_write)" : ""}`
    );
    console.error(
      'Clients send "Authorization: Bearer <token>"; print it with `telegram mcp --token`.'
    );
    if (
      options.host !== "127.0.0.1" &&
      options.host !== "localhost" &&
      options.host !== "::1"
    ) {
      console.error(
        "Listening beyond localhost: anyone who can reach this port and has the token can use your account."
      );
    }
  });
  server.on("error", (e) => {
    console.error(`Could not start the HTTP server: ${e.message}`);
    process.exit(1);
  });
}
