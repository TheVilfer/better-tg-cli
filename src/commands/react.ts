import { Command } from 'commander';
import { getClient, reactToMessage, disconnectClient, chatRef } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';
import { fail, usageError } from '../errors.js';
import { positiveInt } from '../args.js';

export const reactCommand = new Command('react')
  .description('React to a message with an emoji (or remove your reaction)')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<messageId>', 'Message ID (the #number shown by `telegram read`)', positiveInt)
  .argument('[emoji]', 'Emoji reaction, e.g. 👍 (omit together with --remove to clear it)')
  .option('--big', 'Play the big / animated reaction effect')
  .option('--remove', 'Remove your reaction from the message')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageId, emoji, options) => {
    assertWriteEnabled();

    const id: number = messageId;
    if (!emoji && !options.remove) fail(usageError('Provide an emoji to react with, or use --remove to clear your reaction'));

    const spinner = ora(options.remove ? `Removing reaction on #${id}...` : `Reacting ${emoji} to #${id}...`).start();

    try {
      const client = await getClient();
      const result = await reactToMessage(client, chat, id, emoji, { big: options.big, remove: options.remove });

      auditLog({
        timestamp: new Date().toISOString(),
        command: 'react',
        target: chat,
        message: `#${id} ${result.removed ? '(removed)' : result.emoji}`,
        result: { success: true },
      });

      spinner.stop();

      if (options.json) {
        console.log(formatJson({ ok: true, action: 'react', ...await chatRef(client, chat), chat: result.chatTitle, messageId: id, ...result }));
      } else if (result.removed) {
        console.log(chalk.green(`✓ Removed your reaction on #${id} in "${result.chatTitle}"`));
      } else {
        console.log(chalk.green(`✓ Reacted ${result.emoji} to #${id} in "${result.chatTitle}"`));
      }

      await disconnectClient();
    } catch (error) {
      auditLog({
        timestamp: new Date().toISOString(),
        command: 'react',
        target: chat,
        message: `#${id} ${emoji ?? '(remove)'}`,
        result: { success: false, error: error instanceof Error ? error.message : String(error) },
      });
      fail(error, spinner, 'Failed to react');
    }
  });
