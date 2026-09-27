---
name: telegram
description: Full-featured Telegram CLI on the user's own account — read, search, send, edit and delete messages, read comments/threads and forum topics, manage groups and channels, press bot buttons, react, forward, pin, poll/vote, watch live messages, manage contacts and your own profile, and sync history. Use when the user asks about Telegram messages, wants to check inbox or unread, search chats, send/edit/delete messages, format messages, schedule a message, mute/unmute chats, kick/block users, press bot buttons or navigate bot menus, react with emoji, forward or pin messages, create polls or vote, join/leave/create/archive chats, get invite or message links, watch for new messages in real time, query inline bots, read stories, download media or avatars, manage contacts, or update their own name/bio/username/avatar. Also «телеграм», «тг», «телега», «проверь телеграм», «что в тг», «напиши в телеграм», «прочитай чат», «найди в телеге».
---

# Telegram CLI

`telegram <command>` runs on the user's own account (MTProto, not a bot).

**Before using an unfamiliar flag, run `telegram help-all -g <word>`.** It lists every command and flag, generated from the code, so it is always current. For behaviour details (threads, bot buttons, sync, JSON shapes, errors), read `reference.md` next to this file.

## Rules

- **Chat identifiers:** `me` means Saved Messages. A numeric ID is matched exactly (use the ID shown first in `chats`/`inbox`/`search` output). `@username` resolves exactly. Any other text matches chat titles by **substring**. For writes, use an ID or @username.
- **Writes are off by default.** A write fails with "Write access is disabled". Ask the user before running `telegram write-access on`. Get explicit approval for every message sent to other people, and show the final text first.
- **Save tokens:**
  - Start with `inbox --unmuted`, `chats -q <name>` or `search`, not a full `read`.
  - Add `--max-text 200` when skimming.
  - Use `get <chat> <id>` to fetch exactly what you need.
  - Plain output off a TTY is already compact, one line per item with the ID first. Use `--json` only when you parse with jq.
- **Long or multi-line text:** pass `-` and pipe it through stdin (`printf '%s' "$text" | telegram send <chat> -`). This avoids quoting bugs.

## Core commands

```bash
telegram inbox --unmuted -n 20                 # unread chats, most unread first (IDs first)
telegram chats -q "name"                       # find a chat's ID; --unread, --type channel, --archived
telegram read <chat> -n 20                     # newest first; --asc, --since 1d, --until 2026-09-01
telegram read <chat> --unread                  # only what the user hasn't read yet
telegram read <chat> --from @user              # one sender; --before/--after <msgId> for paging
telegram read <chat> --thread <postId>         # comments under a channel post / replies thread
telegram topics <forum> ; telegram read <forum> --topic <id>
telegram get <chat> <id> [id...]               # exact messages
telegram search "query" -n 20                  # global; --chat <c> [--from @u], --type photo|url|document|voice|mentions, --since 7d
telegram info <chat>                           # members, about, linked comments chat, forum?
telegram members <group> -q name ; telegram contacts -q name
telegram send <chat> "text"                    # --reply-to <id>, --topic <id>, --html, --silent, --schedule 2h
telegram reply <chat> <msgId> "text"
telegram send-file <chat> ./file.pdf -c "caption"
telegram edit <chat> <msgId> "new text" ; telegram delete <chat> <id,id>
telegram click <bot> <msgId> <index|label>     # press a bot button; `read` shows [index] label (type)
telegram react <chat> <msgId> 👍 ; telegram forward <from> <ids> <to> ; telegram pin <chat> <id>
telegram download <chat> <msgId> -o ./dir
telegram link <chat> <msgId>                   # t.me link (channels/supergroups)
telegram watch [chat] -t 60 -n 10 --json       # live stream; always bound it with -t/-n
telegram sync --chat <c> --output ./dir --resume   # markdown export, incremental
telegram mark-read <chat> ; telegram mute <chat> -d 8h
```

## JSON shapes (with `--json`)

`chats`, `contacts` and `members` return an array. `read` and `get` return `{chatTitle, messages[]}`. `search` returns an array of `{messages[]}`, and global hits carry `chatId` and `chatTitle`. `inbox` returns `{totalUnread, chatsWithUnread, chats[]}`. Empty fields are omitted.

## If `telegram` is missing

Reinstall from this folder with `cd ~/.agents/skills/telegram && npm install && npm run build && npm install -g .`. **Never** install `@skillhq/telegram` from npm or update this skill with the skills CLI: that is an old GramJS build, and bot replies come back as `(no text)`.
