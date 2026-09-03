import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { verifyBaziEngineeringBindingCandidateLedger } from "./bazi-engineering-binding-candidate-lib.mjs";
import {
  BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH,
  isVerifiedBaziDttNoticeReconciliation,
  loadBaziDttNoticeReconciliation
} from "./bazi-dtt-notice-reconciliation-lib.mjs";
import { verifyBaziSourceBindingCandidateLedger } from "./bazi-source-binding-candidate-lib.mjs";
import { verifyBaziSourceRightsCandidateLedger } from "./bazi-source-rights-candidate-lib.mjs";

export const BAZI_BINDING_FREEZE_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.json";

const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BASIS_BYTES = 5_000_000;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;

const BASIS_ARTIFACT_PATHS = Object.freeze([
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH,
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts"
]);

function requirement(input) {
  return Object.freeze({
    ...input,
    candidateIds: Object.freeze([...input.candidateIds])
  });
}

const ENGINEERING_AUTHORITY_BOUNDARY =
  "engineering_definition_only_must_not_be_claimed_as_ancient_text";
const TRADITIONAL_CONTEXT_BOUNDARY =
  "traditional_context_only_not_parameter_authority";
const REVIEW_GATE_BOUNDARY =
  "review_question_only_not_algorithm_or_user_conclusion";

