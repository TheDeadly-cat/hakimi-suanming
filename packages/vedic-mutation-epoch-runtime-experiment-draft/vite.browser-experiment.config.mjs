import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default {
  root: path.join(packageRoot, "browser-app"),
  base: "./",
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-vedic-mutation-epoch-experiment"),
  build: {
    outDir: path.join(packageRoot, "dist", "browser-experiment"),
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022"
  },
  server: {
    host: "127.0.0.1",
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    strictPort: true
  }
};
