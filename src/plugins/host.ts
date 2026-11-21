import { createHash } from "node:crypto";

import bigInt from "big-integer";
import { Api, utils } from "teleproto";
import type { TelegramClient } from "teleproto";

import {
  CHAT_TYPES,
  getDialogs,
  hasTopics,
  isServiceSource,
  matchesChatType,
  plainMessageText,
  resolveChat,
} from "../client.js";
import type { ResolvedEntity } from "../client.js";
import { errorDetails } from "../errors.js";
import { maskForModel } from "../mcp-output.js";
import {
  checkRequest,
  injectMatches,
  pathProblem,
  requestDeadline,
  secretForms,
  shapeResponse,
  withTimeout,
} from "./http.js";
import type { Backend } from "./http.js";
import type { Manifest, Permission, PluginCommand } from "./manifest.js";
import { buildProposal } from "./proposals.js";
import type { Proposal } from "./proposals.js";
import { HostError } from "./sandbox-types.js";
import type { HostFunction } from "./sandbox-types.js";

/** Serialized characters a page of messages may take (spec: about 40 000). */
export const PAGE_CHARS = 40_000;
const MINE_REQUESTS = 20;
const MINE_CHATS = 100;
const MINE_MAX = 2000;
const READ_MAX = 100;
const SERVICE_IDS = new Set(["777000", "489000"]);
/** Message, topic and thread IDs are positive 32-bit integers. */
export const MAX_MESSAGE_ID = 2_147_483_647;
export const isMessageId = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= MAX_MESSAGE_ID;

/**
 * What a storage write must still hold when it changes the file: the run's absolute deadline and
 * its cancellation (see WriteGuard in store.ts).
 */
export interface WriteGuard {
  deadline: number;
  aborted: () => boolean;
}

/**
 * Where the plugin's data lives: the installation's store, or memory in `plugin dev`.
 *
 * - `set`: Waits for the store's lock within `guard` and checks it again right before the file changes.
 */
export interface StorageBackend {
  get(key: string): string | undefined;
  list(): { key: string; bytes: number; updatedAt: string }[];
  set(
    key: string,
    value: string,
    guard: WriteGuard
  ): Promise<{ bytes: number; usedBytes: number; quotaBytes: number }>;
  delete(key: string, guard: WriteGuard): Promise<boolean>;
}

/**
 * The host's walk state behind `messages.mine` cursors: kept by the host (a private folder of the
 * installation, or memory in `plugin dev`), never by the plugin; the plugin holds only a random id.
 *
 * - `save`: Keeps `state` and returns a fresh random id for it.
 * - `load`: The state behind an id; undefined when unknown, expired, or another installation's.
 */
export interface CursorStore {
  save(state: unknown): string;
  load(id: string): unknown;
}

/** `--target`: one message (`chat:msgId`), or a thread (`chat:msgId --thread`) or topic (`chat@topic`). */
export interface Target {
  chat: string;
  msgId?: number;
  topic?: number;
  thread: boolean;
}

/**
 * - `account`: The owner's Telegram user ID (data and cursors are bound to it); fetched on first use, inside the run.
 * - `storage`: The data of this installation and account, opened on first use (it needs the account).
 * - `installId`: The installation cursors are bound to (`plugin dev`: a fixed name; its cursors live in memory).
 * - `deadline`: The run's absolute deadline (ms since the epoch): storage writes hold to it.
 * - `cancelled`: The MCP server's shared cancel flag, readable while the thread is busy.
 * - `maskProposals`: Proposal texts masked at `echo` before the host builds the command (over MCP).
 * - `log`: `plugin dev` only: host.log appends here, never to the command's output.
 * - `network`: What `http.fetch` uses (a command with the `network` effect): the backend and the secrets.
 * - `settings`: The values `plugin settings set` stored (missing: the manifest default).
 */
