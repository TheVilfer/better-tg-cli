import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("the write guard", () => {
  it("is awaited at every call site in src", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        return statSync(p).isDirectory()
          ? files(p)
          : p.endsWith(".ts")
            ? [p]
            : [];
      });
    const calls: string[] = [];
    for (const f of files("src")) {
      readFileSync(f, "utf-8")
        .split("\n")
        .forEach((line, i) => {
          if (/^\s*(\*|\/\/|\/\*)|^import |export async function/.test(line)) {
            return;
          }
          for (const m of line.matchAll(
            /\b(assertWriteEnabled|assertLocalWriteAllowed)\(/g
          )) {
            const before = line.slice(0, m.index);
            calls.push(`${f}:${i + 1}`);
            expect(
              /(await|return) $/.test(before),
              `${f}:${i + 1} ${line.trim()}`
            ).toBe(true);
          }
        });
    }
    expect(calls.length).toBeGreaterThan(40);
  });
});
