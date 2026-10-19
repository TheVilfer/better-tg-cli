#!/usr/bin/env node
// API coverage for issue #47: how much of the Telegram client API Better-TG-CLI reaches.
//
//   node scripts/api-coverage.mjs                regenerate docs/api-coverage.md
//   node scripts/api-coverage.mjs --check         fail if docs/api-coverage.md is out of date, or
//                                                 if either coverage metric is below the minimum
//   node scripts/api-coverage.mjs --min 90        only the coverage gate (no report written/compared)
//   node scripts/api-coverage.mjs --json          print the two metrics as JSON
//
// Coverage gate (CI, `npm run coverage:api`): both metrics must be >= the minimum percentage
// (default 90; `--min <n>` or env API_COVERAGE_MIN), otherwise exit 1:
//  - reachability: TL schema methods reachable (via `api` + dedicated commands) / all TL methods
//  - Telethon accounting: Telethon 1.45.0 TelegramClient members (scripts/data/…tsv, plus the raw
//    client(request) call) mapped below to a built command, library plumbing or a documented
//    exclusion / all members. A member missing from the table, or mapped to a command whose file
//    does not exist yet, is unaccounted. `--telethon-tsv <path>` swaps the member list (tests).
//
// Two measures, both written into the report:
//  1. Issue #47 (primary): every `extends Request<…>` in teleproto's tl/generated/api.d.ts is a
//     TL method. "reached" = dedicated code that invokes it — a `new Api.<ns>.<Method>(` in src/
//     (scanned) plus the methods behind the teleproto high-level client helpers the CLI calls
//     (a hand-kept list; the issue treats this group as ±5). The generic `api` command, once
//     present, makes 100% of methods *reachable* in one step; that is reported separately from
//     the dedicated per-namespace coverage.
//  2. Telethon 1.45.0 TelegramClient parity (secondary): every public member of Telethon's
//     TelegramClient mapped to a CLI command, a covered library helper, or a documented exclusion.
//     The mapping table is embedded here; the member list it must cover is
//     scripts/data/telethon-1.45.0-client-methods.tsv (name, sync/async, module).

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DTS = join(root, 'node_modules/teleproto/tl/generated/api.d.ts');
const REPORT = join(root, 'docs/api-coverage.md');
const TELETHON_TSV = join(root, 'scripts/data/telethon-1.45.0-client-methods.tsv');
/** Not a named TelegramClient member, but counted: Telethon's raw client(request) call. */
const RAW_CALL = '__call__ (raw request)';
const DEFAULT_MIN = 90;

// ---- 1. the schema: every TL method, by namespace ---------------------------------------------

/** All request classNames (`<ns>.<Method>` or a bare top-level wrapper). */
function schemaMethods() {
  const lines = readFileSync(DTS, 'utf8').split('\n');
  const methods = new Set();
  let inRequest = false;
  for (const line of lines) {
    // Api.Message / Api.MessageService are tagged classType:"request" by mistake (they extend
    // CustomMessage, not Request); keying off `extends Request<` skips them and yields 823.
    if (/export class \w+ extends Request</.test(line)) inRequest = true;
    else if (inRequest) {
      const m = line.match(/className: "([^"]+)"/);
      if (m) { methods.add(m[1]); inRequest = false; }
    }
  }
  return methods;
}

const namespaceOf = (name) => (name.includes('.') ? name.split('.')[0] : '(top level)');

// ---- 2. what src/ reaches ---------------------------------------------------------------------

/** Every `new Api.<ns>.<Method>(` / `new Api.<Method>(` in src/ that names a real request. */
function directlyUsed(methods) {
  const top = new Set([...methods].filter((m) => !m.includes('.')));
  const used = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.ts')) {
        const text = readFileSync(p, 'utf8');
        for (const m of text.matchAll(/new Api\.([A-Za-z]+)\.([A-Za-z0-9]+)\(/g)) {
          const name = `${m[1]}.${m[2]}`;
          if (methods.has(name)) used.add(name);
        }
        for (const m of text.matchAll(/new Api\.([A-Za-z0-9]+)\(/g)) {
          if (top.has(m[1])) used.add(m[1]);
        }
      }
    }
  };
  walk(join(root, 'src'));
  return used;
}

