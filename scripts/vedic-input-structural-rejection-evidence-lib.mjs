import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  canonicalPrettyStringifyVedicInputContractDraft,
  computeVedicInputContractDraftSemanticDigest,
  parseVedicInputContractDraftJsonBytes,
  verifyVedicInputContractDraft
} from "./vedic-input-contract-draft-lib.mjs";
import {
  VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  canonicalPrettyStringifyVedicInputContractRequirements,
  parseVedicInputContractRequirementsJsonBytes,
  verifyVedicInputContractRequirementsLedger
} from "./vedic-input-contract-requirements-lib.mjs";
import {
  buildFixedVedicInputStructuralRejectionProbes,
  canonicalPrettyStringifyVedicInputStructuralRejectionValue,
  canonicalStringifyVedicInputStructuralRejectionValue,
  computeVedicInputStructuralDiagnosticReceiptIdentity,
  executeVedicInputStructuralRejectionPrecheck,
  isTrustedVedicInputStructuralDiagnosticReceipt,
  parseVedicInputStructuralPrecheckCandidateJsonBytes,
  vedicInputStructuralRejectionExecutionTestOnly
} from "./vedic-input-structural-rejection-execution-lib.mjs";

export const VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH =
  "content/system-admission/vedic-input-structural-rejection-execution-evidence.v1.json";

const EXECUTION_RELATIVE_PATH =
  "scripts/vedic-input-structural-rejection-execution-lib.mjs";
const DRAFT_HELPER_RELATIVE_PATH =
  "scripts/vedic-input-contract-draft-lib.mjs";
const REQUIREMENTS_HELPER_RELATIVE_PATH =
  "scripts/vedic-input-contract-requirements-lib.mjs";
const EVIDENCE_DIGEST_DOMAIN =
  "hakimi.vedic.input-structural-rejection-execution-evidence.v1";
const PROBE_SET_DIGEST_DOMAIN =
  "hakimi.vedic.input-structural-precheck-probe-set.v1";
const CREATED_AT = "2026-08-30T00:00:00.000Z";
const MAX_EVIDENCE_BYTES = 1_000_000;
const MAX_BOUND_FILE_BYTES = 2_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const EXPECTED_DRAFT_RAW_IDENTITY = Object.freeze({
  bytes: 16_529,
  path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
});

const EXPECTED_REQUIREMENTS_RAW_IDENTITY = Object.freeze({
  bytes: 15_859,
  path: VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  sha256: "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59"
});

const EXPECTED_SCHEMA_SEMANTIC_DIGEST =
  "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08";
const EXPECTED_REQUIREMENTS_LEDGER_DIGEST =
  "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0";

const EXPECTED_DIAGNOSTICS = Object.freeze([
  Object.freeze({
    code: "SCHEMA_REQUIRED_PROPERTY_MISSING",
    draftSchemaShapeConforming: false,
    jsonPointer: "/civil_calendar_and_date",
    probeId: "missing_required_root_field",
    stage: "draft_schema_structure"
  }),
  Object.freeze({
    code: "SCHEMA_PATTERN_MISMATCH",
    draftSchemaShapeConforming: false,
    jsonPointer: "/ephemeris_identity_version_and_coverage/data_digest_sha256",
    probeId: "invalid_ephemeris_digest_shape",
    stage: "draft_schema_structure"
  }),
  Object.freeze({
    code: "DECLARED_DST_GAP_REJECTED",
    draftSchemaShapeConforming: true,
    jsonPointer: "/dst_gap_overlap_resolution",
    probeId: "declared_dst_gap",
    stage: "candidate_declared_gap_boundary"
  }),
  Object.freeze({
    code: "INPUT_CONTRACT_NOT_ADMITTED",
    draftSchemaShapeConforming: true,
    jsonPointer: "",
    probeId: "structurally_complete_contract_not_admitted",
    stage: "admission_boundary"
  })
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "admitted_vedic_input_contract_or_product_input_instance",
  "general_structural_validator_completeness_or_all_malformed_input_rejection",
  "product_input_rejection_acceptance_normalization_or_time_resolution_receipt",
  "calendar_utc_dst_tzdb_time_scale_ephemeris_or_astronomical_correctness",
  "fact_rule_interpretation_prediction_or_domain_truth",
  "source_body_quote_locator_license_rights_or_legal_conclusion",
  "expert_identity_credential_independence_opinion_or_expert_truth",
  "runtime_selection_product_integration_browser_storage_pwa_or_host_evidence",
  "loaded_module_node_loader_launcher_or_historical_execution_identity",
  "artifact_authenticity_digital_signature_or_signer_identity",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
  "release_readiness_public_deployment_or_public_release_authorization"
]);

