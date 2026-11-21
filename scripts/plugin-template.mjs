#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "..");
const template = join(repo, "templates", "plugin");
const sdk = join(repo, "packages", "plugin-sdk");
const cli = join(repo, "dist", "telegram.mjs");
const windows = process.platform === "win32";

function run(what, cmd, args, cwd = repo) {
  console.log(`\n== ${what}: ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: windows,
    env: { ...process.env, TG_NO_UPDATE_CHECK: "1" },
  });
  if (r.status !== 0) {
    console.error(`${what} failed`);
    process.exit(r.status ?? 1);
  }
}

run("build the SDK", "bun", [join(sdk, "scripts", "build.mjs")]);
if (!existsSync(cli)) {
  console.error(`${cli} is missing: run npm run build first`);
  process.exit(1);
}

const scope = join(template, "node_modules", "@better-tg");
const link = join(scope, "plugin-sdk");
mkdirSync(scope, { recursive: true });
rmSync(link, { recursive: true, force: true });
symlinkSync(
  windows ? sdk : relative(scope, sdk),
  link,
  windows ? "junction" : "dir"
);

const before = readFileSync(join(template, "dist", "plugin.js"), "utf-8");
run("build the template", "bun", [
  join(sdk, "dist", "bin.mjs"),
  "build",
  template,
]);
if (readFileSync(join(template, "dist", "plugin.js"), "utf-8") !== before) {
  console.error(
    "templates/plugin/dist/plugin.js is not what its source builds to: run npm run template:check and commit the result"
  );
  process.exit(1);
}
run("validate the template", process.execPath, [
  cli,
  "plugin",
  "validate",
  template,
]);
run(
  "typecheck the template",
  join(repo, "node_modules", ".bin", "tsc"),
  ["-p", "tsconfig.json"],
  template
);
run(
  "test the template on mock data",
  join(repo, "node_modules", ".bin", "vitest"),
  ["run"],
  template
);
console.log("\nThe plugin SDK and the template are fine.");
