import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { parseExpression } from "@babel/parser";
import {
  CROSS_SYSTEM_COMPARISON_DRAFT_VERSION
} from "../packages/cross-system-comparison-draft/src/index.ts";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION
} from "../packages/ziwei-doushu-contracts-draft/src/index.ts";
import {
  calculateIztro258EngineeringFixture
} from "../packages/ziwei-iztro-adapter-draft/src/index.ts";
import {
  ZIWEI_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION,
  ZIWEI_ENGINEERING_FACT_FIELDS,
  projectZiweiCrossSystemEngineeringFacts
} from "../packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.ts";
import {
  ASTRONOMY_ENGINE_VERSION,
  WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  WESTERN_ASTRONOMY_PROJECTION_VERSION,
  runWesternAstronomyUtcDiagnostic
} from "../packages/western-astronomy-engine-adapter-draft/src/index.ts";
import {
  WESTERN_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION,
  WESTERN_ENGINEERING_FACT_FIELDS,
  projectWesternCrossSystemEngineeringFacts
} from "../packages/western-astronomy-engine-adapter-draft/src/cross-system-engineering-fact-projection.ts";
import {
  INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
  verifyAllIndependentDomainManifests
} from "./independent-domain-release-manifest-lib.mjs";
import {
  verifyAllIndependentSourceRequirements
} from "./independent-source-binding-requirements-lib.mjs";
import {
  readBaziV17ManifestDriftDecisionLedger,
  verifyBaziV17ManifestDriftDecisionLedger
} from "./bazi-v17-manifest-drift-decision-lib.mjs";
import {
  computeSystemAdmissionRegistryDigest,
  readSystemAdmissionRegistry,
  verifySystemAdmissionRegistry
} from "./system-admission-registry-lib.mjs";
import { verifyFactReceiptV1Inputs } from "./cross-system-engineering-fact-v1-inputs.mjs";

export const CROSS_SYSTEM_ENGINEERING_FACT_RECEIPT_REGISTRY_RELATIVE_PATH =
  "packages/cross-system-comparison-draft/src/generated-engineering-fact-receipts.v1.json";

const ZIWEI_PROJECTOR_RELATIVE_PATH =
  "packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.ts";
const WESTERN_PROJECTOR_RELATIVE_PATH =
  "packages/western-astronomy-engine-adapter-draft/src/cross-system-engineering-fact-projection.ts";
const COMPARISON_CONTRACT_RELATIVE_PATH =
  "packages/cross-system-comparison-draft/src/index.ts";
const SYSTEM_ADMISSION_REGISTRY_RELATIVE_PATH =
  "content/system-admission/four-system-admission.v1.json";
const VEDIC_BOUNDARY_ADR_RELATIVE_PATH =
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const REGISTRY_CREATED_AT = "2026-08-29T00:00:00.000Z";
const MAX_REGISTRY_BYTES = 1_000_000;
const MAX_BOUND_FILE_BYTES = 8_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const RELEASE_GOVERNANCE = Object.freeze({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const ZIWEI_INPUT = Object.freeze({
  contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  systemId: "ziwei-doushu",
  calendarInput: Object.freeze({ calendar: "gregorian", date: "2000-01-01" }),
  shichenIndex: 6,
  sexForCalculation: "male",
  solarTimeAdjustment: "none",
  civilContext: Object.freeze({
    usedForCalculation: false,
    localTime: null,
    timeZone: null,
    location: Object.freeze({
      precision: "unknown",
      label: "",
      latitude: null,
      longitude: null
    })
  }),
  birthSourceRef: "cross-system.synthetic-fixture.e1",
  sourceNote: "Synthetic engineering receipt candidate; not a person or truth claim."
});

const WESTERN_INPUT = Object.freeze({
  protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  utcInstant: "2000-01-01T12:00:00.000Z",
  bodyIds: Object.freeze(["sun", "moon"])
});

const BOUND_COMPONENT_IDS = Object.freeze([
  "execution_rules",
  "input_policy",
  "fact_contract"
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "input_semantic_equivalence_between_systems",
  "browser_or_deployed_runtime_evidence",
  "content_or_domain_truth",
  "source_text_or_exact_quote_truth",
  "rights_or_legal_conclusion",
  "expert_identity_credentials_independence_opinion_or_truth",
  "cross_system_concept_equivalence",
  "cross_file_atomic_snapshot",
  "continuous_interval_mutation_or_aba_exclusion",
  "formal_system_admission",
  "release_readiness",
  "public_release_authorization"
]);

export class CrossSystemEngineeringFactReceiptError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "CrossSystemEngineeringFactReceiptError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new CrossSystemEngineeringFactReceiptError(code, message);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key])])
    );
  }
  fail("NON_CANONICAL_JSON", "跨体系工程事实回执只接受有限规范 JSON 值。");
}

