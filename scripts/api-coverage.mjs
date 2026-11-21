#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const DTS = join(root, "node_modules/teleproto/tl/generated/api.d.ts");
const REPORT = join(root, "docs/api-coverage.md");
const GENERATED = join(root, "src/generated/tl-commands.ts");
const TELETHON_TSV = join(
  root,
  "scripts/data/telethon-1.45.0-client-methods.tsv"
);
const RAW_CALL = "__call__ (raw request)";
const DEFAULT_MIN = 90;
const ALLOWLIST = join(root, "src/mcp-api-allowlist.ts");

function allowlistGroups() {
  const text = readFileSync(ALLOWLIST, "utf-8");
  const body = text.slice(text.indexOf("MCP_API_ALLOWLIST"));
  const groups = [];
  const str = String.raw`(?:"([^"]*)"|'([^']*)')`;
  const re = new RegExp(
    String.raw`\{\s*access:\s*${str},\s*title:\s*${str},\s*reason:\s*${str},\s*methods:\s*\[([^\]]*)\]`,
    "g"
  );
  for (const m of body.matchAll(re)) {
    groups.push({
      access: m[1] ?? m[2],
      title: m[3] ?? m[4],
      reason: m[5] ?? m[6],
      methods: [...m[7].matchAll(/"([^"]+)"|'([^']+)'/g)].map(
        (x) => x[1] ?? x[2]
      ),
    });
  }
  if (!groups.length) {
    throw new Error(
      "src/mcp-api-allowlist.ts: no groups found (keep the documented shape)"
    );
  }
  return groups;
}

function allowlistUnknown() {
  const methods = schemaMethods();
  return allowlistGroups()
    .flatMap((g) => g.methods)
    .filter((m) => !methods.has(m));
}

function schemaMethods() {
  const lines = readFileSync(DTS, "utf-8").split("\n");
  const methods = new Set();
  let inRequest = false;
  for (const line of lines) {
    if (/export class \w+ extends Request</.test(line)) {
      inRequest = true;
    } else if (inRequest) {
      const m = line.match(/className: "([^"]+)"/);
      if (m) {
        methods.add(m[1]);
        inRequest = false;
      }
    }
  }
  return methods;
}

const namespaceOf = (name) =>
  name.includes(".") ? name.split(".")[0] : "(top level)";

function directlyUsed(methods) {
  const top = new Set([...methods].filter((m) => !m.includes(".")));
  const used = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (entry.name.endsWith(".ts")) {
        const text = readFileSync(p, "utf-8");
        for (const m of text.matchAll(
          /new Api\.([A-Za-z]+)\.([A-Za-z0-9]+)\(/g
        )) {
          const name = `${m[1]}.${m[2]}`;
          if (methods.has(name)) {
            used.add(name);
          }
        }
        for (const m of text.matchAll(/new Api\.([A-Za-z0-9]+)\(/g)) {
          if (top.has(m[1])) {
            used.add(m[1]);
          }
        }
      }
    }
  };
  walk(join(root, "src"));
  return used;
}

const HELPER_REACHED = [
  "auth.CheckPassword",
  "auth.ExportAuthorization",
  "auth.ExportLoginToken",
  "auth.ImportAuthorization",
  "auth.ImportLoginToken",
  "auth.LogOut",
  "auth.SendCode",
  "auth.SignIn",
  "channels.DeleteMessages",
  "channels.GetChannels",
  "channels.GetMessages",
  "channels.ReadHistory",
  "contacts.ResolveUsername",
  "help.GetConfig",
  "messages.DeleteMessages",
  "messages.EditMessage",
  "messages.ForwardMessages",
  "messages.GetChats",
  "messages.GetDialogs",
  "messages.GetHistory",
  "messages.GetMessages",
  "messages.GetPeerDialogs",
  "messages.ReadHistory",
  "messages.SendMessage",
  "messages.UnpinAllMessages",
  "messages.UpdatePinnedMessage",
  "messages.UploadMedia",
  "updates.GetChannelDifference",
  "updates.GetDifference",
  "updates.GetState",
  "upload.GetFile",
  "upload.SaveBigFilePart",
  "upload.SaveFilePart",
  "users.GetUsers",
];

const hasGenericApi = () => existsSync(join(root, "src/commands/api.ts"));

function dedicatedCommandMethods(methods) {
  let text = "";
  try {
    text = readFileSync(GENERATED, "utf-8");
  } catch {
    return new Set();
  }
  return new Set([...methods].filter((m) => text.includes(`"${m}"`)));
}

