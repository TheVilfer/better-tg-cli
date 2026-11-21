import type { TelegramClient } from "teleproto";
import { afterEach, describe, expect, it } from "vitest";

import { MockClient, resetMockHistoryFlood } from "../src/mock/client.js";
import { seedWorld } from "../src/mock/world.js";
import type { MockWorld } from "../src/mock/world.js";
import { grantedApi, PAGE_CHARS } from "../src/plugins/host.js";
import type {
  CursorStore,
  HostContext,
  HostState,
} from "../src/plugins/host.js";
import type { Effect, Manifest, Permission } from "../src/plugins/manifest.js";
import { buildProposal } from "../src/plugins/proposals.js";
import { memoryCursors, memoryStorage } from "../src/plugins/run.js";
import { HostError } from "../src/plugins/sandbox-types.js";

const ALL: Permission[] = [
  "identity:read",
  "messages:read-own",
  "chats:read",
  "messages:read",
  "messages:read-target",
  "storage:read",
  "storage:write",
  "settings:read",
  "actions",
];
const LOGIN = "Login code: 52813. Do not give it to anyone";

function world(): MockWorld {
  const w = seedWorld();
  w.users.push(
    { id: 777_000, firstName: "Telegram" },
    { id: 489_000, firstName: "Verification Codes" }
  );
  w.chats.push(
    { id: 777_000, kind: "user", messages: [{ id: 1, ago: 60, text: LOGIN }] },
    {
      id: 489_000,
      kind: "user",
      messages: [{ id: 1, ago: 70, text: "Your code 4417 for Shop" }],
    }
  );
  const alice = w.chats.find((c) => c.id === 1001)!;
  alice.messages.push(
    {
      id: 50,
      ago: 10,
      out: true,
      text: "your code: 99887 and t.me/giftcode/ABCDEF",
    },
    { id: 51, ago: 9, out: true, text: LOGIN, forwardedFrom: 777_000 },
    {
      id: 52,
      ago: 8,
      out: true,
      text: "thanks, got 52813",
      quoteFrom: 777_000,
      quoteText: LOGIN,
    },
    { id: 53, ago: 7, text: "incoming text" }
  );
  return w;
}

function setup(
  opts: {
    permissions?: Permission[];
    effects?: Effect[];
    target?: HostContext["target"];
    mcp?: boolean;
    w?: MockWorld;
    account?: string;
    log?: boolean;
    cursors?: CursorStore;
    installId?: string;
    client?: TelegramClient;
    deadline?: number;
  } = {}
) {
  const w = opts.w ?? world();
  const client =
    opts.client ?? (new MockClient(w) as unknown as TelegramClient);
  const manifest = {
    name: "lab",
    version: "1.0.0",
    permissions: opts.permissions ?? ALL,
    storage: { keys: ["notes"], quotaBytes: 4096 },
    settings: {
      tone: { type: "string", description: "Tone", default: "warm" },
    },
  } as unknown as Manifest;
  const command = {
    name: "go",
    description: "",
    effects: opts.effects ?? [],
    input: { type: "object" },
    output: { type: "object" },
  };
  const storage = memoryStorage(manifest);
  const state: HostState = { proposals: [] };
  const logged: string[] = [];
  const accounts: string[] = [];
  const ctx: HostContext = {
    manifest,
    command,
    client: async () => client,
    account: async () => {
      accounts.push("account");
      return opts.account ?? String(w.me);
    },
    storage: async () => storage,
    cursors: opts.cursors ?? sharedCursors,
    installId: opts.installId ?? "test-install",
    deadline: opts.deadline ?? Date.now() + 60_000,
    target: opts.target,
    maskProposals: !!opts.mcp,
    ...(opts.log ? { log: (l: string) => logged.push(l) } : {}),
  };
  const api = grantedApi(ctx, state);
  const callWith = async (
    signal: AbortSignal,
    name: string,
    ...args: unknown[]
  ) => {
    if (!Object.hasOwn(api, name)) {
      throw new Error(`not granted: ${name}`);
    }
    return JSON.parse(
      JSON.stringify(
        await api[name](JSON.parse(JSON.stringify(args)) as unknown[], signal)
      )
    ) as any;
  };
  const call = (name: string, ...args: unknown[]) =>
    callWith(new AbortController().signal, name, ...args);
  return { api, call, callWith, state, storage, logged, w, accounts };
}

