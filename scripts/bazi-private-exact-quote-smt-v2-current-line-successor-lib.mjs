import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  isVerifiedBaziBindingCitationLocatorLinkRequirements,
  loadBaziBindingCitationLocatorLinkRequirements
} from "./bazi-binding-citation-locator-link-requirements-lib.mjs";

const CREATE_HASH = createHash;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const BUFFER_FROM = Buffer.from;
const BUFFER_ALLOC_UNSAFE_SLOW = Buffer.allocUnsafeSlow;
const BUFFER_IS_BUFFER = Buffer.isBuffer;
const BUFFER_PROTOTYPE = Buffer.prototype;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const ARRAY_BUFFER_PROTOTYPE = ArrayBuffer.prototype;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer").get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength").get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset").get;
const TYPED_ARRAY_SET = TYPED_ARRAY_PROTOTYPE.set;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_DELETE_PROPERTY = Reflect.deleteProperty;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const STRING_INDEX_OF = String.prototype.indexOf;
const STRING_SLICE = String.prototype.slice;
const STRING_SPLIT = String.prototype.split;
const STRING_STARTS_WITH = String.prototype.startsWith;
const STRING_CHAR_CODE_AT = String.prototype.charCodeAt;
const REGEXP_EXEC = RegExp.prototype.exec;
const REGEXP_TEST = RegExp.prototype.test;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_SET = Set;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const UTIL_IS_PROXY = utilTypes.isProxy;
const UTIL_IS_NATIVE_ERROR = utilTypes.isNativeError;
const PROCESS_CWD = process.cwd;
const PATH_RESOLVE = path.resolve;
const PATH_JOIN = path.join;
const PATH_RELATIVE = path.relative;
const PATH_IS_ABSOLUTE = path.isAbsolute;
const FS_LSTAT = lstat;
const FS_OPEN = open;
const FS_READ_FILE = readFile;
const FS_REALPATH = realpath;
const FS_MODE_TYPE_MASK = fsConstants.S_IFMT;
const FS_MODE_DIRECTORY = fsConstants.S_IFDIR;
const FS_MODE_REGULAR_FILE = fsConstants.S_IFREG;
const FS_READ_ONLY_NO_FOLLOW = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const NUMBER_PATTERN = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/uy;
const UNICODE_ESCAPE_PATTERN = /^[a-fA-F0-9]{4}$/u;
const REQUEST_ID_PATTERN = /^req-[a-f0-9]{32}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const VERIFIED_CAPABILITIES = new NATIVE_WEAK_SET();
const VERIFIED_RECEIPTS = new NATIVE_WEAK_SET();

export const BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_CURRENT_LINE_SUCCESSOR_VERSION = "1.0.0";
export const BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_REQUEST_SCHEMA_VERSION = "1.0.0";
export const BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_RECEIPT_SCHEMA_VERSION = "1.0.0";

const CURRENT_PARENT = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-citation-locator-link-requirements.v1.0.0.json",
  rawBytes: 28463,
  rawSha256: "4316c708a6d5a2a65c8574208ec6e44d182c5886e4559e87ed2a3c0a6963368b",
  ledgerId: "hakimi.bazi.binding-citation-locator-link-requirements/1.0.0",
  ledgerDigest: "2fdc1fcafcb28795823b3cac92db707e88df6325c197f08cb6a59a96fa3f9dc4"
});

const HISTORICAL_PINS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "current_source_candidate_ledger_raw_self_observation",
    path: "content/bazi-strength-source-binding-candidates.v1.7.0.json",
    rawBytes: 58579,
    rawSha256: "03bc334a507e224d8658cd2af5fe5d5a11e1db0553fa7e54bf1287010147ccd2",
    idField: "ledgerId",
    semanticId: "hakimi.bazi.strength.source-binding-candidates/1.7.0",
    selfField: "ledgerDigest",
    semanticDigest: "e705ef32eb2dc0d6651f314a6020b71c18070ba5b6702c6965b628d01f1ef5d9",
    digestProfile: "source_ledger_without_candidate_digests"
  }),
  OBJECT_FREEZE({
    role: "current_rights_candidate_ledger_raw_self_observation",
    path: "content/bazi-strength-source-rights-candidates.v1.3.0.json",
    rawBytes: 25852,
    rawSha256: "8b26eea65e9ee3e7876298c3f720c46c43d5ec7d444ad4a4252116fc1dc21f17",
    idField: "ledgerId",
    semanticId: "hakimi.bazi.strength.source-rights-candidates/1.3.0",
    selfField: "ledgerDigest",
    semanticDigest: "4b1183a85f1d2aeee537544a6b3711510406d98856a921730879c8a9ca782db1",
    digestProfile: "plain_without_self"
  }),
  OBJECT_FREEZE({
    role: "smt_v2_supersession_receipt_raw_self_historical_observation",
    path: "content/system-admission/bazi-smt-v10-versioned-parent-supersession.v1.json",
    rawBytes: 12256,
    rawSha256: "e44740e013b4182a2a2aa4125ceda67cbf3c071c5f36db54fcdd35b7b17217b5",
    idField: "supersessionId",
    semanticId: "hakimi.bazi.smt-v10-versioned-parent-supersession/1.0.0",
    selfField: "supersessionDigest",
    semanticDigest: "a30313260723bfa24eff2704cb0d1f108b6b6fdfbf5e67639b4285745159e6bd",
    digestProfile: "plain_without_self"
  }),
  OBJECT_FREEZE({
    role: "carrier_readiness_stale_loader_raw_self_historical_observation",
    path: "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json",
    rawBytes: 18654,
    rawSha256: "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377",
    idField: "ledgerId",
    semanticId: "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0",
    selfField: "ledgerDigest",
    semanticDigest: "ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531",
    digestProfile: "domain_without_self",
    digestDomain: "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate.v1.1"
  }),
  OBJECT_FREEZE({
    role: "materialization_stale_loader_raw_self_historical_observation",
    path: "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
    rawBytes: 10887,
    rawSha256: "7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83",
    idField: "ledgerId",
    semanticId: "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
    selfField: "ledgerDigest",
    semanticDigest: "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f",
    digestProfile: "domain_without_self",
    digestDomain: "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate.v1.1"
  }),
  OBJECT_FREEZE({
    role: "pr10bc_stale_loader_raw_self_historical_observation",
    path: "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json",
    rawBytes: 38161,
    rawSha256: "edb367448f857972e50c735e86acc5252605a0b4d27a2f85c996fcd67d0ed2cc",
    idField: "ledgerId",
    semanticId: "hakimi.bazi.pr10bc.version-aware-candidate-scope-reconciliation/1.1.0",
    selfField: "ledgerDigest",
    semanticDigest: "24851de28a762c426e2630c9a52666786274c3c5477b9fc0463f9129e43d20d1",
    digestProfile: "plain_without_self"
  })
]);

const EXPECTED_TOPIC_MAP = [
  {
    topicId: "strength.yueling_exact_quote",
    currentBindingIds: ["binding:dtt:month-command", "binding:smt-v10:whole-chart"],
    mappingState: "mapped_to_existing_bindings_as_research_candidates",
    quoteRefs: [
      {
        candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
        candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
        bindingId: "binding:dtt:month-command",
        evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
        quoteCandidateId: "dtt-yueling-minimal-v1",
        rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
        rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c"
      },
      {
        candidateId: "smt-siku-v10-wikisource-r761703-candidate-v2",
        candidateDigest: "2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d",
        bindingId: "binding:smt-v10:whole-chart",
        evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
        quoteCandidateId: "smt-v10-yueling-minimal-v1",
        rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v2",
        rightsCandidateDigest: "aed5031acb007b74092db96de4338d4148bc8518b4fb392cc59e18a0ba54295d"
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
        bindingId: "binding:dtt:month-command",
        evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
        quoteCandidateId: "dtt-rooting-minimal-v1",
        rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
        rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c"
      }
    ]
  },
  {
    topicId: "strength.tougan_exact_quote",
    currentBindingIds: ["binding:smt-v10:whole-chart"],
    mappingState: "candidate_quote_located_no_dedicated_current_binding",
    quoteRefs: [
      {
        candidateId: "smt-siku-v10-wikisource-r761703-candidate-v2",
        candidateDigest: "2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d",
        bindingId: "binding:smt-v10:whole-chart",
        evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
        quoteCandidateId: "smt-v10-tougan-minimal-v1",
        rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v2",
        rightsCandidateDigest: "aed5031acb007b74092db96de4338d4148bc8518b4fb392cc59e18a0ba54295d"
      }
    ]
  }
];

