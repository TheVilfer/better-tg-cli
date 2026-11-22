import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

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
  const root = mkdtempSync(join(tmpdir(), "tg-setup-confirm-"));
  process.env.HOME = root;
  process.env.USERPROFILE = root;
  process.env.APPDATA = join(root, "AppData");
  return { root, original };
});
const machine = vi.hoisted(() => ({
  os: "linux" as NodeJS.Platform,
  tty: false,
  answer: true,
  asked: [] as string[],
  stateError: undefined as unknown,
  duringCheck: undefined as undefined | (() => void),
  page: undefined as undefined | Record<string, any>,
}));
vi.mock(import("node:os"), async (orig) => ({
  ...(await orig<typeof import("node:os")>()),
  platform: () => machine.os,
}));
vi.mock(import("../src/secrets.js"), () => ({
  isSecretStoreAvailable: () => false,
  secretGet: () => null,
  secretSet: () => false,
  secretDelete: () => {},
  secretGetStrict: () => ({ ok: false, reason: "none" }),
  SECRET_KEYS: new Set(["apiHash", "sessionString", "writeEnabled"]),
  isSecretKey: (k: string) =>
    ["apiHash", "sessionString", "writeEnabled"].includes(k),
  migrateSecretsToStore: (c: Record<string, unknown>) => c,
}));
vi.mock(import("../src/confirm.js"), () => ({
  confirmByHuman: async (q: string) => (machine.asked.push(q), machine.answer),
  windowsConfirmScript: () => "",
}));
vi.mock(import("../src/transport.js"), async (orig) => ({
  ...(await orig<typeof import("../src/transport.js")>()),
  connectClient: async () => ({
    connected: true,
    invoke: async () => {
      machine.duringCheck?.();
      if (machine.stateError) {
        throw machine.stateError;
      }
      return {};
    },
    async isUserAuthorized() {
      try {
        await this.invoke();
        return true;
      } catch {
        return false;
      }
    },
    destroy: async () => {},
  }),
}));
vi.mock(import("../src/onboard.js"), async (orig) => ({
  ...(await orig<typeof import("../src/onboard.js")>()),
  startOnboarding: async (o: Record<string, any>) => {
    machine.page = o;
    return {
      url: "http://127.0.0.1:1/s/x/",
      done: new Promise(() => {}),
      close: () => {},
    };
  },
}));

import {
  freshSessionString,
  loadConfig,
  saveConfig,
  setSessionString,
} from "../src/config.js";
import { closeSetup, runSetup } from "../src/mcp.js";
import { configDir } from "../src/paths.js";
import { openSetupPage, sessionState } from "../src/setup.js";
import { applyModeChoice } from "../src/write-mode.js";
import { getWriteValue } from "../src/write-store.js";

