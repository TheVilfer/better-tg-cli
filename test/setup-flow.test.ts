import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  configured: true,
  session: "stored-session" as string | undefined,
  clientError: undefined as Error | undefined,
  mode: "read-only" as "read-only" | "ask" | "on",
  pages: [] as { modeOnly?: boolean; defaultMode?: string }[],
  opened: [] as string[],
  applyMode: undefined as
    | undefined
    | ((c: {
        mode: "read-only" | "ask" | "on";
        forSeconds?: number;
      }) => Promise<{ ok: boolean; error?: string }>),
  answer: false,
  asked: [] as string[],
  written: [] as string[],
}));
vi.mock(import("../src/confirm.js"), () => ({
  confirmByHuman: async (q: string) => (fake.asked.push(q), fake.answer),
  windowsConfirmScript: () => "",
}));
vi.mock(import("../src/write-store.js"), async (orig) => ({
  ...(await orig<typeof import("../src/write-store.js")>()),
  hasHumanChannel: () => true,
  setWriteValue: (v: string) => (fake.written.push(v), true),
  deleteWriteValue: () => {
    fake.written.push("<deleted>");
  },
}));
vi.mock(import("../src/config.js"), async (orig) => ({
  ...(await orig<typeof import("../src/config.js")>()),
  isConfigured: () => fake.configured,
  getSessionString: () => fake.session,
}));
vi.mock(import("../src/client.js"), async (orig) => ({
  ...(await orig<typeof import("../src/client.js")>()),
  getClient: async () => {
    if (fake.clientError) {
      throw fake.clientError;
    }
    return {};
  },
  disconnectClient: async () => {},
}));
vi.mock(import("../src/onboard.js"), async (orig) => ({
  ...(await orig<typeof import("../src/onboard.js")>()),
  startOnboarding: async (o: {
    modeOnly?: boolean;
    defaultMode?: string;
    emit(e: unknown): void;
    applyMode?: typeof fake.applyMode;
  }) => {
    fake.pages.push({ modeOnly: o.modeOnly, defaultMode: o.defaultMode });
    fake.applyMode = o.applyMode;
    const url = `http://127.0.0.1:1/${fake.pages.length}`;
    o.emit({ event: "url", url });
    return { url, done: new Promise(() => {}), close: () => {} };
  },
}));
vi.mock(import("../src/write-mode.js"), async (orig) => ({
  ...(await orig<typeof import("../src/write-mode.js")>()),
  savedMode: () => ({ mode: fake.mode }),
}));
vi.mock(import("../src/commands/onboard.js"), async (orig) => ({
  ...(await orig<typeof import("../src/commands/onboard.js")>()),
  openBrowser: (u: string) => fake.opened.push(u),
}));

import { SESSION_EXPIRED } from "../src/client.js";
import { loginHint } from "../src/login-hint.js";
import {
  closeSetup,
  handleMessage,
  planCall,
  runSetup,
  TOOLS,
} from "../src/mcp.js";
import { sessionState } from "../src/setup.js";
import { secretStoreHint } from "../src/write-store.js";

beforeEach(() => {
  Object.assign(fake, {
    configured: true,
    session: "stored-session",
    clientError: undefined,
    mode: "read-only",
    pages: [],
    opened: [],
    applyMode: undefined,
    answer: false,
    asked: [],
    written: [],
  });
  for (const k of ["TG_MOCK", "TG_MCP", "SSH_CONNECTION"]) {
    delete process.env[k];
  }
});
afterEach(() => closeSetup());

const expired = () => new Error(`${SESSION_EXPIRED} ${loginHint()}`);