const SOURCE_LOCKS = {
  "dtt-chanwei-wikisource-r2600158-candidate-v2": {
    candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
    candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
    bindingId: "binding:dtt:month-command",
    evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
    sourceId: "dtt-chanwei-wikisource-r2600158",
    carrier: {
      rawWikitextCharacters: 143701,
      rawWikitextUtf8Bytes: 401801,
      rawWikitextSha256: "1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d",
      sourceBodyStored: false,
      storagePolicy: "link_only"
    },
    quotes: {
      "dtt-yueling-minimal-v1": {
        quoteCandidateId: "dtt-yueling-minimal-v1",
        conceptualTopics: ["strength.yueling_exact_quote"],
        heading: "十五、月令",
        rawRevisionLineStart: 2391,
        rawRevisionLineEnd: 2391,
        rawCharacterStartZeroBased: 38616,
        rawCharacterEndExclusive: 38628,
        quoteCharacters: 12,
        quoteUtf8Bytes: 36,
        quoteSha256: "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9",
        quoteOccurrenceInRawRevision: "unique",
        quoteTextStored: false
      },
      "dtt-rooting-minimal-v1": {
        quoteCandidateId: "dtt-rooting-minimal-v1",
        conceptualTopics: ["strength.rooting_exact_quote"],
        heading: "十七、衰旺",
        rawRevisionLineStart: 2451,
        rawRevisionLineEnd: 2451,
        rawCharacterStartZeroBased: 40658,
        rawCharacterEndExclusive: 40675,
        quoteCharacters: 17,
        quoteUtf8Bytes: 51,
        quoteSha256: "201ce34c97841b890910cc311d14290d9cb71228f4fe64d1b0f4a419aff6818b",
        quoteOccurrenceInRawRevision: "unique",
        quoteTextStored: false
      }
    }
  },
  "smt-siku-v10-wikisource-r761703-candidate-v2": {
    candidateId: "smt-siku-v10-wikisource-r761703-candidate-v2",
    candidateDigest: "2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d",
    bindingId: "binding:smt-v10:whole-chart",
    evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
    sourceId: "smt-siku-v10-wikisource-r761703",
    carrier: {
      rawWikitextCharacters: 38959,
      rawWikitextUtf8Bytes: 106555,
      rawWikitextSha256: "0a20dc53a4156211b5c8ba89dbb6a8f07f056fde573e37699e28b021b6d026b6",
      sourceBodyStored: false,
      storagePolicy: "link_only"
    },
    quotes: {
      "smt-v10-yueling-minimal-v1": {
        quoteCandidateId: "smt-v10-yueling-minimal-v1",
        conceptualTopics: ["strength.yueling_exact_quote"],
        heading: "㸔命口訣",
        rawRevisionLineStart: 10,
        rawRevisionLineEnd: 10,
        rawCharacterStartZeroBased: 236,
        rawCharacterEndExclusive: 252,
        quoteCharacters: 16,
        quoteUtf8Bytes: 48,
        quoteSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
        quoteOccurrenceInRawRevision: "unique",
        quoteTextStored: false
      },
      "smt-v10-tougan-minimal-v1": {
        quoteCandidateId: "smt-v10-tougan-minimal-v1",
        conceptualTopics: ["strength.tougan_exact_quote"],
        heading: "㸔命口訣",
        rawRevisionLineStart: 10,
        rawRevisionLineEnd: 10,
        rawCharacterStartZeroBased: 365,
        rawCharacterEndExclusive: 384,
        quoteCharacters: 19,
        quoteUtf8Bytes: 57,
        quoteSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
        quoteOccurrenceInRawRevision: "unique",
        quoteTextStored: false
      }
    }
  }
};

const RIGHTS_LOCKS = {
  "dtt-chanwei-wikisource-r2600158-rights-candidate-v2": {
    rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
    candidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c",
    sourceCandidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
    bindingId: "binding:dtt:month-command",
    sourceId: "dtt-chanwei-wikisource-r2600158"
  },
  "smt-siku-v10-wikisource-r761703-rights-candidate-v2": {
    rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v2",
    candidateDigest: "aed5031acb007b74092db96de4338d4148bc8518b4fb392cc59e18a0ba54295d",
    sourceCandidateId: "smt-siku-v10-wikisource-r761703-candidate-v2",
    bindingId: "binding:smt-v10:whole-chart",
    sourceId: "smt-siku-v10-wikisource-r761703"
  }
};

const REQUEST_KEYS = OBJECT_FREEZE([
  "schemaVersion", "recordType", "requestId", "topicId", "quoteCandidateId", "handlingBoundary"
]);
const HANDLING_KEYS = OBJECT_FREEZE([
  "bytesProvidedDirectlyByCaller", "sourcePathAccepted", "repositoryReadAllowed",
  "repositoryStorageAllowed", "materialRedistributionDecision", "quotePublicationDecision",
  "rightsLegalConclusion"
]);
const INPUT_KEYS = OBJECT_FREEZE(["capability", "request", "sourceBodyBytes"]);

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "lawful_material_access_or_possession",
  "source_body_repository_storage",
  "minimal_quote_sufficiency",
  "successful_receipt_issuance_brand_or_redaction_against_fixed_real_body",
  "knowledge_document_source_rights_source_carrier_or_materialization_instance",
  "registry_locator_to_citation_material_link",
  "work_edition_transcription_or_carrier_legal_clearance",
  "binding_freeze",
  "content_or_expert_truth",
  "cross_file_atomic_snapshot_mutation_epoch_interval_or_aba_exclusion",
  "release_readiness_or_public_release_authorization"
]);

export class BaziPrivateExactQuoteSmtV2CurrentLineSuccessorError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "BaziPrivateExactQuoteSmtV2CurrentLineSuccessorError";
    OBJECT_DEFINE_PROPERTY(this, "code", {
      value: code, enumerable: false, configurable: false, writable: false
    });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", {
      value: true, enumerable: false, configurable: false, writable: false
    });
  }
}

function fail(code, message, cause = undefined) {
  throw new BaziPrivateExactQuoteSmtV2CurrentLineSuccessorError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function isOrdinaryObject(value) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    return false;
  }
  if (UTIL_IS_PROXY(value)) return false;
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) === OBJECT_PROTOTYPE;
}

