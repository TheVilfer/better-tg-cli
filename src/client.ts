import { existsSync, lstatSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import bigInt from "big-integer";
import { TelegramClient, Api, Rich, utils } from "teleproto";
import { generateRandomLong } from "teleproto/Helpers.js";
import { computeCheck } from "teleproto/Password.js";
import { StringSession } from "teleproto/sessions/index.js";

import { apiMarker, INVITE_LINK } from "./approval-action.js";
import { approvedForAnotherSession, MOCK_ACCOUNT } from "./approval.js";
import { clientParams } from "./client-options.js";
import {
  getCredentials,
  setSessionString,
  isConfigured,
  loadConfig,
} from "./config.js";
import type { TgConfig } from "./config.js";
import {
  accountKey,
  DIALOG_CACHE_TTL_MS,
  dialogCacheDisabled,
  logDialogCache,
  readDialogCache,
  writeDialogCache,
} from "./dialog-cache.js";
import type { CachedChat } from "./dialog-cache.js";
import {
  CliError,
  EXIT,
  formatCandidates,
  SESSION_ERRORS,
  sessionEndedBy,
  shellCommand,
  usageError,
} from "./errors.js";
import type { ChatCandidate } from "./errors.js";
import { fileSnapshot, uploadable } from "./file-snapshot.js";
import { loginHint } from "./login-hint.js";
import { LOGIN_CODE_HIDDEN, maskForModel } from "./mcp-output.js";
import { isMock } from "./paths.js";
import { getInvocation, isStrictChatResolution } from "./resolve-mode.js";
import { isTTY } from "./spinner.js";
import { connectClient, transportSetting } from "./transport.js";

/** First words of the error getClient() throws for a session Telegram no longer accepts (onboard looks for it). */
export const SESSION_EXPIRED = "Session expired or was revoked.";

let clientInstance: TelegramClient | null = null;
let clientSession: string | undefined;

const ANOTHER_ACCOUNT_ERROR =
  "Another account logged in after this write was approved. Nothing was sent; run the command again for a new approval.";

/** `snapshot`: a config the caller already loaded (`telegram check`), used instead of a new read. */
export async function getClient(snapshot?: TgConfig): Promise<TelegramClient> {
  if (clientInstance?.connected) {
    if (
      clientSession !== undefined &&
      approvedForAnotherSession(clientSession)
    ) {
      throw new Error(ANOTHER_ACCOUNT_ERROR);
    }
    return clientInstance;
  }

  if (isMock()) {
    if (approvedForAnotherSession(MOCK_ACCOUNT)) {
      throw new Error(ANOTHER_ACCOUNT_ERROR);
    }
    const { createMockClient } = await import("./mock/client.js");
    clientInstance = createMockClient();
    clientSession = MOCK_ACCOUNT;
    return clientInstance;
  }

  const config = snapshot ?? loadConfig(() => {});
  if (!isConfigured(config)) {
    throw new CliError(
      "Not configured.",
      "not_configured",
      EXIT.NOT_LOGGED_IN,
      { hint: loginHint() }
    );
  }

  const { apiId, apiHash } = getCredentials(config);
  const sessionString = config.sessionString || "";
  if (approvedForAnotherSession(sessionString)) {
    throw new Error(ANOTHER_ACCOUNT_ERROR);
  }

  const testServers = !!config.testServers;
  clientInstance = await connectClient(
    (t) =>
      new TelegramClient(
        new StringSession(sessionString),
        apiId,
        apiHash,
        clientParams(testServers, t)
      ),
    { setting: transportSetting(undefined, config) }
  );
  clientSession = sessionString;

  await checkSession(clientInstance);

  return clientInstance;
}

/**
 * RPC errors that mean Telegram no longer accepts this session (logged out elsewhere, revoked, the
 * account deleted or banned): only these make a stored login "expired". Anything else (no network,
 * a timeout, flood wait, a 2FA password still to enter) is not a reason to log in again and replace
 * the session. One list (SESSION_ERRORS in src/errors.ts) for getClient, onboard/telegram_setup and
 * the exit code of any later call.
 */
export const AUTH_ERRORS = SESSION_ERRORS;

export function isAuthError(e: unknown): boolean {
  return sessionEndedBy(e) !== undefined;
}

/**
 * Whether the saved login still works, by the reason a probe fails: an auth error (the session was
 * revoked, expired, its key dropped) is "log in again", exit 5 (code session_expired, the message
 * starts with SESSION_EXPIRED); anything else (no network, FLOOD_WAIT) is thrown as it is and keeps
 * its own code. teleproto's isUserAuthorized() is not used: it answers false for any failure, a
 * dropped connection included.
 */
export async function checkSession(
  client: Pick<TelegramClient, "invoke">
): Promise<void> {
  try {
    await client.invoke(new Api.updates.GetState());
  } catch (error) {
    if (!isAuthError(error)) {
      throw error;
    }
    throw new CliError(SESSION_EXPIRED, "session_expired", EXIT.NOT_LOGGED_IN, {
      hint: loginHint(),
    });
  }
}

export async function createClient(
  apiId: number,
  apiHash: string
): Promise<TelegramClient> {
  return connectClient(
    (t) =>
      new TelegramClient(
        new StringSession(""),
        apiId,
        apiHash,
        clientParams(undefined, t)
      )
  );
}

export async function saveSession(client: TelegramClient): Promise<void> {
  const sessionString = (client.session as StringSession).save();
  setSessionString(sessionString);
}

export async function disconnectClient(): Promise<void> {
  if (clientInstance) {
    try {
      await clientInstance.destroy();
    } catch {}
    clientInstance = null;
  }
  clientSession = undefined;
  resolvedChatCache.clear();
  dialogsCache = null;
  allDialogsCache = null;
  dialogsReadAt = 0;
  allDialogsReadAt = 0;
}

const resolvedChatCache = new Map<string, ResolvedEntity>();

let dialogsCache: ReturnType<TelegramClient["getDialogs"]> | null = null;
let dialogsReadAt = 0;
let allDialogsReadAt = 0;
const DIALOGS_REUSE_MS = 10_000;

/** One page of dialogs: enough for IDs and most accounts. */
export const DIALOG_PAGE = 500;
/** How far a title lookup reads before it gives up proving a title unique. */
export const DIALOG_MAX = 5000;

function getDialogsCached(
  client: TelegramClient
): ReturnType<TelegramClient["getDialogs"]> {
  if (!dialogsCache) {
    dialogsCache = client.getDialogs({ limit: DIALOG_PAGE }).then((dialogs) => {
      const account = dialogCacheAccount(client);
      if (
        account &&
        (dialogs.length < DIALOG_PAGE || !readDialogCache(account))
      ) {
        saveDialogList(account, dialogs, dialogs.length < DIALOG_PAGE);
      }
      return dialogs;
    });
    dialogsReadAt = Date.now();
    dialogsCache.catch(() => {
      dialogsCache = null;
    });
  }
  return dialogsCache;
}

function dialogCacheAccount(client: TelegramClient): string | undefined {
  return client === clientInstance && clientSession !== undefined
    ? accountKey(clientSession)
    : undefined;
}

function saveDialogList(
  account: string,
  dialogs: Dialogs,
  complete: boolean
): void {
  const chats: CachedChat[] = [];
  for (const d of dialogs) {
    const e = d.entity;
    if (
      d.id === undefined ||
      !(
        e instanceof Api.User ||
        e instanceof Api.Chat ||
        e instanceof Api.Channel
      )
    ) {
      continue;
    }
    const hash = e instanceof Api.Chat ? undefined : e.accessHash?.toString();
    const username =
      e instanceof Api.Chat ? undefined : (e.username ?? undefined);
    chats.push({
      id: d.id.toString(),
      title: d.title ?? "",
      ...(username ? { username } : {}),
      type: dialogKind(d) as CachedChat["type"],
      ...(hash ? { accessHash: hash } : {}),
    });
  }
  writeDialogCache(account, complete, chats);
}

function dialogTitle(entity: ResolvedEntity): string {
  return entity instanceof Api.User
    ? [entity.firstName, entity.lastName].filter(Boolean).join(" ")
    : entity.title;
}

function inputPeerOf(c: CachedChat): Api.TypeInputPeer {
  const hash = bigInt(c.accessHash ?? "0");
  if (c.type === "user" || c.type === "bot") {
    return new Api.InputPeerUser({ userId: bigInt(c.id), accessHash: hash });
  }
  if (c.type === "group") {
    return new Api.InputPeerChat({ chatId: bigInt(c.id.replace(/^-/, "")) });
  }
  return new Api.InputPeerChannel({
    channelId: bigInt(c.id.replace(/^-100/, "")),
    accessHash: hash,
  });
}

type DiskLookup =
  | { entity: ResolvedEntity; listedAt: string }
  | { error: CliError; listedAt: string }
  | { miss: string };

async function fromDialogCache(
  client: TelegramClient,
  asGiven: string,
  identifier: string,
  username: string | undefined,
  isNumericId: boolean
): Promise<DiskLookup> {
  const account = dialogCacheAccount(client);
  if (!account) {
    return { miss: "not the CLI client" };
  }
  if (dialogCacheDisabled()) {
    return { miss: "TG_NO_CACHE=1" };
  }
  const saved = readDialogCache(account);
  if (!saved) {
    return { miss: "no fresh list on disk" };
  }
  const listedAt = new Date(saved.savedAt).toISOString();
  const strict = isStrictChatResolution();
  const needle = (username ? username.replace(/^@/, "") : identifier)
    .trim()
    .toLowerCase();
  let hit: CachedChat | undefined;
  let exact: CachedChat[] = [];
  let partial: CachedChat[] = [];
  if (username) {
    hit = saved.chats.find((c) => c.username?.toLowerCase() === needle);
  } else if (isNumericId) {
    hit = saved.chats.find((c) => c.id === identifier);
  } else if (saved.complete && !strict) {
    exact = saved.chats.filter((c) => c.title.trim().toLowerCase() === needle);
    partial = exact.length
      ? []
      : saved.chats.filter((c) => c.title.toLowerCase().includes(needle));
    if (exact.length === 1) {
      hit = exact[0];
    } else if (!exact.length && partial.length === 1) {
      hit = partial[0];
    }
  }
  if (hit) {
    const entity = await fetchCached(
      client,
      hit,
      needle,
      username,
      isNumericId,
      !exact.length && !username && !isNumericId
    );
    return entity
      ? { entity, listedAt }
      : { miss: "the chat changed since the list was saved" };
  }
  if (username) {
    return { miss: "the @username is not in the list" };
  }
  if (isNumericId) {
    return { miss: "the ID is not in the list" };
  }
  if (strict) {
    return { miss: "writes read a fresh list" };
  }
  if (!saved.complete) {
    return { miss: "the list on disk is not the whole list" };
  }
  if (dialogsCache || allDialogsCache) {
    return { miss: "the list was read in this process" };
  }
  const from = { listedAt };
  if (exact.length > 1) {
    return { error: ambiguousChat(asGiven, exact, "exact", from), listedAt };
  }
  if (partial.length > 1) {
    return {
      error: ambiguousChat(asGiven, partial, "partial", from),
      listedAt,
    };
  }
  return { error: chatNotFound(asGiven, saved.chats, from), listedAt };
}

async function fetchCached(
  client: TelegramClient,
  hit: CachedChat,
  needle: string,
  username: string | undefined,
  isNumericId: boolean,
  partial: boolean
): Promise<ResolvedEntity | undefined> {
  try {
    const entity = await client.getEntity(inputPeerOf(hit));
    if (
      !(
        entity instanceof Api.User ||
        entity instanceof Api.Chat ||
        entity instanceof Api.Channel
      )
    ) {
      return undefined;
    }
    if (utils.getPeerId(entity).toString() !== hit.id) {
      return undefined;
    }
    if (
      username &&
      (entity instanceof Api.Chat || entity.username?.toLowerCase() !== needle)
    ) {
      return undefined;
    }
    if (!username && !isNumericId) {
      const title = dialogTitle(entity).trim().toLowerCase();
      if (partial ? !title.includes(needle) : title !== needle) {
        return undefined;
      }
    }
    return entity;
  } catch {
    return undefined;
  }
}

let allDialogsCache: Promise<{ dialogs: Dialogs; complete: boolean }> | null =
  null;

async function dialogsForTitles(
  client: TelegramClient
): Promise<{ dialogs: Dialogs; complete: boolean }> {
  const first = await getDialogsCached(client);
  if (first.length < DIALOG_PAGE) {
    return { dialogs: first, complete: true };
  }
  if (!allDialogsCache) {
    allDialogsCache = client
      .getDialogs({ limit: DIALOG_MAX })
      .then((dialogs) => {
        const complete = dialogs.length < DIALOG_MAX;
        const account = dialogCacheAccount(client);
        if (account) {
          saveDialogList(account, dialogs, complete);
        }
        return { dialogs, complete };
      });
    allDialogsReadAt = Date.now();
    allDialogsCache.catch(() => {
      allDialogsCache = null;
    });
  }
  return allDialogsCache;
}

function cacheKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

const pinnedPeers = new Map<string, ResolvedEntity>();

export function pinPeer(identifier: string, entity: ResolvedEntity): void {
  pinnedPeers.set(identifier, entity);
}

export async function getMe(client: TelegramClient): Promise<Api.User> {
  const me = await client.getMe();
  if (!me || !(me instanceof Api.User)) {
    throw new Error("Failed to get user info");
  }
  return me;
}

/** Values of `--type` in chats and inbox: the chat types plus "bot" (users that are bots). */
export const CHAT_TYPES = [
  "user",
  "bot",
  "group",
  "supergroup",
  "channel",
] as const;

/** Whether a chat passes `--type`: "user" keeps its old meaning (bots included), "bot" only bots. */
export function matchesChatType(
  chat: Pick<ChatInfo, "type" | "bot">,
  type: string
): boolean {
  return type === "bot"
    ? chat.type === "user" && !!chat.bot
    : chat.type === type;
}

/**
 * - `bot`: A bot account (type stays "user"); `--type bot` lists only these.
 * - `full`: Opt-in (`--full`): full stats of this chat's last message. Absent in default output.
 */
export interface ChatInfo {
  id: string;
  title: string;
  type: "user" | "group" | "supergroup" | "channel";
  bot?: boolean;
  username?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageDate?: Date;
  muted?: boolean;
  archived?: boolean;
  full?: MessageFull;
}

async function sharedDialogs(
  client: TelegramClient,
  limit: number
): Promise<Dialogs[number][]> {
  if (client !== clientInstance) {
    return client.getDialogs({ limit });
  }
  const now = Date.now();
  if (allDialogsCache && now - allDialogsReadAt <= DIALOGS_REUSE_MS) {
    const all = await allDialogsCache.catch(() => undefined);
    if (all && (all.complete || all.dialogs.length >= limit)) {
      return all.dialogs.slice(0, limit);
    }
  }
  if (dialogsCache && now - dialogsReadAt <= DIALOGS_REUSE_MS) {
    const first = await dialogsCache.catch(() => undefined);
    if (first && (first.length < DIALOG_PAGE || first.length >= limit)) {
      return first.slice(0, limit);
    }
  }
  const dialogs = await client.getDialogs({ limit });
  const complete = dialogs.length < limit;
  if (complete || limit >= DIALOG_PAGE) {
    dialogsCache = Promise.resolve(dialogs);
    dialogsReadAt = now;
    if (dialogs.length >= DIALOG_PAGE && (complete || limit >= DIALOG_MAX)) {
      allDialogsCache = Promise.resolve({ dialogs, complete });
      allDialogsReadAt = now;
    }
    const account = dialogCacheAccount(client);
    if (account && (complete || !readDialogCache(account))) {
      saveDialogList(account, dialogs, complete);
    }
  }
  return dialogs;
}

export async function getDialogs(
  client: TelegramClient,
  limit = 100,
  options: { archived?: boolean; full?: boolean } = {}
): Promise<ChatInfo[]> {
  const dialogs =
    options.archived === undefined
      ? await sharedDialogs(client, limit)
      : await client.getDialogs({ limit, archived: options.archived });
  const now = Math.floor(Date.now() / 1000);
  const chats: ChatInfo[] = [];

  for (const dialog of dialogs) {
    let type: ChatInfo["type"] = "user";
    let title = dialog.title || "Unknown";
    let username: string | undefined;
    let bot: boolean | undefined;

    if (dialog.isUser) {
      type = "user";
      const entity = dialog.entity as Api.User;
      username = entity.username ?? undefined;
      bot = entity.bot || undefined;
      if (entity.self) {
        title = SAVED_MESSAGES;
      }
    } else if (dialog.entity instanceof Api.Channel) {
      type = dialog.entity.megagroup ? "supergroup" : "channel";
      username = dialog.entity.username ?? undefined;
    } else if (dialog.isGroup) {
      type = "group";
    }

    chats.push({
      id: dialog.id?.toString() || "",
      title,
      type,
      bot,
      username,
      unreadCount: dialog.unreadCount,
      lastMessage:
        dialog.message instanceof Api.Message
          ? messageText(dialog.message)
          : undefined,
      lastMessageDate: dialog.message?.date
        ? new Date(dialog.message.date * 1000)
        : undefined,
      muted: (dialog.dialog?.notifySettings?.muteUntil ?? 0) > now || undefined,
      archived: dialog.archived || undefined,
      full:
        options.full && dialog.message instanceof Api.Message
          ? buildMessageFull(dialog.message)
          : undefined,
    });
  }

  return chats;
}

export type MediaKind =
  | "photo"
  | "document"
  | "video"
  | "audio"
  | "voice"
  | "video_note"
  | "sticker"
  | "gif";

export interface MediaInfo {
  kind: MediaKind;
  fileName?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  hasSpoiler?: boolean;
}

export type ButtonType =
  | "callback"
  | "url"
  | "text"
  | "switch_inline"
  | "switch_inline_current"
  | "webview"
  | "url_auth"
  | "game"
  | "buy"
  | "copy"
  | "request_phone"
  | "request_geo"
  | "request_poll"
  | "request_peer"
  | "user_profile"
  | "unknown";

/**
 * - `index`: 1-based flat index across all rows (what the user passes to `telegram click`).
 * - `url`: URL for url/webview/url_auth buttons.
 * - `query`: Query string for switch_inline buttons.
 * - `data`: base64 of the raw callback payload (display only — never round-tripped back for clicking).
 * - `copyText`: Text a copy button places on the clipboard.
 * - `requiresPassword`: Callback button that needs the account 2FA password to press.
 */
export interface ButtonInfo {
  index: number;
  row: number;
  col: number;
  text: string;
  type: ButtonType;
  url?: string;
  query?: string;
  data?: string;
  copyText?: string;
  requiresPassword?: boolean;
}

/**
 * - `isInline`: true = inline keyboard attached under the message; false = custom reply keyboard.
 */
export interface ButtonLayout {
  isInline: boolean;
  rows: ButtonInfo[][];
}

/**
 * - `chatId`: Set on results that span several chats (global search).
 * - `replies`: Comment/reply count for channel posts and thread roots.
 * - `topicId`: Forum topic of the message (1 = General), set when a whole forum is read without --topic.
 * - `full`: Opt-in (`--full`): every other useful field of the Message. Absent in default output.
 */
export interface MessageInfo {
  id: number;
  date: Date;
  sender: string;
  senderId?: string;
  text: string;
  replyToMsgId?: number;
  isOutgoing: boolean;
  media?: MediaInfo;
  buttons?: ButtonLayout;
  chatId?: string;
  chatTitle?: string;
  replies?: number;
  topicId?: number;
  full?: MessageFull;
}

/**
 * A single reaction on a message, with its count and whether the account chose it.
 *
 * - `emoji`: Standard emoji, if a normal reaction.
 * - `customEmojiId`: Custom-emoji document id, if a custom reaction.
 * - `paid`: Star/paid reaction.
 * - `chosen`: The logged-in account reacted with this.
 */
export interface ReactionBreakdown {
  emoji?: string;
  customEmojiId?: string;
  paid?: boolean;
  count: number;
  chosen?: boolean;
  chosenOrder?: number;
}

/**
 * Rich media detail for `--full`: a superset of MediaInfo covering polls, geo, contacts, etc.
 *
 * - `url`: webpage
 * - `lat`: geo / venue
 * - `phone`: contact
 * - `emoticon`: dice
 * - `currency`: invoice
 * - `poll`: poll
 */
export interface FullMediaInfo {
  type: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  hasSpoiler?: boolean;
  url?: string;
  title?: string;
  siteName?: string;
  description?: string;
  lat?: number;
  long?: number;
  address?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  emoticon?: string;
  value?: number;
  currency?: string;
  amount?: number;
  poll?: {
    question: string;
    closed?: boolean;
    quiz?: boolean;
    multiple?: boolean;
    publicVoters?: boolean;
    totalVoters?: number;
    options: {
      text: string;
      voters?: number;
      chosen?: boolean;
      correct?: boolean;
    }[];
  };
}

/** Everything else on a Telegram Message, attached only when `--full` is requested. */
export interface MessageFull {
  out?: boolean;
  post?: boolean;
  silent?: boolean;
  pinned?: boolean;
  noforwards?: boolean;
  legacy?: boolean;
  fromScheduled?: boolean;
  views?: number;
  forwards?: number;
  editDate?: string;
  postAuthor?: string;
  groupedId?: string;
  viaBotId?: string;
  ttlPeriod?: number;
  reactions?: ReactionBreakdown[];
  recentReactors?: string[];
  replies?: {
    count: number;
    comments: boolean;
    channelId?: string;
    maxId?: number;
    readMaxId?: number;
    recentRepliers?: string[];
  };
  fwdFrom?: {
    fromId?: string;
    fromName?: string;
    date?: string;
    channelPost?: number;
    postAuthor?: string;
    savedFromPeer?: string;
    savedFromMsgId?: number;
  };
  replyTo?: {
    replyToMsgId?: number;
    topMsgId?: number;
    forumTopic?: boolean;
    quoteText?: string;
    replyToPeerId?: string;
  };
  media?: FullMediaInfo;
}

type RawButton = Api.KeyboardButton | Api.KeyboardInlineButton;

function classifyButton(
  btn: RawButton,
  index: number,
  row: number,
  col: number
): ButtonInfo {
  const base = { index, row, col, text: btn.text || "" };
  const t: Api.TypeButtonType | Api.TypeInlineButtonType = btn.type;

  if (t instanceof Api.InlineButtonTypeCallback) {
    return {
      ...base,
      type: "callback",
      data: Buffer.from(t.data).toString("base64"),
      requiresPassword: t.requiresPassword || undefined,
    };
  }
  if (t instanceof Api.InlineButtonTypeUrl) {
    return { ...base, type: "url", url: t.url };
  }
  if (
    t instanceof Api.InlineButtonTypeUrlAuth ||
    t instanceof Api.InputInlineButtonTypeUrlAuth
  ) {
    return { ...base, type: "url_auth", url: t.url };
  }
  if (
    t instanceof Api.InlineButtonTypeWebView ||
    t instanceof Api.ButtonTypeSimpleWebView
  ) {
    return { ...base, type: "webview", url: t.url };
  }
  if (t instanceof Api.InlineButtonTypeSwitchInline) {
    return {
      ...base,
      type: t.samePeer ? "switch_inline_current" : "switch_inline",
      query: t.query,
    };
  }
  if (t instanceof Api.InlineButtonTypeGame) {
    return { ...base, type: "game" };
  }
  if (t instanceof Api.InlineButtonTypeBuy) {
    return { ...base, type: "buy" };
  }
  if (t instanceof Api.InlineButtonTypeCopy) {
    return { ...base, type: "copy", copyText: t.copyText };
  }
  if (t instanceof Api.ButtonTypeRequestPhone) {
    return { ...base, type: "request_phone" };
  }
  if (t instanceof Api.ButtonTypeRequestGeoLocation) {
    return { ...base, type: "request_geo" };
  }
  if (t instanceof Api.ButtonTypeRequestPoll) {
    return { ...base, type: "request_poll" };
  }
  if (
    t instanceof Api.ButtonTypeRequestPeer ||
    t instanceof Api.InputButtonTypeRequestPeer
  ) {
    return { ...base, type: "request_peer" };
  }
  if (
    t instanceof Api.InlineButtonTypeUserProfile ||
    t instanceof Api.InputInlineButtonTypeUserProfile
  ) {
    return { ...base, type: "user_profile" };
  }
  if (t instanceof Api.ButtonTypeDefault) {
    return { ...base, type: "text" };
  }
  return { ...base, type: "unknown" };
}

/**
 * Plain text of a message. Since layer 228 bots (and Telegram clients) can send
 * "rich messages": `message` is then empty and the content is a block tree in
 * `richMessage` (headings, bold, mentions, lists…). Render it to plain text so
 * `read`/`search`/`watch`/`click` show the actual reply instead of "(no text)".
 */
export function messageText(msg: Api.Message): string {
  const text = plainMessageText(msg);
  if (!isOverMcp()) {
    return text;
  }
  return maskForModel(text, isLoginServiceMessage(msg) ? "service" : "chat");
}

export function plainMessageText(msg: Api.Message): string {
  if (msg.message) {
    return msg.message;
  }
  if (msg.richMessage) {
    try {
      return Rich.toPlainText(msg.richMessage).trim();
    } catch {
      return "";
    }
  }
  return "";
}

const isOverMcp = (): boolean =>
  !!(process.env.TG_MCP || process.env.TG_READ_ONLY);

const LOGIN_SERVICE_USER_IDS = new Set(["777000", "489000"]);

const isLoginServicePeer = (peer: unknown): boolean =>
  !!peer &&
  typeof peer === "object" &&
  "userId" in peer &&
  LOGIN_SERVICE_USER_IDS.has(String((peer as { userId: unknown }).userId));

function isLoginServiceMessage(msg: {
  peerId?: unknown;
  fromId?: unknown;
  fwdFrom?: unknown;
}): boolean {
  const fwd = msg.fwdFrom as { fromId?: unknown } | null | undefined;
  return (
    isLoginServicePeer(msg.peerId) ||
    isLoginServicePeer(msg.fromId) ||
    isLoginServicePeer(fwd?.fromId)
  );
}

/**
 * For plugins (src/plugins/host.ts): a message of a login-code service account as above, or one
 * that quotes or replies to such a message in another chat (the reply header names its source).
 */
export function isServiceSource(msg: {
  peerId?: unknown;
  fromId?: unknown;
  fwdFrom?: unknown;
  replyTo?: unknown;
}): boolean {
  if (isLoginServiceMessage(msg) || fwdNamesService(msg.fwdFrom)) {
    return true;
  }
  const reply = msg.replyTo as
    | { replyFrom?: unknown; replyToPeerId?: unknown }
    | null
    | undefined;
  return (
    fwdNamesService(reply?.replyFrom) ||
    isLoginServicePeer(reply?.replyToPeerId)
  );
}

function fwdNamesService(header: unknown): boolean {
  const h = header as
    | { fromId?: unknown; savedFromPeer?: unknown; savedFromId?: unknown }
    | null
    | undefined;
  return (
    isLoginServicePeer(h?.fromId) ||
    isLoginServicePeer(h?.savedFromPeer) ||
    isLoginServicePeer(h?.savedFromId)
  );
}

export { LOGIN_CODE_HIDDEN };

const NOT_CONTENT_KEY =
  /^(className|_|type|kind|mimeType|accessHash|hash|date|editDate|recentReactors|recentRepliers|savedFromPeer)$|(^id|Id)s?$/;

function maskContent<T>(value: T, login: boolean, key = ""): T {
  if (typeof value === "string") {
    if (!login || NOT_CONTENT_KEY.test(key)) {
      return maskForModel(value, "chat") as T;
    }
    if (key === "data" || key === "copyText") {
      return (value ? LOGIN_CODE_HIDDEN : value) as T;
    }
    return maskLoginCodes(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => maskContent(v, login, key)) as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, maskContent(v, login, k)])
    ) as T;
  }
  return value;
}

