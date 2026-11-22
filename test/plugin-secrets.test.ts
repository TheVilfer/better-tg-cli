import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const env = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = mkdtempSync(join(tmpdir(), "tg-plugin-secrets-"));
  Object.assign(process.env, {
    HOME: root,
    USERPROFILE: root,
    APPDATA: join(root, "AppData"),
    TG_NO_UPDATE_CHECK: "1",
    TG_PROFILE: "plugin-secrets",
  });
  for (const k of [
    "TG_MOCK",
    "TG_MCP",
    "TG_READ_ONLY",
    "OP_SERVICE_ACCOUNT_TOKEN",
  ]) {
    delete process.env[k];
  }
  return { root };
});

const traps = vi.hoisted(() => ({ calls: [] as string[] }));
vi.mock(import("../src/secrets.js"), () => {
  const trap = (name: string) => () => {
    traps.calls.push(name);
    throw new Error(`the real secret store was reached: ${name}`);
  };
  return {
    isSecretKey: () => false,
    isSecretStoreAvailable: trap("isSecretStoreAvailable"),
    secretGet: trap("secretGet"),
    secretGetStrict: trap("secretGetStrict"),
    secretGetStrictAsync: trap("secretGetStrictAsync"),
    secretSet: trap("secretSet"),
    secretDelete: trap("secretDelete"),
  };
});
vi.mock(import("node:child_process"), async () => {
  const actual =
    await vi.importActual<typeof import("node:child_process")>(
      "node:child_process"
    );
  const trap = (name: string) => () => {
    traps.calls.push(`child_process.${name}`);
    throw new Error(`a child process was started: ${name}`);
  };
  return {
    ...actual,
    spawn: trap("spawn"),
    spawnSync: trap("spawnSync"),
    execFile: trap("execFile"),
    execFileSync: trap("execFileSync"),
    exec: trap("exec"),
    execSync: trap("execSync"),
  };
});

vi.mock(import("../src/write-store.js"), async () => {
  const real = await vi.importActual<typeof import("../src/write-store.js")>(
    "../src/write-store.js"
  );
  return { ...real, hasHumanChannel: () => true };
});

import { pluginCommand, pluginDeps } from "../src/commands/plugin.js";
import { networkBackend } from "../src/plugins/http.js";
import type { NetDeps } from "../src/plugins/http.js";
import type { Manifest } from "../src/plugins/manifest.js";
import {
  memoryCursors,
  memoryStorage,
  runPluginCommand,
} from "../src/plugins/run.js";
import {
  deletePluginSecret,
  getPluginSecret,
  pluginSecretDeps,
  pluginSecretKey,
  secretStates,
  setPluginSecret,
  slotIn,
} from "../src/plugins/secrets.js";
import type { PluginSecretStore } from "../src/plugins/secrets.js";
import { readLocalSnapshot } from "../src/plugins/source.js";
import {
  storeDeps,
  commitInstall,
  pendingSecrets,
  pluginHome,
  readLock,
  removeInstall,
} from "../src/plugins/store.js";

const LAB = resolve("test/fixtures/plugins/net-lab");
const labManifest = readLocalSnapshot(LAB, "99.0.0").manifest as Manifest;
const slot = (name: string) => slotIn(labManifest, name);

afterAll(() => rmSync(env.root, { recursive: true, force: true }));

let registryKey: string | null = null;
storeDeps.keyStore = {
  available: () => true,
  get: () => ({ ok: true, value: registryKey }),
  set: (v) => {
    registryKey = v;
    return true;
  },
};

function memoryStore(): PluginSecretStore & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    get: (k) => items.get(k) ?? null,
    set: (k, v) => {
      items.set(k, v);
      return true;
    },
    delete: (k) => items.delete(k),
  };
}

