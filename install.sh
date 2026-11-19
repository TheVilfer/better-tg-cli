#!/bin/sh
{
# The whole script is one { } block, opened on the line right after the shebang: a download cut
# short anywhere after it is a syntax error, never a partial run.
#
# Better-TG-CLI installer for macOS and Linux: one standalone `telegram` binary from a release.
# No sudo, Node, git or shell-profile edits.
#
#   curl -q --proto '=https' --tlsv1.2 -fsSL https://github.com/TheVilfer/better-tg-cli/releases/latest/download/install.sh | sh
#
# Scripts and agents: download it to a file first and run it only when curl exited 0 (docs/install.md).
#
# What it does: downloads SHA256SUMS and the archive of one pinned stable release (VERSION below),
# checks the archive's sum before unpacking or running anything, installs `telegram` into
# ~/.local/bin (or $TG_INSTALL_DIR) and writes install.json next to it. A `telegram` there that this
# script did not install is never overwritten.
#
# Output: one JSON object on stdout (setup contract, schema 1); progress goes to stderr.
#   {"schema":1,"ok":true,"problems":[],"data":{"path":"/abs/telegram","onPath":false,...}}
# When onPath is false, run the CLI by that absolute path. No JSON line at all means it failed.
# Exit codes: 0 installed, 1 error, 2 a human is needed (for example the path is taken).
#
# Environment: TG_INSTALL_DIR  folder for the binary (default ~/.local/bin)
# Developer install from a git checkout: scripts/dev-install.sh

# The pinned release. Set by scripts/gen-version.mjs from package.json; do not edit.
VERSION='0.39.6'
REPO='TheVilfer/better-tg-cli'

TAG="v$VERSION"
BASE="https://github.com/$REPO/releases/download/$TAG"
RELEASES="https://github.com/$REPO/releases/tag/$TAG"
DOCS="https://github.com/$REPO/blob/main/docs/install.md"

PROBLEMS=''
TARGET=''
DIR=''
BIN=''
ON_PATH=''
ACTIVE=''
TMP=''
STAGE_DIR=''
LOCK=''
MUTEX=''
LOCK_LINE=''

log() { printf '  %s\n' "$*" >&2; }
has() { command -v "$1" >/dev/null 2>&1; }

# A JSON string literal on one line: control characters become spaces (install paths with them
# are refused before they get here, so a path is always written exactly)
json_str() {
  printf '"%s"' "$(printf '%s' "$1" | tr '\n\r\t' '   ' | LC_ALL=C tr -d '\000-\037' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
}
json_or_null() { if [ -n "$1" ]; then json_str "$1"; else printf 'null'; fi; }

fix_human() { printf '{"human":%s' "$(json_str "$1")"; [ -n "$2" ] && printf ',"url":%s' "$(json_str "$2")"; printf '}'; }
fix_unavailable() { printf '{"unavailable":%s}' "$(json_str "$1")"; }

# add_problem <id> <error|warning> <message> <fix JSON>
add_problem() {
  p=$(printf '{"id":%s,"severity":%s,"message":%s,"fix":%s}' "$(json_str "$1")" "$(json_str "$2")" "$(json_str "$3")" "$4")
  if [ -n "$PROBLEMS" ]; then PROBLEMS="$PROBLEMS,$p"; else PROBLEMS="$p"; fi
}

# finish <ok:true|false> <exit code>
finish() {
  on=null
  [ "$ON_PATH" = 1 ] && on=true
  [ "$ON_PATH" = 0 ] && on=false
  # path is set only once telegram is in place, so a failed run never points at it
  installed="$BIN"
  [ "$1" = true ] || installed=''

  printf '{"schema":1,"ok":%s,"problems":[%s],"data":{"manager":"user-binary","version":%s,"tag":%s,"target":%s,"dir":%s,"path":%s,"onPath":%s,"active":%s}}\n' \
    "$1" "$PROBLEMS" "$(json_str "$VERSION")" "$(json_str "$TAG")" "$(json_or_null "$TARGET")" \
    "$(json_or_null "$DIR")" "$(json_or_null "$installed")" "$on" "$(json_or_null "$ACTIVE")"
  exit "$2"
}

# fail <id> <message> <fix JSON>: exit 2 when the fix is for a human, 1 otherwise
fail() {
  add_problem "$1" error "$2" "$3"
  log "error: $2"
  case "$3" in '{"human"'*) finish false 2 ;; *) finish false 1 ;; esac
}

