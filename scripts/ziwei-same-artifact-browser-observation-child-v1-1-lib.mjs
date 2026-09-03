import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  buildCurrentZiweiSameArtifactCandidate,
  canonicalStringify as canonicalStringifyBaseObservation,
  computeCandidateDigest as computeBaseObservationDigest,
  verifyZiweiSameArtifactCandidateObject
} from "./ziwei-same-artifact-browser-observation-lib.mjs";
import {
  ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
  isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate,
  loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate
} from "./ziwei-expert-promotion-boundary-identity-drift-receipt-candidate-lib.mjs";

export const ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_RELATIVE_PATH =
  "content/system-admission/ziwei-same-artifact-browser-observation-child.v1.1.0.json";
export const ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_ID =
  "hakimi.ziwei.same-artifact-browser-observation/1.1.0";
export const ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_SCHEMA_VERSION =
  "1.1.0";

const RECORD_TYPE =
  "ziwei_same_artifact_edge_chrome_browser_observation_successor_child";
const STATUS =
  "append_only_current_source_graph_same_artifact_browser_observation_successor_zero_admission_effect";
const DIGEST_DOMAIN =
  "hakimi.ziwei.same-artifact-browser-observation-child.v1.1";
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;

const NATIVE_OBJECT = Object;
const NATIVE_ARRAY = Array;
const NATIVE_JSON = JSON;
const NATIVE_BUFFER = Buffer;
const NATIVE_WEAK_SET = WeakSet;
const NATIVE_STRING = String;
const NATIVE_PROMISE = Promise;
const NATIVE_REFLECT = Reflect;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_MAP = Array.prototype.map;
const ARRAY_FIND = Array.prototype.find;
const ARRAY_SOME = Array.prototype.some;
const ARRAY_EVERY = Array.prototype.every;
const ARRAY_INCLUDES = Array.prototype.includes;
const ARRAY_FOR_EACH = Array.prototype.forEach;
const ARRAY_JOIN = Array.prototype.join;
const STRING_INCLUDES = String.prototype.includes;
const STRING_STARTS_WITH = String.prototype.startsWith;
const STRING_ENDS_WITH = String.prototype.endsWith;
const STRING_INDEX_OF = String.prototype.indexOf;
const STRING_SLICE = String.prototype.slice;
const STRING_SPLIT = String.prototype.split;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const BUFFER_FROM = Buffer.from;
const BUFFER_BYTE_LENGTH = Buffer.byteLength;
const BUFFER_TO_STRING = Buffer.prototype.toString;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REGEXP_TEST = RegExp.prototype.test;
const UTIL_IS_PROXY = nodeUtilTypes.isProxy;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const OBJECT_PROTOTYPE_TO_JSON_AT_IMPORT = OBJECT_PROTOTYPE.toJSON;

const VERIFIED_CHILDREN = new NATIVE_WEAK_SET();

const EXPERT_DRIFT_RECEIPT = OBJECT_FREEZE({
  path: ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
  rawBytes: 7_905,
  rawSha256: "c6728e943d713cf63be2b1d7e01d5170cf2a2b7b308e332abbbc53ff1ab37348",
  candidateId:
    "hakimi.ziwei.expert-promotion-boundary.identity-drift-receipt-candidate/1.0.0",
  receiptDigest: "09d86df6f23d4c1cbc0a76df359dd0738f793de5bdf84e4784b0620a3a6f05bb"
});

const HISTORICAL_V1 = OBJECT_FREEZE({
  path: "content/system-admission/ziwei-same-artifact-browser-observation-child.v1.0.0.json",
  rawBytes: 37_337,
  rawSha256: "7cd6365d6f6ad18f0460418e5b745da0f0e68761cea361886729e55563e4db16",
  schemaVersion: "1.0.0",
  childId: "hakimi.ziwei.same-artifact-browser-observation/1.0.0",
  observationDigest: "792bba4b3c5307fe3bc08aed849eaeb092787eb9e171e09a9e82b3be4dd71a1b"
});

const HISTORICAL_MANIFEST = OBJECT_FREEZE({
  path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json",
  rawBytes: 17_968,
  rawSha256: "f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867",
  manifestId: "hakimi.ziwei-doushu.isolated-engineering-domain-release-manifest/2.0.0",
  manifestDigest: "f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e",
  currentCandidateManifestDigest:
    "24ddffd0caebbce4f800154ad70fb24e441e67b3580785b798044b0393d70b66"
});

