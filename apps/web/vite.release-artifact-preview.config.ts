import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vite";
import baseConfig from "./vite.config";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Formal Release Evidence preview. This command never builds or empties the
 * artifact directory; it serves the exact dist/web bytes locked by CI.
 */
export default mergeConfig(baseConfig, defineConfig({
  build: {
    outDir: path.resolve(workspaceRoot, "dist/web"),
    emptyOutDir: false
  },
  preview: {
    host: "127.0.0.1",
    port: 4197,
    strictPort: true
  }
}));
