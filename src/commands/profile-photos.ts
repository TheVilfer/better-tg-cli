import { Command } from 'commander';
import { getClient, getProfilePhotos, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { getOutputFormat } from '../formatters/index.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const profilePhotosCommand = new Command('profile-photos')
  .description("List a user's profile photos (use `avatar` to download one)")
  .argument('<user>', 'User name, username (@user), ID, or "me"')
  .option('-n, --limit <number>', 'Max photos to list', '50')
  .option('--json', 'Output as JSON')
  .action(async (user, options) => {
    const spinner = ora(`Fetching profile photos for "${user}"...`).start();
    try {
      const client = await getClient();
      const { title, count, photos } = await getProfilePhotos(client, user, { limit: parseInt(options.limit, 10) });
      spinner.stop();
      if (getOutputFormat(options) === 'json') {
        console.log(formatJson({ user: title, count, photos }));
      } else if (!photos.length) {
        console.log(chalk.gray(`"${title}" has no profile photos.`));
      } else {
        console.log(chalk.bold(`${title} — ${count} profile photo${count === 1 ? '' : 's'}`));
        for (const p of photos) {
          console.log(`  ${chalk.gray(p.date.toLocaleDateString())}  id ${p.id}${p.dcId ? chalk.gray(` (dc${p.dcId})`) : ''}`);
        }
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch profile photos');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
