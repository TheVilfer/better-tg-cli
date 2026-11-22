import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  checkBundle,
  withoutModuleMarkers,
} from "../packages/plugin-sdk/src/bundle-check.js";
import { MANIFEST_SCHEMAS } from "../src/plugins/manifest-schemas.js";
import { schemaUrl, SPEC_VERSION } from "../src/plugins/manifest.js";
import { cliArgs } from "./cli.js";

const LAB = resolve("test/fixtures/plugins/sandbox-lab");
const NET = resolve("test/fixtures/plugins/net-lab");
const TEMPLATE = resolve("templates/plugin");
const SDK = resolve("packages/plugin-sdk");

interface SdkError extends Error {
  code: string;
  exitCode: number;
  body: Record<string, unknown>;
  json(): string;
}
interface SdkTest {
  CLI_VERSION: string;
  runCommand(
    dir: string,
    command: string,
    input: unknown,
    options: Record<string, unknown>
  ): Promise<{ data: unknown; proposals: unknown[]; json: string }>;
  validatePlugin(dir: string): Record<string, unknown>;
  createTestHost(options: Record<string, unknown>): {
    run(
      dir: string,
      command: string,
      input: unknown,
      options?: Record<string, unknown>
    ): Promise<{ data: unknown; proposals: unknown[]; json: string }>;
  };
}

const root = mkdtempSync(join(tmpdir(), "tg-plugin-sdk-"));
const out = join(resolve(".test-cli"), `sdk-${process.pid}`);
let sdk: SdkTest;

function bun(args: string[], cwd = process.cwd()) {
  return spawnSync("bun", args, {
    cwd,
    encoding: "utf-8",
    shell: process.platform === "win32",
    env: env(),
  });
}

beforeAll(async () => {
  writeFixturePlugins();
  mkdirSync(resolve(".test-cli"), { recursive: true });
  const r = bun([join(SDK, "scripts", "build.mjs"), out]);
  expect(r.status, r.stderr + r.stdout).toBe(0);
  sdk = (await import(pathToFileURL(join(out, "test.mjs")).href)) as SdkTest;
}, 120_000);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
});

const env = (): NodeJS.ProcessEnv => {
  const e: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: root,
    USERPROFILE: root,
    APPDATA: join(root, "AppData"),
    TG_MOCK: join(root, "mock-state.json"),
    TG_NO_UPDATE_CHECK: "1",
    TG_PROFILE: "",
  };
  for (const k of ["TG_APPROVE", "TG_MCP", "TG_READ_ONLY", "TG_MCP_WORKER"]) {
    delete e[k];
  }
  return e;
};

function cli(
  args: string[],
  extra: Record<string, string> = {}
): { code: number | null; line: string } {
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: "utf-8",
    env: { ...env(), ...extra },
  });
  return { code: r.status, line: r.stdout.trim().split("\n").at(-1) ?? "" };
}

const CURSOR = /^[\w-]{22}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function stable(line: string): string {
  return JSON.stringify(JSON.parse(line), (key, value: unknown) => {
    if (key === "cursor" && typeof value === "string" && CURSOR.test(value)) {
      return "<cursor>";
    }
    if (key === "date" && typeof value === "string" && ISO.test(value)) {
      return "<date>";
    }
    return value;
  });
}

async function viaSdk(
  dir: string,
  command: string,
  input: unknown,
  target?: string,
  extra: Record<string, string> = {}
): Promise<{ code: number; line: string }> {
  const saved = Object.keys(extra).map((k) => [k, process.env[k]] as const);
  Object.assign(process.env, extra);
  try {
    const r = await sdk.runCommand(dir, command, input, {
      mock: true,
      ...(target ? { target } : {}),
    });
    return { code: 0, line: r.json };
  } catch (error) {
    const e = error as SdkError;
    expect(e.name, e.stack).toBe("PluginRunError");
    return { code: e.exitCode, line: e.json() };
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  }
}

function viaCli(
  dir: string,
  command: string,
  input: unknown,
  target?: string,
  extra: Record<string, string> = {}
): { code: number | null; line: string } {
  return cli(
    [
      "plugin",
      "dev",
      dir,
      command,
      "--mock",
      "--input",
      JSON.stringify(input),
      ...(target ? ["--target", target] : []),
      "--json",
    ],
    extra
  );
}

type Case = [
  string,
  string,
  string,
  unknown,
  (string | undefined)?,
  Record<string, string>?,
];

const UNSUPPORTED = join(root, "unsupported");
const FUTURE = join(root, "future");
const INVALID = join(root, "invalid");
const LIMITS = join(root, "limits-lab");

function writePlugin(
  dir: string,
  manifest: Record<string, unknown>,
  code: string
): void {
  mkdirSync(join(dir, "code"), { recursive: true });
  writeFileSync(join(dir, "tg-plugin.json"), JSON.stringify(manifest));
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${String(manifest.name)}\ndescription: A test plugin\n---\n\n# Test\n`
  );
  writeFileSync(join(dir, "code", "lab.js"), code);
}

function labManifest(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(LAB, "tg-plugin.json"), "utf-8")
  ) as Record<string, unknown>;
}

