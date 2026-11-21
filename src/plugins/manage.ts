import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { auditLog } from '../audit.js';
import { CliError, EXIT, usageError } from '../errors.js';
import { isMock, profile } from '../paths.js';
import { VERSION } from '../version.js';
import { oneLine } from '../approval-action.js';
import { allEffects, type Manifest } from './manifest.js';
import { pluginSource } from './catalog.js';
import { fetchGithubSnapshot, parseSource, readLocalSnapshot, type Fetch, type Snapshot } from './source.js';
import {
  assertCanSignLater, commitInstall, commitUpdate, findEntry, own, pendingSecrets, readLock, removeInstall, settlePendingSecrets,
  tampered, verifyInstalled, type LockEntry,
} from './store.js';
import { installSummary, originLabel, removeQuestion, updateSummary, type UpdateDiff } from './human.js';
import { deletePluginSecret, getPluginSecret } from './secrets.js';

/**
 * Installing, updating and removing a plugin (docs/plugins.md §8 "The human", §9 "Update"), split in
 * two so the terminal and the MCP server run the same steps around their own way of asking:
 *   prepare  fetch and check the snapshot, compute what the human reads and a digest of it (no lock,
 *            nothing written);
 *   apply    after the human's yes, write exactly that snapshot under the lock, refusing when the
 *            registry, the folder or the prepared bytes changed meanwhile.
 * Nothing here prints or exits: the MCP server runs it in-process, where stdout is the protocol.
 */

/** Test seams for the MCP server's use (the CLI passes its own through `opts`). */
export const manageDeps: {
  fetch?: Fetch; cliVersion?: string;
  /** Whether a program is on PATH (the fallback command uses `telegram` then, else the pinned npx) */
  onPath?: (bin: string) => boolean;
  platform?: NodeJS.Platform;
} = {};

export interface PrepareOptions {
  fetch?: Fetch; cliVersion?: string;
  /** Where the human was asked, for the audit entry */
  via?: 'terminal' | 'mcp';
}

export type Prepared =
  | { op: 'install'; name: string; question: string; argv: string[]; digest: string; snapshot: Snapshot }
  | { op: 'update'; name: string; question: string; argv: string[]; digest: string; snapshot: Snapshot; old: LockEntry; oldManifest: Manifest; diff: UpdateDiff }
  | { op: 'remove'; name: string; question: string; argv: string[]; digest: string; old: LockEntry; keepData: boolean };

/** A Prepared before its digest is computed (Omit on each member of the union). */
type Draft = Prepared extends infer T ? (T extends Prepared ? Omit<T, 'digest'> : never) : never;

const REVISION_RE = /^sha256-[A-Za-z0-9+/]{43}=$/;
const COMMIT_RE = /^[0-9a-f]{40}$/;

/** `--expect`: a content hash for a folder, a commit SHA for GitHub. */
export function expectProblem(expect: string): string | undefined {
  return REVISION_RE.test(expect) || COMMIT_RE.test(expect) ? undefined
    : '--expect must be a folder\'s sha256-… revision (as `plugin validate` prints it) or a GitHub commit SHA (40 hex characters)';
}

const mismatch = (what: string, got: string, want: string, hint: string) => new CliError(
  `The ${what} is ${got}, not the expected ${want}`, 'plugin_revision_mismatch', EXIT.ERROR, { hint },
);

/** The exact snapshot of a source: a GitHub commit (with --expect, only that commit) or a folder's content (with --expect, only that hash). */
async function takeSnapshot(source: ReturnType<typeof parseSource>, expect: string | undefined, opts: PrepareOptions): Promise<Snapshot> {
  const cli = opts.cliVersion ?? VERSION;
  if (source.type === 'github') {
    if (expect !== undefined && !COMMIT_RE.test(expect)) throw usageError('--expect for a GitHub plugin is the commit SHA (40 hex characters); a folder takes its sha256-… revision');
    // Tests never reach GitHub: a test that forgot to inject its fetch fails here instead
    if (process.env.VITEST && !opts.fetch) throw new Error('A test reached the GitHub API: inject a fetch (pluginDeps.fetch / manageDeps.fetch)');
    const snap = await fetchGithubSnapshot(source, opts.fetch, cli);
    if (expect !== undefined && snap.revision !== expect) {
      throw mismatch(`commit of ${originLabel(snap.source)}`, snap.revision, expect, 'The branch or tag moved since the command was made. Check the new commit, then run it again.');
    }
    return snap;
  }
  if (expect !== undefined && !REVISION_RE.test(expect)) throw usageError('--expect for a folder is its sha256-… revision, as `plugin validate` prints it');
  const snap = readLocalSnapshot(source.path, cli);
  if (expect !== undefined && expect !== snap.revision) {
    throw mismatch('folder\'s content', snap.revision, expect, 'Check what changed in the folder, then run it again.');
  }
  return snap;
}

