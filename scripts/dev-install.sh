#!/bin/sh
# Better-TG-CLI developer install (formerly ./install.sh)
# Usage: scripts/dev-install.sh   (TG_SKILL_DIR picks the checkout, default ~/.agents/skills/telegram)
#
# Clones/updates the fork into a checkout, builds it, installs the `telegram` binary globally
# from that folder (npm install -g, needs a writable npm prefix) and links the agent skill.
# Users want ./install.sh instead: a release binary, no git, Node or sudo.

set -e

REPO="https://github.com/TheVilfer/better-tg-cli.git"
DIR="${TG_SKILL_DIR:-$HOME/.agents/skills/telegram}"

log() { echo "  $*" >&2; }
err() { log "error: $*"; exit 1; }
has() { command -v "$1" > /dev/null 2>&1; }

for c in git node npm bun; do has "$c" || err "required command not found: $c"; done

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

# Link the skill folder (not the whole checkout) into agents that are present
for agent in "$HOME/.claude/skills" "$HOME/.codex/skills"; do
    if [ -d "$(dirname "$agent")" ] && [ ! -e "$agent/better-tg-cli" ]; then
        mkdir -p "$agent" && ln -s "$DIR/skills/better-tg-cli" "$agent/better-tg-cli" && log "Linked skill into $agent/better-tg-cli"
    fi
done

log "Installed telegram $(telegram --version)"
if telegram check > /dev/null 2>&1; then
    log "Session is valid."
else
    log "Next: run 'telegram auth' (API ID/hash from https://my.telegram.org/apps)."
fi
