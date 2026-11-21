import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join, resolve, sep } from 'node:path';
import { cliArgs } from './cli.js';

// Before any module under test is imported: a temp HOME and a mock account, so nothing here can
// reach a real profile, the Keychain (the mock keeps its registry key and secrets in files) or GitHub
const env = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'tg-plugin-manage-'));
  Object.assign(process.env, { HOME: root, USERPROFILE: root, APPDATA: join(root, 'AppData'), TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' });
  for (const k of ['TG_MOCK', 'TG_MOCK_ASK', 'TG_MOCK_HUMAN', 'TG_APPROVE', 'TG_MCP', 'TG_READ_ONLY']) delete process.env[k];
  return { root };
});

import { createElicitor, elicitApproved, handleManage, handleMessage, manageRequest, planCall, pluginExpectation, setKnownCommands } from '../src/mcp.js';
import { prepareAction } from '../src/approval-prepare.js';
import { dpapiDelete, dpapiDeps, dpapiGetStrict, dpapiGetStrictAsync, dpapiSet, dpapiStore, isDpapiAvailable } from '../src/dpapi.js';
import { sleepSync } from '../src/file-lock.js';
import { createRpcProcessor } from '../src/mcp-http.js';
import { applyPrepared, cleanupPendingSecrets, manageDeps, onPath, prepareInstall, prepareRemove, prepareUpdate, terminalCommand } from '../src/plugins/manage.js';
import { backendKeyStore, commitInstall, dataGet, dataSet, loadPlugin, pendingSecrets, pluginsRoot, readLock, storeDeps } from '../src/plugins/store.js';
import { backendStore, erasePluginSecret, getPluginSecret, getPluginSecretAsync, pluginSecretDeps, pluginSecretKey, setPluginSecret, slotIn } from '../src/plugins/secrets.js';
import { localPathProblem, parseSource, readLocalSnapshot, type Fetch } from '../src/plugins/source.js';
import { VERSION } from '../src/version.js';

const NET_LAB = resolve('test/fixtures/plugins/net-lab');
const TONE = resolve('test/fixtures/plugins/tone-of-voice');
afterAll(() => rmSync(env.root, { recursive: true, force: true }));

let n = 0;
let home: string;
beforeEach(() => {
  home = join(env.root, `h${++n}`);
  mkdirSync(home);
  Object.assign(process.env, { HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: join(home, 'mock-state.json') });
});
afterEach(() => {
  for (const k of ['TG_MOCK', 'TG_MOCK_ASK', 'TG_READ_ONLY', 'TG_PROFILE']) delete process.env[k];
  process.env.TG_PROFILE = '';
  delete storeDeps.afterSnapshot;
  delete pluginSecretDeps.store;
  delete manageDeps.fetch;
  delete manageDeps.onPath;
  delete manageDeps.platform;
});

type Json = Record<string, any>;

/** A copy of a fixture plugin in this test's home, with its manifest changed by `edit`. */
function pluginDir(from: string, edit: (m: Json) => void = () => {}, dir = join(home, `p${Math.random().toString(36).slice(2, 8)}`)): string {
  cpSync(from, dir, { recursive: true });
  const m = JSON.parse(readFileSync(join(dir, 'tg-plugin.json'), 'utf8'));
  edit(m);
  writeFileSync(join(dir, 'tg-plugin.json'), JSON.stringify(m, null, 2));
  return dir;
}
function rewrite(dir: string, edit: (m: Json) => void): void {
  const m = JSON.parse(readFileSync(join(dir, 'tg-plugin.json'), 'utf8'));
  edit(m);
  writeFileSync(join(dir, 'tg-plugin.json'), JSON.stringify(m, null, 2));
}
/** A change to the instructions only (SKILL.md keeps its frontmatter). */
const touchSkill = (dir: string, line = 'v2') => writeFileSync(join(dir, 'SKILL.md'), `${readFileSync(join(dir, 'SKILL.md'), 'utf8')}\n${line}\n`);

async function install(dir: string) {
  return applyPrepared(await prepareInstall(dir, undefined));
}
/** The mock profile's config folder as configDir() builds it for this HOME (APPDATA on Windows). */
const mockConfig = () => (process.platform === 'win32' ? join(home, 'AppData', 'tg-mock') : join(home, '.config', 'tg-mock'));
const audit = () => readFileSync(join(mockConfig(), 'audit.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as Json);
const snapshotFolders = () => readdirSync(pluginsRoot()).filter(f => !f.startsWith('.') && f !== 'plugin.lock.json');

// ---------- a stubbed GitHub API that can publish a new commit (no network) ----------

const gitSha = (b: Uint8Array) => createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

function fakeRepo(owner = 'someone', repo = 'lab') {
  let files: Record<string, Uint8Array> = {};
  let commit = '';
  let rootTree = '';
  const trees = new Map<string, Json[]>();
  const blobs = new Map<string, Uint8Array>();
  let version = 0;
  const publish = (dir: string, list: string[]) => {
    files = Object.fromEntries(list.map(p => [p, new Uint8Array(readFileSync(join(dir, p)))]));
    version++;
    const build = (prefix: string): string => {
      const names = new Set(Object.keys(files).filter(p => p.startsWith(prefix)).map(p => p.slice(prefix.length).split('/')[0]));
      const entries = [...names].map(name => {
        const full = prefix + name;
        if (files[full]) {
          const sha = gitSha(files[full]);
          blobs.set(sha, files[full]);
          return { path: name, mode: '100644', type: 'blob', sha, size: files[full].length };
        }
        return { path: name, mode: '040000', type: 'tree', sha: build(`${full}/`) };
      });
      const sha = sha1(`tree:${version}:${prefix}`);
      trees.set(sha, entries);
      return sha;
    };
    rootTree = build('');
    commit = sha1(`commit:${version}`);
    return commit;
  };
  const urls: string[] = [];
  const res = (status: number, body: unknown) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => body });
  const fetchImpl: Fetch = async url => {
    urls.push(url);
    const path = url.replace('https://api.github.com', '');
    if (path === `/repos/${owner}/${repo}`) return res(200, { name: repo, owner: { login: owner }, private: false, default_branch: 'main' });
    let m = /\/commits\/(.+)$/.exec(path);
    if (m) return ['main', commit].includes(decodeURIComponent(m[1])) ? res(200, { sha: commit, commit: { tree: { sha: rootTree } } }) : res(404, {});
    m = /\/git\/trees\/([0-9a-f]{40})$/.exec(path);
    if (m && trees.has(m[1])) return res(200, { sha: m[1], tree: trees.get(m[1]), truncated: false });
    m = /\/git\/blobs\/([0-9a-f]{40})$/.exec(path);
    if (m && blobs.has(m[1])) return res(200, { sha: m[1], encoding: 'base64', content: Buffer.from(blobs.get(m[1])!).toString('base64'), size: blobs.get(m[1])!.length });
    return res(404, {});
  };
  return { publish, fetchImpl, urls, source: `github:${owner}/${repo}` };
}
const NET_FILES = ['tg-plugin.json', 'SKILL.md', 'code/net.js'];

// ---------- update ----------

