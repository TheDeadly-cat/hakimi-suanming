import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "isolated-drafts/bazi-expert-review-cycle-kernel/src/**/*.test.ts"
    ]
  }
});