const sharedCursors = memoryCursors();

const texts = (v: unknown) => JSON.stringify(v);

afterEach(() => {
  delete process.env.TG_MOCK_FLOOD_HISTORY;
  resetMockHistoryFlood();
});

describe("host API: grants", () => {
  it("a command without effects gets no writes even with the permissions; host.log only in plugin dev", () => {
    const read = Object.keys(setup({ effects: [] }).api).sort();
    expect(read).not.toContain("storage.set");
    expect(read).not.toContain("storage.delete");
    expect(read).not.toContain("actions.propose");
    expect(read).not.toContain("log");
    const write = Object.keys(setup({ effects: ["storage", "actions"] }).api);
    expect(write).toEqual(
      expect.arrayContaining([
        "storage.set",
        "storage.delete",
        "actions.propose",
      ])
    );
    expect(Object.keys(setup({ log: true }).api)).toContain("log");
  });

  it("each API needs its permission", () => {
    expect(
      Object.keys(
        setup({ permissions: [], effects: ["storage", "actions"] }).api
      )
    ).toEqual([]);
    expect(Object.keys(setup({ permissions: ["identity:read"] }).api)).toEqual([
      "me",
    ]);
    expect(
      Object.keys(setup({ permissions: ["messages:read-target"] }).api).sort()
    ).toEqual(["target.message", "target.thread"]);
  });

  it("storage takes declared keys and strings only; settings give the declared default", async () => {
    const { call } = setup({ effects: ["storage"] });
    await expect(call("storage.get", "other")).rejects.toMatchObject({
      code: "invalid_argument",
    });
    await expect(call("storage.set", "notes", { a: 1 })).rejects.toMatchObject({
      code: "invalid_argument",
    });
    await call("storage.set", "notes", "hello");
    await expect(call("storage.get", "notes")).resolves.toBe("hello");
    expect(
      (await call("storage.list")).items.map((i: { key: string }) => i.key)
    ).toEqual(["notes"]);
    await expect(call("settings.get", "tone")).resolves.toBe("warm");
    await expect(call("settings.get", "__proto__")).rejects.toMatchObject({
      code: "invalid_argument",
    });
  });
});

describe("host API: masking of service sources through every read API", () => {
  it("messages.mine: own text only, no forwards, no quotes of a service, no service chats; codes masked (echo)", async () => {
    const page = await setup().call("messages.mine", {
      limit: 100,
      types: ["private", "group"],
    });
    const all = texts(page);
    expect(all).not.toContain("52813");
    expect(all).not.toContain("4417");
    expect(all).not.toContain("99887");
    expect(all).not.toContain("ABCDEF");
    expect(all).not.toContain("incoming text");
    expect(all).not.toContain("thanks, got");
    expect(
      page.messages.some((m: { text: string }) =>
        m.text.startsWith("your code: [login code hidden]")
      )
    ).toBe(true);
    expect(
      page.messages.every(
        (m: object) => Object.keys(m).sort().join(",") === "chatType,date,text"
      )
    ).toBe(true);
    expect(page).toMatchObject({ done: true, cursor: null });
  });

  it("messages.read: a service chat, a forward and a quote of one at the level service", async () => {
    const { call } = setup();
    const service = await call("messages.read", "777000", {});
    expect(texts(service)).not.toContain("52813");
    expect(service.messages[0]).toMatchObject({ service: true });
    const alice = await call("messages.read", "1001", { limit: 10 });
    const byId = (id: number) =>
      alice.messages.find((m: { id: number }) => m.id === id);
    expect(byId(51)).toMatchObject({ service: true, forwarded: true });
    expect(byId(52)).toMatchObject({ service: true });
    expect(byId(52).text).not.toContain("52813");
    expect(byId(50).text).toBe(
      "your code: [login code hidden] and t.me/giftcode/[gift code hidden]"
    );
    expect(texts(alice)).not.toMatch(/quoteText|buttons|entities/);
  });

  it("messages.search (global and in a chat) and both target APIs", async () => {
    const { call } = setup({
      target: { chat: "777000", msgId: 1, thread: false },
    });
    const global = await call("messages.search", "code");
    expect(global.messages.length).toBeGreaterThan(0);
    expect(texts(global)).not.toContain("52813");
    expect(texts(global)).not.toContain("4417");
    expect(
      texts(await call("messages.search", "code", { chat: "489000" }))
    ).not.toContain("4417");
    const target = await call("target.message");
    expect(target.message).toMatchObject({ id: 1, service: true });
    expect(texts(target)).not.toContain("52813");
    await expect(call("target.thread")).rejects.toMatchObject({
      code: "not_available",
    });
  });

  it("chats.list gives no previews; me gives the owner", async () => {
    const { call } = setup();
    const { chats } = await call("chats.list", { limit: 50 });
    expect(chats.length).toBeGreaterThan(0);
    for (const c of chats) {
      expect(Object.keys(c).sort()).toEqual([
        "id",
        "muted",
        "title",
        "type",
        "unreadCount",
      ]);
    }
    expect(texts(chats)).not.toContain("52813");
    await expect(call("me")).resolves.toEqual({
      id: "1000",
      name: "Mock Owner",
      username: "mock_owner",
    });
  });

  it("a target is only what the run was given; a chat is an ID or @username, never a title", async () => {
    const none = setup();
    await expect(none.call("target.message")).rejects.toMatchObject({
      code: "no_target",
    });
    await expect(
      none.call("messages.read", "Alice Example")
    ).rejects.toMatchObject({ code: "invalid_argument" });
    const thread = setup({
      target: { chat: "-1004003", topic: 1, thread: false },
    });
    await expect(thread.call("target.message")).rejects.toMatchObject({
      code: "not_available",
    });
    expect(
      Array.isArray((await thread.call("target.thread", { limit: 5 })).messages)
    ).toBe(true);
  });
});

