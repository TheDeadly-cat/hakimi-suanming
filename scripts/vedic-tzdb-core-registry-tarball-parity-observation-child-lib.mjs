import { createHash } from "node:crypto";
import {
  mkdtemp,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";
import { gunzipSync } from "node:zlib";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import { parseTarRegularEntries } from "./audit-western-tzdb-2026c-source-rights-live.mjs";
import {
  isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild,
  loadVedicTzdbCoreDependencyLicenseCarrierChild
} from "./vedic-tzdb-core-dependency-license-carrier-observation-child-lib.mjs";
import {
  canonicalStringifyVedicTzdb2026cSourceRightsEvidence as canonicalStringify
} from "./vedic-tzdb-2026c-source-rights-evidence-lib.mjs";

export const VEDIC_TZDB_CORE_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH =
  "content/system-admission/vedic-tzdb-core-registry-tarball-parity-observation-child.v1.json";

const CHILD_ID =
  "hakimi.vedic.tzdb-core-registry-tarball-parity-observation-child/1.0.0";
const RECORD_TYPE =
  "vedic_tzdb_core_public_registry_tarball_local_carrier_parity_observation_child_v1";
const STATUS =
  "three_exact_registry_metadata_and_tarball_endpoints_eight_local_carrier_byte_parities_observed_point_in_time_unbound";
const CREATED_AT = "2026-09-01T14:43:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T14:43:30.000Z";
const OBSERVED_FROM = "2026-09-01T14:42:32.615Z";
const OBSERVED_TO = "2026-09-01T14:42:54.173Z";
const DIGEST_DOMAIN =
  "hakimi.vedic.tzdb-core-registry-tarball-parity-observation-child.v1\0";
const DEFAULT_WORKSPACE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SHA256 = /^[0-9a-f]{64}$/u;
const SHA512 = /^[0-9a-f]{128}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const MAX_METADATA_BYTES = 16_384;
const MAX_TARBALL_BYTES = 2_000_000;

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
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const BUFFER_EQUALS = Buffer.prototype.equals;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const PREDECESSOR_CHILD = OBJECT_FREEZE({
  path: "content/system-admission/vedic-tzdb-core-dependency-license-carrier-observation-child.v1.json",
  rawBytes: 12_983,
  rawSha256: "3320d773aaf6687af773d8d8a98cbc01cee1f0b83831120069e002caef766884",
  childId: "hakimi.vedic.tzdb-core-dependency-license-carrier-observation-child/1.0.0",
  childDigest: "37800051745eeff337134962eb2518c9149eab14cf8369d559419ea76cdca4d0"
});

const PACKAGE_OBSERVATIONS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    ordinal: 1,
    observationKey: "moment_timezone_0_6_3",
    relationship: "tzdb_core_direct_current_dependency",
    declaredDependencyName: "moment-timezone",
    packageName: "moment-timezone",
    version: "0.6.3",
    packagePath: "node_modules/moment-timezone",
    metadataEndpoint: "https://registry.npmjs.org/moment-timezone/0.6.3",
    metadataIdentity: OBJECT_FREEZE({
      rawBytes: 2_169,
      rawSha256: "a07e166a0c52c2ab80472140349d6569c318df013e3c3d27fec50291ff8ef6d0"
    }),
    dist: OBJECT_FREEZE({
      integrity: "sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg==",
      shasum: "e386bad3116567a44477653ad6543b071bc153b7",
      tarball: "https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.6.3.tgz"
    }),
    tarballIdentity: OBJECT_FREEZE({
      rawBytes: 238_621,
      rawSha1: "e386bad3116567a44477653ad6543b071bc153b7",
      rawSha256: "09cc398dae4d95db31016e6e3e35eafff09244a72e0511a292702738e7c724ac",
      rawSha512: "a5510f03f1c21471dbc09d77d32c27cd8b99a6410670fe8369afcec0d79ba40d7c3326de1479908a50061a8bd78168a343cbd0b66b9df6366bce250182cca47e",
      sriSha512: "sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg=="
    }),
    packedSemantics: OBJECT_FREEZE({
      ianaVersion: "2026c", zoneCount: 340, linkCount: 257, countryCount: 247
    }),
    selectedEntries: OBJECT_FREEZE([
      OBJECT_FREEZE({
        role: "package_manifest",
        relativePath: "package.json",
        tarPath: "package/package.json",
        localPath: "node_modules/moment-timezone/package.json",
        rawBytes: 1_076,
        rawSha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b"
      }),
      OBJECT_FREEZE({
        role: "license_carrier",
        relativePath: "LICENSE",
        tarPath: "package/LICENSE",
        localPath: "node_modules/moment-timezone/LICENSE",
        rawBytes: 1_097,
        rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"
      }),
      OBJECT_FREEZE({
        role: "packed_tzdb_carrier",
        relativePath: "data/packed/latest.json",
        tarPath: "package/data/packed/latest.json",
        localPath: "node_modules/moment-timezone/data/packed/latest.json",
        rawBytes: 715_527,
        rawSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81"
      })
    ])
  }),
  OBJECT_FREEZE({
    ordinal: 2,
    observationKey: "moment_timezone_alias_0_5_48",
    relationship: "tzdb_core_direct_retained_alias_dependency",
    declaredDependencyName: "moment-timezone-2025b",
    packageName: "moment-timezone",
    version: "0.5.48",
    packagePath: "node_modules/moment-timezone-2025b",
    metadataEndpoint: "https://registry.npmjs.org/moment-timezone/0.5.48",
    metadataIdentity: OBJECT_FREEZE({
      rawBytes: 2_170,
      rawSha256: "4eaf51fb08eb703ff0c513831e2c9dd8100d70121bd020d12cd5c31f6a5c94b6"
    }),
    dist: OBJECT_FREEZE({
      integrity: "sha512-f22b8LV1gbTO2ms2j2z13MuPogNoh5UzxL3nzNAYKGraILnbGc9NEE6dyiiiLv46DGRb8A4kg8UKWLjPthxBHw==",
      shasum: "111727bb274734a518ae154b5ca589283f058967",
      tarball: "https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.5.48.tgz"
    }),
    tarballIdentity: OBJECT_FREEZE({
      rawBytes: 238_671,
      rawSha1: "111727bb274734a518ae154b5ca589283f058967",
      rawSha256: "2c95a267b09e2d3d0fe1511901f05f7d62c806f8e34a35323382c6d3956df826",
      rawSha512: "7f6d9bf0b57581b4ceda6b368f6cf5dccb8fa20368879533c4bde7ccd018286ada20b9db19cf4d104e9dca28a22efe3a0c645bf00e2483c50a58b8cfb61c411f",
      sriSha512: "sha512-f22b8LV1gbTO2ms2j2z13MuPogNoh5UzxL3nzNAYKGraILnbGc9NEE6dyiiiLv46DGRb8A4kg8UKWLjPthxBHw=="
    }),
    packedSemantics: OBJECT_FREEZE({
      ianaVersion: "2025b", zoneCount: 340, linkCount: 257, countryCount: 247
    }),
    selectedEntries: OBJECT_FREEZE([
      OBJECT_FREEZE({
        role: "package_manifest",
        relativePath: "package.json",
        tarPath: "package/package.json",
        localPath: "node_modules/moment-timezone-2025b/package.json",
        rawBytes: 1_077,
        rawSha256: "4b5a6218fe37ea04bbe19f463fc2477e141bfb8ee18506bd99e871a0d25c3dad"
      }),
      OBJECT_FREEZE({
        role: "license_carrier",
        relativePath: "LICENSE",
        tarPath: "package/LICENSE",
        localPath: "node_modules/moment-timezone-2025b/LICENSE",
        rawBytes: 1_097,
        rawSha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"
      }),
      OBJECT_FREEZE({
        role: "packed_tzdb_carrier",
        relativePath: "data/packed/latest.json",
        tarPath: "package/data/packed/latest.json",
        localPath: "node_modules/moment-timezone-2025b/data/packed/latest.json",
        rawBytes: 727_104,
        rawSha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425"
      })
    ])
  }),
  OBJECT_FREEZE({
    ordinal: 3,
    observationKey: "moment_2_30_1",
    relationship: "shared_transitive_dependency_of_both_moment_timezone_nodes",
    declaredDependencyName: "moment",
    packageName: "moment",
    version: "2.30.1",
    packagePath: "node_modules/moment",
    metadataEndpoint: "https://registry.npmjs.org/moment/2.30.1",
    metadataIdentity: OBJECT_FREEZE({
      rawBytes: 3_669,
      rawSha256: "98e09e47dde58be32311ad46b8dcb072c6468f37cefd4249e2eda3a211ae9525"
    }),
    dist: OBJECT_FREEZE({
      integrity: "sha512-uEmtNhbDOrWPFS+hdjFCBfy9f2YoyzRpwcl+DqpC6taX21FzsTLQVbMV/W7PzNSX6x/bhC1zA3c2UQ5NzH6how==",
      shasum: "f8c91c07b7a786e30c59926df530b4eac96974ae",
      tarball: "https://registry.npmjs.org/moment/-/moment-2.30.1.tgz"
    }),
    tarballIdentity: OBJECT_FREEZE({
      rawBytes: 715_526,
      rawSha1: "f8c91c07b7a786e30c59926df530b4eac96974ae",
      rawSha256: "52219a9fee5e1faade4c72536c173c54cedd5e2619272dd0c251a30aeafcde8c",
      rawSha512: "b849ad3616c33ab58f152fa176314205fcbd7f6628cb3469c1c97e0eaa42ead697db5173b132d055b315fd6ecfccd497eb1fdb842d73037736510e4dcc7ea1a3",
      sriSha512: "sha512-uEmtNhbDOrWPFS+hdjFCBfy9f2YoyzRpwcl+DqpC6taX21FzsTLQVbMV/W7PzNSX6x/bhC1zA3c2UQ5NzH6how=="
    }),
    packedSemantics: null,
    selectedEntries: OBJECT_FREEZE([
      OBJECT_FREEZE({
        role: "package_manifest",
        relativePath: "package.json",
        tarPath: "package/package.json",
        localPath: "node_modules/moment/package.json",
        rawBytes: 3_556,
        rawSha256: "5e2f0870f4d1bbef11e8bf90babd72a4399b86b19da81de796a58457a37b8e13"
      }),
      OBJECT_FREEZE({
        role: "license_carrier",
        relativePath: "LICENSE",
        tarPath: "package/LICENSE",
        localPath: "node_modules/moment/LICENSE",
        rawBytes: 1_075,
        rawSha256: "8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3"
      })
    ])
  })
]);

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 19_758,
  rawSha256: "8c6cbafa49a2ff4b5c453a7c43fd9474aff338b05b1c0a5b32f303bd0cf5d074"
});

