import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  NEVER_COMMANDS,
  classifyCall,
  isWriteCommand,
  setKnownCommands,
} from "../src/mcp.js";
import { SKILL_FILES } from "../src/skill-files.js";
import {
  agentStatus,
  installSkill,
  knownAgents,
  selectAgents,
  SKILL_NAME,
  uninstallSkill,
} from "../src/skill-install.js";

// Every test works in a throwaway HOME; the real agent folders are never touched
const fakeHome = () => mkdtempSync(join(tmpdir(), "tg-skill-"));
const agent = (home: string, id: string) =>
  knownAgents(home, {}).find((a) => a.id === id)!;

describe("embedded skill", () => {
  it("matches skills/better-tg-cli on disk (rebuild if this fails)", () => {
    const dir = new URL("../skills/better-tg-cli/", import.meta.url);
    expect(Object.keys(SKILL_FILES).sort()).toEqual(readdirSync(dir).sort());
    for (const [file, content] of Object.entries(SKILL_FILES)) {
      expect(content).toBe(readFileSync(new URL(file, dir), "utf-8"));
    }
  });
});

describe(knownAgents, () => {
  it("follows the agents' own home variables", () => {
    const agents = knownAgents("/h", {
      CLAUDE_CONFIG_DIR: "/c",
      CODEX_HOME: "/x",
      GROK_HOME: "/g",
      XDG_CONFIG_HOME: "/cfg",
    });
    const dir = (id: string) => agents.find((a) => a.id === id)!.skillsDir;
    expect(dir("claude-code")).toBe(join("/c", "skills"));
    expect(dir("codex")).toBe(join("/x", "skills"));
    expect(dir("grok")).toBe(join("/g", "skills"));
    expect(dir("opencode")).toBe(join("/cfg", "opencode", "skills"));
    expect(dir("cursor")).toBe(join("/h", ".cursor", "skills"));
  });

  it("never targets the shared ~/.agents/skills folder or a folder named after the binary", () => {
    for (const a of knownAgents("/h", {})) {
      expect(a.skillsDir).not.toBe(join("/h", ".agents", "skills"));
      expect(join(a.skillsDir, SKILL_NAME)).toMatch(/[\\/]better-tg-cli$/);
    }
  });
});

describe(selectAgents, () => {
  it("defaults to agents whose home exists and rejects unknown ids", () => {
    const home = fakeHome();
    mkdirSync(join(home, ".claude"));
    mkdirSync(join(home, ".cursor"));
    const agents = knownAgents(home, {});
    expect(selectAgents(undefined, agents).map((a) => a.id)).toEqual([
      "claude-code",
      "cursor",
    ]);
    expect(selectAgents(["codex"], agents).map((a) => a.id)).toEqual(["codex"]);
    expect(() => selectAgents(["nope"], agents)).toThrow(/Unknown agent: nope/);
  });
});

