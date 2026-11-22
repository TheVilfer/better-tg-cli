import {
  apiChatRefs,
  declaredReadsStdin,
  describeParsedAction,
  oneLine,
  parsedAction,
  peerArgs,
} from "./approval-action.js";
import type { ParsedAction, PeerInfo } from "./approval-action.js";
import { prepareAction } from "./approval-prepare.js";
import type { Prepared } from "./approval-prepare.js";
import {
  approvalHash,
  consumeApproval,
  createApproval,
  EXIT_NEEDS_APPROVAL,
  MOCK_ACCOUNT,
  readsStdin,
  APPROVAL_TTL_MS,
  REJECT_HINT,
  STDIN_IN_APPROVAL_ENV,
} from "./approval.js";
import type { RejectReason } from "./approval.js";
import { setWriteContext } from "./audit.js";
import chalk from "./colors.js";
import { getSessionString } from "./config.js";
import {
  CliError,
  errorDetails,
  errorJson,
  EXIT,
  ExitSignal,
  wantsJson,
} from "./errors.js";
import type { ChatCandidate, Hint } from "./errors.js";
import { maskForModel } from "./mcp-output.js";
import { isMock, isMockAsk } from "./paths.js";
import { lookupPeers } from "./peer-lookup.js";
import { setStrictChatResolution } from "./resolve-mode.js";
import { readStdinOnce, sealStdin, stdinBody, stdinWasRead } from "./text.js";
import { describeWriteState, parseWriteState } from "./write-state.js";
import {
  CLOUD_HINT,
  getWriteValue,
  isFileFallbackAllowed,
  isWriteModeProtected,
  secretStoreHint,
} from "./write-store.js";

/**
 * Set by the MCP server only (childEnv strips it otherwise) for one extra run of a write before it
 * asks the user in a dialog: the guard prints the action's description and approval hash, and the
 * process exits before anything is written, whatever the write mode. No code is created or used.
 */
export const DESCRIBE_ENV = "TG_APPROVAL_DESCRIBE";
/** Prefix of the one stdout line a describe run prints (JSON follows). */
export const DESCRIBE_MARK = "TG_APPROVAL_DESCRIPTION ";
/** Exit code of a describe run: never 0, so a caller can't mistake it for a write that ran. */
export const EXIT_DESCRIBED = 4;

function stop(
  error: CliError,
  argv: string[] = process.argv.slice(2),
  prose?: string
): never {
  if (wantsJson(argv)) {
    console.log(errorJson(errorDetails(error)));
  }
  console.error(chalk.red(prose ?? error.summary));
  if (error.hint && prose === undefined) {
    console.error(chalk.gray(error.hint));
  }
  process.exit(error.exitCode);
}

/**
 * `apiParams`: the params a raw API call (`api`, a generated command) will send; the chats named in
 * them (`{"_chat": …}`) are recipients like any argument.
 */
export interface GuardOptions {
  readsStdin?: boolean;
  apiParams?: Record<string, unknown>;
}

/**
 * `readsStdin`: the command takes its body from stdin, as its parsed options say (`-p-`, `-c -`,
 * `--json-params=-` …). The guard also covers stdin when the argv shows a "-" or "=-", when the
 * command already read it, or when the MCP server handed it over; any of them is enough.
 *
 * Async: in mode "ask" it looks up the recipients (a read) to show and bind them. Every caller
 * awaits it before doing anything else (test/guard-awaited.test.ts checks the sources).
 */
