import { Command } from "commander";

import { getClient, getFolder, disconnectClient } from "../client.js";
import { CliError, EXIT, fail } from "../errors.js";
import { formatFolder } from "../formatters/plain.js";
import ora from "../spinner.js";

export const folderCommand = new Command("folder")
  .description("Show chats in a specific folder")
  .argument("<name>", "Folder name")
  .option("--json", "Output as JSON")
  .action(async (name, options) => {
    const spinner = ora(`Loading folder "${name}"...`).start();

    try {
      const client = await getClient();
      const folder = await getFolder(client, name);

      spinner.stop();

      if (!folder) {
        throw new CliError(
          `Folder not found: ${name}`,
          "folder_not_found",
          EXIT.ERROR,
          { hint: "List the folders: telegram folders", command: ["folders"] }
        );
      }

      if (options.json) {
        console.log(JSON.stringify(folder, null, 2));
      } else {
        console.log(formatFolder(folder));
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to load folder");
    }
  });