const NOTES = {
  messages:
    "Core. Sending, history, search, reactions, drafts, scheduled, pin/mark-unread, invite links.",
  account:
    "Privacy, sessions, 2FA, notifications, usernames, business/profile. Mostly via `api` (read) + curated.",
  payments:
    "Stars, gifts, invoices. Read parts via `api` (balance/transactions); paying is always refused.",
  channels:
    "Admin log, title/about/photo, slow mode, forum topics, invite links, username, discussion links.",
  phone:
    "Calls and group calls. Out of scope for a CLI (reachable via `api`, undocumented).",
  bots: "Mostly bot-only. User-side bits (bot info, menu, commands) via `api`.",
  stories: "Peer stories covered; feeds/views/reactions/posting via `api`.",
  auth: "Login/logout covered; recovery and token management via `api`.",
  contacts:
    "Add/block/resolve covered; search, import, top peers, blocked list via `api` + curated.",
  help: "Client plumbing; readable facts (terms, countries) via `api`.",
  "(top level)":
    "InvokeWithLayer/InvokeAfterMsg… transport wrappers, not features. Excluded.",
  stickers: "Sticker-set authoring. Out of scope (reachable via `api`).",
  chatlists: "Shared folders. Via `api`.",
  communities: "New layer. Via `api`.",
  upload: "File-transfer plumbing, covered by send-file/download.",
  stats: "Channel/group statistics. Via `api` + curated `stats`.",
  ephemeral: "New layer. Via `api`.",
  users: "Covered for what the CLI needs.",
  smsjobs: "SMS relay programme. Out of scope.",
  aicompose: "New layer. Via `api`.",
  photos: "Profile photos: list/delete/reorder via `api` + curated.",
  langpack: "Client localisation. Out of scope.",
  premium: "Boosts. Via `api`.",
  updates: "Fully used (by `watch`).",
  folders: "Fully used (archive).",
  fragment: "Collectible info. Via `api`.",
};

const NS_ORDER = [
  "messages",
  "account",
  "payments",
  "channels",
  "phone",
  "bots",
  "stories",
  "auth",
  "contacts",
  "help",
  "(top level)",
  "stickers",
  "chatlists",
  "communities",
  "upload",
  "stats",
  "ephemeral",
  "users",
  "smsjobs",
  "aicompose",
  "photos",
  "langpack",
  "premium",
  "updates",
  "folders",
  "fragment",
];

