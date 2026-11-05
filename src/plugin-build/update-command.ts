// Replaces src/commands/update.ts in the Claude plugin build (scripts/bundle.mjs plugin).
import { Command } from 'commander';

export const updateCommand = new Command('update')
  .description('Better-TG-CLI inside the Claude plugin is updated by Claude Code')
  .option('--check', 'Only report whether a newer version exists')
  .option('--json', 'Output as JSON (with --check)')
  .action(() => {
    console.error('This copy of telegram is the one bundled with the Claude plugin, and Claude Code updates it with the plugin (/plugin). To use the CLI on its own, install it as the README says.');
    process.exit(1);
  });