/** The source as a command names it again: canonical owner/repo with the ref the human chose, or the folder's absolute path. */
function sourceArg(s: Snapshot['source']): string {
  return s.type === 'github' ? `github:${s.owner}/${s.repo}${s.ref ? `@${s.ref}` : ''}` : s.path;
}

/** sha256 over what the human is shown and the state it was prepared against: apply refuses anything else. */
function digestOf(p: Draft): string {
  const h = createHash('sha256');
  const part = (v: unknown) => h.update(JSON.stringify(v ?? null)).update('\0');
  part(p.op); part(p.name); part(p.question); part(p.argv);
  if ('snapshot' in p) {
    part(p.snapshot.revision);
    part(Object.keys(p.snapshot.hashes).sort().map(k => [k, p.snapshot.hashes[k]]));
    for (const [k, bytes] of [...p.snapshot.files].sort(([a], [b]) => (a < b ? -1 : 1))) { part(k); h.update(bytes); }
  }
  if ('old' in p) part([p.old.installId, p.old.revision, p.old.snapshot ?? null]);
  if (p.op === 'remove') part(p.keepData);
  return `sha256-${h.digest('base64')}`;
}

const withDigest = <T extends Draft>(p: T): T & { digest: string } => ({ ...p, digest: digestOf(p) });

// ---------- install ----------

export async function prepareInstall(sourceText: string, expect: string | undefined, opts: PrepareOptions = {}): Promise<Extract<Prepared, { op: 'install' }>> {
  if (expect !== undefined && expectProblem(expect)) throw usageError(expectProblem(expect)!);
  const snap = await takeSnapshot(parseSource(sourceText), expect, opts);
  const plugins = readLock().plugins;
  const name = snap.manifest.name;
  const existing = own(plugins, name) ? plugins[name] : undefined;
  if (existing) {
    throw new CliError(`Plugin "${name}" is already installed (${existing.version}, ${originLabel(existing.source)})`, 'plugin_exists', EXIT.ERROR, {
      hint: `To get a newer revision: telegram plugin update ${name}. To install it from another source: telegram plugin remove ${name}, then install again.`,
    });
  }
  // No unsigned installs: without the secret store the human is not even asked (nothing is created yet)
  assertCanSignLater();
  return withDigest({
    op: 'install' as const, name, question: installSummary(snap), snapshot: snap,
    argv: ['plugin', 'install', sourceArg(snap.source), '--expect', snap.revision],
  });
}

// ---------- update ----------

const minus = (a: readonly string[], b: readonly string[]) => a.filter(x => !b.includes(x));
const injectKey = (x: NonNullable<Manifest['secrets']>[number]) =>
  JSON.stringify([x.inject.origin, x.inject.header, x.inject.format, x.inject.paths === undefined ? null : [...x.inject.paths]]);

/** What a new manifest asks for beyond what was accepted for `old`, and which stored secrets must go. */
export function updateDiff(old: LockEntry, oldManifest: Manifest, m: Manifest): UpdateDiff {
  const a = old.accepted;
  const was = new Map((oldManifest.secrets ?? []).map(x => [x.name, injectKey(x)]));
  const secrets = m.secrets ?? [];
  const changed = secrets.filter(x => a.secrets.includes(x.name) && was.get(x.name) !== injectKey(x)).map(x => x.name);
  const names = secrets.map(x => x.name);
  return {
    newly: {
      permissions: minus(m.permissions ?? [], a.permissions),
      effects: minus(allEffects(m), a.effects),
      network: minus(m.network ?? [], a.network),
      secrets: secrets.filter(x => !a.secrets.includes(x.name) || changed.includes(x.name)).map(x => x.name),
    },
    reset: [...changed.map(name => ({ name, why: 'changed' as const })), ...minus(a.secrets, names).map(name => ({ name, why: 'removed' as const }))],
    dropped: { permissions: minus(a.permissions, m.permissions ?? []), effects: minus(a.effects, allEffects(m)), network: minus(a.network, m.network ?? []) },
  };
}

