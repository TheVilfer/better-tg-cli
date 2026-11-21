/**
 * `plugin run` and `plugin dev` (docs/plugins.md §4, §8): one command of a plugin in the sandbox,
 * its input and output checked by the manifest's schemas, and the output envelope
 * `{data, proposals}` built by the host. The installed snapshot is read once (verified against the
 * lock) and those bytes run; `plugin dev` runs a folder against the mock account in memory.
 */
import { closeSync, constants, lstatSync, mkdirSync, openSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TelegramClient } from 'teleproto';
import { CliError, EXIT, usageError } from '../errors.js';
import { maskDeep } from '../mcp-output.js';
import { validate, SchemaTimeoutError, type SchemaIssue } from './json-schema.js';
import type { Manifest, PluginCommand } from './manifest.js';
import { grantedApi, type HostContext, type HostState, type StorageBackend, type Target } from './host.js';
import { DEFAULT_LIMITS, SandboxError, type SandboxLimits } from './sandbox-types.js';
import type { Proposal } from './proposals.js';

/** Test seam (in-process tests only): shorter limits. */
export const runDeps: { limits?: Partial<SandboxLimits> } = {};

/** Time a schema check of plugin input or output may take. */
const SCHEMA_MS = 2000;

/** What `plugin run` prints: the plugin's result as `data`, and only what the host built as `proposals`. */
export interface Envelope {
  data: unknown;
  proposals: Proposal[];
}

export interface RunOutcome {
  envelope: Envelope;
  /** The envelope as JSON, `null` kept (never formatJson, which drops it). */
  json: string;
  calls: string[];
}

/** The command of a plugin by name, or a usage error listing the ones it has. */
export function findCommand(m: Manifest, name: string): PluginCommand {
  const c = (m.commands ?? []).find(x => x.name === name);
  if (!c) {
    throw new CliError(`Plugin "${m.name}" has no command "${name}"`, 'invalid_argument', EXIT.USAGE, {
      hint: `Its commands: ${(m.commands ?? []).map(x => x.name).join(', ') || 'none'}`,
    });
  }
  return c;
}

/** P2 runs reads and local writes; a command that sends data out (`network`) comes with P3. */
export function assertRunnable(m: Manifest, c: PluginCommand): void {
  if (c.effects.includes('network')) {
    throw new CliError(`Command "${c.name}" of "${m.name}" sends data over the network, which this version cannot run yet`, 'plugin_unsupported', EXIT.ERROR, {
      hint: 'Network access for plugins comes in a later version of Better-TG-CLI.',
    });
  }
}

/** `--input`: a JSON object (absent: `{}`). */
export function parseInput(text: string | undefined): unknown {
  if (text === undefined) return {};
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    throw usageError(`--input is not JSON: ${(e as Error).message}`, 'Pass a JSON object, e.g. --input \'{"limit": 100}\', or "-" to read it from stdin');
  }
  return value;
}

const issuesText = (issues: SchemaIssue[]) => issues.slice(0, 5).map(i => `${i.path || '/'} ${i.message}`).join('; ');

/** The plugin's value against the command's schema; time-bounded, never a regular expression (manifest rule). */
function schemaIssues(schema: Record<string, unknown>, value: unknown): SchemaIssue[] {
  try {
    return validate(schema, value, 20, SCHEMA_MS);
  } catch (e) {
    if (e instanceof SchemaTimeoutError) throw new CliError('Checking the value against the command\'s schema took too long', 'plugin_limit', EXIT.ERROR, { fields: { limit: 'schema' } });
    throw e;
  }
}

export function checkInput(c: PluginCommand, input: unknown): void {
  const issues = schemaIssues(c.input, input);
  if (issues.length) {
    throw new CliError(`The input does not match the schema of "${c.name}": ${issuesText(issues)}`, 'invalid_argument', EXIT.USAGE, {
      fields: { issues },
      hint: 'Fix the input to match the command\'s input schema (telegram plugin list --json shows the commands).',
    });
  }
}

/** `--target <chat>:<msgId>` (one message, or its thread with `--thread`) or `--target <chat>@<topic>`. */
export function parseTarget(text: string | undefined, thread: boolean): Target | undefined {
  if (text === undefined) {
    if (thread) throw usageError('--thread needs --target <chat>:<msgId>');
    return undefined;
  }
  const m = /^(-?\d{1,20}|@[A-Za-z0-9_]{3,64})(?::(\d{1,10})|@(\d{1,10}))$/.exec(text);
  if (!m) throw usageError(`--target must be <chat>:<msgId> or <chat>@<topic>, where chat is an ID or @username (got "${text}")`);
  const [, chat, msg, topic] = m;
  if (topic !== undefined) {
    if (thread) throw usageError('--thread goes with <chat>:<msgId>; <chat>@<topic> is a topic already');
    return { chat, topic: Number(topic), thread: false };
  }
  return { chat, msgId: Number(msg), thread };
}

export interface RunRequest {
  manifest: Manifest;
  command: PluginCommand;
  code: string;
  filename: string;
  input: unknown;
  client: () => Promise<TelegramClient>;
  account: () => Promise<string>;
  storage: () => StorageBackend;
  target?: Target;
  /** Over MCP: the output and proposal texts get maskForModel (`echo`). */
  mcp: boolean;
  log?: (line: string) => void;
  signal?: AbortSignal;
  cancelled?: () => boolean;
}

