import { Command } from 'commander';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import type { TelegramClient } from 'teleproto';
import { disconnectClient, getClient, getMe } from '../client.js';
import { isConfigured, loadConfig } from '../config.js';
import { isMock } from '../paths.js';
import { auditLog } from '../audit.js';
import { assertLocalWriteAllowed } from '../guard.js';
import { readStdinOnce, stdinBody } from '../text.js';
import { CliError, EXIT, ExitSignal, fail, shellCommand, usageError } from '../errors.js';
import chalk from '../colors.js';
import { VERSION } from '../version.js';
import { DEFAULT_QUOTA_BYTES, markdownSection, type Manifest } from '../plugins/manifest.js';
import { fetchGithubSnapshot, parseSource, readLocalSnapshot, type Fetch, type Snapshot } from '../plugins/source.js';
import {
  assertApprovedInstall, assertCanSign, commitInstall, cursorLoad, cursorSave, dataDelete, dataDeleteGuarded, dataGet, dataKeyProblem, dataList,
  dataSet, dataSetGuarded, findEntry, loadPlugin, onboardingState, own, readLock, removeInstall,
} from '../plugins/store.js';
import { humanConfirms, humanRequired, installSummary, originLabel, removeQuestion, revisionLabel, type Confirm } from '../plugins/human.js';
import { listPlugins, PLUGIN_NOTICE, pluginSource } from '../plugins/catalog.js';
import { assertRunnable, checkInput, devLog, findCommand, memoryCursors, memoryStorage, parseInput, parseTarget, runPluginCommand, type RunOutcome } from '../plugins/run.js';
import type { CursorStore, StorageBackend } from '../plugins/host.js';
import type { LockEntry } from '../plugins/store.js';

/**
 * `telegram plugin …` (docs/plugins.md): install by snapshot, list, show, data, remove, validate (P1);
 * run and dev in the sandbox (P2). Network and secrets (P3) and `plugin update` with the MCP
 * management dialog (P4) plug in here.
 */

const json = (value: unknown) => JSON.stringify(value);

/** Test seams, set only by in-process tests: the GitHub fetch and the human's answer. */
export const pluginDeps: { fetch?: Fetch; confirm?: Confirm; cliVersion?: string } = {};
const cliVersion = () => pluginDeps.cliVersion ?? VERSION;

/** The Telegram account the data belongs to; `soft` gives undefined instead of failing (not logged in, offline). */
async function accountId(soft: boolean): Promise<string | undefined> {
  if (soft && !isMock()) {
    try {
      if (!isConfigured(loadConfig(() => {}))) return undefined;
    } catch {
      return undefined;
    }
  }
  try {
    const me = await getMe(await getClient());
    return me.id.toString();
  } catch (e) {
    if (soft) return undefined;
    throw e;
  }
}

async function done(): Promise<void> {
  await disconnectClient();
}

// ---------- install ----------

async function takeSnapshot(sourceText: string, expect: string | undefined): Promise<Snapshot> {
  const source = parseSource(sourceText);
  if (source.type === 'github') {
    if (expect) throw usageError('--expect is for a local folder; pin a GitHub plugin with @<commit>');
    return fetchGithubSnapshot(source, pluginDeps.fetch, cliVersion());
  }
  const snap = readLocalSnapshot(source.path, cliVersion());
  if (expect && expect !== snap.revision) {
    throw new CliError(`The folder changed: its content is ${snap.revision}, not the expected ${expect}`, 'plugin_revision_mismatch', EXIT.ERROR, {
      hint: 'Check what changed in the folder, then install again.',
    });
  }
  return snap;
}

