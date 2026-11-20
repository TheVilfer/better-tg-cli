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
- `--topic <id>` reads a forum topic: a forum supergroup, or a bot that shows its chat as topics.
  List topics with `telegram topics <chat>`. On any other chat it is `not_a_forum` (exit 2).
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
- Message line format: `#id YYYY-MM-DD HH:MM [topic N] Sender ↩replyTo 💬comments: [media] text`.
  Continuation lines are indented. The sender is omitted when it is the chat itself, as in channel
  posts. Times are local; the `# Title (times in Europe/Berlin, UTC+1)` header names the zone.
  `[topic N]` appears when a whole forum is read without `--topic`. A page with older messages
  after it ends with `… more: --before <id>` (only when one was seen, never on the last page).
- Chat line format: `id type [bot,muted,archived] unread=N Title @username | preview`. Bots have
  type `user` and the flag `bot`; `--type bot` lists only bots, `--type user` still includes them.
- Chat and user IDs are strings (`"-1004001"`), message IDs are numbers.
- JSON shapes:

| Command | Shape |
|---|---|
| `chats`, `contacts`, `members` | array |
| `read`, `get` | `{chatTitle, messages[], chatId, threadChatId?, missing?, hasMore?, nextBefore?}`; `hasMore` only when an older message was seen, and `nextBefore` goes to `--before` for that page; an empty `--unread` page still has `chatTitle` and `chatId`; in a forum each message has `topicId` |
| `search` | array of `{chatTitle?, chatId?, messages[], hasMore?}`; every message has `id` and `chatId`, global hits also `chatTitle`; `hasMore`: there are results past `-n` |
| `send`, `reply`, `send-file`, `edit`, `delete`, `react`, `pin`, `unpin` | `{ok: true, action, chatId, chatTitle, messageId \| messageIds, …}` plus the older fields of each command |
| `forward` | `{ok: true, action, chatId, chatTitle, fromChatId, messageIds, forwardedIds, count, …}`: `messageIds` are the **source** IDs (in `fromChatId`); `forwardedIds` are the copies in `chatId`, use them to reply or edit |
| `mark-read` | `{ok: true, action, chatId, chatTitle, chat, read: true}` (no message ID) |
| `check`, `write-access` | object with `writeMode` (`read-only`, `ask`, `on`); `check` adds `configured`, `authenticated`, `account` |
| `sync` | `{output, added, chats: [{chatId, title, file, added, lastId}], failed?: [{chatId, title, code, error}]}`; any failed chat makes the exit code 1 |
| `inbox` | `{totalUnread, chatsWithUnread, chats[]}` (totals cover all chats, `chats` is cut to `-n`; `-n 0` gives the totals only) |
| `info` | object |
| `topics` | `{chatTitle, topics[]}` |

## Writing (needs write access; every write goes to `~/.config/tg/audit.jsonl`)

- Three modes: read-only, `ask` (the user approves each write in the chat; set by `telegram onboard`)
  and `on` (no questions). `write-access ask [--for …]` needs no confirmation, since every write
  then waits for the user's yes. `write-access on [--for 30m|2h|1d]` asks the user: a y/N prompt on a
  terminal, otherwise a macOS or Windows dialog (it times out as "no" after 2 minutes). `--for`
  goes back to read-only automatically. `write-access off` needs no confirmation. The `onboard`
  page lets the user pick another mode. The mode lives in the secret store, not in the config file.
- In mode `ask` a write exits with code 3 and prints the action and a code. The action reads as
  words: what happens, the recipient by name, type, @username and ID (looked up first; a chat that is
  not found stops the write with its candidates and no code), the topic or replied-to message, the
  full text, and the raw command last. With `--json`, one line on stdout:
  `{"error":"approval_required","code":…,"action":{"description","recipients","argv","stdin"?},"expiresInMinutes":10,"retry":{"argv":[…],"env":{"TG_APPROVE":…}},"rejected"?:{"code","reason","message"}}`.
  After the user says yes to that exact action, rerun it with `TG_APPROVE=<code>` (stderr also gives
  the PowerShell form). The code works once, for 10 minutes, for the same action: command, recipient
  (by ID, so `@username` and the ID are the same), options and the exact stdin text and files. Flag
  order and `--json` may differ. `rejected.reason` says why an old code failed: `unknown_or_expired`,
  `different_action`, `another_account` or `not_genuine`. A code is used up even when it does not match.