export class VedicTzdbCoreRegistryTarballParityChildError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicTzdbCoreRegistryTarballParityChildError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new VedicTzdbCoreRegistryTarballParityChildError(
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
    fail("INPUT_INVALID", "Registry parity child 只接受安全有限 JSON。", cause);
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

function digestBytes(algorithm, bytes, encoding = "hex") {
  const hash = createHash(algorithm);
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, [encoding]);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function byteIdentity(bytes) {
  return OBJECT_FREEZE({
    rawBytes: bytes.byteLength,
    rawSha1: digestBytes("sha1", bytes),
    rawSha256: digestBytes("sha256", bytes),
    rawSha512: digestBytes("sha512", bytes),
    sriSha512: `sha512-${digestBytes("sha512", bytes, "base64")}`
  });
}

function publicIdentity(spec) {
  return { path: spec.path, rawBytes: spec.rawBytes, rawSha256: spec.rawSha256 };
}

function assertPredecessor(result) {
  if (!isVerifiedVedicTzdbCoreDependencyLicenseCarrierChild(result)) {
    fail("PREDECESSOR_PRIVATE_BRAND_MISSING", "必须先通过 predecessor child full loader。" );
  }
  if (result.childId !== PREDECESSOR_CHILD.childId
    || result.childDigest !== PREDECESSOR_CHILD.childDigest
    || result.artifact?.path !== PREDECESSOR_CHILD.path
    || result.artifact?.rawBytes !== PREDECESSOR_CHILD.rawBytes
    || result.artifact?.rawSha256 !== PREDECESSOR_CHILD.rawSha256) {
    fail("PREDECESSOR_IDENTITY_DRIFT", "本地 carrier predecessor identity 漂移。" );
  }
  return result.child;
}

function matchingLocalCarrier(predecessor, spec, entry) {
  const carrier = predecessor.dependencyCarriers.find((candidate) =>
    candidate.declaredDependencyName === spec.declaredDependencyName
      && candidate.packageName === spec.packageName
      && candidate.version === spec.version
      && candidate.packagePath === spec.packagePath
  );
  if (!carrier) fail("PREDECESSOR_PACKAGE_PROJECTION_DRIFT", spec.observationKey + " 缺少 predecessor carrier。" );
  let local;
  if (entry.role === "package_manifest") local = carrier.packageManifest;
  if (entry.role === "license_carrier") local = carrier.licenseCarrier;
  if (entry.role === "packed_tzdb_carrier") local = carrier.packedCarrier;
  if (!local || local.path !== entry.localPath || local.rawBytes !== entry.rawBytes
    || local.rawSha256 !== entry.rawSha256) {
    fail("PREDECESSOR_ENTRY_PROJECTION_DRIFT", entry.localPath + " 与 predecessor 不一致。" );
  }
  if (carrier.lockEntry?.integrity !== spec.dist.integrity
    || carrier.lockEntry?.resolved !== spec.dist.tarball
    || carrier.packageManifest?.declaredName !== spec.packageName
    || carrier.packageManifest?.declaredVersion !== spec.version) {
    fail("PREDECESSOR_LOCK_PROJECTION_DRIFT", spec.observationKey + " lock/manifest 投影漂移。" );
  }
  return local;
}

function packageProjection(predecessor, spec) {
  const selectedEntries = spec.selectedEntries.map((entry) => {
    matchingLocalCarrier(predecessor, spec, entry);
    return {
      role: entry.role,
      tarPath: entry.tarPath,
      localPath: entry.localPath,
      tarEntryIdentity: { rawBytes: entry.rawBytes, rawSha256: entry.rawSha256 },
      localCarrierIdentity: { rawBytes: entry.rawBytes, rawSha256: entry.rawSha256 },
      exactByteEqualityObserved: true
    };
  });
  return {
    ordinal: spec.ordinal,
    observationKey: spec.observationKey,
    relationship: spec.relationship,
    declaredDependencyName: spec.declaredDependencyName,
    packageName: spec.packageName,
    version: spec.version,
    packagePath: spec.packagePath,
    metadataObservation: {
      endpoint: spec.metadataEndpoint,
      httpStatus: 200,
      finalUrlExact: true,
      strictDuplicateKeyRejectingJsonUsed: true,
      rawIdentity: { ...spec.metadataIdentity },
      etagObserved: null,
      lastModifiedObserved: null,
      rawIdentityStableAcrossTimeEstablished: false
    },
    distProjection: { ...spec.dist },
    tarballObservation: {
      endpoint: spec.dist.tarball,
      httpStatus: 200,
      finalUrlExact: true,
      rawIdentity: { ...spec.tarballIdentity },
      distIntegrityMatchesObservedSha512: true,
      distShasumMatchesObservedSha1: true,
      packageLockIntegrityMatchesDistIntegrity: true,
      packageLockResolvedMatchesDistTarball: true
    },
    selectedEntries,
    packageManifestSemantics: {
      name: spec.packageName, version: spec.version, declaredLicense: "MIT"
    },
    packedSemantics: spec.packedSemantics === null ? null : { ...spec.packedSemantics },
    publicRegistryTarballToCurrentLocalCarrierByteParityObserved: true,
    publisherIdentityVerified: false,
    packageSignatureVerified: false,
    registryFirstSeenEstablished: false,
    packageAuthenticityEstablished: false
  };
}

export function computeVedicTzdbCoreRegistryTarballParityChildDigest(child) {
  const unsigned = capture(child);
  delete unsigned.childDigest;
  return sha256Text(DIGEST_DOMAIN + canonicalStringify(unsigned));
}

export function buildExpectedVedicTzdbCoreRegistryTarballParityChild(predecessorResult) {
  const predecessor = assertPredecessor(predecessorResult);
  const packageParityObservations = PACKAGE_OBSERVATIONS.map((spec) =>
    packageProjection(predecessor, spec)
  );
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
    lineage: {
      localCarrierChild: {
        ...publicIdentity(PREDECESSOR_CHILD),
        childId: PREDECESSOR_CHILD.childId,
        childDigest: PREDECESSOR_CHILD.childDigest,
        relationship: "append_only_external_carrier_parity_observation"
      },
      predecessorModified: false,
      predecessorBacklinkAdded: false
    },
    registryObservationBoundary: {
      observedWindow: { startedAt: OBSERVED_FROM, endedAt: OBSERVED_TO },
      pointInTimeObservationOnly: true,
      publicHttpsRegistryHost: "registry.npmjs.org",
      exactVersionMetadataEndpointsObserved: 3,
      exactTarballEndpointsObserved: 3,
      redirectsAccepted: false,
      authenticatedSessionUsed: false,
      credentialsAccessed: false,
      thirdPartyPrivateBackendAccessed: false,
      metadataRawBodiesPersistedInWorkspace: false,
      tarballBodiesPersistedInWorkspace: false,
      tlsEstablishesPublisherIdentity: false,
      publisherAccountIdentityVerified: false,
      packageSignatureVerified: false,
      firstSeenOrPublicationTimeEstablished: false
    },
    temporaryExecutionBoundary: {
      systemTemporaryDirectoryParentVerified: true,
      randomChildDirectoryUsed: true,
      targetRevalidatedBeforeRecursiveCleanup: true,
      cleanupVerifiedAfterObservation: true,
      temporaryDirectoryPathPersisted: false,
      lifecycleScriptsExecuted: false,
      npmInstallExecuted: false,
      npmPackExecuted: false,
      archiveEntriesParsedInMemory: true
    },
    packageParityObservations,
    sourceRequirementsProjectionBoundary: {
      targetSubjectIds: [
        "vedic.input.iana_time_zone_and_tzdb_identity",
        "vedic.rule.rights_license_and_redistribution_review"
      ],
      supplementsExistingPartialCandidatesOnly: true,
      newCandidateIdAdded: false,
      inheritedPartialCandidateCount: 2,
      sourceBodyBound: false,
      formalExactQuoteBound: false,
      formalExactLocatorEstablished: false,
      subjectFullySatisfied: false,
      countsTowardFrozenBindingGate: false
    },
    rightsBoundary: {
      publicRegistryTarballToLocalCarrierByteParityObserved: true,
      publisherAuthenticatedTarballParityEstablished: false,
      licenseAuthenticityEstablished: false,
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
      inheritedPartialCandidates: 2,
      newCandidateIdsAdded: 0,
      metadataEndpointsObserved: 3,
      tarballEndpointsObserved: 3,
      packageManifestByteParitiesObserved: 3,
      licenseCarrierByteParitiesObserved: 3,
      packedCarrierByteParitiesObserved: 2,
      selectedEntryByteParitiesObserved: 8,
      sourceBodiesBound: 0,
      exactQuotesBound: 0,
      exactLocatorsEstablished: 0,
      subjectFullySatisfied: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      legalReviewsVerified: 0,
      expertReviewsVerified: 0,
      redistributionAuthorizations: 0
    },
    observationBoundary: {
      localPerFileHeldHandleStableReadsUsed: true,
      strictDuplicateKeyRejectingJsonUsedForMetadataAndSelectedJsonEntries: true,
      currentLocalEndpointsRevalidatedByPredecessorFullLoader: true,
      remoteAndLocalCrossFileAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossNetworkAndLocalFiles: false,
      abaExcluded: false
    },
    timeBoundary: {
      createdAtIsUntrustedLocalClockLabel: true,
      createdAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      remoteHttpDateUsedAsTimeAuthority: false,
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
      engineeringEvidence: "point_in_time_public_registry_tarball_lock_and_current_local_carrier_byte_parity_only",
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
      "npm_publisher_account_identity_package_signature_first_seen_or_authenticity",
      "license_authenticity_applicability_or_notice_obligation_satisfaction",
      "work_version_or_carrier_rights_legal_conclusion_or_redistribution",
      "source_body_exact_quote_exact_locator_new_candidate_or_subject_satisfaction",
      "vedic_content_truth_traditional_authority_or_expert_truth",
      "browser_pwa_service_worker_product_runtime_or_release_evidence",
      "formal_current_replacement_registry_manifest_owner_or_active_effect",
      "trusted_time_mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({
    ...unsigned,
    childDigest: computeVedicTzdbCoreRegistryTarballParityChildDigest(unsigned)
  });
}

