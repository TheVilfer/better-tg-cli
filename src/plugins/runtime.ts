/**
 * The plugin sandbox engine: QuickJS compiled to WebAssembly (quickjs-emscripten, the single-file
 * variant with the WASM inlined, so the npm bundle, the Bun binaries and the .mcpb worker carry it
 * without a separate file). docs/plugins.md §4.
 *
 * Every run gets a WASM module, runtime and context of its own, and all three are dropped after it:
 * nothing survives between runs but what the host stores. Values cross the boundary only as JSON
 * strings (one native function, hidden in a closure by the prelude), so the guest never holds a
 * host object and the host never trusts a guest value it did not parse itself.
 *
 * Guest promises: a host call returns a guest promise (newPromise). The job queue is drained right
 * after the command is called and after every host operation settles, until the command's promise
 * settles; with no host operation in flight and the promise still pending, it never will
 * (`plugin_error`), so `await 0` before any host call cannot hang and a never-resolving promise
 * cannot either. One deadline covers code and host waits; cancelling interrupts the engine, aborts
 * the host operations in flight and turns later results away.
 */
import { newQuickJSWASMModuleFromVariant, newVariant, type QuickJSContext, type QuickJSDeferredPromise, type QuickJSHandle, type QuickJSRuntime } from 'quickjs-emscripten-core';
import variant from '@jitl/quickjs-singlefile-mjs-release-sync';
import { CliError } from '../errors.js';
import { maskForModel } from '../mcp-output.js';
import { DEFAULT_LIMITS, HostError, SandboxError, type HostFunction, type SandboxLimits } from './sandbox-types.js';

export { DEFAULT_LIMITS, HostError, SandboxError, type HostFunction, type SandboxLimits };

export interface SandboxRun {
  /** The plugin's `main`: one ES module without imports, exporting `commands`. */
  code: string;
  filename: string;
  command: string;
  input: unknown;
  /** Granted host API by dotted name (`messages.mine`); only these exist in the guest's `host`. */
  api: Record<string, HostFunction>;
  /** Plain values put on `host` as they are (frozen), e.g. `{ dev: true }`. */
  constants?: Record<string, unknown>;
  limits?: Partial<SandboxLimits>;
  signal?: AbortSignal;
  /** Told the name of each host call as it is made (the audit wants them for a failed run too). */
  onCall?: (name: string) => void;
  /**
   * Polled by the engine's interrupt handler: a cancel that cannot arrive as an event while plugin
   * code keeps the thread busy (the MCP server's flag in shared memory, for a worker thread).
   */
  cancelled?: () => boolean;
}

export interface SandboxResult {
  /** The command's result as JSON text (what it returned, serialized in the guest). */
  json: string;
  /** Names of the host API calls made, in call order (for the audit). */
  calls: string[];
}

/**
 * Runs in the fresh context before the plugin: takes the native bridge off the global object, keeps
 * its own copies of what it needs (the plugin cannot swap them afterwards) and evaluates to the
 * runner the host calls. `host` is rebuilt for each call from the granted names, deeply frozen.
 */
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

const bytes = (text: string) => Buffer.byteLength(text, 'utf8');