const CURRENT_BASE = OBJECT_FREEZE({
  schemaVersion: "1.0.0",
  childId: "hakimi.ziwei.same-artifact-browser-observation/1.0.0",
  status: "isolated_engineering_browser_observation_only_not_admitted",
  createdAt: "2026-09-01T09:09:15.323Z",
  observationDigest: "4b4b334d9ea029006fba89707fa7d856df844c09bb546598854c2d1f91742d28",
  canonicalBytes: 37_336,
  canonicalSha256: "dee58c354d8d97cfa2ffdf9ffed616d6278aea1a6023ffe57dce15bb708d8f4a",
  renderedInputRawBytes: 47_412,
  renderedInputRawSha256: "d448314afa18542495cbbab255090e9f076d3caa3de8e864f45bea878a95c4de",
  sourceGraphDigest: "d3068988b677f78595ae0ef666070ac85d26505b972c757c1089fb5d719cc34d",
  evidenceToolGraphDigest: "4518aee1c861682192f4a8f1a5b777c5a2db0a3986b6e447e559fe2df92f4755",
  outputTreeDigest: "bc8ee283121de68f60290ee08930e41add28e87447b7830212fd49946307a5a6",
  chromeVersion: "151.0.7922.174",
  edgeVersion: "152.0.4191.53",
  scenarioOutcomesPerBrowser: 14,
  passedScenarioOutcomes: 28
});

// Filled only after the canonical artifact is materialized. Keeping these in
// the full loader makes path, raw bytes, semantic digest and private brand one
// inseparable current-machine observation boundary.
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 57_541,
  rawSha256: "da3c5da3b0e587e826235af9401df2b5b48618c7e37f89ede3d5a5deb7ed80c5",
  childDigest: "08d717d62f84dc3146069d387904aa7e8626cca2f12594154b5e5002b2e355e7"
});

export class ZiweiSameArtifactBrowserObservationChildV11Error extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "ZiweiSameArtifactBrowserObservationChildV11Error";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new ZiweiSameArtifactBrowserObservationChildV11Error(code, message, cause);
}

function assertRuntimeIntrinsics() {
  if (Object !== NATIVE_OBJECT || Array !== NATIVE_ARRAY || JSON !== NATIVE_JSON
    || Buffer !== NATIVE_BUFFER || WeakSet !== NATIVE_WEAK_SET
    || String !== NATIVE_STRING || Promise !== NATIVE_PROMISE || Reflect !== NATIVE_REFLECT
    || Object.prototype !== OBJECT_PROTOTYPE || Array.prototype !== ARRAY_PROTOTYPE
    || Object.defineProperty !== OBJECT_DEFINE_PROPERTY || Object.freeze !== OBJECT_FREEZE
    || Object.getPrototypeOf !== OBJECT_GET_PROTOTYPE_OF
    || Object.getOwnPropertyDescriptors !== OBJECT_GET_OWN_PROPERTY_DESCRIPTORS
    || Object.hasOwn !== OBJECT_HAS_OWN || Object.is !== OBJECT_IS
    || Object.isFrozen !== OBJECT_IS_FROZEN || Object.keys !== OBJECT_KEYS
    || Object.values !== OBJECT_VALUES || Array.isArray !== ARRAY_IS_ARRAY
    || Array.prototype.sort !== ARRAY_SORT || Array.prototype.map !== ARRAY_MAP
    || Array.prototype.find !== ARRAY_FIND || Array.prototype.some !== ARRAY_SOME
    || Array.prototype.every !== ARRAY_EVERY || Array.prototype.includes !== ARRAY_INCLUDES
    || Array.prototype.forEach !== ARRAY_FOR_EACH || Array.prototype.join !== ARRAY_JOIN
    || String.prototype.includes !== STRING_INCLUDES
    || String.prototype.startsWith !== STRING_STARTS_WITH
    || String.prototype.endsWith !== STRING_ENDS_WITH
    || String.prototype.indexOf !== STRING_INDEX_OF || String.prototype.slice !== STRING_SLICE
    || String.prototype.split !== STRING_SPLIT || JSON.parse !== JSON_PARSE
    || JSON.stringify !== JSON_STRINGIFY || Buffer.from !== BUFFER_FROM
    || Buffer.byteLength !== BUFFER_BYTE_LENGTH || Buffer.prototype.toString !== BUFFER_TO_STRING
    || Number.isFinite !== NUMBER_IS_FINITE || Number.isSafeInteger !== NUMBER_IS_SAFE_INTEGER
    || Reflect.apply !== REFLECT_APPLY || Reflect.ownKeys !== REFLECT_OWN_KEYS
    || RegExp.prototype.test !== REGEXP_TEST || WeakSet.prototype.add !== WEAK_SET_ADD
    || WeakSet.prototype.delete !== WEAK_SET_DELETE
    || WeakSet.prototype.has !== WEAK_SET_HAS
    || Object.prototype.toJSON !== OBJECT_PROTOTYPE_TO_JSON_AT_IMPORT) {
    fail("INTRINSIC_DRIFT", "Ziwei v1.1 verifier runtime intrinsics changed after module evaluation.");
  }
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function appendOwn(array, value) {
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [array, array.length, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  }]);
}

