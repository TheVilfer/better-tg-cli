#!/usr/bin/env node

import "./env.js";
import { isMainThread } from "node:worker_threads";

import type { CommanderError } from "commander";
import { Command } from "commander";

import { trackActiveCommand } from "./approval-action.js";
import { commandPath } from "./args.js";
import { generatedSummaryLines } from "./commands/generated.js";
import {
  authCommand,
  logoutCommand,
  whoamiCommand,
  checkCommand,
  chatsCommand,
  readCommand,
  getCommand,
  infoCommand,
  topicsCommand,
  linkCommand,
  contactsCommand,
  searchCommand,
  sendCommand,
  replyCommand,
  inboxCommand,
  contactCommand,
  membersCommand,
  adminsCommand,
  groupsCommand,
  syncCommand,
  kickCommand,
  promoteCommand,
  transferOwnerCommand,
  muteCommand,
  unmuteCommand,
  foldersCommand,
  folderCommand,
  folderAddCommand,
  folderRemoveCommand,
  writeAccessCommand,
  downloadCommand,
  sendFileCommand,
  buttonsCommand,
  clickCommand,
  reactCommand,
  forwardCommand,
  pinCommand,
  unpinCommand,
  editCommand,
  deleteCommand,
  markReadCommand,
  pinnedCommand,
  pollCommand,
  voteCommand,
  reactionsCommand,
  blockCommand,
  unblockCommand,
  addContactCommand,
  delContactCommand,
  joinCommand,
  leaveCommand,
  inviteLinkCommand,
  archiveCommand,
  unarchiveCommand,
  createGroupCommand,
  createChannelCommand,
  typingCommand,
  setNameCommand,
  setBioCommand,
  setUsernameCommand,
  setAvatarCommand,
  avatarCommand,
  inlineCommand,
  storiesCommand,
  watchCommand,
  updateCommand,
  skillCommand,
  onboardCommand,
  apiCommand,
  draftsCommand,
  adminLogCommand,
  profilePhotosCommand,
  pinChatCommand,
  unpinChatCommand,
  markUnreadCommand,
  deleteDialogCommand,
  permissionsCommand,
  statsCommand,
  scheduledCommand,
  sessionsCommand,
  starsCommand,
  invitesCommand,
  editPermissionsCommand,
  topicCommand,
  registerGeneratedCommands,
  buildHelpCommand,
  schemaCommand,
  pluginCommand,
} from "./commands/index.js";
import {
  CliError,
  EXIT,
  EXIT_CODES_HELP,
  errorJson,
  fail,
  installDrainingExit,
  wantsJson,
} from "./errors.js";
import { mcpToken, startMcpHttpServer } from "./mcp-http.js";
import { commandPaths, startMcpServer } from "./mcp.js";
import { isMock, profile } from "./paths.js";
import { setInvocation } from "./resolve-mode.js";
import { isSecretStoreAvailable } from "./secrets.js";
import { primeStdin } from "./text.js";
import {
  BACKGROUND_CHECK_COMMAND,
  maybeNotifyUpdate,
  runBackgroundCheck,
} from "./update.js";
import { VERSION } from "./version.js";

installDrainingExit();

process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") {
    process.exit(0);
  }
  throw err;
});

const program = new Command();

program
  .name("telegram")
  .description("Fast Telegram CLI for reading, searching, and sending messages")
  .version(VERSION)
  .addHelpText("after", `\n${EXIT_CODES_HELP}`);

program.helpCommand(false);

program.addCommand(authCommand);
program.addCommand(onboardCommand);
program.addCommand(logoutCommand);
program.addCommand(checkCommand);
program.addCommand(whoamiCommand);

program.addCommand(chatsCommand);
program.addCommand(readCommand);
program.addCommand(getCommand);
program.addCommand(infoCommand);
program.addCommand(topicsCommand);
program.addCommand(linkCommand);
program.addCommand(contactsCommand);
program.addCommand(searchCommand);
program.addCommand(inboxCommand);
program.addCommand(buttonsCommand);
program.addCommand(pinnedCommand);
program.addCommand(reactionsCommand);
program.addCommand(storiesCommand);
program.addCommand(avatarCommand);
program.addCommand(inlineCommand);
program.addCommand(watchCommand);
program.addCommand(draftsCommand);
program.addCommand(adminLogCommand);
program.addCommand(profilePhotosCommand);
program.addCommand(permissionsCommand);
program.addCommand(statsCommand);
program.addCommand(scheduledCommand);
program.addCommand(sessionsCommand);
program.addCommand(starsCommand);
program.addCommand(invitesCommand);