function ownDataDescriptor(value, key, label) {
  const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
  if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
    || descriptor.enumerable !== true) {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} must be an enumerable own data property.`);
  }
  return descriptor;
}

function exactOwnKeys(value, expected, label) {
  if (!isOrdinaryObject(value)) {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} must be an ordinary object.`);
  }
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  const actual = [];
  for (let index = 0; index < ownKeys.length; index += 1) {
    const key = ownKeys[index];
    if (typeof key !== "string") fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain symbols.`);
    const descriptor = ownDataDescriptor(value, key, label);
    if (descriptor.enumerable !== true) fail("UNSAFE_DECLARATIVE_INPUT", `${label} contains hidden state.`);
    REFLECT_APPLY(ARRAY_PUSH, actual, [key]);
  }
  REFLECT_APPLY(ARRAY_SORT, actual, []);
  const sortedExpected = [];
  for (let index = 0; index < expected.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, sortedExpected, [expected[index]]);
  }
  REFLECT_APPLY(ARRAY_SORT, sortedExpected, []);
  if (REFLECT_APPLY(JSON_STRINGIFY, JSON, [actual])
    !== REFLECT_APPLY(JSON_STRINGIFY, JSON, [sortedExpected])) {
    fail("INVALID_SCHEMA", `${label} has an unexpected shape.`);
  }
}

function snapshotDeclarative(value, label, state = undefined, depth = 0) {
  const currentState = state ?? {
    seen: new NATIVE_WEAK_SET(),
    nodes: 0,
    text: 0
  };
  currentState.nodes += 1;
  if (currentState.nodes > 200000 || depth > 96) {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the declarative value budget.`);
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    currentState.text += value.length;
    if (currentState.text > 8000000) fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the text budget.`);
    return value;
  }
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || REFLECT_APPLY(OBJECT_IS, Object, [value, -0])) {
      fail("UNSAFE_DECLARATIVE_INPUT", `${label} contains an invalid number.`);
    }
    return value;
  }
  if (typeof value !== "object" || UTIL_IS_PROXY(value)) {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} must contain only passive JSON data.`);
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, currentState.seen, [value])) {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain cycles or aliases.`);
  }
  REFLECT_APPLY(WEAK_SET_ADD, currentState.seen, [value]);
  const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
  if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    if (prototype !== ARRAY_PROTOTYPE) fail("UNSAFE_DECLARATIVE_INPUT", `${label} has a custom array prototype.`);
    const output = [];
    const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
        || descriptor.enumerable !== true) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain sparse or accessor entries.`);
      }
      REFLECT_APPLY(ARRAY_PUSH, output, [
        snapshotDeclarative(descriptor.value, label, currentState, depth + 1)
      ]);
    }
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
    if (ownKeys.length !== value.length + 1) {
      fail("UNSAFE_DECLARATIVE_INPUT", `${label} array contains extra state.`);
    }
    return output;
  }
  if (prototype !== OBJECT_PROTOTYPE) fail("UNSAFE_DECLARATIVE_INPUT", `${label} has a custom prototype.`);
  const output = {};
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < ownKeys.length; index += 1) {
    const key = ownKeys[index];
    if (typeof key !== "string") fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain symbol keys.`);
    const descriptor = ownDataDescriptor(value, key, label);
    OBJECT_DEFINE_PROPERTY(output, key, {
      value: snapshotDeclarative(descriptor.value, label, currentState, depth + 1),
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return output;
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  function visit(current) {
    if (current === null || typeof current === "boolean" || typeof current === "string") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (typeof current === "number") {
      if (!NUMBER_IS_FINITE(current) || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_CANONICAL_VALUE", "Canonical JSON contains an invalid number.");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [current]);
    }
    if (current === null || typeof current !== "object" || UTIL_IS_PROXY(current)) {
      fail("NON_CANONICAL_VALUE", "Canonical JSON contains a non-passive value.");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_CANONICAL_VALUE", "Canonical JSON contains a cycle or alias.");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);
    if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current])) {
      if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]) !== ARRAY_PROTOTYPE) {
        fail("NON_CANONICAL_VALUE", "Canonical JSON array has a custom prototype.");
      }
      let text = "[";
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [current, String(index)]);
        if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])
          || descriptor.enumerable !== true) {
          fail("NON_CANONICAL_VALUE", "Canonical JSON array is sparse or accessor-backed.");
        }
        if (index > 0) text += ",";
        text += visit(descriptor.value);
      }
      REFLECT_APPLY(WEAK_SET_DELETE, seen, [current]);
      return `${text}]`;
    }
    if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]) !== OBJECT_PROTOTYPE) {
      fail("NON_CANONICAL_VALUE", "Canonical JSON object has a custom prototype.");
    }
    const keys = [];
    const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [current]);
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (typeof key !== "string") fail("NON_CANONICAL_VALUE", "Canonical JSON contains a symbol key.");
      const descriptor = ownDataDescriptor(current, key, "canonical value");
      REFLECT_APPLY(ARRAY_PUSH, keys, [key]);
    }
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    let text = "{";
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [current, key]);
      if (index > 0) text += ",";
      text += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${visit(descriptor.value)}`;
    }
    REFLECT_APPLY(WEAK_SET_DELETE, seen, [current]);
    return `${text}}`;
  }
  return visit(value);
}

function sha256Bytes(bytes) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Text(text) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [text, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function domainDigest(domain, value) {
  return sha256Text(`${domain}\u0000${canonicalStringify(value)}`);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, keys[index]]);
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) {
      deepFreeze(descriptor.value, seen);
    }
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

deepFreeze(EXPECTED_TOPIC_MAP);
deepFreeze(SOURCE_LOCKS);
deepFreeze(RIGHTS_LOCKS);

function parseJsonStringToken(text, cursor) {
  const start = cursor.index;
  cursor.index += 1;
  while (cursor.index < text.length) {
    const code = REFLECT_APPLY(STRING_CHAR_CODE_AT, text, [cursor.index]);
    if (code === 34) {
      cursor.index += 1;
      const token = REFLECT_APPLY(STRING_SLICE, text, [start, cursor.index]);
      try {
        return REFLECT_APPLY(JSON_PARSE, JSON, [token]);
      } catch {
        fail("STRICT_JSON_INVALID", "JSON string token is invalid.");
      }
    }
    if (code < 32) fail("STRICT_JSON_INVALID", "JSON string contains a control character.");
    if (code === 92) {
      cursor.index += 1;
      if (cursor.index >= text.length) fail("STRICT_JSON_INVALID", "JSON escape is truncated.");
      const escaped = text[cursor.index];
      if (escaped === "u") {
        const digits = REFLECT_APPLY(STRING_SLICE, text, [cursor.index + 1, cursor.index + 5]);
        if (!REFLECT_APPLY(REGEXP_TEST, UNICODE_ESCAPE_PATTERN, [digits])) {
          fail("STRICT_JSON_INVALID", "JSON unicode escape is invalid.");
        }
        cursor.index += 4;
      } else if (escaped !== "\"" && escaped !== "\\" && escaped !== "/"
        && escaped !== "b" && escaped !== "f" && escaped !== "n" && escaped !== "r" && escaped !== "t") {
        fail("STRICT_JSON_INVALID", "JSON escape is invalid.");
      }
    }
    cursor.index += 1;
  }
  fail("STRICT_JSON_INVALID", "JSON string is unterminated.");
}

function skipJsonWhitespace(text, cursor) {
  while (cursor.index < text.length) {
    const code = REFLECT_APPLY(STRING_CHAR_CODE_AT, text, [cursor.index]);
    if (code !== 32 && code !== 9 && code !== 10 && code !== 13) break;
    cursor.index += 1;
  }
}

function scanJsonValue(text, cursor) {
  skipJsonWhitespace(text, cursor);
  const token = text[cursor.index];
  if (token === "{") {
    cursor.index += 1;
    const keys = new NATIVE_SET();
    skipJsonWhitespace(text, cursor);
    if (text[cursor.index] === "}") {
      cursor.index += 1;
      return;
    }
    while (cursor.index < text.length) {
      if (text[cursor.index] !== "\"") fail("STRICT_JSON_INVALID", "JSON object key is invalid.");
      const key = parseJsonStringToken(text, cursor);
      if (REFLECT_APPLY(SET_HAS, keys, [key])) fail("STRICT_JSON_DUPLICATE_KEY", "JSON contains a duplicate key.");
      REFLECT_APPLY(SET_ADD, keys, [key]);
      skipJsonWhitespace(text, cursor);
      if (text[cursor.index] !== ":") fail("STRICT_JSON_INVALID", "JSON object separator is invalid.");
      cursor.index += 1;
      scanJsonValue(text, cursor);
      skipJsonWhitespace(text, cursor);
      if (text[cursor.index] === "}") {
        cursor.index += 1;
        return;
      }
      if (text[cursor.index] !== ",") fail("STRICT_JSON_INVALID", "JSON object delimiter is invalid.");
      cursor.index += 1;
      skipJsonWhitespace(text, cursor);
    }
    fail("STRICT_JSON_INVALID", "JSON object is unterminated.");
  }
  if (token === "[") {
    cursor.index += 1;
    skipJsonWhitespace(text, cursor);
    if (text[cursor.index] === "]") {
      cursor.index += 1;
      return;
    }
    while (cursor.index < text.length) {
      scanJsonValue(text, cursor);
      skipJsonWhitespace(text, cursor);
      if (text[cursor.index] === "]") {
        cursor.index += 1;
        return;
      }
      if (text[cursor.index] !== ",") fail("STRICT_JSON_INVALID", "JSON array delimiter is invalid.");
      cursor.index += 1;
    }
    fail("STRICT_JSON_INVALID", "JSON array is unterminated.");
  }
  if (token === "\"") {
    parseJsonStringToken(text, cursor);
    return;
  }
  for (let index = 0; index < 3; index += 1) {
    const literal = index === 0 ? "true" : index === 1 ? "false" : "null";
    if (REFLECT_APPLY(STRING_SLICE, text, [cursor.index, cursor.index + literal.length]) === literal) {
      cursor.index += literal.length;
      return;
    }
  }
  NUMBER_PATTERN.lastIndex = cursor.index;
  const match = REFLECT_APPLY(REGEXP_EXEC, NUMBER_PATTERN, [text]);
  if (!match || match.index !== cursor.index) fail("STRICT_JSON_INVALID", "JSON value token is invalid.");
  cursor.index = NUMBER_PATTERN.lastIndex;
}

