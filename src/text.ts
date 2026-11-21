import { readFileSync } from "node:fs";

/**
 * Error text that is safe to send in an HTTP answer: the message of a real Error and nothing
 * else. Stringifying an arbitrary thrown value could put a stack trace or an object dump on the wire.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
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
  if (stdinSealed) {
    throw new Error(
      "This command reads stdin, but its approval did not cover stdin. Run it again to get an approval that does."
    );
  }
  stdinText ??= readFileSync(0, "utf-8");
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

/**
 * The body a command sends for stdin: all of it but one trailing line break (LF or CRLF), which
 * `echo` and editors add. The write guard shows and hashes this same text, so the approved body is
 * the sent one.
 */
export function stdinBody(raw: string): string {
  return raw.replace(/\r?\n$/, "");
}

export function readTextArg(value: string): string {
  if (value !== "-") {
    return value;
  }
  const text = stdinBody(readStdinOnce());
  if (!text) {
    throw new Error("Empty message on stdin");
  }
  return text;
}
