import { Command } from 'commander';
import {
  getClient,
  getDialogs,
  getMessages,
  downloadMessageMedia,
  disconnectClient,
  parseTimeOffset,
} from '../client.js';
import type { MessageInfo } from '../client.js';
import type { TelegramClient } from 'teleproto';
import { formatMediaLabel } from '../formatters/plain.js';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import chalk from 'chalk';
import ora from 'ora';

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
    const spinner = ora('Starting sync...').start();

    try {
      const client = await getClient();
      const outputDir = options.output;

      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

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

      // Checkpoints are always written, but only read with --resume
      const meta = readSyncMeta(outputDir);

      let chats;
      if (options.chat) {
        const allChats = await getDialogs(client, 500);
        const needle = options.chat.toLowerCase();
        const exact = allChats.filter(c => c.id === options.chat || c.title.toLowerCase() === needle);
        chats = exact.length > 0 ? exact : allChats.filter(c => c.title.toLowerCase().includes(needle));

        if (chats.length === 0) {
          spinner.fail(`No chat found matching "${options.chat}"`);
          await disconnectClient();
          return;
        }
      } else {
        // Sync all chats with recent activity
        chats = await getDialogs(client, 100);
      }

      spinner.text = `Syncing ${chats.length} chats...`;

      let synced = 0;
      let newMessages = 0;
      for (const chat of chats) {
        try {
          spinner.text = `Syncing "${chat.title}"...`;

          const safeTitle = chat.title.replace(/[/\\?%*:|"<>]/g, '-');
          const filePath = join(outputDir, `${safeTitle}.md`);
          const chatMediaDir = join(outputDir, safeTitle, 'media');

          // Incremental sync: only messages newer than the last checkpoint
          const minId = options.resume && existsSync(filePath) ? meta[chat.id]?.lastMessageId : undefined;

          // When resuming from a checkpoint, minId is the lower bound: the default
          // --days window and the 1000-message cap would otherwise drop the gap
          // for good once the checkpoint jumps to the newest ID.
          const fetchOptions: Parameters<typeof getMessages>[2] = minId
            ? {
                limit: Number.MAX_SAFE_INTEGER,
                minId,
                minDate: options.since ? minDate : undefined,
                maxDate,
              }
            : {
                limit: options.all ? Number.MAX_SAFE_INTEGER : 1000,
                minDate,
                maxDate,
              };

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