# Removes only what this run created: its own mktemp folder, the fixed file names it writes into
# its staging folder, and the lock files that still hold its own line. Runs twice on INT/TERM.
cleanup() {
  [ -n "$TMP" ] && rm -rf "$TMP"
  [ -n "$STAGE_DIR" ] && clear_stage "$STAGE_DIR"
  release_lock "$MUTEX"
  release_lock "$LOCK"
  TMP=''; STAGE_DIR=''; MUTEX=''; LOCK=''
}

# The old install.sh (now scripts/dev-install.sh) took TG_SKILL_DIR and installed from a git
# checkout. This script does something else, so an old invocation stops before writing anything.
check_old_installer() {
  if [ -n "${TG_SKILL_DIR:-}" ]; then
    fail old_installer_variable "TG_SKILL_DIR is set, but this script no longer installs from a git checkout; nothing was changed." \
      "$(fix_human "For the developer install (checkout, npm link, skill links) run scripts/dev-install.sh from the checkout. To switch to the release binary, unset TG_SKILL_DIR and follow 'Moving from the old install.sh'." "$DOCS")"
  fi
  old="${HOME:-}/.agents/skills/telegram"
  if [ -n "${HOME:-}" ] && [ -d "$old/.git" ] && [ -f "$old/package.json" ] &&
    grep -qE '"name": *"(better-tg-cli|better-telegram-cli|@skillhq/telegram)"' "$old/package.json" 2>/dev/null; then
    add_problem dev_install_found warning "A developer install from the old install.sh is in $old: its checkout, npm link and skill links stay on their version." \
      "$(fix_human "To update that install, first update the checkout (git -C $old pull), then run $old/scripts/dev-install.sh; a checkout that was not updated has no such script yet. To keep only this binary, follow 'Moving from the old install.sh'." "$DOCS")"
    log "found a developer install in $old; it is left as is (see $DOCS)"
  fi
}

detect_target() {
  os=$(uname -s 2>/dev/null)
  arch=$(uname -m 2>/dev/null)
  case "$os" in
    Darwin) os=darwin ;;
    Linux) os=linux ;;
    MINGW* | MSYS* | CYGWIN* | Windows*)
      fail platform_unsupported "This script is for macOS and Linux; on Windows install with Scoop or npm." \
        "$(fix_unavailable "Windows: scoop install better-tg-cli (bucket https://github.com/TheVilfer/scoop-bucket), or npm install -g better-tg-cli with Node 20+.")" ;;
    *)
      fail platform_unsupported "No release binary for the system '$os'." \
        "$(fix_unavailable "Release binaries exist for macOS and Linux (x64, arm64). Elsewhere: npm install -g better-tg-cli with Node 20+.")" ;;
  esac
  case "$arch" in
    x86_64 | amd64) arch=x64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *)
      fail platform_unsupported "No release binary for the CPU '$arch' on $os." \
        "$(fix_unavailable "Release binaries exist for x64 and arm64 only. Elsewhere: npm install -g better-tg-cli with Node 20+.")" ;;
  esac
  # A shell under Rosetta reports x86_64 on Apple silicon: take the native build
  if [ "$os" = darwin ] && [ "$arch" = x64 ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = 1 ]; then
    arch=arm64
  fi
  # The Linux builds link against glibc; Alpine and other musl systems cannot run them
  if [ "$os" = linux ]; then
    case "$arch" in x64) glibc=/lib64/ld-linux-x86-64.so.2 ;; *) glibc=/lib/ld-linux-aarch64.so.1 ;; esac
    if [ ! -e "$glibc" ] && ls /lib/ld-musl-* >/dev/null 2>&1; then
      fail platform_unsupported "This Linux uses musl libc (Alpine?); the release binaries need glibc." \
        "$(fix_unavailable "No musl build is published. Use npm install -g better-tg-cli with Node 20+, or a glibc-based system.")"
    fi
  fi
  TARGET="$os-$arch"
}

