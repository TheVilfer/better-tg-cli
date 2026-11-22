import { errorDetails, errorJson, usageError } from "../../../src/errors.js";
import { devPlugin, devRun } from "../../../src/plugins/dev.js";
import type { CursorStore } from "../../../src/plugins/host.js";
import { memoryCursors, pluginTarget } from "../../../src/plugins/run.js";
import { readLocalSnapshot } from "../../../src/plugins/source.js";
import { VERSION } from "../../../src/version.js";
import type { Proposal } from "./host.js";

/** The Better-TG-CLI version whose checks this SDK carries: `engines.better-tg-cli` is matched against it. */
export const CLI_VERSION: string = VERSION;

/** One HTTP fixture, as in `dev/fixtures/*.json`: matched by method and exact URL. */
export interface HttpFixture {
  request: { method?: string; url: string };
  response: {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    bodyBase64?: string;
    json?: unknown;
  };
}

/**
 * How the test host runs a command: what `telegram plugin dev <dir> <cmd> --mock` does, plus what a
 * test may set. Telegram is the built-in mock account, storage starts empty, cursors live in memory
 * (for the run alone; createTestHost keeps them between runs).
 *
 * - `mock`: Must be `true`, as `plugin dev` runs only with `--mock`.
 * - `fixtures`: HTTP fixtures matched before the folder's `dev/fixtures/*.json`.
 * - `settings`: Stored settings, each checked against its schema (default: the manifest's defaults).
 * - `secrets`: Secret values instead of the `dev-secret-<name>` placeholders; `null` is a secret not set.
 * - `target`, `thread`: As `--target` and `--thread`.
 * - `log`: Gets each `host.log` line (default: dropped).
 */
export interface RunCommandOptions {
  mock: true;
  fixtures?: HttpFixture | HttpFixture[];
  settings?: Record<string, string | number | boolean>;
  secrets?: Record<string, string | null>;
  target?: string;
  thread?: boolean;
  log?: (line: string) => void;
  signal?: AbortSignal;
}

/**
 * What a run gives: the envelope `plugin dev` prints, as values and as the exact line.
 *
 * - `json`: The one line of compact JSON the CLI prints (its length is what the output limit counts).
 */
export interface CommandResult<D = unknown> {
  data: D;
  proposals: Proposal[];
  json: string;
}

/** The `error` object of the CLI's `--json` error line: `code`, `message` and the error's fields. */
export interface ErrorBody {
  code: string;
  message: string;
  hint?: string;
  command?: string[];
  retryAfterSeconds?: number;
  limit?: string;
  issues?: { path: string; message: string }[];
  [field: string]: unknown;
}

/** A failed run or check, with the code, exit code and fields the CLI would report. */
export class PluginRunError extends Error {
  /** The CLI's error code (`plugin_error`, `plugin_limit`, `invalid_argument`, `plugin_invalid`, …). */
  readonly code: string;
  /** The exit code `telegram plugin dev` would end with. */
  readonly exitCode: number;
  /** The error as the CLI's `--json` line has it. */
  readonly body: ErrorBody;

  constructor(error: unknown) {
    const details = errorDetails(error);
    const line = errorJson(details);
    super(details.message);
    this.name = "PluginRunError";
    this.code = details.code;
    this.exitCode = details.exitCode;
    this.body = (JSON.parse(line) as { error: ErrorBody }).error;
  }

  /** The exact line `telegram plugin dev … --json` prints for this error. */
  json(): string {
    return JSON.stringify({ error: this.body });
  }
}

function asError(error: unknown): PluginRunError {
  return error instanceof PluginRunError ? error : new PluginRunError(error);
}

function jsonInput(input: unknown): unknown {
  if (input === undefined) {
    return {};
  }
  let text: string | undefined;
  try {
    text = JSON.stringify(input);
  } catch (error) {
    throw usageError(`The input is not JSON: ${(error as Error).message}`);
  }
  if (text === undefined) {
    throw usageError("The input is not JSON");
  }
  return JSON.parse(text);
}

const mockOnly = () =>
  usageError("The test host runs only on mock data: pass { mock: true }");

