import { describe, expect, it } from "vitest";

import {
  HostError,
  runInSandbox,
  SandboxError,
} from "../src/plugins/runtime.js";
import type { HostFunction, SandboxLimits } from "../src/plugins/runtime.js";

/** One command `go` whose body is `body`, run with short limits. */
async function run(
  body: string,
  opts: {
    api?: Record<string, HostFunction>;
    limits?: Partial<SandboxLimits>;
    signal?: AbortSignal;
    cancelled?: () => boolean;
    input?: unknown;
  } = {}
) {
  return runInSandbox({
    code: `export const commands = { async go(input, host) { ${body} } };`,
    filename: "plugin.js",
    command: "go",
    input: opts.input ?? {},
    api: opts.api ?? {},
    limits: { timeoutMs: 3000, ...opts.limits },
    signal: opts.signal,
    cancelled: opts.cancelled,
  });
}

async function failure(p: Promise<unknown>): Promise<SandboxError> {
  try {
    await p;
  } catch (error) {
    expect(error).toBeInstanceOf(SandboxError);
    return error as SandboxError;
  }
  throw new Error("expected the run to fail");
}

const value = async (p: ReturnType<typeof run>) =>
  JSON.parse((await p).json) as unknown;

// Each run instantiates its own engine, and the limit cases allocate or spin: slow on a loaded runner
describe("plugin sandbox: isolation", { timeout: 30_000 }, () => {
  it("has only ECMAScript and host: no require, process, fetch, WebAssembly, Bun, timers, std/os, bridge", async () => {
    const r = await value(
      run(`return {
      require: typeof require, process: typeof process, fetch: typeof fetch, WebAssembly: typeof WebAssembly, Bun: typeof Bun,
      setTimeout: typeof setTimeout, setInterval: typeof setInterval, std: typeof std, os: typeof os, bridge: typeof globalThis.__tgBridge,
      viaFunction: Function('return typeof globalThis.__tgBridge')(), viaAsyncFunction: typeof (async () => {}).constructor,
      importMeta: typeof globalThis.import, globals: Object.getOwnPropertyNames(globalThis).filter(k => /^(__|process|require)/.test(k)),
    };`)
    );
    expect(r).toEqual({
      require: "undefined",
      process: "undefined",
      fetch: "undefined",
      WebAssembly: "undefined",
      Bun: "undefined",
      setTimeout: "undefined",
      setInterval: "undefined",
      std: "undefined",
      os: "undefined",
      bridge: "undefined",
      viaFunction: "undefined",
      viaAsyncFunction: "function",
      importMeta: "undefined",
      globals: [],
    });
  });

  it("a module import is refused, and the Function constructor reaches nothing of the host", async () => {
    const e = await failure(
      runInSandbox({
        code: `import fs from 'node:fs'; export const commands = { go() { return 1; } };`,
        filename: "p.js",
        command: "go",
        input: {},
        api: {},
      })
    );
    expect(e.code).toBe("plugin_error");
    await expect(
      value(
        run(
          `return Function('try { return this.constructor.constructor("return typeof process")(); } catch (e) { return "threw"; }')();`
        )
      )
    ).resolves.toBe("undefined");
  });

  it("host is frozen and rebuilt per run; prototype tricks change only the guest", async () => {
    await expect(
      value(
        run(
          `try { host.extra = 1; } catch {} try { host.now = null; } catch {} return [Object.isFrozen(host), typeof host.now, 'extra' in host];`
        )
      )
    ).resolves.toEqual([true, "function", false]);
    // The guest's own JSON and prototypes are its business: the host parses the text itself
    const r = await value(
      run(
        `Object.prototype.toJSON = undefined; Array.prototype.map = null; JSON.parse = () => ({ forged: true }); return { a: [1, 2] };`
      )
    );
    expect(r).toEqual({ a: [1, 2] });
  });

  it("nothing survives between runs (fresh runtime and context each time)", async () => {
    await run(
      `globalThis.leak = 42; Object.prototype.polluted = 1; return null;`
    );
    await expect(
      value(run(`return [typeof globalThis.leak, ({}).polluted];`))
    ).resolves.toEqual(["undefined", null]);
  });

  it("a missing command or no `commands` export is a plugin error", async () => {
    const e = await failure(
      runInSandbox({
        code: `export const commands = {};`,
        filename: "p.js",
        command: "go",
        input: {},
        api: {},
      })
    );
    expect(e).toMatchObject({ code: "plugin_error" });
    expect(e.message).toMatch(/commands\.go/);
    const inherited = await failure(
      runInSandbox({
        code: `export const commands = Object.create({ go() { return 1; } });`,
        filename: "p.js",
        command: "go",
        input: {},
        api: {},
      })
    );
    expect(inherited.code).toBe("plugin_error");
  });

  it("returns JSON with null kept; undefined and functions are no result", async () => {
    expect((await run(`return { cursor: null, list: [null] };`)).json).toBe(
      '{"cursor":null,"list":[null]}'
    );
    expect((await failure(run(`return undefined;`))).code).toBe("plugin_error");
  });
});

