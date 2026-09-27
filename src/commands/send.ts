import { Command } from 'commander';
import { getClient, sendMessage, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from 'chalk';
import ora from 'ora';

function parseScheduleToEpoch(value: string): number {
  const rel = value.match(/^(\d+)([mhd])$/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const mult = rel[2] === 'm' ? 60 : rel[2] === 'h' ? 3600 : 86400;
    return Math.floor(Date.now() / 1000) + n * mult;
  }
  const abs = Date.parse(value);
  if (!Number.isNaN(abs)) return Math.floor(abs / 1000);
  throw new Error(`Invalid --schedule value: ${value}. Use "30m"/"2h"/"1d" or an ISO date.`);
}

export const sendCommand = new Command('send')
  .description('Send a message')
  .argument('<target>', 'Chat name, username (@user), or ID')
  .argument('<message>', 'Message text')
  .option('--markdown', 'Parse the message as Markdown (bold, links, etc.)')
  .option('--html', 'Parse the message as HTML')
  .option('--schedule <when>', 'Schedule for later: "30m", "2h", "1d", or an ISO date')
  .option('--silent', 'Send without a notification sound')
  .option('--json', 'Output as JSON')
  .action(async (target, message, options) => {
    assertWriteEnabled();
    const parseMode = options.html ? 'html' : options.markdown ? 'md' : undefined;
    const schedule = options.schedule ? parseScheduleToEpoch(options.schedule) : undefined;
    const spinner = ora(`${schedule ? 'Scheduling' : 'Sending'} message to "${target}"...`).start();

    try {
      const client = await getClient();
      const result = await sendMessage(client, target, message, undefined, { parseMode, schedule, silent: options.silent });
      auditLog({ timestamp: new Date().toISOString(), command: 'send', target, message, result: { success: true, messageId: result.id } });

      spinner.succeed(chalk.green('Message sent'));

      if (options.json) {
        console.log(formatJson({
          id: result.id,
          date: result.date ? new Date(result.date * 1000).toISOString() : null,
          text: result.message,
        }));
      } else {
        console.log(chalk.gray(`Message ID: ${result.id}`));
      }

      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'send', target, message, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to send message');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
