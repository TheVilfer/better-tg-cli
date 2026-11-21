/**
 * SemVer 2.0 versions and node-semver ranges, as far as `engines.better-tg-cli` needs them:
 * comparators (`<`, `<=`, `>`, `>=`, `=`), X-ranges (`1.x`, `1.2.*`, `*`), partial versions, tilde,
 * caret, hyphen ranges, sets joined by spaces and alternatives joined by `||`. Prereleases follow
 * node-semver's default: a prerelease version matches only when a comparator of the same set names
 * a prerelease of the same major.minor.patch.
 *
 * Syntax outside this list throws (`InvalidRangeError`): a manifest with it is invalid, never
 * "satisfied by default".
 */

export class InvalidRangeError extends Error {}

export interface Version {
  major: number;
  minor: number;
  patch: number;
  pre: (string | number)[];
}

const NUM = "0|[1-9]\\d*";
const PRE_ID = "0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*";
const VERSION_RE = new RegExp(
  `^v?(${NUM})\\.(${NUM})\\.(${NUM})(?:-((?:${PRE_ID})(?:\\.(?:${PRE_ID}))*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`
);
const PARTIAL_RE = new RegExp(
  `^v?(${NUM}|[xX*])(?:\\.(${NUM}|[xX*])(?:\\.(${NUM}|[xX*])(?:-((?:${PRE_ID})(?:\\.(?:${PRE_ID}))*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?)?)?$`
);

const preIds = (s: string | undefined): (string | number)[] =>
  s ? s.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [];

export function parseVersion(text: string): Version | null {
  const m = VERSION_RE.exec(text.trim());
  if (!m) {
    return null;
  }
  const [major, minor, patch] = [m[1], m[2], m[3]].map(Number);
  if (![major, minor, patch].every(Number.isSafeInteger)) {
    return null;
  }
  return { major, minor, patch, pre: preIds(m[4]) };
}

export function compareVersions(a: Version, b: Version): number {
  for (const k of ["major", "minor", "patch"] as const) {
    if (a[k] !== b[k]) {
      return a[k] < b[k] ? -1 : 1;
    }
  }
  if (!a.pre.length || !b.pre.length) {
    return a.pre.length === b.pre.length ? 0 : a.pre.length ? -1 : 1;
  }
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === undefined) {
      return -1;
    }
    if (y === undefined) {
      return 1;
    }
    if (x === y) {
      continue;
    }
    if (typeof x === "number" && typeof y === "number") {
      return x < y ? -1 : 1;
    }
    if (typeof x === "number") {
      return -1;
    }
    if (typeof y === "number") {
      return 1;
    }
    return x < y ? -1 : 1;
  }
  return 0;
}

type Op = "<" | "<=" | ">" | ">=" | "=";
/** `explicit`: the range itself names this version (a prerelease written in a synthesized bound does not count). */
interface Comparator {
  op: Op;
  v: Version;
  explicit: boolean;
}

interface Partial {
  major?: number;
  minor?: number;
  patch?: number;
  pre: (string | number)[];
}

function parsePartial(text: string, range: string): Partial {
  const m = PARTIAL_RE.exec(text);
  if (!m) {
    throw new InvalidRangeError(
      `Invalid version "${text}" in range "${range}"`
    );
  }
  const n = (s: string | undefined) =>
    s === undefined || /^[xX*]$/.test(s) ? undefined : Number(s);
  const p: Partial = {
    major: n(m[1]),
    minor: n(m[2]),
    patch: n(m[3]),
    pre: preIds(m[4]),
  };
  // `1.x.3` is not a range
  if (
    (p.major === undefined &&
      (p.minor !== undefined || p.patch !== undefined)) ||
    (p.minor === undefined && p.patch !== undefined)
  ) {
    throw new InvalidRangeError(
      `Invalid version "${text}" in range "${range}"`
    );
  }
  return p;
}

const v = (
  major: number,
  minor: number,
  patch: number,
  pre: (string | number)[] = []
): Version => ({ major, minor, patch, pre });
const ZERO_PRE = [0];
const cmp = (op: Op, ver: Version, explicit = false): Comparator => ({
  op,
  v: ver,
  explicit,
});