function writeFixturePlugins(): void {
  const code = readFileSync(join(LAB, "code", "lab.js"), "utf-8");
  writePlugin(
    UNSUPPORTED,
    { ...labManifest(), engines: { "better-tg-cli": ">=99.0.0" } },
    code
  );
  writePlugin(
    FUTURE,
    {
      ...labManifest(),
      $schema: "https://better-tg-cli.com/schemas/tg-plugin/2099-01-01.json",
    },
    code
  );
  writePlugin(
    INVALID,
    {
      ...labManifest(),
      files: ["tg-plugin.json", "code/lab.js"],
      storage: { keys: ["Bad Key"] },
    },
    code
  );
  const command = (name: string) => ({
    name,
    description: `Runs into the ${name} limit`,
    effects: [],
    input: { type: "object" },
    output: { type: "object" },
  });
  writePlugin(
    LIMITS,
    {
      $schema: "https://better-tg-cli.com/schemas/tg-plugin/2026-11-21.json",
      name: "limits-lab",
      version: "0.1.0",
      description: "Runs into sandbox limits (tests only)",
      main: "code/lab.js",
      files: ["tg-plugin.json", "SKILL.md", "code/lab.js"],
      commands: [command("stack"), command("jobs")],
    },
    [
      "export const commands = {",
      "  stack() { const f = (n) => f(n + 1) + 1; return f(0); },",
      "  jobs() { const f = () => { Promise.resolve().then(f); }; f(); return new Promise(() => {}); },",
      "};",
      "",
    ].join("\n")
  );
}

const lab = (op: string, args?: unknown[]): unknown =>
  args ? { op, args } : { op };

