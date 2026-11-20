import type { Command } from 'commander';

/**
 * What a write in mode "ask" is about, as the person approving it should see it and as its approval
 * is bound: the command path, its parsed arguments and options, and the recipients resolved to IDs.
 *
 * Built from the command commander actually parsed (not from the raw argv), so the order of the
 * flags or an output-only `--json` does not change it. Everything commander parsed is part of it
 * except the options in OUTPUT_ONLY; a new option is covered without a change here.
 */

/** Options that only change how the result is printed. `--markdown`/`--html` stay: on a write they change what is sent. */
export const OUTPUT_ONLY = new Set(['json']);

export interface ParsedAction {
  /** `send`, `topic create`, `api` … */
  command: string;
  /** Positional arguments in order, by their declared name; a variadic one is a list */
  args: { name: string; value: string | string[] }[];
  /** Options given on the command line (or implied) that differ from their default, by attribute name, sorted */
  options: [string, unknown][];
  /** The raw argv, shown last for the agent and hashed when nothing was parsed */
  argv: string[];
  /**
   * Chats named inside the params of a raw API call (`{"_chat": …}`, by JSON path), set by the
   * guard from the params the call will send: they are recipients like any argument.
   */
  apiPeers?: { path: string; value: string }[];
  /** False when no parsed command was available: the raw argv is all there is */
  parsed: boolean;
}

let active: { command: Command; argv: string[] } | undefined;

/**
 * Remembers the command commander is about to run (a preAction hook on the program), so the write
 * guard can read its parsed arguments. Also used by tests that build their own program.
 */
export function trackActiveCommand(program: Command): void {
  program.hook('preAction', (_root, command) => {
    active = { command, argv: process.argv.slice(2) };
  });
}

