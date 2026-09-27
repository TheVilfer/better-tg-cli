---
name: telegram
description: Full-featured Telegram CLI — read, search, send, edit and delete messages, manage groups and channels, press bot buttons, react, forward, pin, poll/vote, watch live messages, manage contacts and your own profile, and sync history. Use when the user asks about Telegram messages, wants to check inbox, search chats, send/edit/delete messages, format messages, schedule a message, mute/unmute chats, kick/block users, press bot buttons or navigate bot menus, react with emoji, forward or pin messages, create polls or vote, join/leave/create/archive chats, get invite links, watch for new messages in real time, query inline bots, read stories, download avatars, manage contacts, or update their own name/bio/username/avatar.
---

# 📬 Telegram CLI

Fast Telegram CLI for reading, searching, and sending messages.

## 🎯 When to Use

Use this skill when the user:
- Asks to check Telegram messages or inbox
- Wants to search Telegram for a topic/keyword
- Wants to send a Telegram message or reply to one
- Asks about a Telegram group, contact, or chat
- Wants to see unread messages
- Needs to look up group members or admins
- Wants to mute/unmute a noisy chat or group
- Needs to kick/remove a user from a group
- Wants to export or sync chat history to files
- Asks to organize chats into folders
- Wants to check their logged-in account or session status

## 📦 Install

```bash
npm install -g @skillhq/telegram
```

## 🔐 Authentication

First-time setup requires API credentials from https://my.telegram.org/apps

```bash
telegram auth                                # First-time login
telegram logout                              # Clear saved session
telegram check                               # Verify session is valid
telegram whoami                              # Show logged-in account
telegram whoami --json                       # Account info as JSON
```

## 📖 Commands

### Reading Messages
```bash
telegram inbox                               # Unread messages summary
telegram chats                               # List all chats
telegram chats --type group                  # Filter: user, group, supergroup, channel
telegram chats -n 200                        # List up to 200 chats
telegram read "ChatName" -n 50               # Read last 50 messages
telegram read "ChatName" --since "1h"        # Messages from last hour
telegram read "ChatName" --until "2h"        # Messages up to 2 hours ago
telegram read @username -n 20                # Read DM with user
telegram read 123456789 -n 10               # Read by chat ID
```

### Searching
```bash
telegram search "query" --chat "ChatName"    # Search within chat
telegram search "query" --all                # Search all chats (global)
telegram search "query" -n 20               # Limit results
```

### Sending Messages
```bash
telegram send @username "message"            # Send DM
telegram send "GroupName" "message"          # Send to group
telegram reply "ChatName" 12345 "response"   # Reply to message ID

telegram send @user "**bold** text" --markdown   # Markdown formatting (GramJS dialect)
telegram send @user "<b>bold</b> <a href=\"https://x.com\">link</a>" --html  # HTML formatting
telegram send @user "later" --schedule 2h        # Schedule ("30m"/"2h"/"1d" or an ISO date)
telegram send @user "quiet" --silent             # No notification sound
```

> **Formatting note:** `--html` is the reliable mode — bold, italic and links all
> work. `--markdown` uses GramJS's dialect (`**bold**`, `` `code` ``) and does **not**
> parse `[text](url)` links; prefer `--html` when you need links.

### Editing & Deleting
```bash
telegram edit "ChatName" 12345 "new text"    # Edit your own message (--markdown / --html)
telegram delete "ChatName" 12345             # Delete (revokes for everyone by default)
telegram delete "ChatName" 12,13,14          # Delete several
telegram delete "ChatName" 12345 --just-me   # Delete only on your side
telegram mark-read "ChatName"                # Clear a chat's unread badge
telegram pinned "ChatName"                   # List pinned messages
```

### Polls
```bash
telegram poll "ChatName" "Question?" Option1 Option2 Option3   # Send a poll
telegram poll "Chat" "Pick" A B --multiple                     # Allow multiple answers
telegram poll "Chat" "2+2?" 3 4 5 --quiz --correct 2           # Quiz (1-based correct index)
telegram poll "Chat" "Q" A B --public                          # Non-anonymous (voters visible)
telegram vote "ChatName" 12345 2             # Vote for option #2 (1-based)
telegram vote "ChatName" 12345 1 3           # Multiple choices
```

