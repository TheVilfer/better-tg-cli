/**
 * Config files used to be written with json5 (unquoted keys, trailing commas). New files
 * are plain JSON; old ones are still read by normalizing that JSON5 subset first.
 */
export function parseConfigText(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const normalized = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:"'\\])\/\/[^\n]*/g, '$1')
      .replace(/'((?:[^'\\]|\\.)*)'/g, (_m, s: string) => JSON.stringify(s.replace(/\\'/g, "'")))
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(normalized);
  }
}

export function stringifyConfig(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}