describe('plugin update: a new snapshot, the same installation', () => {
  it('no change: up to date, nothing asked or written', async () => {
    const dir = pluginDir(TONE);
    const r = await install(dir);
    const before = readFileSync(join(pluginsRoot(), 'plugin.lock.json'), 'utf8');
    const p = await prepareUpdate('tone-of-voice', undefined);
    expect(p).toMatchObject({ op: 'up-to-date', name: 'tone-of-voice' });
    expect(readFileSync(join(pluginsRoot(), 'plugin.lock.json'), 'utf8')).toBe(before);
    expect(r.installId).toBe(readLock().plugins['tone-of-voice'].installId);
  });

  it('GitHub, only the code changed: nothing new to accept; same installId, data kept, new folder, old one gone', async () => {
    const gh = fakeRepo();
    manageDeps.fetch = gh.fetchImpl;
    const dir = pluginDir(NET_LAB, m => { m.storage = { keys: ['k'] }; });
    const first = gh.publish(dir, NET_FILES);
    const installed = applyPrepared(await prepareInstall(gh.source, undefined, { fetch: gh.fetchImpl }));
    const entry = readLock().plugins['net-lab'];
    dataSet(entry, loadPlugin('net-lab').manifest, '1000', 'k', new TextEncoder().encode('x'));
    writeFileSync(join(dir, 'code/net.js'), `${readFileSync(join(dir, 'code/net.js'), 'utf8')}\n// v2\n`);
    const second = gh.publish(dir, NET_FILES);
    const p = await prepareUpdate('net-lab', undefined, { fetch: gh.fetchImpl });
    if (p.op !== 'update') throw new Error('expected an update');
    expect(p.diff.newly).toEqual({ permissions: [], effects: [], network: [], secrets: [] });
    expect(p.question).toContain(`Revision:    commit ${first} -> commit ${second}`);
    expect(p.question).toContain('NEW, not accepted before: nothing');
    expect(p.argv).toEqual(['plugin', 'update', 'net-lab', '--expect', second]);
    const r = applyPrepared(p, { fetch: gh.fetchImpl });
    expect(r).toMatchObject({ ok: true, action: 'plugin update', installId: installed.installId, from: { revision: first }, revision: second });
    const after = readLock().plugins['net-lab'];
    expect(after.installId).toBe(entry.installId);
    expect(after.snapshot).toBeDefined();
    expect(snapshotFolders()).toEqual([after.snapshot]);
    expect(new TextDecoder().decode(loadPlugin('net-lab').files.get('code/net.js'))).toContain('// v2');
    // Data belongs to the installation, not the snapshot
    expect(new TextDecoder().decode(dataGet(after, '1000', 'k'))).toBe('x');
    // A ref recorded at install is followed again: up to date now, the SHA was not baked into the source
    expect(after.source).toMatchObject({ type: 'github', owner: 'someone', repo: 'lab', commit: second });
    expect((after.source as Json).ref).toBeUndefined();
    expect(await prepareUpdate('net-lab', undefined, { fetch: gh.fetchImpl })).toMatchObject({ op: 'up-to-date' });
  });

  it('a new permission, effect, origin and secret are listed apart; the audit names them, never a value', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    rewrite(dir, m => {
      m.permissions.push('chats:read');
      m.network.push('https://new.example.org');
      m.secrets.push({ name: 'newkey', description: 'A new key', inject: { origin: 'https://new.example.org', header: 'X-New', format: '{value}' } });
      m.storage = { keys: ['k'] };
      m.permissions.push('storage:write');
      m.commands.push({ name: 'save', description: 'saves', effects: ['storage'], input: { type: 'object' }, output: { type: 'object' } });
    });
    const rev = readLocalSnapshot(dir).revision;
    const p = await prepareUpdate('net-lab', rev);
    if (p.op !== 'update') throw new Error('expected an update');
    expect(p.diff.newly).toEqual({ permissions: ['chats:read', 'storage:write'], effects: ['storage'], network: ['https://new.example.org'], secrets: ['newkey'] });
    const block = p.question.slice(p.question.indexOf('NEW, not accepted before:'), p.question.indexOf('After the update:'));
    expect(block).toMatch(/- can read: .*chat/);
    expect(block).toContain('- effect: storage');
    expect(block).toContain('- may send data to: https://new.example.org');
    expect(block).toContain('- Secret newkey: sent by the host only to https://new.example.org (any path) as X-New');
    applyPrepared(p);
    const e = readLock().plugins['net-lab'].accepted;
    expect(e.network).toContain('https://new.example.org');
    const last = audit().at(-1)!;
    expect(last).toMatchObject({
      command: 'plugin update', target: 'net-lab', result: { success: true },
      plugin: { revision: rev, newlyAccepted: { secrets: ['newkey'], effects: ['storage'] }, secretsReset: [], via: 'terminal' },
    });
    expect(last.plugin.fromRevision).toMatch(/^sha256-/);
  });

  it('secrets carry over unless where they go changed or they were dropped: then deleted and listed', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    const id = readLock().plugins['net-lab'].installId;
    const m0 = readLocalSnapshot(dir).manifest;
    setPluginSecret(id, slotIn(m0, 'apikey'), 'key-aaaa-1111');
    setPluginSecret(id, slotIn(m0, 'other'), 'key-bbbb-2222');
    // Only the header of `other` changes
    rewrite(dir, m => { m.secrets[1].inject.header = 'X-Other-Key'; });
    const m1 = readLocalSnapshot(dir).manifest;
    expect(slotIn(m1, 'apikey')).toEqual(slotIn(m0, 'apikey'));
    expect(slotIn(m1, 'other').gen).not.toBe(slotIn(m0, 'other').gen);
    const p = await prepareUpdate('net-lab', readLocalSnapshot(dir).revision);
    if (p.op !== 'update') throw new Error('expected an update');
    expect(p.diff.reset).toEqual([{ name: 'other', why: 'changed' }]);
    expect(p.diff.newly.secrets).toEqual(['other']);
    expect(p.question).toContain('Set again:   other');
    const r = applyPrepared(p);
    expect(r.mustSetAgain).toEqual([['plugin', 'secret', 'set', 'net-lab', 'other']]);
    expect(r.secretsNotRemoved).toBeUndefined();
    expect(readLock().plugins['net-lab'].secrets).toEqual({ apikey: slotIn(m1, 'apikey').gen, other: slotIn(m1, 'other').gen });
    expect(getPluginSecret(id, slotIn(m1, 'apikey'))).toBe('key-aaaa-1111');
    expect(getPluginSecret(id, slotIn(m1, 'other'))).toBeNull();
    // The old generation is deleted after the switch, not kept around
    expect(getPluginSecret(id, slotIn(m0, 'other'))).toBeNull();
    expect(pendingSecrets()).toEqual([]);
    // paths and format count as a change too; a dropped secret is deleted
    setPluginSecret(id, slotIn(m1, 'other'), 'key-cccc-3333');
    rewrite(dir, m => { m.secrets = [m.secrets[1]]; });
    const q = await prepareUpdate('net-lab', readLocalSnapshot(dir).revision);
    if (q.op !== 'update') throw new Error('expected an update');
    expect(q.diff.reset).toEqual([{ name: 'apikey', why: 'removed' }]);
    expect(q.diff.newly.secrets).toEqual([]);
    applyPrepared(q);
    expect(getPluginSecret(id, slotIn(m1, 'apikey'))).toBeNull();
    expect(getPluginSecret(id, slotIn(m1, 'other'))).toBe('key-cccc-3333');
    expect(JSON.stringify(audit())).not.toContain('key-');
  });

  it('review #2: a run still on the old revision reads only its own generation, never the value set for the new rule', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    const id = readLock().plugins['net-lab'].installId;
    // What a run that started before the update holds: the old manifest, read once
    const running = loadPlugin('net-lab').manifest;
    const get = () => getPluginSecretAsync(id, slotIn(running, 'apikey'), new AbortController().signal);
    setPluginSecret(id, slotIn(running, 'apikey'), 'old-key-1111');
    expect(await get()).toBe('old-key-1111');
    // Another process updates: the key now goes to another header; the human types the new key
    rewrite(dir, m => { m.secrets[0].inject.header = 'X-Moved-Key'; });
    applyPrepared(await prepareUpdate('net-lab', readLocalSnapshot(dir).revision) as never);
    const now = loadPlugin('net-lab').manifest;
    setPluginSecret(id, slotIn(now, 'apikey'), 'new-key-2222');
    // The old run asks again for its next request: neither the old value (deleted) nor the new one
    expect(await get()).toBeNull();
    expect(getPluginSecret(id, slotIn(now, 'apikey'))).toBe('new-key-2222');
  });

  it('review #6: nothing live is deleted before the switch; a failed apply keeps the old revision with its secrets, audited', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    const before = readLock().plugins['net-lab'];
    const m0 = loadPlugin('net-lab').manifest;
    setPluginSecret(before.installId, slotIn(m0, 'apikey'), 'key-dddd-4444');
    setPluginSecret(before.installId, slotIn(m0, 'other'), 'key-eeee-5555');
    // Both secrets move: as if the first old value were deleted and then the switch failed
    rewrite(dir, m => { m.secrets[0].inject.header = 'X-A'; m.secrets[1].inject.header = 'X-B'; });
    const p = await prepareUpdate('net-lab', readLocalSnapshot(dir).revision);
    storeDeps.afterSnapshot = () => { throw new Error('crash before the switch'); };
    expect(() => applyPrepared(p as never)).toThrow('crash before the switch');
    expect(readLock().plugins['net-lab']).toEqual(before);
    // The old revision still works with both of its values
    expect(getPluginSecret(before.installId, slotIn(m0, 'apikey'))).toBe('key-dddd-4444');
    expect(getPluginSecret(before.installId, slotIn(m0, 'other'))).toBe('key-eeee-5555');
    // The cleanup record names live values only: a later cleanup keeps them
    cleanupPendingSecrets();
    expect(getPluginSecret(before.installId, slotIn(m0, 'apikey'))).toBe('key-dddd-4444');
    expect(pendingSecrets()).toEqual([]);
    const failed = audit().at(-1)!;
    expect(failed).toMatchObject({ command: 'plugin update', target: 'net-lab', result: { success: false, error: 'error', reason: 'crash before the switch' } });
    expect(failed.plugin).toMatchObject({ installId: before.installId, fromRevision: before.revision });
    delete storeDeps.afterSnapshot;
    // A new generation that cannot be cleared stops the update before the switch, old one intact
    const mem = new Map<string, string>();
    pluginSecretDeps.store = { get: k => mem.get(k) ?? null, set: (k, v) => { mem.set(k, v); return true; }, delete: () => false };
    setPluginSecret(before.installId, slotIn(m0, 'apikey'), 'key-ffff-6666');
    mem.set(pluginSecretKey(before.installId, slotIn(readLocalSnapshot(dir).manifest, 'apikey')), 'stale-from-earlier');
    const q = await prepareUpdate('net-lab', readLocalSnapshot(dir).revision);
    expect(() => applyPrepared(q as never)).toThrow(expect.objectContaining({ code: 'secret_store_unavailable' }));
    expect(readLock().plugins['net-lab']).toEqual(before);
    expect(getPluginSecret(before.installId, slotIn(m0, 'apikey'))).toBe('key-ffff-6666');
    expect(audit().at(-1)).toMatchObject({ command: 'plugin update', result: { success: false, error: 'secret_store_unavailable' } });
  });

  it('review #6: an old generation the store fails to delete is recorded and retried; the new revision never reads it', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    const id = readLock().plugins['net-lab'].installId;
    const m0 = loadPlugin('net-lab').manifest;
    const mem = new Map<string, string>();
    let broken = true;
    pluginSecretDeps.store = {
      get: k => mem.get(k) ?? null, set: (k, v) => { mem.set(k, v); return true; },
      delete: k => { if (broken) throw new Error('store busy'); return mem.delete(k); },
    };
    setPluginSecret(id, slotIn(m0, 'other'), 'key-gggg-7777');
    rewrite(dir, m => { m.secrets[1].inject.origin = 'https://api.example.com'; m.secrets[1].inject.header = 'X-Moved'; });
    const r = applyPrepared(await prepareUpdate('net-lab', readLocalSnapshot(dir).revision) as never);
    // The update went through: the old value is under another generation, which no run of it reads
    expect(r).toMatchObject({ ok: true, action: 'plugin update', secretsNotRemoved: ['other'], mustSetAgain: [['plugin', 'secret', 'set', 'net-lab', 'other']] });
    const m1 = loadPlugin('net-lab').manifest;
    expect(getPluginSecret(id, slotIn(m1, 'other'))).toBeNull();
    expect(pendingSecrets()).toEqual([{ name: 'net-lab', installId: id, secrets: [`other:${slotIn(m0, 'other').gen}`] }]);
    // Retried later, once the store answers
    broken = false;
    expect(cleanupPendingSecrets().get(id)).toEqual([]);
    expect(getPluginSecret(id, slotIn(m0, 'other'))).toBeNull();
    expect(pendingSecrets()).toEqual([]);
  });

  it('atomic: a failure after the new snapshot is written leaves the old one registered and working', async () => {
    const dir = pluginDir(TONE);
    await install(dir);
    const before = readLock().plugins['tone-of-voice'];
    touchSkill(dir);
    const p = await prepareUpdate('tone-of-voice', readLocalSnapshot(dir).revision);
    let staged: string[] = [];
    storeDeps.afterSnapshot = () => {
      staged = snapshotFolders();
      throw new Error('crash after the snapshot');
    };
    expect(() => applyPrepared(p as never)).toThrow('crash after the snapshot');
    expect(staged).toHaveLength(2);
    expect(readLock().plugins['tone-of-voice']).toEqual(before);
    expect(snapshotFolders()).toEqual([before.installId]);
    expect(loadPlugin('tone-of-voice').entry.revision).toBe(before.revision);
    // A crash that left the new folder behind (no cleanup) does not disturb the registered one
    mkdirSync(join(pluginsRoot(), '00000000-0000-4000-8000-000000000000', 'tone-of-voice'), { recursive: true });
    expect(loadPlugin('tone-of-voice').entry.revision).toBe(before.revision);
    delete storeDeps.afterSnapshot;
    expect(applyPrepared(p as never)).toMatchObject({ ok: true, action: 'plugin update' });
  });

  it('a folder needs --expect for its new content; a wrong hash is refused; another plugin in the source is refused', async () => {
    const dir = pluginDir(TONE);
    await install(dir);
    touchSkill(dir, 'changed');
    await expect(prepareUpdate('tone-of-voice', undefined)).rejects.toMatchObject({ code: 'expect_required' });
    await expect(prepareUpdate('tone-of-voice', `sha256-${'A'.repeat(43)}=`)).rejects.toMatchObject({ code: 'plugin_revision_mismatch' });
    await expect(prepareUpdate('tone-of-voice', 'a'.repeat(40))).rejects.toMatchObject({ code: 'plugin_revision_mismatch' });
    rewrite(dir, m => { m.name = 'other-name'; });
    writeFileSync(join(dir, 'SKILL.md'), readFileSync(join(dir, 'SKILL.md'), 'utf8').replace('name: tone-of-voice', 'name: other-name'));
    await expect(prepareUpdate('tone-of-voice', readLocalSnapshot(dir).revision)).rejects.toMatchObject({ code: 'plugin_invalid' });
  });
});

