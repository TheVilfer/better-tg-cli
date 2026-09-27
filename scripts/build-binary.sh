#!/usr/bin/env bash
# Build one standalone `telegram` binary with Bun and pack it for release.
# Usage: scripts/build-binary.sh <target> [outdir]
#   target: darwin-arm64 | darwin-x64 | linux-x64 | linux-arm64
set -euo pipefail

target="$1"
out="${2:-release}"
version="$(node -p "require('./package.json').version")"
name="better-tg-cli-${version}-${target}"
stage="$(mktemp -d)"

node scripts/gen-version.mjs
bun scripts/bundle.mjs "bun-${target}" "${stage}/telegram"

# macOS arm64 refuses to run unsigned code: re-sign ad hoc after compiling
if [[ "$target" == darwin-* && "$(uname)" == "Darwin" ]]; then
  codesign --force --sign - "${stage}/telegram"
fi

cp LICENSE README.md "${stage}/"
mkdir -p "$out"
# xz -9e: ~40% smaller than gzip for these binaries; Homebrew unpacks .tar.xz natively
tar -C "$stage" -cf - telegram LICENSE README.md | xz -9e -T0 > "${out}/${name}.tar.xz"
rm -rf "$stage"
echo "${out}/${name}.tar.xz"
