import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild as canonicalStringify,
  isVerifiedZiweiDeclaredDependencyLicenseCarrierChild,
  loadZiweiDeclaredDependencyLicenseCarrierChild
} from "./ziwei-declared-dependency-license-carrier-observation-child-lib.mjs";

export const ZIWEI_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH =
  "content/system-admission/ziwei-registry-tarball-parity-observation-child.v1.json";

const CHILD_ID = "hakimi.ziwei.registry-tarball-parity-observation-child/1.0.0";
const RECORD_TYPE = "ziwei_public_registry_tarball_local_carrier_parity_operator_observation_child";
const STATUS = "seven_exact_package_tarball_manifest_and_license_local_byte_parities_operator_observed_unbound";
const CREATED_AT = "2026-09-01T15:02:45.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T15:02:45.437Z";
const DIGEST_DOMAIN = "hakimi.ziwei.registry-tarball-parity-observation-child.v1\0";
const TARGET_SUBJECT_ID = "ziwei.rights.engine-code-and-dependency-notices";
const EXISTING_CANDIDATE_ID =
  "hakimi.ziwei.source-candidate/declared-dependency-license-carriers/1.0.0";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const REGEXP_TEST = RegExp.prototype.test;
const HASH_PROTOTYPE = Object.getPrototypeOf(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const PREDECESSOR_CHILD = OBJECT_FREEZE({
  path: "content/system-admission/ziwei-declared-dependency-license-carrier-observation-child.v1.json",
  rawBytes: 14_812,
  rawSha256: "201c5b85cf94bf9467ff18e5391fcbdfee4de54893c5fe997994a39c1f0685e8",
  childId: "hakimi.ziwei.declared-dependency-license-carrier-observation-child/1.0.0",
  childDigest: "714b5e0b1ff2c75a85bd3804ca53f01b07ad2e663c0f89b381b3cdcbb4df0c27"
});

const OPERATOR_TEMP_PATH =
  "C:\\Users\\Administrator\\AppData\\Local\\Temp\\hakimi-ziwei-npm-parity-20260901-01";

const PACKAGE_OBSERVATIONS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    ordinal: 1, packageName: "@babel/runtime", version: "7.29.7",
    tarballUrl: "https://registry.npmjs.org/@babel/runtime/-/runtime-7.29.7.tgz",
    integrity: "sha512-Nq8OhGWiZIZGV6hLHoyAKLLcJihP/xFeBMGJoUrxTX2psI8dCifzLhZISFb+VWS3wFMRDmCGw5R+dOySCqPLhw==",
    shasum: "12022450c45a4da6d8d8287b18a4ff2ddb23f768",
    tarball: OBJECT_FREEZE({ rawBytes: 55_313, rawSha1: "12022450c45a4da6d8d8287b18a4ff2ddb23f768", rawSha256: "4d7f1bd502a1a64d47625cc738d13284865f0666d2ed01f244de0adf05b69aa5", rawSha512: "36af0e8465a264864657a84b1e8c8028b2dc26284fff115e04c189a14af14d7da9b08f1d0a27f32e16484856fe5564b7c053110e6086c3947e74ec920aa3cb87" }),
    manifest: OBJECT_FREEZE({ path: "node_modules/@babel/runtime/package.json", rawBytes: 41_106, rawSha256: "8c4bf20c55e3f3a93df034b12746bf72185cf2acb0ef52847a3465d6e67c61e7" }),
    license: OBJECT_FREEZE({ path: "node_modules/@babel/runtime/LICENSE", rawBytes: 1_106, rawSha256: "117da2af0d4ce0fe1c8e19b5cff9dcd806adf973d328d27b11d4448c4ff24f76" })
  }),
  OBJECT_FREEZE({
    ordinal: 2, packageName: "dayjs", version: "1.11.21",
    tarballUrl: "https://registry.npmjs.org/dayjs/-/dayjs-1.11.21.tgz",
    integrity: "sha512-98IT+HOahAisibz/yjKbzuOBwYcjJ7BCLPzARyHiyEBmRz4fatF+KPJszEHXsGYjUG234aH/cOjW1wwTbKUZlA==",
    shasum: "57f87562e62de76f3c704bd2b8d522fc33068eb2",
    tarball: OBJECT_FREEZE({ rawBytes: 147_879, rawSha1: "57f87562e62de76f3c704bd2b8d522fc33068eb2", rawSha256: "290ec8bf81878ae4927581d9be74125f07722ea8bbea2ff77a2226dce12df876", rawSha512: "f7c213f8739a8408ac89bcffca329bcee381c1872327b0422cfcc04721e2c84066473e1f6ad17e28f26ccc41d7b06623506db7e1a1ff70e8d6d70c136ca51994" }),
    manifest: OBJECT_FREEZE({ path: "node_modules/dayjs/package.json", rawBytes: 2_676, rawSha256: "dcb46b4045ace466baa3972d8d85d81f9036ac0ca23f48a8fe77d0d786de0400" }),
    license: OBJECT_FREEZE({ path: "node_modules/dayjs/LICENSE", rawBytes: 1_072, rawSha256: "5faab7526d055651be3aab769d58897be6bd91f3d39d137f25f12dba1b31d5dc" })
  }),
  OBJECT_FREEZE({
    ordinal: 3, packageName: "i18next", version: "23.16.8",
    tarballUrl: "https://registry.npmjs.org/i18next/-/i18next-23.16.8.tgz",
    integrity: "sha512-06r/TitrM88Mg5FdUXAKL96dJMzgqLE5dv3ryBAra4KCwD9mJ4ndOTS95ZuymIGoE+2hzfdaMak2X11/es7ZWg==",
    shasum: "3ae1373d344c2393f465556f394aba5a9233b93a",
    tarball: OBJECT_FREEZE({ rawBytes: 139_913, rawSha1: "3ae1373d344c2393f465556f394aba5a9233b93a", rawSha256: "283f7f0da577e8ee54eb5fdeb4c97cdaecbb54e28fc85b32e5c908731d131015", rawSha512: "d3aaff4e2b6b33cf0c83915d51700a2fde9d24cce0a8b13976fdebc8102b6b8282c03f662789dd3934bde59bb29881a813eda1cdf75a31a9365f5d7f7aced95a" }),
    manifest: OBJECT_FREEZE({ path: "node_modules/i18next/package.json", rawBytes: 4_379, rawSha256: "eed0139050cc6d3b62e97a29529bd4d729d1d5f993af8e78fe48564c246648fc" }),
    license: OBJECT_FREEZE({ path: "node_modules/i18next/LICENSE", rawBytes: 1_074, rawSha256: "c83b2035d5a4740f8739869a994acc24559e2946219b15091922b52e7b2a7287" })
  }),
  OBJECT_FREEZE({
    ordinal: 4, packageName: "iztro", version: "2.5.8",
    tarballUrl: "https://registry.npmjs.org/iztro/-/iztro-2.5.8.tgz",
    integrity: "sha512-kgyyvxdSEvgJxi6zvHpvzGbXZLGXCdhTHYK2Pe/sRdBIQ7RfCArvupmg2ChUMQCSQGomW7XCI0gWwUuKJwPENg==",
    shasum: "c559a7384036596c1971faace403f4a658076a81",
    tarball: OBJECT_FREEZE({ rawBytes: 534_282, rawSha1: "c559a7384036596c1971faace403f4a658076a81", rawSha256: "8293c6a587de521b0713e45826745ba4b7482fc507bd2da43fc820cadf06deca", rawSha512: "920cb2bf175212f809c62eb3bc7a6fcc66d764b19709d8531d82b63defec45d04843b45f080aefba99a0d82854310092406a265bb5c2234816c14b8a2703c436" }),
    manifest: OBJECT_FREEZE({ path: "node_modules/iztro/package.json", rawBytes: 2_255, rawSha256: "a5a85df951d28965caa7bf9a9fe6b44e3df676c8dd938573061257cff681a20f" }),
    license: OBJECT_FREEZE({ path: "node_modules/iztro/LICENSE", rawBytes: 1_073, rawSha256: "e6c7b6e313cbda3135b41bccc66c98be132cb8319d0d465903d17e669e748b36" })
  }),
  OBJECT_FREEZE({
    ordinal: 5, packageName: "lunar-lite", version: "0.2.8",
    tarballUrl: "https://registry.npmjs.org/lunar-lite/-/lunar-lite-0.2.8.tgz",
    integrity: "sha512-Y4tba4RaIFI0ikImJhgoEsyqtDE64lJIM3yFwRX01dbmagCDq7rNmpDQFrSFFy4WXeuywdRVFpIBoT1GGCEizw==",
    shasum: "a0caad44ee65c75d28c9430c890c544f9c5572ee",
    tarball: OBJECT_FREEZE({ rawBytes: 8_520, rawSha1: "a0caad44ee65c75d28c9430c890c544f9c5572ee", rawSha256: "963f134a8a46b92ec6e243a98be90dc5a33c33637581b151b7c11e5833d0b157", rawSha512: "638b5b6b845a2052348a422626182812ccaab4313ae25248337c85c115f4d5d6e66a0083abbacd9a90d016b485172e165debb2c1d455169201a13d46182122cf" }),
    manifest: OBJECT_FREEZE({ path: "node_modules/lunar-lite/package.json", rawBytes: 1_465, rawSha256: "be39ac7d686fd9e1eee487e4e1960ff670e368ad6529bd435d2d0222521147dd" }),
    license: OBJECT_FREEZE({ path: "node_modules/lunar-lite/LICENSE", rawBytes: 1_062, rawSha256: "21c79dc1c4df538c682573291f8824be1b1313e309a32f1e2367e3fd4c66d62a" })
  }),
  OBJECT_FREEZE({
    ordinal: 6, packageName: "lunar-typescript", version: "1.8.6",
    tarballUrl: "https://registry.npmjs.org/lunar-typescript/-/lunar-typescript-1.8.6.tgz",
    integrity: "sha512-5Eo4T/cnuXfrgO4k5LCpOGHIUOuz5hCF/IfNv0T29WY2shR36Hiz+ecN9WjnUuxUKhql9gbOkPaQoqLFKtPRNA==",
    shasum: "9ecadd8610369f800bf46a517da7f6c598f6491d",
    tarball: OBJECT_FREEZE({ rawBytes: 335_460, rawSha1: "9ecadd8610369f800bf46a517da7f6c598f6491d", rawSha256: "257163cff2e2bb8359861721e72e5dbed2f583340b1400e459fd27816ac2ac39", rawSha512: "e44a384ff727b977eb80ee24e4b0a93861c850ebb3e61085fc87cdbf44f6f56636b21477e878b3f9e70df568e752ec542a1aa5f606ce90f690a2a2c52ad3d134" }),
    manifest: OBJECT_FREEZE({ path: "node_modules/lunar-typescript/package.json", rawBytes: 2_188, rawSha256: "f66f1217e67e227f77b7a35b3c5b40d3835842856920e99ebd7e10f2d940e21c" }),
    license: OBJECT_FREEZE({ path: "node_modules/lunar-typescript/LICENSE", rawBytes: 1_062, rawSha256: "097ec7989106eb9a27b6eff71dbaf1cd6bb04a9b35b6c94b54fff0829a041a8c" })
  }),
  OBJECT_FREEZE({
    ordinal: 7, packageName: "zod", version: "4.4.3",
    tarballUrl: "https://registry.npmjs.org/zod/-/zod-4.4.3.tgz",
    integrity: "sha512-ytENFjIJFl2UwYglde2jchW2Hwm4GJFLDiSXWdTrJQBIN9Fcyp7n4DhxJEiWNAJMV1/BqWfW/kkg71UDcHJyTQ==",
    shasum: "b680f172885d18bbebf21a834ea25e55a1bbf356",
    tarball: OBJECT_FREEZE({ rawBytes: 759_588, rawSha1: "b680f172885d18bbebf21a834ea25e55a1bbf356", rawSha256: "ee38f17f533fd500610685a483ae2f413c26f4eb33a51684314563c8d60f279c", rawSha512: "cad10d163209165d94c1882575eda37215b61f09b818914b0e249759d4eb25004837d15cca9ee7e0387124489634024c575fc1a967d6fe4920ef55037072724d" }),
    manifest: OBJECT_FREEZE({ path: "node_modules/zod/package.json", rawBytes: 3_796, rawSha256: "c630bd10b52dcf71c112a2bf78dbf2734b9db58d62de663b8d86c2ec2c8cda2e" }),
    license: OBJECT_FREEZE({ path: "node_modules/zod/LICENSE", rawBytes: 1_072, rawSha256: "3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8" })
  })
]);

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 30_844,
  rawSha256: "4449cc05c2972c8d50b0a5f76c02baf0d58c8e60f2bc6e07cd302d40a1293410"
});