const CASES: Case[] = [
  ["identity", LAB, "probe", lab("me")],
  [
    "own messages, a page with a cursor",
    LAB,
    "probe",
    lab("mine", [{ limit: 2 }]),
  ],
  [
    "own messages, the last page",
    LAB,
    "probe",
    lab("mine", [{ limit: 2000, types: ["private", "group"] }]),
  ],
  [
    "a cursor of another run",
    LAB,
    "probe",
    lab("mine", [{ cursor: "AAAAAAAAAAAAAAAAAAAAAA" }]),
  ],
  [
    "a cursor this host never returned",
    LAB,
    "probe",
    lab("mine", [{ cursor: "x" }]),
  ],
  [
    "an invalid_cursor the plugin relabels keeps the host's message",
    LAB,
    "probe",
    lab("mineThenForge", [{ cursor: "AAAAAAAAAAAAAAAAAAAAAA" }]),
  ],
  [
    "an invalid_cursor the plugin makes up is a plugin_error",
    LAB,
    "probe",
    lab("forge", ["invalid_cursor", "made up"]),
  ],
  ["chats", LAB, "probe", lab("chats", [{ limit: 3 }])],
  ["search", LAB, "probe", lab("search", ["Thursday"])],
  ["a setting's default", LAB, "probe", lab("setting", ["tone"])],
  ["an undeclared setting", LAB, "probe", lab("setting", ["nope"])],
  ["what a read command is granted", LAB, "probe", lab("granted")],
  ["the sandbox globals", LAB, "probe", lab("globals")],
  ["host is frozen", LAB, "probe", lab("frozen")],
  ["host.log", LAB, "probe", lab("log")],
  ["no target", LAB, "probe", lab("target")],
  ["a target message", LAB, "probe", lab("target"), "@mock_owner:1"],
  [
    "a target that is one message, read as a thread",
    LAB,
    "probe",
    lab("targetThread"),
    "@mock_owner:1",
  ],
  ["storage of a read command", LAB, "probe", lab("get")],
  ["a storage write", LAB, "save", { value: "hello" }],
  ["a storage write past the quota", LAB, "save", { value: "x".repeat(5000) }],
  [
    "proposals",
    LAB,
    "propose",
    {
      actions: [
        { type: "send", chat: "@alice", text: "Hi" },
        { type: "reply", chat: "-100123", msgId: 5, text: "Yes" },
        { type: "react", chat: "@alice", msgId: 7, emoji: "👍" },
      ],
    },
  ],
  [
    "an invalid proposal",
    LAB,
    "propose",
    { actions: [{ type: "send", chat: "@alice", text: "Hi", extra: 1 }] },
  ],
  [
    "too many proposals",
    LAB,
    "propose",
    {
      actions: Array.from({ length: 21 }, () => ({
        type: "send",
        chat: "@alice",
        text: "Hi",
      })),
    },
  ],
  ["null fields are kept", LAB, "strict", { value: { n: 1, next: null } }],
  [
    "a result that breaks the output schema",
    LAB,
    "strict",
    { value: { n: 1 } },
  ],
  [
    "an input that breaks the input schema",
    LAB,
    "strict",
    { value: 1, extra: true },
  ],
  ["a missing required input", LAB, "probe", {}],
  ["an unknown command", LAB, "nope", {}],
  ["a promise nobody settles", LAB, "probe", lab("never")],
  ["await 0", LAB, "probe", lab("awaitZero")],
  ["a polluted prototype", LAB, "probe", lab("proto")],
  ["a large result within the limit", LAB, "probe", lab("zeros")],
  ["limit: memory", LAB, "probe", lab("big")],
  ["limit: output", LAB, "probe", lab("hugeOutput")],
  ["limit: hostCalls", LAB, "probe", lab("many")],
  ["limit: concurrentCalls", LAB, "probe", lab("burst")],
  ["limit: callBytes", LAB, "probe", lab("bigArgs")],
  [
    "a fixture with a secret stripped",
    NET,
    "fetch",
    { url: "https://api.example.com/v1/hello?q=1" },
  ],
  [
    "a POST fixture",
    NET,
    "fetch",
    {
      url: "https://other.example.com/items",
      opts: { method: "POST", body: "{}" },
    },
  ],
  [
    "an origin outside network",
    NET,
    "fetch",
    { url: "https://evil.example.org/" },
  ],
  [
    "an ambiguous path",
    NET,
    "fetch",
    { url: "https://api.example.com/v1/..%2fadmin" },
  ],
  [
    "a forbidden header",
    NET,
    "fetch",
    {
      url: "https://api.example.com/v1/hello?q=1",
      opts: { headers: { Cookie: "a=b" } },
    },
  ],
  [
    "no fixture, uncaught",
    NET,
    "fetch-raw",
    { url: "https://api.example.com/v1/other" },
  ],
  ["a setting with an enum", NET, "setting", { key: "mode" }],
  ["a read command has no http", NET, "no-net", {}],
  [
    "template: summary",
    TEMPLATE,
    "summary",
    { limit: 100, types: ["private", "group"] },
  ],
  ["template: summary with a cursor", TEMPLATE, "summary", { limit: 2 }],
  ["template: summary input refused", TEMPLATE, "summary", { limit: 0 }],
  [
    "template: a target, which it has no permission for",
    TEMPLATE,
    "summary",
    { limit: 10 },
    "@mock_owner:1",
  ],
  ["template: define", TEMPLATE, "define", { word: "plugin" }],
  ["template: define, 404", TEMPLATE, "define", { word: "zzz" }],
  ["template: define without a fixture", TEMPLATE, "define", { word: "other" }],
  [
    "template: flood_wait before anything was read, as a page to go on from",
    TEMPLATE,
    "summary",
    { limit: 100 },
    undefined,
    { TG_MOCK_FLOOD_HISTORY: "0:9" },
  ],
  [
    "template: flood_wait after a partial page, counted",
    TEMPLATE,
    "summary",
    { limit: 100, types: ["private", "group"] },
    undefined,
    { TG_MOCK_FLOOD_HISTORY: "1:9" },
  ],
  [
    "flood_wait of messages.mine with the cursor and what was read",
    LAB,
    "probe",
    lab("mine", [{ limit: 2000, types: ["private", "group"] }]),
    undefined,
    { TG_MOCK_FLOOD_HISTORY: "1:9" },
  ],
  [
    "flood_wait of messages.read",
    LAB,
    "probe",
    lab("read", ["@mock_owner"]),
    undefined,
    { TG_MOCK_FLOOD_HISTORY: "0:7" },
  ],
  ["plugin_unsupported: engines", UNSUPPORTED, "probe", lab("me")],
  ["plugin_unsupported: a newer spec", FUTURE, "probe", lab("me")],
  ["plugin_invalid", INVALID, "probe", lab("me")],
  ["a folder that is no plugin", join(root, "missing"), "probe", lab("me")],
  ["limit: stack", LIMITS, "stack", {}],
  ["limit: jobs", LIMITS, "jobs", {}],
];

describe(
  "the SDK test host and plugin dev give the same answer",
  { timeout: 60_000 },
  () => {
    it.each(CASES)("%s", async (_, dir, command, input, target, extra) => {
      const fromCli = viaCli(dir, command, input, target, extra);
      const fromSdk = await viaSdk(dir, command, input, target, extra);
      expect(fromSdk.code).toBe(fromCli.code);
      expect(stable(fromSdk.line)).toBe(stable(fromCli.line));
      expect(fromSdk.line).toHaveLength(fromCli.line.length);
    });
  }
);

describe("validation", { timeout: 60_000 }, () => {
  it("plugin validate accepts the template, and the SDK says the same", () => {
    const r = cli(["plugin", "validate", TEMPLATE, "--json"]);
    expect(r.code, r.line).toBe(0);
    expect(JSON.parse(r.line)).toMatchObject({ ok: true, name: "my-plugin" });
    expect(sdk.validatePlugin(TEMPLATE)).toEqual(JSON.parse(r.line));
  });

  it("an invalid folder fails the same way in both", () => {
    const bad = join(root, "bad");
    mkdirSync(bad, { recursive: true });
    const r = cli(["plugin", "validate", bad, "--json"]);
    let sdkLine = "";
    try {
      sdk.validatePlugin(bad);
    } catch (error) {
      sdkLine = (error as SdkError).json();
    }
    expect(r.code).not.toBe(0);
    expect(sdkLine).toBe(r.line);
  });

  it("the SDK carries this CLI's version and the newest spec version", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
      version: string;
    };
    expect(sdk.CLI_VERSION).toBe(pkg.version);
    expect(Object.keys(MANIFEST_SCHEMAS).sort().at(-1)).toBe(SPEC_VERSION);
    const manifest = JSON.parse(
      readFileSync(join(TEMPLATE, "tg-plugin.json"), "utf-8")
    ) as { $schema: string };
    expect(manifest.$schema).toBe(schemaUrl(SPEC_VERSION));
  });
});

