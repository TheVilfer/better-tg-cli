import apiDefinitions from "teleproto/tl/generated/api-definitions.js";

import { apiMarker } from "./approval-action.js";

/**
 * TL parameter types teleproto resolves from a bare string on invoke (`"peer": "@name"`): left as
 * strings, they would be resolved after the approval, so a username that moved to another account in
 * between would get the write.
 */
const PEER_TYPES = new Set([
  "InputPeer",
  "InputUser",
  "InputChannel",
  "InputDialogPeer",
  "InputNotifyPeer",
]);

interface Arg {
  type: string | null;
  isVector: boolean;
  flagIndicator: boolean;
}
interface Def {
  name: string;
  namespace?: string;
  isFunction: boolean;
  result: string;
  argsConfig: Record<string, Arg>;
}

const methods = new Map<string, Def>();
const byTag = new Map<string, Def>();
const byResult = new Map<string, Def[]>();
for (const d of apiDefinitions as unknown as Def[]) {
  const name = d.namespace ? `${d.namespace}.${d.name}` : d.name;
  if (d.isFunction) {
    methods.set(name, d);
    continue;
  }
  const lower = d.name[0].toLowerCase() + d.name.slice(1);
  byTag.set(d.namespace ? `${d.namespace}.${lower}` : lower, d);
  byResult.set(d.result, [...(byResult.get(d.result) ?? []), d]);
}

/**
 * The constructor teleproto builds a plain params object into: by its `_` tag, or, when the tag is
 * missing or empty (teleproto tests it for truth, not for presence), the only constructor of its type.
 */
function constructorOf(
  obj: Record<string, unknown>,
  type: string | null
): Def | undefined {
  if (obj._) {
    return typeof obj._ === "string" ? byTag.get(obj._) : undefined;
  }
  const candidates = type ? byResult.get(type) : undefined;
  return candidates?.length === 1 ? candidates[0] : undefined;
}

function bindFields(fields: Record<string, unknown>, def: Def): void {
  for (const [name, arg] of Object.entries(def.argsConfig)) {
    if (arg.flagIndicator || fields[name] == null) {
      continue;
    }
    const bind = (v: unknown): unknown => {
      if (typeof v === "string" && PEER_TYPES.has(arg.type ?? "")) {
        return { _chat: v };
      }
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const obj = v as Record<string, unknown>;
        // A marker ({_chat}, {_base64}…) stays as is; a nested constructor is walked by its own schema
        if (!apiMarker(obj)) {
          const inner = constructorOf(obj, arg.type);
          if (inner) {
            bindFields(obj, inner);
          }
        }
      }
      return v;
    };
    fields[name] =
      arg.isVector && Array.isArray(fields[name])
        ? (fields[name] as unknown[]).map(bind)
        : bind(fields[name]);
  }
}

/**
 * Rewrites every string in a peer-typed field of a raw API request (at any depth the TL schema
 * reaches) into `{"_chat": "…"}`, in place, so the approval resolves it to an ID and the request is
 * built from the same resolved object. Called before the write guard.
 */
export function bindStringPeers(
  className: string,
  params: Record<string, unknown>
): Record<string, unknown> {
  const def = methods.get(className);
  if (def) {
    bindFields(params, def);
  }
  return params;
}
