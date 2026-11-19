import { CLOUD_HINT, getWriteValue, isFileFallbackAllowed, isWriteModeProtected, secretStoreHint } from './write-store.js';
import { describeWriteState, parseWriteState } from './write-state.js';
import chalk from './colors.js';
import { setStrictChatResolution } from './resolve-mode.js';
import { isMock, isMockAsk } from './paths.js';
import {
  approvalHash, consumeApproval, createApproval, EXIT_NEEDS_APPROVAL, MOCK_ACCOUNT, readsStdin,
  APPROVAL_TTL_MS, REJECT_HINT, STDIN_IN_APPROVAL_ENV, type RejectReason,
} from './approval.js';
import { apiChatRefs, declaredReadsStdin, describeParsedAction, oneLine, parsedAction, peerArgs, type ParsedAction, type PeerInfo } from './approval-action.js';
import { prepareAction, type Prepared } from './approval-prepare.js';
import { lookupPeers } from './peer-lookup.js';
import { readStdinOnce, sealStdin, stdinWasRead } from './text.js';
import { setWriteContext } from './audit.js';
import { getSessionString } from './config.js';
import { CliError, errorDetails, errorJson, EXIT, ExitSignal, wantsJson } from './errors.js';

/**
 * Set by the MCP server only (childEnv strips it otherwise) for one extra run of a write before it
 * asks the user in a dialog: the guard prints the action's description and approval hash, and the
 * process exits before anything is written, whatever the write mode. No code is created or used.
 */
export const DESCRIBE_ENV = 'TG_APPROVAL_DESCRIBE';
/** Prefix of the one stdout line a describe run prints (JSON follows). */
export const DESCRIBE_MARK = 'TG_APPROVAL_DESCRIPTION ';
/** Exit code of a describe run: never 0, so a caller can't mistake it for a write that ran. */
export const EXIT_DESCRIBED = 4;

/**
 * Every stop of the guard short of an approval: with --json one error line on stdout
 * ({"error":{"code","message","hint"?}}, as fail() prints), and the prose on stderr in any case,
 * since the person or the agent reads it there. The exit code is the error's own.
 */
function stop(error: CliError, argv: string[] = process.argv.slice(2)): never {
  const { code, message, hint } = errorDetails(error);
  if (wantsJson(argv)) console.log(errorJson({ code, message, ...(hint ? { hint } : {}) }));
  console.error(chalk.red(error.summary));
  if (error.hint) console.error(chalk.gray(typeof error.hint === 'string' ? error.hint : error.hint.join(' ')));
  process.exit(error.exitCode);
}

/**
 * `apiParams`: the params a raw API call (`api`, a generated command) will send; the chats named in
 * them (`{"_chat": …}`) are recipients like any argument.
 */
export interface GuardOptions { readsStdin?: boolean; apiParams?: Record<string, unknown> }

/**
 * `readsStdin`: the command takes its body from stdin, as its parsed options say (`-p-`, `-c -`,
 * `--json-params=-` …). The guard also covers stdin when the argv shows a "-" or "=-", when the
 * command already read it, or when the MCP server handed it over; any of them is enough.
 *
 * Async: in mode "ask" it looks up the recipients (a read) to show and bind them. Every caller
 * awaits it before doing anything else (test/guard-awaited.test.ts checks the sources).
 */
