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
| P2 | Sandboxed plugin code (QuickJS-WASM), host API, `plugin run` ([#153](https://github.com/TheVilfer/better-tg-cli/issues/153)) | coming |
| P3 | Network access and secrets the plugin never sees ([#154](https://github.com/TheVilfer/better-tg-cli/issues/154)) | coming |
| P4 | Plugin management over MCP (a dialog), `plugin update` ([#155](https://github.com/TheVilfer/better-tg-cli/issues/155)) | coming |
| P5 | SDK and template repository ([#156](https://github.com/TheVilfer/better-tg-cli/issues/156)) | coming |
| P6 | The official Tone of Voice plugin ([#157](https://github.com/TheVilfer/better-tg-cli/issues/157)) | coming |
| P7 | Live checks in Claude Code, Grok Bot and Aside ([#158](https://github.com/TheVilfer/better-tg-cli/issues/158)) | coming |

## 1. Principles

1. **Isolated by default.** Plugin code **(coming, P2)** runs in a QuickJS-WASM sandbox inside the
   CLI. It has no files, processes, environment, Telegram session or direct network: only the host
   API its permissions grant.
2. **Explicit permissions and effects.** Every permission is declared in the manifest, shown to the
   human at install and checked by the host on every call. Everything else is denied. A command that
   changes something or sends data out declares it as an effect and goes through the write path.
3. **Only the core writes to Telegram.** A plugin proposes a typed action **(coming, P2)**; the host
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
agent: telegram plugin run x collect …           → (coming, P2) a read in the sandbox → result with a cursor
agent: telegram plugin data set x style -        → save what the model wrote (a local write)
...when a trigger fits:
agent: telegram plugin show x --trigger compose  → instructions
agent: telegram plugin run x <cmd> …             → (coming, P2) proposals: [{ type: "reply", argv, stdin, confirm }]
agent: telegram reply …                          → guard and confirmation as the write mode says (section 7)
```

In P1 the agent follows the instructions with the CLI's own commands (`read`, `send`, `reply`, …)
and keeps what the model wrote with `plugin data set`.

## 3. The plugin package

```
tg-plugin.json        the manifest
SKILL.md              instructions for the agent; Agent Skills format (frontmatter: name = plugin name, description)
*.md, templates/*     resources
dist/plugin.js        optional code: one ES2023 module without imports, for QuickJS (runs from P2 on)
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
- **`input`/`output` schemas** (used from P2 on): JSON Schema 2020-12, self-contained: `$defs` inside
  their own schema, no external `$ref`, no `$id`, no `$schema` other than 2020-12. `input` is an
  object. The host checks the input before a call and the output after it, with a time limit.
- **`effects`**: a subset of `["storage", "network", "actions"]`, each needing its permission
  (`storage:write`, `network`, `actions`). An empty list means the command only reads (section 8).
  Commands need `main`.
- **`network`** lists origins only with the `network` permission and vice versa; every secret's
  `inject.origin` is in `network` (section 6).

## 4. Runtime (coming, P2)

- **Engine.** QuickJS in WebAssembly (`quickjs-emscripten`, the single-file variant with embedded
  WASM), bundled in the CLI (about +240 KB compressed). It works the same in the standalone binary,
  the npm install and the Claude Desktop `.mcpb`.
- **Globals.** ECMAScript and `host` only: no `require`, `process`, `fetch`, `WebAssembly`, `Bun`,
  `std`/`os`, `setTimeout`.
- **Isolation.** Every `run` gets a new runtime and context, both destroyed afterwards. Nothing
  survives between runs except `host.storage`.
- **Async.** Host calls return guest Promises. The host runs the job queue right after calling the
  command and after each host operation completes, until the result is ready or an iteration limit is
  reached.
- **Deadline.** 60 s for the whole run, waiting for Telegram and HTTP included. When it passes or the
  run is cancelled (MCP cancel, a closed channel), the host interrupts the engine, cancels started
  operations and performs no late writes.
- **Default limits:** 64 MB memory; 200 host calls per run, at most 4 at a time; up to 1 MB of
  arguments per call and 1 MB of result handed into the sandbox; command output up to 60,000
  characters after serialization. Exceeding one gives `plugin_limit` with the limit's name.
- **Contract.** The module exports `commands`. The host calls `commands[name](input, host)` and checks
  the result with the `output` schema.
- **Output envelope.** The host prints `{"data": <the plugin's result>, "proposals": [...]}`. Only the
  host builds `proposals` (section 7); a plugin cannot put it in its result.
- **Lossless JSON.** Plugin output keeps `null` and empty values.

```js
export const commands = {
  async collect({ limit, types = ['private'], cursor }, host) {
    const page = await host.messages.mine({ limit, types, cursor });   // the host caps the page by size
    return { messages: page.messages, cursor: page.cursor, remaining: limit - page.count, done: page.done };
  },
};
```

## 5. Host API and permissions (coming, P2)

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
| `network` (effect `network`) | `host.http.fetch(url, {method, headers, body})` | only the origins in `network` (section 6) |
| `settings:read` | `host.settings.get(key)` | non-secret settings from the `settings` schema |
| `actions` (effect `actions`) | `host.actions.propose(action)` | a typed proposal (section 7) |

**`messages.mine`** returns only messages the owner wrote: forwards, text quoted from others,
messages from 777000 and 489000 and service events are dropped before any text is read. Each
message has its text, date and chat type, no other participants. Chats are walked by last activity,
each from newest to oldest. A page is capped by serialized size (about 40,000 characters) and
returns `{messages, count, cursor, done}` with an opaque cursor.

**Masking before the sandbox**, for every read API, in the shell and over MCP alike: messages from
or quoting 777000/489000 get the `service` mask (`mine` drops them); ordinary messages the `echo`
mask (codes after "code:", gift links). Plugin output over MCP is also masked with `maskForModel`.

**FLOOD_WAIT.** Calls from plugins never sleep: they fail with
`{code: "flood_wait", retryAfterSeconds, cursor, partial: {messages, count}}`, where `cursor` is
where to go on.

**Errors** are `{code, message, retryAfterSeconds?}` with the CLI's codes. **Logs**: `host.log` exists
only in `plugin dev` and writes to a local debug file, never to the command's output or MCP.

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

## 7. Action proposals (coming, P2)

A plugin never writes. With the `actions` permission and effect it returns typed proposals; the
host checks them and builds the command:

| `type` | Fields | Command the host builds |
|---|---|---|
| `send` | `chat`, `text`, `topic?` | `send <chat> - [--topic N]` |
| `reply` | `chat`, `msgId`, `text`, `topic?` | `reply <chat> <msgId> -` |
| `react` | `chat`, `msgId`, `emoji` | `react <chat> <msgId> <emoji>` |

The result holds `proposals: [{id, type, summary, argv, stdin, confirm: true}]`, all built by the
host from the same fields, so a plugin cannot describe one action and run another. v1 has no file
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
| `plugin run <name> <cmd>`, command with `effects: []` | read | anyone | coming, P2 |
| `plugin run <name> <cmd>`, effect `storage` and/or `actions` | local write | anyone | coming, P2 |
| `plugin run <name> <cmd>`, effect `network` | **sends data out**: a write in every transport, the shell too | anyone | coming, P3 |
| `plugin settings set <name> <key> <value>` | local write | anyone | coming, P3 |
| `plugin secret set <name> <secret>` | human's terminal only | human | coming, P3 |
| `plugin update [name]` | management | human | coming, P4 |
| `plugin dev <dir> --mock` | for authors | anyone | coming, P5 |

- **Local writes** (`plugin data set|delete`): in a terminal they need no write access, like
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
  `TG_PROFILE=dev telegram plugin install github:owner/repo@v1`. The MCP dialog for this, with
  elicitation, is **coming (P4)**; it will refuse on a `--read-only` server and pin the CLI version
  (`npx better-tg-cli@X.Y.Z …`) where there is no `telegram` binary.
- **Binding to the snapshot** (approvals of `plugin run`, **coming**): classification, the approval
  and the run itself are bound to `installId` and the snapshot hash; an update in between voids the
  approval.
- **MCP.** `telegram_read` runs exactly `plugin list`, `plugin show`, `plugin data get` and
  `plugin data list` (from P2 also `plugin run` for commands without effects, known from the lock file
  before the run). Everything else goes through `telegram_write` or is refused; a new subcommand is
  refused until it is classified.
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
- **Lock file** `plugins/plugin.lock.json`: per plugin the source and revision, the
  `sha256-<base64>` hash of the manifest and of every file, the accepted permissions, effects,
  origins and secret names, `installId` (a UUID) and the spec version. Before `list`, `show`, `data`
  and (from P2) `run`, the host checks that the folder holds exactly the locked files with their
  hashes, no links, and a manifest that declares nothing beyond what was accepted. On a mismatch the
  plugin is disabled with `plugin_tampered`; `plugin remove` still works. The lock file itself is
  read as untrusted input: names, IDs and paths in it are checked before use.
- **On disk.** Everything lives under the profile's config folder (`~/.config/tg[-<profile>]/`,
  `%APPDATA%\tg[-<profile>]\` on Windows): folders `0700`, files `0600` on POSIX, written atomically.
- **Identity of an installation.** Data (`plugin-data/<installId>/<telegram-user-id>/`, keys are
  logical names `^[a-z0-9][a-z0-9._-]{0,63}$`, declared in `storage.keys`) and secrets are bound to the
  `installId`. After `remove --keep-data`, installing the same name again (from any source) is a new
  installation: the old data is not attached.
- **Update** (coming, P4) is a new snapshot. Permissions, effects, origins and secrets not accepted
  before need a new confirmation; without it the old snapshot stays. Until then, installing a name
  that is installed is refused (`plugin_exists`).
- **Official plugins**: a list of owners inside the CLI (`TheVilfer`), matched against the canonical
  owner GitHub returns. The mark grants nothing: install still asks the human.
- **Audit** (`audit.jsonl` of the profile): install (also a declined one), remove, `data set` and
  `data delete` with the plugin, version, revision, installation ID, key and size; from P2 on also
  every `run` and from P3 settings and secrets (names only). Bodies, values, headers and secrets are
  never written.
- **Onboarding** is per Telegram account: another account on the same profile starts `pending`.

## 10. Versions and compatibility

- **Date versions.** The manifest schema and the host API are versioned by date (`2026-11-21`), as
  MCP is. The CLI supports the current and the previous version; a newer one is refused with
  `plugin_unsupported` and a hint to update the CLI.
- **New APIs are added without breaking.** A plugin checks that `host.x` exists before calling it.
- **Error codes:** `plugin_invalid` (the plugin breaks the spec; `validate` lists every problem),
  `plugin_unsupported`, `plugin_not_found`, `plugin_exists`, `plugin_tampered`,
  `plugin_revision_mismatch`, `plugin_source_not_found`, `plugin_lock_invalid`, `plugin_limit`
  (storage quota), `human_required`, `no_human_channel`, `not_confirmed`, `rate_limited` (GitHub API).
- **Exit codes, as the CLI's:** 2 bad arguments (from P2 also an input that fails its schema);
  1 a plugin error or a limit; 3 and 4 only for actions the agent runs.
- **Acceptance test of the spec** (coming, P6): `plugin validate` accepts the published Tone of Voice,
  and the SDK and the CLI check the same `collect` answer against its schema alike.

## 11. SDK for authors (coming, P5)

- **`@better-tg/plugin-sdk`**: types of `host` and the manifest, `definePlugin()`; a build into
  `dist/plugin.js` (ES2023, one file, no imports); a test host on mock data with HTTP fixtures:
  `runCommand('collect', {limit: 10}, {mock: true})`.
- **Template** `TheVilfer/tg-plugin-template`: manifest, `SKILL.md`, an example command, tests, CI with
  `plugin validate` and a mock test.
- **`plugin dev <dir> --mock`**: no confirmations; Telegram, storage, settings and secrets are mock
  data and HTTP answers from local fixtures (`dev/fixtures/*.json`). For a live check, install from the
  folder.
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
