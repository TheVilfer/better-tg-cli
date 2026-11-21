import { describe, expect, it, vi } from "vitest";

const reads: boolean[] = [];
vi.mock(import("../src/write-store.js"), async (orig) => ({
  ...(await orig<typeof import("../src/write-store.js")>()),
  getWriteValue: (fresh = false) => {
    reads.push(fresh);
    return "ask";
  },
}));
vi.mock(import("../src/paths.js"), async (orig) => ({
  ...(await orig<typeof import("../src/paths.js")>()),
  isMock: () => false,
}));

const { gateWrite } = await import("../src/mcp.js");

describe("gateWrite", () => {
  it("reads the write mode past the process cache before every write", async () => {
    const plan = { argv: ["send", "me", "x"], readOnly: false } as Parameters<
      typeof gateWrite
    >[0];
    await gateWrite(plan, {}, undefined);
    expect(reads).toEqual([true]);
  });
});
