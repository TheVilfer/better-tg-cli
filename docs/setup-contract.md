# Setup contract (schema 1)

Agents set Better-TG-CLI up by running commands and reading what they print. This contract is the
one shape in which setup commands report problems and say how to fix them, so an agent can act on
the output without parsing prose. The types live in [`src/setup-contract.ts`](../src/setup-contract.ts)
(types only). The rules below are checked by
[`test/setup-contract-check.ts`](../test/setup-contract-check.ts), which every example on this
page passes; the first CLI command that emits the contract moves the checker into `src/`.

**Status.** Emitted by `install.sh` (see [`docs/install.md`](install.md)). `doctor`, `connect` and
the managed update come in later PRs of the agent-compatibility plan (#137).

## What does not change

The contract is opt-in per command. Output that exists today stays exactly as it is:

- `chats --json`, `skill status --json` and the other list commands print a JSON array.
- `onboard --json` prints its own JSON lines (`{"event":"url",...}`, no `schema` field). It stops
  after `done`, `timeout` or `already_logged_in`. An `error` after `url` comes from the open page,
  which offers a retry and keeps waiting; an `error` with no `url` before it means the command could
  not start (for example the secret store could not be read) and has exited with code 1.
- `telegram mcp` writes only JSON-RPC messages to stdout.
- An ordinary command run with `--json` that fails prints one line `{"error":{"code","message",
  "hint"?,"command"?,"candidates"?,"retryAfterSeconds"?,"listedAt"?}}` on stdout (exit 3 keeps its own
  `{"error":"approval_required",...}` line). That is not a contract result: it has no `schema`.

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
      "fix": {
        "run": ["skill", "install", "--agent", "codex"],
        "profile": null,
        "expect": { "exit": 0 }
      }
    },
    {
      "id": "not_logged_in",
      "severity": "error",
      "message": "This profile has no Telegram login.",
      "fix": {
        "human": "Open the page and log in with a QR code from your phone.",
        "url": "https://better-tg-cli.com/login"
      }
    }
  ]
}
```

| Field                 | Meaning                                                                                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`              | Always `1` for this version. Any change to the shape gets a new number, a new optional field included: a schema 1 reader refuses fields it does not know. The content of `data` is the exception: it belongs to the command. |
| `ok`                  | `true` exactly when no problem has severity `error`.                                                                                                                                                                         |
| `problems`            | Empty when there is nothing to report.                                                                                                                                                                                       |
| `problems[].id`       | Stable snake_case id, unique within a result. Agents may match on it, so an id never changes meaning.                                                                                                                        |
| `problems[].severity` | `error` (setup does not work), `warning` (works, but should be fixed), `info`.                                                                                                                                               |
| `problems[].message`  | One line in English, for the agent and the person.                                                                                                                                                                           |
| `problems[].fix`      | Exactly one of the three kinds below.                                                                                                                                                                                        |
| `data`                | Optional. A JSON object with content specific to the command (see below).                                                                                                                                                    |

No other fields are allowed at any level in schema 1.

### `data`: what only this command reports

`data` is the one open field of schema 1. A command puts there what is specific to it, for example
an install path, version and target, as the installer reports them:

```json
{
  "schema": 1,
  "ok": true,
  "problems": [],
  "data": {
    "path": "/home/u/.local/bin/telegram",
    "version": "1.2.3",
    "target": "linux-x64"
  }
}
```

The generic checker only requires `data` to be a JSON object (not an array, not `null`) and does
not look inside it. Each command that sets `data` documents its shape next to the command and
tests it. A reader that does not know the command ignores `data`. Everything outside `data` stays
closed: a new field there still needs a new schema number.

### `fix`: run a command

```json
{
  "schema": 1,
  "ok": false,
  "problems": [
    {
      "id": "skill_missing",
      "severity": "error",
      "message": "Claude Code has no Better-TG-CLI skill.",
      "fix": {
        "run": ["skill", "install", "--agent", "claude-code"],
        "profile": null,
        "expect": { "exit": 0 }
      }
    }
  ]
}
```

- `run` is the argv **after** the `telegram` binary, never a shell string and never the binary
  itself. The agent runs it with the same `telegram` that printed the result.
- `run` must match an entry of `RUN_ALLOWLIST` in `test/setup-contract-check.ts`: the exact subcommand,
  then only the flags that entry allows, no positional arguments, values made of plain
  characters. Anything else is invalid, whoever produced it.
- `profile` is the `TG_PROFILE` to run it under, or `null` for the default profile. It is always
  explicit because several clients hand a process only a filtered environment.
- `expect` is always `{ "exit": 0 }`. Any other exit code, `3` (write approval needed) included,
  means the run did not fix the problem. Exit `0` alone does not mean it did (see below).

**After a `fix.run`, check again.** Exit `0` means only that the command ran. The agent then
re-runs the command that reported the problem, exactly as it ran it the first time, and trusts
that result, not the fix's exit code: the problem is fixed when its `id` is gone from the new
result. If it is
still there, the agent stops and passes the problem's `message` on; it does not run the same fix
again.

