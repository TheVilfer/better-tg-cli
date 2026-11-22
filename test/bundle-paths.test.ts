import { describe, expect, it } from "vitest";

import { cliBundleText, machinePaths, thisMachine } from "./build-paths.js";
import type { BuildMachine } from "./build-paths.js";

const MAC: BuildMachine = {
  root: "/Users/alice/src/better-tg-cli",
  home: "/Users/alice",
  user: "alice",
};
const LINUX_CI: BuildMachine = {
  root: "/home/runner/work/better-tg-cli/better-tg-cli",
  home: "/home/runner",
  user: "runner",
};
const WINDOWS_CI: BuildMachine = {
  root: String.raw`D:\a\better-tg-cli\better-tg-cli`,
  home: String.raw`C:\Users\runneradmin`,
  user: "runneradmin",
};

describe(machinePaths, () => {
  it.each([
    ["a CommonJS __filename", MAC, 'var a="/Users/alice/src/x.cjs";'],
    ["a file URL", MAC, 'f("file:///Users/alice/src/better-tg-cli/x.mjs")'],
    ["the home folder alone", MAC, 'h="/Users/alice"'],
    ["the user name inside another folder", MAC, 'p="/opt/build/alice/x.js"'],
    ["a Linux runner path", LINUX_CI, 'p="/home/runner/work/x.js"'],
    [
      "a JSON-escaped Windows path",
      WINDOWS_CI,
      String.raw`p="D:\\a\\better-tg-cli\\better-tg-cli\\node_modules\\x.cjs"`,
    ],
    [
      "a Windows home",
      WINDOWS_CI,
      String.raw`p="C:\\Users\\runneradmin\\AppData\\Local\\Temp\\x"`,
    ],
    ["another user's home", LINUX_CI, 'p="/Users/bob/x"'],
  ])("finds %s", (_, machine, text) => {
    expect(machinePaths(text, machine)).not.toEqual([]);
  });

  it("passes emscripten's virtual home and words equal to the user name", () => {
    expect(
      machinePaths(
        'ENV.HOME="/home/web_user";const runner=1;"runner up"',
        LINUX_CI
      )
    ).toEqual([]);
  });
});

describe("the CLI bundle (dist/telegram.mjs)", () => {
  const text = cliBundleText();

  it.each([
    ["this machine", thisMachine()],
    ["a Linux CI runner", LINUX_CI],
    ["a Windows CI runner", WINDOWS_CI],
    ["a Mac", MAC],
  ])("names no path of %s, payload included", (_, machine) => {
    expect(machinePaths(text, machine)).toEqual([]);
  });

  it("gives bundled modules the bundle's own location at run time", () => {
    const banner = "var __bundleFilename=__filename,__bundleDirname=__dirname";
    expect(text).toContain(banner);
  });
});
