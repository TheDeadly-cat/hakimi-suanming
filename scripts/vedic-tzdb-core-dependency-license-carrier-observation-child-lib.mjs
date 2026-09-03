import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyVedicTzdb2026cSourceRightsEvidence as canonicalStringify
} from "./vedic-tzdb-2026c-source-rights-evidence-lib.mjs";

export const VEDIC_TZDB_CORE_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH =
  "content/system-admission/vedic-tzdb-core-dependency-license-carrier-observation-child.v1.json";

const CHILD_ID =
  "hakimi.vedic.tzdb-core-dependency-license-carrier-observation-child/1.0.0";
const RECORD_TYPE =
  "vedic_tzdb_core_dependency_license_carrier_observation_child_v1";
const STATUS =
  "three_node_local_manifest_license_and_two_packed_carriers_observed_unbound_no_legal_conclusion";
const CREATED_AT = "2026-09-01T13:08:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T13:08:07.824Z";
const DIGEST_DOMAIN =
  "hakimi.vedic.tzdb-core-dependency-license-carrier-observation-child.v1\0";
const DEFAULT_WORKSPACE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const REGEXP_TEST = RegExp.prototype.test;
const STRING_INCLUDES = String.prototype.includes;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const NATIVE_MAP = Map;
const MAP_GET = Map.prototype.get;
const MAP_SET = Map.prototype.set;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const BASIS_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "workspace_dependency_lock",
    path: "package-lock.json",
    rawBytes: 175_812,
    rawSha256: "40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d"
  }),
  OBJECT_FREEZE({
    role: "tzdb_core_package_manifest",
    path: "packages/tzdb-core/package.json",
    rawBytes: 241,
    rawSha256: "fb12b19a6f6c971185bd2f2c9226fe50ad816595e3acec4f0a0b373593136236"
  }),
  OBJECT_FREEZE({
    role: "project_third_party_notice_inventory",
    path: "THIRD_PARTY_NOTICES.md",
    rawBytes: 7_030,
    rawSha256: "d05d5d8a944cde7a739f3a64a1077fbedf706185a20e3e15c7ad423d7f0e8248"
  })
]);

const PACKAGE_SPECS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    ordinal: 1,
    relationship: "tzdb_core_direct_current_dependency",
    declaredDependencyName: "moment-timezone",
    declaredDependencySpec: "0.6.3",
    packageName: "moment-timezone",
    version: "0.6.3",
    packagePath: "node_modules/moment-timezone",
    resolved: "https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.6.3.tgz",
    integrity: "sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg==",
    declaredLicense: "MIT",
    dependencies: OBJECT_FREEZE({ moment: "^2.29.4" }),
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/moment-timezone/package.json",
      rawBytes: 1_076,
      rawSha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/moment-timezone/LICENSE",
      rawBytes: 1_097,
      rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"
    }),
    packedCarrier: OBJECT_FREEZE({
      path: "node_modules/moment-timezone/data/packed/latest.json",
      rawBytes: 715_527,
      rawSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81",
      ianaVersion: "2026c",
      zoneCount: 340,
      linkCount: 257,
      countryCount: 247
    })
  }),
  OBJECT_FREEZE({
    ordinal: 2,
    relationship: "tzdb_core_direct_retained_alias_dependency",
    declaredDependencyName: "moment-timezone-2025b",
    declaredDependencySpec: "npm:moment-timezone@0.5.48",
    packageName: "moment-timezone",
    version: "0.5.48",
    packagePath: "node_modules/moment-timezone-2025b",
    resolved: "https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.5.48.tgz",
    integrity: "sha512-f22b8LV1gbTO2ms2j2z13MuPogNoh5UzxL3nzNAYKGraILnbGc9NEE6dyiiiLv46DGRb8A4kg8UKWLjPthxBHw==",
    declaredLicense: "MIT",
    dependencies: OBJECT_FREEZE({ moment: "^2.29.4" }),
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/moment-timezone-2025b/package.json",
      rawBytes: 1_077,
      rawSha256: "4b5a6218fe37ea04bbe19f463fc2477e141bfb8ee18506bd99e871a0d25c3dad"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/moment-timezone-2025b/LICENSE",
      rawBytes: 1_097,
      rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"
    }),
    packedCarrier: OBJECT_FREEZE({
      path: "node_modules/moment-timezone-2025b/data/packed/latest.json",
      rawBytes: 727_104,
      rawSha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425",
      ianaVersion: "2025b",
      zoneCount: 340,
      linkCount: 257,
      countryCount: 247
    })
  }),
  OBJECT_FREEZE({
    ordinal: 3,
    relationship: "shared_transitive_dependency_of_both_moment_timezone_nodes",
    declaredDependencyName: "moment",
    declaredDependencySpec: "^2.29.4",
    packageName: "moment",
    version: "2.30.1",
    packagePath: "node_modules/moment",
    resolved: "https://registry.npmjs.org/moment/-/moment-2.30.1.tgz",
    integrity: "sha512-uEmtNhbDOrWPFS+hdjFCBfy9f2YoyzRpwcl+DqpC6taX21FzsTLQVbMV/W7PzNSX6x/bhC1zA3c2UQ5NzH6how==",
    declaredLicense: "MIT",
    dependencies: OBJECT_FREEZE({}),
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/moment/package.json",
      rawBytes: 3_556,
      rawSha256: "5e2f0870f4d1bbef11e8bf90babd72a4399b86b19da81de796a58457a37b8e13"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/moment/LICENSE",
      rawBytes: 1_075,
      rawSha256: "8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3"
    }),
    packedCarrier: null
  })
]);

