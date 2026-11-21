import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { CLIENTS, validate } from "../src/clients/data.ts";
import { DOC_PATH, renderCompatibility } from "../src/clients/matrix.ts";

const path = fileURLToPath(new URL(`../${DOC_PATH}`, import.meta.url));

const problems = validate(CLIENTS);
if (problems.length) {
  console.error(
    `src/clients/data.ts has problems:\n${problems.map((p) => `  ${p}`).join("\n")}`
  );
  process.exit(1);
}

const want = renderCompatibility();
if (process.argv.includes("--check")) {
  let have = "";
  try {
    have = readFileSync(path, "utf-8").replaceAll("\r\n", "\n");
  } catch {}
  if (have !== want) {
    console.error(
      `${DOC_PATH} is out of date. Run: bun scripts/compat-matrix.ts`
    );
    process.exit(1);
  }
  console.log(`${DOC_PATH} is up to date.`);
} else {
  writeFileSync(path, want);
  console.log(`Wrote ${DOC_PATH}`);
}
