import {
  close as closeFileDescriptorCallback,
  closeSync as closeFileDescriptorSync,
  constants as fsConstants,
  fstat as statFileDescriptorCallback,
  fstatSync as statFileDescriptorSync,
  lstatSync,
  open as openFileDescriptorCallback,
  openSync as openFileDescriptorSync,
  read as readFileDescriptorCallback,
  readSync as readFileDescriptorSync,
  realpathSync
} from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { types as utilTypes } from "node:util";
import { runInNewContext } from "node:vm";

import {
  canonicalPrettyStringifyVedicProductizationRequirements,
  parseVedicProductizationRequirementsJsonBytes,
  verifyVedicProductizationRequirementsLedger
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal,
  parseVedicRuntimeAndBundleSizeProposalJsonBytes,
  verifyVedicRuntimeAndBundleSizeProposal
} from "./vedic-runtime-and-bundle-size-proposal-lib.mjs";
import {
  canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate,
  isVerifiedVedicProductizationVersionAwareObservationCandidate,
  loadVedicProductizationVersionAwareObservationCandidate,
  parseVedicProductizationVersionAwareObservationCandidateJsonBytes
} from "./vedic-independent-productization-version-aware-observation-candidate-lib.mjs";

const CLEAN_PRIMORDIALS = runInNewContext(`
  (() => {
    const TypedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
    const ArrayIteratorPrototype = Object.getPrototypeOf([][Symbol.iterator]());
    const StringIteratorPrototype = Object.getPrototypeOf(""[Symbol.iterator]());
    const primordials = {
      ArrayFind: Array.prototype.find,
      ArrayIsArray: Array.isArray,
      ArrayPush: Array.prototype.push,
      ArraySlice: Array.prototype.slice,
      ArraySort: Array.prototype.sort,
      JsonObject: JSON,
      JsonParse: JSON.parse,
      JsonStringify: JSON.stringify,
      NumberIsFinite: Number.isFinite,
      NumberIsSafeInteger: Number.isSafeInteger,
      ObjectDefineProperty: Object.defineProperty,
      ObjectFreeze: Object.freeze,
      ObjectGetOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
      ObjectGetOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,
      ObjectGetPrototypeOf: Object.getPrototypeOf,
      ObjectHasOwn: Object.hasOwn,
      ObjectIs: Object.is,
      ObjectIsFrozen: Object.isFrozen,
      ReflectApply: Reflect.apply,
      ReflectDeleteProperty: Reflect.deleteProperty,
      ReflectGet: Reflect.get,
      ReflectOwnKeys: Reflect.ownKeys,
      StringCharCodeAt: String.prototype.charCodeAt,
      StringConstructor: String,
      StringFromCodePoint: String.fromCodePoint,
      StringIncludes: String.prototype.includes,
      StringSplit: String.prototype.split,
      StringStartsWith: String.prototype.startsWith,
      TypedArrayByteLengthGetter:
        Object.getOwnPropertyDescriptor(TypedArrayPrototype, "byteLength").get,
      Uint8ArrayConstructor: Uint8Array,
      Uint32ArrayConstructor: Uint32Array,
      WeakSetConstructor: WeakSet,
      WeakSetAdd: WeakSet.prototype.add,
      WeakSetHas: WeakSet.prototype.has
    };
    Object.freeze(Array.prototype);
    Object.freeze(ArrayIteratorPrototype);
    Object.freeze(Object.prototype);
    Object.freeze(Promise.prototype);
    Object.freeze(String.prototype);
    Object.freeze(StringIteratorPrototype);
    Object.freeze(TypedArrayPrototype);
    Object.freeze(Uint8Array.prototype);
    Object.freeze(Uint32Array.prototype);
    Object.freeze(WeakSet.prototype);
    Object.freeze(Function.prototype);
    Object.freeze(Error.prototype);
    Object.freeze(SyntaxError.prototype);
    Object.freeze(Array);
    Object.freeze(Object);
    Object.freeze(Promise);
    Object.freeze(String);
    Object.freeze(Number);
    Object.freeze(Uint8Array);
    Object.freeze(Uint32Array);
    Object.freeze(WeakSet);
    Object.freeze(Function);
    Object.freeze(Error);
    Object.freeze(SyntaxError);
    Object.freeze(JSON);
    Object.freeze(Reflect);
    return Object.freeze(primordials);
  })()
`);

const ARRAY_IS_ARRAY = CLEAN_PRIMORDIALS.ArrayIsArray;
const ARRAY_FIND = CLEAN_PRIMORDIALS.ArrayFind;
const ARRAY_PUSH = CLEAN_PRIMORDIALS.ArrayPush;
const ARRAY_SLICE = CLEAN_PRIMORDIALS.ArraySlice;
const ARRAY_SORT = CLEAN_PRIMORDIALS.ArraySort;
const JSON_OBJECT = CLEAN_PRIMORDIALS.JsonObject;
const JSON_PARSE = CLEAN_PRIMORDIALS.JsonParse;
const JSON_STRINGIFY = CLEAN_PRIMORDIALS.JsonStringify;
const NUMBER_IS_FINITE = CLEAN_PRIMORDIALS.NumberIsFinite;
const NUMBER_IS_SAFE_INTEGER = CLEAN_PRIMORDIALS.NumberIsSafeInteger;
const OBJECT_DEFINE_PROPERTY = CLEAN_PRIMORDIALS.ObjectDefineProperty;
const OBJECT_FREEZE = CLEAN_PRIMORDIALS.ObjectFreeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR =
  CLEAN_PRIMORDIALS.ObjectGetOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS =
  CLEAN_PRIMORDIALS.ObjectGetOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = CLEAN_PRIMORDIALS.ObjectGetPrototypeOf;
const OBJECT_HAS_OWN = CLEAN_PRIMORDIALS.ObjectHasOwn;
const OBJECT_IS = CLEAN_PRIMORDIALS.ObjectIs;
const OBJECT_IS_FROZEN = CLEAN_PRIMORDIALS.ObjectIsFrozen;
const REFLECT_APPLY = CLEAN_PRIMORDIALS.ReflectApply;
const REFLECT_DELETE_PROPERTY = CLEAN_PRIMORDIALS.ReflectDeleteProperty;
const REFLECT_GET = CLEAN_PRIMORDIALS.ReflectGet;
const REFLECT_OWN_KEYS = CLEAN_PRIMORDIALS.ReflectOwnKeys;
const STRING_CONSTRUCTOR = CLEAN_PRIMORDIALS.StringConstructor;
const STRING_CHAR_CODE_AT = CLEAN_PRIMORDIALS.StringCharCodeAt;
const STRING_FROM_CODE_POINT = CLEAN_PRIMORDIALS.StringFromCodePoint;
const STRING_INCLUDES = CLEAN_PRIMORDIALS.StringIncludes;
const STRING_SPLIT = CLEAN_PRIMORDIALS.StringSplit;
const STRING_STARTS_WITH = CLEAN_PRIMORDIALS.StringStartsWith;
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  CLEAN_PRIMORDIALS.TypedArrayByteLengthGetter;
const CLEAN_UINT8_ARRAY = CLEAN_PRIMORDIALS.Uint8ArrayConstructor;
const CLEAN_UINT32_ARRAY = CLEAN_PRIMORDIALS.Uint32ArrayConstructor;
const OUTER_UINT8_ARRAY = globalThis.Uint8Array;
const NATIVE_WEAK_SET = CLEAN_PRIMORDIALS.WeakSetConstructor;
const WEAK_SET_ADD = CLEAN_PRIMORDIALS.WeakSetAdd;
const WEAK_SET_HAS = CLEAN_PRIMORDIALS.WeakSetHas;
const IS_PROXY = utilTypes.isProxy;
const IS_PROMISE = utilTypes.isPromise;
const ARRAY_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [[]]);
const OBJECT_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [{}]);

const FILE_OPEN = openFileDescriptorCallback;
const FILE_READ = readFileDescriptorCallback;
const FILE_STAT = statFileDescriptorCallback;
const FILE_CLOSE = closeFileDescriptorCallback;
const FILE_LSTAT = lstat;
const FILE_REALPATH = realpath;
const FILE_OPEN_SYNC = openFileDescriptorSync;
const FILE_READ_SYNC = readFileDescriptorSync;
const FILE_STAT_SYNC = statFileDescriptorSync;
const FILE_CLOSE_SYNC = closeFileDescriptorSync;
const FILE_LSTAT_SYNC = lstatSync;
const FILE_REALPATH_SYNC = realpathSync;
const PATH_DIRNAME = path.dirname;
const PATH_IS_ABSOLUTE = path.isAbsolute;
const PATH_JOIN = path.join;
const PATH_POSIX_NORMALIZE = path.posix.normalize;
const PATH_RELATIVE = path.relative;
const PATH_RESOLVE = path.resolve;
const PATH_SEPARATOR = path.sep;
const FILE_TYPE_MASK = fsConstants.S_IFMT;
const FILE_TYPE_REGULAR = fsConstants.S_IFREG;
const FILE_TYPE_DIRECTORY = fsConstants.S_IFDIR;
const FILE_TYPE_SYMBOLIC_LINK = fsConstants.S_IFLNK;
const PROCESS_CWD = process.cwd;
const PROCESS_OBJECT = process;
const OUTER_GLOBAL = globalThis;
const OUTER_PROMISE = globalThis.Promise;
const OUTER_PROMISE_PROTOTYPE = OUTER_PROMISE.prototype;
const OUTER_PROMISE_THEN = OUTER_PROMISE_PROTOTYPE.then;
const OUTER_SYMBOL_SPECIES = globalThis.Symbol.species;
const OUTER_PROMISE_GLOBAL_DESCRIPTOR = OBJECT_FREEZE(REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [OUTER_GLOBAL, "Promise"]
));
const OUTER_PROMISE_PROTOTYPE_DESCRIPTOR = OBJECT_FREEZE(REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [OUTER_PROMISE, "prototype"]
));
const OUTER_PROMISE_CONSTRUCTOR_DESCRIPTOR = OBJECT_FREEZE(REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [OUTER_PROMISE_PROTOTYPE, "constructor"]
));
const OUTER_PROMISE_THEN_DESCRIPTOR = OBJECT_FREEZE(REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [OUTER_PROMISE_PROTOTYPE, "then"]
));
const OUTER_PROMISE_SPECIES_DESCRIPTOR = OBJECT_FREEZE(REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [OUTER_PROMISE, OUTER_SYMBOL_SPECIES]
));
const PROPERTY_DESCRIPTOR_FIELDS = OBJECT_FREEZE([
  "configurable",
  "enumerable",
  "get",
  "set",
  "value",
  "writable"
]);
const DISCARD_PROMISE_SETTLEMENT = OBJECT_FREEZE(() => undefined);

const MAX_ARTIFACT_BYTES = 256 * 1024;
const MAX_CANONICAL_DEPTH = 96;
const MAX_CANONICAL_NODES = 250_000;
const MAX_CANONICAL_TEXT_CHARACTERS = 3_000_000;
const DESIGN_DIGEST_DOMAIN =
  "hakimi.vedic.independent-storage-backup-recovery-rollback.design-candidate.v0.1";

export const VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/vedic-independent-storage-backup-recovery-and-rollback-design-candidate.v0.1.0.json";

const DESIGN_ID =
  "hakimi.vedic.independent-storage-backup-recovery-rollback.design-candidate/0.1.0";
const RECORD_TYPE =
  "vedic_independent_storage_backup_recovery_and_rollback_design_candidate_v0_1";
const STATUS =
  "requirements_only_design_candidate_six_interfaces_defined_zero_implementation_parent_still_required_absent_no_rereview_effect";
const CREATED_AT = "2026-08-30T00:00:00.000Z";

const ADR_CONTEXT = OBJECT_FREEZE({
  contextId: "vedic_independent_product_boundary_adr",
  path: "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md",
  bytes: 4531,
  sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63",
  requiredMarker: "5. 独立数据库、备份、恢复与回滚设计；"
});

const PARENT_CONTEXT = OBJECT_FREEZE({
  contextId: "historical_parent_requirements_ledger_v1",
  path: "content/system-admission/vedic-independent-productization-requirements.v1.json",
  bytes: 25578,
  sha256: "c9f0fbb3b25c3ad582dc4c3f5534e7e27cb44e47721dbf806b8085cefb6b26f8",
  semanticDigestField: "ledgerDigest",
  semanticDigest: "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb",
  schemaVersion: "1.0.0",
  requiredRereviewRequirementId:
    "independent_storage_backup_recovery_and_rollback_design",
  requiredRereviewRequirementState: "required_absent"
});

