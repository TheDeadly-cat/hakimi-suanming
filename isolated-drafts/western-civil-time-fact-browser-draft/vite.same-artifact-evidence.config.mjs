import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import baseConfig from "./vite.config.mjs";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const manifestName = "hakimi-western-fact-only-build-manifest.v1.json";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function samePath(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requiredTemporaryRoot() {
  const raw = process.env.HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT;
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error("HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT must be absolute");
  }
  const resolved = path.resolve(raw);
  if (!/^hakimi-western-same-artifact-[a-f0-9-]{36}$/u.test(path.basename(resolved))) {
    throw new Error("Western evidence temp root must use the runner-owned UUID leaf");
  }
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const systemTemp = realpathSync.native(os.tmpdir());
  const relative = path.relative(systemTemp, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || (!samePath(real, systemTemp)
        && (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)))) {
    throw new Error("Western evidence temp root must be the isolated process temp or its real child");
  }
  return real;
}

const evidenceTempRoot = requiredTemporaryRoot();

function requiredChildDirectory(environmentName) {
  const raw = process.env[environmentName];
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error(`${environmentName} must be absolute`);
  }
  const resolved = path.resolve(raw);
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const relative = path.relative(evidenceTempRoot, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${environmentName} must be a real child of the evidence temp root`);
  }
  return real;
}

function listOutputFiles(root, prefix = "", output = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(root, entry.name);
    const stat = lstatSync(absolutePath);
    if (entry.isSymbolicLink() || stat.isSymbolicLink()) {
      throw new Error(`Western evidence output link forbidden: ${relativePath}`);
    }
    if (entry.isDirectory() && stat.isDirectory()) {
      listOutputFiles(absolutePath, relativePath, output);
    } else if (entry.isFile() && stat.isFile()) {
      output.push(relativePath.replaceAll("\\", "/"));
    } else {
      throw new Error(`Western evidence output endpoint invalid: ${relativePath}`);
    }
  }
  return output;
}

function onePath(paths, pattern, label) {
  const matches = paths.filter((entry) => pattern.test(entry));
  if (matches.length !== 1) throw new Error(`Western evidence output ${label} count must be one`);
  return matches[0];
}

function assertExpectedOutputPaths(paths) {
  const main = onePath(paths, /^assets\/index-[A-Za-z0-9_-]+\.js$/u, "main JS");
  const css = onePath(paths, /^assets\/index-[A-Za-z0-9_-]+\.css$/u, "CSS");
  const worker = onePath(paths, /^assets\/civil-worker-[A-Za-z0-9_-]+\.js$/u, "Worker JS");
  const iana = onePath(paths, /^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u, "retained tzdb JS");
  const expected = [
    main,
    `${main}.map`,
    css,
    worker,
    `${worker}.map`,
    iana,
    `${iana}.map`,
    "index.html",
    "licenses/moment-2.30.1-LICENSE.txt",
    "licenses/moment-timezone-0.5.48-retained-LICENSE.txt",
    "licenses/moment-timezone-0.6.3-LICENSE.txt"
  ].sort(compareCodeUnits);
  const actual = [...paths].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Western evidence output allowlist mismatch");
  }
}

const outDir = requiredChildDirectory("HAKIMI_WESTERN_EVIDENCE_OUT_DIR");
const cacheDir = requiredChildDirectory("HAKIMI_WESTERN_EVIDENCE_CACHE_DIR");
if (!samePath(path.resolve(baseConfig.build?.outDir ?? ""), outDir)) {
  throw new Error("Western base config output directory disagrees with the evidence runner");
}
const baseConfigPath = path.join(packageRoot, "vite.config.mjs");
const baseConfigSha256 = sha256(readFileSync(baseConfigPath));

function outputEnvelopePlugin() {
  return {
    name: "hakimi-western-fact-only-output-envelope",
    enforce: "pre",
    buildStart() {
      if (readdirSync(outDir).length !== 0) {
        throw new Error("Western evidence output directory must be empty before build");
      }
    },
    closeBundle() {
      const outputPaths = listOutputFiles(outDir);
      assertExpectedOutputPaths(outputPaths);
      const outputFiles = outputPaths
        .sort(compareCodeUnits)
        .map((relativePath) => {
          const bytes = readFileSync(path.join(outDir, ...relativePath.split("/")));
          return { path: relativePath, bytes: bytes.byteLength, sha256: sha256(bytes) };
        });
      writeFileSync(path.join(outDir, manifestName), `${JSON.stringify({
        schemaVersion: "1.0.0",
        recordType: "hakimi_western_fact_only_temp_build_manifest_v1",
        generatedBy: "hakimi-western-fact-only-output-envelope/1",
        configSha256: baseConfigSha256,
        fileCount: outputFiles.length,
        outputFiles,
        concurrentSameAccountPathReplacementExcluded: false,
        concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded: false,
        notDigitalSignature: true
      }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    }
  };
}

export default {
  ...baseConfig,
  cacheDir,
  plugins: [outputEnvelopePlugin(), ...(baseConfig.plugins ?? [])],
  build: {
    ...baseConfig.build,
    outDir,
    emptyOutDir: false
  }
};