// ---------- MCP: the management handler ----------

const call = (args: string[], extra: Json = {}) => ({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'telegram_write', arguments: { args, ...extra } } });
type Reply = { result: { content: { text: string }[]; isError?: boolean; structuredContent?: Json } };
const neverRun = async () => { throw new Error('plugin management must not run a CLI child'); };

describe('MCP: install, update and remove ask the human in the client\'s dialog', () => {
  beforeEach(() => setKnownCommands(['plugin', 'plugin install', 'plugin update', 'plugin remove', 'plugin list']));
  afterEach(() => setKnownCommands([]));

  it('Accept installs exactly what was shown (mode "on": the mock writes freely, the dialog still opens)', async () => {
    const dir = pluginDir(NET_LAB);
    const asked: string[] = [];
    const r = await handleMessage(call(['plugin', 'install', dir]), neverRun, { elicit: async m => { asked.push(m); return true; } }) as Reply;
    expect(asked).toHaveLength(1);
    expect(asked[0]).toMatch(/Install the Better-TG-CLI plugin "net-lab" 0\.1\.0\?\n {2}Source: +local folder /);
    expect(asked[0]).toContain('Profile:');
    expect(asked[0]).toContain('Sends data:  may send');
    expect(asked[0]).toContain('Secret apikey: sent by the host only to https://api.example.com (only the paths /v1 and below them) as Authorization');
    expect(r.result.isError).toBeUndefined();
    expect(JSON.parse(r.result.content[0].text)).toMatchObject({ ok: true, action: 'plugin install', name: 'net-lab', revision: readLocalSnapshot(dir).revision });
    expect(audit().at(-1)).toMatchObject({ command: 'plugin install', plugin: { via: 'mcp' }, result: { success: true } });
  });

  it('mode "ask" changes nothing about it: a model\'s approval code is never read, the dialog decides', async () => {
    process.env.TG_MOCK_ASK = '1';
    const dir = pluginDir(TONE);
    let asked = 0;
    const r = await handleMessage(call(['plugin', 'install', dir], { approval: 'ABCD-EFGH' }), neverRun, { elicit: async () => { asked++; return false; } }) as Reply;
    expect(asked).toBe(1);
    expect(r.result.isError).toBe(true);
    expect(JSON.parse(r.result.content[0].text).error.code).toBe('not_confirmed');
    expect(Object.keys(readLock().plugins)).toEqual([]);
    expect(audit().at(-1)).toMatchObject({ command: 'plugin install', plugin: { via: 'mcp' }, result: { success: false, error: 'not_confirmed' } });
    // Without a dialog the code is not taken either: the command for the human, nothing installed
    const fallback = await handleMessage(call(['plugin', 'install', dir], { approval: 'yes' }), neverRun, {}) as Reply;
    expect(fallback.result.structuredContent?.status).toBe('human_required');
    expect(Object.keys(readLock().plugins)).toEqual([]);
  });

  it('through the real elicitation exchange: accept, decline, cancel, timeout, Hermes\' empty Allow', async () => {
    const sent: Json[] = [];
    const { elicit, answer } = createElicitor(o => sent.push(o as Json), 200);
    const answerWith = (result: unknown) => async (m: string, s?: AbortSignal) => {
      const p = elicit(m, s);
      const req = sent.at(-1)!;
      expect(req).toMatchObject({ method: 'elicitation/create', params: { requestedSchema: { properties: { approve: { type: 'boolean' } } } } });
      if (result !== undefined) expect(answer({ jsonrpc: '2.0', id: req.id, result } as never)).toBe(true);
      return p;
    };
    const dir = pluginDir(TONE);
    for (const [result, installed] of [
      [{ action: 'decline' }, false], [{ action: 'cancel' }, false], [{ action: 'accept', content: { approve: false } }, false],
      [undefined, false], // no answer: the timeout says no
      [{ action: 'accept', content: {} }, true], // Hermes: Allow with empty content
    ] as const) {
      const r = await handleMessage(call(['plugin', 'install', dir]), neverRun, { elicit: answerWith(result) }) as Reply;
      expect(Object.keys(readLock().plugins).length > 0, JSON.stringify(result)).toBe(installed);
      if (!installed) expect(JSON.parse(r.result.content[0].text).error.code).toBe('not_confirmed');
    }
    // A late answer after the timeout is consumed and ignored
    expect(answer({ jsonrpc: '2.0', id: 'tg-elicit-4', result: { action: 'accept' } } as never)).toBe(true);
    expect(elicitApproved({ action: 'accept', content: { approve: true } })).toBe(true);
    // Remove with a form Accept
    const rm = await handleMessage(call(['plugin', 'remove', 'tone-of-voice']), neverRun, { elicit: answerWith({ action: 'accept', content: { approve: true } }) }) as Reply;
    expect(JSON.parse(rm.result.content[0].text)).toMatchObject({ ok: true, action: 'plugin remove' });
    expect(Object.keys(readLock().plugins)).toEqual([]);
  });

  it('a change between the dialog and the apply is refused: the folder, or the registry', async () => {
    const dir = pluginDir(TONE);
    const r = await handleMessage(call(['plugin', 'install', dir]), neverRun, {
      elicit: async () => { touchSkill(dir, 'swapped while the human read the old one'); return true; },
    }) as Reply;
    expect(JSON.parse(r.result.content[0].text).error.code).toBe('plugin_changed');
    expect(Object.keys(readLock().plugins)).toEqual([]);
    // Update shown for one installation; meanwhile it was removed and installed again
    const fresh = pluginDir(TONE);
    await install(fresh);
    touchSkill(fresh);
    const rev = readLocalSnapshot(fresh).revision;
    const u = await handleMessage(call(['plugin', 'update', 'tone-of-voice', '--expect', rev]), neverRun, {
      elicit: async () => {
        const e = readLock().plugins['tone-of-voice'];
        const { removeInstall } = await import('../src/plugins/store.js');
        removeInstall(e, false);
        commitInstall(readLocalSnapshot(TONE));
        return true;
      },
    }) as Reply;
    expect(JSON.parse(u.result.content[0].text).error.code).toBe('plugin_changed');
    expect(readLock().plugins['tone-of-voice'].revision).toBe(readLocalSnapshot(TONE).revision);
  });

  it('update over MCP: what is new is in the dialog; a decline keeps the old snapshot', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    const before = readLock().plugins['net-lab'];
    rewrite(dir, m => { m.network.push('https://new.example.org'); });
    const rev = readLocalSnapshot(dir).revision;
    let shown = '';
    const r = await handleMessage(call(['plugin', 'update', 'net-lab', '--expect', rev]), neverRun, { elicit: async m => { shown = m; return false; } }) as Reply;
    expect(shown).toContain('- may send data to: https://new.example.org');
    expect(JSON.parse(r.result.content[0].text).error.code).toBe('not_confirmed');
    expect(readLock().plugins['net-lab']).toEqual(before);
    expect(audit().at(-1)).toMatchObject({ command: 'plugin update', result: { success: false, error: 'not_confirmed' }, plugin: { fromRevision: before.revision, revision: rev } });
    const ok = await handleMessage(call(['plugin', 'update', 'net-lab', '--expect', rev]), neverRun, { elicit: async () => true }) as Reply;
    expect(JSON.parse(ok.result.content[0].text)).toMatchObject({ ok: true, revision: rev, installId: before.installId });
    // Up to date: no dialog at all
    let asked = false;
    const same = await handleMessage(call(['plugin', 'update']), neverRun, { elicit: async () => { asked = true; return true; } }) as Reply;
    expect(asked).toBe(false);
    expect(same.result.structuredContent).toMatchObject({ status: 'nothing_to_do', upToDate: [{ name: 'net-lab' }] });
  });

  it('a folder the model names: one answer whether it is missing or not a plugin; nothing is created before the human\'s yes', async () => {
    const broken = pluginDir(TONE, m => { m.description = 'SECRET-CONTENT'; m.files.push('nope.md'); });
    const answers = [];
    for (const dir of [join(home, 'no-such-folder'), broken, join(home, '..', '..', 'etc')]) {
      const r = await handleMessage(call(['plugin', 'install', dir]), neverRun, { elicit: async () => true }) as Reply;
      answers.push(r.result.content[0].text);
    }
    expect(new Set(answers).size).toBe(1);
    expect(JSON.parse(answers[0]).error).toMatchObject({ code: 'plugin_invalid', message: 'That folder could not be read as a plugin; nothing was installed' });
    // A valid folder, declined: the plugin home has no registry key, lock or snapshot afterwards
    await handleMessage(call(['plugin', 'install', pluginDir(TONE)]), neverRun, { elicit: async () => false });
    const pluginHome = join(home, 'mock-state.plugins');
    expect(existsSync(join(pluginHome, 'plugin-key'))).toBe(false);
    expect(existsSync(join(pluginHome, 'plugins', 'plugin.lock.json'))).toBe(false);
  });

  it('refused on a read-only server and under TG_READ_ONLY, before anything is prepared or asked', async () => {
    const dir = pluginDir(TONE);
    let asked = false;
    const elicit = async () => { asked = true; return true; };
    const ro = await handleMessage(call(['plugin', 'install', dir]), neverRun, { readOnly: true, elicit }) as Reply;
    expect(ro.result.isError).toBe(true);
    expect(ro.result.content[0].text).toMatch(/read-only/);
    process.env.TG_READ_ONLY = '1';
    const env2 = await handleManage({ op: 'install', source: dir }, { elicit });
    expect(env2?.isError).toBe(true);
    expect(env2?.content[0].text).toMatch(/read-only/);
    expect(asked).toBe(false);
    expect(Object.keys(readLock().plugins)).toEqual([]);
    // Read tool: management is a change
    const read = await handleMessage({ ...call(['plugin', 'install', dir]), params: { name: 'telegram_read', arguments: { args: ['plugin', 'install', dir] } } }, neverRun, { elicit }) as Reply;
    expect(read.result.content[0].text).toMatch(/changes something; use telegram_write/);
  });
});

