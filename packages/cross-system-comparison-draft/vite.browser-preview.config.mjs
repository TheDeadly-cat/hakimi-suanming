import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(packageRoot, "browser-app");

export default {
  root: appRoot,
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-browser-preview"),
  build: {
    outDir: path.join(packageRoot, "dist", "browser-preview"),
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
