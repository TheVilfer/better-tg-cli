import { Command } from 'commander';
import { getClient, downloadMessageMedia, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatMediaLabel } from '../formatters/plain.js';
import chalk from 'chalk';
import ora from 'ora';

export const downloadCommand = new Command('download')
  .description('Download media (photo/document) from a message')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<messageId>', 'Message ID (see #id in read output)')
  .option('-o, --output <dir>', 'Output directory', './telegram-media')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageIdArg, options) => {
    const messageId = parseInt(messageIdArg, 10);
    if (Number.isNaN(messageId)) {
      console.error(chalk.red(`Invalid message id: ${messageIdArg}`));
      process.exit(1);
    }

    const spinner = ora(`Downloading media from message #${messageId}...`).start();

    try {
      const client = await getClient();
      const result = await downloadMessageMedia(client, chat, messageId, options.output);

      if (!result) {
        spinner.fail('Message has no downloadable media');
        await disconnectClient();
        process.exit(1);
      }

      spinner.succeed(chalk.green('Media downloaded'));

      if (options.json) {
        console.log(formatJson({
          messageId,
          filePath: result.filePath,
          media: result.media,
        }));
      } else {
        console.log(chalk.bold(formatMediaLabel(result.media)));
        console.log(chalk.gray(`Saved to: ${result.filePath}`));
      }

      await disconnectClient();
      process.exit(0);
    } catch (error) {
      spinner.fail('Failed to download media');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
