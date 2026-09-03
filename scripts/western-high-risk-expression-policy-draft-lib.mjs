import { createHash } from "node:crypto";
import { open, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import {
  isVerifiedWesternProductizationVersionAwareObservationChildV11,
  loadWesternProductizationVersionAwareObservationChildV11
} from "./western-independent-productization-version-aware-observation-child-v1-1-lib.mjs";

export const WESTERN_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH =
  "content/system-admission/western-high-risk-expression-policy-draft.v0.1.0.json";

const CANDIDATE_ID = "hakimi.western.high-risk-expression-policy-draft/0.1.0";
const POLICY_ID = "hakimi.western.high-risk-expression-egress-policy/0.1.0";
const DIGEST_DOMAIN = "hakimi.western.high-risk-expression-policy-draft.v0.1";
const CREATED_AT = "2026-09-01T00:00:00.000Z";
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const EXPECTED_TEXT_GUARD_CALL_COUNT = 52;
const UTF8_FATAL = new TextDecoder("utf-8", { fatal: true });
const VERIFIED_RESULTS = new WeakSet();

const EXPECTED_PERSISTED = Object.freeze({
  bytes: 9_526,
  sha256: "caf4b85e9ce72d0aaaec1b57e5a634b4acf7d376ef39ff6f02b9cf84875d1485"
});

const EXPECTED_CATEGORY_IDS = Object.freeze([
  "deterministic_personal_outcome",
  "health_medical_reproductive",
  "legal_criminal",
  "financial_investment_gambling",
  "death_disaster_violence_self_harm",
  "relationships_family",
  "employment_education_social_identity",
  "mental_health_personality_diagnosis"
]);

const EXPECTED_SURFACE_IDS = Object.freeze([
  "western.preview.candidate-interpretation",
  "western.preview.expert-review-question",
  "western.preview.imported-review-feedback",
  "western.preview.primitive-review-template-download",
  "western.preview.dynamic-review-template-download"
]);

const SOURCE_BINDINGS = Object.freeze([
  Object.freeze({
    path: "content/system-admission/western-independent-productization-version-aware-observation-child.v1.1.0.json",
    role: "verified_zero_admission_parent"
  }),
  Object.freeze({
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/high-risk-expression-egress-policy.ts",
    role: "lexical_egress_policy_runtime"
  }),
  Object.freeze({
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/main.ts",
    role: "browser_dom_and_template_egress_call_sites"
  }),
  Object.freeze({
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/content-layer.ts",
    role: "candidate_content_projection_source"
  }),
  Object.freeze({
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/content-review-feedback.ts",
    role: "primitive_review_template_serializer"
  }),
  Object.freeze({
    path: "packages/western-astrology-rules-preview-draft/src/browser-app/dynamic-content-review-feedback.ts",
    role: "dynamic_review_template_serializer"
  }),
  Object.freeze({
    path: "packages/western-astrology-rules-preview-draft/src/high-risk-expression-egress-policy.test.ts",
    role: "policy_and_call_site_contract_tests"
  }),
  Object.freeze({
    path: "packages/western-astrology-rules-preview-draft/package.json",
    role: "isolated_package_boundary"
  })
]);

export class WesternHighRiskExpressionPolicyDraftError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = "WesternHighRiskExpressionPolicyDraftError";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new WesternHighRiskExpressionPolicyDraftError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertPlainJson(value, label = "value", seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("NON_CANONICAL_NUMBER", `${label} 不是可接受的 JSON 数值。`);
    }
    return;
  }
  if (typeof value !== "object") fail("NON_JSON_VALUE", `${label} 不是 JSON 值。`);
  if (seen.has(value)) fail("CYCLIC_VALUE", `${label} 包含循环引用。`);
  seen.add(value);
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype) fail("FOREIGN_ARRAY", `${label} 不是普通数组。`);
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) fail("SPARSE_ARRAY", `${label} 不是稠密数组。`);
      assertPlainJson(value[index], `${label}[${index}]`, seen);
    }
  } else {
    if (prototype !== Object.prototype && prototype !== null) {
      fail("FOREIGN_RECORD", `${label} 不是普通记录。`);
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") fail("SYMBOL_KEY", `${label} 含 symbol key。`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        fail("ACCESSOR_OR_HIDDEN_KEY", `${label}.${key} 不是普通可枚举数据字段。`);
      }
      assertPlainJson(descriptor.value, `${label}.${key}`, seen);
    }
  }
  seen.delete(value);
}

function canonicalize(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalize(value[key])}`
  )).join(",")}}`;
}