const installCommand = new Command('install')
  .description('Install a plugin from github:owner/repo[@ref] or a local folder; the user confirms in a terminal or dialog')
  .argument('<source>', 'github:owner/repo, github:owner/repo@tag-or-commit, or a folder such as ./my-plugin')
  .option('--expect <revision>', 'Local folder only: install only if its content hash is this sha256-… (from `plugin validate`)')
  .option('--json', 'Output as JSON')
  .action(async (sourceText: string, options: { expect?: string; json?: boolean }) => {
    const argv = ['plugin', 'install', sourceText, ...(options.expect ? ['--expect', options.expect] : [])];
    try {
      // Refused over MCP before anything is fetched (the classifier refuses it there too)
      if (process.env.TG_MCP || process.env.TG_READ_ONLY) throw humanRequired(argv);
      if (options.expect !== undefined && !/^sha256-[A-Za-z0-9+/]{43}=$/.test(options.expect)) throw usageError('--expect must be a sha256-… revision as `plugin validate` prints it');
      const snap = await takeSnapshot(sourceText, options.expect);
      const plugins = readLock().plugins;
      const existing = own(plugins, snap.manifest.name) ? plugins[snap.manifest.name] : undefined;
      if (existing) {
        throw new CliError(`Plugin "${snap.manifest.name}" is already installed (${existing.version}, ${originLabel(existing.source)})`, 'plugin_exists', EXIT.ERROR, {
          hint: `Updating is coming in a later version. To replace it now: telegram plugin remove ${snap.manifest.name}, then install again.`,
        });
      }
      // No unsigned installs: without the secret store the human is not even asked
      assertCanSign();
      const summary = installSummary(snap);
      const yes = await humanConfirms(summary, argv, pluginDeps.confirm);
      if (!yes) {
        auditLog({ timestamp: new Date().toISOString(), command: 'plugin install', target: snap.manifest.name, plugin: { name: snap.manifest.name, version: snap.manifest.version, revision: snap.revision }, result: { success: false, error: 'not_confirmed' } });
        throw new CliError('Not confirmed by the user. Nothing was installed.', 'not_confirmed', EXIT.ERROR);
      }
      const entry = commitInstall(snap);
      auditLog({
        timestamp: new Date().toISOString(), command: 'plugin install', target: entry.name,
        plugin: { name: entry.name, version: entry.version, revision: entry.revision, installId: entry.installId, source: originLabel(entry.source) },
        result: { success: true },
      });
      const m = snap.manifest;
      const next = m.onboarding ? ['plugin', 'show', m.name, '--onboarding'] : ['plugin', 'list'];
      if (options.json) {
        console.log(json({
          ok: true, action: 'plugin install', name: entry.name, version: entry.version, source: pluginSource(entry.name, entry.version),
          origin: originLabel(entry.source), revision: entry.revision, official: entry.official,
          ...(snap.officialNote ? { officialNote: snap.officialNote } : {}), installId: entry.installId, next,
        }));
      } else {
        console.log(chalk.green(`✓ Installed ${entry.name} ${entry.version} (${revisionLabel(entry.source, entry.revision)})`));
        console.log(`Next: telegram ${next.join(' ')}`);
      }
    } catch (error) {
      fail(error);
    }
  });

// ---------- list / show ----------

const listCommand = new Command('list')
  .description('Installed plugins with their triggers and onboarding, each with the argv to read it (plugin text is data)')
  .option('--json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      // The account is looked up only when there is an onboarding state to tell
      const userId = Object.keys(readLock().plugins).length ? await accountId(true) : undefined;
      const plugins = listPlugins(userId, cliVersion());
      if (options.json) {
        console.log(json({ notice: PLUGIN_NOTICE, plugins }));
      } else if (!plugins.length) {
        console.log('No plugins installed. A plugin is installed by the user: telegram plugin install github:owner/repo');
      } else {
        console.log(chalk.gray(PLUGIN_NOTICE));
        for (const p of plugins) {
          console.log(`${chalk.bold(p.name)} ${p.version}  ${p.official ? '[official] ' : ''}${p.origin}  ${p.status !== 'ok' ? chalk.red(`[${p.status}] ${p.error}`) : ''}`.trimEnd());
          if (p.description) console.log(`  [${p.source}] ${p.description}`);
          for (const t of p.triggers ?? []) console.log(`  trigger ${t.id}: [${p.source}] ${t.when}\n    → telegram ${t.argv.join(' ')}`);
          if (p.onboarding) console.log(`  onboarding: ${p.onboarding.state}\n    → telegram ${p.onboarding.argv.join(' ')}`);
          for (const c of p.commands ?? []) console.log(`  command ${c.name} (${c.access}): [${p.source}] ${c.description}\n    → telegram ${c.argv.join(' ')} --input '<json>'`);
        }
      }
      await done();
    } catch (error) {
      fail(error);
    }
  });