export async function assertWriteEnabled(argv: string[] = process.argv.slice(2), opts: GuardOptions = {}): Promise<void> {
  // Set by the MCP read tool: a hard stop even if a write command was misclassified as a read
  if (process.env.TG_READ_ONLY) {
    stop(new CliError('This command changes something; it cannot run as a read (use telegram_write).', 'write_on_read_tool', EXIT.ERROR), argv);
  }
  // Writes match chats strictly, and so does the lookup of the recipients below
  setStrictChatResolution(true);
  if (process.env[DESCRIBE_ENV] === '1') return describeAndExit(argv, opts);
  if (isMock()) {
    // A mock write only changes a local file: getClient() hands out the mock under the same check,
    // so there is nothing for a human to approve, unless TG_MOCK_ASK=1 rehearses the "ask" flow.
    // A code given for this call still has to hold, as in mode "on".
    if (isMockAsk()) await requireApproval(argv, opts);
    else if (process.env.TG_APPROVE) await requireGivenCode(argv, opts);
    return;
  }
  if (!isWriteModeProtected() && !isFileFallbackAllowed()) {
    stop(new CliError('Write access needs the secret store, which is unavailable right now (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password).', 'secret_store_unavailable', EXIT.ERROR, {
      hint: `This ensures write permissions cannot be tampered with via config files.\n${secretStoreHint()}`,
    }), argv);
  }
  const state = parseWriteState(getWriteValue());
  if (!state.enabled) {
    // A code of its own (4) and, with --json, one JSON line: the agent's next step is to ask the user
    if (wantsJson(argv)) {
      console.log(errorJson({
        code: 'write_disabled', message: `Write access is disabled (${describeWriteState(state)})`,
        hint: process.env.TG_MCP ? 'Ask the user: call telegram_setup, or run `telegram write-access ask` in a terminal' : 'telegram write-access ask',
      }));
    }
    console.error(chalk.red(`Write access is disabled (${describeWriteState(state)}).`));
    if (process.env.TG_MCP) {
      console.error(chalk.gray(
        'Writes are turned on by the user, not over MCP. Ask the user to do one of these: call telegram_setup and open the page it ' +
        'returns, where they choose "ask before each write"; or run `telegram write-access ask` in a terminal on this computer ' +
        '(Terminal on macOS, PowerShell on Windows).',
      ));
    } else {
      console.error(chalk.gray('To write, run `telegram write-access ask`: then each write waits for the user\'s yes in the chat. Writing without asking (`write-access on`) needs the user\'s own confirmation.'));
    }
    if (!isWriteModeProtected()) console.error(chalk.gray(CLOUD_HINT));
    process.exit(EXIT.WRITE_DISABLED);
  }
  if (state.mode === 'ask') await requireApproval(argv, opts);
  else {
    // A code given for this call (the MCP dialog's yes) still binds it to the action and the
    // account it was approved for, even if the mode turned "on" meanwhile
    if (process.env.TG_APPROVE) await requireGivenCode(argv, opts);
    setWriteContext({ writeMode: 'on', ...unprotectedFlag() });
  }
}

/**
 * download, sync and avatar only write local files, so in a terminal they need no write access. Over
 * MCP (TG_MCP, set for every call) the model picks the path, so they follow the write mode like any
 * write: refused in read-only, an approval each in "ask". A read (TG_READ_ONLY) never writes a file.
 * Under TG_MOCK a write needs no approval, so over MCP these are refused outright: the model would
 * otherwise write real files wherever it likes.
 */
export async function assertLocalWriteAllowed(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (!process.env.TG_MCP && !process.env.TG_READ_ONLY) return;
  if (isMock() && !process.env.TG_READ_ONLY && process.env[DESCRIBE_ENV] !== '1') {
    stop(new CliError('Over MCP in mock mode (TG_MOCK), download, sync and avatar write no local files. Run them in a terminal, or unset TG_MOCK.', 'not_in_mock', EXIT.ERROR), argv);
  }
  await assertWriteEnabled(argv);
}

// The mock account has no store to ask about (and must not probe the real one)
const unprotectedFlag = () => (isMock() || isWriteModeProtected() ? {} : { unprotected: true as const });

interface Scope {
  covered: boolean;
  stdin: string | undefined;
  action: ParsedAction;
  peers: Map<string, PeerInfo>;
  prepared: Prepared;
  hash: string;
}

/**
 * A write that is certain to fail (a recipient, file, message or button that cannot be read) gets
 * no code. It keeps the code and exit code of the error behind it (an ambiguous name stays a usage
 * error, exit 2), or `nothing_to_approve`, exit 1.
 */
const nothingToApprove = (argv: string[], message: string, why: { code?: string; exitCode?: number } = {}): never => {
  // The message may quote what was typed: never let it act on the terminal
  const known = why.code && why.code !== 'error';
  return stop(new CliError(`Not sent, nothing to approve: ${oneLine(message)}`, known ? why.code! : 'nothing_to_approve', known ? why.exitCode ?? EXIT.ERROR : EXIT.ERROR), argv);
};

