import { readFileSync } from 'fs';

/**
 * Message text argument: "-" reads it from stdin, so agents can pass long or
 * multi-line text without shell quoting (`cat msg.txt | telegram send @x -`).
 */
export function readTextArg(value: string): string {
  if (value !== '-') return value;
  const text = readFileSync(0, 'utf-8').replace(/\r?\n$/, '');
  if (!text) throw new Error('Empty message on stdin');
  return text;
}
