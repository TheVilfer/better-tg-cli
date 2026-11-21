/**
 * What we know about each agent client that hosts Better-TG-CLI, and how we know it.
 *
 * One record per client. Every cell carries its evidence: `doc` (the client's official docs),
 * `src` (the client's source code or binary was read, but not run), `report` (a public issue or
 * forum thread, not an official doc) or `live` (our server was run in that client: version and
 * date). A cell nobody could confirm is `unknown` and has no evidence.
 *
 * `docs/compatibility.md` is generated from this file (`bun scripts/compat-matrix.ts`), and
 * `test/compat-matrix.test.ts` fails when the two drift. Ids match `knownAgents()` in
 * `src/skill-install.ts`, so `connect` and `doctor` can join on them.
 */

export type EvidenceLevel = "live" | "src" | "doc" | "report";

export type Evidence =
  | {
      level: "doc" | "src" | "report";
      ref: string;
      checked: string;
      version?: string;
    }
  | { level: "live"; version: string; date: string; ref?: string };

/** One configuration (an interface, a version or a mode) of a cell whose answer depends on it. */
export interface Case<V extends string = string> {
  when: string;
  value: V | "unknown" | "n/a";
  note?: string;
  evidence: Evidence[];
}

/**
 * - `value`: `varies` when the answer depends on the configuration: `cases` holds one entry per configuration.
 */
export interface Cell<V extends string = string> {
  value: V | "unknown" | "n/a" | "varies";
  note?: string;
  evidence: Evidence[];
  cases?: Case<V>[];
}

export type Surface = "cli" | "ide" | "desktop" | "web" | "cloud";
/** Whether the client can show our MCP approval form (elicitation). */
export type Elicitation = "form+url" | "form" | "none";
/** What a stdio server gets from the client's environment. */
export type StdioEnv = "full" | "filtered" | "allowlist" | "n/a";
/** What the client does with an MCP tool call before anyone configured it. */
export type ApprovalDefault = "ask" | "allow" | "hints" | "rules" | "model";
/** How Better-TG-CLI gets into the client today. */
export type Install =
  | "plugin"
  | "extension"
  | "mcpb"
  | "catalog"
  | "config"
  | "ui"
  | "tunnel"
  | "beta"
  | "none";
/** Reading Telegram through our server in this client. `works` needs a live entry. */
export type Read = "works" | "expected" | "blocked" | "n/a";
/**
 * Approval level a write gets in mode `ask`. G1: the client gets our approval form (elicitation),
 * so the model never sees a code; the server checks the answer, not who gave it. G2: a one-time
 * code the model must take to the human in chat.
 */
export type Approval = "G1" | "G2" | "n/a";
/** What happens when the human says no, or nobody can answer. */
export type Refusal = "refused" | "chat" | "n/a";
export type Gui = "ok" | "path" | "n/a";
/** A write in a headless or unattended run (`-p`, `exec`, cron, Autopilot). */
export type Headless = "refused" | "aborts" | "n/a";
/** Where our stdio server runs relative to the client's sandbox. */
export type Sandbox = "outside" | "opt-in" | "cloud" | "n/a";
/** Can the client reach `telegram mcp --http`, which takes a static bearer token? */
export type Http = "bearer" | "oauth-only";

/**
 * - `versionSeen`: The client version the research looked at, when it named one.
 * - `approval`: Derived from `elicitation` unless set.
 * - `approvalNote`: Who besides the human may answer the form (a hook, a reviewer agent): added to the derived approval.
 * - `refusal`: Derived from the approval level unless set.
 * - `update`: Set once a live run shows whether the update notice reaches the agent here (see UPDATE_NOTICE).
 */
export interface ClientRecord {
  id: string;
  name: string;
  surfaces: Surface[];
  versionSeen?: string;

  config: Cell;
  elicitation: Cell<Elicitation>;
  stdioEnv: Cell<StdioEnv>;
  toolTimeout: Cell;
  approvalDefault: Cell<ApprovalDefault>;

  install: Cell<Install>;
  read: Cell<Read>;
  approval?: Cell<Approval>;
  approvalNote?: string;
  refusal?: Cell<Refusal>;
  update?: Cell<"shown" | "none">;
  gui: Cell<Gui>;
  headless: Cell<Headless>;
  sandbox: Cell<Sandbox>;
  http: Cell<Http>;
}

const CHECKED = "2026-11-19";

const ev =
  (level: "doc" | "src" | "report") =>
  (ref: string, version?: string): Evidence => ({
    level,
    ref,
    checked: CHECKED,
    ...(version ? { version } : {}),
  });
const doc = ev("doc");
const src = ev("src");
const report = ev("report");

const withNote = (note?: string) => (note ? { note } : {});

function cell<V extends string>(
  value: V,
  evidence: Evidence[],
  note?: string
): Cell<V> {
  return { value, ...withNote(note), evidence };
}
function na<V extends string>(): Cell<V | "n/a"> {
  return { value: "n/a", evidence: [] };
}
function unknown<V extends string = string>(note?: string): Cell<V> {
  return { value: "unknown", ...withNote(note), evidence: [] };
}
function when<V extends string>(
  label: string,
  value: V | "unknown" | "n/a",
  evidence: Evidence[] = [],
  note?: string
): Case<V> {
  return { when: label, value, ...withNote(note), evidence };
}
function whenUnknown(label: string, note?: string): Case<never> {
  return when<never>(label, "unknown", [], note);
}
function varies<V extends string>(
  cases: NoInfer<Case<V>>[],
  note?: string
): Cell<V> {
  return { value: "varies", ...withNote(note), evidence: [], cases };
}
/** The configurations of a cell; a plain cell is one case with an empty label. */
export function casesOf<V extends string>(cell: Cell<V>): Case<V>[] {
  if (cell.cases) {
    return cell.cases;
  }
  return [
    when<V>(
      "",
      cell.value === "varies" ? "unknown" : cell.value,
      cell.evidence,
      cell.note
    ),
  ];
}

/**
 * Whether an agent sees the notice that a new version exists is unknown per client until a live
 * run shows it. What our code does is known, so one note covers the whole column.
 */
export const UPDATE_NOTICE =
  "Unknown in every client until seen live. Over MCP the notice is never part of a tool result: the commands the server runs get `TG_NO_UPDATE_CHECK=1` (`src/mcp.ts`). When an agent runs the `telegram` CLI, the notice goes to stderr only if stderr is a terminal, `CI` and `TG_NO_UPDATE_CHECK` are unset and a newer version is already cached (`src/update.ts`), so an agent that runs commands in a pseudo-terminal may see it.";

/**
 * The approval columns describe the local stdio server (`telegram mcp`), unless a case names its
 * route (the Claude Code plugin, Grok Bot's Remote HTTPS). Two routes are G2 in
 * every client: the skill (the agent runs the `telegram` CLI in a shell, which prints a one-time
 * code) and `telegram mcp --http`, which never asks the client for a form (`src/mcp-http.ts`).
 */
export const ROUTE_NOTE =
  "Where write approval, refusal, headless and sandbox name no route, they describe the local MCP server (`telegram mcp`); a labelled case (the Claude Code plugin, Grok Bot's Remote HTTPS) describes the route it names. The skill route (the agent runs the `telegram` CLI in a shell) and `telegram mcp --http` are G2 in every client: the CLI prints a one-time code, and the HTTP server never asks the client for a form.";