- Without a secret store (cloud agent computers, headless Linux) the mode is kept in a 0600 file in
  the profile and labelled "unprotected": an agent could edit it, just as it can read the session
  file there. Without a terminal, `write-access on` there opens a local page for the user.

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
- `sync --chat X --output DIR` writes markdown to `DIR/<title> (<chat id>).md`. It takes `--days N`
  (default 7), `--since/--until` and `--all` for full history. `--media` downloads files into
  `DIR/media/<chat id>/`. A numeric `--chat` is a chat ID only. Over MCP `--chat` must name exactly
  one chat (ID, @username or exact title); with 500 or more dialogs an exact title is not proven
  unique, so it needs the ID. Sync refuses to write through a symbolic link inside DIR, and
  `sync --media`, `download` and `avatar` refuse a directory or a link where the file would go.
- `sync --resume` is incremental. Checkpoints are per chat ID in `DIR/.sync-meta.json`. A resumed
  run fetches everything after the checkpoint and ignores the default `--days` window, also when
  it starts a new file (an export from before the file name carried the chat ID).
- With `--media`, a file that fails to download stops that chat just before its message: the chat
  gets a `failed[]` entry (`code:"media_download_failed"`, `messageId`), the exit code is 1, and the
  checkpoint stays before it, so `sync --resume --media` tries it again. After 3 failed runs the
  file is given up: the message is exported with a "(download failed)" placeholder, its
  `failed[]` entry has `skipped:true`, and the export moves on.

## Raw API (`telegram api` and `telegram <namespace> <method>`)

Two ways to reach the whole Telegram client API when no curated command fits. They share one
execution path — identical read/write classification, hard refusals and audit log — and both print
compact JSON (big integers as strings, bytes as base64). Pick `api` for scripted JSON params, the
typed per-method command for a command line.

### `telegram api <namespace.Method> --params '<json>'`

Builds and sends any request from the schema. The method is case-insensitive (`messages.GetHistory`,
`help.GetConfig`, top-level `InvokeWithLayer`). Inside `--params`, a small convention handles the
awkward fields: `{"_chat": "<id|@user|title|me>"}` resolves a chat the way every command does (strict
under a write), `{"_base64": "…"}` / `{"_hex": "…"}` pass raw bytes, `{"_bigint": "…"}` a `long`.
Other entity-like fields also accept a bare `@username`/ID. `--params -` reads the JSON from stdin.

### `telegram <namespace> <method>` — one typed command per TL method

Every TL schema method (all 823, generated into `src/generated/tl-commands.ts`) has its own top-level
command.

- **Naming.** The TL class name, split at the dot and kebab-cased:
  `messages.GetHistory` → `telegram messages get-history`, `help.GetConfig` →
  `telegram help get-config`, `channels.GetFullChannel` → `telegram channels get-full-channel`.
  The 21 root-level invoke/transport wrappers have no namespace and are top-level commands:
  `Ping` → `telegram ping`, `InvokeWithLayer` → `telegram invoke-with-layer`, `ReqPq` → `telegram req-pq`.
- **Clash with curated commands.** Six namespace names are also curated commands — `stats`,
  `stories`, `contacts`, `auth`, `folders`, `help`. The curated command keeps its behaviour, args and
  output; the generated methods attach to it as subcommands and are picked **only when the first
  operand is exactly a generated method name**. So `telegram stats get-broadcast-stats --channel @c`
  is the API method, while `telegram stats "Team"` and `telegram stats @c --message 5` are the curated
  `stats`. A chat/user literally named like a method (e.g. a chat called `get-broadcast-stats`) must be
  addressed by ID to avoid the method. A clash command's `--help` shows its curated usage plus a list
  of its generated methods. (`telegram help <method>` runs a `help.*` method, while `telegram help` and
  `telegram help <command>` still show help.)
- **Discovery.** `telegram --help` ends with a "Telegram API" section listing the namespaces and
  their method counts (purposes in "Namespace index" below). `telegram <ns> --help` lists a
  namespace's methods, each marked `[read]`/`[write]`/`[refused]` with a one-line description.
  `telegram <ns> <method> --help` shows the description, access, return type, every param (flag, TL
  type, required/optional/default, description), an auto-generated example, common errors and the
  core.telegram.org docs link. Those descriptions are the official ones, fetched once into
  `scripts/data/tl-docs-layer229.json` (40 methods new in the layer have a fallback line); never
  fetched at runtime.
