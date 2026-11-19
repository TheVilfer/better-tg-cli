import { Command } from 'commander';
import { getClient, getMessages, getMessagesByIds, getReadState, disconnectClient, parseTimeOffset } from '../client.js';
import type { MessageInfo } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatMessages, truncate } from '../formatters/plain.js';
import { formatMessagesMarkdown } from '../formatters/markdown.js';
import { getOutputFormat } from '../formatters/index.js';
import ora from '../spinner.js';
import { fail } from '../errors.js';
import { messageIdList, positiveInt, timeArg } from '../args.js';

function printMessages(
  messages: MessageInfo[],
  chatTitle: string,
  options: { json?: boolean; markdown?: boolean; maxText?: number; asc?: boolean },
  extra: Record<string, unknown> = {},
  displayTitle = chatTitle,
  footer?: string,
): void {
  const maxText = options.maxText;
  let list = options.asc ? [...messages].reverse() : messages;
  if (maxText) list = list.map(m => ({ ...m, text: truncate(m.text, maxText) }));

  switch (getOutputFormat(options)) {
    case 'json':
      console.log(formatJson({ chatTitle, messages: list, ...extra }));
      break;
    case 'markdown':
      console.log(formatMessagesMarkdown(list, displayTitle));
      if (footer) console.log(footer);
      break;
    default:
      console.log(formatMessages(list, displayTitle));
      if (footer) console.log(footer);
  }
}

export const readCommand = new Command('read')
  .description('Read messages from a chat (newest first; --asc for chronological)')
  .argument('<chat>', 'Chat name, @username, numeric ID, or "me" (Saved Messages)')
  .option('-n, --limit <number>', 'Number of messages to fetch', positiveInt, 50)
  .option('--since <time>', 'Only messages after this time ("30m", "1h", "7d", "2w", or "2026-09-01")', timeArg)
  .option('--until <time>', 'Only messages before this time (same formats as --since)', timeArg)
  .option('--before <id>', 'Only messages older than this message ID (paging backwards)', positiveInt)
  .option('--after <id>', 'Only messages newer than this message ID (catching up)', positiveInt)
  .option('--from <user>', 'Only messages from this sender (@username, ID, or "me")')
  .option('--thread <id>', 'Read the replies/comments thread of this message ID', positiveInt)
  .option('--topic <id>', 'Read a forum topic (topic ID from `telegram topics`)', positiveInt)
  .option('--unread', 'Only messages you have not read yet (up to --limit)')
  .option('--asc', 'Oldest first (chronological order)')
  .option('--max-text <chars>', 'Truncate each message text to N characters', positiveInt)
  .option('--full', 'Include full per-message stats (views, forwards, reactions, flags, media detail)')
  .option('--stats', 'Alias for --full')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (chat, options) => {
    const spinner = ora(`Fetching messages from "${chat}"...`).start();

    try {
      const client = await getClient();

      const fetchOptions: Parameters<typeof getMessages>[2] = {
        limit: options.limit,
        full: Boolean(options.full || options.stats),
      };
      if (options.since) fetchOptions.minDate = parseTimeOffset(options.since);
      if (options.until) fetchOptions.maxDate = parseTimeOffset(options.until);
      if (options.before) fetchOptions.offsetId = options.before;
      if (options.after) fetchOptions.minId = options.after;
      if (options.from) fetchOptions.from = options.from;
      if (options.unread) {
        const state = await getReadState(client, chat);
        if (state.unreadCount === 0) {
          spinner.stop();
          console.log(options.json ? formatJson({ messages: [] }) : 'No unread messages.');
          await disconnectClient();
          return;
        }
        fetchOptions.minId = Math.max(fetchOptions.minId ?? 0, state.readInboxMaxId);
      }
      const thread: number | undefined = options.thread ?? options.topic;
      if (thread) fetchOptions.thread = thread;
      if (options.topic && !options.thread) fetchOptions.topic = true;

      const { messages, chatTitle, chatId, threadChatId } = await getMessages(client, chat, fetchOptions);

      spinner.stop();
      const title = thread ? `${chatTitle} › thread ${thread}${threadChatId ? ` (comments chat ${threadChatId})` : ''}` : chatTitle;
      // A full page may not be the last one: say how to get the next (older) page
      const oldest = messages.length ? Math.min(...messages.map(m => m.id)) : undefined;
      const more = messages.length >= options.limit && oldest !== undefined && !options.after && !options.unread;
      const extra = { chatId, ...(threadChatId ? { threadChatId } : {}), ...(more ? { hasMore: true, nextBefore: oldest } : {}) };
      printMessages(messages, chatTitle, options, extra, title, more ? `… more: --before ${oldest}` : undefined);

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, 'Failed to fetch messages');
    }
  });

export const getCommand = new Command('get')
  .description('Fetch specific messages by ID')
  .argument('<chat>', 'Chat name, @username, numeric ID, or "me"')
  .argument('<ids...>', 'Message IDs (space or comma separated)', messageIdList)
  .option('--max-text <chars>', 'Truncate each message text to N characters', positiveInt)
  .option('--full', 'Include full per-message stats (views, forwards, reactions, flags, media detail)')
  .option('--stats', 'Alias for --full')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (chat, ids: number[], options) => {
    const spinner = ora(`Fetching messages from "${chat}"...`).start();

    try {
      const client = await getClient();
      const { messages, chatTitle, chatId, missing } = await getMessagesByIds(client, chat, ids, { full: Boolean(options.full || options.stats) });

      spinner.stop();
      printMessages(messages, chatTitle, { ...options, asc: false }, { chatId, ...(missing.length ? { missing } : {}) });
      if (missing.length && !options.json) console.error(`Not found: ${missing.join(', ')}`);

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, 'Failed to fetch messages');
    }
  });
