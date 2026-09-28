import { afterEach, describe, expect, it } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { configDir, configFile, secretPrefix } from '../src/paths.js';

// macOS and Linux keep ~/.config/tg; Windows uses %APPDATA%\\tg
const base = process.platform === 'win32' && process.env.APPDATA ? process.env.APPDATA : join(homedir(), '.config');

const saved = process.env.TG_PROFILE;
afterEach(() => { if (saved === undefined) delete process.env.TG_PROFILE; else process.env.TG_PROFILE = saved; });

describe('profile paths', () => {
  it('no profile keeps the historical locations (existing logins depend on them)', () => {
    delete process.env.TG_PROFILE;
    expect(configDir()).toBe(join(base, 'tg'));
    expect(configFile('config.json5')).toBe(join(base, 'tg', 'config.json5'));
    expect(secretPrefix()).toBe('tg-cli');
    process.env.TG_PROFILE = '';
    expect(secretPrefix()).toBe('tg-cli');
  });

  it('a profile gets its own dir and Keychain service', () => {
    process.env.TG_PROFILE = 'dev';
    expect(configDir()).toBe(join(base, 'tg-dev'));
    expect(secretPrefix()).toBe('tg-cli-dev');
  });

  it('rejects names that could escape the dir', () => {
    for (const bad of ['../x', 'Dev', 'a/b', '-x', 'a b']) {
      process.env.TG_PROFILE = bad;
      expect(() => configDir()).toThrow(/Invalid TG_PROFILE/);
    }
  });
});

describe('Windows config dir', () => {
  it('lives in %APPDATA% on Windows and stays in ~/.config elsewhere', () => {
    delete process.env.TG_PROFILE;
    expect(configDir({ APPDATA: 'C:\\Users\\a\\AppData\\Roaming' }, 'win32')).toBe(join('C:\\Users\\a\\AppData\\Roaming', 'tg'));
    expect(configDir({ APPDATA: 'C:\\x' }, 'darwin')).toBe(join(homedir(), '.config', 'tg'));
    expect(configDir({}, 'win32')).toBe(join(homedir(), '.config', 'tg')); // no APPDATA: fall back
  });
});
