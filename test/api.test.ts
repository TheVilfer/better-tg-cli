import { spawnSync } from "node:child_process";

import type { TelegramClient } from "teleproto";
import apiDefinitions from "teleproto/tl/generated/api-definitions.js";
import { afterEach, describe, expect, it } from "vitest";

import {
  resolveApiMethod,
  isApiReadMethod,
  isApiReadCall,
  apiRefusalReason,
  mcpPaidStarsRefusal,
  plainParams,
} from "../src/api-methods.js";
import {
  invokeApi,
  serializeApiResult,
  disconnectClient,
} from "../src/client.js";
import { apiMethodToken, planCall } from "../src/mcp.js";
import { MockClient } from "../src/mock/client.js";
import { seedWorld } from "../src/mock/world.js";
import type { MockWorld } from "../src/mock/world.js";
import { setStrictChatResolution } from "../src/resolve-mode.js";
import { cliArgs } from "./cli.js";

const mock = (world: MockWorld = seedWorld()) =>
  new MockClient(world) as unknown as TelegramClient;

afterEach(async () => {
  await disconnectClient();
  setStrictChatResolution(false);
});

describe("api method resolution", () => {
  it("resolves namespaced and top-level requests, case-insensitively", () => {
    expect(resolveApiMethod("messages.GetHistory").className).toBe(
      "messages.GetHistory"
    );
    expect(resolveApiMethod("messages.gethistory").className).toBe(
      "messages.GetHistory"
    );
    expect(resolveApiMethod("MESSAGES.GetHistory").className).toBe(
      "messages.GetHistory"
    );
    expect(resolveApiMethod("help.GetConfig").className).toBe("help.GetConfig");
    expect(resolveApiMethod("InvokeWithLayer").className).toBe(
      "InvokeWithLayer"
    );
  });

  it("rejects non-requests and typos", () => {
    expect(() => resolveApiMethod("messages.Nope")).toThrow(/not a request/);
    expect(() => resolveApiMethod("nope.Thing")).toThrow(/Unknown namespace/);
    expect(() => resolveApiMethod("messages.Dialogs")).toThrow(/not a request/);
    expect(() => resolveApiMethod("")).toThrow(/Specify a method/);
  });
});

describe("api read/write classification", () => {
  it("treats Get/Check/Search/Resolve as reads, everything else as a write", () => {
    for (const m of [
      "messages.GetHistory",
      "help.GetConfig",
      "contacts.Search",
      "contacts.ResolveUsername",
      "account.GetPassword",
      "channels.GetAdminLog",
    ]) {
      expect(isApiReadMethod(m), m).toBe(true);
    }
    for (const m of [
      "messages.SendMessage",
      "contacts.Block",
      "channels.EditTitle",
      "messages.DeleteMessages",
    ]) {
      expect(isApiReadMethod(m), m).toBe(false);
    }
  });

  it("forces known side-effecting Get* methods to writes", () => {
    expect(isApiReadMethod("messages.GetBotCallbackAnswer")).toBe(false);
  });
});

describe("api refusals", () => {
  it("refuses deletion, session termination, 2FA, location and paying", () => {
    expect(apiRefusalReason("account.DeleteAccount")).toMatch(/irreversible/);
    expect(apiRefusalReason("auth.LogOut")).toMatch(/session/);
    expect(apiRefusalReason("auth.ResetAuthorizations")).toMatch(/session/);
    expect(apiRefusalReason("account.UpdatePasswordSettings")).toMatch(/2FA/);
    expect(apiRefusalReason("channels.EditLocation")).toMatch(/location/);
    expect(apiRefusalReason("payments.SendStarsForm")).toMatch(/payment|Stars/);
  });

  it("refuses every wrapper request, so a refused method cannot ride inside one", () => {
    const wrappers = (
      apiDefinitions as unknown as {
        name: string;
        isFunction: boolean;
        namespace?: string;
        argsConfig: Record<string, { type: string }>;
      }[]
    )
      .filter(
        (d) =>
          d.isFunction &&
          !d.namespace &&
          Object.values(d.argsConfig).some((a) => a.type === "X")
      )
      .map((d) => d.name);
    expect(wrappers).toContain("InvokeWithLayer");
    for (const w of wrappers) {
      expect(apiRefusalReason(w), w).toMatch(/wrapper/);
    }
    expect(
      apiRefusalReason("messages.SendMessage", {
        message: "x",
        peer: { _: "account.deleteAccount" },
      })
    ).toMatch(/irreversible/);
    expect(
      apiRefusalReason("messages.SendMessage", {
        message: "x",
        peer: { className: "auth.LogOut" },
      })
    ).toMatch(/session/);
  });

  it("refuses contact and geo media in the schema spelling too", () => {
    expect(
      apiRefusalReason("messages.SendMedia", {
        media: { _: "inputMediaContact", phoneNumber: "1" },
      })
    ).toMatch(/contact card/);
    expect(
      apiRefusalReason("messages.SendMedia", {
        media: { _: "inputMediaGeoPoint" },
      })
    ).toMatch(/location/);
  });

  it("allows read-only payments and ordinary methods", () => {
    expect(apiRefusalReason("payments.GetStarsStatus")).toBeNull();
    expect(apiRefusalReason("messages.GetHistory")).toBeNull();
    expect(apiRefusalReason("messages.SendMessage")).toBeNull();
  });
});

