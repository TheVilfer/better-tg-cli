import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  isShellScript,
  shellComments,
} from "../scripts/lint/no-comments-sh.mjs";
import { useSpawnTimeout } from "./helpers/spawn-timeout.js";

useSpawnTimeout();

const root = resolve(import.meta.dirname, "..");
const dir = mkdtempSync(join(tmpdir(), "tg-no-comments-"));

afterAll(() => rmSync(dir, { force: true, recursive: true }));

const config = join(root, "scripts/lint/fixtures.oxlintrc.json");

function refusedLines(name: string, source: string): number[] {
  writeFileSync(join(dir, name), source);
  const run = spawnSync(
    process.execPath,
    [
      join(root, "node_modules/oxlint/bin/oxlint"),
      "-c",
      config,
      "-f",
      "unix",
      name,
    ],
    { cwd: dir, encoding: "utf-8" }
  );
  const lines = run.stdout
    .split("\n")
    .filter((l) => l.includes("better-tg-cli(no-comments)"))
    .map((l) => Number(l.split(":")[1]));
  expect(`${run.stdout}${run.stderr}`).not.toMatch(/Failed to/);
  expect(run.status).toBe(lines.length > 0 ? 1 : 0);
  return lines.toSorted((a, b) => a - b);
}

describe("the no-comments rule for TypeScript and JavaScript", () => {
  it("allows a shebang and JSDoc right above an exported declaration", () => {
    const source = [
      "#!/usr/bin/env node",
      "/** A function. */",
      "export function f(): number {",
      "  return 1;",
      "}",
      "/** A constant. */",
      "export const x = 1;",
      "/** A type. */",
      "export type T = string;",
      "/** An interface. */",
      "export interface I {",
      "  a: string;",
      "}",
      "/** An enum. */",
      "export enum E {",
      "  A,",
      "}",
      "/** The default. */",
      "export default function g(): void {}",
    ].join("\n");
    expect(refusedLines("allowed.ts", source)).toEqual([]);
  });

  it("allows JSDoc on the public members of an exported class", () => {
    const source = [
      "/** A class. */",
      "export class K {",
      "  /** A method. */",
      "  m(): void {}",
      "  /** A static field. */",
      "  static s = 1;",
      "  /** An accessor. */",
      "  get v(): number {",
      "    return 1;",
      "  }",
      "}",
    ].join("\n");
    expect(refusedLines("members.ts", source)).toEqual([]);
  });

  it("refuses line, block and trailing comments", () => {
    const source = [
      "// a line",
      "/* a block */",
      "const a = 1; // trailing",
      "const b = /* inline */ 2;",
      "export const c = a + b;",
    ].join("\n");
    expect(refusedLines("plain.ts", source)).toEqual([1, 2, 3, 4]);
  });

  it("refuses JSDoc that is not right above an export", () => {
    const source = [
      "/** Not exported. */",
      "function hidden(): number {",
      "  return 1;",
      "}",
      "/** A re-export list is no declaration. */",
      "export { hidden };",
      "/** Separated by another comment. */",
      "// in between",
      "export const y = 2;",
      "/** Not a member of an exported class. */",
      "class Local {}",
      "export const z = Local;",
    ].join("\n");
    expect(refusedLines("misplaced.ts", source)).toEqual([1, 5, 7, 8, 10]);
  });

  it("refuses JSDoc on private members and on interface members", () => {
    const source = [
      "export class P {",
      "  /** A private field. */",
      "  #p = 1;",
      "  /** A private method. */",
      "  private q(): number {",
      "    return this.#p;",
      "  }",
      "}",
      "export interface Shape {",
      "  /** A member. */",
      "  a: string;",
      "}",
    ].join("\n");
    expect(refusedLines("private.ts", source)).toEqual([2, 4, 10]);
  });

  it("refuses tool directives that are comments", () => {
    const source = [
      '/// <reference types="node" />',
      "// @ts-expect-error",
      "// oxlint-disable-next-line no-unused-vars",
      "export const w: number = 1;",
    ].join("\n");
    expect(refusedLines("directives.ts", source)).toEqual([1, 2, 3]);
  });

  it("does not take comment markers inside strings, templates or regexes for comments", () => {
    const source = [
      'export const url = "http://example.org/*x*/";',
      "export const template = `// ${url} /* */`;",
      "export const pattern = /\\/\\/ x/;",
    ].join("\n");
    expect(refusedLines("strings.js", source)).toEqual([]);
  });
});

describe("the no-comments check for shell scripts", () => {
  const lines = (text: string) => shellComments(text).map((c) => c.line);

  it("allows a shebang on the first line only", () => {
    expect(lines("#!/bin/sh\necho hi\n")).toEqual([]);
    expect(lines("echo hi\n#!/bin/sh\n")).toEqual([2]);
  });

  it("refuses full-line, indented and trailing comments", () => {
    expect(
      lines("#!/bin/sh\n# a line\n  # indented\necho hi # trailing\n")
    ).toEqual([2, 3, 4]);
  });

  it("ignores # inside quotes, words and parameter expansions", () => {
    const script = [
      "#!/bin/sh",
      "echo \"#x\" '#y' a#b \\#z",
      "echo $# ${#v} ${v#x} ${v##*/}",
      "echo $(( 1 << 2 ))",
    ].join("\n");
    expect(lines(script)).toEqual([]);
  });

  it("ignores # inside heredoc bodies, quoted and tab-stripped too", () => {
    const script = [
      "#!/bin/sh",
      "cat <<EOF",
      "# body",
      "EOF",
      "cat <<-'END'",
      "\t# body",
      "\tEND",
      'cat <<"Q" # after',
      "# body",
      "Q",
      "# real",
    ].join("\n");
    expect(lines(script)).toEqual([8, 11]);
  });

  it("knows a shell script by its name or its shebang", () => {
    expect(isShellScript("a/run.sh", "echo")).toBe(true);
    expect(isShellScript("scripts/tg-dev", "#!/usr/bin/env bash\n")).toBe(true);
    expect(isShellScript("scripts/tool", "#!/usr/bin/env node\n")).toBe(false);
    expect(isShellScript("notes.md", "#!/bin/sh\n")).toBe(false);
  });
});