/**
 * What an approval for this call covers: the parsed action with its recipients looked up, and stdin
 * when anything reads it. A failure to connect for the lookup stops here: the write could not run.
 */
async function approvalScope(argv: string[], opts: GuardOptions): Promise<Scope> {
  const action = parsedAction(argv);
  // A curated command covers stdin only where it reads it (`set-bio -` sets the bio to "-")
  const declared = declaredReadsStdin(action);
  const covered = opts.readsStdin === true || (declared ?? readsStdin(argv)) || stdinWasRead() || process.env[STDIN_IN_APPROVAL_ENV] === '1';
  const stdin = covered ? readStdinOnce() : undefined;
  if (opts.apiParams && action.parsed) action.apiPeers = apiChatRefs(opts.apiParams);
  let peers = new Map<string, PeerInfo>();
  try {
    peers = await lookupPeers(peerArgs(action));
  } catch (e) {
    // A process.exit() already on its way (installDrainingExit) keeps its code
    if (e instanceof ExitSignal) throw e;
    // Not logged in (5), no network (1) …: the write could not run either
    const { code, exitCode } = errorDetails(e);
    stop(new CliError(`Not sent: could not look up the recipient (${oneLine(e instanceof Error ? e.message : String(e))}).`, code, exitCode, {
      ...(e instanceof CliError && e.hint ? { hint: e.hint } : {}),
    }), argv);
  }
  // Every recipient is approved as the ID it resolves to; one that does not resolve (the write
  // would fail, or find someone else) gets no code
  for (const info of peers.values()) if (!info.ok) nothingToApprove(argv, info.error, info);
  let prepared: Prepared;
  try {
    prepared = await prepareAction(action);
  } catch (e) {
    if (e instanceof ExitSignal) throw e;
    return nothingToApprove(argv, e instanceof Error ? e.message : String(e), errorDetails(e));
  }
  return { covered, stdin, action, peers, prepared, hash: approvalHash(action, peers, stdin, prepared.bound) };
}

/** The account an approval binds to: the profile's stored session (a fixed one for the mock account). */
const currentAccount = (): string | undefined => (isMock() ? MOCK_ACCOUNT : getSessionString());

/**
 * A code given for this call outside mode "ask" (the mode turned "on" while the user answered the
 * MCP dialog, or the mock account): it must still be a valid approval of exactly this action in this
 * account. Any refusal stops the write: a "yes" to an older version of it is no "yes" to this one.
 */
async function requireGivenCode(argv: string[], opts: GuardOptions): Promise<void> {
  const session = currentAccount();
  const { covered, hash, prepared } = await approvalScope(argv, opts);
  const used = consumeApproval(process.env.TG_APPROVE!, hash, session);
  if (!used.ok) {
    stop(new CliError(
      `Not sent: approval ${oneLine(process.env.TG_APPROVE!.trim().toUpperCase())} not accepted: ${used.reason} (${REJECT_HINT[used.kind]}).`,
      used.kind === 'another_account' ? 'approval_other_account' : 'approval_not_accepted', EXIT.ERROR,
      { hint: process.env.TG_MCP ? 'Call telegram_write again without "approval".' : 'Run the command again without TG_APPROVE.' },
    ), argv);
  }
  prepared.onApproved();
  if (!covered) sealStdin();
}

/** The body as the person should see it: an empty stdin the MCP server always hands over says nothing. */
function shownStdin(scope: Scope, argv: string[], opts: GuardOptions): string | undefined {
  const reads = opts.readsStdin === true || (declaredReadsStdin(scope.action) ?? readsStdin(argv));
  return scope.stdin === '' && !reads ? undefined : scope.stdin;
}

/** The action for the JSON answer: what the person reads, and the parts an agent may want on their own. */
function actionJson(scope: Scope, shown: string | undefined, description: string) {
  const recipients = [...scope.peers].map(([given, info]) => (info.ok
    ? { given, id: info.id, name: info.title, type: info.type, ...(info.username ? { username: info.username } : {}) }
    : { given, error: info.error }));
  return {
    description,
    ...(recipients.length ? { recipients } : {}),
    argv: scope.action.argv,
    ...(shown !== undefined ? { stdin: shown } : {}),
  };
}