export async function assertWriteEnabled(
  argv: string[] = process.argv.slice(2),
  opts: GuardOptions = {}
): Promise<void> {
  if (process.env.TG_READ_ONLY) {
    stop(
      new CliError(
        "This command changes something; it cannot run as a read (use telegram_write).",
        "write_on_read_tool",
        EXIT.ERROR
      ),
      argv
    );
  }
  setStrictChatResolution(true);
  if (process.env[DESCRIBE_ENV] === "1") {
    return describeAndExit(argv, opts);
  }
  if (isMock()) {
    if (isMockAsk()) {
      await requireApproval(argv, opts);
    } else if (process.env.TG_APPROVE) {
      await requireGivenCode(argv, opts);
    }
    return;
  }
  if (!isWriteModeProtected() && !isFileFallbackAllowed()) {
    stop(
      new CliError(
        "Write access needs the secret store, which is unavailable right now (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password).",
        "secret_store_unavailable",
        EXIT.ERROR,
        {
          hint: `This ensures write permissions cannot be tampered with via config files.\n${secretStoreHint()}`,
        }
      ),
      argv
    );
  }
  const state = parseWriteState(getWriteValue());
  if (!state.enabled) {
    if (wantsJson(argv)) {
      console.log(
        errorJson({
          code: "write_disabled",
          message: `Write access is disabled (${describeWriteState(state)})`,
          hint: process.env.TG_MCP
            ? "Ask the user: call telegram_setup, or run `telegram write-access ask` in a terminal"
            : "telegram write-access ask",
        })
      );
    }
    console.error(
      chalk.red(`Write access is disabled (${describeWriteState(state)}).`)
    );
    if (process.env.TG_MCP) {
      console.error(
        chalk.gray(
          "Writes are turned on by the user, not over MCP. Ask the user to do one of these: call telegram_setup and open the page it " +
            'returns, where they choose "ask before each write"; or run `telegram write-access ask` in a terminal on this computer ' +
            "(Terminal on macOS, PowerShell on Windows)."
        )
      );
    } else {
      console.error(
        chalk.gray(
          "To write, run `telegram write-access ask`: then each write waits for the user's yes in the chat. Writing without asking (`write-access on`) needs the user's own confirmation."
        )
      );
    }
    if (!isWriteModeProtected()) {
      console.error(chalk.gray(CLOUD_HINT));
    }
    process.exit(EXIT.WRITE_DISABLED);
  }
  if (state.mode === "ask") {
    await requireApproval(argv, opts);
  } else {
    if (process.env.TG_APPROVE) {
      await requireGivenCode(argv, opts);
    }
    setWriteContext({ writeMode: "on", ...unprotectedFlag() });
  }
}

/**
 * `fixedDestination`: the command writes only where the CLI decides (plugin data under the profile's
 * own folder), never a path the model picks. `readsStdin`: as in GuardOptions.
 */
export interface LocalWriteOptions {
  fixedDestination?: boolean;
  readsStdin?: boolean;
}

/**
 * download, sync, avatar and plugin data only write local files, so in a terminal they need no write
 * access. Over MCP (TG_MCP, set for every call) they follow the write mode like any write: refused
 * in read-only, an approval each in "ask". A read (TG_READ_ONLY) never writes a file. Under TG_MOCK a
 * write needs no approval, so over MCP the commands whose path the model picks (download, sync,
 * avatar) are refused outright: the model would otherwise write real files wherever it likes. A
 * fixed destination (plugin data) is in the mock profile's own folder, so it follows the mock's rules.
 */
export async function assertLocalWriteAllowed(
  argv: string[] = process.argv.slice(2),
  opts: LocalWriteOptions = {}
): Promise<void> {
  if (!process.env.TG_MCP && !process.env.TG_READ_ONLY) {
    return;
  }
  if (
    isMock() &&
    !opts.fixedDestination &&
    !process.env.TG_READ_ONLY &&
    process.env[DESCRIBE_ENV] !== "1"
  ) {
    stop(
      new CliError(
        "Over MCP in mock mode (TG_MOCK), download, sync and avatar write no local files. Run them in a terminal, or unset TG_MOCK.",
        "not_in_mock",
        EXIT.ERROR
      ),
      argv
    );
  }
  await assertWriteEnabled(argv, opts.readsStdin ? { readsStdin: true } : {});
}

const unprotectedFlag = () =>
  isMock() || isWriteModeProtected() ? {} : { unprotected: true as const };

interface Scope {
  covered: boolean;
  stdin: string | undefined;
  action: ParsedAction;
  peers: Map<string, PeerInfo>;
  prepared: Prepared;
  hash: string;
}

