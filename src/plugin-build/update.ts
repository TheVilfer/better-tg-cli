// Replaces src/update.ts in the Claude plugin build (scripts/bundle.mjs plugin). Claude Code updates
// the plugin, so that copy never checks npm in the background and never runs an installer.
export const BACKGROUND_CHECK_COMMAND = '__update-check';

export function isCompiledBinary(): boolean {
  return false;
}

export function maybeNotifyUpdate(): void {}

export async function runBackgroundCheck(): Promise<void> {}