/**
 * Methods reached only through teleproto's high-level client helpers (getDialogs, sendMessage,
 * sendFile, downloadMedia, login, updates…) — no literal `new Api.*` in src/, so the scanner
 * can't see them. Kept by hand, as the issue did (treat this group as ±5).
 */
const HELPER_REACHED = [
  'auth.CheckPassword', 'auth.ExportAuthorization', 'auth.ExportLoginToken', 'auth.ImportAuthorization',
  'auth.ImportLoginToken', 'auth.LogOut', 'auth.SendCode', 'auth.SignIn',
  'channels.DeleteMessages', 'channels.GetChannels', 'channels.GetMessages', 'channels.ReadHistory',
  'contacts.ResolveUsername', 'help.GetConfig',
  'messages.DeleteMessages', 'messages.EditMessage', 'messages.ForwardMessages', 'messages.GetChats',
  'messages.GetDialogs', 'messages.GetHistory', 'messages.GetMessages', 'messages.GetPeerDialogs',
  'messages.ReadHistory', 'messages.SendMessage', 'messages.UnpinAllMessages', 'messages.UpdatePinnedMessage',
  'messages.UploadMedia',
  'updates.GetChannelDifference', 'updates.GetDifference', 'updates.GetState',
  'upload.GetFile', 'upload.SaveBigFilePart', 'upload.SaveFilePart', 'users.GetUsers',
];

/** Does the generic `api` command exist? If so, every method is reachable in one step. */
const hasGenericApi = () => existsSync(join(root, 'src/commands/api.ts'));

// ---- namespace notes (from issue #47) ---------------------------------------------------------

const NOTES = {
  messages: 'Core. Sending, history, search, reactions, drafts, scheduled, pin/mark-unread, invite links.',
  account: 'Privacy, sessions, 2FA, notifications, usernames, business/profile. Mostly via `api` (read) + curated.',
  payments: 'Stars, gifts, invoices. Read parts via `api` (balance/transactions); paying is always refused.',
  channels: 'Admin log, title/about/photo, slow mode, forum topics, invite links, username, discussion links.',
  phone: 'Calls and group calls. Out of scope for a CLI (reachable via `api`, undocumented).',
  bots: 'Mostly bot-only. User-side bits (bot info, menu, commands) via `api`.',
  stories: 'Peer stories covered; feeds/views/reactions/posting via `api`.',
  auth: 'Login/logout covered; recovery and token management via `api`.',
  contacts: 'Add/block/resolve covered; search, import, top peers, blocked list via `api` + curated.',
  help: 'Client plumbing; readable facts (terms, countries) via `api`.',
  '(top level)': 'InvokeWithLayer/InvokeAfterMsg… transport wrappers, not features. Excluded.',
  stickers: 'Sticker-set authoring. Out of scope (reachable via `api`).',
  chatlists: 'Shared folders. Via `api`.',
  communities: 'New layer. Via `api`.',
  upload: 'File-transfer plumbing, covered by send-file/download.',
  stats: 'Channel/group statistics. Via `api` + curated `stats`.',
  ephemeral: 'New layer. Via `api`.',
  users: 'Covered for what the CLI needs.',
  smsjobs: 'SMS relay programme. Out of scope.',
  aicompose: 'New layer. Via `api`.',
  photos: 'Profile photos: list/delete/reorder via `api` + curated.',
  langpack: 'Client localisation. Out of scope.',
  premium: 'Boosts. Via `api`.',
  updates: 'Fully used (by `watch`).',
  folders: 'Fully used (archive).',
  fragment: 'Collectible info. Via `api`.',
};