function commandPath(command: Command): string {
  const names: string[] = [];
  for (let c: Command | null = command; c?.parent; c = c.parent) names.unshift(c.name());
  return names.join(' ');
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The action for this argv. The parsed command is used only when it was parsed from this very argv;
 * otherwise (a guard called on its own, as in some tests) the raw argv is the action.
 */
export function parsedAction(argv: string[]): ParsedAction {
  const raw: ParsedAction = { command: argv[0] ?? '', args: [], options: [], argv, parsed: false };
  if (!active || !same(active.argv, argv)) return raw;
  const { command } = active;
  const args: ParsedAction['args'] = [];
  command.registeredArguments.forEach((a, i) => {
    const v = command.processedArgs[i] as unknown;
    if (v === undefined) return; // an optional argument that was not given
    args.push({ name: a.name(), value: Array.isArray(v) ? v.map(String) : String(v) });
  });
  const options: [string, unknown][] = [];
  for (const opt of command.options) {
    const key = opt.attributeName();
    if (OUTPUT_ONLY.has(key)) continue;
    const source = command.getOptionValueSource(key);
    const value = command.getOptionValue(key) as unknown;
    if (value === undefined || source === undefined || source === 'default') continue;
    if (opt.defaultValue !== undefined && same(value, opt.defaultValue)) continue;
    if (options.some(([k]) => k === key)) continue; // --foo / --no-foo share one attribute
    options.push([key, value]);
  }
  options.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { command: commandPath(command), args, options, argv, parsed: true };
}

/** A recipient as it was looked up for the approval: the chat it resolved to, or why it did not. */
import type { ChatCandidate, Hint } from './errors.js';

export type PeerInfo =
  | { ok: true; id: string; title: string; type: string; username?: string; self?: boolean }
  | { ok: false; error: string; code?: string; exitCode?: number; message?: string; candidates?: ChatCandidate[]; hint?: Hint; retryAfterSeconds?: number };

interface Descriptor {
  verb: string;
  /** Arguments that name a chat or user, with the label they get */
  peers?: Record<string, string>;
  /** Arguments with free text the person must read in full */
  text?: Record<string, string>;
  /** Labels for the other arguments */
  labels?: Record<string, string>;
  /** Arguments that name a local file the command uploads: read once, hashed and sent as those bytes */
  files?: string[];
  /** The argument whose "-" the command reads from stdin (only these show stdin in their place) */
  stdin?: string;
  /** Takes stdin for this option's "-" (`send-file -c -`) */
  stdinOption?: string;
  /** A peer argument value that is not a chat to look up (an invite link for `join`) */
  notPeer?: (name: string, value: string) => boolean;
}

const CHAT = { chat: 'Chat' };
const MSG = { messageId: 'Message', msgId: 'Message', messageIds: 'Messages', topicId: 'Topic' };

/** The curated write commands. One not listed here is shown and hashed generically, its peers unresolved. */
const DESCRIPTORS: Record<string, Descriptor> = {
  send: { verb: 'Send a message', peers: { target: 'To' }, text: { message: 'Text' }, stdin: 'message' },
  reply: { verb: 'Reply to a message', peers: { chat: 'To' }, text: { message: 'Text' }, labels: MSG, stdin: 'message' },
  'send-file': { verb: 'Send a file', peers: { target: 'To' }, labels: { path: 'File' }, files: ['path'], stdinOption: 'caption' },
  edit: { verb: 'Edit a message', peers: CHAT, text: { text: 'New text' }, labels: MSG, stdin: 'text' },
  delete: { verb: 'Delete messages', peers: CHAT, labels: MSG },
  forward: { verb: 'Forward messages', peers: { fromChat: 'From', toChat: 'To' }, labels: MSG },
  react: { verb: 'React to a message', peers: CHAT, labels: { ...MSG, emoji: 'Reaction' } },
  click: { verb: 'Press a bot button', peers: CHAT, labels: { ...MSG, button: 'Button' } },
  inline: { verb: 'Send an inline query to a bot (it gets the query and your user ID)', peers: { bot: 'Bot' }, text: { query: 'Query' } },
  poll: { verb: 'Create a poll', peers: CHAT, text: { question: 'Question' }, labels: { options: 'Answers' } },
  vote: { verb: 'Vote in a poll', peers: CHAT, labels: { ...MSG, options: 'Answers' } },
  pin: { verb: 'Pin a message', peers: CHAT, labels: MSG },
  unpin: { verb: 'Unpin a message', peers: CHAT, labels: MSG },
  'mark-read': { verb: 'Mark a chat as read', peers: CHAT },
  'mark-unread': { verb: 'Mark a chat as unread', peers: CHAT },
  typing: { verb: 'Show a typing status', peers: CHAT, labels: { action: 'Status' } },
  mute: { verb: 'Mute a chat', peers: CHAT },
  unmute: { verb: 'Unmute a chat', peers: CHAT },
  archive: { verb: 'Archive a chat', peers: CHAT },
  unarchive: { verb: 'Unarchive a chat', peers: CHAT },
  'pin-chat': { verb: 'Pin a chat in the chat list', peers: CHAT },
  'unpin-chat': { verb: 'Unpin a chat in the chat list', peers: CHAT },
  'delete-dialog': { verb: 'Delete a chat from the chat list', peers: CHAT },
  'folder-add': { verb: 'Add a chat to a folder', peers: CHAT, labels: { folder: 'Folder' } },
  'folder-remove': { verb: 'Remove a chat from a folder', peers: CHAT, labels: { folder: 'Folder' } },
  block: { verb: 'Block a user', peers: { user: 'User' } },
  unblock: { verb: 'Unblock a user', peers: { user: 'User' } },
  'add-contact': { verb: 'Add a contact', peers: { user: 'User' }, labels: { firstName: 'First name', lastName: 'Last name' } },
  'del-contact': { verb: 'Delete a contact', peers: { user: 'User' } },
  join: { verb: 'Join a chat', peers: { target: 'Chat' }, labels: { target: 'Invite link' }, notPeer: (_name, value) => INVITE_LINK.test(value) },
  leave: { verb: 'Leave a chat', peers: CHAT },
  'invite-link': { verb: 'Create an invite link', peers: CHAT },
  'create-group': { verb: 'Create a group', peers: { users: 'Member' }, labels: { title: 'Title' } },
  'create-channel': { verb: 'Create a channel', labels: { title: 'Title' } },
  kick: { verb: 'Remove a member', peers: { group: 'Chat', user: 'User' } },
  promote: { verb: 'Make a member an admin', peers: { group: 'Chat', user: 'User' } },
  'transfer-owner': { verb: 'Transfer chat ownership', peers: { group: 'Chat', user: 'New owner' } },
  'edit-permissions': { verb: 'Change a member\'s permissions', peers: { chat: 'Chat', user: 'User' } },
  'topic create': { verb: 'Create a forum topic', peers: CHAT, text: { title: 'Title' } },
  'topic edit': { verb: 'Edit a forum topic', peers: CHAT, labels: MSG },
  'topic close': { verb: 'Close a forum topic', peers: CHAT, labels: MSG },
  'topic reopen': { verb: 'Reopen a forum topic', peers: CHAT, labels: MSG },
  'topic pin': { verb: 'Pin a forum topic', peers: CHAT, labels: MSG },
  'topic unpin': { verb: 'Unpin a forum topic', peers: CHAT, labels: MSG },
  'set-name': { verb: 'Change your name', labels: { firstName: 'First name', lastName: 'Last name' } },
  'set-bio': { verb: 'Change your bio', text: { text: 'Bio' } },
  'set-username': { verb: 'Change your username', labels: { username: 'Username' } },
  'set-avatar': { verb: 'Change your profile photo', labels: { path: 'File' }, files: ['path'] },
  avatar: { verb: 'Save a profile photo to this computer', peers: CHAT },
  download: { verb: 'Save media to this computer', peers: CHAT, labels: MSG },
  sync: { verb: 'Save chat history to this computer' },
};

/**
 * Whether this command reads stdin, as its curated description declares (the argument or option
 * whose "-" it reads); undefined for a command without one (api, generated), where any "-" counts.
 */
export function declaredReadsStdin(action: ParsedAction): boolean | undefined {
  const d = action.parsed ? DESCRIPTORS[action.command] : undefined;
  if (!d) return undefined;
  return action.args.some(a => a.name === d.stdin && a.value === '-')
    || action.options.some(([k, v]) => k === d.stdinOption && v === '-');
}

/** Invite links (`t.me/+hash`, `t.me/joinchat/hash`, `+hash`): `join` imports them, there is no chat to look up first. */
export const INVITE_LINK = /(?:t\.me\/(?:joinchat\/|\+)|^\+)([A-Za-z0-9_-]+)/;

/** The curated description of a command, if it has one (exported for the scan in the tests). */
export function descriptorOf(command: string): Readonly<Descriptor> | undefined {
  return DESCRIPTORS[command];
}

/** The command paths with a curated description. */
export const DESCRIBED_COMMANDS: readonly string[] = Object.keys(DESCRIPTORS);

/**
 * The values of this action that name a chat or user: its peer arguments and the chats inside the
 * params of a raw API call. Each is resolved for the approval exactly as the write resolves it, and
 * one that does not resolve stops the write before a code exists: there is nothing to approve.
 */
export function peerArgs(action: ParsedAction): string[] {
  const d = action.parsed ? DESCRIPTORS[action.command] : undefined;
  const out: string[] = [];
  for (const a of action.args) {
    if (!d?.peers?.[a.name]) continue;
    for (const value of Array.isArray(a.value) ? a.value : [a.value]) if (!d.notPeer?.(a.name, value)) out.push(value);
  }
  for (const p of action.apiPeers ?? []) out.push(p.value);
  return out;
}

/** One line, whatever a name contains: a title with a newline must not forge a line of its own. */
export function oneLine(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ch => `\\u{${ch.codePointAt(0)!.toString(16)}}`);
}

