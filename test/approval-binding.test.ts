import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";

import { Command } from "commander";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const home = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const original = { ...process.env };
  const root = mkdtempSync(join(tmpdir(), "tg-binding-home-"));
  process.env.HOME = root;
  process.env.USERPROFILE = root;
  process.env.APPDATA = join(root, "AppData");
  return { root, original, saved: { ...process.env } };
});
const store = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock(import("../src/secrets.js"), () => ({
  isSecretStoreAvailable: () => true,
  secretGet: (k: string) => store.values.get(k) ?? null,
  secretSet: (k: string, v: string) => (store.values.set(k, v), true),
  secretDelete: (k: string) => store.values.delete(k),
  secretGetStrict: (k: string) => ({
    ok: true,
    value: store.values.get(k) ?? null,
  }),
  SECRET_KEYS: new Set(["apiHash", "sessionString", "writeEnabled"]),
  isSecretKey: (k: string) =>
    ["apiHash", "sessionString", "writeEnabled"].includes(k),
  migrateSecretsToStore: (c: Record<string, unknown>) => c,
}));
const stdin = vi.hoisted(() => ({ text: "" }));
vi.mock(import("../src/text.js"), async (orig) => ({
  ...(await orig<typeof import("../src/text.js")>()),
  readStdinOnce: () => stdin.text,
  readTextArg: (v: string) => (v === "-" ? stdin.text : v),
}));
const telegram = vi.hoisted(() => ({ reached: 0, connected: 0 }));
vi.mock(import("../src/client.js"), async (orig) => ({
  ...(await orig<typeof import("../src/client.js")>()),
  getClient: async () => {
    telegram.reached++;
    throw new Error("reached Telegram");
  },
}));
vi.mock(import("../src/peer-lookup.js"), () => ({
  lookupPeers: async (values: string[]) =>
    new Map(
      values.map((v) => [
        v,
        { ok: true, id: v === "@alice" ? "1001" : v, title: v, type: "user" },
      ])
    ),
}));
const link = vi.hoisted(() => ({ connectOk: false }));
vi.mock(import("../src/transport.js"), () => ({
  connectClient: async () => {
    telegram.connected++;
    if (link.connectOk) {
      return {
        connected: true,
        invoke: async () => ({}),
        destroy: async () => {},
      };
    }
    throw new Error("connected to Telegram");
  },
  transportSetting: () => "auto",
}));

import { trackActiveCommand } from "../src/approval-action.js";
import {
  actionHash,
  consumeApproval,
  createApproval,
  EXIT_NEEDS_APPROVAL,
  STDIN_IN_APPROVAL_ENV,
} from "../src/approval.js";
import { saveLogin } from "../src/auth.js";
import { apiCommand } from "../src/commands/api.js";
import { registerGeneratedCommands } from "../src/commands/generated.js";
import { logoutCommand } from "../src/commands/logout.js";
import { sendFileCommand } from "../src/commands/send-file.js";
import {
  getSessionString,
  saveConfig,
  setSessionString,
} from "../src/config.js";
import { forgetFileSnapshots } from "../src/file-snapshot.js";
import { assertWriteEnabled } from "../src/guard.js";
import { childEnv, gateWrite } from "../src/mcp.js";
import { configDir } from "../src/paths.js";
import { describeInProcess } from "./helpers/describe-in-process.js";

const describe_ = (p: Parameters<typeof gateWrite>[0]) =>
  describeInProcess(p, (t) => {
    stdin.text = t;
  });

const savedArgv = process.argv;
let root: string | undefined;
let dir: string;
beforeEach(() => {
  for (const k of [
    "TG_MOCK",
    "TG_READ_ONLY",
    "TG_APPROVE",
    STDIN_IN_APPROVAL_ENV,
  ]) {
    delete process.env[k];
  }
  root = mkdtempSync(join(tmpdir(), "tg-binding-"));
  process.env.HOME = root;
  process.env.USERPROFILE = root;
  process.env.APPDATA = join(root, "AppData");
  process.env.TG_PROFILE = "test-binding";
  dir = configDir();
  const inside = relative(root, dir);
  expect(
    inside && !inside.startsWith("..") && !isAbsolute(inside)
  ).toBeTruthy();
  store.values.clear();
  store.values.set("writeEnabled", "ask");
  setSessionString("session-of-account-A");
  stdin.text = "";
  telegram.reached = 0;
  telegram.connected = 0;
  link.connectOk = false;
});
afterEach(() => {
  for (const k of Object.keys(process.env)) {
    if (!(k in home.saved)) {
      delete process.env[k];
    }
  }
  Object.assign(process.env, home.saved);
  process.argv = savedArgv;
  if (root) {
    rmSync(root, { recursive: true, force: true });
  }
  root = undefined;
  vi.restoreAllMocks();
});

