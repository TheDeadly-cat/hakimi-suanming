import { createHash } from "node:crypto";

import {
  BAZI_DOMAIN_COMPONENT_SPECS
} from "./bazi-domain-release-manifest-lib.mjs";
import {
  isVerifiedBaziDttVersionedParentSupersession,
  loadBaziDttVersionedParentSupersession,
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  isVerifiedBaziBindingFreezeRequirementsV17,
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";
import {
  isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate,
  loadBaziProjectCopyMaterializationVersionAwareCandidate
} from "./bazi-project-copy-materialization-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate,
  loadBaziExpertReviewIntakeGapVersionAwareCandidate
} from "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs";
import {
  computeBaziPolicyWeightsVersionAwareCandidateDigest,
  loadBaziPolicyWeightsVersionAwareCandidate
} from "./bazi-policy-weights-version-aware-candidate-lib.mjs";
import {
  computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest,
  loadBaziEngineeringValueSubjectGapVersionAwareCandidate
} from "./bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziPr10bcVersionAwareCandidate,
  loadBaziPr10bcVersionAwareCandidate
} from "./bazi-pr10bc-version-aware-candidate-lib.mjs";

const CREATE_HASH = createHash;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_KEYS = Object.keys;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_HAS_OWN_PROPERTY = Object.prototype.hasOwnProperty;
const OBJECT_IS = Object.is;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_FIND = Array.prototype.find;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const OBJECT_PROTOTYPE = Object.prototype;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(CREATE_HASH("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const MAP = Map;
const MAP_HAS = Map.prototype.has;
const MAP_GET = Map.prototype.get;
const MAP_SET = Map.prototype.set;
const MAP_SIZE_GET = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(Map.prototype, "size").get;
const SET = Set;
const SET_HAS = Set.prototype.has;
const SET_ADD = Set.prototype.add;
const VERIFIED_RESULTS = new WEAK_SET();

const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate.v1.2";
const CANDIDATE_ID =
  "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.2.0";
const RECORD_TYPE =
  "bazi_domain_release_manifest_version_aware_observation_candidate_v1_2";
const CANDIDATE_STATUS =
  "candidate_only_current_component_observation_stale_policy_context_no_release_authority";
const CREATED_AT = "2026-08-31T00:00:00.000Z";
const FROZEN_GOLDEN_SHA256 =
  "aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29";
const CURRENT_PREVIEW_DIGEST =
  "0c6a1003b3b26215da6be7dc5f68999684993564785cc99ffe0373f9019247d0";
const DRIFT_COMPONENT_IDS = OBJECT_FREEZE([
  "fact_contract",
  "source_bundle",
  "rights_bundle",
  "high_risk_policy"
]);

export const BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_RELATIVE_PATH =
  "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0.json";

const SAVED_MANIFEST = OBJECT_FREEZE({
  path: "content/domain-release/bazi.single-chart-report.v1.7.0.json",
  rawBytes: 12777,
  rawSha256: "d63d80502c6186a66f2eabc4bd2749687978a8cfb22d420842aa4a9d6e0eccd6",
  manifestDigest: "60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932",
  createdAt: "2026-08-25T14:30:00.000Z"
});
const HISTORICAL_D0 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-v17-manifest-drift-decisions.v1.json",
  rawBytes: 11291,
  rawSha256: "91e6cda96190b43f65018c913ffa31f5346500d82842f6ebbd4e8af543734486",
  ledgerId: "hakimi.bazi.v17.manifest-drift-decisions/1.0.0",
  ledgerDigest: "5b82b545a2c5b0cd5714342c1bdaca742f4de44e196cc32817e8310926850d0f",
  storedPreviewDigest: "be637b1e37ae92a9fd047af28d0117334405a39408dc470c766b7ddb8ab96954"
});
const OLD_V11_OBSERVATION = OBJECT_FREEZE({
  path: "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.1.0.json",
  rawBytes: 21859,
  rawSha256: "7768590bc117a229919bcd119a2bfada97d7e77712677947a2a650d6f518233d",
  candidateId: "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.1.0",
  candidateDigest: "be41925d72904e8eb90eea2b77f7de553f7c743d87fd975ae33fa99040571dc2",
  storedPreviewDigest: "85e0a454c76bead4eac239a98a56b55fb662bcc77ff6f1e49e52ee2a6e65ea68"
});

const SOURCE_V16 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  bytes: 50427,
  sha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
  id: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
  digest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c"
});
const RIGHTS_V12 = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  bytes: 23947,
  sha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
  id: "hakimi.bazi.strength.source-rights-candidates/1.2.0",
  digest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc"
});
const SUPERSESSION = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  bytes: 9229,
  sha256: "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
  id: "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
  digest: "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
});
const READINESS_V17 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  bytes: 32629,
  sha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  id: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  digest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});
