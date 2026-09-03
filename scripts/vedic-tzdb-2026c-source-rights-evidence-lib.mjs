import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  readVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";

export const VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH =
  "content/system-admission/vedic-tzdb-2026c-source-rights-evidence.v1.json";

const DIGEST_DOMAIN = "hakimi.vedic.tzdb-2026c-source-rights-evidence.v1\0";
const EVIDENCE_ID =
  "hakimi.vedic.source-rights/iana-tzdb-2026c-moment-timezone-0.6.3/1.0.0";
const SUCCESSOR_PATH =
  "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.1.0.json";
const SUCCESSOR_ID =
  "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.1.0";
const CREATED_AT = "2026-08-31T07:01:42.5368561Z";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_MAP = Array.prototype.map;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_SOME = Array.prototype.some;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_ENTRIES = Object.entries;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const OBJECT_VALUES = Object.values;
const ARRAY_PROTOTYPE = Array.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const JSON_STRINGIFY = JSON.stringify;
const STRING_INCLUDES = String.prototype.includes;
const STRING_INDEX_OF = String.prototype.indexOf;
const STRING_SLICE = String.prototype.slice;
const STRING_ENDS_WITH = String.prototype.endsWith;
const REGEXP_TEST = RegExp.prototype.test;
const NATIVE_STRING = String;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const IS_PROXY = utilTypes.isProxy;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const BASIS_ARTIFACT = OBJECT_FREEZE({
  role: "vedic_specific_non_authoritative_source_rights_candidate_narrative",
  path: "docs/阶段C-E-吠陀IANA-tzdb-2026c来源权利候选-2026-08-31.md",
  rawBytes: 5_071,
  rawSha256: "58f04a6e6c87ff068ea0462bd5641d2ae4f3781783f905804de438cfd6413810"
});

const FORMAL_PREDECESSOR = OBJECT_FREEZE({
  role: "formal_current_vedic_source_binding_and_three_layer_rights_requirements",
  path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
  rawBytes: 85_752,
  rawSha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9",
  semanticDigestField: "ledgerDigest",
  semanticDigest: "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e",
  artifactIdField: "ledgerId",
  artifactId: "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.0.0"
});

const NON_CONSUMING_CONTEXTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "vedic_productization_requirements_parent_context_only",
    path: "content/system-admission/vedic-independent-productization-requirements.v1.json",
    rawBytes: 25_578,
    rawSha256: "c9f0fbb3b25c3ad582dc4c3f5534e7e27cb44e47721dbf806b8085cefb6b26f8",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb",
    artifactIdField: "ledgerId",
    artifactId: "hakimi.vedic.independent-productization-requirements/1.0.0"
  }),
  OBJECT_FREEZE({
    role: "preserved_vedic_version_observation_v1_1_context_only",
    path: "content/system-admission/vedic-independent-productization-version-aware-observation-candidate.v1.1.0.json",
    rawBytes: 14_110,
    rawSha256: "d87a9340c4afd280e1aeb004f4322d2088868b79f31b7c2fd3191e8d14e1343a",
    semanticDigestField: "candidateDigest",
    semanticDigest: "3eebcbcd60dfd1f4a96671ec2ab18bd6cceb20d14806acd44a00603e4848a8d1",
    artifactIdField: "candidateId",
    artifactId: "hakimi.vedic.independent-productization.version-aware-observation-candidate/1.1.0"
  }),
  OBJECT_FREEZE({
    role: "current_vedic_version_observation_child_v1_2_context_only",
    path: "content/system-admission/vedic-independent-productization-version-aware-observation-child.v1.2.0.json",
    rawBytes: 16_272,
    rawSha256: "78b4f27c24182a73ab9da86065829990e053834f49785d394878ca7ad79e2845",
    semanticDigestField: "candidateDigest",
    semanticDigest: "462498245b533db031ed25a1a8808e4e77dc2ea92f17154013a04d487ebdb171",
    artifactIdField: "candidateId",
    artifactId: "hakimi.vedic.independent-productization.version-aware-observation-child/1.2.0"
  }),
  OBJECT_FREEZE({
    role: "four_system_current_observation_registry_v2_context_only",
    path: "content/system-admission/four-system-current-observation-registry.v2.json",
    rawBytes: 22_261,
    rawSha256: "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39",
    semanticDigestField: "registryDigest",
    semanticDigest: "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738",
    artifactIdField: "registryId",
    artifactId: "hakimi.system-admission/four-system-current-observation/2.0.0"
  }),
  OBJECT_FREEZE({
    role: "legacy_four_system_admission_registry_v1_context_only",
    path: "content/system-admission/four-system-admission.v1.json",
    rawBytes: 19_093,
    rawSha256: "a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959",
    semanticDigestField: "registryDigest",
    semanticDigest: "a992d58ce2c98b5282ffafafb38e05c20c1d294e99b150674fdf01684f86097a",
    artifactIdField: "registryId",
    artifactId: "hakimi.system-admission/four-system/1.0.0"
  })
]);

