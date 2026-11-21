import { Command } from "commander";

import { messageIdList } from "../args.js";
import { auditLog } from "../audit.js";
import {
  getClient,
  forwardMessages,
  disconnectClient,
  chatRef,
} from "../client.js";
import chalk from "../colors.js";
import { fail } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import { assertWriteEnabled } from "../guard.js";
import ora from "../spinner.js";

export const forwardCommand = new Command("forward")
  .description("Forward one or more messages to another chat")
  .argument("<fromChat>", "Source chat name, username (@user), or ID")
  .argument(
    "<messageIds>",
    "Message ID, or comma-separated IDs (e.g. 123 or 123,124,125)",
    messageIdList
  )
  .argument("<toChat>", "Destination chat name, username (@user), or ID")
  .option("--silent", "Forward without a notification sound")
  .option(
    "--drop-author",
    'Hide the original sender (no "forwarded from" header)'
  )
  .option(
    "--json",
    "Output as JSON: messageIds are the source IDs (in fromChatId), forwardedIds the copies in chatId"
  )
  .action(async (fromChat, messageIds, toChat, options) => {
    await assertWriteEnabled();

    const ids: number[] = messageIds;

    const spinner = ora(
      `Forwarding ${ids.length} message(s) from "${fromChat}" to "${toChat}"...`
    ).start();

    try {
      const client = await getClient();
      const result = await forwardMessages(client, fromChat, ids, toChat, {
        silent: options.silent,
        dropAuthor: options.dropAuthor,
      });

      auditLog({
        timestamp: new Date().toISOString(),
        command: "forward",
        target: toChat,
        message: `${ids.length} from ${fromChat} [${ids.join(",")}]`,
        result: { success: true },
      });

      spinner.stop();

      if (options.json) {
        const to = await chatRef(client, toChat);
        const from = await chatRef(client, fromChat);
        // messageIds: the originals, in fromChatId; forwardedIds: the copies, in chatId (the destination)
        console.log(
          formatJson({
            ok: true,
            action: "forward",
            ...to,
            fromChatId: from.chatId,
            ...result,
            messageIds: ids,
          })
        );
      } else {
        console.log(
          chalk.green(
            `✓ Forwarded ${result.count} message(s) from "${result.fromTitle}" to "${result.toTitle}"`
          )
        );
      }

      await disconnectClient();
    } catch (error) {
      auditLog({
        timestamp: new Date().toISOString(),
        command: "forward",
        target: toChat,
        message: `from ${fromChat} [${ids.join(",")}]`,
        result: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      fail(error, spinner, "Failed to forward");
    }
  });