// Namespace display order (same as the issue: by method count, then the full-coverage tail).
const NS_ORDER = [
  'messages', 'account', 'payments', 'channels', 'phone', 'bots', 'stories', 'auth', 'contacts',
  'help', '(top level)', 'stickers', 'chatlists', 'communities', 'upload', 'stats', 'ephemeral',
  'users', 'smsjobs', 'aicompose', 'photos', 'langpack', 'premium', 'updates', 'folders', 'fragment',
];

// ---- Telethon 1.45.0 TelegramClient parity (embedded) -----------------------------------------
// kind: 'cli' (a dedicated command), 'lib' (covered by library/plumbing we drive), 'excluded'.
// For 'cli', field 4 is the primary command name — if that command's source file is one of the
// PLANNED ones below and does not exist yet, the row is reported as ⏳ planned instead of ✅.
const TELETHON = [
  ['action', 'chats', 'cli', 'typing', '`typing` (chat action)'],
  ['add_event_handler', 'updates', 'excluded', '', 'library plumbing (used internally by `watch`)'],
  ['build_reply_markup', 'buttons', 'excluded', '', 'library helper, no CLI meaning'],
  ['catch_up', 'updates', 'excluded', '', 'library plumbing (update loop)'],
  ['connect', 'telegrambaseclient', 'excluded', '', 'library plumbing (connection)'],
  ['conversation', 'dialogs', 'excluded', '', 'interactive helper, no CLI meaning'],
  ['delete_dialog', 'dialogs', 'cli', 'delete-dialog', '`delete-dialog`'],
  ['delete_messages', 'messages', 'cli', 'delete', '`delete`'],
  ['disconnect', 'telegrambaseclient', 'excluded', '', 'library plumbing (connection)'],
  ['disconnected', 'telegrambaseclient', 'excluded', '', 'property, library plumbing'],
  ['download_file', 'downloads', 'cli', 'download', '`download`'],
  ['download_media', 'downloads', 'cli', 'download', '`download`'],
  ['download_profile_photo', 'downloads', 'cli', 'avatar', '`avatar`'],
  ['edit_2fa', 'auth', 'excluded', '', 'changes the account 2FA password — refused (security)'],
  ['edit_admin', 'chats', 'cli', 'promote', '`promote`'],
  ['edit_folder', 'dialogs', 'cli', 'archive', '`archive` / `unarchive`'],
  ['edit_message', 'messages', 'cli', 'edit', '`edit`'],
  ['edit_permissions', 'chats', 'cli', 'edit-permissions', '`edit-permissions` (default & per-user rights)'],
  ['end_takeout', 'account', 'excluded', '', 'data-export session — via `api` if ever needed'],
  ['flood_sleep_threshold', 'telegrambaseclient', 'excluded', '', 'property, library plumbing'],
  ['forward_messages', 'messages', 'cli', 'forward', '`forward`'],
  ['get_admin_log', 'chats', 'cli', 'admin-log', '`admin-log`'],
  ['get_dialogs', 'dialogs', 'cli', 'chats', '`chats` / `inbox`'],
  ['get_drafts', 'dialogs', 'cli', 'drafts', '`drafts`'],
  ['get_entity', 'users', 'cli', 'info', '`info` / `contact` (resolution)'],
  ['get_input_entity', 'users', 'lib', '', 'resolution plumbing used by every command'],
  ['get_me', 'users', 'cli', 'whoami', '`whoami`'],
  ['get_messages', 'messages', 'cli', 'read', '`read` / `get`'],
  ['get_participants', 'chats', 'cli', 'members', '`members`'],
  ['get_peer_id', 'users', 'lib', '', 'IDs are shown everywhere; resolution plumbing'],
  ['get_permissions', 'chats', 'cli', 'permissions', '`permissions <chat> <user>`'],
  ['get_profile_photos', 'chats', 'cli', 'profile-photos', '`profile-photos`'],
  ['get_stats', 'chats', 'cli', 'stats', '`stats` (incl. `stats <chat> --message <id>`)'],
  ['inline_query', 'bots', 'cli', 'inline', '`inline`'],
  ['is_bot', 'users', 'cli', 'info', '`info` / `contact` report the bot flag'],
  ['is_connected', 'telegrambaseclient', 'excluded', '', 'property, library plumbing'],
  ['is_user_authorized', 'users', 'cli', 'check', '`check`'],
  ['iter_admin_log', 'chats', 'cli', 'admin-log', '`admin-log`'],
  ['iter_dialogs', 'dialogs', 'cli', 'chats', '`chats`'],
  ['iter_download', 'downloads', 'cli', 'download', '`download`'],
  ['iter_drafts', 'dialogs', 'cli', 'drafts', '`drafts`'],
  ['iter_messages', 'messages', 'cli', 'read', '`read`'],
  ['iter_participants', 'chats', 'cli', 'members', '`members`'],
  ['iter_profile_photos', 'chats', 'cli', 'profile-photos', '`profile-photos`'],
  ['kick_participant', 'chats', 'cli', 'kick', '`kick`'],
  ['list_event_handlers', 'updates', 'excluded', '', 'library plumbing'],
  ['log_out', 'auth', 'cli', 'logout', '`logout`'],
  ['loop', 'telegrambaseclient', 'excluded', '', 'property, library plumbing'],
  ['on', 'updates', 'excluded', '', 'decorator, library plumbing'],
  ['parse_mode', 'messages', 'excluded', '', 'property; `send`/`reply` take `--html` / `--md`'],
  ['pin_message', 'messages', 'cli', 'pin', '`pin`'],
  ['qr_login', 'auth', 'cli', 'auth', '`auth --qr`'],
  ['remove_event_handler', 'updates', 'excluded', '', 'library plumbing'],
  ['run_until_disconnected', 'updates', 'cli', 'watch', '`watch`'],
  ['send_code_request', 'auth', 'cli', 'auth', '`auth`'],
  ['send_file', 'uploads', 'cli', 'send-file', '`send-file`'],
  ['send_message', 'messages', 'cli', 'send', '`send` / `reply`'],
  ['send_read_acknowledge', 'messages', 'cli', 'mark-read', '`mark-read`'],
  ['set_proxy', 'telegrambaseclient', 'excluded', '', 'library plumbing'],
  ['set_receive_updates', 'updates', 'excluded', '', 'library plumbing'],
  ['sign_in', 'auth', 'cli', 'auth', '`auth`'],
  ['sign_up', 'auth', 'excluded', '', 'creating a brand-new account — out of scope'],
  ['start', 'auth', 'cli', 'auth', '`auth` / `onboard`'],
  ['takeout', 'account', 'excluded', '', 'data-export session — via `api` if ever needed'],
  ['unpin_message', 'messages', 'cli', 'unpin', '`unpin`'],
  ['upload_file', 'uploads', 'lib', '', 'upload plumbing driven by `send-file`'],
  // Telethon's raw client(request) / __call__: not a named member, but the single most important
  // one — invoking any TL request. This is exactly the generic `api` command.
  ['__call__ (raw request)', 'core', 'cli', 'api', '`api <namespace.Method> --params` (generic)'],
];

