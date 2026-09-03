import { createHash } from "node:crypto";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyWesternTzdb2026cSourceRightsEvidence as sourceCanonicalStringify,
  isVerifiedWesternTzdb2026cSourceRightsEvidence,
  loadWesternTzdb2026cSourceRightsEvidence,
  parseWesternTzdb2026cSourceRightsEvidenceJsonBytes as sourceParseStrictJsonBytes
} from "./western-tzdb-2026c-source-rights-evidence-lib.mjs";

export const WESTERN_TZDB_2026C_CONTROLLED_REPRODUCTION_OBSERVATION_RELATIVE_PATH =
  "content/system-admission/western-tzdb-2026c-controlled-reproduction-observation.v1.json";

const DIGEST_DOMAIN = "hakimi-western-tzdb-2026c-controlled-reproduction-observation-v1\0";
const OBSERVATION_ID =
  "hakimi.western.controlled-reproduction/iana-tzdb-2026c-to-moment-timezone-0.6.3/1.0.0";
const CREATED_AT = "2026-08-31T06:10:00.000Z";
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SOME = Array.prototype.some;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_ENTRIES = Object.entries;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const STRING_INCLUDES = String.prototype.includes;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const BASIS_ARTIFACT = OBJECT_FREEZE({
  path: "docs/阶段C-E-西洋IANA至MomentTimezone受控重放观察候选-2026-08-31.md",
  role: "non_authoritative_operator_recorded_controlled_reproduction_narrative_basis",
  rawBytes: 13_880,
  rawSha256: "6ce0cafdbc7dab24615f5fe38a35886c48a519555c121035b328aa0872980137"
});

const EXPECTED_PERSISTED_RAW = OBJECT_FREEZE({
  rawBytes: 26_020,
  rawSha256: "41ef81e05f428286be7721529dbb0e911ad408b1d8a583b24abadac5f23f3d76"
});

const SOURCE_RIGHTS_CHILD = OBJECT_FREEZE({
  path: "content/system-admission/western-tzdb-2026c-source-rights-evidence.v1.json",
  rawBytes: 16_931,
  rawSha256: "ee61453078f7e4df39c71ee59dcfc94f75ab37a7cd0d967849e1049d748d1ee1",
  evidenceId: "hakimi.western.source-rights/iana-tzdb-2026c-moment-timezone-0.6.3/1.0.0",
  evidenceDigest: "14361c93e29d257080b25c0f3e580345243930acb07da450f938fbf6f02b8465",
  requiredVerification: "existing_source_rights_child_private_brand"
});

