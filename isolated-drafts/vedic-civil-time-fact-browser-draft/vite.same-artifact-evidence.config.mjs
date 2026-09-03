import { lstatSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import baseConfigFactory from "./vite.config.mjs";

function samePath(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function requiredTemporaryRoot() {
  const raw = process.env.HAKIMI_VEDIC_EVIDENCE_TEMP_ROOT;
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error("HAKIMI_VEDIC_EVIDENCE_TEMP_ROOT must be absolute");
  }
  const resolved = path.resolve(raw);
  if (!/^hakimi-vedic-same-artifact-[a-f0-9-]{36}$/u.test(path.basename(resolved))) {
    throw new Error("Vedic evidence temp root must use the runner-owned UUID leaf");
  }
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const systemTemp = realpathSync.native(os.tmpdir());
  const relative = path.relative(systemTemp, real);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || (!samePath(real, systemTemp)
        && (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)))) {
    throw new Error("Vedic evidence temp root must be the isolated process temp or its real child");
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

const outDir = requiredChildDirectory("HAKIMI_VEDIC_EVIDENCE_OUT_DIR");
const cacheDir = requiredChildDirectory("HAKIMI_VEDIC_EVIDENCE_CACHE_DIR");

export default (configEnvironment) => {
  const baseConfig = baseConfigFactory(configEnvironment);
  return {
    ...baseConfig,
    cacheDir,
    build: {
      ...baseConfig.build,
      outDir,
      emptyOutDir: false
    }
  };
};