function captureCanonical(value, state = {
  active: new NATIVE_WEAK_SET(),
  seen: new NATIVE_WEAK_SET(),
  nodes: 0,
  textCodeUnits: 0
}, depth = 0) {
  if (depth > 80) fail("NON_CANONICAL_JSON", "Ziwei v1.1 value exceeds depth limit.");
  state.nodes += 1;
  if (state.nodes > 500_000) fail("NON_CANONICAL_JSON", "Ziwei v1.1 value exceeds node limit.");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])
      || REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) {
      fail("NON_CANONICAL_JSON", "Ziwei v1.1 numbers must be finite and not negative zero.");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCodeUnits += value.length;
    if (state.textCodeUnits > 8_000_000) {
      fail("NON_CANONICAL_JSON", "Ziwei v1.1 text exceeds fixed limit.");
    }
    return value;
  }
  if (typeof value !== "object" || REFLECT_APPLY(UTIL_IS_PROXY, nodeUtilTypes, [value])) {
    fail("NON_CANONICAL_JSON", "Ziwei v1.1 accepts non-Proxy JSON values only.");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) {
    fail("NON_CANONICAL_JSON", "Ziwei v1.1 rejects cycles.");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) {
    fail("NON_CANONICAL_JSON", "Ziwei v1.1 rejects aliases.");
  }
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  const output = ARRAY_IS_ARRAY(value) ? new NATIVE_ARRAY(value.length) : {};
  const expectedPrototype = ARRAY_IS_ARRAY(value) ? ARRAY_PROTOTYPE : OBJECT_PROTOTYPE;
  if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== expectedPrototype) {
    fail("NON_CANONICAL_JSON", "Ziwei v1.1 rejects custom prototypes.");
  }
  if (ARRAY_IS_ARRAY(value)) {
    if (ownKeys.length !== value.length + 1 || !OBJECT_HAS_OWN(descriptors, "length")) {
      fail("NON_CANONICAL_JSON", "Ziwei v1.1 rejects sparse or extended arrays.");
    }
    for (let index = 0; index < value.length; index += 1) {
      const key = String(index);
      const descriptor = descriptors[key];
      if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value")
        || descriptor.enumerable !== true || descriptor.get !== undefined
        || descriptor.set !== undefined) {
        fail("NON_CANONICAL_JSON", "Ziwei v1.1 rejects array accessors or holes.");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        configurable: true,
        enumerable: true,
        value: captureCanonical(descriptor.value, state, depth + 1),
        writable: true
      }]);
    }
  } else {
    const keys = [];
    for (let index = 0; index < ownKeys.length; index += 1) {
      if (typeof ownKeys[index] !== "string") {
        fail("NON_CANONICAL_JSON", "Ziwei v1.1 rejects symbol keys.");
      }
      appendOwn(keys, ownKeys[index]);
    }
    REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value")
        || descriptor.enumerable !== true || descriptor.get !== undefined
        || descriptor.set !== undefined) {
        fail("NON_CANONICAL_JSON", "Ziwei v1.1 rejects accessors and hidden fields.");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        configurable: true,
        enumerable: true,
        value: captureCanonical(descriptor.value, state, depth + 1),
        writable: true
      }]);
    }
  }
  REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  return output;
}

function captureJson(value) {
  assertRuntimeIntrinsics();
  return captureCanonical(value);
}

