import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { isApiReadMethod } from "../src/api-methods.js";
import { TL_METHODS } from "../src/generated/tl-commands.js";
import { seedWorld } from "../src/mock/world.js";
import type { MockWorld } from "../src/mock/world.js";
import { cliArgs } from "./cli.js";
import { useSpawnTimeout } from "./helpers/spawn-timeout.js";

useSpawnTimeout();

const home = mkdtempSync(join(tmpdir(), "tg-agent-ux-r1-"));

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
    maxBuffer: 64 << 20,
  });
  return {
    code: r.status,
    out: r.stdout,
    err: r.stderr.replace(/^MOCK MODE.*\n/m, ""),
  };
}

function oneJson(out: string): any {
  const lines = out.trim().split("\n");
  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0]);
}

describe("2/3 --json always yields one complete JSON object", () => {
  it("a missing folder is a JSON error, exit 1", () => {
    const r = cli(["folder", "NoSuchFolder", "--json"]);
    expect(r.code).toBe(1);
    expect(oneJson(r.out).error.code).toBe("folder_not_found");
  });

  it("skill install with an unknown agent is a JSON usage error, exit 2", () => {
    const r = cli(["skill", "install", "-a", "xyz", "--json"]);
    expect(r.code).toBe(2);
    expect(oneJson(r.out).error.code).toBe("invalid_argument");
  });

  it("a long error is written in full before the process exits, even to a slow reader", async () => {
    const long = "y".repeat(120_000);
    const state = await worldFile((w) => {
      for (const [id, tag] of [
        [9101, "A"],
        [9102, "B"],
      ] as const) {
        w.chats.push({
          id,
          kind: "supergroup",
          title: `Huge ${tag} ${long}`,
          messages: [{ id: 1, ago: 60, from: 1002, text: "x" }],
        } as never);
      }
    });
    const child = spawn(
      process.execPath,
      [...cliArgs(), "read", "Huge", "--json"],
      { env: env({}, state), stdio: ["ignore", "pipe", "ignore"] }
    );
    child.stdout.pause();
    const closed = new Promise((r) => child.once("close", r));
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    while (
      child.exitCode === null &&
      child.stdout.readableLength < child.stdout.readableHighWaterMark
    ) {
      await sleep(20);
    }
    const exitedUnread = await Promise.race([
      new Promise((r) => {
        if (child.exitCode !== null) {
          r(true);
        }
        child.once("exit", () => r(true));
      }),
      sleep(1000).then(() => false),
    ]);
    let out = "";
    child.stdout.setEncoding("utf-8").on("data", (d) => {
      out += d;
    });
    child.stdout.resume();
    await expect(closed).resolves.toBe(2);
    expect(exitedUnread).toBe(false);
    const { error } = oneJson(out);
    expect(error.code).toBe("ambiguous_chat");
    expect(
      error.candidates.map((c: { title: string }) => c.title).sort()
    ).toEqual([`Huge A ${long}`, `Huge B ${long}`]);
  });

  it("sync with a chat that does not exist is an error with JSON, not a silent 0", () => {
    const r = cli([
      "sync",
      "--chat",
      "NoSuchChat",
      "--json",
      "--output",
      join(home, `sync-${n++}`),
    ]);
    expect(r.code).toBe(1);
    expect(oneJson(r.out).error.code).toBe("chat_not_found");
  });
});

async function worldFile(extra: (w: MockWorld) => void): Promise<string> {
  const w = seedWorld();
  extra(w);
  const file = join(home, `world-${n++}.json`);
  writeFileSync(file, JSON.stringify(w));
  return file;
}

const crowd =
  (count: number, duplicate = true) =>
  (w: MockWorld) => {
    for (let i = 0; i < count; i++) {
      w.chats.push({
        id: 100_000 + i,
        kind: "supergroup",
        title: `Filler ${i}`,
        messages: [{ id: 1, ago: 300 * 86_400, from: 1002, text: "x" }],
      } as never);
    }
    if (duplicate) {
      w.chats.push({
        id: 9000,
        kind: "supergroup",
        title: "Team",
        messages: [
          { id: 1, ago: 900 * 86_400, from: 1002, text: "other team" },
        ],
      } as never);
    }
  };

