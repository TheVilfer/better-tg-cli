import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Same Node 25+ localStorage shim the CLI loads first
    setupFiles: ['src/env.ts'],
  },
});