describe("host API: messages.mine pages and cursor", () => {
  function bigWorld(): MockWorld {
    const w = world();
    const alice = w.chats.find((c) => c.id === 1001)!;
    for (let i = 0; i < 150; i++) {
      alice.messages.push({
        id: 100 + i,
        ago: 1000 + i,
        out: true,
        text: `${"long text ".repeat(50)}#${i}`,
      });
    }
    return w;
  }

  it("a page stays under the size bound; following the cursor gives every message once, in a stable order", async () => {
    const w = bigWorld();
    const { call } = setup({ w });
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let pages = 0; pages < 20; pages++) {
      const page = await call("messages.mine", {
        limit: 2000,
        ...(cursor ? { cursor } : {}),
      });
      expect(JSON.stringify(page.messages).length).toBeLessThanOrEqual(
        PAGE_CHARS
      );
      seen.push(...page.messages.map((m: { text: string }) => m.text));
      cursor = page.cursor;
      if (page.done) {
        break;
      }
    }
    expect(cursor).toBeNull();
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.filter((t) => t.startsWith("long text"))).toHaveLength(150);
    const again = await setup({ w }).call("messages.mine", { limit: 3 });
    expect(again.messages.map((m: { text: string }) => m.text)).toEqual(
      seen.slice(0, 3)
    );
  });

  it("the cursor is an opaque random id: it reveals no chat, and garbage, forged, other-account and other-install ids are refused", async () => {
    const { call } = setup();
    await expect(
      call("messages.mine", { cursor: "not a cursor!" })
    ).rejects.toMatchObject({ code: "invalid_cursor" });
    const first = await call("messages.mine", {
      limit: 1,
      types: ["private", "group"],
    });
    expect(first.cursor).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const decoded = Buffer.from(first.cursor, "base64url");
    expect(decoded).toHaveLength(16);
    expect(decoded.toString("latin1")).not.toMatch(/1001|1002|-100|"c"/);
    await expect(
      call("messages.mine", { cursor: "A".repeat(22) })
    ).rejects.toMatchObject({ code: "invalid_cursor" });
    await expect(
      setup({ account: "2000" }).call("messages.mine", { cursor: first.cursor })
    ).rejects.toMatchObject({
      code: "invalid_cursor",
      message: expect.stringMatching(/another account/),
    });
    await expect(
      setup({ cursors: memoryCursors(), installId: "other" }).call(
        "messages.mine",
        { cursor: first.cursor }
      )
    ).rejects.toMatchObject({ code: "invalid_cursor" });
    await expect(
      setup({ installId: "other" }).call("messages.mine", {
        cursor: first.cursor,
      })
    ).rejects.toMatchObject({
      code: "invalid_cursor",
      message: expect.stringMatching(/another installation/),
    });
    expect(
      (await call("messages.mine", { limit: 1, cursor: first.cursor })).count
    ).toBe(1);
  });

  it("a cursor expires after 24 hours; the store keeps a bounded number", async () => {
    let now = Date.now();
    const store = memoryCursors(3, 24 * 3600e3, () => now);
    const { call } = setup({ cursors: store });
    const first = await call("messages.mine", {
      limit: 1,
      types: ["private", "group"],
    });
    now += 24 * 3600e3 + 1;
    await expect(
      call("messages.mine", { cursor: first.cursor })
    ).rejects.toMatchObject({
      code: "invalid_cursor",
      message: expect.stringMatching(/expired/),
    });
    const ids = [1, 2, 3, 4].map((n) => store.save({ n }));
    expect(store.load(ids[0])).toBeUndefined();
    expect(store.load(ids[3])).toEqual({ n: 4 });
  });

  it("FLOOD_WAIT: an error with retryAfterSeconds, the cursor to continue from and what was collected", async () => {
    const w = world();
    const full = await setup({ w }).call("messages.mine", {
      limit: 100,
      types: ["private", "group"],
    });
    process.env.TG_MOCK_FLOOD_HISTORY = "1:7";
    resetMockHistoryFlood();
    const { call, state } = setup({ w });
    let error:
      | {
          code: string;
          retryAfterSeconds: number;
          cursor: string;
          partial: { messages: { text: string }[]; count: number };
        }
      | undefined;
    try {
      await call("messages.mine", { limit: 100, types: ["private", "group"] });
    } catch (error_) {
      expect(error_).toBeInstanceOf(HostError);
      const h = error_ as HostError;
      error = {
        code: h.code,
        ...(h.extra as Omit<NonNullable<typeof error>, "code">),
      };
    }
    expect(error).toMatchObject({
      code: "flood_wait",
      retryAfterSeconds: 7,
      cursor: expect.any(String),
    });
    expect(error!.partial.count).toBe(error!.partial.messages.length);
    expect(state.flood).toMatchObject({
      retryAfterSeconds: 7,
      cursor: error!.cursor,
    });
    delete process.env.TG_MOCK_FLOOD_HISTORY;
    const rest = await setup({ w }).call("messages.mine", {
      limit: 100,
      cursor: error!.cursor,
    });
    const texts2 = [...error!.partial.messages, ...rest.messages].map(
      (m) => m.text
    );
    expect(texts2).toEqual(full.messages.map((m: { text: string }) => m.text));
  });
});

