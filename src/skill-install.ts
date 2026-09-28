import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { SKILL_FILES } from './skill-files.js';

/**
 * `telegram skill`: copies the bundled agent skill into each coding agent's global skills folder
 * (the same folders `npx skills add -g` uses). The skill ships inside the CLI, so it always matches
 * the installed version. A folder that is a symlink (a dev checkout, or `npx skills` linking
 * one canonical copy) is never written through: it's reported as linked and left alone.
 */

export const SKILL_NAME = 'better-tg-cli';

export interface Agent { id: string; name: string; home: string; skillsDir: string }

type Env = Record<string, string | undefined>;

const envDir = (env: Env, key: string, fallback: string) => env[key]?.trim() || fallback;

/** The agents we install for, with the home folder that tells us each one is present. */
export function knownAgents(home = homedir(), env: Env = process.env): Agent[] {
  const config = envDir(env, 'XDG_CONFIG_HOME', join(home, '.config'));
  const claude = envDir(env, 'CLAUDE_CONFIG_DIR', join(home, '.claude'));
  const codex = envDir(env, 'CODEX_HOME', join(home, '.codex'));
  const grok = envDir(env, 'GROK_HOME', join(home, '.grok'));
  const agent = (id: string, name: string, dir: string, skillsDir = join(dir, 'skills')): Agent => ({ id, name, home: dir, skillsDir });
  return [
    agent('claude-code', 'Claude Code', claude),
    agent('codex', 'Codex', codex),
    agent('cursor', 'Cursor', join(home, '.cursor')),
    agent('gemini-cli', 'Gemini CLI', join(home, '.gemini')),
    agent('github-copilot', 'GitHub Copilot', join(home, '.copilot')),
    agent('grok', 'Grok Build', grok),
    agent('opencode', 'OpenCode', join(config, 'opencode')),
    agent('goose', 'Goose', join(config, 'goose')),
    agent('droid', 'Droid (Factory)', join(home, '.factory')),
    agent('windsurf', 'Windsurf', join(home, '.codeium', 'windsurf')),
    agent('pi', 'Pi', join(home, '.pi', 'agent')),
  ];
}

export type SkillState =
  | { kind: 'installed' }
  | { kind: 'outdated' }
  | { kind: 'missing' }
  | { kind: 'linked'; target: string }
  | { kind: 'foreign' };

export interface AgentStatus { agent: Agent; detected: boolean; path: string; state: SkillState }

function lstat(path: string) {
  try { return lstatSync(path); } catch { return undefined; }
}

/** A real folder whose SKILL.md names this skill; anything else there isn't ours to replace. */
function isOurFolder(path: string): boolean {
  try {
    return /^name:\s*better-tg-cli\s*$/m.test(readFileSync(join(path, 'SKILL.md'), 'utf8'));
  } catch {
    return false;
  }
}

export function skillState(path: string): SkillState {
  const st = lstat(path);
  if (!st) return { kind: 'missing' };
  if (st.isSymbolicLink()) return { kind: 'linked', target: readlinkSync(path) };
  if (!st.isDirectory() || !isOurFolder(path)) return { kind: 'foreign' };
  const same = Object.entries(SKILL_FILES).every(([file, content]) => {
    try { return readFileSync(join(path, file), 'utf8') === content; } catch { return false; }
  });
  return { kind: same ? 'installed' : 'outdated' };
}

export function agentStatus(agent: Agent): AgentStatus {
  const path = join(agent.skillsDir, SKILL_NAME);
  return { agent, detected: existsSync(agent.home), path, state: skillState(path) };
}

/** Picks agents by id; with no ids, every agent whose home folder exists. */
export function selectAgents(ids: string[] | undefined, agents: Agent[]): Agent[] {
  if (!ids?.length) return agents.filter(a => existsSync(a.home));
  const unknown = ids.filter(id => !agents.some(a => a.id === id));
  if (unknown.length) {
    throw new Error(`Unknown agent: ${unknown.join(', ')}. Known: ${agents.map(a => a.id).join(', ')}`);
  }
  return agents.filter(a => ids.includes(a.id));
}

export type InstallResult = { agent: Agent; path: string; action: 'installed' | 'updated' | 'unchanged' | 'skipped'; reason?: string };

export function installSkill(agent: Agent, options: { force?: boolean } = {}): InstallResult {
  const path = join(agent.skillsDir, SKILL_NAME);
  const state = skillState(path);
  if (state.kind === 'installed') return { agent, path, action: 'unchanged' };
  if (state.kind === 'linked') {
    if (!options.force) return { agent, path, action: 'skipped', reason: `symlink to ${state.target}; --force replaces the link with a copy` };
    unlinkSync(path); // the link only, never what it points at
  }
  if (state.kind === 'foreign') return { agent, path, action: 'skipped', reason: 'something else lives there; not touching it' };
  mkdirSync(path, { recursive: true });
  for (const [file, content] of Object.entries(SKILL_FILES)) writeFileSync(join(path, file), content);
  return { agent, path, action: state.kind === 'outdated' ? 'updated' : 'installed' };
}

export type UninstallResult = { agent: Agent; path: string; action: 'removed' | 'absent' | 'skipped'; reason?: string };

export function uninstallSkill(agent: Agent, options: { force?: boolean } = {}): UninstallResult {
  const path = join(agent.skillsDir, SKILL_NAME);
  const state = skillState(path);
  if (state.kind === 'missing') return { agent, path, action: 'absent' };
  if (state.kind === 'linked') {
    if (!options.force) return { agent, path, action: 'skipped', reason: `symlink to ${state.target}; --force removes the link` };
    unlinkSync(path);
    return { agent, path, action: 'removed' };
  }
  if (state.kind === 'foreign') return { agent, path, action: 'skipped', reason: 'not a better-tg-cli skill folder; not touching it' };
  rmSync(path, { recursive: true, force: true });
  return { agent, path, action: 'removed' };
}
