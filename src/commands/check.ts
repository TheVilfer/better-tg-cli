import { Command } from "commander";

import { getClient, getMe, disconnectClient } from "../client.js";
import chalk from "../colors.js";
import {
  isConfigured,
  loadConfig,
  secretFileConflicts,
  secretSource,
} from "../config.js";
import type { TgConfig } from "../config.js";
import { errorDetails, EXIT, fail } from "../errors.js";
import { loginHint } from "../login-hint.js";
import { mockStatePath } from "../mock/world.js";
import { configDir, isMock, isMockAsk, profile } from "../paths.js";
import { checkPlugins, checkPluginsLine } from "../plugins/catalog.js";
import ora from "../spinner.js";
import {
  getSecretBackendLabel,
  writesLine,
  writesOf,
  writeStatus,
  writesTextLine,
} from "../status.js";
import { transportSetting } from "../transport.js";
import { VERSION } from "../version.js";

function sessionStorageLabel(config: TgConfig): string {
  if (secretSource("sessionString", config) === "file") {
    return "config.json5 (plaintext file, used as is; it is not moved into the secret store)";
  }
  return getSecretBackendLabel();
}

/**
 * `check --json`: one object, also on failure (then with `error`, and the exit code of that error).
 * {configured, authenticated, account?, writeMode, writes, writeUntil?, writeModeProtected, secretStore,
 *  profile, transport, testServers, version, mock?, plugins, pluginsError?, error?}
 * `plugins`: [{name, version, status, onboarding?}] from the local lock file (no network); the
 * onboarding state only when the account is known.
 */
export const checkCommand = new Command("check")
  .description("Verify session and credentials, and show the write mode")
  .option(
    "--json",
    "Output as JSON (configured, authenticated, account, writeMode, …)"
  )
  .action(async (options: { json?: boolean }) => {
    const json = !!options.json;
    if (isMock()) {
      const me = await getMe(await getClient());
      const mode = isMockAsk() ? "ask" : "on";
      if (json) {
        console.log(
          JSON.stringify({
            configured: true,
            authenticated: true,
            mock: true,
            account: {
              id: me.id.toString(),
              ...(me.username ? { username: me.username } : {}),
            },
            writeMode: mode,
            writes: writesOf(mode),
            writeModeProtected: false,
            profile: profile() || null,
            version: VERSION,
            ...pluginsJson(me.id?.toString()),
          })
        );
      } else {
        console.log(chalk.green("Mock mode: no Telegram session is used"));
        console.log(
          chalk.bold(
            `${writesLine(mode)} ${
              mode === "ask"
                ? "(mock: TG_MOCK_ASK rehearses approvals; writes only change the state file)"
                : "(mock: writes only change the state file, no approval)"
            }`
          )
        );
        console.log(
          `Logged in as: ${me.firstName || ""} ${me.lastName || ""} (@${me.username || "no username"})`
        );
        console.log(`State file: ${mockStatePath()} (delete it to start over)`);
        console.log(checkPluginsLine(me.id?.toString()));
      }
      await disconnectClient();
      return;
    }
    let config: TgConfig;
    let configured: boolean;
    let conflicts: string[];
    try {
      config = loadConfig(() => {});
      configured = isConfigured(config);
      conflicts = secretFileConflicts(config);
    } catch (error) {
      if (json) {
        fail(error);
      }
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error))
      );
      process.exit(1);
    }
    const write = writeStatus();
    const base = {
      ...write,
      profile: profile() || null,
      transport: transportLabel(config),
      testServers: !!config.testServers,
      version: VERSION,
      ...pluginsJson(undefined),
    };
    if (!configured) {
      const p = profile();
      const message = p
        ? `Profile "${p}" is not configured. Run: TG_PROFILE=${p} telegram onboard [--test-dc] (a person at their own terminal can use \`TG_PROFILE=${p} telegram auth --qr\` instead)`
        : `Not configured. ${loginHint()}`;
      if (json) {
        console.log(
          JSON.stringify({
            configured: false,
            authenticated: false,
            ...base,
            error: { code: "not_configured", message },
          })
        );
      } else {
        console.log(chalk.red(message));
      }
      process.exit(EXIT.NOT_LOGGED_IN);
    }

    for (const key of conflicts) {
      const line = `config.json5 also holds a ${key} that differs from the secret store; the stored one is used.`;
      if (json) {
        console.error(line);
      } else {
        console.log(chalk.yellow(line));
      }
    }

    const spinner = ora("Checking session...").start();

    try {
      const client = await getClient(config);
      const me = await getMe(client);

      if (json) {
        spinner.stop();
        console.log(
          JSON.stringify({
            configured: true,
            authenticated: true,
            account: {
              id: me.id.toString(),
              ...(me.username ? { username: me.username } : {}),
            },
            ...base,
            sessionStore: sessionStorageLabel(config),
            ...pluginsJson(me.id?.toString()),
          })
        );
      } else {
        spinner.succeed(chalk.green("Session valid"));
        console.log(chalk.bold(writesTextLine(write)));
        console.log(
          `Logged in as: ${me.firstName || ""} ${me.lastName || ""} (@${me.username || "no username"})`
        );
        console.log(`Session stored in: ${sessionStorageLabel(config)}`);
        if (profile()) {
          console.log(`Profile: ${profile()} (${configDir()})`);
        }
        if (config.testServers) {
          console.log("Servers: TEST (not production)");
        }
        console.log(checkPluginsLine(me.id?.toString()));
      }

      await disconnectClient();
    } catch (error) {
      const details = errorDetails(error);
      const ended = details.exitCode === EXIT.NOT_LOGGED_IN;
      if (json) {
        spinner.stop();
        console.log(
          JSON.stringify({
            configured: true,
            authenticated: false,
            ...base,
            error: {
              code: details.code,
              message: details.message,
              ...(details.hint ? { hint: details.hint } : {}),
              ...(details.command ? { command: details.command } : {}),
              ...(details.retryAfterSeconds === undefined
                ? {}
                : { retryAfterSeconds: details.retryAfterSeconds }),
            },
          })
        );
        process.exit(details.exitCode);
      }
      const message = error instanceof Error ? error.message : String(error);
      if (!ended) {
        spinner.fail(
          chalk.red(
            details.code === "flood_wait"
              ? "Could not check the session: Telegram rate limit"
              : "Could not check the session"
          )
        );
        console.error(details.message);
        if (details.hint) {
          console.error(details.hint);
        }
        console.error(
          "The stored login was not judged; this is no reason to log in again."
        );
        process.exit(details.exitCode);
      }
      spinner.fail(chalk.red("Session invalid or expired"));
      console.error(message);
      if (!message.includes(loginHint())) {
        console.log(`\n${loginHint()}`);
      }
      process.exit(details.exitCode);
    }
  });

function pluginsJson(userId: string | undefined): {
  plugins: ReturnType<typeof checkPlugins>["plugins"];
  pluginsError?: string;
} {
  const { plugins, error } = checkPlugins(userId);
  return { plugins, ...(error ? { pluginsError: error } : {}) };
}

function transportLabel(config: TgConfig): string {
  try {
    return transportSetting(undefined, config);
  } catch {
    return "invalid TG_TRANSPORT";
  }
}