// ---------- without a dialog: the command for the human's terminal ----------

describe('without a dialog the model gets the exact command for the terminal on the server\'s computer', () => {
  beforeEach(() => setKnownCommands(['plugin', 'plugin install', 'plugin update', 'plugin remove']));
  afterEach(() => setKnownCommands([]));

  it('Streamable HTTP (no elicitation): a folder pinned with --expect, `telegram` when it is on PATH, the mock state', async () => {
    manageDeps.onPath = b => b === 'telegram';
    manageDeps.platform = 'linux';
    const dir = pluginDir(TONE, undefined, join(home, 'my plugin'));
    const rev = readLocalSnapshot(dir).revision;
    // The command names the folder by its absolute real path (the human's terminal has another working folder)
    const real = realpathSync(dir);
    const http = createRpcProcessor({}, neverRun);
    const r = await http(JSON.stringify(call(['plugin', 'install', dir])));
    const res = (r.body as Reply).result;
    expect(res.structuredContent).toMatchObject({ status: 'human_required', commands: [{ operation: 'install', argv: ['plugin', 'install', real, '--expect', rev] }] });
    const cmd = res.structuredContent!.commands[0].command as string;
    // The host's own paths are quoted by the rules tested in "shapes"; here the parts and their order
    expect(cmd).toMatch(/^TG_PROFILE=mock TG_MOCK=\S+ telegram plugin install '.+my plugin' --expect \S+$/);
    expect(cmd).toContain(` --expect ${rev}`);
    expect(res.content[0].text).toContain(cmd);
    expect(Object.keys(readLock().plugins)).toEqual([]);
  });

  it('no `telegram` on PATH (an .mcpb): the CLI pinned to this version through npx; GitHub pinned to the commit', async () => {
    manageDeps.onPath = () => false;
    manageDeps.platform = 'darwin';
    const gh = fakeRepo('someone', 'lab');
    manageDeps.fetch = gh.fetchImpl;
    const commit = gh.publish(pluginDir(NET_LAB), NET_FILES);
    const r = await handleMessage(call(['plugin', 'install', 'github:someone/lab']), neverRun, {}) as Reply;
    const cmd = r.result.structuredContent?.commands[0].command as string;
    expect(cmd).toMatch(/^TG_PROFILE=mock TG_MOCK=\S+ npx /);
    expect(cmd.endsWith(` npx better-tg-cli@${VERSION} plugin install github:someone/lab --expect ${commit}`)).toBe(true);
  });

  it('shapes: profile, POSIX and PowerShell quoting, update and remove', () => {
    delete process.env.TG_MOCK;
    process.env.TG_PROFILE = 'work';
    const argv = ['plugin', 'install', "/tmp/it's here", '--expect', `sha256-${'A+/'.repeat(14)}A=`];
    // The profile and "no mock" are set explicitly: the terminal's own TG_PROFILE / TG_MOCK never win
    expect(terminalCommand(argv, { platform: 'linux', onPath: () => true }))
      .toBe(`TG_PROFILE=work TG_MOCK='' telegram plugin install '/tmp/it'\\''s here' --expect sha256-${'A+/'.repeat(14)}A=`);
    expect(terminalCommand(argv, { platform: 'darwin', onPath: () => false, version: '1.2.3' }))
      .toBe(`TG_PROFILE=work TG_MOCK='' npx better-tg-cli@1.2.3 plugin install '/tmp/it'\\''s here' --expect sha256-${'A+/'.repeat(14)}A=`);
    const win = ['plugin', 'install', "C:\\Users\\O'Neil\\my plugin", '--expect', `sha256-${'A+/'.repeat(14)}A=`];
    // PowerShell: the terminal's values are saved and put back in finally (set for this one command only)
    const save = '$tgSaved0 = $env:TG_PROFILE; $tgSaved1 = $env:TG_MOCK; try { ';
    const restore = ' } finally { $env:TG_PROFILE = $tgSaved0; $env:TG_MOCK = $tgSaved1 }';
    expect(terminalCommand(win, { platform: 'win32', onPath: () => true }))
      .toBe(`${save}$env:TG_PROFILE = 'work'; $env:TG_MOCK = ''; telegram plugin install 'C:\\Users\\O''Neil\\my plugin' --expect 'sha256-${'A+/'.repeat(14)}A='${restore}`);
    expect(terminalCommand(['plugin', 'update', 'net-lab'], { platform: 'win32', onPath: () => false, version: '1.2.3' }))
      .toBe(`${save}$env:TG_PROFILE = 'work'; $env:TG_MOCK = ''; npx 'better-tg-cli@1.2.3' plugin update net-lab${restore}`);
    // A .cmd shim (telegram.cmd, npx.cmd) is parsed again by cmd.exe: its metacharacters give no command
    for (const odd of ['C:\\a&calc', 'C:\\100%', 'C:\\a^b', 'C:\\a|b', 'C:\\a"b']) {
      expect(terminalCommand(['plugin', 'install', odd], { platform: 'win32', onPath: () => true }), odd).toBeUndefined();
    }
    // PowerShell takes typographic quotes as quotes: such a path gives no command at all (they are not ASCII)
    expect(terminalCommand(['plugin', 'install', 'C:\\a\u2019; calc; \u2018b'], { platform: 'win32', onPath: () => true })).toBeUndefined();
    // Anything but printable ASCII gives no command at all (the human types the path)
    for (const odd of ['/tmp/a\nb', '/tmp/\u202Eevil', '/tmp/caf\u00e9', '/tmp/a\u2019b']) {
      expect(terminalCommand(['plugin', 'install', odd], { platform: 'linux', onPath: () => true }), odd).toBeUndefined();
    }
    process.env.TG_PROFILE = '';
    expect(terminalCommand(['plugin', 'remove', 'net-lab', '--keep-data'], { platform: 'win32', onPath: () => true }))
      .toBe(`${save}$env:TG_PROFILE = ''; $env:TG_MOCK = ''; telegram plugin remove net-lab --keep-data${restore}`);
    expect(terminalCommand(['plugin', 'list'], { platform: 'linux', onPath: () => true })).toBe("TG_PROFILE='' TG_MOCK='' telegram plugin list");
  });

  it('onPath looks through PATH (and PATHEXT on Windows) without running anything', () => {
    const bin = join(home, 'bin');
    mkdirSync(bin);
    // The host's own PATH syntax for the host's platform; Windows rules checked with ';' anywhere
    const host = process.platform === 'win32' ? 'win32' : 'linux';
    expect(onPath('telegram', { PATH: bin, PATHEXT: '.EXE' }, host)).toBe(false);
    writeFileSync(join(bin, 'telegram.CMD'), '');
    expect(onPath('telegram', { PATH: bin, PATHEXT: '.EXE;.CMD' }, 'win32')).toBe(true);
    if (host === 'linux') expect(onPath('telegram', { PATH: bin }, 'linux')).toBe(false);
    writeFileSync(join(bin, 'telegram'), '', { mode: 0o755 });
    expect(onPath('telegram', { PATH: [join(home, 'nonexistent'), bin].join(delimiter) }, host)).toBe(true);
  });

  // chmod and X_OK mean nothing on a Windows host
  it.skipIf(process.platform === 'win32')('review #12: on POSIX a `telegram` file this user cannot execute is not on PATH (the npx fallback is used)', () => {
    const bin = join(home, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'telegram'), '#!/bin/sh\n', { mode: 0o644 });
    expect(onPath('telegram', { PATH: bin }, 'linux')).toBe(false);
    expect(terminalCommand(['plugin', 'list'], { platform: 'linux', onPath: b => onPath(b, { PATH: bin }, 'linux'), version: '1.2.3' })).toMatch(/ npx better-tg-cli@1\.2\.3 plugin list$/);
    chmodSync(join(bin, 'telegram'), 0o755);
    expect(onPath('telegram', { PATH: bin }, 'linux')).toBe(true);
    // Windows rules: an extension from PATHEXT, no execute bit
    writeFileSync(join(bin, 'telegram.CMD'), '', { mode: 0o644 });
    expect(onPath('telegram', { PATH: bin, PATHEXT: '.CMD' }, 'win32')).toBe(true);
  });

  it('update and remove fall back too; an argv that does not parse is no request', async () => {
    manageDeps.onPath = () => true;
    manageDeps.platform = 'linux';
    const dir = pluginDir(TONE);
    await install(dir);
    touchSkill(dir);
    const rev = readLocalSnapshot(dir).revision;
    const u = await handleMessage(call(['plugin', 'update', 'tone-of-voice', `--expect=${rev}`]), neverRun, {}) as Reply;
    expect(u.result.structuredContent?.commands[0]).toMatchObject({ argv: ['plugin', 'update', 'tone-of-voice', '--expect', rev] });
    expect(u.result.structuredContent?.commands[0].command).toMatch(new RegExp(`^TG_PROFILE=mock TG_MOCK=\\S+ telegram plugin update tone-of-voice --expect ${rev.replace(/[+/]/g, '\\$&')}$`));
    const rm = await handleMessage(call(['plugin', 'remove', 'tone-of-voice', '--keep-data']), neverRun, {}) as Reply;
    const e = readLock().plugins['tone-of-voice'];
    expect(rm.result.structuredContent?.commands[0].command).toMatch(new RegExp(`^TG_PROFILE=mock TG_MOCK=\\S+ telegram plugin remove tone-of-voice --keep-data --expect-install ${e.installId}:${e.installId}$`));
    expect(manageRequest('plugin update', ['--expect', rev])).toBeUndefined();
    expect(manageRequest('plugin remove', ['a', 'b'])).toBeUndefined();
    expect(manageRequest('plugin update', ['x', '--force'])).toBeUndefined();
    const bad = await handleMessage(call(['plugin', 'remove', 'x; rm -rf ~']), neverRun, {}) as Reply;
    expect(bad.result.isError).toBe(true);
    expect(bad.result.content[0].text).not.toContain('rm -rf');
    expect(readLock().plugins['tone-of-voice']).toBeDefined();
  });
});

