import { CliError, EXIT } from "../errors.js";
import { validate } from "./json-schema.js";
import type { Manifest, SettingSchema } from "./manifest.js";

/** The schema of a declared setting, or `invalid_argument` naming the settings the plugin has. */
export function declaredSetting(m: Manifest, key: string): SettingSchema {
  const d =
    m.settings && Object.hasOwn(m.settings, key) ? m.settings[key] : undefined;
  if (!d) {
    throw new CliError(
      `Plugin "${m.name}" has no setting "${key}"`,
      "invalid_argument",
      EXIT.USAGE,
      {
        hint: `Its settings: ${Object.keys(m.settings ?? {}).join(", ") || "none"}`,
      }
    );
  }
  return d;
}

/** Checks a value against its setting's schema, as `plugin settings set` does (exit 2 with `issues`). */
export function checkSettingValue(
  m: Manifest,
  key: string,
  value: unknown
): void {
  const d = declaredSetting(m, key);
  const issues = validate(
    d as unknown as Record<string, unknown>,
    value,
    5,
    2000
  );
  if (issues.length) {
    throw new CliError(
      `"${key}" does not take this value: ${issues.map((i) => `${i.path || "/"} ${i.message}`).join("; ")}`,
      "invalid_argument",
      EXIT.USAGE,
      { fields: { issues } }
    );
  }
}
