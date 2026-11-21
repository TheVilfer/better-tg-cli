import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

import { generatedFiles } from "./scripts/lint/generated.mjs";

export default defineConfig({
  ...ultracite,
  proseWrap: "preserve",
  ignorePatterns: [...ultracite.ignorePatterns, ...generatedFiles, "skills/**"],
});
