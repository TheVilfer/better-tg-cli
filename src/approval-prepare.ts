import { createHash } from "node:crypto";

import { descriptorOf, oneLine } from "./approval-action.js";
import type { ParsedAction } from "./approval-action.js";
import {
  assertMessagesInChat,
  deletesForEveryone,
  expectButton,
  findButton,
  getClient,
  parseIdList,
  resolveChat,
} from "./client.js";
import type { ButtonInfo, ClickSelector } from "./client.js";
import {
  fileSnapshot,
  sealFileSnapshots,
  snapshotDigest,
} from "./file-snapshot.js";
import { revisionLabel } from "./plugins/human.js";
import { expectInstall, loadPlugin } from "./plugins/store.js";
import { readStdinOnce, stdinBody } from "./text.js";

/**
 * The parts of an action that only Telegram or the disk can tell, read before an approval is shown
 * or checked: they go into the approval hash and the description, and the write later uses exactly
 * what was read here (the same file bytes, the same button), or refuses.
 */
export interface Prepared {
  /** Bound into the approval hash */
  bound: unknown[];
  /** More lines for the person to read */
  lines: string[];
  /** The same lines for the MCP model where they differ from `lines` (a button as the model sees it) */
  modelLines?: string[];
  /** Called once the approval for this action held, before the write runs */
  onApproved(): void;
}

const arg = (action: ParsedAction, name: string): string | undefined => {
  const a = action.args.find((x) => x.name === name);
  return a === undefined
    ? undefined
    : Array.isArray(a.value)
      ? a.value.join(",")
      : a.value;
};

const quote = (text: string) => JSON.stringify(oneLine(text));

/** A button in words: which one, its kind, and what pressing it sends. */
export function describeButton(info: ButtonInfo): string {
  const head = `#${info.index} ${quote(info.text)}`;
  switch (info.type) {
    case "callback": {
      const raw = Buffer.from(info.data ?? "", "base64");
      const text = raw.toString("utf-8");
      const shown = Buffer.from(text, "utf-8").equals(raw)
        ? ` = ${quote(text)}`
        : "";
      return `${head}: a bot button, sends the bot the data ${info.data}${shown}${info.requiresPassword ? " (asks for your 2FA password)" : ""}`;
    }
    case "text": {
      return `${head}: a keyboard button, sends ${quote(info.text)} as a message to the chat`;
    }
    case "game": {
      return `${head}: a game button, starts the game`;
    }
    case "url":
    case "url_auth":
    case "webview": {
      return `${head}: a link button (${info.type}), nothing is sent; it shows ${quote(info.url ?? "")}`;
    }
    default: {
      return `${head}: a ${info.type} button`;
    }
  }
}

/** The click's button, chosen as the command chooses it. */
function selectorOf(action: ParsedAction): ClickSelector | undefined {
  const data = action.options.find(([k]) => k === "data")?.[1];
  if (typeof data === "string") {
    return { dataBase64: data };
  }
  const button = arg(action, "button");
  if (button === undefined) {
    return undefined;
  }
  return /^\d+$/.test(button)
    ? { index: Number.parseInt(button, 10) }
    : { text: button };
}

/**
 * Reads what the approval of this action has to cover beyond its arguments. Throws (the guard
 * then stops with "nothing to approve") when the write could not run as shown: a file that can't
 * be read, a message that is not in the chat shown, a button that is not there.
 */