const PROJECT_COPY_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
  bytes: 10887,
  sha256: "7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83",
  id: "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
  digest: "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f"
});
const EXPERT_INTAKE_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json",
  bytes: 32579,
  sha256: "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df",
  id: "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0",
  digest: "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582"
});
const POLICY_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.1.0.json",
  bytes: 13295,
  sha256: "0b221bfc2669310298d9082711ad111b205c5881e419a90f92776229102f53c1",
  id: "hakimi.bazi/policy-weights-value-evidence.version-aware-candidate/1.1.0",
  digest: "95a1edb8d0228231229b561c97fd4960385e581cef87c3e1f2aa57e979c12c5b"
});
const ENGINEERING_GAP_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.1.0.json",
  bytes: 71168,
  sha256: "f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e",
  id: "hakimi.bazi.engineering_binding_value_subject_gaps.version-aware-candidate/1.1.0",
  digest: "d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330"
});
const PR10BC_V11 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json",
  bytes: 38161,
  sha256: "edb367448f857972e50c735e86acc5252605a0b4d27a2f85c996fcd67d0ed2cc",
  id: "hakimi.bazi.pr10bc.version-aware-candidate-scope-reconciliation/1.1.0",
  digest: "24851de28a762c426e2630c9a52666786274c3c5477b9fc0463f9129e43d20d1"
});
const PACKAGE_LOCK_CURRENT = OBJECT_FREEZE({
  path: "package-lock.json",
  bytes: 174994,
  sha256: "5c0a532cc8061e970e4b0fb8e13a68546f558fc487d8249abc65983a95dccd25",
  staleExpectedSha256: "9c9b3a1c569929b46d3dd5a2f084f6e44209ae0d55f27ff8467990f98e524013"
});
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 22454,
  rawSha256: "88ada4ca435228e7802b97eb0f19665392fb03445d7b065a36aac7a7efe18491"
});

export class BaziDomainReleaseManifestObservationCandidateV12Error extends Error {
  constructor(code, message, cause) {
    super(code + ": " + message, cause === undefined ? undefined : { cause });
    this.name = "BaziDomainReleaseManifestObservationCandidateV12Error";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziDomainReleaseManifestObservationCandidateV12Error(code, message, cause);
}

function canonicalValue(value, seen = new WEAK_SET()) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && NUMBER_IS_FINITE(value) && !OBJECT_IS(value, -0)) return value;
  if (typeof value !== "object") fail("NON_JSON_VALUE", "候选只接受有限 JSON 值。");
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) {
    fail("NON_JSON_GRAPH", "候选不接受 cycle 或 alias。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  if (ARRAY_IS_ARRAY(value)) {
    if (OBJECT_GET_PROTOTYPE_OF(value) !== ARRAY_PROTOTYPE) {
      fail("NON_PASSIVE_OBJECT", "候选数组 prototype 不受支持。");
    }
    const ownKeys = REFLECT_OWN_KEYS(value);
    if (ownKeys.length !== value.length + 1 || ownKeys[ownKeys.length - 1] !== "length") {
      fail("NON_PASSIVE_OBJECT", "候选数组不得含额外 own key。");
    }
    const result = [];
    OBJECT_DEFINE_PROPERTY(result, "toJSON", {
      configurable: false,
      enumerable: false,
      value: undefined,
      writable: false
    });
    for (let index = 0; index < value.length; index += 1) {
      if (!REFLECT_APPLY(OBJECT_HAS_OWN_PROPERTY, value, [index])) {
        fail("NON_PASSIVE_OBJECT", "候选数组不得含 hole。");
      }
      const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, index);
      if (!descriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN_PROPERTY, descriptor, ["value"])
        || descriptor.enumerable !== true) {
        fail("NON_PASSIVE_OBJECT", "候选数组元素必须是可枚举 data property。");
      }
      REFLECT_APPLY(ARRAY_PUSH, result, [canonicalValue(descriptor.value, seen)]);
    }
    return result;
  }
  if (OBJECT_GET_PROTOTYPE_OF(value) !== OBJECT_PROTOTYPE) {
    fail("NON_PASSIVE_OBJECT", "候选对象必须是普通 JSON 对象。");
  }
  const keys = OBJECT_KEYS(value);
  if (REFLECT_OWN_KEYS(value).length !== keys.length) {
    fail("NON_PASSIVE_OBJECT", "候选对象不得含 symbol 或不可枚举 own key。");
  }
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  const result = OBJECT_CREATE(null);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, key);
    if (!descriptor
      || !REFLECT_APPLY(OBJECT_HAS_OWN_PROPERTY, descriptor, ["value"])
      || descriptor.enumerable !== true) {
      fail("NON_PASSIVE_OBJECT", "候选对象字段必须是可枚举 data property。");
    }
    OBJECT_DEFINE_PROPERTY(result, key, {
      configurable: true,
      enumerable: true,
      value: canonicalValue(descriptor.value, seen),
      writable: true
    });
  }
  return result;
}

function canonicalStringify(value) {
  return JSON_STRINGIFY(canonicalValue(value));
}

function cloneJson(value) {
  return JSON_PARSE(canonicalStringify(value));
}

