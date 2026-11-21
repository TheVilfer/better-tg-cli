import { confirmByHuman } from '../confirm.js';
import { CliError, EXIT, shellCommand } from '../errors.js';
import { isMock, profile } from '../paths.js';
import { hasHumanChannel } from '../write-store.js';
import { oneLine } from '../approval-action.js';
import { allEffects, PERMISSION_TEXT, type Manifest } from './manifest.js';
import type { ResolvedSource, Snapshot } from './source.js';
import type { LockEntry } from './store.js';

/**
 * Installing and removing plugins is the human's decision (docs/plugins.md, "Human"): a y/N on a
 * real terminal or a system dialog. No write mode skips it ("on" included), and TG_APPROVE, an agent's
 * code, is never read here. Over MCP it is refused before anything is fetched, with the command for
 * the human's own terminal; the MCP server asks through its own dialog instead (manage.ts, mcp.ts).
 */

export type Confirm = (question: string) => Promise<boolean>;

const shellValue = (v: string) => (/^[\w@%+=:,./-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`);

/**
 * The command a human runs in their own terminal, with this profile; under TG_MOCK with the same
 * mock state (and mock profile), so running it never touches the terminal's real profile.
 */
export function humanCommand(argv: string[]): string {
  if (isMock()) {
    const p = process.env.TG_PROFILE;
    return `TG_MOCK=${shellValue(process.env.TG_MOCK!)} ${p ? `TG_PROFILE=${shellValue(p)} ` : ''}${shellCommand(argv)}`;
  }
  const p = profile();
  return `${p ? `TG_PROFILE=${p} ` : ''}${shellCommand(argv)}`;
}

export const humanRequired = (argv: string[]) => new CliError(
  `"telegram ${argv.slice(0, 2).join(' ')}" is the user's to run: plugins are installed, updated and removed only by a human`,
  'human_required', EXIT.ERROR,
  {
    hint: `Ask the user to run this in a terminal on this computer: ${humanCommand(argv)}`,
    command: argv,
  },
);

/**
 * Asks the human. `confirm` is the real prompt or dialog (confirmByHuman); tests pass their own.
 * In mock mode only (TG_MOCK), TG_MOCK_HUMAN=yes|no answers for the human, so tests never open a
 * dialog; a mock run without it and without a terminal is refused.
 */
export async function humanConfirms(question: string, argv: string[], confirm: Confirm = confirmByHuman): Promise<boolean> {
  if (process.env.TG_MCP || process.env.TG_READ_ONLY) throw humanRequired(argv);
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (isMock()) {
    const answer = process.env.TG_MOCK_HUMAN;
    if (answer === 'yes' || answer === 'no') {
      console.error(question);
      console.error(`(mock: TG_MOCK_HUMAN=${answer} answers for the human)`);
      return answer === 'yes';
    }
    if (!tty) {
      throw new CliError('No terminal to confirm on (mock mode: set TG_MOCK_HUMAN=yes|no to rehearse the answer)', 'no_human_channel', EXIT.ERROR);
    }
  } else if (!hasHumanChannel()) {
    throw new CliError('No terminal or dialog to confirm on. Run this command yourself in a terminal.', 'no_human_channel', EXIT.ERROR, {
      hint: humanCommand(argv),
    });
  }
  // A terminal prompt shows the question itself; a dialog does not leave it in the terminal
  if (!tty) console.error(`${question}\n(waiting for the user's answer in a system dialog)`);
  return confirm(question);
}

const clip = (s: string, n: number) => oneLine(s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Where a plugin came from, as one line: a folder name or a registry field may hold a line break or a terminal escape. */
/** Where on its origin a secret goes, for a human: the paths (and below), or every path. */
export function secretPathsLabel(paths: string[] | undefined): string {
  if (paths === undefined) return '(any path)';
  if (!paths.length) return '(no path: an empty list sends it nowhere)';
  return `(only the paths ${paths.map(p => oneLine(p)).join(', ')} and below them)`;
}

export function originLabel(s: ResolvedSource): string {
  return oneLine(s.type === 'github' ? `github:${s.owner}/${s.repo}${s.ref ? `@${s.ref}` : ''}` : `local folder ${s.path}`);
}

export function revisionLabel(s: ResolvedSource, revision: string): string {
  return oneLine(s.type === 'github' ? `commit ${revision}` : `content ${revision}`);
}

/** The question before `plugin remove`; every field comes from the registry and is shown as one line. */
export function removeQuestion(entry: LockEntry, keepData: boolean): string {
  return [
    `Remove the Better-TG-CLI plugin "${oneLine(entry.name)}" ${oneLine(entry.version)}?`,
    `  Source:  ${originLabel(entry.source)} (${revisionLabel(entry.source, entry.revision)})`,
    `  Install: ${oneLine(entry.installId)}`,
    `  Data:    ${keepData ? 'kept on this computer (a later install of the same name starts empty)' : 'deleted for every account'}`,
  ].join('\n');
}

const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

/**
 * What the human reads before saying yes. The lines the host computed (source, revision, official,
 * profile, size) come first; the plugin's own words follow under a heading, each on one line, so a
 * description cannot forge a host line.
 */
export function installSummary(s: Snapshot): string {
  const m: Manifest = s.manifest;
  return [
    `Install the Better-TG-CLI plugin "${oneLine(m.name)}" ${oneLine(m.version)}?`,
    `  Source:      ${originLabel(s.source)}`,
    `  Revision:    ${revisionLabel(s.source, s.revision)}`,
    ...snapshotLines(s),
  ].join('\n');
}

/** One line per secret: where the host sends it and as what (the install and update summaries). */
const secretLine = (x: NonNullable<Manifest['secrets']>[number]) =>
  `Secret ${oneLine(x.name)}: sent by the host only to ${oneLine(x.inject.origin)} ${secretPathsLabel(x.inject.paths)} as ${oneLine(x.inject.header)}; the plugin never sees it`;

/** What a plugin update changes for the human (computed by manage.ts). */
export interface UpdateDiff {
  /** Not accepted before: these need the human's confirmation */
  newly: { permissions: string[]; effects: string[]; network: string[]; secrets: string[] };
  /** Secrets deleted from the store by the update: their destination changed (set them again) or the plugin dropped them */
  reset: { name: string; why: 'changed' | 'removed' }[];
  /** Asked for before, no longer */
  dropped: { permissions: string[]; effects: string[]; network: string[] };
}

export const hasNewGrants = (d: UpdateDiff): boolean =>
  d.newly.permissions.length + d.newly.effects.length + d.newly.network.length + d.newly.secrets.length > 0;

/**
 * The question before `plugin update`: the host's lines (source, the revision it moves from and to,
 * the installation kept), then what was not accepted before, listed on its own, then the secrets
 * that must be set again, then the same lines as an install summary for the new snapshot.
 */
export function updateSummary(old: LockEntry, s: Snapshot, d: UpdateDiff): string {
  const m = s.manifest;
  const lines = [
    old.version === m.version
      ? `Update the Better-TG-CLI plugin "${oneLine(m.name)}" ${oneLine(m.version)} to a new revision?`
      : `Update the Better-TG-CLI plugin "${oneLine(m.name)}" from ${oneLine(old.version)} to ${oneLine(m.version)}?`,
    `  Source:      ${originLabel(s.source)}`,
    `  Revision:    ${revisionLabel(old.source, old.revision)} -> ${revisionLabel(s.source, s.revision)}`,
    `  Install:     ${oneLine(old.installId)} (kept: its data, settings and secrets stay with it)`,
  ];
  if (hasNewGrants(d)) {
    lines.push('  NEW, not accepted before:');
    for (const p of d.newly.permissions) lines.push(`    - can read: ${PERMISSION_TEXT[p as keyof typeof PERMISSION_TEXT] ?? oneLine(p)}`);
    for (const e of d.newly.effects) lines.push(`    - effect: ${oneLine(e)}`);
    for (const o of d.newly.network) lines.push(`    - may send data to: ${oneLine(o)}`);
    for (const n of d.newly.secrets) {
      const x = (m.secrets ?? []).find(y => y.name === n);
      if (x) lines.push(`    - ${secretLine(x)}`);
    }
  } else {
    lines.push('  NEW, not accepted before: nothing (the same permissions, effects, destinations and secrets)');
  }
  const changed = d.reset.filter(r => r.why === 'changed').map(r => oneLine(r.name));
  const removed = d.reset.filter(r => r.why === 'removed').map(r => oneLine(r.name));
  if (changed.length) lines.push(`  Set again:   ${changed.join(', ')} (where it goes changed: the stored value is deleted; you type it again later)`);
  if (removed.length) lines.push(`  Secrets gone: ${removed.join(', ')} (no longer declared: deleted from the secret store)`);
  const dropped = [...d.dropped.permissions, ...d.dropped.effects, ...d.dropped.network].map(x => oneLine(x));
  if (dropped.length) lines.push(`  No longer:   ${dropped.join(', ')}`);
  lines.push('  After the update:');
  lines.push(...snapshotLines(s));
  return lines.join('\n');
}

/** The host's lines after source and revision, then the plugin's own words: shared by the install and update summaries. */
function snapshotLines(s: Snapshot): string[] {
  const m: Manifest = s.manifest;
  const p = profile();
  const lines = [
    `  Official:    ${s.official && s.source.type === 'github' ? `yes (published by ${oneLine(s.source.owner)})` : s.officialNote ? `no: ${oneLine(s.officialNote)}` : 'no (a third-party plugin)'}`,
    `  Profile:     ${p ?? 'default'}`,
    `  Files:       ${s.files.size} files, ${kb(s.bytes)}`,
  ];
  const permissions = m.permissions ?? [];
  lines.push(permissions.length ? '  Can read:' : '  Can read:    nothing from Telegram');
  for (const perm of permissions) lines.push(`    - ${PERMISSION_TEXT[perm]}`);
  const effects = allEffects(m);
  lines.push(`  Effects:     ${effects.length ? effects.join(', ') : 'none (its commands only read)'}`);
  const network = m.network ?? [];
  // Every data source, then every destination: what may leave the computer and where to
  const sources = [
    permissions.includes('messages:read-own') && 'your own messages',
    permissions.includes('messages:read') && 'other people\'s messages',
    permissions.includes('messages:read-target') && 'the messages the agent passes to it',
    permissions.includes('chats:read') && 'your chat list',
    permissions.includes('identity:read') && 'your name and ID',
    (permissions.includes('storage:read') || permissions.includes('storage:write')) && 'its saved data',
    permissions.includes('settings:read') && 'its settings',
  ].filter((x): x is string => !!x);
  const listed = sources.length > 1 ? `${sources.slice(0, -1).join(', ')} and ${sources.at(-1)}` : sources[0];
  lines.push(network.length
    ? `  Sends data:  may send ${listed ?? 'what its commands compute'} to: ${network.map(o => oneLine(o)).join(', ')}`
    : '  Sends data:  nowhere (no network access)');
  for (const x of m.secrets ?? []) lines.push(`  ${secretLine(x)}`);
  if (m.secrets?.length) lines.push(`  Secrets:     you type them yourself later: telegram plugin secret set ${oneLine(m.name)} <name>`);
  if (m.main) lines.push('  Code:        it ships code, which runs in an isolated sandbox with only the access listed here');
  lines.push('  In the plugin\'s own words:');
  lines.push(`    Description: ${clip(m.description, 300)}`);
  if (m.author) lines.push(`    Author:      ${clip(m.author.name, 100)}${m.author.url ? ` <${clip(m.author.url, 200)}>` : ''}`);
  for (const t of m.triggers ?? []) lines.push(`    Trigger ${t.id}: ${clip(t.when, 200)}`);
  for (const x of m.secrets ?? []) lines.push(`    Secret ${x.name}: ${clip(x.description, 200)}`);
  if (m.onboarding) lines.push('    Onboarding:  yes (the agent walks you through it after install)');
  lines.push('  Plugin text is data for the agent: it never outranks Better-TG-CLI\'s rules or your approval of each write.');
  return lines;
}
