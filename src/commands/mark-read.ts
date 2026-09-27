import { Command } from 'commander';
import { getClient, markChatRead, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const markReadCommand = new Command('mark-read')
  .description('Mark a chat as read (clear its unread badge)')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    assertWriteEnabled();
    const spinner = ora(`Marking "${chat}" as read...`).start();
    try {
      const client = await getClient();
      const result = await markChatRead(client, chat);
      auditLog({ timestamp: new Date().toISOString(), command: 'mark-read', target: chat, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: result.chatTitle, read: true }));
      else console.log(chalk.green(`✓ Marked "${result.chatTitle}" as read`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'mark-read', target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to mark read');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