describe("plugin sandbox: async", { timeout: 30_000 }, () => {
  it("await 0 before any host call settles; a promise nothing settles is reported, not hung", async () => {
    await expect(
      value(run(`await 0; await null; await Promise.resolve(); return 'ok';`))
    ).resolves.toBe("ok");
    const t = Date.now();
    const e = await failure(run(`await new Promise(() => {}); return 1;`));
    expect(e).toMatchObject({ code: "plugin_error" });
    expect(e.message).toMatch(/never finished/);
    expect(Date.now() - t).toBeLessThan(2000);
  });

  it("host calls resolve guest promises; host errors arrive as catchable errors with their code", async () => {
    const api: Record<string, HostFunction> = {
      "a.echo": async ([x]) => ({ got: x }),
      "a.fail": () => {
        throw new HostError("flood_wait", "wait", { retryAfterSeconds: 3 });
      },
    };
    const r = await value(
      run(
        `
      const a = await host.a.echo({ n: 1 });
      let e; try { await host.a.fail(); } catch (x) { e = { code: x.code, retry: x.retryAfterSeconds, msg: x.message }; }
      return { a, e };`,
        { api }
      )
    );
    expect(r).toEqual({
      a: { got: { n: 1 } },
      e: { code: "flood_wait", retry: 3, msg: "wait" },
    });
  });

  it("an API that is not granted does not exist, and the bridge refuses a name it does not know", async () => {
    const r = await value(
      run(`return [typeof host.storage, typeof host.me];`, {
        api: { me: () => 1 },
      })
    );
    expect(r).toEqual(["undefined", "function"]);
  });

  it("host error messages are masked before the guest sees them", async () => {
    const r = await value(
      run(`try { await host.x(); } catch (e) { return e.message; }`, {
        api: {
          x: () => {
            throw new Error("Login code: 52813");
          },
        },
      })
    );
    expect(r).not.toContain("52813");
  });
});

