import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

/**
 * The bytes of a local file as this process first read them. The write guard hashes a file an
 * approval covers from this snapshot, and the upload sends the same snapshot: the path is never
 * opened again after the check, so a file replaced or edited in between cannot change what goes out.
 *
 * - `path`: The real path the bytes were read from
 * - `name`: The name Telegram shows (the last part of the path as given)
 */
export interface FileSnapshot {
  path: string;
  name: string;
  bytes: Buffer;
}

const taken = new Map<string, FileSnapshot>();

/** Reads the file once per process (by the path as given, made absolute); throws a readable error when it can't. */
export function fileSnapshot(path: string): FileSnapshot {
  const key = resolve(path);
  const known = taken.get(key);
  if (known) {
    return known;
  }
  if (sealed) {
    throw new Error(
      `${path} is not the file that was approved; nothing was sent. Run the command again for a new approval.`
    );
  }
  let real: string;
  try {
    real = realpathSync(key);
  } catch {
    throw new Error(`File not found: ${path}`);
  }
  let bytes: Buffer;
  try {
    if (!statSync(real).isFile()) {
      throw new Error("not a regular file");
    }
    bytes = readFileSync(real);
  } catch (error) {
    throw new Error(
      `Cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  const snap = { path: real, name: basename(path), bytes };
  taken.set(key, snap);
  return snap;
}

let sealed = false;
export function sealFileSnapshots(): void {
  sealed = true;
}

/** Drops the snapshots, as a new process starts without them (tests that play two processes in one). */
export function forgetFileSnapshots(): void {
  taken.clear();
  sealed = false;
}

/** What the approval binds for a file: its real path and the digest of the snapshot. */
export function snapshotDigest(s: FileSnapshot): string {
  return `${s.path}:${createHash("sha256").update(s.bytes).digest("hex")}`;
}

/**
 * The snapshot in the shape teleproto uploads from memory (a named blob): unlike a CustomFile,
 * which teleproto reads from its path again above 20 MB, a blob is always read from these bytes.
 */
export function uploadable(s: FileSnapshot): {
  name: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
} {
  return {
    name: s.name,
    size: s.bytes.length,
    arrayBuffer: async () =>
      s.bytes.buffer.slice(
        s.bytes.byteOffset,
        s.bytes.byteOffset + s.bytes.length
      ) as ArrayBuffer,
  };
}
