#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const WORD_START = new Set(["", " ", "\t", ";", "|", "&", "(", ")"]);
const HEREDOC = /^<<(-?)\s*(?:'([^']*)'|"([^"]*)"|\\?([A-Za-z_]\w*))/;

/**
 * Finds the comments of a POSIX shell or Bash script: a `#` at the start of a word, outside quotes
 * and heredoc bodies. A shebang on the first line is allowed. Returns 1-based line and column.
 */
export function shellComments(text) {
  const found = [];
  const lines = text.split("\n");
  let quote = "";
  const heredocs = [];
  let body = null;
  for (let row = 0; row < lines.length; row += 1) {
    const line = lines[row];
    if (body) {
      const end = body.strip ? line.replace(/^\t+/, "") : line;
      if (end === body.word) {
        body = heredocs.shift() ?? null;
      }
      continue;
    }
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col];
      if (quote === "'") {
        if (ch === "'") {
          quote = "";
        }
        continue;
      }
      if (ch === "\\") {
        col += 1;
        continue;
      }
      if (quote === '"') {
        if (ch === '"') {
          quote = "";
        }
        continue;
      }
      if (ch === "'" || ch === '"') {
        quote = ch;
        continue;
      }
      if (ch === "<" && line[col + 1] === "<" && line[col + 2] !== "<") {
        const m = HEREDOC.exec(line.slice(col));
        if (m) {
          heredocs.push({ strip: m[1] === "-", word: m[2] ?? m[3] ?? m[4] });
          col += m[0].length - 1;
        }
        continue;
      }
      if (ch === "#" && WORD_START.has(line[col - 1] ?? "")) {
        if (!(row === 0 && col === 0 && line.startsWith("#!"))) {
          found.push({ line: row + 1, column: col + 1 });
        }
        break;
      }
    }
    if (heredocs.length > 0 && quote === "") {
      body = heredocs.shift();
    }
  }
  return found;
}

/** Whether a tracked file is a shell script: a .sh name, or no extension and an sh/bash shebang. */
export function isShellScript(path, text) {
  if (extname(path) === ".sh") {
    return true;
  }
  return extname(path) === "" && /^#!.*\b(?:ba|da|z)?sh\b/.test(text);
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf-8" })
    .split("\0")
    .filter(Boolean);
}

function main() {
  let failures = 0;
  for (const path of trackedFiles()) {
    let text;
    try {
      text = readFileSync(path, "utf-8");
    } catch {
      continue;
    }
    if (!isShellScript(path, text)) {
      continue;
    }
    for (const { line, column } of shellComments(text)) {
      failures += 1;
      console.error(
        `${path}:${line}:${column}: No comments in code: put the why in a name or docs/.`
      );
    }
  }
  if (failures > 0) {
    console.error(`${failures} comment(s) in shell scripts`);
    process.exit(1);
  }
}

if (process.argv[1] === import.meta.filename) {
  main();
}
