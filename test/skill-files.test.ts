import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SKILL_FILES } from "../src/skill-files.js";

const root = new URL("../", import.meta.url);
const skillDir = new URL("skills/better-tg-cli/", root);
const read = (f: string) => readFileSync(new URL(f, skillDir), "utf-8");

function frontmatter(text: string): {
  fields: Record<string, string>;
  body: string;
} {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) {
    throw new Error("SKILL.md has no frontmatter");
  }
  const fields = Object.fromEntries(
    m[1]
      .split("\n")
      .map((l) => /^(\w+):\s*(.*)$/.exec(l))
      .filter(Boolean)
      .map((x) => [x![1], x![2]])
  );
  return { fields, body: text.slice(m[0].length) };
}

const approxTokens = (text: string) =>
  Math.ceil(
    Math.max(text.length / 3.9, text.split(/\s+/).filter(Boolean).length * 1.75)
  );

const slug = (heading: string) =>
  heading
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N} _-]/gu, "")
    .replaceAll(" ", "-");
const anchors = (text: string) =>
  new Set([...text.matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1])));

function links(text: string): { file: string; anchor?: string }[] {
  return [...text.replaceAll(/`[^`\n]*`/g, "").matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((href) => !/^[a-z]+:/i.test(href))
    .map((href) => {
      const [file, anchor] = href.split("#");
      return { file, anchor };
    });
}

describe("SKILL.md", () => {
  const { fields, body } = frontmatter(read("SKILL.md"));

  it("has a short bilingual description and a body under ~1000 tokens", () => {
    expect(fields.name).toBe("better-tg-cli");
    expect(fields.description.length).toBeLessThan(400);
    expect(fields.description).toMatch(/«что в тг»/);
    expect(approxTokens(body)).toBeLessThan(1000);
  });

  it("links each reference file directly", () => {
    const linked = new Set(
      links(body)
        .map((l) => l.file)
        .filter(Boolean)
    );
    expect([...linked].sort()).toEqual(
      Object.keys(SKILL_FILES)
        .filter((f) => f !== "SKILL.md")
        .sort()
    );
  });
});

describe("reference files", () => {
  const files = Object.keys(SKILL_FILES);

  it("every link from any skill file points at a shipped file and an existing heading", () => {
    for (const from of files) {
      for (const { file, anchor } of links(read(from))) {
        const target = file || from;
        expect(SKILL_FILES, `${from} → ${target}`).toHaveProperty([target]);
        if (anchor) {
          expect(
            anchors(read(target)).has(anchor),
            `${from} → ${target}#${anchor}`
          ).toBe(true);
        }
      }
    }
  });

  it("are flat, and those over 100 lines open with a table of contents", () => {
    expect(
      readdirSync(skillDir, { withFileTypes: true }).every(
        (e) => e.isFile() && e.name.endsWith(".md")
      )
    ).toBe(true);
    for (const f of files.filter((f) => f !== "SKILL.md")) {
      const text = read(f);
      if (text.split("\n").length <= 100) {
        continue;
      }
      const head = text.split("\n").slice(0, 20).join("\n");
      const toc = [...head.matchAll(/^- \[[^\]]+\]\(#([^)]+)\)$/gm)].map(
        (m) => m[1]
      );
      expect(toc.length, `${f} has no table of contents`).toBeGreaterThan(2);
      for (const a of toc) {
        expect(anchors(text).has(a), `${f}#${a}`).toBe(true);
      }
    }
  });

  it("hold no recipe the agent must not follow", () => {
    for (const f of files) {
      const text = read(f);
      expect(text, f).not.toMatch(/--password|transfer-owner[^\n]*-y\b/);
      expect(text, f).not.toMatch(
        /--(params|json-params|reaction|reply-to)[^\n]*"className"/
      );
      expect(text, f).not.toMatch(
        /FLOOD_WAIT[^.\n]*(then retry|and retry|wait \w+ seconds)/i
      );
      expect(text, f).not.toMatch(/every write (is logged|goes to)/i);
    }
  });
});

describe("every skill file ships", () => {
  const files = Object.keys(SKILL_FILES).sort();

  it("in the npm package", () => {
    const r = spawnSync(
      "npm",
      ["pack", "--dry-run", "--json", "--ignore-scripts"],
      {
        cwd: fileURLToPath(root),
        encoding: "utf-8",
        shell: process.platform === "win32",
        windowsHide: true,
      }
    );
    expect(r.status, r.stderr).toBe(0);
    const packed = (JSON.parse(r.stdout)[0].files as { path: string }[]).map(
      (f) => f.path.replaceAll("\\", "/")
    );
    expect(packed.filter((p) => p.startsWith("skills/")).sort()).toEqual(
      files.map((f) => `skills/better-tg-cli/${f}`)
    );
  }, 60_000);

  it("in plugin/ and agent-plugin/, byte for byte and nothing else", () => {
    for (const copy of ["plugin", "agent-plugin"]) {
      const dir = new URL(`${copy}/skills/better-tg-cli/`, root);
      expect(readdirSync(dir).sort(), copy).toEqual(files);
      for (const f of files) {
        expect(readFileSync(new URL(f, dir), "utf-8"), `${copy}/${f}`).toBe(
          SKILL_FILES[f]
        );
      }
    }
    expect(existsSync(new URL("skills/better-tg-cli/reference.md", root))).toBe(
      false
    );
  });
});