function canonicalStringifyCaptured(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  }
  if (typeof value === "number") return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value]);
  if (ARRAY_IS_ARRAY(value)) {
    const entries = new NATIVE_ARRAY(value.length);
    for (let index = 0; index < value.length; index += 1) {
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [entries, index, {
        configurable: true,
        enumerable: true,
        value: canonicalStringifyCaptured(value[index]),
        writable: true
      }]);
    }
    return `[${REFLECT_APPLY(ARRAY_JOIN, entries, [","])}]`;
  }
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
  REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
  const entries = new NATIVE_ARRAY(keys.length);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [entries, index, {
      configurable: true,
      enumerable: true,
      value: `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${canonicalStringifyCaptured(value[key])}`,
      writable: true
    }]);
  }
  return `{${REFLECT_APPLY(ARRAY_JOIN, entries, [","])}}`;
}

function canonicalStringify(value) {
  return canonicalStringifyCaptured(captureJson(value));
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && OBJECT_HAS_OWN(descriptor, "value")) deepFreeze(descriptor.value, seen);
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
  REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
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

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function requireAllFalse(value, label) {
  const snapshot = captureJson(value);
  if (ARRAY_IS_ARRAY(snapshot)) fail("AUTHORITY_INVALID", `${label} must be an object.`);
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [snapshot]);
  if (keys.length === 0) fail("AUTHORITY_INVALID", `${label} must not be empty.`);
  for (let index = 0; index < keys.length; index += 1) {
    if (snapshot[keys[index]] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label}.${keys[index]} must remain false.`);
    }
  }
}

function assertBaseObservationFixedBoundary(baseInput) {
  assertRuntimeIntrinsics();
  const base = captureJson(baseInput);
  try {
    verifyZiweiSameArtifactCandidateObject(base);
  } catch (error) {
    fail("BASE_OBSERVATION_INVALID", "Embedded current base observation fails the v1 object verifier.", error);
  }
  const canonical = canonicalStringifyBaseObservation(base);
  const chrome = REFLECT_APPLY(ARRAY_FIND, base.runtimeObservation.browserProbes, [
    (entry) => entry.projectName === "chrome"
  ]);
  const edge = REFLECT_APPLY(ARRAY_FIND, base.runtimeObservation.browserProbes, [
    (entry) => entry.projectName === "msedge"
  ]);
  if (base.schemaVersion !== CURRENT_BASE.schemaVersion
    || base.childId !== CURRENT_BASE.childId || base.status !== CURRENT_BASE.status
    || base.createdAt !== CURRENT_BASE.createdAt
    || base.observationDigest !== CURRENT_BASE.observationDigest
    || computeBaseObservationDigest(base) !== CURRENT_BASE.observationDigest
    || REFLECT_APPLY(BUFFER_BYTE_LENGTH, Buffer, [canonical, "utf8"])
      !== CURRENT_BASE.canonicalBytes
    || sha256Text(canonical) !== CURRENT_BASE.canonicalSha256
    || base.buildSourceSnapshot?.graphDigest !== CURRENT_BASE.sourceGraphDigest
    || base.evidenceToolingSnapshot?.graphDigest !== CURRENT_BASE.evidenceToolGraphDigest
    || base.runtimeObservation?.outputTreeBefore?.treeDigest !== CURRENT_BASE.outputTreeDigest
    || base.runtimeObservation?.outputTreeAfter?.treeDigest !== CURRENT_BASE.outputTreeDigest
    || chrome?.versionBefore !== CURRENT_BASE.chromeVersion
    || chrome?.versionAfter !== CURRENT_BASE.chromeVersion
    || edge?.versionBefore !== CURRENT_BASE.edgeVersion
    || edge?.versionAfter !== CURRENT_BASE.edgeVersion
    || base.runtimeObservation?.playwrightSummary?.passedOutcomeCount
      !== CURRENT_BASE.passedScenarioOutcomes
    || base.runtimeObservation?.playwrightSummary?.failedOutcomeCount !== 0
    || base.runtimeObservation?.playwrightSummary?.retriedOutcomeCount !== 0
    || base.runtimeObservation?.dataHandling?.syntheticInputsOnly !== true
    || base.runtimeObservation?.dataHandling?.actualPersonDataEntered !== false
    || base.runtimeObservation?.dataHandling?.rawBirthInputIncluded !== false
    || base.runtimeObservation?.dataHandling?.derivedChartDigestIncluded !== false
    || base.runtimeObservation?.dataHandling?.feedbackNarrativeIncluded !== false
    || base.runtimeObservation?.dataHandling?.backupBodyOrDigestIncluded !== false) {
    fail("BASE_OBSERVATION_IDENTITY_DRIFT", "Embedded base observation is not the exact current rendered candidate.");
  }
  requireAllFalse(base.authorityBoundary, "currentBaseObservation.authorityBoundary");
  return deepFreeze(base);
}

export function verifyCurrentZiweiSameArtifactBaseObservation(
  workspaceRoot,
  baseInput
) {
  const base = assertBaseObservationFixedBoundary(baseInput);
  let rebuilt;
  try {
    rebuilt = buildCurrentZiweiSameArtifactCandidate(
      workspaceRoot,
      base.runtimeObservation,
      base.createdAt
    );
  } catch (error) {
    fail("CURRENT_BASE_REBUILD_FAILED", "Current v1 runtime reconstruction failed closed.", error);
  }
  if (canonicalStringifyBaseObservation(base)
    !== canonicalStringifyBaseObservation(rebuilt)) {
    fail("CURRENT_GRAPH_DRIFT", "Embedded base observation is not canonical-exact with the current runtime reconstruction.");
  }
  return base;
}

function assertExpertReceiptBoundary(receipt) {
  if (!isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(receipt)) {
    fail("EXPERT_DRIFT_PRIVATE_BRAND_REQUIRED", "Current expert-drift receipt private brand is required.");
  }
  if (receipt.candidateId !== EXPERT_DRIFT_RECEIPT.candidateId
    || receipt.receiptDigest !== EXPERT_DRIFT_RECEIPT.receiptDigest
    || receipt.activeAdmissionEffect !== "none"
    || receipt.manifestDrift?.historicalManifestMechanicallyCurrent !== false
    || receipt.manifestDrift?.manifestRebindOrResignPerformed !== false
    || receipt.manifestDrift?.currentCandidateManifestPersisted !== false
    || receipt.browserObservationDrift?.historicalChildMechanicallyCurrent !== false
    || receipt.browserObservationDrift?.historicalBrowserEvidenceMayBePromotedAsCurrent !== false
    || receipt.scope?.expertPromotionBoundary?.verifiedExpertReceiptCount !== 0
    || receipt.authorityBoundary?.expertClaimsAuthorized !== false
    || receipt.authorityBoundary?.publicReleaseAuthorized !== false) {
    fail("EXPERT_DRIFT_RECEIPT_BOUNDARY", "Expert-drift receipt no longer carries the exact all-red current boundary.");
  }
}

function assertHistoricalV1Snapshot(snapshot, parsedInput) {
  const parsed = captureJson(parsedInput);
  if (snapshot.path !== HISTORICAL_V1.path || snapshot.rawBytes !== HISTORICAL_V1.rawBytes
    || snapshot.rawSha256 !== HISTORICAL_V1.rawSha256
    || parsed.schemaVersion !== HISTORICAL_V1.schemaVersion
    || parsed.childId !== HISTORICAL_V1.childId
    || parsed.observationDigest !== HISTORICAL_V1.observationDigest
    || computeBaseObservationDigest(parsed) !== HISTORICAL_V1.observationDigest) {
    fail("HISTORICAL_V1_IDENTITY_DRIFT", "Historical Ziwei v1 raw or self identity drifted or was resealed.");
  }
  return deepFreeze(parsed);
}

function buildProjection(baseInput) {
  const base = assertBaseObservationFixedBoundary(baseInput);
  const unsigned = {
    schemaVersion: ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_SCHEMA_VERSION,
    recordType: RECORD_TYPE,
    childId: ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_ID,
    status: STATUS,
    createdAt: CURRENT_BASE.createdAt,
    activeAdmissionEffect: "none",
    systemIdentity: {
      systemId: "ziwei",
      productSystemId: "ziwei-doushu",
      productSurface: "ziwei-isolated-workspace-draft@0.1.0",
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      projectDefaultReleaseGovernanceContext: {
        releaseIdentity: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      },
      projectDefaultReleaseGovernanceInherited: false
    },
    lineage: {
      expertDriftReceipt: {
        ...EXPERT_DRIFT_RECEIPT,
        privateBrandConsumed: true,
        currentAtVerification: true
      },
      historicalBrowserObservationV1: {
        ...HISTORICAL_V1,
        heldHandleRawIdentityVerified: true,
        selfDigestVerified: true,
        staleLoaderInvoked: false,
        current: false,
        preservedUnmodified: true,
        rebindOrResignPerformed: false,
        resealedAsCurrent: false
      },
      currentBaseObservation: {
        schemaVersion: CURRENT_BASE.schemaVersion,
        childId: CURRENT_BASE.childId,
        observationDigest: CURRENT_BASE.observationDigest,
        canonicalBytes: CURRENT_BASE.canonicalBytes,
        canonicalSha256: CURRENT_BASE.canonicalSha256,
        renderedInputRawBytes: CURRENT_BASE.renderedInputRawBytes,
        renderedInputRawSha256: CURRENT_BASE.renderedInputRawSha256,
        renderedInputPathPersisted: false,
        embeddedInThisChild: true,
        v1ObjectVerifierApplied: true,
        currentRuntimeRebuiltCanonicalExact: true
      }
    },
    currentBaseObservation: base,
    browserEvidenceBoundary: {
      sourceGraphDigest: CURRENT_BASE.sourceGraphDigest,
      evidenceToolGraphDigest: CURRENT_BASE.evidenceToolGraphDigest,
      outputTreeDigest: CURRENT_BASE.outputTreeDigest,
      chromeVersion: CURRENT_BASE.chromeVersion,
      edgeVersion: CURRENT_BASE.edgeVersion,
      chromeScenarioOutcomes: CURRENT_BASE.scenarioOutcomesPerBrowser,
      edgeScenarioOutcomes: CURRENT_BASE.scenarioOutcomesPerBrowser,
      totalPassedScenarioOutcomes: CURRENT_BASE.passedScenarioOutcomes,
      failedScenarioOutcomes: 0,
      retriedScenarioOutcomes: 0,
      exactSingleBuildExecuted: true,
      sameOutputTreeServedToBothBrowsers: true,
      currentSourceGraphCanonicalExact: true,
      isolatedLoopbackBrowserRuntimeObservationEstablished: true,
      productionBrowserRuntimeEvidenceEstablished: false,
      publicHostValidated: false,
      pwaOrServiceWorkerValidated: false,
      fixedPhysicalDeviceValidated: false
    },
    manifestBoundary: {
      historicalManifest: HISTORICAL_MANIFEST,
      historicalManifestMechanicallyCurrent: false,
      currentCandidateManifestPersisted: false,
      currentFullEngineeringManifestEstablished: false,
      manifestRebindOrResignPerformed: false,
      ownerPromotionDecisionReceipt: null
    },
    expertPromotionBoundary: {
      expertDriftReceiptPrivateBrandConsumed: true,
      localReviewerIdsEstablishRealIdentityQualificationOrIndependence: false,
      externalVerifiedExpertReceiptSchemaIntegrated: false,
      externalVerifiedExpertReceiptsVerified: 0,
      externalVerifiedExpertReceiptsRequired: 2,
      expertClaimsAuthorized: false
    },
    dataHandlingBoundary: {
      syntheticInputsOnly: true,
      actualPersonDataEntered: false,
      zeroExternalPersonalData: true,
      rawBirthInputIncluded: false,
      derivedChartDigestIncluded: false,
      feedbackNarrativeIncluded: false,
      backupBodyOrDigestIncluded: false,
      revisionOrStudyIdentifiersIncluded: false,
      screenshotTraceVideoOrDownloadIncluded: false,
      rawPlaywrightReportIncluded: false,
      safeToLog: false,
      safeToPublish: false
    },
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 27,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      externalVerifiedExpertReceiptsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseEvidenceComplete: false
    },
    formalReceiptCounts: {
      releaseEvidenceReceipts: 0,
      productionBrowserReceipts: 0,
      deploymentReceipts: 0,
      rollbackReceipts: 0,
      expertReviewReceipts: 0,
      rightsLegalDecisionReceipts: 0
    },
    authorityBoundary: {
      formalAdmissionAuthorized: false,
      domainAuthorityAuthorized: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      expertIdentityQualificationIndependenceEstablished: false,
      rightsLegalConclusionEstablished: false,
      highRiskClaimsAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false
    },
    observationBoundary: {
      sameHeldBufferHashAndParsePerJsonArtifact: true,
      currentBaseCanonicalRebuiltFromRuntime: true,
      repositoryCrossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      repositoryIntervalMutationExcluded: false,
      repositoryAbaExcluded: false,
      digestIsDigitalSignature: false,
      signerIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      nodeRuntimeIdentityEstablished: false,
      hiddenPreloadExcluded: false,
      preImportIntrinsicIntegrityEstablished: false
    },
    doesNotEstablish: [
      "current_or_formal_ziwei_engineering_manifest",
      "domain_content_or_expert_truth",
      "real_expert_identity_qualification_independence_consent_or_opinion",
      "source_binding_freeze_work_edition_carrier_rights_or_redistribution_authorization",
      "semantic_or_general_callgraph_high_risk_coverage",
      "repository_cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "trusted_runtime_launcher_hidden_preload_exclusion_or_digital_signature",
      "pwa_service_worker_public_host_fixed_device_or_production_browser_evidence",
      "release_evidence_deployment_rollback_release_readiness_or_public_release_authorization"
    ]
  };
  return deepFreeze({
    ...unsigned,
    childDigest: computeZiweiSameArtifactBrowserObservationChildV11Digest(unsigned)
  });
}

export function computeZiweiSameArtifactBrowserObservationChildV11Digest(value) {
  assertRuntimeIntrinsics();
  return sha256Text(`${DIGEST_DOMAIN}\0${canonicalStringify(withoutOwnField(value, "childDigest"))}`);
}

export function serializeZiweiSameArtifactBrowserObservationChildV11(value) {
  assertZiweiSameArtifactBrowserObservationChildV11Boundary(value);
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [captureJson(value), null, 2])}\n`;
}

