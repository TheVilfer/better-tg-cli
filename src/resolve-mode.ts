let strict = false;

export function setStrictChatResolution(value: boolean): void {
  strict = value;
}

export function isStrictChatResolution(): boolean {
  return strict;
}

let invocation: string[] | undefined;

export function setInvocation(argv: string[] | undefined): void {
  invocation = argv;
}

export function getInvocation(): string[] | undefined {
  return invocation;
}
