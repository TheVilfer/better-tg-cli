import { describe, expect, it } from 'vitest';
import { encodeWriteState, parseForDuration, parseWriteState } from '../src/write-state.js';
import { quoteForSecurityShell } from '../src/keychain.js';

describe('write access state', () => {
  const now = Date.UTC(2026, 8, 27, 12, 0, 0);

  it('"true" means on until turned off', () => {
    expect(parseWriteState('true', now)).toEqual({ enabled: true });
  });

  it('missing or unknown values mean read-only', () => {
    expect(parseWriteState(null, now).enabled).toBe(false);
    expect(parseWriteState('yes', now).enabled).toBe(false);
    expect(parseWriteState('until:abc', now).enabled).toBe(false);
  });

  it('time-limited access expires on its own', () => {
    const value = encodeWriteState(3600, now);
    expect(parseWriteState(value, now + 59 * 60e3).enabled).toBe(true);
    const later = parseWriteState(value, now + 61 * 60e3);
    expect(later).toMatchObject({ enabled: false, expired: true });
  });

  it('parses --for durations and rejects junk', () => {
    expect(parseForDuration('30m')).toBe(1800);
    expect(parseForDuration('2h')).toBe(7200);
    expect(parseForDuration('1w')).toBe(604800);
    expect(() => parseForDuration('0h')).toThrow();
    expect(() => parseForDuration('forever')).toThrow();
  });
});

describe('keychain command quoting (secrets go through stdin, not argv)', () => {
  it('wraps values in double quotes and escapes quotes and backslashes', () => {
    expect(quoteForSecurityShell('abc')).toBe('"abc"');
    expect(quoteForSecurityShell('a"b\\c d')).toBe('"a\\"b\\\\c d"');
  });

  it('refuses newlines, which would inject a second command', () => {
    expect(() => quoteForSecurityShell('x\ndelete-generic-password -s tg-cli')).toThrow();
  });
});
