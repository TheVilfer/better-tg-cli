/**
 * Renders docs/compatibility.md from src/clients/data.ts. Deterministic: no clock, the order of
 * CLIENTS, LF line endings. Written by `bun scripts/compat-matrix.ts`; checked by
 * test/compat-matrix.test.ts.
 */
import { CLIENTS, ROUTE_NOTE, UPDATE_NOTICE, approvalOf, casesOf, refusalOf, statusOf, type Case, type Cell, type ClientRecord, type Evidence, type EvidenceLevel, type Status } from './data.js';

export const DOC_PATH = 'docs/compatibility.md';

const RANK: Record<EvidenceLevel, number> = { live: 3, src: 2, doc: 1, report: 0 };

/** The strongest evidence a cell has, or undefined for an unknown cell. */
export function strongest(cell: { evidence: Evidence[] }): EvidenceLevel | undefined {
  let best: EvidenceLevel | undefined;
  for (const e of cell.evidence) if (best === undefined || RANK[e.level] > RANK[best]) best = e.level;
  return best;
}

/** A Markdown table cell: one line, the backslash escaped before the pipe it would otherwise undo. */
export const esc = (s: string) => s.replace(/\r?\n/g, ' ').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');

function shortCase(k: Case): string {
  if (k.value === 'unknown') return '?';
  const level = strongest(k);
  return level ? `${k.value} (${level})` : k.value;
}

/**
 * A table cell: the value and the strongest level of its evidence, or "?" when unknown. A cell
 * that varies lists each configuration: `V1: G2 (src); V2: G1 (src)`.
 */
function short(cell: Cell): string {
  return esc(casesOf(cell).map(k => (k.when ? `${k.when}: ` : '') + shortCase(k)).join('; '));
}

function evidenceText(e: Evidence): string {
  if (e.level === 'live') return `live ${e.version} ${e.date}${e.ref ? ` (${e.ref})` : ''}`;
  const where = /^https?:\/\//.test(e.ref) ? `[${e.ref.replace(/^https?:\/\//, '')}](${e.ref})` : e.ref;
  return `${e.level}: ${where}${e.version ? `, ${e.version}` : ''}`;
}

function detailLine(prefix: string, indent: string, k: { value: string; note?: string; evidence: Evidence[] }): string {
  const value = k.value.includes('`') ? k.value : `\`${k.value}\``;
  const parts = [k.value === 'unknown' ? 'unknown' : value];
  if (k.note) parts.push(k.note);
  const line = `${prefix}${parts.join('. ')}`;
  const ev = k.evidence.map(evidenceText);
  return ev.length ? `${line}  \n${indent}  ${esc(ev.join('; '))}` : line;
}

function detail(label: string, cell: Cell): string {
  if (!cell.cases) return detailLine(`- **${label}:** `, '', cell);
  const head = `- **${label}:** depends on the configuration${cell.note ? `. ${cell.note}` : ''}`;
  return [head, ...cell.cases.map(k => detailLine(`  - ${k.when}: `, '  ', k))].join('\n');
}

const STATUS_TEXT = {
  supported: 'supported',
  untested: 'untested',
  unsupported: 'not possible yet',
} as const;

function clientSection(c: ClientRecord): string[] {
  const head = `### ${c.name} (\`${c.id}\`)`;
  const meta = [`Status: **${STATUS_TEXT[statusOf(c)]}**`, `surfaces: ${c.surfaces.join(', ')}`];
  if (c.versionSeen) meta.push(`version seen: ${c.versionSeen}`);
  return [
    head,
    '',
    meta.join('. ') + '.',
    '',
    detail('MCP config', c.config),
    detail('Approval form (elicitation)', c.elicitation),
    detail('stdio environment', c.stdioEnv),
    detail('Tool-call timeout', c.toolTimeout),
    detail('Default tool approval', c.approvalDefault),
    detail('Install', c.install),
    detail('Read', c.read),
    detail('Write approval', approvalOf(c)),
    detail('Refusal', refusalOf(c)),
    c.update ? detail('Update notice', c.update) : '- **Update notice:** unknown, see the note under the table.',
    detail('GUI launch', c.gui),
    detail('Headless or unattended', c.headless),
    detail('Sandbox', c.sandbox),
    detail('HTTP (`telegram mcp --http`)', c.http),
    '',
  ];
}