function parseStrictJsonBytes(bytes) {
  if (!REFLECT_APPLY(BUFFER_IS_BUFFER, Buffer, [bytes])) fail("STRICT_JSON_INVALID", "Artifact bytes must be a Buffer.");
  if (bytes.length === 0 || (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) {
    fail("STRICT_JSON_INVALID", "Artifact JSON is empty or BOM-prefixed.");
  }
  let text;
  try {
    text = REFLECT_APPLY(TEXT_DECODER_DECODE, TEXT_DECODER, [bytes]);
  } catch {
    fail("STRICT_JSON_INVALID", "Artifact JSON is not valid UTF-8.");
  }
  const cursor = { index: 0 };
  scanJsonValue(text, cursor);
  skipJsonWhitespace(text, cursor);
  if (cursor.index !== text.length) fail("STRICT_JSON_INVALID", "Artifact JSON has trailing data.");
  try {
    return REFLECT_APPLY(JSON_PARSE, JSON, [text]);
  } catch {
    fail("STRICT_JSON_INVALID", "Artifact JSON cannot be parsed.");
  }
}

// Reused by the fixed private-file runner so authorization bytes receive the
// same BOM, UTF-8, trailing-data, and duplicate-key treatment as the current
// line's persisted JSON artifacts. This parser does not confer any authority.
export function parseBaziPrivateExactQuoteSmtV2CurrentLineStrictJsonBytes(bytes) {
  return parseStrictJsonBytes(bytes);
}

function computeHistoricalSelf(ledger, pin) {
  const unsigned = snapshotDeclarative(ledger, "historical artifact");
  REFLECT_APPLY(REFLECT_DELETE_PROPERTY, Reflect, [unsigned, pin.selfField]);
  if (pin.digestProfile === "source_ledger_without_candidate_digests") {
    if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [unsigned.candidates])) {
      fail("HISTORICAL_SELF_DIGEST_MISMATCH", "Source candidates are unavailable.");
    }
    for (let index = 0; index < unsigned.candidates.length; index += 1) {
      REFLECT_APPLY(REFLECT_DELETE_PROPERTY, Reflect, [unsigned.candidates[index], "candidateDigest"]);
    }
    return sha256Text(canonicalStringify(unsigned));
  }
  if (pin.digestProfile === "domain_without_self") {
    return domainDigest(pin.digestDomain, unsigned);
  }
  return sha256Text(canonicalStringify(unsigned));
}

function validateHistoricalArtifactBytes(bytes, pin) {
  if (!REFLECT_APPLY(BUFFER_IS_BUFFER, Buffer, [bytes])
    || REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [bytes]) !== BUFFER_PROTOTYPE) {
    fail("HISTORICAL_BYTES_INVALID", "Pinned historical artifact bytes must be an exact Buffer.");
  }
  const copy = REFLECT_APPLY(BUFFER_FROM, Buffer, [bytes]);
  const rawSha256 = sha256Bytes(copy);
  if (copy.length !== pin.rawBytes || rawSha256 !== pin.rawSha256) {
    fail("HISTORICAL_RAW_IDENTITY_MISMATCH", "Pinned historical artifact raw identity drifted.");
  }
  const ledger = parseStrictJsonBytes(copy);
  if (ledger?.[pin.idField] !== pin.semanticId || ledger?.[pin.selfField] !== pin.semanticDigest
    || computeHistoricalSelf(ledger, pin) !== pin.semanticDigest) {
    fail("HISTORICAL_SELF_DIGEST_MISMATCH", "Pinned historical artifact self identity drifted.");
  }
  return deepFreeze({
    identity: {
      path: pin.path,
      bytes: pin.rawBytes,
      sha256: pin.rawSha256,
      semanticId: pin.semanticId,
      semanticDigest: pin.semanticDigest
    },
    ledger
  });
}

function statIdentityMatches(left, right) {
  return left.size === right.size && left.dev === right.dev && left.ino === right.ino
    && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

function statModeIs(stat, expectedType) {
  return NUMBER_IS_SAFE_INTEGER(stat?.mode)
    && (stat.mode & FS_MODE_TYPE_MASK) === expectedType;
}

async function closeHandle(handle) {
  const close = handle?.close;
  if (typeof close !== "function") fail("HELD_HANDLE_FAILURE", "Artifact handle cannot be closed.");
  await REFLECT_APPLY(close, handle, []);
}

async function statHandle(handle) {
  const statMethod = handle?.stat;
  if (typeof statMethod !== "function") fail("HELD_HANDLE_FAILURE", "Artifact handle cannot be stated.");
  return REFLECT_APPLY(statMethod, handle, []);
}

async function readHeldPinnedArtifact(workspaceRoot, pin) {
  let rootReal;
  try {
    rootReal = await FS_REALPATH(REFLECT_APPLY(PATH_RESOLVE, path, [workspaceRoot]));
  } catch {
    fail("WORKSPACE_ROOT_INVALID", "Workspace root cannot be resolved.");
  }
  const segments = REFLECT_APPLY(STRING_SPLIT, pin.path, ["/"]);
  if (segments.length < 2) {
    fail("HISTORICAL_ARTIFACT_PATH_INVALID", "Pinned historical artifact path is invalid.");
  }
  for (let index = 0; index < segments.length; index += 1) {
    if (segments[index] === "" || segments[index] === "." || segments[index] === "..") {
      fail("HISTORICAL_ARTIFACT_PATH_INVALID", "Pinned historical artifact path is invalid.");
    }
  }
  let current = rootReal;
  for (let index = 0; index < segments.length - 1; index += 1) {
    current = REFLECT_APPLY(PATH_JOIN, path, [current, segments[index]]);
    let entry;
    try {
      entry = await FS_LSTAT(current);
    } catch {
      fail("HISTORICAL_ARTIFACT_UNAVAILABLE", "A pinned historical artifact parent is unavailable.");
    }
    if (!statModeIs(entry, FS_MODE_DIRECTORY)) {
      fail("HISTORICAL_ARTIFACT_ALIAS_REJECTED", "Pinned historical artifact parents must be ordinary directories.");
    }
  }
  const absolutePath = REFLECT_APPLY(PATH_JOIN, path, [current, segments[segments.length - 1]]);
  const relativeBack = REFLECT_APPLY(PATH_RELATIVE, path, [rootReal, absolutePath]);
  if (REFLECT_APPLY(STRING_STARTS_WITH, relativeBack, [".."]) || REFLECT_APPLY(PATH_IS_ABSOLUTE, path, [relativeBack])) {
    fail("HISTORICAL_ARTIFACT_ESCAPE", "Pinned historical artifact escaped the workspace.");
  }
  let pathBefore;
  try {
    pathBefore = await FS_LSTAT(absolutePath);
  } catch {
    fail("HISTORICAL_ARTIFACT_UNAVAILABLE", "Pinned historical artifact is unavailable.");
  }
  if (!statModeIs(pathBefore, FS_MODE_REGULAR_FILE) || pathBefore.nlink !== 1) {
    fail("HISTORICAL_ARTIFACT_ALIAS_REJECTED", "Pinned historical artifact must be one ordinary unlinked file.");
  }
  let handle;
  try {
    handle = await FS_OPEN(absolutePath, FS_READ_ONLY_NO_FOLLOW);
  } catch {
    fail("HISTORICAL_ARTIFACT_OPEN_FAILED", "Pinned historical artifact could not be opened.");
  }
  try {
    const handleBefore = await statHandle(handle);
    if (!statModeIs(handleBefore, FS_MODE_REGULAR_FILE)
      || handleBefore.nlink !== 1 || !statIdentityMatches(pathBefore, handleBefore)) {
      fail("HISTORICAL_ARTIFACT_RACE", "Pinned historical artifact changed before held-handle read.");
    }
    let bytes;
    try {
      bytes = await FS_READ_FILE(handle);
    } catch {
      fail("HISTORICAL_ARTIFACT_READ_FAILED", "Pinned historical artifact could not be read.");
    }
    const handleAfter = await statHandle(handle);
    const pathAfter = await FS_LSTAT(absolutePath);
    if (!statIdentityMatches(handleBefore, handleAfter) || !statIdentityMatches(handleAfter, pathAfter)
      || !statModeIs(pathAfter, FS_MODE_REGULAR_FILE) || pathAfter.nlink !== 1) {
      fail("HISTORICAL_ARTIFACT_RACE", "Pinned historical artifact changed during held-handle read.");
    }
    return validateHistoricalArtifactBytes(bytes, pin);
  } finally {
    await closeHandle(handle);
  }
}

function findExactlyOne(entries, key, value, label) {
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [entries])) fail("CURRENT_PARENT_SEMANTIC_MISMATCH", `${label} is unavailable.`);
  let match;
  let count = 0;
  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index]?.[key] === value) {
      match = entries[index];
      count += 1;
    }
  }
  if (count !== 1) fail("CURRENT_PARENT_SEMANTIC_MISMATCH", `${label} is not unique.`);
  return match;
}

