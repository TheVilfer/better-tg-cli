import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareVersions, detectInstall, updateCommandFor } from '../src/update.js';

describe('compareVersions', () => {
  it('orders numerically, not lexically', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBe(1);
    expect(compareVersions('0.17.0', '0.17.0')).toBe(0);
    expect(compareVersions('0.17.0', '1.0.0')).toBe(-1);
    expect(compareVersions('1.2.3-beta.1', '1.2.3')).toBe(0);
  });
});

describe('detectInstall', () => {
  it('standalone binary under the Homebrew Cellar → brew', () => {
    expect(detectInstall('/opt/homebrew/Cellar/better-tg-cli/0.17.0/bin/telegram', '', true)).toEqual({ kind: 'brew' });
    expect(detectInstall('/home/linuxbrew/.linuxbrew/Cellar/better-tg-cli/0.17.0/bin/telegram', '', true).kind).toBe('brew');
  });

  it('standalone binary elsewhere → manual download', () => {
    expect(detectInstall('/usr/local/bin/telegram', '', true)).toEqual({ kind: 'binary', path: '/usr/local/bin/telegram' });
    expect(updateCommandFor({ kind: 'binary', path: '/x' })).toMatch(/releases\/latest/);
  });

  it('script inside node_modules → npm', () => {
    expect(detectInstall('/usr/bin/node', '/usr/lib/node_modules/better-tg-cli/dist/telegram.mjs', false)).toEqual({ kind: 'npm' });
  });

  it('script inside a git checkout → source', () => {
    const root = mkdtempSync(join(tmpdir(), 'btg-'));
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'dist'));
    const got = detectInstall('/usr/bin/node', join(root, 'dist', 'telegram.mjs'), false);
    expect(got.kind).toBe('source');
    expect(updateCommandFor(got)).toContain('pull --ff-only');
  });
});
