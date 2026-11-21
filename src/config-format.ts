/**
 * Config files used to be written with json5 (unquoted keys, trailing commas). New files
 * are plain JSON; old ones are still read by normalizing that JSON5 subset first.
 */
export function parseConfigText(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const normalized = raw
      .replaceAll(/\/\*[\s\S]*?\*\//g, "")
      .replaceAll(/(^|[^:"'\\])\/\/[^\n]*/g, "$1")
      .replaceAll(/'((?:[^'\\]|\\.)*)'/g, (_m, s: string) =>
        JSON.stringify(s.replaceAll("\\'", "'"))
      )
      .replaceAll(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replaceAll(/,(\s*[}\]])/g, "$1");
    return JSON.parse(normalized);
  }
}

export function stringifyConfig(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