const LOCAL_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({ role: "workspace_dependency_lock", path: "package-lock.json", rawBytes: 175_812, rawSha256: "40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d" }),
  OBJECT_FREEZE({ role: "shared_tzdb_core_package_contract", path: "packages/tzdb-core/package.json", rawBytes: 241, rawSha256: "fb12b19a6f6c971185bd2f2c9226fe50ad816595e3acec4f0a0b373593136236" }),
  OBJECT_FREEZE({ role: "shared_tzdb_core_content_addressed_registry", path: "packages/tzdb-core/src/index.ts", rawBytes: 7_819, rawSha256: "7c144f6446b3fdba55f7b7b947fe242348ba5010025af36868c39436bfea638e" }),
  OBJECT_FREEZE({ role: "shared_tzdb_core_offline_artifact_verifier", path: "packages/tzdb-core/scripts/verify-artifact.mjs", rawBytes: 9_473, rawSha256: "a0b643073f5ca99e6668c476c4382b9bdadf93d19422fe7f8558e98f9bb96164" }),
  OBJECT_FREEZE({ role: "project_third_party_notice_inventory", path: "THIRD_PARTY_NOTICES.md", rawBytes: 7_030, rawSha256: "d05d5d8a944cde7a739f3a64a1077fbedf706185a20e3e15c7ad423d7f0e8248" }),
  OBJECT_FREEZE({ role: "installed_moment_timezone_packed_carrier", path: "node_modules/moment-timezone/data/packed/latest.json", rawBytes: 715_527, rawSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" }),
  OBJECT_FREEZE({ role: "installed_moment_timezone_meta_carrier", path: "node_modules/moment-timezone/data/meta/latest.json", rawBytes: 97_948, rawSha256: "89fdbb1808eb6b9a5d40ff63b694a3952bcf294384659b88c05f736c50d86ab5" }),
  OBJECT_FREEZE({ role: "installed_moment_timezone_package_manifest", path: "node_modules/moment-timezone/package.json", rawBytes: 1_076, rawSha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b" }),
  OBJECT_FREEZE({ role: "installed_moment_timezone_license_carrier", path: "node_modules/moment-timezone/LICENSE", rawBytes: 1_097, rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" })
]);

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 20_505,
  rawSha256: "baa55f5e21f3a91075048c85e5b2a880f0d0e6c62e611a881e7d636b10db58fa"
});

const OFFICIAL_IANA_OBSERVATIONS = OBJECT_FREEZE({
  releasePage: OBJECT_FREEZE({
    requestedUrl: "https://www.iana.org/time-zones/releases/2026c",
    finalUrl: "https://www.iana.org/time-zones/releases/2026c",
    httpStatus: 200,
    contentType: "text/html; charset=utf-8",
    rawBytes: 8_924,
    rawSha256: "ee7b7dd9dd8a4cb9e37865ff699ad75032755e027668b028debd8f6e456529d0",
    firstRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:38.2753535+00:00", completedAt: "2026-08-31T07:01:39.4342088+00:00" }),
    secondRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:39.4625436+00:00", completedAt: "2026-08-31T07:01:39.5852535+00:00" }),
    readCount: 2,
    twoReadsRawIdentityEqual: true,
    releaseVersionMarker: "2026c",
    releaseDateMarker: "2026-07-08",
    markerObservationMode: "operator_recorded_from_this_vedic_window_body",
    lastModifiedDisposition: "request_time_dynamic_not_used_as_release_identity"
  }),
  dataArchive: OBJECT_FREEZE({
    requestedUrl: "https://data.iana.org/time-zones/releases/tzdata2026c.tar.gz",
    finalUrl: "https://data.iana.org/time-zones/releases/tzdata2026c.tar.gz",
    httpStatus: 200,
    rawBytes: 475_694,
    rawSha256: "e4a178a4477f3d0ea77cc31828ff72aa38feff8d61aa13e7e99e142e9d902be4",
    rawSha512: "e0b4b7044b66fbc27bc21d13d18063abcdf78ab58d5ba5fd64bd1a88d86e9d495f45add4d8e65bb6c40249f9c94ca29b72c8ebba8d0e4c468f2965ac77932ef0",
    etag: "\"7422e-6561d50ba2bce\"",
    lastModified: "Wed, 08 Jul 2026 18:02:48 GMT",
    firstRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:39.5878857+00:00", completedAt: "2026-08-31T07:01:40.5255543+00:00" }),
    secondRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:40.5286458+00:00", completedAt: "2026-08-31T07:01:40.7303118+00:00" }),
    readCount: 2,
    twoReadsRawIdentityEqual: true
  }),
  detachedSignature: OBJECT_FREEZE({
    requestedUrl: "https://data.iana.org/time-zones/releases/tzdata2026c.tar.gz.asc",
    finalUrl: "https://data.iana.org/time-zones/releases/tzdata2026c.tar.gz.asc",
    httpStatus: 200,
    rawBytes: 833,
    rawSha256: "26cd02e034eed682aa911d224bca3247ff15914df317e3bb0b1a01dc557b46fe",
    firstRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:40.7317018+00:00", completedAt: "2026-08-31T07:01:41.4701177+00:00" }),
    secondRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:41.4708115+00:00", completedAt: "2026-08-31T07:01:41.6003100+00:00" }),
    readCount: 2,
    twoReadsRawIdentityEqual: true,
    cryptographicallyVerified: false,
    signingKeyTrustEstablished: false,
    publisherAuthenticityEstablished: false
  }),
  versionRepresentation: OBJECT_FREEZE({
    requestedUrl: "https://data.iana.org/time-zones/tzdb/version?version=2026c",
    finalUrl: "https://data.iana.org/time-zones/tzdb/version?version=2026c",
    httpStatus: 200,
    rawBytes: 6,
    rawSha256: "b8b066b540bc2870e6f1f3cd76f1b0e6c3629b2e3a12f14ba9e47085a1abb781",
    firstRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:41.6008171+00:00", completedAt: "2026-08-31T07:01:42.1651076+00:00" }),
    secondRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:42.1663263+00:00", completedAt: "2026-08-31T07:01:42.2865599+00:00" }),
    readCount: 2,
    twoReadsRawIdentityEqual: true,
    exactQuote: OBJECT_FREEZE({ text: "2026c", utf8Bytes: 5, sha256: "19fd9387dff1a60f2a3947d61232c982b3a52feb645b130e708a879936152da5", locator: "line_1_without_trailing_lf" })
  }),
  licenseRepresentation: OBJECT_FREEZE({
    requestedUrl: "https://data.iana.org/time-zones/tzdb-2026c/LICENSE",
    finalUrl: "https://data.iana.org/time-zones/tzdb-2026c/LICENSE",
    httpStatus: 200,
    rawBytes: 252,
    rawSha256: "0613408568889f5739e5ae252b722a2659c02002839ad970a63dc5e9174b27cf",
    firstRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:42.2870238+00:00", completedAt: "2026-08-31T07:01:42.4093706+00:00" }),
    secondRead: OBJECT_FREEZE({ startedAt: "2026-08-31T07:01:42.4097721+00:00", completedAt: "2026-08-31T07:01:42.5368561+00:00" }),
    readCount: 2,
    twoReadsRawIdentityEqual: true,
    exactQuote: OBJECT_FREEZE({
      text: "Unless specified below, all files in the tz code and data (including\nthis LICENSE file) are in the public domain.",
      utf8Bytes: 113,
      sha256: "72c3b37777104fdba9c140c56d93cd282266f283e848399f0d8e3cef9daaf0ff",
      locator: "LICENSE_lines_1_2_exact_lf"
    }),
    licenseTextObserved: true,
    licenseTextAutomaticallyTreatedAsLegalConclusion: false
  })
});

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "complete_iana_time_zone_and_tzdb_identity_subject",
  "dst_gap_overlap_resolution_policy_or_subject",
  "complete_rights_license_and_redistribution_review_subject",
  "source_body_binding_or_frozen_binding",
  "iana_archive_to_moment_timezone_transformation_provenance_or_byte_equivalence",
  "npm_publisher_tarball_byte_equality_or_authenticity",
  "detached_signature_cryptographic_verification_signing_key_trust_or_publisher_authenticity",
  "work_version_carrier_rights_establishment_legal_conclusion_or_redistribution_authorization",
  "vedic_content_truth_traditional_authority_or_expert_truth",
  "western_evidence_authority_brand_or_controlled_reproduction_inheritance",
  "formal_parent_version_registry_manifest_or_owner_admission",
  "browser_runtime_pwa_service_worker_or_cross_browser_validation",
  "release_readiness_public_deployment_or_public_release_authorization",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class VedicTzdb2026cSourceRightsEvidenceError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicTzdb2026cSourceRightsEvidenceError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new VedicTzdb2026cSourceRightsEvidenceError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function passiveCapture(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "Vedic tzdb evidence 超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 100_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "Vedic tzdb evidence 超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) fail("INPUT_VALUE_INVALID", "Vedic tzdb evidence 含无效数值。");
    return value;
  }
  if (typeof value === "string") {
    state.text += value.length;
    if (state.text > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "Vedic tzdb evidence 超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "Vedic tzdb evidence 只接受 JSON 数据值。");
  if (IS_PROXY(value)) fail("INPUT_PROXY_FORBIDDEN", "Vedic tzdb evidence 不接受 Proxy。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) fail("INPUT_CYCLE_FORBIDDEN", "Vedic tzdb evidence 不接受循环引用。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) fail("INPUT_ALIAS_FORBIDDEN", "Vedic tzdb evidence 不接受对象别名。");
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = ARRAY_IS_ARRAY(value);
      prototype = OBJECT_GET_PROTOTYPE_OF(value);
      descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "Vedic tzdb evidence 对象不能被安全捕获。", cause);
    }
    const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
    if (REFLECT_APPLY(ARRAY_SOME, descriptorKeys, [(key) => typeof key === "symbol"])) {
      fail("INPUT_SYMBOL_FORBIDDEN", "Vedic tzdb evidence 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== ARRAY_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "Vedic tzdb evidence 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set || !NUMBER_IS_SAFE_INTEGER(length) || length < 0 || length > 100_000) {
        fail("INPUT_ARRAY_INVALID", "Vedic tzdb evidence 数组长度无效。");
      }
      const allowed = new NATIVE_SET();
      REFLECT_APPLY(SET_ADD, allowed, ["length"]);
      for (let index = 0; index < length; index += 1) REFLECT_APPLY(SET_ADD, allowed, [NATIVE_STRING(index)]);
      for (let index = 0; index < descriptorKeys.length; index += 1) {
        if (!REFLECT_APPLY(SET_HAS, allowed, [descriptorKeys[index]])) fail("INPUT_ARRAY_INVALID", "Vedic tzdb evidence 数组含额外属性。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[NATIVE_STRING(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "Vedic tzdb evidence 不接受稀疏数组或访问器元素。");
        }
        REFLECT_APPLY(ARRAY_PUSH, output, [passiveCapture(descriptor.value, state, depth + 1)]);
      }
      return output;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "Vedic tzdb evidence 只接受普通对象。");
    const output = {};
    for (let index = 0; index < descriptorKeys.length; index += 1) {
      const key = descriptorKeys[index];
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "Vedic tzdb evidence 不接受访问器或不可枚举字段。");
      }
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: passiveCapture(descriptor.value, state, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function capturePassiveJson(value) {
  return passiveCapture(value, {
    active: new NATIVE_WEAK_SET(),
    seen: new NATIVE_WEAK_SET(),
    nodes: 0,
    text: 0
  }, 0);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_VALUES(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value));
  for (let index = 0; index < descriptors.length; index += 1) {
    if ("value" in descriptors[index]) deepFreeze(descriptors[index].value, seen);
  }
  return OBJECT_FREEZE(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && NUMBER_IS_FINITE(value) && !OBJECT_IS(value, -0)) return value;
  if (ARRAY_IS_ARRAY(value)) {
    const output = [];
    OBJECT_DEFINE_PROPERTY(output, "toJSON", { value: null });
    for (let index = 0; index < value.length; index += 1) REFLECT_APPLY(ARRAY_PUSH, output, [canonicalValue(value[index])]);
    return output;
  }
  if (value && typeof value === "object" && OBJECT_GET_PROTOTYPE_OF(value) === OBJECT_PROTOTYPE) {
    const output = OBJECT_CREATE(null);
    const keys = OBJECT_KEYS(value);
    REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: canonicalValue(value[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  fail("NON_CANONICAL_JSON", "Vedic tzdb evidence 只接受有限规范 JSON 值。");
}

function prettySafeValue(value) {
  const snapshot = capturePassiveJson(value);
  function materialize(input) {
    if (input === null || typeof input !== "object") return input;
    if (ARRAY_IS_ARRAY(input)) {
      const output = [];
      OBJECT_DEFINE_PROPERTY(output, "toJSON", { value: null });
      for (let index = 0; index < input.length; index += 1) REFLECT_APPLY(ARRAY_PUSH, output, [materialize(input[index])]);
      return output;
    }
    const output = OBJECT_CREATE(null);
    const keys = OBJECT_KEYS(input);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      OBJECT_DEFINE_PROPERTY(output, key, { value: materialize(input[key]), enumerable: true, configurable: true, writable: true });
    }
    return output;
  }
  return materialize(snapshot);
}

export function canonicalStringifyVedicTzdb2026cSourceRightsEvidence(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJson(value)));
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeVedicTzdb2026cSourceRightsEvidenceDigest(ledger) {
  const snapshot = capturePassiveJson(ledger);
  const unsigned = {};
  const keys = OBJECT_KEYS(snapshot);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === "evidenceDigest") continue;
    OBJECT_DEFINE_PROPERTY(unsigned, key, { value: snapshot[key], enumerable: true, configurable: true, writable: true });
  }
  return sha256Text(DIGEST_DOMAIN + canonicalStringifyVedicTzdb2026cSourceRightsEvidence(unsigned));
}

