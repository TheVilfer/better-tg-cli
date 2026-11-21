# Better-TG-CLI plugins

Spec version `2026-11-21`. Manifest schema:
[`schemas/tg-plugin/2026-11-21.json`](../schemas/tg-plugin/2026-11-21.json)
(published as `https://better-tg-cli.com/schemas/tg-plugin/2026-11-21.json`), JSON Schema 2020-12.

A plugin teaches the agent something new about Telegram: when to act (triggers), what to do
(instructions and templates), what to ask the user first (onboarding), and what to remember (data
the agent saves). It is a public GitHub repository or a local folder with `tg-plugin.json`,
`SKILL.md` and resources. The human installs, updates and removes plugins; the agent discovers them
through the CLI, reads their text as data, and stores what the model wrote.

Plugin support lands in steps. Parts marked **(coming)** are specified here but not implemented yet:

| Step | What | Status |
|---|---|---|
| P1 | Manifest, install by snapshot, `list`, `show`, `data`, `remove`, `validate`, human confirmation | **available** |
| P2 | Sandboxed plugin code (QuickJS-WASM), host API, `plugin run`, `plugin dev --mock` ([#153](https://github.com/TheVilfer/better-tg-cli/issues/153)) | **available** |
| P3 | Network access and secrets the plugin never sees ([#154](https://github.com/TheVilfer/better-tg-cli/issues/154)) | coming |
| P4 | Plugin management over MCP (a dialog), `plugin update` ([#155](https://github.com/TheVilfer/better-tg-cli/issues/155)) | coming |
| P5 | SDK and template repository ([#156](https://github.com/TheVilfer/better-tg-cli/issues/156)) | coming |
| P6 | The official Tone of Voice plugin ([#157](https://github.com/TheVilfer/better-tg-cli/issues/157)) | coming |
| P7 | Live checks in Claude Code, Grok Bot and Aside ([#158](https://github.com/TheVilfer/better-tg-cli/issues/158)) | coming |

## 1. Principles

1. **Isolated by default.** Plugin code runs in a QuickJS-WASM sandbox inside the
   CLI. It has no files, processes, environment, Telegram session or direct network: only the host
   API its permissions grant.
2. **Explicit permissions and effects.** Every permission is declared in the manifest, shown to the
   human at install and checked by the host on every call. Everything else is denied. A command that
   changes something or sends data out declares it as an effect and goes through the write path.
3. **Only the core writes to Telegram.** A plugin proposes a typed action; the host
   builds the command and its confirmation text, and the agent runs it through the write guard.
4. **The human decides what is installed and which secrets are given.** Install, update, remove and
   entering secrets are the human's. An installed snapshot is pinned by hashes.
5. **Plugin text is data, not authority.** The agent gets triggers and instructions from
   `plugin list` and `plugin show`, always with their source. They never grant consent to share the
   conversation, touch other plugins or bypass Better-TG-CLI's rules.

## 2. Flow

```
human: "install plugin X"
agent: telegram plugin install github:owner/x    → summary: permissions, effects, where data goes → the human confirms
agent: telegram plugin list --json               → triggers, onboarding, each with a ready argv (data with its source)
agent: telegram plugin show x --onboarding       → onboarding steps
agent: telegram plugin run x collect …           → a read in the sandbox → result with a cursor
agent: telegram plugin data set x style -        → save what the model wrote (a local write)
...when a trigger fits:
agent: telegram plugin show x --trigger compose  → instructions
agent: telegram plugin run x <cmd> …             → proposals: [{ type: "reply", argv, stdin, confirm }]
agent: telegram reply …                          → guard and confirmation as the write mode says (section 7)
```

The agent follows the instructions with the CLI's own commands (`read`, `send`, `reply`, …), runs
the plugin's commands with `plugin run`, and keeps what the model wrote with `plugin data set`.

## 3. The plugin package

```
tg-plugin.json        the manifest
SKILL.md              instructions for the agent; Agent Skills format (frontmatter: name = plugin name, description)
*.md, templates/*     resources
dist/plugin.js        optional code: one ES2023 module without imports, run in the QuickJS sandbox
```

**Path rules.** `files` is the complete list; nothing else is installed or read. Each path is:
- relative, `/`-separated, made only of `[A-Za-z0-9._/-]`;
- canonical: no `.` or `..` segments, no empty segments, no names Windows reserves (`CON`, `PRN`,
  `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, with any extension), no segment ending in a dot, at most
  200 characters;
- unique ignoring case, for files and for the folders on their way (`Templates/a.md` and
  `templates/b.md` clash), and never both a file and a folder;
- a regular file: no symbolic links (also not as a parent folder) and no git submodules.

`tg-plugin.json` and `SKILL.md` must be in `files`. The host reads only the files of the installed
snapshot (section 9). `resources` and `storage` give **logical names**, never paths. `plugin
validate` checks that the `name` in the frontmatter of `SKILL.md` equals the plugin name, and the
host puts the snapshot in a folder with that name (`plugins/<installId>/<name>/`), as Agent Skills
requires.

Limits: `tg-plugin.json` up to 64 KB, each file up to 1 MB, at most 200 files and 5 MB together.

### Manifest

```json
{
  "$schema": "https://better-tg-cli.com/schemas/tg-plugin/2026-11-21.json",
  "name": "tone-of-voice",
  "version": "1.0.0",
  "description": "Writes messages in the user's own voice when no exact text is given",
  "author": { "name": "Better-TG-CLI team", "url": "https://github.com/TheVilfer" },
  "license": "MIT",
  "engines": { "better-tg-cli": ">=0.41.0" },
  "main": "dist/plugin.js",
  "files": ["tg-plugin.json", "SKILL.md", "onboarding.md", "templates/style.md", "dist/plugin.js"],
  "permissions": ["messages:read-own", "storage:read"],
  "network": [],
  "secrets": [],
  "settings": {},
  "resources": { "compose": "SKILL.md#compose", "onboarding": "onboarding.md", "template": "templates/style.md" },
  "storage": { "keys": ["style"], "quotaBytes": 262144 },
  "commands": [
    {
      "name": "collect",
      "description": "Collect the user's own messages for style analysis",
      "effects": [],
      "input":  { "type": "object", "properties": { "limit": { "type": "integer", "minimum": 1, "maximum": 2000 }, "types": { "type": "array", "items": { "enum": ["private", "group"] } }, "cursor": { "type": "string" } }, "required": ["limit"], "additionalProperties": false },
      "output": { "type": "object", "properties": { "messages": { "type": "array" }, "cursor": { "type": ["string", "null"] }, "remaining": { "type": "integer" }, "done": { "type": "boolean" } }, "required": ["messages", "cursor", "remaining", "done"] }
    }
  ],
  "triggers": [ { "id": "compose", "when": "The user asks to write or reply to someone but gives no exact text", "resource": "compose" } ],
  "onboarding": { "resource": "onboarding", "doneWhen": { "storage": "style" } }
}
```

- **`$schema`** (required) names the spec version the manifest is written for. The CLI reads the
  current and the previous spec version; a newer one is refused with `plugin_unsupported` and a hint
  to update the CLI.
- **`name`**: Agent Skills format, `^[a-z0-9]+(-[a-z0-9]+)*$`, up to 64 characters. Equals the `name`
  in the frontmatter of `SKILL.md`.
- **`version`**: SemVer 2.0. **`engines.better-tg-cli`**: a range in `node-semver` syntax
  (comparators, `^`, `~`, X-ranges, hyphen ranges, `||`). A prerelease CLI (`0.41.0-rc.1`) matches
  only a range that names a prerelease of the same version (`>=0.41.0-rc.0`). Syntax the CLI does not
  understand makes the manifest invalid; it never counts as a match.
- **`description`**, **`author.name`**, **`triggers[].when`** and other text fields are one line
  each (no control characters); `when` is at most 200 characters.
- **`resources`**: logical name → a file in `files`, or `file.md#heading-slug` for one section of a
  Markdown file: the heading whose GitHub-style slug matches (lowercase, punctuation dropped, spaces
  to hyphens) up to the next heading of the same or a higher level; headings in code fences do not
  count. `plugin validate` checks that the heading exists.
- **`storage`**: the keys the agent may save (`^[a-z0-9][a-z0-9._-]{0,63}$`) and the total quota per
  account (default 256 KB, at most 4 MB).
- **`triggers[]`**: `id`, `when` and the resource with the instructions. **`onboarding`**: its
  resource and `doneWhen.storage`, a declared storage key; onboarding is done once that key holds
  data for the current Telegram account.
- **`input`/`output` schemas**: JSON Schema 2020-12, self-contained: `$defs` inside their own schema,
  no external `$ref`, no `$id`, no `$schema` other than 2020-12. `input` is an object. Only the
  keywords the host implements are allowed (an unknown one makes the manifest invalid), and no
  regular expressions (`pattern`, `patternProperties`): the host checks plugin values on its own
  thread, where a runaway expression could not be stopped; check such values in the plugin's code.
  The host checks the input before a call (a failure is exit 2, `invalid_argument` with `issues`)
  and the output after it (`plugin_error` with `issues`), each check limited to 2 s.
- **`effects`**: a subset of `["storage", "network", "actions"]`, each needing its permission
  (`storage:write`, `network`, `actions`). An empty list means the command only reads (section 8).
  Commands need `main`.
- **`network`** lists origins only with the `network` permission and vice versa; every secret's
  `inject.origin` is in `network` (section 6).

## 4. Runtime

- **Engine.** QuickJS in WebAssembly (`quickjs-emscripten-core` with the single-file variant
  `@jitl/quickjs-singlefile-mjs-release-sync`, WASM embedded), bundled in the CLI: the npm bundle
  grew by about 0.3 MB compressed (0.61 → 0.92 MB). It is loaded only when a plugin command runs.
  The same code runs in the npm install (node), the standalone Bun binaries and the MCP server's
  worker threads (Claude Desktop `.mcpb`).
- **Globals.** ECMAScript and `host` only: no `require`, `process`, `fetch`, `WebAssembly`, `Bun`,
  `std`/`os`, `setTimeout`, no `import`. `host` is deeply frozen.
- **Isolation.** Every run gets a new WebAssembly instance, runtime and context, all dropped
  afterwards. Nothing survives between runs except `host.storage`. Values cross the boundary only as
  JSON text: the plugin never holds a host object, and the host parses everything the plugin returns
  itself (a plugin that swaps `JSON` or a prototype only changes its own values).
- **Async.** Host calls return guest Promises. The host runs the job queue right after calling the
  command and after each host operation completes, until the command's promise settles. With no host
  operation in flight and the promise still pending, nothing can settle it: the run ends with
  `plugin_error` at once (so `await 0` never hangs, and neither does a promise nobody resolves).
- **Deadline.** 60 s for the whole run, waiting for Telegram included. When it passes or the run is
  cancelled (MCP cancel, a closed channel, SIGTERM/SIGINT in a terminal), the host interrupts the
  engine, aborts the operations in flight, starts no new ones and drops late results (no late writes).
- **Default limits:** 64 MB memory; 256 KB of guest stack; 200 host calls per run, at most 4 at a
  time (a fifth concurrent call ends the run); up to 1 MB of arguments per call and 1 MB of result
  handed into the sandbox; 1,000,000 promise jobs between two host operations; the whole output
  envelope up to 60,000 characters after serialization. Exceeding one gives `plugin_limit` with the
  limit's name in `limit` (`timeout`, `memory`, `stack`, `hostCalls`, `concurrentCalls`,
  `callBytes`, `jobs`, `output`, `schema`). A limit ends the run even if the plugin catches the error.
- **Contract.** The module exports `commands`. The host calls `commands[name](input, host)` (an own
  property that is a function) and checks the result with the `output` schema.
- **Output envelope.** The host prints `{"data": <the plugin's result>, "proposals": [...]}`. Only the
  host builds `proposals` (section 7); a `proposals` field inside the plugin's result stays in `data`.
- **Lossless JSON.** Plugin output keeps `null` and empty values (it is never passed through the
  CLI's `formatJson()`); `--json` prints one line, without it the same JSON indented.

```js
export const commands = {
  async collect({ limit, types = ['private'], cursor }, host) {
    const page = await host.messages.mine({ limit, types, cursor });   // the host caps the page by size
    return { messages: page.messages, cursor: page.cursor, remaining: limit - page.count, done: page.done };
  },
};
```

## 5. Host API and permissions

| Permission | API | What it gives |
|---|---|---|
| — | `host.now()`, `host.random()`, `host.input` | time, random numbers, the checked input |
| `identity:read` | `host.me()` | the owner's ID and name |
| `messages:read-own` | `host.messages.mine({limit, types, since, cursor})` | only the owner's own text (below) |
| `chats:read` | `host.chats.list({limit, types, unreadOnly})` | ID, title, type, `muted`, `unreadCount`; no previews |
| `messages:read` | `host.messages.read(chat, {limit, before, topic, thread})`, `host.messages.search(query, {chat, topic})` | other people's messages; a separate warning at install |
| `messages:read-target` | `host.target.message()` or `host.target.thread({limit, before})` | only what the agent passed to this run: `--target <chat>:<msgId>` (one message), `--target <chat>:<msgId> --thread` or `--target <chat>@<topic>` (a thread or topic) |
| `storage:read` | `host.storage.get(key)`, `host.storage.list()` | this installation's data for the current owner |
| `storage:write` (effect `storage`) | `host.storage.set(key, value)`, `host.storage.delete(key)` | atomic writes within the total `quotaBytes` |
| `network` (effect `network`) | `host.http.fetch(url, {method, headers, body})` | only the origins in `network` (section 6; coming, P3: until then a command with the effect `network` is refused with `plugin_unsupported`) |
| `settings:read` | `host.settings.get(key)` | non-secret settings from the `settings` schema (until `plugin settings set` arrives in P3, each setting's `default`) |
| `actions` (effect `actions`) | `host.actions.propose(action)` | a typed proposal (section 7) |

**What a command gets** is its manifest's permissions and its own effects together: a command with
`effects: []` has no `storage.set`/`storage.delete` and no `actions.propose`, even when the plugin
holds `storage:write` or `actions`. An API that is not granted does not exist on `host`.

**Arguments.** A chat is a numeric ID or an `@username`, never a title. `limit` is at most 100 for
`read`, `search` and `target.thread` (default 20), at most 2000 for `mine` (default 100), at most 500
for `chats.list` (default 100). Storage values are strings (the same text `plugin data get` prints;
`JSON.stringify` an object first), under the keys the manifest declares.

**What the read APIs return.** A narrow shape built by the host, never Telegram's own objects (no
buttons, entities, quotes or link previews): `read` and `target.thread` give
`{chatId, messages: [{id, date, out, senderId?, text, forwarded?, service?, replyToMsgId?}], before}`
(pass `before` for the next page; `null` at the start of the history), `search` gives the same
messages with their `chatId`, `target.message` gives `{chatId, message}`, `chats.list` gives
`{chats: [{id, title, type, muted, unreadCount}]}`, `me` gives `{id, name, username?}`.

**`messages.mine({limit, types, since, cursor})`** returns only messages the owner wrote:
forwards, replies that quote another chat's message from 777000/489000, messages in the chats of
777000 and 489000, service events and messages without text are dropped before any text is read.
`types` are `private` (people, not bots; the default) and `group` (groups and supergroups); `since`
is an ISO date or Unix seconds. Each message has its text, date and chat type, no other
participants. Chats are walked by last activity (the first 100 that match, fixed on the first page),
each from newest to oldest. A page is capped by serialized size (about 40,000 characters) and by 20
Telegram requests, and returns `{messages, count, cursor, done}`; `cursor` is opaque, bound to the
account, checked strictly and never trusted: every filter is applied again whatever it says. The
last page has `done: true` and `cursor: null`.

**Masking before the sandbox**, for every read API, in the shell and over MCP alike: messages from
777000/489000, forwards of them and replies quoting them get the `service` mask and `service: true`
(`mine` drops them); ordinary messages the `echo` mask (codes after "code:", gift links). Over MCP
the plugin's `data` and the proposal texts are masked with `maskForModel` (`echo`) as well.

**FLOOD_WAIT.** Calls from plugins never sleep (`floodSleepThreshold = 0`): they fail with
`{code: "flood_wait", retryAfterSeconds, cursor, partial: {messages, count}}`; for `mine`, `cursor`
continues right after `partial`, so nothing is lost or repeated. If the command passes the error on,
`plugin run` fails with the same `flood_wait`, `retryAfterSeconds`, `cursor` and `partial`, taken from
the host's own record of the call, never from what the plugin threw.

**Errors** reach the plugin as thrown `Error`s with `code`, `message` (masked) and their other fields
(`retryAfterSeconds`, `cursor`, `partial`): the CLI's codes plus `permission_denied`,
`invalid_argument`, `no_target`, `not_available` (the target is a message, not a thread, or the
reverse), `not_found`, `invalid_proposal`. An error the command does not catch ends the run with
`plugin_error`. **Logs**: `host.log(...)` exists only in `plugin dev` and appends to
`<tmp>/better-tg-cli-plugin-dev/<name>.log`, never to the command's output or MCP.

## 6. Network and secrets (coming, P3)

- **`network`** lists exact HTTPS origins (`"https://api.example.com"`, port 443 by default). The host
  resolves the address itself and refuses loopback, private, link-local and multicast IPs; redirects
  are off; requests up to 256 KB, responses up to 1 MB after decompression; no cookies; the headers
  `Host`, `Cookie` and `Authorization` cannot be set by the plugin.
- **Secrets** are never visible to the plugin. The manifest says where the host injects the value:

  ```json
  "secrets": [ { "name": "openai", "description": "API key", "inject": { "origin": "https://api.openai.com", "header": "Authorization", "format": "Bearer {value}" } } ]
  ```

  Only the human enters the value: `plugin secret set <name> <secret>` in their terminal, input
  hidden (never MCP form elicitation). It is kept in the system secret store under a key the core
  builds from the profile, the installation ID and the secret name. `inject.paths` can narrow it to
  some paths. The host removes the exact value and its formatted form from the response body and
  headers before the sandbox sees them.
- **The install summary** names every data source with its destinations.

## 7. Action proposals

A plugin never writes. With the `actions` permission and effect it returns typed proposals; the
host checks them and builds the command:

| `type` | Fields | Command the host builds |
|---|---|---|
| `send` | `chat`, `text`, `topic?` | `send <chat> - [--topic N]` |
| `reply` | `chat`, `msgId`, `text`, `topic?` | `reply <chat> <msgId> -` |
| `react` | `chat`, `msgId`, `emoji` | `react <chat> <msgId> <emoji>` |

The result holds `proposals: [{id, type, summary, argv, stdin, confirm: true}]` (`react` has no
`stdin`), all built by the host from the same checked fields, so a plugin cannot describe one action
and run another: `chat` is an ID or `@username`, `msgId` and `topic` positive integers, `text` 1–4096
characters, `emoji` one reaction (never an option); any other field is refused (`invalid_proposal`).
A reply's `topic` is accepted but needs no flag (a reply lands where its message is). At most 20
proposals per run. `host.actions.propose` returns `{id}`. v1 has no file
actions, admin commands, raw API, write-mode changes or plugin management. The agent runs a proposal
like any write: in mode `ask` the user approves the exact action (MCP dialog, `approval_required`,
or exit 3 and `TG_APPROVE` in the shell); in `on`, `confirm: true` obliges the agent to show the
recipient and the full text and wait for a yes; in `read-only` it shows the draft and stops.

## 8. CLI commands and the read/write path

| Command | Class | Who | Status |
|---|---|---|---|
| `plugin list [--json]` | read | anyone | available |
| `plugin show <name> (--trigger <id> \| --onboarding \| --resource <key>) [--json]` | read | anyone | available |
| `plugin data get\|list <name> [key] [--json]` | read | anyone | available |
| `plugin data set <name> <key> [-]`, `plugin data delete <name> <key>` | local write | anyone | available |
| `plugin install <github:owner/repo[@ref] \| ./dir [--expect sha256-…]>` | management | human | available |
| `plugin remove <name> [--keep-data]` | management | human | available |
| `plugin validate <dir> [--json]` | for authors | anyone (not over MCP) | available |
| `plugin run <name> <cmd> [--input <json> \| -] [--target <ref> [--thread]] [--json]`, command with `effects: []` | read | anyone | available |
| `plugin run <name> <cmd> …`, effect `storage` and/or `actions` | local write | anyone | available |
| `plugin run <name> <cmd>`, effect `network` | **sends data out**: a write in every transport, the shell too | anyone | coming, P3 |
| `plugin settings set <name> <key> <value>` | local write | anyone | coming, P3 |
| `plugin secret set <name> <secret>` | human's terminal only | human | coming, P3 |
| `plugin update [name]` | management | human | coming, P4 |
| `plugin dev <dir> <cmd> --mock [--input …] [--target …] [--json]` | for authors | anyone (not over MCP) | available |

- **`plugin run`** loads the installed snapshot once (checked against the lock) and runs those
  bytes. `--input` is the command's input as a JSON object (`-` reads it from stdin; absent: `{}`).
  Over MCP `telegram_read` passes no stdin, so a read command takes its input inline
  (`["plugin","run","x","collect","--input","{\"limit\":300}"]`); `telegram_write` passes `stdin`.
  `--target` is for plugins with `messages:read-target` only. `plugin list --json` lists each command
  with `access` (`read`, `local write`), its `input` schema and the `argv` to run.
- **`plugin dev <dir> <cmd> --mock`** checks the folder as `validate` does and runs a command against
  the built-in mock account in memory: no confirmations, nothing installed or written, no profile,
  session or secret store touched; storage starts empty, settings are their defaults, and `host.log`
  works (section 5). Without `--mock` it is refused: for a live check, install the folder.
- **Local writes** (`plugin data set|delete`, `plugin run` of a command with effects): in a terminal they need no write access, like
  `download`. Over MCP they run only through `telegram_write` and follow the write mode
  (`assertLocalWriteAllowed`): refused on a read-only server or in mode `read-only`, approved each
  time in `ask` (the approval shows the plugin, the key and the full value, and covers exactly that
  value). `telegram_read` refuses them, and the CLI stops a write that arrives as a read
  (`write_on_read_tool`).
- **The human**: install and remove ask for a y/N in a real terminal or a system dialog (macOS,
  Windows). No write mode skips it (`on` included), and a `TG_APPROVE` code never stands in for it.
  Without a terminal or dialog the command is refused (`no_human_channel`); a "no" is
  `not_confirmed`. Over MCP both are refused **before anything is fetched** (`human_required`) with the
  exact command for the human's terminal on the server's machine, with the profile:
  `TG_PROFILE=dev telegram plugin install github:owner/repo@v1`. The arguments are parsed as the CLI
  parses them: `--expect sha256-…` (checked) stays in the command, so it still installs only the
  content that was validated; anything else unexpected gives no command at all. A mock server's
  command carries its `TG_MOCK=…` (and mock `TG_PROFILE`), so running it never touches the
  terminal's real profile. On Windows the dialog's text reaches a fixed PowerShell script on stdin, so
  no summary is too long for it. The MCP dialog for this, with
  elicitation, is **coming (P4)**; it will refuse on a `--read-only` server and pin the CLI version
  (`npx better-tg-cli@X.Y.Z …`) where there is no `telegram` binary.
- **Binding to the snapshot.** The approval of a `plugin run` (in mode `ask`: the MCP dialog,
  `approval_required` or `TG_APPROVE`) shows the plugin, the command, the installation and revision,
  the effects and the input, and its hash covers the `installId`, the revision, the command's effects
  and the input. The run checks that the installation it loaded is the approved one
  (`plugin_changed`), so a plugin removed and installed again (or updated) in between needs a new
  approval. The MCP server classifies from the installed manifest, and the run decides again from
  the snapshot it loaded: a command that gained an effect is refused on `telegram_read`
  (`write_on_read_tool`).
- **Cancellation over MCP.** `notifications/cancelled` is handled as soon as it arrives, past the
  request queue: a plugin run in progress is stopped (the child CLI gets SIGTERM, a worker thread a
  message and a flag in shared memory its sandbox polls; either is killed if it has not stopped
  after 2 s), a run still waiting in the queue never starts, and neither gets a response. Over stdio
  a closed channel cancels the plugin runs too; over Streamable HTTP only the client's notification
  does. Other commands are not cancelled this way.
- **MCP.** `telegram_read` runs exactly `plugin list`, `plugin show`, `plugin data get` and
  `plugin data list`, and `plugin run` for commands without effects (known from the installed
  manifest before the run). Everything else goes through `telegram_write` or is refused (`validate`
  and `dev` read a folder and stay in the terminal); a new subcommand is refused until it is
  classified.
- **Discovery.** `check --json` has `plugins: [{name, version, status, onboarding?}]` (from the local
  lock file, no network; `onboarding` is `done|pending|unknown` for the current account), and text
  `check` one line. MCP `initialize` instructions carry one static line: see `telegram_read
  ["plugin","list"]`. `send --help`, `reply --help` and the main `SKILL.md` have one line each.
- **Plugin text as data.** `plugin list --json` returns `{notice, plugins: [...]}`; each plugin has
  `source: "plugin:<name>@<version>"`, `status` (`ok`, `tampered`, `unsupported`), its accepted
  permissions and effects, `triggers: [{id, when, argv}]` and `onboarding: {state, argv, doneWhen}`,
  where `argv` is ready to run (`["plugin","show","<name>","--trigger","<id>"]`). `plugin show --json`
  returns `{source, kind, id, notice, text}` (plus `when`, or `state` and `doneWhen`); text output
  starts with `[plugin:<name>@<version> …]` and the notice that plugin text ranks below Better-TG-CLI's
  rules. A resource is read only by its logical name, never by a path.

## 9. Install, storage, trust

- **Snapshot.** Install pins the exact revision: for GitHub, the ref (or the default branch) is
  resolved to a commit SHA through the GitHub REST API; each listed file is looked up in that
  commit's trees (a symbolic link or submodule is refused, sizes are checked before anything is
  downloaded) and fetched as a git blob whose SHA-1 is verified. No tarball, no token, public
  repositories only. For a local folder the revision is the content hash: `sha256-<base64>` of the
  sorted lines `<path> NUL <file hash> LF`; `plugin validate` prints it, and
  `plugin install ./dir --expect sha256-…` installs only that content. The files are written to a
  temp folder, checked and moved into `plugins/<installId>/<name>/` with one rename.
- **The summary** the human confirms starts with what the host computed (source, revision, official,
  profile, size), then the permissions in plain words, the effects, where data may go, secrets, and
  last the plugin's own words (description, author, triggers), one line each.
- **Lock file** `plugins/plugin.lock.json` (the install registry): per plugin the source and
  revision, the `sha256-<base64>` hash of the manifest and of every file (the same set the manifest
  lists), the accepted permissions, effects, origins and secret names, `official`, `installId` (a
  UUID) and the spec version. The registry is **signed**: an HMAC-SHA256 over its canonical JSON
  (sorted keys) with a 256-bit key kept in the profile's secret store, the one that holds the session
  (Keychain, Secret Service, DPAPI, 1Password; one key per profile, created at the first install).
  Its signature is checked before anything in it is used. Without a secret store nothing is installed
  (`secret_store_unavailable`); a registry whose key is missing or whose signature does not match is
  refused as a whole (`plugin_lock_invalid`). An empty or missing registry is never signed or
  checked, so a profile without plugins never touches the store. Before `list`, `show`, `data` and
  `run`, the host also checks that the folder holds exactly the locked files with their
  hashes, no links, and a manifest that declares nothing beyond what was accepted. On a mismatch the
  plugin is disabled with `plugin_tampered`; `plugin remove` still works. The registry is still read
  as untrusted input: names, IDs and paths in it are checked before use, and it is a map without a
  prototype (a file called `__proto__` or a plugin called `constructor` is an ordinary name).
- **Threat model of the registry.** The signature stops a process that can write the profile folder
  but not the secret store (an agent editing files, a sync tool) from changing what was installed:
  a file together with its hash, a permission, the `official` mark. Replaying an earlier registry
  signed with the same key (with its snapshot folders, e.g. from a backup) is not detected: it brings
  back what the human once confirmed. A process of
  the same user that can also write the secret store can sign whatever it likes, as it can read the
  session itself; that is out of scope, as it is for approvals.
- **On disk.** Everything lives under the profile's config folder (`~/.config/tg[-<profile>]/`,
  `%APPDATA%\tg[-<profile>]\` on Windows): folders `0700`, files `0600` on POSIX, written atomically.
  Under `TG_MOCK` it lives next to the mock state file instead (`<state>.plugins/`, its registry key
  in a `0600` file there), so a mock run never changes a real profile, whatever the profile is
  called. Nothing below that folder is reached through a link: every path is walked component by
  component from the folder's real path, a symbolic link or Windows junction anywhere is refused,
  the file is opened with `O_NOFOLLOW` and read from its descriptor only after the descriptor and
  every folder on the way are checked to be the ones the walk saw (device and inode). A local plugin
  folder is read the same way. Data `get` refuses a file with more than one hard link.
- **One change at a time.** Install, remove and `data set/delete` (the quota check and the write
  together) run under the lock file `.plugins.lock` (created with `O_EXCL`; a lock left by a process
  that is gone, or older than 10 minutes, is taken over; otherwise `plugin_busy` after 15 s). It is
  never held across the human's dialog or a download: under the lock, `remove` checks that the
  registered installation is still the one the human was shown, and `data set/delete` that the
  plugin they write for is still installed (`plugin_changed` otherwise). In write mode "ask" an
  approval of `data set/delete` covers the `installId` and revision too, so it does not carry over
  to a plugin installed under the same name since.
- **Identity of an installation.** Data (`plugin-data/<installId>/<telegram-user-id>/`, keys are
  logical names `^[a-z0-9][a-z0-9._-]{0,63}$`, declared in `storage.keys`) and secrets are bound to the
  `installId`. After `remove --keep-data`, installing the same name again (from any source) is a new
  installation: the old data is not attached.
- **Update** (coming, P4) is a new snapshot. Permissions, effects, origins and secrets not accepted
  before need a new confirmation; without it the old snapshot stays. Until then, installing a name
  that is installed is refused (`plugin_exists`).
- **Official plugins**: a list of owners inside the CLI (`TheVilfer`), matched against the canonical
  owner GitHub returns, and only for a commit that repository published itself: the ref named at
  install is one of its branches or tags (annotated tags peeled) pointing at the commit, or the
  commit is in the history of its default branch (the compare API answers `identical` or `behind`).
  GitHub serves every fork's commits through the upstream repository too, so a commit pinned by SHA
  from a fork installs as a third-party plugin, and the summary says why. The mark grants nothing:
  install still asks the human.
- **Audit** (`audit.jsonl` of the profile): install (also a declined one), remove, `data set` and
  `data delete` with the plugin, version, revision, installation ID, key and size; every `run` with
  the plugin, revision, installation, command, the names of the host APIs it called, the types of the
  proposals it returned and the outcome (an error code); from P3 settings and secrets (names only).
  Inputs, results, bodies, values, headers and secrets are never written.
- **Onboarding** is per Telegram account: another account on the same profile starts `pending`.

## 10. Versions and compatibility

- **Date versions.** The manifest schema and the host API are versioned by date (`2026-11-21`), as
  MCP is. The CLI supports the current and the previous version; a newer one is refused with
  `plugin_unsupported` and a hint to update the CLI.
- **New APIs are added without breaking.** A plugin checks that `host.x` exists before calling it.
- **Error codes:** `plugin_invalid` (the plugin breaks the spec; `validate` lists every problem),
  `plugin_unsupported`, `plugin_not_found`, `plugin_exists`, `plugin_tampered`,
  `plugin_revision_mismatch`, `plugin_source_not_found`, `plugin_lock_invalid`, `plugin_limit`
  (a sandbox limit or the storage quota, named in `limit`), `plugin_error` (the command failed, or
  its result broke the output schema), `cancelled`, `flood_wait`, `plugin_busy`, `plugin_changed`, `plugin_data_unsafe`, `secret_store_unavailable`,
  `dialog_failed` (the Windows dialog could not be shown; not the same as the human's No),
  `human_required`, `no_human_channel`, `not_confirmed`, `rate_limited` (GitHub API).
- **Exit codes, as the CLI's:** 2 bad arguments, an unknown command or an input that fails its schema;
  1 a plugin error or a limit; 3 and 4 only for actions the agent runs.
- **Acceptance test of the spec** (coming, P6): `plugin validate` accepts the published Tone of Voice,
  and the SDK and the CLI check the same `collect` answer against its schema alike.

## 11. SDK for authors (coming, P5)

- **`@better-tg/plugin-sdk`**: types of `host` and the manifest, `definePlugin()`; a build into
  `dist/plugin.js` (ES2023, one file, no imports); a test host on mock data with HTTP fixtures:
  `runCommand('collect', {limit: 10}, {mock: true})`.
- **Template** `TheVilfer/tg-plugin-template`: manifest, `SKILL.md`, an example command, tests, CI with
  `plugin validate` and a mock test.
- **`plugin dev <dir> <cmd> --mock`** (available, section 8): no confirmations; Telegram, storage and
  settings are mock data. Secrets and HTTP answers from local fixtures (`dev/fixtures/*.json`) come
  with network access (P3). For a live check, install from the folder.
- **Reference plugin**: Tone of Voice, written only from this spec.

## 12. The official Tone of Voice plugin (coming, P6)

- **Permissions:** `messages:read-own`, `storage:read`. No network, no other people's messages, no
  `actions`: the agent's model writes the draft from the style document.
- **Onboarding:** the agent asks for consent and how much to read (about 300 of the user's own
  messages from private chats by default); `plugin run tone-of-voice collect --input '{"limit":300}'`,
  then further pages with `cursor` and `limit = remaining` until `remaining` is 0 or `done` (on
  `flood_wait` it waits `retryAfterSeconds` and goes on from the error's `cursor`); it fills the
  template (`plugin show tone-of-voice --resource template`), shows the document and saves it with
  `plugin data set tone-of-voice style -`. On a read-only MCP server it cannot be saved: the agent says
  so and suggests onboarding where writes are allowed.
- **Trigger `compose`:** a new message ("write to Alice that…") → `send <chat> - [--topic N]`; a reply
  to a specific message → `reply <chat> <msgId> -`. The agent reads the style (`data get`) and the
  context (`read <chat> -n 10`), writes a draft and confirms it as section 7 says. The user's exact
  text is sent as is.

## 13. Not in v1

Native code with full access; events and background work (subscriptions, schedules); plugin UIs
(onboarding goes through the agent); proposals with files; a plugin catalog and author signatures
(Sigstore, provenance).
