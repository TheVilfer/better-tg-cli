import { describe, expect, it, vi } from "vitest";

vi.mock(import("node:fs"), async (orig) => {
  const real = await orig<typeof import("fs")>();
  return {
    ...real,
    readFileSync: ((p: unknown, ...rest: unknown[]) =>
      p === 0
        ? "unapproved body"
        : (real.readFileSync as (...a: unknown[]) => unknown)(
            p,
            ...rest
          )) as typeof real.readFileSync,
  };
});

import { readStdinOnce, sealStdin, stdinWasRead } from "../src/text.js";

describe("stdin after an approval that did not cover it", () => {
  it("can no longer be read, so no unapproved body reaches a write", () => {
    expect(stdinWasRead()).toBe(false);
    sealStdin();
    expect(() => readStdinOnce()).toThrow(/approval did not cover stdin/);
    expect(stdinWasRead()).toBe(false);
  });
});
