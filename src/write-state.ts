/**
 * Write mode of a profile, stored in the secret store as `writeEnabled`:
 * - missing             → read-only (the default): every write is refused;
 * - "ask" / "ask:until:<unix seconds>" → ask: each write waits for the user's approval of that
 *   exact action (see src/approval.ts);
 * - "true" / "until:<unix seconds>"    → on: writes go through without asking.
 * The two older values ("true", "until:N") keep their meaning, so existing installs don't change.
 */
export type WriteMode = 'read-only' | 'ask' | 'on';

export interface WriteState {
  mode: WriteMode;
  /** Writes are possible at all (ask or on) */
  enabled: boolean;
  until?: Date;
  /** A time-limited mode ran out; the profile is read-only again */
  expired?: boolean;
}

export function parseWriteState(value: string | null | undefined, now = Date.now()): WriteState {
  if (value === 'true') return { mode: 'on', enabled: true };
  if (value === 'ask') return { mode: 'ask', enabled: true };
  const m = value?.match(/^(ask:)?until:(\d+)$/);
  if (m) {
    const until = new Date(parseInt(m[2], 10) * 1000);
    const mode: WriteMode = m[1] ? 'ask' : 'on';
    return until.getTime() > now ? { mode, enabled: true, until } : { mode: 'read-only', enabled: false, until, expired: true };
  }
  return { mode: 'read-only', enabled: false };
}

/** "30m" / "2h" / "1d" / "1w" → seconds. */
export function parseForDuration(value: string): number {
  const m = value.match(/^(\d+)([mhdw])$/);
  if (!m || parseInt(m[1], 10) <= 0) throw new Error(`Invalid --for "${value}". Use e.g. 30m, 2h, 1d, 1w`);
  const mult = { m: 60, h: 3600, d: 86400, w: 604800 }[m[2] as 'm' | 'h' | 'd' | 'w'];
  return parseInt(m[1], 10) * mult;
}

/** The stored value for "on" (default) or "ask", optionally ending after `forSeconds`. */
export function encodeWriteState(forSeconds?: number, now = Date.now(), mode: Exclude<WriteMode, 'read-only'> = 'on'): string {
  const prefix = mode === 'ask' ? 'ask' : '';
  if (!forSeconds) return mode === 'ask' ? 'ask' : 'true';
  return `${prefix ? `${prefix}:` : ''}until:${Math.floor(now / 1000) + forSeconds}`;
}

/** One line for status output: "on", "ask until …", "read-only (expired …)". */
export function describeWriteState(state: WriteState): string {
  const until = state.until ? ` until ${state.until.toLocaleString()}` : '';
  if (state.mode === 'on') return `on (writes go through without asking)${until}`;
  if (state.mode === 'ask') return `ask (each write waits for the user's approval)${until}`;
  return state.expired ? `read-only (the last mode expired ${state.until!.toLocaleString()})` : 'read-only';
}
