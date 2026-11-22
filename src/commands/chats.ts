import { Command } from "commander";

import { choiceOption, nonNegativeInt, positiveInt } from "../args.js";
import {
  getClient,
  getDialogs,
  disconnectClient,
  CHAT_TYPES,
  matchesChatType,
} from "../client.js";
import type { ChatInfo } from "../client.js";
import { fail } from "../errors.js";
import { getOutputFormat } from "../formatters/index.js";
import { formatJson } from "../formatters/json.js";
import { formatChatsMarkdown } from "../formatters/markdown.js";
import { formatChats, truncate } from "../formatters/plain.js";
import ora from "../spinner.js";

export const chatsCommand = new Command("chats")
  .description("List chats (IDs first; use the ID in other commands)")
  .option("-n, --limit <number>", "Maximum number of chats", positiveInt, 100)
  .addOption(
    choiceOption(
      "--type <type>",
      "Filter by type (user includes bots)",
      CHAT_TYPES
    )
  )
  .option(
    "-q, --query <text>",
    "Only chats whose title or @username contains this text"
  )
  .option("--unread", "Only chats with unread messages")
  .option("--unmuted", "Hide muted chats")
  .option("--archived", "List the archive folder instead of the main list")
  .option(
    "--preview <chars>",
    "Last-message preview length (0 = none)",
    nonNegativeInt,
    60
  )
  .option("--json", "Output as JSON")
  .option("--markdown", "Output as Markdown")
  .action(async (options) => {
    const spinner = ora("Fetching chats...").start();

    try {
      const client = await getClient();
      const { limit } = options;
      const filtering =
        options.type || options.query || options.unread || options.unmuted;
      let chats = await getDialogs(
        client,
        filtering ? Math.max(limit, 500) : limit,
        { archived: options.archived }
      );

      if (options.type) {
        chats = chats.filter((c) => matchesChatType(c, options.type));
      }
      if (options.query) {
        const q = options.query.toLowerCase();
        chats = chats.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.username?.toLowerCase().includes(q)
        );
      }
      if (options.unread) {
        chats = chats.filter((c) => c.unreadCount > 0);
      }
      if (options.unmuted) {
        chats = chats.filter((c) => !c.muted);
      }
      chats = chats.slice(0, limit);

      const { preview } = options;
      const trimmed: ChatInfo[] = chats.map((c) => ({
        ...c,
        lastMessage:
          preview > 0 && c.lastMessage
            ? truncate(c.lastMessage, preview)
            : undefined,
      }));

      spinner.stop();

      switch (getOutputFormat(options)) {
        case "json": {
          console.log(formatJson(trimmed));
          break;
        }
        case "markdown": {
          console.log(formatChatsMarkdown(trimmed));
          break;
        }
        default: {
          console.log(formatChats(trimmed, preview));
        }
      }

      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch chats");
    }
  });