export interface HostContext {
  manifest: Manifest;
  command: PluginCommand;
  client: () => Promise<TelegramClient>;
  account: () => Promise<string>;
  storage: () => Promise<StorageBackend>;
  cursors: CursorStore;
  installId: string;
  deadline: number;
  cancelled?: () => boolean;
  target?: Target;
  maskProposals: boolean;
  log?: (line: string) => void;
  network?: NetworkContext;
  settings?: () => Record<string, unknown>;
}

/**
 * - `backend`: The network itself, or fixtures (`plugin dev --mock`, TG_MOCK).
 * - `secret`: The value of a declared secret, or null when the human has not set it. Never handed to the plugin. Read asynchronously: `signal` aborts when the request ends (its deadline, the run's end).
 * - `setCommand`: The command a human runs to set a secret (argv after `telegram`).
 */
export interface NetworkContext {
  backend: Backend;
  secret(
    name: string,
    signal: AbortSignal
  ): string | null | Promise<string | null>;
  setCommand(name: string): string[];
}

/**
 * - `flood`: The last flood_wait a host call reported, as the host built it (never the guest's copy).
 * - `requests`: `http.fetch` for the audit: requests made and the origins they went to (never URLs, bodies or secrets).
 * - `secretMissing`: The last secret a request needed and did not find, as the host recorded it.
 */
export interface HostState {
  proposals: Proposal[];
  flood?: {
    retryAfterSeconds: number;
    cursor: string | null;
    partial: unknown;
  };
  requests?: number;
  origins?: string[];
  secretMissing?: { name: string; command: string[] };
}

const invalid = (message: string) => new HostError("invalid_argument", message);
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const opts = (v: unknown, what: string): Record<string, unknown> => {
  if (v === undefined || v === null) {
    return {};
  }
  if (!isObject(v)) {
    throw invalid(`${what}: options must be an object`);
  }
  return v;
};
const int = (
  v: unknown,
  what: string,
  min: number,
  max: number,
  fallback?: number
): number => {
  if (v === undefined || v === null) {
    if (fallback === undefined) {
      throw invalid(`${what} is required`);
    }
    return fallback;
  }
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw invalid(`${what} must be an integer from ${min} to ${max}`);
  }
  return v;
};
const optInt = (
  v: unknown,
  what: string,
  min: number,
  max: number
): number | undefined =>
  v === undefined || v === null ? undefined : int(v, what, min, max);
const str = (v: unknown, what: string, max = 4096): string => {
  if (typeof v !== "string" || !v || v.length > max) {
    throw invalid(
      `${what} must be a non-empty string of at most ${max} characters`
    );
  }
  return v;
};

const CHAT_REF = /^(-?\d{1,20}|@[A-Za-z0-9_]{3,64})$/;
function chatRef(v: unknown, what = "chat"): string {
  if (typeof v === "number" && Number.isSafeInteger(v)) {
    return String(v);
  }
  if (typeof v !== "string" || !CHAT_REF.test(v)) {
    throw invalid(`${what} must be a chat ID or an @username`);
  }
  return v;
}

function floodSeconds(e: unknown): number | undefined {
  try {
    const d = errorDetails(e);
    return d.code === "flood_wait" ? (d.retryAfterSeconds ?? 0) : undefined;
  } catch {
    return undefined;
  }
}

function hostFailure(e: unknown): HostError {
  if (e instanceof HostError) {
    return e;
  }
  const d = errorDetails(e);
  return new HostError(
    d.code,
    d.message,
    d.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: d.retryAfterSeconds }
  );
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
const serviceUser = (entity: ResolvedEntity) =>
  entity instanceof Api.User && SERVICE_IDS.has(entity.id.toString());

function readMessage(msg: Api.Message) {
  const service = isServiceSource(msg);
  const from =
    msg.fromId instanceof Api.PeerUser
      ? msg.fromId.userId.toString()
      : msg.peerId instanceof Api.PeerUser && !msg.out
        ? msg.peerId.userId.toString()
        : undefined;
  return {
    id: msg.id,
    date: iso(msg.date),
    out: !!msg.out,
    ...(from ? { senderId: from } : {}),
    text: maskForModel(plainMessageText(msg), service ? "service" : "echo"),
    ...(msg.fwdFrom ? { forwarded: true } : {}),
    ...(service ? { service: true } : {}),
    ...(msg.replyTo?.replyToMsgId
      ? { replyToMsgId: msg.replyTo.replyToMsgId }
      : {}),
  };
}

