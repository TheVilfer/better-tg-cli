# Install script (macOS, Linux)

**Threat model.** The install folder belongs to the user who runs the script. The installer protects
against mistakes (a telegram that is not ours, our own runs at the same time, a run killed halfway,
a cut-off download), not against another process or user that can write into that folder: such a
process can already replace the binary at any time. Two things follow and are out of scope on
purpose: a folder shared by several users (UIDs), and files crafted to fool the shell's byte
comparisons, such as a NUL byte in `install.json`, the lock or the `--version` output.

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
  *)
    echo "not installed (exit $status): $out" >&2   # empty $out: unknown, see below
    [ "$status" != 0 ] || status=1   # exit 0 without "ok":true is still a failure
    exit "$status"
    ;;
esac
```

The subshell keeps the exit code of `curl` or `sh` past the cleanup, and the failure branch exits
with it (or with 1 when it was 0 but the output was not `"ok":true`). Installed means exit code 0
**and** `"ok":true` in the one JSON line on stdout (see [Output](#output)); only then use
`data.path`. No JSON line at all means the script did not run to the end, and the result is
unknown: a run cut short after placing the binary (killed, the terminal closed) leaves it on disk
without printing anything. Treat it as not installed, or check by hand: the expected path is
`$TG_INSTALL_DIR/telegram` (default `~/.local/bin/telegram`), and it is a finished install only when
`install.json` next to it names that path and its `binarySha256` is the SHA-256 of that file
(`sha256sum`, or `shasum -a 256`, of the binary). Running the script again is safe: it either
finishes with the JSON line or refuses and says why, and it never overwrites a file it cannot prove
is its own.
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
5. It writes `install.json` next to the binary, with the SHA-256 of the archive (`sha256`) and of
   the binary itself (`binarySha256`).

The pinned version is the `VERSION=` line at the top of the script; `scripts/gen-version.mjs` keeps
it equal to `package.json`. The release workflow attaches `install.sh` to each stable GitHub
Release in the same call that uploads its archives and `SHA256SUMS`, and GitHub points
`releases/latest/download/` at the newest stable release only, so the URL above always serves a
script whose binaries exist, never a release candidate. Each release's own copy stays at
`releases/download/vX.Y.Z/install.sh` for an exact version.

## Where it installs

`~/.local/bin/telegram`, or `$TG_INSTALL_DIR/telegram`:

```bash
curl -q --proto '=https' --tlsv1.2 -fsSL https://github.com/TheVilfer/better-tg-cli/releases/latest/download/install.sh | TG_INSTALL_DIR="$HOME/.better-tg-cli/bin" sh
```

The script owns a path only through its `install.json`: a `telegram` counts as ours when the
`install.json` beside it is exactly the one line this script writes (below), with the same field
order, `"schema":1,"package":"better-tg-cli","manager":"user-binary"`, that exact `path`, a
well-formed value in every other field and nothing after the line. The fields must agree: `tag` is
`v` plus `version`, and `archive` is `better-tg-cli-<version>-<target>.tar.xz` (or `.tar.gz`).
Anything else (a file from another tool, a symlink, a directory, a record nested in another file,
a cut-off or edited manifest) is left alone, and the script stops with `install_path_taken` and
exit code 2. The `telegram` in place must also hash to `binarySha256`, checked before anything is
downloaded and again right before an upgrade replaces it, so another file copied over it is refused
the same way. A `telegram` that shows up while the script is downloading is not written over
either. Running the script again over its own install replaces it.

One run at a time installs into a folder. The lock is the file `.better-tg-cli.lock`, holding one
line `pid=<pid> stage=<staging folder>` and created with a hard link, so it never exists without
its owner. A second run stops with `install_in_progress`. A killed run leaves its lock behind with
a PID that is no longer running; the script never takes such a lock over but stops with
`install_lock_stale` and exit code 2: if no install is running, delete the lock it names and run
again. A lock in any other form stops it with `install_lock_unknown`. A killed run also leaves its
staging folder (`.better-tg-cli.stage.*`); later runs name it in an `install_stage_left` warning
(when its own lock line names a PID that is not running) and never delete it. The script removes
only what it created itself.

Files are placed with hard links, which fail when the name is taken, so the target folder must be
on a file system that supports them (any local disk does); otherwise the script stops with
`hard_links_unavailable`. An upgrade moves the binary in first and `install.json` second, so a run
killed between the two leaves a manifest that names the older version, never one that claims more
than is installed. Its `binarySha256` no longer matches the new binary, so once that run's lock is
deleted, the next run stops with `install_path_taken` and keeps both files. If you know no other
program wrote that `telegram`, delete it and run the script again: the manifest still owns the
path, so it installs and records both sums anew. Right before replacing the binary, an upgrade also
checks that it is still the regular file it checked before downloading (same inode, size and
modification time as `ls` prints it, to the minute). That narrows, not closes, a race with another
writer into the folder, which is outside the threat model.

```json
{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":"/home/me/.local/bin/telegram","version":"0.39.6","tag":"v0.39.6","target":"linux-x64","archive":"better-tg-cli-0.39.6-linux-x64.tar.gz","sha256":"…","binarySha256":"…","installedAt":"2026-11-19T12:00:00Z"}
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
nothing; only a copy cut inside the first line, `#!/bin/sh`, still exits 0, with no output). A run
killed later may already have placed the binary, so no JSON line is an unknown result, not a
proof that nothing was installed; the check by hand is described at the top of this page.

| `id` | Exit | Meaning |
|---|---|---|
| `platform_unsupported` | 1 | No release build for this system or CPU (Windows, FreeBSD, 32-bit, musl). |
| `old_installer_variable` | 2 | `TG_SKILL_DIR` is set: that belongs to the old developer installer, now `scripts/dev-install.sh`. Nothing is changed. |
| `install_dir_invalid` | 2 | The folder cannot be created or written; pick another `TG_INSTALL_DIR`. |
| `install_path_taken` | 2 | Something not installed by this script is there, or a `telegram` whose SHA-256 is not the `binarySha256` in `install.json`; it stays untouched. |
| `install_in_progress` | 1 | Another run is installing into the same folder right now. |
| `install_lock_stale` | 2 | A run that was cut short left its lock (its PID is not running); delete that lock and run again. |
| `install_lock_unknown` | 2 | The lock file is not one this script wrote; it is left as is. |
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
| `install_stage_left` | 0 | Warning: staging folders of runs that were cut short are in the folder; they are not deleted. |
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
