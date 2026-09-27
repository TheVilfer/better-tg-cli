import { Command } from 'commander';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { getClient, sendFileMessage, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';
import { readTextArg } from '../text.js';

export const sendFileCommand = new Command('send-file')
  .description('Send a photo or document to a chat')
  .argument('<target>', 'Chat name, username (@user), or ID')
  .argument('<path>', 'Path to file to send')
  .option('-c, --caption <text>', 'Optional caption ("-" reads it from stdin)')
  .option('--html', 'Parse the caption as HTML')
  .option('--markdown', 'Parse the caption as Markdown')
  .option('--silent', 'Send without a notification sound')
  .option('--topic <id>', 'Post into this forum topic')
  .option('--as-document', 'Send images as uncompressed documents')
  .option('--reply-to <id>', 'Reply to a specific message ID')
  .option('--json', 'Output as JSON')
  .action(async (target, filePath, options) => {
    assertWriteEnabled();
    if (options.caption) options.caption = readTextArg(options.caption);

    const absPath = resolve(filePath);
    if (!existsSync(absPath)) {
      console.error(chalk.red(`File not found: ${absPath}`));
      process.exit(1);
    }

    const stat = statSync(absPath);
    if (!stat.isFile()) {
      console.error(chalk.red(`Not a regular file: ${absPath}`));
      process.exit(1);
    }

    const spinner = ora(`Uploading "${absPath}" to "${target}"...`).start();

    try {
      const client = await getClient();
      const result = await sendFileMessage(client, target, absPath, {
        caption: options.caption,
        asDocument: options.asDocument,
        replyToMsgId: options.replyTo ? parseInt(options.replyTo, 10) : undefined,
        parseMode: options.html ? 'html' : options.markdown ? 'md' : undefined,
        silent: options.silent,
        topic: options.topic ? parseInt(options.topic, 10) : undefined,
      });

      auditLog({
        timestamp: new Date().toISOString(),
        command: 'send-file',
        target,
        message: `file:${absPath}${options.caption ? ` caption:${options.caption}` : ''}`,
        result: { success: true, messageId: result.id },
      });

      spinner.succeed(chalk.green('File sent'));

      if (options.json) {
        console.log(formatJson({
          id: result.id,
          date: result.date ? new Date(result.date * 1000).toISOString() : null,
          file: absPath,
          caption: options.caption ?? null,
        }));
      } else {
        console.log(chalk.gray(`Message ID: ${result.id}`));
      }

      await disconnectClient();
      process.exit(0);
    } catch (error) {
      auditLog({
        timestamp: new Date().toISOString(),
        command: 'send-file',
        target,
        message: `file:${absPath}`,
        result: { success: false, error: error instanceof Error ? error.message : String(error) },
      });
      spinner.fail('Failed to send file');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