function assertFailClosed(child) {
  const gate = child?.gateSummary;
  const rights = child?.rightsBoundary;
  const authority = child?.authorityBoundary;
  const observation = child?.observationBoundary;
  const runtime = child?.runtimeTrustBoundary;
  if (!gate || gate.bindingRequired !== 38 || gate.bindingFrozenVerified !== 0
    || gate.inheritedPartialCandidates !== 2 || gate.newCandidateIdsAdded !== 0
    || gate.metadataEndpointsObserved !== 3 || gate.tarballEndpointsObserved !== 3
    || gate.packageManifestByteParitiesObserved !== 3
    || gate.licenseCarrierByteParitiesObserved !== 3
    || gate.packedCarrierByteParitiesObserved !== 2
    || gate.selectedEntryByteParitiesObserved !== 8
    || gate.sourceBodiesBound !== 0 || gate.exactQuotesBound !== 0
    || gate.exactLocatorsEstablished !== 0 || gate.subjectFullySatisfied !== 0
    || gate.workRightsEstablished !== 0 || gate.versionRightsEstablished !== 0
    || gate.carrierRightsEstablished !== 0 || gate.legalReviewsVerified !== 0
    || gate.expertReviewsVerified !== 0 || gate.redistributionAuthorizations !== 0) {
    fail("GATE_PROMOTION_FORBIDDEN", "Registry parity child 必须保持两项 partial、0/38 与零权利/专家/再分发。" );
  }
  if (rights?.publicRegistryTarballToLocalCarrierByteParityObserved !== true
    || rights.publisherAuthenticatedTarballParityEstablished !== false
    || rights.licenseAuthenticityEstablished !== false
    || rights.licenseApplicabilityEstablished !== false
    || rights.workRightsEstablished !== false || rights.versionRightsEstablished !== false
    || rights.carrierRightsEstablished !== false
    || rights.rightsLegalConclusionEstablished !== false
    || rights.redistributionAuthorized !== false
    || rights.noticeObligationSatisfied !== false) {
    fail("RIGHTS_OVERCLAIM_FORBIDDEN", "公开 Registry 字节一致不得升级为 publisher、许可或三层权利结论。" );
  }
  const authorityKeys = REFLECT_APPLY(OBJECT_KEYS, Object, [authority ?? {}]);
  if (authorityKeys.length !== 10) fail("AUTHORITY_BOUNDARY_INVALID", "authorityBoundary 字段漂移。" );
  for (let index = 0; index < authorityKeys.length; index += 1) {
    if (authority[authorityKeys[index]] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", authorityKeys[index] + " 必须为 false。" );
    }
  }
  if (!observation || observation.remoteAndLocalCrossFileAtomicSnapshotEstablished !== false
    || observation.mutationEpochAvailable !== false || observation.mutationEpochReceipt !== null
    || observation.intervalMutationExcludedAcrossNetworkAndLocalFiles !== false
    || observation.abaExcluded !== false) {
    fail("OBSERVATION_OVERCLAIM_FORBIDDEN", "mutation/atomic/interval/ABA 边界必须保持红。" );
  }
  if (!runtime || runtime.hiddenPreEvaluationCodeExecutionExcluded !== false
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
    || Date.parse(child.createdAt) > Date.parse(CREATED_AT_UPPER_BOUND)
    || Date.parse(OBSERVED_FROM) > Date.parse(OBSERVED_TO)
    || Date.parse(OBSERVED_TO) > Date.parse(CREATED_AT_UPPER_BOUND)) {
    fail("TIME_BOUNDARY_INVALID", "观察窗口与 createdAt 只能是不可信本机时钟标签。" );
  }
}

