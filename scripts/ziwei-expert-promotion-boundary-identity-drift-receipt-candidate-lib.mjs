import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
  buildCurrentIndependentDomainManifest,
  readIndependentDomainManifest
} from "./independent-domain-release-manifest-lib.mjs";
export const ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/ziwei-expert-promotion-boundary-identity-drift-receipt-candidate.v1.0.0.json";

const CANDIDATE_ID =
  "hakimi.ziwei.expert-promotion-boundary.identity-drift-receipt-candidate/1.0.0";
const RECORD_TYPE =
  "ziwei_expert_promotion_boundary_identity_drift_receipt_candidate";
const STATUS =
  "candidate_only_single_source_five_component_and_browser_graph_drift_zero_admission_effect";
const CREATED_AT = "2026-09-01T07:30:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.ziwei.expert-promotion-boundary.identity-drift-receipt-candidate.v1";
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REGEXP_TEST = RegExp.prototype.test;
const ARRAY_FIND = Array.prototype.find;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_SORT = Array.prototype.sort;
const BUFFER_TO_STRING = Buffer.prototype.toString;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_ARRAY = Array;
const NATIVE_WEAK_SET = WeakSet;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const UTIL_IS_PROXY = nodeUtilTypes.isProxy;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;

const VERIFIED_RECEIPTS = new NATIVE_WEAK_SET();

const FORMAL_MANIFEST = OBJECT_FREEZE({
  path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json",
  rawBytes: 17_968,
  rawSha256: "f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867",
  manifestId: "hakimi.ziwei-doushu.isolated-engineering-domain-release-manifest/2.0.0",
  persistedManifestDigest: "f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e",
  currentCandidateManifestDigest: "24ddffd0caebbce4f800154ad70fb24e441e67b3580785b798044b0393d70b66"
});

const CONTRACT_SOURCE = OBJECT_FREEZE({
  path: "packages/ziwei-doushu-contracts-draft/src/index.ts",
  persistedRawBytes: 45_329,
  persistedRawSha256: "0474abe7170f17352efd9b0d0f2735f2edbec049bb331441b7bd77ff2b79acc0",
  currentRawBytes: 46_181,
  currentRawSha256: "2a9555dba509873e6c436dcdc9121fcd90e943d880984581fbff865feca15685"
});

const CONTRACT_TEST = OBJECT_FREEZE({
  path: "packages/ziwei-doushu-contracts-draft/src/index.test.ts",
  currentRawBytes: 30_647,
  currentRawSha256: "5cd0a7eef6c6522c5b6cf641d0340fe4e2618d02706e8e73cddcee85251ab74e"
});

const HISTORICAL_BROWSER_CHILD = OBJECT_FREEZE({
  path: "content/system-admission/ziwei-same-artifact-browser-observation-child.v1.0.0.json",
  rawBytes: 37_337,
  rawSha256: "7cd6365d6f6ad18f0460418e5b745da0f0e68761cea361886729e55563e4db16",
  childId: "hakimi.ziwei.same-artifact-browser-observation/1.0.0",
  observationDigest: "792bba4b3c5307fe3bc08aed849eaeb092787eb9e171e09a9e82b3be4dd71a1b"
});

