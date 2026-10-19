# Telegram CLI — behaviour reference

Every flag is listed by `telegram help-all` (or `telegram help-all -g <word>`), generated from the
code. This file only covers behaviour that the flag list can't tell you.

## Reading

- `read` pages through history, so `--since/--until/--before/--after` return exact ranges on busy
  chats. `-n` caps the count (default 50). Order is newest first; `--asc` flips it.
- `--unread` starts after the dialog's read marker and still obeys `-n`. It does not mark the
  messages read; use `mark-read <chat>` for that.
- `--thread <id>` reads comments under a channel post, or replies to a message in a group.
  Channel comments live in the linked discussion group, so the output reports `threadChatId`.
  Reply there with `telegram reply <threadChatId> <commentId> ...`.
- `--topic <id>` reads a forum topic. List topics with `telegram topics <chat>`.
- `--from` works with plain reads and threads. `search --from` needs `--chat`, because Telegram
  global search has no sender filter.
- `get <chat> <ids...>` fetches exact messages. Missing IDs go to stderr in text mode, or to a
  `missing` field in JSON.
- `search "" --chat X --type photo` lists every photo in a chat. Types: photo, video, media,
  document, url, voice, audio, gif, round, location, contact, pinned, mentions.
  `--type mentions` without `--chat` finds where you were @mentioned.
- Media shows as `[📷 photo]`, `[📎 document name.pdf · 1.2 MB]`, and so on. `download <chat> <id>`
  saves the file. In JSON, `media` has `kind`, `fileName`, `mimeType`, `size`, `width`, `height`
  and `duration`.
- A long post costs as many tokens as its text. Use `--max-text 200` for skimming, then
  `get <chat> <id>` for the posts that matter.
- **`--full` (alias `--stats`)** on `read`/`get`/`search`/`inbox`/`watch` adds a `full` object to
  every message (and a short `👁 ↪ ❤️` suffix in compact output). Default output is unchanged
  without it. `full` carries views, forwards, the complete reaction breakdown (each emoji / custom
  emoji id / paid reaction with count and whether you reacted), recent reactors, comments/thread
  info (`replies.comments`, `channelId`, `maxId`, `readMaxId`, recent repliers), edit date, post
  author, pinned/silent/noforwards/post flags, grouped (album) id, via-bot id, TTL, the forward
  header, reply-to info (ids, forum topic, quote), and rich media metadata (poll results, geo,
  venue, contact, webpage, dice, invoice, file name/size/mime/duration/dimensions). Use it for data
  collection — it needs no extra API calls. Over MCP, pass `--full` in `telegram_read` args.
- `drafts` lists saved-but-unsent drafts (chat title + text). `profile-photos <user>` lists a
  user's profile photos; `avatar <user>` downloads the current one.
- `scheduled <chat>` lists messages queued to send later (create them with `send --schedule`); it
  takes `--full` like `read`.
- `sessions` lists active login sessions (device, app, platform, IP, country, last-active; the
  current one is flagged). `stars` shows the Telegram Stars balance and recent transactions.
  `invites <chat>` lists a chat's exported invite links (`--revoked` for revoked ones) or its
  pending join requests (`--requests`). All read-only.
- `admin-log <chat>` shows a supergroup/channel's recent admin actions (Telegram's "Recent
  actions"), newest first, with `-n` and `-q <text>`. It needs admin rights in that chat.
- `permissions <chat> [user]` shows a member's status (creator/admin/member/restricted/banned/left)
  and rights, or the chat's default permissions when no user is given. Supergroups and channels
  only. Change rights with `edit-permissions`.
- `stats <chat>` returns full entity statistics: subscribers/members, online, admins, kicked and
  banned counts, linked discussion chat, slow mode, about, creation date, verified/scam/fake/
  restricted flags (+ reasons), and — where the account has rights — aggregate `activity`:
  - broadcast (`stats.GetBroadcastStats`): `period`, followers and per-post/per-story
    views/shares/reactions each as `{current, previous}`, enabled-notifications %, and
    `recentPosts[]` (`{msgId, views, forwards, reactions}`);
  - megagroup (`stats.GetMegagroupStats`): members/messages/viewers/posters `{current, previous}`
    and resolved `topPosters` `{userId, name, username, messages, avgChars}`, `topAdmins`
    `{userId, name, deleted, kicked, banned}`, `topInviters` `{userId, name, invitations}`.
  - `--graphs` adds each graph as a parsed JSON series (`graphs[] = {name, data}` or `{name, error}`);
    async graphs are loaded via `stats.LoadAsyncGraph`, and a failed graph reports its error without
    failing the rest.
  - `stats <chat> --message <id>` (or `--story <id>`) returns the post's own views/forwards/reactions,
    `publicForwardsCount`, a `publicForwards[]` list (`{chatTitle, msgId, views, date}`, capped by
    `--limit`), and — with `--graphs` — the message's view/reaction graphs.
  - Missing rights or unavailable stats are reported in `activity.error` / `note`, never a hard failure.

