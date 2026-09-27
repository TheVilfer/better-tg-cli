/** Stored `writeEnabled` value: "true" (until turned off) or "until:<unix seconds>". */
export interface WriteState {
  enabled: boolean;
  until?: Date;
  expired?: boolean;
}

export function parseWriteState(value: string | null | undefined, now = Date.now()): WriteState {
  if (value === 'true') return { enabled: true };
  const m = value?.match(/^until:(\d+)$/);
  if (m) {
    const until = new Date(parseInt(m[1], 10) * 1000);
    return until.getTime() > now ? { enabled: true, until } : { enabled: false, until, expired: true };
  }
  return { enabled: false };
}

/** "30m" / "2h" / "1d" / "1w" → seconds. */
export function parseForDuration(value: string): number {
  const m = value.match(/^(\d+)([mhdw])$/);
  if (!m || parseInt(m[1], 10) <= 0) throw new Error(`Invalid --for "${value}". Use e.g. 30m, 2h, 1d, 1w`);
  const mult = { m: 60, h: 3600, d: 86400, w: 604800 }[m[2] as 'm' | 'h' | 'd' | 'w'];
  return parseInt(m[1], 10) * mult;
}

export function encodeWriteState(forSeconds?: number, now = Date.now()): string {
  return forSeconds ? `until:${Math.floor(now / 1000) + forSeconds}` : 'true';
}
