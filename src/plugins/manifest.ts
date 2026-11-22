import {
  originProblem,
  pathProblem as urlPathProblem,
  secretHeaderProblem,
} from "./http.js";
import { commandSchemaProblems, validate } from "./json-schema.js";
import { MANIFEST_SCHEMAS } from "./manifest-schemas.js";
import { InvalidRangeError, parseRange, satisfies } from "./semver.js";

/**
 * The plugin manifest (`tg-plugin.json`, docs/plugins.md): the published JSON Schema of its spec
 * version, then the rules a schema cannot express. Pure functions: no file system, no network.
 */

export const MANIFEST_FILE = "tg-plugin.json";
export const SKILL_FILE = "SKILL.md";
/** The spec version this CLI writes and the newest it reads; the previous one is read too, when there is one. */
export const SPEC_VERSION = "2026-11-21";
export const SPEC_VERSIONS: readonly string[] =
  Object.keys(MANIFEST_SCHEMAS).sort();
export const schemaUrl = (date: string) =>
  `https://better-tg-cli.com/schemas/tg-plugin/${date}.json`;
const SCHEMA_URL_RE =
  /^https:\/\/better-tg-cli\.com\/schemas\/tg-plugin\/(\d{4}-\d{2}-\d{2})\.json$/;

/** Owners whose GitHub plugins are marked official. The mark grants nothing: install still asks the human. */
export const OFFICIAL_OWNERS: readonly string[] = ["TheVilfer"];

export const LIMITS = {
  manifestBytes: 64 * 1024,
  fileBytes: 1024 * 1024,
  totalBytes: 5 * 1024 * 1024,
  files: 200,
} as const;
export const DEFAULT_QUOTA_BYTES = 256 * 1024;

/** Logical names: storage keys, resources, triggers, settings, secrets. */
export const KEY_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
/** Agent Skills names: the plugin name. */
export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type Permission =
  | "identity:read"
  | "messages:read-own"
  | "chats:read"
  | "messages:read"
  | "messages:read-target"
  | "storage:read"
  | "storage:write"
  | "network"
  | "settings:read"
  | "actions";
export type Effect = "storage" | "network" | "actions";

