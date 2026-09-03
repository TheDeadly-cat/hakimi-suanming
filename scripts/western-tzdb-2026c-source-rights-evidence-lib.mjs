import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS,
  readIndependentSourceRequirements,
  verifyIndependentSourceRequirements
} from "./independent-source-binding-requirements-lib.mjs";

export const WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH =
  "content/system-admission/western-tzdb-2026c-source-rights-evidence.v1.json";

const DIGEST_DOMAIN = "hakimi-western-tzdb-2026c-source-rights-evidence-v1\0";
const EVIDENCE_ID = "hakimi.western.source-rights/iana-tzdb-2026c-moment-timezone-0.6.3/1.0.0";
const CREATED_AT = "2026-08-31T04:30:00.000Z";
const OBSERVED_FROM = "2026-08-31T04:21:16.887Z";
const OBSERVED_TO = "2026-08-31T04:21:24.477Z";
const SUCCESSOR_PATH = "content/system-admission/western-source-binding-requirements.v1.1.0.json";
const SUCCESSOR_ID = "hakimi.western-astrology.source-binding-requirements/1.1.0";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_FIND = Array.prototype.find;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SOME = Array.prototype.some;
const ARRAY_SORT = Array.prototype.sort;
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
  path: "docs/阶段C-E-西洋IANA-tzdb-2026c来源权利候选-2026-08-31.md",
  role: "non_authoritative_source_rights_candidate_narrative_basis",
  rawBytes: 8_694,
  rawSha256: "819f8219988cff1912abbb2a0e9a46baf67a4ef876748a6ee7353568b84c8740"
});

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 16_931,
  rawSha256: "ee61453078f7e4df39c71ee59dcfc94f75ab37a7cd0d967849e1049d748d1ee1"
});

const FORMAL_PARENTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "current_western_source_binding_requirements",
    path: "content/system-admission/western-source-binding-requirements.v1.json",
    rawBytes: 25_909,
    rawSha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
    semanticDigestField: "ledgerDigest",
    semanticDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd"
  }),
  OBJECT_FREEZE({
    role: "current_western_independent_domain_manifest",
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
    rawBytes: 10_832,
    rawSha256: "c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398",
    semanticDigestField: "manifestDigest",
    semanticDigest: "5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e"
  }),
  OBJECT_FREEZE({
    role: "current_western_version_aware_observation",
    path: "content/system-admission/western-independent-productization-version-aware-observation-candidate.v1.0.0.json",
    rawBytes: 18_879,
    rawSha256: "956fa352a87253abc893056e443bd45e3fa731531b839144e3121c43639f19df",
    semanticDigestField: "candidateDigest",
    semanticDigest: "6f71eb3e0f8745c82b383e6e05bf9130d6249530f4ad1d872620480796b1deeb"
  }),
  OBJECT_FREEZE({
    role: "four_system_current_observation_registry_v2",
    path: "content/system-admission/four-system-current-observation-registry.v2.json",
    rawBytes: 22_261,
    rawSha256: "1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39",
    semanticDigestField: "registryDigest",
    semanticDigest: "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738"
  })
]);

const LOCAL_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "workspace_dependency_lock",
    path: "package-lock.json",
    rawBytes: 175_812,
    rawSha256: "40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d"
  }),
  OBJECT_FREEZE({
    role: "tzdb_core_package_contract",
    path: "packages/tzdb-core/package.json",
    rawBytes: 241,
    rawSha256: "fb12b19a6f6c971185bd2f2c9226fe50ad816595e3acec4f0a0b373593136236"
  }),
  OBJECT_FREEZE({
    role: "tzdb_core_content_addressed_registry",
    path: "packages/tzdb-core/src/index.ts",
    rawBytes: 7_819,
    rawSha256: "7c144f6446b3fdba55f7b7b947fe242348ba5010025af36868c39436bfea638e"
  }),
  OBJECT_FREEZE({
    role: "tzdb_core_offline_artifact_verifier",
    path: "packages/tzdb-core/scripts/verify-artifact.mjs",
    rawBytes: 9_473,
    rawSha256: "a0b643073f5ca99e6668c476c4382b9bdadf93d19422fe7f8558e98f9bb96164"
  }),
  OBJECT_FREEZE({
    role: "western_civil_time_fail_closed_adapter",
    path: "packages/western-civil-time-input-adapter-draft/src/index.ts",
    rawBytes: 27_692,
    rawSha256: "80f7b3627d5a4651d0ab2d9509a314f49d93fbdac6d5f92b10ac97c34892fc77"
  }),
  OBJECT_FREEZE({
    role: "project_third_party_notice_inventory",
    path: "THIRD_PARTY_NOTICES.md",
    rawBytes: 7_030,
    rawSha256: "d05d5d8a944cde7a739f3a64a1077fbedf706185a20e3e15c7ad423d7f0e8248"
  }),
  OBJECT_FREEZE({
    role: "installed_moment_timezone_packed_entry",
    path: "node_modules/moment-timezone/data/packed/latest.json",
    rawBytes: 715_527,
    rawSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81"
  }),
  OBJECT_FREEZE({
    role: "installed_moment_timezone_meta_entry",
    path: "node_modules/moment-timezone/data/meta/latest.json",
    rawBytes: 97_948,
    rawSha256: "89fdbb1808eb6b9a5d40ff63b694a3952bcf294384659b88c05f736c50d86ab5"
  }),
  OBJECT_FREEZE({
    role: "installed_moment_timezone_package_manifest",
    path: "node_modules/moment-timezone/package.json",
    rawBytes: 1_076,
    rawSha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b"
  }),
  OBJECT_FREEZE({
    role: "installed_moment_timezone_license_carrier",
    path: "node_modules/moment-timezone/LICENSE",
    rawBytes: 1_097,
    rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"
  })
]);

