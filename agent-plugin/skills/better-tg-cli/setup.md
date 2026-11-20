# Setup, MCP server and troubleshooting

- [Install](#install)
- [How each client gets it](#how-each-client-gets-it)
- [Log in](#log-in)
- [Profiles, secrets and cloud computers](#profiles-secrets-and-cloud-computers)
- [MCP server](#mcp-server)
- [Exit codes and errors](#exit-codes-and-errors)
- [Troubleshooting](#troubleshooting)

## Install

Before the first shell use, `telegram help-all -g read` checks that the right program is installed
(it is local and needs no login). If `telegram` is missing, or has no `help-all`, another program
owns that name. Ask the user before installing anything, then one of:

```bash
brew install thevilfer/tap/better-tg-cli   # macOS, Linux
npm install -g better-tg-cli               # Node 20 or newer, any OS
curl -q --proto '=https' --tlsv1.2 -fsSL https://github.com/TheVilfer/better-tg-cli/releases/latest/download/install.sh | sh   # no Homebrew, Node or sudo: ~/.local/bin
scoop bucket add thevilfer https://github.com/TheVilfer/scoop-bucket && scoop install better-tg-cli   # Windows
```

Never install `@skillhq/telegram`: it is an old build, and bot replies come back as `(no text)`.
`telegram update` upgrades an install (`update --check` only reports). `telegram skill
install|uninstall [-a <agent>]` copies this skill into coding agents or removes it, and `telegram
skill status [--json]` shows where it is; run them only when the user asks.

## How each client gets it

| Client | What it installs | How the agent reaches Telegram |
|---|---|---|
| Claude Code (marketplace plugin) | the skill | the installed `telegram` CLI in the shell |
| Codex, Cursor (plugin) | the skill and an MCP server | MCP tools (`npx better-tg-cli@<version> mcp`, pinned) |
| Hermes Agent (plugin catalog) | the skill and an MCP server | MCP tools |
| Claude Desktop (`.mcpb`), other MCP clients | an MCP server | MCP tools |
| any agent with a shell | the skill (`telegram skill install`, skills.sh) | the CLI |

Use whatever tools the client exposes: MCP tools when they are there, the CLI otherwise.

## Log in

`Not configured`, `Not authenticated`, `session_expired` or exit 5 mean the user has to log in.

- **Shell:** run `telegram onboard --json` (in the background if your tool times out before
  ~15 minutes). It opens a page on 127.0.0.1 where the user gets a login key (or enters their own
  API keys), scans a QR code, types the 2FA password and picks the write mode. Relay the `url`
  event if no browser opened. Events: `url`, `waiting_invite`, `waiting_scan`, `need_password`,
  `logged_in`, `waiting_mode`, `mode`, then `done` (exit 0); `timeout` (exit 1). An `error` before
  `url` (the stored login could not be checked: locked store, no network) ends the process with
  exit 1: tell the user the message. An `error` after `url`, while the process still runs, means
  that attempt failed and the page offers a retry, so keep waiting. A stored session that Telegram no
  longer accepts gives `session_expired` and a new login on the same page. `already_logged_in`
  exits 0 without a `done`: check with `telegram whoami`.
- **MCP:** call `telegram_setup` and give the user the link. Nothing reports when they finish: wait
  for their message, then check `telegram_read {"args":["whoami"]}` and `["write-access"]`. The page
  opens on the machine that runs the MCP server.
- **SSH or no browser:** ask the user to run `telegram auth --qr` (own API keys) or
  `telegram auth --login-key --qr` in their own terminal. It is interactive; never run it for them.

Never run `telegram auth` yourself, never fill in the page, and never ask for a login code, 2FA
password, login key or api_hash in the chat. `telegram check` connects and checks the session;
`whoami` shows the account.

## Profiles, secrets and cloud computers

- `TG_PROFILE=<name>` gives a separate account: its own folder (`~/.config/tg-<name>`, on Windows
  `%APPDATA%\tg-<name>`) and its own secrets. Log in and set the mode on the profile and machine
  the agent actually uses.
- The session and the write mode normally live in the OS secret store (macOS Keychain, Linux
  Secret Service, Windows DPAPI, or 1Password). If the store is unavailable or a save fails, the
  session can end up in `config.json5`; `telegram check --json` → `sessionStore` says where it is
  (no need to open the config, which holds secrets). A locked store gives an error with one step
  for this OS (unlock the keychain, …), then `telegram check`.
- A computer without a secret store (cloud agent computers, headless Linux) keeps the mode in a
  0600 file in the profile, marked "unprotected". Never install a keyring or `libsecret-tools`
  there. The mode is still the user's to set; `on` opens a local page for them to choose.

## MCP server

`telegram mcp` (stdio) or `telegram mcp --http` (`POST /mcp` on 127.0.0.1:8787, `Authorization:
Bearer <token>`) serves four tools. `telegram mcp --token` prints a live bearer token: the user runs
it in their own terminal and pastes it into the MCP client; never run it or handle the token
yourself.

| Tool | Use |
|---|---|
| `telegram_help {"grep":"thread"}` | find a command or flag |
| `telegram_read {"args":["inbox","-n","10"]}` | read commands, `schema`, any `--help`, `write-access` status |
| `telegram_write {"args":["send","-1004001","-"],"stdin":"…","approval"?}` | everything that changes the account or saves files (`download`, `sync`, `avatar`) |
| `telegram_setup {}` | the login or write-mode page, for the user |

- A server started with `--read-only` drops `telegram_write`: tell the user writes are off on this
  server, and don't look for a way around it.
- Never over MCP: `auth`, `onboard`, `logout`, `transfer-owner`, `update`, `skill`, and changing
  `write-access`. A misrouted call says which tool to use (`"send" changes something; use
  telegram_write`).
- The result text is the CLI's stdout; `structuredContent` has `{exitCode, stderr?}`, so a failure
  keeps its exit code. A write waiting for approval is not an error: `{status:"approval_required", …}`
  ([writing.md](writing.md#approval-in-mode-ask)).
- Calls run one at a time, time out after 120 s and are capped at 100 KB of output. `watch` needs
  `-t` or `-n`.

## Exit codes and errors

| Code | Meaning | What to do |
|---|---|---|
| 0 | ok | |
| 1 | runtime: Telegram refused, network, chat or message not found, rate limit | read `error.code` |
| 2 | usage: unknown option, bad value, ambiguous chat name | fix the arguments or pick a candidate |
| 3 | approval needed (mode `ask`) | [writing.md](writing.md#approval-in-mode-ask) |
| 4 | write access is off | [writing.md](writing.md#write-modes) |
| 5 | not logged in, or the session ended | [log in](#log-in) |

With `--json` stdout holds exactly one JSON value, the result or
`{"error":{"code","message","hint"?,"command"?,"candidates"?,"retryAfterSeconds"?,"listedAt"?}}`. Stable codes include
`chat_not_found`, `ambiguous_chat`, `chat_not_exact`, `ambiguous_or_unverified`, `not_a_forum`,
`invalid_argument`, `usage`, `write_disabled`, `not_configured`, `session_expired`, `network`,
`flood_wait`, `telegram_rpc` and `refused`. Exit 3 has its own line, `{"error":"approval_required",…}`.
Exceptions: `onboard --json` and `watch --json` print JSON Lines (one event or message per line),
and `avatar --json` for a chat with no profile photo prints a plain text line. `telegram api`
takes no `--json` (exit 2, `usage`); see [api.md](api.md#errors).
A bad number or value exits 2 before anything is sent or approved.

## Troubleshooting

- **`FLOOD_WAIT` / `flood_wait`:** the CLI waits out limits of up to 60 s by itself (stderr says
  so). A longer one fails with the wait in `retryAfterSeconds`: tell the user and stop. Retrying in
  a loop extends the ban.
- **`network`, `NetSocket was closed`, connect timeouts:** the CLI retries over WebSocket
  (`wss://*.web.telegram.org`) by itself and remembers it for the profile; `TG_TRANSPORT=wss|tcp`
  forces one. A network error is not a reason to log in again.
- **`session_expired` (exit 5)** at connect or on any call: Telegram ended the session; log in again.
- **`CHANNELS_TOO_MUCH` on `join`:** the account is in too many channels; the user leaves some.
- **`Could not find the input entity`:** the ID is not among the user's dialogs; use `@username`.
- **A chat the user just joined or renamed is `chat_not_found`** (the error has `listedAt`): reads
  match names against the dialog list saved up to 10 minutes ago. `TG_NO_CACHE=1` reads it again.
  `TG_LOG_LEVEL=debug` prints one stderr line per lookup: `dialog cache: hit` (answered from that
  list), `refresh` (read from Telegram, with the reason) or `miss` (a @username or a list already read).
- **Bot replies show `(no text)`:** an old build (`@skillhq/telegram`) is installed; see Install.
