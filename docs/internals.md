# Internals

Why the code is the way it is: workarounds, security reasons, protocol quirks, thresholds and
platform specifics. Code files carry no comments (see `AGENTS.md`), so this file holds the
knowledge that used to live in them, grouped by module. What the code does is in the code; this
file says why.

## Build and generators (`scripts/`)

- **`gen-version.mjs`** runs on every build and `pretest`. It writes `src/version.ts` (standalone
  binaries have no `package.json` next to them), regenerates `src/generated/tl-commands.ts` and
  `src/generated/tl-docs.ts`, keeps `.claude-plugin/plugin.json`, `server.json` and
  `gemini-extension.json` on the package version, pins the `VERSION='…'` line of `install.sh`
  (each stable release ships `install.sh` as an asset; `releases/latest/download/install.sh` is
  the public entry point), embeds every `*.md` of `skills/better-tg-cli/` into
  `src/skill-files.ts` (so `telegram skill install` works from brew and standalone binaries) and
  embeds `schemas/tg-plugin/<date>.json` into `src/plugins/manifest-schemas.ts`, so the CLI
  validates `tg-plugin.json` with exactly the schema it publishes. CI's "Versioned files match
  package.json" step runs it and fails on any diff, which also catches a new TL layer.
- **`plugin/`** is the folder submitted to Anthropic's plugin directory: regular files only (no
  links into the repo). The Claude plugin is the skill alone, because the directory accepts MCP
  servers that run on the user's computer only from Verified organizations; Codex and Cursor
  start the pinned `npx better-tg-cli@<version> mcp`. No brand name in the display name (an
  unofficial client). The directory wants a square icon of at least 128 px, so the SVG is
  re-declared at 512. The Codex MCP config stays in `.codex-plugin/mcp.json`: a `.mcp.json` in the
  plugin root would be loaded a second time by Claude Code.
- **`agent-plugin/`** is a separate Agent Plugins v1 package for the Hermes catalog because its
  root `mcp.json` with a local server must stay out of `plugin/`. Hermes hands a stdio server only
  `PATH`, `HOME`, `USER`, `LANG`, `TERM`, `SHELL`, `TMPDIR` (plus the Windows set); `"${NAME}"`
  forwards one when the user has it set. The Linux Secret Service needs the D-Bus session.
  Credentials and approval settings are never forwarded.
- **`gen-tl-commands.mjs`** generates only the stable name mapping (one entry per TL `isFunction`
  request, ~823); parameter types are derived at runtime from the bundled schema, so the table
  stays small. It throws on a new clash between a generated namespace or root method and a
  curated command (`CURATED_COMMANDS`, keep in sync with `src/index.ts`), so a new TL layer can
  never silently shadow a curated command. Curated commands that host a same-named namespace as
  subcommands (`SUBCOMMAND_OK`) are intended clashes; `OVERRIDES` is the place for a future remap.
  `src/generated/tl-commands.ts` holds `[namespaceKebab, methodKebab, className]` per method
  (namespace `""` for the top-level invoke/transport wrappers); `src/generated/tl-docs.ts` holds
  one JSON string per namespace (key `""` for root methods), decoded on demand by `src/tl-docs.ts`
  only when help or schema output needs it.
- **`fetch-tl-docs.mjs`** fetches the human method descriptions once from
  `core.telegram.org/method/<ns.method>` into `scripts/data/tl-docs-layer229.json`; they are never
  fetched at runtime. It is polite (about 4 concurrent requests, a delay, a couple of retries, a
  naming User-Agent) and caches raw HTML under `.tl-docs-cache/`. The docs site lags the bundled
  layer, so new methods 404 and get a fallback line pointing at the future URL; a 404 is cached
  as an empty page. HTML to text drops tags until none are left (one pass can leave
  `<scr<b>ipt>` behind) and decodes entities exactly once, last, so a decoded `<` stays text.
  snake_case doc parameters are matched to camelCase schema names.
- **`api-coverage.mjs`** (issue #47) gates three metrics: TL reachability (`>= --min`, default
  90; the generic `api` command makes every method reachable), dedicated per-method commands
  (fixed at 100%) and Telethon 1.45.0 `TelegramClient` accounting (`>= --min`). A TL method is a
  class that `extends Request<…>` in teleproto's `api.d.ts`; keying off that skips
  `Api.Message`/`Api.MessageService`, which are tagged `classType: "request"` by mistake. Methods
  reached only through teleproto's high-level helpers (`getDialogs`, `sendMessage`, `sendFile`,
  `downloadMedia`, login, updates) are kept by hand in `HELPER_REACHED`, because the scanner only
  sees literal `new Api.*`. It reads `src/mcp-api-allowlist.ts` as text (CI also runs on Node
  versions without TypeScript stripping), so that file must keep its literal group shape.
- **`bundle.mjs`** builds one CommonJS bundle, brotli-compresses it at max quality and wraps it in
  a tiny loader. Shrinking teleproto: the TL schema is re-encoded (1.8 MB → ~0.3 MB, identical
  objects; `tl-compact.mjs`), ~700 generated RPC error classes become a table plus one generator
  (`errors-compact.mjs`; classes with a captured value such as `FLOOD_WAIT_N` stay verbatim),
  `StoreSession` is replaced (it pulls store2 and node-localstorage, the source of Node's
  localStorage warning), socks/ip-address/smart-buffer are dropped (no proxy support) and `mime`
  is a stub with common extensions (teleproto calls `getType` to pick photo/document/audio and
  `getExtension` to name downloads). cifrante never looks up its optional native addon: none is
  shipped, and the bundled `__filename` (the builder's path) would make it search directories on
  the user's machine. The Windows version resource has four numeric parts only (a release
  candidate carries the version it leads to), because code signing checks product name and
  version; Bun appends `.exe` for Windows targets.
- **`next-version.mjs`**: `Add …` or a breaking marker (`!`, `BREAKING`) → minor (breaking is still
  minor before 1.0), anything else → patch, only `Release v…` commits → nothing. Release
  candidates are tagged too, so the level is always counted from the last stable tag.
- **`mcpb.mjs`** packs `dist/telegram.mjs` as a Claude Desktop extension, which runs on Desktop's
  built-in Node, so users need no Node, npm or brew.

## Broker and site (`broker/`)