/** Runs one command in a fresh sandbox and builds the envelope; every failure is a CliError. */
export async function runPluginCommand(req: RunRequest, calls: string[] = []): Promise<RunOutcome> {
  const state: HostState = { proposals: [] };
  const ctx: HostContext = {
    manifest: req.manifest, command: req.command, client: req.client, account: req.account, storage: req.storage,
    target: req.target, maskProposals: req.mcp, log: req.log,
  };
  const api = grantedApi(ctx, state);
  // Loaded on demand: a CLI call that runs no plugin never instantiates the engine
  const { runInSandbox } = await import('./runtime.js');
  const limits = { ...DEFAULT_LIMITS, ...runDeps.limits };
  let json: string;
  try {
    const r = await runInSandbox({ code: req.code, filename: req.filename, command: req.command.name, input: req.input, api, limits, signal: req.signal, cancelled: req.cancelled, onCall: n => calls.push(n) });
    json = r.json;
  } catch (e) {
    if (!(e instanceof SandboxError)) throw e;
    if (e.code === 'plugin_limit') throw new CliError(e.message, 'plugin_limit', EXIT.ERROR, { fields: { limit: e.limit } });
    if (e.code === 'cancelled') throw new CliError('The plugin run was cancelled; nothing it had not finished was written', 'cancelled', EXIT.ERROR);
    // A FLOOD_WAIT the command passed on: the host's own record of it (never what the plugin wrote)
    if (e.guestCode === 'flood_wait' && state.flood) {
      throw new CliError(`Telegram rate limit: retry after ${state.flood.retryAfterSeconds} s`, 'flood_wait', EXIT.ERROR, {
        retryAfterSeconds: state.flood.retryAfterSeconds,
        fields: { cursor: state.flood.cursor, partial: state.flood.partial },
        hint: `Wait ${state.flood.retryAfterSeconds} s, then run the command again with the cursor.`,
      });
    }
    throw new CliError(e.message, 'plugin_error', EXIT.ERROR);
  }
  const data: unknown = JSON.parse(json);
  const issues = schemaIssues(req.command.output, data);
  if (issues.length) {
    throw new CliError(`The plugin's result does not match the output schema of "${req.command.name}": ${issuesText(issues)}`, 'plugin_error', EXIT.ERROR, { fields: { issues } });
  }
  const envelope: Envelope = { data: req.mcp ? maskDeep(data, 'echo') : data, proposals: state.proposals };
  const out = JSON.stringify(envelope);
  if (out.length > limits.outputChars) {
    throw new CliError(`The command's output is ${out.length} characters; the limit is ${limits.outputChars}`, 'plugin_limit', EXIT.ERROR, { fields: { limit: 'output' } });
  }
  return { envelope, json: out, calls };
}

/** Plugin data in memory, for `plugin dev`. */
export function memoryStorage(m: Manifest): StorageBackend {
  const items = new Map<string, { value: string; updatedAt: string }>();
  const quota = m.storage?.quotaBytes ?? 256 * 1024;
  const used = () => [...items.values()].reduce((n, i) => n + Buffer.byteLength(i.value), 0);
  return {
    get: key => items.get(key)?.value,
    list: () => [...items.entries()].map(([key, i]) => ({ key, bytes: Buffer.byteLength(i.value), updatedAt: i.updatedAt })),
    set: (key, value) => {
      const bytes = Buffer.byteLength(value);
      const usedBytes = used() - (items.has(key) ? Buffer.byteLength(items.get(key)!.value) : 0) + bytes;
      if (usedBytes > quota) throw new CliError(`Saving "${key}" would use ${usedBytes} of ${quota} bytes`, 'plugin_limit', EXIT.ERROR);
      items.set(key, { value, updatedAt: new Date().toISOString() });
      return { bytes, usedBytes, quotaBytes: quota };
    },
    delete: key => items.delete(key),
  };
}

/**
 * `host.log` of `plugin dev`: a file of its own, never the command's stdout or stderr. It lives in a
 * folder of this user's (`<tmp>/better-tg-cli-plugin-dev-<uid>`, 0700, checked to be a real folder
 * owned by the user) and is opened without following a link, so a shared tmp cannot redirect it.
 */
export function devLog(name: string): { path: string; write: (line: string) => void } {
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;
  const dir = join(tmpdir(), `better-tg-cli-plugin-dev${uid === undefined ? '' : `-${uid}`}`);
  const path = join(dir, `${name}.log`);
  return {
    path,
    write: line => {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const st = lstatSync(dir);
      if (!st.isDirectory() || (uid !== undefined && (st.uid !== uid || (st.mode & 0o077) !== 0))) {
        throw new CliError(`${dir} is not a private folder of this user; host.log is not written`, 'plugin_data_unsafe', EXIT.ERROR);
      }
      const fd = openSync(path, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0), 0o600);
      try {
        writeSync(fd, `${new Date().toISOString()} ${line.replace(/\n/g, '\\n')}\n`);
      } finally {
        closeSync(fd);
      }
    },
  };
}
