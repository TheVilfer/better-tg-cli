/**
 * The host API a plugin gets inside the sandbox (docs/plugins.md §5): built per run from what the
 * manifest's permissions and the command's effects grant together, so a command with `effects: []`
 * never gets a write (`storage.set`, `actions.propose`) even when the plugin holds the permission.
 *
 * Every read API hands the sandbox a narrow shape built from the raw `Api.Message` (no buttons,
 * entities, quotes or previews) with its text masked before it gets there, in a terminal as over
 * MCP: a message of a login-code service account (777000, 489000), a forward of one or a quote of
 * one at the level `service`, everything else at `echo`. `messages.mine` drops those outright.
 *
 * Values from the guest arrive as parsed JSON: every field is read by name with a type check, a
 * cursor is decoded strictly and every filter is applied again whatever it says.
 */
import { createHash } from 'node:crypto';
import { Api, utils, type TelegramClient } from 'teleproto';
import bigInt from 'big-integer';
import { CHAT_TYPES, getDialogs, hasTopics, isServiceSource, matchesChatType, plainMessageText, resolveChat, type ResolvedEntity } from '../client.js';
import { errorDetails } from '../errors.js';
import { maskForModel } from '../mcp-output.js';
import { HostError, type HostFunction } from './sandbox-types.js';
import type { Manifest, Permission, PluginCommand } from './manifest.js';
import { buildProposal, type Proposal } from './proposals.js';

/** Serialized characters a page of messages may take (spec: about 40 000). */
export const PAGE_CHARS = 40_000;
/** Telegram requests one `messages.mine` call may make before it returns what it has. */
const MINE_REQUESTS = 20;
/** Chats `messages.mine` walks, newest activity first. */
const MINE_CHATS = 100;
const MINE_MAX = 2000;
const READ_MAX = 100;
const SERVICE_IDS = new Set(['777000', '489000']);

/** Where the plugin's data lives: the installation's store, or memory in `plugin dev`. */
export interface StorageBackend {
  get(key: string): string | undefined;
  list(): { key: string; bytes: number; updatedAt: string }[];
  set(key: string, value: string): { bytes: number; usedBytes: number; quotaBytes: number };
  delete(key: string): boolean;
}

/** `--target`: one message (`chat:msgId`), or a thread (`chat:msgId --thread`) or topic (`chat@topic`). */
export interface Target {
  chat: string;
  msgId?: number;
  topic?: number;
  thread: boolean;
}

export interface HostContext {
  manifest: Manifest;
  command: PluginCommand;
  client: () => Promise<TelegramClient>;
  /** The owner's Telegram user ID (data and cursors are bound to it). */
  account: () => Promise<string>;
  storage: () => StorageBackend;
  target?: Target;
  /** Proposal texts masked at `echo` before the host builds the command (over MCP). */
  maskProposals: boolean;
  /** `plugin dev` only: host.log appends here, never to the command's output. */
  log?: (line: string) => void;
}

export interface HostState {
  proposals: Proposal[];
  /** The last flood_wait a host call reported, as the host built it (never the guest's copy). */
  flood?: { retryAfterSeconds: number; cursor: string | null; partial: unknown };
}

const invalid = (message: string) => new HostError('invalid_argument', message);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const opts = (v: unknown, what: string): Record<string, unknown> => {
  if (v === undefined || v === null) return {};
  if (!isObject(v)) throw invalid(`${what}: options must be an object`);
  return v;
};
const int = (v: unknown, what: string, min: number, max: number, fallback?: number): number => {
  if (v === undefined || v === null) {
    if (fallback === undefined) throw invalid(`${what} is required`);
    return fallback;
  }
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw invalid(`${what} must be an integer from ${min} to ${max}`);
  return v;
};
const optInt = (v: unknown, what: string, min: number, max: number): number | undefined =>
  v === undefined || v === null ? undefined : int(v, what, min, max);
const str = (v: unknown, what: string, max = 4096): string => {
  if (typeof v !== 'string' || !v || v.length > max) throw invalid(`${what} must be a non-empty string of at most ${max} characters`);
  return v;
};

/** A chat as a plugin names it: an ID or an @username, never a title to match. */
const CHAT_REF = /^(-?\d{1,20}|@[A-Za-z0-9_]{3,64})$/;
function chatRef(v: unknown, what = 'chat'): string {
  if (typeof v === 'number' && Number.isSafeInteger(v)) return String(v);
  if (typeof v !== 'string' || !CHAT_REF.test(v)) throw invalid(`${what} must be a chat ID or an @username`);
  return v;
}

