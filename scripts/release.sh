#!/usr/bin/env bash
# Cut a release: bump version, test, commit, tag, push. The tag triggers
# .github/workflows/release.yml (binaries → GitHub Release → npm → Homebrew).
# Usage: scripts/release.sh <patch|minor|major|X.Y.Z>
set -euo pipefail

bump="${1:?usage: scripts/release.sh <patch|minor|major|X.Y.Z>}"
[ -z "$(git status --porcelain)" ] || { echo "Working tree is dirty; commit first." >&2; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "Release from main only." >&2; exit 1; }

npm version "$bump" --no-git-tag-version >/dev/null
version="$(node -p "require('./package.json').version")"
node scripts/gen-version.mjs
npm run build >/dev/null
npm test

git add package.json package-lock.json src/version.ts .claude-plugin/plugin.json server.json gemini-extension.json
git commit -m "Release v${version}"
git tag "v${version}"
git push origin main "v${version}"
echo "Tagged v${version}. Follow the pipeline: gh run watch -R TheVilfer/better-tg-cli"
