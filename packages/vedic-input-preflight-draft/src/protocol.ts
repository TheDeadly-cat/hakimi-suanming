export const VEDIC_INPUT_PREFLIGHT_PROTOCOL =
  "hakimi.vedic.input-preflight-browser/0.1-draft" as const;

export const VEDIC_INPUT_PREFLIGHT_ACTION = "run_fixed_no_person_probes" as const;

export const CURRENT_VEDIC_INPUT_DRAFT_IDENTITY = Object.freeze({
  canonicalBytes: 9_766,
  canonicalSha256: "03afcae3e276ce7d84b1be321185431ea4e8d95fcba02063ecb29a42e10d6a1f",
  schemaSemanticDigest: "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08"
} as const);

export type VedicInputDraftSchemaIdentity = typeof CURRENT_VEDIC_INPUT_DRAFT_IDENTITY;

export type VedicInputPreflightDiagnostic = Readonly<{
  candidateDeclarationVerifiedAsWorldFact: false;
  code:
    | "SCHEMA_REQUIRED_PROPERTY_MISSING"
    | "SCHEMA_PATTERN_MISMATCH"
    | "DECLARED_DST_GAP_REJECTED"
    | "INPUT_CONTRACT_NOT_ADMITTED";
  draftSchemaShapeConforming: boolean;
  dstClassificationVerified: false;
  ianaTimeZoneResolved: false;
  jsonPointer: string;
  keyword: string;
  messageId: string;
  nonexistentWallTimeEstablished: false;
  stage:
    | "draft_schema_structure"
    | "candidate_declared_gap_boundary"
    | "admission_boundary";
  timeResolutionPerformed: false;
  timezoneDatabaseConsulted: false;
}>;

export type VedicInputPreflightProbeId =
  | "missing_required_root_field"
  | "invalid_ephemeris_digest_shape"
  | "declared_dst_gap"
  | "structurally_complete_contract_not_admitted";

export type VedicInputPreflightProbeResult = Readonly<{
  diagnostic: VedicInputPreflightDiagnostic;
  probeId: VedicInputPreflightProbeId;
  receiptId: `hakimi.vedic.structural-precheck-diagnostic/${string}`;
}>;

export type VedicInputPreflightResult = Readonly<{
  acceptedInputs: 0;
  authorityBoundary: Readonly<{
    contentTruthEstablished: false;
    domainAuthorityAuthorized: false;
    expertClaimsAuthorized: false;
    expertTruthEstablished: false;
    formalAdmissionAuthorized: false;
    publicDeploymentAuthorized: false;
    publicReleaseAuthorized: false;
    releaseReady: false;
    rightsLegalConclusionEstablished: false;
  }>;
  diagnosticProbeExecutions: 4;
  inputContractGateSatisfied: false;
  inputInstances: 0;
  inputRejectionCapabilityEstablished: false;
  probeClass: "project_controlled_fixed_no_person_shape_only";
  probeCoverageComplete: false;
  probeResults: readonly VedicInputPreflightProbeResult[];
  productInputRejectionReceipts: 0;
  schemaIdentity: VedicInputDraftSchemaIdentity;
  status: "four_fixed_diagnostic_rejection_probes_verified_not_product_admitted";
}>;

export type VedicInputPreflightWorkerRequest = Readonly<{
  action: typeof VEDIC_INPUT_PREFLIGHT_ACTION;
  protocolVersion: typeof VEDIC_INPUT_PREFLIGHT_PROTOCOL;
  requestId: string;
}>;

export type VedicInputPreflightWorkerResponse = Readonly<{
  action: typeof VEDIC_INPUT_PREFLIGHT_ACTION;
  ok: true;
  protocolVersion: typeof VEDIC_INPUT_PREFLIGHT_PROTOCOL;
  requestId: string;
  result: VedicInputPreflightResult;
}> | Readonly<{
  action: typeof VEDIC_INPUT_PREFLIGHT_ACTION;
  error: Readonly<{ code: "PREFLIGHT_EXECUTION_FAILED" | "PREFLIGHT_REQUEST_INVALID" }>;
  ok: false;
  protocolVersion: typeof VEDIC_INPUT_PREFLIGHT_PROTOCOL;
  requestId: string | null;
}>;

