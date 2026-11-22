import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { seedWorld } from "../src/mock/world.js";
import type { MockWorld } from "../src/mock/world.js";
import { cliArgs } from "./cli.js";
import { useSpawnTimeout } from "./helpers/spawn-timeout.js";

useSpawnTimeout();

const home = mkdtempSync(join(tmpdir(), "tg-agent-feedback-"));

afterAll(() => rmSync(home, { recursive: true, force: true }));
let n = 0;

function env(
  extra: NodeJS.ProcessEnv = {},
  state = join(home, `state-${n++}.json`)
): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^(TG|OP)_/i.test(k))
  );
  return Object.assign(
    e,
    {
      HOME: home,
      USERPROFILE: home,
      APPDATA: join(home, "AppData"),
      TG_MOCK: state,
      TG_NO_UPDATE_CHECK: "1",
    },
    extra
  );
}

function cli(args: string[], extra: NodeJS.ProcessEnv = {}, state?: string) {
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: "utf-8",
    env: env(extra, state),
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    code: r.status,
    out: r.stdout,
    err: r.stderr.replace(/^MOCK MODE.*\n/m, ""),
  };
}

function worldFile(extra: (w: MockWorld) => void): string {
  const w = seedWorld();
  extra(w);
  const file = join(home, `world-${n++}.json`);
  writeFileSync(file, JSON.stringify(w));
  return file;
}

describe('1 hint is always a string; a command to run next is an argv in "command"', () => {
  it.each([
    [
      ["read", "NoSuchChatAtAll", "--json"],
      "chat_not_found",
      ["chats", "-q", "NoSuchChatAtAll", "--preview", "0", "--json"],
    ],
    [["read", "Tea", "--json"], "ambiguous_chat", undefined],
    [["folder", "NoSuchFolder", "--json"], "folder_not_found", ["folders"]],
    [["download", "Team", "3", "--json"], "no_media", ["get", "Team", "3"]],
  ] as const)("%j", (args, code, command) => {
    const { error } = JSON.parse(cli([...args]).out);
    expect(error.code).toBe(code);
    expect(error.hint).toBeTypeOf("string");
    expect(error.command).toEqual(command);
  });
});

describe("4 Saved Messages is titled so, and the account's own messages are outgoing", () => {
  const state = () =>
    worldFile((w) => {
      w.chats
        .find((c) => c.id === w.me)!
        .messages.push({ id: 3, ago: 60, text: "Saved from elsewhere" });
      w.chats
        .find((c) => c.id === 4001)!
        .messages.push({
          id: 90,
          ago: 30,
          from: w.me,
          text: "Mine, sent elsewhere",
        });
    });

  it('read me: chatTitle "Saved Messages", every message isOutgoing', () => {
    const json = JSON.parse(cli(["read", "me", "--json"], {}, state()).out);
    expect(json.chatTitle).toBe("Saved Messages");
    expect(json.messages.length).toBeGreaterThan(2);
    for (const m of json.messages) {
      expect(m.isOutgoing, m.text).toBe(true);
    }
  });

  it("a message from the account in a group is outgoing without msg.out; others are not", () => {
    const json = JSON.parse(
      cli(["read", "Team", "-n", "10", "--json"], {}, state()).out
    );
    const mine = json.messages.find((m: { id: number }) => m.id === 90);
    expect(mine.isOutgoing).toBe(true);
    for (const m of json.messages.filter(
      (x: { senderId?: string }) => x.senderId && x.senderId !== "1000"
    )) {
      expect(m.isOutgoing).toBe(false);
    }
  });

  it('chats, inbox and global search name the self chat "Saved Messages"', () => {
    const s = state();
    const chats = JSON.parse(cli(["chats", "--json"], {}, s).out);
    expect(chats.find((c: { id: string }) => c.id === "1000").title).toBe(
      "Saved Messages"
    );
    const found = JSON.parse(
      cli(["search", "Saved from", "--json"], {}, s).out
    );
    expect(found.messages[0]).toMatchObject({
      chatId: "1000",
      chatTitle: "Saved Messages",
      isOutgoing: true,
    });
  });
});

describe("5 inbox: unmuted chats first, each marked muted or not", () => {
  const state = () =>
    worldFile((w) => {
      w.chats.push({
        id: 4200,
        kind: "supergroup",
        title: "Huge Muted",
        mutedUntil: 4_102_444_800,
        unread: 900,
        messages: [{ id: 1, ago: 60, from: 1002, text: "noise" }],
      } as never);
    });

  it("JSON: private chats, then unmuted groups/channels, then muted; muted is always a boolean", () => {
    const json = JSON.parse(cli(["inbox", "--json"], {}, state()).out);
    const rank = (c: { type: string; muted: boolean }) =>
      c.muted ? 2 : c.type === "user" ? 0 : 1;
    for (const c of json.chats) {
      expect(c.muted).toBeTypeOf("boolean");
    }
    const ranks = json.chats.map(rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(json.chats.at(-1)).toMatchObject({
      title: expect.stringMatching(/Huge Muted|Bob Sample/),
      muted: true,
    });
    expect(json.chats[0].muted).toBe(false);
    expect(json.totalUnread).toBeGreaterThanOrEqual(900);
  });

  it("--unmuted drops the muted ones; text marks a muted chat", () => {
    const s = state();
    const unmuted = JSON.parse(
      cli(["inbox", "--unmuted", "--json"], {}, s).out
    );
    expect(
      unmuted.chats.every((c: { muted: boolean }) => c.muted === false)
    ).toBe(true);
    const text = cli(["inbox"], {}, s).out;
    expect(text).toMatch(/ muted .*Huge Muted/);
    expect(text.trimEnd().split("\n").at(-1)).toMatch(/muted/);
  });
});

describe("6 check says plainly whether writes go out", () => {
  it('mock (writes need nothing): "writes":"without-confirmation" and a first-level text line', () => {
    const json = JSON.parse(cli(["check", "--json"]).out);
    expect(json).toMatchObject({
      writeMode: "on",
      writes: "without-confirmation",
      writeModeProtected: false,
    });
    expect(cli(["check"]).out).toMatch(
      /^Writes: ON — messages are sent without confirmation/m
    );
  });

  it('mock in mode ask: "writes":"with-approval"', () => {
    const json = JSON.parse(cli(["check", "--json"], { TG_MOCK_ASK: "1" }).out);
    expect(json).toMatchObject({ writeMode: "ask", writes: "with-approval" });
    expect(cli(["check"], { TG_MOCK_ASK: "1" }).out).toMatch(
      /^Writes: ASK — /m
    );
  });

  it("the mapping covers every write mode", async () => {
    const { writesOf } = await import("../src/status.js");
    expect(writesOf("on")).toBe("without-confirmation");
    expect(writesOf("ask")).toBe("with-approval");
    expect(writesOf("read-only")).toBe("off");
  });
});