# Sets DIR (absolute, symlinks resolved) and BIN
resolve_dir() {
  dir="${TG_INSTALL_DIR:-}"
  if [ -z "$dir" ]; then
    [ -n "${HOME:-}" ] || fail install_dir_invalid "HOME is not set, so there is no default install folder." \
      "$(fix_human "Set TG_INSTALL_DIR to a folder you own and run the script again.")"
    dir="$HOME/.local/bin"
  fi
  case "$dir" in *'
'*) bad=1 ;; *) printf '%s' "$dir" | LC_ALL=C grep -q '[[:cntrl:]]' && bad=1 || bad=0 ;; esac
  [ "$bad" = 0 ] || fail install_dir_invalid "The install folder name contains a line break or another control character." \
    "$(fix_human "Set TG_INSTALL_DIR to a plain folder path.")"
  if ! mkdir -p "$dir" 2>/dev/null || ! abs=$(cd "$dir" 2>/dev/null && pwd -P); then
    fail install_dir_invalid "Cannot create or open the folder $dir." \
      "$(fix_human "Set TG_INSTALL_DIR to a folder you can write to (no sudo needed), for example TG_INSTALL_DIR=\$HOME/.better-tg-cli/bin.")"
  fi
  [ -w "$abs" ] || fail install_dir_invalid "The folder $abs is not writable." \
    "$(fix_human "Set TG_INSTALL_DIR to a folder you can write to (no sudo needed), for example TG_INSTALL_DIR=\$HOME/.better-tg-cli/bin.")"
  DIR="$abs"
  BIN="$DIR/telegram"
}

# A private staging folder next to the target (same file system, so the final steps are renames
# or hard links). Its name goes into the lock, so a later run knows exactly what to clear.
make_stage() {
  STAGE_DIR=$(mktemp -d "$DIR/.better-tg-cli.stage.XXXXXX" 2>/dev/null) || STAGE_DIR=''
  [ -n "$STAGE_DIR" ] && [ -d "$STAGE_DIR" ] && [ ! -L "$STAGE_DIR" ] ||
    fail install_write_failed "Cannot create a staging folder in $DIR." "$(fix_unavailable "Check free space and permissions of $DIR.")"
  LOCK_LINE="pid=$$ stage=${STAGE_DIR##*/}"
  printf '%s\n' "$LOCK_LINE" >"$STAGE_DIR/lock" ||
    fail install_write_failed "Cannot write into $DIR." "$(fix_unavailable "Check free space and permissions of $DIR.")"
  # Files are placed only with hard links: prove once that this file system has them, so a failed
  # ln later can only mean the name is taken
  if ln "$STAGE_DIR/lock" "$STAGE_DIR/probe" 2>/dev/null; then rm -f "$STAGE_DIR/probe"; else
    fail hard_links_unavailable "The file system of $DIR does not support hard links, which this script needs to place files without overwriting anything." \
      "$(fix_unavailable "Install onto another file system: set TG_INSTALL_DIR to a folder in your home directory on a local disk.")"
  fi
}

# clear_stage <dir>: the files this script writes into a staging folder, then the folder itself.
# A folder holding anything else stays.
clear_stage() {
  [ -d "$1" ] && [ ! -L "$1" ] || return 0
  rm -f "$1/telegram" "$1/install.json" "$1/lock" "$1/probe" "$1/version"
  rmdir "$1" 2>/dev/null || log "left $1 in place: it holds files this script did not write"
}