export const BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS = Object.freeze([
  requirement({
    bindingId: "binding:core:derive-assessment",
    evidenceSubjectId: "bazi.strength.binding.core.derive-assessment.v1",
    order: 1,
    sourceId: "hakimi-strength-core-0.1.0",
    sourceType: "engineering_contract",
    evidenceRole: "defines_engineering_candidate",
    registryLocatorKind: "stable_symbol",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "engineering_definition_and_rationale",
    authorityBoundary: ENGINEERING_AUTHORITY_BOUNDARY,
    candidateState: "project_engineering_candidate_envelope",
    candidateIds: ["hakimi-strength-core-0.1.0-engineering-candidate-v1"],
    candidateQuoteDigestCount: 0,
    currentDistributionBoundary: "local_repository_only_no_distribution_clearance"
  }),
  requirement({
    bindingId: "binding:policy:factor-inclusion",
    evidenceSubjectId: "bazi.strength.binding.policy.factor-inclusion.v1",
    order: 2,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract",
    evidenceRole: "defines_engineering_candidate",
    registryLocatorKind: "stable_symbol",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "engineering_definition_and_rationale",
    authorityBoundary: ENGINEERING_AUTHORITY_BOUNDARY,
    candidateState: "project_engineering_candidate_envelope",
    candidateIds: ["hakimi-strength-factor-inclusion-0.1.0-engineering-candidate-v1"],
    candidateQuoteDigestCount: 0,
    currentDistributionBoundary: "local_repository_only_no_distribution_clearance"
  }),
  requirement({
    bindingId: "binding:policy:direction-map",
    evidenceSubjectId: "bazi.strength.binding.policy.direction-map.v1",
    order: 3,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract",
    evidenceRole: "defines_engineering_candidate",
    registryLocatorKind: "stable_symbol",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "engineering_definition_and_rationale",
    authorityBoundary: ENGINEERING_AUTHORITY_BOUNDARY,
    candidateState: "project_engineering_candidate_envelope",
    candidateIds: ["hakimi-strength-direction-map-0.1.0-engineering-candidate-v1"],
    candidateQuoteDigestCount: 0,
    currentDistributionBoundary: "local_repository_only_no_distribution_clearance"
  }),
  requirement({
    bindingId: "binding:policy:weights",
    evidenceSubjectId: "bazi.strength.binding.policy.weights.v1",
    order: 4,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract",
    evidenceRole: "defines_engineering_candidate",
    registryLocatorKind: "stable_symbol",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "engineering_definition_and_rationale",
    authorityBoundary: ENGINEERING_AUTHORITY_BOUNDARY,
    candidateState: "project_engineering_candidate_envelope",
    candidateIds: ["hakimi-strength-weights-0.1.0-engineering-candidate-v1"],
    candidateQuoteDigestCount: 0,
    currentDistributionBoundary: "local_repository_only_no_distribution_clearance"
  }),
  requirement({
    bindingId: "binding:policy:month-duplication",
    evidenceSubjectId: "bazi.strength.binding.policy.month-duplication.v1",
    order: 5,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract",
    evidenceRole: "defines_engineering_candidate",
    registryLocatorKind: "stable_symbol",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "engineering_definition_and_rationale",
    authorityBoundary: ENGINEERING_AUTHORITY_BOUNDARY,
    candidateState: "project_engineering_candidate_envelope",
    candidateIds: ["hakimi-strength-month-duplication-0.1.0-engineering-candidate-v1"],
    candidateQuoteDigestCount: 0,
    currentDistributionBoundary: "local_repository_only_no_distribution_clearance"
  }),
  requirement({
    bindingId: "binding:policy:thresholds",
    evidenceSubjectId: "bazi.strength.binding.policy.thresholds.v1",
    order: 6,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract",
    evidenceRole: "defines_engineering_candidate",
    registryLocatorKind: "stable_symbol",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "engineering_definition_and_rationale",
    authorityBoundary: ENGINEERING_AUTHORITY_BOUNDARY,
    candidateState: "project_engineering_candidate_envelope",
    candidateIds: ["hakimi-strength-thresholds-0.1.0-engineering-candidate-v1"],
    candidateQuoteDigestCount: 0,
    currentDistributionBoundary: "local_repository_only_no_distribution_clearance"
  }),
  requirement({
    bindingId: "binding:sensitivity:six-scenarios",
    evidenceSubjectId: "bazi.strength.binding.sensitivity.six-scenarios.v1",
    order: 7,
    sourceId: "hakimi-strength-sensitivity-0.1.0",
    sourceType: "engineering_contract",
    evidenceRole: "defines_engineering_candidate",
    registryLocatorKind: "stable_symbol",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "engineering_definition_and_rationale",
    authorityBoundary: ENGINEERING_AUTHORITY_BOUNDARY,
    candidateState: "project_engineering_candidate_envelope",
    candidateIds: ["hakimi-strength-sensitivity-0.1.0-engineering-candidate-v1"],
    candidateQuoteDigestCount: 0,
    currentDistributionBoundary: "local_repository_only_no_distribution_clearance"
  }),
  requirement({
    bindingId: "binding:dtt:month-command",
    evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
    order: 8,
    sourceId: "dtt-chanwei-wikisource-r2600158",
    sourceType: "public_domain_classic_transcription",
    evidenceRole: "traditional_context_only",
    registryLocatorKind: "chapter_heading",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "historical_text_quote_and_context",
    authorityBoundary: TRADITIONAL_CONTEXT_BOUNDARY,
    candidateState: "public_revision_and_facsimile_candidate",
    candidateIds: ["dtt-chanwei-wikisource-r2600158-candidate-v1"],
    candidateQuoteDigestCount: 2,
    currentDistributionBoundary: "link_only_no_redistribution_clearance"
  }),
  requirement({
    bindingId: "binding:smt-v5:relative-relations",
    evidenceSubjectId: "bazi.strength.binding.smt-v5.relative-relations.v1",
    order: 9,
    sourceId: "smt-v5-wikisource-r2706483",
    sourceType: "public_domain_classic_transcription",
    evidenceRole: "traditional_context_only",
    registryLocatorKind: "chapter_heading",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "historical_text_quote_and_context",
    authorityBoundary: TRADITIONAL_CONTEXT_BOUNDARY,
    candidateState: "public_revision_and_facsimile_candidate",
    candidateIds: ["smt-v5-wikisource-r2706483-candidate-v1"],
    candidateQuoteDigestCount: 1,
    currentDistributionBoundary: "link_only_no_redistribution_clearance"
  }),
  requirement({
    bindingId: "binding:smt-v10:whole-chart",
    evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
    order: 10,
    sourceId: "smt-siku-v10-wikisource-r761703",
    sourceType: "public_domain_classic_transcription",
    evidenceRole: "traditional_context_only",
    registryLocatorKind: "chapter_heading",
    registryLocatorVerification: "verified",
    freezeEvidenceMode: "historical_text_quote_and_context",
    authorityBoundary: TRADITIONAL_CONTEXT_BOUNDARY,
    candidateState: "public_revision_and_facsimile_candidate",
    candidateIds: ["smt-siku-v10-wikisource-r761703-candidate-v1"],
    candidateQuoteDigestCount: 2,
    currentDistributionBoundary: "link_only_no_redistribution_clearance"
  }),
  requirement({
    bindingId: "binding:yhzp:hidden-listing",
    evidenceSubjectId: "bazi.strength.binding.yhzp.hidden-listing.v1",
    order: 11,
    sourceId: "yhzp-wikisource-r2593607",
    sourceType: "public_domain_classic_transcription",
    evidenceRole: "traditional_context_only",
    registryLocatorKind: "chapter_heading",
    registryLocatorVerification: "pending_manual_textual_verification",
    freezeEvidenceMode: "historical_text_quote_and_context",
    authorityBoundary: TRADITIONAL_CONTEXT_BOUNDARY,
    candidateState: "public_revision_and_facsimile_candidate",
    candidateIds: ["yhzp-wikisource-r2593607-candidate-v1"],
    candidateQuoteDigestCount: 1,
    currentDistributionBoundary: "link_only_no_redistribution_clearance"
  }),
  requirement({
    bindingId: "binding:zpzz:review-gates",
    evidenceSubjectId: "bazi.strength.binding.zpzz.review-gates.v1",
    order: 12,
    sourceId: "zpzz-ctext-ch974137-unfrozen",
    sourceType: "review_gate_locator",
    evidenceRole: "review_question_only",
    registryLocatorKind: "chapter_heading",
    registryLocatorVerification: "pending_manual_textual_verification",
    freezeEvidenceMode: "review_gate_text_and_context",
    authorityBoundary: REVIEW_GATE_BOUNDARY,
    candidateState: "blocked_no_reliable_edition",
    candidateIds: [],
    candidateQuoteDigestCount: 0,
    currentDistributionBoundary: "link_only_no_redistribution_clearance"
  })
]);

export class BaziBindingFreezeRequirementsError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziBindingFreezeRequirementsError";
    this.code = code;
  }
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  throw new BaziBindingFreezeRequirementsError("NON_CANONICAL_JSON", "八字 binding readiness 只接受有限规范 JSON 值。");
}

