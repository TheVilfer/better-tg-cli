// Re-encode teleproto's generated TL schema (tl/generated/api-definitions.js, ~1.8 MB of
// verbose JSON) into a compact module that rebuilds the identical array at load time.
// Used by scripts/bundle.mjs; test/tl-compact.test.ts checks the round trip is exact.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Arg flag bits
const IS_VECTOR = 1, IS_FLAG = 2, SKIP_CID = 4, FLAG_INDICATOR = 8, UVI_SET = 16, UVI_TRUE = 32;
const FLAG_NAMES = [null, 'flags', 'flags2'];

export function encodeDefinitions(defs) {
  const strings = [];
  const index = new Map();
  const s = v => {
    if (!index.has(v)) {
      index.set(v, strings.length);
      strings.push(v);
    }
    return index.get(v);
  };

  const rows = defs.map(d => {
    const keys = Object.keys(d).join(',');
    if (keys !== 'name,constructorId,argsConfig,subclassOfId,result,isFunction' &&
        keys !== 'name,constructorId,argsConfig,subclassOfId,result,isFunction,namespace') {
      throw new Error(`Unexpected definition keys: ${keys}`);
    }
    const args = [];
    for (const [name, a] of Object.entries(d.argsConfig)) {
      if (Object.keys(a).join(',') !== 'isVector,isFlag,skipConstructorId,flagName,flagIndex,flagIndicator,type,useVectorId') {
        throw new Error(`Unexpected arg keys in ${d.name}.${name}`);
      }
      const fn = FLAG_NAMES.indexOf(a.flagName);
      if (fn < 0) throw new Error(`Unexpected flagName ${a.flagName}`);
      const bits =
        (a.isVector ? IS_VECTOR : 0) | (a.isFlag ? IS_FLAG : 0) | (a.skipConstructorId ? SKIP_CID : 0) |
        (a.flagIndicator ? FLAG_INDICATOR : 0) | (a.useVectorId !== null ? UVI_SET : 0) | (a.useVectorId === true ? UVI_TRUE : 0) |
        (fn << 6);
      args.push(s(name), a.type === null ? -1 : s(a.type), bits, a.flagIndex);
    }
    const row = [s(d.name), d.constructorId, d.subclassOfId, s(d.result), d.isFunction ? 1 : 0, args];
    if ('namespace' in d) row.push(d.namespace === undefined ? -2 : s(d.namespace));
    return row;
  });

  return { strings, rows };
}

// Decoder source, shared by the generated module and the test
export const DECODER = `function decodeDefinitions(S, R) {
  var F = [null, "flags", "flags2"];
  return R.map(function (r) {
    var cfg = {}, a = r[5];
    for (var i = 0; i < a.length; i += 4) {
      var b = a[i + 2];
      cfg[S[a[i]]] = {
        isVector: !!(b & 1), isFlag: !!(b & 2), skipConstructorId: !!(b & 4), flagName: F[b >> 6],
        flagIndex: a[i + 3], flagIndicator: !!(b & 8), type: a[i + 1] === -1 ? null : S[a[i + 1]],
        useVectorId: b & 16 ? !!(b & 32) : null,
      };
    }
    var d = { name: S[r[0]], constructorId: r[1], argsConfig: cfg, subclassOfId: r[2], result: S[r[3]], isFunction: r[4] === 1 };
    if (r.length > 6) d.namespace = r[6] === -2 ? undefined : S[r[6]];
    return d;
  });
}`;

export function compactModuleSource(defs) {
  const { strings, rows } = encodeDefinitions(defs);
  return `"use strict";\n${DECODER}\nmodule.exports = decodeDefinitions(${JSON.stringify(strings)}, ${JSON.stringify(rows)});\n`;
}

export function loadOriginalDefinitions() {
  return require('teleproto/tl/generated/api-definitions.js');
}