describe("a dead session is told apart from a missing one and from no network (2.2)", () => {
  it("none, alive, expired; a network failure is not a reason to log in again", async () => {
    fake.session = undefined;
    await expect(sessionState()).resolves.toBe("none");
    fake.session = "stored-session";
    await expect(sessionState()).resolves.toBe("alive");
    fake.clientError = expired();
    await expect(sessionState()).resolves.toBe("expired");
    fake.clientError = Object.assign(
      new Error("RPCError 401: AUTH_KEY_UNREGISTERED"),
      { errorMessage: "AUTH_KEY_UNREGISTERED" }
    );
    await expect(sessionState()).resolves.toBe("expired");
    fake.clientError = new Error("connect ETIMEDOUT 149.154.167.50:443");
    await expect(sessionState()).rejects.toThrow(/ETIMEDOUT/);
  });

  it('onboard reports session_expired and starts a new login instead of "Already logged in"', async () => {
    fake.clientError = expired();
    const { onboardCommand } = await import("../src/commands/onboard.js");
    const out: string[] = [];
    vi.spyOn(console, "log").mockImplementation((m) => {
      out.push(String(m));
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
    vi.spyOn(process, "once").mockImplementation((() => process) as never);
    const parsed = onboardCommand
      .parseAsync(["--json", "--no-open"], { from: "user" })
      .catch(() => {});
    await vi.waitFor(() =>
      expect(out.map((l) => JSON.parse(l).event)).toEqual([
        "session_expired",
        "url",
      ])
    );
    expect(fake.pages).toEqual([{ modeOnly: undefined, defaultMode: "ask" }]);
    vi.restoreAllMocks();
    void parsed;
  });

  it("onboard stops with an error, opening nothing, when the check itself fails", async () => {
    fake.clientError = new Error("connect ETIMEDOUT");
    const { onboardCommand } = await import("../src/commands/onboard.js");
    const out: string[] = [];
    vi.spyOn(console, "log").mockImplementation((m) => {
      out.push(String(m));
    });
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
    await expect(
      onboardCommand.parseAsync(["--json"], { from: "user" })
    ).rejects.toThrow("exit 1");
    vi.restoreAllMocks();
    expect(out.map((l) => JSON.parse(l))).toEqual([
      { event: "error", message: "connect ETIMEDOUT" },
    ]);
    expect(fake.pages).toEqual([]);
  });
});

describe('every "log in again" hint names onboard, and auth --qr only for a person at a terminal (2.2, 2.4)', () => {
  it("in a terminal and over MCP", () => {
    expect(loginHint({})).toMatch(
      /^Log in with "telegram onboard".*A person at their own terminal can use "telegram auth --qr"/
    );
    expect(loginHint({ TG_MCP: "1" })).toMatch(/call telegram_setup/);
    expect(loginHint({ TG_MCP: "1" })).not.toMatch(/telegram auth/);
  });

  it("no message in src tells anyone to log in with `auth`, `auth --login-key` or `tg`", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        return statSync(p).isDirectory()
          ? n === "generated"
            ? []
            : files(p)
          : p.endsWith(".ts") && !p.endsWith("skill-files.ts")
            ? [p]
            : [];
      });
    const bad =
      /Run "telegram auth"|Run: TG_PROFILE=\$\{p\} telegram auth|"tg auth"|telegram logout && telegram auth|Run "telegram onboard" or "telegram auth --qr"/;
    for (const f of files("src")) {
      expect(readFileSync(f, "utf-8"), f).not.toMatch(bad);
    }
  });
});

