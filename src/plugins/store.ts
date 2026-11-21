import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync, renameSync } from 'node:fs';
import { breakStale, lockToken, releaseLock, tryLock, withLockFile } from '../file-lock.js';
import { join } from 'node:path';
import { configDir, isMock } from '../paths.js';
import { CliError, EXIT } from '../errors.js';
import { VERSION } from '../version.js';
import { isSecretStoreAvailable, secretGetStrict, secretSet } from '../secrets.js';
import { secretStoreHint } from '../write-store.js';
import { mockStatePath } from '../mock/world.js';
import {
  allEffects, checkManifest, DEFAULT_QUOTA_BYTES, KEY_RE, LIMITS, MANIFEST_FILE, NAME_RE, pathProblem,
  type Effect, type Manifest, type Permission,
} from './manifest.js';
import { sha256, type ResolvedSource, type Snapshot } from './source.js';
import { GEN_RE, parseSlotText, secretGenerations, slotText } from './secret-slots.js';
import {
  anchor, listDir, readRegular, removeRegular, removeTree, safeDir, UnsafePath, writeRegular,
} from './safe-fs.js';

/**
 * Installed plugins on disk, all under the plugin home with 0700 folders and 0600 files:
 *   plugins/plugin.lock.json                         the install registry, signed (HMAC-SHA256)
 *   plugins/<snapshot>/<name>/…                      the snapshot (the folder name is the plugin name, as Agent Skills wants);
 *                                                    <snapshot> is the installId for a first install, a fresh UUID after
 *                                                    each update, so an update writes beside the old one and switches in
 *                                                    the signed registry
 *   plugin-data/<installId>/<telegram-user-id>/k-<key>   data the model saved (`plugin data set`)
 *   plugin-state/<installId>/cursors/c-<hash>        the host's own walk state behind a cursor
 *                                                    (never plugin data: `plugin data` does not see it)
 *   .plugins.lock                                    held while the registry or data changes
 *
 * The plugin home is the profile's configDir() and, under TG_MOCK, a folder next to the mock state
 * file that no real profile uses, whatever the profile is called.
 *
 * The registry is signed with a key from the profile's secret store (the one that holds the
 * session), so editing the file (a hash, a permission, `official`) is not enough to change what
 * was installed; without a store nothing is installed. It is still read as untrusted input: every
 * name, ID and path in it is checked before it is joined to a path, and no file below the home is
 * reached through a link (safe-fs.ts).
 */

export const LOCK_FILE = 'plugin.lock.json';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH_RE = /^sha256-[A-Za-z0-9+/]{43}=$/;
const USER_ID_RE = /^[1-9][0-9]{0,19}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const KEY_NAME = 'pluginRegistryKey';
const LOCK_BYTES = 16 * 1024 * 1024;

/** Where everything of this file lives; under TG_MOCK beside the mock state, never in a real profile. */
export function pluginHome(): string {
  if (isMock()) return `${mockStatePath().replace(/\.json$/i, '')}.plugins`;
  return configDir();
}
export const pluginsRoot = (): string => join(pluginHome(), 'plugins');
export const dataRoot = (): string => join(pluginHome(), 'plugin-data');
const lockPath = (): string => join(pluginsRoot(), LOCK_FILE);

/** The home's real path to walk from; undefined when it does not exist yet (and `create` is not set). */
function home(create = false): string | undefined {
  const dir = pluginHome();
  if (create) mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    return anchor(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw e;
  }
}

export interface LockEntry {
  name: string;
  version: string;
  installId: string;
  specVersion: string;
  source: ResolvedSource;
  revision: string;
  official: boolean;
  installedAt: string;
  /** The folder under plugins/ that holds this snapshot; absent: the installId (a first install) */
  snapshot?: string;
  /** When `plugin update` last switched it to a new revision */
  updatedAt?: string;
  /** sha256 of tg-plugin.json */
  manifest: string;
  /** sha256 of every file, by path (tg-plugin.json included); an object without a prototype */
  files: Record<string, string>;
  /** What the human accepted at install */
  accepted: { permissions: Permission[]; effects: Effect[]; network: string[]; secrets: string[] };
  /**
   * The generation of each declared secret's inject rule, by name (secret-slots.ts): the store key
   * its value lives under. Absent in an entry written before generations (then derived from the
   * verified manifest).
   */
  secrets?: Record<string, string>;
}

interface Lock { lockfileVersion: 1; plugins: Record<string, LockEntry> }

const lockInvalid = (why: string) => new CliError(`${lockPath()} is damaged: ${why}`, 'plugin_lock_invalid', EXIT.ERROR, {
  hint: 'Restore it from a backup, or remove the plugins folder and install the plugins again.',
});

/** An object without a prototype: `__proto__` or `constructor` is an ordinary own key there. */
export const bare = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;
export const own = (o: object, k: string): boolean => Object.hasOwn(o, k);

// ---------- the registry key ----------

/** Where the registry key lives; tests replace it (an in-memory store, or one that is unavailable). */
export interface KeyStore {
  available(): boolean;
  /** `fresh`: never a copy cached in this process (DPAPI), for a read that decides whether to make a key */
  get(fresh?: boolean): { ok: true; value: string | null } | { ok: false; reason: string };
  set(value: string): boolean;
}

export const storeDeps: {
  keyStore?: KeyStore; lockTimeoutMs: number; lockStaleMs: number;
  /** Test seam: runs after an update's new snapshot is in place and before the registry switches to it */
  afterSnapshot?: () => void;
} = { lockTimeoutMs: 15_000, lockStaleMs: 10 * 60_000 };

/** The mock account's key: a 0600 file in the mock plugin home (the mock never touches the real store). */
const mockKeyStore: KeyStore = {
  available: () => true,
  get: () => {
    const root = home();
    const bytes = root ? readRegular(root, 'plugin-key', { maxBytes: 1024, singleLink: true }) : undefined;
    return { ok: true, value: bytes ? new TextDecoder().decode(bytes).trim() : null };
  },
  set: value => {
    writeRegular(home(true)!, 'plugin-key', value);
    return true;
  },
};