function maskedForMcp<T>(msg: Api.Message, value: T): T {
  return value !== undefined && isOverMcp()
    ? maskContent(value, isLoginServiceMessage(msg))
    : value;
}

/**
 * Hide login codes in a service message and keep the rest of the text (maskForModel at the level
 * `service`): gift links first, then the word after "code:" (`Login code: 52813`, `This is your
 * login code: aB3dE9fG`, `Код для входа в Telegram: 52813`) and any other run of letters and digits
 * with a digit in it, four characters or longer.
 */
export function maskLoginCodes(text: string): string {
  return maskForModel(text, "service");
}

const selfIds = new WeakMap<object, Promise<string | undefined>>();
function selfId(client: TelegramClient): Promise<string | undefined> {
  let id = selfIds.get(client);
  if (!id) {
    id = Promise.resolve()
      .then(() => client.getMe())
      .then(
        (me) => (me instanceof Api.User ? me.id.toString() : undefined),
        () => undefined
      );
    selfIds.set(client, id);
  }
  return id;
}

async function isFromSelf(
  client: TelegramClient,
  msg: Api.Message
): Promise<boolean> {
  if (msg.out) {
    return true;
  }
  const peer = msg.fromId ?? msg.peerId;
  if (!(peer instanceof Api.PeerUser)) {
    return false;
  }
  const me = await selfId(client);
  return me !== undefined && peer.userId.toString() === me;
}

/** The title of a private chat, a group or a channel; the chat with yourself is "Saved Messages". */
export const SAVED_MESSAGES = "Saved Messages";

async function resolveSender(
  client: TelegramClient,
  msg: Api.Message
): Promise<{ sender: string; senderId?: string }> {
  let entity: unknown = msg.sender ?? undefined;
  if (!entity) {
    const ref = msg.out
      ? undefined
      : (msg.fromId ??
        (msg.peerId instanceof Api.PeerChat ? undefined : msg.peerId));
    if (ref) {
      try {
        entity = await client.getEntity(ref);
      } catch {}
    }
  }
  if (entity instanceof Api.User) {
    return {
      sender: entity.firstName || entity.username || "Unknown",
      senderId: entity.id.toString(),
    };
  }
  if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
    return {
      sender: entity.title || "Unknown",
      senderId: entity.id.toString(),
    };
  }
  return { sender: msg.out ? "You" : "Unknown" };
}

/** Build a display-friendly button layout from a message's reply markup (over MCP, masked). */
export function extractButtons(msg: Api.Message): ButtonLayout | undefined {
  return maskedForMcp(msg, rawButtonLayout(msg));
}

function rawButtonLayout(msg: Api.Message): ButtonLayout | undefined {
  const markup = msg.replyMarkup;
  if (
    !(markup instanceof Api.ReplyInlineMarkup) &&
    !(markup instanceof Api.ReplyKeyboardMarkup)
  ) {
    return undefined;
  }

  const isInline = markup instanceof Api.ReplyInlineMarkup;
  const rows: ButtonInfo[][] = [];
  let flatIndex = 0;

  markup.rows.forEach((row, rowIdx) => {
    const parsedRow: ButtonInfo[] = [];
    row.buttons.forEach((btn, colIdx) => {
      flatIndex += 1;
      parsedRow.push(classifyButton(btn, flatIndex, rowIdx, colIdx));
    });
    rows.push(parsedRow);
  });

  return { isInline, rows };
}

function shownMediaInfo(msg: Api.Message): MediaInfo | undefined {
  return maskedForMcp(msg, extractMediaInfo(msg));
}

function extractMediaInfo(msg: Api.Message): MediaInfo | undefined {
  const { media } = msg;
  if (!media) {
    return undefined;
  }

  if (media instanceof Api.MessageMediaPhoto) {
    const info: MediaInfo = { kind: "photo" };
    if (media.spoiler) {
      info.hasSpoiler = true;
    }
    return info;
  }

  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document;
    if (!(doc instanceof Api.Document)) {
      return { kind: "document" };
    }

    let kind: MediaKind = "document";
    let fileName: string | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let duration: number | undefined;

    for (const attr of doc.attributes) {
      if (attr instanceof Api.DocumentAttributeFilename) {
        fileName = attr.fileName;
      } else if (attr instanceof Api.DocumentAttributeVideo) {
        kind = attr.roundMessage ? "video_note" : "video";
        width = attr.w;
        height = attr.h;
        duration = Math.round(attr.duration);
      } else if (attr instanceof Api.DocumentAttributeAudio) {
        kind = attr.voice ? "voice" : "audio";
        duration = attr.duration;
      } else if (attr instanceof Api.DocumentAttributeAnimated) {
        kind = "gif";
      } else if (attr instanceof Api.DocumentAttributeSticker) {
        kind = "sticker";
      }
    }

    let size: number | undefined;
    try {
      const sizeNum =
        typeof (doc.size as unknown as { toJSNumber?: () => number })
          .toJSNumber === "function"
          ? (doc.size as unknown as { toJSNumber: () => number }).toJSNumber()
          : Number(doc.size as unknown as number);
      if (Number.isFinite(sizeNum)) {
        size = sizeNum;
      }
    } catch {}

    return {
      kind,
      fileName,
      mimeType: doc.mimeType || undefined,
      size,
      width,
      height,
      duration,
      hasSpoiler: media.spoiler ? true : undefined,
    };
  }

  return undefined;
}

export { parseTimeOffset } from "./time.js";

/** Convert a raw message into the CLI's MessageInfo shape. Pass `full` to attach MessageFull. */
export async function toMessageInfo(
  client: TelegramClient,
  msg: Api.Message,
  opts: { full?: boolean } = {}
): Promise<MessageInfo> {
  const { sender, senderId } = await resolveSender(client, msg);
  const info: MessageInfo = {
    id: msg.id,
    date: new Date(msg.date * 1000),
    sender,
    senderId,
    text: messageText(msg),
    replyToMsgId: msg.replyTo?.replyToMsgId,
    isOutgoing: await isFromSelf(client, msg),
    media: shownMediaInfo(msg),
    buttons: extractButtons(msg),
    replies: msg.replies?.replies || undefined,
  };
  if (opts.full) {
    info.full = buildMessageFull(msg);
  }
  return info;
}

const peerIdStr = (peer: Api.TypePeer): string =>
  utils.getPeerId(peer).toString();
const iso = (ts?: number): string | undefined =>
  ts ? new Date(ts * 1000).toISOString() : undefined;

/** Every remaining useful field of a Message, for `--full` / data collection (no extra API calls). */
export function buildMessageFull(msg: Api.Message): MessageFull {
  const full: MessageFull = {
    out: msg.out || undefined,
    post: msg.post || undefined,
    silent: msg.silent || undefined,
    pinned: msg.pinned || undefined,
    noforwards: msg.noforwards || undefined,
    legacy: msg.legacy || undefined,
    fromScheduled: msg.fromScheduled || undefined,
    views: msg.views ?? undefined,
    forwards: msg.forwards ?? undefined,
    editDate: iso(msg.editDate ?? undefined),
    postAuthor: msg.postAuthor ?? undefined,
    groupedId: msg.groupedId ? msg.groupedId.toString() : undefined,
    viaBotId: msg.viaBotId ? msg.viaBotId.toString() : undefined,
    ttlPeriod: msg.ttlPeriod ?? undefined,
  };

  if (msg.reactions instanceof Api.MessageReactions) {
    full.reactions = msg.reactions.results.map((r) => {
      const b: ReactionBreakdown = { count: r.count };
      if (r.reaction instanceof Api.ReactionEmoji) {
        b.emoji = r.reaction.emoticon;
      } else if (r.reaction instanceof Api.ReactionCustomEmoji) {
        b.customEmojiId = r.reaction.documentId.toString();
      } else if (r.reaction instanceof Api.ReactionPaid) {
        b.paid = true;
      }
      if (r.chosenOrder !== undefined) {
        b.chosen = true;
        b.chosenOrder = r.chosenOrder;
      }
      return b;
    });
    if (msg.reactions.recentReactions?.length) {
      full.recentReactors = msg.reactions.recentReactions.map((x) =>
        peerIdStr(x.peerId)
      );
    }
  }

  if (msg.replies instanceof Api.MessageReplies) {
    const r = msg.replies;
    full.replies = {
      count: r.replies,
      comments: r.comments ?? false,
      channelId: r.channelId ? r.channelId.toString() : undefined,
      maxId: r.maxId ?? undefined,
      readMaxId: r.readMaxId ?? undefined,
      recentRepliers: r.recentRepliers?.length
        ? r.recentRepliers.map(peerIdStr)
        : undefined,
    };
  }

  if (msg.fwdFrom instanceof Api.MessageFwdHeader) {
    const f = msg.fwdFrom;
    full.fwdFrom = {
      fromId: f.fromId ? peerIdStr(f.fromId) : undefined,
      fromName: f.fromName ?? undefined,
      date: iso(f.date),
      channelPost: f.channelPost ?? undefined,
      postAuthor: f.postAuthor ?? undefined,
      savedFromPeer: f.savedFromPeer ? peerIdStr(f.savedFromPeer) : undefined,
      savedFromMsgId: f.savedFromMsgId ?? undefined,
    };
  }

  if (msg.replyTo instanceof Api.MessageReplyHeader) {
    const r = msg.replyTo;
    full.replyTo = {
      replyToMsgId: r.replyToMsgId ?? undefined,
      topMsgId: r.replyToTopId ?? undefined,
      forumTopic: r.forumTopic || undefined,
      quoteText:
        r.quoteText != null &&
        isOverMcp() &&
        isLoginServicePeer(r.replyToPeerId)
          ? maskLoginCodes(r.quoteText)
          : (r.quoteText ?? undefined),
      replyToPeerId: r.replyToPeerId ? peerIdStr(r.replyToPeerId) : undefined,
    };
  }

  const media = buildFullMedia(msg);
  if (media) {
    full.media = media;
  }
  return maskedForMcp(msg, full);
}

function docAttributes(doc: Api.Document): Partial<FullMediaInfo> {
  const out: Partial<FullMediaInfo> = {};
  for (const attr of doc.attributes) {
    if (attr instanceof Api.DocumentAttributeFilename) {
      out.fileName = attr.fileName;
    } else if (attr instanceof Api.DocumentAttributeVideo) {
      out.width = attr.w;
      out.height = attr.h;
      out.duration = Math.round(attr.duration);
    } else if (attr instanceof Api.DocumentAttributeAudio) {
      out.duration = attr.duration;
    } else if (attr instanceof Api.DocumentAttributeImageSize) {
      out.width = attr.w;
      out.height = attr.h;
    }
  }
  return out;
}

/** A plain, JSON-friendly description of any message media (poll, geo, contact, webpage, …). */
export function buildFullMedia(msg: Api.Message): FullMediaInfo | undefined {
  const { media } = msg;
  if (!media) {
    return undefined;
  }

  if (media instanceof Api.MessageMediaPhoto) {
    return { type: "photo", hasSpoiler: media.spoiler || undefined };
  }
  if (
    media instanceof Api.MessageMediaDocument &&
    media.document instanceof Api.Document
  ) {
    const base = extractMediaInfo(msg);
    return {
      type: base?.kind ?? "document",
      fileName: base?.fileName,
      mimeType: base?.mimeType,
      size: base?.size,
      width: base?.width,
      height: base?.height,
      duration: base?.duration,
      hasSpoiler: media.spoiler || undefined,
      ...docAttributes(media.document),
    };
  }
  if (media instanceof Api.MessageMediaPoll) {
    const { poll } = media;
    const { results } = media;
    const byOption = new Map(
      results.results?.map((r) => [r.option.toString("base64"), r])
    );
    return {
      type: "poll",
      poll: {
        question:
          typeof poll.question === "string"
            ? poll.question
            : poll.question.text,
        closed: poll.closed || undefined,
        quiz: poll.quiz || undefined,
        multiple: poll.multipleChoice || undefined,
        publicVoters: poll.publicVoters || undefined,
        totalVoters: results.totalVoters ?? undefined,
        options: poll.answers
          .filter((a): a is Api.PollAnswer => a instanceof Api.PollAnswer)
          .map((a) => {
            const r = byOption.get(a.option.toString("base64"));
            return {
              text: typeof a.text === "string" ? a.text : a.text.text,
              voters: r?.voters ?? undefined,
              chosen: r?.chosen || undefined,
              correct: r?.correct || undefined,
            };
          }),
      },
    };
  }
  if (
    media instanceof Api.MessageMediaGeo ||
    media instanceof Api.MessageMediaGeoLive
  ) {
    const { geo } = media;
    return geo instanceof Api.GeoPoint
      ? { type: "geo", lat: geo.lat, long: geo.long }
      : { type: "geo" };
  }
  if (media instanceof Api.MessageMediaVenue) {
    const { geo } = media;
    return {
      type: "venue",
      title: media.title,
      address: media.address,
      lat: geo instanceof Api.GeoPoint ? geo.lat : undefined,
      long: geo instanceof Api.GeoPoint ? geo.long : undefined,
    };
  }
  if (media instanceof Api.MessageMediaContact) {
    return {
      type: "contact",
      phone: media.phoneNumber,
      firstName: media.firstName,
      lastName: media.lastName || undefined,
      userId: media.userId ? media.userId.toString() : undefined,
    };
  }
  if (
    media instanceof Api.MessageMediaWebPage &&
    media.webpage instanceof Api.WebPage
  ) {
    const w = media.webpage;
    return {
      type: "webpage",
      url: w.url,
      title: w.title ?? undefined,
      siteName: w.siteName ?? undefined,
      description: w.description ?? undefined,
    };
  }
  if (media instanceof Api.MessageMediaDice) {
    return { type: "dice", emoticon: media.emoticon, value: media.value };
  }
  if (media instanceof Api.MessageMediaInvoice) {
    return {
      type: "invoice",
      title: media.title,
      currency: media.currency,
      amount: media.totalAmount ? media.totalAmount.toJSNumber() : undefined,
    };
  }
  return { type: (media as { className?: string }).className ?? "unknown" };
}

/**
 * - `offsetId`: Only messages older than this ID (exclusive).
 * - `minId`: Only messages newer than this ID (exclusive).
 * - `from`: Only messages sent by this user (@username, ID, or "me").
 * - `thread`: Read the replies thread of this message (channel post comments or a forum topic ID).
 * - `topic`: `thread` is a forum topic: refuse a chat that is not a forum instead of reading an empty thread.
 * - `full`: Attach MessageFull to each message (the `--full` flag).
 * - `probe`: Look for one message past `limit`, so `hasMore` is known, never guessed from a full page.
 */
export interface GetMessagesOptions {
  limit?: number;
  offsetId?: number;
  minId?: number;
  minDate?: Date;
  maxDate?: Date;
  from?: string;
  thread?: number;
  topic?: boolean;
  full?: boolean;
  probe?: boolean;
}

