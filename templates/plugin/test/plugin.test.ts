import {
  createTestHost,
  runCommand,
  validatePlugin,
} from "@better-tg/plugin-sdk/test";
import type { PluginRunError } from "@better-tg/plugin-sdk/test";
import { describe, expect, it } from "vitest";

import type { Summary, SummaryInput } from "../src/plugin.js";

const dir = ".";
const mock = { mock: true } as const;

async function failure(run: Promise<unknown>): Promise<PluginRunError> {
  try {
    await run;
  } catch (error) {
    return error as PluginRunError;
  }
  throw new Error("The run did not fail");
}

describe("my-plugin", () => {
  it("is a valid plugin", () => {
    expect(validatePlugin(dir)).toMatchObject({ ok: true, name: "my-plugin" });
  });

  it("summary counts the user's own messages and ends with a null cursor", async () => {
    const r = await runCommand<Summary>(
      dir,
      "summary",
      { limit: 100, types: ["private", "group"] },
      mock
    );
    expect(r.data).toMatchObject({
      count: 5,
      byType: { private: 3, group: 2 },
      cursor: null,
      done: true,
    });
    expect(r.data.samples).toHaveLength(3);
    expect(r.proposals).toEqual([]);
  });

  it("summary hands out a cursor while more is left", async () => {
    const r = await runCommand<Summary>(dir, "summary", { limit: 2 }, mock);
    expect(r.data).toMatchObject({ count: 2, remaining: 0, done: false });
    expect(r.data.cursor).toMatch(/^[\w-]{22}$/);
  });

  it("summary goes on from its cursor with limit = remaining", async () => {
    const host = createTestHost(mock);
    const types: SummaryInput["types"] = ["private", "group"];
    const first = await host.run<Summary>(dir, "summary", { limit: 2, types });
    expect(first.data).toMatchObject({ count: 2, done: false });
    const second = await host.run<Summary>(dir, "summary", {
      limit: 4 - first.data.count,
      cursor: first.data.cursor,
    });
    expect(second.data).toMatchObject({ count: 2, remaining: 0 });
    const both = await runCommand<Summary>(
      dir,
      "summary",
      { limit: 4, types },
      mock
    );
    expect(first.data.chars + second.data.chars).toBe(both.data.chars);
  });

  it("summary turns a flood_wait after part of a page into a page of what was read", async () => {
    const all = await runCommand<Summary>(
      dir,
      "summary",
      { limit: 100, types: ["private", "group"] },
      mock
    );
    process.env.TG_MOCK_FLOOD_HISTORY = "1:7";
    let r: Awaited<ReturnType<typeof runCommand<Summary>>>;
    try {
      r = await runCommand<Summary>(
        dir,
        "summary",
        { limit: 100, types: ["private", "group"] },
        mock
      );
    } finally {
      delete process.env.TG_MOCK_FLOOD_HISTORY;
    }
    expect(r.data.retryAfterSeconds).toBe(7);
    expect(r.data.done).toBe(false);
    expect(r.data.cursor).toMatch(/^[\w-]{22}$/);
    expect(r.data.count).toBeGreaterThan(0);
    expect(r.data.count).toBeLessThan(all.data.count);
    expect(r.data.remaining).toBe(100 - r.data.count);
    expect(r.data.byType.private + r.data.byType.group).toBe(r.data.count);
  });

  it("summary quotes as many messages as the setting says", async () => {
    const r = await runCommand<Summary>(
      dir,
      "summary",
      { limit: 100 },
      { ...mock, settings: { samples: 1 } }
    );
    expect(r.data.samples).toHaveLength(1);
  });

  it("an input that breaks the schema is refused before the plugin runs", async () => {
    const e = await failure(runCommand(dir, "summary", { limit: 0 }, mock));
    expect(e).toMatchObject({ code: "invalid_argument", exitCode: 2 });
  });

  it("define is answered from dev/fixtures, never the network", async () => {
    const r = await runCommand(dir, "define", { word: "Plugin" }, mock);
    expect(r.data).toEqual({
      word: "Plugin",
      definition: "A piece of software that adds a feature to another program.",
    });
    const unknown = await runCommand(dir, "define", { word: "zzz" }, mock);
    expect(unknown.data).toEqual({ word: "zzz", definition: null });
  });

  it("define takes fixtures from the test too", async () => {
    const r = await runCommand(
      dir,
      "define",
      { word: "quickjs" },
      {
        ...mock,
        fixtures: {
          request: {
            url: "https://api.example.com/v1/define?word=quickjs",
          },
          response: { json: { definition: "A small JavaScript engine." } },
        },
      }
    );
    expect(r.data).toEqual({
      word: "quickjs",
      definition: "A small JavaScript engine.",
    });
  });

  it("define without its secret fails with the command that sets it", async () => {
    const e = await failure(
      runCommand(
        dir,
        "define",
        { word: "plugin" },
        { ...mock, secrets: { apikey: null } }
      )
    );
    expect(e.code).toBe("secret_missing");
    expect(e.body.command).toEqual([
      "plugin",
      "secret",
      "set",
      "my-plugin",
      "apikey",
    ]);
  });
});