describe("api hardening: side-effecting reads reclassified", () => {
  it("treats callback and inline-query Get* methods as writes", () => {
    for (const m of [
      "messages.GetBotCallbackAnswer",
      "ephemeral.GetCallbackAnswer",
      "messages.GetInlineBotResults",
    ]) {
      expect(isApiReadMethod(m), m).toBe(false);
    }
  });

  it("GetMessagesViews is a read only without increment", () => {
    expect(isApiReadMethod("messages.GetMessagesViews")).toBe(true);
    expect(
      isApiReadCall("messages.GetMessagesViews", {
        peer: "me",
        id: [1],
        increment: false,
      })
    ).toBe(true);
    expect(
      isApiReadCall("messages.GetMessagesViews", {
        peer: "me",
        id: [1],
        increment: true,
      })
    ).toBe(false);
  });

  it("keeps genuinely read-only Get*/listing methods as reads", () => {
    for (const m of [
      "account.GetAuthorizations",
      "account.GetWebAuthorizations",
      "messages.GetExportedChatInvites",
      "payments.GetStarsStatus",
      "payments.CheckGiftCode",
      "stories.GetStoryViewsList",
    ]) {
      expect(isApiReadMethod(m), m).toBe(true);
      expect(apiRefusalReason(m), m).toBeNull();
    }
  });
});

describe("api hardening: hard refusals", () => {
  it("refuses the entire auth namespace (login/session)", () => {
    for (const m of [
      "auth.CheckPassword",
      "auth.AcceptLoginToken",
      "auth.ExportAuthorization",
      "auth.ImportAuthorization",
      "auth.ExportLoginToken",
      "auth.SignIn",
      "auth.SendCode",
      "auth.RecoverPassword",
      "auth.BindTempAuthKey",
    ]) {
      expect(apiRefusalReason(m), m).toMatch(/login|session/i);
    }
  });

  it("refuses session/2FA/phone/takeout/passport account methods", () => {
    for (const m of [
      "account.DeleteAccount",
      "account.SetAuthorizationTTL",
      "account.ChangeAuthorizationSettings",
      "account.GetTmpPassword",
      "account.GetPasswordSettings",
      "account.UpdatePasswordSettings",
      "account.ChangePhone",
      "account.SendChangePhoneCode",
      "account.VerifyPhone",
      "account.VerifyEmail",
      "account.InitTakeoutSession",
      "account.FinishTakeoutSession",
      "account.AcceptAuthorization",
      "account.SaveSecureValue",
      "account.DeleteSecureValue",
      "account.SetPrivacy",
    ]) {
      expect(apiRefusalReason(m), m).toBeTruthy();
    }
  });

  it("refuses location/phone sharing, url-auth login, ownership, and money tokens", () => {
    expect(apiRefusalReason("contacts.GetLocated")).toMatch(
      /geolocation|location/i
    );
    expect(apiRefusalReason("contacts.AcceptContact")).toMatch(/phone/i);
    expect(apiRefusalReason("messages.AcceptUrlAuth")).toMatch(
      /website|login/i
    );
    expect(apiRefusalReason("messages.RequestUrlAuth")).toBeTruthy();
    expect(apiRefusalReason("messages.CheckUrlAuthMatchCode")).toBeTruthy();
    expect(apiRefusalReason("messages.EditChatCreator")).toMatch(/ownership/i);
    expect(apiRefusalReason("payments.GetStarsRevenueWithdrawalUrl")).toMatch(
      /withdraw/i
    );
    expect(apiRefusalReason("payments.GetStarGiftWithdrawalUrl")).toBeTruthy();
    expect(apiRefusalReason("phone.GetGroupCallStreamRtmpUrl")).toMatch(
      /credential|key/i
    );
  });

  it("refuses sharing contact/geo media and phone-privacy exceptions by inspecting params", () => {
    expect(
      apiRefusalReason("messages.SendMedia", {
        media: { className: "InputMediaGeoLive" },
      })
    ).toMatch(/location|contact/i);
    expect(
      apiRefusalReason("messages.EditMessage", {
        media: { className: "InputMediaContact" },
      })
    ).toMatch(/contact|location/i);
    expect(
      apiRefusalReason("contacts.AddContact", {
        addPhonePrivacyException: true,
      })
    ).toMatch(/phone/i);
    expect(
      apiRefusalReason("messages.SendMedia", {
        media: { className: "InputMediaUploadedPhoto" },
      })
    ).toBeNull();
    expect(apiRefusalReason("contacts.AddContact", { id: "x" })).toBeNull();
  });
});