export async function getMessages(
  client: TelegramClient,
  chatIdentifier: string,
  options: GetMessagesOptions = {}
): Promise<{
  messages: MessageInfo[];
  chatTitle: string;
  chatId: string;
  threadChatId?: string;
  forum?: boolean;
  hasMore?: boolean;
}> {
  const { offsetId, minDate, maxDate, minId, from, thread, full } = options;
  const wanted = options.limit ?? 50;
  const limit = options.probe ? wanted + 1 : wanted;
  let threadChatId: string | undefined;

  const entity = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(entity);
  const chatId = utils.getPeerId(entity).toString();
  const forum = hasTopics(entity);
  if (options.topic && !forum) {
    throw notAForum(entity);
  }
  const fromUser = from ? await resolveChat(client, from) : undefined;

  const messages: MessageInfo[] = [];
  const BATCH_SIZE = 100;

  let currentOffsetId = offsetId;
  let firstBatch = true;

  while (messages.length < limit) {
    const batchLimit = Math.min(BATCH_SIZE, limit - messages.length + 50);
    const offsetDate =
      !currentOffsetId && firstBatch && maxDate
        ? Math.floor(maxDate.getTime() / 1000)
        : undefined;

    let batch: Api.TypeMessage[];
    if (thread) {
      const res = await client.invoke(
        new Api.messages.GetReplies({
          peer: entity,
          msgId: thread,
          offsetId: currentOffsetId ?? 0,
          offsetDate: offsetDate ?? 0,
          addOffset: 0,
          limit: batchLimit,
          maxId: 0,
          minId: minId ?? 0,
          hash: bigInt(0),
        })
      );
      batch = "messages" in res ? res.messages : [];
      const first = batch.find(
        (m): m is Api.Message => m instanceof Api.Message
      );
      if (first && !threadChatId) {
        const peerId = utils.getPeerId(first.peerId).toString();
        if (peerId !== utils.getPeerId(entity).toString()) {
          threadChatId = peerId;
        }
      }
    } else {
      const params: {
        limit: number;
        offsetId?: number;
        offsetDate?: number;
        minId?: number;
        fromUser?: ResolvedEntity;
      } = { limit: batchLimit };
      if (currentOffsetId) {
        params.offsetId = currentOffsetId;
      } else if (offsetDate) {
        params.offsetDate = offsetDate;
      }
      if (minId) {
        params.minId = minId;
      }
      if (fromUser) {
        params.fromUser = fromUser;
      }
      batch = await client.getMessages(entity, params);
    }
    firstBatch = false;
    if (batch.length === 0) {
      break;
    }

    let reachedMinDate = false;

    for (const msg of batch) {
      if (!(msg instanceof Api.Message)) {
        continue;
      }
      if (
        thread &&
        fromUser &&
        !(
          msg.fromId instanceof Api.PeerUser &&
          msg.fromId.userId.equals(fromUser.id)
        )
      ) {
        continue;
      }

      const msgDate = new Date(msg.date * 1000);
      if (maxDate && msgDate > maxDate) {
        continue;
      }
      if (minDate && msgDate < minDate) {
        reachedMinDate = true;
        break;
      }
      if (messages.length >= limit) {
        break;
      }

      const info = await toMessageInfo(client, msg, { full });
      if (forum && !thread) {
        info.topicId = msg.replyTo?.forumTopic
          ? (msg.replyTo.replyToTopId ?? msg.replyTo.replyToMsgId ?? 1)
          : 1;
      }
      messages.push(info);
    }

    if (reachedMinDate) {
      break;
    }
    if (messages.length >= limit) {
      break;
    }

    let oldestMessageInBatch: Api.Message | null = null;
    for (let i = batch.length - 1; i >= 0; i--) {
      const candidate = batch[i];
      if (candidate instanceof Api.Message) {
        oldestMessageInBatch = candidate;
        break;
      }
    }
    if (!oldestMessageInBatch) {
      break;
    }
    if (currentOffsetId === oldestMessageInBatch.id) {
      break;
    }
    currentOffsetId = oldestMessageInBatch.id;

    if (batch.length < batchLimit) {
      break;
    }
  }

  const hasMore = messages.length > wanted;
  if (hasMore) {
    messages.length = wanted;
  }
  return {
    messages,
    chatTitle,
    chatId,
    threadChatId,
    ...(forum ? { forum } : {}),
    ...(options.probe ? { hasMore } : {}),
  };
}

/** Fetch specific messages by ID (missing/deleted IDs are skipped). */
export async function getMessagesByIds(
  client: TelegramClient,
  chatIdentifier: string,
  ids: number[],
  options: { full?: boolean } = {}
): Promise<{
  messages: MessageInfo[];
  chatTitle: string;
  chatId: string;
  missing: number[];
}> {
  const entity = await resolveChat(client, chatIdentifier);
  const raw = await client.getMessages(entity, { ids });
  const messages: MessageInfo[] = [];
  const found = new Set<number>();
  for (const msg of raw) {
    if (msg instanceof Api.Message) {
      messages.push(await toMessageInfo(client, msg, { full: options.full }));
      found.add(msg.id);
    }
  }
  return {
    messages,
    chatTitle: getChatTitle(entity),
    chatId: utils.getPeerId(entity).toString(),
    missing: ids.filter((id) => !found.has(id)),
  };
}

export async function downloadMessageMedia(
  client: TelegramClient,
  chatIdentifier: string,
  messageId: number,
  outputDir: string,
  checkPath?: (filePath: string) => void
): Promise<{ filePath: string; media: MediaInfo } | null> {
  const entity = await resolveChat(client, chatIdentifier);

  const msgs = await client.getMessages(entity, { ids: [messageId] });
  const msg = msgs[0];

  if (!(msg instanceof Api.Message) || !msg.media) {
    return null;
  }

  const mediaInfo = extractMediaInfo(msg);
  if (!mediaInfo) {
    return null;
  }

  const fileName = buildMediaFilename(mediaInfo, msg.id);
  const filePath = join(outputDir, fileName);
  checkPath?.(filePath);
  assertDownloadTarget(filePath);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const result = await client.downloadMedia(msg, { outputFile: filePath });
  const savedPath = typeof result === "string" ? result : filePath;

  return { filePath: savedPath, media: mediaInfo };
}

/**
 * A download target must be a regular file or nothing. teleproto is always handed this full file
 * path, but where a directory sits at it, teleproto picks a file of its own inside that directory
 * (`getProperFilename`), and a write follows a symbolic link wherever it points. Either way the
 * bytes would land somewhere nobody checked, so both are refused before anything is written.
 */