- The broker hands the app's `api_id`/`api_hash` to invited users at login time. Invites live in
  KV under sha256(token); the raw token is never stored or logged, and there is no admin HTTP
  endpoint on purpose (`broker/scripts/invite.mjs` manages invites through wrangler; `panic`
  removes `API_HASH`, and without it the Worker answers 503 `broker_not_configured` before it
  touches KV).
- Order in the credential handler: the per-IP rate limit runs before any KV work (slows token
  guessing), and the config check runs before an invite use is counted, so a misconfigured broker
  never burns one. KV is eventually consistent, so use caps and signup counters are soft and may
  overshoot slightly under a burst.
- Signups open only when the KV key is exactly `"on"` (a raw string, not JSON) and Turnstile and
  the mail sender are configured; a verified email is required, so no sender means no signups.
  The live limits are Worker secrets (`SIGNUP_DAILY_CAP`, `SIGNUP_CODES_PER_IP`,
  `SIGNUP_CODES_PER_EMAIL`), so the code holds only conservative fallbacks. The per-email limit is
  checked before the per-IP one, so a refused resend does not eat the IP's allowance. One email
  holds one working invite (a new one replaces the old); a revoked or missing record stays a
  refusal. One invite logs in up to three computers, each with a spare, because the broker sees
  credential requests, not whether a login worked (a timed-out QR scan or a wrong 2FA password
  must not cost a computer). The six-digit code uses rejection sampling to stay uniform.
- A page's language comes from its URL alone (one language and one canonical per URL, as
  hreflang expects). `HEAD` gets the same answer as `GET`: crawlers and link checkers use it. The
  old signup links (`?return=`, `?mode=`, `?agent=`) still arrive at `/` and are redirected.
  Inside `<script>`, `<` is escaped so nothing can close the tag. `broker/src/assets.ts` holds
  copies of `assets/social-preview.png` and `assets/icon.svg`; a test fails if they drift.
- IndexNow (`broker/scripts/indexnow.ts`): the key is public by design (the Worker serves it at
  `/<key>.txt`); 200 and 202 both mean accepted (202: the key is still being checked).
- Signups hand the maintainer's app keys to strangers, so every guard fails closed: signups are
  off unless KV `config:signups` is `"on"`, Turnstile is verified server-side, and there are
  per-IP, per-email and daily caps. Asking again with the same address replaces the invite (a lost
  token, a session Telegram ended). `invite.mjs signups off` closes the page; `/v1/credentials`
  and invites already issued keep working.
- Without a valid `?lang=`, a browser that prefers Spanish or Russian is redirected with 302 (the
  preference is per visitor); everyone else, crawlers included, gets English at the bare URL.
- The answer-first pages (`/mcp`, `/faq`, `/compare`) follow the README: keep them in step when
  behaviour changes. The install guide's "screenshots" are HTML mockups, not captures: crisp on
  any display, no personal data, nothing extra to host.

## Telegram client (`src/client.ts`)

- **Connecting.** Credentials, session, transport and the test-DC flag come from one store read
  (a second read after the 1 s config cache could see something else or fail). Each connection
  attempt gets a fresh `StringSession`, so a failed TCP try leaves nothing behind for WSS. Logs go
  to stderr at ERROR unless `TG_LOG_LEVEL` says otherwise, so `--json` stays parseable. A write
  approved in mode "ask" connects only as the account it was approved for. The mock client is
  imported on demand so a normal run never loads it.
- **Teardown** uses `destroy()`: it closes the main connection and every borrowed sender (such
  as a file-download DC). `disconnect()` leaves the secondary download loop alive, which then
  throws `TIMEOUT`.
- **Dialog list.** `messages.GetDialogs` on a big account answers with `FLOOD_WAIT`, so a process
  reads the list once and reuses it: chat lookups share one snapshot (a sync over 100 chats must
  not refetch it per chat), and inbox/chats show a list read in this process seconds ago
  (`DIALOGS_REUSE_MS`, 10 s) so counters stay live in a long-running MCP server. A cut first page
  never replaces a whole list that is still fresh; a first page shorter than `DIALOG_PAGE` is the
  whole list. The list on disk (`src/dialog-cache.ts`) belongs to the client `getClient()` built,
  named by a hash of its session; a test's own client never reads or writes it.
- **Chat lookup** (`resolveChat`). "me" resolves to Saved Messages before any title matching
  (otherwise it substring-matches "Game", "Meetup"…). A `t.me` link names its chat exactly and is
  never a title search. Numeric IDs match dialog peer IDs only, never titles. The list on disk is
  tried first (an ID, a @username or an exact title, fetched with one small call instead of the
  whole list), and a hit is checked again: renamed, gone or a @username that moved on makes it
  stale. A chat newer than the list (a DM, a channel just joined) cannot be fetched by bare ID
  without the access hash the first dialog page carries. There is never a silent pick between
  several chats: a write needs exactly one exact title (or refuses with the candidates), a read
  accepts one partial match. One match in a cut list proves nothing, so a title is matched
  against the whole list (read on, once per process, up to `DIALOG_MAX`). Candidates show only
  what tells chats apart (ID, title, type, never a @username); a ready re-run command is offered
  for reads only, because "send <guessed chat> …" invites sending to a chat nobody chose.
- **Recipients of an approved write** are the very objects the write guard resolved: a second
  lookup (after a disconnect, with other matching, or a @username that changed hands) could reach
  someone else. Uploads send the bytes the approval was checked against (read once per process),
  never the path again.
- **Reading history.** teleproto's `iterMessages` has no `replyTo`, so threads page
  `messages.GetReplies` directly; it has no sender filter either, so `--from` is applied
  client-side there. Channel comments live in the linked discussion group, whose ID is reported
  so callers can reply there. Paging goes by the oldest real `Api.Message` in a batch: Telegram
  mixes `MessageService`/`MessageEmpty` into raw batches, and paging by the last raw item stops
  silently when it is a service message. `hasMore` is proven by asking for one message past the
  limit (the server may cap a page below `limit + 1`; a full page alone proves nothing).
- **Who wrote a message.** `out` alone misses some own messages (one saved into Saved Messages,
  one sent from another device into a group can come with `out=false`); the sender is `fromId`,
  or the chat itself in a private chat, and a channel post has no `fromId` at all. teleproto
  attaches the entities returned with the message, so `msg.sender` usually needs no extra call.
  `Channel` is checked before `isGroup` because GramJS reports megagroups as groups too.
