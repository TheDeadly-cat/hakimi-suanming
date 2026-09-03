import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
  loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate,
  isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate
} from "./bazi-single-chart-report-component-identity-drift-receipt-candidate-lib.mjs";
import {
  BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_RELATIVE_PATH,
  loadBaziExpertCurrentLineZeroInstanceObservationChild,
  isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild
} from "./bazi-expert-current-line-zero-instance-observation-child-lib.mjs";
import {
  computeBaziDomainReleaseManifestV22Digest
} from "./bazi-domain-release-manifest-v2-2-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const CRYPTO_CREATE_HASH = createHash;
const IS_PROXY = utilTypes.isProxy;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_JOIN = Array.prototype.join;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_STRINGIFY = JSON.stringify;
const JSON_PARSE = JSON.parse;
const NUMBER_IS_FINITE = Number.isFinite;
const NATIVE_STRING = String;
const STRING_REPEAT = String.prototype.repeat;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_MAP = Map;
const MAP_GET = Map.prototype.get;
const MAP_HAS = Map.prototype.has;
const MAP_SET = Map.prototype.set;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const PROCESS_CWD = process.cwd;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const SHA256 = /^[a-f0-9]{64}$/u;
const ZERO_SHA256 = "0000000000000000000000000000000000000000000000000000000000000000";
const VALUE_LIMITS = OBJECT_FREEZE({ maxDepth: 128, maxTextCharacters: 10_000_000, maxValueNodes: 1_000_000 });

export const BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_RELATIVE_PATH =
  "content/system-admission/bazi-current-machine-identity-successor.v1.0.0.json";