const RUNTIME_CONTEXT = OBJECT_FREEZE({
  contextId: "runtime_and_bundle_size_proposal_v1",
  path: "content/system-admission/vedic-runtime-and-bundle-size-proposal.v1.json",
  bytes: 27241,
  sha256: "e268aa78d6123c34481752cc8e0789e1a185f3f2e2ce9757c45d6227f5bea30e",
  semanticDigestField: "proposalDigest",
  semanticDigest: "ae9fb180d97e81a30a9157655d168bb4101d993f859f40990db31c2e12954f15",
  requiredDeferredDesignKey:
    "storageBackupRecoveryMutationEpochCapacityRollback",
  expectedDesignArtifactsObserved: 0,
  expectedRequirementState:
    "separate_rereview_requirement_plan_only_not_satisfied"
});

const OBSERVATION_CONTEXT = OBJECT_FREEZE({
  contextId: "version_aware_parent_children_observation_candidate_v1_1",
  path:
    "content/system-admission/vedic-independent-productization-version-aware-observation-candidate.v1.1.0.json",
  bytes: 14110,
  sha256: "d87a9340c4afd280e1aeb004f4322d2088868b79f31b7c2fd3191e8d14e1343a",
  semanticDigestField: "candidateDigest",
  semanticDigest: "3eebcbcd60dfd1f4a96671ec2ab18bd6cceb20d14806acd44a00603e4848a8d1",
  expectedActiveAdmissionEffect: "none",
  expectedParentLedgerUpdated: false,
  expectedRegistryUpdated: false
});

const TRANSITIVE_CURRENT_RAW_CONTEXTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    bindingRole: "parent_input_contract_draft",
    bytes: 16529,
    contextId: "transitive_input_contract_draft_v0_1",
    path: "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json",
    sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_input_contract_requirements",
    bytes: 15859,
    contextId: "transitive_input_contract_requirements_v1",
    path: "content/system-admission/vedic-input-contract-requirements.v1.json",
    sha256: "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_fact_contract_draft",
    bytes: 14240,
    contextId: "transitive_fact_contract_draft_v0_1",
    path: "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json",
    sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_fact_contract_requirements",
    bytes: 42634,
    contextId: "transitive_fact_contract_requirements_v1",
    path: "content/system-admission/vedic-fact-contract-requirements.v1.json",
    sha256: "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_rule_contract_draft",
    bytes: 12140,
    contextId: "transitive_rule_contract_draft_v0_1",
    path: "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json",
    sha256: "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_rule_contract_requirements",
    bytes: 30734,
    contextId: "transitive_rule_contract_requirements_v1",
    path: "content/system-admission/vedic-rule-contract-requirements.v1.json",
    sha256: "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94"
  }),
  OBJECT_FREEZE({
    bindingRole: "runtime_proposal_license_evidence_child",
    bytes: 23919,
    contextId: "transitive_runtime_dependency_license_evidence_v1",
    path: "content/system-admission/vedic-runtime-dependency-license-evidence.v1.json",
    sha256: "ed51e68438bc3b00613986e082d6064ceea41e9f75dc9992613e1b91449105e1"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_source_binding_and_rights_requirements_child",
    bytes: 85752,
    contextId: "transitive_source_binding_and_three_layer_rights_requirements_v1",
    path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
    sha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_real_independent_expert_review_plan_child",
    bytes: 37131,
    contextId: "transitive_real_independent_expert_review_plan_v1",
    path: "content/system-admission/vedic-real-independent-expert-review-plan.v1.json",
    sha256: "9bcbff519dd38d40f26dfba1ccabe1c2987700200cf3a7f6eb7bf68254d7cf89"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_external_observation_document",
    bytes: 97473,
    contextId: "transitive_github_external_reference_audit_2026_08_24",
    path: "docs/GitHub外部参考审计-2026-08-24.md",
    sha256: "ac3b4620de3d183f60511b1ec0dacb268281f43fee75018ae533efb5ddd957bc"
  }),
  OBJECT_FREEZE({
    bindingRole: "parent_external_observation_document",
    bytes: 19451,
    contextId: "transitive_public_sites_and_repositories_audit_2026_08_25",
    path: "docs/公开命理网站与五仓库吸收审计-2026-08-25.md",
    sha256: "082c1a852b129c3ca5e35c6e619603071dff59a9615702862af4316538db34c0"
  }),
  OBJECT_FREEZE({
    bindingRole: "observation_input_structural_rejection_evidence_child",
    bytes: 26585,
    contextId: "transitive_input_structural_rejection_execution_evidence_v1",
    path: "content/system-admission/vedic-input-structural-rejection-execution-evidence.v1.json",
    sha256: "da953b36a3bef662833ae5763e3cdde7dd84b129089e96a8445ddbc582d1a67f"
  }),
  OBJECT_FREEZE({
    bindingRole: "observation_high_risk_expression_policy_child",
    bytes: 15788,
    contextId: "transitive_high_risk_expression_policy_draft_v0_1",
    path: "content/system-admission/vedic-high-risk-expression-policy-draft.v0.1.0.json",
    sha256: "8a1295c4f68da87a50ac2d6f8689765c271e007a68d63dfe2afa88377d94f5fa"
  }),
  OBJECT_FREEZE({
    bindingRole: "input_evidence_disk_helper_identity_not_loaded_module_identity",
    bytes: 23349,
    contextId: "transitive_input_structural_rejection_execution_helper_source",
    path: "scripts/vedic-input-structural-rejection-execution-lib.mjs",
    sha256: "a49e065a98b30512a6486998650e66009568503eab20a379663e3d8d178cb88a"
  }),
  OBJECT_FREEZE({
    bindingRole: "input_evidence_disk_helper_identity_not_loaded_module_identity",
    bytes: 30839,
    contextId: "transitive_input_contract_draft_helper_source",
    path: "scripts/vedic-input-contract-draft-lib.mjs",
    sha256: "a20cf2b30c848bda5d813db9b2b431185f1ffb1123c39fc1436b9309e0c84db0"
  }),
  OBJECT_FREEZE({
    bindingRole: "input_evidence_disk_helper_identity_not_loaded_module_identity",
    bytes: 48822,
    contextId: "transitive_input_contract_requirements_helper_source",
    path: "scripts/vedic-input-contract-requirements-lib.mjs",
    sha256: "b188481682fa0923e502c73064cae24f44bb7d2f2934814d4a8de1d20cc8e0dc"
  })
]);

const INTERFACE_REQUIREMENT_IDS = OBJECT_FREEZE([
  "separate_vedic_storage_namespace_interface",
  "storage_capacity_budget_interface",
  "mutation_epoch_receipt_interface",
  "backup_interface",
  "recovery_interface",
  "rollback_interface"
]);

const QUANTITATIVE_PLAN_REFS = OBJECT_FREEZE([
  "#/runtimeOptions/0/candidateCeilings/2/proposedCeiling",
  "#/runtimeOptions/1/candidateCeilings/2/proposedCeiling",
  "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
  "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling"
]);

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 25978,
  rawSha256: "1eeaf1419ce4b3ae01f277f6389fc3bbdf5a59605f89d4c7ae7eccfc1a8d1bbf"
});

const CANDIDATE_RAW_CONTEXT = OBJECT_FREEZE({
  bytes: EXPECTED_PERSISTED.rawBytes,
  path:
    VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH,
  sha256: EXPECTED_PERSISTED.rawSha256
});

const VERIFIED_RESULT_ROOT_KEYS = OBJECT_FREEZE([
  "activeAdmissionEffect",
  "artifact",
  "authorityRedGates",
  "currentVedicStorageDesignMechanicallyVerified",
  "designCoverage",
  "designDigest",
  "designId",
  "implementationAccounting",
  "mutationRedGates",
  "productIdentity",
  "projectReleaseGovernanceContext",
  "rereviewBoundary",
  "sequentialEndpointObservationMechanicallyVerified",
  "simultaneousCurrentRawClosureVerified"
]);

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class VedicIndependentStorageBackupRecoveryRollbackDesignCandidateError
  extends Error {
  constructor(code, message) {
    super(message);
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [this, "name", {
      configurable: false,
      enumerable: true,
      value: "VedicIndependentStorageBackupRecoveryRollbackDesignCandidateError",
      writable: false
    }]);
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [this, "code", {
      configurable: false,
      enumerable: true,
      value: code,
      writable: false
    }]);
  }
}

function fail(code, message) {
  throw new VedicIndependentStorageBackupRecoveryRollbackDesignCandidateError(
    code,
    message
  );
}

function hasOwn(object, key) {
  return object !== null
    && (typeof object === "object" || typeof object === "function")
    && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [object, key]);
}

function hasOwnDataProperty(object, key) {
  if (!hasOwn(object, key)) return false;
  const descriptor = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
    Object,
    [object, key]
  );
  return descriptor !== undefined && hasOwn(descriptor, "value");
}

function ownDataValue(object, key) {
  if (!hasOwnDataProperty(object, key)) return undefined;
  const descriptor = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
    Object,
    [object, key]
  );
  return REFLECT_APPLY(REFLECT_GET, Reflect, [descriptor, "value", descriptor]);
}

function descriptorMapEntry(descriptors, key) {
  return ownDataValue(descriptors, key);
}

function samePropertyDescriptor(actual, expected) {
  if ((actual === undefined) !== (expected === undefined)) return false;
  if (actual === undefined) return true;
  for (let index = 0; index < PROPERTY_DESCRIPTOR_FIELDS.length; index += 1) {
    const field = PROPERTY_DESCRIPTOR_FIELDS[index];
    if (hasOwn(actual, field) !== hasOwn(expected, field)) return false;
    if (hasOwn(actual, field)
      && !REFLECT_APPLY(OBJECT_IS, Object, [
        ownDataValue(actual, field),
        ownDataValue(expected, field)
      ])) {
      return false;
    }
  }
  return true;
}

function assertOuterPromiseIntegrity() {
  let globalDescriptor;
  let prototypeDescriptor;
  let constructorDescriptor;
  let thenDescriptor;
  let speciesDescriptor;
  let promisePrototypeParent;
  let arrayPrototypeParent;
  let objectPrototypeParent;
  try {
    globalDescriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [OUTER_GLOBAL, "Promise"]
    );
    prototypeDescriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [OUTER_PROMISE, "prototype"]
    );
    constructorDescriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [OUTER_PROMISE_PROTOTYPE, "constructor"]
    );
    thenDescriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [OUTER_PROMISE_PROTOTYPE, "then"]
    );
    speciesDescriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [OUTER_PROMISE, OUTER_SYMBOL_SPECIES]
    );
    promisePrototypeParent = REFLECT_APPLY(
      OBJECT_GET_PROTOTYPE_OF,
      Object,
      [OUTER_PROMISE_PROTOTYPE]
    );
    arrayPrototypeParent = REFLECT_APPLY(
      OBJECT_GET_PROTOTYPE_OF,
      Object,
      [ARRAY_PROTOTYPE]
    );
    objectPrototypeParent = REFLECT_APPLY(
      OBJECT_GET_PROTOTYPE_OF,
      Object,
      [OBJECT_PROTOTYPE]
    );
  } catch {
    fail(
      "OUTER_PROMISE_INTRINSIC_MISMATCH",
      "吠陀存储设计校验所需的 outer Promise 描述符不可安全读取。"
    );
  }
  if (!samePropertyDescriptor(globalDescriptor, OUTER_PROMISE_GLOBAL_DESCRIPTOR)
    || !samePropertyDescriptor(
      prototypeDescriptor,
      OUTER_PROMISE_PROTOTYPE_DESCRIPTOR
    )
    || !samePropertyDescriptor(
      constructorDescriptor,
      OUTER_PROMISE_CONSTRUCTOR_DESCRIPTOR
    )
    || !samePropertyDescriptor(thenDescriptor, OUTER_PROMISE_THEN_DESCRIPTOR)
    || !samePropertyDescriptor(speciesDescriptor, OUTER_PROMISE_SPECIES_DESCRIPTOR)
    || promisePrototypeParent !== OBJECT_PROTOTYPE
    || arrayPrototypeParent !== OBJECT_PROTOTYPE
    || objectPrototypeParent !== null
    || hasOwn(ARRAY_PROTOTYPE, "then")
    || hasOwn(OBJECT_PROTOTYPE, "then")) {
    fail(
      "OUTER_PROMISE_INTRINSIC_MISMATCH",
      "吠陀存储设计校验检测到 outer Promise 或 thenable 原型边界漂移。"
    );
  }
}

