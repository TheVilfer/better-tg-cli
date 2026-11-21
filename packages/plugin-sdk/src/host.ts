/** A value that crosses the sandbox boundary: plain JSON only (the host parses everything itself). */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/** A chat as the host takes it: a numeric ID (as a string or a number) or an `@username`, never a title. */
export type ChatRef = string | number;

/** The chat types `host.messages.mine` walks: people (not bots) and groups or supergroups. */
export type MineType = "private" | "group";

/** The chat types `host.chats.list` filters by. */
export type ChatType = "user" | "bot" | "group" | "supergroup" | "channel";

/**
 * One message as the read APIs return it: a narrow shape the host builds, never Telegram's own object.
 *
 * - `date`: ISO 8601 time.
 * - `out`: Written by the owner.
 * - `text`: Masked before the sandbox sees it (codes, gift links; service messages fully).
 * - `service`: From 777000/489000, a forward or saved copy of one, or a reply quoting one.
 */
export interface Message {
  id: number;
  date: string;
  out: boolean;
  senderId?: string;
  text: string;
  forwarded?: true;
  service?: true;
  replyToMsgId?: number;
}

/** A page of history (`messages.read`, `target.thread`): pass `before` for the next one; `null` at the start of the history. */
export interface HistoryPage {
  chatId: string;
  messages: Message[];
  before: number | null;
}

/** One of the owner's own messages (`messages.mine`): its text, time and chat type, no other participant. */
export interface OwnMessage {
  text: string;
  date: string;
  chatType: MineType;
}

/**
 * A page of `messages.mine`. `cursor` is an opaque id the host keeps the walk behind (24 hours, the
 * latest 64 per installation; in `plugin dev` and the test host it lives in memory for one run).
 * The last page has `done: true` and `cursor: null`.
 */
export interface MinePage {
  messages: OwnMessage[];
  count: number;
  cursor: string | null;
  done: boolean;
}

/**
 * - `limit`: 1 to 2000, default 100; a page is also capped by size (about 40,000 characters) and by 20 Telegram requests.
 * - `types`: Default `["private"]`.
 * - `since`: An ISO date or Unix seconds.
 * - `cursor`: The `cursor` of the previous page.
 */
export interface MineOptions {
  limit?: number;
  types?: MineType[];
  since?: string | number;
  cursor?: string;
}

/**
 * - `limit`: 1 to 100, default 20.
 * - `topic`: A forum topic; not together with `thread`.
 * - `thread`: A comment or reply thread by its root message; not together with `topic`.
 */
export interface ReadOptions {
  limit?: number;
  before?: number;
  topic?: number;
  thread?: number;
}

/**
 * - `chat`: One chat; without it the search is global.
 * - `limit`: 1 to 100, default 20.
 */
export interface SearchOptions {
  chat?: ChatRef;
  topic?: number;
  limit?: number;
}

/** - `limit`: 1 to 500, default 100. */
export interface ChatListOptions {
  limit?: number;
  types?: ChatType[];
  unreadOnly?: boolean;
}

/** A chat of `host.chats.list`: no previews. */
export interface ChatSummary {
  id: string;
  title: string;
  type: ChatType;
  muted: boolean;
  unreadCount: number;
}

/** A saved key of `host.storage.list`. */
export interface StorageItem {
  key: string;
  bytes: number;
  updatedAt: string;
}

/** What `host.storage.set` reports: the value's size and the installation's use of its quota. */
export interface StorageWrite {
  bytes: number;
  usedBytes: number;
  quotaBytes: number;
}

/** The methods `host.http.fetch` sends. */
export type HttpMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS";

/** `host.http.fetch` options: a body (`body` or `bodyBase64`) only with POST, PUT, PATCH or DELETE. */
export interface FetchOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  bodyBase64?: string;
  responseType?: "text" | "base64";
}

/** A response: `body` when it is valid UTF-8 (and `responseType` is not `base64`), otherwise `bodyBase64`. */
export interface FetchResponse {
  status: number;
  headers: Record<string, string>;
  body?: string;
  bodyBase64?: string;
}

