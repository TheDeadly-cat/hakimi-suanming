import {
  CURRENT_VEDIC_INPUT_DRAFT_IDENTITY,
  EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT,
  requireExactVedicInputPreflightResult,
  type VedicInputDraftSchemaIdentity,
  type VedicInputPreflightDiagnostic,
  type VedicInputPreflightProbeId,
  type VedicInputPreflightProbeResult,
  type VedicInputPreflightResult
} from "./protocol.ts";

const CANDIDATE_DIGEST_DOMAIN = "hakimi.vedic.input-structural-precheck-candidate.v1";
const RECEIPT_IDENTITY_DIGEST_DOMAIN =
  "hakimi.vedic.input-structural-precheck-diagnostic-receipt-identity.v1";
const SCHEMA_SEMANTIC_DIGEST_DOMAIN = "hakimi.vedic.input-contract-draft.semantic.v0.1.0";
const ARRAY_IS_ARRAY = Array.isArray;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS = Object.is;
const OBJECT_KEYS = Object.keys;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const TEXT_ENCODER = new TextEncoder();

type JsonPrimitive = null | boolean | number | string;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

type StructuralIssue = Readonly<{
  code: string;
  jsonPointer: string;
  keyword: string;
}>;

export type VedicInputDraftSchemaBundle = Readonly<{
  identity: VedicInputDraftSchemaIdentity;
  schema: unknown;
}>;

export class VedicInputPreflightError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VedicInputPreflightError";
    this.code = code;
  }
}

function fail(code: string, message: string, cause?: unknown): never {
  throw new VedicInputPreflightError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function captureJson(
  value: unknown,
  state: { readonly active: WeakSet<object>; readonly seen: WeakSet<object>; nodes: number },
  depth: number
): JsonValue {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "吠陀预检材料超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 50_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "吠陀预检材料超过节点上限。");
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("INPUT_VALUE_INVALID", "吠陀预检材料包含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "吠陀预检材料只接受 JSON 值。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "吠陀预检材料不接受循环引用。");
  if (state.seen.has(value)) fail("INPUT_ALIAS_FORBIDDEN", "吠陀预检材料不接受共享对象别名。");
  state.active.add(value);
  state.seen.add(value);
  try {
    let descriptors: PropertyDescriptorMap;
    let prototype: object | null;
    try {
      descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
      prototype = OBJECT_GET_PROTOTYPE_OF(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "吠陀预检材料无法被动捕获。", cause);
    }
    const keys = REFLECT_OWN_KEYS(descriptors);
    if (keys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "吠陀预检材料不接受 Symbol 字段。");
    }
    if (ARRAY_IS_ARRAY(value)) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀预检数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 20_000) {
        fail("INPUT_ARRAY_INVALID", "吠陀预检数组长度无效。");
      }
      if (keys.length !== length + 1) fail("INPUT_ARRAY_INVALID", "吠陀预检数组包含额外字段。");
      const result: JsonValue[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "吠陀预检不接受稀疏数组或访问器元素。");
        }
        result.push(captureJson(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "吠陀预检对象原型无效。");
    const entries: [string, JsonValue][] = [];
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "吠陀预检不接受访问器或隐藏字段。");
      }
      entries.push([key, captureJson(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function captureJsonSnapshot(value: unknown): JsonValue {
  return captureJson(value, {
    active: new WeakSet(),
    nodes: 0,
    seen: new WeakSet()
  }, 0);
}

function canonicalValue(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") return value;
  if (ARRAY_IS_ARRAY(value)) return value.map(canonicalValue);
  return Object.fromEntries(
    OBJECT_KEYS(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key]!)])
  );
}

function canonicalStringify(value: unknown): string {
  return JSON_STRINGIFY(canonicalValue(captureJsonSnapshot(value)));
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") {
    fail("WEB_CRYPTO_UNAVAILABLE", "当前浏览器没有可用的 Web Crypto SHA-256。");
  }
  try {
    return bytesToHex(await subtle.digest("SHA-256", TEXT_ENCODER.encode(text)));
  } catch (cause) {
    fail("WEB_CRYPTO_FAILED", "Web Crypto SHA-256 计算失败。", cause);
  }
}

async function domainDigest(domain: string, value: unknown): Promise<string> {
  return sha256Hex(`${domain}\0${canonicalStringify(value)}`);
}