/** One sandbox run: fresh WASM module, runtime and context, all dropped afterwards. */
export async function runInSandbox(run: SandboxRun): Promise<SandboxResult> {
  const limits = { ...DEFAULT_LIMITS, ...run.limits };
  const started = Date.now();
  const deadline = started + limits.timeoutMs;
  const abort = new AbortController();
  /** Why the run must stop now (a limit, cancellation, the deadline); checked by the interrupt handler. */
  let failure: SandboxError | undefined;
  const fail = (error: SandboxError) => {
    failure ??= error;
    abort.abort(failure);
  };
  const onCancel = () => fail(new SandboxError('cancelled', 'The run was cancelled'));
  if (run.signal?.aborted) onCancel();
  run.signal?.addEventListener('abort', onCancel, { once: true });
  const timer = setTimeout(() => fail(new SandboxError('plugin_limit', `The run took longer than ${limits.timeoutMs / 1000} s`, 'timeout')), Math.max(0, deadline - Date.now()));

  const calls: string[] = [];
  /** Host operations started and not yet handed back. */
  const inFlight = new Set<Promise<void>>();
  const deferreds = new Set<QuickJSDeferredPromise>();
  /** Wakes the drive loop when a host operation finishes. */
  let wake: () => void = () => {};

  let rt: QuickJSRuntime | undefined;
  let vm: QuickJSContext | undefined;
  const handles: QuickJSHandle[] = [];
  const keep = (h: QuickJSHandle) => (handles.push(h), h);
  let clean = false;
  try {
    // Nothing the engine prints (an abort message) reaches the command's stdout or stderr
    const quickjs = await newQuickJSWASMModuleFromVariant(newVariant(variant, { emscriptenModule: { print: () => {}, printErr: () => {} } as object }));
    rt = quickjs.newRuntime();
    rt.setMemoryLimit(limits.memoryBytes);
    rt.setMaxStackSize(limits.stackBytes);
    rt.setInterruptHandler(() => {
      if (!failure && run.cancelled?.()) onCancel();
      if (!failure && Date.now() > deadline) fail(new SandboxError('plugin_limit', `The run took longer than ${limits.timeoutMs / 1000} s`, 'timeout'));
      return !!failure;
    });
    const ctx = (vm = rt.newContext());

    /** The reply a host call settles with, `{value}` or `{error}` as JSON, at most callBytes. */
    const reply = (body: { value: unknown } | { error: unknown }, name: string): string => {
      const json = JSON.stringify(body);
      if (bytes(json) > limits.callBytes) {
        fail(new SandboxError('plugin_limit', `The result of host.${name} exceeded ${limits.callBytes} bytes`, 'callBytes'));
      }
      return json;
    };
    const errorBody = (e: unknown) => {
      if (e instanceof HostError) return { error: { ...e.extra, code: e.code, message: maskForModel(e.message, 'echo') } };
      const code = e instanceof CliError ? e.code : 'host_error';
      return { error: { code, message: maskForModel(e instanceof Error ? e.message : String(e), 'echo') } };
    };

    const bridge = ctx.newFunction('bridge', (nameH, argsH) => {
      const name = ctx.typeof(nameH) === 'string' ? ctx.getString(nameH) : '';
      const argsText = ctx.typeof(argsH) === 'string' ? ctx.getString(argsH) : '';
      const deferred = ctx.newPromise();
      deferreds.add(deferred);
      const answer = (json: string) => {
        // A late result after a limit, a cancel or the deadline is dropped, never handed in
        if (failure || !deferred.alive) return;
        const h = ctx.newString(json);
        deferred.resolve(h);
        h.dispose();
      };
      if (failure) return deferred.handle;
      const fn = Object.hasOwn(run.api, name) ? run.api[name] : undefined;
      if (!fn) {
        answer(JSON.stringify(errorBody(new HostError('permission_denied', `host.${name} is not granted to this plugin`))));
        return deferred.handle;
      }
      calls.push(name);
      run.onCall?.(name);
      if (calls.length > limits.hostCalls) {
        fail(new SandboxError('plugin_limit', `More than ${limits.hostCalls} host calls in one run`, 'hostCalls'));
        return deferred.handle;
      }
      if (inFlight.size >= limits.concurrentCalls) {
        fail(new SandboxError('plugin_limit', `More than ${limits.concurrentCalls} host calls at the same time`, 'concurrentCalls'));
        return deferred.handle;
      }
      if (bytes(argsText) > limits.callBytes) {
        fail(new SandboxError('plugin_limit', `The arguments of host.${name} exceeded ${limits.callBytes} bytes`, 'callBytes'));
        return deferred.handle;
      }
      let args: unknown[] = [];
      try {
        const parsed: unknown = JSON.parse(argsText);
        if (Array.isArray(parsed)) args = parsed;
      } catch {
        // the prelude always sends an array; anything else is no arguments
      }
      const op = (async () => {
        let json: string;
        try {
          json = reply({ value: (await fn(args, abort.signal)) ?? null }, name);
        } catch (e) {
          json = reply(errorBody(e), name);
        }
        answer(json);
      })().finally(() => {
        inFlight.delete(op);
        wake();
      });
      inFlight.add(op);
      return deferred.handle;
    });
    ctx.setProp(ctx.global, '__tgBridge', bridge);
    bridge.dispose();

    const runner = keep(ctx.unwrapResult(ctx.evalCode(PRELUDE, 'prelude.js', { type: 'global', strict: true })));

    /** Run queued jobs until none is left (or a limit / the deadline stops the engine). */
    const drain = () => {
      let jobs = 0;
      while (!failure && rt!.hasPendingJob()) {
        const r = rt!.executePendingJobs(1024);
        if (r.error) {
          const guest = describe(ctx, r.error);
          r.error.dispose();
          if (!failure) fail(guestFailure(guest));
          break;
        }
        jobs += r.value;
        if (jobs > limits.jobsPerDrain) fail(new SandboxError('plugin_limit', `More than ${limits.jobsPerDrain} promise jobs without a host call`, 'jobs'));
      }
    };
    const throwIfFailed = () => {
      if (failure) throw failure;
    };

    /** Wait until `promise` settles, driving jobs and host operations. */
    const settle = async (promise: QuickJSHandle): Promise<QuickJSHandle> => {
      for (;;) {
        drain();
        throwIfFailed();
        const state = ctx.getPromiseState(promise);
        if (state.type === 'fulfilled') return keep(state.value);
        if (state.type === 'rejected') {
          const guest = describe(ctx, state.error);
          state.error.dispose();
          throw guestFailure(guest);
        }
        if (inFlight.size === 0) throw new SandboxError('plugin_error', 'The command never finished: it waits on a promise nothing will settle');
        await new Promise<void>(resolve => {
          wake = resolve;
          abort.signal.addEventListener('abort', () => resolve(), { once: true });
        });
      }
    };

    const loaded = ctx.evalCode(run.code, run.filename, { type: 'module', strict: true });
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
    if (ctx.typeof(result) !== 'string') throw new SandboxError('plugin_error', 'The command did not return JSON');
    const json = ctx.getString(result);
    if (json.length > limits.outputChars) {
      throw new SandboxError('plugin_limit', `The command's result is ${json.length} characters; the limit is ${limits.outputChars}`, 'output');
    }
    throwIfFailed();
    clean = true;
    return { json, calls };
  } catch (e) {
    if (failure) throw failure;
    // QuickJS recursion also runs on the host's own stack: if that ends first, it is the same limit
    if (e instanceof RangeError && /call stack/i.test(e.message)) throw new SandboxError('plugin_limit', 'The plugin exceeded its stack limit', 'stack');
    throw e;
  } finally {
    clearTimeout(timer);
    run.signal?.removeEventListener('abort', onCancel);
    if (!abort.signal.aborted) abort.abort(new SandboxError('cancelled', 'The run ended'));
    // After a clean run everything is freed. A run stopped mid-job (a limit, a cancel) can leave
    // objects QuickJS still counts, and freeing them would abort the engine: the WASM module, its
    // memory with it, is dropped with the last reference instead.
    if (clean) {
      try {
        for (const d of deferreds) if (d.alive) d.dispose();
        for (const h of handles) if (h.alive) h.dispose();
        vm?.dispose();
        rt?.dispose();
      } catch {
        // the module is dropped anyway
      }
    }
  }
}

