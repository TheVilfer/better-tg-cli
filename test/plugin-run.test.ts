import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it, test, vi } from "vitest";

import { cliArgs } from "./cli.js";

const env = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = mkdtempSync(join(tmpdir(), "tg-plugin-run-"));
  Object.assign(process.env, {
    HOME: root,
    USERPROFILE: root,
    APPDATA: join(root, "AppData"),
    TG_NO_UPDATE_CHECK: "1",
    TG_PROFILE: "",
  });
  delete process.env.TG_MOCK;
  return { root };
});

import {
  classifyCall,
  childEnv,
  describeWithCli,
  handleMessage,
  planCall,
  PluginRuns,
  result,
  setKnownCommands,
  commandPaths,
} from "../src/mcp.js";
import type { RunOutput } from "../src/mcp.js";
import { devLog } from "../src/plugins/run.js";

const TONE = resolve("test/fixtures/plugins/tone-of-voice");
const LAB = resolve("test/fixtures/plugins/sandbox-lab");

afterAll(() => rmSync(env.root, { recursive: true, force: true }));

let n = 0;
function newHome(): string {
  const h = join(env.root, `h${++n}`);
  mkdirSync(h);
  return h;
}

interface Run {
  code: number | null;
  out: string;
  err: string;
  json: any;
}
function homeEnv(
  home: string,
  extra: Record<string, string | undefined> = {}
): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    APPDATA: join(home, "AppData"),
    TG_MOCK: join(home, "mock-state.json"),
    TG_NO_UPDATE_CHECK: "1",
    TG_PROFILE: "",
  };
  for (const k of [
    "TG_MOCK_ASK",
    "TG_MOCK_HUMAN",
    "TG_APPROVE",
    "TG_MCP",
    "TG_READ_ONLY",
    "TG_MCP_WORKER",
  ]) {
    delete e[k];
  }
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) {
      delete e[k];
    } else {
      e[k] = v;
    }
  }
  return e;
}
function cli(
  home: string,
  args: string[],
  extra: Record<string, string | undefined> = {},
  input = ""
): Run {
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: "utf-8",
    env: homeEnv(home, extra),
    input,
  });
  let json: unknown;
  try {
    json = JSON.parse(r.stdout.trim().split("\n").at(-1) ?? "");
  } catch {
    json = undefined;
  }
  return { code: r.status, out: r.stdout, err: r.stderr, json };
}
const install = (home: string, dir: string) => {
  const r = cli(home, ["plugin", "install", dir, "--json"], {
    TG_MOCK_HUMAN: "yes",
  });
  expect(r.json, r.err).toMatchObject({ ok: true });
  return r.json as { installId: string; revision: string };
};
const profileDir = (home: string, name: string) =>
  process.platform === "win32"
    ? join(home, "AppData", name)
    : join(home, ".config", name);