## Output

- Off a TTY (agents and pipes), output is compact: one line per item with the ID first, JSON on
  one line, and null or empty fields dropped. Set `TG_JSON_PRETTY=1` to indent JSON.
- Message line format: `#id YYYY-MM-DD HH:MM Sender ↩replyTo 💬comments: [media] text`. Continuation lines
  are indented. The sender is omitted when it is the chat itself, as in channel posts.
- Chat line format: `id type [muted,archived] unread=N Title @username | preview`.
- JSON shapes:

| Command | Shape |
|---|---|
| `chats`, `contacts`, `members` | array |
| `read`, `get` | `{chatTitle, messages[], threadChatId?, missing?}` |
| `search` | array of `{chatTitle?, messages[]}`; global hits add `chatId` and `chatTitle` to each message |
| `inbox` | `{totalUnread, chatsWithUnread, chats[]}` (totals cover all chats, `chats` is cut to `-n`) |
| `info` | object |
| `topics` | `{chatTitle, topics[]}` |

## Writing (needs write access; every write goes to `~/.config/tg/audit.jsonl`)

- `write-access on [--for 30m|2h|1d]` asks the user: a y/N prompt on a terminal, otherwise a macOS
  dialog (it times out as "no" after 2 minutes). `--for` switches writes off again automatically.
  `write-access off` needs no confirmation. The flag lives in Keychain, not in the config file.

- Pass `-` as the text argument (`send`, `reply`, `edit`, `send-file -c`) to read the text from
  stdin: `printf '%s' "$text" | telegram send @user -`. This avoids shell quoting problems.
- `--html` is the reliable formatting mode: `<b>`, `<i>`, `<a href>`, `<code>`, `<pre>`.
  `--markdown` uses the GramJS dialect (`**bold**`, `` `code` ``), where `[text](url)` links do
  NOT work.
- `send --schedule 2h` (or an ISO date) schedules a message. `--silent` sends without a
  notification sound.
- `delete` revokes for everyone by default. `--just-me` deletes only on your side. IDs are comma
  separated.
- `forward <from> <ids> <to>`: `--drop-author` hides the source.
- `pin` is silent by default (`--notify` pings members). `unpin <chat>` with no ID unpins
  everything.
- `poll <chat> "Q" A B C` takes `--multiple`, `--quiz --correct N` (1-based) and `--public`.
  `vote <chat> <id> 2` also counts options from 1.
- `pin-chat` / `unpin-chat` pin a chat to the top of the dialog list (this is the list position,
  not `pin`, which pins a message inside a chat). `mark-unread <chat>` sets the unread mark;
  `--read` clears it.
