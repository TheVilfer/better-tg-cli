import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { isAbsolute, join, relative, resolve } from "node:path";

import {
  anchor,
  UnsafePath,
  writeRegular,
} from "../../../src/plugins/safe-fs.js";
import { checkBundle, withoutModuleMarkers } from "./bundle-check.js";

/** The size limit of one plugin file (docs/plugins.md §3). */
export const MAX_FILE_BYTES = 1024 * 1024;

/**
 * - `entry`: The source, relative to the plugin folder (default `src/plugin.ts`).
 * - `outfile`: Where the bundle goes, relative to the folder (default: the manifest's `main`, else `dist/plugin.js`).
 */
export interface BuildOptions {
  entry?: string;
  outfile?: string;
}

/** What `buildPlugin` wrote: the file and its size. */
export interface BuildResult {
  outfile: string;
  bytes: number;
}

interface BunBuildOutput {
  success: boolean;
  logs: unknown[];
  outputs: { kind: string; path: string; text(): Promise<string> }[];
  metafile?: {
    inputs?: Record<string, unknown>;
    outputs?: Record<string, { exports?: string[] }>;
  };
}

interface BunRuntime {
  build(options: Record<string, unknown>): Promise<BunBuildOutput>;
}

const BUILTIN = new RegExp(
  `^(?:node:|bun:|(?:${builtinModules.map((m) => m.replaceAll(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})(?:/|$))`
);

interface ResolveHooks {
  onResolve(
    options: { filter: RegExp },
    callback: (args: { path: string }) => { path: string; external: true }
  ): void;
}

function builtinCatcher(found: Set<string>) {
  return {
    name: "refuse-builtins",
    setup(build: ResolveHooks) {
      build.onResolve({ filter: BUILTIN }, (args) => {
        found.add(args.path);
        return { path: args.path, external: true };
      });
    },
  };
}

function theOneModule(result: BunBuildOutput): BunBuildOutput["outputs"][0] {
  const modules = result.outputs.filter(
    (o) => o.kind === "entry-point" && /\.m?js$/.test(o.path)
  );
  if (modules.length !== 1 || result.outputs.length !== 1) {
    throw new Error(
      `The build gave ${result.outputs.map((o) => `${o.path} (${o.kind})`).join(", ")}; a plugin is one JavaScript file, so inline what it imports (no assets, chunks or source maps)`
    );
  }
  return modules[0];
}

function bunRuntime(): BunRuntime {
  const bun = (globalThis as { Bun?: BunRuntime }).Bun;
  if (!bun) {
    throw new Error(
      "tg-plugin build runs under Bun (https://bun.sh): run `bunx tg-plugin build` or `bun run build`"
    );
  }
  return bun;
}

function manifestMain(dir: string): string | undefined {
  const file = join(dir, "tg-plugin.json");
  if (!existsSync(file)) {
    return undefined;
  }
  const m = JSON.parse(readFileSync(file, "utf-8")) as { main?: unknown };
  return typeof m.main === "string" ? m.main : undefined;
}

function inside(dir: string, path: string, what: string): string {
  const full = resolve(dir, path);
  const rel = relative(dir, full);
  if (isAbsolute(path) || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`${what} must be inside the plugin folder: ${path}`);
  }
  return full;
}

/**
 * Bundles the plugin's source into one ES module without imports (`dist/plugin.js`): everything it
 * imports, the SDK's `definePlugin` included, is inlined, and the module exports `commands`. The
 * syntax and the author's strings are passed through as written; only Bun's per-module path comment
 * tokens are dropped, so the output is the same on every machine for the same Bun version. The
 * result is refused unless it is exactly one JavaScript file that parses as ES2023 (what QuickJS
 * runs) and loads no module (`import`, `export … from`, `import()`, `require`). A Node or Bun
 * built-in is refused, never polyfilled. The file is written only as a real file below the folder,
 * never through a link. Runs under Bun only.
 */
export async function buildPlugin(
  dir: string,
  options: BuildOptions = {}
): Promise<BuildResult> {
  const bun = bunRuntime();
  const root = resolve(dir);
  const entry = inside(root, options.entry ?? "src/plugin.ts", "The entry");
  const outfile = inside(
    root,
    options.outfile ?? manifestMain(root) ?? "dist/plugin.js",
    "The output"
  );
  const builtins = new Set<string>();
  const result = await bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "esm",
    minify: false,
    splitting: false,
    sourcemap: "none",
    metafile: true,
    plugins: [builtinCatcher(builtins)],
  });
  if (!result.success) {
    throw new Error(`The build failed:\n${result.logs.map(String).join("\n")}`);
  }
  if (builtins.size) {
    throw new Error(
      `The plugin imports ${[...builtins].sort().join(", ")}: the sandbox has no Node or Bun modules (no files, processes or network of its own), so use the host API instead`
    );
  }
  const artifact = theOneModule(result);
  const code = `${withoutModuleMarkers(
    await artifact.text(),
    Object.keys(result.metafile?.inputs ?? {})
  ).trim()}\n`;
  const exported = checkBundle(code);
  const meta = Object.entries(result.metafile?.outputs ?? {});
  if (
    meta.length !== 1 ||
    !meta[0][1].exports?.includes("commands") ||
    meta[0][1].exports.length !== exported.length
  ) {
    throw new Error(
      `The bundle does not export \`commands\` (Bun reports ${meta.map(([, o]) => (o.exports ?? []).join(", ") || "nothing").join("; ") || "no output"})`
    );
  }
  const bytes = Buffer.byteLength(code);
  if (bytes > MAX_FILE_BYTES) {
    throw new Error(
      `The bundle is ${bytes} bytes; a plugin file may have at most ${MAX_FILE_BYTES}`
    );
  }
  const rel = relative(root, outfile).split("\\").join("/");
  try {
    writeRegular(anchor(root), rel, code, { fileMode: 0o644, dirMode: 0o755 });
  } catch (error) {
    if (error instanceof UnsafePath) {
      throw new Error(
        `The output is not written: ${error.message} (a build writes only real files and folders inside the plugin folder, never through a link)`,
        { cause: error }
      );
    }
    throw error;
  }
  return { outfile: rel, bytes };
}
