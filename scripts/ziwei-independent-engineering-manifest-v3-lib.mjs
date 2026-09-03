import { createHash } from "node:crypto";

import {
  INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
  buildCurrentIndependentDomainManifest,
  canonicalStringifyIndependentDomainManifest,
  computeIndependentDomainManifestDigest,
  independentDomainManifestTestOnly as domainTestOnly,
  parseIndependentDomainManifestJsonBytes,
  readIndependentDomainManifest
} from "./independent-domain-release-manifest-lib.mjs";
import {
  isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate,
  loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate
} from "./ziwei-expert-promotion-boundary-identity-drift-receipt-candidate-lib.mjs";
import {
  isVerifiedZiweiSameArtifactBrowserObservationChildV11,
  loadZiweiSameArtifactBrowserObservationChildV11
} from "./ziwei-same-artifact-browser-observation-child-v1-1-lib.mjs";

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const BUFFER_BYTE_LENGTH = Buffer.byteLength;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_BUFFER = Buffer;
const NATIVE_MAP = Map;
const NATIVE_SET = Set;
const NATIVE_WEAK_SET = WeakSet;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const MAP_GET = Map.prototype.get;
const MAP_HAS = Map.prototype.has;
const MAP_SET = Map.prototype.set;
const REFLECT_APPLY = Reflect.apply;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;

const HASH_SAMPLE = createHash("sha256");
const HASH_PROTOTYPE = Object.getPrototypeOf(HASH_SAMPLE);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
REFLECT_APPLY(HASH_DIGEST, HASH_SAMPLE, ["hex"]);

export const ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH =
  "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v3.json";

const MANIFEST_ID =
  "hakimi.ziwei-doushu.definition-and-browser-child-selected-path-machine-identity-manifest/3.0.0";
const RECORD_TYPE =
  "ziwei_definition_and_browser_child_selected_path_machine_identity_manifest_v3";
const STATUS =
  "current_definition_and_browser_child_selected_path_machine_identity_zero_admission_effect";
const CREATED_AT = "2026-09-01T11:44:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.ziwei-doushu.definition-and-browser-child-selected-path-machine-identity-manifest.v3";
const SELECTED_PATH_DIGEST_DOMAIN =
  "hakimi.ziwei-doushu.definition-and-browser-child-selected-path-set.v3";
const COMPONENT_DIGEST_DOMAIN =
  "hakimi.ziwei-doushu.definition-membership-component.v3";
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_COMPONENT_FILE_BYTES = 5 * 1024 * 1024;

const EXPECTED_HISTORICAL_V2 = OBJECT_FREEZE({
  path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json",
  rawBytes: 17_968,
  rawSha256: "f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867",
  manifestId:
    "hakimi.ziwei-doushu.isolated-engineering-domain-release-manifest/2.0.0",
  manifestDigest:
    "f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e",
  createdAt: "2026-08-31T06:00:00.000Z"
});

const EXPECTED_CURRENT_OLD_SCHEMA_PROJECTION = OBJECT_FREEZE({
  manifestDigest:
    "24ddffd0caebbce4f800154ad70fb24e441e67b3580785b798044b0393d70b66",
  componentCount: 9,
  componentFileReferences: 59,
  uniquePhysicalPaths: 46,
  changedComponentCount: 5,
  unchangedComponentCount: 4
});

const EXPECTED_DRIFT_RECEIPT = OBJECT_FREEZE({
  path:
    "content/system-admission/ziwei-expert-promotion-boundary-identity-drift-receipt-candidate.v1.0.0.json",
  rawBytes: 7_905,
  rawSha256: "c6728e943d713cf63be2b1d7e01d5170cf2a2b7b308e332abbbc53ff1ab37348",
  candidateId:
    "hakimi.ziwei.expert-promotion-boundary.identity-drift-receipt-candidate/1.0.0",
  receiptDigest:
    "09d86df6f23d4c1cbc0a76df359dd0738f793de5bdf84e4784b0620a3a6f05bb"
});

const EXPECTED_BROWSER_CHILD = OBJECT_FREEZE({
  path: "content/system-admission/ziwei-same-artifact-browser-observation-child.v1.1.0.json",
  rawBytes: 57_541,
  rawSha256: "da3c5da3b0e587e826235af9401df2b5b48618c7e37f89ede3d5a5deb7ed80c5",
  childId: "hakimi.ziwei.same-artifact-browser-observation/1.1.0",
  childDigest:
    "08d717d62f84dc3146069d387904aa7e8626cca2f12594154b5e5002b2e355e7",
  sourceGraphFileCount: 50,
  sourceGraphDigest:
    "d3068988b677f78595ae0ef666070ac85d26505b972c757c1089fb5d719cc34d",
  evidenceToolGraphDigest:
    "4518aee1c861682192f4a8f1a5b777c5a2db0a3986b6e447e559fe2df92f4755",
  outputTreeDigest:
    "bc8ee283121de68f60290ee08930e41add28e87447b7830212fd49946307a5a6"
});

const CONTRACT_SOURCE = OBJECT_FREEZE({
  path: "packages/ziwei-doushu-contracts-draft/src/index.ts",
  persistedRawBytes: 45_329,
  persistedRawSha256: "0474abe7170f17352efd9b0d0f2735f2edbec049bb331441b7bd77ff2b79acc0",
  currentRawBytes: 46_181,
  currentRawSha256: "2a9555dba509873e6c436dcdc9121fcd90e943d880984581fbff865feca15685"
});

const COMPONENT_ORDER = OBJECT_FREEZE([
  "execution_rules",
  "interpretation_rules",
  "input_policy",
  "fact_contract",
  "source_bundle",
  "rights_bundle",
  "expert_review_bundle",
  "high_risk_policy",
  "report_contract"
]);

const CHANGED_COMPONENT_IDS = OBJECT_FREEZE([
  "execution_rules",
  "interpretation_rules",
  "input_policy",
  "fact_contract",
  "high_risk_policy"
]);

const UNCHANGED_COMPONENT_IDS = OBJECT_FREEZE([
  "source_bundle",
  "rights_bundle",
  "expert_review_bundle",
  "report_contract"
]);

const COMPONENT_STATUS = OBJECT_FREEZE({
  execution_rules:
    "definition_declared_membership_only_not_semantically_complete_execution_rules",
  interpretation_rules:
    "definition_declared_membership_only_not_semantically_complete_interpretation_rules",
  input_policy:
    "definition_declared_membership_only_not_semantically_complete_input_policy",
  fact_contract:
    "definition_declared_membership_only_not_semantically_complete_fact_contract",
  source_bundle: "incomplete_source_requirements_and_observations_only",
  rights_bundle: "incomplete_rights_observations_not_legal_clearance",
  expert_review_bundle: "absent_no_external_verified_expert_review_instance",
  high_risk_policy: "incomplete_draft_policy_and_selected_egress_slice_only",
  report_contract: "incomplete_isolated_workspace_preview_only"
});

