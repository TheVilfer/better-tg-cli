import type { Spinner } from './spinner.js';

/**
 * Exit codes of every command (the setup contract, docs/setup-contract.md, keeps its own table
 * for the commands that emit it). `EXIT_NEEDS_APPROVAL` in src/approval.ts is the same 3.
 */
export const EXIT = {
  OK: 0,
  /** Anything that went wrong at run time: Telegram refused, the network failed, chat not found … */
  ERROR: 1,
  /** The command line itself is wrong: unknown option, a value that does not parse, an ambiguous name */
  USAGE: 2,
  /** A write in mode "ask" waits for the user's yes (src/guard.ts) */
  NEEDS_APPROVAL: 3,
  /** Write access is off for this profile */
  WRITE_DISABLED: 4,
  /** No login on this profile, or Telegram ended the session */
  NOT_LOGGED_IN: 5,
} as const;

/** The table printed under `telegram --help`, also in skills/better-tg-cli/reference.md and docs/setup-contract.md. */
export const EXIT_CODES_HELP = [
  'Exit codes:',
  '  0  ok',
  '  1  runtime error (Telegram refused, network, chat or message not found)',
  '  2  usage: unknown option, invalid value, ambiguous chat name',
  '  3  write approval needed (write mode "ask"; see the printed action)',
  '  4  write access is disabled (telegram write-access)',
  '  5  not logged in, or the session ended (telegram onboard)',
  'With --json an error is one line on stdout: {"error":{"code","message","hint"?,"candidates"?}}',
  '(exit 3 prints its own {"error":"approval_required",...} line).',
].join('\n');

/** A chat offered when a name matched several chats or none. */
export interface ChatCandidate {
  id: string;
  title: string;
  type: string;
  username?: string;
}

export interface ErrorDetails {
  /** Stable snake_case id an agent can branch on */
  code: string;
  /** One line, without the candidate list or the hint */
  message: string;
  /** The next step: a command or an action */
  hint?: string;
  candidates?: ChatCandidate[];
  retryAfterSeconds?: number;
}

/**
 * An error with a stable code and an exit code. `message` stays the full human text (summary,
 * candidates, hint) so code that only prints `error.message` still shows everything.
 */
export class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly summary: string;
  readonly hint?: string;
  readonly candidates?: ChatCandidate[];
  readonly retryAfterSeconds?: number;

  constructor(
    summary: string,
    code: string,
    exitCode: number = EXIT.ERROR,
    extra: { hint?: string; candidates?: ChatCandidate[]; retryAfterSeconds?: number; text?: string } = {},
  ) {
    super(extra.text ?? humanText(summary, extra.candidates, extra.hint));
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
    this.summary = summary;
    this.hint = extra.hint;
    this.candidates = extra.candidates;
    this.retryAfterSeconds = extra.retryAfterSeconds;
  }
}

/** A value the command line got wrong: exit 2, code `invalid_argument`. */
export function usageError(message: string, hint?: string): CliError {
  return new CliError(message, 'invalid_argument', EXIT.USAGE, { hint });
}

export function formatCandidates(candidates: ChatCandidate[], total = candidates.length): string {
  const lines = candidates.map(c => `  ${c.id} ${c.type} ${c.title}${c.username ? ` @${c.username}` : ''}`);
  if (total > candidates.length) lines.push(`  … and ${total - candidates.length} more`);
  return lines.join('\n');
}

function humanText(summary: string, candidates?: ChatCandidate[], hint?: string): string {
  return [summary, candidates?.length ? formatCandidates(candidates) : '', hint ?? ''].filter(Boolean).join('\n');
}

/** What an error says, whatever threw it: our CliError, a Telegram RPC error or anything else. */
export function errorDetails(error: unknown): ErrorDetails & { exitCode: number } {
  if (error instanceof CliError) {
    return {
      code: error.code, message: error.summary, exitCode: error.exitCode,
      ...(error.hint ? { hint: error.hint } : {}),
      ...(error.candidates?.length ? { candidates: error.candidates } : {}),
      ...(error.retryAfterSeconds !== undefined ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    };
  }
  const rpc = error as { errorMessage?: unknown; seconds?: unknown; message?: unknown } | null;
  if (rpc && typeof rpc.errorMessage === 'string') {
    const message = typeof rpc.message === 'string' ? rpc.message : rpc.errorMessage;
    const wait = typeof rpc.seconds === 'number' ? rpc.seconds : /^FLOOD_(PREMIUM_)?WAIT_(\d+)/.exec(rpc.errorMessage)?.[2];
    if (wait !== undefined && /FLOOD/.test(rpc.errorMessage)) {
      const seconds = Number(wait);
      return { code: 'flood_wait', message, exitCode: EXIT.ERROR, retryAfterSeconds: seconds, hint: `Telegram rate limit: wait ${seconds} s, then run the command again.` };
    }
    return { code: 'telegram_rpc', message, exitCode: EXIT.ERROR };
  }
  return { code: 'error', message: error instanceof Error ? error.message : String(error), exitCode: EXIT.ERROR };
}

/** `--json` on this command line: errors then go to stdout as one JSON line. */
export function wantsJson(argv: string[] = process.argv.slice(2)): boolean {
  const end = argv.indexOf('--');
  return (end === -1 ? argv : argv.slice(0, end)).includes('--json');
}

/** The one JSON line an error prints with --json. */
export function errorJson(details: ErrorDetails): string {
  const { code, message, hint, candidates, retryAfterSeconds } = details;
  return JSON.stringify({
    error: {
      code, message,
      ...(hint ? { hint } : {}),
      ...(candidates?.length ? { candidates } : {}),
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    },
  });
}

/**
 * Report a failed command and exit with its code. With --json: one JSON line on stdout and nothing
 * else. Otherwise the spinner's "✖ <label>" line (not over MCP, where it is noise for the model)
 * and the error text on stderr.
 */
export function fail(error: unknown, spinner?: Spinner, label?: string): never {
  const details = errorDetails(error);
  if (wantsJson()) {
    spinner?.stop();
    console.log(errorJson(details));
  } else {
    if (spinner && label && !process.env.TG_MCP) spinner.fail(label);
    else spinner?.stop();
    const text = error instanceof CliError ? error.message
      : [details.message, details.hint].filter(Boolean).join('\n');
    console.error(text);
  }
  process.exit(details.exitCode);
}
