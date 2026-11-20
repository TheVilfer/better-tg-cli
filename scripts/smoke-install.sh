#!/usr/bin/env bash
# Acceptance of install.sh on the archives of this build, with no network: a fake curl first on
# PATH serves the archives in <dir>, plus a SHA256SUMS written for them the way the release
# workflow writes it, for the pinned release URL only. Used by the native smoke jobs of
# .github/workflows/release.yml; runs the same way on a Mac or Linux machine after
# scripts/build-binary.sh.
# Usage: scripts/smoke-install.sh <release dir> [--no-xz]
#   --no-xz: a PATH without xz, so a Linux run must take the .tar.gz (as on Debian and Ubuntu images)
set -euo pipefail

rel="$(cd "$1" && pwd)"
mode="${2:-}"
root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(sed -n 's/^  "version": "\(.*\)",$/\1/p' "$root/package.json")"
pinned="$(sed -n "s/^VERSION='\(.*\)'$/\1/p" "$root/install.sh")"
[[ "$pinned" == "$version" ]] || { echo "install.sh pins $pinned, package.json is $version (run scripts/gen-version.mjs)" >&2; exit 1; }
base="https://github.com/TheVilfer/better-tg-cli/releases/download/v$version"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir "$work/serve" "$work/bin"
shopt -s nullglob
archives=("$rel"/better-tg-cli-"$version"-*.tar.*)
[[ ${#archives[@]} -gt 0 ]] || { echo "no better-tg-cli-$version-*.tar.* in $rel" >&2; exit 1; }
# Outside the release dir: the workflow uploads that dir as is
for f in "${archives[@]}"; do ln -s "$f" "$work/serve/${f##*/}"; done
(cd "$work/serve" && if command -v sha256sum >/dev/null; then sha256sum -- *.tar.*; else shasum -a 256 -- *.tar.*; fi) >"$work/serve/SHA256SUMS"

cat >"$work/bin/curl" <<'EOF'
#!/bin/sh
out=''; url=''; https=0
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out=$2; shift 2 ;;
    --proto) [ "$2" = '=https' ] && https=1; shift 2 ;;
    -w | --proto-redir | --retry | --connect-timeout) shift 2 ;;
    -*) shift ;;
    *) url=$1; shift ;;
  esac
done
[ "$https" = 1 ] || { echo "fake curl: called without --proto =https" >&2; exit 2; }
printf '%s\n' "$url" >>"$SMOKE_LOG"
name=${url#"$SMOKE_BASE"/}
if [ "$name" = "$url" ] || [ ! -f "$SMOKE_SERVE/$name" ]; then printf 404; exit 22; fi
cp "$SMOKE_SERVE/$name" "$out" && printf 200
EOF
chmod +x "$work/bin/curl"

path="$work/bin:$PATH"
if [[ "$mode" == --no-xz ]]; then
  # Only the tools install.sh calls, and no xz
  mkdir "$work/tools"
  for t in awk cat chmod cp cut date grep gzip head ln ls mkdir mktemp mv rm rmdir sed tar tr uname sha256sum shasum openssl sysctl; do
    p="$(command -v "$t" || true)"
    if [[ -n "$p" ]]; then ln -s "$p" "$work/tools/$t"; fi
  done
  path="$work/bin:$work/tools"
fi

# run_install <dir>: runs install.sh into <dir>; sets rc and out
run_install() {
  set +e
  out="$(env PATH="$path" TG_INSTALL_DIR="$1" SMOKE_BASE="$base" SMOKE_SERVE="$work/serve" SMOKE_LOG="$work/requests" \
    /bin/sh "$root/install.sh" </dev/null)"
  rc=$?
  set -e
  printf '%s\n' "$out"
}
fail() { echo "smoke-install: $*" >&2; exit 1; }

run_install "$work/dir"
[[ "$rc" == 0 && "$out" == '{"schema":1,"ok":true,'* ]] || fail "install exited $rc"
bin="$work/dir/telegram"
[[ "$("$bin" --version)" == "$version" ]] || fail "--version is not $version"
"$bin" help-all -g thread | grep -q 'read <chat>' || fail "help-all does not list read"
archive="$(sed -n 's/.*"archive":"\([^"]*\)".*/\1/p' "$work/dir/install.json")"
# The same choice install.sh makes: .tar.xz when xz (or bsdtar) can unpack it
want=tar.gz
if PATH="$path" command -v xz >/dev/null || tar --version 2>/dev/null | grep -qi bsdtar; then want=tar.xz; fi
[[ "$archive" == *".$want" ]] || fail "installed from $archive, expected a .$want"
echo "installed from $archive"

run_install "$work/dir"
[[ "$rc" == 0 ]] || fail "a second run over its own install exited $rc"

mkdir "$work/foreign" && printf 'someone else\n' >"$work/foreign/telegram"
run_install "$work/foreign"
[[ "$rc" == 2 && "$out" == *'"id":"install_path_taken"'* ]] || fail "a foreign telegram was not refused (exit $rc)"
[[ "$(cat "$work/foreign/telegram")" == 'someone else' ]] || fail "a foreign telegram was changed"
echo "smoke-install: ok ($archive)"
