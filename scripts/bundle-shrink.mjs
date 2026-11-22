import { noNativeAddon } from "./cifrante-no-native.mjs";
import { compactErrorsSource } from "./errors-compact.mjs";
import { mimeStubSource } from "./mime-stub.mjs";
import { compactModuleSource, loadOriginalDefinitions } from "./tl-compact.mjs";

const stub = (contents) => () => ({ contents, loader: "js" });

/** The Bun plugin that shrinks teleproto in a bundle (docs/internals.md, Build and size). */
export const shrink = {
  name: "shrink-teleproto",
  setup(build) {
    build.onLoad(
      { filter: /teleproto[\\/]tl[\\/]generated[\\/]api-definitions\.js$/ },
      () => ({
        contents: compactModuleSource(loadOriginalDefinitions()),
        loader: "js",
      })
    );
    build.onLoad(
      { filter: /teleproto[\\/]errors[\\/]RPCErrorList\.js$/ },
      async (args) => ({
        contents: compactErrorsSource(await Bun.file(args.path).text()),
        loader: "js",
      })
    );
    build.onLoad(
      { filter: /[\\/]cifrante[\\/]dist[\\/][^\\/]+\.c?js$/ },
      async (args) => ({
        contents: noNativeAddon(await Bun.file(args.path).text(), args.path),
        loader: "js",
      })
    );
    build.onLoad(
      { filter: /teleproto[\\/]sessions[\\/]StoreSession\.js$/ },
      stub(`"use strict";Object.defineProperty(exports,"__esModule",{value:true});
class StoreSession{constructor(){throw new Error("StoreSession is not bundled; use StringSession")}}
exports.StoreSession=StoreSession;`)
    );
    build.onResolve({ filter: /^socks$/ }, () => ({
      path: "socks-stub",
      namespace: "stub",
    }));
    build.onLoad(
      { filter: /^socks-stub$/, namespace: "stub" },
      stub(
        `exports.SocksClient={createConnection(){throw new Error("SOCKS proxies are not supported in this build")}};`
      )
    );
    build.onResolve({ filter: /^mime$/ }, () => ({
      path: "mime-stub",
      namespace: "stub",
    }));
    build.onLoad(
      { filter: /^mime-stub$/, namespace: "stub" },
      stub(mimeStubSource)
    );
  },
};
