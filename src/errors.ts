import { loginHint } from "./login-hint.js";
import type { Spinner } from "./spinner.js";

/**
 * Exit codes of every command (the setup contract, docs/setup-contract.md, keeps its own table
 * for the commands that emit it). `EXIT_NEEDS_APPROVAL` in src/approval.ts is the same 3.
 */
export const EXIT = {
  OK: 0,
  ERROR: 1,
  USAGE: 2,
  NEEDS_APPROVAL: 3,
  WRITE_DISABLED: 4,
  NOT_LOGGED_IN: 5,
} as const;

/** The table printed under `telegram --help`, also in skills/better-tg-cli/setup.md and docs/setup-contract.md. */
export const EXIT_CODES_HELP = [
  "Exit codes:",
  "  0  ok",
  "  1  runtime error (Telegram refused, network, chat or message not found)",
  "  2  usage: unknown option, invalid value, ambiguous chat name",
  '  3  write approval needed (write mode "ask"; see the printed action)',
  "  4  write access is disabled (telegram write-access)",
  "  5  not logged in, or the session ended (telegram onboard)",
  'With --json an error is one line on stdout: {"error":{"code","message","hint"?,"command"?,"candidates"?,"listedAt"?}}',
  '(exit 3 prints its own {"error":"approval_required",...} line).',
].join("\n");

/**
 * A chat offered when a name matched several chats or none.
 *
 * - `command`: The caller's own command again with this chat's ID in place of the name (argv without "telegram")
 */
export interface ChatCandidate {
  id: string;
  title: string;
  type: string;
  command?: string[];
}

/** The next step for a person or an agent, always one human-readable string. */
export type Hint = string;

/** A `telegram` argv as one line a POSIX shell runs unchanged (each odd argument single-quoted). */
export function shellCommand(argv: string[]): string {
  return [
    "telegram",
    ...argv.map((a) =>
      /^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replaceAll("'", `'\\''`)}'`
    ),
  ].join(" ");
}

/**
 * - `code`: Stable snake_case id an agent can branch on
 * - `message`: One line, without the candidate list or the hint
 * - `hint`: The next step in words (a fixed command may be quoted in it)
 * - `command`: A ready `telegram` command to run next, as argv without "telegram", built from the caller's own text: run it as is, never through a shell. The hint names the same command in shell form.
 * - `listedAt`: When the candidates came from the dialog list on disk: the time that list was read (ISO)
 * - `fields`: More fields of this error's JSON, after the ones above (a plugin run: `limit`, `cursor`, `partial`, `issues`)
 */
export interface ErrorDetails {
  code: string;
  message: string;
  hint?: Hint;
  command?: string[];
  candidates?: ChatCandidate[];
  retryAfterSeconds?: number;
  listedAt?: string;
  fields?: Record<string, unknown>;
}

/**
 * An error with a stable code and an exit code. `message` stays the full human text (summary,
 * candidates, hint) so code that only prints `error.message` still shows everything.
 */
export class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly summary: string;
  readonly hint?: Hint;
  readonly command?: string[];
  readonly candidates?: ChatCandidate[];
  readonly retryAfterSeconds?: number;
  readonly listedAt?: string;
  readonly fields?: Record<string, unknown>;

  constructor(
    summary: string,
    code: string,
    exitCode: number = EXIT.ERROR,
    extra: {
      hint?: Hint;
      command?: string[];
      candidates?: ChatCandidate[];
      retryAfterSeconds?: number;
      listedAt?: string;
      text?: string;
      fields?: Record<string, unknown>;
    } = {}
  ) {
    super(extra.text ?? humanText(summary, extra.candidates, extra.hint));
    this.name = "CliError";
    this.code = code;
    this.exitCode = exitCode;
    this.summary = summary;
    this.hint = extra.hint;
    this.command = extra.command;
    this.candidates = extra.candidates;
    this.retryAfterSeconds = extra.retryAfterSeconds;
    this.listedAt = extra.listedAt;
    this.fields = extra.fields;
  }
}