export class VedicInputStructuralRejectionEvidenceError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicInputStructuralRejectionEvidenceError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new VedicInputStructuralRejectionEvidenceError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function captureJson(value) {
  try {
    return JSON.parse(canonicalStringifyVedicInputStructuralRejectionValue(value));
  } catch (cause) {
    if (cause instanceof VedicInputStructuralRejectionEvidenceError) throw cause;
    fail(
      typeof cause?.code === "string" ? cause.code : "INPUT_VALUE_INVALID",
      cause instanceof Error ? cause.message : String(cause),
      cause
    );
  }
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function exactJson(left, right) {
  return canonicalStringifyVedicInputStructuralRejectionValue(left)
    === canonicalStringifyVedicInputStructuralRejectionValue(right);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function domainDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicInputStructuralRejectionValue(value), "utf8")
    .digest("hex");
}

export function canonicalStringifyVedicInputStructuralRejectionEvidence(value) {
  return canonicalStringifyVedicInputStructuralRejectionValue(value);
}

export function canonicalPrettyStringifyVedicInputStructuralRejectionEvidence(value) {
  return canonicalPrettyStringifyVedicInputStructuralRejectionValue(value);
}

export function computeVedicInputStructuralRejectionEvidenceDigest(evidenceInput) {
  const evidence = captureJson(evidenceInput);
  const { evidenceDigest: _ignored, ...unsigned } = evidence;
  return domainDigest(EVIDENCE_DIGEST_DOMAIN, unsigned);
}

export function parseVedicInputStructuralRejectionEvidenceJsonBytes(
  bytes,
  label = "吠陀结构预检拒绝执行证据 JSON"
) {
  try {
    return parseVedicInputContractDraftJsonBytes(bytes, label, MAX_EVIDENCE_BYTES);
  } catch (cause) {
    fail(
      typeof cause?.code === "string" ? cause.code : "JSON_INVALID",
      cause instanceof Error ? cause.message : String(cause),
      cause
    );
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string" ? relativePath.split("/") : [];
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 320
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment.includes(":"))) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀结构预检证据路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...segments);
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀结构预检证据路径越界。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

function sameFileEndpoint(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.nlink === right.nlink
    && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

async function capturePlainDirectoryChain(workspaceRoot, absolutePath, code, label) {
  const root = path.resolve(workspaceRoot);
  const targetDirectory = path.dirname(path.resolve(absolutePath));
  if (!isSameOrWithin(root, targetDirectory)) fail(code, label + "目录链越出工作区。");
  const relative = path.relative(root, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints = [];
  let cursor = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    const metadata = await lstat(cursor, { bigint: true });
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      fail(code, label + "目录链不能包含符号链接、junction 或特殊端点。");
    }
    const resolvedPath = await realpath(cursor);
    if (endpoints.length > 0 && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(code, label + "目录链 realpath 越出工作区。");
    }
    endpoints.push(Object.freeze({ absolutePath: cursor, metadata, resolvedPath }));
  }
  return Object.freeze(endpoints);
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined && entry.absolutePath === other.absolutePath
      && entry.resolvedPath === other.resolvedPath && sameFileEndpoint(entry.metadata, other.metadata);
  });
}

async function readAtMost(handle, maxBytes, code, label) {
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
  if (total > maxBytes) fail(code, label + "超过输入上限。");
  return Buffer.concat(chunks, total);
}

async function readStableWorkspaceFile(workspaceRoot, relativePath, maxBytes, options) {
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await capturePlainDirectoryChain(
      workspaceRoot,
      absolute,
      options.invalidCode,
      options.label
    );
    [before, actual] = await Promise.all([lstat(absolute, { bigint: true }), realpath(absolute)]);
  } catch (cause) {
    if (cause instanceof VedicInputStructuralRejectionEvidenceError) throw cause;
    fail(options.missingCode, options.label + "不存在。", cause);
  }
  const resolvedRoot = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(resolvedRoot, actual) || before.isSymbolicLink() || !before.isFile()
    || before.nlink !== 1n || before.size <= 0n || before.size > BigInt(maxBytes)) {
    fail(options.invalidCode, options.label + "必须是工作区内独立普通小文件。");
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  const handle = await open(actual, fsConstants.O_RDONLY | noFollow);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameFileEndpoint(before, opened)) {
      fail(options.invalidCode, options.label + "在打开前发生身份换绑。");
    }
    const bytes = await readAtMost(handle, maxBytes, options.invalidCode, options.label);
    const [afterHandle, afterPath, actualAfter, directoryChainAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(absolute, { bigint: true }),
      realpath(absolute),
      capturePlainDirectoryChain(workspaceRoot, absolute, options.invalidCode, options.label)
    ]);
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1n
      || BigInt(bytes.byteLength) !== opened.size || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(opened, afterPath) || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(options.invalidCode, options.label + "在读取端点之间发生变化。");
    }
    return Object.freeze({
      bytes,
      path: relativePath,
      sha256: sha256(bytes),
      size: bytes.byteLength
    });
  } finally {
    await handle.close();
  }
}

function requireRawIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.size !== expected.bytes || snapshot.sha256 !== expected.sha256) {
    fail("UPSTREAM_IDENTITY_MISMATCH", label + "原始字节身份漂移。");
  }
}

async function readAndVerifyUpstreams(workspaceRoot) {
  const draftSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
    MAX_BOUND_FILE_BYTES,
    {
      invalidCode: "DRAFT_ENDPOINT_INVALID",
      label: "吠陀输入合同草案",
      missingCode: "DRAFT_MISSING"
    }
  );
  requireRawIdentity(draftSnapshot, EXPECTED_DRAFT_RAW_IDENTITY, "吠陀输入合同草案");
  const draft = parseVedicInputContractDraftJsonBytes(draftSnapshot.bytes);
  if (new TextDecoder("utf-8", { fatal: true }).decode(draftSnapshot.bytes)
    !== canonicalPrettyStringifyVedicInputContractDraft(draft)) {
    fail("DRAFT_MATERIALIZATION_MISMATCH", "吠陀输入合同草案不是唯一 canonical materialization。");
  }
  const draftResult = await verifyVedicInputContractDraft(workspaceRoot, draft);
  if (draftResult.schemaSemanticDigest !== EXPECTED_SCHEMA_SEMANTIC_DIGEST
    || computeVedicInputContractDraftSemanticDigest(draft) !== EXPECTED_SCHEMA_SEMANTIC_DIGEST) {
    fail("DRAFT_SEMANTIC_DIGEST_MISMATCH", "吠陀输入合同草案语义摘要漂移。");
  }

  const requirementsSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
    MAX_BOUND_FILE_BYTES,
    {
      invalidCode: "REQUIREMENTS_ENDPOINT_INVALID",
      label: "吠陀输入合同要求账",
      missingCode: "REQUIREMENTS_MISSING"
    }
  );
  requireRawIdentity(requirementsSnapshot, EXPECTED_REQUIREMENTS_RAW_IDENTITY, "吠陀输入合同要求账");
  const requirements = parseVedicInputContractRequirementsJsonBytes(requirementsSnapshot.bytes);
  if (new TextDecoder("utf-8", { fatal: true }).decode(requirementsSnapshot.bytes)
    !== canonicalPrettyStringifyVedicInputContractRequirements(requirements)) {
    fail("REQUIREMENTS_MATERIALIZATION_MISMATCH", "吠陀输入合同要求账不是唯一 canonical materialization。");
  }
  const requirementsResult = await verifyVedicInputContractRequirementsLedger(workspaceRoot, requirements);
  if (requirementsResult.ledgerDigest !== EXPECTED_REQUIREMENTS_LEDGER_DIGEST) {
    fail("REQUIREMENTS_LEDGER_DIGEST_MISMATCH", "吠陀输入合同要求账摘要漂移。");
  }
  return Object.freeze({
    draft,
    draftIdentity: {
      bytes: draftSnapshot.size,
      path: draftSnapshot.path,
      semanticDigest: draftResult.schemaSemanticDigest,
      sha256: draftSnapshot.sha256
    },
    requirementsIdentity: {
      bytes: requirementsSnapshot.size,
      ledgerDigest: requirementsResult.ledgerDigest,
      path: requirementsSnapshot.path,
      sha256: requirementsSnapshot.sha256
    }
  });
}

async function readLocalExecutionClosure(workspaceRoot) {
  const specs = [
    [EXECUTION_RELATIVE_PATH, "吠陀结构预检执行实现"],
    [DRAFT_HELPER_RELATIVE_PATH, "吠陀输入草案 helper"],
    [REQUIREMENTS_HELPER_RELATIVE_PATH, "吠陀输入要求账 helper"]
  ];
  const identities = [];
  for (const [relativePath, label] of specs) {
    const snapshot = await readStableWorkspaceFile(
      workspaceRoot,
      relativePath,
      MAX_BOUND_FILE_BYTES,
      {
        invalidCode: "LOCAL_EXECUTION_CLOSURE_ENDPOINT_INVALID",
        label,
        missingCode: "LOCAL_EXECUTION_CLOSURE_MISSING"
      }
    );
    identities.push({ bytes: snapshot.size, path: snapshot.path, sha256: snapshot.sha256 });
  }
  return identities;
}

