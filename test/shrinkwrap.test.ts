import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('npm-shrinkwrap.json for the npm package', () => {
  it('states zero runtime dependencies and is removed after packing', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.dependencies ?? {}).toEqual({});
    expect(pkg.files).toContain('npm-shrinkwrap.json');
    try {
      execFileSync('node', ['scripts/shrinkwrap.mjs']);
      const lock = JSON.parse(readFileSync('npm-shrinkwrap.json', 'utf8'));
      expect(lock).toMatchObject({ name: pkg.name, version: pkg.version, lockfileVersion: 3 });
      expect(Object.keys(lock.packages)).toEqual(['']);
    } finally {
      execFileSync('node', ['scripts/shrinkwrap.mjs', 'clean']);
    }
    expect(existsSync('npm-shrinkwrap.json')).toBe(false);
  });
});