export function renderCompatibility(clients: ClientRecord[] = CLIENTS): string {
  const count = (s: Status) => clients.filter(c => statusOf(c) === s).length;
  const out: string[] = [
    '# Agent compatibility',
    '',
    '<!-- Generated from src/clients/data.ts by scripts/compat-matrix.ts. Do not edit by hand; run `bun scripts/compat-matrix.ts`. -->',
    '',
    'How Better-TG-CLI behaves inside each agent client, and how we know it. A client is',
    '**supported** only after install, reading, write approval and refusal were all seen working',
    'with one named client version on a named date (`live`), in every configuration the client',
    'lists. Everything else comes from the client\'s docs or source and says what we expect, not',
    'what we saw.',
    '',
    `Supported: **${count('supported')}** of ${clients.length}. Untested: ${count('untested')}. Not possible yet: ${count('unsupported')}.`,
    '',
    '**Evidence**, strongest first. A table cell shows the strongest one it has; the sections below list all of them. Where the answer depends on the interface, version or mode, a cell lists each one: `V1: G2 (src); V2: G1 (src)`.',
    '',
    '- `live`: our server was run in that client (client version and date).',
    '- `src`: the client\'s source code or binary was read, but not run.',
    '- `doc`: the client\'s official documentation.',
    '- `report`: a public issue or forum thread, not an official doc.',
    '- `?`: nobody could confirm it.',
    '',
    '## Better-TG-CLI in each client',
    '',
    '| Client | Status | Install | Read | Write approval² | Refusal² | Update notice¹ | GUI | Headless² | Sandbox² | HTTP |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const c of clients) {
    out.push('| ' + [
      esc(c.name), STATUS_TEXT[statusOf(c)], short(c.install), short(c.read), short(approvalOf(c)), short(refusalOf(c)),
      c.update ? short(c.update) : '?', short(c.gui), short(c.headless), short(c.sandbox), short(c.http),
    ].join(' | ') + ' |');
  }
  out.push(
    '',
    `¹ ${UPDATE_NOTICE}`,
    '',
    `² ${ROUTE_NOTE}`,
    '',
    '- **Install:** `plugin`, `extension`, `catalog` (a plugin directory or catalog), `mcpb` (a Claude Desktop extension), `config` (an entry in the client\'s MCP config), `ui` (added in the client\'s settings), `tunnel` (through the vendor\'s tunnel to a server on the user\'s machine), `beta` (only in a limited beta), `none` (no way today).',
    '- **Read:** `works` (seen live), `expected` (nothing known stands in the way), `blocked`.',
    '- **Write approval** in write mode `ask`: `G1`, the client gets our approval form (MCP elicitation) and the model never sees a code. The server checks the answer, not who gave it: by default the human answers, but in some modes a hook, a reviewer agent or an autopilot may answer instead (named in the client\'s section). `G2`, the model gets a one-time code and must ask the human in chat, which guards against mistakes but not against a model that uses the code itself.',
    '- **Refusal:** `refused`, a decline or cancel answer to our form, or no answer within the server\'s own 10-minute timer, refuses the write and nothing is sent, with no fallback to a code. Cancelling the tool call itself (a client timeout, `notifications/cancelled`) does not withdraw the form: the server keeps waiting for its answer, and an approval that still arrives runs the write. `chat`, the human says no in chat and nothing is sent without the code.',
    '- **GUI:** `ok` (gets the login-shell PATH), `path` (may not: register `telegram` by its absolute path). The commands on this page write `telegram`; where the client may not find it, or another copy comes first on PATH, use the absolute path instead: `data.path` from `install.sh`, or `command -v telegram`.',
    '- **Headless:** what a write does in an unattended run (`-p`, `exec`, cron, Autopilot): `refused` (the approval is refused), `aborts` (the whole run stops).',
    '- **Sandbox:** `outside` (our server runs outside the client\'s sandbox), `opt-in` (an optional sandbox can wrap it and may close the Keychain or the network), `cloud` (the client runs in the vendor\'s cloud).',
    '- **HTTP:** `bearer` (can send the static `Authorization: Bearer` token of `telegram mcp --http`), `oauth-only` (needs OAuth, which the HTTP server does not offer yet).',
    '',
    '## Client facts',
    '',
    '| Client | MCP config | Approval form | stdio env | Tool timeout | Default approval |',
    '|---|---|---|---|---|---|',
  );
  for (const c of clients) {
    out.push('| ' + [esc(c.name), short(c.config), short(c.elicitation), short(c.stdioEnv), short(c.toolTimeout), short(c.approvalDefault)].join(' | ') + ' |');
  }
  out.push(
    '',
    '- **Approval form:** `form+url`, `form` or `none`, what the client advertises for MCP elicitation.',
    '- **stdio env:** `full` (the client\'s whole environment), `filtered` (all but names that look secret), `allowlist` (only a fixed set plus the configured `env`).',
    '- **Default approval:** `ask` (asks before an MCP tool runs), `allow` (runs it without asking), `hints` (decided by the tool\'s read-only/destructive annotations), `rules` (decided by the user\'s rules), `model` (a model reviews each call).',
    '',
    '## Each client',
    '',
  );
  for (const c of clients) out.push(...clientSection(c));
  return out.join('\n').replace(/\n+$/, '') + '\n';
}
