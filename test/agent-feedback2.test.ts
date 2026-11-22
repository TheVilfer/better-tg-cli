import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { disconnectClient, getClient, resolveChat } from "../src/client.js";
import { DIALOG_CACHE_TTL_MS, dialogCachePath } from "../src/dialog-cache.js";
import { MockClient } from "../src/mock/client.js";
import { loadWorld, saveWorld, seedWorld } from "../src/mock/world.js";
import type { MockWorld } from "../src/mock/world.js";
import { setStrictChatResolution } from "../src/resolve-mode.js";
import { writesTextLine } from "../src/status.js";
import { cliArgs } from "./cli.js";
import { useSpawnTimeout } from "./helpers/spawn-timeout.js";

useSpawnTimeout();

const dir = mkdtempSync(join(tmpdir(), "tg-agent-feedback2-"));

afterAll(() => rmSync(dir, { recursive: true, force: true }));
let n = 0;

function worldFile(extra: (w: MockWorld) => void = () => {}): string {
  const w = seedWorld();
  extra(w);
  const file = join(dir, `state-${n++}.json`);
  saveWorld(w, file);
  return file;
}

describe("1 a read that misses, or names several chats, is answered from the list on disk", () => {
  let fetches: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetches = vi.spyOn(MockClient.prototype, "getDialogs");
  });
  afterEach(async () => {
    fetches.mockRestore();
    await disconnectClient();
    setStrictChatResolution(false);
    delete process.env.TG_MOCK;
    delete process.env.TG_NO_CACHE;
  });

  async function run(identifier: string): Promise<{
    id?: string;
    error?: {
      code: string;
      listedAt?: string;
      hint?: string;
      candidates?: { id: string }[];
    };
    fetches: number;
  }> {
    const before = fetches.mock.calls.length;
    try {
      const entity = await resolveChat(await getClient(), identifier);
      return {
        id: entity.id.toString(),
        fetches: fetches.mock.calls.length - before,
      };
    } catch (error) {
      return {
        error: error as never,
        fetches: fetches.mock.calls.length - before,
      };
    } finally {
      await disconnectClient();
    }
  }

  function world(extra?: (w: MockWorld) => void): string {
    const file = worldFile(extra);
    process.env.TG_MOCK = file;
    return file;
  }

  it("the second process answers a miss, an ambiguous name and a numeric miss with 0 list reads", async () => {
    world();
    const first = await run("NoSuchChatAtAll");
    expect(first.error?.code).toBe("chat_not_found");
    expect(first.fetches).toBeGreaterThan(0);
    expect(first.error?.listedAt).toBeUndefined();

    const miss = await run("Teem");
    expect(miss.fetches).toBe(0);
    expect(miss.error).toMatchObject({ code: "chat_not_found" });
    expect(miss.error!.candidates![0].id).toBe("-1004001");
    expect(Date.parse(miss.error!.listedAt!)).toBeGreaterThan(
      Date.now() - DIALOG_CACHE_TTL_MS
    );
    expect(miss.error!.hint).toMatch(/up to 10 minutes old.*TG_NO_CACHE=1/);

    const ambiguous = await run("Tea");
    expect(ambiguous.fetches).toBe(0);
    expect(ambiguous.error).toMatchObject({
      code: "ambiguous_chat",
      candidates: [{ id: "-1004001" }, { id: "-1004002" }],
    });
    expect(ambiguous.error!.listedAt).toBe(miss.error!.listedAt);
    expect(ambiguous.error!.hint).toMatch(/TG_NO_CACHE=1/);

    await expect(run("Desig")).resolves.toEqual({ id: "4002", fetches: 0 });
  });

  it("an ID the list does not have reads the first page: a chat newer than the list is found by ID", async () => {
    const state = world();
    await run("Family");
    const w = loadWorld(state);
    w.chats.push({
      id: 4300,
      kind: "supergroup",
      title: "Brand New",
      messages: [{ id: 1, ago: 5, from: 1001, text: "hi" }],
    });
    saveWorld(w, state);
    await expect(run("-1004300")).resolves.toEqual({ id: "4300", fetches: 1 });
    expect((await run("-1009999")).error?.code).toBe("chat_not_found");
  });

  it("a duplicate exact title is ambiguous_chat from disk", async () => {
    world((w) => {
      w.chats.push({
        id: 4301,
        kind: "supergroup",
        title: "Team",
        messages: [{ id: 1, ago: 5, from: 1001, text: "x" }],
      });
    });
    await run("Family");
    const r = await run("Team");
    expect(r.fetches).toBe(0);
    expect(r.error).toMatchObject({ code: "ambiguous_chat" });
    expect(r.error!.listedAt).toBeDefined();
  });

  it("a write keeps reading a fresh list, without listedAt", async () => {
    world();
    await run("Family");
    setStrictChatResolution(true);
    const r = await run("Tea");
    expect(r.fetches).toBeGreaterThan(0);
    expect(r.error?.code).toBe("chat_not_exact");
    expect(r.error?.listedAt).toBeUndefined();
  });

  it("TG_NO_CACHE=1 reads the list again (and saves it); a stale list is read once", async () => {
    world();
    await run("Family");
    process.env.TG_NO_CACHE = "1";
    const r = await run("NoSuchChatAtAll");
    expect(r.fetches).toBeGreaterThan(0);
    expect(r.error?.listedAt).toBeUndefined();
    delete process.env.TG_NO_CACHE;
    const file = JSON.parse(readFileSync(dialogCachePath(), "utf-8"));
    file.savedAt -= DIALOG_CACHE_TTL_MS + 1000;
    writeFileSync(dialogCachePath(), JSON.stringify(file));
    expect((await run("NoSuchChatAtAll")).fetches).toBe(1);
    expect((await run("NoSuchChatAtAll")).fetches).toBe(0);
  });
});