/** New commands this effort adds — reported ✅ once their source file lands, ⏳ planned before. */
const PLANNED = {
  'delete-dialog': 'src/commands/dialog.ts',
  permissions: 'src/commands/permissions.ts',
  'admin-log': 'src/commands/admin-log.ts',
  drafts: 'src/commands/drafts.ts',
  'profile-photos': 'src/commands/profile-photos.ts',
  api: 'src/commands/api.ts',
};

/** ✅ for a built command, ⏳ for one still planned (file not present yet). */
function cliStatus(cmd) {
  const planned = PLANNED[cmd];
  if (planned && !existsSync(join(root, planned))) return 'planned';
  return 'cli';
}

// ---- the two gated metrics ---------------------------------------------------------------------

/** Public TelegramClient member names from the committed Telethon 1.45.0 list, plus the raw call. */
function telethonMembers(tsvPath = TELETHON_TSV) {
  const names = readFileSync(tsvPath, 'utf8').split('\n').map((l) => l.split('\t')[0].trim()).filter(Boolean);
  return [...new Set([...names, RAW_CALL])];
}

/** Reachability and Telethon accounting, as counts and percentages. */
function metrics(tsvPath = TELETHON_TSV) {
  const methods = schemaMethods();
  const reached = new Set([...directlyUsed(methods), ...HELPER_REACHED.filter((m) => methods.has(m))]);
  const reachable = hasGenericApi() ? methods.size : reached.size;

  const rows = new Map(TELETHON.map(([name, , kind, cmd]) => [name, kind === 'cli' ? cliStatus(cmd) : kind]));
  const members = telethonMembers(tsvPath);
  const unaccounted = members.filter((m) => !rows.has(m) || rows.get(m) === 'planned');
  const stale = [...rows.keys()].filter((m) => !members.includes(m));

  const pct = (a, b) => (b === 0 ? 0 : (a / b) * 100);
  return {
    reachability: { reachable, total: methods.size, pct: pct(reachable, methods.size) },
    telethon: {
      accounted: members.length - unaccounted.length, total: members.length,
      pct: pct(members.length - unaccounted.length, members.length), unaccounted, stale,
    },
  };
}