/** Control, format and bidi characters could make the shown text differ from the sent one; show them escaped. */
export function visible(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ch => (ch === '\n' ? '\n' : `\\u{${ch.codePointAt(0)!.toString(16)}}`));
}

const quoteArg = (a: string): string => (/^[\w@./:=+-]+$/.test(a) ? a : JSON.stringify(oneLine(a)));

export function describePeer(raw: string, info: PeerInfo | undefined): string {
  if (!info) return `${quoteArg(raw)} (not looked up)`;
  if (!info.ok) return `${quoteArg(raw)} — could not be looked up (${oneLine(info.error)})`;
  if (info.self) return `Saved Messages (your own chat, id ${info.id})`;
  const extra = [info.type, info.username ? `@${oneLine(info.username)}` : undefined, `id ${info.id}`].filter(Boolean).join(', ');
  return `${oneLine(info.title)} (${extra})`;
}

function textBlock(label: string, text: string): string {
  const body = visible(text.replace(/\r?\n$/, '')).split('\n').map(l => `    | ${l}`).join('\n');
  return `  ${label} (${[...text].length} characters):\n${body}`;
}

function flagText(key: string, value: unknown): string {
  const flag = `--${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`;
  if (value === true) return flag;
  if (value === false) return `--no-${flag.slice(2)}`;
  return `${flag} ${Array.isArray(value) ? value.map(v => quoteArg(String(v))).join(' ') : quoteArg(String(value))}`;
}

