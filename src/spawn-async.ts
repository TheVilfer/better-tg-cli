import { spawn } from "node:child_process";

/** The parts of a spawnSync result the secret stores read, from an asynchronous run. */
export interface SpawnResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

const MAX_OUTPUT = 1024 * 1024;

/**
 * spawnSync's result without blocking the event loop: the child is killed when `signal` aborts or
 * after `timeout` ms (the result then carries an `error`). Output is capped at 1 MB per stream.
 */
export function spawnAsync(
  cmd: string,
  args: string[],
  o: {
    timeout: number;
    signal?: AbortSignal;
    input?: string;
    env?: NodeJS.ProcessEnv;
    windowsHide?: boolean;
  }
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    if (o.signal?.aborted) {
      return resolve({
        status: null,
        stdout: "",
        stderr: "",
        error: new Error("aborted"),
      });
    }
    let child;
    try {
      child = spawn(cmd, args, {
        stdio: [o.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
        env: o.env,
        windowsHide: o.windowsHide ?? true,
        timeout: o.timeout,
        ...(o.signal ? { signal: o.signal } : {}),
      });
    } catch (error_) {
      return resolve({
        status: null,
        stdout: "",
        stderr: "",
        error: error_ as Error,
      });
    }
    let stdout = "";
    let stderr = "";
    let error: Error | undefined;
    child.stdout?.setEncoding("utf-8").on("data", (d: string) => {
      if (stdout.length < MAX_OUTPUT) {
        stdout += d;
      }
    });
    child.stderr?.setEncoding("utf-8").on("data", (d: string) => {
      if (stderr.length < MAX_OUTPUT) {
        stderr += d;
      }
    });
    child.on("error", (e) => {
      error ??= e;
    });
    child.on("close", (code, sig) => {
      resolve({
        status: code,
        stdout,
        stderr,
        ...(error || sig
          ? { error: error ?? new Error(`killed by ${sig}`) }
          : {}),
      });
    });
    if (o.input !== undefined) {
      child.stdin?.end(o.input);
    }
  });
}
