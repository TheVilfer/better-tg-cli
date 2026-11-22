#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "..");
const template = join(repo, "templates", "plugin");
const sdk = join(repo, "packages", "plugin-sdk");
const cli = join(repo, "dist", "telegram.mjs");
const windows = process.platform === "win32";
const home = mkdtempSync(join(tmpdir(), "tg-plugin-template-"));
process.on("exit", () => rmSync(home, { recursive: true, force: true }));

const isolated = () => {
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    APPDATA: join(home, "AppData"),
    LOCALAPPDATA: join(home, "AppData", "Local"),
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_DATA_HOME: join(home, ".local", "share"),
    TG_MOCK: join(home, "mock-state.json"),
    TG_PROFILE: "",
    TG_NO_UPDATE_CHECK: "1",
  };
  for (const k of [
    "TG_APPROVE",
    "TG_MCP",
    "TG_MCP_WORKER",
    "TG_READ_ONLY",
    "OP_SERVICE_ACCOUNT_TOKEN",
  ]) {
    delete env[k];
  }
  return env;
};

function capture(cmd, args, cwd = repo) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf-8",
    shell: windows,
    env: isolated(),
  });
}

function run(what, cmd, args, cwd = repo) {
  console.log(`\n== ${what}: ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: windows,
    env: isolated(),
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

const built = "templates/plugin/dist/plugin.js";
if (capture("git", ["ls-files", "--error-unmatch", "--", built]).status !== 0) {
  console.error(
    `${built} is not in git: plugin install takes the files of a commit, so build it and commit it`
  );
  process.exit(1);
}
run("build the template", "bun", [
  join(sdk, "dist", "bin.mjs"),
  "build",
  template,
]);
const diff = capture("git", [
  "diff",
  "--exit-code",
  "--stat",
  "HEAD",
  "--",
  built,
]);
if (diff.status !== 0) {
  console.error(
    `${diff.stdout}${diff.stderr}${built} is not what its source builds to: commit the rebuilt file`
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
  "typecheck the plugin code (ES2023 only, as QuickJS runs it)",
  join(repo, "node_modules", ".bin", "tsc"),
  ["-p", "tsconfig.json"],
  template
);
run(
  "typecheck the tests",
  join(repo, "node_modules", ".bin", "tsc"),
  ["-p", "tsconfig.test.json"],
  template
);
run(
  "test the template on mock data",
  join(repo, "node_modules", ".bin", "vitest"),
  ["run"],
  template
);
console.log("\nThe plugin SDK and the template are fine.");
