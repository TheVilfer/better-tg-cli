import { InvalidArgumentError, Option } from 'commander';
import { parseTimeOffset } from './time.js';

/**
 * Parsers for commander options and arguments. They run while the command line is parsed, before
 * the action and so before the write guard: a bad value exits 2 (usage) and never costs an
 * approval, and never turns into a silent default or an empty result.
 */

const WHOLE = /^\s*\d+\s*$/;

/**
 * The largest value these numbers may have: message, topic and story IDs, limits and offsets are
 * 32-bit `int` fields in Telegram's API, so anything bigger would be sent as some other number.
 */
export const INT32_MAX = 2147483647;

/** A whole number >= 1 that fits an `int`: limits, message IDs, topic IDs. */
export function positiveInt(value: string): number {
  if (!WHOLE.test(value) || Number(value) < 1 || Number(value) > INT32_MAX) {
    throw new InvalidArgumentError(`Expected a positive whole number up to ${INT32_MAX}.`);
  }
  return Number(value);
}

/** A whole number >= 0 that fits an `int`: preview lengths, where 0 means "none". */
export function nonNegativeInt(value: string): number {
  if (!WHOLE.test(value) || Number(value) > INT32_MAX) {
    throw new InvalidArgumentError(`Expected a whole number, 0 or more, up to ${INT32_MAX}.`);
  }
  return Number(value);
}

/** One message ID, or several separated by commas or spaces ("123,124"); every one must parse. */
export function messageIdList(value: string, previous?: number[]): number[] {
  const parts = value.split(/[\s,]+/).filter(Boolean);
  if (!parts.length) throw new InvalidArgumentError('Expected message IDs like 123 or 123,124.');
  // The same check as a single ID: a value past the int range would silently become another ID
  const ids = parts.map(p => {
    if (!WHOLE.test(p) || Number(p) < 1 || Number(p) > INT32_MAX) throw new InvalidArgumentError(`Expected message IDs like 123 or 123,124; "${p}" is not one.`);
    return Number(p);
  });
  return [...(previous ?? []), ...ids];
}

/** For a variadic argument: each value through `parse`, collected into one array. */
export function eachOf<T>(parse: (value: string) => T): (value: string, previous?: T[]) => T[] {
  return (value, previous) => [...(previous ?? []), parse(value)];
}

/**
 * A value checked now by `check` (which throws on a bad one) and kept as text, for values resolved
 * later against "now" (durations, times): the command line fails at parse time, exit 2.
 */
export function checkedBy(check: (value: string) => unknown): (value: string) => string {
  return value => {
    try {
      check(value);
    } catch (error) {
      throw new InvalidArgumentError((error as Error).message);
    }
    return value;
  };
}

/** A time for --since/--until ("30m", "1h", "7d", "2w", "2026-09-01"). */
export const timeArg = checkedBy(parseTimeOffset);

/** An option whose value must be one of `values` (commander lists them on a mismatch). */
export function choiceOption(flags: string, description: string, values: readonly string[]): Option {
  return new Option(flags, description).choices(values);
}