// ---------- the CLI ----------

interface Run { code: number | null; out: string; err: string; json: any }
function cli(args: string[], extra: Record<string, string | undefined> = {}): Run {
  const e: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData'), TG_MOCK: join(home, 'mock-state.json'), TG_NO_UPDATE_CHECK: '1', TG_PROFILE: '' };
  for (const k of ['TG_MOCK_ASK', 'TG_MOCK_HUMAN', 'TG_APPROVE', 'TG_MCP', 'TG_READ_ONLY']) delete e[k];
  for (const [k, v] of Object.entries(extra)) { if (v === undefined) delete e[k]; else e[k] = v; }
  const r = spawnSync(process.execPath, [...cliArgs(), ...args], { encoding: 'utf8', env: e });
  let json: unknown;
  try { json = JSON.parse(r.stdout.trim().split('\n').at(-1) ?? ''); } catch { json = undefined; }
  return { code: r.status, out: r.stdout, err: r.stderr, json };
}

describe('the CLI: plugin update in a terminal', { timeout: 60_000 }, () => {
  it('`plugin update` is not the self-update `update` in mock mode', () => {
    expect(cli(['update', '--json']).json.error.code).toBe('not_in_mock');
    const r = cli(['plugin', 'update', '--json']);
    expect(r.code).toBe(0);
    expect(r.json).toEqual({ ok: true, action: 'plugin update', results: [] });
  });

  it('a code-only update still asks the human (it is theirs); no keeps the old, yes switches; over MCP the CLI refuses', () => {
    const dir = pluginDir(TONE);
    expect(cli(['plugin', 'install', dir, '--json'], { TG_MOCK_HUMAN: 'yes' }).code).toBe(0);
    const before = readLock().plugins['tone-of-voice'];
    touchSkill(dir);
    const rev = readLocalSnapshot(dir).revision;
    // No terminal, no dialog, no rehearsed answer: refused, nothing changes
    const nobody = cli(['plugin', 'update', 'tone-of-voice', '--expect', rev, '--json']);
    expect(nobody.json.error.code).toBe('no_human_channel');
    expect(readLock().plugins['tone-of-voice']).toEqual(before);
    const no = cli(['plugin', 'update', 'tone-of-voice', '--expect', rev, '--json'], { TG_MOCK_HUMAN: 'no' });
    expect(no.json.error.code).toBe('not_confirmed');
    expect(no.err).toContain('NEW, not accepted before: nothing');
    expect(readLock().plugins['tone-of-voice']).toEqual(before);
    for (const extra of [{ TG_MCP: '1' }, { TG_READ_ONLY: '1' }]) {
      const r = cli(['plugin', 'update', 'tone-of-voice', '--expect', rev, '--json'], { ...extra, TG_MOCK_HUMAN: 'yes' });
      expect(r.json.error.code).toBe('human_required');
    }
    const yes = cli(['plugin', 'update', 'tone-of-voice', '--expect', rev, '--json'], { TG_MOCK_HUMAN: 'yes' });
    expect(yes.json).toMatchObject({ ok: true, action: 'plugin update', revision: rev, installId: before.installId });
    expect(cli(['plugin', 'update', '--json']).json).toMatchObject({ ok: true, results: [{ name: 'tone-of-voice', upToDate: true }] });
    expect(existsSync(join(pluginsRoot(), before.installId))).toBe(false);
  });
});