describe("1 a title is unique only when the whole dialog list was seen", () => {
  it("a duplicate title beyond the first 500 dialogs makes a read ambiguous", async () => {
    const state = await worldFile(crowd(520));
    const r = cli(["read", "Team", "--json"], {}, state);
    expect(r.code).toBe(2);
    const { error } = oneJson(r.out);
    expect(error.code).toBe("ambiguous_chat");
    expect(error.candidates.map((c: { id: string }) => c.id)).toEqual([
      "-1004001",
      "-1009000",
    ]);
  }, 60_000);

  it("... and a write to it too", async () => {
    const state = await worldFile(crowd(520));
    const r = cli(["send", "Team", "hi", "--json"], {}, state);
    expect(r.code).toBe(2);
    expect(oneJson(r.out).error.code).toBe("ambiguous_chat");
    const read = cli(["read", "-1004001", "-n", "1", "--json"], {}, state);
    expect(JSON.parse(read.out).messages[0].text).not.toBe("hi");
  }, 60_000);

  it("past 5000 dialogs a title is not proven unique: an ID or @username is required", async () => {
    const state = await worldFile(crowd(5000, false));
    for (const args of [
      ["read", "Team", "--json"],
      ["send", "Team", "hi", "--json"],
    ]) {
      const r = cli(args, {}, state);
      expect(r.code).toBe(2);
      const { error } = oneJson(r.out);
      expect(error.code).toBe("ambiguous_or_unverified");
      expect(error.candidates).toEqual([
        { id: "-1004001", title: "Team", type: "supergroup" },
      ]);
    }
    expect(cli(["read", "-1004001", "-n", "1", "--json"], {}, state).code).toBe(
      0
    );
    expect(
      cli(["read", "@mock_team", "-n", "1", "--json"], {}, state).code
    ).toBe(0);
  }, 120_000);
});

describe("8 links, candidates and hints", () => {
  it("a t.me link names its chat before any title search", async () => {
    const state = await worldFile((w) => {
      w.chats.find((c) => c.id === 4002)!.title =
        "Read https://t.me/mock_team A";
      w.chats.push({
        id: 4100,
        kind: "supergroup",
        title: "Read https://t.me/mock_team B",
        messages: [{ id: 1, ago: 60, from: 1002, text: "x" }],
      } as never);
    });
    for (const link of [
      "https://t.me/mock_team",
      "t.me/mock_team/2",
      "https://t.me/c/4001/2",
      "tg://resolve?domain=mock_team",
    ]) {
      const r = cli(["read", link, "-n", "1", "--json"], {}, state);
      expect(r.code, link).toBe(0);
      expect(JSON.parse(r.out).chatId, link).toBe("-1004001");
    }
    const invite = cli(
      ["read", "https://t.me/+AbCdEf123", "--json"],
      {},
      state
    );
    expect(invite.code).toBe(2);
    expect(oneJson(invite.out).error.code).toBe("invalid_argument");
  }, 60_000);

  it("candidates carry id, title, type and the re-run command only (no @username); the hint is prose, the command an argv with --preview 0", () => {
    const ambiguous = oneJson(cli(["read", "Tea", "--json"]).out).error;
    for (const c of ambiguous.candidates) {
      expect(Object.keys(c).sort()).toEqual(["command", "id", "title", "type"]);
    }
    expect(cli(["read", "Tea"]).err).not.toMatch(/@mock_team/);
    const name = `it's "odd" $(x)`;
    const notFound = oneJson(cli(["read", name, "--json"]).out).error;
    expect(notFound.command).toEqual([
      "chats",
      "-q",
      name,
      "--preview",
      "0",
      "--json",
    ]);
    expect(notFound.hint).toBeTypeOf("string");
    expect(notFound.hint).toContain(
      `telegram chats -q 'it'\\''s "odd" $(x)' --preview 0`
    );
    expect(ambiguous.hint).toBeTypeOf("string");
    expect(cli(["read", name]).err).toContain(
      `telegram chats -q 'it'\\''s "odd" $(x)' --preview 0`
    );
  });
});

