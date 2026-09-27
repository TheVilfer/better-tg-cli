import { Command } from 'commander';
import { getClient, kickUser, disconnectClient } from '../client.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import ora from '../spinner.js';
import { formatJson } from '../formatters/json.js';

export const kickCommand = new Command('kick')
  .description('Kick/remove a user from a group')
  .argument('<group>', 'Group name or username')
  .argument('<user>', 'Username to kick (e.g., @username)')
  .option('--json', 'Output as JSON')
  .action(async (group, user, options) => {
    assertWriteEnabled();
    const spinner = ora(`Kicking ${user} from "${group}"...`).start();

    try {
      const client = await getClient();
      const result = await kickUser(client, group, user);
      auditLog({ timestamp: new Date().toISOString(), command: 'kick', target: group, kickedUser: user, result: { success: result.success } });

      if (result.success) {
        if (options.json) {
          spinner.stop();
          console.log(formatJson(result));
        } else {
          spinner.succeed(result.message);
        }
      } else {
        if (options.json) {
          spinner.stop();
          console.log(formatJson(result));
        } else {
          spinner.fail(result.message);
        }
        process.exit(1);
      }

      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'kick', target: group, kickedUser: user, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to kick user');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