export function assertDownloadTarget(filePath: string): void {
  let st;
  try {
    st = lstatSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
  if (st.isSymbolicLink()) {
    throw new Error(
      `Refusing to download through a symbolic link: ${filePath}`
    );
  }
  if (!st.isFile()) {
    throw new Error(
      `Refusing to download: ${filePath} exists and is not a regular file`
    );
  }
}

export function buildMediaFilename(
  media: MediaInfo,
  messageId: number
): string {
  if (media.fileName) {
    return `${messageId}_${sanitizeFilename(media.fileName)}`;
  }

  const ext = guessExtension(media);
  return `${messageId}_${media.kind}${ext}`;
}

function sanitizeFilename(name: string): string {
  return name.replaceAll(/[/\\?%*:|"<>\u0000-\u001F]/g, "_");
}

function guessExtension(media: MediaInfo): string {
  if (media.mimeType) {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
      "video/webm": ".webm",
      "audio/mpeg": ".mp3",
      "audio/ogg": ".ogg",
      "audio/mp4": ".m4a",
      "application/pdf": ".pdf",
      "application/zip": ".zip",
    };
    if (map[media.mimeType]) {
      return map[media.mimeType];
    }
    const match = media.mimeType.match(/\/([a-zA-Z0-9.+-]+)$/);
    if (match) {
      return `.${match[1].replace(/\+.*$/, "")}`;
    }
  }
  if (media.kind === "photo") {
    return ".jpg";
  }
  if (media.kind === "voice") {
    return ".ogg";
  }
  if (
    media.kind === "video" ||
    media.kind === "video_note" ||
    media.kind === "gif"
  ) {
    return ".mp4";
  }
  if (media.kind === "audio") {
    return ".mp3";
  }
  if (media.kind === "sticker") {
    return ".webp";
  }
  return ".bin";
}

/**
 * The parse mode a send or edit passes to teleproto. Its client parses Markdown when a call leaves
 * parseMode undefined (`__init__` would go out as italic "init"), so plain text says `false`.
 */
export const parseModeOf = (mode?: "html" | "md"): "html" | "md" | false =>
  mode ?? false;

export async function sendFileMessage(
  client: TelegramClient,
  chatIdentifier: string,
  filePath: string,
  options: {
    caption?: string;
    asDocument?: boolean;
    replyToMsgId?: number;
    parseMode?: "html" | "md";
    silent?: boolean;
    topic?: number;
  } = {}
): Promise<Api.Message> {
  const entity = await resolveChat(client, chatIdentifier);

  const replyTo = options.topic
    ? new Api.InputReplyToMessage({
        replyToMsgId: options.replyToMsgId ?? options.topic,
        topMsgId: options.topic,
      })
    : options.replyToMsgId;

  const result = await client.sendFile(entity, {
    file: uploadable(fileSnapshot(filePath)),
    caption: options.caption,
    forceDocument: options.asDocument,
    replyTo,
    parseMode: parseModeOf(options.parseMode),
    silent: options.silent,
  });

  return result;
}

const SEARCH_FILTERS: Record<string, () => Api.TypeMessagesFilter> = {
  photo: () => new Api.InputMessagesFilterPhotos(),
  video: () => new Api.InputMessagesFilterVideo(),
  media: () => new Api.InputMessagesFilterPhotoVideo(),
  document: () => new Api.InputMessagesFilterDocument(),
  url: () => new Api.InputMessagesFilterUrl(),
  voice: () => new Api.InputMessagesFilterVoice(),
  audio: () => new Api.InputMessagesFilterMusic(),
  gif: () => new Api.InputMessagesFilterGif(),
  round: () => new Api.InputMessagesFilterRoundVideo(),
  location: () => new Api.InputMessagesFilterGeo(),
  contact: () => new Api.InputMessagesFilterContacts(),
  pinned: () => new Api.InputMessagesFilterPinned(),
  mentions: () => new Api.InputMessagesFilterMyMentions(),
};

export const SEARCH_TYPES = Object.keys(SEARCH_FILTERS);

/**
 * - `from`: Sender filter (@username, ID or "me"); requires `chat`.
 * - `type`: One of SEARCH_TYPES.
 * - `full`: Attach MessageFull to each result (the `--full` flag).
 */
export interface SearchOptions {
  chat?: string;
  limit?: number;
  minDate?: Date;
  maxDate?: Date;
  from?: string;
  type?: string;
  full?: boolean;
}

function peerTitle(
  peer: Api.TypePeer,
  chats: Api.TypeChat[],
  users: Api.TypeUser[]
): string | undefined {
  if (peer instanceof Api.PeerUser) {
    const u = users.find(
      (x): x is Api.User => x instanceof Api.User && x.id.equals(peer.userId)
    );
    if (u?.self) {
      return SAVED_MESSAGES;
    }
    return u
      ? [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.username ||
          undefined
      : undefined;
  }
  const id =
    peer instanceof Api.PeerChat
      ? peer.chatId
      : peer instanceof Api.PeerChannel
        ? peer.channelId
        : undefined;
  const c = id ? chats.find((x) => "id" in x && x.id.equals(id)) : undefined;
  return c && "title" in c ? c.title : undefined;
}

/**
 * One search, one object, as `read` gives: the chat's ID and title with --chat; without it every
 * message carries its own chatId and chatTitle.
 */
export interface SearchResult {
  query: string;
  chatTitle?: string;
  chatId?: string;
  messages: MessageInfo[];
  hasMore?: boolean;
}

export async function searchMessages(
  client: TelegramClient,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const { chat, limit = 50, minDate, maxDate, from, type, full } = options;
  if (type && !SEARCH_FILTERS[type]) {
    throw usageError(
      `Unknown --type "${type}". Use one of: ${SEARCH_TYPES.join(", ")}`
    );
  }
  if (from && !chat) {
    throw usageError(
      "--from needs --chat (Telegram global search cannot filter by sender)"
    );
  }
  const filter = type
    ? SEARCH_FILTERS[type]()
    : new Api.InputMessagesFilterEmpty();
  const minTs = minDate ? Math.floor(minDate.getTime() / 1000) : 0;
  const maxTs = maxDate ? Math.floor(maxDate.getTime() / 1000) : 0;

  if (chat) {
    const entity = await resolveChat(client, chat);
    const fromId = from ? await resolveChat(client, from) : undefined;

    const res = await client.invoke(
      new Api.messages.Search({
        peer: entity,
        q: query,
        fromId,
        filter,
        minDate: minTs,
        maxDate: maxTs,
        offsetId: 0,
        addOffset: 0,
        limit: limit + 1,
        maxId: 0,
        minId: 0,
        hash: bigInt(0),
      })
    );

    const messages: MessageInfo[] = [];
    const chatId = utils.getPeerId(entity).toString();
    if ("messages" in res) {
      for (const msg of res.messages.slice(0, limit)) {
        if (msg instanceof Api.Message) {
          messages.push({
            ...(await toMessageInfo(client, msg, { full })),
            chatId,
          });
        }
      }
    }
    return {
      query,
      chatTitle: getChatTitle(entity),
      chatId,
      messages,
      ...(searchHasMore(res, limit) ? { hasMore: true } : {}),
    };
  }

  const res = await client.invoke(
    new Api.messages.SearchGlobal({
      q: query,
      filter,
      minDate: minTs,
      maxDate: maxTs,
      offsetRate: 0,
      offsetPeer: new Api.InputPeerEmpty(),
      offsetId: 0,
      limit: limit + 1,
    })
  );

  const messages: MessageInfo[] = [];
  if ("messages" in res) {
    for (const msg of res.messages.slice(0, limit)) {
      if (!(msg instanceof Api.Message)) {
        continue;
      }
      const info = await toMessageInfo(client, msg, { full });
      info.chatId = utils.getPeerId(msg.peerId).toString();
      info.chatTitle = peerTitle(msg.peerId, res.chats, res.users);
      messages.push(info);
    }
  }
  return {
    query,
    messages,
    ...(searchHasMore(res, limit) ? { hasMore: true } : {}),
  };
}

function searchHasMore(res: object, limit: number): boolean {
  const r = res as { messages?: unknown[]; count?: unknown; inexact?: unknown };
  const got = r.messages?.length ?? 0;
  if (got > limit) {
    return true;
  }
  return typeof r.count === "number" && !r.inexact && r.count > got;
}

export async function sendMessage(
  client: TelegramClient,
  chatIdentifier: string | ResolvedEntity,
  text: string,
  replyToMsgId?: number,
  options: {
    parseMode?: "html" | "md";
    schedule?: number;
    silent?: boolean;
    topic?: number;
  } = {}
): Promise<Api.Message> {
  const entity =
    typeof chatIdentifier === "string"
      ? await resolveChat(client, chatIdentifier)
      : chatIdentifier;

  const replyTo = options.topic
    ? new Api.InputReplyToMessage({
        replyToMsgId: replyToMsgId ?? options.topic,
        topMsgId: options.topic,
      })
    : replyToMsgId;

  const result = await client.sendMessage(entity, {
    message: text,
    replyTo,
    parseMode: parseModeOf(options.parseMode),
    schedule: options.schedule,
    silent: options.silent,
  });

  return result;
}

export async function getContactInfo(
  client: TelegramClient,
  identifier: string
): Promise<{
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  bio?: string;
  isBot: boolean;
  isMutualContact: boolean;
}> {
  const entity = await client.getEntity(identifier);

  if (!(entity instanceof Api.User)) {
    throw new Error("Not a user");
  }

  let bio: string | undefined;
  try {
    const fullUser = await client.invoke(
      new Api.users.GetFullUser({ id: entity })
    );
    bio = fullUser.fullUser.about ?? undefined;
  } catch {}

  return {
    id: entity.id.toString(),
    firstName: entity.firstName ?? undefined,
    lastName: entity.lastName ?? undefined,
    username: entity.username ?? undefined,
    phone: entity.phone ?? undefined,
    bio,
    isBot: entity.bot ?? false,
    isMutualContact: entity.mutualContact ?? false,
  };
}

export async function getChatMembers(
  client: TelegramClient,
  chatIdentifier: string,
  options: { adminsOnly?: boolean; limit?: number; query?: string } = {}
): Promise<
  { id: string; name: string; username?: string; isAdmin: boolean }[]
> {
  const { adminsOnly = false, limit = 200, query } = options;
  const all = await getChatMembersUnfiltered(client, chatIdentifier, {
    adminsOnly,
    limit,
    query,
  });
  if (!query) {
    return all;
  }
  const q = query.toLowerCase();
  return all.filter(
    (m) =>
      m.name.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q)
  );
}

async function getChatMembersUnfiltered(
  client: TelegramClient,
  chatIdentifier: string,
  options: { adminsOnly: boolean; limit: number; query?: string }
): Promise<
  { id: string; name: string; username?: string; isAdmin: boolean }[]
> {
  const { adminsOnly, limit, query } = options;
  const entity = await resolveChat(client, chatIdentifier);

  if (entity instanceof Api.Channel) {
    const filter = adminsOnly
      ? new Api.ChannelParticipantsAdmins()
      : query
        ? new Api.ChannelParticipantsSearch({ q: query })
        : new Api.ChannelParticipantsRecent();

    const result = await client.invoke(
      new Api.channels.GetParticipants({
        channel: entity,
        filter,
        offset: 0,
        limit,
        hash: bigInt(0),
      })
    );

    if (!(result instanceof Api.channels.ChannelParticipants)) {
      return [];
    }

    const members: {
      id: string;
      name: string;
      username?: string;
      isAdmin: boolean;
    }[] = [];

    for (const participant of result.participants) {
      const userId = "userId" in participant ? participant.userId : null;
      if (!userId) {
        continue;
      }

      const user = result.users.find(
        (u): u is Api.User => u instanceof Api.User && u.id.equals(userId)
      );

      if (user) {
        const isAdmin =
          participant instanceof Api.ChannelParticipantAdmin ||
          participant instanceof Api.ChannelParticipantCreator;

        members.push({
          id: user.id.toString(),
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username ||
            "Unknown",
          username: user.username ?? undefined,
          isAdmin,
        });
      }
    }

    return members;
  } else if (entity instanceof Api.Chat) {
    const fullChat = await client.invoke(
      new Api.messages.GetFullChat({ chatId: entity.id })
    );

    if (
      !("fullChat" in fullChat) ||
      !(fullChat.fullChat instanceof Api.ChatFull)
    ) {
      return [];
    }

    const members: {
      id: string;
      name: string;
      username?: string;
      isAdmin: boolean;
    }[] = [];

    if (fullChat.fullChat.participants instanceof Api.ChatParticipants) {
      for (const participant of fullChat.fullChat.participants.participants) {
        const { userId } = participant;
        const user = fullChat.users.find(
          (u): u is Api.User => u instanceof Api.User && u.id.equals(userId)
        );

        if (user) {
          const isAdmin =
            participant instanceof Api.ChatParticipantAdmin ||
            participant instanceof Api.ChatParticipantCreator;

          if (!adminsOnly || isAdmin) {
            members.push({
              id: user.id.toString(),
              name:
                [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                user.username ||
                "Unknown",
              username: user.username ?? undefined,
              isAdmin,
            });
          }
        }
      }
    }

    return members;
  }

  throw new Error("Not a group chat");
}

export async function getAdminGroups(
  client: TelegramClient
): Promise<ChatInfo[]> {
  const dialogs = await getDialogsCached(client);
  const adminGroups: ChatInfo[] = [];

  for (const dialog of dialogs) {
    if (dialog.isGroup || dialog.isChannel) {
      const { entity } = dialog;

      if (entity instanceof Api.Channel) {
        if (entity.adminRights || entity.creator) {
          adminGroups.push({
            id: dialog.id?.toString() || "",
            title: dialog.title || "Unknown",
            type: entity.megagroup ? "supergroup" : "channel",
            username: entity.username ?? undefined,
            unreadCount: dialog.unreadCount,
          });
        }
      } else if (entity instanceof Api.Chat) {
        try {
          const fullChat = await client.invoke(
            new Api.messages.GetFullChat({ chatId: entity.id })
          );

          const me = (await client.getMe()) as Api.User;

          if (
            "fullChat" in fullChat &&
            fullChat.fullChat instanceof Api.ChatFull &&
            fullChat.fullChat.participants instanceof Api.ChatParticipants
          ) {
            const myParticipant =
              fullChat.fullChat.participants.participants.find((p) =>
                p.userId.equals(me.id)
              );

            if (
              myParticipant instanceof Api.ChatParticipantAdmin ||
              myParticipant instanceof Api.ChatParticipantCreator
            ) {
              adminGroups.push({
                id: dialog.id?.toString() || "",
                title: dialog.title || "Unknown",
                type: "group",
                unreadCount: dialog.unreadCount,
              });
            }
          }
        } catch {}
      }
    }
  }

  return adminGroups;
}

export type ResolvedEntity = Api.User | Api.Chat | Api.Channel;

/**
 * Whether a chat has forum topics: a forum supergroup, or the private chat with a bot that shows
 * its chats as topics (botForumView); the topic methods take either peer.
 */
export function hasTopics(entity: ResolvedEntity): boolean {
  if (entity instanceof Api.Channel) {
    return !!entity.forum;
  }
  return entity instanceof Api.User && !!entity.bot && !!entity.botForumView;
}

export async function resolveChat(
  client: TelegramClient,
  identifier: string
): Promise<ResolvedEntity> {
  const pinned = pinnedPeers.get(identifier);
  if (pinned) {
    return pinned;
  }
  const key = `${isStrictChatResolution() ? "strict:" : ""}${cacheKey(identifier)}`;
  const cached = resolvedChatCache.get(key);
  if (cached) {
    return cached;
  }

  const entity = await resolveChatUncached(client, identifier);
  resolvedChatCache.set(key, entity);
  return entity;
}

const SELF_ALIASES = new Set([
  "me",
  "self",
  "saved",
  "saved messages",
  "избранное",
]);

async function resolveChatUncached(
  client: TelegramClient,
  identifier: string
): Promise<ResolvedEntity> {
  const asGiven = identifier;
  if (SELF_ALIASES.has(identifier.trim().toLowerCase())) {
    return await client.getMe();
  }

  const link = parseChatLink(identifier);
  if (link?.invite) {
    throw usageError(
      `${identifier} is an invite link; it does not name a chat you can read or write`,
      "Join it first (telegram join <link>), then use the chat ID from telegram chats."
    );
  }
  if (link?.id) {
    identifier = link.id;
  }

  const username = link?.username
    ? `@${link.username}`
    : identifier.startsWith("@")
      ? identifier
      : undefined;
  const isNumericId = /^-?\d+$/.test(identifier);
  const disk = await fromDialogCache(
    client,
    asGiven,
    identifier,
    username,
    isNumericId
  );
  if ("entity" in disk) {
    logDialogCache(
      `hit "${asGiven}" -> ${utils.getPeerId(disk.entity).toString()} (list from ${disk.listedAt})`
    );
    return disk.entity;
  }
  if ("error" in disk) {
    logDialogCache(
      `hit "${asGiven}" -> ${disk.error.code} (list from ${disk.listedAt})`
    );
    throw disk.error;
  }
  const reads = !username && !dialogsCache;
  logDialogCache(
    `${reads ? "refresh" : "miss"} "${asGiven}": ${disk.miss}${reads ? "; reading the dialog list from Telegram" : ""}`
  );
  if (username) {
    const entity = await client.getEntity(username);
    if (
      entity instanceof Api.User ||
      entity instanceof Api.Chat ||
      entity instanceof Api.Channel
    ) {
      return entity;
    }
    throw new Error(`Invalid entity type for: ${identifier}`);
  }

  const { dialogs, complete } = isNumericId
    ? { dialogs: await getDialogsCached(client), complete: true }
    : await dialogsForTitles(client);

  let dialog;
  if (isNumericId) {
    dialog = dialogs.find((d) => d.id?.toString() === identifier);
  } else {
    const needle = identifier.trim().toLowerCase();
    const exact = dialogs.filter(
      (d) => d.title?.trim().toLowerCase() === needle
    );
    if (exact.length > 1) {
      throw ambiguousChat(asGiven, exact.map(named), "exact");
    }
    dialog = exact[0];
    if (!dialog) {
      const partial = dialogs.filter((d) =>
        d.title?.toLowerCase().includes(needle)
      );
      if (isStrictChatResolution() && partial.length) {
        throw new CliError(
          `No chat is titled exactly "${identifier}"; writes need an ID, @username or the exact title`,
          "chat_not_exact",
          EXIT.USAGE,
          {
            candidates: chatCandidates(partial.map(named)),
            hint: "Run the command again with one of these IDs.",
            text: `No chat is titled exactly "${identifier}". Writes need an ID, @username or the exact title. Did you mean:\n${describeCandidates(partial.map(named))}`,
          }
        );
      }
      if (partial.length > 1) {
        throw ambiguousChat(asGiven, partial.map(named), "partial");
      }
      dialog = partial[0];
    }
    if (dialog && !complete) {
      const matched = exact.length ? exact : [dialog];
      throw new CliError(
        `"${identifier}" matches a chat among the first ${dialogs.length} dialogs, but the list goes on, so another chat may have the same title; use an ID or @username`,
        "ambiguous_or_unverified",
        EXIT.USAGE,
        {
          candidates: chatCandidates(matched.map(named)),
          hint: "Run the command again with this ID, or with the chat's @username.",
          text: `"${identifier}" matches a chat among the first ${dialogs.length} dialogs, but the list goes on, so another chat may have the same title. Use an ID or @username:\n${describeCandidates(matched.map(named))}`,
        }
      );
    }
  }

  if (dialog && dialog.entity) {
    const { entity } = dialog;
    if (
      entity instanceof Api.User ||
      entity instanceof Api.Chat ||
      entity instanceof Api.Channel
    ) {
      return entity;
    }
  }

  try {
    const entity = await client.getEntity(
      isNumericId ? bigInt(identifier) : identifier
    );
    if (
      entity instanceof Api.User ||
      entity instanceof Api.Chat ||
      entity instanceof Api.Channel
    ) {
      return entity;
    }
    throw new Error(`Invalid entity type for: ${identifier}`);
  } catch {
    throw chatNotFound(asGiven, dialogs.map(named));
  }
}

type Dialogs = Awaited<ReturnType<TelegramClient["getDialogs"]>>;

function dialogKind(d: Dialogs[number]): string {
  if (d.isUser) {
    return (d.entity as Api.User | undefined)?.bot ? "bot" : "user";
  }
  return d.isChannel
    ? (d.entity as Api.Channel)?.megagroup
      ? "supergroup"
      : "channel"
    : "group";
}

/**
 * The command that lists chats matching a name (`--preview 0`: titles, no message text), with
 * `--json` when the caller's command had it, so an agent gets JSON back from it too.
 */
export function chatsQueryCommand(name: string): string[] {
  return [
    "chats",
    "-q",
    name,
    "--preview",
    "0",
    ...(getInvocation()?.includes("--json") ? ["--json"] : []),
  ];
}

interface NamedChat {
  id: string;
  title: string;
  type: string;
}

function named(d: Dialogs[number]): NamedChat {
  return { id: String(d.id), title: d.title ?? "", type: dialogKind(d) };
}

function rerunWith(asGiven: string, id: string): string[] | undefined {
  const invocation = getInvocation();
  if (!invocation || !asGiven) {
    return undefined;
  }
  const at = invocation.flatMap((a, i) =>
    a === asGiven ||
    (a.startsWith("--") &&
      a.endsWith(`=${asGiven}`) &&
      a.indexOf("=") === a.length - asGiven.length - 1)
      ? [i]
      : []
  );
  if (at.length !== 1) {
    return undefined;
  }
  const command = [...invocation];
  const arg = command[at[0]];
  command[at[0]] =
    arg === asGiven ? id : `${arg.slice(0, arg.indexOf("="))}=${id}`;
  return command;
}

function chatCandidates(
  chats: NamedChat[],
  asGiven?: string,
  max = 5
): ChatCandidate[] {
  return chats.slice(0, max).map((c) => {
    const command =
      asGiven === undefined || isStrictChatResolution()
        ? undefined
        : rerunWith(asGiven, c.id);
    return {
      id: c.id,
      title: c.title,
      type: c.type,
      ...(command ? { command } : {}),
    };
  });
}

interface FromDisk {
  listedAt: string;
}

function diskNote(from?: FromDisk): string {
  if (!from) {
    return "";
  }
  return ` This list is from ${from.listedAt} (up to ${DIALOG_CACHE_TTL_MS / 60_000} minutes old); for a chat that is new or renamed since, run the command with TG_NO_CACHE=1 to read the list from Telegram again.`;
}

function ambiguousChat(
  asGiven: string,
  chats: NamedChat[],
  match: "exact" | "partial",
  from?: FromDisk
): CliError {
  const summary =
    match === "exact"
      ? `"${asGiven}" matches ${chats.length} chats; use an ID`
      : `"${asGiven}" is part of ${chats.length} chat titles; use an ID or the exact title`;
  const candidates = chatCandidates(chats, asGiven);
  const hint = `Run the command again with one of these IDs${candidates.some((c) => c.command) ? " (each candidate has its command)" : ""}.${diskNote(from)}`;
  return new CliError(summary, "ambiguous_chat", EXIT.USAGE, {
    candidates,
    hint,
    ...(from ? { listedAt: from.listedAt } : {}),
    text: `${summary}:\n${describeCandidates(chats)}${from ? `\n${diskNote(from).trim()}` : ""}`,
  });
}

/**
 * What a t.me link (or tg://resolve) names: a public @username, a private channel by its ID
 * (t.me/c/<id>/…), or an invite. Anything that is not a link is undefined.
 */
export function parseChatLink(
  text: string
): { username?: string; id?: string; invite?: boolean } | undefined {
  const value = text.trim();
  const tg = /^tg:\/\/resolve\?(?:.*&)?domain=([A-Za-z0-9_]{4,})/i.exec(value);
  if (tg) {
    return { username: tg[1] };
  }
  const m =
    /^(?:https?:\/\/)?(?:www\.)?(?:t|telegram)\.(?:me|dog)\/(.+)$/i.exec(value);
  if (!m) {
    return undefined;
  }
  const path = m[1].split(/[?#]/)[0].replace(/\/+$/, "");
  if (/^(\+|joinchat\/)/i.test(path)) {
    return { invite: true };
  }
  const priv = /^c\/(\d+)(?:\/\d+)*$/i.exec(path);
  if (priv) {
    return { id: `-100${priv[1]}` };
  }
  const user = /^(?:s\/)?([A-Za-z][A-Za-z0-9_]{3,})(?:\/\d+)*$/.exec(path);
  return user ? { username: user[1] } : undefined;
}

function describeCandidates(chats: NamedChat[]): string {
  return formatCandidates(chatCandidates(chats), chats.length);
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = cur;
    }
  }
  return row[b.length];
}

function chatNotFound(
  identifier: string,
  chats: NamedChat[],
  from?: FromDisk
): CliError {
  const needle = identifier.trim().replace(/^@/, "").toLowerCase();
  const limit = Math.max(1, Math.floor(needle.length / 3));
  const scored = chats
    .map((d) => {
      const title = d.title.toLowerCase();
      const words = [title, ...title.split(/\s+/)].filter(Boolean);
      return {
        d,
        score: Math.min(...words.map((w) => editDistance(needle, w))),
      };
    })
    .filter((x) => needle && x.score <= limit)
    .sort((a, b) => a.score - b.score);
  const candidates = chatCandidates(
    scored.map((x) => x.d),
    identifier
  );
  const command = chatsQueryCommand(identifier);
  const hint = `${diskNote(from).trim()}${from ? " " : ""}List matching chats: ${shellCommand(command)}`;
  return new CliError(
    `Chat not found: ${identifier}`,
    "chat_not_found",
    EXIT.ERROR,
    {
      candidates,
      hint,
      command,
      ...(from ? { listedAt: from.listedAt } : {}),
      text: [
        `Chat not found: ${identifier}`,
        candidates.length
          ? `Closest titles:\n${formatCandidates(candidates)}`
          : "",
        hint,
      ]
        .filter(Boolean)
        .join("\n"),
    }
  );
}

/**
 * The chat an identifier resolves to (cached after the command's own call): its ID and title.
 * `topic`: the caller reads a forum topic, so a chat without topics is refused as getMessages does.
 */
export async function chatRef(
  client: TelegramClient,
  identifier: string,
  options: { topic?: boolean } = {}
): Promise<{ chatId: string; chatTitle: string }> {
  const entity = await resolveChat(client, identifier);
  if (options.topic && !hasTopics(entity)) {
    throw notAForum(entity);
  }
  return {
    chatId: utils.getPeerId(entity).toString(),
    chatTitle: getChatTitle(entity),
  };
}

function notAForum(entity: ResolvedEntity): CliError {
  return new CliError(
    `${getChatTitle(entity)} (${utils.getPeerId(entity)}) is not a forum, so it has no topics`,
    "not_a_forum",
    EXIT.USAGE,
    {
      hint: "Read it without --topic; for the comments of one message use --thread <id>.",
    }
  );
}

function getChatTitle(entity: ResolvedEntity): string {
  if (entity instanceof Api.User) {
    if (entity.self) {
      return SAVED_MESSAGES;
    }
    return entity.firstName || entity.username || "Unknown";
  }
  if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
    return entity.title;
  }
  return "Unknown";
}

const MAX_INT32 = 2_147_483_647;

export function parseDuration(duration: string): {
  seconds: number;
  isForever: boolean;
} {
  if (duration === "forever") {
    return { seconds: 0, isForever: true };
  }

  const match = duration.match(/^(\d+)(m|h|d|w)$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: ${duration}. Use formats like 1h, 8h, 1d, 1w, or "forever"`
    );
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  let seconds: number;
  switch (unit) {
    case "m": {
      seconds = value * 60;
      break;
    }
    case "h": {
      seconds = value * 3600;
      break;
    }
    case "d": {
      seconds = value * 86_400;
      break;
    }
    case "w": {
      seconds = value * 604_800;
      break;
    }
    default: {
      throw new Error(`Unknown duration unit: ${unit}`);
    }
  }

  if (
    !Number.isSafeInteger(seconds) ||
    Math.floor(Date.now() / 1000) + seconds > MAX_INT32
  ) {
    throw new Error(
      `Duration ${duration} is too long; use "forever" for no end`
    );
  }
  return { seconds, isForever: false };
}

export function parseDurationToSeconds(duration: string): number {
  if (duration === "forever") {
    return MAX_INT32;
  }
  return parseDuration(duration).seconds;
}

export async function muteChat(
  client: TelegramClient,
  chatIdentifier: string,
  duration = "forever"
): Promise<{ success: boolean; message: string }> {
  const chat = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(chat);

  let inputPeer: Api.TypeInputNotifyPeer;
  if (chat instanceof Api.User) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerUser({
        userId: chat.id,
        accessHash: chat.accessHash || bigInt(0),
      }),
    });
  } else if (chat instanceof Api.Chat) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerChat({ chatId: chat.id }),
    });
  } else if (chat instanceof Api.Channel) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerChannel({
        channelId: chat.id,
        accessHash: chat.accessHash || bigInt(0),
      }),
    });
  } else {
    return { success: false, message: "Unknown chat type" };
  }

  try {
    const parsed = parseDuration(duration);
    const muteUntil = parsed.isForever
      ? MAX_INT32
      : Math.floor(Date.now() / 1000) + parsed.seconds;

    await client.invoke(
      new Api.account.UpdateNotifySettings({
        peer: inputPeer as unknown as Api.TypeEntityLike,
        settings: new Api.InputPeerNotifySettings({
          muteUntil,
        }),
      })
    );

    const durationText = duration === "forever" ? "forever" : `for ${duration}`;
    return { success: true, message: `Muted "${chatTitle}" ${durationText}` };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg };
  }
}

export async function unmuteChat(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ success: boolean; message: string }> {
  const chat = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(chat);

  let inputPeer: Api.TypeInputNotifyPeer;
  if (chat instanceof Api.User) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerUser({
        userId: chat.id,
        accessHash: chat.accessHash || bigInt(0),
      }),
    });
  } else if (chat instanceof Api.Chat) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerChat({ chatId: chat.id }),
    });
  } else if (chat instanceof Api.Channel) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerChannel({
        channelId: chat.id,
        accessHash: chat.accessHash || bigInt(0),
      }),
    });
  } else {
    return { success: false, message: "Unknown chat type" };
  }

  try {
    await client.invoke(
      new Api.account.UpdateNotifySettings({
        peer: inputPeer as unknown as Api.TypeEntityLike,
        settings: new Api.InputPeerNotifySettings({
          muteUntil: 0,
        }),
      })
    );

    return { success: true, message: `Unmuted "${chatTitle}"` };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg };
  }
}

export interface FolderInfo {
  id: number;
  title: string;
  includedChats: { id: string; title: string; type: string }[];
  excludedChats: { id: string; title: string; type: string }[];
  emoticon?: string;
}

export async function getFolders(
  client: TelegramClient
): Promise<FolderInfo[]> {
  const result = await client.invoke(new Api.messages.GetDialogFilters());

  const folders: FolderInfo[] = [];

  for (const filter of result.filters) {
    if (filter instanceof Api.DialogFilter) {
      const includedChats: { id: string; title: string; type: string }[] = [];
      const excludedChats: { id: string; title: string; type: string }[] = [];

      for (const peer of filter.includePeers) {
        try {
          const entity = await client.getEntity(peer);
          if (
            entity instanceof Api.User ||
            entity instanceof Api.Chat ||
            entity instanceof Api.Channel
          ) {
            includedChats.push({
              id: entity.id.toString(),
              title: getChatTitleFromEntity(entity),
              type: getEntityType(entity),
            });
          }
        } catch {}
      }

      for (const peer of filter.excludePeers) {
        try {
          const entity = await client.getEntity(peer);
          if (
            entity instanceof Api.User ||
            entity instanceof Api.Chat ||
            entity instanceof Api.Channel
          ) {
            excludedChats.push({
              id: entity.id.toString(),
              title: getChatTitleFromEntity(entity),
              type: getEntityType(entity),
            });
          }
        } catch {}
      }

      const titleStr =
        typeof filter.title === "string"
          ? filter.title
          : (filter.title?.text ?? "Untitled");

      folders.push({
        id: filter.id,
        title: titleStr,
        includedChats,
        excludedChats,
        emoticon: filter.emoticon ?? undefined,
      });
    }
  }

  return folders;
}

export async function getFolder(
  client: TelegramClient,
  folderName: string
): Promise<FolderInfo | null> {
  const folders = await getFolders(client);
  return (
    folders.find((f) => f.title.toLowerCase() === folderName.toLowerCase()) ||
    null
  );
}

export async function addChatToFolder(
  client: TelegramClient,
  folderName: string,
  chatIdentifier: string
): Promise<{ success: boolean; message: string }> {
  const result = await client.invoke(new Api.messages.GetDialogFilters());

  let targetFilter: Api.DialogFilter | null = null;
  for (const filter of result.filters) {
    if (filter instanceof Api.DialogFilter) {
      const filterTitle =
        typeof filter.title === "string"
          ? filter.title
          : (filter.title?.text ?? "");
      if (filterTitle.toLowerCase() === folderName.toLowerCase()) {
        targetFilter = filter;
        break;
      }
    }
  }

  if (!targetFilter) {
    return { success: false, message: `Folder not found: ${folderName}` };
  }

  const chat = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(chat);
  const folderTitle =
    typeof targetFilter.title === "string"
      ? targetFilter.title
      : (targetFilter.title?.text ?? "Untitled");

  let inputPeer: Api.TypeInputPeer;
  if (chat instanceof Api.User) {
    inputPeer = new Api.InputPeerUser({
      userId: chat.id,
      accessHash: chat.accessHash || bigInt(0),
    });
  } else if (chat instanceof Api.Chat) {
    inputPeer = new Api.InputPeerChat({ chatId: chat.id });
  } else if (chat instanceof Api.Channel) {
    inputPeer = new Api.InputPeerChannel({
      channelId: chat.id,
      accessHash: chat.accessHash || bigInt(0),
    });
  } else {
    return { success: false, message: "Unknown chat type" };
  }

  for (const peer of targetFilter.includePeers) {
    try {
      const entity = await client.getEntity(peer);
      if (entity.id.equals(chat.id)) {
        return {
          success: false,
          message: `"${chatTitle}" is already in folder "${folderTitle}"`,
        };
      }
    } catch {}
  }

  const newIncludePeers = [...targetFilter.includePeers, inputPeer];

  try {
    await client.invoke(
      new Api.messages.UpdateDialogFilter({
        id: targetFilter.id,
        filter: new Api.DialogFilter({
          id: targetFilter.id,
          title: targetFilter.title,
          pinnedPeers: targetFilter.pinnedPeers,
          includePeers: newIncludePeers,
          excludePeers: targetFilter.excludePeers,
          contacts: targetFilter.contacts,
          nonContacts: targetFilter.nonContacts,
          groups: targetFilter.groups,
          broadcasts: targetFilter.broadcasts,
          bots: targetFilter.bots,
          excludeMuted: targetFilter.excludeMuted,
          excludeRead: targetFilter.excludeRead,
          excludeArchived: targetFilter.excludeArchived,
          emoticon: targetFilter.emoticon,
        }),
      })
    );

    return {
      success: true,
      message: `Added "${chatTitle}" to folder "${folderTitle}"`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg };
  }
}

export async function removeChatFromFolder(
  client: TelegramClient,
  folderName: string,
  chatIdentifier: string
): Promise<{ success: boolean; message: string }> {
  const result = await client.invoke(new Api.messages.GetDialogFilters());

  let targetFilter: Api.DialogFilter | null = null;
  for (const filter of result.filters) {
    if (filter instanceof Api.DialogFilter) {
      const filterTitle =
        typeof filter.title === "string"
          ? filter.title
          : (filter.title?.text ?? "");
      if (filterTitle.toLowerCase() === folderName.toLowerCase()) {
        targetFilter = filter;
        break;
      }
    }
  }

  if (!targetFilter) {
    return { success: false, message: `Folder not found: ${folderName}` };
  }

  const chat = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(chat);
  const folderTitle =
    typeof targetFilter.title === "string"
      ? targetFilter.title
      : (targetFilter.title?.text ?? "Untitled");

  let found = false;
  const newIncludePeers: Api.TypeInputPeer[] = [];

  for (const peer of targetFilter.includePeers) {
    try {
      const entity = await client.getEntity(peer);
      if (entity.id.equals(chat.id)) {
        found = true;
        continue;
      }
    } catch {}
    newIncludePeers.push(peer);
  }

  if (!found) {
    return {
      success: false,
      message: `"${chatTitle}" is not in folder "${folderTitle}"`,
    };
  }

  try {
    await client.invoke(
      new Api.messages.UpdateDialogFilter({
        id: targetFilter.id,
        filter: new Api.DialogFilter({
          id: targetFilter.id,
          title: targetFilter.title,
          pinnedPeers: targetFilter.pinnedPeers,
          includePeers: newIncludePeers,
          excludePeers: targetFilter.excludePeers,
          contacts: targetFilter.contacts,
          nonContacts: targetFilter.nonContacts,
          groups: targetFilter.groups,
          broadcasts: targetFilter.broadcasts,
          bots: targetFilter.bots,
          excludeMuted: targetFilter.excludeMuted,
          excludeRead: targetFilter.excludeRead,
          excludeArchived: targetFilter.excludeArchived,
          emoticon: targetFilter.emoticon,
        }),
      })
    );

    return {
      success: true,
      message: `Removed "${chatTitle}" from folder "${folderTitle}"`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg };
  }
}

function getChatTitleFromEntity(
  entity:
    | Api.User
    | Api.Chat
    | Api.Channel
    | Api.ChatForbidden
    | Api.ChannelForbidden
): string {
  if (entity instanceof Api.User) {
    if (entity.self) {
      return SAVED_MESSAGES;
    }
    return entity.firstName || entity.username || "Unknown User";
  }
  if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
    return entity.title;
  }
  if (
    entity instanceof Api.ChatForbidden ||
    entity instanceof Api.ChannelForbidden
  ) {
    return entity.title;
  }
  return "Unknown";
}

function getEntityType(
  entity:
    | Api.User
    | Api.Chat
    | Api.Channel
    | Api.ChatForbidden
    | Api.ChannelForbidden
): string {
  if (entity instanceof Api.User) {
    return "user";
  }
  if (entity instanceof Api.Chat) {
    return "group";
  }
  if (entity instanceof Api.Channel) {
    return entity.megagroup ? "supergroup" : "channel";
  }
  return "unknown";
}

export async function kickUser(
  client: TelegramClient,
  chatIdentifier: string,
  userIdentifier: string
): Promise<{ success: boolean; message: string }> {
  const chat = await resolveChat(client, chatIdentifier);

  let user: Api.User;
  try {
    user = await resolveUser(client, userIdentifier);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message:
        msg === "Target is not a user"
          ? msg
          : `User not found: ${userIdentifier}`,
    };
  }

  if (chat instanceof Api.Channel) {
    try {
      await client.invoke(
        new Api.channels.EditBanned({
          channel: chat,
          participant: user,
          bannedRights: new Api.ChatBannedRights({
            untilDate: 0,
            viewMessages: true,
            sendMessages: true,
            sendMedia: true,
            sendStickers: true,
            sendGifs: true,
            sendGames: true,
            sendInline: true,
            embedLinks: true,
          }),
        })
      );
      return {
        success: true,
        message: `Kicked ${user.username || user.firstName} from ${chat.title}`,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("ADMIN") || msg.includes("RIGHT")) {
        return { success: false, message: "Not admin or insufficient rights" };
      }
      if (msg.includes("USER_NOT_PARTICIPANT")) {
        return { success: false, message: "User is not a member" };
      }
      return { success: false, message: msg };
    }
  } else if (chat instanceof Api.Chat) {
    try {
      await client.invoke(
        new Api.messages.DeleteChatUser({
          chatId: chat.id,
          userId: user,
          revokeHistory: false,
        })
      );
      return {
        success: true,
        message: `Kicked ${user.username || user.firstName} from ${chat.title}`,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("ADMIN") || msg.includes("RIGHT")) {
        return { success: false, message: "Not admin or insufficient rights" };
      }
      if (msg.includes("USER_NOT_PARTICIPANT")) {
        return { success: false, message: "User is not a member" };
      }
      return { success: false, message: msg };
    }
  }

  return { success: false, message: "Not a group chat" };
}

export async function reactToMessage(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  emoji: string | undefined,
  options: { big?: boolean; remove?: boolean } = {}
): Promise<{ chatTitle: string; emoji?: string; removed: boolean }> {
  const entity = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(entity);
  const peer = await client.getInputEntity(entity);

  const removed = options.remove === true || !emoji;
  const reaction = removed ? [] : [new Api.ReactionEmoji({ emoticon: emoji! })];

  await client.invoke(
    new Api.messages.SendReaction({
      peer,
      msgId,
      reaction,
      big: options.big || undefined,
      addToRecent: true,
    })
  );

  return { chatTitle, emoji: removed ? undefined : emoji, removed };
}

export async function forwardMessages(
  client: TelegramClient,
  fromChat: string,
  msgIds: number[],
  toChat: string,
  options: { silent?: boolean; dropAuthor?: boolean } = {}
): Promise<{
  count: number;
  fromTitle: string;
  toTitle: string;
  forwardedIds: number[];
}> {
  const from = await resolveChat(client, fromChat);
  const to = await resolveChat(client, toChat);

  if (isOverMcp()) {
    const sources = await client.getMessages(from, { ids: msgIds });
    for (const [i, id] of msgIds.entries()) {
      const m = sources[i];
      if (!(m instanceof Api.Message) || m.id !== id) {
        throw new Error(
          `Refused over MCP: message ${id} was not found or cannot be checked before forwarding. Forward it in a terminal.`
        );
      }
      if (isSharedLocationOrContact(m.media) || hasRichLocation(m)) {
        throw new Error(
          `Refused over MCP: message ${id} holds a contact card or a location; forwarding it would share them. Forward it in a terminal.`
        );
      }
      if (isLoginServiceMessage(m)) {
        throw new Error(
          `Refused over MCP: message ${id} is from a login-code service account (777000 or 489000) and may hold a login code.`
        );
      }
    }
  }

  const sent = await client.forwardMessages(to, {
    messages: msgIds,
    fromPeer: from,
    silent: options.silent,
    dropAuthor: options.dropAuthor,
  });

  return {
    count: msgIds.length,
    fromTitle: getChatTitle(from),
    toTitle: getChatTitle(to),
    forwardedIds: (sent ?? [])
      .filter((m): m is Api.Message => m instanceof Api.Message)
      .map((m) => m.id),
  };
}

function isSharedLocationOrContact(
  media: Api.TypeMessageMedia | undefined
): boolean {
  return (
    media instanceof Api.MessageMediaContact ||
    media instanceof Api.MessageMediaGeo ||
    media instanceof Api.MessageMediaGeoLive ||
    media instanceof Api.MessageMediaVenue
  );
}

function hasRichLocation(msg: Api.Message): boolean {
  const rich = (msg as { richMessage?: unknown }).richMessage;
  if (rich == null) {
    return false;
  }
  return /"(?:className|_)":"[^"]*(geo|venue|pageBlockMap)/i.test(
    JSON.stringify(rich, (_k, v) => plainJsonValue(v))
  );
}

export async function pinChatMessage(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  options: { notify?: boolean; pmOneSide?: boolean } = {}
): Promise<{ chatTitle: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  await client.pinMessage(entity, msgId, {
    notify: options.notify,
    pmOneSide: options.pmOneSide,
  });
  return { chatTitle: getChatTitle(entity) };
}

export async function unpinChatMessage(
  client: TelegramClient,
  chatIdentifier: string,
  msgId?: number
): Promise<{ chatTitle: string; all: boolean }> {
  const entity = await resolveChat(client, chatIdentifier);
  if (msgId == null) {
    await client.unpinMessage(entity);
  } else {
    await client.unpinMessage(entity, msgId);
  }
  return { chatTitle: getChatTitle(entity), all: msgId == null };
}

async function fetchRawMessage(
  client: TelegramClient,
  entity: ResolvedEntity,
  msgId: number
): Promise<Api.Message | null> {
  const msgs = await client.getMessages(entity, { ids: [msgId] });
  const msg = msgs[0];
  return msg instanceof Api.Message ? msg : null;
}

export interface MessageButtonsResult {
  chatTitle: string;
  messageId: number;
  text: string;
  layout?: ButtonLayout;
}

export async function getMessageButtons(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number
): Promise<MessageButtonsResult> {
  const entity = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(entity);
  const msg = await fetchRawMessage(client, entity, msgId);
  if (!msg) {
    throw new Error(`Message #${msgId} not found in "${chatTitle}"`);
  }
  return {
    chatTitle,
    messageId: msgId,
    text: messageText(msg),
    layout: extractButtons(msg),
  };
}

export interface ClickSelector {
  index?: number;
  text?: string;
  dataBase64?: string;
}

/**
 * - `edited`: The clicked message after the bot edited it (if it changed).
 * - `newMessages`: New messages the bot sent in response, newer than the clicked one.
 */
export interface ClickOutcome {
  button: ButtonInfo;
  action:
    | "callback"
    | "game"
    | "sent_text"
    | "url"
    | "copy"
    | "info"
    | "refused";
  answerText?: string;
  isAlert?: boolean;
  url?: string;
  query?: string;
  copyText?: string;
  sentMessageId?: number;
  note?: string;
  edited?: { id: number; text: string; layout?: ButtonLayout };
  newMessages?: {
    id: number;
    sender: string;
    text: string;
    layout?: ButtonLayout;
  }[];
}

function findRawButton(
  markup: Api.ReplyInlineMarkup | Api.ReplyKeyboardMarkup,
  layout: ButtonLayout,
  rawLayout: ButtonLayout,
  selector: ClickSelector
): { raw: RawButton; info: ButtonInfo; rawInfo: ButtonInfo } | null {
  const flatRaw: RawButton[] = [];
  for (const row of markup.rows) {
    for (const b of row.buttons) {
      flatRaw.push(b);
    }
  }
  const flatInfo = layout.rows.flat();
  const flatRawInfo = rawLayout.rows.flat();

  let pos = -1;
  if (selector.index != null) {
    pos = selector.index - 1;
  } else if (selector.dataBase64 != null) {
    pos = flatInfo.findIndex(
      (b) => b.type === "callback" && b.data === selector.dataBase64
    );
  } else if (selector.text != null) {
    const needle = selector.text.trim().toLowerCase();
    pos = flatInfo.findIndex((b) => b.text.trim().toLowerCase() === needle);
    if (pos < 0) {
      pos = flatInfo.findIndex((b) =>
        b.text.trim().toLowerCase().includes(needle)
      );
    }
  }

  if (pos < 0 || pos >= flatRaw.length) {
    return null;
  }
  return { raw: flatRaw[pos], info: flatInfo[pos], rawInfo: flatRawInfo[pos] };
}

function buttonSignature(layout?: ButtonLayout): string {
  if (!layout) {
    return "";
  }
  return layout.rows
    .flat()
    .map((b) => `${b.type}:${b.text}:${b.data ?? b.url ?? ""}`)
    .join("|");
}

/** What pressing a button does, as the person approved it: kind, label and what it sends. */
export function buttonFingerprint(info: ButtonInfo): string {
  const { index, type, text, data, url, query, copyText, requiresPassword } =
    info;
  return JSON.stringify({
    index,
    type,
    text,
    data: data ?? null,
    url: url ?? null,
    query: query ?? null,
    copyText: copyText ?? null,
    requiresPassword: !!requiresPassword,
  });
}

let approvedButton: string | undefined;

export function expectButton(fingerprint: string | undefined): void {
  approvedButton = fingerprint;
}

/** Finds the button a click would press, without pressing it (the guard shows it for approval). */
export async function findButton(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  selector: ClickSelector
): Promise<FoundButton> {
  const entity = await resolveChat(client, chatIdentifier);
  const msg = await fetchRawMessage(client, entity, msgId);
  if (!msg) {
    throw new Error(`Message #${msgId} not found`);
  }

  const markup = msg.replyMarkup;
  if (
    !(markup instanceof Api.ReplyInlineMarkup) &&
    !(markup instanceof Api.ReplyKeyboardMarkup)
  ) {
    throw new Error(`Message #${msgId} has no buttons`);
  }
  const rawLayout = rawButtonLayout(msg)!;
  const layout = maskedForMcp(msg, rawLayout);
  const match = findRawButton(markup, layout, rawLayout, selector);
  if (!match) {
    const label =
      selector.index == null
        ? selector.dataBase64 == null
          ? `"${selector.text}"`
          : `data ${selector.dataBase64}`
        : `#${selector.index}`;
    const available = layout.rows
      .flat()
      .map((b) => `[${b.index}] ${b.text || "(no label)"}`)
      .join(", ");
    throw new CliError(
      `Button ${label} not found on message #${msgId}`,
      "button_not_found",
      EXIT.ERROR,
      {
        hint: `Available: ${available}. Press by label: the indexes follow the current menu, which changes after each press.`,
      }
    );
  }
  return {
    entity,
    msg,
    layout,
    ...match,
    fingerprint: buttonFingerprint(match.rawInfo),
  };
}

/**
 * A button a click would press: `info` is what the model is shown (masked over MCP), `rawInfo` the
 * button as the message carries it (for the person approving), `fingerprint` binds `rawInfo`.
 */
export interface FoundButton {
  entity: ResolvedEntity;
  msg: Api.Message;
  layout: ButtonLayout;
  raw: RawButton;
  info: ButtonInfo;
  rawInfo: ButtonInfo;
  fingerprint: string;
}

/**
 * Press a button on a bot message and report what happened.
 *
 * Callback buttons are clicked with the button's raw callback bytes (never a
 * string round-trip) and the message is re-read afterwards so the caller sees
 * how the bot edited it — the whole point of "navigating" a bot's keyboard.
 */
export async function clickButton(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  selector: ClickSelector,
  options: { password?: string; waitMs?: number } = {}
): Promise<ClickOutcome> {
  const found = await findButton(client, chatIdentifier, msgId, selector);
  return maskedForMcp(
    found.msg,
    await pressButton(client, msgId, found, options)
  );
}

async function pressButton(
  client: TelegramClient,
  msgId: number,
  found: FoundButton,
  options: { password?: string; waitMs?: number }
): Promise<ClickOutcome> {
  const { waitMs = 1500 } = options;
  const { entity, msg, layout, raw, info, fingerprint } = found;
  if (approvedButton !== undefined && fingerprint !== approvedButton) {
    throw new Error(
      `The buttons of message #${msgId} changed after the approval; nothing was pressed. Run the command again to approve the button as it is now.`
    );
  }
  const beforeText = messageText(msg);
  const beforeSig = buttonSignature(layout);

  const kind: Api.TypeButtonType | Api.TypeInlineButtonType = raw.type;
  if (
    kind instanceof Api.InlineButtonTypeUrl ||
    kind instanceof Api.InlineButtonTypeUrlAuth ||
    kind instanceof Api.InputInlineButtonTypeUrlAuth
  ) {
    return {
      button: info,
      action: "url",
      url: kind.url,
      note: "URL button — opening links is left to you (not opened automatically).",
    };
  }
  if (
    kind instanceof Api.InlineButtonTypeWebView ||
    kind instanceof Api.ButtonTypeSimpleWebView
  ) {
    return {
      button: info,
      action: "url",
      url: kind.url,
      note: "Web-app button — open this URL in a browser to interact.",
    };
  }
  if (kind instanceof Api.InlineButtonTypeCopy) {
    return {
      button: info,
      action: "copy",
      copyText: kind.copyText,
      note: "Copy button — no server call; this is the text it copies.",
    };
  }
  if (kind instanceof Api.InlineButtonTypeSwitchInline) {
    return {
      button: info,
      action: "info",
      query: kind.query,
      note: `Switch-inline button — composes an inline query "${kind.query}" (not auto-sent).`,
    };
  }
  if (
    kind instanceof Api.ButtonTypeRequestPhone ||
    kind instanceof Api.ButtonTypeRequestGeoLocation ||
    kind instanceof Api.ButtonTypeRequestPoll ||
    kind instanceof Api.ButtonTypeRequestPeer ||
    kind instanceof Api.InputButtonTypeRequestPeer
  ) {
    return {
      button: info,
      action: "refused",
      note: "This button shares your phone / location / poll / a peer. Refused automatically — do this manually in a Telegram client if you intend to.",
    };
  }
  if (kind instanceof Api.InlineButtonTypeBuy) {
    return {
      button: info,
      action: "refused",
      note: "Payment button — opens a checkout flow that cannot be automated safely.",
    };
  }
  if (
    kind instanceof Api.InlineButtonTypeUserProfile ||
    kind instanceof Api.InputInlineButtonTypeUserProfile
  ) {
    return {
      button: info,
      action: "info",
      note: `Opens a user profile (user id ${kind.userId.toString()}).`,
    };
  }
  if (kind instanceof Api.InlineButtonTypeDisabled) {
    return {
      button: info,
      action: "refused",
      note: "This button is disabled by the bot.",
    };
  }

  if (kind instanceof Api.ButtonTypeDefault) {
    const sent = await sendMessage(client, entity, raw.text);
    const outcome: ClickOutcome = {
      button: info,
      action: "sent_text",
      sentMessageId: sent.id,
      note: `Reply-keyboard button — sent "${raw.text}" as a message.`,
    };
    await collectBotResponse(
      client,
      entity,
      msgId,
      beforeText,
      beforeSig,
      waitMs,
      outcome
    );
    return outcome;
  }

  const isGame = kind instanceof Api.InlineButtonTypeGame;
  const callback =
    kind instanceof Api.InlineButtonTypeCallback ? kind : undefined;
  if (!isGame && !callback) {
    return {
      button: info,
      action: "refused",
      note: `Unsupported button type ${kind.className} — nothing was sent.`,
    };
  }
  if (callback?.requiresPassword && !options.password) {
    throw new Error(
      "This button requires your 2FA password. Re-run with --password <pw>."
    );
  }

  const peer = await client.getInputEntity(entity);
  const answer = await client.invoke(
    new Api.messages.GetBotCallbackAnswer({
      peer,
      msgId,
      game: isGame,
      data: callback ? Buffer.from(callback.data) : undefined,
    })
  );

  const outcome: ClickOutcome = {
    button: info,
    action: isGame ? "game" : "callback",
    answerText: answer.message || undefined,
    isAlert: answer.message ? answer.alert : undefined,
    url: answer.url || undefined,
  };

  await collectBotResponse(
    client,
    entity,
    msgId,
    beforeText,
    beforeSig,
    waitMs,
    outcome
  );
  return outcome;
}

async function collectBotResponse(
  client: TelegramClient,
  entity: ResolvedEntity,
  msgId: number,
  beforeText: string,
  beforeSig: string,
  waitMs: number,
  outcome: ClickOutcome
): Promise<void> {
  if (waitMs > 0) {
    await new Promise((r) => setTimeout(r, waitMs));
  }

  try {
    const after = await fetchRawMessage(client, entity, msgId);
    if (after) {
      const afterLayout = extractButtons(after);
      const changed =
        messageText(after) !== beforeText ||
        buttonSignature(afterLayout) !== beforeSig;
      if (changed) {
        outcome.edited = {
          id: msgId,
          text: messageText(after),
          layout: afterLayout,
        };
      }
    }
  } catch {}

  try {
    const newer = await client.getMessages(entity, { minId: msgId, limit: 5 });
    const collected: NonNullable<ClickOutcome["newMessages"]> = [];
    for (const m of newer) {
      if (!(m instanceof Api.Message)) {
        continue;
      }
      if (m.id <= msgId || m.out) {
        continue;
      }
      collected.push({
        id: m.id,
        sender: getChatTitle(entity),
        text: messageText(m),
        layout: extractButtons(m),
      });
    }
    if (collected.length) {
      collected.sort((a, b) => a.id - b.id);
      outcome.newMessages = collected;
    }
  } catch {}
}

export async function editMessageText(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  text: string,
  options: { parseMode?: "html" | "md" } = {}
): Promise<{ chatTitle: string; id: number }> {
  const entity = await resolveChat(client, chatIdentifier);
  const result = await client.editMessage(entity, {
    message: msgId,
    text,
    parseMode: parseModeOf(options.parseMode),
  });
  return { chatTitle: getChatTitle(entity), id: result?.id ?? msgId };
}

export async function deleteChatMessages(
  client: TelegramClient,
  chatIdentifier: string,
  msgIds: number[],
  revoke: boolean
): Promise<{ chatTitle: string; count: number; forEveryone: boolean }> {
  const entity = await resolveChat(client, chatIdentifier);
  await assertMessagesInChat(client, entity, msgIds);
  await client.deleteMessages(entity, msgIds, { revoke });
  return {
    chatTitle: getChatTitle(entity),
    count: msgIds.length,
    forEveryone: revoke || deletesForEveryone(entity),
  };
}

/** The message IDs of `delete` (`123` or `123,124`), as the command parses them. */
export function parseIdList(text: string): number[] {
  return text
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n));
}

