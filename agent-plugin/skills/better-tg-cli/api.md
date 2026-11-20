# Raw Telegram API

Use it only when no regular command does the job: regular commands page, resolve chats, format
output and show the user a readable action to approve. Every TL method of the client API has a
command, `telegram <namespace> <method>` (`messages.GetHistory` → `telegram messages
get-history`), and `telegram api <namespace.Method> --params '<json>'` runs the same method from
one JSON body. Both print compact JSON. Examples are real output of the mock account (`TG_MOCK`);
the JSON bodies were also checked to serialize with teleproto.

- [Find the method](#find-the-method)
- [Read, write or refused](#read-write-or-refused)
- [Passing parameters](#passing-parameters)
- [Examples](#examples)
- [Errors](#errors)

## Find the method

1. `telegram --help` ends with the namespaces and their method counts.
2. `telegram <ns> --help` lists a namespace's methods, each marked `[read]`, `[write]` or `[refused]`.
3. `telegram schema <ns> <method>` (or `telegram <ns> <method> --help`) gives the description,
   access, return type and every parameter. It is local: no account, no network. Over MCP both go
   through `telegram_read`, even for a write or refused method; pass only the command path.

```
$ telegram schema messages send-reaction
{"command":"messages send-reaction","className":"messages.SendReaction","access":"write","mcpAccess":"write","returns":"Updates","description":"React to message.","docsUrl":"https://core.telegram.org/method/messages.sendReaction","params":[{"flag":"--big","name":"big","type":"true","required":false,"description":"Whether a bigger and longer reaction should be shown"},{"flag":"--add-to-recent","name":"addToRecent","type":"true","required":false,"description":"Whether to add this reaction to the recent reactions list »."},{"flag":"--peer","name":"peer","type":"InputPeer","required":true,"description":"Peer"},{"flag":"--msg-id","name":"msgId","type":"int","required":true,"description":"Message ID to react to"},{"flag":"--reaction","name":"reaction","type":"Reaction[]","required":false,"description":"A list of reactions (doesn't accept reactionPaid constructors, use messages.sendPaidReaction to send paid reactions, instead)."}],"example":"telegram messages send-reaction --peer @username --msg-id 1"}
```

## Read, write or refused

Read `access` (terminal) and `mcpAccess` (MCP) in `schema` before the call; don't guess from the
name.

- **`read`** runs without write access; over MCP through `telegram_read`.
- **`write`** goes through the same write guard as `send`: in mode `ask` the user approves that one
  call ([writing.md](writing.md#approval-in-mode-ask)), so `write-access on` is never needed for
  it. Over MCP it goes through `telegram_write`.
- **`refused`** never runs: logging in and the `auth.*` namespace, deleting the account, ending
  sessions, 2FA, password and phone changes, data export (takeout), Passport, external-site login,
  ownership transfer, paying and spending Stars, sharing the phone number or location.
- Over MCP only an allowlist of about a hundred methods runs (messages, dialogs, chats, users,
  search, reactions, pins, polls, bot buttons, basic chat admin); `mcpAccess` is `refused` for the
  rest. `telegram schema ping` gives `"access":"write","mcpAccess":"refused"`. Ask the user to run
  such a method in a terminal.
- Some methods are named like reads but are writes: `messages.GetBotCallbackAnswer` and
  `ephemeral.GetCallbackAnswer` press a bot button, `messages.GetInlineBotResults` sends the query
  and the user's ID to the bot.
- Parameters can change the class. `messages.GetMessagesViews` is a read, but with
  `--increment true` it adds a view, so it is a write; a call with `allowPaidStars` is a write
  (and refused over MCP). Over MCP paid or risky parameters are refused; in results phone numbers
  and locations show as `"[redacted]"`, login codes as `[login code hidden]` and gift links as
  `[gift code hidden]`.

When a call is refused, or refused for its parameters, stop and tell the user; don't look for
another method that does the same.

## Passing parameters

One `--flag` per parameter, the name kebab-cased (`msgId` → `--msg-id`):

| TL type | How to pass |
|---|---|
| `int`, `long`, `double` | a number (`--limit 20`) |
| `string` | text |
| `Bool` | `true` or `false` |
| `true` (a flag bit) | a bare switch (`--silent`) |
| `bytes` | base64, or `hex:…` |
| `InputPeer`, `InputUser`, `InputChannel` | an ID, `@username`, exact title or `me` |
| vector of a primitive | a comma list (`--id 100,101`) |
| a constructor, or a vector of them | JSON with `"_"` naming the constructor |

- Name every constructor with `"_"` (camelCase TL name): `{"_":"reactionEmoji","emoticon":"👍"}`,
  `{"_":"inputReplyToMessage","replyToMsgId":42}`. Without it an abstract type fails:
  `Ambiguous type "Reaction" — add "_" to pick a constructor`.
- In JSON, `{"_chat":"<id|@user|title|me>"}` resolves a chat like every command does,
  `{"_base64":"…"}` and `{"_hex":"…"}` pass bytes, `{"_bigint":"…"}` a `long`.
- `--json-params '<json>'` (or `-` for stdin) merges a JSON object; typed flags win.
- Paging and cache cursors (`offsetId`, `offsetDate`, `addOffset`, `maxId`, `minId`, `hash`, …)
  default to 0.
- `stats`, `stories`, `contacts`, `auth`, `folders` and `help` are also regular commands. The method
  runs only when the next word is exactly a method name (`telegram stats get-broadcast-stats …`);
  `telegram stats "Team"` is the regular `stats`.

## Examples

```
$ telegram messages send-reaction --peer me --msg-id 1 --reaction '[{"_":"reactionEmoji","emoticon":"👍"}]'
{"updates":[],"users":[],"chats":[],"date":1795136463,"seq":0,"className":"Updates"}
$ telegram account delete-account --json
{"error":{"code":"refused","message":"Refused: deleting the account is irreversible."}}
[exit 1]
```

The same reaction as one JSON body:
`telegram api messages.SendReaction --params '{"peer":{"_chat":"me"},"msgId":1,"reaction":[{"_":"reactionEmoji","emoticon":"👍"}]}'`.
A reply as a nested constructor:
`telegram api messages.SendMessage --params '{"peer":{"_chat":"me"},"message":"hi","replyTo":{"_":"inputReplyToMessage","replyToMsgId":1}}'`.
For a plain reaction or reply the regular `react me 1 👍` and `reply me 1 -` are better.

## Errors

Raw calls return Telegram's RPC errors, with `--json` as `{"error":{"code":"telegram_rpc",…}}`:
`PEER_ID_INVALID` (chat or user not resolved), `CHAT_ADMIN_REQUIRED` (missing admin right),
`CHANNEL_PRIVATE` (not a member), `MESSAGE_ID_INVALID` (no such message). `FLOOD_WAIT`: tell the user
the wait and stop. A method's `--help` lists its own common errors.
