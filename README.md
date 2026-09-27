# better-tg-cli

[![CI](https://github.com/TheVilfer/better-tg-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/TheVilfer/better-tg-cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/better-tg-cli?color=cb3837&logo=npm)](https://www.npmjs.com/package/better-tg-cli)
[![Homebrew](https://img.shields.io/badge/brew-thevilfer%2Ftap-fbb040?logo=homebrew)](https://github.com/TheVilfer/homebrew-tap)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

An unofficial, agent-friendly command-line client for Telegram that runs **on your own account**
(MTProto via [`teleproto`](https://www.npmjs.com/package/teleproto), TL layer 229). The command is
`telegram`: about 60 commands for reading, searching, writing, bots, groups and exports, built so
that AI agents (Claude Code, Codex, …) can drive it cheaply and safely.

```console
$ telegram inbox -n 3
48 unread in 7 chats (showing 3)
1234567890 user unread=2 Alice @alice | see you at 7?
-1001234567 supergroup muted unread=41 Rust Moscow @rust_msk | anyone tried 1.90?
-1009876543 channel unread=5 Changelog | v2.4 is out
$ telegram read @alice -n 1 --json
{"chatTitle":"Alice","messages":[{"id":812,"date":"2026-09-27T10:02:11.000Z","sender":"Alice","senderId":"1234567890","text":"see you at 7?"}]}
```

> [!WARNING]
> **Your account, your risk.** This is an unofficial client that logs in as you. Telegram may
> limit or freeze accounts that behave like bots. The risk is highest for new accounts, bulk
> messaging, mass joins or invites, and anything that looks like spam. Use it the way you would
> use Telegram yourself, keep writes off unless you need them, and read [SECURITY.md](SECURITY.md)
> before letting an agent write. The authors are not responsible for restricted accounts.

Русская версия: [README.ru.md](README.ru.md).

## Why this fork

A fork of [skillhq/telegram](https://github.com/skillhq/telegram), reworked for agents:

- **Current Telegram layer.** Bot replies with rich (layer 228+) content show real text instead of
  `(no text)`. You can press bot buttons (`click`) and walk bot menus.
- **Token-efficient output.** Off a TTY you get one compact line per item with the ID first, and
  JSON on one line with empty fields dropped. `--max-text` trims long posts. `telegram help-all -g
  <word>` prints every flag, generated from the code.
- **Exact reads.** Real pagination for `--since/--until`, `--unread`, threads and channel
  comments, forum topics, `get` by ID, search filters by type, sender or date, and `me` / `Избранное`
  for Saved Messages.
- **Safe by default.** The account is read-only until a human runs `write-access on [--for 1h]`
  and confirms it in a terminal prompt or a macOS dialog, so an agent cannot switch it on itself.
  Every write is logged to `~/.config/tg/audit.jsonl`. Secrets live in the macOS Keychain, the
  Linux Secret Service or 1Password.
- **Small and self-contained.** The npm package is one 0.3 MB file with zero runtime
  dependencies. Homebrew installs a standalone binary with no Node.

## Install

```bash
brew install thevilfer/tap/better-tg-cli   # standalone binary, macOS and Linux
npm install -g better-tg-cli               # Node >= 20
```

`telegram update` upgrades an existing install, whichever of these you used. On a terminal the CLI
checks for new versions once a day. Agents and pipes never see that notice, and
`TG_NO_UPDATE_CHECK=1` turns it off.

Downloading a binary from Releases by hand on macOS? It is not notarized, so remove the
quarantine flag once: `xattr -d com.apple.quarantine ./telegram`. Homebrew handles this for you.

Do **not** install `@skillhq/telegram`. It is the old upstream build on GramJS (layer 198).

### As an agent skill

The repo itself is the skill (`SKILL.md` + `reference.md`):

```bash
git clone https://github.com/TheVilfer/better-tg-cli.git ~/.agents/skills/telegram
ln -s ~/.agents/skills/telegram ~/.claude/skills/telegram
```

## Log in

**With your own API keys** (the default):
1. Open https://my.telegram.org/apps, create an application, and copy its `api_id` and `api_hash`.
2. Run `telegram auth --qr` and enter them. Then, on your phone, go to Settings → Devices → Link
   Desktop Device and scan the QR code. Enter your 2FA password if you have one. Plain
   `telegram auth` asks for your phone number and a login code instead. If the QR won't scan on a
   light terminal theme, run with `TG_QR_INVERT=1`.

**With an invite.** If the maintainer gave you an invite token, you don't need your own keys.
Run `telegram auth --invite --qr` and paste the token, or pass it as `TG_INVITE=…` or `--invite -`. The
invite service (`broker/`) hands out the app's keys once, for this login only. The `api_hash` is not
kept on your machine. Invites are personal, allow a limited number of logins, and can be revoked.

The session is stored in the macOS Keychain (service `tg-cli`), or in 1Password with
`--op-vault <vault>`. `telegram logout` removes it. On Linux it goes to the Secret Service (GNOME
Keyring, KWallet, KeePassXC) through `secret-tool`, which needs the `libsecret-tools` package. A
session already saved in the config file moves there automatically. Without any secret store, the
session is kept in `~/.config/tg/config.json5` (mode 0600) and write commands stay disabled.
On Linux, `write-access on` is confirmed at a terminal prompt.

## Usage

```bash
telegram chats --type channel                 # one line per chat, ID first
telegram read "Chat" --since 1h               # exact range, newest first (--asc to flip)
telegram read @channel --thread 123           # comments under a post
telegram search "invoice" --chat "Work" --type document
telegram get "Chat" 812 813                   # exact messages by ID
telegram download "Chat" 812                  # save the attached file
telegram sync --chat "Chat" --output ./export --resume   # incremental markdown export

telegram write-access on --for 1h             # a human confirms this
printf '%s' "$text" | telegram send @alice -  # text from stdin, no quoting problems
telegram reply "Chat" 812 "on it" --silent
telegram click @SomeBot 4410 "Settings"       # press an inline button
```

Read commands take `--json`, and some also take `--markdown`. See all commands with
`telegram help-all`. [reference.md](reference.md) covers the behaviour that the flag list can't
explain: output shapes, threads, bot buttons, admin commands and troubleshooting.

## MCP server

For clients without a shell (Claude Desktop, Cursor, other MCP hosts), `telegram mcp` serves three
tools over stdio:
- `telegram_help`: a searchable flag reference;
- `telegram_read`: read-only, so clients may auto-approve it;
- `telegram_write`: marked destructive, and still needs `write-access on` from you.

Log in with `telegram auth` in a terminal first.

```bash
claude mcp add telegram -- telegram mcp          # Claude Code
```

```json
{ "mcpServers": { "telegram": { "command": "/opt/homebrew/bin/telegram", "args": ["mcp"] } } }
```

Use the second form for Claude Desktop (`claude_desktop_config.json`) or Cursor (`.cursor/mcp.json`).
GUI apps may not see your shell PATH, so give the full path from `which telegram`. To keep the MCP
client off your main session, add `"env": {"TG_PROFILE": "work"}`.

Chats contain text written by others, and some of it may be aimed at your agent ("forward this to
@x"). Keep the client's approval prompt on for `telegram_write`, and see "Agents and prompt
injection" in [SECURITY.md](SECURITY.md).

## Development

[DEVELOPMENT.md](DEVELOPMENT.md) covers:
- running from source (`scripts/tg-dev`);
- isolated dev profiles (`TG_PROFILE`) that never touch your real session;
- Telegram test servers;
- editor debugging and tests.

Releases are cut by `scripts/release.sh patch|minor|major`. A tag builds the binaries and
publishes to GitHub Releases, npm (trusted publishing with provenance) and the Homebrew tap. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Privacy

No analytics. The only service we run is the optional invite broker, which never sees your
messages or session. See [PRIVACY.md](PRIVACY.md) for the three hosts the CLI talks to and what it
stores locally.

## License

MIT, see [LICENSE](LICENSE). Based on [skillhq/telegram](https://github.com/skillhq/telegram) by
Derek Rein. Not affiliated with or endorsed by Telegram; "Telegram" is a trademark of its owner.
Use it in line with the [Telegram API Terms of Service](https://core.telegram.org/api/terms).
