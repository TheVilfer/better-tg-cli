import { Command } from 'commander';
import { getClient, getDrafts, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { getOutputFormat } from '../formatters/index.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const draftsCommand = new Command('drafts')
  .description('List saved but unsent message drafts across chats')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching drafts...').start();
    try {
      const client = await getClient();
      const drafts = await getDrafts(client);
      spinner.stop();
      if (getOutputFormat(options) === 'json') {
        console.log(formatJson({ drafts }));
      } else if (!drafts.length) {
        console.log(chalk.gray('No drafts.'));
      } else {
        for (const d of drafts) {
          console.log(`${chalk.cyan(d.chatTitle)}${d.replyToMsgId ? chalk.gray(` ↩#${d.replyToMsgId}`) : ''}`);
          console.log(`  ${d.text}`);
        }
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch drafts');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
