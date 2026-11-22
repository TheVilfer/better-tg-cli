import variant from "@jitl/quickjs-singlefile-mjs-release-sync";
import {
  newQuickJSWASMModuleFromVariant,
  newVariant,
} from "quickjs-emscripten-core";
import type {
  QuickJSContext,
  QuickJSDeferredPromise,
  QuickJSHandle,
  QuickJSRuntime,
} from "quickjs-emscripten-core";

import { CliError } from "../errors.js";
import { maskForModel } from "../mcp-output.js";
import { DEFAULT_LIMITS, HostError, SandboxError } from "./sandbox-types.js";
import type { HostFunction, SandboxLimits } from "./sandbox-types.js";

export {
  DEFAULT_LIMITS,
  HostError,
  SandboxError,
  type HostFunction,
  type SandboxLimits,
};

/**
 * - `code`: The plugin's `main`: one ES module without imports, exporting `commands`.
 * - `api`: Granted host API by dotted name (`messages.mine`); only these exist in the guest's `host`.
 * - `constants`: Plain values put on `host` as they are (frozen), e.g. `{ dev: true }`.
 * - `deadline`: The run's absolute deadline when the caller shares it with the host (default: now + timeoutMs).
 * - `onCall`: Told the name of each host call as it is made (the audit wants them for a failed run too).
 * - `cancelled`: Polled by the engine's interrupt handler: a cancel that cannot arrive as an event while plugin code keeps the thread busy (the MCP server's flag in shared memory, for a worker thread).
 */
export interface SandboxRun {
  code: string;
  filename: string;
  command: string;
  input: unknown;
  api: Record<string, HostFunction>;
  constants?: Record<string, unknown>;
  limits?: Partial<SandboxLimits>;
  deadline?: number;
  signal?: AbortSignal;
  onCall?: (name: string) => void;
  cancelled?: () => boolean;
}

/**
 * - `json`: The command's result as JSON text (what it returned, serialized in the guest).
 * - `calls`: Names of the host API calls made, in call order (for the audit).
 */
export interface SandboxResult {
  json: string;
  calls: string[];
}

const PRELUDE = String.raw`(() => {
  const bridge = globalThis.__tgBridge;
  delete globalThis.__tgBridge;
  const parse = JSON.parse, stringify = JSON.stringify, freeze = Object.freeze, hasOwn = Object.hasOwn;
  const random = Math.random, dateNow = Date.now, P = Promise, then = P.prototype.then, Err = Error;
  const call = (name, args) => {
    const json = stringify(args);
    return then.call(bridge(name, json === undefined ? '[]' : json), text => {
      const reply = parse(text);
      if (reply.error) {
        const e = new Err(reply.error.message);
        for (const key of Object.keys(reply.error)) if (key !== 'message') e[key] = reply.error[key];
        throw e;
      }
      return reply.value;
    });
  };
  const deepFreeze = value => {
    if (value && typeof value === 'object') { for (const key of Object.keys(value)) deepFreeze(value[key]); freeze(value); }
    return value;
  };
  return (ns, name, inputJson, apiJson, constantsJson) => {
    const host = { now: () => dateNow(), random: () => random(), input: deepFreeze(parse(inputJson)) };
    const constants = parse(constantsJson);
    for (const key of Object.keys(constants)) host[key] = deepFreeze(constants[key]);
    for (const dotted of parse(apiJson)) {
      const parts = dotted.split('.');
      let at = host;
      for (const part of parts.slice(0, -1)) at = hasOwn(at, part) ? at[part] : (at[part] = {});
      at[parts[parts.length - 1]] = (...args) => call(dotted, args);
    }
    deepFreeze(host);
    const commands = ns && ns.commands;
    if (!commands || typeof commands !== 'object' || !hasOwn(commands, name) || typeof commands[name] !== 'function') {
      throw new Err('The plugin does not export commands.' + name);
    }
    return then.call(P.resolve(commands[name](parse(inputJson), host)), value => {
      const json = stringify(value);
      if (json === undefined) throw new Err('The command returned no JSON value');
      return json;
    });
  };
})()`;

const bytes = (text: string) => Buffer.byteLength(text, "utf-8");

