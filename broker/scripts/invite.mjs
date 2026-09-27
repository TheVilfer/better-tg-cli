#!/usr/bin/env node
// Manage broker invites via wrangler (no admin HTTP endpoint exists on purpose).
//   node scripts/invite.mjs create <name> [--max-uses 3]   → prints the token ONCE
//   node scripts/invite.mjs list
//   node scripts/invite.mjs revoke <name>
//   node scripts/invite.mjs revoke-all                       → every active invite
//   node scripts/invite.mjs panic                            → stop handing out keys at once (see README)
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = dirname(dirname(fileURLToPath(import.meta.url)));
const wrangler = (...args) =>
  execFileSync('npx', ['--yes', 'wrangler@latest', 'kv', ...args, '--binding', 'INVITES', '--remote'], {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
const put = (key, value) => wrangler('key', 'put', key, value);
const get = key => {
  try {
    return JSON.parse(wrangler('key', 'get', key, '--text'));
  } catch {
    return null;
  }
};
const keys = () => JSON.parse(wrangler('key', 'list', '--prefix', 'invite:')).map(k => k.name);

const [cmd, name, ...rest] = process.argv.slice(2);

if (cmd === 'create' && name) {
  const i = rest.indexOf('--max-uses');
  const maxUses = i >= 0 ? parseInt(rest[i + 1], 10) : 3;
  const token = 'tgi_' + randomBytes(32).toString('base64url');
  const key = `invite:${createHash('sha256').update(token).digest('hex')}`;
  const record = { name, createdAt: new Date().toISOString(), uses: 0, maxUses };
  put(key, JSON.stringify(record));
  if (get(key)?.name !== name) throw new Error('Write did not read back from remote KV');
  console.log(`Invite for "${name}" (max ${maxUses} logins). Shown once, send it privately:\n\n${token}\n`);
  console.log(`They run: telegram auth --invite   (and paste the token when asked)`);
} else if (cmd === 'list') {
  for (const key of keys()) {
    const r = get(key);
    if (!r) continue;
    const state = r.revoked ? 'revoked' : r.uses >= r.maxUses ? 'used up' : 'active';
    console.log(`${r.name}\t${state}\tuses ${r.uses}/${r.maxUses}\tcreated ${r.createdAt.slice(0, 10)}\tlast ${r.lastUsedAt?.slice(0, 16) ?? '-'}\t${key.slice(7, 19)}`);
  }
} else if (cmd === 'revoke' && name) {
  let n = 0;
  for (const key of keys()) {
    const r = get(key);
    if (r && (r.name === name || key.slice(7).startsWith(name)) && !r.revoked) {
      put(key, JSON.stringify({ ...r, revoked: true, revokedAt: new Date().toISOString() }));
      n++;
    }
  }
  console.log(n ? `Revoked ${n} invite(s) for "${name}".` : `No active invite matches "${name}".`);
} else if (cmd === 'revoke-all') {
  let n = 0;
  for (const key of keys()) {
    const r = get(key);
    if (r && !r.revoked) {
      put(key, JSON.stringify({ ...r, revoked: true, revokedAt: new Date().toISOString() }));
      n++;
    }
  }
  console.log(`Revoked ${n} active invite(s).`);
} else if (cmd === 'panic') {
  // Without API_HASH the worker answers 503 broker_not_configured before touching KV,
  // so no invite can hand out keys until the secret is put back.
  execFileSync('npx', ['--yes', 'wrangler@latest', 'secret', 'delete', 'API_HASH'], { cwd, input: 'y\n', stdio: ['pipe', 'inherit', 'inherit'] });
  console.log('Broker disabled: it now answers 503 to every invite. Restore with: npx wrangler secret put API_HASH');
} else {
  console.log('Usage: invite.mjs create <name> [--max-uses N] | list | revoke <name|hash-prefix> | revoke-all | panic');
  process.exit(1);
}