export function assertZiweiSameArtifactBrowserObservationChildV11Boundary(valueInput) {
  assertRuntimeIntrinsics();
  const value = captureJson(valueInput);
  if (value.schemaVersion !== ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_SCHEMA_VERSION
    || value.recordType !== RECORD_TYPE
    || value.childId !== ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_ID
    || value.status !== STATUS || value.createdAt !== CURRENT_BASE.createdAt
    || value.activeAdmissionEffect !== "none"
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [value.childDigest ?? ""])
    || computeZiweiSameArtifactBrowserObservationChildV11Digest(value) !== value.childDigest) {
    fail("CHILD_IDENTITY_INVALID", "Ziwei v1.1 child identity or digest is invalid.");
  }
  requireAllFalse(value.authorityBoundary, "authorityBoundary");
  if (value.observationBoundary?.repositoryCrossFileAtomicSnapshot !== false
    || value.observationBoundary?.mutationEpochAvailable !== false
    || value.observationBoundary?.mutationEpochReceipt !== null
    || value.observationBoundary?.repositoryIntervalMutationExcluded !== false
    || value.observationBoundary?.repositoryAbaExcluded !== false
    || value.observationBoundary?.digestIsDigitalSignature !== false
    || value.manifestBoundary?.historicalManifestMechanicallyCurrent !== false
    || value.manifestBoundary?.manifestRebindOrResignPerformed !== false
    || value.lineage?.historicalBrowserObservationV1?.current !== false
    || value.lineage?.historicalBrowserObservationV1?.staleLoaderInvoked !== false
    || value.lineage?.historicalBrowserObservationV1?.resealedAsCurrent !== false
    || value.dataHandlingBoundary?.zeroExternalPersonalData !== true
    || value.browserEvidenceBoundary?.totalPassedScenarioOutcomes !== 28
    || value.browserEvidenceBoundary?.productionBrowserRuntimeEvidenceEstablished !== false) {
    fail("BOUNDARY_PROMOTION_FORBIDDEN", "Ziwei v1.1 child crosses a manifest, runtime, authority, epoch or privacy boundary.");
  }
  const expected = buildProjection(value.currentBaseObservation);
  if (!exactJson(value, expected)) {
    fail("CHILD_PROJECTION_MISMATCH", "Ziwei v1.1 child does not match its exact append-only projection.");
  }
  return deepFreeze(value);
}

