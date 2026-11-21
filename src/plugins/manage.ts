import { createHash } from "node:crypto";
import { accessSync, constants, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { oneLine } from "../approval-action.js";
import { auditLog } from "../audit.js";
import { CliError, EXIT, usageError } from "../errors.js";
import { mockStatePath } from "../mock/world.js";
import { isMock, profile } from "../paths.js";
import { VERSION } from "../version.js";
import { pluginSource } from "./catalog.js";
import {
  installSummary,
  originLabel,
  removeQuestion,
  updateSummary,
} from "./human.js";
import type { UpdateDiff } from "./human.js";
import { allEffects } from "./manifest.js";
import type { Manifest } from "./manifest.js";
import {
  erasePluginSecret,
  parseSlotText,
  secretGeneration,
  secretGenerations,
  slotText,
} from "./secrets.js";
import {
  fetchGithubSnapshot,
  parseSource,
  readLocalSnapshot,
} from "./source.js";
import type { Fetch, Snapshot } from "./source.js";
import {
  assertCanSignLater,
  commitInstall,
  commitUpdate,
  findEntry,
  installedSlots,
  own,
  pendingSecrets,
  readLock,
  removeInstall,
  settlePendingSecrets,
  snapshotId,
  tampered,
  verifyInstalled,
  withPluginLock,
} from "./store.js";
import type { LockEntry } from "./store.js";

/**
 * Test seams for the MCP server's use (the CLI passes its own through `opts`). `onPath`: whether a
 * program is on PATH (the fallback command uses `telegram` then, else the pinned npx).
 */
export const manageDeps: {
  fetch?: Fetch;
  cliVersion?: string;
  onPath?: (bin: string) => boolean;
  platform?: NodeJS.Platform;
} = {};

/** `via`: where the human was asked, for the audit entry; `signal` stops a GitHub fetch (a cancelled MCP call). */
export interface PrepareOptions {
  fetch?: Fetch;
  cliVersion?: string;
  via?: "terminal" | "mcp";
  signal?: AbortSignal;
}

export type Prepared =
  | {
      op: "install";
      name: string;
      question: string;
      argv: string[];
      digest: string;
      snapshot: Snapshot;
    }
  | {
      op: "update";
      name: string;
      question: string;
      argv: string[];
      digest: string;
      snapshot: Snapshot;
      old: LockEntry;
      oldManifest: Manifest;
      diff: UpdateDiff;
    }
  | {
      op: "remove";
      name: string;
      question: string;
      argv: string[];
      digest: string;
      old: LockEntry;
      keepData: boolean;
    };

type Draft = Prepared extends infer T
  ? T extends Prepared
    ? Omit<T, "digest">
    : never
  : never;

const REVISION_RE = /^sha256-[A-Za-z0-9+/]{43}=$/;
const COMMIT_RE = /^[0-9a-f]{40}$/;

/** `--expect`: a content hash for a folder, a commit SHA for GitHub. */
export function expectProblem(expect: string): string | undefined {
  return REVISION_RE.test(expect) || COMMIT_RE.test(expect)
    ? undefined
    : "--expect must be a folder's sha256-… revision (as `plugin validate` prints it) or a GitHub commit SHA (40 hex characters)";
}

const mismatch = (what: string, got: string, want: string, hint: string) =>
  new CliError(
    `The ${what} is ${got}, not the expected ${want}`,
    "plugin_revision_mismatch",
    EXIT.ERROR,
    { hint }
  );

async function takeSnapshot(
  source: ReturnType<typeof parseSource>,
  expect: string | undefined,
  opts: PrepareOptions
): Promise<Snapshot> {
  const cli = opts.cliVersion ?? VERSION;
  if (source.type === "github") {
    if (expect !== undefined && !COMMIT_RE.test(expect)) {
      throw usageError(
        "--expect for a GitHub plugin is the commit SHA (40 hex characters); a folder takes its sha256-… revision"
      );
    }
    if (process.env.VITEST && !opts.fetch) {
      throw new Error(
        "A test reached the GitHub API: inject a fetch (pluginDeps.fetch / manageDeps.fetch)"
      );
    }
    const snap = await fetchGithubSnapshot(
      source,
      opts.fetch,
      cli,
      opts.signal
    );
    if (expect !== undefined && snap.revision !== expect) {
      throw mismatch(
        `commit of ${originLabel(snap.source)}`,
        snap.revision,
        expect,
        "The branch or tag moved since the command was made. Check the new commit, then run it again."
      );
    }
    return snap;
  }
  if (expect !== undefined && !REVISION_RE.test(expect)) {
    throw usageError(
      "--expect for a folder is its sha256-… revision, as `plugin validate` prints it"
    );
  }
  const snap = readLocalSnapshot(source.path, cli);
  if (expect !== undefined && expect !== snap.revision) {
    throw mismatch(
      "folder's content",
      snap.revision,
      expect,
      "Check what changed in the folder, then run it again."
    );
  }
  return snap;
}

function sourceArg(s: Snapshot["source"]): string {
  return s.type === "github"
    ? `github:${s.owner}/${s.repo}${s.ref ? `@${s.ref}` : ""}`
    : s.path;
}

function digestOf(p: Draft): string {
  const h = createHash("sha256");
  const part = (v: unknown) => h.update(JSON.stringify(v ?? null)).update("\0");
  part(p.op);
  part(p.name);
  part(p.question);
  part(p.argv);
  if ("snapshot" in p) {
    part(p.snapshot.revision);
    part(
      Object.keys(p.snapshot.hashes)
        .sort()
        .map((k) => [k, p.snapshot.hashes[k]])
    );
    for (const [k, bytes] of [...p.snapshot.files].sort(([a], [b]) =>
      a < b ? -1 : 1
    )) {
      part(k);
      h.update(bytes);
    }
  }
  if ("old" in p) {
    part([p.old.installId, p.old.revision, snapshotId(p.old)]);
  }
  if (p.op === "remove") {
    part(p.keepData);
  }
  return `sha256-${h.digest("base64")}`;
}

const withDigest = <T extends Draft>(p: T): T & { digest: string } => ({
  ...p,
  digest: digestOf(p),
});

export async function prepareInstall(
  sourceText: string,
  expect: string | undefined,
  opts: PrepareOptions = {}
): Promise<Extract<Prepared, { op: "install" }>> {
  if (expect !== undefined && expectProblem(expect)) {
    throw usageError(expectProblem(expect)!);
  }
  const snap = await takeSnapshot(parseSource(sourceText), expect, opts);
  const { plugins } = readLock();
  const name = snap.manifest.name;
  const existing = own(plugins, name) ? plugins[name] : undefined;
  if (existing) {
    throw new CliError(
      `Plugin "${name}" is already installed (${existing.version}, ${originLabel(existing.source)})`,
      "plugin_exists",
      EXIT.ERROR,
      {
        hint: `To get a newer revision: telegram plugin update ${name}. To install it from another source: telegram plugin remove ${name}, then install again.`,
      }
    );
  }
  assertCanSignLater();
  return withDigest({
    op: "install" as const,
    name,
    question: installSummary(snap),
    snapshot: snap,
    argv: [
      "plugin",
      "install",
      sourceArg(snap.source),
      "--expect",
      snap.revision,
    ],
  });
}

const minus = (a: readonly string[], b: readonly string[]) =>
  a.filter((x) => !b.includes(x));

const oldGenerations = (
  old: LockEntry,
  oldManifest: Manifest
): Record<string, string> => old.secrets ?? secretGenerations(oldManifest);

/**
 * What a new manifest asks for beyond what was accepted for `old`, and which stored secrets must go:
 * a secret whose inject rule changed (another generation, secret-slots.ts) or that was dropped.
 */
export function updateDiff(
  old: LockEntry,
  oldManifest: Manifest,
  m: Manifest
): UpdateDiff {
  const a = old.accepted;
  const was = oldGenerations(old, oldManifest);
  const secrets = m.secrets ?? [];
  const changed = secrets
    .filter(
      (x) => a.secrets.includes(x.name) && was[x.name] !== secretGeneration(x)
    )
    .map((x) => x.name);
  const names = secrets.map((x) => x.name);
  return {
    newly: {
      permissions: minus(m.permissions ?? [], a.permissions),
      effects: minus(allEffects(m), a.effects),
      network: minus(m.network ?? [], a.network),
      secrets: secrets
        .filter((x) => !a.secrets.includes(x.name) || changed.includes(x.name))
        .map((x) => x.name),
    },
    reset: [
      ...changed.map((name) => ({ name, why: "changed" as const })),
      ...minus(a.secrets, names).map((name) => ({
        name,
        why: "removed" as const,
      })),
    ],
    dropped: {
      permissions: minus(a.permissions, m.permissions ?? []),
      effects: minus(a.effects, allEffects(m)),
      network: minus(a.network, m.network ?? []),
    },
  };
}

export type UpdatePrepared =
  | Extract<Prepared, { op: "update" }>
  | { op: "up-to-date"; name: string; entry: LockEntry };

/**
 * A new snapshot from the recorded source of `name`: GitHub at the same ref (the default branch
 * when none was named), a folder at the same path. The same revision is "up to date" (nothing to
 * ask). A folder's new content needs `--expect` with its hash; a GitHub one may pin the commit.
 */
export async function prepareUpdate(
  name: string,
  expect: string | undefined,
  opts: PrepareOptions = {}
): Promise<UpdatePrepared> {
  if (expect !== undefined && expectProblem(expect)) {
    throw usageError(expectProblem(expect)!);
  }
  const entry = findEntry(name);
  const v = verifyInstalled(entry, opts.cliVersion ?? VERSION);
  if (!v.ok) {
    throw tampered(name, v.reason);
  }
  const s = entry.source;
  const source =
    s.type === "github"
      ? {
          type: "github" as const,
          owner: s.owner,
          repo: s.repo,
          ...(s.ref ? { ref: s.ref } : {}),
        }
      : { type: "local" as const, path: s.path };
  const local = source.type === "local";
  const snap = await takeSnapshot(source, local ? undefined : expect, opts);
  if (snap.revision === entry.revision) {
    if (local && expect !== undefined && expect !== snap.revision) {
      throw mismatch(
        "folder's content",
        snap.revision,
        expect,
        "Check what changed in the folder, then run it again."
      );
    }
    return { op: "up-to-date", name, entry };
  }
  if (source.type === "local") {
    if (expect === undefined) {
      const validate = ["plugin", "validate", source.path];
      const check = terminalCommand(validate);
      const update = terminalCommand(["plugin", "update", name]);
      throw new CliError(
        `The folder of "${name}" changed; updating from a folder takes the new content's hash`,
        "expect_required",
        EXIT.USAGE,
        {
          hint:
            check && update
              ? `Check the folder in a terminal: ${check}\nThen: ${update} --expect <the revision it prints>`
              : `The folder's path has characters that are not put into a command: run "plugin validate" on the folder in a terminal (typing its path), then "plugin update ${name} --expect <the revision it prints>".`,
          fields: { validate },
        }
      );
    }
    if (expect !== snap.revision) {
      throw mismatch(
        "folder's content",
        snap.revision,
        expect,
        "Check what changed in the folder, then run it again."
      );
    }
  }
  if (snap.manifest.name !== name) {
    throw new CliError(
      `The source of "${name}" now holds the plugin "${oneLine(snap.manifest.name)}"; nothing was updated`,
      "plugin_invalid",
      EXIT.ERROR,
      {
        hint: `To switch to it: telegram plugin remove ${name}, then install it.`,
      }
    );
  }
  assertCanSignLater();
  const diff = updateDiff(entry, v.manifest, snap.manifest);
  return withDigest({
    op: "update" as const,
    name,
    question: updateSummary(entry, snap, diff),
    snapshot: snap,
    old: entry,
    oldManifest: v.manifest,
    diff,
    argv: ["plugin", "update", name, "--expect", snap.revision],
  });
}

/** `--expect-install`: the installation and snapshot a remove command was made for, `<installId>:<snapshot>`. */
export const EXPECT_INSTALL_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const installRef = (e: LockEntry): string =>
  `${e.installId}:${snapshotId(e)}`;

/**
 * `expectInstall` (from a command made for the human): only that installation and snapshot is
 * removed; one installed again under the name since, or updated, is `plugin_changed`.
 */
export function prepareRemove(
  name: string,
  keepData: boolean,
  expectInstall?: string
): Extract<Prepared, { op: "remove" }> {
  if (expectInstall !== undefined && !EXPECT_INSTALL_RE.test(expectInstall)) {
    throw usageError(
      "--expect-install takes <installId>:<snapshot> as a command made for the user names it"
    );
  }
  const entry = findEntry(name);
  if (expectInstall !== undefined && expectInstall !== installRef(entry)) {
    throw new CliError(
      `Plugin "${name}" was installed again or updated since this command was made; nothing was removed`,
      "plugin_changed",
      EXIT.ERROR,
      {
        hint: `Check \`telegram plugin list\`; to remove the plugin installed now: telegram plugin remove ${name}`,
      }
    );
  }
  return withDigest({
    op: "remove" as const,
    name,
    question: removeQuestion(entry, keepData),
    old: entry,
    keepData,
    argv: [
      "plugin",
      "remove",
      name,
      ...(keepData ? ["--keep-data"] : []),
      "--expect-install",
      installRef(entry),
    ],
  });
}

const changedMeanwhile = (what: string) =>
  new CliError(
    `${what} changed after it was shown to the user; nothing was changed`,
    "plugin_changed",
    EXIT.ERROR,
    {
      hint: "Run the command again: the user is shown the new state.",
    }
  );

/**
 * Applies exactly what was prepared and shown: the digest must still match the prepared object,
 * a folder must still hold the same content, and the registry the same installation (checked under
 * the lock by commitInstall / commitUpdate / removeInstall). Writes the audit entry.
 */
export function applyPrepared(
  p: Prepared,
  opts: PrepareOptions = {}
): Record<string, unknown> {
  try {
    return applyChecked(p, opts);
  } catch (error) {
    const code = error instanceof CliError ? error.code : "error";
    const plugin =
      p.op === "remove"
        ? {
            name: p.name,
            version: p.old.version,
            revision: p.old.revision,
            installId: p.old.installId,
            keepData: p.keepData,
          }
        : {
            name: p.name,
            version: p.snapshot.manifest.version,
            revision: p.snapshot.revision,
            ...(p.op === "update"
              ? { installId: p.old.installId, fromRevision: p.old.revision }
              : {}),
          };
    try {
      auditLog({
        timestamp: new Date().toISOString(),
        command: `plugin ${p.op}`,
        target: p.name,
        plugin: { ...plugin, via: opts.via ?? "terminal" },
        result: {
          success: false,
          error: code,
          reason: oneLine(
            error instanceof Error ? error.message : String(error)
          ).slice(0, 300),
        },
      });
    } catch {}
    throw error;
  }
}

function applyChecked(
  p: Prepared,
  opts: PrepareOptions
): Record<string, unknown> {
  const { digest, ...rest } = p;
  if (digestOf(rest) !== digest) {
    throw changedMeanwhile("The prepared plugin change");
  }
  if ("snapshot" in p && p.snapshot.source.type === "local") {
    let now: string;
    try {
      now = readLocalSnapshot(
        p.snapshot.source.path,
        opts.cliVersion ?? VERSION
      ).revision;
    } catch {
      throw changedMeanwhile(`The folder ${p.snapshot.source.path}`);
    }
    if (now !== p.snapshot.revision) {
      throw changedMeanwhile(`The folder ${p.snapshot.source.path}`);
    }
  }
  const at = new Date().toISOString();
  if (p.op === "install") {
    const snap = p.snapshot;
    const entry = commitInstall(snap);
    auditLog({
      timestamp: at,
      command: "plugin install",
      target: entry.name,
      plugin: {
        name: entry.name,
        version: entry.version,
        revision: entry.revision,
        installId: entry.installId,
        source: originLabel(entry.source),
        via: opts.via ?? "terminal",
      },
      result: { success: true },
    });
    const m = snap.manifest;
    return {
      ok: true,
      action: "plugin install",
      name: entry.name,
      version: entry.version,
      source: pluginSource(entry.name, entry.version),
      origin: originLabel(entry.source),
      revision: entry.revision,
      official: entry.official,
      ...(snap.officialNote ? { officialNote: snap.officialNote } : {}),
      installId: entry.installId,
      next: m.onboarding
        ? ["plugin", "show", m.name, "--onboarding"]
        : ["plugin", "list"],
    };
  }
  if (p.op === "update") {
    const { old, snapshot: snap, diff, oldManifest } = p;
    const reset = diff.reset.map((r) => r.name);
    const was = oldGenerations(old, oldManifest);
    const now = secretGenerations(snap.manifest);
    const retire = [
      ...Object.entries(was)
        .filter(([n, g]) => now[n] !== g)
        .map(([name, gen]) => slotText({ name, gen })),
      ...(old.secrets ? [] : old.accepted.secrets),
    ];
    const fresh = Object.entries(now)
      .filter(([n, g]) => was[n] !== g)
      .map(([name, gen]) => ({ name, gen }));
    const entry = commitUpdate(old, snap, {
      retire,
      beforeSwitch: () => {
        for (const slot of fresh) {
          if (!erasePluginSecret(old.installId, slot)) {
            throw new CliError(
              `Could not clear the secret store for ${slot.name} of "${old.name}"; nothing was updated`,
              "secret_store_unavailable",
              EXIT.ERROR,
              {
                hint: "Check that the secret store answers (telegram check), then update again.",
              }
            );
          }
        }
      },
    });
    const secretsLeft =
      cleanupPendingSecrets((x) => x.installId === old.installId).get(
        old.installId
      ) ?? [];
    const setAgain = diff.reset
      .filter((r) => r.why === "changed")
      .map((r) => r.name);
    auditLog({
      timestamp: at,
      command: "plugin update",
      target: entry.name,
      plugin: {
        name: entry.name,
        installId: entry.installId,
        fromVersion: old.version,
        fromRevision: old.revision,
        version: entry.version,
        revision: entry.revision,
        source: originLabel(entry.source),
        newlyAccepted: diff.newly,
        secretsReset: reset,
        via: opts.via ?? "terminal",
      },
      result: { success: true },
    });
    return {
      ok: true,
      action: "plugin update",
      name: entry.name,
      installId: entry.installId,
      from: { version: old.version, revision: old.revision },
      version: entry.version,
      revision: entry.revision,
      source: pluginSource(entry.name, entry.version),
      newlyAccepted: diff.newly,
      ...(diff.reset.length ? { secretsReset: diff.reset } : {}),
      ...(setAgain.length
        ? {
            mustSetAgain: setAgain.map((s) => [
              "plugin",
              "secret",
              "set",
              entry.name,
              s,
            ]),
          }
        : {}),
      ...(secretsLeft.length ? { secretsNotRemoved: secretsLeft } : {}),
    };
  }
  const { old, keepData } = p;
  removeInstall(old, keepData);
  const secretsLeft =
    cleanupPendingSecrets((x) => x.installId === old.installId).get(
      old.installId
    ) ?? [];
  auditLog({
    timestamp: at,
    command: "plugin remove",
    target: old.name,
    plugin: {
      name: old.name,
      version: old.version,
      revision: old.revision,
      installId: old.installId,
      keepData,
      via: opts.via ?? "terminal",
    },
    result: { success: true },
  });
  return {
    ok: true,
    action: "plugin remove",
    name: old.name,
    keepData,
    ...(secretsLeft.length ? { secretsNotRemoved: secretsLeft } : {}),
  };
}

/** The human said no (or the dialog was dismissed): an audit entry for install and update, and the error. */
export function declined(
  p: Prepared,
  via: "terminal" | "mcp" = "terminal"
): CliError {
  if (p.op !== "remove") {
    auditLog({
      timestamp: new Date().toISOString(),
      command: `plugin ${p.op}`,
      target: p.name,
      plugin: {
        name: p.name,
        version: p.snapshot.manifest.version,
        revision: p.snapshot.revision,
        ...(p.op === "update"
          ? { installId: p.old.installId, fromRevision: p.old.revision }
          : {}),
        via,
      },
      result: { success: false, error: "not_confirmed" },
    });
  }
  const what = {
    install: "installed",
    update: "updated (the installed revision stays)",
    remove: "removed",
  }[p.op];
  return new CliError(
    `Not confirmed by the user. Nothing was ${what}.`,
    "not_confirmed",
    EXIT.ERROR
  );
}

/**
 * Deletes the stored secrets that `plugin remove` and `plugin update` recorded (a removed
 * installation's, the old generations an update replaced, and any an earlier attempt could not
 * delete); returns, per installation, the names still in the store. Under the plugin lock, in one
 * section with the check: a slot the registered installation reads now (its removal did not
 * complete, or an update went back to that rule) is live and only dropped from the record. A slot
 * is settled once the store said it is gone.
 */
export function cleanupPendingSecrets(
  only?: (p: { name: string; installId: string }) => boolean
): Map<string, string[]> {
  return withPluginLock(() => {
    const out = new Map<string, string[]>();
    const entries = new Map(
      Object.values(readLock().plugins).map((e) => [e.installId, e])
    );
    for (const p of pendingSecrets()) {
      if (only && !only(p)) {
        continue;
      }
      const entry = entries.get(p.installId);
      const live = entry ? installedSlots(entry) : [];
      const left: string[] = [];
      for (const text of p.secrets) {
        const slot = parseSlotText(text);
        if (!slot || live === undefined || live.includes(text)) {
          continue;
        }
        if (!erasePluginSecret(p.installId, slot)) {
          left.push(text);
        }
      }
      settlePendingSecrets(p.installId, left);
      out.set(p.installId, [
        ...new Set(left.map((t) => parseSlotText(t)!.name)),
      ]);
    }
    return out;
  });
}

/**
 * A program on PATH, as the shell would find it: on Windows a file with one of PATHEXT's extensions,
 * elsewhere a file this user may execute (X_OK; a plain file named `telegram` does not count, the
 * shell would answer "Permission denied"). Never runs anything.
 */
export function onPath(
  bin: string,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): boolean {
  const win = platform === "win32";
  const dirs = (env.PATH ?? env.Path ?? "")
    .split(win ? ";" : ":")
    .filter(Boolean);
  const exts = win
    ? ["", ...(env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)]
    : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      const file = join(dir, bin + ext);
      try {
        if (!statSync(file).isFile()) {
          continue;
        }
        if (!win) {
          accessSync(file, constants.X_OK);
        }
        return true;
      } catch {}
    }
  }
  return false;
}

