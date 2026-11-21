import type { Command, Host } from "./host.js";

export type * from "./host.js";
export type * from "./generated/manifest.js";
export { SPEC_VERSION } from "./generated/manifest.js";

/** The commands a plugin exports: the host calls `commands[name](input, host)`. */
export type Commands = Record<string, (input: never, host: Host) => unknown>;

/** A plugin module: its commands, exported as `commands` from the built `dist/plugin.js`. */
export interface Plugin<C extends Commands = Commands> {
  commands: C;
}

/**
 * Declares a plugin and types its commands' `host`. It returns its argument unchanged, so the
 * build keeps nothing of the SDK but this function: `export const { commands } = definePlugin({ commands: { … } })`.
 */
export function definePlugin<const C extends Commands>(
  plugin: Plugin<C>
): Plugin<C> {
  return plugin;
}

/** Types one command on its own (input and output), for commands kept outside `definePlugin`. */
export function defineCommand<I, O>(command: Command<I, O>): Command<I, O> {
  return command;
}
