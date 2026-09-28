#!/usr/bin/env bash
# Build one standalone `telegram` binary with Bun and pack it for release.
# Usage: scripts/build-binary.sh <target> [outdir]
#   target: darwin-arm64 | darwin-x64 | linux-x64 | linux-arm64 | windows-x64
set -euo pipefail

target="$1"
out="${2:-release}"
version="$(node -p "require('./package.json').version")"
name="better-tg-cli-${version}-${target}"
stage="$(mktemp -d)"
# Native Windows tools (bun, PowerShell) need C:/... paths, not Git Bash /tmp/...
native() { if command -v cygpath >/dev/null; then cygpath -m "$1"; else echo "$1"; fi; }

node scripts/gen-version.mjs
# Windows builds run on Windows: Bun writes the exe version resource (product name, version) only there
bun scripts/bundle.mjs "bun-${target}" "$(native "$stage")/telegram"

# macOS arm64 refuses to run unsigned code: re-sign ad hoc after compiling
if [[ "$target" == darwin-* && "$(uname)" == "Darwin" ]]; then
  codesign --force --sign - "${stage}/telegram"
fi

cp LICENSE README.md "${stage}/"
mkdir -p "$out"
if [[ "$target" == windows-* ]]; then
  # Bun names the Windows build telegram.exe; Scoop and Explorer unpack .zip natively
  zipfile="$(cd "$out" && pwd)/${name}.zip"
  if command -v zip >/dev/null; then
    (cd "$stage" && zip -q -9 "$zipfile" telegram.exe LICENSE README.md)
  else
    pwsh -NoProfile -Command "Compress-Archive -CompressionLevel Optimal -Path '$(native "$stage")/*' -DestinationPath '$(native "$zipfile")'"
  fi
  rm -rf "$stage"
  echo "${out}/${name}.zip"
  exit 0
fi
# xz -9e: ~40% smaller than gzip for these binaries; Homebrew unpacks .tar.xz natively
tar -C "$stage" -cf - telegram LICENSE README.md | xz -9e -T0 > "${out}/${name}.tar.xz"
rm -rf "$stage"
echo "${out}/${name}.tar.xz"
