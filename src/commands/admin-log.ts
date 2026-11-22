import { Command } from "commander";

import { positiveInt } from "../args.js";
import { getClient, getAdminLog, disconnectClient } from "../client.js";
import chalk from "../colors.js";
import { fail } from "../errors.js";
import { getOutputFormat } from "../formatters/index.js";
import { formatJson } from "../formatters/json.js";
import ora from "../spinner.js";

export const adminLogCommand = new Command("admin-log")
  .description(
    "Recent admin actions in a supergroup or channel (the 'recent actions' log)"
  )
  .argument("<chat>", "Chat name, username (@user), or ID")
  .option("-n, --limit <number>", "Max entries to fetch", positiveInt, 50)
  .option("-q, --query <text>", "Only entries mentioning this text")
  .option("--json", "Output as JSON")
  .action(async (chat, options) => {
    const spinner = ora(`Fetching admin log for "${chat}"...`).start();
    try {
      const client = await getClient();
      const { chatTitle, entries } = await getAdminLog(client, chat, {
        limit: options.limit,
        query: options.query,
      });
      spinner.stop();
      if (getOutputFormat(options) === "json") {
        console.log(formatJson({ chatTitle, entries }));
      } else if (entries.length) {
        console.log(chalk.bold(`Admin log — ${chatTitle}`));
        for (const e of entries) {
          const when = e.date.toLocaleString();
          console.log(
            `${chalk.gray(when)}  ${chalk.cyan(e.user)}  ${e.action}${e.detail ? chalk.gray(`  ${e.detail}`) : ""}`
          );
        }
      } else {
        console.log(chalk.gray(`No admin-log entries for "${chatTitle}".`));
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch admin log");
    }
  });