describe("plugin sandbox: limits", { timeout: 30_000 }, () => {
  it("infinite loop, catastrophic regex and long builtins stop at the deadline", async () => {
    for (const body of [
      "for (;;) {}",
      `return /(a+)+$/.test('a'.repeat(40) + '!');`,
      "const a = Array.from({ length: 2e5 }, (_, i) => -i); for (;;) a.sort((x, y) => x - y);",
    ]) {
      const t = Date.now();
      const e = await failure(run(body, { limits: { timeoutMs: 400 } }));
      expect(e).toMatchObject({ code: "plugin_limit", limit: "timeout" });
      expect(Date.now() - t).toBeLessThan(3000);
    }
  });

  it("the deadline covers host waits too", async () => {
    const e = await failure(
      run(`await host.slow(); return 1;`, {
        api: { slow: () => new Promise((r) => setTimeout(r, 5000)) },
        limits: { timeoutMs: 300 },
      })
    );
    expect(e).toMatchObject({ code: "plugin_limit", limit: "timeout" });
  });

  it("huge allocations hit the memory limit (strings, arrays, promise chains)", async () => {
    for (const body of [
      `const s = 'x'.repeat(1 << 20); const a = []; for (;;) a.push(s + a.length);`,
      "const a = []; for (;;) a.push(new Array(1e5).fill(1));",
    ]) {
      const e = await failure(
        run(body, { limits: { memoryBytes: 16 * 1024 * 1024 } })
      );
      expect(e).toMatchObject({ code: "plugin_limit", limit: "memory" });
    }
    // A growing promise chain ends too: out of memory in a job (or its promise dropped by it), never a hang
    const e = await failure(
      run(
        "const f = () => Promise.resolve().then(f); f(); await new Promise(() => {});",
        { limits: { memoryBytes: 16 * 1024 * 1024 } }
      )
    );
    expect(["plugin_limit", "plugin_error"]).toContain(e.code);
  });

  it("deep recursion hits the stack limit (catchable inside, a limit when it escapes)", async () => {
    await expect(
      value(
        run(
          `const f = n => f(n + 1) + 1; try { return f(0); } catch (e) { return e instanceof RangeError || e instanceof InternalError ? 'caught' : String(e); }`
        )
      )
    ).resolves.toBe("caught");
    await expect(
      failure(run(`const f = n => f(n + 1) + 1; return f(0);`))
    ).resolves.toMatchObject({ code: "plugin_limit", limit: "stack" });
  });

  it("a promise loop that never yields to the host hits the job limit", async () => {
    const e = await failure(
      run(
        `let n = 0; const f = () => { n++; Promise.resolve().then(f); }; f(); await new Promise(() => {});`,
        { limits: { jobsPerDrain: 10_000 } }
      )
    );
    expect(e).toMatchObject({ code: "plugin_limit", limit: "jobs" });
  });

  it("host calls: at most N per run and 4 at the same time", async () => {
    const api = { x: async () => 1 };
    await expect(
      value(
        run(`for (let i = 0; i < 5; i++) await host.x(); return 'ok';`, {
          api,
          limits: { hostCalls: 5 },
        })
      )
    ).resolves.toBe("ok");
    await expect(
      failure(
        run(`for (let i = 0; i < 6; i++) await host.x(); return 'ok';`, {
          api,
          limits: { hostCalls: 5 },
        })
      )
    ).resolves.toMatchObject({ code: "plugin_limit", limit: "hostCalls" });
    // A caught refusal does not let the run go on: the limit ends it
    await expect(
      failure(
        run(
          `for (let i = 0; i < 9; i++) { try { await host.x(); } catch {} } return 'ok';`,
          { api, limits: { hostCalls: 5 } }
        )
      )
    ).resolves.toMatchObject({ limit: "hostCalls" });
    await expect(
      value(
        run(`return Promise.all([1, 2, 3, 4].map(() => host.x()));`, { api })
      )
    ).resolves.toEqual([1, 1, 1, 1]);
    await expect(
      failure(
        run(`return Promise.all([1, 2, 3, 4, 5].map(() => host.x()));`, { api })
      )
    ).resolves.toMatchObject({
      code: "plugin_limit",
      limit: "concurrentCalls",
    });
  });

  it("1 MB per call in and out", async () => {
    const api = {
      echo: async ([x]: unknown[]) => x,
      big: async () => "z".repeat(1_100_000),
    };
    await expect(
      failure(run(`return host.echo('y'.repeat(1_100_000));`, { api }))
    ).resolves.toMatchObject({ code: "plugin_limit", limit: "callBytes" });
    await expect(
      failure(run(`try { await host.big(); } catch {} return 1;`, { api }))
    ).resolves.toMatchObject({ code: "plugin_limit", limit: "callBytes" });
  });

  it("the result is at most outputChars after serialization", async () => {
    await expect(
      failure(run(`return 'y'.repeat(70000);`))
    ).resolves.toMatchObject({ code: "plugin_limit", limit: "output" });
  });
});

describe("plugin sandbox: cancellation", { timeout: 30_000 }, () => {
  it("an abort signal stops a run waiting on the host, and a late result is never handed in", async () => {
    const ac = new AbortController();
    let late = false;
    const api = {
      slow: (_: unknown[], signal: AbortSignal) =>
        new Promise((r) =>
          setTimeout(() => {
            late = !signal.aborted;
            r(1);
          }, 300)
        ),
    };
    setTimeout(() => ac.abort(), 50);
    const e = await failure(
      run(`await host.slow(); return 'finished';`, { api, signal: ac.signal })
    );
    expect(e.code).toBe("cancelled");
    await new Promise((r) => setTimeout(r, 400));
    expect(late).toBe(false);
  });

  it("a polled flag stops code that keeps the thread busy", async () => {
    const until = Date.now() + 200;
    const e = await failure(
      run("for (;;) {}", { cancelled: () => Date.now() > until })
    );
    expect(e.code).toBe("cancelled");
  });

  it("no host operation starts after the run failed", async () => {
    let started = 0;
    const api = {
      x: () => {
        started++;
        return new Promise((r) => setTimeout(r, 50));
      },
    };
    await failure(
      run(
        `host.x(); host.x(); host.x(); host.x(); host.x(); host.x(); await new Promise(() => {});`,
        { api }
      )
    );
    expect(started).toBe(4);
  });
});