function sha256Bytes(bytes) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Value(value) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function domainSeparatedDigest(domain, value) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [domain, "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, ["\0", "utf8"]);
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringify(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function deepFreeze(value, seen = new WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_OWN_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, keys[index]);
    if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN_PROPERTY, descriptor, ["value"])) {
      fail("NON_PASSIVE_OBJECT", "冻结前发现 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return OBJECT_FREEZE(value);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function computeComponentDigest(component) {
  return sha256Value({
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files: component.files
  });
}

function computeManifestDigest(manifest) {
  const unsigned = cloneJson(manifest);
  delete unsigned.manifestDigest;
  return sha256Value(unsigned);
}

export function computeBaziDomainReleaseManifestObservationCandidateV12Digest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.candidateDigest;
  return domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned);
}

export function serializeBaziDomainReleaseManifestObservationCandidateV12(value) {
  return JSON_STRINGIFY(canonicalValue(value), null, 2) + "\n";
}

function assertRaw(snapshot, expected, label) {
  if (snapshot.path !== expected.path
    || snapshot.rawBytes !== (expected.bytes ?? expected.rawBytes)
    || snapshot.rawSha256 !== (expected.sha256 ?? expected.rawSha256)) {
    fail("RAW_IDENTITY_DRIFT", label + " raw identity 漂移。");
  }
}

async function exactArtifact(workspaceRoot, expected, label) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
  assertRaw(snapshot, expected, label);
  return {
    path: expected.path,
    bytes: snapshot.rawBytes,
    sha256: snapshot.rawSha256,
    id: expected.id,
    digest: expected.digest
  };
}

function assertAuthorityRed(result, label, epochField = "mutationEpochAvailable") {
  const checks = [
    ["releaseReady", false],
    ["publicDeploymentAuthorized", false],
    ["expertClaimsAuthorized", false],
    ["bindingFrozenVerified", 0],
    ["crossFileAtomicSnapshot", false],
    [epochField, false],
    ["mutationEpochReceipt", null],
    ["intervalMutationExcludedAcrossFiles", false],
    ["abaExcluded", false]
  ];
  for (let index = 0; index < checks.length; index += 1) {
    const field = checks[index][0];
    const expected = checks[index][1];
    if (result?.[field] !== expected) fail("UPSTREAM_AUTHORITY_NOT_RED", label + " 字段漂移：" + field);
  }
}

async function expectStaleLoader(loader, workspaceRoot, label) {
  try {
    await loader(workspaceRoot);
  } catch (cause) {
    if (cause?.code === "UNCHANGED_BASIS_RAW_DRIFT") return "UNCHANGED_BASIS_RAW_DRIFT";
    fail("STALE_CONTEXT_FAILURE_CHANGED", label + " 没有以固定 raw-basis 漂移码失败。", cause);
  }
  fail("STALE_CONTEXT_UNEXPECTEDLY_VERIFIED", label + " 不得在旧 package-lock basis 上重新获得品牌。");
}

