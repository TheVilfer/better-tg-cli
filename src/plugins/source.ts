import { createHash } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { CliError, EXIT, usageError } from '../errors.js';
import { VERSION } from '../version.js';
import {
  checkManifest, LIMITS, MANIFEST_FILE, markdownSection, OFFICIAL_OWNERS, pathProblem, SKILL_FILE, skillProblems,
  type Manifest,
} from './manifest.js';
import { readRegular, UnsafePath } from './safe-fs.js';

/**
 * Where a plugin comes from and how its exact snapshot is fetched: a public GitHub repository at one
 * commit (through the GitHub REST API, file by file, no tarball) or a local folder, hashed.
 */

export type Source =
  | { type: 'github'; owner: string; repo: string; ref?: string }
  | { type: 'local'; path: string };

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;
const REF_RE = /^(?!.*\.\.)(?!\/)(?!.*\/$)[A-Za-z0-9._/-]{1,200}$/;

/** `github:owner/repo[@ref]`, or a folder path. Throws a usage error for a malformed GitHub source. */
export function parseSource(text: string): Source {
  if (text.startsWith('github:')) {
    const m = /^github:([^/@]+)\/([^/@]+)(?:@(.+))?$/.exec(text);
    if (!m || !OWNER_RE.test(m[1]) || !REPO_RE.test(m[2]) || (m[3] !== undefined && !REF_RE.test(m[3]))) {
      throw usageError(`Invalid plugin source "${text}"`, 'Use github:owner/repo, github:owner/repo@tag-or-commit, or a folder path such as ./my-plugin.');
    }
    return { type: 'github', owner: m[1], repo: m[2], ...(m[3] ? { ref: m[3] } : {}) };
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /^(npm|gitlab|git|http|https):/i.test(text)) {
    throw usageError(`Unsupported plugin source "${text}"`, 'Plugins install from github:owner/repo[@ref] or a local folder.');
  }
  return { type: 'local', path: text };
}

export function sourceLabel(s: Source): string {
  return s.type === 'github' ? `github:${s.owner}/${s.repo}${s.ref ? `@${s.ref}` : ''}` : s.path;
}

/** What install keeps of a resolved source (canonical owner and repo for GitHub, an absolute path for a folder). */
export type ResolvedSource =
  | { type: 'github'; owner: string; repo: string; ref?: string; commit: string }
  | { type: 'local'; path: string };

export interface Snapshot {
  source: ResolvedSource;
  /** Commit SHA for GitHub, `sha256-…` of the content for a folder */
  revision: string;
  manifest: Manifest;
  specVersion: string;
  /** Every file of `files`, as read once: these bytes are hashed, checked and written */
  files: Map<string, Uint8Array>;
  hashes: Record<string, string>;
  official: boolean;
  /** Why a source of an official owner is not marked official (its commit is on none of their branches or tags) */
  officialNote?: string;
  bytes: number;
}

export const sha256 = (bytes: Uint8Array): string => `sha256-${createHash('sha256').update(bytes).digest('base64')}`;

/** The revision of a folder: sha256 over the sorted list of `path NUL hash LF`. */
export function contentRevision(hashes: Record<string, string>): string {
  const lines = Object.keys(hashes).sort().map(p => `${p}\0${hashes[p]}\n`).join('');
  return sha256(new TextEncoder().encode(lines));
}

export const invalidPlugin = (problems: string[]): CliError =>
  new CliError(`The plugin is invalid: ${problems[0]}`, 'plugin_invalid', EXIT.ERROR, {
    text: `The plugin is invalid:\n${problems.map(p => `  - ${p}`).join('\n')}`,
  });

/**
 * Checks a manifest and the files it lists, as read: the schema and rules, SKILL.md, the
 * resources' Markdown sections. Throws plugin_invalid or plugin_unsupported. `cliVersion` is
 * matched against engines.
 */
export function checkSnapshotFiles(manifestBytes: Uint8Array, cliVersion: string): { manifest: Manifest; specVersion: string } {
  const check = checkManifest(manifestBytes, cliVersion);
  if (check.errors.length) throw invalidPlugin(check.errors);
  if (check.unsupported) throw new CliError(check.unsupported, 'plugin_unsupported', EXIT.ERROR);
  return { manifest: check.manifest!, specVersion: check.specVersion! };
}

