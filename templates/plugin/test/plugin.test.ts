import { runCommand, validatePlugin } from "@better-tg/plugin-sdk/test";
import type { PluginRunError } from "@better-tg/plugin-sdk/test";
import { describe, expect, it } from "vitest";

import type { Summary } from "../src/plugin.js";

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
