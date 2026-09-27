import { Command } from 'commander';
import { Api } from 'teleproto';
import { NewMessage, type NewMessageEvent } from 'teleproto/events/index.js';
import { getClient, resolveChat, disconnectClient, messageText } from '../client.js';
import chalk from 'chalk';
import ora from 'ora';

export const watchCommand = new Command('watch')
  .description('Stream new incoming messages in real time (until timeout / limit / Ctrl-C)')
  .argument('[chat]', 'Restrict to one chat (name, @user, or ID). Omit to watch everything.')
  .option('-t, --timeout <seconds>', 'Stop after N seconds')
  .option('-n, --limit <number>', 'Stop after N messages')
  .option('--json', 'Emit each message as a JSON line')
  .action(async (chat, options) => {
    const timeoutSec = options.timeout ? parseInt(options.timeout, 10) : undefined;
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;

    const spinner = ora('Connecting...').start();
    try {
      const client = await getClient();

      let chatFilter: (string | number)[] | undefined;
      if (chat) {
        const entity = await resolveChat(client, chat);
        chatFilter = [entity.id.toString()];
      }

      spinner.stop();
      console.error(chalk.gray(`Watching${chat ? ` "${chat}"` : ' all chats'}${timeoutSec ? ` for ${timeoutSec}s` : ''}${limit ? `, up to ${limit} message(s)` : ''}. Press Ctrl-C to stop.\n`));

      let count = 0;
      await new Promise<void>((resolvePromise) => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        const finish = () => {
          if (timer) clearTimeout(timer);
          client.removeEventHandler(handler, event);
          resolvePromise();
        };

        const event = new NewMessage(chatFilter ? { chats: chatFilter } : {});
        const handler = async (e: NewMessageEvent) => {
          const msg = e.message;
          if (!(msg instanceof Api.Message)) return;
          count += 1;

          let sender = 'Unknown';
          try {
            const s = await msg.getSender();
            if (s instanceof Api.User) sender = s.firstName || s.username || s.id.toString();
            else if (s instanceof Api.Channel || s instanceof Api.Chat) sender = s.title;
          } catch {
            // ignore
          }

          if (options.json) {
            console.log(JSON.stringify({ id: msg.id, chatId: msg.chatId?.toString(), sender, text: messageText(msg), date: new Date(msg.date * 1000).toISOString() }));
          } else {
            const time = new Date(msg.date * 1000).toLocaleTimeString();
            console.log(`${chalk.gray(time)} ${chalk.cyan(sender)}: ${messageText(msg) || chalk.gray('(no text)')} ${chalk.gray(`#${msg.id}`)}`);
          }

          if (limit && count >= limit) finish();
        };

        client.addEventHandler(handler, event);
        if (timeoutSec) timer = setTimeout(finish, timeoutSec * 1000);
      });

      await disconnectClient();
    } catch (error) {
      spinner.fail('Watch failed');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
