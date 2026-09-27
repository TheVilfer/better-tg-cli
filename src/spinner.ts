import ora, { type Ora } from 'ora';

/** True when stdout is an interactive terminal (a human, not an agent/pipe). */
export const isTTY = !!process.stdout.isTTY;

/**
 * ora() that stays quiet off a TTY: no "- Fetching..." start line and no progress
 * text, while succeed/fail/warn/info still print their final line (several
 * commands report their result that way).
 */
export default function spinner(text: string): Ora {
  const s = ora({ text, isEnabled: !!process.stderr.isTTY });
  if (!process.stderr.isTTY) {
    s.start = function () {
      return this;
    };
  }
  return s;
}
