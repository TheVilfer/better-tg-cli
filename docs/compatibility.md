# Agent compatibility

<!-- Generated from src/clients/data.ts by scripts/compat-matrix.ts. Do not edit by hand; run `bun scripts/compat-matrix.ts`. -->

How Better-TG-CLI behaves inside each agent client, and how we know it. A client is
**supported** only after install, reading, write approval and refusal were each seen working
with a named client version on a named date (`live`). Everything else comes from the client's
docs or source and says what we expect, not what we saw.

Supported: **0** of 22. Untested: 22. Not possible yet: 0.

**Evidence**, strongest first. A table cell shows the strongest one it has; the sections below list all of them. Where the answer depends on the interface, version or mode, a cell lists each one: `V1: G2 (src); V2: G1 (src)`.

- `live`: our server was run in that client (client version and date).
- `src`: the client's source code or binary was read, but not run.
- `doc`: the client's official documentation.
- `report`: a public issue or forum thread, not an official doc.
- `?`: nobody could confirm it.

## Better-TG-CLI in each client

| Client | Status | Install | Read | Write approval² | Refusal² | Update notice¹ | GUI | Headless² | Sandbox² | HTTP |
|---|---|---|---|---|---|---|---|---|---|---|
| Claude Code | untested | stdio (`claude mcp add`): config (doc); plugin: plugin (doc) | expected (doc) | stdio (`claude mcp add`): G1 (doc); plugin: G2 (doc) | stdio (`claude mcp add`): refused (doc); plugin: chat (doc) | ? | n/a | `-p --permission-prompts none`, no hook answers: refused (doc); plain `-p`: ? | outside (doc) | bearer (doc) |
| Claude Desktop (chat) | untested | mcpb (doc) | expected (doc) | G2 (report) | chat (report) | ? | ? | n/a | outside (doc) | oauth-only (doc) |
| claude.ai | untested | beta (doc) | ? | G2 (doc) | chat (doc) | ? | n/a | n/a | cloud (doc) | oauth-only (doc) |
| Cursor | untested | plugin (doc) | ? | IDE: G1 (doc); CLI: ? | IDE: refused (doc); CLI: ? | ? | ? | `agent -p`, tool not allowed: refused (doc); `agent -p`, tool allowed: ? | ? | bearer (doc) |
| VS Code Copilot | untested | config (doc) | ? | G1 (doc) | refused (doc) | ? | ? | refused (doc) | opt-in (doc) | bearer (doc) |
| Copilot CLI | untested | config (doc) | expected (doc) | interactive: G1 (doc); Autopilot: ? | interactive: refused (doc); Autopilot: ? | ? | n/a | ? | opt-in (doc) | bearer (doc) |
| Codex | untested | plugin (doc) | expected (src) | G1 (src) | refused (src) | ? | ? | refused (src) | outside (doc) | bearer (doc) |
| ChatGPT | untested | tunnel (doc) | ? | ? | ? | ? | n/a | n/a | URL: cloud (doc); Secure MCP Tunnel: outside (doc) | oauth-only (doc) |
| Gemini CLI | untested | extension (doc) | expected (src) | G2 (src) | chat (src) | ? | n/a | policy chose `ask_user`: refused (doc); tool allowed (`trust`, an allow rule): ? | opt-in (doc) | bearer (doc) |
| Windsurf (Devin Desktop) | untested | config (doc) | ? | ? | ? | ? | ? | ? | ? | bearer (doc) |
| Cline | untested | config (doc) | VS Code: ?; CLI: expected (src) | G2 (src) | chat (src) | ? | ? | ? | ? | bearer (doc) |
| Zed | untested | config (doc) | expected (src) | G2 (doc) | chat (doc) | ? | ? | n/a | outside (doc) | bearer (doc) |
| Grok Build | untested | plugin (doc) | expected (src) | TUI: G1 (src); `grok -p`: ?; ACP (`grok agent stdio`): ? | TUI: refused (src); `grok -p`: ?; ACP (`grok agent stdio`): ? | ? | path (src) | ? | opt-in (doc) | bearer (doc) |
| Grok Bot | untested | Remote HTTPS: ui (doc); cloud Command: ? | ? | Remote HTTPS: G2 (doc); cloud Command: ? | Remote HTTPS: chat (doc); cloud Command: ? | ? | n/a | n/a | cloud (doc) | bearer (doc) |
| Hermes Agent | untested | catalog (doc) | expected (doc) | G1 (src) | refused (src) | ? | ? | refused (doc) | ? | bearer (doc) |
| OpenCode | untested | config (doc) | expected (src) | V2: G1 (src); V1: G2 (src) | V2: refused (src); V1: chat (src) | ? | path (report) | V2 `opencode run`: refused (src); V1: ? | ? | bearer (doc) |
| Goose | untested | config (doc) | expected (src) | G1 (src) | refused (src) | ? | Desktop on macOS, Linux: ok (src); Desktop on Windows, Flatpak: ? | aborts (src) | ? | bearer (doc) |
| Factory Droid | untested | config (doc) | ? | ? | ? | ? | ? | ? | opt-in (doc) | bearer (doc) |
| Amp | untested | config (doc) | ? | ? | ? | ? | ? | ? | ? | bearer (doc) |
| Warp | untested | config (doc) | expected (src) | G2 (src) | chat (src) | ? | ok (src) | ? | ? | bearer (doc) |
| Kiro | untested | config (doc) | CLI 2.41+: expected (report); IDE: ? | G1 (doc) | refused (doc) | ? | ? | ? | opt-in (doc) | bearer (doc) |
| Aside | untested | ui (doc) | ? | G2 (src) | chat (src) | ? | ? | n/a | ? | bearer (src) |

¹ Unknown in every client until seen live. Over MCP the notice is never part of a tool result: the commands the server runs get `TG_NO_UPDATE_CHECK=1` (`src/mcp.ts`). When an agent runs the `telegram` CLI, the notice goes to stderr only if stderr is a terminal, `CI` and `TG_NO_UPDATE_CHECK` are unset and a newer version is already cached (`src/update.ts`), so an agent that runs commands in a pseudo-terminal may see it.

² Write approval, refusal, headless and sandbox describe the local MCP server (`telegram mcp`). The skill route (the agent runs the `telegram` CLI in a shell) and `telegram mcp --http` are G2 in every client: the CLI prints a one-time code, and the HTTP server never asks the client for a form.