const CC = "https://code.claude.com/docs/en";
const CD = "https://claude.com/docs/connectors";
const CURSOR = "https://cursor.com/docs";
const VSC = "https://code.visualstudio.com/docs/agents";
const GHCLI = "https://docs.github.com/en/copilot";
const CODEX_DOC = "https://learn.chatgpt.com/docs";
const CODEX_SRC = "https://github.com/openai/codex/blob/main/codex-rs";
const OAI = "https://developers.openai.com";
const GEMINI = "https://github.com/google-gemini/gemini-cli/blob/v0.69.0";
const DEVIN = "https://docs.devin.ai";
const CLINE_DOC = "https://docs.cline.bot";
const CLINE_SRC = "https://github.com/cline/cline/blob/main";
const ZED_DOC = "https://zed.dev/docs/ai";
const ZED_SRC =
  "https://github.com/zed-industries/zed/blob/main/crates/context_server/src";
const GROK_DOC = "https://docs.x.ai/build";
const GROK_SRC =
  "https://github.com/xai-org/grok-build/blob/main/crates/codegen";
const GROKBOT = "https://docs.x.ai/grok-bot";
const HERMES_DOC = "https://hermes-agent.nousresearch.com/docs/user-guide";
const HERMES_SRC =
  "https://github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec";
const OPENCODE_DOC = "https://opencode.ai/docs";
const OPENCODE_SRC =
  "https://github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed";
const OPENCODE_V1 = "https://github.com/anomalyco/opencode/blob/v1.19.6";
const GOOSE_DOC = "https://goose-docs.ai/docs";
const GOOSE_SRC = "https://github.com/aaif-goose/goose/blob/e196781";
const FACTORY = "https://docs.factory.com";
const AMP = "https://ampcode.com/docs";
const WARP_DOC = "https://docs.warp.dev/agents";
const WARP_SRC = "https://github.com/warpdotdev/Warp/blob/master";
const KIRO = "https://kiro.dev/docs";
const ASIDE = "https://docs.aside.com";

const ABS_PATH = "register `telegram` by its absolute path";

