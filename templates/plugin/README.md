# Better-TG-CLI plugin template

A starting point for a [Better-TG-CLI](https://github.com/TheVilfer/better-tg-cli) plugin: the
manifest, the instructions for the agent, two example commands, mock tests and CI. The plugin
format is described in [docs/plugins.md](https://github.com/TheVilfer/better-tg-cli/blob/main/docs/plugins.md).

| File                       | What it is                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `tg-plugin.json`           | The manifest: permissions, network origins, secrets, settings, commands                  |
| `SKILL.md`                 | What the agent reads: when to run which command, and what to do with the result          |
| `src/plugin.ts`            | The code: `summary` (the user's own messages, page by page) and `define` (HTTP)          |
| `dist/plugin.js`           | The built code the sandbox runs. **Commit it**: an install fetches the files of a commit |
| `dev/fixtures/*.json`      | HTTP answers for `plugin dev` and the tests; nothing reaches the network                 |
| `test/plugin.test.ts`      | Tests on the mock account through the SDK's test host                                    |
| `.github/workflows/ci.yml` | Build, check that `dist/plugin.js` is committed, typecheck, `plugin validate`, tests     |
| `tsconfig.json`            | Typecheck of the plugin code: ES2023 only, no Node or DOM types, as the sandbox runs it  |
| `tsconfig.test.json`       | Typecheck of the tests (Node types)                                                      |

## Start

1. Rename the plugin: `name` in `tg-plugin.json` and in the frontmatter of `SKILL.md` (they must be
   equal), `name` in `package.json`, the author and the licence holder.
2. Replace `api.example.com` with your API, or drop `define`, the `network` permission, `network`
   and `secrets` if the plugin sends nothing out.
3. Write the commands in `src/plugin.ts` and declare each one in `tg-plugin.json` with its
   `effects` and its `input` and `output` schemas.

```bash
npm install
npm run build        # bundles src/plugin.ts into dist/plugin.js (needs Bun: https://bun.sh)
npm run typecheck    # plugin code as ES2023 alone, then the tests
npm test             # runs the commands on the mock account with the fixtures
npm run validate     # telegram plugin validate .
npm run dev          # telegram plugin dev . summary --mock --input '{"limit":20}'
```

`npm run validate` and `npm run dev` need the `telegram` CLI (`npm install -g better-tg-cli`).

## Writing commands

`definePlugin` from `@better-tg/plugin-sdk` types the `host` each command gets; the build inlines
it, so `dist/plugin.js` is one module without imports, as the sandbox requires.

```ts
export const { commands } = definePlugin({
  commands: {
    async summary(input: SummaryInput, host: Host) {
      const page = await host.messages?.mine?.({ limit: input.limit });
      // …
    },
  },
});
```

Only what the manifest's permissions and the command's own `effects` grant exists on `host`, so
check an API before calling it. The sandbox has ECMAScript and `host` only: no `fetch`, `process`,
timers or modules, and `tsconfig.json` types `src/` that way, so using one fails the typecheck. A
command returns plain JSON, which the host checks against its `output` schema.

A host call can fail with `flood_wait` when Telegram asks to slow down. For `messages.mine` the
error carries `partial` (what was read before it) and `cursor` (right after it); `summary` turns
that into a page with `retryAfterSeconds`, so the agent counts it and waits before going on.

## Testing

`runCommand(dir, command, input, { mock: true })` from `@better-tg/plugin-sdk/test` runs the built
`dist/plugin.js` exactly as `telegram plugin dev <dir> <command> --mock` does: the same sandbox,
limits and checks, the built-in mock account, HTTP from `dev/fixtures`. It returns
`{ data, proposals, json }` or throws a `PluginRunError` with the CLI's `code`, `exitCode` and the
error's fields (`body`). A test may also pass `settings`, `secrets` (a value, or `null` for a
secret not set), more `fixtures` and a `target`.

## Installing

```bash
telegram plugin install ./              # from the folder, during development
telegram plugin install github:you/repo # from GitHub, once dist/plugin.js is committed
```

The human confirms every install; secrets are set by the human in their own terminal
(`telegram plugin secret set my-plugin apikey`).
