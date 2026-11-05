import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
// @ts-expect-error plain .mjs build helpers
import { compactModuleSource, loadOriginalDefinitions } from '../scripts/tl-compact.mjs';
// @ts-expect-error plain .mjs build helpers
import { compactErrorsSource, originalErrorsPath } from '../scripts/errors-compact.mjs';
// @ts-expect-error plain .mjs build helpers
import { noNativeAddon } from '../scripts/cifrante-no-native.mjs';

const require = createRequire(import.meta.url);

function evalCjs(source: string, req: NodeRequire = require): unknown {
  const mod = { exports: {} as unknown };
  new Function('module', 'exports', 'require', source)(mod, mod.exports, req);
  return mod.exports;
}

describe('bundle shrinking keeps teleproto behaviour identical', () => {
  it('TL schema: compact encoding decodes to exactly the original definitions', () => {
    const original = loadOriginalDefinitions();
    const source = compactModuleSource(original);
    const decoded = evalCjs(source);
    // Byte-identical JSON also proves key order (argsConfig order drives serialization)
    expect(JSON.stringify(decoded)).toBe(JSON.stringify(original));
    expect(source.length).toBeLessThan(JSON.stringify(original).length / 4);
  });

  it('RPC errors: every generated class matches the original class', () => {
    const originalPath = originalErrorsPath();
    // Evaluate the compact module next to the original so its relative requires resolve
    const dir = mkdtempSync(join(tmpdir(), 'tg-errors-'));
    const compactPath = join(dirname(originalPath), `__compact_${process.pid}.js`);
    try {
      writeFileSync(compactPath, compactErrorsSource(readFileSync(originalPath, 'utf8')));
      const A = require(originalPath);
      const B = require(compactPath);
      expect(Object.keys(B).sort()).toEqual(Object.keys(A).sort());

      const request = { className: 'messages.SendMessage' };
      const sig = (o: Record<string, unknown>) =>
        JSON.stringify([
          o.constructor.name,
          Object.getPrototypeOf(o.constructor).name,
          o.message,
          o.errorMessage,
          o.code,
          o.seconds,
          Object.keys(o).sort(),
        ]);
      for (const name of Object.keys(A).filter(k => /Error$/.test(k) && typeof A[k] === 'function')) {
        const a = new A[name]({ request, capture: '42' });
        const b = new B[name]({ request, capture: '42' });
        expect(sig(b), name).toBe(sig(a));
      }

      const mapSig = (m: Map<unknown, { name: string }>) => JSON.stringify([...m].map(([k, v]) => [String(k), v.name]));
      expect(mapSig(B.rpcErrorsDict)).toBe(mapSig(A.rpcErrorsDict));
      expect(mapSig(B.rpcErrorsRe)).toBe(mapSig(A.rpcErrorsRe));
      expect(mapSig(B.baseErrors)).toBe(mapSig(A.baseErrors));
    } finally {
      rmSync(compactPath, { force: true });
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('the bundles never look up cifrante\'s native addon', () => {
  it('the patched cifrante skips the lookup and gives the same bytes as with CIFRANTE_NATIVE=0', async () => {
    const originalPath = require.resolve('cifrante');
    const source = readFileSync(originalPath, 'utf8');
    const patched = noNativeAddon(source, originalPath);
    expect(patched).not.toContain('CIFRANTE_NATIVE');
    expect(patched.split('\n').length).toBe(source.split('\n').length);
    // Next to the original, so its own requires resolve the same way
    const patchedPath = join(dirname(originalPath), `__nonative_${process.pid}.cjs`);
    try {
      writeFileSync(patchedPath, patched);
      process.env.CIFRANTE_NATIVE = '0'; // the original then skips the addon too
      const A = require(originalPath);
      const B = require(patchedPath);
      const bytes = (n: number, seed: number) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + seed) & 255);
      const key = bytes(32, 7);
      const data = bytes(16 * 70, 3);
      const run = async (c: typeof A) => [
        c.aes.ige(key).encryptSync(data, { iv: bytes(32, 9) }),
        c.aes.ige(key).decryptSync(data, { iv: bytes(32, 9) }),
        await c.aes.ctr(key).encrypt(data, { iv: bytes(16, 5) }),
        c.aes.ctr(key).create({ iv: bytes(16, 5) }).update(data),
        c.sha256.sync(data),
        c.sha1.sync(data),
        c.hmac.sha256.sync(key, data),
        await c.kdf.pbkdf2(data.subarray(0, 40), bytes(16, 1), { hash: 'sha512', iterations: 1000, length: 64 }),
      ].map(x => Buffer.from(x).toString('hex'));
      expect(await run(B)).toEqual(await run(A));
    } finally {
      delete process.env.CIFRANTE_NATIVE;
      rmSync(patchedPath, { force: true });
    }
  });
});
