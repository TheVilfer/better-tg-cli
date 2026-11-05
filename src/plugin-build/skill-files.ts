// Replaces src/skill-files.ts in the Claude plugin build (scripts/bundle.mjs plugin): the plugin
// already ships the skill next to the server, so `telegram skill install` copies those files
// (plugin/skills/better-tg-cli) instead of a second embedded copy.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

function pluginSkill(): Record<string, string> {
  const dir = join(dirname(process.argv[1] ?? ''), '..', 'skills', 'better-tg-cli');
  try {
    return Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.md')).sort().map(f => [f, readFileSync(join(dir, f), 'utf8')]));
  } catch {
    return {};
  }
}

export const SKILL_FILES: Record<string, string> = pluginSkill();
