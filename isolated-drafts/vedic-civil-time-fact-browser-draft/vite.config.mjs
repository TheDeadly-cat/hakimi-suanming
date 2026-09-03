import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(packageRoot, "..", "..");
const browserRoot = path.join(packageRoot, "browser-app");
const tzdbCorePath = path.join(workspaceRoot, "packages", "tzdb-core", "src", "index.ts");
const tzdbResolverPath = path.join(workspaceRoot, "packages", "tzdb-core", "src", "packed-resolver.ts");
const momentPackageRoot = path.dirname(fileURLToPath(import.meta.resolve("moment-timezone/package.json")));
const momentEntryPath = path.join(momentPackageRoot, "index.js");
const momentImplementationPath = path.join(momentPackageRoot, "moment-timezone.js");
const momentPackageJsonPath = path.join(momentPackageRoot, "package.json");
const momentDataPath = path.join(momentPackageRoot, "data", "packed", "latest.json");
const momentLicensePath = path.join(momentPackageRoot, "LICENSE");
const retainedTzdbAdapterPath = path.join(workspaceRoot, "packages", "tzdb-core", "src", "artifacts", "iana-2025b.ts");
const retainedMomentPackageRoot = path.dirname(fileURLToPath(import.meta.resolve("moment-timezone-2025b/package.json")));
const retainedMomentEntryPath = path.join(retainedMomentPackageRoot, "index.js");
const retainedMomentImplementationPath = path.join(retainedMomentPackageRoot, "moment-timezone.js");
const retainedMomentPackageJsonPath = path.join(retainedMomentPackageRoot, "package.json");
const retainedMomentDataPath = path.join(retainedMomentPackageRoot, "data", "packed", "latest.json");
const retainedMomentLicensePath = path.join(retainedMomentPackageRoot, "LICENSE");
const sharedMomentPackageRoot = path.dirname(fileURLToPath(import.meta.resolve("moment/package.json")));
const sharedMomentImplementationPath = path.join(sharedMomentPackageRoot, "moment.js");
const sharedMomentBrowserImplementationPath = path.join(sharedMomentPackageRoot, "dist", "moment.js");
const sharedMomentPackageJsonPath = path.join(sharedMomentPackageRoot, "package.json");
const sharedMomentLicensePath = path.join(sharedMomentPackageRoot, "LICENSE");