export function canonicalStringifyWesternHighRiskExpressionPolicyDraft(value) {
  assertPlainJson(value);
  return canonicalize(value);
}

export function canonicalPrettyStringifyWesternHighRiskExpressionPolicyDraft(value) {
  assertPlainJson(value);
  return `${JSON.stringify(value, null, 2)}\n`;
}

function copyJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) fail("INTERNAL_ACCESSOR", "内部记录出现 accessor。 ");
    deepFreeze(descriptor.value);
  }
  return Object.freeze(value);
}

function withoutCandidateDigest(candidateInput) {
  const candidate = copyJson(candidateInput);
  delete candidate.candidateDigest;
  return candidate;
}

export function computeWesternHighRiskExpressionPolicyDraftDigest(candidateInput) {
  return sha256(Buffer.from(
    `${DIGEST_DOMAIN}\0${canonicalStringifyWesternHighRiskExpressionPolicyDraft(
      withoutCandidateDigest(candidateInput)
    )}`,
    "utf8"
  ));
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readStableWorkspaceFile(workspaceRoot, relativePath, maxBytes = MAX_SOURCE_BYTES) {
  if (typeof workspaceRoot !== "string" || typeof relativePath !== "string"
    || relativePath.length === 0 || path.isAbsolute(relativePath)
    || relativePath.includes("\\") || relativePath.split("/").some((part) => !part || part === "." || part === "..")) {
    fail("INVALID_FIXED_PATH", "固定工作区路径无效。 ");
  }
  let root;
  try {
    root = await realpath(workspaceRoot);
  } catch (cause) {
    fail("WORKSPACE_REALPATH_FAILURE", "无法解析工作区根目录。", cause);
  }
  let current = root;
  for (const segment of relativePath.split("/")) {
    current = path.join(current, segment);
    let entry;
    try {
      entry = await lstat(current);
    } catch (cause) {
      fail("FIXED_PATH_MISSING", `固定路径不可读：${relativePath}`, cause);
    }
    if (entry.isSymbolicLink()) fail("SYMLINK_REJECTED", `固定路径不能经过符号链接：${relativePath}`);
  }
  if (!isSameOrWithin(root, current)) fail("PATH_ESCAPE", `固定路径逃逸工作区：${relativePath}`);
  let resolved;
  try {
    resolved = await realpath(current);
  } catch (cause) {
    fail("ENDPOINT_REALPATH_FAILURE", `固定端点无法解析：${relativePath}`, cause);
  }
  if (!isSameOrWithin(root, resolved)
    || path.normalize(resolved).toLowerCase() !== path.normalize(current).toLowerCase()) {
    fail("ENDPOINT_ALIAS_REJECTED", `固定端点不是直接文件：${relativePath}`);
  }
  let handle;
  try {
    handle = await open(resolved, "r");
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size < 1n || before.size > BigInt(maxBytes) || before.nlink !== 1n) {
      fail("ENDPOINT_SHAPE_REJECTED", `固定端点类型、大小或硬链接计数不合格：${relativePath}`);
    }
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const read = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (read.bytesRead < 1) fail("SHORT_READ", `固定端点读取不完整：${relativePath}`);
      offset += read.bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
      fail("ENDPOINT_MUTATED", `固定端点在读取区间内发生变化：${relativePath}`);
    }
    let text;
    try {
      text = UTF8_FATAL.decode(bytes);
    } catch (cause) {
      fail("UTF8_DECODE_FAILURE", `固定端点不是严格 UTF-8：${relativePath}`, cause);
    }
    return Object.freeze({
      path: relativePath,
      bytes,
      text,
      rawBytes: bytes.byteLength,
      rawSha256: sha256(bytes)
    });
  } finally {
    if (handle) await handle.close();
  }
}

function exactStringSetFromSource(source, expected, label) {
  for (const value of expected) {
    if (!source.includes(`"${value}"`)) fail("SOURCE_MARKER_MISSING", `${label} 缺少 ${value}。`);
  }
}

