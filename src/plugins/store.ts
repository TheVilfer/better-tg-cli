import { randomUUID } from 'node:crypto';
import {
  chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { configDir } from '../paths.js';
import { CliError, EXIT } from '../errors.js';
import { VERSION } from '../version.js';
import {
  allEffects, checkManifest, DEFAULT_QUOTA_BYTES, KEY_RE, MANIFEST_FILE, NAME_RE, pathProblem,
  type Effect, type Manifest, type Permission,
} from './manifest.js';
import { sha256, type ResolvedSource, type Snapshot } from './source.js';

/**
 * Installed plugins on disk, all under the profile's configDir() with 0700 folders and 0600 files:
 *   plugins/plugin.lock.json                         what is installed and the hash of every file
 *   plugins/<installId>/<name>/…                     the snapshot (the folder name is the plugin name, as Agent Skills wants)
 *   plugin-data/<installId>/<telegram-user-id>/k-<key>   data the model saved (`plugin data set`)
 *
 * The lock file is read as untrusted input: every name, ID and path in it is checked before it is
 * joined to a path, and every path is checked to stay under its root.
 */

export const LOCK_FILE = 'plugin.lock.json';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH_RE = /^sha256-[A-Za-z0-9+/]{43}=$/;
const USER_ID_RE = /^[1-9][0-9]{0,19}$/;

export const pluginsRoot = (): string => join(configDir(), 'plugins');
export const dataRoot = (): string => join(configDir(), 'plugin-data');
const lockPath = (): string => join(pluginsRoot(), LOCK_FILE);

export interface LockEntry {
  name: string;
  version: string;
  installId: string;
  specVersion: string;
  source: ResolvedSource;
  revision: string;
  official: boolean;
  installedAt: string;
  /** sha256 of tg-plugin.json */
  manifest: string;
  /** sha256 of every file, by path (tg-plugin.json included) */
  files: Record<string, string>;
  /** What the human accepted at install */
  accepted: { permissions: Permission[]; effects: Effect[]; network: string[]; secrets: string[] };
}

interface Lock { lockfileVersion: 1; plugins: Record<string, LockEntry> }

const lockInvalid = (why: string) => new CliError(`${lockPath()} is damaged: ${why}`, 'plugin_lock_invalid', EXIT.ERROR, {
  hint: 'Restore it from a backup, or remove the plugins folder and install the plugins again.',
});

/** Creates a folder (and its parents) with 0700 on POSIX. */
export function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
}