function projectRuntimeReceipt(receipt) {
  if (!isTrustedVedicInputStructuralDiagnosticReceipt(receipt)) {
    fail("RUNTIME_RECEIPT_NOT_TRUSTED", "固定 probe 没有取得当前模块实例注册的 runtime receipt。");
  }
  return captureJson(receipt);
}

export async function buildCurrentVedicInputStructuralRejectionEvidence(workspaceRoot) {
  const upstream = await readAndVerifyUpstreams(workspaceRoot);
  const localExecutionClosureBindings = await readLocalExecutionClosure(workspaceRoot);
  const probeResults = [];
  for (const probe of buildFixedVedicInputStructuralRejectionProbes()) {
    const receipt = executeVedicInputStructuralRejectionPrecheck(probe.candidate, upstream.draft);
    probeResults.push({
      candidateIdentity: receipt.candidateIdentity,
      candidateRawInputPersisted: false,
      containsPersonIdentity: false,
      diagnostic: receipt.diagnostic,
      externalOrRealPersonInputUsed: false,
      probeId: probe.probeId,
      projectControlledNoPersonProbe: true,
      runtimeReceiptProjection: projectRuntimeReceipt(receipt),
      savedEvidenceReceiptIsRuntimeReceipt: false
    });
  }
  const probeSetDigest = domainDigest(
    PROBE_SET_DIGEST_DOMAIN,
    probeResults.map((entry) => ({
      candidateIdentity: entry.candidateIdentity,
      diagnostic: entry.diagnostic,
      probeId: entry.probeId
    }))
  );
  const unsigned = {
    artifactId: "hakimi.vedic.input-structural-rejection-execution-evidence/1.0.0",
    authorityBoundary: {
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false,
      formalAdmissionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false
    },
    bindingDirection: "one_way_child_to_existing_input_draft_requirements_and_local_execution_closure_only",
    createdAt: CREATED_AT,
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    evidenceLedgers: {
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established",
      engineeringEvidence: "four_fixed_no_person_diagnostic_rejection_probes_replayed",
      expertTruth: "not_established",
      publicReleaseAuthorization: "not_authorized",
      releaseReadiness: "not_ready",
      rightsLegalConclusion: "not_established"
    },
    executionBoundary: {
      acceptedInputs: 0,
      candidateRawInputsPersisted: 0,
      diagnosticProbeExecutions: probeResults.length,
      factArtifactsIssued: 0,
      inputInstances: 0,
      normalizationReceipts: 0,
      partialOutputsIssued: 0,
      probeClass: "project_controlled_fixed_no_person_shape_only",
      productInputCandidates: 0,
      productInputRejectionReceipts: 0,
      structuralPrecheckCountsAsAcceptance: false,
      successReceipts: 0,
      timeResolutionReceipts: 0
    },
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: EVIDENCE_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    localExecutionClosureBindings,
    observationBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      endpointSnapshotOnly: true,
      heldFileHandleReads: true,
      historicalExecutionAttested: false,
      intervalMutationExcluded: false,
      loadedModuleByteIdentityVerified: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      nodeLoaderIntegrityVerified: false,
      pathEndpointRevalidated: true,
      plainDirectoryChainRequired: true,
      rawHashAndParseUseSameBufferPerJsonFile: true,
      runtimeLauncherIdentityVerified: false
    },
    probeCoverageBoundary: {
      allMalformedInputsRejectedEstablished: false,
      fixedProbeSetVerified: true,
      inputRejectionCapabilityEstablished: false,
      probeCoverageComplete: false,
      structuralValidatorComplete: false
    },
    probeExecution: {
      diagnosticCodes: probeResults.map((entry) => entry.diagnostic.code),
      fixedProbeCount: probeResults.length,
      probeIds: probeResults.map((entry) => entry.probeId),
      probeResults,
      probeSetDigest
    },
    productBoundary: {
      domainManifest: "absent",
      factContract: "standalone_draft_not_executed",
      factProducer: "absent",
      inputContract: "isolated_contract_draft_not_admitted",
      migrationId: null,
      productRuntime: "not_selected_not_implemented_not_executed",
      productSurface: "absent",
      projector: "absent",
      releaseIdentity: null,
      targetSchema: null,
      versionedRuleset: "standalone_draft_not_executed"
    },
    projectReleaseGovernance: {
      activeRulePack: "legacy-v13",
      migrationId: null,
      targetSchema: 13
    },
    receiptBoundary: {
      acceptanceReceiptIssued: false,
      diagnosticReceiptClass: "structural_precheck_diagnostic_rejection_receipt",
      factReceiptIssued: false,
      inputAccepted: false,
      inputContractGateSatisfied: false,
      receiptIsFactReceipt: false,
      receiptIsProductReceipt: false,
      requirementsResolved: 0,
      requirementsUniverseClosed: false,
      runtimeReceiptRegistrationNotSerializable: true,
      successReceiptIssued: false
    },
    recordType: "vedic_input_structural_rejection_execution_evidence_v1",
    schemaVersion: "1.0.0",
    semanticValidationBoundary: {
      calendarValidityEstablished: false,
      candidateConsistencyEstablished: false,
      ephemerisCoverageEstablished: false,
      ianaTimeZoneIdentityEstablished: false,
      intervalOrderingEstablished: false,
      semanticValidationPerformed: false,
      transitionConsistencyEstablished: false
    },
    sourceExpertRightsBoundary: {
      exactLocatorVerified: false,
      exactQuoteVerified: false,
      expertCredentialVerified: false,
      expertIdentityVerified: false,
      expertIndependenceVerified: false,
      expertOpinionVerified: false,
      licenseEstablished: false,
      rightsEstablished: false,
      sourceBindingEstablished: false,
      sourceBodyVerified: false
    },
    status: "four_fixed_diagnostic_rejection_probes_verified_not_product_admitted",
    upstreamBindings: {
      inputContractDraft: upstream.draftIdentity,
      inputContractRequirements: upstream.requirementsIdentity,
      parentBacklinkRequired: false,
      parentOrRegistryModifiedByThisChild: false
    }
  };
  return deepFreezeJson({
    ...unsigned,
    evidenceDigest: domainDigest(EVIDENCE_DIGEST_DOMAIN, unsigned)
  });
}