export function verifyVedicTzdbCoreRegistryTarballParityChildLedger(
  input,
  predecessorResult
) {
  const child = capture(input);
  assertPredecessor(predecessorResult);
  assertFailClosed(child);
  if (typeof child.childDigest !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, SHA256, [child.childDigest])) {
    fail("CHILD_DIGEST_INVALID", "childDigest 必须是小写 SHA-256。" );
  }
  if (computeVedicTzdbCoreRegistryTarballParityChildDigest(child) !== child.childDigest) {
    fail("CHILD_DIGEST_MISMATCH", "childDigest 不匹配。" );
  }
  const expected = buildExpectedVedicTzdbCoreRegistryTarballParityChild(predecessorResult);
  if (!exactJson(child, expected)) {
    fail("CHILD_CONTRACT_MISMATCH", "Registry parity child 与固定点时观察/当前 predecessor 不一致。" );
  }
  return deepFreeze(child);
}

export function serializeVedicTzdbCoreRegistryTarballParityChild(child, predecessorResult) {
  return REFLECT_APPLY(JSON_STRINGIFY, null, [
    safePrettyValue(
      verifyVedicTzdbCoreRegistryTarballParityChildLedger(child, predecessorResult)
    ),
    null,
    2
  ]) + "\n";
}

export function parseVedicTzdbCoreRegistryTarballParityChildArtifact(
  bytes,
  label = VEDIC_TZDB_CORE_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH
) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "CHILD_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

