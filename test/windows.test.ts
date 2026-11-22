import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { windowsConfirmScript } from "../src/commands/write-access.js";
import { confirmOnWindows, windowsConfirmInput } from "../src/confirm.js";
import type { Runner } from "../src/confirm.js";
import { dpapiStore, encodedCommand } from "../src/dpapi.js";
import type { Crypter } from "../src/dpapi.js";

const fake: Crypter & { calls: number } = {
  calls: 0,
  protect(b64) {
    this.calls++;
    return `X${[...b64].reverse().join("")}`;
  },
  unprotect(blob) {
    this.calls++;
    return [...blob.slice(1)].reverse().join("");
  },
};

describe("DPAPI secret store", () => {
  it("keeps every secret in one encrypted file and decrypts once per process", () => {
    const file = join(
      mkdtempSync(join(tmpdir(), "tg-dpapi-")),
      "secrets.dpapi"
    );
    const store = dpapiStore(() => file, fake);
    expect(store.get("sessionString")).toBeNull();
    expect(store.set("sessionString", "SESSION-ÄЖ-😀")).toBe(true);
    expect(store.set("writeEnabled", "1")).toBe(true);
    expect(readFileSync(file, "utf-8")).not.toContain("SESSION");

    const fresh = dpapiStore(() => file, fake);
    fake.calls = 0;
    expect(fresh.get("sessionString")).toBe("SESSION-ÄЖ-😀");
    expect(fresh.get("writeEnabled")).toBe("1");
    expect(fake.calls).toBe(1);

    expect(fresh.delete("writeEnabled")).toBe(true);
    expect(dpapiStore(() => file, fake).get("writeEnabled")).toBeNull();
    expect(fresh.delete("sessionString")).toBe(true);
    expect(existsSync(file)).toBe(false);
  });

  it("a strict read tells a missing key from a file it cannot decrypt (loadConfig needs it)", () => {
    const file = join(
      mkdtempSync(join(tmpdir(), "tg-dpapi-")),
      "secrets.dpapi"
    );
    expect(dpapiStore(() => file, fake).getStrict("k")).toEqual({
      ok: true,
      value: null,
    });
    dpapiStore(() => file, fake).set("k", "v");
    expect(dpapiStore(() => file, fake).getStrict("k")).toEqual({
      ok: true,
      value: "v",
    });
    expect(dpapiStore(() => file, fake).getStrict("other")).toEqual({
      ok: true,
      value: null,
    });
    const broken = dpapiStore(() => file, {
      protect: () => {
        throw new Error("no");
      },
      unprotect: () => {
        throw new Error("no");
      },
    });
    const reason =
      "Windows DPAPI read failed: secrets.dpapi could not be decrypted or parsed";
    expect(broken.getStrict("k")).toEqual({ ok: false, reason });
    const damaged = dpapiStore(() => file, {
      protect: (b64) => b64,
      unprotect: () =>
        Buffer.from('{"sessionString": "SECRET-MARKER', "utf-8").toString(
          "base64"
        ),
    });
    expect(damaged.getStrict("k")).toEqual({ ok: false, reason });
  });

  it("a fresh read sees what another process wrote since; a plain one keeps the cache", () => {
    const file = join(
      mkdtempSync(join(tmpdir(), "tg-dpapi-")),
      "secrets.dpapi"
    );
    const page = dpapiStore(() => file, fake);
    expect(page.set("writeEnabled", "ask")).toBe(true);
    expect(page.get("writeEnabled")).toBe("ask");
    expect(dpapiStore(() => file, fake).delete("writeEnabled")).toBe(true);
    expect(page.get("writeEnabled")).toBe("ask");
    expect(page.get("writeEnabled", true)).toBeNull();
    expect(page.get("writeEnabled")).toBeNull();
  });

  it("set and delete start from the file as it is now, not from a stale cache", () => {
    const file = join(
      mkdtempSync(join(tmpdir(), "tg-dpapi-")),
      "secrets.dpapi"
    );
    const a = dpapiStore(() => file, fake);
    expect(a.set("writeEnabled", "ask")).toBe(true);
    expect(a.set("other", "x")).toBe(true);
    expect(a.get("writeEnabled")).toBe("ask");
    const b = dpapiStore(() => file, fake);
    expect(b.delete("writeEnabled")).toBe(true);
    expect(a.set("approvalKey", "k1")).toBe(true);
    const now = dpapiStore(() => file, fake);
    expect(now.get("approvalKey")).toBe("k1");
    expect(now.get("writeEnabled")).toBeNull();
    expect(now.get("other")).toBe("x");

    expect(b.set("sessionString", "s")).toBe(true);
    expect(a.delete("other")).toBe(true);
    const after = dpapiStore(() => file, fake);
    expect(after.get("sessionString")).toBe("s");
    expect(after.get("approvalKey")).toBe("k1");
    expect(after.get("other")).toBeNull();
  });

  it("reads nothing from a file it cannot decrypt", () => {
    const file = join(
      mkdtempSync(join(tmpdir(), "tg-dpapi-")),
      "secrets.dpapi"
    );
    dpapiStore(() => file, fake).set("k", "v");
    const broken = dpapiStore(() => file, {
      protect: () => {
        throw new Error("no");
      },
      unprotect: () => {
        throw new Error("no");
      },
    });
    expect(broken.get("k")).toBeNull();
    expect(broken.set("k", "w")).toBe(false);
  });

  it("encodes PowerShell commands as UTF-16LE base64", () => {
    const script = "Write-Output 'Привет'";
    expect(
      Buffer.from(encodedCommand(script), "base64").toString("utf16le")
    ).toBe(script);
  });

  it.runIf(process.platform === "win32")(
    "round-trips through real DPAPI",
    async () => {
      const { dpapiStore: real } = await import("../src/dpapi.js");
      const file = join(
        mkdtempSync(join(tmpdir(), "tg-dpapi-")),
        "secrets.dpapi"
      );
      const store = real(() => file);
      let t = Date.now();
      expect(store.set("sessionString", "real-secret-ÄЖ")).toBe(true);
      console.log(`DPAPI protect: ${Date.now() - t} ms`);
      expect(readFileSync(file, "utf-8")).not.toContain("real-secret");
      t = Date.now();
      expect(real(() => file).get("sessionString")).toBe("real-secret-ÄЖ");
      console.log(`DPAPI unprotect: ${Date.now() - t} ms`);
    },
    60_000
  );
});

