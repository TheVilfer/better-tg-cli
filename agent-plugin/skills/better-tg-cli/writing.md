# Writing: approvals, sending, buttons, chat admin

Every write changes the user's account in front of other people, and most can't be undone. The
rules in SKILL.md come first; this file has the details. Examples are real output of the mock
account (`TG_MOCK`, approvals rehearsed with `TG_MOCK_ASK=1`), in UTC.

- [Write modes](#write-modes)
- [Approval in mode ask](#approval-in-mode-ask)
- [Don't get the account banned](#dont-get-the-account-banned)
- [Sending text](#sending-text)
- [Bot buttons](#bot-buttons)
- [Other writes](#other-writes)
- [What the user does in the app](#what-the-user-does-in-the-app)
- [Results](#results)
- [Audit log](#audit-log)

## Write modes

`telegram write-access` (over MCP `telegram_read {"args":["write-access","--json"]}`) shows the
mode; its JSON has `writeMode` and `writes` (`without-confirmation`, `with-approval` or `off`).
`telegram check` puts the same on its own line, e.g. `Writes: ON — messages are sent without
confirmation`.

| Mode | A write… | Next step for you |
|---|---|---|
| `read-only` | stops with exit 4 (`write_disabled`) | stop and tell the user writes are off. Only the user changes the mode: on the `telegram_setup` page or with `telegram write-access ask` in their own terminal. Never change it on your own or as a step toward another request. The one exception: the user tells you in their own words to switch to `ask` (a cloud computer where they have no terminal); then run `telegram write-access ask`, never `on` |
| `ask` | stops with exit 3 and an approval code | show the action, wait for a yes, repeat with the code |
| `on` | runs at once | agree on the exact action with the user before the first call |

The status query itself exits 0 in every mode; exit 4 comes from a write. `on` needs the user's own
confirmation in a terminal or a system dialog. `write-access ask --for 2h` and `on --for 30m` fall
back to read-only afterwards. A `--read-only` MCP server is a hard stop: `telegram_setup` there
offers no mode, and writes stay off. Without a secret store (cloud agent
computers, headless Linux) the mode lives in a 0600 file in the profile, labelled "unprotected";
never install a keyring there.

## Approval in mode ask

1. Run the write once, without a code. The CLI looks the recipient up and stops:

```
$ printf '%s' 'See you at 7' | telegram reply 1001 3 -
Approval needed: write mode is "ask", so the user approves each write.
Show the user this action word for word and ask for an explicit yes:
  Reply to a message
  To: Alice Example (user, @alice_example, id 1001)
  msg-id: #3
  Text (12 characters):
    | See you at 7
  Command: telegram reply 1001 3 -
After a yes, run the same command again with the same text on stdin with TG_APPROVE=38HR4Y in its environment:
  TG_APPROVE=38HR4Y telegram reply 1001 3 -
  (PowerShell: $env:TG_APPROVE='38HR4Y'; telegram reply 1001 3 -; Remove-Item Env:TG_APPROVE)
The code works once, for this exact action and text, for 10 minutes; flag order and --json may differ. Never approve on the user's behalf.
[exit 3]
```

2. Show the user that action word for word: what happens, the recipient, the full text.
3. Only after a separate, explicit yes to that action, repeat the same arguments and the same stdin
   with the code. A "no", a changed request or silence ends the attempt.

```
$ printf '%s' 'See you at 7' | TG_APPROVE=38HR4Y telegram reply 1001 3 - --json
{"ok":true,"action":"reply","chatId":"1001","chatTitle":"Alice","messageId":6,"id":6,"replyToMsgId":3,"date":"2026-11-20T01:12:49.000Z","text":"See you at 7"}
```

(`--json` was added on the retry; flag order and `--json` may differ, nothing else.) With `--json`
the stop itself is one line on stdout, here for another message:
`{"error":"approval_required","code":"93N87X","action":{"description":…,"recipients":[…],"argv":["send","1001","-","--json"],"stdin":"Running late"},"expiresInMinutes":10,"retry":{"argv":["telegram","send","1001","-","--json"],"env":{"TG_APPROVE":"93N87X"}}}`.

- **Over MCP**, either the client shows the user a dialog (they answer it; you never pass a code,
  and a code you pass is refused), or the result is not an error but `structuredContent`
  `{status:"approval_required", code, action, retry:{tool, arguments}}`. After the yes, make exactly
  the `retry.arguments` call:

```
telegram_write {"args":["send","-1004001","-"],"stdin":"See you at 7"}
→ structuredContent: {"status":"approval_required","code":"H5SCNT","action":{"description":"  Send a message\n  To: Team (supergroup, @mock_team, id -1004001)\n  Text (12 characters):\n    | See you at 7\n  Command: telegram send -1004001 -",…},"expiresInMinutes":10,"retry":{"tool":"telegram_write","arguments":{"args":["send","-1004001","-"],"stdin":"See you at 7","approval":"H5SCNT"}}}
```

  If the call held a login code or a gift link, `retry` is `{tool, sameArgumentsAsThisCall: true,
  arguments: {approval}, note}`: the secret is not echoed back. Such an action is for the user to
  do (in the Telegram app or their own terminal): tell them, and don't follow the `note` that says
  to call again. Never ask for, reconstruct or re-send the code or link. The check also fires on
  ordinary text such as `promo code: SUMMER` that the user asked you to send; then, after their
  yes, repeat your own call with the same args and stdin plus `"approval":"<code>"`.
- A code works once, for 10 minutes, for this action: command, recipient (by ID), options, the exact
  stdin text and files. A code that doesn't hold comes back with a new one and `rejected.reason`
  (`unknown_or_expired`, `different_action`, `another_account`, `not_genuine`): show the new action
  and ask again.
- A recipient that can't be resolved, a file that can't be read, and for `delete` and `click` a
  missing message or button get no code: `Not sent, nothing to approve: …` with the real error.
  `edit` and `reply` don't check the message first: they may ask for approval for a message ID that
  turns out not to exist.

## Don't get the account banned

Telegram limits and freezes accounts that behave like bots.

- Never send the same or similar text to many chats.
- Never join, invite or add people in bulk.
- Ask before anything that touches more than a few chats or messages.
- On `FLOOD_WAIT` (exit 1, `retryAfterSeconds` in JSON) tell the user how long and stop. The CLI
  already waits out short limits (up to 60 s) by itself; retrying in a loop extends the ban.

## Sending text

- Writes need an ID, @username or exact title; a near match is refused with candidates:

```
$ telegram send Tea hi --json
{"error":{"code":"chat_not_exact","message":"Not sent, nothing to approve: No chat is titled exactly \"Tea\"; writes need an ID, @username or the exact title","hint":"Run the command again with one of these IDs.","candidates":[{"id":"-1004001","title":"Team","type":"supergroup"},{"id":"-1004002","title":"Team Design","type":"supergroup"}]}}
[exit 2]
```

- Pass `-` as the text and put the text on stdin (`send`, `reply`, `edit`, `send-file -c -`), or
  `stdin` over MCP: `printf '%s' "$text" | telegram send <chat> -`. No quoting bugs, and the user
  approves exactly that text.
- Without `--html` or `--markdown` the text goes out exactly as typed (`__init__.py` stays as is).
- `--html` is the reliable formatting (`<b>`, `<i>`, `<a href>`, `<code>`, `<pre>`). `--markdown` is
  GramJS Markdown: bold, italic and code, but `[text](url)` links do not work.
- `send` takes `--reply-to <id>`, `--topic <id>`, `--silent` and `--schedule 2h` (or an ISO date).
  A bad number or value exits 2 before anything is sent or approved.
- `send-file <chat> <path> -c <caption>` sends a file; over MCP the path is on the server's machine.

## Bot buttons

`click <chat> <msgId> <label|index>` presses a button (a write). Press by label: indices are
counted on the current menu, which changes after each press. `click` prints the bot's answer and
the new menu, so you don't need another `read`:

```
$ telegram click @demo_bot 2 Catalog
✓ Pressed [1] Catalog (callback)

↻ Message #2 updated by the bot:
  Catalog: 3 items
  ⌨ inline keyboard:
    [1] « Back — callback
```

| Button type | `click` does |
|---|---|
| callback | sends the callback, shows the answer and the updated message |
| reply-keyboard text | sends the label as a message |
| url, url_auth, webview | prints the URL, never opens it |
| game | asks the bot for the game (`messages.GetBotCallbackAnswer` with `game:true`); the answer may hold its URL. Use `buttons` to look without pressing |
| switch-inline | prints the query, does not send it |
| copy | prints the text |
| request phone, geo, poll or peer; buy | refused on purpose |

A button that asks for the 2FA password is pressed by the user in the Telegram app: stop and tell
them. Never ask for the password and never pass it on a command line.

## Other writes

- `edit <chat> <id> -` replaces the text. `delete <chat> <id,id>` deletes **for everyone** by
  default; `--just-me` only on the user's side (private chats and basic groups).
- `react <chat> <id> 👍` (`me` is Saved Messages). `pin` is silent unless `--notify`;
  `unpin <chat>` with no ID unpins **every** pinned message.
- `forward <from> <ids> <to>` (`--drop-author` hides the source).
- `poll <chat> "Q" A B C` (`--multiple`, `--quiz --correct N`) and `vote <chat> <id> 2` count
  options from 1.
- `mark-read`, `mark-unread`, `mute -d 8h`, `pin-chat`, `archive`: the user's own view of a chat.
- `delete-dialog <chat>` clears a private or basic-group history (`--revoke` also for the other
  side) or leaves a supergroup or channel.
- Admin: `edit-permissions <chat> [user] --mute|--ban|--lift|--deny send,media [--until 1d]`,
  `promote`, `kick`, `topic create|edit|close|reopen|pin|unpin`. Check rights first with
  `permissions`.

## What the user does in the app

Some actions stay with the user, in the Telegram app or their own terminal:

- buttons and actions that ask for the 2FA password;
- transferring ownership of a group or channel (irreversible);
- logging in, changing the 2FA password or phone, ending sessions, deleting the account, paying.
  The raw API refuses these too ([api.md](api.md)).

## Results

| Command | `--json` result |
|---|---|
| `send`, `reply`, `send-file`, `edit`, `delete`, `react`, `pin`, `unpin` | `{ok: true, action, chatId, chatTitle, messageId \| messageIds, …}` |
| `forward` | `{ok: true, action, chatId, chatTitle, fromChatId, messageIds, forwardedIds, count, …}`: `messageIds` are the **source** IDs in `fromChatId`; `forwardedIds` are the copies in `chatId`, use them to reply or edit |
| `mark-read` | `{ok: true, action, chatId, chatTitle, chat, read: true}` (no message ID) |

Confirm to the user where it went: the `chatTitle` and ID from the result, not the name you typed.

## Audit log

Commands with audit try to record the result in `audit.jsonl` in the active profile's folder
(`~/.config/tg/` for the default profile on macOS and Linux; another `TG_PROFILE` or OS has its
own). A write that stops for approval or because writes are off ends before the log, not every
write keeps one, and a failed log write is ignored, so a missing entry proves nothing.