export const WESTERN_TZDB_2026C_REMOTE_EVIDENCE = OBJECT_FREEZE({
  releasePage: OBJECT_FREEZE({
    url: "https://www.iana.org/time-zones/releases/2026c",
    httpStatus: 200,
    rawBytes: 8_924,
    rawSha256: "ee7b7dd9dd8a4cb9e37865ff699ad75032755e027668b028debd8f6e456529d0",
    releaseVersion: "2026c",
    releaseDate: "2026-07-08"
  }),
  dataArchive: OBJECT_FREEZE({
    url: "https://data.iana.org/time-zones/releases/tzdata2026c.tar.gz",
    httpStatus: 200,
    rawBytes: 475_694,
    rawSha256: "e4a178a4477f3d0ea77cc31828ff72aa38feff8d61aa13e7e99e142e9d902be4",
    rawSha512: "e0b4b7044b66fbc27bc21d13d18063abcdf78ab58d5ba5fd64bd1a88d86e9d495f45add4d8e65bb6c40249f9c94ca29b72c8ebba8d0e4c468f2965ac77932ef0",
    etag: "\"7422e-6561d50afc200\"",
    lastModified: "Wed, 08 Jul 2026 18:02:48 GMT"
  }),
  detachedSignature: OBJECT_FREEZE({
    url: "https://data.iana.org/time-zones/releases/tzdata2026c.tar.gz.asc",
    httpStatus: 200,
    rawBytes: 833,
    rawSha256: "26cd02e034eed682aa911d224bca3247ff15914df317e3bb0b1a01dc557b46fe",
    rawSha512: "e1d44216608666bfb8a1855caacc9e6d30a1576f302c4db59faf8ec6aa2f7d5ae299c4c9b17b255b9612c30582358ca2a48f5fea82ab9b7d77d030e713c9010d"
  }),
  versionRepresentation: OBJECT_FREEZE({
    url: "https://data.iana.org/time-zones/tzdb/version?version=2026c",
    httpStatus: 200,
    rawBytes: 6,
    rawSha256: "b8b066b540bc2870e6f1f3cd76f1b0e6c3629b2e3a12f14ba9e47085a1abb781",
    rawSha512: "e463bca75b77c320e645d265471410a6faad2d6c14d6ef5f0ece43b3c42903f33a968211bfca529e17c06785d0b8c899e8f60b0867cc00a796a41cabda813dcf",
    exactQuote: OBJECT_FREEZE({
      text: "2026c",
      utf8Bytes: 5,
      sha256: "19fd9387dff1a60f2a3947d61232c982b3a52feb645b130e708a879936152da5",
      locator: "line_1_without_trailing_lf"
    })
  }),
  licenseRepresentation: OBJECT_FREEZE({
    url: "https://data.iana.org/time-zones/tzdb-2026c/LICENSE",
    httpStatus: 200,
    rawBytes: 252,
    rawSha256: "0613408568889f5739e5ae252b722a2659c02002839ad970a63dc5e9174b27cf",
    rawSha512: "9fe102f8894714cd0bd7d72a92e5ca29e4f75ff3f802d6fc363d5349b83345251b1d572a35321bd487cc70485da337b90df0cd37f896b6343f6f4c29cba7a295",
    exactQuote: OBJECT_FREEZE({
      text: "Unless specified below, all files in the tz code and data (including\nthis LICENSE file) are in the public domain.",
      utf8Bytes: 113,
      sha256: "72c3b37777104fdba9c140c56d93cd282266f283e848399f0d8e3cef9daaf0ff",
      locator: "LICENSE_lines_1_2_exact_lf"
    })
  }),
  announcement: OBJECT_FREEZE({
    url: "https://lists.iana.org/hyperkitty/list/tz%40iana.org/thread/NVHSX2PAQIT44U5FCCEVNJJYXQMMTJSA/?sort=date",
    observedRawBytes: 27_691,
    observedRawSha256: "6f63ccc3186c430d56135f96345e14b28e702654557fec599ccc6b8e3b9eac32",
    volatileDynamicRepresentation: true,
    statedDataArchiveSha512: "e0b4b7044b66fbc27bc21d13d18063abcdf78ab58d5ba5fd64bd1a88d86e9d495f45add4d8e65bb6c40249f9c94ca29b72c8ebba8d0e4c468f2965ac77932ef0",
    statedCommit: "71f28b9ab3b67c0f9466803f6151812d4fc8e357",
    statedTag: "2026c"
  }),
  npmTarball: OBJECT_FREEZE({
    url: "https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.6.3.tgz",
    httpStatus: 200,
    rawBytes: 238_621,
    rawSha256: "09cc398dae4d95db31016e6e3e35eafff09244a72e0511a292702738e7c724ac",
    rawSha512: "a5510f03f1c21471dbc09d77d32c27cd8b99a6410670fe8369afcec0d79ba40d7c3326de1479908a50061a8bd78168a343cbd0b66b9df6366bce250182cca47e",
    sri: "sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg=="
  })
});

