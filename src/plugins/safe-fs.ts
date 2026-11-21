import { randomUUID } from 'node:crypto';
import {
  closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readdirSync, readSync, realpathSync, renameSync, rmSync,
  unlinkSync, writeSync, type BigIntStats,
} from 'node:fs';
import { join } from 'node:path';

/**
 * File access below a trusted folder that never follows a link (docs/plugins.md, "On disk").
 *
 * Node has no openat(), so a path is walked component by component from an anchor folder whose real
 * path is resolved once (links above the anchor are the user's own setup). Every component below it
 * must be a real folder, never a symbolic link or a Windows junction (Node reports both through
 * lstat as links); the device and inode of each one are recorded. The file is then opened (with
 * O_NOFOLLOW where the platform has it), its descriptor must be the very file the walk saw, and
 * every recorded folder is checked again: a folder swapped for a link between the walk and the
 * open is caught either way. Data is read only from that descriptor.
 */

export type UnsafeKind = 'missing' | 'case' | 'link' | 'not-dir' | 'not-file' | 'hard-link' | 'too-large' | 'changed';

/** A path below the anchor that is not what it must be. `at` is the `/`-path of the component at fault. */
export class UnsafePath extends Error {
  constructor(readonly kind: UnsafeKind, readonly at: string) {
    super(`"${at}" ${UNSAFE_TEXT[kind]}`);
  }
}

export const UNSAFE_TEXT: Record<UnsafeKind, string> = {
  missing: 'does not exist',
  case: 'does not exist (names are case-sensitive)',
  link: 'is a symbolic link or a junction',
  'not-dir': 'is not a folder',
  'not-file': 'is not a regular file',
  'hard-link': 'has more than one hard link',
  'too-large': 'is too large',
  changed: 'changed while it was being used',
};

/** Test seam: runs between the checks and the open, where a swapped folder would strike. */
export const safeFsHooks: { beforeOpen?: (path: string) => void } = {};

const C = constants as Record<string, number | undefined>;
const O_NOFOLLOW = C.O_NOFOLLOW ?? 0;
const O_NONBLOCK = C.O_NONBLOCK ?? 0;

interface Step { path: string; at: string; dev: bigint; ino: bigint }

export interface WalkOptions {
  /** Create a missing folder (0700) instead of failing */
  create?: boolean;
  /** Each name must be listed in its folder with exactly this case (a case-insensitive disk would find another) */
  exactCase?: boolean;
}

const code = (e: unknown) => (e as NodeJS.ErrnoException).code;
const lstat = (p: string): BigIntStats => lstatSync(p, { bigint: true });

/** The real path of an existing folder: the anchor everything below is checked from. */
export function anchor(dir: string): string {
  const real = realpathSync(dir);
  const st = lstat(real);
  if (!st.isDirectory()) throw new UnsafePath('not-dir', '.');
  return real;
}

function stepOf(path: string, at: string, st: BigIntStats): Step {
  return { path, at, dev: st.dev, ino: st.ino };
}

/** Checks one component: present (with exact case if asked), not a link, of the right kind. */
function component(dir: string, name: string, at: string, exactCase: boolean | undefined): BigIntStats | undefined {
  if (exactCase) {
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      throw new UnsafePath('missing', at);
    }
    if (!names.includes(name)) {
      if (names.some(n => n.toLowerCase() === name.toLowerCase())) throw new UnsafePath('case', at);
      return undefined;
    }
  }
  try {
    const st = lstat(join(dir, name));
    if (st.isSymbolicLink()) throw new UnsafePath('link', at);
    return st;
  } catch (e) {
    if (e instanceof UnsafePath) throw e;
    if (code(e) === 'ENOENT' || code(e) === 'ENOTDIR') return undefined;
    throw e;
  }
}