/** The registry key in a secret store (src/secrets.ts; a test passes the DPAPI functions over a fake crypter). */
export function backendKeyStore(b: { available(): boolean; getStrict(key: string, fresh: boolean): ReturnType<KeyStore['get']>; set(key: string, value: string): boolean }): KeyStore {
  return { available: () => b.available(), get: (fresh = false) => b.getStrict(KEY_NAME, fresh), set: value => b.set(KEY_NAME, value) };
}

const secretKeyStore = backendKeyStore({
  available: () => isSecretStoreAvailable(),
  getStrict: (key, fresh) => secretGetStrict(key, false, fresh),
  set: (key, value) => secretSet(key, value),
});

const keyStore = (): KeyStore => storeDeps.keyStore ?? (isMock() ? mockKeyStore : secretKeyStore);

const storeUnavailable = (why: string) => new CliError(
  `The secret store is unavailable (${why}), and plugins need it: the install registry is signed with a key kept there`,
  'secret_store_unavailable', EXIT.ERROR, { hint: secretStoreHint() },
);

/**
 * The profile's registry key. `create` makes one at the first install; reads never do, so a
 * registry without its key in the store is refused instead of being signed anew. Before making one
 * the store is read afresh (a key another process made since this one cached "none" is used), and a
 * key is never made while a registry with plugins exists: that registry was signed with a key this
 * process cannot see, and a new key would drop every installation in it.
 */
function registryKey(create: boolean): Buffer | undefined {
  const store = keyStore();
  if (!store.available()) throw storeUnavailable('no macOS Keychain, Secret Service, DPAPI or 1Password here');
  const r = store.get(create);
  if (!r.ok) throw storeUnavailable(r.reason);
  if (r.value) {
    if (!/^[0-9a-f]{64}$/.test(r.value)) throw storeUnavailable('the plugin registry key in it is damaged');
    return Buffer.from(r.value, 'hex');
  }
  if (!create) return undefined;
  if (registryHasPlugins()) throw lockInvalid('the registry key is not in this profile\'s secret store, and a new one is not made over a registry that has plugins');
  const fresh = randomBytes(32).toString('hex');
  if (!store.set(fresh)) throw storeUnavailable('it did not save the plugin registry key');
  const back = store.get();
  if (!back.ok || back.value !== fresh) throw storeUnavailable('the plugin registry key did not read back');
  return Buffer.from(fresh, 'hex');
}