describe("MCP routing of the api command", () => {
  it("finds the method token past flags", () => {
    expect(
      apiMethodToken(["api", "messages.GetHistory", "--params", "{}"])
    ).toBe("messages.GetHistory");
    expect(
      apiMethodToken(["api", "--params", '{"x":1}', "help.GetConfig"])
    ).toBe("help.GetConfig");
    expect(apiMethodToken(["api", "--write", "contacts.Block"])).toBe(
      "contacts.Block"
    );
    expect(apiMethodToken(["api"])).toBeUndefined();
  });

  it("read methods go to telegram_read, writes to telegram_write, refusals never run", () => {
    expect(
      planCall("telegram_read", { args: ["api", "messages.GetHistory"] })
    ).toMatchObject({ readOnly: true });
    expect(
      planCall("telegram_read", {
        args: ["api", "contacts.Block", "--params", "{}"],
      })
    ).toMatch(/use telegram_write/);
    expect(
      planCall("telegram_write", { args: ["api", "contacts.Block"] })
    ).toMatchObject({ readOnly: false });
    expect(
      planCall("telegram_write", { args: ["api", "messages.GetHistory"] })
    ).toMatch(/use telegram_read/);
    expect(
      planCall("telegram_read", { args: ["api", "help.GetConfig"] })
    ).toMatch(/not available over MCP/);
    expect(
      planCall("telegram_read", { args: ["api", "account.DeleteAccount"] })
    ).toMatch(/irreversible/);
    expect(
      planCall("telegram_write", { args: ["api", "payments.SendStarsForm"] })
    ).toMatch(/payment|Stars/);
    expect(planCall("telegram_read", { args: ["api"] })).toMatch(
      /needs a method/
    );
    expect(
      planCall("telegram_read", { args: ["api", "auth.CheckPassword"] })
    ).toMatch(/login|session/i);
    expect(
      planCall("telegram_read", { args: ["api", "contacts.GetLocated"] })
    ).toMatch(/location|geolocation/i);
    expect(
      planCall("telegram_write", { args: ["api", "account.SetPrivacy"] })
    ).toMatch(/privacy/i);
    expect(
      planCall("telegram_read", {
        args: ["api", "messages.GetBotCallbackAnswer"],
      })
    ).toMatch(/use telegram_write/);
    expect(
      planCall("telegram_read", {
        args: ["api", "messages.GetInlineBotResults"],
      })
    ).toMatch(/use telegram_write/);
    expect(
      planCall("telegram_read", { args: ["api", "messages.GetMessagesViews"] })
    ).toMatchObject({ readOnly: true });
  });
});