Today's only allowed fix shows why. `skill install` leaves a skill folder that holds someone
else's files alone, reports `"action": "skipped"` for that agent and still exits `0`
(`skill install --agent claude-code --json`, not a contract result):

```text
[{"agent":"claude-code","path":"/home/u/.claude/skills/better-tg-cli","action":"skipped","reason":"something else lives there; not touching it"}]
```

The check that follows still reports the problem, so it is not fixed:

```json
{
  "schema": 1,
  "ok": false,
  "problems": [
    {
      "id": "skill_missing",
      "severity": "error",
      "message": "Claude Code has no Better-TG-CLI skill.",
      "fix": {
        "run": ["skill", "install", "--agent", "claude-code"],
        "profile": null,
        "expect": { "exit": 0 }
      }
    }
  ]
}
```

`fixOutcome()` in the checker states this rule, and `fixRuns` in the fixtures holds the cases.

Allowed today: `skill install [--agent <ids...>] [--json]`. Later PRs add their own entries (`doctor --fix`,
`connect --refresh`). Never allowed: anything that changes write authority or credentials
(`write-access`, `auth`, `logout`); `onboard`, because its local page link carries a secret that
also sets the write mode, so logging in is always a `fix.human`; `update`, because it runs
Homebrew, Scoop, a global npm install or a source build, none of which a profile isolates (until a
managed update checks the install method and the user's policy); `mcp`, `api`, any Telegram
write, `skill install --force`.

### `fix`: the person has to do it

```json
{
  "schema": 1,
  "ok": false,
  "problems": [
    {
      "id": "session_revoked",
      "severity": "error",
      "message": "Telegram ended this login.",
      "fix": {
        "human": "Log in again: run telegram onboard and scan the QR code with your phone."
      }
    }
  ]
}
```

`human` is a sentence the agent passes on. `url`, when present, is an `https` string. A result
never carries the link of the local `onboard` page: that link holds the page's secret, and the page
can change the write mode.

### `fix`: nothing can fix it here

```json
{
  "schema": 1,
  "ok": false,
  "problems": [
    {
      "id": "secret_store_missing",
      "severity": "error",
      "message": "No secret store is available.",
      "fix": {
        "unavailable": "This Linux machine has no Secret Service and file storage is turned off by policy."
      }
    }
  ]
}
```

## Exit codes

For commands that emit this contract. Every other command follows the general table printed under
`telegram --help` (and in the skill's `setup.md`): `0` ok, `1` runtime error, `2` usage
(unknown option, invalid value, ambiguous chat name), `3` write approval needed, `4` write access
disabled, `5` not logged in or session ended. The two tables agree on `0`, `1` and `3`; `2` means
"a person is needed" only in a contract result, and "fix the command line" everywhere else.

| Code | Meaning               | From a result                                                             |
| ---- | --------------------- | ------------------------------------------------------------------------- |
| `0`  | All good              | `ok: true`                                                                |
| `1`  | Error                 | some `error` has `fix.run`, or one has `fix.unavailable`                  |
| `2`  | A person is needed    | every `error` has `fix.human`                                             |
| `3`  | Write approval needed | never from a result: only the write guard exits 3 (`EXIT_NEEDS_APPROVAL`) |

The exit code follows from the result (`setupExitCode()` in the checker), so a command that
computes it the same way cannot print one thing and exit with another.

## Event stream (`--events v1`)

A command that reports progress as it goes (later: `onboard`, `connect --watch`) prints contract
events only behind an explicit `--events v1`; without the flag its output stays as it is. No
command has the flag yet.

Each line is one JSON object with `schema` and a snake_case `event`. The command names its own
progress events. Proposed, and settled by the first command that emits events: the stream ends
with one terminal event, `done` (with the result), `error` (with a message) or `timeout`.

```jsonl
{"schema":1,"event":"human_channel","channel":"browser"}
{"schema":1,"event":"waiting_human"}
{"schema":1,"event":"done","result":{"schema":1,"ok":true,"problems":[]}}
```

## Open points

Chosen where the issue says nothing; the PRs that first emit the contract settle them:

- `fix.run` as the argv after the binary, `profile` as a name or `null`, `expect` as `{exit}`;
- the mapping from a result to exit code 1 or 2 in `setupExitCode()`;
- the terminal events of a stream: whether `already_logged_in` also ends one (it does in
  `onboard` today), whether `error` ends it or allows a retry (today it allows one), and whether
  `done` carries the result;
- the progress event names of each command (the plan lists `link`, `qr`, `human_channel`,
  `waiting_human`, `already_logged_in` for `onboard --terminal`);
- how an agent that cannot find `telegram` on its PATH learns the absolute path (the installer
  reports it);
- whether `fix.run` needs `--dry-run` support in the commands it names;
- whether a managed `update` (install method and policy checked first) becomes a `fix.run`, and
  whether an `--events v1` stream of `onboard` may show its page link at all.