async function cli(
  args: string[]
): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => {
    out.push(a.join(" "));
  });
  const error = vi
    .spyOn(console, "error")
    .mockImplementation((...a: unknown[]) => {
      err.push(a.join(" "));
    });
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(((
    s: string
  ) => {
    err.push(String(s));
    return true;
  }) as never);
  const exit = vi.spyOn(process, "exit").mockImplementation(((c: number) => {
    throw new Error(`exit ${c}`);
  }) as never);
  const { argv } = process;
  process.argv = [argv[0], "telegram", "plugin", ...args];
  let code = 0;
  try {
    await pluginCommand.parseAsync(args, { from: "user" });
  } catch (error_) {
    const m = /^exit (\d+)$/.exec((error_ as Error).message);
    code = m ? Number(m[1]) : 99;
    if (!m) {
      err.push(String(error_));
    }
  } finally {
    process.argv = argv;
    log.mockRestore();
    error.mockRestore();
    stderr.mockRestore();
    exit.mockRestore();
  }
  return { code, out: out.join("\n"), err: err.join("") };
}

function installLab() {
  const entry = commitInstall(readLocalSnapshot(LAB, "99.0.0"));
  return entry;
}

beforeEach(() => {
  traps.calls.length = 0;
  pluginDeps.cliVersion = "99.0.0";
});
afterEach(() => {
  const left = readLock().plugins["net-lab"];
  if (left) {
    removeInstall(left, false);
  }
  delete pluginSecretDeps.store;
  delete pluginDeps.readSecret;
  delete pluginDeps.tty;
  expect(traps.calls).toEqual([]);
});

describe("plugin secrets under VITEST never reach the real secret store", () => {
  it("get, set, delete and the states are refused without TG_MOCK or an injected store", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    expect(() => getPluginSecret(id, slot("apikey"))).toThrow(
      /tests never use the real secret store/
    );
    expect(() =>
      setPluginSecret(id, slot("apikey"), "long-enough-value")
    ).toThrow(/tests never use the real secret store/);
    expect(() => deletePluginSecret(id, slot("apikey"))).toThrow(
      /tests never use the real secret store/
    );
    expect(secretStates(id, labManifest.secrets!.slice(0, 1))).toEqual({
      apikey: "unknown",
    });
  });

  it("a run that needs a secret gets secret_store_unavailable, and nothing is sent", async () => {
    const snap = readLocalSnapshot(LAB, "99.0.0");
    const m = snap.manifest as Manifest;
    const dials: string[] = [];
    const net: NetDeps = {
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      connect: () => {
        dials.push("dial");
        throw new Error("no");
      },
    };
    const out = await runPluginCommand({
      manifest: m,
      command: m.commands!.find((c) => c.name === "fetch")!,
      code: new TextDecoder().decode(snap.files.get("code/net.js")),
      filename: "code/net.js",
      input: { url: "https://api.example.com/v1/x" },
      client: async () => {
        throw new Error("no");
      },
      account: async () => "1",
      storage: async () => memoryStorage(m),
      cursors: memoryCursors(),
      installId: "11111111-2222-4333-8444-555555555555",
      mcp: false,
      network: {
        backend: networkBackend(net),
        secret: (n) =>
          getPluginSecret("11111111-2222-4333-8444-555555555555", slot(n)),
        setCommand: (n) => ["plugin", "secret", "set", "net-lab", n],
      },
    });
    expect(out.envelope.data).toMatchObject({
      ok: false,
      error: { code: "secret_store_unavailable" },
    });
    expect(dials).toEqual([]);
  });

  it("the commands (secret set, secret rm, show, remove) on a real profile reach no store and no child process", async () => {
    const entry = installLab();
    pluginDeps.tty = true;
    pluginDeps.readSecret = async () => "a-typed-secret-123";
    const set = await cli(["secret", "set", "net-lab", "apikey", "--json"]);
    expect(set.code).toBe(1);
    expect(set.out).toMatch(/secret_store_unavailable/);
    const show = await cli(["show", "net-lab", "--json"]);
    expect(show.code).toBe(0);
    expect(
      JSON.parse(show.out).secrets.map((s: { state: string }) => s.state)
    ).toEqual(["unknown", "unknown"]);
    expect(
      (await cli(["secret", "rm", "net-lab", "apikey", "--json"])).code
    ).toBe(1);
    pluginDeps.confirm = async () => true;
    try {
      const rm = await cli(["remove", "net-lab", "--json"]);
      expect(rm.code).toBe(0);
      expect(JSON.parse(rm.out)).toMatchObject({
        ok: true,
        secretsNotRemoved: ["apikey", "other"],
      });
    } finally {
      delete pluginDeps.confirm;
    }
    void entry;
  });
});

