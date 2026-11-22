import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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

import {
  disconnectClient,
  getClient,
  getDialogs,
  resolveChat,
} from "../src/client.js";
import { dialogCachePath, logDialogCache } from "../src/dialog-cache.js";
import { MockClient } from "../src/mock/client.js";
import { saveWorld, seedWorld } from "../src/mock/world.js";
import type { MockWorld } from "../src/mock/world.js";
import { cliArgs } from "./cli.js";
import { useSpawnTimeout } from "./helpers/spawn-timeout.js";

useSpawnTimeout();

const dir = mkdtempSync(join(tmpdir(), "tg-agent-feedback3-"));

afterAll(() => rmSync(dir, { recursive: true, force: true }));
let n = 0;

function worldFile(extra: (w: MockWorld) => void = () => {}): string {
  const w = seedWorld();
  extra(w);
  const file = join(dir, `state-${n++}.json`);
  saveWorld(w, file);
  return file;
}

function crowded(w: MockWorld): void {
  for (let i = 0; i < 600; i++) {
    w.chats.push({
      id: 7000 + i,
      kind: "supergroup",
      title: `Filler ${i}`,
      messages: [{ id: 1, ago: 30 * 86_400, from: 1002, text: "x" }],
    } as never);
  }
}

describe("1 inbox and chats share the dialog list with chat lookup", () => {
  let fetches: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetches = vi.spyOn(MockClient.prototype, "getDialogs");
    process.env.TG_MOCK = worldFile();
  });
  afterEach(async () => {
    fetches.mockRestore();
    await disconnectClient();
    delete process.env.TG_MOCK;
  });

  it("a whole list read by inbox is saved, and the next process names a chat with 0 list reads", async () => {
    expect(existsSync(dialogCachePath())).toBe(false);
    const chats = await getDialogs(await getClient(), 500);
    expect(chats.some((c) => c.unreadCount > 0)).toBe(true);
    await disconnectClient();
    const saved = JSON.parse(readFileSync(dialogCachePath(), "utf-8"));
    expect(saved.complete).toBe(true);
    expect(
      Object.keys(saved.chats[0]).every((k) =>
        ["id", "title", "username", "type", "accessHash"].includes(k)
      )
    ).toBe(true);
    expect(JSON.stringify(saved)).not.toMatch(/unread|lastMessage|message/i);

    const before = fetches.mock.calls.length;
    const entity = await resolveChat(await getClient(), "Team Design");
    expect(entity.id.toString()).toBe("4002");
    expect(fetches.mock.calls.length - before).toBe(0);
  });

  it("a short list cut at the limit (chats -n 3) saves nothing", async () => {
    await getDialogs(await getClient(), 3);
    await disconnectClient();
    expect(existsSync(dialogCachePath())).toBe(false);
  });

  it("within one process the list is read once: inbox after a lookup, and a lookup after inbox", async () => {
    const client = await getClient();
    await resolveChat(client, "Team Design");
    const afterLookup = fetches.mock.calls.length;
    expect(afterLookup).toBeGreaterThan(0);
    await getDialogs(client, 500);
    expect(fetches).toHaveBeenCalledTimes(afterLookup);
    await disconnectClient();

    const fresh = await getClient();
    await getDialogs(fresh, 500);
    const afterInbox = fetches.mock.calls.length;
    await resolveChat(fresh, "Desig");
    expect(fetches).toHaveBeenCalledTimes(afterInbox);
  });

  it("on a big account a cut inbox page never replaces the whole list a lookup saved", async () => {
    process.env.TG_MOCK = worldFile(crowded);
    await resolveChat(await getClient(), "Team Design");
    await disconnectClient();
    expect(JSON.parse(readFileSync(dialogCachePath(), "utf-8"))).toMatchObject({
      complete: true,
    });
    expect(
      JSON.parse(readFileSync(dialogCachePath(), "utf-8")).chats.length
    ).toBeGreaterThan(600);

    const page = await getDialogs(await getClient(), 500);
    expect(page).toHaveLength(500);
    await disconnectClient();
    const saved = JSON.parse(readFileSync(dialogCachePath(), "utf-8"));
    expect(saved.complete).toBe(true);
    expect(saved.chats.length).toBeGreaterThan(600);

    const before = fetches.mock.calls.length;
    expect(
      (await resolveChat(await getClient(), "Filler 599")).id.toString()
    ).toBe("7599");
    expect(fetches.mock.calls.length - before).toBe(0);
  });

  it("with no fresh list, a cut inbox page is saved as incomplete: IDs resolve from it, titles read the list", async () => {
    process.env.TG_MOCK = worldFile(crowded);
    await getDialogs(await getClient(), 500);
    await disconnectClient();
    expect(JSON.parse(readFileSync(dialogCachePath(), "utf-8"))).toMatchObject({
      complete: false,
    });
    let before = fetches.mock.calls.length;
    await resolveChat(await getClient(), "-1004002");
    expect(fetches.mock.calls.length - before).toBe(0);
    await disconnectClient();
    before = fetches.mock.calls.length;
    await resolveChat(await getClient(), "Team Design");
    expect(fetches.mock.calls.length - before).toBeGreaterThan(0);
  });

  it("archived-only lists and an old in-memory list are read from Telegram again", async () => {
    const client = await getClient();
    await getDialogs(client, 500);
    const first = fetches.mock.calls.length;
    await getDialogs(client, 500, { archived: true });
    expect(fetches).toHaveBeenCalledTimes(first + 1);
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now + 60_000);
    try {
      await getDialogs(client, 500);
    } finally {
      clock.mockRestore();
    }
    expect(fetches).toHaveBeenCalledTimes(first + 2);
  });
});