export function parseVedicTzdb2026cSourceRightsEvidenceJsonBytes(
  bytes,
  label = VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "EVIDENCE_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function copies(values) {
  const output = [];
  for (let index = 0; index < values.length; index += 1) REFLECT_APPLY(ARRAY_PUSH, output, [{ ...values[index] }]);
  return output;
}

function exactJson(left, right) {
  return canonicalStringifyVedicTzdb2026cSourceRightsEvidence(left)
    === canonicalStringifyVedicTzdb2026cSourceRightsEvidence(right);
}

function evidenceArtifactIdentity() {
  return {
    path: VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    evidenceId: EVIDENCE_ID
  };
}

export function buildExpectedVedicTzdb2026cSourceRightsEvidence() {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "vedic_tzdb_2026c_source_rights_evidence_v1",
    evidenceId: EVIDENCE_ID,
    status: "vedic_specific_operator_recorded_two_read_candidate_only_unbound_zero_active_effect",
    createdAt: CREATED_AT,
    observedWindow: {
      firstStartedAt: "2026-08-31T07:01:38.2753535+00:00",
      lastCompletedAt: "2026-08-31T07:01:42.5368561+00:00",
      observationMode: "operator_recorded_public_https_same_process_two_reads_per_endpoint",
      sameProcessTwoReadObservation: true,
      everyEndpointStatus200: true,
      everyEndpointFinalUrlEqualsRequested: true,
      everyEndpointTwoReadsRawIdentityEqual: true,
      rawBodiesPersisted: 0,
      persistentRawReceiptAvailable: false,
      replayableFromThisRecordAlone: false,
      tlsWireOrNetworkAttestationEstablished: false
    },
    systemIdentity: {
      contractSystemId: "vedic",
      productSystemId: "vedic-astrology",
      productStatus: "research_only",
      crossSystemAuthorityInherited: false
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByVedicProductIdentity: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    basisArtifact: { ...BASIS_ARTIFACT },
    formalPredecessorBinding: {
      ...FORMAL_PREDECESSOR,
      remainsFormalCurrent: true,
      childBindsPredecessor: false,
      predecessorBacklinkObserved: false,
      formalVerifierPrivateBrandAvailable: false
    },
    nonConsumingContextArtifacts: REFLECT_APPLY(ARRAY_MAP, NON_CONSUMING_CONTEXTS, [(entry) => ({
      ...entry,
      relationship: "raw_and_semantic_identity_plus_no_backlink_context_only",
      consumedAsSourceAuthority: false,
      backlinkObserved: false
    })]),
    subjectProjections: [
      {
        subjectId: "vedic.input.iana_time_zone_and_tzdb_identity",
        candidateId: "vedic-iana-tzdb-2026c-input-source-candidate-v1",
        coverageScope: "iana_2026c_release_version_and_system_local_moment_timezone_0_6_3_packed_identity_only",
        bindingState: "candidate_only_unbound",
        subjectFullySatisfied: false,
        frozenBindingId: null,
        countsTowardFrozenBindingGate: false
      },
      {
        subjectId: "vedic.rule.rights_license_and_redistribution_review",
        candidateId: "vedic-iana-tzdb-2026c-moment-timezone-rights-candidate-v1",
        coverageScope: "iana_tzdb_2026c_and_local_moment_timezone_0_6_3_only_not_general_vedic_rights_review",
        bindingState: "candidate_only_unbound",
        subjectFullySatisfied: false,
        frozenBindingId: null,
        countsTowardFrozenBindingGate: false
      }
    ],
    officialIanaEvidence: {
      releasePage: { ...OFFICIAL_IANA_OBSERVATIONS.releasePage, firstRead: { ...OFFICIAL_IANA_OBSERVATIONS.releasePage.firstRead }, secondRead: { ...OFFICIAL_IANA_OBSERVATIONS.releasePage.secondRead } },
      dataArchive: { ...OFFICIAL_IANA_OBSERVATIONS.dataArchive, firstRead: { ...OFFICIAL_IANA_OBSERVATIONS.dataArchive.firstRead }, secondRead: { ...OFFICIAL_IANA_OBSERVATIONS.dataArchive.secondRead } },
      detachedSignature: { ...OFFICIAL_IANA_OBSERVATIONS.detachedSignature, firstRead: { ...OFFICIAL_IANA_OBSERVATIONS.detachedSignature.firstRead }, secondRead: { ...OFFICIAL_IANA_OBSERVATIONS.detachedSignature.secondRead } },
      versionRepresentation: { ...OFFICIAL_IANA_OBSERVATIONS.versionRepresentation, firstRead: { ...OFFICIAL_IANA_OBSERVATIONS.versionRepresentation.firstRead }, secondRead: { ...OFFICIAL_IANA_OBSERVATIONS.versionRepresentation.secondRead }, exactQuote: { ...OFFICIAL_IANA_OBSERVATIONS.versionRepresentation.exactQuote } },
      licenseRepresentation: { ...OFFICIAL_IANA_OBSERVATIONS.licenseRepresentation, firstRead: { ...OFFICIAL_IANA_OBSERVATIONS.licenseRepresentation.firstRead }, secondRead: { ...OFFICIAL_IANA_OBSERVATIONS.licenseRepresentation.secondRead }, exactQuote: { ...OFFICIAL_IANA_OBSERVATIONS.licenseRepresentation.exactQuote } }
    },
    localMomentTimezoneCarrierEvidence: {
      packageName: "moment-timezone",
      packageVersion: "0.6.3",
      declaredLicense: "MIT",
      packageLockEntry: {
        path: "node_modules/moment-timezone",
        version: "0.6.3",
        resolved: "https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.6.3.tgz",
        integrity: "sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg==",
        license: "MIT"
      },
      packedIanaVersion: "2026c",
      packedZoneCount: 340,
      packedLinkCount: 257,
      metaIanaVersion: "2026c",
      metaZoneCount: 418,
      metaCountryCount: 247,
      mitMinimalExactQuote: {
        text: "The MIT License (MIT)",
        utf8Bytes: 21,
        sha256: "74896d15800f7a637980e42b247d49c602d3b252520ad66a6cd1e852109cc9fb",
        locator: "node_modules/moment-timezone/LICENSE_line_1"
      },
      remoteNpmTarballRetrievedInThisVedicObservation: false,
      publisherTarballByteEqualityEstablished: false,
      ianaArchiveToPackedTransformationProvenanceEstablished: false,
      installedCarrierAuthenticityEstablished: false
    },
    localArtifactEvidence: copies(LOCAL_ARTIFACTS),
    rightsLayerObservations: [
      { layerId: "work", evidenceObserved: true, observation: "Vedic-specific IANA LICENSE and local Moment-Timezone MIT minimal wording observations", rightsEstablished: false, independentRightsReviewVerified: false },
      { layerId: "version", evidenceObserved: true, observation: "IANA 2026c and local Moment-Timezone 0.6.3 fixed by operator-recorded and held-handle identities", rightsEstablished: false, independentRightsReviewVerified: false },
      { layerId: "carrier", evidenceObserved: true, observation: "IANA archive/signature and system-local installed carrier identities observed without publisher tarball equality", rightsEstablished: false, independentRightsReviewVerified: false }
    ],
    crossSystemIsolationBoundary: {
      westernEvidenceConsumed: false,
      westernEvidenceBrandAccepted: false,
      westernSuccessorConsumed: false,
      westernControlledReproductionInherited: false,
      westernAuthorityInherited: false,
      sharedLocalTzdbCarrierIdentityIsAuthorityInheritance: false
    },
    storageBoundary: {
      scope: "this_vedic_evidence_record_and_its_materialization_only",
      remoteResponseBodiesPersistedInThisRecord: 0,
      remoteArchivesPersistedInThisRecord: 0,
      detachedSignaturesPersistedInThisRecord: 0,
      completeRemoteLicenseBodiesPersistedInThisRecord: 0,
      persistentProbeReceiptPersistedInThisRecord: 0,
      urlsBytesDigestsTimingsAndMinimalQuotesPersisted: true,
      operatorRecordedPaidOrPrivateMaterialsAccessed: false,
      operatorRecordedThirdPartyBackendsOrAccountsAccessed: false,
      workspaceWideAbsenceMechanicallyVerified: false
    },
    observationBoundary: {
      localArtifactReadSemantics: "per_file_held_handle_same_endpoint_revalidation",
      remoteObservationSemantics: "operator_recorded_same_process_two_read_window_without_persisted_raw_receipt",
      machineArtifactsUseExclusiveCreateWriter: true,
      completeProcessReadSetMechanicallyTraced: false,
      networkIsolationMechanicallyEstablished: false,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    gateSummary: {
      sourceBindingsRequired: 38,
      sourceBindingsFrozenVerified: 0,
      partialCandidatesAttached: 2,
      subjectFullySatisfied: 0,
      subjectsWithMinimalExactQuoteObservation: 2,
      minimalExactQuoteObservationsStored: 3,
      sourceBodiesBound: 0,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      independentRightsReviewsVerified: 0,
      independentEngineeringReviewsVerified: 0,
      independentDomainExpertReviewsVerified: 0,
      formalParentIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      traditionalAuthorityEstablished: false,
      expertTruthEstablished: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      formalAdmissionAuthorized: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence: "vedic_specific_operator_recorded_remote_identities_and_system_local_held_handle_identities",
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestExcludesOwnField: true,
      digestIsDigitalSignature: false,
      authenticityEstablished: false,
      signerIdentity: null
    }
  };
  return deepFreeze({
    ...unsigned,
    evidenceDigest: computeVedicTzdb2026cSourceRightsEvidenceDigest(unsigned)
  });
}

function scanForbiddenPayload(value) {
  if (ARRAY_IS_ARRAY(value)) {
    for (let index = 0; index < value.length; index += 1) scanForbiddenPayload(value[index]);
    return;
  }
  if (!value || typeof value !== "object") return;
  const entries = OBJECT_ENTRIES(value);
  for (let index = 0; index < entries.length; index += 1) {
    const [key, child] = entries[index];
    if (/^(?:rawBody|pageBody|html|fullText|documentContent|archiveBody|signatureBody|tarballBody|privateContactData)$/iu.test(key)) {
      fail("REMOTE_OR_PRIVATE_BODY_FIELD_FORBIDDEN", "Vedic tzdb evidence 不得保存远程正文、archive、signature、tarball 或私人数据字段。");
    }
    scanForbiddenPayload(child);
  }
}

function assertFailClosedBoundaries(ledger) {
  const gate = ledger?.gateSummary;
  if (!gate || gate.sourceBindingsRequired !== 38 || gate.sourceBindingsFrozenVerified !== 0
    || gate.partialCandidatesAttached !== 2 || gate.subjectFullySatisfied !== 0
    || gate.sourceBodiesBound !== 0 || gate.exactQuotesBound !== 0 || gate.exactLocatorsEstablished !== 0
    || gate.workRightsEstablished !== 0 || gate.versionRightsEstablished !== 0
    || gate.carrierRightsEstablished !== 0 || gate.independentRightsReviewsVerified !== 0
    || gate.independentEngineeringReviewsVerified !== 0 || gate.independentDomainExpertReviewsVerified !== 0
    || gate.formalParentIntegrated !== false || gate.formalRegistryIntegrated !== false
    || gate.ownerAdmissionAccepted !== false || gate.rightsLegalConclusionEstablished !== false
    || gate.redistributionAuthorized !== false || gate.releaseReady !== false
    || gate.publicReleaseAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "Vedic tzdb evidence 必须保持 0/38、两项 partial、无权利、无专家与无发布准入。");
  }
  if (!ARRAY_IS_ARRAY(ledger?.subjectProjections) || ledger.subjectProjections.length !== 2
    || ledger.subjectProjections[0]?.subjectId !== "vedic.input.iana_time_zone_and_tzdb_identity"
    || ledger.subjectProjections[1]?.subjectId !== "vedic.rule.rights_license_and_redistribution_review"
    || REFLECT_APPLY(ARRAY_SOME, ledger.subjectProjections, [(entry) =>
      entry.bindingState !== "candidate_only_unbound"
      || entry.subjectFullySatisfied !== false
      || entry.frozenBindingId !== null
      || entry.countsTowardFrozenBindingGate !== false])) {
    fail("SUBJECT_PROJECTION_PROMOTION_FORBIDDEN", "Vedic tzdb subject projection 必须保持两个指定 partial candidate 与 unbound。");
  }
  const isolation = ledger?.crossSystemIsolationBoundary;
  if (!isolation || REFLECT_APPLY(ARRAY_SOME, OBJECT_VALUES(isolation), [(value) => value !== false])) {
    fail("CROSS_SYSTEM_INHERITANCE_FORBIDDEN", "Vedic evidence 不得继承 Western evidence、brand、reproduction 或 authority。");
  }
  const observation = ledger?.observationBoundary;
  if (!observation || observation.mutationEpochReceipt !== null
    || observation.crossFileAtomicSnapshotEstablished !== false
    || observation.intervalMutationExcluded !== false || observation.abaExcluded !== false
    || observation.completeProcessReadSetMechanicallyTraced !== false
    || observation.networkIsolationMechanicallyEstablished !== false) {
    fail("OBSERVATION_BOUNDARY_PROMOTION_FORBIDDEN", "Vedic evidence 不得声称 read-set、网络隔离、mutation epoch、原子性、区间完整性或 ABA 排除。");
  }
  const release = ledger?.projectReleaseGovernanceContext;
  if (!release || release.activeLine !== "legacy-v13" || release.targetSchema !== 13
    || release.migrationId !== null || release.projectContextOnly !== true
    || release.inheritedByVedicProductIdentity !== false
    || release.mutationEpochAvailableForSchema13 !== false || release.mutationEpochReceipt !== null
    || release.expertClaimsAuthorized !== false || release.publicDeploymentAuthorized !== false) {
    fail("PROJECT_CONTEXT_PROMOTION_FORBIDDEN", "legacy-v13/13/null 只能作为未被 Vedic 产品继承的项目上下文。");
  }
}

