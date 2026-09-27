import { Command } from 'commander';
import { getClient, getUserStories, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import chalk from 'chalk';
import ora from 'ora';

export const storiesCommand = new Command('stories')
  .description("List a user's currently active stories")
  .argument('<user>', 'Username (@user), name, or ID')
  .option('--json', 'Output as JSON')
  .action(async (user, options) => {
    const spinner = ora(`Fetching stories for "${user}"...`).start();
    try {
      const client = await getClient();
      const result = await getUserStories(client, user);
      spinner.stop();
      if (options.json) {
        console.log(formatJson(result));
      } else if (result.stories.length === 0) {
        console.log(chalk.gray(`"${result.name}" has no active stories.`));
      } else {
        console.log(chalk.bold(`${result.stories.length} active story/stories from "${result.name}":\n`));
        for (const s of result.stories) {
          const cap = s.caption ? ` — ${s.caption}` : '';
          console.log(`  ${chalk.gray(s.date.toLocaleString())}  #${s.id}${cap}`);
        }
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch stories');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