describe("install / uninstall", () => {
  it("installs, reports unchanged, updates an outdated copy and removes it", () => {
    const home = fakeHome();
    const a = agent(home, "claude-code");
    expect(agentStatus(a).state.kind).toBe("missing");
    expect(installSkill(a).action).toBe("installed");
    const path = join(a.skillsDir, SKILL_NAME);
    expect(readFileSync(join(path, "SKILL.md"), "utf-8")).toBe(
      SKILL_FILES["SKILL.md"]
    );
    expect(agentStatus(a).state.kind).toBe("installed");
    expect(installSkill(a).action).toBe("unchanged");

    writeFileSync(join(path, "writing.md"), "old");
    expect(agentStatus(a).state.kind).toBe("outdated");
    expect(installSkill(a).action).toBe("updated");
    expect(agentStatus(a).state.kind).toBe("installed");

    // A copy from before the split still has reference.md: outdated, and the update removes it
    writeFileSync(join(path, "reference.md"), "old single reference");
    expect(agentStatus(a).state.kind).toBe("outdated");
    expect(installSkill(a).action).toBe("updated");
    expect(existsSync(join(path, "reference.md"))).toBe(false);
    expect(readdirSync(path).sort()).toEqual(Object.keys(SKILL_FILES).sort());
    expect(agentStatus(a).state.kind).toBe("installed");

    expect(uninstallSkill(a).action).toBe("removed");
    expect(existsSync(path)).toBe(false);
    expect(uninstallSkill(a).action).toBe("absent");
  });

  it("never writes through a symlinked skill folder; --force swaps only the link", () => {
    const home = fakeHome();
    const a = agent(home, "codex");
    const checkout = join(home, "checkout", "better-tg-cli");
    mkdirSync(checkout, { recursive: true });
    writeFileSync(
      join(checkout, "SKILL.md"),
      "---\nname: better-tg-cli\n---\nlocal edits\n"
    );
    mkdirSync(a.skillsDir, { recursive: true });
    const path = join(a.skillsDir, SKILL_NAME);
    // Windows needs a privilege for directory symlinks; a junction is what tools create there
    symlinkSync(
      checkout,
      path,
      process.platform === "win32" ? "junction" : "dir"
    );

    const linked = agentStatus(a).state;
    expect(linked.kind).toBe("linked");
    expect(resolve((linked as { target: string }).target)).toBe(
      resolve(checkout)
    );
    const skipped = installSkill(a);
    expect(skipped.action).toBe("skipped");
    expect(uninstallSkill(a).action).toBe("skipped");
    expect(lstatSync(path).isSymbolicLink()).toBe(true);

    expect(installSkill(a, { force: true }).action).toBe("installed");
    expect(lstatSync(path).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(checkout, "SKILL.md"), "utf-8")).toBe(
      "---\nname: better-tg-cli\n---\nlocal edits\n"
    );
    expect(readdirSync(checkout)).toEqual(["SKILL.md"]);
  });

  it("calls a link into a folder that no longer exists broken-link, not linked", () => {
    const home = fakeHome();
    const a = agent(home, "codex");
    const gone = join(home, "moved-away", "better-tg-cli");
    mkdirSync(gone, { recursive: true });
    mkdirSync(a.skillsDir, { recursive: true });
    const path = join(a.skillsDir, SKILL_NAME);
    symlinkSync(gone, path, process.platform === "win32" ? "junction" : "dir");
    rmSync(join(home, "moved-away"), { recursive: true });

    const { state } = agentStatus(a);
    expect(state.kind).toBe("broken-link");
    expect(resolve((state as { target: string }).target)).toBe(resolve(gone));
    const skipped = installSkill(a);
    expect(skipped).toMatchObject({ action: "skipped" });
    expect(skipped.reason).toMatch(
      /broken symlink to .*\(the target is gone\)/
    );
    // --force replaces only the dead link with a real copy
    expect(installSkill(a, { force: true }).action).toBe("installed");
    expect(agentStatus(a).state.kind).toBe("installed");
  });

  // File symlinks need a privilege on Windows; the check itself is platform-neutral
  it.skipIf(process.platform === "win32")(
    "never writes through a symlinked file inside a real skill folder",
    () => {
      const home = fakeHome();
      const a = agent(home, "claude-code");
      expect(installSkill(a).action).toBe("installed");
      const path = join(a.skillsDir, SKILL_NAME);
      const outside = join(home, "outside.md");
      writeFileSync(outside, "not the skill");
      rmSync(join(path, "writing.md"));
      symlinkSync(outside, join(path, "writing.md"));
      writeFileSync(
        join(path, "SKILL.md"),
        "---\nname: better-tg-cli\n---\nold\n"
      );
      expect(agentStatus(a).state.kind).toBe("outdated");

      const skipped = installSkill(a);
      expect(skipped.action).toBe("skipped");
      expect(skipped.reason).toMatch(/writing\.md is a symlink/);
      // Nothing was written, not even the files before the link
      expect(readFileSync(outside, "utf-8")).toBe("not the skill");
      expect(readFileSync(join(path, "SKILL.md"), "utf-8")).toBe(
        "---\nname: better-tg-cli\n---\nold\n"
      );
      expect(lstatSync(join(path, "writing.md")).isSymbolicLink()).toBe(true);
    }
  );

  it.skipIf(process.platform === "win32")(
    "a broken link under a retired name is outdated, and the update removes only the link",
    () => {
      const home = fakeHome();
      const a = agent(home, "claude-code");
      expect(installSkill(a).action).toBe("installed");
      const path = join(a.skillsDir, SKILL_NAME);
      symlinkSync(join(home, "gone.md"), join(path, "reference.md"));
      expect(existsSync(join(path, "reference.md"))).toBe(false);
      expect(agentStatus(a).state.kind).toBe("outdated");
      expect(installSkill(a).action).toBe("updated");
      expect(readdirSync(path).sort()).toEqual(Object.keys(SKILL_FILES).sort());
      expect(agentStatus(a).state.kind).toBe("installed");
    }
  );

  it("leaves a folder that belongs to something else alone", () => {
    const home = fakeHome();
    const a = agent(home, "cursor");
    const path = join(a.skillsDir, SKILL_NAME);
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "SKILL.md"), "---\nname: something-else\n---\n");
    expect(installSkill(a).action).toBe("skipped");
    expect(uninstallSkill(a, { force: true }).action).toBe("skipped");
    expect(readFileSync(join(path, "SKILL.md"), "utf-8")).toBe(
      "---\nname: something-else\n---\n"
    );
  });
});

