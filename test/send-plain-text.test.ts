import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import bigInt from "big-integer";
import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/index.js";
import { describe, expect, it } from "vitest";

import {
  editMessageText,
  sendFileMessage,
  sendMessage,
} from "../src/client.js";
import { fileSnapshot } from "../src/file-snapshot.js";

function recordingClient() {
  const requests: unknown[] = [];
  const client = new TelegramClient(new StringSession(""), 1, "x", {
    connectionRetries: 0,
  });
  const self = new Api.User({
    id: bigInt(42),
    accessHash: bigInt(7),
    self: true,
    firstName: "Me",
  });
  Object.assign(client, {
    invoke: async (req: unknown) => {
      requests.push(req);
      throw new Error("recorded");
    },
    getMe: async () => self,
  });
  (
    client as unknown as { _media: { savePart: () => Promise<void> } }
  )._media.savePart = async () => {};
  return { client, requests };
}

const TEXT = "Открой __init__.py и **main**";

interface Sent {
  message: string;
  entities?: unknown[];
}
const only = (
  requests: unknown[],
  kind: new (...a: never[]) => unknown
): Sent => {
  const found = requests.filter((r) => r instanceof kind);
  expect(found).toHaveLength(1);
  return found[0] as Sent;
};

describe("outgoing text is literal unless --html or --markdown asks for parsing", () => {
  it("send and reply: the request carries the text as typed, no entities", async () => {
    for (const reply of [undefined, 5]) {
      const { client, requests } = recordingClient();
      await expect(sendMessage(client, "me", TEXT, reply)).rejects.toThrow(
        "recorded"
      );
      const req = only(requests, Api.messages.SendMessage);
      expect(req.message).toBe(TEXT);
      expect(req.entities ?? []).toEqual([]);
    }
  });

  it("schedule keeps the text literal too", async () => {
    const { client, requests } = recordingClient();
    await expect(
      sendMessage(client, "me", TEXT, undefined, { schedule: 2_000_000_000 })
    ).rejects.toThrow("recorded");
    expect(only(requests, Api.messages.SendMessage).message).toBe(TEXT);
  });

  it("edit: the new text is literal", async () => {
    const { client, requests } = recordingClient();
    await expect(editMessageText(client, "me", 5, TEXT)).rejects.toThrow(
      "recorded"
    );
    const req = only(requests, Api.messages.EditMessage);
    expect(req.message).toBe(TEXT);
    expect(req.entities ?? []).toEqual([]);
  });

  it("send-file: the caption is literal", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tg-plain-"));
    try {
      const f = join(dir, "a.txt");
      writeFileSync(f, "hello");
      fileSnapshot(f);
      const { client, requests } = recordingClient();
      await expect(
        sendFileMessage(client, "me", f, { caption: TEXT, asDocument: true })
      ).rejects.toThrow("recorded");
      const req = only(requests, Api.messages.SendMedia);
      expect(req.message).toBe(TEXT);
      expect(req.entities ?? []).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--markdown and --html still parse", async () => {
    const md = recordingClient();
    await expect(
      sendMessage(md.client, "me", TEXT, undefined, { parseMode: "md" })
    ).rejects.toThrow("recorded");
    const sent = only(md.requests, Api.messages.SendMessage);
    expect(sent.message).toBe("Открой init.py и main");
    expect(sent.entities?.length).toBe(2);
    const html = recordingClient();
    await expect(
      editMessageText(html.client, "me", 5, "<b>bold</b> a_b", {
        parseMode: "html",
      })
    ).rejects.toThrow("recorded");
    const edited = only(html.requests, Api.messages.EditMessage);
    expect(edited.message).toBe("bold a_b");
    expect(edited.entities?.length).toBe(1);
  });
});