function exactJson(left, right, label) {
  if (canonicalStringify(snapshotDeclarative(left, label))
    !== canonicalStringify(snapshotDeclarative(right, label))) {
    fail("CURRENT_PARENT_SEMANTIC_MISMATCH", `${label} drifted.`);
  }
}

function assertSourceAndRights(source, rights, smtReceipt) {
  if (source.ledgerId !== HISTORICAL_PINS[0].semanticId
    || source.ledgerDigest !== HISTORICAL_PINS[0].semanticDigest
    || rights.ledgerId !== HISTORICAL_PINS[1].semanticId
    || rights.ledgerDigest !== HISTORICAL_PINS[1].semanticDigest
    || rights.sourceBindingLedger?.ledgerId !== source.ledgerId
    || rights.sourceBindingLedger?.ledgerDigest !== source.ledgerDigest) {
    fail("CURRENT_SOURCE_RIGHTS_PAIR_MISMATCH", "Current source and rights observations are not one exact pair.");
  }
  if (!REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [source.conceptualTopicMapping])
    || source.conceptualTopicMapping.length !== EXPECTED_TOPIC_MAP.length) {
    fail("CURRENT_PARENT_SEMANTIC_MISMATCH", "PR10A conceptual topic map drifted.");
  }
  for (let index = 0; index < EXPECTED_TOPIC_MAP.length; index += 1) {
    const expected = EXPECTED_TOPIC_MAP[index];
    const observed = findExactlyOne(
      source.conceptualTopicMapping,
      "topicId",
      expected.topicId,
      "PR10A conceptual topic"
    );
    if (observed.mappingState !== expected.mappingState) {
      fail("CURRENT_PARENT_SEMANTIC_MISMATCH", "PR10A conceptual topic mapping state drifted.");
    }
    exactJson(observed.currentBindingIds, expected.currentBindingIds, "PR10A conceptual topic bindings");
  }

  const candidateIds = REFLECT_OWN_KEYS(SOURCE_LOCKS);
  for (let index = 0; index < candidateIds.length; index += 1) {
    const candidateId = candidateIds[index];
    const lock = SOURCE_LOCKS[candidateId];
    const candidate = findExactlyOne(source.candidates, "candidateId", candidateId, "source candidate");
    const candidateUnsigned = snapshotDeclarative(candidate, "source candidate");
    REFLECT_APPLY(REFLECT_DELETE_PROPERTY, Reflect, [candidateUnsigned, "candidateDigest"]);
    if (candidate.candidateDigest !== lock.candidateDigest
      || sha256Text(canonicalStringify(candidateUnsigned)) !== lock.candidateDigest
      || candidate.bindingId !== lock.bindingId
      || candidate.evidenceSubjectId !== lock.evidenceSubjectId
      || candidate.sourceId !== lock.sourceId) {
      fail("CURRENT_SOURCE_CANDIDATE_MISMATCH", "A PR10A source candidate drifted.");
    }
    const carrier = candidate.carrierIdentity;
    const carrierKeys = REFLECT_OWN_KEYS(lock.carrier);
    for (let carrierIndex = 0; carrierIndex < carrierKeys.length; carrierIndex += 1) {
      const key = carrierKeys[carrierIndex];
      if (carrier?.[key] !== lock.carrier[key]) {
        fail("CURRENT_SOURCE_BODY_LOCK_MISMATCH", "A PR10A source body identity lock drifted.");
      }
    }
    const quoteIds = REFLECT_OWN_KEYS(lock.quotes);
    for (let quoteIndex = 0; quoteIndex < quoteIds.length; quoteIndex += 1) {
      const quoteId = quoteIds[quoteIndex];
      const quote = findExactlyOne(candidate.quoteCandidates, "quoteCandidateId", quoteId, "quote candidate");
      const quoteLock = lock.quotes[quoteId];
      const quoteKeys = REFLECT_OWN_KEYS(quoteLock);
      for (let keyIndex = 0; keyIndex < quoteKeys.length; keyIndex += 1) {
        const key = quoteKeys[keyIndex];
        if (canonicalStringify(snapshotDeclarative(quote[key], "quote lock"))
          !== canonicalStringify(snapshotDeclarative(quoteLock[key], "quote lock"))) {
          fail("CURRENT_QUOTE_LOCK_MISMATCH", "A PR10A quote lock drifted.");
        }
      }
    }
  }

  const rightsIds = REFLECT_OWN_KEYS(RIGHTS_LOCKS);
  for (let index = 0; index < rightsIds.length; index += 1) {
    const rightsId = rightsIds[index];
    const lock = RIGHTS_LOCKS[rightsId];
    const candidate = findExactlyOne(rights.candidates, "rightsCandidateId", rightsId, "rights candidate");
    const unsigned = snapshotDeclarative(candidate, "rights candidate");
    REFLECT_APPLY(REFLECT_DELETE_PROPERTY, Reflect, [unsigned, "candidateDigest"]);
    if (candidate.candidateDigest !== lock.candidateDigest
      || sha256Text(canonicalStringify(unsigned)) !== lock.candidateDigest
      || candidate.sourceCandidateId !== lock.sourceCandidateId
      || candidate.bindingId !== lock.bindingId
      || candidate.sourceId !== lock.sourceId
      || candidate.decision?.formalSourceRightsRecordCreated !== false
      || candidate.decision?.formalSourceCarrierRecordCreated !== false
      || candidate.decision?.workLayerCleared !== false
      || candidate.decision?.editionLayerCleared !== false
      || candidate.decision?.carrierLayerCleared !== false
      || candidate.decision?.distributionPolicy !== "link_only"
      || candidate.decision?.legalConclusion !== "not_established") {
      fail("CURRENT_RIGHTS_CANDIDATE_MISMATCH", "A PR10A rights candidate drifted or promoted authority.");
    }
  }

  if (smtReceipt.supersessionId !== HISTORICAL_PINS[2].semanticId
    || smtReceipt.supersessionDigest !== HISTORICAL_PINS[2].semanticDigest
    || smtReceipt.subjectLock?.supersedingSourceCandidateId
      !== "smt-siku-v10-wikisource-r761703-candidate-v2"
    || smtReceipt.subjectLock?.supersedingRightsCandidateId
      !== "smt-siku-v10-wikisource-r761703-rights-candidate-v2"
    || smtReceipt.supersedingParents?.sourceBinding?.ledgerDigest !== source.ledgerDigest
    || smtReceipt.supersedingParents?.sourceRights?.ledgerDigest !== rights.ledgerDigest
    || smtReceipt.formalAdmissionBoundary?.bindingRequired !== 12
    || smtReceipt.formalAdmissionBoundary?.bindingFrozenVerified !== 0
    || smtReceipt.formalAdmissionBoundary?.formalKnowledgeDocumentCount !== 0
    || smtReceipt.formalAdmissionBoundary?.formalSourceRightsRecordCount !== 0
    || smtReceipt.formalAdmissionBoundary?.formalSourceCarrierRecordCount !== 0
    || smtReceipt.formalAdmissionBoundary?.activeAdmissionEffect !== "none"
    || smtReceipt.integrityBoundary?.crossFileAtomicSnapshot !== false
    || smtReceipt.integrityBoundary?.mutationEpochAvailable !== false
    || smtReceipt.integrityBoundary?.mutationEpochReceipt !== null
    || smtReceipt.integrityBoundary?.abaExcluded !== false) {
    fail("SMT_V2_HISTORICAL_OBSERVATION_MISMATCH", "SMT v2 historical observation drifted or promoted authority.");
  }
}