describe("proposals: built by the host from checked fields", () => {
  it("send, reply and react: summary, argv and stdin from the same values", () => {
    expect(
      buildProposal(
        { type: "send", chat: "@alice_example", text: "Hi\nthere", topic: 3 },
        1,
        false
      )
    ).toEqual({
      id: "p1",
      type: "send",
      confirm: true,
      stdin: "Hi\nthere",
      argv: ["send", "@alice_example", "-", "--topic", "3"],
      summary: 'Send to @alice_example (topic 3): "Hi\\\\u{a}there"',
    });
    expect(
      buildProposal(
        { type: "reply", chat: 1001, msgId: 5, text: "ok" },
        2,
        false
      )
    ).toMatchObject({ argv: ["reply", "1001", "5", "-"], stdin: "ok" });
    expect(
      buildProposal(
        { type: "react", chat: "-1004001", msgId: 2, emoji: "👍" },
        3,
        false
      )
    ).toMatchObject({ argv: ["react", "-1004001", "2", "👍"] });
    expect(
      buildProposal(
        { type: "react", chat: "-1004001", msgId: 2, emoji: "👍" },
        3,
        false
      )
    ).not.toHaveProperty("stdin");
  });

  it("anything else is refused: unknown types and fields, a title for a chat, an option for an emoji", () => {
    const bad = [
      { type: "delete", chat: "1", msgId: 1 },
      { type: "send", chat: "1", text: "x", argv: ["send", "@x", "y"] },
      { type: "send", chat: "1", text: "x", summary: "harmless" },
      { type: "send", chat: "Alice Example", text: "x" },
      { type: "send", chat: "--help", text: "x" },
      { type: "send", chat: "1", text: "" },
      { type: "send", chat: "1", text: "x".repeat(4097) },
      { type: "reply", chat: "1", msgId: 1.5, text: "x" },
      { type: "react", chat: "1", msgId: 1, emoji: "--remove" },
      { type: "react", chat: "1", msgId: 1, emoji: "👍 👎" },
      { __proto__: { type: "send" }, chat: "1", text: "x" },
      ["send"],
      null,
    ];
    for (const b of bad) {
      expect(() => buildProposal(b, 1, false), JSON.stringify(b)).toThrow(
        HostError
      );
    }
  });

  it("over MCP the text is masked before the command is built", () => {
    const p = buildProposal(
      { type: "send", chat: "1", text: "Your code: 12345" },
      1,
      true
    );
    expect(p.stdin).toBe("Your code: [login code hidden]");
    expect(p.summary).toContain("[login code hidden]");
  });

  it("actions.propose collects proposals for the envelope; at most 20", async () => {
    const { call, state } = setup({ effects: ["actions"] });
    await expect(
      call("actions.propose", {
        type: "react",
        chat: "1001",
        msgId: 5,
        emoji: "👍",
      })
    ).resolves.toEqual({ id: "p1" });
    expect(state.proposals).toHaveLength(1);
    for (let i = 0; i < 19; i++) {
      await call("actions.propose", {
        type: "react",
        chat: "1001",
        msgId: 5,
        emoji: "👍",
      });
    }
    await expect(
      call("actions.propose", {
        type: "react",
        chat: "1001",
        msgId: 5,
        emoji: "👍",
      })
    ).rejects.toMatchObject({ code: "plugin_limit" });
  });
});

