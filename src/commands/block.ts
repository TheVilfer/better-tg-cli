import { Command } from 'commander';
import { getClient, setBlocked, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

function makeBlockCommand(name: 'block' | 'unblock', blocked: boolean): Command {
  return new Command(name)
    .description(blocked ? 'Block a user' : 'Unblock a user')
    .argument('<user>', 'Username (@user), name, or ID')
    .option('--json', 'Output as JSON')
    .action(async (user, options) => {
      assertWriteEnabled();
      const spinner = ora(`${blocked ? 'Blocking' : 'Unblocking'} "${user}"...`).start();
      try {
        const client = await getClient();
        const result = await setBlocked(client, user, blocked);
        auditLog({ timestamp: new Date().toISOString(), command: name, target: user, result: { success: true } });
        spinner.stop();
        if (options.json) console.log(formatJson({ user: result.name, blocked }));
        else console.log(chalk.green(`✓ ${blocked ? 'Blocked' : 'Unblocked'} "${result.name}"`));
        await disconnectClient();
      } catch (error) {
        auditLog({ timestamp: new Date().toISOString(), command: name, target: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
        spinner.fail(`Failed to ${name}`);
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

export const blockCommand = makeBlockCommand('block', true);
export const unblockCommand = makeBlockCommand('unblock', false);