async function runOnce<D>(
  dir: string,
  command: string,
  input: unknown,
  options: RunCommandOptions,
  cursorsOf?: (plugin: string) => CursorStore
): Promise<CommandResult<D>> {
  try {
    if (options?.mock !== true) {
      throw mockOnly();
    }
    const plugin = devPlugin(dir, command, CLI_VERSION);
    const target = pluginTarget(
      plugin.manifest,
      options.target,
      !!options.thread
    );
    const outcome = await devRun(plugin, {
      input: jsonInput(input),
      target,
      settings: options.settings,
      secrets: options.secrets,
      fixtures: options.fixtures,
      ...(cursorsOf ? { cursors: cursorsOf(plugin.manifest.name) } : {}),
      log: options.log ?? (() => undefined),
      signal: options.signal,
    });
    const { data, proposals } = outcome.envelope;
    return { data: data as D, proposals, json: outcome.json };
  } catch (error) {
    throw asError(error);
  }
}

/**
 * Runs one command of a plugin folder in the same QuickJS sandbox, with the same checks, mock
 * account and HTTP fixtures as `telegram plugin dev <dir> <command> --mock`, and gives the same
 * `{data, proposals}` (null fields kept). A failure throws PluginRunError with the CLI's code.
 * The folder's `main` (usually `dist/plugin.js`) runs: build it first. Its cursors end with the run,
 * as in `plugin dev`; to continue from one, use createTestHost.
 */
export function runCommand<D = unknown>(
  dir: string,
  command: string,
  input: unknown,
  options: RunCommandOptions
): Promise<CommandResult<D>> {
  return runOnce<D>(dir, command, input, options);
}

/** What one run of a TestHost may change: every option of RunCommandOptions except `mock`. */
export type TestRunOptions = Omit<RunCommandOptions, "mock">;

/**
 * Runs that share cursors: a cursor (or a `flood_wait`'s cursor) one run hands out continues in the
 * next, so a second page or a resume can be tested.
 *
 * - `run`: runCommand with the host's options, then `options` over them.
 */
export interface TestHost {
  run<D = unknown>(
    dir: string,
    command: string,
    input: unknown,
    options?: TestRunOptions
  ): Promise<CommandResult<D>>;
}

/**
 * A test host whose runs keep the cursor store between them, one store per plugin, with the rules of
 * an installation and `plugin dev`: random ids, 24 hours, the latest 64, bound to the account and to
 * the plugin (another plugin's cursor is refused with `invalid_cursor`). Everything else starts afresh
 * in each run, as in runCommand: the mock account, storage, settings.
 */
export function createTestHost(options: RunCommandOptions): TestHost {
  if (options?.mock !== true) {
    throw asError(mockOnly());
  }
  const stores = new Map<string, CursorStore>();
  const cursorsOf = (plugin: string) => {
    let store = stores.get(plugin);
    if (!store) {
      store = memoryCursors();
      stores.set(plugin, store);
    }
    return store;
  };
  return {
    run: <D>(
      dir: string,
      command: string,
      input: unknown,
      more: TestRunOptions = {}
    ) =>
      runOnce<D>(
        dir,
        command,
        input,
        { ...options, ...more, mock: true },
        cursorsOf
      ),
  };
}

/** What `telegram plugin validate <dir> --json` prints for a valid plugin. */
export interface ValidationResult {
  ok: true;
  name: string;
  version: string;
  specVersion: string;
  revision: string;
  files: number;
  bytes: number;
  install: string[];
}

/** Checks a plugin folder as `telegram plugin validate` does; an invalid one throws PluginRunError (`plugin_invalid` lists every problem). */
export function validatePlugin(dir: string): ValidationResult {
  try {
    const snap = readLocalSnapshot(dir, CLI_VERSION);
    return {
      ok: true,
      name: snap.manifest.name,
      version: snap.manifest.version,
      specVersion: snap.specVersion,
      revision: snap.revision,
      files: snap.files.size,
      bytes: snap.bytes,
      install: ["plugin", "install", dir, "--expect", snap.revision],
    };
  } catch (error) {
    throw asError(error);
  }
}
