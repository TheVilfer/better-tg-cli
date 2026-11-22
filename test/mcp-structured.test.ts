import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TOOLS,
  TOOL_OUTPUT_SCHEMA,
  cliResult,
  handleMessage,
  result,
  setKnownCommands,
  withOutput,
} from "../src/mcp.js";
import { useSpawnTimeout } from "./helpers/spawn-timeout.js";

useSpawnTimeout();

const CLI = "dist/telegram.mjs";

interface ToolReply {
  result: {
    content: { type: string; text: string }[];
    isError?: boolean;
    structuredContent?: Record<string, any>;
  };
}

const TYPES: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === "string",
  integer: (v) => Number.isInteger(v),
};

function conforms(sc: Record<string, unknown> | undefined): string[] {
  if (!sc || typeof sc !== "object") {
    return ["no structuredContent"];
  }
  const problems = TOOL_OUTPUT_SCHEMA.required
    .filter((k) => !(k in sc))
    .map((k) => `missing ${k}`);
  for (const [key, prop] of Object.entries(TOOL_OUTPUT_SCHEMA.properties)) {
    if (key in sc && !TYPES[prop.type](sc[key])) {
      problems.push(`${key} is not ${prop.type}`);
    }
  }
  return problems;
}

const call = (id: number, name: string, args: Record<string, unknown>) => ({
  jsonrpc: "2.0" as const,
  id,
  method: "tools/call",
  params: { name, arguments: args },
});

const textOf = (r: ToolReply) => r.result.content.map((c) => c.text).join("\n");

beforeAll(() => {
  setKnownCommands(["whoami", "read", "send", "help-all", "inbox"]);
});

describe("structuredContent carries the output", () => {
  it("every tool declares the same outputSchema with output required", () => {
    for (const tool of TOOLS) {
      expect(tool.outputSchema).toBe(TOOL_OUTPUT_SCHEMA);
    }
    expect(TOOL_OUTPUT_SCHEMA.required).toEqual(["output"]);
  });

  it("withOutput keeps the existing keys and adds the exact content text", () => {
    const shapes = [
      cliResult(0, false, "Logged in as: Mock Owner\n", ""),
      cliResult(1, false, "", "Chat not found"),
      cliResult(0, false, '{"ok":true}\n', "warn"),
      cliResult(null, true, "partial", ""),
      cliResult(3, false, "", "Approval needed"),
      { content: [{ type: "text" as const, text: "a" }] },
    ];
    for (const r of shapes) {
      const w = withOutput(r);
      expect(w.content).toEqual(r.content);
      expect(w.isError).toBe(r.isError);
      expect(w.structuredContent).toEqual({
        ...r.structuredContent,
        output: r.content[0].text,
      });
      expect(conforms(w.structuredContent)).toEqual([]);
    }
  });

  it("approval_required keeps its meaning and gains the text the model was shown", async () => {
    const approval = JSON.stringify({
      error: "approval_required",
      code: "ABC123",
      action: { description: "Send a message" },
      expiresInMinutes: 10,
    });
    const plain = result(
      { argv: ["send", "me", "-"], stdin: "hi", readOnly: false },
      { code: 3, timedOut: false, out: approval, err: "Approval needed: …" }
    );
    const reply = (await handleMessage(
      call(1, "telegram_write", { args: ["send", "me", "-"], stdin: "hi" }),
      async () => plain,
      { describe: async () => ({ error: "unused" }) }
    )) as ToolReply;
    const sc = reply.result.structuredContent!;
    const { output, ...rest } = sc;
    expect(rest).toEqual(plain.structuredContent);
    expect(sc.status).toBe("approval_required");
    expect(sc.retry.arguments.approval).toBe("ABC123");
    expect(output).toBe(textOf(reply));
    expect(reply.result.isError).toBeUndefined();
  });

  it("login codes and gift links are masked in structuredContent as in content", async () => {
    const giftOut = "Alice: tg://giftcode?slug=SAMPLE_ONLY\n";
    const read = (await handleMessage(
      call(2, "telegram_read", { args: ["read", "me"] }),
      async (plan) =>
        result(plan, { code: 0, timedOut: false, out: giftOut, err: "" })
    )) as ToolReply;
    expect(textOf(read)).not.toContain("SAMPLE_ONLY");
    expect(JSON.stringify(read.result.structuredContent)).not.toContain(
      "SAMPLE_ONLY"
    );
    expect(read.result.structuredContent!.output).toContain(
      "[gift code hidden]"
    );

    const echoed = JSON.stringify({
      ok: true,
      text: "Login code: 12345",
    });
    const write = (await handleMessage(
      call(3, "telegram_write", {
        args: ["send", "me", "-"],
        stdin: "Login code: 12345",
        approval: "X",
      }),
      async (plan) =>
        result(plan, { code: 0, timedOut: false, out: echoed, err: "" }),
      { describe: async () => ({ error: "unused" }) }
    )) as ToolReply;
    for (const shown of [
      textOf(write),
      JSON.stringify(write.result.structuredContent),
    ]) {
      expect(shown).not.toContain("12345");
    }
    expect(write.result.structuredContent!.output).toContain(
      "[login code hidden]"
    );
  });

  it("refusals that never run the CLI still carry structuredContent", async () => {
    const replies = [
      (await handleMessage(
        call(4, "telegram_read", { args: ["send", "me", "x"] }),
        async () => {
          throw new Error("must not run");
        }
      )) as ToolReply,
      (await handleMessage(
        call(5, "telegram_write", { args: ["send", "me", "x"] }),
        async () => {
          throw new Error("must not run");
        },
        { readOnly: true }
      )) as ToolReply,
      (await handleMessage(call(6, "telegram_setup", {}), undefined, {
        setup: async () => ({
          content: [{ type: "text", text: "Give the user this link" }],
          structuredContent: { status: "open_page", url: "http://x" },
        }),
      })) as ToolReply,
    ];
    for (const r of replies) {
      expect(conforms(r.result.structuredContent)).toEqual([]);
      expect(r.result.structuredContent!.output).toBe(textOf(r));
    }
    expect(replies[2].result.structuredContent).toMatchObject({
      status: "open_page",
      url: "http://x",
    });
  });
});

