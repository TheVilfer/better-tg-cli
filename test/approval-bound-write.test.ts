import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TelegramClient } from "teleproto";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buttonFingerprint,
  clickButton,
  disconnectClient,
  expectButton,
  findButton,
  getClient,
  resolveChat,
  sendFileMessage,
  setProfilePhoto,
} from "../src/client.js";
import {
  fileSnapshot,
  forgetFileSnapshots,
  sealFileSnapshots,
} from "../src/file-snapshot.js";
import { seedWorld } from "../src/mock/world.js";
import { lookupPeers } from "../src/peer-lookup.js";
import { setStrictChatResolution } from "../src/resolve-mode.js";

const dir = mkdtempSync(join(tmpdir(), "tg-bound-write-"));

afterAll(() => rmSync(dir, { recursive: true, force: true }));
let state: string;
let n = 0;
beforeEach(() => {
  state = join(dir, `state-${++n}.json`);
  process.env.TG_MOCK = state;
  forgetFileSnapshots();
});
afterEach(async () => {
  await disconnectClient();
  delete process.env.TG_MOCK;
  expectButton(undefined);
});

describe("the recipient the guard resolved is the one the write gets", () => {
  it("as the same object, even after a disconnect and with other matching", async () => {
    setStrictChatResolution(true);
    const peers = await lookupPeers(["@alice_example"]);
    expect(peers.get("@alice_example")).toMatchObject({ ok: true, id: "1001" });
    const first = await resolveChat(await getClient(), "@alice_example");
    await disconnectClient();
    setStrictChatResolution(false);
    await expect(
      resolveChat(await getClient(), "@alice_example")
    ).resolves.toBe(first);
  });
});

function recorder() {
  const got: unknown[] = [];
  const entity = { className: "User" };
  const client = {
    sendFile: async (_e: unknown, p: { file: unknown }) => (
      got.push(p.file),
      { id: 1 }
    ),
    uploadFile: async (p: { file: unknown }) => (got.push(p.file), {}),
    invoke: async () => ({}),
    getMe: async () => entity,
  } as unknown as TelegramClient;
  return { client, got };
}

async function bytesOf(file: unknown): Promise<string> {
  expect(file).toBeTypeOf("object");
  return Buffer.from(
    await (file as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer()
  ).toString();
}

describe("an upload sends the snapshot the approval hashed, never the path again", () => {
  it("send-file", async () => {
    const f = join(dir, "a.txt");
    writeFileSync(f, "approved bytes");
    fileSnapshot(f);
    writeFileSync(f, "swapped later!");
    const { client, got } = recorder();
    await sendFileMessage(client, "me", f);
    await expect(bytesOf(got[0])).resolves.toBe("approved bytes");
    expect((got[0] as { name: string }).name).toBe("a.txt");
  });

  it("set-avatar", async () => {
    const f = join(dir, "me.jpg");
    writeFileSync(f, "approved photo");
    fileSnapshot(f);
    writeFileSync(f, "another photo!");
    const { client, got } = recorder();
    await setProfilePhoto(client, f);
    await expect(bytesOf(got[0])).resolves.toBe("approved photo");
  });
});

describe("after an approval that covers files, only those files can be sent", () => {
  it("a path the approval did not read is refused, not read", async () => {
    const approved = join(dir, "approved.bin");
    const other = join(dir, "other.bin");
    writeFileSync(approved, "yes");
    writeFileSync(other, "no");
    fileSnapshot(approved);
    sealFileSnapshots();
    const { client, got } = recorder();
    await expect(sendFileMessage(client, "me", other)).rejects.toThrow(
      /not the file that was approved; nothing was sent/
    );
    expect(got).toEqual([]);
    await sendFileMessage(client, "me", approved);
    await expect(bytesOf(got[0])).resolves.toBe("yes");
  });
});

describe("click presses only the button the person approved", () => {
  it("refuses when the keyboard changed between the approval and the press", async () => {
    const world = seedWorld();
    const menu = world.chats.find((c) => c.id === 2001)!.messages[1];
    const approved = buttonFingerprint({
      index: 2,
      row: 0,
      col: 1,
      text: "Status",
      type: "callback",
      data: Buffer.from("status").toString("base64"),
    });
    menu.buttons![0][1] = {
      text: "Status",
      data: "order",
      answer: "Order created",
      reply: { text: "Order #42 is confirmed." },
    };
    writeFileSync(state, JSON.stringify(world));
    expectButton(approved);
    await expect(
      clickButton(await getClient(), "2001", 2, { index: 2 }, { waitMs: 0 })
    ).rejects.toThrow(/changed after the approval; nothing was pressed/);
    expectButton(
      buttonFingerprint({
        index: 1,
        row: 0,
        col: 0,
        text: "Catalog",
        type: "callback",
        data: Buffer.from("catalog").toString("base64"),
      })
    );
    await expect(
      clickButton(await getClient(), "2001", 2, { index: 1 }, { waitMs: 0 })
    ).resolves.toMatchObject({ action: "callback" });
  });

  it("over MCP binds the unmasked button: two gift links that mask alike are still different buttons", async () => {
    const world = seedWorld();
    const menu = world.chats.find((c) => c.id === 2001)!.messages[1];
    menu.buttons![0][1] = {
      text: "Claim https://t.me/giftcode/AAAA1111",
      data: "status",
      answer: "ok",
    };
    writeFileSync(state, JSON.stringify(world));
    process.env.TG_MCP = "1";
    try {
      const approved = await findButton(await getClient(), "2001", 2, {
        index: 2,
      });
      expect(approved.info.text).not.toContain("AAAA1111");
      menu.buttons![0][1] = {
        text: "Claim https://t.me/giftcode/BBBB2222",
        data: "status",
        answer: "ok",
      };
      writeFileSync(state, JSON.stringify(world));
      await disconnectClient();
      const now = await findButton(await getClient(), "2001", 2, { index: 2 });
      expect(now.info).toEqual(approved.info);
      expectButton(approved.fingerprint);
      await expect(
        clickButton(await getClient(), "2001", 2, { index: 2 }, { waitMs: 0 })
      ).rejects.toThrow(/changed after the approval; nothing was pressed/);
    } finally {
      delete process.env.TG_MCP;
    }
  });
});

describe("review findings on the binding itself", () => {
  it.skipIf(process.platform === "win32")(
    "a symlink retargeted after the check still uploads the checked bytes",
    async () => {
      const { symlinkSync, unlinkSync } = await import("node:fs");
      const a = join(dir, "approved.txt");
      const b = join(dir, "other.txt");
      const link = join(dir, "link.txt");
      writeFileSync(a, "approved bytes");
      writeFileSync(b, "other bytes!!!");
      symlinkSync(a, link);
      fileSnapshot(link);
      unlinkSync(link);
      symlinkSync(b, link);
      const { client, got } = recorder();
      await sendFileMessage(client, "me", link);
      await expect(bytesOf(got[0])).resolves.toBe("approved bytes");
    }
  );

  it("every chat the request resolves is one the approval found, whatever marker-like fields sit next to it", async () => {
    const { apiChatRefs } = await import("../src/approval-action.js");
    const params = {
      _base64: 1,
      peer: { _chat: "@x" },
      list: [{ _hex: null, to: { _chat: "@y" } }],
    };
    expect(apiChatRefs(params).map((r) => r.value)).toEqual(["@x", "@y"]);
  });
});