/**
 * The action as the person approving it reads it: what happens, to whom (name, type, @username,
 * id), where in the chat, every argument, the full text, and the exact command as the last line.
 * `stdin` is the whole body when the command takes it from stdin.
 */
export function describeParsedAction(action: ParsedAction, peers: Map<string, PeerInfo>, stdin?: string, extra: string[] = []): string {
  const d = action.parsed ? DESCRIPTORS[action.command] : undefined;
  // Only a field the handler really reads from stdin shows stdin in its place; elsewhere "-" is
  // what gets sent, and stdin (if any) is shown on its own below
  const fromStdin = (name: string, value: string | string[]) => value === '-' && stdin !== undefined && (!action.parsed || d?.stdin === name);
  const lines: string[] = [];
  const texts: string[] = [];
  const verb = d?.verb ?? (action.command === 'api' || !action.parsed ? `Run "telegram ${oneLine(action.command)}"` : `Run "telegram ${oneLine(action.command)}" (Telegram API method)`);
  lines.push(`  ${verb}`);
  for (const a of action.args) {
    const values = Array.isArray(a.value) ? a.value : [a.value];
    if (d?.peers?.[a.name] && !values.some(v => d.notPeer?.(a.name, v))) {
      for (const v of values) lines.push(`  ${d.peers[a.name]}: ${describePeer(v, peers.get(v))}`);
    } else if (d?.text?.[a.name]) {
      texts.push(textBlock(d.text[a.name], fromStdin(a.name, a.value) ? stdin! : values.join(' ')));
    } else if (fromStdin(a.name, a.value)) {
      texts.push(textBlock(d?.labels?.[a.name] ?? 'Text', stdin!));
    } else {
      const label = d?.labels?.[a.name] ?? a.name;
      const shown = /^message|^msg|topicId/.test(a.name) ? values.map(v => (/^\d+$/.test(v) ? `#${v}` : quoteArg(v))) : values.map(quoteArg);
      lines.push(`  ${label}: ${shown.join(', ')}`);
    }
  }
  for (const p of action.apiPeers ?? []) lines.push(`  Chat in ${oneLine(p.path)}: ${describePeer(p.value, peers.get(p.value))}`);
  lines.push(...extra);
  const options = new Map(action.options);
  if (options.has('topic')) lines.push(`  Topic: #${oneLine(String(options.get('topic')))} (a thread of a forum)`);
  if (options.has('replyTo')) lines.push(`  In reply to: message #${oneLine(String(options.get('replyTo')))}`);
  if (options.has('caption')) {
    const caption = String(options.get('caption'));
    texts.push(textBlock('Caption', caption === '-' && stdin !== undefined && d?.stdinOption === 'caption' ? stdin : caption));
  }
  const rest = action.options.filter(([k]) => !['topic', 'replyTo', 'caption'].includes(k));
  if (rest.length) lines.push(`  Options: ${rest.map(([k, v]) => flagText(k, v)).join(' ')}`);
  // A body on stdin that no argument names ("-p -", or stdin handed over by the MCP server)
  const named = action.args.some(a => fromStdin(a.name, a.value)) || (options.get('caption') === '-' && d?.stdinOption === 'caption');
  // A curated command shows stdin only in the field that reads it: elsewhere it is not sent
  if (stdin !== undefined && !named && !d) texts.push(textBlock(action.parsed ? 'Input (stdin)' : 'Text (stdin)', stdin));
  lines.push(...texts);
  lines.push(`  Command: telegram ${action.argv.map(quoteArg).join(' ')}`);
  return lines.join('\n');
}

