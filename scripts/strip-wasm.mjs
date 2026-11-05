// Used by scripts/bundle.mjs for the Claude plugin build; tested in test/bundle-shrink.test.ts.

/** Removes the WebAssembly modules from cifrante, so `wasm()` finds none and the JS paths run. */
export function stripWasm(source, file = 'cifrante') {
  const guard = 'if (typeof WebAssembly === "undefined") return;';
  if (!source.includes(guard)) {
    if (/AGFzbQ/.test(source)) throw new Error(`${file}: WebAssembly loader changed, update scripts/strip-wasm.mjs`);
    return source;
  }
  const out = source
    .replace(guard, 'return; // the Claude plugin build ships no WebAssembly (scripts/bundle.mjs)')
    .replace(/"AGFzbQ[A-Za-z0-9+/=]*"/g, '""');
  if (/AGFzbQ/.test(out)) throw new Error(`${file}: WebAssembly left after stripWasm`);
  return out;
}
