# Setup contract (schema 1)

Agents set Better-TG-CLI up by running commands and reading what they print. This contract is the
one shape in which setup commands report problems and say how to fix them, so an agent can act on
the output without parsing prose. The types live in [`src/setup-contract.ts`](../src/setup-contract.ts);
`test/setup-contract.test.ts` checks every example on this page against them.

**Status.** Defined, not yet emitted. The commands that will emit it (`doctor`, `connect`, the
installer and the managed update) come in later PRs of the agent-compatibility plan (#137).

## What does not change

The contract is opt-in per command. Output that exists today stays exactly as it is:

- `chats --json`, `skill status --json` and the other list commands print a JSON array.
- `onboard --json` prints its own JSON lines (`{"event":"url",...}`, no `schema` field). It stops
  after `done`, `timeout` or `already_logged_in`; after `error` the page offers a retry and it
  keeps waiting.
- `telegram mcp` writes only JSON-RPC messages to stdout.

Tests in `test/setup-contract.test.ts` pin these shapes. A command that adopts the contract later
does so for new output only, or behind a new flag.

## Result

A contract command run with `--json` prints one JSON object and nothing else on stdout:

```json
{
  "schema": 1,
  "ok": false,
  "problems": [
    {
      "id": "skill_outdated",
      "severity": "warning",
      "message": "The Codex skill is older than this version of telegram.",
      "fix": { "run": ["skill", "install", "--agent", "codex"], "profile": null, "expect": { "exit": 0 } }
    },
    {
      "id": "not_logged_in",
      "severity": "error",
      "message": "This profile has no Telegram login.",
      "fix": { "human": "Open the page and log in with a QR code from your phone.", "url": "https://better-tg-cli.com/login" }
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `schema` | Always `1` for this version. A breaking change gets a new number; new optional fields do not. |
| `ok` | `true` exactly when no problem has severity `error`. |
| `problems` | Empty when there is nothing to report. |
| `problems[].id` | Stable snake_case id, unique within a result. Agents may match on it, so an id never changes meaning. |
| `problems[].severity` | `error` (setup does not work), `warning` (works, but should be fixed), `info`. |
| `problems[].message` | One line in English, for the agent and the person. |
| `problems[].fix` | Exactly one of the three kinds below. |

No other fields are allowed at any level in schema 1.

### `fix`: run a command

```json
{ "schema": 1, "ok": true, "problems": [
  { "id": "update_available", "severity": "info", "message": "telegram 0.40.0 is available.",
    "fix": { "run": ["update"], "profile": null, "expect": { "exit": 0 } } }
] }
```

- `run` is the argv **after** the `telegram` binary, never a shell string and never the binary
  itself. The agent runs it with the same `telegram` that printed the result.
- `run` must match an entry of `RUN_ALLOWLIST` in `src/setup-contract.ts`: the exact subcommand,
  then only the flags that entry allows, no positional arguments, values made of plain
  characters. Anything else is invalid, whoever produced it.
- `profile` is the `TG_PROFILE` to run it under, or `null` for the default profile. It is always
  explicit because several clients hand a process only a filtered environment.
- `expect.exit` is the exit code of a successful run, normally `0`.

Allowed today: `skill install [--agent <ids...>] [--json]`, `update`,
`onboard [--json] [--no-open]`. Later PRs add their own entries (`doctor --fix`,
`connect --refresh`). Never allowed: anything that changes write authority or credentials
(`write-access`, `auth`, `logout`), `mcp`, `api`, any Telegram write, `skill install --force`.

### `fix`: the person has to do it

```json
{ "schema": 1, "ok": false, "problems": [
  { "id": "session_revoked", "severity": "error", "message": "Telegram ended this login.",
    "fix": { "human": "Log in again: run telegram onboard and scan the QR code with your phone." } }
] }
```

`human` is a sentence the agent passes on. `url`, when present, is `https`, or `http` on
`127.0.0.1` for a local page such as the one `onboard` serves.

### `fix`: nothing can fix it here

```json
{ "schema": 1, "ok": false, "problems": [
  { "id": "secret_store_missing", "severity": "error", "message": "No secret store is available.",
    "fix": { "unavailable": "This Linux machine has no Secret Service and file storage is turned off by policy." } }
] }
```

## Exit codes

For commands that emit this contract (other commands keep their codes; several exit `2` on bad
usage today):

| Code | Meaning | From a result |
|---|---|---|
| `0` | All good | `ok: true` |
| `1` | Error | some `error` has `fix.run`, or one has `fix.unavailable` |
| `2` | A person is needed | every `error` has `fix.human` |
| `3` | Write approval needed | never from a result: only the write guard exits 3 (`EXIT_NEEDS_APPROVAL`) |

`setupExitCode()` computes it, so the printed result and the exit code cannot disagree.

## Event stream (`--events v1`)

A command that reports progress as it goes (later: `onboard`, `connect --watch`) prints contract
events only behind an explicit `--events v1`; without the flag its output stays as it is. No
command has the flag yet.

Each line is one JSON object with `schema` and a snake_case `event`. The command names its own
progress events. Proposed, and settled by the first command that emits events: the stream ends
with one terminal event, `done` (with the result), `error` (with a message) or `timeout`.

```jsonl
{"schema":1,"event":"link","url":"http://127.0.0.1:53111/s/abc/"}
{"schema":1,"event":"waiting_human"}
{"schema":1,"event":"done","result":{"schema":1,"ok":true,"problems":[]}}
```

## Open points

Settled by the PRs that first emit the contract, not here. Everything below was chosen in this
PR where the issue says nothing, and may still change before a command emits it:

- `fix.run` as the argv after the binary, `profile` as a name or `null`, `expect` as `{exit}`;
- the mapping from a result to exit code 1 or 2 in `setupExitCode()`;
- the terminal events of a stream: whether `already_logged_in` also ends one (it does in
  `onboard` today), whether `error` ends it or allows a retry (today it allows one), and whether
  `done` carries the result;
- the progress event names of each command (the plan lists `link`, `qr`, `human_channel`,
  `waiting_human`, `already_logged_in` for `onboard --terminal`);
- how an agent that cannot find `telegram` on its PATH learns the absolute path (the installer
  reports it);
- whether `fix.run` needs `--dry-run` support in the commands it names.
