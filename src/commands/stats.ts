import { Command } from 'commander';
import { getClient, getChatStats, getMessageStats, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { getOutputFormat } from '../formatters/index.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

function abbrev(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export const statsCommand = new Command('stats')
  .description('Full statistics for a channel/supergroup/group, or a single post (--message)')
  .argument('<chat>', 'Chat name, username (@chat), or ID')
  .option('--message <id>', 'Statistics for one message instead of the chat')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    const spinner = ora(`Fetching statistics for "${chat}"...`).start();
    try {
      const client = await getClient();

      if (options.message !== undefined) {
        const id = parseInt(options.message, 10);
        if (!Number.isInteger(id) || id <= 0) { spinner.stop(); console.error('--message expects a message ID'); process.exit(1); }
        const s = await getMessageStats(client, chat, id);
        spinner.stop();
        if (getOutputFormat(options) === 'json') {
          console.log(formatJson(s));
        } else {
          console.log(chalk.bold(`${s.chatTitle} — message #${s.messageId}`));
          if (s.views !== undefined) console.log(`  views: ${abbrev(s.views)}`);
          if (s.forwards !== undefined) console.log(`  forwards: ${s.forwards}`);
          if (s.publicForwards !== undefined) console.log(`  public forwards: ${s.publicForwards}`);
          if (s.reactions?.length) console.log(`  reactions: ${s.reactions.map(r => `${r.emoji ?? (r.paid ? '⭐' : '🧩')}${r.count}`).join(' ')}`);
          if (s.note) console.log(chalk.gray(`  ${s.note}`));
        }
        await disconnectClient();
        return;
      }

      const s = await getChatStats(client, chat);
      spinner.stop();
      if (getOutputFormat(options) === 'json') {
        console.log(formatJson(s));
      } else {
        const flags = [s.verified && 'verified', s.scam && 'scam', s.fake && 'fake', s.restricted && 'restricted'].filter(Boolean).join(', ');
        console.log(`${chalk.bold(s.title)}${s.username ? chalk.gray(` @${s.username}`) : ''} ${chalk.gray(`[${s.type}]`)}${flags ? chalk.yellow(` (${flags})`) : ''}`);
        if (s.about) console.log(chalk.gray(`  ${s.about}`));
        const counts: string[] = [];
        if (s.participantsCount !== undefined) counts.push(`${abbrev(s.participantsCount)} members`);
        if (s.onlineCount) counts.push(`${s.onlineCount} online`);
        if (s.adminsCount !== undefined) counts.push(`${s.adminsCount} admins`);
        if (s.kickedCount) counts.push(`${s.kickedCount} kicked`);
        if (s.bannedCount) counts.push(`${s.bannedCount} banned`);
        if (counts.length) console.log(`  ${counts.join(' · ')}`);
        if (s.slowModeSeconds) console.log(chalk.gray(`  slow mode: ${s.slowModeSeconds}s`));
        if (s.linkedChatId) console.log(chalk.gray(`  linked chat: ${s.linkedChatId}`));
        if (s.created) console.log(chalk.gray(`  created: ${new Date(s.created).toLocaleDateString()}`));
        if (s.restrictionReasons?.length) console.log(chalk.yellow(`  restrictions: ${s.restrictionReasons.join('; ')}`));
        if (s.activity) {
          if ('error' in s.activity) console.log(chalk.gray(`  activity: ${s.activity.error}`));
          else {
            const a = Object.entries(s.activity).map(([k, v]) => `${k}=${abbrev(v)}`).join(' ');
            if (a) console.log(`  activity: ${a}`);
          }
        }
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch statistics');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