interface Why {
  code?: string;
  exitCode?: number;
  message?: string;
  candidates?: ChatCandidate[];
  hint?: Hint;
  command?: string[];
  retryAfterSeconds?: number;
}
const nothingToApprove = (
  argv: string[],
  text: string,
  why: Why = {}
): never => {
  const known = why.code && why.code !== "error";
  const error = new CliError(
    `Not sent, nothing to approve: ${oneLine(why.message ?? text)}`,
    known ? why.code! : "nothing_to_approve",
    known ? (why.exitCode ?? EXIT.ERROR) : EXIT.ERROR,
    {
      ...(why.candidates ? { candidates: why.candidates } : {}),
      ...(why.hint ? { hint: why.hint } : {}),
      ...(why.command ? { command: why.command } : {}),
      ...(why.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: why.retryAfterSeconds }),
    }
  );
  return stop(error, argv, `Not sent, nothing to approve: ${oneLine(text)}`);
};

async function approvalScope(
  argv: string[],
  opts: GuardOptions
): Promise<Scope> {
  const action = parsedAction(argv);
  const declared = declaredReadsStdin(action);
  const covered =
    opts.readsStdin === true ||
    (declared ?? readsStdin(argv)) ||
    stdinWasRead() ||
    process.env[STDIN_IN_APPROVAL_ENV] === "1";
  const stdin = covered ? stdinBody(readStdinOnce()) : undefined;
  if (opts.apiParams && action.parsed) {
    action.apiPeers = apiChatRefs(opts.apiParams);
  }
  let peers = new Map<string, PeerInfo>();
  try {
    peers = await lookupPeers(peerArgs(action));
  } catch (error) {
    if (error instanceof ExitSignal) {
      throw error;
    }
    const { code, exitCode, message, hint, command, retryAfterSeconds } =
      errorDetails(error);
    stop(
      new CliError(
        `Not sent: could not look up the recipient (${oneLine(message)}).`,
        code,
        exitCode,
        {
          ...(hint ? { hint } : {}),
          ...(command ? { command } : {}),
          ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
        }
      ),
      argv
    );
  }
  for (const info of peers.values()) {
    if (!info.ok) {
      nothingToApprove(argv, info.error, info);
    }
  }
  let prepared: Prepared;
  try {
    prepared = await prepareAction(action);
  } catch (error) {
    if (error instanceof ExitSignal) {
      throw error;
    }
    const text = (error instanceof Error ? error.message : String(error))
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("; ");
    return nothingToApprove(argv, text, errorDetails(error));
  }
  return {
    covered,
    stdin,
    action,
    peers,
    prepared,
    hash: approvalHash(action, peers, stdin, prepared.bound),
  };
}

const currentAccount = (): string | undefined =>
  isMock() ? MOCK_ACCOUNT : getSessionString();

async function requireGivenCode(
  argv: string[],
  opts: GuardOptions
): Promise<void> {
  const session = currentAccount();
  const { covered, hash, prepared } = await approvalScope(argv, opts);
  const used = consumeApproval(process.env.TG_APPROVE!, hash, session);
  if (!used.ok) {
    stop(
      new CliError(
        `Not sent: approval ${oneLine(process.env.TG_APPROVE!.trim().toUpperCase())} not accepted: ${used.reason} (${REJECT_HINT[used.kind]}).`,
        used.kind === "another_account"
          ? "approval_other_account"
          : "approval_not_accepted",
        EXIT.ERROR,
        {
          hint: process.env.TG_MCP
            ? 'Call telegram_write again without "approval".'
            : "Run the command again without TG_APPROVE.",
        }
      ),
      argv
    );
  }
  prepared.onApproved();
  if (!covered) {
    sealStdin();
  }
}

function shownStdin(
  scope: Scope,
  argv: string[],
  opts: GuardOptions
): string | undefined {
  const reads =
    opts.readsStdin === true ||
    (declaredReadsStdin(scope.action) ?? readsStdin(argv));
  return scope.stdin === "" && !reads ? undefined : scope.stdin;
}

function actionJson(
  scope: Scope,
  shown: string | undefined,
  description: string
) {
  const recipients = [...scope.peers].map(([given, info]) =>
    info.ok
      ? {
          given,
          id: info.id,
          name: info.title,
          type: info.type,
          ...(info.username ? { username: info.username } : {}),
        }
      : { given, error: info.error }
  );
  return {
    description,
    ...(recipients.length ? { recipients } : {}),
    argv: scope.action.argv,
    ...(shown === undefined ? {} : { stdin: shown }),
  };
}

