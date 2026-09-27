import { Command } from 'commander';
import { getClient, joinChat, leaveChat, exportInviteLink, setArchived, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from 'chalk';
import ora from '../spinner.js';

export const joinCommand = new Command('join')
  .description('Join a channel/group by @username or invite link')
  .argument('<target>', '@username, t.me link, or invite link (t.me/+hash)')
  .option('--json', 'Output as JSON')
  .action(async (target, options) => {
    assertWriteEnabled();
    const spinner = ora(`Joining "${target}"...`).start();
    try {
      const client = await getClient();
      const result = await joinChat(client, target);
      auditLog({ timestamp: new Date().toISOString(), command: 'join', target, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ joined: result.title }));
      else console.log(chalk.green(`✓ Joined "${result.title}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'join', target, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to join');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const leaveCommand = new Command('leave')
  .description('Leave a group or channel')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    assertWriteEnabled();
    const spinner = ora(`Leaving "${chat}"...`).start();
    try {
      const client = await getClient();
      const result = await leaveChat(client, chat);
      auditLog({ timestamp: new Date().toISOString(), command: 'leave', target: chat, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ left: result.title }));
      else console.log(chalk.green(`✓ Left "${result.title}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'leave', target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to leave');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const inviteLinkCommand = new Command('invite-link')
  .description('Export (or generate) the invite link for a chat')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    assertWriteEnabled();
    const spinner = ora(`Getting invite link for "${chat}"...`).start();
    try {
      const client = await getClient();
      const result = await exportInviteLink(client, chat);
      auditLog({ timestamp: new Date().toISOString(), command: 'invite-link', target: chat, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: result.title, link: result.link }));
      else console.log(`${chalk.bold(result.title)}: ${chalk.blue(result.link)}`);
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'invite-link', target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to get invite link');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

function makeArchiveCommand(name: 'archive' | 'unarchive', archived: boolean): Command {
  return new Command(name)
    .description(archived ? 'Archive a chat' : 'Unarchive a chat')
    .argument('<chat>', 'Chat name, username (@user), or ID')
    .option('--json', 'Output as JSON')
    .action(async (chat, options) => {
      assertWriteEnabled();
      const spinner = ora(`${archived ? 'Archiving' : 'Unarchiving'} "${chat}"...`).start();
      try {
        const client = await getClient();
        const result = await setArchived(client, chat, archived);
        auditLog({ timestamp: new Date().toISOString(), command: name, target: chat, result: { success: true } });
        spinner.stop();
        if (options.json) console.log(formatJson({ chat: result.title, archived }));
        else console.log(chalk.green(`✓ ${archived ? 'Archived' : 'Unarchived'} "${result.title}"`));
        await disconnectClient();
      } catch (error) {
        auditLog({ timestamp: new Date().toISOString(), command: name, target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
        spinner.fail(`Failed to ${name}`);
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

export const archiveCommand = makeArchiveCommand('archive', true);
export const unarchiveCommand = makeArchiveCommand('unarchive', false);