export const CLIENTS: ClientRecord[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    surfaces: ["cli"],
    versionSeen: "2.1.328",
    config: cell("`~/.claude.json`, project `.mcp.json`, plugins", [
      doc(`${CC}/mcp.md`, "2.1.328"),
    ]),
    elicitation: cell(
      "form+url",
      [doc(`${CC}/mcp.md`, "2.1.328"), doc(`${CC}/hooks.md`)],
      "The VS Code extension auto-declines (anthropics/claude-code#98256, open)."
    ),
    stdioEnv: cell(
      "full",
      [doc(`${CC}/env-vars.md`)],
      "Only a safe baseline with `CLAUDE_CODE_MCP_ALLOWLIST_ENV=1`."
    ),
    toolTimeout: cell(
      "≈28 h",
      [doc(`${CC}/mcp.md`)],
      "`MCP_TOOL_TIMEOUT`; idle timeout 30 min on stdio."
    ),
    approvalDefault: cell(
      "ask",
      [doc(`${CC}/permissions.md`)],
      "Every MCP tool asks until an allow rule `mcp__telegram__*` matches."
    ),
    install: varies([
      when(
        "stdio (`claude mcp add`)",
        "config",
        [doc(`${CC}/mcp.md`, "2.1.328")],
        "`claude mcp add telegram -- telegram mcp`."
      ),
      when(
        "plugin",
        "plugin",
        [doc(`${CC}/plugins-reference.md`)],
        "The marketplace plugin carries the skill only."
      ),
    ]),
    read: cell(
      "expected",
      [doc(`${CC}/sandboxing.md`)],
      "MCP servers run outside the Bash sandbox, with the user's Keychain."
    ),
    approval: varies([
      when(
        "stdio (`claude mcp add`)",
        "G1",
        [doc(`${CC}/mcp.md`, "2.1.328"), doc(`${CC}/hooks.md`)],
        "An `Elicitation` hook can answer the form instead of the human."
      ),
      when(
        "plugin",
        "G2",
        [doc(`${CC}/plugins-reference.md`)],
        "The marketplace plugin is the skill only: the agent runs the CLI, which prints a one-time code."
      ),
    ]),
    gui: na(),
    headless: varies([
      when(
        "`-p --permission-prompts none`, no hook answers",
        "refused",
        [doc(`${CC}/headless.md`), doc(`${CC}/hooks.md`)],
        "The form is cancelled."
      ),
      whenUnknown(
        "plain `-p`",
        "An unanswered form may wait until the tool timeout; unverified."
      ),
    ]),
    sandbox: cell("outside", [doc(`${CC}/sandboxing.md`)]),
    http: cell(
      "bearer",
      [doc(`${CC}/mcp.md`)],
      '`--header "Authorization: Bearer …"` or `headersHelper`.'
    ),
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop (chat)",
    surfaces: ["desktop"],
    config: cell("`claude_desktop_config.json` or a `.mcpb` extension", [
      doc(
        "https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop"
      ),
      doc(`${CD}/building/mcpb.md`),
    ]),
    elicitation: cell(
      "none",
      [report("https://github.com/anthropics/claude-code/issues/41347")],
      "Feature request closed as not planned; no doc lists elicitation for chat."
    ),
    stdioEnv: cell(
      "allowlist",
      [doc("https://modelcontextprotocol.io/docs/tools/debugging")],
      "A limited, platform-dependent subset plus `env`; cwd may be `/`."
    ),
    toolTimeout: cell("240 s", [doc(`${CD}/building/index.md`)]),
    approvalDefault: cell(
      "ask",
      [doc(`${CD}/custom/remote-mcp.md`)],
      "Allow once / Always allow per tool."
    ),
    install: cell(
      "mcpb",
      [doc(`${CD}/building/mcpb.md`)],
      "Each release ships `better-tg-cli.mcpb`; a `claude_desktop_config.json` entry works too."
    ),
    read: cell(
      "expected",
      [doc(`${CD}/custom/remote-mcp.md`)],
      "A local extension runs with the user's rights, so the Keychain is reachable."
    ),
    gui: unknown(
      `Widely reported, not in the official docs: a Dock-launched app lacks the login-shell PATH, so ${ABS_PATH}.`
    ),
    headless: na(),
    sandbox: cell("outside", [doc(`${CD}/custom/remote-mcp.md`)]),
    http: varies([
      whenUnknown(
        "org in the `static_headers` beta",
        "Remote servers are connectors, as on claude.ai; the docs do not say whether the beta header reaches Desktop."
      ),
      when("other organizations", "oauth-only", [
        doc(`${CD}/building/authentication.md`),
      ]),
    ]),
  },
  {
    id: "claude-ai",
    name: "claude.ai",
    surfaces: ["web"],
    config: cell(
      "Customize › Connectors › Add custom connector (a public URL)",
      [doc(`${CD}/custom/remote-mcp.md`)]
    ),
    elicitation: cell(
      "none",
      [
        doc(`${CD}/building/index.md`),
        report("https://github.com/anthropics/claude-ai-mcp/issues/153"),
      ],
      "Not in the list of supported features; the request is open."
    ),
    stdioEnv: na(),
    toolTimeout: cell("240 s", [doc(`${CD}/building/index.md`)]),
    approvalDefault: cell(
      "hints",
      [doc(`${CD}/building/review-criteria.md`)],
      "`readOnlyHint` runs without a prompt, `destructiveHint` always asks."
    ),
    install: cell(
      "beta",
      [doc(`${CD}/building/authentication.md`)],
      "A public HTTPS `telegram mcp --http` URL works only in the `static_headers` beta (a limited set of organizations): an org Owner enters one `Authorization` header, sent for everyone in the org, so every member acts as the same Telegram account. Otherwise it needs OAuth, which the HTTP server does not offer yet (TheVilfer/better-tg-cli#17, #72)."
    ),
    read: unknown(),
    gui: na(),
    headless: na(),
    sandbox: cell(
      "cloud",
      [doc(`${CD}/building/index.md`)],
      "Calls come from Anthropic's cloud."
    ),
    http: varies([
      when(
        "org in the `static_headers` beta",
        "bearer",
        [doc(`${CD}/building/authentication.md`)],
        "An org Owner enters one `Authorization` header, sent for every member (a limited set of organizations)."
      ),
      when("other organizations", "oauth-only", [
        doc(`${CD}/building/authentication.md`),
      ]),
    ]),
  },
  {
    id: "cursor",
    name: "Cursor",
    surfaces: ["ide", "cli"],
    versionSeen: "CLI 2026.11.17",
    config: cell("`~/.cursor/mcp.json`, project `.cursor/mcp.json`, plugins", [
      doc(`${CURSOR}/mcp.md`),
    ]),
    elicitation: varies(
      [
        when(
          "IDE",
          "form",
          [
            doc(`${CURSOR}/mcp.md`),
            report("https://forum.cursor.com/t/172829"),
          ],
          "Gives up on the call after ~60 s while the form is open (forum). Our server keeps waiting for the form, so an approval that still arrives runs the write."
        ),
        whenUnknown("CLI", "Not documented."),
      ],
      "URL mode: unverified."
    ),
    stdioEnv: unknown("Not documented."),
    toolTimeout: cell(
      "~60 s",
      [
        report("https://forum.cursor.com/t/172829"),
        report("https://forum.cursor.com/t/145618"),
      ],
      "Observed, not documented."
    ),
    approvalDefault: cell("ask", [
      doc(`${CURSOR}/agent/security/run-modes.md`),
    ]),
    install: cell(
      "plugin",
      [doc(`${CURSOR}/plugins.md`)],
      "The Cursor Marketplace plugin runs the pinned `npx better-tg-cli@<version> mcp`."
    ),
    read: unknown("The stdio environment and sandbox are not documented."),
    gui: unknown(
      `The docs only say \`command\` must be on PATH or a full path: ${ABS_PATH}.`
    ),
    headless: varies([
      when(
        "`agent -p`, tool not allowed",
        "refused",
        [doc(`${CURSOR}/cli/headless.md`)],
        "The call is rejected before it runs."
      ),
      whenUnknown(
        "`agent -p`, tool allowed",
        "What the CLI does with the form is not documented."
      ),
    ]),
    sandbox: unknown(
      "Per-server sandboxing is documented only under Enterprise admin controls."
    ),
    http: cell("bearer", [doc(`${CURSOR}/mcp.md`)]),
  },
  {
    id: "vscode-copilot",
    name: "VS Code Copilot",
    surfaces: ["ide"],
    config: cell(
      "`~/.copilot/mcp-config.json`, workspace `.mcp.json`",
      [doc(`${VSC}/reference/mcp-configuration`)],
      "Legacy `.vscode/mcp.json` (Local harness) is deprecated."
    ),
    elicitation: cell(
      "form+url",
      [doc("https://code.visualstudio.com/api/extension-guides/ai/mcp")],
      "Cancelled in Autopilot, declined when there is no active turn."
    ),
    stdioEnv: unknown(
      "Presumably as Copilot CLI; not documented for the editor."
    ),
    toolTimeout: unknown(),
    approvalDefault: cell(
      "ask",
      [doc(`${VSC}/run/approvals`)],
      "Autopilot and Allow all skip MCP confirmation."
    ),
    install: cell("config", [doc(`${VSC}/reference/mcp-configuration`)]),
    read: unknown("The stdio environment is not documented for the editor."),
    gui: unknown(
      `Whether the Copilot harness gets the login-shell env is not documented: ${ABS_PATH}.`
    ),
    headless: cell(
      "refused",
      [doc("https://code.visualstudio.com/api/extension-guides/ai/mcp")],
      "Autopilot cancels the approval form."
    ),
    sandbox: cell(
      "opt-in",
      [doc(`${VSC}/reference/mcp-configuration`)],
      "`chat.agent.sandbox.mcpServers` puts MCP servers in the harness sandbox."
    ),
    http: cell("bearer", [doc(`${VSC}/reference/mcp-configuration`)]),
  },
  {
    id: "github-copilot",
    name: "Copilot CLI",
    surfaces: ["cli"],
    versionSeen: "1.0.114",
    config: cell(
      "`~/.copilot/mcp-config.json` (`tools` is required), `.mcp.json`",
      [doc(`${GHCLI}/how-tos/copilot-cli/customize-copilot/add-mcp-servers`)]
    ),
    elicitation: varies(
      [
        when("interactive", "form", [
          doc(
            "https://github.com/github/copilot-cli/blob/main/changelog.md",
            "1.0.114"
          ),
        ]),
        when(
          "Autopilot",
          "form",
          [
            doc(
              "https://github.com/github/copilot-cli/blob/main/changelog.md",
              "1.0.64"
            ),
          ],
          "Autopilot answers the form itself instead of showing it; which answer it gives is not documented."
        ),
      ],
      "URL mode: unverified."
    ),
    stdioEnv: cell(
      "allowlist",
      [doc(`${GHCLI}/how-tos/copilot-cli/customize-copilot/add-mcp-servers`)],
      "`PATH`, a small platform set and `env`."
    ),
    toolTimeout: cell(
      "30 s",
      [doc(`${GHCLI}/how-tos/copilot-cli/customize-copilot/add-mcp-servers`)],
      "Per-server `timeout`; an approval that takes longer may be cut off."
    ),
    approvalDefault: cell("ask", [
      doc(`${GHCLI}/how-tos/copilot-cli/use-copilot-cli/allowing-tools`),
    ]),
    install: cell(
      "config",
      [doc(`${GHCLI}/how-tos/copilot-cli/customize-copilot/add-mcp-servers`)],
      '`copilot mcp add`, with `"tools": ["*"]`.'
    ),
    read: cell(
      "expected",
      [
        doc(
          `${GHCLI}/reference/copilot-cli-reference/cli-config-dir-reference`
        ),
      ],
      "Fails inside `/sandbox`, where the Keychain is closed by default."
    ),
    approval: varies([
      when("interactive", "G1", [
        doc(
          "https://github.com/github/copilot-cli/blob/main/changelog.md",
          "1.0.114"
        ),
      ]),
      when(
        "Autopilot",
        "G1",
        [
          doc(
            "https://github.com/github/copilot-cli/blob/main/changelog.md",
            "1.0.64"
          ),
        ],
        "The form goes to Autopilot, which answers it instead of the human."
      ),
    ]),
    refusal: varies([
      when("interactive", "refused", [
        doc(
          "https://github.com/github/copilot-cli/blob/main/changelog.md",
          "1.0.114"
        ),
      ]),
      whenUnknown(
        "Autopilot",
        "Whether Autopilot accepts, declines or cancels the form is not documented, so the write may run without the human."
      ),
    ]),
    gui: na(),
    headless: varies([
      whenUnknown(
        "`-p`",
        "Shows no approval prompts; what it does with an elicitation is not documented."
      ),
      whenUnknown(
        "Autopilot",
        "Autopilot answers the form itself; whether the write runs is not documented."
      ),
    ]),
    sandbox: cell(
      "opt-in",
      [
        doc(
          `${GHCLI}/reference/copilot-cli-reference/cli-config-dir-reference`
        ),
      ],
      "`sandbox.enabled` (off by default) also wraps MCP servers; `keychainAccess` defaults to false."
    ),
    http: cell("bearer", [
      doc(`${GHCLI}/how-tos/copilot-cli/customize-copilot/add-mcp-servers`),
    ]),
  },
  {
    id: "codex",
    name: "Codex",
    surfaces: ["cli", "ide", "desktop"],
    versionSeen: "rust-v0.170.0",
    config: cell("`~/.codex/config.toml` `[mcp_servers.<name>]`, plugins", [
      doc(`${CODEX_DOC}/extend/mcp.md`),
    ]),
    elicitation: cell(
      "form+url",
      [src(`${CODEX_SRC}/codex-mcp/src/elicitation.rs`, "near rust-v0.170.0")],
      '`approval_policy = "never"` and a missing UI decline automatically.'
    ),
    approvalNote:
      "With `approvals_reviewer = auto_review` a reviewer subagent may answer the form instead of the human.",
    stdioEnv: cell(
      "allowlist",
      [
        src(`${CODEX_SRC}/rmcp-client/src/utils.rs`, "near rust-v0.170.0"),
        doc(`${CODEX_DOC}/config-file/config-reference.md`),
      ],
      "`HOME`, `PATH`, `USER`, locale and a few more, plus `env_vars` and `env`."
    ),
    toolTimeout: cell(
      "60 s",
      [doc(`${CODEX_DOC}/config-file/config-reference.md`)],
      "`tool_timeout_sec`; startup 10 s."
    ),
    approvalDefault: cell(
      "hints",
      [
        doc(`${CODEX_DOC}/agent-approvals-security.md`),
        doc(`${CODEX_DOC}/extend/mcp.md`),
      ],
      'A destructive annotation always asks, unless the tool is also marked read-only, which wins; `approval_mode = "writes"` asks for tools not marked read-only.'
    ),
    install: cell(
      "plugin",
      [doc(`${OAI}/plugins/build/plugins.md`)],
      "The repo marketplace plugin runs the pinned `npx better-tg-cli@<version> mcp`."
    ),
    read: cell(
      "expected",
      [src(`${CODEX_SRC}/rmcp-client/src/utils.rs`, "near rust-v0.170.0")],
      "On Linux the Secret Service needs `DBUS_SESSION_BUS_ADDRESS` in `env_vars`."
    ),
    gui: unknown(
      `Whether the desktop app passes the login-shell PATH is not documented: ${ABS_PATH}.`
    ),
    headless: cell(
      "refused",
      [
        doc(`${CODEX_DOC}/non-interactive-mode.md`),
        src(`${CODEX_SRC}/codex-mcp/src/elicitation.rs`, "near rust-v0.170.0"),
      ],
      '`codex exec` runs with `approval_policy = "never"`, which declines the form.'
    ),
    sandbox: cell(
      "outside",
      [doc(`${CODEX_DOC}/permissions.md`)],
      "The command sandbox covers model-run commands, not MCP servers."
    ),
    http: cell(
      "bearer",
      [doc(`${CODEX_DOC}/extend/mcp.md`)],
      "`bearer_token_env_var`."
    ),
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    surfaces: ["web"],
    config: cell(
      "chatgpt.com/plugins › Add custom MCP server (URL or tunnel)",
      [doc(`${OAI}/api/docs/guides/developer-mode.md`)]
    ),
    elicitation: unknown("The docs do not say whether remote servers can ask."),
    stdioEnv: unknown(
      "Through Secure MCP Tunnel, the environment `tunnel-client` gives a stdio command is not documented."
    ),
    toolTimeout: cell(
      "120 s",
      [doc(`${OAI}/api/docs/guides/secure-mcp-tunnels.md`)],
      "Through Secure MCP Tunnel, an absolute deadline that includes queue time (an approval wait would count too); other limits not documented."
    ),
    approvalDefault: cell(
      "hints",
      [doc(`${OAI}/plugins/reference.md`)],
      "Writes ask; a tool without `readOnlyHint` counts as a write."
    ),
    install: cell(
      "tunnel",
      [doc(`${OAI}/api/docs/guides/secure-mcp-tunnels.md`)],
      "Secure MCP Tunnel: `tunnel-client` on the user's machine can forward to a local stdio command, here `telegram mcp`. A public URL needs OAuth or no auth, and `telegram mcp --http` has a static bearer only (TheVilfer/better-tg-cli#17, #72)."
    ),
    read: unknown(),
    gui: na(),
    headless: na(),
    sandbox: varies([
      when("URL", "cloud", [doc(`${OAI}/plugins/deploy/connect-chatgpt.md`)]),
      when(
        "Secure MCP Tunnel",
        "outside",
        [doc(`${OAI}/api/docs/guides/secure-mcp-tunnels.md`)],
        "Our server runs on the user's machine under `tunnel-client`."
      ),
    ]),
    http: cell("oauth-only", [doc(`${OAI}/plugins/build/auth.md`)]),
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    surfaces: ["cli"],
    versionSeen: "v0.69.0",
    config: cell("`~/.gemini/settings.json` `mcpServers`, extensions", [
      doc(`${GEMINI}/docs/tools/mcp-server.md`, "v0.69.0"),
    ]),
    elicitation: cell(
      "none",
      [
        src(`${GEMINI}/packages/core/src/tools/mcp-client.ts`, "v0.69.0"),
        report("https://github.com/google-gemini/gemini-cli/issues/28074"),
      ],
      "Only `roots` is advertised; the request was closed as not planned."
    ),
    stdioEnv: cell(
      "filtered",
      [
        src(
          "https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/services/environmentSanitization.ts"
        ),
      ],
      "Drops every variable whose name contains TOKEN, KEY, SECRET, AUTH and similar."
    ),
    toolTimeout: cell("10 min", [
      doc(`${GEMINI}/docs/tools/mcp-server.md`, "v0.69.0"),
    ]),
    approvalDefault: cell("ask", [
      doc(`${GEMINI}/docs/reference/policy-engine.md`, "v0.69.0"),
    ]),
    install: cell(
      "extension",
      [doc(`${GEMINI}/docs/extensions/reference.md`, "v0.69.0")],
      "`gemini extensions install https://github.com/TheVilfer/better-tg-cli` (root `gemini-extension.json`)."
    ),
    read: cell(
      "expected",
      [src(`${GEMINI}/packages/core/src/tools/mcp-client.ts`, "v0.69.0")],
      "A stdio server starts only in a trusted folder."
    ),
    gui: na(),
    headless: varies([
      when(
        "policy chose `ask_user`",
        "refused",
        [doc(`${GEMINI}/docs/reference/policy-engine.md`, "v0.69.0")],
        "`ask_user` counts as `deny` in non-interactive runs."
      ),
      whenUnknown(
        "tool allowed (`trust`, an allow rule)",
        "The one-time code goes to the model with nobody to ask; what happens then is unverified."
      ),
    ]),
    sandbox: cell(
      "opt-in",
      [doc(`${GEMINI}/docs/cli/sandbox.md`, "v0.69.0")],
      "`--sandbox` re-launches the whole CLI, MCP servers included; a container has no host Keychain."
    ),
    http: cell("bearer", [
      doc(`${GEMINI}/docs/tools/mcp-server.md`, "v0.69.0"),
    ]),
  },
  {
    id: "windsurf",
    name: "Windsurf (Devin Desktop)",
    surfaces: ["ide"],
    versionSeen: "v3.14.30825",
    config: cell(
      "`~/.config/devin/mcp_config.json` (legacy `~/.codeium/windsurf/mcp_config.json`)",
      [doc(`${DEVIN}/desktop/plugins/cascade/mcp.md`)]
    ),
    elicitation: unknown(
      "Documented for ACP agents only, not for MCP servers."
    ),
    stdioEnv: unknown(),
    toolTimeout: unknown(),
    approvalDefault: cell("ask", [
      doc(`${DEVIN}/desktop/devin-local/permissions.md`),
    ]),
    install: cell("config", [doc(`${DEVIN}/desktop/plugins/cascade/mcp.md`)]),
    read: unknown(),
    gui: unknown("Register `telegram` by its absolute path."),
    headless: unknown(),
    sandbox: unknown(),
    http: cell("bearer", [doc(`${DEVIN}/desktop/plugins/cascade/mcp.md`)]),
  },
  {
    id: "cline",
    name: "Cline",
    surfaces: ["ide", "cli"],
    versionSeen: "v4.1.26",
    config: cell("`cline_mcp_settings.json`", [
      doc(`${CLINE_DOC}/mcp/mcp-overview.md`),
    ]),
    elicitation: cell(
      "none",
      [src(`${CLINE_SRC}/apps/vscode/src/services/mcp/McpHub.ts`)],
      "Capabilities are empty."
    ),
    stdioEnv: varies([
      whenUnknown(
        "VS Code",
        "Two code paths: the MCP SDK default set (`McpHub.ts`) or the full environment (the SDK client); which one the shipped extension uses is unverified."
      ),
      when("CLI", "full", [
        src(`${CLINE_SRC}/sdk/packages/core/src/extensions/mcp/client.ts`),
      ]),
    ]),
    toolTimeout: cell("60 s", [
      src(`${CLINE_SRC}/sdk/packages/shared/src/mcp.ts`),
    ]),
    approvalDefault: cell("ask", [
      doc(`${CLINE_DOC}/features/auto-approve.md`),
    ]),
    install: cell(
      "config",
      [doc(`${CLINE_DOC}/mcp/mcp-overview.md`)],
      "An HTTP entry without `type` is read as legacy SSE."
    ),
    read: varies([
      whenUnknown(
        "VS Code",
        "Depends on the stdio environment. If it is the SDK default set, the Linux Secret Service needs `DBUS_SESSION_BUS_ADDRESS` in `env`."
      ),
      when("CLI", "expected", [
        src(`${CLINE_SRC}/sdk/packages/core/src/extensions/mcp/client.ts`),
      ]),
    ]),
    gui: unknown(),
    headless: unknown(),
    sandbox: unknown(),
    http: cell("bearer", [doc(`${CLINE_DOC}/mcp/mcp-overview.md`)]),
  },
  {
    id: "zed",
    name: "Zed",
    surfaces: ["ide"],
    versionSeen: "v1.29.2",
    config: cell("`settings.json` `context_servers`", [
      doc(`${ZED_DOC}/mcp.md`),
    ]),
    elicitation: cell(
      "none",
      [doc(`${ZED_DOC}/mcp.md`)],
      "Tools and prompts only."
    ),
    stdioEnv: cell(
      "full",
      [src(`${ZED_SRC}/transport/stdio_transport.rs`)],
      "Zed's own environment plus `env`, started through the system shell."
    ),
    toolTimeout: cell(
      "60 s",
      [src(`${ZED_SRC}/client.rs`)],
      "On timeout Zed does not send `notifications/cancelled`."
    ),
    approvalDefault: unknown(
      "`agent.tool_permissions.default` decides; its default is not documented."
    ),
    install: cell("config", [doc(`${ZED_DOC}/mcp.md`)]),
    read: cell("expected", [src(`${ZED_SRC}/transport/stdio_transport.rs`)]),
    gui: unknown(),
    headless: na(),
    sandbox: cell("outside", [doc(`${ZED_DOC}/sandboxing.md`)]),
    http: cell("bearer", [doc(`${ZED_DOC}/mcp.md`)]),
  },
  {
    id: "grok",
    name: "Grok Build",
    surfaces: ["cli"],
    versionSeen: "1.0.45",
    config: cell(
      "`~/.grok/config.toml` `[mcp_servers.<name>]`; also reads `~/.claude.json` and `.mcp.json`",
      [doc(`${GROK_DOC}/features/mcp-servers.md`, "1.0.45")]
    ),
    elicitation: varies(
      [
        when("TUI", "form+url", [
          src(`${GROK_SRC}/xai-grok-mcp/src/servers.rs`, "1.0.45"),
        ]),
        whenUnknown(
          "`grok -p`",
          "The headless frontend answers every form with `cancel`, but whether `!is_acp()` holds there, so that the form is advertised at all, is unverified."
        ),
        whenUnknown(
          "ACP (`grok agent stdio`)",
          "The capability is advertised only when `!is_acp()`, yet an ACP handler for the form exists; whether our server gets the form there is unverified."
        ),
      ],
      "With no UI attached Grok declines the form."
    ),
    stdioEnv: cell("full", [
      src(`${GROK_SRC}/xai-grok-mcp/src/servers.rs`, "1.0.45"),
    ]),
    toolTimeout: cell(
      "6000 s",
      [doc(`${GROK_DOC}/features/mcp-servers.md`, "1.0.45")],
      "Output over 20,000 bytes spills to a file."
    ),
    approvalDefault: cell("ask", [
      doc(`${GROK_DOC}/features/permissions.md`, "1.0.45"),
    ]),
    install: cell(
      "plugin",
      [doc(`${GROK_DOC}/features/skills-plugins-marketplaces.md`, "1.0.45")],
      "`.grok-plugin/marketplace.json`: the skill plus the MCP server through `npx better-tg-cli@latest mcp`."
    ),
    read: cell("expected", [
      src(`${GROK_SRC}/xai-grok-mcp/src/servers.rs`, "1.0.45"),
    ]),
    gui: cell(
      "path",
      [src(`${GROK_SRC}/xai-grok-mcp/src/servers.rs`, "1.0.45")],
      `Started from a GUI, an IDE or ACP, \`/opt/homebrew/bin\` can be missing: ${ABS_PATH}.`
    ),
    headless: unknown(
      "`grok -p` answers every form with `cancel` (`xai-grok-pager/src/headless/ext_protocol.rs`, 1.0.45); whether it advertises the form, so that the write is refused rather than handed a one-time code, is unverified."
    ),
    sandbox: cell(
      "opt-in",
      [doc(`${GROK_DOC}/features/sandbox.md`, "1.0.45")],
      "`--sandbox` wraps the whole process; `workspace` blocks writes to `~/.config/tg`."
    ),
    http: cell(
      "bearer",
      [
        doc(`${GROK_DOC}/features/mcp-servers.md`, "1.0.45"),
        doc(
          `${GROK_SRC}/xai-grok-pager/docs/user-guide/07-mcp-servers.md`,
          "1.0.45"
        ),
      ],
      "`headers`; `bearer_token_file` (1.0.45) is in the repo user guide, not on the docs site."
    ),
  },
  {
    id: "grok-bot",
    name: "Grok Bot",
    surfaces: ["cloud"],
    config: cell(
      "Connect apps › Add a custom connector (Remote HTTPS or Command)",
      [doc(`${GROKBOT}/computer-and-apps.md`)]
    ),
    elicitation: unknown("Not mentioned in the docs."),
    stdioEnv: unknown(
      "Command connectors run on the cloud computer; their environment is not documented."
    ),
    toolTimeout: unknown(),
    approvalDefault: cell(
      "model",
      [doc(`${GROKBOT}/approvals-security-and-privacy.md`)],
      "Auto Review, a model-based check, is on by default."
    ),
    install: varies([
      when(
        "Remote HTTPS",
        "ui",
        [
          doc(`${GROKBOT}/computer-and-apps.md`),
          report(
            "https://forum.cursor.com/t/does-grok-bot-support-local-mcp-e-g-workflowy/168182"
          ),
        ],
        "A public `telegram mcp --http` URL with an `Authorization` header; a server on the user's own machine is not reachable directly."
      ),
      whenUnknown(
        "cloud Command",
        "Would run `telegram` on the Bot's cloud computer; its environment, a lasting session store and forms are not documented."
      ),
    ]),
    read: unknown(),
    approval: varies([
      when(
        "Remote HTTPS",
        "G2",
        [doc(`${GROKBOT}/computer-and-apps.md`)],
        "The HTTP server never shows the form."
      ),
      whenUnknown("cloud Command"),
    ]),
    gui: na(),
    headless: na(),
    sandbox: cell(
      "cloud",
      [doc(`${GROKBOT}/security.md`)],
      "Remote connectors are dialled from the vendor's servers."
    ),
    http: cell(
      "bearer",
      [doc(`${GROKBOT}/computer-and-apps.md`)],
      "Needs a public HTTPS URL."
    ),
  },
  {
    id: "hermes",
    name: "Hermes Agent",
    surfaces: ["cli", "desktop"],
    versionSeen: "v0.23.2",
    config: cell("`~/.hermes/config.yaml` `mcp_servers`, plugins", [
      doc(`${HERMES_DOC}/features/mcp`),
    ]),
    elicitation: cell(
      "form+url",
      [
        doc(`${HERMES_DOC}/features/mcp`),
        src(`${HERMES_SRC}/tools/mcp_tool_sampling.py`, "v0.23.2"),
      ],
      "URL mode is advertised but declined. Before v0.23.2 an Allow answers with empty content, which counts as approval."
    ),
    stdioEnv: cell(
      "allowlist",
      [
        doc(`${HERMES_DOC}/security`),
        src(`${HERMES_SRC}/tools/mcp_tool_config.py`, "v0.23.2"),
      ],
      "`PATH`, `HOME`, locale, `XDG_*` and a few more, plus `env`; `DBUS_SESSION_BUS_ADDRESS` must be forwarded."
    ),
    toolTimeout: cell(
      "300 s",
      [doc(`${HERMES_DOC}/features/mcp`)],
      "The approval form has its own 300 s; the tool deadline probably fires first (inferred from source)."
    ),
    approvalDefault: cell(
      "allow",
      [doc(`${HERMES_DOC}/features/mcp`)],
      "`trust: full` is the default; `untrusted` asks for tools without `readOnlyHint`."
    ),
    install: cell(
      "catalog",
      [doc(`${HERMES_DOC}/features/plugin-catalog`)],
      "The plugin catalog entry installs `agent-plugin/`, which forwards `DBUS_SESSION_BUS_ADDRESS` and `XDG_RUNTIME_DIR`."
    ),
    read: cell("expected", [doc(`${HERMES_DOC}/security`)]),
    gui: unknown(),
    headless: cell(
      "refused",
      [doc(`${HERMES_DOC}/features/mcp`)],
      "Cron, `hermes chat -q` and unattended runs decline."
    ),
    sandbox: unknown(),
    http: cell("bearer", [doc(`${HERMES_DOC}/features/mcp`)]),
  },
  {
    id: "opencode",
    name: "OpenCode",
    surfaces: ["cli", "desktop"],
    versionSeen: "v2.3.2 (V2), v1.19.6 (V1)",
    config: cell("`opencode.json` `mcp.servers` (V2), `command` as an array", [
      doc(`${OPENCODE_DOC}/mcp-servers/`),
    ]),
    elicitation: varies([
      when("V2", "form+url", [
        src(`${OPENCODE_SRC}/packages/core/src/mcp/client.ts`, "v2.3.x"),
      ]),
      when(
        "V1",
        "none",
        [src(`${OPENCODE_V1}/packages/opencode/src/mcp/index.ts`, "v1.19.6")],
        "The capability is commented out."
      ),
    ]),
    stdioEnv: cell(
      "full",
      [
        doc(`${OPENCODE_DOC}/mcp-servers/`),
        src(`${OPENCODE_SRC}/packages/core/src/mcp/stdio.ts`, "v2.3.x"),
      ],
      "In V2 the environment of the shared background service."
    ),
    toolTimeout: cell(
      "12 h",
      [doc(`${OPENCODE_DOC}/mcp-servers/`)],
      "V2 `execution`; startup 30 s, but `opencode run` waits 2 s (anomalyco/opencode#63310)."
    ),
    approvalDefault: cell(
      "allow",
      [doc(`${OPENCODE_DOC}/permissions/`)],
      "The base policy allows every action."
    ),
    install: cell(
      "config",
      [
        doc(`${OPENCODE_DOC}/mcp-servers/`),
        report("https://github.com/anomalyco/opencode/issues/63310"),
      ],
      "Prefer the installed binary: a cold `npx` misses the 2 s startup of `opencode run`."
    ),
    read: cell("expected", [
      src(`${OPENCODE_SRC}/packages/core/src/mcp/stdio.ts`, "v2.3.x"),
    ]),
    gui: cell(
      "path",
      [report("https://github.com/anomalyco/opencode/issues/16854")],
      `"command not found" in Desktop without PATH: ${ABS_PATH}.`
    ),
    headless: varies([
      when(
        "V2 `opencode run`",
        "refused",
        [
          src(
            `${OPENCODE_SRC}/packages/cli/src/run/noninteractive.ts`,
            "v2.3.x"
          ),
        ],
        "Every form is cancelled, `--auto` included."
      ),
      whenUnknown("V1"),
    ]),
    sandbox: unknown(),
    http: cell(
      "bearer",
      [doc(`${OPENCODE_DOC}/mcp-servers/`)],
      '`"oauth": false` and an `Authorization` header.'
    ),
  },
  {
    id: "goose",
    name: "Goose",
    surfaces: ["cli", "desktop"],
    versionSeen: "v1.60.1",
    config: cell("`~/.config/goose/config.yaml` `extensions`", [
      doc(`${GOOSE_DOC}/guides/config-files.md`),
    ]),
    elicitation: cell(
      "form",
      [
        doc(`${GOOSE_DOC}/guides/mcp-elicitation.md`),
        src(`${GOOSE_SRC}/crates/oi-kit-agent/src/mcp/client.rs`),
      ],
      "Some builds advertise a bare `elicitation: {}` (aaif-goose/goose#13300), which we read as form."
    ),
    stdioEnv: cell(
      "full",
      [
        src(`${GOOSE_SRC}/crates/oi-kit-agent/src/mcp/stdio.rs`),
        src(`${GOOSE_SRC}/crates/goose/src/config/search_path.rs`),
      ],
      "PATH is rewritten with its own search paths, `/opt/homebrew/bin` included."
    ),
    toolTimeout: cell(
      "300 s",
      [doc(`${GOOSE_DOC}/guides/config-files.md`)],
      "Per extension `timeout`."
    ),
    approvalDefault: cell(
      "allow",
      [doc(`${GOOSE_DOC}/guides/managing-tools/goose-permissions.md`)],
      "`GOOSE_MODE=auto` (fully autonomous) is the default."
    ),
    install: cell("config", [doc(`${GOOSE_DOC}/guides/config-files.md`)]),
    read: cell("expected", [
      src(`${GOOSE_SRC}/crates/oi-kit-agent/src/mcp/stdio.rs`),
    ]),
    gui: varies([
      when(
        "Desktop on macOS, Linux without Flatpak",
        "ok",
        [src(`${GOOSE_SRC}/ui/desktop/src/loginShellPath.ts`)],
        "Only PATH comes from the login shell; other exported variables (`TG_PROFILE`) are missing."
      ),
      whenUnknown(
        "Desktop on Windows, Linux Flatpak",
        "The login-shell PATH lookup is skipped."
      ),
    ]),
    headless: cell(
      "aborts",
      [src(`${GOOSE_SRC}/crates/goose-cli/src/session/mod.rs`)],
      "`goose run` aborts the whole run when a write asks for approval."
    ),
    sandbox: unknown(),
    http: cell(
      "bearer",
      [doc(`${GOOSE_DOC}/getting-started/using-extensions.md`)],
      "Streamable HTTP only, no SSE."
    ),
  },
  {
    id: "droid",
    name: "Factory Droid",
    surfaces: ["cli", "desktop"],
    versionSeen: "CLI v1.15.0",
    config: cell("`~/.factory/mcp.json`, project `.factory/mcp.json`", [
      doc(`${FACTORY}/harness/mcp.md`),
    ]),
    elicitation: unknown(
      "A changelog entry mentions resuming elicitations; the mode and the answers are not documented."
    ),
    stdioEnv: unknown(
      "With the sandbox on, servers get a minimal allowlist; without it, not documented."
    ),
    toolTimeout: unknown(
      "Connect timeout 30 s for stdio; the tool-call default is not documented."
    ),
    approvalDefault: cell(
      "rules",
      [doc(`${FACTORY}/autonomy-and-safety/auto-run.md`)],
      "Each tool's risk level is compared with the autonomy level."
    ),
    install: cell("config", [doc(`${FACTORY}/harness/mcp.md`)]),
    read: unknown(),
    gui: unknown(),
    headless: unknown(
      "`droid exec` cannot collect an interactive approval; what a write does there is not documented."
    ),
    sandbox: cell(
      "opt-in",
      [doc(`${FACTORY}/autonomy-and-safety/sandbox.md`)],
      "The sandbox strips the environment and checks file and network access."
    ),
    http: cell("bearer", [doc(`${FACTORY}/harness/mcp.md`)]),
  },
  {
    id: "amp",
    name: "Amp",
    surfaces: ["cli", "desktop"],
    config: cell("`amp.mcpServers` in `~/.config/amp/settings.json`", [
      doc(`${AMP}/markdown/customize/mcp`),
    ]),
    elicitation: unknown(
      "Documented (form and URL) only for remote definitions stored on ampcode.com, not for local servers."
    ),
    stdioEnv: unknown(),
    toolTimeout: unknown(),
    approvalDefault: cell(
      "allow",
      [doc(`${AMP}/tools`)],
      '"By default, Amp does not ask for approval before running tools."'
    ),
    install: cell("config", [doc(`${AMP}/markdown/customize/mcp`)]),
    read: unknown(),
    gui: unknown(),
    headless: unknown(),
    sandbox: unknown(),
    http: cell(
      "bearer",
      [doc(`${AMP}/markdown/customize/mcp`)],
      "A local URL entry; remote definitions are dialled from Amp's servers."
    ),
  },
  {
    id: "warp",
    name: "Warp",
    surfaces: ["desktop", "cli"],
    config: varies([
      when("Desktop", "Settings › Agents › MCP servers, `~/.warp/.mcp.json`", [
        doc(`${WARP_DOC}/capabilities/mcp/`),
      ]),
      when("CLI (macOS)", "`~/.warp_cli/.mcp.json` (global only)", [
        doc(`${WARP_DOC}/cli/configuration/`),
      ]),
    ]),
    elicitation: cell(
      "none",
      [src(`${WARP_SRC}/crates/mcp/src/runtime.rs`)],
      "No client capabilities are advertised."
    ),
    stdioEnv: cell("full", [src(`${WARP_SRC}/crates/mcp/src/runtime.rs`)]),
    toolTimeout: unknown(),
    approvalDefault: cell(
      "rules",
      [doc(`${WARP_DOC}/capabilities/agent-profiles-permissions/`)],
      'Per server, not per tool; the default is "Agent decides".'
    ),
    install: cell("config", [doc(`${WARP_DOC}/capabilities/mcp/`)]),
    read: cell("expected", [src(`${WARP_SRC}/crates/mcp/src/runtime.rs`)]),
    gui: cell(
      "ok",
      [src(`${WARP_SRC}/app/src/ai/mcp/templatable_manager/native.rs`)],
      "PATH comes from a bootstrapped terminal session."
    ),
    headless: unknown(),
    sandbox: unknown(),
    http: cell(
      "bearer",
      [
        doc(`${WARP_DOC}/capabilities/mcp/`),
        report("https://github.com/warpdotdev/Warp/issues/8356"),
      ],
      "Open issue: the `Authorization` header is not sent to a localhost server."
    ),
  },
  {
    id: "kiro",
    name: "Kiro",
    surfaces: ["ide", "cli"],
    config: cell(
      "`~/.kiro/settings/mcp.json`, workspace `.kiro/settings/mcp.json`",
      [doc(`${KIRO}/mcp/configuration.md`)]
    ),
    elicitation: cell(
      "form+url",
      [
        doc(`${KIRO}/mcp/usage.md`),
        report("https://github.com/kirodotdev/Kiro/issues/11385"),
      ],
      "A server loaded through a Power gets every form cancelled (kirodotdev/Kiro#11385); the CLI only in local V3 sessions from 2.34."
    ),
    stdioEnv: varies([
      when("CLI 2.41+", "full", [
        report("https://github.com/kirodotdev/Kiro/issues/10118"),
      ]),
      whenUnknown("IDE", "Not documented."),
    ]),
    toolTimeout: unknown(
      "Initialization must finish in 5 s (`mcp.initTimeout`); the tool-call default is not documented."
    ),
    approvalDefault: cell(
      "ask",
      [doc(`${KIRO}/mcp/usage.md`)],
      "Untrusted workspaces ask before every call."
    ),
    install: cell(
      "config",
      [
        doc(`${KIRO}/mcp/configuration.md`),
        doc(`${KIRO}/reference/settings.md`),
      ],
      "A plain `mcp.json` entry, not a Power; a cold `npx` can miss the 5 s start."
    ),
    read: varies([
      when("CLI 2.41+", "expected", [
        report("https://github.com/kirodotdev/Kiro/issues/10118"),
      ]),
      whenUnknown("IDE", "Depends on the stdio environment."),
    ]),
    gui: unknown("Register `telegram` by its absolute path."),
    headless: unknown(),
    sandbox: cell(
      "opt-in",
      [doc(`${KIRO}/mcp/security.md`)],
      "`mcpSandboxing` limits file and network access of stdio servers."
    ),
    http: cell(
      "bearer",
      [doc(`${KIRO}/mcp/configuration.md`)],
      "HTTPS, or plain HTTP on localhost."
    ),
  },
  {
    id: "aside",
    name: "Aside",
    surfaces: ["desktop"],
    versionSeen: "app 1.0.1116.2",
    config: cell("Settings › MCP", [doc(`${ASIDE}/changelog/components.md`)]),
    elicitation: cell(
      "none",
      [src("Aside.app daemon (binary)", "1.0.1116.2")],
      "No elicitation capability or handler in the client."
    ),
    stdioEnv: unknown(
      "The daemon (binary 1.0.1116.2) passes its own environment plus `env`, or only `env` when `inheritEnv` is false; which one a user's server gets is unverified."
    ),
    toolTimeout: cell(
      "60 s",
      [src("Aside.app daemon (binary)", "1.0.1116.2")],
      "Sends `notifications/cancelled` on timeout."
    ),
    approvalDefault: cell(
      "rules",
      [doc(`${ASIDE}/help/security.md`)],
      "Allow / Ask / Deny rules per tool."
    ),
    install: cell("ui", [doc(`${ASIDE}/changelog/components.md`)]),
    read: unknown("Depends on the stdio environment."),
    gui: unknown(
      `Whether the daemon gets the login-shell PATH is unknown: ${ABS_PATH}.`
    ),
    headless: na(),
    sandbox: unknown(
      "Aside has a sandbox toggle; whether it wraps MCP servers is not documented."
    ),
    http: cell(
      "bearer",
      [src("Aside AgentManager bundle (settings schema)", "1.0.1116.2")],
      "Streamable HTTP with static headers or OAuth; no SSE."
    ),
  },
];

