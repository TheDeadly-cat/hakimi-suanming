import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const previewRoot = path.join(packageRoot, "browser-app");
const engineEsmPath = fileURLToPath(import.meta.resolve("astronomy-engine"));
const enginePackageJsonPath = path.resolve(path.dirname(engineEsmPath), "..", "package.json");
const licensePath = path.join(packageRoot, "licenses", "astronomy-engine-2.1.19-LICENSE.txt");
const licenseAssetFile = "licenses/astronomy-engine-2.1.19-LICENSE.txt";

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
    path: licensePath,
    bytes: 1095,
    sha256: "690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023"
  })
]);

function portablePath(value) {
  return value
    .split("?", 1)[0]
    .replace(/^\/@fs\//u, "")
    .replace(/^\/(?=[A-Za-z]:\/)/u, "")
    .replaceAll("\\", "/")
    .toLowerCase();
}

function verifyLockedBuildInputs() {
  let verifiedEngineEsmSource;
  let verifiedLicenseBytes;
  for (const expected of LOCKED_BUILD_INPUTS) {
    const bytes = readFileSync(expected.path);
    const actualDigest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== expected.bytes || actualDigest !== expected.sha256) {
      throw new Error(`Western rules preview build input drifted: ${expected.path}`);
    }
    if (expected.path === engineEsmPath) verifiedEngineEsmSource = Buffer.from(bytes).toString("utf8");
    if (expected.path === licensePath) verifiedLicenseBytes = Buffer.from(bytes);
  }
  if (!verifiedEngineEsmSource) throw new Error("Astronomy Engine ESM source was not part of locked build inputs");
  if (!verifiedLicenseBytes) throw new Error("Astronomy Engine license was not part of locked build inputs");
  return Object.freeze({
    engineEsmSource: verifiedEngineEsmSource,
    licenseBytes: verifiedLicenseBytes
  });
}

function emitAstronomyEngineLicensePlugin() {
  let heldLicenseBytes;
  return {
    name: "hakimi-western-astronomy-engine-license",
    enforce: "pre",
    buildStart() {
      heldLicenseBytes = verifyLockedBuildInputs().licenseBytes;
    },
    generateBundle() {
      if (!heldLicenseBytes) {
        throw new Error("Astronomy Engine license bytes were not held by buildStart");
      }
      this.emitFile({
        type: "asset",
        fileName: licenseAssetFile,
        source: heldLicenseBytes
      });
    }
  };
}


function isolatedHeldAstronomyEnginePlugin() {
  let heldEngineEsmSource;
  let heldEngineSourceServed = false;
  return {
    name: "hakimi-western-held-astronomy-engine-source",
    enforce: "pre",
    buildStart() {
      heldEngineEsmSource = verifyLockedBuildInputs().engineEsmSource;
      heldEngineSourceServed = false;
    },
    resolveId(id) {
      return id === "astronomy-engine" ? engineEsmPath : null;
    },
    load(id) {
      if (portablePath(id) !== portablePath(engineEsmPath)) return null;
      if (!heldEngineEsmSource) throw new Error("Astronomy Engine ESM bytes were not held by buildStart");
      heldEngineSourceServed = true;
      return heldEngineEsmSource;
    },
    generateBundle() {
      if (!heldEngineSourceServed) {
        throw new Error("Held Astronomy Engine source was not consumed by the Worker build");
      }
    }
  };
}

export default {
  root: previewRoot,
  base: "./",
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-western-rules-preview"),
  plugins: [emitAstronomyEngineLicensePlugin()],
  worker: {
    plugins: () => [isolatedHeldAstronomyEnginePlugin()]
  },
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
