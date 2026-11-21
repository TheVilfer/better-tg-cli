import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
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

import { createElicitor, elicitApproved, handleManage, handleMessage, manageRequest, setKnownCommands } from '../src/mcp.js';
import { createRpcProcessor } from '../src/mcp-http.js';
import { applyPrepared, manageDeps, onPath, prepareInstall, prepareUpdate, terminalCommand } from '../src/plugins/manage.js';
import { commitInstall, dataGet, dataSet, loadPlugin, pluginsRoot, readLock, storeDeps } from '../src/plugins/store.js';
import { getPluginSecret, pluginSecretDeps, setPluginSecret } from '../src/plugins/secrets.js';
import { readLocalSnapshot, type Fetch } from '../src/plugins/source.js';
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
    setPluginSecret(id, 'apikey', 'key-aaaa-1111');
    setPluginSecret(id, 'other', 'key-bbbb-2222');
    // Only the header of `other` changes
    rewrite(dir, m => { m.secrets[1].inject.header = 'X-Other-Key'; });
    const p = await prepareUpdate('net-lab', readLocalSnapshot(dir).revision);
    if (p.op !== 'update') throw new Error('expected an update');
    expect(p.diff.reset).toEqual([{ name: 'other', why: 'changed' }]);
    expect(p.diff.newly.secrets).toEqual(['other']);
    expect(p.question).toContain('Set again:   other');
    const r = applyPrepared(p);
    expect(r.mustSetAgain).toEqual([['plugin', 'secret', 'set', 'net-lab', 'other']]);
    expect(getPluginSecret(id, 'apikey')).toBe('key-aaaa-1111');
    expect(getPluginSecret(id, 'other')).toBeNull();
    // paths and format count as a change too; a dropped secret is deleted
    setPluginSecret(id, 'other', 'key-cccc-3333');
    rewrite(dir, m => { m.secrets = [m.secrets[1]]; });
    const q = await prepareUpdate('net-lab', readLocalSnapshot(dir).revision);
    if (q.op !== 'update') throw new Error('expected an update');
    expect(q.diff.reset).toEqual([{ name: 'apikey', why: 'removed' }]);
    expect(q.diff.newly.secrets).toEqual([]);
    applyPrepared(q);
    expect(getPluginSecret(id, 'apikey')).toBeNull();
    expect(getPluginSecret(id, 'other')).toBe('key-cccc-3333');
    expect(JSON.stringify(audit())).not.toContain('key-');
  });

  it('a secret the store fails to delete stops the update: the old snapshot stays', async () => {
    const dir = pluginDir(NET_LAB);
    await install(dir);
    const before = readLock().plugins['net-lab'];
    const mem = new Map<string, string>();
    pluginSecretDeps.store = { get: k => mem.get(k) ?? null, set: (k, v) => { mem.set(k, v); return true; }, delete: () => false };
    setPluginSecret(before.installId, 'other', 'key-dddd-4444');
    rewrite(dir, m => { m.secrets[1].inject.origin = 'https://api.example.com'; m.secrets[1].inject.header = 'X-Moved'; });
    const p = await prepareUpdate('net-lab', readLocalSnapshot(dir).revision);
    expect(() => applyPrepared(p as never)).toThrow(expect.objectContaining({ code: 'secret_store_unavailable' }));
    expect(readLock().plugins['net-lab']).toEqual(before);
    expect(snapshotFolders()).toEqual([before.installId]);
    expect(loadPlugin('net-lab').entry.revision).toBe(before.revision);
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
    expect(cmd).toMatch(/^TG_MOCK=\S+ telegram plugin install '.+my plugin' --expect \S+$/);
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
    expect(cmd).toMatch(/^TG_MOCK=\S+ npx /);
    expect(cmd.endsWith(` npx better-tg-cli@${VERSION} plugin install github:someone/lab --expect ${commit}`)).toBe(true);
  });

  it('shapes: profile, POSIX and PowerShell quoting, update and remove', () => {
    delete process.env.TG_MOCK;
    process.env.TG_PROFILE = 'work';
    const argv = ['plugin', 'install', "/tmp/it's here", '--expect', `sha256-${'A+/'.repeat(14)}A=`];
    expect(terminalCommand(argv, { platform: 'linux', onPath: () => true }))
      .toBe(`TG_PROFILE=work telegram plugin install '/tmp/it'\\''s here' --expect sha256-${'A+/'.repeat(14)}A=`);
    expect(terminalCommand(argv, { platform: 'darwin', onPath: () => false, version: '1.2.3' }))
      .toBe(`TG_PROFILE=work npx better-tg-cli@1.2.3 plugin install '/tmp/it'\\''s here' --expect sha256-${'A+/'.repeat(14)}A=`);
    const win = ['plugin', 'install', "C:\\Users\\O'Neil\\my plugin", '--expect', `sha256-${'A+/'.repeat(14)}A=`];
    expect(terminalCommand(win, { platform: 'win32', onPath: () => true }))
      .toBe(`$env:TG_PROFILE='work'; telegram plugin install 'C:\\Users\\O''Neil\\my plugin' --expect 'sha256-${'A+/'.repeat(14)}A='; Remove-Item Env:TG_PROFILE`);
    expect(terminalCommand(['plugin', 'update', 'net-lab'], { platform: 'win32', onPath: () => false, version: '1.2.3' }))
      .toBe("$env:TG_PROFILE='work'; npx 'better-tg-cli@1.2.3' plugin update net-lab; Remove-Item Env:TG_PROFILE");
    // PowerShell takes typographic quotes as quotes: such a path gives no command at all (they are not ASCII)
    expect(terminalCommand(['plugin', 'install', 'C:\\a\u2019; calc; \u2018b'], { platform: 'win32', onPath: () => true })).toBeUndefined();
    // Anything but printable ASCII gives no command at all (the human types the path)
    for (const odd of ['/tmp/a\nb', '/tmp/\u202Eevil', '/tmp/caf\u00e9', '/tmp/a\u2019b']) {
      expect(terminalCommand(['plugin', 'install', odd], { platform: 'linux', onPath: () => true }), odd).toBeUndefined();
    }
    process.env.TG_PROFILE = '';
    expect(terminalCommand(['plugin', 'remove', 'net-lab', '--keep-data'], { platform: 'win32', onPath: () => true })).toBe('telegram plugin remove net-lab --keep-data');
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
    writeFileSync(join(bin, 'telegram'), '');
    expect(onPath('telegram', { PATH: [join(home, 'nonexistent'), bin].join(delimiter) }, host)).toBe(true);
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
    expect(u.result.structuredContent?.commands[0].command).toMatch(new RegExp(`^TG_MOCK=\\S+ telegram plugin update tone-of-voice --expect ${rev.replace(/[+/]/g, '\\$&')}$`));
    const rm = await handleMessage(call(['plugin', 'remove', 'tone-of-voice', '--keep-data']), neverRun, {}) as Reply;
    expect(rm.result.structuredContent?.commands[0].command).toMatch(/^TG_MOCK=\S+ telegram plugin remove tone-of-voice --keep-data$/);
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