type JsonPrimitive = null | boolean | number | string;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const ARRAY_IS_ARRAY = Array.isArray;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS = Object.is;
const OBJECT_KEYS = Object.keys;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REQUEST_ID_PATTERN = /^[0-9a-f]{32}$/u;

function freezeTrustedJson<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeTrustedJson(child);
  return Object.freeze(value);
}

const EXPECTED_PROBES = freezeTrustedJson([
  {
    diagnostic: {
      candidateDeclarationVerifiedAsWorldFact: false,
      code: "SCHEMA_REQUIRED_PROPERTY_MISSING",
      draftSchemaShapeConforming: false,
      dstClassificationVerified: false,
      ianaTimeZoneResolved: false,
      jsonPointer: "/civil_calendar_and_date",
      keyword: "required",
      messageId: "draft_schema_structural_rejection",
      nonexistentWallTimeEstablished: false,
      stage: "draft_schema_structure",
      timeResolutionPerformed: false,
      timezoneDatabaseConsulted: false
    },
    probeId: "missing_required_root_field",
    receiptId: "hakimi.vedic.structural-precheck-diagnostic/178b527a30396579060f4d3978c55a3e1c1e6a99d386db202d03963460124264"
  },
  {
    diagnostic: {
      candidateDeclarationVerifiedAsWorldFact: false,
      code: "SCHEMA_PATTERN_MISMATCH",
      draftSchemaShapeConforming: false,
      dstClassificationVerified: false,
      ianaTimeZoneResolved: false,
      jsonPointer: "/ephemeris_identity_version_and_coverage/data_digest_sha256",
      keyword: "pattern",
      messageId: "draft_schema_structural_rejection",
      nonexistentWallTimeEstablished: false,
      stage: "draft_schema_structure",
      timeResolutionPerformed: false,
      timezoneDatabaseConsulted: false
    },
    probeId: "invalid_ephemeris_digest_shape",
    receiptId: "hakimi.vedic.structural-precheck-diagnostic/e50cfc73e274c7e5c6c2cf0795a7a7ad4fc20fb5e01f9625a82daa993b3fc174"
  },
  {
    diagnostic: {
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
    },
    probeId: "declared_dst_gap",
    receiptId: "hakimi.vedic.structural-precheck-diagnostic/023ab8cd7779b2d7c43e5314761cab9c4fdc8c7a093bcf2399c97276a968b112"
  },
  {
    diagnostic: {
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
    },
    probeId: "structurally_complete_contract_not_admitted",
    receiptId: "hakimi.vedic.structural-precheck-diagnostic/d7c048b5ba968ea7ae795f9116d7bedd5af5c1693acac3cc3769b86ff55c5dc0"
  }
] as const satisfies readonly VedicInputPreflightProbeResult[]);

export const EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT = freezeTrustedJson({
  acceptedInputs: 0,
  authorityBoundary: {
    contentTruthEstablished: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    expertTruthEstablished: false,
    formalAdmissionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false
  },
  diagnosticProbeExecutions: 4,
  inputContractGateSatisfied: false,
  inputInstances: 0,
  inputRejectionCapabilityEstablished: false,
  probeClass: "project_controlled_fixed_no_person_shape_only",
  probeCoverageComplete: false,
  probeResults: EXPECTED_PROBES,
  productInputRejectionReceipts: 0,
  schemaIdentity: CURRENT_VEDIC_INPUT_DRAFT_IDENTITY,
  status: "four_fixed_diagnostic_rejection_probes_verified_not_product_admitted"
} as const satisfies VedicInputPreflightResult);

export class VedicInputPreflightProtocolError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VedicInputPreflightProtocolError";
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new VedicInputPreflightProtocolError(code, message);
}

