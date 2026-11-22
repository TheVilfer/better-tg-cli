import { randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TelegramClient } from "teleproto";

import { CliError, EXIT, usageError } from "../errors.js";
import { maskDeep } from "../mcp-output.js";
import { grantedApi, isMessageId, MAX_MESSAGE_ID } from "./host.js";
import type {
  CursorStore,
  HostContext,
  HostState,
  NetworkContext,
  StorageBackend,
  Target,
  WriteGuard,
} from "./host.js";
import { humanCommand } from "./human.js";
import {
  validate,
  SchemaTimeoutError,
  UnsupportedSchemaError,
} from "./json-schema.js";
import type { SchemaIssue } from "./json-schema.js";
import type { Manifest, PluginCommand } from "./manifest.js";
import type { Proposal } from "./proposals.js";
import { DEFAULT_LIMITS, SandboxError } from "./sandbox-types.js";
import type { SandboxLimits } from "./sandbox-types.js";

/** Test seam (in-process tests only): shorter limits. */
export const runDeps: { limits?: Partial<SandboxLimits> } = {};

const SCHEMA_MS = 2000;

/** What `plugin run` prints: the plugin's result as `data`, and only what the host built as `proposals`. */
export interface Envelope {
  data: unknown;
  proposals: Proposal[];
}

/**
 * - `json`: The envelope as JSON, `null` kept (never formatJson, which drops it).
 */
export interface RunOutcome {
  envelope: Envelope;
  json: string;
  calls: string[];
}

/** The command of a plugin by name, or a usage error listing the ones it has. */
export function findCommand(m: Manifest, name: string): PluginCommand {
  const c = (m.commands ?? []).find((x) => x.name === name);
  if (!c) {
    throw new CliError(
      `Plugin "${m.name}" has no command "${name}"`,
      "invalid_argument",
      EXIT.USAGE,
      {
        hint: `Its commands: ${(m.commands ?? []).map((x) => x.name).join(", ") || "none"}`,
      }
    );
  }
  return c;
}

/** `--input`: a JSON object (absent: `{}`). */
export function parseInput(text: string | undefined): unknown {
  if (text === undefined) {
    return {};
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw usageError(
      `--input is not JSON: ${(error as Error).message}`,
      'Pass a JSON object, e.g. --input \'{"limit": 100}\', or "-" to read it from stdin'
    );
  }
  return value;
}

const issuesText = (issues: SchemaIssue[]) =>
  issues
    .slice(0, 5)
    .map((i) => `${i.path || "/"} ${i.message}`)
    .join("; ");

function schemaIssues(
  schema: Record<string, unknown>,
  value: unknown
): SchemaIssue[] {
  try {
    return validate(schema, value, 20, SCHEMA_MS);
  } catch (error) {
    if (error instanceof SchemaTimeoutError) {
      throw new CliError(
        "Checking the value against the command's schema took too long",
        "plugin_limit",
        EXIT.ERROR,
        { fields: { limit: "schema" } }
      );
    }
    if (error instanceof UnsupportedSchemaError) {
      throw new CliError(
        `The command's schema cannot be used: ${error.message}`,
        "plugin_error",
        EXIT.ERROR
      );
    }
    throw error;
  }
}

export function checkInput(c: PluginCommand, input: unknown): void {
  const issues = schemaIssues(c.input, input);
  if (issues.length) {
    throw new CliError(
      `The input does not match the schema of "${c.name}": ${issuesText(issues)}`,
      "invalid_argument",
      EXIT.USAGE,
      {
        fields: { issues },
        hint: "Fix the input to match the command's input schema (telegram plugin list --json shows the commands).",
      }
    );
  }
}

/** `--target <chat>:<msgId>` (one message, or its thread with `--thread`) or `--target <chat>@<topic>`. */
export function parseTarget(
  text: string | undefined,
  thread: boolean
): Target | undefined {
  if (text === undefined) {
    if (thread) {
      throw usageError("--thread needs --target <chat>:<msgId>");
    }
    return undefined;
  }
  const m =
    /^(-?\d{1,20}|@[A-Za-z0-9_]{3,64})(?::(\d{1,10})|@(\d{1,10}))$/.exec(text);
  if (!m) {
    throw usageError(
      `--target must be <chat>:<msgId> or <chat>@<topic>, where chat is an ID or @username (got "${text}")`
    );
  }
  const [, chat, msg, topic] = m;
  const id = Number(topic ?? msg);
  if (!isMessageId(id)) {
    throw usageError(
      `--target: the ${topic === undefined ? "message" : "topic"} ID must be from 1 to ${MAX_MESSAGE_ID} (got "${text}")`
    );
  }
  if (topic !== undefined) {
    if (thread) {
      throw usageError(
        "--thread goes with <chat>:<msgId>; <chat>@<topic> is a topic already"
      );
    }
    return { chat, topic: id, thread: false };
  }
  return { chat, msgId: id, thread };
}

