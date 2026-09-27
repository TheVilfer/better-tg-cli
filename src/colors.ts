/**
 * Minimal chalk replacement (the subset this CLI uses, chainable: `colors.bold.blue(x)`).
 * Colors only on a TTY; NO_COLOR disables, FORCE_COLOR enables.
 */
const CODES = {
  bold: [1, 22],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  gray: [90, 39],
} as const;

type Name = keyof typeof CODES;
export type Style = ((text: unknown) => string) & { [K in Name]: Style };

const enabled = process.env.FORCE_COLOR ? true : !process.env.NO_COLOR && !!process.stdout.isTTY;

function style(open: string, close: string): Style {
  const fn = ((text: unknown) => (enabled ? `${open}${text}${close}` : String(text))) as Style;
  for (const name of Object.keys(CODES) as Name[]) {
    Object.defineProperty(fn, name, {
      get: () => style(`${open}\x1b[${CODES[name][0]}m`, `\x1b[${CODES[name][1]}m${close}`),
    });
  }
  return fn;
}

const colors = style('', '');
export default colors;
