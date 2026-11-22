const FILE = "__bundleFilename";
const DIR = "__bundleDirname";
const URL_NAME = "__bundleUrl";

const BANNERS = {
  cjs: `var ${FILE}=__filename,${DIR}=__dirname,${URL_NAME}=require("node:url").pathToFileURL(__filename).href;`,
  esm: `import{fileURLToPath as __bundlePath}from"node:url";import{dirname as __bundleDir}from"node:path";const ${URL_NAME}=import.meta.url,${FILE}=__bundlePath(${URL_NAME}),${DIR}=__bundleDir(${FILE});`,
};

/**
 * Bun.build options that keep the build machine's paths out of a Node bundle. Bun replaces
 * `__filename` and `__dirname` of every bundled module (and `import.meta.url`, `dirname`,
 * `filename`, `dir`, `path` in a CJS bundle) with the absolute path of its source file. These
 * `define`s point them at names the banner sets at run time from the bundle's own file instead
 * (docs/internals.md, Build and size).
 */
export function runtimePaths(format) {
  const banner = BANNERS[format];
  if (!banner) {
    throw new Error(`runtimePaths: no banner for the format ${format}`);
  }
  return {
    banner,
    define: {
      __filename: FILE,
      __dirname: DIR,
      "import.meta.url": URL_NAME,
      "import.meta.filename": FILE,
      "import.meta.path": FILE,
      "import.meta.dirname": DIR,
      "import.meta.dir": DIR,
    },
  };
}