/**
 * `--target`/`--thread` of a run of this plugin, parsed and allowed: a target is refused unless the
 * plugin has `messages:read-target`. One check for `plugin run`, `plugin dev` and the SDK's test host.
 */
export function pluginTarget(
  m: Manifest,
  text: string | undefined,
  thread: boolean
): Target | undefined {
  const target = parseTarget(text, thread);
  if (target && !(m.permissions ?? []).includes("messages:read-target")) {
    throw usageError(
      `Plugin "${m.name}" reads no target (it lacks the permission messages:read-target); drop --target`
    );
  }
  return target;
}

/**
 * - `account`: Fetched on first use (storage, messages.mine), inside the run's deadline.
 * - `mcp`: Over MCP: the output and proposal texts get maskForModel (`echo`).
 * - `network`: `http.fetch` of a command with the `network` effect: the backend and the secrets.
 * - `settings`: Stored settings of the installation.
 */
export interface RunRequest {
  manifest: Manifest;
  command: PluginCommand;
  code: string;
  filename: string;
  input: unknown;
  client: () => Promise<TelegramClient>;
  account: () => Promise<string>;
  storage: () => Promise<StorageBackend>;
  cursors: CursorStore;
  installId: string;
  target?: Target;
  mcp: boolean;
  log?: (line: string) => void;
  network?: NetworkContext;
  settings?: () => Record<string, unknown>;
  signal?: AbortSignal;
  cancelled?: () => boolean;
}

/** What a run sent over the network, for the audit: the request count and the origins, nothing else. */
export interface NetworkStats {
  requests: number;
  origins: string[];
}

/** Runs one command in a fresh sandbox and builds the envelope; every failure is a CliError. */
export async function runPluginCommand(
  req: RunRequest,
  calls: string[] = [],
  stats?: NetworkStats
): Promise<RunOutcome> {
  const state: HostState = { proposals: [] };
  try {
    return await runWith(req, calls, state);
  } finally {
    if (stats) {
      stats.requests = state.requests ?? 0;
      stats.origins = state.origins ?? [];
    }
  }
}

async function runWith(
  req: RunRequest,
  calls: string[],
  state: HostState
): Promise<RunOutcome> {
  const limits = { ...DEFAULT_LIMITS, ...runDeps.limits };
  const deadline = Date.now() + limits.timeoutMs;
  const ctx: HostContext = {
    manifest: req.manifest,
    command: req.command,
    client: req.client,
    account: req.account,
    storage: req.storage,
    cursors: req.cursors,
    installId: req.installId,
    deadline,
    cancelled: req.cancelled,
    target: req.target,
    maskProposals: req.mcp,
    log: req.log,
    network: req.network,
    settings: req.settings,
  };
  const api = grantedApi(ctx, state);
  const { runInSandbox } = await import("./runtime.js");
  let json: string;
  try {
    const r = await runInSandbox({
      code: req.code,
      filename: req.filename,
      command: req.command.name,
      input: req.input,
      api,
      limits,
      deadline,
      signal: req.signal,
      cancelled: req.cancelled,
      onCall: (n) => calls.push(n),
    });
    json = r.json;
  } catch (error) {
    if (!(error instanceof SandboxError)) {
      throw error;
    }
    if (error.code === "plugin_limit") {
      throw new CliError(error.message, "plugin_limit", EXIT.ERROR, {
        fields: { limit: error.limit },
      });
    }
    if (error.code === "cancelled") {
      throw new CliError(
        "The plugin run was cancelled; nothing it had not finished was written",
        "cancelled",
        EXIT.ERROR
      );
    }
    if (error.guestCode === "flood_wait" && state.flood) {
      throw new CliError(
        `Telegram rate limit: retry after ${state.flood.retryAfterSeconds} s`,
        "flood_wait",
        EXIT.ERROR,
        {
          retryAfterSeconds: state.flood.retryAfterSeconds,
          fields: { cursor: state.flood.cursor, partial: state.flood.partial },
          hint: `Wait ${state.flood.retryAfterSeconds} s, then run the command again with the cursor.`,
        }
      );
    }
    if (error.guestCode === "secret_missing" && state.secretMissing) {
      const { name, command } = state.secretMissing;
      throw new CliError(
        `The plugin needs the secret "${name}", which is not set`,
        "secret_missing",
        EXIT.ERROR,
        {
          command,
          hint: `Ask the user to run this in a terminal on this computer and type the value there: ${humanCommand(command)}`,
        }
      );
    }
    throw new CliError(error.message, "plugin_error", EXIT.ERROR);
  }
  const data: unknown = JSON.parse(json);
  const issues = schemaIssues(req.command.output, data);
  if (issues.length) {
    throw new CliError(
      `The plugin's result does not match the output schema of "${req.command.name}": ${issuesText(issues)}`,
      "plugin_error",
      EXIT.ERROR,
      { fields: { issues } }
    );
  }
  const envelope: Envelope = {
    data: req.mcp ? maskDeep(data, "echo") : data,
    proposals: state.proposals,
  };
  const out = JSON.stringify(envelope);
  if (out.length > limits.outputChars) {
    throw new CliError(
      `The command's output is ${out.length} characters; the limit is ${limits.outputChars}`,
      "plugin_limit",
      EXIT.ERROR,
      { fields: { limit: "output" } }
    );
  }
  return { envelope, json: out, calls };
}