/** Walks `segments` below the anchor `root`: each one a real folder. */
function walk(root: string, segments: readonly string[], opts: WalkOptions = {}): Step[] {
  const rootSt = lstat(root);
  if (rootSt.isSymbolicLink() || !rootSt.isDirectory()) throw new UnsafePath(rootSt.isSymbolicLink() ? 'link' : 'not-dir', '.');
  const steps = [stepOf(root, '.', rootSt)];
  let cur = root;
  for (let i = 0; i < segments.length; i++) {
    const at = segments.slice(0, i + 1).join('/');
    const path = join(cur, segments[i]);
    let st = component(cur, segments[i], at, opts.exactCase);
    if (!st && opts.create) {
      try {
        mkdirSync(path, { mode: 0o700 });
      } catch (e) {
        if (code(e) !== 'EEXIST') throw e;
      }
      st = component(cur, segments[i], at, false);
    }
    if (!st) throw new UnsafePath('missing', at);
    if (!st.isDirectory()) throw new UnsafePath('not-dir', at);
    // Windows: a reparse point Node does not report as a link would still resolve elsewhere
    if (process.platform === 'win32' && realpathSync(path) !== path) throw new UnsafePath('link', at);
    steps.push(stepOf(path, at, st));
    cur = path;
  }
  return steps;
}

/** Every recorded folder is still the same folder, and still not a link. */
function recheck(steps: readonly Step[]): void {
  for (const s of steps) {
    let st: BigIntStats;
    try {
      st = lstat(s.path);
    } catch {
      throw new UnsafePath('changed', s.at);
    }
    if (st.isSymbolicLink() || !st.isDirectory() || st.dev !== s.dev || st.ino !== s.ino) throw new UnsafePath('changed', s.at);
  }
}

const split = (rel: string) => rel.split('/');

/** Checks the folders of `dirRel` ('' for the anchor itself) below `root`; creates them when asked. */
export function safeDir(root: string, dirRel: string, opts: WalkOptions = {}): string {
  const steps = walk(root, dirRel ? split(dirRel) : [], opts);
  return steps[steps.length - 1].path;
}

/** Whether a folder below `root` exists as a real folder (false when it is missing; a link throws). */
export function safeDirExists(root: string, dirRel: string): boolean {
  try {
    safeDir(root, dirRel);
    return true;
  } catch (e) {
    if (e instanceof UnsafePath && e.kind === 'missing') return false;
    throw e;
  }
}

export interface ReadOptions extends WalkOptions {
  maxBytes?: number;
  /** A file with more than one hard link is refused (data the CLI wrote itself never has one) */
  singleLink?: boolean;
}

/**
 * The bytes of the regular file `rel` below `root`, or undefined when it does not exist. Throws
 * UnsafePath for a link, a junction, a non-file, a size over maxBytes or a swap during the read.
 */
export function readRegular(root: string, rel: string, opts: ReadOptions = {}): Uint8Array | undefined {
  const segments = split(rel);
  const leaf = segments.pop()!;
  let steps: Step[];
  try {
    steps = walk(root, segments, opts);
  } catch (e) {
    if (e instanceof UnsafePath && e.kind === 'missing') return undefined;
    throw e;
  }
  const dir = steps[steps.length - 1].path;
  const st = component(dir, leaf, rel, opts.exactCase);
  if (!st) return undefined;
  if (!st.isFile()) throw new UnsafePath('not-file', rel);
  if (opts.singleLink && st.nlink > 1n) throw new UnsafePath('hard-link', rel);
  const max = opts.maxBytes ?? Number.MAX_SAFE_INTEGER;
  if (st.size > BigInt(max)) throw new UnsafePath('too-large', rel);
  const path = join(dir, leaf);
  safeFsHooks.beforeOpen?.(path);
  let fd: number;
  try {
    fd = openSync(path, constants.O_RDONLY | O_NOFOLLOW | O_NONBLOCK);
  } catch (e) {
    if (code(e) === 'ELOOP' || code(e) === 'EMLINK') throw new UnsafePath('link', rel);
    if (code(e) === 'ENOENT' || code(e) === 'ENOTDIR') throw new UnsafePath('changed', rel);
    throw e;
  }
  try {
    const fst = fstatSync(fd, { bigint: true });
    if (!fst.isFile() || fst.dev !== st.dev || fst.ino !== st.ino) throw new UnsafePath('changed', rel);
    recheck(steps);
    if (fst.size > BigInt(max)) throw new UnsafePath('too-large', rel);
    const buf = Buffer.alloc(Number(fst.size));
    let off = 0;
    while (off < buf.length) {
      const n = readSync(fd, buf, off, buf.length - off, off);
      if (n === 0) break;
      off += n;
    }
    return new Uint8Array(buf.subarray(0, off));
  } finally {
    closeSync(fd);
  }
}

export interface Entry { name: string; kind: 'file' | 'dir' | 'other'; size: number; mtime: Date; nlink: number }