# is_line <file> <text>: the file holds exactly <text> and one line break ($(...) alone would drop
# trailing blank lines; the x keeps them)
is_line() {
  [ "$(cat "$1" 2>/dev/null; printf x)" = "$2
x" ]
}

gone() { [ ! -e "$1" ] && [ ! -L "$1" ]; }

# read_lock <file>: prints the owner line of a lock this script wrote, or fails for anything else
# (a folder, a symlink, another format, more than that one line)
read_lock() {
  [ -f "$1" ] && [ ! -L "$1" ] || return 1
  IFS= read -r l <"$1" || return 1
  is_line "$1" "$l" || return 1
  printf '%s\n' "$l" | LC_ALL=C grep -Eqx 'pid=[1-9][0-9]* stage=\.better-tg-cli\.stage\.[A-Za-z0-9]+' || return 1
  printf '%s' "$l"
}

# owner_of <file>: sets OWNER to its owner line. 1 when the file is gone (released meanwhile);
# a file that is there but not ours stops the run.
owner_of() {
  for _ in 1 2; do
    OWNER=$(read_lock "$1") && return 0
    gone "$1" && return 1
  done
  BIN=''
  fail install_lock_unknown "$1 is not a lock this script wrote; it is left as is." "$unknown"
}

release_lock() {
  [ -n "$1" ] && [ "$(read_lock "$1")" = "$LOCK_LINE" ] && rm -f "$1"
  return 0
}

# One run at a time per folder. The lock is a file published with a hard link, which fails when
# the name exists, so it appears with its owner line already inside. A lock whose PID is gone was
# left by a killed run: a second hard-linked file serialises taking it over, and the run holding
# it checks the lock is still that same dead one before replacing it. Anything unknown is refused.
# A lock released while this run looks at it is simply tried again.
take_lock() {
  lock="$DIR/.better-tg-cli.lock"
  mutex="$DIR/.better-tg-cli.lock.takeover"
  unknown="$(fix_human "If no install into $DIR is running, delete $lock and $mutex yourself, then run the script again. Or install elsewhere: TG_INSTALL_DIR=\$HOME/.better-tg-cli/bin." "$DOCS")"
  busy="$(fix_unavailable "Wait for that run to finish, then run the script again if needed.")"
  for _ in 1 2 3 4 5; do
    try_lock && return
  done
  BIN=''
  fail install_in_progress "Other runs of this script keep taking and releasing the lock in $DIR; nothing was changed." "$busy"
}

# 0 the lock is ours, 1 it changed meanwhile (try again); stops the run when busy or unknown
try_lock() {
  place_new "$STAGE_DIR/lock" "$lock" && { LOCK="$lock"; return 0; }
  owner_of "$lock" || return 1
  stale=$OWNER
  pid=${stale#pid=}; pid=${pid%% *}
  if kill -0 "$pid" 2>/dev/null; then
    BIN=''
    fail install_in_progress "Another run of this script (pid $pid) is installing into $DIR right now; nothing was changed." "$busy"
  fi

  if ! place_new "$STAGE_DIR/lock" "$mutex"; then
    owner_of "$mutex" || return 1
    hpid=${OWNER#pid=}; hpid=${hpid%% *}
    BIN=''
    if kill -0 "$hpid" 2>/dev/null; then
      fail install_in_progress "Another run of this script (pid $hpid) is taking over a lock in $DIR right now; nothing was changed." "$busy"
    fi
    fail install_lock_unknown "A run that took over the lock in $DIR was killed and left $mutex; it is left as is." "$unknown"
  fi
  MUTEX="$mutex"
  # Under the takeover lock: the dead lock may be gone, or replaced by a run that came first
  now=$(read_lock "$lock")
  if [ "$now" != "$stale" ]; then
    release_lock "$MUTEX"
    MUTEX=''
    gone "$lock" && return 1
    BIN=''
    fail install_in_progress "Another run of this script took over the lock in $DIR first; nothing was changed." "$busy"
  fi
  log "a previous run into $DIR was cut short; this run replaces telegram and install.json"
  clear_stage "$DIR/${stale#* stage=}"
  # A rename replaces the dead lock in one step; the staging folder keeps no copy of the line
  mv -f "$STAGE_DIR/lock" "$lock" 2>/dev/null ||
    fail install_write_failed "Cannot replace the lock $lock." "$(fix_unavailable "Check free space and permissions of $DIR.")"
  LOCK="$lock"
  release_lock "$MUTEX"
  MUTEX=''
  return 0
}

# Refuses a path taken by something not ours. Sets FRESH_BIN / FRESH_JSON when nothing is there yet.
check_ownership() {
  taken="$(fix_human "Move it away yourself, or install elsewhere: TG_INSTALL_DIR=\$HOME/.better-tg-cli/bin (then run telegram by the path this script prints)." "$DOCS")"
  manifest="$DIR/install.json"
  FRESH_BIN=1
  FRESH_JSON=1
  { [ -e "$manifest" ] || [ -L "$manifest" ]; } && FRESH_JSON=0
  if [ -e "$BIN" ] || [ -L "$BIN" ]; then
    FRESH_BIN=0
    if [ -L "$BIN" ] || [ -d "$BIN" ] || ! is_ours "$manifest"; then
      BIN_TAKEN="$BIN"; BIN=''
      fail install_path_taken "$BIN_TAKEN already exists and was not installed by this script; it is left as is." "$taken"
    fi
  elif [ "$FRESH_JSON" = 0 ] && ! is_ours "$manifest"; then
    BIN=''
    fail install_path_taken "$manifest belongs to something else; it is left as is." "$taken"
  fi
}

# install.json is ours only in the exact one-line form this script writes, for this very path, with
# every field well formed: a record nested in another file, an edited, longer or cut-off one does
# not count
MANIFEST_V='[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?'
MANIFEST_T='(darwin|linux)-(x64|arm64)'
MANIFEST_REST="\"$MANIFEST_V\",\"tag\":\"v$MANIFEST_V\",\"target\":\"$MANIFEST_T\",\"archive\":\"better-tg-cli-$MANIFEST_V-$MANIFEST_T\.tar\.(xz|gz)\",\"sha256\":\"[0-9a-f]{64}\",\"installedAt\":\"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z\"}"
is_ours() {
  [ -f "$1" ] && [ ! -L "$1" ] || return 1
  IFS= read -r line <"$1" || return 1
  is_line "$1" "$line" || return 1
  prefix=$(printf '{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":%s,"version":' "$(json_str "$BIN")")
  case "$line" in "$prefix"*) ;; *) return 1 ;; esac
  printf '%s\n' "${line#"$prefix"}" | LC_ALL=C grep -Eqx "$MANIFEST_REST"
}

pick_tools() {
  # curl only: it can be told up front to keep every redirect on HTTPS; wget cannot
  has curl || fail downloader_missing "curl is not installed, so nothing can be downloaded (wget is not used: it cannot keep every redirect on HTTPS)." \
    "$(fix_unavailable "This script does not install system packages. It needs curl with CA certificates; without them download $RELEASES by hand.")"
  if has sha256sum; then SUM='sha256sum'
  elif has shasum; then SUM='shasum -a 256'
  elif has openssl; then SUM='openssl'
  else
    fail checksum_tool_missing "No sha256sum, shasum or openssl to verify the download; nothing was installed." \
      "$(fix_unavailable "The download is never installed unverified. This script does not install system packages.")"
  fi
}

sha256() {
  case "$SUM" in
    openssl) openssl dgst -sha256 "$1" 2>/dev/null | awk '{print $NF}' ;;
    *) $SUM "$1" 2>/dev/null | awk '{print $1}' ;;
  esac
}

