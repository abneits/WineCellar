import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files sequentially to avoid deadlocks on TRUNCATE
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30_000,
  },
});
