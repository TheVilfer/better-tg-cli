import { Command } from 'commander';
import {
  assertDownloadTarget,
  getClient,
  getDialogs,
  DIALOG_MAX,
  DIALOG_PAGE,
  getMessages,
  downloadMessageMedia,
  disconnectClient,
  parseTimeOffset,
} from '../client.js';
import type { ChatInfo, GetMessagesOptions, MessageInfo } from '../client.js';
import type { TelegramClient } from 'teleproto';
import { formatMediaLabel } from '../formatters/plain.js';
import { writeFileSync, readFileSync, mkdirSync, existsSync, lstatSync } from 'fs';
import { isAbsolute, join, relative, resolve, sep } from 'path';
import chalk from '../colors.js';
import ora from '../spinner.js';
import { assertLocalWriteAllowed } from '../guard.js';
import { CliError, EXIT, errorDetails, fail, shellCommand, usageError } from '../errors.js';
import { positiveInt, timeArg } from '../args.js';
import { formatJson } from '../formatters/json.js';

/** Per-chat sync checkpoints, keyed by chat ID (titles can change or collide). */
interface SyncMeta {
  [chatId: string]: {
    title: string;
    lastMessageId: number;
    lastSyncDate: string;
    /** --media: failed downloads per message ID, so a file that never downloads stops the chat only so often */
    mediaAttempts?: Record<string, number>;
    /**
     * --media: nothing of this chat was exported yet, and the first message failed. lastMessageId is
     * then the ID just before it, so --resume retries from that message instead of the --days window
     * (which it may have left by then); the file gets no "continues after" line.
     */
    retryPin?: boolean;
  };
}

/** After this many failed runs, a media download is given up: a placeholder, and the export moves on. */
export const MEDIA_ATTEMPTS = 3;

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
  writeFileSync(exportPath(outputDir, join(outputDir, '.sync-meta.json')), JSON.stringify(meta, null, 2));
}

/**
 * The Markdown of one message. With `downloadMedia`, a media download that fails is returned as
 * `mediaError`, with a placeholder in the lines: the caller stops the chat before this message (so
 * --resume retries it), or keeps it once the download was given up.
 */
async function formatMessageLines(
  client: TelegramClient,
  chatId: string,
  msg: MessageInfo,
  outputDir: string,
  chatMediaDir: string,
  downloadMedia: boolean
): Promise<{ lines: string[]; mediaError?: string }> {
  const time = msg.date.toISOString().replace('T', ' ').substring(0, 19);
  const sender = msg.isOutgoing ? 'You' : msg.sender;
  const reply = msg.replyToMsgId ? ` (reply to #${msg.replyToMsgId})` : '';
  const lines: string[] = [`**${sender}** - ${time}${reply}`];
  let mediaError: string | undefined;

  if (msg.media) {
    if (downloadMedia) {
      try {
        const result = await downloadMessageMedia(client, chatId, msg.id, chatMediaDir, path => {
          exportPath(outputDir, path);
          // A directory at the file's place would let teleproto choose the file inside it: stop the sync
          try {
            assertDownloadTarget(path);
          } catch (e) {
            throw new ExportPathError((e as Error).message);
          }
        });
        if (result) {
          const rel = relative(outputDir, result.filePath);
          lines.push(`> [${formatMediaLabel(result.media)}](${rel})`);
        } else {
          lines.push(`> _[${formatMediaLabel(msg.media)}]_`);
        }
      } catch (mediaErr) {
        if (mediaErr instanceof ExportPathError) throw mediaErr;
        // The caller decides: stop before this message, or (given up) keep it with this placeholder
        lines.push(`> _[${formatMediaLabel(msg.media)}] (download failed)_`);
        mediaError = mediaErr instanceof Error ? mediaErr.message : String(mediaErr);
      }
    } else {
      lines.push(`> _[${formatMediaLabel(msg.media)}]_`);
    }
  }

  if (msg.text || !msg.media) {
    lines.push(`> ${msg.text || '(no text)'}`);
  }
  lines.push(`*#${msg.id}*\n`);
  return mediaError === undefined ? { lines } : { lines, mediaError };
}

/**
 * The chats `--chat` names. In a terminal: exact titles (or the ID), else every title containing it.
 * Over MCP the model chose the name, so it must be exactly one chat by ID, @username or exact title;
 * otherwise this returns the reason to stop, before any file is created. `complete` says whether
 * `all` is the whole dialog list: when it was cut, one exact title is not proven unique (another
 * chat with that title may sit beyond the cut), so over MCP an ID is required.
 */