/**
 * What the approval hash covers for a parsed action: the command path, each argument (a resolved
 * recipient as its ID, an unresolved one as the raw text, in distinct shapes) and the options.
 * stdin and file contents are added by actionHash.
 */
export function normalizedForm(action: ParsedAction, peers: Map<string, PeerInfo>): unknown {
  const d = DESCRIPTORS[action.command];
  // Every recipient is in as the ID it resolved to; one that did not resolve never gets this far
  const resolve = (v: string) => {
    const info = peers.get(v);
    if (!info?.ok) throw new Error(`Recipient ${JSON.stringify(v)} was not resolved`);
    return { peer: info.id };
  };
  const value = (name: string, v: string) => (d?.notPeer?.(name, v) ? { raw: v } : resolve(v));
  return {
    v: 3,
    command: action.command,
    args: action.args.map(a => (d?.peers?.[a.name]
      ? { name: a.name, value: Array.isArray(a.value) ? a.value.map(v => value(a.name, v)) : value(a.name, a.value) }
      : a)),
    options: action.options,
    ...(action.apiPeers?.length ? { apiPeers: action.apiPeers.map(p => [p.path, resolve(p.value)]) } : {}),
  };
}

/**
 * The chats named inside the params of a raw API call, in the order materializeApiParams resolves
 * them: `{"_chat": "…"}` anywhere in the params, with its JSON path.
 */
export function apiChatRefs(value: unknown, path = 'params'): { path: string; value: string }[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => apiChatRefs(v, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return [];
  const obj = value as Record<string, unknown>;
  const marker = apiMarker(obj);
  if (marker === 'chat') return [{ path, value: obj._chat as string }];
  if (marker) return [];
  return Object.entries(obj).flatMap(([k, v]) => apiChatRefs(v, `${path}.${k}`));
}

/**
 * What a params object stands for, by the one rule both the approval (apiChatRefs) and the request
 * (materializeApiParams in client.ts) use: a chat to resolve, bytes, a big integer, or (undefined)
 * a plain object whose fields are walked.
 */
export function apiMarker(obj: Record<string, unknown>): 'chat' | 'base64' | 'hex' | 'bigint' | undefined {
  if (typeof obj._chat === 'string') return 'chat';
  if (typeof obj._base64 === 'string') return 'base64';
  if (typeof obj._hex === 'string') return 'hex';
  if (typeof obj._bigint === 'string' || typeof obj._bigint === 'number') return 'bigint';
  return undefined;
}

/** Every string an action carries (arguments and option values), for the file-content binding. */
export function actionValues(action: ParsedAction): string[] {
  if (!action.parsed) return action.argv;
  const out: string[] = [];
  for (const a of action.args) out.push(...(Array.isArray(a.value) ? a.value : [a.value]));
  for (const [, v] of action.options) {
    if (Array.isArray(v)) out.push(...v.map(String));
    else if (typeof v === 'string') out.push(v);
  }
  return out;
}
