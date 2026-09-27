import { Command } from 'commander';
import { getClient, getMessageButtons, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatButtonLayout } from '../formatters/plain.js';
import chalk from 'chalk';
import ora from '../spinner.js';

export const buttonsCommand = new Command('buttons')
  .description('List the buttons attached to a bot message')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<messageId>', 'Message ID (the #number shown by `tg read`)')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageId, options) => {
    const id = parseInt(messageId, 10);
    if (!Number.isInteger(id)) {
      console.error('Message ID must be a number');
      process.exit(1);
    }

    const spinner = ora(`Reading buttons on #${id}...`).start();

    try {
      const client = await getClient();
      const result = await getMessageButtons(client, chat, id);
      spinner.stop();

      if (options.json) {
        console.log(formatJson(result));
      } else if (!result.layout) {
        console.log(chalk.gray(`Message #${result.messageId} in "${result.chatTitle}" has no buttons.`));
      } else {
        if (result.text) console.log(result.text + '\n');
        console.log(formatButtonLayout(result.layout, ''));
        console.log(chalk.gray(`\nPress one with: tg click "${chat}" ${result.messageId} <index|text>`));
      }

      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to read buttons');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
