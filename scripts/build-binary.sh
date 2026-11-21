#!/usr/bin/env bash
set -euo pipefail

target="$1"
out="${2:-release}"
version="$(node -p "require('./package.json').version")"
name="better-tg-cli-${version}-${target}"
stage="$(mktemp -d)"
native() { if command -v cygpath >/dev/null; then cygpath -m "$1"; else echo "$1"; fi; }

node scripts/gen-version.mjs
bun scripts/bundle.mjs "bun-${target}" "$(native "$stage")/telegram"

if [[ "$target" == darwin-* && "$(uname)" == "Darwin" ]]; then
  codesign --force --sign - "${stage}/telegram"
fi

cp LICENSE README.md "${stage}/"
mkdir -p "$out"
if [[ "$target" == windows-* ]]; then
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
tar -C "$stage" -cf - telegram LICENSE README.md | xz -9e -T0 --block-size=24MiB > "${out}/${name}.tar.xz"
if [[ "$target" == linux-* ]]; then
  tar -C "$stage" -cf - telegram LICENSE README.md | gzip -9n > "${out}/${name}.tar.gz"
fi
rm -rf "$stage"
echo "${out}/${name}.tar.xz"
