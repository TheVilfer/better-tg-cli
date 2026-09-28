import { describe, expect, it } from 'vitest';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { SKILL_FILES } from '../src/skill-files.js';
import {
  agentStatus, installSkill, knownAgents, selectAgents, SKILL_NAME, uninstallSkill,
} from '../src/skill-install.js';
import { EXCLUDED_COMMANDS, isWriteCommand, setKnownCommands } from '../src/mcp.js';

// Every test works in a throwaway HOME; the real agent folders are never touched
const fakeHome = () => mkdtempSync(join(tmpdir(), 'tg-skill-'));
const agent = (home: string, id: string) => knownAgents(home, {}).find(a => a.id === id)!;

describe('embedded skill', () => {
  it('matches skills/better-tg-cli on disk (rebuild if this fails)', () => {
    const dir = new URL('../skills/better-tg-cli/', import.meta.url);
    expect(Object.keys(SKILL_FILES).sort()).toEqual(readdirSync(dir).sort());
    for (const [file, content] of Object.entries(SKILL_FILES)) {
      expect(content).toBe(readFileSync(new URL(file, dir), 'utf8'));
    }
  });
});

describe('knownAgents', () => {
  it('follows the agents\' own home variables', () => {
    const agents = knownAgents('/h', { CLAUDE_CONFIG_DIR: '/c', CODEX_HOME: '/x', GROK_HOME: '/g', XDG_CONFIG_HOME: '/cfg' });
    const dir = (id: string) => agents.find(a => a.id === id)!.skillsDir;
    expect(dir('claude-code')).toBe(join('/c', 'skills'));
    expect(dir('codex')).toBe(join('/x', 'skills'));
    expect(dir('grok')).toBe(join('/g', 'skills'));
    expect(dir('opencode')).toBe(join('/cfg', 'opencode', 'skills'));
    expect(dir('cursor')).toBe(join('/h', '.cursor', 'skills'));
  });

  it('never targets the shared ~/.agents/skills folder or a folder named after the binary', () => {
    for (const a of knownAgents('/h', {})) {
      expect(a.skillsDir).not.toBe(join('/h', '.agents', 'skills'));
      expect(join(a.skillsDir, SKILL_NAME)).toMatch(/[\\/]better-tg-cli$/);
    }
  });
});

describe('selectAgents', () => {
  it('defaults to agents whose home exists and rejects unknown ids', () => {
    const home = fakeHome();
    mkdirSync(join(home, '.claude'));
    mkdirSync(join(home, '.cursor'));
    const agents = knownAgents(home, {});
    expect(selectAgents(undefined, agents).map(a => a.id)).toEqual(['claude-code', 'cursor']);
    expect(selectAgents(['codex'], agents).map(a => a.id)).toEqual(['codex']);
    expect(() => selectAgents(['nope'], agents)).toThrow(/Unknown agent: nope/);
  });
});

describe('install / uninstall', () => {
  it('installs, reports unchanged, updates an outdated copy and removes it', () => {
    const home = fakeHome();
    const a = agent(home, 'claude-code');
    expect(agentStatus(a).state.kind).toBe('missing');
    expect(installSkill(a).action).toBe('installed');
    const path = join(a.skillsDir, SKILL_NAME);
    expect(readFileSync(join(path, 'SKILL.md'), 'utf8')).toBe(SKILL_FILES['SKILL.md']);
    expect(agentStatus(a).state.kind).toBe('installed');
    expect(installSkill(a).action).toBe('unchanged');

    writeFileSync(join(path, 'reference.md'), 'old');
    expect(agentStatus(a).state.kind).toBe('outdated');
    expect(installSkill(a).action).toBe('updated');
    expect(agentStatus(a).state.kind).toBe('installed');

    expect(uninstallSkill(a).action).toBe('removed');
    expect(existsSync(path)).toBe(false);
    expect(uninstallSkill(a).action).toBe('absent');
  });

  it('never writes through a symlinked skill folder; --force swaps only the link', () => {
    const home = fakeHome();
    const a = agent(home, 'codex');
    const checkout = join(home, 'checkout', 'better-tg-cli');
    mkdirSync(checkout, { recursive: true });
    writeFileSync(join(checkout, 'SKILL.md'), '---\nname: better-tg-cli\n---\nlocal edits\n');
    mkdirSync(a.skillsDir, { recursive: true });
    const path = join(a.skillsDir, SKILL_NAME);
    // Windows needs a privilege for directory symlinks; a junction is what tools create there
    symlinkSync(checkout, path, process.platform === 'win32' ? 'junction' : 'dir');

    const linked = agentStatus(a).state;
    expect(linked.kind).toBe('linked');
    expect(resolve((linked as { target: string }).target)).toBe(resolve(checkout));
    const skipped = installSkill(a);
    expect(skipped.action).toBe('skipped');
    expect(uninstallSkill(a).action).toBe('skipped');
    expect(lstatSync(path).isSymbolicLink()).toBe(true);

    expect(installSkill(a, { force: true }).action).toBe('installed');
    expect(lstatSync(path).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(checkout, 'SKILL.md'), 'utf8')).toBe('---\nname: better-tg-cli\n---\nlocal edits\n');
    expect(readdirSync(checkout)).toEqual(['SKILL.md']);
  });

  it('leaves a folder that belongs to something else alone', () => {
    const home = fakeHome();
    const a = agent(home, 'cursor');
    const path = join(a.skillsDir, SKILL_NAME);
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, 'SKILL.md'), '---\nname: something-else\n---\n');
    expect(installSkill(a).action).toBe('skipped');
    expect(uninstallSkill(a, { force: true }).action).toBe('skipped');
    expect(readFileSync(join(path, 'SKILL.md'), 'utf8')).toBe('---\nname: something-else\n---\n');
  });
});

describe('MCP', () => {
  it('never exposes `skill`, which writes into other agents\' config', () => {
    setKnownCommands(['skill', 'send']);
    expect(EXCLUDED_COMMANDS.has('skill')).toBe(true);
    expect(isWriteCommand('skill')).toBe(false);
  });
});