/** A typed proposal: the host checks it and builds the command the agent runs through the write guard. */
export type Action =
  | { type: "send"; chat: ChatRef; text: string; topic?: number }
  | {
      type: "reply";
      chat: ChatRef;
      msgId: number;
      text: string;
      topic?: number;
    }
  | { type: "react"; chat: ChatRef; msgId: number; emoji: string };

/** A proposal as the host prints it in the envelope (`react` has no `stdin`). */
export interface Proposal {
  id: string;
  type: "send" | "reply" | "react";
  summary: string;
  argv: string[];
  stdin?: string;
  confirm: true;
}

/**
 * An error a host call throws inside the sandbox: an `Error` with a `code` and, for some codes, more
 * fields (`flood_wait`: `retryAfterSeconds`, `cursor`, `partial`; `secret_missing`: `command`).
 */
export interface HostError extends Error {
  code: string;
  retryAfterSeconds?: number;
  cursor?: string | null;
  partial?: { messages: OwnMessage[]; count: number } | null;
  command?: string[];
}

/**
 * - `mine`: `messages:read-own`: only messages the owner wrote.
 * - `read`, `search`: `messages:read`: other people's messages too.
 */
export interface MessagesApi {
  mine?: (options?: MineOptions) => Promise<MinePage>;
  read?: (chat: ChatRef, options?: ReadOptions) => Promise<HistoryPage>;
  search?: (
    query: string,
    options?: SearchOptions
  ) => Promise<{ messages: (Message & { chatId: string })[] }>;
}

/** `chats:read`. */
export interface ChatsApi {
  list?: (options?: ChatListOptions) => Promise<{ chats: ChatSummary[] }>;
}

/**
 * `messages:read-target`: only what the agent passed to this run.
 *
 * - `message`: The message of `--target <chat>:<msgId>`.
 * - `thread`: The thread of `--target <chat>:<msgId> --thread`, or the topic of `--target <chat>@<topic>`.
 */
export interface TargetApi {
  message?: () => Promise<{ chatId: string; message: Message }>;
  thread?: (options?: {
    limit?: number;
    before?: number;
  }) => Promise<HistoryPage>;
}

/**
 * - `get`, `list`: `storage:read`; `get` gives a declared key's value or `null`.
 * - `set`, `delete`: `storage:write` and the effect `storage`; values are strings (JSON.stringify an object first).
 */
export interface StorageApi {
  get?: (key: string) => Promise<string | null>;
  list?: () => Promise<{ items: StorageItem[] }>;
  set?: (key: string, value: string) => Promise<StorageWrite>;
  delete?: (key: string) => Promise<{ deleted: boolean }>;
}

/** `settings:read`: `get` gives the stored value, else the setting's default, else `null`. */
export interface SettingsApi {
  get?: (key: string) => Promise<string | number | boolean | null>;
}

/** `network` and the effect `network`: only to the manifest's origins; the host adds the secrets. */
export interface HttpApi {
  fetch?: (url: string, options?: FetchOptions) => Promise<FetchResponse>;
}

/** `actions` and the effect `actions`: at most 20 proposals per run. */
export interface ActionsApi {
  propose?: (action: Action) => Promise<{ id: string }>;
}

/**
 * The `host` a command gets. Only what its manifest's permissions and its own effects grant exists:
 * an API that is not granted is missing, so check it before calling (`host.http?.fetch`). Every
 * call but `now` and `random` returns a Promise and counts against the run's host-call limits.
 *
 * - `now`: The time in ms since the epoch.
 * - `input`: The checked input, deeply frozen.
 * - `me`: `identity:read`: the owner's ID and name.
 * - `log`: `plugin dev` and the SDK's test host only: a line to the dev log, never to the output.
 */
export interface Host {
  now(): number;
  random(): number;
  readonly input: Json;
  me?: () => Promise<{ id: string; name: string; username?: string }>;
  messages?: MessagesApi;
  chats?: ChatsApi;
  target?: TargetApi;
  storage?: StorageApi;
  settings?: SettingsApi;
  http?: HttpApi;
  actions?: ActionsApi;
  log?: (...args: unknown[]) => Promise<null>;
}

/** One command: gets the checked input and `host`, returns a JSON value the host checks with the `output` schema. */
export type Command<I = Json, O = unknown> = (
  input: I,
  host: Host
) => O | Promise<O>;