export async function prepareAction(action: ParsedAction): Promise<Prepared> {
  const prepared: Prepared = { bound: [], lines: [], onApproved: () => {} };
  if (!action.parsed) {
    return prepared;
  }
  const d = descriptorOf(action.command);

  for (const name of d?.files ?? []) {
    const path = arg(action, name);
    if (path === undefined) {
      continue;
    }
    const snap = fileSnapshot(path);
    prepared.bound.push(["file", name, snapshotDigest(snap)]);
    prepared.lines.push(
      `  File size: ${snap.bytes.length} bytes (the approval covers exactly these bytes)`
    );
    prepared.onApproved = sealFileSnapshots;
  }

  if (action.command === "delete") {
    const chat = arg(action, "chat")!;
    const ids = parseIdList(arg(action, "messageIds") ?? "");
    const client = await getClient();
    const entity = await resolveChat(client, chat);
    await assertMessagesInChat(client, entity, ids);
    if (deletesForEveryone(entity)) {
      prepared.lines.push(
        "  For everyone: in a channel or supergroup Telegram deletes a message for all members; --just-me cannot keep it for others."
      );
    }
  }

  if (action.command === "click") {
    const selector = selectorOf(action);
    const id = Number.parseInt(arg(action, "messageId") ?? "", 10);
    if (selector && Number.isInteger(id)) {
      const client = await getClient();
      const { info, rawInfo, fingerprint } = await findButton(
        client,
        arg(action, "chat")!,
        id,
        selector
      );
      prepared.bound.push(["button", fingerprint]);
      // The person sees the button that will be pressed; the model only its masked copy
      prepared.modelLines = [
        ...prepared.lines,
        `  Pressing: ${describeButton(info)}`,
      ];
      prepared.lines.push(`  Pressing: ${describeButton(rawInfo)}`);
      prepared.onApproved = () => expectButton(fingerprint);
    }
  }
  if (
    action.command === "plugin data set" ||
    action.command === "plugin data delete" ||
    action.command === "plugin settings set"
  ) {
    // The approval covers this installation of the plugin: one installed under the same name later
    // (another source, other code) does not inherit it
    const { entry } = loadPlugin(arg(action, "name") ?? "");
    prepared.bound.push(["plugin", entry.installId, entry.revision]);
    prepared.lines.push(
      `  Installation: ${entry.installId} (${revisionLabel(entry.source, entry.revision)})`
    );
    prepared.onApproved = () => expectInstall(entry);
  }
  if (action.command === "plugin run") {
    // This installation and snapshot, this command with its effects, this input: an update in
    // between (another snapshot) invalidates the approval
    const { entry, manifest } = loadPlugin(arg(action, "name") ?? "");
    const command = (manifest.commands ?? []).find(
      (c) => c.name === arg(action, "command")
    );
    const input = action.options.find(([k]) => k === "input")?.[1];
    const inputText =
      input === "-"
        ? stdinBody(readStdinOnce())
        : typeof input === "string"
          ? input
          : "{}";
    const effects = command?.effects ?? [];
    // Where the run may send data: the manifest's origins, and the secrets the host would attach
    const origins = effects.includes("network")
      ? [...(manifest.network ?? [])].sort()
      : [];
    const secrets = effects.includes("network")
      ? (manifest.secrets ?? [])
          .map(
            (s) =>
              `${s.name} → ${s.inject.origin}${s.inject.paths ? ` ${s.inject.paths.join(",")}` : ""}`
          )
          .sort()
      : [];
    const inputHash = createHash("sha256").update(inputText).digest("base64");
    prepared.bound.push([
      "plugin",
      entry.installId,
      entry.revision,
      command?.name ?? arg(action, "command"),
      effects,
      origins,
      secrets,
      inputHash,
    ]);
    prepared.lines.push(
      `  Installation: ${entry.installId} (${revisionLabel(entry.source, entry.revision)})`
    );
    const does = [
      effects.includes("storage") && "save this plugin's data",
      effects.includes("network") && "send data to the internet",
      effects.includes("actions") &&
        "propose Telegram actions you confirm separately",
    ]
      .filter(Boolean)
      .join(", ");
    prepared.lines.push(
      `  Effects: ${effects.join(", ") || "none"}${does ? ` (it can ${does})` : ""}`
    );
    if (origins.length) {
      const reads = (manifest.permissions ?? []).filter((p) =>
        [
          "messages:read-own",
          "messages:read",
          "messages:read-target",
          "chats:read",
          "identity:read",
          "storage:read",
        ].includes(p)
      );
      prepared.lines.push(
        `  Sends to: ${origins.join(", ")}${reads.length ? ` (what it reads: ${reads.join(", ")})` : ""}`
      );
      if (secrets.length) {
        prepared.lines.push(
          `  Secrets the host attaches: ${secrets.join("; ")} (the plugin never sees them)`
        );
      }
    }
    prepared.lines.push(`  Input: ${oneLine(inputText)}`);
    prepared.onApproved = () => expectInstall(entry);
  }
  return prepared;
}
