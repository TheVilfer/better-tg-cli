# Claude Instructions for @skillhq/telegram

## Version and Release Workflow

When using `/commit-and-push` or committing changes:

1. **Always bump the version** in `package.json` before committing:
   - Patch (0.x.Y): Bug fixes
   - Minor (0.X.0): New features (like new commands)
   - Major (X.0.0): Breaking changes

2. **After pushing, always create and push a git tag**:
   ```bash
   git tag v<version>
   git push origin v<version>
   ```

3. **Tag naming**: Use `v` prefix (e.g., `v0.3.0`, `v1.0.0`)

## Commit Message Format

Follow conventional commits style:
- `Add <feature>` for new features
- `Fix <bug>` for bug fixes
- `Update <component>` for changes
- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` at the end

## MTProto library

The client is `teleproto` (GramJS fork, current TL layer; `telegram`/GramJS is deprecated and
stuck on layer 198, which returns bot replies as `MessageMediaUnsupported` with empty text).
Layer 229 differences the code relies on: one `KeyboardButton`/`KeyboardInlineButton` class with a
`type` object (`ButtonType*` / `InlineButtonType*`) instead of a constructor per button kind;
`Poll` needs `hash`; outgoing poll answers are `InputPollAnswer`; `ImportChatInvite` returns
`messages.ChatInviteJoinResult*`; message text may live in `richMessage` — always read it through
`messageText()` in `src/client.ts`.

## Personal fork

This checkout is a fork of `skillhq/telegram` (remote `upstream`, push disabled); `origin` is the
private `TheVilfer/telegram-cli`. The global `telegram` binary is an `npm install -g <this dir>`
symlink under homebrew node (`/opt/homebrew/bin/telegram`), so `npm run build` is enough to ship a
change. Never `npm i -g @skillhq/telegram` or update the skill via the skills CLI — both replace
this fork with upstream (GramJS, layer 198). Pull upstream with `git fetch upstream && git merge
upstream/main`, keeping `teleproto` imports and reading text through `messageText()`.