program.addCommand(contactCommand);
program.addCommand(membersCommand);
program.addCommand(adminsCommand);
program.addCommand(groupsCommand);
program.addCommand(kickCommand);
program.addCommand(promoteCommand);
program.addCommand(transferOwnerCommand);
program.addCommand(muteCommand);
program.addCommand(unmuteCommand);

program.addCommand(foldersCommand);
program.addCommand(folderCommand);
program.addCommand(folderAddCommand);
program.addCommand(folderRemoveCommand);

program.addCommand(sendCommand);
program.addCommand(replyCommand);
program.addCommand(sendFileCommand);
program.addCommand(clickCommand);
program.addCommand(reactCommand);
program.addCommand(forwardCommand);
program.addCommand(pinCommand);
program.addCommand(unpinCommand);
program.addCommand(editCommand);
program.addCommand(deleteCommand);
program.addCommand(markReadCommand);
program.addCommand(pollCommand);
program.addCommand(voteCommand);
program.addCommand(blockCommand);
program.addCommand(unblockCommand);
program.addCommand(addContactCommand);
program.addCommand(delContactCommand);
program.addCommand(joinCommand);
program.addCommand(leaveCommand);
program.addCommand(inviteLinkCommand);
program.addCommand(archiveCommand);
program.addCommand(unarchiveCommand);
program.addCommand(createGroupCommand);
program.addCommand(createChannelCommand);
program.addCommand(editPermissionsCommand);
program.addCommand(topicCommand);
program.addCommand(pinChatCommand);
program.addCommand(unpinChatCommand);
program.addCommand(markUnreadCommand);
program.addCommand(deleteDialogCommand);
program.addCommand(typingCommand);
program.addCommand(setNameCommand);
program.addCommand(setBioCommand);
program.addCommand(setUsernameCommand);
program.addCommand(setAvatarCommand);

program.addCommand(writeAccessCommand);

program.addCommand(apiCommand);
program.addCommand(schemaCommand);
program.addCommand(syncCommand);
program.addCommand(downloadCommand);
program.addCommand(updateCommand);
program.addCommand(skillCommand);
program.addCommand(pluginCommand);
program
  .command("mcp")
  .description(
    "Run as an MCP server over stdio, or over HTTP with --http (tools: telegram_help, telegram_read, telegram_write)"
  )
  .option(
    "--http",
    "Serve MCP over HTTP (POST /mcp, bearer token) for remote hosts such as Grok Bot"
  )
  .option("--host <host>", "With --http: address to listen on", "127.0.0.1")
  .option("--port <port>", "With --http: port to listen on", "8787")
  .option(
    "--read-only",
    "Serve only telegram_help and telegram_read, never telegram_write"
  )
  .option(
    "--token",
    "Print the HTTP bearer token (created on first use, kept in the secret store)"
  )
  .option(
    "--rotate-token",
    "Replace the HTTP bearer token; clients using the old one stop working"
  )
  .action(
    (options: {
      http?: boolean;
      host: string;
      port: string;
      readOnly?: boolean;
      token?: boolean;
      rotateToken?: boolean;
    }) => {
      const commands = commandPaths(program.commands);
      if (options.token || options.rotateToken) {
        const token = mcpToken({ create: true, rotate: options.rotateToken });
        if (!token) {
          console.error(
            isSecretStoreAvailable()
              ? "Could not save the token in the secret store; the previous token, if any, is unchanged."
              : "No secret store for the token (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password)."
          );
          process.exit(1);
        }
        console.log(token);
        return;
      }
      if (options.http) {
        const port = Number(options.port);
        if (!Number.isInteger(port) || port < 1 || port > 65_535) {
          console.error(`Invalid --port "${options.port}"`);
          process.exit(2);
        }
        startMcpHttpServer(commands, {
          host: options.host,
          port,
          readOnly: options.readOnly,
        });
        return;
      }
      startMcpServer(commands, { readOnly: options.readOnly });
    }
  );