const NOTICE_SPECS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    packageName: "moment",
    version: "2.30.1",
    requiredFragments: OBJECT_FREEZE([
      "### `moment` 2.30.1",
      "- Declared license: `MIT`",
      "- Lock path: `node_modules/moment`",
      "- Locked artifact: https://registry.npmjs.org/moment/-/moment-2.30.1.tgz",
      "- Locked integrity: `sha512-uEmtNhbDOrWPFS+hdjFCBfy9f2YoyzRpwcl+DqpC6taX21FzsTLQVbMV/W7PzNSX6x/bhC1zA3c2UQ5NzH6how==`"
    ])
  }),
  OBJECT_FREEZE({
    packageName: "moment-timezone",
    version: "0.5.48",
    requiredFragments: OBJECT_FREEZE([
      "### `moment-timezone` 0.5.48",
      "- Lock path: `node_modules/moment-timezone-2025b`",
      "- Locked artifact: https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.5.48.tgz",
      "- Locked integrity: `sha512-f22b8LV1gbTO2ms2j2z13MuPogNoh5UzxL3nzNAYKGraILnbGc9NEE6dyiiiLv46DGRb8A4kg8UKWLjPthxBHw==`"
    ])
  }),
  OBJECT_FREEZE({
    packageName: "moment-timezone",
    version: "0.6.3",
    requiredFragments: OBJECT_FREEZE([
      "### `moment-timezone` 0.6.3",
      "- Lock path: `node_modules/moment-timezone`",
      "- Locked artifact: https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.6.3.tgz",
      "- Locked integrity: `sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg==`"
    ])
  })
]);

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 12_983,
  rawSha256: "3320d773aaf6687af773d8d8a98cbc01cee1f0b83831120069e002caef766884"
});

export class VedicTzdbCoreDependencyLicenseCarrierChildError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicTzdbCoreDependencyLicenseCarrierChildError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new VedicTzdbCoreDependencyLicenseCarrierChildError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function capture(value) {
  try {
    return REFLECT_APPLY(JSON_PARSE, null, [canonicalStringify(value)]);
  } catch (cause) {
    if (cause?.code) throw cause;
    fail("INPUT_INVALID", "Vedic carrier child 只接受安全有限 JSON。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_VALUES, Object, [
    REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value])
  ]);
  for (let index = 0; index < descriptors.length; index += 1) {
    if ("value" in descriptors[index]) deepFreeze(descriptors[index].value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function safePrettyValue(value) {
  const snapshot = capture(value);
  function materialize(input) {
    if (input === null || typeof input !== "object") return input;
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [input])) {
      const output = [];
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, "toJSON", { value: null }]);
      for (let index = 0; index < input.length; index += 1) {
        REFLECT_APPLY(ARRAY_PUSH, output, [materialize(input[index])]);
      }
      return output;
    }
    const output = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
    const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [input]);
    REFLECT_APPLY(ARRAY_SORT, keys, [(left, right) => left < right ? -1 : left > right ? 1 : 0]);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [output, key, {
        value: materialize(input[key]), enumerable: true, configurable: true, writable: true
      }]);
    }
    return output;
  }
  return materialize(snapshot);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function decodeUtf8(bytes, label) {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", label + " 不是严格 UTF-8。", cause);
  }
}

