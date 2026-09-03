import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { parseExpression } from "@babel/parser";
import {
  BAZI_DOMAIN_COMPONENT_SPECS,
  BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH,
  BAZI_V17_FROZEN_GOLDEN_SHA256,
  buildCurrentBaziDomainReleaseManifest,
  canonicalStringifyDomainManifest,
  computeDomainReleaseComponentDigest,
  computeDomainReleaseManifestDigest,
  verifyBaziDomainReleaseManifest
} from "./bazi-domain-release-manifest-lib.mjs";
import {
  BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
  computeExpertReviewPacketDigest,
  verifyBaziExpertReviewPacket
} from "./bazi-expert-review-packet-lib.mjs";

export const BAZI_V17_MANIFEST_DRIFT_DECISION_LEDGER_RELATIVE_PATH =
  "content/system-admission/bazi-v17-manifest-drift-decisions.v1.json";

const LEDGER_CREATED_AT = "2026-08-29T00:00:00.000Z";
const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BOUND_FILE_BYTES = 5_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const SAVED_MANIFEST_FILE_IDENTITY = Object.freeze({
  path: BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH,
  bytes: 12_777,
  sha256: "d63d80502c6186a66f2eabc4bd2749687978a8cfb22d420842aa4a9d6e0eccd6",
  semanticManifestDigest: "60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932"
});

const CURRENT_EXPECTED_MANIFEST_DIGEST =
  "be637b1e37ae92a9fd047af28d0117334405a39408dc470c766b7ddb8ab96954";

const SAVED_EXPERT_PACKET_IDENTITY = Object.freeze({
  path: BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
  bytes: 12_684,
  sha256: "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163",
  packetDigest: "cfe554b60b4698e0acd0a42e14484f4683eb7663d4f6862b767cf70404d2cd5f"
});

