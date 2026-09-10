import {
  computeBaziDomainReleaseManifestComponentDigest,
  computeBaziDomainReleaseManifestV22Digest,
  copyBaziDomainReleaseManifestData,
  freezeBaziDomainReleaseManifestData,
  isVerifiedBaziDomainReleaseManifestV22HistoricalBasis,
  loadBaziDomainReleaseManifestV22HistoricalBasis,
  serializeBaziDomainReleaseManifestV22,
  verifyBaziDomainReleaseManifestComponentFileIdentities
} from "./bazi-domain-release-manifest-v2-2-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

export const BAZI_DOMAIN_RELEASE_MANIFEST_V2_3_RELATIVE_PATH =
  "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.3.0.json";

const MANIFEST_ID = "hakimi.bazi.single-chart-report.domain-release-manifest/2.3.0";
const CREATED_AT = "2026-09-06T18:29:14.692Z";
const PREDECESSOR = Object.freeze({
  path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json",
  rawBytes: 23399,
  rawSha256: "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d",
  manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.2.0",
  manifestDigest: "a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e"
});
const REBOUND_FILES = freezeBaziDomainReleaseManifestData([
  {
    componentId: "execution_rules",
    path: "package-lock.json",
    oldRawBytes: 175812,
    oldSha256: "40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d",
    rawBytes: 176276,
    sha256: "fd94ca9ba0832c1cf596c3e05f980fde5af82849b4935877342cc67d4d22c0e2"
  },
  {
    componentId: "report_contract",
    path: "packages/research-export/src/single-chart-report.ts",
    oldRawBytes: 161365,
    oldSha256: "215a470e79ea6eb844b41a5aad18867279d1a7ae60fd2b9cf6a364cc2c1b5082",
    rawBytes: 164210,
    sha256: "43da8ce98eb0b09c061e6997dd140ffd3ad3dd597cb30720413fd67cf724d2dc"
  }
]);
const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 23376,
  rawSha256: "d155b4d3cf8693ca61a210091a8563aea8cdbe646689f11e09e946e2d1333578",
  manifestDigest: "98babe5a9e29ad20807961f1561991c8ddaa5bb068f6da37cd1b0978b509fa3f"
});
const VERIFIED_RESULTS = new WeakSet();
const REFLECT_APPLY = Reflect.apply;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;

export class BaziDomainReleaseManifestV23Error extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "BaziDomainReleaseManifestV23Error";
    this.code = code;
  }
}

function requireEqual(actual, expected, code, label) {
  if (actual !== expected) throw new BaziDomainReleaseManifestV23Error(code, label);
}

// The digest and serialization grammar is unchanged from v2.2. Only the
// versioned manifest data, declared component pins and lineage change.
export const computeBaziDomainReleaseManifestV23Digest = computeBaziDomainReleaseManifestV22Digest;
export const serializeBaziDomainReleaseManifestV23 = serializeBaziDomainReleaseManifestV22;

export function buildBaziDomainReleaseManifestV23FromHistoricalBasis(basis) {
  requireEqual(isVerifiedBaziDomainReleaseManifestV22HistoricalBasis(basis), true,
    "HISTORICAL_BASIS_BRAND_REQUIRED", "v2.3 requires the verified v2.2 historical construction");
  requireEqual(basis.currentComponentIdentitiesVerified, false,
    "HISTORICAL_BASIS_BOUNDARY_MISMATCH", "historical basis is not a current component result");
  const manifest = copyBaziDomainReleaseManifestData(basis.manifest);
  requireEqual(manifest.manifestId, PREDECESSOR.manifestId,
    "HISTORICAL_BASIS_IDENTITY_MISMATCH", "predecessor id");
  requireEqual(manifest.manifestDigest, PREDECESSOR.manifestDigest,
    "HISTORICAL_BASIS_IDENTITY_MISMATCH", "predecessor digest");
  for (const [field, expected] of [
    ["path", PREDECESSOR.path], ["bytes", PREDECESSOR.rawBytes], ["sha256", PREDECESSOR.rawSha256]
  ]) requireEqual(basis.artifact[field], expected, "HISTORICAL_BASIS_IDENTITY_MISMATCH", field);

  for (const rebind of REBOUND_FILES) {
    const components = manifest.components.filter((entry) => entry.componentId === rebind.componentId);
    requireEqual(components.length, 1, "COMPONENT_REBIND_INVALID", rebind.componentId);
    const component = components[0];
    const files = component.files.filter((entry) => entry.path === rebind.path);
    requireEqual(files.length, 1, "COMPONENT_REBIND_INVALID", rebind.path);
    requireEqual(files[0].rawBytes, rebind.oldRawBytes, "COMPONENT_REBIND_INVALID", "old byte count");
    requireEqual(files[0].sha256, rebind.oldSha256, "COMPONENT_REBIND_INVALID", "old sha256");
    files[0].rawBytes = rebind.rawBytes;
    files[0].sha256 = rebind.sha256;
    component.digest = computeBaziDomainReleaseManifestComponentDigest(component);
  }
  const report = manifest.components.find((entry) => entry.componentId === "report_contract");
  manifest.domainIdentity.reportContractDigest = report.digest;
  // rulesetDigest identifies interpretation_rules, not execution_rules.
  manifest.schemaVersion = "2.3.0";
  manifest.manifestRevision = "2.3.0";
  manifest.manifestId = MANIFEST_ID;
  manifest.createdAt = CREATED_AT;
  manifest.lineage = {
    ...manifest.lineage,
    supersedesForCurrentMachineIdentityOnly: { ...PREDECESSOR },
    reboundComponentIds: ["execution_rules", "report_contract"]
  };
  manifest.evidenceLedger = {
    ...manifest.evidenceLedger,
    engineeringIdentity: "persisted_v2_3_manifest_v2_2_historical_construction_two_component_file_identities_rebound_all_28_component_files_mechanically_verified",
    browserRuntimeEvidence: "not_assessed_in_domain_manifest_v2_3"
  };
  manifest.manifestDigest = computeBaziDomainReleaseManifestV23Digest(manifest);
  return freezeBaziDomainReleaseManifestData(manifest);
}

