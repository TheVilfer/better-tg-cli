import { Command } from 'commander';
import { getClient, createGroup, createChannel, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const createGroupCommand = new Command('create-group')
  .description('Create a new group with members')
  .argument('<title>', 'Group title')
  .argument('<users...>', 'Users to add (@username or ID), at least one')
  .option('--json', 'Output as JSON')
  .action(async (title, users, options) => {
    assertWriteEnabled();
    const spinner = ora(`Creating group "${title}"...`).start();
    try {
      const client = await getClient();
      const result = await createGroup(client, title, users);
      auditLog({ timestamp: new Date().toISOString(), command: 'create-group', target: title, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ title: result.title, id: result.id }));
      else console.log(chalk.green(`✓ Created group "${result.title}"${result.id ? ` (id ${result.id})` : ''}`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'create-group', target: title, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to create group');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const createChannelCommand = new Command('create-channel')
  .description('Create a new channel or supergroup')
  .argument('<title>', 'Channel/supergroup title')
  .option('-a, --about <text>', 'Description', '')
  .option('--broadcast', 'Create a broadcast channel (default: supergroup)')
  .option('--json', 'Output as JSON')
  .action(async (title, options) => {
    assertWriteEnabled();
    const spinner = ora(`Creating ${options.broadcast ? 'channel' : 'supergroup'} "${title}"...`).start();
    try {
      const client = await getClient();
      const result = await createChannel(client, title, options.about, { broadcast: options.broadcast });
      auditLog({ timestamp: new Date().toISOString(), command: 'create-channel', target: title, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ title: result.title, id: result.id, broadcast: !!options.broadcast }));
      else console.log(chalk.green(`✓ Created "${result.title}"${result.id ? ` (id ${result.id})` : ''}`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'create-channel', target: title, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to create channel');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
