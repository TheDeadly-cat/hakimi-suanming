import {
  computeBaziDomainReleaseManifestComponentDigest,
  computeBaziDomainReleaseManifestV22Digest,
  copyBaziDomainReleaseManifestData,
  freezeBaziDomainReleaseManifestData,
  loadBaziDomainReleaseManifestV22HistoricalBasis,
  serializeBaziDomainReleaseManifestV22,
  verifyBaziDomainReleaseManifestComponentFileIdentities
} from "./bazi-domain-release-manifest-v2-2-lib.mjs";
import {
  assertBaziDomainReleaseManifestV23SemanticIdentity,
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_3_RELATIVE_PATH
} from "./bazi-domain-release-manifest-v2-3-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

export const BAZI_DOMAIN_RELEASE_MANIFEST_V2_4_RELATIVE_PATH =
  "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.4.0.json";
const PREDECESSOR = Object.freeze({
  path: BAZI_DOMAIN_RELEASE_MANIFEST_V2_3_RELATIVE_PATH,
  rawBytes: 23376,
  rawSha256: "d155b4d3cf8693ca61a210091a8563aea8cdbe646689f11e09e946e2d1333578",
  manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.3.0",
  manifestDigest: "98babe5a9e29ad20807961f1561991c8ddaa5bb068f6da37cd1b0978b509fa3f"
});
const LOCK_REBIND = Object.freeze({
  oldRawBytes: 176276,
  oldSha256: "fd94ca9ba0832c1cf596c3e05f980fde5af82849b4935877342cc67d4d22c0e2",
  rawBytes: 176278,
  sha256: "ceb0276477547cbf209e7937f9a5dcdc05a34ae21869af44b1f92825576c3e19"
});
const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 23347,
  rawSha256: "d630c555ec7441a7547d49878e25aac4d6d9481d929178f8369937a282b66689",
  manifestDigest: "7984b2304c0e7b25dfc8f3c23229de68129fb3fdf4d8847adb83e0ba400f2d0a"
});
const VERIFIED_HISTORICAL_BASES = new WeakSet();
const VERIFIED_RESULTS = new WeakSet();
const REFLECT_APPLY = Reflect.apply;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;

export class BaziDomainReleaseManifestV24Error extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "BaziDomainReleaseManifestV24Error";
    this.code = code;
  }
}
function equal(actual, expected, code, label) {
  if (actual !== expected) throw new BaziDomainReleaseManifestV24Error(code, label);
}
export const computeBaziDomainReleaseManifestV24Digest = computeBaziDomainReleaseManifestV22Digest;
export const serializeBaziDomainReleaseManifestV24 = serializeBaziDomainReleaseManifestV22;

