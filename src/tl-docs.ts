import { TL_DOCS, TL_DOCS_META } from "./generated/tl-docs.js";

export { TL_DOCS_META };

/**
 * - `d`: Short human description (official, or a fallback line for methods new in this layer).
 * - `p`: Per-parameter descriptions, keyed by the normalised param name (lowercased, separators stripped).
 * - `e`: Top "Possible errors": [code, name, short message].
 */
export interface MethodDoc {
  d: string;
  p?: Record<string, string>;
  e?: [string, string, string][];
}

const cache = new Map<string, Record<string, MethodDoc>>();

const namespaceOf = (className: string): string => {
  const i = className.indexOf(".");
  return i === -1 ? "" : className.slice(0, i);
};

function namespaceDocs(ns: string): Record<string, MethodDoc> {
  let parsed = cache.get(ns);
  if (!parsed) {
    parsed = TL_DOCS[ns]
      ? (JSON.parse(TL_DOCS[ns]) as Record<string, MethodDoc>)
      : {};
    cache.set(ns, parsed);
  }
  return parsed;
}

export function methodDoc(className: string): MethodDoc | undefined {
  return namespaceDocs(namespaceOf(className))[className];
}

const normParam = (name: string): string =>
  name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");

export function paramDoc(
  className: string,
  paramName: string
): string | undefined {
  return methodDoc(className)?.p?.[normParam(paramName)];
}

/** lowerCamel method part for the docs URL: `messages.GetHistory` → `messages.getHistory`. */
export function docsUrl(className: string): string {
  const i = className.indexOf(".");
  const name = i === -1 ? className : className.slice(i + 1);
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  const path = i === -1 ? lower : `${className.slice(0, i)}.${lower}`;
  return `https://core.telegram.org/method/${path}`;
}
