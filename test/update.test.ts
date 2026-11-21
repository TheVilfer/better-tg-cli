import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  compareVersions,
  detectInstall,
  updateCommandFor,
} from "../src/update.js";

describe(compareVersions, () => {
  it("orders numerically, not lexically", () => {
    expect(compareVersions("0.10.0", "0.9.9")).toBe(1);
    expect(compareVersions("0.17.0", "0.17.0")).toBe(0);
    expect(compareVersions("0.17.0", "1.0.0")).toBe(-1);
  });

  it("puts a release candidate before its release and orders candidates by number", () => {
    expect(compareVersions("0.35.0-rc.1", "0.35.0")).toBe(-1);
    expect(compareVersions("0.35.0", "0.35.0-rc.2")).toBe(1);
    expect(compareVersions("0.35.0-rc.10", "0.35.0-rc.9")).toBe(1);
    expect(compareVersions("0.35.0-rc.1", "0.35.0-rc.1")).toBe(0);
    expect(compareVersions("0.34.0", "0.35.0-rc.1")).toBe(-1);
  });
});

describe(detectInstall, () => {
  it("standalone binary under the Homebrew Cellar → brew", () => {
    expect(
      detectInstall(
        "/opt/homebrew/Cellar/better-tg-cli/0.17.0/bin/telegram",
        "",
        true
      )
    ).toEqual({ kind: "brew" });
    expect(
      detectInstall(
        "/home/linuxbrew/.linuxbrew/Cellar/better-tg-cli/0.17.0/bin/telegram",
        "",
        true
      ).kind
    ).toBe("brew");
  });

  it("standalone binary elsewhere → manual download", () => {
    expect(detectInstall("/usr/local/bin/telegram", "", true)).toEqual({
      kind: "binary",
      path: "/usr/local/bin/telegram",
    });
    expect(updateCommandFor({ kind: "binary", path: "/x" })).toMatch(
      /releases\/latest/
    );
  });

  describe("a binary placed by install.sh", () => {
    const line = (path: string) => ({
      schema: 1,
      package: "better-tg-cli",
      manager: "user-binary",
      path,
      version: "0.40.0",
      tag: "v0.40.0",
      target: "darwin-arm64",
      archive: "telegram-darwin-arm64.tar.xz",
      sha256: "a".repeat(64),
      binarySha256: "b".repeat(64),
      installedAt: "2026-11-19T00:00:00Z",
    });
    const placed = (manifest: (bin: string) => object | string) => {
      const dir = realpathSync(mkdtempSync(join(tmpdir(), "btg-it's-")));
      const bin = join(dir, "telegram");
      writeFileSync(bin, "bin");
      const m = manifest(bin);
      writeFileSync(
        join(dir, "install.json"),
        typeof m === "string" ? m : `${JSON.stringify(m)}\n`
      );
      return { dir, bin };
    };

    it("is told to run the install script again, never to replace the file", () => {
      const { dir, bin } = placed(line);
      const got = detectInstall(bin, "", true);
      expect(got).toEqual({ kind: "script", path: bin, dir });
      const cmd = updateCommandFor(got);
      expect(cmd).toBe(
        `curl -q --proto '=https' --tlsv1.2 -fsSL https://github.com/TheVilfer/better-tg-cli/releases/latest/download/install.sh | TG_INSTALL_DIR='${dir.replace("'", "'\\''")}' sh`
      );
      expect(cmd).not.toMatch(/replace/);
    });

    it("names the folder as install.json spells it when run through a symlink", () => {
      const { dir } = placed(line);
      const link = join(
        realpathSync(mkdtempSync(join(tmpdir(), "btg-link-"))),
        "bin"
      );
      symlinkSync(dir, link);
      const got = detectInstall(join(link, "telegram"), "", true);
      expect(got).toMatchObject({ kind: "script", dir });
      expect(updateCommandFor(got)).toContain(
        `TG_INSTALL_DIR='${dir.replace("'", "'\\''")}' sh`
      );
    });

    it("needs the manifest of install.sh naming this very file", () => {
      expect(
        detectInstall(placed((bin) => line(`${bin}-other`)).bin, "", true).kind
      ).toBe("binary");
      expect(
        detectInstall(
          placed((bin) => ({ ...line(bin), manager: "npm" })).bin,
          "",
          true
        ).kind
      ).toBe("binary");
      expect(detectInstall(placed(() => "{not json").bin, "", true).kind).toBe(
        "binary"
      );
    });
  });

  it("script inside node_modules → npm", () => {
    expect(
      detectInstall(
        "/usr/bin/node",
        "/usr/lib/node_modules/better-tg-cli/dist/telegram.mjs",
        false
      )
    ).toEqual({ kind: "npm" });
  });

  it("script inside a git checkout → source", () => {
    const root = mkdtempSync(join(tmpdir(), "btg-"));
    mkdirSync(join(root, ".git"));
    mkdirSync(join(root, "dist"));
    const got = detectInstall(
      "/usr/bin/node",
      join(root, "dist", "telegram.mjs"),
      false
    );
    expect(got.kind).toBe("source");
    expect(updateCommandFor(got)).toContain("pull --ff-only");
  });
});

describe("detectInstall on Windows", () => {
  it("knows Scoop and npm paths with backslashes", () => {
    expect(
      detectInstall(
        "C:\\Users\\a\\scoop\\apps\\better-tg-cli\\current\\telegram.exe",
        "",
        true
      )
    ).toEqual({ kind: "scoop" });
    expect(updateCommandFor({ kind: "scoop" })).toBe(
      "scoop update better-tg-cli"
    );
    expect(
      detectInstall(
        "C:\\Program Files\\nodejs\\node.exe",
        "C:\\Users\\a\\AppData\\Roaming\\npm\\node_modules\\better-tg-cli\\dist\\telegram.mjs",
        false
      )
    ).toEqual({ kind: "npm" });
    expect(detectInstall("C:\\tools\\telegram.exe", "", true)).toEqual({
      kind: "binary",
      path: "C:\\tools\\telegram.exe",
    });
  });
});

describe("isCompiledBinary", () => {
  it("only the embedded /$bunfs path counts, not `bun src/index.ts`", async () => {
    const { isCompiledBinary } = await import("../src/update.js");
    const had = process.versions.bun;
    Object.defineProperty(process.versions, "bun", {
      value: "1.3.0",
      configurable: true,
    });
    try {
      expect(isCompiledBinary("/$bunfs/root/telegram")).toBe(true);
      expect(isCompiledBinary("/Users/x/better-tg-cli/src/index.ts")).toBe(
        false
      );
    } finally {
      if (had === undefined) {
        delete (process.versions as Record<string, string>).bun;
      }
    }
  });
});

describe("README update advice", () => {
  const ROOT = fileURLToPath(new URL("..", import.meta.url));

  it.each([
    [
      "README.md",
      /npm or a release binary/,
      /install script[^.]*again/g,
      /do not replace (that|the) binary by hand/gi,
    ],
    [
      "README.ru.md",
      /npm или бинарник из релиза/,
      /(скрипта|скрипт)[^.]*ещё раз|повторным запуском скрипта/g,
      /не заменяйте[^.]*бинарник вручную/gi,
    ],
    [
      "README.es.md",
      /npm o un binario de release/,
      /script[^.]*otra vez|vuelve a ejecutarlo/g,
      /no reemplaces[^.]*binario a mano/gi,
    ],
  ])("%s", (file, stale, rerun, noReplace) => {
    const doc = readFileSync(join(ROOT, file), "utf-8");
    expect(doc).not.toMatch(stale);
    expect(doc.match(rerun)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(doc.match(noReplace)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
