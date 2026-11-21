import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { secretPrefix } from './paths.js';
import type { StrictRead } from './keychain.js';
import { spawnAsync, type SpawnResult } from './spawn-async.js';

/**
 * Linux Secret Service (GNOME Keyring, KWallet, KeePassXC) through `secret-tool`
 * from libsecret-tools. Items: service=<tg-cli[-profile]>, account=<key>.
 */

let availableCache: boolean | null = null;

function run(args: string[], input?: string) {
  return spawnSync('secret-tool', args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10_000,
  });
}

export function isLibsecretAvailable(): boolean {
  if (availableCache !== null) return availableCache;
  if (platform() !== 'linux' || process.env.TG_NO_LIBSECRET) return (availableCache = false);
  // A lookup that finds nothing exits 1 silently; a missing binary, D-Bus session or
  // Secret Service exits with an error on stderr (or ENOENT).
  const probe = run(['lookup', 'service', `${secretPrefix()}-probe`, 'account', 'probe']);
  availableCache = !probe.error && (probe.status === 0 || (probe.status === 1 && !probe.stderr.trim()));
  return availableCache;
}

export function libsecretGet(key: string): string | null {
  const r = run(['lookup', 'service', secretPrefix(), 'account', key]);
  if (r.status !== 0 || r.error) return null;
  return r.stdout.replace(/\n$/, '') || null;
}

/** A lookup that finds nothing exits 1 with an empty stderr (see the probe); anything else failed. */
export function libsecretGetStrict(key: string): StrictRead {
  return libsecretRead(run(['lookup', 'service', secretPrefix(), 'account', key]));
}

/** libsecretGetStrict without blocking the event loop; `secret-tool` is killed when `signal` aborts. */
export async function libsecretGetStrictAsync(key: string, signal?: AbortSignal): Promise<StrictRead> {
  return libsecretRead(await spawnAsync('secret-tool', ['lookup', 'service', secretPrefix(), 'account', key], { timeout: 10_000, signal }));
}

function libsecretRead(r: SpawnResult): StrictRead {
  if (!r.error && r.status === 0) return { ok: true, value: r.stdout.replace(/\n$/, '') || null };
  if (!r.error && r.status === 1 && !r.stderr.trim()) return { ok: true, value: null };
  const why = (r.error?.message || r.stderr || '').trim().split('\n')[0];
  return { ok: false, reason: `Secret Service read failed (exit ${r.status ?? 'none'}${why ? `: ${why}` : ''})` };
}

export function libsecretSet(key: string, value: string): boolean {
  const r = run(['store', '--label', `${secretPrefix()} ${key}`, 'service', secretPrefix(), 'account', key], value);
  // Read back: some Secret Service backends accept the call but store nothing while locked
  return r.status === 0 && libsecretGet(key) === value;
}

export function libsecretDelete(key: string): boolean {
  const r = run(['clear', 'service', secretPrefix(), 'account', key]);
  return r.status === 0;
}
