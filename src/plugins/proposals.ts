import { oneLine } from "../approval-action.js";
import { maskForModel } from "../mcp-output.js";
/**
 * Action proposals (docs/plugins.md §7): a plugin with the permission and effect `actions` proposes
 * a typed action; the host checks every field and builds the summary, the argv and the stdin from
 * the same checked values, so a plugin cannot describe one action and hand over another. The agent
 * runs the argv through the normal write path (guard, approval, mode).
 */
import { HostError } from "./sandbox-types.js";

export interface Proposal {
  id: string;
  type: "send" | "reply" | "react";
  summary: string;
  argv: string[];
  stdin?: string;
  confirm: true;
}

export const PROPOSAL_TYPES = ["send", "reply", "react"] as const;
const TEXT_MAX = 4096;
const FIELDS: Record<Proposal["type"], readonly string[]> = {
  send: ["type", "chat", "text", "topic"],
  reply: ["type", "chat", "msgId", "text", "topic"],
  react: ["type", "chat", "msgId", "emoji"],
};

const bad = (message: string) => new HostError("invalid_proposal", message);

function chat(v: unknown): string {
  if (typeof v === "number" && Number.isSafeInteger(v)) {
    return String(v);
  }
  if (typeof v !== "string" || !/^(-?\d{1,20}|@[A-Za-z0-9_]{3,64})$/.test(v)) {
    throw bad("chat must be a chat ID or an @username");
  }
  return v;
}

function id(v: unknown, what: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 2 ** 31) {
    throw bad(`${what} must be a positive integer`);
  }
  return v;
}

function text(v: unknown, mask: boolean): string {
  if (typeof v !== "string" || !v.trim()) {
    throw bad("text must be a non-empty string");
  }
  if (v.length > TEXT_MAX) {
    throw bad(`text must have at most ${TEXT_MAX} characters`);
  }
  return mask ? maskForModel(v, "echo") : v;
}

function emoji(v: unknown): string {
  // One reaction: a few code points, never an option ("-…") or whitespace
  if (
    typeof v !== "string" ||
    !v ||
    v.startsWith("-") ||
    [...v].length > 8 ||
    /[\s\p{Cc}]/u.test(v)
  ) {
    throw bad("emoji must be one reaction emoji");
  }
  return v;
}

const clip = (s: string, n = 200) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * A proposal from what the plugin passed to `host.actions.propose`. Unknown fields are refused, so
 * nothing the plugin adds can travel in a proposal without the host having checked it.
 */
export function buildProposal(
  action: unknown,
  n: number,
  mask: boolean
): Proposal {
  if (typeof action !== "object" || action === null || Array.isArray(action)) {
    throw bad("a proposal is an object with a type");
  }
  // Own fields only: nothing inherited (a `__proto__` object) is read as a field
  const a: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const key of Object.keys(action)) {
    a[key] = (action as Record<string, unknown>)[key];
  }
  const { type } = a;
  if (
    typeof type !== "string" ||
    !(PROPOSAL_TYPES as readonly string[]).includes(type)
  ) {
    throw bad(`type must be one of ${PROPOSAL_TYPES.join(", ")}`);
  }
  const t = type as Proposal["type"];
  for (const key of Object.keys(a)) {
    if (!FIELDS[t].includes(key)) {
      throw bad(`a ${t} proposal has no field "${key}"`);
    }
  }
  const pid = `p${n}`;
  const to = chat(a.chat);
  if (t === "send") {
    const body = text(a.text, mask);
    const topic =
      a.topic === undefined || a.topic === null
        ? undefined
        : id(a.topic, "topic");
    return {
      id: pid,
      type: t,
      confirm: true,
      stdin: body,
      argv: ["send", to, "-", ...(topic ? ["--topic", String(topic)] : [])],
      summary: `Send to ${to}${topic ? ` (topic ${topic})` : ""}: ${JSON.stringify(clip(oneLine(body)))}`,
    };
  }
  const msgId = id(a.msgId, "msgId");
  if (t === "reply") {
    const body = text(a.text, mask);
    // A reply lands where the message is: the topic needs no flag of its own
    if (a.topic !== undefined && a.topic !== null) {
      id(a.topic, "topic");
    }
    return {
      id: pid,
      type: t,
      confirm: true,
      stdin: body,
      argv: ["reply", to, String(msgId), "-"],
      summary: `Reply in ${to} to message ${msgId}: ${JSON.stringify(clip(oneLine(body)))}`,
    };
  }
  const e = emoji(a.emoji);
  return {
    id: pid,
    type: t,
    confirm: true,
    argv: ["react", to, String(msgId), e],
    summary: `React in ${to} to message ${msgId} with ${oneLine(e)}`,
  };
}
