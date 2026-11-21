import { Command } from "commander";

import { positiveInt } from "../args.js";
import { getClient, queryInlineBot, disconnectClient } from "../client.js";
import chalk from "../colors.js";
import { fail } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import { assertWriteEnabled } from "../guard.js";
import ora from "../spinner.js";

export const inlineCommand = new Command("inline")
  .description(
    'Query an inline bot (like typing "@bot query" in Telegram); a write: the bot gets the query and your user ID'
  )
  .argument("<bot>", "Inline bot username (@bot)")
  .argument("<query>", "The inline query text")
  .option("-n, --limit <number>", "Max results to show", positiveInt, 20)
  .option("--json", "Output as JSON")
  .action(async (bot, query, options) => {
    await assertWriteEnabled();
    const spinner = ora(`Querying ${bot} "${query}"...`).start();
    try {
      const client = await getClient();
      const result = await queryInlineBot(client, bot, query, options.limit);
      spinner.stop();
      if (options.json) {
        console.log(formatJson(result));
      } else if (result.results.length === 0) {
        console.log(chalk.gray("No inline results."));
      } else {
        console.log(chalk.bold(`${result.results.length} inline result(s):\n`));
        for (const r of result.results) {
          const title = r.title || chalk.gray("(untitled)");
          const desc = r.description ? chalk.gray(` — ${r.description}`) : "";
          console.log(
            `  ${chalk.cyan(title)}${desc} ${chalk.gray(`[${r.type}]`)}`
          );
        }
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to query inline bot");
    }
  });
