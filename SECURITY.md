# Security

This CLI holds a full-access Telegram session for your account. Please report vulnerabilities
privately through [GitHub Security Advisories](https://github.com/TheVilfer/better-tg-cli/security/advisories/new),
not in public issues.

## What the CLI protects

- **Secrets:** the session, api_hash and write-access flag are kept in the macOS Keychain (service
  `tg-cli`) or in 1Password, not in the config file. Only on Linux without 1Password does the
  config file (mode 0600) hold them, and then writes stay disabled.
- **Writes:** off by default. `write-access on` requires a human to confirm it, in a terminal prompt
  or a macOS dialog, and can expire (`--for 1h`). Every write is appended to
  `~/.config/tg/audit.jsonl`.
- **Invites:** the broker hands out the app's `api_hash` for a single login. It is not stored
  locally. Tokens are stored hashed, limited in uses and revocable.

## Known limits

- Any process running as your macOS user can read the Keychain item through `/usr/bin/security`,
  and so could read the session or set the write flag. The guard stops agents from doing this by
  accident; it is not a sandbox against malicious code running as you.
- An agent with shell access can run any command you can. Grant write access for short windows.