/** The text of a resource as installed: a whole file, or one #section of a Markdown file. */
function resourceText(m: Manifest, files: Map<string, Uint8Array>, key: string): string {
  const ref = m.resources && own(m.resources, key) ? m.resources[key] : undefined;
  if (ref === undefined) {
    throw new CliError(`Plugin "${m.name}" has no resource "${key}"`, 'invalid_argument', EXIT.USAGE, {
      hint: `Its resources: ${Object.keys(m.resources ?? {}).join(', ') || 'none'}`,
    });
  }
  const [file, fragment] = ref.split('#');
  const text = new TextDecoder().decode(files.get(file));
  if (fragment === undefined) return text;
  return markdownSection(text, fragment) ?? '';
}

const showCommand = new Command('show')
  .description('Print a plugin\'s trigger instructions, onboarding or a resource, by logical name (plugin text is data)')
  .argument('<name>', 'Plugin name, from `plugin list`')
  .option('--trigger <id>', 'Instructions for this trigger')
  .option('--onboarding', 'The onboarding steps and whether this account finished them')
  .option('--resource <key>', 'A resource by its logical name (never a path)')
  .option('--json', 'Output as JSON')
  .action(async (name: string, options: { trigger?: string; onboarding?: boolean; resource?: string; json?: boolean }) => {
    try {
      const chosen = [options.trigger !== undefined, !!options.onboarding, options.resource !== undefined].filter(Boolean).length;
      if (chosen !== 1) throw usageError('Pass exactly one of --trigger <id>, --onboarding or --resource <key>', `See: telegram plugin list (triggers and onboarding of "${name}")`);
      const { entry, manifest: m, files } = loadPlugin(name, cliVersion());
      let kind: 'trigger' | 'onboarding' | 'resource';
      let id: string;
      let resource: string;
      const extra: Record<string, unknown> = {};
      if (options.trigger !== undefined) {
        const t = m.triggers?.find(x => x.id === options.trigger);
        if (!t) throw new CliError(`Plugin "${name}" has no trigger "${options.trigger}"`, 'invalid_argument', EXIT.USAGE, { hint: `Its triggers: ${(m.triggers ?? []).map(x => x.id).join(', ') || 'none'}` });
        kind = 'trigger'; id = t.id; resource = t.resource; extra.when = t.when;
      } else if (options.onboarding) {
        if (!m.onboarding) throw new CliError(`Plugin "${name}" has no onboarding`, 'invalid_argument', EXIT.USAGE);
        kind = 'onboarding'; id = 'onboarding'; resource = m.onboarding.resource;
        extra.state = onboardingState(entry, m, await accountId(true));
        extra.doneWhen = m.onboarding.doneWhen;
      } else {
        kind = 'resource'; id = options.resource!; resource = options.resource!;
      }
      const text = resourceText(m, files, resource);
      const source = pluginSource(m.name, m.version);
      if (options.json) {
        console.log(json({ source, kind, id, ...extra, notice: PLUGIN_NOTICE, text }));
      } else {
        console.log(`[${source} ${kind}${kind === 'resource' ? ` ${id}` : kind === 'trigger' ? ` ${id}` : ''}${extra.state ? `, state: ${extra.state as string}` : ''}]`);
        console.log(`[${PLUGIN_NOTICE}]`);
        console.log(text);
      }
      await done();
    } catch (error) {
      fail(error);
    }
  });

// ---------- data ----------

const dataGetCommand = new Command('get')
  .description('Print data saved for a plugin and this Telegram account')
  .argument('<name>', 'Plugin name')
  .argument('<key>', 'Storage key')
  .option('--json', 'Output as JSON')
  .action(async (name: string, key: string, options: { json?: boolean }) => {
    try {
      const problem = dataKeyProblem(key);
      if (problem) throw usageError(problem);
      const { entry } = loadPlugin(name, cliVersion());
      const userId = (await accountId(false))!;
      const value = dataGet(entry, userId, key);
      if (value === undefined) {
        throw new CliError(`No data under "${key}" for plugin "${name}" on this account`, 'not_found', EXIT.ERROR, { hint: `telegram plugin data list ${name}` });
      }
      const text = new TextDecoder().decode(value);
      if (options.json) console.log(json({ plugin: name, key, bytes: value.length, value: text }));
      else process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
      await done();
    } catch (error) {
      fail(error);
    }
  });