export function canonicalStringifyBaziBindingFreezeRequirements(value) {
  return JSON.stringify(canonicalValue(value));
}

export function computeBaziBindingFreezeRequirementsDigest(ledger) {
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return createHash("sha256")
    .update(canonicalStringifyBaziBindingFreezeRequirements(unsigned), "utf8")
    .digest("hex");
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || path.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new BaziBindingFreezeRequirementsError("UNSAFE_PATH", `八字 binding readiness 路径不安全：${relativePath}`);
  }
  return path.resolve(workspaceRoot, ...relativePath.split("/"));
}

function sameFileEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

async function readAtMost(handle, maxBytes, relativePath) {
  const chunks = [];
  let total = 0;
  while (total <= maxBytes) {
    const capacity = Math.min(64 * 1024, maxBytes + 1 - total);
    const chunk = Buffer.allocUnsafe(capacity);
    const { bytesRead } = await handle.read(chunk, 0, capacity, total);
    if (bytesRead === 0) break;
    chunks.push(Buffer.from(chunk.subarray(0, bytesRead)));
    total += bytesRead;
  }
  if (total > maxBytes) {
    throw new BaziBindingFreezeRequirementsError(
      "BASIS_INVALID",
      `八字 binding readiness 依据文件超过读取上限：${relativePath}`
    );
  }
  return Buffer.concat(chunks, total);
}

async function readBoundFile(workspaceRoot, relativePath, maxBytes = MAX_BASIS_BYTES) {
  const root = await realpath(path.resolve(workspaceRoot));
  const absolute = safeWorkspaceFile(root, relativePath);
  const before = await lstat(absolute);
  if (before.isSymbolicLink() || !before.isFile() || before.nlink !== 1) {
    throw new BaziBindingFreezeRequirementsError(
      "BASIS_INVALID",
      `八字 binding readiness 依据必须是独立普通文件：${relativePath}`
    );
  }
  if (before.size <= 0 || before.size > maxBytes) {
    throw new BaziBindingFreezeRequirementsError("BASIS_INVALID", `八字 binding readiness 依据文件无效：${relativePath}`);
  }
  const actual = await realpath(absolute);
  const relative = path.relative(root, actual);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new BaziBindingFreezeRequirementsError("UNSAFE_PATH", `八字 binding readiness 路径越界：${relativePath}`);
  }
  const handle = await open(actual, "r");
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 || !sameFileEndpoint(before, opened)) {
      throw new BaziBindingFreezeRequirementsError(
        "BASIS_INVALID",
        `八字 binding readiness 依据在打开前发生身份换绑：${relativePath}`
      );
    }
    const bytes = await readAtMost(handle, maxBytes, relativePath);
    const [afterHandle, afterPath, actualAfter] = await Promise.all([
      handle.stat(),
      lstat(absolute),
      realpath(absolute)
    ]);
    if (
      afterPath.isSymbolicLink()
      || !afterPath.isFile()
      || afterPath.nlink !== 1
      || bytes.byteLength !== opened.size
      || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(opened, afterPath)
      || actualAfter !== actual
    ) {
      throw new BaziBindingFreezeRequirementsError(
        "BASIS_INVALID",
        `八字 binding readiness 依据在读取端点之间发生变化：${relativePath}`
      );
    }
    return Object.freeze({ bytes, metadata: opened });
  } finally {
    await handle.close();
  }
}

function basisArtifactEvidence(relativePath, file) {
  return Object.freeze({
    path: relativePath,
    bytes: file.bytes.byteLength,
    sha256: createHash("sha256").update(file.bytes).digest("hex")
  });
}

function parseBoundJson(file, relativePath) {
  try {
    return JSON.parse(file.bytes.toString("utf8"));
  } catch (cause) {
    if (cause instanceof BaziBindingFreezeRequirementsError) throw cause;
    throw new BaziBindingFreezeRequirementsError("BASIS_INVALID", `八字 binding readiness JSON 依据无效：${relativePath}`, { cause });
  }
}

async function readBasisArtifactSnapshot(workspaceRoot) {
  const files = await Promise.all(BASIS_ARTIFACT_PATHS.map(async (relativePath) => [
    relativePath,
    await readBoundFile(workspaceRoot, relativePath)
  ]));
  return new Map(files);
}

function validateDefinitions() {
  if (BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS.length !== 12) {
    throw new BaziBindingFreezeRequirementsError("DEFINITION_DRIFT", "八字 binding readiness 必须精确包含 12 条。");
  }
  const bindingIds = new Set();
  const subjectIds = new Set();
  for (const [index, entry] of BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS.entries()) {
    if (entry.order !== index + 1 || bindingIds.has(entry.bindingId) || subjectIds.has(entry.evidenceSubjectId)) {
      throw new BaziBindingFreezeRequirementsError("DEFINITION_DRIFT", "八字 binding readiness 顺序或身份重复。");
    }
    bindingIds.add(entry.bindingId);
    subjectIds.add(entry.evidenceSubjectId);
  }
}

