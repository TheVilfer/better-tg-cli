import { Command } from 'commander';
import { getClient, searchMessages, disconnectClient, parseTimeOffset, SEARCH_TYPES } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatMessages, truncate } from '../formatters/plain.js';
import { formatMessagesMarkdown } from '../formatters/markdown.js';
import { getOutputFormat } from '../formatters/index.js';
import chalk from '../colors.js';
import ora from '../spinner.js';
import { fail, usageError } from '../errors.js';
import { choiceOption, positiveInt, timeArg } from '../args.js';

export const searchCommand = new Command('search')
  .description('Search messages in one chat (--chat) or across all chats (default)')
  .argument('<query>', 'Search query ("" with --type to list all media of that kind)')
  .option('--chat <name>', 'Search within a specific chat')
  .option('--all', 'Search all chats (default when --chat is omitted)')
  .option('--from <user>', 'Only messages from this sender (needs --chat)')
  .addOption(choiceOption('--type <type>', 'Only messages of this kind', SEARCH_TYPES))
  .option('--since <time>', 'Only messages after this time ("1h", "7d", "2026-09-01")', timeArg)
  .option('--until <time>', 'Only messages before this time', timeArg)
  .option('-n, --limit <number>', 'Maximum results', positiveInt, 50)
  .option('--max-text <chars>', 'Truncate each message text to N characters', positiveInt)
  .option('--full', 'Include full per-message stats (views, forwards, reactions, flags, media detail)')
  .option('--stats', 'Alias for --full')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (query, options) => {
    // A wrong command line is exit 2 before any connection (a profile not logged in would say 5)
    if (options.from && !options.chat) fail(usageError('--from needs --chat (Telegram global search cannot filter by sender)'));
    const scope = options.chat ? `"${options.chat}"` : 'all chats';
    const spinner = ora(`Searching for "${query}" in ${scope}...`).start();

    try {
      const client = await getClient();

      const result = await searchMessages(client, query, {
        chat: options.chat,
        limit: options.limit,
        from: options.from,
        type: options.type,
        minDate: options.since ? parseTimeOffset(options.since) : undefined,
        maxDate: options.until ? parseTimeOffset(options.until) : undefined,
        full: Boolean(options.full || options.stats),
      });

      const maxText = options.maxText ? options.maxText : undefined;
      if (maxText) {
        result.messages = result.messages.map(m => ({ ...m, text: truncate(m.text, maxText) }));
      }

      spinner.stop();

      const format = getOutputFormat(options);

      if (format === 'json') {
        console.log(formatJson(result));
      } else if (result.messages.length === 0) {
        console.log(chalk.yellow('No results found.'));
      } else {
        if (format === 'markdown') {
          console.log(formatMessagesMarkdown(result.messages, result.chatTitle));
        } else {
          console.log(formatMessages(result.messages, result.chatTitle ?? `Results for "${query}"`));
        }
        if (result.hasMore) console.log(`… more exist: raise -n (now ${options.limit}) or narrow with --since/--until`);
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, 'Search failed');
    }
  });
