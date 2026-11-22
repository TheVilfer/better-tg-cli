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

| Step | What                                                                                                                                              | Status        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| P1   | Manifest, install by snapshot, `list`, `show`, `data`, `remove`, `validate`, human confirmation                                                   | **available** |
| P2   | Sandboxed plugin code (QuickJS-WASM), host API, `plugin run`, `plugin dev --mock` ([#153](https://github.com/TheVilfer/better-tg-cli/issues/153)) | **available** |
| P3   | Network access and secrets the plugin never sees ([#154](https://github.com/TheVilfer/better-tg-cli/issues/154))                                  | **available** |
| P4   | Plugin management over MCP (a dialog), `plugin update` ([#155](https://github.com/TheVilfer/better-tg-cli/issues/155))                            | **available** |
| P5   | SDK and template repository ([#156](https://github.com/TheVilfer/better-tg-cli/issues/156))                                                       | **available** |
| P6   | The official Tone of Voice plugin ([#157](https://github.com/TheVilfer/better-tg-cli/issues/157))                                                 | coming        |
| P7   | Live checks in Claude Code, Grok Bot and Aside ([#158](https://github.com/TheVilfer/better-tg-cli/issues/158))                                    | coming        |

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
host puts the snapshot in a folder with that name (`plugins/<snapshot>/<name>/`), as Agent Skills
requires.

Limits: `tg-plugin.json` up to 64 KB, each file up to 1 MB, at most 200 files and 5 MB together.

### Manifest

```json
{
  "$schema": "https://better-tg-cli.com/schemas/tg-plugin/2026-11-21.json",
  "name": "tone-of-voice",
  "version": "1.0.0",
  "description": "Writes messages in the user's own voice when no exact text is given",
  "author": {
    "name": "Better-TG-CLI team",
    "url": "https://github.com/TheVilfer"
  },
  "license": "MIT",
  "engines": { "better-tg-cli": ">=0.41.0" },
  "main": "dist/plugin.js",
  "files": [
    "tg-plugin.json",
    "SKILL.md",
    "onboarding.md",
    "templates/style.md",
    "dist/plugin.js"
  ],
  "permissions": ["messages:read-own", "storage:read"],
  "network": [],
  "secrets": [],
  "settings": {},
  "resources": {
    "compose": "SKILL.md#compose",
    "onboarding": "onboarding.md",
    "template": "templates/style.md"
  },
  "storage": { "keys": ["style"], "quotaBytes": 262144 },
  "commands": [
    {
      "name": "collect",
      "description": "Collect the user's own messages for style analysis",
      "effects": [],
      "input": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer", "minimum": 1, "maximum": 2000 },
          "types": {
            "type": "array",
            "items": { "enum": ["private", "group"] }
          },
          "cursor": { "type": "string" }
        },
        "required": ["limit"],
        "additionalProperties": false
      },
      "output": {
        "type": "object",
        "properties": {
          "messages": { "type": "array" },
          "cursor": { "type": ["string", "null"] },
          "remaining": { "type": "integer" },
          "done": { "type": "boolean" }
        },
        "required": ["messages", "cursor", "remaining", "done"]
      }
    }
  ],
  "triggers": [
    {
      "id": "compose",
      "when": "The user asks to write or reply to someone but gives no exact text",
      "resource": "compose"
    }
  ],
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
  no external `$ref`, no `$id`, no `$schema` other than 2020-12. A `$ref` may point only at a
  subschema position (`#`, `#/$defs/…`, `#/properties/…`, `#/items`, `#/allOf/0` and so on), never
  into an annotation or any other value (`#/default`, `#/examples/0`, `#/properties/a/const`): the
  manifest is refused at install, and such a schema is refused again when it checks a value. A
  `$ref` cycle that never descends into the value ends the check with `plugin_error`. `input` is an object. Only the
  keywords the host implements are allowed (an unknown one makes the manifest invalid), and no
  regular expressions (`pattern`, `patternProperties`): the host checks plugin values on its own
  thread, where a runaway expression could not be stopped; check such values in the plugin's code.
  The host checks the input before a call (a failure is exit 2, `invalid_argument` with `issues`)
  and the output after it (`plugin_error` with `issues`), each check limited to 2 s.
- **`effects`**: a subset of `["storage", "network", "actions"]`, each needing its permission
  (`storage:write`, `network`, `actions`). An empty list means the command only reads (section 8).
  Commands need `main`.
- **`network`** lists origins only with the `network` permission and vice versa; every secret's
  `inject.origin` is in `network` (section 6). An origin is `https://` and a host name with a
  top-level domain, in its canonical form (lower case, no trailing dot, no path, no user info, no
  `:443`): no IP address (also not written as a number, `https://2130706433`), no `localhost`,
  `.local`, `.internal`, `.arpa`. Another port is written explicitly (`https://api.example.com:8443`).
- **`secrets[].inject`**: `header` is a token and not one the host sets itself (`Host`, `Cookie`,
  `Content-Length`, `Transfer-Encoding`, `Connection`, `TE`, `Upgrade`, `Proxy-*`, …; `Authorization`
  is allowed); `format` is one line of printable ASCII holding `{value}`; two secrets never go to the
  same origin in the same header.
- **`settings`**: each one a small JSON Schema: `type` (`string`, `integer`, `number`, `boolean`),
  `description`, optional `enum`, `minimum`/`maximum` (numbers), `minLength`/`maxLength` (strings)
  and `default`, which must itself be a valid value.

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
  Connecting to Telegram and looking up the account happen on first use inside the run, so they
  count against the same 60 s. A storage write waits for the store's lock only until the deadline
  and checks the deadline and the cancellation once more under the lock, right before the file
  changes: a write that would land after them changes nothing.
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
  CLI's `formatJson()`). The output is always one line of compact JSON, with or without `--json`:
  exactly the string whose length was checked against the 60,000-character limit, so no other
  serialization can outgrow it.

```js
export const commands = {
  async collect({ limit, types = ["private"], cursor }, host) {
    const page = await host.messages.mine({ limit, types, cursor }); // the host caps the page by size
    return {
      messages: page.messages,
      cursor: page.cursor,
      remaining: limit - page.count,
      done: page.done,
    };
  },
};
```

## 5. Host API and permissions

| Permission                         | API                                                                                                      | What it gives                                                                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —                                  | `host.now()`, `host.random()`, `host.input`                                                              | time, random numbers, the checked input                                                                                                                              |
| `identity:read`                    | `host.me()`                                                                                              | the owner's ID and name                                                                                                                                              |
| `messages:read-own`                | `host.messages.mine({limit, types, since, cursor})`                                                      | only the owner's own text (below)                                                                                                                                    |
| `chats:read`                       | `host.chats.list({limit, types, unreadOnly})`                                                            | ID, title, type, `muted`, `unreadCount`; no previews                                                                                                                 |
| `messages:read`                    | `host.messages.read(chat, {limit, before, topic, thread})`, `host.messages.search(query, {chat, topic})` | other people's messages; a separate warning at install                                                                                                               |
| `messages:read-target`             | `host.target.message()` or `host.target.thread({limit, before})`                                         | only what the agent passed to this run: `--target <chat>:<msgId>` (one message), `--target <chat>:<msgId> --thread` or `--target <chat>@<topic>` (a thread or topic) |
| `storage:read`                     | `host.storage.get(key)`, `host.storage.list()`                                                           | this installation's data for the current owner                                                                                                                       |
| `storage:write` (effect `storage`) | `host.storage.set(key, value)`, `host.storage.delete(key)`                                               | atomic writes within the total `quotaBytes`                                                                                                                          |
| `network` (effect `network`)       | `host.http.fetch(url, {method, headers, body \| bodyBase64, responseType})`                              | `{status, headers, body \| bodyBase64}`, only to the origins in `network` (section 6)                                                                                |
| `settings:read`                    | `host.settings.get(key)`                                                                                 | the value `plugin settings set` stored, else the setting's `default` (else `null`)                                                                                   |
| `actions` (effect `actions`)       | `host.actions.propose(action)`                                                                           | a typed proposal (section 7)                                                                                                                                         |

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
Telegram requests (every one counts: the dialog list, the account, resolving each chat, each history
batch), and returns `{messages, count, cursor, done}`. `cursor` is an opaque random id (128 bits,
base64url): the walk itself (the chats, the position, the filters, the account and the installation)
stays with the host, in a private folder of the installation (`plugin-state/<installId>/`, never
plugin data, so `plugin data` does not show it; removed with the plugin), so the plugin never sees
which chats were walked and cannot change them. A cursor lasts 24 hours, an installation keeps the
latest 64, and each page hands out a new one (an earlier cursor still repeats its page). An unknown,
expired or malformed id, or one of another account or installation, fails with `invalid_cursor`. In
`plugin dev` cursors live in memory, so one never continues in the next `plugin dev` run. The last
page has `done: true` and `cursor: null`. A cancelled or timed-out run starts no further request.

**Masking before the sandbox**, for every read API, in the shell and over MCP alike: messages from
777000/489000, forwards of them, messages saved from their chats (`savedFromPeer`/`savedFromId` of
the forward or quote header) and replies quoting them get the `service` mask and `service: true`
(`mine` drops them); ordinary messages the `echo` mask (codes after "code:", gift links). Over MCP
the plugin's `data` and the proposal texts are masked with `maskForModel` (`echo`) as well.

**FLOOD_WAIT.** Calls from plugins never sleep (`floodSleepThreshold = 0`): they fail with
`{code: "flood_wait", retryAfterSeconds, cursor, partial: {messages, count}}`; for `mine`, `cursor`
continues right after `partial`, so nothing is lost or repeated. If the command passes the error on,
`plugin run` fails with the same `flood_wait`, `retryAfterSeconds`, `cursor` and `partial`, taken from
the host's own record of the call, never from what the plugin threw.

**Errors** reach the plugin as thrown `Error`s with `code`, `message` (masked) and their other fields
(`retryAfterSeconds`, `cursor`, `partial`): the CLI's codes plus `permission_denied`,
`invalid_argument`, `invalid_cursor`, `no_target`, `not_available` (the target is a message, not a thread, or the
reverse), `not_found`, `invalid_proposal`. An error the command does not catch ends the run with
`plugin_error`. **Logs**: `host.log(...)` exists only in `plugin dev` and appends to
`<tmp>/better-tg-cli-plugin-dev/<name>.log`, never to the command's output or MCP.

## 6. Network and secrets

A command with the effect `network` (and the permission) gets `host.http.fetch(url, options)`:

```js
const r = await host.http.fetch("https://api.example.com/v1/chat", {
  method: "POST", // GET (default), HEAD, POST, PUT, PATCH, DELETE, OPTIONS
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text }), // or bodyBase64; only POST, PUT, PATCH, DELETE
  responseType: "text", // or 'base64'
});
// r = { status: 200, headers: { 'content-type': 'application/json', … }, body: '…' }  (or bodyBase64)
```

- **Only the manifest's exact origins.** The URL is parsed and its origin (scheme, host, port) must
  equal one in `network`: `https` only, no user name or password in the URL, another port or a
  trailing dot is another origin, and a lookalike host (`аpi` in Cyrillic) is punycode, so another
  origin too. Anything else is `network_denied`, before any DNS lookup.
- **The address is checked, then pinned.** The host resolves the name once per request and refuses
  it (`network_denied`) if **any** answer is loopback, private (RFC 1918, IPv6 unique local),
  link-local, carrier-grade NAT (100.64/10), multicast, unspecified, broadcast, reserved,
  documentation or benchmarking, or an IPv6 form that carries one of those IPv4 addresses
  (IPv4-mapped `::ffff:…`, IPv4-compatible, NAT64 `64:ff9b::/96`, 6to4 `2002::/16`; Teredo and local
  NAT64 `64:ff9b:1::/48` always). When an answer is IPv6, the host also asks the same resolver for
  `ipv4only.arpa` once per run (RFC 7050) to learn the network's own NAT64 prefixes (any range, a
  global one too); an address inside one of them is judged by the IPv4 address it carries (RFC 6052,
  every prefix length). If that discovery fails, no prefix is added and the request goes on. It then
  opens a TLS connection to exactly that IP (verified for the host name, SNI) and checks the socket
  reached it, so a second DNS answer (rebinding) is never used. The certificate is always verified
  against the system's CAs and the host name: `NODE_TLS_REJECT_UNAUTHORIZED=0` or any other
  variable cannot turn that off. Proxy variables (`HTTPS_PROXY`, `NODE_USE_ENV_PROXY`, …) are not
  read.
- **No redirects.** A `3xx` comes back as it is, with its `location` header; nothing follows it.
- **Sizes.** A request body up to 256 KB (`request_too_large`). A response body up to 1 MB on the
  wire and 1 MB after decompression (`gzip`, `deflate`, `br`; the host sends `Accept-Encoding` itself):
  reading stops at the limit (`response_too_large`), so a gzip bomb ends there. A
  `Transfer-Encoding` other than exactly `chunked` and a `Content-Encoding` the host did not ask for
  are `bad_response` (the size limit and the secret stripping always see the decoded body). Everything
  of a response that is not body shares one budget of 64 KB: the status lines and headers of every
  interim `1xx` answer and the final one, chunk-size lines with their extensions, the line break after
  each chunk and the trailers; a chunked body has at most 8192 chunks (`bad_response` past either).
  A body that is valid UTF-8 comes as `body`, anything else (or `responseType: 'base64'`) as
  `bodyBase64`. One `http.fetch` result may be up to 2 MB inside the sandbox, so a 1 MB body always fits.
- **Headers.** Names are tokens and values printable ASCII without line breaks (`invalid_argument`).
  The plugin cannot set `Host`, `Cookie`, `Authorization`, `Proxy-*`, `Connection`, `Keep-Alive`,
  `Transfer-Encoding`, `TE`, `Trailer`, `Upgrade`, `Content-Length`, `Expect`, `Accept-Encoding`,
  `Range`, `If-Range`, `Sec-*`, nor a header one of its secrets goes in (`network_denied`). All its
  headers together are at most 16 KB (`request_too_large`). The response headers come without
  `Set-Cookie`, `Content-Encoding`, `Content-Length` and `Transfer-Encoding` (the body is decoded). The host sets `Host`,
  `Content-Length`, `Accept-Encoding`, `Connection: close` and a `User-Agent` (unless given).
- **No cookies.** None is kept or sent, and `Set-Cookie` is removed from the response headers.
- **Time.** A request has one deadline, fixed when `http.fetch` is called: 30 s, or 250 ms before the
  run's deadline, whichever is first (`timeout`). Reading its secrets from the store (asynchronously;
  a slow store is stopped), DNS, connecting, TLS and the response all count against it. A cancelled
  run stops it (`cancelled`). Every request is a host call and counts against
  the run's host-call limits.
- **Errors** (catchable, `{code, message}`): `network_denied`, `ambiguous_path`, `invalid_argument`,
  `request_too_large`, `response_too_large`, `timeout`, `network` (DNS, TLS, connection),
  `bad_response` (not HTTP/1.1), `secret_missing`, `secret_store_unavailable`, `cancelled`.

### Secrets

The plugin never sees a secret. The manifest says where the host puts it:

```json
"secrets": [ { "name": "openai", "description": "API key", "inject": { "origin": "https://api.openai.com", "paths": ["/v1"], "header": "Authorization", "format": "Bearer {value}" } } ]
```

- **Only the human enters it**, in their own terminal, input hidden:
  `telegram plugin secret set <plugin> <secret>`. There is no argument for the value, it is never read
  from a pipe or the environment, and without a terminal the command is refused with
  `human_required` and the command to run. Over MCP it is refused before any prompt, with the exact
  command for the human's terminal (with the profile, or the mock's `TG_MOCK=…`); MCP form
  elicitation is never used for it. A value is 8 to 4096 characters of printable ASCII (it goes into
  a header). The value is stored only if the installation the human was shown is still the
  registered one when they finish typing (checked under the plugin lock; a `plugin remove` or a new
  install meanwhile gives `plugin_changed` and nothing is stored). `plugin secret rm <plugin> <secret>`
  deletes it (also the human's). `plugin show <plugin>` lists each secret as `set` or `not set` (never
  the value), and `plugin remove` deletes the secrets of the installation: it records them in the
  host's state (`plugin-state/pending-secret-cleanup.json`, names and generations only) in the same
  locked step that removes the installation, so a secret the store fails to delete is deleted by the
  next plugin command, silently; `plugin secret rm <plugin> <secret>` also deletes one a removed
  plugin left.
- **Where it is kept**: the profile's secret store (macOS Keychain, Linux Secret Service, Windows
  DPAPI or 1Password, the one that holds the session) under a key the core builds from the profile,
  the installation ID, the secret name and the **generation** of its inject rule
  (`plugin-secret-<profile>-<installId>-<name>-g<generation>`). The generation is the first 16 hex
  digits of a SHA-256 over the rule (origin, paths, header, format), pinned per secret in the signed
  registry entry (`secrets: {name: generation}`) and checked against the installed manifest. A value
  is therefore stored for one destination only: an update that keeps the rule keeps the value, one
  that changes it starts an empty generation, and a run still on the old revision reads only the old
  generation (never a value typed for the new destination). Without a store a secret cannot be set
  (`secret_store_unavailable`). Under `TG_MOCK` it is a `0600` file next to the mock state, never a
  real store. A read that decides something (whether a value is there before it is deleted, the
  registry key before one is made) reads the store afresh, never the copy a long-lived process (the
  MCP server) decrypted earlier; on Windows every change of `secrets.dpapi` (the session, write
  access, plugin secrets) holds the lock file `secrets.dpapi.lock` across its read, change and
  rename, so one process never writes back another's old copy.
- **Where it goes**: the host adds the header (`format` with `{value}` replaced) only to a request
  whose origin is `inject.origin` and, with `paths`, whose path equals one of them or starts with it
  followed by `/` (`/v1` covers `/v1/chat`, not `/v1x`). Without `paths` it goes to every path of the
  origin; `paths` has at least one entry (an empty list is refused at install, and one already
  installed sends the secret nowhere). A request that would carry a secret limited to some paths is
  refused with `ambiguous_path`, before the secret is read or anything is sent, when its path as the
  plugin wrote it or as the URL parser resolved it holds anything a server could read as another
  path: a `\` or `;`, a `%` without two hex digits, an encoded `/`, `\`, `.`, `;` or `%` (such as
  `/v1/..%2fadmin`), an encoding that is not normalised (an encoded letter, digit or `-._~`, lowercase
  hex), an empty segment (`//`), or a `.` or `..` segment (also `/v2/../v1/x`, which the parser would
  turn into `/v1/x`). A trailing `/` is fine. The manifest's own `paths` follow the same rules. A partial response (`206`) to a request that carried a secret is refused
  (`bad_response`). A request
  that needs a secret that is not set is not sent: `secret_missing` with `command` (an uncaught one
  ends the run with `secret_missing` and the command for the human's terminal).
- **Stripped from the response.** Before the sandbox sees a response, every form of each secret
  value and formatted header sent in the run is replaced with `[secret]` in the body and the header
  values (a header whose name holds one is dropped): as is, URL-encoded (`%20` and `+`, and the
  `application/x-www-form-urlencoded` form `URLSearchParams` writes, which also encodes `!'()~`), JSON-escaped,
  hex, and base64 / base64url, whole and at each byte alignment inside a longer base64 text (so
  `Basic base64(user:key)` or an echoed `Authorization: …` line is found). At an alignment edge up to
  two base64 characters next to the marker may remain; they carry no more than 6 bits of the value.
  This guards against an API that echoes what it was sent; it is no defence against an endpoint
  that transforms the value on purpose (the value was sent to it, so it has it anyway).

### Settings

`plugin settings set <plugin> <key> <json>` stores a non-secret setting (`'"warm"'`, `3`, `true`)
after checking it against the setting's schema (exit 2 with `issues` otherwise); it is a local write,
like `plugin data set` (over MCP through `telegram_write` and the write mode). `plugin settings get
<plugin> [key]` prints the values (stored or default). `host.settings.get(key)` returns the stored
value, else the default. Settings live in `plugin-state/<installId>/settings.json` and go with the
installation. All settings of an installation together are at most 256 KB as UTF-8 JSON: a value that
would pass that is refused (`settings_too_large`, exit 2) and the stored settings stay as they were.

### The install summary

It names every data source with the destinations, for example: `Sends data: may send your own
messages, your name and ID and its saved data to: https://api.example.com`, then one line per secret
(`sent by the host only to https://api.example.com (paths /v1) as Authorization; the plugin never
sees it`) and how to set them. The secret's description is shown under the plugin's own words.

## 7. Action proposals

A plugin never writes. With the `actions` permission and effect it returns typed proposals; the
host checks them and builds the command:

| `type`  | Fields                            | Command the host builds        |
| ------- | --------------------------------- | ------------------------------ |
| `send`  | `chat`, `text`, `topic?`          | `send <chat> - [--topic N]`    |
| `reply` | `chat`, `msgId`, `text`, `topic?` | `reply <chat> <msgId> -`       |
| `react` | `chat`, `msgId`, `emoji`          | `react <chat> <msgId> <emoji>` |

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

| Command                                                                                                          | Class                                                         | Who                   | Status                                                     |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `plugin list [--json]`                                                                                           | read                                                          | anyone                | available                                                  |
| `plugin show <name> [--trigger <id> \| --onboarding \| --resource <key>] [--json]`                               | read                                                          | anyone                | available (no flag: network, secrets set or not, settings) |
| `plugin data get\|list <name> [key] [--json]`                                                                    | read                                                          | anyone                | available                                                  |
| `plugin data set <name> <key> [-]`, `plugin data delete <name> <key>`                                            | local write                                                   | anyone                | available                                                  |
| `plugin install <github:owner/repo[@ref] \| ./dir> [--expect <revision>]`                                        | management                                                    | human                 | available                                                  |
| `plugin remove <name> [--keep-data]`                                                                             | management                                                    | human                 | available                                                  |
| `plugin validate <dir> [--json]`                                                                                 | for authors                                                   | anyone (not over MCP) | available                                                  |
| `plugin run <name> <cmd> [--input <json> \| -] [--target <ref> [--thread]] [--json]`, command with `effects: []` | read                                                          | anyone                | available                                                  |
| `plugin run <name> <cmd> …`, effect `storage` and/or `actions`                                                   | local write                                                   | anyone                | available                                                  |
| `plugin run <name> <cmd>`, effect `network`                                                                      | **sends data out**: a write in every transport, the shell too | anyone                | available                                                  |
| `plugin settings get <name> [key] [--json]`                                                                      | read                                                          | anyone                | available                                                  |
| `plugin settings set <name> <key> <json>`                                                                        | local write                                                   | anyone                | available                                                  |
| `plugin secret set <plugin> <secret>`, `plugin secret rm <plugin> <secret>`                                      | human's terminal only (hidden input)                          | human                 | available                                                  |
| `plugin update [name] [--expect <revision>]`                                                                     | management                                                    | human                 | available                                                  |
| `plugin dev <dir> <cmd> --mock [--input …] [--target …] [--json]`                                                | for authors                                                   | anyone (not over MCP) | available                                                  |

- **`plugin run`** loads the installed snapshot once (checked against the lock) and runs those
  bytes. `--input` is the command's input as a JSON object (`-` reads it from stdin; absent: `{}`).
  Over MCP `telegram_read` passes no stdin, so a read command takes its input inline
  (`["plugin","run","x","collect","--input","{\"limit\":300}"]`); `telegram_write` passes `stdin`.
  `--target` is for plugins with `messages:read-target` only (the same check in `plugin dev` and the
  SDK's test host: without the permission it is exit 2); the message, topic or thread ID in it
  is an integer from 1 to 2147483647 (anything else is exit 2), and `host.target.thread()` reads that
  topic or thread only, never the rest of the chat. `plugin list --json` lists each command
  with `access` (`read`, `local write`), its `input` schema and the `argv` to run.
- **`plugin dev <dir> <cmd> --mock`** checks the folder as `validate` does and runs a command against
  the built-in mock account in memory: no confirmations, nothing installed or written, no profile,
  session or secret store touched (neither it nor `plugin validate` retries the pending cleanup of
  removed plugins' secrets that other `plugin` commands retry); storage starts empty, settings are their defaults, and `host.log`
  works (section 5). HTTP is answered from the folder's `dev/fixtures/*.json` (not part of `files` or
  the revision; regular files only, no links, up to 2 MB and 200 files): each file one fixture or a
  list, `{"request": {"method": "GET", "url": "https://…?q=1"}, "response": {"status": 200,
  "headers": {…}, "body": "…" | "bodyBase64": "…" | "json": …}}`, matched by method and exact URL;
  an unmatched request is `fixture_missing`, never the network. Origin, header and size rules apply
  as in a real run. Secrets are the placeholders `dev-secret-<name>`, injected and stripped like real
  ones. Without `--mock` it is refused: for a live check, install the folder.
- **Under `TG_MOCK`** an installed plugin's requests are answered the same way from
  `<state>.plugins/mock-http/*.json` (no fixture: `fixture_missing`), and its secrets come from the
  mock's own file: nothing reaches the network, as nothing reaches Telegram.
- **Sending data out** (`plugin run` of a command with the effect `network`) is a write in every
  transport, the shell included: it goes through the write guard (`assertWriteEnabled`). Mode
  `read-only` refuses it (`write_disabled`, exit 4), the MCP read tool and a `--read-only` server
  refuse it, `ask` needs an approval, `on` runs it. The approval shows, besides the installation,
  command, effects and input, where data may go (`Sends to: <origins>`, with what the plugin reads)
  and which secrets the host attaches; its hash covers the installation, revision, command, effects,
  origins, secret destinations and a hash of the input.
- **Local writes** (`plugin data set|delete`, `plugin run` of a command with effects): in a terminal they need no write access, like
  `download`. Over MCP they run only through `telegram_write` and follow the write mode
  (`assertLocalWriteAllowed`): refused on a read-only server or in mode `read-only`, approved each
  time in `ask` (the approval shows the plugin, the key and the full value, and covers exactly that
  value). `telegram_read` refuses them, and the CLI stops a write that arrives as a read
  (`write_on_read_tool`).
- **The human**: install, update and remove ask for a y/N in a real terminal or a system dialog (macOS,
  Windows). No write mode skips it (`on` included), and a `TG_APPROVE` code never stands in for it.
  Without a terminal or dialog the command is refused (`no_human_channel`); a "no" is
  `not_confirmed`. On Windows the dialog's text reaches a fixed PowerShell script on stdin, so no
  summary is too long for it. The remove question comes from the signed registry: source, revision,
  installation, profile, what the plugin could read, its effects and destinations, the secrets that
  are deleted (with `--keep-data` too) and what happens to the data. `--expect <revision>` pins what is installed or updated to: a folder's
  `sha256-…` content hash (as `plugin validate` prints it), or a GitHub commit SHA (the ref named in
  the source must resolve to it; the ref itself is what is recorded, so a later update follows it);
  anything else is `plugin_revision_mismatch`.
- **Over MCP: the management handler.** `plugin install|update|remove` on `telegram_write` never run a
  CLI child and never take the write-approval path: the server handles them itself. It parses the
  arguments as the CLI does (an unknown option, a malformed revision or a second operand is refused
  and never echoed), prepares the change (fetches and checks the snapshot, nothing written) and
  shows the human, in the client's elicitation dialog, the same summary a terminal shows: the
  operation, source, revision, profile, permissions, effects, where data may go with what may go
  there, and secrets. After Accept it applies exactly the prepared snapshot, bound by a digest of
  what was shown: a folder whose content changed meanwhile, or a registry where that installation
  was removed, updated or installed again, is refused (`plugin_changed`) and nothing changes.
  Decline, cancel, an unticked box, no answer within 10 minutes or a cancelled call change nothing
  (install and update audit the "no"). A client that shows the request as a plain Allow with empty
  content (Hermes Agent) counts as Accept, by the same rule as write approvals. The write mode plays
  no part (`on` does not skip the dialog), an `approval` code or anything the model says is never
  read, and write access is never touched. A `--read-only` server, or one started with
  `TG_READ_ONLY`, refuses it before anything is fetched. `plugin update` without a name asks once per
  plugin that has a new revision. A folder the model names is read before the human sees anything,
  so whatever is wrong with it (missing, not a plugin, unreadable) gives one and the same answer
  (`plugin_invalid`, "could not be read as a plugin"), never its content or which case it was.
  Nothing is written before the human's Accept, not even the registry key. The CLI itself, run as a child of the server (`TG_MCP`), still
  refuses these commands with `human_required`.
- **Without a dialog** (Streamable HTTP, a client without form elicitation) the model gets the exact
  command for the human's terminal **on the server's computer**, built after the same prepare step
  and pinned to the revision it found: `telegram plugin install /abs/dir --expect sha256-…`,
  `telegram plugin install github:owner/repo@v1 --expect <commit>`, `telegram plugin update x
  --expect <revision>`, `telegram plugin remove x --expect-install <installId>:<snapshot>` (a hidden
  option: only that installation and snapshot is removed, one installed again or updated since is
  `plugin_changed`). `telegram` is used when it is on the server's PATH (on POSIX a file this user
  may execute; on Windows one with a PATHEXT extension), otherwise the CLI pinned to the server's
  version, `npx better-tg-cli@X.Y.Z …` (an `.mcpb` has no `telegram`). The server's effective
  profile and mock context are set explicitly, whatever the human's terminal has: `TG_PROFILE`
  always (empty for the default profile) and `TG_MOCK` as the absolute path of the server's mock
  state (empty outside the mock). They reach that one command only: POSIX
  `TG_PROFILE=dev TG_MOCK='' telegram …`; PowerShell saves the terminal's values and restores them
  (`$tgSaved0 = $env:TG_PROFILE; $tgSaved1 = $env:TG_MOCK; try { $env:TG_PROFILE = 'dev';
  $env:TG_MOCK = ''; telegram … } finally { $env:TG_PROFILE = $tgSaved0; $env:TG_MOCK = $tgSaved1 }`).
  Only printable ASCII is put into a command: a path with anything else (a line break, a look-alike
  quote, a control character), or on Windows with a character `cmd.exe` would parse again behind a
  `.cmd` shim (`" % ^ & | < > !`), gives no command, and the human types the folder themselves. The
  same builder makes every command in a hint, such as the `plugin validate` of `expect_required`.
  The result has `structuredContent: {status: "human_required", commands: [{operation, name, argv,
  command}]}`.
- **Folder paths.** A network share (`\\server\share`, `//server/share`), a Windows namespace path
  (`\\?\`, `\\.\`, `\??\`) or a device name (`CON`, `NUL`, `COM1`, … in any part) is not a
  plugin source, on every platform and before any file is touched (`invalid_argument`): Windows would
  connect to the named server, offering the user's credentials, before anyone was asked. A recorded
  path is checked again on update.
- **Dialog answers.** The server's elicitation IDs are `tg-elicit-<random instance>-<n>`; only a
  well-formed JSON-RPC response (`jsonrpc: "2.0"`, a string ID, exactly one of `result` and `error`)
  with exactly that ID settles a dialog, so a numeric or coerced ID, or a late answer to a server
  that restarted, never does. Cancelling `plugin update` stops the GitHub request in flight and
  fetches no further plugin.
- **Binding to the snapshot.** The approval of a `plugin run` (in mode `ask`: the MCP dialog,
  `approval_required` or `TG_APPROVE`) shows the plugin, the command, the installation and revision,
  the effects and the input, and its hash covers the `installId`, the revision, the snapshot folder,
  the command's effects and the input (an update back to an earlier revision is another snapshot, so
  an approval or dialog from before does not hold again). The run checks that the installation it loaded is the approved one
  (`plugin_changed`), so a plugin removed and installed again (or updated) in between needs a new
  approval. The MCP server classifies from the installed manifest, and the run decides again from
  the snapshot it loaded: a command that gained an effect is refused on `telegram_read`
  (`write_on_read_tool`).
- **Cancellation over MCP.** `notifications/cancelled` is handled as soon as it arrives, past the
  request queue: a plugin run in progress is stopped (the child CLI gets SIGTERM, a worker thread a
  message and a flag in shared memory its sandbox polls; either is killed if it has not stopped
  after 2 s), a run still waiting in the queue never starts, and neither gets a response. A plugin
  run is cancellable from the moment it leaves the queue, approval included: a cancel while its
  describe run or approval dialog is open ends the wait at once (the server tells the client its
  dialog is cancelled and ignores a late answer), nothing runs and the next call is answered. Over
  stdio a closed channel cancels the plugin runs too; over Streamable HTTP only the client's
  notification does, and only within its own session: `initialize` answers with an
  `Mcp-Session-Id`, and a cancellation reaches only the runs of the session it was sent with
  (requests without the header share a scope of their own). Other commands are not cancelled this way.
- **The installation a call was checked by.** For `plugin run` the server passes the child the
  installation ID and revision it classified (and, in mode `ask`, approved) the call by, in an
  environment variable the model cannot set. The child refuses any other installation of the same
  name (`plugin_changed`) before anything of it runs, whatever effects its command has now.
- **MCP.** `telegram_read` runs exactly `plugin list`, `plugin show`, `plugin data get`,
  `plugin data list`, `plugin settings get`, and `plugin run` for commands without effects (known from
  the installed manifest before the run). `plugin data set|delete`, `plugin settings set` and
  `plugin run` with effects (`network` included) go through `telegram_write`. `plugin install`,
  `update` and `remove` go through `telegram_write` to the management handler above (a group of
  their own: never a read, never a write approval). `plugin secret set|rm` are refused with the
  command for the human's terminal (a secret's command is
  built only from a plugin and secret name that parse strictly, so a value the model added is never
  echoed); `validate` and `dev` read a folder and stay in the terminal; a new subcommand is refused
  until it is classified.
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
  temp folder, checked and moved into `plugins/<snapshot>/<name>/` with one rename (`<snapshot>` is
  the `installId` for a first install and a fresh UUID for each update, recorded in the lock entry).
- **The summary** the human confirms starts with what the host computed (source, revision, official,
  profile, size), then the permissions in plain words, the effects, where data may go, secrets, and
  last the plugin's own words (description, author, triggers), one line each.
- **Lock file** `plugins/plugin.lock.json` (the install registry): per plugin the source and
  revision, the `sha256-<base64>` hash of the manifest and of every file (the same set the manifest
  lists), the accepted permissions, effects, origins and secret names, `official`, `installId` (a
  UUID), the snapshot folder after an update (`snapshot`, `updatedAt`) and the spec version. The registry is **signed**: an HMAC-SHA256 over its canonical JSON
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
- **One change at a time.** Install, update, remove and `data set/delete` (the quota check and the write
  together) run under the lock file `.plugins.lock` (created with `O_EXCL`; a lock left by a process
  that is gone, or older than 10 minutes, is taken over; otherwise `plugin_busy` after 15 s). It is
  never held across the human's dialog or a download: under the lock, `remove` checks that the
  registered installation is still the one the human was shown, and `data set/delete` that the
  plugin they write for is still installed (`plugin_changed` otherwise). In write mode "ask" an
  approval of `data set/delete` covers the `installId`, revision and snapshot too, so it does not
  carry over to a plugin installed under the same name since, or updated meanwhile.
- **Identity of an installation.** Data (`plugin-data/<installId>/<telegram-user-id>/`, keys are
  logical names `^[a-z0-9][a-z0-9._-]{0,63}$`, declared in `storage.keys`) and secrets are bound to the
  `installId`. After `remove --keep-data`, installing the same name again (from any source) is a new
  installation: the old data is not attached.
- **Update** (`plugin update [name]`, every installed plugin without a name) is a new snapshot from
  the recorded source: GitHub at the ref named at install (the default branch when none was), a
  folder at the same path. The same revision is "up to date": nothing is asked or written. A folder
  whose content changed needs `--expect` with the new hash (`expect_required` otherwise; `plugin
  validate` prints it). The summary shows the revision it moves from and to and lists apart what was
  **not accepted before**: new permissions, effects, network origins, and secrets that are new or
  whose destination (origin, paths, header or format) changed. The human confirms every update, also
  one that only changes code or texts (the summary then says nothing new is asked for); without a yes
  the old snapshot stays. A name of another plugin in the source is refused (`plugin_invalid`); a
  tampered installation is not updated (`plugin_tampered`: remove and install it again).
  The installation keeps its `installId`, so its data, settings and the secrets whose rule did not
  change stay; an approval bound to the old snapshot no longer holds. A secret whose destination
  changed moves to a new, empty generation (the result lists it to set again as `mustSetAgain`), and
  one the plugin no longer declares is dropped. Nothing live is deleted before the switch: under the
  plugin lock the new snapshot is written beside the old one, the new generations are cleared (an
  update back to an earlier rule must not find an old value there; if the store fails, nothing is
  updated), the old generations are recorded in `pending-secret-cleanup.json`, and the signed
  registry write is the one commit point. A failure or a crash before it leaves the old snapshot
  registered and working with all its secrets (a stray folder is never read, and the cleanup never
  deletes a generation the registered installation reads). After it the old folder and the old
  generations are deleted; one the store fails to delete is listed as `secretsNotRemoved` and retried
  by the next plugin command. A change the human confirmed that fails is audited (`success: false`
  with the error code and a one-line `reason`). The registry key is never made while a registry with
  plugins exists (`plugin_lock_invalid`). Installing a name that
  is installed is refused (`plugin_exists`, with the update command in the hint).
- **Official plugins**: a list of owners inside the CLI (`TheVilfer`), matched against the canonical
  owner GitHub returns, and only for a commit that repository published itself: the ref named at
  install is one of its branches or tags (annotated tags peeled) pointing at the commit, or the
  commit is in the history of its default branch (the compare API answers `identical` or `behind`).
  GitHub serves every fork's commits through the upstream repository too, so a commit pinned by SHA
  from a fork installs as a third-party plugin, and the summary says why. The mark grants nothing:
  install still asks the human.
- **Audit** (`audit.jsonl` of the profile): install and update (also a declined one; an update with
  the revision and version it left, what was newly accepted and the names of the secrets it reset;
  one confirmed but failed with `result.reason`), remove, each with `via: "terminal"|"mcp"`, `data set` and
  `data delete` with the plugin, version, revision, installation ID, key and size; every `run` with
  the plugin, revision, installation, command, the names of the host APIs it called, the types of the
  proposals it returned and the outcome (an error code), and for a run that sent requests
  `network: {requests, origins}` (never a URL, a path, a query, a header or a body);
  `plugin settings set` and `plugin secret set|rm` with the key or secret name only.
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
  `human_required`, `no_human_channel`, `not_confirmed`, `expect_required` (`plugin update` of a
  folder whose content changed, without `--expect`), `rate_limited` (GitHub API), `secret_missing`
  (a request needs a secret the human has not set; `command` sets it), `settings_too_large`
  (`plugin settings set` past 256 KB in all). Inside the sandbox
  `http.fetch` also gives `network_denied`, `ambiguous_path`, `request_too_large`, `response_too_large`, `timeout`,
  `network`, `bad_response` and, in `plugin dev`/`TG_MOCK`, `fixture_missing`.
- **Exit codes, as the CLI's:** 2 bad arguments, an unknown command or an input that fails its schema;
  1 a plugin error or a limit; 3 and 4 only for actions the agent runs.
- **Acceptance test of the spec** (coming, P6): `plugin validate` accepts the published Tone of Voice,
  and the SDK and the CLI check the same `collect` answer against its schema alike.

## 11. SDK for authors

- **`@better-tg/plugin-sdk`** ([`packages/plugin-sdk/`](../packages/plugin-sdk/README.md); the npm
  package is not published yet):
  - `@better-tg/plugin-sdk`: `definePlugin({commands})` (returns its argument, so a bundle keeps
    nothing else of the SDK: `export const { commands } = definePlugin({ … })`), `defineCommand()`,
    the types of `host` (every API of section 5, each optional, because only what is granted exists)
    and of the manifest, generated from its JSON Schema, and `SPEC_VERSION`.
  - `tg-plugin build [dir] [--entry src/plugin.ts] [--outfile …]` (and `buildPlugin()` from
    `@better-tg/plugin-sdk/build`): bundles the entry into the manifest's `main` (`dist/plugin.js`),
    one ES module without imports that exports `commands`, at most 1 MB. A Node or Bun built-in is
    refused, never polyfilled; the syntax and strings stay as written. The result is refused unless
    it is exactly one JavaScript file that parses as ES2023 (what the sandbox runs) and loads no
    module (`import`, `export … from`, `import()`, `require`), and `commands` is among the exports
    Bun reports. The file is written only as a real file inside the folder, never through a link.
    The output is the same on every machine for the same Bun version. It runs under Bun.
  - `@better-tg/plugin-sdk/test`: `runCommand(dir, 'collect', {limit: 10}, {mock: true})` is
    `telegram plugin dev <dir> collect --mock` in-process: the CLI's own code for it, bundled into
    the SDK, so the folder and manifest checks, the input and output schemas, the sandbox and its
    limits, the mock account, the in-memory cursors and the `dev/fixtures` answers are the same.
    It returns `{data, proposals, json}` (`json` is the line `plugin dev` prints, null fields kept)
    or throws `PluginRunError` with the CLI's `code`, `exitCode` and fields (`body`, `json()`). A
    test may add `fixtures` (matched before the folder's), `settings` (each value and their 256 KiB
    total checked like `plugin settings set`), `secrets` (values instead of `dev-secret-<name>`,
    `null` for one not set), `target`/`thread` (refused without `messages:read-target`, as in
    `plugin run`) and a `log` callback. Each run starts with a fresh mock account, and importing it
    changes no global of the test process. `validatePlugin(dir)` is `plugin validate --json`.
    `CLI_VERSION` is the CLI version whose checks the SDK carries.
- **Template** ([`templates/plugin/`](../templates/plugin/README.md), to become the repository
  `TheVilfer/tg-plugin-template`): manifest, `SKILL.md`, a read command over `messages.mine` with a
  cursor and a setting (a `flood_wait` after part of a page becomes a page of what was read, with
  `retryAfterSeconds`), a network command answered from `dev/fixtures`, tests on the SDK's test
  host, and a CI workflow (build, `dist/plugin.js` is in git and equals HEAD's after the build, two
  typechecks: the plugin code as ES2023 without Node or DOM types, then the tests;
  `telegram plugin validate`, mock tests). `dist/plugin.js` is committed: an install fetches the
  files of a commit. This repository's CI runs the same checks on it (`npm run template:check`,
  with a temporary home folder and a file `TG_MOCK`).
- **`plugin dev <dir> <cmd> --mock`** (section 8): no confirmations; Telegram, storage and
  settings are mock data, HTTP is answered from local fixtures (`dev/fixtures/*.json`) and secrets are
  placeholders. For a live check, install from the folder.
- **Reference plugin**: Tone of Voice, written only from this spec.

## 12. The official Tone of Voice plugin (coming, P6)

- **Permissions:** `messages:read-own`, `storage:read`. No network, no other people's messages, no
  `actions`: the agent's model writes the draft from the style document.
- **Onboarding:** the agent asks for consent and how much to read (about 300 of the user's own
  messages from private chats by default); `plugin run tone-of-voice collect --input '{"limit":300}'`,
  then further pages with `cursor` and `limit = remaining` until `remaining` is 0 or `done` (on
  `flood_wait` it keeps the error's `partial`, lowers the remaining limit by its `count`, waits
  `retryAfterSeconds` and goes on from the error's `cursor`); it fills the
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