function requirePristineAwaitable(value, label) {
  assertOuterPromiseIntegrity();
  let isPromise;
  let prototype;
  let hasOwnConstructor;
  let hasOwnThen;
  try {
    isPromise = REFLECT_APPLY(IS_PROMISE, utilTypes, [value]);
    prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
    hasOwnConstructor = hasOwn(value, "constructor");
    hasOwnThen = hasOwn(value, "then");
  } catch {
    fail(
      "AWAITABLE_IDENTITY_MISMATCH",
      label + " 的 awaitable 身份不可安全读取。"
    );
  }
  if (isPromise !== true
    || prototype !== OUTER_PROMISE_PROTOTYPE
    || hasOwnConstructor
    || hasOwnThen) {
    if (isPromise === true && prototype === OUTER_PROMISE_PROTOTYPE) {
      try {
        const constructorDescriptor = REFLECT_APPLY(
          OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
          Object,
          [value, "constructor"]
        );
        const thenDescriptor = REFLECT_APPLY(
          OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
          Object,
          [value, "then"]
        );
        const constructorRemovable = constructorDescriptor === undefined
          || ownDataValue(constructorDescriptor, "configurable") === true;
        const thenRemovable = thenDescriptor === undefined
          || ownDataValue(thenDescriptor, "configurable") === true;
        if (constructorRemovable && thenRemovable) {
          if (constructorDescriptor !== undefined) {
            REFLECT_APPLY(REFLECT_DELETE_PROPERTY, Reflect, [value, "constructor"]);
          }
          if (thenDescriptor !== undefined) {
            REFLECT_APPLY(REFLECT_DELETE_PROPERTY, Reflect, [value, "then"]);
          }
          REFLECT_APPLY(OUTER_PROMISE_THEN, value, [
            DISCARD_PROMISE_SETTLEMENT,
            DISCARD_PROMISE_SETTLEMENT
          ]);
        }
      } catch {}
    }
    fail(
      "AWAITABLE_IDENTITY_MISMATCH",
      label + " 必须是无 own constructor/then 的固定 outer Promise。"
    );
  }
  return value;
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const state = { nodes: 0, textCharacters: 0 };

  function walk(current, depth) {
    state.nodes += 1;
    if (state.nodes > MAX_CANONICAL_NODES || depth > MAX_CANONICAL_DEPTH) {
      fail("CANONICAL_LIMIT_EXCEEDED", "吠陀存储设计候选超过规范化预算。");
    }
    if (current === null || typeof current === "boolean") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [current]);
    }
    if (typeof current === "string") {
      state.textCharacters += current.length;
      if (state.textCharacters > MAX_CANONICAL_TEXT_CHARACTERS) {
        fail("CANONICAL_TEXT_LIMIT_EXCEEDED", "吠陀存储设计候选超过文本预算。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [current]);
    }
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_JSON_NUMBER", "吠陀存储设计候选不接受非有限数值或 -0。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [current]);
    }
    if (typeof current !== "object") {
      fail("NON_JSON_VALUE", "吠陀存储设计候选只接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_JSON_GRAPH", "吠陀存储设计候选不接受 cycle 或 alias。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    let isArray;
    let prototype;
    let descriptors;
    try {
      isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current]);
      prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
      descriptors = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
        Object,
        [current]
      );
    } catch (cause) {
      fail("NON_PASSIVE_OBJECT", "吠陀存储设计候选描述符不可安全读取。", cause);
    }
    if ((isArray && prototype !== ARRAY_PROTOTYPE)
      || (!isArray && prototype !== OBJECT_PROTOTYPE)) {
      fail("NON_PASSIVE_OBJECT", "吠陀存储设计候选不接受自定义 prototype。");
    }
    const descriptorKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < descriptorKeys.length; index += 1) {
      if (typeof descriptorKeys[index] !== "string") {
        fail("NON_JSON_KEY", "吠陀存储设计候选不接受 Symbol 属性。");
      }
    }
    if (isArray) {
      const lengthDescriptor = descriptorMapEntry(descriptors, "length");
      const length = ownDataValue(lengthDescriptor, "value");
      if (!lengthDescriptor
        || !hasOwnDataProperty(lengthDescriptor, "value")
        || !REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length])
        || length < 0
        || descriptorKeys.length !== length + 1) {
        fail("NON_PASSIVE_ARRAY", "吠陀存储设计候选数组必须稠密且无额外字段。");
      }
      let text = "[";
      for (let index = 0; index < length; index += 1) {
        const key = REFLECT_APPLY(STRING_CONSTRUCTOR, null, [index]);
        const descriptor = descriptorMapEntry(descriptors, key);
        if (!descriptor
          || !hasOwnDataProperty(descriptor, "value")
          || ownDataValue(descriptor, "enumerable") !== true) {
          fail("NON_PASSIVE_ARRAY", "吠陀存储设计候选数组不得包含 hole 或 accessor。");
        }
        if (index > 0) text += ",";
        text += walk(ownDataValue(descriptor, "value"), depth + 1);
      }
      return text + "]";
    }
    const copiedKeys = REFLECT_APPLY(ARRAY_SLICE, descriptorKeys, []);
    const keys = REFLECT_APPLY(ARRAY_SORT, copiedKeys, [compareCodeUnits]);
    let text = "{";
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptorMapEntry(descriptors, key);
      if (!descriptor
        || !hasOwnDataProperty(descriptor, "value")
        || ownDataValue(descriptor, "enumerable") !== true) {
        fail("NON_PASSIVE_OBJECT", "吠陀存储设计候选不得包含 accessor 或隐藏字段。");
      }
      if (index > 0) text += ",";
      text += REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [key]) + ":";
      text += walk(ownDataValue(descriptor, "value"), depth + 1);
    }
    return text + "}";
  }

  return walk(value, 0);
}

function rejectExternalProxyGraph(value) {
  const seen = new NATIVE_WEAK_SET();
  function walk(current) {
    if (current === null || typeof current !== "object") return;
    if (REFLECT_APPLY(IS_PROXY, utilTypes, [current])) {
      fail("PROXY_FORBIDDEN", "吠陀存储设计候选不接受 Proxy。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) return;
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    let descriptors;
    try {
      descriptors = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
        Object,
        [current]
      );
    } catch (cause) {
      fail("NON_PASSIVE_OBJECT", "吠陀存储设计候选外部对象图不可安全读取。", cause);
    }
    const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < keys.length; index += 1) {
      const descriptor = descriptorMapEntry(descriptors, keys[index]);
      if (descriptor && hasOwnDataProperty(descriptor, "value")) {
        walk(ownDataValue(descriptor, "value"));
      }
    }
  }
  walk(value);
}

function cloneCleanJsonValueToOuterRealm(value) {
  if (value === null || typeof value !== "object") return value;
  const isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
  const descriptors = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
    Object,
    [value]
  );
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  const clone = isArray ? [] : {};
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (isArray && key === "length") continue;
    const descriptor = descriptorMapEntry(descriptors, key);
    if (typeof key !== "string"
      || !descriptor
      || !hasOwnDataProperty(descriptor, "value")
      || ownDataValue(descriptor, "enumerable") !== true) {
      fail("CLEAN_JSON_CLONE_INVALID", "clean realm JSON 结果不是被动 JSON 值。");
    }
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [clone, key, {
      configurable: true,
      enumerable: true,
      value: cloneCleanJsonValueToOuterRealm(ownDataValue(descriptor, "value")),
      writable: true
    }]);
  }
  return clone;
}

function canonicalValue(value) {
  const cleanValue = REFLECT_APPLY(
    JSON_PARSE,
    JSON_OBJECT,
    [canonicalStringify(value)]
  );
  return cloneCleanJsonValueToOuterRealm(cleanValue);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [value, keys[index]]
    );
    if (!descriptor || !hasOwnDataProperty(descriptor, "value")) {
      fail("NON_PASSIVE_OBJECT", "吠陀存储设计候选冻结前发现 accessor。");
    }
    deepFreeze(ownDataValue(descriptor, "value"), seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function isRecursivelyFrozenPassive(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return true;
  if (!REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) return false;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return true;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  let keys;
  try {
    keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  } catch {
    return false;
  }
  for (let index = 0; index < keys.length; index += 1) {
    let descriptor;
    try {
      descriptor = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
        Object,
        [value, keys[index]]
      );
    } catch {
      return false;
    }
    if (!descriptor
      || !hasOwnDataProperty(descriptor, "value")
      || !isRecursivelyFrozenPassive(ownDataValue(descriptor, "value"), seen)) {
      return false;
    }
  }
  return true;
}

const SHA256_INITIAL_STATE = OBJECT_FREEZE([
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19
]);

const SHA256_ROUND_CONSTANTS = OBJECT_FREEZE([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

const LOWER_HEX = "0123456789abcdef";

function intrinsicByteLength(bytes, label = "byte source") {
  let length;
  try {
    length = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    fail("BYTE_SOURCE_INVALID", label + " 必须是具有真实 typed-array 内部槽的字节源。", cause);
  }
  if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length])
    || length < 0
    || length > 0x1fffffff) {
    fail("BYTE_SOURCE_INVALID", label + " 的真实字节长度无效或超出本地 SHA-256 预算。");
  }
  return length;
}

function utf8EncodeString(value) {
  if (typeof value !== "string") {
    fail("UTF8_SOURCE_INVALID", "本地 UTF-8 编码器只接受字符串。");
  }
  let encodedLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const first = REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [index]);
    if (first <= 0x7f) encodedLength += 1;
    else if (first <= 0x7ff) encodedLength += 2;
    else if (first >= 0xd800 && first <= 0xdbff) {
      const second = index + 1 < value.length
        ? REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [index + 1])
        : -1;
      if (second >= 0xdc00 && second <= 0xdfff) {
        encodedLength += 4;
        index += 1;
      } else {
        encodedLength += 3;
      }
    } else {
      encodedLength += 3;
    }
  }
  const output = new CLEAN_UINT8_ARRAY(encodedLength);
  let offset = 0;
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [index]);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      const second = index + 1 < value.length
        ? REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [index + 1])
        : -1;
      if (second >= 0xdc00 && second <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (second - 0xdc00);
        index += 1;
      } else {
        codePoint = 0xfffd;
      }
    } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
      codePoint = 0xfffd;
    }
    if (codePoint <= 0x7f) {
      output[offset] = codePoint;
      offset += 1;
    } else if (codePoint <= 0x7ff) {
      output[offset] = 0xc0 | (codePoint >>> 6);
      output[offset + 1] = 0x80 | (codePoint & 0x3f);
      offset += 2;
    } else if (codePoint <= 0xffff) {
      output[offset] = 0xe0 | (codePoint >>> 12);
      output[offset + 1] = 0x80 | ((codePoint >>> 6) & 0x3f);
      output[offset + 2] = 0x80 | (codePoint & 0x3f);
      offset += 3;
    } else {
      output[offset] = 0xf0 | (codePoint >>> 18);
      output[offset + 1] = 0x80 | ((codePoint >>> 12) & 0x3f);
      output[offset + 2] = 0x80 | ((codePoint >>> 6) & 0x3f);
      output[offset + 3] = 0x80 | (codePoint & 0x3f);
      offset += 4;
    }
  }
  return output;
}