- **Machine-readable: `telegram schema`.** `telegram schema` prints the namespace index as JSON;
  `telegram schema <ns>` lists a namespace's methods (`{command, className, access, description}`);
  `telegram schema <ns> <method>` (or `telegram schema <ns>.<Method>`) prints the full method schema
  `{command, className, access, refusedReason?, returns, params:[{flag,name,type,required,default,description}], example, docsUrl, description}`.
  It is a pure local read (no account, no network).
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
  telegram messages send-message --peer @me --message hi \
    --json-params '{"replyTo":{"className":"InputReplyToMessage","replyToMsgId":42}}'
  ```

- **Paging/cache cursors default to 0.** A required `int`/`long` named `offsetId`, `offsetDate`,
  `addOffset`, `offsetRate`, `offsetTopic`, `offset`, `maxId`, `minId`, `maxDate`, `minDate` or
  `hash` defaults to 0 when omitted (shown as `default 0` in `--help`), so
  `telegram messages get-history --peer @durov --limit 20` just works. Only these exact numeric
  names — ids (`msgId`/`id`/`userId`), `limit`, `offsetPeer` and string hashes are never defaulted.
- **Other required params** are enforced with a clear error (`Missing required option(s): --peer …`);
  `randomId` is never required (teleproto generates it). Registration is lazy — only the invoked
  namespace/method is built — so startup, top-level `--help` and `help-all` stay flat.

### Read vs write and refusals (both commands)

- **Read vs write:** methods named `Get*`/`Check*`/`Search*`/`Resolve*` are reads and run without
  write access (over MCP through the read tool, if the method is on the allowlist); everything else is
  a write (the `telegram_write` MCP tool): it goes through the write guard and is logged to the audit
  file. In mode `ask` a raw write asks for the user's approval of that one call, as any write does,
  so `write-access on` is never needed for it. Writes despite the `Get` prefix:
  `messages.GetBotCallbackAnswer` and `messages.GetInlineBotResults` (see below).
- **Always refused**, even with write access (the command still exists and refuses, exit 1; its
  `--help` says "always refused"): the whole `auth.*` namespace (login/session — use `telegram auth`),
  account/session takeover and 2FA/password/phone changes, data export (takeout) and Passport
  identity docs, external-site login (url-auth), ownership transfer, money-withdrawal tokens and
  paying / Stars-spending, and anything that shares your phone number or location (including
  contact/geo media in `SendMedia`). A few `Get*` methods that actually change state are treated
  as writes: pressing a button (`messages.GetBotCallbackAnswer`), an inline query
  (`messages.GetInlineBotResults`, the bot gets the query and your user ID), and
  `messages.GetMessagesViews` with `increment`. Read-only payments (balances, transactions) and
  session *listing* (`account.GetAuthorizations`) are allowed in a terminal. Full table in `docs/api-coverage.md` §4.
- **Over MCP only an allowlist runs** (`docs/api-coverage.md` §5, about a hundred methods for messages,
  dialogs, chats, users, search, reactions, pins, polls, bot buttons and basic chat admin). Any other
  method is refused before anything runs, "not available over MCP; run it in a terminal". Each
  method's `--help` and `schema` (`mcpAccess`) say how MCP treats it. Paid or risky params of allowed
  methods (a priced suggested post, a stake, a location, a referer, media other than a photo,
  document, poll or dice) are refused over MCP too, and a raw result there shows phone numbers,
  birthdays, notes, locations, venue IDs and gift-code links as `"[redacted]"`. A raw forward is not
  on the list; `forward` over MCP refuses a message with a contact card or a location. Over MCP every
  output (raw and `read`, `search`, `chats`, `inbox`, `watch`, `buttons`, `click`…) shows login codes
  in messages from Telegram (777000) and Verification Codes (489000) as `[login code hidden]`,
  in their text, links, buttons, quotes and previews, and the slug of any gift link
  (`t.me/giftcode/…`, `tg://giftcode?slug=…`) as `[gift code hidden]`.
- Coverage of the full API is tracked in `docs/api-coverage.md` (regenerated by
  `scripts/api-coverage.mjs`).

### When to use which

- **Curated command** (`read`, `send`, `search`, `chats`, `members`, …) — the default. Friendly,
  compact output, pagination, multi-step logic and safety prompts. Always prefer it when one exists.
- **`telegram <ns> <method>`** — a method with no curated command, or when you need the exact raw
  TL object, from a typed command line.
- **`telegram api <ns.Method> --params`** — the same reach, when it is easier to hand it a whole JSON
  body (scripts, deeply nested requests).

### Examples

