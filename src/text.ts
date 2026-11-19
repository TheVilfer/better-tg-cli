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
let stdinSealed = false;

/**
 * All of stdin, read once and kept: the write guard reads it first (an approval in "ask" mode
 * covers the exact text), and the command that consumes "-" gets the same bytes afterwards.
 */
export function primeStdin(text: string): void {
  stdinText = text;
}

export function readStdinOnce(): string {
  // An approval in mode "ask" that did not cover stdin: a body read from it now would be unapproved
  if (stdinSealed) throw new Error('This command reads stdin, but its approval did not cover stdin. Run it again to get an approval that does.');
  stdinText ??= readFileSync(0, 'utf-8');
  return stdinText;
}

/** Whether something already read stdin (the command parsed its body before the write guard ran). */
export function stdinWasRead(): boolean {
  return stdinText !== undefined;
}

/** Called by the write guard after an approval that does not cover stdin: any later read fails. */
export function sealStdin(): void {
  stdinSealed = true;
}

export function readTextArg(value: string): string {
  if (value !== '-') return value;
  const text = readStdinOnce().replace(/\r?\n$/, '');
  if (!text) throw new Error('Empty message on stdin');
  return text;
}
