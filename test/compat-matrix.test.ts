import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CLIENTS, LIVE_REQUIRED, approvalOf, outcomeCells, refusalOf, statusOf, validate, type ClientRecord } from '../src/clients/data.js';
import { DOC_PATH, renderCompatibility, strongest } from '../src/clients/matrix.js';
import { knownAgents } from '../src/skill-install.js';

// The clients issue #109 names, by id. Adding one is fine; dropping one should be a decision.
const ISSUE_CLIENTS = [
  'claude-code', 'claude-desktop', 'claude-ai', 'cursor', 'vscode-copilot', 'github-copilot', 'codex', 'chatgpt',
  'gemini-cli', 'windsurf', 'cline', 'zed', 'grok', 'grok-bot', 'hermes', 'opencode', 'goose', 'droid', 'amp',
  'warp', 'kiro', 'aside',
];

const byId = (id: string) => CLIENTS.find(c => c.id === id)!;
const LIVE = { level: 'live', version: '9.9.9', date: '2026-11-20' } as const;

/** A copy of a real record with every outcome cell given a live entry (or with `patch` on top). */
function withLive(base: ClientRecord, patch: Partial<ClientRecord> = {}): ClientRecord {
  const live = <T extends { evidence: unknown[] }>(c: T) => ({ ...c, evidence: [...c.evidence, LIVE] });
  return {
    ...base,
    install: live(base.install),
    read: { value: 'works', evidence: [LIVE] },
    approval: live(approvalOf(base)) as ClientRecord['approval'],
    refusal: live(refusalOf(base)) as ClientRecord['refusal'],
    ...patch,
  };
}

