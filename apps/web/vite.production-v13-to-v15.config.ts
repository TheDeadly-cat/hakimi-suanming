import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vite";
import { createWebViteConfig } from "./vite.config";
import { PRODUCTION_V13_TO_V15_VITE_RELEASE_DATABASE_DESCRIPTOR } from "./vite-release-config";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Isolated, non-default direct-hop v13 -> v15 candidate. Its dedicated output
 * path prevents this release experiment from replacing the stable dist/web or
 * the adjacent v14 -> v15 candidate artifact.
 */
export default mergeConfig(
  createWebViteConfig(PRODUCTION_V13_TO_V15_VITE_RELEASE_DATABASE_DESCRIPTOR),
  defineConfig({
    build: {
      outDir: path.resolve(workspaceRoot, "tmp/release-config-production-v13-to-v15"),
      emptyOutDir: true
    }
  })
);