describe("api: paid reads and login tokens", () => {
  it("a read that may spend Stars (allowPaidStars) is a write; the free form stays a read", () => {
    expect(isApiReadCall("channels.SearchPosts", { query: "x" })).toBe(true);
    expect(
      isApiReadCall("channels.SearchPosts", {
        query: "x",
        allowPaidStars: "10",
      })
    ).toBe(false);
    expect(isApiReadCall("channels.SearchPosts", { allowPaidStars: 0 })).toBe(
      false
    );
    expect(isApiReadCall("contacts.Block", {})).toBe(false);
  });

  const run = (args: string[], extra: Record<string, string>) =>
    spawnSync(process.execPath, [...cliArgs(), ...args], {
      encoding: "utf-8",
      env: {
        ...process.env,
        TG_MOCK: "",
        TG_MCP: "",
        TG_READ_ONLY: "",
        TG_PROFILE: `api-paid-${process.pid}`,
        TG_NO_UPDATE_CHECK: "1",
        ...extra,
      },
    });
  const PAID = [
    [
      [
        "api",
        "channels.SearchPosts",
        "--params",
        '{"query":"x","offsetPeer":{"_":"inputPeerEmpty"},"allowPaidStars":5}',
      ],
    ],
    [
      [
        "channels",
        "search-posts",
        "--json-params",
        '{"query":"x","offsetPeer":{"_":"inputPeerEmpty"},"limit":10,"allowPaidStars":5}',
      ],
    ],
  ];

  it.each(PAID)(
    "over MCP the CLI refuses a paid search, on either tool: %j",
    (args) => {
      for (const extra of [
        { TG_READ_ONLY: "1", TG_MCP: "1" },
        { TG_MCP: "1" },
        { TG_READ_ONLY: "1" },
      ]) {
        const r = run(args, extra);
        expect(r.status, JSON.stringify(extra)).toBe(1);
        expect(r.stderr).toMatch(/Refused over MCP: allowPaidStars/);
      }
    },
    30_000
  );

  it.each(PAID)(
    "in a terminal a paid search stays a write behind the write guard: %j",
    (args) => {
      const r = run(args, {});
      expect([1, 4]).toContain(r.status);
      expect(r.stderr).not.toMatch(/Refused over MCP/);
      expect(r.stderr).toMatch(/Write access|secret store/);
    },
    30_000
  );

  it("mcpPaidStarsRefusal: only over MCP, any method class, only an own non-null field", () => {
    const saved = { mcp: process.env.TG_MCP, ro: process.env.TG_READ_ONLY };
    try {
      delete process.env.TG_MCP;
      delete process.env.TG_READ_ONLY;
      expect(
        mcpPaidStarsRefusal("channels.SearchPosts", { allowPaidStars: 5 })
      ).toBeNull();
      process.env.TG_MCP = "1";
      expect(
        mcpPaidStarsRefusal("channels.SearchPosts", { allowPaidStars: 5 })
      ).toMatch(/Refused over MCP/);
      expect(
        mcpPaidStarsRefusal("channels.SearchPosts", { allowPaidStars: 0 })
      ).toMatch(/Refused over MCP/);
      expect(
        mcpPaidStarsRefusal("channels.SearchPosts", { allowPaidStars: null })
      ).toBeNull();
      expect(
        mcpPaidStarsRefusal(
          "channels.SearchPosts",
          Object.create({ allowPaidStars: 5 })
        )
      ).toBeNull();
      for (const m of [
        "messages.SendMessage",
        "messages.SendMedia",
        "messages.SendMultiMedia",
        "messages.ForwardMessages",
      ]) {
        expect(mcpPaidStarsRefusal(m, { allowPaidStars: 5 }), m).toMatch(
          /Refused over MCP/
        );
        expect(mcpPaidStarsRefusal(m, { message: "x" }), m).toBeNull();
      }
    } finally {
      if (saved.mcp === undefined) {
        delete process.env.TG_MCP;
      } else {
        process.env.TG_MCP = saved.mcp;
      }
      if (saved.ro === undefined) {
        delete process.env.TG_READ_ONLY;
      } else {
        process.env.TG_READ_ONLY = saved.ro;
      }
    }
  });

  const PROTO = '{"query":"x","__proto__":{"allowPaidStars":5}}';

  it("plainParams builds prototype-free objects, so no field is inherited", () => {
    const p = plainParams(JSON.parse(PROTO) as Record<string, unknown>);
    expect(Object.getPrototypeOf(p)).toBeNull();
    expect(p.allowPaidStars).toBeUndefined();
    expect(isApiReadCall("channels.SearchPosts", p)).toBe(true);
    const nested = plainParams({ a: [{ b: 1 }] } as Record<
      string,
      unknown
    >) as { a: object[] };
    expect(Object.getPrototypeOf(nested.a[0])).toBeNull();
  });

  it("the request sent to Telegram never carries an inherited allowPaidStars", async () => {
    let sent: Record<string, unknown> | undefined;
    const client = {
      invoke: async (r: unknown) => {
        sent = r as Record<string, unknown>;
        return true;
      },
    } as unknown as TelegramClient;
    await invokeApi(client, "channels.SearchPosts", JSON.parse(PROTO));
    expect(sent?.className).toBe("channels.SearchPosts");
    expect(sent?.allowPaidStars).toBeUndefined();
    expect(sent?.query).toBe("x");
  });

  it("prototype-free params serialize to the same bytes as ordinary objects (nested and vectors)", async () => {
    const body =
      '{"id":[{"_":"inputMessageID","id":5},{"_":"inputMessageID","id":7}]}';
    const bytes = async (params: Record<string, unknown>) => {
      let sent: { getBytes(): Buffer } | undefined;
      const client = {
        invoke: async (r: unknown) => {
          sent = r as never;
          return true;
        },
      } as unknown as TelegramClient;
      await invokeApi(client, "messages.GetMessages", params);
      return sent!.getBytes();
    };
    const plain = await bytes(
      plainParams(JSON.parse(body) as Record<string, unknown>)
    );
    const { Api } = await import("teleproto");
    const ordinary = new Api.messages.GetMessages({
      id: [
        new Api.InputMessageID({ id: 5 }),
        new Api.InputMessageID({ id: 7 }),
      ],
    }).getBytes();
    expect(plain.length).toBeGreaterThan(8);
    expect(Buffer.compare(plain, ordinary)).toBe(0);
  });

  it("over MCP the built request is checked once more before it is sent", async () => {
    const saved = process.env.TG_MCP;
    process.env.TG_MCP = "1";
    let sent = false;
    const client = {
      invoke: async () => {
        sent = true;
        return true;
      },
    } as unknown as TelegramClient;
    try {
      await expect(
        invokeApi(client, "channels.SearchPosts", {
          query: "x",
          allowPaidStars: 5,
        })
      ).rejects.toThrow(/Refused over MCP/);
      await expect(
        invokeApi(client, "messages.SendMessage", {
          peer: { _: "inputPeerSelf" },
          message: "x",
          allowPaidStars: 5,
        })
      ).rejects.toThrow(/Refused over MCP/);
      delete process.env.TG_MCP;
      await expect(
        invokeApi(client, "messages.GetInlineBotResults", {
          bot: { _: "inputUserSelf" },
          peer: { _: "inputPeerSelf" },
          query: "x",
          offset: "",
          geoPoint: { _: "inputGeoPoint", lat: 1, long: 2 },
        })
      ).rejects.toThrow(/geoPoint/);
      await expect(
        invokeApi(client, "channels.CreateChannel", {
          title: "t",
          about: "",
          geoPoint: { _: "inputGeoPoint", lat: 1, long: 2 },
        })
      ).rejects.toThrow(/geoPoint\/address/);
      await expect(
        invokeApi(client, "channels.CreateChannel", {
          title: "t",
          about: "",
          address: "Main St 1",
        })
      ).rejects.toThrow(/geoPoint\/address/);
      expect(sent).toBe(false);
    } finally {
      if (saved === undefined) {
        delete process.env.TG_MCP;
      } else {
        process.env.TG_MCP = saved;
      }
    }
  });

  it('over MCP a "__proto__" allowPaidStars pays nothing, so the CLI does not refuse it', () => {
    const r = run(["api", "channels.SearchPosts", "--params", PROTO], {
      TG_READ_ONLY: "1",
      TG_MCP: "1",
    });
    expect(r.stderr).not.toMatch(/Refused over MCP|cannot run as a read/);
    expect(r.stderr).toMatch(/not configured|not authenticated|auth/i);
  }, 30_000);

  it("messages.GetEmojiURL (a login link) is refused", () => {
    expect(apiRefusalReason("messages.GetEmojiURL")).toMatch(/log/i);
  });

  it("never prints the autologin token of help.GetConfig", () => {
    const out = serializeApiResult({
      className: "Config",
      autologinToken: "secret-autologin",
      dcOptions: [],
      nested: { autologinToken: "x2" },
    });
    expect(out).not.toMatch(/secret-autologin|x2/);
    expect(JSON.parse(out).autologinToken).toBe("[redacted]");
  });
});

describe("api end to end on the mock", () => {
  it("builds and invokes a read, resolving {_chat} peers", async () => {
    const result = await invokeApi(mock(), "channels.GetFullChannel", {
      channel: { _chat: "Team" },
    });
    const json = JSON.parse(serializeApiResult(result));
    expect(json.chats[0].title).toBe("Team");
    expect(json.chats[0].className).toBe("Channel");
  });

  it("serializes big integers as strings and reads contacts", async () => {
    const json = JSON.parse(
      serializeApiResult(await invokeApi(mock(), "contacts.GetContacts", {}))
    );
    expect(json.savedCount).toBe(3);
    expect(json.users[0].id).toBeTypeOf("string");
  });
});
