import { Command } from 'commander';
import { getClient, getMessages, getMessagesByIds, getReadState, disconnectClient, parseTimeOffset } from '../client.js';
import type { MessageInfo } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatMessages, truncate } from '../formatters/plain.js';
import { formatMessagesMarkdown } from '../formatters/markdown.js';
import { getOutputFormat } from '../formatters/index.js';
import ora from '../spinner.js';

function printMessages(
  messages: MessageInfo[],
  chatTitle: string,
  options: { json?: boolean; markdown?: boolean; maxText?: string; asc?: boolean },
  extra: Record<string, unknown> = {},
  displayTitle = chatTitle
): void {
  const maxText = options.maxText ? parseInt(options.maxText) : undefined;
  let list = options.asc ? [...messages].reverse() : messages;
  if (maxText) list = list.map(m => ({ ...m, text: truncate(m.text, maxText) }));

  switch (getOutputFormat(options)) {
    case 'json':
      console.log(formatJson({ chatTitle, messages: list, ...extra }));
      break;
    case 'markdown':
      console.log(formatMessagesMarkdown(list, displayTitle));
      break;
    default:
      console.log(formatMessages(list, displayTitle));
  }
}

function parseId(value: string, flag: string): number {
  const n = parseInt(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${flag} expects a message ID, got "${value}"`);
  return n;
}

export const readCommand = new Command('read')
  .description('Read messages from a chat (newest first; --asc for chronological)')
  .argument('<chat>', 'Chat name, @username, numeric ID, or "me" (Saved Messages)')
  .option('-n, --limit <number>', 'Number of messages to fetch', '50')
  .option('--since <time>', 'Only messages after this time ("30m", "1h", "7d", "2w", or "2026-09-01")')
  .option('--until <time>', 'Only messages before this time (same formats as --since)')
  .option('--before <id>', 'Only messages older than this message ID (paging backwards)')
  .option('--after <id>', 'Only messages newer than this message ID (catching up)')
  .option('--from <user>', 'Only messages from this sender (@username, ID, or "me")')
  .option('--thread <id>', 'Read the replies/comments thread of this message ID')
  .option('--topic <id>', 'Read a forum topic (topic ID from `telegram topics`)')
  .option('--unread', 'Only messages you have not read yet (up to --limit)')
  .option('--asc', 'Oldest first (chronological order)')
  .option('--max-text <chars>', 'Truncate each message text to N characters')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (chat, options) => {
    const spinner = ora(`Fetching messages from "${chat}"...`).start();

    try {
      const client = await getClient();

      const fetchOptions: Parameters<typeof getMessages>[2] = {
        limit: parseInt(options.limit),
      };
      if (options.since) fetchOptions.minDate = parseTimeOffset(options.since);
      if (options.until) fetchOptions.maxDate = parseTimeOffset(options.until);
      if (options.before) fetchOptions.offsetId = parseId(options.before, '--before');
      if (options.after) fetchOptions.minId = parseId(options.after, '--after');
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
      const thread = options.thread ?? options.topic;
      if (thread) fetchOptions.thread = parseId(thread, options.thread ? '--thread' : '--topic');

      const { messages, chatTitle, threadChatId } = await getMessages(client, chat, fetchOptions);

      spinner.stop();
      const title = thread ? `${chatTitle} › thread ${thread}${threadChatId ? ` (comments chat ${threadChatId})` : ''}` : chatTitle;
      printMessages(messages, chatTitle, options, threadChatId ? { threadChatId } : {}, title);

      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch messages');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const getCommand = new Command('get')
  .description('Fetch specific messages by ID')
  .argument('<chat>', 'Chat name, @username, numeric ID, or "me"')
  .argument('<ids...>', 'Message IDs (space or comma separated)')
  .option('--max-text <chars>', 'Truncate each message text to N characters')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .action(async (chat, ids: string[], options) => {
    const spinner = ora(`Fetching messages from "${chat}"...`).start();

    try {
      const parsed = ids.flatMap(v => v.split(',')).filter(Boolean).map(v => parseId(v.trim(), 'get'));
      const client = await getClient();
      const { messages, chatTitle, missing } = await getMessagesByIds(client, chat, parsed);

      spinner.stop();
      printMessages(messages, chatTitle, { ...options, asc: false }, missing.length ? { missing } : {});
      if (missing.length && !options.json) console.error(`Not found: ${missing.join(', ')}`);

      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch messages');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
