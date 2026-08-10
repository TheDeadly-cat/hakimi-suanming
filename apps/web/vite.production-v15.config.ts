import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vite";
import { createWebViteConfig } from "./vite.config";
import { PRODUCTION_V15_VITE_RELEASE_DATABASE_DESCRIPTOR } from "./vite-release-config";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Isolated, non-default production-v15 candidate. The dedicated output path
 * prevents candidate builds from emptying or replacing the stable dist/web.
 */
export default mergeConfig(
  createWebViteConfig(PRODUCTION_V15_VITE_RELEASE_DATABASE_DESCRIPTOR),
  defineConfig({
    build: {
      outDir: path.resolve(workspaceRoot, "tmp/release-config-production-v15"),
      emptyOutDir: true
    }
  })
);
