import { Command } from 'commander';
import { getClient, getPermissions, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { getOutputFormat } from '../formatters/index.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const permissionsCommand = new Command('permissions')
  .description("Show a member's rights in a group/channel, or the chat's default permissions")
  .argument('<chat>', 'Supergroup or channel name, username (@chat), or ID')
  .argument('[user]', 'User to inspect; omit for the chat default permissions')
  .option('--json', 'Output as JSON')
  .action(async (chat, user, options) => {
    const spinner = ora(`Fetching permissions for "${chat}"...`).start();
    try {
      const client = await getClient();
      const info = await getPermissions(client, chat, user);
      spinner.stop();
      if (getOutputFormat(options) === 'json') {
        console.log(formatJson(info));
      } else {
        const who = info.user ? `${info.user} in "${info.chatTitle}"` : `"${info.chatTitle}" default`;
        console.log(`${chalk.bold(who)}: ${chalk.cyan(info.status)}`);
        if (info.adminRights?.length) console.log(`  admin: ${info.adminRights.join(', ')}`);
        if (info.restrictions?.length) console.log(`  denied: ${info.restrictions.join(', ')}`);
        else if (info.status === 'default') console.log(chalk.gray('  no restrictions (members may do everything)'));
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch permissions');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
