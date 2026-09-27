import { Command } from 'commander';
import { getClient, searchMessages, disconnectClient, parseTimeOffset, SEARCH_TYPES } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatMessages, truncate } from '../formatters/plain.js';
import { formatMessagesMarkdown } from '../formatters/markdown.js';
import { getOutputFormat } from '../formatters/index.js';
import chalk from 'chalk';
import ora from '../spinner.js';

export const searchCommand = new Command('search')
  .description('Search messages in one chat (--chat) or across all chats (default)')
  .argument('<query>', 'Search query ("" with --type to list all media of that kind)')
  .option('--chat <name>', 'Search within a specific chat')
  .option('--all', 'Search all chats (default when --chat is omitted)')
  .option('--from <user>', 'Only messages from this sender (needs --chat)')
  .option('--type <type>', `Only messages of this kind: ${SEARCH_TYPES.join(', ')}`)
  .option('--since <time>', 'Only messages after this time ("1h", "7d", "2026-09-01")')
  .option('--until <time>', 'Only messages before this time')
  .option('-n, --limit <number>', 'Maximum results', '50')
  .option('--max-text <chars>', 'Truncate each message text to N characters')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (query, options) => {
    const scope = options.chat ? `"${options.chat}"` : 'all chats';
    const spinner = ora(`Searching for "${query}" in ${scope}...`).start();

    try {
      const client = await getClient();

      const results = await searchMessages(client, query, {
        chat: options.chat,
        limit: parseInt(options.limit),
        from: options.from,
        type: options.type,
        minDate: options.since ? parseTimeOffset(options.since) : undefined,
        maxDate: options.until ? parseTimeOffset(options.until) : undefined,
      });

      const maxText = options.maxText ? parseInt(options.maxText) : undefined;
      if (maxText) {
        for (const r of results) r.messages = r.messages.map(m => ({ ...m, text: truncate(m.text, maxText) }));
      }

      spinner.stop();

      const format = getOutputFormat(options);

      if (format === 'json') {
        console.log(formatJson(results));
      } else {
        for (const result of results) {
          if (result.messages.length === 0) {
            console.log(chalk.yellow('No results found.'));
            continue;
          }

          if (format === 'markdown') {
            console.log(formatMessagesMarkdown(result.messages, result.chatTitle));
          } else {
            console.log(formatMessages(result.messages, result.chatTitle));
          }
        }
      }

      await disconnectClient();
    } catch (error) {
      spinner.fail('Search failed');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