/** Fails (returns false) when either metric is strictly below `min` percent. */
function gate(min, tsvPath) {
  const { reachability: r, telethon: t } = metrics(tsvPath);
  const fmt = (x) => `${(Math.floor(x * 10) / 10).toFixed(1)}%`;
  let ok = true;
  const out = [];
  const line = (name, a, b, p) => {
    const pass = p >= min;
    ok &&= pass;
    out.push(`${pass ? 'ok  ' : 'FAIL'} ${name}: ${a}/${b} = ${fmt(p)} (minimum ${min}%)`);
  };
  line('API reachability (TL schema methods)', r.reachable, r.total, r.pct);
  line('Telethon 1.45.0 TelegramClient accounting', t.accounted, t.total, t.pct);
  if (t.unaccounted.length) out.push(`     unaccounted Telethon members: ${t.unaccounted.join(', ')}`);
  if (t.stale.length) out.push(`     note: mapped but not in the Telethon list: ${t.stale.join(', ')}`);
  if (!ok) out.push(`API coverage is below the ${min}% minimum. Add commands/mappings (scripts/api-coverage.mjs), or see docs/api-coverage.md.`);
  (ok ? console.log : console.error)(out.join('\n'));
  return ok;
}

// ---- build the report -------------------------------------------------------------------------