const FORMAL_CONTEXT = OBJECT_FREEZE([
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

const UPSTREAM_AND_TOOL_IDENTITIES = OBJECT_FREEZE([
  OBJECT_FREEZE({ role: "github_tag_ref_api_json_point_in_time", rawBytes: 347, rawSha256: "3b8ab2f4cafdc8cfa050283a2de1f45720e2a8bf36d0f943bcee9c7a77d996d0", stablePublisherPin: false }),
  OBJECT_FREEZE({ role: "github_commit_api_json_point_in_time", rawBytes: 265_289, rawSha256: "2d79eefdfa48375b6aa61e39239ec1eabdc5f2b8255058147de17cc4c51b1c46", stablePublisherPin: false }),
  OBJECT_FREEZE({ role: "moment_timezone_0_6_3_source_archive", rawBytes: 34_395_189, rawSha256: "ed1a494f029c4fd67b91a98bb4b31c9b570d1bc27c3046138a2dd5219cd31e87" }),
  OBJECT_FREEZE({ role: "iana_tzdata2026c_archive", rawBytes: 475_694, rawSha256: "e4a178a4477f3d0ea77cc31828ff72aa38feff8d61aa13e7e99e142e9d902be4" }),
  OBJECT_FREEZE({ role: "iana_tzcode2026c_archive", rawBytes: 325_445, rawSha256: "b1cffc3ace4c4c7cd0efba2f7add86ec3d0b79da48bcf03582671fd3c8feace8" }),
  OBJECT_FREEZE({ role: "zig_index_json_point_in_time", rawBytes: 76_660, rawSha256: "13832f90796d8a4849a081ead72f7133f6ce1c9b8c1c61fa432a3f2ef18c7a8b", stablePublisherPin: false }),
  OBJECT_FREEZE({ role: "zig_0_16_0_x86_64_windows_zip", rawBytes: 97_217_739, rawSha256: "68659eb5f1e4eb1437a722f1dd889c5a322c9954607f5edcf337bc3684a75a7e" }),
  OBJECT_FREEZE({ role: "zig_executable", rawBytes: 177_108_480, rawSha256: "086ce9d47ba42f33a514e1a6e04eb1d4a8fa1d75e0868e0213caad447c91e864" }),
  OBJECT_FREEZE({ role: "session_zic_executable", rawBytes: 302_080, rawSha256: "9417c6e96848cef83b85d00f3f3e9edadc2de637737a965b683fddad445632c6" }),
  OBJECT_FREEZE({ role: "session_zdump_executable", rawBytes: 272_384, rawSha256: "e0f1ebe57d5da07f3a48b92fafa4a8e792b0ad8f48ffd6b54def926035558e29" }),
  OBJECT_FREEZE({ role: "node_executable", rawBytes: 92_279_112, rawSha256: "b3094d0b49f9ad602262a9921551737bb97637c05dd357a06ae98188d7290aa3" }),
  OBJECT_FREEZE({ role: "npm_cmd", rawBytes: 538, rawSha256: "21b46c69ad6e2f231f02a9e120f4ba6c8e75fef5a45637103002eab99f888ab8" })
]);

const TRANSFORMATION_FILE_IDENTITIES = OBJECT_FREEZE([
  OBJECT_FREEZE({ path: "package.json", rawBytes: 1_076, rawSha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b" }),
  OBJECT_FREEZE({ path: "package-lock.json", rawBytes: 291_520, rawSha256: "282251670f309243ced632791aa9f025a5b5ac8e4ca1caabd90af19de16f50c5" }),
  OBJECT_FREEZE({ path: "Gruntfile.js", rawBytes: 1_995, rawSha256: "08ac5403aca02bc49ceaeda82b5d832a57cea8554796ce00f94a1b6389a5843e" }),
  OBJECT_FREEZE({ path: "tasks/data.js", rawBytes: 584, rawSha256: "622d24ec5c89d808cd77151d0960913f135db2b180f706b3a0f0b30fd0a72a3c" }),
  OBJECT_FREEZE({ path: "tasks/data-meta.js", rawBytes: 4_725, rawSha256: "441690ae8c041955dbc56885f0f794cc325c2cd72afb48ca0d6e1e130edae7d4" }),
  OBJECT_FREEZE({ path: "tasks/data-zic.js", rawBytes: 1_616, rawSha256: "20403322da9be80987107bb3cf4153c9096bd0af3cb1f1df02f194f1e152db2c" }),
  OBJECT_FREEZE({ path: "tasks/data-zdump.js", rawBytes: 2_931, rawSha256: "6ea0171a4d84c792f87503a9722c63b666780784618ab5aec1cd9be7ec4a9b41" }),
  OBJECT_FREEZE({ path: "tasks/data-collect.js", rawBytes: 2_933, rawSha256: "1e2341c3c9d2cbd93c25ae02445aadc925c3e4713b5de1310e1ee4215f1d1743" }),
  OBJECT_FREEZE({ path: "tasks/data-dedupe.js", rawBytes: 1_507, rawSha256: "bb4de7ce8b94d1b03546fbb88968f5f61e0c573eade6d9660d81e9b12ef35182" }),
  OBJECT_FREEZE({ path: "tasks/data-pack.js", rawBytes: 878, rawSha256: "d4b315590835f8d725df303ec96163123253b4e141156dee9005e85acd0b5a6f" }),
  OBJECT_FREEZE({ path: "tasks/population.json", rawBytes: 13_000, rawSha256: "8669bfea8568dc369689976f984da88e8d31796bdeb16753925dab80f2ef5927" }),
  OBJECT_FREEZE({ path: "tasks/group-leaders.json", rawBytes: 10_049, rawSha256: "cb35d8264d15e972ba90ea522e91796049cee52c6e50cc268d6603d2b0258224" }),
  OBJECT_FREEZE({ path: "moment-timezone-utils.js", rawBytes: 7_741, rawSha256: "f0772f4dd6c857021cc1518ab5d2c1cca7b19e0d479ffb1b6a07848d84c7bd66" }),
  OBJECT_FREEZE({ path: ".github/workflows/build-data.yml", rawBytes: 2_613, rawSha256: "84f4639083cce5d0b03932f7d04e2e59d59382d4c9cf66dca581a1111ccb3349" }),
  OBJECT_FREEZE({ path: "CONTRIBUTING.md", rawBytes: 8_532, rawSha256: "1c2ae21a13e20d04cc5a6a63a119d8f3efd4da1f1f960ba36f129f781d56b2cf" })
]);

const TZCODE_FILE_IDENTITIES = OBJECT_FREEZE([
  OBJECT_FREEZE({ path: "Makefile", rawBytes: 56_279, rawSha256: "41406412425d58e5ba4327785557a3a79134d2b747584a1304e77892e617955f" }),
  OBJECT_FREEZE({ path: "zic.c", rawBytes: 114_982, rawSha256: "642f4dfccdf7fcadc36eb8e241d0d10404d3d6e4c24329d8ad7224433ec5a8c4" }),
  OBJECT_FREEZE({ path: "zdump.c", rawBytes: 32_871, rawSha256: "7ea2a00dfaf88491f99988d7d661af27b1c437ec09910c4a5e05a831c0860c68" }),
  OBJECT_FREEZE({ path: "localtime.c", rawBytes: 83_406, rawSha256: "e362fcc65b89034b0ed2ee54f213a52a860b044055b62103c983b662133b307d" }),
  OBJECT_FREEZE({ path: "strftime.c", rawBytes: 19_380, rawSha256: "119fd12398d687c366df07dbbde6530caf74979ea5ec2f90718f111b4e7fb717" }),
  OBJECT_FREEZE({ path: "private.h", rawBytes: 31_916, rawSha256: "e67d07e54606d68df765b7e69c1c5c29d29464c40c2b695d870d4fa7f26ce52e" }),
  OBJECT_FREEZE({ path: "tzfile.h", rawBytes: 4_194, rawSha256: "449eceb0318327d7e885c9ab537a88084c98f03735758e4cf3e9ad1ebae79a1c" }),
  OBJECT_FREEZE({ path: "version", rawBytes: 6, rawSha256: "b8b066b540bc2870e6f1f3cd76f1b0e6c3629b2e3a12f14ba9e47085a1abb781" }),
  OBJECT_FREEZE({ path: "version.h", rawBytes: 133, rawSha256: "e7814004c7a2b4ea599725dc56ff19590dad907529f24fd947d032d5be033508" }),
  OBJECT_FREEZE({ path: "tzdir.h", rawBytes: 159, rawSha256: "eca5f1e44f56b3a110fd8d094d2dca1eebca11634428f644f05b774b7c077b3f" })
]);

const SUCCESS_OUTPUTS = OBJECT_FREEZE([
  OBJECT_FREEZE({ name: "meta", rawBytes: 97_948, rawSha256: "89fdbb1808eb6b9a5d40ff63b694a3952bcf294384659b88c05f736c50d86ab5" }),
  OBJECT_FREEZE({ name: "collect", rawBytes: 20_285_927, rawSha256: "ed166fef0b9697f47725339b68517412ca2dc1790afee17ffb21fc4f52d80a03" }),
  OBJECT_FREEZE({ name: "unpacked", rawBytes: 11_572_929, rawSha256: "038699f5d72273ef90c7abe94b8f485776012840b340ddad79cd55cfe743565a" }),
  OBJECT_FREEZE({ name: "packed", rawBytes: 715_527, rawSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" })
]);

const FAILED_DIAGNOSTIC_OUTPUTS = OBJECT_FREEZE([
  OBJECT_FREEZE({ runId: "diagnostic_missing_suppress_tzdir", excludedFromAuditedStaticInputsOperatorRecorded: true, useMechanicallyExcluded: false, collectIdentity: "unavailable_not_captured", outputs: OBJECT_FREEZE([
    OBJECT_FREEZE({ name: "unpacked", rawBytes: 162_529, rawSha256: "b690927225f9005e187f630368e9e46326d54c21d57e36983f9e8e0adb6dc017" }),
    OBJECT_FREEZE({ name: "packed", rawBytes: 29_296, rawSha256: "6ce2321ffa4efa29c4491c7408f8bf7fc58e3641d971c1739177e174ca8f6704" })
  ]) }),
  OBJECT_FREEZE({ runId: "diagnostic_abbreviation_missing_before_private_time_t", excludedFromAuditedStaticInputsOperatorRecorded: true, useMechanicallyExcluded: false, collectIdentity: "unavailable_not_captured", outputs: OBJECT_FREEZE([
    OBJECT_FREEZE({ name: "unpacked", rawBytes: 12_379_767, rawSha256: "229dac1864bea1bb23574862700ed201144a2c922d2f182f9245fa8f094802c5" }),
    OBJECT_FREEZE({ name: "packed", rawBytes: 720_209, rawSha256: "881b41090f0dd44fbfa541354414f1829871b2fe5891566ccfae617a4586054d" })
  ]) })
]);

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "complete_iana_to_moment_timezone_transformation_provenance",
  "publisher_original_build_provenance_or_publisher_authenticity",
  "commit_tag_or_detached_signature_verification_or_signing_key_trust",
  "target_invisibility_os_level_read_set_trace_or_quarantine_unreachability",
  "network_isolation_environment_closure_or_cross_host_tool_bit_reproducibility",
  "all_intermediate_layers_are_time_independent",
  "complete_source_binding_or_either_subject_fully_satisfied",
  "rights_legal_clearance_or_redistribution_authorization",
  "content_truth_expert_truth_or_independent_expert_review",
  "browser_runtime_pwa_service_worker_or_cross_browser_validation",
  "formal_binding_manifest_registry_owner_admission_or_active_effect",
  "release_readiness_deployment_rollback_or_public_release_authorization",
  "cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
]);

export class WesternTzdb2026cControlledReproductionObservationError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WesternTzdb2026cControlledReproductionObservationError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new WesternTzdb2026cControlledReproductionObservationError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function capturePassiveJson(value) {
  try {
    const canonical = sourceCanonicalStringify(value);
    return REFLECT_APPLY(JSON_PARSE, JSON, [canonical]);
  } catch (cause) {
    fail(cause?.code ?? "INPUT_NOT_PASSIVE_JSON", "受控重放观察只接受被动、有限、无别名的 JSON 值。", cause);
  }
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

function trustedCopy(value) {
  return capturePassiveJson(value);
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

export function canonicalStringifyWesternTzdb2026cControlledReproductionObservation(value) {
  return sourceCanonicalStringify(value);
}

function sha256Text(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeWesternTzdb2026cControlledReproductionObservationDigest(ledger) {
  const snapshot = capturePassiveJson(ledger);
  delete snapshot.observationDigest;
  return sha256Text(
    DIGEST_DOMAIN + canonicalStringifyWesternTzdb2026cControlledReproductionObservation(snapshot)
  );
}

export function parseWesternTzdb2026cControlledReproductionObservationJsonBytes(
  bytes,
  label = WESTERN_TZDB_2026C_CONTROLLED_REPRODUCTION_OBSERVATION_RELATIVE_PATH
) {
  try {
    return sourceParseStrictJsonBytes(bytes, label);
  } catch (cause) {
    fail(cause?.code ?? "OBSERVATION_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function buildSuccessfulRun(runId, decoy) {
  return {
    runId,
    outcome: "success",
    correctedRun: true,
    decoy,
    zicFilesGenerated: 597,
    zdumpFilesGenerated: 597,
    outputs: trustedCopy(SUCCESS_OUTPUTS),
    metaEqualsProjectInstalledTargetAfterOutputOperatorRecorded: true,
    packedEqualsProjectInstalledTargetAfterOutputOperatorRecorded: true,
    unpackedEqualsTagCommittedTargetAfterOutputOperatorRecorded: true,
    projectTargetUseObservedInAuditedStaticPaths: false,
    projectTargetUseMechanicallyExcluded: false,
    quarantinedTargetUseObservedInAuditedStaticPaths: false,
    quarantinedTargetUseMechanicallyExcluded: false
  };
}

export function buildExpectedWesternTzdb2026cControlledReproductionObservation() {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "western_tzdb_2026c_controlled_reproduction_observation_v1",
    observationId: OBSERVATION_ID,
    status: "operator_recorded_point_in_time_two_run_byte_exact_observation_candidate_only",
    createdAt: CREATED_AT,
    observationWindow: {
      probeFullWindow: "unavailable_not_sampled",
      fullWindowFabricated: false,
      compilerCacheSubwindow: {
        createdAt: "2026-08-31T05:29:08.8528987Z",
        lastWriteAt: "2026-08-31T05:39:59.9596076Z",
        explicitlyNotProbeFullWindow: true
      },
      pointInTimeObservationOnly: true,
      operatorRecorded: true,
      rawProbeReceiptPersisted: false,
      probeRunnerPersisted: false
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
    basisArtifacts: [trustedCopy(BASIS_ARTIFACT)],
    sourceRightsChild: trustedCopy(SOURCE_RIGHTS_CHILD),
    formalContext: trustedCopy(FORMAL_CONTEXT),
    subjectObservations: [
      {
        subjectId: "western.input.calendar-time-zone-and-dst",
        observationCandidateId: "western-iana-tzdb-2026c-to-moment-timezone-controlled-reproduction-v1",
        evidenceState: "partial_observation_candidate_only",
        subjectFullySatisfied: false,
        frozenBindingId: null,
        transformationProvenanceEstablished: false,
        countsTowardFrozenBindingGate: false
      },
      {
        subjectId: "western.rights.ephemeris-time-data-redistribution",
        observationCandidateId: "western-iana-tzdb-2026c-to-moment-timezone-controlled-reproduction-rights-context-v1",
        evidenceState: "partial_observation_candidate_only",
        subjectFullySatisfied: false,
        frozenBindingId: null,
        transformationProvenanceEstablished: false,
        countsTowardFrozenBindingGate: false
      }
    ],
    operatorRecordedProbe: {
      tagObservation: {
        tag: "0.6.3",
        commit: "f5373b73ed47995924b53a0cac1e59730799887d",
        tree: "87ffb5e7c6a87facc3ddc75c685ee35dcf940220",
        commitTime: "2026-07-19T07:56:36Z",
        githubVerificationVerified: false,
        githubVerificationReason: "unsigned",
        githubApiBodiesAreDynamicPointInTimeRepresentations: true,
        githubApiBodiesUsedAsStablePublisherPins: false
      },
      upstreamAndToolIdentities: trustedCopy(UPSTREAM_AND_TOOL_IDENTITIES),
      transformationFileIdentities: trustedCopy(TRANSFORMATION_FILE_IDENTITIES),
      tzcodeFileIdentities: trustedCopy(TZCODE_FILE_IDENTITIES),
      runtimeEnvironment: {
        os: "Windows NT 10.0.26200.0 X64",
        dotnet: "10.0.10",
        node: "v24.16.0",
        npm: "11.13.0",
        zig: "0.16.0",
        moment: "2.29.4",
        grunt: "1.5.3",
        gruntCli: "1.4.3",
        zicAndZdumpTzcode: "2026c",
        observedHostCpu: "Intel i5-12600KF 10C/16T alderlake",
        ambientPathClosed: false,
        zigDefaultSharedCacheUsed: true,
        outerCompleteCompilerArgvPersisted: false
      },
      windowsHostAdaptations: {
        zicCommand: "zig.exe cc -std=gnu17 -O2 -DHAVE_DIRECT_H=1 -DHAVE_MEMPCPY=1 -DHAVE_GETEUID=0 -DHAVE_GETRESUID=0 -DHAVE_FCHMOD=0 -DHAVE_LINK=0 -DHAVE_SYMLINK=0 -DHAVE_SETENV=0 -DHAVE_LOCALTIME_R=0 -DHAVE_LOCALTIME_RZ=0 -DHAVE_POSIX_DECLS=0 -DHAVE_UNISTD_H=0 -DHAVE_GETTEXT=0 -o zic.exe zic.c",
        zdumpAdditionalMacros: ["HAVE_STRUCT_STAT_ST_CTIM=0", "SUPPRESS_TZDIR=1", "HAVE_TZNAME=1", "time_tz=__int64"],
        zdumpInputs: ["zdump.c", "localtime.c", "strftime.c"],
        timeTzChangesInternalTypeAndSymbolRange: true,
        suppressTzdirChangesWindowsPathLookupSemantics: true,
        haveTznameAdaptsAbbreviationSourceWithoutTmZone: true,
        upstreamDefaultBuild: false,
        generalProductBuildDefaultAuthorized: false,
        upstreamWorkflow: "ubuntu-latest_node-lts_tzcode-make",
        probeWorkflow: "windows_zig_portability_macros"
      },
      cleanExecution: {
        npmCacheScope: "probe_temp_only",
        npmCommand: "npm.cmd ci --offline --ignore-scripts --no-audit --no-fund",
        gruntCommands: [
          "grunt.cmd data-meta data-zic --zic-path=<probe>/tzcode/zic.exe",
          "grunt.cmd data-zdump --zdump-path=<probe>/tzcode/zdump.exe",
          "grunt.cmd data-collect data-dedupe data-pack"
        ],
        npmOfflineFlagUsed: true,
        auditedTransformationCommandsContainDownloadTask: false,
        runtimeNetworkAccessMechanicallyExcluded: false,
        wholeProbeNetworkIsolated: false,
        projectNodeModulesUseObservedInAuditedExecutionPaths: false,
        projectNodeModulesUseMechanicallyExcluded: false,
        projectTargetComparisonAfterOutputOperatorRecorded: true,
        projectTargetComparisonOrderingMechanicallyTraced: false
      },
      networkReadSetOperatorRecorded: {
        endpoints: [
          "github_codeload",
          "github_tag_ref_api",
          "github_commit_api",
          "iana_tzdata_archive",
          "iana_tzcode_archive",
          "ziglang_index_and_zip",
          "npm_registry_tarballs_named_by_lock"
        ],
        osLevelNetworkTraceCaptured: false,
        wholeProbeNetworkIsolated: false,
        credentialsAccessed: false,
        thirdPartyBackendOrAccountAccessed: false
      },
      workspaceInteractionOperatorRecorded: {
        substantiveReads: [
          "node_modules/moment-timezone/package.json",
          "node_modules/moment-timezone/data/meta/latest.json_after_output_only",
          "node_modules/moment-timezone/data/packed/latest.json_after_output_only"
        ],
        fileNameOnlyZicZdumpSearchOccurred: true,
        forbiddenLocalUserDataCleanupFileRead: false,
        gitExecuted: false,
        workspaceWrites: 0,
        workspaceDeletes: 0
      },
      successfulRuns: [
        buildSuccessfulRun("run_1_corrected", {
          decoyId: "empty_zones_links_countries",
          didNotAffectPackedOutput: true
        }),
        buildSuccessfulRun("run_2_fresh_clean", {
          decoyId: "etc_decoy_dcoy_entry",
          exactEntry: "Etc/Decoy|DCOY|0|0||",
          didNotAffectPackedOutput: true
        })
      ],
      twoSuccessfulRunsByteExact: true,
      successOutputIdentity: trustedCopy(SUCCESS_OUTPUTS),
      outputSemantics: {
        metaVersion: "2026c",
        metaZoneObjectKeys: 418,
        metaCountries: 247,
        packedVersion: "2026c",
        packedZones: 340,
        packedLinks: 257,
        packedCountries: 247
      },
      failedDiagnosticRuns: trustedCopy(FAILED_DIAGNOSTIC_OUTPUTS),
      failedDiagnosticOutputUseObservedInAuditedStaticInputs: false,
      failedDiagnosticOutputUseMechanicallyExcluded: false,
      fixedOffsetZdumpFallbackReadsCurrentClock: true,
      rawZdumpIntermediateStrictlyTimeIndependent: false,
      packedDependsOnIanaPlusPopulationGroupLeadersMomentAndUtils: true,
      staticReadWriteReview: {
        dataMeta: "reads_NEWS_iso3166_zone1970_zone_tab_writes_meta",
        dataZic: "reads_nine_tzdata_sources_writes_597_tzif",
        dataZdump: "reads_597_tzif_writes_597_zdump",
        dataCollect: "reads_zdump_and_generated_meta_population_and_moment_writes_collect",
        dataDedupe: "reads_collect_and_meta_writes_unpacked",
        dataPack: "reads_unpacked_group_leaders_and_utils_writes_packed",
        osLevelReadSetTraceCaptured: false
      },
      quarantineObservation: {
        tagCommittedTargetsQuarantinedBeforeCleanRun: true,
        auditedStaticTaskPathsReadQuarantine: false,
        quarantineSharedSameCwd: true,
        quarantinedTargetsTheoreticallyAccessible: true,
        targetInvisibilityMechanicallyEstablished: false
      }
    },
    executionBoundaries: {
      transformationProvenanceEstablished: false,
      publisherOriginalBuildProvenanceEstablished: false,
      publisherBuildProvenanceEstablished: false,
      publisherAuthenticityEstablished: false,
      commitOrTagSignatureVerified: false,
      signingKeyTrustEstablished: false,
      detachedSignatureCryptographicallyVerified: false,
      targetInvisibilityMechanicallyEstablished: false,
      osLevelExpectedOutputInvisibilityEstablished: false,
      osLevelReadSetTraceCaptured: false,
      completeProcessReadSetMechanicallyTraced: false,
      networkIsolationEstablished: false,
      networkIsolationMechanicallyEstablished: false,
      environmentClosureEstablished: false,
      crossHostToolBitReproducibilityEstablished: false,
      toolchainCrossHostBitReproducibilityEstablished: false,
      allIntermediateLayersTimeIndependent: false,
      browserRuntimeValidated: false,
      preEntryExecutionOrErasureExcluded: false,
      launcherIntegrityEstablished: false,
      probeReceiptCryptographicallyAttested: false,
      replayableFromThisRecordAlone: false
    },
    cleanupAndStorageBoundary: {
      scope: "this_operator_recorded_probe_cleanup_only",
      probeRoot: "C:/Users/Administrator/AppData/Local/Temp/moment-tz-repro-8367467d02cb42c68fd164134e52df56",
      probeRootExistsAfter: false,
      probeRootCleanupOperatorRecorded: true,
      zigDefaultCache: "C:/Users/Administrator/AppData/Local/zig",
      zigCacheObservedCreatedByThisProbe: true,
      zigCacheExistsAfter: false,
      zigCacheCleanupOperatorRecorded: true,
      remoteBodiesPersistedInThisRecord: 0,
      remoteBodiesPersistedByThisProbeInRepoAfterCleanupOperatorRecorded: 0,
      projectFilesModifiedOperatorRecorded: 0,
      projectFilesDeletedOperatorRecorded: 0,
      workspaceWideAbsenceMechanicallyVerified: false,
      rawProbeReceiptPersisted: false,
      probeRunnerPersisted: false
    },
    snapshotBoundary: {
      localArtifactReadSemantics: "per_file_held_handle_same_endpoint_revalidation",
      operatorProbeSemantics: "two_successful_runs_without_persisted_raw_receipt_or_full_window",
      providedWriterUsesExclusiveCreate: true,
      currentArtifactWriteProvenanceEstablished: false,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    formalIntegration: {
      bindingModified: false,
      manifestModified: false,
      registryModified: false,
      ownerAdmissionAccepted: false,
      activeEffect: "none"
    },
    gateSummary: {
      sourceBindingsRequired: 28,
      sourceBindingsFrozenVerified: 0,
      observationSubjectsTotal: 2,
      observationSubjectsFullySatisfied: 0,
      partialObservationCandidatesAttached: 2,
      transformationProvenanceEstablished: false,
      independentEngineeringReviewsVerified: 0,
      independentDomainExpertReviewsVerified: 0,
      requiredIndependentExpertOpinions: 2,
      expertOpinionsVerified: 0,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence: "operator_recorded_two_run_byte_exact_observation_without_persisted_raw_receipt",
      browserRuntimeEvidence: "not_assessed",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: trustedCopy(DOES_NOT_ESTABLISH)
  };
  return deepFreeze({
    ...unsigned,
    observationDigest: computeWesternTzdb2026cControlledReproductionObservationDigest(unsigned)
  });
}

function scanForbiddenPayload(value) {
  if (ARRAY_IS_ARRAY(value)) {
    for (let index = 0; index < value.length; index += 1) scanForbiddenPayload(value[index]);
    return;
  }
  if (!value || typeof value !== "object") return;
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const entries = OBJECT_ENTRIES(descriptors);
  for (let index = 0; index < entries.length; index += 1) {
    const [key, descriptor] = entries[index];
    if (/^(?:rawBody|pageBody|html|fullText|documentContent|archiveBody|signatureBody|tarballBody|probeReportBody|privateContactData)$/iu.test(key)) {
      fail("RAW_BODY_FIELD_FORBIDDEN", "受控重放观察不得保存远程正文、archive body、raw probe report 或私人数据。\n");
    }
    if (descriptor && "value" in descriptor) scanForbiddenPayload(descriptor.value);
  }
}

function assertFailClosedBoundaries(ledger) {
  if (ledger?.status !== "operator_recorded_point_in_time_two_run_byte_exact_observation_candidate_only") {
    fail("STATUS_PROMOTION_FORBIDDEN", "受控重放必须保持 operator-recorded observation candidate only。\n");
  }
  const gate = ledger?.gateSummary;
  if (!gate || gate.sourceBindingsRequired !== 28 || gate.sourceBindingsFrozenVerified !== 0
    || gate.observationSubjectsTotal !== 2 || gate.observationSubjectsFullySatisfied !== 0
    || gate.partialObservationCandidatesAttached !== 2
    || gate.transformationProvenanceEstablished !== false
    || gate.independentEngineeringReviewsVerified !== 0
    || gate.independentDomainExpertReviewsVerified !== 0
    || gate.requiredIndependentExpertOpinions !== 2 || gate.expertOpinionsVerified !== 0
    || gate.rightsLegalConclusionEstablished !== false || gate.redistributionAuthorized !== false
    || gate.contentTruthEstablished !== false || gate.expertTruthEstablished !== false
    || gate.releaseReady !== false || gate.publicDeploymentAuthorized !== false
    || gate.publicReleaseAuthorized !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "受控重放必须保持 0/28、0/2、无 provenance、专家、法律或发布准入。\n");
  }
  if (!ARRAY_IS_ARRAY(ledger?.subjectObservations) || ledger.subjectObservations.length !== 2
    || REFLECT_APPLY(ARRAY_SOME, ledger.subjectObservations, [(entry) =>
      entry.evidenceState !== "partial_observation_candidate_only"
      || entry.subjectFullySatisfied !== false
      || entry.frozenBindingId !== null
      || entry.transformationProvenanceEstablished !== false
      || entry.countsTowardFrozenBindingGate !== false])) {
    fail("SUBJECT_PROMOTION_FORBIDDEN", "两个 subject 只能保持 partial observation candidate。\n");
  }
  const boundary = ledger?.executionBoundaries;
  const falseFields = [
    "transformationProvenanceEstablished",
    "publisherOriginalBuildProvenanceEstablished",
    "publisherBuildProvenanceEstablished",
    "publisherAuthenticityEstablished",
    "commitOrTagSignatureVerified",
    "signingKeyTrustEstablished",
    "detachedSignatureCryptographicallyVerified",
    "targetInvisibilityMechanicallyEstablished",
    "osLevelExpectedOutputInvisibilityEstablished",
    "osLevelReadSetTraceCaptured",
    "completeProcessReadSetMechanicallyTraced",
    "networkIsolationEstablished",
    "networkIsolationMechanicallyEstablished",
    "environmentClosureEstablished",
    "crossHostToolBitReproducibilityEstablished",
    "toolchainCrossHostBitReproducibilityEstablished",
    "allIntermediateLayersTimeIndependent",
    "browserRuntimeValidated",
    "preEntryExecutionOrErasureExcluded",
    "launcherIntegrityEstablished",
    "probeReceiptCryptographicallyAttested",
    "replayableFromThisRecordAlone"
  ];
  if (!boundary || REFLECT_APPLY(ARRAY_SOME, falseFields, [(field) => boundary[field] !== false])) {
    fail("EXECUTION_BOUNDARY_PROMOTION_FORBIDDEN", "无法机械证明的执行边界必须全部显式为 false。\n");
  }
  if (ledger?.operatorRecordedProbe?.quarantineObservation?.targetInvisibilityMechanicallyEstablished !== false
    || ledger.operatorRecordedProbe.quarantineObservation.quarantinedTargetsTheoreticallyAccessible !== true
    || ledger.operatorRecordedProbe.staticReadWriteReview.osLevelReadSetTraceCaptured !== false
    || ledger.operatorRecordedProbe.fixedOffsetZdumpFallbackReadsCurrentClock !== true
    || ledger.operatorRecordedProbe.rawZdumpIntermediateStrictlyTimeIndependent !== false) {
    fail("PROBE_LIMIT_PROMOTION_FORBIDDEN", "quarantine/read-set 与 zdump 时钟边界不得伪晋级。\n");
  }
  const runs = ledger?.operatorRecordedProbe?.successfulRuns;
  if (!ARRAY_IS_ARRAY(runs) || runs.length !== 2
    || REFLECT_APPLY(ARRAY_SOME, runs, [(run) =>
      run.projectTargetUseObservedInAuditedStaticPaths !== false
      || run.projectTargetUseMechanicallyExcluded !== false
      || run.quarantinedTargetUseObservedInAuditedStaticPaths !== false
      || run.quarantinedTargetUseMechanicallyExcluded !== false])) {
    fail("TARGET_USE_SCOPE_PROMOTION_FORBIDDEN", "target use 只能记录 audited static paths 未观察到，不能机械排除。\n");
  }
  const failedRuns = ledger?.operatorRecordedProbe?.failedDiagnosticRuns;
  if (!ARRAY_IS_ARRAY(failedRuns) || failedRuns.length !== 2
    || ledger.operatorRecordedProbe.failedDiagnosticOutputUseObservedInAuditedStaticInputs !== false
    || ledger.operatorRecordedProbe.failedDiagnosticOutputUseMechanicallyExcluded !== false
    || REFLECT_APPLY(ARRAY_SOME, failedRuns, [(run) =>
      run.excludedFromAuditedStaticInputsOperatorRecorded !== true
      || run.useMechanicallyExcluded !== false])) {
    fail("FAILED_RUN_USE_SCOPE_PROMOTION_FORBIDDEN", "failed-run use 只能按 audited static inputs 记录，不能机械排除。\n");
  }
  const clean = ledger?.operatorRecordedProbe?.cleanExecution;
  if (!clean || clean.npmOfflineFlagUsed !== true
    || clean.auditedTransformationCommandsContainDownloadTask !== false
    || clean.runtimeNetworkAccessMechanicallyExcluded !== false
    || clean.projectNodeModulesUseObservedInAuditedExecutionPaths !== false
    || clean.projectNodeModulesUseMechanicallyExcluded !== false
    || clean.projectTargetComparisonAfterOutputOperatorRecorded !== true
    || clean.projectTargetComparisonOrderingMechanicallyTraced !== false) {
    fail("OFFLINE_OR_ORDERING_SCOPE_PROMOTION_FORBIDDEN", "offline 与 target 比较顺序必须保持 operator-recorded、非机械封闭。\n");
  }
  if (ledger?.observationWindow?.probeFullWindow !== "unavailable_not_sampled"
    || ledger.observationWindow.fullWindowFabricated !== false
    || ledger.observationWindow.rawProbeReceiptPersisted !== false
    || ledger.observationWindow.probeRunnerPersisted !== false) {
    fail("RECEIPT_OR_WINDOW_PROMOTION_FORBIDDEN", "完整窗口、probe runner 与 raw receipt 必须保持未持久状态。\n");
  }
  if (ledger?.cleanupAndStorageBoundary?.workspaceWideAbsenceMechanicallyVerified !== false
    || ledger.cleanupAndStorageBoundary.remoteBodiesPersistedInThisRecord !== 0
    || ledger.cleanupAndStorageBoundary.remoteBodiesPersistedByThisProbeInRepoAfterCleanupOperatorRecorded !== 0
    || ledger.cleanupAndStorageBoundary.rawProbeReceiptPersisted !== false
    || ledger.cleanupAndStorageBoundary.probeRunnerPersisted !== false) {
    fail("STORAGE_PROMOTION_FORBIDDEN", "清理只能作为 operator-recorded、非 workspace-wide 观察。\n");
  }
  if (ledger?.snapshotBoundary?.crossFileAtomicSnapshotEstablished !== false
    || ledger.snapshotBoundary.providedWriterUsesExclusiveCreate !== true
    || ledger.snapshotBoundary.currentArtifactWriteProvenanceEstablished !== false
    || ledger.snapshotBoundary.mutationEpochReceipt !== null
    || ledger.snapshotBoundary.intervalMutationExcluded !== false
    || ledger.snapshotBoundary.abaExcluded !== false) {
    fail("SNAPSHOT_PROMOTION_FORBIDDEN", "不得声称跨文件原子、mutation epoch、interval integrity 或 ABA 排除。\n");
  }
  if (ledger?.formalIntegration?.bindingModified !== false
    || ledger.formalIntegration.manifestModified !== false
    || ledger.formalIntegration.registryModified !== false
    || ledger.formalIntegration.ownerAdmissionAccepted !== false
    || ledger.formalIntegration.activeEffect !== "none") {
    fail("FORMAL_INTEGRATION_FORBIDDEN", "observation child 不得修改正式治理或产生 active effect。\n");
  }
}

export function verifyWesternTzdb2026cControlledReproductionObservationLedger(input) {
  const ledger = capturePassiveJson(input);
  scanForbiddenPayload(ledger);
  assertFailClosedBoundaries(ledger);
  if (typeof ledger.observationDigest !== "string" || !SHA256.test(ledger.observationDigest)) {
    fail("OBSERVATION_DIGEST_INVALID", "受控重放观察必须具有小写 SHA-256 摘要。\n");
  }
  if (computeWesternTzdb2026cControlledReproductionObservationDigest(ledger) !== ledger.observationDigest) {
    fail("OBSERVATION_DIGEST_MISMATCH", "受控重放观察摘要不匹配。\n");
  }
  const expected = buildExpectedWesternTzdb2026cControlledReproductionObservation();
  if (canonicalStringifyWesternTzdb2026cControlledReproductionObservation(ledger)
    !== canonicalStringifyWesternTzdb2026cControlledReproductionObservation(expected)) {
    fail("OBSERVATION_CONTRACT_MISMATCH", "受控重放观察与固定 operator record 和失败关闭合同不一致。\n");
  }
  return deepFreeze(ledger);
}

export function serializeWesternTzdb2026cControlledReproductionObservation(ledger) {
  return JSON_STRINGIFY(
    prettySafeValue(verifyWesternTzdb2026cControlledReproductionObservationLedger(ledger)),
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
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("LOCAL_RAW_IDENTITY_DRIFT", `${label} raw identity 漂移。`);
  }
}

function parseStrictSnapshot(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    fail("LOCAL_JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
}

function publicIdentity(snapshot) {
  return OBJECT_FREEZE({ path: snapshot.path, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 });
}

function assertNoFormalBacklinkText(text, label) {
  if (REFLECT_APPLY(STRING_INCLUDES, text, [OBSERVATION_ID])
    || REFLECT_APPLY(STRING_INCLUDES, text, [WESTERN_TZDB_2026C_CONTROLLED_REPRODUCTION_OBSERVATION_RELATIVE_PATH])) {
    fail("FORMAL_BACKLINK_FORBIDDEN", `${label} 不得反向消费受控重放 observation child。`);
  }
}

function requireVerifiedSourceRightsChild(result) {
  if (!isVerifiedWesternTzdb2026cSourceRightsEvidence(result)) {
    fail("SOURCE_CHILD_PRIVATE_BRAND_REQUIRED", "必须消费现有 source-rights child 的真实 private brand。\n");
  }
  if (result.evidenceId !== SOURCE_RIGHTS_CHILD.evidenceId
    || result.evidenceDigest !== SOURCE_RIGHTS_CHILD.evidenceDigest
    || result.ledgerArtifact.path !== SOURCE_RIGHTS_CHILD.path
    || result.ledgerArtifact.rawBytes !== SOURCE_RIGHTS_CHILD.rawBytes
    || result.ledgerArtifact.rawSha256 !== SOURCE_RIGHTS_CHILD.rawSha256
    || result.sourceBindingsRequired !== 28 || result.sourceBindingsFrozenVerified !== 0
    || result.rightsLegalConclusionEstablished !== false
    || result.releaseReady !== false || result.publicReleaseAuthorized !== false) {
    fail("SOURCE_CHILD_IDENTITY_OR_BOUNDARY_DRIFT", "source-rights child 身份或红线漂移。\n");
  }
  if (canonicalStringifyWesternTzdb2026cControlledReproductionObservation(result.ledger.formalParents)
    !== canonicalStringifyWesternTzdb2026cControlledReproductionObservation(trustedCopy(FORMAL_CONTEXT))) {
    fail("SOURCE_CHILD_FORMAL_CONTEXT_DRIFT", "source-rights child 的正式上下文漂移。\n");
  }
  assertNoFormalBacklinkText(
    canonicalStringifyWesternTzdb2026cControlledReproductionObservation(result.ledger),
    "source-rights child"
  );
  return result;
}

async function verifyBasis(workspaceRoot, ledger) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, BASIS_ARTIFACT.path);
  assertArtifactIdentity(snapshot, BASIS_ARTIFACT, "controlled reproduction narrative basis");
  const text = decodeUtf8(snapshot.bytes, "controlled reproduction narrative basis");
  const markers = [
    "# 阶段 C/E：西洋 IANA 至 Moment-Timezone 受控重放观察候选",
    "operator_recorded_point_in_time_two_run_byte_exact_observation_candidate_only",
    "transformationProvenanceEstablished=false",
    "workspaceWideAbsenceMechanicallyVerified = false",
    "raw `.zdump` 中间层不是严格时间无关",
    "正式西洋 Binding：`0/28`"
  ];
  if (REFLECT_APPLY(ARRAY_SOME, markers, [(marker) => !REFLECT_APPLY(STRING_INCLUDES, text, [marker])])) {
    fail("BASIS_MARKER_MISSING", "受控重放说明缺少固定红线标记。\n");
  }
  if (canonicalStringifyWesternTzdb2026cControlledReproductionObservation(ledger.basisArtifacts)
    !== canonicalStringifyWesternTzdb2026cControlledReproductionObservation([trustedCopy(BASIS_ARTIFACT)])) {
    fail("BASIS_BINDING_DRIFT", "受控重放 basis binding 漂移。\n");
  }
  return snapshot;
}

async function verifyFormalContext(workspaceRoot, ledger, sourceChild) {
  if (canonicalStringifyWesternTzdb2026cControlledReproductionObservation(ledger.formalContext)
    !== canonicalStringifyWesternTzdb2026cControlledReproductionObservation(trustedCopy(FORMAL_CONTEXT))) {
    fail("FORMAL_CONTEXT_BINDING_DRIFT", "受控重放正式上下文绑定漂移。\n");
  }
  if (canonicalStringifyWesternTzdb2026cControlledReproductionObservation(ledger.sourceRightsChild)
    !== canonicalStringifyWesternTzdb2026cControlledReproductionObservation(trustedCopy(SOURCE_RIGHTS_CHILD))) {
    fail("SOURCE_CHILD_BINDING_DRIFT", "受控重放 source-rights child 绑定漂移。\n");
  }
  const snapshots = [];
  for (let index = 0; index < FORMAL_CONTEXT.length; index += 1) {
    const expected = FORMAL_CONTEXT[index];
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertArtifactIdentity(snapshot, expected, expected.role);
    const parsed = parseStrictSnapshot(snapshot, expected.role);
    if (parsed?.[expected.semanticDigestField] !== expected.semanticDigest) {
      fail("FORMAL_CONTEXT_SEMANTIC_DRIFT", `${expected.role} semantic identity 漂移。`);
    }
    assertNoFormalBacklinkText(decodeUtf8(snapshot.bytes, expected.role), expected.role);
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [snapshot]);
  }
  if (sourceChild.formalParents.length !== FORMAL_CONTEXT.length) {
    fail("SOURCE_CHILD_FORMAL_PARENT_COUNT_DRIFT", "source-rights child formal parent count 漂移。\n");
  }
  return snapshots;
}

export async function loadWesternTzdb2026cControlledReproductionObservation(
  workspaceRoot = process.cwd()
) {
  if (EXPECTED_PERSISTED_RAW.rawBytes <= 0 || !SHA256.test(EXPECTED_PERSISTED_RAW.rawSha256)) {
    fail("PERSISTED_IDENTITY_UNSET", "受控重放 observation raw identity 尚未冻结。\n");
  }
  const ledgerSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_TZDB_2026C_CONTROLLED_REPRODUCTION_OBSERVATION_RELATIVE_PATH
  );
  if (ledgerSnapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || ledgerSnapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("OBSERVATION_RAW_IDENTITY_DRIFT", "受控重放 observation raw identity 漂移。\n");
  }
  const ledger = verifyWesternTzdb2026cControlledReproductionObservationLedger(
    parseWesternTzdb2026cControlledReproductionObservationJsonBytes(ledgerSnapshot.bytes, ledgerSnapshot.path)
  );
  if (decodeUtf8(ledgerSnapshot.bytes, "controlled reproduction observation")
    !== serializeWesternTzdb2026cControlledReproductionObservation(ledger)) {
    fail("OBSERVATION_CANONICAL_BYTES_DRIFT", "受控重放 observation 必须保持唯一 pretty JSON 与 LF 终止。\n");
  }
  const basisSnapshot = await verifyBasis(workspaceRoot, ledger);
  const sourceChild = requireVerifiedSourceRightsChild(
    await loadWesternTzdb2026cSourceRightsEvidence(workspaceRoot)
  );
  const formalSnapshots = await verifyFormalContext(workspaceRoot, ledger, sourceChild);
  const formalContext = [];
  for (let index = 0; index < formalSnapshots.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, formalContext, [publicIdentity(formalSnapshots[index])]);
  }
  const result = deepFreeze({
    ok: true,
    status: ledger.status,
    observationId: ledger.observationId,
    observationDigest: ledger.observationDigest,
    sourceBindingsFrozenVerified: ledger.gateSummary.sourceBindingsFrozenVerified,
    sourceBindingsRequired: ledger.gateSummary.sourceBindingsRequired,
    observationSubjectsFullySatisfied: ledger.gateSummary.observationSubjectsFullySatisfied,
    observationSubjectsTotal: ledger.gateSummary.observationSubjectsTotal,
    transformationProvenanceEstablished: ledger.gateSummary.transformationProvenanceEstablished,
    rightsLegalConclusionEstablished: ledger.gateSummary.rightsLegalConclusionEstablished,
    releaseReady: ledger.gateSummary.releaseReady,
    publicReleaseAuthorized: ledger.gateSummary.publicReleaseAuthorized,
    ledgerArtifact: publicIdentity(ledgerSnapshot),
    basisArtifact: publicIdentity(basisSnapshot),
    sourceRightsChild: sourceChild.ledgerArtifact,
    formalContext,
    ledger
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedWesternTzdb2026cControlledReproductionObservation(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export const westernTzdb2026cControlledReproductionObservationTestOnly = OBJECT_FREEZE({
  BASIS_ARTIFACT,
  EXPECTED_PERSISTED_RAW,
  SOURCE_RIGHTS_CHILD,
  FORMAL_CONTEXT,
  UPSTREAM_AND_TOOL_IDENTITIES,
  TRANSFORMATION_FILE_IDENTITIES,
  TZCODE_FILE_IDENTITIES,
  SUCCESS_OUTPUTS,
  FAILED_DIAGNOSTIC_OUTPUTS,
  DOES_NOT_ESTABLISH,
  DIGEST_DOMAIN,
  OBSERVATION_ID,
  assertNoFormalBacklinkText,
  requireVerifiedSourceRightsChild
});