export interface PluginCommand {
  name: string;
  description: string;
  effects: Effect[];
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

/** One non-secret setting: a small JSON Schema (`plugin settings set` checks a value against it). */
export interface SettingSchema {
  type: "string" | "integer" | "number" | "boolean";
  description: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export interface Manifest {
  $schema: string;
  name: string;
  version: string;
  description: string;
  author?: { name: string; url?: string; email?: string };
  license?: string;
  homepage?: string;
  engines?: { "better-tg-cli"?: string };
  main?: string;
  files: string[];
  permissions?: Permission[];
  network?: string[];
  secrets?: {
    name: string;
    description: string;
    inject: {
      origin: string;
      header: string;
      format: string;
      paths?: string[];
    };
  }[];
  settings?: Record<string, SettingSchema>;
  resources?: Record<string, string>;
  storage?: { keys: string[]; quotaBytes?: number };
  commands?: PluginCommand[];
  triggers?: { id: string; when: string; resource: string }[];
  onboarding?: { resource: string; doneWhen: { storage: string } };
}

/** What the human reads before installing, in plain words. */
export const PERMISSION_TEXT: Record<Permission, string> = {
  "identity:read": "your Telegram ID and name",
  "messages:read-own": "the text of messages you wrote yourself",
  "chats:read":
    "your chat list (names, types, unread counts; no message previews)",
  "messages:read":
    "messages of other people in any chat (WARNING: other people's messages)",
  "messages:read-target":
    "only the message or thread the agent passes to one run",
  "storage:read": "its own saved data",
  "storage:write": "change its own saved data",
  network: "send data to the internet addresses listed below",
  "settings:read": "its own non-secret settings",
  actions:
    "propose messages or reactions that you confirm before they are sent",
};

const EFFECT_NEEDS: Record<Effect, Permission> = {
  storage: "storage:write",
  network: "network",
  actions: "actions",
};

/**
 * - `specVersion`: The spec version (date) the manifest is written for, when its $schema could be read
 * - `errors`: Problems with the manifest itself: the plugin is invalid
 * - `unsupported`: The plugin is valid for another CLI or spec version: `plugin_unsupported`
 */
export interface ManifestCheck {
  manifest?: Manifest;
  specVersion?: string;
  errors: string[];
  unsupported?: string;
}

/**
 * Parses and checks `tg-plugin.json`. `cliVersion` is the version `engines.better-tg-cli` is matched
 * against (the running CLI's in production, pinned in tests).
 */
export function checkManifest(
  bytes: Uint8Array,
  cliVersion: string
): ManifestCheck {
  if (bytes.length > LIMITS.manifestBytes) {
    return {
      errors: [`${MANIFEST_FILE} is larger than ${LIMITS.manifestBytes} bytes`],
    };
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    return {
      errors: [
        `${MANIFEST_FILE} is not valid UTF-8 JSON: ${(error as Error).message}`,
      ],
    };
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return { errors: [`${MANIFEST_FILE} must be a JSON object`] };
  }
  const raw = json as Record<string, unknown>;
  const date =
    typeof raw.$schema === "string"
      ? SCHEMA_URL_RE.exec(raw.$schema)?.[1]
      : undefined;
  if (!date) {
    return {
      errors: [
        `"$schema" must be ${schemaUrl(SPEC_VERSION)} (the spec version the plugin is written for)`,
      ],
    };
  }
  const schema = MANIFEST_SCHEMAS[date];
  if (!schema) {
    const newest = SPEC_VERSIONS.at(-1)!;
    return {
      errors: [],
      specVersion: date,
      unsupported:
        date > newest
          ? `The plugin is written for plugin spec ${date}, newer than this CLI supports (${SPEC_VERSIONS.join(", ")}). Update Better-TG-CLI: telegram update`
          : `The plugin is written for plugin spec ${date}, which this CLI no longer supports (${SPEC_VERSIONS.join(", ")}). Ask its author for a newer version.`,
    };
  }
  const issues = validate(schema, json, 30);
  if (issues.length) {
    return {
      specVersion: date,
      errors: issues.map(
        (i) => `${MANIFEST_FILE}${i.path ? ` ${i.path}` : ""}: ${i.message}`
      ),
    };
  }
  const manifest = json as Manifest;
  const errors = semanticErrors(manifest);
  let unsupported: string | undefined;
  const range = manifest.engines?.["better-tg-cli"];
  if (range !== undefined) {
    try {
      parseRange(range);
      if (!satisfies(cliVersion, range)) {
        unsupported = `The plugin needs better-tg-cli ${range}; this is ${cliVersion}. Update Better-TG-CLI (telegram update) or install a plugin version made for this one.`;
      }
    } catch (error) {
      errors.push(
        `engines.better-tg-cli: ${error instanceof InvalidRangeError ? error.message : "invalid range"}`
      );
    }
  }
  return {
    manifest,
    specVersion: date,
    errors,
    ...(unsupported && !errors.length ? { unsupported } : {}),
  };
}

const WINDOWS_RESERVED =
  /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³]|conin\$|conout\$)(\..*)?$/i;

/**
 * Path rules beyond the schema pattern (relative, `/`, `[A-Za-z0-9._-]`, no `.`/`..`/empty
 * segments): no Windows-reserved names, no segment ending in a dot, at most 200 characters.
 * Returns the problem, or undefined for a good path. Exported for the fetchers, which check every
 * path again before touching the disk.
 */
export function pathProblem(path: string): string | undefined {
  if (typeof path !== "string" || !path) {
    return "is empty";
  }
  if (path.length > 200) {
    return "is longer than 200 characters";
  }
  if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(path)) {
    return 'must be relative, use "/" and only A-Z a-z 0-9 . _ -';
  }
  for (const seg of path.split("/")) {
    if (seg === "." || seg === "..") {
      return 'must not contain "." or ".." segments';
    }
    if (WINDOWS_RESERVED.test(seg)) {
      return `uses "${seg}", a name Windows reserves`;
    }
    if (seg.endsWith(".")) {
      return `has a segment ending in a dot ("${seg}")`;
    }
  }
  return undefined;
}

/** Problems with a whole file list: each path, case-insensitive duplicates, a file that is also a folder. */
export function fileListProblems(files: string[]): string[] {
  const out: string[] = [];
  const lower = new Map<string, string>();
  for (const f of files) {
    const p = pathProblem(f);
    if (p) {
      out.push(`files: "${f}" ${p}`);
      continue;
    }
    const key = f.toLowerCase();
    const prev = lower.get(key);
    if (prev === undefined) {
      lower.set(key, f);
    } else {
      out.push(`files: "${f}" and "${prev}" differ only in case`);
    }
  }
  const dirs = new Map<string, string>();
  for (const f of lower.values()) {
    const parts = f.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join("/");
      const prev = dirs.get(dir.toLowerCase());
      if (prev === undefined) {
        dirs.set(dir.toLowerCase(), dir);
      } else if (prev !== dir) {
        out.push(`files: folders "${dir}" and "${prev}" differ only in case`);
        break;
      }
    }
  }
  const all = new Set(lower.keys());
  for (const key of all) {
    const parts = key.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join("/");
      if (all.has(dir)) {
        out.push(
          `files: "${lower.get(dir)}" is a file and also a folder of "${lower.get(key)}"`
        );
      }
    }
  }
  return out;
}

