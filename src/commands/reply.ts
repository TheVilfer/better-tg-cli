import { Command } from 'commander';
import { getClient, sendMessage, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';
import { readTextArg } from '../text.js';

export const replyCommand = new Command('reply')
  .description('Reply to a message')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<msg-id>', 'Message ID to reply to')
  .argument('<message>', 'Reply text, or "-" to read it from stdin')
  .option('--markdown', 'Parse the reply as Markdown')
  .option('--html', 'Parse the reply as HTML')
  .option('--silent', 'Send without a notification sound')
  .option('--json', 'Output as JSON')
  .action(async (chat, msgId, messageArg, options) => {
    assertWriteEnabled();
    const message = readTextArg(messageArg);
    const parseMode = options.html ? 'html' : options.markdown ? 'md' : undefined;
    const spinner = ora('Sending reply...').start();

    try {
      const client = await getClient();
      const result = await sendMessage(client, chat, message, parseInt(msgId), { parseMode, silent: options.silent });
      auditLog({ timestamp: new Date().toISOString(), command: 'reply', target: chat, message, replyToMsgId: parseInt(msgId), result: { success: true, messageId: result.id } });

      spinner.succeed(chalk.green('Reply sent'));

      if (options.json) {
        console.log(formatJson({
          id: result.id,
          replyToMsgId: parseInt(msgId),
          date: result.date ? new Date(result.date * 1000).toISOString() : null,
          text: result.message,
        }));
      } else {
        console.log(chalk.gray(`Message ID: ${result.id}`));
      }

      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'reply', target: chat, message, replyToMsgId: parseInt(msgId), result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to send reply');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