describe.concurrent.each([
  ["child processes", {}],
  ["worker threads", { TG_MCP_WORKER: "1" }],
])("a client that reads only structuredContent (%s)", (_mode, extraEnv) => {
  let home: string;
  beforeAll(() => {
    home = mkdtempSync(join(tmpdir(), "tg-mcp-structured-"));
  });

  afterAll(() => rmSync(home, { recursive: true, force: true }));

  it("sees whoami, inbox, help and a write in full", async () => {
    const env: NodeJS.ProcessEnv = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => !/^(TG|OP)_/i.test(k))
    );
    const child = spawn(process.execPath, [CLI, "mcp"], {
      env: {
        ...env,
        HOME: home,
        USERPROFILE: home,
        APPDATA: join(home, "AppData"),
        TG_MOCK: join(home, `state-${Object.keys(extraEnv).length}.json`),
        TG_NO_UPDATE_CHECK: "1",
        ...extraEnv,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const lines: ToolReply[] = [];
    let buf = "";
    child.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        lines.push(JSON.parse(buf.slice(0, i)));
        buf = buf.slice(i + 1);
      }
    });
    const send = (m: object) => child.stdin.write(`${JSON.stringify(m)}\n`);
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "structured-only", version: "0" },
      },
    });
    send(call(2, "telegram_read", { args: ["whoami"] }));
    send(call(3, "telegram_read", { args: ["inbox", "-n", "3"] }));
    send(call(4, "telegram_help", { grep: "thread" }));
    send(call(5, "telegram_read", { args: ["whoami", "--json"] }));
    send(
      call(6, "telegram_write", {
        args: ["send", "me", "-", "--json"],
        stdin: "structured hello",
      })
    );
    send(call(7, "telegram_read", { args: ["read", "nobody_here_xyz"] }));
    send(call(8, "telegram_setup", {}));
    child.stdin.end();
    await expect(new Promise((r) => child.on("close", r))).resolves.toBe(0);

    const seen = (id: number) => {
      const r = lines.find((l) => (l as { id?: number }).id === id)!;
      expect(conforms(r.result.structuredContent)).toEqual([]);
      return r.result.structuredContent!;
    };
    expect(seen(2)).toMatchObject({ exitCode: 0 });
    expect(seen(2).output).toMatch(/Mock Owner/);
    expect(seen(3).output).toMatch(/Alice Example/);
    expect(seen(4).output).toMatch(/read <chat>/);
    expect(JSON.parse(seen(5).output)).toMatchObject({
      firstName: expect.any(String),
    });
    expect(JSON.parse(seen(6).output)).toMatchObject({
      ok: true,
      action: "send",
      text: "structured hello",
    });
    expect(seen(7).exitCode).not.toBe(0);
    expect(seen(7).output).toMatch(/not found|nobody_here_xyz/i);
    expect(seen(8).output).toMatch(/Mock mode/);
  });
});