# download <url> <file>; fails with a problem of its own
download() {
  # -q first: no ~/.curlrc, which could turn certificate checks off; https on every redirect too
  code=$(curl -q -fsSL --proto '=https' --proto-redir '=https' --tlsv1.2 --retry 2 --connect-timeout 20 -w '%{http_code}' -o "$2" "$1" 2>/dev/null)
  rc=$?
  [ "$rc" = 0 ] && return 0
  case "$rc" in
    35 | 51 | 53 | 54 | 58 | 59 | 60 | 66 | 77 | 80 | 82 | 83 | 90 | 91)
      fail tls_failed "The HTTPS connection to github.com could not be verified (curl exit $rc): CA certificates are missing or a proxy intercepts TLS." \
        "$(fix_unavailable "Certificate checks are never turned off. This script does not install system packages (CA certificates).")" ;;
  esac
  if [ "$rc" = 22 ] && [ "$code" = 404 ]; then
    fail release_not_found "$1 is not published (yet)." \
      "$(fix_unavailable "Release $TAG is not on GitHub yet or lacks this file; run the script again later. Releases: $RELEASES")"
  fi
  fail download_failed "Downloading $1 failed (curl exit $rc)." \
    "$(fix_unavailable "Check the network connection or proxy and run the script again.")"
}

