import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger, floodWaitMax } from '../src/client-options.js';

afterEach(() => vi.restoreAllMocks());

function stderr(fn: () => void): string {
  let out = '';
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => { out += String(chunk); return true; });
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  fn();
  expect(log).not.toHaveBeenCalled(); // never stdout: it would corrupt --json
  return out;
}

describe('teleproto logger', () => {
  it('announces an automatic flood-wait retry even at the default ERROR level', () => {
    const out = stderr(() => createLogger(undefined).info('Sleeping for 12s on flood wait (Caused by messages.GetHistory)'));
    expect(out).toBe('Telegram rate limit on messages.GetHistory: waiting 12s, then retrying\n');
  });

  it('stays silent for other info lines, and entirely with TG_LOG_LEVEL=none', () => {
    expect(stderr(() => createLogger(undefined).info('Connecting to 1.2.3.4'))).toBe('');
    expect(stderr(() => createLogger('none').info('Sleeping for 5s on flood wait (Caused by x.Y)'))).toBe('');
  });

  it('writes enabled levels to stderr', () => {
    expect(stderr(() => createLogger('debug').debug('hello'))).toBe('[debug] hello\n');
  });
});

describe('floodWaitMax', () => {
  it('defaults to 60s, accepts 0 (fail fast) and caps at an hour', () => {
    expect(floodWaitMax(undefined)).toBe(60);
    expect(floodWaitMax('')).toBe(60);
    expect(floodWaitMax('0')).toBe(0);
    expect(floodWaitMax('300')).toBe(300);
    expect(floodWaitMax('99999')).toBe(3600);
    expect(floodWaitMax('abc')).toBe(60);
  });
});