function parseStrict(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: snapshot.path, bytes: snapshot.bytes });
  } catch (cause) {
    fail(cause?.code ?? "JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

function assertArtifactIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("ARTIFACT_IDENTITY_DRIFT", label + " raw identity 漂移。");
  }
}

function artifactIdentity(spec) {
  return { path: spec.path, rawBytes: spec.rawBytes, rawSha256: spec.rawSha256 };
}

function assertExactDependencies(actual, expected, label) {
  const normalized = actual === undefined ? {} : actual;
  if (!exactJson(normalized, expected)) {
    fail("DEPENDENCY_EDGE_DRIFT", label + " dependency edges 漂移。");
  }
}

function validateNoticeText(text) {
  for (let index = 0; index < NOTICE_SPECS.length; index += 1) {
    const spec = NOTICE_SPECS[index];
    for (let fragmentIndex = 0; fragmentIndex < spec.requiredFragments.length; fragmentIndex += 1) {
      if (!REFLECT_APPLY(STRING_INCLUDES, text, [spec.requiredFragments[fragmentIndex]])) {
        fail("NOTICE_ENTRY_DRIFT", spec.packageName + "@" + spec.version + " notice 条目不完整。");
      }
    }
  }
}

function validateClosure(lock, tzdbManifest) {
  const rootDependencies = {
    "moment-timezone": "0.6.3",
    "moment-timezone-2025b": "npm:moment-timezone@0.5.48"
  };
  if (tzdbManifest.name !== "@hakimi/tzdb-core" || tzdbManifest.version !== "0.1.0"
    || tzdbManifest.private !== true) {
    fail("ROOT_MANIFEST_DRIFT", "tzdb-core root identity 漂移。");
  }
  assertExactDependencies(tzdbManifest.dependencies, rootDependencies, "tzdb-core manifest");
  const rootLock = lock?.packages?.["packages/tzdb-core"];
  if (!rootLock || rootLock.name !== "@hakimi/tzdb-core" || rootLock.version !== "0.1.0") {
    fail("ROOT_LOCK_DRIFT", "tzdb-core lock root 漂移。");
  }
  assertExactDependencies(rootLock.dependencies, rootDependencies, "tzdb-core lock root");

  const visited = new NATIVE_SET();
  const queue = ["node_modules/moment-timezone", "node_modules/moment-timezone-2025b"];
  for (let index = 0; index < queue.length; index += 1) {
    const packagePath = queue[index];
    if (REFLECT_APPLY(SET_HAS, visited, [packagePath])) continue;
    REFLECT_APPLY(SET_ADD, visited, [packagePath]);
    const entry = lock.packages[packagePath];
    if (!entry) fail("LOCK_CLOSURE_NODE_MISSING", packagePath + " lock node 缺失。");
    const dependencies = entry.dependencies ?? {};
    const names = REFLECT_APPLY(OBJECT_KEYS, Object, [dependencies]);
    for (let dependencyIndex = 0; dependencyIndex < names.length; dependencyIndex += 1) {
      REFLECT_APPLY(ARRAY_PUSH, queue, ["node_modules/" + names[dependencyIndex]]);
    }
  }
  if (visited.size !== PACKAGE_SPECS.length) {
    fail("LOCK_CLOSURE_SIZE_DRIFT", "tzdb-core 第三方 lock closure 不再是三个节点。");
  }
  for (let index = 0; index < PACKAGE_SPECS.length; index += 1) {
    if (!REFLECT_APPLY(SET_HAS, visited, [PACKAGE_SPECS[index].packagePath])) {
      fail("LOCK_CLOSURE_MEMBERSHIP_DRIFT", PACKAGE_SPECS[index].packagePath + " 不在固定 closure。" );
    }
  }
}

