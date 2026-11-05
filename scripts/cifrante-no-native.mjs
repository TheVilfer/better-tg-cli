// Used by scripts/bundle.mjs; tested in test/bundle-shrink.test.ts.

const NATIVE_GUARD = 'if (process.env.CIFRANTE_NATIVE === "0") return;';

/**
 * cifrante looks up an optional native addon (`@cifrante/<platform>-<arch>`) through
 * createRequire(__filename). The builds ship none, and in a bundle __filename is a path from the
 * build machine, so the lookup would search node_modules folders on the user's machine and could
 * load a planted `.node` file. This makes the lookup return at once, as CIFRANTE_NATIVE=0 does:
 * cifrante then uses node:crypto, WebAssembly or JS, which is what it does without the addon.
 */
export function noNativeAddon(source, file = 'cifrante') {
  if (!source.includes(NATIVE_GUARD)) {
    if (source.includes('CIFRANTE_NATIVE')) throw new Error(`${file}: cifrante's addon loader changed, update scripts/cifrante-no-native.mjs`);
    return source;
  }
  return source.replace(NATIVE_GUARD, 'return; // no native addon in the bundle (scripts/cifrante-no-native.mjs)');
}
