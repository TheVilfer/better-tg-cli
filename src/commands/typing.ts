import { Argument, Command } from "commander";

import { getClient, sendTyping, disconnectClient } from "../client.js";
import chalk from "../colors.js";
import { fail } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import { assertWriteEnabled } from "../guard.js";
import ora from "../spinner.js";

const ACTIONS = [
  "typing",
  "photo",
  "video",
  "audio",
  "document",
  "cancel",
] as const;

export const typingCommand = new Command("typing")
  .description('Show a "typing…" (or uploading) status in a chat')
  .argument("<chat>", "Chat name, username (@user), or ID")
  .addArgument(
    new Argument("[action]", "What the chat sees")
      .choices(ACTIONS)
      .default("typing")
  )
  .option("--json", "Output as JSON")
  .action(async (chat, action, options) => {
    await assertWriteEnabled();
    const spinner = ora(`Sending "${action}" status to "${chat}"...`).start();
    try {
      const client = await getClient();
      const result = await sendTyping(client, chat, action);
      spinner.stop();
      if (options.json) {
        console.log(formatJson({ chat: result.title, action }));
      } else {
        console.log(
          chalk.green(`✓ Sent "${action}" status to "${result.title}"`)
        );
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to send status");
    }
  });
