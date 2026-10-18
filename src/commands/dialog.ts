import { Command } from 'commander';
import { getClient, toggleDialogPin, markDialogUnread, deleteDialog, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

function makePinCommand(name: 'pin-chat' | 'unpin-chat', pinned: boolean): Command {
  return new Command(name)
    .description(pinned ? 'Pin a chat to the top of the dialog list' : 'Unpin a chat from the top of the dialog list')
    .argument('<chat>', 'Chat name, username (@user), or ID')
    .option('--json', 'Output as JSON')
    .action(async (chat, options) => {
      assertWriteEnabled();
      const spinner = ora(`${pinned ? 'Pinning' : 'Unpinning'} "${chat}"...`).start();
      try {
        const client = await getClient();
        const { title } = await toggleDialogPin(client, chat, pinned);
        auditLog({ timestamp: new Date().toISOString(), command: name, target: chat, result: { success: true } });
        spinner.stop();
        if (options.json) console.log(formatJson({ chat: title, pinned }));
        else console.log(chalk.green(`✓ ${pinned ? 'Pinned' : 'Unpinned'} "${title}"`));
        await disconnectClient();
      } catch (error) {
        auditLog({ timestamp: new Date().toISOString(), command: name, target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
        spinner.fail(`Failed to ${pinned ? 'pin' : 'unpin'} chat`);
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

export const pinChatCommand = makePinCommand('pin-chat', true);
export const unpinChatCommand = makePinCommand('unpin-chat', false);

export const markUnreadCommand = new Command('mark-unread')
  .description('Mark a chat as unread (or clear that with --read)')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .option('--read', 'Clear the unread mark instead of setting it')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    assertWriteEnabled();
    const unread = !options.read;
    const spinner = ora(`Marking "${chat}" ${unread ? 'unread' : 'read'}...`).start();
    try {
      const client = await getClient();
      const { title } = await markDialogUnread(client, chat, unread);
      auditLog({ timestamp: new Date().toISOString(), command: 'mark-unread', target: chat, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: title, unread }));
      else console.log(chalk.green(`✓ Marked "${title}" ${unread ? 'unread' : 'read'}`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'mark-unread', target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to mark the chat');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const deleteDialogCommand = new Command('delete-dialog')
  .description('Delete a conversation: clears a private/basic-group history, or leaves a supergroup/channel')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .option('--revoke', 'In a private chat, also delete the messages for the other person')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    assertWriteEnabled();
    const spinner = ora(`Deleting dialog "${chat}"...`).start();
    try {
      const client = await getClient();
      const { title, left } = await deleteDialog(client, chat, { revoke: options.revoke });
      auditLog({ timestamp: new Date().toISOString(), command: 'delete-dialog', target: chat, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: title, left, revoked: options.revoke || undefined }));
      else console.log(chalk.green(`✓ ${left ? 'Left' : 'Deleted the conversation with'} "${title}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'delete-dialog', target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to delete the dialog');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