### Reactions
```bash
telegram react "ChatName" 12345 👍            # React with an emoji (--big, --remove)
telegram reactions "ChatName" 12345          # List who reacted and with what
```

### Watch (real-time)
```bash
telegram watch                               # Stream new messages from all chats (Ctrl-C to stop)
telegram watch "ChatName" -t 30              # Watch one chat for 30 seconds
telegram watch -n 10 --json                  # Stop after 10 messages, JSON lines
```

> **One session at a time:** `watch` receives live updates over the account's
> single session. Running other `telegram` write commands (send, react, …) in a
> **separate process while `watch` is running** can steal update delivery and make
> the watcher miss messages. Let `watch` run on its own; it reliably catches
> messages sent from other people/devices.

### Membership & Chats
```bash
telegram join @channelname                   # Join a public channel/group
telegram join "https://t.me/+AbCdEf..."      # Join via invite link
telegram leave "ChatName"                    # Leave a group or channel
telegram invite-link "ChatName"              # Export the chat's invite link
telegram archive "ChatName"                  # Move chat to the Archive
telegram unarchive "ChatName"                # Move it back
telegram create-group "Title" @user1 @user2  # Create a group with members
telegram create-channel "Title" -a "about"   # Create a supergroup (--broadcast for a channel)
telegram typing "ChatName"                   # Show a "typing…" status (or photo/video/…/cancel)
```

### Contacts & Blocking
```bash
telegram block @spammer                      # Block a user
telegram unblock @user                       # Unblock
telegram add-contact @user "First" "Last"    # Add to your contacts
telegram del-contact @user                   # Remove from contacts
```

### Your Profile
```bash
telegram set-name "First" "Last"             # Change your display name
telegram set-bio "New bio text"              # Change your bio / about
telegram set-username newhandle              # Change your @username
telegram set-avatar ./photo.jpg              # Set your profile photo
telegram avatar @user -o ~/downloads         # Download someone's avatar
```

### Inline Bots & Stories
```bash
telegram inline @gif "cat"                   # Query an inline bot (@gif, @pic, @vid, …)
telegram stories @username                   # List a user's active stories
```

### Media (photos & documents)
```bash
telegram send-file @username ./photo.jpg                       # Send photo
telegram send-file "GroupName" ./report.pdf -c "Q1 report"    # Send doc with caption
telegram send-file @user ./photo.jpg --as-document             # Send image uncompressed
telegram send-file "Chat" ./file.pdf --reply-to 12345          # Send as a reply

telegram download "ChatName" 12345                             # Download media from message
telegram download @user 67890 -o ~/downloads/tg                # Custom output dir
telegram download "ChatName" 12345 --json                      # JSON: filePath + media info
```

Media attachments now show up inline in `read`, `search`, `inbox`, and `sync` output. Each media-bearing message is tagged with its kind, filename, size, duration and dimensions where available (e.g. `[📷 photo]`, `[📎 document report.pdf · 1.2 MB]`, `[🎬 video · 0:42 · 1280×720]`). In `--json` output, messages include a `media` object with `kind`, `fileName`, `mimeType`, `size`, `width`, `height`, `duration`.

### Bot Buttons (inline keyboards)

Bot messages often carry buttons — inline keyboards (callback/URL/web-app buttons
attached under the message) and reply keyboards (custom keyboard that replaces the
input bar). Buttons now show up inline in `read`, `inbox`, `search` and `sync`
output, each tagged with a 1-based `[index]`, its label, and its type:

```
⌨ inline keyboard:
  [1] API Token — callback
  [2] Bot Settings — callback
  [3] Open site — url → https://example.com
```

