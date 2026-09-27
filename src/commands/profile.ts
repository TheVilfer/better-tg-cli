import { Command } from 'commander';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { getClient, updateProfile, updateUsername, setProfilePhoto, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const setNameCommand = new Command('set-name')
  .description('Update your own first (and optional last) name')
  .argument('<firstName>', 'New first name')
  .argument('[lastName]', 'New last name (optional)')
  .option('--json', 'Output as JSON')
  .action(async (firstName, lastName, options) => {
    assertWriteEnabled();
    const spinner = ora('Updating name...').start();
    try {
      const client = await getClient();
      await updateProfile(client, { firstName, lastName: lastName ?? '' });
      auditLog({ timestamp: new Date().toISOString(), command: 'set-name', target: 'me', result: { success: true } });
      spinner.stop();
      const name = [firstName, lastName].filter(Boolean).join(' ');
      if (options.json) console.log(formatJson({ firstName, lastName: lastName ?? '' }));
      else console.log(chalk.green(`✓ Name updated to "${name}"`));
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to update name');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const setBioCommand = new Command('set-bio')
  .description('Update your own bio / about text')
  .argument('<text>', 'New bio text')
  .option('--json', 'Output as JSON')
  .action(async (text, options) => {
    assertWriteEnabled();
    const spinner = ora('Updating bio...').start();
    try {
      const client = await getClient();
      await updateProfile(client, { about: text });
      auditLog({ timestamp: new Date().toISOString(), command: 'set-bio', target: 'me', result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ about: text }));
      else console.log(chalk.green('✓ Bio updated'));
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to update bio');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const setUsernameCommand = new Command('set-username')
  .description('Update your own @username')
  .argument('<username>', 'New username (without @)')
  .option('--json', 'Output as JSON')
  .action(async (username, options) => {
    assertWriteEnabled();
    const clean = username.replace(/^@/, '');
    const spinner = ora(`Setting username to @${clean}...`).start();
    try {
      const client = await getClient();
      await updateUsername(client, clean);
      auditLog({ timestamp: new Date().toISOString(), command: 'set-username', target: clean, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ username: clean }));
      else console.log(chalk.green(`✓ Username set to @${clean}`));
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to set username');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const setAvatarCommand = new Command('set-avatar')
  .description('Set your own profile photo from an image file')
  .argument('<path>', 'Path to an image file')
  .option('--json', 'Output as JSON')
  .action(async (path, options) => {
    assertWriteEnabled();
    const filePath = resolve(path);
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    const spinner = ora('Uploading profile photo...').start();
    try {
      const client = await getClient();
      await setProfilePhoto(client, filePath);
      auditLog({ timestamp: new Date().toISOString(), command: 'set-avatar', target: filePath, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ avatar: filePath, updated: true }));
      else console.log(chalk.green('✓ Profile photo updated'));
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to set profile photo');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