/** Writes a file atomically (a temp file in the same folder, then rename) with 0600. */
export function writePrivateFile(path: string, data: Uint8Array | string): void {
  ensurePrivateDir(dirname(path));
  const tmp = `${path}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    writeFileSync(tmp, data, { mode: 0o600 });
    if (process.platform !== 'win32') chmodSync(tmp, 0o600);
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

/** `child` is `root` itself or inside it, after resolving `..` (never trusts a joined name). */
function inside(root: string, child: string): boolean {
  const rel = relative(root, child);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(sep) && !/^[A-Za-z]:/.test(rel));
}

function checkEntry(key: string, e: unknown): LockEntry {
  const bad = (what: string) => lockInvalid(`entry "${key}": ${what}`);
  if (typeof e !== 'object' || e === null) throw bad('not an object');
  const x = e as LockEntry;
  if (x.name !== key || !NAME_RE.test(key) || key.length > 64) throw bad('bad name');
  if (typeof x.installId !== 'string' || !UUID_RE.test(x.installId)) throw bad('bad installId');
  if (typeof x.files !== 'object' || x.files === null) throw bad('no files');
  for (const [p, h] of Object.entries(x.files)) {
    if (pathProblem(p) || typeof h !== 'string' || !HASH_RE.test(h)) throw bad(`bad file entry "${p}"`);
  }
  if (typeof x.manifest !== 'string' || !HASH_RE.test(x.manifest)) throw bad('bad manifest hash');
  if (typeof x.version !== 'string' || typeof x.revision !== 'string' || typeof x.source !== 'object' || x.source === null) throw bad('missing fields');
  if (typeof x.accepted !== 'object' || x.accepted === null || !Array.isArray(x.accepted.permissions) || !Array.isArray(x.accepted.effects)
    || !Array.isArray(x.accepted.network) || !Array.isArray(x.accepted.secrets)) throw bad('bad accepted permissions');
  return x;
}

export function readLock(): Lock {
  let text: string;
  try {
    text = readFileSync(lockPath(), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { lockfileVersion: 1, plugins: {} };
    throw e;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw lockInvalid('not JSON');
  }
  const lock = json as Lock;
  if (typeof lock !== 'object' || lock === null || lock.lockfileVersion !== 1 || typeof lock.plugins !== 'object' || lock.plugins === null) throw lockInvalid('unknown format');
  const plugins: Record<string, LockEntry> = {};
  for (const [k, e] of Object.entries(lock.plugins)) plugins[k] = checkEntry(k, e);
  return { lockfileVersion: 1, plugins };
}

function writeLock(lock: Lock): void {
  writePrivateFile(lockPath(), JSON.stringify(lock, null, 2) + '\n');
}

/** The folder of an installed snapshot, checked to stay under plugins/. */
export function installDir(e: Pick<LockEntry, 'installId' | 'name'>): string {
  if (!UUID_RE.test(e.installId) || !NAME_RE.test(e.name)) throw lockInvalid(`bad entry "${e.name}"`);
  const root = pluginsRoot();
  const dir = join(root, e.installId, e.name);
  if (!inside(root, dir)) throw lockInvalid(`bad entry "${e.name}"`);
  return dir;
}

export const notInstalled = (name: string) => new CliError(`No plugin named "${name}" is installed`, 'plugin_not_found', EXIT.ERROR, {
  hint: 'See `telegram plugin list`.',
});

export function findEntry(name: string): LockEntry {
  if (!NAME_RE.test(name)) throw notInstalled(name);
  const e = readLock().plugins[name];
  if (!e) throw notInstalled(name);
  return e;
}

export type Verified =
  | { ok: true; entry: LockEntry; manifest: Manifest; files: Map<string, Uint8Array>; unsupported?: string }
  | { ok: false; entry: LockEntry; reason: string };

/** Every regular file under `dir`, as `/`-separated paths; a link or anything else is reported. */
function walk(dir: string, prefix = ''): { files: string[]; odd: string[] } {
  const out = { files: [] as string[], odd: [] as string[] };
  for (const name of readdirSync(dir)) {
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = lstatSync(join(dir, name));
    if (st.isDirectory()) {
      const sub = walk(join(dir, name), rel);
      out.files.push(...sub.files);
      out.odd.push(...sub.odd);
    } else if (st.isFile()) out.files.push(rel);
    else out.odd.push(rel);
  }
  return out;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

/**
 * Checks an installed snapshot against its lock entry: exactly the locked files, each with its
 * hash, no links, and a manifest that still declares what the human accepted. The bytes returned
 * are the ones hashed, so a caller serves what was verified.
 */
export function verifyInstalled(entry: LockEntry, cliVersion = VERSION): Verified {
  const fail = (reason: string): Verified => ({ ok: false, entry, reason });
  let dir: string;
  try {
    dir = installDir(entry);
  } catch {
    return fail('its lock entry is damaged');
  }
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) return fail('its folder is missing');
  const { files: present, odd } = walk(dir);
  if (odd.length) return fail(`"${odd[0]}" is not a regular file`);
  const locked = Object.keys(entry.files);
  const extra = present.filter(p => !(p in entry.files));
  if (extra.length) return fail(`"${extra[0]}" was added`);
  const files = new Map<string, Uint8Array>();
  for (const p of locked) {
    if (!present.includes(p)) return fail(`"${p}" is missing`);
    const bytes = new Uint8Array(readFileSync(join(dir, ...p.split('/'))));
    if (sha256(bytes) !== entry.files[p]) return fail(`"${p}" was changed`);
    files.set(p, bytes);
  }
  const manifestBytes = files.get(MANIFEST_FILE);
  if (!manifestBytes || sha256(manifestBytes) !== entry.manifest) return fail(`${MANIFEST_FILE} does not match the lock`);
  const check = checkManifest(manifestBytes, cliVersion);
  if (check.errors.length || !check.manifest) return fail(`${MANIFEST_FILE} is no longer valid`);
  const m = check.manifest;
  if (m.name !== entry.name || m.version !== entry.version) return fail('its name or version differs from the lock');
  const a = entry.accepted;
  if (!sameSet(m.permissions ?? [], a.permissions) || !sameSet(allEffects(m), a.effects) || !sameSet(m.network ?? [], a.network)
    || !sameSet((m.secrets ?? []).map(s => s.name), a.secrets)) return fail('it declares permissions that were not accepted');
  return { ok: true, entry, manifest: m, files, ...(check.unsupported ? { unsupported: check.unsupported } : {}) };
}

export const tampered = (name: string, reason: string) => new CliError(
  `Plugin "${name}" was changed after it was installed (${reason}); it is disabled`, 'plugin_tampered', EXIT.ERROR,
  { hint: `Remove it and install it again: telegram plugin remove ${name}` },
);

/** The verified snapshot of an installed plugin, or plugin_not_found / plugin_tampered / plugin_unsupported. */
export function loadPlugin(name: string, cliVersion = VERSION): Extract<Verified, { ok: true }> {
  const v = verifyInstalled(findEntry(name), cliVersion);
  if (!v.ok) throw tampered(name, v.reason);
  if (v.unsupported) throw new CliError(v.unsupported, 'plugin_unsupported', EXIT.ERROR);
  return v;
}

/**
 * Writes a snapshot as a new installation: staged in a temp folder under plugins/, moved into place
 * with one rename, then recorded in the lock file. A failure leaves no half-installed plugin.
 */
export function commitInstall(snapshot: Snapshot, now = new Date()): LockEntry {
  const lock = readLock();
  const name = snapshot.manifest.name;
  if (lock.plugins[name]) throw new CliError(`Plugin "${name}" is already installed`, 'plugin_exists', EXIT.ERROR, {
    hint: `Updating is coming in a later version. To replace it now: telegram plugin remove ${name}, then install again.`,
  });
  const installId = randomUUID();
  const root = pluginsRoot();
  ensurePrivateDir(root);
  const staging = join(root, `.staging-${installId}`);
  const target = join(root, installId);
  try {
    for (const [rel, bytes] of snapshot.files) {
      const path = join(staging, name, ...rel.split('/'));
      if (!inside(staging, path)) throw new Error(`bad path ${rel}`);
      ensurePrivateDir(dirname(path));
      writeFileSync(path, bytes, { mode: 0o600, flag: 'wx' });
    }
    renameSync(staging, target);
  } catch (e) {
    rmSync(staging, { recursive: true, force: true });
    throw e;
  }
  const m = snapshot.manifest;
  const entry: LockEntry = {
    name, version: m.version, installId, specVersion: snapshot.specVersion, source: snapshot.source, revision: snapshot.revision,
    official: snapshot.official, installedAt: now.toISOString(), manifest: snapshot.hashes[MANIFEST_FILE], files: snapshot.hashes,
    accepted: { permissions: [...(m.permissions ?? [])], effects: allEffects(m), network: [...(m.network ?? [])], secrets: (m.secrets ?? []).map(s => s.name) },
  };
  try {
    writeLock({ lockfileVersion: 1, plugins: { ...lock.plugins, [name]: entry } });
  } catch (e) {
    rmSync(target, { recursive: true, force: true });
    throw e;
  }
  return entry;
}

/** Removes an installation (lock entry first, then its folder) and, unless kept, its data. */
export function removeInstall(entry: LockEntry, keepData: boolean): void {
  const lock = readLock();
  const { [entry.name]: _gone, ...rest } = lock.plugins;
  writeLock({ lockfileVersion: 1, plugins: rest });
  const root = pluginsRoot();
  const dir = join(root, entry.installId);
  if (UUID_RE.test(entry.installId) && inside(root, dir) && dir !== root) rmSync(dir, { recursive: true, force: true });
  if (!keepData) {
    const data = join(dataRoot(), entry.installId);
    if (UUID_RE.test(entry.installId) && inside(dataRoot(), data) && data !== dataRoot()) rmSync(data, { recursive: true, force: true });
  }
}

// ---------- data per installation and Telegram user ----------

export const dataKeyProblem = (key: string): string | undefined =>
  KEY_RE.test(key) ? undefined : `Invalid key "${key}": use 1-64 characters a-z 0-9 . _ - starting with a letter or digit`;

function userDataDir(entry: LockEntry, userId: string): string {
  if (!USER_ID_RE.test(userId) || !UUID_RE.test(entry.installId)) throw new CliError('Invalid account or installation ID', 'plugin_lock_invalid', EXIT.ERROR);
  const dir = join(dataRoot(), entry.installId, userId);
  if (!inside(dataRoot(), dir)) throw new CliError('Invalid data folder', 'plugin_lock_invalid', EXIT.ERROR);
  return dir;
}

const keyFile = (dir: string, key: string) => join(dir, `k-${key}`);

export interface DataItem { key: string; bytes: number; updatedAt: string }

export function dataList(entry: LockEntry, userId: string): DataItem[] {
  const dir = userDataDir(entry, userId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.startsWith('k-') && KEY_RE.test(f.slice(2))).sort().map(f => {
    const st = statSync(join(dir, f));
    return { key: f.slice(2), bytes: st.size, updatedAt: st.mtime.toISOString() };
  });
}

export function dataGet(entry: LockEntry, userId: string, key: string): Uint8Array | undefined {
  const path = keyFile(userDataDir(entry, userId), key);
  try {
    return new Uint8Array(readFileSync(path));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw e;
  }
}

/** Saves a value under a declared storage key, within the plugin's total quota for this account. */
export function dataSet(entry: LockEntry, manifest: Manifest, userId: string, key: string, value: Uint8Array): { bytes: number; usedBytes: number; quotaBytes: number } {
  const keys = manifest.storage?.keys ?? [];
  if (!keys.includes(key)) {
    throw new CliError(`Plugin "${entry.name}" does not declare the storage key "${key}"`, 'invalid_argument', EXIT.USAGE, {
      hint: keys.length ? `Its keys: ${keys.join(', ')}` : 'It declares no storage.',
    });
  }
  const quota = manifest.storage?.quotaBytes ?? DEFAULT_QUOTA_BYTES;
  const others = dataList(entry, userId).filter(i => i.key !== key).reduce((n, i) => n + i.bytes, 0);
  if (others + value.length > quota) {
    throw new CliError(`Over the plugin's storage quota: ${others + value.length} of ${quota} bytes`, 'plugin_limit', EXIT.ERROR, {
      hint: 'Save a shorter value, or delete another key first.',
    });
  }
  const dir = userDataDir(entry, userId);
  ensurePrivateDir(dir);
  writePrivateFile(keyFile(dir, key), value);
  return { bytes: value.length, usedBytes: others + value.length, quotaBytes: quota };
}

export function dataDelete(entry: LockEntry, userId: string, key: string): boolean {
  const path = keyFile(userDataDir(entry, userId), key);
  if (!existsSync(path)) return false;
  rmSync(path, { force: true });
  return true;
}

/** Onboarding per Telegram account: done once the doneWhen key holds data for this account. */
export function onboardingState(entry: LockEntry, manifest: Manifest, userId: string | undefined): 'done' | 'pending' | 'unknown' | undefined {
  if (!manifest.onboarding) return undefined;
  if (!userId) return 'unknown';
  return dataGet(entry, userId, manifest.onboarding.doneWhen.storage) !== undefined ? 'done' : 'pending';
}
