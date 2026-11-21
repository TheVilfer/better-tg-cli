import { createHash } from 'node:crypto';
import { CliError, EXIT } from '../errors.js';
import { KEY_RE, type Manifest } from './manifest.js';

/**
 * Generations of plugin secrets (docs/plugins.md §6): a stored value belongs to one inject rule of
 * its secret (origin, paths, header, format), named by a hash of that rule. Kept apart from
 * secrets.ts, which needs the plugin store, so the store can pin generations in the registry.
 */

export type SecretDecl = NonNullable<Manifest['secrets']>[number];

/** One stored value: a declared secret at one generation of its inject rule. */
export interface SecretSlot { name: string; gen: string }

export const GEN_RE = /^[0-9a-f]{16}$/;

/** The generation of a secret's inject rule: the same rule, the same id (the value carries over an update). */
export function secretGeneration(d: SecretDecl): string {
  const rule = ['tg-plugin-secret-rule/1', d.inject.origin, d.inject.paths === undefined ? null : [...d.inject.paths], d.inject.header, d.inject.format ?? null];
  return createHash('sha256').update(JSON.stringify(rule)).digest('hex').slice(0, 16);
}

export const slotOf = (d: SecretDecl): SecretSlot => ({ name: d.name, gen: secretGeneration(d) });

/** The generation of every secret a manifest declares, by name (what the registry entry pins). */
export function secretGenerations(m: Manifest): Record<string, string> {
  const out = Object.create(null) as Record<string, string>;
  for (const d of m.secrets ?? []) out[d.name] = secretGeneration(d);
  return out;
}

/** The declared secret `name` of a manifest at its generation. */
export function slotIn(m: Manifest, name: string): SecretSlot {
  const d = (m.secrets ?? []).find(x => x.name === name);
  if (!d) throw new CliError(`Plugin "${m.name}" has no secret "${name}"`, 'invalid_argument', EXIT.USAGE);
  return slotOf(d);
}

/** A slot as a pending-cleanup record keeps it: `name:gen` (a bare name: an install made before generations). */
export const slotText = (s: SecretSlot | { name: string; gen?: string }): string => (s.gen ? `${s.name}:${s.gen}` : s.name);
export function parseSlotText(t: string): { name: string; gen?: string } | undefined {
  const i = t.lastIndexOf(':');
  const name = i < 0 ? t : t.slice(0, i);
  const gen = i < 0 ? undefined : t.slice(i + 1);
  if (!KEY_RE.test(name) || (gen !== undefined && !GEN_RE.test(gen))) return undefined;
  return { name, ...(gen ? { gen } : {}) };
}

