import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A fake `op` binary: nothing is spawned, the real 1Password is never touched
const op = vi.hoisted(() => ({
  read: { status: 1, stdout: '', stderr: '[ERROR] something' } as { status: number | null; stdout: string; stderr: string; error?: Error },
  list: { status: 0, stdout: '[]', stderr: '' } as { status: number | null; stdout: string; stderr: string; error?: Error },
  calls: [] as string[][],
}));
vi.mock('node:child_process', async orig => ({
  ...(await orig<typeof import('node:child_process')>()),
  execSync: () => '/fake/op\n',
  execFileSync: () => '', // `op whoami`
  spawnSync: (_bin: string, args: string[]) => {
    op.calls.push(args);
    return args[0] === 'read' ? op.read : op.list;
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

const name = () => `tg-cli-test-opstrict-${process.pid}-sessionString`;

describe('opGetStrict: a failed `op read` is "missing" only when the vault listing says so', () => {
  it('returns the value of a successful read', async () => {
    op.read = { status: 0, stdout: 'session-A\n', stderr: '' };
    const { opGetStrict } = await import('../src/onepassword.js');
    expect(opGetStrict('sessionString')).toEqual({ ok: true, value: 'session-A' });
    expect(op.calls).toHaveLength(1);
  });

  it('no item of that name in a vault that lists fine → missing', async () => {
    op.read = { status: 1, stdout: '', stderr: '[ERROR] whatever the wording is' };
    op.list = { status: 0, stdout: JSON.stringify([{ title: 'unrelated' }]), stderr: '' };
    const { opGetStrict } = await import('../src/onepassword.js');
    expect(opGetStrict('sessionString')).toEqual({ ok: true, value: null });
    expect(op.calls[1]).toEqual(['item', 'list', '--vault', 'Vault', '--format', 'json']);
  });

  it('the listing fails too (network, auth, rate limit) → a failed read, not missing', async () => {
    op.read = { status: 1, stdout: '', stderr: '[ERROR] connection reset' };
    op.list = { status: 1, stdout: '', stderr: '[ERROR] connection reset' };
    const { opGetStrict } = await import('../src/onepassword.js');
    const r = opGetStrict('sessionString');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/1Password read failed \(exit 1: \[ERROR\] connection reset\)/);
  });

  it('the item is listed but its read failed → a failed read', async () => {
    op.read = { status: 1, stdout: '', stderr: '[ERROR] rate limited' };
    op.list = { status: 0, stdout: JSON.stringify([{ title: name() }]), stderr: '' };
    const { opGetStrict } = await import('../src/onepassword.js');
    expect(opGetStrict('sessionString').ok).toBe(false);
  });

  it('a listing that is not a JSON array → a failed read', async () => {
    op.read = { status: 1, stdout: '', stderr: '' };
    op.list = { status: 0, stdout: 'not json', stderr: '' };
    const { opGetStrict } = await import('../src/onepassword.js');
    expect(opGetStrict('sessionString').ok).toBe(false);
  });
});