describe("2 a question to the user never lands on stdout", () => {
  it("prompt() asks on stderr", async () => {
    const { Readable } = await import("node:stream");
    const { prompt } = await import("../src/prompt.js");
    const stdin = Object.getOwnPropertyDescriptor(process, "stdin")!;
    const outWrite = process.stdout.write.bind(process.stdout);
    const errWrite = process.stderr.write.bind(process.stderr);
    let out = "";
    let err = "";
    process.stdout.write = ((c: string) => ((out += c), true)) as never;
    process.stderr.write = ((c: string) => ((err += c), true)) as never;
    Object.defineProperty(process, "stdin", {
      value: Readable.from(["y\n"]),
      configurable: true,
    });
    try {
      await expect(prompt("Allow? [y/N] ")).resolves.toBe("y");
    } finally {
      Object.defineProperty(process, "stdin", stdin);
      process.stdout.write = outWrite;
      process.stderr.write = errWrite;
    }
    expect(out).toBe("");
    expect(err).toContain("Allow? [y/N] ");
  });
});

describe("7 --topic: bot forums count, and an empty unread page is checked like any other", () => {
  it("a bot with topics (botForumView) reads a topic; a bot without them is not_a_forum", async () => {
    const forum = await worldFile((w) => {
      w.users.find((u) => u.id === 2001)!.forumView = true;
    });
    const r = cli(["read", "@demo_bot", "--topic", "1", "--json"], {}, forum);
    expect(r.code, r.out + r.err).toBe(0);
    expect(JSON.parse(r.out).chatId).toBe("2001");
    const plain = cli(["read", "@demo_bot", "--topic", "1", "--json"]);
    expect(plain.code).toBe(2);
    expect(oneJson(plain.out).error.code).toBe("not_a_forum");
  });

  it("read --unread --topic on a chat without topics is refused even with nothing unread", () => {
    const r = cli(["read", "me", "--unread", "--topic", "10", "--json"]);
    expect(r.code).toBe(2);
    expect(oneJson(r.out).error.code).toBe("not_a_forum");
  });

  it("an empty --unread page still names its chat", () => {
    const r = cli(["read", "me", "--unread", "--json"]);
    expect(r.code).toBe(0);
    expect(oneJson(r.out)).toEqual({
      chatTitle: "Saved Messages",
      chatId: "1000",
      messages: [],
    });
  });
});

describe("11 hasMore only when a next page was seen", () => {
  it("read: a page of exactly limit at the start of history has no hasMore; one less has", () => {
    const exact = cli(["read", "Team", "-n", "3", "--json"]);
    expect(JSON.parse(exact.out).messages).toHaveLength(3);
    expect(JSON.parse(exact.out).hasMore).toBeUndefined();
    expect(cli(["read", "Team", "-n", "3"]).out).not.toMatch(/more: --before/);
    const page = JSON.parse(cli(["read", "Team", "-n", "2", "--json"]).out);
    expect(page.messages).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(
      JSON.parse(
        cli([
          "read",
          "Team",
          "-n",
          "2",
          "--before",
          String(page.nextBefore),
          "--json",
        ]).out
      ).messages.length
    ).toBeGreaterThan(0);
  });

  it("search: exactly limit results is the end; one less says more exist", () => {
    const all = JSON.parse(cli(["search", "", "--json"]).out).messages.length;
    expect(all).toBeGreaterThan(1);
    expect(
      JSON.parse(cli(["search", "", "-n", String(all), "--json"]).out).hasMore
    ).toBeUndefined();
    expect(
      JSON.parse(cli(["search", "", "-n", String(all - 1), "--json"]).out)
        .hasMore
    ).toBe(true);
    const inChat = JSON.parse(
      cli(["search", "", "--chat", "Team", "--json"]).out
    ).messages.length;
    expect(
      JSON.parse(
        cli(["search", "", "--chat", "Team", "-n", String(inChat), "--json"])
          .out
      ).hasMore
    ).toBeUndefined();
  });
});