export type UpdatePrepared = Extract<Prepared, { op: 'update' }> | { op: 'up-to-date'; name: string; entry: LockEntry };

/**
 * A new snapshot from the recorded source of `name`: GitHub at the same ref (the default branch
 * when none was named), a folder at the same path. The same revision is "up to date" (nothing to
 * ask). A folder's new content needs `--expect` with its hash; a GitHub one may pin the commit.
 */
export async function prepareUpdate(name: string, expect: string | undefined, opts: PrepareOptions = {}): Promise<UpdatePrepared> {
  if (expect !== undefined && expectProblem(expect)) throw usageError(expectProblem(expect)!);
  const entry = findEntry(name);
  // What changed is judged against the installed manifest, so it must still be the one accepted
  const v = verifyInstalled(entry, opts.cliVersion ?? VERSION);
  if (!v.ok) throw tampered(name, v.reason);
  const s = entry.source;
  const source = s.type === 'github' ? { type: 'github' as const, owner: s.owner, repo: s.repo, ...(s.ref ? { ref: s.ref } : {}) } : { type: 'local' as const, path: s.path };
  const local = source.type === 'local';
  // A folder is read without --expect first: an unchanged folder is simply up to date
  const snap = await takeSnapshot(source, local ? undefined : expect, opts);
  if (snap.revision === entry.revision) {
    if (local && expect !== undefined && expect !== snap.revision) throw mismatch('folder\'s content', snap.revision, expect, 'Check what changed in the folder, then run it again.');
    return { op: 'up-to-date', name, entry };
  }
  if (source.type === 'local') {
    if (expect === undefined) {
      throw new CliError(`The folder of "${name}" changed (${source.path}); updating from a folder takes the new content's hash`, 'expect_required', EXIT.USAGE, {
        hint: `Check the folder with \`telegram plugin validate ${source.path}\`, then: telegram plugin update ${name} --expect <the revision it prints>`,
      });
    }
    if (expect !== snap.revision) throw mismatch('folder\'s content', snap.revision, expect, 'Check what changed in the folder, then run it again.');
  }
  if (snap.manifest.name !== name) {
    throw new CliError(`The source of "${name}" now holds the plugin "${oneLine(snap.manifest.name)}"; nothing was updated`, 'plugin_invalid', EXIT.ERROR, {
      hint: `To switch to it: telegram plugin remove ${name}, then install it.`,
    });
  }
  assertCanSignLater();
  const diff = updateDiff(entry, v.manifest, snap.manifest);
  return withDigest({
    op: 'update' as const, name, question: updateSummary(entry, snap, diff), snapshot: snap, old: entry, oldManifest: v.manifest, diff,
    argv: ['plugin', 'update', name, '--expect', snap.revision],
  });
}

// ---------- remove ----------

export function prepareRemove(name: string, keepData: boolean): Extract<Prepared, { op: 'remove' }> {
  const entry = findEntry(name);
  return withDigest({
    op: 'remove' as const, name, question: removeQuestion(entry, keepData), old: entry, keepData,
    argv: ['plugin', 'remove', name, ...(keepData ? ['--keep-data'] : [])],
  });
}

// ---------- apply ----------

const changedMeanwhile = (what: string) => new CliError(`${what} changed after it was shown to the user; nothing was changed`, 'plugin_changed', EXIT.ERROR, {
  hint: 'Run the command again: the user is shown the new state.',
});

/**
 * Applies exactly what was prepared and shown: the digest must still match the prepared object,
 * a folder must still hold the same content, and the registry the same installation (checked under
 * the lock by commitInstall / commitUpdate / removeInstall). Writes the audit entry.
 */
