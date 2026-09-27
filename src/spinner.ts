import colors from './colors.js';

/** True when stdout is an interactive terminal (a human, not an agent/pipe). */
export const isTTY = !!process.stdout.isTTY;

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Tiny ora replacement. Animates on a TTY stderr only; off a TTY it prints nothing
 * until succeed/fail, which always print their final line (commands report results that way).
 */
export class Spinner {
  private timer?: ReturnType<typeof setInterval>;
  private frame = 0;
  private readonly live = !!process.stderr.isTTY;

  constructor(public text: string) {}

  start(): this {
    if (this.live && !this.timer) {
      this.timer = setInterval(() => {
        process.stderr.write(`\r\x1b[2K${colors.cyan(FRAMES[this.frame++ % FRAMES.length])} ${this.text}`);
      }, 80);
      this.timer.unref?.();
    }
    return this;
  }

  stop(): this {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      process.stderr.write('\r\x1b[2K');
    }
    return this;
  }

  private finish(symbol: string, text?: string): this {
    this.stop();
    process.stderr.write(`${symbol} ${text ?? this.text}\n`);
    return this;
  }

  succeed(text?: string): this {
    return this.finish(colors.green('✔'), text);
  }

  fail(text?: string): this {
    return this.finish(colors.red('✖'), text);
  }

  warn(text?: string): this {
    return this.finish(colors.yellow('⚠'), text);
  }

  info(text?: string): this {
    return this.finish(colors.blue('ℹ'), text);
  }
}

export default function spinner(text: string): Spinner {
  return new Spinner(text);
}
