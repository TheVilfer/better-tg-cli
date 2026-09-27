#!/usr/bin/env bun
// Build the shipped artifacts with Bun, shrinking teleproto on the way:
//   bun scripts/bundle.mjs node            → dist/telegram.mjs (single file for npm, no deps)
//   bun scripts/bundle.mjs <bun-target> <outfile>   → standalone binary (bun-darwin-arm64, …)
import { compactModuleSource, loadOriginalDefinitions } from './tl-compact.mjs';
import { compactErrorsSource } from './errors-compact.mjs';

const stub = contents => () => ({ contents, loader: 'js' });

// Common extensions only: teleproto uses mime to decide photo vs. document vs. audio
const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  bmp: 'image/bmp', heic: 'image/heic', tif: 'image/tiff', tiff: 'image/tiff', svg: 'image/svg+xml',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/opus',
  wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  pdf: 'application/pdf', zip: 'application/zip', json: 'application/json', txt: 'text/plain',
  md: 'text/markdown', csv: 'text/csv', html: 'text/html',
};

const shrink = {
  name: 'shrink-teleproto',
  setup(build) {
    // 1.8 MB verbose schema → ~0.3 MB compact encoding decoded at load (identical objects)
    build.onLoad({ filter: /teleproto[\\/]tl[\\/]generated[\\/]api-definitions\.js$/ }, () => ({
      contents: compactModuleSource(loadOriginalDefinitions()),
      loader: 'js',
    }));
    // ~700 generated error classes → a table plus one generator (same classes and messages)
    build.onLoad({ filter: /teleproto[\\/]errors[\\/]RPCErrorList\.js$/ }, async args => ({
      contents: compactErrorsSource(await Bun.file(args.path).text()),
      loader: 'js',
    }));
    // Unused session backend: pulls store2 + node-localstorage (the source of Node's localStorage warning)
    build.onLoad(
      { filter: /teleproto[\\/]sessions[\\/]StoreSession\.js$/ },
      stub(`"use strict";Object.defineProperty(exports,"__esModule",{value:true});
class StoreSession{constructor(){throw new Error("StoreSession is not bundled; use StringSession")}}
exports.StoreSession=StoreSession;`)
    );
    // Proxies are not supported by the CLI: drop socks, ip-address, smart-buffer
    build.onResolve({ filter: /^socks$/ }, () => ({ path: 'socks-stub', namespace: 'stub' }));
    build.onLoad(
      { filter: /^socks-stub$/, namespace: 'stub' },
      stub(`exports.SocksClient={createConnection(){throw new Error("SOCKS proxies are not supported in this build")}};`)
    );
    build.onResolve({ filter: /^mime$/ }, () => ({ path: 'mime-stub', namespace: 'stub' }));
    build.onLoad(
      { filter: /^mime-stub$/, namespace: 'stub' },
      stub(`const M=${JSON.stringify(MIME)};
exports.default=exports;exports.getType=function(p){var m=/\\.([^./\\\\]+)$/.exec(String(p).toLowerCase());return m&&M[m[1]]||null};`)
    );
  },
};

const [mode, outfile] = process.argv.slice(2);
const common = { entrypoints: ['src/index.ts'], minify: true, plugins: [shrink], metafile: !!process.env.BUNDLE_META };

const result =
  mode === 'node'
    ? await Bun.build({ ...common, target: 'node', outdir: 'dist', naming: 'telegram.mjs' })
    : await Bun.build({ ...common, compile: { target: mode, outfile } });

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
if (process.env.BUNDLE_META) await Bun.write(process.env.BUNDLE_META, JSON.stringify(result.metafile));
for (const out of result.outputs) console.log(`${out.path}  ${(out.size / 1048576).toFixed(2)} MB`);
