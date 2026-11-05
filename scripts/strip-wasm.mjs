// Used by scripts/bundle.mjs for the Claude plugin build; tested in test/bundle-shrink.test.ts.

const WASM_GUARD = 'if (typeof WebAssembly === "undefined") return;';
const NATIVE_GUARD = 'if (process.env.CIFRANTE_NATIVE === "0") return;';

/**
 * cifrante for the Claude plugin: plain JS and node:crypto only.
 * - Its WebAssembly modules (base64 in the source) are removed, so `wasm()` finds none.
 * - Its optional native addon (`@cifrante/<platform>-<arch>`) is never looked up. The plugin build
 *   has no node_modules, and the bundle's relative `__filename` would make that lookup start from
 *   the current directory, so a project could plant a `.node` file the server would load.
 * Every cipher and hash in cifrante falls back to node:crypto or JS when neither is there.
 */
export function stripWasm(source, file = 'cifrante') {
  if (!source.includes(WASM_GUARD) || !source.includes(NATIVE_GUARD)) {
    if (/AGFzbQ|CIFRANTE_NATIVE/.test(source)) throw new Error(`${file}: cifrante's loaders changed, update scripts/strip-wasm.mjs`);
    return source;
  }
  const out = source
    .replace(WASM_GUARD, 'return; // the Claude plugin build ships no WebAssembly (scripts/strip-wasm.mjs)')
    .replace(NATIVE_GUARD, 'return; // the Claude plugin build never loads a native addon (scripts/strip-wasm.mjs)')
    .replace(/"AGFzbQ[A-Za-z0-9+/=]*"/g, '""');
  if (/AGFzbQ|CIFRANTE_NATIVE/.test(out)) throw new Error(`${file}: WebAssembly or the native addon left after stripWasm`);
  return out;
}