const audit = (home: string) =>
  readFileSync(join(profileDir(home, "tg-mock"), "audit.jsonl"), "utf-8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
const lab = (
  home: string,
  args: string[],
  extra: Record<string, string | undefined> = {},
  input = ""
) =>
  cli(home, ["plugin", "run", "sandbox-lab", ...args, "--json"], extra, input);
const probe = (
  home: string,
  op: string,
  args: unknown[] = [],
  extra: Record<string, string | undefined> = {}
) => lab(home, ["probe", "--input", JSON.stringify({ op, args })], extra);

const paths = (() => {
  const help = spawnSync(process.execPath, [...cliArgs(), "help-all"], {
    encoding: "utf-8",
    env: homeEnv(env.root),
  }).stdout;
  const names = help
    .split("\n")
    .filter((l) => /^[a-z]/.test(l) && l.includes(" — "))
    .map((l) =>
      l
        .slice(0, l.indexOf(" — "))
        .split(" ")
        .filter(
          (w, i, all) => !all.slice(0, i + 1).some((x) => /^[<[]/.test(x))
        )
        .join(" ")
    );
  return [
    ...new Set(
      names.flatMap((p) =>
        p.split(" ").map((_, i, w) => w.slice(0, i + 1).join(" "))
      )
    ),
  ];
})();

interface Reply {
  result: {
    content: { text: string }[];
    isError?: boolean;
    structuredContent?: Record<string, any>;
  };
}
const call = (name: string, args: Record<string, unknown>, id = 1) => ({
  jsonrpc: "2.0",
  id,
  method: "tools/call",
  params: { name, arguments: args },
});

async function asServer<T>(
  home: string,
  extra: Record<string, string>,
  fn: (
    run: (
      plan: Parameters<typeof childEnv>[0]
    ) => Promise<ReturnType<typeof result>>
  ) => Promise<T>
): Promise<T> {
  setKnownCommands(paths);
  const vars: Record<string, string> = {
    HOME: home,
    USERPROFILE: home,
    APPDATA: join(home, "AppData"),
    TG_MOCK: join(home, "mock-state.json"),
    TG_PROFILE: "",
    ...extra,
  };
  const saved = Object.fromEntries(
    Object.keys(vars).map((k) => [k, process.env[k]])
  );
  Object.assign(process.env, vars);
  try {
    return await fn(async (plan) => {
      const r = spawnSync(process.execPath, [...cliArgs(), ...plan.argv], {
        encoding: "utf-8",
        input: plan.stdin ?? "",
        env: childEnv(plan),
      });
      return result(plan, {
        code: r.status,
        timedOut: false,
        out: r.stdout,
        err: r.stderr,
      } as RunOutput);
    });
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  }
}

describe(
  "plugin run: the reference Tone of Voice collect",
  { timeout: 120_000 },
  () => {
    it("pages with cursor and limit = remaining until done; the last page keeps cursor: null (shell and MCP)", async () => {
      const h = newHome();
      install(h, TONE);
      const collected: string[] = [];
      let input: Record<string, unknown> = {
        limit: 4,
        types: ["private", "group"],
      };
      let last: Run | undefined;
      for (let i = 0; i < 10; i++) {
        last = cli(h, [
          "plugin",
          "run",
          "tone-of-voice",
          "collect",
          "--input",
          JSON.stringify(input),
          "--json",
        ]);
        expect(last.code, last.out + last.err).toBe(0);
        const { data, proposals } = last.json;
        expect(proposals).toEqual([]);
        collected.push(...data.messages.map((m: { text: string }) => m.text));
        if (data.done || data.remaining === 0) {
          if (data.done) {
            break;
          }
          input = { limit: 4, cursor: data.cursor };
          continue;
        }
        input = { limit: data.remaining, cursor: data.cursor };
      }
      expect(last!.json.data.done).toBe(true);
      expect(last!.out).toContain('"cursor":null');
      expect(new Set(collected).size).toBe(collected.length);
      expect(collected).toContain("Note to self: renew the domain");
      await asServer(h, {}, async (run) => {
        const r = (await handleMessage(
          call("telegram_read", {
            args: [
              "plugin",
              "run",
              "tone-of-voice",
              "collect",
              "--input",
              JSON.stringify({ limit: 2000, types: ["private", "group"] }),
              "--json",
            ],
          }),
          run
        )) as Reply;
        expect(r.result.isError).toBeUndefined();
        expect(r.result.content[0].text).toContain('"cursor":null');
        expect(JSON.parse(r.result.content[0].text).data.messages).toHaveLength(
          collected.length
        );
      });
      const entry = audit(h).findLast((e) => e.command === "plugin run");
      expect(entry).toMatchObject({
        target: "tone-of-voice",
        plugin: { command: "collect", apis: ["messages.mine"], proposals: [] },
        result: { success: true },
      });
      expect(JSON.stringify(audit(h))).not.toContain("renew the domain");
      expect(JSON.stringify(audit(h))).not.toContain('"limit"');
    });

    it("a FLOOD_WAIT the command passes on is an error with retryAfterSeconds, the cursor and the partial page", () => {
      const h = newHome();
      install(h, TONE);
      const r = cli(
        h,
        [
          "plugin",
          "run",
          "tone-of-voice",
          "collect",
          "--input",
          '{"limit":50,"types":["private","group"]}',
          "--json",
        ],
        { TG_MOCK_FLOOD_HISTORY: "2:9" }
      );
      expect(r.code).toBe(1);
      expect(r.json.error).toMatchObject({
        code: "flood_wait",
        retryAfterSeconds: 9,
        cursor: expect.any(String),
        partial: { count: expect.any(Number) },
      });
      const rest = cli(h, [
        "plugin",
        "run",
        "tone-of-voice",
        "collect",
        "--input",
        JSON.stringify({ limit: 50, cursor: r.json.error.cursor }),
        "--json",
      ]);
      const all = cli(h, [
        "plugin",
        "run",
        "tone-of-voice",
        "collect",
        "--input",
        '{"limit":50,"types":["private","group"]}',
        "--json",
      ]);
      const got = [
        ...r.json.error.partial.messages,
        ...rest.json.data.messages,
      ].map((m: { text: string }) => m.text);
      expect(got).toEqual(
        all.json.data.messages.map((m: { text: string }) => m.text)
      );
    });

    it("an invalid_cursor the command passes on keeps its code and the host's own message", () => {
      const h = newHome();
      install(h, TONE);
      const collect = (input: unknown) =>
        cli(h, [
          "plugin",
          "run",
          "tone-of-voice",
          "collect",
          "--input",
          JSON.stringify(input),
          "--json",
        ]);
      const unknown = collect({ limit: 5, cursor: "AAAAAAAAAAAAAAAAAAAAAA" });
      expect(unknown.code).toBe(1);
      expect(unknown.json.error).toMatchObject({
        code: "invalid_cursor",
        message:
          "cursor is unknown or expired (cursors last 24 hours); start again without one",
      });
      expect(collect({ limit: 5, cursor: "x" }).json.error).toMatchObject({
        code: "invalid_cursor",
        message: "cursor is not one this host returned",
      });
    });
  }
);

describe(
  "plugin run: input, output, target, proposals",
  { timeout: 120_000 },
  () => {
    const h = newHome();
    let labInstall: { installId: string; revision: string };

    it("installs the lab", () => {
      labInstall = install(h, LAB);
    });

    it("an invalid_cursor or flood_wait the plugin throws itself is a plugin_error; the host's record wins", () => {
      for (const code of ["invalid_cursor", "flood_wait"]) {
        const forged = probe(h, "forge", [code, "made up"]);
        expect(forged.code).toBe(1);
        expect(forged.json.error.code).toBe("plugin_error");
      }
      const relabelled = probe(h, "mineThenForge", [
        { cursor: "AAAAAAAAAAAAAAAAAAAAAA" },
      ]);
      expect(relabelled.json.error).toEqual({
        code: "invalid_cursor",
        message:
          "cursor is unknown or expired (cursors last 24 hours); start again without one",
        hint: "Run the command again without the cursor to start over.",
      });
    });

    it("input is checked by the schema (exit 2) before anything runs; --input - reads stdin", () => {
      const bad = lab(h, ["probe", "--input", '{"op":1}']);
      expect(bad.code).toBe(2);
      expect(bad.json.error).toMatchObject({
        code: "invalid_argument",
        issues: [{ path: "/op" }],
      });
      expect(lab(h, ["probe", "--input", "not json"]).code).toBe(2);
      const piped = lab(h, ["probe", "--input", "-"], {}, '{"op":"me"}');
      expect(piped.json.data).toEqual({
        op: "me",
        result: { id: "1000", name: "Mock Owner", username: "mock_owner" },
      });
      expect(lab(h, ["nope"]).json.error).toMatchObject({
        code: "invalid_argument",
      });
    });

    it("output is checked by the schema; null survives", () => {
      const ok = lab(h, ["strict", "--input", '{"value":{"n":1,"next":null}}']);
      expect(ok.out).toContain('{"data":{"n":1,"next":null},"proposals":[]}');
      const bad = lab(h, [
        "strict",
        "--input",
        '{"value":{"n":"one","next":null}}',
      ]);
      expect(bad.code).toBe(1);
      expect(bad.json.error).toMatchObject({
        code: "plugin_error",
        issues: [{ path: "/n" }],
      });
    });

    it("limits and escapes surface as plugin_limit / plugin_error with exit 1", () => {
      expect(probe(h, "burst").json.error).toMatchObject({
        code: "plugin_limit",
        limit: "concurrentCalls",
      });
      expect(probe(h, "many").json.error).toMatchObject({
        code: "plugin_limit",
        limit: "hostCalls",
      });
      expect(probe(h, "bigArgs").json.error).toMatchObject({
        code: "plugin_limit",
        limit: "callBytes",
      });
      expect(probe(h, "hugeOutput").json.error).toMatchObject({
        code: "plugin_limit",
        limit: "output",
      });
      expect(probe(h, "big").json.error).toMatchObject({
        code: "plugin_limit",
        limit: "memory",
      });
      expect(probe(h, "never").json.error).toMatchObject({
        code: "plugin_error",
      });
      expect(probe(h, "globals").json.data.result).toMatchObject({
        require: "undefined",
        process: "undefined",
        bridge: "undefined",
        viaFunction: "undefined",
      });
      expect(probe(h, "granted").json.data.result).toEqual({
        set: "undefined",
        propose: "undefined",
        log: "undefined",
      });
      expect(probe(h, "proto").code).toBe(0);
    });

    it("--target: one message, or nothing without it; a plugin without the permission refuses it", () => {
      const t = lab(h, [
        "probe",
        "--input",
        '{"op":"target"}',
        "--target",
        "1001:5",
      ]);
      expect(t.json.data.result).toMatchObject({
        chatId: "1001",
        message: { id: 5 },
      });
      expect(probe(h, "target").json.error.message).toMatch(/no --target/);
      expect(
        lab(h, ["probe", "--input", '{"op":"me"}', "--target", "Alice:5"]).code
      ).toBe(2);
      expect(lab(h, ["probe", "--input", '{"op":"me"}', "--thread"]).code).toBe(
        2
      );
      install(h, TONE);
      expect(
        cli(h, [
          "plugin",
          "run",
          "tone-of-voice",
          "collect",
          "--input",
          '{"limit":1}',
          "--target",
          "1001:5",
          "--json",
        ]).code
      ).toBe(2);
    });

    it('proposals: only the host writes the field; a plugin\'s own "proposals" stay inside data', () => {
      const r = lab(h, [
        "propose",
        "--input",
        JSON.stringify({
          actions: [
            { type: "reply", chat: "1001", msgId: 5, text: "On my way" },
            { type: "react", chat: "1001", msgId: 5, emoji: "👍" },
          ],
        }),
      ]);
      expect(r.code, r.out).toBe(0);
      expect(r.json.proposals).toEqual([
        {
          id: "p1",
          type: "reply",
          confirm: true,
          stdin: "On my way",
          argv: ["reply", "1001", "5", "-"],
          summary: 'Reply in 1001 to message 5: "On my way"',
        },
        {
          id: "p2",
          type: "react",
          confirm: true,
          argv: ["react", "1001", "5", "👍"],
          summary: "React in 1001 to message 5 with 👍",
        },
      ]);
      expect(r.json.data.proposals[0]).toMatchObject({ id: "forged" });
      expect(r.json.data.ids).toEqual(["p1", "p2"]);
      const forged = lab(h, [
        "propose",
        "--input",
        JSON.stringify({
          actions: [
            {
              type: "send",
              chat: "1001",
              text: "x",
              argv: ["delete", "1001", "5"],
            },
          ],
        }),
      ]);
      expect(forged.code).toBe(1);
      expect(forged.json.error.code).toBe("plugin_error");
      expect(
        audit(h).findLast(
          (e) =>
            e.command === "plugin run" &&
            e.plugin.command === "propose" &&
            e.result.success
        ).plugin.proposals
      ).toEqual(["reply", "react"]);
    });

    it("effects storage: a local write in the shell, refused on the MCP read tool (TG_READ_ONLY) with nothing saved", () => {
      expect(
        lab(h, ["save", "--input", '{"value":"first"}']).json.data
      ).toEqual({ saved: 5 });
      expect(probe(h, "get").json.data.result).toBe("first");
      const refused = lab(h, ["save", "--input", '{"value":"second"}'], {
        TG_MCP: "1",
        TG_READ_ONLY: "1",
        TG_PLUGIN_EXPECT: `${labInstall.installId} ${labInstall.revision} ${labInstall.installId}`,
      });
      expect(refused.code).toBe(1);
      expect(refused.json.error.code).toBe("write_on_read_tool");
      expect(probe(h, "get").json.data.result).toBe("first");
      expect(
        cli(h, ["plugin", "data", "get", "sandbox-lab", "notes"]).out
      ).toBe("first\n");
    });
  }
);

describe(
  "plugin run over MCP: classification, approval, snapshot binding",
  { timeout: 120_000 },
  () => {
    it("classified per call from the installed manifest: no effects → read; storage/actions → write; dev never", async () => {
      const h = newHome();
      install(h, LAB);
      await asServer(h, {}, async (run) => {
        const cls = (args: string[]) => classifyCall(args);
        expect(
          cls([
            "plugin",
            "run",
            "sandbox-lab",
            "probe",
            "--input",
            '{"op":"me"}',
          ])
        ).toMatchObject({ group: "read" });
        expect(
          cls(["plugin", "run", "--input", "{}", "sandbox-lab", "save"])
        ).toMatchObject({ group: "write" });
        expect(
          cls([
            "plugin",
            "run",
            "sandbox-lab",
            "propose",
            "--target",
            "1:2",
            "--json",
          ])
        ).toMatchObject({ group: "write" });
        expect(cls(["plugin", "run", "missing", "x"])).toMatchObject({
          group: "read",
        });
        expect(cls(["plugin", "dev", LAB, "probe", "--mock"])).toMatchObject({
          group: "never",
        });
        expect(
          planCall("telegram_read", {
            args: [
              "plugin",
              "run",
              "sandbox-lab",
              "save",
              "--input",
              '{"value":"x"}',
            ],
          })
        ).toMatch(/use telegram_write/);
        expect(
          planCall("telegram_write", {
            args: [
              "plugin",
              "run",
              "sandbox-lab",
              "probe",
              "--input",
              '{"op":"me"}',
            ],
          })
        ).toMatch(/use telegram_read/);
        const missing = (await handleMessage(
          call("telegram_read", {
            args: ["plugin", "run", "missing", "x", "--json"],
          }),
          run
        )) as Reply;
        expect(missing.result.isError).toBe(true);
        expect(missing.result.content[0].text).toMatch(
          /plugin_not_found|No plugin named/
        );
        const ro = (await handleMessage(
          call("telegram_write", {
            args: [
              "plugin",
              "run",
              "sandbox-lab",
              "save",
              "--input",
              '{"value":"x"}',
            ],
          }),
          run,
          { readOnly: true }
        )) as Reply;
        expect(ro.result.content[0].text).toMatch(/read-only/);
        const saved = (await handleMessage(
          call("telegram_write", {
            args: [
              "plugin",
              "run",
              "sandbox-lab",
              "save",
              "--input",
              '{"value":"Your code: 12345"}',
              "--json",
            ],
          }),
          run
        )) as Reply;
        expect(
          saved.result.isError,
          saved.result.content[0].text
        ).toBeUndefined();
        const got = (await handleMessage(
          call("telegram_read", {
            args: [
              "plugin",
              "run",
              "sandbox-lab",
              "probe",
              "--input",
              '{"op":"get"}',
              "--json",
            ],
          }),
          run
        )) as Reply;
        expect(got.result.content[0].text).toContain("[login code hidden]");
        expect(got.result.content[0].text).not.toContain("12345");
      });
    });

    it('mode "ask": the approval shows installation, effects and input; a snapshot swapped in between is not run', async () => {
      const h = newHome();
      const dir = join(h, "lab");
      cpSync(LAB, dir, { recursive: true });
      install(h, dir);
      await asServer(h, { TG_MOCK_ASK: "1" }, async (run) => {
        const args = [
          "plugin",
          "run",
          "sandbox-lab",
          "save",
          "--input",
          "-",
          "--json",
        ];
        const first = (await handleMessage(
          call("telegram_write", { args, stdin: '{"value":"approved"}' }),
          run
        )) as Reply;
        const s = first.result.structuredContent!;
        expect(s.status).toBe("approval_required");
        expect(s.action.description).toMatch(
          /Run a plugin command[\s\S]*Plugin: sandbox-lab[\s\S]*Command: save[\s\S]*Installation: [0-9a-f-]{36}[\s\S]*Effects: storage[\s\S]*Input: \{"value":"approved"\}/
        );
        const ok = (await handleMessage(
          call("telegram_write", {
            args,
            stdin: '{"value":"approved"}',
            approval: s.code,
          }),
          run
        )) as Reply;
        expect(ok.result.content[0].text).toContain('"saved":8');
        const again = (
          (await handleMessage(
            call("telegram_write", { args, stdin: '{"value":"swapped"}' }),
            run
          )) as Reply
        ).result.structuredContent!;
        expect(again.status).toBe("approval_required");
        expect(
          cli(h, ["plugin", "remove", "sandbox-lab", "--keep-data", "--json"], {
            TG_MOCK_HUMAN: "yes",
          }).json
        ).toMatchObject({ ok: true });
        writeFileSync(
          join(dir, "code", "lab.js"),
          `${readFileSync(join(dir, "code", "lab.js"), "utf-8")}\n// changed\n`
        );
        install(h, dir);
        const used = (await handleMessage(
          call("telegram_write", {
            args,
            stdin: '{"value":"swapped"}',
            approval: again.code,
          }),
          run
        )) as Reply;
        expect(used.result.content[0].text).not.toContain('"saved"');
        expect(used.result.structuredContent?.status).toBe("approval_required");
        const installation = (d: string) =>
          /Installation: ([0-9a-f-]{36})/.exec(d)?.[1];
        expect(
          installation(used.result.structuredContent?.action.description)
        ).not.toBe(installation(again.action.description));
      });
      expect(
        cli(h, ["plugin", "data", "list", "sandbox-lab", "--json"]).json.items
      ).toEqual([]);
      expect(
        audit(h)
          .filter((e) => e.command === "plugin run")
          .map((e) => e.result)
      ).toEqual([{ success: true }]);
    });
  }
);

describe(
  "plugin run: review fixes for the account (#10) and the output limit (#12)",
  { timeout: 120_000 },
  () => {
    it("#10 a slow account lookup does not hold up a command that never touches storage", () => {
      const h = newHome();
      install(h, LAB);
      const t = Date.now();
      const r = probe(h, "awaitZero", [], { TG_MOCK_SLOW_ME: "20000" });
      expect(r.code, r.err).toBe(0);
      expect(r.json.data.result).toBe("ok");
      expect(Date.now() - t).toBeLessThan(15_000);
    });

    it("#10 fetching the account counts against the run deadline", async () => {
      const { runPluginCommand, runDeps, memoryStorage, memoryCursors } =
        await import("../src/plugins/run.js");
      const manifest = JSON.parse(
        readFileSync(join(LAB, "tg-plugin.json"), "utf-8")
      );
      const command = manifest.commands.find(
        (c: { name: string }) => c.name === "probe"
      );
      const code = readFileSync(join(LAB, "code", "lab.js"), "utf-8");
      const never = () => new Promise<string>(() => {});
      runDeps.limits = { timeoutMs: 500 };
      try {
        const t = Date.now();
        await expect(
          runPluginCommand({
            manifest,
            command,
            code,
            filename: "code/lab.js",
            input: { op: "get" },
            client: never as never,
            account: never,
            storage: async () => {
              await never();
              return memoryStorage(manifest);
            },
            cursors: memoryCursors(),
            installId: "x",
            mcp: false,
          })
        ).rejects.toMatchObject({ code: "plugin_limit" });
        expect(Date.now() - t).toBeLessThan(3000);
      } finally {
        runDeps.limits = undefined;
      }
    });

    it("#12 the printed output is the exact checked string, with or without --json", () => {
      const h = newHome();
      install(h, LAB);
      for (const json of [true, false]) {
        const r = cli(h, [
          "plugin",
          "run",
          "sandbox-lab",
          "probe",
          "--input",
          '{"op":"zeros"}',
          ...(json ? ["--json"] : []),
        ]);
        expect(r.code, r.err).toBe(0);
        const line = r.out.trimEnd();
        expect(line).not.toContain("\n");
        expect(line.length).toBeLessThanOrEqual(60_000);
        expect(JSON.parse(line).data.result).toHaveLength(20_000);
      }
    });
  }
);

describe(
  "plugin run over MCP: the installation the call was classified by (#5)",
  { timeout: 120_000 },
  () => {
    it("reinstalled while the approval dialog is open, with effects [] now: refused, the new code never runs", async () => {
      const h = newHome();
      const dir = join(h, "lab");
      cpSync(LAB, dir, { recursive: true });
      const first = install(h, dir);
      await asServer(h, { TG_MOCK_ASK: "1" }, async (run) => {
        const spawnRun = async (
          plan: Parameters<typeof childEnv>[0]
        ): Promise<RunOutput> => {
          const r = spawnSync(process.execPath, [...cliArgs(), ...plan.argv], {
            encoding: "utf-8",
            input: plan.stdin ?? "",
            env: childEnv(plan),
          });
          return {
            code: r.status,
            timedOut: false,
            out: r.stdout,
            err: r.stderr,
          };
        };
        const plan = planCall("telegram_write", {
          args: [
            "plugin",
            "run",
            "sandbox-lab",
            "save",
            "--input",
            '{"value":"x"}',
            "--json",
          ],
        });
        expect(plan).toMatchObject({
          plugin: { installId: first.installId, revision: first.revision },
        });
        expect(
          childEnv(plan as Parameters<typeof childEnv>[0]).TG_PLUGIN_EXPECT
        ).toBe(`${first.installId} ${first.revision} ${first.installId}`);
        let asked = 0;
        const elicit = async () => {
          asked++;
          expect(
            cli(h, ["plugin", "remove", "sandbox-lab", "--json"], {
              TG_MOCK_HUMAN: "yes",
            }).json
          ).toMatchObject({ ok: true });
          const manifest = JSON.parse(
            readFileSync(join(dir, "tg-plugin.json"), "utf-8")
          );
          manifest.commands.find(
            (c: { name: string }) => c.name === "save"
          ).effects = [];
          writeFileSync(
            join(dir, "tg-plugin.json"),
            JSON.stringify(manifest, null, 2)
          );
          writeFileSync(
            join(dir, "code", "lab.js"),
            readFileSync(join(dir, "code", "lab.js"), "utf-8").replace(
              "await host.storage.set('notes', value);",
              "return { saved: -424242 };"
            )
          );
          install(h, dir);
          return true;
        };
        const r = (await handleMessage(
          call("telegram_write", {
            args: [
              "plugin",
              "run",
              "sandbox-lab",
              "save",
              "--input",
              '{"value":"x"}',
              "--json",
            ],
          }),
          run,
          {
            elicit,
            describe: (p) => describeWithCli(p, spawnRun),
          }
        )) as Reply;
        expect(asked).toBe(1);
        expect(r.result.isError).toBe(true);
        expect(r.result.content[0].text).toContain("plugin_changed");
        expect(r.result.content[0].text).not.toContain("-424242");
      });
      expect(
        cli(h, ["plugin", "data", "list", "sandbox-lab", "--json"]).json.items
      ).toEqual([]);
      expect(
        audit(h).filter((e) => e.command === "plugin run" && e.result.success)
      ).toEqual([]);
      process.env.TG_PLUGIN_EXPECT = "forged";
      try {
        expect(
          childEnv({ argv: ["plugin", "list"], readOnly: true })
            .TG_PLUGIN_EXPECT
        ).toBeUndefined();
      } finally {
        delete process.env.TG_PLUGIN_EXPECT;
      }
    });
  }
);

describe("PluginRuns: what a cancellation reaches", () => {
  it("a waiting call is skipped; a cancel for an id that is not waiting or running is forgotten", () => {
    const runs = new PluginRuns();
    runs.arrived(5);
    runs.cancel(5);
    expect(runs.begin(5).aborted).toBe(true);
    runs.end(5);
    runs.settled(5);
    runs.cancel(5);
    runs.cancel("never");
    runs.arrived(5);
    expect(runs.begin(5).aborted).toBe(false);
    runs.end(5);
    runs.settled(5);
    runs.arrived("never");
    expect(runs.begin("never").aborted).toBe(false);
  });

  it("a running call is aborted; after the channel closed nothing starts", () => {
    const runs = new PluginRuns();
    runs.arrived(1);
    const signal = runs.begin(1);
    runs.cancel(1);
    expect(signal.aborted).toBe(true);
    runs.cancelAll();
    runs.arrived(2);
    expect(runs.begin(2).aborted).toBe(true);
  });
});

describe("plugin run over MCP: cancellation", { timeout: 120_000 }, () => {
  function server(home: string, extra: Record<string, string> = {}) {
    const p = spawn(process.execPath, [...cliArgs(), "mcp"], {
      env: homeEnv(home, extra),
      stdio: ["pipe", "pipe", "pipe"],
    });
    const replies = new Map<unknown, (m: unknown) => void>();
    const got = new Set<unknown>();
    let buf = "";
    p.stdout.on("data", (d) => {
      buf += d;
      for (let i; (i = buf.indexOf("\n")) >= 0;) {
        const m = JSON.parse(buf.slice(0, i)) as { id?: unknown };
        buf = buf.slice(i + 1);
        got.add(m.id);
        replies.get(m.id)?.(m);
      }
    });
    const send = (m: object) => p.stdin.write(`${JSON.stringify(m)}\n`);
    const request = (id: number, m: object) =>
      new Promise<any>((r) => {
        replies.set(id, r);
        send({ jsonrpc: "2.0", id, ...m });
      });
    const exited = new Promise<number | null>((r) =>
      p.on("exit", (code) => r(code))
    );
    return { p, send, request, got, exited };
  }

  for (const [label, extra] of [
    ["child process", {}],
    ["worker thread", { TG_MCP_WORKER: "1" }],
  ] as const) {
    it(`${label}: a running and a queued run are cancelled past the queue, get no reply, and the next call runs`, async () => {
      const h = newHome();
      install(h, LAB);
      const s = server(h, extra);
      await s.request(0, {
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {} },
      });
      const started = Date.now();
      void s.request(1, {
        method: "tools/call",
        params: {
          name: "telegram_read",
          arguments: {
            args: [
              "plugin",
              "run",
              "sandbox-lab",
              "probe",
              "--input",
              '{"op":"spin"}',
              "--json",
            ],
          },
        },
      });
      void s.request(2, {
        method: "tools/call",
        params: {
          name: "telegram_read",
          arguments: {
            args: [
              "plugin",
              "run",
              "sandbox-lab",
              "probe",
              "--input",
              '{"op":"me"}',
              "--json",
            ],
          },
        },
      });
      await new Promise((r) => setTimeout(r, 1500));
      s.send({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: 1, reason: "user" },
      });
      s.send({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: 2 },
      });
      const next = await s.request(3, {
        method: "tools/call",
        params: {
          name: "telegram_read",
          arguments: { args: ["plugin", "list", "--json"] },
        },
      });
      expect(next.result.isError).toBeUndefined();
      expect(Date.now() - started).toBeLessThan(20_000);
      expect(s.got.has(1)).toBe(false);
      expect(s.got.has(2)).toBe(false);
      s.p.stdin.end();
      await s.exited;
      if (label === "worker thread") {
        expect(
          audit(h).findLast((e) => e.command === "plugin run")
        ).toMatchObject({ result: { success: false, error: "cancelled" } });
      }
    });
  }

  async function sentDialog(
    s: { got: Set<unknown> },
    ms = 30_000
  ): Promise<string> {
    const until = Date.now() + ms;
    for (;;) {
      const id = [...s.got].find(
        (x) => typeof x === "string" && /^tg-elicit-[0-9a-f]{16}-1$/.test(x)
      );
      if (id) {
        return id as string;
      }
      if (Date.now() > until) {
        throw new Error("the server never sent a dialog");
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  const saveCall = {
    method: "tools/call",
    params: {
      name: "telegram_write",
      arguments: {
        args: [
          "plugin",
          "run",
          "sandbox-lab",
          "save",
          "--input",
          '{"value":"never"}',
          "--json",
        ],
      },
    },
  };

  it("#7 cancelled while its approval dialog is open: no reply, nothing saved, the next call is answered at once", async () => {
    const h = newHome();
    install(h, LAB);
    const s = server(h, { TG_MOCK_ASK: "1" });
    await s.request(0, {
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: { elicitation: {} },
      },
    });
    void s.request(1, saveCall);
    const dialog = await sentDialog(s);
    const t = Date.now();
    s.send({
      jsonrpc: "2.0",
      method: "notifications/cancelled",
      params: { requestId: 1 },
    });
    const next = await s.request(2, {
      method: "tools/call",
      params: {
        name: "telegram_read",
        arguments: { args: ["plugin", "list", "--json"] },
      },
    });
    expect(next.result.isError).toBeUndefined();
    expect(Date.now() - t).toBeLessThan(10_000);
    s.send({
      jsonrpc: "2.0",
      id: dialog,
      result: { action: "accept", content: { approve: true } },
    });
    await new Promise((r) => setTimeout(r, 500));
    expect(s.got.has(1)).toBe(false);
    s.p.stdin.end();
    await s.exited;
    expect(
      cli(h, ["plugin", "data", "list", "sandbox-lab", "--json"]).json.items
    ).toEqual([]);
  });

  it("#7 stdio closed while an approval dialog is open: the server exits promptly", async () => {
    const h = newHome();
    install(h, LAB);
    const s = server(h, { TG_MOCK_ASK: "1" });
    await s.request(0, {
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: { elicitation: {} },
      },
    });
    void s.request(1, saveCall);
    await sentDialog(s);
    const t = Date.now();
    s.p.stdin.end();
    await s.exited;
    expect(Date.now() - t).toBeLessThan(10_000);
    expect(s.got.has(1)).toBe(false);
  });

  it("closing stdio cancels a run in progress", async () => {
    const h = newHome();
    install(h, LAB);
    const s = server(h);
    await s.request(0, {
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {} },
    });
    void s.request(1, {
      method: "tools/call",
      params: {
        name: "telegram_read",
        arguments: {
          args: [
            "plugin",
            "run",
            "sandbox-lab",
            "probe",
            "--input",
            '{"op":"spin"}',
            "--json",
          ],
        },
      },
    });
    await new Promise((r) => setTimeout(r, 1500));
    const t = Date.now();
    s.p.stdin.end();
    await s.exited;
    expect(Date.now() - t).toBeLessThan(15_000);
    expect(s.got.has(1)).toBe(false);
  });
});