function requireExactIdentity(identityInput: unknown): VedicInputDraftSchemaIdentity {
  const identity = captureJsonSnapshot(identityInput);
  if (identity === null || typeof identity !== "object" || ARRAY_IS_ARRAY(identity)) {
    fail("SCHEMA_IDENTITY_INVALID", "构建注入的 schema identity 必须是对象。");
  }
  const keys = OBJECT_KEYS(identity).sort(compareCodeUnits);
  if (keys.join("\0") !== "canonicalBytes\0canonicalSha256\0schemaSemanticDigest"
    || identity.canonicalBytes !== CURRENT_VEDIC_INPUT_DRAFT_IDENTITY.canonicalBytes
    || identity.canonicalSha256 !== CURRENT_VEDIC_INPUT_DRAFT_IDENTITY.canonicalSha256
    || identity.schemaSemanticDigest !== CURRENT_VEDIC_INPUT_DRAFT_IDENTITY.schemaSemanticDigest) {
    fail("SCHEMA_IDENTITY_INVALID", "构建注入的 schema identity 不是当前 Vedic input draft。");
  }
  return CURRENT_VEDIC_INPUT_DRAFT_IDENTITY;
}

function semanticProjection(schema: JsonObject): JsonObject {
  const properties = schema.properties;
  const contract = properties !== null && typeof properties === "object" && !ARRAY_IS_ARRAY(properties)
    ? properties.contractVersion
    : undefined;
  const contractVersion = contract !== null && typeof contract === "object" && !ARRAY_IS_ARRAY(contract)
    ? contract.const
    : undefined;
  if (contractVersion === undefined) fail("SCHEMA_IDENTITY_INVALID", "Vedic input draft 缺少 contractVersion。");
  return {
    boundary: schema["x-hakimiBoundary"]!,
    contractVersion,
    properties: schema.properties!,
    required: schema.required!,
    rootAdditionalProperties: schema.additionalProperties!,
    rootType: schema.type!,
    schemaId: schema.$id!,
    schemaStandard: schema.$schema!
  };
}

async function requireCurrentSchema(bundle: VedicInputDraftSchemaBundle): Promise<{
  readonly identity: VedicInputDraftSchemaIdentity;
  readonly schema: JsonObject;
}> {
  const identity = requireExactIdentity(bundle.identity);
  const schemaValue = captureJsonSnapshot(bundle.schema);
  if (schemaValue === null || typeof schemaValue !== "object" || ARRAY_IS_ARRAY(schemaValue)) {
    fail("SCHEMA_IDENTITY_INVALID", "构建注入的 Vedic input draft schema 必须是对象。");
  }
  const canonical = canonicalStringify(schemaValue);
  const encoded = TEXT_ENCODER.encode(canonical);
  const [canonicalSha256, semanticDigest] = await Promise.all([
    sha256Hex(canonical),
    domainDigest(SCHEMA_SEMANTIC_DIGEST_DOMAIN, semanticProjection(schemaValue))
  ]);
  if (encoded.byteLength !== identity.canonicalBytes
    || canonicalSha256 !== identity.canonicalSha256
    || semanticDigest !== identity.schemaSemanticDigest) {
    fail("SCHEMA_IDENTITY_INVALID", "构建注入的 Vedic input draft canonical identity 漂移。");
  }
  return { identity, schema: schemaValue };
}

