import { Command } from 'commander';
import { formatJson } from '../formatters/json.js';
import {
  agentStatus, installSkill, knownAgents, selectAgents, uninstallSkill, type Agent,
} from '../skill-install.js';

const OTHER_AGENTS = 'Other agents: npx skills add TheVilfer/better-tg-cli';

function pick(ids: string[] | undefined): Agent[] {
  try {
    return selectAgents(ids, knownAgents());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

const install = new Command('install')
  .description('Install the better-tg-cli skill for coding agents (default: every agent found on this machine)')
  .option('-a, --agent <ids...>', 'Only these agents (see `telegram skill status`)')
  .option('--force', 'Replace a symlinked skill folder with a copy (the link target is never touched)')
  .option('--json', 'Output as JSON')
  .action((options: { agent?: string[]; force?: boolean; json?: boolean }) => {
    const agents = pick(options.agent);
    if (!agents.length) {
      console.error(`No supported agents found. ${OTHER_AGENTS}`);
      process.exit(1);
    }
    const results = agents.map(a => installSkill(a, { force: options.force }));
    if (options.json) {
      console.log(formatJson(results.map(r => ({ agent: r.agent.id, path: r.path, action: r.action, reason: r.reason }))));
      return;
    }
    for (const r of results) {
      console.log(`${r.agent.name.padEnd(16)} ${r.action}${r.reason ? ` (${r.reason})` : ''}  ${r.path}`);
    }
    console.log(`\nRestart running agents to pick it up. ${OTHER_AGENTS}`);
  });

const status = new Command('status')
  .description('Show where the skill is installed, linked or outdated for each supported agent')
  .option('--json', 'Output as JSON')
  .action((options: { json?: boolean }) => {
    const rows = knownAgents().map(agentStatus);
    if (options.json) {
      console.log(formatJson(rows.map(r => ({ agent: r.agent.id, name: r.agent.name, detected: r.detected, path: r.path, ...r.state }))));
      return;
    }
    for (const r of rows) {
      const state = r.state.kind === 'linked' ? `linked → ${r.state.target}` : r.state.kind;
      console.log(`${r.agent.id.padEnd(15)} ${(r.detected ? state : `${state}, agent not found`).padEnd(28)} ${r.path}`);
    }
  });

const uninstall = new Command('uninstall')
  .description('Remove the skill from coding agents (default: every agent found on this machine)')
  .option('-a, --agent <ids...>', 'Only these agents')
  .option('--force', 'Also remove symlinked skill folders (the link only)')
  .option('--json', 'Output as JSON')
  .action((options: { agent?: string[]; force?: boolean; json?: boolean }) => {
    const results = pick(options.agent).map(a => uninstallSkill(a, { force: options.force }));
    if (options.json) {
      console.log(formatJson(results.map(r => ({ agent: r.agent.id, path: r.path, action: r.action, reason: r.reason }))));
      return;
    }
    for (const r of results) {
      console.log(`${r.agent.name.padEnd(16)} ${r.action}${r.reason ? ` (${r.reason})` : ''}  ${r.path}`);
    }
  });

export const skillCommand = new Command('skill')
  .description('Install the agent skill into Claude Code, Codex, Cursor, Gemini CLI and other coding agents')
  .addCommand(install)
  .addCommand(status)
  .addCommand(uninstall);
