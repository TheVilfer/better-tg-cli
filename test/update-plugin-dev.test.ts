import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

// A temp profile before any module under test: the update cache lands there, never in a real one
const env = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = mkdtempSync(join(tmpdir(), "tg-update-plugin-dev-"));
  Object.assign(process.env, {
    HOME: root,
    USERPROFILE: root,
    APPDATA: join(root, "AppData"),
    TG_PROFILE: "update-test",
  });
  for (const k of ["TG_NO_UPDATE_CHECK", "CI", "TG_MOCK", "TG_UPDATE_CACHE"]) {
    delete process.env[k];
  }
  return { root };
});

// The background check is never started for real (it would reach the npm registry)
const spawned = vi.hoisted(() => [] as string[][]);
vi.mock(import("node:child_process"), async (importOriginal) => {
  const real = await importOriginal<typeof import("node:child_process")>();
  return {
    ...real,
    spawn: (_bin: string, args: string[]) => {
      spawned.push(args);
      return { unref: () => {} };
    },
  };
});

import { cachePath, maybeNotifyUpdate } from "../src/update.js";

afterAll(() => rmSync(env.root, { recursive: true, force: true }));

describe("update check: plugin dev touches no profile (#9)", () => {
  it("a terminal run of plugin dev neither reads nor writes the update cache; other commands still do", () => {
    const tty = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");
    Object.defineProperty(process.stderr, "isTTY", {
      value: true,
      configurable: true,
    });
    const written: string[] = [];
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk) => {
        written.push(String(chunk));
        return true;
      });
    try {
      expect(cachePath().startsWith(env.root)).toBe(true);
      expect(existsSync(cachePath())).toBe(false);
      maybeNotifyUpdate(["plugin", "dev", "./lab", "probe", "--mock"]);
      maybeNotifyUpdate(["plugin", "--json", "dev", "./lab", "probe"]);
      expect(existsSync(cachePath())).toBe(false);
      expect(existsSync(dirname(cachePath()))).toBe(false);
      expect(spawned).toEqual([]);
      // A fresh cache with a newer version: plugin dev says nothing, another command does
      mkdirSync(dirname(cachePath()), { recursive: true });
      writeFileSync(
        cachePath(),
        JSON.stringify({ checkedAt: Date.now(), latest: "999.0.0" })
      );
      maybeNotifyUpdate(["plugin", "dev", "./lab", "probe", "--mock"]);
      expect(written.join("")).toBe("");
      maybeNotifyUpdate(["plugin", "list"]);
      expect(written.join("")).toContain("999.0.0");
      // The forced branch is real: with no cache another command marks it and starts the check
      rmSync(cachePath());
      maybeNotifyUpdate(["chats"]);
      expect(existsSync(cachePath())).toBe(true);
      expect(spawned).toHaveLength(1);
    } finally {
      write.mockRestore();
      if (tty) {
        Object.defineProperty(process.stderr, "isTTY", tty);
      } else {
        delete (process.stderr as { isTTY?: boolean }).isTTY;
      }
    }
  });
});