describe("the SDK's own options", { timeout: 60_000 }, () => {
  const fails = async (run: Promise<unknown>) => {
    try {
      await run;
    } catch (error) {
      return error as SdkError;
    }
    throw new Error("The run did not fail");
  };

  it("runs only on mock data", async () => {
    const e = await fails(sdk.runCommand(LAB, "probe", lab("me"), {}));
    expect(e).toMatchObject({ code: "invalid_argument", exitCode: 2 });
    expect(() => sdk.createTestHost({})).toThrow(
      expect.objectContaining({
        name: "PluginRunError",
        code: "invalid_argument",
      })
    );
  });

  it("a cursor of runCommand ends with its run and reaches the caller as invalid_cursor", async () => {
    const first = await sdk.runCommand(
      LAB,
      "probe",
      lab("mine", [{ limit: 2 }]),
      { mock: true }
    );
    const { cursor } = (first.data as { result: { cursor: string } }).result;
    expect(cursor).toMatch(CURSOR);
    const e = await fails(
      sdk.runCommand(LAB, "probe", lab("mine", [{ cursor }]), { mock: true })
    );
    expect(e).toMatchObject({ code: "invalid_cursor", exitCode: 1 });
    expect(e.body.message).toBe(
      "cursor is unknown or expired (cursors last 24 hours); start again without one"
    );
  });

  it("a test host keeps cursors between runs: the second page continues the first", async () => {
    const both = ["private", "group"];
    const page = (r: { data: unknown }) =>
      (
        r.data as {
          result: {
            messages: { text: string }[];
            cursor: string | null;
            done: boolean;
          };
        }
      ).result;
    const all = page(
      await sdk.runCommand(
        LAB,
        "probe",
        lab("mine", [{ limit: 2000, types: both }]),
        { mock: true }
      )
    );
    const host = sdk.createTestHost({ mock: true });
    const texts: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r = page(
        await host.run(
          LAB,
          "probe",
          lab("mine", [
            cursor ? { limit: 2, cursor } : { limit: 2, types: both },
          ])
        )
      );
      texts.push(...r.messages.map((m) => m.text));
      cursor = r.cursor;
      pages += 1;
    } while (cursor && pages < 50);
    expect(pages).toBeGreaterThan(1);
    expect(texts).toEqual(all.messages.map((m) => m.text));
    const template = await host.run(TEMPLATE, "summary", { limit: 2 });
    const next = (template.data as { cursor: string }).cursor;
    expect(
      (await host.run(TEMPLATE, "summary", { limit: 2, cursor: next })).data
    ).toMatchObject({ count: expect.any(Number) });
    const elsewhere = await fails(
      host.run(LAB, "probe", lab("mine", [{ cursor: next }]))
    );
    expect(elsewhere.code).toBe("invalid_cursor");
    const otherHost = await fails(
      sdk
        .createTestHost({ mock: true })
        .run(TEMPLATE, "summary", { limit: 2, cursor: next })
    );
    expect(otherHost.code).toBe("invalid_cursor");
  });

  it("a test host resumes from a flood_wait's cursor with nothing lost or repeated", async () => {
    const input = lab("mine", [{ limit: 2000, types: ["private", "group"] }]);
    const all = (
      (await sdk.runCommand(LAB, "probe", input, { mock: true })).data as {
        result: { messages: { text: string }[] };
      }
    ).result.messages;
    const host = sdk.createTestHost({ mock: true });
    process.env.TG_MOCK_FLOOD_HISTORY = "1:9";
    let e: SdkError;
    try {
      e = await fails(host.run(LAB, "probe", input));
    } finally {
      delete process.env.TG_MOCK_FLOOD_HISTORY;
    }
    expect(e.code).toBe("flood_wait");
    const { cursor, partial } = e.body as {
      cursor: string;
      partial: { messages: { text: string }[] };
    };
    expect(cursor).toMatch(CURSOR);
    const rest = (
      (await host.run(LAB, "probe", lab("mine", [{ limit: 2000, cursor }])))
        .data as { result: { messages: { text: string }[] } }
    ).result.messages;
    expect([...partial.messages, ...rest].map((m) => m.text)).toEqual(
      all.map((m) => m.text)
    );
  });

  it("a test host's options apply to every run, and a run's own options go over them", async () => {
    const host = sdk.createTestHost({ mock: true, settings: { tone: "dry" } });
    expect(
      (await host.run(LAB, "probe", lab("setting", ["tone"]))).data
    ).toMatchObject({ result: "dry" });
    expect(
      (
        await host.run(LAB, "probe", lab("setting", ["tone"]), {
          settings: { tone: "warm" },
        })
      ).data
    ).toMatchObject({ result: "warm" });
  });

  it("settings are checked as plugin settings set checks them", async () => {
    const ok = await sdk.runCommand(
      NET,
      "setting",
      { key: "count" },
      {
        mock: true,
        settings: { count: 7 },
      }
    );
    expect(ok.data).toEqual({ value: 7 });
    const e = await fails(
      sdk.runCommand(
        NET,
        "setting",
        { key: "count" },
        {
          mock: true,
          settings: { count: 11 },
        }
      )
    );
    expect(e).toMatchObject({ code: "invalid_argument", exitCode: 2 });
    expect(e.body.issues).toBeInstanceOf(Array);
    const unknown = await fails(
      sdk.runCommand(
        NET,
        "setting",
        { key: "count" },
        {
          mock: true,
          settings: { nope: 1 },
        }
      )
    );
    expect(unknown.code).toBe("invalid_argument");
  });

  it("secrets replace the placeholders, are stripped from the response, and null is a secret not set", async () => {
    const url = "https://api.example.com/v1/echo";
    const fixtures = {
      request: { url },
      response: { json: { got: "Bearer real-looking-key" } },
    };
    const r = await sdk.runCommand(
      NET,
      "fetch",
      { url },
      {
        mock: true,
        fixtures,
        secrets: { apikey: "real-looking-key" },
      }
    );
    expect(JSON.stringify(r.data)).not.toContain("real-looking-key");
    expect(JSON.stringify(r.data)).toContain("[secret]");
    const missing = await fails(
      sdk.runCommand(
        NET,
        "fetch-raw",
        { url },
        {
          mock: true,
          fixtures,
          secrets: { apikey: null },
        }
      )
    );
    expect(missing.code).toBe("secret_missing");
    expect(missing.body.command).toEqual([
      "plugin",
      "secret",
      "set",
      "net-lab",
      "apikey",
    ]);
    const short = await fails(
      sdk.runCommand(
        NET,
        "fetch",
        { url },
        {
          mock: true,
          secrets: { apikey: "short" },
        }
      )
    );
    expect(short.code).toBe("invalid_argument");
    const undeclared = await fails(
      sdk.runCommand(
        NET,
        "fetch",
        { url },
        {
          mock: true,
          secrets: { nope: "long-enough-value" },
        }
      )
    );
    expect(undeclared.code).toBe("invalid_argument");
  });

  it("test fixtures come before the folder's, and a malformed one is refused", async () => {
    const url = "https://api.example.com/v1/hello?q=1";
    const r = await sdk.runCommand(
      NET,
      "fetch",
      { url },
      {
        mock: true,
        fixtures: [
          { request: { url }, response: { status: 202, body: "mine" } },
        ],
      }
    );
    expect(r.data).toMatchObject({ response: { status: 202, body: "mine" } });
    const e = await fails(
      sdk.runCommand(
        NET,
        "fetch",
        { url },
        {
          mock: true,
          fixtures: { request: {} },
        }
      )
    );
    expect(e.code).toBe("invalid_argument");
  });

  it("host.log lines reach the test's callback, never the output", async () => {
    const lines: string[] = [];
    const r = await sdk.runCommand(LAB, "probe", lab("log"), {
      mock: true,
      log: (line: string) => lines.push(line),
    });
    expect(r.data).toEqual({ op: "log", result: "logged" });
    expect(lines).toEqual(['debug line {"n":1}']);
  });

  it("an input that is not JSON is refused like a bad --input", async () => {
    const e = await fails(
      sdk.runCommand(LAB, "probe", { op: "me", n: 10n }, { mock: true })
    );
    expect(e).toMatchObject({ code: "invalid_argument", exitCode: 2 });
  });

  it("review #6: a target is refused unless the plugin has messages:read-target, in plugin dev and the SDK alike", async () => {
    const message =
      'Plugin "my-plugin" reads no target (it lacks the permission messages:read-target); drop --target';
    const e = await fails(
      sdk.runCommand(
        TEMPLATE,
        "summary",
        { limit: 10 },
        {
          mock: true,
          target: "@mock_owner:1",
        }
      )
    );
    expect(e).toMatchObject({ code: "invalid_argument", exitCode: 2, message });
    const fromCli = viaCli(TEMPLATE, "summary", { limit: 10 }, "@mock_owner:1");
    expect(fromCli.code).toBe(2);
    expect(JSON.parse(fromCli.line).error.message).toBe(message);
  });

  it("review #11: settings past the 256 KiB a settings file may hold are refused as plugin settings set refuses them", async () => {
    const e = await fails(
      sdk.runCommand(LAB, "probe", lab("setting", ["tone"]), {
        mock: true,
        settings: { tone: "x".repeat(256 * 1024 + 1) },
      })
    );
    expect(e).toMatchObject({ code: "settings_too_large", exitCode: 2 });
    expect(e.message).toBe(
      `The settings of "sandbox-lab" would take ${256 * 1024 + 12} bytes; the limit is ${256 * 1024}`
    );
    const fits = await sdk.runCommand(LAB, "probe", lab("me"), {
      mock: true,
      settings: { tone: "x".repeat(256 * 1024 - 11) },
    });
    expect(fits.data).toMatchObject({ op: "me" });
  });

  it("review #7: each run starts the mock account afresh, one after another and side by side", async () => {
    const input = lab("mine", [{ limit: 2000, types: ["private", "group"] }]);
    const flood = { TG_MOCK_FLOOD_HISTORY: "1:9" };
    const fromCli = viaCli(LAB, "probe", input, undefined, flood);
    expect(fromCli.line).toContain('"flood_wait"');
    const first = await viaSdk(LAB, "probe", input, undefined, flood);
    const second = await viaSdk(LAB, "probe", input, undefined, flood);
    expect(stable(first.line)).toBe(stable(fromCli.line));
    expect(stable(second.line)).toBe(stable(fromCli.line));
    process.env.TG_MOCK_FLOOD_HISTORY = flood.TG_MOCK_FLOOD_HISTORY;
    try {
      const lines = await Promise.all(
        [1, 2, 3].map(() =>
          sdk.runCommand(LAB, "probe", input, { mock: true }).then(
            () => "no error",
            (error: SdkError) => error.json()
          )
        )
      );
      expect(lines.map(stable)).toEqual(
        [1, 2, 3].map(() => stable(fromCli.line))
      );
    } finally {
      delete process.env.TG_MOCK_FLOOD_HISTORY;
    }
  });

  it("review #8: importing the test host and running a command leave the process's globals alone", () => {
    expect(readFileSync(join(out, "test.mjs"), "utf-8")).not.toContain(
      "localStorage"
    );
    const script = [
      "const sentinel = { mine: true };",
      'Object.defineProperty(globalThis, "localStorage", { value: sentinel, configurable: true, writable: true, enumerable: false });',
      "const before = Reflect.ownKeys(globalThis).map(String).sort().join();",
      `const sdk = await import(${JSON.stringify(pathToFileURL(join(out, "test.mjs")).href)});`,
      'if (globalThis.localStorage !== sentinel) throw new Error("gone after import");',
      `const r = await sdk.runCommand(${JSON.stringify(LAB)}, "probe", { op: "me" }, { mock: true });`,
      'if (globalThis.localStorage !== sentinel) throw new Error("gone after runCommand");',
      "const after = Reflect.ownKeys(globalThis).map(String).sort().join();",
      "if (before !== after) throw new Error(`globals changed: ${before} -> ${after}`);",
      "console.log(JSON.stringify(r.data));",
    ].join("\n");
    const r = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { encoding: "utf-8", env: env() }
    );
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ op: "me" });
  });
});