const KNOWN_OMITTED_BY_ROOT = OBJECT_FREEZE({
  "packages/ziwei-doushu-contracts-draft": OBJECT_FREEZE([
    "packages/ziwei-doushu-contracts-draft/src/index.test.ts"
  ]),
  "packages/ziwei-iztro-adapter-draft": OBJECT_FREEZE([
    "packages/ziwei-iztro-adapter-draft/browser-preview/index.html",
    "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-2025.json",
    "packages/ziwei-iztro-adapter-draft/scripts/audit-hko-calendar-boundary-matrix.ts",
    "packages/ziwei-iztro-adapter-draft/src/browser-artifact.test.ts",
    "packages/ziwei-iztro-adapter-draft/src/browser-preview/styles.css",
    "packages/ziwei-iztro-adapter-draft/src/core-minor-star-sanfang-review-feedback.test.ts",
    "packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.test.ts",
    "packages/ziwei-iztro-adapter-draft/src/demo.ts",
    "packages/ziwei-iztro-adapter-draft/src/high-risk-expression-egress-policy.test.ts",
    "packages/ziwei-iztro-adapter-draft/src/high-risk-expression-egress-view.test.ts",
    "packages/ziwei-iztro-adapter-draft/src/index.test.ts",
    "packages/ziwei-iztro-adapter-draft/src/natal-transformation-palace-review-feedback.test.ts",
    "packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.test.ts",
    "packages/ziwei-iztro-adapter-draft/tsconfig.browser-preview.json"
  ]),
  "packages/ziwei-fortel-differential-draft": OBJECT_FREEZE([
    "packages/ziwei-fortel-differential-draft/src/contract-bridge.ts",
    "packages/ziwei-fortel-differential-draft/src/demo.ts",
    "packages/ziwei-fortel-differential-draft/src/fortel-worker-entry.mjs",
    "packages/ziwei-fortel-differential-draft/src/index.test.ts",
    "packages/ziwei-fortel-differential-draft/src/index.ts",
    "packages/ziwei-fortel-differential-draft/src/iztro-adapter-bridge.ts",
    "packages/ziwei-fortel-differential-draft/tsconfig.json"
  ]),
  "packages/ziwei-workspace-artifact-draft": OBJECT_FREEZE([
    "packages/ziwei-workspace-artifact-draft/e2e/core-minor-sanfang-review-v013.spec.ts",
    "packages/ziwei-workspace-artifact-draft/e2e/same-artifact-summary-reporter.ts",
    "packages/ziwei-workspace-artifact-draft/e2e/workspace-browser-gate.spec.ts",
    "packages/ziwei-workspace-artifact-draft/playwright.same-artifact-evidence.config.ts",
    "packages/ziwei-workspace-artifact-draft/playwright.v013.config.ts",
    "packages/ziwei-workspace-artifact-draft/playwright.workspace.config.ts",
    "packages/ziwei-workspace-artifact-draft/src/browser-persistence.test.ts",
    "packages/ziwei-workspace-artifact-draft/src/demo.ts",
    "packages/ziwei-workspace-artifact-draft/src/index.test.ts",
    "packages/ziwei-workspace-artifact-draft/src/iztro-adapter-bridge.ts",
    "packages/ziwei-workspace-artifact-draft/tsconfig.browser-app.json"
  ])
});

const RUNTIME_DIRECTORIES_OUTSIDE_SELECTED_IDENTITY = OBJECT_FREEZE([
  "packages/ziwei-iztro-adapter-draft/dist",
  "packages/ziwei-workspace-artifact-draft/dist",
  "packages/ziwei-workspace-artifact-draft/node_modules"
]);

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 68_696,
  rawSha256: "6a95c2eca3524763c20b03d389c4d7d14d0639bafb6db31c361b384946430396",
  manifestDigest: "7018bf1df4bec8f6c753a11f72bcb2f3f2d63f3d46b194ef27fc2991dd06cb60"
});

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class ZiweiIndependentEngineeringManifestV3Error extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ZiweiIndependentEngineeringManifestV3Error";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new ZiweiIndependentEngineeringManifestV3Error(code, message, options);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePathEntries(left, right) {
  return compareCodeUnits(left.path, right.path);
}

function canonicalValue(value) {
  try {
    return REFLECT_APPLY(JSON_PARSE, JSON, [
      canonicalStringifyIndependentDomainManifest(value)
    ]);
  } catch (cause) {
    if (cause instanceof ZiweiIndependentEngineeringManifestV3Error) throw cause;
    fail("NON_CANONICAL_JSON_VALUE", "Ziwei v3 只接受被动、无别名的 JSON 值。", { cause });
  }
}

