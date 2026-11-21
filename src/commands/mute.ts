import { Command } from "commander";

import { checkedBy } from "../args.js";
import {
  getClient,
  muteChat,
  disconnectClient,
  parseDuration,
} from "../client.js";
import { fail } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import { assertWriteEnabled } from "../guard.js";
import ora from "../spinner.js";

export const muteCommand = new Command("mute")
  .description("Mute a chat")
  .argument("<chat>", "Chat name, username, or ID")
  .option(
    "-d, --duration <duration>",
    "Duration (1h, 8h, 1d, 1w, or forever)",
    checkedBy(parseDuration),
    "forever"
  )
  .option("--json", "Output as JSON")
  .action(async (chat, options) => {
    await assertWriteEnabled();
    const spinner = ora(`Muting "${chat}"...`).start();

    try {
      const client = await getClient();
      const result = await muteChat(client, chat, options.duration);

      if (result.success) {
        if (options.json) {
          spinner.stop();
          console.log(formatJson(result));
        } else {
          spinner.succeed(result.message);
        }
      } else {
        if (options.json) {
          spinner.stop();
          console.log(formatJson(result));
        } else {
          spinner.fail(result.message);
        }
        process.exit(1);
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to mute chat");
    }
  });
