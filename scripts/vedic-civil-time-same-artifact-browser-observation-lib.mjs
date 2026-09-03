import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync
} from "node:fs";
import path from "node:path";

export const VEDIC_SAME_ARTIFACT_CANDIDATE_PATH =
  "content/system-admission/vedic-civil-time-same-artifact-browser-observation-child.v1.0.0.json";
export const VEDIC_SAME_ARTIFACT_CHILD_ID =
  "hakimi.vedic.civil-time.same-artifact-edge-chrome-observation/1.0.0";
export const VEDIC_SAME_ARTIFACT_DRAFT_ROOT =
  "isolated-drafts/vedic-civil-time-fact-browser-draft";

const SHA256 = /^[a-f0-9]{64}$/u;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const VERSION = /^\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9.-]+)?$/u;
const LOOPBACK_ORIGIN = /^http:\/\/127\.0\.0\.1:(?:[1-9]\d{0,4})$/u;
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.vedic.civil-time.same-artifact-browser-observation-child.v1\0";
const FILE_GRAPH_DIGEST_DOMAIN =
  "hakimi.vedic.civil-time.same-artifact-file-graph.v1\0";
const OUTPUT_TREE_DIGEST_DOMAIN =
  "hakimi.vedic.civil-time.same-artifact-output-tree.v1\0";
const SERVED_BODY_DIGEST_DOMAIN =
  "hakimi.vedic.civil-time.same-artifact-served-body-manifest.v1\0";
const CANDIDATE_BRAND = new WeakSet();

