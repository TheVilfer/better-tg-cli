import { InvalidArgumentError, Option } from 'commander';
import { parseTimeOffset } from './time.js';

/**
 * Parsers for commander options and arguments. They run while the command line is parsed, before
 * the action and so before the write guard: a bad value exits 2 (usage) and never costs an
 * approval, and never turns into a silent default or an empty result.
 */

const WHOLE = /^\s*\d+\s*$/;

/** A whole number >= 1: limits, message IDs, topic IDs. */
export function positiveInt(value: string): number {
  if (!WHOLE.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
    throw new InvalidArgumentError('Expected a positive whole number.');
  }
  return Number(value);
}

/** A whole number >= 0: preview lengths, where 0 means "none". */
export function nonNegativeInt(value: string): number {
  if (!WHOLE.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new InvalidArgumentError('Expected a whole number, 0 or more.');
  }
  return Number(value);
}

/** One message ID, or several separated by commas or spaces ("123,124"); every one must parse. */
export function messageIdList(value: string, previous?: number[]): number[] {
  const parts = value.split(/[\s,]+/).filter(Boolean);
  if (!parts.length) throw new InvalidArgumentError('Expected message IDs like 123 or 123,124.');
  const ids = parts.map(p => {
    if (!WHOLE.test(p) || Number(p) < 1) throw new InvalidArgumentError(`Expected message IDs like 123 or 123,124; "${p}" is not one.`);
    return Number(p);
  });
  return [...(previous ?? []), ...ids];
}

/** For a variadic argument: each value through `parse`, collected into one array. */
export function eachOf<T>(parse: (value: string) => T): (value: string, previous?: T[]) => T[] {
  return (value, previous) => [...(previous ?? []), parse(value)];
}

/** A time for --since/--until: checked now, kept as text so it is resolved against "now" later. */
export function timeArg(value: string): string {
  try {
    parseTimeOffset(value);
  } catch (error) {
    throw new InvalidArgumentError((error as Error).message);
  }
  return value;
}

/** An option whose value must be one of `values` (commander lists them on a mismatch). */
export function choiceOption(flags: string, description: string, values: readonly string[]): Option {
  return new Option(flags, description).choices(values);
}