function bounded<T>(items: T[]): T[] {
  let size = 2;
  const out: T[] = [];
  for (const item of items) {
    const n = JSON.stringify(item).length + 1;
    if (out.length && size + n > PAGE_CHARS) {
      break;
    }
    size += n;
    out.push(item);
  }
  return out;
}

type MineType = "private" | "group";
const MINE_TYPES: readonly MineType[] = ["private", "group"];

interface MineCursor {
  a: string;
  n: string;
  t: MineType[];
  s: number;
  c: string[];
  i: number;
  o: number;
}

const accountTag = (userId: string) =>
  createHash("sha256")
    .update(`tg-plugin-cursor:${userId}`)
    .digest("base64url")
    .slice(0, 12);

const badCursor = (message: string) => new HostError("invalid_cursor", message);

function loadCursor(ctx: HostContext, id: string, account: string): MineCursor {
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) {
    throw badCursor("cursor is not one this host returned");
  }
  const raw = ctx.cursors.load(id);
  if (!isObject(raw)) {
    throw badCursor(
      "cursor is unknown or expired (cursors last 24 hours); start again without one"
    );
  }
  const { a, n, t, s, c, i, o } = raw;
  if (n !== ctx.installId) {
    throw badCursor("cursor belongs to another installation");
  }
  if (a !== accountTag(account)) {
    throw badCursor("cursor belongs to another account");
  }
  if (
    !Array.isArray(t) ||
    !t.length ||
    !t.every((x) => MINE_TYPES.includes(x as MineType))
  ) {
    throw badCursor("cursor is damaged");
  }
  if (
    !Array.isArray(c) ||
    c.length > MINE_CHATS ||
    !c.every((x) => typeof x === "string" && /^-?\d{1,20}$/.test(x))
  ) {
    throw badCursor("cursor is damaged");
  }
  if (typeof s !== "number" || !Number.isInteger(s) || s < 0) {
    throw badCursor("cursor is damaged");
  }
  if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i > c.length) {
    throw badCursor("cursor is damaged");
  }
  if (typeof o !== "number" || !Number.isInteger(o) || o < 0) {
    throw badCursor("cursor is damaged");
  }
  return { a, n, t: t as MineType[], s, c: c as string[], i, o };
}

function mineType(entity: ResolvedEntity): MineType | undefined {
  if (entity instanceof Api.User) {
    return entity.bot || serviceUser(entity) ? undefined : "private";
  }
  if (entity instanceof Api.Chat) {
    return "group";
  }
  if (entity instanceof Api.Channel) {
    return entity.megagroup ? "group" : undefined;
  }
  return undefined;
}

function sinceSeconds(v: unknown): number {
  if (v === undefined || v === null) {
    return 0;
  }
  const ms =
    typeof v === "number"
      ? v * 1000
      : typeof v === "string"
        ? Date.parse(v)
        : Number.NaN;
  if (!Number.isFinite(ms) || ms < 0) {
    throw invalid("since must be an ISO date or Unix seconds");
  }
  return Math.floor(ms / 1000);
}