/** A value the command line got wrong: exit 2, code `invalid_argument`. */
export function usageError(message: string, hint?: string): CliError {
  return new CliError(message, "invalid_argument", EXIT.USAGE, { hint });
}

export function formatCandidates(
  candidates: ChatCandidate[],
  total = candidates.length
): string {
  const lines = candidates.map((c) => `  ${c.id} ${c.type} ${c.title}`);
  if (total > candidates.length) {
    lines.push(`  … and ${total - candidates.length} more`);
  }
  return lines.join("\n");
}

function humanText(
  summary: string,
  candidates?: ChatCandidate[],
  hint?: Hint
): string {
  return [
    summary,
    candidates?.length ? formatCandidates(candidates) : "",
    hint ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * RPC errors that mean this login is gone (the key was dropped or duplicated, the session revoked or
 * expired, the account deactivated), wherever they come: at connect or from any later call. Exit 5.
 * SESSION_PASSWORD_NEEDED is not one: a 2FA password still to enter is no reason to replace the
 * session (onboard/telegram_setup would), so it stays a plain telegram_rpc error, exit 1.
 */
export const SESSION_ERRORS: ReadonlySet<string> = new Set([
  "AUTH_KEY_UNREGISTERED",
  "AUTH_KEY_INVALID",
  "AUTH_KEY_PERM_EMPTY",
  "AUTH_KEY_DUPLICATED",
  "SESSION_EXPIRED",
  "SESSION_REVOKED",
  "USER_DEACTIVATED",
  "USER_DEACTIVATED_BAN",
]);

/** The RPC error name of a session that ended, if `error` is one. */
export function sessionEndedBy(error: unknown): string | undefined {
  const name = (error as { errorMessage?: unknown } | null)?.errorMessage;
  return typeof name === "string" && SESSION_ERRORS.has(name)
    ? name
    : undefined;
}

const NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EPIPE",
  "ECONNABORTED",
]);

/** A failure to reach Telegram at all (no RPC answer): a socket error, a timeout, a dropped connection. */
export function isNetworkError(error: unknown): boolean {
  const e = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
  } | null;
  if (!e || typeof e !== "object") {
    return false;
  }
  if (typeof e.code === "string" && NETWORK_CODES.has(e.code)) {
    return true;
  }
  if (e.name === "TimeoutError") {
    return true;
  }
  return (
    typeof e.message === "string" &&
    /^(Not connected|Disconnect|Connection (closed|refused|timed out)|TIMEOUT$)/i.test(
      e.message
    )
  );
}

/** What an error says, whatever threw it: our CliError, a Telegram RPC error or anything else. */
export function errorDetails(
  error: unknown
): ErrorDetails & { exitCode: number } {
  if (error instanceof CliError) {
    return {
      code: error.code,
      message: error.summary,
      exitCode: error.exitCode,
      ...(error.hint ? { hint: error.hint } : {}),
      ...(error.command ? { command: error.command } : {}),
      ...(error.candidates?.length ? { candidates: error.candidates } : {}),
      ...(error.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: error.retryAfterSeconds }),
      ...(error.listedAt ? { listedAt: error.listedAt } : {}),
      ...(error.fields ? { fields: error.fields } : {}),
    };
  }
  const rpc = error as {
    errorMessage?: unknown;
    seconds?: unknown;
    message?: unknown;
  } | null;
  if (rpc && typeof rpc.errorMessage === "string") {
    const message =
      typeof rpc.message === "string" ? rpc.message : rpc.errorMessage;
    const wait =
      typeof rpc.seconds === "number"
        ? rpc.seconds
        : /^FLOOD_(PREMIUM_)?WAIT_(\d+)/.exec(rpc.errorMessage)?.[2];
    const ended = sessionEndedBy(rpc);
    if (ended) {
      return {
        code: "session_expired",
        message: `Telegram ended this session (${ended})`,
        exitCode: EXIT.NOT_LOGGED_IN,
        hint: loginHint(),
      };
    }
    if (wait !== undefined && /FLOOD/.test(rpc.errorMessage)) {
      const seconds = Number(wait);
      return {
        code: "flood_wait",
        message,
        exitCode: EXIT.ERROR,
        retryAfterSeconds: seconds,
        hint: `Telegram rate limit: wait ${seconds} s, then run the command again.`,
      };
    }
    return { code: "telegram_rpc", message, exitCode: EXIT.ERROR };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (isNetworkError(error)) {
    return {
      code: "network",
      message: `Could not reach Telegram: ${message}`,
      exitCode: EXIT.ERROR,
      hint: "Check the connection, then run the command again.",
    };
  }
  return { code: "error", message, exitCode: EXIT.ERROR };
}

