import { CLOUD_HINT, getWriteValue, isFileFallbackAllowed, isWriteModeProtected, secretStoreHint } from './write-store.js';
import { describeWriteState, parseWriteState } from './write-state.js';
import chalk from './colors.js';
import { setStrictChatResolution } from './resolve-mode.js';
import { isMock, isMockAsk } from './paths.js';
import {
  approvalHash, consumeApproval, createApproval, EXIT_NEEDS_APPROVAL, MOCK_ACCOUNT, readsStdin,
  APPROVAL_TTL_MS, REJECT_HINT, STDIN_IN_APPROVAL_ENV, type RejectReason,
} from './approval.js';
import { describeParsedAction, parsedAction, peerArgs, type ParsedAction, type PeerInfo } from './approval-action.js';
import { lookupPeers } from './peer-lookup.js';
import { readStdinOnce, sealStdin, stdinWasRead } from './text.js';
import { setWriteContext } from './audit.js';
import { getSessionString } from './config.js';

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
 * `readsStdin`: the command takes its body from stdin, as its parsed options say (`-p-`, `-c -`,
 * `--json-params=-` …). The guard also covers stdin when the argv shows a "-" or "=-", when the
 * command already read it, or when the MCP server handed it over; any of them is enough.
 *
 * Async: in mode "ask" it looks up the recipients (a read) to show and bind them. Every caller
 * awaits it before doing anything else (test/guard-awaited.test.ts checks the sources).
 */
