import { readFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { brotliDecompressSync } from "node:zlib";

/** Where a build ran: the facts a leaked path would contain. */
export interface BuildMachine {
  root: string;
  home: string;
  user: string;
}

/** Literals in third-party code that look like a home folder but are not the builder's. */
export const NOT_THE_BUILDER = ["/home/web_user"];

const GENERIC = [/\/Users\//, /\/home\//, /[A-Za-z]:(?:\\|\/)+Users\b/i];

const MIN_USER_LENGTH = 2;

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function spellings(path: string): string[] {
  if (path.length <= 1) {
    return [];
  }
  const slashed = path.replaceAll("\\", "/");
  return [
    ...new Set([
      path,
      slashed,
      path.replaceAll("\\", "\\\\"),
      pathToFileURL(path).href,
      encodeURI(slashed),
    ]),
  ];
}

/** The current machine as a BuildMachine. */
export function thisMachine(): BuildMachine {
  return { root: resolve("."), home: homedir(), user: userInfo().username };
}

/**
 * Every place in `text` that names the build machine: its repository root or home folder in any
 * spelling (as is, with forward slashes, JSON-escaped, as a file URL), the user name as a path
 * segment, or a generic home path (`/Users/`, `/home/`, `C:\Users`).
 */
export function machinePaths(text: string, machine: BuildMachine): string[] {
  let rest = text;
  for (const allowed of NOT_THE_BUILDER) {
    rest = rest.replaceAll(allowed, "");
  }
  const found = new Set<string>();
  for (const spelling of [
    ...spellings(machine.root),
    ...spellings(machine.home),
  ]) {
    if (rest.includes(spelling)) {
      found.add(spelling);
    }
  }
  const patterns = [...GENERIC];
  if (machine.user.length >= MIN_USER_LENGTH) {
    patterns.push(
      new RegExp(String.raw`[\\/]${escapeRegExp(machine.user)}[\\/]`)
    );
  }
  for (const pattern of patterns) {
    const match = rest.match(pattern);
    if (match?.index !== undefined) {
      found.add(rest.slice(Math.max(0, match.index - 40), match.index + 80));
    }
  }
  return [...found];
}

/** The text of the CLI bundle: the loader followed by its decompressed CommonJS payload. */
export function cliBundleText(file = "dist/telegram.mjs"): string {
  const loader = readFileSync(file, "utf-8");
  const packed = loader.match(/Buffer\.from\("([A-Za-z0-9+/=]+)", 'base64'\)/);
  if (!packed) {
    throw new Error(`${file} has no compressed payload`);
  }
  const payload = brotliDecompressSync(Buffer.from(packed[1], "base64"));
  return `${loader}\n${payload.toString("utf-8")}`;
}
