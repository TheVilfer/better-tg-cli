import { Command } from 'commander';
import { getClient, sendTyping, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from 'chalk';
import ora from '../spinner.js';

const ACTIONS = ['typing', 'photo', 'video', 'audio', 'document', 'cancel'] as const;

export const typingCommand = new Command('typing')
  .description('Show a "typing…" (or uploading) status in a chat')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('[action]', `One of: ${ACTIONS.join(', ')}`, 'typing')
  .option('--json', 'Output as JSON')
  .action(async (chat, action, options) => {
    assertWriteEnabled();
    if (!ACTIONS.includes(action)) {
      console.error(`Action must be one of: ${ACTIONS.join(', ')}`);
      process.exit(1);
    }
    const spinner = ora(`Sending "${action}" status to "${chat}"...`).start();
    try {
      const client = await getClient();
      const result = await sendTyping(client, chat, action);
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: result.title, action }));
      else console.log(chalk.green(`✓ Sent "${action}" status to "${result.title}"`));
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to send status');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