export function verifyBaziBindingCandidateRightsTrustChain(sourceLedger, rightsLedger, dttReconciliation) {
  if (!isVerifiedBaziDttNoticeReconciliation(dttReconciliation)) {
    throw new BaziBindingFreezeRequirementsError(
      "DTT_NOTICE_RECONCILIATION_UNVERIFIED",
      "八字 binding readiness 的来源／权利候选信任链必须消费完整品牌化 C-L3 reconciliation。"
    );
  }
  try {
    verifyBaziSourceBindingCandidateLedger(sourceLedger);
    verifyBaziSourceRightsCandidateLedger(rightsLedger, sourceLedger);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "unknown source/rights verifier failure";
    throw new BaziBindingFreezeRequirementsError(
      "CANDIDATE_TRUST_CHAIN_DRIFT",
      `八字 binding readiness 的来源／三层权利候选信任链无效：${detail}`,
      { cause }
    );
  }
  const dttSource = sourceLedger.candidates.find(
    (candidate) => candidate.bindingId === "binding:dtt:month-command"
  );
  const dttRights = rightsLedger.candidates.find(
    (candidate) => candidate.bindingId === "binding:dtt:month-command"
  );
  const currentSource = dttReconciliation.currentParentIdentities.sourceBinding;
  const currentRights = dttReconciliation.currentParentIdentities.sourceRights;
  if (
    sourceLedger.ledgerId !== currentSource.ledgerId
    || sourceLedger.ledgerDigest !== currentSource.ledgerDigest
    || dttSource?.candidateId !== currentSource.candidateId
    || dttSource?.candidateDigest !== currentSource.candidateDigest
    || rightsLedger.ledgerId !== currentRights.ledgerId
    || rightsLedger.ledgerDigest !== currentRights.ledgerDigest
    || dttRights?.rightsCandidateId !== currentRights.candidateId
    || dttRights?.candidateDigest !== currentRights.candidateDigest
  ) {
    throw new BaziBindingFreezeRequirementsError(
      "DTT_CURRENT_PARENT_DRIFT",
      "八字 binding readiness 的 DTT 来源／权利候选与 C-L3 当前父账身份不一致。"
    );
  }
  return Object.freeze({
    sourceCandidatesVerified: sourceLedger.candidates.length,
    rightsCandidatesVerified: rightsLedger.candidates.length,
    carrierAnchorsVerified: sourceLedger.candidates.reduce(
      (count, candidate) => count + candidate.facsimileAnchors.length,
      0
    )
  });
}

export function verifyBaziDttNoticeReconciliationGate(evidence, artifacts) {
  if (!isVerifiedBaziDttNoticeReconciliation(evidence)) {
    throw new BaziBindingFreezeRequirementsError(
      "DTT_NOTICE_RECONCILIATION_UNVERIFIED",
      "八字 binding readiness 只接受由完整 C-L3 loader 产生的品牌化告示 reconciliation 结果。"
    );
  }
  const notice = evidence.overlay.noticeProjection;
  const decision = evidence.overlay.reconciliationDecision;
  const sourceArtifact = artifacts?.sourceArtifact;
  const rightsArtifact = artifacts?.rightsArtifact;
  const overlayArtifact = artifacts?.overlayArtifact;
  const currentSource = evidence.currentParentIdentities.sourceBinding;
  const currentRights = evidence.currentParentIdentities.sourceRights;
  const invalid =
    evidence.bindingId !== "binding:dtt:month-command"
    || evidence.evidenceSubjectId !== "bazi.strength.binding.dtt.month-command.v1"
    || notice.oldidMainSlotPdOldLiteralObserved !== false
    || notice.renderedPagePdOldDependencyObserved !== true
    || notice.oldidAlonePinsRenderedNotice !== false
    || notice.ssidFixedFilePageNotice !== "pd_scan_top_level_observed"
    || notice.cadalFixedFilePageNotice !== "pd_old_top_level_observed_without_pd_scan_template"
    || notice.parentNoticeProjectionReestablishedForAllCarriers !== false
    || decision.currentParentsVersionedSupersessionComplete !== false
    || evidence.resolved !== false
    || evidence.promotionBlocked !== true
    || evidence.distributionPolicy !== "link_only"
    || evidence.formalSourceRightsRecordCount !== 0
    || evidence.formalSourceCarrierRecordCount !== 0
    || evidence.bindingFrozenVerified !== 0
    || evidence.contentTruthEstablished !== false
    || evidence.expertTruthEstablished !== false
    || evidence.rightsLegalConclusionEstablished !== false
    || evidence.releaseReady !== false
    || evidence.publicDeploymentAuthorized !== false
    || evidence.expertClaimsAuthorized !== false
    || evidence.crossFileAtomicSnapshot !== false
    || evidence.mutationEpochAvailable !== false
    || evidence.mutationEpochReceipt !== null
    || evidence.intervalMutationExcluded !== false
    || evidence.abaExcluded !== false
    || overlayArtifact?.path !== BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH
    || overlayArtifact?.bytes !== evidence.artifact.rawBytes
    || overlayArtifact?.sha256 !== evidence.artifact.rawSha256
    || sourceArtifact?.path !== currentSource.path
    || sourceArtifact?.bytes !== currentSource.rawBytes
    || sourceArtifact?.sha256 !== currentSource.rawSha256
    || rightsArtifact?.path !== currentRights.path
    || rightsArtifact?.bytes !== currentRights.rawBytes
    || rightsArtifact?.sha256 !== currentRights.rawSha256;
  if (invalid) {
    throw new BaziBindingFreezeRequirementsError(
      "DTT_NOTICE_RECONCILIATION_DRIFT",
      "DTT C-L2 告示 reconciliation 不再保持父账未改写、矛盾未解决、晋级阻断与 authority 全红边界。"
    );
  }
  return Object.freeze({
    bindingId: evidence.bindingId,
    evidenceSubjectId: evidence.evidenceSubjectId,
    evidenceArtifact: Object.freeze({
      ...overlayArtifact,
      reconciliationId: evidence.reconciliationId,
      reconciliationDigest: evidence.reconciliationDigest
    }),
    historicalParentIdentities: evidence.historicalParentIdentities,
    currentParentIdentities: evidence.currentParentIdentities,
    reconciliationMode: "versioned_overlay_preserves_historical_parents_and_verifies_current_parents",
    oldidMainSlotPdOldLiteralObserved: false,
    renderedPagePdOldDependencyObserved: true,
    oldidAlonePinsRenderedNotice: false,
    ssidFixedFilePageNotice: notice.ssidFixedFilePageNotice,
    cadalFixedFilePageNotice: notice.cadalFixedFilePageNotice,
    parentNoticeProjectionReestablishedForAllCarriers: false,
    noticeDiscrepancyResolved: false,
    currentParentsVersionedSupersessionComplete: false,
    promotionBlocked: true,
    promotionGateEffect: "blocks_binding_promotion_without_conferring_rights_or_freeze",
    currentDistributionBoundary: "link_only_no_redistribution_clearance",
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    bindingFrozenVerified: 0,
    rightsLegalConclusionEstablished: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    intervalMutationExcluded: false,
    abaExcluded: false
  });
}

