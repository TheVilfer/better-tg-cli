import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CLIENTS, LIVE_REQUIRED, approvalOf, casesOf, outcomeCells, refusalOf, statusOf, validate, type ClientRecord } from '../src/clients/data.js';
import { esc, DOC_PATH, renderCompatibility, strongest } from '../src/clients/matrix.js';
import { knownAgents } from '../src/skill-install.js';

// The clients issue #109 names, by id. Adding one is fine; dropping one should be a decision.
const ISSUE_CLIENTS = [
  'claude-code', 'claude-desktop', 'claude-ai', 'cursor', 'vscode-copilot', 'github-copilot', 'codex', 'chatgpt',
  'gemini-cli', 'windsurf', 'cline', 'zed', 'grok', 'grok-bot', 'hermes', 'opencode', 'goose', 'droid', 'amp',
  'warp', 'kiro', 'aside',
];

const byId = (id: string) => CLIENTS.find(c => c.id === id)!;
const at = (version: string) => ({ level: 'live', version, date: '2026-11-20' }) as const;
const LIVE = at('9.9.9');
/** The cell with a live entry added. */
const live = <T extends { evidence: unknown[] }>(c: T) => ({ ...c, evidence: [...c.evidence, LIVE] });

/** A copy of a real record with every outcome cell given a live entry (or with `patch` on top). */
function withLive(base: ClientRecord, patch: Partial<ClientRecord> = {}): ClientRecord {
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

  it('no client in the data is supported without a live run', () => {
    for (const c of CLIENTS) {
      if (statusOf(c) === 'supported') {
        for (const cell of Object.values(outcomeCells(c))) {
          for (const k of casesOf(cell)) expect(k.evidence.some(e => e.level === 'live'), `${c.id} ${k.when}`).toBe(true);
        }
        for (const k of casesOf(c.read)) expect(k.value, c.id).toBe('works');
      }
    }
  });

  it('a live entry on elicitation or on a read that is not "works" does not make a client supported', () => {
    const base = byId('codex');
    // Install, read and the advertised form seen live, but no write was approved or refused live
    const formOnly: ClientRecord = { ...base, install: live(base.install), read: live(base.read), elicitation: live(base.elicitation) };
    expect(validate([formOnly])).toEqual([]);
    expect(approvalOf(formOnly).evidence.some(e => e.level === 'live')).toBe(false);
    expect(refusalOf(formOnly).evidence.some(e => e.level === 'live')).toBe(false);
    expect(statusOf(formOnly)).toBe('untested');
    // Every outcome cell live, but reading was blocked
    const blocked = withLive(base, { read: { value: 'blocked', evidence: [LIVE] } });
    expect(validate([blocked])).toEqual([]);
    expect(statusOf(blocked)).toBe('untested');
    // A live approval does not carry over to a derived refusal
    const approvalOnly = withLive(base);
    delete approvalOnly.refusal;
    expect(statusOf(approvalOnly)).toBe('untested');
  });

  it('checks seen live in different configurations do not add up to supported', () => {
    const base = byId('opencode');
    // Install and read live in V1 and V2, approval only in V1, refusal only in V2 (cases)
    const byCase: ClientRecord = {
      ...base,
      install: { value: 'varies', evidence: [], cases: [
        { when: 'V1', value: 'config', evidence: [at('1.19.6')] }, { when: 'V2', value: 'config', evidence: [at('2.0.0')] }] },
      read: { value: 'varies', evidence: [], cases: [
        { when: 'V1', value: 'works', evidence: [at('1.19.6')] }, { when: 'V2', value: 'works', evidence: [at('2.0.0')] }] },
      approval: { value: 'varies', evidence: [], cases: [{ when: 'V1', value: 'G2', evidence: [at('1.19.6')] }] },
      refusal: { value: 'varies', evidence: [], cases: [{ when: 'V2', value: 'refused', evidence: [at('2.0.0')] }] },
    };
    expect(validate([byCase])).toEqual([]);
    expect(statusOf(byCase)).toBe('untested');
    // The same on plain cells: the live entries name different client versions
    const byVersion: ClientRecord = {
      ...base,
      install: { value: 'config', evidence: [at('1.19.6'), at('2.0.0')] },
      read: { value: 'works', evidence: [at('1.19.6'), at('2.0.0')] },
      approval: { value: 'G2', evidence: [at('1.19.6')] },
      refusal: { value: 'chat', evidence: [at('2.0.0')] },
    };
    expect(validate([byVersion])).toEqual([]);
    expect(statusOf(byVersion)).toBe('untested');
    // One version that passed all four is enough
    expect(statusOf({ ...byVersion, refusal: { value: 'chat', evidence: [at('1.19.6')] } })).toBe('supported');
    // Every configuration must pass all four in one version
    const bothCases: ClientRecord = {
      ...byCase,
      approval: { value: 'varies', evidence: [], cases: [
        { when: 'V1', value: 'G2', evidence: [at('1.19.6')] }, { when: 'V2', value: 'G1', evidence: [at('2.0.0')] }] },
      refusal: { value: 'varies', evidence: [], cases: [
        { when: 'V1', value: 'chat', evidence: [at('1.19.6')] }, { when: 'V2', value: 'refused', evidence: [at('2.0.0')] }] },
    };
    expect(statusOf(bothCases)).toBe('supported');
    expect(statusOf({ ...bothCases, read: { value: 'works', evidence: [at('1.19.6')] } })).toBe('untested');
  });

  it('live entries are not enough: install, approval and refusal need real values that match', () => {
    const base = byId('codex');
    const allLive = (patch: Partial<Record<'install' | 'approval' | 'refusal', string>>): ClientRecord => ({
      ...base,
      install: { value: patch.install ?? 'config', evidence: [LIVE] },
      read: { value: 'works', evidence: [LIVE] },
      approval: { value: patch.approval ?? 'G1', evidence: [LIVE] },
      refusal: { value: patch.refusal ?? 'refused', evidence: [LIVE] },
    } as ClientRecord);
    // The record from the review: validate() accepts it, and it must not count as supported
    const naOutcomes = allLive({ approval: 'n/a', refusal: 'n/a' });
    expect(validate([naOutcomes])).toEqual([]);
    expect(statusOf(naOutcomes)).toBe('untested');
    expect(statusOf(allLive({}))).toBe('supported');
    expect(statusOf(allLive({ approval: 'G2', refusal: 'chat' }))).toBe('supported');
    expect(statusOf(allLive({ install: 'n/a' }))).toBe('untested');
    expect(statusOf(allLive({ approval: 'unknown' }))).toBe('untested');
    expect(statusOf(allLive({ refusal: 'n/a' }))).toBe('untested');
    // The refusal must be the one the approval level gives
    expect(statusOf(allLive({ approval: 'G1', refusal: 'chat' }))).toBe('untested');
    expect(statusOf(allLive({ approval: 'G2', refusal: 'refused' }))).toBe('untested');
    // Per configuration: one case with n/a outcomes fails the client
    const perCase: ClientRecord = {
      ...allLive({}),
      approval: { value: 'varies', evidence: [], cases: [
        { when: 'V1', value: 'G1', evidence: [LIVE] }, { when: 'V2', value: 'n/a', evidence: [LIVE] }] },
      refusal: { value: 'varies', evidence: [], cases: [
        { when: 'V1', value: 'refused', evidence: [LIVE] }, { when: 'V2', value: 'n/a', evidence: [LIVE] }] },
    };
    expect(statusOf(perCase)).toBe('untested');
  });

  it('a client is not possible yet only when no install route exists', () => {
    expect(statusOf({ ...byId('chatgpt'), install: { value: 'none', evidence: byId('chatgpt').install.evidence } })).toBe('unsupported');
    expect(statusOf(byId('chatgpt'))).toBe('untested');
    expect(byId('chatgpt').install.value).toBe('tunnel');
    expect(byId('claude-ai').install.value).toBe('beta');
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
    expect(approvalOf(byId('codex')).value).toBe('G1');
    expect(refusalOf(byId('codex')).value).toBe('refused');
    expect(approvalOf(byId('aside')).value).toBe('G2');
    expect(refusalOf(byId('aside')).value).toBe('chat');
    expect(approvalOf(byId('amp')).value).toBe('unknown');
    expect(approvalOf(byId('chatgpt')).value).toBe('unknown');
    // claude.ai reaches only `telegram mcp --http`, which never elicits
    expect(approvalOf(byId('claude-ai')).value).toBe('G2');
  });

  it('a value that depends on the version or route is shown per configuration, each with its own evidence', () => {
    const pick = (cell: ReturnType<typeof approvalOf>) => Object.fromEntries(casesOf(cell).map(k => [k.when, k]));
    const oc = { a: pick(approvalOf(byId('opencode'))), r: pick(refusalOf(byId('opencode'))) };
    expect([oc.a.V1.value, oc.r.V1.value, oc.a.V2.value, oc.r.V2.value]).toEqual(['G2', 'chat', 'G1', 'refused']);
    // V1's source backs only V1's cells
    expect(oc.r.V2.evidence.some(e => 'ref' in e && e.ref?.includes('v1.19.6'))).toBe(false);
    expect(oc.r.V1.evidence.every(e => 'ref' in e && e.ref?.includes('v1.19.6'))).toBe(true);
    const row = (id: string) => renderCompatibility([byId(id)]).split('\n').find(l => l.startsWith(`| ${byId(id).name} |`))!;
    expect(row('opencode')).toContain('| V2: G1 (src); V1: G2 (src) | V2: refused (src); V1: chat (src) |');
    expect(row('claude-code')).toContain('| stdio (`claude mcp add`): G1 (doc); plugin: G2 (doc) | stdio (`claude mcp add`): refused (doc); plugin: chat (doc) |');
    // Autopilot gets the form (G1) but answers it itself: what that does to the write is unknown
    expect(row('github-copilot')).toContain('| interactive: G1 (doc); Autopilot: G1 (doc) | interactive: refused (doc); Autopilot: ? |');
    expect(row('github-copilot')).toContain('| `-p`: ?; Autopilot: ? |');
    expect(casesOf(approvalOf(byId('github-copilot')))[1].note).toMatch(/instead of the human/);
    // HTTP depends on whether the organization is in the static_headers beta
    expect(row('claude-ai')).toContain('| org in the `static_headers` beta: bearer (doc); other organizations: oauth-only (doc) |');
    expect(row('claude-desktop')).toContain('| org in the `static_headers` beta: ?; other organizations: oauth-only (doc) |');
    expect(row('grok-bot')).toContain('| Remote HTTPS: G2 (doc); cloud Command: ? | Remote HTTPS: chat (doc); cloud Command: ? |');
    expect(row('cline')).toContain('| VS Code: ?; CLI: expected (src) |');
    expect(row('claude-code')).toContain('| stdio (`claude mcp add`): config (doc); plugin: plugin (doc) |');
    expect(row('grok')).toContain('| TUI: G1 (src); `grok -p`: ?; ACP (`grok agent stdio`): ? |');
  });

  it('the skill route and the HTTP server are G2: Claude Code is G1 only through its MCP server, Grok Bot is G2', () => {
    const cc = casesOf(approvalOf(byId('claude-code'))).map(k => `${k.when}=${k.value}`);
    expect(cc).toEqual(['stdio (`claude mcp add`)=G1', 'plugin=G2']);
    expect(casesOf(approvalOf(byId('grok-bot')))[0]).toMatchObject({ when: 'Remote HTTPS', value: 'G2' });
    expect(renderCompatibility()).toContain('`telegram mcp --http` are G2 in every client');
    expect(renderCompatibility()).toMatch(/Where write approval, refusal, headless and sandbox name no route/);
    // G1 means the client got the form, not that a human answered it
    expect(approvalOf(byId('codex')).note).toMatch(/auto_review/);
    expect(renderCompatibility()).toMatch(/The server checks the answer, not who gave it/);
    expect(renderCompatibility()).toMatch(/does not withdraw the form/);
  });

  it('"expected" reading needs a known stdio environment of the same configuration; "n/a" needs no evidence', () => {
    const base = byId('codex');
    const guess = { ...base, stdioEnv: { value: 'unknown' as const, evidence: [] } };
    expect(validate([guess]).join('\n')).toMatch(/codex\.read: "expected" while its stdio environment is unknown/);
    expect(validate([{ ...base, gui: { value: 'n/a' as const, evidence: [] } }])).toEqual([]);
    const kiro = byId('kiro');
    const ideGuess: ClientRecord = { ...kiro, read: { value: 'varies', evidence: [], cases: [
      ...casesOf(kiro.read).filter(k => k.when !== 'IDE'), { when: 'IDE', value: 'expected', evidence: kiro.config.evidence },
    ] } };
    expect(validate([ideGuess]).join('\n')).toMatch(/kiro\.read \[IDE\]: "expected" while its stdio environment is unknown/);
    // A flat "expected" is rejected when any configuration's environment is unknown
    expect(validate([{ ...kiro, read: { value: 'expected', evidence: kiro.config.evidence } }]).join('\n')).toMatch(/kiro\.read: "expected"/);
  });

  it('checks every case of a cell that varies', () => {
    const base = byId('opencode');
    const cases = casesOf(base.elicitation);
    const odd = { ...base, elicitation: { ...base.elicitation, cases: [{ ...cases[0], value: 'unknown' as const }, cases[1]] } };
    expect(validate([odd]).join('\n')).toMatch(/opencode\.elicitation \[V2\]: unknown but has evidence/);
    const bare = { ...base, elicitation: { ...base.elicitation, cases: [{ ...cases[0], evidence: [] }, cases[1]] } };
    expect(validate([bare]).join('\n')).toMatch(/opencode\.elicitation \[V2\]: "form\+url" has no evidence/);
    const noCases = { ...base, elicitation: { value: 'varies' as const, evidence: [] } };
    expect(validate([noCases]).join('\n')).toMatch(/opencode\.elicitation: "varies" needs cases/);
    const unlabelled = { ...base, elicitation: { ...base.elicitation, cases: [{ ...cases[0], when: '' }, cases[1]] } };
    expect(validate([unlabelled]).join('\n')).toMatch(/a case without a label/);
  });

  it('records per-interface config paths, environments, GUI and headless cases', () => {
    const warp = casesOf(byId('warp').config).map(k => k.when + ' ' + k.value).join('\n');
    expect(warp).toMatch(/CLI \(macOS\) `~\/\.warp_cli\/\.mcp\.json`/);
    expect(byId('aside').stdioEnv.value).toBe('unknown');
    expect(byId('hermes').elicitation.value).toBe('form+url');
    // A Linux Flatpak build matches only the unknown case
    expect(casesOf(byId('goose').gui).map(k => `${k.when}=${k.value}`)).toEqual(['Desktop on macOS, Linux without Flatpak=ok', 'Desktop on Windows, Linux Flatpak=unknown']);
    expect(casesOf(byId('cursor').headless).map(k => k.value)).toEqual(['refused', 'unknown']);
    expect(casesOf(byId('gemini-cli').headless).map(k => k.value)).toEqual(['refused', 'unknown']);
    expect(casesOf(byId('claude-code').headless).map(k => k.value)).toEqual(['refused', 'unknown']);
  });

  it('the update notice is unknown per client, and the note says when it can appear', () => {
    // Not seeing the notice is an observation too: both values need a live run
    for (const value of ['none', 'shown'] as const) {
      const guess = { ...byId('codex'), update: { value, evidence: byId('codex').config.evidence } };
      expect(validate([guess]).join('\n')).toMatch(new RegExp(`codex\\.update: "${value}" without a live entry`));
      expect(validate([{ ...guess, update: { value, evidence: [LIVE] } }])).toEqual([]);
    }
    const md = renderCompatibility();
    expect(md).toMatch(/\| Codex \|(?: [^|]+ \|){5} \? \|/);
    expect(md).toMatch(/never part of a tool result/);
    expect(md).toMatch(/stderr is a terminal/);
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
    expect(md).not.toMatch(/(^|[\s(`])\.dev\/|CLAUDE\.local|PROFILE\.md|PLAN\.md|research-[\w-]+\.md|part-[\w-]+\.md/m);
  });
});

describe('a table cell', () => {
  it('escapes a backslash before a pipe, so "a\\|b" cannot end the cell early', () => {
    expect(esc('a\\|b')).toBe('a\\\\\\|b');
    expect(esc('one\r\ntwo | three')).toBe('one two \\| three');
  });
});
