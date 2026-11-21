// install.sh against local fixture archives: no network. A curated PATH holds symlinks to the real
// tools the script uses plus fake `uname`, `curl` and `wget`; the fakes serve files only for the
// pinned release URL, so the test also proves which tag the script asks for. A fake `wget` only
// logs: the script must never call it.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { SetupResult } from "../src/setup-contract.js";
import { detectInstall, updateCommandFor } from "../src/update.js";
import {
  assetName,
  canMakeXz,
  makeReleaseFixtures,
  releaseBase,
} from "./helpers/release-fixtures.js";
import type { ReleaseFixtureOptions } from "./helpers/release-fixtures.js";
import { setupExitCode, setupResultErrors } from "./setup-contract-check.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCRIPT = join(ROOT, "install.sh");
const VERSION: string = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf-8")
).version;
const which = (cmd: string) => {
  const r = spawnSync("sh", ["-c", `command -v ${cmd}`], { encoding: "utf-8" });
  return r.status === 0 ? r.stdout.trim() : null;
};
// Every external command install.sh may call, besides the faked ones (no cmp: Fedora and RHEL
// images lack it)
const TOOLS = [
  "awk",
  "cat",
  "chmod",
  "cp",
  "cut",
  "date",
  "grep",
  "gzip",
  "head",
  "ln",
  "ls",
  "mkdir",
  "mktemp",
  "mv",
  "rm",
  "rmdir",
  "sed",
  "sleep",
  "tar",
  "tr",
  "sha256sum",
  "shasum",
  "openssl",
  "xz",
  "sysctl",
];
// Linux CI runs /bin/sh as dash already; elsewhere try dash too when it is installed
const SHELLS = [
  ...new Set(["/bin/sh", which("dash")].filter((s): s is string => !!s)),
];

const FAKE_UNAME = `#!/bin/sh
case "$1" in -s) echo "$FAKE_OS" ;; -m) echo "$FAKE_ARCH" ;; *) echo "$FAKE_OS" ;; esac
`;
// curl -q -fsSL ... -w '%{http_code}' -o FILE URL. FAKE_PLANT: a file another process creates
// while the archive downloads
const FAKE_CURL = `#!/bin/sh
printf 'curl %s\\n' "$*" >> "$FAKE_LOG"
out=''; fmt=''; url=''
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out=$2; shift 2 ;;
    -w) fmt=$2; shift 2 ;;
    --proto | --proto-redir | --retry | --connect-timeout) shift 2 ;;
    -*) shift ;;
    *) url=$1; shift ;;
  esac
done
[ -n "$FAKE_DL_EXIT" ] && exit "$FAKE_DL_EXIT"
case "$url" in *.tar.*) [ -n "$FAKE_PLANT" ] && printf 'planted\\n' > "$FAKE_PLANT" ;; esac
# FAKE_PLANT_DIR: a file another process swaps for a folder while the archive downloads
case "$url" in *.tar.*) [ -n "$FAKE_PLANT_DIR" ] && { rm -f "$FAKE_PLANT_DIR"; mkdir "$FAKE_PLANT_DIR"; } ;; esac
# FAKE_OVERLAP: a folder held while the archive downloads; two runs inside the lock at once log it
if [ -n "$FAKE_OVERLAP" ]; then
  case "$url" in *.tar.*) mkdir "$FAKE_OVERLAP" 2>/dev/null || echo OVERLAP >> "$FAKE_LOG"; sleep 0.3; rmdir "$FAKE_OVERLAP" 2>/dev/null ;; esac
fi
name=\${url#"$FAKE_BASE"/}
if [ "$name" != "$url" ] && [ -f "$FAKE_RELEASE/$name" ]; then cp "$FAKE_RELEASE/$name" "$out"; [ -n "$fmt" ] && printf 200; exit 0; fi
[ -n "$fmt" ] && printf 404
exit 22
`;
const FAKE_WGET = `#!/bin/sh
printf 'wget %s\\n' "$*" >> "$FAKE_LOG"
exit 1
`;

interface Sandbox {
  root: string;
  home: string;
  bin: string;
  release: string;
  log: string;
  installDir: string;
}

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
  json: {
    schema: number;
    ok: boolean;
    problems: {
      id: string;
      severity: string;
      message: string;
      fix: Record<string, string>;
    }[];
    data: {
      manager: string;
      version: string;
      tag: string;
      target: string | null;
      dir: string | null;
      path: string | null;
      onPath: boolean | null;
      active: string | null;
    };
  };
  requests: string[];
}