const COMPONENT_DRIFTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    componentId: "execution_rules",
    persistedDigest: "501f2b2a97a3986f78e9a9d73581410381c560ff5599be9629ea70e332ce6c17",
    currentCandidateDigest: "2f1800d9878ae45cbc7591058b11345c0e31f66c97a987998e767b67cd7fc05d"
  }),
  OBJECT_FREEZE({
    componentId: "interpretation_rules",
    persistedDigest: "7579a19bde8b936de2682e0d38e87b0d1e4d9a9ce1742f82f9efb9b0b29bddff",
    currentCandidateDigest: "35aa0b900592397e753d8e693a3dbd522b610c07630c3285c7804da680a44c12"
  }),
  OBJECT_FREEZE({
    componentId: "input_policy",
    persistedDigest: "dff5a8c23adfdf3a87940f6e382aade2a1afe922cff13fd70750eb84b634c958",
    currentCandidateDigest: "10e7c444f9c04a24c4afedfffb73cabe8b049ed3512779c7310512ca824cbf83"
  }),
  OBJECT_FREEZE({
    componentId: "fact_contract",
    persistedDigest: "394eb11e7cc2b8b21fad894ea09408b087a1551d7043d4f5d51d0b92f798f32e",
    currentCandidateDigest: "0ad26a351c9f4774314e8a8d735fa8646e5a79ea4a81d656e61a4e3d490de386"
  }),
  OBJECT_FREEZE({
    componentId: "high_risk_policy",
    persistedDigest: "c2982c9987fd896deb5d2d39f1d24d192d6a877eb911ad4fd8550b0dace5d24d",
    currentCandidateDigest: "fd694af774917da59a4a2575bc2f31d660c17f18bf3f6b64ee185d9f656a8bd9"
  })
]);

const UNCHANGED_COMPONENT_IDS = OBJECT_FREEZE([
  "source_bundle",
  "rights_bundle",
  "expert_review_bundle",
  "report_contract"
]);

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 7_905,
  rawSha256: "c6728e943d713cf63be2b1d7e01d5170cf2a2b7b308e332abbbc53ff1ab37348",
  receiptDigest: "09d86df6f23d4c1cbc0a76df359dd0738f793de5bdf84e4784b0620a3a6f05bb"
});

export class ZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateError extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "ZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new ZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateError(
    code,
    message,
    cause
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function captureCanonical(value, state = {
  active: new NATIVE_WEAK_SET(),
  seen: new NATIVE_WEAK_SET(),
  nodes: 0,
  textCodeUnits: 0
}, depth = 0) {
  if (depth > 64) fail("NON_CANONICAL_JSON", "Ziwei drift receipt 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) {
    fail("NON_CANONICAL_JSON", "Ziwei drift receipt 输入超过节点上限。");
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])
      || REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) {
      fail("NON_CANONICAL_JSON", "Ziwei drift receipt 数值必须有限且不能为负零。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCodeUnits += value.length;
    if (state.textCodeUnits > 2_000_000) {
      fail("NON_CANONICAL_JSON", "Ziwei drift receipt 文本超过上限。");
    }
    return value;
  }
  if (typeof value !== "object"
    || REFLECT_APPLY(UTIL_IS_PROXY, nodeUtilTypes, [value])) {
    fail("NON_CANONICAL_JSON", "Ziwei drift receipt 只接受非 Proxy JSON 数据值。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) {
    fail("NON_CANONICAL_JSON", "Ziwei drift receipt 不接受 cycle。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) {
    fail("NON_CANONICAL_JSON", "Ziwei drift receipt 不接受 alias。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  try {
    const descriptors = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
      Object,
      [value]
    );
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] === "symbol") {
        fail("NON_CANONICAL_JSON", "Ziwei drift receipt 不接受 Symbol 属性。");
      }
    }
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
      if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== ARRAY_PROTOTYPE) {
        fail("NON_CANONICAL_JSON", "Ziwei drift receipt 数组原型无效。");
      }
      const length = descriptors.length?.value;
      if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length])
        || length < 0
        || keys.length !== length + 1) {
        fail("NON_CANONICAL_JSON", "Ziwei drift receipt 数组必须稠密且无额外字段。");
      }
      const output = new NATIVE_ARRAY(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[index];
        if (!descriptor
          || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("NON_CANONICAL_JSON", "Ziwei drift receipt 数组元素必须是自有 data property。");
        }
        REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, index, {
          configurable: true,
          enumerable: true,
          value: captureCanonical(descriptor.value, state, depth + 1),
          writable: true
        }]);
      }
      return output;
    }
    if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_JSON", "Ziwei drift receipt 对象原型无效。");
    }
    const stringKeys = new NATIVE_ARRAY(keys.length);
    for (let index = 0; index < keys.length; index += 1) {
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [stringKeys, index, {
        configurable: true,
        enumerable: true,
        value: keys[index],
        writable: true
      }]);
    }
    REFLECT_APPLY(ARRAY_SORT, stringKeys, [compareCodeUnits]);
    const output = {};
    for (let index = 0; index < stringKeys.length; index += 1) {
      const key = stringKeys[index];
      const descriptor = descriptors[key];
      if (!descriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        || descriptor.enumerable !== true) {
        fail("NON_CANONICAL_JSON", "Ziwei drift receipt 字段必须是自有可枚举 data property。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        configurable: true,
        enumerable: true,
        value: captureCanonical(descriptor.value, state, depth + 1),
        writable: true
      }]);
    }
    return output;
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function canonicalStringify(value) {
  try {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureCanonical(value)]);
  } catch (cause) {
    if (cause instanceof ZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateError) {
      throw cause;
    }
    fail("NON_CANONICAL_JSON", "Ziwei drift receipt 只接受被动、无别名 JSON。", cause);
  }
}

