import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files sequentially (one at a time) to avoid TRUNCATE deadlocks
    // when multiple files share the same PostgreSQL test database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 15_000,
  },
});
