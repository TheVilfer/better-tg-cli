import { Command } from 'commander';
import {
  getClient,
  getDialogs,
  getMessages,
  downloadMessageMedia,
  disconnectClient,
  parseTimeOffset,
} from '../client.js';
import type { ChatInfo, GetMessagesOptions, MessageInfo } from '../client.js';
import type { TelegramClient } from 'teleproto';
import { formatMediaLabel } from '../formatters/plain.js';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { isAbsolute, join, relative, resolve, sep } from 'path';
import chalk from '../colors.js';
import ora from '../spinner.js';
import { assertLocalWriteAllowed } from '../guard.js';

/** Per-chat sync checkpoints, keyed by chat ID (titles can change or collide). */
interface SyncMeta {
  [chatId: string]: {
    title: string;
    lastMessageId: number;
    lastSyncDate: string;
  };
}

function readSyncMeta(outputDir: string): SyncMeta {
  const metaPath = join(outputDir, '.sync-meta.json');
  if (existsSync(metaPath)) {
    try {
      return JSON.parse(readFileSync(metaPath, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function writeSyncMeta(outputDir: string, meta: SyncMeta): void {
  writeFileSync(join(outputDir, '.sync-meta.json'), JSON.stringify(meta, null, 2));
}

async function formatMessageLines(
  client: TelegramClient,
  chatId: string,
  chatTitle: string,
  msg: MessageInfo,
  outputDir: string,
  chatMediaDir: string,
  downloadMedia: boolean
): Promise<string[]> {
  const time = msg.date.toISOString().replace('T', ' ').substring(0, 19);
  const sender = msg.isOutgoing ? 'You' : msg.sender;
  const reply = msg.replyToMsgId ? ` (reply to #${msg.replyToMsgId})` : '';
  const lines: string[] = [`**${sender}** - ${time}${reply}`];

  if (msg.media) {
    if (downloadMedia) {
      try {
        const result = await downloadMessageMedia(client, chatId, msg.id, chatMediaDir);
        if (result) {
          const rel = relative(outputDir, result.filePath);
          lines.push(`> [${formatMediaLabel(result.media)}](${rel})`);
        } else {
          lines.push(`> _[${formatMediaLabel(msg.media)}]_`);
        }
      } catch (mediaErr) {
        lines.push(`> _[${formatMediaLabel(msg.media)}] (download failed)_`);
        console.error(
          chalk.yellow(
            `\nWarning: media download failed for ${chatTitle}#${msg.id}: ${
              mediaErr instanceof Error ? mediaErr.message : mediaErr
            }`
          )
        );
      }
    } else {
      lines.push(`> _[${formatMediaLabel(msg.media)}]_`);
    }
  }

  if (msg.text || !msg.media) {
    lines.push(`> ${msg.text || '(no text)'}`);
  }
  lines.push(`*#${msg.id}*\n`);
  return lines;
}

/**
 * The chats `--chat` names. In a terminal: exact titles (or the ID), else every title containing it.
 * Over MCP the model chose the name, so it must be exactly one chat by ID, @username or exact title;
 * otherwise this returns the reason to stop, before any file is created.
 */
export function selectSyncChats(all: ChatInfo[], name: string, exactOnly: boolean): ChatInfo[] | string {
  const needle = name.toLowerCase();
  const exact = all.filter(c => c.id === name || c.title.toLowerCase() === needle);
  if (!exactOnly) {
    const chats = exact.length > 0 ? exact : all.filter(c => c.title.toLowerCase().includes(needle));
    return chats.length > 0 ? chats : `No chat found matching "${name}"`;
  }
  const user = needle.replace(/^@/, '');
  const matches = needle.startsWith('@') ? all.filter(c => c.username?.toLowerCase() === user) : exact;
  if (matches.length === 1) return matches;
  if (matches.length === 0) return `No chat is exactly "${name}". Over MCP sync needs an ID, @username or the exact title.`;
  const list = matches.slice(0, 5).map(c => `  ${c.id} ${c.type} ${c.title}${c.username ? ` @${c.username}` : ''}`).join('\n');
  return `"${name}" matches ${matches.length} chats; use an ID:\n${list}`;
}

/** `path` itself, or a stop if it is not strictly inside `dir` (a chat title must never pick the folder). */
export function insideDir(dir: string, path: string): string {
  const rel = relative(resolve(dir), resolve(path));
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Refusing to write outside ${dir}: ${path}`);
  return path;
}

/**
 * getMessages options for one chat. When resuming from a checkpoint, minId is the
 * lower bound: the default --days window and the 1000-message cap would otherwise
 * drop the gap for good once the checkpoint jumps to the newest ID.
 */
export function buildSyncFetchOptions(o: {
  all: boolean;
  since: boolean;
  minDate?: Date;
  maxDate?: Date;
  minId?: number;
}): GetMessagesOptions {
  if (o.minId) {
    return { limit: Number.MAX_SAFE_INTEGER, minId: o.minId, minDate: o.since ? o.minDate : undefined, maxDate: o.maxDate };
  }
  return { limit: o.all ? Number.MAX_SAFE_INTEGER : 1000, minDate: o.minDate, maxDate: o.maxDate };
}

export const syncCommand = new Command('sync')
  .description('Sync messages to markdown files')
  .option('--days <number>', 'Number of days to sync', '7')
  .option('--since <time>', 'Start from time offset (e.g., "1h", "30m", "7d")')
  .option('--until <time>', 'End at time offset (e.g., "1h", "30m", "7d")')
  .option('--all', 'Sync entire chat history (no time limit)')
  .option('--chat <name>', 'Sync specific chat only')
  .option('--output <dir>', 'Output directory', './telegram-sync')
  .option('--media', 'Also download photos and documents alongside markdown')
  .option('--resume', 'Incremental sync: only fetch messages newer than the last sync')
  .action(async (options) => {
    assertLocalWriteAllowed();
    const spinner = ora('Starting sync...').start();

    try {
      const client = await getClient();
      const outputDir = options.output;

      // Determine date range
      let minDate: Date | undefined;
      let maxDate: Date | undefined;

      if (options.all) {
        // No date filtering
      } else if (options.since) {
        minDate = parseTimeOffset(options.since);
      } else {
        minDate = new Date();
        minDate.setDate(minDate.getDate() - parseInt(options.days));
      }

      if (options.until) {
        maxDate = parseTimeOffset(options.until);
      }

      let chats;
      if (options.chat) {
        const overMcp = !!process.env.TG_MCP;
        const selected = selectSyncChats(await getDialogs(client, 500), options.chat, overMcp);
        if (typeof selected === 'string') {
          spinner.fail(selected);
          await disconnectClient();
          if (overMcp) process.exit(1);
          return;
        }
        chats = selected;
      } else {
        // Sync all chats with recent activity
        chats = await getDialogs(client, 100);
      }

      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Checkpoints are always written, but only read with --resume
      const meta = readSyncMeta(outputDir);

      spinner.text = `Syncing ${chats.length} chats...`;

      let synced = 0;
      let newMessages = 0;
      for (const chat of chats) {
        try {
          spinner.text = `Syncing "${chat.title}"...`;

          const safeTitle = chat.title.replace(/[/\\?%*:|"<>]/g, '-');
          const filePath = insideDir(outputDir, join(outputDir, `${safeTitle}.md`));
          // By chat ID: a title such as ".." would otherwise put the media outside outputDir
          const chatMediaDir = insideDir(outputDir, join(outputDir, 'media', chat.id.replace(/[^\w-]/g, '_')));

          // Incremental sync: only messages newer than the last checkpoint
          const minId = options.resume && existsSync(filePath) ? meta[chat.id]?.lastMessageId : undefined;

          const fetchOptions = buildSyncFetchOptions({ all: !!options.all, since: !!options.since, minDate, maxDate, minId });

          const { messages } = await getMessages(client, chat.id, fetchOptions);

          if (messages.length === 0) {
            continue;
          }

          // Sort messages chronologically
          messages.sort((a, b) => a.date.getTime() - b.date.getTime());

          const body: string[] = [];
          for (const msg of messages) {
            body.push(...(await formatMessageLines(client, chat.id, chat.title, msg, outputDir, chatMediaDir, !!options.media)));
          }

          let content: string;
          if (minId) {
            // Append new messages to the existing file
            content = readFileSync(filePath, 'utf-8').trimEnd() + '\n\n' + body.join('\n');
          } else {
            const header: string[] = [`# ${chat.title}`, `\nType: ${chat.type}`];
            if (chat.username) {
              header.push(`Username: @${chat.username}`);
            }
            header.push(`\nSynced: ${new Date().toISOString()}`);
            header.push(`Messages: ${messages.length}`);
            header.push('\n---\n');
            content = [...header, ...body].join('\n');
          }

          writeFileSync(filePath, content);

          meta[chat.id] = {
            title: chat.title,
            lastMessageId: Math.max(minId ?? 0, ...messages.map(m => m.id)),
            lastSyncDate: new Date().toISOString(),
          };

          synced++;
          newMessages += messages.length;
        } catch (error) {
          // Skip chats that fail
          console.error(chalk.yellow(`\nWarning: Could not sync "${chat.title}": ${error instanceof Error ? error.message : error}`));
        }
      }

      writeSyncMeta(outputDir, meta);

      spinner.succeed(chalk.green(`Synced ${newMessages} messages from ${synced} chats to ${outputDir}`));

      await disconnectClient();
      process.exit(0);
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
