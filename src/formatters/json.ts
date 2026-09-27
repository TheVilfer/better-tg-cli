import { isTTY } from '../spinner.js';

const pretty = isTTY || process.env.TG_JSON_PRETTY === '1';

/** Keys that must always be present so jq filters like `.text | test(...)` don't hit null. */
const ALWAYS_KEEP = new Set(['', 'text', 'title', 'sender']);

/** Drop null/undefined/empty-string optional fields: absent means "none". Arrays are kept. */
function prune(key: string, value: unknown): unknown {
  if (!ALWAYS_KEEP.has(key) && (value === null || value === undefined || value === '')) return undefined;
  return value;
}

/** Compact JSON off a TTY (agents, pipes); pretty on a terminal or with TG_JSON_PRETTY=1. */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, prune, pretty ? 2 : undefined);
}
