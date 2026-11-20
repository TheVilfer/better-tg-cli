import { Command } from 'commander';
import { getClient, getDialogs, disconnectClient, CHAT_TYPES, matchesChatType, type ChatInfo } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatInbox, truncate } from '../formatters/plain.js';
import { formatInboxMarkdown } from '../formatters/markdown.js';
import { getOutputFormat } from '../formatters/index.js';
import ora from '../spinner.js';
import { fail } from '../errors.js';
import { choiceOption, nonNegativeInt } from '../args.js';

/**
 * Where a chat stands in the inbox: people first, then groups and channels, muted chats last
 * (a muted supergroup with a huge counter is rarely what the user reads first). Most unread first
 * within each.
 */
function inboxRank(chat: ChatInfo): number {
  if (chat.muted) return 2;
  return chat.type === 'user' ? 0 : 1;
}

export const inboxCommand = new Command('inbox')
  .description('Show unread messages summary: private chats, then groups and channels, muted chats last')
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
      unreadChats.sort((a, b) => inboxRank(a) - inboxRank(b) || b.unreadCount - a.unreadCount);

      const totals = { chats: unreadChats.length, unread: unreadChats.reduce((sum, c) => sum + c.unreadCount, 0) };
      const preview = options.preview;
      const shown = unreadChats.slice(0, options.limit).map(c => ({
        ...c,
        muted: !!c.muted,
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