function sha256Bytes(bytes) {
  const length = intrinsicByteLength(bytes, "SHA-256 byte source");
  const minimumPaddedLength = length + 9;
  const remainder = minimumPaddedLength % 64;
  const paddedLength = minimumPaddedLength + (remainder === 0 ? 0 : 64 - remainder);
  const padded = new CLEAN_UINT8_ARRAY(paddedLength);
  for (let index = 0; index < length; index += 1) {
    padded[index] = bytes[index];
  }
  padded[length] = 0x80;
  const bitLengthHigh = (length / 0x20000000) >>> 0;
  const bitLengthLow = (length << 3) >>> 0;
  padded[paddedLength - 8] = bitLengthHigh >>> 24;
  padded[paddedLength - 7] = bitLengthHigh >>> 16;
  padded[paddedLength - 6] = bitLengthHigh >>> 8;
  padded[paddedLength - 5] = bitLengthHigh;
  padded[paddedLength - 4] = bitLengthLow >>> 24;
  padded[paddedLength - 3] = bitLengthLow >>> 16;
  padded[paddedLength - 2] = bitLengthLow >>> 8;
  padded[paddedLength - 1] = bitLengthLow;

  let h0 = SHA256_INITIAL_STATE[0];
  let h1 = SHA256_INITIAL_STATE[1];
  let h2 = SHA256_INITIAL_STATE[2];
  let h3 = SHA256_INITIAL_STATE[3];
  let h4 = SHA256_INITIAL_STATE[4];
  let h5 = SHA256_INITIAL_STATE[5];
  let h6 = SHA256_INITIAL_STATE[6];
  let h7 = SHA256_INITIAL_STATE[7];
  const schedule = new CLEAN_UINT32_ARRAY(64);

  for (let block = 0; block < paddedLength; block += 64) {
    for (let index = 0; index < 16; index += 1) {
      const offset = block + (index * 4);
      schedule[index] = (
        (padded[offset] << 24)
        | (padded[offset + 1] << 16)
        | (padded[offset + 2] << 8)
        | padded[offset + 3]
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const x = schedule[index - 15];
      const y = schedule[index - 2];
      const sigma0 = (
        ((x >>> 7) | (x << 25))
        ^ ((x >>> 18) | (x << 14))
        ^ (x >>> 3)
      ) >>> 0;
      const sigma1 = (
        ((y >>> 17) | (y << 15))
        ^ ((y >>> 19) | (y << 13))
        ^ (y >>> 10)
      ) >>> 0;
      schedule[index] = (
        schedule[index - 16]
        + sigma0
        + schedule[index - 7]
        + sigma1
      ) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = (
        ((e >>> 6) | (e << 26))
        ^ ((e >>> 11) | (e << 21))
        ^ ((e >>> 25) | (e << 7))
      ) >>> 0;
      const choose = ((e & f) ^ ((~e) & g)) >>> 0;
      const temp1 = (h + sum1 + choose + SHA256_ROUND_CONSTANTS[index]
        + schedule[index]) >>> 0;
      const sum0 = (
        ((a >>> 2) | (a << 30))
        ^ ((a >>> 13) | (a << 19))
        ^ ((a >>> 22) | (a << 10))
      ) >>> 0;
      const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const words = [h0, h1, h2, h3, h4, h5, h6, h7];
  let output = "";
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    for (let shift = 24; shift >= 0; shift -= 8) {
      const byte = (word >>> shift) & 0xff;
      output += LOWER_HEX[byte >>> 4] + LOWER_HEX[byte & 0x0f];
    }
  }
  return output;
}

function domainSeparatedDigest(domain, value) {
  const domainBytes = utf8EncodeString(domain);
  const materialBytes = utf8EncodeString(canonicalStringify(value));
  const domainLength = intrinsicByteLength(domainBytes, "digest domain");
  const materialLength = intrinsicByteLength(materialBytes, "digest material");
  const joined = new CLEAN_UINT8_ARRAY(domainLength + 1 + materialLength);
  let offset = 0;
  for (let index = 0; index < domainLength; index += 1) {
    joined[offset] = domainBytes[index];
    offset += 1;
  }
  joined[offset] = 0;
  offset += 1;
  for (let index = 0; index < materialLength; index += 1) {
    joined[offset] = materialBytes[index];
    offset += 1;
  }
  return sha256Bytes(joined);
}

function computeDesignDigestInternal(value) {
  const candidate = canonicalValue(value);
  const { designDigest: _ignored, ...unsigned } = candidate;
  return domainSeparatedDigest(DESIGN_DIGEST_DOMAIN, unsigned);
}

export function computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest(
  value
) {
  rejectExternalProxyGraph(value);
  return computeDesignDigestInternal(value);
}

function canonicalPrettyStringifyInternal(value) {
  const compact = canonicalStringify(value);
  try {
    const cleanNormalized = REFLECT_APPLY(JSON_PARSE, JSON_OBJECT, [compact]);
    return REFLECT_APPLY(
      JSON_STRINGIFY,
      JSON_OBJECT,
      [cleanNormalized, null, 2]
    ) + "\n";
  } catch {
    fail(
      "CANONICAL_PRETTY_SERIALIZATION_FAILED",
      "吠陀存储设计候选无法生成隔离的 canonical pretty materialization。"
    );
  }
}

export function canonicalPrettyStringifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
  value
) {
  rejectExternalProxyGraph(value);
  return canonicalPrettyStringifyInternal(value);
}

export function parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
  bytes,
  label = "吠陀独立存储备份恢复回滚设计候选 JSON",
  maxBytes = MAX_ARTIFACT_BYTES
) {
  const upstreamParsed = parseVedicProductizationRequirementsJsonBytes(
    bytes,
    label,
    maxBytes
  );
  const text = decodeStrictUtf8(bytes, label);
  let independentlyParsed;
  try {
    independentlyParsed = REFLECT_APPLY(JSON_PARSE, JSON_OBJECT, [text]);
  } catch (cause) {
    fail("JSON_PARSE_INVALID", label + " 不是合法 JSON。", cause);
  }
  const upstreamCanonical = canonicalValue(upstreamParsed);
  const independentCanonical = canonicalValue(
    cloneCleanJsonValueToOuterRealm(independentlyParsed)
  );
  if (!exactJson(upstreamCanonical, independentCanonical)) {
    fail(
      "INDEPENDENT_JSON_PARSE_MISMATCH",
      label + " 的上游严格解析结果与 clean-realm 独立解析结果不一致。"
    );
  }
  if (text !== canonicalPrettyStringifyInternal(independentCanonical)) {
    fail(
      "JSON_MATERIALIZATION_NON_CANONICAL",
      label + " 必须是无重复键、排序缩进且以单个 LF 结尾的 canonical materialization。"
    );
  }
  return independentCanonical;
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const segments = typeof relativePath === "string"
    ? REFLECT_APPLY(STRING_SPLIT, relativePath, ["/"])
    : [];
  let invalidSegment = false;
  for (let index = 0; index < segments.length; index += 1) {
    if (segments[index] === "" || segments[index] === "." || segments[index] === "..") {
      invalidSegment = true;
      break;
    }
  }
  if (typeof relativePath !== "string"
    || relativePath.length < 1
    || relativePath.length > 300
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, ["\0"])
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, ["\\"])
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, [":"])
    || REFLECT_APPLY(STRING_STARTS_WITH, relativePath, ["/"])
    || REFLECT_APPLY(PATH_POSIX_NORMALIZE, null, [relativePath]) !== relativePath
    || invalidSegment) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀存储设计候选路径不安全。");
  }
  const root = REFLECT_APPLY(PATH_RESOLVE, null, [workspaceRoot]);
  let absolute = root;
  for (let index = 0; index < segments.length; index += 1) {
    absolute = REFLECT_APPLY(PATH_RESOLVE, null, [absolute, segments[index]]);
  }
  const relative = REFLECT_APPLY(PATH_RELATIVE, null, [root, absolute]);
  if (relative === ""
    || relative === ".."
    || REFLECT_APPLY(STRING_STARTS_WITH, relative, [".." + PATH_SEPARATOR])
    || REFLECT_APPLY(PATH_IS_ABSOLUTE, null, [relative])) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀存储设计候选路径越出工作区。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = REFLECT_APPLY(PATH_RELATIVE, null, [root, candidate]);
  return relative === ""
    || (relative !== ".."
      && !REFLECT_APPLY(STRING_STARTS_WITH, relative, [".." + PATH_SEPARATOR])
      && !REFLECT_APPLY(PATH_IS_ABSOLUTE, null, [relative]));
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

function isStatsType(metadata, expectedType) {
  return metadata !== null
    && typeof metadata === "object"
    && REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [metadata.mode])
    && (metadata.mode & FILE_TYPE_MASK) === expectedType;
}

async function capturePlainDirectoryChain(workspaceRoot, absolutePath, invalidCode, label) {
  assertOuterPromiseIntegrity();
  const root = REFLECT_APPLY(PATH_RESOLVE, null, [workspaceRoot]);
  const targetDirectory = REFLECT_APPLY(PATH_DIRNAME, null, [
    REFLECT_APPLY(PATH_RESOLVE, null, [absolutePath])
  ]);
  if (!isSameOrWithin(root, targetDirectory)) {
    fail(invalidCode, label + " 的目录链越出工作区。");
  }
  const relative = REFLECT_APPLY(PATH_RELATIVE, null, [root, targetDirectory]);
  const segments = relative === ""
    ? []
    : REFLECT_APPLY(STRING_SPLIT, relative, [PATH_SEPARATOR]);
  const endpoints = [];
  let cursor = root;
  for (let index = -1; index < segments.length; index += 1) {
    const segment = index < 0 ? null : segments[index];
    if (segment !== null) cursor = REFLECT_APPLY(PATH_JOIN, null, [cursor, segment]);
    const metadata = await requirePristineAwaitable(
      FILE_LSTAT(cursor),
      label + " directory lstat"
    );
    assertOuterPromiseIntegrity();
    if (isStatsType(metadata, FILE_TYPE_SYMBOLIC_LINK)
      || !isStatsType(metadata, FILE_TYPE_DIRECTORY)) {
      fail(invalidCode, label + " 的目录链不能包含链接、junction 或特殊端点。");
    }
    const resolvedPath = await requirePristineAwaitable(
      FILE_REALPATH(cursor),
      label + " directory realpath"
    );
    assertOuterPromiseIntegrity();
    if (endpoints.length > 0
      && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(invalidCode, label + " 的目录链 realpath 越出工作区。");
    }
    REFLECT_APPLY(ARRAY_PUSH, endpoints, [
      OBJECT_FREEZE({ absolutePath: cursor, resolvedPath, metadata })
    ]);
  }
  return OBJECT_FREEZE(endpoints);
}

function sameDirectoryChain(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const entry = left[index];
    const other = right[index];
    if (other === undefined
      || entry.absolutePath !== other.absolutePath
      || entry.resolvedPath !== other.resolvedPath
      || !sameEndpoint(entry.metadata, other.metadata)) {
      return false;
    }
  }
  return true;
}

function openFileDescriptor(absolutePath, flags) {
  return new OUTER_PROMISE((resolve, reject) => {
    REFLECT_APPLY(FILE_OPEN, null, [absolutePath, flags, (error, descriptor) => {
      if (error) reject(error);
      else resolve(descriptor);
    }]);
  });
}

function statFileDescriptor(descriptor) {
  return new OUTER_PROMISE((resolve, reject) => {
    REFLECT_APPLY(FILE_STAT, null, [descriptor, (error, metadata) => {
      if (error) reject(error);
      else resolve(metadata);
    }]);
  });
}

function readFileDescriptor(descriptor, buffer, offset, length, position) {
  return new OUTER_PROMISE((resolve, reject) => {
    REFLECT_APPLY(FILE_READ, null, [
      descriptor,
      buffer,
      offset,
      length,
      position,
      (error, bytesRead) => error ? reject(error) : resolve(bytesRead)
    ]);
  });
}

function closeFileDescriptor(descriptor) {
  return new OUTER_PROMISE((resolve, reject) => {
    REFLECT_APPLY(FILE_CLOSE, null, [descriptor, (error) => {
      if (error) reject(error);
      else resolve();
    }]);
  });
}

async function readExactOpenedSize(descriptor, expectedSize, invalidCode, label) {
  assertOuterPromiseIntegrity();
  if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [expectedSize])
    || expectedSize <= 0) {
    fail(invalidCode, label + " 的已打开文件尺寸无效。");
  }
  const bytes = new CLEAN_UINT8_ARRAY(expectedSize);
  let total = 0;
  while (total < expectedSize) {
    const bytesRead = await requirePristineAwaitable(
      readFileDescriptor(
        descriptor,
        bytes,
        total,
        expectedSize - total,
        total
      ),
      label + " held-fd read"
    );
    assertOuterPromiseIntegrity();
    if (bytesRead === 0) fail(invalidCode, label + " 在 held-fd 读取期间提前截断。");
    total += bytesRead;
  }
  const growthProbe = new CLEAN_UINT8_ARRAY(1);
  const growthBytesRead = await requirePristineAwaitable(
    readFileDescriptor(
      descriptor,
      growthProbe,
      0,
      1,
      expectedSize
    ),
    label + " held-fd growth probe"
  );
  assertOuterPromiseIntegrity();
  if (growthBytesRead !== 0) fail(invalidCode, label + " 在 held-fd 读取期间增长。");
  return bytes;
}