/** The host functions a command gets: its manifest's permissions and its effects together. */
export function grantedApi(
  ctx: HostContext,
  state: HostState
): Record<string, HostFunction> {
  const perms = new Set<Permission>(ctx.manifest.permissions);
  const effects = new Set(ctx.command.effects);
  const api: Record<string, HostFunction> = Object.create(null) as Record<
    string,
    HostFunction
  >;
  const tg = <T>(fn: () => Promise<T>) =>
    fn().catch((error: unknown) => {
      const wait = floodSeconds(error);
      if (wait !== undefined) {
        state.flood = { retryAfterSeconds: wait, cursor: null, partial: null };
        throw new HostError(
          "flood_wait",
          `Telegram rate limit: retry after ${wait} s`,
          { retryAfterSeconds: wait, cursor: null, partial: null }
        );
      }
      throw hostFailure(error);
    });

  if (perms.has("identity:read")) {
    api.me = () =>
      tg(async () => {
        const me = await (await ctx.client()).getMe();
        if (!(me instanceof Api.User)) {
          throw new HostError("error", "Telegram did not return the account");
        }
        const name = [me.firstName, me.lastName].filter(Boolean).join(" ");
        return {
          id: me.id.toString(),
          name: maskForModel(name, "echo"),
          ...(me.username ? { username: me.username } : {}),
        };
      });
  }

  if (perms.has("messages:read-own")) {
    api["messages.mine"] = ([o], signal) =>
      mine(ctx, state, opts(o, "messages.mine"), signal);
  }

  if (perms.has("chats:read")) {
    api["chats.list"] = ([o]) =>
      tg(async () => {
        const p = opts(o, "chats.list");
        const limit = int(p.limit, "limit", 1, 500, 100);
        const types = p.types === undefined ? undefined : p.types;
        if (
          types !== undefined &&
          (!Array.isArray(types) ||
            !types.every((t) => (CHAT_TYPES as readonly unknown[]).includes(t)))
        ) {
          throw invalid(`types must be a list of ${CHAT_TYPES.join(", ")}`);
        }
        const unreadOnly = p.unreadOnly === true;
        const chats = await getDialogs(await ctx.client(), limit);
        const list = chats
          .filter(
            (c) =>
              !types || (types as string[]).some((t) => matchesChatType(c, t))
          )
          .filter((c) => !unreadOnly || c.unreadCount > 0)
          .map((c) => ({
            id: c.id,
            title: maskForModel(c.title, "echo"),
            type: c.bot ? "bot" : c.type,
            muted: !!c.muted,
            unreadCount: c.unreadCount,
          }));
        return { chats: bounded(list) };
      });
  }

  if (perms.has("messages:read")) {
    api["messages.read"] = ([chat, o]) =>
      tg(async () => {
        const p = opts(o, "messages.read");
        const limit = int(p.limit, "limit", 1, READ_MAX, 20);
        const before = optInt(p.before, "before", 1, MAX_MESSAGE_ID);
        const topic = optInt(p.topic, "topic", 1, MAX_MESSAGE_ID);
        const thread = optInt(p.thread, "thread", 1, MAX_MESSAGE_ID);
        if (topic !== undefined && thread !== undefined) {
          throw invalid("pass topic or thread, not both");
        }
        const mode: HistoryMode =
          topic === undefined
            ? thread === undefined
              ? { kind: "chat" }
              : { kind: "thread", root: thread }
            : { kind: "topic", root: topic };
        return history(await ctx.client(), chatRef(chat), mode, {
          limit,
          before,
        });
      });
    api["messages.search"] = ([query, o]) =>
      tg(async () => {
        const q = str(query, "query", 256);
        const p = opts(o, "messages.search");
        const limit = int(p.limit, "limit", 1, READ_MAX, 20);
        const topic = optInt(p.topic, "topic", 1, MAX_MESSAGE_ID);
        const client = await ctx.client();
        if (p.chat === undefined || p.chat === null) {
          if (topic !== undefined) {
            throw invalid("topic needs chat");
          }
          const res = await client.invoke(
            new Api.messages.SearchGlobal({
              q,
              filter: new Api.InputMessagesFilterEmpty(),
              minDate: 0,
              maxDate: 0,
              offsetRate: 0,
              offsetPeer: new Api.InputPeerEmpty(),
              offsetId: 0,
              limit,
            })
          );
          const msgs =
            "messages" in res
              ? res.messages.filter(
                  (m): m is Api.Message => m instanceof Api.Message
                )
              : [];
          return {
            messages: bounded(
              msgs.map((m) => ({
                chatId: utils.getPeerId(m.peerId).toString(),
                ...readMessage(m),
              }))
            ),
          };
        }
        const entity = await resolveChat(client, chatRef(p.chat));
        if (topic !== undefined && !hasTopics(entity)) {
          throw invalid("this chat has no topics");
        }
        const res = await client.invoke(
          new Api.messages.Search({
            peer: entity,
            q,
            filter: new Api.InputMessagesFilterEmpty(),
            minDate: 0,
            maxDate: 0,
            offsetId: 0,
            addOffset: 0,
            limit,
            maxId: 0,
            minId: 0,
            hash: bigInt(0),
            ...(topic === undefined ? {} : { topMsgId: topic }),
          })
        );
        const chatId = utils.getPeerId(entity).toString();
        const msgs =
          "messages" in res
            ? res.messages.filter(
                (m): m is Api.Message => m instanceof Api.Message
              )
            : [];
        return {
          messages: bounded(msgs.map((m) => ({ chatId, ...readMessage(m) }))),
        };
      });
  }

  if (perms.has("messages:read-target")) {
    const { target } = ctx;
    const noTarget = () =>
      new HostError(
        "no_target",
        "This run has no --target; the agent passes one with the command"
      );
    const badTarget = () =>
      new HostError(
        "invalid_argument",
        `The target's message, topic or thread ID is not from 1 to ${MAX_MESSAGE_ID}`
      );
    api["target.message"] = () =>
      tg(async () => {
        if (!target) {
          throw noTarget();
        }
        if (target.msgId === undefined || target.thread) {
          throw new HostError(
            "not_available",
            "The target is a thread or topic: use host.target.thread()"
          );
        }
        if (!isMessageId(target.msgId)) {
          throw badTarget();
        }
        const client = await ctx.client();
        const entity = await resolveChat(client, target.chat);
        const [msg] = await client.getMessages(entity, { ids: [target.msgId] });
        if (!(msg instanceof Api.Message)) {
          throw new HostError(
            "not_found",
            `Message ${target.msgId} was not found in the target chat`
          );
        }
        return {
          chatId: utils.getPeerId(entity).toString(),
          message: readMessage(msg),
        };
      });
    api["target.thread"] = ([o]) =>
      tg(async () => {
        if (!target) {
          throw noTarget();
        }
        if (!target.thread && target.topic === undefined) {
          throw new HostError(
            "not_available",
            "The target is one message: use host.target.message()"
          );
        }
        const p = opts(o, "target.thread");
        const limit = int(p.limit, "limit", 1, READ_MAX, 20);
        const before = optInt(p.before, "before", 1, MAX_MESSAGE_ID);
        const mode: HistoryMode | undefined =
          target.topic === undefined
            ? isMessageId(target.msgId)
              ? { kind: "thread", root: target.msgId }
              : undefined
            : isMessageId(target.topic)
              ? { kind: "topic", root: target.topic }
              : undefined;
        if (!mode) {
          throw badTarget();
        }
        return history(await ctx.client(), target.chat, mode, {
          limit,
          before,
        });
      });
  }

  if (perms.has("storage:read")) {
    api["storage.get"] = async ([key]) => {
      const k = storageKey(ctx, key);
      const v = (await ctx.storage()).get(k);
      return v === undefined ? null : v;
    };
    api["storage.list"] = async () => ({ items: (await ctx.storage()).list() });
  }
  if (perms.has("storage:write") && effects.has("storage")) {
    const guard = (signal: AbortSignal): WriteGuard => ({
      deadline: ctx.deadline,
      aborted: () => signal.aborted || !!ctx.cancelled?.(),
    });
    const ended = (g: WriteGuard) => {
      if (g.aborted() || Date.now() >= g.deadline) {
        throw new HostError("cancelled", "The run ended; nothing was written");
      }
    };
    api["storage.set"] = async ([key, value], signal) => {
      const k = storageKey(ctx, key);
      if (typeof value !== "string") {
        throw invalid(
          "storage.set takes a string value (JSON.stringify an object first)"
        );
      }
      if (!value) {
        throw invalid("the value is empty; use storage.delete");
      }
      const g = guard(signal);
      ended(g);
      const store = await ctx.storage();
      ended(g);
      return store.set(k, value, g);
    };
    api["storage.delete"] = async ([key], signal) => {
      const k = storageKey(ctx, key);
      const g = guard(signal);
      ended(g);
      const store = await ctx.storage();
      ended(g);
      return { deleted: await store.delete(k, g) };
    };
  }

  if (perms.has("settings:read")) {
    api["settings.get"] = ([key]) => {
      if (
        typeof key !== "string" ||
        !Object.hasOwn(ctx.manifest.settings ?? {}, key)
      ) {
        throw invalid(
          `settings.get: "${String(key)}" is not a setting this plugin declares`
        );
      }
      const stored = ctx.settings?.();
      if (stored && Object.hasOwn(stored, key)) {
        return stored[key];
      }
      const d = ctx.manifest.settings![key].default;
      return d === undefined ? null : d;
    };
  }

  if (perms.has("network") && effects.has("network") && ctx.network) {
    const net = ctx.network;
    const used: string[] = [];
    api["http.fetch"] = async ([url, o], signal) => {
      const until = requestDeadline(ctx.deadline);
      const req = checkRequest(ctx.manifest, url, o);
      const matching = (ctx.manifest.secrets ?? []).filter((s) =>
        injectMatches(s.inject, req.url)
      );
      if (matching.some((s) => s.inject.paths !== undefined)) {
        const why = pathProblem(req.rawPath) ?? pathProblem(req.url.pathname);
        if (why) {
          throw new HostError(
            "ambiguous_path",
            `The path holds ${why}, which a server may read as another path; a secret of this origin is sent only to some paths, so the request was not sent`
          );
        }
      }
      const ac = new AbortController();
      const stop = () => ac.abort();
      signal.addEventListener("abort", stop, { once: true });
      const timer = setTimeout(stop, Math.max(0, until - Date.now()));
      try {
        const inject: [string, string][] = [];
        for (const s of matching) {
          let value: string | null;
          try {
            value = await withTimeout(
              Promise.resolve().then(() => net.secret(s.name, ac.signal)),
              signal,
              until
            );
          } catch (error) {
            if (error instanceof HostError) {
              throw error;
            }
            throw new HostError(
              "secret_store_unavailable",
              `The secret "${s.name}" could not be read: ${(error as Error).message}`
            );
          }
          if (value === null) {
            const command = net.setCommand(s.name);
            state.secretMissing = { name: s.name, command };
            throw new HostError(
              "secret_missing",
              `The secret "${s.name}" is not set. Ask the user to run in their own terminal: telegram ${command.join(" ")}`,
              { secret: s.name, command }
            );
          }
          const formatted = s.inject.format.split("{value}").join(value);
          inject.push([s.inject.header, formatted]);
          used.push(value, formatted);
        }
        state.requests = (state.requests ?? 0) + 1;
        state.origins = [
          ...new Set([...(state.origins ?? []), req.url.origin]),
        ];
        if (signal.aborted) {
          throw new HostError("cancelled", "The run ended");
        }
        if (Date.now() >= until) {
          throw new HostError("timeout", "The request took too long");
        }
        const raw = await net.backend({ ...req, inject }, signal, until);
        if (inject.length && raw.status === 206) {
          throw new HostError(
            "bad_response",
            "A partial response (206) to a request that carried a secret is not handed in"
          );
        }
        return shapeResponse(raw, secretForms(used), req.responseType);
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", stop);
      }
    };
  }

  if (perms.has("actions") && effects.has("actions")) {
    api["actions.propose"] = ([action]) => {
      if (state.proposals.length >= 20) {
        throw new HostError("plugin_limit", "At most 20 proposals in one run", {
          limit: "proposals",
        });
      }
      const proposal = buildProposal(
        action,
        state.proposals.length + 1,
        ctx.maskProposals
      );
      state.proposals.push(proposal);
      return { id: proposal.id };
    };
  }

  if (ctx.log) {
    const { log } = ctx;
    api.log = (args) => {
      log(
        args
          .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
          .join(" ")
          .slice(0, 10_000)
      );
      return null;
    };
  }
  return api;
}