/** Where Telegram deletes for everyone whatever `--just-me` says: channels and supergroups. */
export function deletesForEveryone(entity: ResolvedEntity): boolean {
  return entity instanceof Api.Channel;
}

/**
 * Every message to delete exists and belongs to this chat. In private chats and basic groups
 * Telegram deletes by message ID alone (messages.DeleteMessages carries no chat), so an ID from
 * another chat would delete there, under a "yes" to this one. Refuses the whole operation.
 */
export async function assertMessagesInChat(
  client: TelegramClient,
  entity: ResolvedEntity,
  msgIds: number[]
): Promise<void> {
  const want = utils.getPeerId(entity).toString();
  const found = await client.getMessages(entity, { ids: msgIds });
  const bad = msgIds.filter((id, i) => {
    const m = found[i] as unknown;
    return (
      !(m instanceof Api.Message || m instanceof Api.MessageService) ||
      m.id !== id ||
      !m.peerId ||
      utils.getPeerId(m.peerId).toString() !== want
    );
  });
  if (bad.length) {
    throw new Error(
      `Message${bad.length > 1 ? "s" : ""} ${bad.map((id) => `#${id}`).join(", ")} not found in ${getChatTitle(entity)} (id ${want}); nothing was deleted. Check the IDs with \`telegram read\`.`
    );
  }
}

export async function markChatRead(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ chatTitle: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  await client.markAsRead(entity);
  return { chatTitle: getChatTitle(entity) };
}

export async function getPinnedMessages(
  client: TelegramClient,
  chatIdentifier: string,
  limit = 20
): Promise<{ chatTitle: string; messages: MessageInfo[] }> {
  const entity = await resolveChat(client, chatIdentifier);
  const result = await client.getMessages(entity, {
    limit,
    filter: new Api.InputMessagesFilterPinned(),
  });
  const messages: MessageInfo[] = [];
  for (const msg of result) {
    if (msg instanceof Api.Message) {
      messages.push({
        id: msg.id,
        date: new Date(msg.date * 1000),
        sender: (await resolveSender(client, msg)).sender,
        text: messageText(msg),
        isOutgoing: await isFromSelf(client, msg),
        media: shownMediaInfo(msg),
        buttons: extractButtons(msg),
      });
    }
  }
  return { chatTitle: getChatTitle(entity), messages };
}

export async function sendPoll(
  client: TelegramClient,
  chatIdentifier: string,
  question: string,
  answers: string[],
  options: {
    multiple?: boolean;
    quiz?: boolean;
    correct?: number;
    anonymous?: boolean;
  } = {}
): Promise<{ chatTitle: string; id: number }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);

  const pollAnswers = answers.map(
    (a) =>
      new Api.InputPollAnswer({
        text: new Api.TextWithEntities({ text: a, entities: [] }),
      })
  );

  const poll = new Api.Poll({
    id: bigInt(0),
    question: new Api.TextWithEntities({ text: question, entities: [] }),
    answers: pollAnswers,
    publicVoters: options.anonymous === false,
    multipleChoice: options.multiple || undefined,
    quiz: options.quiz || undefined,
    hash: bigInt(0),
  });

  const media = new Api.InputMediaPoll({
    poll,
    correctAnswers:
      options.quiz && options.correct != null ? [options.correct] : undefined,
  });

  const result = await client.invoke(
    new Api.messages.SendMedia({
      peer,
      media,
      message: "",
      randomId: generateRandomLong(),
    })
  );

  let id = 0;
  if (result instanceof Api.Updates) {
    for (const u of result.updates) {
      if (u instanceof Api.UpdateMessageID) {
        id = u.id;
      }
    }
  }
  return { chatTitle: getChatTitle(entity), id };
}