// The unchanged v2.3 construction is historical data here. This issues neither
// its full current-component brand nor any expert, content or release authority.
export async function loadBaziDomainReleaseManifestV23HistoricalBasis(workspaceRoot = process.cwd()) {
  const v22 = await loadBaziDomainReleaseManifestV22HistoricalBasis(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, PREDECESSOR.path);
  const manifest = parseBaziDttStrictJsonArtifact(snapshot);
  equal(snapshot.rawBytes, PREDECESSOR.rawBytes, "HISTORICAL_BASIS_IDENTITY_MISMATCH", "v2.3 byte count");
  equal(snapshot.rawSha256, PREDECESSOR.rawSha256, "HISTORICAL_BASIS_IDENTITY_MISMATCH", "v2.3 raw hash");
  equal(manifest.manifestId, PREDECESSOR.manifestId, "HISTORICAL_BASIS_IDENTITY_MISMATCH", "v2.3 id");
  equal(manifest.manifestDigest, PREDECESSOR.manifestDigest, "HISTORICAL_BASIS_IDENTITY_MISMATCH", "v2.3 digest");
  assertBaziDomainReleaseManifestV23SemanticIdentity(manifest, v22);
  const result = freezeBaziDomainReleaseManifestData({ manifest,
    artifact: { path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 },
    historicalConstructionVerified: true, currentComponentIdentitiesVerified: false,
    historicalManifestBrandCurrent: false });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_HISTORICAL_BASES, [result]);
  return result;
}
export function isVerifiedBaziDomainReleaseManifestV23HistoricalBasis(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_HISTORICAL_BASES, [value]);
}
export function buildBaziDomainReleaseManifestV24FromHistoricalBasis(basis) {
  equal(isVerifiedBaziDomainReleaseManifestV23HistoricalBasis(basis), true,
    "HISTORICAL_BASIS_BRAND_REQUIRED", "v2.4 requires the exact verified historical v2.3 construction");
  const manifest = copyBaziDomainReleaseManifestData(basis.manifest);
  const component = manifest.components.find(entry => entry.componentId === "execution_rules");
  const files = component?.files.filter(entry => entry.path === "package-lock.json");
  equal(files?.length, 1, "COMPONENT_REBIND_INVALID", "one dependency lock input");
  equal(files[0].rawBytes, LOCK_REBIND.oldRawBytes, "COMPONENT_REBIND_INVALID", "old lock byte count");
  equal(files[0].sha256, LOCK_REBIND.oldSha256, "COMPONENT_REBIND_INVALID", "old lock hash");
  files[0].rawBytes = LOCK_REBIND.rawBytes;
  files[0].sha256 = LOCK_REBIND.sha256;
  component.digest = computeBaziDomainReleaseManifestComponentDigest(component);
  manifest.schemaVersion = "2.4.0";
  manifest.manifestRevision = "2.4.0";
  manifest.manifestId = "hakimi.bazi.single-chart-report.domain-release-manifest/2.4.0";
  manifest.createdAt = "2026-10-09T16:37:17.000Z";
  manifest.lineage = { ...manifest.lineage,
    supersedesForCurrentMachineIdentityOnly: { ...PREDECESSOR },
    reboundComponentIds: ["execution_rules"] };
  manifest.evidenceLedger = { ...manifest.evidenceLedger,
    engineeringIdentity: "persisted_v2_4_manifest_exact_v2_3_historical_construction_one_dependency_lock_rebound_all_28_component_files_mechanically_verified",
    browserRuntimeEvidence: "not_assessed_in_domain_manifest_v2_4" };
  manifest.manifestDigest = computeBaziDomainReleaseManifestV24Digest(manifest);
  return freezeBaziDomainReleaseManifestData(manifest);
}
export function assertBaziDomainReleaseManifestV24SemanticIdentity(manifest, basis) {
  equal(manifest?.manifestDigest, computeBaziDomainReleaseManifestV24Digest(manifest),
    "MANIFEST_DIGEST_INVALID", "v2.4 self digest");
  equal(serializeBaziDomainReleaseManifestV24(manifest),
    serializeBaziDomainReleaseManifestV24(buildBaziDomainReleaseManifestV24FromHistoricalBasis(basis)),
    "MANIFEST_MISMATCH", "only the fixed lock binding and successor metadata may change");
}
export async function buildCurrentBaziDomainReleaseManifestV24(workspaceRoot = process.cwd()) {
  const basis = await loadBaziDomainReleaseManifestV23HistoricalBasis(workspaceRoot);
  const manifest = buildBaziDomainReleaseManifestV24FromHistoricalBasis(basis);
  equal(await verifyBaziDomainReleaseManifestComponentFileIdentities(workspaceRoot, manifest),
    28, "COMPONENT_FILE_COUNT_MISMATCH", "v2.4 component identity count");
  return manifest;
}
export async function loadBaziDomainReleaseManifestV24(workspaceRoot = process.cwd()) {
  const basis = await loadBaziDomainReleaseManifestV23HistoricalBasis(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, BAZI_DOMAIN_RELEASE_MANIFEST_V2_4_RELATIVE_PATH);
  const manifest = parseBaziDttStrictJsonArtifact(snapshot);
  equal(snapshot.rawBytes, EXPECTED_PERSISTED.rawBytes, "PERSISTED_RAW_IDENTITY_MISMATCH", "v2.4 bytes");
  equal(snapshot.rawSha256, EXPECTED_PERSISTED.rawSha256, "PERSISTED_RAW_IDENTITY_MISMATCH", "v2.4 hash");
  equal(manifest.manifestDigest, EXPECTED_PERSISTED.manifestDigest, "PERSISTED_DIGEST_MISMATCH", "v2.4 digest pin");
  assertBaziDomainReleaseManifestV24SemanticIdentity(manifest, basis);
  equal(await verifyBaziDomainReleaseManifestComponentFileIdentities(workspaceRoot, manifest),
    28, "COMPONENT_FILE_COUNT_MISMATCH", "v2.4 component identity count");
  const result = freezeBaziDomainReleaseManifestData({ manifest, manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest, artifact: { path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 },
    uniqueComponentFileIdentitiesVerified: 28 });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}
export function isVerifiedBaziDomainReleaseManifestV24(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}
export function getBaziDomainReleaseManifestV24Summary(value) {
  equal(isVerifiedBaziDomainReleaseManifestV24(value), true, "MANIFEST_V24_BRAND_REQUIRED", "summary requires the full v2.4 result");
  return freezeBaziDomainReleaseManifestData({ baziV17MachineIdentityManifestV24MechanicallyVerified: true,
    manifestId: value.manifestId, manifestDigest: value.manifestDigest, artifact: copyBaziDomainReleaseManifestData(value.artifact),
    uniqueComponentFileIdentitiesVerified: 28, reboundComponentFileCount: 1, unchangedComponentFileCount: 27,
    historicalManifestV23BrandCurrent: false, repositorySelectionEstablished: false,
    gateState: value.manifest.gateState, authorityBoundary: value.manifest.authorityBoundary,
    releaseGovernance: value.manifest.releaseGovernance });
}
