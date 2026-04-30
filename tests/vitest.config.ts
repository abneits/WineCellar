import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files sequentially to avoid TRUNCATE deadlocks on shared DB
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 15_000,
    // Explicit include so vitest finds files when a directory is passed as arg
    include: ["api/**/*.test.ts"],
  },
});
