import { describe, expect, it } from 'vitest';
import { spawnAsync } from '../src/spawn-async.js';

// The asynchronous child-process read the secret stores use for a plugin request (review #10).
// Only `node -e` runs here: no secret store, no `security`, no network.
const node = process.execPath;

describe('spawnAsync', () => {
  it('gives the exit code, stdout and stderr, and feeds stdin', async () => {
    const r = await spawnAsync(node, ['-e', 'process.stdin.on("data", d => process.stdout.write("got " + d)); process.stdin.on("end", () => { process.stderr.write("err"); process.exit(3); })'], { timeout: 10_000, input: 'abc' });
    expect(r).toMatchObject({ status: 3, stdout: 'got abc', stderr: 'err' });
    expect(r.error).toBeUndefined();
    expect(await spawnAsync(node, ['-e', 'process.stdout.write("ok")'], { timeout: 10_000 })).toMatchObject({ status: 0, stdout: 'ok' });
  });

  it('a missing binary resolves with an error, never throws', async () => {
    const r = await spawnAsync('/nonexistent/tg-test-binary', [], { timeout: 10_000 });
    expect(r.error).toBeInstanceOf(Error);
    expect(r.status).not.toBe(0);
  });

  it('an abort kills the child and resolves at once; an aborted signal never starts one', async () => {
    const ac = new AbortController();
    const started = Date.now();
    const p = spawnAsync(node, ['-e', 'setTimeout(() => {}, 20000)'], { timeout: 30_000, signal: ac.signal });
    setTimeout(() => ac.abort(), 200);
    const r = await p;
    expect(r.error).toBeInstanceOf(Error);
    expect(Date.now() - started).toBeLessThan(5000);
    const again = await spawnAsync(node, ['-e', ''], { timeout: 10_000, signal: ac.signal });
    expect(again.error).toBeInstanceOf(Error);
  });

  it('the timeout kills a child that hangs', async () => {
    const started = Date.now();
    const r = await spawnAsync(node, ['-e', 'setTimeout(() => {}, 20000)'], { timeout: 300 });
    expect(r.error).toBeInstanceOf(Error);
    expect(Date.now() - started).toBeLessThan(5000);
  });
});
