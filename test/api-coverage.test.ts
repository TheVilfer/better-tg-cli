import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TSV = 'scripts/data/telethon-1.45.0-client-methods.tsv';
const run = (...args: string[]) =>
  spawnSync(process.execPath, ['scripts/api-coverage.mjs', ...args], {
    encoding: 'utf8',
    env: { ...process.env, API_COVERAGE_MIN: '' },
  });

// Keeps docs/api-coverage.md in sync with the schema and the source: a new TL layer or a new
// command changes the numbers, and this fails until `node scripts/api-coverage.mjs` is re-run.
// `--check` also enforces the coverage gate (both metrics >= 90%), same as `npm run coverage:api`.
describe('api coverage report', () => {
  it('docs/api-coverage.md is up to date and coverage is >= 90%', () => {
    const r = run('--check');
    expect(r.stderr + r.stdout, r.stderr).not.toMatch(/out of date|FAIL/);
    expect(r.status).toBe(0);
  });

  it('accounts for every Telethon TelegramClient member (none unmapped)', () => {
    const md = readFileSync('docs/api-coverage.md', 'utf8');
    expect(md).toMatch(/0 unaccounted for/);
  });

  it('reachability and Telethon accounting are both at least 90%', () => {
    const r = run('--json');
    expect(r.status).toBe(0);
    const m = JSON.parse(r.stdout);
    expect(m.reachability.total).toBeGreaterThan(800);
    expect(m.reachability.pct).toBeGreaterThanOrEqual(90);
    expect(m.telethon.total).toBeGreaterThanOrEqual(67);
    expect(m.telethon.pct).toBeGreaterThanOrEqual(90);
  });

  it('the gate fails when Telethon accounting drops below the minimum', () => {
    // 67 accounted of 67 + 10 unmapped members = 87% < 90%
    const dir = mkdtempSync(join(tmpdir(), 'api-coverage-'));
    const tsv = join(dir, 'members.tsv');
    const extra = Array.from({ length: 10 }, (_, i) => `fake_member_${i}\tasync\ttelethon.client.fake`);
    writeFileSync(tsv, readFileSync(TSV, 'utf8').trimEnd() + '\n' + extra.join('\n') + '\n');
    const r = run('--min', '90', '--telethon-tsv', tsv);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/FAIL Telethon .* 67\/77/);
    expect(r.stderr).toMatch(/fake_member_0/);
    // ...and the threshold is configurable
    expect(run('--min=80', '--telethon-tsv', tsv).status).toBe(0);
  });

  it('rejects an invalid minimum', () => {
    expect(run('--min', 'abc').status).toBe(2);
  });
});