```bash
telegram help get-config                                  # read, no args (help.* method)
telegram channels get-full-channel --channel @group       # read, peer resolved like everywhere
telegram messages get-history --peer @durov --limit 20    # read: paging cursors default to 0
telegram stats get-broadcast-stats --channel @c           # a method on a clash namespace
telegram messages delete-messages --id 100,101,102 --revoke   # write: vector + true-flag
telegram messages send-reaction --peer @me --msg-id 42 \
  --json-params '{"reaction":[{"className":"ReactionEmoji","emoticon":"👍"}]}'   # write, nested
telegram ping --ping-id 1                                 # root-level method
telegram account delete-account                           # exists, always refused (exit 1)
echo '{"id":[100,101]}' | telegram messages delete-messages --json-params -   # JSON from stdin
```

### Namespace index

One line per TL namespace (`telegram <ns> --help` lists the methods). Prefer a curated command when
one exists; use these for everything else.

| Namespace | What it covers |
|---|---|
| `messages` | Chats & dialogs, history, sending, search, reactions, drafts, polls, scheduled, pins |
| `account` | Profile, privacy, active sessions, 2FA, notifications, usernames, business settings |
| `payments` | Stars, gifts, invoices, subscriptions (any paying method is refused) |
| `channels` | Supergroups/channels: members, admin rights, forum topics, invite links, admin log |
| `phone` | Voice/video calls & group calls (no real CLI use) |
| `bots` | Bot management and bot-only methods |
| `stories` | Stories: feeds, views, reactions, posting |
| `auth` | Login/session management — refused; use `telegram auth`/`onboard` |
| `contacts` | Contacts, blocked list, top peers, resolve usernames |
| `help` | Client config, app updates, terms, country list |
| `chatlists` | Shareable folder (chat-list) invites |
| `stickers` | Sticker-set creation and editing |
| `communities` | Community management (new in the layer) |
| `ephemeral` | Ephemeral/one-time content (new in the layer) |
| `stats` | Channel/supergroup/message/story statistics |
| `upload` | File upload/download transport (driven by send-file/download) |
| `aicompose` | AI message composing (new in the layer) |
| `smsjobs` | SMS-relay programme |
| `users` | User info / full user |
| `langpack` | Client localisation packs |
| `photos` | Profile photos |
| `premium` | Telegram Premium boosts |
| `updates` | Update state/difference (driven by `watch`) |
| `folders` | Dialog folders (archive) |
| `fragment` | Fragment collectible usernames/numbers |

Root-level methods (no namespace) are low-level transport/invoke wrappers — `telegram ping`,
`telegram invoke-with-layer`, `telegram req-pq`, … — rarely needed directly.

### Errors

Methods return raw RPC errors. The common ones: **FLOOD_WAIT_X** — wait X seconds and retry (the
number is in the name); `PEER_ID_INVALID` — the chat/user couldn't be resolved; `CHAT_ADMIN_REQUIRED`
— you lack the needed admin right; `CHANNEL_PRIVATE` — you're not a member; `MESSAGE_ID_INVALID` — no
such message; `AUTH_KEY_UNREGISTERED`/`SESSION_REVOKED` — the session is gone (log in again). A
method's `--help` lists its own "Common errors" when the docs provide them.

## MCP server (`telegram mcp`)

- **Tools:**
  - `telegram_help {grep?}`;
  - `telegram_read {args}`, marked `readOnlyHint`;
  - `telegram_write {args, stdin?, approval?}`, marked `destructiveHint`. In mode `ask` without a
    client dialog it returns a normal (non-error) result with `structuredContent`
    `{status:"approval_required", code, action, expiresInMinutes, rejected?, retry:{tool, arguments}}`;
    `retry.arguments` is the exact call to make after the user's yes. When the call held a gift link
    or a login code, they are not echoed: `retry` is `{tool, sameArgumentsAsThisCall:true,
    arguments:{approval}, note}`, so repeat your own call with the same args and stdin plus `approval`.
  - `telegram_setup {}`: for "Not configured", an expired session or "Write access is disabled". The
    server opens the onboarding page on this computer (or, when logged in but read-only, only its mode
    choice) and returns the link for the user: `structuredContent` `{status:"open_page", step:"login"|"mode", url, sessionExpired?, readOnly?}`
    or `{status:"ready", mode}`. The user logs in and picks the mode there ("ask" or "on" only after a
    system dialog or terminal prompt; a `--read-only` server offers no mode); the tool takes no arguments.
    Nothing reports when they finish: wait for the user's message, then check `whoami` and `write-access`.

  `args` is the CLI argv with the command first, for example `["read","@x","-n","20"]`. `stdin`
  fills a `-` text argument.