async function replayCurrentPreview(workspaceRoot) {
  const savedSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, SAVED_MANIFEST.path);
  assertRaw(savedSnapshot, SAVED_MANIFEST, "saved manifest");
  const saved = parseBaziDttStrictJsonArtifact(savedSnapshot);
  if (saved?.manifestDigest !== SAVED_MANIFEST.manifestDigest
    || saved?.createdAt !== SAVED_MANIFEST.createdAt
    || computeManifestDigest(saved) !== SAVED_MANIFEST.manifestDigest
    || saved?.releaseStatus !== "engineering_candidate"
    || saved?.releaseGovernance?.releaseIdentity !== "legacy-v13"
    || saved?.releaseGovernance?.targetSchema !== 13
    || saved?.releaseGovernance?.migrationId !== null) {
    fail("SAVED_MANIFEST_IDENTITY_DRIFT", "保存 Bazi v1.7 manifest 身份或治理边界漂移。");
  }

  const cache = new MAP();
  async function snapshot(relativePath) {
    if (!REFLECT_APPLY(MAP_HAS, cache, [relativePath])) {
      const fileSnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath);
      REFLECT_APPLY(MAP_SET, cache, [relativePath, fileSnapshot]);
    }
    return REFLECT_APPLY(MAP_GET, cache, [relativePath]);
  }

  const components = [];
  for (let specIndex = 0; specIndex < BAZI_DOMAIN_COMPONENT_SPECS.length; specIndex += 1) {
    const spec = BAZI_DOMAIN_COMPONENT_SPECS[specIndex];
    const files = [];
    for (let fileIndex = 0; fileIndex < spec.files.length; fileIndex += 1) {
      const relativePath = spec.files[fileIndex];
      const fileSnapshot = await snapshot(relativePath);
      REFLECT_APPLY(ARRAY_PUSH, files, [{ path: relativePath, sha256: fileSnapshot.rawSha256 }]);
    }
    const component = {
      componentId: spec.componentId,
      version: spec.version,
      status: spec.status,
      files
    };
    REFLECT_APPLY(ARRAY_PUSH, components, [
      { ...component, digest: computeComponentDigest(component) }
    ]);
  }
  const reportComponent = REFLECT_APPLY(ARRAY_FIND, components, [
    (component) => component.componentId === "report_contract"
  ]);
  const golden = reportComponent === undefined
    ? undefined
    : REFLECT_APPLY(ARRAY_FIND, reportComponent.files, [
      (file) => file.path ===
        "packages/research-export/src/golden/single-chart-report.contract.v1.7.json"
    ]);
  if (golden?.sha256 !== FROZEN_GOLDEN_SHA256) {
    fail("V17_GOLDEN_DRIFT", "v1.7 frozen golden 漂移。");
  }

  const current = {
    schemaVersion: "1.0.0",
    recordType: "system_domain_release_manifest",
    systemId: "bazi",
    surface: {
      surfaceId: "single-chart-report",
      surfaceVersion: "1.7.0",
      versionMeaning: "product_surface_contract_not_database_schema_or_domain_authority"
    },
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundary: "preserved",
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    components,
    gateState: {
      bindingRequired: 12,
      engineeringBindingCandidatesMechanicallyVerified: 7,
      engineeringRationalesFrozen: 0,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: true,
      releaseEvidenceComplete: false
    },
    evidenceLedger: {
      engineeringIdentity: "component_digests_verified",
      browserRuntimeEvidence: "not_assessed_in_domain_manifest",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    releaseStatus: "engineering_candidate",
    createdAt: SAVED_MANIFEST.createdAt
  };
  current.manifestDigest = computeManifestDigest(current);

  const savedById = new MAP();
  for (let index = 0; index < saved.components.length; index += 1) {
    const component = saved.components[index];
    if (REFLECT_APPLY(MAP_HAS, savedById, [component.componentId])) {
      fail("SAVED_COMPONENT_DUPLICATE", "保存 manifest 含重复组件：" + component.componentId);
    }
    REFLECT_APPLY(MAP_SET, savedById, [component.componentId, component]);
  }
  const componentReceipts = [];
  const driftEntries = [];
  for (let componentIndex = 0; componentIndex < current.components.length; componentIndex += 1) {
    const component = current.components[componentIndex];
    const savedComponent = REFLECT_APPLY(MAP_GET, savedById, [component.componentId]);
    if (!savedComponent) fail("SAVED_COMPONENT_MISSING", "保存 manifest 缺少组件：" + component.componentId);
    REFLECT_APPLY(ARRAY_PUSH, componentReceipts, [{
      componentId: component.componentId,
      version: component.version,
      status: component.status,
      fileCount: component.files.length,
      savedComponentDigest: savedComponent.digest,
      currentComponentDigest: component.digest,
      savedMatchesCurrent: savedComponent.digest === component.digest
    }]);
    for (let fileIndex = 0; fileIndex < component.files.length; fileIndex += 1) {
      const file = component.files[fileIndex];
      const savedFile = REFLECT_APPLY(ARRAY_FIND, savedComponent.files, [
        (candidate) => candidate.path === file.path
      ]);
      if (!savedFile) fail("SAVED_COMPONENT_FILE_MISSING", "保存 manifest 缺少组件文件：" + file.path);
      if (savedFile.sha256 !== file.sha256) {
        REFLECT_APPLY(ARRAY_PUSH, driftEntries, [{
          componentId: component.componentId,
          path: file.path,
          savedSha256: savedFile.sha256,
          currentSha256: file.sha256,
          savedComponentDigest: savedComponent.digest,
          currentComponentDigest: component.digest
        }]);
      }
    }
  }
  const changedIds = [];
  let unchangedComponentCount = 0;
  for (let index = 0; index < componentReceipts.length; index += 1) {
    const receipt = componentReceipts[index];
    if (receipt.savedMatchesCurrent) unchangedComponentCount += 1;
    else REFLECT_APPLY(ARRAY_PUSH, changedIds, [receipt.componentId]);
  }
  const uniqueDriftPaths = [];
  const seenDriftPaths = new SET();
  for (let index = 0; index < driftEntries.length; index += 1) {
    const driftPath = driftEntries[index].path;
    if (!REFLECT_APPLY(SET_HAS, seenDriftPaths, [driftPath])) {
      REFLECT_APPLY(SET_ADD, seenDriftPaths, [driftPath]);
      REFLECT_APPLY(ARRAY_PUSH, uniqueDriftPaths, [driftPath]);
    }
  }
  REFLECT_APPLY(ARRAY_SORT, uniqueDriftPaths, []);
  const uniqueComponentFilesRead = REFLECT_APPLY(MAP_SIZE_GET, cache, []);
  if (current.manifestDigest !== CURRENT_PREVIEW_DIGEST
    || componentReceipts.length !== 9
    || unchangedComponentCount !== 5
    || !exactJson(changedIds, DRIFT_COMPONENT_IDS)
    || driftEntries.length !== 11
    || uniqueDriftPaths.length !== 8
    || uniqueComponentFilesRead !== 34
    || exactJson(saved, current)) {
    fail("CURRENT_PREVIEW_CHANGED", "当前非权威 preview 不等于冻结的 v1.2 观察点。");
  }
  return {
    saved,
    savedSnapshot,
    current,
    componentReceipts,
    driftEntries,
    uniqueDriftPaths,
    unchangedComponentCount,
    changedComponentCount: componentReceipts.length - unchangedComponentCount,
    uniqueComponentFilesRead
  };
}