/** A guest error as text (without the host's stack frames), and its string `code` if it has one. */
function describe(ctx: QuickJSContext, error: QuickJSHandle): Guest {
  try {
    const value = ctx.dump(error) as unknown;
    // QuickJS throws null when it cannot even allocate the "out of memory" error
    if (value === null) return { text: 'InternalError: out of memory' };
    if (value && typeof value === 'object') {
      const e = value as { name?: unknown; message?: unknown; code?: unknown };
      const text = `${typeof e.name === 'string' ? e.name + ': ' : ''}${typeof e.message === 'string' ? e.message : JSON.stringify(value)}`;
      return { text: text.slice(0, 2000), ...(typeof e.code === 'string' ? { code: e.code.slice(0, 64) } : {}) };
    }
    return { text: String(value).slice(0, 2000) };
  } catch {
    return { text: 'unknown error' };
  }
}

interface Guest { text: string; code?: string }

/** A guest exception: out of memory and stack overflow are limits, anything else the plugin's error. */
function guestFailure(guest: Guest): SandboxError {
  if (/^InternalError: out of memory/.test(guest.text)) return new SandboxError('plugin_limit', 'The plugin ran out of its memory limit', 'memory');
  if (/^(RangeError|InternalError): (stack overflow|Maximum call stack)/.test(guest.text)) return new SandboxError('plugin_limit', 'The plugin exceeded its stack limit', 'stack');
  return new SandboxError('plugin_error', `The plugin failed: ${guest.text}`, undefined, guest.code);
}