/** MCP describe run: print the description and the hash, never write, never create or use a code. */
async function describeAndExit(argv: string[], opts: GuardOptions): Promise<never> {
  const scope = await approvalScope(argv, opts);
  const shown = shownStdin(scope, argv, opts);
  const description = describeParsedAction(scope.action, scope.peers, shown, scope.prepared.lines);
  console.log(DESCRIBE_MARK + JSON.stringify({ hash: scope.hash, description, action: actionJson(scope, shown, description) }));
  process.exit(EXIT_DESCRIBED);
}

const shellQuote = (a: string) => (/^[\w@./:=+,-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);
const psQuote = (a: string) => (/^[\w@./:=+,-]+$/.test(a) ? a : `'${a.replace(/'/g, `''`)}'`);

/** Write mode "ask": go on only with a matching approval code, otherwise print the action and stop. */
async function requireApproval(argv: string[], opts: GuardOptions): Promise<void> {
  // One read of the account for both the check and a new code; getClient() connects with it only
  const session = currentAccount();
  const scope = await approvalScope(argv, opts);
  const given = process.env.TG_APPROVE;
  let rejected: { code: string; reason: RejectReason; message: string } | undefined;
  if (given) {
    const used = consumeApproval(given, scope.hash, session);
    if (used.ok) {
      setWriteContext({ writeMode: 'ask', approvedVia: used.via, ...unprotectedFlag() });
      scope.prepared.onApproved();
      // Nothing read from stdin after this point can be part of the write: it was not approved
      if (!scope.covered) sealStdin();
      return;
    }
    rejected = { code: oneLine(given.trim().toUpperCase()), reason: used.kind, message: used.reason };
  }
  const code = createApproval(scope.hash, session);
  const minutes = APPROVAL_TTL_MS / 60_000;
  const shown = shownStdin(scope, argv, opts);
  const description = describeParsedAction(scope.action, scope.peers, shown, scope.prepared.lines);
  const mcp = !!process.env.TG_MCP;
  const retry = mcp
    ? undefined // the MCP server knows the exact tool call and adds it
    : { argv: ['telegram', ...argv], env: { TG_APPROVE: code } };
  // Over MCP the server reads this line in any case and builds a structured result from it
  if (argv.includes('--json') || mcp) {
    console.log(JSON.stringify({
      error: 'approval_required', code, action: actionJson(scope, shown, description), expiresInMinutes: minutes,
      ...(rejected ? { rejected } : {}), ...(retry ? { retry } : {}),
    }));
  }
  if (rejected) {
    console.error(chalk.yellow(`Approval ${rejected.code} not accepted: ${rejected.message} (${REJECT_HINT[rejected.reason]}). A new one is below.`));
  }
  console.error(chalk.yellow('Approval needed: write mode is "ask", so the user approves each write.'));
  console.error('Show the user this action word for word and ask for an explicit yes:\n' + description);
  if (mcp) {
    console.error(chalk.gray(
      `After a yes, call telegram_write again with the same args and stdin plus "approval": "${code}". The code works once, ` +
      `for this exact action and text, for ${minutes} minutes. Never approve on the user's behalf.`,
    ));
  } else {
    const stdinNote = scope.covered ? ' with the same text on stdin' : '';
    // A quoted argument keeps its line breaks and escape sequences, which the terminal would act on
    // when this is printed: such a command is not repeated, the exact one is retry.argv in JSON
    const printable = argv.every(a => oneLine(a) === a);
    const lines = printable
      ? `  TG_APPROVE=${code} telegram ${argv.map(shellQuote).join(' ')}\n` +
        `  (PowerShell: $env:TG_APPROVE='${code}'; telegram ${argv.map(psQuote).join(' ')}; Remove-Item Env:TG_APPROVE)\n`
      : '  (The command has line breaks or control characters, so it is not repeated here: pass the same arguments exactly as before. ' +
        'With --json the exact command is in retry.argv.)\n';
    console.error(chalk.gray(
      `After a yes, run the same command again${stdinNote} with TG_APPROVE=${code} in its environment:\n` + lines +
      `The code works once, for this exact action and text, for ${minutes} minutes; flag order and --json may differ. ` +
      'Never approve on the user\'s behalf.',
    ));
  }
  process.exit(EXIT_NEEDS_APPROVAL);
}