```bash
telegram buttons @SomeBot 12345               # List the buttons on message #12345
telegram buttons @SomeBot 12345 --json        # Structured layout (index, type, url, callback data as base64)

telegram click @SomeBot 12345 2               # Press button #2 (by index)
telegram click @SomeBot 12345 "Bot Settings"  # Press by label (exact, then substring match)
telegram click @SomeBot 12345 --data <base64> # Press a callback button by its exact payload
telegram click @SomeBot 12345 1 --json        # Machine-readable outcome
telegram click @SomeBot 12345 1 --no-wait     # Don't wait for / fetch the bot's response
telegram click @SomeBot 12345 1 --password X  # For buttons that require your 2FA password
```

After pressing a **callback** button, `click` waits briefly and re-reads the
message, so you see how the bot responded — the edited message text and its new
buttons, plus any new messages the bot sent. This is what makes it possible to
*navigate* a bot's menus: press → see the new menu → press again.

Behaviour by button type:

| Type | What `click` does |
|------|-------------------|
| callback | Sends the callback to the bot, then shows the bot's toast/alert and the updated message + new buttons |
| game | Requests the game callback, returns the game URL |
| reply-keyboard text button | Sends the button's label as a message |
| url / url_auth / web-app | Prints the URL (never opened automatically — open it yourself) |
| switch-inline | Prints the inline query it would compose (not auto-sent) |
| copy | Prints the text it copies (no server call) |
| request phone / location / poll / peer | Refused automatically (privacy) — do it manually if you mean to |
| buy | Refused — payment checkout can't be automated safely |

`click` is a **write operation**: it requires write access (`telegram write-access on`)
and is recorded in the audit log. Confirm with the user before pressing buttons
that mutate state (delete, transfer, pay, confirm).

### Reactions, Forwarding & Pinning
```bash
telegram react "ChatName" 12345 👍            # React to a message with an emoji
telegram react @user 12345 ❤️ --big          # Play the big / animated reaction
telegram react "ChatName" 12345 --remove     # Remove your reaction

telegram forward "FromChat" 12345 "ToChat"        # Forward one message to another chat
telegram forward @user 12345,12346,12347 "Team"   # Forward several (comma-separated IDs)
telegram forward "FromChat" 12345 "ToChat" --drop-author  # Hide the original sender
telegram forward "FromChat" 12345 "ToChat" --silent       # No notification sound

telegram pin "ChatName" 12345                # Pin a message (silent by default)
telegram pin "ChatName" 12345 --notify       # Pin and notify members
telegram unpin "ChatName" 12345              # Unpin a specific message
telegram unpin "ChatName"                    # Unpin ALL messages in the chat
```

All three are **write operations** (require `telegram write-access on`, recorded in
the audit log). Confirm with the user before pinning/unpinning in shared groups or
forwarding into other people's chats.

### Contacts & Groups
```bash
telegram contact @username                   # Get contact info
telegram members "GroupName"                 # List group members
telegram members "GroupName" -n 500          # Fetch up to 500 members
telegram admins "GroupName"                  # List admins only
telegram groups                              # List all groups
telegram groups --admin                      # Groups where you're admin
telegram kick "GroupName" @username           # Remove user from group
```

### Muting
```bash
telegram mute "ChatName"                     # Mute forever
telegram mute "ChatName" -d 1h               # Mute for 1 hour
telegram mute @username -d 8h                # Mute DM for 8 hours
telegram mute "GroupName" -d 1d              # Mute for 1 day
telegram unmute "ChatName"                   # Unmute
```

### Folders
```bash
telegram folders                             # List all folders
telegram folder "Work"                       # Show chats in folder
telegram folder-add "Work" "ProjectChat"     # Add chat to folder
telegram folder-remove "Work" "ProjectChat"  # Remove chat from folder
```

### Sync / Export
```bash
telegram sync                                # Sync last 7 days to ./telegram-sync
telegram sync --days 30                      # Sync last 30 days
telegram sync --chat "ChatName"              # Sync specific chat only
telegram sync --output ~/exports             # Custom output directory
telegram sync --chat "ChatName" --media      # Also download photos/documents into <chat>/media/
```