const EXPECTED_MANIFEST_DRIFTS = Object.freeze([
  Object.freeze({
    componentId: "fact_contract",
    path: "packages/bazi-core/src/index.ts",
    savedComponentDigest: "1520a68a0974376afb61be2dc4b4d37392037659967085ebf6ed67ad4f8a09f9",
    currentComponentDigest: "bcd1ad4af3eb9532ac91b1a7f07e2dfbd28f745187dc9c16aded473643305e91",
    savedSha256: "73e0be8dbb2f40132158ee5dba26e493e18b686f9c888552c3e596c713301b2f",
    currentSha256: "4c9b7fc5a16cbd3e3f5ca0bed90cd950b8ef3750f204427a332a6c1a1b4e7e7f",
    priorEvidenceState: "semantic_and_attribution_review_not_established",
    affectsExpertPacketArtifactLock: true
  }),
  Object.freeze({
    componentId: "source_bundle",
    path: "scripts/audit-bazi-source-binding-candidates-live.ps1",
    savedComponentDigest: "ebfceb4cf6f96ca88637ab6d06febc87489afd8ca4dfdb1f023a37ddaf7b948b",
    currentComponentDigest: "bb4100c3deaa383e0cde6e1b161ed75f22b5e655f4cf619cf2c252065ee03983",
    savedSha256: "36d6bd96467c345782d9c4d5862f0f9ef908c90feafc12490595b59e945fa6ae",
    currentSha256: "fe15feff99df887e5810fce508cec4158edd9b19278797ff1943dd9300f0dd3d",
    priorEvidenceState: "targeted_fix_documented_manifest_rebind_not_authorized",
    affectsExpertPacketArtifactLock: false
  }),
  Object.freeze({
    componentId: "source_bundle",
    path: "scripts/bazi-binding-freeze-requirements-lib.mjs",
    savedComponentDigest: "ebfceb4cf6f96ca88637ab6d06febc87489afd8ca4dfdb1f023a37ddaf7b948b",
    currentComponentDigest: "bb4100c3deaa383e0cde6e1b161ed75f22b5e655f4cf619cf2c252065ee03983",
    savedSha256: "5c1292f18dd2ebdfe09dc2173f974cb38a6cbe888a783cd61c5e68d8dba9b4d5",
    currentSha256: "9483ca0895f1f8a5033ca55e53fad8dc762b786953e52f4f26d34541f87f2bd6",
    priorEvidenceState: "targeted_phase_c_trust_chain_fix_documented_manifest_rebind_not_authorized",
    affectsExpertPacketArtifactLock: false
  }),
  Object.freeze({
    componentId: "rights_bundle",
    path: "apps/web/bundled-knowledge-audit.ts",
    savedComponentDigest: "495f6ab72764320847b852a847cd6a3db1cbcf33833cea723745f64406629546",
    currentComponentDigest: "6be6f442735551935eeb1abfec3042afaedb6696d2e08c511e56443b2f712fae",
    savedSha256: "8d38e0cbaebe477d5b66784b2814ea845c910962e29fdf9c52354b1fd3e9cd8e",
    currentSha256: "13eb497173611862276fce6c16a9ff207778fa70e3a3eadd60296ae09a0503cb",
    priorEvidenceState: "targeted_phase_c_materialization_preflight_fix_documented_manifest_rebind_not_authorized",
    affectsExpertPacketArtifactLock: false
  }),
  Object.freeze({
    componentId: "rights_bundle",
    path: "package.json",
    savedComponentDigest: "495f6ab72764320847b852a847cd6a3db1cbcf33833cea723745f64406629546",
    currentComponentDigest: "6be6f442735551935eeb1abfec3042afaedb6696d2e08c511e56443b2f712fae",
    savedSha256: "b8d8a31c3c4ae3669e196f0398288bf44284fdc1093ccbf6e510f8fcde0ca62c",
    currentSha256: "79ed3e10c5e8b9da4a128d98b9f6c48fbf716d9f4432cef442ee27c355d68dd0",
    priorEvidenceState: "semantic_and_attribution_review_not_established",
    affectsExpertPacketArtifactLock: false
  }),
  Object.freeze({
    componentId: "rights_bundle",
    path: "scripts/bazi-binding-freeze-requirements-lib.mjs",
    savedComponentDigest: "495f6ab72764320847b852a847cd6a3db1cbcf33833cea723745f64406629546",
    currentComponentDigest: "6be6f442735551935eeb1abfec3042afaedb6696d2e08c511e56443b2f712fae",
    savedSha256: "5c1292f18dd2ebdfe09dc2173f974cb38a6cbe888a783cd61c5e68d8dba9b4d5",
    currentSha256: "9483ca0895f1f8a5033ca55e53fad8dc762b786953e52f4f26d34541f87f2bd6",
    priorEvidenceState: "targeted_phase_c_trust_chain_fix_documented_manifest_rebind_not_authorized",
    affectsExpertPacketArtifactLock: false
  }),
  Object.freeze({
    componentId: "high_risk_policy",
    path: "scripts/bazi-expert-review-packet-lib.mjs",
    savedComponentDigest: "4d5b4e1f925c296b633d0002d3aabdfa43f87fe814d553a303d2ecb41134a3e4",
    currentComponentDigest: "666bffc377e59e220b4a7ca1930a7a519b046a89af7dbaaf186d2bec68b83c3c",
    savedSha256: "f8165c3b97e5a61bea333970c6f633a7b77418846458146442486b984af20812",
    currentSha256: "76046086e4d4b49cd7166b548f4b6999fb208db020ed9b06e1cdefa90c2cd669",
    priorEvidenceState: "targeted_phase_d_private_identity_dossier_workspace_root_fix_implemented_manifest_rebind_not_authorized",
    affectsExpertPacketArtifactLock: false
  })
]);

const EXPECTED_EXPERT_PACKET_DRIFT = Object.freeze({
  artifactId: "bazi-core-fact-engine",
  path: "packages/bazi-core/src/index.ts",
  evidenceLayer: "engineering_input_fact_contract",
  savedSha256: "73e0be8dbb2f40132158ee5dba26e493e18b686f9c888552c3e596c713301b2f",
  currentSha256: "4c9b7fc5a16cbd3e3f5ca0bed90cd950b8ef3750f204427a332a6c1a1b4e7e7f"
});