const LOCKED_BUILD_INPUTS = Object.freeze([
  Object.freeze({ path: tzdbCorePath, bytes: 7819, sha256: "7c144f6446b3fdba55f7b7b947fe242348ba5010025af36868c39436bfea638e" }),
  Object.freeze({ path: tzdbResolverPath, bytes: 8495, sha256: "bc13da5d2d9b8309aaad972662f8a31761a40afffbd9226bdf80159d43e5081f" }),
  Object.freeze({ path: momentEntryPath, bytes: 114, sha256: "b93bc1a0ab15d56e12f0e281bf005d39166952d9208b828e8d056563f3ff1fd1" }),
  Object.freeze({ path: momentImplementationPath, bytes: 17137, sha256: "c6ea311984ec62f79570fe9d440295978ec21518d4b8e3ac88117e729e85bc7b" }),
  Object.freeze({ path: momentPackageJsonPath, bytes: 1076, sha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b" }),
  Object.freeze({ path: momentDataPath, bytes: 715527, sha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" }),
  Object.freeze({ path: momentLicensePath, bytes: 1097, sha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" }),
  Object.freeze({ path: retainedTzdbAdapterPath, bytes: 396, sha256: "b1236071105653538a259d929a57e7cd2bb97928429cefaef2ead9dd5019e613" }),
  Object.freeze({ path: retainedMomentEntryPath, bytes: 114, sha256: "b93bc1a0ab15d56e12f0e281bf005d39166952d9208b828e8d056563f3ff1fd1" }),
  Object.freeze({ path: retainedMomentImplementationPath, bytes: 17139, sha256: "11de898e2d5abf498f56633f7f425512bb90bdfa0c1ad527eb4e88bb86e6c443" }),
  Object.freeze({ path: retainedMomentPackageJsonPath, bytes: 1077, sha256: "4b5a6218fe37ea04bbe19f463fc2477e141bfb8ee18506bd99e871a0d25c3dad" }),
  Object.freeze({ path: retainedMomentDataPath, bytes: 727104, sha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425" }),
  Object.freeze({ path: retainedMomentLicensePath, bytes: 1097, sha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" }),
  Object.freeze({ path: sharedMomentImplementationPath, bytes: 176435, sha256: "7dc0a51c32dae143f2eade235145dfd6a7756388c0f0bf409fa373dd6c233629" }),
  Object.freeze({ path: sharedMomentBrowserImplementationPath, bytes: 156326, sha256: "1e949937d4266c65affeb189ff0f4c0dafed235d8d314e32d6746f0334c95852" }),
  Object.freeze({ path: sharedMomentPackageJsonPath, bytes: 3556, sha256: "5e2f0870f4d1bbef11e8bf90babd72a4399b86b19da81de796a58457a37b8e13" }),
  Object.freeze({ path: sharedMomentLicensePath, bytes: 1075, sha256: "8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3" })
]);

function verifyLockedInput(input) {
  const bytes = readFileSync(input.path);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== input.bytes || digest !== input.sha256) {
    throw new Error(`Vedic fact-only browser build input drifted: ${input.path}`);
  }
  return Buffer.from(bytes);
}

function lockedTzdbInputAndNoticePlugin() {
  let heldMomentLicense;
  let heldRetainedMomentLicense;
  let heldSharedMomentLicense;
  return {
    name: "hakimi-vedic-civil-fact-only-locked-inputs",
    enforce: "pre",
    buildStart() {
      for (const input of LOCKED_BUILD_INPUTS) {
        const bytes = verifyLockedInput(input);
        if (input.path === momentLicensePath) heldMomentLicense = bytes;
        if (input.path === retainedMomentLicensePath) heldRetainedMomentLicense = bytes;
        if (input.path === sharedMomentLicensePath) heldSharedMomentLicense = bytes;
      }
    },
    generateBundle() {
      if (!heldMomentLicense || !heldRetainedMomentLicense || !heldSharedMomentLicense) {
        throw new Error("Moment-Timezone notice bytes were not held by buildStart");
      }
      this.emitFile({
        type: "asset",
        fileName: "licenses/moment-timezone-0.6.3-LICENSE.txt",
        source: heldMomentLicense
      });
      this.emitFile({
        type: "asset",
        fileName: "licenses/moment-timezone-0.5.48-retained-LICENSE.txt",
        source: heldRetainedMomentLicense
      });
      this.emitFile({
        type: "asset",
        fileName: "licenses/moment-2.30.1-LICENSE.txt",
        source: heldSharedMomentLicense
      });
    }
  };
}

const requestedOutDir = process.env.HAKIMI_VEDIC_FACT_ONLY_OUT_DIR;
if (!requestedOutDir) {
  throw new Error("HAKIMI_VEDIC_FACT_ONLY_OUT_DIR is required for isolated build and preview");
}
const outDir = path.resolve(requestedOutDir);
const buildManifestName = "hakimi-vedic-fact-only-build-manifest.v1.json";
const buildManifestPath = path.join(outDir, buildManifestName);
const configPath = fileURLToPath(import.meta.url);
const loadedConfigSha256 = sha256(readFileSync(configPath));

function isStrictDescendant(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

const temporaryRoot = realpathSync(os.tmpdir());
const leaf = path.basename(outDir);
if (!existsSync(outDir)) {
  throw new Error("HAKIMI_VEDIC_FACT_ONLY_OUT_DIR must already exist as an empty directory");
}
const initialOutDirStat = lstatSync(outDir);
const initialRealOutDir = realpathSync(outDir);
const samePath = (left, right) => path.resolve(left).toLocaleLowerCase("en-US")
  === path.resolve(right).toLocaleLowerCase("en-US");
if (!initialOutDirStat.isDirectory() || initialOutDirStat.isSymbolicLink()
  || !samePath(outDir, initialRealOutDir)
  || !isStrictDescendant(temporaryRoot, initialRealOutDir)
  || !/^hakimi-vedic-facts-[a-f0-9]{32}$/u.test(leaf)) {
  throw new Error("HAKIMI_VEDIC_FACT_ONLY_OUT_DIR must be a real dedicated GUID-named directory under the OS temp root");
}

function assertSameOutputDirectory({ requireEmpty }) {
  assertLoadedConfigUnchanged();
  if (!existsSync(outDir)) throw new Error("Vedic fact-only outDir disappeared during the isolated operation");
  const currentStat = lstatSync(outDir);
  const currentRealOutDir = realpathSync(outDir);
  if (!currentStat.isDirectory() || currentStat.isSymbolicLink()
    || !samePath(currentRealOutDir, initialRealOutDir)
    || currentStat.dev !== initialOutDirStat.dev
    || currentStat.ino !== initialOutDirStat.ino) {
    throw new Error("Vedic fact-only outDir identity changed during the isolated operation");
  }
  if (requireEmpty && readdirSync(outDir).length !== 0) {
    throw new Error("Vedic fact-only outDir must be empty before each build; existing artifacts are never retained or deleted");
  }
}

function assertLoadedConfigUnchanged() {
  if (sha256(readFileSync(configPath)) !== loadedConfigSha256) {
    throw new Error("Vedic fact-only Vite config bytes changed after this process loaded them");
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function listOutputFiles() {
  const result = [];
  walk(outDir, "");
  return result.sort((left, right) => left.localeCompare(right, "en"));

  function walk(directory, prefix) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      const stat = lstatSync(absolutePath);
      if (entry.isSymbolicLink() || stat.isSymbolicLink()) {
        throw new Error(`Vedic fact-only build output symlink is forbidden: ${relativePath}`);
      }
      if (entry.isDirectory() && stat.isDirectory()) {
        walk(absolutePath, relativePath);
      } else if (entry.isFile() && stat.isFile()) {
        result.push(relativePath.replaceAll("\\", "/"));
      } else {
        throw new Error(`Vedic fact-only build output entry is unsupported: ${relativePath}`);
      }
    }
  }
}

function assertExpectedBuildOutputPaths(paths) {
  const fixed = [
    "index.html",
    "licenses/moment-2.30.1-LICENSE.txt",
    "licenses/moment-timezone-0.5.48-retained-LICENSE.txt",
    "licenses/moment-timezone-0.6.3-LICENSE.txt"
  ];
  const findOne = (pattern, label) => {
    const matches = paths.filter((entry) => pattern.test(entry));
    if (matches.length !== 1) throw new Error(`Vedic fact-only build output ${label} count is not one`);
    return matches[0];
  };
  const mainJs = findOne(/^assets\/index-[A-Za-z0-9_-]+\.js$/u, "main JS");
  const css = findOne(/^assets\/index-[A-Za-z0-9_-]+\.css$/u, "CSS");
  const workerJs = findOne(/^assets\/civil-worker-[A-Za-z0-9_-]+\.js$/u, "Worker JS");
  const ianaJs = findOne(/^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u, "retained tzdb JS");
  const expected = [
    ...fixed,
    mainJs,
    `${mainJs}.map`,
    css,
    workerJs,
    `${workerJs}.map`,
    ianaJs,
    `${ianaJs}.map`
  ].sort((left, right) => left.localeCompare(right, "en"));
  if (JSON.stringify(paths) !== JSON.stringify(expected)) {
    throw new Error("Vedic fact-only build output allowlist mismatch");
  }
}

function buildOutputRecords(paths) {
  return paths.map((relativePath) => {
    const bytes = readFileSync(path.join(outDir, ...relativePath.split("/")));
    return { path: relativePath, bytes: bytes.byteLength, sha256: sha256(bytes) };
  });
}

function verifyCompletedBuildEnvelope() {
  assertSameOutputDirectory({ requireEmpty: false });
  if (!existsSync(buildManifestPath)) {
    throw new Error("Vedic fact-only preview requires a completed build manifest");
  }
  const manifestSource = readFileSync(buildManifestPath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(manifestSource);
  } catch {
    throw new Error("Vedic fact-only build manifest JSON is invalid");
  }
  if (`${JSON.stringify(manifest, null, 2)}\n` !== manifestSource
    || JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify([
      "concurrentSameAccountPathReplacementExcluded",
      "concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded",
      "configSha256",
      "fileCount",
      "generatedBy",
      "notDigitalSignature",
      "outputFiles",
      "recordType",
      "schemaVersion"
    ].sort())
    || manifest.schemaVersion !== "1.0.0"
    || manifest.recordType !== "hakimi_vedic_fact_only_temp_build_manifest_v1"
    || manifest.generatedBy !== "hakimi-vedic-fact-only-output-envelope/1"
    || manifest.concurrentSameAccountPathReplacementExcluded !== true
    || manifest.concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded !== true
    || manifest.notDigitalSignature !== true
    || manifest.configSha256 !== loadedConfigSha256) {
    throw new Error("Vedic fact-only build manifest identity is invalid");
  }
  const allPaths = listOutputFiles();
  const outputPaths = allPaths.filter((entry) => entry !== buildManifestName);
  assertExpectedBuildOutputPaths(outputPaths);
  const records = buildOutputRecords(outputPaths);
  if (manifest.fileCount !== records.length
    || JSON.stringify(manifest.outputFiles) !== JSON.stringify(records)
    || allPaths.length !== records.length + 1) {
    throw new Error("Vedic fact-only build manifest output identity mismatch");
  }
  const requiredLicenseDigests = new Map([
    ["licenses/moment-2.30.1-LICENSE.txt", "8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3"],
    ["licenses/moment-timezone-0.5.48-retained-LICENSE.txt", "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"],
    ["licenses/moment-timezone-0.6.3-LICENSE.txt", "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"]
  ]);
  for (const [relativePath, expectedDigest] of requiredLicenseDigests) {
    if (records.find((entry) => entry.path === relativePath)?.sha256 !== expectedDigest) {
      throw new Error(`Vedic fact-only build license digest mismatch: ${relativePath}`);
    }
  }
  return manifest;
}

function isolatedOutputEnvelopePlugin() {
  return {
    name: "hakimi-vedic-fact-only-output-envelope",
    enforce: "pre",
    buildStart() {
      assertSameOutputDirectory({ requireEmpty: true });
    },
    closeBundle() {
      assertSameOutputDirectory({ requireEmpty: false });
      const outputPaths = listOutputFiles();
      assertExpectedBuildOutputPaths(outputPaths);
      const outputFiles = buildOutputRecords(outputPaths);
      const manifest = {
        schemaVersion: "1.0.0",
        recordType: "hakimi_vedic_fact_only_temp_build_manifest_v1",
        generatedBy: "hakimi-vedic-fact-only-output-envelope/1",
        configSha256: loadedConfigSha256,
        fileCount: outputFiles.length,
        outputFiles,
        concurrentSameAccountPathReplacementExcluded: true,
        concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded: true,
        notDigitalSignature: true
      };
      writeFileSync(buildManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
      verifyCompletedBuildEnvelope();
    }
  };
}

export default ({ isPreview }) => {
  assertSameOutputDirectory({ requireEmpty: !isPreview });
  if (isPreview) verifyCompletedBuildEnvelope();

  return {
  root: browserRoot,
  base: "./",
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-fact-only-browser"),
  plugins: [
    ...(!isPreview ? [isolatedOutputEnvelopePlugin()] : []),
    lockedTzdbInputAndNoticePlugin()
  ],
  build: {
    outDir,
    emptyOutDir: false,
    sourcemap: true,
    target: "es2022"
  },
  worker: {
    format: "es"
  },
  server: {
    host: "127.0.0.1",
    port: 4226,
    strictPort: true,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; worker-src 'self' blob:; connect-src 'none'; base-uri 'none'; form-action 'none'"
    }
  },
  preview: {
    host: "127.0.0.1",
    port: 4226,
    strictPort: true,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; worker-src 'self' blob:; connect-src 'none'; base-uri 'none'; form-action 'none'"
    }
  }
  };
};