/** Plugin data in memory, for `plugin dev`. */
export function memoryStorage(m: Manifest): StorageBackend {
  const items = new Map<string, { value: string; updatedAt: string }>();
  const quota = m.storage?.quotaBytes ?? 256 * 1024;
  const used = () =>
    [...items.values()].reduce((n, i) => n + Buffer.byteLength(i.value), 0);
  return {
    get: (key) => items.get(key)?.value,
    list: () =>
      [...items.entries()].map(([key, i]) => ({
        key,
        bytes: Buffer.byteLength(i.value),
        updatedAt: i.updatedAt,
      })),
    set: async (key, value, guard) => {
      const bytes = Buffer.byteLength(value);
      const usedBytes =
        used() -
        (items.has(key) ? Buffer.byteLength(items.get(key)!.value) : 0) +
        bytes;
      if (usedBytes > quota) {
        throw new CliError(
          `Saving "${key}" would use ${usedBytes} of ${quota} bytes`,
          "plugin_limit",
          EXIT.ERROR
        );
      }
      assertMemoryGuard(guard);
      items.set(key, { value, updatedAt: new Date().toISOString() });
      return { bytes, usedBytes, quotaBytes: quota };
    },
    delete: async (key, guard) => {
      assertMemoryGuard(guard);
      return items.delete(key);
    },
  };
}

function assertMemoryGuard(guard: WriteGuard): void {
  if (guard.aborted() || Date.now() >= guard.deadline) {
    throw new CliError(
      "The plugin run ended before the write; nothing was written",
      "cancelled",
      EXIT.ERROR
    );
  }
}

/**
 * Cursor state in memory, for `plugin dev` and tests: the same random ids, expiry and bound as the
 * installation's folder, but gone with the process (a cursor never continues in the next run).
 */
export function memoryCursors(
  max = 64,
  ttlMs = 24 * 3600e3,
  now = () => Date.now()
): CursorStore {
  const items = new Map<string, { state: string; createdAt: number }>();
  return {
    save: (state) => {
      for (const [id, v] of items) {
        if (now() - v.createdAt > ttlMs) {
          items.delete(id);
        }
      }
      while (items.size >= max) {
        items.delete(items.keys().next().value!);
      }
      const id = randomBytes(16).toString("base64url");
      items.set(id, { state: JSON.stringify(state), createdAt: now() });
      return id;
    },
    load: (id) => {
      const v = items.get(id);
      if (!v || now() - v.createdAt > ttlMs) {
        return undefined;
      }
      return JSON.parse(v.state) as unknown;
    },
  };
}

/**
 * `host.log` of `plugin dev`: a file of its own, never the command's stdout or stderr. It lives in a
 * folder of this user's (`<tmp>/better-tg-cli-plugin-dev-<uid>`, 0700, checked to be a real folder
 * owned by the user) and is opened without following a link, so a shared tmp cannot redirect it.
 */
export function devLog(name: string): {
  path: string;
  write: (line: string) => void;
} {
  const uid =
    typeof process.getuid === "function" ? process.getuid() : undefined;
  const dir = join(
    tmpdir(),
    `better-tg-cli-plugin-dev${uid === undefined ? "" : `-${uid}`}`
  );
  const path = join(dir, `${name}.log`);
  return {
    path,
    write: (line) => {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const st = lstatSync(dir);
      if (
        !st.isDirectory() ||
        (uid !== undefined && (st.uid !== uid || (st.mode & 0o077) !== 0))
      ) {
        throw new CliError(
          `${dir} is not a private folder of this user; host.log is not written`,
          "plugin_data_unsafe",
          EXIT.ERROR
        );
      }
      const fd = openSync(
        path,
        constants.O_WRONLY |
          constants.O_APPEND |
          constants.O_CREAT |
          (constants.O_NOFOLLOW ?? 0),
        0o600
      );
      try {
        writeSync(
          fd,
          `${new Date().toISOString()} ${line.replaceAll("\n", "\\n")}\n`
        );
      } finally {
        closeSync(fd);
      }
    },
  };
}