const dataListCommand = new Command('list')
  .description('List the keys saved for a plugin and this Telegram account, with sizes and the quota')
  .argument('<name>', 'Plugin name')
  .option('--json', 'Output as JSON')
  .action(async (name: string, options: { json?: boolean }) => {
    try {
      const { entry, manifest } = loadPlugin(name, cliVersion());
      const userId = (await accountId(false))!;
      const items = dataList(entry, userId);
      const used = items.reduce((n, i) => n + i.bytes, 0);
      const quota = manifest.storage?.quotaBytes ?? DEFAULT_QUOTA_BYTES;
      if (options.json) console.log(json({ plugin: name, keys: manifest.storage?.keys ?? [], items, usedBytes: used, quotaBytes: quota }));
      else {
        if (!items.length) console.log(`No data saved for ${name} on this account. Keys it declares: ${(manifest.storage?.keys ?? []).join(', ') || 'none'}`);
        for (const i of items) console.log(`${i.key}  ${i.bytes} bytes  ${i.updatedAt}`);
        if (items.length) console.log(chalk.gray(`${used} of ${quota} bytes used`));
      }
      await done();
    } catch (error) {
      fail(error);
    }
  });

const dataSetCommand = new Command('set')
  .description('Save data for a plugin and this Telegram account (a local write: over MCP it follows the write mode)')
  .argument('<name>', 'Plugin name')
  .argument('<key>', 'Storage key the plugin declares')
  .argument('[value]', 'The value, or "-" to read it from stdin', '-')
  .option('--json', 'Output as JSON')
  .action(async (name: string, key: string, valueArg: string, options: { json?: boolean }) => {
    // Before anything else: over MCP this is a write, refused on the read tool and approved in mode "ask"
    await assertLocalWriteAllowed(undefined, { fixedDestination: true, readsStdin: valueArg === '-' });
    try {
      const problem = dataKeyProblem(key);
      if (problem) throw usageError(problem);
      const text = valueArg === '-' ? stdinBody(readStdinOnce()) : valueArg;
      if (!text) throw usageError('The value is empty', 'Pass the text on stdin with "-", or delete the key: telegram plugin data delete');
      const { entry, manifest } = loadPlugin(name, cliVersion());
      // An approval (mode "ask") covers this installation only, not one installed under the name since
      assertApprovedInstall(entry);
      const userId = (await accountId(false))!;
      const r = dataSet(entry, manifest, userId, key, new TextEncoder().encode(text));
      auditLog({
        timestamp: new Date().toISOString(), command: 'plugin data set', target: name,
        plugin: { name, version: entry.version, revision: entry.revision, installId: entry.installId, key, bytes: r.bytes },
        result: { success: true },
      });
      if (options.json) console.log(json({ ok: true, action: 'plugin data set', plugin: name, key, ...r }));
      else console.log(chalk.green(`✓ Saved ${key} for ${name} (${r.bytes} bytes; ${r.usedBytes} of ${r.quotaBytes} used)`));
      await done();
    } catch (error) {
      fail(error);
    }
  });

const dataDeleteCommand = new Command('delete')
  .description('Delete data saved for a plugin and this Telegram account (a local write)')
  .argument('<name>', 'Plugin name')
  .argument('<key>', 'Storage key')
  .option('--json', 'Output as JSON')
  .action(async (name: string, key: string, options: { json?: boolean }) => {
    await assertLocalWriteAllowed(undefined, { fixedDestination: true });
    try {
      const problem = dataKeyProblem(key);
      if (problem) throw usageError(problem);
      const { entry } = loadPlugin(name, cliVersion());
      assertApprovedInstall(entry);
      const userId = (await accountId(false))!;
      if (!dataDelete(entry, userId, key)) throw new CliError(`No data under "${key}" for plugin "${name}" on this account`, 'not_found', EXIT.ERROR);
      auditLog({
        timestamp: new Date().toISOString(), command: 'plugin data delete', target: name,
        plugin: { name, version: entry.version, revision: entry.revision, installId: entry.installId, key },
        result: { success: true },
      });
      if (options.json) console.log(json({ ok: true, action: 'plugin data delete', plugin: name, key }));
      else console.log(chalk.green(`✓ Deleted ${key} of ${name}`));
      await done();
    } catch (error) {
      fail(error);
    }
  });

