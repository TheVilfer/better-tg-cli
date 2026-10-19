import { Command } from 'commander';
import { getClient, getChatStats, getMessageStats, getStoryStats, disconnectClient } from '../client.js';
import type { ChatStats, MessageStats, StatValue, GraphSeries } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { getOutputFormat } from '../formatters/index.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

function abbrev(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function val(v?: StatValue): string {
  if (!v) return '—';
  const delta = v.previous !== undefined && v.previous !== v.current ? chalk.gray(` (was ${abbrev(v.previous)})`) : '';
  return `${abbrev(v.current)}${delta}`;
}

function graphsLine(graphs?: GraphSeries[]): string[] {
  if (!graphs?.length) return [];
  const ok = graphs.filter(g => !g.error).map(g => g.name);
  const err = graphs.filter(g => g.error).map(g => `${g.name}:${g.error}`);
  const lines = [chalk.gray(`  graphs: ${ok.join(', ') || 'none'}`)];
  if (err.length) lines.push(chalk.gray(`  graph errors: ${err.join('; ')}`));
  return lines;
}

function printMessageStats(s: MessageStats, which: string): void {
  console.log(chalk.bold(`${s.chatTitle} — ${which}`));
  if (s.views !== undefined) console.log(`  views: ${abbrev(s.views)}`);
  if (s.forwards !== undefined) console.log(`  forwards: ${s.forwards}`);
  if (s.publicForwardsCount !== undefined) console.log(`  public forwards: ${s.publicForwardsCount}`);
  if (s.reactions?.length) console.log(`  reactions: ${s.reactions.map(r => `${r.emoji ?? (r.paid ? '⭐' : '🧩')}${r.count}`).join(' ')}`);
  for (const f of s.publicForwards ?? []) {
    console.log(chalk.gray(`    ↪ ${f.chatTitle ?? f.chatId}${f.msgId ? `#${f.msgId}` : f.storyId ? ` story ${f.storyId}` : ''}${f.views ? ` · ${abbrev(f.views)} views` : ''}`));
  }
  for (const l of graphsLine(s.graphs)) console.log(l);
  if (s.note) console.log(chalk.gray(`  ${s.note}`));
}

function printChatStats(s: ChatStats): void {
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

  const a = s.activity;
  if (!a) return;
  if ('error' in a) { console.log(chalk.gray(`  activity: ${a.error}`)); return; }
  console.log(chalk.bold(`  — activity (${a.kind})` + (a.period ? ` ${a.period.minDate.slice(0, 10)}…${a.period.maxDate.slice(0, 10)}` : '')));
  if (a.kind === 'broadcast') {
    console.log(`    followers ${val(a.followers)} · views/post ${val(a.viewsPerPost)} · shares/post ${val(a.sharesPerPost)} · reactions/post ${val(a.reactionsPerPost)}`);
    if (a.enabledNotificationsPct !== undefined) console.log(`    enabled notifications: ${a.enabledNotificationsPct}%`);
    for (const p of a.recentPosts ?? []) console.log(chalk.gray(`    post #${p.msgId ?? p.storyId}: ${abbrev(p.views)} views · ${p.forwards} fwd · ${p.reactions} reactions`));
  } else {
    console.log(`    members ${val(a.members)} · messages ${val(a.messages)} · viewers ${val(a.viewers)} · posters ${val(a.posters)}`);
    for (const p of a.topPosters ?? []) console.log(chalk.gray(`    top poster ${p.name}: ${p.messages} msgs, ~${p.avgChars} chars`));
    for (const p of a.topAdmins ?? []) console.log(chalk.gray(`    top admin ${p.name}: ${p.deleted} del, ${p.kicked} kick, ${p.banned} ban`));
    for (const p of a.topInviters ?? []) console.log(chalk.gray(`    top inviter ${p.name}: ${p.invitations} invites`));
  }
  for (const l of graphsLine(a.graphs)) console.log(l);
}

export const statsCommand = new Command('stats')
  .description('Full statistics for a channel/supergroup/group, or a single post (--message) / story (--story)')
  .argument('<chat>', 'Chat name, username (@chat), or ID')
  .option('--message <id>', 'Statistics for one message instead of the chat')
  .option('--story <id>', 'Statistics for one story instead of the chat')
  .option('--graphs', 'Include parsed graph series (growth, interactions, languages, …)')
  .option('--limit <number>', 'Max public forwards to list (with --message/--story)', '100')
  .option('--json', 'Output as JSON')
  .action(async (chat, options) => {
    const spinner = ora(`Fetching statistics for "${chat}"...`).start();
    try {
      const client = await getClient();
      const graphs = Boolean(options.graphs);
      const limit = parseInt(options.limit, 10) || 100;
      const json = getOutputFormat(options) === 'json';

      const idOpt = (flag: string): number => {
        const id = parseInt(options[flag], 10);
        if (!Number.isInteger(id) || id <= 0) { spinner.stop(); console.error(`--${flag} expects an ID`); process.exit(1); }
        return id;
      };

      if (options.message !== undefined) {
        const s = await getMessageStats(client, chat, idOpt('message'), { graphs, limit });
        spinner.stop();
        if (json) console.log(formatJson(s)); else printMessageStats(s, `message #${s.messageId}`);
      } else if (options.story !== undefined) {
        const s = await getStoryStats(client, chat, idOpt('story'), { graphs, limit });
        spinner.stop();
        if (json) console.log(formatJson(s)); else printMessageStats(s, `story ${s.storyId}`);
      } else {
        const s = await getChatStats(client, chat, { graphs });
        spinner.stop();
        if (json) console.log(formatJson(s)); else printChatStats(s);
      }
      await disconnectClient();
    } catch (error) {
      spinner.fail('Failed to fetch statistics');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
