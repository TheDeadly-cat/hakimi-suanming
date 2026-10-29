import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { types as utilTypes } from "node:util";
import {
  verifyZiweiHkoVite737CurrentImplementation,
  loadHistoricalZiweiHkoImplementations,
  ZIWEI_HKO_VITE737_IMPLEMENTATION_SPECS
} from "./ziwei-hko-vite737-current-implementation-lib.mjs";

const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const PROFILE = "hakimi.ziwei.hko-current-implementation/vite-7.3.7-zod-4.6.7/1";
const ARCHIVE_SHA = "31af21a8cf6e35bc9ead4b8b5cd0f3fa3be4612c65ddf53b215fc49932c8df2d";
const REPLACEMENTS = Object.freeze({
  "scripts/ziwei-iztro-isolated-build-license-notice-lib.mjs": Object.freeze({
    bytes: 66336, sha256: "e41b0e2c29fca4fdc7c91527655af08ab947ea1e031a4253e2119f23dd971093"
  }),
  "scripts/verify-ziwei-iztro-isolated-build-license-notices.test.mjs": Object.freeze({
    bytes: 39650, sha256: "e8da79d58a74b6847093a1cbba894a2f8f1c12fde23576a42168eb5054b36779"
  })
});
export const ZIWEI_HKO_ZOD467_IMPLEMENTATION_SPECS = Object.freeze(
  ZIWEI_HKO_VITE737_IMPLEMENTATION_SPECS.map(spec => Object.freeze({ ...spec, ...REPLACEMENTS[spec.path] }))
);
function fail(code, message) {
  const error = new Error(`${code}: ${message}`); error.code = code; throw error;
}
function captureCurrent(artifacts) {
  if (!artifacts || typeof artifacts !== "object" || utilTypes.isProxy(artifacts)) {
    fail("IMPLEMENTATION_ARTIFACTS_INVALID", "current artifacts must be passive data");
  }
  let entries;
  if (Object.getPrototypeOf(artifacts) === Map.prototype) {
    entries = [...Map.prototype.entries.call(artifacts)];
  } else {
    const prototype = Object.getPrototypeOf(artifacts);
    if (prototype !== Object.prototype && prototype !== null) fail("IMPLEMENTATION_ARTIFACTS_INVALID", "invalid artifact map prototype");
    const descriptors = Object.getOwnPropertyDescriptors(artifacts);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => typeof key !== "string")) fail("IMPLEMENTATION_ARTIFACTS_INVALID", "symbol artifact key");
    entries = keys.map(key => {
      const descriptor = descriptors[key];
      if (!("value" in descriptor) || !descriptor.enumerable) fail("IMPLEMENTATION_ARTIFACTS_INVALID", "accessor artifact key");
      return [key, descriptor.value];
    });
  }
  const byPath = new Map(entries);
  const expected = ZIWEI_HKO_ZOD467_IMPLEMENTATION_SPECS.map(spec => spec.path).sort();
  if (entries.length !== byPath.size || JSON.stringify([...byPath.keys()].sort()) !== JSON.stringify(expected)) {
    fail("IMPLEMENTATION_ARTIFACTS_INVALID", "current artifact paths are missing, duplicated or extra");
  }
  return Object.fromEntries(ZIWEI_HKO_ZOD467_IMPLEMENTATION_SPECS.map(spec => {
    const input = byPath.get(spec.path);
    if (utilTypes.isProxy(input) || !Buffer.isBuffer(input)) fail("IMPLEMENTATION_IDENTITY_DRIFT", spec.path);
    const bytes = Buffer.from(input);
    if (bytes.length !== spec.bytes || sha(bytes) !== spec.sha256) fail("IMPLEMENTATION_IDENTITY_DRIFT", spec.path);
    return [spec.path, bytes];
  }));
}
function originalArtifacts(current) {
  const archive = readFileSync(new URL("./fixtures/ziwei-hko-vite737-gate-originals.zip", import.meta.url));
  if (archive.length !== 23959 || sha(archive) !== ARCHIVE_SHA) fail("HISTORICAL_IMPLEMENTATION_DRIFT", "fixed original archive changed");
  const entries = unzipSync(archive);
  if (JSON.stringify(Object.keys(entries).sort()) !== JSON.stringify(Object.keys(REPLACEMENTS).sort())) {
    fail("HISTORICAL_IMPLEMENTATION_DRIFT", "fixed archive members changed");
  }
  const result = { ...current };
  for (const spec of ZIWEI_HKO_VITE737_IMPLEMENTATION_SPECS) {
    if (!Object.hasOwn(REPLACEMENTS, spec.path)) continue;
    const bytes = Buffer.from(entries[spec.path]);
    if (bytes.length !== spec.bytes || sha(bytes) !== spec.sha256) fail("HISTORICAL_IMPLEMENTATION_DRIFT", spec.path);
    result[spec.path] = bytes;
  }
  return result;
}
// This returns authentic historical input only; it never labels it current.
export function loadVite737ZiweiHkoImplementations(currentArtifacts) {
  return originalArtifacts(captureCurrent(currentArtifacts));
}
export function loadHistoricalZiweiHkoZod467Implementations(currentArtifacts) {
  return loadHistoricalZiweiHkoImplementations(loadVite737ZiweiHkoImplementations(currentArtifacts));
}
export function verifyZiweiHkoZod467CurrentImplementation(input) {
  const current = captureCurrent(input.implementationArtifacts);
  // Original policy, lifecycle, restricted-input, parent-isolation and authority
  // constraints all still execute. Original implementation identity stays fixed.
  const historical = verifyZiweiHkoVite737CurrentImplementation({
    ...input, implementationArtifacts: originalArtifacts(current)
  });
  return Object.freeze({
    ...historical,
    previousImplementationProfile: historical.currentImplementationProfile,
    currentImplementationProfile: PROFILE,
    currentImplementationIdentityBound: true,
    historicalPolicyReplayed: true,
    historicalImplementationAuthorizedAsCurrent: false,
    // Governance remains static. CI separately runs the current real dual build
    // and every current restricted-input/authority rejection test before this.
    currentLiveBuildProvenByThisAdapter: false
  });
}