function captureJson(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      fail("NON_CANONICAL_JSON", "Ziwei drift receipt 不接受 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function withoutOwnField(value, field) {
  const snapshot = captureJson(value);
  const output = {};
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [snapshot]);
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key !== field) {
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        configurable: true,
        enumerable: true,
        value: snapshot[key],
        writable: true
      }]);
    }
  }
  return output;
}

export function computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest(
  value
) {
  return sha256Text(
    `${DIGEST_DOMAIN}\0${canonicalStringify(withoutOwnField(value, "receiptDigest"))}`
  );
}

export function serializeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
  value
) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureJson(value), null, 2])}\n`;
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function appendOwn(array, value) {
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [array, array.length, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  }]);
}

function requireExactKeys(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail("KEY_SET_INVALID", `${label} 必须是对象。`);
  }
  const actual = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  REFLECT_APPLY(ARRAY_SORT, actual, []);
  const expected = new NATIVE_ARRAY(expectedKeys.length);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [expected, index, {
      configurable: true,
      enumerable: true,
      value: expectedKeys[index],
      writable: true
    }]);
  }
  REFLECT_APPLY(ARRAY_SORT, expected, []);
  if (!exactJson(actual, expected)) fail("KEY_SET_INVALID", `${label} 字段不精确。`);
}

function requireAllFalse(value, label) {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail("AUTHORITY_INVALID", `${label} 必须是全 false 对象。`);
  }
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  if (keys.length === 0) fail("AUTHORITY_INVALID", `${label} 不得为空。`);
  for (let index = 0; index < keys.length; index += 1) {
    if (value[keys[index]] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label}.${keys[index]} 不得提升。`);
    }
  }
}

function assertSnapshot(snapshot, expected, code) {
  if (snapshot.path !== expected.path
    || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail(code, `${expected.path} raw identity 漂移。`);
  }
}

function fileDifference(persistedComponent, currentComponent) {
  const differences = [];
  if (persistedComponent.files.length !== currentComponent.files.length) {
    fail("COMPONENT_FILE_SET_DRIFT", `${persistedComponent.componentId} 文件数发生非预期变化。`);
  }
  for (let index = 0; index < persistedComponent.files.length; index += 1) {
    const persisted = persistedComponent.files[index];
    const current = currentComponent.files[index];
    if (persisted.path !== current.path) {
      fail("COMPONENT_FILE_SET_DRIFT", `${persistedComponent.componentId} 文件顺序或路径漂移。`);
    }
    if (persisted.sha256 !== current.sha256) {
      appendOwn(differences, {
        path: persisted.path,
        persistedSha256: persisted.sha256,
        currentSha256: current.sha256
      });
    }
  }
  return differences;
}