/** The FLOOD_WAIT seconds of a Telegram error, if it is one. */
function floodSeconds(e: unknown): number | undefined {
  try {
    const d = errorDetails(e);
    return d.code === 'flood_wait' ? d.retryAfterSeconds ?? 0 : undefined;
  } catch {
    return undefined;
  }
}

/** Any other host failure as the guest sees it: the CLI's code and a masked message. */
function hostFailure(e: unknown): HostError {
  if (e instanceof HostError) return e;
  const d = errorDetails(e);
  return new HostError(d.code, d.message, d.retryAfterSeconds !== undefined ? { retryAfterSeconds: d.retryAfterSeconds } : {});
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
const serviceUser = (entity: ResolvedEntity) => entity instanceof Api.User && SERVICE_IDS.has(entity.id.toString());

/** A message another person may have written, as the read APIs return it. */
function readMessage(msg: Api.Message) {
  const service = isServiceSource(msg);
  const from = msg.fromId instanceof Api.PeerUser ? msg.fromId.userId.toString() : msg.peerId instanceof Api.PeerUser && !msg.out ? msg.peerId.userId.toString() : undefined;
  return {
    id: msg.id,
    date: iso(msg.date),
    out: !!msg.out,
    ...(from ? { senderId: from } : {}),
    text: maskForModel(plainMessageText(msg), service ? 'service' : 'echo'),
    ...(msg.fwdFrom ? { forwarded: true } : {}),
    ...(service ? { service: true } : {}),
    ...(msg.replyTo?.replyToMsgId ? { replyToMsgId: msg.replyTo.replyToMsgId } : {}),
  };
}

/** Takes items while the serialized page stays under PAGE_CHARS (at least one). */
function bounded<T>(items: T[]): T[] {
  let size = 2;
  const out: T[] = [];
  for (const item of items) {
    const n = JSON.stringify(item).length + 1;
    if (out.length && size + n > PAGE_CHARS) break;
    size += n;
    out.push(item);
  }
  return out;
}

// ---------- the cursor of messages.mine ----------

type MineType = 'private' | 'group';
const MINE_TYPES: readonly MineType[] = ['private', 'group'];

interface MineCursor {
  /** Account tag: a cursor of another account is refused. */
  a: string;
  t: MineType[];
  s: number;
  /** The chats to walk, fixed on the first page. */
  c: string[];
  i: number;
  /** offsetId inside chat i (0: from the newest). */
  o: number;
}

const accountTag = (userId: string) => createHash('sha256').update(`tg-plugin-cursor:${userId}`).digest('base64url').slice(0, 12);

const encodeCursor = (c: MineCursor) => Buffer.from(JSON.stringify(c)).toString('base64url');

function decodeCursor(text: string, account: string): MineCursor {
  const bad = () => invalid('cursor is not one this host returned');
  if (text.length > 8192 || !/^[A-Za-z0-9_-]+$/.test(text)) throw bad();
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'));
  } catch {
    throw bad();
  }
  if (!isObject(raw)) throw bad();
  const { a, t, s, c, i, o } = raw;
  if (a !== accountTag(account)) throw invalid('cursor belongs to another account or another listing');
  if (!Array.isArray(t) || !t.length || !t.every(x => MINE_TYPES.includes(x as MineType))) throw bad();
  if (!Array.isArray(c) || c.length > MINE_CHATS || !c.every(x => typeof x === 'string' && /^-?\d{1,20}$/.test(x))) throw bad();
  if (typeof s !== 'number' || !Number.isInteger(s) || s < 0) throw bad();
  if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i > c.length) throw bad();
  if (typeof o !== 'number' || !Number.isInteger(o) || o < 0) throw bad();
  return { a, t: [...new Set(t as MineType[])], s, c: c as string[], i, o };
}

/** The own-message type of a chat, or undefined for one `messages.mine` never reads. */
function mineType(entity: ResolvedEntity): MineType | undefined {
  if (entity instanceof Api.User) return entity.bot || serviceUser(entity) ? undefined : 'private';
  if (entity instanceof Api.Chat) return 'group';
  if (entity instanceof Api.Channel) return entity.megagroup ? 'group' : undefined;
  return undefined;
}

function sinceSeconds(v: unknown): number {
  if (v === undefined || v === null) return 0;
  const ms = typeof v === 'number' ? v * 1000 : typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isFinite(ms) || ms < 0) throw invalid('since must be an ISO date or Unix seconds');
  return Math.floor(ms / 1000);
}

// ---------- the API ----------