function inspectPolicyAndCallSites(snapshots) {
  const byPath = new Map(snapshots.map((snapshot) => [snapshot.path, snapshot]));
  const policy = byPath.get(SOURCE_BINDINGS[1].path)?.text;
  const main = byPath.get(SOURCE_BINDINGS[2].path)?.text;
  const packageText = byPath.get(SOURCE_BINDINGS[7].path)?.text;
  if (!policy || !main || !packageText) fail("INSPECTION_INPUT_MISSING", "高风险出口检查输入不完整。 ");

  exactStringSetFromSource(policy, EXPECTED_CATEGORY_IDS, "八类风险登记");
  exactStringSetFromSource(policy, EXPECTED_SURFACE_IDS, "五类出口登记");
  for (const marker of [
    POLICY_ID,
    "lexicalCoverageComplete: false",
    "semanticSafetyEstablished: false",
    "formalHighRiskPolicyBound: false",
    "productionEligible: false",
    "RISKY_TEMPLATE_EGRESS_REJECTED"
  ]) {
    if (!policy.includes(marker)) fail("POLICY_BOUNDARY_MARKER_MISSING", `政策实现缺少边界标记：${marker}`);
  }
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|indexedDB|localStorage|sessionStorage)\b/u.test(policy)
    || /document\.cookie/u.test(policy)) {
    fail("POLICY_SIDE_EFFECT_API_PRESENT", "西洋高风险出口政策不得包含网络、存储或 Cookie API。 ");
  }
  for (const marker of [
    "function setWesternHighRiskEgressText(",
    "assertWesternHighRiskTemplateEgress(",
    "const serializedTemplate = serializeWesternContentReviewFeedbackTemplate(template);",
    "const serializedTemplate = serializeWesternDynamicContentReviewFeedbackTemplate(template);"
  ]) {
    if (!main.includes(marker)) fail("CALL_SITE_MARKER_MISSING", `浏览器出口缺少调用标记：${marker}`);
  }
  exactStringSetFromSource(main, EXPECTED_SURFACE_IDS, "浏览器出口调用");
  for (const [helperName, elementName] of [
    ["setReviewFeedbackMessage", "reviewFeedbackMessage"],
    ["setDynamicReviewFeedbackMessage", "dynamicReviewFeedbackMessage"]
  ]) {
    const helperPattern = new RegExp(
      `function ${helperName}\\([\\s\\S]{0,300}?setWesternHighRiskEgressText\\(\\s*${elementName},\\s*"western\\.preview\\.imported-review-feedback",\\s*message\\s*\\)`,
      "u"
    );
    if (!helperPattern.test(main)) {
      fail("REVIEW_MESSAGE_GATE_MISSING", `${helperName} 不再通过已登记导入反馈出口。 `);
    }
  }
  for (const [surfaceId, serializerName] of [
    [
      "western.preview.primitive-review-template-download",
      "serializeWesternContentReviewFeedbackTemplate"
    ],
    [
      "western.preview.dynamic-review-template-download",
      "serializeWesternDynamicContentReviewFeedbackTemplate"
    ]
  ]) {
    const dominancePattern = new RegExp(
      `const serializedTemplate = ${serializerName}\\(template\\);[\\s\\S]{0,240}?assertWesternHighRiskTemplateEgress\\(\\s*"${surfaceId.replaceAll(".", "\\.")}",\\s*serializedTemplate\\s*\\);[\\s\\S]{0,240}?startTextDownload\\(\\s*serializedTemplate,`,
      "u"
    );
    if (!dominancePattern.test(main)) {
      fail("TEMPLATE_GUARD_DOMINANCE_MISSING", `${surfaceId} 没有保持 guard-before-download 顺序。 `);
    }
  }
  if (/\.textContent\s*=\s*candidate\.(?:factSummary|directStatement|resourceStatement|tensionStatement|scopeNote|readingOrderStatement|useStatement|limitStatement)/u.test(main)
    || /\.(?:textContent|innerText)\s*=\s*(?:(?:candidate|item)\.|projection\.(?!factsSha256\b))/u.test(main)
    || /\.(?:append|prepend)\(\s*(?:(?:candidate|projection|item)\.|value\b|message\b)/u.test(main)
    || /(?:reviewFeedbackMessage|dynamicReviewFeedbackMessage)\.textContent\s*=\s*message/u.test(main)
    || /description\.textContent\s*=\s*value/u.test(main)
    || main.includes("startTextDownload(serializeWesternContentReviewFeedbackTemplate(template)")
    || main.includes("startTextDownload(serializeWesternDynamicContentReviewFeedbackTemplate(template)")) {
    fail("KNOWN_EGRESS_BYPASS_PRESENT", "已登记西洋文本出口仍存在已知直接旁路。 ");
  }
  let packageJson;
  try {
    packageJson = JSON.parse(packageText);
  } catch (cause) {
    fail("PACKAGE_JSON_INVALID", "西洋隔离包 package.json 无法解析。", cause);
  }
  if (packageJson.private !== true
    || !packageJson.exports || Object.keys(packageJson.exports).length !== 0
    || packageJson["x-hakimi-isolated-draft"]?.productionImport !== "forbidden"
    || packageJson["x-hakimi-isolated-draft"]?.systemId !== "western-astrology") {
    fail("PACKAGE_ISOLATION_DRIFT", "西洋规则预览不再保持私有、空导出和禁止生产导入。 ");
  }
  const policyCallCount = (main.match(/setWesternHighRiskEgressText\(/gu) ?? []).length - 1;
  const templateGuardCallCount = (main.match(/assertWesternHighRiskTemplateEgress\(/gu) ?? []).length;
  const serializedTemplateSinkCount = (main.match(/startTextDownload\(\s*serializedTemplate,/gu) ?? []).length;
  if (policyCallCount !== EXPECTED_TEXT_GUARD_CALL_COUNT
    || templateGuardCallCount !== 2
    || serializedTemplateSinkCount !== 2) {
    fail("CALL_SITE_COUNT_DRIFT", "西洋 DOM 或模板出口调用计数下降。 ");
  }
  return Object.freeze({ policyCallCount, templateGuardCallCount });
}

function buildCandidate(snapshots, upstreamResult, inspection) {
  const artifactBindings = snapshots.map((snapshot, index) => Object.freeze({
    bytes: snapshot.rawBytes,
    path: snapshot.path,
    rawHashAndUtf8DecodeUseSameBuffer: true,
    role: SOURCE_BINDINGS[index].role,
    sha256: snapshot.rawSha256
  }));
  const candidate = {
    activeAdmissionEffect: "none",
    artifactBindings,
    authorityBoundary: {
      contentTruthEstablished: false,
      crossSystemAuthorityInherited: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertIdentityCredentialsIndependenceEstablished: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      highRiskClaimsAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false,
      semanticSafetyEstablished: false
    },
    candidateId: CANDIDATE_ID,
    createdAt: CREATED_AT,
    doesNotEstablish: [
      "semantic_or_paraphrase_complete_high_risk_detection",
      "formal_or_expert_approved_high_risk_expression_policy",
      "content_truth_expert_truth_source_freeze_or_rights_legal_conclusion",
      "complete_text_leaf_inventory_or_registered_call_graph_closure",
      "browser_runtime_chrome_edge_pwa_service_worker_or_public_host_evidence",
      "mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion",
      "western_product_release_schema_migration_or_formal_admission_identity",
      "release_readiness_public_deployment_public_release_or_expert_claims_authorization",
      "bazi_ziwei_vedic_authority_inheritance_cross_system_scoring_or_winner_selection"
    ],
    evidenceAccounts: [
      { account: "engineering_evidence", establishedByThisCandidate: true },
      { account: "browser_runtime_evidence", establishedByThisCandidate: false },
      { account: "content_truth", establishedByThisCandidate: false },
      { account: "expert_truth", establishedByThisCandidate: false },
      { account: "rights_legal_judgment", establishedByThisCandidate: false },
      { account: "release_readiness", establishedByThisCandidate: false },
      { account: "public_release_authorization", establishedByThisCandidate: false }
    ],
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 28,
      engineeringLexicalEgressGateImplemented: true,
      expertReviewBundleComplete: false,
      formalHighRiskPolicyBound: false,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      requirementsUniverseClosed: false,
      rightsBundleComplete: false,
      sourceBundleComplete: false
    },
    integrityBoundary: {
      artifactBindingCount: artifactBindings.length,
      candidateDigestAlgorithm: "SHA-256",
      candidateDigestDomain: DIGEST_DOMAIN,
      candidateDigestExcludesOwnField: true,
      candidateDigestIsDigitalSignature: false,
      crossFileAtomicSnapshot: false,
      fixedPathCurrentVerificationRequired: true,
      intervalMutationExcluded: false,
      preImportIntrinsicIntegrityEstablished: false,
      rawIdentitiesAreDigitalSignatures: false,
      sequentialEndpointSnapshotsOnly: true,
      signerIdentityEstablished: false,
      sourceInspectionMechanicallyVerified: true,
      upstreamCapabilityBrandCount: 1
    },
    mutationBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      networkTransmissionPerformed: false,
      storageMutationPerformed: false
    },
    policyBoundary: {
      actionIds: ["pass_through", "neutralized", "failed_closed"],
      candidateDomTextNeutralizedOnMatch: true,
      completeTextLeafInventoryClosed: false,
      expertApproved: false,
      currentKnownExternalReviewFeedbackRoutedThroughGate: true,
      formalHighRiskPolicyBound: false,
      lexicalCoverageComplete: false,
      policyId: POLICY_ID,
      policyVersion: "0.1.0",
      registeredCallGraphClosureEstablished: false,
      riskCategoryCount: EXPECTED_CATEGORY_IDS.length,
      riskCategoryIds: EXPECTED_CATEGORY_IDS,
      safeTextExactPassThrough: true,
      semanticSafetyEstablished: false,
      surfaceCallerAuthenticityEstablished: false,
      surfaceCount: EXPECTED_SURFACE_IDS.length,
      surfaceIds: EXPECTED_SURFACE_IDS,
      templateDownloadFailedClosedOnMatch: true,
      templateGuardCallCount: inspection.templateGuardCallCount,
      textGuardCallCount: inspection.policyCallCount
    },
    productBoundary: {
      centralRegistryIntegration: false,
      legacyV13Inherited: false,
      mainApplicationReachable: false,
      migrationId: null,
      packageExportsEmpty: true,
      packagePrivate: true,
      productIdentity: null,
      productionImportForbidden: true,
      releaseIdentity: null,
      schema13Inherited: false,
      targetSchema: null
    },
    projectReleaseGovernanceContext: {
      defaultArtifact: "legacy-v13",
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      projectContextOnly: true,
      publicDeploymentAuthorized: false,
      targetSchema: 13
    },
    recordType: "western_high_risk_expression_policy_draft_v0_1",
    schemaVersion: "0.1.0",
    status: "isolated_runtime_lexical_egress_gate_candidate_zero_admission_effect",
    systemIdentity: {
      contractSystemId: "western",
      independentFromBaziZiweiVedic: true,
      migrationId: null,
      productIdentity: null,
      releaseIdentity: null,
      targetSchema: null
    },
    upstreamBoundary: {
      admissionGatesSatisfied: upstreamResult.admissionGatesSatisfied,
      bindingFrozenVerified: upstreamResult.bindingFrozenVerified,
      candidateDigest: upstreamResult.candidateDigest,
      candidateId: upstreamResult.candidateId,
      currentObservationRegistryMechanicallyCurrentForWestern:
        upstreamResult.currentObservationRegistryMechanicallyCurrentForWestern,
      expertClaimsAuthorized: upstreamResult.expertClaimsAuthorized,
      independentExpertReviewsVerified: upstreamResult.independentExpertReviewsVerified,
      parentBacklinkAdded: false,
      parentModified: false,
      publicDeploymentAuthorized: upstreamResult.publicDeploymentAuthorized,
      publicReleaseAuthorized: upstreamResult.publicReleaseAuthorized,
      registryUpdated: false,
      releaseEvidenceComplete: upstreamResult.releaseEvidenceComplete,
      releaseReady: upstreamResult.releaseReady,
      rightsLegalConclusionEstablished: upstreamResult.rightsLegalConclusionEstablished,
      verifiedPrivateBrandConsumed: true
    }
  };
  candidate.candidateDigest = computeWesternHighRiskExpressionPolicyDraftDigest(candidate);
  return deepFreeze(candidate);
}

async function currentSnapshots(workspaceRoot) {
  const snapshots = [];
  for (const binding of SOURCE_BINDINGS) {
    snapshots.push(await readStableWorkspaceFile(workspaceRoot, binding.path));
  }
  return Object.freeze(snapshots);
}

export async function buildCurrentWesternHighRiskExpressionPolicyDraft(
  workspaceRoot = process.cwd()
) {
  const upstreamResult = await loadWesternProductizationVersionAwareObservationChildV11(workspaceRoot);
  if (!isVerifiedWesternProductizationVersionAwareObservationChildV11(upstreamResult)) {
    fail("UPSTREAM_PRIVATE_BRAND_MISSING", "Western v1.1 parent 没有通过私有品牌加载。 ");
  }
  if (upstreamResult.admissionGatesSatisfied !== 0
    || upstreamResult.bindingFrozenVerified !== 0
    || upstreamResult.independentExpertReviewsVerified !== 0
    || upstreamResult.releaseReady !== false
    || upstreamResult.publicReleaseAuthorized !== false) {
    fail("UPSTREAM_GATE_PROMOTION", "Western v1.1 parent 不再保持零准入红门。 ");
  }
  const snapshots = await currentSnapshots(workspaceRoot);
  const inspection = inspectPolicyAndCallSites(snapshots);
  return buildCandidate(snapshots, upstreamResult, inspection);
}

function verifyCandidateObject(candidate) {
  assertPlainJson(candidate, "candidate");
  const expectedTopLevelKeys = [
    "activeAdmissionEffect", "artifactBindings", "authorityBoundary", "candidateDigest",
    "candidateId", "createdAt", "doesNotEstablish", "evidenceAccounts", "gateSummary",
    "integrityBoundary", "mutationBoundary", "policyBoundary", "productBoundary",
    "projectReleaseGovernanceContext", "recordType", "schemaVersion", "status",
    "systemIdentity", "upstreamBoundary"
  ];
  const candidateTopLevelKeys = Object.keys(candidate);
  const topLevelKeysMatch = candidateTopLevelKeys.length === expectedTopLevelKeys.length
    && expectedTopLevelKeys.every((key) => Object.hasOwn(candidate, key));
  if (candidate.candidateId !== CANDIDATE_ID
    || candidate.schemaVersion !== "0.1.0"
    || candidate.recordType !== "western_high_risk_expression_policy_draft_v0_1"
    || candidate.activeAdmissionEffect !== "none") {
    fail("CANDIDATE_IDENTITY_MISMATCH", "Western 高风险政策候选身份不匹配。 ");
  }
  if (candidate.candidateDigest !== computeWesternHighRiskExpressionPolicyDraftDigest(candidate)) {
    fail("CANDIDATE_DIGEST_MISMATCH", "Western 高风险政策候选自摘要不匹配。 ");
  }
  const expectedEvidenceAccounts = [
    ["engineering_evidence", true],
    ["browser_runtime_evidence", false],
    ["content_truth", false],
    ["expert_truth", false],
    ["rights_legal_judgment", false],
    ["release_readiness", false],
    ["public_release_authorization", false]
  ];
  const evidenceAccountsMatch = Array.isArray(candidate.evidenceAccounts)
    && candidate.evidenceAccounts.length === expectedEvidenceAccounts.length
    && candidate.evidenceAccounts.every((entry, index) => (
      entry?.account === expectedEvidenceAccounts[index][0]
      && entry?.establishedByThisCandidate === expectedEvidenceAccounts[index][1]
    ));
  const requiredDisclaimers = [
    "semantic_or_paraphrase_complete_high_risk_detection",
    "formal_or_expert_approved_high_risk_expression_policy",
    "content_truth_expert_truth_source_freeze_or_rights_legal_conclusion",
    "complete_text_leaf_inventory_or_registered_call_graph_closure",
    "browser_runtime_chrome_edge_pwa_service_worker_or_public_host_evidence",
    "mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion",
    "western_product_release_schema_migration_or_formal_admission_identity",
    "release_readiness_public_deployment_public_release_or_expert_claims_authorization",
    "bazi_ziwei_vedic_authority_inheritance_cross_system_scoring_or_winner_selection"
  ];
  const disclaimersMatch = Array.isArray(candidate.doesNotEstablish)
    && candidate.doesNotEstablish.length === requiredDisclaimers.length
    && requiredDisclaimers.every((value, index) => candidate.doesNotEstablish[index] === value);
  if (!candidate.authorityBoundary
    || !topLevelKeysMatch
    || Object.values(candidate.authorityBoundary).some((value) => value !== false)
    || !evidenceAccountsMatch
    || !disclaimersMatch
    || candidate.createdAt !== CREATED_AT
    || candidate.status !== "isolated_runtime_lexical_egress_gate_candidate_zero_admission_effect"
    || candidate.gateSummary?.admissionGatesSatisfied !== 0
    || candidate.gateSummary?.bindingFrozenVerified !== 0
    || candidate.gateSummary?.independentExpertReviewsVerified !== 0
    || candidate.gateSummary?.formalHighRiskPolicyBound !== false
    || candidate.gateSummary?.expertReviewBundleComplete !== false
    || candidate.gateSummary?.requirementsUniverseClosed !== false
    || candidate.gateSummary?.rightsBundleComplete !== false
    || candidate.gateSummary?.sourceBundleComplete !== false
    || candidate.policyBoundary?.lexicalCoverageComplete !== false
    || candidate.policyBoundary?.semanticSafetyEstablished !== false
    || candidate.policyBoundary?.expertApproved !== false
    || candidate.policyBoundary?.formalHighRiskPolicyBound !== false
    || candidate.policyBoundary?.currentKnownExternalReviewFeedbackRoutedThroughGate !== true
    || candidate.policyBoundary?.completeTextLeafInventoryClosed !== false
    || candidate.policyBoundary?.registeredCallGraphClosureEstablished !== false
    || candidate.policyBoundary?.surfaceCallerAuthenticityEstablished !== false
    || candidate.policyBoundary?.textGuardCallCount !== EXPECTED_TEXT_GUARD_CALL_COUNT
    || candidate.policyBoundary?.templateGuardCallCount !== 2
    || candidate.integrityBoundary?.artifactBindingCount !== SOURCE_BINDINGS.length
    || candidate.integrityBoundary?.candidateDigestAlgorithm !== "SHA-256"
    || candidate.integrityBoundary?.candidateDigestDomain !== DIGEST_DOMAIN
    || candidate.integrityBoundary?.candidateDigestExcludesOwnField !== true
    || candidate.integrityBoundary?.candidateDigestIsDigitalSignature !== false
    || candidate.integrityBoundary?.crossFileAtomicSnapshot !== false
    || candidate.integrityBoundary?.fixedPathCurrentVerificationRequired !== true
    || candidate.integrityBoundary?.intervalMutationExcluded !== false
    || candidate.integrityBoundary?.preImportIntrinsicIntegrityEstablished !== false
    || candidate.integrityBoundary?.rawIdentitiesAreDigitalSignatures !== false
    || candidate.integrityBoundary?.sequentialEndpointSnapshotsOnly !== true
    || candidate.integrityBoundary?.signerIdentityEstablished !== false
    || candidate.integrityBoundary?.sourceInspectionMechanicallyVerified !== true
    || candidate.integrityBoundary?.upstreamCapabilityBrandCount !== 1
    || candidate.mutationBoundary?.abaExcluded !== false
    || candidate.mutationBoundary?.crossFileAtomicSnapshot !== false
    || candidate.mutationBoundary?.intervalMutationExcluded !== false
    || candidate.mutationBoundary?.mutationEpochReceipt !== null
    || candidate.productBoundary?.legacyV13Inherited !== false
    || candidate.productBoundary?.schema13Inherited !== false
    || candidate.productBoundary?.targetSchema !== null
    || candidate.productBoundary?.migrationId !== null
    || candidate.productBoundary?.releaseIdentity !== null
    || candidate.productBoundary?.productIdentity !== null
    || candidate.productBoundary?.centralRegistryIntegration !== false
    || candidate.productBoundary?.mainApplicationReachable !== false
    || candidate.productBoundary?.packageExportsEmpty !== true
    || candidate.productBoundary?.packagePrivate !== true
    || candidate.productBoundary?.productionImportForbidden !== true
    || candidate.mutationBoundary?.mutationEpochAvailable !== false
    || candidate.mutationBoundary?.storageMutationPerformed !== false
    || candidate.mutationBoundary?.networkTransmissionPerformed !== false
    || candidate.projectReleaseGovernanceContext?.defaultArtifact !== "legacy-v13"
    || candidate.projectReleaseGovernanceContext?.targetSchema !== 13
    || candidate.projectReleaseGovernanceContext?.migrationId !== null
    || candidate.projectReleaseGovernanceContext?.projectContextOnly !== true
    || candidate.projectReleaseGovernanceContext?.mutationEpochBoundaryRequired !== true
    || candidate.projectReleaseGovernanceContext?.publicDeploymentAuthorized !== false
    || candidate.systemIdentity?.contractSystemId !== "western"
    || candidate.systemIdentity?.independentFromBaziZiweiVedic !== true
    || candidate.systemIdentity?.migrationId !== null
    || candidate.systemIdentity?.productIdentity !== null
    || candidate.systemIdentity?.releaseIdentity !== null
    || candidate.systemIdentity?.targetSchema !== null
    || candidate.upstreamBoundary?.admissionGatesSatisfied !== 0
    || candidate.upstreamBoundary?.bindingFrozenVerified !== 0
    || candidate.upstreamBoundary?.independentExpertReviewsVerified !== 0
    || candidate.upstreamBoundary?.currentObservationRegistryMechanicallyCurrentForWestern !== false
    || candidate.upstreamBoundary?.expertClaimsAuthorized !== false
    || candidate.upstreamBoundary?.parentBacklinkAdded !== false
    || candidate.upstreamBoundary?.parentModified !== false
    || candidate.upstreamBoundary?.publicDeploymentAuthorized !== false
    || candidate.upstreamBoundary?.publicReleaseAuthorized !== false
    || candidate.upstreamBoundary?.registryUpdated !== false
    || candidate.upstreamBoundary?.releaseEvidenceComplete !== false
    || candidate.upstreamBoundary?.releaseReady !== false
    || candidate.upstreamBoundary?.rightsLegalConclusionEstablished !== false
    || candidate.upstreamBoundary?.verifiedPrivateBrandConsumed !== true) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "Western 高风险政策候选越过了内容、专家、权利、准入或发布红门。 ");
  }
  return deepFreeze(copyJson(candidate));
}