describe("plugin dev --mock", { timeout: 60_000 }, () => {
  it("runs a folder against the mock account in memory; host.log goes to its own file only", () => {
    const h = newHome();
    const r = cli(
      h,
      [
        "plugin",
        "dev",
        LAB,
        "probe",
        "--mock",
        "--input",
        '{"op":"granted"}',
        "--json",
      ],
      { TG_MOCK: undefined }
    );
    expect(r.code, r.err).toBe(0);
    expect(r.json.data.result.log).toBe("function");
    expect(
      cli(
        h,
        ["plugin", "dev", LAB, "probe", "--input", '{"op":"me"}', "--json"],
        { TG_MOCK: undefined }
      ).code
    ).toBe(2);
    expect(
      cli(
        h,
        [
          "plugin",
          "dev",
          LAB,
          "probe",
          "--mock",
          "--input",
          '{"op":"me"}',
          "--json",
        ],
        { TG_MCP: "1" }
      ).json.error.code
    ).toBe("not_available");
    const logged = cli(
      h,
      [
        "plugin",
        "dev",
        LAB,
        "probe",
        "--mock",
        "--input",
        '{"op":"log"}',
        "--json",
      ],
      { TG_MOCK: undefined }
    );
    expect(logged.json.data.result).toBe("logged");
    expect(logged.out + logged.err).not.toContain("debug line");
    expect(readFileSync(devLog("sandbox-lab").path, "utf-8")).toMatch(
      /debug line \{"n":1\}\n$/
    );
    expect(existsSync(profileDir(h, "tg"))).toBe(false);
    expect(existsSync(profileDir(h, "tg-mock"))).toBe(false);
  });
});

test("the paths helper sees plugin run and dev", () => {
  expect(paths).toEqual(expect.arrayContaining(["plugin run", "plugin dev"]));
  expect(commandPaths).toBeTypeOf("function");
});
