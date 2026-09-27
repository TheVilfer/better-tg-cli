import { Command } from 'commander';
import {
  getClient,
  getDialogs,
  getMessages,
  downloadMessageMedia,
  disconnectClient,
} from '../client.js';
import { formatMediaLabel } from '../formatters/plain.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import chalk from 'chalk';
import ora from 'ora';

export const syncCommand = new Command('sync')
  .description('Sync messages to markdown files')
  .option('--days <number>', 'Number of days to sync', '7')
  .option('--chat <name>', 'Sync specific chat only')
  .option('--output <dir>', 'Output directory', './telegram-sync')
  .option('--media', 'Also download photos and documents alongside markdown')
  .action(async (options) => {
    const spinner = ora('Starting sync...').start();

    try {
      const client = await getClient();
      const outputDir = options.output;

      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const minDate = new Date();
      minDate.setDate(minDate.getDate() - parseInt(options.days));

      let chats;
      if (options.chat) {
        // Sync specific chat
        const allChats = await getDialogs(client, 500);
        chats = allChats.filter(c =>
          c.title.toLowerCase().includes(options.chat.toLowerCase())
        );

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
      for (const chat of chats) {
        try {
          spinner.text = `Syncing "${chat.title}"...`;

          const { messages } = await getMessages(client, chat.title, {
            limit: 1000,
            minDate,
          });

          if (messages.length === 0) {
            continue;
          }

          // Generate markdown
          const lines: string[] = [];
          lines.push(`# ${chat.title}`);
          lines.push(`\nType: ${chat.type}`);
          if (chat.username) {
            lines.push(`Username: @${chat.username}`);
          }
          lines.push(`\nSynced: ${new Date().toISOString()}`);
          lines.push(`Messages: ${messages.length}`);
          lines.push('\n---\n');

          // Sort messages chronologically
          messages.sort((a, b) => a.date.getTime() - b.date.getTime());

          const safeTitle = chat.title.replace(/[/\\?%*:|"<>]/g, '-');
          const chatMediaDir = join(outputDir, safeTitle, 'media');

          for (const msg of messages) {
            const time = msg.date.toISOString().replace('T', ' ').substring(0, 19);
            const sender = msg.isOutgoing ? 'You' : msg.sender;
            const reply = msg.replyToMsgId ? ` (reply to #${msg.replyToMsgId})` : '';

            lines.push(`**${sender}** - ${time}${reply}`);

            if (msg.media) {
              if (options.media) {
                try {
                  const result = await downloadMessageMedia(
                    client,
                    chat.title,
                    msg.id,
                    chatMediaDir
                  );
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
                      `\nWarning: media download failed for ${chat.title}#${msg.id}: ${
                        mediaErr instanceof Error ? mediaErr.message : mediaErr
                      }`
                    )
                  );
                }
              } else {
                lines.push(`> _[${formatMediaLabel(msg.media)}]_`);
              }
            }

            lines.push(`> ${msg.text || '(no text)'}`);
            lines.push(`*#${msg.id}*\n`);
          }

          // Write file
          const filename = `${safeTitle}.md`;
          writeFileSync(join(outputDir, filename), lines.join('\n'));

          synced++;
        } catch (error) {
          // Skip chats that fail
          console.error(chalk.yellow(`\nWarning: Could not sync "${chat.title}": ${error instanceof Error ? error.message : error}`));
        }
      }

      spinner.succeed(chalk.green(`Synced ${synced} chats to ${outputDir}`));

      await disconnectClient();
      process.exit(0);
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