function deepFreeze(value, seen = new NATIVE_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  for (const key of OBJECT_KEYS(descriptors)) {
    const descriptor = descriptors[key];
    if (!REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_OBJECT", "Ziwei v3 结果不得包含 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function exactJson(left, right) {
  return canonicalStringifyIndependentDomainManifest(left)
    === canonicalStringifyIndependentDomainManifest(right);
}

function sha256Text(text) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function domainDigest(domain, value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0", "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [
    canonicalStringifyIndependentDomainManifest(value),
    "utf8"
  ]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function findDefinition() {
  const definition = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.find(
    (entry) => entry.productSystemId === "ziwei-doushu"
  );
  if (!definition
    || definition.manifestPath !== EXPECTED_HISTORICAL_V2.path
    || definition.manifestSchemaVersion !== "2.0.0"
    || definition.manifestId !== EXPECTED_HISTORICAL_V2.manifestId
    || definition.bindingRequired !== 27
    || definition.components?.length !== 9) {
    fail("OLD_DEFINITION_MISMATCH", "Ziwei old-schema fixed definition identity drifted.");
  }
  return definition;
}

function requireVerifiedDriftReceipt(value) {
  if (!isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(value)) {
    fail(
      "DRIFT_RECEIPT_PRIVATE_BRAND_REQUIRED",
      "Ziwei v3 只接受 drift receipt fixed-path full-loader 私有品牌。"
    );
  }
  if (value.candidateId !== EXPECTED_DRIFT_RECEIPT.candidateId
    || value.receiptDigest !== EXPECTED_DRIFT_RECEIPT.receiptDigest
    || value.activeAdmissionEffect !== "none"
    || value.manifestDrift?.currentCandidateManifestDigest
      !== EXPECTED_CURRENT_OLD_SCHEMA_PROJECTION.manifestDigest
    || value.manifestDrift?.changedComponentCount !== 5
    || value.manifestDrift?.unchangedComponentCount !== 4
    || value.manifestDrift?.oneSourceIdentityFansOutToFiveComponentDigests !== true
    || value.manifestDrift?.fiveIndependentSemanticChangesClaimed !== false
    || !exactJson(
      value.manifestDrift?.changedComponents?.map((entry) => entry.componentId),
      CHANGED_COMPONENT_IDS
    )
    || !exactJson(value.manifestDrift?.unchangedComponentIds, UNCHANGED_COMPONENT_IDS)
    || !exactJson(value.scope?.sourceChange, {
      ...CONTRACT_SOURCE,
      uniqueRootSourceClaimedForObservedComponentFanout: true
    })
    || value.gateSummary?.admissionGatesSatisfied !== 0
    || value.gateSummary?.bindingRequired !== 27
    || value.gateSummary?.bindingFrozenVerified !== 0
    || value.gateSummary?.independentExpertsRequired !== 2
    || value.gateSummary?.independentExpertReviewsVerified !== 0
    || value.authorityBoundary?.contentTruthEstablished !== false
    || value.authorityBoundary?.expertTruthEstablished !== false
    || value.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || value.authorityBoundary?.releaseReady !== false
    || value.authorityBoundary?.publicReleaseAuthorized !== false) {
    fail("DRIFT_RECEIPT_BOUNDARY_MISMATCH", "Ziwei drift receipt 身份或全红边界漂移。");
  }
  return value;
}

function requireVerifiedBrowserChild(value) {
  if (!isVerifiedZiweiSameArtifactBrowserObservationChildV11(value)) {
    fail(
      "BROWSER_CHILD_PRIVATE_BRAND_REQUIRED",
      "Ziwei v3 只接受 browser child v1.1 fixed-path full-loader 私有品牌。"
    );
  }
  const sourceGraph = value.currentBaseObservation?.buildSourceSnapshot;
  if (value.childId !== EXPECTED_BROWSER_CHILD.childId
    || value.childDigest !== EXPECTED_BROWSER_CHILD.childDigest
    || value.activeAdmissionEffect !== "none"
    || sourceGraph?.fileCount !== EXPECTED_BROWSER_CHILD.sourceGraphFileCount
    || sourceGraph?.graphDigest !== EXPECTED_BROWSER_CHILD.sourceGraphDigest
    || sourceGraph?.files?.length !== EXPECTED_BROWSER_CHILD.sourceGraphFileCount
    || value.browserEvidenceBoundary?.sourceGraphDigest
      !== EXPECTED_BROWSER_CHILD.sourceGraphDigest
    || value.browserEvidenceBoundary?.evidenceToolGraphDigest
      !== EXPECTED_BROWSER_CHILD.evidenceToolGraphDigest
    || value.browserEvidenceBoundary?.outputTreeDigest
      !== EXPECTED_BROWSER_CHILD.outputTreeDigest
    || value.browserEvidenceBoundary?.chromeScenarioOutcomes !== 14
    || value.browserEvidenceBoundary?.edgeScenarioOutcomes !== 14
    || value.browserEvidenceBoundary?.totalPassedScenarioOutcomes !== 28
    || value.browserEvidenceBoundary?.productionBrowserRuntimeEvidenceEstablished !== false
    || value.browserEvidenceBoundary?.pwaOrServiceWorkerValidated !== false
    || value.browserEvidenceBoundary?.publicHostValidated !== false
    || value.gateSummary?.admissionGatesSatisfied !== 0
    || value.gateSummary?.bindingRequired !== 27
    || value.gateSummary?.bindingFrozenVerified !== 0
    || value.gateSummary?.independentExpertsRequired !== 2
    || value.gateSummary?.independentExpertReviewsVerified !== 0
    || value.manifestBoundary?.historicalManifestMechanicallyCurrent !== false
    || value.manifestBoundary?.currentCandidateManifestPersisted !== false
    || value.manifestBoundary?.currentFullEngineeringManifestEstablished !== false
    || value.manifestBoundary?.historicalManifest?.currentCandidateManifestDigest
      !== EXPECTED_CURRENT_OLD_SCHEMA_PROJECTION.manifestDigest) {
    fail("BROWSER_CHILD_BOUNDARY_MISMATCH", "Ziwei browser child 身份、图或全红边界漂移。");
  }
  return value;
}

function assertHistoricalManifest(manifest, snapshot) {
  if (snapshot.path !== EXPECTED_HISTORICAL_V2.path
    || snapshot.rawBytes !== EXPECTED_HISTORICAL_V2.rawBytes
    || snapshot.rawSha256 !== EXPECTED_HISTORICAL_V2.rawSha256
    || manifest.manifestId !== EXPECTED_HISTORICAL_V2.manifestId
    || manifest.manifestDigest !== EXPECTED_HISTORICAL_V2.manifestDigest
    || computeIndependentDomainManifestDigest(manifest)
      !== EXPECTED_HISTORICAL_V2.manifestDigest
    || manifest.createdAt !== EXPECTED_HISTORICAL_V2.createdAt
    || manifest.components?.length !== 9
    || manifest.gateState?.bindingRequired !== 27
    || manifest.gateState?.bindingFrozenVerified !== 0
    || manifest.gateState?.independentExpertsRequired !== 2
    || manifest.gateState?.independentExpertReviewsVerified !== 0
    || manifest.releaseGovernance?.releaseIdentity !== null
    || manifest.releaseGovernance?.targetSchema !== null
    || manifest.releaseGovernance?.migrationId !== null
    || manifest.authorityBoundary?.releaseReady !== false
    || manifest.authorityBoundary?.publicReleaseAuthorized !== false) {
    fail("HISTORICAL_MANIFEST_IDENTITY_MISMATCH", "Ziwei historical v2 raw/self 或全红边界漂移。");
  }
}

function collectDefinitionProjectionStats(historical, current) {
  const historicalById = new NATIVE_MAP();
  const currentById = new NATIVE_MAP();
  const definitionPaths = new NATIVE_SET();
  let referenceCount = 0;
  for (let index = 0; index < COMPONENT_ORDER.length; index += 1) {
    const componentId = COMPONENT_ORDER[index];
    const oldComponent = historical.components[index];
    const currentComponent = current.components[index];
    if (oldComponent?.componentId !== componentId
      || currentComponent?.componentId !== componentId) {
      fail("COMPONENT_ORDER_MISMATCH", "Ziwei old-schema component order drifted.");
    }
    REFLECT_APPLY(MAP_SET, historicalById, [componentId, oldComponent]);
    REFLECT_APPLY(MAP_SET, currentById, [componentId, currentComponent]);
    referenceCount += currentComponent.files.length;
    for (const file of currentComponent.files) {
      REFLECT_APPLY(SET_ADD, definitionPaths, [file.path]);
    }
  }
  const changed = [];
  const unchanged = [];
  for (const componentId of COMPONENT_ORDER) {
    const before = REFLECT_APPLY(MAP_GET, historicalById, [componentId]);
    const after = REFLECT_APPLY(MAP_GET, currentById, [componentId]);
    REFLECT_APPLY(ARRAY_PUSH, before.digest === after.digest ? unchanged : changed, [componentId]);
  }
  const changedPhysicalPaths = new NATIVE_SET();
  for (const componentId of COMPONENT_ORDER) {
    const before = REFLECT_APPLY(MAP_GET, historicalById, [componentId]);
    const after = REFLECT_APPLY(MAP_GET, currentById, [componentId]);
    const beforeByPath = new NATIVE_MAP();
    for (const file of before.files) REFLECT_APPLY(MAP_SET, beforeByPath, [file.path, file.sha256]);
    for (const file of after.files) {
      if (REFLECT_APPLY(MAP_GET, beforeByPath, [file.path]) !== file.sha256) {
        REFLECT_APPLY(SET_ADD, changedPhysicalPaths, [file.path]);
      }
    }
  }
  if (current.manifestDigest !== EXPECTED_CURRENT_OLD_SCHEMA_PROJECTION.manifestDigest
    || referenceCount !== EXPECTED_CURRENT_OLD_SCHEMA_PROJECTION.componentFileReferences
    || definitionPaths.size !== EXPECTED_CURRENT_OLD_SCHEMA_PROJECTION.uniquePhysicalPaths
    || !exactJson(changed, CHANGED_COMPONENT_IDS)
    || !exactJson(unchanged, UNCHANGED_COMPONENT_IDS)
    || changedPhysicalPaths.size !== 1
    || !REFLECT_APPLY(SET_HAS, changedPhysicalPaths, [CONTRACT_SOURCE.path])) {
    fail("CURRENT_OLD_SCHEMA_PROJECTION_MISMATCH", "Ziwei current old-schema projection 不符合固定漂移账。");
  }
  return { definitionPaths, referenceCount, changed, unchanged };
}

function childSourceFiles(child) {
  const files = child.currentBaseObservation.buildSourceSnapshot.files;
  const byPath = new NATIVE_MAP();
  for (const file of files) {
    if (REFLECT_APPLY(MAP_HAS, byPath, [file.path])) {
      fail("BROWSER_CHILD_PATH_DUPLICATE", "Ziwei browser child authored graph 含重复路径。");
    }
    REFLECT_APPLY(MAP_SET, byPath, [file.path, file]);
  }
  if (byPath.size !== 50) fail("BROWSER_CHILD_PATH_COUNT_MISMATCH", "Ziwei browser child authored graph 路径数漂移。");
  return byPath;
}

async function buildSelectedFiles(workspaceRoot, definitionPaths, childByPath) {
  const allPaths = new NATIVE_SET();
  for (const path of definitionPaths) REFLECT_APPLY(SET_ADD, allPaths, [path]);
  for (const path of childByPath.keys()) REFLECT_APPLY(SET_ADD, allPaths, [path]);
  const sortedPaths = [...allPaths];
  REFLECT_APPLY(ARRAY_SORT, sortedPaths, [compareCodeUnits]);
  const files = [];
  let overlap = 0;
  for (const relativePath of sortedPaths) {
    const snapshot = await domainTestOnly.readStableWorkspaceFile(
      workspaceRoot,
      relativePath,
      MAX_COMPONENT_FILE_BYTES
    );
    const fromDefinition = REFLECT_APPLY(SET_HAS, definitionPaths, [relativePath]);
    const fromChild = REFLECT_APPLY(MAP_HAS, childByPath, [relativePath]);
    if (fromDefinition && fromChild) overlap += 1;
    if (fromChild) {
      const declared = REFLECT_APPLY(MAP_GET, childByPath, [relativePath]);
      if (declared.bytes !== snapshot.rawBytes || declared.sha256 !== snapshot.rawSha256) {
        fail("BROWSER_CHILD_FILE_IDENTITY_MISMATCH", `Ziwei browser child 文件身份漂移：${relativePath}`);
      }
    }
    const declarationSources = [];
    if (fromDefinition) REFLECT_APPLY(ARRAY_PUSH, declarationSources, ["current_old_schema_definition_projection"]);
    if (fromChild) REFLECT_APPLY(ARRAY_PUSH, declarationSources, ["browser_child_v1_1_authored_build_graph"]);
    REFLECT_APPLY(ARRAY_PUSH, files, [{
      bytes: snapshot.rawBytes,
      declarationSources,
      path: relativePath,
      sha256: snapshot.rawSha256
    }]);
  }
  if (definitionPaths.size !== 46
    || childByPath.size !== 50
    || overlap !== 20
    || files.length !== 76) {
    fail("SELECTED_PATH_ACCOUNTING_MISMATCH", "Ziwei v3 selected path 46+50-20=76 账不成立。");
  }
  return { files, overlap };
}

function stripDeclarationSources(file) {
  return { bytes: file.bytes, path: file.path, sha256: file.sha256 };
}

function buildComponents(currentCandidate, selectedByPath) {
  const components = [];
  let referenceCount = 0;
  const mappedPaths = new NATIVE_SET();
  for (let index = 0; index < COMPONENT_ORDER.length; index += 1) {
    const component = currentCandidate.components[index];
    const componentId = COMPONENT_ORDER[index];
    if (component.componentId !== componentId) fail("COMPONENT_ORDER_MISMATCH", "Ziwei component order drifted.");
    const files = [];
    for (const declared of component.files) {
      const selected = REFLECT_APPLY(MAP_GET, selectedByPath, [declared.path]);
      if (!selected || selected.sha256 !== declared.sha256) {
        fail("COMPONENT_FILE_IDENTITY_MISMATCH", `Ziwei component 文件身份漂移：${declared.path}`);
      }
      REFLECT_APPLY(ARRAY_PUSH, files, [stripDeclarationSources(selected)]);
      REFLECT_APPLY(SET_ADD, mappedPaths, [declared.path]);
      referenceCount += 1;
    }
    const unsigned = {
      boundary: {
        componentComplete: false,
        domainTruthEstablished: false,
        semanticMembershipEstablished: false
      },
      classificationBasis: "historical_v2_fixed_definition_membership_only",
      componentId,
      definitionComponentDigest: component.digest,
      definitionDeclaredStatus: component.status,
      definitionDeclaredVersion: component.version,
      fileReferenceCount: files.length,
      files,
      status: COMPONENT_STATUS[componentId]
    };
    REFLECT_APPLY(ARRAY_PUSH, components, [{
      ...unsigned,
      componentDigest: domainDigest(COMPONENT_DIGEST_DOMAIN, unsigned)
    }]);
  }
  if (referenceCount !== 59 || mappedPaths.size !== 46) {
    fail("COMPONENT_ACCOUNTING_MISMATCH", "Ziwei v3 component 59 refs/46 mapped 账不成立。");
  }
  return { components, mappedPaths, referenceCount };
}

function buildArtifactBindings(inputs) {
  return [
    {
      currentCandidateManifestDigest: inputs.currentCandidate.manifestDigest,
      mechanicallyCurrent: false,
      persistedManifestDigest: inputs.historical.manifestDigest,
      path: EXPECTED_HISTORICAL_V2.path,
      rawBytes: EXPECTED_HISTORICAL_V2.rawBytes,
      rawSha256: EXPECTED_HISTORICAL_V2.rawSha256,
      role: "historical_ziwei_domain_manifest_v2_raw_and_self_identity",
      selfDigestVerified: true
    },
    {
      candidateId: inputs.receipt.candidateId,
      path: EXPECTED_DRIFT_RECEIPT.path,
      privateBrandConsumed: true,
      rawBytes: EXPECTED_DRIFT_RECEIPT.rawBytes,
      rawSha256: EXPECTED_DRIFT_RECEIPT.rawSha256,
      receiptDigest: inputs.receipt.receiptDigest,
      role: "current_ziwei_identity_drift_receipt_full_loader"
    },
    {
      authoredBuildGraphDigest:
        inputs.child.currentBaseObservation.buildSourceSnapshot.graphDigest,
      authoredBuildPathCount:
        inputs.child.currentBaseObservation.buildSourceSnapshot.fileCount,
      childDigest: inputs.child.childDigest,
      childId: inputs.child.childId,
      path: EXPECTED_BROWSER_CHILD.path,
      privateBrandConsumed: true,
      rawBytes: EXPECTED_BROWSER_CHILD.rawBytes,
      rawSha256: EXPECTED_BROWSER_CHILD.rawSha256,
      role: "current_ziwei_same_artifact_browser_child_v1_1_full_loader"
    }
  ];
}

async function collectCurrentInputs(workspaceRoot) {
  const definition = findDefinition();
  const historicalSnapshot = await domainTestOnly.readStableWorkspaceFile(
    workspaceRoot,
    EXPECTED_HISTORICAL_V2.path,
    MAX_MANIFEST_BYTES
  );
  const historical = await readIndependentDomainManifest(workspaceRoot, definition);
  assertHistoricalManifest(historical, historicalSnapshot);
  const currentCandidate = await buildCurrentIndependentDomainManifest(
    workspaceRoot,
    definition,
    { createdAt: historical.createdAt }
  );
  const stats = collectDefinitionProjectionStats(historical, currentCandidate);
  const receipt = requireVerifiedDriftReceipt(
    await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(workspaceRoot)
  );
  const child = requireVerifiedBrowserChild(
    await loadZiweiSameArtifactBrowserObservationChildV11(workspaceRoot)
  );
  const childByPath = childSourceFiles(child);
  const selected = await buildSelectedFiles(workspaceRoot, stats.definitionPaths, childByPath);
  const selectedByPath = new NATIVE_MAP();
  for (const file of selected.files) REFLECT_APPLY(MAP_SET, selectedByPath, [file.path, file]);
  const sourceFile = REFLECT_APPLY(MAP_GET, selectedByPath, [CONTRACT_SOURCE.path]);
  if (sourceFile?.bytes !== CONTRACT_SOURCE.currentRawBytes
    || sourceFile?.sha256 !== CONTRACT_SOURCE.currentRawSha256) {
    fail("CONTRACT_SOURCE_IDENTITY_MISMATCH", "Ziwei one-source fanout 当前身份漂移。");
  }
  return {
    child,
    currentCandidate,
    historical,
    receipt,
    selected,
    selectedByPath,
    stats
  };
}

function buildProjection(inputs) {
  const classification = buildComponents(inputs.currentCandidate, inputs.selectedByPath);
  const attachments = [];
  for (const file of inputs.selected.files) {
    if (!REFLECT_APPLY(SET_HAS, classification.mappedPaths, [file.path])) {
      REFLECT_APPLY(ARRAY_PUSH, attachments, [{
        ...stripDeclarationSources(file),
        attachmentBasis: "browser_child_only_not_component_classified"
      }]);
    }
  }
  if (attachments.length !== 30) {
    fail("ATTACHMENT_ACCOUNTING_MISMATCH", "Ziwei v3 child-only attachment 数必须为 30。");
  }
  const omittedCounts = {};
  let omittedTotal = 0;
  for (const root of OBJECT_KEYS(KNOWN_OMITTED_BY_ROOT)) {
    omittedCounts[root] = KNOWN_OMITTED_BY_ROOT[root].length;
    omittedTotal += KNOWN_OMITTED_BY_ROOT[root].length;
  }
  if (omittedTotal !== 33) {
    fail("OMISSION_COUNTEREXAMPLE_MISMATCH", "Ziwei v3 package-root omission 反例账漂移。");
  }
  const artifactBindings = buildArtifactBindings(inputs);
  const unsigned = {
    activeAdmissionEffect: "none",
    artifactBindings,
    authorityBoundary: {
      baziAuthorityInherited: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertIdentityQualificationIndependenceEstablished: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      highRiskClaimsAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false
    },
    browserEvidenceBoundary: {
      browserRuntimeEvidenceEstablishedByThisManifest: false,
      childCurrentAtManifestVerification: true,
      childIssuanceChromeScenarioOutcomes: 14,
      childIssuanceEdgeScenarioOutcomes: 14,
      childIssuanceTotalPassedScenarioOutcomes: 28,
      fixedPhysicalDeviceValidated: false,
      fullApplicationRuntimeValidated: false,
      mainApplicationRuntimeValidated: false,
      productionBrowserRuntimeEvidenceEstablished: false,
      publicHostValidated: false,
      pwaOrServiceWorkerValidated: false,
      runtimeObservationRerunByThisManifest: false,
      scope: "upstream_isolated_loopback_child_issuance_only_not_product_runtime"
    },
    componentAccounting: {
      componentCount: 9,
      componentFileReferences: classification.referenceCount,
      engineeringAttachmentPaths: attachments.length,
      mappedUniquePhysicalPaths: classification.mappedPaths.size,
      selectedUniquePhysicalPaths: inputs.selected.files.length
    },
    componentClassificationBoundary: {
      classificationBasis:
        "historical_v2_fixed_definition_membership_only_child_only_paths_are_attachments",
      componentComplete: false,
      componentOrder: COMPONENT_ORDER,
      semanticMembershipEstablished: false
    },
    components: classification.components,
    createdAt: CREATED_AT,
    doesNotEstablish: [
      "recursive_directory_enumeration_or_extra_file_absence",
      "entire_contracts_iztro_fortel_or_workspace_package_root_closure",
      "entire_ziwei_engineering_or_current_full_domain_manifest",
      "semantic_component_membership_component_completeness_or_domain_truth",
      "source_body_provenance_exact_quote_frozen_binding_or_complete_source_bundle",
      "work_edition_carrier_rights_or_redistribution_legal_clearance",
      "real_expert_identity_qualification_independence_opinion_or_truth",
      "complete_high_risk_semantic_sink_or_report_contract_closure",
      "current_product_browser_full_application_pwa_service_worker_or_public_host_evidence",
      "product_release_schema_migration_runtime_storage_or_central_registry_identity",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
      "legacy_v13_or_bazi_authority_inheritance"
    ],
    engineeringAttachments: attachments,
    evidenceLedgerSeparation: {
      accountsMustNotBeCollapsed: true,
      browserRuntimeEvidence:
        "upstream_child_issuance_only_not_rerun_or_product_runtime_evidence",
      contentTruthEstablished: false,
      engineeringIdentityEvidence:
        "selected_definition_and_browser_child_76_path_projection_mechanically_current",
      expertTruthEstablished: false,
      publicReleaseAuthorizationEstablished: false,
      releaseReadinessEstablished: false,
      rightsLegalJudgmentEstablished: false
    },
    gateState: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 27,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      releaseEvidenceComplete: false,
      rightsBundleComplete: false,
      sourceBundleComplete: false
    },
    integrationBoundary: {
      centralFormalRegistryConsumesThisManifest: false,
      crossSystemSuccessorBacklinkPresent: false,
      mainApplicationIntegrated: false,
      ownerAcceptanceForFormalAdmissionEstablished: false
    },
    lineage: {
      browserChild: canonicalValue(artifactBindings[2]),
      currentOldSchemaProjection: {
        changedComponentCount: inputs.stats.changed.length,
        componentCount: 9,
        componentFileReferences: inputs.stats.referenceCount,
        createdAtFixedToHistoricalV2CreatedAt: true,
        historicalCreatedAt: inputs.historical.createdAt,
        manifestDigest: inputs.currentCandidate.manifestDigest,
        persistedAsHistoricalV2: false,
        unchangedComponentCount: inputs.stats.unchanged.length,
        uniquePhysicalPaths: inputs.stats.definitionPaths.size
      },
      driftReceipt: canonicalValue(artifactBindings[1]),
      historicalManifestV2: canonicalValue(artifactBindings[0]),
      onePhysicalSourceFanout: {
        changedComponentIds: inputs.stats.changed,
        changedPhysicalSourceCount: 1,
        fiveIndependentSemanticChangesClaimed: false,
        oneSourceIdentityFansOutToFiveComponentDigests: true,
        path: CONTRACT_SOURCE.path,
        unchangedComponentIds: inputs.stats.unchanged
      },
      predecessorReboundOrResigned: false
    },
    manifestId: MANIFEST_ID,
    observationBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      digestIsDigitalSignature: false,
      endpointSnapshotOnly: true,
      exactPersistedUpstreamRawIdentitiesVerified: true,
      intervalMutationExcludedAcrossFiles: false,
      mutationEpochAvailableForProduct: false,
      mutationEpochReceipt: null,
      signerIdentityEstablished: false,
      upstreamPrivateBrandsVerified: 2
    },
    productBoundary: {
      formalProductSurface: "absent",
      migrationId: null,
      productIdentity: null,
      releaseIdentity: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      targetSchema: null
    },
    projectDefaultReleaseGovernance: {
      activeLine: "legacy-v13",
      inheritedByThisSystem: false,
      migrationId: null,
      targetSchema: 13
    },
    recordType: RECORD_TYPE,
    releaseStatus: "draft",
    runtimeTrustBoundary: {
      completeSourceToBuildAttestationEstablished: false,
      hiddenPreEvaluationCodeExcluded: false,
      repositoryIntervalIntegrityEstablished: false,
      toolAttestationEstablished: false,
      visibleCliLoaderInjectionRejectedBySelectedIdentity: false
    },
    schemaVersion: "3.0.0",
    scopeOmissions: {
      entirePackageRootClosureEstablished: {
        "packages/ziwei-doushu-contracts-draft": false,
        "packages/ziwei-fortel-differential-draft": false,
        "packages/ziwei-iztro-adapter-draft": false,
        "packages/ziwei-workspace-artifact-draft": false
      },
      knownOmittedNonRuntimePathsAtAuthoringByRoot: KNOWN_OMITTED_BY_ROOT,
      knownOmittedNonRuntimePathsAtAuthoringCountByRoot: omittedCounts,
      knownOmittedNonRuntimePathsAtAuthoringTotal: omittedTotal,
      omissionListsMechanicallyReverifiedByThisLoader: false,
      omissionListsPurpose:
        "authoring_time_counterexamples_against_package_root_or_entire_engineering_closure_claims",
      runtimeDirectoriesOutsideSelectedIdentity:
        RUNTIME_DIRECTORIES_OUTSIDE_SELECTED_IDENTITY,
      runtimeDirectoryContentsBoundByThisManifest: false
    },
    selectedClosure: {
      browserChildDeclaredAuthoredBuildPaths: 50,
      canonicalPathSortApplied: true,
      definitionDeclaredComponentFileReferences: 59,
      definitionDeclaredUniquePaths: 46,
      entireContractsPackageRootClosureEstablished: false,
      entireFortelPackageRootClosureEstablished: false,
      entireIztroPackageRootClosureEstablished: false,
      entireWorkspacePackageRootClosureEstablished: false,
      entireZiweiEngineeringClosureEstablished: false,
      extraFileAbsenceEstablished: false,
      files: inputs.selected.files,
      mappedAndAttachmentPartitionExact: true,
      overlapBetweenDeclaredSets: inputs.selected.overlap,
      recursiveDirectoryEnumerationPerformed: false,
      scopeClass:
        "definition_declared_selected_path_union_browser_child_declared_authored_build_path_not_directory_or_domain_closure",
      selectedPathSetDigest: domainDigest(
        SELECTED_PATH_DIGEST_DOMAIN,
        inputs.selected.files
      ),
      selectedUniquePhysicalPaths: inputs.selected.files.length
    },
    status: STATUS,
    surface: {
      observedHistoricalSurfaceId: inputs.historical.surface.surfaceId,
      observedHistoricalSurfaceVersion: inputs.historical.surface.surfaceVersion,
      ownerAssignedProductIdentity: false,
      surfaceLabelOrVersionIsProductIdentity: false
    },
    systemIdentity: {
      contractSystemId: "ziwei",
      productSystemId: "ziwei-doushu",
      productType: "definition_and_browser_child_selected_path_engineering_boundary"
    },
    versionBoundary: {
      currentEngineeringManifestMechanicallyVerified: true,
      currentFullDomainManifestMechanicallyVerified: false,
      currentSelectedPathManifestMechanicallyVerified: true,
      entireZiweiEngineeringClosureEstablished: false,
      ownerPromotionDecisionReceipt: null,
      productIdentityEstablished: false,
      upstreamPrivateBrandCount: 2
    }
  };
  return {
    ...unsigned,
    manifestDigest: domainDigest(DIGEST_DOMAIN, unsigned)
  };
}

export function computeZiweiIndependentEngineeringManifestV3Digest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.manifestDigest;
  return domainDigest(DIGEST_DOMAIN, unsigned);
}

export function canonicalPrettyStringifyZiweiIndependentEngineeringManifestV3(value) {
  const normalized = canonicalValue(value);
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [normalized, null, 2]) + "\n";
}

