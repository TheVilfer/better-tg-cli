import type { TelegramClient } from "teleproto";

import { CliError, EXIT, usageError } from "../errors.js";
import type { Target } from "./host.js";
import { httpDeps, readFixtureDir } from "./http-backend.js";
import { fixtureBackend, parseFixtures } from "./http.js";
import type { Fixture } from "./http.js";
import type { Manifest, PluginCommand } from "./manifest.js";
import {
  checkInput,
  findCommand,
  memoryCursors,
  memoryStorage,
  runPluginCommand,
} from "./run.js";
import type { RunOutcome } from "./run.js";
import { anchor } from "./safe-fs.js";
import { secretValueProblem } from "./secrets.js";
import { checkSettingValue } from "./settings.js";
import { readLocalSnapshot } from "./source.js";

/** The installation ID `plugin dev` runs under: cursors are bound to it and live in memory. */
export const DEV_INSTALL_ID = "plugin-dev";

/** The value `plugin dev` injects for a secret: never a real one. */
export const devSecret = (name: string) => `dev-secret-${name}`;

/** A plugin folder checked as `plugin validate` checks it, and the command to run. */
export interface DevPlugin {
  dir: string;
  manifest: Manifest;
  command: PluginCommand;
  code: string;
}

/**
 * One `plugin dev --mock` run, shared by the CLI and the plugin SDK's test host so both check and run
 * a command the same way. Without `settings`, `secrets` and `fixtures` it is exactly `plugin dev`.
 *
 * - `settings`: Stored settings (the test host's option), each checked as `plugin settings set` checks it.
 * - `secrets`: Secret values instead of the `dev-secret-<name>` placeholders; `null` is a secret not set.
 * - `fixtures`: More HTTP fixtures in the `dev/fixtures` format, matched before the folder's own.
 */
export interface DevRunRequest {
  input: unknown;
  target?: Target;
  settings?: Record<string, unknown>;
  secrets?: Record<string, string | null>;
  fixtures?: unknown;
  log?: (line: string) => void;
  signal?: AbortSignal;
  cancelled?: () => boolean;
}

/** Reads and checks the folder as `plugin validate` does and finds the command; `cliVersion` is matched against `engines`. */
export function devPlugin(
  dir: string,
  command: string,
  cliVersion: string
): DevPlugin {
  const snap = readLocalSnapshot(dir, cliVersion);
  const m = snap.manifest;
  return {
    dir,
    manifest: m,
    command: findCommand(m, command),
    code: new TextDecoder().decode(snap.files.get(m.main!)),
  };
}

function devSecrets(
  declared: string[],
  given: Record<string, string | null> | undefined
): (name: string) => string | null {
  const values = new Map<string, string | null>();
  for (const [name, value] of Object.entries(given ?? {})) {
    if (!declared.includes(name)) {
      throw usageError(
        `The plugin declares no secret "${name}"`,
        `Its secrets: ${declared.join(", ") || "none"}`
      );
    }
    const problem = value === null ? undefined : secretValueProblem(value);
    if (problem) {
      throw usageError(`The value of the secret "${name}" ${problem}`);
    }
    values.set(name, value);
  }
  return (name) => (values.has(name) ? values.get(name)! : devSecret(name));
}

function extraFixtures(json: unknown): Fixture[] {
  if (json === undefined) {
    return [];
  }
  try {
    return parseFixtures(json, "fixtures");
  } catch (error) {
    throw new CliError(
      `plugin dev: ${(error as Error).message}`,
      "invalid_argument",
      EXIT.USAGE
    );
  }
}

/** Checks the input and runs the command against the mock account, in memory. */
export async function devRun(
  plugin: DevPlugin,
  req: DevRunRequest
): Promise<RunOutcome> {
  const { manifest: m, command: c } = plugin;
  checkInput(c, req.input);
  const stored: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const [key, value] of Object.entries(req.settings ?? {})) {
    checkSettingValue(m, key, value);
    stored[key] = value;
  }
  const secret = devSecrets(
    (m.secrets ?? []).map((s) => s.name),
    req.secrets
  );
  const sends = c.effects.includes("network");
  const backend = sends
    ? (httpDeps.backend ??
      fixtureBackend(
        [
          ...extraFixtures(req.fixtures),
          ...readFixtureDir(anchor(plugin.dir), "dev/fixtures", "plugin dev"),
        ],
        "dev"
      ))
    : undefined;
  const { MockClient } = await import("../mock/client.js");
  const { seedWorld } = await import("../mock/world.js");
  const world = seedWorld();
  const client = new MockClient(world) as unknown as TelegramClient;
  const storage = memoryStorage(m);
  return runPluginCommand({
    manifest: m,
    command: c,
    code: plugin.code,
    filename: m.main!,
    input: req.input,
    client: async () => client,
    account: async () => String(world.me),
    storage: async () => storage,
    cursors: memoryCursors(),
    installId: DEV_INSTALL_ID,
    target: req.target,
    mcp: false,
    log: req.log,
    ...(req.settings ? { settings: () => stored } : {}),
    ...(backend
      ? {
          network: {
            backend,
            secret,
            setCommand: (name: string) => [
              "plugin",
              "secret",
              "set",
              m.name,
              name,
            ],
          },
        }
      : {}),
    signal: req.signal,
    cancelled: req.cancelled,
  });
}
