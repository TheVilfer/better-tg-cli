import { Command } from 'commander';
import { resolve } from 'path';
import { getClient, downloadAvatar, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const avatarCommand = new Command('avatar')
  .description("Download a user's or chat's profile photo")
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    const outputDir = resolve(options.output);
    const spinner = ora(`Downloading avatar for "${chat}"...`).start();
    try {
      const client = await getClient();
      const result = await downloadAvatar(client, chat, outputDir);
      spinner.stop();
      if (!result.filePath) {
        console.log(chalk.gray(`"${result.title}" has no profile photo (or it is not accessible).`));
      } else if (options.json) {
        console.log(formatJson({ chat: result.title, filePath: result.filePath }));
      } else {
        console.log(chalk.green(`✓ Saved avatar of "${result.title}" → ${result.filePath}`));
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to download avatar');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