const dataCommand = new Command('data')
  .description('Data the agent saves for a plugin, per Telegram account')
  .addCommand(dataGetCommand)
  .addCommand(dataListCommand)
  .addCommand(dataSetCommand)
  .addCommand(dataDeleteCommand);

// ---------- run / dev ----------

/**
 * Cancels a run: SIGTERM/SIGINT (the MCP server stops its child that way), or the MCP server's
 * "tg-cancel" message when this call runs in its worker thread.
 */
function cancellation(): { signal: AbortSignal; cancelled?: () => boolean } {
  const ac = new AbortController();
  const stop = () => ac.abort();
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  if (isMainThread) return { signal: ac.signal };
  parentPort?.on('message', (m: unknown) => { if (m === 'tg-cancel') stop(); });
  // The server's flag in shared memory reaches a run whose code keeps this thread busy, too
  const flag = (workerData as { tgCancel?: unknown } | null)?.tgCancel;
  const shared = flag instanceof SharedArrayBuffer ? new Int32Array(flag) : undefined;
  return { signal: ac.signal, ...(shared ? { cancelled: () => Atomics.load(shared, 0) === 1 } : {}) };
}

/**
 * The installation's data for this Telegram account, through the same store as `plugin data`. A
 * plugin run's writes hold to its deadline and cancellation, while waiting for the lock and right
 * before the file changes.
 */
function installStorage(entry: LockEntry, m: Manifest, userId: string): StorageBackend {
  return {
    get: key => {
      const v = dataGet(entry, userId, key);
      return v === undefined ? undefined : new TextDecoder().decode(v);
    },
    list: () => dataList(entry, userId),
    set: (key, value, guard) => dataSetGuarded(entry, m, userId, key, new TextEncoder().encode(value), guard),
    delete: (key, guard) => dataDeleteGuarded(entry, userId, key, guard),
  };
}

/** The installation's cursor state: a private folder of the host, not plugin data. */
function installCursors(entry: LockEntry): CursorStore {
  return { save: state => cursorSave(entry, state), load: id => cursorLoad(entry, id) };
}

/**
 * Prints exactly the JSON whose length was checked against the output limit (null kept, as the
 * output schema sees it): never re-serialized, never formatJson(). The same line with or without
 * --json, so an indented copy can never outgrow the limit.
 */
/**
 * Over MCP the server names the installation it classified `plugin run` by (TG_PLUGIN_EXPECT,
 * installId and revision). Another one installed meanwhile under the same name is refused before
 * anything of it runs: its command may have other effects than the ones the call was routed and
 * approved for. A call over MCP without the variable is refused too (the server always sets it
 * when it found the plugin; when it did not, nothing was classified to run).
 */
function assertExpectedInstall(entry: LockEntry): void {
  const expected = process.env.TG_PLUGIN_EXPECT;
  const overMcp = !!(process.env.TG_MCP || process.env.TG_READ_ONLY);
  if (expected === undefined && !overMcp) return;
  if (expected !== `${entry.installId} ${entry.revision}`) {
    throw new CliError(`Plugin "${entry.name}" changed after this call was checked (installation ${entry.installId}); nothing was run`, 'plugin_changed', EXIT.ERROR, {
      hint: 'Call the command again: it is checked against the plugin installed now.',
    });
  }
}

function printOutcome(outcome: RunOutcome): void {
  console.log(outcome.json);
}

interface RunOptions { input?: string; target?: string; thread?: boolean; json?: boolean }

function runOptions(c: Command): Command {
  return c
    .option('--input <json>', 'The command\'s input: a JSON object, or "-" to read it from stdin')
    .option('--target <ref>', 'What the plugin may read (messages:read-target): <chat>:<msgId>, or <chat>@<topic>; chat is an ID or @username')
    .option('--thread', 'With --target <chat>:<msgId>: that message\'s thread instead of the message alone')
    .option('--json', 'Output as one JSON line (the output is that line with or without it)');
}

