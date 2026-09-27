# Development

Needs Node >= 20, [Bun](https://bun.sh) and `npm install`.

## Running from source

`scripts/tg-dev <args>` (or `npm run dev -- <args>`) runs `src/index.ts` with Bun. There is no build
step and startup takes about 0.3 s. It never writes `dist/`. That matters because an installed
`telegram` that points at this checkout runs `dist/telegram.mjs` live, and agents use it.

```bash
scripts/tg-dev check                        # profile "dev"
scripts/tg-dev read me -n 5 --json
TG_PROFILE= scripts/tg-dev inbox            # your real account (the default profile)
TG_LOG_LEVEL=debug scripts/tg-dev check     # MTProto log on stderr (none|error|warn|info|debug)
```

To put it on PATH, run `ln -s "$PWD/scripts/tg-dev" /opt/homebrew/bin/tg-dev`.

## Profiles: keep dev away from your real session

`TG_PROFILE=<name>` gives each profile its own state:

| State | Default profile | `TG_PROFILE=dev` |
|---|---|---|
| Config, audit log, update cache | `~/.config/tg/` | `~/.config/tg-dev/` |
| Keychain service (session, api_hash, write access) | `tg-cli` | `tg-cli-dev` |
| 1Password items | `tg-cli-<key>` | `tg-cli-dev-<key>` |

`scripts/tg-dev` and every `npm run dev*` script default to `dev`. An empty `TG_PROFILE=` means the
default profile.

A profile starts logged out and read-only. Log in with `scripts/tg-dev auth`. Writing needs
`scripts/tg-dev write-access on --for 1h`, which a human confirms, exactly as in production. On
purpose, there is no way to skip that.

A dev profile can use:
- **A second account (recommended).** Log in with any other number. Writes land on that account
  and cannot touch your real chats.
- **Telegram's test servers.** Run `scripts/tg-dev auth --test-dc`. The flag is saved in the
  profile, and `check` prints `Servers: TEST`. Since mid-2025 the `99966XYYYY` test numbers with
  code `XXXXX` from the docs have been rejected with `PHONE_CODE_INVALID` for ordinary apps (see
  [tdlib#3361](https://github.com/tdlib/td/issues/3361)). Instead, create the test account with a
  real number in an official mobile app's hidden test mode first (the maintainer's advice in that
  thread). On iOS this reportedly means tapping the Settings tab about 10 times, then Accounts →
  Login to another account → Test. After that, the code arrives in that app.
- **Your real account, read-only.** This is the default profile plus the write guard. It is good for
  debugging reads, because you get real data.

## Debugging

- **Cursor / VS Code**: open Run and Debug.
  - *CLI: telegram \<args\>* asks for the arguments and runs `src/` through tsx under Node, with
    breakpoints in `.ts` and the dev profile.
  - *…MTProto debug log* is the same with `TG_LOG_LEVEL=debug`.
  - *Tests: current file* runs vitest on the open file.
  - *Attach* attaches to `npm run dev:debug -- <args>` on port 9229 (it runs `tsx --inspect-brk`).

  The built-in debugger can't attach to Bun, which is why these entries use Node and tsx.
- `bun --inspect-wait src/index.ts <args>` gives a debug.bun.sh URL, if you prefer Bun's inspector.
- teleproto logs go to stderr only, so `--json` output stays parseable at any `TG_LOG_LEVEL`.

## Checks

```bash
npm test                # vitest, offline (no session, no network)
npm run test:watch
npm run typecheck       # or typecheck:watch
npm run dev:dist -- check   # build the real bundle and run it (dev profile)
```

Source mode skips the bundle's shrink plugin (TL re-encoding, stubs). Run `npm run dev:dist` or
`npm run build && npm test` before a release. `test/bundle-shrink.test.ts` and
`test/sync-and-cli.test.ts` cover the bundle.

Releasing is described in `CLAUDE.md` (`scripts/release.sh patch|minor|major`).
