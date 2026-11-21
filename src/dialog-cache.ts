import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

import { configFile, isMock } from "./paths.js";

/**
 * The dialog list on disk, so that naming a chat does not read the whole list again in every
 * process: on a big account that is dozens of messages.GetDialogs calls and a FLOOD_WAIT. One file
 * per profile (under TG_MOCK one per state file, so mock worlds never see each other's chats),
 * bound to the logged-in session, trusted for DIALOG_CACHE_TTL_MS.
 *
 * Only what names a chat is kept: ID, title, @username, type and the access hash Telegram needs to
 * fetch that one chat again. Never a message, a preview or a counter.
 */
export interface CachedChat {
  /** Peer ID as `chats` prints it: user ID, -chatId, -100channelId */
  id: string;
  title: string;
  username?: string;
  type: "user" | "bot" | "group" | "supergroup" | "channel";
  /** What Telegram needs to fetch a user or channel by ID (none for a basic group) */
  accessHash?: string;
}

interface DialogCacheFile {
  v: 1;
  /** A hash of the session this list came from: another login never reads it */
  account: string;
  savedAt: number;
  /** The whole dialog list (not cut at the read limit): a title found once is the only one */
  complete: boolean;
  chats: CachedChat[];
}

export const DIALOG_CACHE_TTL_MS = 10 * 60_000;

/** Where the list lives: the profile's folder, or next to the mock state file. */
export function dialogCachePath(): string {
  const mock = process.env.TG_MOCK ?? "";
  if (isMock() && !/^(1|true|yes|on)$/i.test(mock)) {
    return `${mock}.dialogs.json`;
  }
  return configFile("dialogs-cache.json");
}

/** The cache's name for a session; never the session itself. */
export function accountKey(session: string): string {
  return createHash("sha256")
    .update(`tg-dialog-cache\0${session}`)
    .digest("hex")
    .slice(0, 32);
}

const TYPES = new Set(["user", "bot", "group", "supergroup", "channel"]);

function validChat(c: unknown): c is CachedChat {
  const x = c as CachedChat | null;
  return (
    !!x &&
    typeof x.id === "string" &&
    /^-?\d+$/.test(x.id) &&
    typeof x.title === "string" &&
    TYPES.has(x.type) &&
    (x.username === undefined || typeof x.username === "string") &&
    (x.accessHash === undefined ||
      (typeof x.accessHash === "string" && /^-?\d+$/.test(x.accessHash)))
  );
}

/** TG_NO_CACHE=1: never answer from the list on disk (a fresh list is still saved for the next run). */
export function dialogCacheDisabled(): boolean {
  return /^(1|true|yes|on)$/i.test(process.env.TG_NO_CACHE ?? "");
}

/**
 * One stderr line per chat lookup: hit, miss or refresh (and why). With TG_LOG_LEVEL=debug, or with
 * TG_DEBUG_CACHE=1 alone (this line and nothing else, not teleproto's debug log).
 */
export function logDialogCache(line: string): void {
  if (
    process.env.TG_LOG_LEVEL?.toLowerCase() === "debug" ||
    /^(1|true|yes|on)$/i.test(process.env.TG_DEBUG_CACHE ?? "")
  ) {
    process.stderr.write(`dialog cache: ${line}\n`);
  }
}

/** The list saved for this account, if it is fresh. A missing, old or broken file is a miss, never an error. */
export function readDialogCache(
  account: string,
  now = Date.now()
): { complete: boolean; savedAt: number; chats: CachedChat[] } | undefined {
  try {
    const file = JSON.parse(
      readFileSync(dialogCachePath(), "utf-8")
    ) as DialogCacheFile;
    if (
      file?.v !== 1 ||
      file.account !== account ||
      typeof file.savedAt !== "number"
    ) {
      return undefined;
    }
    if (
      now - file.savedAt > DIALOG_CACHE_TTL_MS ||
      file.savedAt > now + 60_000
    ) {
      return undefined;
    }
    if (!Array.isArray(file.chats) || !file.chats.every(validChat)) {
      return undefined;
    }
    return {
      complete: file.complete === true,
      savedAt: file.savedAt,
      chats: file.chats,
    };
  } catch {
    return undefined;
  }
}

/** Save a freshly read list (atomically, 0600). A failure only means the next run reads the list again. */
export function writeDialogCache(
  account: string,
  complete: boolean,
  chats: CachedChat[],
  now = Date.now()
): void {
  const path = dialogCachePath();
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const file: DialogCacheFile = {
      v: 1,
      account,
      savedAt: now,
      complete,
      // Field by field: nothing else of a dialog ever reaches the file
      chats: chats.map((c) => ({
        id: c.id,
        title: c.title,
        ...(c.username ? { username: c.username } : {}),
        type: c.type,
        ...(c.accessHash ? { accessHash: c.accessHash } : {}),
      })),
    };
    writeFileSync(tmp, JSON.stringify(file), { mode: 0o600 });
    renameSync(tmp, path);
  } catch {
    try {
      rmSync(tmp, { force: true });
    } catch {
      /* nothing to clean */
    }
  }
}

/** Forget the list (logout, login): it belongs to the account that was logged in. */
export function clearDialogCache(): void {
  try {
    rmSync(dialogCachePath(), { force: true });
  } catch {
    // nothing to remove
  }
}