const home = mkdtempSync(join(tmpdir(), "tg-agent-feedback3-home-"));

afterAll(() => rmSync(home, { recursive: true, force: true }));

function cli(args: string[], state: string, extra: NodeJS.ProcessEnv = {}) {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^(TG|OP)_/i.test(k))
  );
  Object.assign(
    env,
    {
      HOME: home,
      USERPROFILE: home,
      APPDATA: join(home, "AppData"),
      TG_MOCK: state,
      TG_NO_UPDATE_CHECK: "1",
    },
    extra
  );
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], {
    encoding: "utf-8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const err = r.stderr
    .replace(/^MOCK MODE.*\n/m, "")
    .replaceAll(/^\(node:\d+\) .*\n(\(Use `node --trace-warnings.*\n)?/gm, "");
  return { code: r.status, out: r.stdout, err };
}

describe("1 (CLI) inbox, then read <title> in a new process", () => {
  it("the read is answered from the list inbox saved", () => {
    const state = worldFile();
    expect(cli(["inbox", "--json"], state).code).toBe(0);
    const read = cli(["read", "Team Design", "-n", "1", "--json"], state, {
      TG_DEBUG_CACHE: "1",
    });
    expect(read.code).toBe(0);
    expect(read.err.match(/^dialog cache: .*$/gm)).toEqual([
      expect.stringMatching(/^dialog cache: hit "Team Design" -> -1004002 /),
    ]);
  });

  it("chats -q saves the list too", () => {
    const state = worldFile();
    expect(
      cli(["chats", "-q", "Team", "--preview", "0", "--json"], state).code
    ).toBe(0);
    const read = cli(["read", "Teem", "--json"], state, {
      TG_DEBUG_CACHE: "1",
    });
    expect(read.err.match(/^dialog cache: .*$/gm)).toEqual([
      expect.stringMatching(/^dialog cache: hit "Teem" -> chat_not_found/),
    ]);
  });
});

describe("2 the chat_not_found command keeps --json", () => {
  it("with --json the command and the hint carry it, and the command runs as given", () => {
    const state = worldFile();
    const { error } = JSON.parse(
      cli(["read", "Teem", "-n", "1", "--json"], state).out
    );
    expect(error.code).toBe("chat_not_found");
    expect(error.command).toEqual([
      "chats",
      "-q",
      "Teem",
      "--preview",
      "0",
      "--json",
    ]);
    expect(error.hint).toMatch(/telegram chats -q Teem --preview 0 --json/);
    const run = cli(error.command, state);
    expect(run.code).toBe(0);
    expect(() => JSON.parse(run.out)).not.toThrow();
  });

  it("without --json it stays a text command", () => {
    const state = worldFile();
    const r = cli(["read", "Teem", "-n", "1"], state);
    expect(r.code).not.toBe(0);
    expect(r.err + r.out).toMatch(/chats -q Teem --preview 0(?! --json)/);
  });

  it("sync --chat keeps --json too", () => {
    const state = worldFile();
    const r = cli(
      [
        "sync",
        "--chat",
        "NoSuchChatAtAll",
        "--output",
        join(dir, "sync"),
        "--json",
      ],
      state
    );
    const { error } = JSON.parse(r.out);
    expect(error.code).toBe("chat_not_found");
    expect(error.command).toEqual([
      "chats",
      "-q",
      "NoSuchChatAtAll",
      "--preview",
      "0",
      "--json",
    ]);
  });
});

describe("3 TG_DEBUG_CACHE=1 prints only the dialog cache line", () => {
  afterEach(() => {
    delete process.env.TG_DEBUG_CACHE;
    delete process.env.TG_LOG_LEVEL;
  });

  function captured(fn: () => void): string {
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      fn();
      return write.mock.calls.map((c) => String(c[0])).join("");
    } finally {
      write.mockRestore();
    }
  }

  it("the knob, debug level, and neither", () => {
    expect(captured(() => logDialogCache("x"))).toBe("");
    process.env.TG_DEBUG_CACHE = "1";
    expect(captured(() => logDialogCache("x"))).toBe("dialog cache: x\n");
    delete process.env.TG_DEBUG_CACHE;
    process.env.TG_LOG_LEVEL = "debug";
    expect(captured(() => logDialogCache("x"))).toBe("dialog cache: x\n");
  });

  it("in the CLI: one line, none of teleproto debug", () => {
    const state = worldFile();
    const r = cli(["read", "Team Design", "-n", "1", "--json"], state, {
      TG_DEBUG_CACHE: "1",
    });
    expect(r.code).toBe(0);
    expect(r.err.trim().split("\n")).toEqual([
      expect.stringMatching(/^dialog cache: refresh "Team Design"/),
    ]);
    expect(r.out).not.toMatch(/dialog cache/);
  });
});
