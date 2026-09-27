import { afterEach, describe, expect, it } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { configDir, configFile, secretPrefix } from '../src/paths.js';

const saved = process.env.TG_PROFILE;
afterEach(() => { if (saved === undefined) delete process.env.TG_PROFILE; else process.env.TG_PROFILE = saved; });

describe('profile paths', () => {
  it('no profile keeps the historical locations (existing logins depend on them)', () => {
    delete process.env.TG_PROFILE;
    expect(configDir()).toBe(join(homedir(), '.config', 'tg'));
    expect(configFile('config.json5')).toBe(join(homedir(), '.config', 'tg', 'config.json5'));
    expect(secretPrefix()).toBe('tg-cli');
    process.env.TG_PROFILE = '';
    expect(secretPrefix()).toBe('tg-cli');
  });

  it('a profile gets its own dir and Keychain service', () => {
    process.env.TG_PROFILE = 'dev';
    expect(configDir()).toBe(join(homedir(), '.config', 'tg-dev'));
    expect(secretPrefix()).toBe('tg-cli-dev');
  });

  it('rejects names that could escape the dir', () => {
    for (const bad of ['../x', 'Dev', 'a/b', '-x', 'a b']) {
      process.env.TG_PROFILE = bad;
      expect(() => configDir()).toThrow(/Invalid TG_PROFILE/);
    }
  });
});
