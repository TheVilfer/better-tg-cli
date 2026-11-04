import { readFileSync } from 'fs';

/**
 * Message text argument: "-" reads it from stdin, so agents can pass long or
 * multi-line text without shell quoting (`cat msg.txt | telegram send @x -`).
 */
/**
 * Error text that is safe to send in an HTTP answer: the message of a real Error and nothing
 * else. Stringifying an arbitrary thrown value could put a stack trace or an object dump on the wire.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

let stdinText: string | undefined;

/**
 * All of stdin, read once and kept: the write guard reads it first (an approval in "ask" mode
 * covers the exact text), and the command that consumes "-" gets the same bytes afterwards.
 */
export function primeStdin(text: string): void {
  stdinText = text;
}

export function readStdinOnce(): string {
  stdinText ??= readFileSync(0, 'utf-8');
  return stdinText;
}

export function readTextArg(value: string): string {
  if (value !== '-') return value;
  const text = readStdinOnce().replace(/\r?\n$/, '');
  if (!text) throw new Error('Empty message on stdin');
  return text;
}