describe('compatibility matrix', () => {
  it('docs/compatibility.md is generated from src/clients/data.ts (run `bun scripts/compat-matrix.ts`)', () => {
    const have = readFileSync(DOC_PATH, 'utf8').replace(/\r\n/g, '\n');
    expect(have, 'docs/compatibility.md is out of date. Run: bun scripts/compat-matrix.ts').toBe(renderCompatibility());
  });

  it('the data is consistent: every claim has evidence, every unknown has none', () => {
    expect(validate(CLIENTS)).toEqual([]);
  });

  it('lists every client the issue names, once', () => {
    expect(CLIENTS.map(c => c.id).sort()).toEqual([...ISSUE_CLIENTS].sort());
  });

  it('uses the same ids as the skill installer, so connect and doctor can join on them', () => {
    const ids = new Set(CLIENTS.map(c => c.id));
    for (const agent of knownAgents('/home/u', {})) {
      if (agent.id !== 'pi') expect(ids, agent.id).toContain(agent.id);
    }
  });

  it('nothing is supported without a live run', () => {
    for (const c of CLIENTS) {
      if (statusOf(c) === 'supported') {
        for (const cell of Object.values(outcomeCells(c))) expect(cell.evidence.some(e => e.level === 'live'), c.id).toBe(true);
      }
    }
    // Nobody has run the server in any client yet
    expect(CLIENTS.filter(c => statusOf(c) === 'supported')).toEqual([]);
  });

  it('a client becomes supported only when install, read, approval and refusal are all live', () => {
    const base = byId('codex');
    expect(statusOf(base)).toBe('untested');
    expect(statusOf(withLive(base))).toBe('supported');
    expect(validate([withLive(base)])).toEqual([]);
    for (const key of LIVE_REQUIRED) {
      const partial = withLive(base);
      const cell = key === 'install' ? base.install : key === 'read' ? { value: 'expected' as const, evidence: base.read.evidence } : key === 'approval' ? approvalOf(base) : refusalOf(base);
      (partial as unknown as Record<string, unknown>)[key] = cell;
      expect(statusOf(partial), key).toBe('untested');
    }
  });

  it('rejects a live entry without a client version or a date', () => {
    const base = byId('codex');
    const noVersion = withLive(base, { install: { value: 'plugin', evidence: [{ level: 'live', version: '', date: '2026-11-20' }] } });
    expect(validate([noVersion]).join('\n')).toMatch(/codex\.install: live entry without a client version/);
    const noDate = withLive(base, { install: { value: 'plugin', evidence: [{ level: 'live', version: '1.0', date: 'yesterday' }] } });
    expect(validate([noDate]).join('\n')).toMatch(/codex\.install: live entry without a date/);
  });

  it('rejects "works" without a live entry, a claim without evidence, and an unknown with evidence', () => {
    const base = byId('codex');
    const works = { ...base, read: { value: 'works' as const, evidence: base.read.evidence } };
    expect(validate([works]).join('\n')).toMatch(/codex\.read: "works" without a live entry/);
    const bare = { ...base, sandbox: { value: 'outside' as const, evidence: [] } };
    expect(validate([bare]).join('\n')).toMatch(/codex\.sandbox: "outside" has no evidence/);
    const odd = { ...base, gui: { value: 'unknown' as const, evidence: base.sandbox.evidence } };
    expect(validate([odd]).join('\n')).toMatch(/codex\.gui: unknown but has evidence/);
    expect(validate([base, base]).join('\n')).toMatch(/codex: duplicate id/);
  });

  it('derives the approval level from what the client advertises, as the released server does', () => {
    expect(approvalOf(byId('claude-code')).value).toBe('G1');
    expect(refusalOf(byId('claude-code')).value).toBe('refused');
    expect(approvalOf(byId('aside')).value).toBe('G2');
    expect(refusalOf(byId('aside')).value).toBe('chat');
    expect(approvalOf(byId('amp')).value).toBe('unknown');
    expect(approvalOf(byId('opencode')).note).toMatch(/V1/);
    expect(approvalOf(byId('claude-ai')).value).toBe('unknown');
    expect(statusOf(byId('chatgpt'))).toBe('unsupported');
  });

  it('the skill route and the HTTP server are G2: Claude Code is G1 only through its MCP server, Grok Bot is G2', () => {
    const cc = approvalOf(byId('claude-code'));
    expect(cc.value).toBe('G1');
    expect(cc.note).toMatch(/claude mcp add.*skill route, which is G2/);
    expect(approvalOf(byId('grok-bot')).value).toBe('G2');
    expect(refusalOf(byId('grok-bot')).value).toBe('chat');
    expect(renderCompatibility()).toContain('`telegram mcp --http` are G2 in every client');
  });

  it('"expected" reading needs a known stdio environment; "n/a" needs no evidence', () => {
    const base = byId('codex');
    const guess = { ...base, stdioEnv: { value: 'unknown' as const, evidence: [] } };
    expect(validate([guess]).join('\n')).toMatch(/codex\.read: "expected" while its stdio environment is unknown/);
    expect(validate([{ ...base, gui: { value: 'n/a' as const, evidence: [] } }])).toEqual([]);
  });

  it('a table cell shows the strongest evidence; an unknown shows "?"', () => {
    expect(strongest({ value: 'x', evidence: [{ level: 'report', ref: 'r', checked: '2026-11-19' }, { level: 'src', ref: 's', checked: '2026-11-19' }] })).toBe('src');
    const md = renderCompatibility([withLive(byId('codex'))]);
    expect(md).toMatch(/\| Codex \| supported \| plugin \(live\) \| works \(live\) \| G1 \(live\) \| refused \(live\) \|/);
    expect(md).toContain('Supported: **1** of 1.');
    expect(renderCompatibility([byId('amp')])).toMatch(/\| Amp \| untested \| config \(doc\) \| \? \| \? \| \? \|/);
  });

  it('escapes table separators and line breaks in cells', () => {
    const c = { ...byId('zed'), config: { value: 'a | b\nc', evidence: byId('zed').config.evidence } };
    expect(renderCompatibility([c])).toContain('| Zed | a \\| b c (doc) |');
  });

  it('never points the public doc at local-only files', () => {
    const md = renderCompatibility();
    expect(md).not.toMatch(/(^|[\s(`])\.dev\/|CLAUDE\.local|PROFILE\.md|PLAN\.md/m);
  });
});