export async function buildCurrentVedicTzdbCoreRegistryTarballParityChild(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  const predecessor = await loadVedicTzdbCoreDependencyLicenseCarrierChild(workspaceRoot);
  return buildExpectedVedicTzdbCoreRegistryTarballParityChild(predecessor);
}

export async function loadVedicTzdbCoreRegistryTarballParityChild(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  const predecessor = await loadVedicTzdbCoreDependencyLicenseCarrierChild(workspaceRoot);
  const expected = buildExpectedVedicTzdbCoreRegistryTarballParityChild(predecessor);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    VEDIC_TZDB_CORE_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH
  );
  if (EXPECTED_PERSISTED_RAW.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("CHILD_RAW_IDENTITY_DRIFT", "Registry parity child raw identity 漂移。" );
  }
  const parsed = parseVedicTzdbCoreRegistryTarballParityChildArtifact(
    snapshot.bytes,
    snapshot.path
  );
  const child = verifyVedicTzdbCoreRegistryTarballParityChildLedger(
    parsed,
    predecessor
  );
  const canonical = serializeVedicTzdbCoreRegistryTarballParityChild(child, predecessor);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
  if (decoded !== canonical) {
    fail("CHILD_CANONICAL_BYTES_DRIFT", "Registry parity child 必须保持唯一 pretty JSON 与 LF 终止。" );
  }
  const result = deepFreeze({
    ok: true,
    childId: child.childId,
    childDigest: child.childDigest,
    status: child.status,
    metadataEndpointsObserved: child.gateSummary.metadataEndpointsObserved,
    tarballEndpointsObserved: child.gateSummary.tarballEndpointsObserved,
    selectedEntryByteParitiesObserved: child.gateSummary.selectedEntryByteParitiesObserved,
    bindingRequired: child.gateSummary.bindingRequired,
    bindingFrozenVerified: child.gateSummary.bindingFrozenVerified,
    inheritedPartialCandidates: child.gateSummary.inheritedPartialCandidates,
    rightsLegalConclusionEstablished: child.rightsBoundary.rightsLegalConclusionEstablished,
    redistributionAuthorized: child.rightsBoundary.redistributionAuthorized,
    artifact: OBJECT_FREEZE({
      path: snapshot.path,
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    }),
    child
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicTzdbCoreRegistryTarballParityChild(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getVedicTzdbCoreRegistryTarballParityChildSummary(value) {
  if (!isVerifiedVedicTzdbCoreRegistryTarballParityChild(value)) {
    fail("PRIVATE_BRAND_MISSING", "summary 只接受 full-loader 私有品牌结果。" );
  }
  return OBJECT_FREEZE({
    childId: value.childId,
    childDigest: value.childDigest,
    status: value.status,
    metadataEndpointsObserved: value.metadataEndpointsObserved,
    tarballEndpointsObserved: value.tarballEndpointsObserved,
    selectedEntryByteParitiesObserved: value.selectedEntryByteParitiesObserved,
    inheritedPartialCandidates: value.inheritedPartialCandidates,
    bindingFrozenVerified: value.bindingFrozenVerified,
    bindingRequired: value.bindingRequired,
    rightsLegalConclusionEstablished: value.rightsLegalConclusionEstablished,
    redistributionAuthorized: value.redistributionAuthorized,
    rawBytes: value.artifact.rawBytes,
    rawSha256: value.artifact.rawSha256
  });
}

function assertFixedPublicHttps(value, expected) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (cause) {
    fail("REMOTE_URL_INVALID", "Registry URL 无效。", cause);
  }
  if (parsed.href !== expected || parsed.protocol !== "https:"
    || parsed.hostname !== "registry.npmjs.org" || parsed.port !== ""
    || parsed.username !== "" || parsed.password !== "") {
    fail("REMOTE_URL_FORBIDDEN", "只允许固定 registry.npmjs.org HTTPS endpoint。" );
  }
  return parsed.href;
}

async function readResponseBounded(response, limit, label) {
  if (response.body === null) fail("REMOTE_BODY_MISSING", label + " 缺少 body。" );
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        fail("REMOTE_BODY_LIMIT_EXCEEDED", label + " 超过读取上限。" );
      }
      REFLECT_APPLY(ARRAY_PUSH, chunks, [Buffer.from(value)]);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function fetchExact(url, limit, label, fetchImpl) {
  const fixed = assertFixedPublicHttps(url, url);
  let response;
  try {
    response = await fetchImpl(fixed, {
      method: "GET",
      redirect: "error",
      headers: { accept: label === "metadata" ? "application/json" : "application/octet-stream" },
      signal: AbortSignal.timeout(30_000)
    });
  } catch (cause) {
    fail("REMOTE_FETCH_FAILED", label + " 获取失败。", cause);
  }
  if (response.status !== 200 || response.url !== fixed) {
    fail("REMOTE_ENDPOINT_MISMATCH", label + " status/final URL 漂移。" );
  }
  return readResponseBounded(response, limit, label);
}

function assertObservedIdentity(bytes, expected, label) {
  const observed = byteIdentity(bytes);
  if (observed.rawBytes !== expected.rawBytes
    || observed.rawSha256 !== expected.rawSha256
    || (expected.rawSha1 !== undefined && observed.rawSha1 !== expected.rawSha1)
    || (expected.rawSha512 !== undefined && observed.rawSha512 !== expected.rawSha512)
    || (expected.sriSha512 !== undefined && observed.sriSha512 !== expected.sriSha512)) {
    fail("REMOTE_IDENTITY_DRIFT", label + " raw identity 漂移。" );
  }
  return observed;
}

function parseStrictRemoteJson(bytes, label) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "REMOTE_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

function verifyPackedSemantics(parsed, expected, label) {
  if (expected === null) return;
  if (parsed?.version !== expected.ianaVersion
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [parsed?.zones])
    || parsed.zones.length !== expected.zoneCount
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [parsed?.links])
    || parsed.links.length !== expected.linkCount
    || !REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [parsed?.countries])
    || parsed.countries.length !== expected.countryCount) {
    fail("PACKED_SEMANTICS_DRIFT", label + " packed semantics 漂移。" );
  }
}