export function canonicalStringifyCrossSystemEngineeringFactReceipt(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256Canonical(value) {
  return createHash("sha256")
    .update(canonicalStringifyCrossSystemEngineeringFactReceipt(value), "utf8")
    .digest("hex");
}

function computeUnsignedDigest(value, digestField) {
  const { [digestField]: _digest, ...unsigned } = value;
  return sha256Canonical(unsigned);
}

export function computeCrossSystemEngineeringFactReceiptDigest(receipt) {
  return computeUnsignedDigest(receipt, "receiptDigest");
}

export function computeCrossSystemEngineeringFactReceiptRegistryDigest(registry) {
  return computeUnsignedDigest(registry, "registryDigest");
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "跨体系工程事实回执对象超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "跨体系工程事实回执对象超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INPUT_VALUE_INVALID", "跨体系工程事实回执对象含非有限数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "跨体系工程事实回执对象超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "跨体系工程事实回执对象只接受 JSON 数据值。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "跨体系工程事实回执对象不接受循环引用。");
  state.active.add(value);
  try {
    let descriptors;
    let prototype;
    let array;
    try {
      array = Array.isArray(value);
      prototype = Object.getPrototypeOf(value);
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch (cause) {
      throw new CrossSystemEngineeringFactReceiptError(
        "INPUT_OBJECT_UNSAFE",
        "跨体系工程事实回执对象无法安全捕获描述符。",
        { cause }
      );
    }
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "跨体系工程事实回执对象不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "跨体系工程事实回执数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "跨体系工程事实回执数组长度无效。");
      }
      const allowed = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (keys.some((key) => !allowed.has(key))) fail("INPUT_ARRAY_INVALID", "跨体系工程事实回执数组含额外属性。");
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "跨体系工程事实回执不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "跨体系工程事实回执只接受普通 JSON 对象。");
    const entries = [];
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "跨体系工程事实回执不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    nodes: 0,
    textCharacters: 0,
    active: new WeakSet()
  }, 0);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visitor(node);
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) {
        for (let index = child.length - 1; index >= 0; index -= 1) stack.push(child[index]);
      } else if (child !== null && typeof child === "object") {
        stack.push(child);
      }
    }
  }
}