function assertManifestFanout(persisted, current) {
  if (persisted.manifestId !== FORMAL_MANIFEST.manifestId
    || persisted.manifestDigest !== FORMAL_MANIFEST.persistedManifestDigest
    || current.manifestDigest !== FORMAL_MANIFEST.currentCandidateManifestDigest
    || persisted.components.length !== current.components.length) {
    fail("MANIFEST_IDENTITY_DRIFT", "Ziwei persisted/current candidate manifest 身份漂移。");
  }
  const observedDrifts = [];
  const observedUnchanged = [];
  for (let index = 0; index < persisted.components.length; index += 1) {
    const before = persisted.components[index];
    const after = current.components[index];
    if (before.componentId !== after.componentId || before.version !== after.version) {
      fail("COMPONENT_ORDER_DRIFT", "Ziwei component ID/version 顺序漂移。");
    }
    const differences = fileDifference(before, after);
    if (before.digest === after.digest) {
      if (differences.length !== 0) {
        fail("COMPONENT_DIGEST_CLOSURE_INVALID", `${before.componentId} 文件变更但 digest 未变。`);
      }
      appendOwn(observedUnchanged, before.componentId);
      continue;
    }
    if (differences.length !== 1
      || differences[0].path !== CONTRACT_SOURCE.path
      || differences[0].persistedSha256 !== CONTRACT_SOURCE.persistedRawSha256
      || differences[0].currentSha256 !== CONTRACT_SOURCE.currentRawSha256) {
      fail("DRIFT_ROOT_NOT_UNIQUE", `${before.componentId} 不再只由 Ziwei contract source 单点漂移。`);
    }
    appendOwn(observedDrifts, {
      componentId: before.componentId,
      persistedDigest: before.digest,
      currentCandidateDigest: after.digest
    });
  }
  if (!exactJson(observedDrifts, COMPONENT_DRIFTS)
    || !exactJson(observedUnchanged, UNCHANGED_COMPONENT_IDS)) {
    fail("COMPONENT_FANOUT_DRIFT", "Ziwei 单一源码到五个 component digest 的 fan-out 漂移。");
  }
}

function assertBrowserHistoricalChild(browserChild) {
  if (browserChild.childId !== HISTORICAL_BROWSER_CHILD.childId
    || browserChild.observationDigest !== HISTORICAL_BROWSER_CHILD.observationDigest) {
    fail("BROWSER_CHILD_IDENTITY_INVALID", "Ziwei historical browser child 身份漂移。");
  }
  const browserFiles = browserChild.buildSourceSnapshot?.files;
  const entry = ARRAY_IS_ARRAY(browserFiles)
    ? REFLECT_APPLY(ARRAY_FIND, browserFiles, [
        (file) => file.path === CONTRACT_SOURCE.path
      ])
    : undefined;
  if (!entry
    || entry.bytes !== CONTRACT_SOURCE.persistedRawBytes
    || entry.sha256 !== CONTRACT_SOURCE.persistedRawSha256) {
    fail("BROWSER_SOURCE_GRAPH_BASELINE_DRIFT", "Ziwei browser child 的历史 source entry 漂移。");
  }
}

function authorityBoundary() {
  return {
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
    rightsLegalConclusionEstablished: false,
    safeToPublish: false
  };
}

