/**
 * Which backend answers a plugin's `http.fetch` (http.ts):
 *   - a backend a test injected (`httpDeps.backend`);
 *   - `plugin dev --mock`: the plugin folder's `dev/fixtures/*.json`;
 *   - TG_MOCK: `mock-http/*.json` in the mock plugin home (nothing reaches the network, as nothing
 *     reaches Telegram);
 *   - VITEST otherwise: refused (no test opens a socket by accident);
 *   - the network: resolve once, check the IP, connect to it (systemNet).
 */
import { CliError, EXIT } from '../errors.js';
import { isMock } from '../paths.js';
import { fixtureBackend, networkBackend, parseFixtures, refusingBackend, systemNet, type Backend, type Fixture } from './http.js';
import { anchor, listDir, readRegular, UnsafePath } from './safe-fs.js';
import { pluginHome } from './store.js';

export const httpDeps: { backend?: Backend } = {};

const FIXTURE_FILES = 200;
const FIXTURE_BYTES = 2 * 1024 * 1024;

/** Every `*.json` of `rel` below `root`: regular files only (no link is followed), each bounded. */
export function readFixtureDir(root: string, rel: string, label: string): Fixture[] {
  let entries;
  try {
    entries = listDir(root, rel);
  } catch (e) {
    if (e instanceof UnsafePath) throw new CliError(`${label}: ${rel} is not a plain folder (${e.message})`, 'invalid_argument', EXIT.USAGE);
    throw e;
  }
  const files = entries.filter(e => e.name.endsWith('.json')).sort((a, b) => (a.name < b.name ? -1 : 1));
  if (files.length > FIXTURE_FILES) throw new CliError(`${label}: more than ${FIXTURE_FILES} fixture files in ${rel}`, 'invalid_argument', EXIT.USAGE);
  const out: Fixture[] = [];
  for (const f of files) {
    if (f.kind !== 'file') throw new CliError(`${label}: ${rel}/${f.name} is not a regular file (links are not followed)`, 'invalid_argument', EXIT.USAGE);
    let bytes: Uint8Array | undefined;
    try {
      bytes = readRegular(root, `${rel}/${f.name}`, { maxBytes: FIXTURE_BYTES, singleLink: true });
    } catch (e) {
      if (e instanceof UnsafePath) throw new CliError(`${label}: ${rel}/${f.name} cannot be read safely (${e.message})`, 'invalid_argument', EXIT.USAGE);
      throw e;
    }
    if (!bytes) continue;
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw new CliError(`${label}: ${rel}/${f.name} is not JSON: ${(e as Error).message}`, 'invalid_argument', EXIT.USAGE);
    }
    try {
      out.push(...parseFixtures(json, `${rel}/${f.name}`));
    } catch (e) {
      throw new CliError(`${label}: ${(e as Error).message}`, 'invalid_argument', EXIT.USAGE);
    }
  }
  return out;
}

/** `plugin dev --mock`: the folder's `dev/fixtures/*.json` (not part of the plugin's files or revision). */
export function devBackend(dir: string): Backend {
  if (httpDeps.backend) return httpDeps.backend;
  return fixtureBackend(readFixtureDir(anchor(dir), 'dev/fixtures', 'plugin dev'), 'dev');
}

/** The backend of `plugin run`. */
export function runBackend(): Backend {
  if (httpDeps.backend) return httpDeps.backend;
  if (isMock()) {
    let root: string | undefined;
    try {
      root = anchor(pluginHome());
    } catch {
      root = undefined;
    }
    return fixtureBackend(root ? readFixtureDir(root, 'mock-http', 'mock HTTP') : [], 'mock (TG_MOCK)');
  }
  if (process.env.VITEST) return refusingBackend;
  return networkBackend(systemNet());
}