/** `--json` on this command line: errors then go to stdout as one JSON line. */
export function wantsJson(argv: string[] = process.argv.slice(2)): boolean {
  const end = argv.indexOf("--");
  return (end === -1 ? argv : argv.slice(0, end)).includes("--json");
}

/** The one JSON line an error prints with --json. */
export function errorJson(details: ErrorDetails): string {
  const {
    code,
    message,
    hint,
    command,
    candidates,
    retryAfterSeconds,
    listedAt,
    fields,
  } = details;
  return JSON.stringify({
    error: {
      ...fields,
      code,
      message,
      ...(hint ? { hint } : {}),
      ...(command ? { command } : {}),
      ...(candidates?.length ? { candidates } : {}),
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
      ...(listedAt ? { listedAt } : {}),
    },
  });
}

/**
 * Report a failed command and exit with its code. With --json: one JSON line on stdout and nothing
 * else. Otherwise the spinner's "✖ <label>" line (not over MCP, where it is noise for the model)
 * and the error text on stderr.
 */
export function fail(error: unknown, spinner?: Spinner, label?: string): never {
  if (error instanceof ExitSignal) {
    throw error;
  }
  const details = errorDetails(error);
  if (wantsJson()) {
    spinner?.stop();
    console.log(errorJson(details));
  } else {
    if (spinner && label && !process.env.TG_MCP) {
      spinner.fail(label);
    } else {
      spinner?.stop();
    }
    const text =
      error instanceof CliError
        ? error.message
        : [details.message, details.hint].filter(Boolean).join("\n");
    console.error(text);
  }
  process.exit(details.exitCode);
}

/**
 * Thrown by process.exit() once installDrainingExit() is in place: the exit itself waits for
 * stdout and stderr, and the throw makes sure no code after the call runs meanwhile (callers
 * rely on process.exit() never returning). `fail()` passes it on, the top level ignores it.
 */
export class ExitSignal extends Error {
  constructor() {
    super("exiting");
    this.name = "ExitSignal";
  }
}

/**
 * Make process.exit() wait until everything written to stdout and stderr has reached the reader.
 * A pipe is asynchronous on macOS and Windows: a plain exit right after a large write (a long JSON
 * error, a big --json result) cuts the output at the pipe buffer (64 KiB), and the agent gets half
 * an object. The first call decides the exit code; later calls (a catch that fails again) only stop
 * their caller.
 */
export function installDrainingExit(): void {
  const realExit = process.exit.bind(process) as (code?: number) => never;
  let exiting = false;
  process.exit = ((code?: number | string | null) => {
    if (!exiting) {
      exiting = true;
      if (code !== undefined && code !== null) {
        process.exitCode = Number(code);
      }
      const waiting = [process.stdout, process.stderr].filter(
        (s) => !s.destroyed && !s.writableEnded && s.writableLength > 0
      );
      if (!waiting.length) {
        realExit();
      }
      let pending = waiting.length;
      for (const stream of waiting) {
        stream.write("", () => {
          if (--pending === 0) {
            realExit();
          }
        });
      }
    }
    throw new ExitSignal();
  }) as typeof process.exit;
  process.on("uncaughtException", (error) => {
    if (error instanceof ExitSignal) {
      return;
    }
    try {
      fail(error);
    } catch {}
  });
  process.on("unhandledRejection", (error) => {
    if (error instanceof ExitSignal) {
      return;
    }
    try {
      fail(error);
    } catch {}
  });
}
