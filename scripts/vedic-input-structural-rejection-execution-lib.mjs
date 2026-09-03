import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";
import {
  parseVedicInputContractDraftJsonBytes
} from "./vedic-input-contract-draft-lib.mjs";

const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.vedic.input-structural-precheck-candidate.v1";
const RECEIPT_IDENTITY_DIGEST_DOMAIN =
  "hakimi.vedic.input-structural-precheck-diagnostic-receipt-identity.v1";
const MAX_CANDIDATE_BYTES = 64_000;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const EXPECTED_SCHEMA_CANONICAL_BYTES = 9_766;
const EXPECTED_SCHEMA_CANONICAL_SHA256 =
  "03afcae3e276ce7d84b1be321185431ea4e8d95fcba02063ecb29a42e10d6a1f";
const EXPECTED_SCHEMA_SEMANTIC_DIGEST =
  "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08";

const PROBE_IDS = Object.freeze([
  "missing_required_root_field",
  "invalid_ephemeris_digest_shape",
  "declared_dst_gap",
  "structurally_complete_contract_not_admitted"
]);

const EXPECTED_DIAGNOSTICS = Object.freeze([
  Object.freeze({
    code: "SCHEMA_REQUIRED_PROPERTY_MISSING",
    jsonPointer: "/civil_calendar_and_date",
    probeId: PROBE_IDS[0],
    stage: "draft_schema_structure"
  }),
  Object.freeze({
    code: "SCHEMA_PATTERN_MISMATCH",
    jsonPointer: "/ephemeris_identity_version_and_coverage/data_digest_sha256",
    probeId: PROBE_IDS[1],
    stage: "draft_schema_structure"
  }),
  Object.freeze({
    code: "DECLARED_DST_GAP_REJECTED",
    jsonPointer: "/dst_gap_overlap_resolution",
    probeId: PROBE_IDS[2],
    stage: "candidate_declared_gap_boundary"
  }),
  Object.freeze({
    code: "INPUT_CONTRACT_NOT_ADMITTED",
    jsonPointer: "",
    probeId: PROBE_IDS[3],
    stage: "admission_boundary"
  })
]);

const ISSUED_DIAGNOSTIC_RECEIPTS = new WeakSet();

export class VedicInputStructuralRejectionExecutionError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "VedicInputStructuralRejectionExecutionError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new VedicInputStructuralRejectionExecutionError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "吠陀结构预检输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 50_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀结构预检输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀结构预检输入包含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 200_000) {
      fail("INPUT_TEXT_LIMIT_EXCEEDED", "吠陀结构预检输入文本超过上限。");
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("INPUT_VALUE_INVALID", "吠陀结构预检对象 API 只接受有限 JSON 值。");
  }
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "吠陀结构预检对象 API 不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "吠陀结构预检对象 API 不接受循环引用。");
  if (state.seen.has(value)) fail("INPUT_ALIAS_FORBIDDEN", "吠陀结构预检对象 API 不接受共享对象别名。");
  state.seen.add(value);
  state.active.add(value);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = Array.isArray(value);
      prototype = Reflect.apply(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
      descriptors = Reflect.apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "吠陀结构预检对象无法被动捕获。", cause);
    }
    const keys = Reflect.apply(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    if (keys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀结构预检对象 API 不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) {
        fail("INPUT_PROTOTYPE_INVALID", "吠陀结构预检数组原型无效。");
      }
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 20_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀结构预检数组长度无效。");
      }
      const allowed = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (keys.some((key) => !allowed.has(key))) {
        fail("INPUT_ARRAY_INVALID", "吠陀结构预检数组包含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀结构预检对象 API 不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) {
      fail("INPUT_PROTOTYPE_INVALID", "吠陀结构预检对象 API 只接受普通 JSON 对象。");
    }
    const entries = [];
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀结构预检对象 API 不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    active: new WeakSet(),
    nodes: 0,
    seen: new WeakSet(),
    textCharacters: 0
  }, 0);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key])])
    );
  }
  fail("NON_CANONICAL_JSON", "吠陀结构预检只接受有限规范 JSON 值。");
}