export async function votePoll(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  optionIndexes: number[]
): Promise<{ chatTitle: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);

  const msg = await fetchRawMessage(client, entity, msgId);
  if (!msg || !(msg.media instanceof Api.MessageMediaPoll)) {
    throw new Error(`Message #${msgId} is not a poll`);
  }
  const pollAnswers = msg.media.poll.answers;
  const chosen: Buffer[] = [];
  for (const idx of optionIndexes) {
    const ans = pollAnswers[idx];
    if (!ans || !(ans instanceof Api.PollAnswer)) {
      throw new Error(`Poll has no option #${idx + 1}`);
    }
    chosen.push(Buffer.from(ans.option));
  }

  await client.invoke(
    new Api.messages.SendVote({ peer, msgId, options: chosen })
  );
  return { chatTitle: getChatTitle(entity) };
}

export async function getReactionsList(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  limit = 50
): Promise<{
  chatTitle: string;
  reactions: { user: string; emoji: string }[];
}> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);
  const result = await client.invoke(
    new Api.messages.GetMessageReactionsList({ peer, id: msgId, limit })
  );

  const reactions: { user: string; emoji: string }[] = [];
  for (const r of result.reactions) {
    let emoji = "?";
    if (r.reaction instanceof Api.ReactionEmoji) {
      emoji = r.reaction.emoticon;
    } else if (r.reaction instanceof Api.ReactionCustomEmoji) {
      emoji = `[custom:${r.reaction.documentId.toString()}]`;
    }
    let user = "Unknown";
    if (r.peerId instanceof Api.PeerUser) {
      const u = result.users.find(
        (x): x is Api.User =>
          x instanceof Api.User &&
          x.id.equals((r.peerId as Api.PeerUser).userId)
      );
      if (u) {
        user = u.firstName || u.username || u.id.toString();
      }
    }
    reactions.push({ user, emoji });
  }
  return { chatTitle: getChatTitle(entity), reactions };
}

export async function setBlocked(
  client: TelegramClient,
  userIdentifier: string,
  blocked: boolean
): Promise<{ name: string }> {
  const entity = await resolveChat(client, userIdentifier);
  const peer = await client.getInputEntity(entity);
  if (blocked) {
    await client.invoke(new Api.contacts.Block({ id: peer }));
  } else {
    await client.invoke(new Api.contacts.Unblock({ id: peer }));
  }
  return { name: getChatTitle(entity) };
}

export async function addContact(
  client: TelegramClient,
  userIdentifier: string,
  firstName: string,
  lastName = ""
): Promise<{ name: string }> {
  const entity = await resolveChat(client, userIdentifier);
  if (!(entity instanceof Api.User)) {
    throw new Error("Not a user");
  }
  await client.invoke(
    new Api.contacts.AddContact({
      id: entity,
      firstName,
      lastName,
      phone: entity.phone || "",
      addPhonePrivacyException: false,
    })
  );
  return { name: [firstName, lastName].filter(Boolean).join(" ") };
}

export async function deleteContact(
  client: TelegramClient,
  userIdentifier: string
): Promise<{ name: string }> {
  const entity = await resolveChat(client, userIdentifier);
  if (!(entity instanceof Api.User)) {
    throw new Error("Not a user");
  }
  await client.invoke(new Api.contacts.DeleteContacts({ id: [entity] }));
  return { name: getChatTitle(entity) };
}

export async function joinChat(
  client: TelegramClient,
  target: string
): Promise<{ title: string }> {
  const inviteMatch = target.match(INVITE_LINK);
  if (inviteMatch) {
    const res = await client.invoke(
      new Api.messages.ImportChatInvite({ hash: inviteMatch[1] })
    );
    let title = "chat";
    if (
      res instanceof Api.messages.ChatInviteJoinResultOk &&
      res.updates instanceof Api.Updates
    ) {
      const chat = res.updates.chats[0];
      if (chat instanceof Api.Channel || chat instanceof Api.Chat) {
        title = chat.title;
      }
    }
    return { title };
  }
  const entity = await resolveChat(client, target);
  if (!(entity instanceof Api.Channel)) {
    throw new Error("Can only join channels/supergroups by username");
  }
  await client.invoke(new Api.channels.JoinChannel({ channel: entity }));
  return { title: getChatTitle(entity) };
}

export async function leaveChat(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const title = getChatTitle(entity);
  if (entity instanceof Api.Channel) {
    await client.invoke(new Api.channels.LeaveChannel({ channel: entity }));
  } else if (entity instanceof Api.Chat) {
    const me = await getMe(client);
    await client.invoke(
      new Api.messages.DeleteChatUser({
        chatId: entity.id,
        userId: me,
        revokeHistory: false,
      })
    );
  } else {
    throw new Error("Not a group or channel");
  }
  return { title };
}

export async function exportInviteLink(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ title: string; link: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);
  const res = await client.invoke(new Api.messages.ExportChatInvite({ peer }));
  const link = res instanceof Api.ChatInviteExported ? res.link : "";
  return { title: getChatTitle(entity), link };
}

export async function setArchived(
  client: TelegramClient,
  chatIdentifier: string,
  archived: boolean
): Promise<{ title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);
  await client.invoke(
    new Api.folders.EditPeerFolders({
      folderPeers: [
        new Api.InputFolderPeer({ peer, folderId: archived ? 1 : 0 }),
      ],
    })
  );
  return { title: getChatTitle(entity) };
}

export async function createGroup(
  client: TelegramClient,
  title: string,
  userIdentifiers: string[]
): Promise<{ title: string; id: string }> {
  const users: Api.TypeInputUser[] = [];
  for (const u of userIdentifiers) {
    const entity = await resolveChat(client, u);
    if (!(entity instanceof Api.User)) {
      throw new Error(`${u} is not a user; a group's members are users`);
    }
    users.push(
      new Api.InputUser({
        userId: entity.id,
        accessHash: entity.accessHash || bigInt(0),
      })
    );
  }
  const res = await client.invoke(
    new Api.messages.CreateChat({ users, title })
  );
  let id = "";
  const updates = (res as { updates?: Api.Updates }).updates ?? res;
  if (updates instanceof Api.Updates) {
    const chat = updates.chats[0];
    if (chat) {
      id = chat.id.toString();
    }
  }
  return { title, id };
}

export async function createChannel(
  client: TelegramClient,
  title: string,
  about: string,
  options: { broadcast?: boolean } = {}
): Promise<{ title: string; id: string }> {
  const res = await client.invoke(
    new Api.channels.CreateChannel({
      title,
      about,
      broadcast: options.broadcast || undefined,
      megagroup: options.broadcast ? undefined : true,
    })
  );
  let id = "";
  if (res instanceof Api.Updates) {
    const chat = res.chats[0];
    if (chat) {
      id = chat.id.toString();
    }
  }
  return { title, id };
}

export async function sendTyping(
  client: TelegramClient,
  chatIdentifier: string,
  action:
    | "typing"
    | "photo"
    | "video"
    | "audio"
    | "document"
    | "cancel" = "typing"
): Promise<{ title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);
  const actionMap: Record<string, Api.TypeSendMessageAction> = {
    typing: new Api.SendMessageTypingAction(),
    photo: new Api.SendMessageUploadPhotoAction({ progress: 0 }),
    video: new Api.SendMessageUploadVideoAction({ progress: 0 }),
    audio: new Api.SendMessageUploadAudioAction({ progress: 0 }),
    document: new Api.SendMessageUploadDocumentAction({ progress: 0 }),
    cancel: new Api.SendMessageCancelAction(),
  };
  await client.invoke(
    new Api.messages.SetTyping({ peer, action: actionMap[action] })
  );
  return { title: getChatTitle(entity) };
}

export async function updateProfile(
  client: TelegramClient,
  fields: { firstName?: string; lastName?: string; about?: string }
): Promise<void> {
  await client.invoke(new Api.account.UpdateProfile(fields));
}

export async function updateUsername(
  client: TelegramClient,
  username: string
): Promise<void> {
  await client.invoke(new Api.account.UpdateUsername({ username }));
}

export async function setProfilePhoto(
  client: TelegramClient,
  filePath: string
): Promise<void> {
  const file = await client.uploadFile({
    file: uploadable(fileSnapshot(filePath)),
    workers: 1,
  });
  await client.invoke(new Api.photos.UploadProfilePhoto({ file }));
}

export async function downloadAvatar(
  client: TelegramClient,
  chatIdentifier: string,
  outputDir: string
): Promise<{ filePath: string | null; title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const title = getChatTitle(entity);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const fileName = `avatar_${entity.id.toString()}.jpg`;
  const filePath = join(outputDir, fileName);
  assertDownloadTarget(filePath);
  const result = await client.downloadProfilePhoto(entity, {
    outputFile: filePath,
  });
  if (!result) {
    return { filePath: null, title };
  }
  return { filePath: typeof result === "string" ? result : filePath, title };
}

export async function queryInlineBot(
  client: TelegramClient,
  botIdentifier: string,
  query: string,
  limit = 20
): Promise<{
  results: { type: string; title: string; description?: string; id: string }[];
}> {
  const bot = await resolveChat(client, botIdentifier);
  if (!(bot instanceof Api.User)) {
    throw new Error("Inline queries can only target bots");
  }
  const inputBot = new Api.InputUser({
    userId: bot.id,
    accessHash: bot.accessHash || bigInt(0),
  });

  const res = await client.invoke(
    new Api.messages.GetInlineBotResults({
      bot: inputBot,
      peer: new Api.InputPeerSelf(),
      query,
      offset: "",
    })
  );

  const results: {
    type: string;
    title: string;
    description?: string;
    id: string;
  }[] = [];
  for (const raw of res.results.slice(0, limit)) {
    if (
      raw instanceof Api.BotInlineResult ||
      raw instanceof Api.BotInlineMediaResult
    ) {
      results.push({
        type: raw.type,
        title: raw.title || "",
        description: raw.description || undefined,
        id: raw.id,
      });
    }
  }
  return { results };
}

export async function getUserStories(
  client: TelegramClient,
  userIdentifier: string
): Promise<{
  name: string;
  stories: { id: number; date: Date; caption: string }[];
}> {
  const entity = await resolveChat(client, userIdentifier);
  const peer = await client.getInputEntity(entity);
  const res = await client.invoke(new Api.stories.GetPeerStories({ peer }));
  const stories: { id: number; date: Date; caption: string }[] = [];
  for (const s of res.stories.stories) {
    if (s instanceof Api.StoryItem) {
      stories.push({
        id: s.id,
        date: new Date(s.date * 1000),
        caption: s.caption || "",
      });
    }
  }
  return { name: getChatTitle(entity), stories };
}

async function resolveUser(
  client: TelegramClient,
  userIdentifier: string
): Promise<Api.User> {
  const entity = await resolveChat(client, userIdentifier);
  if (!(entity instanceof Api.User)) {
    throw new Error("Target is not a user");
  }
  return entity;
}

function userLabel(user: Api.User): string {
  return user.username
    ? `@${user.username}`
    : user.firstName || user.id.toString();
}

function friendlyAdminError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (
    msg.includes("USER_NOT_PARTICIPANT") ||
    msg.includes("USER_NOT_MUTUAL_CONTACT")
  ) {
    return "The target must be a member of the group first.";
  }
  if (msg.includes("CHAT_ADMIN_REQUIRED") || msg.includes("ADMIN_RIGHT")) {
    return "You lack the rights to add admins in this group.";
  }
  if (msg.includes("USER_PRIVACY_RESTRICTED")) {
    return "The target's privacy settings prevent this action.";
  }
  if (msg.includes("USER_CREATOR")) {
    return "That user is the group creator and cannot be changed this way.";
  }
  if (msg.includes("USER_ADMIN_INVALID")) {
    return "You can't edit this user's admin status (they may have been promoted by someone else).";
  }
  if (msg.includes("RIGHT_FORBIDDEN")) {
    return "One of the requested admin rights is not allowed in this group.";
  }
  if (msg.includes("ADMINS_TOO_MUCH")) {
    return "This group already has the maximum number of admins.";
  }
  return msg;
}

function friendlyTransferError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("PASSWORD_HASH_INVALID")) {
    return "Incorrect 2FA password.";
  }
  if (msg.includes("PASSWORD_MISSING")) {
    return "No 2FA password is set on your account. Enable two-step verification first.";
  }
  if (msg.includes("SRP_PASSWORD_CHANGED") || msg.includes("SRP_ID_INVALID")) {
    return "Your 2FA password state changed mid-request. Please try again.";
  }
  if (msg.includes("PASSWORD_TOO_FRESH")) {
    return "Your 2FA password was set too recently. Telegram blocks ownership transfer for ~7 days after enabling or changing it.";
  }
  if (
    msg.includes("SESSION_TOO_FRESH") ||
    msg.includes("FRESH_CHANGE_ADMINS_FORBIDDEN")
  ) {
    return "This login session is too new. Telegram blocks ownership transfer for ~24h after a new login.";
  }
  if (msg.includes("CHAT_ADMIN_REQUIRED") || msg.includes("CHANNEL_PRIVATE")) {
    return "You must be the creator of this group to transfer ownership.";
  }
  if (
    msg.includes("USER_NOT_PARTICIPANT") ||
    msg.includes("USER_NOT_MUTUAL_CONTACT")
  ) {
    return "The target must be a member of the group first.";
  }
  if (msg.includes("USER_PRIVACY_RESTRICTED")) {
    return "The target's privacy settings prevent the transfer. Ask them to adjust their privacy settings or add you as a contact.";
  }
  if (msg.includes("USER_CHANNELS_TOO_MUCH")) {
    return "The target is in too many groups/channels and cannot receive ownership right now.";
  }
  if (msg.includes("CHANNELS_ADMIN_PUBLIC_TOO_MUCH")) {
    return "The target already owns too many public groups/channels.";
  }
  return msg;
}

export async function promoteAdmin(
  client: TelegramClient,
  chatIdentifier: string,
  userIdentifier: string,
  options: { rank?: string; canAddAdmins?: boolean } = {}
): Promise<{ success: boolean; message: string }> {
  const chat = await resolveChat(client, chatIdentifier);

  let user: Api.User;
  try {
    user = await resolveUser(client, userIdentifier);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "Target is not a user") {
      return { success: false, message: msg };
    }
    return { success: false, message: `User not found: ${userIdentifier}` };
  }

  if (chat instanceof Api.Channel) {
    try {
      await client.invoke(
        new Api.channels.EditAdmin({
          channel: chat,
          userId: user,
          adminRights: new Api.ChatAdminRights({
            changeInfo: true,
            postMessages: true,
            editMessages: true,
            deleteMessages: true,
            banUsers: true,
            inviteUsers: true,
            pinMessages: true,
            manageCall: true,
            other: true,
            addAdmins: options.canAddAdmins ?? false,
          }),
          rank: options.rank ?? "",
        })
      );
      return {
        success: true,
        message: `Promoted ${userLabel(user)} to admin in "${chat.title}"`,
      };
    } catch (error: unknown) {
      return { success: false, message: friendlyAdminError(error) };
    }
  } else if (chat instanceof Api.Chat) {
    try {
      await client.invoke(
        new Api.messages.EditChatAdmin({
          chatId: chat.id,
          userId: user,
          isAdmin: true,
        })
      );
      const ignoredNote =
        options.rank || options.canAddAdmins
          ? " (basic groups grant full admin rights; --rank/--add-admins ignored)"
          : "";
      return {
        success: true,
        message: `Promoted ${userLabel(user)} to admin in "${chat.title}"${ignoredNote}`,
      };
    } catch (error: unknown) {
      return { success: false, message: friendlyAdminError(error) };
    }
  }

  return { success: false, message: "Not a group chat" };
}

export async function transferOwnership(
  client: TelegramClient,
  chatIdentifier: string,
  userIdentifier: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const chat = await resolveChat(client, chatIdentifier);

  if (!(chat instanceof Api.Channel)) {
    return {
      success: false,
      message:
        "Ownership transfer is only supported for supergroups and channels. Convert a basic group to a supergroup first.",
    };
  }

  let user: Api.User;
  try {
    user = await resolveUser(client, userIdentifier);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "Target is not a user") {
      return { success: false, message: msg };
    }
    return { success: false, message: `User not found: ${userIdentifier}` };
  }

  let passwordInfo: Api.account.Password;
  try {
    passwordInfo = await client.invoke(new Api.account.GetPassword());
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  if (!passwordInfo.hasPassword) {
    return {
      success: false,
      message:
        "Ownership transfer requires two-step verification (a cloud password) on your account. Enable it in Telegram > Settings > Privacy and Security first.",
    };
  }

  try {
    const srpCheck = await computeCheck(passwordInfo, password);
    await client.invoke(
      new Api.messages.EditChatCreator({
        peer: chat,
        userId: user,
        password: srpCheck,
      })
    );
    return {
      success: true,
      message: `Transferred ownership of "${chat.title}" to ${userLabel(user)}`,
    };
  } catch (error: unknown) {
    return { success: false, message: friendlyTransferError(error) };
  }
}

export interface ChatDetails {
  id: string;
  type: "user" | "bot" | "group" | "supergroup" | "channel";
  title: string;
  username?: string;
  about?: string;
  members?: number;
  online?: number;
  admins?: number;
  unread?: number;
  linkedChatId?: string;
  forum?: boolean;
  slowmodeSeconds?: number;
  inviteLink?: string;
  phone?: string;
  commonChats?: number;
  blocked?: boolean;
  isSelf?: boolean;
}

/** Everything useful about a chat, user or channel in one call. */
export async function getChatInfo(
  client: TelegramClient,
  chatIdentifier: string
): Promise<ChatDetails> {
  const entity = await resolveChat(client, chatIdentifier);
  const id = utils.getPeerId(entity).toString();

  if (entity instanceof Api.User) {
    const full = await client.invoke(new Api.users.GetFullUser({ id: entity }));
    return {
      id,
      type: entity.bot ? "bot" : "user",
      title:
        [entity.firstName, entity.lastName].filter(Boolean).join(" ") ||
        entity.username ||
        id,
      username: entity.username ?? undefined,
      about: full.fullUser.about ?? undefined,
      phone: entity.phone ?? undefined,
      commonChats: full.fullUser.commonChatsCount || undefined,
      blocked: full.fullUser.blocked || undefined,
      isSelf: entity.self || undefined,
    };
  }

  if (entity instanceof Api.Channel) {
    const res = await client.invoke(
      new Api.channels.GetFullChannel({ channel: entity })
    );
    const full = res.fullChat as Api.ChannelFull;
    const linked = full.linkedChatId
      ? utils
          .getPeerId(new Api.PeerChannel({ channelId: full.linkedChatId }))
          .toString()
      : undefined;
    return {
      id,
      type: entity.megagroup ? "supergroup" : "channel",
      title: entity.title,
      username: entity.username ?? undefined,
      about: full.about || undefined,
      members: full.participantsCount ?? entity.participantsCount ?? undefined,
      online: full.onlineCount || undefined,
      admins: full.adminsCount || undefined,
      unread: full.unreadCount || undefined,
      linkedChatId: linked,
      forum: entity.forum || undefined,
      slowmodeSeconds: full.slowmodeSeconds || undefined,
      inviteLink:
        full.exportedInvite instanceof Api.ChatInviteExported
          ? full.exportedInvite.link
          : undefined,
    };
  }

  const res = await client.invoke(
    new Api.messages.GetFullChat({ chatId: entity.id })
  );
  const full = res.fullChat as Api.ChatFull;
  return {
    id,
    type: "group",
    title: entity.title,
    about: full.about || undefined,
    members: entity.participantsCount ?? undefined,
    inviteLink:
      full.exportedInvite instanceof Api.ChatInviteExported
        ? full.exportedInvite.link
        : undefined,
  };
}

export interface ForumTopicInfo {
  id: number;
  title: string;
  unread: number;
  topMessage: number;
  closed?: boolean;
  pinned?: boolean;
}

export async function getForumTopics(
  client: TelegramClient,
  chatIdentifier: string,
  options: { limit?: number; query?: string } = {}
): Promise<{ chatTitle: string; topics: ForumTopicInfo[] }> {
  const entity = await resolveChat(client, chatIdentifier);
  if (!hasTopics(entity)) {
    throw new CliError(
      `"${getChatTitle(entity)}" is not a forum (topics are only in forum supergroups and bots with topics)`,
      "not_a_forum",
      EXIT.USAGE
    );
  }
  const res = await client.invoke(
    new Api.messages.GetForumTopics({
      peer: entity,
      q: options.query,
      offsetDate: 0,
      offsetId: 0,
      offsetTopic: 0,
      limit: options.limit ?? 100,
    })
  );
  const topics: ForumTopicInfo[] = [];
  for (const t of res.topics) {
    if (t instanceof Api.ForumTopic) {
      topics.push({
        id: t.id,
        title: t.title,
        unread: t.unreadCount,
        topMessage: t.topMessage,
        closed: t.closed || undefined,
        pinned: t.pinned || undefined,
      });
    }
  }
  return { chatTitle: getChatTitle(entity), topics };
}

/** Public t.me link to a message (private chats/groups have no message links). */
export async function getMessageLink(
  client: TelegramClient,
  chatIdentifier: string,
  messageId: number,
  options: { thread?: boolean } = {}
): Promise<string> {
  const entity = await resolveChat(client, chatIdentifier);
  if (!(entity instanceof Api.Channel)) {
    throw new Error("Message links exist only for channels and supergroups");
  }
  const res = await client.invoke(
    new Api.channels.ExportMessageLink({
      channel: entity,
      id: messageId,
      thread: options.thread,
    })
  );
  return res.link;
}

