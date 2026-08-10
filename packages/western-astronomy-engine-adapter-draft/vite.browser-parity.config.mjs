import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const previewRoot = path.join(packageRoot, "browser-parity");
const mainModule = path.normalize(path.join(packageRoot, "src", "browser-parity", "main.ts"));
const generatedReferencePlaceholder = path.normalize(path.join(
  packageRoot,
  "src",
  "browser-parity",
  "generated-node-reference.ts"
));
const generatedReferenceSpecifier = "./generated-node-reference.ts";
const generatedReferenceModule = "\0hakimi:western-browser-node-reference";
const engineEsmPath = fileURLToPath(import.meta.resolve("astronomy-engine"));
const enginePackageJsonPath = path.resolve(path.dirname(engineEsmPath), "..", "package.json");
const sourceLockPath = path.join(packageRoot, "src", "astronomy-engine-2.1.19-source-lock.json");
const deltaTLockPath = path.join(packageRoot, "src", "delta-t-model-lock.json");

const LOCKED_BUILD_INPUTS = Object.freeze([
  Object.freeze({
    path: engineEsmPath,
    bytes: 412025,
    sha256: "068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7"
  }),
  Object.freeze({
    path: enginePackageJsonPath,
    bytes: 1078,
    sha256: "d035702763839ae11f41600cf4b8210005672658dcb19cea4a09591078af4931"
  }),
  Object.freeze({
    path: sourceLockPath,
    bytes: 2547,
    sha256: "a0d929d78cff75aa543e78350aece6a35636c4c081f5620c5a7cc9aaaf400975"
  }),
  Object.freeze({
    path: deltaTLockPath,
    bytes: 1780,
    sha256: "de5cb6ea1dda00ebe230394be38968b93c42b77988ba1d8437a1487fd46265f7"
  })
]);

let generatedReferenceSource;

function portablePath(value) {
  return value
    .split("?", 1)[0]
    .replace(/^\/@fs\//u, "")
    .replace(/^\/(?=[A-Za-z]:\/)/u, "")
    .replaceAll("\\", "/")
    .toLowerCase();
}

function verifyLockedBuildInputs() {
  for (const expected of LOCKED_BUILD_INPUTS) {
    const bytes = readFileSync(expected.path);
    const actualDigest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== expected.bytes || actualDigest !== expected.sha256) {
      throw new Error(`Western browser parity build input drifted: ${expected.path}`);
    }
  }
}

function isolatedNodeReferencePlugin() {
  return {
    name: "hakimi-western-isolated-node-reference",
    enforce: "pre",
    buildStart() {
      verifyLockedBuildInputs();
    },
    resolveId(id, importer) {
      if (!importer || portablePath(importer) !== portablePath(mainModule)) return null;
      return id === generatedReferenceSpecifier || portablePath(id) === portablePath(generatedReferencePlaceholder)
        ? generatedReferenceModule
        : null;
    },
    load(id) {
      if (id !== generatedReferenceModule) return null;
      generatedReferenceSource ??= execFileSync(
        process.execPath,
        [path.join(previewRoot, "emit-node-reference.mjs")],
        {
          cwd: packageRoot,
          encoding: "utf8",
          maxBuffer: 16 * 1024 * 1024,
          windowsHide: true
        }
      ).trim();
      const reference = JSON.parse(generatedReferenceSource);
      if (reference.schemaVersion !== "western-astronomy-node-reference/0.1-draft"
        || reference.seeds?.length !== 5) {
        throw new Error("Fresh Node browser-parity reference is incomplete");
      }
      return `export default ${generatedReferenceSource};`;
    }
  };
}

export default {
  root: previewRoot,
  base: "./",
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-browser-parity"),
  plugins: [isolatedNodeReferencePlugin()],
  build: {
    outDir: path.join(packageRoot, "dist", "browser-parity"),
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