function semanticErrors(m: Manifest): string[] {
  const errors = fileListProblems(m.files);
  const files = new Set(m.files);
  for (const required of [MANIFEST_FILE, SKILL_FILE]) {
    if (!files.has(required)) {
      errors.push(`files must include ${required}`);
    }
  }
  if (m.main !== undefined && !files.has(m.main)) {
    errors.push(`main "${m.main}" is not in files`);
  }
  const resources = m.resources ?? {};
  for (const [key, ref] of Object.entries(resources)) {
    const [file, fragment] = ref.split("#");
    if (!files.has(file)) {
      errors.push(`resources.${key}: "${file}" is not in files`);
    } else if (fragment !== undefined && !/\.md$/i.test(file)) {
      errors.push(`resources.${key}: a #section works only in a Markdown file`);
    }
  }
  const permissions = new Set(m.permissions);
  const triggerIds = new Set<string>();
  for (const t of m.triggers ?? []) {
    if (triggerIds.has(t.id)) {
      errors.push(`triggers: id "${t.id}" is used twice`);
    }
    triggerIds.add(t.id);
    if (!(t.resource in resources)) {
      errors.push(
        `triggers.${t.id}: resource "${t.resource}" is not in resources`
      );
    }
  }
  if (m.onboarding) {
    if (!(m.onboarding.resource in resources)) {
      errors.push(
        `onboarding: resource "${m.onboarding.resource}" is not in resources`
      );
    }
    if (!m.storage?.keys.includes(m.onboarding.doneWhen.storage)) {
      errors.push(
        `onboarding.doneWhen.storage: "${m.onboarding.doneWhen.storage}" is not in storage.keys`
      );
    }
  }
  const names = new Set<string>();
  for (const c of m.commands ?? []) {
    if (names.has(c.name)) {
      errors.push(`commands: "${c.name}" is defined twice`);
    }
    names.add(c.name);
    for (const e of c.effects) {
      if (!permissions.has(EFFECT_NEEDS[e])) {
        errors.push(
          `commands.${c.name}: effect "${e}" needs the permission "${EFFECT_NEEDS[e]}"`
        );
      }
    }
    for (const [which, schema] of [
      ["input", c.input],
      ["output", c.output],
    ] as const) {
      for (const p of schemaSelfContainedProblems(schema)) {
        errors.push(`commands.${c.name}.${which}: ${p}`);
      }
      for (const p of commandSchemaProblems(schema)) {
        errors.push(`commands.${c.name}.${which}: ${p}`);
      }
    }
    if (c.input.type !== "object") {
      errors.push(
        `commands.${c.name}.input: the root must be {"type": "object"}`
      );
    }
  }
  if ((m.commands?.length ?? 0) > 0 && m.main === undefined) {
    errors.push('commands need "main", the file with their code');
  }
  const origins = new Set(m.network);
  if (permissions.has("network") && !origins.size) {
    errors.push(
      'the permission "network" needs at least one origin in network'
    );
  }
  if (origins.size && !permissions.has("network")) {
    errors.push('network lists origins, but permissions lack "network"');
  }
  for (const o of origins) {
    if (o.endsWith(":443")) {
      errors.push(
        `network: write "${o.replace(/:443$/, "")}" without the default port`
      );
    } else {
      const p = originProblem(o);
      if (p) {
        errors.push(`network: "${o}" ${p}`);
      }
    }
  }
  const secretNames = new Set<string>();
  const injected = new Set<string>();
  for (const s of m.secrets ?? []) {
    if (secretNames.has(s.name)) {
      errors.push(`secrets: "${s.name}" is declared twice`);
    }
    secretNames.add(s.name);
    if (!origins.has(s.inject.origin)) {
      errors.push(
        `secrets.${s.name}: origin ${s.inject.origin} is not in network`
      );
    }
    for (const p of s.inject.paths ?? []) {
      const why = urlPathProblem(p);
      if (why) {
        errors.push(`secrets.${s.name}: inject.paths "${p}" holds ${why}`);
      }
    }
    if (s.inject.paths && !s.inject.paths.length) {
      errors.push(
        `secrets.${s.name}: inject.paths is empty; leave it out to send the secret to every path`
      );
    }
    const hp = secretHeaderProblem(s.inject.header);
    if (hp) {
      errors.push(`secrets.${s.name}: inject.header ${hp}`);
    }
    const at = `${s.inject.origin} ${s.inject.header.toLowerCase()}`;
    if (injected.has(at)) {
      errors.push(
        `secrets.${s.name}: another secret already goes to ${s.inject.origin} as ${s.inject.header}`
      );
    }
    injected.add(at);
  }
  for (const [key, d] of Object.entries(m.settings ?? {})) {
    const numeric = d.type === "integer" || d.type === "number";
    if (!numeric && (d.minimum !== undefined || d.maximum !== undefined)) {
      errors.push(
        `settings.${key}: minimum/maximum need type integer or number`
      );
    }
    if (
      d.type !== "string" &&
      (d.minLength !== undefined || d.maxLength !== undefined)
    ) {
      errors.push(`settings.${key}: minLength/maxLength need type string`);
    }
    if (d.type === "boolean" && d.enum) {
      errors.push(`settings.${key}: a boolean takes no enum`);
    }
    for (const v of d.enum ?? []) {
      if (validate({ type: d.type }, v, 1).length) {
        errors.push(
          `settings.${key}: enum value ${JSON.stringify(v)} is not of type ${d.type}`
        );
      }
    }
    if (d.default !== undefined) {
      const issues = validate(
        d as unknown as Record<string, unknown>,
        d.default,
        3
      );
      if (issues.length) {
        errors.push(
          `settings.${key}: the default ${JSON.stringify(d.default)} is not a valid value (${issues.map((i) => i.message).join("; ")})`
        );
      }
    }
  }
  return errors;
}