const IANA_ARCHIVE_ENTRIES = OBJECT_FREEZE([
  OBJECT_FREEZE({ path: "LICENSE", rawBytes: 252, rawSha256: "0613408568889f5739e5ae252b722a2659c02002839ad970a63dc5e9174b27cf" }),
  OBJECT_FREEZE({ path: "africa", rawBytes: 58_273, rawSha256: "f2851d4be4a4925cbdc9d56e10d780bccadb89d6ffb9aed78c3e35f97c200aed" }),
  OBJECT_FREEZE({ path: "asia", rawBytes: 192_871, rawSha256: "cd12fe2bd64a02d808fd34abb92f08f19e5da20133a1c6c347d11171c00d9e1c" }),
  OBJECT_FREEZE({ path: "backward", rawBytes: 12_039, rawSha256: "d2f4c8953f204982ddf4dc0c2debf41b2464de376dad7d546d0fc70f889fa706" }),
  OBJECT_FREEZE({ path: "northamerica", rawBytes: 177_085, rawSha256: "4046b382ee56e287a5ea0cfddae67297badcf9c8fb6b6e2ee8086898c847e147" }),
  OBJECT_FREEZE({ path: "version", rawBytes: 6, rawSha256: "b8b066b540bc2870e6f1f3cd76f1b0e6c3629b2e3a12f14ba9e47085a1abb781" }),
  OBJECT_FREEZE({ path: "zone1970.tab", rawBytes: 17_596, rawSha256: "77b5e45415fa684fcc42de3421a6b0f15cc9b2c137f258083850346e8f76eea8" })
]);