function parseCandidateBytes(bytes, label) {
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    fail("CANDIDATE_BYTES_REQUIRED", `${label} 必须使用原始字节。`);
  }
  let text;
  try {
    text = UTF8_FATAL.decode(bytes);
  } catch (cause) {
    fail("CANDIDATE_UTF8_FAILURE", `${label} 不是严格 UTF-8。`, cause);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    fail("CANDIDATE_JSON_FAILURE", `${label} 不是有效 JSON。`, cause);
  }
  if (text !== canonicalPrettyStringifyWesternHighRiskExpressionPolicyDraft(parsed)) {
    fail("CANDIDATE_MATERIALIZATION_MISMATCH", `${label} 不是固定 pretty JSON 物化。`);
  }
  return verifyCandidateObject(parsed);
}

export async function loadWesternHighRiskExpressionPolicyDraft(workspaceRoot = process.cwd()) {
  const persisted = await readStableWorkspaceFile(
    workspaceRoot,
    WESTERN_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH
  );
  if (persisted.rawBytes !== EXPECTED_PERSISTED.bytes
    || persisted.rawSha256 !== EXPECTED_PERSISTED.sha256) {
    fail("PERSISTED_IDENTITY_DRIFT", "Western 高风险政策候选固定路径 raw identity 漂移。 ");
  }
  const candidate = parseCandidateBytes(persisted.bytes, persisted.path);
  const current = await buildCurrentWesternHighRiskExpressionPolicyDraft(workspaceRoot);
  if (canonicalStringifyWesternHighRiskExpressionPolicyDraft(candidate)
    !== canonicalStringifyWesternHighRiskExpressionPolicyDraft(current)) {
    fail("CURRENT_EXPECTATION_MISMATCH", "Western 高风险政策候选与当前固定源码不一致。 ");
  }
  const result = deepFreeze(copyJson({
    activeAdmissionEffect: candidate.activeAdmissionEffect,
    admissionGatesSatisfied: candidate.gateSummary.admissionGatesSatisfied,
    artifactBindingCount: candidate.integrityBoundary.artifactBindingCount,
    bindingFrozenVerified: candidate.gateSummary.bindingFrozenVerified,
    bindingRequired: candidate.gateSummary.bindingRequired,
    browserRuntimeEvidenceEstablished: false,
    candidateDigest: candidate.candidateDigest,
    candidateId: candidate.candidateId,
    engineeringLexicalEgressGateImplemented:
      candidate.gateSummary.engineeringLexicalEgressGateImplemented,
    formalHighRiskPolicyBound: candidate.gateSummary.formalHighRiskPolicyBound,
    independentExpertReviewsVerified: candidate.gateSummary.independentExpertReviewsVerified,
    lexicalCoverageComplete: candidate.policyBoundary.lexicalCoverageComplete,
    policyId: candidate.policyBoundary.policyId,
    publicDeploymentAuthorized: candidate.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: candidate.authorityBoundary.publicReleaseAuthorized,
    releaseEvidenceComplete: candidate.authorityBoundary.releaseEvidenceComplete,
    releaseReady: candidate.authorityBoundary.releaseReady,
    semanticSafetyEstablished: candidate.policyBoundary.semanticSafetyEstablished,
    surfaceCount: candidate.policyBoundary.surfaceCount,
    upstreamPrivateBrandCount: candidate.integrityBoundary.upstreamCapabilityBrandCount
  }));
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedWesternHighRiskExpressionPolicyDraftResult(value) {
  return value !== null && typeof value === "object"
    && VERIFIED_RESULTS.has(value)
    && Object.isFrozen(value);
}

export const westernHighRiskExpressionPolicyDraftTestOnly = Object.freeze({
  CANDIDATE_ID,
  POLICY_ID,
  DIGEST_DOMAIN,
  EXPECTED_CATEGORY_IDS,
  EXPECTED_SURFACE_IDS,
  EXPECTED_PERSISTED,
  SOURCE_BINDINGS,
  inspectPolicyAndCallSites,
  parseCandidateBytes,
  readStableWorkspaceFile,
  verifyCandidateObject
});