export const VEDIC_AUTHORED_BUILD_SOURCE_PATHS = Object.freeze([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.base.json",
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/package.json`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/tsconfig.json`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/browser-app/index.html`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/vite.config.mjs`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/vite.same-artifact-evidence.config.mjs`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/styles.css`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/browser-fact-projection.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/civil-client.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/civil-time.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/civil-worker.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/constants.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/input-contract.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/main.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/protocol.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/ui-format.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/src/worker-fact-projection.ts`,
  "packages/tzdb-core/package.json",
  "packages/tzdb-core/src/index.ts",
  "packages/tzdb-core/src/packed-resolver.ts",
  "packages/tzdb-core/src/artifacts/iana-2025b.ts"
]);

export const VEDIC_EVIDENCE_TOOL_PATHS = Object.freeze([
  "scripts/vedic-civil-time-same-artifact-browser-observation-lib.mjs",
  "scripts/run-vedic-civil-time-same-artifact-browser-observation.mjs",
  "scripts/render-vedic-civil-time-same-artifact-browser-observation-candidate.mjs",
  "scripts/verify-vedic-civil-time-same-artifact-browser-observation.mjs",
  "scripts/verify-vedic-civil-time-same-artifact-browser-observation.test.mjs",
  "scripts/verify-vedic-civil-time-same-artifact-config-cwd.test.mjs",
  "scripts/vedic-civil-time-fact-browser-observation-lib.mjs",
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/playwright.same-artifact-evidence.config.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/tsconfig.same-artifact-evidence.json`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/e2e/civil-time-browser-gate.spec.ts`,
  `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/e2e/same-artifact-summary-reporter.ts`,
  "apps/web/node_modules/vite/package.json",
  "apps/web/node_modules/vite/bin/vite.js",
  "node_modules/@playwright/test/package.json",
  "node_modules/@playwright/test/cli.js",
  "node_modules/playwright-core/package.json",
  "node_modules/esbuild/package.json",
  "node_modules/esbuild/lib/main.js",
  "node_modules/rollup/package.json",
  "node_modules/rollup/dist/rollup.js"
]);

export const VEDIC_FORMAL_CONTEXT_PATHS = Object.freeze([
  "content/system-admission/vedic-civil-time-fact-browser-observation-candidate.v1.0.0.json",
  "content/system-admission/vedic-independent-storage-backup-recovery-and-rollback-design-candidate.v0.1.0.json",
  "content/system-admission/vedic-independent-browser-quality-gate-and-release-evidence-design-candidate.v0.1.0.json",
  "content/system-admission/vedic-independent-productization-version-aware-observation-child.v1.2.0.json",
  "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v1.json"
]);

export const VEDIC_E2E_ASSERTION_CONTRACT_BINDINGS = deepFreeze([
  {
    role: "playwrightConfig",
    path: `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/playwright.same-artifact-evidence.config.ts`,
    bytes: 5059,
    sha256: "6ff2a3b401b160176b4315417b5af0c621117d2d81c42243eb5e151abacc07e6"
  },
  {
    role: "fiveScenarioSpec",
    path: `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/e2e/civil-time-browser-gate.spec.ts`,
    bytes: 9478,
    sha256: "c1e904bfc30e1229d78fee5bc58fe456c7f807e7ce423e5b122505bb57dff0d6"
  },
  {
    role: "sanitizedReporter",
    path: `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/e2e/same-artifact-summary-reporter.ts`,
    bytes: 9756,
    sha256: "7e86a026dd58ff23b9f8ba568470118c9720ca80099a0c584e0e6e8836a2c22a"
  }
]);

export const VEDIC_LOCKED_BUILD_INPUTS = deepFreeze([
  { role: "tzdbCorePath", path: "packages/tzdb-core/src/index.ts", bytes: 7819, sha256: "7c144f6446b3fdba55f7b7b947fe242348ba5010025af36868c39436bfea638e" },
  { role: "tzdbResolverPath", path: "packages/tzdb-core/src/packed-resolver.ts", bytes: 8495, sha256: "bc13da5d2d9b8309aaad972662f8a31761a40afffbd9226bdf80159d43e5081f" },
  { role: "momentEntryPath", path: "node_modules/moment-timezone/index.js", bytes: 114, sha256: "b93bc1a0ab15d56e12f0e281bf005d39166952d9208b828e8d056563f3ff1fd1" },
  { role: "momentImplementationPath", path: "node_modules/moment-timezone/moment-timezone.js", bytes: 17137, sha256: "c6ea311984ec62f79570fe9d440295978ec21518d4b8e3ac88117e729e85bc7b" },
  { role: "momentPackageJsonPath", path: "node_modules/moment-timezone/package.json", bytes: 1076, sha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b" },
  { role: "momentDataPath", path: "node_modules/moment-timezone/data/packed/latest.json", bytes: 715527, sha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" },
  { role: "momentLicensePath", path: "node_modules/moment-timezone/LICENSE", bytes: 1097, sha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" },
  { role: "retainedTzdbAdapterPath", path: "packages/tzdb-core/src/artifacts/iana-2025b.ts", bytes: 396, sha256: "b1236071105653538a259d929a57e7cd2bb97928429cefaef2ead9dd5019e613" },
  { role: "retainedMomentEntryPath", path: "node_modules/moment-timezone-2025b/index.js", bytes: 114, sha256: "b93bc1a0ab15d56e12f0e281bf005d39166952d9208b828e8d056563f3ff1fd1" },
  { role: "retainedMomentImplementationPath", path: "node_modules/moment-timezone-2025b/moment-timezone.js", bytes: 17139, sha256: "11de898e2d5abf498f56633f7f425512bb90bdfa0c1ad527eb4e88bb86e6c443" },
  { role: "retainedMomentPackageJsonPath", path: "node_modules/moment-timezone-2025b/package.json", bytes: 1077, sha256: "4b5a6218fe37ea04bbe19f463fc2477e141bfb8ee18506bd99e871a0d25c3dad" },
  { role: "retainedMomentDataPath", path: "node_modules/moment-timezone-2025b/data/packed/latest.json", bytes: 727104, sha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425" },
  { role: "retainedMomentLicensePath", path: "node_modules/moment-timezone-2025b/LICENSE", bytes: 1097, sha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" },
  { role: "sharedMomentImplementationPath", path: "node_modules/moment/moment.js", bytes: 176435, sha256: "7dc0a51c32dae143f2eade235145dfd6a7756388c0f0bf409fa373dd6c233629" },
  { role: "sharedMomentBrowserImplementationPath", path: "node_modules/moment/dist/moment.js", bytes: 156326, sha256: "1e949937d4266c65affeb189ff0f4c0dafed235d8d314e32d6746f0334c95852" },
  { role: "sharedMomentPackageJsonPath", path: "node_modules/moment/package.json", bytes: 3556, sha256: "5e2f0870f4d1bbef11e8bf90babd72a4399b86b19da81de796a58457a37b8e13" },
  { role: "sharedMomentLicensePath", path: "node_modules/moment/LICENSE", bytes: 1075, sha256: "8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3" }
]);

export const VEDIC_SCENARIOS = deepFreeze([
  { scenarioId: "unique", assertionClass: "resolved_fact_only_then_all_ten_fact_value_slots_empty_after_input_change" },
  { scenarioId: "gap", assertionClass: "synthetic_dom_setup_without_input_events_then_completed_gap_failure_leaves_all_ten_previously_populated_fact_value_slots_empty" },
  { scenarioId: "overlap_reject", assertionClass: "synthetic_dom_setup_without_input_events_then_completed_overlap_failure_leaves_all_ten_previously_populated_fact_value_slots_empty" },
  { scenarioId: "overlap_earlier", assertionClass: "explicit_earlier_overlap_selection_resolved_fact_only" },
  { scenarioId: "overlap_later", assertionClass: "explicit_later_overlap_selection_resolved_fact_only" }
]);

const FALSE_AUTHORITY = Object.freeze({
  astronomicalFactsEstablished: false,
  civilTimeDomainTruthCertified: false,
  crossSystemAuthorityInherited: false,
  formalAdmissionAuthorized: false,
  formalInputContractAdmitted: false,
  domainAuthorityAuthorized: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  expertIdentityCredentialsIndependenceEstablished: false,
  rightsLegalConclusionEstablished: false,
  sourceFreezeEstablished: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  highRiskClaimsAuthorized: false
});

export class VedicSameArtifactObservationError extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "VedicSameArtifactObservationError";
    this.code = code;
  }
}

function fail(code, detail = "") {
  throw new VedicSameArtifactObservationError(code, detail);
}

function samePath(left, right) {
  const a = path.normalize(left);
  const b = path.normalize(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function workspaceRoot(root) {
  if (typeof root !== "string" || root.length === 0) fail("WORKSPACE_ROOT_INVALID");
  const resolved = path.resolve(root);
  const real = realpathSync.native(resolved);
  if (!samePath(resolved, real)) fail("WORKSPACE_ROOT_IDENTITY_INVALID");
  return real;
}

function resolveWorkspacePath(root, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0
      || relativePath.includes("\\") || path.isAbsolute(relativePath)
      || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail("RELATIVE_PATH_INVALID", String(relativePath));
  }
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail("PATH_ESCAPE_REJECTED", relativePath);
  }
  return absolute;
}

function readStableFile(absolutePath, label) {
  const firstPathStat = lstatSync(absolutePath);
  if (!firstPathStat.isFile() || firstPathStat.isSymbolicLink()) fail("FILE_TYPE_INVALID", label);
  const real = realpathSync.native(absolutePath);
  if (!samePath(absolutePath, real)) fail("FILE_REALPATH_INVALID", label);
  const fd = openSync(absolutePath, "r");
  try {
    const before = fstatSync(fd);
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    const finalPathStat = lstatSync(absolutePath);
    if (!before.isFile() || before.dev !== after.dev || before.ino !== after.ino
        || before.size !== after.size || before.mtimeMs !== after.mtimeMs
        || before.dev !== finalPathStat.dev || before.ino !== finalPathStat.ino
        || bytes.byteLength !== before.size) {
      fail("FILE_CHANGED_DURING_READ", label);
    }
    return bytes;
  } finally {
    closeSync(fd);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function identityForPath(root, relativePath) {
  const bytes = readStableFile(resolveWorkspacePath(root, relativePath), relativePath);
  return { path: relativePath, bytes: bytes.byteLength, sha256: sha256(bytes) };
}

function graphDigest(files) {
  return sha256(Buffer.from(FILE_GRAPH_DIGEST_DOMAIN + canonicalCompact({ files }), "utf8"));
}

export function collectVedicAuthoredBuildSourceSnapshot(root = process.cwd()) {
  const resolvedRoot = workspaceRoot(root);
  const files = VEDIC_AUTHORED_BUILD_SOURCE_PATHS.map((entry) => identityForPath(resolvedRoot, entry));
  return deepFreeze({
    graphId: "hakimi.vedic.civil-time.authored-build-source-graph/1",
    digestAlgorithm: "sha256-authored-build-source-graph-v1",
    fileCount: files.length,
    files,
    graphDigest: graphDigest(files)
  });
}

export function collectVedicEvidenceToolSnapshot(root = process.cwd()) {
  const resolvedRoot = workspaceRoot(root);
  const files = VEDIC_EVIDENCE_TOOL_PATHS.map((entry) => identityForPath(resolvedRoot, entry));
  return deepFreeze({
    graphId: "hakimi.vedic.civil-time.same-artifact-evidence-tooling/1",
    digestAlgorithm: "sha256-file-graph-v1",
    fileCount: files.length,
    files,
    graphDigest: graphDigest(files)
  });
}

export function collectVedicLockedBuildInputSnapshot(root = process.cwd()) {
  const resolvedRoot = workspaceRoot(root);
  const inputs = VEDIC_LOCKED_BUILD_INPUTS.map((expected) => {
    const identity = identityForPath(resolvedRoot, expected.path);
    if (identity.bytes !== expected.bytes || identity.sha256 !== expected.sha256) {
      fail("LOCKED_BUILD_INPUT_DRIFT", expected.role);
    }
    return { role: expected.role, ...identity };
  });
  return deepFreeze({
    graphId: "hakimi.vedic.civil-time.base-config-locked-build-inputs/1",
    digestAlgorithm: "sha256-role-file-graph-v1",
    inputCount: inputs.length,
    inputs,
    graphDigest: graphDigest(inputs)
  });
}

function verifyVedicE2EAssertionContractBindings(bindings) {
  if (!Array.isArray(bindings) || bindings.length !== VEDIC_E2E_ASSERTION_CONTRACT_BINDINGS.length) {
    fail("E2E_ASSERTION_CONTRACT_INVALID");
  }
  for (let index = 0; index < bindings.length; index += 1) {
    const actual = bindings[index];
    const expected = VEDIC_E2E_ASSERTION_CONTRACT_BINDINGS[index];
    requireKeys(actual, ["bytes", "path", "role", "sha256"], "E2E_ASSERTION_CONTRACT_INVALID");
    if (canonicalCompact(actual) !== canonicalCompact(expected)) {
      fail("E2E_ASSERTION_CONTRACT_INVALID", expected.role);
    }
  }
  return deepFreeze(bindings.map((entry) => ({ ...entry })));
}

export function inspectVedicE2EAssertionContract(root = process.cwd()) {
  const resolvedRoot = workspaceRoot(root);
  const bindings = VEDIC_E2E_ASSERTION_CONTRACT_BINDINGS.map((expected) => ({
    role: expected.role,
    ...identityForPath(resolvedRoot, expected.path)
  }));
  return deepFreeze({
    inspectionId: "hakimi.vedic.civil-time.same-artifact-exact-e2e-files/1",
    bindingCount: bindings.length,
    bindings: verifyVedicE2EAssertionContractBindings(bindings),
    exactFiveScenarioSpecReporterAndConfigBytesVerified: true
  });
}

function decodeStrictUtf8(bytes, label) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("UTF8_BOM_FORBIDDEN", label);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("UTF8_INVALID", label);
  }
}

function parseStrictJsonBytes(bytes, label) {
  const text = decodeStrictUtf8(bytes, label);
  rejectDuplicateJsonKeys(text, label);
  try {
    return captureJsonData(JSON.parse(text), label);
  } catch (cause) {
    if (cause instanceof VedicSameArtifactObservationError) throw cause;
    fail("JSON_PARSE_FAILED", label);
  }
}

function assertAllFalse(record, keys, code) {
  for (const key of keys) if (record?.[key] !== false) fail(code, key);
}

function assertExactAllFalse(record, keys, code) {
  requireKeys(record, keys, code);
  assertAllFalse(record, keys, code);
}

export function collectVedicFormalContextSnapshot(root = process.cwd()) {
  const resolvedRoot = workspaceRoot(root);
  const parsed = new Map();
  const files = VEDIC_FORMAL_CONTEXT_PATHS.map((entry) => {
    const bytes = readStableFile(resolveWorkspacePath(resolvedRoot, entry), entry);
    parsed.set(entry, parseStrictJsonBytes(bytes, entry));
    return { path: entry, bytes: bytes.byteLength, sha256: sha256(bytes) };
  });
  const civil = parsed.get(VEDIC_FORMAL_CONTEXT_PATHS[0]);
  const storage = parsed.get(VEDIC_FORMAL_CONTEXT_PATHS[1]);
  const quality = parsed.get(VEDIC_FORMAL_CONTEXT_PATHS[2]);
  const parent = parsed.get(VEDIC_FORMAL_CONTEXT_PATHS[3]);
  const manifest = parsed.get(VEDIC_FORMAL_CONTEXT_PATHS[4]);
  if (civil?.activeAdmissionEffect !== "none"
      || civil?.observationBoundary?.operatorSuppliedEvidence !== true
      || civil.observationBoundary.toolAttestationEstablished !== false
      || civil.systemIdentity?.productSystemId !== null
      || civil.systemIdentity?.releaseIdentity !== null
      || civil.systemIdentity?.targetSchema !== null
      || civil.systemIdentity?.migrationId !== null
      || canonicalCompact(civil.browserObservation?.scenarios?.map((entry) => entry.scenarioId))
        !== canonicalCompact(VEDIC_SCENARIOS.map((entry) => entry.scenarioId))) {
    fail("CIVIL_BASELINE_CONTEXT_INVALID");
  }
  if (storage?.activeAdmissionEffect !== "none"
      || storage?.designCoverage?.designExecutionStarted !== false
      || storage.designCoverage.designReceiptsIssued !== 0
      || storage.mutationBoundary?.mutationEpochAvailable !== false
      || storage.mutationBoundary.mutationEpochReceipt !== null
      || storage.productBoundary?.storageBackend !== "unselected"
      || storage.productBoundary?.releaseIdentity !== null
      || storage.productBoundary?.targetSchema !== null
      || storage.productBoundary?.migrationId !== null) {
    fail("STORAGE_CONTEXT_INVALID");
  }
  if (quality?.activeAdmissionEffect !== "none"
      || quality?.designCoverage?.designExecutionStarted !== false
      || quality.evidenceBoundary?.releaseEvidenceSetInstances !== 0
      || quality.productBoundary?.productIdentity !== null
      || quality.productBoundary?.releaseIdentity !== null
      || quality.productBoundary?.targetSchema !== null
      || quality.productBoundary?.migrationId !== null
      || quality.productBoundary?.mainApplicationIntegration !== false) {
    fail("BROWSER_QUALITY_CONTEXT_INVALID");
  }
  if (parent?.activeAdmissionEffect !== "none"
      || parent?.gateSummary?.bindingRequired !== 38
      || parent.gateSummary.bindingFrozenVerified !== 0
      || parent.gateSummary.independentExpertsRequired !== 2
      || parent.gateSummary.independentExpertReviewsVerified !== 0
      || parent.gateSummary.admissionGatesRequired !== 8
      || parent.gateSummary.admissionGatesSatisfied !== 0
      || parent.productBoundary?.productIdentity !== null
      || parent.productBoundary?.releaseIdentity !== null
      || parent.productBoundary?.targetSchema !== null
      || parent.productBoundary?.migrationId !== null) {
    fail("PARENT_CONTEXT_INVALID");
  }
  const manifestPaths = manifest?.components?.flatMap((component) =>
    component.files?.map((entry) => entry.path) ?? []) ?? [];
  const serializedManifest = canonicalCompact(manifest);
  if (manifest?.activeAdmissionEffect !== "none"
      || manifest.status !== "draft_current_machine_identity_research_boundary_no_product_identity_no_admission_effect"
      || manifest.releaseStatus !== "draft"
      || manifest.gateState?.bindingRequired !== 38
      || manifest.gateState?.bindingFrozenVerified !== 0
      || manifest.gateState?.independentExpertsRequired !== 2
      || manifest.gateState?.independentExpertReviewsVerified !== 0
      || manifest.gateState?.admissionGatesRequired !== 8
      || manifest.gateState?.admissionGatesSatisfied !== 0
      || manifest.gateState?.releaseEvidenceComplete !== false
      || manifest.gateState?.requirementsUniverseClosed !== false
      || manifest.snapshotBoundary?.mutationEpochAvailableForProduct !== false
      || manifest.snapshotBoundary?.mutationEpochReceipt !== null
      || manifest.snapshotBoundary?.crossFileAtomicSnapshot !== false
      || manifest.snapshotBoundary?.intervalMutationExcludedAcrossFiles !== false
      || manifest.snapshotBoundary?.abaExcluded !== false
      || manifest.productBoundary?.productIdentity !== null
      || manifest.productBoundary?.releaseIdentity !== null
      || manifest.productBoundary?.targetSchema !== null
      || manifest.productBoundary?.migrationId !== null
      || manifest.integrationBoundary?.mainApplicationIntegrated !== false
      || manifest.integrationBoundary?.centralFormalRegistryConsumesThisManifest !== false
      || manifest.integrationBoundary?.crossSystemEngineeringReceiptsConsumeThisManifest !== false
      || manifest.integrationBoundary?.fourSystemObservationRegistryV2ConsumesThisManifest !== false
      || manifest.integrationBoundary?.ownerAcceptanceForFormalAdmissionEstablished !== false
      || manifest.upstreamObservation?.artifact?.path !== VEDIC_FORMAL_CONTEXT_PATHS[3]
      || manifest.upstreamObservation?.candidateId
        !== "hakimi.vedic.independent-productization.version-aware-observation-child/1.2.0"
      || manifest.upstreamObservation?.candidateDigest !== parent.candidateDigest
      || manifest.upstreamObservation?.privateBrandVerified !== true
      || !Array.isArray(manifest.upstreamRequirementsChildren)
      || manifestPaths.some((entry) => entry.startsWith(`${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/`))
      || serializedManifest.includes(VEDIC_SAME_ARTIFACT_CANDIDATE_PATH)
      || serializedManifest.includes(VEDIC_SAME_ARTIFACT_CHILD_ID)
      || serializedManifest.includes(`${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/`)) {
    fail("MANIFEST_CONTEXT_INVALID");
  }
  assertExactAllFalse(civil.authorityBoundary, [
    "astronomicalFactsEstablished", "civilTimeDomainTruthCertified", "contentTruthEstablished",
    "crossSystemAuthorityInherited", "domainAuthorityAuthorized", "expertClaimsAuthorized",
    "expertIdentityCredentialsIndependenceEstablished", "expertTruthEstablished",
    "formalAdmissionAuthorized", "formalInputContractAdmitted", "highRiskClaimsAuthorized",
    "publicDeploymentAuthorized", "publicReleaseAuthorized", "releaseEvidenceComplete",
    "releaseReady", "rightsLegalConclusionEstablished", "sourceFreezeEstablished"
  ], "CIVIL_AUTHORITY_INVALID");
  assertExactAllFalse(storage.authorityBoundary, [
    "contentTruthEstablished", "expertClaimsAuthorized", "expertTruthEstablished",
    "publicDeploymentAuthorized", "publicReleaseAuthorized", "releaseReady",
    "rightsLegalConclusionEstablished"
  ], "STORAGE_AUTHORITY_INVALID");
  assertExactAllFalse(quality.authorityBoundary, [
    "artifactAuthenticityEstablished", "contentTruthEstablished", "domainAuthorityAuthorized",
    "expertClaimsAuthorized", "expertTruthEstablished", "formalAdmissionAuthorized",
    "highRiskClaimsAuthorized", "publicDeploymentAuthorized", "publicReleaseAuthorized",
    "releaseEvidenceComplete", "releaseReady", "rightsLegalConclusionEstablished",
    "scientificTruthEstablished", "sourceFreezeEstablished"
  ], "QUALITY_AUTHORITY_INVALID");
  assertExactAllFalse(parent.authorityBoundary, [
    "baziAuthorityInherited", "contentTruthEstablished", "domainAuthorityAuthorized",
    "expertClaimsAuthorized", "expertTruthEstablished", "formalAdmissionAuthorized",
    "highRiskClaimsAuthorized", "inputContractGateSatisfied", "publicDeploymentAuthorized",
    "publicReleaseAuthorized", "releaseEvidenceComplete", "releaseReady",
    "rightsLegalConclusionEstablished", "ruleEvaluationAuthorized"
  ], "PARENT_AUTHORITY_INVALID");
  assertExactAllFalse(manifest.authorityBoundary, [
    "baziAuthorityInherited", "contentTruthEstablished", "domainAuthorityAuthorized",
    "expertClaimsAuthorized", "expertTruthEstablished", "formalAdmissionAuthorized",
    "highRiskClaimsAuthorized", "publicDeploymentAuthorized", "publicReleaseAuthorized",
    "releaseEvidenceComplete", "releaseReady", "rightsLegalConclusionEstablished"
  ], "MANIFEST_AUTHORITY_INVALID");
  return deepFreeze({
    bindingCount: files.length,
    bindings: files,
    baselineCivilObservationDigest: civil.observationDigest,
    storageDesignDigest: storage.designDigest,
    browserQualityDesignDigest: quality.designDigest,
    parentCandidateDigest: parent.candidateDigest,
    currentEngineeringManifestDigest: manifest.manifestDigest,
    currentEngineeringManifestConsumesThisChild: false,
    currentEngineeringManifestConsumesFactBrowserDraft: false
  });
}

function walkOutputFiles(directory, prefix = "", output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (entry.isSymbolicLink() || stat.isSymbolicLink()) fail("OUTPUT_SYMLINK_FORBIDDEN", relativePath);
    if (entry.isDirectory() && stat.isDirectory()) {
      walkOutputFiles(absolutePath, relativePath, output);
    } else if (entry.isFile() && stat.isFile()) {
      output.push(relativePath.replaceAll("\\", "/"));
    } else {
      fail("OUTPUT_ENTRY_INVALID", relativePath);
    }
  }
  return output;
}

export function collectVedicOutputTree(outDir) {
  const resolved = path.resolve(outDir);
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)) {
    fail("OUTPUT_DIRECTORY_INVALID");
  }
  const files = walkOutputFiles(real).sort((a, b) => a.localeCompare(b, "en")).map((relativePath) => {
    const bytes = readStableFile(path.join(real, ...relativePath.split("/")), relativePath);
    return { path: relativePath, bytes: bytes.byteLength, sha256: sha256(bytes) };
  });
  validateOutputFileSet(files);
  const treeDigest = sha256(Buffer.from(
    OUTPUT_TREE_DIGEST_DOMAIN + canonicalCompact({ files }),
    "utf8"
  ));
  return deepFreeze({ digestAlgorithm: "sha256-file-tree-v1", fileCount: files.length, files, treeDigest });
}

function onePath(paths, pattern, label) {
  const matches = paths.filter((entry) => pattern.test(entry));
  if (matches.length !== 1) fail("OUTPUT_PATH_SET_INVALID", label);
  return matches[0];
}

function validateOutputFileSet(files) {
  if (!Array.isArray(files) || files.length !== 12) fail("OUTPUT_FILE_COUNT_INVALID");
  const paths = files.map((entry) => entry.path).sort((a, b) => a.localeCompare(b, "en"));
  const main = onePath(paths, /^assets\/index-[A-Za-z0-9_-]+\.js$/u, "main");
  const css = onePath(paths, /^assets\/index-[A-Za-z0-9_-]+\.css$/u, "css");
  const worker = onePath(paths, /^assets\/civil-worker-[A-Za-z0-9_-]+\.js$/u, "worker");
  const iana = onePath(paths, /^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u, "iana");
  const expected = [
    main, `${main}.map`, css, worker, `${worker}.map`, iana, `${iana}.map`,
    "hakimi-vedic-fact-only-build-manifest.v1.json",
    "index.html",
    "licenses/moment-2.30.1-LICENSE.txt",
    "licenses/moment-timezone-0.5.48-retained-LICENSE.txt",
    "licenses/moment-timezone-0.6.3-LICENSE.txt"
  ].sort((a, b) => a.localeCompare(b, "en"));
  if (canonicalCompact(paths) !== canonicalCompact(expected)) fail("OUTPUT_PATH_SET_INVALID");
  for (const entry of files) {
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || !SHA256.test(entry.sha256 ?? "")) {
      fail("OUTPUT_IDENTITY_INVALID", entry.path);
    }
  }
}

export function deriveVedicRequiredRuntimePaths(outputTree) {
  return deriveVedicScenarioRuntimePaths(outputTree);
}

export function deriveVedicScenarioRuntimePaths(outputTree) {
  const paths = outputTree.files.map((entry) => entry.path);
  return Object.freeze([
    "index.html",
    onePath(paths, /^assets\/index-[A-Za-z0-9_-]+\.js$/u, "main"),
    onePath(paths, /^assets\/index-[A-Za-z0-9_-]+\.css$/u, "css"),
    onePath(paths, /^assets\/civil-worker-[A-Za-z0-9_-]+\.js$/u, "worker")
  ].sort((a, b) => a.localeCompare(b, "en")));
}

export function deriveVedicEvidenceOnlyOutputBodyProbePaths(outputTree) {
  const paths = outputTree.files.map((entry) => entry.path);
  return Object.freeze([
    onePath(paths, /^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u, "iana")
  ]);
}

export function verifyVedicBuildManifest(outDir, outputTree, root = process.cwd()) {
  const manifestPath = path.join(path.resolve(outDir), "hakimi-vedic-fact-only-build-manifest.v1.json");
  const manifest = parseStrictJsonBytes(readStableFile(manifestPath, "build manifest"), "build manifest");
  const payload = outputTree.files.filter((entry) => entry.path !== "hakimi-vedic-fact-only-build-manifest.v1.json");
  const baseConfigIdentity = identityForPath(workspaceRoot(root), `${VEDIC_SAME_ARTIFACT_DRAFT_ROOT}/vite.config.mjs`);
  if (manifest?.schemaVersion !== "1.0.0"
      || manifest.recordType !== "hakimi_vedic_fact_only_temp_build_manifest_v1"
      || manifest.generatedBy !== "hakimi-vedic-fact-only-output-envelope/1"
      || manifest.configSha256 !== baseConfigIdentity.sha256
      || manifest.fileCount !== 11
      || canonicalCompact(manifest.outputFiles) !== canonicalCompact(payload)
      || manifest.concurrentSameAccountPathReplacementExcluded !== true
      || manifest.concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded !== true
      || manifest.notDigitalSignature !== true) {
    fail("BUILD_MANIFEST_INVALID");
  }
  return deepFreeze(manifest);
}

function normalizeFileTree(value, code) {
  requireKeys(value, ["digestAlgorithm", "fileCount", "files", "treeDigest"], code);
  if (value.digestAlgorithm !== "sha256-file-tree-v1" || !Array.isArray(value.files)
      || value.fileCount !== value.files.length || !SHA256.test(value.treeDigest ?? "")) fail(code);
  const files = value.files.map((entry) => {
    requireKeys(entry, ["bytes", "path", "sha256"], code);
    if (typeof entry.path !== "string" || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1
        || !SHA256.test(entry.sha256 ?? "")) fail(code);
    return { path: entry.path, bytes: entry.bytes, sha256: entry.sha256 };
  });
  validateOutputFileSet(files);
  const expectedDigest = sha256(Buffer.from(OUTPUT_TREE_DIGEST_DOMAIN + canonicalCompact({ files }), "utf8"));
  if (value.treeDigest !== expectedDigest) fail(code);
  return deepFreeze({ digestAlgorithm: "sha256-file-tree-v1", fileCount: files.length, files, treeDigest: value.treeDigest });
}

function normalizePlaywrightSummary(value) {
  requireKeys(value, ["configuredProjectNames", "outcomeCount", "outcomes", "overallStatus", "schemaVersion"], "PLAYWRIGHT_SUMMARY_INVALID");
  if (value.schemaVersion !== "hakimi.vedic.same-artifact-playwright-summary/1"
      || value.overallStatus !== "passed"
      || canonicalCompact(value.configuredProjectNames) !== canonicalCompact(["chrome", "msedge"])
      || value.outcomeCount !== 10 || !Array.isArray(value.outcomes) || value.outcomes.length !== 10) {
    fail("PLAYWRIGHT_SUMMARY_INVALID");
  }
  const expected = [];
  for (const projectName of ["chrome", "msedge"]) {
    for (const scenario of VEDIC_SCENARIOS) expected.push(`${projectName}\0${scenario.scenarioId}`);
  }
  const seen = new Set();
  const outcomes = value.outcomes.map((entry) => {
    requireKeys(entry, ["projectName", "retry", "scenarioId", "status"], "PLAYWRIGHT_OUTCOME_INVALID");
    const key = `${entry.projectName}\0${entry.scenarioId}`;
    if (!expected.includes(key) || seen.has(key) || entry.retry !== 0 || entry.status !== "passed") {
      fail("PLAYWRIGHT_OUTCOME_INVALID");
    }
    seen.add(key);
    return { projectName: entry.projectName, scenarioId: entry.scenarioId, status: "passed", retry: 0 };
  });
  if (canonicalCompact([...seen].sort()) !== canonicalCompact(expected.sort())) fail("PLAYWRIGHT_OUTCOME_SET_INVALID");
  return deepFreeze({
    schemaVersion: value.schemaVersion,
    overallStatus: "passed",
    configuredProjectNames: ["chrome", "msedge"],
    outcomeCount: 10,
    outcomes
  });
}

function normalizeBrowserProbes(value) {
  if (!Array.isArray(value) || value.length !== 2) fail("BROWSER_PROBES_INVALID");
  const sorted = [...value].sort((a, b) => String(a.projectName).localeCompare(String(b.projectName), "en"));
  const expected = [
    { projectName: "chrome", channel: "chrome", browserProduct: "Google Chrome" },
    { projectName: "msedge", channel: "msedge", browserProduct: "Microsoft Edge" }
  ];
  return deepFreeze(sorted.map((entry, index) => {
    requireKeys(entry, ["browserProduct", "channel", "prePostVersionEqual", "projectName", "versionAfter", "versionBefore"], "BROWSER_PROBE_INVALID");
    if (entry.projectName !== expected[index].projectName || entry.channel !== expected[index].channel
        || entry.browserProduct !== expected[index].browserProduct
        || typeof entry.versionBefore !== "string" || !VERSION.test(entry.versionBefore)
        || entry.versionAfter !== entry.versionBefore || entry.prePostVersionEqual !== true) {
      fail("BROWSER_PROBE_INVALID", expected[index].projectName);
    }
    return { ...expected[index], versionBefore: entry.versionBefore, versionAfter: entry.versionAfter, prePostVersionEqual: true };
  }));
}

function normalizeRuntimeToolResolution(value) {
  requireKeys(value, [
    "completeInstalledRuntimeDependencyClosureBound", "resolutionAnchorIdentifier", "tools",
    "viteCliIdentifier", "viteConfigLoader"
  ], "RUNTIME_TOOL_RESOLUTION_INVALID");
  const expected = [
    {
      role: "esbuild",
      resolutionMode: "resolved_from_vite_package_anchor",
      packageIdentifier: "node_modules/esbuild/package.json",
      entryIdentifier: "node_modules/esbuild/lib/main.js",
      version: "0.28.1"
    },
    {
      role: "rollup",
      resolutionMode: "resolved_from_vite_package_anchor",
      packageIdentifier: "node_modules/rollup/package.json",
      entryIdentifier: "node_modules/rollup/dist/rollup.js",
      version: "4.62.3"
    },
    {
      role: "vite",
      resolutionMode: "explicit_workspace_relative_cli",
      packageIdentifier: "apps/web/node_modules/vite/package.json",
      entryIdentifier: "apps/web/node_modules/vite/bin/vite.js",
      version: "7.3.6"
    }
  ];
  if (value.resolutionAnchorIdentifier !== "apps/web/node_modules/vite/package.json"
      || value.viteCliIdentifier !== "apps/web/node_modules/vite/bin/vite.js"
      || value.viteConfigLoader !== "runner"
      || value.completeInstalledRuntimeDependencyClosureBound !== false
      || !Array.isArray(value.tools) || value.tools.length !== expected.length) {
    fail("RUNTIME_TOOL_RESOLUTION_INVALID");
  }
  const tools = [...value.tools].sort((a, b) => String(a.role).localeCompare(String(b.role), "en"));
  tools.forEach((entry, index) => {
    requireKeys(entry, ["entryIdentifier", "packageIdentifier", "resolutionMode", "role", "version"], "RUNTIME_TOOL_ENTRY_INVALID");
    if (canonicalCompact(entry) !== canonicalCompact(expected[index])) {
      fail("RUNTIME_TOOL_ENTRY_INVALID", expected[index].role);
    }
  });
  return deepFreeze({
    resolutionAnchorIdentifier: value.resolutionAnchorIdentifier,
    viteCliIdentifier: value.viteCliIdentifier,
    viteConfigLoader: "runner",
    tools: expected,
    completeInstalledRuntimeDependencyClosureBound: false
  });
}

function servedBodyManifestDigest(files) {
  return sha256(Buffer.from(SERVED_BODY_DIGEST_DOMAIN + canonicalCompact({ files }), "utf8"));
}

function servedResponseLedgerDigest(files) {
  return sha256(Buffer.from(
    `${SERVED_BODY_DIGEST_DOMAIN}response-counts\0${canonicalCompact({ files })}`,
    "utf8"
  ));
}

function normalizeServer(value, outputTree) {
  requireKeys(value, [
    "allServedBodiesMatchedOutputTree", "bodyMismatchResponseCount", "browserDefaultFaviconControl",
    "host", "origin",
    "perBrowserServedBodyManifestsEqual",
    "evidenceOnlyOutputBodyProbePaths", "evidenceOnlyOutputBodyProbePathsServedByBothBrowsers",
    "perBrowserEvidenceOnlyProbeBodyManifestsEqual", "perBrowserScenarioRuntimeBodyManifestsEqual",
    "projectHeaderName", "requiredRuntimePaths", "requiredRuntimePathsServedByBothBrowsers",
    "retained2025bChunkEvidenceOnlyBodyProbeObserved", "retained2025bChunkScenarioRuntimeRequested",
    "responseHeaderName", "responseHeaderValue", "scheme", "servedArtifactsByProject",
    "scenarioRuntimePaths", "scenarioRuntimePathsServedByBothBrowsers",
    "servedResponseCount", "singleOutputTreeServedWithoutRebuild", "totalControlledHttpResponseCount",
    "unattributedResponseCount",
    "unexpectedResponseCount", "unmarkedRetainedChunkResponseCount"
  ], "SERVER_OBSERVATION_INVALID");
  const requiredPaths = deriveVedicRequiredRuntimePaths(outputTree);
  const scenarioRuntimePaths = deriveVedicScenarioRuntimePaths(outputTree);
  const evidenceOnlyOutputBodyProbePaths = deriveVedicEvidenceOnlyOutputBodyProbePaths(outputTree);
  const faviconControl = value.browserDefaultFaviconControl;
  requireKeys(faviconControl, [
    "aggregateResponseCount", "cacheControl", "canonicalPath", "contentSecurityPolicy",
    "excludedFromOutputTree", "excludedFromServedBodyLedger", "noBody",
    "outputTreeResponseHeaderIncluded", "query", "requestMethod", "responseStatus",
    "responsesByProject", "xContentTypeOptions"
  ], "FAVICON_CONTROL_INVALID");
  const faviconProjects = Array.isArray(faviconControl.responsesByProject)
    ? [...faviconControl.responsesByProject].sort(
      (a, b) => String(a.projectName).localeCompare(String(b.projectName), "en")
    )
    : [];
  const normalizedFaviconProjects = faviconProjects.map((entry, index) => {
    requireKeys(entry, ["projectName", "responseCount"], "FAVICON_CONTROL_INVALID");
    if (entry.projectName !== ["chrome", "msedge"][index] || entry.responseCount !== 1) {
      fail("FAVICON_CONTROL_INVALID");
    }
    return { projectName: entry.projectName, responseCount: 1 };
  });
  if (faviconControl.requestMethod !== "GET" || faviconControl.canonicalPath !== "/favicon.ico"
      || faviconControl.query !== "" || faviconControl.responseStatus !== 204
      || faviconControl.noBody !== true || faviconControl.cacheControl !== "no-store"
      || faviconControl.contentSecurityPolicy
        !== "default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"
      || faviconControl.xContentTypeOptions !== "nosniff"
      || faviconControl.outputTreeResponseHeaderIncluded !== false
      || faviconControl.excludedFromOutputTree !== true
      || faviconControl.excludedFromServedBodyLedger !== true
      || faviconControl.aggregateResponseCount !== 2
      || normalizedFaviconProjects.length !== 2) {
    fail("FAVICON_CONTROL_INVALID");
  }
  const originString = typeof value.origin === "string" ? value.origin : "";
  const numericOriginPort = LOOPBACK_ORIGIN.test(originString)
    ? Number.parseInt(originString.slice(originString.lastIndexOf(":") + 1), 10)
    : Number.NaN;
  if (value.host !== "127.0.0.1" || value.scheme !== "http" || !LOOPBACK_ORIGIN.test(originString)
      || !Number.isSafeInteger(numericOriginPort) || numericOriginPort < 1 || numericOriginPort > 65_535
      || value.projectHeaderName !== "x-hakimi-vedic-evidence-project"
      || value.responseHeaderName !== "x-hakimi-vedic-output-tree-sha256"
      || value.responseHeaderValue !== outputTree.treeDigest
      || canonicalCompact(value.requiredRuntimePaths) !== canonicalCompact(requiredPaths)
      || canonicalCompact(value.scenarioRuntimePaths) !== canonicalCompact(scenarioRuntimePaths)
      || canonicalCompact(value.evidenceOnlyOutputBodyProbePaths) !== canonicalCompact(evidenceOnlyOutputBodyProbePaths)
      || value.requiredRuntimePathsServedByBothBrowsers !== true
      || value.scenarioRuntimePathsServedByBothBrowsers !== true
      || value.evidenceOnlyOutputBodyProbePathsServedByBothBrowsers !== true
      || value.retained2025bChunkScenarioRuntimeRequested !== false
      || value.retained2025bChunkEvidenceOnlyBodyProbeObserved !== true
      || !Number.isSafeInteger(value.servedResponseCount) || value.servedResponseCount < 10
      || !Number.isSafeInteger(value.totalControlledHttpResponseCount)
      || value.totalControlledHttpResponseCount < 12
      || value.unattributedResponseCount !== 0 || value.unexpectedResponseCount !== 0
      || value.bodyMismatchResponseCount !== 0
      || value.unmarkedRetainedChunkResponseCount !== 0
      || value.allServedBodiesMatchedOutputTree !== true
      || value.singleOutputTreeServedWithoutRebuild !== true
      || value.perBrowserServedBodyManifestsEqual !== true
      || value.perBrowserScenarioRuntimeBodyManifestsEqual !== true
      || value.perBrowserEvidenceOnlyProbeBodyManifestsEqual !== true
      || !Array.isArray(value.servedArtifactsByProject) || value.servedArtifactsByProject.length !== 2) {
    fail("SERVER_OBSERVATION_INVALID");
  }
  const outputByPath = new Map(outputTree.files.map((entry) => [entry.path, entry]));
  const projects = [...value.servedArtifactsByProject].sort((a, b) => String(a.projectName).localeCompare(String(b.projectName), "en"));
  const normalized = projects.map((entry, index) => {
    requireKeys(entry, [
      "combinedServedBodyManifestDigest", "evidenceOnlyProbeArtifactCount",
      "combinedServedResponseLedgerDigest", "evidenceOnlyProbeArtifacts",
      "evidenceOnlyProbeBodyManifestDigest", "evidenceOnlyProbeResponseLedgerDigest", "projectName",
      "scenarioRuntimeArtifactCount", "scenarioRuntimeArtifacts", "scenarioRuntimeBodyManifestDigest",
      "scenarioRuntimeResponseLedgerDigest", "servedResponseCount"
    ], "SERVED_PROJECT_INVALID");
    const projectName = ["chrome", "msedge"][index];
    if (entry.projectName !== projectName || !Number.isSafeInteger(entry.servedResponseCount)
        || entry.servedResponseCount < 5 || entry.scenarioRuntimeArtifactCount !== 4
        || entry.evidenceOnlyProbeArtifactCount !== 1
        || !Array.isArray(entry.scenarioRuntimeArtifacts) || entry.scenarioRuntimeArtifacts.length !== 4
        || !Array.isArray(entry.evidenceOnlyProbeArtifacts) || entry.evidenceOnlyProbeArtifacts.length !== 1) {
      fail("SERVED_PROJECT_INVALID");
    }
    const normalizeFiles = (input, allowedPaths) => input.map((file) => {
      requireKeys(file, ["bytes", "path", "responseCount", "sha256"], "SERVED_BODY_INVALID");
      const expected = outputByPath.get(file.path);
      if (!allowedPaths.includes(file.path) || !expected || expected.bytes !== file.bytes
          || expected.sha256 !== file.sha256 || !Number.isSafeInteger(file.responseCount)
          || file.responseCount < 1) {
        fail("SERVED_BODY_MISMATCH", `${projectName}:${file.path}`);
      }
      return { path: file.path, bytes: file.bytes, sha256: file.sha256, responseCount: file.responseCount };
    }).sort((a, b) => a.path.localeCompare(b.path, "en"));
    const runtimeFiles = normalizeFiles(entry.scenarioRuntimeArtifacts, scenarioRuntimePaths);
    const probeFiles = normalizeFiles(entry.evidenceOnlyProbeArtifacts, evidenceOnlyOutputBodyProbePaths);
    if (probeFiles[0]?.responseCount !== 1) fail("EVIDENCE_ONLY_PROBE_COUNT_INVALID", projectName);
    const combinedFiles = [...runtimeFiles, ...probeFiles].sort((a, b) => a.path.localeCompare(b.path, "en"));
    const identityOnly = (files) => files.map(({ path: filePath, bytes, sha256: digest }) => ({
      path: filePath,
      bytes,
      sha256: digest
    }));
    const expectedResponseCount = combinedFiles.reduce((sum, file) => sum + file.responseCount, 0);
    if (canonicalCompact(runtimeFiles.map((item) => item.path)) !== canonicalCompact(scenarioRuntimePaths)
        || canonicalCompact(probeFiles.map((item) => item.path)) !== canonicalCompact(evidenceOnlyOutputBodyProbePaths)
        || entry.servedResponseCount !== expectedResponseCount
        || entry.scenarioRuntimeBodyManifestDigest !== servedBodyManifestDigest(identityOnly(runtimeFiles))
        || entry.evidenceOnlyProbeBodyManifestDigest !== servedBodyManifestDigest(identityOnly(probeFiles))
        || entry.combinedServedBodyManifestDigest !== servedBodyManifestDigest(identityOnly(combinedFiles))
        || entry.scenarioRuntimeResponseLedgerDigest !== servedResponseLedgerDigest(runtimeFiles)
        || entry.evidenceOnlyProbeResponseLedgerDigest !== servedResponseLedgerDigest(probeFiles)
        || entry.combinedServedResponseLedgerDigest !== servedResponseLedgerDigest(combinedFiles)) {
      fail("SERVED_BODY_SET_INVALID", projectName);
    }
    return {
      projectName,
      servedResponseCount: entry.servedResponseCount,
      scenarioRuntimeArtifactCount: 4,
      scenarioRuntimeArtifacts: runtimeFiles,
      scenarioRuntimeBodyManifestDigest: entry.scenarioRuntimeBodyManifestDigest,
      scenarioRuntimeResponseLedgerDigest: entry.scenarioRuntimeResponseLedgerDigest,
      evidenceOnlyProbeArtifactCount: 1,
      evidenceOnlyProbeArtifacts: probeFiles,
      evidenceOnlyProbeBodyManifestDigest: entry.evidenceOnlyProbeBodyManifestDigest,
      evidenceOnlyProbeResponseLedgerDigest: entry.evidenceOnlyProbeResponseLedgerDigest,
      combinedServedBodyManifestDigest: entry.combinedServedBodyManifestDigest,
      combinedServedResponseLedgerDigest: entry.combinedServedResponseLedgerDigest
    };
  });
  if (normalized[0].scenarioRuntimeBodyManifestDigest !== normalized[1].scenarioRuntimeBodyManifestDigest
      || normalized[0].evidenceOnlyProbeBodyManifestDigest !== normalized[1].evidenceOnlyProbeBodyManifestDigest
      || normalized[0].combinedServedBodyManifestDigest !== normalized[1].combinedServedBodyManifestDigest) {
    fail("PER_BROWSER_SERVED_BODY_MISMATCH");
  }
  if (value.servedResponseCount !== normalized.reduce((sum, entry) => sum + entry.servedResponseCount, 0)) {
    fail("SERVED_RESPONSE_COUNT_MISMATCH");
  }
  if (value.totalControlledHttpResponseCount !== value.servedResponseCount + 2) {
    fail("CONTROLLED_HTTP_RESPONSE_COUNT_MISMATCH");
  }
  return deepFreeze({
    origin: value.origin,
    host: "127.0.0.1",
    scheme: "http",
    projectHeaderName: value.projectHeaderName,
    responseHeaderName: value.responseHeaderName,
    responseHeaderValue: value.responseHeaderValue,
    requiredRuntimePaths: requiredPaths,
    requiredRuntimePathsServedByBothBrowsers: true,
    scenarioRuntimePaths,
    scenarioRuntimePathsServedByBothBrowsers: true,
    evidenceOnlyOutputBodyProbePaths,
    evidenceOnlyOutputBodyProbePathsServedByBothBrowsers: true,
    retained2025bChunkScenarioRuntimeRequested: false,
    retained2025bChunkEvidenceOnlyBodyProbeObserved: true,
    browserDefaultFaviconControl: {
      requestMethod: "GET",
      canonicalPath: "/favicon.ico",
      query: "",
      responseStatus: 204,
      noBody: true,
      cacheControl: "no-store",
      contentSecurityPolicy: "default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
      xContentTypeOptions: "nosniff",
      outputTreeResponseHeaderIncluded: false,
      excludedFromOutputTree: true,
      excludedFromServedBodyLedger: true,
      responsesByProject: normalizedFaviconProjects,
      aggregateResponseCount: 2
    },
    servedResponseCount: value.servedResponseCount,
    totalControlledHttpResponseCount: value.totalControlledHttpResponseCount,
    unattributedResponseCount: 0,
    unexpectedResponseCount: 0,
    bodyMismatchResponseCount: 0,
    unmarkedRetainedChunkResponseCount: 0,
    servedArtifactsByProject: normalized,
    perBrowserServedBodyManifestsEqual: true,
    perBrowserScenarioRuntimeBodyManifestsEqual: true,
    perBrowserEvidenceOnlyProbeBodyManifestsEqual: true,
    allServedBodiesMatchedOutputTree: true,
    singleOutputTreeServedWithoutRebuild: true
  });
}

export function normalizeVedicRuntimeObservation(value) {
  requireKeys(value, [
    "browserProbes", "buildExecutionCount", "buildExitCode", "cleanup", "evidenceToolGraphDigestAfter",
    "evidenceToolGraphDigestBefore", "lockedBuildInputGraphDigestAfter", "lockedBuildInputGraphDigestBefore",
    "nodeVersion", "observedAt", "outputTreeAfter", "outputTreeBefore", "playwrightSummary",
    "playwrightVersion", "runtimeToolResolution", "server", "sourceGraphDigestAfter", "sourceGraphDigestBefore",
    "transformedModuleCount", "viteVersion"
  ], "RUNTIME_OBSERVATION_SHAPE_INVALID");
  const observedAt = requireIsoInstant(value.observedAt, "OBSERVED_AT_INVALID");
  if (typeof value.nodeVersion !== "string" || !VERSION.test(value.nodeVersion)
      || value.viteVersion !== "7.3.6" || value.playwrightVersion !== "1.62.1"
      || value.buildExecutionCount !== 1 || value.buildExitCode !== 0
      || value.transformedModuleCount !== 10
      || !SHA256.test(value.sourceGraphDigestBefore ?? "")
      || value.sourceGraphDigestAfter !== value.sourceGraphDigestBefore
      || !SHA256.test(value.lockedBuildInputGraphDigestBefore ?? "")
      || value.lockedBuildInputGraphDigestAfter !== value.lockedBuildInputGraphDigestBefore
      || !SHA256.test(value.evidenceToolGraphDigestBefore ?? "")
      || value.evidenceToolGraphDigestAfter !== value.evidenceToolGraphDigestBefore) {
    fail("RUNTIME_OBSERVATION_BOUNDARY_INVALID");
  }
  const outputTreeBefore = normalizeFileTree(value.outputTreeBefore, "OUTPUT_TREE_BEFORE_INVALID");
  const outputTreeAfter = normalizeFileTree(value.outputTreeAfter, "OUTPUT_TREE_AFTER_INVALID");
  if (canonicalCompact(outputTreeBefore) !== canonicalCompact(outputTreeAfter)) fail("OUTPUT_TREE_DRIFT");
  const server = normalizeServer(value.server, outputTreeBefore);
  const browserProbes = normalizeBrowserProbes(value.browserProbes);
  const playwrightSummary = normalizePlaywrightSummary(value.playwrightSummary);
  const runtimeToolResolution = normalizeRuntimeToolResolution(value.runtimeToolResolution);
  requireKeys(value.cleanup, [
    "browserVersionProbeHandlesClosed", "playwrightCliExited", "portReleased",
    "runnerControlledChildProcessesStopped", "serverStopped", "temporaryRootRemoved", "viteCliExited"
  ], "CLEANUP_INVALID");
  if (value.cleanup.browserVersionProbeHandlesClosed !== true || value.cleanup.playwrightCliExited !== true
      || value.cleanup.runnerControlledChildProcessesStopped !== true || value.cleanup.viteCliExited !== true
      || value.cleanup.portReleased !== true || value.cleanup.serverStopped !== true
      || value.cleanup.temporaryRootRemoved !== true) fail("CLEANUP_INVALID");
  return deepFreeze({
    observedAt,
    nodeVersion: value.nodeVersion,
    viteVersion: "7.3.6",
    playwrightVersion: "1.62.1",
    buildExecutionCount: 1,
    buildExitCode: 0,
    transformedModuleCount: 10,
    sourceGraphDigestBefore: value.sourceGraphDigestBefore,
    sourceGraphDigestAfter: value.sourceGraphDigestAfter,
    lockedBuildInputGraphDigestBefore: value.lockedBuildInputGraphDigestBefore,
    lockedBuildInputGraphDigestAfter: value.lockedBuildInputGraphDigestAfter,
    evidenceToolGraphDigestBefore: value.evidenceToolGraphDigestBefore,
    evidenceToolGraphDigestAfter: value.evidenceToolGraphDigestAfter,
    outputTreeBefore,
    outputTreeAfter,
    server,
    browserProbes,
    runtimeToolResolution,
    playwrightSummary,
    cleanup: {
      viteCliExited: true,
      playwrightCliExited: true,
      browserVersionProbeHandlesClosed: true,
      runnerControlledChildProcessesStopped: true,
      serverStopped: true,
      portReleased: true,
      temporaryRootRemoved: true
    }
  });
}

export function buildExpectedVedicSameArtifactCandidate(rootOrObservation, maybeObservation) {
  const root = maybeObservation === undefined ? process.cwd() : rootOrObservation;
  const observation = maybeObservation === undefined ? rootOrObservation : maybeObservation;
  const resolvedRoot = workspaceRoot(root);
  const runtimeObservation = normalizeVedicRuntimeObservation(observation);
  const source = collectVedicAuthoredBuildSourceSnapshot(resolvedRoot);
  const tools = collectVedicEvidenceToolSnapshot(resolvedRoot);
  const locked = collectVedicLockedBuildInputSnapshot(resolvedRoot);
  const formalContext = collectVedicFormalContextSnapshot(resolvedRoot);
  const e2eInspection = inspectVedicE2EAssertionContract(resolvedRoot);
  if (runtimeObservation.sourceGraphDigestBefore !== source.graphDigest
      || runtimeObservation.evidenceToolGraphDigestBefore !== tools.graphDigest
      || runtimeObservation.lockedBuildInputGraphDigestBefore !== locked.graphDigest) {
    fail("CURRENT_GRAPH_BINDING_INVALID");
  }
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "vedic_civil_time_same_artifact_edge_chrome_browser_observation_child",
    childId: VEDIC_SAME_ARTIFACT_CHILD_ID,
    status: "isolated_fact_only_single_build_dual_browser_observation_not_admitted",
    createdAt: runtimeObservation.observedAt,
    activeAdmissionEffect: "none",
    systemIdentity: {
      contractSystemId: "vedic",
      productIdentity: null,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      projectDefaultReleaseGovernanceContext: { releaseIdentity: "legacy-v13", targetSchema: 13, migrationId: null },
      projectDefaultReleaseGovernanceInherited: false
    },
    expectedAuthoredBuildInputClosure: {
      ...source,
      closureKind: "static_audited_expected_pre_post_current_not_vite_module_load_telemetry",
      prePostEndpointDigestEqual: true,
      viteMainAndWorkerModuleLoadTelemetryEstablished: false,
      completeInstalledDependencyRuntimeClosureBound: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    lockedBuildInputSnapshot: {
      ...locked,
      prePostEndpointDigestEqual: true,
      exactBaseConfigRolePathBytesAndSha256Verified: true,
      baseMainBuildStartExactPreflightConfigured: true,
      workerSameBufferVerificationEstablished: false,
      intervalLockEstablished: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    evidenceToolingSnapshot: {
      ...tools,
      prePostEndpointDigestEqual: true,
      viteEsbuildAndRollupStableResolutionIdentifiersObserved: true,
      completeNodePlaywrightViteRuntimeClosureBound: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    e2eAssertionContract: {
      contractId: "hakimi.vedic.civil-time.same-artifact-five-scenarios/1",
      scenarioCountPerBrowser: 5,
      expectedOutcomeCount: 10,
      scenarios: VEDIC_SCENARIOS,
      exactFileInspection: e2eInspection,
      exactSecondHistoricalOffsetRangeGuardUnknownZoneOrResponsiveRunReceiptEstablished: false,
      generalControlFlowEquivalenceEstablished: false
    },
    formalContext,
    runtimeObservation,
    browserEvidenceBoundary: {
      exactSingleBuildExecuted: true,
      sameOutputTreeServedToBothBrowsers: true,
      perBrowserActualServedBodyIdentitiesObserved: true,
      retainedIanaChunkBodyObservedByEvidenceOnlyNavigation: true,
      retained2025bChunkScenarioRuntimeRequested: false,
      retainedIanaChunkExecutedByCivilResolverEstablished: false,
      exactBrowserVersionsObservedBeforeAndAfterMatrix: true,
      chromeScenarioOutcomes: 5,
      edgeScenarioOutcomes: 5,
      totalPassedScenarioOutcomes: 10,
      isolatedLoopbackBrowserRuntimeObservationEstablished: true,
      formalChromeBrowserReceiptIssued: false,
      formalEdgeBrowserReceiptIssued: false,
      productionBrowserRuntimeEvidenceEstablished: false,
      publicHostValidated: false,
      pwaOrServiceWorkerValidated: false
    },
    storageBackupRecoveryBoundary: {
      storageProbePerformed: false,
      storageMutationObserved: null,
      independentStorageBackendSelected: false,
      independentStorageNamespaceSelected: false,
      backupExecutionCount: 0,
      recoveryExecutionCount: 0,
      rollbackExecutionCount: 0,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      uiViewGenerationIsProductMutationEpoch: false,
      productionBackupRecoveryCertified: false
    },
    dataHandling: {
      syntheticInputsOnly: true,
      actualPersonDataEntered: false,
      candidateAnonymous: false,
      rawCivilTimeInputIncluded: false,
      utcInstantOrOffsetIncluded: false,
      requestOrProjectionDigestIncluded: false,
      rawPlaywrightReportIncluded: false,
      rawStdoutOrStderrIncluded: false,
      errorOrAttachmentIncluded: false,
      screenshotTraceVideoOrDownloadIncluded: false,
      temporaryOrAbsolutePathIncluded: false,
      safeToLog: false,
      safeToPersist: false,
      safeToPublish: false
    },
    gateSummary: {
      bindingRequired: 38,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      requirementsUniverseClosed: false
    },
    formalReceiptCounts: {
      releaseEvidenceReceipts: 0,
      productionBrowserReceipts: 0,
      artifactIdentityReceipts: 0,
      buildReceipts: 0,
      runtimeExecutionReceipts: 0,
      deploymentReceipts: 0,
      rollbackReceipts: 0,
      expertReviewReceipts: 0,
      rightsLegalDecisionReceipts: 0
    },
    evidenceAccounts: [
      { accountId: "engineering_evidence", state: "current_single_build_dual_browser_matrix_mechanically_observed" },
      { accountId: "browser_runtime_evidence", state: "isolated_loopback_current_output_tree_only" },
      { accountId: "content_truth", state: "not_established" },
      { accountId: "expert_truth", state: "not_established" },
      { accountId: "rights_legal_judgment", state: "not_established" },
      { accountId: "release_readiness", state: "not_ready" },
      { accountId: "public_release_authorization", state: "not_authorized" }
    ],
    authorityBoundary: FALSE_AUTHORITY,
    observationBoundary: {
      automatedSameRunLineageMechanicallyObserved: true,
      toolAttestationEstablished: false,
      completeSourceToBuildAttestationEstablished: false,
      viteMainAndWorkerModuleLoadTelemetryEstablished: false,
      outputTreePrePostDigestEqual: true,
      sourceAndToolGraphsPrePostDigestEqual: true,
      repositoryCrossFileAtomicSnapshot: false,
      repositoryIntervalMutationExcluded: false,
      repositoryAbaExcluded: false,
      mutationEpochClaimed: false,
      mutationEpochReceipt: null,
      digestIsDigitalSignature: false,
      signerIdentityEstablished: false,
      historicalRuntimeCanBeReverifiedFromCandidateAlone: false,
      cleanupObservedAtIssuanceOnly: true
    },
    doesNotEstablish: [
      "formal_product_manifest_parent_or_registry_integration",
      "formal_release_evidence_or_production_browser_receipts",
      "pwa_service_worker_public_host_deployment_or_rollback",
      "storage_backend_namespace_backup_recovery_or_product_mutation_epoch",
      "content_truth_expert_truth_source_freeze_or_rights_legal_judgment",
      "release_readiness_public_deployment_or_public_release_authorization",
      "cross_file_atomicity_interval_integrity_aba_exclusion_or_trusted_tool_attestation"
    ]
  };
  return deepFreeze({
    ...unsigned,
    observationDigest: sha256(Buffer.from(CANDIDATE_DIGEST_DOMAIN + canonicalCompact(unsigned), "utf8"))
  });
}

export function serializeVedicSameArtifactCandidate(candidate) {
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

export function verifyVedicSameArtifactCandidateObject(root, value) {
  const resolvedRoot = workspaceRoot(root);
  const captured = captureJsonData(value, "Vedic same-artifact candidate");
  const expected = buildExpectedVedicSameArtifactCandidate(resolvedRoot, captured.runtimeObservation);
  if (canonicalCompact(captured) !== canonicalCompact(expected)) {
    fail("CANDIDATE_CURRENT_REBUILD_MISMATCH");
  }
  CANDIDATE_BRAND.add(expected);
  return expected;
}

export function loadVedicSameArtifactCandidate(root = process.cwd()) {
  const resolvedRoot = workspaceRoot(root);
  const candidateBytes = readStableFile(
    resolveWorkspacePath(resolvedRoot, VEDIC_SAME_ARTIFACT_CANDIDATE_PATH),
    VEDIC_SAME_ARTIFACT_CANDIDATE_PATH
  );
  const parsed = parseStrictJsonBytes(candidateBytes, VEDIC_SAME_ARTIFACT_CANDIDATE_PATH);
  const expected = verifyVedicSameArtifactCandidateObject(resolvedRoot, parsed);
  const expectedBytes = Buffer.from(serializeVedicSameArtifactCandidate(expected), "utf8");
  if (!candidateBytes.equals(expectedBytes)) fail("CANDIDATE_CURRENT_REBUILD_MISMATCH");
  return expected;
}

export function isVerifiedVedicSameArtifactCandidate(value) {
  return value !== null && typeof value === "object" && CANDIDATE_BRAND.has(value) && Object.isFrozen(value);
}

export function summarizeVedicSameArtifactCandidate(candidate) {
  if (!isVerifiedVedicSameArtifactCandidate(candidate)) fail("CANDIDATE_PRIVATE_BRAND_REQUIRED");
  return deepFreeze({
    ok: true,
    childId: candidate.childId,
    observationDigest: candidate.observationDigest,
    createdAt: candidate.createdAt,
    expectedAuthoredBuildInputFileCount: candidate.expectedAuthoredBuildInputClosure.fileCount,
    lockedBuildInputCount: candidate.lockedBuildInputSnapshot.inputCount,
    evidenceToolFileCount: candidate.evidenceToolingSnapshot.fileCount,
    outputFileCount: candidate.runtimeObservation.outputTreeAfter.fileCount,
    outputTreeDigest: candidate.runtimeObservation.outputTreeAfter.treeDigest,
    browserVersions: Object.fromEntries(candidate.runtimeObservation.browserProbes.map((entry) => [entry.projectName, entry.versionAfter])),
    passedScenarioOutcomes: candidate.runtimeObservation.playwrightSummary.outcomeCount,
    perBrowserServedBodyManifestsEqual: candidate.runtimeObservation.server.perBrowserServedBodyManifestsEqual,
    cleanup: candidate.runtimeObservation.cleanup,
    gateSummary: candidate.gateSummary,
    authorityBoundary: candidate.authorityBoundary
  });
}

function requireKeys(value, expectedKeys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (canonicalCompact(keys) !== canonicalCompact(expected)) fail(code);
}

function requireIsoInstant(value, code) {
  if (typeof value !== "string" || !ISO_INSTANT.test(value) || new Date(value).toISOString() !== value) fail(code);
  return value;
}

function rejectDuplicateJsonKeys(text, label) {
  let index = 0;
  parseValue();
  skipWhitespace();
  if (index !== text.length) fail("JSON_PARSE_FAILED", label);

  function skipWhitespace() {
    while (index < text.length && /[\u0009\u000a\u000d\u0020]/u.test(text[index])) index += 1;
  }
  function parseValue() {
    skipWhitespace();
    const character = text[index];
    if (character === "{") return parseObject();
    if (character === "[") return parseArray();
    if (character === "\"") return parseString();
    const match = text.slice(index).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u);
    if (!match) fail("JSON_PARSE_FAILED", label);
    index += match[0].length;
  }
  function parseObject() {
    index += 1;
    skipWhitespace();
    const keys = new Set();
    if (text[index] === "}") { index += 1; return; }
    while (index < text.length) {
      skipWhitespace();
      if (text[index] !== "\"") fail("JSON_PARSE_FAILED", label);
      const key = parseString();
      if (keys.has(key)) fail("JSON_DUPLICATE_KEY", `${label}:${key}`);
      keys.add(key);
      skipWhitespace();
      if (text[index] !== ":") fail("JSON_PARSE_FAILED", label);
      index += 1;
      parseValue();
      skipWhitespace();
      if (text[index] === "}") { index += 1; return; }
      if (text[index] !== ",") fail("JSON_PARSE_FAILED", label);
      index += 1;
    }
    fail("JSON_PARSE_FAILED", label);
  }
  function parseArray() {
    index += 1;
    skipWhitespace();
    if (text[index] === "]") { index += 1; return; }
    while (index < text.length) {
      parseValue();
      skipWhitespace();
      if (text[index] === "]") { index += 1; return; }
      if (text[index] !== ",") fail("JSON_PARSE_FAILED", label);
      index += 1;
    }
    fail("JSON_PARSE_FAILED", label);
  }
  function parseString() {
    const start = index;
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === "\"") {
        index += 1;
        try { return JSON.parse(text.slice(start, index)); } catch { fail("JSON_PARSE_FAILED", label); }
      }
      if (character === "\\") index += 2;
      else { if (character < " ") fail("JSON_PARSE_FAILED", label); index += 1; }
    }
    fail("JSON_PARSE_FAILED", label);
  }
}

function captureJsonData(value, label, seen = new WeakSet(), depth = 0) {
  if (depth > 100) fail("JSON_DEPTH_INVALID", label);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail("JSON_NUMBER_INVALID", label);
    return value;
  }
  if (typeof value !== "object" || seen.has(value)) fail("JSON_VALUE_INVALID", label);
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const symbols = Object.getOwnPropertySymbols(value);
  if (symbols.length !== 0) fail("JSON_SYMBOL_INVALID", label);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Object.keys(value).length !== value.length) fail("JSON_ARRAY_INVALID", label);
    return value.map((_, index) => {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) fail("JSON_ARRAY_INVALID", label);
      return captureJsonData(descriptor.value, label, seen, depth + 1);
    });
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail("JSON_OBJECT_PROTOTYPE_INVALID", label);
  const output = {};
  for (const key of Object.keys(value)) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true
        || key === "__proto__" || key === "prototype" || key === "constructor") fail("JSON_OBJECT_INVALID", label);
    Object.defineProperty(output, key, {
      value: captureJsonData(descriptor.value, label, seen, depth + 1),
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return output;
}

function canonicalValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  const output = {};
  for (const key of Object.keys(value).sort()) output[key] = canonicalValue(value[key]);
  return output;
}

function canonicalCompact(value) {
  return JSON.stringify(canonicalValue(value));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

export const vedicSameArtifactTestOnly = deepFreeze({
  captureJsonData,
  canonicalCompact,
  parseStrictJsonBytes,
  verifyVedicE2EAssertionContractBindings,
  servedBodyManifestDigest,
  servedResponseLedgerDigest,
  normalizePlaywrightSummary,
  normalizeBrowserProbes,
  normalizeRuntimeToolResolution,
  normalizeServer
});
