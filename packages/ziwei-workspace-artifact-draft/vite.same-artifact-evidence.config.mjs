import os from "node:os";
import path from "node:path";
import { lstatSync, realpathSync } from "node:fs";
import baseConfig from "./vite.browser-app.config.mjs";

function samePath(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function requiredTemporaryRoot() {
  const raw = process.env.HAKIMI_ZIWEI_EVIDENCE_TEMP_ROOT;
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error("HAKIMI_ZIWEI_EVIDENCE_TEMP_ROOT must be an absolute path");
  }
  const resolved = path.resolve(raw);
  if (!/^hakimi-ziwei-same-artifact-[a-f0-9-]{36}$/u.test(path.basename(resolved))) {
    throw new Error("evidence temp root must use the runner-owned UUID leaf");
  }
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const temporaryRoot = realpathSync.native(os.tmpdir());
  const relative = path.relative(temporaryRoot, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("evidence temp root must be a real directory strictly below system temp");
  }
  return real;
}

const evidenceTempRoot = requiredTemporaryRoot();

function requiredTemporaryChildDirectory(name) {
  const raw = process.env[name];
  if (typeof raw !== "string" || raw.length === 0 || !path.isAbsolute(raw)) {
    throw new Error(`${name} must be an absolute system-temporary path`);
  }
  const resolved = path.resolve(raw);
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const relative = path.relative(evidenceTempRoot, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${name} must be a real directory strictly below the runner-owned temp root`);
  }
  return real;
}

const outDir = requiredTemporaryChildDirectory("HAKIMI_ZIWEI_EVIDENCE_OUT_DIR");
const cacheDir = requiredTemporaryChildDirectory("HAKIMI_ZIWEI_EVIDENCE_CACHE_DIR");

export default {
  ...baseConfig,
  cacheDir,
  build: {
    ...baseConfig.build,
    outDir,
    emptyOutDir: true
  }
};
