import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Before any module under test is imported: HOME (and the Windows dirs) point at a temp root, so
// no path these tests touch can resolve into the real ~/.config
const home = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const original = { ...process.env };
  const root = mkdtempSync(join(tmpdir(), "tg-modes-home-"));
  process.env.HOME = root;
  process.env.USERPROFILE = root;
  process.env.APPDATA = join(root, "AppData");
  // What each test returns to: the temp home, never the real one
  return { root, original, saved: { ...process.env } };
});
// Linux, as on a cloud agent computer: the file fallback is allowed only off macOS and Windows
vi.mock(import("node:os"), async (orig) => ({
  ...(await orig<typeof import("node:os")>()),
  platform: () => "linux",
}));
// An in-memory secret store, switchable to "none" (a cloud agent computer): the real Keychain is never touched
const store = vi.hoisted(() => ({
  available: true,
  values: new Map<string, string>(),
}));
vi.mock(import("../src/secrets.js"), () => ({
  isSecretStoreAvailable: () => store.available,
  secretGet: (k: string) =>
    store.available ? (store.values.get(k) ?? null) : null,
  secretSet: (k: string, v: string) =>
    store.available ? (store.values.set(k, v), true) : false,
  secretDelete: (k: string) => store.values.delete(k),
  // the strict read loadConfig uses once secrets resolve through it
  secretGetStrict: (k: string) => ({
    ok: true,
    value: store.available ? (store.values.get(k) ?? null) : null,
  }),
  SECRET_KEYS: new Set(["apiHash", "sessionString", "writeEnabled"]),
  isSecretKey: (k: string) =>
    ["apiHash", "sessionString", "writeEnabled"].includes(k),
  migrateSecretsToStore: (c: Record<string, unknown>) => c,
}));
// stdin for "-": the guard reads it through this helper; the tests feed it directly
const stdin = vi.hoisted(() => ({ text: "" }));
vi.mock(import("../src/text.js"), async (orig) => ({
  ...(await orig<typeof import("../src/text.js")>()),
  readStdinOnce: () => stdin.text,
}));
// Who can confirm: a terminal / dialog or nobody
const human = vi.hoisted(() => ({
  channel: false,
  answer: true,
  asked: [] as string[],
  noFallback: false,
}));
vi.mock(import("../src/confirm.js"), () => ({
  confirmByHuman: async (q: string) => (human.asked.push(q), human.answer),
  windowsConfirmScript: () => "",
}));
vi.mock(import("../src/write-store.js"), async (orig) => {
  const real = await orig<typeof import("../src/write-store.js")>();
  return {
    ...real,
    hasHumanChannel: () => human.channel,
    mayTrustUnconfirmedChoice: () => !human.channel && !store.available,
    // A desktop where the store should work but does not answer (no file fallback), when a test asks for it
    isFileFallbackAllowed: (
      ...a: Parameters<typeof real.isFileFallbackAllowed>
    ) =>
      a.length || !human.noFallback ? real.isFileFallbackAllowed(...a) : false,
  };
});

import {
  actionHash,
  consumeApproval,
  createApproval,
  describeAction,
  APPROVAL_TTL_MS,
  EXIT_NEEDS_APPROVAL,
} from "../src/approval.js";
import { auditLog } from "../src/audit.js";
import { getSessionString } from "../src/config.js";
import { EXIT } from "../src/errors.js";
import { forgetFileSnapshots } from "../src/file-snapshot.js";
import { assertLocalWriteAllowed, assertWriteEnabled } from "../src/guard.js";
import { elicitApproved, gateWrite } from "../src/mcp.js";
import { configDir } from "../src/paths.js";
import { applyModeChoice } from "../src/write-mode.js";
import {
  describeWriteState,
  encodeWriteState,
  parseWriteState,
} from "../src/write-state.js";
import { getWriteValue, isFileFallbackAllowed } from "../src/write-store.js";
import { describeInProcess } from "./helpers/describe-in-process.js";

