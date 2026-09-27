import { Command } from 'commander';
import { getClient, editMessageText, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from 'chalk';
import ora from '../spinner.js';
import { readTextArg } from '../text.js';

export const editCommand = new Command('edit')
  .description('Edit one of your own messages')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<messageId>', 'Message ID to edit')
  .argument('<text>', 'New message text, or "-" to read it from stdin')
  .option('--markdown', 'Parse the new text as Markdown')
  .option('--html', 'Parse the new text as HTML')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageId, textArg, options) => {
    assertWriteEnabled();
    const text = readTextArg(textArg);
    const id = parseInt(messageId, 10);
    if (!Number.isInteger(id)) {
      console.error('Message ID must be a number');
      process.exit(1);
    }
    const parseMode = options.html ? 'html' : options.markdown ? 'md' : undefined;
    const spinner = ora(`Editing #${id}...`).start();
    try {
      const client = await getClient();
      const result = await editMessageText(client, chat, id, text, { parseMode });
      auditLog({ timestamp: new Date().toISOString(), command: 'edit', target: chat, message: `#${id}`, result: { success: true, messageId: id } });
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: result.chatTitle, messageId: result.id, edited: true }));
      else console.log(chalk.green(`✓ Edited #${id} in "${result.chatTitle}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'edit', target: chat, message: `#${id}`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to edit');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