async function loadInputs(workspaceRoot) {
  const basisSnapshots = [];
  for (let index = 0; index < BASIS_ARTIFACTS.length; index += 1) {
    const spec = BASIS_ARTIFACTS[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, spec.path);
    assertArtifactIdentity(snapshot, spec, spec.role);
    REFLECT_APPLY(ARRAY_PUSH, basisSnapshots, [snapshot]);
  }
  const lock = parseStrict(basisSnapshots[0], "package-lock.json");
  const tzdbManifest = parseStrict(basisSnapshots[1], "tzdb-core package.json");
  const noticeText = decodeUtf8(basisSnapshots[2].bytes, "THIRD_PARTY_NOTICES.md");
  validateNoticeText(noticeText);
  validateClosure(lock, tzdbManifest);

  const carriers = [];
  for (let index = 0; index < PACKAGE_SPECS.length; index += 1) {
    const spec = PACKAGE_SPECS[index];
    const manifestSnapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      spec.packageManifest.path
    );
    const licenseSnapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      spec.licenseCarrier.path
    );
    assertArtifactIdentity(manifestSnapshot, spec.packageManifest, spec.packageName + " manifest");
    assertArtifactIdentity(licenseSnapshot, spec.licenseCarrier, spec.packageName + " LICENSE");
    const manifest = parseStrict(manifestSnapshot, spec.packageName + " package.json");
    if (manifest.name !== spec.packageName || manifest.version !== spec.version
      || manifest.license !== spec.declaredLicense) {
      fail("PACKAGE_MANIFEST_SEMANTIC_DRIFT", spec.packagePath + " identity/license field 漂移。");
    }
    assertExactDependencies(manifest.dependencies, spec.dependencies, spec.packagePath + " manifest");
    const lockEntry = lock.packages[spec.packagePath];
    if (!lockEntry || lockEntry.version !== spec.version || lockEntry.resolved !== spec.resolved
      || lockEntry.integrity !== spec.integrity || lockEntry.license !== spec.declaredLicense) {
      fail("PACKAGE_LOCK_ENTRY_DRIFT", spec.packagePath + " lock identity 漂移。");
    }
    if (spec.declaredDependencyName === "moment-timezone-2025b"
      && lockEntry.name !== "moment-timezone") {
      fail("ALIAS_TARGET_DRIFT", "moment-timezone-2025b 必须锁到 moment-timezone@0.5.48。");
    }
    assertExactDependencies(lockEntry.dependencies, spec.dependencies, spec.packagePath + " lock");
    let packedSnapshot = null;
    let packed = null;
    if (spec.packedCarrier !== null) {
      packedSnapshot = await readBaziDttStableWorkspaceArtifact(
        workspaceRoot,
        spec.packedCarrier.path
      );
      assertArtifactIdentity(packedSnapshot, spec.packedCarrier, spec.packagePath + " packed carrier");
      packed = parseStrict(packedSnapshot, spec.packagePath + " packed carrier");
      if (packed.version !== spec.packedCarrier.ianaVersion
        || packed.zones?.length !== spec.packedCarrier.zoneCount
        || packed.links?.length !== spec.packedCarrier.linkCount
        || packed.countries?.length !== spec.packedCarrier.countryCount) {
        fail("PACKED_CARRIER_SEMANTIC_DRIFT", spec.packagePath + " packed carrier 漂移。");
      }
    }
    REFLECT_APPLY(ARRAY_PUSH, carriers, [{ spec, manifestSnapshot, licenseSnapshot, packedSnapshot }]);
  }
  return { basisSnapshots, carriers };
}

