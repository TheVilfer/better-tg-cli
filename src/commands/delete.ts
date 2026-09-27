import { Command } from 'commander';
import { getClient, deleteChatMessages, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const deleteCommand = new Command('delete')
  .description('Delete one or more messages')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<messageIds>', 'Message ID, or comma-separated IDs (e.g. 123 or 123,124)')
  .option('--just-me', 'Delete only for you (do not revoke for everyone)')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageIds, options) => {
    assertWriteEnabled();
    const ids = messageIds.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => Number.isInteger(n));
    if (ids.length === 0) {
      console.error('Provide at least one numeric message ID');
      process.exit(1);
    }
    const revoke = !options.justMe;
    const spinner = ora(`Deleting ${ids.length} message(s)...`).start();
    try {
      const client = await getClient();
      const result = await deleteChatMessages(client, chat, ids, revoke);
      auditLog({ timestamp: new Date().toISOString(), command: 'delete', target: chat, message: `[${ids.join(',')}] revoke=${revoke}`, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: result.chatTitle, deleted: ids, revoke }));
      else console.log(chalk.green(`✓ Deleted ${result.count} message(s) in "${result.chatTitle}"${revoke ? ' (for everyone)' : ' (just for you)'}`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'delete', target: chat, message: `[${ids.join(',')}]`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to delete');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
