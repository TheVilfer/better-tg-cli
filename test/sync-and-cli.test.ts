import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { buildSyncFetchOptions } from '../src/commands/sync.js';

describe('sync fetch options', () => {
  const week = new Date(Date.now() - 7 * 86400e3);

  it('fresh sync: default window and 1000-message cap', () => {
    expect(buildSyncFetchOptions({ all: false, since: false, minDate: week })).toEqual({
      limit: 1000,
      minDate: week,
      maxDate: undefined,
    });
  });

  it('--all: no cap', () => {
    expect(buildSyncFetchOptions({ all: true, since: false }).limit).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('--resume ignores the default --days window and cap, so gaps are never dropped', () => {
    const o = buildSyncFetchOptions({ all: false, since: false, minDate: week, minId: 1120 });
    expect(o).toEqual({ limit: Number.MAX_SAFE_INTEGER, minId: 1120, minDate: undefined, maxDate: undefined });
  });

  it('--resume keeps an explicit --since', () => {
    expect(buildSyncFetchOptions({ all: false, since: true, minDate: week, minId: 5 }).minDate).toBe(week);
  });
});

describe('CLI surface (built dist)', () => {
  const bin = 'dist/telegram.mjs';
  const run = (...args: string[]) => execFileSync(process.execPath, [bin, ...args], { encoding: 'utf8' });

  it.skipIf(!existsSync(bin))('help-all lists every command with its flags', () => {
    const out = run('help-all');
    for (const cmd of ['read <chat>', 'search <query>', 'send <target> <message>', 'get <chat> <ids...>', 'info <chat>', 'topics <chat>']) {
      expect(out).toContain(cmd);
    }
    expect(out).toContain('--thread <id>');
    expect(out).toContain('--unread');
  });

  it.skipIf(!existsSync(bin))('help-all -g filters by flags too', () => {
    const out = run('help-all', '-g', 'topic');
    expect(out).toContain('read <chat>');
    expect(out).toContain('send <target> <message>');
    expect(out).not.toContain('poll <chat>');
  });
});