function buildProjection() {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    candidateId: CANDIDATE_ID,
    candidateStatus: STATUS,
    createdAt: CREATED_AT,
    activeAdmissionEffect: "none",
    releaseGovernance: {
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      projectDefaultContext: {
        releaseIdentity: "legacy-v13",
        targetSchema: 13,
        migrationId: null,
        inheritedByZiweiProductIdentity: false
      }
    },
    scope: {
      systemId: "ziwei",
      productSystemId: "ziwei-doushu",
      sourceChange: {
        path: CONTRACT_SOURCE.path,
        persistedRawBytes: CONTRACT_SOURCE.persistedRawBytes,
        persistedRawSha256: CONTRACT_SOURCE.persistedRawSha256,
        currentRawBytes: CONTRACT_SOURCE.currentRawBytes,
        currentRawSha256: CONTRACT_SOURCE.currentRawSha256,
        uniqueRootSourceClaimedForObservedComponentFanout: true
      },
      focusedTestSource: {
        path: CONTRACT_TEST.path,
        currentRawBytes: CONTRACT_TEST.currentRawBytes,
        currentRawSha256: CONTRACT_TEST.currentRawSha256,
        testsExecutedByThisReceipt: false
      },
      expertPromotionBoundary: {
        localReviewerIdsEstablishRealIdentityQualificationOrIndependence: false,
        localDoubleReviewedMetadataMayRemainStructural: true,
        expertReviewedRuleReservedUntilExternalVerifiedReceipt: true,
        expertDoubleReviewedProvenanceReservedUntilExternalVerifiedReceipt: true,
        externalVerifiedExpertReceiptSchemaIntegrated: false,
        verifiedExpertReceiptCount: 0
      }
    },
    manifestDrift: {
      historicalManifest: {
        path: FORMAL_MANIFEST.path,
        rawBytes: FORMAL_MANIFEST.rawBytes,
        rawSha256: FORMAL_MANIFEST.rawSha256,
        manifestId: FORMAL_MANIFEST.manifestId,
        manifestDigest: FORMAL_MANIFEST.persistedManifestDigest
      },
      historicalManifestPreservedUnmodified: true,
      historicalManifestMechanicallyCurrent: false,
      currentCandidateManifestPersisted: false,
      currentCandidateManifestDigest: FORMAL_MANIFEST.currentCandidateManifestDigest,
      changedComponentCount: 5,
      changedComponents: COMPONENT_DRIFTS,
      unchangedComponentCount: 4,
      unchangedComponentIds: UNCHANGED_COMPONENT_IDS,
      oneSourceIdentityFansOutToFiveComponentDigests: true,
      fiveIndependentSemanticChangesClaimed: false,
      uniqueBlockerClaimed: false,
      manifestRebindOrResignPerformed: false
    },
    browserObservationDrift: {
      historicalChild: {
        path: HISTORICAL_BROWSER_CHILD.path,
        rawBytes: HISTORICAL_BROWSER_CHILD.rawBytes,
        rawSha256: HISTORICAL_BROWSER_CHILD.rawSha256,
        childId: HISTORICAL_BROWSER_CHILD.childId,
        observationDigest: HISTORICAL_BROWSER_CHILD.observationDigest
      },
      historicalChildPreservedUnmodified: true,
      historicalChildMechanicallyCurrent: false,
      failureClass: "SOURCE_GRAPH_MISMATCH",
      uniqueBlockerClaimed: false,
      browserRerunPerformedByThisReceipt: false,
      currentBrowserRuntimeEvidenceEstablished: false,
      historicalBrowserEvidenceMayBePromotedAsCurrent: false
    },
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 27,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      externalVerifiedExpertReceiptsRequired: 2,
      externalVerifiedExpertReceiptsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseEvidenceComplete: false
    },
    ownerDecisionBoundary: {
      ownerAcceptanceVerified: false,
      ownerDecisionsRecorded: 0,
      manifestRebindAuthorized: false,
      manifestResignAuthorized: false,
      browserEvidenceRerunAuthorizedByThisReceipt: false,
      formalAdmissionPromotionAuthorized: false
    },
    observationBoundary: {
      endpointObservationOnly: true,
      engineeringIdentityDriftEstablished: true,
      sameHeldBufferHashAndParsePerJsonArtifact: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      receiptDigestIsDigitalSignature: false
    },
    runtimeTrustBoundary: {
      nodeRuntimeIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      hiddenPreloadExcluded: false,
      loaderIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    authorityBoundary: authorityBoundary(),
    doesNotEstablish: [
      "real_expert_identity_qualification_independence_or_opinion",
      "expert_truth_or_content_truth",
      "current_full_ziwei_domain_manifest",
      "current_ziwei_browser_runtime_evidence",
      "manifest_rebind_resign_or_owner_acceptance",
      "source_binding_or_three_layer_rights",
      "rights_legal_conclusion_or_redistribution_authorization",
      "formal_admission_or_domain_authority",
      "web_pwa_service_worker_or_public_host_evidence",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_readiness_deployment_rollback_or_public_release_authorization",
      "bazi_authority_or_legacy_v13_schema_inheritance"
    ]
  };
  return {
    ...unsigned,
    receiptDigest:
      computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest(unsigned)
  };
}