const TELETHON = [
  ["action", "chats", "cli", "typing", "`typing` (chat action)"],
  [
    "add_event_handler",
    "updates",
    "excluded",
    "",
    "library plumbing (used internally by `watch`)",
  ],
  [
    "build_reply_markup",
    "buttons",
    "excluded",
    "",
    "library helper, no CLI meaning",
  ],
  ["catch_up", "updates", "excluded", "", "library plumbing (update loop)"],
  [
    "connect",
    "telegrambaseclient",
    "excluded",
    "",
    "library plumbing (connection)",
  ],
  [
    "conversation",
    "dialogs",
    "excluded",
    "",
    "interactive helper, no CLI meaning",
  ],
  ["delete_dialog", "dialogs", "cli", "delete-dialog", "`delete-dialog`"],
  ["delete_messages", "messages", "cli", "delete", "`delete`"],
  [
    "disconnect",
    "telegrambaseclient",
    "excluded",
    "",
    "library plumbing (connection)",
  ],
  [
    "disconnected",
    "telegrambaseclient",
    "excluded",
    "",
    "property, library plumbing",
  ],
  ["download_file", "downloads", "cli", "download", "`download`"],
  ["download_media", "downloads", "cli", "download", "`download`"],
  ["download_profile_photo", "downloads", "cli", "avatar", "`avatar`"],
  [
    "edit_2fa",
    "auth",
    "excluded",
    "",
    "changes the account 2FA password — refused (security)",
  ],
  ["edit_admin", "chats", "cli", "promote", "`promote`"],
  ["edit_folder", "dialogs", "cli", "archive", "`archive` / `unarchive`"],
  ["edit_message", "messages", "cli", "edit", "`edit`"],
  [
    "edit_permissions",
    "chats",
    "cli",
    "edit-permissions",
    "`edit-permissions` (default & per-user rights)",
  ],
  [
    "end_takeout",
    "account",
    "excluded",
    "",
    "data-export session — via `api` if ever needed",
  ],
  [
    "flood_sleep_threshold",
    "telegrambaseclient",
    "excluded",
    "",
    "property, library plumbing",
  ],
  ["forward_messages", "messages", "cli", "forward", "`forward`"],
  ["get_admin_log", "chats", "cli", "admin-log", "`admin-log`"],
  ["get_dialogs", "dialogs", "cli", "chats", "`chats` / `inbox`"],
  ["get_drafts", "dialogs", "cli", "drafts", "`drafts`"],
  ["get_entity", "users", "cli", "info", "`info` / `contact` (resolution)"],
  [
    "get_input_entity",
    "users",
    "lib",
    "",
    "resolution plumbing used by every command",
  ],
  ["get_me", "users", "cli", "whoami", "`whoami`"],
  ["get_messages", "messages", "cli", "read", "`read` / `get`"],
  ["get_participants", "chats", "cli", "members", "`members`"],
  [
    "get_peer_id",
    "users",
    "lib",
    "",
    "IDs are shown everywhere; resolution plumbing",
  ],
  [
    "get_permissions",
    "chats",
    "cli",
    "permissions",
    "`permissions <chat> <user>`",
  ],
  ["get_profile_photos", "chats", "cli", "profile-photos", "`profile-photos`"],
  [
    "get_stats",
    "chats",
    "cli",
    "stats",
    "`stats` (incl. `stats <chat> --message <id>`)",
  ],
  ["inline_query", "bots", "cli", "inline", "`inline`"],
  ["is_bot", "users", "cli", "info", "`info` / `contact` report the bot flag"],
  [
    "is_connected",
    "telegrambaseclient",
    "excluded",
    "",
    "property, library plumbing",
  ],
  ["is_user_authorized", "users", "cli", "check", "`check`"],
  ["iter_admin_log", "chats", "cli", "admin-log", "`admin-log`"],
  ["iter_dialogs", "dialogs", "cli", "chats", "`chats`"],
  ["iter_download", "downloads", "cli", "download", "`download`"],
  ["iter_drafts", "dialogs", "cli", "drafts", "`drafts`"],
  ["iter_messages", "messages", "cli", "read", "`read`"],
  ["iter_participants", "chats", "cli", "members", "`members`"],
  ["iter_profile_photos", "chats", "cli", "profile-photos", "`profile-photos`"],
  ["kick_participant", "chats", "cli", "kick", "`kick`"],
  ["list_event_handlers", "updates", "excluded", "", "library plumbing"],
  ["log_out", "auth", "cli", "logout", "`logout`"],
  ["loop", "telegrambaseclient", "excluded", "", "property, library plumbing"],
  ["on", "updates", "excluded", "", "decorator, library plumbing"],
  [
    "parse_mode",
    "messages",
    "excluded",
    "",
    "property; `send`/`reply` take `--html` / `--md`",
  ],
  ["pin_message", "messages", "cli", "pin", "`pin`"],
  ["qr_login", "auth", "cli", "auth", "`auth --qr`"],
  ["remove_event_handler", "updates", "excluded", "", "library plumbing"],
  ["run_until_disconnected", "updates", "cli", "watch", "`watch`"],
  ["send_code_request", "auth", "cli", "auth", "`auth`"],
  ["send_file", "uploads", "cli", "send-file", "`send-file`"],
  ["send_message", "messages", "cli", "send", "`send` / `reply`"],
  ["send_read_acknowledge", "messages", "cli", "mark-read", "`mark-read`"],
  ["set_proxy", "telegrambaseclient", "excluded", "", "library plumbing"],
  ["set_receive_updates", "updates", "excluded", "", "library plumbing"],
  ["sign_in", "auth", "cli", "auth", "`auth`"],
  [
    "sign_up",
    "auth",
    "excluded",
    "",
    "creating a brand-new account — out of scope",
  ],
  ["start", "auth", "cli", "auth", "`auth` / `onboard`"],
  [
    "takeout",
    "account",
    "excluded",
    "",
    "data-export session — via `api` if ever needed",
  ],
  ["unpin_message", "messages", "cli", "unpin", "`unpin`"],
  [
    "upload_file",
    "uploads",
    "lib",
    "",
    "upload plumbing driven by `send-file`",
  ],
  [
    "__call__ (raw request)",
    "core",
    "cli",
    "api",
    "`api <namespace.Method> --params` (generic)",
  ],
];

const PLANNED = {
  "delete-dialog": "src/commands/dialog.ts",
  permissions: "src/commands/permissions.ts",
  "admin-log": "src/commands/admin-log.ts",
  drafts: "src/commands/drafts.ts",
  "profile-photos": "src/commands/profile-photos.ts",
  api: "src/commands/api.ts",
};

function cliStatus(cmd) {
  const planned = PLANNED[cmd];
  if (planned && !existsSync(join(root, planned))) {
    return "planned";
  }
  return "cli";
}

function telethonMembers(tsvPath = TELETHON_TSV) {
  const names = readFileSync(tsvPath, "utf-8")
    .split("\n")
    .map((l) => l.split("\t")[0].trim())
    .filter(Boolean);
  return [...new Set([...names, RAW_CALL])];
}