export function canonicalStringifyVedicInputStructuralRejectionValue(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function canonicalPrettyStringifyVedicInputStructuralRejectionValue(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJsonSnapshot(value)), null, 2) + "\n";
}

function domainDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyVedicInputStructuralRejectionValue(value), "utf8")
    .digest("hex");
}

function requireApprovedDraftSchema(schemaInput) {
  const schema = capturePassiveJsonSnapshot(schemaInput);
  const canonical = canonicalStringifyVedicInputStructuralRejectionValue(schema);
  if (Buffer.byteLength(canonical, "utf8") !== EXPECTED_SCHEMA_CANONICAL_BYTES
    || createHash("sha256").update(canonical, "utf8").digest("hex")
      !== EXPECTED_SCHEMA_CANONICAL_SHA256) {
    fail("SCHEMA_IDENTITY_INVALID", "吠陀结构预检只接受当前冻结 input draft 的精确 schema 对象身份。");
  }
  return schema;
}

export function parseVedicInputStructuralPrecheckCandidateJsonBytes(
  bytes,
  label = "吠陀结构预检候选 JSON"
) {
  try {
    return parseVedicInputContractDraftJsonBytes(bytes, label, MAX_CANDIDATE_BYTES);
  } catch (cause) {
    fail(
      typeof cause?.code === "string" ? cause.code : "JSON_INVALID",
      cause instanceof Error ? cause.message : String(cause),
      cause
    );
  }
}


function escapeJsonPointerSegment(segment) {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function childPointer(parent, segment) {
  return parent + "/" + escapeJsonPointerSegment(segment);
}

function issue(code, jsonPointer, keyword) {
  return Object.freeze({ code, jsonPointer, keyword });
}

function exactJson(left, right) {
  return canonicalStringifyVedicInputStructuralRejectionValue(left)
    === canonicalStringifyVedicInputStructuralRejectionValue(right);
}

function typeMatches(value, type) {
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "array") return Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  fail("SCHEMA_KEYWORD_UNSUPPORTED", "吠陀结构预检遇到未支持的 schema type。");
}

function firstStructuralIssue(value, schema, jsonPointer = "") {
  if (Array.isArray(schema?.oneOf)) {
    const branchIssues = schema.oneOf.map((branch) => firstStructuralIssue(value, branch, jsonPointer));
    const matching = branchIssues.filter((entry) => entry === null).length;
    if (matching !== 1) return issue("SCHEMA_ONE_OF_MISMATCH", jsonPointer, "oneOf");
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const") && !exactJson(value, schema.const)) {
    return issue("SCHEMA_CONST_MISMATCH", jsonPointer, "const");
  }
  if (Array.isArray(schema?.enum) && !schema.enum.some((entry) => exactJson(value, entry))) {
    return issue("SCHEMA_ENUM_MISMATCH", jsonPointer, "enum");
  }
  if (typeof schema?.type === "string" && !typeMatches(value, schema.type)) {
    return issue("SCHEMA_TYPE_MISMATCH", jsonPointer, "type");
  }
  if (schema?.type === "object") {
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        return issue("SCHEMA_REQUIRED_PROPERTY_MISSING", childPointer(jsonPointer, key), "required");
      }
    }
    const properties = schema.properties ?? {};
    if (schema.additionalProperties === false) {
      const extra = Object.keys(value).filter((key) => !Object.prototype.hasOwnProperty.call(properties, key))
        .sort(compareCodeUnits)[0];
      if (extra !== undefined) {
        return issue("SCHEMA_ADDITIONAL_PROPERTY_FORBIDDEN", jsonPointer, "additionalProperties");
      }
    }
    for (const key of Object.keys(value).sort(compareCodeUnits)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) continue;
      const nested = firstStructuralIssue(value[key], properties[key], childPointer(jsonPointer, key));
      if (nested !== null) return nested;
    }
  }
  if (schema?.type === "array") {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
      return issue("SCHEMA_MIN_ITEMS_MISMATCH", jsonPointer, "minItems");
    }
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
      return issue("SCHEMA_MAX_ITEMS_MISMATCH", jsonPointer, "maxItems");
    }
    if (schema.uniqueItems === true) {
      const seen = new Set();
      for (let index = 0; index < value.length; index += 1) {
        const identity = canonicalStringifyVedicInputStructuralRejectionValue(value[index]);
        if (seen.has(identity)) {
          return issue("SCHEMA_UNIQUE_ITEMS_MISMATCH", childPointer(jsonPointer, index), "uniqueItems");
        }
        seen.add(identity);
      }
    }
    if (schema.items && typeof schema.items === "object") {
      for (let index = 0; index < value.length; index += 1) {
        const nested = firstStructuralIssue(value[index], schema.items, childPointer(jsonPointer, index));
        if (nested !== null) return nested;
      }
    }
  }
  if (typeof value === "string") {
    const length = [...value].length;
    if (Number.isInteger(schema.minLength) && length < schema.minLength) {
      return issue("SCHEMA_MIN_LENGTH_MISMATCH", jsonPointer, "minLength");
    }
    if (Number.isInteger(schema.maxLength) && length > schema.maxLength) {
      return issue("SCHEMA_MAX_LENGTH_MISMATCH", jsonPointer, "maxLength");
    }
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) {
      return issue("SCHEMA_PATTERN_MISMATCH", jsonPointer, "pattern");
    }
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      return issue("SCHEMA_MINIMUM_MISMATCH", jsonPointer, "minimum");
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      return issue("SCHEMA_MAXIMUM_MISMATCH", jsonPointer, "maximum");
    }
  }
  return null;
}

