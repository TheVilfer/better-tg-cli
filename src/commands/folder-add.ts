import { Command } from 'commander';
import { getClient, addChatToFolder, disconnectClient } from '../client.js';
import { assertWriteEnabled } from '../guard.js';
import ora from '../spinner.js';
import { formatJson } from '../formatters/json.js';
import { fail } from '../errors.js';

export const folderAddCommand = new Command('folder-add')
  .description('Add a chat to a folder')
  .argument('<folder>', 'Folder name')
  .argument('<chat>', 'Chat name, username, or ID')
  .option('--json', 'Output as JSON')
  .action(async (folder, chat, options) => {
    assertWriteEnabled();
    const spinner = ora(`Adding "${chat}" to folder "${folder}"...`).start();

    try {
      const client = await getClient();
      const result = await addChatToFolder(client, folder, chat);

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
      fail(error, spinner, 'Failed to add chat to folder');
    }
  });
