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
import {
  DIALOG_CACHE_TTL_MS,
  dialogCachePath,
  readDialogCache,
} from "../src/dialog-cache.js";
import { MockClient } from "../src/mock/client.js";
import { loadWorld, saveWorld, seedWorld } from "../src/mock/world.js";
import type { MockWorld } from "../src/mock/world.js";
import { setStrictChatResolution } from "../src/resolve-mode.js";

const dir = mkdtempSync(join(tmpdir(), "tg-dialog-cache-"));

afterAll(() => rmSync(dir, { recursive: true, force: true }));
let n = 0;
let fetches: ReturnType<typeof vi.spyOn>;

function world(extra: (w: MockWorld) => void = () => {}): string {
  const w = seedWorld();
  extra(w);
  const file = join(dir, `state-${n++}.json`);
  saveWorld(w, file);
  process.env.TG_MOCK = file;
  return file;
}

async function run(
  identifier: string
): Promise<{ id: string; fetches: number }> {
  const before = fetches.mock.calls.length;
  try {
    const entity = await resolveChat(await getClient(), identifier);
    return {
      id: entity.id.toString(),
      fetches: fetches.mock.calls.length - before,
    };
  } finally {
    await disconnectClient();
  }
}

beforeEach(() => {
  fetches = vi.spyOn(MockClient.prototype, "getDialogs");
});
afterEach(async () => {
  fetches.mockRestore();
  await disconnectClient();
  setStrictChatResolution(false);
  delete process.env.TG_MOCK;
});

describe("2 chat lookup by name uses a short-lived dialog list on disk", () => {
  it("a title read once is found in the next process without reading the list again", async () => {
    world();
    const first = await run("Team");
    expect(first.id).toBe("4001");
    expect(first.fetches).toBeGreaterThan(0);
    await expect(run("Team")).resolves.toEqual({ id: "4001", fetches: 0 });
    await expect(run("  team ")).resolves.toEqual({ id: "4001", fetches: 0 });
    await expect(run("-1004001")).resolves.toEqual({ id: "4001", fetches: 0 });
    await expect(run("1001")).resolves.toEqual({ id: "1001", fetches: 0 });
  });

  it('@username and "me" never read the list at all', async () => {
    world();
    expect((await run("@mock_team")).fetches).toBe(0);
    expect((await run("me")).fetches).toBe(0);
  });

  it("a read of a name the fresh list does not have is chat_not_found from disk; TG_NO_CACHE=1 reads the list once", async () => {
    const state = world();
    await run("Team");
    const w = loadWorld(state);
    w.chats.push({
      id: 4300,
      kind: "supergroup",
      title: "Brand New",
      messages: [{ id: 1, ago: 5, from: 1001, text: "hi" }],
    });
    saveWorld(w, state);
    const before = fetches.mock.calls.length;
    await expect(run("Brand New")).rejects.toMatchObject({
      code: "chat_not_found",
      listedAt: expect.any(String),
    });
    expect(fetches).toHaveBeenCalledTimes(before);
    process.env.TG_NO_CACHE = "1";
    try {
      await expect(run("Brand New")).resolves.toEqual({
        id: "4300",
        fetches: 1,
      });
    } finally {
      delete process.env.TG_NO_CACHE;
    }
    await expect(run("Brand New")).resolves.toEqual({ id: "4300", fetches: 0 });
  });

  it("a renamed chat is never taken by its old title", async () => {
    const state = world();
    await run("Team");
    const w = loadWorld(state);
    w.chats.find((c) => c.id === 4001)!.title = "Renamed";
    saveWorld(w, state);
    const r = await run("Team Design");
    expect(r.id).toBe("4002");
    const again = await run("Team");
    expect(again.id).toBe("4002");
    expect(again.fetches).toBe(1);
  });

  it("a list older than the TTL is read again", async () => {
    world();
    await run("Team");
    const file = JSON.parse(readFileSync(dialogCachePath(), "utf-8"));
    file.savedAt -= DIALOG_CACHE_TTL_MS + 1000;
    writeFileSync(dialogCachePath(), JSON.stringify(file));
    expect((await run("Team")).fetches).toBe(1);
    expect((await run("Team")).fetches).toBe(0);
  });

  it("another mock state file has a list of its own", async () => {
    world();
    await run("Team");
    const first = dialogCachePath();
    world();
    expect(dialogCachePath()).not.toBe(first);
    expect((await run("Team")).fetches).toBeGreaterThan(0);
  });

  it("a title two chats share stays ambiguous, also when the list comes from disk", async () => {
    world((w) => {
      w.chats.push({
        id: 4301,
        kind: "supergroup",
        title: "Team",
        messages: [{ id: 1, ago: 5, from: 1001, text: "x" }],
      });
    });
    await expect(run("Team")).rejects.toMatchObject({ code: "ambiguous_chat" });
    await expect(run("Team")).rejects.toMatchObject({ code: "ambiguous_chat" });
  });

  it("a write does not take a title from disk (another chat may have taken it since); an ID it does", async () => {
    world();
    await run("Team");
    setStrictChatResolution(true);
    expect((await run("Team")).fetches).toBeGreaterThan(0);
    await expect(run("-1004001")).resolves.toEqual({ id: "4001", fetches: 0 });
  });

  it("the file holds only what names a chat: no message text, no counters", async () => {
    world();
    await run("Team");
    const raw = readFileSync(dialogCachePath(), "utf-8");
    expect(raw).not.toMatch(
      /CI is green again|Ping me when you are free|unread/i
    );
    const saved = readDialogCache(JSON.parse(raw).account)!;
    expect(saved.chats.length).toBeGreaterThan(5);
    for (const c of saved.chats) {
      expect(
        Object.keys(c).every((k) =>
          ["id", "title", "username", "type", "accessHash"].includes(k)
        ),
        JSON.stringify(c)
      ).toBe(true);
    }
  });

  it("a broken file is a miss, not an error", async () => {
    world();
    writeFileSync(dialogCachePath(), "{not json");
    expect((await run("Team")).id).toBe("4001");
  });
});