- **Login codes and gift links.** 777000 (Telegram) delivers this account's login codes and
  489000 ("Verification Codes") the codes other services send through Telegram Gateway. Over MCP
  every message from, in the chat with, or forwarded/saved from these accounts has its codes
  hidden in all its content (text, `richMessage`, entity URLs, buttons, quotes, link previews;
  callback bytes hidden whole), including a quote of such a message in another chat. A gift-code
  link redeems the gift for whoever opens it, so it is masked everywhere. Big integers inside
  content are IDs or sizes, not content.
- **Raw API results over MCP** redact phone numbers, birthdays, private contact notes and every
  location field; a venue's place ID and directory (Foursquare, Google Places) find the hidden
  address again, and a giveaway result or a boost carries the slug of the gift code it hands
  out, so those are redacted per constructor. `help.GetConfig` may carry a token that logs into
  Telegram's web pages as this account.
- **Buttons.** Layer 229 models a button as `{ text, type }` with a `ButtonType*` or
  `InlineButtonType*` object instead of one constructor per kind (GramJS layer 198). A plain
  reply-keyboard button sends its label as a message. Callback bytes are taken straight from the
  live message, never round-tripped through a string. The approval binds to the button as the
  message carries it, because two buttons can look the same once masked while sending different
  bytes; if the bot changed the keyboard since the approval, nothing is pressed. Over MCP a
  callback is matched only by the payload as shown, so a hidden payload (a login code) cannot be
  guessed through "found" vs "not found".
- **Forward.** Over MCP the source messages are checked first: Telegram copies the source media,
  so a contact card or a location the model never saw would reach the recipient; a message that
  cannot be fetched is refused. `forwardMessages` under-reports its result (a GramJS quirk), so
  the count is the requested one and `forwardedIds` are only the copies Telegram confirmed.
- **Mute and schedule** dates are Telegram `int` Unix seconds: a longer value would wrap to some
  other date ("forever" is `MAX_INT32`). teleproto types notify and dialog peers as `EntityLike`,
  but its resolver passes a ready `InputNotifyPeer`/`InputDialogPeer` through unchanged.
- **Polls (layer 229):** outgoing answers carry no option bytes (the server assigns them) and
  correct answers are 0-based indexes. Layer 229 replaced `channels.editCreator` with
  `messages.editChatCreator`. Basic groups support only an all-or-nothing admin toggle.
- **Delete** reports what Telegram did: a channel or supergroup ignores "just for me".
- **Search.** Server-side search covers supergroups only; basic groups are filtered locally.
  Every result carries its chat ID so a reply needs no second lookup. In a forum, the topic's
  root message is the thread and replies keep `topMsgId`.
- **Stats** follow a `STATS_MIGRATE_<dc>` redirect to the stats DC; an async graph is loaded with
  `stats.LoadAsyncGraph`, a graph error is reported per graph.
- **Membership.** An invite link (`t.me/+hash`, `t.me/joinchat/hash`) goes through
  `ImportChatInvite`, anything else through `JoinChannel`. Creating a group with members either
  adds every approved member or creates no group: dropping one silently would change what was
  approved.
- **The dialog list on disk** answers cheaply: an ID, a @username, or a title exactly one chat had
  in the whole list (or else the one title containing it) and still has now is fetched with one
  small call (`users.GetUsers`, `messages.GetChats`, `channels.GetChannels`). A read that the
  whole fresh list answers otherwise (an ambiguous title, an unknown name) gets that answer from
  disk too, with the candidates and `listedAt`, because reading the list again on a big account
  is a minute of `FLOOD_WAIT`s. Writes never take a title from disk (another chat may have taken
  it since) and never get an answer from it; any failure is a miss. The file keeps only what names
  a chat; counters and last messages always come from Telegram, and a list cut at a small `-n`
  never becomes the lookup list. The recipients cache of an approved write survives
  `disconnectClient()`.
- In a login-service message, callback data and a copy button's text are hidden whole: there
  they exist to carry the code.

## Commands (`src/commands/`)

- **A bad command line never costs an approval:** every argument parser and local check (a
  missing file, a bad poll, a wrong button selector, edit-permissions names) runs before the
  write guard and exits 2. `src/args.ts` parsers run while commander parses, so a bad value never
  turns into a silent default; an ID past the int range is refused because it would silently
  become another ID.
- **`auth`/`onboard`** never overwrite a working login; after `telegram logout` there is no
  session and they proceed. A store that cannot be read stops them, because it may hold a working
  login. A stored session Telegram no longer accepts is replaced. The login key comes from
  `--login-key`, `TG_LOGIN_KEY` (`TG_INVITE` until 0.36) or a hidden prompt, keeping it out of
  argv. On Windows the browser is opened through the URL protocol handler, because
  `explorer.exe` mangles URLs with query strings. Once the login is saved, the overall timeout no
  longer applies (the mode step has its own 10 minutes), and the server lingers one poll so the
  page sees "done". A new login drops the approvals and the dialog list of the old account; so
  does `logout`.
- **`check`** uses one snapshot for the whole report. Only an ended session (exit 5) is a reason
  to log in again; no network or a rate limit says nothing about the session.
- **`inline`** needs write access: the query and the user's ID go to an external bot.
- **`inbox` order:** people, then bots, then groups and channels, muted chats last (a muted
  supergroup with a huge counter is rarely read first); most unread first within each.
- **`schema`/`--json`:** indented for a person at a terminal, one line for an agent or a pipe.
- **Generated TL commands** (`src/commands/generated.ts`): registration is lazy (only the
  namespace and method on the command line are built), so startup and `--help` stay fast. A
  required paging or cache cursor (`offsetId`, `hash`…) defaults to 0 when omitted; `randomId` is
  generated by teleproto. `--no-*` TL flags (noWebpage…) stay plain booleans that set the param,
  not commander negations. A refused method is refused before its params are validated, so the
  refusal (not a missing flag) is reported; over MCP a method off the allowlist is refused there
  too. Help docs are parsed only when help is rendered. In a clash namespace the operand is
  taken over only when it is exactly a generated method name.