function escapeJsonPointerSegment(segment: string | number): string {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function childPointer(parent: string, segment: string | number): string {
  return `${parent}/${escapeJsonPointerSegment(segment)}`;
}

function exactJson(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function issue(code: string, jsonPointer: string, keyword: string): StructuralIssue {
  return Object.freeze({ code, jsonPointer, keyword });
}

function typeMatches(value: JsonValue, type: JsonValue): boolean {
  if (type === "object") return value !== null && typeof value === "object" && !ARRAY_IS_ARRAY(value);
  if (type === "array") return ARRAY_IS_ARRAY(value);
  if (type === "string") return typeof value === "string";
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && NUMBER_IS_FINITE(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  fail("SCHEMA_KEYWORD_UNSUPPORTED", "Vedic input draft 使用了未支持的 schema type。");
}

function firstStructuralIssue(value: JsonValue, schemaValue: JsonValue, pointer = ""): StructuralIssue | null {
  if (schemaValue === null || typeof schemaValue !== "object" || ARRAY_IS_ARRAY(schemaValue)) {
    fail("SCHEMA_KEYWORD_UNSUPPORTED", "Vedic input draft schema 节点无效。");
  }
  const schema = schemaValue;
  if (ARRAY_IS_ARRAY(schema.oneOf)) {
    const matching = schema.oneOf
      .map((branch) => firstStructuralIssue(value, branch, pointer))
      .filter((entry) => entry === null).length;
    if (matching !== 1) return issue("SCHEMA_ONE_OF_MISMATCH", pointer, "oneOf");
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const") && !exactJson(value, schema.const)) {
    return issue("SCHEMA_CONST_MISMATCH", pointer, "const");
  }
  if (ARRAY_IS_ARRAY(schema.enum) && !schema.enum.some((entry) => exactJson(value, entry))) {
    return issue("SCHEMA_ENUM_MISMATCH", pointer, "enum");
  }
  if (typeof schema.type === "string" && !typeMatches(value, schema.type)) {
    return issue("SCHEMA_TYPE_MISMATCH", pointer, "type");
  }
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
      return issue("SCHEMA_TYPE_MISMATCH", pointer, "type");
    }
    const required = ARRAY_IS_ARRAY(schema.required) ? schema.required : [];
    for (const key of required) {
      if (typeof key !== "string") fail("SCHEMA_KEYWORD_UNSUPPORTED", "required 字段无效。");
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        return issue("SCHEMA_REQUIRED_PROPERTY_MISSING", childPointer(pointer, key), "required");
      }
    }
    const properties = schema.properties;
    const propertyMap = properties !== null && typeof properties === "object" && !ARRAY_IS_ARRAY(properties)
      ? properties
      : {};
    if (schema.additionalProperties === false) {
      const extra = OBJECT_KEYS(value).filter((key) => !Object.prototype.hasOwnProperty.call(propertyMap, key))
        .sort(compareCodeUnits)[0];
      if (extra !== undefined) return issue("SCHEMA_ADDITIONAL_PROPERTY_FORBIDDEN", pointer, "additionalProperties");
    }
    for (const key of OBJECT_KEYS(value).sort(compareCodeUnits)) {
      if (!Object.prototype.hasOwnProperty.call(propertyMap, key)) continue;
      const nested = firstStructuralIssue(value[key]!, propertyMap[key]!, childPointer(pointer, key));
      if (nested !== null) return nested;
    }
  }
  if (schema.type === "array") {
    if (!ARRAY_IS_ARRAY(value)) return issue("SCHEMA_TYPE_MISMATCH", pointer, "type");
    if (Number.isInteger(schema.minItems) && value.length < (schema.minItems as number)) {
      return issue("SCHEMA_MIN_ITEMS_MISMATCH", pointer, "minItems");
    }
    if (Number.isInteger(schema.maxItems) && value.length > (schema.maxItems as number)) {
      return issue("SCHEMA_MAX_ITEMS_MISMATCH", pointer, "maxItems");
    }
    if (schema.uniqueItems === true) {
      const seen = new Set<string>();
      for (let index = 0; index < value.length; index += 1) {
        const identity = canonicalStringify(value[index]);
        if (seen.has(identity)) return issue("SCHEMA_UNIQUE_ITEMS_MISMATCH", childPointer(pointer, index), "uniqueItems");
        seen.add(identity);
      }
    }
    if (schema.items !== null && typeof schema.items === "object" && !ARRAY_IS_ARRAY(schema.items)) {
      for (let index = 0; index < value.length; index += 1) {
        const nested = firstStructuralIssue(value[index]!, schema.items, childPointer(pointer, index));
        if (nested !== null) return nested;
      }
    }
  }
  if (typeof value === "string") {
    const length = [...value].length;
    if (Number.isInteger(schema.minLength) && length < (schema.minLength as number)) {
      return issue("SCHEMA_MIN_LENGTH_MISMATCH", pointer, "minLength");
    }
    if (Number.isInteger(schema.maxLength) && length > (schema.maxLength as number)) {
      return issue("SCHEMA_MAX_LENGTH_MISMATCH", pointer, "maxLength");
    }
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) {
      return issue("SCHEMA_PATTERN_MISMATCH", pointer, "pattern");
    }
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      return issue("SCHEMA_MINIMUM_MISMATCH", pointer, "minimum");
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      return issue("SCHEMA_MAXIMUM_MISMATCH", pointer, "maximum");
    }
  }
  return null;
}