const tty = { stdin: process.stdin.isTTY, stdout: process.stdout.isTTY };
let n = 0;
beforeEach(() => {
  process.env.TG_PROFILE = `setup-confirm-${++n}`;
  freshSessionString();
  process.env.PATH = mkdtempSync(join(home.root, "bin-"));
  process.env.SSH_CONNECTION = "test";
  for (const k of ["TG_MOCK", "TG_MCP", "DBUS_SESSION_BUS_ADDRESS"]) {
    delete process.env[k];
  }
  Object.assign(machine, {
    os: "linux",
    tty: false,
    answer: true,
    asked: [],
    stateError: undefined,
    duringCheck: undefined,
    page: undefined,
  });
  process.stdin.isTTY = false as never;
  process.stdout.isTTY = false as never;
});
afterEach(() => {
  closeSetup();
  process.stdin.isTTY = tty.stdin as never;
  process.stdout.isTTY = tty.stdout as never;
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

const withTerminal = () => {
  process.stdin.isTTY = true as never;
  process.stdout.isTTY = true as never;
};

describe("a write mode picked on a page whose link the model handed out needs the person (1)", () => {
  it('headless Linux without a secret store: "on" and "ask" are refused (needs_terminal), read-only is free', async () => {
    await expect(
      applyModeChoice({ mode: "on" }, { fromModel: true })
    ).resolves.toEqual({ ok: false, error: "needs_terminal" });
    await expect(
      applyModeChoice({ mode: "ask", forSeconds: 3600 }, { fromModel: true })
    ).resolves.toEqual({ ok: false, error: "needs_terminal" });
    expect(getWriteValue()).toBeNull();
    expect(existsSync(join(configDir(), "write-access"))).toBe(false);
    await expect(
      applyModeChoice({ mode: "read-only" }, { fromModel: true })
    ).resolves.toEqual({ ok: true });
    expect(machine.asked).toEqual([]);
  });

  it("the `telegram onboard` page in a terminal keeps its old rule there (the unprotected exception)", async () => {
    await expect(applyModeChoice({ mode: "on" })).resolves.toMatchObject({
      ok: true,
    });
    expect(getWriteValue()).toBe("true");
  });

  it("with a dialog or a terminal the person is asked, on every OS", async () => {
    for (const os of ["darwin", "win32"] as const) {
      machine.os = os;
      machine.answer = false;
      await expect(
        applyModeChoice({ mode: "ask" }, { fromModel: true })
      ).resolves.toEqual({ ok: false, error: "not_confirmed" });
    }
    machine.os = "linux";
    withTerminal();
    machine.answer = true;
    await expect(
      applyModeChoice({ mode: "on" }, { fromModel: true })
    ).resolves.toMatchObject({ ok: true });
    expect(machine.asked).toHaveLength(3);
  });

  it("telegram_setup opens its page with that rule: a pick there is refused without a person to ask", async () => {
    saveConfig({ apiId: 1, apiHash: "0".repeat(32) });
    setSessionString("session-A");
    await runSetup();
    expect(machine.page).toMatchObject({ modeOnly: true });
    await expect(machine.page!.applyMode({ mode: "on" })).resolves.toEqual({
      ok: false,
      error: "needs_terminal",
    });
    await expect(machine.page!.applyMode({ mode: "ask" })).resolves.toEqual({
      ok: false,
      error: "needs_terminal",
    });
    expect(getWriteValue()).toBeNull();
  });
});

describe('a session is "expired" only when Telegram says so (7)', () => {
  beforeEach(() => {
    saveConfig({ apiId: 1, apiHash: "0".repeat(32) });
    setSessionString("session-A");
  });

  it("an auth error code is expired; a network failure is an error, not a reason to log in again", async () => {
    await expect(sessionState()).resolves.toBe("alive");
    machine.stateError = Object.assign(
      new Error("RPCError 401: AUTH_KEY_UNREGISTERED"),
      { errorMessage: "AUTH_KEY_UNREGISTERED" }
    );
    await expect(sessionState()).resolves.toBe("expired");
    machine.stateError = Object.assign(
      new Error("RPCError 401: SESSION_REVOKED"),
      { errorMessage: "SESSION_REVOKED" }
    );
    await expect(sessionState()).resolves.toBe("expired");
    machine.stateError = Object.assign(
      new Error("RPCError 406: AUTH_KEY_DUPLICATED"),
      { errorMessage: "AUTH_KEY_DUPLICATED" }
    );
    await expect(sessionState()).resolves.toBe("expired");
    machine.stateError = Object.assign(
      new Error("RPCError 401: SESSION_PASSWORD_NEEDED"),
      { errorMessage: "SESSION_PASSWORD_NEEDED" }
    );
    await expect(sessionState()).rejects.toThrow(/SESSION_PASSWORD_NEEDED/);
    machine.stateError = new Error("connect ETIMEDOUT 149.154.167.50:443");
    await expect(sessionState()).rejects.toThrow(/ETIMEDOUT/);
    machine.stateError = Object.assign(new Error("FLOOD_WAIT_30"), {
      errorMessage: "FLOOD_WAIT",
      seconds: 30,
    });
    await expect(sessionState()).rejects.toThrow(/FLOOD_WAIT/);
  });

  it("a login finished on an old page does not replace a session saved meanwhile by another process", async () => {
    await openSetupPage({ emit: () => {}, fromModel: true });
    setSessionString("session-B");
    expect(() =>
      machine.page!.save(
        "session-C",
        { apiId: 1, apiHash: "0".repeat(32) },
        false
      )
    ).toThrow(/Another login was saved in this profile/);
    expect(loadConfig(() => {}).sessionString).toBe("session-B");
  });

  it("telegram_setup: a login saved by another process while the revoked one was being checked is not replaced", async () => {
    machine.stateError = Object.assign(
      new Error("RPCError 401: SESSION_REVOKED"),
      { errorMessage: "SESSION_REVOKED" }
    );
    machine.duringCheck = () => {
      machine.duringCheck = undefined;
      setSessionString("session-B");
    };
    const r = await runSetup();
    expect(r.structuredContent).toMatchObject({
      status: "open_page",
      step: "login",
      sessionExpired: true,
    });
    expect(() =>
      machine.page!.save(
        "session-C",
        { apiId: 1, apiHash: "0".repeat(32) },
        false
      )
    ).toThrow(/Another login was saved in this profile/);
    expect(loadConfig(() => {}).sessionString).toBe("session-B");
  });

  it("also when the other login was written behind this process's config cache", async () => {
    await openSetupPage({ emit: () => {}, fromModel: true });
    expect(loadConfig(() => {}).sessionString).toBe("session-A");
    const path = join(configDir(), "config.json5");
    writeFileSync(
      path,
      JSON.stringify({
        ...JSON.parse(readFileSync(path, "utf-8")),
        sessionString: "session-B",
      })
    );
    expect(() =>
      machine.page!.save(
        "session-C",
        { apiId: 1, apiHash: "0".repeat(32) },
        false
      )
    ).toThrow(/Another login was saved/);
  });

  it("a new login over an old one stays on the profile's test servers", async () => {
    saveConfig({ testServers: true });
    await openSetupPage({ emit: () => {}, fromModel: true });
    machine.page!.save(
      "session-C",
      { apiId: 1, apiHash: "0".repeat(32) },
      false
    );
    const after = loadConfig(() => {});
    expect(after.sessionString).toBe("session-C");
    expect(after.testServers).toBe(true);
  });
});

describe("a --read-only server logs in only (important)", () => {
  it("no default write mode and no mode step on its login page", async () => {
    const r = await runSetup({ readOnly: true });
    expect(machine.page).toBeTruthy();
    expect(machine.page!.applyMode).toBeUndefined();
    expect(machine.page!.defaultMode).toBeUndefined();
    expect(machine.page!.modeOnly).toBeFalsy();
    expect((r.content[0] as { text: string }).text).toContain(
      "no write mode is set or offered"
    );
    expect(r.structuredContent).toMatchObject({
      status: "open_page",
      step: "login",
      readOnly: true,
    });
    expect(getWriteValue()).toBeNull();
  });
});