# Prints which archive to take: .tar.xz when this system can unpack it, else .tar.gz
choose_archive() {
  base="better-tg-cli-$VERSION-$TARGET"
  bsdtar=0
  tar --version 2>/dev/null | grep -qi bsdtar && bsdtar=1
  if listed "$base.tar.xz" && { has xz || [ "$bsdtar" = 1 ]; }; then ARCHIVE="$base.tar.xz"; return; fi
  if listed "$base.tar.gz" && { has gzip || [ "$bsdtar" = 1 ]; }; then ARCHIVE="$base.tar.gz"; return; fi
  if listed "$base.tar.xz"; then
    fail unpack_tool_missing "The $TAG archive for $TARGET is .tar.xz, and this system has no xz to unpack it." \
      "$(fix_unavailable "This script does not install system packages (xz). Releases after $TAG also ship .tar.gz for Linux.")"
  fi
  fail archive_not_listed "SHA256SUMS of $TAG lists no archive for $TARGET; nothing was installed." \
    "$(fix_unavailable "Install from another source: npm install -g better-tg-cli with Node 20+. Releases: $RELEASES")"
}

listed() { [ -n "$(expected_sum "$1")" ]; }
expected_sum() {
  awk -v f="$1" '{ n = $2; sub(/^\*/, "", n); if (n == f) { print $1; exit } }' "$TMP/SHA256SUMS"
}

unpack() {
  out="$TMP/x"
  mkdir -p "$out" || return 1
  case "$ARCHIVE" in
    *.tar.xz) if has xz; then xz -dc "$TMP/$ARCHIVE" | tar -xf - -C "$out" telegram; else tar -xJf "$TMP/$ARCHIVE" -C "$out" telegram; fi ;;
    *.tar.gz) if has gzip; then gzip -dc "$TMP/$ARCHIVE" | tar -xf - -C "$out" telegram; else tar -xzf "$TMP/$ARCHIVE" -C "$out" telegram; fi ;;
  esac
  [ -f "$out/telegram" ] && [ ! -L "$out/telegram" ]
}

# place_new <staged file> <target>: puts a file where nothing was, and never over something that
# is there or appears meanwhile. 0 placed, 3 the target is taken, 1 not placed and the name is free
# (taken and released meanwhile, or a write error). A hard link fails when the name exists,
# instead of following a symlink or writing over a file; there is no check-then-rename fallback
# (make_stage proved hard links work here).
place_new() {
  if ln "$1" "$2" 2>/dev/null; then
    [ ! -L "$2" ] && [ -f "$2" ] && [ "$2" -ef "$1" ] && return 0
    # A folder (or a symlink to one) appeared just before ln, which then linked inside it
    [ "$2/${1##*/}" -ef "$1" ] && rm -f "$2/${1##*/}"
    return 3
  fi
  gone "$2" && return 1
  return 3
}