## 📤 Output Formats

Most commands support multiple output formats:

| Flag         | Use Case                                    |
|--------------|---------------------------------------------|
| *(default)*  | Human-readable terminal output              |
| `--json`     | Structured JSON for programmatic processing |
| `--markdown` | Markdown-formatted for display or export    |

```bash
telegram inbox --json                        # JSON format
telegram inbox --markdown                    # Markdown format
telegram read "Chat" --json                  # JSON with messages array
telegram read "Chat" --markdown              # Markdown with messages
telegram chats --json                        # JSON with chat list
telegram members "Group" --markdown          # Markdown member list
```

**Supported on:** `inbox`, `read`, `search`, `chats`, `members`, `groups`, `contact`, `whoami`, `buttons`, `click`

## 🤖 AI Agent Guidance

When using this CLI as an AI agent:

- **For processing data** (counting, filtering, extracting): use `--json`
- **For displaying to the user**: use default or `--markdown`
- **Chat identification**: names are partial-matched (e.g., "MetaDAO" matches "MetaDAO Community"), usernames must start with `@`, numeric IDs also work
- **Read operations are safe** to run without confirmation
- **Write operations** (`send`, `reply`, `edit`, `delete`, `kick`, `click`, `react`, `forward`, `pin`, `unpin`, `poll`, `vote`, `block`, `unblock`, `add-contact`, `del-contact`, `join`, `leave`, `create-group`, `create-channel`, `archive`, `set-name`, `set-bio`, `set-username`, `set-avatar`, `mark-read`, `typing`, `invite-link`) should be confirmed with the user before executing — especially destructive ones (`delete`, `leave`, `block`, `set-*` which change the user's own profile) and `click` when the button mutates state
- **`watch` runs until stopped** — always pass `-t <seconds>` or `-n <count>` when running it non-interactively so it terminates on its own
- **Pressing bot buttons**: run `read`/`buttons` first to get the message `#id` and the button `[index]`, then `click <chat> <id> <index|text>`; after a callback press, read the returned edited message + new buttons to decide the next press
- **Rate limiting**: avoid rapid successive calls; the Telegram API has rate limits
- **Large groups**: use `-n` to limit `members` output on very large groups

## 💡 Examples

Check inbox for unread messages:
```bash
telegram inbox
```

Read recent messages from a group:
```bash
telegram read "MetaDAO Community" -n 20
```

Get messages from the last 2 hours:
```bash
telegram read "Project Chat" --since "2h"
```

Search for a topic across all chats:
```bash
telegram search "futarchy" --all
```

Search within a specific chat:
```bash
telegram search "deadline" --chat "Work Team"
```

Send a message:
```bash
telegram send @username "Hello, checking in!"
```

Export a chat's history:
```bash
telegram sync --chat "Project Chat" --days 14 --output ~/exports
```

Filter chats by type:
```bash
telegram chats --type channel --json
```

Kick a user from a group:
```bash
telegram kick "My Group" @spammer
```

## 📝 Notes

- Chat names can be partial matches (e.g., "MetaDAO" matches "MetaDAO Community")
- Usernames must start with `@` (e.g., `@username`)
- Chat IDs (numeric) can be used anywhere a chat name is accepted
- Messages are returned in reverse chronological order (newest first)
- Time flags (`--since`, `--until`) accept formats like `"1h"`, `"30m"`, `"7d"`
- The `sync` command creates one markdown file per chat in the output directory
- **Rich messages (Telegram layer 228+):** bots and clients can send messages whose text lives in a
  block tree (`richMessage`) instead of the plain `message` field. The CLI is built on `teleproto`
  (MTProto layer 229) and renders those blocks to plain text, so `read`/`search`/`watch`/`click`
  show the real reply (with its inline keyboard) rather than `(no text)`. If a bot reply ever shows
  as `(no text)` with `MessageMediaUnsupported` again, the TL layer is behind — bump `teleproto`.
