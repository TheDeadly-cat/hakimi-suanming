import {
  copyBaziDomainReleaseManifestData as copy,
  freezeBaziDomainReleaseManifestData as freeze,
  computeBaziDomainReleaseManifestComponentDigest as componentDigest,
  computeBaziDomainReleaseManifestV22Digest as manifestDigest,
  serializeBaziDomainReleaseManifestV22 as serialize,
  verifyBaziDomainReleaseManifestComponentFileIdentities
} from "./bazi-domain-release-manifest-v2-2-lib.mjs";
import {
  computeBaziKnowledgeCoreIdentityReboundBindingReadinessDigest as readinessDigest
} from "./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs";
import { computeExpertReviewPacketDigest } from "./bazi-expert-review-packet-lib.mjs";
import { parseBaziDttStrictJsonArtifact, readBaziDttStableWorkspaceArtifact } from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

// An explicit successor to the pre-dependency-update identities. Historical
// artifacts are checked as immutable data, never given a current-loader brand.
// Only the enumerated byte changes below are permitted. No source/rights/expert
// authority is inferred from the dependency or UTF-16 compatibility repair.
export const BAZI_DEPENDENCY_SUCCESSOR_PATHS = freeze({
  readiness: "content/system-admission/bazi-binding-freeze-requirements.v1.10.0.json",
  domain: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.6.0.json",
  expert: "content/bazi-strength-expert-review-packet.current-v1.7.0.json"
});
const PREDECESSORS = freeze({
  readiness: { path: "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json", rawBytes: 45551,
    rawSha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
    ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
    ledgerDigest: "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1" },
  domain: { path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.5.0.json", rawBytes: 23347,
    rawSha256: "83ae87f913875636f5b82f717f3d1a0856812676e932190a7c05f85b99fec7cc",
    manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.5.0",
    manifestDigest: "d00ebd0f3d6c26b31bc0b933d4b94845cc6b3b40879049f5cafe0e26a523d5c1" },
  expert: { path: "content/bazi-strength-expert-review-packet.current.json", rawBytes: 12692,
    rawSha256: "42c7541b9c1f84d5473bc91765cf599eb518abf2ebb656ba4360fbbd6ae37327",
    packetId: "hakimi.bazi.strength.expert-review-packet/1.6.0",
    packetDigest: "1b1e06439b4b3e44358b9e5b9feea2d44058933c8f66010d6a8940faa2da87e6" }
});
export const BAZI_DEPENDENCY_REBOUND_FILES = freeze([
  { path: "package-lock.json", oldRawBytes: 174157, oldSha256: "ce26e796ad8942c120042e76632ed2fd1e3c7da1001506dd5601c34e5242737d",
    rawBytes: 174157, sha256: "3d00bc4e362591a0143a7c50d05bfbfc111a0bfd1b0d1db98841cda43c37b761" },
  { path: "packages/contracts/src/index.ts", oldRawBytes: 244747, oldSha256: "674a3fe1e2b3cd4fc99e481a758966a320ddc3c1113a9471eba190851d15e041",
    rawBytes: 246996, sha256: "66871625480042a9af71582b838c9ca06a4f13b1e3cf730192c562e1b3993387" },
  { path: "packages/research-export/src/single-chart-report.ts", oldRawBytes: 164210, oldSha256: "43da8ce98eb0b09c061e6997dd140ffd3ad3dd597cb30720413fd67cf724d2dc",
    rawBytes: 164268, sha256: "f26429793f6bde01f10f6c5060a194df9c25f80c3bd4972423c9c542a8510e6e" }
]);
const CREATED_AT = "2026-10-24T17:20:23.000Z";
const APPLY = Reflect.apply;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const hasBrand = (set, value) => APPLY(WEAK_SET_HAS, set, [value]);
const addBrand = (set, value) => APPLY(WEAK_SET_ADD, set, [value]);
const VERIFIED_READINESS = new WeakSet();
const VERIFIED_DOMAIN = new WeakSet();
const VERIFIED_EXPERT = new WeakSet();
const EXPECTED_PERSISTED = freeze({
  readiness: { rawBytes: 46082, rawSha256: "39325874d730189e893220cc5fa500a26b77ace1ae8ea1316acb4ead2869df87" },
  domain: { rawBytes: 23510, rawSha256: "2f7536ba92e78c02e348752dd945d3df8e84ae1deacc77096d84869109240ec8" },
  expert: { rawBytes: 12692, rawSha256: "7923e034ada0fb852aa6c8dc062863348d1262aa455680af560796e9967b4b97" }
});
function fail(code, message) { const error = new Error(`${code}: ${message}`); error.code = code; throw error; }
function equal(a, b, code, label) { if (serialize(a) !== serialize(b)) fail(code, label); }
function checkSnapshot(snapshot, pin) {
  if (snapshot.path !== pin.path || snapshot.rawBytes !== pin.rawBytes || snapshot.rawSha256 !== pin.rawSha256)
    fail("RAW_IDENTITY_MISMATCH", pin.path);
}
async function historical(root, kind) {
  const pin = PREDECESSORS[kind];
  const snapshot = await readBaziDttStableWorkspaceArtifact(root, pin.path);
  checkSnapshot(snapshot, pin);
  const value = parseBaziDttStrictJsonArtifact(snapshot);
  const [id, digest, compute] = kind === "readiness" ? ["ledgerId", "ledgerDigest", readinessDigest]
    : kind === "domain" ? ["manifestId", "manifestDigest", manifestDigest]
      : ["packetId", "packetDigest", computeExpertReviewPacketDigest];
  equal([value[id], value[digest], compute(value)], [pin[id], pin[digest], pin[digest]], "HISTORICAL_SEMANTIC_IDENTITY_MISMATCH", kind);
  return value;
}
function rebound(file, field = "rawBytes") {
  const pin = BAZI_DEPENDENCY_REBOUND_FILES.find(entry => entry.path === file.path);
  if (!pin) return copy(file);
  if (file.sha256 !== pin.oldSha256 || (field && file[field] !== pin.oldRawBytes)) fail("PREDECESSOR_COMPONENT_DRIFT", file.path);
  return { ...copy(file), ...(field ? { [field]: pin.rawBytes } : {}), sha256: pin.sha256 };
}
export async function buildBaziDependencyReadinessV110(root = process.cwd()) {
  const old = await historical(root, "readiness");
  const value = copy(old);
  value.schemaVersion = "1.10.0";
  value.recordType = "bazi_binding_freeze_contract_identity_rebound_candidate_readiness_v1_10";
  value.ledgerId = "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.10.0";
  value.createdAt = CREATED_AT;
  value.status = "candidate_readiness_only_contract_identity_rebound_zero_binding_or_authority_progress";
  value.supersedes = copy(PREDECESSORS.readiness);
  value.basisArtifacts = value.basisArtifacts.map(file => rebound(file, "bytes"));
  value.lineage = { ...value.lineage, currentMachineIdentityRebindPaths: [BAZI_DEPENDENCY_REBOUND_FILES[1].path] };
  // Keep the previous knowledge-core observation explicitly historical: it is
  // not a fresh assertion that its old contracts basis matches current bytes.
  value.knowledgeCoreIdentityReboundGate = { ...value.knowledgeCoreIdentityReboundGate,
    observationScope: "preserved_predecessor_v1_9_observation_not_current_dependency_closure" };
  value.integrityBoundary.fixedHistoricalRawOnlyObservationsVerified = 1;
  value.evidenceLedger.engineeringReadinessIdentity = "v1_9_exact_historical_raw_and_self_digest_one_contract_identity_rebound_all_11_current_basis_files_verified_no_binding_or_authority_change";
  value.contractIdentityReboundGate = {
    previousIdentity: { path: BAZI_DEPENDENCY_REBOUND_FILES[1].path, bytes: BAZI_DEPENDENCY_REBOUND_FILES[1].oldRawBytes, sha256: BAZI_DEPENDENCY_REBOUND_FILES[1].oldSha256 },
    currentIdentity: { path: BAZI_DEPENDENCY_REBOUND_FILES[1].path, bytes: BAZI_DEPENDENCY_REBOUND_FILES[1].rawBytes, sha256: BAZI_DEPENDENCY_REBOUND_FILES[1].sha256 },
    historicalPredecessorBrandCurrent: false, bindingRowsChanged: 0, gateSummaryFieldsChanged: 0,
    activeAdmissionEffect: "none", releaseReady: false, expertClaimsAuthorized: false
  };
  value.ledgerDigest = readinessDigest(value);
  return freeze(value);
}
async function persisted(root, kind, expected) {
  const pin = EXPECTED_PERSISTED[kind];
  if (!pin.rawBytes || pin.rawSha256 === "PENDING") fail("PERSISTED_IDENTITY_UNPINNED", kind);
  const snapshot = await readBaziDttStableWorkspaceArtifact(root, BAZI_DEPENDENCY_SUCCESSOR_PATHS[kind]);
  checkSnapshot(snapshot, { path: BAZI_DEPENDENCY_SUCCESSOR_PATHS[kind], ...pin });
  const value = parseBaziDttStrictJsonArtifact(snapshot);
  equal(value, expected, "SUCCESSOR_SEMANTIC_MISMATCH", `${kind}: only the explicit successor transformation is allowed`);
  return { value, artifact: { path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256 } };
}
export async function loadBaziDependencyReadinessV110(root = process.cwd()) {
  const { value, artifact } = await persisted(root, "readiness", await buildBaziDependencyReadinessV110(root));
  if (value.basisArtifacts.length !== 11 || value.bindings.length !== 12) fail("READINESS_SCOPE_MISMATCH", "11 basis / 12 bindings required");
  for (const file of value.basisArtifacts) checkSnapshot(await readBaziDttStableWorkspaceArtifact(root, file.path), { path: file.path, rawBytes: file.bytes, rawSha256: file.sha256 });
  const result = freeze({ ledger: value, ledgerId: value.ledgerId, ledgerDigest: value.ledgerDigest, artifact,
    mechanicalObservationVerified: true, bindingRowsChanged: 0, bindingFrozenVerified: 0,
    historicalUpstreamPrivateBrandsInvoked: false, historicalObservationBrandCurrent: false,
    currentBasisFilesVerified: 11, productionWebConsumerClosureEstablished: false,
    publicDeploymentAuthorized: false, expertClaimsAuthorized: false, releaseReady: false });
  addBrand(VERIFIED_READINESS, result); return result;
}
export const isVerifiedBaziDependencyReadinessV110 = value => hasBrand(VERIFIED_READINESS, value);
export async function buildBaziDependencyExpertPacketV17(root = process.cwd()) {
  const value = copy(await historical(root, "expert"));
  value.packetId = "hakimi.bazi.strength.expert-review-packet/1.7.0";
  value.createdAt = CREATED_AT;
  value.artifactLocks = value.artifactLocks.map(file => rebound(file, null));
  value.packetDigest = computeExpertReviewPacketDigest(value);
  return freeze(value);
}
export async function verifyBaziDependencyExpertPacketV17(root = process.cwd()) {
  const { value, artifact } = await persisted(root, "expert", await buildBaziDependencyExpertPacketV17(root));
  for (const file of value.artifactLocks) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(root, file.path);
    if (snapshot.rawSha256 !== file.sha256) fail("CURRENT_EXPERT_ARTIFACT_DRIFT", file.path);
  }
  const result = freeze({ packet: value, artifact, historicalPacketBrandCurrent: false });
  addBrand(VERIFIED_EXPERT, result); return result;
}
export async function buildBaziDependencyDomainManifestV26(root = process.cwd()) {
  const value = copy(await historical(root, "domain"));
  const readiness = await loadBaziDependencyReadinessV110(root);
  if (!hasBrand(VERIFIED_READINESS, readiness)) fail("READINESS_BRAND_REQUIRED", "current v1.10 required");
  const changed = [];
  for (const component of value.components) {
    const before = serialize(component);
    component.files = component.files.map(file => file.path === PREDECESSORS.readiness.path
      ? { path: readiness.artifact.path, rawBytes: readiness.artifact.bytes, sha256: readiness.artifact.sha256 }
      : rebound(file));
    if (component.componentId === "source_bundle") component.version = component.version.replace("binding-readiness/1.9.0", "binding-readiness/1.10.0");
    component.digest = componentDigest(component);
    if (serialize(component) !== before) changed.push(component.componentId);
  }
  const fieldByComponent = { input_policy: "inputPolicyDigest", fact_contract: "factSchemaDigest", report_contract: "reportContractDigest", source_bundle: "sourceBundleDigest" };
  for (const [id, field] of Object.entries(fieldByComponent)) value.domainIdentity[field] = value.components.find(c => c.componentId === id).digest;
  value.domainIdentity.sourceBundleVersion = value.components.find(c => c.componentId === "source_bundle").version;
  value.schemaVersion = value.manifestRevision = "2.6.0";
  value.manifestId = "hakimi.bazi.single-chart-report.domain-release-manifest/2.6.0";
  value.createdAt = CREATED_AT;
  value.lineage = { ...value.lineage, supersedesForCurrentMachineIdentityOnly: copy(PREDECESSORS.domain),
    unchangedComponentCount: value.components.length - changed.length, reboundComponentIds: changed };
  value.verifiedMechanicalContexts[0] = {
    contextId: readiness.ledgerId, contextDigest: readiness.ledgerDigest,
    role: "current_binding_readiness_v1_10_full_loader_private_brand",
    artifact: { path: readiness.artifact.path, rawBytes: readiness.artifact.bytes, sha256: readiness.artifact.sha256 },
    privateBrandVerified: true, brandCurrent: true, recursiveFullLoaderCurrent: false, currentReadinessInputClosureVerified: true, activeAdmissionEffect: "none"
  };
  delete value.gateState.bindingReadinessV19MechanicallyVerified;
  value.gateState.bindingReadinessV110MechanicallyVerified = true;
  value.evidenceLedger.engineeringIdentity = "persisted_v2_6_manifest_exact_v2_5_historical_data_three_source_file_identities_and_readiness_rebound_all_28_current_component_files_verified";
  value.evidenceLedger.browserRuntimeEvidence = "not_assessed_in_domain_manifest_v2_6";
  value.manifestDigest = manifestDigest(value);
  return freeze(value);
}
export async function loadBaziDependencyDomainManifestV26(root = process.cwd()) {
  const { value, artifact } = await persisted(root, "domain", await buildBaziDependencyDomainManifestV26(root));
  const count = await verifyBaziDomainReleaseManifestComponentFileIdentities(root, value);
  if (count !== 28) fail("COMPONENT_FILE_COUNT_MISMATCH", "28 current files required");
  const result = freeze({ manifest: value, manifestId: value.manifestId, manifestDigest: value.manifestDigest, artifact });
  addBrand(VERIFIED_DOMAIN, result); return result;
}
export function getBaziDependencyDomainManifestV26Summary(value) {
  if (!hasBrand(VERIFIED_DOMAIN, value)) fail("MANIFEST_V26_BRAND_REQUIRED", "full current loader required");
  return freeze({ baziV17MachineIdentityManifestV26MechanicallyVerified: true,
    manifestId: value.manifestId, manifestDigest: value.manifestDigest, artifact: copy(value.artifact),
    uniqueComponentFileIdentitiesVerified: 28, reboundSourceFileCount: 3, reboundReadinessArtifactCount: 1,
    historicalManifestV25BrandCurrent: false, historicalFullLoaderReexecuted: false, repositorySelectionEstablished: false,
    gateState: value.manifest.gateState, authorityBoundary: value.manifest.authorityBoundary, releaseGovernance: value.manifest.releaseGovernance });
}
export { serialize as serializeBaziDependencySuccessor };
