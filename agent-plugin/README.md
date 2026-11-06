# Better-TG-CLI for Hermes Agent

An unofficial, open-source Telegram client for your own account (not a bot), packaged as a portable
Agent Plugins v1 package: a local MCP server plus the `better-tg-cli` skill. Hermes can read and
search your chats, open threads, comments and forum topics, press bot buttons, and, only after you
approve each action, send, edit, react and forward.

Source code, full documentation and releases: https://github.com/TheVilfer/better-tg-cli

## Before you start

Log in once in your own terminal. Hermes never sees your login code, 2FA password or session:

```bash
npx -y better-tg-cli onboard    # or: brew install thevilfer/tap/better-tg-cli && telegram onboard
```

`onboard` opens a local page: get a login key or use your own API keys, then scan a QR code. Then:

```bash
hermes plugins install better-tg-cli
hermes plugins enable better-tg-cli
```

## Safety

- After `onboard` the account is in write mode `ask`. Before every send, edit, delete, reaction or
  forward, the MCP server asks you through Hermes (MCP elicitation: Allow Once / Deny in the CLI,
  TUI or gateway). Hermes' YOLO mode does not answer it, and an unattended run (cron, no answer in
  5 minutes) is refused, nothing is sent. The model cannot approve on your behalf.
- Writing without asking (`telegram write-access on`) can only be turned on by a person, in a
  terminal prompt or an OS dialog, never through MCP. Login, logout and account transfer are not
  exposed over MCP at all.
- `TG_READ_ONLY=1` in your profile's environment turns every write off.
- Every write is logged locally in the CLI's config folder.

## Disclosure

- **Download on first start.** Hermes starts `npx -y better-tg-cli@<version> mcp`, pinned to the
  version of this package. npm downloads that package (no runtime dependencies, one bundled file)
  on first start. It runs in this plugin's data folder.
- **Network.** The server talks to Telegram's own servers over MTProto, as any Telegram client
  does. While you log in with a login key it also talks to the project's login service
  (better-tg-cli.com), which exchanges the key for the app's API keys. No analytics, no telemetry.
- **Credentials.** The Telegram session and the app's API hash are the CLI's own, created by
  `onboard`. They are kept in its own items in the macOS Keychain, the Linux Secret Service, Windows
  DPAPI (`%APPDATA%\tg`) or, without any of them, a 0600 file in `~/.config/tg`. The server reads
  only those, never Hermes' secrets or another tool's login. Anyone holding the session controls
  the Telegram account; `telegram logout` ends it.
- **Environment.** `mcp.json` forwards only `DBUS_SESSION_BUS_ADDRESS` and `XDG_RUNTIME_DIR` (needed
  for the Linux Secret Service) and the CLI's own settings `TG_PROFILE`, `TG_READ_ONLY`,
  `TG_LOG_LEVEL`, `TG_FLOOD_WAIT_MAX`, `TG_TRANSPORT`, `TG_NO_UPDATE_CHECK`. The package never
  forwards a credential. If you keep the session in 1Password, define the `telegram` server in
  your own `config.yaml` with `OP_SERVICE_ACCOUNT_TOKEN` in its `env` (a `config.yaml` server
  replaces the package's).
- **Destructive actions.** Delete can remove a message for everyone, and the agent can leave a chat
  or channel. Each one goes through the same approval.
- **Shell commands.** The server runs the bundled CLI as a child process for each tool call. The
  skill also teaches the agent the `telegram` command, if you have it installed and allow Hermes'
  terminal tool.

Privacy policy: https://github.com/TheVilfer/better-tg-cli/blob/main/PRIVACY.md

Not affiliated with or endorsed by Telegram. MIT license, see LICENSE.
