import { parseArgs } from "node:util";

import { buildPlugin } from "./build.js";

const USAGE = `Usage: tg-plugin build [dir] [--entry src/plugin.ts] [--outfile dist/plugin.js]

Bundles a Better-TG-CLI plugin into one ES module without imports (the manifest's main).
Runs under Bun: bunx tg-plugin build`;

/** The `tg-plugin` command line: `build [dir]`. Returns the exit code. */
export async function main(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      entry: { type: "string" },
      outfile: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [cmd, dir = ".", ...rest] = positionals;
  if (values.help || cmd !== "build" || rest.length) {
    console.error(USAGE);
    return values.help ? 0 : 2;
  }
  try {
    const r = await buildPlugin(dir, {
      entry: values.entry,
      outfile: values.outfile,
    });
    console.log(`${r.outfile}  ${r.bytes} bytes`);
    return 0;
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
}