function assertReceiptBoundary(value) {
  requireExactKeys(value, [
    "activeAdmissionEffect",
    "authorityBoundary",
    "browserObservationDrift",
    "candidateId",
    "candidateStatus",
    "createdAt",
    "doesNotEstablish",
    "gateSummary",
    "manifestDrift",
    "observationBoundary",
    "ownerDecisionBoundary",
    "receiptDigest",
    "recordType",
    "releaseGovernance",
    "runtimeTrustBoundary",
    "schemaVersion",
    "scope"
  ], "Ziwei drift receipt");
  if (value.schemaVersion !== "1.0.0"
    || value.recordType !== RECORD_TYPE
    || value.candidateId !== CANDIDATE_ID
    || value.candidateStatus !== STATUS
    || value.createdAt !== CREATED_AT
    || value.activeAdmissionEffect !== "none") {
    fail("RECEIPT_IDENTITY_INVALID", "Ziwei drift receipt 身份或零效力边界漂移。");
  }
  if (value.gateSummary?.admissionGatesSatisfied !== 0
    || value.gateSummary?.bindingFrozenVerified !== 0
    || value.gateSummary?.bindingRequired !== 27
    || value.gateSummary?.independentExpertReviewsVerified !== 0
    || value.gateSummary?.externalVerifiedExpertReceiptsVerified !== 0
    || value.manifestDrift?.historicalManifestMechanicallyCurrent !== false
    || value.manifestDrift?.currentCandidateManifestPersisted !== false
    || value.manifestDrift?.uniqueBlockerClaimed !== false
    || value.manifestDrift?.manifestRebindOrResignPerformed !== false
    || value.browserObservationDrift?.historicalChildMechanicallyCurrent !== false
    || value.browserObservationDrift?.uniqueBlockerClaimed !== false
    || value.browserObservationDrift?.browserRerunPerformedByThisReceipt !== false
    || value.browserObservationDrift?.currentBrowserRuntimeEvidenceEstablished !== false) {
    fail("PROMOTION_FORBIDDEN", "Ziwei drift receipt 的 manifest/browser/expert gate 必须继续失败关闭。");
  }
  requireAllFalse(value.authorityBoundary, "Ziwei authorityBoundary");
  if (value.observationBoundary?.crossFileAtomicSnapshot !== false
    || value.observationBoundary?.mutationEpochAvailable !== false
    || value.observationBoundary?.mutationEpochReceipt !== null
    || value.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || value.observationBoundary?.abaExcluded !== false
    || value.observationBoundary?.receiptDigestIsDigitalSignature !== false) {
    fail("OBSERVATION_PROMOTION_FORBIDDEN", "receipt 不得声称 atomicity、epoch、interval、ABA 或签名。");
  }
  if (!REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [value.receiptDigest])
    || computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest(value)
      !== value.receiptDigest) {
    fail("RECEIPT_DIGEST_INVALID", "Ziwei drift receiptDigest 无效。");
  }
  return value;
}