describe("MCP", () => {
  it("never exposes `skill`, which writes into other agents' config", () => {
    setKnownCommands(["skill", "send"]);
    expect(NEVER_COMMANDS.has("skill")).toBe(true);
    expect(classifyCall(["skill", "install"])).toMatchObject({
      group: "never",
    });
    expect(isWriteCommand("skill")).toBe(false);
  });
});

describe("agent-plugin/ (Hermes Agent plugin catalog)", () => {
  const root = new URL("../", import.meta.url);
  const read = (f: string) =>
    readFileSync(new URL(`agent-plugin/${f}`, root), "utf-8");

  it("is a portable package on this version: the pinned MCP server and the current skill", () => {
    const { version } = JSON.parse(
      readFileSync(new URL("package.json", root), "utf-8")
    );
    expect(JSON.parse(read("plugin.json")).version).toBe(version);
    const server = JSON.parse(read("mcp.json")).mcpServers.telegram;
    expect(server.command).toBe("npx");
    expect(server.args).toEqual(["-y", `better-tg-cli@${version}`, "mcp"]);
    for (const [file, content] of Object.entries(SKILL_FILES)) {
      expect(read(`skills/better-tg-cli/${file}`)).toBe(content);
    }
    // Exactly these files: one the skill dropped must not linger in the copy
    expect(
      readdirSync(new URL("agent-plugin/skills/better-tg-cli/", root)).sort()
    ).toEqual(Object.keys(SKILL_FILES).sort());
    expect(read("LICENSE")).toBe(
      readFileSync(new URL("LICENSE", root), "utf-8")
    );
  });

  it("forwards no credential or approval setting to the server", () => {
    const env = JSON.parse(read("mcp.json")).mcpServers.telegram.env as Record<
      string,
      string
    >;
    for (const [name, value] of Object.entries(env)) {
      expect(value).toBe(`\${${name}}`);
    }
    for (const name of [
      "TG_APPROVE",
      "TG_LOGIN_KEY",
      "TG_INVITE",
      "OP_SERVICE_ACCOUNT_TOKEN",
      "TG_MOCK",
    ]) {
      expect(env).not.toHaveProperty(name);
    }
  });

  it("holds only regular text files", () => {
    const dir = fileURLToPath(new URL("agent-plugin", root));
    const files = (function walk(d: string): string[] {
      return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        expect(e.isSymbolicLink()).toBe(false);
        return e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)];
      });
    })(dir);
    expect(files.filter((f) => /\.(c|m)?js$|\.node$|\.wasm$/.test(f))).toEqual(
      []
    );
  });
});

describe("plugin/ (Anthropic plugin directory)", () => {
  it("carries the current skill, and pins the MCP server to this version for Codex and Cursor", () => {
    const root = new URL("../", import.meta.url);
    const { version } = JSON.parse(
      readFileSync(new URL("package.json", root), "utf-8")
    );
    const manifest = JSON.parse(
      readFileSync(new URL("plugin/.claude-plugin/plugin.json", root), "utf-8")
    );
    expect(manifest.version).toBe(version);
    const codex = JSON.parse(
      readFileSync(new URL("plugin/.codex-plugin/mcp.json", root), "utf-8")
    );
    expect(codex.mcpServers.telegram.args).toEqual([
      "-y",
      `better-tg-cli@${version}`,
      "mcp",
    ]);
    const cursor = JSON.parse(
      readFileSync(new URL("plugin/.cursor-plugin/plugin.json", root), "utf-8")
    );
    expect(cursor.mcpServers.telegram.args).toEqual([
      "-y",
      `better-tg-cli@${version}`,
      "mcp",
    ]);
    for (const [file, content] of Object.entries(SKILL_FILES)) {
      expect(
        readFileSync(
          new URL(`plugin/skills/better-tg-cli/${file}`, root),
          "utf-8"
        )
      ).toBe(content);
    }
    expect(
      readdirSync(new URL("plugin/skills/better-tg-cli/", root)).sort()
    ).toEqual(Object.keys(SKILL_FILES).sort());
    expect(readFileSync(new URL("plugin/LICENSE", root), "utf-8")).toBe(
      readFileSync(new URL("LICENSE", root), "utf-8")
    );
  });

  it("the Claude plugin is the skill alone: no MCP server, no code", () => {
    // The directory accepts MCP servers that run on the user's computer only from Verified organizations
    const root = new URL("../", import.meta.url);
    const manifest = JSON.parse(
      readFileSync(new URL("plugin/.claude-plugin/plugin.json", root), "utf-8")
    );
    expect(manifest.mcpServers).toBeUndefined();
    expect(existsSync(new URL("plugin/.mcp.json", root))).toBe(false);
    const files = (function walk(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
      );
    })(fileURLToPath(new URL("plugin", root)));
    expect(files.filter((f) => /\.(c|m)?js$|\.node$|\.wasm$/.test(f))).toEqual(
      []
    );
  });
});
