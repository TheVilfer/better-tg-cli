#!/usr/bin/env bash
# Cut a release in two steps, both through GitHub's rules for main:
#   scripts/release.sh [patch|minor|major|X.Y.Z]   bump on a release branch, test, open a PR;
#                                                    without an argument the level comes from the
#                                                    PR titles since the last tag (scripts/next-version.mjs)
#   scripts/release.sh tag                           after the PR is merged: tag main, push the tag
# The tag triggers .github/workflows/release.yml (binaries → GitHub Release → npm → Homebrew → …).
set -euo pipefail

REPO=TheVilfer/better-tg-cli
arg="${1:-auto}"
[ -z "$(git status --porcelain)" ] || { echo "Working tree is dirty; commit first." >&2; exit 1; }

if [ "$arg" = tag ]; then
  git checkout -q main
  git pull -q --ff-only origin main
  version="$(node -p "require('./package.json').version")"
  git rev-parse -q --verify "refs/tags/v${version}" >/dev/null && { echo "v${version} is already tagged." >&2; exit 1; }
  case "$(git log -1 --format=%s)" in
    "Release v${version}"*) ;;
    *) echo "main's last commit is not the merged 'Release v${version}' PR." >&2; exit 1 ;;
  esac
  git tag "v${version}"
  git push origin "v${version}"
  echo "Tagged v${version}. Follow the pipeline: gh run watch -R ${REPO}"
  exit 0
fi

[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "Start a release from main." >&2; exit 1; }
git pull -q --ff-only origin main
if [ "$arg" = auto ]; then
  git fetch -q --tags origin
  arg="$(node scripts/next-version.mjs)"
  [ -n "$arg" ] || { echo "Nothing to release since $(git describe --tags --abbrev=0)." >&2; exit 1; }
  echo "Release level from the PR titles: $arg"
fi
npm version "$arg" --no-git-tag-version >/dev/null
version="$(node -p "require('./package.json').version")"
git checkout -q -b "release/v${version}"
node scripts/gen-version.mjs
npm run build >/dev/null
npm test

git add package.json package-lock.json src/version.ts src/skill-files.ts plugin .claude-plugin/plugin.json server.json gemini-extension.json
git commit -m "Release v${version}"
git push -q -u origin "release/v${version}"
gh pr create -R "$REPO" --head "release/v${version}" --title "Release v${version}" \
  --body "Version bump for v${version}. After merge: \`scripts/release.sh tag\`."
echo "Opened the release PR. When CI is green and it's merged (squash): scripts/release.sh tag"
