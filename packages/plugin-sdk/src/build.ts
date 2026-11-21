import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

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
  outputs: { text(): Promise<string> }[];
  metafile?: { inputs?: Record<string, unknown> };
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

function withoutModuleMarkers(code: string, inputs: string[]): string {
  const markers = new Set(inputs.map((path) => `// ${path}`));
  return code
    .split("\n")
    .filter((line) => !markers.has(line))
    .join("\n");
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
 * syntax and the author's strings are passed through as written (QuickJS runs ES2023); only Bun's
 * per-module path comments are dropped, so the output is the same on every machine for the same Bun
 * version. A Node or Bun built-in is refused, never polyfilled. Runs under Bun only.
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
  const code = `${withoutModuleMarkers(
    await result.outputs[0].text(),
    Object.keys(result.metafile?.inputs ?? {})
  ).trim()}\n`;
  if (!/\bexport\s*\{[^}]*\bcommands\b[^}]*\}/.test(code)) {
    throw new Error(
      "The bundle does not export `commands`: export it from the entry (export const { commands } = definePlugin({ … }))"
    );
  }
  const bytes = Buffer.byteLength(code);
  if (bytes > MAX_FILE_BYTES) {
    throw new Error(
      `The bundle is ${bytes} bytes; a plugin file may have at most ${MAX_FILE_BYTES}`
    );
  }
  mkdirSync(dirname(outfile), { recursive: true });
  writeFileSync(outfile, code);
  return { outfile: relative(root, outfile).split("\\").join("/"), bytes };
}