- **`sync`.** Checkpoints are keyed by chat ID (titles change and collide). An empty name never
  falls back to every chat, a numeric name is an ID (never a title "123"), and a @username is
  unique, so one match in a cut list is proven while a title is not. With `--media`, a failed
  download stops the chat before that message so `--resume` retries it, and a file that never
  downloads stops the chat only a few times before it is kept with a placeholder; when the very
  first message failed, `lastMessageId` is the one just before it so `--resume` does not fall
  back to a `--days` window it may have left. A directory at a file's place would let teleproto
  write inside it, so the sync stops. Media goes into a folder named by chat ID (a title such as
  `..` would escape `outputDir`), and the checkpoint file must not be a link out of the folder.
  A known checkpoint always bounds the fetch from below, so the gap since the last run is fetched
  in full even into a new file; appending happens only to a file whose header names this chat.
  Messages are ordered by ID, never by date: two in the same second must not swap, and IDs in a
  chat only grow. One failed chat never turns a partial export into a success.
- **`plugin`.** Installs are refused over MCP before anything is fetched, and never unsigned
  (without the secret store the human is not even asked). A run reads the verified snapshot once
  and runs those bytes whatever happens to the folder. Over MCP only the installation the call
  was classified and approved by may run (`TG_PLUGIN_EXPECT`): another one installed meanwhile
  under the same name is refused. Network use is a write through the guard in every transport
  (read-only refuses, "ask" binds the approval to installation, command, input and origins); one
  guard call, so an approval code is used once. A plugin call never sleeps through a
  `FLOOD_WAIT`: it gets the error with its cursor. Connecting and `getMe` count against the run's
  deadline. The audit gets origins and a count only. A run is cancelled by SIGTERM/SIGINT or by
  the MCP server's `tg-cancel` message; a flag in shared memory reaches a run whose code keeps
  the thread busy. Output is printed exactly as its length was checked, never re-serialized.
  `plugin dev` uses the built-in mock account in memory and HTTP from `dev/fixtures/*.json`, with
  fake secret placeholders. Secrets are the human's: over MCP or without a terminal the agent
  gets the command for the human's terminal; a value is stored only for the installation still
  registered after the prompt. `plugin remove` records the secrets of the installation before it
  deletes them, so a failed delete is retried silently before the next plugin command.
- **`update`:** a git checkout may carry unreleased commits, so it is pulled even without a newer
  release; an installed binary is never to be replaced by hand, because `install.json` would no
  longer match it.
- **`write-access`:** with `--json` the status goes to stdout as one line and the human text to
  stderr. In "ask" there is no dialog when the mode is set: every write waits for the user's yes
  anyway. A dialog that could not be shown throws `dialog_failed`, never a "No". Without a
  terminal, a dialog or a secret store (a cloud agent computer), the person picks the mode on a
  local page that waits up to 10 minutes.
- **Cursor defaults of generated commands** apply only to the exact paging/cache names and only to
  numeric types: never IDs (`msgId`, `id`, `userId`), never `offsetPeer` (an InputPeer), never a
  string `hash`/`offset`; `limit` stays required.
- **`plugin run` over MCP** without `TG_PLUGIN_EXPECT` is refused too: the server always sets it
  when it found the plugin, and when it did not, nothing was classified to run.
