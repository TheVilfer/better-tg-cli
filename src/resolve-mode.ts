/**
 * Write commands turn this on (via assertWriteEnabled) so a chat title must match
 * exactly and uniquely; a substring match could send to the wrong chat.
 */
let strict = false;

export function setStrictChatResolution(value: boolean): void {
  strict = value;
}

export function isStrictChatResolution(): boolean {
  return strict;
}

/**
 * The command line this process runs (argv without "telegram"), set by src/index.ts: a chat
 * candidate's `command` is this argv with the candidate's ID in place of the name. Unset (in-process
 * callers, tests) means no such command.
 */
let invocation: string[] | undefined;

export function setInvocation(argv: string[] | undefined): void {
  invocation = argv;
}

export function getInvocation(): string[] | undefined {
  return invocation;
}
