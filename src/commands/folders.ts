import { Command } from 'commander';
import { getClient, getFolders, disconnectClient } from '../client.js';
import { formatFolders } from '../formatters/plain.js';
import ora from '../spinner.js';
import { fail } from '../errors.js';

export const foldersCommand = new Command('folders')
  .description('List all folders with their chats')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Loading folders...').start();

    try {
      const client = await getClient();
      const folders = await getFolders(client);

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(folders, null, 2));
      } else {
        if (folders.length === 0) {
          console.log('No folders found.');
        } else {
          console.log(formatFolders(folders));
        }
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, 'Failed to load folders');
    }
  });