const home = mkdtempSync(join(tmpdir(), "tg-agent-feedback2-home-"));

afterAll(() => rmSync(home, { recursive: true, force: true }));

function env(state: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
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

function cli(args: string[], state: string, extra: NodeJS.ProcessEnv = {}) {
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: "utf-8",
    env: env(state, extra),
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    code: r.status,
    out: r.stdout,
    err: r.stderr.replace(/^MOCK MODE.*\n/m, ""),
  };
}

describe("2 TG_LOG_LEVEL=debug says whether chat lookup used the list on disk", () => {
  it("refresh first, then hit; one line on stderr, nothing on stdout", () => {
    const state = worldFile();
    const first = cli(["read", "Team", "-n", "1", "--json"], state, {
      TG_LOG_LEVEL: "debug",
    });
    expect(first.code).toBe(0);
    expect(first.err.match(/^dialog cache: .*$/gm)).toEqual([
      expect.stringMatching(/^dialog cache: refresh/),
    ]);
    expect(first.out).not.toMatch(/dialog cache/);
    const second = cli(["read", "NoSuchChatAtAll", "--json"], state, {
      TG_LOG_LEVEL: "debug",
    });
    expect(second.err.match(/^dialog cache: .*$/gm)).toEqual([
      expect.stringMatching(/^dialog cache: hit/),
    ]);
    expect(cli(["read", "Team", "-n", "1", "--json"], state).err).not.toMatch(
      /dialog cache/
    );
  });
});

describe("3 every candidate carries the command that re-runs the call with its ID", () => {
  it.each([
    [["read", "Tea", "-n", "1", "--json"], "ambiguous_chat", "Tea"],
    [["search", "green", "--chat", "Tea", "--json"], "ambiguous_chat", "Tea"],
    [["read", "Teem", "-n", "1", "--json"], "chat_not_found", "Teem"],
  ] as const)(
    "%j",
    (args, code, name) => {
      const state = worldFile();
      const { error } = JSON.parse(cli([...args], state).out);
      expect(error.code).toBe(code);
      expect(error.hint).toBeTypeOf("string");
      expect(error.candidates.length).toBeGreaterThan(0);
      for (const c of error.candidates) {
        expect(c.command).toEqual(args.map((a) => (a === name ? c.id : a)));
        expect(cli(c.command, state).code, c.command.join(" ")).toBe(0);
      }
    },
    60_000
  );

  it("a write gets candidates but never a ready command to send to one of them", () => {
    const state = worldFile();
    const { error } = JSON.parse(
      cli(["send", "Teem", "hi", "--json"], state).out
    );
    expect(error.code).toBe("chat_not_found");
    expect(error.candidates.length).toBeGreaterThan(0);
    for (const c of error.candidates) {
      expect(c).not.toHaveProperty("command");
    }
  });
});

describe("4 inbox: people, then bots, then groups and channels, then muted", () => {
  const state = () =>
    worldFile((w) => {
      const bot = w.chats.find((c) => c.id === 2001)!;
      bot.unread = 4;
      bot.messages.push({ id: 90, ago: 10, from: 2001, text: "Bot says hi" });
    });

  it('JSON order and "bot": true', () => {
    const chats = JSON.parse(cli(["inbox", "--json"], state()).out).chats as {
      id: string;
      bot?: boolean;
      muted: boolean;
      type: string;
    }[];
    const rank = (c: (typeof chats)[number]) =>
      c.muted ? 3 : c.type === "user" ? (c.bot ? 1 : 0) : 2;
    expect(chats.map(rank)).toEqual(chats.map(rank).sort());
    expect(chats.find((c) => c.id === "2001")).toMatchObject({ bot: true });
    expect(chats.map((c) => c.id).slice(0, 2)).toEqual(["1001", "2001"]);
  });

  it("--no-bots hides bots", () => {
    const json = JSON.parse(cli(["inbox", "--no-bots", "--json"], state()).out);
    expect(json.chats.some((c: { bot?: boolean }) => c.bot)).toBe(false);
    expect(json.chats.length).toBeGreaterThan(3);
  });
});

describe("5 check prints the write mode once", () => {
  it.each([[{}], [{ TG_MOCK_ASK: "1" }]])("%j", (extra) => {
    const { out } = cli(["check"], worldFile(), extra);
    expect(out).toMatch(/^Writes: (ON|ASK) — .*\(mock: /m);
    expect(out).not.toMatch(/^Write mode/m);
  });

  it("the real-account line keeps the time limit, the expiry and how to turn writes on", () => {
    const until = "2030-01-02T03:04:05.000Z";
    const local = new Date(until).toLocaleString();
    expect(writesTextLine({ writeMode: "on" })).toBe(
      "Writes: ON — messages are sent without confirmation"
    );
    expect(writesTextLine({ writeMode: "ask", writeUntil: until })).toBe(
      `Writes: ASK — each write waits for the user's approval (until ${local})`
    );
    expect(
      writesTextLine({
        writeMode: "read-only",
        writeUntil: until,
        writeModeExpired: true,
      })
    ).toBe(
      `Writes: OFF — read-only, every write is refused (the last mode expired ${local}; to write: telegram write-access ask)`
    );
  });
});