async function readStableWorkspaceFile(
  workspaceRoot,
  relativePath,
  maxBytes = MAX_ARTIFACT_BYTES,
  options = {}
) {
  assertOuterPromiseIntegrity();
  const invalidCode = options.invalidCode ?? "ARTIFACT_ENDPOINT_INVALID";
  const missingCode = options.missingCode ?? "ARTIFACT_MISSING";
  const label = options.label ?? relativePath;
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await requirePristineAwaitable(
      capturePlainDirectoryChain(
        workspaceRoot,
        absolute,
        invalidCode,
        label
      ),
      label + " directory chain before"
    );
    before = await requirePristineAwaitable(
      FILE_LSTAT(absolute),
      label + " path lstat before"
    );
    actual = await requirePristineAwaitable(
      FILE_REALPATH(absolute),
      label + " path realpath before"
    );
    assertOuterPromiseIntegrity();
  } catch (cause) {
    if (cause instanceof VedicIndependentStorageBackupRecoveryRollbackDesignCandidateError) {
      throw cause;
    }
    fail(missingCode, label + " 不存在。", cause);
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(root, actual)
    || isStatsType(before, FILE_TYPE_SYMBOLIC_LINK)
    || !isStatsType(before, FILE_TYPE_REGULAR)
    || before.nlink !== 1
    || before.size <= 0
    || before.size > maxBytes) {
    fail(invalidCode, label + " 必须是工作区内独立普通小文件。");
  }
  const descriptor = await requirePristineAwaitable(
    openFileDescriptor(actual, "r"),
    label + " held-fd open"
  );
  assertOuterPromiseIntegrity();
  try {
    const opened = await requirePristineAwaitable(
      statFileDescriptor(descriptor),
      label + " held-fd stat before"
    );
    assertOuterPromiseIntegrity();
    if (!isStatsType(opened, FILE_TYPE_REGULAR)
      || opened.nlink !== 1
      || !sameEndpoint(before, opened)) {
      fail(invalidCode, label + " 在打开前发生身份换绑。");
    }
    const bytes = await requirePristineAwaitable(
      readExactOpenedSize(descriptor, opened.size, invalidCode, label),
      label + " exact-size read"
    );
    assertOuterPromiseIntegrity();
    const afterHandle = await requirePristineAwaitable(
      statFileDescriptor(descriptor),
      label + " held-fd stat after"
    );
    assertOuterPromiseIntegrity();
    const afterPath = await requirePristineAwaitable(
      FILE_LSTAT(absolute),
      label + " path lstat after"
    );
    assertOuterPromiseIntegrity();
    const actualAfter = await requirePristineAwaitable(
      FILE_REALPATH(absolute),
      label + " path realpath after"
    );
    assertOuterPromiseIntegrity();
    const directoryChainAfter = await requirePristineAwaitable(
      capturePlainDirectoryChain(
        workspaceRoot,
        absolute,
        invalidCode,
        label
      ),
      label + " directory chain after"
    );
    assertOuterPromiseIntegrity();
    if (isStatsType(afterPath, FILE_TYPE_SYMBOLIC_LINK)
      || !isStatsType(afterPath, FILE_TYPE_REGULAR)
      || afterPath.nlink !== 1
      || bytes.byteLength !== opened.size
      || !sameEndpoint(opened, afterHandle)
      || !sameEndpoint(opened, afterPath)
      || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(invalidCode, label + " 在 held-fd 读取区间发生变化。");
    }
    return OBJECT_FREEZE({
      bytes,
      rawBytes: bytes.byteLength,
      rawSha256: sha256Bytes(bytes)
    });
  } finally {
    await requirePristineAwaitable(
      closeFileDescriptor(descriptor),
      label + " held-fd close"
    );
    assertOuterPromiseIntegrity();
  }
}

function capturePlainDirectoryChainSync(
  workspaceRoot,
  absolutePath,
  invalidCode,
  label
) {
  const root = REFLECT_APPLY(PATH_RESOLVE, null, [workspaceRoot]);
  const targetDirectory = REFLECT_APPLY(PATH_DIRNAME, null, [
    REFLECT_APPLY(PATH_RESOLVE, null, [absolutePath])
  ]);
  if (!isSameOrWithin(root, targetDirectory)) {
    fail(invalidCode, label + " 的同步目录链越出工作区。");
  }
  const relative = REFLECT_APPLY(PATH_RELATIVE, null, [root, targetDirectory]);
  const segments = relative === ""
    ? []
    : REFLECT_APPLY(STRING_SPLIT, relative, [PATH_SEPARATOR]);
  const endpoints = [];
  let cursor = root;
  for (let index = -1; index < segments.length; index += 1) {
    const segment = index < 0 ? null : segments[index];
    if (segment !== null) cursor = REFLECT_APPLY(PATH_JOIN, null, [cursor, segment]);
    const metadata = REFLECT_APPLY(FILE_LSTAT_SYNC, null, [cursor]);
    if (isStatsType(metadata, FILE_TYPE_SYMBOLIC_LINK)
      || !isStatsType(metadata, FILE_TYPE_DIRECTORY)) {
      fail(invalidCode, label + " 的同步目录链不能包含链接、junction 或特殊端点。");
    }
    const resolvedPath = REFLECT_APPLY(FILE_REALPATH_SYNC, null, [cursor]);
    if (endpoints.length > 0
      && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(invalidCode, label + " 的同步目录链 realpath 越出工作区。");
    }
    REFLECT_APPLY(ARRAY_PUSH, endpoints, [
      OBJECT_FREEZE({ absolutePath: cursor, resolvedPath, metadata })
    ]);
  }
  return OBJECT_FREEZE(endpoints);
}

function readExactOpenedSizeSync(descriptor, expectedSize, invalidCode, label) {
  if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [expectedSize])
    || expectedSize <= 0) {
    fail(invalidCode, label + " 的同步已打开文件尺寸无效。");
  }
  const bytes = new CLEAN_UINT8_ARRAY(expectedSize);
  let total = 0;
  while (total < expectedSize) {
    const bytesRead = REFLECT_APPLY(FILE_READ_SYNC, null, [
      descriptor,
      bytes,
      total,
      expectedSize - total,
      total
    ]);
    if (bytesRead === 0) fail(invalidCode, label + " 在同步 held-fd 读取期间提前截断。");
    total += bytesRead;
  }
  const growthProbe = new CLEAN_UINT8_ARRAY(1);
  const growthBytesRead = REFLECT_APPLY(FILE_READ_SYNC, null, [
    descriptor,
    growthProbe,
    0,
    1,
    expectedSize
  ]);
  if (growthBytesRead !== 0) fail(invalidCode, label + " 在同步 held-fd 读取期间增长。");
  return bytes;
}

function readStableWorkspaceFileSync(
  workspaceRoot,
  relativePath,
  maxBytes = MAX_ARTIFACT_BYTES,
  options = {}
) {
  const invalidCode = options.invalidCode ?? "ARTIFACT_ENDPOINT_INVALID";
  const missingCode = options.missingCode ?? "ARTIFACT_MISSING";
  const label = options.label ?? relativePath;
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = capturePlainDirectoryChainSync(
      workspaceRoot,
      absolute,
      invalidCode,
      label
    );
    before = REFLECT_APPLY(FILE_LSTAT_SYNC, null, [absolute]);
    actual = REFLECT_APPLY(FILE_REALPATH_SYNC, null, [absolute]);
  } catch (cause) {
    if (cause instanceof VedicIndependentStorageBackupRecoveryRollbackDesignCandidateError) {
      throw cause;
    }
    fail(missingCode, label + " 不存在或同步端点不可读。");
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(root, actual)
    || isStatsType(before, FILE_TYPE_SYMBOLIC_LINK)
    || !isStatsType(before, FILE_TYPE_REGULAR)
    || before.nlink !== 1
    || before.size <= 0
    || before.size > maxBytes) {
    fail(invalidCode, label + " 必须是工作区内独立普通小文件。");
  }
  let descriptor;
  try {
    descriptor = REFLECT_APPLY(FILE_OPEN_SYNC, null, [actual, "r"]);
  } catch {
    fail(missingCode, label + " 无法同步打开。");
  }
  try {
    const opened = REFLECT_APPLY(FILE_STAT_SYNC, null, [descriptor]);
    if (!isStatsType(opened, FILE_TYPE_REGULAR)
      || opened.nlink !== 1
      || !sameEndpoint(before, opened)) {
      fail(invalidCode, label + " 在同步打开前发生身份换绑。");
    }
    const bytes = readExactOpenedSizeSync(
      descriptor,
      opened.size,
      invalidCode,
      label
    );
    const afterHandle = REFLECT_APPLY(FILE_STAT_SYNC, null, [descriptor]);
    const afterPath = REFLECT_APPLY(FILE_LSTAT_SYNC, null, [absolute]);
    const actualAfter = REFLECT_APPLY(FILE_REALPATH_SYNC, null, [absolute]);
    const directoryChainAfter = capturePlainDirectoryChainSync(
      workspaceRoot,
      absolute,
      invalidCode,
      label
    );
    if (isStatsType(afterPath, FILE_TYPE_SYMBOLIC_LINK)
      || !isStatsType(afterPath, FILE_TYPE_REGULAR)
      || afterPath.nlink !== 1
      || intrinsicByteLength(bytes, label) !== opened.size
      || !sameEndpoint(opened, afterHandle)
      || !sameEndpoint(opened, afterPath)
      || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(invalidCode, label + " 在同步 held-fd 读取区间发生变化。");
    }
    return OBJECT_FREEZE({
      bytes,
      rawBytes: intrinsicByteLength(bytes, label),
      rawSha256: sha256Bytes(bytes)
    });
  } finally {
    try {
      REFLECT_APPLY(FILE_CLOSE_SYNC, null, [descriptor]);
    } catch {
      fail(invalidCode, label + " 的同步 held-fd 无法安全关闭。");
    }
  }
}

function verifyAllCurrentRawEndpointsSynchronously(workspaceRoot) {
  for (let index = 0; index < TRANSITIVE_CURRENT_RAW_CONTEXTS.length; index += 1) {
    const context = TRANSITIVE_CURRENT_RAW_CONTEXTS[index];
    const snapshot = readStableWorkspaceFileSync(
      workspaceRoot,
      context.path,
      MAX_ARTIFACT_BYTES,
      {
        invalidCode: "TRANSITIVE_CONTEXT_ENDPOINT_INVALID",
        label: "吠陀同步传递 current raw 端点 " + context.contextId,
        missingCode: "TRANSITIVE_CONTEXT_MISSING"
      }
    );
    requireRawIdentity(
      snapshot,
      context,
      "吠陀同步传递 current raw 端点 " + context.contextId
    );
  }
  const directContexts = [
    ADR_CONTEXT,
    PARENT_CONTEXT,
    RUNTIME_CONTEXT,
    OBSERVATION_CONTEXT
  ];
  for (let index = 0; index < directContexts.length; index += 1) {
    const context = directContexts[index];
    const snapshot = readStableWorkspaceFileSync(
      workspaceRoot,
      context.path,
      MAX_ARTIFACT_BYTES,
      { label: "吠陀同步直接 current raw 端点 " + context.contextId }
    );
    requireRawIdentity(
      snapshot,
      context,
      "吠陀同步直接 current raw 端点 " + context.contextId
    );
  }
  const candidateSnapshot = readStableWorkspaceFileSync(
    workspaceRoot,
    CANDIDATE_RAW_CONTEXT.path,
    MAX_ARTIFACT_BYTES,
    { label: "吠陀同步设计候选 raw 端点" }
  );
  requireRawIdentity(
    candidateSnapshot,
    CANDIDATE_RAW_CONTEXT,
    "吠陀同步设计候选 raw 端点"
  );
  return true;
}

function copyBytesToOuterRealm(bytes) {
  const length = intrinsicByteLength(bytes, "test-only byte copy");
  const copy = new OUTER_UINT8_ARRAY(length);
  for (let index = 0; index < length; index += 1) copy[index] = bytes[index];
  return copy;
}

function utf8EncodeStringForTest(value) {
  if (typeof value !== "string" || value.length > MAX_CANONICAL_TEXT_CHARACTERS) {
    fail("UTF8_SOURCE_INVALID", "test-only UTF-8 编码输入必须是预算内字符串。");
  }
  return copyBytesToOuterRealm(utf8EncodeString(value));
}