async function collectContextObservation(workspaceRoot) {
  const supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  const projectCopy = await loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot);
  const expertIntake = await loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot);
  const pr10bc = await loadBaziPr10bcVersionAwareCandidate(workspaceRoot);
  if (!isVerifiedBaziDttVersionedParentSupersession(supersession)
    || !isVerifiedBaziBindingFreezeRequirementsV17(readiness)
    || !isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate(projectCopy)
    || !isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate(expertIntake)
    || !isVerifiedBaziPr10bcVersionAwareCandidate(pr10bc)) {
    fail("UPSTREAM_PRIVATE_BRAND_MISSING", "至少一个当前机械 context 缺少其原模块 private brand。");
  }
  assertAuthorityRed(supersession, "DTT supersession");
  assertAuthorityRed(readiness, "readiness");
  assertAuthorityRed(projectCopy, "project copy", "mutationEpochAvailableForSchema13");
  assertAuthorityRed(expertIntake, "expert intake", "mutationEpochAvailableForSchema13");
  assertAuthorityRed(pr10bc, "PR10BC");
  if (readiness.activeAdmissionEffect !== "none"
    || projectCopy.activeAdmissionEffect !== "none"
    || expertIntake.activeAdmissionEffect !== "none"
    || pr10bc.activeAdmissionEffect !== "none") {
    fail("UPSTREAM_ADMISSION_EFFECT", "机械 context 不得产生 active admission effect。");
  }

  const source = await exactArtifact(workspaceRoot, SOURCE_V16, "source v1.6");
  const rights = await exactArtifact(workspaceRoot, RIGHTS_V12, "rights v1.2");
  const receipt = await exactArtifact(workspaceRoot, SUPERSESSION, "DTT supersession");
  const readinessArtifact = await exactArtifact(workspaceRoot, READINESS_V17, "readiness v1.7");
  const projectCopyArtifact = await exactArtifact(workspaceRoot, PROJECT_COPY_V11, "project copy v1.1");
  const expertIntakeArtifact = await exactArtifact(workspaceRoot, EXPERT_INTAKE_V11, "expert intake v1.1");
  const pr10bcArtifact = await exactArtifact(workspaceRoot, PR10BC_V11, "PR10BC v1.1");

  const policySnapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, POLICY_V11.path);
  const engineeringGapSnapshot =
    await readBaziDttStableWorkspaceArtifact(workspaceRoot, ENGINEERING_GAP_V11.path);
  const packageLockSnapshot =
    await readBaziDttStableWorkspaceArtifact(workspaceRoot, PACKAGE_LOCK_CURRENT.path);
  assertRaw(policySnapshot, POLICY_V11, "policy v1.1");
  assertRaw(engineeringGapSnapshot, ENGINEERING_GAP_V11, "engineering gap v1.1");
  assertRaw(packageLockSnapshot, PACKAGE_LOCK_CURRENT, "current package-lock");
  const policy = parseBaziDttStrictJsonArtifact(policySnapshot);
  const engineeringGap = parseBaziDttStrictJsonArtifact(engineeringGapSnapshot);
  if (policy?.candidateId !== POLICY_V11.id
    || policy?.candidateDigest !== POLICY_V11.digest
    || computeBaziPolicyWeightsVersionAwareCandidateDigest(policy) !== POLICY_V11.digest) {
    fail("STALE_CONTEXT_SEMANTIC_DRIFT", "policy v1.1 semantic identity 漂移。");
  }
  if (engineeringGap?.ledgerId !== ENGINEERING_GAP_V11.id
    || engineeringGap?.ledgerDigest !== ENGINEERING_GAP_V11.digest
    || computeBaziEngineeringValueSubjectGapVersionAwareCandidateDigest(engineeringGap)
      !== ENGINEERING_GAP_V11.digest) {
    fail("STALE_CONTEXT_SEMANTIC_DRIFT", "engineering gap v1.1 semantic identity 漂移。");
  }
  const policyFailureCode = await expectStaleLoader(
    loadBaziPolicyWeightsVersionAwareCandidate,
    workspaceRoot,
    "policy v1.1"
  );
  const engineeringGapFailureCode = await expectStaleLoader(
    loadBaziEngineeringValueSubjectGapVersionAwareCandidate,
    workspaceRoot,
    "engineering gap v1.1"
  );

  return {
    verifiedContexts: [
      {
        contextId: SUPERSESSION.id,
        role: "source_rights_versioned_parent_supersession_context",
        activeAdmissionEffect: "none",
        directParentArtifacts: [source, rights],
        supportingReceiptArtifacts: [receipt]
      },
      {
        contextId: READINESS_V17.id,
        role: "bazi_v17_candidate_readiness_context",
        activeAdmissionEffect: "none",
        directParentArtifacts: [readinessArtifact],
        supportingReceiptArtifacts: []
      },
      {
        contextId: PROJECT_COPY_V11.id,
        role: "rights_and_project_copy_materialization_zero_instance_context",
        activeAdmissionEffect: "none",
        directParentArtifacts: [projectCopyArtifact],
        supportingReceiptArtifacts: []
      },
      {
        contextId: EXPERT_INTAKE_V11.id,
        role: "expert_intake_zero_instance_gap_context",
        activeAdmissionEffect: "none",
        directParentArtifacts: [expertIntakeArtifact],
        supportingReceiptArtifacts: []
      }
    ],
    staleObservedContexts: [
      {
        contextId: POLICY_V11.id,
        role: "interpretation_and_high_risk_policy_stale_observation_only",
        artifact: {
          path: POLICY_V11.path,
          bytes: policySnapshot.rawBytes,
          sha256: policySnapshot.rawSha256,
          id: POLICY_V11.id,
          digest: POLICY_V11.digest
        },
        loaderPassed: false,
        loaderFailureCode: policyFailureCode,
        countsTowardVerifiedDirectMechanicalContextBrand: false
      },
      {
        contextId: ENGINEERING_GAP_V11.id,
        role: "transitive_engineering_gap_stale_observation_only",
        artifact: {
          path: ENGINEERING_GAP_V11.path,
          bytes: engineeringGapSnapshot.rawBytes,
          sha256: engineeringGapSnapshot.rawSha256,
          id: ENGINEERING_GAP_V11.id,
          digest: ENGINEERING_GAP_V11.digest
        },
        loaderPassed: false,
        loaderFailureCode: engineeringGapFailureCode,
        countsTowardVerifiedDirectMechanicalContextBrand: false
      }
    ],
    verifiedTransitiveObservations: [
      {
        contextId: PR10BC_V11.id,
        role: "transitive_policy_scope_observation_not_direct_brand",
        artifact: pr10bcArtifact,
        loaderPassed: true,
        countsTowardVerifiedDirectMechanicalContextBrand: false
      }
    ],
    staleBasisObservation: {
      path: PACKAGE_LOCK_CURRENT.path,
      priorPinnedSha256: PACKAGE_LOCK_CURRENT.staleExpectedSha256,
      currentBytes: packageLockSnapshot.rawBytes,
      currentSha256: packageLockSnapshot.rawSha256,
      acceptedForRebind: false
    }
  };
}