const RELEASE_GOVERNANCE = Object.freeze({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const DECISION_OPTIONS = Object.freeze([
  "accept_current_bytes_for_new_engineering_candidate_binding",
  "replace_or_restore_under_explicit_scope",
  "defer"
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "change_authorship_or_owner_attribution",
  "owner_acceptance_of_current_bytes",
  "domain_or_semantic_correctness",
  "content_truth",
  "expert_identity_credentials_independence_or_opinion",
  "expert_truth",
  "rights_or_legal_conclusion",
  "browser_or_runtime_validation",
  "cross_file_atomic_snapshot",
  "interval_mutation_or_aba_exclusion",
  "release_readiness",
  "release_candidate_freeze",
  "public_release_authorization"
]);

export class BaziV17ManifestDriftDecisionError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziV17ManifestDriftDecisionError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BaziV17ManifestDriftDecisionError(code, message);
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "D0 漂移账对象 API 超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "D0 漂移账对象 API 超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INPUT_VALUE_INVALID", "D0 漂移账对象 API 含非有限数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "D0 漂移账对象 API 超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "D0 漂移账对象 API 只接受 JSON 数据值。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "D0 漂移账对象 API 不接受循环引用。");
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
      throw new BaziV17ManifestDriftDecisionError(
        "INPUT_OBJECT_UNSAFE",
        "D0 漂移账对象 API 无法安全捕获对象描述符。",
        { cause }
      );
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "D0 漂移账对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "D0 漂移账对象 API 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "D0 漂移账对象 API 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "D0 漂移账对象 API 数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "D0 漂移账对象 API 不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "D0 漂移账对象 API 只接受普通 JSON 对象。");
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "D0 漂移账对象 API 不接受访问器或不可枚举字段。");
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
  fail("NON_CANONICAL_JSON", "D0 漂移账只接受有限规范 JSON 值。");
}

export function canonicalStringifyBaziV17ManifestDriftDecision(value) {
  return JSON.stringify(canonicalValue(value));
}

export function computeBaziV17ManifestDriftDecisionDigest(value) {
  const { ledgerDigest: _ledgerDigest, ...unsigned } = value;
  return createHash("sha256")
    .update(canonicalStringifyBaziV17ManifestDriftDecision(unsigned), "utf8")
    .digest("hex");
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visitor(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
      } else if (value !== null && typeof value === "object") {
        stack.push(value);
      }
    }
  }
}

