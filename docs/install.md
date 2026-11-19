# Install script (macOS, Linux)

```bash
curl -q --proto '=https' --tlsv1.2 -fsSL https://github.com/TheVilfer/better-tg-cli/releases/latest/download/install.sh | sh
```

In a script or an agent, download it to a file first and run it only when `curl` succeeded. A
pipe hides a failed download: `sh` gets nothing (or half a script) and exits 0 with no output.

```sh
out=$(
  f=$(mktemp) || exit 1
  curl -q --proto '=https' --tlsv1.2 -fsSL -o "$f" https://github.com/TheVilfer/better-tg-cli/releases/latest/download/install.sh &&
    sh "$f"
  status=$?
  rm -f "$f"
  exit "$status"
)
status=$?
case "$status:$out" in
  '0:{"schema":1,"ok":true,'*) echo "installed: $out" ;;   # now read data.path from $out
  *) echo "not installed (exit $status): $out" >&2 ;;
esac
```

The subshell keeps the exit code of `curl` or `sh` past the cleanup. Installed means exit code 0
**and** `"ok":true` in the one JSON line on stdout (see [Output](#output)); only then use
`data.path`. No JSON line at all means the script did not run to the end, so nothing is installed.
`-q` keeps `~/.curlrc` from changing these options; `--proto '=https'` keeps every redirect on HTTPS.

`install.sh` installs the standalone `telegram` binary of one stable release. It needs no sudo,
Node, npm, Bun or git, and it never edits shell profiles or installs system packages.

1. It works out the build for this system: `darwin-arm64`, `darwin-x64` (a shell under Rosetta
   gets the arm64 build), `linux-x64` or `linux-arm64`. Linux builds need glibc; musl systems
   such as Alpine are refused.
2. It downloads `SHA256SUMS` of the pinned tag, then the archive listed there: `.tar.xz` when the
   system can unpack it (`xz`, or the macOS `tar`), otherwise `.tar.gz`. Debian and Ubuntu images
   ship `gzip` but not `xz`; releases after v0.39.6 publish both for Linux. Downloads use `curl`
   only (HTTPS only on every redirect, TLS 1.2+, `~/.curlrc` ignored). `wget` is not used: it
   cannot be told to refuse a redirect off HTTPS before following it. Certificate checks are
   never turned off.
3. It checks the archive's SHA-256 before unpacking or running anything. Without `sha256sum`,
   `shasum` or `openssl` it stops: nothing is installed unverified.
4. It copies the binary into a private staging folder next to the target and runs `--version` on
   it: the output must be exactly the pinned version and the exit status 0. Only then it moves the
   binary into place. A binary that does not run here replaces nothing.
5. It writes `install.json` next to the binary.

The pinned version is the `VERSION=` line at the top of the script. `scripts/gen-version.mjs` keeps
it equal to `package.json`. The release workflow puts `install.sh` into each stable GitHub
Release in the same call that uploads its archives and `SHA256SUMS` and publishes it, and GitHub points
`releases/latest/download/` at the newest stable release only. So the URL above always serves a
script whose binaries exist, never a release candidate. Each release's own copy stays at
`releases/download/vX.Y.Z/install.sh` for an exact version.

## Where it installs

`~/.local/bin/telegram`, or `$TG_INSTALL_DIR/telegram`:

```bash
curl -q --proto '=https' --tlsv1.2 -fsSL https://github.com/TheVilfer/better-tg-cli/releases/latest/download/install.sh | TG_INSTALL_DIR="$HOME/.better-tg-cli/bin" sh
```

The script owns a path only through its `install.json`: a `telegram` there counts as ours when
the `install.json` beside it is exactly the one line this script writes (below): the same field
order, `"schema":1,"package":"better-tg-cli","manager":"user-binary"` and that exact `path`, and a
well-formed value in every other field (`version`, `tag`, `target`, `archive`, a 64-digit
`sha256`, `installedAt`), with nothing after the line. Anything
else (a file from another tool, a symlink, a directory, an `install.json` of something else, a
record nested inside another file, a cut-off or edited manifest) is left alone, and the script
stops with `install_path_taken` and exit code 2. A `telegram` that shows up while the script is
downloading is not written over either. Running the script again over its own install replaces it.

One run at a time installs into a folder. The lock is the file `.better-tg-cli.lock`, holding one
line `pid=<pid> stage=<staging folder>` and created with a hard link, so it never exists without
its owner. A second run stops with `install_in_progress`. A run that was killed leaves a lock
with a dead PID: the next run takes it over (a second file, `.better-tg-cli.lock.takeover`, lets
only one run do that), removes the files it writes from the one staging folder that lock names,
and writes both files again. A lock in any other form, or a takeover file left by a killed run,
is never deleted: the script stops with `install_lock_unknown` and exit code 2. The script removes
only what it created itself.

Files are placed with hard links, which fail when the name is taken, so the target folder must be
on a file system that supports them (any local disk does); otherwise the script stops with
`hard_links_unavailable`. An upgrade moves the binary in first and `install.json` second, so a run killed between
the two leaves a manifest that names the older version (and an older `sha256`), never one that
claims more than is installed. Running the script again fixes it.

```json
{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":"/home/me/.local/bin/telegram","version":"0.39.6","tag":"v0.39.6","target":"linux-x64","archive":"better-tg-cli-0.39.6-linux-x64.tar.gz","sha256":"…","installedAt":"2026-11-19T12:00:00Z"}
```

## Output

Progress goes to stderr. Stdout gets exactly one JSON line in the shape of the setup contract
(`schema: 1`, `ok`, `problems[]` with `id`, `severity`, `message` and a `fix` that is either
`{human, url?}` or `{unavailable}`), plus the contract's optional `data` object with the install
itself:

```json
{"schema":1,"ok":true,"problems":[{"id":"install_dir_not_on_path","severity":"warning","message":"…","fix":{"human":"…"}}],
 "data":{"manager":"user-binary","version":"0.39.6","tag":"v0.39.6","target":"linux-x64","dir":"/home/me/.local/bin","path":"/home/me/.local/bin/telegram","onPath":false,"active":null}}
```

- `path` is the absolute path of the installed binary, set only when `ok` is true.
- `onPath: false` means the folder is not on `PATH`. Run every later command by `path` (for
  example `/home/me/.local/bin/telegram onboard`); adding the folder to `PATH` is up to you.
- `active` is the `telegram` a bare `telegram` runs right now (`null` when there is none).

Exit codes: 0 installed (warnings may be present), 1 error, 2 a human is needed. The script never
emits `fix.run`. No JSON line means the script itself did not arrive or run to the end (the whole
script is one block opened on its second line, so a cut-off copy is a syntax error and runs
nothing; only a copy cut inside the first line, `#!/bin/sh`, still exits 0, with no output).

| `id` | Exit | Meaning |
|---|---|---|
| `platform_unsupported` | 1 | No release build for this system or CPU (Windows, FreeBSD, 32-bit, musl). |
| `old_installer_variable` | 2 | `TG_SKILL_DIR` is set: that belongs to the old developer installer, now `scripts/dev-install.sh`. Nothing is changed. |
| `install_dir_invalid` | 2 | The folder cannot be created or written; pick another `TG_INSTALL_DIR`. |
| `install_path_taken` | 2 | Something not installed by this script is there; it stays untouched. |
| `install_in_progress` | 1 | Another run is installing into the same folder right now. |
| `install_lock_unknown` | 2 | The lock (or takeover) file is not one this script wrote, or a takeover was killed; it is left as is. |
| `hard_links_unavailable` | 1 | The folder's file system has no hard links; pick a `TG_INSTALL_DIR` on a local disk. |
| `downloader_missing` | 1 | No `curl` (`wget` is not used). |
| `checksum_tool_missing` | 1 | Neither `sha256sum`, `shasum` nor `openssl`. |
| `tls_failed` | 1 | The HTTPS certificate could not be verified (no CA certificates, or a TLS-intercepting proxy). |
| `release_not_found` | 1 | The pinned release is not published yet. |
| `download_failed` | 1 | Any other download error. |
| `archive_not_listed` | 1 | `SHA256SUMS` lists no archive for this build. |
| `unpack_tool_missing` | 1 | Only `.tar.xz` is published and the system cannot unpack it. |
| `checksum_mismatch` | 1 | The archive does not match `SHA256SUMS`; nothing was unpacked. |
| `unpack_failed`, `install_write_failed` | 1 | Unpacking or writing failed (space, permissions). |
| `binary_check_failed` | 1 | The new binary does not run here or reports another version; nothing was replaced. |
| `dev_install_found` | 0 | Warning: a checkout from the old installer is in `~/.agents/skills/telegram`; it is left as is. |
| `install_dir_not_on_path` | 0 | Warning: run the binary by its absolute path. |
| `other_telegram_on_path` | 0 | Warning: other `telegram` copies are on `PATH`, maybe ahead of this one. |

The sums come from the same release as the archive, so they prove the download is intact, not
who published it.

## Moving from the old `install.sh`

Up to v0.39.6, `install.sh` was a developer script: it cloned the repository into
`~/.agents/skills/telegram`, built it with Node and Bun, ran `npm install -g` from that checkout
and linked the skill into `~/.claude/skills` and `~/.codex/skills`. It now lives in
`scripts/dev-install.sh` and still does exactly that, for people who work on the code.

The new script ignores that layout. With `TG_SKILL_DIR` set it stops (`old_installer_variable`)
and changes nothing; it reports a checkout it finds in `~/.agents/skills/telegram`
(`dev_install_found`) and leaves it alone. To keep the developer install up to date, first update
the checkout (`git -C ~/.agents/skills/telegram pull`): a checkout from before this change has no
`scripts/dev-install.sh` yet. Then run `scripts/dev-install.sh` from it.

To switch an old install to the release binary, keep the old `telegram` until the new one works:

1. Run the install script above (without `TG_SKILL_DIR`). It installs next to the old copy and
   warns with `other_telegram_on_path`.
2. Check the new binary by the `data.path` from its JSON: `"$path" --version` prints the release
   version.
3. Only then remove the global npm link: `npm rm -g better-tg-cli` (on very old installs also
   `npm rm -g better-telegram-cli @skillhq/telegram`).
4. Check that exactly one `telegram` is left: `which -a telegram` (or `type -a telegram`) should
   print only the new path. Running the script again should report no `other_telegram_on_path`.
5. The skill links point into the old checkout. Keep them if you keep the checkout, or remove them
   and run `telegram skill install`, which copies the skill bundled in the binary.

Your login, profiles, write mode and MCP tokens live in `~/.config/tg` and the system keychain, not
in the binary, so they keep working.

`telegram update` does not upgrade this install yet; for now run the script again.
