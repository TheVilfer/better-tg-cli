import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The write guard is async (it looks up the recipients in mode "ask"). A call without `await` lets
// the write run before the approval is checked, and the types would not notice: every call must await.
describe('the write guard', () => {
  it('is awaited at every call site in src', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap(n => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
    });
    const calls: string[] = [];
    for (const f of files('src')) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*(\*|\/\/|\/\*)|^import |export async function/.test(line)) return;
        for (const m of line.matchAll(/\b(assertWriteEnabled|assertLocalWriteAllowed)\(/g)) {
          const before = line.slice(0, m.index);
          calls.push(`${f}:${i + 1}`);
          expect(/(await|return) $/.test(before), `${f}:${i + 1} ${line.trim()}`).toBe(true);
        }
      });
    }
    // The scan saw the call sites at all (a renamed function must not make this pass vacuously)
    expect(calls.length).toBeGreaterThan(40);
  });
});
