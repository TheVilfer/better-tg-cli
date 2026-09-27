import { Command } from 'commander';
import { getClient, clickButton, disconnectClient, type ClickSelector } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { formatClickOutcome } from '../formatters/plain.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import ora from 'ora';

export const clickCommand = new Command('click')
  .description('Press a button on a bot message (inline callback, reply keyboard, etc.)')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<messageId>', 'Message ID (the #number shown by `tg read`)')
  .argument('[button]', 'Button to press: its 1-based index or its label text')
  .option('--data <payload>', 'Press the callback button whose raw payload is this base64 string')
  .option('--password <pw>', 'Account 2FA password, for buttons that require it')
  .option('--no-wait', 'Do not wait for / fetch the bot response after clicking')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageId, button, options) => {
    assertWriteEnabled();

    const id = parseInt(messageId, 10);
    if (!Number.isInteger(id)) {
      console.error('Message ID must be a number');
      process.exit(1);
    }

    const selector: ClickSelector = {};
    if (options.data) {
      selector.dataBase64 = options.data;
    } else if (button != null) {
      if (/^\d+$/.test(button)) selector.index = parseInt(button, 10);
      else selector.text = button;
    } else {
      console.error('Specify a button by index/text, or use --data <base64>');
      process.exit(1);
    }

    const spinner = ora(`Pressing button on #${id}...`).start();
    const auditTarget = options.data ? `data:${options.data}` : String(button);

    try {
      const client = await getClient();
      const outcome = await clickButton(client, chat, id, selector, {
        password: options.password,
        waitMs: options.wait === false ? 0 : undefined,
      });

      auditLog({
        timestamp: new Date().toISOString(),
        command: 'click',
        target: chat,
        message: `#${id} → [${outcome.button.index}] ${outcome.button.text}`,
        result: { success: true, messageId: outcome.sentMessageId },
      });

      spinner.stop();

      if (options.json) {
        console.log(formatJson(outcome));
      } else {
        console.log(formatClickOutcome(outcome));
      }

      await disconnectClient();
    } catch (error) {
      auditLog({
        timestamp: new Date().toISOString(),
        command: 'click',
        target: chat,
        message: `#${id} → ${auditTarget}`,
        result: { success: false, error: error instanceof Error ? error.message : String(error) },
      });
      spinner.fail('Failed to press button');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
