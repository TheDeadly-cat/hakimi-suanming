import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");

export default defineConfig({
  root: workspaceRoot,
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "react": path.resolve(workspaceRoot, "node_modules/react"),
      "react-dom": path.resolve(workspaceRoot, "node_modules/react-dom"),
      "@hakimi/backup": path.resolve(workspaceRoot, "packages/backup/src/index.ts"),
      "@hakimi/contracts": path.resolve(workspaceRoot, "packages/contracts/src/index.ts"),
      "@hakimi/tzdb-core": path.resolve(workspaceRoot, "packages/tzdb-core/src/index.ts"),
      "@hakimi/integrity": path.resolve(workspaceRoot, "packages/integrity/src/index.ts"),
      "@hakimi/rule-profiles": path.resolve(workspaceRoot, "packages/rule-profiles/src/index.ts"),
      "@hakimi/bazi-core": path.resolve(workspaceRoot, "packages/bazi-core/src/index.ts"),
      "@hakimi/gold-standard/calendar-divergence-windows": path.resolve(
        workspaceRoot,
        "packages/gold-standard/src/calendar-divergence-windows.ts"
      ),
      "@hakimi/gold-standard/calendar-divergence-review": path.resolve(
        workspaceRoot,
        "packages/gold-standard/src/calendar-divergence-review.ts"
      ),
      "@hakimi/gold-standard/lunar-conversion": path.resolve(
        workspaceRoot,
        "packages/gold-standard/src/lunar-conversion.ts"
      ),
      "@hakimi/gold-standard/release-gate": path.resolve(
        workspaceRoot,
        "packages/gold-standard/src/release-gate.ts"
      ),
      "@hakimi/gold-standard/p0-03-differential": path.resolve(
        workspaceRoot,
        "packages/gold-standard/src/p0-03-differential.ts"
      ),
      "@hakimi/gold-standard/p0-03-report": path.resolve(
        workspaceRoot,
        "packages/gold-standard/src/p0-03-report.ts"
      ),
      "@hakimi/gold-standard/p0-03-summary": path.resolve(
        workspaceRoot,
        "packages/gold-standard/reports/p0-03-engineering-diagnostic-summary.v1.json"
      ),
      "@hakimi/gold-standard": path.resolve(workspaceRoot, "packages/gold-standard/src/index.ts"),
      "@hakimi/case-import": path.resolve(workspaceRoot, "packages/case-import/src/index.ts"),
      "@hakimi/luck-core": path.resolve(workspaceRoot, "packages/luck-core/src/index.ts"),
      "@hakimi/knowledge-core": path.resolve(workspaceRoot, "packages/knowledge-core/src/index.ts"),
      "@hakimi/relations-core": path.resolve(workspaceRoot, "packages/relations-core/src/index.ts"),
      "@hakimi/revision-replay": path.resolve(workspaceRoot, "packages/revision-replay/src/index.ts"),
      "@hakimi/time-core": path.resolve(workspaceRoot, "packages/time-core/src/index.ts"),
      "@hakimi/transit-core": path.resolve(workspaceRoot, "packages/transit-core/src/index.ts"),
      "@hakimi/storage": path.resolve(workspaceRoot, "packages/storage/src/index.ts"),
      "@hakimi/research-export": path.resolve(workspaceRoot, "packages/research-export/src/index.ts"),
      "@hakimi/rule-packs": path.resolve(workspaceRoot, "packages/rule-packs/src/index.ts"),
      "@hakimi/platform": path.resolve(workspaceRoot, "packages/platform/src/index.ts"),
      "@hakimi/research-query/transit-review": path.resolve(
        workspaceRoot,
        "packages/research-query/src/transit-review.ts"
      ),
      "@hakimi/research-query": path.resolve(workspaceRoot, "packages/research-query/src/index.ts")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(appRoot, "src/test/setup.ts")],
    include: ["packages/**/*.test.ts", "apps/web/src/**/*.test.{ts,tsx}"],
    coverage: { reporter: ["text", "html"] }
  }
});
