import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The API and DB tests share one real PostgreSQL database, so test files run one at a time to keep one
    // file's rows from affecting another file's counts.
    fileParallelism: false,
    // Seed and process-level tests run scrypt and start child processes; the 5 s default leaves no margin
    // (lesson from the scaffold's Lab 4 review).
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