function assertOtherHistoricalRedBoundaries(carrier, materialization, pr10bc) {
  if (carrier.counts?.carrierObservationLayers !== 6
    || carrier.counts?.formalSourceCarrierRecords !== 0
    || carrier.counts?.formalSourceRightsRecords !== 0
    || carrier.counts?.materializationsVerified !== 0
    || carrier.counts?.sourceBindingsFrozen !== 0
    || carrier.editionAndProvenanceBoundary?.externalCarrierLiveVerifiedThisRun !== false
    || carrier.authorityBoundary?.activeAdmissionEffect !== "none"
    || carrier.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || materialization.currentInventory?.formalSourceCarrierRecords !== 0
    || materialization.currentInventory?.formalSourceRightsRecords !== 0
    || materialization.currentInventory?.materializationsVerified !== 0
    || materialization.currentInventory?.sourceBindingsFrozen !== 0
    || materialization.gateSummary?.materializationApiIntegratedByThisCandidate !== false
    || pr10bc.gateSummary?.bindingFrozenVerified !== 0
    || pr10bc.gateSummary?.semanticMappingsMechanicallyEstablished !== 0
    || pr10bc.gateSummary?.domainExpertMappingsApproved !== 0
    || pr10bc.gateSummary?.activeAdmissionEffect !== "none") {
    fail("STALE_CHAIN_RED_BOUNDARY_MISMATCH", "A stale-chain raw/self observation promoted a closed gate.");
  }
}

function assertCurrentParentCapability(parent) {
  if (!isVerifiedBaziBindingCitationLocatorLinkRequirements(parent)) {
    fail("CURRENT_PARENT_PRIVATE_BRAND_REQUIRED", "Exact persisted current binding-citation child brand is required.");
  }
  if (parent.ledgerId !== CURRENT_PARENT.ledgerId
    || parent.ledgerDigest !== CURRENT_PARENT.ledgerDigest
    || parent.artifact?.path !== CURRENT_PARENT.path
    || parent.artifact?.bytes !== CURRENT_PARENT.rawBytes
    || parent.artifact?.sha256 !== CURRENT_PARENT.rawSha256
    || parent.bindingRequired !== 12
    || parent.inventoryRows !== 12
    || parent.currentReceipts !== 0
    || parent.bindingsLocatorLinked !== 0
    || parent.minimalQuoteSufficiency !== "not_established"
    || parent.formalKnowledgeDocuments !== 0
    || parent.formalSourceRightsRecords !== 0
    || parent.formalSourceCarrierRecords !== 0
    || parent.projectCopyMaterializationRecords !== 0
    || parent.materializationsVerified !== 0
    || parent.bindingsFrozen !== 0
    || parent.contentTruthEstablished !== false
    || parent.expertTruthEstablished !== false
    || parent.rightsLegalConclusionEstablished !== false
    || parent.activeAdmissionEffect !== "none"
    || parent.releaseReady !== false
    || parent.publicDeploymentAuthorized !== false
    || parent.expertClaimsAuthorized !== false
    || parent.releaseIdentity !== "legacy-v13"
    || parent.targetSchema !== 13
    || parent.migrationId !== null
    || parent.crossFileAtomicSnapshot !== false
    || parent.mutationEpochAvailableForSchema13 !== false
    || parent.mutationEpochReceipt !== null
    || parent.intervalMutationExcludedAcrossFiles !== false
    || parent.abaExcluded !== false) {
    fail("CURRENT_PARENT_CAPABILITY_MISMATCH", "Current binding-citation child capability drifted or promoted authority.");
  }
}

export async function loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  let parent;
  try {
    parent = await loadBaziBindingCitationLocatorLinkRequirements(workspaceRoot);
  } catch {
    fail("CURRENT_PARENT_LOAD_FAILED", "Current binding-citation child could not be loaded.");
  }
  assertCurrentParentCapability(parent);

  const observations = [];
  const ledgers = [];
  for (let index = 0; index < HISTORICAL_PINS.length; index += 1) {
    const pin = HISTORICAL_PINS[index];
    const observed = await readHeldPinnedArtifact(workspaceRoot, pin);
    REFLECT_APPLY(ARRAY_PUSH, ledgers, [observed.ledger]);
    REFLECT_APPLY(ARRAY_PUSH, observations, [{
      role: pin.role,
      artifact: observed.identity,
      observationMode: "held_handle_fixed_raw_and_recomputed_self_digest_only",
      brandCurrent: false,
      loaderInvoked: false,
      authorityEffect: "none"
    }]);
  }
  assertSourceAndRights(ledgers[0], ledgers[1], ledgers[2]);
  assertOtherHistoricalRedBoundaries(ledgers[3], ledgers[4], ledgers[5]);

  const capability = deepFreeze({
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_CURRENT_LINE_SUCCESSOR_VERSION,
    recordType: "bazi_private_exact_quote_smt_v2_current_line_zero_instance_capability",
    currentLineCapabilityMechanicallyVerified: true,
    mechanicallyVerifiedScope: "zero_instance_current_line_capability_and_fail_closed_contract_only",
    successfulReceiptPathExecuted: false,
    receiptBrandAndRedactionSuccessVerified: false,
    currentParent: {
      artifact: {
        path: CURRENT_PARENT.path,
        bytes: CURRENT_PARENT.rawBytes,
        sha256: CURRENT_PARENT.rawSha256
      },
      ledgerId: CURRENT_PARENT.ledgerId,
      ledgerDigest: CURRENT_PARENT.ledgerDigest,
      exactPersistedPrivateBrandConsumed: true,
      privateBrandTransferred: false
    },
    historicalObservations: observations,
    scope: {
      conceptualTopics: 3,
      currentBindings: 2,
      quoteRefs: 4,
      sourceCandidateVersions: [
        "dtt-chanwei-wikisource-r2600158-candidate-v2",
        "smt-siku-v10-wikisource-r761703-candidate-v2"
      ],
      topicMap: snapshotDeclarative(EXPECTED_TOPIC_MAP, "topic map")
    },
    privateVerificationApi: {
      explicitCallerBytesOnly: true,
      sourcePathOperandAccepted: false,
      repositorySourceBodyReadByThisLibrary: false,
      cliAcceptsPrivateBodyOperand: false,
      status: "candidate_unexecuted_against_fixed_real_body",
      fixedRealBodyProvidedToThisChild: false,
      successfulReceiptPathExecuted: false,
      receiptBrandAndRedactionSuccessVerified: false,
      receiptBrandAndRedactionSuccessUnverified: true,
      receiptIssuedByCapabilityLoad: false,
      currentReceipts: 0
    },
    counts: {
      currentParentPrivateBrandsConsumed: 1,
      historicalRawSelfObservations: HISTORICAL_PINS.length,
      staleFullLoadersImported: 0,
      staleFullLoadersInvoked: 0,
      formalKnowledgeDocuments: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      projectCopyMaterializationRecords: 0,
      materializationsVerified: 0,
      bindingCitationLocatorLinks: 0,
      bindingsFrozen: 0,
      domainExpertReviews: 0,
      rightsLegalReviews: 0
    },
    authorityBoundary: {
      lawfulMaterialAccessEstablished: false,
      minimalQuoteSufficiencyEstablished: false,
      sourceIdentityAdjudicated: false,
      workEditionCarrierRightsCleared: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      bindingFreezeEffect: "none",
      activeAdmissionEffect: "none",
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      publicReleaseAuthorized: false
    },
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    mutationBoundary: {
      endpointSnapshotsOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    doesNotEstablish: snapshotDeclarative(DOES_NOT_ESTABLISH, "doesNotEstablish")
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_CAPABILITIES, [capability]);
  return capability;
}

export function isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_CAPABILITIES, [value]);
}