function metrics(tsvPath = TELETHON_TSV) {
  const methods = schemaMethods();
  const reached = new Set([
    ...directlyUsed(methods),
    ...HELPER_REACHED.filter((m) => methods.has(m)),
  ]);
  const reachable = hasGenericApi() ? methods.size : reached.size;
  const dedicated = dedicatedCommandMethods(methods);

  const rows = new Map(
    TELETHON.map(([name, , kind, cmd]) => [
      name,
      kind === "cli" ? cliStatus(cmd) : kind,
    ])
  );
  const members = telethonMembers(tsvPath);
  const unaccounted = members.filter(
    (m) => !rows.has(m) || rows.get(m) === "planned"
  );
  const stale = [...rows.keys()].filter((m) => !members.includes(m));

  const pct = (a, b) => (b === 0 ? 0 : (a / b) * 100);
  return {
    reachability: {
      reachable,
      total: methods.size,
      pct: pct(reachable, methods.size),
    },
    dedicated: {
      count: dedicated.size,
      total: methods.size,
      pct: pct(dedicated.size, methods.size),
    },
    telethon: {
      accounted: members.length - unaccounted.length,
      total: members.length,
      pct: pct(members.length - unaccounted.length, members.length),
      unaccounted,
      stale,
    },
  };
}

const DEDICATED_MIN = 100;

function gate(min, tsvPath) {
  const { reachability: r, dedicated: d, telethon: t } = metrics(tsvPath);
  const fmt = (x) => `${(Math.floor(x * 10) / 10).toFixed(1)}%`;
  let ok = true;
  const out = [];
  const line = (name, a, b, p, threshold = min) => {
    const pass = p >= threshold;
    ok &&= pass;
    out.push(
      `${pass ? "ok  " : "FAIL"} ${name}: ${a}/${b} = ${fmt(p)} (minimum ${threshold}%)`
    );
  };
  line("API reachability (TL schema methods)", r.reachable, r.total, r.pct);
  line(
    "Dedicated command per TL method",
    d.count,
    d.total,
    d.pct,
    DEDICATED_MIN
  );
  line(
    "Telethon 1.45.0 TelegramClient accounting",
    t.accounted,
    t.total,
    t.pct
  );
  if (d.pct < DEDICATED_MIN) {
    out.push(
      "     missing dedicated commands: run `node scripts/gen-tl-commands.mjs`"
    );
  }
  if (t.unaccounted.length) {
    out.push(`     unaccounted Telethon members: ${t.unaccounted.join(", ")}`);
  }
  if (t.stale.length) {
    out.push(
      `     note: mapped but not in the Telethon list: ${t.stale.join(", ")}`
    );
  }
  if (!ok) {
    out.push(
      `API coverage is below the minimum. Add commands/mappings (scripts/api-coverage.mjs), or see docs/api-coverage.md.`
    );
  }
  (ok ? console.log : console.error)(out.join("\n"));
  return ok;
}

