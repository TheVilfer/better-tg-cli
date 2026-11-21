import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Before any module under test is imported: a temp HOME, so no path reaches the real ~/.config
const home = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = mkdtempSync(join(tmpdir(), "tg-status-home-"));
  Object.assign(process.env, {
    HOME: root,
    USERPROFILE: root,
    APPDATA: join(root, "AppData"),
    TG_NO_UPDATE_CHECK: "1",
  });
  for (const k of [
    "TG_MOCK",
    "TG_PROFILE",
    "TG_MCP",
    "TG_READ_ONLY",
    "TG_APPROVE",
    "TG_TRANSPORT",
    "OP_SERVICE_ACCOUNT_TOKEN",
  ]) {
    delete process.env[k];
  }
  return root;
});
// An in-memory secret store; the real Keychain, 1Password, libsecret and DPAPI are never asked
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
// A person at a terminal who answers the y/N question with "no"
const human = vi.hoisted(() => ({ present: false }));
vi.mock(import("../src/confirm.js"), async (orig) => ({
  ...(await orig<typeof import("../src/confirm.js")>()),
  confirmByHuman: async () => false,
}));
vi.mock(import("../src/write-store.js"), async (orig) => {
  const real = await orig<typeof import("../src/write-store.js")>();
  return {
    ...real,
    hasHumanChannel: () => human.present || real.hasHumanChannel(),
  };
});
vi.mock(import("../src/keychain.js"), async (orig) => ({
  ...(await orig<typeof import("../src/keychain.js")>()),
  isKeychainAvailable: () => true,
}));
vi.mock(import("../src/onepassword.js"), async (orig) => ({
  ...(await orig<typeof import("../src/onepassword.js")>()),
  isOnePasswordAvailable: () => false,
}));
vi.mock(import("../src/libsecret.js"), async (orig) => ({
  ...(await orig<typeof import("../src/libsecret.js")>()),
  isLibsecretAvailable: () => false,
}));
vi.mock(import("../src/dpapi.js"), async (orig) => ({
  ...(await orig<typeof import("../src/dpapi.js")>()),
  isDpapiAvailable: () => false,
}));

import { checkCommand } from "../src/commands/check.js";
import { editPermissionsCommand } from "../src/commands/edit-permissions.js";
import { pollCommand } from "../src/commands/poll.js";
import { writeAccessCommand } from "../src/commands/write-access.js";
import { errorDetails, EXIT } from "../src/errors.js";

let out = "";
let err = "";
beforeEach(() => {
  out = "";
  err = "";
  store.values.clear();
  vi.spyOn(console, "log").mockImplementation((...a) => {
    out += `${a.join(" ")}\n`;
  });
  vi.spyOn(console, "error").mockImplementation((...a) => {
    err += `${a.join(" ")}\n`;
  });
  vi.spyOn(process, "exit").mockImplementation(((code: number) => {
    throw Object.assign(new Error("exit"), { code });
  }) as never);
});
afterEach(() => vi.restoreAllMocks());

async function run(
  cmd: typeof checkCommand,
  args: string[]
): Promise<number | null> {
  try {
    await cmd.parseAsync(args, { from: "user" });
    return null;
  } catch (error) {
    return (error as { code: number }).code;
  }
}

describe("checks before the write guard", () => {
  // In "ask" the guard would stop with exit 3 and hand out a code: a bad command must not get one
  it.each([
    [pollCommand, ["Team", "Q?", "only one"]],
    [pollCommand, ["Team", "Q?", "a", "b", "--quiz", "--correct", "3"]],
    [editPermissionsCommand, ["Team", "@alice"]],
    [editPermissionsCommand, ["Team", "@alice", "--deny", "everything"]],
  ])(
    '%#: exits 2 in mode "ask" without asking for an approval',
    async (cmd, args) => {
      store.values.set("writeEnabled", "ask");
      await expect(run(cmd as typeof checkCommand, args)).resolves.toBe(
        EXIT.USAGE
      );
      expect(out).not.toMatch(/approval_required/);
      expect(err).not.toMatch(/Approval needed/);
    }
  );
});

describe("6.1 error codes of Telegram errors", () => {
  it("a flood wait is flood_wait with the seconds; another RPC error is telegram_rpc; both exit 1", () => {
    expect(
      errorDetails({
        errorMessage: "FLOOD_WAIT",
        seconds: 120,
        message: "A wait of 120 seconds is required",
      })
    ).toEqual({
      code: "flood_wait",
      message: "A wait of 120 seconds is required",
      exitCode: 1,
      retryAfterSeconds: 120,
      hint: "Telegram rate limit: wait 120 s, then run the command again.",
    });
    expect(
      errorDetails({ errorMessage: "FLOOD_WAIT_30", message: "FLOOD_WAIT_30" })
    ).toMatchObject({ code: "flood_wait", retryAfterSeconds: 30 });
    expect(
      errorDetails({
        errorMessage: "MESSAGE_ID_INVALID",
        message: "MESSAGE_ID_INVALID: no such message",
      })
    ).toEqual({
      code: "telegram_rpc",
      message: "MESSAGE_ID_INVALID: no such message",
      exitCode: 1,
    });
    expect(errorDetails(new Error("boom"))).toEqual({
      code: "error",
      message: "boom",
      exitCode: 1,
    });
  });
});

describe("2.1 status an agent can read", () => {
  it("write-access --json prints the mode as one JSON line", async () => {
    store.values.set("writeEnabled", "ask");
    await expect(run(writeAccessCommand, ["--json"])).resolves.toBeNull();
    expect(JSON.parse(out)).toEqual({
      writeMode: "ask",
      writes: "with-approval",
      writeModeProtected: true,
      writeModeStorable: true,
      secretStore: "macOS Keychain",
      profile: null,
    });
  });

  it("write-access ask --json reports the mode it set; the prose goes to stderr", async () => {
    await expect(
      run(writeAccessCommand, ["ask", "--for", "1h", "--json"])
    ).resolves.toBeNull();
    const status = JSON.parse(out);
    expect(status).toMatchObject({
      writeMode: "ask",
      writeModeProtected: true,
    });
    expect(Date.parse(status.writeUntil)).toBeGreaterThan(Date.now());
    expect(err).toMatch(/Write access: ask/);
  });

  it("write-access on --json refused by the user is one JSON error on stdout, exit 1", async () => {
    human.present = true;
    const { argv } = process;
    process.argv = [argv[0], "telegram", "write-access", "on", "--json"];
    try {
      await expect(run(writeAccessCommand, ["on", "--json"])).resolves.toBe(
        EXIT.ERROR
      );
    } finally {
      process.argv = argv;
      human.present = false;
    }
    expect(JSON.parse(out.trim())).toEqual({
      error: {
        code: "not_confirmed",
        message: "Not confirmed by the user. Write access stays as it was.",
      },
    });
  });

  it("write-access with an unknown action is a usage error", async () => {
    await expect(run(writeAccessCommand, ["maybe"])).resolves.toBe(EXIT.USAGE);
    expect(store.values.has("writeEnabled")).toBe(false);
  });

  it("check --json without a login: configured false, the write mode, exit 5", async () => {
    store.values.set("writeEnabled", "true");
    await expect(run(checkCommand, ["--json"])).resolves.toBe(
      EXIT.NOT_LOGGED_IN
    );
    expect(JSON.parse(out)).toMatchObject({
      configured: false,
      authenticated: false,
      writeMode: "on",
      writeModeProtected: true,
      profile: null,
      transport: "auto",
      testServers: false,
      version: expect.any(String),
      error: { code: "not_configured" },
    });
    expect(home).toBeTruthy();
  });
});
