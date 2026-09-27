import { Command } from 'commander';
import { getClient, addContact, deleteContact, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const addContactCommand = new Command('add-contact')
  .description('Add a user to your contacts')
  .argument('<user>', 'Username (@user) or ID')
  .argument('<firstName>', 'First name for the contact')
  .argument('[lastName]', 'Last name (optional)')
  .option('--json', 'Output as JSON')
  .action(async (user, firstName, lastName, options) => {
    assertWriteEnabled();
    const spinner = ora(`Adding contact "${firstName}"...`).start();
    try {
      const client = await getClient();
      const result = await addContact(client, user, firstName, lastName || '');
      auditLog({ timestamp: new Date().toISOString(), command: 'add-contact', target: user, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ contact: result.name, added: true }));
      else console.log(chalk.green(`✓ Added contact "${result.name}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'add-contact', target: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to add contact');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const delContactCommand = new Command('del-contact')
  .description('Remove a user from your contacts')
  .argument('<user>', 'Username (@user), name, or ID')
  .option('--json', 'Output as JSON')
  .action(async (user, options) => {
    assertWriteEnabled();
    const spinner = ora(`Removing contact "${user}"...`).start();
    try {
      const client = await getClient();
      const result = await deleteContact(client, user);
      auditLog({ timestamp: new Date().toISOString(), command: 'del-contact', target: user, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ contact: result.name, removed: true }));
      else console.log(chalk.green(`✓ Removed contact "${result.name}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'del-contact', target: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to remove contact');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
