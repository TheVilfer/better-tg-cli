import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

export const REPO = "TheVilfer/better-tg-cli";
export const releaseBase = (version: string) =>
  `https://github.com/${REPO}/releases/download/v${version}`;
export const assetName = (version: string, target: string, ext: string) =>
  `better-tg-cli-${version}-${target}.${ext}`;

export type ArchiveFormat = "tar.gz" | "tar.xz";

/**
 * - `reports`: What the fake binary prints for --version (default: the release version)
 * - `versionExit`: Exit status of the fake binary's --version (default 0)
 * - `unlisted`: Asset names left out of SHA256SUMS
 * - `tampered`: Asset names whose bytes change after SHA256SUMS was written
 */
export interface ReleaseFixtureOptions {
  version: string;
  targets: string[];
  formats: ArchiveFormat[];
  reports?: string;
  versionExit?: number;
  unlisted?: string[];
  tampered?: string[];
}

const has = (cmd: string) =>
  spawnSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" }).status ===
  0;
const isBsdTar = () =>
  /bsdtar/i.test(
    spawnSync("tar", ["--version"], { encoding: "utf-8" }).stdout ?? ""
  );

/** Whether this machine can build a .tar.xz fixture (xz, or bsdtar as on macOS) */
export const canMakeXz = () => has("xz") || isBsdTar();

export function fakeTelegram(reports: string, versionExit = 0): string {
  return `#!/bin/sh\nif [ "$1" = --version ]; then printf '%s\\n' '${reports}'; exit ${versionExit}; fi\necho "fake telegram $*"\n`;
}

/** Writes the release assets into `dir` and returns their names (SHA256SUMS included) */
export function makeReleaseFixtures(
  dir: string,
  opts: ReleaseFixtureOptions
): string[] {
  mkdirSync(dir, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "btg-fixture-"));
  const names: string[] = [];
  try {
    const stage = join(work, "stage");
    mkdirSync(stage);
    writeFileSync(
      join(stage, "telegram"),
      fakeTelegram(opts.reports ?? opts.version, opts.versionExit)
    );
    chmodSync(join(stage, "telegram"), 0o755);
    writeFileSync(join(stage, "LICENSE"), "MIT\n");
    writeFileSync(join(stage, "README.md"), "# fixture\n");
    const tarFile = join(work, "a.tar");
    const tar = spawnSync("tar", [
      "-C",
      stage,
      "-cf",
      tarFile,
      "telegram",
      "LICENSE",
      "README.md",
    ]);
    if (tar.status !== 0) {
      throw new Error(`tar failed: ${tar.stderr}`);
    }
    const tarBytes = readFileSync(tarFile);
    for (const target of opts.targets) {
      for (const format of opts.formats) {
        const name = assetName(opts.version, target, format);
        if (format === "tar.gz") {
          writeFileSync(join(dir, name), gzipSync(tarBytes));
        } else {
          const r = has("xz")
            ? spawnSync("xz", ["-c", tarFile], { maxBuffer: 1 << 26 })
            : spawnSync(
                "tar",
                ["-C", stage, "-cJf", "-", "telegram", "LICENSE", "README.md"],
                { maxBuffer: 1 << 26 }
              );
          if (r.status !== 0) {
            throw new Error(`xz failed: ${r.stderr}`);
          }
          writeFileSync(join(dir, name), r.stdout);
        }
        names.push(name);
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  const sums = names
    .filter((n) => !opts.unlisted?.includes(n))
    .map(
      (n) =>
        `${createHash("sha256")
          .update(readFileSync(join(dir, n)))
          .digest("hex")}  ${n}\n`
    )
    .join("");
  writeFileSync(join(dir, "SHA256SUMS"), sums);
  for (const n of opts.tampered ?? []) {
    writeFileSync(
      join(dir, n),
      Buffer.concat([readFileSync(join(dir, n)), Buffer.from("x")])
    );
  }
  return [...names, "SHA256SUMS"];
}