function captureJson(value: unknown, seen: WeakSet<object>, depth: number): JsonValue {
  if (depth > 64) fail("PROTOCOL_VALUE_INVALID", "Worker 协议值超过最大深度。");
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("PROTOCOL_VALUE_INVALID", "Worker 协议包含非规范 JSON 数值。");
    }
    return value;
  }
  if (typeof value !== "object") fail("PROTOCOL_VALUE_INVALID", "Worker 协议只接受 JSON 值。");
  if (seen.has(value)) fail("PROTOCOL_VALUE_INVALID", "Worker 协议不接受循环或共享对象别名。");
  seen.add(value);
  let descriptors: PropertyDescriptorMap;
  let prototype: object | null;
  try {
    descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    prototype = OBJECT_GET_PROTOTYPE_OF(value);
  } catch {
    fail("PROTOCOL_VALUE_INVALID", "Worker 协议对象无法被动读取。");
  }
  const keys = REFLECT_OWN_KEYS(descriptors);
  if (keys.some((key) => typeof key === "symbol")) {
    fail("PROTOCOL_VALUE_INVALID", "Worker 协议不接受 Symbol 字段。");
  }
  if (ARRAY_IS_ARRAY(value)) {
    if (prototype !== Array.prototype) fail("PROTOCOL_VALUE_INVALID", "Worker 协议数组原型无效。");
    const lengthDescriptor = descriptors.length;
    const length = lengthDescriptor?.value;
    if (lengthDescriptor?.get || lengthDescriptor?.set
      || !Number.isSafeInteger(length) || length < 0 || length > 100) {
      fail("PROTOCOL_VALUE_INVALID", "Worker 协议数组长度无效。");
    }
    const output: JsonValue[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("PROTOCOL_VALUE_INVALID", "Worker 协议不接受稀疏数组或访问器元素。");
      }
      output.push(captureJson(descriptor.value, seen, depth + 1));
    }
    if (keys.length !== length + 1) fail("PROTOCOL_VALUE_INVALID", "Worker 协议数组包含额外字段。");
    return output;
  }
  if (prototype !== Object.prototype) fail("PROTOCOL_VALUE_INVALID", "Worker 协议对象原型无效。");
  const entries: [string, JsonValue][] = [];
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
      fail("PROTOCOL_VALUE_INVALID", "Worker 协议不接受访问器或隐藏字段。");
    }
    entries.push([key, captureJson(descriptor.value, seen, depth + 1)]);
  }
  return Object.fromEntries(entries);
}

function captureJsonSnapshot(value: unknown): JsonValue {
  return captureJson(value, new WeakSet(), 0);
}

function exactJson(left: unknown, right: unknown): boolean {
  try {
    const leftSnapshot = captureJsonSnapshot(left);
    const rightSnapshot = captureJsonSnapshot(right);
    return JSON_STRINGIFY(leftSnapshot, sortedKeys(leftSnapshot))
      === JSON_STRINGIFY(rightSnapshot, sortedKeys(rightSnapshot));
  } catch {
    return false;
  }
}

function sortedKeys(value: JsonValue): string[] | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const keys = new Set<string>();
  const stack: JsonValue[] = [value];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === null || typeof current !== "object") continue;
    if (ARRAY_IS_ARRAY(current)) {
      for (const child of current) stack.push(child);
      continue;
    }
    for (const key of OBJECT_KEYS(current)) {
      keys.add(key);
      stack.push(current[key]!);
    }
  }
  return [...keys].sort();
}

function requireExactKeys(record: Record<string, JsonValue>, expected: readonly string[]): void {
  const actual = OBJECT_KEYS(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("PROTOCOL_KEYS_INVALID", "Worker 协议包含缺失、陈旧或额外字段。");
  }
}

function requireRecord(value: JsonValue): Record<string, JsonValue> {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail("PROTOCOL_VALUE_INVALID", "Worker 协议信封必须是对象。");
  }
  return value;
}

export function createVedicInputPreflightRequest(requestId: string): VedicInputPreflightWorkerRequest {
  if (!REQUEST_ID_PATTERN.test(requestId)) fail("REQUEST_ID_INVALID", "Worker requestId 无效。");
  return Object.freeze({
    action: VEDIC_INPUT_PREFLIGHT_ACTION,
    protocolVersion: VEDIC_INPUT_PREFLIGHT_PROTOCOL,
    requestId
  });
}

