import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["isolated-drafts/bazi-expert-formal-intake-successor/src/**/*.test.ts"],
    testTimeout: 15_000
  }
});