- **What runs where:**
  - Read tool: only the read commands.
  - Write tool: everything that changes the account or writes local files (`download`, `sync`,
    `avatar`).
  - `api` and the generated commands are classified per underlying method: a read goes through the
    read tool, a write through the write tool, a refused method never runs — `["messages","get-history",…]`
    like `["api","messages.GetHistory",…]`. Only the TL methods on the MCP allowlist run (section 5
    of `docs/api-coverage.md`: messages, dialogs, chats, users, search, reactions, pins, polls, bot
    buttons, basic chat admin); every other method is refused before anything runs, "not available
    over MCP; run it in a terminal" (`["ping"]`, `["account","get-passkeys"]`). On a clash namespace
    the method form is classified by its method (`["stats","get-broadcast-stats",…]` is refused, being
    off the allowlist) while the curated form keeps its own class (`["stats","@chat"]` is a read);
    `["auth","send-code"]` is refused.
  - Help is always a read: a bare help request (a command path plus `--help`/`-h`, optionally
    `--json`) and `telegram schema …` go through the read tool even for a write or refused method
    (`["account","delete-account","--help"]`) — help prints, it never executes the method. Add no
    other args: with extra args (`["send","@x","--","--help"]`) the call is classified normally.
  - Never over MCP: `auth`, `onboard`, `logout`, `transfer-owner`, `update`, `skill`, and changing `write-access`.
    Showing its status is a read: `["write-access"]` or `["write-access","--json"]` (a generated
    `auth.*` method is refused, not run). The refusals point at `telegram_setup` and the one
    terminal command the user can run instead.
- **Results:** the text is the CLI's stdout; when that is one JSON value (a `--json` result or
  error) it is the whole text, and stderr (diagnostics such as the mock banner) stays out of it.
  `structuredContent` carries `{exitCode, stderr?}`, so a failure keeps its kind (1 runtime, 2 usage,
  4 write access off, 5 not logged in). A write waiting for approval (exit 3) has its own result,
  `{status:"approval_required", …}` (above), and is not an error.
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
exactly match a dialog ID (the `id` from `chats`). `@username` resolves exactly, and so does a link:
`https://t.me/name`, `t.me/name/123`, `t.me/c/<id>/…` (a private channel by ID) and
`tg://resolve?domain=name` are never matched against titles. An invite link (`t.me/+…`) is refused
(exit 2): join it first. Anything else matches titles.

- **Reads:** an exact title, or a substring that only one title contains. A substring of several
  titles, or a title shared by several chats, is refused (exit 2) with the candidates, as for writes.
- **Writes** (every command gated by write access) accept only an exact, unique title. A substring
  or a title shared by several chats is refused with up to 5 candidates (`id type title`).
  Retry with the ID.
- **Unique means the whole list.** A title is matched against every dialog: when the first 500 are
  a full page, the list is read on, up to 5000. Past that a title is never proven unique and is
  refused with `ambiguous_or_unverified` (exit 2): use the ID or @username.
- A chat that is not found exits 1 with the closest titles; its `hint` is the argv of the command
  that lists matching chats, `["chats","-q",<text>,"--preview","0"]` (in text, a quoted command).

## Errors and exit codes

| Code | Meaning |
|---|---|
| 0 | ok |
| 1 | runtime error: Telegram refused, network, chat or message not found |
| 2 | usage: unknown option, a value that does not parse, an ambiguous chat name |
| 3 | write approval needed (mode `ask`) |
| 4 | write access is disabled (`telegram write-access ask`) |
| 5 | not logged in, or the session ended (`telegram onboard`) |

With `--json` stdout always holds exactly one JSON object, the result or an error (questions to the
user go to stderr). An error is `{"error":{"code","message","hint"?,"candidates"?,
"retryAfterSeconds"?}}`; `code` is stable (`chat_not_found`, `ambiguous_chat`,
`ambiguous_or_unverified`, `not_a_forum`, `invalid_argument`, `usage`, `write_disabled`,
`not_configured`, `session_expired`, `network`, `flood_wait`, `telegram_rpc` …). `hint` is prose,
or an argv array of a `telegram` command built from your own text: run it as is, never through a
shell. Candidates are `{id, title, type}`. Exit 3 keeps its own line,
`{"error":"approval_required",…}`. A bad number or value never becomes a default or an empty
result: it exits 2 before anything is sent (and before an approval is asked for). Numbers are
limited to Telegram's 32-bit range; a time or duration that computes to no real date is refused.