function captureExplicitBytes(value) {
  if (value === null || typeof value !== "object" || UTIL_IS_PROXY(value)) {
    fail("EXPLICIT_BYTES_REQUIRED", "sourceBodyBytes must be an exact built-in byte view.");
  }
  const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
  const isExactBuffer = REFLECT_APPLY(BUFFER_IS_BUFFER, Buffer, [value]) && prototype === BUFFER_PROTOTYPE;
  const isExactUint8 = prototype === UINT8_ARRAY_PROTOTYPE;
  if (!isExactBuffer && !isExactUint8) {
    fail("EXPLICIT_BYTES_REQUIRED", "sourceBodyBytes must be an exact Buffer or Uint8Array.");
  }
  let backing;
  let byteLength;
  let byteOffset;
  try {
    backing = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, value, []);
    byteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, value, []);
    byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, value, []);
  } catch {
    fail("EXPLICIT_BYTES_REQUIRED", "sourceBodyBytes is not a valid byte view.");
  }
  if (REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [backing]) !== ARRAY_BUFFER_PROTOTYPE
    || !NUMBER_IS_SAFE_INTEGER(byteLength) || byteLength <= 0 || byteLength > 2 * 1024 * 1024
    || !NUMBER_IS_SAFE_INTEGER(byteOffset) || byteOffset < 0) {
    fail("EXPLICIT_BYTES_REQUIRED", "sourceBodyBytes uses an unsupported backing store or size.");
  }
  let copy;
  try {
    copy = REFLECT_APPLY(BUFFER_ALLOC_UNSAFE_SLOW, Buffer, [byteLength]);
    REFLECT_APPLY(TYPED_ARRAY_SET, copy, [value, 0]);
  } catch {
    fail("EXPLICIT_BYTES_ALIAS_REJECTED", "sourceBodyBytes could not be detached from caller memory.");
  }
  if (copy.length !== byteLength
    || REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, copy, []) === backing) {
    fail("EXPLICIT_BYTES_ALIAS_REJECTED", "sourceBodyBytes could not be detached from caller memory.");
  }
  return copy;
}

function validateRequest(input) {
  const request = snapshotDeclarative(input, "request");
  exactOwnKeys(request, REQUEST_KEYS, "request");
  if (request.schemaVersion !== BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_REQUEST_SCHEMA_VERSION
    || request.recordType !== "bazi_private_exact_quote_smt_v2_current_line_request"
    || typeof request.requestId !== "string"
    || !REFLECT_APPLY(REGEXP_TEST, REQUEST_ID_PATTERN, [request.requestId])
    || typeof request.topicId !== "string"
    || typeof request.quoteCandidateId !== "string") {
    fail("INVALID_REQUEST", "Private exact-quote request is invalid.");
  }
  exactOwnKeys(request.handlingBoundary, HANDLING_KEYS, "request.handlingBoundary");
  const boundary = request.handlingBoundary;
  if (boundary.bytesProvidedDirectlyByCaller !== true
    || boundary.sourcePathAccepted !== false
    || boundary.repositoryReadAllowed !== false
    || boundary.repositoryStorageAllowed !== false
    || boundary.materialRedistributionDecision !== "not_established"
    || boundary.quotePublicationDecision !== "not_established"
    || boundary.rightsLegalConclusion !== "not_established") {
    fail("INVALID_HANDLING_BOUNDARY", "Private exact-quote handling boundary is not fail-closed.");
  }
  return request;
}

function resolveRequestLock(request) {
  let topic;
  let topicCount = 0;
  for (let index = 0; index < EXPECTED_TOPIC_MAP.length; index += 1) {
    if (EXPECTED_TOPIC_MAP[index].topicId === request.topicId) {
      topic = EXPECTED_TOPIC_MAP[index];
      topicCount += 1;
    }
  }
  if (topicCount !== 1) fail("REQUEST_SCOPE_MISMATCH", "Request topic is outside the fixed PR10A scope.");
  let reference;
  let referenceCount = 0;
  for (let index = 0; index < topic.quoteRefs.length; index += 1) {
    if (topic.quoteRefs[index].quoteCandidateId === request.quoteCandidateId) {
      reference = topic.quoteRefs[index];
      referenceCount += 1;
    }
  }
  if (referenceCount !== 1) fail("REQUEST_SCOPE_MISMATCH", "Request quote is not unique in the selected PR10A topic.");
  const source = SOURCE_LOCKS[reference.candidateId];
  const quote = source?.quotes?.[reference.quoteCandidateId];
  const rights = RIGHTS_LOCKS[reference.rightsCandidateId];
  if (!source || !quote || !rights
    || source.candidateDigest !== reference.candidateDigest
    || rights.candidateDigest !== reference.rightsCandidateDigest) {
    fail("REQUEST_SCOPE_MISMATCH", "Request does not resolve to one exact current PR10A chain.");
  }
  return { topic, reference, source, quote, rights };
}

function countNewlines(text, start, end) {
  let count = 0;
  for (let index = start; index < end; index += 1) {
    if (REFLECT_APPLY(STRING_CHAR_CODE_AT, text, [index]) === 10) count += 1;
  }
  return count;
}

function verifyExternalBytesKernel(sourceBytes, carrierLockInput, quoteLockInput) {
  const source = captureExplicitBytes(sourceBytes);
  const carrier = snapshotDeclarative(carrierLockInput, "carrier lock");
  const quote = snapshotDeclarative(quoteLockInput, "quote lock");
  const bodyDigest = sha256Bytes(source);
  if (source.length !== carrier.rawWikitextUtf8Bytes
    || bodyDigest !== carrier.rawWikitextSha256) {
    fail("SOURCE_BODY_IDENTITY_MISMATCH", "Explicit source bytes do not match the fixed body identity.");
  }
  if (source.length >= 3 && source[0] === 0xef && source[1] === 0xbb && source[2] === 0xbf) {
    fail("SOURCE_BODY_UTF8_INVALID", "Explicit source bytes must not contain a UTF-8 BOM.");
  }
  let text;
  try {
    text = REFLECT_APPLY(TEXT_DECODER_DECODE, TEXT_DECODER, [source]);
  } catch {
    fail("SOURCE_BODY_UTF8_INVALID", "Explicit source bytes are not strict UTF-8.");
  }
  if (text.length !== carrier.rawWikitextCharacters) {
    fail("SOURCE_BODY_CHARACTER_COUNT_MISMATCH", "Explicit source text length does not match the fixed body identity.");
  }
  const start = quote.rawCharacterStartZeroBased;
  const end = quote.rawCharacterEndExclusive;
  if (!NUMBER_IS_SAFE_INTEGER(start) || !NUMBER_IS_SAFE_INTEGER(end)
    || start < 0 || end <= start || end > text.length) {
    fail("QUOTE_LOCATOR_MISMATCH", "Fixed quote character locator is invalid.");
  }
  const quoteText = REFLECT_APPLY(STRING_SLICE, text, [start, end]);
  const quoteBytes = REFLECT_APPLY(BUFFER_FROM, Buffer, [quoteText, "utf8"]);
  if (quoteText.length !== quote.quoteCharacters
    || quoteBytes.length !== quote.quoteUtf8Bytes
    || sha256Bytes(quoteBytes) !== quote.quoteSha256) {
    fail("QUOTE_HASH_MISMATCH", "Explicit source bytes do not match the fixed quote digest and size.");
  }
  const startLine = countNewlines(text, 0, start) + 1;
  const endLine = startLine + countNewlines(text, start, end);
  if (startLine !== quote.rawRevisionLineStart || endLine !== quote.rawRevisionLineEnd) {
    fail("QUOTE_LINE_MISMATCH", "Fixed quote line locator does not match the explicit source bytes.");
  }
  let occurrences = 0;
  let searchFrom = 0;
  while (searchFrom <= text.length) {
    const found = REFLECT_APPLY(STRING_INDEX_OF, text, [quoteText, searchFrom]);
    if (found < 0) break;
    occurrences += 1;
    if (occurrences > 1) break;
    searchFrom = found + 1;
  }
  if (quote.quoteOccurrenceInRawRevision !== "unique" || occurrences !== 1) {
    fail("QUOTE_OVERLAP_IDENTITY_MISMATCH", "Fixed quote is not unique including overlapping occurrences.");
  }
  return deepFreeze({
    sourceBodySha256: bodyDigest,
    sourceBodyUtf8Bytes: source.length,
    sourceBodyUtf16CodeUnits: text.length,
    rawCharacterStartZeroBased: start,
    rawCharacterEndExclusive: end,
    rawRevisionLineStart: startLine,
    rawRevisionLineEnd: endLine,
    quoteUtf16CodeUnits: quoteText.length,
    quoteUtf8Bytes: quoteBytes.length,
    quoteSha256: quote.quoteSha256,
    overlappingOccurrenceCount: occurrences,
    uniqueIncludingOverlapsVerified: true,
    sourceBodyStoredInResult: false,
    quoteTextStoredInResult: false
  });
}