export function applyPrepared(p: Prepared, opts: PrepareOptions = {}): Record<string, unknown> {
  const { digest, ...rest } = p;
  if (digestOf(rest) !== digest) throw changedMeanwhile('The prepared plugin change');
  if ('snapshot' in p && p.snapshot.source.type === 'local') {
    let now: string;
    try {
      now = readLocalSnapshot(p.snapshot.source.path, opts.cliVersion ?? VERSION).revision;
    } catch {
      throw changedMeanwhile(`The folder ${p.snapshot.source.path}`);
    }
    if (now !== p.snapshot.revision) throw changedMeanwhile(`The folder ${p.snapshot.source.path}`);
  }
  const at = new Date().toISOString();
  if (p.op === 'install') {
    const snap = p.snapshot;
    const entry = commitInstall(snap);
    auditLog({
      timestamp: at, command: 'plugin install', target: entry.name,
      plugin: { name: entry.name, version: entry.version, revision: entry.revision, installId: entry.installId, source: originLabel(entry.source), via: opts.via ?? 'terminal' },
      result: { success: true },
    });
    const m = snap.manifest;
    return {
      ok: true, action: 'plugin install', name: entry.name, version: entry.version, source: pluginSource(entry.name, entry.version),
      origin: originLabel(entry.source), revision: entry.revision, official: entry.official,
      ...(snap.officialNote ? { officialNote: snap.officialNote } : {}), installId: entry.installId,
      next: m.onboarding ? ['plugin', 'show', m.name, '--onboarding'] : ['plugin', 'list'],
    };
  }
  if (p.op === 'update') {
    const { old, snapshot: snap, diff } = p;
    const reset = diff.reset.map(r => r.name);
    // Deleted under the lock before the switch: a value the human gave for the old destination
    // never reaches a new one, and a failure here leaves the old snapshot registered
    const entry = commitUpdate(old, snap, () => {
      for (const secret of reset) {
        let gone = false;
        try {
          gone = getPluginSecret(old.installId, secret) === null || deletePluginSecret(old.installId, secret);
        } catch { /* gone stays false */ }
        if (!gone) {
          throw new CliError(`Could not delete the stored secret ${secret} of "${old.name}", which the update must reset; nothing was updated`, 'secret_store_unavailable', EXIT.ERROR, {
            hint: `Delete it yourself (telegram plugin secret rm ${old.name} ${secret}), then update again.`,
          });
        }
      }
    });
    const setAgain = diff.reset.filter(r => r.why === 'changed').map(r => r.name);
    auditLog({
      timestamp: at, command: 'plugin update', target: entry.name,
      plugin: {
        name: entry.name, installId: entry.installId, fromVersion: old.version, fromRevision: old.revision, version: entry.version, revision: entry.revision,
        source: originLabel(entry.source), newlyAccepted: diff.newly, secretsReset: reset, via: opts.via ?? 'terminal',
      },
      result: { success: true },
    });
    return {
      ok: true, action: 'plugin update', name: entry.name, installId: entry.installId,
      from: { version: old.version, revision: old.revision }, version: entry.version, revision: entry.revision, source: pluginSource(entry.name, entry.version),
      newlyAccepted: diff.newly, ...(diff.reset.length ? { secretsReset: diff.reset } : {}),
      ...(setAgain.length ? { mustSetAgain: setAgain.map(s => ['plugin', 'secret', 'set', entry.name, s]) } : {}),
    };
  }
  const { old, keepData } = p;
  // Under the lock, and only if this is still the installation the human was shown
  removeInstall(old, keepData);
  // Its secrets go with it (they belong to this installation, kept data or not); removeInstall
  // recorded them first, so what the store fails to delete now is retried by the next command
  const secretsLeft = cleanupPendingSecrets(x => x.installId === old.installId).get(old.installId) ?? [];
  auditLog({
    timestamp: at, command: 'plugin remove', target: old.name,
    plugin: { name: old.name, version: old.version, revision: old.revision, installId: old.installId, keepData, via: opts.via ?? 'terminal' },
    result: { success: true },
  });
  return { ok: true, action: 'plugin remove', name: old.name, keepData, ...(secretsLeft.length ? { secretsNotRemoved: secretsLeft } : {}) };
}

/** The human said no (or the dialog was dismissed): an audit entry for install and update, and the error. */
export function declined(p: Prepared, via: 'terminal' | 'mcp' = 'terminal'): CliError {
  if (p.op !== 'remove') {
    auditLog({
      timestamp: new Date().toISOString(), command: `plugin ${p.op}`, target: p.name,
      plugin: { name: p.name, version: p.snapshot.manifest.version, revision: p.snapshot.revision, ...(p.op === 'update' ? { installId: p.old.installId, fromRevision: p.old.revision } : {}), via },
      result: { success: false, error: 'not_confirmed' },
    });
  }
  const what = { install: 'installed', update: 'updated (the installed revision stays)', remove: 'removed' }[p.op];
  return new CliError(`Not confirmed by the user. Nothing was ${what}.`, 'not_confirmed', EXIT.ERROR);
}

