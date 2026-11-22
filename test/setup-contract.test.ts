import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { EXIT_NEEDS_APPROVAL } from "../src/approval.js";
import { EXIT } from "../src/errors.js";
import type { SetupResult } from "../src/setup-contract.js";
import { cliArgs } from "./cli.js";
import { useSpawnTimeout } from "./helpers/spawn-timeout.js";
import {
  RUN_ALLOWLIST,
  SETUP_EXIT,
  SETUP_SCHEMA,
  TERMINAL_EVENTS,
  fixOutcome,
  runRefusal,
  setupEventErrors,
  setupExitCode,
  setupResultErrors,
} from "./setup-contract-check.js";

useSpawnTimeout();

const fixtures = JSON.parse(
  readFileSync("test/fixtures/setup-contract.json", "utf-8")
);
const doc = readFileSync("docs/setup-contract.md", "utf-8");

const home = mkdtempSync(join(tmpdir(), "tg-contract-"));

afterAll(() => rmSync(home, { recursive: true, force: true }));
const fakeOp = process.platform !== "win32";
const fakeOpBin = join(home, "bin", "op");
const opLog = join(home, "op-calls.log");
if (fakeOp) {
  mkdirSync(join(home, "bin"));
  writeFileSync(
    fakeOpBin,
    '#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$CONTRACT_OP_LOG"\n[ "$1" = whoami ] && exit 0\n# what op prints for an item that does not exist\necho "[ERROR] could not read secret: \\"x\\" isn\'t an item in the \\"contract-vault\\" vault." >&2\nexit 1\n',
    { mode: 0o755 }
  );
}
const ALLOWED_OP_CALL =
  /^(whoami|read op:\/\/contract-vault\/tg-cli-contract-test-(apiHash|sessionString|writeEnabled)\/credential)$/;
const opCalls = (log: string) =>
  existsSync(log) ? readFileSync(log, "utf-8").trimEnd().split("\n") : [];
const baseEnv = (log = opLog): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^(TG|OP)_/i.test(k))
  );
  Object.assign(env, {
    HOME: home,
    USERPROFILE: home,
    APPDATA: join(home, "AppData"),
    TG_NO_UPDATE_CHECK: "1",
    TG_PROFILE: "contract-test",
  });
  if (fakeOp) {
    Object.assign(env, {
      PATH: join(home, "bin") + delimiter + (process.env.PATH ?? ""),
      CONTRACT_OP_LOG: log,
      OP_SERVICE_ACCOUNT_TOKEN: "ops_contract_test",
      TG_OP_VAULT: "contract-vault",
    });
  }
  return env;
};
beforeAll(() => {
  if (!fakeOp) {
    return;
  }
  const env = baseEnv(join(home, "preflight.log"));
  const which = spawnSync("sh", ["-c", "which op"], { encoding: "utf-8", env });
  expect(which.status).toBe(0);
  const resolved = which.stdout.trim().split(/\r?\n/)[0];
  expect(resolved).toBe(fakeOpBin);
  expect(spawnSync(resolved, ["whoami"], { env }).status).toBe(0);
});
const opLogCursor = (log: string) => {
  let checked = 0;
  return () => {
    const calls = opCalls(log);
    const added = calls.slice(checked);
    checked = calls.length;
    return added;
  };
};
const newOpCalls = opLogCursor(opLog);
afterEach(() => {
  for (const call of newOpCalls()) {
    expect(call).toMatch(ALLOWED_OP_CALL);
  }
});
const cli = (args: string[], env: NodeJS.ProcessEnv = baseEnv()) =>
  spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: "utf-8",
    env,
    timeout: 30_000,
  });

