import { describe, expect, it } from 'vitest';
import { parseConfigText, stringifyConfig } from '../src/config-format.js';
import colors from '../src/colors.js';

describe('config file format (json5 replacement)', () => {
  it('reads plain JSON', () => {
    expect(parseConfigText('{"apiId": 1}')).toEqual({ apiId: 1 });
  });

  it('reads files written by the old json5 writer', () => {
    // JSON5.stringify(obj, null, 2) output: unquoted keys, single quotes, trailing commas
    const old = "{\n  apiId: 7557120,\n  opVault: 'Personal',\n  defaultFormat: 'plain',\n}";
    expect(parseConfigText(old)).toEqual({ apiId: 7557120, opVault: 'Personal', defaultFormat: 'plain' });
  });

  it('tolerates comments and keeps URLs inside strings', () => {
    const txt = '{\n  // comment\n  url: "https://x.test/a", /* block */ n: 2,\n}';
    expect(parseConfigText(txt)).toEqual({ url: 'https://x.test/a', n: 2 });
  });

  it('writes JSON that both parsers read back', () => {
    const v = { apiId: 5, credentialSource: 'invite' };
    expect(parseConfigText(stringifyConfig(v))).toEqual(v);
    expect(JSON.parse(stringifyConfig(v))).toEqual(v);
  });
});

describe('colors (chalk replacement)', () => {
  it('is plain text off a TTY and supports chaining', () => {
    expect(colors.red('x')).toBe('x');
    expect(colors.bold.blue('y')).toBe('y');
  });
});