/** The host functions a command gets: its manifest's permissions and its effects together. */
export function grantedApi(ctx: HostContext, state: HostState): Record<string, HostFunction> {
  const perms = new Set<Permission>(ctx.manifest.permissions ?? []);
  const effects = new Set(ctx.command.effects);
  const api: Record<string, HostFunction> = Object.create(null) as Record<string, HostFunction>;
  /** A Telegram read: FLOOD_WAIT and every other failure come back as host errors. */
  const tg = <T>(fn: () => Promise<T>) => fn().catch((e: unknown) => {
    const wait = floodSeconds(e);
    if (wait !== undefined) {
      state.flood = { retryAfterSeconds: wait, cursor: null, partial: null };
      throw new HostError('flood_wait', `Telegram rate limit: retry after ${wait} s`, { retryAfterSeconds: wait, cursor: null, partial: null });
    }
    throw hostFailure(e);
  });

  if (perms.has('identity:read')) {
    api.me = () => tg(async () => {
      const me = await (await ctx.client()).getMe();
      if (!(me instanceof Api.User)) throw new HostError('error', 'Telegram did not return the account');
      const name = [me.firstName, me.lastName].filter(Boolean).join(' ');
      return { id: me.id.toString(), name: maskForModel(name, 'echo'), ...(me.username ? { username: me.username } : {}) };
    });
  }

  if (perms.has('messages:read-own')) api['messages.mine'] = ([o]) => mine(ctx, state, opts(o, 'messages.mine'));

  if (perms.has('chats:read')) {
    api['chats.list'] = ([o]) => tg(async () => {
      const p = opts(o, 'chats.list');
      const limit = int(p.limit, 'limit', 1, 500, 100);
      const types = p.types === undefined ? undefined : p.types;
      if (types !== undefined && (!Array.isArray(types) || !types.every(t => (CHAT_TYPES as readonly unknown[]).includes(t)))) {
        throw invalid(`types must be a list of ${CHAT_TYPES.join(', ')}`);
      }
      const unreadOnly = p.unreadOnly === true;
      const chats = await getDialogs(await ctx.client(), limit);
      const list = chats
        .filter(c => !types || (types as string[]).some(t => matchesChatType(c, t)))
        .filter(c => !unreadOnly || c.unreadCount > 0)
        .map(c => ({ id: c.id, title: maskForModel(c.title, 'echo'), type: c.bot ? 'bot' : c.type, muted: !!c.muted, unreadCount: c.unreadCount }));
      return { chats: bounded(list) };
    });
  }

  if (perms.has('messages:read')) {
    api['messages.read'] = ([chat, o]) => tg(async () => {
      const p = opts(o, 'messages.read');
      const limit = int(p.limit, 'limit', 1, READ_MAX, 20);
      const before = optInt(p.before, 'before', 1, 2 ** 31);
      const topic = optInt(p.topic, 'topic', 1, 2 ** 31);
      const thread = optInt(p.thread, 'thread', 1, 2 ** 31);
      if (topic && thread) throw invalid('pass topic or thread, not both');
      return history(await ctx.client(), chatRef(chat), { limit, before, topic, thread });
    });
    api['messages.search'] = ([query, o]) => tg(async () => {
      const q = str(query, 'query', 256);
      const p = opts(o, 'messages.search');
      const limit = int(p.limit, 'limit', 1, READ_MAX, 20);
      const topic = optInt(p.topic, 'topic', 1, 2 ** 31);
      const client = await ctx.client();
      if (p.chat === undefined || p.chat === null) {
        if (topic) throw invalid('topic needs chat');
        const res = await client.invoke(new Api.messages.SearchGlobal({ q, filter: new Api.InputMessagesFilterEmpty(), minDate: 0, maxDate: 0, offsetRate: 0, offsetPeer: new Api.InputPeerEmpty(), offsetId: 0, limit }));
        const msgs = 'messages' in res ? res.messages.filter((m): m is Api.Message => m instanceof Api.Message) : [];
        return { messages: bounded(msgs.map(m => ({ chatId: utils.getPeerId(m.peerId).toString(), ...readMessage(m) }))) };
      }
      const entity = await resolveChat(client, chatRef(p.chat));
      if (topic && !hasTopics(entity)) throw invalid('this chat has no topics');
      const res = await client.invoke(new Api.messages.Search({
        peer: entity, q, filter: new Api.InputMessagesFilterEmpty(), minDate: 0, maxDate: 0, offsetId: 0, addOffset: 0, limit, maxId: 0, minId: 0, hash: bigInt(0),
        ...(topic ? { topMsgId: topic } : {}),
      }));
      const chatId = utils.getPeerId(entity).toString();
      const msgs = 'messages' in res ? res.messages.filter((m): m is Api.Message => m instanceof Api.Message) : [];
      return { messages: bounded(msgs.map(m => ({ chatId, ...readMessage(m) }))) };
    });
  }

  if (perms.has('messages:read-target')) {
    const target = ctx.target;
    const noTarget = () => new HostError('no_target', 'This run has no --target; the agent passes one with the command');
    api['target.message'] = () => tg(async () => {
      if (!target) throw noTarget();
      if (target.msgId === undefined || target.thread) throw new HostError('not_available', 'The target is a thread or topic: use host.target.thread()');
      const client = await ctx.client();
      const entity = await resolveChat(client, target.chat);
      const [msg] = await client.getMessages(entity, { ids: [target.msgId] });
      if (!(msg instanceof Api.Message)) throw new HostError('not_found', `Message ${target.msgId} was not found in the target chat`);
      return { chatId: utils.getPeerId(entity).toString(), message: readMessage(msg) };
    });
    api['target.thread'] = ([o]) => tg(async () => {
      if (!target) throw noTarget();
      if (!target.thread && target.topic === undefined) throw new HostError('not_available', 'The target is one message: use host.target.message()');
      const p = opts(o, 'target.thread');
      const limit = int(p.limit, 'limit', 1, READ_MAX, 20);
      const before = optInt(p.before, 'before', 1, 2 ** 31);
      return history(await ctx.client(), target.chat, target.topic !== undefined ? { limit, before, topic: target.topic } : { limit, before, thread: target.msgId });
    });
  }

  if (perms.has('storage:read')) {
    api['storage.get'] = ([key]) => {
      const v = ctx.storage().get(storageKey(ctx, key));
      return v === undefined ? null : v;
    };
    api['storage.list'] = () => ({ items: ctx.storage().list() });
  }
  if (perms.has('storage:write') && effects.has('storage')) {
    api['storage.set'] = ([key, value], signal) => {
      const k = storageKey(ctx, key);
      if (typeof value !== 'string') throw invalid('storage.set takes a string value (JSON.stringify an object first)');
      if (!value) throw invalid('the value is empty; use storage.delete');
      if (signal.aborted) throw new HostError('cancelled', 'The run ended');
      return ctx.storage().set(k, value);
    };
    api['storage.delete'] = ([key], signal) => {
      const k = storageKey(ctx, key);
      if (signal.aborted) throw new HostError('cancelled', 'The run ended');
      return { deleted: ctx.storage().delete(k) };
    };
  }

  if (perms.has('settings:read')) {
    api['settings.get'] = ([key]) => {
      if (typeof key !== 'string' || !Object.hasOwn(ctx.manifest.settings ?? {}, key)) throw invalid(`settings.get: "${String(key)}" is not a setting this plugin declares`);
      // Changing settings comes with `plugin settings set` (P3); until then each has its default
      const d = ctx.manifest.settings![key].default;
      return d === undefined ? null : d;
    };
  }

  if (perms.has('actions') && effects.has('actions')) {
    api['actions.propose'] = ([action]) => {
      if (state.proposals.length >= 20) throw new HostError('plugin_limit', 'At most 20 proposals in one run', { limit: 'proposals' });
      const proposal = buildProposal(action, state.proposals.length + 1, ctx.maskProposals);
      state.proposals.push(proposal);
      return { id: proposal.id };
    };
  }

  if (ctx.log) {
    const log = ctx.log;
    api.log = args => {
      log(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ').slice(0, 10_000));
      return null;
    };
  }
  return api;
}

function storageKey(ctx: HostContext, key: unknown): string {
  if (typeof key !== 'string' || !(ctx.manifest.storage?.keys ?? []).includes(key)) {
    throw invalid(`"${String(key)}" is not a storage key this plugin declares (${(ctx.manifest.storage?.keys ?? []).join(', ') || 'none'})`);
  }
  return key;
}

/** History of a chat, a forum topic or a comment thread: newest first, size-bounded. */
async function history(client: TelegramClient, chat: string, p: { limit: number; before?: number; topic?: number; thread?: number }) {
  const entity = await resolveChat(client, chat);
  if (p.topic && !hasTopics(entity)) throw invalid('this chat has no topics');
  const root = p.topic ?? p.thread;
  let raw: Api.TypeMessage[];
  if (root) {
    const res = await client.invoke(new Api.messages.GetReplies({
      peer: entity, msgId: root, offsetId: p.before ?? 0, offsetDate: 0, addOffset: 0, limit: p.limit, maxId: 0, minId: 0, hash: bigInt(0),
    }));
    raw = 'messages' in res ? res.messages : [];
  } else {
    raw = await client.getMessages(entity, { limit: p.limit, ...(p.before ? { offsetId: p.before } : {}) });
  }
  const msgs = raw.filter((m): m is Api.Message => m instanceof Api.Message);
  const page = bounded(msgs.map(readMessage));
  const oldest = page.length ? page[page.length - 1].id : null;
  return {
    chatId: utils.getPeerId(entity).toString(),
    messages: page,
    // Pass as `before` for the next page; null when this page reached the start
    before: page.length < msgs.length || msgs.length >= p.limit ? oldest : null,
  };
}

/** `messages.mine`: the owner's own text, chat by chat (latest activity first), newest first. */
async function mine(ctx: HostContext, state: HostState, p: Record<string, unknown>) {
  const limit = int(p.limit, 'limit', 1, MINE_MAX, 100);
  const account = await ctx.account();
  let cur: MineCursor | undefined;
  const messages: { text: string; date: string; chatType: MineType }[] = [];
  let size = 2;
  const page = (done: boolean) => ({ messages, count: messages.length, cursor: done || !cur ? null : encodeCursor(cur), done });
  const client = await ctx.client();
  try {
    if (typeof p.cursor === 'string') {
      cur = decodeCursor(p.cursor, account);
    } else if (p.cursor !== undefined && p.cursor !== null) {
      throw invalid('cursor must be a string from a previous page');
    } else {
      const typesIn = p.types === undefined || p.types === null ? ['private'] : p.types;
      if (!Array.isArray(typesIn) || !typesIn.length || !typesIn.every(t => MINE_TYPES.includes(t as MineType))) throw invalid('types must be a list of private, group');
      const types = [...new Set(typesIn as MineType[])];
      const dialogs = await client.getDialogs({ limit: 200 });
      const chats: string[] = [];
      for (const d of dialogs) {
        const t = d.entity ? mineType(d.entity as ResolvedEntity) : undefined;
        if (t && types.includes(t) && d.id) chats.push(d.id.toString());
        if (chats.length >= MINE_CHATS) break;
      }
      cur = { a: accountTag(account), t: types, s: sinceSeconds(p.since), c: chats, i: 0, o: 0 };
    }
    const me = await client.getMe();
    let requests = 0;
    while (cur.i < cur.c.length && messages.length < limit) {
      if (requests >= MINE_REQUESTS) return page(false);
      // Every filter again, whatever the cursor says: the chat's type and that it is no service chat
      const entity = await resolveChat(client, cur.c[cur.i]);
      const type = mineType(entity);
      if (!type || !cur.t.includes(type)) {
        cur = { ...cur, i: cur.i + 1, o: 0 };
        continue;
      }
      const want = Math.min(100, limit - messages.length + 20);
      requests++;
      const batch = await client.getMessages(entity, { limit: want, fromUser: me, ...(cur.o ? { offsetId: cur.o } : {}) });
      let chatDone = batch.length < want;
      let full = false;
      for (const msg of batch) {
        if (!(msg instanceof Api.Message)) {
          if (msg && typeof (msg as { id?: unknown }).id === 'number') cur = { ...cur, o: (msg as { id: number }).id };
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
        const own = msg.out || (msg.fromId instanceof Api.PeerUser && msg.fromId.userId.equals(me.id));
        const text = plainMessageText(msg);
        // Own authored text only: no forwards, nothing from or quoting a service account, no empty media
        if (own && !msg.fwdFrom && !isServiceSource(msg) && text.trim()) {
          const item = { text: maskForModel(text, 'echo'), date: iso(msg.date), chatType: type };
          const n = JSON.stringify(item).length + 1;
          if (messages.length && size + n > PAGE_CHARS) {
            // Resume at this very message next time (offsetId is exclusive)
            cur = { ...cur, o: msg.id + 1 };
            return page(false);
          }
          size += n;
          messages.push(item);
        }
        cur = { ...cur, o: msg.id };
      }
      if (full) return page(false);
      if (chatDone) cur = { ...cur, i: cur.i + 1, o: 0 };
    }
    return page(cur.i >= cur.c.length);
  } catch (e) {
    const wait = floodSeconds(e);
    if (wait === undefined) throw hostFailure(e);
    // The point to continue from and what this call had collected before Telegram said wait
    const cursor = cur ? encodeCursor(cur) : null;
    const partial = { messages, count: messages.length };
    state.flood = { retryAfterSeconds: wait, cursor, partial };
    throw new HostError('flood_wait', `Telegram rate limit: retry after ${wait} s`, { retryAfterSeconds: wait, cursor, partial });
  }
}
