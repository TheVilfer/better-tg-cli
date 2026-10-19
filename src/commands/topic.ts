import { Command } from 'commander';
import { getClient, createForumTopic, editForumTopic, pinForumTopic, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

function parseTopicId(value: string): number {
  const id = parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) { console.error('Topic ID must be a number'); process.exit(1); }
  return id;
}

async function run(
  command: string,
  chat: string,
  spinnerText: string,
  work: (client: Awaited<ReturnType<typeof getClient>>) => Promise<unknown>,
  ok: (result: unknown) => string,
  options: { json?: boolean },
): Promise<void> {
  assertWriteEnabled();
  const spinner = ora(spinnerText).start();
  try {
    const client = await getClient();
    const result = await work(client);
    auditLog({ timestamp: new Date().toISOString(), command, target: chat, result: { success: true } });
    spinner.stop();
    if (options.json) console.log(formatJson(result as object));
    else console.log(chalk.green(ok(result)));
    await disconnectClient();
  } catch (error) {
    auditLog({ timestamp: new Date().toISOString(), command, target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    spinner.fail('Failed');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export const topicCommand = new Command('topic')
  .description('Manage forum topics (create, edit, close, reopen, pin). List them with `topics <chat>`.');

topicCommand
  .command('create')
  .description('Create a forum topic')
  .argument('<chat>', 'Forum supergroup name, username (@chat), or ID')
  .argument('<title>', 'Topic title')
  .option('--icon-color <int>', 'Icon color (decimal RGB)')
  .option('--icon-emoji <id>', 'Custom-emoji document ID for the icon')
  .option('--json', 'Output as JSON')
  .action((chat, title, options) =>
    run('topic create', chat, `Creating topic "${title}" in "${chat}"...`,
      client => createForumTopic(client, chat, title, { iconColor: options.iconColor ? parseInt(options.iconColor, 10) : undefined, iconEmojiId: options.iconEmoji }),
      () => `✓ Created topic "${title}" in "${chat}"`, options));

topicCommand
  .command('edit')
  .description('Edit a topic title, icon, or closed/hidden state')
  .argument('<chat>', 'Forum supergroup name, username (@chat), or ID')
  .argument('<topicId>', 'Topic ID (from `telegram topics <chat>`)')
  .option('--title <title>', 'New title')
  .option('--icon-emoji <id>', 'New custom-emoji document ID')
  .option('--hide', 'Hide the topic (General topic only)')
  .option('--show', 'Unhide the topic')
  .option('--json', 'Output as JSON')
  .action((chat, topicId, options) => {
    const id = parseTopicId(topicId);
    const hidden = options.hide ? true : options.show ? false : undefined;
    if (options.title === undefined && options.iconEmoji === undefined && hidden === undefined) {
      console.error('Nothing to change: pass --title, --icon-emoji, --hide or --show.');
      process.exit(1);
    }
    return run('topic edit', chat, `Editing topic ${id} in "${chat}"...`,
      client => editForumTopic(client, chat, id, { title: options.title, iconEmojiId: options.iconEmoji, hidden }),
      () => `✓ Edited topic ${id} in "${chat}"`, options);
  });

function makeToggle(name: 'close' | 'reopen' | 'pin' | 'unpin', verb: string, past: string): Command {
  return new Command(name)
    .description(`${verb} a forum topic`)
    .argument('<chat>', 'Forum supergroup name, username (@chat), or ID')
    .argument('<topicId>', 'Topic ID (from `telegram topics <chat>`)')
    .option('--json', 'Output as JSON')
    .action((chat, topicId, options) => {
      const id = parseTopicId(topicId);
      return run(`topic ${name}`, chat, `${verb} topic ${id} in "${chat}"...`,
        client => (name === 'close' || name === 'reopen')
          ? editForumTopic(client, chat, id, { closed: name === 'close' })
          : pinForumTopic(client, chat, id, name === 'pin'),
        () => `✓ ${past} topic ${id} in "${chat}"`, options);
    });
}

topicCommand.addCommand(makeToggle('close', 'Close', 'Closed'));
topicCommand.addCommand(makeToggle('reopen', 'Reopen', 'Reopened'));
topicCommand.addCommand(makeToggle('pin', 'Pin', 'Pinned'));
topicCommand.addCommand(makeToggle('unpin', 'Unpin', 'Unpinned'));
