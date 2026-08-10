import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vite";
import baseConfig from "./vite.config";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * The offline browser gate must not rebuild or serve the shared dist/web
 * preview. It owns both this output directory and port 4197.
 */
export default mergeConfig(baseConfig, defineConfig({
  build: {
    outDir: path.resolve(workspaceRoot, ".vite/playwright-web"),
    emptyOutDir: true
  },
  preview: {
    host: "127.0.0.1",
    port: 4197,
    strictPort: true
  }
}));