program
  .command("help-all")
  .description(
    "Print every command with its arguments and flags (compact reference)"
  )
  .option(
    "-g, --grep <text>",
    "Only commands whose name, description or flags mention this text"
  )
  .action((options) => {
    const needle = options.grep?.toLowerCase();
    const lines: string[] = [];
    const emit = (cmd: Command, name: string): void => {
      if (cmd.commands.length) {
        for (const sub of cmd.commands) {
          emit(sub, `${name} ${sub.name()}`);
        }
        return;
      }
      const desc = cmd.description();
      const haystack = [
        name,
        desc,
        ...cmd.options.map((o) => `${o.flags} ${o.description}`),
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) {
        return;
      }
      const args = cmd.registeredArguments
        .map((a) =>
          a.required
            ? `<${a.name()}${a.variadic ? "..." : ""}>`
            : `[${a.name()}${a.variadic ? "..." : ""}]`
        )
        .join(" ");
      const formats = ["--json", "--markdown"]
        .filter((f) => cmd.options.some((o) => o.long === f))
        .map((f) => f.slice(2));
      lines.push(
        `${name}${args ? ` ${args}` : ""} — ${desc}${formats.length ? ` [${formats.join(", ")}]` : ""}`
      );
      for (const opt of cmd.options) {
        if (opt.long === "--json" || opt.long === "--markdown" || opt.hidden) {
          continue;
        }
        const def =
          opt.defaultValue !== undefined &&
          typeof opt.defaultValue !== "boolean"
            ? ` (default ${opt.defaultValue})`
            : "";
        const choices = opt.argChoices
          ? ` (one of: ${opt.argChoices.join(", ")})`
          : "";
        lines.push(`  ${opt.flags} — ${opt.description}${choices}${def}`);
      }
    };
    for (const cmd of program.commands) {
      if (cmd.name() !== "help-all") {
        emit(cmd, cmd.name());
      }
    }
    if (needle) {
      if (!lines.length) {
        lines.push(
          `No commands match "${options.grep}". Try a shorter word, or run \`telegram help-all\` without -g. ` +
            "Raw Telegram API methods are not listed here: `telegram schema` shows them."
        );
      }
      console.log(lines.join("\n"));
      return;
    }
    lines.push(
      "",
      "[json] / [markdown]: the command accepts --json / --markdown.",
      "",
      ...generatedSummaryLines()
    );
    console.log(lines.join("\n"));
  });

program.addCommand(buildHelpCommand(program));

trackActiveCommand(program);

const NOT_IN_MOCK = new Set([
  "auth",
  "onboard",
  "logout",
  "write-access",
  "update",
]);
program.hook("preAction", (_program, command) => {
  if (!isMock()) {
    return;
  }
  const path = commandPath(command);
  if (NOT_IN_MOCK.has(path)) {
    fail(
      new CliError(
        `"${path}" does nothing in mock mode (TG_MOCK is set): the fake account needs no login and its writes need no approval`,
        "not_in_mock",
        EXIT.USAGE,
        {
          hint: "Unset TG_MOCK to use a real account.",
          text: `"${path}" does nothing in mock mode (TG_MOCK is set): the fake account needs no login and its writes need no approval. Unset TG_MOCK to use a real account.`,
        }
      )
    );
  }
});

try {
  profile();
} catch (error) {
  fail(new CliError((error as Error).message, "invalid_profile", EXIT.USAGE));
}

if (process.argv[2] === BACKGROUND_CHECK_COMMAND) {
  void runBackgroundCheck();
} else {
  maybeNotifyUpdate();
  registerGeneratedCommands(program, process.argv);
  reportUsageErrors(program);
  setInvocation(process.argv.slice(2));
  if (isMainThread) {
    program
      .parseAsync(process.argv, { from: "node" })
      .catch((error) => fail(error));
  } else {
    readWorkerStdin()
      .then((text) => {
        primeStdin(text);
        return program.parseAsync(process.argv, { from: "node" });
      })
      .then(
        () => process.exit(process.exitCode ?? 0),
        (error: unknown) => fail(error)
      );
  }
}

function reportUsageErrors(root: Command): void {
  const json = wantsJson();
  const onExit = (err: CommanderError): never => {
    if (err.exitCode === 0 || err.code === "commander.helpDisplayed") {
      process.exit(err.exitCode);
    }
    if (err.code === "commander.help" && err.exitCode === 0) {
      process.exit(0);
    }
    if (json) {
      const message =
        err.code === "commander.help"
          ? "missing subcommand"
          : err.message.replace(/^error: /, "");
      const code =
        err.code === "commander.invalidArgument" ? "invalid_argument" : "usage";
      console.log(
        errorJson({
          code,
          message,
          hint: "See `telegram <command> --help` or `telegram help-all -g <word>`.",
        })
      );
    }
    process.exit(EXIT.USAGE);
  };
  const walk = (cmd: Command): void => {
    cmd.exitOverride(onExit);
    if (json) {
      cmd.configureOutput({ outputError: () => {} });
    }
    cmd.commands.forEach(walk);
  };
  walk(root);
}

function readWorkerStdin(): Promise<string> {
  return new Promise((resolve) => {
    let text = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      text += chunk;
    });
    process.stdin.on("end", () => resolve(text));
    process.stdin.on("error", () => resolve(text));
  });
}
