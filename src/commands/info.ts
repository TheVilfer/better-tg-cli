import { Command } from 'commander';
import { getClient, getChatInfo, getForumTopics, getMessageLink, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import ora from '../spinner.js';

function fail(spinner: ReturnType<typeof ora>, what: string, error: unknown): never {
  spinner.fail(what);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

export const infoCommand = new Command('info')
  .description('Show details of a chat, group, channel, user or bot (members, about, linked chat, forum)')
  .argument('<chat>', 'Chat name, @username, numeric ID, or "me"')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    const spinner = ora(`Fetching info for "${chat}"...`).start();
    try {
      const client = await getClient();
      const info = await getChatInfo(client, chat);
      spinner.stop();
      if (options.json) {
        console.log(formatJson(info));
      } else {
        for (const [k, v] of Object.entries(info)) {
          if (v !== undefined && v !== '') console.log(`${k}: ${String(v).replace(/\n/g, ' ')}`);
        }
      }
      await disconnectClient();
    } catch (error) {
      fail(spinner, 'Failed to fetch chat info', error);
    }
  });

export const topicsCommand = new Command('topics')
  .description('List forum topics of a forum supergroup (use the ID with read/send --topic)')
  .argument('<chat>', 'Forum supergroup name, @username or ID')
  .option('-q, --query <text>', 'Only topics whose title matches')
  .option('-n, --limit <number>', 'Maximum topics', '100')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    const spinner = ora(`Fetching topics of "${chat}"...`).start();
    try {
      const client = await getClient();
      const res = await getForumTopics(client, chat, { limit: parseInt(options.limit), query: options.query });
      spinner.stop();
      if (options.json) {
        console.log(formatJson(res));
      } else {
        console.log(`# ${res.chatTitle}`);
        for (const t of res.topics) {
          const flags = [t.pinned ? 'pinned' : '', t.closed ? 'closed' : ''].filter(Boolean).join(',');
          console.log(`${t.id}${flags ? ' ' + flags : ''}${t.unread ? ` unread=${t.unread}` : ''} ${t.title}`);
        }
      }
      await disconnectClient();
    } catch (error) {
      fail(spinner, 'Failed to fetch topics', error);
    }
  });

export const linkCommand = new Command('link')
  .description('Get the t.me link to a message in a channel or supergroup')
  .argument('<chat>', 'Channel/supergroup name, @username or ID')
  .argument('<messageId>', 'Message ID')
  .option('--thread', 'Link to the message inside its comments thread')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageId, options) => {
    const spinner = ora('Exporting link...').start();
    try {
      const client = await getClient();
      const link = await getMessageLink(client, chat, parseInt(messageId), { thread: options.thread });
      spinner.stop();
      console.log(options.json ? formatJson({ link }) : link);
      await disconnectClient();
    } catch (error) {
      fail(spinner, 'Failed to get link', error);
    }
  });