const SUCCESSOR_ID = "hakimi.bazi.current-machine-identity-successor/1.0.0";
const RECORD_TYPE = "bazi_current_machine_identity_successor_v1";
const CREATED_AT = "2026-09-01T08:10:46.766Z";
const RECEIPT_DIGEST_DOMAIN = "hakimi.bazi.current-machine-identity-successor.receipt/1.0.0";
const MACHINE_IDENTITY_DIGEST_DOMAIN = "hakimi.bazi.current-machine-identity/1.0.0";
const FORMAL_V22 = OBJECT_FREEZE({
  path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json",
  rawBytes: 23_399,
  rawSha256: "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d",
  manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.2.0",
  manifestDigest: "a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e"
});
const REPORT_RECEIPT = OBJECT_FREEZE({
  path: BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
  rawBytes: 5_419,
  rawSha256: "c797aa7851d6f2ff64518abae42d25143307936bc63263e37f5000383511a9cf",
  candidateId: "hakimi.bazi.single-chart-report.component-identity-drift-receipt-candidate/1.0.0",
  receiptDigest: "95e5a1b99d0a021a0fabf6c42e1cc8de432b9565459a091e577d57abbcea5fc8"
});
const EXPERT_CHILD = OBJECT_FREEZE({
  path: BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_RELATIVE_PATH,
  rawBytes: 9_122,
  rawSha256: "c21d07363701fa15ad57ccabf333f2dfcb5200b816c3772fbc3ae830c5c5e3ce",
  childId: "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.0.0",
  childDigest: "f7e7a4a6b3580e451e06de8af29cf8c3b834b05234f9f97ec343a5b8ab1641db"
});
const REPORT_COMPONENT = OBJECT_FREEZE({
  componentId: "report_contract",
  persistedDigest: "621cb0422729a3e5e12434f5c1c9ff5bf0f06e2d7bd2493deb5b5387f4957268",
  currentDigest: "6dd730cabb3035567694599692439a1b27f48e89ea0ee0970bbb33f5f7ee95f2"
});
const REPORT_SOURCE = OBJECT_FREEZE({
  path: "packages/research-export/src/single-chart-report.ts",
  persistedRawBytes: 161_365,
  persistedSha256: "215a470e79ea6eb844b41a5aad18867279d1a7ae60fd2b9cf6a364cc2c1b5082",
  currentRawBytes: 164_210,
  currentSha256: "43da8ce98eb0b09c061e6997dd140ffd3ad3dd597cb30720413fd67cf724d2dc"
});
const FROZEN_GOLDEN = OBJECT_FREEZE({
  path: "packages/research-export/src/golden/single-chart-report.contract.v1.7.json",
  rawBytes: 60_900,
  sha256: "aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29"
});
const EXPECTED_CURRENT_MACHINE_IDENTITY_DIGEST =
  "58c82e1bbe601638130c0fefe6341d680e7d018f0a72ea44ca5704d83792ee78";
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 30_801,
  rawSha256: "9360655d17b23ea8c7c68e44af3177f8ccc72b350046d4f7dca5f8a8c83b717d",
  receiptDigest: "f7ae6009bea62156a82de86ee0be3c353b022035194881001a913066ed8c4b05"
});
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziCurrentMachineIdentitySuccessorError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "BaziCurrentMachineIdentitySuccessorError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new BaziCurrentMachineIdentitySuccessorError(code, message, options);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET(), budget = { valueNodes: 0 }, depth = 0) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(IS_PROXY, utilTypes, [value])) fail("NON_PASSIVE_OBJECT", "successor 不接受 Proxy。");
  if (depth > VALUE_LIMITS.maxDepth) fail("VALUE_LIMIT_EXCEEDED", "successor 超过最大深度。");
  budget.valueNodes += 1;
  if (budget.valueNodes > VALUE_LIMITS.maxValueNodes) fail("VALUE_LIMIT_EXCEEDED", "successor 超过最大节点数。");
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_PASSIVE_OBJECT", "successor 只接受无 accessor 的被动 JSON 值。");
    }
    deepFreeze(descriptor.value, seen, budget, depth + 1);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function assertDeepFrozen(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  if (!REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) fail("PARENT_NOT_DEEP_FROZEN", "current parent 品牌结果未实际深冻结。");
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const budget = { textCharacters: 0, valueNodes: 0 };
  function visit(current, depth = 0) {
    if (depth > VALUE_LIMITS.maxDepth) fail("VALUE_LIMIT_EXCEEDED", "successor 超过最大深度。");
    budget.valueNodes += 1;
    if (budget.valueNodes > VALUE_LIMITS.maxValueNodes) fail("VALUE_LIMIT_EXCEEDED", "successor 超过最大节点数。");
    if (current === null) return "null";
    if (typeof current === "string") {
      const text = REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
      budget.textCharacters += text.length;
      if (budget.textCharacters > VALUE_LIMITS.maxTextCharacters) fail("VALUE_LIMIT_EXCEEDED", "successor 文本过长。");
      return text;
    }
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current]) || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_CANONICAL_JSON", "successor 数字必须为有限非负零 JSON 数字。");
      }
      return REFLECT_APPLY(NATIVE_STRING, null, [current]);
    }
    if (typeof current !== "object" || REFLECT_APPLY(IS_PROXY, utilTypes, [current])) {
      fail("NON_CANONICAL_JSON", "successor 只接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) fail("NON_CANONICAL_JSON", "successor 不接受循环或别名对象。");
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [current]);
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    const parts = [];
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (prototype !== ARRAY_PROTOTYPE || ownKeys.length !== current.length + 1) {
        fail("NON_CANONICAL_JSON", "successor 数组原型或键集合不合法。");
      }
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = descriptors[index];
        if (!descriptor || !descriptor.enumerable || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
          fail("NON_CANONICAL_JSON", "successor 不接受稀疏或 accessor 数组。");
        }
        REFLECT_APPLY(ARRAY_PUSH, parts, [visit(descriptor.value, depth + 1)]);
      }
      return `[${REFLECT_APPLY(ARRAY_JOIN, parts, [","])}]`;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("NON_CANONICAL_JSON", "successor 对象原型不合法。");
    const keys = [];
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (typeof key !== "string" || key === "__proto__" || key === "constructor" || key === "prototype") {
        fail("NON_CANONICAL_JSON", "successor 对象键不合法。");
      }
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
        fail("NON_CANONICAL_JSON", "successor 不接受 accessor 或隐藏字段。");
      }
      REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
    }
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      REFLECT_APPLY(ARRAY_PUSH, parts, [
        `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${visit(descriptors[key].value, depth + 1)}`
      ]);
    }
    return `{${REFLECT_APPLY(ARRAY_JOIN, parts, [","])}}`;
  }
  return visit(value);
}

function canonicalValue(value) {
  const text = canonicalStringify(value);
  return REFLECT_APPLY(JSON_PARSE, JSON, [text]);
}

