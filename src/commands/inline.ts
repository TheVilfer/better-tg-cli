import { Command } from 'commander';
import { getClient, queryInlineBot, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import chalk from 'chalk';
import ora from '../spinner.js';

export const inlineCommand = new Command('inline')
  .description('Query an inline bot (like typing "@bot query" in Telegram)')
  .argument('<bot>', 'Inline bot username (@bot)')
  .argument('<query>', 'The inline query text')
  .option('-n, --limit <number>', 'Max results to show', '20')
  .option('--json', 'Output as JSON')
  .action(async (bot, query, options) => {
    const spinner = ora(`Querying ${bot} "${query}"...`).start();
    try {
      const client = await getClient();
      const result = await queryInlineBot(client, bot, query, parseInt(options.limit, 10));
      spinner.stop();
      if (options.json) {
        console.log(formatJson(result));
      } else if (result.results.length === 0) {
        console.log(chalk.gray('No inline results.'));
      } else {
        console.log(chalk.bold(`${result.results.length} inline result(s):\n`));
        for (const r of result.results) {
          const title = r.title || chalk.gray('(untitled)');
          const desc = r.description ? chalk.gray(` — ${r.description}`) : '';
          console.log(`  ${chalk.cyan(title)}${desc} ${chalk.gray(`[${r.type}]`)}`);
        }
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to query inline bot');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