function storageKey(ctx: HostContext, key: unknown): string {
  if (
    typeof key !== "string" ||
    !(ctx.manifest.storage?.keys ?? []).includes(key)
  ) {
    throw invalid(
      `"${String(key)}" is not a storage key this plugin declares (${(ctx.manifest.storage?.keys ?? []).join(", ") || "none"})`
    );
  }
  return key;
}

type HistoryMode =
  | { kind: "chat" }
  | { kind: "topic" | "thread"; root: number };

async function history(
  client: TelegramClient,
  chat: string,
  mode: HistoryMode,
  p: { limit: number; before?: number }
) {
  if (mode.kind !== "chat" && !isMessageId(mode.root)) {
    throw invalid(`the ${mode.kind} ID must be from 1 to ${MAX_MESSAGE_ID}`);
  }
  const entity = await resolveChat(client, chat);
  if (mode.kind === "topic" && !hasTopics(entity)) {
    throw invalid("this chat has no topics");
  }
  let raw: Api.TypeMessage[];
  if (mode.kind === "chat") {
    raw = await client.getMessages(entity, {
      limit: p.limit,
      ...(p.before ? { offsetId: p.before } : {}),
    });
  } else {
    const res = await client.invoke(
      new Api.messages.GetReplies({
        peer: entity,
        msgId: mode.root,
        offsetId: p.before ?? 0,
        offsetDate: 0,
        addOffset: 0,
        limit: p.limit,
        maxId: 0,
        minId: 0,
        hash: bigInt(0),
      })
    );
    raw = "messages" in res ? res.messages : [];
  }
  const msgs = raw.filter((m): m is Api.Message => m instanceof Api.Message);
  const page = bounded(msgs.map(readMessage));
  const oldest = page.length ? page[page.length - 1].id : null;
  return {
    chatId: utils.getPeerId(entity).toString(),
    messages: page,
    before: page.length < msgs.length || msgs.length >= p.limit ? oldest : null,
  };
}

