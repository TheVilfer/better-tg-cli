import { Command } from "commander";

import { positiveInt } from "../args.js";
import {
  getClient,
  getSessions,
  getStars,
  getInviteLinks,
  getJoinRequests,
  disconnectClient,
} from "../client.js";
import chalk from "../colors.js";
import { fail } from "../errors.js";
import { getOutputFormat } from "../formatters/index.js";
import { formatJson } from "../formatters/json.js";
import ora from "../spinner.js";

export const sessionsCommand = new Command("sessions")
  .description("List active login sessions (devices) on the account")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const spinner = ora("Fetching sessions...").start();
    try {
      const client = await getClient();
      const { ttlDays, sessions } = await getSessions(client);
      spinner.stop();
      if (getOutputFormat(options) === "json") {
        console.log(formatJson({ ttlDays, sessions }));
      } else {
        console.log(
          chalk.gray(`Inactive sessions auto-terminate after ${ttlDays} days.`)
        );
        for (const s of sessions) {
          const tag = s.current ? chalk.green(" (current)") : "";
          console.log(
            `${chalk.bold(s.device || s.app)}${tag} — ${s.app} ${s.appVersion} on ${s.platform} ${s.system}`
          );
          console.log(
            chalk.gray(
              `  ${[s.ip, s.country].filter(Boolean).join(" · ")}${s.lastActive ? ` · active ${new Date(s.lastActive).toLocaleString()}` : ""}`
            )
          );
        }
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch sessions");
    }
  });

export const starsCommand = new Command("stars")
  .description("Show your Telegram Stars balance and recent transactions")
  .option("-n, --limit <number>", "Max transactions to list", positiveInt, 20)
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const spinner = ora("Fetching Stars balance...").start();
    try {
      const client = await getClient();
      const { balance, transactions } = await getStars(client, {
        limit: options.limit,
      });
      spinner.stop();
      if (getOutputFormat(options) === "json") {
        console.log(formatJson({ balance, transactions }));
      } else {
        console.log(`${chalk.bold("⭐ Stars balance:")} ${balance}`);
        for (const t of transactions) {
          const sign = t.refund ? "+" : "-";
          console.log(
            chalk.gray(
              `  ${sign}${t.stars} ${t.title ?? t.id}${t.pending ? " (pending)" : ""}${t.date ? ` · ${new Date(t.date).toLocaleDateString()}` : ""}`
            )
          );
        }
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch Stars");
    }
  });

export const invitesCommand = new Command("invites")
  .description(
    "List a chat's invite links, or its pending join requests (--requests)"
  )
  .argument("<chat>", "Chat name, username (@chat), or ID")
  .option("--revoked", "List revoked links instead of active ones")
  .option("--requests", "List pending join requests instead of invite links")
  .option("-n, --limit <number>", "Max items", positiveInt, 50)
  .option("--json", "Output as JSON")
  .action(async (chat, options) => {
    const { limit } = options;
    const spinner = ora(`Fetching invites for "${chat}"...`).start();
    try {
      const client = await getClient();
      if (options.requests) {
        const { chatTitle, count, requests } = await getJoinRequests(
          client,
          chat,
          { limit }
        );
        spinner.stop();
        if (getOutputFormat(options) === "json") {
          console.log(formatJson({ chatTitle, count, requests }));
        } else if (requests.length) {
          console.log(chalk.bold(`${count} join request(s) — ${chatTitle}`));
          for (const r of requests) {
            console.log(
              `  ${chalk.cyan(r.name)} ${chalk.gray(r.userId)}${r.about ? ` — ${r.about}` : ""}`
            );
          }
        } else {
          console.log(
            chalk.gray(`No pending join requests for "${chatTitle}".`)
          );
        }
      } else {
        const { chatTitle, count, invites } = await getInviteLinks(
          client,
          chat,
          { revoked: options.revoked, limit }
        );
        spinner.stop();
        if (getOutputFormat(options) === "json") {
          console.log(formatJson({ chatTitle, count, invites }));
        } else if (invites.length) {
          console.log(chalk.bold(`${count} invite link(s) — ${chatTitle}`));
          for (const i of invites) {
            const flags = [
              i.permanent && "permanent",
              i.revoked && "revoked",
              i.requestNeeded && "request-needed",
            ]
              .filter(Boolean)
              .join(", ");
            const usage = i.usageLimit
              ? `${i.usage ?? 0}/${i.usageLimit}`
              : i.usage == null
                ? ""
                : `${i.usage} used`;
            console.log(
              `  ${i.link}${flags ? chalk.gray(` [${flags}]`) : ""}${usage ? chalk.gray(` · ${usage}`) : ""}${i.requested ? chalk.gray(` · ${i.requested} pending`) : ""}`
            );
          }
        } else {
          console.log(
            chalk.gray(
              `No ${options.revoked ? "revoked " : ""}invite links for "${chatTitle}".`
            )
          );
        }
      }
      await disconnectClient();
    } catch (error) {
      fail(error, spinner, "Failed to fetch invites");
    }
  });