async function readStableWorkspaceFileForTest(
  workspaceRoot,
  relativePath,
  maxBytes = MAX_ARTIFACT_BYTES,
  options = {}
) {
  assertOuterPromiseIntegrity();
  const snapshot = await requirePristineAwaitable(
    readStableWorkspaceFile(
      workspaceRoot,
      relativePath,
      maxBytes,
      options
    ),
    "test-only stable workspace read"
  );
  assertOuterPromiseIntegrity();
  return OBJECT_FREEZE({
    bytes: copyBytesToOuterRealm(snapshot.bytes),
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

function decodeStrictUtf8(bytes, label) {
  const length = intrinsicByteLength(bytes, label);
  if (length >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", label + " 不得包含 UTF-8 BOM。");
  }
  let output = "";
  let index = 0;
  while (index < length) {
    const first = bytes[index];
    let codePoint;
    let width;
    if (first <= 0x7f) {
      codePoint = first;
      width = 1;
    } else if (first >= 0xc2 && first <= 0xdf) {
      if (index + 1 >= length) fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。");
      const second = bytes[index + 1];
      if (second < 0x80 || second > 0xbf) {
        fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。");
      }
      codePoint = ((first & 0x1f) << 6) | (second & 0x3f);
      width = 2;
    } else if (first >= 0xe0 && first <= 0xef) {
      if (index + 2 >= length) fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。");
      const second = bytes[index + 1];
      const third = bytes[index + 2];
      const secondValid = first === 0xe0
        ? second >= 0xa0 && second <= 0xbf
        : first === 0xed
          ? second >= 0x80 && second <= 0x9f
          : second >= 0x80 && second <= 0xbf;
      if (!secondValid || third < 0x80 || third > 0xbf) {
        fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。");
      }
      codePoint = ((first & 0x0f) << 12)
        | ((second & 0x3f) << 6)
        | (third & 0x3f);
      width = 3;
    } else if (first >= 0xf0 && first <= 0xf4) {
      if (index + 3 >= length) fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。");
      const second = bytes[index + 1];
      const third = bytes[index + 2];
      const fourth = bytes[index + 3];
      const secondValid = first === 0xf0
        ? second >= 0x90 && second <= 0xbf
        : first === 0xf4
          ? second >= 0x80 && second <= 0x8f
          : second >= 0x80 && second <= 0xbf;
      if (!secondValid
        || third < 0x80 || third > 0xbf
        || fourth < 0x80 || fourth > 0xbf) {
        fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。");
      }
      codePoint = ((first & 0x07) << 18)
        | ((second & 0x3f) << 12)
        | ((third & 0x3f) << 6)
        | (fourth & 0x3f);
      width = 4;
    } else {
      fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。");
    }
    output += REFLECT_APPLY(STRING_FROM_CODE_POINT, null, [codePoint]);
    index += width;
  }
  return output;
}

function requireRawIdentity(snapshot, expected, label) {
  if (!hasOwnDataProperty(snapshot, "bytes")
    || !hasOwnDataProperty(snapshot, "rawBytes")
    || !hasOwnDataProperty(snapshot, "rawSha256")) {
    fail("UPSTREAM_RAW_IDENTITY_MISMATCH", label + " 原始字节身份漂移。");
  }
  const bytes = ownDataValue(snapshot, "bytes");
  const independentlyMeasuredBytes = intrinsicByteLength(bytes, label);
  const independentlyMeasuredSha256 = sha256Bytes(bytes);
  if (ownDataValue(snapshot, "rawBytes") !== independentlyMeasuredBytes
    || ownDataValue(snapshot, "rawSha256") !== independentlyMeasuredSha256
    || independentlyMeasuredBytes !== expected.bytes
    || independentlyMeasuredSha256 !== expected.sha256) {
    fail("UPSTREAM_RAW_IDENTITY_MISMATCH", label + " 原始字节身份漂移。");
  }
}

function buildInterfaceRequirements() {
  return [
    {
      failClosedConditions: [
        "vedic_product_identity_is_null",
        "namespace_aliases_legacy_v13_or_schema_13",
        "record_lacks_schema_identity_or_digest",
        "cross_system_record_or_namespace_detected",
        "expected_mutation_epoch_absent_or_stale"
      ],
      interfaceRequirementId: "separate_vedic_storage_namespace_interface",
      invariants: [
        "must_not_inherit_legacy_v13_or_schema_13",
        "must_not_share_writable_table_index_keyspace_or_migration_with_other_systems",
        "must_not_fallback_to_a_default_namespace",
        "future_namespace_creation_requires_independent_authorized_mutation"
      ],
      nonClaims: [
        "storage_namespace_not_selected_or_created",
        "storage_backend_not_selected",
        "namespace_isolation_not_established",
        "database_or_migration_not_created"
      ],
      requiredEvidenceBeforeImplementation: [
        "owner_product_scope_decision",
        "selected_runtime_option",
        "independent_vedic_storage_schema",
        "mutation_epoch_capability_evidence",
        "privacy_retention_and_deletion_decision"
      ],
      requiredInputs: [
        "independent_vedic_product_identity",
        "independent_storage_namespace_id",
        "storage_schema_identity",
        "record_envelope_digest",
        "expected_mutation_epoch"
      ],
      requiredOutputs: [
        "namespace_scoped_operation_candidate",
        "cross_system_write_rejection_candidate"
      ],
      requirementsDefined: true,
      runtimeImplementationInstances: 0,
      status: "requirements_only_zero_implementation"
    },
    {
      failClosedConditions: [
        "runtime_option_unselected",
        "candidate_ceiling_treated_as_measurement",
        "unapproved_ceiling_treated_as_budget",
        "quota_observation_or_measurement_receipt_absent",
        "silent_eviction_or_evidence_retention_loss"
      ],
      interfaceRequirementId: "storage_capacity_budget_interface",
      invariants: [
        "proposed_observed_and_approved_capacity_values_are_separate_accounts",
        "primary_backup_and_evidence_retention_capacity_are_separate_accounts",
        "capacity_values_require_nonnegative_safe_integer_bytes",
        "silent_data_deletion_cannot_satisfy_a_capacity_budget"
      ],
      nonClaims: [
        "candidate_ceilings_are_not_measurements",
        "candidate_ceilings_are_not_approved_budgets",
        "capacity_sla_not_established",
        "storage_quota_acceptance_not_established"
      ],
      requiredEvidenceBeforeImplementation: [
        "selected_runtime_option",
        "measured_storage_footprint_receipts",
        "measured_evidence_retention_receipts",
        "owner_approved_capacity_budget",
        "retention_and_eviction_policy"
      ],
      requiredInputs: [
        "selected_runtime_option_id",
        "measured_installed_footprint_bytes",
        "measured_evidence_retention_bytes_per_release",
        "quota_observation",
        "measurement_receipt"
      ],
      requiredOutputs: [
        "capacity_budget_decision_candidate",
        "quota_refusal_candidate",
        "retention_pressure_observation_candidate"
      ],
      requirementsDefined: true,
      runtimeImplementationInstances: 0,
      status: "requirements_only_zero_implementation"
    },
    {
      failClosedConditions: [
        "mutation_epoch_unavailable",
        "expected_and_current_epoch_mismatch",
        "operation_digest_not_bound",
        "epoch_reuse_or_aba_not_excluded",
        "cross_file_atomicity_claim_without_receipt"
      ],
      interfaceRequirementId: "mutation_epoch_receipt_interface",
      invariants: [
        "future_successful_mutation_advances_epoch_by_exactly_one",
        "future_failed_mutation_changes_neither_state_nor_epoch",
        "future_recovery_and_rollback_are_forward_mutations_not_epoch_rewinds",
        "future_state_epoch_and_receipt_commit_in_one_backend_boundary",
        "future_reader_snapshot_binds_one_epoch"
      ],
      nonClaims: [
        "mutation_epoch_not_available",
        "mutation_receipt_not_issued",
        "atomic_commit_not_established",
        "interval_mutation_and_aba_not_excluded"
      ],
      requiredEvidenceBeforeImplementation: [
        "selected_storage_backend",
        "backend_atomicity_contract",
        "compare_and_swap_implementation",
        "concurrency_and_crash_recovery_tests",
        "aba_and_epoch_reuse_tests"
      ],
      requiredInputs: [
        "independent_storage_namespace_id",
        "expected_mutation_epoch",
        "current_mutation_epoch",
        "operation_digest",
        "base_snapshot_digest"
      ],
      requiredOutputs: [
        "compare_and_swap_commit_receipt_candidate",
        "stale_epoch_conflict_candidate",
        "mutation_epoch_advance_receipt_candidate"
      ],
      requirementsDefined: true,
      runtimeImplementationInstances: 0,
      status: "requirements_only_zero_implementation"
    },
    {
      failClosedConditions: [
        "independent_product_or_namespace_identity_absent",
        "bazi_or_other_system_records_mixed_into_backup",
        "backup_set_partial_or_unhashed",
        "source_mutation_epoch_absent",
        "encryption_custody_consent_or_retention_decision_absent"
      ],
      interfaceRequirementId: "backup_interface",
      invariants: [
        "future_backup_is_read_only_and_does_not_advance_epoch",
        "future_backup_manifest_describes_exactly_one_epoch",
        "incomplete_backup_is_never_recovery_eligible",
        "credentials_logs_and_unredistributable_material_are_excluded_without_authorization",
        "future_entries_manifest_and_archive_each_require_digests"
      ],
      nonClaims: [
        "backup_artifact_not_created",
        "backup_verification_not_established",
        "backup_portability_and_restorability_not_established",
        "content_redistribution_rights_not_established"
      ],
      requiredEvidenceBeforeImplementation: [
        "selected_storage_backend",
        "backup_implementation",
        "restore_verification_plan",
        "privacy_and_consent_decision",
        "encryption_key_custody_and_retention_decision"
      ],
      requiredInputs: [
        "independent_vedic_product_identity",
        "namespace_manifest_digest",
        "backup_set_manifest",
        "source_mutation_epoch",
        "encryption_custody_consent_and_retention_policy"
      ],
      requiredOutputs: [
        "backup_dry_run_report_candidate",
        "backup_receipt_candidate"
      ],
      requirementsDefined: true,
      runtimeImplementationInstances: 0,
      status: "requirements_only_zero_implementation"
    },
    {
      failClosedConditions: [
        "backup_receipt_or_manifest_absent",
        "product_namespace_schema_or_release_identity_mismatch",
        "backup_authenticity_or_integrity_unverified",
        "in_place_overwrite_without_recovery_plan",
        "partial_recovery_or_mutation_epoch_unavailable"
      ],
      interfaceRequirementId: "recovery_interface",
      invariants: [
        "future_recovery_verifies_before_write",
        "future_recovery_uses_isolated_staging_before_activation",
        "future_failed_recovery_changes_neither_active_state_nor_epoch",
        "future_successful_recovery_creates_a_new_forward_epoch",
        "future_source_backup_remains_immutable"
      ],
      nonClaims: [
        "recovery_execution_not_observed",
        "backup_restorability_not_proven",
        "schema_compatibility_not_established",
        "migration_capability_not_established"
      ],
      requiredEvidenceBeforeImplementation: [
        "recovery_implementation",
        "isolated_recovery_sandbox",
        "backup_authenticity_and_integrity_checks",
        "post_recovery_validation_plan",
        "recovery_failure_rollback_plan"
      ],
      requiredInputs: [
        "backup_receipt",
        "backup_manifest_and_artifact_digests",
        "target_namespace_identity",
        "recovery_plan_identity",
        "expected_target_mutation_epoch"
      ],
      requiredOutputs: [
        "recovery_dry_run_report_candidate",
        "recovery_integrity_report_candidate",
        "recovery_commit_receipt_candidate"
      ],
      requirementsDefined: true,
      runtimeImplementationInstances: 0,
      status: "requirements_only_zero_implementation"
    },
    {
      failClosedConditions: [
        "release_identity_or_rollback_target_absent",
        "rollback_target_not_bound_to_retained_evidence",
        "backup_recovery_or_deployment_receipt_absent",
        "rollback_provider_sequence_unverified",
        "mutation_epoch_absent_or_public_deployment_unauthorized"
      ],
      interfaceRequirementId: "rollback_interface",
      invariants: [
        "future_rollback_is_a_forward_mutation",
        "future_successful_rollback_advances_epoch_by_exactly_one",
        "future_rollback_preserves_evidence_source_and_expert_disagreements",
        "future_failed_rollback_changes_neither_active_state_nor_epoch",
        "future_current_state_is_preserved_before_rollback_activation"
      ],
      nonClaims: [
        "rollback_execution_not_observed",
        "rollback_receipt_not_issued",
        "rollback_target_not_verified",
        "deployment_or_disaster_recovery_capability_not_established"
      ],
      requiredEvidenceBeforeImplementation: [
        "owner_rollback_authority_decision",
        "independent_release_identity",
        "tested_rollback_implementation",
        "verified_provider_sequence",
        "retained_backup_deployment_and_recovery_evidence"
      ],
      requiredInputs: [
        "before_and_after_release_identities",
        "deployment_backup_and_recovery_receipts",
        "rollback_target_identity",
        "rollback_provider_sequence",
        "expected_mutation_epoch"
      ],
      requiredOutputs: [
        "rollback_plan_candidate",
        "rollback_dry_run_report_candidate",
        "rollback_commit_receipt_candidate"
      ],
      requirementsDefined: true,
      runtimeImplementationInstances: 0,
      status: "requirements_only_zero_implementation"
    }
  ];
}

function buildDesignProjection() {
  const unsigned = {
    activeAdmissionEffect: "none",
    artifactRole:
      "non_product_requirements_only_independent_storage_backup_recovery_and_rollback_design_candidate",
    authorityBoundary: {
      contentTruthEstablished: false,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false
    },
    backupRecoveryRollbackBoundary: {
      backupDryRunsExecuted: 0,
      backupImplementations: 0,
      backupReceiptsIssued: 0,
      backupSetsCreated: 0,
      recoveryDryRunsExecuted: 0,
      recoveryImplementations: 0,
      recoveryReceiptsIssued: 0,
      rollbackDryRunsExecuted: 0,
      rollbackImplementations: 0,
      rollbackReceiptsIssued: 0
    },
    boundaryBindings: {
      historicalParent: PARENT_CONTEXT,
      independentProductBoundaryAdr: ADR_CONTEXT,
      runtimeAndBundleSizeProposal: RUNTIME_CONTEXT,
      versionAwareObservationCandidate: OBSERVATION_CONTEXT
    },
    candidateCeilingObservations: [
      {
        approvalStatus: "unapproved_candidate",
        metricId: "installed_offline_footprint_bytes",
        observedValue: null,
        optionId: "browser_embedded",
        planRef: "#/runtimeOptions/0/candidateCeilings/2/proposedCeiling",
        proposedCeiling: 100000000,
        unit: "bytes",
        measurementStatus: "not_measured"
      },
      {
        approvalStatus: "unapproved_candidate",
        metricId: "evidence_retention_bytes_per_release",
        observedValue: null,
        optionId: "browser_embedded",
        planRef: "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
        proposedCeiling: 50000000,
        unit: "bytes",
        measurementStatus: "not_measured"
      },
      {
        approvalStatus: "unapproved_candidate",
        metricId: "installed_offline_footprint_bytes",
        observedValue: null,
        optionId: "loopback_local_service",
        planRef: "#/runtimeOptions/1/candidateCeilings/2/proposedCeiling",
        proposedCeiling: 750000000,
        unit: "bytes",
        measurementStatus: "not_measured"
      },
      {
        approvalStatus: "unapproved_candidate",
        metricId: "evidence_retention_bytes_per_release",
        observedValue: null,
        optionId: "loopback_local_service",
        planRef: "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling",
        proposedCeiling: 100000000,
        unit: "bytes",
        measurementStatus: "not_measured"
      }
    ],
    capacityBoundary: {
      approvedCapacityBudgets: 0,
      capacityBudgetApproved: false,
      candidateCeilingsInheritedAsApproved: false,
      measuredCapacityValues: 0,
      quantitativePlanRefs: QUANTITATIVE_PLAN_REFS,
      runtimeOptionSelected: false
    },
    createdAt: CREATED_AT,
    designCoverage: {
      designExecutionStarted: false,
      designMaterialCandidateComplete: true,
      designReceiptsIssued: 0,
      interfaceRequirementIds: INTERFACE_REQUIREMENT_IDS,
      interfaceRequirementsDefined: 6,
      interfaceRequirementsRequired: 6
    },
    designId: DESIGN_ID,
    doesNotEstablish: [
      "formal_parent_update_or_supersession",
      "formal_rereview_requirement_satisfaction",
      "owner_scope_license_or_deployment_decision",
      "selected_runtime_or_storage_backend",
      "vedic_storage_namespace_schema_database_or_migration",
      "storage_capacity_measurement_or_approved_budget",
      "mutation_epoch_capability_receipt_atomicity_or_aba_exclusion",
      "backup_recovery_or_rollback_implementation_execution_or_receipt",
      "browser_runtime_service_worker_host_or_release_evidence",
      "loaded_module_node_loader_runtime_launcher_or_trusted_startup_identity",
      "source_binding_source_body_exact_quote_locator_or_three_layer_rights",
      "expert_identity_credentials_independence_opinion_or_expert_truth",
      "content_truth_scientific_validity_or_prediction_accuracy",
      "release_readiness_public_deployment_public_release_or_expert_claims_authorization",
      "legacy_v13_schema_13_or_cross_system_authority_inheritance"
    ],
    evidenceBoundary: {
      artifactAuthenticityEstablished: false,
      browserReceipts: 0,
      buildReceipts: 0,
      deploymentReceipts: 0,
      releaseEvidenceComplete: false,
      rollbackReceipts: 0,
      runtimeExecutionReceipts: 0,
      storageExecutionReceipts: 0
    },
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 38,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      productArtifactsPresent: 3,
      requirementsUniverseClosed: false,
      rereviewRequirementsComplete: 3,
      rereviewRequirementsRequired: 7,
      rereviewTriggered: false
    },
    integrityBoundary: {
      artifactAuthenticityEstablished: false,
      designDigestAlgorithm: "sha256",
      designDigestIsSignature: false,
      directContextCount: 4,
      fixedPathCurrentVerificationRequired: true,
      signerIdentityEstablished: false,
      totalRawContextCount: 20,
      transitiveClosureIndependentlyRawPinned: true,
      transitiveRawContextCount: 16,
      upstreamCapabilityBrandCount: 1
    },
    interfaceRequirements: buildInterfaceRequirements(),
    mutationBoundary: {
      abaExcluded: false,
      compareAndSwapImplementations: 0,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      mutationEpochReceiptsIssued: 0
    },
    observationBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      directContextEndpointSnapshots: 4,
      endpointSnapshotOnly: true,
      intervalMutationExcluded: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      parentRuntimeAndDesignAtomicSnapshot: false,
      totalContextEndpointSnapshots: 20,
      transitiveContextEndpointSnapshots: 16
    },
    productBoundary: {
      centralRegistryIntegration: "absent",
      databaseInstances: 0,
      domainManifest: "absent",
      legacyV13Inherited: false,
      migrationId: null,
      namespaceInstances: 0,
      productSurface: "absent",
      releaseIdentity: null,
      runtimeImplementation: "absent",
      runtimeOption: "unselected",
      schema13Inherited: false,
      storageBackend: "unselected",
      storageSchema: "absent",
      targetSchema: null
    },
    recordType: RECORD_TYPE,
    rereviewBoundary: {
      currentDesignCandidateMaterialPresent: true,
      formalRereviewRequirementSatisfied: false,
      historicalParentRequirementState: "required_absent",
      historicalParentRereviewRequirementsComplete: 3,
      historicalParentRereviewRequirementsRequired: 7,
      ownerDecision: null,
      parentLedgerUpdated: false,
      registryUpdated: false
    },
    schemaVersion: "0.1.0",
    status: STATUS,
    systemIdentity: {
      independentFromBaziZiweiWestern: true,
      migrationId: null,
      projectDefaultReleaseGovernanceContext: {
        activeLine: "legacy-v13",
        migrationId: null,
        targetSchema: 13
      },
      projectDefaultReleaseGovernanceInherited: false,
      releaseIdentity: null,
      systemId: "vedic-astrology",
      targetSchema: null
    },
    transitiveCurrentRawBindings: TRANSITIVE_CURRENT_RAW_CONTEXTS
  };
  return canonicalValue({
    ...unsigned,
    designDigest: computeDesignDigestInternal(unsigned)
  });
}

function requireParentProjection(parent) {
  const item = parent.rereviewRequirements === undefined
    ? undefined
    : REFLECT_APPLY(ARRAY_FIND, parent.rereviewRequirements, [
      (entry) => entry?.requirementId === PARENT_CONTEXT.requiredRereviewRequirementId
    ]);
  if (parent.schemaVersion !== PARENT_CONTEXT.schemaVersion
    || parent.ledgerDigest !== PARENT_CONTEXT.semanticDigest
    || parent.gateSummary?.rereviewRequirementsComplete !== 3
    || parent.gateSummary?.rereviewRequirementsRequired !== 7
    || parent.gateSummary?.rereviewTriggered !== false
    || item?.requirementState !== PARENT_CONTEXT.requiredRereviewRequirementState
    || !exactJson(item?.artifactRefs, [])) {
    fail("PARENT_PROJECTION_MISMATCH", "历史吠陀父账不再保持 required_absent / 3-of-7 红边界。");
  }
}

function requireRuntimeProjection(runtimeProposal) {
  const deferred = runtimeProposal.deferredIndependentDesignRequirements?.[
    RUNTIME_CONTEXT.requiredDeferredDesignKey
  ];
  const ceilingSpecs = [
    [0, 2],
    [0, 8],
    [1, 2],
    [1, 8]
  ];
  const candidateCeilingObservations = [];
  for (let index = 0; index < ceilingSpecs.length; index += 1) {
    const optionIndex = ceilingSpecs[index][0];
    const ceilingIndex = ceilingSpecs[index][1];
    const option = runtimeProposal.runtimeOptions?.[optionIndex];
    const ceiling = option?.candidateCeilings?.[ceilingIndex];
    REFLECT_APPLY(ARRAY_PUSH, candidateCeilingObservations, [{
      approvalStatus: ceiling?.approvalStatus,
      measurementStatus: ceiling?.measurementStatus,
      metricId: ceiling?.metricId,
      observedValue: ceiling?.observedValue,
      optionId: option?.optionId,
      planRef:
        `#/runtimeOptions/${optionIndex}/candidateCeilings/${ceilingIndex}/proposedCeiling`,
      proposedCeiling: ceiling?.proposedCeiling,
      unit: ceiling?.unit
    }]);
  }
  if (runtimeProposal.proposalDigest !== RUNTIME_CONTEXT.semanticDigest
    || runtimeProposal.selectedRuntimeOptionId !== null
    || deferred?.designArtifactsObserved !== RUNTIME_CONTEXT.expectedDesignArtifactsObserved
    || deferred?.requirementState !== RUNTIME_CONTEXT.expectedRequirementState
    || !exactJson(deferred?.artifactRefs, [])
    || !exactJson(deferred?.interfaceRequirementIds, INTERFACE_REQUIREMENT_IDS)
    || !exactJson(deferred?.quantitativePlanRefs, QUANTITATIVE_PLAN_REFS)
    || !exactJson(
      candidateCeilingObservations,
      buildDesignProjection().candidateCeilingObservations
    )) {
    fail("RUNTIME_PROJECTION_MISMATCH", "吠陀运行时提案的六接口或未满足状态漂移。");
  }
}

function requireObservationProjection(observation, brandedResult) {
  if (observation.candidateDigest !== OBSERVATION_CONTEXT.semanticDigest
    || observation.gateSummary?.admissionGatesSatisfied !== 0
    || observation.gateSummary?.bindingFrozenVerified !== 0
    || observation.gateSummary?.independentExpertReviewsVerified !== 0
    || observation.gateSummary?.rereviewRequirementsComplete !== 3
    || observation.gateSummary?.rereviewRequirementsRequired !== 7
    || observation.gateSummary?.rereviewTriggered !== false
    || observation.authorityBoundary?.releaseReady !== false
    || observation.authorityBoundary?.publicDeploymentAuthorized !== false
    || observation.authorityBoundary?.expertClaimsAuthorized !== false
    || brandedResult.activeAdmissionEffect
      !== OBSERVATION_CONTEXT.expectedActiveAdmissionEffect
    || brandedResult.parentLedgerUpdated
      !== OBSERVATION_CONTEXT.expectedParentLedgerUpdated
    || brandedResult.registryUpdated !== OBSERVATION_CONTEXT.expectedRegistryUpdated
    || !isVerifiedVedicProductizationVersionAwareObservationCandidate(brandedResult)) {
    fail("OBSERVATION_PROJECTION_MISMATCH", "吠陀版本感知观察候选不再保持全红 current 品牌投影。");
  }
}

function collectTransitiveCurrentRawContexts(workspaceRoot) {
  assertOuterPromiseIntegrity();
  const observed = [];
  for (let index = 0; index < TRANSITIVE_CURRENT_RAW_CONTEXTS.length; index += 1) {
    const context = TRANSITIVE_CURRENT_RAW_CONTEXTS[index];
    const snapshot = readStableWorkspaceFileSync(
      workspaceRoot,
      context.path,
      MAX_ARTIFACT_BYTES,
      {
        invalidCode: "TRANSITIVE_CONTEXT_ENDPOINT_INVALID",
        label: "吠陀传递 current raw 端点 " + context.contextId,
        missingCode: "TRANSITIVE_CONTEXT_MISSING"
      }
    );
    requireRawIdentity(
      snapshot,
      context,
      "吠陀传递 current raw 端点 " + context.contextId
    );
    REFLECT_APPLY(ARRAY_PUSH, observed, [{
      bytes: snapshot.rawBytes,
      contextId: context.contextId,
      path: context.path,
      sha256: snapshot.rawSha256
    }]);
  }
  if (observed.length !== 16) {
    fail("TRANSITIVE_CONTEXT_COUNT_MISMATCH", "吠陀传递 current raw 端点必须精确为 16 个。");
  }
  return deepFreeze(canonicalValue({
    contexts: observed,
    endpointSnapshotOnly: true,
    totalRawContextCountIncludingDirect: 20,
    transitiveRawContextCount: 16
  }));
}

async function collectDirectCurrentContexts(workspaceRoot) {
  assertOuterPromiseIntegrity();
  const transitiveRawClosure = collectTransitiveCurrentRawContexts(workspaceRoot);
  const adrSnapshot = readStableWorkspaceFileSync(
    workspaceRoot,
    ADR_CONTEXT.path,
    64 * 1024,
    { label: "吠陀独立产品边界 ADR" }
  );
  requireRawIdentity(adrSnapshot, ADR_CONTEXT, "吠陀独立产品边界 ADR");
  const adrText = decodeStrictUtf8(adrSnapshot.bytes, "吠陀独立产品边界 ADR");
  if (!REFLECT_APPLY(STRING_INCLUDES, adrText, [ADR_CONTEXT.requiredMarker])) {
    fail("ADR_MARKER_MISSING", "吠陀 ADR 缺少独立存储设计重审标记。");
  }

  const parentSnapshot = readStableWorkspaceFileSync(
    workspaceRoot,
    PARENT_CONTEXT.path,
    MAX_ARTIFACT_BYTES,
    { label: "历史吠陀父要求账" }
  );
  requireRawIdentity(parentSnapshot, PARENT_CONTEXT, "历史吠陀父要求账");
  const parent = parseVedicProductizationRequirementsJsonBytes(parentSnapshot.bytes);
  if (decodeStrictUtf8(parentSnapshot.bytes, "历史吠陀父要求账")
      !== canonicalPrettyStringifyVedicProductizationRequirements(parent)) {
    fail("PARENT_MATERIALIZATION_MISMATCH", "历史吠陀父要求账不是 canonical LF materialization。");
  }
  await requirePristineAwaitable(
    verifyVedicProductizationRequirementsLedger(workspaceRoot, parent),
    "historical parent verifier"
  );
  assertOuterPromiseIntegrity();
  requireParentProjection(parent);

  const runtimeSnapshot = readStableWorkspaceFileSync(
    workspaceRoot,
    RUNTIME_CONTEXT.path,
    MAX_ARTIFACT_BYTES,
    { label: "吠陀运行时与体积提案" }
  );
  requireRawIdentity(runtimeSnapshot, RUNTIME_CONTEXT, "吠陀运行时与体积提案");
  const runtimeProposal = parseVedicRuntimeAndBundleSizeProposalJsonBytes(
    runtimeSnapshot.bytes
  );
  if (decodeStrictUtf8(runtimeSnapshot.bytes, "吠陀运行时与体积提案")
      !== canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal(runtimeProposal)) {
    fail("RUNTIME_MATERIALIZATION_MISMATCH", "吠陀运行时提案不是 canonical LF materialization。");
  }
  await requirePristineAwaitable(
    verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, runtimeProposal),
    "runtime and bundle-size verifier"
  );
  assertOuterPromiseIntegrity();
  requireRuntimeProjection(runtimeProposal);

  const observationSnapshot = readStableWorkspaceFileSync(
    workspaceRoot,
    OBSERVATION_CONTEXT.path,
    MAX_ARTIFACT_BYTES,
    { label: "吠陀版本感知父子观察候选" }
  );
  requireRawIdentity(
    observationSnapshot,
    OBSERVATION_CONTEXT,
    "吠陀版本感知父子观察候选"
  );
  const observation =
    parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
      observationSnapshot.bytes
    );
  if (decodeStrictUtf8(observationSnapshot.bytes, "吠陀版本感知父子观察候选")
      !== canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate(
        observation
      )) {
    fail("OBSERVATION_MATERIALIZATION_MISMATCH", "吠陀观察候选不是 canonical LF materialization。");
  }
  const brandedObservation = await requirePristineAwaitable(
    loadVedicProductizationVersionAwareObservationCandidate(workspaceRoot),
    "version-aware observation loader"
  );
  assertOuterPromiseIntegrity();
  requireObservationProjection(observation, brandedObservation);

  return deepFreeze(canonicalValue({
    contexts: [ADR_CONTEXT, PARENT_CONTEXT, RUNTIME_CONTEXT, OBSERVATION_CONTEXT],
    currentVerifierPasses: {
      historicalParent: true,
      independentProductBoundaryAdr: true,
      runtimeAndBundleSizeProposal: true,
      versionAwareObservationCandidate: true
    },
    directCurrentContextCount: 4,
    totalRawContextCount: 20,
    transitiveRawClosure,
    transitiveRawContextCount: 16,
    upstreamCapabilityBrandCount: 1
  }));
}