function allFalse(record) {
  return record && typeof record === "object" && !Array.isArray(record)
    && Object.values(record).every((value) => value === false);
}

function requireStaticFailClosedBoundary(evidence) {
  if (evidence?.artifactId !== "hakimi.vedic.input-structural-rejection-execution-evidence/1.0.0"
    || evidence.recordType !== "vedic_input_structural_rejection_execution_evidence_v1"
    || evidence.schemaVersion !== "1.0.0"
    || evidence.createdAt !== CREATED_AT
    || evidence.status !== "four_fixed_diagnostic_rejection_probes_verified_not_product_admitted"
    || evidence.bindingDirection
      !== "one_way_child_to_existing_input_draft_requirements_and_local_execution_closure_only") {
    fail("EVIDENCE_IDENTITY_INVALID", "吠陀结构预检拒绝执行证据根身份无效。");
  }
  if (!allFalse(evidence.authorityBoundary)
    || !allFalse(evidence.sourceExpertRightsBoundary)
    || !allFalse(evidence.semanticValidationBoundary)) {
    fail("AUTHORITY_BOUNDARY_PROMOTED", "吠陀结构预检证据不得提升语义、内容、专家、权利或发布权威。");
  }
  if (!exactJson(evidence.probeCoverageBoundary, {
    allMalformedInputsRejectedEstablished: false,
    fixedProbeSetVerified: true,
    inputRejectionCapabilityEstablished: false,
    probeCoverageComplete: false,
    structuralValidatorComplete: false
  })) {
    fail("PROBE_COVERAGE_PROMOTED", "四个固定 probe 不得被冒充通用 validator 能力。");
  }
  if (!exactJson(evidence.executionBoundary, {
    acceptedInputs: 0,
    candidateRawInputsPersisted: 0,
    diagnosticProbeExecutions: EXPECTED_DIAGNOSTICS.length,
    factArtifactsIssued: 0,
    inputInstances: 0,
    normalizationReceipts: 0,
    partialOutputsIssued: 0,
    probeClass: "project_controlled_fixed_no_person_shape_only",
    productInputCandidates: 0,
    productInputRejectionReceipts: 0,
    structuralPrecheckCountsAsAcceptance: false,
    successReceipts: 0,
    timeResolutionReceipts: 0
  })) {
    fail("EXECUTION_BOUNDARY_PROMOTED", "固定诊断 probe 被计入产品输入、回执、事实或成功能力。");
  }
  if (!exactJson(evidence.receiptBoundary, {
    acceptanceReceiptIssued: false,
    diagnosticReceiptClass: "structural_precheck_diagnostic_rejection_receipt",
    factReceiptIssued: false,
    inputAccepted: false,
    inputContractGateSatisfied: false,
    receiptIsFactReceipt: false,
    receiptIsProductReceipt: false,
    requirementsResolved: 0,
    requirementsUniverseClosed: false,
    runtimeReceiptRegistrationNotSerializable: true,
    successReceiptIssued: false
  })) {
    fail("RECEIPT_BOUNDARY_PROMOTED", "诊断 receipt 被冒充产品、事实、成功或可序列化 runtime receipt。");
  }
  if (!exactJson(evidence.productBoundary, {
    domainManifest: "absent",
    factContract: "standalone_draft_not_executed",
    factProducer: "absent",
    inputContract: "isolated_contract_draft_not_admitted",
    migrationId: null,
    productRuntime: "not_selected_not_implemented_not_executed",
    productSurface: "absent",
    projector: "absent",
    releaseIdentity: null,
    targetSchema: null,
    versionedRuleset: "standalone_draft_not_executed"
  }) || !exactJson(evidence.projectReleaseGovernance, {
    activeRulePack: "legacy-v13",
    migrationId: null,
    targetSchema: 13
  })) {
    fail("PRODUCT_BOUNDARY_PROMOTED", "吠陀结构预检证据不得借入产品身份或改变项目发布治理。");
  }
  if (!exactJson(evidence.observationBoundary, {
    abaExcluded: false,
    crossFileAtomicSnapshot: false,
    endpointSnapshotOnly: true,
    heldFileHandleReads: true,
    historicalExecutionAttested: false,
    intervalMutationExcluded: false,
    loadedModuleByteIdentityVerified: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    nodeLoaderIntegrityVerified: false,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true,
    rawHashAndParseUseSameBufferPerJsonFile: true,
    runtimeLauncherIdentityVerified: false
  })) {
    fail("OBSERVATION_BOUNDARY_PROMOTED", "吠陀结构预检证据不得声称模块、loader、epoch、原子快照或 ABA 身份。");
  }
  if (!Array.isArray(evidence.doesNotEstablish) || !exactJson(evidence.doesNotEstablish, [...DOES_NOT_ESTABLISH])) {
    fail("DOES_NOT_ESTABLISH_INVALID", "吠陀结构预检证据的否定边界无效。");
  }
  const probes = evidence.probeExecution;
  if (probes?.fixedProbeCount !== EXPECTED_DIAGNOSTICS.length
    || !exactJson(probes.probeIds, EXPECTED_DIAGNOSTICS.map((entry) => entry.probeId))
    || !exactJson(probes.diagnosticCodes, EXPECTED_DIAGNOSTICS.map((entry) => entry.code))
    || !Array.isArray(probes.probeResults) || probes.probeResults.length !== EXPECTED_DIAGNOSTICS.length
    || typeof probes.probeSetDigest !== "string" || !SHA256_PATTERN.test(probes.probeSetDigest)) {
    fail("PROBE_EXECUTION_INVALID", "吠陀结构预检固定 probe 清单无效。");
  }
  const candidateDigests = new Set();
  for (let index = 0; index < probes.probeResults.length; index += 1) {
    const result = probes.probeResults[index];
    const expected = EXPECTED_DIAGNOSTICS[index];
    const projection = result?.runtimeReceiptProjection;
    if (result?.probeId !== expected.probeId
      || result.containsPersonIdentity !== false
      || result.externalOrRealPersonInputUsed !== false
      || result.projectControlledNoPersonProbe !== true
      || result.candidateRawInputPersisted !== false
      || result.savedEvidenceReceiptIsRuntimeReceipt !== false
      || typeof result.candidateIdentity?.canonicalDigest !== "string"
      || !SHA256_PATTERN.test(result.candidateIdentity.canonicalDigest)
      || !Number.isSafeInteger(result.candidateIdentity.canonicalByteLength)
      || result.candidateIdentity.canonicalByteLength <= 0
      || result.candidateIdentity.canonicalizationProfile
        !== "sorted_object_keys_compact_json_finite_numbers_no_alias_v1"
      || result.candidateIdentity.digestAlgorithm !== "SHA-256"
      || result.candidateIdentity.digestDomain
        !== vedicInputStructuralRejectionExecutionTestOnly.candidateDigestDomain
      || result.candidateIdentity.digestIsAnonymous !== false
      || result.candidateIdentity.digestIsSafeToPublish !== false
      || result.candidateIdentity.personalDataPresenceAssessed !== false
      || result.candidateIdentity.rawInputPersisted !== false
      || candidateDigests.has(result.candidateIdentity.canonicalDigest)
      || result.diagnostic?.code !== expected.code
      || result.diagnostic?.jsonPointer !== expected.jsonPointer
      || result.diagnostic?.stage !== expected.stage
      || result.diagnostic?.draftSchemaShapeConforming !== expected.draftSchemaShapeConforming
      || result.diagnostic?.candidateDeclarationVerifiedAsWorldFact !== false
      || result.diagnostic?.dstClassificationVerified !== false
      || result.diagnostic?.ianaTimeZoneResolved !== false
      || result.diagnostic?.nonexistentWallTimeEstablished !== false
      || result.diagnostic?.timeResolutionPerformed !== false
      || result.diagnostic?.timezoneDatabaseConsulted !== false
      || !exactJson(projection?.candidateIdentity, result.candidateIdentity)
      || !exactJson(projection?.diagnostic, result.diagnostic)
      || projection?.receiptClass !== "structural_precheck_diagnostic_rejection_receipt"
      || projection?.countsAsInputInstance !== false
      || projection?.countsAsProductInputRejectionReceipt !== false
      || projection?.countsTowardAdmission !== false
      || projection?.inputAccepted !== false
      || projection?.inputRejectionCapabilityEstablished !== false
      || projection?.receiptIsFactReceipt !== false
      || projection?.receiptIsProductReceipt !== false
      || projection?.requirementsResolved !== 0
      || projection?.receiptIdentity?.bindsCandidateSchemaAndDiagnostic !== true
      || projection?.receiptIdentity?.digestAlgorithm !== "SHA-256"
      || projection?.receiptIdentity?.digestDomain
        !== vedicInputStructuralRejectionExecutionTestOnly.receiptIdentityDigestDomain
      || projection?.receiptId
        !== "hakimi.vedic.structural-precheck-diagnostic/" + projection?.receiptIdentity?.digest
      || typeof projection?.receiptIdentity?.digest !== "string"
      || !SHA256_PATTERN.test(projection.receiptIdentity.digest)
      || computeVedicInputStructuralDiagnosticReceiptIdentity(projection)
        !== projection.receiptIdentity.digest
      || !exactJson(
        projection?.schemaIdentity,
        vedicInputStructuralRejectionExecutionTestOnly.expectedSchemaIdentity
      )
      || !allFalse(projection?.artifactOutputs)
      || !allFalse(projection?.authorityBoundary)) {
      fail("PROBE_RESULT_INVALID", "吠陀结构预检固定 probe 结果被替换、重复或晋级。");
    }
    candidateDigests.add(result.candidateIdentity.canonicalDigest);
  }
  const recomputedProbeSetDigest = domainDigest(
    PROBE_SET_DIGEST_DOMAIN,
    probes.probeResults.map((entry) => ({
      candidateIdentity: entry.candidateIdentity,
      diagnostic: entry.diagnostic,
      probeId: entry.probeId
    }))
  );
  if (probes.probeSetDigest !== recomputedProbeSetDigest) {
    fail("PROBE_SET_DIGEST_MISMATCH", "吠陀结构预检固定 probe 集摘要无效。");
  }
  if (evidence.upstreamBindings?.parentBacklinkRequired !== false
    || evidence.upstreamBindings?.parentOrRegistryModifiedByThisChild !== false
    || !exactJson(evidence.upstreamBindings?.inputContractDraft, {
      bytes: EXPECTED_DRAFT_RAW_IDENTITY.bytes,
      path: EXPECTED_DRAFT_RAW_IDENTITY.path,
      semanticDigest: EXPECTED_SCHEMA_SEMANTIC_DIGEST,
      sha256: EXPECTED_DRAFT_RAW_IDENTITY.sha256
    })
    || !exactJson(evidence.upstreamBindings?.inputContractRequirements, {
      bytes: EXPECTED_REQUIREMENTS_RAW_IDENTITY.bytes,
      ledgerDigest: EXPECTED_REQUIREMENTS_LEDGER_DIGEST,
      path: EXPECTED_REQUIREMENTS_RAW_IDENTITY.path,
      sha256: EXPECTED_REQUIREMENTS_RAW_IDENTITY.sha256
    })) {
    fail("UPSTREAM_BINDING_INVALID", "吠陀结构预检证据上游绑定无效。");
  }
  const expectedClosurePaths = [
    EXECUTION_RELATIVE_PATH,
    DRAFT_HELPER_RELATIVE_PATH,
    REQUIREMENTS_HELPER_RELATIVE_PATH
  ];
  if (!Array.isArray(evidence.localExecutionClosureBindings)
    || evidence.localExecutionClosureBindings.length !== expectedClosurePaths.length
    || !evidence.localExecutionClosureBindings.every((entry, index) => (
      entry?.path === expectedClosurePaths[index]
      && Number.isSafeInteger(entry.bytes) && entry.bytes > 0
      && typeof entry.sha256 === "string" && SHA256_PATTERN.test(entry.sha256)
    ))) {
    fail("LOCAL_EXECUTION_CLOSURE_INVALID", "吠陀结构预检本地执行闭包端点身份无效。");
  }
  if (!exactJson(evidence.integrityBoundary, {
    authenticityEstablished: false,
    digestAlgorithm: "SHA-256",
    digestDomain: EVIDENCE_DIGEST_DOMAIN,
    digestIsDigitalSignature: false,
    digitalSignature: null,
    signerIdentity: null
  }) || typeof evidence.evidenceDigest !== "string" || !SHA256_PATTERN.test(evidence.evidenceDigest)
    || computeVedicInputStructuralRejectionEvidenceDigest(evidence) !== evidence.evidenceDigest) {
    fail("EVIDENCE_DIGEST_MISMATCH", "吠陀结构预检证据摘要或真实性边界无效。");
  }
}