async function observeHistoricalArtifacts(workspaceRoot) {
  const d0Snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, HISTORICAL_D0.path);
  const oldCandidateSnapshot =
    await readBaziDttStableWorkspaceArtifact(workspaceRoot, OLD_V11_OBSERVATION.path);
  assertRaw(d0Snapshot, HISTORICAL_D0, "historical D0");
  assertRaw(oldCandidateSnapshot, OLD_V11_OBSERVATION, "historical v1.1 observation");
  const d0 = parseBaziDttStrictJsonArtifact(d0Snapshot);
  const oldCandidate = parseBaziDttStrictJsonArtifact(oldCandidateSnapshot);
  if (d0?.ledgerId !== HISTORICAL_D0.ledgerId
    || d0?.ledgerDigest !== HISTORICAL_D0.ledgerDigest
    || d0?.currentExpectedManifestPreview?.semanticManifestDigest
      !== HISTORICAL_D0.storedPreviewDigest
    || d0?.gateSummary?.driftEntriesWithOwnerDecision !== 0) {
    fail("HISTORICAL_D0_DRIFT", "历史 D0 身份或 owner 0 边界漂移。");
  }
  if (oldCandidate?.candidateId !== OLD_V11_OBSERVATION.candidateId
    || oldCandidate?.candidateDigest !== OLD_V11_OBSERVATION.candidateDigest
    || oldCandidate?.currentPreviewObservation?.nonAuthoritativeCurrentExpectedPreviewDigest
      !== OLD_V11_OBSERVATION.storedPreviewDigest) {
    fail("HISTORICAL_V11_OBSERVATION_DRIFT", "历史 v1.1 观察候选身份漂移。");
  }
  if (HISTORICAL_D0.storedPreviewDigest === CURRENT_PREVIEW_DIGEST
    || OLD_V11_OBSERVATION.storedPreviewDigest === CURRENT_PREVIEW_DIGEST) {
    fail("HISTORICAL_BLOCKING_RELATIONSHIP_DRIFT", "历史 preview 与当前 preview 的差异关系漂移。");
  }
  return {
    historicalD0: {
      path: HISTORICAL_D0.path,
      rawBytes: d0Snapshot.rawBytes,
      rawSha256: d0Snapshot.rawSha256,
      ledgerId: HISTORICAL_D0.ledgerId,
      ledgerDigest: HISTORICAL_D0.ledgerDigest,
      storedPreviewDigest: HISTORICAL_D0.storedPreviewDigest,
      ownerDecisionsRecorded: 0,
      legacyVerifierReplayPerformed: false,
      legacyVerifierOutputCaptured: false,
      observedBlockingRelationships: [
        {
          code: "CURRENT_EXPECTED_MANIFEST_CHANGED",
          basis: "stored_preview_digest_differs_from_current_preview_digest"
        }
      ]
    },
    historicalV11Observation: {
      path: OLD_V11_OBSERVATION.path,
      rawBytes: oldCandidateSnapshot.rawBytes,
      rawSha256: oldCandidateSnapshot.rawSha256,
      candidateId: OLD_V11_OBSERVATION.candidateId,
      candidateDigest: OLD_V11_OBSERVATION.candidateDigest,
      storedPreviewDigest: OLD_V11_OBSERVATION.storedPreviewDigest,
      legacyLoaderReplayPerformed: false,
      legacyLoaderOutputCaptured: false,
      observedBlockingRelationships: [
        {
          code: "CURRENT_PREVIEW_CHANGED",
          basis: "stored_preview_digest_differs_from_current_preview_digest"
        }
      ]
    }
  };
}

