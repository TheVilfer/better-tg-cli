import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["src/env.ts"],
    globalSetup: ["test/global-setup.ts"],
  },
});