/** The rules that need the files' content: SKILL.md frontmatter and every #section of a resource. */
export function contentProblems(manifest: Manifest, files: Map<string, Uint8Array>): string[] {
  const out: string[] = [];
  const text = (path: string): string | undefined => {
    const bytes = files.get(path);
    if (!bytes) return undefined;
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      out.push(`${path} is not valid UTF-8`);
      return undefined;
    }
  };
  const skill = text(SKILL_FILE);
  if (skill !== undefined) out.push(...skillProblems(skill, manifest.name));
  for (const [key, ref] of Object.entries(manifest.resources ?? {})) {
    const [file, fragment] = ref.split('#');
    const body = text(file);
    if (body === undefined) continue;
    if (fragment !== undefined && markdownSection(body, fragment) === undefined) out.push(`resources.${key}: ${file} has no heading for #${fragment}`);
  }
  return out;
}

function finish(source: ResolvedSource, revision: string | undefined, manifestBytes: Uint8Array, files: Map<string, Uint8Array>, official: boolean, cliVersion: string): Snapshot {
  const { manifest, specVersion } = checkSnapshotFiles(manifestBytes, cliVersion);
  const problems = contentProblems(manifest, files);
  if (problems.length) throw invalidPlugin(problems);
  // No prototype: a file called __proto__ or constructor is an ordinary own key
  const hashes = Object.create(null) as Record<string, string>;
  let bytes = 0;
  for (const [p, b] of files) { hashes[p] = sha256(b); bytes += b.length; }
  return { source, revision: revision ?? contentRevision(hashes), manifest, specVersion, files, hashes, official, bytes };
}

const tooLarge = (what: string) => invalidPlugin([what]);

// ---------- local folder ----------

/**
 * Reads one listed file of a folder through safe-fs: every segment must exist with exactly this
 * case and be a real folder or a regular file, never a symbolic link or a junction; the file is
 * read from a descriptor checked to be the file the walk saw (a folder swapped meanwhile is caught).
 */
function readLocalFile(root: string, rel: string, maxBytes: number): Uint8Array {
  const problem = pathProblem(rel);
  if (problem) throw invalidPlugin([`files: "${rel}" ${problem}`]);
  let bytes: Uint8Array | undefined;
  try {
    bytes = readRegular(root, rel, { exactCase: true, maxBytes });
  } catch (e) {
    if (!(e instanceof UnsafePath)) throw e;
    if (e.kind === 'link') throw invalidPlugin([`files: "${e.at}" is a symbolic link; plugins are regular files only`]);
    if (e.kind === 'too-large') throw tooLarge(`files: "${rel}" is larger than ${maxBytes} bytes`);
    if (e.kind === 'changed') throw invalidPlugin([`files: "${rel}" changed while it was read`]);
    if (e.kind === 'case') throw invalidPlugin([`files: "${rel}" does not exist (names are case-sensitive)`]);
    if (e.kind === 'not-dir') throw invalidPlugin([`files: "${e.at}" is not a folder`]);
    if (e.kind === 'not-file') throw invalidPlugin([`files: "${rel}" is not a regular file`]);
    throw invalidPlugin([`files: "${rel}" does not exist`]);
  }
  if (!bytes) throw invalidPlugin([`files: "${rel}" does not exist`]);
  return bytes;
}

/** A snapshot of a local folder: the listed files only, hashed; the revision is their combined hash. */
export function readLocalSnapshot(path: string, cliVersion = VERSION): Snapshot {
  let root: string;
  try {
    root = realpathSync(resolve(path));
    if (!lstatSync(root).isDirectory()) throw new Error('not a folder');
  } catch {
    throw new CliError(`No plugin folder at ${path}`, 'plugin_source_not_found', EXIT.ERROR, { hint: 'Give the folder that holds tg-plugin.json, or github:owner/repo.' });
  }
  const manifestBytes = readLocalFile(root, MANIFEST_FILE, LIMITS.manifestBytes);
  const { manifest } = checkSnapshotFiles(manifestBytes, cliVersion);
  const files = new Map<string, Uint8Array>();
  let total = 0;
  for (const rel of manifest.files) {
    const bytes = rel === MANIFEST_FILE ? manifestBytes : readLocalFile(root, rel, LIMITS.fileBytes);
    total += bytes.length;
    if (total > LIMITS.totalBytes) throw tooLarge(`the files together are larger than ${LIMITS.totalBytes} bytes`);
    files.set(rel, bytes);
  }
  return finish({ type: 'local', path: isAbsolute(root) ? root : resolve(root) }, undefined, manifestBytes, files, false, cliVersion);
}

// ---------- GitHub ----------

export const GITHUB_API = 'https://api.github.com';
export type Fetch = (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean; status: number; headers: { get(name: string): string | null }; json(): Promise<unknown>;
}>;

interface TreeEntry { path: string; mode: string; type: string; sha: string; size?: number }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * A snapshot of a public GitHub repository at one commit: the ref (or the default branch) is
 * resolved to a commit SHA, each listed file is found in the commit's trees (a symbolic link or a
 * submodule is refused, sizes are checked before anything is downloaded) and fetched as a git blob,
 * whose SHA-1 is verified. No token is sent. `fetchImpl` is replaced in tests.
 */
