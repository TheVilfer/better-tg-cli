import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { configDir, configFile } from './paths.js';

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
  };
  /** Set by the write guard: the profile's mode and, in "ask" mode, how this write was approved */
  writeMode?: 'ask' | 'on';
  approvedVia?: 'chat' | 'elicitation';
  /** No secret store: the mode lives in a plain file the agent could edit (src/write-store.ts) */
  unprotected?: true;
  /**
   * Plugin management, `plugin data` and `plugin run` (src/commands/plugin.ts): names, revision,
   * sizes, API names and proposal types only, never a value, an input, a result, a body or a secret.
   */
  plugin?: {
    name: string; version?: string; revision?: string; installId?: string; source?: string; key?: string; bytes?: number; keepData?: boolean;
    /** `plugin run`: the command, the host API names it called (each once) and the proposal types it returned */
    command?: string; apis?: string[]; proposals?: string[];
  };
}

let writeContext: Pick<AuditEntry, 'writeMode' | 'approvedVia' | 'unprotected'> = {};

/** Called by assertWriteEnabled(); every audit entry of this process records it. */
export function setWriteContext(context: Pick<AuditEntry, 'writeMode' | 'approvedVia' | 'unprotected'>): void {
  writeContext = context;
}


export function auditLog(entry: AuditEntry): void {
  try {
    const dir = configDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    appendFileSync(configFile('audit.jsonl'), JSON.stringify({ ...entry, ...writeContext }) + '\n', { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Never throw — audit failures must not break the caller
  }
}