export function parseCrossSystemEngineeringFactReceiptJsonBytes(bytes, label = "跨体系工程事实回执 JSON") {
  if (!(bytes instanceof Uint8Array)) fail("JSON_INVALID", `${label} 必须是字节。`);
  if (bytes.length > MAX_REGISTRY_BYTES) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new CrossSystemEngineeringFactReceiptError("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "cross-system-engineering-fact-receipts.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    throw new CrossSystemEngineeringFactReceiptError("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof CrossSystemEngineeringFactReceiptError) throw cause;
    throw new CrossSystemEngineeringFactReceiptError("JSON_INVALID", `${label} 不是有效 JSON。`, { cause });
  }
}

function safeWorkspacePath(workspaceRoot, relativePath) {
  if (typeof relativePath !== "string"
    || !/^[^\\/:*?"<>|\u0000-\u001f][^\\:*?"<>|\u0000-\u001f]{0,399}$/u.test(relativePath)
    || relativePath.includes("..")
    || relativePath.includes("\\")
    || relativePath.startsWith("/")) {
    fail("PATH_INVALID", `跨体系工程事实回执路径无效：${String(relativePath)}`);
  }
  return path.resolve(workspaceRoot, ...relativePath.split("/"));
}

async function readWorkspaceSnapshot(workspaceRoot, relativePath, maximumBytes = MAX_BOUND_FILE_BYTES) {
  const rootRealPath = await realpath(path.resolve(workspaceRoot));
  const absolutePath = safeWorkspacePath(rootRealPath, relativePath);
  let artifactRealPath;
  let metadata;
  try {
    artifactRealPath = await realpath(absolutePath);
    metadata = await stat(artifactRealPath);
  } catch (cause) {
    throw new CrossSystemEngineeringFactReceiptError(
      "BOUND_FILE_MISSING",
      `跨体系工程事实回执依据文件缺失：${relativePath}`,
      { cause }
    );
  }
  const relativeToRoot = path.relative(rootRealPath, artifactRealPath);
  if (relativeToRoot === ""
    || relativeToRoot === ".."
    || relativeToRoot.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeToRoot)
    || !metadata.isFile()
    || metadata.size <= 0
    || metadata.size > maximumBytes) {
    fail("BOUND_FILE_INVALID", `跨体系工程事实回执依据文件越界、非普通文件、为空或超限：${relativePath}`);
  }
  const bytes = await readFile(artifactRealPath);
  if (bytes.length !== metadata.size) {
    fail("BOUND_FILE_CHANGED_DURING_READ", `跨体系工程事实回执依据文件读取期大小漂移：${relativePath}`);
  }
  return Object.freeze({
    path: relativePath,
    bytes,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

function requireComponents(manifest) {
  const components = BOUND_COMPONENT_IDS.map((componentId) => {
    const component = manifest.components.find((candidate) => candidate.componentId === componentId);
    if (!component || component.status !== "bound" || !SHA256_PATTERN.test(component.digest ?? "")) {
      fail("MANIFEST_COMPONENT_INVALID", `独立体系 manifest 缺少可绑定组件：${componentId}`);
    }
    return {
      componentId,
      version: component.version,
      digest: component.digest,
      files: component.files.map((file) => ({ path: file.path, sha256: file.sha256 }))
    };
  });
  return components;
}

async function manifestBinding(workspaceRoot, definition, verified) {
  const snapshot = await readWorkspaceSnapshot(workspaceRoot, definition.manifestPath, MAX_REGISTRY_BYTES);
  return {
    path: definition.manifestPath,
    bytes: snapshot.size,
    rawSha256: snapshot.sha256,
    manifestDigest: verified.manifestDigest,
    releaseStatus: verified.manifest.releaseStatus,
    targetSchema: verified.manifest.releaseGovernance.targetSchema,
    migrationId: verified.manifest.releaseGovernance.migrationId,
    currentVerifierPassed: true,
    boundComponents: requireComponents(verified.manifest)
  };
}

function makeReceipt(unsigned) {
  return {
    ...unsigned,
    receiptDigest: sha256Canonical(unsigned)
  };
}

async function buildZiweiReceipt(manifest, sourceRequirementLedger, projectorSnapshot) {
  const fixture = await calculateIztro258EngineeringFixture(ZIWEI_INPUT);
  if (fixture.evidence?.productionEligible !== false
    || fixture.evidence?.expertTruthClaimed !== false
    || fixture.receipt?.fallbackUsed !== false
    || fixture.receipt?.interpretationIncluded !== false
    || fixture.receipt?.digestVerification !== "recomputed_sha256_canonical_json_v1"
    || !SHA256_PATTERN.test(fixture.receipt?.inputSha256 ?? "")
    || !SHA256_PATTERN.test(fixture.receipt?.ruleSnapshotSha256 ?? "")
    || !SHA256_PATTERN.test(fixture.receipt?.factsSha256 ?? "")) {
    fail("ZIWEI_REPLAY_BOUNDARY_INVALID", "紫微重放没有保持工程候选、无 fallback、无解释与摘要边界。");
  }
  const projectedFacts = projectZiweiCrossSystemEngineeringFacts(fixture);
  const receiptId = "cross-system.engineering-replay/ziwei.synthetic-e1";
  if (projectedFacts.some((fact) => fact.sourceRef !== "engineering-replay:ziwei.synthetic-e1")) {
    fail("ZIWEI_PROJECTOR_SOURCE_REF_INVALID", "紫微 projector 工程回执引用漂移。");
  }
  return makeReceipt({
    receiptVersion: "cross-system-engineering-fact-replay/1.0.0",
    receiptClass: "offline_current_workspace_replay_observation",
    receiptId,
    systemId: "ziwei-doushu",
    status: "engineering_replay_verified_not_admitted",
    fixtureId: "ziwei.synthetic-e1",
    domainManifest: manifest,
    sourceRequirementLedger,
    input: {
      classification: "synthetic_non_person_fixture",
      containsPersonalData: false,
      canonicalValue: ZIWEI_INPUT,
      registryCanonicalSha256: sha256Canonical(ZIWEI_INPUT),
      producerInputSha256: fixture.receipt.inputSha256,
      rawByteArtifactAvailable: false,
      rawByteHashAndParseUseSameBuffer: false
    },
    producerOutput: {
      artifactKind: fixture.artifactKind,
      digestAlgorithm: fixture.receipt.digestAlgorithm,
      stableProjectionKind: "ziwei_natal_facts",
      stableProjectionSha256: fixture.receipt.factsSha256,
      ruleSnapshotSha256: fixture.receipt.ruleSnapshotSha256,
      adapterId: fixture.receipt.engine.adapterId,
      adapterVersion: fixture.receipt.engine.adapterVersion,
      upstreamName: fixture.receipt.engine.upstreamName,
      upstreamVersion: fixture.receipt.engine.upstreamVersion,
      upstreamCommit: fixture.receipt.engine.upstreamCommit,
      freshWorkerObserved: fixture.receipt.engine.isolation === "fresh_worker_per_calculation",
      replayCompleted: true,
      fallbackUsed: false,
      interpretationIncluded: false,
      successReceiptIssued: false
    },
    projector: {
      projectorId: "projectZiweiCrossSystemEngineeringFacts",
      projectorVersion: ZIWEI_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION,
      projectionSchema: "ordered-string-facts-with-engineering-receipt-ref/1.0.0",
      sourcePath: ZIWEI_PROJECTOR_RELATIVE_PATH,
      sourceSha256: projectorSnapshot.sha256,
      fieldOrder: [...ZIWEI_ENGINEERING_FACT_FIELDS]
    },
    projectedFacts,
    projectedFactsSha256: sha256Canonical(projectedFacts),
    ruleIdentity: {
      profileId: fixture.receipt.profileId,
      profileVersion: fixture.receipt.profileVersion,
      profileDigest: fixture.receipt.ruleSnapshotSha256
    },
    engineeringEvidenceRefs: [
      "engineering-replay:ziwei.synthetic-e1",
      `domain-manifest:${manifest.manifestDigest}`
    ],
    boundary: {
      productionEligible: false,
      expertTruthClaimed: false,
      successReceiptIssued: false,
      contentTruthEstablished: false,
      sourceTextTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      formalComparisonAuthorized: false,
      publicDeploymentAuthorized: false
    }
  });
}

async function buildWesternReceipt(manifest, sourceRequirementLedger, projectorSnapshot) {
  const envelope = await runWesternAstronomyUtcDiagnostic(WESTERN_INPUT);
  if (envelope.outcome !== "computed"
    || envelope.evidence?.productionEligible !== false
    || envelope.evidence?.expertTruthClaimed !== false
    || envelope.strictContractRelation?.chartFixtureAccepted !== false
    || envelope.strictContractRelation?.successReceiptIssued !== false
    || envelope.result?.projectionVersion !== WESTERN_ASTRONOMY_PROJECTION_VERSION
    || !SHA256_PATTERN.test(envelope.diagnosticDigests?.requestSha256 ?? "")
    || !SHA256_PATTERN.test(envelope.diagnosticDigests?.resultSha256 ?? "")) {
    fail("WESTERN_REPLAY_BOUNDARY_INVALID", "西洋天文重放没有保持 diagnostic-only、无成功回执与摘要边界。");
  }
  const projectedFacts = projectWesternCrossSystemEngineeringFacts(envelope);
  const receiptId = "cross-system.engineering-replay/western.synthetic-e1";
  if (projectedFacts.some((fact) => fact.sourceRef !== "engineering-replay:western.synthetic-e1")) {
    fail("WESTERN_PROJECTOR_SOURCE_REF_INVALID", "西洋 projector 工程回执引用漂移。");
  }
  const executionRules = manifest.boundComponents.find((component) => component.componentId === "execution_rules");
  return makeReceipt({
    receiptVersion: "cross-system-engineering-fact-replay/1.0.0",
    receiptClass: "offline_current_workspace_replay_observation",
    receiptId,
    systemId: "western-astrology",
    status: "engineering_replay_verified_not_admitted",
    fixtureId: "western.synthetic-e1",
    domainManifest: manifest,
    sourceRequirementLedger,
    input: {
      classification: "synthetic_non_person_fixture",
      containsPersonalData: false,
      canonicalValue: WESTERN_INPUT,
      registryCanonicalSha256: sha256Canonical(WESTERN_INPUT),
      producerInputSha256: envelope.diagnosticDigests.requestSha256,
      rawByteArtifactAvailable: false,
      rawByteHashAndParseUseSameBuffer: false
    },
    producerOutput: {
      artifactKind: envelope.artifactKind,
      digestAlgorithm: envelope.diagnosticDigests.algorithm,
      stableProjectionKind: "western_astronomy_utc_diagnostic_result",
      stableProjectionSha256: envelope.diagnosticDigests.resultSha256,
      ruleSnapshotSha256: null,
      adapterId: "hakimi.western.astronomy-engine.node-diagnostic",
      adapterVersion: WESTERN_ASTRONOMY_PROJECTION_VERSION,
      upstreamName: "astronomy-engine",
      upstreamVersion: ASTRONOMY_ENGINE_VERSION,
      upstreamCommit: null,
      freshWorkerObserved: envelope.execution?.worker?.isolation === "fresh_worker_per_request",
      replayCompleted: true,
      fallbackUsed: false,
      interpretationIncluded: false,
      successReceiptIssued: false
    },
    projector: {
      projectorId: "projectWesternCrossSystemEngineeringFacts",
      projectorVersion: WESTERN_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION,
      projectionSchema: "ordered-string-facts-with-engineering-receipt-ref/1.0.0",
      sourcePath: WESTERN_PROJECTOR_RELATIVE_PATH,
      sourceSha256: projectorSnapshot.sha256,
      fieldOrder: [...WESTERN_ENGINEERING_FACT_FIELDS]
    },
    projectedFacts,
    projectedFactsSha256: sha256Canonical(projectedFacts),
    ruleIdentity: {
      profileId: WESTERN_ASTRONOMY_PROJECTION_VERSION,
      profileVersion: ASTRONOMY_ENGINE_VERSION,
      profileDigest: executionRules.digest
    },
    engineeringEvidenceRefs: [
      "engineering-replay:western.synthetic-e1",
      `domain-manifest:${manifest.manifestDigest}`
    ],
    boundary: {
      productionEligible: false,
      expertTruthClaimed: false,
      successReceiptIssued: false,
      contentTruthEstablished: false,
      sourceTextTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      formalComparisonAuthorized: false,
      publicDeploymentAuthorized: false
    }
  });
}

async function requireCurrentRegistryFailure(workspaceRoot, registry) {
  try {
    await verifySystemAdmissionRegistry(workspaceRoot, registry);
  } catch (cause) {
    if (cause?.code === "MANIFEST_MISMATCH") return "MANIFEST_MISMATCH";
    throw new CrossSystemEngineeringFactReceiptError(
      "UNEXPECTED_SYSTEM_REGISTRY_FAILURE",
      `四体系 registry 当前失败原因不是预期八字 manifest 漂移：${String(cause?.code ?? "unknown")}`,
      { cause }
    );
  }
  fail("SYSTEM_REGISTRY_UNEXPECTEDLY_VERIFIED", "四体系 registry 已通过；工程事实回执注册表必须更新当前边界。");
}

function collectSavedArtifactLocks(value, locks = new Map()) {
  if (value === null || typeof value !== "object") return locks;
  if (!Array.isArray(value)
    && typeof value.path === "string"
    && Number.isSafeInteger(value.bytes)
    && value.bytes > 0
    && SHA256_PATTERN.test(value.sha256 ?? "")) {
    const identity = `${value.bytes}:${value.sha256}`;
    const previous = locks.get(value.path);
    if (previous && previous.identity !== identity) {
      fail("SYSTEM_REGISTRY_LOCK_CONFLICT", `四体系 registry 对同一路径保存了冲突身份：${value.path}`);
    }
    locks.set(value.path, {
      path: value.path,
      savedBytes: value.bytes,
      savedSha256: value.sha256,
      identity
    });
  }
  for (const child of Object.values(value)) collectSavedArtifactLocks(child, locks);
  return locks;
}

async function observeStaleSystemRegistryArtifactLocks(workspaceRoot, registry) {
  const savedLocks = [...collectSavedArtifactLocks(registry).values()]
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const observations = await Promise.all(savedLocks.map(async (lock) => {
    const current = await readWorkspaceSnapshot(workspaceRoot, lock.path);
    return {
      path: lock.path,
      savedBytes: lock.savedBytes,
      currentBytes: current.size,
      savedSha256: lock.savedSha256,
      currentSha256: current.sha256,
      matchesCurrent: lock.savedBytes === current.size && lock.savedSha256 === current.sha256
    };
  }));
  return observations.filter((entry) => !entry.matchesCurrent).map((entry) => ({
    path: entry.path,
    savedBytes: entry.savedBytes,
    currentBytes: entry.currentBytes,
    savedSha256: entry.savedSha256,
    currentSha256: entry.currentSha256
  }));
}

export async function buildCurrentCrossSystemEngineeringFactReceiptRegistry(workspaceRoot) {
  return buildReceiptRegistryForInputs(workspaceRoot, false);
}

async function buildReceiptRegistryForInputs(workspaceRoot, historicalV1) {
  const [
    ziweiProjectorSnapshot,
    westernProjectorSnapshot,
    comparisonSnapshot,
    systemRegistrySnapshot,
    vedicAdrSnapshot
  ] =
    await Promise.all([
      readWorkspaceSnapshot(workspaceRoot, ZIWEI_PROJECTOR_RELATIVE_PATH),
      readWorkspaceSnapshot(workspaceRoot, WESTERN_PROJECTOR_RELATIVE_PATH),
      readWorkspaceSnapshot(workspaceRoot, COMPARISON_CONTRACT_RELATIVE_PATH),
      readWorkspaceSnapshot(workspaceRoot, SYSTEM_ADMISSION_REGISTRY_RELATIVE_PATH, MAX_REGISTRY_BYTES),
      readWorkspaceSnapshot(workspaceRoot, VEDIC_BOUNDARY_ADR_RELATIVE_PATH)
    ]);

  const historical = historicalV1
    ? await verifyFactReceiptV1Inputs(workspaceRoot, readWorkspaceSnapshot, parseCrossSystemEngineeringFactReceiptJsonBytes)
    : null;
  const [verifiedManifests, verifiedSourceRequirements, d0Ledger, savedSystemRegistry] = await Promise.all([
    historical?.verifiedManifests ?? verifyAllIndependentDomainManifests(workspaceRoot),
    historical?.verifiedSourceRequirements ?? verifyAllIndependentSourceRequirements(workspaceRoot),
    historical?.verifiedD0.ledger ?? readBaziV17ManifestDriftDecisionLedger(workspaceRoot),
    readSystemAdmissionRegistry(workspaceRoot)
  ]);
  const verifiedD0 = historical?.verifiedD0 ?? await verifyBaziV17ManifestDriftDecisionLedger(workspaceRoot, d0Ledger);
  const { registryDigest: _savedRegistryDigest, ...unsignedSavedSystemRegistry } = savedSystemRegistry;
  if (computeSystemAdmissionRegistryDigest(unsignedSavedSystemRegistry) !== savedSystemRegistry.registryDigest) {
    fail("SYSTEM_REGISTRY_DIGEST_INVALID", "保存的四体系 registry 自身语义摘要无效。");
  }
  const systemRegistryFailureCode = await requireCurrentRegistryFailure(workspaceRoot, savedSystemRegistry);
  const staleSystemRegistryArtifactLocks = await observeStaleSystemRegistryArtifactLocks(
    workspaceRoot,
    savedSystemRegistry
  );
  const savedVedic = savedSystemRegistry.systems.find((system) => system.productSystemId === "vedic-astrology");
  if (savedVedic?.productStatus !== "research_only_not_integrated"
    || savedVedic.integrationBoundary?.surface !== "no_product_surface"
    || savedVedic.integrationBoundary?.targetSchema !== null
    || savedVedic.admissionGates?.deterministicFacts?.engineeringState !== "absent"
    || savedVedic.authorityBoundary?.formalAdmissionAuthorized !== false) {
    fail("VEDIC_REGISTERED_BOUNDARY_DRIFT", "吠陀保存登记边界不再是无产品、无事实生产者和无准入。");
  }

  const manifestsById = new Map(verifiedManifests.map((entry) => [entry.productSystemId, entry]));
  const requirementsById = new Map(
    verifiedSourceRequirements.map((entry) => [entry.productSystemId, entry])
  );
  const definitionsById = new Map((historical?.definitions ?? INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS)
    .map((entry) => [entry.productSystemId, entry]));
  const ziweiVerified = manifestsById.get("ziwei-doushu");
  const westernVerified = manifestsById.get("western-astrology");
  const ziweiRequirements = requirementsById.get("ziwei-doushu");
  const westernRequirements = requirementsById.get("western-astrology");
  if (!ziweiVerified || !westernVerified || !ziweiRequirements || !westernRequirements) {
    fail("INDEPENDENT_EVIDENCE_SET_INVALID", "独立体系 manifest 或来源 requirement 验证结果缺失。");
  }
  const ziweiManifest = await manifestBinding(
    workspaceRoot,
    definitionsById.get("ziwei-doushu"),
    ziweiVerified
  );
  const westernManifest = await manifestBinding(
    workspaceRoot,
    definitionsById.get("western-astrology"),
    westernVerified
  );

  const sourceRequirementBinding = (entry) => ({
    ledgerDigest: entry.ledgerDigest,
    bindingRequired: entry.bindingRequired,
    bindingFrozenVerified: entry.bindingFrozenVerified,
    sourceBundleComplete: entry.ledger.gateSummary.sourceBundleComplete,
    rightsBundleComplete: entry.ledger.gateSummary.rightsBundleComplete,
    expertReviewBundleComplete: entry.ledger.gateSummary.expertReviewBundleComplete
  });
  const [ziweiReceipt, westernReceipt] = await Promise.all([
    buildZiweiReceipt(
      ziweiManifest,
      sourceRequirementBinding(ziweiRequirements),
      ziweiProjectorSnapshot
    ),
    buildWesternReceipt(
      westernManifest,
      sourceRequirementBinding(westernRequirements),
      westernProjectorSnapshot
    )
  ]);
  const savedComparisonArtifact = savedSystemRegistry.crossSystemPolicy?.artifact;
  if (savedComparisonArtifact?.path !== COMPARISON_CONTRACT_RELATIVE_PATH
    || !SHA256_PATTERN.test(savedComparisonArtifact?.sha256 ?? "")) {
    fail("SAVED_COMPARISON_ARTIFACT_INVALID", "保存的四体系 registry 缺少跨体系契约字节身份。");
  }

  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "cross_system_engineering_fact_replay_registry",
    registryId: "hakimi.cross-system/engineering-fact-replay/1.0.0",
    registryStatus: "fail_closed_partial_two_of_four",
    createdAt: REGISTRY_CREATED_AT,
    releaseGovernance: RELEASE_GOVERNANCE,
    systems: [
      {
        systemId: "bazi",
        receiptStatus: "blocked_saved_manifest_not_current",
        receipt: null,
        blocker: {
          evidenceId: "bazi-v17-manifest-drift-decisions.v1",
          evidenceDigest: verifiedD0.ledger.ledgerDigest,
          savedManifestDigest: verifiedD0.ledger.savedManifest.semanticManifestDigest,
          currentExpectedManifestPreviewDigest:
            verifiedD0.ledger.currentExpectedManifestPreview.semanticManifestDigest,
          currentManifestVerifierPassed: false,
          failureCode: verifiedD0.ledger.savedManifest.currentVerifierFailureCode,
          ownerDecisionsRecorded: verifiedD0.ledger.gateSummary.driftEntriesWithOwnerDecision,
          mutationEpochCapability: "absent_schema13",
          mutationEpoch: null,
          freezeEligible: false
        }
      },
      {
        systemId: "ziwei-doushu",
        receiptStatus: "engineering_replay_verified_not_admitted",
        receipt: ziweiReceipt,
        blocker: null
      },
      {
        systemId: "western-astrology",
        receiptStatus: "engineering_replay_verified_not_admitted",
        receipt: westernReceipt,
        blocker: null
      },
      {
        systemId: "vedic-astrology",
        receiptStatus: "absent_no_registered_product_or_fact_producer",
        receipt: null,
        blocker: {
          registeredProductStatus: savedVedic.productStatus,
          registeredSurface: savedVedic.integrationBoundary.surface,
          registeredDeterministicFactsState:
            savedVedic.admissionGates.deterministicFacts.engineeringState,
          boundaryAdr: {
            path: VEDIC_BOUNDARY_ADR_RELATIVE_PATH,
            bytes: vedicAdrSnapshot.size,
            sha256: vedicAdrSnapshot.sha256
          },
          bindingRequired: null,
          mutationEpochCapability: "absent_no_product_schema",
          mutationEpoch: null,
          freezeEligible: false
        }
      }
    ],
    legacyComparisonDraft: {
      path: COMPARISON_CONTRACT_RELATIVE_PATH,
      schemaVersionObservedAtBuild: CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
      currentBytes: comparisonSnapshot.size,
      currentSha256: comparisonSnapshot.sha256,
      savedFourSystemRegistrySha256: savedComparisonArtifact.sha256,
      savedFourSystemRegistryArtifactMatchesCurrent:
        savedComparisonArtifact.sha256 === comparisonSnapshot.sha256,
      payloadOnlyFactsAcceptedAsEngineeringReplayEvidence: false,
      directReceiptRegistryBindingRequired: true,
      formalComparisonAuthorized: false
    },
    fourSystemRegistryObservation: {
      path: SYSTEM_ADMISSION_REGISTRY_RELATIVE_PATH,
      bytes: systemRegistrySnapshot.size,
      sha256: systemRegistrySnapshot.sha256,
      registryDigest: savedSystemRegistry.registryDigest,
      currentVerifierPassed: false,
      failureCode: systemRegistryFailureCode,
      staleArtifactLockCount: staleSystemRegistryArtifactLocks.length,
      staleArtifactLocks: staleSystemRegistryArtifactLocks
    },
    gateSummary: {
      systemsRequired: 4,
      systemsWithEngineeringReplayReceipt: 2,
      systemsWithCurrentDomainManifestClosure: 2,
      systemsFormallyAdmitted: 0,
      systemsWithContentTruth: 0,
      systemsWithExpertTruth: 0,
      systemsWithRightsLegalConclusion: 0,
      systemsReleaseReady: 0,
      formalCrossSystemComparisonAuthorized: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    observationBoundary: {
      registryHashAndParseUseSameReadBuffer: true,
      eachBoundFileHashUsesSingleReadBuffer: true,
      producerReplaysUseCurrentVerifiedManifestClosures: true,
      projectedFactsRecomputedByFixedProjector: true,
      projectorSources: [
        {
          systemId: "ziwei-doushu",
          path: ZIWEI_PROJECTOR_RELATIVE_PATH,
          sha256: ziweiProjectorSnapshot.sha256,
          version: ZIWEI_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION
        },
        {
          systemId: "western-astrology",
          path: WESTERN_PROJECTOR_RELATIVE_PATH,
          sha256: westernProjectorSnapshot.sha256,
          version: WESTERN_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION
        }
      ],
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      pairReplayAtomic: false,
      mutationEpochAvailableForLegacySchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    evidenceLedger: {
      engineeringIdentity: "two_independent_current_manifest_closures_replayed_and_reprojected",
      browserRuntimeEvidence: "not_established_by_offline_replay_registry",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: DOES_NOT_ESTABLISH
  };
  return deepFreezeJson({
    ...unsigned,
    registryDigest: sha256Canonical(unsigned)
  });
}

export async function readCrossSystemEngineeringFactReceiptRegistry(workspaceRoot) {
  const snapshot = await readWorkspaceSnapshot(
    workspaceRoot,
    CROSS_SYSTEM_ENGINEERING_FACT_RECEIPT_REGISTRY_RELATIVE_PATH,
    MAX_REGISTRY_BYTES
  );
  return Object.freeze({
    snapshot,
    registry: parseCrossSystemEngineeringFactReceiptJsonBytes(snapshot.bytes)
  });
}

export async function verifyCrossSystemEngineeringFactReceiptRegistry(workspaceRoot, registryInput) {
  return verifyReceiptRegistryForInputs(workspaceRoot, registryInput, false);
}

// Explicit historical entry only. It does not change current selection, mint a
// receipt, or treat labels such as "current" inside the original as current now.
export async function verifyHistoricalV1CrossSystemEngineeringFactReceiptRegistry(workspaceRoot, registryInput) {
  const result = await verifyReceiptRegistryForInputs(workspaceRoot, registryInput, true);
  return Object.freeze({ ...result, consumerContract: "historical-v1", currentProducerVerification: false,
    currentSelectionChanged: false, archivedModulesExecuted: false });
}

async function verifyReceiptRegistryForInputs(workspaceRoot, registryInput, historicalV1) {
  const registry = capturePassiveJsonSnapshot(registryInput);
  if (registry.registryDigest !== computeCrossSystemEngineeringFactReceiptRegistryDigest(registry)) {
    fail("REGISTRY_DIGEST_INVALID", "跨体系工程事实回执注册表摘要无效。");
  }
  for (const entry of registry.systems ?? []) {
    if (entry.receipt !== null
      && entry.receipt.receiptDigest !== computeCrossSystemEngineeringFactReceiptDigest(entry.receipt)) {
      fail("RECEIPT_DIGEST_INVALID", `跨体系工程事实回执摘要无效：${String(entry.systemId)}`);
    }
  }
  const expected = await buildReceiptRegistryForInputs(workspaceRoot, historicalV1);
  if (canonicalStringifyCrossSystemEngineeringFactReceipt(registry)
    !== canonicalStringifyCrossSystemEngineeringFactReceipt(expected)) {
    fail("REGISTRY_MISMATCH", "跨体系工程事实回执注册表与当前 manifest、producer 重放或 projector 投影不一致。");
  }
  return Object.freeze({
    registry: deepFreezeJson(registry),
    engineeringReplayReceiptsVerified: 2,
    formalCrossSystemComparisonAuthorized: false
  });
}