export function verifyVedicTzdb2026cSourceRightsEvidenceLedger(input) {
  const ledger = capturePassiveJson(input);
  scanForbiddenPayload(ledger);
  assertFailClosedBoundaries(ledger);
  if (typeof ledger.evidenceDigest !== "string" || !REFLECT_APPLY(REGEXP_TEST, SHA256, [ledger.evidenceDigest])) {
    fail("EVIDENCE_DIGEST_INVALID", "Vedic tzdb evidence 必须具有小写 SHA-256 摘要。");
  }
  if (computeVedicTzdb2026cSourceRightsEvidenceDigest(ledger) !== ledger.evidenceDigest) {
    fail("EVIDENCE_DIGEST_MISMATCH", "Vedic tzdb evidence 摘要不匹配。");
  }
  const expected = buildExpectedVedicTzdb2026cSourceRightsEvidence();
  if (!exactJson(ledger, expected)) {
    fail("EVIDENCE_CONTRACT_MISMATCH", "Vedic tzdb evidence 与固定独立观察、载体和失败关闭合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeVedicTzdb2026cSourceRightsEvidence(ledger) {
  return JSON_STRINGIFY(prettySafeValue(verifyVedicTzdb2026cSourceRightsEvidenceLedger(ledger)), null, 2) + "\n";
}

function decodeUtf8(bytes, label) {
  try {
    const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

function assertArtifactIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail("LOCAL_RAW_IDENTITY_DRIFT", `${label} raw identity 漂移。`);
  }
}

function parseStrict(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: snapshot.path, bytes: snapshot.bytes });
  } catch (cause) {
    fail("LOCAL_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

async function verifyBasis(workspaceRoot, ledger) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, BASIS_ARTIFACT.path);
  assertArtifactIdentity(snapshot, BASIS_ARTIFACT, "Vedic tzdb narrative basis");
  const text = decodeUtf8(snapshot.bytes, "Vedic tzdb narrative basis");
  const markers = [
    "# 阶段 C/E：吠陀 IANA tzdb 2026c 来源／权利候选",
    "formal Binding：`0/38`",
    "subjectFullySatisfied：0",
    "exactQuotesBound：0",
    "不继承 Western child"
  ];
  if (REFLECT_APPLY(ARRAY_SOME, markers, [(marker) => !REFLECT_APPLY(STRING_INCLUDES, text, [marker])])) {
    fail("BASIS_MARKER_MISSING", "Vedic tzdb narrative basis 缺少固定边界标记。");
  }
  if (!exactJson(ledger.basisArtifact, BASIS_ARTIFACT)) fail("BASIS_BINDING_DRIFT", "Vedic basis binding 漂移。");
  return snapshot;
}