export async function runLiveVedicTzdbCoreRegistryTarballParityObservation(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT,
  options = {}
) {
  const predecessorResult = await loadVedicTzdbCoreDependencyLicenseCarrierChild(workspaceRoot);
  const predecessor = assertPredecessor(predecessorResult);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") fail("FETCH_UNAVAILABLE", "fetch 不可用。" );
  const systemTempRoot = path.resolve(options.systemTempRoot ?? tmpdir());
  const prefix = path.join(systemTempRoot, "hakimi-vedic-registry-parity-");
  let temporaryDirectory;
  let caught;
  let cleanupVerified = false;
  const observedFrom = new Date().toISOString();
  const packageResults = [];
  try {
    temporaryDirectory = path.resolve(await mkdtemp(prefix));
    if (path.dirname(temporaryDirectory) !== systemTempRoot
      || !path.basename(temporaryDirectory).startsWith("hakimi-vedic-registry-parity-")) {
      fail("TEMP_DIRECTORY_ESCAPE", "临时目录不在已验证的系统 temp 下。" );
    }
    for (let index = 0; index < PACKAGE_OBSERVATIONS.length; index += 1) {
      const spec = PACKAGE_OBSERVATIONS[index];
      const metadataBytes = await fetchExact(
        spec.metadataEndpoint,
        MAX_METADATA_BYTES,
        "metadata",
        fetchImpl
      );
      assertObservedIdentity(metadataBytes, spec.metadataIdentity, spec.observationKey + " metadata");
      await writeFile(
        path.join(temporaryDirectory, spec.observationKey + ".metadata.json"),
        metadataBytes,
        { flag: "wx" }
      );
      const metadata = parseStrictRemoteJson(
        metadataBytes,
        "remote:" + spec.metadataEndpoint
      );
      if (metadata?.name !== spec.packageName || metadata.version !== spec.version
        || metadata?.dist?.integrity !== spec.dist.integrity
        || metadata?.dist?.shasum !== spec.dist.shasum
        || metadata?.dist?.tarball !== spec.dist.tarball) {
        fail("REMOTE_METADATA_SEMANTICS_DRIFT", spec.observationKey + " metadata dist 漂移。" );
      }
      const tarballBytes = await fetchExact(
        spec.dist.tarball,
        MAX_TARBALL_BYTES,
        "tarball",
        fetchImpl
      );
      const tarballIdentity = assertObservedIdentity(
        tarballBytes,
        spec.tarballIdentity,
        spec.observationKey + " tarball"
      );
      if (tarballIdentity.sriSha512 !== metadata.dist.integrity
        || tarballIdentity.rawSha1 !== metadata.dist.shasum) {
        fail("REMOTE_DIST_DIGEST_MISMATCH", spec.observationKey + " dist digest 不匹配。" );
      }
      await writeFile(
        path.join(temporaryDirectory, spec.observationKey + ".tgz"),
        tarballBytes,
        { flag: "wx" }
      );
      let entries;
      try {
        entries = parseTarRegularEntries(gunzipSync(tarballBytes));
      } catch (cause) {
        fail(cause?.code ?? "TARBALL_INVALID", spec.observationKey + " tarball 无法安全解析。", cause);
      }
      const entryResults = [];
      for (let entryIndex = 0; entryIndex < spec.selectedEntries.length; entryIndex += 1) {
        const entry = spec.selectedEntries[entryIndex];
        matchingLocalCarrier(predecessor, spec, entry);
        const tarEntryBytes = entries.get(entry.tarPath);
        if (!tarEntryBytes) fail("TARBALL_ENTRY_MISSING", entry.tarPath + " 缺失。" );
        assertObservedIdentity(tarEntryBytes, entry, entry.tarPath);
        const localSnapshot = await readBaziDttStableWorkspaceArtifact(
          workspaceRoot,
          entry.localPath
        );
        if (localSnapshot.rawBytes !== entry.rawBytes
          || localSnapshot.rawSha256 !== entry.rawSha256
          || !REFLECT_APPLY(BUFFER_EQUALS, tarEntryBytes, [localSnapshot.bytes])) {
          fail("LOCAL_TARBALL_PARITY_DRIFT", entry.localPath + " 与 tar entry 不再字节相等。" );
        }
        if (entry.role === "package_manifest") {
          const manifest = parseStrictRemoteJson(tarEntryBytes, "tar:" + entry.tarPath);
          if (manifest?.name !== spec.packageName || manifest.version !== spec.version
            || manifest.license !== "MIT") {
            fail("PACKAGE_MANIFEST_SEMANTICS_DRIFT", entry.tarPath + " manifest 漂移。" );
          }
        }
        if (entry.role === "packed_tzdb_carrier") {
          verifyPackedSemantics(
            parseStrictRemoteJson(tarEntryBytes, "tar:" + entry.tarPath),
            spec.packedSemantics,
            spec.observationKey
          );
        }
        REFLECT_APPLY(ARRAY_PUSH, entryResults, [OBJECT_FREEZE({
          tarPath: entry.tarPath,
          localPath: entry.localPath,
          rawBytes: entry.rawBytes,
          rawSha256: entry.rawSha256,
          exactByteEqualityObserved: true
        })]);
      }
      REFLECT_APPLY(ARRAY_PUSH, packageResults, [OBJECT_FREEZE({
        observationKey: spec.observationKey,
        metadataEndpoint: spec.metadataEndpoint,
        tarballEndpoint: spec.dist.tarball,
        tarballRawSha1: spec.tarballIdentity.rawSha1,
        tarballRawSha512: spec.tarballIdentity.rawSha512,
        selectedEntries: OBJECT_FREEZE(entryResults)
      })]);
    }
  } catch (cause) {
    caught = cause;
  } finally {
    if (temporaryDirectory !== undefined) {
      const cleanupTarget = path.resolve(temporaryDirectory);
      if (path.dirname(cleanupTarget) !== systemTempRoot
        || !path.basename(cleanupTarget).startsWith("hakimi-vedic-registry-parity-")) {
        fail("TEMP_CLEANUP_TARGET_INVALID", "拒绝清理未验证的 temp target。" );
      }
      await rm(cleanupTarget, { recursive: true, force: false });
      try {
        await stat(cleanupTarget);
      } catch (cause) {
        if (cause?.code === "ENOENT") cleanupVerified = true;
        else throw cause;
      }
    }
  }
  if (caught) throw caught;
  if (!cleanupVerified) fail("TEMP_CLEANUP_UNVERIFIED", "系统 temp child 清理未得到 ENOENT。" );
  return deepFreeze({
    ok: true,
    observedFrom,
    observedTo: new Date().toISOString(),
    pointInTimeObservationOnly: true,
    strictDuplicateKeyRejectingJsonUsed: true,
    lifecycleScriptsExecuted: false,
    systemTemporaryDirectoryParentVerified: true,
    cleanupVerified,
    packageCount: packageResults.length,
    selectedEntryByteParityCount: packageResults.reduce(
      (total, entry) => total + entry.selectedEntries.length,
      0
    ),
    packages: OBJECT_FREEZE(packageResults)
  });
}

export const vedicTzdbCoreRegistryTarballParityChildTestOnly = OBJECT_FREEZE({
  CHILD_ID,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  DEFAULT_WORKSPACE_ROOT,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED_RAW,
  OBSERVED_FROM,
  OBSERVED_TO,
  PACKAGE_OBSERVATIONS,
  PREDECESSOR_CHILD,
  RECORD_TYPE,
  STATUS,
  exactJson,
  sha256Text
});
