import { Command } from "commander";

import {
  getClient,
  removeChatFromFolder,
  disconnectClient,
} from "../client.js";
import { fail } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import { assertWriteEnabled } from "../guard.js";
import ora from "../spinner.js";

export const folderRemoveCommand = new Command("folder-remove")
  .description("Remove a chat from a folder")
  .argument("<folder>", "Folder name")
  .argument("<chat>", "Chat name, username, or ID")
  .option("--json", "Output as JSON")
  .action(async (folder, chat, options) => {
    await assertWriteEnabled();
    const spinner = ora(
      `Removing "${chat}" from folder "${folder}"...`
    ).start();

    try {
      const client = await getClient();
      const result = await removeChatFromFolder(client, folder, chat);

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
      fail(error, spinner, "Failed to remove chat from folder");
    }
  });