/**
 * Deletes the secrets of removed installations that `plugin remove` recorded (its own, and any an
 * earlier remove could not delete); returns, per installation, the names still in the store. A
 * name is settled only once the store said it is gone.
 */
export function cleanupPendingSecrets(only?: (p: { name: string; installId: string }) => boolean): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const installed = new Set(Object.values(readLock().plugins).map(e => e.installId));
  for (const p of pendingSecrets()) {
    if (only && !only(p)) continue;
    // Still installed (its removal did not complete): its secrets are live, the record is dropped
    if (installed.has(p.installId)) {
      settlePendingSecrets(p.installId, []);
      continue;
    }
    const left: string[] = [];
    for (const secret of p.secrets) {
      try {
        if (getPluginSecret(p.installId, secret) !== null && !deletePluginSecret(p.installId, secret)) left.push(secret);
      } catch {
        left.push(secret);
      }
    }
    settlePendingSecrets(p.installId, left);
    out.set(p.installId, left);
  }
  return out;
}

// ---------- the command for the human's terminal ----------

/** A program on PATH, as the shell would find it (PATHEXT on Windows); never runs anything. */
export function onPath(bin: string, env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): boolean {
  const dirs = (env.PATH ?? env.Path ?? '').split(platform === 'win32' ? ';' : ':').filter(Boolean);
  const exts = platform === 'win32' ? ['', ...(env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)] : [''];
  for (const dir of dirs) {
    for (const ext of exts) {
      try {
        if (statSync(join(dir, bin + ext)).isFile()) return true;
      } catch { /* not here */ }
    }
  }
  return false;
}

const posixQuote = (v: string) => (/^[\w@%+=:,./-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`);
/**
 * PowerShell: a single-quoted string is literal, and a quote inside is doubled; PowerShell also takes
 * the typographic quotes ‘ ’ ‚ ‛ as single quotes, so those are doubled too. Only plain words stay bare.
 */
const psEscape = (v: string) => v.replace(/['\u2018\u2019\u201A\u201B]/g, q => q + q);
const psQuote = (v: string) => (/^[A-Za-z0-9_./:\\-]+$/.test(v) && !v.startsWith('-') ? v : `'${psEscape(v)}'`);
const psArg = (v: string) => (/^--?[a-z][a-z-]*$/.test(v) ? v : psQuote(v));

/**
 * The exact command for the human's terminal on this (the server's) computer: `telegram …` when it
 * is on PATH, else the CLI pinned to this version through npx (an .mcpb has no `telegram`), with
 * this profile (and under TG_MOCK the same mock state), quoted for the platform's shell: POSIX sh,
 * or PowerShell on Windows (the variables are set for that one command and cleared after it).
 */
export function terminalCommand(argv: string[], o: { platform?: NodeJS.Platform; onPath?: (bin: string) => boolean; version?: string } = {}): string | undefined {
  const platform = o.platform ?? manageDeps.platform ?? process.platform;
  const has = o.onPath ?? manageDeps.onPath ?? ((b: string) => onPath(b, process.env, platform));
  const bin = has('telegram') ? ['telegram'] : ['npx', `better-tg-cli@${o.version ?? VERSION}`];
  const env: [string, string][] = [];
  if (isMock()) {
    env.push(['TG_MOCK', process.env.TG_MOCK!]);
    if (process.env.TG_PROFILE) env.push(['TG_PROFILE', process.env.TG_PROFILE]);
  } else {
    const p = profile();
    if (p) env.push(['TG_PROFILE', p]);
  }
  // Only printable ASCII is quoted into a command: anything else (a line break, a look-alike quote,
  // a control or bidi character in a folder name) gives no command, and the human types it
  if ([...argv, ...env.map(([, v]) => v)].some(v => /[^\x20-\x7e]/.test(v))) return undefined;
  if (platform === 'win32') {
    const set = env.map(([k, v]) => `$env:${k}='${psEscape(v)}'; `).join('');
    const clear = env.length ? `; ${env.map(([k]) => `Remove-Item Env:${k}`).join('; ')}` : '';
    return `${set}${[...bin.map(psArg), ...argv.map(psArg)].join(' ')}${clear}`;
  }
  return [...env.map(([k, v]) => `${k}=${posixQuote(v)}`), ...bin, ...argv.map(posixQuote)].join(' ');
}
