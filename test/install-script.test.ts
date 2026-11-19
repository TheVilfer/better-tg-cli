// install.sh against local fixture archives: no network. A curated PATH holds symlinks to the real
// tools the script uses plus fake `uname`, `curl` and `wget`; the fakes serve files only for the
// pinned release URL, so the test also proves which tag the script asks for.
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { assetName, canMakeXz, makeReleaseFixtures, releaseBase, type ReleaseFixtureOptions } from './helpers/release-fixtures.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = join(ROOT, 'install.sh');
const VERSION: string = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const which = (cmd: string) => {
  const r = spawnSync('sh', ['-c', `command -v ${cmd}`], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};
// Every external command install.sh may call, besides the faked ones
const TOOLS = ['awk', 'cat', 'chmod', 'cp', 'cut', 'date', 'grep', 'gzip', 'head', 'ls', 'mkdir', 'mktemp', 'mv', 'rm', 'sed', 'tar', 'tr', 'sha256sum', 'shasum', 'openssl', 'xz', 'sysctl'];
// Linux CI runs /bin/sh as dash already; elsewhere try dash too when it is installed
const SHELLS = [...new Set(['/bin/sh', which('dash')].filter((s): s is string => !!s))];

const FAKE_UNAME = `#!/bin/sh
case "$1" in -s) echo "$FAKE_OS" ;; -m) echo "$FAKE_ARCH" ;; *) echo "$FAKE_OS" ;; esac
`;
// curl -fsSL ... -w '%{http_code}' -o FILE URL
const FAKE_CURL = `#!/bin/sh
printf 'curl %s\\n' "$*" >> "$FAKE_LOG"
out=''; fmt=''; url=''
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out=$2; shift 2 ;;
    -w) fmt=$2; shift 2 ;;
    --proto | --retry | --connect-timeout) shift 2 ;;
    -*) shift ;;
    *) url=$1; shift ;;
  esac
done
[ -n "$FAKE_DL_EXIT" ] && exit "$FAKE_DL_EXIT"
name=\${url#"$FAKE_BASE"/}
if [ "$name" != "$url" ] && [ -f "$FAKE_RELEASE/$name" ]; then cp "$FAKE_RELEASE/$name" "$out"; [ -n "$fmt" ] && printf 200; exit 0; fi
[ -n "$fmt" ] && printf 404
exit 22
`;
// wget -q -O FILE URL
const FAKE_WGET = `#!/bin/sh
printf 'wget %s\\n' "$*" >> "$FAKE_LOG"
out=''; url=''
while [ $# -gt 0 ]; do
  case "$1" in -O) out=$2; shift 2 ;; -*) shift ;; *) url=$1; shift ;; esac
done
[ -n "$FAKE_DL_EXIT" ] && exit "$FAKE_DL_EXIT"
name=\${url#"$FAKE_BASE"/}
if [ "$name" != "$url" ] && [ -f "$FAKE_RELEASE/$name" ]; then cp "$FAKE_RELEASE/$name" "$out"; exit 0; fi
exit 8
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
    problems: { id: string; severity: string; message: string; fix: Record<string, string> }[];
    install: { manager: string; version: string; tag: string; target: string | null; dir: string | null; path: string | null; onPath: boolean | null; active: string | null };
  };
  requests: string[];
}

const sandboxes: string[] = [];
afterEach(() => {
  for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function sandbox(opts: { downloader?: 'curl' | 'wget' | 'none'; xz?: boolean; extraBin?: Record<string, string> } = {}): Sandbox {
  // realpath: macOS tmpdir is a symlink (/var → /private/var), the script reports resolved paths
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'btg-install-')));
  sandboxes.push(root);
  const s: Sandbox = {
    root,
    home: join(root, 'home'),
    bin: join(root, 'tools'),
    release: join(root, 'release'),
    log: join(root, 'requests.log'),
    installDir: join(root, 'home', '.local', 'bin'),
  };
  mkdirSync(s.home, { recursive: true });
  mkdirSync(s.bin);
  writeFileSync(s.log, '');
  const fakes: Record<string, string> = { uname: FAKE_UNAME, ...opts.extraBin };
  const dl = opts.downloader ?? 'curl';
  if (dl === 'curl') fakes.curl = FAKE_CURL;
  if (dl === 'wget') fakes.wget = FAKE_WGET;
  // A faked tool is never linked: writing the fake would go through the link into the real one
  for (const tool of TOOLS) {
    if ((tool === 'xz' && opts.xz === false) || tool in fakes) continue;
    const path = which(tool);
    if (path) symlinkSync(path, join(s.bin, tool));
  }
  for (const [name, body] of Object.entries(fakes)) {
    writeFileSync(join(s.bin, name), body, { flag: 'wx' });
    chmodSync(join(s.bin, name), 0o755);
  }
  return s;
}

function release(s: Sandbox, opts: Partial<ReleaseFixtureOptions> = {}) {
  makeReleaseFixtures(s.release, { version: VERSION, targets: ['linux-x64', 'linux-arm64', 'darwin-arm64', 'darwin-x64'], formats: ['tar.gz'], ...opts });
}

/** `stdin`: feed the script on standard input, as `curl … | sh` does */
function run(s: Sandbox, env: Record<string, string> = {}, shell = SHELLS[0], stdin = false): RunResult {
  const r = spawnSync(shell, stdin ? [] : [SCRIPT], {
    input: stdin ? readFileSync(SCRIPT, 'utf8') : undefined,
    encoding: 'utf8',
    cwd: s.root,
    env: {
      PATH: s.bin,
      HOME: s.home,
      TMPDIR: s.root,
      FAKE_OS: 'Linux',
      FAKE_ARCH: 'x86_64',
      FAKE_LOG: s.log,
      FAKE_BASE: releaseBase(VERSION),
      FAKE_RELEASE: s.release,
      ...env,
    },
  });
  const lines = r.stdout.split('\n').filter(Boolean);
  expect(lines, `stdout must be one JSON line; stderr:\n${r.stderr}`).toHaveLength(1);
  const result: RunResult = {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    json: JSON.parse(lines[0]),
    requests: readFileSync(s.log, 'utf8').split('\n').filter(Boolean),
  };
  // Every run, success or failure, prints a valid contract result with a matching exit code
  expect(contractErrors(result), lines[0]).toEqual([]);
  if (!result.json.ok) expect(result.json.install.path).toBeNull();
  return result;
}

const ids = (r: RunResult) => r.json.problems.map(p => p.id);

/**
 * The rules of the setup contract, schema 1 (#110), for the part of the result it defines. The
 * installer adds one field of its own, `install` (where the binary went), which #110 lists as an
 * open point; swap this for setupResultErrors() from src/setup-contract.ts once that lands.
 */
function contractErrors(r: RunResult): string[] {
  const { install, ...result } = r.json as RunResult['json'] & Record<string, unknown>;
  const errors: string[] = [];
  if (!install || typeof install !== 'object') errors.push('install must be an object');
  if (result.schema !== 1) errors.push('schema must be 1');
  const extra = Object.keys(result).filter(k => !['schema', 'ok', 'problems'].includes(k));
  if (extra.length) errors.push(`unexpected field ${extra[0]}`);
  const seen = new Set<string>();
  for (const p of result.problems) {
    if (Object.keys(p).join() !== 'id,severity,message,fix') errors.push(`${p.id}: fields ${Object.keys(p)}`);
    if (!/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(p.id)) errors.push(`${p.id}: id must be snake_case`);
    if (seen.has(p.id)) errors.push(`${p.id}: duplicate`);
    seen.add(p.id);
    if (!['error', 'warning', 'info'].includes(p.severity)) errors.push(`${p.id}: severity`);
    if (!p.message.trim() || p.message.includes('\n')) errors.push(`${p.id}: message must be one line`);
    const kinds = Object.keys(p.fix).filter(k => k !== 'url');
    if (kinds.length !== 1 || !['human', 'unavailable'].includes(kinds[0])) errors.push(`${p.id}: fix ${Object.keys(p.fix)}`);
    if ('url' in p.fix && (kinds[0] !== 'human' || !p.fix.url.startsWith('https://'))) errors.push(`${p.id}: url`);
  }
  const hasError = result.problems.some(p => p.severity === 'error');
  if (result.ok === hasError) errors.push('ok must be true exactly when no problem is an error');
  // setupExitCode(): 0 ok, 2 when every error waits for a person, else 1
  const want = !hasError ? 0 : result.problems.filter(p => p.severity === 'error').every(p => 'human' in p.fix) ? 2 : 1;
  if (r.status !== want) errors.push(`exit ${r.status}, contract says ${want}`);
  return errors;
}
const leftovers = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter(f => f.startsWith('.')) : []);

describe.skipIf(process.platform === 'win32')('install.sh', () => {
  it('pins the package version (scripts/gen-version.mjs keeps it in sync)', () => {
    expect(readFileSync(SCRIPT, 'utf8')).toMatch(new RegExp(`^VERSION='${VERSION.replace(/\./g, '\\.')}'$`, 'm'));
  });

  describe.each(SHELLS)('under %s', shell => {
    it('installs the pinned release into ~/.local/bin and writes install.json', () => {
      const s = sandbox();
      release(s);
      const r = run(s, {}, shell);
      expect(r.status, r.stderr).toBe(0);
      const bin = join(s.installDir, 'telegram');
      expect(r.json).toMatchObject({
        schema: 1,
        ok: true,
        install: { manager: 'user-binary', version: VERSION, tag: `v${VERSION}`, target: 'linux-x64', dir: s.installDir, path: bin, onPath: false, active: null },
      });
      // Not on PATH: a warning that tells to use the absolute path, no shell-profile edits
      expect(r.json.problems).toEqual([expect.objectContaining({ id: 'install_dir_not_on_path', severity: 'warning', fix: { human: expect.stringContaining(bin) } })]);
      expect(spawnSync(bin, ['--version'], { encoding: 'utf8' }).stdout.trim()).toBe(VERSION);
      const manifest = JSON.parse(readFileSync(join(s.installDir, 'install.json'), 'utf8'));
      expect(manifest).toMatchObject({ package: 'better-tg-cli', manager: 'user-binary', path: bin, version: VERSION, tag: `v${VERSION}`, target: 'linux-x64', archive: assetName(VERSION, 'linux-x64', 'tar.gz') });
      expect(manifest.sha256).toMatch(/^[0-9a-f]{64}$/);
      // SHA256SUMS first, then exactly the archive it lists, over https only
      const base = releaseBase(VERSION);
      expect(r.requests.map(l => l.split(' ').pop())).toEqual([`${base}/SHA256SUMS`, `${base}/${assetName(VERSION, 'linux-x64', 'tar.gz')}`]);
      for (const l of r.requests) expect(l).toContain("--proto =https");
      expect(leftovers(s.installDir)).toEqual([]);
      expect(readdirSync(s.root).filter(f => !['home', 'tools', 'release', 'requests.log'].includes(f))).toEqual([]);
      expect(r.stderr).toContain(`Installed telegram ${VERSION}`);
    });
  });

  it('reports onPath and the active copy when the folder is on PATH', () => {
    const s = sandbox();
    release(s);
    const r = run(s, { PATH: `${s.bin}:${s.installDir}` });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.problems).toEqual([]);
    expect(r.json.install).toMatchObject({ onPath: true, active: join(s.installDir, 'telegram') });
  });

  it('honours TG_INSTALL_DIR, resolving it to an absolute path; quotes and spaces stay valid JSON', () => {
    const s = sandbox();
    release(s);
    const dir = join(s.root, `my "tg" dir`);
    const r = run(s, { TG_INSTALL_DIR: dir });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.install.path).toBe(join(dir, 'telegram'));
    expect(JSON.parse(readFileSync(join(dir, 'install.json'), 'utf8')).path).toBe(join(dir, 'telegram'));
    // Same check again: a reinstall recognises its own manifest with an escaped path
    expect(run(s, { TG_INSTALL_DIR: dir }).status).toBe(0);
  });

  it.each(SHELLS)('works when piped into %s, as curl | sh runs it', shell => {
    const s = sandbox();
    release(s);
    const r = run(s, {}, shell, true);
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.install.path).toBe(join(s.installDir, 'telegram'));
  });

  it.each([{}, { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }])('a non-ASCII install folder (%o), installed twice', locale => {
    const s = sandbox();
    release(s);
    const dir = join(s.root, 'Программы', 'телеграм');
    const first = run(s, { TG_INSTALL_DIR: dir, ...locale });
    expect(first.status, first.stderr).toBe(0);
    expect(first.json.install.path).toBe(join(dir, 'telegram'));
    expect(JSON.parse(readFileSync(join(dir, 'install.json'), 'utf8')).path).toBe(join(dir, 'telegram'));
    const again = run(s, { TG_INSTALL_DIR: dir, ...locale });
    expect(again.status, again.stderr).toBe(0);
  });

  it('a run cut short after writing install.json still owns the path', () => {
    const s = sandbox();
    release(s);
    expect(run(s).status).toBe(0);
    // install.json is renamed into place before the binary: the state a kill in between leaves
    rmSync(join(s.installDir, 'telegram'));
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(join(s.installDir, 'telegram'))).toBe(true);
  });

  it('replaces its own earlier install', () => {
    const s = sandbox();
    release(s);
    expect(run(s).status).toBe(0);
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.ok).toBe(true);
  });

  it('refuses a telegram it did not install and downloads nothing', () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    writeFileSync(join(s.installDir, 'telegram'), 'someone else\n');
    const r = run(s);
    expect(r.status).toBe(2);
    expect(r.json.ok).toBe(false);
    expect(r.json.problems).toEqual([expect.objectContaining({ id: 'install_path_taken', severity: 'error', fix: expect.objectContaining({ human: expect.stringContaining('TG_INSTALL_DIR') }) })]);
    expect(readFileSync(join(s.installDir, 'telegram'), 'utf8')).toBe('someone else\n');
    expect(r.requests).toEqual([]);
  });

  it('refuses a telegram next to an install.json written for another path', () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    writeFileSync(join(s.installDir, 'telegram'), 'old\n');
    writeFileSync(join(s.installDir, 'install.json'), '{"schema":1,"package":"better-tg-cli","manager":"user-binary","path":"/elsewhere/telegram"}\n');
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(['install_path_taken']);
    expect(readFileSync(join(s.installDir, 'telegram'), 'utf8')).toBe('old\n');
  });

  it('refuses a symlink named telegram, even a dangling one', () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    symlinkSync(join(s.root, 'nowhere'), join(s.installDir, 'telegram'));
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(['install_path_taken']);
    expect(lstatSync(join(s.installDir, 'telegram')).isSymbolicLink()).toBe(true);
  });

  it('refuses a foreign install.json in the folder', () => {
    const s = sandbox();
    release(s);
    mkdirSync(s.installDir, { recursive: true });
    writeFileSync(join(s.installDir, 'install.json'), '{"tool":"other"}\n');
    const r = run(s);
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(['install_path_taken']);
    expect(readFileSync(join(s.installDir, 'install.json'), 'utf8')).toBe('{"tool":"other"}\n');
  });

  it('a wrong sum installs nothing', () => {
    const s = sandbox();
    release(s, { tampered: [assetName(VERSION, 'linux-x64', 'tar.gz')] });
    const r = run(s);
    expect(r.status).toBe(1);
    expect(r.json.problems).toEqual([expect.objectContaining({ id: 'checksum_mismatch', fix: { unavailable: expect.any(String) } })]);
    expect(existsSync(join(s.installDir, 'telegram'))).toBe(false);
    expect(existsSync(join(s.installDir, 'install.json'))).toBe(false);
    expect(leftovers(s.installDir)).toEqual([]);
  });

  it('an archive missing from SHA256SUMS is never downloaded', () => {
    const s = sandbox();
    release(s, { unlisted: [assetName(VERSION, 'linux-x64', 'tar.gz')] });
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(['archive_not_listed']);
    expect(r.requests).toHaveLength(1);
  });

  it('a binary that does not report the pinned version replaces nothing', () => {
    const s = sandbox();
    release(s, { reports: '0.0.1' });
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(['binary_check_failed']);
    expect(existsSync(join(s.installDir, 'telegram'))).toBe(false);
    expect(leftovers(s.installDir)).toEqual([]);
  });

  it('a binary that prints several lines stays one valid JSON line', () => {
    const s = sandbox();
    release(s, { reports: 'line one\nline "two"\tend' });
    const r = run(s);
    expect(ids(r)).toEqual(['binary_check_failed']);
    expect(r.json.problems[0].message).toContain('line one');
  });

  it('refuses an install folder with a control character', () => {
    const s = sandbox();
    release(s);
    const r = run(s, { TG_INSTALL_DIR: join(s.root, 'a\tb') });
    expect(r.status).toBe(2);
    expect(ids(r)).toEqual(['install_dir_invalid']);
  });

  it.each([
    ['Linux', 'riscv64'],
    ['Linux', 'armv7l'],
    ['FreeBSD', 'amd64'],
    ['MINGW64_NT-10.0', 'x86_64'],
  ])('unsupported platform %s %s: a clear limitation, nothing downloaded', (os, arch) => {
    const s = sandbox();
    release(s);
    const r = run(s, { FAKE_OS: os, FAKE_ARCH: arch });
    expect(r.status).toBe(1);
    expect(r.json.problems).toEqual([expect.objectContaining({ id: 'platform_unsupported', fix: { unavailable: expect.any(String) } })]);
    expect(r.json.install.target).toBeNull();
    expect(r.requests).toEqual([]);
  });

  it.each([
    ['Darwin', 'arm64', 'darwin-arm64'],
    ['Darwin', 'x86_64', 'darwin-x64'],
    ['Linux', 'aarch64', 'linux-arm64'],
  ])('%s %s → %s', (os, arch, target) => {
    const s = sandbox();
    release(s);
    const r = run(s, { FAKE_OS: os, FAKE_ARCH: arch });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.install.target).toBe(target);
    expect(r.requests.at(-1)).toContain(`${target}.tar`);
  });

  it('no curl or wget: a clear limitation, no package install suggested', () => {
    const s = sandbox({ downloader: 'none' });
    release(s);
    const r = run(s);
    expect(r.status).toBe(1);
    expect(r.json.problems).toEqual([expect.objectContaining({ id: 'downloader_missing', fix: { unavailable: expect.stringContaining('does not install system packages') } })]);
  });

  it('falls back to wget', () => {
    const s = sandbox({ downloader: 'wget' });
    release(s);
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(r.requests).toHaveLength(2);
    expect(r.requests[0]).toMatch(/^wget /);
  });

  it('a failed certificate check is reported, never bypassed', () => {
    const s = sandbox();
    release(s);
    const r = run(s, { FAKE_DL_EXIT: '60' });
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(['tls_failed']);
    for (const l of r.requests) expect(l).not.toMatch(/ (-k|--insecure)( |$)/);
  });

  it('a release that is not published yet', () => {
    const s = sandbox();
    mkdirSync(s.release);
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(['release_not_found']);
  });

  it('an old release with only .tar.xz on a system without xz', () => {
    const s = sandbox({ xz: false, extraBin: { tar: '#!/bin/sh\necho "tar (GNU tar) 1.34" >&2\nexit 2\n' } });
    // Fixture built with the real tools; the sandbox then gets a tar that is not bsdtar
    makeReleaseFixtures(s.release, { version: VERSION, targets: ['linux-x64'], formats: canMakeXz() ? ['tar.xz'] : [] });
    if (!canMakeXz()) return;
    const r = run(s);
    expect(r.status).toBe(1);
    expect(ids(r)).toEqual(['unpack_tool_missing']);
    expect(r.requests).toHaveLength(1);
  });

  it.skipIf(!canMakeXz())('prefers .tar.xz when it can unpack it, else takes .tar.gz', () => {
    const both: Partial<ReleaseFixtureOptions> = { formats: ['tar.xz', 'tar.gz'] };
    const s = sandbox();
    release(s, both);
    const r = run(s);
    expect(r.status, r.stderr).toBe(0);
    expect(r.requests.at(-1)).toMatch(/\.tar\.xz$/);
    // GNU tar without xz (Debian and Ubuntu images)
    if (which('xz') && !/bsdtar/.test(spawnSync('tar', ['--version'], { encoding: 'utf8' }).stdout)) {
      const g = sandbox({ xz: false });
      release(g, both);
      const rg = run(g);
      expect(rg.status, rg.stderr).toBe(0);
      expect(rg.requests.at(-1)).toMatch(/\.tar\.gz$/);
    }
  });

  it('warns when another telegram is on PATH, and when it comes first', () => {
    const s = sandbox();
    release(s);
    const old = join(s.root, 'old-bin');
    mkdirSync(old);
    writeFileSync(join(old, 'telegram'), '#!/bin/sh\necho old\n');
    chmodSync(join(old, 'telegram'), 0o755);

    const after = run(s, { PATH: `${s.bin}:${s.installDir}:${old}` });
    expect(after.status).toBe(0);
    expect(after.json.install.active).toBe(join(s.installDir, 'telegram'));
    expect(after.json.problems).toEqual([expect.objectContaining({ id: 'other_telegram_on_path', severity: 'warning', message: expect.stringContaining(join(old, 'telegram')) })]);

    const before = run(s, { PATH: `${s.bin}:${old}:${s.installDir}` });
    expect(before.status).toBe(0);
    expect(before.json.install.active).toBe(join(old, 'telegram'));
    expect(before.json.problems[0].message).toMatch(/comes first/);
    // Nothing is removed
    expect(readFileSync(join(old, 'telegram'), 'utf8')).toContain('old');
  });

  it('runs nothing when the download of the script itself is cut short', () => {
    const s = sandbox();
    release(s);
    const text = readFileSync(SCRIPT, 'utf8');
    const cut = join(s.root, 'cut.sh');
    writeFileSync(cut, text.slice(0, text.lastIndexOf('main "$@"')));
    const r = spawnSync('/bin/sh', [cut], { encoding: 'utf8', env: { PATH: s.bin, HOME: s.home, FAKE_LOG: s.log } });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(readFileSync(s.log, 'utf8')).toBe('');
    expect(existsSync(s.installDir)).toBe(false);
  });
});
