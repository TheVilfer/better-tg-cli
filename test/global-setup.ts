import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { TestProject } from 'vitest/node';

/**
 * Tests that run the CLI as a child process start `src/` bundled once by Bun, not
 * `node --import tsx src/index.ts`: tsx transpiles the whole tree (with the large generated TL
 * modules) again in every process, which takes seconds on a CI runner. Packages stay external,
 * so the bundle loads the same node_modules as tsx would. It sits in the repo (`.test-cli/`,
 * ignored by git) for that resolution to work, one file per run so parallel runs don't collide.
 * Without Bun, tests fall back to tsx.
 */
export default function setup(project: TestProject) {
  const dir = resolve('.test-cli');
  const entry = join(dir, `cli-${process.pid}.mjs`);
  // A killed watcher never runs the teardown: drop bundles whose run is gone
  for (const name of (() => { try { return readdirSync(dir); } catch { return []; } })()) {
    const pid = Number(name.match(/^cli-(\d+)\.mjs$/)?.[1]);
    if (!pid || pid === process.pid) continue;
    try { process.kill(pid, 0); } catch { rmSync(join(dir, name), { force: true }); }
  }
  const build = (): string | null => {
    mkdirSync(dir, { recursive: true });
    const r = spawnSync('bun', ['build', 'src/index.ts', '--target=node', '--packages=external', `--outfile=${entry}`], {
      stdio: ['ignore', 'ignore', 'pipe'],
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (r.status === 0) return entry;
    console.warn(`test CLI bundle failed, child processes use tsx: ${r.error?.message ?? r.stderr}`);
    return null;
  };
  // Node >= 22.1 keeps compiled bytecode here, so the many short CLI processes load faster (~20%)
  process.env.NODE_COMPILE_CACHE ??= join(dir, 'compile-cache');
  project.provide('cliEntry', build());
  // Watch mode: rebuild before every rerun, so a child process never runs stale code
  project.onTestsRerun(() => { project.provide('cliEntry', build()); });
  return () => rmSync(entry, { force: true });
}

declare module 'vitest' {
  export interface ProvidedContext {
    cliEntry: string | null;
  }
}
