/**
 * "30m", "1h", "7d", "2w" back from now, or an absolute date ("2026-09-01", "2026-09-01T12:00").
 * A value that computes to no real date ("999999999999999999d") is an error, never "Invalid Date".
 */
export function parseTimeOffset(offset: string): Date {
  const date = computeTimeOffset(offset);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid time: ${offset} is out of range`);
  }
  return date;
}

function computeTimeOffset(offset: string): Date {
  const now = new Date();
  const match = offset.match(/^(\d+)([mhdw])$/);
  if (!match) {
    // Absolute dates: "2026-09-01", "2026-09-01T12:00"
    const abs = Date.parse(offset);
    if (!Number.isNaN(abs)) {
      return new Date(abs);
    }
    throw new Error(
      `Invalid time: ${offset}. Use "30m", "1h", "7d", "2w" or a date like "2026-09-01"`
    );
  }
  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "m": {
      return new Date(now.getTime() - value * 60 * 1000);
    }
    case "h": {
      return new Date(now.getTime() - value * 60 * 60 * 1000);
    }
    case "d": {
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    }
    case "w": {
      return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
    }
    default: {
      throw new Error(`Unknown time unit: ${unit}`);
    }
  }
}