export function parseZiweiIndependentEngineeringManifestV3JsonBytes(
  bytes,
  label = "Ziwei independent engineering manifest v3 JSON"
) {
  return canonicalValue(
    parseIndependentDomainManifestJsonBytes(bytes, label, MAX_MANIFEST_BYTES)
  );
}

function requireFixedBoundary(value) {
  const manifest = canonicalValue(value);
  if (manifest.manifestId !== MANIFEST_ID
    || manifest.recordType !== RECORD_TYPE
    || manifest.schemaVersion !== "3.0.0"
    || manifest.status !== STATUS
    || manifest.releaseStatus !== "draft"
    || manifest.activeAdmissionEffect !== "none"
    || manifest.artifactBindings?.length !== 3
    || manifest.componentAccounting?.componentCount !== 9
    || manifest.componentAccounting?.componentFileReferences !== 59
    || manifest.componentAccounting?.mappedUniquePhysicalPaths !== 46
    || manifest.componentAccounting?.engineeringAttachmentPaths !== 30
    || manifest.componentAccounting?.selectedUniquePhysicalPaths !== 76
    || manifest.componentClassificationBoundary?.semanticMembershipEstablished !== false
    || manifest.componentClassificationBoundary?.componentComplete !== false
    || manifest.components?.length !== 9
    || manifest.components?.some((component) =>
      component.boundary?.semanticMembershipEstablished !== false
      || component.boundary?.componentComplete !== false) !== false
    || manifest.selectedClosure?.definitionDeclaredComponentFileReferences !== 59
    || manifest.selectedClosure?.definitionDeclaredUniquePaths !== 46
    || manifest.selectedClosure?.browserChildDeclaredAuthoredBuildPaths !== 50
    || manifest.selectedClosure?.overlapBetweenDeclaredSets !== 20
    || manifest.selectedClosure?.selectedUniquePhysicalPaths !== 76
    || manifest.selectedClosure?.recursiveDirectoryEnumerationPerformed !== false
    || manifest.selectedClosure?.extraFileAbsenceEstablished !== false
    || manifest.selectedClosure?.entireContractsPackageRootClosureEstablished !== false
    || manifest.selectedClosure?.entireIztroPackageRootClosureEstablished !== false
    || manifest.selectedClosure?.entireFortelPackageRootClosureEstablished !== false
    || manifest.selectedClosure?.entireWorkspacePackageRootClosureEstablished !== false
    || manifest.selectedClosure?.entireZiweiEngineeringClosureEstablished !== false
    || manifest.scopeOmissions?.knownOmittedNonRuntimePathsAtAuthoringTotal !== 33
    || manifest.scopeOmissions?.omissionListsMechanicallyReverifiedByThisLoader !== false
    || manifest.scopeOmissions?.runtimeDirectoryContentsBoundByThisManifest !== false
    || manifest.runtimeTrustBoundary
      ?.visibleCliLoaderInjectionRejectedBySelectedIdentity !== false
    || manifest.lineage?.currentOldSchemaProjection?.manifestDigest
      !== EXPECTED_CURRENT_OLD_SCHEMA_PROJECTION.manifestDigest
    || manifest.lineage?.currentOldSchemaProjection?.changedComponentCount !== 5
    || manifest.lineage?.currentOldSchemaProjection?.unchangedComponentCount !== 4
    || manifest.lineage?.onePhysicalSourceFanout?.changedPhysicalSourceCount !== 1
    || manifest.lineage?.onePhysicalSourceFanout?.fiveIndependentSemanticChangesClaimed !== false
    || manifest.browserEvidenceBoundary?.browserRuntimeEvidenceEstablishedByThisManifest !== false
    || manifest.browserEvidenceBoundary?.runtimeObservationRerunByThisManifest !== false
    || manifest.browserEvidenceBoundary?.childIssuanceTotalPassedScenarioOutcomes !== 28
    || manifest.browserEvidenceBoundary?.productionBrowserRuntimeEvidenceEstablished !== false
    || manifest.browserEvidenceBoundary?.pwaOrServiceWorkerValidated !== false
    || manifest.browserEvidenceBoundary?.publicHostValidated !== false
    || manifest.gateState?.admissionGatesRequired !== 8
    || manifest.gateState?.admissionGatesSatisfied !== 0
    || manifest.gateState?.bindingRequired !== 27
    || manifest.gateState?.bindingFrozenVerified !== 0
    || manifest.gateState?.independentExpertsRequired !== 2
    || manifest.gateState?.independentExpertReviewsVerified !== 0
    || manifest.authorityBoundary?.contentTruthEstablished !== false
    || manifest.authorityBoundary?.expertTruthEstablished !== false
    || manifest.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || manifest.authorityBoundary?.releaseReady !== false
    || manifest.authorityBoundary?.publicDeploymentAuthorized !== false
    || manifest.authorityBoundary?.publicReleaseAuthorized !== false
    || manifest.authorityBoundary?.expertClaimsAuthorized !== false
    || manifest.productBoundary?.productIdentity !== null
    || manifest.productBoundary?.releaseIdentity !== null
    || manifest.productBoundary?.targetSchema !== null
    || manifest.productBoundary?.migrationId !== null
    || manifest.projectDefaultReleaseGovernance?.activeLine !== "legacy-v13"
    || manifest.projectDefaultReleaseGovernance?.targetSchema !== 13
    || manifest.projectDefaultReleaseGovernance?.migrationId !== null
    || manifest.projectDefaultReleaseGovernance?.inheritedByThisSystem !== false
    || manifest.observationBoundary?.crossFileAtomicSnapshot !== false
    || manifest.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || manifest.observationBoundary?.abaExcluded !== false
    || manifest.observationBoundary?.mutationEpochAvailableForProduct !== false
    || manifest.observationBoundary?.mutationEpochReceipt !== null
    || manifest.versionBoundary?.currentEngineeringManifestMechanicallyVerified !== true
    || manifest.versionBoundary?.currentSelectedPathManifestMechanicallyVerified !== true
    || manifest.versionBoundary?.currentFullDomainManifestMechanicallyVerified !== false
    || manifest.versionBoundary?.entireZiweiEngineeringClosureEstablished !== false
    || manifest.versionBoundary?.productIdentityEstablished !== false
    || manifest.manifestDigest !== computeZiweiIndependentEngineeringManifestV3Digest(manifest)) {
    fail("RED_OR_SCOPE_BOUNDARY_MISMATCH", "Ziwei v3 scope、身份、证据或权限边界被抬高。");
  }
  return manifest;
}

