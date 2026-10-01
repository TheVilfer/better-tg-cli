import { Command } from 'commander';
import { secretGet, secretSet, secretDelete, isSecretStoreAvailable } from '../secrets.js';
import { encodeWriteState, parseForDuration, parseWriteState } from '../write-state.js';
import { confirmByHuman } from '../confirm.js';
import chalk from '../colors.js';

export { windowsConfirmScript } from '../confirm.js';

export const writeAccessCommand = new Command('write-access')
  .description('Manage write access (read-only by default; turning it on needs the user\'s confirmation)')
  .argument('[action]', 'on, off, or omit to show status')
  .option('--for <duration>', 'With "on": turn writes off again automatically after 30m / 2h / 1d / 1w')
  .action(async (action: string | undefined, options: { for?: string }) => {
    if (!isSecretStoreAvailable()) {
      console.error(chalk.red('No secret store available (macOS Keychain, Linux Secret Service via secret-tool, Windows DPAPI, or 1Password required).'));
      console.error(chalk.gray('Write access control requires a secret store to prevent tampering.'));
      process.exit(1);
    }

    if (action === 'on') {
      const seconds = options.for ? parseForDuration(options.for) : undefined;
      const span = options.for ? ` на ${options.for}` : ' без ограничения по времени';
      const approved = await confirmByHuman(
        `Разрешить Telegram CLI отправлять, редактировать и удалять сообщения от вашего аккаунта${span}?`
      );
      if (!approved) {
        console.error(chalk.yellow('Not confirmed by the user. Write access stays off.'));
        process.exit(1);
      }
      if (!secretSet('writeEnabled', encodeWriteState(seconds))) {
        console.error(chalk.red('Failed to enable write access.'));
        process.exit(1);
      }
      const state = parseWriteState(secretGet('writeEnabled'));
      console.log(chalk.green(state.until ? `Write access enabled until ${state.until.toLocaleString()}.` : 'Write access enabled.'));
    } else if (action === 'off') {
      secretDelete('writeEnabled');
      console.log(chalk.yellow('Write access disabled (read-only mode).'));
    } else if (!action) {
      const state = parseWriteState(secretGet('writeEnabled'));
      if (state.enabled) {
        console.log(chalk.green(state.until ? `Write access: enabled until ${state.until.toLocaleString()}` : 'Write access: enabled'));
      } else {
        console.log(chalk.yellow(`Write access: disabled${state.expired ? ` (expired ${state.until!.toLocaleString()})` : ' (read-only mode)'}`));
        console.log(chalk.gray('To enable (asks the user to confirm): telegram write-access on [--for 1h]'));
      }
    } else {
      console.error(chalk.red(`Unknown action: ${action}`));
      console.error(chalk.gray('Usage: telegram write-access [on|off] [--for 1h]'));
      process.exit(1);
    }
  });