function makeDiagnosticReceipt(candidate, diagnostic) {
  const canonicalCandidate = canonicalStringifyVedicInputStructuralRejectionValue(candidate);
  const candidateDigest = domainDigest(CANDIDATE_DIGEST_DOMAIN, candidate);
  const schemaIdentity = {
    canonicalBytes: EXPECTED_SCHEMA_CANONICAL_BYTES,
    canonicalSha256: EXPECTED_SCHEMA_CANONICAL_SHA256,
    schemaSemanticDigest: EXPECTED_SCHEMA_SEMANTIC_DIGEST
  };
  const receiptDiagnostic = {
    candidateDeclarationVerifiedAsWorldFact: false,
    code: diagnostic.code,
    draftSchemaShapeConforming: diagnostic.draftSchemaShapeConforming,
    dstClassificationVerified: false,
    ianaTimeZoneResolved: false,
    jsonPointer: diagnostic.jsonPointer,
    keyword: diagnostic.keyword,
    messageId: diagnostic.messageId,
    nonexistentWallTimeEstablished: false,
    stage: diagnostic.stage,
    timeResolutionPerformed: false,
    timezoneDatabaseConsulted: false
  };
  const receiptIdentityDigest = computeVedicInputStructuralDiagnosticReceiptIdentity({
    candidateIdentity: { canonicalDigest: candidateDigest },
    diagnostic: receiptDiagnostic,
    schemaIdentity
  });
  const receipt = deepFreezeJson({
    artifactOutputs: {
      acceptanceReceiptIssued: false,
      factArtifactIssued: false,
      factReceiptIssued: false,
      normalizedInputIssued: false,
      ruleReceiptIssued: false,
      successArtifactIssued: false,
      successReceiptIssued: false,
      timeResolutionReceiptIssued: false
    },
    authorityBoundary: {
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      formalAdmissionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false
    },
    candidateIdentity: {
      canonicalByteLength: Buffer.byteLength(canonicalCandidate, "utf8"),
      canonicalizationProfile: "sorted_object_keys_compact_json_finite_numbers_no_alias_v1",
      canonicalDigest: candidateDigest,
      digestIsAnonymous: false,
      digestIsSafeToPublish: false,
      digestAlgorithm: "SHA-256",
      digestDomain: CANDIDATE_DIGEST_DOMAIN,
      personalDataPresenceAssessed: false,
      rawInputPersisted: false
    },
    countsAsInputInstance: false,
    countsAsProductInputRejectionReceipt: false,
    countsTowardAdmission: false,
    diagnostic: receiptDiagnostic,
    inputAccepted: false,
    inputContractGateSatisfied: false,
    inputRejectionCapabilityEstablished: false,
    receiptClass: "structural_precheck_diagnostic_rejection_receipt",
    receiptId: "hakimi.vedic.structural-precheck-diagnostic/" + receiptIdentityDigest,
    receiptIdentity: {
      bindsCandidateSchemaAndDiagnostic: true,
      digest: receiptIdentityDigest,
      digestAlgorithm: "SHA-256",
      digestDomain: RECEIPT_IDENTITY_DIGEST_DOMAIN
    },
    receiptIsFactReceipt: false,
    receiptIsProductReceipt: false,
    receiptStatus: "diagnostic_rejected_not_product_admitted",
    requirementsResolved: 0,
    schemaIdentity
  });
  ISSUED_DIAGNOSTIC_RECEIPTS.add(receipt);
  return receipt;
}

