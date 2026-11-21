import { Command } from "commander";

import { positiveInt } from "../args.js";
import { getClient, listContacts, disconnectClient } from "../client.js";
import { fail } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import ora from "../spinner.js";

export const contactsCommand = new Command("contacts")
  .description("List your contacts")
  .option(
    "-q, --query <text>",
    "Only contacts whose name, @username or phone matches"
  )
  .option("-n, --limit <number>", "Maximum contacts to show", positiveInt, 200)
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const spinner = ora("Fetching contacts...").start();
    try {
      const client = await getClient();
      const rows = (await listContacts(client, options.query)).slice(
        0,
        options.limit
      );
      spinner.stop();
      if (options.json) {
        console.log(formatJson(rows));
      } else {
        for (const r of rows) {
          console.log(
            `${r.id} ${r.name}${r.username ? ` @${r.username}` : ""}${r.phone ? ` +${r.phone}` : ""}${r.mutual ? " mutual" : ""}`
          );
        }
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch contacts");
    }
  });
