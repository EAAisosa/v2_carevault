import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // Don't hit a real DB by default — pure-function and middleware tests
    // mock Prisma. Integration tests opt in via their own describe block.
    pool: "threads",
  },
});