const NPM_TARBALL_ENTRIES = OBJECT_FREEZE([
  OBJECT_FREEZE({ path: "package/LICENSE", rawBytes: 1_097, rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" }),
  OBJECT_FREEZE({ path: "package/data/meta/latest.json", rawBytes: 97_948, rawSha256: "89fdbb1808eb6b9a5d40ff63b694a3952bcf294384659b88c05f736c50d86ab5" }),
  OBJECT_FREEZE({ path: "package/data/packed/latest.json", rawBytes: 715_527, rawSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" }),
  OBJECT_FREEZE({ path: "package/package.json", rawBytes: 1_076, rawSha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b" })
]);

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "complete_calendar_time_zone_and_dst_subject",
  "complete_ephemeris_time_data_redistribution_subject",
  "iana_to_moment_timezone_transformation_provenance_or_byte_equivalence",
  "detached_signature_cryptographic_verification_signing_key_trust_or_publisher_authenticity",
  "work_version_carrier_rights_establishment_or_legal_conclusion",
  "jpl_naif_iers_eop_leap_seconds_sofa_swiss_ephemeris_or_other_provider_rights",
  "content_truth_or_all_historical_or_future_civil_time_truth",
  "independent_engineering_rights_or_domain_expert_review",
  "browser_runtime_pwa_service_worker_or_cross_browser_validation",
  "formal_manifest_registry_or_owner_admission",
  "release_readiness_public_deployment_or_public_release_authorization",
  "cross_system_equivalence_scoring_weighting_majority_vote_or_generated_model_winner",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class WesternTzdb2026cSourceRightsEvidenceError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WesternTzdb2026cSourceRightsEvidenceError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new WesternTzdb2026cSourceRightsEvidenceError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function passiveCapture(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "西洋 tzdb evidence 超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 100_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "西洋 tzdb evidence 超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) fail("INPUT_VALUE_INVALID", "西洋 tzdb evidence 含无效数值。");
    return value;
  }
  if (typeof value === "string") {
    state.text += value.length;
    if (state.text > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "西洋 tzdb evidence 超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "西洋 tzdb evidence 只接受 JSON 数据值。");
  if (IS_PROXY(value)) fail("INPUT_PROXY_FORBIDDEN", "西洋 tzdb evidence 不接受 Proxy。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) fail("INPUT_CYCLE_FORBIDDEN", "西洋 tzdb evidence 不接受循环引用。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) fail("INPUT_ALIAS_FORBIDDEN", "西洋 tzdb evidence 不接受对象别名。");
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
      fail("INPUT_OBJECT_UNSAFE", "西洋 tzdb evidence 对象不能被安全捕获。", cause);
    }
    const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
    if (REFLECT_APPLY(ARRAY_SOME, descriptorKeys, [(key) => typeof key === "symbol"])) {
      fail("INPUT_SYMBOL_FORBIDDEN", "西洋 tzdb evidence 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== ARRAY_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "西洋 tzdb evidence 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set || !NUMBER_IS_SAFE_INTEGER(length) || length < 0 || length > 100_000) {
        fail("INPUT_ARRAY_INVALID", "西洋 tzdb evidence 数组长度无效。");
      }
      const allowed = new NATIVE_SET();
      REFLECT_APPLY(SET_ADD, allowed, ["length"]);
      for (let index = 0; index < length; index += 1) REFLECT_APPLY(SET_ADD, allowed, [String(index)]);
      for (let index = 0; index < descriptorKeys.length; index += 1) {
        if (!REFLECT_APPLY(SET_HAS, allowed, [descriptorKeys[index]])) fail("INPUT_ARRAY_INVALID", "西洋 tzdb evidence 数组含额外属性。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "西洋 tzdb evidence 不接受稀疏数组或访问器元素。");
        }
        REFLECT_APPLY(ARRAY_PUSH, output, [passiveCapture(descriptor.value, state, depth + 1)]);
      }
      return output;
    }
    if (prototype !== OBJECT_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "西洋 tzdb evidence 只接受普通对象。");
    const output = {};
    for (let index = 0; index < descriptorKeys.length; index += 1) {
      const key = descriptorKeys[index];
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "西洋 tzdb evidence 不接受访问器或不可枚举字段。");
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
  fail("NON_CANONICAL_JSON", "西洋 tzdb evidence 只接受有限规范 JSON 值。");
}

function prettySafeValue(value) {
  const snapshot = capturePassiveJson(value);
  function materialize(input) {
    if (input === null || typeof input !== "object") return input;
    if (ARRAY_IS_ARRAY(input)) {
      const output = [];
      OBJECT_DEFINE_PROPERTY(output, "toJSON", { value: null });
      for (let index = 0; index < input.length; index += 1) {
        REFLECT_APPLY(ARRAY_PUSH, output, [materialize(input[index])]);
      }
      return output;
    }
    const output = OBJECT_CREATE(null);
    const keys = OBJECT_KEYS(input);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: materialize(input[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  return materialize(snapshot);
}

export function canonicalStringifyWesternTzdb2026cSourceRightsEvidence(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJson(value)));
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeWesternTzdb2026cSourceRightsEvidenceDigest(ledger) {
  const snapshot = capturePassiveJson(ledger);
  const unsigned = {};
  const keys = OBJECT_KEYS(snapshot);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === "evidenceDigest") continue;
    OBJECT_DEFINE_PROPERTY(unsigned, key, {
      value: snapshot[key],
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return sha256Text(DIGEST_DOMAIN + canonicalStringifyWesternTzdb2026cSourceRightsEvidence(unsigned));
}

export function parseWesternTzdb2026cSourceRightsEvidenceJsonBytes(
  bytes,
  label = WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH
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

export function buildExpectedWesternTzdb2026cSourceRightsEvidence() {
  const remote = WESTERN_TZDB_2026C_REMOTE_EVIDENCE;
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "western_tzdb_2026c_source_rights_evidence_v1",
    evidenceId: EVIDENCE_ID,
    status: "link_hash_and_minimal_quote_candidate_only_unbound",
    createdAt: CREATED_AT,
    observedWindow: {
      startedAt: OBSERVED_FROM,
      endedAt: OBSERVED_TO,
      observationMode: "public_https_in_memory_no_remote_body_persistence",
      remoteCaptureMechanicallyReverifiedByOfflineLoader: false,
      offlineLoaderVerifiesPersistedRecordAndLocalClosureOnly: true
    },
    projectReleaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    basisArtifacts: [{ ...BASIS_ARTIFACT }],
    formalParents: copies(FORMAL_PARENTS),
    subjectProjections: [
      {
        subjectId: "western.input.calendar-time-zone-and-dst",
        candidateId: "western-iana-tzdb-2026c-input-source-candidate-v1",
        coverageScope: "iana_2026c_release_and_bundled_packed_artifact_identity_only",
        bindingState: "candidate_only_unbound",
        subjectFullySatisfied: false,
        frozenBindingId: null,
        countsTowardFrozenBindingGate: false
      },
      {
        subjectId: "western.rights.ephemeris-time-data-redistribution",
        candidateId: "western-iana-tzdb-2026c-moment-timezone-rights-candidate-v1",
        coverageScope: "iana_tzdb_and_moment_timezone_only",
        bindingState: "candidate_only_unbound",
        subjectFullySatisfied: false,
        frozenBindingId: null,
        countsTowardFrozenBindingGate: false
      }
    ],
    officialIanaEvidence: {
      releasePage: { ...remote.releasePage },
      dataArchive: { ...remote.dataArchive },
      detachedSignature: {
        ...remote.detachedSignature,
        bytesObserved: true,
        cryptographicallyVerified: false,
        signingKeyTrustEstablished: false,
        publisherAuthenticityEstablished: false
      },
      versionRepresentation: {
        ...remote.versionRepresentation,
        exactQuote: { ...remote.versionRepresentation.exactQuote }
      },
      licenseRepresentation: {
        ...remote.licenseRepresentation,
        exactQuote: { ...remote.licenseRepresentation.exactQuote },
        licenseTextObserved: true,
        licenseTextAutomaticallyTreatedAsLegalConclusion: false
      },
      announcement: { ...remote.announcement },
      archiveEntriesObservedInMemory: copies(IANA_ARCHIVE_ENTRIES)
    },
    npmCarrierEvidence: {
      packageName: "moment-timezone",
      packageVersion: "0.6.3",
      declaredLicense: "MIT",
      tarball: { ...remote.npmTarball },
      packageLockEntry: {
        path: "packages.node_modules/moment-timezone",
        version: "0.6.3",
        resolved: remote.npmTarball.url,
        integrity: remote.npmTarball.sri,
        license: "MIT"
      },
      tarballEntriesObservedInMemory: copies(NPM_TARBALL_ENTRIES),
      packedIanaVersion: "2026c",
      packedZoneCount: 340,
      packedLinkCount: 257,
      localInstalledEntriesByteEqualToObservedTarballEntriesInLiveWindow: true,
      ianaArchiveToPackedTransformationProvenanceEstablished: false,
      publisherAuthenticityEstablished: false,
      mitMinimalExactQuote: {
        text: "The MIT License (MIT)",
        utf8Bytes: 21,
        sha256: "74896d15800f7a637980e42b247d49c602d3b252520ad66a6cd1e852109cc9fb",
        locator: "package/LICENSE_line_1"
      }
    },
    localArtifactEvidence: copies(LOCAL_ARTIFACTS),
    rightsLayerObservations: [
      {
        layerId: "work",
        evidenceObserved: true,
        observation: "IANA tzdb LICENSE public-domain wording and moment-timezone MIT wording",
        rightsEstablished: false,
        independentRightsReviewVerified: false
      },
      {
        layerId: "version",
        evidenceObserved: true,
        observation: "IANA 2026c and moment-timezone 0.6.3 fixed by version and content digests",
        rightsEstablished: false,
        independentRightsReviewVerified: false
      },
      {
        layerId: "carrier",
        evidenceObserved: true,
        observation: "IANA data archive, detached signature, npm tarball and installed entry identities observed",
        rightsEstablished: false,
        independentRightsReviewVerified: false
      }
    ],
    storageBoundary: {
      scope: "this_evidence_record_and_its_materialization_operation_only",
      remoteResponseBodiesPersistedInThisRecord: 0,
      remoteArchivesPersistedInThisRecord: 0,
      detachedSignaturesPersistedInThisRecord: 0,
      completeRemoteLicenseBodiesPersistedInThisRecord: 0,
      urlsBytesDigestsAndMinimalQuotesPersisted: true,
      operatorRecordedPaidOrPrivateMaterialsAccessed: false,
      operatorRecordedThirdPartyBackendsOrAccountsAccessed: false,
      workspaceWideAbsenceMechanicallyVerified: false
    },
    snapshotBoundary: {
      localArtifactReadSemantics: "per_file_held_handle_same_endpoint_revalidation",
      liveRemoteObservationSemantics: "single_operator_retrieval_window_without_persisted_receipt",
      machineArtifactsUseExclusiveCreateWriter: true,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    gateSummary: {
      sourceBindingsRequired: 28,
      sourceBindingsFrozenVerified: 0,
      partialCandidatesAttached: 2,
      subjectFullySatisfied: 0,
      subjectsWithMinimalExactQuote: 2,
      minimalExactQuotesStored: 3,
      remoteBodiesPersistedInThisRecord: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      independentRightsReviewsVerified: 0,
      independentEngineeringReviewsVerified: 0,
      independentDomainExpertReviewsVerified: 0,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence: "local exact identities and existing fail_closed tzdb gate observed",
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH]
  };
  return deepFreeze({
    ...unsigned,
    evidenceDigest: computeWesternTzdb2026cSourceRightsEvidenceDigest(unsigned)
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
      fail("REMOTE_OR_PRIVATE_BODY_FIELD_FORBIDDEN", "tzdb evidence 不得保存远程正文、archive、signature、tarball 或私人数据字段。");
    }
    scanForbiddenPayload(child);
  }
}

function assertFailClosedBoundaries(ledger) {
  const gate = ledger?.gateSummary;
  if (!gate || gate.sourceBindingsRequired !== 28 || gate.sourceBindingsFrozenVerified !== 0
    || gate.partialCandidatesAttached !== 2 || gate.subjectFullySatisfied !== 0
    || gate.workRightsEstablished !== 0 || gate.versionRightsEstablished !== 0
    || gate.carrierRightsEstablished !== 0 || gate.remoteBodiesPersistedInThisRecord !== 0
    || gate.independentRightsReviewsVerified !== 0
    || gate.independentEngineeringReviewsVerified !== 0 || gate.independentDomainExpertReviewsVerified !== 0
    || gate.formalManifestIntegrated !== false || gate.formalRegistryIntegrated !== false
    || gate.ownerAdmissionAccepted !== false || gate.rightsLegalConclusionEstablished !== false
    || gate.redistributionAuthorized !== false || gate.releaseReady !== false
    || gate.publicReleaseAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "tzdb evidence 必须保持 0/28、无权利结论、无专家与无发布准入。");
  }
  if (!ARRAY_IS_ARRAY(ledger?.subjectProjections) || ledger.subjectProjections.length !== 2
    || REFLECT_APPLY(ARRAY_SOME, ledger.subjectProjections, [(entry) =>
      entry.bindingState !== "candidate_only_unbound"
      || entry.subjectFullySatisfied !== false
      || entry.frozenBindingId !== null
      || entry.countsTowardFrozenBindingGate !== false])) {
    fail("SUBJECT_PROJECTION_PROMOTION_FORBIDDEN", "tzdb subject projection 必须保持 partial candidate 与 unbound。");
  }
  if (!ledger?.snapshotBoundary || ledger.snapshotBoundary.mutationEpochReceipt !== null
    || ledger.snapshotBoundary.crossFileAtomicSnapshotEstablished !== false
    || ledger.snapshotBoundary.intervalMutationExcluded !== false
    || ledger.snapshotBoundary.abaExcluded !== false) {
    fail("SNAPSHOT_BOUNDARY_PROMOTION_FORBIDDEN", "tzdb evidence 不得声称 mutation epoch、跨文件原子性、区间完整性或 ABA 排除。");
  }
}

export function verifyWesternTzdb2026cSourceRightsEvidenceLedger(input) {
  const ledger = capturePassiveJson(input);
  scanForbiddenPayload(ledger);
  assertFailClosedBoundaries(ledger);
  if (typeof ledger.evidenceDigest !== "string" || !SHA256.test(ledger.evidenceDigest)) {
    fail("EVIDENCE_DIGEST_INVALID", "西洋 tzdb evidence 必须具有小写 SHA-256 摘要。");
  }
  if (computeWesternTzdb2026cSourceRightsEvidenceDigest(ledger) !== ledger.evidenceDigest) {
    fail("EVIDENCE_DIGEST_MISMATCH", "西洋 tzdb evidence 摘要不匹配。");
  }
  const expected = buildExpectedWesternTzdb2026cSourceRightsEvidence();
  if (canonicalStringifyWesternTzdb2026cSourceRightsEvidence(ledger)
    !== canonicalStringifyWesternTzdb2026cSourceRightsEvidence(expected)) {
    fail("EVIDENCE_CONTRACT_MISMATCH", "西洋 tzdb evidence 与固定来源、版本、载体和失败关闭合同不一致。");
  }
  return deepFreeze(ledger);
}

export function serializeWesternTzdb2026cSourceRightsEvidence(ledger) {
  return JSON_STRINGIFY(
    prettySafeValue(verifyWesternTzdb2026cSourceRightsEvidenceLedger(ledger)),
    null,
    2
  ) + "\n";
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

async function verifyBasis(workspaceRoot, ledger) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, BASIS_ARTIFACT.path);
  assertArtifactIdentity(snapshot, BASIS_ARTIFACT, "tzdb narrative basis");
  const text = decodeUtf8(snapshot.bytes, "tzdb narrative basis");
  const markers = [
    "# 阶段 C/E：西洋 IANA tzdb 2026c 来源／权利候选",
    "正式 Binding：`0/28`",
    "subjectFullySatisfied = false",
    "rightsLegalConclusionEstablished = false",
    "不构成跨文件原子快照"
  ];
  if (REFLECT_APPLY(ARRAY_SOME, markers, [(marker) => !REFLECT_APPLY(STRING_INCLUDES, text, [marker])])) {
    fail("BASIS_MARKER_MISSING", "tzdb narrative basis 缺少固定边界标记。");
  }
  if (canonicalStringifyWesternTzdb2026cSourceRightsEvidence(ledger.basisArtifacts)
    !== canonicalStringifyWesternTzdb2026cSourceRightsEvidence([{ ...BASIS_ARTIFACT }])) {
    fail("BASIS_BINDING_DRIFT", "tzdb evidence basis binding 漂移。");
  }
  return snapshot;
}

function parseStrict(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    fail("LOCAL_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

async function verifyLocalArtifacts(workspaceRoot, ledger) {
  const snapshots = [];
  for (let index = 0; index < LOCAL_ARTIFACTS.length; index += 1) {
    const expected = LOCAL_ARTIFACTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  if (canonicalStringifyWesternTzdb2026cSourceRightsEvidence(ledger.localArtifactEvidence)
    !== canonicalStringifyWesternTzdb2026cSourceRightsEvidence(copies(LOCAL_ARTIFACTS))) {
    fail("LOCAL_BINDING_DRIFT", "tzdb local artifact binding 漂移。");
  }

  const lock = parseStrict(snapshots[0], "package-lock.json");
  const lockEntry = lock?.packages?.["node_modules/moment-timezone"];
  if (!lockEntry || lockEntry.version !== "0.6.3"
    || lockEntry.resolved !== WESTERN_TZDB_2026C_REMOTE_EVIDENCE.npmTarball.url
    || lockEntry.integrity !== WESTERN_TZDB_2026C_REMOTE_EVIDENCE.npmTarball.sri
    || lockEntry.license !== "MIT") {
    fail("PACKAGE_LOCK_ENTRY_DRIFT", "moment-timezone@0.6.3 lock entry 漂移。");
  }
  const tzdbPackage = parseStrict(snapshots[1], "tzdb-core package.json");
  if (tzdbPackage?.name !== "@hakimi/tzdb-core" || tzdbPackage?.version !== "0.1.0"
    || tzdbPackage?.dependencies?.["moment-timezone"] !== "0.6.3"
    || tzdbPackage?.dependencies?.["moment-timezone-2025b"] !== "npm:moment-timezone@0.5.48") {
    fail("TZDB_PACKAGE_CONTRACT_DRIFT", "tzdb-core package contract 漂移。");
  }
  const packed = parseStrict(snapshots[6], "installed packed latest.json");
  const meta = parseStrict(snapshots[7], "installed meta latest.json");
  const installedPackage = parseStrict(snapshots[8], "installed moment-timezone package.json");
  if (packed?.version !== "2026c" || meta?.version !== "2026c"
    || !ARRAY_IS_ARRAY(packed?.zones) || packed.zones.length !== 340
    || !ARRAY_IS_ARRAY(packed?.links) || packed.links.length !== 257
    || installedPackage?.name !== "moment-timezone" || installedPackage?.version !== "0.6.3"
    || installedPackage?.license !== "MIT") {
    fail("INSTALLED_CARRIER_SEMANTICS_DRIFT", "installed moment-timezone carrier 语义漂移。");
  }
  const sourceText = decodeUtf8(snapshots[2].bytes, "tzdb-core registry");
  const verifierText = decodeUtf8(snapshots[3].bytes, "tzdb-core verifier");
  const adapterText = decodeUtf8(snapshots[4].bytes, "western civil time adapter");
  const noticesText = decodeUtf8(snapshots[5].bytes, "THIRD_PARTY_NOTICES.md");
  const licenseText = decodeUtf8(snapshots[9].bytes, "installed moment-timezone LICENSE");
  const markers = [
    [sourceText, "ianaVersion: \"2026c\""],
    [sourceText, "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81"],
    [verifierText, "hakimi-tzdb-artifact-registry-v2"],
    [verifierText, "reviewed 2025b→2026c behavior sentinel drifted"],
    [adapterText, "Raw input is never read after the"],
    [noticesText, "### `moment-timezone` 0.6.3"],
    [licenseText, "The MIT License (MIT)"]
  ];
  if (REFLECT_APPLY(ARRAY_SOME, markers, [([text, marker]) => !REFLECT_APPLY(STRING_INCLUDES, text, [marker])])) {
    fail("LOCAL_SEMANTIC_MARKER_DRIFT", "tzdb local artifact 缺少固定语义标记。");
  }
  return snapshots;
}

async function verifyFormalParents(workspaceRoot, ledger) {
  const snapshots = [];
  for (let index = 0; index < FORMAL_PARENTS.length; index += 1) {
    const expected = FORMAL_PARENTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    const parsed = parseStrict(snapshot, expected.role);
    if (parsed?.[expected.semanticDigestField] !== expected.semanticDigest) {
      fail("FORMAL_PARENT_SEMANTIC_DRIFT", `${expected.role} semantic identity 漂移。`);
    }
    const text = decodeUtf8(snapshot.bytes, expected.role);
    if (REFLECT_APPLY(STRING_INCLUDES, text, [EVIDENCE_ID])
      || REFLECT_APPLY(STRING_INCLUDES, text, [WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH])
      || REFLECT_APPLY(STRING_INCLUDES, text, [SUCCESSOR_ID])
      || REFLECT_APPLY(STRING_INCLUDES, text, [SUCCESSOR_PATH])) {
      fail("FORMAL_PARENT_BACKLINK_FORBIDDEN", "既有西洋 parent、manifest、observation 或 registry 不得反向消费 tzdb child/successor。");
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  if (canonicalStringifyWesternTzdb2026cSourceRightsEvidence(ledger.formalParents)
    !== canonicalStringifyWesternTzdb2026cSourceRightsEvidence(copies(FORMAL_PARENTS))) {
    fail("FORMAL_PARENT_BINDING_DRIFT", "tzdb evidence formal parent binding 漂移。");
  }
  const sourceDefinition = REFLECT_APPLY(ARRAY_FIND, INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS, [
    (entry) => entry.productSystemId === "western-astrology"
  ]);
  const sourceLedger = await readIndependentSourceRequirements(workspaceRoot, sourceDefinition);
  const sourceResult = await verifyIndependentSourceRequirements(workspaceRoot, sourceDefinition, sourceLedger);
  if (sourceResult.bindingRequired !== 28 || sourceResult.bindingFrozenVerified !== 0
    || sourceResult.ledgerDigest !== FORMAL_PARENTS[0].semanticDigest
    || sourceResult.ledger.gateSummary.sourceCandidatesAttached !== 0) {
    fail("WESTERN_SOURCE_PARENT_ZERO_STATE_DRIFT", "当前西洋来源 parent 必须保持 0 candidate / 0/28 frozen。");
  }
  return snapshots;
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({ path: snapshot.path, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 });
}

export async function loadWesternTzdb2026cSourceRightsEvidence(workspaceRoot = process.cwd()) {
  if (EXPECTED_PERSISTED_RAW.rawBytes <= 0 || !SHA256.test(EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("PERSISTED_IDENTITY_UNSET", "西洋 tzdb evidence raw identity 尚未冻结。");
  }
  const ledgerSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH
  );
  if (ledgerSnapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || ledgerSnapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("EVIDENCE_RAW_IDENTITY_DRIFT", "西洋 tzdb evidence raw identity 漂移。");
  }
  const ledger = verifyWesternTzdb2026cSourceRightsEvidenceLedger(
    parseWesternTzdb2026cSourceRightsEvidenceJsonBytes(ledgerSnapshot.bytes, ledgerSnapshot.path)
  );
  if (decodeUtf8(ledgerSnapshot.bytes, "西洋 tzdb evidence")
    !== serializeWesternTzdb2026cSourceRightsEvidence(ledger)) {
    fail("EVIDENCE_CANONICAL_BYTES_DRIFT", "西洋 tzdb evidence 必须保持唯一 pretty JSON 与 LF 终止。");
  }
  const basisSnapshot = await verifyBasis(workspaceRoot, ledger);
  const localSnapshots = await verifyLocalArtifacts(workspaceRoot, ledger);
  const parentSnapshots = await verifyFormalParents(workspaceRoot, ledger);
  const localArtifacts = [];
  for (let index = 0; index < localSnapshots.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, localArtifacts, [publicIdentity(localSnapshots[index])]);
  }
  const formalParents = [];
  for (let index = 0; index < parentSnapshots.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, formalParents, [publicIdentity(parentSnapshots[index])]);
  }
  const result = deepFreeze({
    ok: true,
    status: ledger.status,
    evidenceId: ledger.evidenceId,
    evidenceDigest: ledger.evidenceDigest,
    partialCandidatesAttached: ledger.gateSummary.partialCandidatesAttached,
    sourceBindingsRequired: ledger.gateSummary.sourceBindingsRequired,
    sourceBindingsFrozenVerified: ledger.gateSummary.sourceBindingsFrozenVerified,
    remoteBodiesPersistedInThisRecord: ledger.gateSummary.remoteBodiesPersistedInThisRecord,
    rightsLegalConclusionEstablished: ledger.gateSummary.rightsLegalConclusionEstablished,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    ledgerArtifact: publicIdentity(ledgerSnapshot),
    basisArtifact: publicIdentity(basisSnapshot),
    localArtifacts,
    formalParents,
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedWesternTzdb2026cSourceRightsEvidence(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const westernTzdb2026cSourceRightsEvidenceTestOnly = OBJECT_FREEZE({
  BASIS_ARTIFACT,
  EXPECTED_PERSISTED_RAW,
  FORMAL_PARENTS,
  LOCAL_ARTIFACTS,
  IANA_ARCHIVE_ENTRIES,
  NPM_TARBALL_ENTRIES,
  DOES_NOT_ESTABLISH,
  DIGEST_DOMAIN,
  EVIDENCE_ID,
  SUCCESSOR_ID,
  SUCCESSOR_PATH
});