describe("setup contract, schema 1", () => {
  it("is schema 1, and its approval exit code is the write guard's", () => {
    expect(SETUP_SCHEMA).toBe(1);
    expect(SETUP_EXIT).toEqual({
      ok: 0,
      error: 1,
      needsHuman: 2,
      needsApproval: 3,
    });
    expect(SETUP_EXIT.needsApproval).toBe(EXIT_NEEDS_APPROVAL);
  });

  it.each(fixtures.valid.map((f: { name: string }) => [f.name, f]))(
    "accepts: %s",
    (_name, f: { result: SetupResult; exit: number }) => {
      expect(setupResultErrors(f.result)).toEqual([]);
      expect(setupExitCode(f.result)).toBe(f.exit);
    }
  );

  it.each(fixtures.invalid.map((f: { name: string }) => [f.name, f]))(
    "refuses: %s",
    (_name, f: { result: unknown; error: string }) => {
      const errors = setupResultErrors(f.result);
      expect(errors.join("\n")).toContain(f.error);
    }
  );

  it("judges data as stdout will show it, after JSON serialization", () => {
    const result = (data: unknown) => ({
      schema: 1,
      ok: true,
      problems: [],
      data,
    });
    expect(setupResultErrors(result(new Date(0)))).toContain(
      "data must be a JSON object"
    );
    expect(
      setupResultErrors(JSON.parse(JSON.stringify(result(new Date(0)))))
    ).toContain("data must be a JSON object");
    expect(setupResultErrors(result({ toJSON: () => [1] }))).toContain(
      "data must be a JSON object"
    );
    expect(setupResultErrors(result({ n: 1n }))).toContain(
      "data must be a JSON object"
    );
    expect(setupResultErrors(result({ path: "/x", at: new Date(0) }))).toEqual(
      []
    );
  });

  it("moves the op log cursor even when a call is refused, so only the test that made it fails", () => {
    const log = join(home, "cursor.log");
    writeFileSync(log, "item list\n");
    const next = opLogCursor(log);
    expect(next()).toEqual(["item list"]);
    expect(next()).toEqual([]);
    writeFileSync(log, "item list\nwhoami\n");
    expect(next()).toEqual(["whoami"]);
  });

  it("accepts event streams that end in exactly one terminal event, and refuses bad lines", () => {
    for (const stream of fixtures.events.valid as Record<string, unknown>[][]) {
      for (const line of stream) {
        expect(setupEventErrors(line)).toEqual([]);
      }
      const terminal = stream.map((l) =>
        (TERMINAL_EVENTS as readonly unknown[]).includes(l.event)
      );
      expect(terminal.lastIndexOf(true)).toBe(stream.length - 1);
      expect(terminal.filter(Boolean)).toHaveLength(1);
    }
    for (const f of fixtures.events.invalid as {
      event: unknown;
      error: string;
    }[]) {
      expect(setupEventErrors(f.event).join("\n")).toContain(f.error);
    }
  });

  it("every example in docs/setup-contract.md is valid", () => {
    const blocks = [...doc.matchAll(/```(json|jsonl)\n([\s\S]*?)```/g)];
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    for (const [, kind, body] of blocks) {
      if (kind === "json") {
        expect(setupResultErrors(JSON.parse(body))).toEqual([]);
      } else {
        for (const line of body.trim().split("\n")) {
          expect(setupEventErrors(JSON.parse(line))).toEqual([]);
        }
      }
    }
  });

  it("the doc tells the agent to re-run the reporting command after a fix.run, not to trust exit 0", () => {
    const rule = doc.slice(
      doc.indexOf("**After a `fix.run`, check again.**"),
      doc.indexOf("### `fix`: the person has to do it")
    );
    expect(rule).toContain("re-runs the command that reported the problem");
    expect(rule).toContain("not the fix's exit code");
    expect(rule).toContain('"action": "skipped"');
    expect(rule).toContain("does not run the same fix");
  });

  it("judges a fix.run by the recheck: exit 0 with the problem still there is not fixed", () => {
    const runs = fixtures.fixRuns as {
      name: string;
      problem: string;
      runExit: number;
      outcome: string;
      runStdout: unknown[];
      recheck: SetupResult;
    }[];
    for (const r of runs) {
      expect(setupResultErrors(r.recheck), r.name).toEqual([]);
      expect(fixOutcome(r.problem, r.runExit, r.recheck), r.name).toBe(
        r.outcome
      );
    }
    expect(runs.some((r) => r.runExit === 0 && r.outcome === "not_fixed")).toBe(
      true
    );
  });

  it("skill install exits 0 and skips a folder with someone else's files, so only a recheck shows it", () => {
    const h = mkdtempSync(join(tmpdir(), "tg-contract-skill-"));
    try {
      const folder = join(h, ".claude", "skills", "better-tg-cli");
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, "README.md"), "not ours\n");
      const env: NodeJS.ProcessEnv = { ...baseEnv(), HOME: h, USERPROFILE: h };
      for (const k of [
        "CLAUDE_CONFIG_DIR",
        "CODEX_HOME",
        "GROK_HOME",
        "XDG_CONFIG_HOME",
      ]) {
        delete env[k];
      }
      const run = cli(
        ["skill", "install", "--agent", "claude-code", "--json"],
        env
      );
      expect(run.status, run.stderr).toBe(0);
      const [row] = JSON.parse(run.stdout);
      const shown = (
        fixtures.fixRuns as { runStdout: Record<string, unknown>[] }[]
      )[0].runStdout[0];
      expect(Object.keys(row)).toEqual(Object.keys(shown));
      expect({ action: row.action, reason: row.reason }).toEqual({
        action: shown.action,
        reason: shown.reason,
      });
      const status = cli(["skill", "status", "--json"], env);
      expect(status.status, status.stderr).toBe(0);
      expect(
        JSON.parse(status.stdout).find(
          (r: { agent: string }) => r.agent === "claude-code"
        ).kind
      ).toBe("foreign");
      expect(readFileSync(join(folder, "README.md"), "utf-8")).toBe(
        "not ours\n"
      );
    } finally {
      rmSync(h, { recursive: true, force: true });
    }
  });

  it("the doc names exactly the commands of the allowlist", () => {
    const line = doc.slice(
      doc.indexOf("Allowed today:"),
      doc.indexOf("Later PRs add")
    );
    const named = [...line.matchAll(/`([a-z][a-z ]*?)(?: \[|`)/g)].map((m) =>
      m[1].trim()
    );
    expect(named).toEqual(RUN_ALLOWLIST.map((e) => e.command.join(" ")));
  });

  it("every allowlisted command and flag exists in the CLI (no entry silently stops matching)", () => {
    for (const entry of RUN_ALLOWLIST) {
      const help = cli([...entry.command, "--help"]);
      expect(help.status, entry.command.join(" ")).toBe(0);
      expect(help.stdout).toMatch(
        new RegExp(`^Usage: \\S+ ${entry.command.join(" ")}\\b`, "m")
      );
      for (const flag of Object.keys(entry.flags)) {
        expect(help.stdout, `${entry.command.join(" ")} ${flag}`).toContain(
          flag
        );
      }
    }
  });

  it("never allows commands that change authority or credentials, or a Telegram write", () => {
    for (const argv of [
      ["write-access", "on"],
      ["write-access", "ask"],
      ["auth"],
      ["logout"],
      ["mcp"],
      ["api", "messages.sendMessage"],
      ["send", "me", "hi"],
      ["skill", "install", "--force"],
      ["skill", "uninstall"],
      ["update"],
      ["update", "--json"],
      ["onboard"],
      ["onboard", "--json", "--no-open"],
      ["onboard", "--broker", "https://evil.example"],
      ["skill", "install", "constructor", "x"],
      ["skill", "install", "__proto__", "x"],
      ["skill", "install", "toString", "x"],
      ["sh", "-c", "telegram update"],
      [],
    ]) {
      expect(runRefusal(argv), argv.join(" ")).not.toBeNull();
    }
    expect(runRefusal(["skill", "install"])).toBeNull();
    expect(
      runRefusal([
        "skill",
        "install",
        "--agent",
        "codex",
        "claude-code",
        "--json",
      ])
    ).toBeNull();
  });
});