async function collectCurrentInputs(workspaceRoot, baseInput) {
  assertRuntimeIntrinsics();
  const expertReceipt =
    await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(workspaceRoot);
  assertExpertReceiptBoundary(expertReceipt);
  const historicalSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    HISTORICAL_V1.path
  );
  const historicalParsed = parseBaziDttStrictJsonArtifact(historicalSnapshot);
  assertHistoricalV1Snapshot(historicalSnapshot, historicalParsed);
  const base = verifyCurrentZiweiSameArtifactBaseObservation(workspaceRoot, baseInput);
  return { base, expertReceipt };
}

export async function buildZiweiSameArtifactBrowserObservationChildV11(
  workspaceRoot,
  baseInput
) {
  const { base } = await collectCurrentInputs(workspaceRoot, baseInput);
  return buildProjection(base);
}

function assertPersistedIdentity(snapshot, value) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [EXPECTED_PERSISTED.rawSha256])
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [EXPECTED_PERSISTED.childDigest])) {
    fail("PERSISTED_IDENTITY_UNSET", "Ziwei v1.1 persisted identity is not frozen.");
  }
  if (snapshot.path !== ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_RELATIVE_PATH
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
    || value.childDigest !== EXPECTED_PERSISTED.childDigest) {
    fail("PERSISTED_IDENTITY_DRIFT", "Ziwei v1.1 raw or semantic identity drifted.");
  }
}

