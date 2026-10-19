import { TL_METHODS, TL_NAMESPACES, type TlMethod } from './generated/tl-commands.js';

/**
 * Pure name-mapping for the generated `tl` commands: kebab command path ⇄ canonical TL className.
 * Kept free of teleproto/commander so the MCP router (src/mcp.ts) can classify a
 * `["tl","messages","get-history",…]` call without loading the whole client. The method list comes
 * from the checked-in src/generated/tl-commands.ts (one entry per TL schema method).
 */

const topLevel = new Map<string, string>();
const byPath = new Map<string, string>();
const namespaceMethods = new Map<string, TlMethod[]>();
for (const m of TL_METHODS) {
  const [ns, method, className] = m;
  if (ns) {
    byPath.set(`${ns}/${method}`, className);
    const list = namespaceMethods.get(ns);
    if (list) list.push(m);
    else namespaceMethods.set(ns, [m]);
  } else {
    topLevel.set(method, className);
  }
}

const NAMESPACE_SET = new Set(TL_NAMESPACES);

export function isTlNamespace(ns: string): boolean {
  return NAMESPACE_SET.has(ns);
}

export function tlNamespaceMethods(ns: string): TlMethod[] {
  return namespaceMethods.get(ns) ?? [];
}

export function tlTopLevelMethods(): TlMethod[] {
  return TL_METHODS.filter((m) => !m[0]);
}

export function tlTopLevelClassName(method: string): string | undefined {
  return topLevel.get(method);
}

/** PascalCase/camelCase TL identifier → kebab (matches scripts/gen-tl-commands.mjs). */
export function kebabCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Resolve a kebab command path to a className. `positionals` are the leading non-flag tokens after
 * `tl` (e.g. `["messages","get-history"]` or `["ping"]`). Returns the className, or a message to
 * show the user.
 */
export function resolveTlPath(positionals: string[]): { className: string } | { error: string } {
  if (positionals.length === 0) {
    return { error: 'tl needs a namespace and method, e.g. "tl messages get-history" (or a top-level method like "tl ping")' };
  }
  const [first, second] = positionals;
  if (isTlNamespace(first)) {
    if (!second) return { error: `tl ${first} needs a method; see "telegram tl ${first} --help"` };
    const className = byPath.get(`${first}/${second}`);
    if (!className) return { error: `Unknown method "${first} ${second}"; see "telegram tl ${first} --help"` };
    return { className };
  }
  const top = topLevel.get(first);
  if (top) return { className: top };
  return { error: `Unknown tl command "${first}"; run "telegram tl" for the namespace list` };
}