const notLive = (evidence: Evidence[]) =>
  evidence.filter((e) => e.level !== "live");

function fromCases<V extends string>(cases: Case<V>[]): Cell<V> {
  if (cases.length === 1 && !cases[0].when) {
    const { value, note, evidence } = cases[0];
    return { value, ...withNote(note), evidence };
  }
  return varies(cases);
}

function derive<V extends string, W extends string>(
  from: Case<V>,
  value: W | "unknown",
  note?: string
): Case<W> {
  const evidence = value === "unknown" ? [] : notLive(from.evidence);
  if (value !== "unknown" && !evidence.length) {
    return when<W>(from.when, "unknown", [], "Record it live.");
  }
  return when<W>(from.when, value, evidence, note);
}

/**
 * The approval level a write gets in mode `ask` with the released server (`gateWrite` in
 * `src/mcp.ts`), per configuration: a client that advertises elicitation gets our form (G1); one
 * that does not gets the one-time code the model must take to the human (G2). The evidence is the
 * client's.
 */
export function approvalOf(c: ClientRecord): Cell<Approval> {
  if (c.approval) {
    return c.approval;
  }
  if (casesOf(c.install).every((k) => k.value === "none")) {
    return unknown();
  }
  return fromCases(
    casesOf(c.elicitation).map((e) => {
      if (e.value === "unknown") {
        return when<Approval>(
          e.when,
          "unknown",
          [],
          "Depends on whether the client advertises elicitation."
        );
      }
      if (e.value === "n/a") {
        return when<Approval>(e.when, "n/a");
      }
      return e.value === "none"
        ? derive(e, "G2")
        : derive(e, "G1", c.approvalNote);
    })
  );
}

