/**
 * Setup contract, schema 1 (docs/setup-contract.md): the one shape in which setup commands
 * (`doctor`, `connect`, install and update, later PRs of #137) report problems and how to fix
 * them. No command emits it yet. Existing output (`chats --json` and `skill status --json` print
 * arrays, `onboard --json` prints its own JSON lines) never changes to it.
 *
 * Types only (#110): nothing here runs. The allowlist of `fix.run` and the checker of results and
 * events live in test/setup-contract-check.ts until the first command that emits the contract
 * moves them here together with its own use of them.
 */

/**
 * Exit codes of a command that emits this contract: 0 ok, 1 error, 2 a person is needed, 3 write
 * approval needed (`EXIT_NEEDS_APPROVAL` in src/approval.ts). Other commands keep their own codes
 * (several exit 2 on bad usage today).
 */
export type SetupExitCode = 0 | 1 | 2 | 3;

export type Severity = 'error' | 'warning' | 'info';

/**
 * A command the agent may run itself. `run` is the argv after the `telegram` binary (never a shell
 * string, never the binary), and only an allowlisted one. `profile` is the TG_PROFILE to run it
 * under, `null` for the default profile, and is always explicit because some clients pass the
 * agent only a filtered environment. A run fixed the problem only when it exited 0; any other code,
 * 3 (approval needed) included, means it did not.
 */
export interface RunFix { run: string[]; profile: string | null; expect: { exit: 0 } }
/** Something only the person can do: a sentence for the agent to pass on, maybe an https page. */
export interface HumanFix { human: string; url?: string }
/** Nothing can fix it here (platform, policy, offline): the reason, said plainly. */
export interface UnavailableFix { unavailable: string }
export type Fix = RunFix | HumanFix | UnavailableFix;

export interface Problem {
  /** Stable snake_case id; agents may match on it, so it never changes meaning */
  id: string;
  severity: Severity;
  /** One line in English for the agent and the person */
  message: string;
  fix: Fix;
}

/**
 * The single result of a contract command (its whole stdout with `--json`). `D` is the shape of
 * the command's own `data`.
 */
export interface SetupResult<D extends Record<string, unknown> = Record<string, unknown>> {
  schema: 1;
  /** true exactly when no problem has severity `error` */
  ok: boolean;
  problems: Problem[];
  /**
   * Optional command-specific content (an installer's path, version and target). The only open
   * field of schema 1: the generic checker requires a JSON object and looks no further; each
   * command that sets it documents and tests its own shape.
   */
  data?: D;
}

/**
 * One JSON line of an event stream, printed only behind an explicit `--events v1` (no command has
 * the flag yet). A command passes the names of its own progress events as `Progress`. Proposed,
 * settled by the first command that emits events: the stream ends with one terminal event, and
 * `done` carries the result.
 */
export type SetupTerminalEvent =
  | { schema: 1; event: 'done'; result: SetupResult }
  | { schema: 1; event: 'error'; message: string }
  | { schema: 1; event: 'timeout' };
export type SetupEvent<Progress extends string = never> =
  | SetupTerminalEvent
  | ({ schema: 1; event: Exclude<Progress, SetupTerminalEvent['event']> } & Record<string, unknown>);