async function validateCurrentMechanicalState(workspaceRoot, basisSnapshot) {
  validateDefinitions();
  const file = (relativePath) => {
    const snapshot = basisSnapshot.get(relativePath);
    if (!snapshot) {
      throw new BaziBindingFreezeRequirementsError(
        "BASIS_INVALID",
        `八字 binding readiness 缺少同一读取快照：${relativePath}`
      );
    }
    return snapshot;
  };
  const registrySource = file("packages/bazi-interpretation/src/strength-claim-registry.ts").bytes.toString("utf8");
  const subjectSource = file("packages/knowledge-core/src/index.ts").bytes.toString("utf8");

  for (const [index, entry] of BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS.entries()) {
    const start = registrySource.indexOf(`bindingId: "${entry.bindingId}"`);
    const next = BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS[index + 1];
    const end = next ? registrySource.indexOf(`bindingId: "${next.bindingId}"`, start + 1) : registrySource.indexOf("function claim", start + 1);
    if (start < 0 || end <= start) {
      throw new BaziBindingFreezeRequirementsError("REGISTRY_DRIFT", `当前来源注册表缺少 ${entry.bindingId}。`);
    }
    const block = registrySource.slice(start, end);
    for (const expected of [
      `sourceId: "${entry.sourceId}"`,
      `sourceType: "${entry.sourceType}"`,
      `evidenceRole: "${entry.evidenceRole}"`,
      `kind: "${entry.registryLocatorKind}"`,
      `verificationStatus: "${entry.registryLocatorVerification}"`
    ]) {
      if (!block.includes(expected)) {
        throw new BaziBindingFreezeRequirementsError("REGISTRY_DRIFT", `${entry.bindingId} 与 readiness 定义不一致：${expected}`);
      }
    }
    if (!subjectSource.includes(`"${entry.bindingId}": "${entry.evidenceSubjectId}"`)) {
      throw new BaziBindingFreezeRequirementsError("SUBJECT_DRIFT", `${entry.bindingId} evidence subject 已漂移。`);
    }
  }

  const engineeringCandidateLedger = parseBoundJson(
    file("content/bazi-strength-engineering-binding-candidates.v1.json"),
    "content/bazi-strength-engineering-binding-candidates.v1.json"
  );
  await verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, engineeringCandidateLedger);
  const engineeringGate = engineeringCandidateLedger.gateSummary ?? {};
  if (
    engineeringGate.engineeringBindingsRequired !== 7
    || engineeringGate.candidateEnvelopesMechanicallyVerified !== 7
    || engineeringGate.candidatesWithArtifactIdentityLocks !== 7
    || engineeringGate.rationaleDraftsPresent !== 7
    || engineeringGate.engineeringRationalesFrozen !== 0
    || engineeringGate.engineeringReviewsVerified !== 0
    || engineeringGate.independentDomainReviewsVerified !== 0
    || engineeringGate.formalSourceRightsRecordsCreated !== 0
    || engineeringGate.redistributionClearancesEstablished !== 0
    || engineeringGate.bindingsFrozen !== 0
    || engineeringGate.classicalAuthorityClaims !== 0
    || engineeringGate.expertAuthorityClaims !== 0
    || engineeringGate.releaseReady !== false
  ) {
    throw new BaziBindingFreezeRequirementsError(
      "ENGINEERING_CANDIDATE_GATE_DRIFT",
      "七条工程 Binding 候选账不再保持 7 envelopes / 7 rationale drafts / 0 reviewed / 0 frozen 的失败关闭边界。"
    );
  }
  const actualEngineeringCandidates = new Map(
    (engineeringCandidateLedger.candidates ?? []).map((candidate) => [candidate.bindingId, candidate])
  );
  for (const entry of BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS.slice(0, 7)) {
    const actual = actualEngineeringCandidates.get(entry.bindingId);
    if (
      !actual
      || entry.candidateState !== "project_engineering_candidate_envelope"
      || entry.candidateIds.length !== 1
      || actual.candidateId !== entry.candidateIds[0]
      || actual.sourceId !== entry.sourceId
      || actual.evidenceSubjectId !== entry.evidenceSubjectId
      || actual.reviewState?.engineeringRationaleFrozen !== false
      || actual.reviewState?.bindingFreezeEffect !== "none"
    ) {
      throw new BaziBindingFreezeRequirementsError(
        "ENGINEERING_CANDIDATE_DRIFT",
        `${entry.bindingId} 工程 candidate 身份或失败关闭状态已漂移。`
      );
    }
  }
  if (actualEngineeringCandidates.size !== 7) {
    throw new BaziBindingFreezeRequirementsError(
      "ENGINEERING_CANDIDATE_DRIFT",
      "工程候选账必须精确保持七条项目定义 candidate。"
    );
  }

  const candidateLedger = parseBoundJson(
    file("content/bazi-strength-source-binding-candidates.v1.json"),
    "content/bazi-strength-source-binding-candidates.v1.json"
  );
  const rightsLedger = parseBoundJson(
    file("content/bazi-strength-source-rights-candidates.v1.json"),
    "content/bazi-strength-source-rights-candidates.v1.json"
  );
  const dttReconciliation = await loadBaziDttNoticeReconciliation(workspaceRoot);
  verifyBaziBindingCandidateRightsTrustChain(candidateLedger, rightsLedger, dttReconciliation);
  const candidateGate = candidateLedger.gateSummary ?? {};
  if (
    candidateGate.bindingRequired !== 12
    || candidateGate.bindingFrozenVerified !== 0
    || candidateGate.candidateBindingCount !== 4
    || candidateGate.normalizedFacsimileCollationCandidatesObserved !== 7
    || candidateGate.exactGlyphFacsimileCorrespondenceCandidatesObserved !== 1
    || candidateGate.exactFacsimileCollationsVerified !== 0
    || candidateGate.independentHumanFacsimileCollationsVerified !== 0
    || candidateGate.sourceBodiesStored !== 0
    || candidateGate.quoteTextsStored !== 0
    || candidateGate.rightsReviewsVerified !== 0
    || candidateGate.expertReviewsVerified !== 0
    || candidateGate.sourceBundleComplete !== false
  ) {
    throw new BaziBindingFreezeRequirementsError(
      "CANDIDATE_GATE_DRIFT",
      "来源候选账不再保持 4 candidates / 7 normalized candidates / 1 nonexpert exact-glyph candidate / 0 verified exact / 0 frozen 的失败关闭边界。"
    );
  }
  const actualCandidates = new Map((candidateLedger.candidates ?? []).map((candidate) => [candidate.bindingId, candidate]));
  for (const entry of BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS) {
    const actual = actualCandidates.get(entry.bindingId);
    if (entry.candidateState === "project_engineering_candidate_envelope") {
      if (actual !== undefined) {
        throw new BaziBindingFreezeRequirementsError("CANDIDATE_DRIFT", `${entry.bindingId} 不得混入历史来源 candidate 账。`);
      }
      continue;
    }
    if (entry.candidateIds.length === 0) {
      if (actual !== undefined) {
        throw new BaziBindingFreezeRequirementsError("CANDIDATE_DRIFT", `${entry.bindingId} 出现未登记 candidate。`);
      }
      continue;
    }
    if (
      !actual
      || entry.candidateIds.length !== 1
      || actual.candidateId !== entry.candidateIds[0]
      || actual.sourceId !== entry.sourceId
      || actual.evidenceSubjectId !== entry.evidenceSubjectId
      || !Array.isArray(actual.quoteCandidates)
      || actual.quoteCandidates.length !== entry.candidateQuoteDigestCount
    ) {
      throw new BaziBindingFreezeRequirementsError("CANDIDATE_DRIFT", `${entry.bindingId} candidate 身份或 quote digest 数量已漂移。`);
    }
  }
  if (actualCandidates.size !== 4) {
    throw new BaziBindingFreezeRequirementsError("CANDIDATE_DRIFT", "来源候选账必须精确保持四条已观察 candidate。");
  }

  const rightsGate = rightsLedger.gateSummary ?? {};
  if (
    rightsGate.rightsCandidateCount !== 4
    || rightsGate.formalSourceRightsRecordsCreated !== 0
    || rightsGate.formalSourceCarrierRecordsCreated !== 0
    || rightsGate.legalReviewsVerified !== 0
    || rightsGate.workLayersCleared !== 0
    || rightsGate.editionLayersCleared !== 0
    || rightsGate.carrierLayersCleared !== 0
    || rightsGate.redistributableSources !== 0
    || rightsGate.rightsBundleComplete !== false
  ) {
    throw new BaziBindingFreezeRequirementsError("RIGHTS_GATE_DRIFT", "三层权利候选账不再保持正式记录与法律结论均为 0。");
  }
  const rightsBindings = new Set((rightsLedger.candidates ?? []).map((candidate) => candidate.bindingId));
  if (rightsBindings.size !== 4 || [...actualCandidates.keys()].some((bindingId) => !rightsBindings.has(bindingId))) {
    throw new BaziBindingFreezeRequirementsError("RIGHTS_GATE_DRIFT", "三层权利候选与来源候选 binding 集合不一致。");
  }

  const expertPacket = parseBoundJson(
    file("content/bazi-strength-expert-review-packet.v1.json"),
    "content/bazi-strength-expert-review-packet.v1.json"
  );
  const expertGate = expertPacket.gateSummary ?? {};
  if (
    expertGate.domainExpertsRequired !== 2
    || expertGate.reviewerSlotsOccupied !== 0
    || expertGate.identitiesVerified !== 0
    || expertGate.credentialsVerified !== 0
    || expertGate.independentExpertReviewsVerified !== 0
    || expertGate.expertReviewBundleComplete !== false
  ) {
    throw new BaziBindingFreezeRequirementsError("EXPERT_GATE_DRIFT", "专家候选包不再保持现实专家 0/2 的失败关闭边界。");
  }
  return verifyBaziDttNoticeReconciliationGate(
    dttReconciliation,
    {
      overlayArtifact: basisArtifactEvidence(
        BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH,
        file(BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH)
      ),
      sourceArtifact: basisArtifactEvidence(
        "content/bazi-strength-source-binding-candidates.v1.json",
        file("content/bazi-strength-source-binding-candidates.v1.json")
      ),
      rightsArtifact: basisArtifactEvidence(
        "content/bazi-strength-source-rights-candidates.v1.json",
        file("content/bazi-strength-source-rights-candidates.v1.json")
      )
    }
  );
}