async function verifyLocalArtifacts(workspaceRoot, ledger) {
  const snapshots = [];
  for (let index = 0; index < LOCAL_ARTIFACTS.length; index += 1) {
    const expected = LOCAL_ARTIFACTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  if (!exactJson(ledger.localArtifactEvidence, copies(LOCAL_ARTIFACTS))) {
    fail("LOCAL_BINDING_DRIFT", "Vedic tzdb local artifact binding 漂移。");
  }
  const lock = parseStrict(snapshots[0], "package-lock.json");
  const lockEntry = lock?.packages?.["node_modules/moment-timezone"];
  const carrier = ledger.localMomentTimezoneCarrierEvidence;
  if (!lockEntry || lockEntry.version !== carrier.packageLockEntry.version
    || lockEntry.resolved !== carrier.packageLockEntry.resolved
    || lockEntry.integrity !== carrier.packageLockEntry.integrity
    || lockEntry.license !== carrier.packageLockEntry.license) {
    fail("PACKAGE_LOCK_ENTRY_DRIFT", "Moment-Timezone lock entry 漂移。");
  }
  const tzdbPackage = parseStrict(snapshots[1], "tzdb-core package.json");
  if (tzdbPackage?.name !== "@hakimi/tzdb-core" || tzdbPackage?.version !== "0.1.0"
    || tzdbPackage?.dependencies?.["moment-timezone"] !== "0.6.3") {
    fail("TZDB_PACKAGE_CONTRACT_DRIFT", "tzdb-core package contract 漂移。");
  }
  const packed = parseStrict(snapshots[5], "installed packed latest.json");
  const meta = parseStrict(snapshots[6], "installed meta latest.json");
  const manifest = parseStrict(snapshots[7], "installed Moment-Timezone package.json");
  if (packed?.version !== "2026c" || packed?.zones?.length !== 340 || packed?.links?.length !== 257
    || meta?.version !== "2026c" || OBJECT_KEYS(meta?.zones ?? {}).length !== 418
    || OBJECT_KEYS(meta?.countries ?? {}).length !== 247
    || manifest?.name !== "moment-timezone" || manifest?.version !== "0.6.3" || manifest?.license !== "MIT") {
    fail("LOCAL_CARRIER_SEMANTICS_DRIFT", "system-local Moment-Timezone carrier 语义漂移。");
  }
  const registryText = decodeUtf8(snapshots[2].bytes, "tzdb-core registry");
  const verifierText = decodeUtf8(snapshots[3].bytes, "tzdb-core verifier");
  const noticesText = decodeUtf8(snapshots[4].bytes, "THIRD_PARTY_NOTICES.md");
  const licenseText = decodeUtf8(snapshots[8].bytes, "Moment-Timezone LICENSE");
  const newlineIndex = REFLECT_APPLY(STRING_INDEX_OF, licenseText, ["\n"]);
  const firstLineWithOptionalCr = REFLECT_APPLY(STRING_SLICE, licenseText, [0, newlineIndex < 0 ? licenseText.length : newlineIndex]);
  const firstLine = REFLECT_APPLY(STRING_ENDS_WITH, firstLineWithOptionalCr, ["\r"])
    ? REFLECT_APPLY(STRING_SLICE, firstLineWithOptionalCr, [0, -1])
    : firstLineWithOptionalCr;
  if (!REFLECT_APPLY(STRING_INCLUDES, registryText, ["ianaVersion: \"2026c\""])
    || !REFLECT_APPLY(STRING_INCLUDES, verifierText, ["hakimi-tzdb-artifact-registry-v2"])
    || !REFLECT_APPLY(STRING_INCLUDES, noticesText, ["### `moment-timezone` 0.6.3"])
    || firstLine !== carrier.mitMinimalExactQuote.text
    || sha256Text(firstLine) !== carrier.mitMinimalExactQuote.sha256) {
    fail("LOCAL_SEMANTIC_MARKER_DRIFT", "Vedic system-local tzdb carrier 缺少固定语义或独立 LICENSE quote。");
  }
  return snapshots;
}

async function verifyFormalContexts(workspaceRoot, ledger) {
  const expectedContexts = [FORMAL_PREDECESSOR, ...NON_CONSUMING_CONTEXTS];
  const snapshots = [];
  const needles = [EVIDENCE_ID, VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH, SUCCESSOR_ID, SUCCESSOR_PATH];
  for (let index = 0; index < expectedContexts.length; index += 1) {
    const expected = expectedContexts[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    const parsed = parseStrict(snapshot, expected.role);
    if (parsed?.[expected.semanticDigestField] !== expected.semanticDigest
      || parsed?.[expected.artifactIdField] !== expected.artifactId) {
      fail("FORMAL_CONTEXT_SEMANTIC_DRIFT", `${expected.role} semantic identity 漂移。`);
    }
    const text = decodeUtf8(snapshot.bytes, expected.role);
    for (let needleIndex = 0; needleIndex < needles.length; needleIndex += 1) {
      if (REFLECT_APPLY(STRING_INCLUDES, text, [needles[needleIndex]])) {
        fail("FORMAL_CONTEXT_BACKLINK_FORBIDDEN", "既有 Vedic formal/parent/version/registry context 不得反向消费 source child/successor。");
      }
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  const formal = await readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
  if (formal.ledgerId !== FORMAL_PREDECESSOR.artifactId
    || formal.ledgerDigest !== FORMAL_PREDECESSOR.semanticDigest
    || formal.subjects?.length !== 38
    || formal.gateSummary?.bindingFrozenVerified !== 0
    || formal.gateSummary?.sourceCandidatesAttached !== 0) {
    fail("FORMAL_PREDECESSOR_ZERO_STATE_DRIFT", "Vedic formal source predecessor 必须保持 38 条、0 candidate、0/38 frozen。");
  }
  if (!exactJson(ledger.formalPredecessorBinding, {
    ...FORMAL_PREDECESSOR,
    remainsFormalCurrent: true,
    childBindsPredecessor: false,
    predecessorBacklinkObserved: false,
    formalVerifierPrivateBrandAvailable: false
  })) {
    fail("FORMAL_PREDECESSOR_BINDING_DRIFT", "Vedic formal predecessor binding 漂移。");
  }
  return snapshots;
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({ path: snapshot.path, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 });
}

export async function loadVedicTzdb2026cSourceRightsEvidence(workspaceRoot = process.cwd()) {
  const ledgerSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH
  );
  if (EXPECTED_PERSISTED_RAW.rawBytes > 0
    && (ledgerSnapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
      || ledgerSnapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("EVIDENCE_RAW_IDENTITY_DRIFT", "Vedic tzdb evidence raw identity 漂移。");
  }
  const ledger = verifyVedicTzdb2026cSourceRightsEvidenceLedger(
    parseVedicTzdb2026cSourceRightsEvidenceJsonBytes(ledgerSnapshot.bytes, ledgerSnapshot.path)
  );
  if (decodeUtf8(ledgerSnapshot.bytes, "Vedic tzdb evidence")
    !== serializeVedicTzdb2026cSourceRightsEvidence(ledger)) {
    fail("EVIDENCE_CANONICAL_BYTES_DRIFT", "Vedic tzdb evidence 必须保持唯一 pretty JSON 与 LF 终止。");
  }
  const basisSnapshot = await verifyBasis(workspaceRoot, ledger);
  const localSnapshots = await verifyLocalArtifacts(workspaceRoot, ledger);
  const contextSnapshots = await verifyFormalContexts(workspaceRoot, ledger);
  const result = deepFreeze({
    ok: true,
    status: ledger.status,
    evidenceId: ledger.evidenceId,
    evidenceDigest: ledger.evidenceDigest,
    partialCandidatesAttached: ledger.gateSummary.partialCandidatesAttached,
    sourceBindingsRequired: ledger.gateSummary.sourceBindingsRequired,
    sourceBindingsFrozenVerified: ledger.gateSummary.sourceBindingsFrozenVerified,
    subjectFullySatisfied: ledger.gateSummary.subjectFullySatisfied,
    exactQuotesBound: ledger.gateSummary.exactQuotesBound,
    rightsLegalConclusionEstablished: ledger.gateSummary.rightsLegalConclusionEstablished,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    ledgerArtifact: publicIdentity(ledgerSnapshot),
    basisArtifact: publicIdentity(basisSnapshot),
    localArtifacts: REFLECT_APPLY(ARRAY_MAP, localSnapshots, [publicIdentity]),
    contextArtifacts: REFLECT_APPLY(ARRAY_MAP, contextSnapshots, [publicIdentity]),
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicTzdb2026cSourceRightsEvidence(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const vedicTzdb2026cSourceRightsEvidenceTestOnly = OBJECT_FREEZE({
  BASIS_ARTIFACT,
  DIGEST_DOMAIN,
  EVIDENCE_ID,
  EXPECTED_PERSISTED_RAW,
  FORMAL_PREDECESSOR,
  LOCAL_ARTIFACTS,
  NON_CONSUMING_CONTEXTS,
  OFFICIAL_IANA_OBSERVATIONS,
  SUCCESSOR_ID,
  SUCCESSOR_PATH,
  evidenceArtifactIdentity,
  sha256Text
});