export async function fetchGithubSnapshot(source: Extract<Source, { type: 'github' }>, fetchImpl: Fetch = fetch as unknown as Fetch, cliVersion = VERSION): Promise<Snapshot> {
  const label = sourceLabel(source);
  const get = async (path: string): Promise<unknown> => {
    let res: Awaited<ReturnType<Fetch>>;
    try {
      res = await fetchImpl(`${GITHUB_API}${path}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': `better-tg-cli/${VERSION}`, 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (e) {
      throw new CliError(`Could not reach GitHub for ${label}: ${(e as Error).message}`, 'network', EXIT.ERROR);
    }
    if (res.status === 404) throw new CliError(`Not found on GitHub: ${label} (the repository must be public, the ref must exist)`, 'plugin_source_not_found', EXIT.ERROR);
    if ((res.status === 403 || res.status === 429) && (res.headers.get('x-ratelimit-remaining') === '0' || res.status === 429)) {
      const reset = Number(res.headers.get('x-ratelimit-reset'));
      const wait = Number.isFinite(reset) && reset > 0 ? Math.max(0, Math.ceil(reset - Date.now() / 1000)) : undefined;
      throw new CliError('GitHub API rate limit reached (60 requests an hour without a login)', 'rate_limited', EXIT.ERROR, {
        ...(wait !== undefined ? { retryAfterSeconds: wait, hint: `Try again in ${Math.ceil(wait / 60)} min.` } : {}),
      });
    }
    if (!res.ok) throw new CliError(`GitHub answered ${res.status} for ${label}`, 'github_error', EXIT.ERROR);
    return res.json();
  };
  const bad = (what: string) => new CliError(`Unexpected answer from GitHub (${what}) for ${label}`, 'github_error', EXIT.ERROR);

  const repo = await get(`/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}`);
  if (!isObj(repo) || !isObj(repo.owner) || typeof repo.owner.login !== 'string' || typeof repo.name !== 'string' || typeof repo.default_branch !== 'string') throw bad('repository');
  if (repo.private === true) throw new CliError(`${label} is a private repository; plugins install from public ones`, 'plugin_source_not_found', EXIT.ERROR);
  const owner = repo.owner.login;
  const name = repo.name;
  if (!OWNER_RE.test(owner) || !REPO_RE.test(name)) throw bad('repository name');
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const ref = source.ref ?? repo.default_branch;
  const commit = await get(`${base}/commits/${encodeURIComponent(ref)}`);
  if (!isObj(commit) || typeof commit.sha !== 'string' || !/^[0-9a-f]{40}$/.test(commit.sha)
    || !isObj(commit.commit) || !isObj(commit.commit.tree) || typeof commit.commit.tree.sha !== 'string' || !/^[0-9a-f]{40}$/.test(commit.commit.tree.sha)) throw bad('commit');
  const sha = commit.sha as string;
  const rootTree = commit.commit.tree.sha as string;

  const trees = new Map<string, TreeEntry[]>();
  const tree = async (treeSha: string): Promise<TreeEntry[]> => {
    const cached = trees.get(treeSha);
    if (cached) return cached;
    const t = await get(`${base}/git/trees/${treeSha}`);
    if (!isObj(t) || !Array.isArray(t.tree)) throw bad('tree');
    if (t.truncated === true) throw bad('tree too large');
    const entries = t.tree.filter(isObj).map(e => e as unknown as TreeEntry);
    trees.set(treeSha, entries);
    return entries;
  };
  const entryOf = async (rel: string): Promise<TreeEntry> => {
    const problem = pathProblem(rel);
    if (problem) throw invalidPlugin([`files: "${rel}" ${problem}`]);
    const segments = rel.split('/');
    let cur = rootTree;
    for (let i = 0; i < segments.length; i++) {
      const e = (await tree(cur)).find(x => x.path === segments[i]);
      const at = segments.slice(0, i + 1).join('/');
      if (!e) throw invalidPlugin([`files: "${rel}" is not in ${label} at ${sha.slice(0, 12)}`]);
      if (e.mode === '120000') throw invalidPlugin([`files: "${at}" is a symbolic link; plugins are regular files only`]);
      if (e.mode === '160000' || e.type === 'commit') throw invalidPlugin([`files: "${at}" is a submodule`]);
      if (i < segments.length - 1) {
        if (e.type !== 'tree' || typeof e.sha !== 'string' || !/^[0-9a-f]{40}$/.test(e.sha)) throw invalidPlugin([`files: "${at}" is not a folder`]);
        cur = e.sha;
        continue;
      }
      if (e.type !== 'blob' || !['100644', '100755'].includes(e.mode) || !/^[0-9a-f]{40}$/.test(e.sha) || typeof e.size !== 'number') {
        throw invalidPlugin([`files: "${rel}" is not a regular file`]);
      }
      return e;
    }
    throw bad('path');
  };
  const blob = async (e: TreeEntry, rel: string): Promise<Uint8Array> => {
    const b = await get(`${base}/git/blobs/${e.sha}`);
    if (!isObj(b) || b.encoding !== 'base64' || typeof b.content !== 'string') throw bad('blob');
    const bytes = new Uint8Array(Buffer.from(b.content.replace(/\s+/g, ''), 'base64'));
    const gitSha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (bytes.length !== e.size || gitSha !== e.sha) throw new CliError(`GitHub sent ${rel} with content that does not match its git hash`, 'github_error', EXIT.ERROR);
    return bytes;
  };

  const manifestEntry = await entryOf(MANIFEST_FILE);
  if (manifestEntry.size! > LIMITS.manifestBytes) throw tooLarge(`${MANIFEST_FILE} is larger than ${LIMITS.manifestBytes} bytes`);
  const manifestBytes = await blob(manifestEntry, MANIFEST_FILE);
  const { manifest } = checkSnapshotFiles(manifestBytes, cliVersion);
  // Sizes from the trees first: nothing large is downloaded
  const entries = new Map<string, TreeEntry>();
  let total = 0;
  for (const rel of manifest.files) {
    const e = rel === MANIFEST_FILE ? manifestEntry : await entryOf(rel);
    if (e.size! > LIMITS.fileBytes) throw tooLarge(`files: "${rel}" is larger than ${LIMITS.fileBytes} bytes`);
    total += e.size!;
    if (total > LIMITS.totalBytes) throw tooLarge(`the files together are larger than ${LIMITS.totalBytes} bytes`);
    entries.set(rel, e);
  }
  const files = new Map<string, Uint8Array>();
  for (const [rel, e] of entries) files.set(rel, rel === MANIFEST_FILE ? manifestBytes : await blob(e, rel));
  // An official owner's repository serves commits of every fork in its network too: official only
  // when the commit is on one of its own branches or tags
  let official = false;
  let officialNote: string | undefined;
  if (OFFICIAL_OWNERS.includes(owner)) {
    official = await publishedBy(fetchImpl, base, sha, source.ref, repo.default_branch);
    if (!official) officialNote = `commit ${sha.slice(0, 12)} could not be confirmed on a branch or tag of ${owner}/${name} (it may come from a fork)`;
  }
  const snap = finish({ type: 'github', owner, repo: name, ...(source.ref ? { ref: source.ref } : {}), commit: sha }, sha, manifestBytes, files, official, cliVersion);
  return officialNote ? { ...snap, officialNote } : snap;
}

/**
 * Whether the repository at `base` itself published commit `sha`: the ref named at install is one of
 * its branches or tags (annotated tags peeled) pointing at it, or the commit is in the history of its
 * default branch (compare: identical or behind). Any other answer or error means no.
 */
async function publishedBy(fetchImpl: Fetch, base: string, sha: string, ref: string | undefined, defaultBranch: string): Promise<boolean> {
  const get = async (path: string): Promise<Record<string, unknown> | undefined> => {
    try {
      const res = await fetchImpl(`${GITHUB_API}${path}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': `better-tg-cli/${VERSION}`, 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return undefined;
      const body = await res.json();
      return isObj(body) ? body : undefined;
    } catch {
      return undefined;
    }
  };
  const peel = async (obj: unknown): Promise<string | undefined> => {
    for (let i = 0; i < 5 && isObj(obj); i++) {
      if (typeof obj.sha !== 'string' || !/^[0-9a-f]{40}$/.test(obj.sha)) return undefined;
      if (obj.type === 'commit') return obj.sha;
      if (obj.type !== 'tag') return undefined;
      obj = (await get(`${base}/git/tags/${obj.sha}`))?.object;
    }
    return undefined;
  };
  if (ref !== undefined && !/^[0-9a-f]{7,40}$/i.test(ref)) {
    for (const kind of ['heads', 'tags']) {
      const r = await get(`${base}/git/ref/${kind}/${ref.split('/').map(encodeURIComponent).join('/')}`);
      if (r && r.ref === `refs/${kind}/${ref}` && (await peel(r.object)) === sha) return true;
    }
  }
  const cmp = await get(`${base}/compare/${encodeURIComponent(defaultBranch)}...${sha}`);
  return cmp?.status === 'identical' || cmp?.status === 'behind';
}