- `delete-dialog <chat>` removes a conversation: it clears a private or basic-group history (with
  `--revoke` it also deletes the other person's copy) and leaves a supergroup or channel. Like all
  writes it needs the exact title, an @username or an ID.
- `edit-permissions <chat> [user]` sets the chat's default permissions (no user) or restricts one
  member (channels.EditBanned / messages.EditChatDefaultBannedRights). `--mute` makes it read-only,
  `--ban` removes the member, `--lift` clears restrictions, `--deny send,media,polls,links,…` denies
  specific rights, and `--until 1h|1d|1w` makes a per-user restriction temporary. Inspect current
  rights with `permissions`.
- `topic create|edit|close|reopen|pin|unpin <chat> …` manages forum topics in a group with Topics
  enabled: `topic create <chat> <title>` (`--icon-color`, `--icon-emoji`), `topic edit <chat> <id>`
  (`--title`, `--icon-emoji`, `--hide`/`--show`), and `topic close|reopen|pin|unpin <chat> <id>`.
  List topics with `topics <chat>`.

### Bot buttons

`read` shows keyboards as `[index] label (type)`. Press one with `click <chat> <msgId> <index|label>`.
After a callback, `click` re-reads the message and prints the bot's toast/alert, the edited text,
new buttons and any new bot messages. Navigate bot menus by pressing a button and reading the new
menu.

| Button type | `click` does |
|---|---|
| callback | sends the callback, shows the answer and the updated message |
| game | returns the game URL |
| reply-keyboard text | sends the label as a message |
| url / url_auth / webview | prints the URL, never opens it |
| switch-inline | prints the query, does not send it |
| copy | prints the copied text |
| request phone / geo / poll / peer, buy | refused on purpose (privacy, payments) |

Buttons that need 2FA take `--password`. `--no-wait` skips waiting for the bot's reply.

### Admin

- `promote <group> <user>` takes `--rank "Title"` and `--add-admins`.
- `transfer-owner` is irreversible and interactive: it asks you to retype the group name (`-y`
  skips this) and prompts for your 2FA password. It works for supergroups and channels only.
  Telegram blocks it for about 24 hours after a new login and about 7 days after a 2FA change.
  Never script it.

## Live and export

- `watch [chat] -t 30 -n 10 --json` streams new messages as JSON lines. Always pass `-t` or `-n`
  when running unattended. A second `telegram` process that writes while `watch` runs can steal
  its update stream.
- `sync --chat X --output DIR` writes markdown. It takes `--days N` (default 7),
  `--since/--until` and `--all` for full history. `--media` downloads files into `<chat>/media/`.
- `sync --resume` is incremental. Checkpoints are per chat ID in `DIR/.sync-meta.json`. A resumed
  run fetches everything after the checkpoint and ignores the default `--days` window.

## Raw API (`telegram api` and `telegram tl`)

Two ways to reach the whole Telegram client API when no curated command fits. They share one
execution path — identical read/write classification, hard refusals and audit log — and both print
compact JSON (big integers as strings, bytes as base64). Pick `api` for scripted JSON params, `tl`
for a typed command line.

### `telegram api <namespace.Method> --params '<json>'`

Builds and sends any request from the schema. The method is case-insensitive (`messages.GetHistory`,
`help.GetConfig`, top-level `InvokeWithLayer`). Inside `--params`, a small convention handles the
awkward fields: `{"_chat": "<id|@user|title|me>"}` resolves a chat the way every command does (strict
under a write), `{"_base64": "…"}` / `{"_hex": "…"}` pass raw bytes, `{"_bigint": "…"}` a `long`.
Other entity-like fields also accept a bare `@username`/ID. `--params -` reads the JSON from stdin.

### `telegram tl <namespace> <method>` — one typed command per TL method

Every TL schema method (all 823, generated into `src/generated/tl-commands.ts`) has its own command.

- **Naming.** The TL class name, split at the dot and kebab-cased:
  `messages.GetHistory` → `telegram tl messages get-history`, `help.GetConfig` →
  `telegram tl help get-config`, `channels.GetFullChannel` → `telegram tl channels get-full-channel`.
  The 21 top-level invoke/transport wrappers have no namespace: `Ping` → `telegram tl ping`,
  `InvokeWithLayer` → `telegram tl invoke-with-layer`.
- **Discovery.** `telegram tl` lists the namespaces and their method counts; `telegram tl <ns> --help`
  lists a namespace's methods; `telegram tl <ns> <method> --help` lists that method's params with
  their TL types and required/optional.
- **Flags.** One `--flag` per parameter, the camelCase param name kebab-cased (`offsetId` →
  `--offset-id`, `scheduleDate` → `--schedule-date`). Pass each by its TL type:

  | TL type | Flag form | How to pass |
  |---|---|---|
  | `int`, `double` | `--limit 20` | a number |
  | `long`, `int128`, `int256` | `--hash 0` | digits (sent as a big integer) |
  | `string` | `--q "term"` | text |
  | `Bool` | `--offline true` | `true`/`false` (or `1`/`0`) |
  | `true` (flag bit, e.g. `silent`, `noWebpage`) | `--silent`, `--no-webpage` | bare switch; present = set |
  | `bytes` | `--file-hash aGk=` | base64, or `hex:…` |
  | `InputPeer`/`InputUser`/`InputChannel` | `--peer @durov` | id, `@username`, chat title or `me` |
  | vector of a primitive | `--id 100,101,102` | comma list (or a JSON array) |
  | vector of a constructor | `--reaction '[{"className":"ReactionEmoji","emoticon":"👍"}]'` | JSON array |
  | constructor type (`InputMedia`, `ReplyMarkup`, `DataJSON`, …) | `--reply-to '{"className":"InputReplyToMessage","replyToMsgId":42}'` | JSON (may use `{"_chat":…}`/`{"_base64":…}` markers) |

- **`--json-params '<json|->'`** merges a JSON object for anything not worth a flag (e.g. a deep
  nested constructor); typed flags override its keys, and `-` reads the JSON from stdin. Example —
  a nested `replyTo` constructor as JSON, the simple fields as flags:

  ```bash
  telegram tl messages send-message --peer @me --message hi \
    --json-params '{"replyTo":{"className":"InputReplyToMessage","replyToMsgId":42}}'
  ```

- **Paging/cache cursors default to 0.** A required `int`/`long` named `offsetId`, `offsetDate`,
  `addOffset`, `offsetRate`, `offsetTopic`, `offset`, `maxId`, `minId`, `maxDate`, `minDate` or
  `hash` defaults to 0 when omitted (shown as `default 0` in `--help`), so
  `telegram tl messages get-history --peer @durov --limit 20` just works. Only these exact numeric
  names — ids (`msgId`/`id`/`userId`), `limit`, `offsetPeer` and string hashes are never defaulted.
- **Other required params** are enforced with a clear error (`Missing required option(s): --peer …`);
  `randomId` is never required (teleproto generates it). Registration is lazy — only the invoked
  namespace is built — so startup, top-level `--help` and `help-all` are unaffected.

### Read vs write and refusals (both commands)

- **Read vs write:** methods named `Get*`/`Check*`/`Search*`/`Resolve*` are reads and run without
  write access (available through the MCP read tool); everything else is a write that needs
  `telegram write-access on` (the `telegram_write` MCP tool), goes through the write guard, and is
  logged to the audit file.
- **Always refused**, even with write access (the command still exists and refuses, exit 1; its
  `--help` says "always refused"): the whole `auth.*` namespace (login/session — use `telegram auth`),
  account/session takeover and 2FA/password/phone changes, data export (takeout) and Passport
  identity docs, external-site login (url-auth), ownership transfer, money-withdrawal tokens and
  paying / Stars-spending, and anything that shares your phone number or location (including
  contact/geo media in `SendMedia`). A few `Get*` methods that actually change state (e.g.
  `messages.GetMessagesViews`) are treated as writes. Read-only payments (balances, transactions) and
  session *listing* (`account.GetAuthorizations`) are allowed. Full table in `docs/api-coverage.md` §4.
- Coverage of the full API is tracked in `docs/api-coverage.md` (regenerated by
  `scripts/api-coverage.mjs`).

### When to use which

- **Curated command** (`read`, `send`, `search`, `chats`, `members`, …) — the default. Friendly,
  compact output, pagination, multi-step logic and safety prompts. Always prefer it when one exists.
- **`telegram tl <ns> <method>`** — a method with no curated command, or when you need the exact raw
  TL object, from a typed command line.
- **`telegram api <ns.Method> --params`** — the same reach, when it is easier to hand it a whole JSON
  body (scripts, deeply nested requests).

### Examples

```bash
telegram tl help get-config                                  # read, no args
telegram tl channels get-full-channel --channel @group       # read, peer resolved like everywhere
telegram tl messages get-history --peer @durov --limit 20    # read: paging cursors default to 0
telegram tl messages delete-messages --id 100,101,102 --revoke   # write: vector + true-flag
telegram tl messages send-reaction --peer @me --msg-id 42 \
  --json-params '{"reaction":[{"className":"ReactionEmoji","emoticon":"👍"}]}'   # write, nested
telegram tl account delete-account                           # exists, always refused (exit 1)
echo '{"id":[100,101]}' | telegram tl messages delete-messages --json-params -   # JSON from stdin
```

## MCP server (`telegram mcp`)

- **Tools:**
  - `telegram_help {grep?}`;
  - `telegram_read {args}`, marked `readOnlyHint`;
  - `telegram_write {args, stdin?}`, marked `destructiveHint`.

  `args` is the CLI argv with the command first, for example `["read","@x","-n","20"]`. `stdin`
  fills a `-` text argument.
- **What runs where:**
  - Read tool: only the read commands.
  - Write tool: everything that changes the account or writes local files (`download`, `sync`,
    `avatar`).
  - `api` and `tl` are classified per underlying method: a read method goes through the read tool, a
    write through the write tool, and a refused method never runs (`["tl","messages","get-history",…]`
    like `["api","messages.GetHistory",…]`).
  - Never over MCP: `auth`, `onboard`, `logout`, `transfer-owner`, `update`, `skill`, and changing `write-access`.
    Showing its status is allowed.
- **Safety:** the read tool runs with `TG_READ_ONLY=1`, which blocks every guarded write even if a
  command were misclassified.
- **Execution:** each call is a separate CLI process with no stdin (a worker thread inside Claude
  Desktop). Calls run one at a time, time out after 120 s, and output is capped at 100 KB.
  `watch` needs `-t` or `-n`.
- **Protocol:** MCP 2025-11-25 with the `initialize` handshake. Newer clients fall back to it.
- **HTTP:** `telegram mcp --http [--host 127.0.0.1] [--port 8787]` serves the same tools on
  `POST /mcp` (stateless, JSON responses) for remote hosts such as Grok Bot. Every request needs
  `Authorization: Bearer <token>` (`telegram mcp --token`, `--rotate-token`). Requests with an
  `Origin` header are refused. `--read-only` drops `telegram_write` (also works over stdio).

## Chat identifiers

`me` / `self` / `saved` / `Saved Messages` / `Избранное` → your Saved Messages. A numeric ID must
exactly match a dialog ID (the `id` from `chats`). `@username` resolves exactly. Anything else
matches titles.

- **Reads:** an exact title first, then a substring.
- **Writes** (every command gated by write access) accept only an exact, unique title. A substring
  or a title shared by several chats is refused with up to 5 candidates (`id type title @username`).
  Retry with the ID.

## Troubleshooting

- `Not configured`: run `telegram onboard --json`. It serves a one-shot page on 127.0.0.1 (random
  secret path, closes when done, `--timeout` 15 min by default) where the user gets a login key from
  better-tg-cli.com (it comes back to the page by itself), or enters their own keys, then scans a QR
  code and types their 2FA password. Events: `url`, `waiting_invite`, `waiting_scan`, `need_password`,
  `done` (exit 0), `error`, `timeout` (exit 1); `already_logged_in` exits 0 without changes.
  `--no-open` only prints the URL. You never get tokens, codes or passwords, and you must not ask
  for them or fill in the page. Without a browser on this machine (SSH), the user runs
  `telegram auth --qr` (own keys) or `telegram auth --login-key --qr` in their terminal; that is
  interactive, so never run it for them. `--qr` logs in by scanning a QR code in the Telegram app instead of
  typing a code (`TG_QR_INVERT=1` for light terminals).

- `command not found: telegram`: run `brew install thevilfer/tap/better-tg-cli`, `scoop install better-tg-cli` (Windows, after `scoop bucket add thevilfer https://github.com/TheVilfer/scoop-bucket`) or `npm install -g better-tg-cli`, or build this folder (`npm install && npm run build && npm install -g .`, needs Bun)
  `telegram update` upgrades an existing install (brew, npm or git checkout); `update --check` only reports.
  `telegram skill install|status|uninstall [-a <agent>...]` copies this skill into coding agents' global
  skills folders; only run it when the user asks.
  Never install `@skillhq/telegram` from npm: it is the old GramJS build, and bot replies show
  as `(no text)`.
- `Write access is disabled`: the account is read-only on purpose, or a `--for` window expired. Ask
  the user, then run `telegram write-access on --for 1h`; they confirm it in a dialog.
- `FLOOD_WAIT` (rate limit): waits of up to 60 s are retried automatically, and stderr says
  `Telegram rate limit on <method>: waiting Ns`. Longer waits fail with the wait in the error
  message. `TG_FLOOD_WAIT_MAX=<seconds>` changes the limit: `0` fails fast, a larger value suits
  long `sync` runs. Don't retry in a loop, because Telegram extends the ban.
- `CHANNELS_TOO_MUCH` on `join`: the account hit Telegram's channel limit, so leave some first.
- `Could not find the input entity`: the ID is not in your dialogs. Use `@username` or open the
  chat first.
- Bot reply shows as `(no text)` with `MessageMediaUnsupported`: the TL layer is behind, so bump
  `teleproto`.