describe("the SDK build", { timeout: 120_000 }, () => {
  it("the template's committed dist/plugin.js is what the SDK builds from its source", () => {
    const copy = join(root, "template");
    const installed = join(copy, "node_modules", "@better-tg", "plugin-sdk");
    cpSync(join(TEMPLATE, "src"), join(copy, "src"), { recursive: true });
    cpSync(join(TEMPLATE, "tg-plugin.json"), join(copy, "tg-plugin.json"));
    cpSync(join(SDK, "package.json"), join(installed, "package.json"));
    cpSync(out, join(installed, "dist"), { recursive: true });
    const r = bun([join(out, "bin.mjs"), "build", copy]);
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(join(copy, "dist", "plugin.js"), "utf-8")).toBe(
      readFileSync(join(TEMPLATE, "dist", "plugin.js"), "utf-8")
    );
    const outside = bun([
      join(out, "bin.mjs"),
      "build",
      copy,
      "--outfile",
      join(root, "elsewhere.js"),
    ]);
    expect(outside.status).toBe(1);
    expect(outside.stderr).toContain("inside the plugin folder");
  });

  it("the author's strings are kept as written, and only Bun's module comments go", () => {
    const dir = join(root, "literal");
    mkdirSync(join(dir, "src"), { recursive: true });
    const text = "a\n\n\n// x.ts\nimport y from 'z';\nb";
    writeFileSync(
      join(dir, "src", "plugin.ts"),
      `const s = ${JSON.stringify(text).replaceAll('"', "`")};\nexport const commands = { a: () => s };\n`
    );
    const r = bun([join(out, "bin.mjs"), "build", dir]);
    expect(r.status, r.stderr).toBe(0);
    const built = readFileSync(join(dir, "dist", "plugin.js"), "utf-8");
    expect(built).toContain(text);
    expect(built).not.toContain("// src/plugin.ts");
  });

  it("review #5: a template line equal to Bun's marker of the entry stays, and the command returns it", async () => {
    const dir = join(root, "marker");
    mkdirSync(join(dir, "src"), { recursive: true });
    const text = "before\n// src/plugin.ts\nafter";
    writeFileSync(
      join(dir, "src", "plugin.ts"),
      `const s = \`${text}\`;\nexport const commands = { a: () => s };\n`
    );
    const r = bun([join(out, "bin.mjs"), "build", "."], dir);
    expect(r.status, r.stderr).toBe(0);
    const built = readFileSync(join(dir, "dist", "plugin.js"), "utf-8");
    expect(
      built.split("\n").filter((l) => l === "// src/plugin.ts")
    ).toHaveLength(1);
    const mod = (await import(
      `${pathToFileURL(join(dir, "dist", "plugin.js")).href}?v=1`
    )) as { commands: { a(): string } };
    expect(mod.commands.a()).toBe(text);
    expect(
      withoutModuleMarkers(
        `// src/plugin.ts\nvar s = \`x\n// src/plugin.ts\ny\`;\n`,
        ["src/plugin.ts"]
      )
    ).toBe("var s = `x\n// src/plugin.ts\ny`;\n");
  });

  it("review #4: the bundle must parse as ES2023, load no module and export commands", () => {
    const refused: [string, RegExp][] = [
      ['import x from "y";\nexport const commands = {};', /import from "y"/],
      ['export * from "y";\nexport const commands = {};', /export \* from "y"/],
      [
        'export { a } from "y";\nexport const commands = {};',
        /export from "y"/,
      ],
      ["export const commands = { a: (n) => import(n) };", /import\(\)/],
      ["export const commands = { a: (n) => require(n) };", /require/],
      [
        "var r = typeof require !== 'undefined' ? require : null;\nexport const commands = { r };",
        /require/,
      ],
      ["export const commands = { a: () => /a/v.test('a') };", /not ES2023/],
      ["const commands = {};\nexport { commands as other };", /exports other/],
      ["export const other = 1;", /does not export `commands`/],
    ];
    for (const [code, error] of refused) {
      expect(() => checkBundle(code), code).toThrow(error);
    }
    expect(
      checkBundle(
        "const o = { require: 1 };\nvar { commands } = { commands: { a: () => o.require } };\nexport { commands };"
      )
    ).toEqual(["commands"]);
    expect(
      checkBundle("export const { commands } = { commands: {} };")
    ).toEqual(["commands"]);
  });

  it("review #4: tg-plugin build refuses what QuickJS could not run", () => {
    const dir = join(root, "unrunnable");
    mkdirSync(join(dir, "src"), { recursive: true });
    const sources: Record<string, string> = {
      "dynamic.ts":
        "export const commands = { a: (name: string) => import(name) };\n",
      "renamed.ts": "const commands = {};\nexport { commands as other };\n",
      "asset.ts":
        'import png from "./a.png";\nexport const commands = { a: () => png };\n',
      "regex.ts": "export const commands = { a: () => /a/v.test('a') };\n",
    };
    writeFileSync(join(dir, "src", "a.png"), "PNG");
    for (const [name, text] of Object.entries(sources)) {
      writeFileSync(join(dir, "src", name), text);
    }
    const build = (entry: string) =>
      bun([join(out, "bin.mjs"), "build", dir, "--entry", `src/${entry}`]);
    const expected: Record<string, string> = {
      "dynamic.ts": "import()",
      "renamed.ts": "does not export `commands`",
      "asset.ts": "one JavaScript file",
      "regex.ts": "not ES2023",
    };
    for (const [entry, message] of Object.entries(expected)) {
      const r = build(entry);
      expect(r.status, `${entry}: ${r.stdout}`).toBe(1);
      expect(r.stderr, entry).toContain(message);
    }
    expect(existsSync(join(dir, "dist"))).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "review #3: the output is never written through a link",
    () => {
      const outside = join(root, "outside");
      mkdirSync(outside, { recursive: true });
      const victim = join(outside, "plugin.js");
      writeFileSync(victim, "keep me");
      const make = (name: string) => {
        const dir = join(root, name);
        mkdirSync(join(dir, "src"), { recursive: true });
        writeFileSync(
          join(dir, "src", "plugin.ts"),
          "export const commands = { a: () => 1 };\n"
        );
        return dir;
      };
      const linkedDir = make("linked-dist");
      symlinkSync(outside, join(linkedDir, "dist"), "dir");
      const linkedFile = make("linked-file");
      mkdirSync(join(linkedFile, "dist"));
      symlinkSync(victim, join(linkedFile, "dist", "plugin.js"), "file");
      for (const dir of [linkedDir, linkedFile]) {
        const r = bun([join(out, "bin.mjs"), "build", dir]);
        expect(r.status, dir).toBe(1);
        expect(r.stderr).toContain("never through a link");
        expect(readFileSync(victim, "utf-8")).toBe("keep me");
      }
      expect(
        lstatSync(join(linkedFile, "dist", "plugin.js")).isSymbolicLink()
      ).toBe(true);
    }
  );

  it("review #2: the SDK build replaces only its own dist; another folder must be new or empty", () => {
    const busy = join(root, "busy");
    mkdirSync(busy, { recursive: true });
    writeFileSync(join(busy, "keep.txt"), "mine");
    const r = bun([join(SDK, "scripts", "build.mjs"), busy]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("is not an empty folder");
    expect(readFileSync(join(busy, "keep.txt"), "utf-8")).toBe("mine");
    expect(
      readdirSync(root).filter((f) => f.startsWith(".sdk-build-"))
    ).toEqual([]);
  });

  it("review #10: plugin code typechecks as ES2023 alone (no setTimeout), the tests separately", () => {
    const copy = join(resolve(".test-cli"), `template-types-${process.pid}`);
    rmSync(copy, { recursive: true, force: true });
    try {
      for (const f of ["src", "test", "tsconfig.json", "tsconfig.test.json"]) {
        cpSync(join(TEMPLATE, f), join(copy, f), { recursive: true });
      }
      const installed = join(copy, "node_modules", "@better-tg", "plugin-sdk");
      cpSync(join(SDK, "package.json"), join(installed, "package.json"));
      cpSync(out, join(installed, "dist"), { recursive: true });
      const tsc = (config: string) =>
        spawnSync(resolve("node_modules", ".bin", "tsc"), ["-p", config], {
          cwd: copy,
          encoding: "utf-8",
          env: env(),
          shell: process.platform === "win32",
        });
      writeFileSync(
        join(copy, "test", "vitest-types.ts"),
        'import type {} from "vitest/config";\n'
      );
      for (const config of ["tsconfig.json", "tsconfig.test.json"]) {
        const ok = tsc(config);
        expect(ok.status, config + ok.stdout).toBe(0);
      }
      writeFileSync(
        join(copy, "src", "timer.ts"),
        "export const later = () => setTimeout(() => undefined, 1);\n"
      );
      const bad = tsc("tsconfig.json");
      expect(bad.status).not.toBe(0);
      expect(bad.stdout).toContain("Cannot find name 'setTimeout'");
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  });

  it("the public types reach nothing outside the SDK, and the built code has no comments a plugin would inherit", () => {
    const types = readdirSync(out).filter((f) => f.endsWith(".d.ts"));
    expect(types.sort()).toEqual(
      ["build.d.ts", "cli.d.ts", "host.d.ts", "index.d.ts", "test.d.ts"].sort()
    );
    for (const f of types) {
      expect(readFileSync(join(out, f), "utf-8")).not.toMatch(/\.\.\/\.\.\//);
    }
    expect(existsSync(join(out, "generated", "manifest.d.ts"))).toBe(true);
    expect(
      readFileSync(join(TEMPLATE, "dist", "plugin.js"), "utf-8")
    ).not.toMatch(/^\/\/ /m);
  });

  it("the manifest types are generated from the newest schema", () => {
    const text = readFileSync(
      join(SDK, "src", "generated", "manifest.ts"),
      "utf-8"
    );
    const schema = MANIFEST_SCHEMAS[SPEC_VERSION] as {
      properties: Record<string, unknown>;
      required: string[];
    };
    const body = text.slice(text.indexOf("export interface Manifest {"));
    for (const key of Object.keys(schema.properties)) {
      const name = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      const optional = schema.required.includes(key) ? "" : "?";
      expect(body).toContain(`\n  ${name}${optional}: `);
    }
    expect(text).toContain(`SPEC_VERSION = "${SPEC_VERSION}"`);
  });
});

describe("review #12: the template's CI refuses a commit without dist/plugin.js", () => {
  const workflow = readFileSync(
    join(TEMPLATE, ".github", "workflows", "ci.yml"),
    "utf-8"
  );
  const step =
    /- name: dist\/plugin\.js is committed and matches the source\n(?:\s+#.*\n)*\s+run: \|\n((?:\s{10}.*\n)+)/.exec(
      workflow
    );
  const script = (step?.[1] ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

  const git = (cwd: string, ...args: string[]) => {
    const r = spawnSync(
      "git",
      ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args],
      { cwd, encoding: "utf-8", env: { ...env(), GIT_CONFIG_NOSYSTEM: "1" } }
    );
    expect(r.status, r.stderr).toBe(0);
  };
  const check = (cwd: string) =>
    spawnSync("sh", ["-c", script], {
      cwd,
      encoding: "utf-8",
      env: { ...env(), GIT_CONFIG_NOSYSTEM: "1" },
    });
  const repo = (name: string, commitDist: boolean) => {
    const dir = join(root, `ci-${name}`);
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "README.md"), "x\n");
    git(dir, "init", "-q");
    if (commitDist) {
      writeFileSync(
        join(dir, "dist", "plugin.js"),
        "export const commands = {};\n"
      );
    }
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "init");
    writeFileSync(
      join(dir, "dist", "plugin.js"),
      "export const commands = {};\n"
    );
    return dir;
  };

  it.skipIf(process.platform === "win32")(
    "untracked, changed and clean",
    () => {
      expect(script).toContain(
        "git ls-files --error-unmatch -- dist/plugin.js"
      );
      expect(script).toContain("git diff --exit-code HEAD -- dist/plugin.js");
      const untracked = check(repo("untracked", false));
      expect(untracked.status).not.toBe(0);
      expect(untracked.stdout).toContain("is not in git");
      const changedDir = repo("changed", true);
      writeFileSync(
        join(changedDir, "dist", "plugin.js"),
        "export const commands = { a() {} };\n"
      );
      const changed = check(changedDir);
      expect(changed.status).not.toBe(0);
      expect(changed.stdout).toContain("commit dist/plugin.js");
      const clean = check(repo("clean", true));
      expect(clean.status, clean.stdout + clean.stderr).toBe(0);
    }
  );
});