/** A registry file with at least one plugin, or one that does not parse (read without its key, never trusted). */
function registryHasPlugins(): boolean {
  const root = home();
  if (!root) return false;
  let bytes: Uint8Array | undefined;
  try {
    bytes = readRegular(root, `plugins/${LOCK_FILE}`, { maxBytes: LOCK_BYTES, singleLink: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    return true;
  }
  if (!bytes || !bytes.length) return false;
  try {
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as { plugins?: unknown };
    return !(typeof raw?.plugins === 'object' && raw.plugins !== null && !Array.isArray(raw.plugins) && !Object.keys(raw.plugins).length);
  } catch {
    return true;
  }
}

/** JSON with sorted keys: the form the MAC covers, the same for the object written and the one read back. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (typeof v === 'object' && v !== null) {
    return `{${Object.keys(v).sort().filter(k => (v as Record<string, unknown>)[k] !== undefined)
      .map(k => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

/** The registry's MAC: HMAC-SHA256 over its canonical JSON (exported for tests that forge a registry). */
export function lockMac(key: Buffer, body: { lockfileVersion: 1; plugins: unknown }): string {
  return createHmac('sha256', key).update('tg-plugin-registry\0').update(canonical(body)).digest('hex');
}

// ---------- the inter-process lock ----------

const lockBusy = (path: string) => new CliError('Another telegram process is changing plugins right now', 'plugin_busy', EXIT.ERROR, {
  hint: `Try again in a moment. If no other telegram process is running, delete ${path}.`,
});

/**
 * Runs `fn` while holding the plugin home's lock file (O_EXCL), so changes to the registry and the
 * quota check with its write never interleave with another process. Never held across a dialog or
 * a download. `fn` must not exit the process.
 */
/** This process holds the lock right now (its holder runs synchronously, so nothing interleaves). */
let lockHeld = false;

export function withPluginLock<T>(fn: () => T): T {
  // Re-entrant within this process: a store write inside a section that already holds it
  if (lockHeld) return fn();
  const root = home(true)!;
  const path = join(root, '.plugins.lock');
  return withLockFile(path, { timeoutMs: storeDeps.lockTimeoutMs, staleMs: storeDeps.lockStaleMs, busy: () => lockBusy(path) }, () => {
    lockHeld = true;
    try {
      return fn();
    } finally {
      lockHeld = false;
    }
  });
}

/**
 * What a plugin run's storage write must still hold when it changes the file: the run's absolute
 * deadline and its cancellation (an AbortSignal, the MCP server's shared flag).
 */
export interface WriteGuard {
  deadline: number;
  aborted: () => boolean;
}

/** Throws when the run behind `guard` ended: cancelled, or past its deadline. */
export function assertGuard(guard: WriteGuard | undefined, what: string): void {
  if (!guard) return;
  if (guard.aborted()) throw new CliError(`The plugin run was cancelled before the write; ${what}`, 'cancelled', EXIT.ERROR);
  if (Date.now() >= guard.deadline) throw new CliError(`The plugin run reached its time limit before the write; ${what}`, 'plugin_limit', EXIT.ERROR, { fields: { limit: 'timeout' } });
}

/**
 * withPluginLock for a plugin run's storage write: the wait yields to the event loop between
 * attempts, so a cancellation (SIGTERM, an abort) and the deadline are seen while it waits, and both
 * are checked once more under the lock (`fn` calls assertGuard right before it changes the file).
 */
async function withPluginLockGuarded<T>(guard: WriteGuard, what: string, fn: () => T): Promise<T> {
  const root = home(true)!;
  const path = join(root, '.plugins.lock');
  const token = lockToken();
  const busyAt = Date.now() + storeDeps.lockTimeoutMs;
  for (;;) {
    assertGuard(guard, what);
    if (tryLock(path, token)) break;
    if (breakStale(path, storeDeps.lockStaleMs)) continue;
    if (Date.now() >= busyAt) throw lockBusy(path);
    await new Promise(r => setTimeout(r, Math.max(1, Math.min(50, guard.deadline - Date.now()))));
  }
  lockHeld = true;
  try {
    return fn();
  } finally {
    lockHeld = false;
    releaseLock(path, token);
  }
}

// ---------- the registry ----------

const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');

function checkSource(s: unknown): s is ResolvedSource {
  if (typeof s !== 'object' || s === null) return false;
  const x = s as Record<string, unknown>;
  if (x.type === 'local') return typeof x.path === 'string';
  return x.type === 'github' && typeof x.owner === 'string' && typeof x.repo === 'string' && typeof x.commit === 'string' && SHA_RE.test(x.commit)
    && (x.ref === undefined || typeof x.ref === 'string');
}

function checkEntry(key: string, e: unknown): LockEntry {
  const bad = (what: string) => lockInvalid(`entry "${key}": ${what}`);
  if (typeof e !== 'object' || e === null) throw bad('not an object');
  const x = e as LockEntry;
  if (x.name !== key || !NAME_RE.test(key) || key.length > 64) throw bad('bad name');
  if (typeof x.installId !== 'string' || !UUID_RE.test(x.installId)) throw bad('bad installId');
  if (x.snapshot !== undefined && (typeof x.snapshot !== 'string' || !UUID_RE.test(x.snapshot))) throw bad('bad snapshot');
  if (x.updatedAt !== undefined && typeof x.updatedAt !== 'string') throw bad('bad updatedAt');
  if (typeof x.files !== 'object' || x.files === null || Array.isArray(x.files)) throw bad('no files');
  const files = bare<string>();
  for (const [p, h] of Object.entries(x.files)) {
    if (pathProblem(p) || typeof h !== 'string' || !HASH_RE.test(h)) throw bad(`bad file entry "${p}"`);
    files[p] = h;
  }
  if (typeof x.manifest !== 'string' || !HASH_RE.test(x.manifest)) throw bad('bad manifest hash');
  if (typeof x.version !== 'string' || typeof x.revision !== 'string' || typeof x.specVersion !== 'string' || typeof x.installedAt !== 'string'
    || typeof x.official !== 'boolean' || !checkSource(x.source)) throw bad('missing fields');
  if (typeof x.accepted !== 'object' || x.accepted === null || !strings(x.accepted.permissions) || !strings(x.accepted.effects)
    || !strings(x.accepted.network) || !strings(x.accepted.secrets)) throw bad('bad accepted permissions');
  let secrets: Record<string, string> | undefined;
  if (x.secrets !== undefined) {
    if (typeof x.secrets !== 'object' || x.secrets === null || Array.isArray(x.secrets)) throw bad('bad secret generations');
    secrets = bare<string>();
    for (const [n, g] of Object.entries(x.secrets)) {
      if (!KEY_RE.test(n) || !x.accepted.secrets.includes(n) || typeof g !== 'string' || !GEN_RE.test(g)) throw bad('bad secret generations');
      secrets[n] = g;
    }
    if (!sameSet(Object.keys(secrets), x.accepted.secrets)) throw bad('bad secret generations');
  }
  return { ...x, files, ...(secrets ? { secrets } : {}) };
}

const emptyLock = (): Lock => ({ lockfileVersion: 1, plugins: bare<LockEntry>() });

/** The registry and the key it was verified with (undefined while there is no registry). */
function readLockKeyed(): { lock: Lock; key?: Buffer } {
  const root = home();
  if (!root) return { lock: emptyLock() };
  let bytes: Uint8Array | undefined;
  try {
    bytes = readRegular(root, `plugins/${LOCK_FILE}`, { maxBytes: LOCK_BYTES, singleLink: true });
  } catch (e) {
    if (e instanceof UnsafePath) throw lockInvalid(`plugins/${e.message}`);
    throw e;
  }
  if (!bytes) return { lock: emptyLock() };
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw lockInvalid('not JSON');
  }
  const raw = json as Lock & { mac?: unknown };
  if (typeof raw !== 'object' || raw === null || raw.lockfileVersion !== 1 || typeof raw.plugins !== 'object' || raw.plugins === null
    || Array.isArray(raw.plugins)) throw lockInvalid('unknown format');
  // An empty registry serves nothing: it is read without the key, so a profile with no plugins never touches the store
  if (!Object.keys(raw.plugins).length) return { lock: emptyLock() };
  const key = registryKey(false);
  if (!key) throw lockInvalid('it is not signed by this CLI (the registry key is not in this profile\'s secret store)');
  const want = Buffer.from(lockMac(key, { lockfileVersion: 1, plugins: raw.plugins }), 'hex');
  const got = typeof raw.mac === 'string' && /^[0-9a-f]{64}$/.test(raw.mac) ? Buffer.from(raw.mac, 'hex') : Buffer.alloc(0);
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw lockInvalid('its signature does not match: it was changed outside this CLI');
  const plugins = bare<LockEntry>();
  for (const [k, e] of Object.entries(raw.plugins)) plugins[k] = checkEntry(k, e);
  return { lock: { lockfileVersion: 1, plugins }, key };
}

/** The install registry, its signature checked before anything in it is used. */
export function readLock(): Lock {
  return readLockKeyed().lock;
}

function writeLock(plugins: Record<string, LockEntry>, key: Buffer): void {
  if (!Object.keys(plugins).length) {
    removeRegular(home(true)!, `plugins/${LOCK_FILE}`);
    return;
  }
  // The MAC covers what a reader parses back, so it is computed over the JSON round trip
  const body = JSON.parse(JSON.stringify({ lockfileVersion: 1, plugins })) as { lockfileVersion: 1; plugins: unknown };
  writeRegular(home(true)!, `plugins/${LOCK_FILE}`, JSON.stringify({ ...body, mac: lockMac(key, body) }, null, 2) + '\n');
}

/** The folder under plugins/ of an entry's snapshot: its own after an update, the installId before. */
export const snapshotId = (e: Pick<LockEntry, 'installId' | 'snapshot'>): string => e.snapshot ?? e.installId;

/** The folder of an installed snapshot, checked to stay under plugins/. */
export function installDir(e: Pick<LockEntry, 'installId' | 'name' | 'snapshot'>): string {
  if (!UUID_RE.test(snapshotId(e)) || !NAME_RE.test(e.name)) throw lockInvalid(`bad entry "${e.name}"`);
  return join(pluginsRoot(), snapshotId(e), e.name);
}

export const notInstalled = (name: string) => new CliError(`No plugin named "${name}" is installed`, 'plugin_not_found', EXIT.ERROR, {
  hint: 'See `telegram plugin list`.',
});

export function findEntry(name: string): LockEntry {
  if (!NAME_RE.test(name)) throw notInstalled(name);
  const plugins = readLock().plugins;
  if (!own(plugins, name)) throw notInstalled(name);
  return plugins[name];
}

/**
 * The same installation and snapshot: installId, revision and the snapshot folder (an update back to
 * an earlier revision is another snapshot, so what was shown or approved for the first one is stale).
 */
export const sameInstall = (a: Pick<LockEntry, 'installId' | 'revision' | 'snapshot'>, b: Pick<LockEntry, 'installId' | 'revision' | 'snapshot'>): boolean =>
  a.installId === b.installId && a.revision === b.revision && snapshotId(a) === snapshotId(b);

/** The registered installation is still `entry` (same installId, revision and snapshot); otherwise nothing is changed. */
function assertCurrent(lock: Lock, entry: LockEntry, nothing: string): LockEntry {
  const cur = own(lock.plugins, entry.name) ? lock.plugins[entry.name] : undefined;
  if (!cur || !sameInstall(cur, entry)) {
    throw new CliError(`Plugin "${entry.name}" was removed or installed again meanwhile; ${nothing}`, 'plugin_changed', EXIT.ERROR, {
      hint: 'Check `telegram plugin list`, then run the command again.',
    });
  }
  return cur;
}

export type Verified =
  | { ok: true; entry: LockEntry; manifest: Manifest; files: Map<string, Uint8Array>; unsupported?: string }
  | { ok: false; entry: LockEntry; reason: string };

/** Every regular file under `rel` (below the home), as `/`-separated paths; a link or anything else is reported. */
function tree(root: string, rel: string, prefix = ''): { files: string[]; odd: string[] } {
  const out = { files: [] as string[], odd: [] as string[] };
  for (const e of listDir(root, rel)) {
    const path = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.kind === 'dir') {
      const sub = tree(root, `${rel}/${e.name}`, path);
      out.files.push(...sub.files);
      out.odd.push(...sub.odd);
    } else if (e.kind === 'file') out.files.push(path);
    else out.odd.push(path);
  }
  return out;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

/**
 * Checks an installed snapshot against its (signed) registry entry: exactly the locked files, each
 * with its hash, read through no link, the same set the manifest lists, and a manifest that still
 * declares what the human accepted. The bytes returned are the ones hashed, so a caller serves
 * what was verified.
 */
export function verifyInstalled(entry: LockEntry, cliVersion = VERSION): Verified {
  const fail = (reason: string): Verified => ({ ok: false, entry, reason });
  if (!UUID_RE.test(entry.installId) || !UUID_RE.test(snapshotId(entry)) || !NAME_RE.test(entry.name)) return fail('its lock entry is damaged');
  const root = home();
  const rel = `plugins/${snapshotId(entry)}/${entry.name}`;
  try {
    if (!root) return fail('its folder is missing');
    safeDir(root, rel);
  } catch (e) {
    if (e instanceof UnsafePath) return fail(e.kind === 'missing' ? 'its folder is missing' : `its folder: ${e.message}`);
    throw e;
  }
  const files = new Map<string, Uint8Array>();
  try {
    const { files: present, odd } = tree(root, rel);
    if (odd.length) return fail(`"${odd[0]}" is not a regular file`);
    const locked = Object.keys(entry.files);
    const extra = present.filter(p => !own(entry.files, p));
    if (extra.length) return fail(`"${extra[0]}" was added`);
    for (const p of locked) {
      if (!present.includes(p)) return fail(`"${p}" is missing`);
      const bytes = readRegular(root, `${rel}/${p}`, { maxBytes: LIMITS.fileBytes, singleLink: true });
      if (!bytes) return fail(`"${p}" is missing`);
      if (sha256(bytes) !== entry.files[p]) return fail(`"${p}" was changed`);
      files.set(p, bytes);
    }
  } catch (e) {
    if (e instanceof UnsafePath) return fail(e.message.replace(`"${rel}/`, '"'));
    throw e;
  }
  const manifestBytes = files.get(MANIFEST_FILE);
  if (!manifestBytes || sha256(manifestBytes) !== entry.manifest) return fail(`${MANIFEST_FILE} does not match the lock`);
  const check = checkManifest(manifestBytes, cliVersion);
  if (check.errors.length || !check.manifest) return fail(`${MANIFEST_FILE} is no longer valid`);
  const m = check.manifest;
  if (m.name !== entry.name || m.version !== entry.version) return fail('its name or version differs from the lock');
  if (!sameSet(m.files, [...files.keys()])) return fail('its files differ from the ones its manifest lists');
  const a = entry.accepted;
  if (!sameSet(m.permissions ?? [], a.permissions) || !sameSet(allEffects(m), a.effects) || !sameSet(m.network ?? [], a.network)
    || !sameSet((m.secrets ?? []).map(s => s.name), a.secrets)) return fail('it declares permissions that were not accepted');
  if (entry.secrets) {
    const gens = secretGenerations(m);
    if (Object.keys(gens).some(n => entry.secrets![n] !== gens[n])) return fail('where its secrets go differs from the lock');
  }
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

/** What a human accepts with a manifest: its permissions, effects, origins and secret names. */
export const acceptedOf = (m: Manifest): LockEntry['accepted'] => ({
  permissions: [...(m.permissions ?? [])], effects: allEffects(m), network: [...(m.network ?? [])], secrets: (m.secrets ?? []).map(s => s.name),
});

/** The file hashes of a snapshot, checked to be exactly the files its manifest lists. */
function snapshotHashes(snapshot: Snapshot): Record<string, string> {
  const listed = snapshot.manifest.files;
  const hashes = bare<string>();
  for (const [p, h] of Object.entries(snapshot.hashes)) hashes[p] = h;
  if (!sameSet(Object.keys(hashes), listed) || !sameSet([...snapshot.files.keys()], listed)) throw new Error('snapshot files differ from its manifest');
  // The bytes held are the ones hashed: a snapshot changed in memory since it was checked is not written
  for (const [p, bytes] of snapshot.files) if (sha256(bytes) !== hashes[p]) throw new Error(`snapshot file ${p} differs from its hash`);
  return hashes;
}

/** Writes a snapshot to a temp folder under plugins/ and moves it to plugins/<folder>/ with one rename. */
function stageSnapshot(root: string, snapshot: Snapshot, folder: string): void {
  const name = snapshot.manifest.name;
  const pluginsDir = safeDir(root, 'plugins', { create: true });
  const staging = `plugins/.staging-${folder}`;
  try {
    for (const [rel, bytes] of snapshot.files) {
      if (pathProblem(rel)) throw new Error(`bad path ${rel}`);
      writeRegular(root, `${staging}/${name}/${rel}`, bytes);
    }
    safeDir(root, 'plugins');
    renameSync(join(pluginsDir, `.staging-${folder}`), join(pluginsDir, folder));
  } catch (e) {
    removeTree(root, staging);
    throw e;
  }
}

/** Fails before the human is asked when the registry could not be signed (no secret store). */
export function assertCanSign(): void {
  registryKey(true);
}

/**
 * The same check without creating the key: the store is there and readable (a key that is there is
 * well-formed). Used before the human is asked, so a declined or abandoned change writes nothing,
 * not even the key; commitInstall creates it.
 */
export function assertCanSignLater(): void {
  const store = keyStore();
  if (!store.available()) throw storeUnavailable('no macOS Keychain, Secret Service, DPAPI or 1Password here');
  const r = store.get();
  if (!r.ok) throw storeUnavailable(r.reason);
  if (r.value !== null && !/^[0-9a-f]{64}$/.test(r.value)) throw storeUnavailable('the plugin registry key in it is damaged');
}

/**
 * Writes a snapshot as a new installation, under the lock: staged in a temp folder under
 * plugins/, moved into place with one rename, then recorded in the signed registry. A failure
 * leaves no half-installed plugin.
 */
export function commitInstall(snapshot: Snapshot, now = new Date()): LockEntry {
  const name = snapshot.manifest.name;
  const hashes = snapshotHashes(snapshot);
  return withPluginLock(() => {
    const key = registryKey(true)!;
    const { lock } = readLockKeyed();
    if (own(lock.plugins, name)) throw new CliError(`Plugin "${name}" is already installed`, 'plugin_exists', EXIT.ERROR, {
      hint: `To get a newer revision: telegram plugin update ${name}`,
    });
    const installId = randomUUID();
    const root = home(true)!;
    stageSnapshot(root, snapshot, installId);
    const m = snapshot.manifest;
    const entry: LockEntry = {
      name, version: m.version, installId, specVersion: snapshot.specVersion, source: snapshot.source, revision: snapshot.revision,
      official: snapshot.official, installedAt: now.toISOString(), manifest: hashes[MANIFEST_FILE], files: hashes,
      accepted: acceptedOf(m), secrets: secretGenerations(m),
    };
    const plugins = bare<LockEntry>();
    for (const [k, v] of Object.entries(lock.plugins)) plugins[k] = v;
    plugins[name] = entry;
    try {
      writeLock(plugins, key);
    } catch (e) {
      removeTree(root, `plugins/${installId}`);
      throw e;
    }
    return entry;
  });
}

/**
 * Switches an installation to a new snapshot the human confirmed, under the lock and only while
 * `old` is still the registered installation (same installId, revision and snapshot;
 * `plugin_changed` otherwise). The installId stays, so data, settings and the secrets whose inject
 * rule did not change stay attached. The new snapshot is written beside the old one
 * (plugins/<new folder>/), then `beforeSwitch` runs (it clears the new generations of changed
 * secrets: never a live value), then the old generations to drop (`retire`, `name:gen`) are recorded
 * in the pending cleanup, and the signed registry write is the one commit point: a failure or a
 * crash before it leaves the old snapshot registered and working with all its secrets (the record
 * names live values then, which the cleanup never deletes). The old folder is deleted after it; the
 * caller deletes the retired values (cleanupPendingSecrets), retried by later commands.
 */
export function commitUpdate(old: LockEntry, snapshot: Snapshot, o: { beforeSwitch?: () => void; retire?: string[] } = {}, now = new Date()): LockEntry {
  const name = snapshot.manifest.name;
  if (name !== old.name) throw new Error('an update keeps the plugin name');
  const hashes = snapshotHashes(snapshot);
  return withPluginLock(() => {
    const key = registryKey(false);
    const { lock } = readLockKeyed();
    assertCurrent(lock, old, 'nothing was updated');
    if (!key) throw lockInvalid('the registry key is missing');
    const folder = randomUUID();
    const root = home(true)!;
    stageSnapshot(root, snapshot, folder);
    const m = snapshot.manifest;
    const entry: LockEntry = {
      ...old, version: m.version, specVersion: snapshot.specVersion, source: snapshot.source, revision: snapshot.revision,
      official: snapshot.official, manifest: hashes[MANIFEST_FILE], files: hashes, accepted: acceptedOf(m),
      secrets: secretGenerations(m), snapshot: folder, updatedAt: now.toISOString(),
    };
    const plugins = bare<LockEntry>();
    for (const [k, v] of Object.entries(lock.plugins)) plugins[k] = v;
    plugins[name] = entry;
    try {
      // After the new snapshot is safely written, before the switch: a failure here leaves the old one
      o.beforeSwitch?.();
      if (o.retire?.length) addPendingSecrets({ name, installId: old.installId, secrets: o.retire });
      storeDeps.afterSnapshot?.();
      writeLock(plugins, key);
    } catch (e) {
      removeTree(root, `plugins/${folder}`);
      throw e;
    }
    // The old snapshot is no longer registered; a folder left by a failure here is never read
    try { removeTree(root, `plugins/${snapshotId(old)}`); } catch { /* best effort */ }
    return entry;
  });
}

/**
 * Removes the installation the human confirmed (registry entry first, then its folder) and, unless
 * kept, its data. Under the lock it must still be the registered one: a removal confirmed for one
 * installation never removes another that took its name meanwhile.
 */
/**
 * Runs `fn` under the plugin lock only while `entry` is still the registered installation (same
 * installId, revision and snapshot); otherwise `plugin_changed` and `fn` never runs.
 */
export function withCurrentInstall<T>(entry: LockEntry, nothing: string, fn: () => T): T {
  return withPluginLock(() => {
    assertCurrent(readLock(), entry, nothing);
    return fn();
  });
}

export function removeInstall(entry: LockEntry, keepData: boolean): void {
  if (!UUID_RE.test(entry.installId) || !UUID_RE.test(snapshotId(entry))) throw lockInvalid(`bad entry "${entry.name}"`);
  withPluginLock(() => {
    const { lock, key } = readLockKeyed();
    assertCurrent(lock, entry, 'nothing was removed');
    // Its secrets are deleted after the lock is let go (the store is slow and may fail): recorded
    // first, in the same section that drops the entry, so a deletion that fails is retried later
    // Its generations, and for an entry written before generations the bare names it used then
    const slots = [...(installedSlots(entry) ?? []), ...(entry.secrets ? [] : entry.accepted.secrets)];
    if (slots.length) addPendingSecrets({ name: entry.name, installId: entry.installId, secrets: slots });
    const plugins = bare<LockEntry>();
    for (const [k, v] of Object.entries(lock.plugins)) if (k !== entry.name) plugins[k] = v;
    writeLock(plugins, key!);
    const root = home(true)!;
    removeTree(root, `plugins/${snapshotId(entry)}`);
    if (!keepData) removeTree(root, `plugin-data/${entry.installId}`);
    // The host's own state of this installation goes with it, kept data or not
    removeTree(root, `plugin-state/${entry.installId}`);
  });
}

// ---------- secrets of removed installations, still to delete ----------

/**
 * Stored secret values to delete: of a removed installation, or old generations an update replaced.
 * `secrets` are slots, `name:gen` (a bare name: the key of an install made before generations).
 */
export interface PendingSecrets { name: string; installId: string; secrets: string[] }

/**
 * The slots (`name:gen`) an installation's runs read: pinned in its entry, or derived from its
 * verified manifest for an entry written before generations; undefined when neither can be told.
 */
export function installedSlots(entry: LockEntry): string[] | undefined {
  const gens = entry.secrets ?? (() => {
    const v = verifyInstalled(entry);
    return v.ok ? secretGenerations(v.manifest) : undefined;
  })();
  return gens && Object.entries(gens).map(([name, gen]) => slotText({ name, gen }));
}

const PENDING_REL = 'plugin-state/pending-secret-cleanup.json';

/** The installations whose secrets `plugin remove` has not deleted yet. */
export function pendingSecrets(): PendingSecrets[] {
  const root = home();
  if (!root) return [];
  let bytes: Uint8Array | undefined;
  try {
    bytes = readRegular(root, PENDING_REL, { singleLink: true, maxBytes: 1024 * 1024 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    return dataUnsafe(e);
  }
  if (!bytes) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((p): p is PendingSecrets => !!p && typeof p === 'object' && typeof p.name === 'string' && typeof p.installId === 'string'
    && UUID_RE.test(p.installId) && strings(p.secrets) && p.secrets.every((x: string) => parseSlotText(x) !== undefined));
}

function writePending(list: PendingSecrets[]): void {
  const root = home(true)!;
  try {
    if (list.length) writeRegular(root, PENDING_REL, JSON.stringify(list));
    else removeRegular(root, PENDING_REL);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') dataUnsafe(e);
  }
}

/** Adds slots to an installation's record (merged: an update, then a remove, both keep theirs). */
function addPendingSecrets(p: PendingSecrets): void {
  withPluginLock(() => {
    const list = pendingSecrets();
    const had = list.find(x => x.installId === p.installId);
    const merged = { ...p, secrets: [...new Set([...(had?.secrets ?? []), ...p.secrets])] };
    writePending([...list.filter(x => x.installId !== p.installId), merged]);
  });
}

/** After a deletion attempt: `left` are the slots of this installation still to delete. */
export function settlePendingSecrets(installId: string, left: string[]): void {
  withPluginLock(() => {
    const list = pendingSecrets();
    const next = list.flatMap(x => (x.installId !== installId ? [x] : left.length ? [{ ...x, secrets: x.secrets.filter(n => left.includes(n)) }] : []));
    if (JSON.stringify(next) !== JSON.stringify(list)) writePending(next);
  });
}

// ---------- the installation a write was approved for ----------

let approvedInstall: Pick<LockEntry, 'name' | 'installId' | 'revision' | 'snapshot'> | undefined;

/** Called when an approval of `plugin data set/delete` held: the write must reach this very installation and snapshot. */
export function expectInstall(e: Pick<LockEntry, 'name' | 'installId' | 'revision' | 'snapshot'>): void {
  approvedInstall = { name: e.name, installId: e.installId, revision: e.revision, snapshot: snapshotId(e) };
}

/** Refuses an installation other than the approved one (removed and installed again since the approval). */
export function assertApprovedInstall(entry: LockEntry): void {
  const a = approvedInstall;
  if (a && (a.name !== entry.name || !sameInstall(a, entry))) {
    throw new CliError(`The approval was for another installation of "${a.name}" (${a.installId}); nothing was changed`, 'plugin_changed', EXIT.ERROR, {
      hint: 'Show the user the action again and ask for a new approval.',
    });
  }
}

// ---------- data per installation and Telegram user ----------

export const dataKeyProblem = (key: string): string | undefined =>
  KEY_RE.test(key) ? undefined : `Invalid key "${key}": use 1-64 characters a-z 0-9 . _ - starting with a letter or digit`;

/** `plugin-data/<installId>/<userId>` below the home, both checked. */
function userDataRel(entry: LockEntry, userId: string): string {
  if (!USER_ID_RE.test(userId) || !UUID_RE.test(entry.installId)) throw new CliError('Invalid account or installation ID', 'plugin_lock_invalid', EXIT.ERROR);
  return `plugin-data/${entry.installId}/${userId}`;
}

const dataUnsafe = (e: unknown): never => {
  if (e instanceof UnsafePath) {
    throw new CliError(`Plugin data is not stored safely: ${e.message}`, 'plugin_data_unsafe', EXIT.ERROR, {
      hint: 'A link or another kind of file sits in the plugin-data folder. Remove it, then try again.',
    });
  }
  throw e;
};

export interface DataItem { key: string; bytes: number; updatedAt: string }

export function dataList(entry: LockEntry, userId: string): DataItem[] {
  const rel = userDataRel(entry, userId);
  const root = home();
  if (!root) return [];
  try {
    return listDir(root, rel)
      .filter(e => e.kind === 'file' && e.nlink === 1 && e.name.startsWith('k-') && KEY_RE.test(e.name.slice(2)))
      .sort((a, b) => (a.name < b.name ? -1 : 1))
      .map(e => ({ key: e.name.slice(2), bytes: e.size, updatedAt: e.mtime.toISOString() }));
  } catch (e) {
    return dataUnsafe(e);
  }
}

export function dataGet(entry: LockEntry, userId: string, key: string): Uint8Array | undefined {
  const rel = userDataRel(entry, userId);
  if (dataKeyProblem(key)) throw new CliError(dataKeyProblem(key)!, 'invalid_argument', EXIT.USAGE);
  const root = home();
  if (!root) return undefined;
  try {
    return readRegular(root, `${rel}/k-${key}`, { singleLink: true, maxBytes: 64 * 1024 * 1024 });
  } catch (e) {
    return dataUnsafe(e);
  }
}

/**
 * Saves a value under a declared storage key, within the plugin's total quota for this account. The
 * quota check and the write happen under the lock, for the installation that is still registered.
 */
type SetResult = { bytes: number; usedBytes: number; quotaBytes: number };

function setUnderLock(entry: LockEntry, manifest: Manifest, userId: string, key: string, value: Uint8Array, guard?: WriteGuard): () => SetResult {
  const keys = manifest.storage?.keys ?? [];
  if (!keys.includes(key)) {
    throw new CliError(`Plugin "${entry.name}" does not declare the storage key "${key}"`, 'invalid_argument', EXIT.USAGE, {
      hint: keys.length ? `Its keys: ${keys.join(', ')}` : 'It declares no storage.',
    });
  }
  const rel = userDataRel(entry, userId);
  const quota = manifest.storage?.quotaBytes ?? DEFAULT_QUOTA_BYTES;
  return () => {
    assertCurrent(readLock(), entry, 'nothing was saved');
    const others = dataList(entry, userId).filter(i => i.key !== key).reduce((n, i) => n + i.bytes, 0);
    if (others + value.length > quota) {
      throw new CliError(`Over the plugin's storage quota: ${others + value.length} of ${quota} bytes`, 'plugin_limit', EXIT.ERROR, {
        hint: 'Save a shorter value, or delete another key first.',
      });
    }
    // The last look before the file changes: a run that ended meanwhile writes nothing
    assertGuard(guard, 'nothing was saved');
    try {
      writeRegular(home(true)!, `${rel}/k-${key}`, value);
    } catch (e) {
      dataUnsafe(e);
    }
    return { bytes: value.length, usedBytes: others + value.length, quotaBytes: quota };
  };
}

function deleteUnderLock(entry: LockEntry, userId: string, key: string, guard?: WriteGuard): () => boolean {
  const rel = userDataRel(entry, userId);
  if (dataKeyProblem(key)) throw new CliError(dataKeyProblem(key)!, 'invalid_argument', EXIT.USAGE);
  return () => {
    assertCurrent(readLock(), entry, 'nothing was deleted');
    const root = home();
    if (!root) return false;
    assertGuard(guard, 'nothing was deleted');
    try {
      return removeRegular(root, `${rel}/k-${key}`);
    } catch (e) {
      return dataUnsafe(e);
    }
  };
}

export function dataSet(entry: LockEntry, manifest: Manifest, userId: string, key: string, value: Uint8Array): SetResult {
  return withPluginLock(setUnderLock(entry, manifest, userId, key, value));
}

export function dataDelete(entry: LockEntry, userId: string, key: string): boolean {
  return withPluginLock(deleteUnderLock(entry, userId, key));
}

/** dataSet for a plugin run: the lock wait and the write itself hold to the run's deadline and cancellation. */
export function dataSetGuarded(entry: LockEntry, manifest: Manifest, userId: string, key: string, value: Uint8Array, guard: WriteGuard): Promise<SetResult> {
  return withPluginLockGuarded(guard, 'nothing was saved', setUnderLock(entry, manifest, userId, key, value, guard));
}

/** dataDelete for a plugin run, held to the run's deadline and cancellation as dataSetGuarded. */
export function dataDeleteGuarded(entry: LockEntry, userId: string, key: string, guard: WriteGuard): Promise<boolean> {
  return withPluginLockGuarded(guard, 'nothing was deleted', deleteUnderLock(entry, userId, key, guard));
}

// ---------- the host's walk state behind a cursor ----------

/** How long a cursor stays valid, and how many one installation keeps (the oldest go first). */
export const CURSOR_TTL_MS = 24 * 3600e3;
export const CURSOR_MAX = 64;
/** Test seam: the clock cursors are dated by. */
export const cursorDeps: { now: () => number } = { now: () => Date.now() };
/** A cursor id: 128 random bits as base64url. */
export const CURSOR_ID_RE = /^[A-Za-z0-9_-]{22}$/;

function cursorDir(entry: Pick<LockEntry, 'installId'>): string {
  if (!UUID_RE.test(entry.installId)) throw new CliError('Invalid installation ID', 'plugin_lock_invalid', EXIT.ERROR);
  return `plugin-state/${entry.installId}/cursors`;
}

/** The file of an id: a hex hash, so ids that differ only in case never meet on a case-insensitive disk. */
const cursorFile = (id: string) => `c-${createHash('sha256').update(id).digest('hex').slice(0, 40)}`;

/**
 * Keeps `state` for this installation behind a new random id and returns the id. Expired entries
 * and the oldest beyond CURSOR_MAX are dropped first (best effort: another run may drop them too).
 */
export function cursorSave(entry: Pick<LockEntry, 'installId'>, state: unknown): string {
  const dir = cursorDir(entry);
  const root = home(true)!;
  const now = cursorDeps.now();
  try {
    const files = listDir(root, dir).filter(e => e.kind === 'file' && /^c-[0-9a-f]{40}$/.test(e.name)).sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
    files.forEach((f, i) => {
      if (now - f.mtime.getTime() > CURSOR_TTL_MS || files.length - i >= CURSOR_MAX) {
        try { removeRegular(root, `${dir}/${f.name}`); } catch { /* gone meanwhile */ }
      }
    });
  } catch (e) {
    dataUnsafe(e);
  }
  const id = randomBytes(16).toString('base64url');
  try {
    writeRegular(root, `${dir}/${cursorFile(id)}`, JSON.stringify({ id, installId: entry.installId, createdAt: now, state }));
  } catch (e) {
    dataUnsafe(e);
  }
  return id;
}

/** The state behind a cursor id of this installation; undefined when unknown, expired or not this installation's. */
export function cursorLoad(entry: Pick<LockEntry, 'installId'>, id: string): unknown {
  if (!CURSOR_ID_RE.test(id)) return undefined;
  const dir = cursorDir(entry);
  const root = home();
  if (!root) return undefined;
  let bytes: Uint8Array | undefined;
  try {
    bytes = readRegular(root, `${dir}/${cursorFile(id)}`, { singleLink: true, maxBytes: 1024 * 1024 });
  } catch (e) {
    return dataUnsafe(e);
  }
  if (!bytes) return undefined;
  let rec: { id?: unknown; installId?: unknown; createdAt?: unknown; state?: unknown };
  try {
    rec = JSON.parse(new TextDecoder().decode(bytes)) as typeof rec;
  } catch {
    return undefined;
  }
  const now = cursorDeps.now();
  if (rec?.id !== id || rec.installId !== entry.installId || typeof rec.createdAt !== 'number') return undefined;
  if (rec.createdAt > now + 60_000 || now - rec.createdAt > CURSOR_TTL_MS) return undefined;
  return rec.state;
}

/** Onboarding per Telegram account: done once the doneWhen key holds data for this account. */
export function onboardingState(entry: LockEntry, manifest: Manifest, userId: string | undefined): 'done' | 'pending' | 'unknown' | undefined {
  if (!manifest.onboarding) return undefined;
  if (!userId) return 'unknown';
  return dataGet(entry, userId, manifest.onboarding.doneWhen.storage) !== undefined ? 'done' : 'pending';
}

// ---------- non-secret settings per installation ----------

/** The most a settings file may hold (what settingsRead reads), checked before every write. */
export const SETTINGS_BYTES = 256 * 1024;

function settingsRel(entry: Pick<LockEntry, 'installId'>): string {
  if (!UUID_RE.test(entry.installId)) throw new CliError('Invalid installation ID', 'plugin_lock_invalid', EXIT.ERROR);
  return `plugin-state/${entry.installId}/settings.json`;
}

/** The values `plugin settings set` stored for this installation (an object without a prototype). */
export function settingsRead(entry: Pick<LockEntry, 'installId'>): Record<string, unknown> {
  const out = bare<unknown>();
  const root = home();
  if (!root) return out;
  let bytes: Uint8Array | undefined;
  try {
    bytes = readRegular(root, settingsRel(entry), { singleLink: true, maxBytes: SETTINGS_BYTES });
  } catch (e) {
    return dataUnsafe(e);
  }
  if (!bytes) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return out;
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const [k, v] of Object.entries(parsed)) if (KEY_RE.test(k)) out[k] = v;
  }
  return out;
}

/** Stores one setting (already checked against the manifest) for the installation still registered. */
export function settingsWrite(entry: LockEntry, key: string, value: unknown): void {
  if (!KEY_RE.test(key)) throw new CliError(`Invalid setting "${key}"`, 'invalid_argument', EXIT.USAGE);
  withPluginLock(() => {
    assertCurrent(readLock(), entry, 'nothing was saved');
    const all = settingsRead(entry);
    all[key] = value;
    const text = JSON.stringify(all);
    // Over the limit the file could no longer be read: refused, the previous file stays as it was
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > SETTINGS_BYTES) {
      throw new CliError(`The settings of "${entry.name}" would take ${bytes} bytes with this value; the limit is ${SETTINGS_BYTES}. Nothing was saved`, 'settings_too_large', EXIT.USAGE, {
        hint: `Use a shorter value, or shorten another setting first: telegram plugin settings get ${entry.name}`,
      });
    }
    try {
      writeRegular(home(true)!, settingsRel(entry), text);
    } catch (e) {
      dataUnsafe(e);
    }
  });
}