// A home of its own for each test: the profile dir lives under it, and only that root is deleted
let root: string | undefined;
let dir: string;
beforeEach(() => {
  for (const k of ["TG_MOCK", "TG_READ_ONLY", "TG_APPROVE", "TG_MCP"]) {
    delete process.env[k];
  }
  root = mkdtempSync(join(tmpdir(), "tg-modes-"));
  process.env.HOME = root;
  process.env.USERPROFILE = root;
  process.env.APPDATA = join(root, "AppData");
  process.env.TG_PROFILE = "test-modes";
  dir = configDir();
  const inside = relative(root, dir);
  expect(
    inside && !inside.startsWith("..") && !isAbsolute(inside)
  ).toBeTruthy();
  store.available = true;
  store.values.clear();
  human.channel = false;
  human.answer = true;
  human.asked = [];
  human.noFallback = false;
  stdin.text = "";
});
afterEach(() => {
  // In place: a replaced process.env is a plain object that os.homedir() no longer reads
  for (const k of Object.keys(process.env)) {
    if (!(k in home.saved)) {
      delete process.env[k];
    }
  }
  Object.assign(process.env, home.saved);
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

/** The account as the guard reads it: the stored session of the profile. */
const account = () => getSessionString();

/** Runs the guard, turning process.exit into a value; returns the exit code (or null) and stderr. */
async function guard(
  argv: string[],
  check: (argv: string[]) => Promise<void> | void = assertWriteEnabled
) {
  let err = "";
  let out = "";
  vi.spyOn(console, "error").mockImplementation((...a) => {
    err += `${a.join(" ")}\n`;
  });
  vi.spyOn(console, "log").mockImplementation((...a) => {
    out += `${a.join(" ")}\n`;
  });
  vi.spyOn(process, "exit").mockImplementation(((code: number) => {
    throw Object.assign(new Error("exit"), { code });
  }) as never);
  try {
    await check(argv);
    return { code: null as number | null, err, out };
  } catch (error) {
    return { code: (error as { code: number }).code, err, out };
  } finally {
    vi.restoreAllMocks();
  }
}

/** The code in an approval message: the CLI form (TG_APPROVE=…) or the MCP one ("approval": "…"). */
const codeIn = (s: string) =>
  /(?:TG_APPROVE=|"approval": ")([A-Z2-9]{6})/.exec(s)?.[1];
/** gateWrite's describe run, in this process (the real one starts the CLI as a child). */
const describe_ = (p: Parameters<typeof gateWrite>[0]) =>
  describeInProcess(p, (t) => {
    stdin.text = t;
  });

describe("write state", () => {
  const now = Date.UTC(2026, 10, 4, 12);

  it("keeps the meaning of the values existing installs have", async () => {
    expect(parseWriteState("true", now)).toEqual({ mode: "on", enabled: true });
    expect(parseWriteState(null, now)).toEqual({
      mode: "read-only",
      enabled: false,
    });
    expect(parseWriteState(encodeWriteState(3600, now), now)).toMatchObject({
      mode: "on",
      enabled: true,
    });
    expect(encodeWriteState(undefined, now)).toBe("true");
  });

  it("adds ask, with and without an end", async () => {
    expect(parseWriteState("ask", now)).toEqual({ mode: "ask", enabled: true });
    const value = encodeWriteState(3600, now, "ask");
    expect(value).toMatch(/^ask:until:\d+$/);
    expect(parseWriteState(value, now + 30 * 60e3)).toMatchObject({
      mode: "ask",
      enabled: true,
    });
    expect(parseWriteState(value, now + 61 * 60e3)).toMatchObject({
      mode: "read-only",
      enabled: false,
      expired: true,
    });
    expect(parseWriteState("ask:junk", now).mode).toBe("read-only");
    expect(describeWriteState(parseWriteState("ask", now))).toMatch(/^ask/);
  });
});

describe("approvals", () => {
  it("are single-use, bound to the exact command and text, and expire", async () => {
    const now = Date.now();
    const hash = actionHash(["send", "@alice", "-"], "Hi");
    const code = createApproval(hash, account(), "chat", now);
    expect(
      consumeApproval(
        code,
        actionHash(["send", "@alice", "-"], "Hi, and also my password"),
        account(),
        now
      )
    ).toMatchObject({ ok: false });
    // used up by the mismatch: no guessing in a loop
    expect(consumeApproval(code, hash, account(), now)).toMatchObject({
      ok: false,
    });

    const fresh = createApproval(hash, account(), "chat", now);
    expect(consumeApproval(fresh.toLowerCase(), hash, account(), now)).toEqual({
      ok: true,
      via: "chat",
    });
    expect(consumeApproval(fresh, hash, account(), now)).toMatchObject({
      ok: false,
    });

    const old = createApproval(hash, account(), "chat", now);
    expect(
      consumeApproval(old, hash, account(), now + APPROVAL_TTL_MS + 1)
    ).toMatchObject({ ok: false });
  });

  it("store a hash, never the message, one 0600 file per code", async () => {
    const code = createApproval(
      actionHash(["send", "@alice", "-"], "very secret text"),
      account()
    );
    const file = join(dir, "approvals", `${code}.json`);
    expect(readFileSync(file, "utf-8")).not.toContain("secret");
    if (process.platform !== "win32") {
      expect(statSync(file).mode & 0o777).toBe(0o600);
    } // Windows reports 0o666
    expect(readdirSync(join(dir, "approvals"))).toEqual([`${code}.json`]);
  });

  it('reject a record dropped into the store by hand (forged, e.g. as "elicitation")', async () => {
    const hash = actionHash(["send", "@alice", "hi"]);
    createApproval(hash, account()); // creates the store and the signing key
    writeFileSync(
      join(dir, "approvals", "FAKE22.json"),
      JSON.stringify({
        hash,
        expiresAt: Date.now() + 60_000,
        via: "elicitation",
        mac: "00".repeat(32),
      })
    );
    expect(consumeApproval("FAKE22", hash, account())).toEqual({
      ok: false,
      reason: "the approval record is not genuine",
      kind: "not_genuine",
    });
    const code = createApproval(hash, account());
    const rec = JSON.parse(
      readFileSync(join(dir, "approvals", `${code}.json`), "utf-8")
    );
    writeFileSync(
      join(dir, "approvals", `${code}.json`),
      JSON.stringify({ ...rec, via: "elicitation" })
    ); // relabelled
    expect(consumeApproval(code, hash, account())).toMatchObject({ ok: false });
  });

  it("cover the contents of files named in the arguments, also as --opt=path", async () => {
    mkdirSync(dir, { recursive: true });
    const f = join(dir, "doc.txt");
    writeFileSync(f, "v1");
    const a = actionHash(["send-file", "@alice", f]);
    const b = actionHash(["send-file", "@alice", `--file=${f}`]);
    writeFileSync(f, "v2"); // same size, changed contents
    forgetFileSnapshots(); // a new process (the retry) reads the file again
    expect(actionHash(["send-file", "@alice", f])).not.toBe(a);
    expect(actionHash(["send-file", "@alice", `--file=${f}`])).not.toBe(b);
  });

  it("show the whole text, with control and bidi characters escaped", async () => {
    const long = "x".repeat(5000);
    expect(describeAction(["send", "@alice", "-"], long)).toContain(long);
    const shown = describeAction(["send", "@alice", "-"], "pay \u202Eevil");
    expect(shown).not.toContain("\u202E");
    expect(shown).toContain("\\u{202e}");
  });
});

describe("the guard", () => {
  it("refuses writes in read-only and names both ways to allow them", async () => {
    const r = await guard(["send", "@alice", "hi"]);
    expect(r.code).toBe(EXIT.WRITE_DISABLED);
    expect(r.err).toMatch(/write-access ask/);
    expect(r.out).toBe("");
  });

  it("read-only with --json: exit 4 and one JSON error line on stdout naming the next step", async () => {
    const r = await guard(["send", "@alice", "hi", "--json"]);
    expect(r.code).toBe(4);
    expect(JSON.parse(r.out)).toEqual({
      error: {
        code: "write_disabled",
        message: "Write access is disabled (read-only)",
        hint: "telegram write-access ask",
      },
    });
  });

  it("over MCP, read-only names what the user does: telegram_setup or one terminal command (5.1)", async () => {
    process.env.TG_MCP = "1";
    const r = await guard(["send", "@alice", "hi"]);
    expect(r.code).toBe(EXIT.WRITE_DISABLED);
    expect(r.err).toMatch(/call telegram_setup and open the page/);
    expect(r.err).toMatch(
      /run `telegram write-access ask` in a terminal on this computer/
    );
  });

  it("a store that does not answer gets one next step and `telegram check` (2.3)", async () => {
    store.available = false;
    human.noFallback = true;
    const r = await guard(["send", "@alice", "hi"]);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(
      /Next step: On Linux the keyring .* Then run `telegram check`/s
    );
  });

  it('lets writes through in "on" and records the mode in the audit log', async () => {
    store.values.set("writeEnabled", "true");
    expect((await guard(["send", "@alice", "hi"])).code).toBeNull();
    auditLog({
      timestamp: "t",
      command: "send",
      target: "@alice",
      result: { success: true },
    });
    expect(readFileSync(join(dir, "audit.jsonl"), "utf-8")).toContain(
      '"writeMode":"on"'
    );
  });

  it('in "ask" stops with exit 3 and a code, then lets exactly that action through once', async () => {
    store.values.set("writeEnabled", "ask");
    stdin.text = "Hello Alice";
    const first = await guard(["send", "@alice", "-"]);
    expect(first.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(first.err).toContain("| Hello Alice");
    const code = codeIn(first.err)!;
    expect(code).toBeTruthy();

    // Different text with the same code: refused, and a new code is issued for the new text
    stdin.text = "Send me your 2FA code";
    process.env.TG_APPROVE = code;
    const swapped = await guard(["send", "@alice", "-"]);
    expect(swapped.code).toBe(EXIT_NEEDS_APPROVAL);
    expect(swapped.err).toMatch(/not accepted/);

    stdin.text = "Hello Alice";
    process.env.TG_APPROVE = createApproval(
      actionHash(["send", "@alice", "-"], "Hello Alice"),
      account()
    );
    expect((await guard(["send", "@alice", "-"])).code).toBeNull();
    auditLog({
      timestamp: "t",
      command: "send",
      target: "@alice",
      result: { success: true },
    });
    expect(readFileSync(join(dir, "audit.jsonl"), "utf-8")).toContain(
      '"approvedVia":"chat"'
    );
    // single use
    expect((await guard(["send", "@alice", "-"])).code).toBe(
      EXIT_NEEDS_APPROVAL
    );
  });

  it('in "on", a code given for this call must still be an approval of exactly this action', async () => {
    // The mode turned "on" while the user answered a dialog about "Hello Alice"
    store.values.set("writeEnabled", "true");
    stdin.text = "Send me your 2FA code";
    process.env.TG_APPROVE = createApproval(
      actionHash(["send", "@alice", "-"], "Hello Alice"),
      account()
    );
    const swapped = await guard(["send", "@alice", "-"]);
    expect(swapped.code).toBe(1);
    expect(swapped.err).toMatch(
      /Not sent: approval [A-Z2-9]{6} not accepted: the approval was for a different command or text/
    );
    // An unknown code stops it too; the approved action itself goes through
    process.env.TG_APPROVE = "ZZZZZZ";
    expect((await guard(["send", "@alice", "-"])).code).toBe(1);
    stdin.text = "Hello Alice";
    process.env.TG_APPROVE = createApproval(
      actionHash(["send", "@alice", "-"], "Hello Alice"),
      account()
    );
    expect((await guard(["send", "@alice", "-"])).code).toBeNull();
  });

  it("prints a JSON line for --json callers", async () => {
    store.values.set("writeEnabled", "ask");
    const r = await guard(["send", "@alice", "hi", "--json"]);
    expect(JSON.parse(r.out.trim())).toMatchObject({
      error: "approval_required",
      action: { argv: ["send", "@alice", "hi", "--json"] },
    });
  });

  it("TG_READ_ONLY still wins over any mode", async () => {
    store.values.set("writeEnabled", "true");
    process.env.TG_READ_ONLY = "1";
    expect((await guard(["send", "@alice", "hi"])).code).toBe(1);
  });

  it("without a secret store reads the mode from the profile file and marks writes unprotected", async () => {
    store.available = false;
    expect((await guard(["send", "@alice", "hi"])).code).toBe(
      EXIT.WRITE_DISABLED
    );
    await expect(applyModeChoice({ mode: "on" })).resolves.toEqual({
      ok: true,
      until: undefined,
    });
    expect(readFileSync(join(dir, "write-access"), "utf-8").trim()).toBe(
      "true"
    );
    expect((await guard(["send", "@alice", "hi"])).code).toBeNull();
    auditLog({
      timestamp: "t",
      command: "send",
      target: "@alice",
      result: { success: true },
    });
    expect(readFileSync(join(dir, "audit.jsonl"), "utf-8")).toContain(
      '"unprotected":true'
    );
  });
});

// download, sync and avatar write local files only: free in a terminal, but over MCP (TG_MCP) they
// follow the profile's write mode like any other write
describe("local file writes", () => {
  // Called through a wrapper: if the helper were missing, this must fail, not fall back to the default
  const local = (argv: string[]) =>
    guard(argv, (a) => assertLocalWriteAllowed(a));

  it("need no write access in a terminal, whatever the mode", async () => {
    expect((await local(["download", "me", "1"])).code).toBeNull();
    store.values.set("writeEnabled", "ask");
    expect((await local(["sync"])).code).toBeNull();
  });

  it("over MCP are refused in read-only", async () => {
    process.env.TG_MCP = "1";
    for (const argv of [["download", "me", "1"], ["sync"], ["avatar", "me"]]) {
      const r = await local(argv);
      expect(r.code, argv.join(" ")).toBe(EXIT.WRITE_DISABLED);
      expect(r.err).toMatch(/Write access is disabled/);
    }
  });

  it('over MCP in "ask" need an approval of that exact call, once', async () => {
    process.env.TG_MCP = "1";
    store.values.set("writeEnabled", "ask");
    const first = await local(["download", "me", "1", "-o", "/tmp/x"]);
    expect(first.code).toBe(EXIT_NEEDS_APPROVAL);
    process.env.TG_APPROVE = codeIn(first.err)!;
    expect(
      (await local(["download", "me", "1", "-o", "/tmp/x"])).code
    ).toBeNull();
    expect((await local(["download", "me", "1", "-o", "/tmp/x"])).code).toBe(
      EXIT_NEEDS_APPROVAL
    );
  });

  it("a misrouted read never writes a file", async () => {
    process.env.TG_READ_ONLY = "1";
    expect((await local(["download", "me", "1"])).code).toBe(1);
  });

  // A mock write needs no approval, so over MCP the model could pick any path
  it("over MCP in mock mode are refused, whatever the mode; a terminal and a misrouted read as without mock", async () => {
    process.env.TG_MOCK = "1";
    expect((await local(["sync", "--output", "/tmp/x"])).code).toBeNull();
    process.env.TG_MCP = "1";
    for (const mode of [undefined, "ask", "true"]) {
      if (mode) {
        store.values.set("writeEnabled", mode);
      }
      for (const argv of [
        ["download", "me", "1"],
        ["sync", "--output", "/tmp/x"],
        ["avatar", "me"],
      ]) {
        const r = await local(argv);
        expect(r.code, `${mode} ${argv.join(" ")}`).toBe(1);
        expect(r.err).toMatch(/mock mode \(TG_MOCK\).*write no local files/);
      }
    }
    process.env.TG_READ_ONLY = "1";
    const read = await local(["download", "me", "1"]);
    expect(read.code).toBe(1);
    expect(read.err).toMatch(/cannot run as a read/);
  });
});

describe("the file fallback", () => {
  it("is never used on macOS or Windows, where a missing store means a broken or disabled one", async () => {
    expect(isFileFallbackAllowed("darwin")).toBe(false);
    expect(isFileFallbackAllowed("win32")).toBe(false);
  });

  it("on Linux, is used wherever the Secret Service cannot work: no secret-tool, or no session bus (#74)", async () => {
    expect(
      isFileFallbackAllowed("linux", { secretTool: false, bus: false })
    ).toBe(true); // Grok Bot today
    expect(
      isFileFallbackAllowed("linux", { secretTool: true, bus: false })
    ).toBe(true); // secret-tool installed, still no keyring
    expect(
      isFileFallbackAllowed("linux", { secretTool: false, bus: true })
    ).toBe(true);
    expect(
      isFileFallbackAllowed("linux", { secretTool: true, bus: true })
    ).toBe(false); // desktop with a keyring: fail closed
  });

  it("tells agents on cloud computers not to install a keyring", async () => {
    store.available = false;
    const r = await guard(["send", "@alice", "hi"]);
    expect(r.code).toBe(EXIT.WRITE_DISABLED);
    expect(r.err).toMatch(/Do not try to install one/);
  });
});

describe("choosing a mode", () => {
  it('"on" asks the person where there is a terminal or dialog, and keeps read-only on a no', async () => {
    human.channel = true;
    human.answer = false;
    await expect(
      applyModeChoice({ mode: "on", forSeconds: 3600 })
    ).resolves.toEqual({ ok: false, error: "not_confirmed" });
    expect(human.asked[0]).toMatch(/без вопросов/);
    expect(getWriteValue()).toBeNull();
    human.answer = true;
    const r = await applyModeChoice({ mode: "on", forSeconds: 3600 });
    expect(r.ok).toBe(true);
    expect(parseWriteState(getWriteValue()).mode).toBe("on");
    // It reports the end it wrote, to the second, so onboard can compare it with the store
    expect(r.ok && r.until?.getTime()).toBe(
      parseWriteState(getWriteValue()).until?.getTime()
    );
  });

  it('"ask" needs no dialog anywhere: the yes in the chat before each write is the confirmation', async () => {
    expect((await applyModeChoice({ mode: "ask" })).ok).toBe(true); // secret store, no terminal
    expect(parseWriteState(getWriteValue()).mode).toBe("ask");
    expect(human.asked).toEqual([]);
  });

  it("never takes a page click alone where the mode is protected (a secret store but no terminal)", async () => {
    await expect(applyModeChoice({ mode: "on" })).resolves.toEqual({
      ok: false,
      error: "needs_terminal",
    });
    expect(getWriteValue()).toBeNull();
  });

  it("read-only needs nobody and clears both stores", async () => {
    store.values.set("writeEnabled", "true");
    await expect(applyModeChoice({ mode: "read-only" })).resolves.toEqual({
      ok: true,
    });
    expect(getWriteValue()).toBeNull();
    expect(existsSync(join(dir, "write-access"))).toBe(false);
    expect(human.asked).toEqual([]);
  });
});

describe('MCP in mode "ask"', () => {
  const plan = () =>
    ({ argv: ["send", "@alice", "-"], readOnly: false, stdin: "Hi" }) as {
      argv: string[];
      readOnly: boolean;
      stdin?: string;
      approval?: string;
    };

  it("asks the user through the client and mints the approval itself", async () => {
    store.values.set("writeEnabled", "ask");
    const asked: string[] = [];
    const p = plan();
    await expect(
      gateWrite(p, {}, async (m) => (asked.push(m), true), describe_)
    ).resolves.toBeUndefined();
    expect(asked[0]).toContain("| Hi");
    expect(
      consumeApproval(p.approval!, actionHash(p.argv, "Hi"), account())
    ).toEqual({ ok: true, via: "elicitation" });
  });

  it("sends nothing when the user declines, and refuses codes from the model when it can ask", async () => {
    store.values.set("writeEnabled", "ask");
    await expect(
      gateWrite(plan(), {}, async () => false, describe_)
    ).resolves.toMatch(/did not approve/);
    const p = plan();
    await expect(
      gateWrite(p, { approval: "ABCDEF" }, async () => true)
    ).resolves.toMatch(/not accepted here/);
    expect(p.approval).toBeUndefined();
  });

  it("reads an elicitation answer: the ticked box, or a plain Allow from a prompt-only client", async () => {
    expect(
      elicitApproved({ action: "accept", content: { approve: true } })
    ).toBe(true);
    // Hermes Agent shows Allow Once / Deny and accepts with empty content
    expect(elicitApproved({ action: "accept", content: {} })).toBe(true);
    expect(elicitApproved({ action: "accept" })).toBe(true);
    expect(
      elicitApproved({ action: "accept", content: { approve: false } })
    ).toBe(false);
    expect(
      elicitApproved({ action: "accept", content: { approve: "yes" } })
    ).toBe(false);
    expect(elicitApproved({ action: "accept", content: { other: true } })).toBe(
      false
    );
    expect(elicitApproved({ action: "accept", content: "ok" })).toBe(false);
    expect(elicitApproved({ action: "decline" })).toBe(false);
    expect(elicitApproved({ action: "cancel", content: {} })).toBe(false);
    expect(elicitApproved(undefined)).toBe(false);
  });

  it("passes the chat code on when the client has no elicitation", async () => {
    store.values.set("writeEnabled", "ask");
    const p = plan();
    await expect(gateWrite(p, { approval: "ABCDEF" })).resolves.toBeUndefined();
    expect(p.approval).toBe("ABCDEF");
  });

  it("does not ask in other modes", async () => {
    store.values.set("writeEnabled", "true");
    let asked = false;
    await expect(
      gateWrite(plan(), {}, async () => (asked = true))
    ).resolves.toBeUndefined();
    expect(asked).toBe(false);
  });
});

describe("a plugin command with the network effect is a write in the shell too", () => {
  let program: import("commander").Command | undefined;
  /** `telegram plugin run net-lab <cmd>` in this process, on this test's (non-mock) profile. */
  async function pluginRun(args: string[]) {
    const { pluginCommand, pluginDeps } =
      await import("../src/commands/plugin.js");
    if (!program) {
      // A program of its own with the guard's hook, as index.ts builds it
      const { Command } = await import("commander");
      const { trackActiveCommand } = await import("../src/approval-action.js");
      program = new Command("telegram").addCommand(pluginCommand);
      trackActiveCommand(program);
    }
    const { ExitSignal } = await import("../src/errors.js");
    pluginDeps.cliVersion = "99.0.0";
    let err = "";
    let out = "";
    vi.spyOn(console, "error").mockImplementation((...a) => {
      err += `${a.join(" ")}\n`;
    });
    vi.spyOn(console, "log").mockImplementation((...a) => {
      out += `${a.join(" ")}\n`;
    });
    // An ExitSignal, as installDrainingExit throws: the command passes it on with its code
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw Object.assign(new ExitSignal(), { code });
    }) as never);
    const { argv } = process;
    process.argv = [argv[0], "telegram", "plugin", "run", ...args];
    try {
      await program.parseAsync(["plugin", "run", ...args], { from: "user" });
      return { code: null as number | null, err, out };
    } catch (error) {
      return { code: (error as { code?: number }).code ?? -1, err, out };
    } finally {
      process.argv = argv;
      vi.restoreAllMocks();
    }
  }

  async function installNetLab() {
    const { commitInstall } = await import("../src/plugins/store.js");
    const { readLocalSnapshot } = await import("../src/plugins/source.js");
    return commitInstall(
      readLocalSnapshot("test/fixtures/plugins/net-lab", "99.0.0")
    );
  }

  it('read-only refuses before any request; "ask" shows the origins and needs a code; "on" runs; a read command never asks', async () => {
    const { httpDeps } = await import("../src/plugins/http-backend.js");
    const { fixtureBackend, parseFixtures } =
      await import("../src/plugins/http.js");
    const requests: string[] = [];
    const backend = fixtureBackend(
      parseFixtures(
        {
          request: { url: "https://api.example.com/v2/x" },
          response: { body: "hello" },
        },
        "test"
      ),
      "test"
    );
    httpDeps.backend = async (req, signal, deadline) => {
      requests.push(req.url.href);
      return backend(req, signal, deadline);
    };
    try {
      await installNetLab();
      const input = ["--input", '{"url":"https://api.example.com/v2/x"}'];
      // Read-only (the default): the guard stops it, nothing is sent
      const ro = await pluginRun(["net-lab", "fetch", ...input, "--json"]);
      expect(ro.code).toBe(EXIT.WRITE_DISABLED);
      expect(JSON.parse(ro.out).error.code).toBe("write_disabled");
      expect(requests).toEqual([]);
      // A command without effects is a read: it runs in read-only
      expect(
        (await pluginRun(["net-lab", "setting", "--input", '{"key":"mode"}']))
          .code
      ).toBeNull();
      // Ask: an approval with the destinations, no request before it
      store.values.set("writeEnabled", "ask");
      const ask = await pluginRun(["net-lab", "fetch", ...input, "--json"]);
      expect(ask.code).toBe(EXIT_NEEDS_APPROVAL);
      const desc = JSON.parse(ask.out).action.description as string;
      expect(desc).toContain(
        "Sends to: https://api.example.com, https://other.example.com, https://wrong.example.net"
      );
      expect(desc).toContain(
        "Secrets the host attaches: apikey → https://api.example.com /v1; other → https://other.example.com"
      );
      expect(desc).toContain('Input: {"url":"https://api.example.com/v2/x"}');
      expect(requests).toEqual([]);
      const code = codeIn(ask.err)!;
      // The code is bound to the input: another URL with it is refused (a new approval is printed)
      process.env.TG_APPROVE = code;
      const other = await pluginRun([
        "net-lab",
        "fetch",
        "--input",
        '{"url":"https://other.example.com/x"}',
        "--json",
      ]);
      expect(other.code).toBe(EXIT_NEEDS_APPROVAL);
      expect(requests).toEqual([]);
      // A fresh code for the input as shown, then the run
      delete process.env.TG_APPROVE;
      process.env.TG_APPROVE = codeIn(
        (await pluginRun(["net-lab", "fetch", ...input, "--json"])).err
      )!;
      const ok = await pluginRun(["net-lab", "fetch", ...input, "--json"]);
      expect(ok.code, ok.err).toBeNull();
      expect(JSON.parse(ok.out).data).toMatchObject({
        ok: true,
        response: { status: 200, body: "hello" },
      });
      expect(requests).toEqual(["https://api.example.com/v2/x"]);
      // Used once
      expect(
        (await pluginRun(["net-lab", "fetch", ...input, "--json"])).code
      ).toBe(EXIT_NEEDS_APPROVAL);
      delete process.env.TG_APPROVE;
      // On: runs without a question
      store.values.set("writeEnabled", "true");
      expect(
        (await pluginRun(["net-lab", "fetch", ...input, "--json"])).code
      ).toBeNull();
      expect(requests).toHaveLength(2);
      const audit = readFileSync(join(dir, "audit.jsonl"), "utf-8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));
      const runs = audit.filter(
        (a) => a.command === "plugin run" && a.plugin.command === "fetch"
      );
      expect(
        runs.map((r) => [r.result.success, r.writeMode, r.plugin.network])
      ).toEqual([
        [true, "ask", { requests: 1, origins: ["https://api.example.com"] }],
        [true, "on", { requests: 1, origins: ["https://api.example.com"] }],
      ]);
      expect(JSON.stringify(audit)).not.toContain("/v2/x");
    } finally {
      delete httpDeps.backend;
    }
  });
});
