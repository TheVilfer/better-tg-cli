import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A fake `op` binary: nothing is spawned, the real 1Password is never touched
const op = vi.hoisted(() => ({
  read: { status: 1, stdout: '', stderr: '[ERROR] something' } as { status: number | null; stdout: string; stderr: string; error?: Error },
  calls: [] as string[][],
}));
vi.mock('node:child_process', async orig => ({
  ...(await orig<typeof import('node:child_process')>()),
  execSync: () => '/fake/op\n',
  execFileSync: () => '', // `op whoami`
  spawnSync: (_bin: string, args: string[]) => {
    op.calls.push(args);
    return op.read;
  },
}));

const saved = { ...process.env };
beforeEach(() => {
  process.env.OP_SERVICE_ACCOUNT_TOKEN = 'ops_fake';
  process.env.TG_OP_VAULT = 'Vault';
  process.env.TG_PROFILE = `test-opstrict-${process.pid}`;
  op.calls = [];
  vi.resetModules();
});
afterEach(() => { process.env = { ...saved }; });

const missing = () => `[ERROR] 2026/11/19 could not read secret: "tg-cli-test-opstrict-${process.pid}-sessionString" isn't an item in the "Vault" vault. Specify the item with its UUID, name, or domain.`;

describe('opGetStrict: one `op read`, and "missing" only when nothing else could be used', () => {
  it('returns the value of a successful read', async () => {
    op.read = { status: 0, stdout: 'session-A\n', stderr: '' };
    const { opGetStrict } = await import('../src/onepassword.js');
    expect(opGetStrict('sessionString')).toEqual({ ok: true, value: 'session-A' });
    expect(op.calls).toEqual([['read', `op://Vault/tg-cli-test-opstrict-${process.pid}-sessionString/credential`]]);
  });

  it('"isn\'t an item" with no file copy → missing (a first login, after logout, an invite profile)', async () => {
    op.read = { status: 1, stdout: '', stderr: missing() };
    const { opGetStrict } = await import('../src/onepassword.js');
    expect(opGetStrict('sessionString', false)).toEqual({ ok: true, value: null });
    expect(op.calls).toHaveLength(1); // no vault listing
  });

  it('"isn\'t an item" while config.json5 holds the key → a failed read, never the file copy', async () => {
    op.read = { status: 1, stdout: '', stderr: missing() };
    const { opGetStrict } = await import('../src/onepassword.js');
    expect(opGetStrict('sessionString', true)).toEqual({ ok: false, reason: '1Password read failed (exit 1)' });
  });

  it('any other failure (network, auth, rate limit) → a failed read, with no op output in the reason', async () => {
    op.read = { status: 1, stdout: 'partial-secret', stderr: '[ERROR] connection reset' };
    const { opGetStrict } = await import('../src/onepassword.js');
    const r = opGetStrict('sessionString', false);
    expect(r).toEqual({ ok: false, reason: '1Password read failed (exit 1)' });
  });

  it('a spawn error or timeout → a failed read', async () => {
    op.read = { status: null, stdout: '', stderr: missing(), error: new Error('spawnSync op ETIMEDOUT') };
    const { opGetStrict } = await import('../src/onepassword.js');
    expect(opGetStrict('sessionString', false)).toEqual({ ok: false, reason: '1Password read failed (exit none)' });
  });
});
