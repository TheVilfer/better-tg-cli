import { Command } from "commander";

import { positiveInt } from "../args.js";
import {
  getClient,
  downloadMessageMedia,
  disconnectClient,
} from "../client.js";
import chalk from "../colors.js";
import { CliError, EXIT, fail, shellCommand } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import { formatMediaLabel } from "../formatters/plain.js";
import { assertLocalWriteAllowed } from "../guard.js";
import ora from "../spinner.js";

export const downloadCommand = new Command("download")
  .description("Download media (photo/document) from a message")
  .argument("<chat>", "Chat name, username (@user), or ID")
  .argument("<messageId>", "Message ID (see #id in read output)", positiveInt)
  .option("-o, --output <dir>", "Output directory", "./telegram-media")
  .option("--json", "Output as JSON")
  .action(async (chat, messageId: number, options) => {
    await assertLocalWriteAllowed();

    const spinner = ora(
      `Downloading media from message #${messageId}...`
    ).start();

    try {
      const client = await getClient();
      const result = await downloadMessageMedia(
        client,
        chat,
        messageId,
        options.output
      );

      if (!result) {
        await disconnectClient();
        const command = ["get", chat, String(messageId)];
        fail(
          new CliError(
            `Message #${messageId} has no downloadable media`,
            "no_media",
            EXIT.ERROR,
            {
              hint: `Check the message: ${shellCommand(command)} (media shows as [photo …] or [document …]).`,
              command,
            }
          ),
          spinner,
          "Nothing to download"
        );
      }

      spinner.succeed(chalk.green("Media downloaded"));

      if (options.json) {
        console.log(
          formatJson({
            messageId,
            filePath: result.filePath,
            media: result.media,
          })
        );
      } else {
        console.log(chalk.bold(formatMediaLabel(result.media)));
        console.log(chalk.gray(`Saved to: ${result.filePath}`));
      }

      await disconnectClient();
      process.exit(0);
    } catch (error) {
      fail(error, spinner, "Failed to download media");
    }
  });
