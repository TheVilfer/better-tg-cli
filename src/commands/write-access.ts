import { Command } from 'commander';
import { parseForDuration, parseWriteState } from '../write-state.js';
import { confirmByHuman } from '../confirm.js';
import { getWriteValue, hasHumanChannel, isWriteModeProtected, mayTrustUnconfirmedChoice } from '../write-store.js';
import { applyModeChoice, currentModeLine, modeQuestion } from '../write-mode.js';
import { ONBOARD_SITE, startOnboarding } from '../onboard.js';
import { openBrowser } from './onboard.js';
import chalk from '../colors.js';

export { windowsConfirmScript } from '../confirm.js';

const UNPROTECTED_NOTE =
  'No secret store on this machine: the mode is kept in a plain file in the profile, which an agent could edit. ' +
  'It guards against mistakes, not against a hostile agent.';

export const writeAccessCommand = new Command('write-access')
  .description('Manage write access: read-only, ask (the user approves each write in the chat; set after onboarding) or on (no questions; needs the user\'s confirmation)')
  .argument('[action]', 'ask, on, off, or omit to show status')
  .option('--for <duration>', 'With "ask" or "on": back to read-only automatically after 30m / 2h / 1d / 1w')
  .option('--no-open', 'Without a terminal or dialog: print the page URL instead of opening a browser')
  .action(async (action: string | undefined, options: { for?: string; open: boolean }) => {
    if (action === 'ask') {
      // No dialog: in "ask" every write waits for the user's yes in the chat, which is the confirmation
      const result = await applyModeChoice({ mode: 'ask', forSeconds: options.for ? parseForDuration(options.for) : undefined });
      if (!result.ok) {
        console.error(chalk.red(`Write access unchanged (${result.error}).`));
        process.exit(1);
      }
      console.log(chalk.green(`Write access: ${currentModeLine()}.`));
      console.log(chalk.gray('Before every send, show the user the exact action and wait for their yes in the chat.'));
      if (!isWriteModeProtected()) console.log(chalk.gray(UNPROTECTED_NOTE));
    } else if (action === 'on') {
      const forSeconds = options.for ? parseForDuration(options.for) : undefined;
      let result;
      if (hasHumanChannel()) {
        if (!(await confirmByHuman(modeQuestion(action, forSeconds)))) {
          console.error(chalk.yellow('Not confirmed by the user. Write access stays as it was.'));
          process.exit(1);
        }
        result = await applyModeChoice({ mode: action, forSeconds }, { alreadyConfirmed: true });
      } else if (mayTrustUnconfirmedChoice()) {
        result = await chooseOnPage(options.open);
      } else {
        console.error(chalk.red('No terminal or dialog to confirm on. Run this command yourself in a terminal.'));
        process.exit(1);
      }
      if (!result.ok) {
        console.error(chalk.red(`Write access unchanged (${result.error}).`));
        process.exit(1);
      }
      console.log(chalk.green(`Write access: ${currentModeLine()}.`));
      if (!isWriteModeProtected()) console.log(chalk.gray(UNPROTECTED_NOTE));
    } else if (action === 'off') {
      await applyModeChoice({ mode: 'read-only' });
      console.log(chalk.yellow('Write access disabled (read-only mode).'));
    } else if (!action) {
      const state = parseWriteState(getWriteValue());
      const line = `Write access: ${currentModeLine()}`;
      console.log(state.mode === 'read-only' ? chalk.yellow(line) : chalk.green(line));
      if (!isWriteModeProtected()) console.log(chalk.gray(UNPROTECTED_NOTE));
      if (state.mode === 'read-only') {
        console.log(chalk.gray('To allow writes: telegram write-access ask (the user approves each one in the chat) | on [--for 1h] (no questions, the user confirms)'));
      }
    } else {
      console.error(chalk.red(`Unknown action: ${action}`));
      console.error(chalk.gray('Usage: telegram write-access [ask|on|off] [--for 1h]'));
      process.exit(1);
    }
  });

/**
 * No terminal, no dialog, no secret store (a cloud agent computer): the person picks the mode on a
 * local page, like the last step of `telegram onboard`. The agent passes the URL on; the page waits
 * up to 10 minutes and changes nothing if nobody picks.
 */
async function chooseOnPage(open: boolean) {
  let picked: Awaited<ReturnType<typeof applyModeChoice>> = { ok: false, error: 'not_confirmed' };
  const session = await startOnboarding({
    modeOnly: true,
    driver: { login: () => Promise.reject(new Error('not a login')) },
    redeemInvite: () => Promise.reject(new Error('not a login')),
    save: () => {},
    site: process.env.TG_ONBOARD_SITE || ONBOARD_SITE,
    emit: e => {
      if (e.event === 'url') {
        console.log(`Ask the user to open this page and choose what you may do: ${e.url}`);
        console.log('It is on 127.0.0.1 of this computer, so it opens in this computer\'s browser (on a cloud agent: the one the user watches), not in a browser on the user\'s own machine. Waiting up to 10 minutes…');
        if (open) openBrowser(e.url);
      }
    },
    applyMode: async choice => (picked = await applyModeChoice(choice)),
  });
  const result = await session.done;
  await new Promise(r => setTimeout(r, 2500)); // let the page show "saved" before the server goes
  session.close();
  return result.mode ? picked : { ok: false as const, error: 'not_confirmed' as const };
}
