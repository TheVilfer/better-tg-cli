import { TL_METHODS, TL_NAMESPACES, type TlMethod } from './generated/tl-commands.js';

/**
 * Pure name-mapping for the generated top-level API commands — `telegram <namespace> <method>`
 * (e.g. `telegram messages get-history`) and root-level `telegram <method>` (e.g. `telegram ping`).
 * Kept free of teleproto/commander so the MCP router (src/mcp.ts) can classify a call by its
 * underlying TL method without loading the whole client. The method list is the checked-in
 * src/generated/tl-commands.ts (one entry per TL schema method). "TL" throughout = the Telegram
 * schema layer, not a command name (there is no `tl` command).
 */

const byPath = new Map<string, string>(); // `${ns}/${method}` -> className
const rootMethodMap = new Map<string, string>(); // methodKebab -> className (no namespace)
const namespaceMethods = new Map<string, TlMethod[]>();
for (const m of TL_METHODS) {
  const [ns, method, className] = m;
  if (ns) {
    byPath.set(`${ns}/${method}`, className);
    const list = namespaceMethods.get(ns);
    if (list) list.push(m);
    else namespaceMethods.set(ns, [m]);
  } else {
    rootMethodMap.set(method, className);
  }
}

const NAMESPACE_SET = new Set(TL_NAMESPACES);

export function isGeneratedNamespace(ns: string): boolean {
  return NAMESPACE_SET.has(ns);
}

export function namespaceMethodList(ns: string): TlMethod[] {
  return namespaceMethods.get(ns) ?? [];
}

/** className for a namespace + kebab method, or undefined if that method does not exist. */
export function methodClassName(ns: string, method: string): string | undefined {
  return byPath.get(`${ns}/${method}`);
}

/** className for a root-level (namespace-less) kebab method, or undefined. */
export function rootMethodClassName(method: string): string | undefined {
  return rootMethodMap.get(method);
}

export function rootMethods(): TlMethod[] {
  return TL_METHODS.filter((m) => !m[0]);
}

/** Namespaces with their method counts, most methods first (for the help summary). */
export function namespaceCounts(): { ns: string; count: number }[] {
  return [...namespaceMethods.entries()]
    .map(([ns, list]) => ({ ns, count: list.length }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Resolve a CLI argv tail to the className of a generated API command, or null when it is not one
 * (so the caller falls back to a curated command). `args[0]` is the command name as typed:
 * `["messages","get-history",…]` → `messages.GetHistory`; `["ping"]` → `Ping`;
 * `["stats","get-broadcast-stats",…]` → `stats.GetBroadcastStats`; `["stats","@chat"]` → null
 * (not a method name, so the curated `stats` command keeps it).
 */
export function resolveGeneratedCommand(args: string[]): string | null {
  const [c0, c1] = args;
  if (!c0) return null;
  if (isGeneratedNamespace(c0) && typeof c1 === 'string') {
    return methodClassName(c0, c1) ?? null;
  }
  return rootMethodClassName(c0) ?? null;
}

/**
 * PascalCase/camelCase TL identifier → kebab. Splits an acronym run before a real word
 * (`GetDHParams` → `get-dh-params`) but keeps a plural acronym together (`GetContactIDs` →
 * `get-contact-ids`): the second rule requires 2+ lowercase letters to count as a new word, so a
 * lone trailing plural `s` (`IDs`) stays attached. Keep IDENTICAL to scripts/gen-tl-commands.mjs.
 */
export function kebabCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z]{2,})/g, '$1-$2')
    .toLowerCase();
}