function assertExpectedProjection(candidate, expected) {
  const normalized = requireFixedBoundary(candidate);
  if (!exactJson(normalized, expected)) {
    fail("CURRENT_MANIFEST_MISMATCH", "Ziwei v3 与允许的当前 selected-path 投影不一致。");
  }
  return normalized;
}

export async function buildCurrentZiweiIndependentEngineeringManifestV3(
  workspaceRoot = process.cwd()
) {
  const inputs = await collectCurrentInputs(workspaceRoot);
  return deepFreeze(canonicalValue(requireFixedBoundary(buildProjection(inputs))));
}

export async function loadZiweiIndependentEngineeringManifestV3(
  workspaceRoot = process.cwd()
) {
  const expected = await buildCurrentZiweiIndependentEngineeringManifestV3(workspaceRoot);
  const snapshot = await domainTestOnly.readStableWorkspaceFile(
    workspaceRoot,
    ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
    MAX_MANIFEST_BYTES
  );
  const persisted = parseZiweiIndependentEngineeringManifestV3JsonBytes(snapshot.bytes);
  const canonicalText =
    canonicalPrettyStringifyZiweiIndependentEngineeringManifestV3(persisted);
  if (REFLECT_APPLY(BUFFER_BYTE_LENGTH, NATIVE_BUFFER, [canonicalText, "utf8"])
      !== snapshot.rawBytes
    || sha256Text(canonicalText) !== snapshot.rawSha256) {
    fail("MANIFEST_MATERIALIZATION_MISMATCH", "Ziwei v3 不是唯一 canonical LF materialization。");
  }
  assertExpectedProjection(persisted, expected);
  if (EXPECTED_PERSISTED.rawBytes !== 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
      || persisted.manifestDigest !== EXPECTED_PERSISTED.manifestDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH", "persisted Ziwei v3 冻结身份漂移。");
  }
  const result = deepFreeze(canonicalValue({
    artifact: {
      bytes: snapshot.rawBytes,
      path: ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
      sha256: snapshot.rawSha256
    },
    manifest: persisted,
    manifestDigest: persisted.manifestDigest,
    mechanicallyVerified: true
  }));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedZiweiIndependentEngineeringManifestV3(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getZiweiIndependentEngineeringManifestV3Summary(value) {
  if (!isVerifiedZiweiIndependentEngineeringManifestV3(value)) {
    fail("VERIFIED_BRAND_REQUIRED", "summary 只接受 Ziwei v3 fixed-path loader 私有品牌。");
  }
  const manifest = value.manifest;
  return deepFreeze(canonicalValue({
    activeAdmissionEffect: manifest.activeAdmissionEffect,
    admissionGatesRequired: manifest.gateState.admissionGatesRequired,
    admissionGatesSatisfied: manifest.gateState.admissionGatesSatisfied,
    artifact: value.artifact,
    bindingFrozenVerified: manifest.gateState.bindingFrozenVerified,
    bindingRequired: manifest.gateState.bindingRequired,
    browserRuntimeEvidenceEstablishedByThisManifest:
      manifest.browserEvidenceBoundary.browserRuntimeEvidenceEstablishedByThisManifest,
    componentFileReferences: manifest.componentAccounting.componentFileReferences,
    currentEngineeringManifestMechanicallyVerified:
      manifest.versionBoundary.currentEngineeringManifestMechanicallyVerified,
    currentFullDomainManifestMechanicallyVerified:
      manifest.versionBoundary.currentFullDomainManifestMechanicallyVerified,
    engineeringAttachmentPaths:
      manifest.componentAccounting.engineeringAttachmentPaths,
    independentExpertReviewsVerified:
      manifest.gateState.independentExpertReviewsVerified,
    independentExpertsRequired: manifest.gateState.independentExpertsRequired,
    manifestDigest: value.manifestDigest,
    manifestId: manifest.manifestId,
    migrationId: manifest.productBoundary.migrationId,
    publicDeploymentAuthorized: manifest.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: manifest.authorityBoundary.publicReleaseAuthorized,
    releaseIdentity: manifest.productBoundary.releaseIdentity,
    releaseReady: manifest.authorityBoundary.releaseReady,
    selectedUniquePhysicalPaths:
      manifest.selectedClosure.selectedUniquePhysicalPaths,
    targetSchema: manifest.productBoundary.targetSchema
  }));
}

export const ziweiIndependentEngineeringManifestV3TestOnly = OBJECT_FREEZE({
  CHANGED_COMPONENT_IDS,
  COMPONENT_ORDER,
  COMPONENT_STATUS,
  CONTRACT_SOURCE,
  CREATED_AT,
  DIGEST_DOMAIN,
  EXPECTED_BROWSER_CHILD,
  EXPECTED_CURRENT_OLD_SCHEMA_PROJECTION,
  EXPECTED_DRIFT_RECEIPT,
  EXPECTED_HISTORICAL_V2,
  EXPECTED_PERSISTED,
  KNOWN_OMITTED_BY_ROOT,
  MANIFEST_ID,
  RECORD_TYPE,
  RUNTIME_DIRECTORIES_OUTSIDE_SELECTED_IDENTITY,
  STATUS,
  UNCHANGED_COMPONENT_IDS,
  assertExpectedProjection,
  exactJson,
  requireFixedBoundary,
  requireVerifiedBrowserChild,
  requireVerifiedDriftReceipt,
  sha256Text
});