export function selectSyncChats(all: ChatInfo[], name: string, exactOnly: boolean, complete = true): ChatInfo[] | CliError {
  // An empty name would match every title (and must never fall back to exporting every chat)
  if (!name.trim()) return usageError('--chat needs a chat: an ID, @username or title');
  // A numeric name is an ID, never a title ("123" must not pick a chat titled 123)
  if (/^-?\d+$/.test(name.trim())) {
    const byId = all.filter(c => c.id === name.trim());
    return byId.length > 0 ? byId : notFound(`No chat has the ID ${name.trim()}`, name);
  }
  const needle = name.toLowerCase();
  const exact = all.filter(c => c.title.toLowerCase() === needle);
  if (!exactOnly) {
    const chats = exact.length > 0 ? exact : all.filter(c => c.title.toLowerCase().includes(needle));
    return chats.length > 0 ? chats : notFound(`No chat found matching "${name}"`, name);
  }
  const user = needle.replace(/^@/, '');
  const matches = needle.startsWith('@') ? all.filter(c => c.username?.toLowerCase() === user) : exact;
  const candidates = matches.slice(0, 5).map(c => ({ id: c.id, title: c.title, type: c.bot ? 'bot' : c.type }));
  const hint = 'Run the command again with one of these IDs.';
  // A @username is unique on Telegram, so one match is proven even in a cut list; a title is not
  if (matches.length === 1 && (complete || needle.startsWith('@'))) return matches;
  if (matches.length === 1) {
    return new CliError(`"${name}" matches a chat among the first ${all.length} dialogs, but the list was cut, so another chat may have the same title; use an ID`, 'ambiguous_or_unverified', EXIT.USAGE, { candidates, hint });
  }
  if (matches.length === 0) return notFound(`No chat is exactly "${name}". Over MCP sync needs an ID, @username or the exact title.`, name);
  return new CliError(`"${name}" matches ${matches.length} chats; use an ID`, 'ambiguous_chat', EXIT.USAGE, { candidates, hint });
}

function notFound(message: string, name: string): CliError {
  const command = ['chats', '-q', name.replace(/^@/, ''), '--preview', '0'];
  return new CliError(message, 'chat_not_found', EXIT.ERROR, { hint: `List matching chats: ${shellCommand(command)}`, command });
}

/** Stops the whole sync: a write would leave the export folder through a symbolic link. */
export class ExportPathError extends Error {}

/**
 * `path` itself, or a stop if it is not strictly inside `dir` or if any existing component below
 * `dir` (the file included) is a symbolic link: writeFileSync and mkdir follow links, so a link
 * planted in the export folder would send the Markdown, media or checkpoints elsewhere.
 */
export function exportPath(dir: string, path: string): string {
  insideDir(dir, path);
  let cur = resolve(dir);
  for (const part of relative(cur, resolve(path)).split(sep)) {
    cur = join(cur, part);
    let link: boolean;
    try {
      link = lstatSync(cur).isSymbolicLink();
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') break; // nothing below it exists either
      throw e;
    }
    if (link) throw new ExportPathError(`Refusing to write through a symbolic link in ${dir}: ${cur}`);
  }
  return path;
}

