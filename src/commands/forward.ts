import { Command } from 'commander';
import { getClient, forwardMessages, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from 'chalk';
import ora from '../spinner.js';

export const forwardCommand = new Command('forward')
  .description('Forward one or more messages to another chat')
  .argument('<fromChat>', 'Source chat name, username (@user), or ID')
  .argument('<messageIds>', 'Message ID, or comma-separated IDs (e.g. 123 or 123,124,125)')
  .argument('<toChat>', 'Destination chat name, username (@user), or ID')
  .option('--silent', 'Forward without a notification sound')
  .option('--drop-author', 'Hide the original sender (no "forwarded from" header)')
  .option('--json', 'Output as JSON')
  .action(async (fromChat, messageIds, toChat, options) => {
    assertWriteEnabled();

    const ids = messageIds
      .split(',')
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => Number.isInteger(n));

    if (ids.length === 0) {
      console.error('Provide at least one numeric message ID');
      process.exit(1);
    }

    const spinner = ora(`Forwarding ${ids.length} message(s) from "${fromChat}" to "${toChat}"...`).start();

    try {
      const client = await getClient();
      const result = await forwardMessages(client, fromChat, ids, toChat, {
        silent: options.silent,
        dropAuthor: options.dropAuthor,
      });

      auditLog({
        timestamp: new Date().toISOString(),
        command: 'forward',
        target: toChat,
        message: `${ids.length} from ${fromChat} [${ids.join(',')}]`,
        result: { success: true },
      });

      spinner.stop();

      if (options.json) {
        console.log(formatJson({ ...result, messageIds: ids }));
      } else {
        console.log(chalk.green(`✓ Forwarded ${result.count} message(s) from "${result.fromTitle}" to "${result.toTitle}"`));
      }

      await disconnectClient();
    } catch (error) {
      auditLog({
        timestamp: new Date().toISOString(),
        command: 'forward',
        target: toChat,
        message: `from ${fromChat} [${ids.join(',')}]`,
        result: { success: false, error: error instanceof Error ? error.message : String(error) },
      });
      spinner.fail('Failed to forward');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