function verifyDesignObjectInternal(value) {
  const candidate = canonicalValue(value);
  const expected = buildDesignProjection();
  if (!exactJson(candidate, expected)
    || candidate.designDigest !== computeDesignDigestInternal(candidate)) {
    fail("DESIGN_OBJECT_MISMATCH", "吠陀存储设计候选对象、摘要、接口或红门漂移。");
  }
  return deepFreeze(candidate);
}

export function verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(
  value
) {
  rejectExternalProxyGraph(value);
  return verifyDesignObjectInternal(value);
}

export async function buildCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
  workspaceRoot
) {
  assertOuterPromiseIntegrity();
  await requirePristineAwaitable(
    collectDirectCurrentContexts(workspaceRoot),
    "direct current-context collector"
  );
  assertOuterPromiseIntegrity();
  const candidate = verifyDesignObjectInternal(
    buildDesignProjection()
  );
  verifyAllCurrentRawEndpointsSynchronously(workspaceRoot);
  return candidate;
}

export async function readCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, PROCESS_OBJECT, [])
) {
  assertOuterPromiseIntegrity();
  await requirePristineAwaitable(
    collectDirectCurrentContexts(workspaceRoot),
    "direct current-context collector"
  );
  assertOuterPromiseIntegrity();
  const snapshot = readStableWorkspaceFileSync(
    workspaceRoot,
    VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH,
    MAX_ARTIFACT_BYTES,
    { label: "吠陀独立存储备份恢复回滚设计候选" }
  );
  assertOuterPromiseIntegrity();
  if (!hasOwnDataProperty(snapshot, "bytes")
    || !hasOwnDataProperty(snapshot, "rawBytes")
    || !hasOwnDataProperty(snapshot, "rawSha256")) {
    fail("DESIGN_RAW_IDENTITY_MISMATCH", "吠陀存储设计候选原始字节身份漂移。");
  }
  const candidateBytes = ownDataValue(snapshot, "bytes");
  const independentlyMeasuredBytes = intrinsicByteLength(
    candidateBytes,
    "吠陀独立存储备份恢复回滚设计候选"
  );
  const independentlyMeasuredSha256 = sha256Bytes(candidateBytes);
  if (ownDataValue(snapshot, "rawBytes") !== independentlyMeasuredBytes
    || ownDataValue(snapshot, "rawSha256") !== independentlyMeasuredSha256
    || independentlyMeasuredBytes !== EXPECTED_PERSISTED.rawBytes
    || independentlyMeasuredSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("DESIGN_RAW_IDENTITY_MISMATCH", "吠陀存储设计候选原始字节身份漂移。");
  }
  const candidate = parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
    candidateBytes
  );
  if (decodeStrictUtf8(candidateBytes, "吠陀独立存储备份恢复回滚设计候选")
      !== canonicalPrettyStringifyInternal(candidate)) {
    fail("DESIGN_MATERIALIZATION_MISMATCH", "吠陀存储设计候选不是 canonical LF materialization。");
  }
  const verifiedCandidate = verifyDesignObjectInternal(candidate);
  verifyAllCurrentRawEndpointsSynchronously(workspaceRoot);
  return verifiedCandidate;
}