function build() {
  const methods = schemaMethods();
  const reached = new Set([...directlyUsed(methods), ...HELPER_REACHED.filter((m) => methods.has(m))]);
  const generic = hasGenericApi();

  const perNs = new Map();
  for (const m of methods) {
    const ns = namespaceOf(m);
    const e = perNs.get(ns) ?? { total: 0, reached: 0 };
    e.total += 1;
    if (reached.has(m)) e.reached += 1;
    perNs.set(ns, e);
  }

  const order = [...NS_ORDER.filter((n) => perNs.has(n)), ...[...perNs.keys()].filter((n) => !NS_ORDER.includes(n))];
  const totalMethods = methods.size;
  const totalReached = reached.size;
  const reachablePct = generic ? 100 : Math.round((totalReached / totalMethods) * 100);

  const pct = (a, b) => (b === 0 ? '—' : `${Math.round((a / b) * 100)}%`);

  const lines = [];
  lines.push('# Telegram client API coverage');
  lines.push('');
  lines.push('<!-- Generated by scripts/api-coverage.mjs. Do not edit by hand; run `node scripts/api-coverage.mjs`. -->');
  lines.push('');
  lines.push('Tracks issue #47. Two measures:');
  lines.push('');
  lines.push('- **Reachability** — can a given TL method be invoked at all? The generic `api` command');
  lines.push('  builds and sends any request from the schema, so every method is reachable in one step.');
  lines.push('- **Dedicated coverage** — does a purpose-built command/helper expose the method with stable,');
  lines.push('  compact output? This is the long tail, tracked per namespace below.');
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`- TL schema methods (teleproto \`tl/generated/api.d.ts\`, \`extends Request<…>\`): **${totalMethods}**`);
  lines.push(`- Reachable today: **${generic ? totalMethods : totalReached} (${reachablePct}%)** ${generic ? '— via the generic `api` command plus every dedicated command' : '— no generic command yet; only dedicated commands reach the API'}`);
  lines.push(`- Dedicated (purpose-built) coverage: **${totalReached} (${pct(totalReached, totalMethods)})** — ${[...directlyUsed(methods)].length} called directly in src/, ${HELPER_REACHED.filter((m) => methods.has(m)).length} through teleproto client helpers`);
  lines.push('');
  lines.push(`CI gate (\`npm run coverage:api\`, also enforced by \`npm test\`): reachability and Telethon`);
  lines.push(`accounting (section 2) must each stay at or above **${DEFAULT_MIN}%** (\`--min <n>\` / \`API_COVERAGE_MIN\`).`);
  lines.push('');
  lines.push('## 1. Issue #47 measure: dedicated coverage by namespace');
  lines.push('');
  lines.push('| Namespace | Methods | Dedicated | Share | Notes |');
  lines.push('|---|---:|---:|---:|---|');
  for (const ns of order) {
    const e = perNs.get(ns);
    lines.push(`| \`${ns}\` | ${e.total} | ${e.reached} | ${pct(e.reached, e.total)} | ${NOTES[ns] ?? ''} |`);
  }
  lines.push(`| **total** | **${totalMethods}** | **${totalReached}** | **${pct(totalReached, totalMethods)}** | ${generic ? 'Reachability is 100% via `api`.' : 'No generic `api` command yet.'} |`);
  lines.push('');
  lines.push('> "Dedicated" counts a `new Api.<ns>.<Method>(` in src/ or a method behind a teleproto');
  lines.push('> high-level client helper the CLI calls. Treat the helper group as ±5, as the issue does.');
  lines.push('');

  // Telethon parity — resolve 'cli' into built vs planned
  const telRows = TELETHON.map(([name, mod, kind, cmd, maps]) => ({
    name, mod, maps, status: kind === 'cli' ? cliStatus(cmd) : kind,
  }));
  const telCli = telRows.filter((t) => t.status === 'cli').length;
  const telApi = telRows.filter((t) => t.status === 'api').length;
  const telPlanned = telRows.filter((t) => t.status === 'planned').length;
  const telLib = telRows.filter((t) => t.status === 'lib').length;
  const telExcl = telRows.filter((t) => t.status === 'excluded').length;
  lines.push('## 2. Telethon 1.45.0 `TelegramClient` parity');
  lines.push('');
  lines.push(`Every public member of Telethon 1.45.0's \`TelegramClient\` (plus its raw \`client(request)\`),`);
  lines.push(`mapped to a CLI command, a covered library helper, or a documented exclusion.`);
  lines.push('The member list is `scripts/data/telethon-1.45.0-client-methods.tsv`.');
  lines.push('');
  lines.push(`- Covered by a dedicated command: **${telCli}**`);
  if (telApi) lines.push(`- Reachable through the generic \`api\` command: **${telApi}**`);
  if (telPlanned) lines.push(`- Mapped to a command still being built: **${telPlanned}**`);
  lines.push(`- Covered as library/plumbing we drive: **${telLib}**`);
  lines.push(`- Deliberately excluded: **${telExcl}**`);
  const tel = metrics().telethon;
  lines.push(`- **Total members mapped: ${tel.accounted}** (${tel.total - tel.accounted} unaccounted for)`);
  lines.push('');
  lines.push('| Telethon member | Module | Status | Maps to |');
  lines.push('|---|---|---|---|');
  const statusLabel = { cli: '✅ command', api: '✅ via api', planned: '⏳ planned', lib: '✅ library', excluded: '⛔ excluded' };
  for (const { name, mod, maps, status } of telRows) {
    lines.push(`| \`${name}\` | ${mod} | ${statusLabel[status]} | ${maps} |`);
  }
  lines.push('');

  lines.push('## 3. Deliberate exclusions (and why)');
  lines.push('');
  lines.push('These parts of the schema are intentionally not given dedicated commands. All remain');
  lines.push('reachable through `api` (undocumented, read-classified only where safe), except where a');
  lines.push('hard refusal applies.');
  lines.push('');
  lines.push('- **`phone.*` (calls, group calls)** — real-time audio/video has no CLI meaning.');
  lines.push('- **Bot-only methods (`bots.*`, many `messages.*`)** — only bot accounts may call them.');
  lines.push('- **`smsjobs.*`** — the SMS-relay programme; not a user action.');
  lines.push('- **`langpack.*`** — client localisation packs; client plumbing.');
  lines.push('- **`help.*` / `upload.*` / top-level invoke wrappers** — transport and client plumbing.');
  lines.push('- **`stickers.*` (sticker-set authoring)** — niche authoring flow.');
  lines.push('- **Payments / Stars / gifts spending** — any *paying* method is refused even with write');
  lines.push('  access; read-only balances/transactions are allowed through `api`.');
  lines.push('- **Account deletion, session termination (`auth.ResetAuthorizations`, `account.DeleteAccount`),');
  lines.push('  2FA password changes, and anything sharing the phone number or geolocation** — refused');
  lines.push('  outright, matching the rule `click` already follows.');
  lines.push('');
  lines.push('See `src/api-methods.ts` for the exact read-classification and refusal lists the `api`');
  lines.push('command enforces.');
  lines.push('');

  lines.push('## 4. `api` command read/write/refusal rules');
  lines.push('');
  lines.push('A TL method carries no read/write flag, so the default is **write unless it is clearly a');
  lines.push('read** (`Get…`/`Check…`/`Search…`/`Resolve…`). That heuristic is then corrected by hand,');
  lines.push('audited against the whole schema:');
  lines.push('');
  lines.push('**Named like a read but reclassified as a write (they change state):**');
  lines.push('');
  lines.push('- `messages.GetMessagesViews` — increments the view counter when `increment` is set.');
  lines.push('- `messages.GetBotCallbackAnswer`, `ephemeral.GetCallbackAnswer` — press a bot button.');
  lines.push('');
  lines.push('**Refused outright, even with write access** (issue #47: account/session takeover, phone or');
  lines.push('location sharing, paying):');
  lines.push('');
  lines.push('- **Login / sessions:** the entire `auth.*` namespace (sign-in, codes, login tokens,');
  lines.push('  `AcceptLoginToken`, import/export authorization, temp auth keys, password recovery) —');
  lines.push('  login belongs to `telegram auth` / `onboard`. Plus `account.ResetAuthorization(s)`,');
  lines.push('  `account.ResetWebAuthorization(s)`, `account.SetAuthorizationTTL`,');
  lines.push('  `account.ChangeAuthorizationSettings`.');
  lines.push('- **2FA / password:** `account.UpdatePasswordSettings`, `account.ResetPassword`,');
  lines.push('  `account.DeclinePasswordReset`, `account.GetPasswordSettings`, `account.GetTmpPassword`.');
  lines.push('- **Phone / email changes & verification:** `account.ChangePhone`, `SendChangePhoneCode`,');
  lines.push('  `ConfirmPhone`, `SendConfirmPhoneCode`, `SendVerifyPhoneCode`, `VerifyPhone`,');
  lines.push('  `SendVerifyEmailCode`, `VerifyEmail`.');
  lines.push('- **Phone / location sharing:** `contacts.GetLocated`, `contacts.AcceptContact`,');
  lines.push('  `account.SetPrivacy`, `account.UpdateBusinessLocation`, `channels.EditLocation`;');
  lines.push('  and, by inspecting `--params`, `contacts.AddContact` with `addPhonePrivacyException`,');
  lines.push('  and `messages.SendMedia` / `SendMultiMedia` / `EditMessage` carrying an');
  lines.push('  `InputMediaContact` / `InputMediaGeoPoint` / `InputMediaGeoLive` / `InputMediaVenue`.');
  lines.push('- **Data export / Passport:** `account.InitTakeoutSession`, `account.FinishTakeoutSession`,');
  lines.push('  `account.AcceptAuthorization`, `account.SaveSecureValue`, `account.DeleteSecureValue`.');
  lines.push('- **External-site login:** `messages.AcceptUrlAuth`, `messages.RequestUrlAuth`,');
  lines.push('  `messages.CheckUrlAuthMatchCode`.');
  lines.push('- **Ownership transfer:** `messages.EditChatCreator` / `channels.EditCreator` (needs the 2FA');
  lines.push('  password — use `telegram transfer-owner`).');
  lines.push('- **Money:** every non-read `payments.*`, plus the read-named token minters');
  lines.push('  `payments.GetStarsRevenueWithdrawalUrl`, `GetStarGiftWithdrawalUrl`,');
  lines.push('  `GetStarsRevenueAdsAccountUrl`, `ResolveStarGiftOffer`, and `phone.GetGroupCallStreamRtmpUrl`.');
  lines.push('');
  lines.push('**Still allowed as reads** (listing only, no state change): `account.GetAuthorizations`,');
  lines.push('`account.GetWebAuthorizations`, `messages.GetExportedChatInvites`, `payments.GetStarsStatus`,');
  lines.push('`payments.CheckGiftCode`, `stories.GetStoryViewsList`, and the rest of the `Get*` surface.');
  lines.push('');

  return lines.join('\n') + '\n';
}

