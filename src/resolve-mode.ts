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
