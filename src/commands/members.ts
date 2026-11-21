import { Command } from "commander";

import { positiveInt } from "../args.js";
import { getClient, getChatMembers, disconnectClient } from "../client.js";
import { fail } from "../errors.js";
import { getOutputFormat } from "../formatters/index.js";
import { formatJson } from "../formatters/json.js";
import { formatMembersMarkdown } from "../formatters/markdown.js";
import { formatMembers } from "../formatters/plain.js";
import ora from "../spinner.js";

export const membersCommand = new Command("members")
  .description("List group members")
  .argument("<group>", "Group name or username")
  .option("-n, --limit <number>", "Maximum members to fetch", positiveInt, 200)
  .option("-q, --query <text>", "Only members whose name or @username matches")
  .option("--json", "Output as JSON")
  .option("--markdown", "Output as Markdown")
  .action(async (group, options) => {
    const spinner = ora(`Fetching members of "${group}"...`).start();

    try {
      const client = await getClient();
      const members = await getChatMembers(client, group, {
        limit: options.limit,
        query: options.query,
      });

      spinner.stop();

      const format = getOutputFormat(options);

      switch (format) {
        case "json": {
          console.log(formatJson(members));
          break;
        }
        case "markdown": {
          console.log(formatMembersMarkdown(members));
          break;
        }
        default: {
          console.log(formatMembers(members));
        }
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch members");
    }
  });

export const adminsCommand = new Command("admins")
  .description("List group admins")
  .argument("<group>", "Group name or username")
  .option("--json", "Output as JSON")
  .option("--markdown", "Output as Markdown")
  .action(async (group, options) => {
    const spinner = ora(`Fetching admins of "${group}"...`).start();

    try {
      const client = await getClient();
      const members = await getChatMembers(client, group, {
        adminsOnly: true,
      });

      spinner.stop();

      const format = getOutputFormat(options);

      switch (format) {
        case "json": {
          console.log(formatJson(members));
          break;
        }
        case "markdown": {
          console.log(formatMembersMarkdown(members));
          break;
        }
        default: {
          console.log(formatMembers(members));
        }
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch admins");
    }
  });