describe("command schemas", () => {
  it("no regular expressions in command schemas (the host checks plugin values on its own thread)", async () => {
    const { commandSchemaProblems } =
      await import("../src/plugins/json-schema.js");
    expect(
      commandSchemaProblems({
        type: "object",
        properties: { a: { type: "string", pattern: "^(a+)+$" } },
      })
    ).toEqual([expect.stringMatching(/"pattern" at \/properties\/a/)]);
    expect(
      commandSchemaProblems({ type: "object", patternProperties: { "^x": {} } })
    ).toHaveLength(1);
    expect(
      commandSchemaProblems({ type: "object", unevaluatedProperties: false })
    ).toEqual([
      expect.stringMatching(
        /Unsupported JSON Schema keyword "unevaluatedProperties"/
      ),
    ]);
    expect(
      commandSchemaProblems({
        type: "object",
        properties: { a: { enum: [1, null] } },
      })
    ).toEqual([]);
  });

  it("a check that takes too long stops with SchemaTimeoutError", async () => {
    const { validate, SchemaTimeoutError } =
      await import("../src/plugins/json-schema.js");
    const value = Array.from({ length: 20_000 }, (_, i) => ({ i }));
    expect(() =>
      validate({ type: "array", uniqueItems: true }, value, 20, 50)
    ).toThrow(SchemaTimeoutError);
    expect(
      validate(
        { type: "array", uniqueItems: true },
        value.slice(0, 100),
        20,
        1000
      )
    ).toEqual([]);
  });
});

