import { Command, InvalidArgumentError } from 'commander';
import { getClient, sendMessage, disconnectClient, chatRef } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';
import { readTextArg } from '../text.js';
import { fail } from '../errors.js';
import { positiveInt } from '../args.js';

export function parseScheduleToEpoch(value: string): number {
  const rel = value.match(/^(\d+)([mhd])$/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const mult = rel[2] === 'm' ? 60 : rel[2] === 'h' ? 3600 : 86400;
    return Math.floor(Date.now() / 1000) + n * mult;
  }
  const abs = Date.parse(value);
  if (!Number.isNaN(abs)) return Math.floor(abs / 1000);
  throw new InvalidArgumentError('Use "30m", "2h", "1d" or an ISO date like 2026-12-01T09:00.');
}

/** --schedule is checked while parsing (exit 2, before the write guard) and resolved when sending. */
function scheduleArg(value: string): string {
  parseScheduleToEpoch(value);
  return value;
}

export const sendCommand = new Command('send')
  .description('Send a message')
  .argument('<target>', 'Chat name, @username, numeric ID, or "me"')
  .argument('<message>', 'Message text, or "-" to read it from stdin')
  .option('--markdown', 'Parse the message as GramJS Markdown: **bold**, __italic__, `code`; [text](url) links do not work, use --html')
  .option('--html', 'Parse the message as HTML')
  .option('--schedule <when>', 'Schedule for later: "30m", "2h", "1d", or an ISO date', scheduleArg)
  .option('--silent', 'Send without a notification sound')
  .option('--reply-to <id>', 'Reply to this message ID', positiveInt)
  .option('--topic <id>', 'Post into this forum topic (ID from `telegram topics`)', positiveInt)
  .option('--json', 'Output as JSON')
  .action(async (target, messageArg, options) => {
    assertWriteEnabled();
    const message = readTextArg(messageArg);
    const parseMode = options.html ? 'html' : options.markdown ? 'md' : undefined;
    const schedule = options.schedule ? parseScheduleToEpoch(options.schedule) : undefined;
    const spinner = ora(`${schedule ? 'Scheduling' : 'Sending'} message to "${target}"...`).start();

    try {
      const client = await getClient();
      const result = await sendMessage(client, target, message, options.replyTo, {
        parseMode, schedule, silent: options.silent, topic: options.topic,
      });
      const ref = await chatRef(client, target);
      auditLog({ timestamp: new Date().toISOString(), command: 'send', target, message, result: { success: true, messageId: result.id } });

      spinner.succeed(chalk.green('Message sent'));

      if (options.json) {
        console.log(formatJson({
          ok: true,
          action: 'send',
          ...ref,
          messageId: result.id,
          id: result.id,
          date: result.date ? new Date(result.date * 1000).toISOString() : null,
          text: result.message,
          ...(options.replyTo ? { replyToMsgId: options.replyTo } : {}),
          ...(options.topic ? { topic: options.topic } : {}),
        }));
      } else {
        console.log(chalk.gray(`Message ID: ${result.id} in ${ref.chatTitle} (${ref.chatId})`));
      }

      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'send', target, message, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      fail(error, spinner, 'Failed to send message');
    }
  });