describe("4 forward --json tells source IDs from destination IDs", () => {
  it("messageIds stay the originals; forwardedIds are the copies in the destination chat", () => {
    const state = join(home, `fwd-${n++}.json`);
    const r = cli(["forward", "Team", "2,3", "me", "--json"], {}, state);
    expect(r.code, r.err).toBe(0);
    const result = oneJson(r.out);
    expect(result).toMatchObject({
      ok: true,
      action: "forward",
      chatId: "1000",
      fromChatId: "-1004001",
      messageIds: [2, 3],
    });
    expect(result.forwardedIds).toHaveLength(2);
    expect(result.forwardedIds).not.toEqual([2, 3]);
    const copies = JSON.parse(
      cli(
        ["get", "me", ...result.forwardedIds.map(String), "--json"],
        {},
        state
      ).out
    ).messages;
    const originals = JSON.parse(
      cli(["get", "Team", "2", "3", "--json"], {}, state).out
    ).messages;
    expect(copies.map((m: { text: string }) => m.text).sort()).toEqual(
      originals.map((m: { text: string }) => m.text).sort()
    );
  });
});

describe("9 numbers and dates never silently become other values", () => {
  it.each([
    [["get", "Team", "9007199254740993", "--json"]],
    [["get", "Team", "3,2147483648", "--json"]],
    [["delete", "Team", "9007199254740993", "--json"]],
    [["read", "Team", "--before", "2147483648", "--json"]],
    [["read", "Team", "--since", "999999999999999999d", "--json"]],
    [["read", "Team", "--until", "99999999999999w", "--json"]],
    [["search", "x", "--since", "999999999999999999m", "--json"]],
    [["send", "me", "hi", "--schedule", "99999999d", "--json"]],
    [["mute", "Team", "-d", "99999999w", "--json"]],
  ])("%j is a usage error, exit 2", (args) => {
    const r = cli(args);
    expect(r.code, r.out + r.err).toBe(2);
    expect(oneJson(r.out).error.code).toBe("invalid_argument");
  });

  it("write-access --for refuses a duration with no real end date", async () => {
    const { parseForDuration } = await import("../src/write-state.js");
    expect(() => parseForDuration("99999999999999999w")).toThrow(/too long/);
    expect(parseForDuration("2h")).toBe(7200);
  });
});

describe("10 usage errors exit 2, and are found before the write guard", () => {
  it("search --from without --chat exits 2 with one JSON error", () => {
    const r = cli(["search", "coffee", "--from", "@alice_example", "--json"]);
    expect(r.code, r.out + r.err).toBe(2);
    expect(oneJson(r.out).error.code).toBe("invalid_argument");
  });

  it.each([
    [["topic"], /missing subcommand|Usage: telegram topic/],
    [["api", "help.GetConfig", "-p", "oops"], /Invalid --params JSON/],
    [["api", "no.SuchMethod"], /Unknown namespace "no"/],
  ])("%j exits 2", (args, text) => {
    const r = cli(args);
    expect(r.code, r.out + r.err).toBe(2);
    expect(r.err).toMatch(text);
  });

  it("in mode ask a command line that cannot run gets exit 2, never an approval (exit 3)", () => {
    const profile = mkdtempSync(join(home, "ask-"));
    const real = (args: string[]) => {
      const e = env({
        HOME: profile,
        USERPROFILE: profile,
        APPDATA: join(profile, "AppData"),
        TG_MOCK: "",
        TG_PROFILE: "ask-test",
        TG_NO_LIBSECRET: "1",
      });
      const r = spawnSync(
        process.execPath,
        [
          "--import",
          pathToFileURL(join(__dirname, "helpers", "as-linux.mjs")).href,
          ...cliArgs(),
          ...args,
        ],
        { encoding: "utf-8", env: e, stdio: ["ignore", "pipe", "pipe"] }
      );
      return { code: r.status, out: r.stdout, err: r.stderr };
    };
    expect(real(["write-access", "ask"]).code).toBe(0);
    expect(JSON.parse(real(["write-access", "--json"]).out).writeMode).toBe(
      "ask"
    );
    const named = real(["set-name", "Bob", "--json"]);
    expect(named.code, named.out + named.err).toBe(3);
    expect(oneJson(named.out).error).toBe("approval_required");
    const send = real(["send", "me", "hi", "--json"]);
    expect(send.code, send.out + send.err).toBe(5);
    expect(oneJson(send.out).error.code).toBe("not_configured");
    for (const args of [
      ["click", "Team", "3", "--json"],
      ["send-file", "me", join(profile, "no-such-file.png"), "--json"],
      ["react", "Team", "3", "--json"],
      ["set-avatar", join(profile, "no-such-file.png"), "--json"],
    ]) {
      const r = real(args);
      expect(r.code, `${args.join(" ")}: ${r.out}${r.err}`).toBe(2);
      expect(oneJson(r.out).error.code).toBe("invalid_argument");
    }
  }, 60_000);
});

