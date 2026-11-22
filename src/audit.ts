import { appendFileSync, existsSync, mkdirSync } from "node:fs";

import { configDir, configFile } from "./paths.js";

/**
 * - `writeMode`: Set by the write guard: the profile's mode and, in "ask" mode, how this write was approved
 * - `unprotected`: No secret store: the mode lives in a plain file the agent could edit (src/write-store.ts)
 * - `plugin`: Plugin management, `plugin data` and `plugin run` (src/commands/plugin.ts): names, revision, sizes, API names and proposal types only, never a value, an input, a result, a body or a secret.
 * - `result.reason`: a plugin change the human confirmed that did not happen: why, in one line (never a secret).
 * - `plugin.fromVersion`, `fromRevision`, `newlyAccepted`, `secretsReset`: `plugin update`: the revision it left, what the human accepted anew, the secret names it deleted (never a value).
 * - `plugin.via`: how the human was asked: a terminal or system dialog, or the MCP client's dialog.
 */
export interface AuditEntry {
  timestamp: string;
  command: string;
  target: string;
  message?: string;
  replyToMsgId?: number;
  kickedUser?: string;
  targetUser?: string;
  result: {
    success: boolean;
    messageId?: number;
    error?: string;
    reason?: string;
  };
  writeMode?: "ask" | "on";
  approvedVia?: "chat" | "elicitation";
  unprotected?: true;
  plugin?: {
    name: string;
    version?: string;
    revision?: string;
    installId?: string;
    source?: string;
    key?: string;
    bytes?: number;
    keepData?: boolean;
    command?: string;
    apis?: string[];
    proposals?: string[];
    network?: { requests: number; origins: string[] };
    fromVersion?: string;
    fromRevision?: string;
    newlyAccepted?: {
      permissions: string[];
      effects: string[];
      network: string[];
      secrets: string[];
    };
    secretsReset?: string[];
    via?: "terminal" | "mcp";
  };
}

let writeContext: Pick<
  AuditEntry,
  "writeMode" | "approvedVia" | "unprotected"
> = {};

/** Called by assertWriteEnabled(); every audit entry of this process records it. */
export function setWriteContext(
  context: Pick<AuditEntry, "writeMode" | "approvedVia" | "unprotected">
): void {
  writeContext = context;
}

export function auditLog(entry: AuditEntry): void {
  try {
    const dir = configDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    appendFileSync(
      configFile("audit.jsonl"),
      `${JSON.stringify({ ...entry, ...writeContext })}\n`,
      { encoding: "utf-8", mode: 0o600 }
    );
  } catch {}
}