export function computeVedicInputStructuralDiagnosticReceiptIdentity(receiptInput) {
  const receipt = capturePassiveJsonSnapshot(receiptInput);
  const candidateDigest = receipt?.candidateIdentity?.canonicalDigest;
  if (typeof candidateDigest !== "string" || !/^[0-9a-f]{64}$/u.test(candidateDigest)
    || !receipt?.diagnostic || typeof receipt.diagnostic !== "object" || Array.isArray(receipt.diagnostic)
    || !receipt?.schemaIdentity || typeof receipt.schemaIdentity !== "object"
    || Array.isArray(receipt.schemaIdentity)) {
    fail("RECEIPT_IDENTITY_INPUT_INVALID", "诊断 receipt identity 必须绑定 candidate、完整 diagnostic 与 schema identity。");
  }
  return domainDigest(RECEIPT_IDENTITY_DIGEST_DOMAIN, {
    candidateDigest,
    diagnostic: receipt.diagnostic,
    schemaIdentity: receipt.schemaIdentity
  });
}

export function executeVedicInputStructuralRejectionPrecheck(candidateInput, schemaInput) {
  const schema = requireApprovedDraftSchema(schemaInput);
  const candidate = utilTypes.isUint8Array(candidateInput)
    ? capturePassiveJsonSnapshot(parseVedicInputStructuralPrecheckCandidateJsonBytes(candidateInput))
    : capturePassiveJsonSnapshot(candidateInput);
  const structuralIssue = firstStructuralIssue(candidate, schema);
  if (structuralIssue !== null) {
    return makeDiagnosticReceipt(candidate, {
      ...structuralIssue,
      draftSchemaShapeConforming: false,
      messageId: "draft_schema_structural_rejection",
      stage: "draft_schema_structure"
    });
  }
  if (candidate.dst_gap_overlap_resolution?.classification === "gap"
    && candidate.dst_gap_overlap_resolution?.rejection_code === "nonexistent_local_wall_time") {
    return makeDiagnosticReceipt(candidate, {
      code: "DECLARED_DST_GAP_REJECTED",
      draftSchemaShapeConforming: true,
      jsonPointer: "/dst_gap_overlap_resolution",
      keyword: "declared_gap_branch",
      messageId: "candidate_declares_nonexistent_local_wall_time",
      stage: "candidate_declared_gap_boundary"
    });
  }
  return makeDiagnosticReceipt(candidate, {
    code: "INPUT_CONTRACT_NOT_ADMITTED",
    draftSchemaShapeConforming: true,
    jsonPointer: "",
    keyword: "admission_boundary",
    messageId: "isolated_draft_cannot_accept_input",
    stage: "admission_boundary"
  });
}

export function isTrustedVedicInputStructuralDiagnosticReceipt(value) {
  return value !== null && typeof value === "object" && ISSUED_DIAGNOSTIC_RECEIPTS.has(value);
}