export function assertBaziDomainReleaseManifestV23SemanticIdentity(manifest, basis) {
  const expected = buildBaziDomainReleaseManifestV23FromHistoricalBasis(basis);
  requireEqual(manifest?.manifestDigest, computeBaziDomainReleaseManifestV23Digest(manifest),
    "MANIFEST_DIGEST_INVALID", "v2.3 self digest");
  requireEqual(serializeBaziDomainReleaseManifestV23(manifest),
    serializeBaziDomainReleaseManifestV23(expected), "MANIFEST_MISMATCH",
    "v2.3 must change only the two fixed component pins and declared successor metadata");
}

export async function buildCurrentBaziDomainReleaseManifestV23(workspaceRoot = process.cwd()) {
  const basis = await loadBaziDomainReleaseManifestV22HistoricalBasis(workspaceRoot);
  const manifest = buildBaziDomainReleaseManifestV23FromHistoricalBasis(basis);
  const count = await verifyBaziDomainReleaseManifestComponentFileIdentities(workspaceRoot, manifest);
  requireEqual(count, 28, "COMPONENT_FILE_COUNT_MISMATCH", "v2.3 component identity count");
  return manifest;
}

export async function loadBaziDomainReleaseManifestV23(workspaceRoot = process.cwd()) {
  const basis = await loadBaziDomainReleaseManifestV22HistoricalBasis(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot, BAZI_DOMAIN_RELEASE_MANIFEST_V2_3_RELATIVE_PATH
  );
  const manifest = parseBaziDttStrictJsonArtifact(snapshot);
  requireEqual(snapshot.rawBytes, EXPECTED_PERSISTED.rawBytes,
    "PERSISTED_RAW_IDENTITY_MISMATCH", "v2.3 raw bytes");
  requireEqual(snapshot.rawSha256, EXPECTED_PERSISTED.rawSha256,
    "PERSISTED_RAW_IDENTITY_MISMATCH", "v2.3 raw sha256");
  requireEqual(manifest.manifestDigest, EXPECTED_PERSISTED.manifestDigest,
    "PERSISTED_DIGEST_MISMATCH", "v2.3 digest pin");
  assertBaziDomainReleaseManifestV23SemanticIdentity(manifest, basis);
  const count = await verifyBaziDomainReleaseManifestComponentFileIdentities(workspaceRoot, manifest);
  requireEqual(count, 28, "COMPONENT_FILE_COUNT_MISMATCH", "v2.3 component identity count");
  const result = freezeBaziDomainReleaseManifestData({
    manifest,
    manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest,
    artifact: { path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 },
    uniqueComponentFileIdentitiesVerified: count
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziDomainReleaseManifestV23(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziDomainReleaseManifestV23Summary(value) {
  requireEqual(isVerifiedBaziDomainReleaseManifestV23(value), true,
    "MANIFEST_V23_BRAND_REQUIRED", "summary requires the full v2.3 loader result");
  return freezeBaziDomainReleaseManifestData({
    baziV17MachineIdentityManifestV23MechanicallyVerified: true,
    manifestId: value.manifestId,
    manifestDigest: value.manifestDigest,
    artifact: copyBaziDomainReleaseManifestData(value.artifact),
    uniqueComponentFileIdentitiesVerified: value.uniqueComponentFileIdentitiesVerified,
    reboundComponentFileCount: 2,
    unchangedComponentFileCount: 26,
    historicalManifestV22BrandCurrent: false,
    repositorySelectionEstablished: false,
    gateState: value.manifest.gateState,
    authorityBoundary: value.manifest.authorityBoundary,
    releaseGovernance: value.manifest.releaseGovernance
  });
}
