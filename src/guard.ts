import { CLOUD_HINT, getWriteValue, isFileFallbackAllowed, isWriteModeProtected } from './write-store.js';
import { describeWriteState, parseWriteState } from './write-state.js';
import chalk from './colors.js';
import { setStrictChatResolution } from './resolve-mode.js';
import { isMock } from './paths.js';
import { ANOTHER_ACCOUNT, actionHash, consumeApproval, createApproval, describeAction, EXIT_NEEDS_APPROVAL, readsStdin, APPROVAL_TTL_MS, STDIN_IN_APPROVAL_ENV } from './approval.js';
import { readStdinOnce, sealStdin, stdinWasRead } from './text.js';
import { setWriteContext } from './audit.js';
import { getSessionString } from './config.js';
import { CliError, errorJson, EXIT, fail, wantsJson } from './errors.js';

/**
 * `readsStdin`: the command takes its body from stdin, as its parsed options say (`-p-`, `-c -`,
 * `--json-params=-` …). The guard also covers stdin when the argv shows a "-" or "=-", when the
 * command already read it, or when the MCP server handed it over; any of them is enough.
 */
export function assertWriteEnabled(argv: string[] = process.argv.slice(2), opts: { readsStdin?: boolean } = {}): void {
  // Set by the MCP read tool: a hard stop even if a write command was misclassified as a read
  if (process.env.TG_READ_ONLY) {
    fail(new CliError('This command changes something; it cannot run as a read (use telegram_write).', 'write_on_read_tool', EXIT.ERROR));
  }
  // A mock write only changes a local file: getClient() hands out the mock under the same check,
  // so there is nothing for a human to approve. Strict chat matching stays, as for real writes.
  if (isMock()) {
    setStrictChatResolution(true);
    return;
  }
  if (!isWriteModeProtected() && !isFileFallbackAllowed()) {
    fail(new CliError('Write access needs the secret store, which is unavailable right now (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password).', 'secret_store_unavailable', EXIT.ERROR, {
      hint: 'This ensures write permissions cannot be tampered with via config files.',
    }));
  }
  const state = parseWriteState(getWriteValue());
  if (!state.enabled) {
    // A code of its own (4) and, with --json, one JSON line: the agent's next step is to ask the user
    if (wantsJson(argv)) {
      console.log(errorJson({ code: 'write_disabled', message: `Write access is disabled (${describeWriteState(state)})`, hint: 'telegram write-access ask' }));
    }
    console.error(chalk.red(`Write access is disabled (${describeWriteState(state)}).`));
    console.error(chalk.gray('To write, run `telegram write-access ask`: then each write waits for the user\'s yes in the chat. Writing without asking (`write-access on`) needs the user\'s own confirmation.'));
    if (!isWriteModeProtected()) console.error(chalk.gray(CLOUD_HINT));
    process.exit(EXIT.WRITE_DISABLED);
  }
  if (state.mode === 'ask') requireApproval(argv, opts.readsStdin === true);
  else {
    // A code given for this call (the MCP dialog's yes) still binds it to the account it was
    // approved in, even if the mode turned "on" meanwhile: another account must not inherit it
    if (process.env.TG_APPROVE) refuseOtherAccount(argv, opts.readsStdin === true);
    setWriteContext({ writeMode: 'on', ...unprotectedFlag() });
  }
  setStrictChatResolution(true);
}

/**
 * download, sync and avatar only write local files, so in a terminal they need no write access. Over
 * MCP (TG_MCP, set for every call) the model picks the path, so they follow the write mode like any
 * write: refused in read-only, an approval each in "ask". A read (TG_READ_ONLY) never writes a file.
 * Under TG_MOCK a write needs no approval, so over MCP these are refused outright: the model would
 * otherwise write real files wherever it likes.
 */
export function assertLocalWriteAllowed(argv: string[] = process.argv.slice(2)): void {
  if (!process.env.TG_MCP && !process.env.TG_READ_ONLY) return;
  if (isMock() && !process.env.TG_READ_ONLY) {
    fail(new CliError('Over MCP in mock mode (TG_MOCK), download, sync and avatar write no local files. Run them in a terminal, or unset TG_MOCK.', 'not_in_mock', EXIT.ERROR));
  }
  assertWriteEnabled(argv);
}

const unprotectedFlag = () => (isWriteModeProtected() ? {} : { unprotected: true as const });

/** What an approval for this call covers: the args and, when anything reads it, stdin. */
function approvalScope(argv: string[], parsedReadsStdin: boolean): { covered: boolean; stdin: string | undefined; hash: string } {
  const covered = parsedReadsStdin || readsStdin(argv) || stdinWasRead() || process.env[STDIN_IN_APPROVAL_ENV] === '1';
  const stdin = covered ? readStdinOnce() : undefined;
  return { covered, stdin, hash: actionHash(argv, stdin) };
}

/** Write mode "on" with a code for this call: refuse when it was approved in another account. */
function refuseOtherAccount(argv: string[], parsedReadsStdin: boolean): void {
  const { covered, hash } = approvalScope(argv, parsedReadsStdin);
  const used = consumeApproval(process.env.TG_APPROVE!, hash, getSessionString());
  if (!used.ok && used.reason === ANOTHER_ACCOUNT) {
    fail(new CliError(`Not sent: ${used.reason}. Run the command again.`, 'approval_other_account', EXIT.ERROR));
  }
  if (used.ok && !covered) sealStdin();
}

/** Write mode "ask": go on only with a matching approval code, otherwise print the action and stop. */
function requireApproval(argv: string[], parsedReadsStdin: boolean): void {
  const { covered, stdin, hash } = approvalScope(argv, parsedReadsStdin);
  // One read of the account for both the check and a new code; getClient() connects with it only
  const session = getSessionString();
  const given = process.env.TG_APPROVE;
  if (given) {
    const used = consumeApproval(given, hash, session);
    if (used.ok) {
      setWriteContext({ writeMode: 'ask', approvedVia: used.via, ...unprotectedFlag() });
      // Nothing read from stdin after this point can be part of the write: it was not approved
      if (!covered) sealStdin();
      return;
    }
    console.error(chalk.yellow(`Approval ${given} not accepted: ${used.reason}. A new one is below.`));
  }
  const code = createApproval(hash, session);
  const minutes = APPROVAL_TTL_MS / 60_000;
  // An empty stdin the MCP server always hands over says nothing to show (the hash still covers it)
  const shown = stdin === '' && !parsedReadsStdin && !readsStdin(argv) ? undefined : stdin;
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ error: 'approval_required', code, action: { argv, ...(shown !== undefined ? { stdin: shown } : {}) }, expiresInMinutes: minutes }));
  }
  console.error(chalk.yellow('Approval needed: write mode is "ask", so the user approves each write.'));
  console.error('Show the user this action word for word and ask for an explicit yes:\n' + describeAction(argv, shown));
  console.error(chalk.gray(
    `After a yes, run the same command again with TG_APPROVE=${code} in its environment ` +
    `(over MCP: pass "approval": "${code}" to telegram_write). The code works once, for this exact ` +
    `command and text, for ${minutes} minutes. Never approve on the user's behalf.`,
  ));
  process.exit(EXIT_NEEDS_APPROVAL);
}
