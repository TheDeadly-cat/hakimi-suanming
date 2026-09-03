import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const configFile = path.join(packageRoot, "vite.browser-preflight.config.mjs");

await build({ configFile });
const server = await preview({
  configFile,
  preview: {
    host: "127.0.0.1",
    port: 4221,
    strictPort: true
  }
});
server.printUrls();