export class ZiweiRegistryTarballParityChildError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ZiweiRegistryTarballParityChildError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new ZiweiRegistryTarballParityChildError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function capture(value) {
  try {
    return REFLECT_APPLY(JSON_PARSE, JSON, [canonicalStringify(value)]);
  } catch (cause) {
    if (cause?.code) throw cause;
    fail("INPUT_INVALID", "Ziwei Registry parity child 只接受安全有限 JSON。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const keys = OBJECT_KEYS(descriptors);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, seen);
  }
  return OBJECT_FREEZE(value);
}

function sha256Text(text) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function publicIdentity(value) {
  return { path: value.path, rawBytes: value.rawBytes, rawSha256: value.rawSha256 };
}

function requirePredecessor(result) {
  if (!isVerifiedZiweiDeclaredDependencyLicenseCarrierChild(result)) {
    fail("PREDECESSOR_PRIVATE_BRAND_REQUIRED", "必须先通过七依赖 carrier child full loader。" );
  }
  if (result.childId !== PREDECESSOR_CHILD.childId
    || result.childDigest !== PREDECESSOR_CHILD.childDigest
    || result.artifact?.path !== PREDECESSOR_CHILD.path
    || result.artifact?.rawBytes !== PREDECESSOR_CHILD.rawBytes
    || result.artifact?.rawSha256 !== PREDECESSOR_CHILD.rawSha256
    || result.dependencyCarrierCount !== 7 || result.bindingRequired !== 27
    || result.bindingFrozenVerified !== 0
    || result.rightsLegalConclusionEstablished !== false
    || result.redistributionAuthorized !== false) {
    fail("PREDECESSOR_IDENTITY_DRIFT", "七依赖 carrier child identity/state 漂移。" );
  }
  return result.child;
}

function packageProjection(predecessor, spec) {
  const local = predecessor.dependencyCarriers.find((entry) =>
    entry.packageName === spec.packageName && entry.version === spec.version
  );
  if (!local || local.ordinal !== spec.ordinal
    || local.lockEntry?.resolved !== spec.tarballUrl
    || local.lockEntry?.integrity !== spec.integrity
    || local.packageManifest?.path !== spec.manifest.path
    || local.packageManifest?.rawBytes !== spec.manifest.rawBytes
    || local.packageManifest?.rawSha256 !== spec.manifest.rawSha256
    || local.licenseCarrier?.path !== spec.license.path
    || local.licenseCarrier?.rawBytes !== spec.license.rawBytes
    || local.licenseCarrier?.rawSha256 !== spec.license.rawSha256) {
    fail("LOCAL_CARRIER_OR_LOCK_DRIFT", spec.packageName + " current local carrier/lock 漂移。" );
  }
  const decodedSha512 = Buffer.from(spec.integrity.slice(7), "base64").toString("hex");
  if (decodedSha512 !== spec.tarball.rawSha512
    || spec.shasum !== spec.tarball.rawSha1) {
    fail("OPERATOR_DIGEST_PROJECTION_INVALID", spec.packageName + " SRI/SHA1 投影不一致。" );
  }
  return {
    ordinal: spec.ordinal,
    packageName: spec.packageName,
    version: spec.version,
    metadataDistObservation: {
      tool: "npm_view_exact_version",
      tarball: spec.tarballUrl,
      integrity: spec.integrity,
      shasum: spec.shasum,
      rawMetadataResponseCaptured: false,
      httpStatusCaptured: false,
      httpStatus: null,
      finalUrlCaptured: false,
      finalUrl: null,
      redirectChainCaptured: false,
      redirectChain: null,
      responseHeadersCaptured: false,
      responseHeaders: null,
      networkObservedAtCaptured: false,
      networkObservedAt: null
    },
    lockProjection: {
      path: local.lockEntry.packagePath,
      resolved: local.lockEntry.resolved,
      integrity: local.lockEntry.integrity,
      metadataTarballMatchesLockResolved: true,
      metadataIntegrityMatchesLockIntegrity: true
    },
    tarballObservation: {
      tool: "npm_pack_exact_version_ignore_scripts",
      tarballUrl: spec.tarballUrl,
      rawBytes: spec.tarball.rawBytes,
      rawSha1: spec.tarball.rawSha1,
      rawSha256: spec.tarball.rawSha256,
      rawSha512: spec.tarball.rawSha512,
      sriSha512: spec.integrity,
      metadataIntegrityMatchesDownloadSri: true,
      metadataShasumMatchesDownloadSha1: true,
      tarballBodyPersistedInWorkspace: false
    },
    selectedEntries: [
      {
        role: "package_manifest",
        tarPath: "package/package.json",
        localPath: spec.manifest.path,
        tarEntryIdentity: { rawBytes: spec.manifest.rawBytes, rawSha256: spec.manifest.rawSha256 },
        localCarrierIdentity: { rawBytes: spec.manifest.rawBytes, rawSha256: spec.manifest.rawSha256 },
        exactByteEqualityOperatorObserved: true
      },
      {
        role: "license_carrier",
        tarPath: "package/LICENSE",
        localPath: spec.license.path,
        tarEntryIdentity: { rawBytes: spec.license.rawBytes, rawSha256: spec.license.rawSha256 },
        localCarrierIdentity: { rawBytes: spec.license.rawBytes, rawSha256: spec.license.rawSha256 },
        exactByteEqualityOperatorObserved: true
      }
    ],
    publisherIdentityVerified: false,
    packageSignatureVerified: false,
    firstSeenEstablished: false,
    packageAuthenticityEstablished: false
  };
}

export function computeZiweiRegistryTarballParityChildDigest(child) {
  const unsigned = capture(child);
  delete unsigned.childDigest;
  return sha256Text(DIGEST_DOMAIN + canonicalStringify(unsigned));
}

export function buildExpectedZiweiRegistryTarballParityChild(predecessorResult) {
  const predecessor = requirePredecessor(predecessorResult);
  const packageObservations = PACKAGE_OBSERVATIONS.map((spec) =>
    packageProjection(predecessor, spec)
  );
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    childId: CHILD_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    productSystemId: "ziwei-doushu",
    contractSystemId: "ziwei",
    releaseGovernance: {
      activeLine: "legacy-v13", targetSchema: 13, migrationId: null,
      mutationEpochAvailableForSchema13: false, mutationEpochReceipt: null,
      expertClaimsAuthorized: false, publicDeploymentAuthorized: false
    },
    lineage: {
      declaredDependencyLicenseCarrierChild: {
        ...publicIdentity(PREDECESSOR_CHILD),
        childId: PREDECESSOR_CHILD.childId,
        childDigest: PREDECESSOR_CHILD.childDigest,
        relationship: "append_only_operator_registry_tarball_parity_observation"
      },
      predecessorModified: false,
      predecessorBacklinkAdded: false
    },
    operatorObservationBoundary: {
      observationSource: "root_operator_supplied_completed_local_command_observation",
      fixedVerifierRecontactsNetwork: false,
      npmViewExactVersionsUsed: true,
      npmPackExactVersionsUsed: true,
      npmPackIgnoreScriptsUsed: true,
      isolatedNpmCacheUsed: true,
      npmAuditDisabled: true,
      npmFundDisabled: true,
      npmUpdateNotifierDisabled: true,
      lifecycleScriptsExecuted: false,
      rawMetadataResponsesPersisted: false,
      httpStatusCaptured: false,
      redirectBehaviorCaptured: false,
      responseHeadersCaptured: false,
      networkTimeCaptured: false,
      tlsSessionEvidenceCaptured: false,
      operatorObservationIsDigitalSignature: false,
      operatorObservationIsAuthenticityAttestation: false
    },
    temporaryExecutionBoundary: {
      exactTemporaryDirectoryPath: OPERATOR_TEMP_PATH,
      pathWasHardcodedBeforeCleanup: true,
      parentWasVerifiedAsExactSystemTemporaryDirectory: true,
      recursiveCleanupApi: "System.IO.Directory.Delete(path,true)",
      operatorReportedRemoved: true,
      currentAbsenceRecheckedReadOnly: true,
      currentPathExists: false,
      temporaryDirectoryPersisted: false
    },
    packageObservations,
    sourceRequirementsProjectionBoundary: {
      targetSubjectId: TARGET_SUBJECT_ID,
      existingCandidateId: EXISTING_CANDIDATE_ID,
      supplementsExistingCandidateOnly: true,
      newCandidateAdded: false,
      completeDependencyNoticeClosureEstablished: false,
      sourceBodyBound: false,
      exactQuoteBound: false,
      formalExactLocatorEstablished: false,
      subjectFullySatisfied: false,
      countsTowardFrozenBindingGate: false
    },
    rightsBoundary: {
      sevenPublicRegistryTarballToLocalManifestLicenseParitiesOperatorObserved: true,
      publisherIdentityVerified: false,
      packageSignatureVerified: false,
      firstSeenEstablished: false,
      packageAuthenticityEstablished: false,
      licenseAuthenticityEstablished: false,
      licenseApplicabilityEstablished: false,
      workRightsEstablished: false,
      editionRightsEstablished: false,
      carrierRightsEstablished: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      noticeObligationSatisfied: false
    },
    gateSummary: {
      bindingRequired: 27, bindingFrozenVerified: 0,
      inheritedPartialCandidates: 2, newCandidateIdsAdded: 0,
      packagesObserved: 7, tarballsObserved: 7,
      packageManifestByteParitiesOperatorObserved: 7,
      licenseCarrierByteParitiesOperatorObserved: 7,
      selectedEntryByteParitiesOperatorObserved: 14,
      sourceBodiesBound: 1, exactQuotesBound: 0, exactLocatorsEstablished: 1,
      subjectFullySatisfied: 0, workRightsEstablished: 0,
      editionRightsEstablished: 0, carrierRightsEstablished: 0,
      independentRightsReviewsVerified: 0, independentDomainExpertReviewsVerified: 0,
      redistributionAuthorizations: 0
    },
    observationBoundary: {
      currentLocalEndpointsRevalidatedByPredecessorFullLoader: true,
      strictDuplicateKeyRejectingJsonUsedForPersistedArtifacts: true,
      externalMetadataRawJsonWasNotCapturedForReparse: true,
      crossFileAndNetworkAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    timeBoundary: {
      createdAtClock: "untrusted_local_clock_label",
      createdAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      operatorNetworkObservationTimeCaptured: false,
      operatorNetworkObservationTime: null,
      trustedTimestampEstablished: false,
      externalTimeAuthorityEstablished: false,
      clockRollbackExcluded: false
    },
    runtimeTrustBoundary: {
      assumesNoArbitraryPreEvaluationCodeExecution: true,
      hiddenPreEvaluationCodeExecutionExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      launcherIntegrityEstablished: false,
      fixedPathCliImplementationBoundByChildIdentity: false,
      visibleGuardIsSecurityBoundary: false,
      cliOutputTrustedAttestation: false
    },
    authorityBoundary: {
      contentTruthEstablished: false, expertTruthEstablished: false,
      expertClaimsAuthorized: false, rightsLegalConclusionEstablished: false,
      sourceBundleComplete: false, rightsBundleComplete: false,
      formalAdmissionAuthorized: false, releaseReady: false,
      publicDeploymentAuthorized: false, publicReleaseAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence: "operator_observed_registry_dist_tarball_lock_and_current_local_manifest_license_byte_parity_only",
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established", expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready", publicReleaseAuthorization: "not_authorized"
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256", digestDomain: DIGEST_DOMAIN,
      digestExcludesOwnField: true, digestIsDigitalSignature: false,
      authenticityEstablished: false, canonicalPrettyJsonWithLfRequired: true,
      exclusiveCreateWriterRequired: true
    },
    doesNotEstablish: [
      "http_status_final_url_redirect_headers_tls_session_or_network_time",
      "publisher_identity_package_signature_first_seen_or_package_authenticity",
      "license_authenticity_applicability_notice_satisfaction_or_complete_dependency_closure",
      "work_edition_carrier_rights_legal_conclusion_or_redistribution",
      "source_body_exact_quote_formal_locator_new_candidate_or_binding_freeze",
      "content_truth_expert_truth_or_domain_authority",
      "browser_pwa_service_worker_cross_browser_or_release_evidence",
      "formal_current_registry_manifest_owner_or_public_admission",
      "trusted_time_mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({ ...unsigned, childDigest: computeZiweiRegistryTarballParityChildDigest(unsigned) });
}

function assertFailClosed(child) {
  const gate = child?.gateSummary;
  const rights = child?.rightsBoundary;
  const authority = child?.authorityBoundary;
  const operator = child?.operatorObservationBoundary;
  const observation = child?.observationBoundary;
  const projection = child?.sourceRequirementsProjectionBoundary;
  const temporary = child?.temporaryExecutionBoundary;
  const time = child?.timeBoundary;
  const runtime = child?.runtimeTrustBoundary;
  if (!gate || gate.bindingRequired !== 27 || gate.bindingFrozenVerified !== 0
    || gate.inheritedPartialCandidates !== 2 || gate.newCandidateIdsAdded !== 0
    || gate.packagesObserved !== 7 || gate.tarballsObserved !== 7
    || gate.packageManifestByteParitiesOperatorObserved !== 7
    || gate.licenseCarrierByteParitiesOperatorObserved !== 7
    || gate.selectedEntryByteParitiesOperatorObserved !== 14
    || gate.subjectFullySatisfied !== 0 || gate.workRightsEstablished !== 0
    || gate.editionRightsEstablished !== 0 || gate.carrierRightsEstablished !== 0
    || gate.independentRightsReviewsVerified !== 0
    || gate.independentDomainExpertReviewsVerified !== 0
    || gate.redistributionAuthorizations !== 0) {
    fail("GATE_PROMOTION_FORBIDDEN", "Ziwei parity child 必须保持两项 partial、0/27 与零权利/专家/再分发。" );
  }
  if (!rights || rights.sevenPublicRegistryTarballToLocalManifestLicenseParitiesOperatorObserved !== true
    || rights.publisherIdentityVerified !== false || rights.packageSignatureVerified !== false
    || rights.firstSeenEstablished !== false || rights.packageAuthenticityEstablished !== false
    || rights.licenseAuthenticityEstablished !== false
    || rights.licenseApplicabilityEstablished !== false
    || rights.workRightsEstablished !== false || rights.editionRightsEstablished !== false
    || rights.carrierRightsEstablished !== false
    || rights.rightsLegalConclusionEstablished !== false
    || rights.redistributionAuthorized !== false || rights.noticeObligationSatisfied !== false) {
    fail("RIGHTS_OVERCLAIM_FORBIDDEN", "operator parity 不得升级为真实性、许可或权利结论。" );
  }
  for (const value of Object.values(authority ?? {})) {
    if (value !== false) fail("AUTHORITY_PROMOTION_FORBIDDEN", "authorityBoundary 必须全红。" );
  }
  if (!operator || operator.httpStatusCaptured !== false
    || operator.redirectBehaviorCaptured !== false
    || operator.responseHeadersCaptured !== false
    || operator.networkTimeCaptured !== false
    || operator.tlsSessionEvidenceCaptured !== false
    || operator.operatorObservationIsDigitalSignature !== false
    || operator.operatorObservationIsAuthenticityAttestation !== false) {
    fail("UNOBSERVED_NETWORK_CLAIM_FORBIDDEN", "不得补写未捕获的 HTTP/TLS/network-time 事实。" );
  }
  if (!observation || observation.crossFileAndNetworkAtomicSnapshotEstablished !== false
    || observation.mutationEpochAvailable !== false || observation.mutationEpochReceipt !== null
    || observation.intervalMutationExcluded !== false || observation.abaExcluded !== false) {
    fail("OBSERVATION_OVERCLAIM_FORBIDDEN", "atomic/mutation/interval/ABA 必须保持红。" );
  }
  if (!projection || projection.targetSubjectId !== TARGET_SUBJECT_ID
    || projection.existingCandidateId !== EXISTING_CANDIDATE_ID
    || projection.supplementsExistingCandidateOnly !== true
    || projection.newCandidateAdded !== false
    || projection.completeDependencyNoticeClosureEstablished !== false
    || projection.sourceBodyBound !== false || projection.exactQuoteBound !== false
    || projection.formalExactLocatorEstablished !== false
    || projection.subjectFullySatisfied !== false
    || projection.countsTowardFrozenBindingGate !== false) {
    fail("SOURCE_REQUIREMENTS_PROMOTION_FORBIDDEN", "parity child 只能补强既有 rights candidate，不能新增 candidate 或 binding。" );
  }
  if (!temporary || temporary.exactTemporaryDirectoryPath !== OPERATOR_TEMP_PATH
    || temporary.pathWasHardcodedBeforeCleanup !== true
    || temporary.parentWasVerifiedAsExactSystemTemporaryDirectory !== true
    || temporary.recursiveCleanupApi !== "System.IO.Directory.Delete(path,true)"
    || temporary.operatorReportedRemoved !== true
    || temporary.currentAbsenceRecheckedReadOnly !== true
    || temporary.currentPathExists !== false
    || temporary.temporaryDirectoryPersisted !== false) {
    fail("TEMP_CLEANUP_OBSERVATION_DRIFT", "临时目录路径、system-temp 父目录验证与已清理观察必须保持固定。" );
  }
  if (!time || time.createdAtClock !== "untrusted_local_clock_label"
    || time.createdAtUpperBoundObservedOnSameUntrustedLocalClock !== CREATED_AT_UPPER_BOUND
    || time.operatorNetworkObservationTimeCaptured !== false
    || time.operatorNetworkObservationTime !== null
    || time.trustedTimestampEstablished !== false
    || time.externalTimeAuthorityEstablished !== false
    || time.clockRollbackExcluded !== false
    || Date.parse(child.createdAt) > Date.parse(time.createdAtUpperBoundObservedOnSameUntrustedLocalClock)) {
    fail("TIME_OVERCLAIM_FORBIDDEN", "createdAt 仅为不可信本机时钟标签，network/trusted time 必须保持红。" );
  }
  if (!runtime || runtime.assumesNoArbitraryPreEvaluationCodeExecution !== true
    || runtime.hiddenPreEvaluationCodeExecutionExcluded !== false
    || runtime.nodeRuntimeIdentityEstablished !== false
    || runtime.loaderIdentityEstablished !== false
    || runtime.launcherIntegrityEstablished !== false
    || runtime.fixedPathCliImplementationBoundByChildIdentity !== false
    || runtime.visibleGuardIsSecurityBoundary !== false
    || runtime.cliOutputTrustedAttestation !== false) {
    fail("RUNTIME_TRUST_OVERCLAIM_FORBIDDEN", "runtime/loader/launcher/hidden-preload 信任边界必须保持红。" );
  }
  if (child?.releaseGovernance?.activeLine !== "legacy-v13"
    || child.releaseGovernance.targetSchema !== 13
    || child.releaseGovernance.migrationId !== null
    || child.releaseGovernance.mutationEpochAvailableForSchema13 !== false
    || child.releaseGovernance.mutationEpochReceipt !== null
    || child.releaseGovernance.expertClaimsAuthorized !== false
    || child.releaseGovernance.publicDeploymentAuthorized !== false) {
    fail("RELEASE_GOVERNANCE_DRIFT", "legacy-v13/13/null 漂移。" );
  }
}

export function verifyZiweiRegistryTarballParityChildLedger(input, predecessorResult) {
  const child = capture(input);
  requirePredecessor(predecessorResult);
  assertFailClosed(child);
  if (typeof child.childDigest !== "string" || !REFLECT_APPLY(REGEXP_TEST, SHA256, [child.childDigest])) {
    fail("CHILD_DIGEST_INVALID", "childDigest 必须是小写 SHA-256。" );
  }
  if (computeZiweiRegistryTarballParityChildDigest(child) !== child.childDigest) {
    fail("CHILD_DIGEST_MISMATCH", "childDigest 不匹配。" );
  }
  const expected = buildExpectedZiweiRegistryTarballParityChild(predecessorResult);
  if (!exactJson(child, expected)) fail("CHILD_CONTRACT_MISMATCH", "parity child 与固定 operator observation/predecessor 不一致。" );
  return deepFreeze(child);
}

export function serializeZiweiRegistryTarballParityChild(child, predecessorResult) {
  const verified = verifyZiweiRegistryTarballParityChildLedger(child, predecessorResult);
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [capture(verified), null, 2]) + "\n";
}

export function parseZiweiRegistryTarballParityChildArtifact(bytes, label = ZIWEI_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH) {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail(cause?.code ?? "CHILD_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

export async function buildCurrentZiweiRegistryTarballParityChild() {
  return buildExpectedZiweiRegistryTarballParityChild(
    await loadZiweiDeclaredDependencyLicenseCarrierChild()
  );
}

export async function loadZiweiRegistryTarballParityChild() {
  const predecessor = await loadZiweiDeclaredDependencyLicenseCarrierChild();
  const expected = buildExpectedZiweiRegistryTarballParityChild(predecessor);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    process.cwd(),
    ZIWEI_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH
  );
  if (EXPECTED_PERSISTED_RAW.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("CHILD_RAW_IDENTITY_DRIFT", "Ziwei parity child raw identity 漂移。" );
  }
  const child = verifyZiweiRegistryTarballParityChildLedger(
    parseZiweiRegistryTarballParityChildArtifact(snapshot.bytes, snapshot.path),
    predecessor
  );
  if (new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)
      !== serializeZiweiRegistryTarballParityChild(child, predecessor)) {
    fail("CHILD_CANONICAL_BYTES_DRIFT", "parity child 必须保持唯一 pretty JSON 与 LF。" );
  }
  const result = deepFreeze({
    ok: true, childId: child.childId, childDigest: child.childDigest, status: child.status,
    packagesObserved: child.gateSummary.packagesObserved,
    selectedEntryByteParitiesOperatorObserved: child.gateSummary.selectedEntryByteParitiesOperatorObserved,
    inheritedPartialCandidates: child.gateSummary.inheritedPartialCandidates,
    bindingRequired: child.gateSummary.bindingRequired,
    bindingFrozenVerified: child.gateSummary.bindingFrozenVerified,
    rightsLegalConclusionEstablished: child.rightsBoundary.rightsLegalConclusionEstablished,
    redistributionAuthorized: child.rightsBoundary.redistributionAuthorized,
    artifact: publicIdentity(snapshot), child
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedZiweiRegistryTarballParityChild(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getZiweiRegistryTarballParityChildSummary(value) {
  if (!isVerifiedZiweiRegistryTarballParityChild(value)) fail("PRIVATE_BRAND_MISSING", "summary 要求 full-loader private brand。" );
  return OBJECT_FREEZE({
    childId: value.childId, childDigest: value.childDigest, status: value.status,
    packagesObserved: value.packagesObserved,
    selectedEntryByteParitiesOperatorObserved: value.selectedEntryByteParitiesOperatorObserved,
    inheritedPartialCandidates: value.inheritedPartialCandidates,
    bindingFrozenVerified: value.bindingFrozenVerified, bindingRequired: value.bindingRequired,
    rightsLegalConclusionEstablished: value.rightsLegalConclusionEstablished,
    redistributionAuthorized: value.redistributionAuthorized,
    rawBytes: value.artifact.rawBytes, rawSha256: value.artifact.rawSha256
  });
}

export const ziweiRegistryTarballParityChildTestOnly = OBJECT_FREEZE({
  CHILD_ID, CREATED_AT, CREATED_AT_UPPER_BOUND, DIGEST_DOMAIN,
  EXISTING_CANDIDATE_ID, EXPECTED_PERSISTED_RAW, OPERATOR_TEMP_PATH,
  PACKAGE_OBSERVATIONS, PREDECESSOR_CHILD, RECORD_TYPE, STATUS,
  TARGET_SUBJECT_ID, exactJson
});
