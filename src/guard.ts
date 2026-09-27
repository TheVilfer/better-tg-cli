import { secretGet, isSecretStoreAvailable } from './secrets.js';
import { parseWriteState } from './write-state.js';
import chalk from './colors.js';
import { setStrictChatResolution } from './resolve-mode.js';

export function assertWriteEnabled(): void {
  if (!isSecretStoreAvailable()) {
    console.error(chalk.red('Write access requires a secret store (macOS Keychain or 1Password).'));
    console.error(chalk.gray('This ensures write permissions cannot be tampered with via config files.'));
    process.exit(1);
  }

  const state = parseWriteState(secretGet('writeEnabled'));
  if (!state.enabled) {
    const why = state.expired ? `expired at ${state.until!.toLocaleString()}` : 'read-only mode';
    console.error(chalk.red(`Write access is disabled (${why}).`));
    console.error(chalk.gray('Ask the user to run: telegram write-access on [--for 1h] (needs their confirmation)'));
    process.exit(1);
  }
  setStrictChatResolution(true);
}
