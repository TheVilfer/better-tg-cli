import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
}

const root = mkdtempSync(join(tmpdir(), "tg-plugin-sdk-"));
const out = join(resolve(".test-cli"), `sdk-${process.pid}`);
let sdk: SdkTest;

function bun(args: string[], cwd = process.cwd()) {
  return spawnSync("bun", args, {
    cwd,
    encoding: "utf-8",
    shell: process.platform === "win32",
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
  ["template: define", TEMPLATE, "define", { word: "plugin" }],
  ["template: define, 404", TEMPLATE, "define", { word: "zzz" }],
  ["template: define without a fixture", TEMPLATE, "define", { word: "other" }],
  [
    "flood_wait with the cursor to go on from",
    TEMPLATE,
    "summary",
    { limit: 100 },
    undefined,
    { TG_MOCK_FLOOD_HISTORY: "0:9" },
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

  it("a bundle that still imports a module, or exports no commands, is refused", () => {
    const dir = join(root, "builds");
    mkdirSync(join(dir, "src"), { recursive: true });
    const write = (name: string, text: string) =>
      spawnSync(process.execPath, [
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(join(dir, "src", name))}, ${JSON.stringify(text)})`,
      ]);
    write(
      "fs.ts",
      'import { readFileSync } from "node:fs";\nexport const commands = { a: () => readFileSync };\n'
    );
    write("none.ts", "export const other = 1;\n");
    const fsBuild = bun([
      join(out, "bin.mjs"),
      "build",
      dir,
      "--entry",
      "src/fs.ts",
    ]);
    expect(fsBuild.status).toBe(1);
    expect(fsBuild.stderr).toContain("imports node:fs");
    const none = bun([
      join(out, "bin.mjs"),
      "build",
      dir,
      "--entry",
      "src/none.ts",
    ]);
    expect(none.status).toBe(1);
    expect(none.stderr).toContain("does not export `commands`");
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
