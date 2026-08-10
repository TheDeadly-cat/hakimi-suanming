import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const previewRoot = path.join(packageRoot, "browser-app");

export default {
  root: previewRoot,
  base: "./",
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-western-rules-preview"),
  build: {
    outDir: path.join(packageRoot, "dist", "browser-app"),
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
