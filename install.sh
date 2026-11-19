#!/bin/sh
# Better-TG-CLI installer for macOS and Linux: one standalone `telegram` binary from a release.
# No sudo, Node, git or shell-profile edits.
#
#   curl -fsSL https://raw.githubusercontent.com/TheVilfer/better-tg-cli/main/install.sh | sh
#
# What it does: downloads SHA256SUMS and the archive of one pinned stable release (VERSION below),
# checks the archive's sum before unpacking or running anything, installs `telegram` into
# ~/.local/bin (or $TG_INSTALL_DIR) and writes install.json next to it. A `telegram` there that this
# script did not install is never overwritten.
#
# Output: one JSON object on stdout (setup contract, schema 1); progress goes to stderr.
#   {"schema":1,"ok":true,"problems":[],"install":{"path":"/abs/telegram","onPath":false,...}}
# When onPath is false, run the CLI by that absolute path.
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
STAGE=''
STAGE_JSON=''

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

  printf '{"schema":1,"ok":%s,"problems":[%s],"install":{"manager":"user-binary","version":%s,"tag":%s,"target":%s,"dir":%s,"path":%s,"onPath":%s,"active":%s}}\n' \
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

cleanup() {
  [ -n "$TMP" ] && rm -rf "$TMP"
  [ -n "$STAGE" ] && rm -f "$STAGE"
  [ -n "$STAGE_JSON" ] && rm -f "$STAGE_JSON"
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

# Sets DIR (absolute, symlinks resolved) and BIN, and refuses a path taken by something not ours
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

  taken="$(fix_human "Move it away yourself, or install elsewhere: TG_INSTALL_DIR=\$HOME/.better-tg-cli/bin (then run telegram by the path this script prints)." "$DOCS")"
  manifest="$DIR/install.json"
  if [ -e "$BIN" ] || [ -L "$BIN" ]; then
    if [ -L "$BIN" ] || [ -d "$BIN" ] || ! is_ours "$manifest"; then
      BIN_TAKEN="$BIN"; BIN=''
      fail install_path_taken "$BIN_TAKEN already exists and was not installed by this script; it is left as is." "$taken"
    fi
  elif [ -e "$manifest" ] || [ -L "$manifest" ]; then
    if [ -L "$manifest" ] || ! is_ours "$manifest"; then
      BIN=''
      fail install_path_taken "$manifest belongs to something else; it is left as is." "$taken"
    fi
  fi
}

# install.json is ours when this script wrote it for this very path
is_ours() {
  [ -f "$1" ] && [ ! -L "$1" ] &&
    grep -qF '"package":"better-tg-cli"' "$1" &&
    grep -qF '"manager":"user-binary"' "$1" &&
    grep -qF "\"path\":$(json_str "$BIN")" "$1"
}

pick_tools() {
  if has curl; then DL=curl
  elif has wget; then DL=wget
  else
    fail downloader_missing "Neither curl nor wget is installed, so nothing can be downloaded." \
      "$(fix_unavailable "This script does not install system packages. It needs curl or wget (with CA certificates); without them download $RELEASES by hand.")"
  fi
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
  if [ "$DL" = curl ]; then
    code=$(curl -fsSL --proto '=https' --tlsv1.2 --retry 2 --connect-timeout 20 -w '%{http_code}' -o "$2" "$1" 2>/dev/null)
    rc=$?
    [ "$rc" = 0 ] && return 0
    case "$rc" in
      35 | 51 | 53 | 54 | 58 | 59 | 60 | 66 | 77 | 80 | 82 | 83 | 90 | 91) tls=1 ;;
      *) tls=0 ;;
    esac
    [ "$rc" = 22 ] && [ "$code" = 404 ] && missing=1 || missing=0
  else
    wget -q -O "$2" "$1" 2>/dev/null
    rc=$?
    [ "$rc" = 0 ] && return 0
    [ "$rc" = 5 ] && tls=1 || tls=0
    [ "$rc" = 8 ] && missing=1 || missing=0
  fi
  if [ "$tls" = 1 ]; then
    fail tls_failed "The HTTPS connection to github.com could not be verified ($DL exit $rc): CA certificates are missing or a proxy intercepts TLS." \
      "$(fix_unavailable "Certificate checks are never turned off. This script does not install system packages (CA certificates).")"
  fi
  if [ "$missing" = 1 ]; then
    fail release_not_found "$1 is not published (yet)." \
      "$(fix_unavailable "Release $TAG appears a few minutes after it is tagged; run the script again later. Releases: $RELEASES")"
  fi
  fail download_failed "Downloading $1 failed ($DL exit $rc)." \
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

main() {
  trap cleanup EXIT
  trap 'cleanup; exit 130' INT TERM

  detect_target
  resolve_dir
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

  # Copy next to the target first: the final mv is then a rename on one file system
  STAGE="$DIR/.telegram.install.$$"
  cp "$TMP/x/telegram" "$STAGE" 2>/dev/null && chmod 755 "$STAGE" ||
    fail install_write_failed "Cannot write into $DIR." "$(fix_unavailable "Check free space and permissions of $DIR.")"
  reported=$(TG_NO_UPDATE_CHECK=1 "$STAGE" --version 2>/dev/null </dev/null | head -n 1 | cut -c 1-80)
  if [ "$reported" != "$VERSION" ]; then
    fail binary_check_failed "The downloaded telegram does not run here (it reported '$reported', expected $VERSION); nothing was replaced." \
      "$(fix_unavailable "A noexec mount or an unsupported system can cause this. Try TG_INSTALL_DIR on another file system, or npm install -g better-tg-cli with Node 20+.")"
  fi
  # The manifest goes first: a run cut short between the two renames must still find telegram
  # ours next time, not refuse its own install as a foreign file
  STAGE_JSON="$DIR/.install.json.$$"
  printf '{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":%s,"version":%s,"tag":%s,"target":%s,"archive":%s,"sha256":%s,"installedAt":%s}\n' \
    "$(json_str "$BIN")" "$(json_str "$VERSION")" "$(json_str "$TAG")" "$(json_str "$TARGET")" "$(json_str "$ARCHIVE")" \
    "$(json_str "$got")" "$(json_str "$(date -u +%Y-%m-%dT%H:%M:%SZ)")" >"$STAGE_JSON" &&
    mv -f "$STAGE_JSON" "$DIR/install.json" ||
    fail install_write_failed "Cannot write $DIR/install.json." "$(fix_unavailable "Check permissions of $DIR.")"
  STAGE_JSON=''
  mv -f "$STAGE" "$BIN" ||
    fail install_write_failed "Cannot move the binary into $BIN." "$(fix_unavailable "Check permissions of $DIR.")"
  STAGE=''

  log "Installed telegram $VERSION to $BIN"
  scan_path
  log "Next: $BIN onboard   (log in; your agent can run it for you)"
  finish true 0
}

# Everything runs from here, so a download cut short by `curl | sh` runs nothing
main "$@"