Telegram ending the session (`AUTH_KEY_UNREGISTERED`, `AUTH_KEY_DUPLICATED`, `SESSION_REVOKED`,
`SESSION_EXPIRED`, `USER_DEACTIVATED` …) is `session_expired`, exit 5, whether at connect or on a
later call; a network failure (`network`) or a rate limit (`flood_wait`, with `retryAfterSeconds`)
is exit 1, so retry those instead of logging in again.

In mode `ask` a write that could not run as shown (a recipient, file, message or button that cannot
be found or read) gets no code: `Not sent, nothing to approve: …`, with the code and exit code of
the error behind it (an ambiguous name stays exit 2) or `nothing_to_approve`, exit 1. A code that
does not hold for this call is `approval_not_accepted` (or `approval_other_account`), exit 1.

## Troubleshooting

- `Not configured`: run `telegram onboard --json`. It serves a one-shot page on 127.0.0.1 (random
  secret path, closes when done, `--timeout` 15 min by default) where the user gets a login key from
  better-tg-cli.com (it comes back to the page by itself), or enters their own keys, then scans a QR
  code and types their 2FA password. Events: `url`, `waiting_invite`, `waiting_scan`, `need_password`,
  `done` (exit 0), `error`, `timeout` (exit 1); `already_logged_in` exits 0 without changes. A stored
  session Telegram no longer accepts gives `session_expired` and a new login on the same page (no
  `logout` first); no network gives `error` and changes nothing. Over MCP, call `telegram_setup`.
  `--no-open` only prints the URL. You never get tokens, codes or passwords, and you must not ask
  for them or fill in the page. Without a browser on this machine (SSH), the user runs
  `telegram auth --qr` (own keys) or `telegram auth --login-key --qr` in their terminal; that is
  interactive, so never run it for them. `--qr` logs in by scanning a QR code in the Telegram app instead of
  typing a code (`TG_QR_INVERT=1` for light terminals).

- `command not found: telegram`: the CLI isn't installed. Ask the user first, then install it as the first rule in SKILL.md says (Homebrew, Scoop or npm); other ways are in the README's Install section.
  `telegram update` upgrades an existing install (brew, npm or git checkout); `update --check` only reports.
  `telegram skill install|status|uninstall [-a <agent>...]` copies this skill into coding agents' global
  skills folders; only run it when the user asks.
  Never install `@skillhq/telegram` from npm: it is the old GramJS build, and bot replies show
  as `(no text)`.
- `Write access is disabled`: the profile is read-only, or a `--for` window expired. Run
  `telegram write-access ask`, then ask the user before each write. `on` only when the user asks for
  it; they confirm it in a dialog. Over MCP, call `telegram_setup` and give the user the link.
- `Approval needed` (exit 3): mode `ask`. Show the action to the user, and after a yes rerun with
  `TG_APPROVE=<code>`. If it comes back with `rejected`, the command differs from what was approved
  (or the code was used or expired): ask again for the new action.
- Secret store unavailable: the message gives one step for this OS (unlock the macOS login keychain,
  check Windows PowerShell for DPAPI, unlock the Linux keyring), then `telegram check`. Never install a keyring.
- `FLOOD_WAIT` (rate limit): waits of up to 60 s are retried automatically, and stderr says
  `Telegram rate limit on <method>: waiting Ns`. Longer waits fail with the wait in the error
  message. `TG_FLOOD_WAIT_MAX=<seconds>` changes the limit: `0` fails fast, a larger value suits
  long `sync` runs. Don't retry in a loop, because Telegram extends the ban.
- `NetSocket was closed` or timeouts while connecting: the network blocks Telegram's TCP transport
  (common on cloud agent computers that allow only HTTPS). The CLI retries over WebSocket
  (`wss://*.web.telegram.org`) by itself and saves `transport: "wss"` for the profile; stderr says
  so. Force one with `TG_TRANSPORT=wss` (or `tcp`).
- `CHANNELS_TOO_MUCH` on `join`: the account hit Telegram's channel limit, so leave some first.
- `Could not find the input entity`: the ID is not in your dialogs. Use `@username` or open the
  chat first.
- Bot reply shows as `(no text)` with `MessageMediaUnsupported`: the TL layer is behind, so bump
  `teleproto`.
