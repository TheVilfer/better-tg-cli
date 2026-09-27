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
bun build src/index.ts --compile --minify --target="bun-${target}" --outfile "${stage}/telegram"

# macOS arm64 refuses to run unsigned code: re-sign ad hoc after compiling
if [[ "$target" == darwin-* && "$(uname)" == "Darwin" ]]; then
  codesign --force --sign - "${stage}/telegram"
fi

cp LICENSE README.md "${stage}/"
mkdir -p "$out"
tar -C "$stage" -czf "${out}/${name}.tar.gz" telegram LICENSE README.md
rm -rf "$stage"
echo "${out}/${name}.tar.gz"