export async function assertWriteEnabled(argv: string[] = process.argv.slice(2), opts: { readsStdin?: boolean } = {}): Promise<void> {
  // Set by the MCP read tool: a hard stop even if a write command was misclassified as a read
  if (process.env.TG_READ_ONLY) {
    console.error(chalk.red('This command changes something; it cannot run as a read (use telegram_write).'));
    process.exit(1);
  }
  // Writes match chats strictly, and so does the lookup of the recipients below
  setStrictChatResolution(true);
  if (process.env[DESCRIBE_ENV] === '1') return describeAndExit(argv, opts.readsStdin === true);
  if (isMock()) {
    // A mock write only changes a local file: getClient() hands out the mock under the same check,
    // so there is nothing for a human to approve, unless TG_MOCK_ASK=1 rehearses the "ask" flow.
    // A code given for this call still has to hold, as in mode "on".
    if (isMockAsk()) await requireApproval(argv, opts.readsStdin === true);
    else if (process.env.TG_APPROVE) await requireGivenCode(argv, opts.readsStdin === true);
    return;
  }
  if (!isWriteModeProtected() && !isFileFallbackAllowed()) {
    console.error(chalk.red('Write access needs the secret store, which is unavailable right now (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password).'));
    console.error(chalk.gray('This ensures write permissions cannot be tampered with via config files.'));
    console.error(chalk.gray(secretStoreHint()));
    process.exit(1);
  }
  const state = parseWriteState(getWriteValue());
  if (!state.enabled) {
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
    process.exit(1);
  }
  if (state.mode === 'ask') await requireApproval(argv, opts.readsStdin === true);
  else {
    // A code given for this call (the MCP dialog's yes) still binds it to the action and the
    // account it was approved for, even if the mode turned "on" meanwhile
    if (process.env.TG_APPROVE) await requireGivenCode(argv, opts.readsStdin === true);
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
    console.error(chalk.red('Over MCP in mock mode (TG_MOCK), download, sync and avatar write no local files. Run them in a terminal, or unset TG_MOCK.'));
    process.exit(1);
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
  hash: string;
}

/**
 * What an approval for this call covers: the parsed action with its recipients looked up, and stdin
 * when anything reads it. A failure to connect for the lookup stops here: the write could not run.
 */
async function approvalScope(argv: string[], parsedReadsStdin: boolean): Promise<Scope> {
  const covered = parsedReadsStdin || readsStdin(argv) || stdinWasRead() || process.env[STDIN_IN_APPROVAL_ENV] === '1';
  const stdin = covered ? readStdinOnce() : undefined;
  const action = parsedAction(argv);
  const named = peerArgs(action);
  let peers = new Map<string, PeerInfo>();
  try {
    peers = await lookupPeers(named.map(p => p.value));
  } catch (e) {
    console.error(chalk.red(`Not sent: could not look up the recipient (${e instanceof Error ? e.message : String(e)}).`));
    process.exit(1);
  }
  // A chat the write itself would not find: say so now instead of asking the user to approve a failure
  for (const { value, chat } of named) {
    const info = peers.get(value);
    if (chat && info && !info.ok) {
      console.error(chalk.red(`Not sent, nothing to approve: ${info.error}`));
      process.exit(1);
    }
  }
  return { covered, stdin, action, peers, hash: approvalHash(action, peers, stdin) };
}

/** The account an approval binds to: the profile's stored session (a fixed one for the mock account). */
const currentAccount = (): string | undefined => (isMock() ? MOCK_ACCOUNT : getSessionString());

/**
 * A code given for this call outside mode "ask" (the mode turned "on" while the user answered the
 * MCP dialog, or the mock account): it must still be a valid approval of exactly this action in this
 * account. Any refusal stops the write: a "yes" to an older version of it is no "yes" to this one.
 */
async function requireGivenCode(argv: string[], parsedReadsStdin: boolean): Promise<void> {
  const session = currentAccount();
  const { covered, hash } = await approvalScope(argv, parsedReadsStdin);
  const used = consumeApproval(process.env.TG_APPROVE!, hash, session);
  if (!used.ok) {
    console.error(chalk.red(`Not sent: approval ${process.env.TG_APPROVE!.trim().toUpperCase()} not accepted: ${used.reason} (${REJECT_HINT[used.kind]}).`));
    console.error(chalk.gray(process.env.TG_MCP
      ? 'Call telegram_write again without "approval".'
      : 'Run the command again without TG_APPROVE.'));
    process.exit(1);
  }
  if (!covered) sealStdin();
}

/** The body as the person should see it: an empty stdin the MCP server always hands over says nothing. */
function shownStdin(stdin: string | undefined, argv: string[], parsedReadsStdin: boolean): string | undefined {
  return stdin === '' && !parsedReadsStdin && !readsStdin(argv) ? undefined : stdin;
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
async function describeAndExit(argv: string[], parsedReadsStdin: boolean): Promise<never> {
  const scope = await approvalScope(argv, parsedReadsStdin);
  const shown = shownStdin(scope.stdin, argv, parsedReadsStdin);
  const description = describeParsedAction(scope.action, scope.peers, shown);
  console.log(DESCRIBE_MARK + JSON.stringify({ hash: scope.hash, description, action: actionJson(scope, shown, description) }));
  process.exit(EXIT_DESCRIBED);
}

const shellQuote = (a: string) => (/^[\w@./:=+,-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);
const psQuote = (a: string) => (/^[\w@./:=+,-]+$/.test(a) ? a : `'${a.replace(/'/g, `''`)}'`);

/** Write mode "ask": go on only with a matching approval code, otherwise print the action and stop. */
async function requireApproval(argv: string[], parsedReadsStdin: boolean): Promise<void> {
  // One read of the account for both the check and a new code; getClient() connects with it only
  const session = currentAccount();
  const scope = await approvalScope(argv, parsedReadsStdin);
  const given = process.env.TG_APPROVE;
  let rejected: { code: string; reason: RejectReason; message: string } | undefined;
  if (given) {
    const used = consumeApproval(given, scope.hash, session);
    if (used.ok) {
      setWriteContext({ writeMode: 'ask', approvedVia: used.via, ...unprotectedFlag() });
      // Nothing read from stdin after this point can be part of the write: it was not approved
      if (!scope.covered) sealStdin();
      return;
    }
    rejected = { code: given.trim().toUpperCase(), reason: used.kind, message: used.reason };
  }
  const code = createApproval(scope.hash, session);
  const minutes = APPROVAL_TTL_MS / 60_000;
  const shown = shownStdin(scope.stdin, argv, parsedReadsStdin);
  const description = describeParsedAction(scope.action, scope.peers, shown);
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
    console.error(chalk.gray(
      `After a yes, run the same command again${stdinNote} with TG_APPROVE=${code} in its environment:\n` +
      `  TG_APPROVE=${code} telegram ${argv.map(shellQuote).join(' ')}\n` +
      `  (PowerShell: $env:TG_APPROVE='${code}'; telegram ${argv.map(psQuote).join(' ')}; Remove-Item Env:TG_APPROVE)\n` +
      `The code works once, for this exact action and text, for ${minutes} minutes; flag order and --json may differ. ` +
      'Never approve on the user\'s behalf.',
    ));
  }
  process.exit(EXIT_NEEDS_APPROVAL);
}
