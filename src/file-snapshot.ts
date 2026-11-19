import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { basename } from 'node:path';

/**
 * The bytes of a local file as this process first read them. The write guard hashes a file an
 * approval covers from this snapshot, and the upload sends the same snapshot: the path is never
 * opened again after the check, so a file replaced or edited in between cannot change what goes out.
 */
export interface FileSnapshot {
  /** The real path the bytes were read from */
  path: string;
  /** The name Telegram shows (the last part of the path as given) */
  name: string;
  bytes: Buffer;
}

const taken = new Map<string, Buffer>();

/** Reads the file once per process (by real path); throws a readable error when it can't. */
export function fileSnapshot(path: string): FileSnapshot {
  let real: string;
  try {
    real = realpathSync(path);
  } catch {
    throw new Error(`File not found: ${path}`);
  }
  let bytes = taken.get(real);
  if (!bytes) {
    try {
      if (!statSync(real).isFile()) throw new Error('not a regular file');
      bytes = readFileSync(real);
    } catch (e) {
      throw new Error(`Cannot read ${path}: ${e instanceof Error ? e.message : String(e)}`);
    }
    taken.set(real, bytes);
  }
  return { path: real, name: basename(path), bytes };
}

/** Drops the snapshots, as a new process starts without them (tests that play two processes in one). */
export function forgetFileSnapshots(): void {
  taken.clear();
}

/** What the approval binds for a file: its real path and the digest of the snapshot. */
export function snapshotDigest(s: FileSnapshot): string {
  return `${s.path}:${createHash('sha256').update(s.bytes).digest('hex')}`;
}

/**
 * The snapshot in the shape teleproto uploads from memory (a named blob): unlike a CustomFile,
 * which teleproto reads from its path again above 20 MB, a blob is always read from these bytes.
 */
export function uploadable(s: FileSnapshot): { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> } {
  return {
    name: s.name,
    size: s.bytes.length,
    arrayBuffer: async () => s.bytes.buffer.slice(s.bytes.byteOffset, s.bytes.byteOffset + s.bytes.length) as ArrayBuffer,
  };
}