function requireExactOwnDataKeys(value, expectedKeys, code, message) {
  const actualKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  if (actualKeys.length !== expectedKeys.length) fail(code, message);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    if (!hasOwnDataProperty(value, key)) fail(code, message);
    const descriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [value, key]
    );
    if (ownDataValue(descriptor, "enumerable") !== true) fail(code, message);
  }
}

function requireImmutableFailClosedResult(value) {
  try {
    value.activeAdmissionEffect = "admit";
  } catch {}
  try {
    value.authorityRedGates.releaseReady = true;
  } catch {}
  try {
    value.mutationRedGates.mutationEpochAvailable = true;
  } catch {}
  try {
    value.currentVedicStorageDesignMechanicallyVerified = true;
  } catch {}
  try {
    value.sequentialEndpointObservationMechanicallyVerified = false;
  } catch {}
  try {
    value.simultaneousCurrentRawClosureVerified = true;
  } catch {}
  try {
    value.__freezeProbe = true;
  } catch {}
  if (value.activeAdmissionEffect !== "none"
    || value.authorityRedGates.releaseReady !== false
    || value.mutationRedGates.mutationEpochAvailable !== false
    || value.currentVedicStorageDesignMechanicallyVerified !== false
    || value.sequentialEndpointObservationMechanicallyVerified !== true
    || value.simultaneousCurrentRawClosureVerified !== false
    || value.__freezeProbe === true) {
    fail("VERIFIED_RESULT_NOT_IMMUTABLE", "吠陀存储设计结果未保持不可变全红边界。");
  }
}

export async function loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, PROCESS_OBJECT, [])
) {
  assertOuterPromiseIntegrity();
  const awaitedCandidate = await requirePristineAwaitable(
    readCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      workspaceRoot
    ),
    "current storage design reader"
  );
  assertOuterPromiseIntegrity();
  const candidate =
    verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(
      awaitedCandidate
    );
  const projection = deepFreeze({
    activeAdmissionEffect: "none",
    artifact: {
      bytes: EXPECTED_PERSISTED.rawBytes,
      path:
        VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH,
      sha256: EXPECTED_PERSISTED.rawSha256
    },
    authorityRedGates: {
      contentTruthEstablished: false,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false
    },
    currentVedicStorageDesignMechanicallyVerified: false,
    designCoverage: candidate.designCoverage,
    designDigest: candidate.designDigest,
    designId: candidate.designId,
    implementationAccounting: {
      approvedCapacityBudgets: 0,
      backupImplementations: 0,
      backupReceiptsIssued: 0,
      databaseInstances: 0,
      mutationEpochReceiptsIssued: 0,
      namespaceInstances: 0,
      recoveryImplementations: 0,
      recoveryReceiptsIssued: 0,
      rollbackImplementations: 0,
      rollbackReceiptsIssued: 0,
      runtimeImplementations: 0,
      selectedRuntimeOptions: 0,
      selectedStorageBackends: 0
    },
    mutationRedGates: candidate.mutationBoundary,
    productIdentity: {
      migrationId: null,
      releaseIdentity: null,
      targetSchema: null
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      inheritedByVedicProductIdentity: false,
      migrationId: null,
      targetSchema: 13
    },
    rereviewBoundary: candidate.rereviewBoundary,
    sequentialEndpointObservationMechanicallyVerified: true,
    simultaneousCurrentRawClosureVerified: false
  });
  const result = deepFreeze(canonicalValue(projection));
  requireExactOwnDataKeys(
    result,
    VERIFIED_RESULT_ROOT_KEYS,
    "VERIFIED_RESULT_PROJECTION_MISMATCH",
    "吠陀存储设计结果包含缺失、额外或非数据根字段。"
  );
  if (!exactJson(result, projection)) {
    fail("VERIFIED_RESULT_PROJECTION_MISMATCH", "吠陀存储设计结果与允许的全红投影不一致。");
  }
  requireImmutableFailClosedResult(result);
  verifyAllCurrentRawEndpointsSynchronously(workspaceRoot);
  requireExactOwnDataKeys(
    result,
    VERIFIED_RESULT_ROOT_KEYS,
    "VERIFIED_RESULT_PROJECTION_MISMATCH",
    "吠陀存储设计结果包含缺失、额外或非数据根字段。"
  );
  if (!exactJson(result, projection)) {
    fail("VERIFIED_RESULT_PROJECTION_MISMATCH", "吠陀存储设计结果与允许的全红投影不一致。");
  }
  requireImmutableFailClosedResult(result);
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
  value
) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && isRecursivelyFrozenPassive(value);
}

export const vedicIndependentStorageBackupRecoveryRollbackDesignCandidateTestOnly =
  OBJECT_FREEZE({
    ADR_CONTEXT,
    DESIGN_DIGEST_DOMAIN,
    DESIGN_ID,
    EXPECTED_PERSISTED,
    INTERFACE_REQUIREMENT_IDS,
    MAX_ARTIFACT_BYTES,
    OBSERVATION_CONTEXT,
    PARENT_CONTEXT,
    QUANTITATIVE_PLAN_REFS,
    RECORD_TYPE,
    RUNTIME_CONTEXT,
    STATUS,
    TRANSITIVE_CURRENT_RAW_CONTEXTS,
    VERIFIED_RESULT_ROOT_KEYS,
    buildDesignProjection,
    collectDirectCurrentContexts,
    collectTransitiveCurrentRawContexts,
    decodeStrictUtf8,
    intrinsicByteLength,
    readStableWorkspaceFile: readStableWorkspaceFileForTest,
    safeWorkspaceFile,
    sha256Bytes,
    utf8EncodeString: utf8EncodeStringForTest
  });
