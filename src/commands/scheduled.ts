import { Command } from 'commander';
import { getClient, getScheduledMessages, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatMessages } from '../formatters/plain.js';
import { formatMessagesMarkdown } from '../formatters/markdown.js';
import { getOutputFormat } from '../formatters/index.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const scheduledCommand = new Command('scheduled')
  .description('List messages scheduled to send later in a chat (create them with `send --schedule`)')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .option('--full', 'Include full per-message stats')
  .option('--stats', 'Alias for --full')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (chat, options) => {
    const spinner = ora(`Fetching scheduled messages from "${chat}"...`).start();
    try {
      const client = await getClient();
      const { chatTitle, messages } = await getScheduledMessages(client, chat, { full: Boolean(options.full || options.stats) });
      spinner.stop();
      switch (getOutputFormat(options)) {
        case 'json':
          console.log(formatJson({ chatTitle, messages }));
          break;
        case 'markdown':
          console.log(formatMessagesMarkdown(messages, `🕒 ${chatTitle}`));
          break;
        default:
          if (!messages.length) console.log(chalk.gray(`No scheduled messages in "${chatTitle}".`));
          else console.log(formatMessages(messages, `🕒 ${chatTitle} (scheduled)`));
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch scheduled messages');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