- **`api`** (`src/api-methods.ts`) is the single source of truth for read/write classification and
  hard refusals, shared by the command (guard and audit) and the MCP read/write split. A TL method
  carries no read/write flag, so the default is "write unless clearly a read" (issue #47).
  Refused outright, even with write access: account/session takeover, 2FA, password, passkey and
  phone changes, takeout, Telegram Passport, sharing the phone number or location, money
  withdrawal tokens, paid reactions and chat-ownership transfer; other paying is any non-read
  `payments.*`. Wrapper requests that carry another request in `query` are refused because
  teleproto builds the inner request from plain JSON, so they would run any refused method under
  a harmless outer name. Over MCP only a new or existing photo or document, a poll and a plain
  dice may be sent as media: teleproto converts a `MessageMediaContact`, a `Message` or a venue
  into InputMedia inside `client.invoke`, after the CLI's last check.

## Configuration and secrets

- **Config** (`src/config.ts`) is cached for 1 second. The stored secrets win over the file, and
  `writeEnabled` is never taken from the file: the write mode lives in the secret store
  (`src/write-store.ts`). Every command reads the session and `api_hash` with one strict store
  read per key: a failed read (locked Keychain, 1Password offline) throws, so no command connects
  with a stale file copy. Saving drops the file copy of exactly the secret it stores (an old
  profile's file copy may be its only copy). Changing the credential source and dropping the
  file `api_hash` happen in one write. With `source: invite` the `api_hash` came from the broker
  and is deliberately not stored. The config directory and file are owner-only.
- **macOS Keychain** (`src/keychain.ts`): secrets are written through `security -i` on stdin, so
  the session string never shows up in `ps`. If storing in the Keychain fails, the secret stays
  in the file and the move is retried on the next run.
- **Linux Secret Service** (`src/libsecret.ts`, `secret-tool`): a lookup that finds nothing exits
  1 silently, while a missing binary, D-Bus session or Secret Service fails with stderr or
  `ENOENT`. Every write is read back, because some backends accept a write while locked and store
  nothing.
- **Windows DPAPI** (`src/dpapi.ts`): one file `secrets.dpapi`, encrypted for the current user
  through the built-in PowerShell 5.1 with extra entropy (a blob another program made for this
  user does not decrypt as ours). Stdin carries base64 only, because PowerShell 5.1 reads stdin in
  the OEM code page. The file is decrypted once per process; a change decrypts it again right
  before writing, so a key another process changed is not written back stale. A parse failure
  has a fixed message, because a `JSON.parse` message would quote the decrypted secrets.
- **Dialog list on disk** (`src/dialog-cache.ts`) is written field by field so nothing else of a
  dialog reaches the file, and holds the whole list (not cut at a read limit), so a title found
  once is the only one. It is tied to a hash of the session: another login never reads it.
- **`src/env.ts`:** Node 25+ exposes an experimental global `localStorage` getter that prints an
  `ExperimentalWarning` when touched without `--localstorage-file`; teleproto probes for it on
  import, so the getter is dropped before any other module loads.
- **Approvals** (`src/approval.ts`): the signing key lives in the secret store next to the write
  mode, so dropping a file into the profile cannot forge an approval (or a fake elicitation entry
  in the audit log). An approval names its account by an HMAC of the stored session, never the
  session itself, so a logout and a login as someone else invalidate it. One file per pending
  code: using one is a single atomic `unlink` (whoever unlinks first owns it), and codes are
  created with `wx` so one never overwrites another. Codes avoid 0/O and 1/I. The mock profile
  never touches the secret store (`TG_MOCK_ASK` rehearses approvals with a file key).
- **File snapshots** (`src/file-snapshot.ts`) are keyed by the absolute path as given, so a
  symlink retargeted after the first read cannot lead to other bytes; after an approval that
  covers files, a path the approval did not read is refused.
- **Audit** never throws: an audit failure must not break the caller. Plugin entries record
  names, revisions, sizes, API names, proposal types, request counts and origins, never a value,
  input, result, URL, header, body or secret.
- A failed secret read throws rather than falling back to the file copy, because that copy may
  belong to another account.
- DPAPI through PowerShell is slow to start (about 0.3-0.6 s), hence the per-process cache. A
  change replaces the file atomically (temp file in the same folder, then rename). There is no
  cross-process lock: two changes that interleave between read and rename lose one (last rename
  wins), but a value is never brought back from an old cache.
- The approval signing key in the secret store raises the bar; it is not a wall (an agent with a
  shell that can read the store could still sign). Without a store the key sits in the profile,
  unprotected. The account fingerprint is taken from the session read when the action was shown
  (the MCP server reads it before opening the dialog).
- Without a secret store the write mode is a 0600 file next to a session the agent can read, so it
  guards against mistakes and is no security boundary; every status line and audit entry says
  "unprotected".

## Write guard and approvals (`src/guard.ts`, `src/approval-*.ts`)

- The MCP read tool sets `TG_READ_ONLY`: a hard stop even if a write was misclassified as a read.
  Writes match chats strictly. A mock write changes only a local file, so there is nothing to
  approve unless `TG_MOCK_ASK=1` rehearses "ask"; a code given for the call still has to hold.
- A code given for a call outside mode "ask" (the mode turned "on" while the user answered the
  MCP dialog) must still be a valid approval of exactly this action and account.
- A write that is certain to fail (a recipient, file, message or button that cannot be read)
  gets no code and keeps the exit code of the error behind it (an ambiguous name stays exit 2).
  Every recipient is approved as the ID it resolves to. A rate limit says how long to wait.
- The approval covers stdin only where the command reads it (`set-bio -` sets the bio to `-`);
  the body is shown and hashed as the command sends it, and nothing read from stdin after the
  approval can be part of the write. An empty stdin the MCP server always hands over says
  nothing. The account is read once for the check and the new code.
- Over MCP the description goes to the model only, with every value masked before it is escaped
  (the server could not mask the finished text). The person sees the action in full in the
  dialog or terminal. A plugin approval covers one installation and snapshot: one installed
  under the same name later, or an update in between, does not inherit it; it also lists where
  the run may send data and which secrets the host would attach.
- Printed prose is one line with control characters escaped: it may quote what was typed and
  must never act on the terminal. A command whose quoted argument holds line breaks is not
  repeated in prose; the exact one is `retry.argv` in JSON.
- An approval is built from what commander actually parsed, not the raw argv, so flag order or an
  output-only `--json` does not change it; everything parsed except `OUTPUT_ONLY` is covered, so
  a new option needs no change there.
- Every stop of the guard short of an approval prints one JSON error line on stdout with `--json`
  and the prose on stderr in any case, with the error's own exit code.

## Process and CLI entry (`src/index.ts`, `src/errors.ts`)

- Every exit waits until stdout and stderr reach the reader, so a `--json` result is never cut;
  a `process.exit()` already on its way keeps its code. An exit requested from a callback or an
  unawaited promise is not an error.
- A closed output pipe (`telegram help stats | head`) exits quietly: Node turns SIGPIPE into an
  async `EPIPE` error on stdout, which would otherwise crash.
- commander's built-in `help` is replaced so `telegram help get-config` can run a `help.*` API
  method while `telegram help [command]` keeps its usual behaviour. `help-all` is generated from
  the definitions, so it never drifts, and is cheaper for agents than many `--help` calls.
- argv is always parsed node-style: inside Claude Desktop's built-in Node (an Electron utility
  process) commander would read it Electron-style and take the script path for a command.
- commander's own errors exit 2 (usage) instead of 1; a group run without its subcommand prints
  help to stderr and is a usage error. Mock mode refuses the commands that would create, drop or
  unlock a session or touch the secret store.
- An MCP call in a worker thread: its piped stdin keeps the thread alive, so it is ended when the
  command is done, and fd 0 there is the server's MCP channel, so the worker's own stdin stream
  is read into the shared cache first.
- The exit override is set on every command, because `addCommand()` does not pass it down.

## MCP server (`src/mcp.ts`, `src/mcp-http.ts`, `src/mcp-output.ts`)

- Commands run as child processes (or worker threads), which keeps their output off the
  protocol channel and reuses the CLI's write guard. Children get no stdin unless given, so any
  prompt (2FA, a confirmation) hits EOF instead of hanging, and `windowsHide`, because GUI hosts
  would flash a console window per call. A cancelled plugin run gets SIGTERM (or a message in a
  worker) and a grace period before it is killed; a flag in shared memory reaches a run whose
  code keeps the thread busy.
- **Classification.** A pure `--help` request is a safe read for any name the CLI really has. `api`
  and generated TL commands are classified by the TL method (resolved as the CLI resolves it, so
  an unknown method is refused rather than guessed from its prefix). Only allowlisted TL methods
  run (`src/mcp-api-allowlist.ts`); the denylist reason wins when there is one. A call that would
  spend Stars never runs in any write mode; only option names and the parsed params object count
  (an escaped key such as `allowPaidStars` too), and params from stdin are checked by the
  CLI on the built request. MCP can only show the write mode: the user changes it, not the model.
  `plugin secret set|rm` gets no command when the model added a value, so a value is never
  echoed.
- **Approvals over MCP.** The approval is checked before the mode: the child reads the mode again
  and may see "ask" where the server saw "on". The child gets this exact stdin and hashes it the
  same way. The account the user is asked about is read before the dialog opens, so a login as
  someone else meanwhile cannot move the approval. The server has no parser and no connection,
  so a describe run of the CLI prints the action and computes the hash its own guard will check.
  Approval codes, describe runs and plugin expectations come from this call's plan only, never
  from an environment the server inherited. `elicitation: {}` (2025-06-18) means form; 2025-11-25
  may list modes. A cancelled call closes its dialog at once and a late answer is ignored.
- **Output.** Everything the model gets is masked, then capped: gift links always, and login
  codes after a "code:" label in what echoes the model's own call (a send's result, an approval's
  retry). A read shows chat content with gift links masked only. stderr diagnostics (such as the
  MOCK MODE banner) stay out of a JSON text so the model can parse it. Error messages may quote
  what the model sent and are masked too.
