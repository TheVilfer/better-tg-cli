import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

import {
  fixtures,
  generatedCode,
  generatedData,
} from "./scripts/lint/generated.mjs";

export default defineConfig({
  ...ultracite,
  proseWrap: "preserve",
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    ...generatedCode,
    ...generatedData,
    ...fixtures,
    "skills/**",
  ],
});
