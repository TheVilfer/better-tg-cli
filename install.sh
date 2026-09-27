#!/bin/sh
# better-tg-cli installer
# Usage: ./install.sh   (or: curl -sSfL <raw url>/install.sh | sh, needs repo access)
#
# Clones/updates the fork into ~/.agents/skills/telegram, builds it, installs the
# `telegram` binary globally from that folder and links the agent skill.

set -e

REPO="https://github.com/TheVilfer/better-tg-cli.git"
DIR="${TG_SKILL_DIR:-$HOME/.agents/skills/telegram}"

log() { echo "  $*" >&2; }
err() { log "error: $*"; exit 1; }
has() { command -v "$1" > /dev/null 2>&1; }

for c in git node npm; do has "$c" || err "required command not found: $c"; done

if [ -d "$DIR/.git" ]; then
    log "Updating $DIR..."
    git -C "$DIR" pull --ff-only
else
    [ -e "$DIR" ] && err "$DIR exists and is not a git checkout; move it away first"
    log "Cloning into $DIR..."
    git clone "$REPO" "$DIR"
fi

cd "$DIR"
npm install --no-fund --no-audit
npm run build

# Remove installs under older package names: they own the same `telegram` binary
for old in @skillhq/telegram better-telegram-cli; do
    npm ls -g "$old" > /dev/null 2>&1 && npm rm -g "$old"
done
npm install -g --no-fund --no-audit .

for agent in "$HOME/.claude/skills" "$HOME/.codex/skills"; do
    if [ -d "$(dirname "$agent")" ] && [ ! -e "$agent/telegram" ]; then
        mkdir -p "$agent" && ln -s "$DIR" "$agent/telegram" && log "Linked skill into $agent/telegram"
    fi
done

log "Installed telegram $(telegram --version)"
if telegram check > /dev/null 2>&1; then
    log "Session is valid."
else
    log "Next: run 'telegram auth' (API ID/hash from https://my.telegram.org/apps)."
fi