async function collectCurrentInputs(workspaceRoot) {
  const definition = REFLECT_APPLY(
    ARRAY_FIND,
    INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
    [(entry) => entry.systemId === "ziwei"]
  );
  if (!definition) fail("ZIWEI_DEFINITION_MISSING", "缺少 Ziwei manifest definition。");
  const manifestSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FORMAL_MANIFEST.path
  );
  const persistedManifest = await readIndependentDomainManifest(workspaceRoot, definition);
  const sourceSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    CONTRACT_SOURCE.path
  );
  const testSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    CONTRACT_TEST.path
  );
  const browserSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    HISTORICAL_BROWSER_CHILD.path
  );
  assertSnapshot(manifestSnapshot, FORMAL_MANIFEST, "FORMAL_MANIFEST_RAW_DRIFT");
  if (sourceSnapshot.rawBytes !== CONTRACT_SOURCE.currentRawBytes
    || sourceSnapshot.rawSha256 !== CONTRACT_SOURCE.currentRawSha256) {
    fail("CONTRACT_SOURCE_DRIFT", "Ziwei contract source 当前身份漂移。");
  }
  if (testSnapshot.rawBytes !== CONTRACT_TEST.currentRawBytes
    || testSnapshot.rawSha256 !== CONTRACT_TEST.currentRawSha256) {
    fail("CONTRACT_TEST_DRIFT", "Ziwei focused test source 当前身份漂移。");
  }
  assertSnapshot(browserSnapshot, HISTORICAL_BROWSER_CHILD, "BROWSER_CHILD_RAW_DRIFT");
  const browserChild = parseBaziDttStrictJsonArtifact(browserSnapshot);
  assertBrowserHistoricalChild(browserChild);
  const currentManifest = await buildCurrentIndependentDomainManifest(
    workspaceRoot,
    definition,
    { createdAt: persistedManifest.createdAt }
  );
  assertManifestFanout(persistedManifest, currentManifest);
}

export async function buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
  workspaceRoot = process.cwd()
) {
  await collectCurrentInputs(workspaceRoot);
  return deepFreeze(captureJson(assertReceiptBoundary(buildProjection())));
}

function assertPersistedIdentity(snapshot, value) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [EXPECTED_PERSISTED.rawSha256])
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [EXPECTED_PERSISTED.receiptDigest])) {
    fail("PERSISTED_IDENTITY_UNSET", "Ziwei drift receipt 固定身份尚未冻结。");
  }
  if (snapshot.path
      !== ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
    || value.receiptDigest !== EXPECTED_PERSISTED.receiptDigest) {
    fail("PERSISTED_IDENTITY_DRIFT", "Ziwei drift receipt raw 或 semantic identity 漂移。");
  }
}

export async function loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
  workspaceRoot = process.cwd()
) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
  );
  const parsed = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedIdentity(snapshot, parsed);
  if (REFLECT_APPLY(BUFFER_TO_STRING, snapshot.bytes, ["utf8"])
      !== serializeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(parsed)) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "Ziwei drift receipt 不是唯一 canonical LF materialization。");
  }
  assertReceiptBoundary(parsed);
  const expected =
    await buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(workspaceRoot);
  if (!exactJson(parsed, expected)) {
    fail("CURRENT_RECEIPT_MISMATCH", "persisted Ziwei drift receipt 不等于当前窄观察。");
  }
  const verified = deepFreeze(captureJson(parsed));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RECEIPTS, [verified]);
  return verified;
}

export function isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
  value
) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RECEIPTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export const ziweiExpertPromotionBoundaryIdentityDriftReceiptCandidateTestOnly =
  OBJECT_FREEZE({
    CANDIDATE_ID,
    RECORD_TYPE,
    STATUS,
    CREATED_AT,
    DIGEST_DOMAIN,
    FORMAL_MANIFEST,
    CONTRACT_SOURCE,
    CONTRACT_TEST,
    HISTORICAL_BROWSER_CHILD,
    COMPONENT_DRIFTS,
    UNCHANGED_COMPONENT_IDS,
    EXPECTED_PERSISTED,
    assertReceiptBoundary,
    assertPersistedIdentity,
    canonicalStringify,
    captureJson,
    exactJson
  });