export async function loadZiweiSameArtifactBrowserObservationChildV11(
  workspaceRoot = process.cwd()
) {
  assertRuntimeIntrinsics();
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_RELATIVE_PATH
  );
  const parsed = parseBaziDttStrictJsonArtifact(snapshot);
  assertPersistedIdentity(snapshot, parsed);
  const captured = assertZiweiSameArtifactBrowserObservationChildV11Boundary(parsed);
  if (REFLECT_APPLY(BUFFER_TO_STRING, snapshot.bytes, ["utf8"])
    !== serializeZiweiSameArtifactBrowserObservationChildV11(captured)) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "Ziwei v1.1 is not the unique canonical LF materialization.");
  }
  const expected = await buildZiweiSameArtifactBrowserObservationChildV11(
    workspaceRoot,
    captured.currentBaseObservation
  );
  if (!exactJson(captured, expected)) {
    fail("CURRENT_CHILD_MISMATCH", "Ziwei v1.1 no longer matches the current branded upstream and source graph.");
  }
  const verified = deepFreeze(captureJson(captured));
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_CHILDREN, [verified]);
  return verified;
}

export function isVerifiedZiweiSameArtifactBrowserObservationChildV11(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_CHILDREN, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getZiweiSameArtifactBrowserObservationChildV11Summary(value) {
  if (!isVerifiedZiweiSameArtifactBrowserObservationChildV11(value)) {
    fail("PRIVATE_CHILD_BRAND_REQUIRED", "Ziwei v1.1 full-loader private brand is required.");
  }
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    activeAdmissionEffect: value.activeAdmissionEffect,
    baseObservationDigest: value.currentBaseObservation.observationDigest,
    outputTreeDigest: value.browserEvidenceBoundary.outputTreeDigest,
    chromeVersion: value.browserEvidenceBoundary.chromeVersion,
    edgeVersion: value.browserEvidenceBoundary.edgeVersion,
    totalPassedScenarioOutcomes: value.browserEvidenceBoundary.totalPassedScenarioOutcomes,
    expertDriftReceiptPrivateBrandConsumed:
      value.expertPromotionBoundary.expertDriftReceiptPrivateBrandConsumed,
    historicalV1Current: value.lineage.historicalBrowserObservationV1.current,
    historicalManifestMechanicallyCurrent:
      value.manifestBoundary.historicalManifestMechanicallyCurrent,
    admissionGatesSatisfied: value.gateSummary.admissionGatesSatisfied,
    bindingFrozenVerified: value.gateSummary.bindingFrozenVerified,
    independentExpertReviewsVerified:
      value.gateSummary.independentExpertReviewsVerified,
    productionBrowserRuntimeEvidenceEstablished:
      value.browserEvidenceBoundary.productionBrowserRuntimeEvidenceEstablished,
    releaseReady: value.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: value.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: value.authorityBoundary.publicReleaseAuthorized,
    expertClaimsAuthorized: value.authorityBoundary.expertClaimsAuthorized
  });
}

export const ziweiSameArtifactBrowserObservationChildV11TestOnly = OBJECT_FREEZE({
  RECORD_TYPE,
  STATUS,
  DIGEST_DOMAIN,
  EXPERT_DRIFT_RECEIPT,
  HISTORICAL_V1,
  HISTORICAL_MANIFEST,
  CURRENT_BASE,
  EXPECTED_PERSISTED,
  assertRuntimeIntrinsics,
  assertBaseObservationFixedBoundary,
  assertHistoricalV1Snapshot,
  buildProjection,
  captureJson,
  canonicalStringify,
  deepFreeze,
  exactJson
});
