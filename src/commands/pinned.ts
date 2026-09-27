import { Command } from 'commander';
import { getClient, getPinnedMessages, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatMessages } from '../formatters/plain.js';
import { formatMessagesMarkdown } from '../formatters/markdown.js';
import { getOutputFormat } from '../formatters/index.js';
import ora from '../spinner.js';

export const pinnedCommand = new Command('pinned')
  .description('List pinned messages in a chat')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .option('-n, --limit <number>', 'Max pinned messages to fetch', '20')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (chat, options) => {
    const spinner = ora(`Fetching pinned messages from "${chat}"...`).start();
    try {
      const client = await getClient();
      const { chatTitle, messages } = await getPinnedMessages(client, chat, parseInt(options.limit, 10));
      spinner.stop();
      const format = getOutputFormat(options);
      if (format === 'json') console.log(formatJson({ chatTitle, messages }));
      else if (format === 'markdown') console.log(formatMessagesMarkdown(messages, `📌 ${chatTitle}`));
      else console.log(formatMessages(messages, `📌 ${chatTitle} (pinned)`));
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch pinned messages');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
