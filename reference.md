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

## Chat identifiers

`me` / `self` / `saved` / `Saved Messages` / `Избранное` → your Saved Messages. A numeric ID must
exactly match a dialog ID (the `id` from `chats`). `@username` resolves exactly. Anything else
matches titles: exact first, then substring. For writes, prefer an ID or @username.

## Troubleshooting

- `command not found: telegram`: run `cd ~/.agents/skills/telegram && npm install && npm run build && npm install -g .`
  Never install `@skillhq/telegram` from npm: it is the old GramJS build, and bot replies show
  as `(no text)`.
- `Write access is disabled`: the account is read-only on purpose, or a `--for` window expired. Ask
  the user, then run `telegram write-access on --for 1h`; they confirm it in a dialog.
- `CHANNELS_TOO_MUCH` on `join`: the account hit Telegram's channel limit, so leave some first.
- `Could not find the input entity`: the ID is not in your dialogs. Use `@username` or open the
  chat first.
- Bot reply shows as `(no text)` with `MessageMediaUnsupported`: the TL layer is behind, so bump
  `teleproto`.