async function describeAndExit(
  argv: string[],
  opts: GuardOptions
): Promise<never> {
  const scope = await approvalScope(argv, opts);
  const shown = shownStdin(scope, argv, opts);
  const description = describeParsedAction(
    scope.action,
    scope.peers,
    shown,
    scope.prepared.lines
  );
  console.log(
    DESCRIBE_MARK +
      JSON.stringify({
        hash: scope.hash,
        description,
        action: actionJson(scope, shown, description),
      })
  );
  process.exit(EXIT_DESCRIBED);
}

const shellQuote = (a: string) =>
  /^[\w@./:=+,-]+$/.test(a) ? a : `'${a.replaceAll("'", `'\\''`)}'`;
const psQuote = (a: string) =>
  /^[\w@./:=+,-]+$/.test(a) ? a : `'${a.replaceAll("'", `''`)}'`;

async function requireApproval(
  argv: string[],
  opts: GuardOptions
): Promise<void> {
  const session = currentAccount();
  const scope = await approvalScope(argv, opts);
  const given = process.env.TG_APPROVE;
  let rejected:
    | { code: string; reason: RejectReason; message: string }
    | undefined;
  if (given) {
    const used = consumeApproval(given, scope.hash, session);
    if (used.ok) {
      setWriteContext({
        writeMode: "ask",
        approvedVia: used.via,
        ...unprotectedFlag(),
      });
      scope.prepared.onApproved();
      if (!scope.covered) {
        sealStdin();
      }
      return;
    }
    rejected = {
      code: oneLine(given.trim().toUpperCase()),
      reason: used.kind,
      message: used.reason,
    };
  }
  const code = createApproval(scope.hash, session);
  const minutes = APPROVAL_TTL_MS / 60_000;
  const shown = shownStdin(scope, argv, opts);
  const mcp = !!process.env.TG_MCP;
  const description = mcp
    ? describeParsedAction(
        scope.action,
        scope.peers,
        shown,
        scope.prepared.modelLines ?? scope.prepared.lines,
        (t) => maskForModel(t, "echo")
      )
    : describeParsedAction(
        scope.action,
        scope.peers,
        shown,
        scope.prepared.lines
      );
  const retry = mcp
    ? undefined
    : { argv: ["telegram", ...argv], env: { TG_APPROVE: code } };
  if (argv.includes("--json") || mcp) {
    console.log(
      JSON.stringify({
        error: "approval_required",
        code,
        action: actionJson(scope, shown, description),
        expiresInMinutes: minutes,
        ...(rejected ? { rejected } : {}),
        ...(retry ? { retry } : {}),
      })
    );
  }
  if (rejected) {
    console.error(
      chalk.yellow(
        `Approval ${rejected.code} not accepted: ${rejected.message} (${REJECT_HINT[rejected.reason]}). A new one is below.`
      )
    );
  }
  console.error(
    chalk.yellow(
      'Approval needed: write mode is "ask", so the user approves each write.'
    )
  );
  console.error(
    `Show the user this action word for word and ask for an explicit yes:\n${description}`
  );
  if (mcp) {
    console.error(
      chalk.gray(
        `After a yes, call telegram_write again with the same args and stdin plus "approval": "${code}". The code works once, ` +
          `for this exact action and text, for ${minutes} minutes. Never approve on the user's behalf.`
      )
    );
  } else {
    const stdinNote = scope.covered ? " with the same text on stdin" : "";
    const printable = argv.every((a) => oneLine(a) === a);
    const lines = printable
      ? `  TG_APPROVE=${code} telegram ${argv.map(shellQuote).join(" ")}\n` +
        `  (PowerShell: $env:TG_APPROVE='${code}'; telegram ${argv.map(psQuote).join(" ")}; Remove-Item Env:TG_APPROVE)\n`
      : "  (The command has line breaks or control characters, so it is not repeated here: pass the same arguments exactly as before. " +
        "With --json the exact command is in retry.argv.)\n";
    console.error(
      chalk.gray(
        `After a yes, run the same command again${stdinNote} with TG_APPROVE=${code} in its environment:\n${
          lines
        }The code works once, for this exact action and text, for ${minutes} minutes; flag order and --json may differ. ` +
          `Never approve on the user's behalf.`
      )
    );
  }
  process.exit(EXIT_NEEDS_APPROVAL);
}
