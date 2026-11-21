import { resolve } from "node:path";

import { Command } from "commander";

import { getClient, downloadAvatar, disconnectClient } from "../client.js";
import chalk from "../colors.js";
import { fail } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import { assertLocalWriteAllowed } from "../guard.js";
import ora from "../spinner.js";

export const avatarCommand = new Command("avatar")
  .description("Download a user's or chat's profile photo")
  .argument("<chat>", "Chat name, username (@user), or ID")
  .option("-o, --output <dir>", "Output directory", ".")
  .option("--json", "Output as JSON")
  .action(async (chat, options) => {
    await assertLocalWriteAllowed();
    const outputDir = resolve(options.output);
    const spinner = ora(`Downloading avatar for "${chat}"...`).start();
    try {
      const client = await getClient();
      const result = await downloadAvatar(client, chat, outputDir);
      spinner.stop();
      if (!result.filePath) {
        console.log(
          chalk.gray(
            `"${result.title}" has no profile photo (or it is not accessible).`
          )
        );
      } else if (options.json) {
        console.log(
          formatJson({ chat: result.title, filePath: result.filePath })
        );
      } else {
        console.log(
          chalk.green(
            `✓ Saved avatar of "${result.title}" → ${result.filePath}`
          )
        );
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to download avatar");
    }
  });