export function parseBaziV17ManifestDriftDecisionJsonBytes(bytes, label = "D0 漂移账 JSON") {
  if (!(bytes instanceof Uint8Array)) fail("JSON_INVALID", `${label} 必须是字节。`);
  if (bytes.length > MAX_LEDGER_BYTES) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new BaziV17ManifestDriftDecisionError("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "bazi-v17-manifest-drift-decisions.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    throw new BaziV17ManifestDriftDecisionError("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
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
    if (cause instanceof BaziV17ManifestDriftDecisionError) throw cause;
    throw new BaziV17ManifestDriftDecisionError("JSON_INVALID", `${label} 不是有效 JSON。`, { cause });
  }
}

function safeWorkspacePath(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,299}$/u.test(relativePath)
    || relativePath.includes("..")
    || relativePath.includes("\\")
    || relativePath.startsWith("/")
  ) {
    fail("PATH_INVALID", `D0 漂移账路径无效：${String(relativePath)}`);
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
    throw new BaziV17ManifestDriftDecisionError(
      "BOUND_FILE_MISSING",
      `D0 漂移账依据文件缺失：${relativePath}`,
      { cause }
    );
  }
  const relativeToRoot = path.relative(rootRealPath, artifactRealPath);
  if (
    relativeToRoot === ""
    || relativeToRoot === ".."
    || relativeToRoot.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeToRoot)
    || !metadata.isFile()
    || metadata.size <= 0
    || metadata.size > maximumBytes
  ) {
    fail("BOUND_FILE_INVALID", `D0 漂移账依据文件越界、非普通文件、为空或超限：${relativePath}`);
  }
  const bytes = await readFile(artifactRealPath);
  if (bytes.length !== metadata.size) fail("BOUND_FILE_CHANGED_DURING_READ", `D0 漂移账依据文件读取期大小漂移：${relativePath}`);
  return Object.freeze({
    path: relativePath,
    bytes,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

function requireExactStaticManifestBoundary(savedManifest, currentManifest) {
  if (
    savedManifest.schemaVersion !== "1.0.0"
    || savedManifest.recordType !== "system_domain_release_manifest"
    || savedManifest.systemId !== "bazi"
    || savedManifest.surface?.surfaceId !== "single-chart-report"
    || savedManifest.surface?.surfaceVersion !== "1.7.0"
    || savedManifest.releaseGovernance?.releaseIdentity !== "legacy-v13"
    || savedManifest.releaseGovernance?.targetSchema !== 13
    || savedManifest.releaseGovernance?.migrationId !== null
    || savedManifest.releaseGovernance?.mutationEpochBoundary !== "preserved"
    || savedManifest.releaseGovernance?.publicDeploymentAuthorized !== false
    || savedManifest.releaseGovernance?.expertClaimsAuthorized !== false
    || savedManifest.releaseStatus !== "engineering_candidate"
  ) {
    fail("SAVED_MANIFEST_BOUNDARY_DRIFT", "存量八字 v1.7 manifest 的发布、Schema 或权威边界已变化。");
  }
  if (!SHA256_PATTERN.test(savedManifest.manifestDigest ?? "")
    || computeDomainReleaseManifestDigest(savedManifest) !== savedManifest.manifestDigest) {
    fail("SAVED_MANIFEST_DIGEST_INVALID", "存量八字 v1.7 manifest 自身摘要无效。");
  }
  if (!Array.isArray(savedManifest.components)
    || savedManifest.components.length !== BAZI_DOMAIN_COMPONENT_SPECS.length
    || currentManifest.components.length !== BAZI_DOMAIN_COMPONENT_SPECS.length) {
    fail("MANIFEST_COMPONENT_SET_DRIFT", "八字 v1.7 manifest 组件集合已变化。");
  }
  for (let index = 0; index < BAZI_DOMAIN_COMPONENT_SPECS.length; index += 1) {
    const spec = BAZI_DOMAIN_COMPONENT_SPECS[index];
    const saved = savedManifest.components[index];
    const current = currentManifest.components[index];
    const savedPaths = Array.isArray(saved?.files) ? saved.files.map((entry) => entry.path) : [];
    const currentPaths = Array.isArray(current?.files) ? current.files.map((entry) => entry.path) : [];
    if (
      saved?.componentId !== spec.componentId
      || current?.componentId !== spec.componentId
      || saved?.version !== spec.version
      || current?.version !== spec.version
      || saved?.status !== spec.status
      || current?.status !== spec.status
      || canonicalStringifyDomainManifest(savedPaths) !== canonicalStringifyDomainManifest(spec.files)
      || canonicalStringifyDomainManifest(currentPaths) !== canonicalStringifyDomainManifest(spec.files)
      || computeDomainReleaseComponentDigest(saved) !== saved.digest
      || computeDomainReleaseComponentDigest(current) !== current.digest
    ) {
      fail("MANIFEST_COMPONENT_STRUCTURE_DRIFT", `八字 v1.7 manifest 组件结构已变化：${spec.componentId}`);
    }
  }
}

function collectManifestDrifts(savedManifest, currentManifest) {
  const drifts = [];
  for (const savedComponent of savedManifest.components) {
    const currentComponent = currentManifest.components.find(
      (component) => component.componentId === savedComponent.componentId
    );
    for (const savedFile of savedComponent.files) {
      const currentFile = currentComponent.files.find((entry) => entry.path === savedFile.path);
      if (savedFile.sha256 !== currentFile.sha256) {
        drifts.push({
          componentId: savedComponent.componentId,
          path: savedFile.path,
          savedComponentDigest: savedComponent.digest,
          currentComponentDigest: currentComponent.digest,
          savedSha256: savedFile.sha256,
          currentSha256: currentFile.sha256
        });
      }
    }
    if (savedComponent.digest !== currentComponent.digest
      && !drifts.some((entry) => entry.componentId === savedComponent.componentId)) {
      fail("COMPONENT_DIGEST_UNEXPLAINED", `组件摘要漂移没有文件级解释：${savedComponent.componentId}`);
    }
  }
  return drifts;
}

function requireExactObservedManifestDrifts(observed) {
  const expectedProjection = EXPECTED_MANIFEST_DRIFTS.map((entry) => ({
    componentId: entry.componentId,
    path: entry.path,
    savedComponentDigest: entry.savedComponentDigest,
    currentComponentDigest: entry.currentComponentDigest,
    savedSha256: entry.savedSha256,
    currentSha256: entry.currentSha256
  }));
  if (canonicalStringifyBaziV17ManifestDriftDecision(observed)
    !== canonicalStringifyBaziV17ManifestDriftDecision(expectedProjection)) {
    fail("OBSERVED_MANIFEST_DRIFT_CHANGED", "八字 v1.7 manifest 当前漂移集合或字节身份已变化；不得沿用旧 D0 决策账。");
  }
}

async function requireManifestVerifierFailure(workspaceRoot, savedManifest) {
  try {
    await verifyBaziDomainReleaseManifest(workspaceRoot, savedManifest);
  } catch (cause) {
    if (cause?.code === "MANIFEST_MISMATCH") return "MANIFEST_MISMATCH";
    throw new BaziV17ManifestDriftDecisionError(
      "UNEXPECTED_MANIFEST_FAILURE",
      `八字 v1.7 manifest 当前失败原因不是预期漂移：${String(cause?.code ?? "unknown")}`,
      { cause }
    );
  }
  fail("MANIFEST_UNEXPECTEDLY_VERIFIED", "八字 v1.7 manifest 已通过；D0 漂移账必须退役而非继续声称失败。");
}

async function requireExpertPacketFailureAndCollectDrifts(workspaceRoot, packet) {
  let failureCode = null;
  try {
    await verifyBaziExpertReviewPacket(workspaceRoot, packet);
  } catch (cause) {
    if (cause?.code !== "ARTIFACT_DRIFT") {
      throw new BaziV17ManifestDriftDecisionError(
        "UNEXPECTED_EXPERT_PACKET_FAILURE",
        `专家候选包当前失败原因不是预期工件漂移：${String(cause?.code ?? "unknown")}`,
        { cause }
      );
    }
    failureCode = cause.code;
  }
  if (failureCode === null) fail("EXPERT_PACKET_UNEXPECTEDLY_VERIFIED", "专家候选包已通过；D0 漂移账必须更新。");

  const drifts = [];
  for (const lock of packet.artifactLocks ?? []) {
    const current = await readWorkspaceSnapshot(workspaceRoot, lock.path);
    if (current.sha256 !== lock.sha256) {
      drifts.push({
        artifactId: lock.artifactId,
        path: lock.path,
        evidenceLayer: lock.evidenceLayer,
        savedSha256: lock.sha256,
        currentSha256: current.sha256
      });
    }
  }
  if (canonicalStringifyBaziV17ManifestDriftDecision(drifts)
    !== canonicalStringifyBaziV17ManifestDriftDecision([EXPECTED_EXPERT_PACKET_DRIFT])) {
    fail("OBSERVED_EXPERT_PACKET_DRIFT_CHANGED", "专家候选包当前漂移集合或字节身份已变化；不得沿用旧 D0 决策账。");
  }
  return Object.freeze({ failureCode, drifts });
}

export async function buildCurrentBaziV17ManifestDriftDecisionLedger(workspaceRoot) {
  const manifestSnapshot = await readWorkspaceSnapshot(workspaceRoot, SAVED_MANIFEST_FILE_IDENTITY.path, MAX_LEDGER_BYTES);
  if (manifestSnapshot.size !== SAVED_MANIFEST_FILE_IDENTITY.bytes
    || manifestSnapshot.sha256 !== SAVED_MANIFEST_FILE_IDENTITY.sha256) {
    fail("SAVED_MANIFEST_FILE_DRIFT", "存量八字 v1.7 manifest 文件字节已变化；不得沿用旧 D0 决策账。");
  }
  const savedManifest = parseBaziV17ManifestDriftDecisionJsonBytes(manifestSnapshot.bytes, "存量八字 v1.7 manifest");
  if (savedManifest.manifestDigest !== SAVED_MANIFEST_FILE_IDENTITY.semanticManifestDigest) {
    fail("SAVED_MANIFEST_IDENTITY_DRIFT", "存量八字 v1.7 manifest 语义摘要已变化。");
  }
  const currentManifest = await buildCurrentBaziDomainReleaseManifest(workspaceRoot, {
    createdAt: savedManifest.createdAt
  });
  requireExactStaticManifestBoundary(savedManifest, currentManifest);
  if (currentManifest.manifestDigest !== CURRENT_EXPECTED_MANIFEST_DIGEST) {
    fail("CURRENT_EXPECTED_MANIFEST_CHANGED", "当前只读 expected-manifest preview 摘要已变化；不得沿用旧 D0 决策账。");
  }
  const manifestDrifts = collectManifestDrifts(savedManifest, currentManifest);
  requireExactObservedManifestDrifts(manifestDrifts);
  const manifestFailureCode = await requireManifestVerifierFailure(workspaceRoot, savedManifest);

  const expertSnapshot = await readWorkspaceSnapshot(workspaceRoot, SAVED_EXPERT_PACKET_IDENTITY.path, MAX_LEDGER_BYTES);
  if (expertSnapshot.size !== SAVED_EXPERT_PACKET_IDENTITY.bytes
    || expertSnapshot.sha256 !== SAVED_EXPERT_PACKET_IDENTITY.sha256) {
    fail("SAVED_EXPERT_PACKET_FILE_DRIFT", "存量专家候选包文件字节已变化；不得沿用旧 D0 决策账。");
  }
  const expertPacket = parseBaziV17ManifestDriftDecisionJsonBytes(expertSnapshot.bytes, "存量专家候选包");
  if (expertPacket.packetDigest !== SAVED_EXPERT_PACKET_IDENTITY.packetDigest
    || computeExpertReviewPacketDigest(expertPacket) !== expertPacket.packetDigest) {
    fail("SAVED_EXPERT_PACKET_IDENTITY_DRIFT", "存量专家候选包摘要已变化或无效。");
  }
  const expert = await requireExpertPacketFailureAndCollectDrifts(workspaceRoot, expertPacket);

  const driftDecisions = EXPECTED_MANIFEST_DRIFTS.map((entry) => ({
    componentId: entry.componentId,
    path: entry.path,
    savedComponentDigest: entry.savedComponentDigest,
    currentComponentDigest: entry.currentComponentDigest,
    savedSha256: entry.savedSha256,
    currentSha256: entry.currentSha256,
    priorEvidenceState: entry.priorEvidenceState,
    changeAuthorshipVerified: false,
    ownerAttributionVerified: false,
    semanticAcceptanceForManifestRebind: false,
    ownerDecision: null,
    currentBytesAcceptedForCandidateRebind: false,
    affectsExpertPacketArtifactLock: entry.affectsExpertPacketArtifactLock
  }));

  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_v17_manifest_drift_decision_ledger",
    ledgerId: "hakimi.bazi.v17.manifest-drift-decisions/1.0.0",
    status: "fail_closed_owner_decisions_pending",
    createdAt: LEDGER_CREATED_AT,
    releaseGovernance: RELEASE_GOVERNANCE,
    observationBoundary: {
      savedManifestHashAndParseUseSameReadBuffer: true,
      savedExpertPacketHashAndParseUseSameReadBuffer: true,
      currentManifestPreviewBuiltByCurrentManifestBuilder: true,
      nestedVerifierReadsReuseDirectBuffers: false,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    decisionPolicy: {
      authority: "explicit_repository_owner_confirmation_required",
      allowedOwnerDecisions: DECISION_OPTIONS,
      automaticDecisionAllowed: false,
      generatedModelDecisionAllowed: false,
      majorityVoteAllowed: false,
      manifestRewriteAllowedByThisLedger: false,
      expertPacketRewriteAllowedByThisLedger: false,
      releaseCandidateFreezeAllowedByThisLedger: false
    },
    savedManifest: {
      ...SAVED_MANIFEST_FILE_IDENTITY,
      createdAt: savedManifest.createdAt,
      releaseStatus: savedManifest.releaseStatus,
      selfDigestValid: true,
      currentVerifierStatus: "fail_closed_manifest_mismatch",
      currentVerifierFailureCode: manifestFailureCode
    },
    currentExpectedManifestPreview: {
      authoritative: false,
      persistedAsDomainManifest: false,
      createdAtReusedFromSavedManifest: true,
      semanticManifestDigest: currentManifest.manifestDigest,
      componentsObserved: currentManifest.components.length,
      unchangedComponentsObserved: currentManifest.components.length - new Set(manifestDrifts.map((entry) => entry.componentId)).size,
      changedComponentsObserved: new Set(manifestDrifts.map((entry) => entry.componentId)).size,
      changedFilesObserved: manifestDrifts.length,
      frozenGoldenSha256: BAZI_V17_FROZEN_GOLDEN_SHA256,
      frozenGoldenMatchesCurrentBytes: true
    },
    driftDecisions,
    expertPacketImpact: {
      ...SAVED_EXPERT_PACKET_IDENTITY,
      selfDigestValid: true,
      staticCandidateBoundaryVerifiedBeforeDrift: true,
      currentVerifierStatus: "fail_closed_artifact_drift",
      currentVerifierFailureCode: expert.failureCode,
      artifactDrifts: expert.drifts,
      domainExpertsRequired: 2,
      reviewerSlotsOccupied: 0,
      identitiesVerified: 0,
      credentialsVerified: 0,
      scopesVerified: 0,
      independentExpertReviewsVerified: 0,
      sealedOriginalOpinions: 0,
      expertReviewBundleComplete: false,
      packetResignAuthorized: false
    },
    downstreamImpact: {
      domainManifestCurrentArtifactClosure: false,
      expertPacketCurrentArtifactClosure: false,
      fourSystemRegistryCurrentRebuildPreconditionSatisfied: false,
      sourceBindingsFrozen: 0,
      sourceBindingsRequired: 12,
      independentExpertReviewsVerified: 0,
      releaseCandidateFreezeAllowed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    gateSummary: {
      manifestComponentsObserved: currentManifest.components.length,
      manifestComponentsDrifted: new Set(manifestDrifts.map((entry) => entry.componentId)).size,
      manifestFilesDrifted: manifestDrifts.length,
      driftEntriesWithOwnerDecision: 0,
      driftEntriesAcceptedForCandidateRebind: 0,
      expertPacketArtifactDrifts: expert.drifts.length,
      reviewerSlotsOccupied: 0,
      independentExpertReviewsVerified: 0,
      manifestRebindAuthorized: false,
      expertPacketRebindAuthorized: false,
      releaseCandidateFreezeAllowed: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: DOES_NOT_ESTABLISH
  };
  return Object.freeze({
    ...unsigned,
    ledgerDigest: computeBaziV17ManifestDriftDecisionDigest(unsigned)
  });
}

export async function readBaziV17ManifestDriftDecisionLedger(workspaceRoot) {
  const snapshot = await readWorkspaceSnapshot(
    workspaceRoot,
    BAZI_V17_MANIFEST_DRIFT_DECISION_LEDGER_RELATIVE_PATH,
    MAX_LEDGER_BYTES
  );
  return parseBaziV17ManifestDriftDecisionJsonBytes(snapshot.bytes);
}

export async function verifyBaziV17ManifestDriftDecisionLedger(workspaceRoot, ledgerInput) {
  if (!ledgerInput || typeof ledgerInput !== "object" || Array.isArray(ledgerInput)) {
    fail("LEDGER_INVALID", "D0 漂移账必须是 JSON 对象。");
  }
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  if (!SHA256_PATTERN.test(ledger.ledgerDigest ?? "")
    || computeBaziV17ManifestDriftDecisionDigest(ledger) !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "D0 漂移账摘要不匹配。");
  }
  const expected = await buildCurrentBaziV17ManifestDriftDecisionLedger(workspaceRoot);
  if (canonicalStringifyBaziV17ManifestDriftDecision(ledger)
    !== canonicalStringifyBaziV17ManifestDriftDecision(expected)) {
    fail("LEDGER_MISMATCH", "D0 漂移账与当前 saved/current manifest、专家包或失败关闭决策边界不一致。");
  }
  const frozenLedger = deepFreezeJson(ledger);
  return Object.freeze({
    ledger: frozenLedger,
    ledgerDigest: frozenLedger.ledgerDigest,
    manifestFilesDrifted: frozenLedger.gateSummary.manifestFilesDrifted,
    ownerDecisionsRecorded: frozenLedger.gateSummary.driftEntriesWithOwnerDecision,
    independentExpertReviewsVerified: frozenLedger.gateSummary.independentExpertReviewsVerified,
    releaseCandidateFreezeAllowed: frozenLedger.gateSummary.releaseCandidateFreezeAllowed
  });
}
