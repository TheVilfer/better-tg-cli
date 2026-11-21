/**
 * What the sandbox engine (runtime.ts) and the host API (host.ts) share, without loading the engine:
 * the limits, the errors, the shape of a host function. runtime.ts, which pulls in QuickJS, is
 * imported on demand by the run itself.
 *
 * - `timeoutMs`: The whole run, host waits included.
 * - `callBytes`: UTF-8 bytes of one call's arguments, and of one result handed into the sandbox.
 * - `httpReplyBytes`: UTF-8 bytes of one `http.fetch` result: a 1 MB body (the response limit) arrives as text or base64 with its headers, more than `callBytes` once escaped.
 * - `outputChars`: Characters of the command's result after serialization.
 * - `jobsPerDrain`: Jobs run in one drain of the queue (a promise loop that never yields to the host).
 */

export interface SandboxLimits {
  timeoutMs: number;
  memoryBytes: number;
  stackBytes: number;
  hostCalls: number;
  concurrentCalls: number;
  callBytes: number;
  httpReplyBytes: number;
  outputChars: number;
  jobsPerDrain: number;
}

export const DEFAULT_LIMITS: SandboxLimits = {
  timeoutMs: 60_000,
  memoryBytes: 64 * 1024 * 1024,
  stackBytes: 256 * 1024,
  hostCalls: 200,
  concurrentCalls: 4,
  callBytes: 1024 * 1024,
  httpReplyBytes: 2 * 1024 * 1024,
  outputChars: 60_000,
  jobsPerDrain: 1_000_000,
};

/** An error the host gives the guest (and the guest may catch): `{code, message, ...}`. */
export class HostError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

/** How a run ended when it did not return a result: a code of the CLI's error vocabulary. */
export class SandboxError extends Error {
  constructor(
    readonly code: "plugin_limit" | "plugin_error" | "cancelled",
    message: string,
    readonly limit?: string,
    readonly guestCode?: string
  ) {
    super(message);
  }
}

/** A host API function: arguments as parsed JSON, a JSON-able result. `signal` aborts with the run. */
export type HostFunction = (
  args: unknown[],
  signal: AbortSignal
) => Promise<unknown> | unknown;