async function buildExpectedCandidate(workspaceRoot) {
  const preview = await replayCurrentPreview(workspaceRoot);
  const context = await collectContextObservation(workspaceRoot);
  const historical = await observeHistoricalArtifacts(workspaceRoot);
  const unsigned = {
    schemaVersion: "1.2.0",
    recordType: RECORD_TYPE,
    candidateId: CANDIDATE_ID,
    status: CANDIDATE_STATUS,
    createdAt: CREATED_AT,
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    savedManifestObservation: {
      path: SAVED_MANIFEST.path,
      rawBytes: preview.savedSnapshot.rawBytes,
      rawSha256: preview.savedSnapshot.rawSha256,
      manifestDigest: preview.saved.manifestDigest,
      releaseStatus: preview.saved.releaseStatus,
      savedManifestCurrent: false,
      formalVerifierReplayPerformed: false,
      formalVerifierOutputCaptured: false,
      observedBlockingRelationships: [
        {
          code: "MANIFEST_MISMATCH",
          basis: "saved_manifest_differs_from_recomputed_non_authoritative_preview"
        }
      ]
    },
    currentPreviewObservation: {
      authoritative: false,
      persistedAsDomainManifest: false,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      nonAuthoritativeCurrentExpectedPreviewDigest: preview.current.manifestDigest,
      componentsObserved: preview.componentReceipts.length,
      unchangedComponentsObserved: preview.unchangedComponentCount,
      changedComponentsObserved: preview.changedComponentCount,
      componentFileDriftEntryCount: preview.driftEntries.length,
      uniqueDriftPathCount: preview.uniqueDriftPaths.length,
      componentDriftIds: DRIFT_COMPONENT_IDS,
      totalUniqueComponentFilesObserved: preview.uniqueComponentFilesRead,
      frozenGoldenSha256: FROZEN_GOLDEN_SHA256,
      frozenGoldenMatchesCurrentBytes: true,
      componentReceipts: preview.componentReceipts,
      driftEntries: preview.driftEntries
    },
    contextBrandBoundary: {
      activeAdmissionEffect: "none",
      authorityInherited: false,
      verifiedDirectMechanicalContextBrandCount: context.verifiedContexts.length,
      verifiedTransitiveMechanicalContextBrandCount:
        context.verifiedTransitiveObservations.length,
      verifiedMechanicalContextBrandResultCount:
        context.verifiedContexts.length + context.verifiedTransitiveObservations.length,
      verifiedReleaseParentBrandCount: 0,
      directLogicalParentArtifactCount: 5,
      supportingReceiptArtifactCount: 1,
      staleObservedContextCount: context.staleObservedContexts.length,
      verifiedContexts: context.verifiedContexts,
      staleObservedContexts: context.staleObservedContexts,
      verifiedTransitiveObservations: context.verifiedTransitiveObservations,
      staleBasisObservation: context.staleBasisObservation
    },
    ownerDecisionBoundary: {
      ownerDecisionsRecorded: 0,
      ownerAcceptanceVerified: false,
      ownerAttributionVerified: false,
      manifestRebindAuthorized: false,
      manifestResignAuthorized: false
    },
    gateSummary: {
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      formalAdmissionPromotionBlocked: true,
      formalActivationAllowed: false,
      admissionAuthorized: false,
      releaseCandidateFreezeAllowed: false,
      releaseReady: false
    },
    authorityBoundary: {
      engineeringObservationOnly: true,
      browserRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      expertIdentityCredentialsIndependenceEstablished: false,
      sourceFreezeEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseEvidenceComplete: false,
      deploymentAndRollbackConfirmed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      crossSystemAuthorityInheritanceAllowed: false
    },
    historicalAccounting: historical,
    implementationIsolation: {
      productionConsumerReferencesAllowed: false,
      systemAdmissionRegistryRegistrationAllowed: false,
      packageScriptRegistrationAllowed: false,
      prebuildIntegrationAllowed: false,
      defaultWebIntegrationAllowed: false,
      oldV11MutationAllowed: false,
      historicalD0MutationAllowed: false,
      savedManifestMutationAllowed: false
    },
    doesNotEstablish: [
      "current_authoritative_domain_manifest",
      "owner_acceptance_rebind_or_resign",
      "domain_or_content_truth",
      "expert_identity_credentials_independence_opinion_or_truth",
      "source_freeze_or_rights_legal_conclusion",
      "browser_pwa_service_worker_or_runtime_validation",
      "cross_file_atomic_snapshot_or_mutation_epoch",
      "interval_mutation_or_aba_exclusion",
      "release_candidate_freeze_or_release_readiness",
      "public_release_deployment_or_expert_claims_authorization",
      "cross_system_authority_inheritance"
    ]
  };
  return {
    ...unsigned,
    candidateDigest: computeBaziDomainReleaseManifestObservationCandidateV12Digest(unsigned)
  };
}

