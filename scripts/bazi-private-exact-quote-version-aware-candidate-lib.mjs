import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { types as utilTypes } from "node:util";

import {
  SOURCE_SUPERSESSION_RELATIVE_PATH,
  RIGHTS_SUPERSESSION_RELATIVE_PATH,
  SUPERSESSION_RECEIPT_RELATIVE_PATH,
  loadBaziDttVersionedParentSupersession,
  isVerifiedBaziDttVersionedParentSupersession,
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH,
  BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH,
  loadBaziDttNoticeReconciliationV2,
  isVerifiedBaziDttNoticeReconciliationV2,
  loadBaziBindingFreezeRequirementsV17,
  isVerifiedBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";

// Capture every capability used after module evaluation. This companion is
// intentionally independent from the historical verifier so that its bytes and
// dependency graph remain unchanged.
const NATIVE_OBJECT = Object;
const NATIVE_REFLECT = Reflect;
const NATIVE_STRING = String;
const FS_LSTAT = lstat;
const FS_OPEN = open;
const FS_REALPATH = realpath;
const FS_STAT = stat;
const CRYPTO_CREATE_HASH = createHash;
const OBJECT_CREATE = NATIVE_OBJECT.create;
const OBJECT_DEFINE_PROPERTY = NATIVE_OBJECT.defineProperty;
const OBJECT_DEFINE_PROPERTIES = NATIVE_OBJECT.defineProperties;
const OBJECT_FREEZE = NATIVE_OBJECT.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = NATIVE_OBJECT.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = NATIVE_OBJECT.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = NATIVE_OBJECT.getPrototypeOf;
const OBJECT_HAS_OWN = NATIVE_OBJECT.hasOwn;
const OBJECT_IS = NATIVE_OBJECT.is;
const OBJECT_KEYS = NATIVE_OBJECT.keys;
const OBJECT_PROTOTYPE = NATIVE_OBJECT.prototype;
const OBJECT_SET_PROTOTYPE_OF = NATIVE_OBJECT.setPrototypeOf;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_SORT = ARRAY_PROTOTYPE.sort;
const NATIVE_ARRAY = Array;
const NATIVE_ERROR = Error;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_INTEGER = Number.isInteger;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const REFLECT_APPLY = NATIVE_REFLECT.apply;
const REFLECT_OWN_KEYS = NATIVE_REFLECT.ownKeys;
const REGEXP_TEST = RegExp.prototype.test;
const STRING_CHAR_CODE_AT = NATIVE_STRING.prototype.charCodeAt;
const STRING_ENDS_WITH = NATIVE_STRING.prototype.endsWith;
const STRING_INCLUDES = NATIVE_STRING.prototype.includes;
const STRING_INDEX_OF = NATIVE_STRING.prototype.indexOf;
const STRING_SLICE = NATIVE_STRING.prototype.slice;
const STRING_SPLIT = NATIVE_STRING.prototype.split;
const STRING_STARTS_WITH = NATIVE_STRING.prototype.startsWith;
const STRING_TO_LOWER_CASE = NATIVE_STRING.prototype.toLowerCase;
const NATIVE_DATE = Date;
const DATE_PARSE = Date.parse;
const DATE_TO_ISO_STRING = Date.prototype.toISOString;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const NATIVE_JSON = JSON;
const JSON_STRINGIFY = NATIVE_JSON.stringify;
const BUFFER_FROM = Buffer.from;
const BUFFER_ALLOC_UNSAFE = Buffer.allocUnsafe;
const BUFFER_PROTOTYPE = Buffer.prototype;
const NATIVE_BUFFER = Buffer;
const NATIVE_UINT8_ARRAY = Uint8Array;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const TYPED_ARRAY_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  NATIVE_OBJECT,
  [UINT8_ARRAY_PROTOTYPE]
);
const TYPED_ARRAY_BUFFER_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  NATIVE_OBJECT,
  [TYPED_ARRAY_PROTOTYPE, "buffer"]
)?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  NATIVE_OBJECT,
  [TYPED_ARRAY_PROTOTYPE, "byteOffset"]
)?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  NATIVE_OBJECT,
  [TYPED_ARRAY_PROTOTYPE, "byteLength"]
)?.get;
const ARRAY_BUFFER_PROTOTYPE = ArrayBuffer.prototype;
const ARRAY_BUFFER_RESIZABLE_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  NATIVE_OBJECT,
  [ARRAY_BUFFER_PROTOTYPE, "resizable"]
)?.get;
const UINT8_ARRAY_SET = UINT8_ARRAY_PROTOTYPE.set;
const BIGINT_FROM = BigInt;
const PROCESS_CWD = process.cwd;
const PROCESS_PLATFORM = process.platform;
const PATH_IS_ABSOLUTE = path.isAbsolute;
const PATH_JOIN = path.join;
const PATH_DIRNAME = path.dirname;
const PATH_NORMALIZE = path.normalize;
const PATH_RELATIVE = path.relative;
const PATH_RESOLVE = path.resolve;
const PATH_SEPARATOR = path.sep;
const PATH_POSIX = path.posix;
const PATH_WIN32 = path.win32;
const PATH_POSIX_IS_ABSOLUTE = PATH_POSIX.isAbsolute;
const PATH_POSIX_NORMALIZE = PATH_POSIX.normalize;
const PATH_WIN32_IS_ABSOLUTE = PATH_WIN32.isAbsolute;
const UTIL_IS_ARRAY_BUFFER = utilTypes.isArrayBuffer;
const UTIL_IS_NATIVE_ERROR = utilTypes.isNativeError;
const UTIL_IS_PROXY = utilTypes.isProxy;
const UTIL_IS_SHARED_ARRAY_BUFFER = utilTypes.isSharedArrayBuffer;
const UTIL_IS_UINT8_ARRAY = utilTypes.isUint8Array;
const HASH_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  NATIVE_OBJECT,
  [CRYPTO_CREATE_HASH("sha256")]
);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const FILE_HANDLE_PROBE = await FS_OPEN(new URL(import.meta.url), fsConstants.O_RDONLY);
const FILE_HANDLE_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  NATIVE_OBJECT,
  [FILE_HANDLE_PROBE]
);
const FILE_HANDLE_READ = FILE_HANDLE_PROTOTYPE.read;
const FILE_HANDLE_STAT = FILE_HANDLE_PROTOTYPE.stat;
const FILE_HANDLE_PROBE_CLOSE = FILE_HANDLE_PROBE.close;
const STATS_PROBE = await REFLECT_APPLY(FILE_HANDLE_STAT, FILE_HANDLE_PROBE, [{ bigint: true }]);
const STATS_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, NATIVE_OBJECT, [STATS_PROBE]);
const STATS_IS_FILE = STATS_PROTOTYPE.isFile;
const STATS_IS_DIRECTORY = STATS_PROTOTYPE.isDirectory;
const STATS_IS_SYMBOLIC_LINK = STATS_PROTOTYPE.isSymbolicLink;
await REFLECT_APPLY(FILE_HANDLE_PROBE_CLOSE, FILE_HANDLE_PROBE, []);

const OPEN_READ_ONLY = fsConstants.O_RDONLY;
const OPEN_NO_FOLLOW = fsConstants.O_NOFOLLOW ?? 0;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_SOURCE_BODY_BYTES = 2 * 1024 * 1024;
const MAX_INPUT_DEPTH = 64;
const MAX_INPUT_NODES = 200_000;
const MAX_INPUT_TEXT_CODE_UNITS = 2_000_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const REQUEST_ID_PATTERN = /^req-[a-f0-9]{32}$/u;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const WINDOWS_DRIVE_ABSOLUTE_PATTERN = /^[a-zA-Z]:[\\/]/u;
const WINDOWS_RESERVED_SEGMENT_PATTERN = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const VERIFIED_RECEIPTS = new NATIVE_WEAK_SET();
const VERIFIED_MATERIAL_INTEGRITY_RESULTS = new NATIVE_WEAK_SET();
const VERIFIED_CURRENT_PARENT_BUNDLES = new NATIVE_WEAK_SET();
const VERIFIED_CURRENT_QUOTE_CONTEXTS = new NATIVE_WEAK_SET();

export const BAZI_PRIVATE_EXACT_QUOTE_VERSION_AWARE_REQUEST_SCHEMA_VERSION = "1.1.0";
export const BAZI_PRIVATE_EXACT_QUOTE_VERSION_AWARE_RECEIPT_SCHEMA_VERSION = "1.1.0";

const CURRENT_SOURCE = OBJECT_FREEZE({
  path: SOURCE_SUPERSESSION_RELATIVE_PATH,
  rawBytes: 50427,
  rawSha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
  ledgerDigest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c"
});

const CURRENT_RIGHTS = OBJECT_FREEZE({
  path: RIGHTS_SUPERSESSION_RELATIVE_PATH,
  rawBytes: 23947,
  rawSha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.2.0",
  ledgerDigest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc"
});

const CURRENT_READINESS = OBJECT_FREEZE({
  path: BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH,
  rawBytes: 32629,
  rawSha256: "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
  ledgerDigest: "afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8"
});

const CURRENT_RECONCILIATION = OBJECT_FREEZE({
  path: DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH,
  rawBytes: 8881,
  rawSha256: "e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b",
  reconciliationId: "hakimi.bazi.dtt-notice-reconciliation/2.0.0",
  reconciliationDigest: "2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0"
});

const CURRENT_SUPERSESSION = OBJECT_FREEZE({
  path: SUPERSESSION_RECEIPT_RELATIVE_PATH,
  rawBytes: 9229,
  rawSha256: "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
  supersessionId: "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
  supersessionDigest: "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
});

const RELEASE_GOVERNANCE = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

