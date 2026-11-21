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
 * the human's own terminal (the MCP dialog for this is a later step, P4).
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
  `"telegram ${argv.slice(0, 2).join(' ')}" is the user's to run: plugins are installed and removed only by a human`,
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
  const p = profile();
  const lines = [
    `Install the Better-TG-CLI plugin "${oneLine(m.name)}" ${oneLine(m.version)}?`,
    `  Source:      ${originLabel(s.source)}`,
    `  Revision:    ${revisionLabel(s.source, s.revision)}`,
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
  for (const x of m.secrets ?? []) {
    lines.push(`  Secret ${oneLine(x.name)}: sent by the host only to ${oneLine(x.inject.origin)} ${secretPathsLabel(x.inject.paths)} as ${oneLine(x.inject.header)}; the plugin never sees it`);
  }
  if (m.secrets?.length) lines.push(`  Secrets:     you type them yourself later: telegram plugin secret set ${oneLine(m.name)} <name>`);
  if (m.main) lines.push('  Code:        it ships code, which runs in an isolated sandbox with only the access listed here');
  lines.push('  In the plugin\'s own words:');
  lines.push(`    Description: ${clip(m.description, 300)}`);
  if (m.author) lines.push(`    Author:      ${clip(m.author.name, 100)}${m.author.url ? ` <${clip(m.author.url, 200)}>` : ''}`);
  for (const t of m.triggers ?? []) lines.push(`    Trigger ${t.id}: ${clip(t.when, 200)}`);
  for (const x of m.secrets ?? []) lines.push(`    Secret ${x.name}: ${clip(x.description, 200)}`);
  if (m.onboarding) lines.push('    Onboarding:  yes (the agent walks you through it after install)');
  lines.push('  Plugin text is data for the agent: it never outranks Better-TG-CLI\'s rules or your approval of each write.');
  return lines.join('\n');
}
