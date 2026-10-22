import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { types as utilTypes } from "node:util";
import {
  verifyZiweiHkoRestrictedSourcePreReleasePolicy,
  ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS
} from "./ziwei-hko-restricted-source-pre-release-policy-lib.mjs";

const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const PROFILE = "hakimi.ziwei.hko-current-implementation/vite-7.3.7/1";
const ARCHIVE_SHA = "d0e7726d04010c6c182891d5f9e8e78d05380a23ecbfe2c41d7f452dbd939e98";
const REPLACEMENTS = Object.freeze({
  "scripts/ziwei-iztro-isolated-build-license-notice-lib.mjs": Object.freeze({
    bytes: 65855, sha256: "e2c1c043fd3f7de381b7b55cbdfd8a171ea7bb211b11a3a8b9c67c4413fcea1b"
  }),
  "scripts/verify-ziwei-iztro-isolated-build-license-notices.test.mjs": Object.freeze({
    bytes: 38192, sha256: "7d3bcf25287d592d6691b4515b27b4ed5ac2c8bc4f49cf0cab8473db0c0ffda6"
  })
});
export const ZIWEI_HKO_VITE737_IMPLEMENTATION_SPECS = Object.freeze(
  ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS.map(spec => Object.freeze({ ...spec, ...REPLACEMENTS[spec.path] }))
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
  const expected = ZIWEI_HKO_VITE737_IMPLEMENTATION_SPECS.map(spec => spec.path).sort();
  if (entries.length !== byPath.size || JSON.stringify([...byPath.keys()].sort()) !== JSON.stringify(expected)) {
    fail("IMPLEMENTATION_ARTIFACTS_INVALID", "current artifact paths are missing, duplicated or extra");
  }
  return Object.fromEntries(ZIWEI_HKO_VITE737_IMPLEMENTATION_SPECS.map(spec => {
    const input = byPath.get(spec.path);
    if (utilTypes.isProxy(input) || !Buffer.isBuffer(input)) fail("IMPLEMENTATION_IDENTITY_DRIFT", spec.path);
    const bytes = Buffer.from(input);
    if (bytes.length !== spec.bytes || sha(bytes) !== spec.sha256) fail("IMPLEMENTATION_IDENTITY_DRIFT", spec.path);
    return [spec.path, bytes];
  }));
}
function originalArtifacts(current) {
  const archive = readFileSync(new URL("./fixtures/ziwei-hko-v1-gate-originals.zip", import.meta.url));
  if (archive.length !== 23500 || sha(archive) !== ARCHIVE_SHA) fail("HISTORICAL_IMPLEMENTATION_DRIFT", "fixed original archive changed");
  const entries = unzipSync(archive);
  if (JSON.stringify(Object.keys(entries).sort()) !== JSON.stringify(Object.keys(REPLACEMENTS).sort())) {
    fail("HISTORICAL_IMPLEMENTATION_DRIFT", "fixed archive members changed");
  }
  const result = { ...current };
  for (const spec of ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS) {
    if (!Object.hasOwn(REPLACEMENTS, spec.path)) continue;
    const bytes = Buffer.from(entries[spec.path]);
    if (bytes.length !== spec.bytes || sha(bytes) !== spec.sha256) fail("HISTORICAL_IMPLEMENTATION_DRIFT", spec.path);
    result[spec.path] = bytes;
  }
  return result;
}
// This returns authentic historical input only; it never labels it current.
export function loadHistoricalZiweiHkoImplementations(currentArtifacts) {
  return originalArtifacts(captureCurrent(currentArtifacts));
}
export function verifyZiweiHkoVite737CurrentImplementation(input) {
  const current = captureCurrent(input.implementationArtifacts);
  // Original policy, lifecycle, restricted-input, parent-isolation and authority
  // constraints all still execute. Original implementation identity stays fixed.
  const historical = verifyZiweiHkoRestrictedSourcePreReleasePolicy({
    ...input, implementationArtifacts: originalArtifacts(current)
  });
  return Object.freeze({
    ...historical,
    currentImplementationProfile: PROFILE,
    currentImplementationIdentityBound: true,
    historicalPolicyReplayed: true,
    historicalImplementationAuthorizedAsCurrent: false,
    // Governance remains static. CI separately runs the current real dual build
    // and every current restricted-input/authority rejection test before this.
    currentLiveBuildProvenByThisAdapter: false
  });
}