export const CURRENT_FIRST_THREE_EXACT_QUOTE_TOPIC_MAP = deepFreeze([
  {
    topicId: "strength.yueling_exact_quote",
    currentBindingIds: ["binding:dtt:month-command", "binding:smt-v10:whole-chart"],
    mappingState: "mapped_to_existing_bindings_as_research_candidates",
    quoteRefs: [
      {
        candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
        candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
        historicalCandidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
        bindingId: "binding:dtt:month-command",
        evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
        quoteCandidateId: "dtt-yueling-minimal-v1",
        rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
        rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c",
        historicalRightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
        parentMode: "paired_versioned_supersession"
      },
      {
        candidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
        candidateDigest: "e726f93c6b8001a75c1ae58e17506976f970b483728f7f8ef21e37313981f92a",
        historicalCandidateId: null,
        bindingId: "binding:smt-v10:whole-chart",
        evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
        quoteCandidateId: "smt-v10-yueling-minimal-v1",
        rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v1",
        rightsCandidateDigest: "5ac820401e53d6268c0250232bb2de3c813f2fbe5ed7a05ff46200c7f72fca16",
        historicalRightsCandidateId: null,
        parentMode: "identity_unchanged_in_current_parent"
      }
    ]
  },
  {
    topicId: "strength.rooting_exact_quote",
    currentBindingIds: ["binding:dtt:month-command"],
    mappingState: "candidate_quote_located_no_dedicated_current_binding",
    quoteRefs: [
      {
        candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
        candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
        historicalCandidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
        bindingId: "binding:dtt:month-command",
        evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
        quoteCandidateId: "dtt-rooting-minimal-v1",
        rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
        rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c",
        historicalRightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
        parentMode: "paired_versioned_supersession"
      }
    ]
  },
  {
    topicId: "strength.tougan_exact_quote",
    currentBindingIds: ["binding:smt-v10:whole-chart"],
    mappingState: "candidate_quote_located_no_dedicated_current_binding",
    quoteRefs: [
      {
        candidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
        candidateDigest: "e726f93c6b8001a75c1ae58e17506976f970b483728f7f8ef21e37313981f92a",
        historicalCandidateId: null,
        bindingId: "binding:smt-v10:whole-chart",
        evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
        quoteCandidateId: "smt-v10-tougan-minimal-v1",
        rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v1",
        rightsCandidateDigest: "5ac820401e53d6268c0250232bb2de3c813f2fbe5ed7a05ff46200c7f72fca16",
        historicalRightsCandidateId: null,
        parentMode: "identity_unchanged_in_current_parent"
      }
    ]
  }
]);

const REQUEST_KEYS = OBJECT_FREEZE([
  "schemaVersion",
  "recordType",
  "requestId",
  "topicId",
  "quoteCandidateId",
  "sourceBodyRelativePath",
  "handlingBoundary"
]);

const HANDLING_BOUNDARY_KEYS = OBJECT_FREEZE([
  "privateRootOutsideWorkspaceRequired",
  "repositoryStorageAllowed",
  "materialRedistributionDecision",
  "quotePublicationDecision",
  "rightsLegalConclusion"
]);

const FILE_API_REQUIRED_KEYS = OBJECT_FREEZE([
  "workspaceRoot",
  "privateRoot",
  "requestRelativePath"
]);

const DOES_NOT_ESTABLISH = deepFreeze([
  "lawful_material_access",
  "work_identity",
  "edition_identity",
  "transcription_identity_beyond_pinned_bytes",
  "carrier_identity_for_freeze",
  "minimal_quote_sufficiency",
  "independent_human_collation",
  "formal_source_rights_or_source_carrier_record",
  "knowledge_document",
  "rights_or_legal_clearance",
  "cross_file_atomic_snapshot",
  "mutation_epoch",
  "interval_mutation_or_aba_exclusion",
  "binding_freeze",
  "content_truth",
  "bazi_rule_truth",
  "expert_identity_qualification_or_independence",
  "expert_truth",
  "release_readiness",
  "public_release_authorization"
]);

export class BaziPrivateExactQuoteVersionAwareCandidateError extends NATIVE_ERROR {
  constructor(code, message) {
    super(`${code}: ${message}`);
    OBJECT_DEFINE_PROPERTIES(this, {
      name: {
        value: "BaziPrivateExactQuoteVersionAwareCandidateError",
        enumerable: false,
        writable: false,
        configurable: false
      },
      code: { value: code, enumerable: false, writable: false, configurable: false },
      safeForCli: { value: true, enumerable: false, writable: false, configurable: false }
    });
  }
}

function fail(code, message) {
  throw new BaziPrivateExactQuoteVersionAwareCandidateError(code, message);
}

function appendValue(array, value) {
  OBJECT_DEFINE_PROPERTY(array, NATIVE_STRING(array.length), {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalizeCurrentCandidateValue(snapshot) {
  if (snapshot === null || typeof snapshot === "boolean" || typeof snapshot === "string") return snapshot;
  if (typeof snapshot === "number" && NUMBER_IS_FINITE(snapshot) && !OBJECT_IS(snapshot, -0)) return snapshot;
  if (ARRAY_IS_ARRAY(snapshot)) {
    const output = new NATIVE_ARRAY();
    REFLECT_APPLY(OBJECT_SET_PROTOTYPE_OF, NATIVE_OBJECT, [output, null]);
    for (let index = 0; index < snapshot.length; index += 1) {
      appendValue(output, canonicalizeCurrentCandidateValue(snapshot[index]));
    }
    return output;
  }
  if (snapshot && typeof snapshot === "object"
    && REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, NATIVE_OBJECT, [snapshot]) === OBJECT_PROTOTYPE) {
    const output = REFLECT_APPLY(OBJECT_CREATE, NATIVE_OBJECT, [null]);
    const keys = REFLECT_APPLY(OBJECT_KEYS, NATIVE_OBJECT, [snapshot]);
    REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: canonicalizeCurrentCandidateValue(snapshot[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  fail("NON_CANONICAL_JSON", "current candidate canonicalization accepts only finite passive JSON");
}

function canonicalStringifyCurrentCandidate(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [
    canonicalizeCurrentCandidateValue(passiveSnapshot(value, "canonical current candidate value"))
  ]);
}

function arrayContains(array, value) {
  if (!ARRAY_IS_ARRAY(array)) return false;
  for (let index = 0; index < array.length; index += 1) {
    if (array[index] === value) return true;
  }
  return false;
}

function exactArrayValues(array, expected) {
  if (!ARRAY_IS_ARRAY(array) || array.length !== expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (array[index] !== expected[index]) return false;
  }
  return true;
}

function isOrdinaryRecord(value) {
  return value !== null
    && typeof value === "object"
    && !ARRAY_IS_ARRAY(value)
    && REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, NATIVE_OBJECT, [value]) === OBJECT_PROTOTYPE;
}

function ownDataValue(value, key, label) {
  const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, NATIVE_OBJECT, [value, key]);
  if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [descriptor, "value"])) {
    fail("INVALID_DECLARATIVE_SHAPE", `${label} must contain only own data properties`);
  }
  return descriptor.value;
}

