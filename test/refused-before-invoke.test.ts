import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";

// Write mode "on": the guard lets every write through, so only the hard refusal can stop a call.
const assertWriteEnabled = vi.hoisted(() => vi.fn());
const getClient = vi.hoisted(() => vi.fn(async () => ({})));
const invokeApi = vi.hoisted(() => vi.fn(async () => true));
vi.mock(import("../src/guard.js"), async (orig) => ({
  ...(await orig<typeof import("../src/guard.js")>()),
  assertWriteEnabled,
}));
vi.mock(import("../src/client.js"), async (orig) => ({
  ...(await orig<typeof import("../src/client.js")>()),
  getClient,
  invokeApi,
  disconnectClient: async () => {},
}));
vi.mock(import("../src/audit.js"), () => ({ auditLog: () => {} }));

import { apiCommand } from "../src/commands/api.js";
import { buildLeaf } from "../src/commands/generated.js";
import { methodClassName } from "../src/generated-registry.js";

const saved = { ...process.env };
let err: string[];
beforeEach(() => {
  err = [];
  vi.spyOn(console, "error").mockImplementation((m) => {
    err.push(String(m));
  });
  vi.spyOn(process, "exit").mockImplementation(((code: number) => {
    throw new Error(`exit ${code}`);
  }) as never);
  assertWriteEnabled.mockClear();
  getClient.mockClear();
  invokeApi.mockClear();
});
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

// [class name, namespace, generated method, its flags, the same call as raw --params]
const CASES: [string, string, string, string[], Record<string, unknown>][] = [
  [
    "messages.SendPaidReaction",
    "messages",
    "send-paid-reaction",
    ["--peer", "@c", "--msg-id", "1", "--count", "5"],
    { peer: "@c", msgId: 1, count: 5 },
  ],
  ["account.RegisterPasskey", "account", "register-passkey", [], {}],
  [
    "account.DeletePasskey",
    "account",
    "delete-passkey",
    ["--id", "x"],
    { id: "x" },
  ],
  [
    "account.InitPasskeyRegistration",
    "account",
    "init-passkey-registration",
    [],
    {},
  ],
  // The 2FA recovery email and Telegram Passport values (plainData holds the phone and email)
  ["account.ResendPasswordEmail", "account", "resend-password-email", [], {}],
  ["account.CancelPasswordEmail", "account", "cancel-password-email", [], {}],
  [
    "account.ConfirmPasswordEmail",
    "account",
    "confirm-password-email",
    ["--code", "123"],
    { code: "123" },
  ],
  ["account.GetAllSecureValues", "account", "get-all-secure-values", [], {}],
  [
    "account.GetSecureValue",
    "account",
    "get-secure-value",
    ["--json-params", '{"types":[{"_":"secureValueTypePhone"}]}'],
    { types: [{ _: "secureValueTypePhone" }] },
  ],
  // A bot's Passport form carries SecureValue entries with the same plainData
  [
    "account.GetAuthorizationForm",
    "account",
    "get-authorization-form",
    ["--bot-id", "1", "--scope", "x", "--public-key", "k"],
    { botId: 1, scope: "x", publicKey: "k" },
  ],
  // Creating a geo group publishes a location (coordinates or an address)
  [
    "channels.CreateChannel",
    "channels",
    "create-channel",
    [
      "--title",
      "t",
      "--about",
      "",
      "--json-params",
      '{"geoPoint":{"_":"inputGeoPoint","lat":1,"long":2}}',
    ],
    {
      title: "t",
      about: "",
      geoPoint: { _: "inputGeoPoint", lat: 1, long: 2 },
    },
  ],
  [
    "channels.CreateChannel",
    "channels",
    "create-channel",
    ["--title", "t", "--about", "", "--address", "Main St 1"],
    { title: "t", about: "", address: "Main St 1" },
  ],
  // An inline query carrying coordinates hands the user's location to the bot
  [
    "messages.GetInlineBotResults",
    "messages",
    "get-inline-bot-results",
    [
      "--json-params",
      '{"bot":"@b","peer":"me","query":"x","offset":"","geoPoint":{"_":"inputGeoPoint","lat":1,"long":2}}',
    ],
    {
      bot: "@b",
      peer: "me",
      query: "x",
      offset: "",
      geoPoint: { _: "inputGeoPoint", lat: 1, long: 2 },
    },
  ],
];

describe.each([
  ["terminal", {}],
  ["MCP", { TG_MCP: "1" }],
  ["MCP read-only", { TG_MCP: "1", TG_READ_ONLY: "1" }],
])('refused before invoke in write mode "on" (%s)', (_where, env) => {
  beforeEach(() => {
    Object.assign(process.env, env);
  });

  it.each(CASES)(
    "%s: the raw api form",
    async (className, _ns, _method, _args, params) => {
      await expect(
        apiCommand.parseAsync([className, "--params", JSON.stringify(params)], {
          from: "user",
        })
      ).rejects.toThrow("exit 1");
      expect(err.join("\n")).toMatch(/^Refused/m);
      expect(getClient).not.toHaveBeenCalled();
      expect(invokeApi).not.toHaveBeenCalled();
    }
  );

  it.each(CASES)(
    "%s: the generated command",
    async (className, ns, method, args) => {
      expect(methodClassName(ns, method)).toBe(className);
      const leaf = buildLeaf(ns, method, className, true);
      await expect(leaf.parseAsync(args, { from: "user" })).rejects.toThrow(
        "exit 1"
      );
      expect(err.join("\n")).toMatch(/^Refused/m);
      expect(getClient).not.toHaveBeenCalled();
      expect(invokeApi).not.toHaveBeenCalled();
    }
  );
});

