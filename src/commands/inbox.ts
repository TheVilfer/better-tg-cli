import { Command } from 'commander';
import { getClient, getDialogs, disconnectClient, CHAT_TYPES, matchesChatType } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatInbox, truncate } from '../formatters/plain.js';
import { formatInboxMarkdown } from '../formatters/markdown.js';
import { getOutputFormat } from '../formatters/index.js';
import ora from '../spinner.js';
import { fail } from '../errors.js';
import { choiceOption, nonNegativeInt } from '../args.js';

export const inboxCommand = new Command('inbox')
  .description('Show unread messages summary (most unread first)')
  .option('-n, --limit <number>', 'Show at most N chats (totals still count all; 0 = totals only)', nonNegativeInt, 30)
  .option('--unmuted', 'Hide muted chats (usually what a human actually reads)')
  .option('--include-archived', 'Also count archived chats (Telegram itself does not badge them)')
  .addOption(choiceOption('--type <type>', 'Filter by type (user includes bots)', CHAT_TYPES))
  .option('--preview <chars>', 'Last-message preview length (0 = none)', nonNegativeInt, 50)
  .option('--full', "Include full stats of each chat's last message (views, reactions, …)")
  .option('--stats', 'Alias for --full')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (options) => {
    const spinner = ora('Fetching inbox...').start();

    try {
      const client = await getClient();
      const chats = await getDialogs(client, 500, { full: Boolean(options.full || options.stats) });
      let unreadChats = chats.filter(c => c.unreadCount > 0);
      if (!options.includeArchived) unreadChats = unreadChats.filter(c => !c.archived);
      if (options.unmuted) unreadChats = unreadChats.filter(c => !c.muted);
      if (options.type) unreadChats = unreadChats.filter(c => matchesChatType(c, options.type));
      unreadChats.sort((a, b) => b.unreadCount - a.unreadCount);

      const totals = { chats: unreadChats.length, unread: unreadChats.reduce((sum, c) => sum + c.unreadCount, 0) };
      const preview = options.preview;
      const shown = unreadChats.slice(0, options.limit).map(c => ({
        ...c,
        lastMessage: preview > 0 && c.lastMessage ? truncate(c.lastMessage, preview) : undefined,
      }));

      spinner.stop();

      switch (getOutputFormat(options)) {
        case 'json':
          console.log(formatJson({ totalUnread: totals.unread, chatsWithUnread: totals.chats, chats: shown }));
          break;
        case 'markdown':
          console.log(formatInboxMarkdown(shown));
          break;
        default:
          console.log(formatInbox(shown, preview, totals));
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, 'Failed to fetch inbox');
    }
  });