const runCommand = runOptions(new Command('run')
  .description('Run a command of an installed plugin in its sandbox; prints {data, proposals}. A command with effects is a local write')
  .argument('<name>', 'Plugin name')
  .argument('<command>', 'Command name, from `plugin list`'))
  .action(async (name: string, cmd: string, options: RunOptions) => {
    const calls: string[] = [];
    let entry: LockEntry | undefined;
    let proposals: string[] = [];
    let error: string | undefined = 'error';
    try {
      // The verified snapshot, read once: these bytes run, whatever happens to the folder meanwhile
      const loaded = loadPlugin(name, cliVersion());
      entry = loaded.entry;
      // Over MCP: only the installation this call was classified (and approved) by, whatever its effects now
      assertExpectedInstall(entry);
      const m = loaded.manifest;
      const c = findCommand(m, cmd);
      assertRunnable(m, c);
      const target = parseTarget(options.target, !!options.thread);
      if (target && !(m.permissions ?? []).includes('messages:read-target')) {
        throw usageError(`Plugin "${name}" reads no target (it lacks the permission messages:read-target); drop --target`);
      }
      const fromStdin = options.input === '-';
      const input = parseInput(fromStdin ? stdinBody(readStdinOnce()) : options.input);
      checkInput(c, input);
      if (c.effects.length) {
        // A local write: over MCP it follows the write mode (refused when read-only, approved in
        // "ask"), and an approval covers this installation and snapshot only
        await assertLocalWriteAllowed(undefined, { fixedDestination: true, readsStdin: fromStdin });
        assertApprovedInstall(entry);
      }
      let client: Promise<TelegramClient> | undefined;
      const telegram = () => (client ??= getClient().then(tg => {
        // A plugin call never sleeps through a FLOOD_WAIT: it gets the error with its cursor
        (tg as unknown as { floodSleepThreshold: number }).floodSleepThreshold = 0;
        return tg;
      }));
      let me: Promise<string> | undefined;
      // Fetched on first use, inside the run and its deadline: connecting and getMe count against it
      const account = () => (me ??= telegram().then(tg => getMe(tg)).then(u => u.id.toString()));
      const installed = entry;
      const outcome = await runPluginCommand({
        manifest: m, command: c, code: new TextDecoder().decode(loaded.files.get(m.main!)), filename: m.main!, input,
        client: telegram, account, storage: async () => installStorage(installed, m, await account()),
        cursors: installCursors(installed), installId: installed.installId, target,
        mcp: !!(process.env.TG_MCP || process.env.TG_READ_ONLY), ...cancellation(),
      }, calls);
      proposals = outcome.envelope.proposals.map(p => p.type);
      error = undefined;
      printOutcome(outcome);
      await done();
    } catch (e) {
      // The write guard's own exits (describe run, approval_required, writes off): no run happened
      if (e instanceof ExitSignal) entry = undefined;
      error = e instanceof CliError ? e.code : 'error';
      fail(e);
    } finally {
      if (entry) {
        auditLog({
          timestamp: new Date().toISOString(), command: 'plugin run', target: name,
          plugin: { name, version: entry.version, revision: entry.revision, installId: entry.installId, command: cmd, apis: [...new Set(calls)], proposals },
          result: { success: !error, ...(error ? { error } : {}) },
        });
      }
    }
  });

