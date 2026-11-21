import { Command } from "commander";

import { CliError, fail, usageError } from "../errors.js";
import { formatJson } from "../formatters/json.js";
import {
  agentStatus,
  installSkill,
  knownAgents,
  selectAgents,
  uninstallSkill,
} from "../skill-install.js";
import type { Agent } from "../skill-install.js";

const OTHER_AGENTS = "Other agents: npx skills add TheVilfer/better-tg-cli";

function pick(ids: string[] | undefined): Agent[] {
  try {
    return selectAgents(ids, knownAgents());
  } catch (error) {
    fail(
      usageError(
        error instanceof Error ? error.message : String(error),
        "See the agents: telegram skill status"
      )
    );
  }
}

const install = new Command("install")
  .description(
    "Install the better-tg-cli skill for coding agents (default: every agent found on this machine)"
  )
  .option(
    "-a, --agent <ids...>",
    "Only these agents (see `telegram skill status`)"
  )
  .option(
    "--force",
    "Replace a symlinked skill folder with a copy (the link target is never touched)"
  )
  .option("--json", "Output as JSON")
  .action((options: { agent?: string[]; force?: boolean; json?: boolean }) => {
    const agents = pick(options.agent);
    if (!agents.length) {
      fail(
        new CliError("No supported agents found", "no_agents", 1, {
          hint: OTHER_AGENTS,
        })
      );
    }
    const results = agents.map((a) =>
      installSkill(a, { force: options.force })
    );
    if (options.json) {
      console.log(
        formatJson(
          results.map((r) => ({
            agent: r.agent.id,
            path: r.path,
            action: r.action,
            reason: r.reason,
          }))
        )
      );
      return;
    }
    for (const r of results) {
      console.log(
        `${r.agent.name.padEnd(16)} ${r.action}${r.reason ? ` (${r.reason})` : ""}  ${r.path}`
      );
    }
    console.log(`\nRestart running agents to pick it up. ${OTHER_AGENTS}`);
  });

const status = new Command("status")
  .description(
    "Show where the skill is installed, linked or outdated for each supported agent"
  )
  .option("--json", "Output as JSON")
  .action((options: { json?: boolean }) => {
    const rows = knownAgents().map(agentStatus);
    if (options.json) {
      console.log(
        formatJson(
          rows.map((r) => ({
            agent: r.agent.id,
            name: r.agent.name,
            detected: r.detected,
            path: r.path,
            ...r.state,
          }))
        )
      );
      return;
    }
    for (const r of rows) {
      const state =
        r.state.kind === "linked"
          ? `linked → ${r.state.target}`
          : r.state.kind === "broken-link"
            ? `broken-link → ${r.state.target} (missing)`
            : r.state.kind;
      console.log(
        `${r.agent.id.padEnd(15)} ${(r.detected ? state : `${state}, agent not found`).padEnd(28)} ${r.path}`
      );
      if (r.state.kind === "broken-link") {
        console.log(
          `${"".padEnd(15)} the link points at a folder that no longer exists: remove ${r.path}, then run telegram skill install -a ${r.agent.id}`
        );
      }
    }
  });

const uninstall = new Command("uninstall")
  .description(
    "Remove the skill from coding agents (default: every agent found on this machine)"
  )
  .option("-a, --agent <ids...>", "Only these agents")
  .option("--force", "Also remove symlinked skill folders (the link only)")
  .option("--json", "Output as JSON")
  .action((options: { agent?: string[]; force?: boolean; json?: boolean }) => {
    const results = pick(options.agent).map((a) =>
      uninstallSkill(a, { force: options.force })
    );
    if (options.json) {
      console.log(
        formatJson(
          results.map((r) => ({
            agent: r.agent.id,
            path: r.path,
            action: r.action,
            reason: r.reason,
          }))
        )
      );
      return;
    }
    for (const r of results) {
      console.log(
        `${r.agent.name.padEnd(16)} ${r.action}${r.reason ? ` (${r.reason})` : ""}  ${r.path}`
      );
    }
  });

export const skillCommand = new Command("skill")
  .description(
    "Install the agent skill into Claude Code, Codex, Cursor, Gemini CLI and other coding agents"
  )
  .addCommand(install)
  .addCommand(status)
  .addCommand(uninstall);
