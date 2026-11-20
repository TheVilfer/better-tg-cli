import { Command } from 'commander';
import { getClient, pinChatMessage, unpinChatMessage, disconnectClient, chatRef } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';
import { fail } from '../errors.js';
import { positiveInt } from '../args.js';

export const pinCommand = new Command('pin')
  .description('Pin a message in a chat')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<messageId>', 'Message ID (the #number shown by `telegram read`)', positiveInt)
  .option('--notify', 'Notify chat members about the pin (default: silent)')
  .option('--one-side', 'In a private chat, pin only on your side')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageId, options) => {
    await assertWriteEnabled();

    const id: number = messageId;

    const spinner = ora(`Pinning #${id} in "${chat}"...`).start();

    try {
      const client = await getClient();
      const result = await pinChatMessage(client, chat, id, { notify: options.notify, pmOneSide: options.oneSide });

      auditLog({ timestamp: new Date().toISOString(), command: 'pin', target: chat, message: `#${id}`, result: { success: true } });
      spinner.stop();

      if (options.json) {
        console.log(formatJson({ ok: true, action: 'pin', ...await chatRef(client, chat), chat: result.chatTitle, messageId: id, pinned: true }));
      } else {
        console.log(chalk.green(`✓ Pinned #${id} in "${result.chatTitle}"`));
      }

      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'pin', target: chat, message: `#${id}`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      fail(error, spinner, 'Failed to pin');
    }
  });

export const unpinCommand = new Command('unpin')
  .description('Unpin a message (or all pinned messages) in a chat')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('[messageId]', 'Message ID to unpin; omit to unpin all messages', positiveInt)
  .option('--json', 'Output as JSON')
  .action(async (chat, messageId, options) => {
    await assertWriteEnabled();

    const id: number | undefined = messageId;

    const spinner = ora(id == null ? `Unpinning all in "${chat}"...` : `Unpinning #${id} in "${chat}"...`).start();

    try {
      const client = await getClient();
      const result = await unpinChatMessage(client, chat, id);

      auditLog({ timestamp: new Date().toISOString(), command: 'unpin', target: chat, message: id == null ? '(all)' : `#${id}`, result: { success: true } });
      spinner.stop();

      if (options.json) {
        console.log(formatJson({ ok: true, action: 'unpin', ...await chatRef(client, chat), chat: result.chatTitle, messageId: id ?? null, unpinnedAll: result.all }));
      } else if (result.all) {
        console.log(chalk.green(`✓ Unpinned all messages in "${result.chatTitle}"`));
      } else {
        console.log(chalk.green(`✓ Unpinned #${id} in "${result.chatTitle}"`));
      }

      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'unpin', target: chat, message: id == null ? '(all)' : `#${id}`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      fail(error, spinner, 'Failed to unpin');
    }
  });