describe("review fixes: target IDs, saved-from service sources, lazy account, mine budget and cancellation", () => {
  it("#1 a target with ID 0 is refused at parsing and by the host; a thread target reads only its own replies", async () => {
    const { parseTarget } = await import("../src/plugins/run.js");
    for (const t of [
      "1001:0",
      "1001@0",
      "1001:2147483648",
      "1001@00",
      "1001:9999999999",
    ]) {
      expect(() => parseTarget(t, false), t).toThrow(/from 1 to 2147483647/);
    }
    expect(() => parseTarget("1001:0", true)).toThrow(/from 1 to 2147483647/);
    expect(parseTarget("1001:2147483647", true)).toEqual({
      chat: "1001",
      msgId: 2_147_483_647,
      thread: true,
    });
    for (const target of [
      { chat: "1001", topic: 0, thread: false },
      { chat: "1001", msgId: 0, thread: true },
    ]) {
      const { call } = setup({ target });
      await expect(
        call("target.thread", { limit: 50 }),
        JSON.stringify(target)
      ).rejects.toMatchObject({ code: "invalid_argument" });
    }
    await expect(
      setup({ target: { chat: "1001", msgId: 0, thread: false } }).call(
        "target.message"
      )
    ).rejects.toMatchObject({ code: "invalid_argument" });
    const w = world();
    const group = w.chats.find((c) => c.id === 1001)!;
    group.messages.push(
      { id: 60, ago: 5, text: "root" },
      { id: 61, ago: 4, text: "in thread", thread: 60 },
      { id: 62, ago: 3, text: "elsewhere" }
    );
    const thread = await setup({
      w,
      target: { chat: "1001", msgId: 60, thread: true },
    }).call("target.thread", { limit: 50 });
    expect(thread.messages.map((m: { id: number }) => m.id)).toEqual([61]);
  });

  it("#4 a message whose service source is only in savedFromPeer is masked in read, search, target.message; mine drops it", async () => {
    const w = world();
    const alice = w.chats.find((c) => c.id === 1001)!;
    alice.messages.push(
      {
        id: 70,
        ago: 2,
        out: true,
        text: "Saved 61234 keep",
        forwardedFrom: 1002,
        savedFrom: 777_000,
      },
      {
        id: 71,
        ago: 1,
        out: true,
        text: "mine 61235 copy",
        quoteFrom: 1002,
        savedFrom: 777_000,
        quoteText: "x",
      }
    );
    const { call } = setup({
      w,
      target: { chat: "1001", msgId: 70, thread: false },
    });
    const read = await call("messages.read", "1001", { limit: 10 });
    const byId = (id: number) =>
      read.messages.find((m: { id: number }) => m.id === id);
    expect(byId(70)).toMatchObject({ service: true });
    expect(byId(71)).toMatchObject({ service: true });
    expect(texts(read)).not.toMatch(/6123[45]/);
    expect(texts(await call("messages.search", "Saved"))).not.toContain(
      "61234"
    );
    expect(
      texts(await call("messages.search", "copy", { chat: "1001" }))
    ).not.toContain("61235");
    const target = await call("target.message");
    expect(target.message).toMatchObject({ id: 70, service: true });
    expect(texts(target)).not.toContain("61234");
    expect(
      texts(
        await call("messages.mine", { limit: 100, types: ["private", "group"] })
      )
    ).not.toContain("61235");
  });

  function counting(w: MockWorld, onCall?: (name: string) => void) {
    const calls: string[] = [];
    const real = new MockClient(w) as unknown as Record<string, unknown>;
    const client = new Proxy(real, {
      get(target, prop, receiver) {
        const v = Reflect.get(target, prop, receiver);
        if (
          typeof v !== "function" ||
          ![
            "getDialogs",
            "getMe",
            "getMessages",
            "getEntity",
            "getInputEntity",
            "invoke",
          ].includes(String(prop))
        ) {
          return v;
        }
        return (...args: unknown[]) => {
          calls.push(String(prop));
          onCall?.(String(prop));
          return (v as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    }) as unknown as TelegramClient;
    return { client, calls };
  }

  function manyChats(): MockWorld {
    const w = world();
    for (let i = 0; i < 30; i++) {
      const id = 3000 + i;
      w.users.push({ id, firstName: `Friend ${i}` });
      w.chats.push({
        id,
        kind: "user",
        messages: [
          { id: 1, ago: 100 + i, out: true, text: `hello friend ${i}` },
        ],
      });
    }
    return w;
  }

  it("#11 every Telegram request of messages.mine counts against 20 per call; the cursor walk stays exact", async () => {
    const w = manyChats();
    const full: string[] = [];
    let cursor: string | null = null;
    for (let pages = 0; pages < 30; pages++) {
      const { client, calls } = counting(w);
      const page = await setup({ w, client }).call("messages.mine", {
        limit: 2000,
        ...(cursor ? { cursor } : { types: ["private"] }),
      });
      expect(calls.length, calls.join(",")).toBeLessThanOrEqual(20);
      full.push(...page.messages.map((m: { text: string }) => m.text));
      cursor = page.cursor;
      if (page.done) {
        break;
      }
    }
    expect(cursor).toBeNull();
    for (let i = 0; i < 30; i++) {
      expect(full).toContain(`hello friend ${i}`);
    }
    expect(new Set(full).size).toBe(full.length);
  });

  it("#11 a cancelled messages.mine makes no request after the one in flight", async () => {
    const w = manyChats();
    const ac = new AbortController();
    const { client, calls } = counting(w, (name) => {
      if (name === "getMessages") {
        ac.abort();
      }
    });
    const { callWith } = setup({ w, client });
    await expect(
      callWith(ac.signal, "messages.mine", { limit: 2000, types: ["private"] })
    ).rejects.toMatchObject({ code: "cancelled" });
    expect(calls.filter((c) => c === "getMessages")).toHaveLength(1);
    expect(calls.at(-1)).toBe("getMessages");
  });

  it("#2 a $ref into an annotation (or any non-schema position) is refused when checked and when validating", async () => {
    const { commandSchemaProblems, validate, UnsupportedSchemaError } =
      await import("../src/plugins/json-schema.js");
    const evil = {
      type: "object",
      default: { pattern: "^(a+)+$" },
      properties: { a: { $ref: "#/default" } },
    };
    expect(commandSchemaProblems(evil)).toEqual([
      expect.stringMatching(/\$ref "#\/default" does not point at a subschema/),
    ]);
    expect(
      commandSchemaProblems({
        examples: [{ pattern: "^(a+)+$" }],
        $ref: "#/examples/0",
      })
    ).toHaveLength(1);
    expect(
      commandSchemaProblems({
        properties: {
          a: { const: { pattern: "x" } },
          b: { $ref: "#/properties/a/const" },
        },
      })
    ).toHaveLength(1);
    expect(commandSchemaProblems({ $ref: "#/%zz" })).toEqual([
      expect.stringMatching(/not a valid JSON Pointer/),
    ]);
    expect(() => validate(evil, { a: `${"a".repeat(40)}!` }, 20, 2000)).toThrow(
      UnsupportedSchemaError
    );
    const tree = {
      $defs: {
        node: {
          type: "object",
          properties: {
            next: { $ref: "#/$defs/node" },
            "a/b": { type: "integer" },
          },
        },
      },
      $ref: "#/$defs/node",
    };
    expect(commandSchemaProblems(tree)).toEqual([]);
    expect(validate(tree, { next: { next: { "a/b": 1 } } })).toEqual([]);
    expect(
      validate(
        {
          ...tree,
          properties: { x: { $ref: "#/$defs/node/properties/a~1b" } },
        },
        { x: "one" }
      )
    ).toEqual([expect.objectContaining({ path: "/x" })]);
    expect(
      validate(
        {
          allOf: [{ type: "integer" }],
          properties: { a: { $ref: "#/allOf/0" } },
        },
        { a: "x" }
      )
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "/a" })])
    );
    expect(
      validate(
        {
          allOf: [{ type: ["integer", "object"] }],
          properties: { a: { $ref: "#/allOf/0" } },
        },
        { a: 1 }
      )
    ).toEqual([]);
    expect(
      validate(
        {
          prefixItems: [true, { type: "string" }],
          properties: { a: { $ref: "#/prefixItems/1" } },
        },
        { a: "ok" }
      )
    ).toEqual([]);
    expect(() => validate({ $ref: "#" }, 1)).toThrow(UnsupportedSchemaError);
  });

  it("#6 storage.set and storage.delete through the host: past the deadline or cancelled, nothing is written", async () => {
    const late = setup({ effects: ["storage"], deadline: Date.now() - 1 });
    await expect(
      late.call("storage.set", "notes", "late")
    ).rejects.toMatchObject({ code: "cancelled" });
    await expect(late.call("storage.get", "notes")).resolves.toBeNull();
    const { call, callWith } = setup({ effects: ["storage"] });
    await call("storage.set", "notes", "kept");
    const ac = new AbortController();
    ac.abort();
    await expect(
      callWith(ac.signal, "storage.set", "notes", "changed")
    ).rejects.toMatchObject({ code: "cancelled" });
    await expect(
      callWith(ac.signal, "storage.delete", "notes")
    ).rejects.toMatchObject({ code: "cancelled" });
    await expect(call("storage.get", "notes")).resolves.toBe("kept");
  });
});