describe("12 inbox -n 0 still gives the totals only", () => {
  it("exit 0, the totals, no chats", () => {
    const r = cli(["inbox", "-n", "0", "--json"]);
    expect(r.code, r.err).toBe(0);
    const inbox = oneJson(r.out);
    expect(inbox).toMatchObject({
      totalUnread: expect.any(Number),
      chatsWithUnread: expect.any(Number),
      chats: [],
    });
    expect(inbox.totalUnread).toBeGreaterThan(0);
    expect(cli(["inbox", "-n", "-1", "--json"]).code).toBe(2);
  });
});

describe("12 the skill says what the CLI does", () => {
  const read = (f: string) =>
    readFileSync(join(__dirname, "..", "skills", "better-tg-cli", f), "utf-8");

  it('a chat that is not found is exit 1, not "anything else is refused (exit 2)"', () => {
    for (const f of ["SKILL.md", "reading.md"]) {
      expect(read(f), f).not.toMatch(/anything else is refused \(exit 2\)/);
    }
    expect(read("reading.md").replaceAll(/\s+/g, " ")).toMatch(
      /a name that fits none is `chat_not_found` \(exit 1\)/
    );
  });

  it("mark-read promises no message ID; forward names its source and destination IDs", () => {
    const ref = read("writing.md");
    const markRead = ref
      .split("\n")
      .filter((l) => l.startsWith("| ") && l.includes("`mark-read`"));
    expect(markRead).toHaveLength(1);
    expect(markRead[0]).not.toMatch(/messageId/);
    expect(ref).toMatch(
      /\| `forward` \|.*`messageIds` are the \*\*source\*\* IDs.*`forwardedIds`/
    );
  });

  it('raw API writes work in mode "ask"; GetBotCallbackAnswer and GetInlineBotResults are named as writes', () => {
    for (const f of ["SKILL.md", "api.md"]) {
      expect(read(f).replaceAll(/\s+/g, " "), f).not.toMatch(
        /write \(needs `telegram write-access on`|a write that needs `telegram write-access on`/
      );
    }
    const text = read("api.md").replaceAll(/\s+/g, " ");
    expect(text).toMatch(/in mode `ask` the user approves that one call/);
    expect(text).toMatch(/`write-access on` is never needed/);
    expect(text).toContain("GetBotCallbackAnswer");
    expect(text).toContain("GetInlineBotResults");
    const api = cli(["api", "--help"]).out.replaceAll(/\s+/g, " ");
    expect(api).not.toContain("write and needs `telegram write-access on`");
    expect(api).toContain(
      "messages.GetBotCallbackAnswer, ephemeral.GetCallbackAnswer, messages.GetInlineBotResults"
    );
    expect(cli(["messages", "send-message", "--help"]).out).toMatch(
      /Access in a terminal: write — needs write access \(mode "ask": the user approves each call\)/
    );
  });

  it("every Get*-named write of src/api-methods.ts is named in the skill (api.md), api --help and the coverage doc", () => {
    const getWrites = TL_METHODS.map((m) => m[2]).filter(
      (n) => /^get/i.test(n.split(".").pop()!) && !isApiReadMethod(n)
    );
    expect(getWrites).toContain("ephemeral.GetCallbackAnswer");
    const api = cli(["api", "--help"]).out.replaceAll(/\s+/g, " ");
    const coverage = readFileSync(
      join(__dirname, "..", "docs", "api-coverage.md"),
      "utf-8"
    );
    for (const name of getWrites) {
      expect(read("api.md"), `api.md: ${name}`).toContain(name);
      expect(api, `api --help: ${name}`).toContain(name);
      expect(coverage, `api-coverage.md: ${name}`).toContain(name);
    }
  });
});

describe("sync --media: a failed download is a failure that --resume retries", () => {
  it("goes to failed[], exits 1, and the file and checkpoint stop before that message", async () => {
    const state = await worldFile((w) => {
      w.chats
        .find((c) => c.id === 1001)!
        .messages.find((m) => m.id === 3)!.media!.downloadFails = true;
    });
    const out = join(home, `sync-media-${n++}`);
    const first = cli(
      ["sync", "--chat", "1001", "--all", "--media", "--json", "--output", out],
      {},
      state
    );
    expect(first.code).toBe(1);
    const r = oneJson(first.out);
    expect(r.failed).toEqual([
      expect.objectContaining({
        chatId: "1001",
        code: "media_download_failed",
        messageId: 3,
      }),
    ]);
    expect(r.chats).toEqual([
      expect.objectContaining({ chatId: "1001", added: 2, lastId: 2 }),
    ]);
    expect(
      JSON.parse(readFileSync(join(out, ".sync-meta.json"), "utf-8"))["1001"]
        .lastMessageId
    ).toBe(2);
    const file = r.chats[0].file as string;
    expect(readFileSync(file, "utf-8")).not.toContain("*#3*");

    const w = JSON.parse(readFileSync(state, "utf-8"));
    delete w.chats
      .find((c: { id: number }) => c.id === 1001)
      .messages.find((m: { id: number }) => m.id === 3).media.downloadFails;
    writeFileSync(state, JSON.stringify(w));
    const again = cli(
      [
        "sync",
        "--chat",
        "1001",
        "--all",
        "--media",
        "--resume",
        "--json",
        "--output",
        out,
      ],
      {},
      state
    );
    expect(again.code).toBe(0);
    expect(oneJson(again.out).chats).toEqual([
      expect.objectContaining({ chatId: "1001", added: 3, lastId: 5 }),
    ]);
    const text = readFileSync(file, "utf-8");
    expect(text.match(/\*#3\*/g)).toHaveLength(1);
    expect(text).toContain("*#5*");
    expect(existsSync(join(out, "media", "1001"))).toBe(true);
  });
});

describe("sync --media: a file that never downloads holds the chat back only so often", () => {
  it("stops twice, then exports the message with a placeholder and moves on", async () => {
    const state = await worldFile((w) => {
      w.chats
        .find((c) => c.id === 1001)!
        .messages.find((m) => m.id === 3)!.media!.downloadFails = true;
    });
    const out = join(home, `sync-media-${n++}`);
    const run = () =>
      cli(
        [
          "sync",
          "--chat",
          "1001",
          "--all",
          "--media",
          "--resume",
          "--json",
          "--output",
          out,
        ],
        {},
        state
      );
    for (const attempt of [1, 2]) {
      const r = run();
      expect(r.code).toBe(1);
      expect(oneJson(r.out).failed[0]).toMatchObject({
        messageId: 3,
        code: "media_download_failed",
      });
      expect(oneJson(r.out).failed[0].skipped).toBeUndefined();
      expect(oneJson(r.out).failed[0].error).toContain(
        `attempt ${attempt} of 3`
      );
    }
    const third = run();
    expect(third.code).toBe(1);
    const r3 = oneJson(third.out);
    expect(r3.failed[0]).toMatchObject({ messageId: 3, skipped: true });
    expect(r3.chats[0]).toMatchObject({ lastId: 5 });
    const text = readFileSync(r3.chats[0].file, "utf-8");
    expect(text).toContain("(download failed)_");
    expect(text.match(/\*#3\*/g)).toHaveLength(1);
    expect(
      JSON.parse(readFileSync(join(out, ".sync-meta.json"), "utf-8"))["1001"]
        .mediaAttempts
    ).toBeUndefined();
    const fourth = run();
    expect(fourth.code).toBe(0);
    expect(oneJson(fourth.out).chats[0]).toMatchObject({ added: 0 });
  }, 60_000);
});

describe("sync --media: the checkpoint follows message IDs, never past one that was not exported", () => {
  const setMedia = (state: string, id: number, fails: boolean) => {
    const w = JSON.parse(readFileSync(state, "utf-8"));
    const { media } = w.chats
      .find((c: { id: number }) => c.id === 1001)
      .messages.find((m: { id: number }) => m.id === id);
    if (fails) {
      media.downloadFails = true;
    } else {
      delete media.downloadFails;
    }
    writeFileSync(state, JSON.stringify(w));
  };

  it("two messages in the same second: a failure on the earlier one stops before both", async () => {
    const state = await worldFile((w) => {
      const msgs = w.chats.find((c) => c.id === 1001)!.messages;
      const m3 = msgs.find((m) => m.id === 3)!;
      m3.media!.downloadFails = true;
      msgs.find((m) => m.id === 4)!.ago = m3.ago;
    });
    const out = join(home, `sync-media-${n++}`);
    const first = cli(
      ["sync", "--chat", "1001", "--all", "--media", "--json", "--output", out],
      {},
      state
    );
    expect(first.code).toBe(1);
    const r = oneJson(first.out);
    expect(r.chats[0]).toMatchObject({ added: 2, lastId: 2 });
    expect(
      JSON.parse(readFileSync(join(out, ".sync-meta.json"), "utf-8"))["1001"]
        .lastMessageId
    ).toBe(2);
    const file = r.chats[0].file as string;
    expect(readFileSync(file, "utf-8")).not.toMatch(/\*#[34]\*/);

    setMedia(state, 3, false);
    const again = cli(
      [
        "sync",
        "--chat",
        "1001",
        "--all",
        "--media",
        "--resume",
        "--json",
        "--output",
        out,
      ],
      {},
      state
    );
    expect(again.code).toBe(0);
    const text = readFileSync(file, "utf-8");
    expect(text.match(/\*#3\*/g)).toHaveLength(1);
    expect(text.match(/\*#4\*/g)).toHaveLength(1);
    expect(text.indexOf("*#3*")).toBeLessThan(text.indexOf("*#4*"));
  });

  it("a failure on the very first message pins --resume to it, outside the --days window", async () => {
    const state = await worldFile((w) => {
      w.chats
        .find((c) => c.id === 1001)!
        .messages.find((m) => m.id === 3)!.media!.downloadFails = true;
    });
    const out = join(home, `sync-media-${n++}`);
    const first = cli(
      [
        "sync",
        "--chat",
        "1001",
        "--days",
        "2",
        "--media",
        "--json",
        "--output",
        out,
      ],
      {},
      state
    );
    expect(first.code).toBe(1);
    expect(oneJson(first.out).failed[0]).toMatchObject({ messageId: 3 });
    expect(
      JSON.parse(readFileSync(join(out, ".sync-meta.json"), "utf-8"))["1001"]
    ).toMatchObject({ lastMessageId: 2, retryPin: true });

    setMedia(state, 3, false);
    const again = cli(
      [
        "sync",
        "--chat",
        "1001",
        "--days",
        "1",
        "--media",
        "--resume",
        "--json",
        "--output",
        out,
      ],
      {},
      state
    );
    expect(again.code).toBe(0);
    const r = oneJson(again.out);
    expect(r.chats[0]).toMatchObject({
      added: expect.any(Number),
      lastId: expect.any(Number),
    });
    const text = readFileSync(r.chats[0].file, "utf-8");
    expect(text.match(/\*#3\*/g)).toHaveLength(1);
    expect(text).toContain("*#5*");
    expect(text).not.toContain("Continues after message");
    expect(
      JSON.parse(readFileSync(join(out, ".sync-meta.json"), "utf-8"))["1001"]
        .retryPin
    ).toBeUndefined();
  });
});

describe("the write guard keeps how long to wait", () => {
  it("a rate limit while looking up the recipient: flood_wait, exit 1, retryAfterSeconds in the JSON error", () => {
    const r = cli(["send", "@alice_example", "hi", "--json"], {
      TG_MOCK_ASK: "1",
      TG_MOCK_FAIL: "FLOOD_WAIT_30",
    });
    expect(r.code).toBe(1);
    expect(oneJson(r.out).error).toMatchObject({
      code: "flood_wait",
      retryAfterSeconds: 30,
    });
  });
});

describe("10 usage errors come before any connection", () => {
  it("search --from without --chat: exit 2 on a profile that is not logged in (not 5)", () => {
    const empty = mkdtempSync(join(home, "empty-"));
    const r = cli(["search", "hi", "--from", "@alice_example", "--json"], {
      HOME: empty,
      USERPROFILE: empty,
      APPDATA: join(empty, "AppData"),
      TG_MOCK: "",
      TG_PROFILE: "empty",
      TG_NO_LIBSECRET: "1",
    });
    expect(r.code, r.out + r.err).toBe(2);
    expect(oneJson(r.out).error).toMatchObject({
      code: "invalid_argument",
      message: expect.stringContaining("--from needs --chat"),
    });
  });
});