- **Masking rules** (`src/mcp-output.ts`): a login-code label is "code"/"код" with at most one
  known word before it ("Your login code:", "Ваш код:"), so "Promo code:" and "exit code:" stay;
  Russian may put the rest of the label after "код". The separator may be whitespace, the `| ` of
  an approval description or already escaped whitespace. The regexes are linear: the lookahead
  runs first so the lookbehind over spaces runs only where "code" starts. JSON text is masked
  string by string, so keys, numbers and layout stay byte for byte.
- **Setup over MCP:** the model holds the setup link, so every write mode picked there is
  confirmed by the person; a read-only server logs in only.
- **HTTP transport** (`telegram mcp --http`, for hosts such as Grok Bot whose connectors run in a
  cloud sandbox and reach the computer through a tunnel): answers are always JSON with
  `nosniff`; unexpected failures give the client a fixed text and keep details in the server log;
  the log has one line per call without arguments or message text. A request with an `Origin`
  header is refused (browsers send it, server-side MCP clients do not), which blocks drive-by
  pages. Two servers starting at once may both create a token: each serves whichever the store
  kept, and a rotation succeeds only if the new token is what the store now holds. Plugin-run
  cancellation reaches only the runs of the session that sent it; a closed request does not
  cancel.
- Calls run one at a time: parallel sessions steal each other's updates and invite `FLOOD_WAIT`.
- Stars: a query that merely contains the word (`--query allowPaidStars`) stays a free read, and the
  value of an option is skipped as commander consumes it, so `--query '--allow-paid-stars=5'` is
  a search for that text.
- `plugin run` is classified as a read when the installed manifest gives the command no effects,
  a local write otherwise; that is only a route, the run itself loads the verified snapshot again.
  `plugin install` arguments pass only in the exact form the CLI parses (one source, an optional
  `--expect sha256-…` that keeps the content the model validated pinned).
- Gift links: the host is `t.me`, `telegram.me` or `telegram.dog` (optionally `www.`) as a whole
  name, so `support.me` or `shop.t.me` is not one; the slug ends at the first non-slug character
  (percent-encoding counts), so trailing punctuation stays.
- Over HTTP every request needs the bearer token from `telegram mcp --token`. `Mcp-Session-Id`
  scopes only the cancellation of plugin runs (JSON-RPC ids are per session, so two clients may
  both use id 1).

## Onboarding page (`src/onboard.ts`)

- The local server answers only its exact `Host` (a DNS-rebinding domain pointing at 127.0.0.1
  sends its own) and same-origin POSTs (browsers always send `Origin` on POST). The URL carries
  the secret and is never sent on to another site (no referrer).
- A timed-out QR scan or a failed attempt starts over with the same credentials and no new
  invite use. A "wrong password" from the previous try stays visible.
- The mode step: skipping it or waiting too long keeps read-only. The clock stops while a choice
  is applied (a dialog may stay open long): running out then would send `done` with the old mode
  and the approval a second `done`. Exactly one `done` is sent. A choice counts only when the store
  reads back exactly that mode and, for timed modes, the end `applyMode` reported to the second,
  so an older value with the same mode name does not pass (`store_failed` otherwise). The session
  is saved either way; a refused mode never shows as in effect.

## Plugins (`src/plugins/`, see `docs/plugins.md`)

- **Sandbox** (`runtime.ts`): QuickJS compiled to WebAssembly, the single-file variant with the
  WASM inlined so the npm bundle, the Bun binaries and the `.mcpb` worker carry it without a
  separate file; it is loaded only when a plugin runs. A prelude takes the native bridge off the
  global object and keeps its own copies of what it needs, so the plugin cannot swap them. The
  interrupt handler polls the deadline, limits and a shared-memory cancel flag (a cancel cannot
  arrive as an event while plugin code keeps the thread busy). A late host result after a limit
  or cancel is dropped. The stack limit sits below the host's own stack so QuickJS raises a
  catchable `RangeError` before V8 runs out; when the host stack ends first it is the same limit.
  QuickJS throws `null` when it cannot even allocate "out of memory". After a run stopped mid-job,
  freeing the leftover objects would abort the engine, so the whole WASM module is dropped with
  its last reference instead. Nothing the engine prints reaches the command's stdout or stderr.
- **Host API** (`host.ts`) is built per run from what the manifest's permissions and the
  command's effects grant together, so `effects: []` never gets a write. A chat is an ID or a
  @username, never a title to match. Cursors are random ids for state the host keeps (account,
  installation, chats fixed on the first page, offset per chat), so a plugin never sees the walk
  and cannot swap it; a cursor of another account or installation is refused, and host-written
  state read back from disk is checked all the same. `messages.mine` spends a request budget (a
  chat takes two requests, so it stops with a cursor before running out), skips service chats
  (checked again per chat), and returns only the owner's own authored text: no forwards, nothing
  from or quoting a service account, no empty media. A topic or thread without a valid root
  (1…2^31-1) is refused, never read as the whole chat. Every Telegram request goes through one
  path where `FLOOD_WAIT` comes back with the point to continue from and what was collected; the
  host keeps its own record of the wait, never the plugin's copy.
- **Network** (`http.ts`, `net-address.ts`): one pipeline per request. The origin must match the
  manifest exactly; the path is checked as the plugin wrote it, before the URL parser resolves dot
  segments and backslashes. Every DNS answer must be public unicast, and one private answer makes
  the whole name suspect; the socket connects to the checked IP and TLS is verified for the
  origin's host with options set in code (`NODE_TLS_REJECT_UNAUTHORIZED=0` changes nothing).
  IPv6 forms that reach an IPv4 address are judged by that address: IPv4-mapped, SIIT
  `::ffff:0:a.b.c.d`, deprecated IPv4-compatible, NAT64 (the well-known prefix and the network's
  own prefix found through `ipv4only.arpa`, RFC 7050; bits 64-71 skipped per RFC 6052), Teredo and
  6to4; only 2000::/3 is reachable. Only chunked transfer coding is accepted, because another
  coding on the wire would hide an echoed secret from the stripper and the size limit from the
  body; "deflate" is sometimes sent without its zlib wrapper. One budget covers every head
  (including 103 Early Hints), chunk-size lines and trailers; the body grows by doubling. A request
  ends a little before the run's deadline so the plugin still gets its `timeout` error, and one
  deadline covers secret reads, DNS, connect, TLS and response.
