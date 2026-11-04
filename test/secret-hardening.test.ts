import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

// A fake `op`: items live in a JSON file, every call's argv goes to a log
const FAKE_OP = `#!/usr/bin/env node
const fs = require('fs');
const dir = process.env.FAKE_OP_DIR;
const args = process.argv.slice(2);
fs.appendFileSync(dir + '/argv.log', JSON.stringify(args) + '\\n');
const db = fs.existsSync(dir + '/items.json') ? JSON.parse(fs.readFileSync(dir + '/items.json', 'utf8')) : {};
const save = () => fs.writeFileSync(dir + '/items.json', JSON.stringify(db));
const stdin = () => fs.readFileSync(0, 'utf8');
if (args[0] === 'whoami') process.exit(0);
if (args[0] === 'read') {
  const name = args[1].split('/')[3];
  const f = db[name] && db[name].fields.find(f => f.id === 'credential');
  if (!f) process.exit(1);
  process.stdout.write(f.value + '\\n');
  process.exit(0);
}
if (args[0] === 'item' && args[1] === 'get') {
  if (!db[args[2]]) process.exit(1);
  process.stdout.write(JSON.stringify(db[args[2]]));
  process.exit(0);
}
if (args[0] === 'item' && args[1] === 'create' && args.includes('-')) {
  const item = JSON.parse(stdin());
  db[item.title] = item; save(); process.exit(0);
}
if (args[0] === 'item' && args[1] === 'edit') {
  db[args[2]] = { ...JSON.parse(stdin()), title: args[2] }; save(); process.exit(0);
}
process.exit(2);
`;

describe.skipIf(process.platform === 'win32')('1Password store', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tg-fake-op-'));
  const saved = { ...process.env };
  afterAll(() => { process.env = saved; rmSync(dir, { recursive: true, force: true }); });

  it('never passes the secret as an argument to op', async () => {
    writeFileSync(join(dir, 'op'), FAKE_OP);
    chmodSync(join(dir, 'op'), 0o755);
    Object.assign(process.env, {
      PATH: `${dir}${delimiter}${process.env.PATH}`, FAKE_OP_DIR: dir,
      OP_SERVICE_ACCOUNT_TOKEN: 'ops_test', TG_OP_VAULT: 'vault', TG_PROFILE: 'op-test',
    });
    vi.resetModules();
    const { opGet, opSet } = await import('../src/onepassword.js');

    expect(opSet('session', 'first-secret-value')).toBe(true); // create
    expect(opGet('session')).toBe('first-secret-value');
    expect(opSet('session', 'second-secret-value')).toBe(true); // edit
    expect(opGet('session')).toBe('second-secret-value');

    const argv = readFileSync(join(dir, 'argv.log'), 'utf8');
    expect(argv).toMatch(/"create"/);
    expect(argv).toMatch(/"edit"/);
    expect(argv).not.toMatch(/secret-value/);
  });
});

const store = vi.hoisted(() => ({ get: [] as (string | null)[], set: false }));
vi.mock('../src/secrets.js', () => ({
  isSecretStoreAvailable: () => true,
  secretGet: () => store.get.shift() ?? null,
  secretSet: () => store.set,
}));

describe('MCP HTTP token', () => {
  beforeEach(() => { store.get = []; store.set = false; });

  it('serves the token another server stored at the same moment', async () => {
    const { mcpToken } = await import('../src/mcp-http.js');
    // Nothing yet → this server's write loses → the other server's token is in the store
    store.get = [null, 'tgmcp_other'];
    store.set = false;
    expect(mcpToken({ create: true })).toBe('tgmcp_other');
  });

  it('returns its own token when the write succeeds, and null when nothing is stored', async () => {
    const { mcpToken } = await import('../src/mcp-http.js');
    store.get = [null, null];
    store.set = true;
    expect(mcpToken({ create: true })).toMatch(/^tgmcp_/);
    store.get = [null, null];
    store.set = false;
    expect(mcpToken({ create: true })).toBeNull();
  });

  it('a failed rotation reports failure instead of the old token', async () => {
    const { mcpToken } = await import('../src/mcp-http.js');
    store.get = ['tgmcp_old'];
    store.set = false;
    expect(mcpToken({ rotate: true })).toBeNull();
    store.get = ['tgmcp_old'];
    store.set = true; // claims success, but the store still holds the old one
    expect(mcpToken({ rotate: true })).toBeNull();
  });
});