describe("current consumers keep their output", () => {
  it("chats --json prints an array", () => {
    const r = cli(["chats", "--json"], {
      ...baseEnv(),
      TG_MOCK: join(home, "mock-state.json"),
    });
    expect(r.status, r.stderr).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]).not.toHaveProperty("schema");
  });

  it("skill status --json prints an array of agent rows", () => {
    const r = cli(["skill", "status", "--json"]);
    expect(r.status, r.stderr).toBe(0);
    const rows = JSON.parse(r.stdout);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(
        expect.arrayContaining(["agent", "detected", "kind", "name", "path"])
      );
      expect(row).not.toHaveProperty("schema");
    }
  });

  it("onboard --json prints its own JSON lines, without schema, ending in timeout", () => {
    const r = cli(["onboard", "--json", "--no-open", "--timeout", "0.02"]);
    expect(r.status).toBe(1);
    const lines = r.stdout
      .trimEnd()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines.map((l) => l.event)).toEqual([
      "url",
      "waiting_invite",
      "timeout",
    ]);
    expect(lines[0].url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/s\/[\w-]+\/$/);
    for (const l of lines) {
      expect(l).not.toHaveProperty("schema");
    }
  });

  it("telegram mcp writes only JSON-RPC messages to stdout", async () => {
    const child = spawn(process.execPath, [...cliArgs(), "mcp"], {
      env: baseEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    const send = (m: object) => child.stdin.write(`${JSON.stringify(m)}\n`);
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "t", version: "0" },
      },
    });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    send({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "telegram_help", arguments: { grep: "onboard" } },
    });
    send({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "telegram_read", arguments: { args: ["whoami"] } },
    });
    child.stdin.end();
    const code = await new Promise((r) => child.on("close", r));
    expect(code).toBe(0);
    expect(out.endsWith("\n")).toBe(true);
    const messages = out
      .slice(0, -1)
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(messages.map((m) => m.id)).toEqual([1, 2, 3, 4]);
    for (const m of messages) {
      const keys = Object.keys(m).sort();
      expect([
        ["id", "jsonrpc", "result"],
        ["error", "id", "jsonrpc"],
      ]).toContainEqual(keys);
      expect(m.jsonrpc).toBe("2.0");
    }
    for (const m of messages.slice(0, 3)) {
      expect(m.result.isError, `id ${m.id}`).toBeFalsy();
    }
    expect(messages[3].result.isError).toBe(true);
  });

  it.runIf(fakeOp)("a child asks only the fake secret store", () => {
    const log = join(home, "whoami-op-calls.log");
    const r = cli(["whoami"], baseEnv(log));
    expect(r.status, r.stderr).toBe(EXIT.NOT_LOGGED_IN);
    const calls = opCalls(log);
    expect(calls).toContain("whoami");
    expect(calls.some((c) => c.startsWith("read "))).toBe(true);
    for (const call of calls) {
      expect(call).toMatch(ALLOWED_OP_CALL);
    }
  });
});
