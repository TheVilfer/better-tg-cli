// Writes src/generated/tl-commands.ts: one checked-in entry per TL schema method, so that every
// one of teleproto's ~823 `isFunction` requests gets its own dedicated top-level command
// `telegram <namespace> <method>` / `telegram <root-method>` (issue #47; built by
// src/commands/generated.ts). Only the stable name mapping is generated here — the per-parameter
// types are derived at runtime from the TL schema that is already bundled (scripts/tl-compact.mjs),
// so this table stays small.
//
//   node scripts/gen-tl-commands.mjs          regenerate src/generated/tl-commands.ts
//   node scripts/gen-tl-commands.mjs --check   exit 1 if the checked-in file is stale
//
// scripts/gen-version.mjs calls writeTlCommands() on every build/pretest, so CI's existing
// "Versioned files match package.json" step (git diff --exit-code after gen-version) also fails if
// this file drifts from the schema — a new TL layer shows up as a diff that must be committed.
// generateSource() also THROWS on a new name clash (see CURATED_COMMANDS below), so a future TL
// layer that would silently shadow a curated command fails the build/test with a named error.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src/generated/tl-commands.ts');

// ---- Clash policy (a curated command always wins) ---------------------------------------------
// Curated top-level command names (keep in sync with the program in src/index.ts). A generated
// namespace or root-method kebab that collides with one of these is a clash.
const CURATED_COMMANDS = new Set([
  'auth', 'onboard', 'logout', 'check', 'whoami', 'chats', 'read', 'get', 'info', 'topics', 'link',
  'contacts', 'search', 'inbox', 'buttons', 'pinned', 'reactions', 'stories', 'avatar', 'inline',
  'watch', 'drafts', 'admin-log', 'profile-photos', 'permissions', 'stats', 'scheduled', 'sessions',
  'stars', 'invites', 'contact', 'members', 'admins', 'groups', 'kick', 'promote', 'transfer-owner',
  'mute', 'unmute', 'folders', 'folder', 'folder-add', 'folder-remove', 'send', 'reply', 'send-file',
  'click', 'react', 'forward', 'pin', 'unpin', 'edit', 'delete', 'mark-read', 'poll', 'vote', 'block',
  'unblock', 'add-contact', 'del-contact', 'join', 'leave', 'invite-link', 'archive', 'unarchive',
  'create-group', 'create-channel', 'edit-permissions', 'topic', 'pin-chat', 'unpin-chat',
  'mark-unread', 'delete-dialog', 'typing', 'set-name', 'set-bio', 'set-username', 'set-avatar',
  'write-access', 'api', 'sync', 'download', 'update', 'skill', 'mcp', 'help-all', 'help',
]);
// Curated commands that can host the generated methods of a same-named namespace as subcommands
// (src/commands/generated.ts attaches them). These clashes are intentional and allowed.
const SUBCOMMAND_OK = new Set(['auth', 'stories', 'contacts', 'stats', 'folders', 'help']);
// Explicit, documented exceptions: a clashing generated name mapped to an alternative (e.g. a
// suffixed kebab) or simply acknowledged. Empty today. Add here (and handle the remap) to resolve a
// future clash instead of silently shadowing a curated command.
const OVERRIDES = new Map();

function assertNoClashes(rows) {
  const namespaces = new Set(rows.map((r) => r[0]).filter(Boolean));
  const rootKebabs = rows.filter((r) => !r[0]).map((r) => r[1]);
  const clashes = [];
  for (const ns of namespaces) {
    if (CURATED_COMMANDS.has(ns) && !SUBCOMMAND_OK.has(ns) && !OVERRIDES.has(ns)) {
      clashes.push(`namespace "${ns}" collides with a curated command that cannot host subcommands`);
    }
  }
  for (const rk of rootKebabs) {
    if (CURATED_COMMANDS.has(rk) && !OVERRIDES.has(rk)) {
      clashes.push(`root method "${rk}" collides with the curated command "${rk}"`);
    }
  }
  if (clashes.length) {
    throw new Error(
      `gen-tl-commands: new TL layer clashes with curated commands:\n  - ${clashes.join('\n  - ')}\n` +
      'Resolve in scripts/gen-tl-commands.mjs (SUBCOMMAND_OK if the curated command can host subcommands, or OVERRIDES with a renamed command).',
    );
  }
}

/** PascalCase/camelCase TL identifier → kebab-case (GetDHParams → get-dh-params). */
export function kebabCase(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/** Every TL method as [namespaceKebab, methodKebab, className], sorted for a stable diff. */
export function tlMethods() {
  const defs = require('teleproto/tl/generated/api-definitions.js');
  const rows = defs
    .filter((d) => d.isFunction)
    .map((d) => {
      const ns = d.namespace ?? '';
      const className = ns ? `${ns}.${d.name}` : d.name;
      return [ns, kebabCase(d.name), className];
    });
  rows.sort((a, b) => a[2].localeCompare(b[2]));
  return rows;
}

export function generateSource() {
  const rows = tlMethods();
  assertNoClashes(rows);
  const namespaces = [...new Set(rows.map((r) => r[0]).filter(Boolean))].sort();
  const lines = [];
  lines.push('// Generated by scripts/gen-tl-commands.mjs from teleproto\'s TL schema; do not edit.');
  lines.push('// One entry per TL schema method (every `isFunction` request), as');
  lines.push('// [namespaceKebab, methodKebab, className]. namespaceKebab is "" for the top-level');
  lines.push('// invoke/transport wrappers. Regenerate with `node scripts/gen-tl-commands.mjs` (also run');
  lines.push('// by scripts/gen-version.mjs on build/pretest). Parameter types are read at runtime from');
  lines.push('// the bundled TL schema, so only the name mapping lives here.');
  lines.push('export type TlMethod = readonly [ns: string, method: string, className: string];');
  lines.push('export const TL_METHODS: readonly TlMethod[] = [');
  for (const [ns, method, className] of rows) {
    lines.push(`  [${JSON.stringify(ns)}, ${JSON.stringify(method)}, ${JSON.stringify(className)}],`);
  }
  lines.push('];');
  lines.push(`export const TL_NAMESPACES: readonly string[] = ${JSON.stringify(namespaces)};`);
  lines.push('');
  return lines.join('\n');
}

/** Write the generated file if it changed. Returns true when it was (re)written. */
export function writeTlCommands() {
  const source = generateSource();
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {}
  if (current !== source) {
    writeFileSync(OUT, source);
    return true;
  }
  return false;
}

// Run directly: regenerate, or --check for drift.
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--check')) {
    const source = generateSource();
    let current = '';
    try {
      current = readFileSync(OUT, 'utf8');
    } catch {}
    if (current !== source) {
      console.error('src/generated/tl-commands.ts is out of date. Run: node scripts/gen-tl-commands.mjs');
      process.exit(1);
    }
    console.log('src/generated/tl-commands.ts is up to date.');
  } else {
    const changed = writeTlCommands();
    console.log(changed ? `Wrote ${OUT}` : `${OUT} already up to date`);
  }
}