# Other `telegram` executables on PATH, and whether ours comes first
scan_path() {
  ON_PATH=0
  others=''
  old_ifs=$IFS
  IFS=:
  for d in $PATH; do
    IFS=$old_ifs
    [ -n "$d" ] || continue
    real=$(cd "$d" 2>/dev/null && pwd -P) || continue
    if [ "$real" = "$DIR" ]; then
      ON_PATH=1
      [ -n "$ACTIVE" ] || ACTIVE="$BIN"
      continue
    fi
    if [ -f "$real/telegram" ] && [ -x "$real/telegram" ]; then
      case ":$others:" in *":$real/telegram:"*) continue ;; esac
      others="${others:+$others:}$real/telegram"
      [ -n "$ACTIVE" ] || ACTIVE="$real/telegram"
    fi
  done
  IFS=$old_ifs

  if [ "$ON_PATH" = 0 ]; then
    add_problem install_dir_not_on_path warning "$DIR is not on PATH; run the CLI as $BIN." \
      "$(fix_human "Use the absolute path $BIN. To type just telegram, add $DIR to PATH yourself; this script does not edit shell profiles.")"
    log "$DIR is not on PATH: run $BIN"
  fi
  if [ -n "$others" ]; then
    list=$(printf '%s' "$others" | sed 's/:/, /g')
    if [ "$ACTIVE" = "$BIN" ]; then
      msg="Other telegram copies are on PATH too ($list); $BIN comes first."
    else
      msg="Another telegram comes first on PATH ($ACTIVE), so a bare telegram runs that copy, not $BIN. Other copies on PATH: $list."
    fi
    add_problem other_telegram_on_path warning "$msg" \
      "$(fix_human "Keep one telegram: remove the old one (npm rm -g better-tg-cli, brew uninstall better-tg-cli, or the npm link left by scripts/dev-install.sh), or run $BIN by its path." "$DOCS")"
    log "$msg"
  fi
}

