import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { cliArgs } from "./cli.js";

const home = mkdtempSync(join(tmpdir(), "tg-mcp-result-"));

afterAll(() => rmSync(home, { recursive: true, force: true }));

function env(): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^(TG|OP)_/i.test(k))
  );
  return Object.assign(e, {
    HOME: home,
    USERPROFILE: home,
    APPDATA: join(home, "AppData"),
    TG_MOCK: join(home, "state.json"),
    TG_NO_UPDATE_CHECK: "1",
  });
}

describe("5 MCP keeps the exit code and keeps stderr out of the JSON", () => {
  it("cliResult: exit code in structuredContent, JSON text without the stderr banner; exit 3 unchanged", async () => {
    const { cliResult } = await import("../src/mcp.js");
    const banner =
      "MOCK MODE (TG_MOCK): fake account, nothing reaches Telegram\n";
    const error = '{"error":{"code":"ambiguous_chat","message":"x"}}\n';
    for (const code of [1, 2, 4, 5]) {
      const r = cliResult(code, false, error, banner);
      expect(r.isError).toBe(true);
      expect(r.content[0].text).toBe(error.trim());
      expect(r.structuredContent).toEqual({
        exitCode: code,
        stderr: banner.trim(),
      });
    }
    const ok = cliResult(0, false, '{"messages":[]}\n', banner);
    expect(ok.content[0].text).toBe('{"messages":[]}');
    expect(ok.structuredContent).toEqual({
      exitCode: 0,
      stderr: banner.trim(),
    });
    expect(cliResult(1, false, "", "Chat not found: x\n").content[0].text).toBe(
      "Chat not found: x"
    );
    expect(
      cliResult(
        3,
        false,
        '{"error":"approval_required"}\n',
        "Approval needed\n"
      )
    ).toEqual({
      content: [
        {
          type: "text",
          text: 'Approval needed\n{"error":"approval_required"}',
        },
      ],
      isError: true,
    });
  });

  it("over stdio: write-access --json is a read, and a failed read reports its exit code", async () => {
    const entry = cliArgs();
    const child = spawn(process.execPath, [...entry, "mcp"], {
      env: env(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    const lines: any[] = [];
    let buf = "";
    child.stdout.setEncoding("utf-8").on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        lines.push(JSON.parse(buf.slice(0, i)));
        buf = buf.slice(i + 1);
      }
    });
    const call = (id: number, args: string[]) =>
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name: "telegram_read", arguments: { args } } })}\n`
      );
    call(1, ["write-access", "--json"]);
    call(2, ["read", "Tea", "--json"]);
    child.stdin.end();
    await new Promise((r) => child.on("close", r));
    expect(lines[0].result.content[0].text).not.toMatch(
      /changed in a terminal/
    );
    expect(JSON.parse(lines[0].result.content[0].text).error.code).toBe(
      "not_in_mock"
    );
    expect(lines[1].result.structuredContent.exitCode).toBe(2);
    expect(JSON.parse(lines[1].result.content[0].text).error.code).toBe(
      "ambiguous_chat"
    );
    expect(lines[1].result.structuredContent.stderr).toMatch(/^MOCK MODE/);
  }, 30_000);
});
