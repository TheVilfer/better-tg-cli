import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// `telegram update` for an install.sh binary with a newer release out: it must print the
// install.sh re-run, never "replace <path>" (that would break binarySha256 in install.json).
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'btg-update-')));
const bin = join(dir, 'telegram');
writeFileSync(bin, 'bin');
writeFileSync(join(dir, 'install.json'), `${JSON.stringify({ schema: 1, package: 'better-tg-cli', manager: 'user-binary', path: bin })}\n`);

vi.mock('../src/update.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/update.js')>();
  return {
    ...real,
    // The real detection, as the compiled binary at `bin` would run it
    detectInstall: () => real.detectInstall(bin, '', true),
    fetchLatestVersion: async () => '999.0.0',
    writeCache: () => {},
  };
});

afterEach(() => vi.restoreAllMocks());

describe('telegram update on an install.sh binary', () => {
  it('tells to run install.sh again and changes nothing', async () => {
    const { updateCommand } = await import('../src/commands/update.js');
    const err: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((m: string) => { err.push(m); });
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`exit ${code}`); }) as never);
    await expect(updateCommand.parseAsync([], { from: 'user' })).rejects.toThrow('exit 1');
    expect(err.join('\n')).toContain(`releases/latest/download/install.sh | TG_INSTALL_DIR='${dir}' sh`);
    expect(err.join('\n')).not.toMatch(/replace/);
  });
});