- **Secrets in requests:** values only a human enters, in the profile's secret store under a key
  the core builds. A secret limited to some paths goes only with a path every server reads the
  same way. Every form of every injected value (raw, URL and form encoding, which also encodes
  `!'()~`, base64 in all alignments, longest first) is stripped from responses. A partial body
  (206) could hold a cut secret no form matches, so it is refused where a secret was sent. A
  server-supplied value is never put into an error, because errors reach the sandbox unstripped.
  Under Vitest without `TG_MOCK` or an injected store, the real secret store is refused.
- **Proposals** (`proposals.ts`): the host checks every field and builds the summary, argv and
  stdin from the same checked values; only own fields are read (no `__proto__`); a reaction is a
  few code points, never an option or whitespace.
- **Schemas** (`json-schema.ts`, `run.ts`): validation is time-bounded and never uses a regular
  expression from the manifest; a `$ref` must point at a subschema position and a `$ref` cycle
  that never descends ends. Lengths count code points. The output envelope keeps `null` (never
  `formatJson`, which drops it). A message, topic or thread ID is a positive 32-bit integer: 0
  would read as "no root".
- **Files** (`safe-fs.ts`, `source.ts`, `manifest.ts`): every path component must exist with
  exactly its case and be a real folder or regular file, never a link or a Windows reparse point
  (which Node may not report as a link); a file with more than one hard link is refused. Paths
  that differ only in case (folders too) are refused because they collide on a case-insensitive
  disk. File maps have no prototype, so a file called `__proto__` is an ordinary key. From GitHub,
  sizes come from the trees first so nothing large is downloaded; an official owner's repository
  serves commits of every fork in its network, so a source is official only when the commit is on
  one of the owner's own branches or tags (annotated tags peeled) or in its default branch.
- **Registry and data** (`store.ts`): the registry is MAC-signed with a key from the secret store
  over sorted-key JSON (the form a reader parses back); reads never create the key, so a registry
  without its key is refused instead of signed anew, and an empty registry is read without the
  key so a profile with no plugins never touches the store. A lock file (`O_EXCL`) serializes
  registry and quota changes across processes; it is re-entrant in-process, never held across a
  dialog or a download, and a lock of a dead process or older than the stale limit is taken over
  by moving it aside first (two processes breaking it at once cannot both delete a fresh lock).
  A run's storage write waits for the lock yielding to the event loop, and the deadline and
  cancellation are checked once more under the lock right before the file changes. Cursor state
  files are named by a hex hash, so ids that differ only in case never meet. Removal checks under
  the lock that it is still the installation the human confirmed.
- **Semver:** a prerelease matches only a range that names a prerelease of the same version;
  `1.x.3` is not a range.
- **Every run** gets a WASM module, runtime and context of its own, all dropped afterwards: nothing
  survives between runs but what the host stores. Values cross the boundary only as JSON strings
  through one native function hidden by the prelude, so the guest never holds a host object and
  the host never trusts a guest value it did not parse. The job queue is drained after the
  command is called and after every host operation settles; with no host operation in flight and
  the promise still pending it never will settle (`plugin_error`), so neither `await 0` nor a
  never-resolving promise can hang a run.
- **Read APIs** hand the sandbox a narrow shape built from the raw `Api.Message` (no buttons,
  entities, quotes or previews) with the text masked before it gets there, in a terminal too: a
  login-code service account's message (or a forward or quote of one) at the `service` level,
  everything else at `echo`. Guest values are read field by field with type checks, cursors are
  decoded strictly and every filter is applied again.
- **HTTP:** no redirect is followed (a 3xx comes back as is), no cookie is kept or sent, and no
  proxy is used: the host speaks HTTP/1.1 over TLS itself on a socket opened with `tls.connect`
  to the checked IP, which reads no proxy variable. Backends in order: one a test injected,
  `plugin dev --mock` fixtures, `TG_MOCK` fixtures, refused under Vitest (no test opens a socket by
  accident), then the network.
- **Secrets** come from, in order: a store a test injected, a 0600 file of fake values under
  `TG_MOCK`, nothing under Vitest (no test can reach the Keychain, Secret Service, DPAPI or
  1Password), then the profile's secret store.
- **Proposals** run through the normal write path (guard, approval, mode) as the argv the host
  built.
- A folder file is read from a descriptor checked to be the file the walk saw, so a folder swapped
  meanwhile is caught.

## Transport, setup and updates

- **Transport** (`src/transport.ts`): TCP first; when it is blocked (cloud agent computers) the
  client falls back to WebSocket (`wss://<dc>.web.telegram.org/apiws`; teleproto picks the
  obfuscated framing) and saves `wss`. In auto mode a blocked TCP try would print a stack trace
  per retry, so logs stay quiet unless `TG_LOG_LEVEL` asks. A read (`TG_READ_ONLY`) never writes
  the profile; saving the setting is not fatal, the next run tries TCP again.
- **Client options** (`src/client-options.ts`): every real `TelegramClient` is built here, which
  is the single check that keeps `TG_MOCK` offline. Flood waits are retried silently at INFO by
  teleproto, so they are surfaced to show a long pause is not a hang.
- **Login** (`src/auth.ts`, `src/setup.ts`): the client connects before any prompt so a blocked
  TCP transport falls back first. The QR is redrawn in place (the token refreshes every 30 s). The
  2FA password is read hidden. Only an auth error code (or Telegram refusing the stored key) is
  treated as an ended session, never a guess from another failure. A new login over an old one
  stays on the same (test) servers. teleproto reports a stop as `AUTH_USER_CANCEL`; the real cause
  is kept.
- **Prompts** (`src/prompt.ts`) go to stderr, because stdout is the command's result; the input
  is muted only after the question is written.
- **1Password** (`src/onepassword.ts`): `TG_OP_VAULT` wins over the config file, which is read
  directly to avoid a circular import with `config.ts`; on Windows `where` lists every match and
  the first is taken.
- **Skill install** (`src/skill-install.ts`): a broken link means the agent has no skill; only a
  real folder whose `SKILL.md` names this skill is ours to replace. `writeFileSync` follows a
  symlink inside the folder, so every target is checked before the first write.
