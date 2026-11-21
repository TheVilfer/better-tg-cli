# @better-tg/plugin-sdk

Write, build and test [Better-TG-CLI](https://github.com/TheVilfer/better-tg-cli) plugins. The
plugin format is [docs/plugins.md](https://github.com/TheVilfer/better-tg-cli/blob/main/docs/plugins.md);
a ready project to start from is the template (`templates/plugin` in the Better-TG-CLI repository).

| Import                        | What                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `@better-tg/plugin-sdk`       | `definePlugin()`, `defineCommand()`, the types of `host` and of the manifest, `SPEC_VERSION` |
| `@better-tg/plugin-sdk/build` | `buildPlugin(dir, {entry, outfile})`: the bundle the `tg-plugin build` command makes         |
| `@better-tg/plugin-sdk/test`  | `runCommand()`, `validatePlugin()`, `PluginRunError`, `CLI_VERSION`: the test host           |

## Write

```ts
import { definePlugin } from "@better-tg/plugin-sdk";
import type { Host } from "@better-tg/plugin-sdk";

export const { commands } = definePlugin({
  commands: {
    async collect(input: { limit: number; cursor?: string }, host: Host) {
      const page = await host.messages?.mine?.(input);
      return page ?? { messages: [], count: 0, cursor: null, done: true };
    },
  },
});
```

`Host` has every API of docs/plugins.md §5 (`me`, `messages`, `chats`, `target`, `storage`,
`settings`, `http`, `actions`, `log`), each optional: only what the manifest's permissions and the
command's effects grant exists at run time. `Manifest` and its parts are generated from the
manifest's JSON Schema.

## Build

```bash
bunx tg-plugin build [dir] [--entry src/plugin.ts] [--outfile dist/plugin.js]
```

It bundles the entry and everything it imports into one ES module without imports, written to the
manifest's `main`. A Node or Bun built-in is never polyfilled: the build fails, because the sandbox
has no modules. The syntax and strings are kept as written (QuickJS runs ES2023), and the output is
the same on every machine for the same Bun version, so CI can check that the committed file matches
the source. The build runs under [Bun](https://bun.sh).

## Test

```ts
import { runCommand } from "@better-tg/plugin-sdk/test";

const r = await runCommand(".", "collect", { limit: 10 }, { mock: true });
r.data; // what the command returned, null fields kept
r.proposals; // what the host built from host.actions.propose
r.json; // the exact line `telegram plugin dev . collect --mock` prints
```

The test host is the CLI's own `plugin dev --mock` path, bundled: the same manifest and folder
checks as `plugin validate`, the same input and output schema checks, the same QuickJS sandbox and
limits, the built-in mock account, cursors in memory and HTTP from the folder's
`dev/fixtures/*.json`. A failure throws `PluginRunError` with the CLI's `code` (`plugin_error`,
`plugin_limit` with `body.limit`, `invalid_argument` with `body.issues`, `secret_missing` with
`body.command`, …), its `exitCode` and `json()`, the line `--json` prints. Options:

- `mock: true` (required);
- `fixtures`: more HTTP fixtures in the `dev/fixtures` format, matched first;
- `settings`: stored settings, checked as `plugin settings set` checks them;
- `secrets`: values instead of the `dev-secret-<name>` placeholders, or `null` for a secret not set;
- `target` and `thread`: as `--target` and `--thread`;
- `log`: gets each `host.log` line.

`CLI_VERSION` is the Better-TG-CLI version whose checks the SDK carries; `engines.better-tg-cli` is
matched against it.