function readinessEntry(definition) {
  const freezeState = definition.candidateState === "public_revision_and_facsimile_candidate"
    || definition.candidateState === "project_engineering_candidate_envelope"
    ? "candidate_only_unbound"
    : definition.candidateState === "blocked_no_reliable_edition"
      ? "blocked_unbound"
      : "required_unbound";
  return Object.freeze({
    ...definition,
    candidateIds: Object.freeze([...definition.candidateIds]),
    freezeState,
    sourceBodyStored: false,
    sourceBodyDigest: null,
    exactQuoteTextStored: false,
    exactQuoteDigest: null,
    exactLocatorEstablishedForFreeze: false,
    workIdentityFrozen: false,
    editionIdentityFrozen: false,
    carrierIdentityFrozen: false,
    engineeringRationaleFrozen: false,
    ruleIds: Object.freeze([]),
    workRightsEvidenceBound: false,
    editionRightsEvidenceBound: false,
    carrierRightsEvidenceBound: false,
    sourceRightsRecordId: null,
    sourceCarrierRecordId: null,
    formalDistributionPolicy: null,
    independentSourceRightsReviewerIds: Object.freeze([]),
    independentDomainReviewIds: Object.freeze([]),
    traditionalAuthorityClaimed: false,
    parameterAuthorityClaimed: false,
    frozenAt: null,
    supersedes: null,
    supersededBy: null,
    bindingDigest: null
  });
}