/** Last read incoming message ID and unread count of a chat (from the dialog list). */
export async function getReadState(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ readInboxMaxId: number; unreadCount: number }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peerId = utils.getPeerId(entity).toString();
  const dialog = (await getDialogsCached(client)).find(
    (d) => d.id?.toString() === peerId
  );
  if (!dialog || !(dialog.dialog instanceof Api.Dialog)) {
    throw new Error(
      `No dialog for "${chatIdentifier}" in your chat list, so its unread state is unknown`
    );
  }
  return {
    readInboxMaxId: dialog.dialog.readInboxMaxId,
    unreadCount: dialog.unreadCount,
  };
}

export interface ContactInfoRow {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  mutual?: boolean;
}

export async function listContacts(
  client: TelegramClient,
  query?: string
): Promise<ContactInfoRow[]> {
  const res = await client.invoke(
    new Api.contacts.GetContacts({ hash: bigInt(0) })
  );
  if (!(res instanceof Api.contacts.Contacts)) {
    return [];
  }
  const q = query?.toLowerCase();
  const rows: ContactInfoRow[] = [];
  for (const u of res.users) {
    if (!(u instanceof Api.User)) {
      continue;
    }
    const name =
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.username ||
      u.id.toString();
    if (
      q &&
      !(
        name.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      )
    ) {
      continue;
    }
    rows.push({
      id: u.id.toString(),
      name,
      username: u.username ?? undefined,
      phone: u.phone ?? undefined,
      mutual: u.mutualContact || undefined,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build any TL request from the schema and invoke it (issue #47 "reachability"). Peer/file fields
 * are passed through `materializeApiParams`: `{"_chat": "<identifier>"}` resolves a chat the same
 * way every other command does (title, @username, ID or "me"; strict under a write), and
 * `{"_base64": "…"}` / `{"_hex": "…"}` become raw bytes. A bare string in a peer-typed field was
 * already turned into `{"_chat"}` by runApiMethod (bindStringPeers), before the approval.
 */
export async function invokeApi(
  client: TelegramClient,
  methodName: string,
  rawParams: Record<string, unknown> = {}
): Promise<unknown> {
  const {
    resolveApiMethod,
    mcpPaidStarsRefusal,
    mcpParamRefusal,
    geoParamRefusal,
  } = await import("./api-methods.js");
  const { mcpApiAllowlistRefusal } = await import("./mcp-api-allowlist.js");
  const { ctor, className } = resolveApiMethod(methodName);
  const notAllowed = mcpApiAllowlistRefusal(className);
  if (notAllowed) {
    throw new Error(notAllowed);
  }
  const params = (await materializeApiParams(client, rawParams)) as Record<
    string,
    unknown
  >;
  const request = new (ctor as unknown as new (
    a: Record<string, unknown>
  ) => Api.AnyRequest)(params);
  const fields = { ...request } as Record<string, unknown>;
  const refusal =
    geoParamRefusal(className, fields) ??
    mcpPaidStarsRefusal(className, fields) ??
    mcpParamRefusal(className, fields);
  if (refusal) {
    throw new Error(refusal);
  }
  return client.invoke(request);
}

async function materializeApiParams(
  client: TelegramClient,
  value: unknown
): Promise<unknown> {
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => materializeApiParams(client, v)));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    switch (apiMarker(obj)) {
      case "chat": {
        return resolveChat(client, obj._chat as string);
      }
      case "base64": {
        return Buffer.from(obj._base64 as string, "base64");
      }
      case "hex": {
        return Buffer.from(obj._hex as string, "hex");
      }
      case "bigint": {
        return bigInt(String(obj._bigint));
      }
    }
    const out = Object.create(null) as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      out[k] = await materializeApiParams(client, v);
    }
    return out;
  }
  return value;
}

const MCP_REDACTED_KEY =
  /^(phone|phoneNumber|vcard|birthday|businessLocation|note|location|address)$|geo/i;

const MCP_REDACTED_BY_TYPE: [RegExp, Set<string>][] = [
  [/venue/, new Set(["venueId", "provider"])],
  [/^messageactiongiftcode$/, new Set(["slug"])],
  [/./, new Set(["giftCodeSlug", "usedGiftSlug"])],
];

function tlTypeName(val: unknown): string | undefined {
  if (!val || typeof val !== "object" || Array.isArray(val)) {
    return undefined;
  }
  const v = val as { className?: unknown; _?: unknown };
  const name =
    typeof v.className === "string"
      ? v.className
      : typeof v._ === "string"
        ? v._
        : undefined;
  return name?.toLowerCase();
}

function plainJsonValue(val: unknown): unknown {
  if (typeof val === "bigint") {
    return val.toString();
  }
  if (bigInt.isInstance(val)) {
    return val.toString();
  }
  if (val instanceof Uint8Array) {
    return Buffer.from(val).toString("base64");
  }
  return val;
}

function maskLoginServiceJson(
  val: Record<string, unknown>
): Record<string, unknown> {
  const arrayKey = new WeakMap<object, string>();
  return JSON.parse(
    JSON.stringify(
      val,
      function (this: Record<string, unknown>, k: string, v: unknown) {
        const orig = this[k];
        if (orig instanceof Uint8Array) {
          return LOGIN_CODE_HIDDEN;
        }
        if (typeof orig === "bigint" || bigInt.isInstance(orig)) {
          return plainJsonValue(orig);
        }
        const plain = plainJsonValue(v);
        if (plain !== v) {
          return plain;
        }
        if (typeof v === "string") {
          return maskContent(
            v,
            true,
            Array.isArray(this) ? (arrayKey.get(this) ?? k) : k
          );
        }
        if (Array.isArray(v)) {
          arrayKey.set(v, Array.isArray(this) ? (arrayKey.get(this) ?? k) : k);
        }
        return v;
      }
    )
  ) as Record<string, unknown>;
}

/** Compact JSON of a raw TL result: big integers as strings, bytes as base64, pretty on a TTY. */
export function serializeApiResult(result: unknown): string {
  const overMcp = isOverMcp();
  const pretty = isTTY || process.env.TG_JSON_PRETTY === "1";
  const replacer = function replacer(
    this: unknown,
    _key: string,
    val: unknown
  ): unknown {
    const plain = plainJsonValue(val);
    if (plain !== val) {
      return plain;
    }
    if (_key === "autologinToken" && val) {
      return "[redacted]";
    }
    if (!overMcp) {
      return val;
    }
    if (val != null && MCP_REDACTED_KEY.test(_key)) {
      return "[redacted]";
    }
    const holder = tlTypeName(this);
    if (
      val != null &&
      holder &&
      MCP_REDACTED_BY_TYPE.some(
        ([type, keys]) => type.test(holder) && keys.has(_key)
      )
    ) {
      return "[redacted]";
    }
    if (typeof val === "string") {
      return maskForModel(val, "chat");
    }
    const type = tlTypeName(val);
    const obj = val as Record<string, unknown>;
    if (
      (type === "message" && isLoginServiceMessage(obj)) ||
      (type === "updateshortmessage" &&
        LOGIN_SERVICE_USER_IDS.has(String(obj.userId)))
    ) {
      return maskLoginServiceJson(obj);
    }
    if (
      type === "messagereplyheader" &&
      isLoginServicePeer(obj.replyToPeerId)
    ) {
      return maskLoginServiceJson(obj);
    }
    return val;
  };
  const json = JSON.stringify(result, replacer, pretty ? 2 : undefined);
  return json === undefined ? "null" : json;
}

export interface DraftInfo {
  chatId: string;
  chatTitle: string;
  text: string;
  date?: Date;
  replyToMsgId?: number;
}

/** All saved-but-unsent drafts across chats (Telethon get_drafts). */
export async function getDrafts(client: TelegramClient): Promise<DraftInfo[]> {
  const res = await client.invoke(new Api.messages.GetAllDrafts());
  const drafts: DraftInfo[] = [];
  if (res instanceof Api.Updates || res instanceof Api.UpdatesCombined) {
    for (const update of res.updates) {
      if (
        !(update instanceof Api.UpdateDraftMessage) ||
        !(update.draft instanceof Api.DraftMessage)
      ) {
        continue;
      }
      if (!update.draft.message) {
        continue;
      }
      drafts.push({
        chatId: utils.getPeerId(update.peer).toString(),
        chatTitle:
          peerTitle(update.peer, res.chats, res.users) ??
          utils.getPeerId(update.peer).toString(),
        text: update.draft.message,
        date: update.draft.date
          ? new Date(update.draft.date * 1000)
          : undefined,
        replyToMsgId:
          update.draft.replyTo instanceof Api.InputReplyToMessage
            ? update.draft.replyTo.replyToMsgId
            : undefined,
      });
    }
  }
  return drafts;
}

export interface AdminLogEntry {
  id: string;
  date: Date;
  user: string;
  action: string;
  detail?: string;
}

function describeAdminAction(
  action: Api.TypeChannelAdminLogEventAction
): string | undefined {
  if (action instanceof Api.ChannelAdminLogEventActionChangeTitle) {
    return `"${action.prevValue}" → "${action.newValue}"`;
  }
  if (action instanceof Api.ChannelAdminLogEventActionChangeAbout) {
    return `about: "${action.prevValue}" → "${action.newValue}"`;
  }
  if (
    action instanceof Api.ChannelAdminLogEventActionDeleteMessage &&
    action.message instanceof Api.Message
  ) {
    return messageText(action.message);
  }
  if (
    action instanceof Api.ChannelAdminLogEventActionEditMessage &&
    action.newMessage instanceof Api.Message
  ) {
    return messageText(action.newMessage);
  }
  if (action instanceof Api.ChannelAdminLogEventActionChangeUsername) {
    return `@${action.prevValue || "∅"} → @${action.newValue || "∅"}`;
  }
  return undefined;
}

/** Recent administrative actions in a supergroup/channel (Telethon get_admin_log). */
export async function getAdminLog(
  client: TelegramClient,
  chatIdentifier: string,
  options: { limit?: number; query?: string } = {}
): Promise<{ chatTitle: string; entries: AdminLogEntry[] }> {
  const entity = await resolveChat(client, chatIdentifier);
  if (!(entity instanceof Api.Channel)) {
    throw new Error(
      "The admin log is only available for supergroups and channels."
    );
  }
  const res = await client.invoke(
    new Api.channels.GetAdminLog({
      channel: entity,
      q: options.query ?? "",
      maxId: bigInt(0),
      minId: bigInt(0),
      limit: options.limit ?? 50,
    })
  );
  const entries: AdminLogEntry[] = res.events.map((event) => {
    const user = res.users.find(
      (u): u is Api.User => u instanceof Api.User && u.id.equals(event.userId)
    );
    return {
      id: event.id.toString(),
      date: new Date(event.date * 1000),
      user: user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.username ||
          user.id.toString()
        : event.userId.toString(),
      action: event.action.className.replace(/^ChannelAdminLogEventAction/, ""),
      detail: describeAdminAction(event.action),
    };
  });
  return { chatTitle: getChatTitle(entity), entries };
}

export interface ProfilePhotoInfo {
  id: string;
  date: Date;
  dcId?: number;
}

/** A user's profile photos, newest first (Telethon get_profile_photos). */
export async function getProfilePhotos(
  client: TelegramClient,
  identifier: string,
  options: { limit?: number } = {}
): Promise<{ title: string; count: number; photos: ProfilePhotoInfo[] }> {
  const entity = await resolveChat(client, identifier);
  if (!(entity instanceof Api.User)) {
    throw new Error(
      "profile-photos lists a user's photos; for a chat or channel photo use `avatar`."
    );
  }
  const res = await client.invoke(
    new Api.photos.GetUserPhotos({
      userId: entity,
      offset: 0,
      maxId: bigInt(0),
      limit: options.limit ?? 50,
    })
  );
  const photos: ProfilePhotoInfo[] = res.photos
    .filter((p): p is Api.Photo => p instanceof Api.Photo)
    .map((p) => ({
      id: p.id.toString(),
      date: new Date(p.date * 1000),
      dcId: p.dcId,
    }));
  const count =
    res instanceof Api.photos.PhotosSlice ? res.count : photos.length;
  return { title: getChatTitle(entity), count, photos };
}

/** Pin or unpin a chat in the dialog list (messages.ToggleDialogPin). */
export async function toggleDialogPin(
  client: TelegramClient,
  chatIdentifier: string,
  pinned: boolean
): Promise<{ title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  await client.invoke(
    new Api.messages.ToggleDialogPin({
      pinned: pinned || undefined,
      peer: new Api.InputDialogPeer({
        peer: utils.getInputPeer(entity),
      }) as unknown as Api.TypeEntityLike,
    })
  );
  return { title: getChatTitle(entity) };
}

/** Mark a chat unread (or clear that mark) without changing message read state. */
export async function markDialogUnread(
  client: TelegramClient,
  chatIdentifier: string,
  unread: boolean
): Promise<{ title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  await client.invoke(
    new Api.messages.MarkDialogUnread({
      unread: unread || undefined,
      peer: new Api.InputDialogPeer({
        peer: utils.getInputPeer(entity),
      }) as unknown as Api.TypeEntityLike,
    })
  );
  return { title: getChatTitle(entity) };
}

/**
 * Delete (remove from the dialog list) a conversation (Telethon delete_dialog). A user or basic
 * group chat has its history deleted; a supergroup/channel is left. `revoke` also deletes the
 * copy for the other side of a private chat.
 */
export async function deleteDialog(
  client: TelegramClient,
  chatIdentifier: string,
  options: { revoke?: boolean } = {}
): Promise<{ title: string; left: boolean }> {
  const entity = await resolveChat(client, chatIdentifier);
  const title = getChatTitle(entity);
  if (entity instanceof Api.Channel) {
    await client.invoke(new Api.channels.LeaveChannel({ channel: entity }));
    return { title, left: true };
  }
  if (entity instanceof Api.Chat) {
    const me = await getMe(client);
    await client.invoke(
      new Api.messages.DeleteChatUser({ chatId: entity.id, userId: me })
    );
    return { title, left: true };
  }
  await client.invoke(
    new Api.messages.DeleteHistory({
      peer: utils.getInputPeer(entity),
      maxId: 0,
      revoke: options.revoke || undefined,
    })
  );
  return { title, left: false };
}

/**
 * - `user`: Present when a specific user was asked about.
 * - `status`: 'creator' | 'admin' | 'member' | 'restricted' | 'banned' | 'left' | 'default'.
 * - `adminRights`: Admin powers granted (for creator/admin).
 * - `restrictions`: Actions the user (or everyone, for 'default') is NOT allowed to do.
 */
export interface PermissionInfo {
  chatTitle: string;
  user?: string;
  status: string;
  adminRights?: string[];
  restrictions?: string[];
}

function trueFlags(rights: { [k: string]: unknown } | undefined): string[] {
  if (!rights) {
    return [];
  }
  return Object.entries(rights)
    .filter(([k, v]) => v === true && k !== "className")
    .map(([k]) => k);
}

/**
 * A member's rights in a supergroup/channel, or the chat's default permissions when no user is
 * given (Telethon get_permissions). Read-only.
 */
export async function getPermissions(
  client: TelegramClient,
  chatIdentifier: string,
  userIdentifier?: string
): Promise<PermissionInfo> {
  const entity = await resolveChat(client, chatIdentifier);
  if (!(entity instanceof Api.Channel)) {
    throw new Error(
      "Permissions apply to supergroups and channels; basic groups have no per-user rights model."
    );
  }
  const chatTitle = getChatTitle(entity);
  if (!userIdentifier) {
    return {
      chatTitle,
      status: "default",
      restrictions: trueFlags(entity.defaultBannedRights as never),
    };
  }
  const who = await resolveChat(client, userIdentifier);
  const res = await client.invoke(
    new Api.channels.GetParticipant({ channel: entity, participant: who })
  );
  const p = res.participant;
  const user = res.users.find((u): u is Api.User => u instanceof Api.User);
  const name = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      user.id.toString()
    : userIdentifier;

  if (p instanceof Api.ChannelParticipantCreator) {
    return {
      chatTitle,
      user: name,
      status: "creator",
      adminRights: trueFlags(p.adminRights as never),
    };
  }
  if (p instanceof Api.ChannelParticipantAdmin) {
    return {
      chatTitle,
      user: name,
      status: "admin",
      adminRights: trueFlags(p.adminRights as never),
    };
  }
  if (p instanceof Api.ChannelParticipantBanned) {
    const banned = p.bannedRights;
    return {
      chatTitle,
      user: name,
      status: banned.viewMessages ? "banned" : "restricted",
      restrictions: trueFlags(banned as never),
    };
  }
  if (p instanceof Api.ChannelParticipantLeft) {
    return { chatTitle, user: name, status: "left" };
  }
  return { chatTitle, user: name, status: "member" };
}

/** A stats metric as current + previous value (so growth is visible). */
export interface StatValue {
  current: number;
  previous?: number;
}
export interface TopPoster {
  userId: string;
  name: string;
  username?: string;
  messages: number;
  avgChars: number;
}
export interface TopAdmin {
  userId: string;
  name: string;
  deleted: number;
  kicked: number;
  banned: number;
}
export interface TopInviter {
  userId: string;
  name: string;
  invitations: number;
}
export interface PostInteraction {
  msgId?: number;
  storyId?: number;
  views: number;
  forwards: number;
  reactions: number;
}
/** A parsed graph series (opt-in `--graphs`), or an error for that one graph. */
export interface GraphSeries {
  name: string;
  data?: unknown;
  error?: string;
}

export interface BroadcastActivity {
  kind: "broadcast";
  period?: { minDate: string; maxDate: string };
  followers?: StatValue;
  viewsPerPost?: StatValue;
  sharesPerPost?: StatValue;
  reactionsPerPost?: StatValue;
  viewsPerStory?: StatValue;
  sharesPerStory?: StatValue;
  reactionsPerStory?: StatValue;
  enabledNotificationsPct?: number;
  recentPosts?: PostInteraction[];
  graphs?: GraphSeries[];
}
export interface MegagroupActivity {
  kind: "megagroup";
  period?: { minDate: string; maxDate: string };
  members?: StatValue;
  messages?: StatValue;
  viewers?: StatValue;
  posters?: StatValue;
  topPosters?: TopPoster[];
  topAdmins?: TopAdmin[];
  topInviters?: TopInviter[];
  graphs?: GraphSeries[];
}
export type ChatActivity =
  | BroadcastActivity
  | MegagroupActivity
  | { error: string };

/**
 * - `activity`: Aggregate activity when the account may see it, otherwise `{ error }`.
 */
export interface ChatStats {
  id: string;
  title: string;
  type: "user" | "group" | "supergroup" | "channel";
  username?: string;
  about?: string;
  created?: string;
  verified?: boolean;
  scam?: boolean;
  fake?: boolean;
  restricted?: boolean;
  restrictionReasons?: string[];
  participantsCount?: number;
  onlineCount?: number;
  adminsCount?: number;
  kickedCount?: number;
  bannedCount?: number;
  linkedChatId?: string;
  slowModeSeconds?: number;
  activity?: ChatActivity;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const avp = (v: unknown): StatValue | undefined =>
  v instanceof Api.StatsAbsValueAndPrev
    ? { current: round2(v.current), previous: round2(v.previous) }
    : undefined;
const pct = (v: unknown): number | undefined =>
  v instanceof Api.StatsPercentValue && v.total
    ? round2((v.part / v.total) * 100)
    : undefined;
const period = (v: unknown): { minDate: string; maxDate: string } | undefined =>
  v instanceof Api.StatsDateRangeDays
    ? {
        minDate: new Date(v.minDate * 1000).toISOString(),
        maxDate: new Date(v.maxDate * 1000).toISOString(),
      }
    : undefined;

async function invokeStats<R extends Api.AnyRequest>(
  client: TelegramClient,
  req: R
): Promise<R["__response"]> {
  try {
    return await client.invoke(req);
  } catch (error) {
    const m = (error instanceof Error ? error.message : String(error)).match(
      /STATS_MIGRATE_(\d+)/
    );
    if (m) {
      return await client.invoke(req, Number(m[1]));
    }
    throw error;
  }
}

function restrictionReasons(
  entity: Api.Channel | Api.User
): string[] | undefined {
  const reasons = entity.restrictionReason;
  if (!reasons?.length) {
    return undefined;
  }
  return reasons.map(
    (r) => `${r.platform}: ${r.reason}${r.text ? ` (${r.text})` : ""}`
  );
}

function userName(
  users: Map<string, Api.User>,
  id: bigInt.BigInteger
): { name: string; username?: string } {
  const u = users.get(id.toString());
  if (!u) {
    return { name: id.toString() };
  }
  return {
    name:
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.username ||
      id.toString(),
    username: u.username ?? undefined,
  };
}

async function collectGraphs(
  client: TelegramClient,
  named: Record<string, unknown>
): Promise<GraphSeries[]> {
  const out: GraphSeries[] = [];
  for (const [name, graph] of Object.entries(named)) {
    try {
      let g = graph;
      if (g instanceof Api.StatsGraphAsync) {
        g = await invokeStats(
          client,
          new Api.stats.LoadAsyncGraph({ token: g.token })
        );
      }
      if (g instanceof Api.StatsGraphError) {
        out.push({ name, error: g.error });
      } else if (g instanceof Api.StatsGraph) {
        const raw = g.json instanceof Api.DataJSON ? g.json.data : "";
        out.push({ name, data: raw ? JSON.parse(raw) : undefined });
      }
    } catch (error) {
      out.push({
        name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return out;
}

function postInteraction(c: Api.TypePostInteractionCounters): PostInteraction {
  if (c instanceof Api.PostInteractionCountersStory) {
    return {
      storyId: c.storyId,
      views: c.views,
      forwards: c.forwards,
      reactions: c.reactions,
    };
  }
  const m = c as Api.PostInteractionCountersMessage;
  return {
    msgId: m.msgId,
    views: m.views,
    forwards: m.forwards,
    reactions: m.reactions,
  };
}

/** Full statistics for a channel / supergroup / group (Telethon get_stats). Read-only. */
export async function getChatStats(
  client: TelegramClient,
  chatIdentifier: string,
  options: { graphs?: boolean } = {}
): Promise<ChatStats> {
  const entity = await resolveChat(client, chatIdentifier);

  if (entity instanceof Api.Channel) {
    const megagroup = Boolean(entity.megagroup);
    const stats: ChatStats = {
      id: entity.id.toString(),
      title: entity.title,
      type: megagroup ? "supergroup" : "channel",
      username: entity.username ?? undefined,
      created: iso(entity.date),
      verified: entity.verified || undefined,
      scam: entity.scam || undefined,
      fake: entity.fake || undefined,
      restricted: entity.restricted || undefined,
      restrictionReasons: restrictionReasons(entity),
    };
    try {
      const full = await client.invoke(
        new Api.channels.GetFullChannel({ channel: entity })
      );
      if (full.fullChat instanceof Api.ChannelFull) {
        const f = full.fullChat;
        stats.about = f.about || undefined;
        stats.participantsCount = f.participantsCount ?? undefined;
        stats.onlineCount = f.onlineCount ?? undefined;
        stats.adminsCount = f.adminsCount ?? undefined;
        stats.kickedCount = f.kickedCount ?? undefined;
        stats.bannedCount = f.bannedCount ?? undefined;
        stats.linkedChatId = f.linkedChatId
          ? f.linkedChatId.toString()
          : undefined;
        stats.slowModeSeconds = f.slowmodeSeconds ?? undefined;
      }
    } catch {}
    stats.activity = await activityStats(
      client,
      entity,
      megagroup,
      options.graphs ?? false
    );
    return stats;
  }

  if (entity instanceof Api.Chat) {
    const stats: ChatStats = {
      id: entity.id.toString(),
      title: entity.title,
      type: "group",
      participantsCount: entity.participantsCount ?? undefined,
      created: iso(entity.date),
    };
    try {
      const full = await client.invoke(
        new Api.messages.GetFullChat({ chatId: entity.id })
      );
      if ("fullChat" in full && full.fullChat instanceof Api.ChatFull) {
        stats.about = full.fullChat.about || undefined;
      }
    } catch {}
    stats.activity = {
      error:
        "Aggregate statistics are only available for channels and supergroups.",
    };
    return stats;
  }

  const stats: ChatStats = {
    id: entity.id.toString(),
    title: getChatTitle(entity),
    type: "user",
    username: entity.username ?? undefined,
    verified: entity.verified || undefined,
    scam: entity.scam || undefined,
    fake: entity.fake || undefined,
    restricted: entity.restricted || undefined,
    restrictionReasons: restrictionReasons(entity),
  };
  try {
    const full = await client.invoke(new Api.users.GetFullUser({ id: entity }));
    stats.about = full.fullUser.about ?? undefined;
  } catch {}
  return stats;
}

async function activityStats(
  client: TelegramClient,
  entity: Api.Channel,
  megagroup: boolean,
  graphs: boolean
): Promise<ChatActivity> {
  try {
    if (megagroup) {
      const s = await invokeStats(
        client,
        new Api.stats.GetMegagroupStats({ channel: entity })
      );
      const users = new Map(
        s.users
          .filter((u): u is Api.User => u instanceof Api.User)
          .map((u) => [u.id.toString(), u])
      );
      const act: MegagroupActivity = {
        kind: "megagroup",
        period: period(s.period),
        members: avp(s.members),
        messages: avp(s.messages),
        viewers: avp(s.viewers),
        posters: avp(s.posters),
        topPosters: s.topPosters.map((p) => ({
          userId: p.userId.toString(),
          ...userName(users, p.userId),
          messages: p.messages,
          avgChars: p.avgChars,
        })),
        topAdmins: s.topAdmins.map((a) => ({
          userId: a.userId.toString(),
          name: userName(users, a.userId).name,
          deleted: a.deleted,
          kicked: a.kicked,
          banned: a.banned,
        })),
        topInviters: s.topInviters.map((i) => ({
          userId: i.userId.toString(),
          name: userName(users, i.userId).name,
          invitations: i.invitations,
        })),
      };
      if (graphs) {
        act.graphs = await collectGraphs(client, {
          growth: s.growthGraph,
          members: s.membersGraph,
          newMembersBySource: s.newMembersBySourceGraph,
          languages: s.languagesGraph,
          messages: s.messagesGraph,
          actions: s.actionsGraph,
          topHours: s.topHoursGraph,
          weekdays: s.weekdaysGraph,
        });
      }
      return act;
    }
    const s = await invokeStats(
      client,
      new Api.stats.GetBroadcastStats({ channel: entity })
    );
    const act: BroadcastActivity = {
      kind: "broadcast",
      period: period(s.period),
      followers: avp(s.followers),
      viewsPerPost: avp(s.viewsPerPost),
      sharesPerPost: avp(s.sharesPerPost),
      reactionsPerPost: avp(s.reactionsPerPost),
      viewsPerStory: avp(s.viewsPerStory),
      sharesPerStory: avp(s.sharesPerStory),
      reactionsPerStory: avp(s.reactionsPerStory),
      enabledNotificationsPct: pct(s.enabledNotifications),
      recentPosts: s.recentPostsInteractions.map(postInteraction),
    };
    if (graphs) {
      act.graphs = await collectGraphs(client, {
        growth: s.growthGraph,
        followers: s.followersGraph,
        mute: s.muteGraph,
        topHours: s.topHoursGraph,
        interactions: s.interactionsGraph,
        ivInteractions: s.ivInteractionsGraph,
        viewsBySource: s.viewsBySourceGraph,
        newFollowersBySource: s.newFollowersBySourceGraph,
        languages: s.languagesGraph,
        reactionsByEmotion: s.reactionsByEmotionGraph,
        storyInteractions: s.storyInteractionsGraph,
        storyReactionsByEmotion: s.storyReactionsByEmotionGraph,
      });
    }
    return act;
  } catch (error) {
    return { error: statsError(error) };
  }
}

function statsError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/CHAT_ADMIN_REQUIRED/.test(msg)) {
    return "Admin rights are required to view these statistics.";
  }
  if (/BROADCAST_REQUIRED/.test(msg)) {
    return "These statistics are only available for channels.";
  }
  if (/MEGAGROUP_REQUIRED/.test(msg)) {
    return "These statistics are only available for supergroups.";
  }
  if (/not.*enough.*participant|STATS/i.test(msg)) {
    return "Statistics are not available for this chat yet (it may be too small).";
  }
  return msg;
}

export interface PublicForwardRef {
  kind: "message" | "story";
  chatId?: string;
  chatTitle?: string;
  msgId?: number;
  storyId?: number;
  views?: number;
  date?: string;
}

/**
 * - `publicForwardsCount`: Number of public channels/groups that forwarded this, if available.
 * - `publicForwards`: The public forwards themselves, up to the requested limit.
 * - `note`: Set when detailed stats are unavailable (rights / not a channel).
 */
export interface MessageStats {
  chatTitle: string;
  messageId?: number;
  storyId?: number;
  views?: number;
  forwards?: number;
  reactions?: ReactionBreakdown[];
  publicForwardsCount?: number;
  publicForwards?: PublicForwardRef[];
  graphs?: GraphSeries[];
  note?: string;
}

function publicForwardsList(pf: Api.stats.PublicForwards): PublicForwardRef[] {
  const chats = new Map(
    pf.chats
      .filter((c): c is Api.Channel | Api.Chat => "title" in c)
      .map((c) => [c.id.toString(), c.title])
  );
  const refs: PublicForwardRef[] = [];
  for (const f of pf.forwards) {
    if (
      f instanceof Api.PublicForwardMessage &&
      f.message instanceof Api.Message
    ) {
      const chatId = utils.getPeerId(f.message.peerId).toString();
      refs.push({
        kind: "message",
        chatId,
        chatTitle: chats.get(chatId.replace(/^-100/, "")),
        msgId: f.message.id,
        views: f.message.views ?? undefined,
        date: iso(f.message.date),
      });
    } else if (f instanceof Api.PublicForwardStory) {
      refs.push({
        kind: "story",
        chatId: utils.getPeerId(f.peer).toString(),
        storyId: f.story instanceof Api.StoryItem ? f.story.id : undefined,
      });
    }
  }
  return refs;
}

/** Per-message statistics (Telethon get_stats for a message). Read-only. */
export async function getMessageStats(
  client: TelegramClient,
  chatIdentifier: string,
  messageId: number,
  options: { graphs?: boolean; limit?: number } = {}
): Promise<MessageStats> {
  const entity = await resolveChat(client, chatIdentifier);
  if (!(entity instanceof Api.Channel)) {
    throw new Error(
      "Per-message statistics are only available for channels and supergroups."
    );
  }
  const out: MessageStats = { chatTitle: getChatTitle(entity), messageId };

  const raw = await client.getMessages(entity, { ids: [messageId] });
  const msg = raw[0];
  if (msg instanceof Api.Message) {
    const full = buildMessageFull(msg);
    out.views = full.views;
    out.forwards = full.forwards;
    out.reactions = full.reactions;
  }

  try {
    const pf = await invokeStats(
      client,
      new Api.stats.GetMessagePublicForwards({
        channel: entity,
        msgId: messageId,
        offset: "",
        limit: options.limit ?? 100,
      })
    );
    if (pf instanceof Api.stats.PublicForwards) {
      out.publicForwardsCount = pf.count;
      out.publicForwards = publicForwardsList(pf);
    }
    if (options.graphs) {
      const ms = await invokeStats(
        client,
        new Api.stats.GetMessageStats({ channel: entity, msgId: messageId })
      );
      out.graphs = await collectGraphs(client, {
        views: ms.viewsGraph,
        reactionsByEmotion: ms.reactionsByEmotionGraph,
      });
    }
  } catch (error) {
    out.note = statsError(error);
  }
  return out;
}

/** Per-story statistics (Telethon get_stats for a story). Read-only. */
export async function getStoryStats(
  client: TelegramClient,
  chatIdentifier: string,
  storyId: number,
  options: { graphs?: boolean; limit?: number } = {}
): Promise<MessageStats> {
  const entity = await resolveChat(client, chatIdentifier);
  if (!(entity instanceof Api.Channel)) {
    throw new Error(
      "Per-story statistics are only available for channels and supergroups."
    );
  }
  const out: MessageStats = { chatTitle: getChatTitle(entity), storyId };
  try {
    const pf = await invokeStats(
      client,
      new Api.stats.GetStoryPublicForwards({
        peer: entity,
        id: storyId,
        offset: "",
        limit: options.limit ?? 100,
      })
    );
    if (pf instanceof Api.stats.PublicForwards) {
      out.publicForwardsCount = pf.count;
      out.publicForwards = publicForwardsList(pf);
    }
    if (options.graphs) {
      const ss = await invokeStats(
        client,
        new Api.stats.GetStoryStats({ peer: entity, id: storyId })
      );
      out.graphs = await collectGraphs(client, {
        views: ss.viewsGraph,
        reactionsByEmotion: ss.reactionsByEmotionGraph,
      });
    }
  } catch (error) {
    out.note = statsError(error);
  }
  return out;
}

/** Messages queued to send later (the issue's top messages gap). Create them with `send --schedule`. */
export async function getScheduledMessages(
  client: TelegramClient,
  chatIdentifier: string,
  options: { full?: boolean } = {}
): Promise<{ chatTitle: string; messages: MessageInfo[] }> {
  const entity = await resolveChat(client, chatIdentifier);
  const res = await client.invoke(
    new Api.messages.GetScheduledHistory({ peer: entity, hash: bigInt(0) })
  );
  const messages: MessageInfo[] = [];
  if ("messages" in res) {
    for (const msg of res.messages) {
      if (msg instanceof Api.Message) {
        messages.push(await toMessageInfo(client, msg, { full: options.full }));
      }
    }
  }
  return { chatTitle: getChatTitle(entity), messages };
}

export interface SessionInfo {
  hash: string;
  current?: boolean;
  official?: boolean;
  device: string;
  platform: string;
  system: string;
  app: string;
  appVersion: string;
  ip?: string;
  country?: string;
  created?: string;
  lastActive?: string;
}

/** Active login sessions (Telethon has no direct equiv; account.GetAuthorizations). Read-only. */
export async function getSessions(
  client: TelegramClient
): Promise<{ ttlDays: number; sessions: SessionInfo[] }> {
  const res = await client.invoke(new Api.account.GetAuthorizations());
  return {
    ttlDays: res.authorizationTtlDays,
    sessions: res.authorizations.map((a) => ({
      hash: a.hash.toString(),
      current: a.current || undefined,
      official: a.officialApp || undefined,
      device: a.deviceModel,
      platform: a.platform,
      system: a.systemVersion,
      app: a.appName,
      appVersion: a.appVersion,
      ip: a.ip || undefined,
      country: a.country || undefined,
      created: iso(a.dateCreated),
      lastActive: iso(a.dateActive),
    })),
  };
}

export interface StarsTransaction {
  id: string;
  stars: number;
  date?: string;
  title?: string;
  refund?: boolean;
  pending?: boolean;
}
export interface StarsBalance {
  balance: number;
  transactions: StarsTransaction[];
}

const starsAmount = (a: unknown): number =>
  a instanceof Api.StarsAmount
    ? a.amount.toJSNumber() + (a.nanos || 0) / 1e9
    : 0;

/** Telegram Stars balance and recent transactions (read-only). */
export async function getStars(
  client: TelegramClient,
  options: { limit?: number } = {}
): Promise<StarsBalance> {
  const status = await client.invoke(
    new Api.payments.GetStarsStatus({ peer: new Api.InputPeerSelf() })
  );
  let history = status.history ?? [];
  if (!history.length) {
    try {
      const tx = await client.invoke(
        new Api.payments.GetStarsTransactions({
          peer: new Api.InputPeerSelf(),
          offset: "",
          limit: options.limit ?? 20,
        })
      );
      history = tx.history ?? [];
    } catch {}
  }
  return {
    balance: starsAmount(status.balance),
    transactions: history.slice(0, options.limit ?? 20).map((t) => ({
      id: t.id,
      stars: starsAmount(t.amount),
      date: iso(t.date),
      title: t.title ?? undefined,
      refund: t.refund || undefined,
      pending: t.pending || undefined,
    })),
  };
}

export interface InviteLink {
  link: string;
  permanent?: boolean;
  revoked?: boolean;
  requestNeeded?: boolean;
  usage?: number;
  usageLimit?: number;
  requested?: number;
  expireDate?: string;
  adminId: string;
}

/** Exported invite links for a chat (messages.GetExportedChatInvites). Read-only. */
export async function getInviteLinks(
  client: TelegramClient,
  chatIdentifier: string,
  options: { revoked?: boolean; limit?: number } = {}
): Promise<{ chatTitle: string; count: number; invites: InviteLink[] }> {
  const entity = await resolveChat(client, chatIdentifier);
  const me = await getMe(client);
  const res = await client.invoke(
    new Api.messages.GetExportedChatInvites({
      peer: entity,
      adminId: me,
      revoked: options.revoked || undefined,
      limit: options.limit ?? 50,
    })
  );
  const invites = res.invites
    .filter(
      (i): i is Api.ChatInviteExported => i instanceof Api.ChatInviteExported
    )
    .map((i) => ({
      link: i.link,
      permanent: i.permanent || undefined,
      revoked: i.revoked || undefined,
      requestNeeded: i.requestNeeded || undefined,
      usage: i.usage ?? undefined,
      usageLimit: i.usageLimit ?? undefined,
      requested: i.requested ?? undefined,
      expireDate: iso(i.expireDate ?? undefined),
      adminId: i.adminId.toString(),
    }));
  return { chatTitle: getChatTitle(entity), count: res.count, invites };
}

export interface JoinRequest {
  userId: string;
  name: string;
  date?: string;
  about?: string;
}

/** Pending join requests for a chat (messages.GetChatInviteImporters, requested). Read-only. */
export async function getJoinRequests(
  client: TelegramClient,
  chatIdentifier: string,
  options: { limit?: number } = {}
): Promise<{ chatTitle: string; count: number; requests: JoinRequest[] }> {
  const entity = await resolveChat(client, chatIdentifier);
  const res = await client.invoke(
    new Api.messages.GetChatInviteImporters({
      peer: entity,
      requested: true,
      q: "",
      offsetDate: 0,
      offsetUser: new Api.InputUserEmpty(),
      limit: options.limit ?? 50,
    })
  );
  const users = new Map(
    res.users
      .filter((u): u is Api.User => u instanceof Api.User)
      .map((u) => [u.id.toString(), u])
  );
  const requests = res.importers.map((i) => {
    const u = users.get(i.userId.toString());
    return {
      userId: i.userId.toString(),
      name: u
        ? [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.username ||
          i.userId.toString()
        : i.userId.toString(),
      date: iso(i.date),
      about: i.about ?? undefined,
    };
  });
  return { chatTitle: getChatTitle(entity), count: res.count, requests };
}

/** The ChatBannedRights flags a restriction can set, in a friendly order. */
export const BANNED_RIGHTS = [
  "viewMessages",
  "sendMessages",
  "sendMedia",
  "sendStickers",
  "sendGifs",
  "sendGames",
  "sendInline",
  "embedLinks",
  "sendPolls",
  "changeInfo",
  "inviteUsers",
  "pinMessages",
  "manageTopics",
  "sendPhotos",
  "sendVideos",
  "sendRoundvideos",
  "sendAudios",
  "sendVoices",
  "sendDocs",
  "sendPlain",
  "sendReactions",
] as const;
export type BannedRight = (typeof BANNED_RIGHTS)[number];

const MUTE_RIGHTS: BannedRight[] = [
  "sendMessages",
  "sendMedia",
  "sendStickers",
  "sendGifs",
  "sendGames",
  "sendInline",
  "embedLinks",
  "sendPolls",
  "sendPhotos",
  "sendVideos",
  "sendRoundvideos",
  "sendAudios",
  "sendVoices",
  "sendDocs",
  "sendPlain",
];

export function buildBannedRights(
  denied: BannedRight[],
  untilDate = 0
): Api.ChatBannedRights {
  const args = { untilDate } as ConstructorParameters<
    typeof Api.ChatBannedRights
  >[0];
  for (const key of denied) {
    (args as Record<string, unknown>)[key] = true;
  }
  return new Api.ChatBannedRights(args);
}

export interface PermissionChange {
  chatTitle: string;
  target: string;
  denied: BannedRight[];
  until?: string;
}

/**
 * Set a chat's default permissions (no `userIdentifier`) or restrict one member
 * (Telethon edit_permissions). `denied` lists the actions to forbid; empty = lift all. Write.
 */
export async function setChatPermissions(
  client: TelegramClient,
  chatIdentifier: string,
  userIdentifier: string | undefined,
  denied: BannedRight[],
  untilDate = 0
): Promise<PermissionChange> {
  const entity = await resolveChat(client, chatIdentifier);
  const rights = buildBannedRights(denied, untilDate);

  if (!userIdentifier) {
    if (!(entity instanceof Api.Channel || entity instanceof Api.Chat)) {
      throw new Error("Default permissions apply to groups and channels.");
    }
    await client.invoke(
      new Api.messages.EditChatDefaultBannedRights({
        peer: entity,
        bannedRights: rights,
      })
    );
    return {
      chatTitle: getChatTitle(entity),
      target: "default",
      denied,
      until: untilDate ? new Date(untilDate * 1000).toISOString() : undefined,
    };
  }

  if (!(entity instanceof Api.Channel)) {
    throw new Error(
      "Per-user restrictions need a supergroup or channel (basic groups only support kicking)."
    );
  }
  const user = await resolveChat(client, userIdentifier);
  await client.invoke(
    new Api.channels.EditBanned({
      channel: entity,
      participant: user,
      bannedRights: rights,
    })
  );
  return {
    chatTitle: getChatTitle(entity),
    target: getChatTitle(user),
    denied,
    until: untilDate ? new Date(untilDate * 1000).toISOString() : undefined,
  };
}

export const permissionPresets = { MUTE_RIGHTS };

async function forumChannel(
  client: TelegramClient,
  chatIdentifier: string
): Promise<ResolvedEntity> {
  const entity = await resolveChat(client, chatIdentifier);
  if (!hasTopics(entity)) {
    throw new CliError(
      `"${getChatTitle(entity)}" is not a forum (enable Topics in the group first).`,
      "not_a_forum",
      EXIT.USAGE
    );
  }
  return entity;
}

export async function createForumTopic(
  client: TelegramClient,
  chatIdentifier: string,
  title: string,
  options: { iconColor?: number; iconEmojiId?: string } = {}
): Promise<{ chatTitle: string; title: string }> {
  const entity = await forumChannel(client, chatIdentifier);
  await client.invoke(
    new Api.messages.CreateForumTopic({
      peer: entity,
      title,
      iconColor: options.iconColor,
      iconEmojiId: options.iconEmojiId
        ? bigInt(options.iconEmojiId)
        : undefined,
      randomId: generateRandomLong(),
    })
  );
  return { chatTitle: getChatTitle(entity), title };
}

export async function editForumTopic(
  client: TelegramClient,
  chatIdentifier: string,
  topicId: number,
  changes: {
    title?: string;
    iconEmojiId?: string;
    closed?: boolean;
    hidden?: boolean;
  }
): Promise<{ chatTitle: string; topicId: number }> {
  const entity = await forumChannel(client, chatIdentifier);
  await client.invoke(
    new Api.messages.EditForumTopic({
      peer: entity,
      topicId,
      title: changes.title,
      iconEmojiId: changes.iconEmojiId
        ? bigInt(changes.iconEmojiId)
        : undefined,
      closed: changes.closed,
      hidden: changes.hidden,
    })
  );
  return { chatTitle: getChatTitle(entity), topicId };
}

export async function pinForumTopic(
  client: TelegramClient,
  chatIdentifier: string,
  topicId: number,
  pinned: boolean
): Promise<{ chatTitle: string; topicId: number }> {
  const entity = await forumChannel(client, chatIdentifier);
  await client.invoke(
    new Api.messages.UpdatePinnedForumTopic({ peer: entity, topicId, pinned })
  );
  return { chatTitle: getChatTitle(entity), topicId };
}