/**
 * What a "no" does with the released server, per configuration. G1: a decline or cancel answer to
 * the form, or no answer within the server's own 10-minute timer, refuses the write and nothing is
 * sent; there is no fallback to a code. G2: the human refuses in chat, and nothing is sent without
 * the code, though the model sees the code itself.
 */
export function refusalOf(c: ClientRecord): Cell<Refusal> {
  if (c.refusal) {
    return c.refusal;
  }
  return fromCases(
    casesOf(approvalOf(c)).map((a) =>
      a.value === "G1"
        ? derive<Approval, Refusal>(a, "refused")
        : a.value === "G2"
          ? derive<Approval, Refusal>(a, "chat")
          : when<Refusal>(a.when, a.value)
    )
  );
}

export type Status = "supported" | "untested" | "unsupported";

/** The cells a client needs a live entry in, in every configuration, before it may be called supported. */
export const LIVE_REQUIRED = [
  "install",
  "read",
  "approval",
  "refusal",
] as const;

export function outcomeCells(
  c: ClientRecord
): Record<(typeof LIVE_REQUIRED)[number], Cell> {
  return {
    install: c.install,
    read: c.read,
    approval: approvalOf(c),
    refusal: refusalOf(c),
  };
}

const hasLive = (cell: { evidence: Evidence[] }) =>
  cell.evidence.some((e) => e.level === "live");
