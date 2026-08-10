import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vite";
import { createWebViteConfig } from "./vite.config";
import { PRODUCTION_V13_TO_V16_VITE_RELEASE_DATABASE_DESCRIPTOR } from "./vite-release-config";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Isolated, non-default direct-hop v13 -> v16 candidate. Its dedicated output
 * path prevents this release experiment from replacing stable dist/web or any
 * existing Schema 15 candidate artifact.
 */
export default mergeConfig(
  createWebViteConfig(PRODUCTION_V13_TO_V16_VITE_RELEASE_DATABASE_DESCRIPTOR),
  defineConfig({
    build: {
      outDir: path.resolve(workspaceRoot, "tmp/release-config-production-v13-to-v16"),
      emptyOutDir: true
    }
  })
);