function assertCandidateBoundary(candidate) {
  if (candidate?.candidateId !== CANDIDATE_ID
    || candidate?.recordType !== RECORD_TYPE
    || candidate?.status !== CANDIDATE_STATUS
    || candidate?.candidateDigest
      !== computeBaziDomainReleaseManifestObservationCandidateV12Digest(candidate)
    || candidate?.releaseGovernance?.activeLine !== "legacy-v13"
    || candidate?.releaseGovernance?.targetSchema !== 13
    || candidate?.releaseGovernance?.migrationId !== null
    || candidate?.savedManifestObservation?.savedManifestCurrent !== false
    || candidate?.currentPreviewObservation?.nonAuthoritativeCurrentExpectedPreviewDigest
      !== CURRENT_PREVIEW_DIGEST
    || candidate?.currentPreviewObservation?.frozenGoldenSha256 !== FROZEN_GOLDEN_SHA256
    || candidate?.contextBrandBoundary?.verifiedDirectMechanicalContextBrandCount !== 4
    || candidate?.contextBrandBoundary?.verifiedTransitiveMechanicalContextBrandCount !== 1
    || candidate?.contextBrandBoundary?.verifiedMechanicalContextBrandResultCount !== 5
    || candidate?.contextBrandBoundary?.staleObservedContextCount !== 2
    || candidate?.contextBrandBoundary?.verifiedReleaseParentBrandCount !== 0
    || candidate?.contextBrandBoundary?.authorityInherited !== false
    || candidate?.contextBrandBoundary?.activeAdmissionEffect !== "none"
    || candidate?.ownerDecisionBoundary?.ownerDecisionsRecorded !== 0
    || candidate?.gateSummary?.bindingFrozenVerified !== 0
    || candidate?.gateSummary?.bindingRequired !== 12
    || candidate?.gateSummary?.independentExpertReviewsVerified !== 0
    || candidate?.gateSummary?.independentExpertsRequired !== 2
    || candidate?.gateSummary?.admissionAuthorized !== false
    || candidate?.gateSummary?.releaseReady !== false
    || candidate?.authorityBoundary?.publicDeploymentAuthorized !== false
    || candidate?.authorityBoundary?.expertClaimsAuthorized !== false
    || candidate?.currentPreviewObservation?.crossFileAtomicSnapshot !== false
    || candidate?.currentPreviewObservation?.mutationEpochAvailableForSchema13 !== false
    || candidate?.currentPreviewObservation?.mutationEpochReceipt !== null
    || candidate?.currentPreviewObservation?.intervalMutationExcludedAcrossFiles !== false
    || candidate?.currentPreviewObservation?.abaExcluded !== false) {
    fail("CANDIDATE_BOUNDARY_DRIFT", "v1.2 candidate-only 身份、计数或红门漂移。");
  }
}

export async function loadBaziDomainReleaseManifestObservationCandidateV12(workspaceRoot) {
  const expected = await buildExpectedCandidate(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_CANDIDATE_RAW_DRIFT", "持久化 v1.2 观察候选 raw identity 漂移。");
  }
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (!exactJson(persisted, expected)) {
    fail("PERSISTED_CANDIDATE_MISMATCH", "持久化 v1.2 观察候选不等于当前冻结机械投影。");
  }
  assertCandidateBoundary(persisted);
  const result = deepFreeze({
    candidate: persisted,
    candidateId: persisted.candidateId,
    candidateDigest: persisted.candidateDigest,
    artifact: {
      path: snapshot.path,
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    },
    privateBrandVerified: true
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziDomainReleaseManifestObservationCandidateV12(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export const baziDomainReleaseManifestObservationCandidateV12TestOnly = OBJECT_FREEZE({
  CANDIDATE_ID,
  RECORD_TYPE,
  CANDIDATE_STATUS,
  CANDIDATE_DIGEST_DOMAIN,
  CURRENT_PREVIEW_DIGEST,
  FROZEN_GOLDEN_SHA256,
  EXPECTED_PERSISTED,
  SAVED_MANIFEST,
  HISTORICAL_D0,
  OLD_V11_OBSERVATION,
  POLICY_V11,
  ENGINEERING_GAP_V11,
  PACKAGE_LOCK_CURRENT,
  buildExpectedCandidate,
  assertCandidateBoundary,
  canonicalStringify,
  sha256Bytes
});
