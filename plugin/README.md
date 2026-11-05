# Better-TG-CLI

An unofficial, open-source Telegram client for your own account, packaged for Claude. The plugin
is the `better-tg-cli` skill, which teaches Claude to use the `telegram` command-line tool: read and
search your chats, open threads and forum topics, press bot buttons, and, only if you allow it, send,
edit, react and forward. It contains no code and no MCP server; Claude runs the `telegram` CLI you
install yourself.

Source code, full documentation and releases: https://github.com/TheVilfer/better-tg-cli

## Before you start

Install the CLI, then log in once in your own terminal or through the guided page:

```bash
brew install thevilfer/tap/better-tg-cli    # macOS or Linux; Windows: scoop, or npm with Node 20+
telegram onboard      # opens a local page: get a login key or use your own API keys, scan a QR code
```

Other ways to install are in the README's Install section. If you also want the MCP server in Claude
Code, add it yourself: `claude mcp add telegram -- telegram mcp`.

Claude never sees your login code, 2FA password, login key or session. The session is stored in
the macOS Keychain, the Linux Secret Service, Windows DPAPI or 1Password.

## Safety

- After `telegram onboard` the account is in mode `ask`: before every send, edit or delete, Claude
  shows you the exact action and runs it only after your yes. Writing without asking
  (`telegram write-access on`) has to be confirmed by a person, in a terminal prompt or an OS
  dialog, and can expire (`--for 1h`). Every write is logged locally.
- Login, logout and account transfer need a person at a terminal; the MCP server (if you add it)
  never exposes them.

## Credentials the CLI reads, and where each one goes

The plugin itself reads nothing. The `telegram` CLI it teaches Claude to use reads these from your
machine. Each one goes only to the service it belongs to, and
none is sent anywhere else:

| Credential | Read from | Sent to |
|---|---|---|
| Telegram session and the app's API hash | macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password (without any of them, the 0600 config file) | Telegram's own servers (MTProto), to act as your Telegram client |
| Write mode and the signing key for approvals | the same secret store | nowhere: checked locally before each write |
| 1Password service-account token (`OP_SERVICE_ACCOUNT_TOKEN`, only if you set up 1Password) | the environment | the local `op` CLI, which talks to 1Password |
| Login key (only while you log in with one) | what you paste on the local login page | the project's login service, which returns the app's API keys |

`telegram mcp --http` (remote MCP for Grok Bot and similar) has a bearer token, but it only checks
incoming requests against it on your machine and never sends it out. The skill never asks Claude
for these values, and Claude never sees them.

## Where data goes

The CLI runs on your machine. It connects to:

- Telegram's own servers (MTProto), for everything a Telegram client does;
- the project's login service (`tg-cli-broker.login-c2d.workers.dev`, also `better-tg-cli.com`),
  only when you log in with a login key, to exchange it for the app's API keys;
- `registry.npmjs.org`, once a day and only in an interactive terminal, to check for a newer version
  (turn off with `TG_NO_UPDATE_CHECK=1`).

No analytics. Privacy policy: https://github.com/TheVilfer/better-tg-cli/blob/main/PRIVACY.md

Not affiliated with or endorsed by Telegram. MIT license, see LICENSE.
