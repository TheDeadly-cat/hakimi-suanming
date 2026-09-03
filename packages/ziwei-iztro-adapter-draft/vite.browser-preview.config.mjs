import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(packageRoot, "..", "..");
const previewRoot = path.join(packageRoot, "browser-preview");
const adapterConfigPath = fileURLToPath(import.meta.url);
const adapterConfigRelativePath = "packages/ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs";
const adapterHtmlRelativePath = "packages/ziwei-iztro-adapter-draft/browser-preview/index.html";
const workspaceConfigRelativePath = "packages/ziwei-workspace-artifact-draft/vite.browser-app.config.mjs";
const workspaceHtmlRelativePath = "packages/ziwei-workspace-artifact-draft/browser-app/index.html";
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
const iztroPackageJsonPath = fileURLToPath(import.meta.resolve("iztro/package.json"));
const iztroEntryPath = fileURLToPath(import.meta.resolve("iztro"));
const installedIztroLicensePath = path.join(path.dirname(iztroPackageJsonPath), "LICENSE");
const iztroLockClosurePath = path.join(packageRoot, "src", "iztro-2.5.8-lock-closure.json");
const iztroLicensePath = path.join(packageRoot, "licenses", "iztro-2.5.8-LICENSE.txt");
const iztroLicenseAssetFile = "licenses/iztro-2.5.8-LICENSE.txt";
const buildInputAttestationAssetFile = "build-attestations/ziwei-iztro-license-inputs.v1.json";
const lockedIztroNoticeInputs = Object.freeze([
  Object.freeze({
    role: "installed_package_manifest_endpoint",
    relativePath: "node_modules/iztro/package.json",
    label: "iztro package manifest",
    path: iztroPackageJsonPath,
    bytes: 2255,
    sha256: "a5a85df951d28965caa7bf9a9fe6b44e3df676c8dd938573061257cff681a20f"
  }),
  Object.freeze({
    role: "installed_commonjs_entry_endpoint",
    relativePath: "node_modules/iztro/lib/index.js",
    label: "iztro CommonJS entry",
    path: iztroEntryPath,
    bytes: 1368,
    sha256: "10ab83d0ebfe3e5b335589767f4851034e1cf029c7ca7cbc231c22b562c7e4fb"
  }),
  Object.freeze({
    role: "installed_top_level_license_endpoint",
    relativePath: "node_modules/iztro/LICENSE",
    label: "installed iztro top-level license",
    path: installedIztroLicensePath,
    bytes: 1073,
    sha256: "e6c7b6e313cbda3135b41bccc66c98be132cb8319d0d465903d17e669e748b36"
  }),
  Object.freeze({
    role: "package_lock_closure",
    relativePath: "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json",
    label: "iztro package-lock closure",
    path: iztroLockClosurePath,
    bytes: 3846,
    sha256: "c372bf14630eee36fa01ac654b8939622900a3e469a8f69db7bd2c7baa1d2724"
  }),
  Object.freeze({
    role: "controlled_top_level_license_copy",
    relativePath: "packages/ziwei-iztro-adapter-draft/licenses/iztro-2.5.8-LICENSE.txt",
    label: "iztro top-level license",
    path: iztroLicensePath,
    bytes: 1073,
    sha256: "e6c7b6e313cbda3135b41bccc66c98be132cb8319d0d465903d17e669e748b36"
  })
]);
const browserSourcePaths = Object.freeze([
  "src/browser-preview/browser-artifact.ts",
  "src/browser-preview/browser-client.ts",
  "src/browser-preview/browser-protocol.ts",
  "src/browser-preview/browser-worker.ts",
  "src/browser-preview/display-projection.ts",
  "src/browser-preview/high-risk-expression-egress-policy.ts",
  "src/browser-preview/high-risk-expression-egress-view.ts",
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

function statIdentity(stat) {
  return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    size: stat.size,
    mtimeNs: stat.mtimeNs,
    ctimeNs: stat.ctimeNs
  };
}

function sameStatIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function readHeldBuildInput(filePath, label) {
  const before = lstatSync(filePath, { bigint: true });
  const beforeRealPath = realpathSync.native(filePath);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) {
    throw new Error(`Ziwei isolated build notice input must be a single-link regular file: ${label}`);
  }
  let handle;
  try {
    handle = openSync(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(handle, { bigint: true });
    if (!opened.isFile() || !sameStatIdentity(statIdentity(before), statIdentity(opened))) {
      throw new Error(`Ziwei isolated build notice input changed before held open: ${label}`);
    }
    const bytes = readFileSync(handle);
    const afterHandle = fstatSync(handle, { bigint: true });
    const afterPath = lstatSync(filePath, { bigint: true });
    if (!sameStatIdentity(statIdentity(opened), statIdentity(afterHandle))
      || !sameStatIdentity(statIdentity(opened), statIdentity(afterPath))
      || beforeRealPath !== realpathSync.native(filePath)) {
      throw new Error(`Ziwei isolated build notice input changed during held read: ${label}`);
    }
    return Buffer.from(bytes);
  } finally {
    if (handle !== undefined) closeSync(handle);
  }
}

function verifyLockedIztroNoticeInputs() {
  let heldLicenseBytes;
  const observations = [];
  for (const expected of lockedIztroNoticeInputs) {
    const bytes = readHeldBuildInput(expected.path, expected.label);
    if (bytes.byteLength !== expected.bytes || sha256(bytes) !== expected.sha256) {
      throw new Error(`Ziwei isolated build notice input drifted: ${expected.label}`);
    }
    if (expected.path === iztroLicensePath) heldLicenseBytes = Buffer.from(bytes);
    observations.push({
      role: expected.role,
      path: expected.relativePath,
      bytes: bytes.byteLength,
      sha256: expected.sha256
    });
  }
  if (!heldLicenseBytes) throw new Error("iztro top-level license was not part of locked notice inputs");
  return { heldLicenseBytes, observations };
}

function fixedSurface(surfaceId) {
  if (surfaceId === "browser-preview") {
    return {
      surfaceId,
      configPath: adapterConfigPath,
      configRelativePath: adapterConfigRelativePath,
      htmlPath: path.join(workspaceRoot, ...adapterHtmlRelativePath.split("/")),
      htmlRelativePath: adapterHtmlRelativePath,
      sharedAdapterConfig: false
    };
  }
  if (surfaceId === "browser-workspace") {
    return {
      surfaceId,
      configPath: path.join(workspaceRoot, ...workspaceConfigRelativePath.split("/")),
      configRelativePath: workspaceConfigRelativePath,
      htmlPath: path.join(workspaceRoot, ...workspaceHtmlRelativePath.split("/")),
      htmlRelativePath: workspaceHtmlRelativePath,
      sharedAdapterConfig: true
    };
  }
  throw new Error(`Unsupported Ziwei license notice surface: ${String(surfaceId)}`);
}

export function createIztroLicenseNoticePlugin(surfaceId) {
  let heldLicenseBytes;
  let heldAttestationBytes;
  return {
    name: "hakimi-ziwei-iztro-top-level-license",
    enforce: "pre",
    buildStart() {
      const surface = fixedSurface(surfaceId);
      const locked = verifyLockedIztroNoticeInputs();
      heldLicenseBytes = locked.heldLicenseBytes;
      const surfaceInputs = [
        {
          role: "surface_build_config",
          path: surface.configRelativePath,
          bytes: readHeldBuildInput(surface.configPath, `${surfaceId} build config`)
        },
        ...(surface.sharedAdapterConfig ? [{
          role: "shared_adapter_build_config",
          path: adapterConfigRelativePath,
          bytes: readHeldBuildInput(adapterConfigPath, "shared adapter build config")
        }] : []),
        {
          role: "surface_source_html",
          path: surface.htmlRelativePath,
          bytes: readHeldBuildInput(surface.htmlPath, `${surfaceId} source HTML`)
        }
      ].map((input) => ({
        role: input.role,
        path: input.path,
        bytes: input.bytes.byteLength,
        sha256: sha256(input.bytes)
      }));
      const attestation = {
        schemaVersion: "ziwei-iztro-build-input-attestation/1",
        surfaceId,
        producerPlugin: "hakimi-ziwei-iztro-top-level-license",
        inputs: [...surfaceInputs, ...locked.observations]
      };
      heldAttestationBytes = Buffer.from(`${JSON.stringify(attestation, null, 2)}\n`, "utf8");
    },
    generateBundle() {
      if (!heldLicenseBytes || !heldAttestationBytes) {
        throw new Error("iztro license and build-input attestation bytes were not held by buildStart");
      }
      this.emitFile({
        type: "asset",
        fileName: iztroLicenseAssetFile,
        source: heldLicenseBytes
      });
      this.emitFile({
        type: "asset",
        fileName: buildInputAttestationAssetFile,
        source: heldAttestationBytes
      });
    }
  };
}

export function createZiweiBrowserPreviewMainPlugins() {
  return [isolatedRuleSnapshotPlugin(), isolatedBrowserSourceIdentityPlugin()];
}

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
  base: "./",
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-browser-preview"),
  plugins: [createIztroLicenseNoticePlugin("browser-preview"), ...createZiweiBrowserPreviewMainPlugins()],
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