/** One sandbox run: fresh WASM module, runtime and context, all dropped afterwards. */
export async function runInSandbox(run: SandboxRun): Promise<SandboxResult> {
  const limits = { ...DEFAULT_LIMITS, ...run.limits };
  const started = Date.now();
  const deadline = run.deadline ?? started + limits.timeoutMs;
  const abort = new AbortController();
  let failure: SandboxError | undefined;
  const fail = (error: SandboxError) => {
    failure ??= error;
    abort.abort(failure);
  };
  const onCancel = () =>
    fail(new SandboxError("cancelled", "The run was cancelled"));
  if (run.signal?.aborted) {
    onCancel();
  }
  run.signal?.addEventListener("abort", onCancel, { once: true });
  const timer = setTimeout(
    () =>
      fail(
        new SandboxError(
          "plugin_limit",
          `The run took longer than ${limits.timeoutMs / 1000} s`,
          "timeout"
        )
      ),
    Math.max(0, deadline - Date.now())
  );

  const calls: string[] = [];
  const inFlight = new Set<Promise<void>>();
  const deferreds = new Set<QuickJSDeferredPromise>();
  let wake: () => void = () => {};

  let rt: QuickJSRuntime | undefined;
  let vm: QuickJSContext | undefined;
  const handles: QuickJSHandle[] = [];
  const keep = (h: QuickJSHandle) => (handles.push(h), h);
  let clean = false;
  try {
    const quickjs = await newQuickJSWASMModuleFromVariant(
      newVariant(variant, {
        emscriptenModule: { print: () => {}, printErr: () => {} } as object,
      })
    );
    rt = quickjs.newRuntime();
    rt.setMemoryLimit(limits.memoryBytes);
    rt.setMaxStackSize(limits.stackBytes);
    rt.setInterruptHandler(() => {
      if (!failure && run.cancelled?.()) {
        onCancel();
      }
      if (!failure && Date.now() > deadline) {
        fail(
          new SandboxError(
            "plugin_limit",
            `The run took longer than ${limits.timeoutMs / 1000} s`,
            "timeout"
          )
        );
      }
      return !!failure;
    });
    const ctx = (vm = rt.newContext());

    const reply = (
      body: { value: unknown } | { error: unknown },
      name: string
    ): string => {
      const json = JSON.stringify(body);
      const max =
        name === "http.fetch" ? limits.httpReplyBytes : limits.callBytes;
      if (bytes(json) > max) {
        fail(
          new SandboxError(
            "plugin_limit",
            `The result of host.${name} exceeded ${max} bytes`,
            "callBytes"
          )
        );
      }
      return json;
    };
    const errorBody = (e: unknown) => {
      if (e instanceof HostError) {
        return {
          error: {
            ...e.extra,
            code: e.code,
            message: maskForModel(e.message, "echo"),
          },
        };
      }
      const code = e instanceof CliError ? e.code : "host_error";
      return {
        error: {
          code,
          message: maskForModel(
            e instanceof Error ? e.message : String(e),
            "echo"
          ),
        },
      };
    };

    const bridge = ctx.newFunction("bridge", (nameH, argsH) => {
      const name = ctx.typeof(nameH) === "string" ? ctx.getString(nameH) : "";
      const argsText =
        ctx.typeof(argsH) === "string" ? ctx.getString(argsH) : "";
      const deferred = ctx.newPromise();
      deferreds.add(deferred);
      const answer = (json: string) => {
        if (failure || !deferred.alive) {
          return;
        }
        const h = ctx.newString(json);
        deferred.resolve(h);
        h.dispose();
      };
      if (failure) {
        return deferred.handle;
      }
      const fn = Object.hasOwn(run.api, name) ? run.api[name] : undefined;
      if (!fn) {
        answer(
          JSON.stringify(
            errorBody(
              new HostError(
                "permission_denied",
                `host.${name} is not granted to this plugin`
              )
            )
          )
        );
        return deferred.handle;
      }
      calls.push(name);
      run.onCall?.(name);
      if (calls.length > limits.hostCalls) {
        fail(
          new SandboxError(
            "plugin_limit",
            `More than ${limits.hostCalls} host calls in one run`,
            "hostCalls"
          )
        );
        return deferred.handle;
      }
      if (inFlight.size >= limits.concurrentCalls) {
        fail(
          new SandboxError(
            "plugin_limit",
            `More than ${limits.concurrentCalls} host calls at the same time`,
            "concurrentCalls"
          )
        );
        return deferred.handle;
      }
      if (bytes(argsText) > limits.callBytes) {
        fail(
          new SandboxError(
            "plugin_limit",
            `The arguments of host.${name} exceeded ${limits.callBytes} bytes`,
            "callBytes"
          )
        );
        return deferred.handle;
      }
      let args: unknown[] = [];
      try {
        const parsed: unknown = JSON.parse(argsText);
        if (Array.isArray(parsed)) {
          args = parsed;
        }
      } catch {}
      const op = (async () => {
        let json: string;
        try {
          json = reply({ value: (await fn(args, abort.signal)) ?? null }, name);
        } catch (error) {
          json = reply(errorBody(error), name);
        }
        answer(json);
      })().finally(() => {
        inFlight.delete(op);
        wake();
      });
      inFlight.add(op);
      return deferred.handle;
    });
    ctx.setProp(ctx.global, "__tgBridge", bridge);
    bridge.dispose();

    const runner = keep(
      ctx.unwrapResult(
        ctx.evalCode(PRELUDE, "prelude.js", { type: "global", strict: true })
      )
    );

    const drain = () => {
      let jobs = 0;
      while (!failure && rt!.hasPendingJob()) {
        const r = rt!.executePendingJobs(1024);
        if (r.error) {
          const guest = describe(ctx, r.error);
          r.error.dispose();
          if (!failure) {
            fail(guestFailure(guest));
          }
          break;
        }
        jobs += r.value;
        if (jobs > limits.jobsPerDrain) {
          fail(
            new SandboxError(
              "plugin_limit",
              `More than ${limits.jobsPerDrain} promise jobs without a host call`,
              "jobs"
            )
          );
        }
      }
    };
    const throwIfFailed = () => {
      if (failure) {
        throw failure;
      }
    };

    const settle = async (promise: QuickJSHandle): Promise<QuickJSHandle> => {
      for (;;) {
        drain();
        throwIfFailed();
        const state = ctx.getPromiseState(promise);
        if (state.type === "fulfilled") {
          return keep(state.value);
        }
        if (state.type === "rejected") {
          const guest = describe(ctx, state.error);
          state.error.dispose();
          throw guestFailure(guest);
        }
        if (inFlight.size === 0) {
          throw new SandboxError(
            "plugin_error",
            "The command never finished: it waits on a promise nothing will settle"
          );
        }
        await new Promise<void>((resolve) => {
          wake = resolve;
          abort.signal.addEventListener("abort", () => resolve(), {
            once: true,
          });
        });
      }
    };

    const loaded = ctx.evalCode(run.code, run.filename, {
      type: "module",
      strict: true,
    });
    throwIfFailed();
    if (loaded.error) {
      const guest = describe(ctx, loaded.error);
      loaded.error.dispose();
      throw guestFailure(guest);
    }
    const ns = await settle(keep(loaded.value));

    const args = [
      ns,
      keep(ctx.newString(run.command)),
      keep(ctx.newString(JSON.stringify(run.input ?? null))),
      keep(ctx.newString(JSON.stringify(Object.keys(run.api)))),
      keep(ctx.newString(JSON.stringify(run.constants ?? {}))),
    ];
    const called = ctx.callFunction(runner, ctx.undefined, ...args);
    throwIfFailed();
    if (called.error) {
      const guest = describe(ctx, called.error);
      called.error.dispose();
      throw guestFailure(guest);
    }
    const result = await settle(keep(called.value));
    if (ctx.typeof(result) !== "string") {
      throw new SandboxError("plugin_error", "The command did not return JSON");
    }
    const json = ctx.getString(result);
    if (json.length > limits.outputChars) {
      throw new SandboxError(
        "plugin_limit",
        `The command's result is ${json.length} characters; the limit is ${limits.outputChars}`,
        "output"
      );
    }
    throwIfFailed();
    clean = true;
    return { json, calls };
  } catch (error) {
    if (failure) {
      throw failure;
    }
    if (error instanceof RangeError && /call stack/i.test(error.message)) {
      throw new SandboxError(
        "plugin_limit",
        "The plugin exceeded its stack limit",
        "stack"
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
    run.signal?.removeEventListener("abort", onCancel);
    if (!abort.signal.aborted) {
      abort.abort(new SandboxError("cancelled", "The run ended"));
    }
    if (clean) {
      try {
        for (const d of deferreds) {
          if (d.alive) {
            d.dispose();
          }
        }
        for (const h of handles) {
          if (h.alive) {
            h.dispose();
          }
        }
        vm?.dispose();
        rt?.dispose();
      } catch {}
    }
  }
}

function describe(ctx: QuickJSContext, error: QuickJSHandle): Guest {
  try {
    const value = ctx.dump(error) as unknown;
    if (value === null) {
      return { text: "InternalError: out of memory" };
    }
    if (value && typeof value === "object") {
      const e = value as { name?: unknown; message?: unknown; code?: unknown };
      const text = `${typeof e.name === "string" ? `${e.name}: ` : ""}${typeof e.message === "string" ? e.message : JSON.stringify(value)}`;
      return {
        text: text.slice(0, 2000),
        ...(typeof e.code === "string" ? { code: e.code.slice(0, 64) } : {}),
      };
    }
    return { text: String(value).slice(0, 2000) };
  } catch {
    return { text: "unknown error" };
  }
}

interface Guest {
  text: string;
  code?: string;
}

function guestFailure(guest: Guest): SandboxError {
  if (guest.text.startsWith("InternalError: out of memory")) {
    return new SandboxError(
      "plugin_limit",
      "The plugin ran out of its memory limit",
      "memory"
    );
  }
  if (
    /^(RangeError|InternalError): (stack overflow|Maximum call stack)/.test(
      guest.text
    )
  ) {
    return new SandboxError(
      "plugin_limit",
      "The plugin exceeded its stack limit",
      "stack"
    );
  }
  return new SandboxError(
    "plugin_error",
    `The plugin failed: ${guest.text}`,
    undefined,
    guest.code
  );
}