function makeCompleteNoPersonProbe() {
  return {
    ayanamsa_identity_and_version: {
      ayanamsa_id: "probe-unselected",
      ayanamsa_version: "probe-unselected"
    },
    bhava_house_definition: {
      definition_id: "probe-unselected",
      definition_version: "probe-unselected"
    },
    birth_time_perturbation_candidates_and_transition_points: {
      candidate_instants: ["probe-instant"],
      policy_id: "probe-unselected",
      policy_version: "probe-unselected",
      transition_points: []
    },
    birth_time_uncertainty_interval_or_candidates: {
      model_id: "probe-unselected",
      model_version: "probe-unselected",
      representation: "exact"
    },
    civil_calendar_and_date: {
      calendar_id: "probe-unselected",
      calendar_version: "probe-unselected",
      day: 1,
      month: 1,
      year: 2000
    },
    contractVersion: "hakimi.vedic.input/0.1-draft",
    dst_gap_overlap_resolution: {
      classification: "unambiguous",
      resolution_policy_id: "probe-unselected",
      resolution_policy_version: "probe-unselected",
      utc_offset_seconds: 0
    },
    ephemeris_identity_version_and_coverage: {
      coverage_end: "probe-unbound",
      coverage_start: "probe-unbound",
      data_digest_sha256: "0".repeat(64),
      ephemeris_id: "probe-unselected",
      ephemeris_version: "probe-unselected"
    },
    iana_time_zone_and_tzdb_identity: {
      iana_time_zone_id: "probe-unbound",
      tzdb_version: "probe-unbound"
    },
    local_wall_time_and_precision: {
      precision_id: "probe-unselected",
      precision_version: "probe-unselected",
      wall_time_text: "probe-unbound"
    },
    place_coordinates_and_precision: {
      coordinate_reference_system_id: "probe-unselected",
      coordinate_reference_system_version: "probe-unselected",
      latitude_degrees: 0,
      longitude_degrees: 0,
      precision_meters: 0
    },
    rahu_ketu_mode: {
      mode: "mean",
      mode_definition_id: "probe-unselected",
      mode_definition_version: "probe-unselected"
    },
    sidereal_zodiac_declaration: {
      zodiac_id: "probe-unselected",
      zodiac_version: "probe-unselected"
    },
    utc_conversion_and_time_scale: {
      conversion_id: "probe-unselected",
      conversion_version: "probe-unselected",
      input_time_scale_id: "probe-unselected",
      input_time_scale_version: "probe-unselected",
      output_time_scale_id: "probe-unselected",
      output_time_scale_version: "probe-unselected"
    }
  };
}

function cloneTrustedProbe(value) {
  return JSON_PARSE(JSON_STRINGIFY(value));
}

function buildFixedProbes() {
  const complete = makeCompleteNoPersonProbe();
  const missing = cloneTrustedProbe(complete);
  delete missing.civil_calendar_and_date;
  const invalidDigest = cloneTrustedProbe(complete);
  invalidDigest.ephemeris_identity_version_and_coverage.data_digest_sha256 = "0".repeat(63);
  const gap = cloneTrustedProbe(complete);
  gap.dst_gap_overlap_resolution = {
    classification: "gap",
    rejection_code: "nonexistent_local_wall_time",
    resolution_policy_id: "probe-unselected",
    resolution_policy_version: "probe-unselected"
  };
  return [
    { candidate: missing, probeId: PROBE_IDS[0] },
    { candidate: invalidDigest, probeId: PROBE_IDS[1] },
    { candidate: gap, probeId: PROBE_IDS[2] },
    { candidate: complete, probeId: PROBE_IDS[3] }
  ];
}

export function buildFixedVedicInputStructuralRejectionProbes() {
  return deepFreezeJson(buildFixedProbes());
}

export const vedicInputStructuralRejectionExecutionTestOnly = Object.freeze({
  candidateDigestDomain: CANDIDATE_DIGEST_DOMAIN,
  expectedDiagnostics: EXPECTED_DIAGNOSTICS,
  expectedSchemaIdentity: Object.freeze({
    canonicalBytes: EXPECTED_SCHEMA_CANONICAL_BYTES,
    canonicalSha256: EXPECTED_SCHEMA_CANONICAL_SHA256,
    schemaSemanticDigest: EXPECTED_SCHEMA_SEMANTIC_DIGEST
  }),
  receiptIdentityDigestDomain: RECEIPT_IDENTITY_DIGEST_DOMAIN,
  makeCompleteNoPersonProbe,
  maxCandidateBytes: MAX_CANDIDATE_BYTES,
  probeIds: PROBE_IDS
});
