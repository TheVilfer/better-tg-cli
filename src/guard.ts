import { CLOUD_HINT, getWriteValue, isFileFallbackAllowed, isWriteModeProtected } from './write-store.js';
import { describeWriteState, parseWriteState } from './write-state.js';
import chalk from './colors.js';
import { setStrictChatResolution } from './resolve-mode.js';
import { isMock } from './paths.js';
import { actionHash, consumeApproval, createApproval, describeAction, EXIT_NEEDS_APPROVAL, readsStdin, APPROVAL_TTL_MS } from './approval.js';
import { readStdinOnce } from './text.js';
import { setWriteContext } from './audit.js';

export function assertWriteEnabled(argv: string[] = process.argv.slice(2)): void {
  // Set by the MCP read tool: a hard stop even if a write command was misclassified as a read
  if (process.env.TG_READ_ONLY) {
    console.error(chalk.red('This command changes something; it cannot run as a read (use telegram_write).'));
    process.exit(1);
  }
  // A mock write only changes a local file: getClient() hands out the mock under the same check,
  // so there is nothing for a human to approve. Strict chat matching stays, as for real writes.
  if (isMock()) {
    setStrictChatResolution(true);
    return;
  }
  if (!isWriteModeProtected() && !isFileFallbackAllowed()) {
    console.error(chalk.red('Write access needs the secret store, which is unavailable right now (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password).'));
    console.error(chalk.gray('This ensures write permissions cannot be tampered with via config files.'));
    process.exit(1);
  }
  const state = parseWriteState(getWriteValue());
  if (!state.enabled) {
    console.error(chalk.red(`Write access is disabled (${describeWriteState(state)}).`));
    console.error(chalk.gray('To write, run `telegram write-access ask`: then each write waits for the user\'s yes in the chat. Writing without asking (`write-access on`) needs the user\'s own confirmation.'));
    if (!isWriteModeProtected()) console.error(chalk.gray(CLOUD_HINT));
    process.exit(1);
  }
  if (state.mode === 'ask') requireApproval(argv);
  else setWriteContext({ writeMode: 'on', ...unprotectedFlag() });
  setStrictChatResolution(true);
}

const unprotectedFlag = () => (isWriteModeProtected() ? {} : { unprotected: true as const });

/** Write mode "ask": go on only with a matching approval code, otherwise print the action and stop. */
function requireApproval(argv: string[]): void {
  const stdin = readsStdin(argv) ? readStdinOnce() : undefined;
  const hash = actionHash(argv, stdin);
  const given = process.env.TG_APPROVE;
  if (given) {
    const used = consumeApproval(given, hash);
    if (used.ok) {
      setWriteContext({ writeMode: 'ask', approvedVia: used.via, ...unprotectedFlag() });
      return;
    }
    console.error(chalk.yellow(`Approval ${given} not accepted: ${used.reason}. A new one is below.`));
  }
  const code = createApproval(hash);
  const minutes = APPROVAL_TTL_MS / 60_000;
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ error: 'approval_required', code, action: { argv, ...(stdin !== undefined ? { stdin } : {}) }, expiresInMinutes: minutes }));
  }
  console.error(chalk.yellow('Approval needed: write mode is "ask", so the user approves each write.'));
  console.error('Show the user this action word for word and ask for an explicit yes:\n' + describeAction(argv, stdin));
  console.error(chalk.gray(
    `After a yes, run the same command again with TG_APPROVE=${code} in its environment ` +
    `(over MCP: pass "approval": "${code}" to telegram_write). The code works once, for this exact ` +
    `command and text, for ${minutes} minutes. Never approve on the user's behalf.`,
  ));
  process.exit(EXIT_NEEDS_APPROVAL);
}