function carrierProjection(carrier) {
  const spec = carrier.spec;
  return {
    ordinal: spec.ordinal,
    relationship: spec.relationship,
    declaredDependencyName: spec.declaredDependencyName,
    declaredDependencySpec: spec.declaredDependencySpec,
    packageName: spec.packageName,
    version: spec.version,
    packagePath: spec.packagePath,
    lockEntry: {
      resolved: spec.resolved,
      integrity: spec.integrity,
      declaredLicense: spec.declaredLicense,
      dependencyEdges: capture(spec.dependencies),
      packageNameFieldForAlias: spec.declaredDependencyName === "moment-timezone-2025b"
        ? "moment-timezone"
        : spec.packageName
    },
    packageManifest: {
      ...artifactIdentity(spec.packageManifest),
      declaredName: spec.packageName,
      declaredVersion: spec.version,
      declaredLicense: spec.declaredLicense
    },
    licenseCarrier: {
      ...artifactIdentity(spec.licenseCarrier),
      bodyCopiedIntoChild: false,
      exactQuoteStoredInChild: false,
      authenticityEstablished: false,
      applicabilityEstablished: false
    },
    packedCarrier: spec.packedCarrier === null ? null : {
      ...artifactIdentity(spec.packedCarrier),
      ianaVersion: spec.packedCarrier.ianaVersion,
      zoneCount: spec.packedCarrier.zoneCount,
      linkCount: spec.packedCarrier.linkCount,
      countryCount: spec.packedCarrier.countryCount,
      publisherTarballByteEqualityEstablished: false,
      dataTransformationProvenanceEstablished: false
    },
    noticeObservation: {
      noticeInventory: artifactIdentity(BASIS_ARTIFACTS[2]),
      entryObserved: true,
      noticeObligationSatisfied: false,
      legalReviewComplete: false
    }
  };
}

export function computeVedicTzdbCoreDependencyLicenseCarrierChildDigest(child) {
  const unsigned = capture(child);
  delete unsigned.childDigest;
  return sha256Text(DIGEST_DOMAIN + canonicalStringify(unsigned));
}