- **Install:** `plugin`, `extension`, `catalog` (a plugin directory or catalog), `mcpb` (a Claude Desktop extension), `config` (an entry in the client's MCP config), `ui` (added in the client's settings), `tunnel` (through the vendor's tunnel to a server on the user's machine), `beta` (only in a limited beta), `none` (no way today).
- **Read:** `works` (seen live), `expected` (nothing known stands in the way), `blocked`.
- **Write approval** in write mode `ask`: `G1`, the client gets our approval form (MCP elicitation) and the model never sees a code. The server checks the answer, not who gave it: by default the human answers, but in some modes a hook, a reviewer agent or an autopilot may answer instead (named in the client's section). `G2`, the model gets a one-time code and must ask the human in chat, which guards against mistakes but not against a model that uses the code itself.
- **Refusal:** `refused`, a decline or cancel answer to our form, or no answer within the server's own 10-minute timer, refuses the write and nothing is sent, with no fallback to a code. Cancelling the tool call itself (a client timeout, `notifications/cancelled`) does not withdraw the form: the server keeps waiting for its answer, and an approval that still arrives runs the write. `chat`, the human says no in chat and nothing is sent without the code.
- **GUI:** `ok` (gets the login-shell PATH), `path` (may not: register `telegram` by its absolute path).
- **Headless:** what a write does in an unattended run (`-p`, `exec`, cron, Autopilot): `refused` (the approval is refused), `aborts` (the whole run stops).
- **Sandbox:** `outside` (our server runs outside the client's sandbox), `opt-in` (an optional sandbox can wrap it and may close the Keychain or the network), `cloud` (the client runs in the vendor's cloud).
- **HTTP:** `bearer` (can send the static `Authorization: Bearer` token of `telegram mcp --http`), `oauth-only` (needs OAuth, which the HTTP server does not offer yet).

## Client facts

| Client | MCP config | Approval form | stdio env | Tool timeout | Default approval |
|---|---|---|---|---|---|
| Claude Code | `~/.claude.json`, project `.mcp.json`, plugins (doc) | form+url (doc) | full (doc) | ≈28 h (doc) | ask (doc) |
| Claude Desktop (chat) | `claude_desktop_config.json` or a `.mcpb` extension (doc) | none (report) | allowlist (doc) | 240 s (doc) | ask (doc) |
| claude.ai | Customize › Connectors › Add custom connector (a public URL) (doc) | none (doc) | n/a | 240 s (doc) | hints (doc) |
| Cursor | `~/.cursor/mcp.json`, project `.cursor/mcp.json`, plugins (doc) | IDE: form (doc); CLI: ? | ? | ~60 s (report) | ask (doc) |
| VS Code Copilot | `~/.copilot/mcp-config.json`, workspace `.mcp.json` (doc) | form+url (doc) | ? | ? | ask (doc) |
| Copilot CLI | `~/.copilot/mcp-config.json` (`tools` is required), `.mcp.json` (doc) | interactive: form (doc); Autopilot: ? | allowlist (doc) | 30 s (doc) | ask (doc) |
| Codex | `~/.codex/config.toml` `[mcp_servers.<name>]`, plugins (doc) | form+url (src) | allowlist (src) | 60 s (doc) | hints (doc) |
| ChatGPT | chatgpt.com/plugins › Add custom MCP server (URL or tunnel) (doc) | ? | ? | 120 s (doc) | hints (doc) |
| Gemini CLI | `~/.gemini/settings.json` `mcpServers`, extensions (doc) | none (src) | filtered (src) | 10 min (doc) | ask (doc) |
| Windsurf (Devin Desktop) | `~/.config/devin/mcp_config.json` (legacy `~/.codeium/windsurf/mcp_config.json`) (doc) | ? | ? | ? | ask (doc) |
| Cline | `cline_mcp_settings.json` (doc) | none (src) | VS Code: ?; CLI: full (src) | 60 s (src) | ask (doc) |
| Zed | `settings.json` `context_servers` (doc) | none (doc) | full (src) | 60 s (src) | ? |
| Grok Build | `~/.grok/config.toml` `[mcp_servers.<name>]`; also reads `~/.claude.json` and `.mcp.json` (doc) | TUI: form+url (src); `grok -p`: ?; ACP (`grok agent stdio`): ? | full (src) | 6000 s (doc) | ask (doc) |
| Grok Bot | Connect apps › Add a custom connector (Remote HTTPS or Command) (doc) | ? | ? | ? | model (doc) |
| Hermes Agent | `~/.hermes/config.yaml` `mcp_servers`, plugins (doc) | form+url (src) | allowlist (src) | 300 s (doc) | allow (doc) |
| OpenCode | `opencode.json` `mcp.servers` (V2), `command` as an array (doc) | V2: form+url (src); V1: none (src) | full (src) | 12 h (doc) | allow (doc) |
| Goose | `~/.config/goose/config.yaml` `extensions` (doc) | form (src) | full (src) | 300 s (doc) | allow (doc) |
| Factory Droid | `~/.factory/mcp.json`, project `.factory/mcp.json` (doc) | ? | ? | ? | rules (doc) |
| Amp | `amp.mcpServers` in `~/.config/amp/settings.json` (doc) | ? | ? | ? | allow (doc) |
| Warp | Desktop: Settings › Agents › MCP servers, `~/.warp/.mcp.json` (doc); CLI (macOS): `~/.warp_cli/.mcp.json` (global only) (doc) | none (src) | full (src) | ? | rules (doc) |
| Kiro | `~/.kiro/settings/mcp.json`, workspace `.kiro/settings/mcp.json` (doc) | form+url (doc) | CLI 2.41+: full (report); IDE: ? | ? | ask (doc) |
| Aside | Settings › MCP (doc) | none (src) | ? | 60 s (src) | rules (doc) |

- **Approval form:** `form+url`, `form` or `none`, what the client advertises for MCP elicitation.
- **stdio env:** `full` (the client's whole environment), `filtered` (all but names that look secret), `allowlist` (only a fixed set plus the configured `env`).
- **Default approval:** `ask` (asks before an MCP tool runs), `allow` (runs it without asking), `hints` (decided by the tool's read-only/destructive annotations), `rules` (decided by the user's rules), `model` (a model reviews each call).

## Each client

### Claude Code (`claude-code`)

Status: **untested**. surfaces: cli. version seen: 2.1.328.

- **MCP config:** `~/.claude.json`, project `.mcp.json`, plugins  
  doc: [code.claude.com/docs/en/mcp.md](https://code.claude.com/docs/en/mcp.md), 2.1.328
- **Approval form (elicitation):** `form+url`. The VS Code extension auto-declines (anthropics/claude-code#98256, open).  
  doc: [code.claude.com/docs/en/mcp.md](https://code.claude.com/docs/en/mcp.md), 2.1.328; doc: [code.claude.com/docs/en/hooks.md](https://code.claude.com/docs/en/hooks.md)
- **stdio environment:** `full`. Only a safe baseline with `CLAUDE_CODE_MCP_ALLOWLIST_ENV=1`.  
  doc: [code.claude.com/docs/en/env-vars.md](https://code.claude.com/docs/en/env-vars.md)
- **Tool-call timeout:** `≈28 h`. `MCP_TOOL_TIMEOUT`; idle timeout 30 min on stdio.  
  doc: [code.claude.com/docs/en/mcp.md](https://code.claude.com/docs/en/mcp.md)
- **Default tool approval:** `ask`. Every MCP tool asks until an allow rule `mcp__telegram__*` matches.  
  doc: [code.claude.com/docs/en/permissions.md](https://code.claude.com/docs/en/permissions.md)
- **Install:** depends on the configuration
  - stdio (`claude mcp add`): `config`. `claude mcp add telegram -- telegram mcp`.  
    doc: [code.claude.com/docs/en/mcp.md](https://code.claude.com/docs/en/mcp.md), 2.1.328
  - plugin: `plugin`. The marketplace plugin carries the skill only.  
    doc: [code.claude.com/docs/en/plugins-reference.md](https://code.claude.com/docs/en/plugins-reference.md)
- **Read:** `expected`. MCP servers run outside the Bash sandbox, with the user's Keychain.  
  doc: [code.claude.com/docs/en/sandboxing.md](https://code.claude.com/docs/en/sandboxing.md)
- **Write approval:** depends on the configuration
  - stdio (`claude mcp add`): `G1`. An `Elicitation` hook can answer the form instead of the human.  
    doc: [code.claude.com/docs/en/mcp.md](https://code.claude.com/docs/en/mcp.md), 2.1.328; doc: [code.claude.com/docs/en/hooks.md](https://code.claude.com/docs/en/hooks.md)
  - plugin: `G2`. The marketplace plugin is the skill only: the agent runs the CLI, which prints a one-time code.  
    doc: [code.claude.com/docs/en/plugins-reference.md](https://code.claude.com/docs/en/plugins-reference.md)
- **Refusal:** depends on the configuration
  - stdio (`claude mcp add`): `refused`  
    doc: [code.claude.com/docs/en/mcp.md](https://code.claude.com/docs/en/mcp.md), 2.1.328; doc: [code.claude.com/docs/en/hooks.md](https://code.claude.com/docs/en/hooks.md)
  - plugin: `chat`  
    doc: [code.claude.com/docs/en/plugins-reference.md](https://code.claude.com/docs/en/plugins-reference.md)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `n/a`
- **Headless or unattended:** depends on the configuration
  - `-p --permission-prompts none`, no hook answers: `refused`. The form is cancelled.  
    doc: [code.claude.com/docs/en/headless.md](https://code.claude.com/docs/en/headless.md); doc: [code.claude.com/docs/en/hooks.md](https://code.claude.com/docs/en/hooks.md)
  - plain `-p`: unknown. An unanswered form may wait until the tool timeout; unverified.
- **Sandbox:** `outside`  
  doc: [code.claude.com/docs/en/sandboxing.md](https://code.claude.com/docs/en/sandboxing.md)
- **HTTP (`telegram mcp --http`):** `bearer`. `--header "Authorization: Bearer …"` or `headersHelper`.  
  doc: [code.claude.com/docs/en/mcp.md](https://code.claude.com/docs/en/mcp.md)

### Claude Desktop (chat) (`claude-desktop`)

Status: **untested**. surfaces: desktop.

- **MCP config:** `claude_desktop_config.json` or a `.mcpb` extension  
  doc: [support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop); doc: [claude.com/docs/connectors/building/mcpb.md](https://claude.com/docs/connectors/building/mcpb.md)
- **Approval form (elicitation):** `none`. Feature request closed as not planned; no doc lists elicitation for chat.  
  report: [github.com/anthropics/claude-code/issues/41347](https://github.com/anthropics/claude-code/issues/41347)
- **stdio environment:** `allowlist`. A limited, platform-dependent subset plus `env`; cwd may be `/`.  
  doc: [modelcontextprotocol.io/docs/tools/debugging](https://modelcontextprotocol.io/docs/tools/debugging)
- **Tool-call timeout:** `240 s`  
  doc: [claude.com/docs/connectors/building/index.md](https://claude.com/docs/connectors/building/index.md)
- **Default tool approval:** `ask`. Allow once / Always allow per tool.  
  doc: [claude.com/docs/connectors/custom/remote-mcp.md](https://claude.com/docs/connectors/custom/remote-mcp.md)
- **Install:** `mcpb`. Each release ships `better-tg-cli.mcpb`; a `claude_desktop_config.json` entry works too.  
  doc: [claude.com/docs/connectors/building/mcpb.md](https://claude.com/docs/connectors/building/mcpb.md)
- **Read:** `expected`. A local extension runs with the user's rights, so the Keychain is reachable.  
  doc: [claude.com/docs/connectors/custom/remote-mcp.md](https://claude.com/docs/connectors/custom/remote-mcp.md)
- **Write approval:** `G2`  
  report: [github.com/anthropics/claude-code/issues/41347](https://github.com/anthropics/claude-code/issues/41347)
- **Refusal:** `chat`  
  report: [github.com/anthropics/claude-code/issues/41347](https://github.com/anthropics/claude-code/issues/41347)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown. Widely reported, not in the official docs: a Dock-launched app lacks the login-shell PATH, so register `telegram` by its absolute path.
- **Headless or unattended:** `n/a`
- **Sandbox:** `outside`  
  doc: [claude.com/docs/connectors/custom/remote-mcp.md](https://claude.com/docs/connectors/custom/remote-mcp.md)
- **HTTP (`telegram mcp --http`):** `oauth-only`. Remote servers are connectors, as on claude.ai; a static header exists only as an org-wide beta.  
  doc: [claude.com/docs/connectors/building/authentication.md](https://claude.com/docs/connectors/building/authentication.md)

### claude.ai (`claude-ai`)

Status: **untested**. surfaces: web.

- **MCP config:** `Customize › Connectors › Add custom connector (a public URL)`  
  doc: [claude.com/docs/connectors/custom/remote-mcp.md](https://claude.com/docs/connectors/custom/remote-mcp.md)
- **Approval form (elicitation):** `none`. Not in the list of supported features; the request is open.  
  doc: [claude.com/docs/connectors/building/index.md](https://claude.com/docs/connectors/building/index.md); report: [github.com/anthropics/claude-ai-mcp/issues/153](https://github.com/anthropics/claude-ai-mcp/issues/153)
- **stdio environment:** `n/a`
- **Tool-call timeout:** `240 s`  
  doc: [claude.com/docs/connectors/building/index.md](https://claude.com/docs/connectors/building/index.md)
- **Default tool approval:** `hints`. `readOnlyHint` runs without a prompt, `destructiveHint` always asks.  
  doc: [claude.com/docs/connectors/building/review-criteria.md](https://claude.com/docs/connectors/building/review-criteria.md)
- **Install:** `beta`. A public HTTPS `telegram mcp --http` URL works only in the `static_headers` beta (a limited set of organizations): an org Owner enters one `Authorization` header, sent for everyone in the org, so every member acts as the same Telegram account. Otherwise it needs OAuth, which the HTTP server does not offer yet (TheVilfer/better-tg-cli#17, #72).  
  doc: [claude.com/docs/connectors/building/authentication.md](https://claude.com/docs/connectors/building/authentication.md)
- **Read:** unknown
- **Write approval:** `G2`  
  doc: [claude.com/docs/connectors/building/index.md](https://claude.com/docs/connectors/building/index.md); report: [github.com/anthropics/claude-ai-mcp/issues/153](https://github.com/anthropics/claude-ai-mcp/issues/153)
- **Refusal:** `chat`  
  doc: [claude.com/docs/connectors/building/index.md](https://claude.com/docs/connectors/building/index.md); report: [github.com/anthropics/claude-ai-mcp/issues/153](https://github.com/anthropics/claude-ai-mcp/issues/153)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `n/a`
- **Headless or unattended:** `n/a`
- **Sandbox:** `cloud`. Calls come from Anthropic's cloud.  
  doc: [claude.com/docs/connectors/building/index.md](https://claude.com/docs/connectors/building/index.md)
- **HTTP (`telegram mcp --http`):** `oauth-only`. A static header exists only in the org-wide `static_headers` beta.  
  doc: [claude.com/docs/connectors/building/authentication.md](https://claude.com/docs/connectors/building/authentication.md)

### Cursor (`cursor`)

Status: **untested**. surfaces: ide, cli. version seen: CLI 2026.11.17.

- **MCP config:** `~/.cursor/mcp.json`, project `.cursor/mcp.json`, plugins  
  doc: [cursor.com/docs/mcp.md](https://cursor.com/docs/mcp.md)
- **Approval form (elicitation):** depends on the configuration. URL mode: unverified.
  - IDE: `form`. Gives up on the call after ~60 s while the form is open (forum). Our server keeps waiting for the form, so an approval that still arrives runs the write.  
    doc: [cursor.com/docs/mcp.md](https://cursor.com/docs/mcp.md); report: [forum.cursor.com/t/172829](https://forum.cursor.com/t/172829)
  - CLI: unknown. Not documented.
- **stdio environment:** unknown. Not documented.
- **Tool-call timeout:** `~60 s`. Observed, not documented.  
  report: [forum.cursor.com/t/172829](https://forum.cursor.com/t/172829); report: [forum.cursor.com/t/145618](https://forum.cursor.com/t/145618)
- **Default tool approval:** `ask`  
  doc: [cursor.com/docs/agent/security/run-modes.md](https://cursor.com/docs/agent/security/run-modes.md)
- **Install:** `plugin`. The Cursor Marketplace plugin runs the pinned `npx better-tg-cli@<version> mcp`.  
  doc: [cursor.com/docs/plugins.md](https://cursor.com/docs/plugins.md)
- **Read:** unknown. The stdio environment and sandbox are not documented.
- **Write approval:** depends on the configuration
  - IDE: `G1`  
    doc: [cursor.com/docs/mcp.md](https://cursor.com/docs/mcp.md); report: [forum.cursor.com/t/172829](https://forum.cursor.com/t/172829)
  - CLI: unknown. Depends on whether the client advertises elicitation.
- **Refusal:** depends on the configuration
  - IDE: `refused`  
    doc: [cursor.com/docs/mcp.md](https://cursor.com/docs/mcp.md); report: [forum.cursor.com/t/172829](https://forum.cursor.com/t/172829)
  - CLI: unknown
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown. The docs only say `command` must be on PATH or a full path: register `telegram` by its absolute path.
- **Headless or unattended:** depends on the configuration
  - `agent -p`, tool not allowed: `refused`. The call is rejected before it runs.  
    doc: [cursor.com/docs/cli/headless.md](https://cursor.com/docs/cli/headless.md)
  - `agent -p`, tool allowed: unknown. What the CLI does with the form is not documented.
- **Sandbox:** unknown. Per-server sandboxing is documented only under Enterprise admin controls.
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [cursor.com/docs/mcp.md](https://cursor.com/docs/mcp.md)

### VS Code Copilot (`vscode-copilot`)

Status: **untested**. surfaces: ide.

- **MCP config:** `~/.copilot/mcp-config.json`, workspace `.mcp.json`. Legacy `.vscode/mcp.json` (Local harness) is deprecated.  
  doc: [code.visualstudio.com/docs/agents/reference/mcp-configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- **Approval form (elicitation):** `form+url`. Cancelled in Autopilot, declined when there is no active turn.  
  doc: [code.visualstudio.com/api/extension-guides/ai/mcp](https://code.visualstudio.com/api/extension-guides/ai/mcp)
- **stdio environment:** unknown. Presumably as Copilot CLI; not documented for the editor.
- **Tool-call timeout:** unknown
- **Default tool approval:** `ask`. Autopilot and Allow all skip MCP confirmation.  
  doc: [code.visualstudio.com/docs/agents/run/approvals](https://code.visualstudio.com/docs/agents/run/approvals)
- **Install:** `config`  
  doc: [code.visualstudio.com/docs/agents/reference/mcp-configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- **Read:** unknown. The stdio environment is not documented for the editor.
- **Write approval:** `G1`  
  doc: [code.visualstudio.com/api/extension-guides/ai/mcp](https://code.visualstudio.com/api/extension-guides/ai/mcp)
- **Refusal:** `refused`  
  doc: [code.visualstudio.com/api/extension-guides/ai/mcp](https://code.visualstudio.com/api/extension-guides/ai/mcp)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown. Whether the Copilot harness gets the login-shell env is not documented: register `telegram` by its absolute path.
- **Headless or unattended:** `refused`. Autopilot cancels the approval form.  
  doc: [code.visualstudio.com/api/extension-guides/ai/mcp](https://code.visualstudio.com/api/extension-guides/ai/mcp)
- **Sandbox:** `opt-in`. `chat.agent.sandbox.mcpServers` puts MCP servers in the harness sandbox.  
  doc: [code.visualstudio.com/docs/agents/reference/mcp-configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [code.visualstudio.com/docs/agents/reference/mcp-configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)

### Copilot CLI (`github-copilot`)

Status: **untested**. surfaces: cli. version seen: 1.0.114.

- **MCP config:** `~/.copilot/mcp-config.json` (`tools` is required), `.mcp.json`  
  doc: [docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)
- **Approval form (elicitation):** depends on the configuration. URL mode: unverified.
  - interactive: `form`  
    doc: [github.com/github/copilot-cli/blob/main/changelog.md](https://github.com/github/copilot-cli/blob/main/changelog.md), 1.0.114
  - Autopilot: unknown. Autopilot answers the form itself; which answer it gives is not documented.
- **stdio environment:** `allowlist`. `PATH`, a small platform set and `env`.  
  doc: [docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)
- **Tool-call timeout:** `30 s`. Per-server `timeout`; an approval that takes longer may be cut off.  
  doc: [docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)
- **Default tool approval:** `ask`  
  doc: [docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools)
- **Install:** `config`. `copilot mcp add`, with `"tools": ["*"]`.  
  doc: [docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)
- **Read:** `expected`. Fails inside `/sandbox`, where the Keychain is closed by default.  
  doc: [docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference)
- **Write approval:** depends on the configuration
  - interactive: `G1`  
    doc: [github.com/github/copilot-cli/blob/main/changelog.md](https://github.com/github/copilot-cli/blob/main/changelog.md), 1.0.114
  - Autopilot: unknown. Depends on whether the client advertises elicitation.
- **Refusal:** depends on the configuration
  - interactive: `refused`  
    doc: [github.com/github/copilot-cli/blob/main/changelog.md](https://github.com/github/copilot-cli/blob/main/changelog.md), 1.0.114
  - Autopilot: unknown
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `n/a`
- **Headless or unattended:** unknown. `-p` shows no approval prompts; what it does with an elicitation is not documented.
- **Sandbox:** `opt-in`. `sandbox.enabled` (off by default) also wraps MCP servers; `keychainAccess` defaults to false.  
  doc: [docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference)
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)

### Codex (`codex`)

Status: **untested**. surfaces: cli, ide, desktop. version seen: rust-v0.170.0.

- **MCP config:** `~/.codex/config.toml` `[mcp_servers.<name>]`, plugins  
  doc: [learn.chatgpt.com/docs/extend/mcp.md](https://learn.chatgpt.com/docs/extend/mcp.md)
- **Approval form (elicitation):** `form+url`. `approval_policy = "never"` and a missing UI decline automatically.  
  src: [github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/elicitation.rs](https://github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/elicitation.rs), near rust-v0.170.0
- **stdio environment:** `allowlist`. `HOME`, `PATH`, `USER`, locale and a few more, plus `env_vars` and `env`.  
  src: [github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/utils.rs](https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/utils.rs), near rust-v0.170.0; doc: [learn.chatgpt.com/docs/config-file/config-reference.md](https://learn.chatgpt.com/docs/config-file/config-reference.md)
- **Tool-call timeout:** `60 s`. `tool_timeout_sec`; startup 10 s.  
  doc: [learn.chatgpt.com/docs/config-file/config-reference.md](https://learn.chatgpt.com/docs/config-file/config-reference.md)
- **Default tool approval:** `hints`. A destructive annotation always asks, unless the tool is also marked read-only, which wins; `approval_mode = "writes"` asks for tools not marked read-only.  
  doc: [learn.chatgpt.com/docs/agent-approvals-security.md](https://learn.chatgpt.com/docs/agent-approvals-security.md); doc: [learn.chatgpt.com/docs/extend/mcp.md](https://learn.chatgpt.com/docs/extend/mcp.md)
- **Install:** `plugin`. The repo marketplace plugin runs the pinned `npx better-tg-cli@<version> mcp`.  
  doc: [developers.openai.com/plugins/build/plugins.md](https://developers.openai.com/plugins/build/plugins.md)
- **Read:** `expected`. On Linux the Secret Service needs `DBUS_SESSION_BUS_ADDRESS` in `env_vars`.  
  src: [github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/utils.rs](https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/utils.rs), near rust-v0.170.0
- **Write approval:** `G1`. With `approvals_reviewer = auto_review` a reviewer subagent may answer the form instead of the human.  
  src: [github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/elicitation.rs](https://github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/elicitation.rs), near rust-v0.170.0
- **Refusal:** `refused`  
  src: [github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/elicitation.rs](https://github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/elicitation.rs), near rust-v0.170.0
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown. Whether the desktop app passes the login-shell PATH is not documented: register `telegram` by its absolute path.
- **Headless or unattended:** `refused`. `codex exec` runs with `approval_policy = "never"`, which declines the form.  
  doc: [learn.chatgpt.com/docs/non-interactive-mode.md](https://learn.chatgpt.com/docs/non-interactive-mode.md); src: [github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/elicitation.rs](https://github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/elicitation.rs), near rust-v0.170.0
- **Sandbox:** `outside`. The command sandbox covers model-run commands, not MCP servers.  
  doc: [learn.chatgpt.com/docs/permissions.md](https://learn.chatgpt.com/docs/permissions.md)
- **HTTP (`telegram mcp --http`):** `bearer`. `bearer_token_env_var`.  
  doc: [learn.chatgpt.com/docs/extend/mcp.md](https://learn.chatgpt.com/docs/extend/mcp.md)

### ChatGPT (`chatgpt`)

Status: **untested**. surfaces: web.

- **MCP config:** `chatgpt.com/plugins › Add custom MCP server (URL or tunnel)`  
  doc: [developers.openai.com/api/docs/guides/developer-mode.md](https://developers.openai.com/api/docs/guides/developer-mode.md)
- **Approval form (elicitation):** unknown. The docs do not say whether remote servers can ask.
- **stdio environment:** unknown. Through Secure MCP Tunnel, the environment `tunnel-client` gives a stdio command is not documented.
- **Tool-call timeout:** `120 s`. Through Secure MCP Tunnel, an absolute deadline that includes queue time (an approval wait would count too); other limits not documented.  
  doc: [developers.openai.com/api/docs/guides/secure-mcp-tunnels.md](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels.md)
- **Default tool approval:** `hints`. Writes ask; a tool without `readOnlyHint` counts as a write.  
  doc: [developers.openai.com/plugins/reference.md](https://developers.openai.com/plugins/reference.md)
- **Install:** `tunnel`. Secure MCP Tunnel: `tunnel-client` on the user's machine can forward to a local stdio command, here `telegram mcp`. A public URL needs OAuth or no auth, and `telegram mcp --http` has a static bearer only (TheVilfer/better-tg-cli#17, #72).  
  doc: [developers.openai.com/api/docs/guides/secure-mcp-tunnels.md](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels.md)
- **Read:** unknown
- **Write approval:** unknown. Depends on whether the client advertises elicitation.
- **Refusal:** unknown
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `n/a`
- **Headless or unattended:** `n/a`
- **Sandbox:** depends on the configuration
  - URL: `cloud`  
    doc: [developers.openai.com/plugins/deploy/connect-chatgpt.md](https://developers.openai.com/plugins/deploy/connect-chatgpt.md)
  - Secure MCP Tunnel: `outside`. Our server runs on the user's machine under `tunnel-client`.  
    doc: [developers.openai.com/api/docs/guides/secure-mcp-tunnels.md](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels.md)
- **HTTP (`telegram mcp --http`):** `oauth-only`  
  doc: [developers.openai.com/plugins/build/auth.md](https://developers.openai.com/plugins/build/auth.md)

### Gemini CLI (`gemini-cli`)

Status: **untested**. surfaces: cli. version seen: v0.69.0.

- **MCP config:** `~/.gemini/settings.json` `mcpServers`, extensions  
  doc: [github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/tools/mcp-server.md](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/tools/mcp-server.md), v0.69.0
- **Approval form (elicitation):** `none`. Only `roots` is advertised; the request was closed as not planned.  
  src: [github.com/google-gemini/gemini-cli/blob/v0.69.0/packages/core/src/tools/mcp-client.ts](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/packages/core/src/tools/mcp-client.ts), v0.69.0; report: [github.com/google-gemini/gemini-cli/issues/28074](https://github.com/google-gemini/gemini-cli/issues/28074)
- **stdio environment:** `filtered`. Drops every variable whose name contains TOKEN, KEY, SECRET, AUTH and similar.  
  src: [github.com/google-gemini/gemini-cli/blob/main/packages/core/src/services/environmentSanitization.ts](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/services/environmentSanitization.ts)
- **Tool-call timeout:** `10 min`  
  doc: [github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/tools/mcp-server.md](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/tools/mcp-server.md), v0.69.0
- **Default tool approval:** `ask`  
  doc: [github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/reference/policy-engine.md](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/reference/policy-engine.md), v0.69.0
- **Install:** `extension`. `gemini extensions install https://github.com/TheVilfer/better-tg-cli` (root `gemini-extension.json`).  
  doc: [github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/extensions/reference.md](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/extensions/reference.md), v0.69.0
- **Read:** `expected`. A stdio server starts only in a trusted folder.  
  src: [github.com/google-gemini/gemini-cli/blob/v0.69.0/packages/core/src/tools/mcp-client.ts](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/packages/core/src/tools/mcp-client.ts), v0.69.0
- **Write approval:** `G2`  
  src: [github.com/google-gemini/gemini-cli/blob/v0.69.0/packages/core/src/tools/mcp-client.ts](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/packages/core/src/tools/mcp-client.ts), v0.69.0; report: [github.com/google-gemini/gemini-cli/issues/28074](https://github.com/google-gemini/gemini-cli/issues/28074)
- **Refusal:** `chat`  
  src: [github.com/google-gemini/gemini-cli/blob/v0.69.0/packages/core/src/tools/mcp-client.ts](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/packages/core/src/tools/mcp-client.ts), v0.69.0; report: [github.com/google-gemini/gemini-cli/issues/28074](https://github.com/google-gemini/gemini-cli/issues/28074)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `n/a`
- **Headless or unattended:** depends on the configuration
  - policy chose `ask_user`: `refused`. `ask_user` counts as `deny` in non-interactive runs.  
    doc: [github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/reference/policy-engine.md](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/reference/policy-engine.md), v0.69.0
  - tool allowed (`trust`, an allow rule): unknown. The one-time code goes to the model with nobody to ask; what happens then is unverified.
- **Sandbox:** `opt-in`. `--sandbox` re-launches the whole CLI, MCP servers included; a container has no host Keychain.  
  doc: [github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/cli/sandbox.md](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/cli/sandbox.md), v0.69.0
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/tools/mcp-server.md](https://github.com/google-gemini/gemini-cli/blob/v0.69.0/docs/tools/mcp-server.md), v0.69.0

### Windsurf (Devin Desktop) (`windsurf`)

Status: **untested**. surfaces: ide. version seen: v3.14.30825.

- **MCP config:** `~/.config/devin/mcp_config.json` (legacy `~/.codeium/windsurf/mcp_config.json`)  
  doc: [docs.devin.ai/desktop/plugins/cascade/mcp.md](https://docs.devin.ai/desktop/plugins/cascade/mcp.md)
- **Approval form (elicitation):** unknown. Documented for ACP agents only, not for MCP servers.
- **stdio environment:** unknown
- **Tool-call timeout:** unknown
- **Default tool approval:** `ask`  
  doc: [docs.devin.ai/desktop/devin-local/permissions.md](https://docs.devin.ai/desktop/devin-local/permissions.md)
- **Install:** `config`  
  doc: [docs.devin.ai/desktop/plugins/cascade/mcp.md](https://docs.devin.ai/desktop/plugins/cascade/mcp.md)
- **Read:** unknown
- **Write approval:** unknown. Depends on whether the client advertises elicitation.
- **Refusal:** unknown
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown. Register `telegram` by its absolute path.
- **Headless or unattended:** unknown
- **Sandbox:** unknown
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [docs.devin.ai/desktop/plugins/cascade/mcp.md](https://docs.devin.ai/desktop/plugins/cascade/mcp.md)

### Cline (`cline`)

Status: **untested**. surfaces: ide, cli. version seen: v4.1.26.

- **MCP config:** `cline_mcp_settings.json`  
  doc: [docs.cline.bot/mcp/mcp-overview.md](https://docs.cline.bot/mcp/mcp-overview.md)
- **Approval form (elicitation):** `none`. Capabilities are empty.  
  src: [github.com/cline/cline/blob/main/apps/vscode/src/services/mcp/McpHub.ts](https://github.com/cline/cline/blob/main/apps/vscode/src/services/mcp/McpHub.ts)
- **stdio environment:** depends on the configuration
  - VS Code: unknown. Two code paths: the MCP SDK default set (`McpHub.ts`) or the full environment (the SDK client); which one the shipped extension uses is unverified.
  - CLI: `full`  
    src: [github.com/cline/cline/blob/main/sdk/packages/core/src/extensions/mcp/client.ts](https://github.com/cline/cline/blob/main/sdk/packages/core/src/extensions/mcp/client.ts)
- **Tool-call timeout:** `60 s`  
  src: [github.com/cline/cline/blob/main/sdk/packages/shared/src/mcp.ts](https://github.com/cline/cline/blob/main/sdk/packages/shared/src/mcp.ts)
- **Default tool approval:** `ask`  
  doc: [docs.cline.bot/features/auto-approve.md](https://docs.cline.bot/features/auto-approve.md)
- **Install:** `config`. An HTTP entry without `type` is read as legacy SSE.  
  doc: [docs.cline.bot/mcp/mcp-overview.md](https://docs.cline.bot/mcp/mcp-overview.md)
- **Read:** depends on the configuration
  - VS Code: unknown. Depends on the stdio environment. If it is the SDK default set, the Linux Secret Service needs `DBUS_SESSION_BUS_ADDRESS` in `env`.
  - CLI: `expected`  
    src: [github.com/cline/cline/blob/main/sdk/packages/core/src/extensions/mcp/client.ts](https://github.com/cline/cline/blob/main/sdk/packages/core/src/extensions/mcp/client.ts)
- **Write approval:** `G2`  
  src: [github.com/cline/cline/blob/main/apps/vscode/src/services/mcp/McpHub.ts](https://github.com/cline/cline/blob/main/apps/vscode/src/services/mcp/McpHub.ts)
- **Refusal:** `chat`  
  src: [github.com/cline/cline/blob/main/apps/vscode/src/services/mcp/McpHub.ts](https://github.com/cline/cline/blob/main/apps/vscode/src/services/mcp/McpHub.ts)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown
- **Headless or unattended:** unknown
- **Sandbox:** unknown
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [docs.cline.bot/mcp/mcp-overview.md](https://docs.cline.bot/mcp/mcp-overview.md)

### Zed (`zed`)

Status: **untested**. surfaces: ide. version seen: v1.29.2.

- **MCP config:** `settings.json` `context_servers`  
  doc: [zed.dev/docs/ai/mcp.md](https://zed.dev/docs/ai/mcp.md)
- **Approval form (elicitation):** `none`. Tools and prompts only.  
  doc: [zed.dev/docs/ai/mcp.md](https://zed.dev/docs/ai/mcp.md)
- **stdio environment:** `full`. Zed's own environment plus `env`, started through the system shell.  
  src: [github.com/zed-industries/zed/blob/main/crates/context_server/src/transport/stdio_transport.rs](https://github.com/zed-industries/zed/blob/main/crates/context_server/src/transport/stdio_transport.rs)
- **Tool-call timeout:** `60 s`. On timeout Zed does not send `notifications/cancelled`.  
  src: [github.com/zed-industries/zed/blob/main/crates/context_server/src/client.rs](https://github.com/zed-industries/zed/blob/main/crates/context_server/src/client.rs)
- **Default tool approval:** unknown. `agent.tool_permissions.default` decides; its default is not documented.
- **Install:** `config`  
  doc: [zed.dev/docs/ai/mcp.md](https://zed.dev/docs/ai/mcp.md)
- **Read:** `expected`  
  src: [github.com/zed-industries/zed/blob/main/crates/context_server/src/transport/stdio_transport.rs](https://github.com/zed-industries/zed/blob/main/crates/context_server/src/transport/stdio_transport.rs)
- **Write approval:** `G2`  
  doc: [zed.dev/docs/ai/mcp.md](https://zed.dev/docs/ai/mcp.md)
- **Refusal:** `chat`  
  doc: [zed.dev/docs/ai/mcp.md](https://zed.dev/docs/ai/mcp.md)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown
- **Headless or unattended:** `n/a`
- **Sandbox:** `outside`  
  doc: [zed.dev/docs/ai/sandboxing.md](https://zed.dev/docs/ai/sandboxing.md)
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [zed.dev/docs/ai/mcp.md](https://zed.dev/docs/ai/mcp.md)

### Grok Build (`grok`)

Status: **untested**. surfaces: cli. version seen: 1.0.45.

- **MCP config:** `~/.grok/config.toml` `[mcp_servers.<name>]`; also reads `~/.claude.json` and `.mcp.json`  
  doc: [docs.x.ai/build/features/mcp-servers.md](https://docs.x.ai/build/features/mcp-servers.md), 1.0.45
- **Approval form (elicitation):** depends on the configuration. With no UI attached Grok declines the form.
  - TUI: `form+url`  
    src: [github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs), 1.0.45
  - `grok -p`: unknown. The headless frontend answers every form with `cancel`, but whether `!is_acp()` holds there, so that the form is advertised at all, is unverified.
  - ACP (`grok agent stdio`): unknown. The capability is advertised only when `!is_acp()`, yet an ACP handler for the form exists; whether our server gets the form there is unverified.
- **stdio environment:** `full`  
  src: [github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs), 1.0.45
- **Tool-call timeout:** `6000 s`. Output over 20,000 bytes spills to a file.  
  doc: [docs.x.ai/build/features/mcp-servers.md](https://docs.x.ai/build/features/mcp-servers.md), 1.0.45
- **Default tool approval:** `ask`  
  doc: [docs.x.ai/build/features/permissions.md](https://docs.x.ai/build/features/permissions.md), 1.0.45
- **Install:** `plugin`. `.grok-plugin/marketplace.json`: the skill plus the MCP server through `npx better-tg-cli@latest mcp`.  
  doc: [docs.x.ai/build/features/skills-plugins-marketplaces.md](https://docs.x.ai/build/features/skills-plugins-marketplaces.md), 1.0.45
- **Read:** `expected`  
  src: [github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs), 1.0.45
- **Write approval:** depends on the configuration
  - TUI: `G1`  
    src: [github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs), 1.0.45
  - `grok -p`: unknown. Depends on whether the client advertises elicitation.
  - ACP (`grok agent stdio`): unknown. Depends on whether the client advertises elicitation.
- **Refusal:** depends on the configuration
  - TUI: `refused`  
    src: [github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs), 1.0.45
  - `grok -p`: unknown
  - ACP (`grok agent stdio`): unknown
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `path`. Started from a GUI, an IDE or ACP, `/opt/homebrew/bin` can be missing: register `telegram` by its absolute path.  
  src: [github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-mcp/src/servers.rs), 1.0.45
- **Headless or unattended:** unknown. `grok -p` answers every form with `cancel` (`xai-grok-pager/src/headless/ext_protocol.rs`, 1.0.45); whether it advertises the form, so that the write is refused rather than handed a one-time code, is unverified.
- **Sandbox:** `opt-in`. `--sandbox` wraps the whole process; `workspace` blocks writes to `~/.config/tg`.  
  doc: [docs.x.ai/build/features/sandbox.md](https://docs.x.ai/build/features/sandbox.md), 1.0.45
- **HTTP (`telegram mcp --http`):** `bearer`. `headers`; `bearer_token_file` (1.0.45) is in the repo user guide, not on the docs site.  
  doc: [docs.x.ai/build/features/mcp-servers.md](https://docs.x.ai/build/features/mcp-servers.md), 1.0.45; doc: [github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/07-mcp-servers.md](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/07-mcp-servers.md), 1.0.45

### Grok Bot (`grok-bot`)

Status: **untested**. surfaces: cloud.

- **MCP config:** `Connect apps › Add a custom connector (Remote HTTPS or Command)`  
  doc: [docs.x.ai/grok-bot/computer-and-apps.md](https://docs.x.ai/grok-bot/computer-and-apps.md)
- **Approval form (elicitation):** unknown. Not mentioned in the docs.
- **stdio environment:** unknown. Command connectors run on the cloud computer; their environment is not documented.
- **Tool-call timeout:** unknown
- **Default tool approval:** `model`. Auto Review, a model-based check, is on by default.  
  doc: [docs.x.ai/grok-bot/approvals-security-and-privacy.md](https://docs.x.ai/grok-bot/approvals-security-and-privacy.md)
- **Install:** depends on the configuration
  - Remote HTTPS: `ui`. A public `telegram mcp --http` URL with an `Authorization` header; a server on the user's own machine is not reachable directly.  
    doc: [docs.x.ai/grok-bot/computer-and-apps.md](https://docs.x.ai/grok-bot/computer-and-apps.md); report: [forum.cursor.com/t/does-grok-bot-support-local-mcp-e-g-workflowy/168182](https://forum.cursor.com/t/does-grok-bot-support-local-mcp-e-g-workflowy/168182)
  - cloud Command: unknown. Would run `telegram` on the Bot's cloud computer; its environment, a lasting session store and forms are not documented.
- **Read:** unknown
- **Write approval:** depends on the configuration
  - Remote HTTPS: `G2`. The HTTP server never shows the form.  
    doc: [docs.x.ai/grok-bot/computer-and-apps.md](https://docs.x.ai/grok-bot/computer-and-apps.md)
  - cloud Command: unknown
- **Refusal:** depends on the configuration
  - Remote HTTPS: `chat`  
    doc: [docs.x.ai/grok-bot/computer-and-apps.md](https://docs.x.ai/grok-bot/computer-and-apps.md)
  - cloud Command: unknown
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `n/a`
- **Headless or unattended:** `n/a`
- **Sandbox:** `cloud`. Remote connectors are dialled from the vendor's servers.  
  doc: [docs.x.ai/grok-bot/security.md](https://docs.x.ai/grok-bot/security.md)
- **HTTP (`telegram mcp --http`):** `bearer`. Needs a public HTTPS URL.  
  doc: [docs.x.ai/grok-bot/computer-and-apps.md](https://docs.x.ai/grok-bot/computer-and-apps.md)

### Hermes Agent (`hermes`)

Status: **untested**. surfaces: cli, desktop. version seen: v0.23.2.

- **MCP config:** `~/.hermes/config.yaml` `mcp_servers`, plugins  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/mcp](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
- **Approval form (elicitation):** `form+url`. URL mode is advertised but declined. Before v0.23.2 an Allow answers with empty content, which counts as approval.  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/mcp](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp); src: [github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec/tools/mcp_tool_sampling.py](https://github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec/tools/mcp_tool_sampling.py), v0.23.2
- **stdio environment:** `allowlist`. `PATH`, `HOME`, locale, `XDG_*` and a few more, plus `env`; `DBUS_SESSION_BUS_ADDRESS` must be forwarded.  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/security](https://hermes-agent.nousresearch.com/docs/user-guide/security); src: [github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec/tools/mcp_tool_config.py](https://github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec/tools/mcp_tool_config.py), v0.23.2
- **Tool-call timeout:** `300 s`. The approval form has its own 300 s; the tool deadline probably fires first (inferred from source).  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/mcp](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
- **Default tool approval:** `allow`. `trust: full` is the default; `untrusted` asks for tools without `readOnlyHint`.  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/mcp](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
- **Install:** `catalog`. The plugin catalog entry installs `agent-plugin/`, which forwards `DBUS_SESSION_BUS_ADDRESS` and `XDG_RUNTIME_DIR`.  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/plugin-catalog](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugin-catalog)
- **Read:** `expected`  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- **Write approval:** `G1`  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/mcp](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp); src: [github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec/tools/mcp_tool_sampling.py](https://github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec/tools/mcp_tool_sampling.py), v0.23.2
- **Refusal:** `refused`  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/mcp](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp); src: [github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec/tools/mcp_tool_sampling.py](https://github.com/NousResearch/hermes-agent/blob/c152cfceecd5e27682ce1957ca13305dad15d0ec/tools/mcp_tool_sampling.py), v0.23.2
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown
- **Headless or unattended:** `refused`. Cron, `hermes chat -q` and unattended runs decline.  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/mcp](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
- **Sandbox:** unknown
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [hermes-agent.nousresearch.com/docs/user-guide/features/mcp](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)

### OpenCode (`opencode`)

Status: **untested**. surfaces: cli, desktop. version seen: v2.3.2 (V2), v1.19.6 (V1).

- **MCP config:** `opencode.json` `mcp.servers` (V2), `command` as an array  
  doc: [opencode.ai/docs/mcp-servers/](https://opencode.ai/docs/mcp-servers/)
- **Approval form (elicitation):** depends on the configuration
  - V2: `form+url`  
    src: [github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/client.ts](https://github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/client.ts), v2.3.x
  - V1: `none`. The capability is commented out.  
    src: [github.com/anomalyco/opencode/blob/v1.19.6/packages/opencode/src/mcp/index.ts](https://github.com/anomalyco/opencode/blob/v1.19.6/packages/opencode/src/mcp/index.ts), v1.19.6
- **stdio environment:** `full`. In V2 the environment of the shared background service.  
  doc: [opencode.ai/docs/mcp-servers/](https://opencode.ai/docs/mcp-servers/); src: [github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/stdio.ts](https://github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/stdio.ts), v2.3.x
- **Tool-call timeout:** `12 h`. V2 `execution`; startup 30 s, but `opencode run` waits 2 s (anomalyco/opencode#63310).  
  doc: [opencode.ai/docs/mcp-servers/](https://opencode.ai/docs/mcp-servers/)
- **Default tool approval:** `allow`. The base policy allows every action.  
  doc: [opencode.ai/docs/permissions/](https://opencode.ai/docs/permissions/)
- **Install:** `config`. Prefer the installed binary: a cold `npx` misses the 2 s startup of `opencode run`.  
  doc: [opencode.ai/docs/mcp-servers/](https://opencode.ai/docs/mcp-servers/); report: [github.com/anomalyco/opencode/issues/63310](https://github.com/anomalyco/opencode/issues/63310)
- **Read:** `expected`  
  src: [github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/stdio.ts](https://github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/stdio.ts), v2.3.x
- **Write approval:** depends on the configuration
  - V2: `G1`  
    src: [github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/client.ts](https://github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/client.ts), v2.3.x
  - V1: `G2`  
    src: [github.com/anomalyco/opencode/blob/v1.19.6/packages/opencode/src/mcp/index.ts](https://github.com/anomalyco/opencode/blob/v1.19.6/packages/opencode/src/mcp/index.ts), v1.19.6
- **Refusal:** depends on the configuration
  - V2: `refused`  
    src: [github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/client.ts](https://github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/core/src/mcp/client.ts), v2.3.x
  - V1: `chat`  
    src: [github.com/anomalyco/opencode/blob/v1.19.6/packages/opencode/src/mcp/index.ts](https://github.com/anomalyco/opencode/blob/v1.19.6/packages/opencode/src/mcp/index.ts), v1.19.6
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `path`. "command not found" in Desktop without PATH: register `telegram` by its absolute path.  
  report: [github.com/anomalyco/opencode/issues/16854](https://github.com/anomalyco/opencode/issues/16854)
- **Headless or unattended:** depends on the configuration
  - V2 `opencode run`: `refused`. Every form is cancelled, `--auto` included.  
    src: [github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/cli/src/run/noninteractive.ts](https://github.com/anomalyco/opencode/blob/88c90d08add7dd899a0caefc15609fdbb1d4b2ed/packages/cli/src/run/noninteractive.ts), v2.3.x
  - V1: unknown
- **Sandbox:** unknown
- **HTTP (`telegram mcp --http`):** `bearer`. `"oauth": false` and an `Authorization` header.  
  doc: [opencode.ai/docs/mcp-servers/](https://opencode.ai/docs/mcp-servers/)

### Goose (`goose`)

Status: **untested**. surfaces: cli, desktop. version seen: v1.60.1.

- **MCP config:** `~/.config/goose/config.yaml` `extensions`  
  doc: [goose-docs.ai/docs/guides/config-files.md](https://goose-docs.ai/docs/guides/config-files.md)
- **Approval form (elicitation):** `form`. Some builds advertise a bare `elicitation: {}` (aaif-goose/goose#13300), which we read as form.  
  doc: [goose-docs.ai/docs/guides/mcp-elicitation.md](https://goose-docs.ai/docs/guides/mcp-elicitation.md); src: [github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/client.rs](https://github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/client.rs)
- **stdio environment:** `full`. PATH is rewritten with its own search paths, `/opt/homebrew/bin` included.  
  src: [github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/stdio.rs](https://github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/stdio.rs); src: [github.com/aaif-goose/goose/blob/e196781/crates/goose/src/config/search_path.rs](https://github.com/aaif-goose/goose/blob/e196781/crates/goose/src/config/search_path.rs)
- **Tool-call timeout:** `300 s`. Per extension `timeout`.  
  doc: [goose-docs.ai/docs/guides/config-files.md](https://goose-docs.ai/docs/guides/config-files.md)
- **Default tool approval:** `allow`. `GOOSE_MODE=auto` (fully autonomous) is the default.  
  doc: [goose-docs.ai/docs/guides/managing-tools/goose-permissions.md](https://goose-docs.ai/docs/guides/managing-tools/goose-permissions.md)
- **Install:** `config`  
  doc: [goose-docs.ai/docs/guides/config-files.md](https://goose-docs.ai/docs/guides/config-files.md)
- **Read:** `expected`  
  src: [github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/stdio.rs](https://github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/stdio.rs)
- **Write approval:** `G1`  
  doc: [goose-docs.ai/docs/guides/mcp-elicitation.md](https://goose-docs.ai/docs/guides/mcp-elicitation.md); src: [github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/client.rs](https://github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/client.rs)
- **Refusal:** `refused`  
  doc: [goose-docs.ai/docs/guides/mcp-elicitation.md](https://goose-docs.ai/docs/guides/mcp-elicitation.md); src: [github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/client.rs](https://github.com/aaif-goose/goose/blob/e196781/crates/oi-kit-agent/src/mcp/client.rs)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** depends on the configuration
  - Desktop on macOS, Linux: `ok`. Only PATH comes from the login shell; other exported variables (`TG_PROFILE`) are missing.  
    src: [github.com/aaif-goose/goose/blob/e196781/ui/desktop/src/loginShellPath.ts](https://github.com/aaif-goose/goose/blob/e196781/ui/desktop/src/loginShellPath.ts)
  - Desktop on Windows, Flatpak: unknown. The login-shell PATH lookup is skipped.
- **Headless or unattended:** `aborts`. `goose run` aborts the whole run when a write asks for approval.  
  src: [github.com/aaif-goose/goose/blob/e196781/crates/goose-cli/src/session/mod.rs](https://github.com/aaif-goose/goose/blob/e196781/crates/goose-cli/src/session/mod.rs)
- **Sandbox:** unknown
- **HTTP (`telegram mcp --http`):** `bearer`. Streamable HTTP only, no SSE.  
  doc: [goose-docs.ai/docs/getting-started/using-extensions.md](https://goose-docs.ai/docs/getting-started/using-extensions.md)

### Factory Droid (`droid`)

Status: **untested**. surfaces: cli, desktop. version seen: CLI v1.15.0.

- **MCP config:** `~/.factory/mcp.json`, project `.factory/mcp.json`  
  doc: [docs.factory.com/harness/mcp.md](https://docs.factory.com/harness/mcp.md)
- **Approval form (elicitation):** unknown. A changelog entry mentions resuming elicitations; the mode and the answers are not documented.
- **stdio environment:** unknown. With the sandbox on, servers get a minimal allowlist; without it, not documented.
- **Tool-call timeout:** unknown. Connect timeout 30 s for stdio; the tool-call default is not documented.
- **Default tool approval:** `rules`. Each tool's risk level is compared with the autonomy level.  
  doc: [docs.factory.com/autonomy-and-safety/auto-run.md](https://docs.factory.com/autonomy-and-safety/auto-run.md)
- **Install:** `config`  
  doc: [docs.factory.com/harness/mcp.md](https://docs.factory.com/harness/mcp.md)
- **Read:** unknown
- **Write approval:** unknown. Depends on whether the client advertises elicitation.
- **Refusal:** unknown
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown
- **Headless or unattended:** unknown. `droid exec` cannot collect an interactive approval; what a write does there is not documented.
- **Sandbox:** `opt-in`. The sandbox strips the environment and checks file and network access.  
  doc: [docs.factory.com/autonomy-and-safety/sandbox.md](https://docs.factory.com/autonomy-and-safety/sandbox.md)
- **HTTP (`telegram mcp --http`):** `bearer`  
  doc: [docs.factory.com/harness/mcp.md](https://docs.factory.com/harness/mcp.md)

### Amp (`amp`)

Status: **untested**. surfaces: cli, desktop.

- **MCP config:** `amp.mcpServers` in `~/.config/amp/settings.json`  
  doc: [ampcode.com/docs/markdown/customize/mcp](https://ampcode.com/docs/markdown/customize/mcp)
- **Approval form (elicitation):** unknown. Documented (form and URL) only for remote definitions stored on ampcode.com, not for local servers.
- **stdio environment:** unknown
- **Tool-call timeout:** unknown
- **Default tool approval:** `allow`. "By default, Amp does not ask for approval before running tools."  
  doc: [ampcode.com/docs/tools](https://ampcode.com/docs/tools)
- **Install:** `config`  
  doc: [ampcode.com/docs/markdown/customize/mcp](https://ampcode.com/docs/markdown/customize/mcp)
- **Read:** unknown
- **Write approval:** unknown. Depends on whether the client advertises elicitation.
- **Refusal:** unknown
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown
- **Headless or unattended:** unknown
- **Sandbox:** unknown
- **HTTP (`telegram mcp --http`):** `bearer`. A local URL entry; remote definitions are dialled from Amp's servers.  
  doc: [ampcode.com/docs/markdown/customize/mcp](https://ampcode.com/docs/markdown/customize/mcp)

### Warp (`warp`)

Status: **untested**. surfaces: desktop, cli.

- **MCP config:** depends on the configuration
  - Desktop: Settings › Agents › MCP servers, `~/.warp/.mcp.json`  
    doc: [docs.warp.dev/agents/capabilities/mcp/](https://docs.warp.dev/agents/capabilities/mcp/)
  - CLI (macOS): `~/.warp_cli/.mcp.json` (global only)  
    doc: [docs.warp.dev/agents/cli/configuration/](https://docs.warp.dev/agents/cli/configuration/)
- **Approval form (elicitation):** `none`. No client capabilities are advertised.  
  src: [github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs](https://github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs)
- **stdio environment:** `full`  
  src: [github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs](https://github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs)
- **Tool-call timeout:** unknown
- **Default tool approval:** `rules`. Per server, not per tool; the default is "Agent decides".  
  doc: [docs.warp.dev/agents/capabilities/agent-profiles-permissions/](https://docs.warp.dev/agents/capabilities/agent-profiles-permissions/)
- **Install:** `config`  
  doc: [docs.warp.dev/agents/capabilities/mcp/](https://docs.warp.dev/agents/capabilities/mcp/)
- **Read:** `expected`  
  src: [github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs](https://github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs)
- **Write approval:** `G2`  
  src: [github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs](https://github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs)
- **Refusal:** `chat`  
  src: [github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs](https://github.com/warpdotdev/Warp/blob/master/crates/mcp/src/runtime.rs)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** `ok`. PATH comes from a bootstrapped terminal session.  
  src: [github.com/warpdotdev/Warp/blob/master/app/src/ai/mcp/templatable_manager/native.rs](https://github.com/warpdotdev/Warp/blob/master/app/src/ai/mcp/templatable_manager/native.rs)
- **Headless or unattended:** unknown
- **Sandbox:** unknown
- **HTTP (`telegram mcp --http`):** `bearer`. Open issue: the `Authorization` header is not sent to a localhost server.  
  doc: [docs.warp.dev/agents/capabilities/mcp/](https://docs.warp.dev/agents/capabilities/mcp/); report: [github.com/warpdotdev/Warp/issues/8356](https://github.com/warpdotdev/Warp/issues/8356)

### Kiro (`kiro`)

Status: **untested**. surfaces: ide, cli.

- **MCP config:** `~/.kiro/settings/mcp.json`, workspace `.kiro/settings/mcp.json`  
  doc: [kiro.dev/docs/mcp/configuration.md](https://kiro.dev/docs/mcp/configuration.md)
- **Approval form (elicitation):** `form+url`. A server loaded through a Power gets every form cancelled (kirodotdev/Kiro#11385); the CLI only in local V3 sessions from 2.34.  
  doc: [kiro.dev/docs/mcp/usage.md](https://kiro.dev/docs/mcp/usage.md); report: [github.com/kirodotdev/Kiro/issues/11385](https://github.com/kirodotdev/Kiro/issues/11385)
- **stdio environment:** depends on the configuration
  - CLI 2.41+: `full`  
    report: [github.com/kirodotdev/Kiro/issues/10118](https://github.com/kirodotdev/Kiro/issues/10118)
  - IDE: unknown. Not documented.
- **Tool-call timeout:** unknown. Initialization must finish in 5 s (`mcp.initTimeout`); the tool-call default is not documented.
- **Default tool approval:** `ask`. Untrusted workspaces ask before every call.  
  doc: [kiro.dev/docs/mcp/usage.md](https://kiro.dev/docs/mcp/usage.md)
- **Install:** `config`. A plain `mcp.json` entry, not a Power; a cold `npx` can miss the 5 s start.  
  doc: [kiro.dev/docs/mcp/configuration.md](https://kiro.dev/docs/mcp/configuration.md); doc: [kiro.dev/docs/reference/settings.md](https://kiro.dev/docs/reference/settings.md)
- **Read:** depends on the configuration
  - CLI 2.41+: `expected`  
    report: [github.com/kirodotdev/Kiro/issues/10118](https://github.com/kirodotdev/Kiro/issues/10118)
  - IDE: unknown. Depends on the stdio environment.
- **Write approval:** `G1`  
  doc: [kiro.dev/docs/mcp/usage.md](https://kiro.dev/docs/mcp/usage.md); report: [github.com/kirodotdev/Kiro/issues/11385](https://github.com/kirodotdev/Kiro/issues/11385)
- **Refusal:** `refused`  
  doc: [kiro.dev/docs/mcp/usage.md](https://kiro.dev/docs/mcp/usage.md); report: [github.com/kirodotdev/Kiro/issues/11385](https://github.com/kirodotdev/Kiro/issues/11385)
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown. Register `telegram` by its absolute path.
- **Headless or unattended:** unknown
- **Sandbox:** `opt-in`. `mcpSandboxing` limits file and network access of stdio servers.  
  doc: [kiro.dev/docs/mcp/security.md](https://kiro.dev/docs/mcp/security.md)
- **HTTP (`telegram mcp --http`):** `bearer`. HTTPS, or plain HTTP on localhost.  
  doc: [kiro.dev/docs/mcp/configuration.md](https://kiro.dev/docs/mcp/configuration.md)

### Aside (`aside`)

Status: **untested**. surfaces: desktop. version seen: app 1.0.1116.2.

- **MCP config:** `Settings › MCP`  
  doc: [docs.aside.com/changelog/components.md](https://docs.aside.com/changelog/components.md)
- **Approval form (elicitation):** `none`. No elicitation capability or handler in the client.  
  src: Aside.app daemon (binary), 1.0.1116.2
- **stdio environment:** unknown. The daemon (binary 1.0.1116.2) passes its own environment plus `env`, or only `env` when `inheritEnv` is false; which one a user's server gets is unverified.
- **Tool-call timeout:** `60 s`. Sends `notifications/cancelled` on timeout.  
  src: Aside.app daemon (binary), 1.0.1116.2
- **Default tool approval:** `rules`. Allow / Ask / Deny rules per tool.  
  doc: [docs.aside.com/help/security.md](https://docs.aside.com/help/security.md)
- **Install:** `ui`  
  doc: [docs.aside.com/changelog/components.md](https://docs.aside.com/changelog/components.md)
- **Read:** unknown. Depends on the stdio environment.
- **Write approval:** `G2`  
  src: Aside.app daemon (binary), 1.0.1116.2
- **Refusal:** `chat`  
  src: Aside.app daemon (binary), 1.0.1116.2
- **Update notice:** unknown, see the note under the table.
- **GUI launch:** unknown. Whether the daemon gets the login-shell PATH is unknown: register `telegram` by its absolute path.
- **Headless or unattended:** `n/a`
- **Sandbox:** unknown. Aside has a sandbox toggle; whether it wraps MCP servers is not documented.
- **HTTP (`telegram mcp --http`):** `bearer`. Streamable HTTP with static headers or OAuth; no SSE.  
  src: Aside AgentManager bundle (settings schema), 1.0.1116.2
