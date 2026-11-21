import { vi } from "vitest";

import { assertWriteEnabled, DESCRIBE_MARK } from "../../src/guard.js";
import { childEnv } from "../../src/mcp.js";
import type { Described } from "../../src/mcp.js";

type Plan = Parameters<typeof childEnv>[0];

/**
 * The describe run of gateWrite (src/mcp.ts), in this process: the real guard in the environment
 * childEnv() builds for a describe plan, with the plan's stdin fed through the test's own stdin
 * mock. Returns what the server would parse from the child's stdout.
 */
export async function describeInProcess(
  plan: Plan,
  feedStdin: (text: string) => void
): Promise<Described> {
  const env = childEnv({ ...plan, describe: true, approval: undefined });
  const saved = { ...process.env };
  for (const k of [
    "TG_APPROVE",
    "TG_APPROVAL_STDIN",
    "TG_APPROVAL_DESCRIBE",
    "TG_MCP",
    "TG_READ_ONLY",
  ]) {
    if (env[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = env[k];
    }
  }
  feedStdin(plan.stdin ?? "");
  let out = "";
  let err = "";
  vi.spyOn(console, "log").mockImplementation((...a) => {
    out += `${a.join(" ")}\n`;
  });
  vi.spyOn(console, "error").mockImplementation((...a) => {
    err += `${a.join(" ")}\n`;
  });
  vi.spyOn(process, "exit").mockImplementation(((code: number) => {
    throw Object.assign(new Error("exit"), { code });
  }) as never);
  try {
    await assertWriteEnabled(plan.argv);
    return { error: "the describe run went on to the write" };
  } catch {
    const line = out.split("\n").find((l) => l.startsWith(DESCRIBE_MARK));
    return line
      ? (JSON.parse(line.slice(DESCRIBE_MARK.length)) as Described)
      : { error: err.trim() || "no description" };
  } finally {
    vi.restoreAllMocks();
    for (const k of Object.keys(process.env)) {
      if (!(k in saved)) {
        delete process.env[k];
      }
    }
    Object.assign(process.env, saved);
  }
}