function captureVerificationInput(input) {
  exactOwnKeys(input, INPUT_KEYS, "verification input");
  const capability = ownDataDescriptor(input, "capability", "verification input").value;
  if (!isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(capability)) {
    fail("CAPABILITY_PRIVATE_BRAND_REQUIRED", "Private exact-quote verification requires this loader's capability brand.");
  }
  const request = validateRequest(ownDataDescriptor(input, "request", "verification input").value);
  const bytes = captureExplicitBytes(ownDataDescriptor(input, "sourceBodyBytes", "verification input").value);
  return { capability, request, bytes };
}

export function verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes(input) {
  const captured = captureVerificationInput(input);
  const lock = resolveRequestLock(captured.request);
  const integrity = verifyExternalBytesKernel(captured.bytes, lock.source.carrier, lock.quote);
  const receiptSeed = {
    parentLedgerId: CURRENT_PARENT.ledgerId,
    parentLedgerDigest: CURRENT_PARENT.ledgerDigest,
    requestId: captured.request.requestId,
    topicId: lock.topic.topicId,
    quoteCandidateId: lock.quote.quoteCandidateId,
    sourceBodySha256: integrity.sourceBodySha256,
    quoteSha256: integrity.quoteSha256
  };
  const receipt = deepFreeze({
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_RECEIPT_SCHEMA_VERSION,
    recordType: "bazi_private_exact_quote_smt_v2_current_line_integrity_receipt",
    receiptId: `hakimi.bazi.private-exact-quote-smt-v2-current-line/${sha256Text(canonicalStringify(receiptSeed))}`,
    verificationScope: "explicit_caller_bytes_private_material_integrity_only",
    currentCapabilityParent: {
      ledgerId: CURRENT_PARENT.ledgerId,
      ledgerDigest: CURRENT_PARENT.ledgerDigest,
      exactPersistedPrivateBrandConsumed: true
    },
    request: {
      requestId: captured.request.requestId,
      topicId: lock.topic.topicId,
      quoteCandidateId: lock.quote.quoteCandidateId,
      bytesProvidedDirectlyByCaller: true,
      sourcePathAccepted: false
    },
    exactCurrentChain: {
      bindingId: lock.reference.bindingId,
      evidenceSubjectId: lock.reference.evidenceSubjectId,
      sourceCandidateId: lock.reference.candidateId,
      sourceCandidateDigest: lock.reference.candidateDigest,
      rightsCandidateId: lock.reference.rightsCandidateId,
      rightsCandidateDigest: lock.reference.rightsCandidateDigest,
      sourceLedgerId: HISTORICAL_PINS[0].semanticId,
      sourceLedgerDigest: HISTORICAL_PINS[0].semanticDigest,
      rightsLedgerId: HISTORICAL_PINS[1].semanticId,
      rightsLedgerDigest: HISTORICAL_PINS[1].semanticDigest,
      upstreamBrandCurrent: false,
      upstreamFullLoaderInvoked: false
    },
    materialIntegrity: {
      sourceBodySha256: integrity.sourceBodySha256,
      sourceBodyUtf8Bytes: integrity.sourceBodyUtf8Bytes,
      sourceBodyUtf16CodeUnits: integrity.sourceBodyUtf16CodeUnits,
      rawCharacterStartZeroBased: integrity.rawCharacterStartZeroBased,
      rawCharacterEndExclusive: integrity.rawCharacterEndExclusive,
      rawRevisionLineStart: integrity.rawRevisionLineStart,
      rawRevisionLineEnd: integrity.rawRevisionLineEnd,
      quoteUtf16CodeUnits: integrity.quoteUtf16CodeUnits,
      quoteUtf8Bytes: integrity.quoteUtf8Bytes,
      quoteSha256: integrity.quoteSha256,
      overlappingOccurrenceCount: integrity.overlappingOccurrenceCount,
      uniqueIncludingOverlapsVerified: true
    },
    redactionBoundary: {
      sourcePathStored: false,
      privateRootStored: false,
      sourceBodyStored: false,
      quoteTextStored: false,
      requestObjectStored: false
    },
    counts: {
      formalKnowledgeDocuments: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      projectCopyMaterializationRecords: 0,
      materializationsVerified: 0,
      bindingCitationLocatorLinks: 0,
      bindingsFrozen: 0,
      domainExpertReviews: 0,
      rightsLegalReviews: 0
    },
    authorityBoundary: {
      privateMaterialIntegrityVerified: true,
      lawfulMaterialAccessEstablished: false,
      minimalQuoteSufficiencyEstablished: false,
      sourceIdentityAdjudicated: false,
      workEditionCarrierRightsCleared: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      bindingCitationLocatorLinked: false,
      bindingFrozen: false,
      bindingFreezeEffect: "none",
      activeAdmissionEffect: "none",
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      publicReleaseAuthorized: false
    },
    mutationBoundary: {
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    doesNotEstablish: snapshotDeclarative(DOES_NOT_ESTABLISH, "doesNotEstablish"),
    receiptDigest: sha256Text(canonicalStringify({
      ...receiptSeed,
      domain: "hakimi.bazi.private-exact-quote-smt-v2-current-line.receipt.v1"
    }))
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RECEIPTS, [receipt]);
  return receipt;
}

export function isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineReceipt(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RECEIPTS, [value]);
}

export function summarizeBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(capability) {
  if (!isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(capability)) {
    fail("CAPABILITY_PRIVATE_BRAND_REQUIRED", "Summary requires the exact loader capability brand.");
  }
  return deepFreeze({
    currentLineCapabilityMechanicallyVerified: true,
    mechanicallyVerifiedScope: "zero_instance_current_line_capability_and_fail_closed_contract_only",
    currentParentLedgerId: capability.currentParent.ledgerId,
    currentParentLedgerDigest: capability.currentParent.ledgerDigest,
    currentParentPrivateBrandConsumed: true,
    conceptualTopics: 3,
    currentBindings: 2,
    quoteRefs: 4,
    sourceCandidateVersions: snapshotDeclarative(capability.scope.sourceCandidateVersions, "source versions"),
    historicalRawSelfObservations: HISTORICAL_PINS.length,
    historicalBrandsCurrent: false,
    staleFullLoadersImported: 0,
    staleFullLoadersInvoked: 0,
    explicitCallerBytesOnly: true,
    cliAcceptsPrivateBodyOperand: false,
    privateVerificationApiStatus: "candidate_unexecuted_against_fixed_real_body",
    fixedRealBodyProvidedToThisChild: false,
    successfulReceiptPathExecuted: false,
    receiptBrandAndRedactionSuccessVerified: false,
    receiptBrandAndRedactionSuccessUnverified: true,
    currentReceipts: 0,
    formalKnowledgeDocuments: 0,
    formalSourceRightsRecords: 0,
    formalSourceCarrierRecords: 0,
    projectCopyMaterializationRecords: 0,
    materializationsVerified: 0,
    bindingCitationLocatorLinks: 0,
    bindingsFrozen: 0,
    lawfulMaterialAccessEstablished: false,
    minimalQuoteSufficiencyEstablished: false,
    sourceIdentityAdjudicated: false,
    workEditionCarrierRightsCleared: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    activeAdmissionEffect: "none",
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    publicReleaseAuthorized: false,
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false,
    runtimeTrustCalibration: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      visibleLoaderGuardIsSecurityBoundary: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    }
  });
}

export function safeBaziPrivateExactQuoteSmtV2CurrentLineSuccessorCliMessage(error) {
  if (!UTIL_IS_NATIVE_ERROR(error)) return null;
  const safe = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [error, "safeForCli"]);
  const code = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [error, "code"]);
  if (!safe || !code || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [safe, "value"])
    || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [code, "value"])
    || safe.value !== true || typeof code.value !== "string") return null;
  return `BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_CURRENT_LINE_SUCCESSOR_FAILED ${code.value}`;
}

export const baziPrivateExactQuoteSmtV2CurrentLineSuccessorTestOnly = deepFreeze({
  CURRENT_PARENT,
  HISTORICAL_PINS,
  EXPECTED_TOPIC_MAP,
  SOURCE_LOCKS,
  RIGHTS_LOCKS,
  DOES_NOT_ESTABLISH,
  parseStrictJsonBytes,
  computeHistoricalSelf,
  validateHistoricalArtifactBytes,
  assertSourceAndRights,
  assertOtherHistoricalRedBoundaries,
  assertCurrentParentCapability,
  captureExplicitBytes,
  validateRequest,
  verifyExternalBytesKernel,
  canonicalStringify,
  sha256Bytes,
  snapshotDeclarative
});