const liveVersions = (k: Case) =>
  new Set(k.evidence.flatMap((e) => (e.level === "live" ? [e.version] : [])));
const caseFor = (cell: Cell, label: string) =>
  cell.cases ? cell.cases.find((k) => k.when === label) : casesOf(cell)[0];

const ROUTES = new Set<string>([
  "plugin",
  "extension",
  "mcpb",
  "catalog",
  "config",
  "ui",
  "tunnel",
  "beta",
] satisfies Install[]);
const REFUSAL_OF: Record<"G1" | "G2", Refusal> = { G1: "refused", G2: "chat" };

export function statusOf(c: ClientRecord): Status {
  if (casesOf(c.install).every((k) => k.value === "none")) {
    return "unsupported";
  }
  const cells = Object.values(outcomeCells(c));
  const labels = [
    ...new Set(cells.flatMap((cell) => (cell.cases ?? []).map((k) => k.when))),
  ];
  const supportedIn = (label: string) => {
    const found = cells.map((cell) => caseFor(cell, label));
    if (found.some((k) => !k)) {
      return false;
    }
    const [install, read, approval, refusal] = found as Case[];
    if (!ROUTES.has(install.value) || read.value !== "works") {
      return false;
    }
    if (approval.value !== "G1" && approval.value !== "G2") {
      return false;
    }
    if (refusal.value !== REFUSAL_OF[approval.value]) {
      return false;
    }
    const [first, ...rest] = (found as Case[]).map(liveVersions);
    return [...first].some((v) => rest.every((s) => s.has(v)));
  };
  return (labels.length ? labels : [""]).every(supportedIn)
    ? "supported"
    : "untested";
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Problems in the records, as readable lines; empty when the data is consistent. */
export function validate(clients: ClientRecord[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const c of clients) {
    if (ids.has(c.id)) {
      problems.push(`${c.id}: duplicate id`);
    }
    ids.add(c.id);
    const cells: [string, Cell][] = [
      ["config", c.config],
      ["elicitation", c.elicitation],
      ["stdioEnv", c.stdioEnv],
      ["toolTimeout", c.toolTimeout],
      ["approvalDefault", c.approvalDefault],
      ["install", c.install],
      ["read", c.read],
      ["approval", approvalOf(c)],
      ["refusal", refusalOf(c)],
      ["gui", c.gui],
      ["headless", c.headless],
      ["sandbox", c.sandbox],
      ["http", c.http],
    ];
    if (c.update) {
      cells.push(["update", c.update]);
    }
    for (const [name, cell] of cells) {
      if (cell.value === "varies" || cell.cases) {
        if (cell.value !== "varies" || !cell.cases?.length) {
          problems.push(
            `${c.id}.${name}: "varies" needs cases, and cases need "varies"`
          );
        }
        if (cell.evidence.length) {
          problems.push(
            `${c.id}.${name}: a "varies" cell keeps its evidence in its cases`
          );
        }
        const labels = new Set<string>();
        for (const k of cell.cases ?? []) {
          if (!k.when.trim()) {
            problems.push(`${c.id}.${name}: a case without a label`);
          }
          if (labels.has(k.when)) {
            problems.push(`${c.id}.${name}: duplicate case "${k.when}"`);
          }
          labels.add(k.when);
        }
      }
      for (const k of casesOf(cell)) {
        const at = k.when ? `${c.id}.${name} [${k.when}]` : `${c.id}.${name}`;
        if (k.value === "unknown" && k.evidence.length) {
          problems.push(`${at}: unknown but has evidence`);
        }
        if (k.value !== "unknown" && k.value !== "n/a" && !k.evidence.length) {
          problems.push(`${at}: "${k.value}" has no evidence`);
        }
        for (const e of k.evidence) {
          if (e.level === "live") {
            if (!e.version?.trim()) {
              problems.push(`${at}: live entry without a client version`);
            }
            if (!DATE.test(e.date ?? "")) {
              problems.push(`${at}: live entry without a date (YYYY-MM-DD)`);
            }
          } else {
            if (!e.ref?.trim()) {
              problems.push(`${at}: ${e.level} entry without a reference`);
            }
            if (!DATE.test(e.checked ?? "")) {
              problems.push(`${at}: ${e.level} entry without a checked date`);
            }
          }
        }
        if (k.value === "works" && !hasLive(k)) {
          problems.push(`${at}: "works" without a live entry`);
        }
        if (
          name === "update" &&
          (k.value === "shown" || k.value === "none") &&
          !hasLive(k)
        ) {
          problems.push(`${at}: "${k.value}" without a live entry`);
        }
      }
    }
    const envCases = casesOf(c.stdioEnv);
    for (const k of casesOf(c.read)) {
      if (k.value !== "expected") {
        continue;
      }
      const env =
        c.stdioEnv.cases && k.when
          ? envCases.filter((e) => e.when === k.when)
          : envCases;
      if (!env.length || env.some((e) => e.value === "unknown")) {
        problems.push(
          `${c.id}.read${k.when ? ` [${k.when}]` : ""}: "expected" while its stdio environment is unknown`
        );
      }
    }
  }
  return problems;
}
