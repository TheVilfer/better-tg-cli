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

/** The most a settings file may hold (what settingsRead reads), checked before every write. */
export const SETTINGS_BYTES = 256 * 1024;

/** The settings as the file holds them (compact JSON), or `settings_too_large` (exit 2) past SETTINGS_BYTES. */
export function settingsText(
  name: string,
  all: Record<string, unknown>
): string {
  const text = JSON.stringify(all);
  const bytes = Buffer.byteLength(text, "utf-8");
  if (bytes > SETTINGS_BYTES) {
    throw new CliError(
      `The settings of "${name}" would take ${bytes} bytes; the limit is ${SETTINGS_BYTES}`,
      "settings_too_large",
      EXIT.USAGE,
      {
        hint: `Use a shorter value, or shorten another setting first: telegram plugin settings get ${name}`,
      }
    );
  }
  return text;
}