const devCommand = runOptions(new Command('dev')
  .description('For plugin authors: run a command of a plugin folder against the mock account (--mock); nothing is installed, asked or written')
  .argument('<dir>', 'Plugin folder (holds tg-plugin.json)')
  .argument('<command>', 'Command name')
  .option('--mock', 'Telegram, storage and settings are mocked (the only mode of plugin dev)'))
  .action(async (dir: string, cmd: string, options: RunOptions & { mock?: boolean }) => {
    try {
      if (process.env.TG_MCP || process.env.TG_READ_ONLY) throw new CliError('"plugin dev" is for plugin authors in a terminal, not over MCP', 'not_available', EXIT.ERROR);
      if (!options.mock) throw usageError('plugin dev runs only with --mock', `For a check on the real account install the folder: telegram plugin install ${dir}`);
      // Every check install runs, then the bytes read here
      const snap = readLocalSnapshot(dir, cliVersion());
      const m = snap.manifest;
      const c = findCommand(m, cmd);
      assertRunnable(m, c);
      const target = parseTarget(options.target, !!options.thread);
      const input = parseInput(options.input === '-' ? stdinBody(readStdinOnce()) : options.input);
      checkInput(c, input);
      // The built-in mock account in memory: never the profile, its session or its secret store
      const { MockClient } = await import('../mock/client.js');
      const { seedWorld } = await import('../mock/world.js');
      const world = seedWorld();
      const client = new MockClient(world) as unknown as TelegramClient;
      const storage = memoryStorage(m);
      const log = devLog(m.name);
      const outcome = await runPluginCommand({
        manifest: m, command: c, code: new TextDecoder().decode(snap.files.get(m.main!)), filename: m.main!, input,
        client: async () => client, account: async () => String(world.me), storage: async () => storage,
        cursors: memoryCursors(), installId: 'plugin-dev', target,
        mcp: false, log: log.write, ...cancellation(),
      });
      printOutcome(outcome);
    } catch (e) {
      fail(e);
    }
  });

// ---------- remove / validate ----------

const removeCommand = new Command('remove')
  .description('Remove a plugin and its data (--keep-data keeps the data); the user confirms in a terminal or dialog')
  .argument('<name>', 'Plugin name')
  .option('--keep-data', 'Keep its saved data (a new install of the same name does not see it: it is a new installation)')
  .option('--json', 'Output as JSON')
  .action(async (name: string, options: { keepData?: boolean; json?: boolean }) => {
    const argv = ['plugin', 'remove', name, ...(options.keepData ? ['--keep-data'] : [])];
    try {
      if (process.env.TG_MCP || process.env.TG_READ_ONLY) throw humanRequired(argv);
      const entry = findEntry(name);
      const question = removeQuestion(entry, !!options.keepData);
      if (!(await humanConfirms(question, argv, pluginDeps.confirm))) throw new CliError('Not confirmed by the user. Nothing was removed.', 'not_confirmed', EXIT.ERROR);
      // Under the lock, and only if this is still the installation the human was shown
      removeInstall(entry, !!options.keepData);
      auditLog({
        timestamp: new Date().toISOString(), command: 'plugin remove', target: name,
        plugin: { name, version: entry.version, revision: entry.revision, installId: entry.installId, keepData: !!options.keepData },
        result: { success: true },
      });
      if (options.json) console.log(json({ ok: true, action: 'plugin remove', name, keepData: !!options.keepData }));
      else console.log(chalk.green(`✓ Removed ${name}${options.keepData ? ' (data kept)' : ''}`));
    } catch (error) {
      fail(error);
    }
  });

const validateCommand = new Command('validate')
  .description('Check a plugin folder: manifest schema, paths, files, sizes, SKILL.md frontmatter; prints its content revision')
  .argument('<dir>', 'Plugin folder (holds tg-plugin.json)')
  .option('--json', 'Output as JSON')
  .action(async (dir: string, options: { json?: boolean }) => {
    try {
      // Every check install runs: schema, rules, paths, links, sizes, SKILL.md, resource sections
      const snap = readLocalSnapshot(dir, cliVersion());
      const m = snap.manifest;
      const result = {
        ok: true, name: m.name, version: m.version, specVersion: snap.specVersion, revision: snap.revision,
        files: snap.files.size, bytes: snap.bytes,
        install: ['plugin', 'install', dir, '--expect', snap.revision],
      };
      if (options.json) console.log(json(result));
      else {
        console.log(chalk.green(`✓ ${m.name} ${m.version} is a valid plugin (spec ${snap.specVersion}, ${snap.files.size} files, ${snap.bytes} bytes)`));
        console.log(`Revision: ${snap.revision}`);
        console.log(`Install exactly this content: ${shellCommand(result.install)}`);
      }
    } catch (error) {
      fail(error);
    }
  });

export const pluginCommand = new Command('plugin')
  .description('Plugins: instructions and resources that extend the agent (install and remove are the user\'s)')
  .addCommand(listCommand)
  .addCommand(showCommand)
  .addCommand(dataCommand)
  .addCommand(runCommand)
  .addCommand(installCommand)
  .addCommand(removeCommand)
  .addCommand(validateCommand)
  .addCommand(devCommand);
