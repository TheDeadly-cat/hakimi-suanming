import { defineConfig, type UserConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

// This round forbids even indirect loading of the protected source. Reject its
// module id before Vite's file loader, and run only the reading-flow suites.
const protectedSource = /(?:^|\/)local-user-data-cleanup(?:\.ts)?(?:[?#].*)?$/u;
function assertAllowed(id: string) {
  const normalized = decodeURI(id).replaceAll("\\", "/").toLowerCase();
  if (protectedSource.test(normalized)) throw new Error("MAIN_ROUTE_PROTECTED_SOURCE_LOAD_DENIED");
}
const base = baseConfig as UserConfig;
export default defineConfig({
  ...base,
  plugins: [{ name: "main-route-protected-source-boundary", enforce: "pre",
    resolveId(id) { assertAllowed(id); return null; },
    load(id) { assertAllowed(id); return null; }
  }, ...(base.plugins ?? [])],
  test: {
    ...base.test,
    projects: undefined,
    include: [
      "apps/web/src/lib/main-route-reading.test.ts",
      "apps/web/src/lib/candidate-main-route.test.ts",
      "apps/web/src/components/candidate-main-route-panel.test.tsx",
      "apps/web/src/lib/reading-navigation-context.test.ts",
      "apps/web/src/lib/local-reading-timeline.test.ts",
      "apps/web/src/components/reading-main-route-card.test.tsx",
      "apps/web/src/components/reading-main-route-workbench.test.tsx",
      "apps/web/src/components/reading-explanation-workbench.test.tsx",
      "apps/web/src/components/chart-reading-workbench.test.tsx",
      "apps/web/src/components/local-reading-container.test.tsx",
      "apps/web/src/components/local-scoped-reading-save.test.tsx",
      "apps/web/src/components/reading-saved-record.test.tsx",
      "apps/web/src/components/reading-saved-scope.test.tsx",
      "apps/web/src/lib/scoped-reading-backup.integration.test.ts",
      "apps/web/src/pages/dashboard-page.test.tsx"
    ]
  }
});