function sha256Bytes(bytes) {
  const hash = REFLECT_APPLY(CRYPTO_CREATE_HASH, null, ["sha256"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Text(text) {
  const hash = REFLECT_APPLY(CRYPTO_CREATE_HASH, null, ["sha256"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function rawPin(pin) {
  return { path: pin.path, rawBytes: pin.rawBytes, rawSha256: pin.rawSha256 };
}

function assertSnapshot(snapshot, expected, code) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail(code, "固定 artifact raw identity 漂移。");
  }
}

function decodeSnapshot(snapshot) {
  try {
    return REFLECT_APPLY(TEXT_DECODER_DECODE, UTF8_DECODER, [snapshot.bytes]);
  } catch (cause) {
    fail("INVALID_UTF8", "持久化 artifact 不是严格 UTF-8。", { cause });
  }
}

function componentDigest(component) {
  return sha256Text(canonicalStringify({
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files: component.files
  }));
}

function unsignedReceipt(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.receiptDigest;
  return unsigned;
}

export function computeBaziCurrentMachineIdentitySuccessorDigest(value) {
  return sha256Text(`${RECEIPT_DIGEST_DOMAIN}\0${canonicalStringify(unsignedReceipt(value))}`);
}

export function serializeBaziCurrentMachineIdentitySuccessor(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [canonicalValue(value), null, 2])}\n`;
}

function assertFormalV22(snapshot, manifest) {
  assertSnapshot(snapshot, FORMAL_V22, "FORMAL_V22_RAW_DRIFT");
  if (manifest?.manifestId !== FORMAL_V22.manifestId
    || manifest?.manifestDigest !== FORMAL_V22.manifestDigest
    || computeBaziDomainReleaseManifestV22Digest(manifest) !== FORMAL_V22.manifestDigest
    || manifest?.schemaVersion !== "2.2.0"
    || manifest?.recordType !== "system_domain_release_manifest"
    || manifest?.releaseGovernance?.releaseIdentity !== "legacy-v13"
    || manifest?.releaseGovernance?.targetSchema !== 13
    || manifest?.releaseGovernance?.migrationId !== null
    || manifest?.releaseGovernance?.publicDeploymentAuthorized !== false
    || manifest?.releaseGovernance?.expertClaimsAuthorized !== false
    || manifest?.gateState?.bindingRequired !== 12
    || manifest?.gateState?.bindingFrozenVerified !== 0
    || manifest?.gateState?.independentExpertsRequired !== 2
    || manifest?.gateState?.independentExpertReviewsVerified !== 0
    || manifest?.authorityBoundary?.releaseReady !== false
    || manifest?.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [manifest?.components])
    || manifest.components.length !== 10) {
    fail("FORMAL_V22_SELF_OR_RED_SEMANTIC_DRIFT", "正式 v2.2 历史 raw/self 或红门语义漂移。");
  }
}

function assertReportReceipt(receipt) {
  if (!isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(receipt)) {
    fail("REPORT_RECEIPT_BRAND_REQUIRED", "必须消费 report drift exact full-loader 私有品牌。");
  }
  const entry = receipt?.scope?.reportComponent?.driftEntries?.[0];
  if (receipt.candidateId !== REPORT_RECEIPT.candidateId
    || receipt.receiptDigest !== REPORT_RECEIPT.receiptDigest
    || receipt?.scope?.formalManifest?.manifestId !== FORMAL_V22.manifestId
    || receipt?.scope?.formalManifest?.manifestDigest !== FORMAL_V22.manifestDigest
    || receipt?.scope?.reportComponent?.componentId !== REPORT_COMPONENT.componentId
    || receipt?.scope?.reportComponent?.persistedDigest !== REPORT_COMPONENT.persistedDigest
    || receipt?.scope?.reportComponent?.currentObservedDigest !== REPORT_COMPONENT.currentDigest
    || receipt?.scope?.reportComponent?.driftEntries?.length !== 1
    || entry?.path !== REPORT_SOURCE.path
    || entry?.persistedRawBytes !== REPORT_SOURCE.persistedRawBytes
    || entry?.persistedSha256 !== REPORT_SOURCE.persistedSha256
    || entry?.currentRawBytes !== REPORT_SOURCE.currentRawBytes
    || entry?.currentSha256 !== REPORT_SOURCE.currentSha256
    || receipt?.scope?.frozenGolden?.path !== FROZEN_GOLDEN.path
    || receipt?.scope?.frozenGolden?.currentRawBytes !== FROZEN_GOLDEN.rawBytes
    || receipt?.scope?.frozenGolden?.currentSha256 !== FROZEN_GOLDEN.sha256
    || receipt?.scope?.frozenGolden?.unchanged !== true
    || receipt?.gateSummary?.bindingRequired !== 12
    || receipt?.gateSummary?.bindingFrozenVerified !== 0
    || receipt?.gateSummary?.independentExpertsRequired !== 2
    || receipt?.gateSummary?.independentExpertReviewsVerified !== 0
    || receipt?.observationBoundary?.currentFullComponentSetObserved !== false
    || receipt?.observationBoundary?.persistedAsDomainManifest !== false
    || receipt?.ownerDecisionBoundary?.manifestRebindAuthorized !== false
    || receipt?.ownerDecisionBoundary?.manifestResignAuthorized !== false
    || receipt?.authorityBoundary?.releaseReady !== false
    || receipt?.authorityBoundary?.publicDeploymentAuthorized !== false) {
    fail("REPORT_RECEIPT_SEMANTIC_DRIFT", "report drift 私有品牌红门或身份投影漂移。");
  }
}

function assertExpertChild(child) {
  if (!isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(child)) {
    fail("EXPERT_CHILD_BRAND_REQUIRED", "必须消费 expert child exact full-loader 私有品牌。");
  }
  if (child?.childId !== EXPERT_CHILD.childId || child?.childDigest !== EXPERT_CHILD.childDigest
    || child?.currentMechanicalGate?.bindingRequired !== 12
    || child?.currentMechanicalGate?.bindingFrozenVerified !== 0
    || child?.currentMechanicalGate?.domainExpertsRequired !== 2
    || child?.currentMechanicalGate?.domainExpertReviewsVerified !== 0
    || child?.currentMechanicalGate?.realReviewerInstancesVerified !== 0
    || child?.currentMechanicalGate?.countsTowardExpertGate !== false
    || child?.manifestBoundary?.currentFullDomainManifestEstablished !== false
    || child?.manifestBoundary?.manifestRebindOrResignAuthorized !== false
    || child?.authorityBoundary?.expertTruthEstablished !== false
    || child?.authorityBoundary?.releaseReady !== false
    || child?.authorityBoundary?.publicDeploymentAuthorized !== false
    || child?.authorityBoundary?.expertClaimsAuthorized !== false
    || child?.materialAccessBoundary?.absenceOfPrivateMaterialInRealityClaimed !== false
    || child?.materialAccessBoundary?.realWorldPrivateMaterialExistenceAssessed !== false
    || child?.observationBoundary?.crossFileAtomicSnapshot !== false
    || child?.observationBoundary?.mutationEpochReceipt !== null
    || child?.observationBoundary?.abaExcluded !== false) {
    fail("EXPERT_CHILD_SEMANTIC_DRIFT", "expert child 身份、零实例或红门语义漂移。");
  }
}

async function loadCurrentParents(workspaceRoot) {
  const reportReceipt = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  const expertChild = await loadBaziExpertCurrentLineZeroInstanceObservationChild(workspaceRoot);
  // A historical parent used a live Object.isFrozen check. Re-freezing through
  // captured intrinsics preserves fail-closed behavior under post-import poison.
  deepFreeze(reportReceipt);
  deepFreeze(expertChild);
  assertDeepFrozen(reportReceipt);
  assertDeepFrozen(expertChild);
  assertReportReceipt(reportReceipt);
  assertExpertChild(expertChild);
  const reportSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, REPORT_RECEIPT.path);
  const expertSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, EXPERT_CHILD.path);
  assertSnapshot(reportSnapshot, REPORT_RECEIPT, "REPORT_RECEIPT_RAW_DRIFT");
  assertSnapshot(expertSnapshot, EXPERT_CHILD, "EXPERT_CHILD_RAW_DRIFT");
  const reportPersisted = parseBaziDttStrictJsonArtifact(reportSnapshot);
  const expertPersisted = parseBaziDttStrictJsonArtifact(expertSnapshot);
  if (!exactJson(reportPersisted, reportReceipt) || !exactJson(expertPersisted, expertChild)) {
    fail("PARENT_BRAND_RAW_MISMATCH", "current parent 私有品牌不等于固定 raw artifact。");
  }
  return { reportReceipt, expertChild };
}

function cloneComponentWithCurrentIdentity(component, currentByPath) {
  const files = [];
  for (let index = 0; index < component.files.length; index += 1) {
    const file = component.files[index];
    const current = REFLECT_APPLY(MAP_GET, currentByPath, [file.path]);
    if (!current) fail("CURRENT_FILE_MISSING", "当前 component 文件投影缺失。");
    REFLECT_APPLY(ARRAY_PUSH, files, [{ path: file.path, rawBytes: current.rawBytes, sha256: current.rawSha256 }]);
  }
  const projected = {
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files
  };
  projected.digest = componentDigest(projected);
  return projected;
}

async function observeCurrentComponents(workspaceRoot, manifest) {
  const ordered = [];
  const currentByPath = new NATIVE_MAP();
  const membershipByPath = new NATIVE_MAP();
  const baselineByPath = new NATIVE_MAP();
  for (let componentIndex = 0; componentIndex < manifest.components.length; componentIndex += 1) {
    const component = manifest.components[componentIndex];
    if (typeof component?.componentId !== "string" || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [component.files])
      || component.digest !== componentDigest(component)) {
      fail("FORMAL_COMPONENT_INVALID", "正式 v2.2 component 摘要或结构无效。");
    }
    for (let fileIndex = 0; fileIndex < component.files.length; fileIndex += 1) {
      const file = fileIndex in component.files ? component.files[fileIndex] : null;
      if (!file || typeof file.path !== "string" || typeof file.rawBytes !== "number" || !SHA256.test(file.sha256)) {
        fail("FORMAL_COMPONENT_FILE_INVALID", "正式 v2.2 component 文件项无效。");
      }
      if (!REFLECT_APPLY(MAP_HAS, baselineByPath, [file.path])) {
        REFLECT_APPLY(MAP_SET, baselineByPath, [file.path, file]);
        REFLECT_APPLY(MAP_SET, membershipByPath, [file.path, []]);
        REFLECT_APPLY(ARRAY_PUSH, ordered, [file.path]);
      } else if (!exactJson(REFLECT_APPLY(MAP_GET, baselineByPath, [file.path]), file)) {
        fail("FORMAL_DUPLICATE_FILE_IDENTITY_CONFLICT", "同一路径在正式组件中存在不同身份。");
      }
      REFLECT_APPLY(ARRAY_PUSH, REFLECT_APPLY(MAP_GET, membershipByPath, [file.path]), [component.componentId]);
    }
  }
  if (ordered.length !== 28) fail("UNIQUE_FILE_CARDINALITY_DRIFT", "正式组件必须按首次出现顺序投影恰 28 个唯一文件。");
  for (let index = 0; index < ordered.length; index += 1) {
    const relativePath = ordered[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath);
    REFLECT_APPLY(MAP_SET, currentByPath, [relativePath, snapshot]);
  }

  const orderedUniqueFileIdentities = [];
  const driftEntries = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const relativePath = ordered[index];
    const baseline = REFLECT_APPLY(MAP_GET, baselineByPath, [relativePath]);
    const current = REFLECT_APPLY(MAP_GET, currentByPath, [relativePath]);
    const memberships = REFLECT_APPLY(MAP_GET, membershipByPath, [relativePath]);
    const drifted = baseline.rawBytes !== current.rawBytes || baseline.sha256 !== current.rawSha256;
    REFLECT_APPLY(ARRAY_PUSH, orderedUniqueFileIdentities, [{
      order: index + 1,
      path: relativePath,
      componentIds: canonicalValue(memberships),
      persistedRawBytes: baseline.rawBytes,
      persistedSha256: baseline.sha256,
      currentRawBytes: current.rawBytes,
      currentSha256: current.rawSha256,
      drifted
    }]);
    if (drifted) REFLECT_APPLY(ARRAY_PUSH, driftEntries, [orderedUniqueFileIdentities[orderedUniqueFileIdentities.length - 1]]);
  }
  if (driftEntries.length !== 1 || driftEntries[0].path !== REPORT_SOURCE.path
    || driftEntries[0].componentIds.length !== 1
    || driftEntries[0].componentIds[0] !== REPORT_COMPONENT.componentId
    || driftEntries[0].currentRawBytes !== REPORT_SOURCE.currentRawBytes
    || driftEntries[0].currentSha256 !== REPORT_SOURCE.currentSha256
    || driftEntries[0].persistedRawBytes !== REPORT_SOURCE.persistedRawBytes
    || driftEntries[0].persistedSha256 !== REPORT_SOURCE.persistedSha256) {
    fail("UNIQUE_FILE_DRIFT_SET_INVALID", "当前 28-file 投影必须恰有 report source 一项漂移。");
  }
  const golden = REFLECT_APPLY(MAP_GET, currentByPath, [FROZEN_GOLDEN.path]);
  if (!golden || golden.rawBytes !== FROZEN_GOLDEN.rawBytes || golden.rawSha256 !== FROZEN_GOLDEN.sha256) {
    fail("FROZEN_GOLDEN_DRIFT", "v1.7 frozen golden 当前字节漂移。");
  }

  const currentComponents = [];
  const componentDrifts = [];
  for (let index = 0; index < manifest.components.length; index += 1) {
    const baseline = manifest.components[index];
    const current = cloneComponentWithCurrentIdentity(baseline, currentByPath);
    REFLECT_APPLY(ARRAY_PUSH, currentComponents, [current]);
    if (current.digest !== baseline.digest) {
      REFLECT_APPLY(ARRAY_PUSH, componentDrifts, [{
        componentId: current.componentId,
        persistedDigest: baseline.digest,
        currentDigest: current.digest
      }]);
    }
  }
  if (componentDrifts.length !== 1
    || componentDrifts[0].componentId !== REPORT_COMPONENT.componentId
    || componentDrifts[0].persistedDigest !== REPORT_COMPONENT.persistedDigest
    || componentDrifts[0].currentDigest !== REPORT_COMPONENT.currentDigest) {
    fail("COMPONENT_DRIFT_SET_INVALID", "当前 component 投影必须恰有 report_contract 一项摘要漂移。");
  }
  const currentMachineIdentityDigest = sha256Text(`${MACHINE_IDENTITY_DIGEST_DOMAIN}\0${canonicalStringify({
    systemId: "bazi",
    surfaceId: "single-chart-report",
    surfaceVersion: "1.7.0",
    historicalBaselineManifestId: FORMAL_V22.manifestId,
    historicalBaselineManifestDigest: FORMAL_V22.manifestDigest,
    orderedUniqueFileIdentities,
    currentComponents
  })}`);
  if (EXPECTED_CURRENT_MACHINE_IDENTITY_DIGEST !== ZERO_SHA256
    && currentMachineIdentityDigest !== EXPECTED_CURRENT_MACHINE_IDENTITY_DIGEST) {
    fail("CURRENT_MACHINE_IDENTITY_DRIFT", "domain-separated current machine identity 漂移。");
  }
  return { orderedUniqueFileIdentities, currentComponents, componentDrifts, currentMachineIdentityDigest };
}

function buildSuccessor(formalSnapshot, formal, reportReceipt, expertChild, observation) {
  const successor = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    successorId: SUCCESSOR_ID,
    status: "current_machine_identity_observation_candidate_no_manifest_or_release_authority",
    createdAt: CREATED_AT,
    currentParentBindings: {
      reportDriftReceipt: {
        ...rawPin(REPORT_RECEIPT),
        candidateId: REPORT_RECEIPT.candidateId,
        receiptDigest: REPORT_RECEIPT.receiptDigest,
        exactFullLoaderPrivateBrandVerified: true,
        role: "current_report_component_drift_parent"
      },
      expertZeroInstanceChild: {
        ...rawPin(EXPERT_CHILD),
        childId: EXPERT_CHILD.childId,
        childDigest: EXPERT_CHILD.childDigest,
        exactFullLoaderPrivateBrandVerified: true,
        role: "current_expert_zero_instance_overlay_parent"
      },
      exactCurrentPrivateBrandsVerified: 2
    },
    historicalFormalBaseline: {
      ...rawPin(FORMAL_V22),
      manifestId: FORMAL_V22.manifestId,
      manifestDigest: FORMAL_V22.manifestDigest,
      heldHandleRawIdentityVerified: true,
      selfDigestVerified: true,
      fullLoaderInvoked: false,
      privateBrandVerified: false,
      currentManifestClaimed: false,
      role: "historical_v2_2_raw_self_baseline_only"
    },
    currentMachineIdentity: {
      digestDomain: MACHINE_IDENTITY_DIGEST_DOMAIN,
      currentMachineIdentityDigest: observation.currentMachineIdentityDigest,
      formalComponentCount: formal.components.length,
      orderedUniqueFileIdentityCount: observation.orderedUniqueFileIdentities.length,
      orderedUniqueFileIdentities: observation.orderedUniqueFileIdentities,
      currentComponents: observation.currentComponents,
      uniqueFileDriftCount: 1,
      uniqueFileDriftPath: REPORT_SOURCE.path,
      componentDriftCount: 1,
      componentDrift: observation.componentDrifts[0],
      reportComponentCurrentDigest: REPORT_COMPONENT.currentDigest,
      frozenGolden: {
        path: FROZEN_GOLDEN.path,
        rawBytes: FROZEN_GOLDEN.rawBytes,
        sha256: FROZEN_GOLDEN.sha256,
        unchanged: true
      }
    },
    expertOverlay: {
      outsideFormalManifestComponents: true,
      includedInCurrentMachineIdentityDigest: false,
      childId: expertChild.childId,
      childDigest: expertChild.childDigest,
      realReviewerInstancesVerified: 0,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      countsTowardExpertGate: false,
      currentRealityAttestationEstablished: false,
      absenceOfPrivateMaterialInRealityClaimed: false
    },
    gateSummary: {
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      formalKnowledgeDocuments: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseEvidenceComplete: false,
      activeAdmissionEffect: "none"
    },
    observationBoundary: {
      engineeringMachineIdentityObservationEstablished: true,
      currentFullComponentFileSetObserved: true,
      currentFullDomainManifestEstablished: false,
      persistedAsDomainManifest: false,
      endpointSnapshotOnly: true,
      eachFileReadThroughStableHeldHandle: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      replayExcluded: false
    },
    ownerDecisionBoundary: {
      ownerDecisionsRecorded: 0,
      ownerAcceptanceVerified: false,
      ownerAttributionVerified: false,
      manifestRebindAuthorized: false,
      manifestResignAuthorized: false,
      releaseCandidateFreezeAuthorized: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      safeToPublish: false,
      crossSystemAuthorityInheritanceAllowed: false
    },
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    runtimeTrustBoundary: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      visibleLoaderGuardIsSecurityBoundary: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    lineage: {
      parentArtifactsModified: false,
      formalManifestModified: false,
      formalManifestComponentsExtendedWithExpertOverlay: false,
      centralManifestModified: false,
      centralRegistryModified: false,
      defaultOrRuntimeIntegration: "absent"
    },
    doesNotEstablish: [
      "formal-current-domain-manifest-or-manifest-rebind-resign",
      "source-binding-rights-carrier-or-materialization-closure",
      "real-expert-identity-credentials-independence-or-opinion-truth",
      "content-truth-or-rights-legal-conclusion",
      "browser-pwa-service-worker-or-runtime-evidence",
      "cross-file-atomicity-mutation-epoch-aba-or-replay-exclusion",
      "release-readiness-public-deployment-or-expert-claims-authorization",
      "cross-system-authority"
    ]
  };
  successor.receiptDigest = computeBaziCurrentMachineIdentitySuccessorDigest(successor);
  return deepFreeze(successor);
}

export async function buildBaziCurrentMachineIdentitySuccessor(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const { reportReceipt, expertChild } = await loadCurrentParents(workspaceRoot);
  const formalSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, FORMAL_V22.path);
  const formal = parseBaziDttStrictJsonArtifact(formalSnapshot);
  assertFormalV22(formalSnapshot, formal);
  const observation = await observeCurrentComponents(workspaceRoot, formal);
  return buildSuccessor(formalSnapshot, formal, reportReceipt, expertChild, observation);
}

function assertPersistedSemantic(persisted, expected) {
  if (persisted?.successorId !== SUCCESSOR_ID || persisted?.recordType !== RECORD_TYPE
    || persisted?.receiptDigest !== EXPECTED_PERSISTED.receiptDigest
    || !SHA256.test(persisted?.receiptDigest)
    || computeBaziCurrentMachineIdentitySuccessorDigest(persisted) !== persisted.receiptDigest
    || persisted?.currentMachineIdentity?.currentMachineIdentityDigest !== EXPECTED_CURRENT_MACHINE_IDENTITY_DIGEST
    || persisted?.currentMachineIdentity?.orderedUniqueFileIdentityCount !== 28
    || persisted?.currentMachineIdentity?.uniqueFileDriftCount !== 1
    || persisted?.currentMachineIdentity?.componentDriftCount !== 1
    || persisted?.currentMachineIdentity?.uniqueFileDriftPath !== REPORT_SOURCE.path
    || persisted?.currentMachineIdentity?.componentDrift?.componentId !== REPORT_COMPONENT.componentId
    || persisted?.observationBoundary?.persistedAsDomainManifest !== false
    || persisted?.observationBoundary?.crossFileAtomicSnapshot !== false
    || persisted?.observationBoundary?.mutationEpochReceipt !== null
    || persisted?.observationBoundary?.abaExcluded !== false
    || persisted?.ownerDecisionBoundary?.manifestRebindAuthorized !== false
    || persisted?.ownerDecisionBoundary?.manifestResignAuthorized !== false
    || persisted?.authorityBoundary?.releaseReady !== false
    || persisted?.authorityBoundary?.publicDeploymentAuthorized !== false
    || persisted?.authorityBoundary?.expertClaimsAuthorized !== false
    || persisted?.gateSummary?.bindingFrozenVerified !== 0
    || persisted?.gateSummary?.independentExpertReviewsVerified !== 0
    || !exactJson(persisted, expected)) {
    fail("SUCCESSOR_CURRENT_MISMATCH", "持久化 successor 不等于当前唯一机械投影或红门被抬升。");
  }
}

export async function loadBaziCurrentMachineIdentitySuccessor(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  if (EXPECTED_PERSISTED.rawBytes <= 0 || EXPECTED_CURRENT_MACHINE_IDENTITY_DIGEST === ZERO_SHA256
    || !SHA256.test(EXPECTED_PERSISTED.rawSha256) || !SHA256.test(EXPECTED_PERSISTED.receiptDigest)) {
    fail("SUCCESSOR_IDENTITY_UNPINNED", "successor raw/self/current machine identity 尚未冻结。");
  }
  const expected = await buildBaziCurrentMachineIdentitySuccessor(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_RELATIVE_PATH
  );
  assertSnapshot(snapshot, { path: BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_RELATIVE_PATH, ...EXPECTED_PERSISTED }, "SUCCESSOR_RAW_DRIFT");
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (decodeSnapshot(snapshot) !== serializeBaziCurrentMachineIdentitySuccessor(persisted)) {
    fail("SUCCESSOR_SERIALIZATION_DRIFT", "successor 不是规范持久化字节。");
  }
  assertPersistedSemantic(persisted, expected);
  const verified = deepFreeze(persisted);
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedBaziCurrentMachineIdentitySuccessor(value) {
  return value !== null && typeof value === "object" && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziCurrentMachineIdentitySuccessorSummary(value) {
  if (!isVerifiedBaziCurrentMachineIdentitySuccessor(value)) {
    fail("SUCCESSOR_BRAND_REQUIRED", "summary 只接受 exact persisted loader 私有品牌。");
  }
  return deepFreeze({
    successorId: value.successorId,
    receiptDigest: value.receiptDigest,
    currentMachineIdentityDigest: value.currentMachineIdentity.currentMachineIdentityDigest,
    formalComponentsObserved: value.currentMachineIdentity.formalComponentCount,
    orderedUniqueFilesObserved: value.currentMachineIdentity.orderedUniqueFileIdentityCount,
    uniqueFileDrifts: value.currentMachineIdentity.uniqueFileDriftCount,
    componentDrifts: value.currentMachineIdentity.componentDriftCount,
    frozenGoldenUnchanged: value.currentMachineIdentity.frozenGolden.unchanged,
    bindingFrozenVerified: value.gateSummary.bindingFrozenVerified,
    bindingRequired: value.gateSummary.bindingRequired,
    independentExpertReviewsVerified: value.gateSummary.independentExpertReviewsVerified,
    independentExpertsRequired: value.gateSummary.independentExpertsRequired,
    persistedAsDomainManifest: value.observationBoundary.persistedAsDomainManifest,
    releaseReady: value.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: value.authorityBoundary.publicDeploymentAuthorized,
    releaseIdentity: value.releaseGovernance.releaseIdentity,
    targetSchema: value.releaseGovernance.targetSchema,
    migrationId: value.releaseGovernance.migrationId
  });
}

export const baziCurrentMachineIdentitySuccessorTestOnly = OBJECT_FREEZE({
  SUCCESSOR_ID,
  RECORD_TYPE,
  RECEIPT_DIGEST_DOMAIN,
  MACHINE_IDENTITY_DIGEST_DOMAIN,
  FORMAL_V22,
  REPORT_RECEIPT,
  EXPERT_CHILD,
  REPORT_COMPONENT,
  REPORT_SOURCE,
  FROZEN_GOLDEN,
  EXPECTED_CURRENT_MACHINE_IDENTITY_DIGEST,
  EXPECTED_PERSISTED,
  canonicalStringify,
  canonicalValue,
  componentDigest,
  assertFormalV22,
  assertReportReceipt,
  assertExpertChild,
  assertDeepFrozen,
  observeCurrentComponents,
  buildSuccessor,
  assertPersistedSemantic,
  deepFreeze,
  sha256Bytes
});
