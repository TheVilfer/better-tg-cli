#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { shrink } from "../../../scripts/bundle-shrink.mjs";

const pkg = resolve(import.meta.dirname, "..");
const repo = resolve(pkg, "../..");
const own = join(pkg, "dist");
const outArg = process.argv[2];
const out = outArg ? resolve(outArg) : own;

function emptyFolder(path) {
  const st = lstatSync(path);
  return st.isDirectory() && readdirSync(path).length === 0;
}

if (out !== own && existsSync(out) && !emptyFolder(out)) {
  console.error(
    `${out} exists and is not an empty folder: the SDK builds into packages/plugin-sdk/dist, or into a new or empty folder, and never replaces anything else`
  );
  process.exit(2);
}
const stage = mkdtempSync(join(dirname(out), ".sdk-build-"));

const PUBLIC_TYPES = [
  "index",
  "host",
  "build",
  "cli",
  "test",
  "generated/manifest",
];

async function bundle(entries, options) {
  const result = await Bun.build({
    entrypoints: entries.map((e) => join(pkg, "src", `${e}.ts`)),
    outdir: stage,
    naming: "[name].mjs",
    target: "node",
    format: "esm",
    ...options,
  });
  if (!result.success) {
    throw new Error(`Bun.build failed:\n${result.logs.join("\n")}`);
  }
}

function declarations() {
  const tmp = mkdtempSync(join(tmpdir(), "tg-sdk-types-"));
  try {
    const r = spawnSync(
      join(repo, "node_modules", ".bin", "tsc"),
      ["-p", join(pkg, "tsconfig.build.json"), "--outDir", tmp],
      { stdio: "inherit", shell: process.platform === "win32" }
    );
    if (r.status !== 0) {
      throw new Error("tsc could not emit the declarations");
    }
    for (const name of PUBLIC_TYPES) {
      const from = join(tmp, "packages", "plugin-sdk", "src", `${name}.d.ts`);
      const to = join(stage, `${name}.d.ts`);
      const text = readFileSync(from, "utf-8").replaceAll(
        /^import\s+["'][^"']+["'];\n/gm,
        ""
      );
      const reach =
        /from\s+["'](\.\.?\/[^"']+)["']|import\s+["'](\.\.?\/[^"']+)["']/g;
      for (const m of text.matchAll(reach)) {
        const target = (m[1] ?? m[2]).replace(/\.js$/, "");
        const resolved = join(dirname(name), target).split("\\").join("/");
        if (!PUBLIC_TYPES.includes(resolved)) {
          throw new Error(
            `${name}.d.ts reaches ${m[1] ?? m[2]}, which is not part of the SDK's public types`
          );
        }
      }
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, text);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

try {
  await bundle(["index", "build"], { minify: false });
  await bundle(["bin"], { minify: false });
  await bundle(["test"], { minify: true, plugins: [shrink] });
  declarations();
  const bin = join(stage, "bin.mjs");
  const text = readFileSync(bin, "utf-8");
  writeFileSync(
    bin,
    text.startsWith("#!") ? text : `#!/usr/bin/env bun\n${text}`
  );
  chmodSync(bin, 0o755);
  if (out === own) {
    rmSync(out, { recursive: true, force: true });
  } else if (existsSync(out)) {
    rmdirSync(out);
  }
  renameSync(stage, out);
  chmodSync(out, 0o755);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
console.log(`${out}: index, build, bin, test and their types`);