- **Update** (`src/update.ts`): `install.sh` records the binary's SHA-256 in `install.json`; a
  binary replaced by hand no longer matches, so such an install is updated by running the script
  again, and the folder is compared as `install.sh` spelled it. The daily update check is marked
  before it runs so parallel runs do not all spawn one, and is best effort (offline or sandboxed:
  skipped); `plugin dev` touches no cache. npm and scoop are `.cmd`/`.ps1` shims on Windows that
  Node starts only through a shell; the arguments are constants, so that is safe.
- **Write mode** (`src/write-store.ts`, `src/write-mode.ts`): with a secret store the mode sits
  next to the session, out of reach of a config-file edit; without one (cloud agent computers
  such as Grok Bot: Debian, no D-Bus) it is a plain file, which the audit records. The Secret
  Service needs a D-Bus session bus. A dialog that could not be shown is not a "No". The end of a
  timed mode is fixed after any dialog and reported as written so the caller can compare.
- **Mock runs** keep their audit log and write-access flag away from every real profile.
- **Windows confirm dialog** (`src/confirm.ts`): a hidden topmost owner keeps the message box
  above the agent's window instead of behind it.
- **Output formats** (`src/formatters/`): compact non-TTY output is one line per item, IDs first.
  Text is sliced by code points, so emoji surrogate pairs are never split (invalid JSON
  otherwise). Times are local, and the header names the zone once. JSON always has `text`, so jq
  filters such as `.text | test(...)` never hit null; empty optional fields are dropped.

## Shell scripts

- **`install.sh`** is documented for users in `docs/install.md` (usage, output, exit codes, threat
  model, lock). Implementation notes:
  - The whole script is one `{ }` block opened on the line after the shebang, so a download cut
    short anywhere is a syntax error, never a partial run.
  - The `VERSION='…'` line is rewritten by `gen-version.mjs`; keep it on one line. The old
    `install.sh` (now `scripts/dev-install.sh`) took `TG_SKILL_DIR`; an old invocation stops
    before writing anything.
  - A shell under Rosetta reports x86_64 on Apple silicon, so the native build is taken. The
    Linux builds link against glibc, so Alpine and other musl systems are refused. The `.tar.xz`
    is used when the system can unpack it, else the `.tar.gz` (Debian and Ubuntu images ship gzip
    but not xz).
  - curl only, run with `-q` first (no `~/.curlrc`, which could turn certificate checks off) and
    HTTPS on every redirect; wget cannot be told that up front.
  - Files are placed only with hard links (proved to work once per file system), which fail when
    the name exists, so a failed `ln` can only mean the name is taken; a folder that appears just
    before `ln` would be linked into and is detected. The staging folder sits next to the target
    (same file system) and is named in the lock.
  - Every step must succeed before a file counts: no pipes (a POSIX pipe keeps only the last exit
    code), so the archive is decompressed into a file first. `$(...)` drops trailing blank lines,
    so outputs that must match byte for byte go to a file. sha256 tools escape a file name with a
    backslash, so the file goes in on stdin.
  - An upgrade replaces the binary first: a run killed in between leaves the old manifest, which
    never claims more than is installed. A first install writes the manifest first, so a killed
    run still owns the path next time. The file checked before downloading must still be the same
    (inode, size, mtime, then its sum).
  - PATH is split by hand: an empty component is the current folder, nothing is glob-expanded,
    and `./` keeps `CDPATH` out of a relative component.
- **`scripts/build-binary.sh <target> [outdir]`** (`darwin-arm64`, `darwin-x64`, `linux-x64`,
  `linux-arm64`, `windows-x64`): native Windows tools need `C:/…` paths, not Git Bash `/tmp/…`;
  Bun writes the exe version resource only when building on Windows; macOS arm64 refuses unsigned
  code, so binaries are re-signed ad hoc. Archives are `xz -9e` (about 40% smaller than gzip;
  Homebrew unpacks `.tar.xz`) with 24 MiB blocks, because `-T0` alone stays on one thread at `-9`
  (a 192 MiB block is larger than the ~95 MB binary); that is 3.5x faster for about 1.7% more
  size. A `.tar.gz` is added for systems without xz, and a `.zip` for Windows (Scoop and Explorer
  unpack it natively).
- **`scripts/smoke-install.sh <release dir> [--no-xz]`** accepts `install.sh` on the archives of
  a build with no network: a fake curl first on PATH serves the archives and a `SHA256SUMS`
  written the way the release workflow writes it, for the pinned release URL only. `--no-xz`
  leaves xz off PATH, so Linux must take the `.tar.gz`.
- **`scripts/release.sh`**: see "Releasing" in `CLAUDE.md`. A release PR is merged with a merge
  commit, so the stable tag stays an ancestor of `next` and the next release counts its PRs from
  there; squash or rebase would cut that link. `next` changes only through pull requests.
- **`scripts/dev-install.sh`** (formerly `./install.sh`) clones or updates the fork, builds it,
  installs `telegram` globally from that folder (`npm install -g`) and links the skill folder
  into agents that are present; it removes installs under older package names, which own the
  same `telegram` binary.
- **`scripts/publish-skill.sh [version|patch|minor|major]`** publishes the skill to ClawdHub.
- **`scripts/tg-dev`** runs `src/` with Bun under `TG_PROFILE=dev` (`~/.config/tg-dev`, Keychain
  service `tg-cli-dev`); `TG_PROFILE=test` picks another profile, `TG_PROFILE=` the real account,
  `TG_LOG_LEVEL=debug` prints the MTProto log. It never writes `dist/`, which the installed
  `telegram` runs live.
- **`assets/render.sh`** rebuilds the brand assets: mark SVGs (`gen.py`) and the banner and
  preview PNGs (headless Chrome, Geist font).

## Compatibility matrix and setup contract

- `docs/compatibility.md` is rendered from `src/clients/data.ts` (deterministic: no clock, the
  order of `CLIENTS`, LF line endings). A client is "supported" only when, in every configuration
  the record lists, install, read, approval and refusal were all seen live in that same
  configuration with the same client version, install is a real route, approval is G1 or G2 and
  refusal is the one that level gives; checks seen in different versions or configurations never
  add up. A derived cell drops the live entries of the cell it is derived from (they show that
  cell, not our approval or refusal).
- The setup contract (`src/setup-contract.ts`, `docs/setup-contract.md`) is types only so far: no
  command emits it, existing output never changes to it, and the `fix.run` allowlist and checker
  live in `test/setup-contract-check.ts` until the first emitting command moves them.