/** The Markdown file of a chat: its title and ID, so equal titles never share (or resume) a file. */
export function chatFileName(chat: Pick<ChatInfo, 'id' | 'title'>): string {
  const safeTitle = chat.title.replace(/[/\\?%*:|"<>\x00-\x1f]/g, '-');
  return `${safeTitle} (${chat.id.replace(/[^\w-]/g, '_')}).md`;
}

/** The header line that names the chat a Markdown file belongs to (checked by --resume). */
const chatIdLine = (id: string) => `Chat ID: ${id}`;

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
  if (o.minId !== undefined) {
    return { limit: Number.MAX_SAFE_INTEGER, minId: o.minId, minDate: o.since ? o.minDate : undefined, maxDate: o.maxDate };
  }
  return { limit: o.all ? Number.MAX_SAFE_INTEGER : 1000, minDate: o.minDate, maxDate: o.maxDate };
}

/** How many dialogs `--chat` searches; a list this long may have been cut. */

export const syncCommand = new Command('sync')
  .description('Export or incrementally sync chat history to Markdown files (backup, archive)')
  .option('--days <number>', 'Number of days to sync', positiveInt, 7)
  .option('--since <time>', 'Start from time offset (e.g., "1h", "30m", "7d")', timeArg)
  .option('--until <time>', 'End at time offset (e.g., "1h", "30m", "7d")', timeArg)
  .option('--all', 'Sync entire chat history (no time limit)')
  .option('--chat <name>', 'Sync specific chat only')
  .option('--output <dir>', 'Output directory', './telegram-sync')
  .option('--media', 'Also download photos and documents alongside markdown')
  .option('--resume', 'Incremental sync: only fetch messages newer than the last sync')
  .option('--json', 'Output as JSON: {output, added, chats:[{chatId, title, file, added, lastId}], failed?:[{chatId, title, code, error, messageId?, skipped?}]} (exit 1 if any chat or, with --media, any download failed)')
  .action(async (options) => {
    await assertLocalWriteAllowed();
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
        minDate.setDate(minDate.getDate() - options.days);
      }

      if (options.until) {
        maxDate = parseTimeOffset(options.until);
      }

      let chats;
      // Present but empty is a mistake to stop at, never "every chat"
      if (options.chat !== undefined) {
        const overMcp = !!process.env.TG_MCP;
        // As for any title: a full page is read on, and past DIALOG_MAX a title is not proven unique
        let dialogs = await getDialogs(client, DIALOG_PAGE);
        if (dialogs.length >= DIALOG_PAGE) dialogs = await getDialogs(client, DIALOG_MAX);
        const selected = selectSyncChats(dialogs, options.chat, overMcp, dialogs.length < DIALOG_MAX);
        if (selected instanceof CliError) throw selected;
        chats = selected;
      } else {
        // Sync all chats with recent activity
        chats = await getDialogs(client, 100);
      }

      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      // Before any file is written: the checkpoints must not be a link out of the folder
      exportPath(outputDir, join(outputDir, '.sync-meta.json'));

      // Checkpoints are always written, but only read with --resume
      const meta = readSyncMeta(outputDir);

      spinner.text = `Syncing ${chats.length} chats...`;

      let synced = 0;
      let newMessages = 0;
      // What happened to each chat: the agent needs the file path and whether anything was new
      const report: { chatId: string; title: string; file: string; added: number; lastId?: number }[] = [];
      const failed: { chatId: string; title: string; code: string; error: string; messageId?: number; skipped?: boolean }[] = [];
      for (const chat of chats) {
        try {
          spinner.text = `Syncing "${chat.title}"...`;

          const filePath = exportPath(outputDir, join(outputDir, chatFileName(chat)));
          // By chat ID: a title such as ".." would otherwise put the media outside outputDir
          const chatMediaDir = exportPath(outputDir, join(outputDir, 'media', chat.id.replace(/[^\w-]/g, '_')));

          // Incremental sync. A known checkpoint always bounds the fetch from below, so the gap
          // since the last run is fetched in full even when it goes to a new file (an export made
          // before the file name carried the chat ID, or a file at this name that names another
          // chat, which is then replaced). Appending is a separate question: only to a file whose
          // header names this chat.
          const existing = options.resume && existsSync(filePath) ? readFileSync(filePath, 'utf-8') : undefined;
          const append = existing !== undefined && existing.split('\n', 8).includes(chatIdLine(chat.id));
          const checkpoint = options.resume ? meta[chat.id] : undefined;
          const pinned = !!checkpoint?.retryPin;
          // A retry pin bounds the fetch even at 0 (the failed message was #1)
          const minId = checkpoint && (checkpoint.lastMessageId > 0 || pinned) ? checkpoint.lastMessageId : undefined;

          const fetchOptions = buildSyncFetchOptions({ all: !!options.all, since: !!options.since, minDate, maxDate, minId });

          const { messages } = await getMessages(client, chat.id, fetchOptions);

          if (messages.length === 0) {
            const lastId = meta[chat.id]?.retryPin ? undefined : meta[chat.id]?.lastMessageId;
            report.push({ chatId: chat.id, title: chat.title, file: filePath, added: 0, ...(lastId ? { lastId } : {}) });
            continue;
          }

          // By ID, never by date: two messages in the same second must not swap, or a failure on the
          // earlier one would leave the checkpoint past it. IDs in a chat only grow, so this is also
          // chronological.
          messages.sort((a, b) => a.id - b.id);

          // With --media, the chat stops before the first message whose media could not be
          // downloaded: the file and the checkpoint end before it, so --resume tries it again
          // After MEDIA_ATTEMPTS failed runs the file is given up, so one that never downloads
          // (deleted, expired) cannot hold the chat back for good
          const body: string[] = [];
          const kept: MessageInfo[] = [];
          const attempts = { ...(meta[chat.id]?.mediaAttempts ?? {}) };
          const failures: { id: number; error: string; attempt: number; skipped: boolean }[] = [];
          for (const msg of messages) {
            const f = await formatMessageLines(client, chat.id, msg, outputDir, chatMediaDir, !!options.media);
            if (f.mediaError !== undefined) {
              const attempt = (attempts[msg.id] ?? 0) + 1;
              const skipped = attempt >= MEDIA_ATTEMPTS;
              failures.push({ id: msg.id, error: f.mediaError, attempt, skipped });
              if (!skipped) {
                attempts[msg.id] = attempt;
                break;
              }
              delete attempts[msg.id];
            } else {
              delete attempts[msg.id];
            }
            body.push(...f.lines);
            kept.push(msg);
          }
          const mediaAttempts = Object.keys(attempts).length ? { mediaAttempts: attempts } : {};

          if (kept.length > 0) {
            let content: string;
            if (append && minId !== undefined && !pinned) {
              // Append new messages to the existing file
              content = readFileSync(filePath, 'utf-8').trimEnd() + '\n\n' + body.join('\n');
            } else {
              const header: string[] = [`# ${chat.title}`, `\n${chatIdLine(chat.id)}`, `Type: ${chat.type}`];
              if (chat.username) {
                header.push(`Username: @${chat.username}`);
              }
              header.push(`\nSynced: ${new Date().toISOString()}`);
              // Resumed into a new file: the earlier messages are in a previous export
              if (minId !== undefined && !pinned) header.push(`Continues after message #${minId} (earlier messages are in a previous export)`);
              header.push(`Messages: ${kept.length}`);
              header.push('\n---\n');
              content = [...header, ...body].join('\n');
            }

            writeFileSync(exportPath(outputDir, filePath), content);

            meta[chat.id] = {
              title: chat.title,
              lastMessageId: Math.max(minId ?? 0, ...kept.map(m => m.id)),
              lastSyncDate: new Date().toISOString(),
              ...mediaAttempts,
            };

            synced++;
            newMessages += kept.length;
            report.push({ chatId: chat.id, title: chat.title, file: filePath, added: kept.length, lastId: meta[chat.id].lastMessageId });
          } else if (failures.length) {
            // Nothing kept: only the attempt count changes, the checkpoint stays where it was. With no
            // checkpoint yet, one is pinned just before the failed message, so --resume starts there.
            const prev = meta[chat.id];
            if (prev && prev.lastMessageId > 0 && !prev.retryPin) {
              const { mediaAttempts: _old, ...rest } = prev;
              meta[chat.id] = { ...rest, ...mediaAttempts };
            } else {
              meta[chat.id] = {
                title: chat.title,
                lastMessageId: Math.min(prev?.retryPin ? prev.lastMessageId : Infinity, failures[0].id - 1),
                lastSyncDate: new Date().toISOString(),
                ...mediaAttempts,
                retryPin: true,
              };
            }
          }

          for (const f of failures) {
            const message = f.skipped
              ? `media of message #${f.id} could not be downloaded (${f.error}); given up after ${f.attempt} attempts, the message is exported without it`
              : `media of message #${f.id} could not be downloaded (${f.error}); the export of this chat stops before it, and --resume tries it again (attempt ${f.attempt} of ${MEDIA_ATTEMPTS})`;
            failed.push({ chatId: chat.id, title: chat.title, code: 'media_download_failed', error: message, messageId: f.id, ...(f.skipped ? { skipped: true } : {}) });
            console.error(chalk.yellow(`\nWarning: "${chat.title}": ${message}`));
          }
        } catch (error) {
          if (error instanceof ExportPathError) throw error;
          // Go on with the other chats, but never call a partial export a success
          const { code, message } = errorDetails(error);
          failed.push({ chatId: chat.id, title: chat.title, code, error: message });
          console.error(chalk.yellow(`\nWarning: Could not sync "${chat.title}": ${message}`));
        }
      }

      writeSyncMeta(outputDir, meta);

      const upToDate = report.length - synced;
      const summary = `Synced ${newMessages} new messages in ${synced} chats to ${outputDir}${upToDate ? ` (${upToDate} already up to date)` : ''}`;
      if (failed.length) spinner.fail(chalk.yellow(`${summary}; ${failed.length} failed: ${failed.map(f => f.title).join(', ')}`));
      else spinner.succeed(chalk.green(summary));
      if (options.json) {
        console.log(formatJson({ output: outputDir, added: newMessages, chats: report, ...(failed.length ? { failed } : {}) }));
      } else if (report.length <= 10) {
        for (const r of report) {
          console.log(r.added
            ? `${r.title} (${r.chatId}): +${r.added} (last #${r.lastId}) → ${r.file}`
            : `${r.title} (${r.chatId}): up to date${r.lastId ? ` (last #${r.lastId})` : ''} → ${r.file}`);
        }
      }

      await disconnectClient();
      process.exit(failed.length ? EXIT.ERROR : EXIT.OK);
    } catch (error) {
      fail(error, spinner, 'Sync failed');
    }
  });
