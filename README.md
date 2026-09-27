# better-telegram-cli

Agent-friendly Telegram CLI on your own account (MTProto via `teleproto`, TL layer 229).
The binary is `telegram`. Fork of [skillhq/telegram](https://github.com/skillhq/telegram) with bot
buttons, rich (layer 228+) bot replies, threads and forum topics, compact output for agents, and
about 60 commands. Run `telegram help-all` for the full command and flag list.

## Installation

```bash
git clone https://github.com/TheVilfer/better-telegram-cli.git ~/.agents/skills/telegram
cd ~/.agents/skills/telegram
npm install && npm run build && npm install -g .
```

Or run `./install.sh`. The folder doubles as the agent skill (`SKILL.md` + `reference.md`): link it into
`~/.claude/skills/telegram` or `~/.codex/skills/telegram`.

Do **not** install `@skillhq/telegram` from npm. That package is the old GramJS build (layer 198), and
bot replies show as `(no text)`.

## Authentication

First, get your API credentials:
1. Go to https://my.telegram.org/apps
2. Log in with your phone number
3. Create a new application
4. Copy the `api_id` and `api_hash`

Then authenticate:

```bash
telegram auth
```

## Commands

### Auth & Status

```bash
telegram whoami                              # Show logged-in account
telegram check                               # Verify session/credentials
```

### Reading

```bash
telegram chats                               # List all chats
telegram chats --type group                  # Filter by type (user, group, supergroup, channel)
telegram read "MetaDAO Community" -n 50      # Read last 50 messages
telegram read "MetaDAO" --since "1h"         # Messages from last hour
telegram read @username -n 20                # Read DM with user
telegram search "futarchy" --chat "MetaDAO"  # Search within chat
telegram search "futarchy" --all             # Search all chats
telegram inbox                               # Unread messages summary
```

### Writing

```bash
telegram send @username "Hello"              # Send DM
telegram send "GroupName" "Hello everyone"   # Send to group
telegram reply "ChatName" 12345 "Response"   # Reply to message ID
```

### Bot Buttons

```bash
telegram buttons @SomeBot 12345              # List buttons on a message
telegram click @SomeBot 12345 2              # Press button #2 (by index)
telegram click @SomeBot 12345 "Settings"     # Press by label
telegram click @SomeBot 12345 1 --json       # Machine-readable outcome
```

Buttons show up inline in `read`/`inbox`/`search` output. After a callback
press, `click` re-reads the message so you see the bot's edited reply and its
new buttons — enough to navigate a bot's menus step by step. `click` needs
write access enabled.

### Reactions, Forwarding & Pinning

```bash
telegram react "ChatName" 12345 👍           # React with an emoji (--big, --remove)
telegram reactions "ChatName" 12345          # List who reacted
telegram forward "FromChat" 12345 "ToChat"   # Forward message(s); comma-separate IDs
telegram pin "ChatName" 12345                # Pin (--notify to alert members)
telegram unpin "ChatName" 12345              # Unpin one; omit ID to unpin all
```

### Editing, Deleting, Polls & Formatting

```bash
telegram edit "Chat" 12345 "new text"        # Edit your own message
telegram delete "Chat" 12,13 --just-me       # Delete (revoke by default)
telegram mark-read "Chat"                    # Clear unread badge
telegram pinned "Chat"                       # List pinned messages
telegram send @user "<b>hi</b>" --html       # HTML/Markdown formatting (--markdown)
telegram send @user "later" --schedule 2h    # Schedule a message
telegram poll "Chat" "Q?" A B C              # Send a poll
telegram vote "Chat" 12345 2                 # Vote for option #2
```

### Real-time, Chats & Profile

```bash
telegram watch "Chat" -t 30                  # Stream new messages (timeout/limit required)
telegram join @channel                       # Join (also invite links); leave/create-group/create-channel
telegram archive "Chat"                      # Archive / unarchive; invite-link "Chat"
telegram block @user                         # block/unblock; add-contact/del-contact
telegram set-name "First" "Last"             # set-bio / set-username / set-avatar
telegram avatar @user                        # Download avatar; inline @gif "cat"; stories @user
```

All of the above except reads (`reactions`, `pinned`, `watch`, `avatar`, `inline`, `stories`) are write operations and need write access enabled.

### Contacts & Groups

```bash
telegram contact @username                   # Get contact info
telegram members "GroupName"                 # List group members
telegram admins "GroupName"                  # List admins only
telegram groups                              # List all groups
telegram groups --admin                      # Groups where you're admin
telegram kick "GroupName" @username          # Remove a user from a group
telegram promote "GroupName" @username       # Promote a member to admin
telegram transfer-owner "GroupName" @username # Transfer ownership (prompts for 2FA password)
```

> `transfer-owner` is irreversible and requires two-step verification on your account.
> It works on supergroups/channels only, prompts for your 2FA password securely, and asks
> you to retype the group name to confirm (`-y` skips the confirmation).

### Muting

```bash
telegram mute "ChatName"                     # Mute forever
telegram mute "ChatName" -d 1h              # Mute for 1 hour
telegram mute @username -d 8h               # Mute DM for 8 hours
telegram unmute "ChatName"                   # Unmute
```

### Folders

```bash
telegram folders                             # List all folders
telegram folder "Work"                       # Show chats in folder
telegram folder-add "Work" "ProjectChat"     # Add chat to folder
telegram folder-remove "Work" "ProjectChat"  # Remove chat from folder
```

### Utilities

```bash
telegram sync --days 7                       # Sync last 7 days to markdown
telegram sync --chat "MetaDAO" --days 30     # Sync specific chat
```

## Output Formats

All read commands support multiple output formats:

```bash
telegram chats --json                        # JSON (for scripts/AI)
telegram read "Chat" --markdown              # Markdown format
telegram inbox --plain                       # Plain text (no colors)
```

## Configuration

Configuration is stored in `~/.config/tg/`:
- `config.json` - API credentials and session
- Session data is encrypted and stored securely

## Development

```bash
npm install
npm run build
npm run dev                            # Watch mode
```

## License

MIT
