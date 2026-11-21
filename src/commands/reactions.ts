import { Command } from "commander";

import { positiveInt } from "../args.js";
import { getClient, getReactionsList, disconnectClient } from "../client.js";
import chalk from "../colors.js";
import { fail } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import ora from "../spinner.js";

export const reactionsCommand = new Command("reactions")
  .description("List who reacted to a message and with what")
  .argument("<chat>", "Chat name, username (@user), or ID")
  .argument("<messageId>", "Message ID", positiveInt)
  .option("-n, --limit <number>", "Max reactions to fetch", positiveInt, 50)
  .option("--json", "Output as JSON")
  .action(async (chat, messageId, options) => {
    const id: number = messageId;
    const spinner = ora(`Fetching reactions on #${id}...`).start();
    try {
      const client = await getClient();
      const result = await getReactionsList(client, chat, id, options.limit);
      spinner.stop();
      if (options.json) {
        console.log(formatJson(result));
      } else if (result.reactions.length === 0) {
        console.log(
          chalk.gray(`No reactions on #${id} in "${result.chatTitle}".`)
        );
      } else {
        console.log(
          chalk.bold(`Reactions on #${id} in "${result.chatTitle}":\n`)
        );
        for (const r of result.reactions) {
          console.log(`  ${r.emoji}  ${chalk.cyan(r.user)}`);
        }
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch reactions");
    }
  });