// ---------- review fixes (review-p4.md) ----------

describe('review fixes of plugin management', () => {
  beforeEach(() => setKnownCommands(['plugin', 'plugin install', 'plugin update', 'plugin remove', 'plugin list', 'plugin run']));
  afterEach(() => {
    setKnownCommands([]);
    delete storeDeps.keyStore;
    delete dpapiDeps.store;
    delete dpapiDeps.available;
  });

  /** A DPAPI file store over a reversible fake crypter: what runs on Windows, minus PowerShell. */
  const fakeCrypter = { protect: (b: string) => `x${b}`, unprotect: (b: string) => b.slice(1) };
  const dpapiFile = () => join(home, 'AppData', 'tg', 'secrets.dpapi');
  /** The adapters production builds over src/secrets.ts, here over the DPAPI functions with `instance` behind them. */
  const overDpapi = (instance: ReturnType<typeof dpapiStore>) => {
    const use = <T>(fn: () => T): T => { dpapiDeps.store = instance; dpapiDeps.available = true; return fn(); };
    const backend = {
      available: () => use(() => isDpapiAvailable()),
      getStrict: (k: string, fresh: boolean) => use(() => dpapiGetStrict(k, fresh)),
      getStrictAsync: (k: string, signal: AbortSignal) => use(() => dpapiGetStrictAsync(k, signal)),
      set: (k: string, v: string) => use(() => dpapiSet(k, v)),
      delete: (k: string) => use(() => dpapiDelete(k)),
    };
    return { secrets: backendStore(backend), key: backendKeyStore(backend) };
  };

  it('#1: DPAPI reads that decide something are fresh: a secret another process set is deleted, not skipped from a stale copy', () => {
    const dir = pluginDir(NET_LAB);
    const serverProc = dpapiStore(dpapiFile, fakeCrypter);
    const otherProc = dpapiStore(dpapiFile, fakeCrypter);
    // The plugin registry key and secrets live in the DPAPI file, seen by two processes
    storeDeps.keyStore = overDpapi(otherProc).key;
    pluginSecretDeps.store = overDpapi(otherProc).secrets;
    commitInstall(readLocalSnapshot(dir));
    const id = readLock().plugins['net-lab'].installId;
    const slot = slotIn(readLocalSnapshot(dir).manifest, 'other');
    const key = pluginSecretKey(id, slot);
    // The long-lived server caches the file while the secret is not set yet
    expect(serverProc.getStrict(key)).toEqual({ ok: true, value: null });
    otherProc.set(key, 'typed-in-the-terminal');
    expect(serverProc.getStrict(key)).toEqual({ ok: true, value: null });
    expect(dpapiStore(dpapiFile, fakeCrypter).getStrict(key)).toEqual({ ok: true, value: 'typed-in-the-terminal' });
    // The server's update deletes it from the file, through the same adapter as production
    pluginSecretDeps.store = overDpapi(serverProc).secrets;
    expect(erasePluginSecret(id, slot)).toBe(true);
    expect(otherProc.getStrict(key, true)).toEqual({ ok: true, value: null });
  });

  it('#1: the registry key is read afresh before one is made, and never made over a registry with plugins', () => {
    const serverProc = dpapiStore(dpapiFile, fakeCrypter);
    const otherProc = dpapiStore(dpapiFile, fakeCrypter);
    // The server cached "no key" before another process made the first install
    expect(serverProc.getStrict('pluginRegistryKey')).toEqual({ ok: true, value: null });
    storeDeps.keyStore = overDpapi(otherProc).key;
    commitInstall(readLocalSnapshot(pluginDir(TONE)));
    const made = otherProc.getStrict('pluginRegistryKey', true);
    // The server installs next: it finds that key instead of signing a new one over it
    storeDeps.keyStore = overDpapi(serverProc).key;
    commitInstall(readLocalSnapshot(pluginDir(NET_LAB)));
    expect(otherProc.getStrict('pluginRegistryKey', true)).toEqual(made);
    expect(Object.keys(readLock().plugins).sort()).toEqual(['net-lab', 'tone-of-voice']);
    // The key is gone from the store while plugins are registered: refused, no key is made
    let sets = 0;
    storeDeps.keyStore = { available: () => true, get: () => ({ ok: true, value: null }), set: () => { sets++; return true; } };
    const extra = pluginDir(TONE, m => { m.name = 'tone-two'; });
    writeFileSync(join(extra, 'SKILL.md'), readFileSync(join(extra, 'SKILL.md'), 'utf8').replace('name: tone-of-voice', 'name: tone-two'));
    expect(() => commitInstall(readLocalSnapshot(extra))).toThrow(expect.objectContaining({ code: 'plugin_lock_invalid' }));
    expect(sets).toBe(0);
  });

  it('#3: every change of secrets.dpapi holds one lock: a write-access change by another process is not undone', async () => {
    const file = dpapiFile();
    const seed = dpapiStore(() => file, fakeCrypter);
    const secret = 'plugin-secret-default-11111111-2222-4333-8444-555555555555-apikey-g0123456789abcdef';
    seed.set('writeEnabled', 'on');
    seed.set(secret, 'some-secret-value');
    const ready = join(home, 'child-ready');
    const script = join(home, 'write-access-off.mts');
    writeFileSync(script, [
      `import { writeFileSync } from 'node:fs';`,
      `import { dpapiStore } from ${JSON.stringify(pathToFileURL(resolve('src/dpapi.ts')).href)};`,
      `const crypter = { protect: (b) => 'x' + b, unprotect: (b) => b.slice(1) };`,
      `const store = dpapiStore(() => ${JSON.stringify(file)}, crypter);`,
      `writeFileSync(${JSON.stringify(ready)}, '1');`,
      `process.exit(store.set('writeEnabled', 'off') ? 0 : 1);`,
    ].join('\n'));
    let child: ReturnType<typeof spawn> | undefined;
    let exited: Promise<number | null> | undefined;
    // This process deletes a plugin secret; between its read and its rename the other process
    // switches write access off (`telegram write-access off` in another terminal)
    const slow = dpapiStore(() => file, {
      ...fakeCrypter,
      protect: b => {
        if (!child) {
          child = spawn(process.execPath, ['--import', 'tsx', script], { cwd: resolve('.'), stdio: 'ignore' });
          exited = new Promise(r => child!.on('exit', r));
          const until = Date.now() + 20_000;
          while (!existsSync(ready) && Date.now() < until) sleepSync(20);
          // Time enough for the other write to land if nothing held it back
          sleepSync(800);
        }
        return fakeCrypter.protect(b);
      },
    });
    expect(slow.delete(secret)).toBe(true);
    expect(await exited).toBe(0);
    const after = dpapiStore(() => file, fakeCrypter);
    expect(after.getStrict('writeEnabled', true)).toEqual({ ok: true, value: 'off' });
    expect(after.getStrict(secret, true)).toEqual({ ok: true, value: null });
  }, 60_000);

  it('#4: network, namespace and device paths are refused before any file system call, on every platform', async () => {
    for (const p of ['\\\\server\\share\\plugin', '//server/share/plugin', '\\/server/share', '\\\\?\\C:\\plugin', '//?/C:/plugin', '\\\\.\\pipe\\x', '\\??\\C:\\x', 'NUL', 'C:\\work\\con.txt', 'plugins/AUX', 'c:\\x\\COM1 .\\y', 'lpt9']) {
      expect(localPathProblem(p), p).toBeDefined();
      expect(() => parseSource(p), p).toThrow(expect.objectContaining({ code: 'invalid_argument' }));
      // The recorded path of an update is checked again: a usage error, not "no such folder" from a lookup
      expect(() => readLocalSnapshot(p), p).toThrow(expect.objectContaining({ code: 'invalid_argument' }));
      expect(manageRequest('plugin install', [p]), p).toBeUndefined();
    }
    for (const p of ['C:\\Users\\me\\plugin', './my-plugin', '/home/me/console', 'C:\\connect\\nul-free', 'compass']) expect(localPathProblem(p), p).toBeUndefined();
    await expect(prepareInstall('\\\\attacker.example\\share\\p', undefined)).rejects.toMatchObject({ code: 'invalid_argument' });
    // Over MCP: refused as a request, nothing prepared or read
    const r = await handleMessage(call(['plugin', 'install', '//attacker.example/share/p']), neverRun, {}) as Reply;
    expect(r.result.isError).toBe(true);
  });

  it('#5: the expect_required hint is a command built from argv: binary, profile, quoting for sh and PowerShell', async () => {
    const dir = pluginDir(TONE, undefined, join(home, 'my $(touch pwned); `x` folder'));
    await install(dir);
    touchSkill(dir);
    const real = realpathSync(dir);
    manageDeps.onPath = () => true;
    for (const platform of ['linux', 'win32'] as const) {
      manageDeps.platform = platform;
      const e = await prepareUpdate('tone-of-voice', undefined).then(() => undefined, (x: unknown) => x as { code: string; hint: string; fields: Json });
      expect(e?.code).toBe('expect_required');
      expect(e?.fields.validate).toEqual(['plugin', 'validate', real]);
      expect(e?.hint).toContain(`Check the folder in a terminal: ${terminalCommand(['plugin', 'validate', real])}`);
      expect(e?.hint).toContain(`Then: ${terminalCommand(['plugin', 'update', 'tone-of-voice'])} --expect <the revision it prints>`);
    }
    manageDeps.platform = 'linux';
    const posix = terminalCommand(['plugin', 'validate', real])!;
    // One quoted argument: no expansion, no second command
    expect(posix).toMatch(/^TG_PROFILE=mock TG_MOCK=\S+ telegram plugin validate '[^']*my \$\(touch pwned\); `x` folder'$/);
    manageDeps.platform = 'win32';
    expect(terminalCommand(['plugin', 'validate', real])).toContain(`telegram plugin validate '${real}'`);
    expect(existsSync(join(home, 'pwned'))).toBe(false);
  });

  it('#7: an update back to an earlier revision (A → B → A) is another snapshot: old dialogs and approvals no longer hold', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    const a = readLock().plugins['net-lab'];
    const before = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    // Shown before the updates: a remove dialog, a run approval, the server's expectation for a run
    const shownRemove = prepareRemove('net-lab', false);
    const runAction = {
      command: 'plugin run', parsed: true, argv: ['plugin', 'run', 'net-lab', 'fetch', '--input', '{}'],
      args: [{ name: 'name', value: 'net-lab' }, { name: 'command', value: 'fetch' }], options: [['input', '{}']],
    } as never;
    const boundA = (await prepareAction(runAction)).bound;
    const plan = planCall('telegram_write', { args: ['plugin', 'run', 'net-lab', 'fetch', '--input', '{}'] });
    if (typeof plan === 'string' || !plan.plugin) throw new Error('expected a classified plugin run');
    const expectA = pluginExpectation(plan.plugin);
    touchSkill(dir);
    applyPrepared(await prepareUpdate('net-lab', readLocalSnapshot(dir).revision) as never);
    writeFileSync(join(dir, 'SKILL.md'), before);
    applyPrepared(await prepareUpdate('net-lab', readLocalSnapshot(dir).revision) as never);
    const a2 = readLock().plugins['net-lab'];
    expect([a2.installId, a2.revision]).toEqual([a.installId, a.revision]);
    expect(a2.snapshot).not.toBe(a.snapshot ?? a.installId);
    expect(() => applyPrepared(shownRemove)).toThrow(expect.objectContaining({ code: 'plugin_changed' }));
    expect(readLock().plugins['net-lab']).toBeDefined();
    expect((await prepareAction(runAction)).bound).not.toEqual(boundA);
    const plan2 = planCall('telegram_write', { args: ['plugin', 'run', 'net-lab', 'fetch', '--input', '{}'] });
    if (typeof plan2 === 'string' || !plan2.plugin) throw new Error('expected a classified plugin run');
    expect(pluginExpectation(plan2.plugin)).not.toBe(expectA);
    // A run child started with the old expectation is refused before anything runs
    const r = cli(['plugin', 'run', 'net-lab', 'fetch', '--input', '{}', '--json'], { TG_MCP: '1', TG_PLUGIN_EXPECT: expectA });
    expect(r.json?.error?.code, r.out + r.err).toBe('plugin_changed');
  });

  it('#8: a dialog is settled only by a well-formed response with exactly its id, from this server instance', async () => {
    const sent: Json[] = [];
    const first = createElicitor(o => sent.push(o as Json), 5_000);
    const pending = first.elicit('approve?');
    const id = sent.at(-1)!.id as string;
    expect(id).toMatch(/^tg-elicit-[0-9a-f]{16}-1$/);
    let settled: boolean | undefined;
    void pending.then(v => { settled = v; });
    const yes = { action: 'accept', content: { approve: true } };
    // A numeric id, or one that String() would coerce into the dialog's id, settles nothing
    expect(first.answer({ jsonrpc: '2.0', id: 1, result: yes } as never)).toBe(false);
    first.answer({ jsonrpc: '2.0', id: [id], result: yes } as never);
    // No jsonrpc, or both result and error: not a response
    first.answer({ id, result: yes } as never);
    first.answer({ jsonrpc: '2.0', id, result: yes, error: { code: 1 } } as never);
    // A restarted server: its dialog #1 is not the old one's
    const sent2: Json[] = [];
    const second = createElicitor(o => sent2.push(o as Json), 5_000);
    const pending2 = second.elicit('approve?');
    let settled2: boolean | undefined;
    void pending2.then(v => { settled2 = v; });
    expect(sent2.at(-1)!.id).not.toBe(id);
    expect(second.answer({ jsonrpc: '2.0', id, result: yes } as never)).toBe(true); // swallowed, never a request
    await new Promise(r => setTimeout(r, 20));
    expect([settled, settled2]).toEqual([undefined, undefined]);
    // The exact id settles it; an error response is a no
    expect(first.answer({ jsonrpc: '2.0', id, result: { action: 'accept', content: {} } } as never)).toBe(true); // Hermes' empty Allow
    expect(await pending).toBe(true);
    expect(second.answer({ jsonrpc: '2.0', id: sent2.at(-1)!.id, error: { code: -32600, message: 'no' } } as never)).toBe(true);
    expect(await pending2).toBe(false);
  });

  it('#9: the command sets the profile and the mock state explicitly, as an absolute path', () => {
    manageDeps.platform = 'linux';
    manageDeps.onPath = () => true;
    // A relative state file is this process's, resolved here, not in the human's working folder
    const sh = (v: string) => (/^[\w@%+=:,./-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`);
    process.env.TG_MOCK = 'rel/mock-state.json';
    expect(terminalCommand(['plugin', 'list'])).toBe(`TG_PROFILE=mock TG_MOCK=${sh(resolve('rel/mock-state.json'))} telegram plugin list`);
    process.env.TG_MOCK = '1';
    process.env.TG_PROFILE = 'mock-two';
    const cmd = terminalCommand(['plugin', 'list'])!;
    expect(cmd.startsWith('TG_PROFILE=mock-two TG_MOCK=')).toBe(true);
    expect(cmd).toContain(`${sep}tg-mock-two${sep}mock-state.json`);
    expect(cmd.endsWith(' telegram plugin list')).toBe(true);
  });

  it('#10: the remove dialog names the profile, grants, destinations and the secrets it deletes; the command is bound to the installation', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    const e = readLock().plugins['net-lab'];
    const p = prepareRemove('net-lab', true);
    for (const line of [
      '  Profile:  mock',
      '  Effects:  network',
      '  Sends to: https://api.example.com, https://other.example.com, https://wrong.example.net',
      '  Secrets:  apikey, other: deleted from the secret store (also with --keep-data)',
    ]) expect(p.question).toContain(line);
    expect(p.question).toMatch(/  Can read: .*messages you wrote yourself/);
    expect(p.argv).toEqual(['plugin', 'remove', 'net-lab', '--keep-data', '--expect-install', `${e.installId}:${e.installId}`]);
    expect(manageRequest('plugin remove', ['net-lab', '--expect-install', `${e.installId}:${e.installId}`])).toEqual({ op: 'remove', name: 'net-lab', keepData: false, expectInstall: `${e.installId}:${e.installId}` });
    expect(manageRequest('plugin remove', ['net-lab', '--expect-install', 'x'])).toBeUndefined();
    // The plugin is removed and installed again under the name: the command made earlier is refused
    applyPrepared(prepareRemove('net-lab', false));
    await install(dir);
    const r = cli(['plugin', 'remove', 'net-lab', '--expect-install', `${e.installId}:${e.installId}`, '--json'], { TG_MOCK_HUMAN: 'yes' });
    expect(r.json?.error?.code, r.out + r.err).toBe('plugin_changed');
    expect(readLock().plugins['net-lab'].installId).not.toBe(e.installId);
    const now = readLock().plugins['net-lab'];
    expect(cli(['plugin', 'remove', 'net-lab', '--expect-install', `${now.installId}:${now.installId}`, '--json'], { TG_MOCK_HUMAN: 'yes' }).json).toMatchObject({ ok: true });
  });

  it('#11: a cancelled `plugin update` stops at once: the request in flight is aborted, no further plugin is fetched', async () => {
    const a = fakeRepo('someone', 'lab');
    const b = fakeRepo('other', 'tone');
    const route: Fetch = (url, init) => (url.includes('/repos/other/tone') ? b.fetchImpl(url, init) : a.fetchImpl(url, init));
    manageDeps.fetch = route;
    a.publish(pluginDir(NET_LAB), NET_FILES);
    const toneDir = pluginDir(TONE);
    const toneFiles = JSON.parse(readFileSync(join(toneDir, 'tg-plugin.json'), 'utf8')).files as string[];
    b.publish(toneDir, toneFiles);
    applyPrepared(await prepareInstall('github:someone/lab', undefined, { fetch: route }));
    applyPrepared(await prepareInstall('github:other/tone', undefined, { fetch: route }));
    const labDir = pluginDir(NET_LAB, m => { m.description = 'v2'; });
    a.publish(labDir, NET_FILES);
    touchSkill(toneDir);
    b.publish(toneDir, toneFiles);
    const ctl = new AbortController();
    const seen: string[] = [];
    let inFlight: AbortSignal | undefined;
    manageDeps.fetch = (url, init) => {
      seen.push(url);
      // The user cancels while the first plugin's request is on its way; the stub honours the signal
      if (!inFlight) {
        inFlight = init.signal;
        ctl.abort();
      }
      if (init.signal?.aborted) return Promise.reject(new Error('aborted'));
      return route(url, init);
    };
    const r = await handleManage({ op: 'update' }, { elicit: async () => { throw new Error('no dialog after a cancel'); } }, ctl.signal);
    expect(r).toBeUndefined();
    expect(inFlight?.aborted).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen.some(u => u.includes('/repos/other/tone'))).toBe(false);
  });
});