install_files() {
  write_failed="$(fix_unavailable "Check free space and permissions of $DIR.")"
  # Both files are prepared in the staging folder only this run can write
  staged="$STAGE_DIR/telegram"
  cp "$TMP/x/telegram" "$staged" 2>/dev/null && chmod 755 "$staged" ||
    fail install_write_failed "Cannot write into $DIR." "$write_failed"

  # stdout goes to a file and is compared byte for byte: $(...) would drop trailing blank lines
  TG_NO_UPDATE_CHECK=1 "$staged" --version >"$STAGE_DIR/version" 2>/dev/null </dev/null
  vrc=$?
  if [ "$vrc" != 0 ] || ! is_line "$STAGE_DIR/version" "$VERSION"; then
    shown=$(head -n 1 "$STAGE_DIR/version" 2>/dev/null | cut -c 1-80)
    fail binary_check_failed "The downloaded telegram does not run here (it printed '$shown' and exited $vrc, expected exactly $VERSION and 0); nothing was replaced." \
      "$(fix_unavailable "A noexec mount or an unsupported system can cause this. Try TG_INSTALL_DIR on another file system, or npm install -g better-tg-cli with Node 20+.")"
  fi

  printf '{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":%s,"version":%s,"tag":%s,"target":%s,"archive":%s,"sha256":%s,"installedAt":%s}\n' \
    "$(json_str "$BIN")" "$(json_str "$VERSION")" "$(json_str "$TAG")" "$(json_str "$TARGET")" "$(json_str "$ARCHIVE")" \
    "$(json_str "$1")" "$(json_str "$(date -u +%Y-%m-%dT%H:%M:%SZ)")" >"$STAGE_DIR/install.json" ||
    fail install_write_failed "Cannot write install.json in $DIR." "$write_failed"

  taken="$(fix_human "Move it away yourself, or install elsewhere: TG_INSTALL_DIR=\$HOME/.better-tg-cli/bin." "$DOCS")"
  if [ "$FRESH_BIN" = 0 ]; then
    # An upgrade: the binary first. A run killed in between leaves the new binary with the old
    # manifest, which only looks out of date, and the next run rewrites both.
    mv -f "$staged" "$BIN" 2>/dev/null ||
      fail install_write_failed "Cannot move the binary into $BIN; the previous install is unchanged." "$write_failed"
    mv -f "$STAGE_DIR/install.json" "$DIR/install.json" 2>/dev/null ||
      fail install_write_failed "telegram $VERSION is in $BIN, but $DIR/install.json could not be updated; run the script again." "$write_failed"
    return
  fi
  # A first install: the manifest first, so a run killed in between still owns the path next time
  if [ "$FRESH_JSON" = 1 ]; then
    place_new "$STAGE_DIR/install.json" "$DIR/install.json"
    rc=$?
    if [ "$rc" = 3 ]; then BIN=''; fail install_path_taken "$DIR/install.json appeared while downloading; it is left as is." "$taken"; fi
    [ "$rc" = 0 ] || fail install_write_failed "Cannot write $DIR/install.json." "$write_failed"
  else
    mv -f "$STAGE_DIR/install.json" "$DIR/install.json" 2>/dev/null ||
      fail install_write_failed "Cannot write $DIR/install.json." "$write_failed"
  fi
  place_new "$staged" "$BIN"
  rc=$?
  if [ "$rc" = 3 ]; then
    # Something else took the name while downloading: our manifest must not claim it
    rm -f "$DIR/install.json"
    BIN_TAKEN="$BIN"; BIN=''
    fail install_path_taken "$BIN_TAKEN appeared while downloading and was not installed by this script; it is left as is." "$taken"
  fi
  [ "$rc" = 0 ] || fail install_write_failed "Cannot move the binary into $BIN." "$write_failed"
}

main() {
  trap cleanup EXIT
  trap 'cleanup; exit 130' INT TERM

  check_old_installer
  detect_target
  resolve_dir
  make_stage
  take_lock
  check_ownership
  pick_tools

  TMP=$(mktemp -d 2>/dev/null || mktemp -d -t better-tg-cli) || TMP=''
  [ -n "$TMP" ] && [ -d "$TMP" ] || fail install_write_failed "Cannot create a temporary folder." \
    "$(fix_unavailable "Check that TMPDIR (or /tmp) exists and is writable.")"

  log "Downloading Better-TG-CLI $VERSION for $TARGET..."
  download "$BASE/SHA256SUMS" "$TMP/SHA256SUMS"
  choose_archive
  download "$BASE/$ARCHIVE" "$TMP/$ARCHIVE"

  want=$(expected_sum "$ARCHIVE")
  got=$(sha256 "$TMP/$ARCHIVE")
  if [ -z "$got" ] || [ "$got" != "$want" ]; then
    fail checksum_mismatch "The SHA-256 of $ARCHIVE does not match SHA256SUMS of $TAG; nothing was unpacked or installed." \
      "$(fix_unavailable "The download is corrupted or was tampered with. Run the script again; if it keeps failing, report it at https://github.com/$REPO/issues")"
  fi

  unpack || fail unpack_failed "Could not unpack telegram from $ARCHIVE." \
    "$(fix_unavailable "Check free space in the temporary folder and run the script again.")"

  install_files "$got"

  log "Installed telegram $VERSION to $BIN"
  scan_path
  log "Next: $BIN onboard   (log in; your agent can run it for you)"
  finish true 0
}

main "$@"
}