const sandboxes: string[] = [];
afterEach(() => {
  for (const dir of sandboxes.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function sandbox(
  opts: {
    downloader?: "curl" | "wget" | "none";
    xz?: boolean;
    omit?: string[];
    extraBin?: Record<string, string>;
  } = {}
): Sandbox {
  // realpath: macOS tmpdir is a symlink (/var → /private/var), the script reports resolved paths
  const root = realpathSync(mkdtempSync(join(tmpdir(), "btg-install-")));
  sandboxes.push(root);
  const s: Sandbox = {
    root,
    home: join(root, "home"),
    bin: join(root, "tools"),
    release: join(root, "release"),
    log: join(root, "requests.log"),
    installDir: join(root, "home", ".local", "bin"),
  };
  mkdirSync(s.home, { recursive: true });
  mkdirSync(s.bin);
  writeFileSync(s.log, "");
  const fakes: Record<string, string> = { uname: FAKE_UNAME, ...opts.extraBin };
  const dl = opts.downloader ?? "curl";
  if (dl === "curl") {
    fakes.curl = FAKE_CURL;
  }
  if (dl === "wget") {
    fakes.wget = FAKE_WGET;
  }
  // A faked tool is never linked: writing the fake would go through the link into the real one
  for (const tool of TOOLS) {
    if (
      (tool === "xz" && opts.xz === false) ||
      opts.omit?.includes(tool) ||
      tool in fakes
    ) {
      continue;
    }
    const path = which(tool);
    if (path) {
      symlinkSync(path, join(s.bin, tool));
    }
  }
  for (const [name, body] of Object.entries(fakes)) {
    writeFileSync(join(s.bin, name), body, { flag: "wx" });
    chmodSync(join(s.bin, name), 0o755);
  }
  return s;
}

function release(s: Sandbox, opts: Partial<ReleaseFixtureOptions> = {}) {
  makeReleaseFixtures(s.release, {
    version: VERSION,
    targets: ["linux-x64", "linux-arm64", "darwin-arm64", "darwin-x64"],
    formats: ["tar.gz"],
    ...opts,
  });
}

const scriptEnv = (s: Sandbox, env: Record<string, string>) => ({
  PATH: s.bin,
  HOME: s.home,
  TMPDIR: s.root,
  FAKE_OS: "Linux",
  FAKE_ARCH: "x86_64",
  FAKE_LOG: s.log,
  FAKE_BASE: releaseBase(VERSION),
  FAKE_RELEASE: s.release,
  ...env,
});

function spawnScript(
  s: Sandbox,
  env: Record<string, string>,
  shell: string,
  stdin: boolean,
  script: string
) {
  return spawnSync(shell, stdin ? [] : [script], {
    input: stdin ? readFileSync(script, "utf-8") : undefined,
    encoding: "utf-8",
    cwd: s.root,
    env: scriptEnv(s, env),
  });
}

/** Several runs at once: resolves with each run's exit status and stdout */
function runParallel(s: Sandbox, n: number, env: Record<string, string> = {}) {
  return Promise.all(
    Array.from(
      { length: n },
      () =>
        new Promise<{ status: number | null; stdout: string; stderr: string }>(
          (resolve) => {
            const child = spawn(SHELLS[0], [SCRIPT], {
              cwd: s.root,
              env: scriptEnv(s, env),
            });
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (d) => (stdout += d));
            child.stderr.on("data", (d) => (stderr += d));
            child.on("close", (status) => resolve({ status, stdout, stderr }));
          }
        )
    )
  );
}

/** `stdin`: feed the script on standard input, as `curl … | sh` does. `script`: another copy of it */
function run(
  s: Sandbox,
  env: Record<string, string> = {},
  shell = SHELLS[0],
  stdin = false,
  script = SCRIPT
): RunResult {
  const r = spawnScript(s, env, shell, stdin, script);
  const lines = r.stdout.split("\n").filter(Boolean);
  expect(
    lines,
    `stdout must be one JSON line; stderr:\n${r.stderr}`
  ).toHaveLength(1);
  const result: RunResult = {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    json: JSON.parse(lines[0]),
    requests: readFileSync(s.log, "utf-8").split("\n").filter(Boolean),
  };
  // Every run, success or failure, prints a valid contract result with a matching exit code
  expect(contractErrors(result), lines[0]).toEqual([]);
  if (!result.json.ok) {
    expect(result.json.data.path).toBeNull();
  }
  return result;
}

const sha256Of = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");
const ids = (r: RunResult) => r.json.problems.map((p) => p.id);

/**
 * Every run's whole stdout object goes through the shared schema 1 checker (#110), and the exit
 * code must be the one setupExitCode() gives for it. On top of that, what the shared checker
 * leaves open for this command: `data` is always there with the installer's fields, and the
 * script never proposes a `fix.run` (nothing it could name is on the allowlist).
 */
function contractErrors(r: RunResult): string[] {
  const errors = setupResultErrors(r.json);
  if (errors.length) {
    return errors;
  }
  const result = r.json as unknown as SetupResult & {
    data?: Record<string, unknown>;
  };
  const want = setupExitCode(result);
  if (r.status !== want) {
    errors.push(`exit ${r.status}, contract says ${want}`);
  }
  if (!result.data) {
    errors.push("data must be present");
  } else if (
    Object.keys(result.data).join(",") !==
    "manager,version,tag,target,dir,path,onPath,active"
  ) {
    errors.push(`data fields ${Object.keys(result.data)}`);
  }
  for (const p of result.problems) {
    if ("run" in p.fix) {
      errors.push(`${p.id}: the installer never emits fix.run`);
    }
  }
  return errors;
}
const leftovers = (dir: string) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.startsWith(".")) : [];

describe.skipIf(process.platform === "win32")("install.sh", () => {
  it("pins the package version (scripts/gen-version.mjs keeps it in sync)", () => {
    expect(readFileSync(SCRIPT, "utf-8")).toMatch(
      new RegExp(`^VERSION='${VERSION.replaceAll(".", "\\.")}'$`, "m")
    );
  });

  describe.each(SHELLS)("under %s", (shell) => {
    it("installs the pinned release into ~/.local/bin and writes install.json", () => {
      const s = sandbox();
      release(s);
      const r = run(s, {}, shell);
      expect(r.status, r.stderr).toBe(0);
      const bin = join(s.installDir, "telegram");
      expect(r.json).toMatchObject({
        schema: 1,
        ok: true,
        data: {
          manager: "user-binary",
          version: VERSION,
          tag: `v${VERSION}`,
          target: "linux-x64",
          dir: s.installDir,
          path: bin,
          onPath: false,
          active: null,
        },
      });
      // Not on PATH: a warning that tells to use the absolute path, no shell-profile edits
      expect(r.json.problems).toEqual([
        expect.objectContaining({
          id: "install_dir_not_on_path",
          severity: "warning",
          fix: { human: expect.stringContaining(bin) },
        }),
      ]);
      expect(
        spawnSync(bin, ["--version"], { encoding: "utf-8" }).stdout.trim()
      ).toBe(VERSION);
      const manifest = JSON.parse(
        readFileSync(join(s.installDir, "install.json"), "utf-8")
      );
      expect(manifest).toMatchObject({
        package: "better-tg-cli",
        manager: "user-binary",
        path: bin,
        version: VERSION,
        tag: `v${VERSION}`,
        target: "linux-x64",
        archive: assetName(VERSION, "linux-x64", "tar.gz"),
      });
      expect(manifest.sha256).toMatch(/^[0-9a-f]{64}$/);
      // The sum of the installed binary itself, which an upgrade checks before replacing it
      expect(manifest.binarySha256).toBe(sha256Of(readFileSync(bin)));
      expect(Object.keys(manifest)).toEqual([
        "schema",
        "package",
        "manager",
        "path",
        "version",
        "tag",
        "target",
        "archive",
        "sha256",
        "binarySha256",
        "installedAt",
      ]);
      // telegram update recognizes this install and advises running the script again
      const method = detectInstall(bin, "", true);
      expect(method).toMatchObject({ kind: "script", dir: s.installDir });
      expect(updateCommandFor(method)).toMatch(
        /install\.sh \| TG_INSTALL_DIR=.* sh$/
      );
      // SHA256SUMS first, then exactly the archive it lists, over https only
      const base = releaseBase(VERSION);
      expect(r.requests.map((l) => l.split(" ").pop())).toEqual([
        `${base}/SHA256SUMS`,
        `${base}/${assetName(VERSION, "linux-x64", "tar.gz")}`,
      ]);
      // curl -q first: ~/.curlrc is never read; https on every redirect too
      for (const l of r.requests) {
        expect(l).toMatch(
          /^curl -q .*--proto =https --proto-redir =https --tlsv1\.2 /
        );
      }
      expect(leftovers(s.installDir)).toEqual([]);
      expect(
        readdirSync(s.root).filter(
          (f) => !["home", "tools", "release", "requests.log"].includes(f)
        )
      ).toEqual([]);
      expect(r.stderr).toContain(`Installed telegram ${VERSION}`);
    });
  });

  it("reports onPath and the active copy when the folder is on PATH", () => {
    const s = sandbox();
    release(s);
    const r = run(s, { PATH: `${s.bin}:${s.installDir}` });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.problems).toEqual([]);
    expect(r.json.data).toMatchObject({
      onPath: true,
      active: join(s.installDir, "telegram"),
    });
  });

  it("honours TG_INSTALL_DIR, resolving it to an absolute path; quotes and spaces stay valid JSON", () => {
    const s = sandbox();
    release(s);
    const dir = join(s.root, `my "tg" dir`);
    const r = run(s, { TG_INSTALL_DIR: dir });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.data.path).toBe(join(dir, "telegram"));
    expect(
      JSON.parse(readFileSync(join(dir, "install.json"), "utf-8")).path
    ).toBe(join(dir, "telegram"));
    // Same check again: a reinstall recognises its own manifest with an escaped path
    expect(run(s, { TG_INSTALL_DIR: dir }).status).toBe(0);
  });

  it.each(SHELLS)("works when piped into %s, as curl | sh runs it", (shell) => {
    const s = sandbox();
    release(s);
    const r = run(s, {}, shell, true);
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.data.path).toBe(join(s.installDir, "telegram"));
  });

  it.each([{}, { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" }])(
    "a non-ASCII install folder (%o), installed twice",
    (locale) => {
      const s = sandbox();
      release(s);
      const dir = join(s.root, "Программы", "телеграм");
      const first = run(s, { TG_INSTALL_DIR: dir, ...locale });
      expect(first.status, first.stderr).toBe(0);
      expect(first.json.data.path).toBe(join(dir, "telegram"));
      expect(
        JSON.parse(readFileSync(join(dir, "install.json"), "utf-8")).path
      ).toBe(join(dir, "telegram"));
      const again = run(s, { TG_INSTALL_DIR: dir, ...locale });
      expect(again.status, again.stderr).toBe(0);
    }
  );

  it("a first install cut short after writing install.json still owns the path", () => {
    const s = sandbox();
    release(s);
    expect(run(s).status).toBe(0);
    // A first install places install.json before the binary: the state a kill in between leaves
    rmSync(join(s.installDir, "telegram"));
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(join(s.installDir, "telegram"))).toBe(true);
  });

  it("replaces its own earlier install", () => {
    const s = sandbox();
    release(s);
    expect(run(s).status).toBe(0);
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    const bin = join(s.installDir, "telegram");
    expect(
      JSON.parse(readFileSync(join(s.installDir, "install.json"), "utf-8"))
        .binarySha256
    ).toBe(sha256Of(readFileSync(bin)));
  });

  it("refuses a foreign file copied over its telegram, next to a genuine install.json, and downloads nothing", () => {
    const s = sandbox();
    release(s);
    expect(run(s).status).toBe(0);
    const bin = join(s.installDir, "telegram");
    const manifest = readFileSync(join(s.installDir, "install.json"), "utf-8");
    writeFileSync(join(s.root, "other"), "#!/bin/sh\necho someone else\n", {
      mode: 0o755,
    });
    // Copied over it: the same path and a regular file, only the content is not ours
    spawnSync("cp", [join(s.root, "other"), bin]);
    writeFileSync(s.log, "");
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_path_taken"]);
    expect(r.json.problems[0].message).toContain("binarySha256");
    expect(readFileSync(bin, "utf-8")).toBe("#!/bin/sh\necho someone else\n");
    expect(readFileSync(join(s.installDir, "install.json"), "utf-8")).toBe(
      manifest
    );
    expect(r.requests).toEqual([]);
    expect(leftovers(s.installDir)).toEqual([]);
  });

  it("refuses a telegram it did not install and downloads nothing", () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    writeFileSync(join(s.installDir, "telegram"), "someone else\n");
    const r = run(s);
    expect(r.status).toBe(2);
    expect(r.json.ok).toBe(false);
    expect(r.json.problems).toEqual([
      expect.objectContaining({
        id: "install_path_taken",
        severity: "error",
        fix: expect.objectContaining({
          human: expect.stringContaining("TG_INSTALL_DIR"),
        }),
      }),
    ]);
    expect(readFileSync(join(s.installDir, "telegram"), "utf-8")).toBe(
      "someone else\n"
    );
    expect(r.requests).toEqual([]);
  });

  it("refuses a telegram next to an install.json written for another path", () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    writeFileSync(join(s.installDir, "telegram"), "old\n");
    writeFileSync(
      join(s.installDir, "install.json"),
      '{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":"/elsewhere/telegram"}\n'
    );
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_path_taken"]);
    expect(readFileSync(join(s.installDir, "telegram"), "utf-8")).toBe("old\n");
  });

  it("refuses a symlink named telegram, even a dangling one", () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    symlinkSync(join(s.root, "nowhere"), join(s.installDir, "telegram"));
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_path_taken"]);
    expect(lstatSync(join(s.installDir, "telegram")).isSymbolicLink()).toBe(
      true
    );
  });

  it("refuses a foreign install.json in the folder", () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    writeFileSync(join(s.installDir, "install.json"), '{"tool":"other"}\n');
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_path_taken"]);
    expect(readFileSync(join(s.installDir, "install.json"), "utf-8")).toBe(
      '{"tool":"other"}\n'
    );
  });

  it("an archive whose sum does not match SHA256SUMS installs nothing", () => {
    const s = sandbox();
    release(s, { tampered: [assetName(VERSION, "linux-x64", "tar.gz")] });
    const r = run(s);
    expect(r.status).toBe(1);
    expect(r.json.problems).toEqual([
      expect.objectContaining({
        id: "checksum_mismatch",
        fix: { unavailable: expect.any(String) },
      }),
    ]);
    expect(existsSync(join(s.installDir, "telegram"))).toBe(false);
    expect(existsSync(join(s.installDir, "install.json"))).toBe(false);
    expect(leftovers(s.installDir)).toEqual([]);
  });

  it("an archive missing from SHA256SUMS is never downloaded", () => {
    const s = sandbox();
    release(s, { unlisted: [assetName(VERSION, "linux-x64", "tar.gz")] });
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(["archive_not_listed"]);
    expect(r.requests).toHaveLength(1);
  });

  it("a binary that prints several lines still yields one valid JSON line", () => {
    const s = sandbox();
    release(s, { reports: 'line one\nline "two"\tend' });
    const r = run(s);
    expect(ids(r)).toEqual(["binary_check_failed"]);
    expect(r.json.problems[0].message).toContain("line one");
  });

  it("refuses an install folder with a control character", () => {
    const s = sandbox();
    release(s);
    const r = run(s, { TG_INSTALL_DIR: join(s.root, "a\tb") });
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_dir_invalid"]);
  });

  it.each([
    ["Linux", "riscv64"],
    ["Linux", "armv7l"],
    ["FreeBSD", "amd64"],
    ["MINGW64_NT-10.0", "x86_64"],
  ])(
    "unsupported platform %s %s: a clear limitation, nothing downloaded",
    (os, arch) => {
      const s = sandbox();
      release(s);
      const r = run(s, { FAKE_OS: os, FAKE_ARCH: arch });
      expect(r.status).toBe(1);
      expect(r.json.problems).toEqual([
        expect.objectContaining({
          id: "platform_unsupported",
          fix: { unavailable: expect.any(String) },
        }),
      ]);
      expect(r.json.data.target).toBeNull();
      expect(r.requests).toEqual([]);
    }
  );

  it.each([
    ["Darwin", "arm64", "darwin-arm64"],
    ["Darwin", "x86_64", "darwin-x64"],
    ["Linux", "aarch64", "linux-arm64"],
  ])("%s %s → %s", (os, arch, target) => {
    const s = sandbox();
    release(s);
    const r = run(s, { FAKE_OS: os, FAKE_ARCH: arch });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.data.target).toBe(target);
    expect(r.requests.at(-1)).toContain(`${target}.tar`);
  });

  it("no curl or wget: a clear limitation, no package install suggested", () => {
    const s = sandbox({ downloader: "none" });
    release(s);
    const r = run(s);
    expect(r.status).toBe(1);
    expect(r.json.problems).toEqual([
      expect.objectContaining({
        id: "downloader_missing",
        fix: {
          unavailable: expect.stringContaining(
            "does not install system packages"
          ),
        },
      }),
    ]);
  });

  it("wget alone is not used: it cannot keep every redirect on HTTPS before the request", () => {
    const s = sandbox({ downloader: "wget" });
    release(s);
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(["downloader_missing"]);
    expect(r.json.problems[0].fix).toEqual({
      unavailable: expect.stringContaining("curl"),
    });
    expect(r.requests).toEqual([]);
  });

  it("a failed certificate check is reported, never bypassed", () => {
    const s = sandbox();
    release(s);
    const r = run(s, { FAKE_DL_EXIT: "60" });
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(["tls_failed"]);
    for (const l of r.requests) {
      expect(l).not.toMatch(/ (-k|--insecure)( |$)/);
    }
  });

  it("a release that is not published yet: release_not_found", () => {
    const s = sandbox();
    mkdirSync(s.release);
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(["release_not_found"]);
  });

  it.skipIf(!canMakeXz())(
    "an old release with only .tar.xz on a system without xz: unpack_tool_missing",
    () => {
      const s = sandbox({
        xz: false,
        extraBin: { tar: '#!/bin/sh\necho "tar (GNU tar) 1.34" >&2\nexit 2\n' },
      });
      // Fixture built with the real tools; the sandbox then gets a tar that is not bsdtar
      makeReleaseFixtures(s.release, {
        version: VERSION,
        targets: ["linux-x64"],
        formats: ["tar.xz"],
      });
      const r = run(s);
      expect(r.status).toBe(1);
      expect(ids(r)).toEqual(["unpack_tool_missing"]);
      expect(r.requests).toHaveLength(1);
    }
  );

  it.skipIf(!canMakeXz())(
    "prefers .tar.xz when it can unpack it, else takes .tar.gz",
    () => {
      const both: Partial<ReleaseFixtureOptions> = {
        formats: ["tar.xz", "tar.gz"],
      };
      const s = sandbox();
      release(s, both);
      const r = run(s);
      expect(r.status, r.stderr).toBe(0);
      expect(r.requests.at(-1)).toMatch(/\.tar\.xz$/);
      // GNU tar without xz (Debian and Ubuntu images)
      if (
        which("xz") &&
        !/bsdtar/.test(
          spawnSync("tar", ["--version"], { encoding: "utf-8" }).stdout
        )
      ) {
        const g = sandbox({ xz: false });
        release(g, both);
        const rg = run(g);
        expect(rg.status, rg.stderr).toBe(0);
        expect(rg.requests.at(-1)).toMatch(/\.tar\.gz$/);
      }
    }
  );

  // sha256sum on macOS does not escape names; GNU sha256sum and shasum do
  const hashers = (
    [
      ["the first hasher found", []],
      ["shasum alone", ["sha256sum"]],
      ["openssl alone", ["sha256sum", "shasum"]],
    ] as [string, string[]][]
  ).filter(([, omit]) =>
    TOOLS.filter(
      (t) => ["sha256sum", "shasum", "openssl"].includes(t) && !omit.includes(t)
    ).some((t) => which(t))
  );

  it.each(hashers)(
    "a backslash in TG_INSTALL_DIR, installed twice (%s)",
    (_name, omit) => {
      const s = sandbox({ omit });
      release(s);
      const dir = join(s.root, "back\\slash");
      const first = run(s, { TG_INSTALL_DIR: dir });
      expect(first.status, first.stderr).toBe(0);
      const bin = join(dir, "telegram");
      const manifest = JSON.parse(
        readFileSync(join(dir, "install.json"), "utf-8")
      );
      expect(manifest.path).toBe(bin);
      expect(manifest.binarySha256).toBe(sha256Of(readFileSync(bin)));
      const again = run(s, { TG_INSTALL_DIR: dir });
      expect(again.status, again.stderr).toBe(0);
      expect(again.json.problems.map((p) => p.id)).toEqual([
        "install_dir_not_on_path",
      ]);
    }
  );

  it("without gzip, tar unpacks the .tar.gz by itself", () => {
    if (
      !/bsdtar/.test(
        spawnSync("tar", ["--version"], { encoding: "utf-8" }).stdout
      )
    ) {
      return;
    }
    const s = sandbox({ omit: ["gzip"] });
    release(s);
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(
      spawnSync(join(s.installDir, "telegram"), ["--version"], {
        encoding: "utf-8",
      }).stdout.trim()
    ).toBe(VERSION);
  });

  it("a tar that leaves a file behind but fails: unpack_failed, the file is never run", () => {
    // Creates telegram (which would log RAN when run), then exits like tar on a full disk
    const fakeTar = `#!/bin/sh
[ "$1" = --version ] && { echo 'tar (GNU tar) 1.35'; exit 0; }
out=''
while [ $# -gt 0 ]; do [ "$1" = -C ] && out=$2; shift; done
printf '#!/bin/sh\\necho RAN >> "%s"\\necho ${VERSION}\\n' "$FAKE_LOG" > "$out/telegram"
chmod 755 "$out/telegram"
echo 'tar: telegram: Wrote only 512 of 10240 bytes' >&2
exit 2
`;
    const s = sandbox({ extraBin: { tar: fakeTar } });
    release(s);
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(["unpack_failed"]);
    expect(r.requests).not.toContain("RAN");
    expect(existsSync(join(s.installDir, "telegram"))).toBe(false);
    expect(existsSync(join(s.installDir, "install.json"))).toBe(false);
  });

  it("an empty PATH component is the current folder: its telegram is the active one", () => {
    const s = sandbox();
    release(s);
    // The script runs with cwd = s.root
    writeFileSync(join(s.root, "telegram"), "#!/bin/sh\necho cwd\n");
    chmodSync(join(s.root, "telegram"), 0o755);
    for (const path of [
      `:${s.bin}:${s.installDir}`,
      `${s.bin}::${s.installDir}`,
    ]) {
      const r = run(s, { PATH: path });
      expect(r.status, r.stderr).toBe(0);
      expect(r.json.data).toMatchObject({
        onPath: true,
        active: join(s.root, "telegram"),
      });
      expect(r.json.problems).toEqual([
        expect.objectContaining({
          id: "other_telegram_on_path",
          message: expect.stringMatching(/comes first/),
        }),
      ]);
    }
  });

  it("a trailing empty PATH component comes last; glob characters in PATH stay literal", () => {
    const s = sandbox();
    release(s);
    writeFileSync(join(s.root, "telegram"), "#!/bin/sh\necho cwd\n");
    chmodSync(join(s.root, "telegram"), 0o755);
    const bin = join(s.installDir, "telegram");
    mkdirSync(join(s.root, "g1"));
    writeFileSync(join(s.root, "g1", "telegram"), "#!/bin/sh\necho glob\n");
    chmodSync(join(s.root, "g1", "telegram"), 0o755);
    const r = run(s, {
      PATH: `${s.bin}:${s.installDir}:${join(s.root, "g*")}:`,
    });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.data.active).toBe(bin);
    expect(r.json.problems).toEqual([
      expect.objectContaining({
        id: "other_telegram_on_path",
        message: expect.stringContaining(join(s.root, "telegram")),
      }),
    ]);
    expect(r.json.problems[0].message).not.toContain("g1");
  });

  it("warns when another telegram is on PATH, and when it comes first", () => {
    const s = sandbox();
    release(s);
    const old = join(s.root, "old-bin");
    mkdirSync(old);
    writeFileSync(join(old, "telegram"), "#!/bin/sh\necho old\n");
    chmodSync(join(old, "telegram"), 0o755);

    const after = run(s, { PATH: `${s.bin}:${s.installDir}:${old}` });
    expect(after.status).toBe(0);
    expect(after.json.data.active).toBe(join(s.installDir, "telegram"));
    expect(after.json.problems).toEqual([
      expect.objectContaining({
        id: "other_telegram_on_path",
        severity: "warning",
        message: expect.stringContaining(join(old, "telegram")),
      }),
    ]);

    const before = run(s, { PATH: `${s.bin}:${old}:${s.installDir}` });
    expect(before.status).toBe(0);
    expect(before.json.data.active).toBe(join(old, "telegram"));
    expect(before.json.problems[0].message).toMatch(/comes first/);
    // Nothing is removed
    expect(readFileSync(join(old, "telegram"), "utf-8")).toContain("old");
  });

  describe.each(SHELLS)(
    "a download of the script cut short, under %s",
    (shell) => {
      const text = readFileSync(SCRIPT, "utf-8");
      // The block opens on line 2, so only a cut inside the shebang line itself can still exit 0
      const lineEnds = [...text.matchAll(/\n/g)]
        .map((m) => m.index + 1)
        .slice(1, 40);

      it.each([
        ["before the last line", text.lastIndexOf('main "$@"')],
        ["before the closing brace", text.lastIndexOf("}")],
        ["in the middle", Math.floor(text.length / 2)],
        ["right after the opening brace", text.indexOf("\n{\n") + 3],
        ...lineEnds.map(
          (at, i) => [`after line ${i + 2}`, at] as [string, number]
        ),
      ])("%s: a syntax error, nothing run, no JSON", (_where, at) => {
        const s = sandbox();
        release(s);
        const cut = join(s.root, "cut.sh");
        writeFileSync(cut, text.slice(0, at));
        for (const stdin of [false, true]) {
          const r = spawnScript(s, {}, shell, stdin, cut);
          // No JSON line is the failure signal; the exit code is not 0 either
          expect(r.status).not.toBe(0);
          expect(r.stdout).toBe("");
        }
        expect(readFileSync(s.log, "utf-8")).toBe("");
        expect(existsSync(s.installDir)).toBe(false);
      });
    }
  );

  it("TG_SKILL_DIR (the old developer installer) stops before writing anything", () => {
    const s = sandbox();
    release(s);
    const r = run(s, { TG_SKILL_DIR: join(s.home, "checkout") });
    expect(r.status).toBe(2);
    expect(r.json.problems).toEqual([
      expect.objectContaining({
        id: "old_installer_variable",
        fix: expect.objectContaining({
          human: expect.stringContaining("scripts/dev-install.sh"),
        }),
      }),
    ]);
    expect(r.requests).toEqual([]);
    expect(existsSync(s.installDir)).toBe(false);
    expect(existsSync(join(s.home, "checkout"))).toBe(false);
  });

  it("an old developer checkout is reported before installing, and left alone", () => {
    const s = sandbox();
    release(s);
    const old = join(s.home, ".agents", "skills", "telegram");
    mkdirSync(join(old, ".git"), { recursive: true });
    writeFileSync(
      join(old, "package.json"),
      '{\n  "name": "better-tg-cli",\n  "version": "0.30.0"\n}\n'
    );
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.problems.map((p) => p.id)).toEqual([
      "dev_install_found",
      "install_dir_not_on_path",
    ]);
    expect(r.json.problems[0].fix.human).toContain(
      join(old, "scripts", "dev-install.sh")
    );
    // The old checkout has no scripts/dev-install.sh until it is updated
    expect(r.json.problems[0].fix.human).toContain(`git -C ${old} pull`);
    expect(r.json.problems[0].fix.human.indexOf("pull")).toBeLessThan(
      r.json.problems[0].fix.human.indexOf("dev-install.sh")
    );
    expect(r.stderr.indexOf("developer install")).toBeLessThan(
      r.stderr.indexOf("Downloading")
    );
    expect(existsSync(join(old, "package.json"))).toBe(true);
  });

  it("a telegram that appears while downloading is not written over", () => {
    const s = sandbox();
    release(s);
    const bin = join(s.installDir, "telegram");
    const r = run(s, { FAKE_PLANT: bin });
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_path_taken"]);
    expect(readFileSync(bin, "utf-8")).toBe("planted\n");
    // Our manifest must not claim the planted file, or the next run would replace it
    expect(existsSync(join(s.installDir, "install.json"))).toBe(false);
    expect(leftovers(s.installDir)).toEqual([]);
    expect(run(s).status).toBe(2);
  });

  // content: the telegram it describes (binarySha256)
  const goodManifest = (bin: string, content = "someone else\n") =>
    `{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":${JSON.stringify(bin)},"version":"0.1.0","tag":"v0.1.0","target":"linux-x64","archive":"better-tg-cli-0.1.0-linux-x64.tar.gz","sha256":"${"a".repeat(64)}","binarySha256":"${sha256Of(content)}","installedAt":"2026-11-19T12:00:00Z"}\n`;

  it("ownership: an exact manifest of an earlier version, matching its binary, counts", () => {
    const s = sandbox();
    release(s);
    const bin = join(s.installDir, "telegram");
    mkdirSync(s.installDir, { recursive: true });
    writeFileSync(bin, "old\n");
    writeFileSync(
      join(s.installDir, "install.json"),
      goodManifest(bin, "old\n")
    );
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(
      JSON.parse(readFileSync(join(s.installDir, "install.json"), "utf-8"))
        .version
    ).toBe(VERSION);
  });

  it.each([
    [
      "a record nested in another file",
      (bin: string) =>
        `{"tool":"other","old":{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":${JSON.stringify(bin)},"version":"1","installedAt":"x"}}\n`,
    ],
    [
      "a cut-off manifest",
      (bin: string) =>
        `{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":${JSON.stringify(bin)},"version":"0.1.0","tag":"v0.`,
    ],
    [
      "a manifest with a second line",
      (bin: string) =>
        `{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":${JSON.stringify(bin)},"version":"1","installedAt":"x"}\n{}\n`,
    ],
    [
      "a manifest without tag, target, archive and sha256",
      (bin: string) =>
        `{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":${JSON.stringify(bin)},"version":"0.1.0","installedAt":"2026-11-19T12:00:00Z"}\n`,
    ],
    [
      "a manifest with a damaged middle",
      (bin: string) =>
        goodManifest(bin).replace('"tag":"v0.1.0"', '"tag":"v0.1.0","x":{}'),
    ],
    [
      "a manifest with a bad sum",
      (bin: string) =>
        goodManifest(bin).replace(/"sha256":"[0-9a-f]+"/, '"sha256":"zz"'),
    ],
    [
      "a manifest without binarySha256",
      (bin: string) =>
        goodManifest(bin).replace(/"binarySha256":"[0-9a-f]+",/, ""),
    ],
    [
      "a manifest with a malformed binarySha256",
      (bin: string) =>
        goodManifest(bin).replace(
          /"binarySha256":"([0-9a-f]+)"/,
          '"binarySha256":"$1a"'
        ),
    ],
    [
      "a manifest whose binarySha256 describes another file",
      (bin: string) => goodManifest(bin, "another file\n"),
    ],
    [
      "a well-formed manifest followed by a blank line",
      (bin: string) => `${goodManifest(bin)}\n`,
    ],
    [
      "a tag that is not v + version",
      (bin: string) =>
        goodManifest(bin).replace('"tag":"v0.1.0"', '"tag":"v0.2.0"'),
    ],
    [
      "an archive named after another version",
      (bin: string) =>
        goodManifest(bin).replace(
          "better-tg-cli-0.1.0-",
          "better-tg-cli-0.2.0-"
        ),
    ],
    [
      "an archive named after another target",
      (bin: string) =>
        goodManifest(bin).replace("-linux-x64.tar.gz", "-darwin-arm64.tar.gz"),
    ],
  ])("ownership: %s does not count", (_what, manifest) => {
    const s = sandbox();
    release(s);
    const bin = join(s.installDir, "telegram");
    mkdirSync(s.installDir, { recursive: true });
    writeFileSync(bin, "someone else\n");
    writeFileSync(join(s.installDir, "install.json"), manifest(bin));
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_path_taken"]);
    expect(readFileSync(bin, "utf-8")).toBe("someone else\n");
    expect(r.requests).toEqual([]);
  });

  it.each([
    ["another version", { reports: "0.0.1" }],
    ["the right version but a failing exit status", { versionExit: 1 }],
    [
      "the right version and then another line",
      { reports: `${VERSION}\nextra` },
    ],
    ["the right version and then a blank line", { reports: `${VERSION}\n` }],
  ])("a binary that prints %s replaces nothing", (_what, opts) => {
    const s = sandbox();
    release(s, opts);
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(["binary_check_failed"]);
    expect(existsSync(join(s.installDir, "telegram"))).toBe(false);
    expect(existsSync(join(s.installDir, "install.json"))).toBe(false);
    expect(leftovers(s.installDir)).toEqual([]);
  });

  const LOCK = ".better-tg-cli.lock";
  const lockLine = (pid: number, stage: string) =>
    `pid=${pid} stage=.better-tg-cli.stage.${stage}\n`;

  it("one run at a time per folder: a live lock stops the run and stays", () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    const lock = join(s.installDir, LOCK);
    // A live PID: this test process
    writeFileSync(lock, lockLine(process.pid, "Live01"));
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(["install_in_progress"]);
    expect(r.requests).toEqual([]);
    expect(readFileSync(lock, "utf-8")).toBe(lockLine(process.pid, "Live01"));
    expect(leftovers(s.installDir)).toEqual([LOCK]);
  });

  it("a lock left by a killed run is never taken over: a person deletes it", () => {
    const s = sandbox();
    release(s);
    const d = s.installDir;
    mkdirSync(join(d, ".better-tg-cli.stage.AbC123"), { recursive: true });
    // A dead PID and its staging folder, as kill -9 leaves them
    writeFileSync(join(d, LOCK), lockLine(999_999, "AbC123"));
    writeFileSync(join(d, ".better-tg-cli.stage.AbC123", "telegram"), "half\n");
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_lock_stale"]);
    expect(r.json.problems[0].fix.human).toBe(
      `No install is running? Delete ${join(d, LOCK)} and run again.`
    );
    expect(r.requests).toEqual([]);
    expect(readFileSync(join(d, LOCK), "utf-8")).toBe(
      lockLine(999_999, "AbC123")
    );
    expect(
      readFileSync(join(d, ".better-tg-cli.stage.AbC123", "telegram"), "utf-8")
    ).toBe("half\n");
    expect(leftovers(d).sort()).toEqual([LOCK, ".better-tg-cli.stage.AbC123"]);
  });

  it("staging folders of killed runs are reported and never deleted; a live or starting run's is not", () => {
    const s = sandbox();
    release(s);
    const d = s.installDir;
    const stage = (name: string) => join(d, `.better-tg-cli.stage.${name}`);
    mkdirSync(stage("Dead01"), { recursive: true });
    writeFileSync(join(stage("Dead01"), "lock"), lockLine(999_999, "Dead01"));
    writeFileSync(join(stage("Dead01"), "telegram"), "half\n");
    mkdirSync(stage("NoLock"));
    mkdirSync(stage("Live01"));
    writeFileSync(
      join(stage("Live01"), "lock"),
      lockLine(process.pid, "Live01")
    );
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(ids(r)).toEqual(["install_stage_left", "install_dir_not_on_path"]);
    const msg = r.json.problems[0].message;
    expect(msg).toContain(stage("Dead01"));
    // No lock line yet (or any more): maybe a live run starting or cleaning up
    expect(msg).not.toContain(stage("NoLock"));
    expect(msg).not.toContain(stage("Live01"));
    expect(r.json.problems[0].severity).toBe("warning");
    expect(readFileSync(join(stage("Dead01"), "telegram"), "utf-8")).toBe(
      "half\n"
    );
    expect(leftovers(d).sort()).toEqual([
      ".better-tg-cli.stage.Dead01",
      ".better-tg-cli.stage.Live01",
      ".better-tg-cli.stage.NoLock",
    ]);
  });

  it.each([
    [
      "a lock folder (any folder by that name)",
      (p: string) => {
        mkdirSync(p);
        writeFileSync(join(p, "pid"), "999999\n");
      },
    ],
    ["a lock without a PID", (p: string) => writeFileSync(p, "")],
    ["a lock in another format", (p: string) => writeFileSync(p, "999999\n")],
    [
      "a lock with a second line",
      (p: string) => writeFileSync(p, `${lockLine(999_999, "AbC123")}\n`),
    ],
    [
      "a lock naming a path outside the folder",
      (p: string) => writeFileSync(p, "pid=999999 stage=../../etc\n"),
    ],
    [
      "a lock with pid 0 (kill -0 0 always succeeds)",
      (p: string) => writeFileSync(p, lockLine(0, "AbC123")),
    ],
    ["a symlink", (p: string) => symlinkSync("/nowhere", p)],
  ])("an unknown lock (%s) is refused and left as is", (_what, make) => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    const lock = join(s.installDir, LOCK);
    make(lock);
    const before = lstatSync(lock);
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(["install_lock_unknown"]);
    expect(r.json.problems[0].fix.human).toContain(lock);
    expect(r.requests).toEqual([]);
    expect(lstatSync(lock).ino).toBe(before.ino);
    expect(leftovers(s.installDir)).toEqual([LOCK]);
  });

  it("parallel runs into an empty folder: one installs, the others stop, nothing is left behind", async () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    const results = await runParallel(s, 6, {
      FAKE_OVERLAP: join(s.root, "inside-lock"),
    });
    const outcomes = results.map((r) => {
      const json = JSON.parse(r.stdout);
      expect(setupResultErrors(json), r.stdout).toEqual([]);
      return json.ok
        ? "ok"
        : json.problems.map((p: { id: string }) => p.id).join(",");
    });
    for (const o of outcomes) {
      expect(["ok", "install_in_progress"]).toContain(o);
    }
    // The losers' staging folders, appearing and going while the winner looks, are never reported
    for (const r of results) {
      expect(r.stdout).not.toContain("install_stage_left");
    }
    expect(outcomes).toContain("ok");
    // No two runs were ever inside the lock at the same time
    expect(readFileSync(s.log, "utf-8")).not.toContain("OVERLAP");
    expect(leftovers(s.installDir)).toEqual([]);
    expect(
      spawnSync(join(s.installDir, "telegram"), ["--version"], {
        encoding: "utf-8",
      }).stdout
    ).toBe(`${VERSION}\n`);
  });

  it("the lock released while a run looks at it: the run tries again and installs", () => {
    const name = LOCK;
    const realLn = which("ln");
    const s = sandbox({
      extraBin: {
        // The first ln onto that name: the holder finishes (its file goes) and ln reports "exists"
        ln: `#!/bin/sh\nfor a; do last=$a; done\ncase "$last" in */${name}) if [ ! -e "$FAKE_LN_MARK" ]; then : > "$FAKE_LN_MARK"; rm -f "$last"; exit 1; fi ;; esac\nexec ${realLn} "$@"\n`,
      },
    });
    release(s);
    const d = s.installDir;
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, LOCK), lockLine(process.pid, "AbC123"));
    const r = run(s, { FAKE_LN_MARK: join(s.root, "ln-once") });
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(join(s.root, "ln-once"))).toBe(true);
    expect(leftovers(d)).toEqual([]);
  });

  it("a file system without hard links: refused, nothing placed", () => {
    const s = sandbox({
      extraBin: {
        ln: '#!/bin/sh\necho "ln: Operation not supported" >&2\nexit 1\n',
      },
    });
    release(s);
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(["hard_links_unavailable"]);
    expect(r.json.problems[0].fix).toEqual({
      unavailable: expect.stringContaining("TG_INSTALL_DIR"),
    });
    expect(existsSync(join(s.installDir, "telegram"))).toBe(false);
    expect(leftovers(s.installDir)).toEqual([]);
  });

  it("an upgrade killed between the two renames is refused until a person moves telegram away", () => {
    const realMv = which("mv");
    const s = sandbox({
      extraBin: {
        // Kills the installer right before it renames install.json, after the binary went in
        mv: `#!/bin/sh\nfor a; do last=$a; done\nif [ -n "$FAKE_MV_KILL" ]; then case "$last" in */install.json) kill -9 $PPID; exit 1 ;; esac; fi\nexec ${realMv} "$@"\n`,
      },
    });
    release(s);
    // The previous version, from a copy of the script pinned to it
    const oldVersion = "0.0.9";
    const oldScript = join(s.root, "old-install.sh");
    writeFileSync(
      oldScript,
      readFileSync(SCRIPT, "utf-8").replace(
        /^VERSION='[^']*'$/m,
        `VERSION='${oldVersion}'`
      )
    );
    const oldRelease = join(s.root, "release-old");
    makeReleaseFixtures(oldRelease, {
      version: oldVersion,
      targets: ["linux-x64"],
      formats: ["tar.gz"],
    });
    const old = run(
      s,
      { FAKE_BASE: releaseBase(oldVersion), FAKE_RELEASE: oldRelease },
      SHELLS[0],
      false,
      oldScript
    );
    expect(old.status, old.stderr).toBe(0);

    const bin = join(s.installDir, "telegram");
    const manifest = () =>
      JSON.parse(readFileSync(join(s.installDir, "install.json"), "utf-8"));
    const reports = () =>
      spawnSync(bin, ["--version"], { encoding: "utf-8" }).stdout.trim();
    const sha = () => sha256Of(readFileSync(bin));

    const killed = spawnScript(
      s,
      { FAKE_MV_KILL: "1" },
      SHELLS[0],
      false,
      SCRIPT
    );
    expect(killed.signal).toBe("SIGKILL");
    expect(killed.stdout).toBe("");
    // New binary, old manifest: it looks out of date, never newer than it is
    expect(reports()).toBe(VERSION);
    expect(manifest().version).toBe(oldVersion);

    // Its lock stays: the next run stops and names it, a person deletes it
    const stopped = run(s);
    expect(stopped.status).toBe(2);
    expect(ids(stopped)).toEqual(["install_lock_stale"]);
    const stage = leftovers(s.installDir).find((f) =>
      f.startsWith(".better-tg-cli.stage.")
    );
    expect(stage).toBeDefined();
    rmSync(join(s.installDir, LOCK));

    // The binary in place is not the one the old manifest records: refused, nothing touched
    const newBin = readFileSync(bin);
    const oldManifest = readFileSync(
      join(s.installDir, "install.json"),
      "utf-8"
    );
    const refused = run(s);
    expect(refused.status).toBe(2);
    expect(ids(refused)).toEqual(["install_stage_left", "install_path_taken"]);
    expect(refused.json.problems[1].message).toContain("binarySha256");
    expect(readFileSync(bin).equals(newBin)).toBe(true);
    expect(readFileSync(join(s.installDir, "install.json"), "utf-8")).toBe(
      oldManifest
    );

    // A person moves telegram away: the manifest still owns the path, so the next run installs
    rmSync(bin);
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(ids(r)).toEqual(["install_stage_left", "install_dir_not_on_path"]);
    expect(r.json.problems[0].message).toContain(join(s.installDir, stage!));
    expect(manifest()).toMatchObject({
      version: VERSION,
      sha256: expect.any(String),
    });
    expect(reports()).toBe(VERSION);
    // The manifest's sums describe the archive and the binary in place again
    const archive = readFileSync(
      join(s.release, assetName(VERSION, "linux-x64", "tar.gz"))
    );
    expect(manifest().sha256).toBe(sha256Of(archive));
    expect(manifest().binarySha256).toBe(sha());
    // The killed run's staging folder is reported, never deleted
    expect(leftovers(s.installDir)).toEqual([stage]);
  });

  it.each([
    ["rewritten in place", "FAKE_PLANT"],
    ["swapped for a folder", "FAKE_PLANT_DIR"],
  ])(
    "an upgrade stops when the telegram it checked was %s while downloading",
    (_what, fake) => {
      const s = sandbox();
      release(s);
      const bin = join(s.installDir, "telegram");
      expect(run(s).status).toBe(0);
      const r = run(s, { [fake]: bin });
      expect(r.status).toBe(2);
      expect(ids(r)).toEqual(["install_path_taken"]);
      expect(r.json.problems[0].message).toContain("changed while downloading");
      if (fake === "FAKE_PLANT") {
        expect(readFileSync(bin, "utf-8")).toBe("planted\n");
      } else {
        expect(lstatSync(bin).isDirectory()).toBe(true);
        expect(readdirSync(bin)).toEqual([]);
      }
      expect(leftovers(s.installDir)).toEqual([]);
    }
  );

  // The automation example in docs/install.md, run as written with a fake curl that serves a
  // script of the test's choice: its exit code must tell installed from not installed
  describe("the docs example", () => {
    const doc = readFileSync(join(ROOT, "docs", "install.md"), "utf-8");
    const example = doc.match(/```sh\n(out=\$\([\s\S]*?)```/)?.[1] ?? "";
    const fakeCurl = `#!/bin/sh\nout=''\nwhile [ $# -gt 0 ]; do case "$1" in -o) out=$2; shift 2 ;; --proto) shift 2 ;; *) shift ;; esac; done\n[ "$FAKE_CURL_EXIT" = 0 ] || exit "$FAKE_CURL_EXIT"\nprintf '%s' "$FAKE_SCRIPT" > "$out"\n`;
    const okJson = '{"schema":1,"ok":true,"problems":[],"data":{}}';

    it.each(
      SHELLS.flatMap(
        (shell) =>
          [
            [shell, "curl fails", "22", "", 22, "unknown"],
            [
              shell,
              "the script installs",
              "0",
              `echo '${okJson}'`,
              0,
              "installed",
            ],
            [
              shell,
              "the script exits 0 without JSON",
              "0",
              "echo oops",
              1,
              "not installed",
            ],
            [shell, "the script arrives empty", "0", "", 1, "unknown"],
            [
              shell,
              "the script is killed before its JSON line",
              "0",
              "kill -9 $$",
              137,
              "unknown",
            ],
            [
              shell,
              "the script exits 0 with ok:false",
              "0",
              `echo '{"schema":1,"ok":false,"problems":[]}'`,
              1,
              "not installed",
            ],
            [
              shell,
              "the script needs a human",
              "0",
              `echo '{"schema":1,"ok":false,"problems":[]}'; exit 2`,
              2,
              "not installed",
            ],
          ] as const
      )
    )("%s: %s", (shell, _what, curlExit, script, want, says) => {
      expect(example).toContain('exit "$status"');
      // No JSON line is an unknown result, never stated as "nothing is installed"
      expect(doc).not.toMatch(/so nothing is installed/);
      expect(doc).toMatch(/No JSON line at all[^.]*the result is\s+unknown/);
      const dir = realpathSync(mkdtempSync(join(tmpdir(), "btg-doc-")));
      sandboxes.push(dir);
      writeFileSync(join(dir, "curl"), fakeCurl, { mode: 0o755 });
      const r = spawnSync(shell, ["-c", example], {
        encoding: "utf-8",
        env: {
          PATH: `${dir}:${process.env.PATH}`,
          TMPDIR: dir,
          FAKE_CURL_EXIT: curlExit,
          FAKE_SCRIPT: script,
        },
      });
      expect(r.status, r.stderr).toBe(want);
      if (says === "installed") {
        expect(r.stdout).toContain("installed: ");
      } else {
        // The message shows the original status; 1 is only what the example exits with for a 0.
        // No output at all is an unknown result, never reported as "not installed".
        const other =
          says === "unknown" ? "not installed" : "installation status unknown";
        expect(r.stderr).toContain(
          `${says === "unknown" ? "installation status unknown" : "not installed"} (exit ${want === 1 ? 0 : want})`
        );
        expect(r.stderr).not.toContain(other);
      }
    });
  });
});