export function buildExpectedVedicTzdbCoreDependencyLicenseCarrierChild(inputs) {
  if (!inputs || inputs.carriers?.length !== 3 || inputs.basisSnapshots?.length !== 3) {
    fail("INPUT_SET_INVALID", "carrier child 必须由三个 basis 与三个 dependency carriers 构建。");
  }
  const dependencyCarriers = [];
  for (let index = 0; index < inputs.carriers.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, dependencyCarriers, [carrierProjection(inputs.carriers[index])]);
  }
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    childId: CHILD_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    systemIdentity: {
      productSystemId: "vedic-astrology",
      contractSystemId: "vedic",
      independentSystemBoundaryPreserved: true,
      baziWesternZiweiAuthorityInherited: false
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
    basisArtifacts: BASIS_ARTIFACTS.map((spec) => ({ role: spec.role, ...artifactIdentity(spec) })),
    dependencyClosure: {
      rootPackage: "@hakimi/tzdb-core@0.1.0",
      rootManifestPath: "packages/tzdb-core/package.json",
      expectedThirdPartyNodeCount: 3,
      observedThirdPartyNodeCount: 3,
      currentSelectedPackageLockSubgraphExact: true,
      rootDeclaredDependencyEdgesExact: true,
      transitiveDependencyEdgesExact: true,
      aliasTargetExact: true,
      thirdPartyNodePaths: PACKAGE_SPECS.map((spec) => spec.packagePath),
      completeCurrentTzdbCoreThirdPartyLockClosureObserved: true,
      completeVedicProductRuntimeClosureObserved: false,
      buildAndTestToolingClosureObserved: false
    },
    dependencyCarriers,
    sourceRequirementsProjectionBoundary: {
      targetSubjectIds: [
        "vedic.input.iana_time_zone_and_tzdb_identity",
        "vedic.rule.rights_license_and_redistribution_review"
      ],
      carrierScopeOnly: true,
      bindsFormalV1: false,
      bindsNonformalV11: false,
      sourceBodyBound: false,
      formalExactQuoteBound: false,
      formalExactLocatorEstablished: false,
      subjectFullySatisfied: false,
      countsTowardFrozenBindingGate: false
    },
    rightsBoundary: {
      declaredLicenseFieldsObserved: true,
      localLicenseCarrierIdentitiesObserved: true,
      licenseAuthenticityEstablished: false,
      publisherTarballByteEqualityEstablished: false,
      licenseApplicabilityEstablished: false,
      workRightsEstablished: false,
      versionRightsEstablished: false,
      carrierRightsEstablished: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      noticeObligationSatisfied: false
    },
    gateSummary: {
      bindingRequired: 38,
      bindingFrozenVerified: 0,
      dependenciesExpected: 3,
      dependenciesObserved: 3,
      packageManifestsVerified: 3,
      licenseCarrierEndpointsVerified: 3,
      packedCarrierEndpointsVerified: 2,
      noticeEntriesObserved: 3,
      sourceBodiesCopied: 0,
      exactQuotesStored: 0,
      subjectFullySatisfied: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      legalReviewsVerified: 0,
      expertReviewsVerified: 0,
      redistributionAuthorizations: 0
    },
    observationBoundary: {
      perFileHeldHandleStableReadsUsed: true,
      strictDuplicateKeyRejectingJsonUsed: true,
      currentEndpointRevalidated: true,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    timeBoundary: {
      createdAtIsUntrustedLocalClockLabel: true,
      createdAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      trustedTimestampEstablished: false,
      externalTimeAuthorityUsed: false,
      clockRollbackExcluded: false
    },
    runtimeTrustBoundary: {
      assumesNoArbitraryPreEvaluationCodeExecution: true,
      hiddenPreEvaluationCodeExecutionExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      launcherIdentityEstablished: false,
      selectedChildIdentityBindsCliImplementation: false,
      visibleGuardIsSecurityBoundary: false,
      cliOutputTrustedAttestation: false
    },
    authorityBoundary: {
      authenticityEstablished: false,
      contentTruthEstablished: false,
      traditionalAuthorityEstablished: false,
      expertTruthEstablished: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionEstablished: false,
      formalAdmissionAuthorized: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    evidenceLedgerSeparation: {
      engineeringEvidence: "local_lock_manifest_license_notice_and_packed_carrier_identity_only",
      browserRuntimeEvidence: "not_assessed_by_this_child",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalJudgment: "not_established",
      releaseReadiness: "not_established",
      publicReleaseAuthorization: "not_authorized"
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestExcludesOwnField: true,
      digestIsDigitalSignature: false,
      authenticityEstablished: false,
      exclusiveCreateWriterRequired: true,
      canonicalPrettyJsonWithLfRequired: true
    },
    doesNotEstablish: [
      "npm_publisher_tarball_equality_or_package_authenticity",
      "license_applicability_or_notice_obligation_satisfaction",
      "work_version_or_carrier_rights",
      "legal_review_redistribution_or_publication_authorization",
      "source_binding_exact_quote_exact_locator_or_subject_satisfaction",
      "vedic_content_truth_traditional_authority_or_expert_truth",
      "browser_pwa_service_worker_product_runtime_or_release_evidence",
      "formal_current_replacement_registry_manifest_or_active_effect",
      "trusted_time_mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({
    ...unsigned,
    childDigest: computeVedicTzdbCoreDependencyLicenseCarrierChildDigest(unsigned)
  });
}

function assertFailClosed(child) {
  const gate = child?.gateSummary;
  const rights = child?.rightsBoundary;
  const authority = child?.authorityBoundary;
  const observation = child?.observationBoundary;
  const runtime = child?.runtimeTrustBoundary;
  if (!gate || gate.bindingRequired !== 38 || gate.bindingFrozenVerified !== 0
    || gate.dependenciesExpected !== 3 || gate.dependenciesObserved !== 3
    || gate.packageManifestsVerified !== 3 || gate.licenseCarrierEndpointsVerified !== 3
    || gate.packedCarrierEndpointsVerified !== 2 || gate.noticeEntriesObserved !== 3
    || gate.sourceBodiesCopied !== 0 || gate.exactQuotesStored !== 0
    || gate.subjectFullySatisfied !== 0 || gate.workRightsEstablished !== 0
    || gate.versionRightsEstablished !== 0 || gate.carrierRightsEstablished !== 0
    || gate.legalReviewsVerified !== 0 || gate.expertReviewsVerified !== 0
    || gate.redistributionAuthorizations !== 0) {
    fail("GATE_PROMOTION_FORBIDDEN", "carrier child 必须保持 0/38、三节点观察与零权利/专家/再分发。" );
  }
  const redRights = [
    "licenseAuthenticityEstablished", "publisherTarballByteEqualityEstablished",
    "licenseApplicabilityEstablished", "workRightsEstablished",
    "versionRightsEstablished", "carrierRightsEstablished",
    "rightsLegalConclusionEstablished", "redistributionAuthorized",
    "noticeObligationSatisfied"
  ];
  for (let index = 0; index < redRights.length; index += 1) {
    if (rights?.[redRights[index]] !== false) {
      fail("RIGHTS_OVERCLAIM_FORBIDDEN", redRights[index] + " 必须为 false。");
    }
  }
  const authorityKeys = REFLECT_APPLY(OBJECT_KEYS, Object, [authority ?? {}]);
  if (authorityKeys.length !== 10) fail("AUTHORITY_BOUNDARY_INVALID", "authorityBoundary 字段漂移。");
  for (let index = 0; index < authorityKeys.length; index += 1) {
    if (authority[authorityKeys[index]] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", authorityKeys[index] + " 必须为 false。");
    }
  }
  if (!observation || observation.crossFileAtomicSnapshotEstablished !== false
    || observation.mutationEpochAvailable !== false || observation.mutationEpochReceipt !== null
    || observation.intervalMutationExcluded !== false || observation.abaExcluded !== false) {
    fail("OBSERVATION_OVERCLAIM_FORBIDDEN", "mutation/atomic/interval/ABA 边界必须保持红。" );
  }
  if (!runtime || runtime.assumesNoArbitraryPreEvaluationCodeExecution !== true
    || runtime.hiddenPreEvaluationCodeExecutionExcluded !== false
    || runtime.nodeRuntimeIdentityEstablished !== false
    || runtime.loaderIdentityEstablished !== false
    || runtime.launcherIdentityEstablished !== false
    || runtime.selectedChildIdentityBindsCliImplementation !== false
    || runtime.visibleGuardIsSecurityBoundary !== false
    || runtime.cliOutputTrustedAttestation !== false) {
    fail("RUNTIME_TRUST_OVERCLAIM_FORBIDDEN", "CLI/runtime trust 边界必须保持红。" );
  }
  if (child?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || child.projectReleaseGovernanceContext.targetSchema !== 13
    || child.projectReleaseGovernanceContext.migrationId !== null
    || child.projectReleaseGovernanceContext.inheritedByVedicProductIdentity !== false
    || child.projectReleaseGovernanceContext.mutationEpochAvailableForSchema13 !== false
    || child.projectReleaseGovernanceContext.mutationEpochReceipt !== null
    || child.projectReleaseGovernanceContext.expertClaimsAuthorized !== false
    || child.projectReleaseGovernanceContext.publicDeploymentAuthorized !== false) {
    fail("PROJECT_GOVERNANCE_DRIFT", "legacy-v13/13/null 只能是未继承的项目上下文。" );
  }
  if (child?.timeBoundary?.createdAtUpperBoundObservedOnSameUntrustedLocalClock
      !== CREATED_AT_UPPER_BOUND
    || child.timeBoundary.trustedTimestampEstablished !== false
    || child.timeBoundary.externalTimeAuthorityUsed !== false
    || child.timeBoundary.clockRollbackExcluded !== false
    || Date.parse(child.createdAt) > Date.parse(CREATED_AT_UPPER_BOUND)) {
    fail("TIME_BOUNDARY_INVALID", "createdAt 必须不晚于固定的不可信本机时钟上界且不得冒充可信时间。" );
  }
}

export function verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger(input, expectedInput) {
  const child = capture(input);
  const expected = capture(expectedInput);
  assertFailClosed(child);
  if (typeof child.childDigest !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, SHA256, [child.childDigest])) {
    fail("CHILD_DIGEST_INVALID", "childDigest 必须是小写 SHA-256。" );
  }
  if (computeVedicTzdbCoreDependencyLicenseCarrierChildDigest(child) !== child.childDigest) {
    fail("CHILD_DIGEST_MISMATCH", "childDigest 不匹配。" );
  }
  if (!exactJson(child, expected)) {
    fail("CHILD_CONTRACT_MISMATCH", "carrier child 与当前固定本机载体投影不一致。" );
  }
  return deepFreeze(child);
}

