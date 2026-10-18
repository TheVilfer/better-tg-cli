import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Keeps docs/api-coverage.md in sync with the schema and the source: a new TL layer or a new
// command changes the numbers, and this fails until `node scripts/api-coverage.mjs` is re-run.
describe('api coverage report', () => {
  it('docs/api-coverage.md is up to date', () => {
    const r = spawnSync(process.execPath, ['scripts/api-coverage.mjs', '--check'], { encoding: 'utf8' });
    expect(r.stderr + r.stdout, r.stderr).not.toMatch(/out of date/);
    expect(r.status).toBe(0);
  });

  it('accounts for every Telethon TelegramClient member (none unmapped)', () => {
    const md = readFileSync('docs/api-coverage.md', 'utf8');
    expect(md).toMatch(/0 unaccounted for/);
  });
});