describe("Windows write-access confirmation", () => {
  const cjk = "確".repeat(200);
  const longText = Array.from(
    { length: 20 },
    (_, i) => `    Trigger t${i}: ${cjk}`
  ).join("\n");

  it("runs a fixed script: the text goes on stdin as base64, the default is No", () => {
    const script = windowsConfirmScript();
    expect(script).toContain("[Console]::In.ReadToEnd()");
    expect(script).toContain("'YesNo', 'Warning', 'Button2'");
    expect(script).toContain("TopMost = $true");
    expect(windowsConfirmInput("It's «ok»?")).toBe(
      Buffer.from("It's «ok»?", "utf-8").toString("base64")
    );
    expect(
      windowsConfirmInput(
        "x\u2019); Remove-Item C:\\ -Recurse; (\u2018\u201A\u201B'"
      )
    ).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("a summary of the largest valid manifest keeps the command line short and reaches the dialog whole", async () => {
    let seen: { args: string[]; input: string } | undefined;
    const runner: Runner = async (_file, args, input) => {
      seen = { args, input };
      return { ok: true, stdout: "ALLOW" };
    };
    await expect(confirmOnWindows(longText, runner)).resolves.toBe(true);
    expect(seen!.args.join(" ").length).toBeLessThan(4000);
    expect(seen!.args.join(" ")).toBe(
      await (async () => {
        let a = "";
        await confirmOnWindows("short", async (_f, args) => {
          a = args.join(" ");
          return { ok: true, stdout: "DENY" };
        });
        return a;
      })()
    );
    expect(Buffer.from(seen!.input, "base64").toString("utf-8")).toContain(
      longText
    );
  });

  it("No and a timeout are No; a dialog that could not start is an error, not the user's No", async () => {
    await expect(
      confirmOnWindows("q", async () => ({ ok: true, stdout: "DENY" }))
    ).resolves.toBe(false);
    await expect(
      confirmOnWindows("q", async () => ({
        ok: false,
        timedOut: true,
        error: "timeout",
      }))
    ).resolves.toBe(false);
    await expect(
      confirmOnWindows("q", async () => ({
        ok: false,
        timedOut: false,
        error: "spawn ENAMETOOLONG",
      }))
    ).rejects.toMatchObject({ code: "dialog_failed" });
    await expect(
      confirmOnWindows("q", async () => ({ ok: true, stdout: "" }))
    ).rejects.toMatchObject({ code: "dialog_failed" });
  });

  it.runIf(process.platform === "win32")("parses as valid PowerShell", () => {
    const ps = join(
      process.env.SystemRoot || "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe"
    );
    const file = join(mkdtempSync(join(tmpdir(), "tg-ps-")), "confirm.ps1");
    writeFileSync(file, `\uFEFF${windowsConfirmScript()}`, "utf-8");
    const check = `$e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${file.replaceAll("'", "''")}', [ref]$null, [ref]$e); [Console]::Out.Write($e.Count)`;
    const res = spawnSync(
      ps,
      [
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        encodedCommand(check),
      ],
      { encoding: "utf-8", windowsHide: true }
    );
    expect(res.stdout.trim()).toBe("0");
  });
});

describe("Scoop manifest", () => {
  it("points at the release zip with its checksum", async () => {
    const { scoopManifest } = await import("../scripts/scoop-manifest.mjs");
    const sums =
      "aaa  better-tg-cli-1.2.3-darwin-arm64.tar.xz\nbbb  better-tg-cli-1.2.3-windows-x64.zip\n";
    const m = scoopManifest("1.2.3", sums);
    expect(m.version).toBe("1.2.3");
    expect(m.architecture["64bit"]).toEqual({
      url: "https://github.com/TheVilfer/better-tg-cli/releases/download/v1.2.3/better-tg-cli-1.2.3-windows-x64.zip",
      hash: "bbb",
    });
    expect(m.bin).toBe("telegram.exe");
    expect(() => scoopManifest("9.9.9", sums)).toThrow(/No checksum/);
  });
});