/** The comparators of one simple range item (`^1.2`, `>=1.0.0`, `1.x`, …). */
function expand(item: string, range: string): Comparator[] {
  const m = /^(\^|~>?|<=|>=|<|>|=)?\s*(.+)$/.exec(item);
  if (!m) {
    throw new InvalidRangeError(`Invalid range "${range}"`);
  }
  const op = m[1] ?? "";
  const p = parsePartial(m[2], range);
  const full =
    p.major !== undefined && p.minor !== undefined && p.patch !== undefined;
  const lower = v(p.major ?? 0, p.minor ?? 0, p.patch ?? 0, full ? p.pre : []);
  const explicit = full && p.pre.length > 0;
  if (op === "^") {
    if (p.major === undefined) {
      return [cmp(">=", v(0, 0, 0))];
    }
    let upper: Version;
    if (p.major > 0 || p.minor === undefined) {
      upper = v(p.major + 1, 0, 0, ZERO_PRE);
    } else if (p.minor > 0 || p.patch === undefined) {
      upper = v(0, p.minor + 1, 0, ZERO_PRE);
    } else {
      upper = v(0, 0, p.patch + 1, ZERO_PRE);
    }
    return [cmp(">=", lower, explicit), cmp("<", upper)];
  }
  if (op === "~" || op === "~>") {
    if (p.major === undefined) {
      return [cmp(">=", v(0, 0, 0))];
    }
    const upper =
      p.minor === undefined
        ? v(p.major + 1, 0, 0, ZERO_PRE)
        : v(p.major, p.minor + 1, 0, ZERO_PRE);
    return [cmp(">=", lower, explicit), cmp("<", upper)];
  }
  if (full) {
    return [cmp((op || "=") as Op, lower, explicit)];
  }
  // A partial version with a comparator
  if (p.major === undefined) {
    return op === "<" || op === ">"
      ? [cmp("<", v(0, 0, 0, ZERO_PRE))]
      : [cmp(">=", v(0, 0, 0))];
  }
  const next =
    p.minor === undefined ? v(p.major + 1, 0, 0) : v(p.major, p.minor + 1, 0);
  switch (op) {
    case ">": {
      return [cmp(">=", next)];
    }
    case ">=": {
      return [cmp(">=", lower)];
    }
    case "<": {
      return [cmp("<", v(lower.major, lower.minor, 0, ZERO_PRE))];
    }
    case "<=": {
      return [cmp("<", v(next.major, next.minor, next.patch, ZERO_PRE))];
    }
    default: {
      return [
        cmp(">=", lower),
        cmp("<", v(next.major, next.minor, next.patch, ZERO_PRE)),
      ];
    }
  }
}

function parseSet(text: string, range: string): Comparator[] {
  const t = text.trim().replaceAll(/(\^|~>?|<=|>=|<|>|=)\s+/g, "$1");
  if (t === "" || t === "*") {
    return [cmp(">=", v(0, 0, 0))];
  }
  const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(t);
  if (hyphen) {
    const from = parsePartial(hyphen[1], range);
    const to = parsePartial(hyphen[2], range);
    const out: Comparator[] = [];
    if (from.major !== undefined) {
      const full = from.minor !== undefined && from.patch !== undefined;
      out.push(
        cmp(
          ">=",
          v(from.major, from.minor ?? 0, from.patch ?? 0, full ? from.pre : []),
          full && from.pre.length > 0
        )
      );
    }
    if (to.major !== undefined) {
      if (to.minor !== undefined && to.patch !== undefined) {
        out.push(
          cmp("<=", v(to.major, to.minor, to.patch, to.pre), to.pre.length > 0)
        );
      } else {
        out.push(
          cmp(
            "<",
            to.minor === undefined
              ? v(to.major + 1, 0, 0, ZERO_PRE)
              : v(to.major, to.minor + 1, 0, ZERO_PRE)
          )
        );
      }
    }
    return out.length ? out : [cmp(">=", v(0, 0, 0))];
  }
  if (/\s-\s/.test(t)) {
    throw new InvalidRangeError(`Invalid range "${range}"`);
  }
  return t.split(/\s+/).flatMap((item) => expand(item, range));
}

/** Parses a range; throws InvalidRangeError on anything it does not understand. */
export function parseRange(range: string): Comparator[][] {
  if (range.length > 200) {
    throw new InvalidRangeError("Range is too long");
  }
  return range.split("||").map((set) => parseSet(set, range));
}

function test(c: Comparator, ver: Version): boolean {
  const r = compareVersions(ver, c.v);
  switch (c.op) {
    case "<": {
      return r < 0;
    }
    case "<=": {
      return r <= 0;
    }
    case ">": {
      return r > 0;
    }
    case ">=": {
      return r >= 0;
    }
    default: {
      return r === 0;
    }
  }
}

/** Whether `version` satisfies `range` (both node-semver syntax). Throws on an invalid range or version. */
export function satisfies(version: string, range: string): boolean {
  const ver = parseVersion(version);
  if (!ver) {
    throw new InvalidRangeError(`Invalid version "${version}"`);
  }
  return parseRange(range).some((set) => {
    if (!set.every((c) => test(c, ver))) {
      return false;
    }
    if (!ver.pre.length) {
      return true;
    }
    // A prerelease only matches a range that names a prerelease of the same version
    return set.some(
      (c) =>
        c.explicit &&
        c.v.pre.length > 0 &&
        c.v.major === ver.major &&
        c.v.minor === ver.minor &&
        c.v.patch === ver.patch
    );
  });
}