describe("plugin secret set / rm / show with an injected store", () => {
  it("only a hidden prompt in a terminal sets it, under a key the core builds; show says set, never the value", async () => {
    const store = memoryStore();
    pluginSecretDeps.store = store;
    const entry = installLab();
    pluginDeps.tty = false;
    const prompt = vi.fn(async () => "never-used-value");
    pluginDeps.readSecret = prompt;
    const noTty = await cli(["secret", "set", "net-lab", "apikey", "--json"]);
    expect(noTty.code).toBe(1);
    expect(JSON.parse(noTty.out).error).toMatchObject({
      code: "human_required",
      command: ["plugin", "secret", "set", "net-lab", "apikey"],
    });
    expect(prompt).not.toHaveBeenCalled();
    pluginDeps.tty = true;
    const argv = await cli([
      "secret",
      "set",
      "net-lab",
      "apikey",
      "sk-in-argv-123456",
    ]);
    expect(argv.code).not.toBe(0);
    expect(store.items.size).toBe(0);
    pluginDeps.readSecret = async () => "short";
    expect(
      (await cli(["secret", "set", "net-lab", "apikey", "--json"])).code
    ).toBe(2);
    pluginDeps.readSecret = async () => "two\nlines-of-secret";
    expect(
      (await cli(["secret", "set", "net-lab", "apikey", "--json"])).code
    ).toBe(2);
    expect(
      (await cli(["secret", "set", "net-lab", "nope", "--json"])).code
    ).toBe(2);
    pluginDeps.readSecret = prompt;
    const ok = await cli(["secret", "set", "net-lab", "apikey", "--json"]);
    expect(ok.code, ok.err).toBe(0);
    expect(JSON.parse(ok.out)).toEqual({
      ok: true,
      action: "plugin secret set",
      plugin: "net-lab",
      secret: "apikey",
    });
    expect(ok.err).toContain(
      "Sent only to: https://api.example.com (only the paths /v1 and below them), as the header Authorization"
    );
    expect(ok.out + ok.err).not.toContain("never-used-value");
    expect([...store.items]).toEqual([
      [pluginSecretKey(entry.installId, slot("apikey")), "never-used-value"],
    ]);
    expect(pluginSecretKey(entry.installId, slot("apikey"))).toBe(
      `plugin-secret-plugin-secrets-${entry.installId}-apikey-g${slot("apikey").gen}`
    );
    const show = await cli(["show", "net-lab", "--json"]);
    const o = JSON.parse(show.out);
    expect(o.secrets).toMatchObject([
      { name: "apikey", state: "set" },
      {
        name: "other",
        state: "not set",
        set: ["plugin", "secret", "set", "net-lab", "other"],
      },
    ]);
    expect(show.out).not.toContain("never-used-value");
    const audit = readFileSync(
      join(
        process.platform === "win32"
          ? join(env.root, "AppData")
          : join(env.root, ".config"),
        "tg-plugin-secrets",
        "audit.jsonl"
      ),
      "utf-8"
    );
    expect(audit).toMatch(/"command":"plugin secret set".*"key":"apikey"/);
    expect(audit).not.toContain("never-used-value");
    expect(
      JSON.parse(
        (await cli(["secret", "rm", "net-lab", "apikey", "--json"])).out
      )
    ).toMatchObject({ ok: true, existed: true });
    expect(store.items.size).toBe(0);
    store.set(
      pluginSecretKey(entry.installId, slot("other")),
      "other-value-123"
    );
    pluginDeps.confirm = async () => true;
    try {
      expect((await cli(["remove", "net-lab", "--json"])).code).toBe(0);
    } finally {
      delete pluginDeps.confirm;
    }
    expect(store.items.size).toBe(0);
  });

  it("review #7: a remove while the prompt waits makes set refuse; nothing is stored under the removed installation", async () => {
    const store = memoryStore();
    pluginSecretDeps.store = store;
    const entry = installLab();
    pluginDeps.tty = true;
    pluginDeps.readSecret = async () => {
      removeInstall(readLock().plugins["net-lab"], false);
      return "typed-after-remove-123";
    };
    const r = await cli(["secret", "set", "net-lab", "apikey", "--json"]);
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out).error).toMatchObject({ code: "plugin_changed" });
    expect(JSON.parse(r.out).error.message).toMatch(
      /the secret was not stored/
    );
    expect(store.items.size).toBe(0);
    expect(
      store.get(pluginSecretKey(entry.installId, slot("apikey")))
    ).toBeNull();
    installLab();
    pluginDeps.readSecret = async () => {
      removeInstall(readLock().plugins["net-lab"], false);
      installLab();
      return "typed-after-reinstall-1";
    };
    expect(
      JSON.parse(
        (await cli(["secret", "set", "net-lab", "apikey", "--json"])).out
      ).error
    ).toMatchObject({ code: "plugin_changed" });
    expect(store.items.size).toBe(0);
  });

  it("review #7: secrets the store failed to delete on remove are recorded and deleted by the next plugin command", async () => {
    const store = memoryStore();
    let failures = 1;
    pluginSecretDeps.store = {
      ...store,
      delete: (k) => {
        if (failures > 0) {
          failures--;
          throw new Error("store busy");
        }
        return store.delete(k);
      },
    };
    const entry = installLab();
    store.set(
      pluginSecretKey(entry.installId, slot("apikey")),
      "stored-value-12345"
    );
    pluginDeps.confirm = async () => true;
    try {
      const rm = await cli(["remove", "net-lab", "--json"]);
      expect(rm.code, rm.err).toBe(0);
      expect(JSON.parse(rm.out)).toMatchObject({
        ok: true,
        secretsNotRemoved: ["apikey"],
      });
    } finally {
      delete pluginDeps.confirm;
    }
    expect(store.items.size).toBe(1);
    expect(pendingSecrets()).toEqual([
      {
        name: "net-lab",
        installId: entry.installId,
        secrets: [`apikey:${slot("apikey").gen}`],
      },
    ]);
    const list = await cli(["list", "--json"]);
    expect(list.code).toBe(0);
    expect(JSON.parse(list.out)).toBeTypeOf("object");
    expect(store.items.size).toBe(0);
    expect(pendingSecrets()).toEqual([]);
  });

  it("review P5 #1: plugin validate and plugin dev never touch the secret store or a pending cleanup", async () => {
    const calls: string[] = [];
    const store = memoryStore();
    pluginSecretDeps.store = {
      get: (k) => (calls.push(`get ${k}`), store.get(k)),
      set: (k, v) => (calls.push(`set ${k}`), store.set(k, v)),
      delete: (k) => (calls.push(`delete ${k}`), store.delete(k)),
    };
    const gone = "00000000-0000-4000-8000-000000000001";
    store.set(pluginSecretKey(gone, slot("apikey")), "left-behind-1234");
    const record = JSON.stringify([
      {
        name: "net-lab",
        installId: gone,
        secrets: [`apikey:${slot("apikey").gen}`],
      },
    ]);
    const file = join(
      pluginHome(),
      "plugin-state",
      "pending-secret-cleanup.json"
    );
    mkdirSync(join(pluginHome(), "plugin-state"), { recursive: true });
    writeFileSync(file, record);
    calls.length = 0;
    const validate = await cli(["validate", LAB, "--json"]);
    expect(validate.code, validate.err).toBe(0);
    const dev = await cli(["dev", LAB, "no-net", "--mock", "--json"]);
    expect(dev.code, dev.err).toBe(0);
    expect(calls).toEqual([]);
    expect(readFileSync(file, "utf-8")).toBe(record);
    expect((await cli(["list", "--json"])).code).toBe(0);
    expect(calls).toContain(`delete ${pluginSecretKey(gone, slot("apikey"))}`);
    expect(pendingSecrets()).toEqual([]);
  });

  it("review P5 #6: plugin run refuses a target the plugin has no permission for, as plugin dev and the SDK do", async () => {
    installLab();
    const r = await cli([
      "run",
      "net-lab",
      "no-net",
      "--target",
      "@mock_owner:1",
      "--json",
    ]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out.split("\n").at(-1)!).error).toMatchObject({
      code: "invalid_argument",
      message:
        'Plugin "net-lab" reads no target (it lacks the permission messages:read-target); drop --target',
    });
  });

  it("review #7: a pending record for an installation that is still registered is dropped, its secrets kept", async () => {
    const store = memoryStore();
    pluginSecretDeps.store = store;
    const entry = installLab();
    store.set(
      pluginSecretKey(entry.installId, slot("apikey")),
      "live-value-123456"
    );
    mkdirSync(join(pluginHome(), "plugin-state"), { recursive: true });
    writeFileSync(
      join(pluginHome(), "plugin-state", "pending-secret-cleanup.json"),
      JSON.stringify([
        {
          name: "net-lab",
          installId: entry.installId,
          secrets: [`apikey:${slot("apikey").gen}`],
        },
      ])
    );
    expect(pendingSecrets()).toHaveLength(1);
    expect((await cli(["settings", "get", "net-lab", "--json"])).code).toBe(0);
    expect(store.get(pluginSecretKey(entry.installId, slot("apikey")))).toBe(
      "live-value-123456"
    );
    expect(pendingSecrets()).toEqual([]);
  });

  it("review #7: secret rm deletes a secret a removed plugin left behind (only one recorded as pending)", async () => {
    const store = memoryStore();
    let failures = 2;
    pluginSecretDeps.store = {
      ...store,
      delete: (k) => {
        if (failures > 0) {
          failures--;
          throw new Error("store busy");
        }
        return store.delete(k);
      },
    };
    const entry = installLab();
    store.set(
      pluginSecretKey(entry.installId, slot("apikey")),
      "stored-value-12345"
    );
    pluginDeps.confirm = async () => true;
    try {
      expect(
        JSON.parse((await cli(["remove", "net-lab", "--json"])).out)
      ).toMatchObject({ secretsNotRemoved: ["apikey"] });
    } finally {
      delete pluginDeps.confirm;
    }
    const rm = await cli(["secret", "rm", "net-lab", "apikey", "--json"]);
    expect(rm.code, rm.out + rm.err).toBe(0);
    expect(JSON.parse(rm.out)).toMatchObject({ ok: true, removedPlugin: true });
    expect(store.items.size).toBe(0);
    expect(pendingSecrets()).toEqual([]);
    expect(
      JSON.parse(
        (await cli(["secret", "rm", "net-lab", "apikey", "--json"])).out
      ).error.code
    ).toBe("plugin_not_found");
  });

  it("over MCP (TG_MCP, TG_READ_ONLY) set and rm are refused with the command for the human, before any prompt", async () => {
    const store = memoryStore();
    pluginSecretDeps.store = store;
    installLab();
    pluginDeps.tty = true;
    const prompt = vi.fn(async () => "never-used-value");
    pluginDeps.readSecret = prompt;
    for (const v of ["TG_MCP", "TG_READ_ONLY"]) {
      process.env[v] = "1";
      try {
        const r = await cli(["secret", "set", "net-lab", "apikey", "--json"]);
        expect(r.code).toBe(1);
        expect(JSON.parse(r.out).error).toMatchObject({
          code: "human_required",
          command: ["plugin", "secret", "set", "net-lab", "apikey"],
        });
        expect(JSON.parse(r.out).error.hint).toContain(
          "TG_PROFILE=plugin-secrets"
        );
        expect(JSON.parse(r.out).error.hint).toContain(
          "telegram plugin secret set net-lab apikey"
        );
        expect(
          (await cli(["secret", "rm", "net-lab", "apikey", "--json"])).code
        ).toBe(1);
      } finally {
        delete process.env[v];
      }
    }
    expect(prompt).not.toHaveBeenCalled();
    expect(store.items.size).toBe(0);
    pluginDeps.confirm = async () => true;
    try {
      await cli(["remove", "net-lab", "--json"]);
    } finally {
      delete pluginDeps.confirm;
    }
  });
});