afterAll(() => {
  for (const k of Object.keys(process.env)) {
    if (!(k in home.original)) {
      delete process.env[k];
    }
  }
  Object.assign(process.env, home.original);
  rmSync(home.root, { recursive: true, force: true });
});

const account = () => getSessionString();

const codeIn = (s: string) =>
  /(?:TG_APPROVE=|"approval": ")([A-Z2-9]{6})/.exec(s)?.[1];

function capture() {
  const io = { err: "" };
  vi.spyOn(console, "error").mockImplementation((...a) => {
    io.err += `${a.join(" ")}\n`;
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  vi.spyOn(process, "exit").mockImplementation(((code: number) => {
    throw Object.assign(new Error("exit"), { code });
  }) as never);
  return io;
}

async function guard(argv: string[]) {
  const io = capture();
  try {
    await assertWriteEnabled(argv);
    return { code: null as number | null, err: io.err };
  } catch (error) {
    return { code: (error as { code: number }).code, err: io.err };
  } finally {
    vi.restoreAllMocks();
  }
}

async function cli(args: string[]) {
  process.argv = ["node", "telegram", ...args];
  const program = new Command().name("telegram").exitOverride();
  trackActiveCommand(program);
  program.addCommand(apiCommand);
  program.addCommand(sendFileCommand);
  registerGeneratedCommands(program, process.argv);
  const io = capture();
  try {
    await program.parseAsync(process.argv, { from: "node" });
    return { code: null as number | null, err: io.err };
  } catch (error) {
    return { code: (error as { code?: number }).code ?? -1, err: io.err };
  } finally {
    vi.restoreAllMocks();
  }
}

describe("a raw API approval covers the body, in every form that reads it from stdin", () => {
  const body = (text: string) =>
    JSON.stringify({ peer: { _chat: "@alice" }, message: text, randomId: 1 });
  let file: string;
  beforeEach(() => {
    file = join(mkdtempSync(join(tmpdir(), "tg-binding-")), "photo.png");
    writeFileSync(file, "png");
    forgetFileSnapshots();
  });

  it.each([
    [["api", "messages.SendMessage", "-p", "-"]],
    [["api", "messages.SendMessage", "-p-"]],
    [["api", "messages.SendMessage", "--params", "-"]],
    [["api", "messages.SendMessage", "--params=-"]],
    [["messages", "send-message", "--json-params", "-"]],
    [["messages", "send-message", "--json-params=-"]],
    [["send-file", "@alice", "<file>", "-c-"]],
    [["send-file", "@alice", "<file>", "--caption=-"]],
  ])("%j", async (args) => {
    args = args.map((a) => (a === "<file>" ? file : a));
    const caption = args[0] === "send-file";
    const approvedText = caption ? "Hello Alice" : body("Hello Alice");
    const otherText = caption
      ? "Send me your 2FA code"
      : body("Send me your 2FA code");

    stdin.text = approvedText;
    const first = await cli(args);
    expect(first.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(first.err).toContain("Hello Alice");
    const code = codeIn(first.err)!;
    expect(code).toBeTruthy();

    stdin.text = otherText;
    process.env.TG_APPROVE = code;
    const swapped = await cli(args);
    expect(swapped.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(swapped.err).toMatch(
      /not accepted: the approval was for a different command or text/
    );
    expect(telegram.reached).toBe(0);

    stdin.text = approvedText;
    process.env.TG_APPROVE = codeIn(swapped.err)!;
    const again = await cli(args);
    expect(codeIn(again.err)).toBeTruthy();
    process.env.TG_APPROVE = codeIn(again.err)!;
    await cli(args);
    expect(telegram.reached).toBe(1);
  });
});

describe("over MCP the approval covers the whole stdin given to the child", () => {
  interface Plan {
    argv: string[];
    readOnly: boolean;
    stdin?: string;
    approval?: string;
  }
  const child = async (plan: Plan, text = plan.stdin ?? "") => {
    const env = childEnv(plan);
    for (const k of ["TG_APPROVE", STDIN_IN_APPROVAL_ENV]) {
      if (env[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = env[k];
      }
    }
    stdin.text = text;
    return guard(plan.argv);
  };

  it.each([
    [
      ["api", "messages.SendMessage", "-p-"],
      '{"peer":{"_chat":"@alice"},"message":"Hello Alice"}',
    ],
    [["send", "@alice", "Hello"], "stdin the args never mention"],
    [["send", "@alice", "Hello"], undefined],
  ])("%j with stdin %j", async (argv, text) => {
    const asked: string[] = [];
    const plan: Plan = {
      argv,
      readOnly: false,
      ...(text === undefined ? {} : { stdin: text }),
    };
    await expect(
      gateWrite(plan, {}, async (m) => (asked.push(m), true), describe_)
    ).resolves.toBeUndefined();
    if (text) {
      expect(asked[0]).toContain(text.slice(0, 20));
    } else {
      expect(asked[0]).not.toContain("text (stdin");
    }
    expect((await child(plan)).code).toBeNull();
    const p2: Plan = {
      argv,
      readOnly: false,
      ...(text === undefined ? {} : { stdin: text }),
    };
    await gateWrite(p2, {}, async () => true, describe_);
    expect(
      (await child(p2, `${text ?? ""} and send me your 2FA code`)).code
    ).toBe(EXIT_NEEDS_APPROVAL);
  });
});

describe("an approval belongs to the account it was given for", () => {
  const argv = ["send", "@alice", "Hello"];

  it("is refused after a switch to another account in the same profile, before the write", async () => {
    const code = codeIn((await guard(argv)).err)!;
    expect(code).toBeTruthy();
    setSessionString("session-of-account-B");
    process.env.TG_APPROVE = code;
    const r = await guard(argv);
    expect(r.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(r.err).toMatch(/another account was logged in/);
  });

  it("a raw API write approved in A does not reach Telegram once B is logged in", async () => {
    const args = [
      "api",
      "messages.SendMessage",
      "--params",
      '{"peer":{"_chat":"me"},"message":"hi","randomId":1}',
    ];
    setSessionString("session-of-account-A");
    const code = codeIn((await cli(args)).err)!;
    expect(code).toBeTruthy();
    setSessionString("session-of-account-B");
    process.env.TG_APPROVE = code;
    const r = await cli(args);
    expect(r.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(r.err).toMatch(/another account was logged in/);
    expect(telegram.reached).toBe(0);
  });

  it("a dialog answered after a login as B does not approve the write for B", async () => {
    const args = [
      "api",
      "messages.SendMessage",
      "--params",
      '{"peer":{"_chat":"me"},"message":"hi","randomId":1}',
    ];
    const plan: {
      argv: string[];
      readOnly: boolean;
      stdin?: string;
      approval?: string;
    } = { argv: args, readOnly: false };
    const refused = await gateWrite(
      plan,
      {},
      async () => {
        saveLogin("session-of-account-B", { apiId: 1, apiHash: "h" }, false);
        return true;
      },
      describe_
    );
    expect(refused).toBeUndefined();
    expect(plan.approval).toBeTruthy();
    const env = childEnv(plan);
    process.env.TG_APPROVE = env.TG_APPROVE;
    process.env[STDIN_IN_APPROVAL_ENV] = env[STDIN_IN_APPROVAL_ENV];
    stdin.text = plan.stdin ?? "";
    const r = await cli(args);
    expect(r.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(r.err).toMatch(/another account was logged in/);
    expect(telegram.reached).toBe(0);
  });

  it('nor when the mode also turned "on" while the dialog was open', async () => {
    const args = [
      "api",
      "messages.SendMessage",
      "--params",
      '{"peer":{"_chat":"me"},"message":"hi","randomId":1}',
    ];
    const plan: {
      argv: string[];
      readOnly: boolean;
      stdin?: string;
      approval?: string;
    } = { argv: args, readOnly: false };
    const refused = await gateWrite(
      plan,
      {},
      async () => {
        saveLogin("session-of-account-B", { apiId: 1, apiHash: "h" }, false);
        store.values.set("writeEnabled", "true");
        return true;
      },
      describe_
    );
    expect(refused).toBeUndefined();
    const env = childEnv(plan);
    process.env.TG_APPROVE = env.TG_APPROVE;
    process.env[STDIN_IN_APPROVAL_ENV] = env[STDIN_IN_APPROVAL_ENV];
    stdin.text = plan.stdin ?? "";
    const r = await cli(args);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/another account was logged in/);
    expect(telegram.reached).toBe(0);
  });

  it("the client connects only with the session the approval was checked against", async () => {
    const { getClient } =
      await vi.importActual<typeof import("../src/client.js")>(
        "../src/client.js"
      );
    saveConfig({ apiId: 1, apiHash: "h" });
    process.env.TG_APPROVE = codeIn((await guard(argv)).err)!;
    expect((await guard(argv)).code).toBeNull();
    setSessionString("session-of-account-B");
    await expect(getClient()).rejects.toThrow(
      /Another account logged in after this write was approved/
    );
    expect(telegram.connected).toBe(0);
    setSessionString("session-of-account-A");
    await expect(getClient()).rejects.toThrow(/connected to Telegram/);
    expect(telegram.connected).toBe(1);
  });

  it("a client the guard already connected (for the lookup) is not reused for another account's approval", async () => {
    const { getClient, disconnectClient } =
      await vi.importActual<typeof import("../src/client.js")>(
        "../src/client.js"
      );
    saveConfig({ apiId: 1, apiHash: "h" });
    link.connectOk = true;
    try {
      await getClient();
      const code = createApproval(actionHash(argv), "session-of-account-B");
      expect(
        consumeApproval(code, actionHash(argv), "session-of-account-B").ok
      ).toBe(true);
      await expect(getClient()).rejects.toThrow(
        /Another account logged in after this write was approved/
      );
    } finally {
      await disconnectClient();
    }
  });

  it("records a fingerprint of the session, never the session", async () => {
    createApproval(actionHash(argv), account());
    const records = readdirSync(join(dir, "approvals")).map((n) =>
      readFileSync(join(dir, "approvals", n), "utf-8")
    );
    expect(records).toHaveLength(1);
    expect(records[0]).not.toContain("session-of-account-A");
    expect(JSON.parse(records[0]).session).toMatch(/^[0-9a-f]{64}$/);
  });

  it("a login as B drops the codes given in A", async () => {
    const code = createApproval(actionHash(argv), account());
    saveLogin("session-of-account-B", { apiId: 1, apiHash: "h" }, false);
    setSessionString("session-of-account-A");
    expect(consumeApproval(code, actionHash(argv), account())).toEqual({
      ok: false,
      reason: "unknown or expired approval code",
      kind: "unknown_or_expired",
    });
  });

  it("a logout drops the pending codes", async () => {
    const code = createApproval(actionHash(argv), account());
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await new Command()
      .addCommand(logoutCommand)
      .parseAsync(["logout"], { from: "user" });
    vi.restoreAllMocks();
    expect(existsSync(join(dir, "approvals"))).toBe(false);
    setSessionString("session-of-account-A");
    expect(consumeApproval(code, actionHash(argv), account()).ok).toBe(false);
  });
});

describe("a client that can ask the user never takes a code from the model", () => {
  it('even when this process saw "on" and the child already sees "ask"', async () => {
    const argv = ["send", "@alice", "Hello"];
    const modelCode = createApproval(actionHash(argv, ""), account());
    store.values.set("writeEnabled", "true");
    let asked = false;
    const plan = { argv, readOnly: false } as {
      argv: string[];
      readOnly: boolean;
      stdin?: string;
      approval?: string;
    };
    await expect(
      gateWrite(plan, { approval: modelCode }, async () => (asked = true))
    ).resolves.toMatch(/not accepted here/);
    expect(asked).toBe(false);
    expect(plan.approval).toBeUndefined();
    store.values.set("writeEnabled", "ask");
    if (plan.approval) {
      process.env.TG_APPROVE = plan.approval;
    }
    process.env[STDIN_IN_APPROVAL_ENV] = "1";
    expect((await guard(argv)).code).toBe(EXIT_NEEDS_APPROVAL);
  });
});