// ---- CLI --------------------------------------------------------------------------------------

const argv = process.argv.slice(2);
/** Value of `--name <v>` or `--name=<v>`, else undefined. */
function opt(name) {
  const i = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i < 0) return undefined;
  return argv[i].includes('=') ? argv[i].slice(name.length + 1) : argv[i + 1];
}
const check = argv.includes('--check');
const minArg = opt('--min') ?? process.env.API_COVERAGE_MIN;
const tsvPath = opt('--telethon-tsv') ?? TELETHON_TSV;
const min = minArg === undefined || minArg === '' ? DEFAULT_MIN : Number(minArg);
if (!Number.isFinite(min) || min < 0 || min > 100) {
  console.error(`Invalid coverage minimum "${minArg}" (expected a number 0-100).`);
  process.exit(2);
}

if (argv.includes('--json')) {
  console.log(JSON.stringify({ min, ...metrics(tsvPath) }, null, 2));
} else if (check || opt('--min') !== undefined) {
  let ok = gate(min, tsvPath);
  if (check) {
    const report = build();
    const current = existsSync(REPORT) ? readFileSync(REPORT, 'utf8') : '';
    if (current !== report) {
      console.error('docs/api-coverage.md is out of date. Run: node scripts/api-coverage.mjs');
      ok = false;
    } else console.log('docs/api-coverage.md is up to date.');
  }
  process.exit(ok ? 0 : 1);
} else {
  writeFileSync(REPORT, build());
  console.log(`Wrote ${REPORT}`);
}