describe("telegram_setup gives an MCP-only user a way in (5.1)", () => {
  it("is listed, takes no arguments (the model can never pick the mode), and is answered by the server", async () => {
    const tool = TOOLS.find((t) => t.name === "telegram_setup")!;
    expect(tool.inputSchema).toEqual({ type: "object", properties: {} });
    const r = await handleMessage(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "telegram_setup", arguments: { mode: "on" } },
      },
      async () => {
        throw new Error("no CLI run");
      },
      { setup: async () => ({ content: [{ type: "text", text: "page" }] }) }
    );
    expect(r).toMatchObject({ result: { content: [{ text: "page" }] } });
  });

  it('not logged in: the login page (writes default to "ask"), opened in the browser, link for the user', async () => {
    fake.session = undefined;
    const r = await runSetup();
    expect(fake.pages).toEqual([{ modeOnly: undefined, defaultMode: "ask" }]);
    expect(r.structuredContent).toEqual({
      status: "open_page",
      step: "login",
      url: "http://127.0.0.1:1/1",
    });
    expect(r.content[0].text).toMatch(
      /Give the user this link.*http:\/\/127\.0\.0\.1:1\/1/
    );
    expect(r.content[0].text).toMatch(
      /never fill in the page or pick a mode for them/
    );
    expect(fake.opened).toEqual(["http://127.0.0.1:1/1"]);
  });

  it("a second call hands out the same page instead of a new one", async () => {
    fake.session = undefined;
    await runSetup();
    const again = await runSetup();
    expect(fake.pages).toHaveLength(1);
    expect(again.structuredContent).toMatchObject({
      url: "http://127.0.0.1:1/1",
      reused: true,
    });
  });

  it("a dead session: the login page, saying why", async () => {
    fake.clientError = expired();
    expect((await runSetup()).structuredContent).toMatchObject({
      step: "login",
      sessionExpired: true,
    });
  });

  it("logged in but read-only: only the mode choice, with no default, so opening it changes nothing", async () => {
    const r = await runSetup();
    expect(fake.pages).toEqual([{ modeOnly: true, defaultMode: undefined }]);
    expect(r.structuredContent).toMatchObject({ step: "mode" });
  });

  it("the model holds the link, so a mode picked on the mode page is confirmed by the person; a no keeps read-only", async () => {
    await runSetup();
    fake.answer = false;
    await expect(fake.applyMode!({ mode: "ask" })).resolves.toEqual({
      ok: false,
      error: "not_confirmed",
    });
    expect(fake.asked).toHaveLength(1);
    expect(fake.written).toEqual([]);
    fake.answer = true;
    await expect(fake.applyMode!({ mode: "ask" })).resolves.toMatchObject({
      ok: true,
    });
    expect(fake.written).toEqual(["ask"]);
    await expect(fake.applyMode!({ mode: "read-only" })).resolves.toEqual({
      ok: true,
    });
    expect(fake.asked).toHaveLength(2);
  });

  it("on the login page the default after a finished login needs no dialog, a later pick does", async () => {
    fake.session = undefined;
    await runSetup();
    await expect(fake.applyMode!({ mode: "ask" })).resolves.toMatchObject({
      ok: true,
    });
    expect(fake.asked).toEqual([]);
    await expect(
      fake.applyMode!({ mode: "ask", forSeconds: 3600 })
    ).resolves.toEqual({ ok: false, error: "not_confirmed" });
    expect(fake.asked).toHaveLength(1);
    expect(fake.written).toEqual(["ask"]);
  });

  it("already writable, a read-only server, mock mode, no network: no page", async () => {
    fake.mode = "ask";
    expect((await runSetup()).structuredContent).toEqual({
      status: "ready",
      mode: "ask",
    });
    fake.mode = "read-only";
    expect((await runSetup({ readOnly: true })).structuredContent).toEqual({
      status: "ready",
      mode: "read-only",
    });
    fake.clientError = new Error("connect ETIMEDOUT");
    expect((await runSetup()).isError).toBe(true);
    process.env.TG_MOCK = "1";
    expect((await runSetup()).content[0].text).toMatch(/^Mock mode/);
    expect(fake.pages).toEqual([]);
  });

  it("refusals of setup commands over MCP say what the user does instead", () => {
    for (const args of [["write-access", "ask"], ["onboard"], ["auth"]]) {
      const reason = planCall("telegram_write", { args }) as string;
      expect(reason, args.join(" ")).toMatch(/telegram_setup/);
      expect(reason).toMatch(/in a terminal on this computer|own terminal/);
    }
  });
});

describe("no secret store: one next step for this OS, then `telegram check` (2.3)", () => {
  it.each([
    ["darwin", /login keychain.*security unlock-keychain/],
    ["win32", /DPAPI.*powershell\.exe/],
    ["linux", /keyring.*TG_NO_LIBSECRET/],
  ] as const)("%s", (os, step) => {
    const hint = secretStoreHint(os);
    expect(hint).toMatch(step);
    expect(hint).toMatch(/Then run `telegram check`/);
    expect(hint).not.toMatch(/install/i);
  });
});