const DRAFT_2020 = "https://json-schema.org/draft/2020-12/schema";

/** A command schema must stand alone: local $ref only, no other $schema, no $id. */
export function schemaSelfContainedProblems(schema: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown, at: string) => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => walk(n, `${at}/${i}`));
      return;
    }
    if (typeof node !== "object" || node === null) {
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (
        (k === "$ref" || k === "$dynamicRef") &&
        typeof v === "string" &&
        !v.startsWith("#")
      ) {
        out.push(
          `${k} "${v}" at ${at || "/"} is external; keep $defs inside the schema`
        );
      }
      if (k === "$schema" && v !== DRAFT_2020) {
        out.push(`$schema at ${at || "/"} must be ${DRAFT_2020} or absent`);
      }
      if (k === "$id") {
        out.push(`$id at ${at || "/"} is not allowed`);
      }
      walk(v, `${at}/${k}`);
    }
  };
  walk(schema, "");
  return out;
}

/** The YAML frontmatter fields of SKILL.md that the plugin spec reads (`name`, `description`). */
export function skillProblems(text: string, pluginName: string): string[] {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(text);
  if (!m) {
    return [
      `${SKILL_FILE} must start with a YAML frontmatter (---, name, description, ---)`,
    ];
  }
  const field = (name: string) => {
    const line = new RegExp(`^${name}:[ \\t]*(.*)$`, "m").exec(m[1]);
    if (!line) {
      return undefined;
    }
    return line[1]
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2")
      .trim();
  };
  const out: string[] = [];
  const name = field("name");
  if (name !== pluginName) {
    out.push(
      `${SKILL_FILE} frontmatter name must be "${pluginName}" (the plugin name)${name ? `, not "${name}"` : ""}`
    );
  }
  const description = field("description");
  if (!description) {
    out.push(`${SKILL_FILE} frontmatter needs a description`);
  } else if (description.length > 1024) {
    out.push(`${SKILL_FILE} description is longer than 1024 characters`);
  }
  return out;
}

/** GitHub-style heading slug: lowercase, punctuation dropped, spaces to hyphens. */
export function headingSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N} _-]/gu, "")
    .replaceAll(" ", "-");
}

/**
 * One section of a Markdown text: the heading whose slug is `slug` and everything up to the next
 * heading of the same or a higher level. Headings inside code fences do not count. Undefined when
 * there is no such heading.
 */
export function markdownSection(
  text: string,
  slug: string
): string | undefined {
  const lines = text.split("\n");
  let fence: string | undefined;
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) {
        fence = f[1][0];
      } else if (f[1][0] === fence) {
        fence = undefined;
      }
      continue;
    }
    if (fence) {
      continue;
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (!h) {
      continue;
    }
    if (start >= 0 && h[1].length <= level) {
      return lines.slice(start, i).join("\n").trimEnd();
    }
    if (start < 0 && headingSlug(h[2]) === slug) {
      start = i;
      level = h[1].length;
    }
  }
  return start >= 0 ? lines.slice(start).join("\n").trimEnd() : undefined;
}

/** The effects of all commands together (what the install summary shows). */
export function allEffects(m: Manifest): Effect[] {
  return [...new Set((m.commands ?? []).flatMap((c) => c.effects))].sort();
}