function capturePassiveJsonValue(value, state, depth, label) {
  if (depth > MAX_INPUT_DEPTH) fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the depth budget`);
  state.nodes += 1;
  if (state.nodes > MAX_INPUT_NODES) fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the node budget`);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("UNSAFE_DECLARATIVE_INPUT", `${label} contains an invalid number`);
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCodeUnits += value.length;
    if (state.textCodeUnits > MAX_INPUT_TEXT_CODE_UNITS) {
      fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the text budget`);
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} must contain JSON data only`);
  }
  if (UTIL_IS_PROXY(value)) fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot be a Proxy`);
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain a cycle`);
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain aliases`);
  }
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  try {
    let prototype;
    let descriptors;
    try {
      prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, NATIVE_OBJECT, [value]);
      descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, NATIVE_OBJECT, [value]);
    } catch {
      fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot be captured passively`);
    }
    const descriptorKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, NATIVE_REFLECT, [descriptors]);
    for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
      if (typeof descriptorKeys[keyIndex] === "symbol") {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain Symbol properties`);
      }
    }
    if (ARRAY_IS_ARRAY(value)) {
      if (prototype !== ARRAY_PROTOTYPE) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} arrays must use the ordinary prototype`);
      }
      const lengthTableDescriptor = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
        NATIVE_OBJECT,
        [descriptors, "length"]
      );
      const lengthDescriptor = lengthTableDescriptor
        && REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [lengthTableDescriptor, "value"])
        ? lengthTableDescriptor.value
        : null;
      if (!lengthDescriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [lengthDescriptor, "value"])
        || !NUMBER_IS_SAFE_INTEGER(lengthDescriptor.value)
        || lengthDescriptor.value < 0
        || descriptorKeys.length !== lengthDescriptor.value + 1) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} arrays must be dense without custom properties`);
      }
      const output = new NATIVE_ARRAY(lengthDescriptor.value);
      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        const indexKey = NATIVE_STRING(index);
        const tableDescriptor = REFLECT_APPLY(
          OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
          NATIVE_OBJECT,
          [descriptors, indexKey]
        );
        const descriptor = tableDescriptor
          && REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [tableDescriptor, "value"])
          ? tableDescriptor.value
          : null;
        if (!descriptor
          || !REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("UNSAFE_DECLARATIVE_INPUT", `${label} arrays must contain enumerable data items`);
        }
        OBJECT_DEFINE_PROPERTY(output, NATIVE_STRING(index), {
          value: capturePassiveJsonValue(descriptor.value, state, depth + 1, label),
          enumerable: true,
          configurable: true,
          writable: true
        });
      }
      return output;
    }
    if (prototype !== OBJECT_PROTOTYPE) {
      fail("UNSAFE_DECLARATIVE_INPUT", `${label} objects must use the ordinary prototype`);
    }
    const output = {};
    for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
      const key = descriptorKeys[keyIndex];
      const tableDescriptor = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
        NATIVE_OBJECT,
        [descriptors, key]
      );
      const descriptor = tableDescriptor
        && REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [tableDescriptor, "value"])
        ? tableDescriptor.value
        : null;
      if (!descriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [descriptor, "value"])
        || descriptor.enumerable !== true) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} must contain enumerable own data properties`);
      }
      state.textCodeUnits += key.length;
      if (state.textCodeUnits > MAX_INPUT_TEXT_CODE_UNITS) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the text budget`);
      }
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: capturePassiveJsonValue(descriptor.value, state, depth + 1, label),
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

function passiveSnapshot(value, label) {
  return capturePassiveJsonValue(value, {
    active: new NATIVE_WEAK_SET(),
    seen: new NATIVE_WEAK_SET(),
    nodes: 0,
    textCodeUnits: 0
  }, 0, label);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, NATIVE_OBJECT, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, NATIVE_REFLECT, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const tableDescriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      NATIVE_OBJECT,
      [descriptors, keys[index]]
    );
    const descriptor = tableDescriptor
      && REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [tableDescriptor, "value"])
      ? tableDescriptor.value
      : null;
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [descriptor, "value"])) {
      deepFreeze(descriptor.value, seen);
    }
  }
  return REFLECT_APPLY(OBJECT_FREEZE, NATIVE_OBJECT, [value]);
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isOrdinaryRecord(value)) fail("INVALID_DECLARATIVE_SHAPE", `${label} must be an ordinary object`);
  const keys = REFLECT_APPLY(OBJECT_KEYS, NATIVE_OBJECT, [value]);
  if (keys.length !== expectedKeys.length) {
    fail("INVALID_DECLARATIVE_SHAPE", `${label} keys must match the exact schema`);
  }
  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (!REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [value, expectedKeys[index]])) {
      fail("INVALID_DECLARATIVE_SHAPE", `${label} keys must match the exact schema`);
    }
  }
}

function sha256Bytes(bytes) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Text(value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function captureStrictUint8Array(bytes, label, maxBytes) {
  if (UTIL_IS_PROXY(bytes)) fail("INVALID_BYTES", `${label} cannot be a Proxy`);
  let prototype;
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, NATIVE_OBJECT, [bytes]);
    backingBuffer = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch {
    fail("INVALID_BYTES", `${label} internal byte slots cannot be read`);
  }
  if (!UTIL_IS_UINT8_ARRAY(bytes)
    || (prototype !== UINT8_ARRAY_PROTOTYPE && prototype !== BUFFER_PROTOTYPE)
    || !NUMBER_IS_SAFE_INTEGER(byteOffset)
    || byteOffset < 0
    || !NUMBER_IS_SAFE_INTEGER(byteLength)
    || byteLength <= 0
    || byteLength > maxBytes
    || !UTIL_IS_ARRAY_BUFFER(backingBuffer)) {
    fail("INVALID_BYTES", `${label} must be a bounded ordinary Uint8Array`);
  }
  if (typeof UTIL_IS_SHARED_ARRAY_BUFFER === "function" && UTIL_IS_SHARED_ARRAY_BUFFER(backingBuffer)) {
    fail("INVALID_BYTES", `${label} cannot use SharedArrayBuffer`);
  }
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = REFLECT_APPLY(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch {
      fail("INVALID_BYTES", `${label} backing buffer state cannot be read`);
    }
    if (resizable) fail("INVALID_BYTES", `${label} cannot use a resizable ArrayBuffer`);
  }
  const captured = new NATIVE_UINT8_ARRAY(byteLength);
  try {
    REFLECT_APPLY(UINT8_ARRAY_SET, captured, [bytes]);
  } catch {
    fail("INVALID_BYTES", `${label} cannot be copied into a fixed private buffer`);
  }
  return captured;
}

function decodeStrictUtf8(bytes, label, maxBytes) {
  const captured = captureStrictUint8Array(bytes, label, maxBytes);
  if (captured.byteLength >= 3
    && captured[0] === 0xef
    && captured[1] === 0xbb
    && captured[2] === 0xbf) {
    fail("UTF8_BOM_FORBIDDEN", `${label} must not contain a UTF-8 BOM`);
  }
  try {
    const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
    return {
      bytes: captured,
      text: REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [captured])
    };
  } catch {
    fail("INVALID_UTF8", `${label} is not strict UTF-8`);
  }
}

export function parsePrivateExactQuoteVersionAwareCandidateRequestBytes(bytes) {
  const captured = captureStrictUint8Array(bytes, "private request", MAX_REQUEST_BYTES);
  try {
    const parsed = parseBaziDttStrictJsonArtifact(OBJECT_FREEZE({
      path: "private exact-quote request",
      bytes: captured
    }));
    return validatePrivateExactQuoteVersionAwareCandidateRequest(parsed);
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail("INVALID_REQUEST_JSON", "private request must be strict duplicate-free UTF-8 JSON");
  }
}

function validatePrivateRelativePath(value, label) {
  if (typeof value !== "string"
    || value.length === 0
    || value.length > 240
    || REFLECT_APPLY(STRING_INCLUDES, value, ["\\"])
    || REFLECT_APPLY(STRING_INCLUDES, value, ["\0"])
    || REFLECT_APPLY(STRING_INCLUDES, value, [":"])) {
    fail("INVALID_PRIVATE_PATH", `${label} must be a short forward-slash relative path`);
  }
  if (REFLECT_APPLY(PATH_POSIX_IS_ABSOLUTE, PATH_POSIX, [value])
    || REFLECT_APPLY(PATH_WIN32_IS_ABSOLUTE, PATH_WIN32, [value])) {
    fail("INVALID_PRIVATE_PATH", `${label} must not be absolute`);
  }
  const segments = REFLECT_APPLY(STRING_SPLIT, value, ["/"]);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment || segment === "." || segment === "..") {
      fail("INVALID_PRIVATE_PATH", `${label} must not contain empty, dot, or parent segments`);
    }
    if (PROCESS_PLATFORM === "win32"
      && (REFLECT_APPLY(STRING_ENDS_WITH, segment, ["."])
        || REFLECT_APPLY(STRING_ENDS_WITH, segment, [" "])
        || REFLECT_APPLY(REGEXP_TEST, WINDOWS_RESERVED_SEGMENT_PATTERN, [segment]))) {
      fail("INVALID_PRIVATE_PATH", `${label} contains a Windows alias-prone segment`);
    }
  }
  if (REFLECT_APPLY(PATH_POSIX_NORMALIZE, PATH_POSIX, [value]) !== value) {
    fail("INVALID_PRIVATE_PATH", `${label} must be normalized`);
  }
  return value;
}

function sameDeclaredPrivateRelativePath(left, right) {
  if (PROCESS_PLATFORM === "win32") {
    return REFLECT_APPLY(STRING_TO_LOWER_CASE, left, [])
      === REFLECT_APPLY(STRING_TO_LOWER_CASE, right, []);
  }
  return left === right;
}

function findTopic(topicId) {
  for (let index = 0; index < CURRENT_FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.length; index += 1) {
    const topic = CURRENT_FIRST_THREE_EXACT_QUOTE_TOPIC_MAP[index];
    if (topic.topicId === topicId) return topic;
  }
  return null;
}

function findQuoteRef(topic, quoteCandidateId) {
  if (!topic) return null;
  for (let index = 0; index < topic.quoteRefs.length; index += 1) {
    if (topic.quoteRefs[index].quoteCandidateId === quoteCandidateId) return topic.quoteRefs[index];
  }
  return null;
}

export function validatePrivateExactQuoteVersionAwareCandidateRequest(input) {
  const request = passiveSnapshot(input, "private exact-quote current candidate request");
  assertExactKeys(request, REQUEST_KEYS, "request");
  assertExactKeys(request.handlingBoundary, HANDLING_BOUNDARY_KEYS, "request.handlingBoundary");
  if (request.schemaVersion !== BAZI_PRIVATE_EXACT_QUOTE_VERSION_AWARE_REQUEST_SCHEMA_VERSION
    || request.recordType !== "bazi_private_exact_quote_version_aware_candidate_request") {
    fail("INVALID_REQUEST_IDENTITY", "request schemaVersion or recordType is not supported");
  }
  if (typeof request.requestId !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, REQUEST_ID_PATTERN, [request.requestId])) {
    fail("INVALID_REQUEST_IDENTITY", "requestId must be req- plus 128 bits of lowercase hex");
  }
  const topic = findTopic(request.topicId);
  if (!findQuoteRef(topic, request.quoteCandidateId)) {
    fail("QUOTE_OUTSIDE_CURRENT_FIRST_THREE_SCOPE", "topicId and quoteCandidateId are not an exact current mapping");
  }
  validatePrivateRelativePath(request.sourceBodyRelativePath, "request.sourceBodyRelativePath");
  const boundary = request.handlingBoundary;
  if (boundary.privateRootOutsideWorkspaceRequired !== true
    || boundary.repositoryStorageAllowed !== false
    || boundary.materialRedistributionDecision !== "not_established"
    || boundary.quotePublicationDecision !== "not_established"
    || boundary.rightsLegalConclusion !== "not_established") {
    fail("HANDLING_BOUNDARY_PROMOTION_FORBIDDEN", "request must keep private material and rights decisions fail-closed");
  }
  return deepFreeze(request);
}

function expectedTopicProjection() {
  const output = [];
  for (let index = 0; index < CURRENT_FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.length; index += 1) {
    const topic = CURRENT_FIRST_THREE_EXACT_QUOTE_TOPIC_MAP[index];
    const currentBindingIds = [];
    for (let bindingIndex = 0; bindingIndex < topic.currentBindingIds.length; bindingIndex += 1) {
      appendValue(currentBindingIds, topic.currentBindingIds[bindingIndex]);
    }
    appendValue(output, {
      topicId: topic.topicId,
      currentBindingIds,
      mappingState: topic.mappingState
    });
  }
  return output;
}

function findExactlyOne(items, predicate, label) {
  if (!ARRAY_IS_ARRAY(items)) fail("CURRENT_PARENT_SCHEMA_INVALID", `${label} collection is missing`);
  let found = null;
  let count = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (predicate(items[index])) {
      found = items[index];
      count += 1;
    }
  }
  if (count !== 1) fail("CURRENT_PARENT_CHAIN_MISMATCH", `${label} must exist exactly once`);
  return found;
}

function findExpectedRef(candidateId, quoteCandidateId, topicId) {
  const topic = findTopic(topicId);
  if (!topic) return null;
  for (let index = 0; index < topic.quoteRefs.length; index += 1) {
    const ref = topic.quoteRefs[index];
    if (ref.candidateId === candidateId && ref.quoteCandidateId === quoteCandidateId) return ref;
  }
  return null;
}

export function assertExactCurrentFirstThreeTopicMap(sourceLedgerInput) {
  const sourceLedger = passiveSnapshot(sourceLedgerInput, "current source ledger");
  if (!isOrdinaryRecord(sourceLedger)
    || sourceLedger.ledgerId !== CURRENT_SOURCE.ledgerId
    || sourceLedger.ledgerDigest !== CURRENT_SOURCE.ledgerDigest) {
    fail("CURRENT_SOURCE_IDENTITY_MISMATCH", "current source ledger semantic identity is not pinned");
  }
  const actualProjection = [];
  if (!ARRAY_IS_ARRAY(sourceLedger.conceptualTopicMapping)) {
    fail("CURRENT_TOPIC_MAP_DRIFT", "current conceptual topic mapping is missing");
  }
  for (let index = 0; index < sourceLedger.conceptualTopicMapping.length; index += 1) {
    const topic = sourceLedger.conceptualTopicMapping[index];
    appendValue(actualProjection, {
      topicId: topic.topicId,
      currentBindingIds: topic.currentBindingIds,
      mappingState: topic.mappingState
    });
  }
  if (canonicalStringifyCurrentCandidate(actualProjection)
    !== canonicalStringifyCurrentCandidate(expectedTopicProjection())) {
    fail("CURRENT_TOPIC_MAP_DRIFT", "the current three-topic to two-binding map has drifted");
  }

  let observedRefs = 0;
  const seen = new NATIVE_SET();
  if (!ARRAY_IS_ARRAY(sourceLedger.candidates)) {
    fail("CURRENT_PARENT_SCHEMA_INVALID", "current source candidates are missing");
  }
  for (let candidateIndex = 0; candidateIndex < sourceLedger.candidates.length; candidateIndex += 1) {
    const candidate = sourceLedger.candidates[candidateIndex];
    if (findTopic(candidate.bindingId)) {
      fail("PARALLEL_TOPIC_BINDING_FORBIDDEN", "an audit topic cannot become a parallel binding ID");
    }
    if (!ARRAY_IS_ARRAY(candidate.quoteCandidates)) continue;
    for (let quoteIndex = 0; quoteIndex < candidate.quoteCandidates.length; quoteIndex += 1) {
      const quote = candidate.quoteCandidates[quoteIndex];
      if (!ARRAY_IS_ARRAY(quote.conceptualTopics)) continue;
      for (let topicIndex = 0; topicIndex < quote.conceptualTopics.length; topicIndex += 1) {
        const topicId = quote.conceptualTopics[topicIndex];
        if (!findTopic(topicId)) continue;
        const expected = findExpectedRef(candidate.candidateId, quote.quoteCandidateId, topicId);
        if (!expected
          || candidate.bindingId !== expected.bindingId
          || candidate.evidenceSubjectId !== expected.evidenceSubjectId
          || candidate.candidateDigest !== expected.candidateDigest) {
          fail("CURRENT_QUOTE_MAP_DRIFT", "a first-three quote reference does not match the current parent");
        }
        const key = `${topicId}\u0000${quote.quoteCandidateId}`;
        if (REFLECT_APPLY(SET_HAS, seen, [key])) {
          fail("CURRENT_QUOTE_MAP_DRIFT", "a first-three quote reference is duplicated");
        }
        REFLECT_APPLY(SET_ADD, seen, [key]);
        observedRefs += 1;
      }
    }
  }
  if (observedRefs !== 4) {
    fail("CURRENT_QUOTE_MAP_DRIFT", "scope must remain exactly 3 topics, 2 bindings and 4 quote references");
  }
  return deepFreeze({ topics: 3, currentBindings: 2, quoteReferences: 4 });
}

function assertPinnedSnapshot(snapshot, expected, label) {
  if (!snapshot
    || snapshot.path !== expected.path
    || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("CURRENT_PARENT_RAW_DRIFT", `${label} raw identity has drifted`);
  }
}

function assertPinnedArtifactIdentity(artifact, expected, label) {
  if (!artifact
    || artifact.path !== expected.path
    || (artifact.rawBytes ?? artifact.bytes) !== expected.rawBytes
    || (artifact.rawSha256 ?? artifact.sha256) !== expected.rawSha256) {
    fail("CURRENT_PARENT_RAW_DRIFT", `${label} branded artifact identity has drifted`);
  }
}

function assertPointInTimeFalseBoundaries(value, label) {
  if (value.crossFileAtomicSnapshot !== false
    || value.mutationEpochAvailable !== false
    || value.mutationEpochReceipt !== null
    || value.intervalMutationExcludedAcrossFiles !== false
    || value.abaExcluded !== false) {
    fail("MUTATION_AUTHORITY_PROMOTION_FORBIDDEN", `${label} must retain point-in-time non-epoch boundaries`);
  }
}

function assertReleaseAuthorityFalse(value, label) {
  if (value.releaseReady !== false
    || value.publicDeploymentAuthorized !== false
    || value.expertClaimsAuthorized !== false) {
    fail("RELEASE_AUTHORITY_PROMOTION_FORBIDDEN", `${label} must retain false release authority`);
  }
}

async function readPinnedWorkspaceJson(workspaceRoot, expected, label) {
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
  } catch {
    fail("CURRENT_PARENT_READ_FAILED", `${label} could not be read as a stable workspace artifact`);
  }
  assertPinnedSnapshot(snapshot, expected, label);
  try {
    return {
      snapshot,
      value: passiveSnapshot(parseBaziDttStrictJsonArtifact(snapshot), label)
    };
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail("CURRENT_PARENT_JSON_INVALID", `${label} is not strict duplicate-free JSON`);
  }
}

async function loadCurrentParentBundle(workspaceRoot) {
  let supersession;
  let reconciliation;
  let readiness;
  try {
    supersession = await loadBaziDttVersionedParentSupersession(workspaceRoot);
    reconciliation = await loadBaziDttNoticeReconciliationV2(workspaceRoot);
    readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  } catch {
    fail("CURRENT_PARENT_BRAND_LOAD_FAILED", "current parent brands could not be established");
  }
  if (!isVerifiedBaziDttVersionedParentSupersession(supersession)
    || !isVerifiedBaziDttNoticeReconciliationV2(reconciliation)
    || !isVerifiedBaziBindingFreezeRequirementsV17(readiness)) {
    fail("CURRENT_PARENT_BRAND_REQUIRED", "all current parent WeakSet brands are required");
  }
  assertPinnedArtifactIdentity(supersession.artifacts.sourceBinding, CURRENT_SOURCE, "source 1.6");
  assertPinnedArtifactIdentity(supersession.artifacts.sourceRights, CURRENT_RIGHTS, "rights 1.2");
  assertPinnedArtifactIdentity(supersession.artifacts.receipt, CURRENT_SUPERSESSION, "supersession");
  assertPinnedArtifactIdentity(reconciliation.artifact, CURRENT_RECONCILIATION, "reconciliation v2");
  assertPinnedArtifactIdentity(readiness.artifact, CURRENT_READINESS, "readiness 1.7");
  if (supersession.supersessionId !== CURRENT_SUPERSESSION.supersessionId
    || supersession.supersessionDigest !== CURRENT_SUPERSESSION.supersessionDigest
    || supersession.sourceLedgerId !== CURRENT_SOURCE.ledgerId
    || supersession.sourceLedgerDigest !== CURRENT_SOURCE.ledgerDigest
    || supersession.rightsLedgerId !== CURRENT_RIGHTS.ledgerId
    || supersession.rightsLedgerDigest !== CURRENT_RIGHTS.ledgerDigest
    || reconciliation.reconciliationId !== CURRENT_RECONCILIATION.reconciliationId
    || reconciliation.reconciliationDigest !== CURRENT_RECONCILIATION.reconciliationDigest
    || readiness.ledgerId !== CURRENT_READINESS.ledgerId
    || readiness.ledgerDigest !== CURRENT_READINESS.ledgerDigest) {
    fail("CURRENT_PARENT_SEMANTIC_DRIFT", "current parent semantic identities have drifted");
  }
  assertPointInTimeFalseBoundaries(supersession, "supersession");
  assertPointInTimeFalseBoundaries(reconciliation, "reconciliation v2");
  assertPointInTimeFalseBoundaries(readiness, "readiness 1.7");
  assertReleaseAuthorityFalse(supersession, "supersession");
  assertReleaseAuthorityFalse(reconciliation, "reconciliation v2");
  assertReleaseAuthorityFalse(readiness, "readiness 1.7");
  if (supersession.bindingFrozenVerified !== 0
    || supersession.formalSourceRightsRecordCount !== 0
    || supersession.formalSourceCarrierRecordCount !== 0
    || reconciliation.bindingFrozenVerified !== 0
    || readiness.bindingFrozenVerified !== 0
    || readiness.bindingRequired !== 12
    || readiness.distributionPolicy !== "link_only"
    || readiness.activeAdmissionEffect !== "none"
    || readiness.formalAdmissionPromotionBlocked !== true) {
    fail("CURRENT_PARENT_AUTHORITY_PROMOTION_FORBIDDEN", "current parents must remain candidate-only 0-of-12");
  }
  const sourceRead = await readPinnedWorkspaceJson(workspaceRoot, CURRENT_SOURCE, "source 1.6");
  const rightsRead = await readPinnedWorkspaceJson(workspaceRoot, CURRENT_RIGHTS, "rights 1.2");
  const bundle = deepFreeze({
    supersession,
    reconciliation,
    readiness,
    source: sourceRead.value,
    rights: rightsRead.value
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_CURRENT_PARENT_BUNDLES, [bundle]);
  return bundle;
}

function assertReadinessCandidateBoundary(readiness, expectedRef) {
  if (!isOrdinaryRecord(readiness)
    || readiness.ledgerId !== CURRENT_READINESS.ledgerId
    || readiness.ledgerDigest !== CURRENT_READINESS.ledgerDigest
    || canonicalStringifyCurrentCandidate(readiness.releaseGovernance)
      !== canonicalStringifyCurrentCandidate(RELEASE_GOVERNANCE)
    || readiness.gateSummary?.bindingRequired !== 12
    || readiness.gateSummary?.bindingFrozenVerified !== 0
    || readiness.gateSummary?.sourceBodiesBound !== 0
    || readiness.gateSummary?.exactQuoteTextsFrozen !== 0
    || readiness.gateSummary?.releaseReady !== false
    || readiness.integrityBoundary?.crossFileAtomicSnapshot !== false
    || readiness.integrityBoundary?.mutationEpochAvailable !== false
    || readiness.integrityBoundary?.mutationEpochReceipt !== null
    || readiness.integrityBoundary?.intervalMutationExcludedAcrossFiles !== false
    || readiness.integrityBoundary?.abaExcluded !== false) {
    fail("CURRENT_READINESS_BOUNDARY_DRIFT", "readiness 1.7 must remain candidate-only and non-epoch");
  }
  const freeze = findExactlyOne(
    readiness.bindings,
    (entry) => entry.bindingId === expectedRef.bindingId,
    "current readiness binding"
  );
  if (freeze.evidenceSubjectId !== expectedRef.evidenceSubjectId
    || freeze.freezeState !== "candidate_only_unbound"
    || !exactArrayValues(freeze.candidateIds, [expectedRef.candidateId])
    || freeze.currentDistributionBoundary !== "link_only_no_redistribution_clearance"
    || freeze.sourceBodyStored !== false
    || freeze.sourceBodyDigest !== null
    || freeze.exactQuoteTextStored !== false
    || freeze.exactQuoteDigest !== null
    || freeze.exactLocatorEstablishedForFreeze !== false
    || freeze.sourceRightsRecordId !== null
    || freeze.sourceCarrierRecordId !== null
    || freeze.formalDistributionPolicy !== null
    || !exactArrayValues(freeze.independentSourceRightsReviewerIds, [])
    || !exactArrayValues(freeze.independentDomainReviewIds, [])
    || freeze.frozenAt !== null
    || freeze.bindingDigest !== null) {
    fail("CURRENT_READINESS_BINDING_PROMOTION_FORBIDDEN", "binding readiness is no longer an exact unfrozen candidate");
  }
  return freeze;
}

function collectFacsimileRefs(candidate, quoteCandidateId) {
  const anchorRefs = [];
  const collationRefs = [];
  if (!ARRAY_IS_ARRAY(candidate.facsimileAnchors)
    || !ARRAY_IS_ARRAY(candidate.facsimileCollationCandidates)) {
    fail("FACSIMILE_CANDIDATE_CHAIN_MISMATCH", "facsimile candidate provenance is missing");
  }
  for (let anchorIndex = 0; anchorIndex < candidate.facsimileAnchors.length; anchorIndex += 1) {
    const anchor = candidate.facsimileAnchors[anchorIndex];
    if (!ARRAY_IS_ARRAY(anchor.pageRefs)) continue;
    for (let pageIndex = 0; pageIndex < anchor.pageRefs.length; pageIndex += 1) {
      const pageRef = anchor.pageRefs[pageIndex];
      if (arrayContains(pageRef.quoteCandidateIds, quoteCandidateId)) {
        if (anchor.storagePolicy !== "link_only") {
          fail("FACSIMILE_AUTHORITY_PROMOTION_FORBIDDEN", "facsimile anchors must remain link-only");
        }
        appendValue(anchorRefs, {
          anchorId: anchor.anchorId,
          carrierSha256: anchor.carrierSha256,
          pageRefId: pageRef.pageRefId,
          storagePolicy: anchor.storagePolicy
        });
      }
    }
  }
  for (let index = 0; index < candidate.facsimileCollationCandidates.length; index += 1) {
    const entry = candidate.facsimileCollationCandidates[index];
    if (entry.quoteCandidateId !== quoteCandidateId) continue;
    if (entry.observerClass !== "automated_agent_nonexpert_visual_inspection"
      || entry.rightsEffect !== "none"
      || entry.bindingFreezeEffect !== "none"
      || !exactArrayValues(entry.humanCollatorAttestations, [])
      || !exactArrayValues(entry.domainExpertReviewIds, [])
      || entry.carrierTextStored !== false
      || entry.repositoryInspectionDerivativeStored !== false) {
      fail("FACSIMILE_AUTHORITY_PROMOTION_FORBIDDEN", "facsimile observations must remain nonexpert and effect-free");
    }
    appendValue(collationRefs, {
      collationCandidateId: entry.collationCandidateId,
      collationDigest: entry.collationDigest,
      result: entry.result,
      observerClass: entry.observerClass,
      rightsEffect: "none",
      bindingFreezeEffect: "none"
    });
  }
  if (anchorRefs.length === 0 || collationRefs.length === 0) {
    fail("FACSIMILE_CANDIDATE_CHAIN_MISMATCH", "quote lacks current nonexpert facsimile candidate provenance");
  }
  return deepFreeze({ anchorRefs, collationRefs });
}

function resolveCurrentQuoteContext(bundle, request) {
  if (!REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_CURRENT_PARENT_BUNDLES, [bundle])) {
    fail("CURRENT_PARENT_BUNDLE_BRAND_REQUIRED", "quote context requires the current parent bundle brand");
  }
  assertExactCurrentFirstThreeTopicMap(bundle.source);
  if (bundle.rights.ledgerId !== CURRENT_RIGHTS.ledgerId
    || bundle.rights.ledgerDigest !== CURRENT_RIGHTS.ledgerDigest
    || bundle.rights.sourceBindingLedger?.ledgerId !== CURRENT_SOURCE.ledgerId
    || bundle.rights.sourceBindingLedger?.ledgerDigest !== CURRENT_SOURCE.ledgerDigest) {
    fail("CURRENT_RIGHTS_IDENTITY_MISMATCH", "rights 1.2 is not paired to source 1.6");
  }
  const topic = findTopic(request.topicId);
  const expectedRef = findQuoteRef(topic, request.quoteCandidateId);
  const candidate = findExactlyOne(
    bundle.source.candidates,
    (entry) => entry.candidateId === expectedRef.candidateId,
    "current source candidate"
  );
  const quote = findExactlyOne(
    candidate.quoteCandidates,
    (entry) => entry.quoteCandidateId === expectedRef.quoteCandidateId,
    "current quote candidate"
  );
  const rights = findExactlyOne(
    bundle.rights.candidates,
    (entry) => entry.rightsCandidateId === expectedRef.rightsCandidateId,
    "current rights candidate"
  );
  const freeze = assertReadinessCandidateBoundary(bundle.readiness.readiness, expectedRef);
  if (candidate.candidateDigest !== expectedRef.candidateDigest
    || candidate.bindingId !== expectedRef.bindingId
    || candidate.evidenceSubjectId !== expectedRef.evidenceSubjectId
    || candidate.carrierIdentity?.storagePolicy !== "link_only"
    || candidate.carrierIdentity?.sourceBodyStored !== false
    || quote.quoteTextStored !== false
    || !arrayContains(quote.conceptualTopics, topic.topicId)
    || rights.candidateDigest !== expectedRef.rightsCandidateDigest
    || rights.sourceCandidateId !== expectedRef.candidateId
    || rights.bindingId !== expectedRef.bindingId
    || rights.sourceId !== candidate.sourceId) {
    fail("CURRENT_PARENT_CHAIN_MISMATCH", "source, rights, readiness, topic and quote do not form one exact current chain");
  }
  const decision = rights.decision;
  if (decision.knowledgeDocumentCreated !== false
    || decision.formalSourceRightsRecordCreated !== false
    || decision.formalSourceCarrierRecordCreated !== false
    || decision.workLayerCleared !== false
    || decision.editionLayerCleared !== false
    || decision.carrierLayerCleared !== false
    || !exactArrayValues(decision.reviewAttestations, [])
    || decision.distributionPolicy !== "link_only"
    || decision.legalConclusion !== "not_established"
    || decision.frozenAt !== null) {
    fail("CURRENT_RIGHTS_AUTHORITY_PROMOTION_FORBIDDEN", "rights candidate must remain link-only, uncleared and unreviewed");
  }
  if (!exactArrayValues(rights.workLayer?.legalReviewerIds, [])
    || !exactArrayValues(rights.transcriptionLayer?.rightsReviewerIds, [])) {
    fail("CURRENT_RIGHTS_AUTHORITY_PROMOTION_FORBIDDEN", "rights layer reviewers must remain absent");
  }
  for (let index = 0; index < rights.carrierLayers.length; index += 1) {
    if (!exactArrayValues(rights.carrierLayers[index].rightsReviewerIds, [])) {
      fail("CURRENT_RIGHTS_AUTHORITY_PROMOTION_FORBIDDEN", "carrier-layer reviewers must remain absent");
    }
  }
  if (expectedRef.parentMode === "paired_versioned_supersession") {
    if (candidate.reviewState?.supersedes !== expectedRef.historicalCandidateId
      || decision.supersedes !== expectedRef.historicalRightsCandidateId
      || bundle.readiness.readiness.dttNoticeReconciliationGate?.currentCandidateParentIdentities?.sourceBinding?.candidateId
        !== expectedRef.candidateId
      || bundle.readiness.readiness.dttNoticeReconciliationGate?.currentCandidateParentIdentities?.sourceRights?.candidateId
        !== expectedRef.rightsCandidateId
      || bundle.readiness.readiness.dttNoticeReconciliationGate?.candidateParentPairVersionedSupersessionReceiptComplete
        !== true) {
      fail("DTT_CURRENT_SUPERSESSION_MISMATCH", "DTT v2 source and rights must retain one paired supersession chain");
    }
  } else if (candidate.reviewState?.supersedes !== null
    || REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [decision, "supersedes"])) {
    fail("SMT_CURRENT_IDENTITY_DRIFT", "SMT current candidate must remain the unchanged v1 identity");
  }
  const facsimile = collectFacsimileRefs(candidate, quote.quoteCandidateId);
  const context = deepFreeze({
    topic,
    expectedRef,
    candidate,
    quote,
    rights,
    freeze,
    facsimile,
    parentArtifacts: {
      source: CURRENT_SOURCE,
      rights: CURRENT_RIGHTS,
      readiness: CURRENT_READINESS,
      reconciliation: CURRENT_RECONCILIATION,
      supersession: CURRENT_SUPERSESSION
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_CURRENT_QUOTE_CONTEXTS, [context]);
  return context;
}

function lineNumberAtOffset(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (REFLECT_APPLY(STRING_CHAR_CODE_AT, text, [index]) === 0x0a) line += 1;
  }
  return line;
}

function countOverlappingOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while (offset <= text.length - needle.length) {
    const found = REFLECT_APPLY(STRING_INDEX_OF, text, [needle, offset]);
    if (found < 0) break;
    count += 1;
    offset = found + 1;
  }
  return count;
}

export function verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(sourceBytes, carrierLockInput, quoteLockInput) {
  const decoded = decodeStrictUtf8(sourceBytes, "private source body", MAX_SOURCE_BODY_BYTES);
  const safeBytes = decoded.bytes;
  const text = decoded.text;
  const carrierLock = passiveSnapshot(carrierLockInput, "carrier lock");
  const quoteLock = passiveSnapshot(quoteLockInput, "quote lock");
  if (!isOrdinaryRecord(carrierLock) || !isOrdinaryRecord(quoteLock)) {
    fail("INVALID_MATERIAL_LOCK", "carrier and quote locks must be ordinary objects");
  }
  const bodyDigest = sha256Bytes(safeBytes);
  if (typeof carrierLock.rawWikitextSha256 !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, SHA256_PATTERN, [carrierLock.rawWikitextSha256])
    || bodyDigest !== carrierLock.rawWikitextSha256
    || safeBytes.byteLength !== carrierLock.rawWikitextUtf8Bytes
    || text.length !== carrierLock.rawWikitextCharacters) {
    fail("SOURCE_BODY_IDENTITY_MISMATCH", "private source bytes do not match the pinned revision identity");
  }
  const start = quoteLock.rawCharacterStartZeroBased;
  const end = quoteLock.rawCharacterEndExclusive;
  if (!NUMBER_IS_SAFE_INTEGER(start)
    || !NUMBER_IS_SAFE_INTEGER(end)
    || start < 0
    || end <= start
    || end > text.length) {
    fail("QUOTE_LOCATOR_MISMATCH", "quote UTF-16 range is invalid for the private source body");
  }
  const quoteText = REFLECT_APPLY(STRING_SLICE, text, [start, end]);
  const quoteBytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [quoteText, "utf8"]);
  const occurrenceCount = countOverlappingOccurrences(text, quoteText);
  if (occurrenceCount !== 1) {
    fail("QUOTE_NOT_UNIQUE", "quote uniqueness must include overlapping occurrences from start plus one");
  }
  const actual = {
    rawRevisionLineStart: lineNumberAtOffset(text, start),
    rawRevisionLineEnd: lineNumberAtOffset(text, end - 1),
    rawCharacterStartZeroBased: start,
    rawCharacterEndExclusive: end,
    quoteCharacters: quoteText.length,
    quoteUtf8Bytes: quoteBytes.byteLength,
    quoteSha256: sha256Bytes(quoteBytes),
    quoteOccurrenceInRawRevision: "unique"
  };
  const actualKeys = REFLECT_APPLY(OBJECT_KEYS, NATIVE_OBJECT, [actual]);
  for (let index = 0; index < actualKeys.length; index += 1) {
    const key = actualKeys[index];
    if (actual[key] !== quoteLock[key]) {
      fail("QUOTE_MATERIAL_MISMATCH", `${key} does not match the pinned quote candidate`);
    }
  }
  const integrity = deepFreeze({
    sourceBodySha256: bodyDigest,
    sourceBodyUtf8Bytes: safeBytes.byteLength,
    sourceBodyUtf16CodeUnits: text.length,
    rawRevisionLineStart: actual.rawRevisionLineStart,
    rawRevisionLineEnd: actual.rawRevisionLineEnd,
    rawCharacterStartZeroBased: start,
    rawCharacterEndExclusive: end,
    quoteUtf16CodeUnits: quoteText.length,
    quoteUtf8Bytes: quoteBytes.byteLength,
    quoteSha256: actual.quoteSha256,
    overlappingOccurrenceCount: occurrenceCount,
    sourceBodyStoredInResult: false,
    quoteTextStoredInResult: false
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_MATERIAL_INTEGRITY_RESULTS, [integrity]);
  return integrity;
}

function pathIsSameOrWithin(candidate, parent) {
  const relative = REFLECT_APPLY(PATH_RELATIVE, path, [parent, candidate]);
  return relative === ""
    || (relative !== ".."
      && !REFLECT_APPLY(STRING_STARTS_WITH, relative, [`..${PATH_SEPARATOR}`])
      && !REFLECT_APPLY(PATH_IS_ABSOLUTE, path, [relative]));
}

function normalizeResolvedPath(value) {
  const normalized = REFLECT_APPLY(PATH_NORMALIZE, path, [value]);
  return PROCESS_PLATFORM === "win32"
    ? REFLECT_APPLY(STRING_TO_LOWER_CASE, normalized, [])
    : normalized;
}

function isSameResolvedPath(left, right) {
  return normalizeResolvedPath(left) === normalizeResolvedPath(right);
}

function isSafeFailure(error) {
  if (!UTIL_IS_NATIVE_ERROR(error)) return false;
  const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, NATIVE_OBJECT, [error, "safeForCli"]);
  return descriptor !== undefined
    && REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [descriptor, "value"])
    && descriptor.value === true;
}

function assertDirectoryStat(directoryStat, label, failureCode) {
  if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, directoryStat, [])
    || !REFLECT_APPLY(STATS_IS_DIRECTORY, directoryStat, [])) {
    fail(failureCode, `${label} parent chain must contain ordinary directories only`);
  }
  const fields = ["dev", "ino", "nlink", "mtimeNs", "ctimeNs"];
  for (let index = 0; index < fields.length; index += 1) {
    if (typeof directoryStat[fields[index]] !== "bigint") {
      fail(failureCode, `${label} parent chain metadata cannot be verified`);
    }
  }
  if (directoryStat.ino <= 0n || directoryStat.nlink <= 0n) {
    fail(failureCode, `${label} parent chain identity cannot be verified`);
  }
}

function directoryEndpoint(absolutePath, resolvedPath, directoryStat) {
  return OBJECT_FREEZE({
    absolutePath,
    resolvedPath,
    dev: directoryStat.dev,
    ino: directoryStat.ino,
    nlink: directoryStat.nlink,
    mtimeNs: directoryStat.mtimeNs,
    ctimeNs: directoryStat.ctimeNs
  });
}

async function capturePrivateDirectoryChain(privateRoot, absolutePath, label, failureCode) {
  try {
    const root = REFLECT_APPLY(PATH_RESOLVE, path, [privateRoot]);
    const targetDirectory = REFLECT_APPLY(PATH_DIRNAME, path, [REFLECT_APPLY(PATH_RESOLVE, path, [absolutePath])]);
    if (!pathIsSameOrWithin(targetDirectory, root)) {
      fail("PRIVATE_PATH_ESCAPE", `${label} parent chain escapes privateRoot`);
    }
    const relative = REFLECT_APPLY(PATH_RELATIVE, path, [root, targetDirectory]);
    const segments = relative === "" ? [] : REFLECT_APPLY(STRING_SPLIT, relative, [PATH_SEPARATOR]);
    const endpoints = [];
    let cursor = root;
    for (let index = -1; index < segments.length; index += 1) {
      if (index >= 0) cursor = REFLECT_APPLY(PATH_JOIN, path, [cursor, segments[index]]);
      const directoryStat = await FS_LSTAT(cursor, { bigint: true });
      assertDirectoryStat(directoryStat, label, failureCode);
      const resolvedPath = await FS_REALPATH(cursor);
      if (endpoints.length === 0) {
        if (!isSameResolvedPath(resolvedPath, root)) {
          fail(failureCode, `${label} privateRoot identity changed`);
        }
      } else if (!pathIsSameOrWithin(resolvedPath, endpoints[0].resolvedPath)) {
        fail("PRIVATE_PATH_ESCAPE", `${label} parent chain resolves outside privateRoot`);
      }
      appendValue(endpoints, directoryEndpoint(cursor, resolvedPath, directoryStat));
    }
    return OBJECT_FREEZE(endpoints);
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail(failureCode, `${label} parent chain could not be verified safely`);
  }
}

function sameDirectoryChain(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const entry = left[index];
    const other = right[index];
    if (!other
      || !isSameResolvedPath(entry.absolutePath, other.absolutePath)
      || !isSameResolvedPath(entry.resolvedPath, other.resolvedPath)
      || entry.dev !== other.dev
      || entry.ino !== other.ino
      || entry.nlink !== other.nlink
      || entry.mtimeNs !== other.mtimeNs
      || entry.ctimeNs !== other.ctimeNs) return false;
  }
  return true;
}

function sameFileIdentity(left, right) {
  return REFLECT_APPLY(STATS_IS_FILE, left, [])
    && REFLECT_APPLY(STATS_IS_FILE, right, [])
    && typeof left.dev === "bigint"
    && typeof left.ino === "bigint"
    && left.ino > 0n
    && left.dev === right.dev
    && left.ino === right.ino;
}

function sameStableFileMetadata(left, right) {
  return sameFileIdentity(left, right)
    && left.size === right.size
    && left.nlink === right.nlink
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function assertPrivateFileStat(fileStat, maxBytes, label) {
  if (!REFLECT_APPLY(STATS_IS_FILE, fileStat, [])) {
    fail("PRIVATE_FILE_NOT_REGULAR", `${label} must be a regular non-symlink file`);
  }
  if (fileStat.nlink !== 1n) {
    fail("PRIVATE_FILE_ALIAS_FORBIDDEN", `${label} must not be a hard-linked alias`);
  }
  if (fileStat.size <= 0n || fileStat.size > REFLECT_APPLY(BIGINT_FROM, null, [maxBytes])) {
    fail("PRIVATE_FILE_SIZE_INVALID", `${label} is outside its byte ceiling`);
  }
}

async function readBoundedHandle(handle, maxBytes, label) {
  const buffer = REFLECT_APPLY(BUFFER_ALLOC_UNSAFE, NATIVE_BUFFER, [maxBytes + 1]);
  const capacity = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, buffer, []);
  let total = 0;
  while (total < capacity) {
    const result = await REFLECT_APPLY(FILE_HANDLE_READ, handle, [buffer, total, capacity - total, total]);
    const bytesRead = ownDataValue(result, "bytesRead", "file read result");
    if (!NUMBER_IS_INTEGER(bytesRead) || bytesRead < 0) {
      fail("PRIVATE_FILE_READ_FAILED", `${label} returned an invalid read count`);
    }
    if (bytesRead === 0) break;
    total += bytesRead;
  }
  if (total <= 0 || total > maxBytes) {
    fail("PRIVATE_FILE_SIZE_INVALID", `${label} is outside its byte ceiling`);
  }
  const backing = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, buffer, []);
  const byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, buffer, []);
  const view = new NATIVE_UINT8_ARRAY(backing, byteOffset, total);
  return REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [view]);
}

async function callTestHook(testHooks, phase, payload) {
  if (!testHooks || !REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [testHooks, phase])) return;
  const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, NATIVE_OBJECT, [testHooks, phase]);
  if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [descriptor, "value"])
    || typeof descriptor.value !== "function") {
    fail("TEST_HOOK_INVALID", "test hook must be an own data function");
  }
  await descriptor.value(payload);
}

async function resolvePrivateRoot(workspaceRoot, privateRoot) {
  if (typeof workspaceRoot !== "string"
    || !REFLECT_APPLY(PATH_IS_ABSOLUTE, path, [workspaceRoot])) {
    fail("INVALID_WORKSPACE_ROOT", "workspaceRoot must be an explicit absolute path");
  }
  if (typeof privateRoot !== "string"
    || !REFLECT_APPLY(PATH_IS_ABSOLUTE, path, [privateRoot])) {
    fail("INVALID_PRIVATE_ROOT", "privateRoot must be an explicit absolute path");
  }
  if (PROCESS_PLATFORM === "win32"
    && (!REFLECT_APPLY(REGEXP_TEST, WINDOWS_DRIVE_ABSOLUTE_PATTERN, [privateRoot])
      || REFLECT_APPLY(STRING_STARTS_WITH, privateRoot, ["\\\\"]))) {
    fail("INVALID_PRIVATE_ROOT", "privateRoot must use a local drive path, not UNC or device syntax");
  }
  try {
    const workspaceReal = await FS_REALPATH(workspaceRoot);
    const privateReal = await FS_REALPATH(privateRoot);
    const privateLink = await FS_LSTAT(privateReal, { bigint: true });
    const privateStat = await FS_STAT(privateReal, { bigint: true });
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, privateLink, [])
      || !REFLECT_APPLY(STATS_IS_DIRECTORY, privateLink, [])
      || !REFLECT_APPLY(STATS_IS_DIRECTORY, privateStat, [])) {
      fail("INVALID_PRIVATE_ROOT", "privateRoot must resolve to one ordinary directory");
    }
    if (pathIsSameOrWithin(privateReal, workspaceReal)
      || pathIsSameOrWithin(workspaceReal, privateReal)) {
      fail("PRIVATE_ROOT_OVERLAPS_WORKSPACE", "privateRoot must be outside and must not contain the workspace");
    }
    return privateReal;
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail("PRIVATE_ROOT_RESOLUTION_FAILED", "privateRoot could not be resolved safely");
  }
}

async function readStablePrivateFile(privateRoot, relativePath, maxBytes, label, testHooks = undefined) {
  validatePrivateRelativePath(relativePath, label);
  const segments = REFLECT_APPLY(STRING_SPLIT, relativePath, ["/"]);
  const resolveArgs = [privateRoot];
  for (let index = 0; index < segments.length; index += 1) appendValue(resolveArgs, segments[index]);
  const unresolved = REFLECT_APPLY(PATH_RESOLVE, path, resolveArgs);
  if (!pathIsSameOrWithin(unresolved, privateRoot)) {
    fail("PRIVATE_PATH_ESCAPE", `${label} escapes privateRoot`);
  }
  let handle = null;
  let handleClose = null;
  try {
    const directoryChainBeforeOpen = await capturePrivateDirectoryChain(
      privateRoot,
      unresolved,
      label,
      "PRIVATE_DIRECTORY_CHAIN_NOT_REGULAR"
    );
    await callTestHook(testHooks, "afterDirectoryChainBeforeOpen", OBJECT_FREEZE({ label }));
    const beforeLink = await FS_LSTAT(unresolved, { bigint: true });
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, beforeLink, [])) {
      fail("PRIVATE_FILE_NOT_REGULAR", `${label} must be a regular non-symlink file`);
    }
    assertPrivateFileStat(beforeLink, maxBytes, label);
    const resolvedBeforeOpen = await FS_REALPATH(unresolved);
    if (!pathIsSameOrWithin(resolvedBeforeOpen, privateRoot)) {
      fail("PRIVATE_PATH_ESCAPE", `${label} resolves outside privateRoot`);
    }
    const pathStatBeforeOpen = await FS_STAT(resolvedBeforeOpen, { bigint: true });
    assertPrivateFileStat(pathStatBeforeOpen, maxBytes, label);
    if (!sameFileIdentity(beforeLink, pathStatBeforeOpen)) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }
    try {
      handle = await FS_OPEN(unresolved, OPEN_READ_ONLY | OPEN_NO_FOLLOW);
    } catch (error) {
      if (OPEN_NO_FOLLOW === 0 || (error?.code !== "EINVAL" && error?.code !== "ENOTSUP")) throw error;
      handle = await FS_OPEN(unresolved, OPEN_READ_ONLY);
    }
    handleClose = ownDataValue(handle, "close", "private file handle");
    if (typeof handleClose !== "function") {
      fail("PRIVATE_FILE_READ_FAILED", `${label} close capability is unavailable`);
    }
    const handleStatBeforeRead = await REFLECT_APPLY(FILE_HANDLE_STAT, handle, [{ bigint: true }]);
    assertPrivateFileStat(handleStatBeforeRead, maxBytes, label);
    if (!sameFileIdentity(pathStatBeforeOpen, handleStatBeforeRead)) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }
    await callTestHook(testHooks, "afterOpenBeforeRead", OBJECT_FREEZE({ label, handle }));
    const directoryChainAfterOpen = await capturePrivateDirectoryChain(
      privateRoot,
      unresolved,
      label,
      "PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_OPEN"
    );
    if (!sameDirectoryChain(directoryChainBeforeOpen, directoryChainAfterOpen)) {
      fail("PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_OPEN", `${label} parent chain changed during open`);
    }
    const linkAfterOpen = await FS_LSTAT(unresolved, { bigint: true });
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, linkAfterOpen, [])) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }
    assertPrivateFileStat(linkAfterOpen, maxBytes, label);
    const resolvedAfterOpen = await FS_REALPATH(unresolved);
    const pathStatAfterOpen = await FS_STAT(resolvedAfterOpen, { bigint: true });
    if (!pathIsSameOrWithin(resolvedAfterOpen, privateRoot)
      || !isSameResolvedPath(resolvedBeforeOpen, resolvedAfterOpen)
      || !sameFileIdentity(handleStatBeforeRead, linkAfterOpen)
      || !sameFileIdentity(handleStatBeforeRead, pathStatAfterOpen)) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }
    const bytes = await readBoundedHandle(handle, maxBytes, label);
    await callTestHook(testHooks, "afterBytesRead", OBJECT_FREEZE({ label, handle }));
    const handleStatAfterRead = await REFLECT_APPLY(FILE_HANDLE_STAT, handle, [{ bigint: true }]);
    if (!sameStableFileMetadata(handleStatBeforeRead, handleStatAfterRead)
      || REFLECT_APPLY(BIGINT_FROM, null, [bytes.byteLength]) !== handleStatAfterRead.size) {
      fail("PRIVATE_FILE_CHANGED_DURING_READ", `${label} changed while it was being read`);
    }
    const directoryChainAfterRead = await capturePrivateDirectoryChain(
      privateRoot,
      unresolved,
      label,
      "PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_READ"
    );
    if (!sameDirectoryChain(directoryChainBeforeOpen, directoryChainAfterRead)) {
      fail("PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_READ", `${label} parent chain changed during read`);
    }
    const linkAfterRead = await FS_LSTAT(unresolved, { bigint: true });
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, linkAfterRead, [])) {
      fail("PRIVATE_FILE_CHANGED_DURING_READ", `${label} changed while it was being read`);
    }
    assertPrivateFileStat(linkAfterRead, maxBytes, label);
    const resolvedAfterRead = await FS_REALPATH(unresolved);
    const pathStatAfterRead = await FS_STAT(resolvedAfterRead, { bigint: true });
    if (!pathIsSameOrWithin(resolvedAfterRead, privateRoot)
      || !isSameResolvedPath(resolvedBeforeOpen, resolvedAfterRead)
      || !sameFileIdentity(handleStatAfterRead, linkAfterRead)
      || !sameFileIdentity(handleStatAfterRead, pathStatAfterRead)) {
      fail("PRIVATE_FILE_CHANGED_DURING_READ", `${label} changed while it was being read`);
    }
    await REFLECT_APPLY(handleClose, handle, []);
    handle = null;
    handleClose = null;
    return bytes;
  } catch (error) {
    if (handle !== null && typeof handleClose === "function") {
      try {
        await REFLECT_APPLY(handleClose, handle, []);
      } catch {
        // The primary fail-closed result takes precedence over a close failure.
      }
    }
    if (isSafeFailure(error)) throw error;
    fail("PRIVATE_FILE_READ_FAILED", `${label} could not be read safely`);
  }
}

function validateInternalCompletionTime(value) {
  if (typeof value !== "string" || !REFLECT_APPLY(REGEXP_TEST, UTC_PATTERN, [value])) {
    fail("INVALID_VERIFICATION_TIME", "internal completion time must be canonical ISO-8601 UTC milliseconds");
  }
  const milliseconds = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [value]);
  if (!NUMBER_IS_FINITE(milliseconds)) {
    fail("INVALID_VERIFICATION_TIME", "internal completion time must be canonical ISO-8601 UTC milliseconds");
  }
  const normalized = REFLECT_APPLY(DATE_TO_ISO_STRING, new NATIVE_DATE(milliseconds), []);
  if (normalized !== value) {
    fail("INVALID_VERIFICATION_TIME", "internal completion time must be canonical ISO-8601 UTC milliseconds");
  }
  return value;
}

function currentUtcTimestamp() {
  return REFLECT_APPLY(DATE_TO_ISO_STRING, new NATIVE_DATE(), []);
}

function bindingModelReviewState(mappingState) {
  if (mappingState === "mapped_to_existing_bindings_as_research_candidates") {
    return "research_candidate_mapping_only_no_binding_freeze";
  }
  if (mappingState === "candidate_quote_located_no_dedicated_current_binding") {
    return "pending_domain_model_review_no_parallel_binding";
  }
  fail("UNSUPPORTED_TOPIC_MAPPING_STATE", "current topic mapping state is unsupported");
}

function assertIntegrityMatchesContext(context, integrity) {
  if (integrity.sourceBodySha256 !== context.candidate.carrierIdentity.rawWikitextSha256
    || integrity.sourceBodyUtf8Bytes !== context.candidate.carrierIdentity.rawWikitextUtf8Bytes
    || integrity.sourceBodyUtf16CodeUnits !== context.candidate.carrierIdentity.rawWikitextCharacters
    || integrity.rawRevisionLineStart !== context.quote.rawRevisionLineStart
    || integrity.rawRevisionLineEnd !== context.quote.rawRevisionLineEnd
    || integrity.rawCharacterStartZeroBased !== context.quote.rawCharacterStartZeroBased
    || integrity.rawCharacterEndExclusive !== context.quote.rawCharacterEndExclusive
    || integrity.quoteUtf16CodeUnits !== context.quote.quoteCharacters
    || integrity.quoteUtf8Bytes !== context.quote.quoteUtf8Bytes
    || integrity.quoteSha256 !== context.quote.quoteSha256
    || integrity.overlappingOccurrenceCount !== 1
    || integrity.sourceBodyStoredInResult !== false
    || integrity.quoteTextStoredInResult !== false) {
    fail("INTEGRITY_CONTEXT_MISMATCH", "material integrity result is not the selected current quote lock");
  }
}

function buildSanitizedCandidateReceipt(context, integrityInput, completionTime) {
  if (!REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_CURRENT_QUOTE_CONTEXTS, [context])) {
    fail("CURRENT_QUOTE_CONTEXT_BRAND_REQUIRED", "receipt construction requires the current quote context brand");
  }
  if (!REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_MATERIAL_INTEGRITY_RESULTS, [integrityInput])) {
    fail("MATERIAL_INTEGRITY_BRAND_REQUIRED", "receipt construction requires the private material integrity brand");
  }
  const integrity = passiveSnapshot(integrityInput, "quote integrity result");
  assertIntegrityMatchesContext(context, integrity);
  const receiptIdentityDigest = sha256Text(
    `${context.candidate.candidateId}\u0000${context.quote.quoteCandidateId}\u0000${completionTime}`
  );
  const noticeDependency = context.rights.workLayer?.noticeDependencyBoundary;
  const unsigned = {
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_VERSION_AWARE_RECEIPT_SCHEMA_VERSION,
    recordType: "bazi_private_exact_quote_version_aware_candidate_integrity_receipt",
    receiptId: `hakimi.bazi.private-exact-quote-current-candidate/${receiptIdentityDigest}`,
    verificationCompletedAt: completionTime,
    observationTimeSource: "process_wall_clock_unattested",
    observationTimeCallerSupplied: false,
    observationTimeAuthorityEstablished: false,
    classification: "private_material_integrity_verified",
    verificationScope: "current_line_point_in_time_private_material_integrity_only",
    parentSelectionMode: "current_candidate_not_formal_admission",
    activeAdmissionEffect: "none",
    historicalReceiptAutoRelabeled: false,
    releaseGovernance: RELEASE_GOVERNANCE,
    currentParentArtifacts: context.parentArtifacts,
    currentCandidateChain: {
      sourceLedgerId: CURRENT_SOURCE.ledgerId,
      sourceLedgerDigest: CURRENT_SOURCE.ledgerDigest,
      rightsLedgerId: CURRENT_RIGHTS.ledgerId,
      rightsLedgerDigest: CURRENT_RIGHTS.ledgerDigest,
      candidateId: context.candidate.candidateId,
      candidateDigest: context.candidate.candidateDigest,
      sourceId: context.candidate.sourceId,
      rightsCandidateId: context.rights.rightsCandidateId,
      rightsCandidateDigest: context.rights.candidateDigest,
      parentMode: context.expectedRef.parentMode,
      historicalCandidateId: context.expectedRef.historicalCandidateId,
      historicalRightsCandidateId: context.expectedRef.historicalRightsCandidateId,
      revisionId: context.candidate.carrierIdentity.revisionId,
      sourceBodySha256: integrity.sourceBodySha256,
      sourceBodyUtf8Bytes: integrity.sourceBodyUtf8Bytes,
      sourceBodyUtf16CodeUnits: integrity.sourceBodyUtf16CodeUnits
    },
    topicScope: {
      topicId: context.topic.topicId,
      topicIsCurrentBindingId: false,
      mappingState: context.topic.mappingState,
      topicMappingAuthority: "research_candidate_only",
      sourceCandidateBindingId: context.candidate.bindingId,
      evidenceSubjectId: context.candidate.evidenceSubjectId,
      bindingModelReviewState: bindingModelReviewState(context.topic.mappingState),
      parallelBindingCreated: false
    },
    quoteIntegrity: {
      quoteCandidateId: context.quote.quoteCandidateId,
      rawRevisionLineStart: integrity.rawRevisionLineStart,
      rawRevisionLineEnd: integrity.rawRevisionLineEnd,
      rawCharacterStartZeroBased: integrity.rawCharacterStartZeroBased,
      rawCharacterEndExclusive: integrity.rawCharacterEndExclusive,
      quoteUtf16CodeUnits: integrity.quoteUtf16CodeUnits,
      quoteUtf8Bytes: integrity.quoteUtf8Bytes,
      quoteSha256: integrity.quoteSha256,
      overlappingOccurrenceCount: integrity.overlappingOccurrenceCount,
      uniqueIncludingOverlapsVerified: true
    },
    facsimileCandidateProvenance: {
      anchorRefs: context.facsimile.anchorRefs,
      collationRefs: context.facsimile.collationRefs,
      independentHumanCollationsVerified: 0,
      effectOnEditionIdentity: "none",
      effectOnRights: "none",
      effectOnBindingFreeze: "none"
    },
    dttNoticeCandidateBoundary: noticeDependency
      ? {
          oldidMainSlotPdOldLiteralObserved: noticeDependency.oldidMainSlotPdOldLiteralObserved,
          renderedPagePdOldDependencyObserved: noticeDependency.renderedPagePdOldDependencyObserved,
          dependencyRevisionsPinnedAtCapture: noticeDependency.dependencyRevisionsPinnedAtCapture,
          oldidAlonePinsRenderedNotice: noticeDependency.oldidAlonePinsRenderedNotice,
          applicabilityEstablished: false,
          legalConclusion: "not_established",
          reconciliationId: CURRENT_RECONCILIATION.reconciliationId,
          reconciliationDigest: CURRENT_RECONCILIATION.reconciliationDigest,
          activeAdmissionEffect: "none"
        }
      : null,
    rightsLayerBoundary: {
      workLayerState: context.rights.workLayer.status,
      editionLayerState: "not_separately_evidenced_not_cleared",
      transcriptionLayerState: context.rights.transcriptionLayer.status,
      carrierLayerStates: (() => {
        const states = [];
        for (let index = 0; index < context.rights.carrierLayers.length; index += 1) {
          appendValue(states, context.rights.carrierLayers[index].status);
        }
        return states;
      })(),
      currentCandidateDistributionBoundary: "link_only_no_redistribution_clearance",
      formalSourceRightsRecordId: null,
      formalSourceCarrierRecordId: null,
      independentSourceRightsReviewerIds: [],
      legalConclusion: "not_established",
      publicDomainEstablished: false,
      redistributionLicenseEstablished: false,
      attributionObligationsSatisfied: false,
      materialRedistributionDecision: "not_established",
      quotePublicationDecision: "not_established"
    },
    redactionBoundary: {
      requestIdStoredInReceipt: false,
      requestCorrelationDigestStoredInReceipt: false,
      privateRootStoredInReceipt: false,
      requestPathStoredInReceipt: false,
      sourceBodyPathStoredInReceipt: false,
      sourceBodyStoredInReceipt: false,
      quoteTextStoredInReceipt: false,
      carrierBytesStoredInReceipt: false,
      pageImagesStoredInReceipt: false,
      ocrTextStoredInReceipt: false,
      personDataPresenceAssessed: false,
      personDerivedDigestExcluded: false,
      safeToPublish: false
    },
    integrityBoundary: {
      stableHeldHandleSingleFileReadsUsed: true,
      requestAndSourceSameDeclaredRelativePathRejected: true,
      currentSupersessionWeakSetBrandVerified: true,
      currentReconciliationWeakSetBrandVerified: true,
      currentReadinessWeakSetBrandVerified: true,
      currentRawPinsVerifiedPointInTime: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      materialFreshnessEstablished: false,
      receiptDigestIsDigitalSignature: false
    },
    gateSummary: {
      privateMaterialIntegrityVerified: true,
      formalSourceRightsRecordCount: 0,
      formalSourceCarrierRecordCount: 0,
      knowledgeDocumentCreatedForCandidate: false,
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      lawfulMaterialAccessEstablished: false,
      workIdentityEstablished: false,
      editionIdentityEstablished: false,
      carrierIdentityEstablishedForFreeze: false,
      minimalSufficiencyHumanReviewed: false,
      independentHumanCollationVerified: false,
      independentSourceRightsReviewsVerified: 0,
      independentDomainReviewsVerified: 0,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: DOES_NOT_ESTABLISH
  };
  const safeUnsigned = passiveSnapshot(unsigned, "candidate receipt");
  const receiptDigest = sha256Text(canonicalStringifyCurrentCandidate(safeUnsigned));
  OBJECT_DEFINE_PROPERTY(safeUnsigned, "receiptDigest", {
    value: receiptDigest,
    enumerable: true,
    configurable: false,
    writable: false
  });
  return deepFreeze(safeUnsigned);
}

async function revalidateCurrentRawPins(workspaceRoot) {
  const expectedArtifacts = [
    CURRENT_SOURCE,
    CURRENT_RIGHTS,
    CURRENT_READINESS,
    CURRENT_RECONCILIATION,
    CURRENT_SUPERSESSION
  ];
  for (let index = 0; index < expectedArtifacts.length; index += 1) {
    const expected = expectedArtifacts[index];
    let snapshot;
    try {
      snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    } catch {
      fail("CURRENT_PARENT_REVALIDATION_FAILED", "current parent raw pin could not be re-read safely");
    }
    assertPinnedSnapshot(snapshot, expected, "current parent revalidation");
  }
}

function snapshotFileApiOptions(input) {
  const options = passiveSnapshot(input, "file verification options");
  if (!isOrdinaryRecord(options)) {
    fail("INVALID_FILE_API_OPTIONS", "file verification options must be an ordinary object");
  }
  const keys = REFLECT_APPLY(OBJECT_KEYS, NATIVE_OBJECT, [options]);
  if (keys.length !== FILE_API_REQUIRED_KEYS.length) {
    fail("INVALID_FILE_API_OPTIONS", "file verification options have an unsupported shape");
  }
  for (let index = 0; index < FILE_API_REQUIRED_KEYS.length; index += 1) {
    if (!REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [options, FILE_API_REQUIRED_KEYS[index]])) {
      fail("INVALID_FILE_API_OPTIONS", "file verification options have an unsupported shape");
    }
  }
  return options;
}

export async function verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles(input) {
  const options = snapshotFileApiOptions(input);
  const privateReal = await resolvePrivateRoot(options.workspaceRoot, options.privateRoot);
  validatePrivateRelativePath(options.requestRelativePath, "requestRelativePath");
  const requestBytes = await readStablePrivateFile(
    privateReal,
    options.requestRelativePath,
    MAX_REQUEST_BYTES,
    "requestRelativePath"
  );
  const request = parsePrivateExactQuoteVersionAwareCandidateRequestBytes(requestBytes);
  if (sameDeclaredPrivateRelativePath(request.sourceBodyRelativePath, options.requestRelativePath)) {
    fail("PRIVATE_REQUEST_BODY_ALIAS_FORBIDDEN", "request and source body must use distinct private files");
  }
  const bundle = await loadCurrentParentBundle(options.workspaceRoot);
  const context = resolveCurrentQuoteContext(bundle, request);
  const sourceBytes = await readStablePrivateFile(
    privateReal,
    request.sourceBodyRelativePath,
    MAX_SOURCE_BODY_BYTES,
    "request.sourceBodyRelativePath"
  );
  const integrity = verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(
    sourceBytes,
    context.candidate.carrierIdentity,
    context.quote
  );
  // This second point-in-time read catches ordinary end-state drift. It is not
  // an epoch receipt and cannot exclude an ABA interval; the receipt says so.
  await revalidateCurrentRawPins(options.workspaceRoot);
  const verificationCompletedAt = validateInternalCompletionTime(currentUtcTimestamp());
  const receipt = buildSanitizedCandidateReceipt(context, integrity, verificationCompletedAt);
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RECEIPTS, [receipt]);
  return receipt;
}

export function isVerifiedBaziPrivateExactQuoteVersionAwareCandidateReceipt(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RECEIPTS, [value]);
}

export function safeBaziPrivateExactQuoteVersionAwareCandidateCliMessage(error) {
  if (!UTIL_IS_NATIVE_ERROR(error)) return null;
  const safeDescriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, NATIVE_OBJECT, [error, "safeForCli"]);
  const codeDescriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, NATIVE_OBJECT, [error, "code"]);
  if (!safeDescriptor
    || !codeDescriptor
    || !REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [safeDescriptor, "value"])
    || !REFLECT_APPLY(OBJECT_HAS_OWN, NATIVE_OBJECT, [codeDescriptor, "value"])
    || safeDescriptor.value !== true
    || typeof codeDescriptor.value !== "string") return null;
  return `${codeDescriptor.value}: verification failed closed`;
}

export const baziPrivateExactQuoteVersionAwareCandidateTestOnly = deepFreeze({
  CURRENT_SOURCE,
  CURRENT_RIGHTS,
  CURRENT_READINESS,
  CURRENT_RECONCILIATION,
  CURRENT_SUPERSESSION,
  RELEASE_GOVERNANCE,
  DOES_NOT_ESTABLISH,
  MAX_REQUEST_BYTES,
  MAX_SOURCE_BODY_BYTES,
  loadCurrentParentBundle,
  resolveCurrentQuoteContext,
  readStablePrivateFile,
  resolvePrivateRoot,
  revalidateCurrentRawPins,
  currentUtcTimestamp,
  stringifyForTest: JSON_STRINGIFY,
  cwdForTest: PROCESS_CWD
});