const posixQuote = (v: string) =>
  /^[\w@%+=:,./-]+$/.test(v) ? v : `'${v.replaceAll("'", `'\\''`)}'`;
const psEscape = (v: string) =>
  v.replaceAll(/['\u2018\u2019\u201A\u201B]/g, (q) => q + q);
const psQuote = (v: string) =>
  /^[A-Za-z0-9_./:\\-]+$/.test(v) && !v.startsWith("-")
    ? v
    : `'${psEscape(v)}'`;
const psArg = (v: string) => (/^--?[a-z][a-z-]*$/.test(v) ? v : psQuote(v));

/**
 * The exact command for the human's terminal on this (the server's) computer: `telegram …` when it
 * is on PATH, else the CLI pinned to this version through npx (an .mcpb has no `telegram`), quoted
 * for the platform's shell (POSIX sh, or PowerShell on Windows). The profile and the mock context
 * are this process's, set explicitly whatever the terminal has: TG_PROFILE always (empty for the
 * default profile), TG_MOCK as the absolute path of this mock state, or empty outside the mock. They
 * reach that one command only: POSIX `VAR=… cmd`; PowerShell saves the terminal's values and puts
 * them back in `finally`.
 */
export function terminalCommand(
  argv: string[],
  o: {
    platform?: NodeJS.Platform;
    onPath?: (bin: string) => boolean;
    version?: string;
  } = {}
): string | undefined {
  const platform = o.platform ?? manageDeps.platform ?? process.platform;
  const has =
    o.onPath ??
    manageDeps.onPath ??
    ((b: string) => onPath(b, process.env, platform));
  const bin = has("telegram")
    ? ["telegram"]
    : ["npx", `better-tg-cli@${o.version ?? VERSION}`];
  const env: [string, string][] = [
    ["TG_PROFILE", profile() ?? ""],
    ["TG_MOCK", isMock() ? resolve(mockStatePath()) : ""],
  ];
  if (
    [...argv, ...env.map(([, v]) => v)].some((v) => /[^\u0020-\u007E]/.test(v))
  ) {
    return undefined;
  }
  if (platform === "win32") {
    if (argv.some((v) => /["%^&|<>!]/.test(v))) {
      return undefined;
    }
    const save = env.map(([k], i) => `$tgSaved${i} = $env:${k}`).join("; ");
    const set = env.map(([k, v]) => `$env:${k} = '${psEscape(v)}'`).join("; ");
    const restore = env.map(([k], i) => `$env:${k} = $tgSaved${i}`).join("; ");
    return `${save}; try { ${set}; ${[...bin.map(psArg), ...argv.map(psArg)].join(" ")} } finally { ${restore} }`;
  }
  return [
    ...env.map(([k, v]) => `${k}=${posixQuote(v)}`),
    ...bin,
    ...argv.map(posixQuote),
  ].join(" ");
}
