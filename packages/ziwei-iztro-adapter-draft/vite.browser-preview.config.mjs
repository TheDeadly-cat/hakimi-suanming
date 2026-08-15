import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const previewRoot = path.join(packageRoot, "browser-preview");
const browserWorkerModule = path.normalize(path.join(packageRoot, "src", "browser-preview", "browser-worker.ts"));
const browserClientModule = path.normalize(path.join(packageRoot, "src", "browser-preview", "browser-client.ts"));
const generatedSnapshotPlaceholder = path.normalize(path.join(packageRoot, "src", "browser-preview", "generated-rule-snapshot.ts"));
const generatedSourceIdentityPlaceholder = path.normalize(
  path.join(packageRoot, "src", "browser-preview", "generated-browser-source-identity.ts")
);
const generatedSnapshotSpecifier = "./generated-rule-snapshot.ts";
const generatedSourceIdentitySpecifier = "./generated-browser-source-identity.ts";
const generatedSnapshotModule = "\0hakimi:ziwei-browser-preview-rule-snapshot";
const generatedSourceIdentityModule = "\0hakimi:ziwei-browser-preview-source-identity";
const browserSourcePaths = Object.freeze([
  "src/browser-preview/browser-artifact.ts",
  "src/browser-preview/browser-client.ts",
  "src/browser-preview/browser-protocol.ts",
  "src/browser-preview/browser-worker.ts",
  "src/browser-preview/display-projection.ts",
  "src/browser-preview/major-star-content.ts",
  "src/browser-preview/major-star-palace-content.ts",
  "src/browser-preview/core-minor-star-content.ts",
  "src/browser-preview/core-minor-star-sanfang-review.ts",
  "src/browser-preview/core-minor-star-sanfang-review-feedback.ts",
  "src/browser-preview/natal-transformation-content.ts",
  "src/browser-preview/natal-transformation-palace-content.ts",
  "src/browser-preview/natal-transformation-palace-review-feedback.ts",
  "src/browser-preview/major-star-combination-review.ts",
  "src/browser-preview/major-star-synthesis-review.ts",
  "src/browser-preview/palace-first-synthesis-review.ts",
  "src/browser-preview/natal-transformation-review.ts",
  "src/browser-preview/palace-four-part-synthesis-content.ts",
  "src/browser-preview/main-response-gate.ts",
  "src/browser-preview/main.ts",
  "src/contract-bridge.ts",
  "src/iztro-2.5.8-lock-closure.json"
]);
let generatedSnapshotSource;
let generatedSourceIdentitySource;

const portableId = (value) => value
  .split("?", 1)[0]
  .replace(/^\/@fs\//u, "")
  .replace(/^\/(?=[A-Za-z]:\/)/u, "")
  .replaceAll("\\", "/")
  .toLowerCase();

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function isolatedRuleSnapshotPlugin() {
  return {
    name: "hakimi-ziwei-isolated-rule-snapshot",
    enforce: "pre",
    resolveId(id, importer) {
      if (!importer || portableId(importer) !== portableId(browserWorkerModule)) return null;
      return id === generatedSnapshotSpecifier || portableId(id) === portableId(generatedSnapshotPlaceholder)
        ? generatedSnapshotModule
        : null;
    },
    load(id) {
      if (id !== generatedSnapshotModule) return null;
      generatedSnapshotSource ??= execFileSync(
        process.execPath,
        [path.join(previewRoot, "emit-rule-snapshot.mjs")],
        {
          cwd: packageRoot,
          encoding: "utf8",
          maxBuffer: 8 * 1024 * 1024,
          windowsHide: true
        }
      ).trim();
      JSON.parse(generatedSnapshotSource);
      return `export default ${generatedSnapshotSource};`;
    }
  };
}

function isolatedBrowserSourceIdentityPlugin() {
  return {
    name: "hakimi-ziwei-isolated-browser-source-identity",
    enforce: "pre",
    resolveId(id, importer) {
      if (!importer || ![browserWorkerModule, browserClientModule].some(
        (allowedImporter) => portableId(importer) === portableId(allowedImporter)
      )) return null;
      return id === generatedSourceIdentitySpecifier
        || portableId(id) === portableId(generatedSourceIdentityPlaceholder)
        ? generatedSourceIdentityModule
        : null;
    },
    load(id) {
      if (id !== generatedSourceIdentityModule) return null;
      if (!generatedSourceIdentitySource) {
        const files = browserSourcePaths.map((relativePath) => ({
          path: relativePath,
          sha256: sha256(readFileSync(path.join(packageRoot, ...relativePath.split("/"))))
        }));
        const identityVersion = "ziwei-browser-source-graph/0.1-draft";
        const digestAlgorithm = "sha256-source-graph-v1";
        const browserSourceGraphSha256 = sha256(JSON.stringify({
          digestAlgorithm,
          files,
          identityVersion
        }));
        const browserWorkerSourceSha256 = files.find(
          (entry) => entry.path === "src/browser-preview/browser-worker.ts"
        )?.sha256;
        if (!browserWorkerSourceSha256) throw new Error("Browser Worker source is absent from the fixed source graph");
        generatedSourceIdentitySource = JSON.stringify({
          identityVersion,
          digestAlgorithm,
          files,
          browserSourceGraphSha256,
          browserWorkerSourceSha256
        });
      }
      return `export default ${generatedSourceIdentitySource};`;
    }
  };
}

export default {
  root: previewRoot,
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-browser-preview"),
  plugins: [isolatedRuleSnapshotPlugin(), isolatedBrowserSourceIdentityPlugin()],
  worker: {
    plugins: () => [isolatedRuleSnapshotPlugin(), isolatedBrowserSourceIdentityPlugin()]
  },
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