export async function buildCurrentBaziBindingFreezeRequirements(workspaceRoot, options = {}) {
  const basisSnapshot = await readBasisArtifactSnapshot(workspaceRoot);
  const dttNoticeReconciliationGate = await validateCurrentMechanicalState(workspaceRoot, basisSnapshot);
  const basisArtifacts = BASIS_ARTIFACT_PATHS.map((relativePath) =>
    basisArtifactEvidence(relativePath, basisSnapshot.get(relativePath)));
  const bindings = BAZI_BINDING_FREEZE_REQUIREMENT_DEFINITIONS.map(readinessEntry);
  const unsigned = {
    schemaVersion: "1.6.0",
    recordType: "bazi_binding_freeze_readiness_requirements",
    ledgerId: "hakimi.bazi.strength.binding-freeze-readiness/1.6.0",
    status: "readiness_only_dtt_notice_reconciliation_blocked_bindings_frozen_0_of_12",
    createdAt: options.createdAt ?? new Date().toISOString(),
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    defaultClosureRequirements: {
      workIdentityRequired: true,
      editionIdentityRequired: true,
      carrierIdentityRequired: true,
      sourceBodyDigestRequired: true,
      exactLocatorRequired: true,
      minimalSufficientQuoteOrEngineeringRationaleRequired: true,
      ruleIdsRequired: true,
      workRightsEvidenceRequired: true,
      editionRightsEvidenceRequired: true,
      carrierRightsEvidenceRequired: true,
      sourceRightsRecordRequired: true,
      sourceCarrierRecordRequired: true,
      twoIndependentSourceRightsReviewersRequired: true,
      twoIndependentDomainOpinionsRequired: true,
      supersessionChainRequired: true,
      activeParentNoticeReconciliationRequiredBeforePromotion: true,
      nonRedistributableMaterialPolicy: "private_or_link_only",
      generatedModelWinnerSelectionAllowed: false
    },
    basisArtifacts,
    bindings,
    dttNoticeReconciliationGate,
    gateSummary: {
      bindingRequired: 12,
      projectEngineeringBindings: 7,
      historicalTextBindings: 4,
      reviewGateBindings: 1,
      engineeringCandidateEnvelopesMechanicallyVerified: 7,
      engineeringCandidateArtifactIdentitiesMechanicallyVerified: 7,
      engineeringRationaleDraftsObserved: 7,
      sourceCandidatesObserved: bindings
        .filter((entry) => entry.candidateState === "public_revision_and_facsimile_candidate")
        .reduce((sum, entry) => sum + entry.candidateIds.length, 0),
      candidateQuoteDigestsObserved: bindings
        .filter((entry) => entry.candidateState === "public_revision_and_facsimile_candidate")
        .reduce((sum, entry) => sum + entry.candidateQuoteDigestCount, 0),
      normalizedFacsimileCollationCandidatesObserved: 7,
      exactGlyphFacsimileCorrespondenceCandidatesObserved: 1,
      exactFacsimileCollationsVerified: 0,
      independentHumanFacsimileCollationsVerified: 0,
      registryLocatorsMechanicallyVerified: bindings.filter((entry) => entry.registryLocatorVerification === "verified").length,
      registryLocatorsPendingManualTextualVerification: bindings.filter((entry) => entry.registryLocatorVerification !== "verified").length,
      sourceNoticeReconciliationsRequired: 1,
      sourceNoticeReconciliationsResolved: 0,
      sourceNoticeDiscrepancyPromotionBlocks: 1,
      bindingFrozenVerified: 0,
      sourceBodiesBound: 0,
      exactQuoteTextsFrozen: 0,
      exactLocatorsEstablishedForFreeze: 0,
      engineeringRationalesFrozen: 0,
      workIdentitiesFrozen: 0,
      editionIdentitiesFrozen: 0,
      carrierIdentitiesFrozen: 0,
      workRightsEvidenceBound: 0,
      editionRightsEvidenceBound: 0,
      carrierRightsEvidenceBound: 0,
      independentSourceRightsReviewsVerified: 0,
      independentDomainReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseReady: false
    },
    evidenceLedger: {
      engineeringReadinessIdentity: "basis_artifacts_binding_inventory_engineering_candidate_envelopes_current_source_candidate_counts_and_dtt_notice_reconciliation_block_verified",
      browserRuntimeEvidence: "not_assessed_in_readiness_ledger",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [
      "source_body_or_exact_quote_text",
      "reliable_edition_or_carrier_identity",
      "binding_frozen_verification",
      "dtt_parent_notice_discrepancy_resolved",
      "traditional_parameter_authority",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "browser_or_runtime_validation",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  return Object.freeze({
    ...unsigned,
    ledgerDigest: computeBaziBindingFreezeRequirementsDigest(unsigned)
  });
}

function requireLedgerObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BaziBindingFreezeRequirementsError("LEDGER_INVALID", "八字 binding readiness ledger 必须是 JSON 对象。");
  }
  return value;
}

export async function readBaziBindingFreezeRequirements(
  workspaceRoot,
  relativePath = BAZI_BINDING_FREEZE_REQUIREMENTS_RELATIVE_PATH
) {
  try {
    const snapshot = await readBoundFile(workspaceRoot, relativePath, MAX_LEDGER_BYTES);
    return requireLedgerObject(JSON.parse(snapshot.bytes.toString("utf8")));
  } catch (cause) {
    if (cause instanceof BaziBindingFreezeRequirementsError) throw cause;
    throw new BaziBindingFreezeRequirementsError("LEDGER_INVALID", "八字 binding readiness ledger 不是有效 JSON。", { cause });
  }
}

export async function verifyBaziBindingFreezeRequirements(workspaceRoot, ledgerInput) {
  const ledger = requireLedgerObject(ledgerInput);
  if (
    typeof ledger.createdAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(ledger.createdAt)
    || !LOWERCASE_SHA256.test(ledger.ledgerDigest ?? "")
  ) {
    throw new BaziBindingFreezeRequirementsError("LEDGER_INVALID", "八字 binding readiness 时间或摘要无效。");
  }
  const expected = await buildCurrentBaziBindingFreezeRequirements(workspaceRoot, {
    createdAt: ledger.createdAt
  });
  if (
    canonicalStringifyBaziBindingFreezeRequirements(ledger)
    !== canonicalStringifyBaziBindingFreezeRequirements(expected)
  ) {
    throw new BaziBindingFreezeRequirementsError(
      "LEDGER_MISMATCH",
      "八字 binding readiness 与当前 12 条注册表、工程候选账、来源候选账、三层权利账、DTT 告示 reconciliation 或失败关闭状态不一致。"
    );
  }
  return Object.freeze({
    ledger,
    bindingRequired: ledger.gateSummary.bindingRequired,
    sourceCandidatesObserved: ledger.gateSummary.sourceCandidatesObserved,
    dttNoticeDiscrepancyPromotionBlocked: ledger.dttNoticeReconciliationGate.promotionBlocked,
    sourceNoticeReconciliationsResolved: ledger.gateSummary.sourceNoticeReconciliationsResolved,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    ledgerDigest: ledger.ledgerDigest
  });
}
