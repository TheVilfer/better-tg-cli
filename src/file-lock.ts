import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { hostname } from "node:os";

const O_NOFOLLOW =
  (constants as Record<string, number | undefined>).O_NOFOLLOW ?? 0;

/** A synchronous pause: the lock holders run synchronously, so the wait does too. */
export const sleepSync = (ms: number) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** A token for one holder of a lock. */
export const lockToken = (): string =>
  `${process.pid} ${hostname()} ${randomUUID()}`;

/** Takes over a lock whose holder is gone; true when the caller should try again at once. */
export function breakStale(path: string, staleMs: number): boolean {
  let seen: string;
  let age: number;
  try {
    const st = lstatSync(path);
    age = Date.now() - st.mtimeMs;
    seen = st.isFile() ? readFileSync(path, "utf-8") : "";
  } catch {
    return true;
  }
  const [pid, host] = seen.split(" ");
  const dead = host === hostname() && /^\d+$/.test(pid) && !alive(Number(pid));
  if (!dead && age < staleMs && !(seen === "" && age > 5000)) {
    return false;
  }
  const aside = `${path}.stale-${randomUUID().slice(0, 8)}`;
  try {
    renameSync(path, aside);
  } catch {
    return true;
  }
  let got = "";
  try {
    got = readFileSync(aside, "utf-8");
  } catch {}
  if (got !== seen) {
    try {
      linkSync(aside, path);
    } catch {}
  }
  rmSync(aside, { force: true });
  return true;
}

/** One attempt at the lock file: true when taken, false when someone else holds it. */
export function tryLock(path: string, token: string): boolean {
  try {
    const fd = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW,
      0o600
    );
    try {
      writeSync(fd, token);
    } finally {
      closeSync(fd);
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
    return false;
  }
}

export function releaseLock(path: string, token: string): void {
  try {
    if (readFileSync(path, "utf-8") === token) {
      unlinkSync(path);
    }
  } catch {}
}

/**
 * An inter-process lock file (O_EXCL): the plugin home's `.plugins.lock` and the lock beside the
 * Windows secret file (`secrets.dpapi.lock`). The file holds `<pid> <host> <random>`; a lock left by
 * a process that is gone (same computer) or older than `staleMs` is taken over.
 *
 * Runs `fn` while holding the lock file at `path` (its folder must exist), waiting up to `timeoutMs`
 * for another holder; `busy` builds the error when it does not let go in time. Not re-entrant: the
 * caller keeps its own flag when a holder may ask again.
 */
export function withLockFile<T>(
  path: string,
  o: { timeoutMs: number; staleMs: number; busy: () => Error },
  fn: () => T
): T {
  const token = lockToken();
  const deadline = Date.now() + o.timeoutMs;
  while (!tryLock(path, token)) {
    if (breakStale(path, o.staleMs)) {
      continue;
    }
    if (Date.now() >= deadline) {
      throw o.busy();
    }
    sleepSync(25);
  }
  try {
    return fn();
  } finally {
    releaseLock(path, token);
  }
}
