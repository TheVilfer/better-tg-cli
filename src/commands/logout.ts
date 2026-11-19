import { Command } from 'commander';
import { clearSessionString } from '../config.js';
import { clearApprovals } from '../approval.js';
import { auditLog } from '../audit.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const logoutCommand = new Command('logout')
  .description('Clear saved session (log out)')
  .action(async () => {
    const spinner = ora('Logging out...').start();

    try {
      clearSessionString();
      // Pending approvals were given for this account; none may carry over to the next login
      clearApprovals();

      auditLog({
        timestamp: new Date().toISOString(),
        command: 'logout',
        target: '',
        result: { success: true },
      });

      spinner.succeed(chalk.green('Logged out. To log in again, run "telegram onboard" (a person at their own terminal can use "telegram auth --qr").'));
    } catch (error) {
      auditLog({
        timestamp: new Date().toISOString(),
        command: 'logout',
        target: '',
        result: { success: false, error: error instanceof Error ? error.message : String(error) },
      });

      spinner.fail(chalk.red('Failed to log out'));
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