/** The entries of a folder below `root` (none when it is missing), each by lstat: a link is 'other'. */
export function listDir(root: string, dirRel: string): Entry[] {
  let steps: Step[];
  try {
    steps = walk(root, dirRel ? split(dirRel) : []);
  } catch (e) {
    if (e instanceof UnsafePath && e.kind === 'missing') return [];
    throw e;
  }
  const dir = steps[steps.length - 1].path;
  const out: Entry[] = [];
  for (const name of readdirSync(dir)) {
    let st: BigIntStats;
    try {
      st = lstat(join(dir, name));
    } catch {
      continue;
    }
    const kind = st.isSymbolicLink() ? 'other' : st.isDirectory() ? 'dir' : st.isFile() ? 'file' : 'other';
    out.push({ name, kind, size: Number(st.size), mtime: new Date(Number(st.mtimeMs)), nlink: Number(st.nlink) });
  }
  recheck(steps);
  return out;
}

/**
 * Writes `data` as the regular file `rel` below `root` (folders created 0700, the file 0600): a temp
 * file opened with O_EXCL|O_NOFOLLOW in the checked folder, then one rename. The folders are
 * checked again before and after the rename.
 */
export function writeRegular(root: string, rel: string, data: Uint8Array | string): void {
  const segments = split(rel);
  const leaf = segments.pop()!;
  const steps = walk(root, segments, { create: true });
  const dir = steps[steps.length - 1].path;
  const existing = component(dir, leaf, rel, false);
  if (existing && !existing.isFile()) throw new UnsafePath('not-file', rel);
  const tmp = join(dir, `.${leaf}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`);
  safeFsHooks.beforeOpen?.(tmp);
  const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  let fd: number;
  try {
    fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW, 0o600);
  } catch (e) {
    if (code(e) === 'ELOOP' || code(e) === 'EEXIST') throw new UnsafePath('changed', rel);
    throw e;
  }
  let id: { dev: bigint; ino: bigint };
  try {
    let off = 0;
    while (off < bytes.length) off += writeSync(fd, bytes, off, bytes.length - off);
    const fst = fstatSync(fd, { bigint: true });
    id = { dev: fst.dev, ino: fst.ino };
  } catch (e) {
    closeSync(fd);
    rmSync(tmp, { force: true });
    throw e;
  }
  closeSync(fd);
  try {
    recheck(steps);
    const tst = lstat(tmp);
    if (tst.dev !== id.dev || tst.ino !== id.ino) throw new UnsafePath('changed', rel);
    renameSync(tmp, join(dir, leaf));
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
  recheck(steps);
  const fst = lstat(join(dir, leaf));
  if (fst.dev !== id.dev || fst.ino !== id.ino) throw new UnsafePath('changed', rel);
}

/** Deletes the regular file `rel` below `root`; false when it does not exist. A link is refused. */
export function removeRegular(root: string, rel: string): boolean {
  const segments = split(rel);
  const leaf = segments.pop()!;
  let steps: Step[];
  try {
    steps = walk(root, segments);
  } catch (e) {
    if (e instanceof UnsafePath && e.kind === 'missing') return false;
    throw e;
  }
  const dir = steps[steps.length - 1].path;
  const st = component(dir, leaf, rel, false);
  if (!st) return false;
  if (!st.isFile()) throw new UnsafePath('not-file', rel);
  safeFsHooks.beforeOpen?.(join(dir, leaf));
  recheck(steps);
  const now = lstat(join(dir, leaf));
  if (now.dev !== st.dev || now.ino !== st.ino) throw new UnsafePath('changed', rel);
  unlinkSync(join(dir, leaf));
  return true;
}

/** Removes the folder `rel` below `root` with everything in it (links inside are removed, never followed). */
export function removeTree(root: string, rel: string): void {
  const segments = split(rel);
  const leaf = segments.pop()!;
  let steps: Step[];
  try {
    steps = walk(root, segments);
  } catch (e) {
    if (e instanceof UnsafePath && e.kind === 'missing') return;
    throw e;
  }
  const dir = steps[steps.length - 1].path;
  const st = component(dir, leaf, rel, false);
  if (!st) return;
  if (!st.isDirectory()) throw new UnsafePath('not-dir', rel);
  recheck(steps);
  rmSync(join(dir, leaf), { recursive: true, force: true });
}