export function requireVedicInputPreflightRequest(candidate: unknown): VedicInputPreflightWorkerRequest {
  const record = requireRecord(captureJsonSnapshot(candidate));
  requireExactKeys(record, ["action", "protocolVersion", "requestId"]);
  if (record.action !== VEDIC_INPUT_PREFLIGHT_ACTION
    || record.protocolVersion !== VEDIC_INPUT_PREFLIGHT_PROTOCOL
    || typeof record.requestId !== "string"
    || !REQUEST_ID_PATTERN.test(record.requestId)) {
    fail("PREFLIGHT_REQUEST_INVALID", "Worker 请求协议、动作或身份无效。");
  }
  return createVedicInputPreflightRequest(record.requestId);
}

export function requireExactVedicInputPreflightResult(candidate: unknown): VedicInputPreflightResult {
  const snapshot = captureJsonSnapshot(candidate);
  if (!exactJson(snapshot, EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT)) {
    fail("PREFLIGHT_RESULT_INVALID", "Worker 结果未精确保持固定四探针和全红边界。");
  }
  return freezeTrustedJson(snapshot) as unknown as VedicInputPreflightResult;
}

export function createVedicInputPreflightSuccessResponse(
  requestId: string,
  result: unknown
): Extract<VedicInputPreflightWorkerResponse, { ok: true }> {
  const request = createVedicInputPreflightRequest(requestId);
  return freezeTrustedJson({
    action: VEDIC_INPUT_PREFLIGHT_ACTION,
    ok: true,
    protocolVersion: VEDIC_INPUT_PREFLIGHT_PROTOCOL,
    requestId: request.requestId,
    result: requireExactVedicInputPreflightResult(result)
  });
}

export function createVedicInputPreflightFailureResponse(
  requestId: string | null,
  code: "PREFLIGHT_EXECUTION_FAILED" | "PREFLIGHT_REQUEST_INVALID"
): Extract<VedicInputPreflightWorkerResponse, { ok: false }> {
  if (requestId !== null && !REQUEST_ID_PATTERN.test(requestId)) requestId = null;
  return freezeTrustedJson({
    action: VEDIC_INPUT_PREFLIGHT_ACTION,
    error: { code },
    ok: false,
    protocolVersion: VEDIC_INPUT_PREFLIGHT_PROTOCOL,
    requestId
  });
}

export function requireVedicInputPreflightResponse(
  candidate: unknown,
  expectedRequestId: string
): VedicInputPreflightResult {
  createVedicInputPreflightRequest(expectedRequestId);
  const record = requireRecord(captureJsonSnapshot(candidate));
  if (record.ok === true) {
    requireExactKeys(record, ["action", "ok", "protocolVersion", "requestId", "result"]);
    if (record.action !== VEDIC_INPUT_PREFLIGHT_ACTION
      || record.protocolVersion !== VEDIC_INPUT_PREFLIGHT_PROTOCOL
      || record.requestId !== expectedRequestId) {
      fail("PREFLIGHT_RESPONSE_BINDING_INVALID", "Worker 响应未绑定当前请求。");
    }
    return requireExactVedicInputPreflightResult(record.result);
  }
  if (record.ok === false) {
    requireExactKeys(record, ["action", "error", "ok", "protocolVersion", "requestId"]);
    const error = requireRecord(record.error);
    requireExactKeys(error, ["code"]);
    if (record.action !== VEDIC_INPUT_PREFLIGHT_ACTION
      || record.protocolVersion !== VEDIC_INPUT_PREFLIGHT_PROTOCOL
      || record.requestId !== expectedRequestId
      || (error.code !== "PREFLIGHT_EXECUTION_FAILED" && error.code !== "PREFLIGHT_REQUEST_INVALID")) {
      fail("PREFLIGHT_RESPONSE_BINDING_INVALID", "Worker 失败响应未绑定当前请求。");
    }
    fail("PREFLIGHT_WORKER_REJECTED", `Worker 失败关闭：${error.code}`);
  }
  fail("PREFLIGHT_RESPONSE_INVALID", "Worker 响应 outcome 无效。");
}