const runEnded = () => new HostError("cancelled", "The run ended");

function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    promise.catch(() => {});
    return Promise.reject(runEnded());
  }
  return new Promise<T>((resolve, reject) => {
    const stop = () => reject(runEnded());
    signal.addEventListener("abort", stop, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", stop);
        resolve(v);
      },
      (error) => {
        signal.removeEventListener("abort", stop);
        reject(error);
      }
    );
  });
}

async function mine(
  ctx: HostContext,
  state: HostState,
  p: Record<string, unknown>,
  signal: AbortSignal
) {
  const limit = int(p.limit, "limit", 1, MINE_MAX, 100);
  let requests = 0;
  const rpc = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (signal.aborted) {
      throw runEnded();
    }
    requests++;
    const r = await untilAborted(fn(), signal);
    if (signal.aborted) {
      throw runEnded();
    }
    return r;
  };
  let cur: MineCursor | undefined;
  const messages: { text: string; date: string; chatType: MineType }[] = [];
  let size = 2;
  const cursorOf = (c: MineCursor | undefined) => {
    if (!c || signal.aborted) {
      return null;
    }
    return ctx.cursors.save(c);
  };
  const page = (done: boolean) => {
    if (signal.aborted) {
      throw runEnded();
    }
    return {
      messages,
      count: messages.length,
      cursor: done ? null : cursorOf(cur),
      done,
    };
  };
  try {
    if (
      p.cursor !== undefined &&
      p.cursor !== null &&
      typeof p.cursor !== "string"
    ) {
      throw badCursor("cursor must be a string from a previous page");
    }
    const typesIn =
      p.types === undefined || p.types === null ? ["private"] : p.types;
    if (
      typeof p.cursor !== "string" &&
      (!Array.isArray(typesIn) ||
        !typesIn.length ||
        !typesIn.every((t) => MINE_TYPES.includes(t as MineType)))
    ) {
      throw invalid("types must be a list of private, group");
    }
    const since = typeof p.cursor === "string" ? 0 : sinceSeconds(p.since);
    const account = await rpc(() => ctx.account());
    const client = await ctx.client();
    if (typeof p.cursor === "string") {
      cur = loadCursor(ctx, p.cursor, account);
    } else {
      const types = [...new Set(typesIn as MineType[])];
      const dialogs = await rpc(() => client.getDialogs({ limit: 200 }));
      const chats: string[] = [];
      for (const d of dialogs) {
        const t = d.entity ? mineType(d.entity as ResolvedEntity) : undefined;
        if (t && types.includes(t) && d.id) {
          chats.push(d.id.toString());
        }
        if (chats.length >= MINE_CHATS) {
          break;
        }
      }
      cur = {
        a: accountTag(account),
        n: ctx.installId,
        t: types,
        s: since,
        c: chats,
        i: 0,
        o: 0,
      };
    }
    const me = await rpc(() => client.getMe());
    while (cur.i < cur.c.length && messages.length < limit) {
      if (requests + 2 > MINE_REQUESTS) {
        return page(false);
      }
      const chatId: string = cur.c[cur.i];
      const entity: ResolvedEntity = await rpc(() =>
        resolveChat(client, chatId)
      );
      const type = mineType(entity);
      if (!type || !cur.t.includes(type)) {
        cur = { ...cur, i: cur.i + 1, o: 0 };
        continue;
      }
      const want = Math.min(100, limit - messages.length + 20);
      const offset: number = cur.o;
      const batch: Api.Message[] = await rpc(() =>
        client.getMessages(entity, {
          limit: want,
          fromUser: me,
          ...(offset ? { offsetId: offset } : {}),
        })
      );
      let chatDone = batch.length < want;
      let full = false;
      for (const msg of batch) {
        if (!(msg instanceof Api.Message)) {
          if (msg && typeof (msg as { id?: unknown }).id === "number") {
            cur = { ...cur, o: (msg as { id: number }).id };
          }
          continue;
        }
        if (cur.s && msg.date < cur.s) {
          chatDone = true;
          break;
        }
        if (messages.length >= limit) {
          full = true;
          break;
        }
        const own =
          msg.out ||
          (msg.fromId instanceof Api.PeerUser &&
            msg.fromId.userId.equals(me.id));
        const text = plainMessageText(msg);
        if (own && !msg.fwdFrom && !isServiceSource(msg) && text.trim()) {
          const item = {
            text: maskForModel(text, "echo"),
            date: iso(msg.date),
            chatType: type,
          };
          const n = JSON.stringify(item).length + 1;
          if (messages.length && size + n > PAGE_CHARS) {
            cur = { ...cur, o: msg.id + 1 };
            return page(false);
          }
          size += n;
          messages.push(item);
        }
        cur = { ...cur, o: msg.id };
      }
      if (full) {
        return page(false);
      }
      if (chatDone) {
        cur = { ...cur, i: cur.i + 1, o: 0 };
      }
    }
    return page(cur.i >= cur.c.length);
  } catch (error) {
    const wait = floodSeconds(error);
    if (wait === undefined || signal.aborted) {
      throw hostFailure(error);
    }
    const cursor = cursorOf(cur);
    const partial = { messages, count: messages.length };
    state.flood = { retryAfterSeconds: wait, cursor, partial };
    throw new HostError(
      "flood_wait",
      `Telegram rate limit: retry after ${wait} s`,
      { retryAfterSeconds: wait, cursor, partial }
    );
  }
}