export function serializeVedicTzdbCoreDependencyLicenseCarrierChild(child, expected = child) {
  return REFLECT_APPLY(JSON_STRINGIFY, null, [
    safePrettyValue(
      verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger(child, expected)
    ),
    null,
    2
  ]) + "\n";
}

export function parseVedicTzdbCoreDependencyLicenseCarrierChildArtifact(
  bytes,
  label = VEDIC_TZDB_CORE_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "CHILD_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

export async function buildCurrentVedicTzdbCoreDependencyLicenseCarrierChild(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  const inputs = await loadInputs(workspaceRoot);
  return buildExpectedVedicTzdbCoreDependencyLicenseCarrierChild(inputs);
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

export async function loadVedicTzdbCoreDependencyLicenseCarrierChild(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  const expected = await buildCurrentVedicTzdbCoreDependencyLicenseCarrierChild(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    VEDIC_TZDB_CORE_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH
  );
  if (EXPECTED_PERSISTED_RAW.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("CHILD_RAW_IDENTITY_DRIFT", "carrier child raw identity 漂移。" );
  }
  const parsed = parseVedicTzdbCoreDependencyLicenseCarrierChildArtifact(
    snapshot.bytes,
    snapshot.path
  );
  const child = verifyVedicTzdbCoreDependencyLicenseCarrierChildLedger(parsed, expected);
  const canonical = serializeVedicTzdbCoreDependencyLicenseCarrierChild(child, expected);
  if (decodeUtf8(snapshot.bytes, "carrier child") !== canonical) {
    fail("CHILD_CANONICAL_BYTES_DRIFT", "carrier child 必须保持唯一 pretty JSON 与 LF 终止。" );
  }
  const result = deepFreeze({
    ok: true,
    childId: child.childId,
    childDigest: child.childDigest,
    status: child.status,
    createdAt: child.createdAt,
    dependencyCarrierCount: child.gateSummary.dependenciesObserved,
    licenseCarrierEndpointsVerified: child.gateSummary.licenseCarrierEndpointsVerified,
    packedCarrierEndpointsVerified: child.gateSummary.packedCarrierEndpointsVerified,
    bindingRequired: child.gateSummary.bindingRequired,
    bindingFrozenVerified: child.gateSummary.bindingFrozenVerified,
    rightsLegalConclusionEstablished: child.rightsBoundary.rightsLegalConclusionEstablished,
    redistributionAuthorized: child.rightsBoundary.redistributionAuthorized,
    artifact: publicIdentity(snapshot),
    child
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getVedicTzdbCoreDependencyLicenseCarrierChildSummary(value) {
  if (!isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild(value)) {
    fail("PRIVATE_BRAND_MISSING", "summary 只接受 full-loader 私有品牌结果。" );
  }
  return OBJECT_FREEZE({
    childId: value.childId,
    childDigest: value.childDigest,
    status: value.status,
    createdAt: value.createdAt,
    dependencyCarrierCount: value.dependencyCarrierCount,
    licenseCarrierEndpointsVerified: value.licenseCarrierEndpointsVerified,
    packedCarrierEndpointsVerified: value.packedCarrierEndpointsVerified,
    bindingFrozenVerified: value.bindingFrozenVerified,
    bindingRequired: value.bindingRequired,
    rightsLegalConclusionEstablished: value.rightsLegalConclusionEstablished,
    redistributionAuthorized: value.redistributionAuthorized,
    rawBytes: value.artifact.rawBytes,
    rawSha256: value.artifact.rawSha256
  });
}

export const vedicTzdbCoreDependencyLicenseCarrierChildTestOnly = OBJECT_FREEZE({
  BASIS_ARTIFACTS,
  CHILD_ID,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  DEFAULT_WORKSPACE_ROOT,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED_RAW,
  NOTICE_SPECS,
  PACKAGE_SPECS,
  RECORD_TYPE,
  STATUS,
  exactJson,
  sha256Text
});