test('control: an ordinary write runs in mode "on" (so the spies above would see a call)', async () => {
  await apiCommand.parseAsync(["contacts.Block", "--params", '{"id": "@x"}'], {
    from: "user",
  });
  expect(assertWriteEnabled).toHaveBeenCalled();
  expect(invokeApi).toHaveBeenCalledOnce();
});

// A paid message, media or album (allowPaidStars) over MCP, in write mode "on" (a raw forward is
// off the MCP allowlist altogether):
// [class name, namespace, generated method, the free params]
const PAID: [string, string, string, Record<string, unknown>][] = [
  [
    "messages.SendMessage",
    "messages",
    "send-message",
    { peer: "@c", message: "hi" },
  ],
  [
    "messages.SendMedia",
    "messages",
    "send-media",
    { peer: "@c", message: "", media: { _: "inputMediaDice", emoticon: "🎲" } },
  ],
  [
    "messages.SendMultiMedia",
    "messages",
    "send-multi-media",
    { peer: "@c", multiMedia: [] },
  ],
  [
    "channels.SearchPosts",
    "channels",
    "search-posts",
    { query: "x", offsetPeer: { _: "inputPeerEmpty" }, limit: 10 },
  ],
];

describe.each([
  ["MCP", { TG_MCP: "1" }],
  ["MCP read-only", { TG_MCP: "1", TG_READ_ONLY: "1" }],
])(
  'allowPaidStars is refused before invoke in mode "on" (%s)',
  (_where, env) => {
    beforeEach(() => {
      Object.assign(process.env, env);
    });
    const paid = (p: Record<string, unknown>) => ({ ...p, allowPaidStars: 5 });

    it.each(PAID)(
      "%s: the raw api form",
      async (className, _ns, _method, params) => {
        await expect(
          apiCommand.parseAsync(
            [className, "--params", JSON.stringify(paid(params))],
            { from: "user" }
          )
        ).rejects.toThrow("exit 1");
        expect(err.join("\n")).toMatch(/^Refused over MCP: allowPaidStars/m);
        expect(getClient).not.toHaveBeenCalled();
        expect(invokeApi).not.toHaveBeenCalled();
      }
    );

    it.each(PAID)(
      "%s: the generated command, JSON params and the typed flag",
      async (className, ns, method, params) => {
        expect(methodClassName(ns, method)).toBe(className);
        for (const args of [
          ["--json-params", JSON.stringify(paid(params))],
          ["--json-params", JSON.stringify(params), "--allow-paid-stars", "0"],
        ]) {
          err = [];
          await expect(
            buildLeaf(ns, method, className, true).parseAsync(args, {
              from: "user",
            })
          ).rejects.toThrow("exit 1");
          expect(err.join("\n"), args.join(" ")).toMatch(
            /^Refused over MCP: allowPaidStars/m
          );
        }
        expect(getClient).not.toHaveBeenCalled();
        expect(invokeApi).not.toHaveBeenCalled();
      }
    );
  }
);

describe('the free forms still run over MCP in mode "on"', () => {
  beforeEach(() => {
    process.env.TG_MCP = "1";
  });

  it.each(PAID)(
    "%s without allowPaidStars (or with null) reaches invoke",
    async (className, ns, method, params) => {
      await apiCommand.parseAsync(
        [className, "--params", JSON.stringify(params)],
        { from: "user" }
      );
      await apiCommand.parseAsync(
        [
          className,
          "--params",
          JSON.stringify({ ...params, allowPaidStars: null }),
        ],
        { from: "user" }
      );
      await buildLeaf(ns, method, className, true).parseAsync(
        ["--json-params", JSON.stringify(params)],
        { from: "user" }
      );
      expect(invokeApi).toHaveBeenCalledTimes(3);
    }
  );

  it("an inline query without coordinates reaches invoke as a write, raw and generated", async () => {
    const params = { bot: "@b", peer: "me", query: "x", offset: "" };
    await apiCommand.parseAsync(
      ["messages.GetInlineBotResults", "--params", JSON.stringify(params)],
      { from: "user" }
    );
    await buildLeaf(
      "messages",
      "get-inline-bot-results",
      "messages.GetInlineBotResults",
      true
    ).parseAsync(
      ["--bot", "@b", "--peer", "me", "--query", "x", "--offset", ""],
      { from: "user" }
    );
    expect(invokeApi).toHaveBeenCalledTimes(2);
    // The query and the user's ID go to the bot, so it passes the write guard
    expect(assertWriteEnabled).toHaveBeenCalledTimes(2);
  });

  it("a channel created without a location reaches invoke, raw and generated", async () => {
    await apiCommand.parseAsync(
      [
        "channels.CreateChannel",
        "--params",
        '{"title":"t","about":"","megagroup":true,"address":""}',
      ],
      { from: "user" }
    );
    await buildLeaf(
      "channels",
      "create-channel",
      "channels.CreateChannel",
      true
    ).parseAsync(["--title", "t", "--about", "", "--broadcast"], {
      from: "user",
    });
    expect(invokeApi).toHaveBeenCalledTimes(2);
  });
});