function build() {
  const methods = schemaMethods();
  const reached = new Set([
    ...directlyUsed(methods),
    ...HELPER_REACHED.filter((m) => methods.has(m)),
  ]);
  const dedicated = dedicatedCommandMethods(methods);
  const generic = hasGenericApi();

  const perNs = new Map();
  for (const m of methods) {
    const ns = namespaceOf(m);
    const e = perNs.get(ns) ?? { total: 0, reached: 0, dedicated: 0 };
    e.total += 1;
    if (reached.has(m)) {
      e.reached += 1;
    }
    if (dedicated.has(m)) {
      e.dedicated += 1;
    }
    perNs.set(ns, e);
  }

  const order = [
    ...NS_ORDER.filter((n) => perNs.has(n)),
    ...[...perNs.keys()].filter((n) => !NS_ORDER.includes(n)),
  ];
  const totalMethods = methods.size;
  const totalReached = reached.size;
  const totalDedicated = dedicated.size;
  const reachablePct = generic
    ? 100
    : Math.round((totalReached / totalMethods) * 100);

  const pct = (a, b) => (b === 0 ? "—" : `${Math.round((a / b) * 100)}%`);

  const lines = [];
  lines.push(
    "# Telegram client API coverage",
    "",
    "<!-- Generated by scripts/api-coverage.mjs. Do not edit by hand; run `node scripts/api-coverage.mjs`. -->",
    ""
  );
  lines.push(
    "Tracks issue #47. Three measures:",
    "",
    "- **Reachability** — can a given TL method be invoked at all? The generic `api` command",
    "  builds and sends any request from the schema, so every method is reachable in one step."
  );
  lines.push(
    "- **Dedicated commands** — does every method have its own `telegram <namespace> <method>`",
    "  command (generated from the schema, src/generated/tl-commands.ts)? Gated at 100%.",
    "- **Curated/friendly commands** — does a hand-written, stable-output command expose it (the",
    "  likes of `read`, `send`, `chats`)? This is the long tail, tracked per namespace below."
  );
  lines.push(
    "",
    "## Headline",
    "",
    `- TL schema methods (teleproto \`tl/generated/api.d.ts\`, \`extends Request<…>\`): **${totalMethods}**`
  );
  lines.push(
    `- Reachable today: **${generic ? totalMethods : totalReached} (${reachablePct}%)** ${generic ? "— via the generic `api` command plus every dedicated command" : "— no generic command yet; only dedicated commands reach the API"}`,
    `- Dedicated per-method commands (\`telegram <namespace> <method>\`): **${totalDedicated} (${pct(totalDedicated, totalMethods)})**`,
    `- Curated/friendly commands: **${totalReached} (${pct(totalReached, totalMethods)})** — ${[...directlyUsed(methods)].length} called directly in src/, ${HELPER_REACHED.filter((m) => methods.has(m)).length} through teleproto client helpers`,
    ""
  );
  lines.push(
    `CI gate (\`npm run coverage:api\`, also enforced by \`npm test\`): reachability and Telethon`,
    `accounting (section 2) must each stay at or above **${DEFAULT_MIN}%** (\`--min <n>\` / \`API_COVERAGE_MIN\`),`,
    `and every TL method must have a dedicated \`telegram <namespace> <method>\` command (**${DEDICATED_MIN}%**).`,
    ""
  );
  lines.push(
    "## 1. Issue #47 measure: coverage by namespace",
    "",
    "| Namespace | Methods | Command | Curated | Notes |",
    "|---|---:|---:|---:|---|"
  );
  for (const ns of order) {
    const e = perNs.get(ns);
    lines.push(
      `| \`${ns}\` | ${e.total} | ${pct(e.dedicated, e.total)} | ${e.reached} | ${NOTES[ns] ?? ""} |`
    );
  }
  lines.push(
    `| **total** | **${totalMethods}** | **${pct(totalDedicated, totalMethods)}** | **${totalReached}** | ${generic ? "Reachable + dedicated are 100%." : "No generic `api` command yet."} |`,
    "",
    '> "Command" is the generated dedicated `telegram <namespace> <method>` (src/generated/tl-commands.ts has one per',
    '> method). "Curated" counts a `new Api.<ns>.<Method>(` in src/ or a method behind a teleproto'
  );
  lines.push(
    "> high-level client helper the CLI calls. Treat the helper group as ±5, as the issue does.",
    ""
  );

  const telRows = TELETHON.map(([name, mod, kind, cmd, maps]) => ({
    name,
    mod,
    maps,
    status: kind === "cli" ? cliStatus(cmd) : kind,
  }));
  const telCli = telRows.filter((t) => t.status === "cli").length;
  const telApi = telRows.filter((t) => t.status === "api").length;
  const telPlanned = telRows.filter((t) => t.status === "planned").length;
  const telLib = telRows.filter((t) => t.status === "lib").length;
  const telExcl = telRows.filter((t) => t.status === "excluded").length;
  lines.push(
    "## 2. Telethon 1.45.0 `TelegramClient` parity",
    "",
    `Every public member of Telethon 1.45.0's \`TelegramClient\` (plus its raw \`client(request)\`),`,
    `mapped to a CLI command, a covered library helper, or a documented exclusion.`
  );
  lines.push(
    "The member list is `scripts/data/telethon-1.45.0-client-methods.tsv`.",
    "",
    `- Covered by a dedicated command: **${telCli}**`
  );
  if (telApi) {
    lines.push(
      `- Reachable through the generic \`api\` command: **${telApi}**`
    );
  }
  if (telPlanned) {
    lines.push(`- Mapped to a command still being built: **${telPlanned}**`);
  }
  lines.push(
    `- Covered as library/plumbing we drive: **${telLib}**`,
    `- Deliberately excluded: **${telExcl}**`
  );
  const tel = metrics().telethon;
  lines.push(
    `- **Total members mapped: ${tel.accounted}** (${tel.total - tel.accounted} unaccounted for)`,
    "",
    "| Telethon member | Module | Status | Maps to |",
    "|---|---|---|---|"
  );
  const statusLabel = {
    cli: "✅ command",
    api: "✅ via api",
    planned: "⏳ planned",
    lib: "✅ library",
    excluded: "⛔ excluded",
  };
  for (const { name, mod, maps, status } of telRows) {
    lines.push(`| \`${name}\` | ${mod} | ${statusLabel[status]} | ${maps} |`);
  }
  lines.push(
    "",
    "## 3. Deliberate exclusions (and why)",
    "",
    "These parts of the schema are intentionally not given dedicated commands. All remain"
  );
  lines.push(
    "reachable through `api` (undocumented, read-classified only where safe), except where a",
    "hard refusal applies.",
    "",
    "- **`phone.*` (calls, group calls)** — real-time audio/video has no CLI meaning."
  );
  lines.push(
    "- **Bot-only methods (`bots.*`, many `messages.*`)** — only bot accounts may call them.",
    "- **`smsjobs.*`** — the SMS-relay programme; not a user action.",
    "- **`langpack.*`** — client localisation packs; client plumbing.",
    "- **`help.*` / `upload.*` / top-level invoke wrappers** — transport and client plumbing."
  );
  lines.push(
    "- **`stickers.*` (sticker-set authoring)** — niche authoring flow.",
    "- **Payments / Stars / gifts spending** — any *paying* method is refused even with write",
    "  access; read-only balances/transactions are allowed through `api`. Over MCP any call",
    "  with `allowPaidStars` (a paid search, or a message, media, album or forward to a chat that"
  );
  lines.push(
    "  charges for it) is refused in every write mode; without it the call runs as usual.",
    "- **Account deletion, session termination (`auth.ResetAuthorizations`, `account.DeleteAccount`),",
    "  2FA password changes, and anything sharing the phone number or geolocation** — refused",
    "  outright, matching the rule `click` already follows."
  );
  lines.push(
    "",
    "See `src/api-methods.ts` for the exact read-classification and refusal lists the `api`",
    "command enforces.",
    ""
  );

  lines.push(
    "## 4. `api` command read/write/refusal rules",
    "",
    "A TL method carries no read/write flag, so the default is **write unless it is clearly a",
    "read** (`Get…`/`Check…`/`Search…`/`Resolve…`). That heuristic is then corrected by hand,"
  );
  lines.push(
    "audited against the whole schema:",
    "",
    "**Named like a read but reclassified as a write (they change state):**",
    ""
  );
  lines.push(
    "- `messages.GetBotCallbackAnswer`, `ephemeral.GetCallbackAnswer` — press a bot button.",
    "- `messages.GetInlineBotResults` — sends the query and your user ID to an external bot (the",
    "  `inline` command is a write for the same reason).",
    "- `messages.GetMessagesViews` with `increment` — adds a view (a read without it)."
  );
  lines.push(
    "",
    "**Refused outright, even with write access** (issue #47: account/session takeover, phone or",
    "location sharing, paying):",
    ""
  );
  lines.push(
    "- **Login / sessions:** the entire `auth.*` namespace (sign-in, codes, login tokens,",
    "  `AcceptLoginToken`, import/export authorization, temp auth keys, password recovery) —",
    "  login belongs to `telegram auth` / `onboard`. Plus `account.ResetAuthorization(s)`,",
    "  `account.ResetWebAuthorization(s)`, `account.SetAuthorizationTTL`,"
  );
  lines.push(
    "  `account.ChangeAuthorizationSettings`.",
    "- **2FA / password:** `account.UpdatePasswordSettings`, `account.ResetPassword`,",
    "  `account.DeclinePasswordReset`, `account.GetPasswordSettings`, `account.GetTmpPassword`,",
    "  and the recovery email: `account.ConfirmPasswordEmail`, `ResendPasswordEmail`,"
  );
  lines.push(
    "  `CancelPasswordEmail`.",
    "- **Passkeys:** `account.InitPasskeyRegistration`, `account.RegisterPasskey`,",
    "  `account.DeletePasskey` (listing them with `account.GetPasskeys` stays a read in a terminal).",
    "- **Phone / email changes & verification:** `account.ChangePhone`, `SendChangePhoneCode`,"
  );
  lines.push(
    "  `ConfirmPhone`, `SendConfirmPhoneCode`, `SendVerifyPhoneCode`, `VerifyPhone`,",
    "  `SendVerifyEmailCode`, `VerifyEmail`.",
    "- **Phone / location sharing:** `contacts.GetLocated`, `contacts.AcceptContact`,",
    "  `account.SetPrivacy`, `account.UpdateBusinessLocation`, `channels.EditLocation`;"
  );
  lines.push(
    "  and, by inspecting `--params`, `contacts.AddContact` with `addPhonePrivacyException`,",
    "  and `messages.SendMedia` / `SendMultiMedia` / `EditMessage` carrying an",
    "  `InputMediaContact` / `InputMediaGeoPoint` / `InputMediaGeoLive` / `InputMediaVenue`,",
    "  `messages.GetInlineBotResults` with `geoPoint` (an inline query without it is a plain write),"
  );
  lines.push(
    "  and `channels.CreateChannel` with `geoPoint` or `address` (a geo group; a plain channel is created).",
    "- **Data export / Passport:** `account.InitTakeoutSession`, `account.FinishTakeoutSession`,",
    "  `account.AcceptAuthorization`, `account.SaveSecureValue`, `account.DeleteSecureValue`, and the",
    "  Passport reads `account.GetAllSecureValues` / `GetSecureValue` / `GetAuthorizationForm` (`plainData` holds the phone"
  );
  lines.push(
    "  number and email in the clear).",
    "- **External-site login:** `messages.AcceptUrlAuth`, `messages.RequestUrlAuth`,",
    "  `messages.CheckUrlAuthMatchCode`, and the read-named `messages.GetEmojiURL` (a login link to",
    "  the translation platform)."
  );
  lines.push(
    "- **Ownership transfer:** `messages.EditChatCreator` / `channels.EditCreator` (needs the 2FA",
    "  password — use `telegram transfer-owner`).",
    "- **Money:** every non-read `payments.*`, `messages.SendPaidReaction` (its `count` is the Stars",
    "  it spends), plus the read-named token minters"
  );
  lines.push(
    "  `payments.GetStarsRevenueWithdrawalUrl`, `GetStarGiftWithdrawalUrl`,",
    "  `GetStarsRevenueAdsAccountUrl`, `ResolveStarGiftOffer`, and `phone.GetGroupCallStreamRtmpUrl`.",
    "",
    "**Reads that run as writes:** `channels.SearchPosts` with `allowPaidStars` (a paid full-text"
  );
  lines.push(
    "search) and `messages.GetMessagesViews` with `increment` (it adds a view) need write access in a",
    "terminal, like any write; without them they stay reads.",
    "**Paying Stars over MCP:** a non-null `allowPaidStars` is refused over MCP for every method",
    "(`channels.SearchPosts`, `messages.SendMessage`, `SendMedia`, `SendMultiMedia`,"
  );
  lines.push(
    "`ForwardMessages`, …) in every write mode, `on` included, before anything reaches Telegram.",
    "`help.GetConfig` prints `autologinToken` as `[redacted]`.",
    "",
    "**Still allowed as reads in a terminal** (listing only, no state change): `account.GetAuthorizations`,"
  );
  lines.push(
    "`account.GetWebAuthorizations`, `messages.GetExportedChatInvites`, `payments.GetStarsStatus`,",
    "`payments.CheckGiftCode`, `stories.GetStoryViewsList`, and the rest of the `Get*` surface.",
    "Over MCP only the allowlist below runs.",
    ""
  );

  const groups = allowlistGroups();
  const allowed = groups.flatMap((g) => g.methods);
  lines.push(
    "## 5. Raw API over MCP: the allowlist",
    "",
    "**Threat model for MCP output.** Over MCP the model never receives credentials or redeemable",
    "value: login codes, 2FA, session and auth tokens, gift and Premium codes and their links. Ordinary"
  );
  lines.push(
    "chat content (the phone on a contact card, a shared location, reply media) is what the user asks",
    "the agent to read, so curated commands (`read`, `get`, `contacts`, …) keep showing it. Writes are",
    "governed by the write mode and its approval flow; the content refusals listed in section 4 and",
    "below (location and contact media, `forward` of a contact card or a location) predate this model"
  );
  lines.push(
    "and stay, but no new ones are added on content grounds. Concretely, every",
    "MCP output, raw or curated: hides login codes in all content of a message from the service",
    "accounts 777000 (Telegram) and 489000 (Verification Codes): text, `richMessage`, entity URLs,",
    "button texts, URLs, copy texts and callback data, the quote and the link preview, the media file"
  );
  lines.push(
    "name, title and caption, plus a quote of such a message elsewhere (its text and entity URLs).",
    "It also masks the slug of every gift link (`t.me/giftcode/<slug>`,",
    "`telegram.me/giftcode/<slug>`, `tg://giftcode?slug=<slug>`) as `[gift code hidden]`, in the CLI",
    "under `TG_MCP` / `TG_READ_ONLY` and once more on the MCP result itself (the whole slug, with"
  );
  lines.push(
    "percent-encoding). What the server says about a call (an approval's action, the result of a",
    "write, every error) also hides a code after a `code:` / `код:` label: the word right before the",
    "colon (Russian label words such as `для входа в Telegram` or `подтверждения` allowed after `код`),",
    "with nothing or a label word such as `login`, `verification`, `Telegram`, `your` before it, so"
  );
  lines.push(
    "`Promo code:` or `exit code:` stay;",
    "content a read shows is not touched by that rule. All of it is one function, `maskForModel()` in",
    "`src/mcp-output.ts`; JSON keeps its keys, numbers and IDs. A raw",
    "result additionally redacts the fields listed below: the raw API is a power tool."
  );
  lines.push(
    "",
    "**Where masking stops.** Masking is best-effort against the forms honest authors produce:",
    "Telegram's own login messages (777000, 489000) and gift links as clients make them",
    "(`t.me/giftcode/<slug>`, `tg://giftcode?slug=<slug>`). On the echo path (text the model itself"
  );
  lines.push(
    "wrote in argv, stdin or a caption) the model already holds the value, so there the priority is",
    "not to over-mask. Known limits, not covered: HTML or Markdown markup splitting a code",
    "(`Login code: <b>52813</b>`), an explicit port in a `t.me` URL (`t.me:443/giftcode/…`), callback",
    "data that carries a gift link Base64-encoded, a code split across `richMessage` nodes, and"
  );
  lines.push(
    "percent-encoded host or parameter names (`t.me/%67iftcode/…`, `sl%75g=`).",
    "",
    `Over MCP (the \`telegram_read\` and \`telegram_write\` tools) a raw call, \`api <method>\` or a`,
    `generated \`<namespace> <method>\` command, runs only if its method is one of these **${allowed.length}**`
  );
  lines.push(
    `of the ${schemaMethods().size} TL methods. Any other method is refused before anything runs: "not available over`,
    'MCP; run it in a terminal". The rules in section 4 still apply on top (geo or contact media,',
    "a phone-privacy exception, `allowPaidStars`), and a read runs through the read tool, a write",
    "through the write tool and its write mode. In a terminal nothing changes."
  );
  lines.push(
    "",
    "Over MCP these params of allowed methods are refused as well, at any depth, in every write",
    "mode: a `suggestedPost` with a `price`, an `InputMediaStakeDice`, `allowPaidFloodskip`, any",
    "location (a geo point, geo or venue media, an `InputPageBlockMap` in a `richMessage`), a"
  );
  lines.push(
    "`referer` in `contacts.ResolveUsername`, `subscriptionPricing` in `messages.ExportChatInvite`,",
    "`myStoriesFrom` in `contacts.Block`/`Unblock`, `password` in `messages.GetBotCallbackAnswer`",
    "and `increment` in `messages.GetMessagesViews`. A raw result over MCP shows phone numbers,",
    'vCards, birthdays, contact notes and every location field as `"[redacted]"`.'
  );
  lines.push(
    "`--help` and `schema` (`mcpAccess`) show the MCP access of each method next to its terminal access.",
    "",
    "Not on the list on purpose: payments and Stars, account / auth / Passport / passkeys, privacy",
    "and security settings, sessions, takeout, phone calls, sticker-set management, business and"
  );
  lines.push(
    "premium purchases, geo / location, bot administration, folders, chat import and export.",
    "The list lives in `src/mcp-api-allowlist.ts`; this section is generated from it.",
    ""
  );
  for (const g of groups) {
    lines.push(
      `**${g.access === "read" ? "Read" : "Write"}: ${g.title}.** ${g.reason}`,
      "",
      g.methods.map((m) => `\`${m}\``).join(", "),
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

const argv = process.argv.slice(2);
function opt(name) {
  const i = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i === -1) {
    return undefined;
  }
  return argv[i].includes("=") ? argv[i].slice(name.length + 1) : argv[i + 1];
}
const check = argv.includes("--check");
const minArg = opt("--min") ?? process.env.API_COVERAGE_MIN;
const tsvPath = opt("--telethon-tsv") ?? TELETHON_TSV;
const min =
  minArg === undefined || minArg === "" ? DEFAULT_MIN : Number(minArg);
if (!Number.isFinite(min) || min < 0 || min > 100) {
  console.error(
    `Invalid coverage minimum "${minArg}" (expected a number 0-100).`
  );
  process.exit(2);
}

if (argv.includes("--allowlist-json")) {
  console.log(JSON.stringify(allowlistGroups()));
} else if (argv.includes("--json")) {
  console.log(JSON.stringify({ min, ...metrics(tsvPath) }, null, 2));
} else if (check || opt("--min") !== undefined) {
  let ok = gate(min, tsvPath);
  const unknownAllowed = allowlistUnknown();
  if (unknownAllowed.length) {
    console.error(
      `FAIL src/mcp-api-allowlist.ts names methods that are not in the TL schema: ${unknownAllowed.join(", ")}`
    );
    ok = false;
  }
  if (check) {
    const report = build();
    const current = existsSync(REPORT) ? readFileSync(REPORT, "utf-8") : "";
    if (current === report) {
      console.log("docs/api-coverage.md is up to date.");
    } else {
      console.error(
        "docs/api-coverage.md is out of date. Run: node scripts/api-coverage.mjs"
      );
      ok = false;
    }
  }
  process.exit(ok ? 0 : 1);
} else {
  writeFileSync(REPORT, build());
  console.log(`Wrote ${REPORT}`);
}
