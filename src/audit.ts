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
}


export function auditLog(entry: AuditEntry): void {
  try {
    const dir = configDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    appendFileSync(configFile('audit.jsonl'), JSON.stringify(entry) + '\n', { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Never throw — audit failures must not break the caller
  }
}