export async function readVedicInputStructuralRejectionEvidence(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH,
    MAX_EVIDENCE_BYTES,
    {
      invalidCode: "EVIDENCE_ENDPOINT_INVALID",
      label: "吠陀结构预检拒绝执行证据",
      missingCode: "EVIDENCE_MISSING"
    }
  );
  const evidence = parseVedicInputStructuralRejectionEvidenceJsonBytes(snapshot.bytes);
  const source = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
  if (source !== canonicalPrettyStringifyVedicInputStructuralRejectionEvidence(evidence)) {
    fail("EVIDENCE_MATERIALIZATION_MISMATCH", "吠陀结构预检证据不是唯一 canonical materialization。");
  }
  return evidence;
}

export async function verifyVedicInputStructuralRejectionEvidence(workspaceRoot, evidenceInput) {
  const evidence = captureJson(evidenceInput);
  requireStaticFailClosedBoundary(evidence);
  const expected = await buildCurrentVedicInputStructuralRejectionEvidence(workspaceRoot);
  if (!exactJson(evidence, expected)) {
    fail("EVIDENCE_CURRENT_CLOSURE_MISMATCH", "吠陀结构预检证据与当前上游和本地执行闭包不一致。");
  }
  const frozen = deepFreezeJson(captureJson(evidence));
  return Object.freeze({
    acceptedInputs: frozen.executionBoundary.acceptedInputs,
    diagnosticProbeExecutions: frozen.executionBoundary.diagnosticProbeExecutions,
    evidence: frozen,
    evidenceDigest: frozen.evidenceDigest,
    fixedProbeSetVerified: frozen.probeCoverageBoundary.fixedProbeSetVerified,
    inputInstances: frozen.executionBoundary.inputInstances,
    probeCoverageComplete: frozen.probeCoverageBoundary.probeCoverageComplete,
    productInputRejectionReceipts: frozen.executionBoundary.productInputRejectionReceipts,
    publicDeploymentAuthorized: frozen.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: frozen.authorityBoundary.publicReleaseAuthorized,
    releaseReady: frozen.authorityBoundary.releaseReady,
    status: frozen.status
  });
}

export const vedicInputStructuralRejectionEvidenceTestOnly = Object.freeze({
  evidenceDigestDomain: EVIDENCE_DIGEST_DOMAIN,
  expectedDiagnostics: EXPECTED_DIAGNOSTICS,
  expectedDraftRawIdentity: EXPECTED_DRAFT_RAW_IDENTITY,
  expectedRequirementsLedgerDigest: EXPECTED_REQUIREMENTS_LEDGER_DIGEST,
  expectedRequirementsRawIdentity: EXPECTED_REQUIREMENTS_RAW_IDENTITY,
  localExecutionClosurePaths: Object.freeze([
    EXECUTION_RELATIVE_PATH,
    DRAFT_HELPER_RELATIVE_PATH,
    REQUIREMENTS_HELPER_RELATIVE_PATH
  ]),
  safeWorkspaceFile,
  parseCandidateJsonBytes: parseVedicInputStructuralPrecheckCandidateJsonBytes,
  executionTestOnly: vedicInputStructuralRejectionExecutionTestOnly
});