function makeCompleteNoPersonProbe(): JsonObject {
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

function cloneTrusted<T>(value: T): T {
  return JSON.parse(JSON_STRINGIFY(value)) as T;
}

function buildFixedProbes(): readonly Readonly<{ candidate: JsonObject; probeId: VedicInputPreflightProbeId }>[] {
  const complete = makeCompleteNoPersonProbe();
  const missing = cloneTrusted(complete);
  delete missing.civil_calendar_and_date;
  const invalidDigest = cloneTrusted(complete);
  (invalidDigest.ephemeris_identity_version_and_coverage as JsonObject).data_digest_sha256 = "0".repeat(63);
  const gap = cloneTrusted(complete);
  gap.dst_gap_overlap_resolution = {
    classification: "gap",
    rejection_code: "nonexistent_local_wall_time",
    resolution_policy_id: "probe-unselected",
    resolution_policy_version: "probe-unselected"
  };
  return [
    { candidate: missing, probeId: "missing_required_root_field" },
    { candidate: invalidDigest, probeId: "invalid_ephemeris_digest_shape" },
    { candidate: gap, probeId: "declared_dst_gap" },
    { candidate: complete, probeId: "structurally_complete_contract_not_admitted" }
  ];
}

function diagnosticFor(candidate: JsonObject, schema: JsonObject): VedicInputPreflightDiagnostic {
  const structuralIssue = firstStructuralIssue(candidate, schema);
  if (structuralIssue !== null) {
    return {
      candidateDeclarationVerifiedAsWorldFact: false,
      code: structuralIssue.code as VedicInputPreflightDiagnostic["code"],
      draftSchemaShapeConforming: false,
      dstClassificationVerified: false,
      ianaTimeZoneResolved: false,
      jsonPointer: structuralIssue.jsonPointer,
      keyword: structuralIssue.keyword,
      messageId: "draft_schema_structural_rejection",
      nonexistentWallTimeEstablished: false,
      stage: "draft_schema_structure",
      timeResolutionPerformed: false,
      timezoneDatabaseConsulted: false
    };
  }
  const dst = candidate.dst_gap_overlap_resolution;
  if (dst !== null && typeof dst === "object" && !ARRAY_IS_ARRAY(dst)
    && dst.classification === "gap" && dst.rejection_code === "nonexistent_local_wall_time") {
    return {
      candidateDeclarationVerifiedAsWorldFact: false,
      code: "DECLARED_DST_GAP_REJECTED",
      draftSchemaShapeConforming: true,
      dstClassificationVerified: false,
      ianaTimeZoneResolved: false,
      jsonPointer: "/dst_gap_overlap_resolution",
      keyword: "declared_gap_branch",
      messageId: "candidate_declares_nonexistent_local_wall_time",
      nonexistentWallTimeEstablished: false,
      stage: "candidate_declared_gap_boundary",
      timeResolutionPerformed: false,
      timezoneDatabaseConsulted: false
    };
  }
  return {
    candidateDeclarationVerifiedAsWorldFact: false,
    code: "INPUT_CONTRACT_NOT_ADMITTED",
    draftSchemaShapeConforming: true,
    dstClassificationVerified: false,
    ianaTimeZoneResolved: false,
    jsonPointer: "",
    keyword: "admission_boundary",
    messageId: "isolated_draft_cannot_accept_input",
    nonexistentWallTimeEstablished: false,
    stage: "admission_boundary",
    timeResolutionPerformed: false,
    timezoneDatabaseConsulted: false
  };
}

async function executeFixedProbe(
  probeId: VedicInputPreflightProbeId,
  candidate: JsonObject,
  schema: JsonObject,
  schemaIdentity: VedicInputDraftSchemaIdentity
): Promise<VedicInputPreflightProbeResult> {
  const diagnostic = diagnosticFor(candidate, schema);
  const candidateDigest = await domainDigest(CANDIDATE_DIGEST_DOMAIN, candidate);
  const receiptDigest = await domainDigest(RECEIPT_IDENTITY_DIGEST_DOMAIN, {
    candidateDigest,
    diagnostic,
    schemaIdentity
  });
  if (!SHA256_PATTERN.test(candidateDigest) || !SHA256_PATTERN.test(receiptDigest)) {
    fail("DIGEST_INVALID", "固定探针摘要无效。");
  }
  return {
    diagnostic,
    probeId,
    receiptId: `hakimi.vedic.structural-precheck-diagnostic/${receiptDigest}`
  };
}

/**
 * Execute only the four project-controlled, no-person probes. This API does not
 * accept a caller candidate and cannot issue an accepted input or product receipt.
 */
export async function runFixedVedicInputPreflight(
  bundle: VedicInputDraftSchemaBundle
): Promise<VedicInputPreflightResult> {
  const { identity, schema } = await requireCurrentSchema(bundle);
  const probeResults: VedicInputPreflightProbeResult[] = [];
  for (const probe of buildFixedProbes()) {
    probeResults.push(await executeFixedProbe(probe.probeId, probe.candidate, schema, identity));
  }
  const result = {
    acceptedInputs: 0,
    authorityBoundary: cloneTrusted(EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT.authorityBoundary),
    diagnosticProbeExecutions: 4,
    inputContractGateSatisfied: false,
    inputInstances: 0,
    inputRejectionCapabilityEstablished: false,
    probeClass: "project_controlled_fixed_no_person_shape_only",
    probeCoverageComplete: false,
    probeResults,
    productInputRejectionReceipts: 0,
    schemaIdentity: identity,
    status: "four_fixed_diagnostic_rejection_probes_verified_not_product_admitted"
  } as const;
  return requireExactVedicInputPreflightResult(result);
}
