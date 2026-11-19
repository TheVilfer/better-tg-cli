import { Command } from 'commander';
import { getClient, unmuteChat, disconnectClient } from '../client.js';
import { assertWriteEnabled } from '../guard.js';
import ora from '../spinner.js';
import { formatJson } from '../formatters/json.js';
import { fail } from '../errors.js';

export const unmuteCommand = new Command('unmute')
  .description('Unmute a chat')
  .argument('<chat>', 'Chat name, username, or ID')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    assertWriteEnabled();
    const spinner = ora(`Unmuting "${chat}"...`).start();

    try {
      const client = await getClient();
      const result = await unmuteChat(client, chat);

      if (result.success) {
        if (options.json) {
          spinner.stop();
          console.log(formatJson(result));
        } else {
          spinner.succeed(result.message);
        }
      } else {
        if (options.json) {
          spinner.stop();
          console.log(formatJson(result));
        } else {
          spinner.fail(result.message);
        }
        process.exit(1);
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, 'Failed to unmute chat');
    }
  });
