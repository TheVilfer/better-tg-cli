# Install script (macOS, Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/TheVilfer/better-tg-cli/main/install.sh | sh
```

`install.sh` installs the standalone `telegram` binary of one stable release. It needs no sudo,
Node, npm, Bun or git, and it never edits shell profiles or installs system packages.

1. It works out the build for this system: `darwin-arm64`, `darwin-x64` (a shell under Rosetta
   gets the arm64 build), `linux-x64` or `linux-arm64`. Linux builds need glibc; musl systems
   such as Alpine are refused.
2. It downloads `SHA256SUMS` of the pinned tag, then the archive listed there: `.tar.xz` when the
   system can unpack it (`xz`, or the macOS `tar`), otherwise `.tar.gz`. Debian and Ubuntu images
   ship `gzip` but not `xz`; releases after v0.39.6 publish both for Linux. Downloads use `curl`
   (HTTPS only, TLS 1.2+) or `wget`, and certificate checks are never turned off.
3. It checks the archive's SHA-256 before unpacking or running anything. Without `sha256sum`,
   `shasum` or `openssl` it stops: nothing is installed unverified.
4. It copies the binary next to the target, runs `--version` on it, and only then renames it into
   place. A binary that does not run here replaces nothing.
5. It writes `install.json` next to the binary.

The pinned version is the `VERSION=` line at the top of the script. `scripts/gen-version.mjs` keeps
it equal to `package.json`, and the script is served from `main`, so it always installs the last
stable release, never a release candidate. Right after a release is merged, its binaries take a
few minutes to appear; until then the script reports `release_not_found`.

## Where it installs

`~/.local/bin/telegram`, or `$TG_INSTALL_DIR/telegram`:

```bash
curl -fsSL https://raw.githubusercontent.com/TheVilfer/better-tg-cli/main/install.sh | TG_INSTALL_DIR="$HOME/.better-tg-cli/bin" sh
```

The script owns a path only through its `install.json`: a `telegram` there counts as ours when
the `install.json` beside it has `"package":"better-tg-cli"`, `"manager":"user-binary"` and that
exact `path`. Anything else (a file from another tool, a symlink, a directory, an `install.json`
of something else) is left alone, and the script stops with `install_path_taken` and exit code 2.
Running the script again over its own install replaces it.

```json
{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":"/home/me/.local/bin/telegram","version":"0.39.6","tag":"v0.39.6","target":"linux-x64","archive":"better-tg-cli-0.39.6-linux-x64.tar.gz","sha256":"…","installedAt":"2026-11-19T12:00:00Z"}
```

## Output

Progress goes to stderr. Stdout gets exactly one JSON line in the shape of the setup contract
(`schema: 1`, `ok`, `problems[]` with `id`, `severity`, `message` and a `fix` that is either
`{human, url?}` or `{unavailable}`), plus the install itself:

```json
{"schema":1,"ok":true,"problems":[{"id":"install_dir_not_on_path","severity":"warning","message":"…","fix":{"human":"…"}}],
 "install":{"manager":"user-binary","version":"0.39.6","tag":"v0.39.6","target":"linux-x64","dir":"/home/me/.local/bin","path":"/home/me/.local/bin/telegram","onPath":false,"active":null}}
```

- `path` is the absolute path of the installed binary, set only when `ok` is true.
- `onPath: false` means the folder is not on `PATH`. Run every later command by `path` (for
  example `/home/me/.local/bin/telegram onboard`); adding the folder to `PATH` is up to you.
- `active` is the `telegram` a bare `telegram` runs right now (`null` when there is none).

Exit codes: 0 installed (warnings may be present), 1 error, 2 a human is needed. The script never
emits `fix.run`.

| `id` | Exit | Meaning |
|---|---|---|
| `platform_unsupported` | 1 | No release build for this system or CPU (Windows, FreeBSD, 32-bit, musl). |
| `install_dir_invalid` | 2 | The folder cannot be created or written; pick another `TG_INSTALL_DIR`. |
| `install_path_taken` | 2 | Something not installed by this script is there; it stays untouched. |
| `downloader_missing` | 1 | Neither `curl` nor `wget`. |
| `checksum_tool_missing` | 1 | Neither `sha256sum`, `shasum` nor `openssl`. |
| `tls_failed` | 1 | The HTTPS certificate could not be verified (no CA certificates, or a TLS-intercepting proxy). |
| `release_not_found` | 1 | The pinned release is not published yet. |
| `download_failed` | 1 | Any other download error. |
| `archive_not_listed` | 1 | `SHA256SUMS` lists no archive for this build. |
| `unpack_tool_missing` | 1 | Only `.tar.xz` is published and the system cannot unpack it. |
| `checksum_mismatch` | 1 | The archive does not match `SHA256SUMS`; nothing was unpacked. |
| `unpack_failed`, `install_write_failed` | 1 | Unpacking or writing failed (space, permissions). |
| `binary_check_failed` | 1 | The new binary does not run here or reports another version; nothing was replaced. |
| `install_dir_not_on_path` | 0 | Warning: run the binary by its absolute path. |
| `other_telegram_on_path` | 0 | Warning: other `telegram` copies are on `PATH`, maybe ahead of this one. |

The sums come from the same release as the archive, so they prove the download is intact, not
who published it.

## Moving from the old `install.sh`

Up to v0.39.6, `install.sh` was a developer script: it cloned the repository into
`~/.agents/skills/telegram`, built it with Node and Bun, ran `npm install -g` from that checkout
and linked the skill into `~/.claude/skills` and `~/.codex/skills`. It now lives in
`scripts/dev-install.sh` and still does exactly that, for people who work on the code.

To switch an old install to the release binary:

1. Remove the global npm link: `npm rm -g better-tg-cli` (on very old installs also
   `npm rm -g better-telegram-cli @skillhq/telegram`).
2. Run the install script above.
3. Check that exactly one `telegram` is left: `which -a telegram` (or `type -a telegram`) should
   print only the new path, and the script's JSON should have no `other_telegram_on_path`.
4. The skill links point into the old checkout. Keep them if you keep the checkout, or remove them
   and run `telegram skill install`, which copies the skill bundled in the binary.

Your login, profiles, write mode and MCP tokens live in `~/.config/tg` and the system keychain, not
in the binary, so they keep working.

`telegram update` does not upgrade this install yet; for now run the script again.
