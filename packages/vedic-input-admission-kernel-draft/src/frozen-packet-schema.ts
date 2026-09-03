import {
  VEDIC_CANONICALIZATION_PROFILE,
  VEDIC_CONDITION_IDS,
  VEDIC_CONDITION_SET_DIGEST_DOMAIN,
  VEDIC_GOVERNANCE_PACKET_SCHEMA_VERSION,
  VEDIC_INVARIANT_IDS,
  VEDIC_INVARIANT_SET_DIGEST_DOMAIN,
  VEDIC_PACKET_DIGEST_DOMAIN,
  VEDIC_PACKET_MANIFEST_DIGEST_DOMAIN,
  VEDIC_PRIVACY_PROJECTION_DIGEST_DOMAIN,
  VEDIC_READINESS_CANDIDATE_DIGEST,
  VEDIC_REQUIREMENT_IDS,
  VEDIC_REQUIREMENT_SET_DIGEST_DOMAIN,
  VEDIC_REVIEW_CONTENT_DIGEST_FIELDS,
  VEDIC_REVIEW_CONTENT_MANIFEST_DIGEST_DOMAIN,
  VEDIC_TRANSITION_CONTRACT_DIGEST,
  type VedicGovernancePacket,
  type VedicReviewContentDigests
} from "./protocol.ts";

export const MAX_VEDIC_GOVERNANCE_PACKET_BYTES = 64 * 1024;

type JsonPrimitive = null | boolean | number | string;
export type KernelJsonValue = JsonPrimitive | KernelJsonValue[] | KernelJsonObject;
export type KernelJsonObject = { [key: string]: KernelJsonValue };

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_BUFFER_PROTOTYPE = ArrayBuffer.prototype;
const NUMBER_IS_FINITE = Number.isFinite;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS = Object.is;
const OBJECT_KEYS = Object.keys;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const TEXT_ENCODER = new TextEncoder();
const FATAL_UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const UINT8_ARRAY = Uint8Array;
const UINT8_ARRAY_PROTOTYPE = UINT8_ARRAY.prototype;
const UINT8_ARRAY_SET = UINT8_ARRAY_PROTOTYPE.set;
const TYPED_ARRAY_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(UINT8_ARRAY_PROTOTYPE);
const TYPED_ARRAY_BUFFER_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "buffer"
)!.get!;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "byteLength"
)!.get!;

const ROOT_PACKET_KEYS = Object.freeze([
  "admissionCycleId",
  "authorityBoundary",
  "canonicalizationProfile",
  "conditionIds",
  "conditionSetDigest",
  "digestAlgorithm",
  "distributionOperationSetDigest",
  "invariantIds",
  "invariantSetDigest",
  "packetDigest",
  "packetDigestDomain",
  "packetId",
  "packetManifestDigest",
  "packetSchemaVersion",
  "packetScope",
  "privacyProjectionDigest",
  "privateLifecyclePolicyDigest",
  "questionSetDigest",
  "requirementIds",
  "requirementSetDigest",
  "reviewContentManifestDigest",
  "reviewInstructionAndDisagreementPolicyDigest",
  "selectedValueSetDigest",
  "sourceBindingManifestDigest",
  "systemIdentity",
  "targetJurisdictionSetDigest",
  "targetUseProfileDigest",
  "threeLayerRightsEvidenceManifestDigest",
  "transitionContractDigest",
  "upstreamReadinessCandidateDigest",
  "validatorProfileSetDigest"
] as const);

export class VedicFrozenPacketError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VedicFrozenPacketError";
    this.code = code;
  }
}

function fail(code: string, message: string, cause?: unknown): never {
  throw new VedicFrozenPacketError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function captureKernelJson(
  value: unknown,
  state: { readonly active: WeakSet<object>; readonly seen: WeakSet<object>; nodes: number } = {
    active: new WeakSet(),
    seen: new WeakSet(),
    nodes: 0
  },
  depth = 0
): KernelJsonValue {
  if (depth > 64) fail("VALUE_DEPTH_EXCEEDED", "Kernel value exceeds the maximum depth.");
  state.nodes += 1;
  if (state.nodes > 50_000) fail("VALUE_NODE_LIMIT_EXCEEDED", "Kernel value exceeds the node limit.");
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("VALUE_NON_CANONICAL_NUMBER", "Kernel values require finite canonical JSON numbers.");
    }
    return value;
  }
  if (typeof value !== "object") fail("VALUE_NOT_JSON", "Kernel values must be JSON values.");
  if (state.active.has(value)) fail("VALUE_CYCLE_FORBIDDEN", "Kernel values cannot contain cycles.");
  if (state.seen.has(value)) fail("VALUE_ALIAS_FORBIDDEN", "Kernel values cannot share object aliases.");
  state.active.add(value);
  state.seen.add(value);
  try {
    let descriptors: PropertyDescriptorMap;
    let prototype: object | null;
    try {
      descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
      prototype = OBJECT_GET_PROTOTYPE_OF(value);
    } catch (cause) {
      fail("VALUE_HOSTILE_OBJECT", "Kernel value could not be passively inspected.", cause);
    }
    const keys = REFLECT_OWN_KEYS(descriptors);
    if (keys.some((key) => typeof key === "symbol")) {
      fail("VALUE_SYMBOL_FORBIDDEN", "Kernel values cannot contain symbol keys.");
    }
    if (ARRAY_IS_ARRAY(value)) {
      if (prototype !== Array.prototype) fail("VALUE_PROTOTYPE_INVALID", "Kernel array prototype is invalid.");
      const length = descriptors.length?.value;
      if (descriptors.length?.get || descriptors.length?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 20_000
        || keys.length !== length + 1) {
        fail("VALUE_ARRAY_INVALID", "Kernel arrays must be dense and contain no extra keys.");
      }
      const output: KernelJsonValue[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("VALUE_ARRAY_INVALID", "Kernel arrays cannot contain holes or accessors.");
        }
        output.push(captureKernelJson(descriptor.value, state, depth + 1));
      }
      return output;
    }
    if (prototype !== Object.prototype) fail("VALUE_PROTOTYPE_INVALID", "Kernel object prototype is invalid.");
    const entries: Array<[string, KernelJsonValue]> = [];
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("VALUE_ACCESSOR_FORBIDDEN", "Kernel objects cannot contain accessors or hidden keys.");
      }
      entries.push([key, captureKernelJson(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function canonicalValue(value: KernelJsonValue): KernelJsonValue {
  if (value === null || typeof value !== "object") return value;
  if (ARRAY_IS_ARRAY(value)) return value.map(canonicalValue);
  return Object.fromEntries(
    OBJECT_KEYS(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key]!)])
  );
}

export function canonicalizeKernelJson(value: unknown): string {
  return JSON.stringify(canonicalValue(captureKernelJson(value)));
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") {
    fail("WEB_CRYPTO_UNAVAILABLE", "Web Crypto SHA-256 is unavailable.");
  }
  try {
    const snapshot = new Uint8Array(value.byteLength);
    snapshot.set(value);
    return bytesToHex(await subtle.digest("SHA-256", snapshot.buffer));
  } catch (cause) {
    fail("WEB_CRYPTO_FAILED", "Web Crypto SHA-256 failed.", cause);
  }
}

export async function domainSeparatedDigest(domain: string, value: unknown): Promise<string> {
  return sha256Hex(TEXT_ENCODER.encode(`${domain}\0${canonicalizeKernelJson(value)}`));
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireRecord(value: KernelJsonValue, code = "PACKET_SCHEMA_INVALID"): KernelJsonObject {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail(code, "Expected a JSON object.");
  }
  return value;
}

function requireExactKeys(record: KernelJsonObject, expected: readonly string[], code: string): void {
  const actual = OBJECT_KEYS(record).sort(compareCodeUnits);
  const wanted = [...expected].sort(compareCodeUnits);
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, "Object contains missing, unknown, or extra keys.");
  }
}

function requireReviewContentDigests(candidate: unknown): VedicReviewContentDigests {
  const record = requireRecord(captureKernelJson(candidate), "REVIEW_DIGESTS_INVALID");
  requireExactKeys(record, VEDIC_REVIEW_CONTENT_DIGEST_FIELDS, "REVIEW_DIGESTS_INVALID");
  for (const field of VEDIC_REVIEW_CONTENT_DIGEST_FIELDS) {
    if (typeof record[field] !== "string" || !SHA256_PATTERN.test(record[field])) {
      fail("REVIEW_DIGESTS_INVALID", `Review digest ${field} is not lowercase SHA-256.`);
    }
  }
  return deepFreeze(record) as unknown as VedicReviewContentDigests;
}

function reviewProjection(review: VedicReviewContentDigests): KernelJsonObject {
  return Object.fromEntries(
    VEDIC_REVIEW_CONTENT_DIGEST_FIELDS.map((field) => [field, review[field]])
  );
}

function fixedSystemIdentity() {
  return {
    baziIdentityInherited: false,
    contractSystemId: "vedic",
    independentProductId: null,
    legacyV13IdentityInherited: false,
    migrationId: null,
    migrationIdentityInherited: false,
    productSystemId: "vedic-astrology",
    releaseIdentity: null,
    releaseIdentityInherited: false,
    storageNamespaceClass: "vedic-input-admission-kernel-draft",
    targetSchema: null,
    targetSchemaInherited: false
  } as const;
}

function fixedPacketAuthorityBoundary() {
  return {
    authorityEffect: "none",
    candidateInstanceCount: 0,
    digestSemanticOriginVerified: false,
    freeTextFieldCount: 0,
    governancePolicyOnly: true,
    personalDataFieldCount: 0,
    personDerivedDigestFieldCount: 0,
    privacySourceProvenanceEstablished: false
  } as const;
}

function manifestProjection(
  review: VedicReviewContentDigests,
  digests: Readonly<{
    conditionSetDigest: string;
    invariantSetDigest: string;
    privacyProjectionDigest: string;
    requirementSetDigest: string;
    reviewContentManifestDigest: string;
  }>
): KernelJsonObject {
  return {
    conditionIds: [...VEDIC_CONDITION_IDS],
    conditionSetDigest: digests.conditionSetDigest,
    invariantIds: [...VEDIC_INVARIANT_IDS],
    invariantSetDigest: digests.invariantSetDigest,
    packetSchemaVersion: VEDIC_GOVERNANCE_PACKET_SCHEMA_VERSION,
    packetScope: "system_governance_policy_only_no_person_input_instances",
    privacyProjectionDigest: digests.privacyProjectionDigest,
    requirementIds: [...VEDIC_REQUIREMENT_IDS],
    requirementSetDigest: digests.requirementSetDigest,
    reviewContentDigests: reviewProjection(review),
    reviewContentManifestDigest: digests.reviewContentManifestDigest,
    systemIdentity: fixedSystemIdentity(),
    transitionContractDigest: VEDIC_TRANSITION_CONTRACT_DIGEST,
    upstreamReadinessCandidateDigest: VEDIC_READINESS_CANDIDATE_DIGEST
  };
}

export async function createCanonicalVedicGovernancePacket(
  reviewContentCandidate: unknown
): Promise<Uint8Array> {
  const review = requireReviewContentDigests(reviewContentCandidate);
  const authorityBoundary = fixedPacketAuthorityBoundary();
  const [requirementSetDigest, invariantSetDigest, conditionSetDigest, reviewContentManifestDigest,
    privacyProjectionDigest] = await Promise.all([
    domainSeparatedDigest(VEDIC_REQUIREMENT_SET_DIGEST_DOMAIN, [...VEDIC_REQUIREMENT_IDS]),
    domainSeparatedDigest(VEDIC_INVARIANT_SET_DIGEST_DOMAIN, [...VEDIC_INVARIANT_IDS]),
    domainSeparatedDigest(VEDIC_CONDITION_SET_DIGEST_DOMAIN, [...VEDIC_CONDITION_IDS]),
    domainSeparatedDigest(VEDIC_REVIEW_CONTENT_MANIFEST_DIGEST_DOMAIN, reviewProjection(review)),
    domainSeparatedDigest(VEDIC_PRIVACY_PROJECTION_DIGEST_DOMAIN, authorityBoundary)
  ]);
  const digests = {
    conditionSetDigest,
    invariantSetDigest,
    privacyProjectionDigest,
    requirementSetDigest,
    reviewContentManifestDigest
  };
  const packetManifestDigest = await domainSeparatedDigest(
    VEDIC_PACKET_MANIFEST_DIGEST_DOMAIN,
    manifestProjection(review, digests)
  );
  const packetWithoutDigest = {
    admissionCycleId: `vedic-admission-cycle/${packetManifestDigest}`,
    authorityBoundary,
    canonicalizationProfile: VEDIC_CANONICALIZATION_PROFILE,
    conditionIds: [...VEDIC_CONDITION_IDS],
    conditionSetDigest,
    digestAlgorithm: "SHA-256",
    distributionOperationSetDigest: review.distributionOperationSetDigest,
    invariantIds: [...VEDIC_INVARIANT_IDS],
    invariantSetDigest,
    packetDigestDomain: VEDIC_PACKET_DIGEST_DOMAIN,
    packetId: `vedic-governance-packet/${packetManifestDigest}`,
    packetManifestDigest,
    packetSchemaVersion: VEDIC_GOVERNANCE_PACKET_SCHEMA_VERSION,
    packetScope: "system_governance_policy_only_no_person_input_instances",
    privacyProjectionDigest,
    privateLifecyclePolicyDigest: review.privateLifecyclePolicyDigest,
    questionSetDigest: review.questionSetDigest,
    requirementIds: [...VEDIC_REQUIREMENT_IDS],
    requirementSetDigest,
    reviewContentManifestDigest,
    reviewInstructionAndDisagreementPolicyDigest: review.reviewInstructionAndDisagreementPolicyDigest,
    selectedValueSetDigest: review.selectedValueSetDigest,
    sourceBindingManifestDigest: review.sourceBindingManifestDigest,
    systemIdentity: fixedSystemIdentity(),
    targetJurisdictionSetDigest: review.targetJurisdictionSetDigest,
    targetUseProfileDigest: review.targetUseProfileDigest,
    threeLayerRightsEvidenceManifestDigest: review.threeLayerRightsEvidenceManifestDigest,
    transitionContractDigest: VEDIC_TRANSITION_CONTRACT_DIGEST,
    upstreamReadinessCandidateDigest: VEDIC_READINESS_CANDIDATE_DIGEST,
    validatorProfileSetDigest: review.validatorProfileSetDigest
  } as const;
  const packetDigest = await domainSeparatedDigest(VEDIC_PACKET_DIGEST_DOMAIN, packetWithoutDigest);
  return TEXT_ENCODER.encode(canonicalizeKernelJson({ ...packetWithoutDigest, packetDigest }));
}

function copyExactUint8Array(candidate: unknown): Uint8Array {
  try {
    if (OBJECT_GET_PROTOTYPE_OF(candidate) !== UINT8_ARRAY_PROTOTYPE) {
      fail("PACKET_BYTES_REQUIRED", "Governance packet input must be an exact Uint8Array.");
    }
    const byteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, candidate, []);
    if (byteLength === 0) fail("PACKET_EMPTY", "Governance packet is empty.");
    if (!Number.isSafeInteger(byteLength) || byteLength > MAX_VEDIC_GOVERNANCE_PACKET_BYTES) {
      fail("PACKET_TOO_LARGE", "Governance packet exceeds the byte limit.");
    }
    const backingStore = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, candidate, []);
    if (OBJECT_GET_PROTOTYPE_OF(backingStore) !== ARRAY_BUFFER_PROTOTYPE) {
      fail(
        "PACKET_SHARED_OR_FOREIGN_BUFFER_FORBIDDEN",
        "Governance packet bytes require a same-realm non-shared ArrayBuffer snapshot source."
      );
    }
    const ownKeys = REFLECT_OWN_KEYS(candidate as object);
    if (ownKeys.length !== byteLength
      || ownKeys.some((key, index) => typeof key !== "string" || key !== String(index))) {
      fail(
        "PACKET_BYTES_OWN_PROPERTY_FORBIDDEN",
        "Governance packet bytes cannot contain extra own properties."
      );
    }
    const snapshot = new UINT8_ARRAY(byteLength);
    REFLECT_APPLY(UINT8_ARRAY_SET, snapshot, [candidate]);
    return snapshot;
  } catch (cause) {
    if (cause instanceof VedicFrozenPacketError) throw cause;
    fail("PACKET_BYTES_REQUIRED", "Governance packet input is not a safe Uint8Array.", cause);
  }
}

export async function parseCanonicalVedicGovernancePacket(
  packetBytesCandidate: unknown
): Promise<VedicGovernancePacket> {
  const bytes = copyExactUint8Array(packetBytesCandidate);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("PACKET_BOM_FORBIDDEN", "Governance packet must not contain a UTF-8 BOM.");
  }
  let text: string;
  try {
    text = FATAL_UTF8_DECODER.decode(bytes);
  } catch (cause) {
    fail("PACKET_UTF8_INVALID", "Governance packet is not fatal-valid UTF-8.", cause);
  }
  const parsed = new StrictJsonParser(text).parse();
  if (canonicalizeKernelJson(parsed) !== text) {
    fail("PACKET_NON_CANONICAL", "Governance packet bytes are not canonical compact JSON.");
  }
  const record = requireRecord(parsed);
  requireExactKeys(record, ROOT_PACKET_KEYS, "PACKET_SCHEMA_INVALID");
  const review = requireReviewContentDigests(Object.fromEntries(
    VEDIC_REVIEW_CONTENT_DIGEST_FIELDS.map((field) => [field, record[field]])
  ));
  const expectedBytes = await createCanonicalVedicGovernancePacket(review);
  const expected = FATAL_UTF8_DECODER.decode(expectedBytes);
  if (text !== expected) {
    fail(
      "PACKET_SEMANTIC_MISMATCH",
      "Governance packet does not match the fixed Vedic identity, exact sets, or recomputed digests."
    );
  }
  return deepFreeze(record) as unknown as VedicGovernancePacket;
}

class StrictJsonParser {
  readonly #source: string;
  #index = 0;
  #nodes = 0;

  constructor(source: string) {
    this.#source = source;
  }

  parse(): KernelJsonValue {
    const value = this.#parseValue(0);
    if (this.#index !== this.#source.length) fail("PACKET_JSON_INVALID", "JSON contains trailing bytes.");
    return value;
  }

  #parseValue(depth: number): KernelJsonValue {
    if (depth > 64) fail("PACKET_JSON_DEPTH_EXCEEDED", "JSON exceeds the maximum depth.");
    this.#nodes += 1;
    if (this.#nodes > 50_000) fail("PACKET_JSON_NODE_LIMIT_EXCEEDED", "JSON exceeds the node limit.");
    const char = this.#source[this.#index];
    if (char === "{") return this.#parseObject(depth + 1);
    if (char === "[") return this.#parseArray(depth + 1);
    if (char === '"') return this.#parseString();
    if (char === "t" && this.#consume("true")) return true;
    if (char === "f" && this.#consume("false")) return false;
    if (char === "n" && this.#consume("null")) return null;
    if (char === "-" || (char !== undefined && char >= "0" && char <= "9")) return this.#parseNumber();
    fail("PACKET_JSON_INVALID", `Unexpected JSON token at offset ${this.#index}.`);
  }

  #parseObject(depth: number): KernelJsonObject {
    this.#index += 1;
    const entries: Array<[string, KernelJsonValue]> = [];
    const keys = new Set<string>();
    if (this.#source[this.#index] === "}") {
      this.#index += 1;
      return {};
    }
    while (true) {
      if (this.#source[this.#index] !== '"') fail("PACKET_JSON_INVALID", "Object key must be a string.");
      const key = this.#parseString();
      if (keys.has(key)) fail("PACKET_DUPLICATE_KEY", `Duplicate JSON key ${JSON.stringify(key)}.`);
      keys.add(key);
      if (this.#source[this.#index] !== ":") fail("PACKET_JSON_INVALID", "Object key must be followed by a colon.");
      this.#index += 1;
      entries.push([key, this.#parseValue(depth)]);
      const separator = this.#source[this.#index];
      if (separator === "}") {
        this.#index += 1;
        return Object.fromEntries(entries);
      }
      if (separator !== ",") fail("PACKET_JSON_INVALID", "Object entry must be followed by comma or close brace.");
      this.#index += 1;
    }
  }

  #parseArray(depth: number): KernelJsonValue[] {
    this.#index += 1;
    const output: KernelJsonValue[] = [];
    if (this.#source[this.#index] === "]") {
      this.#index += 1;
      return output;
    }
    while (true) {
      output.push(this.#parseValue(depth));
      const separator = this.#source[this.#index];
      if (separator === "]") {
        this.#index += 1;
        return output;
      }
      if (separator !== ",") fail("PACKET_JSON_INVALID", "Array entry must be followed by comma or close bracket.");
      this.#index += 1;
    }
  }

  #parseString(): string {
    const start = this.#index;
    this.#index += 1;
    while (this.#index < this.#source.length) {
      const char = this.#source[this.#index]!;
      if (char === '"') {
        this.#index += 1;
        try {
          return JSON.parse(this.#source.slice(start, this.#index)) as string;
        } catch (cause) {
          fail("PACKET_JSON_INVALID", "JSON string is invalid.", cause);
        }
      }
      if (char.charCodeAt(0) < 0x20) fail("PACKET_JSON_INVALID", "JSON string contains a control character.");
      if (char === "\\") {
        this.#index += 1;
        const escaped = this.#source[this.#index];
        if (escaped === "u") {
          const digits = this.#source.slice(this.#index + 1, this.#index + 5);
          if (!/^[0-9a-fA-F]{4}$/u.test(digits)) fail("PACKET_JSON_INVALID", "JSON unicode escape is invalid.");
          this.#index += 4;
        } else if (escaped === undefined || !'"\\/bfnrt'.includes(escaped)) {
          fail("PACKET_JSON_INVALID", "JSON escape is invalid.");
        }
      }
      this.#index += 1;
    }
    fail("PACKET_JSON_INVALID", "JSON string is unterminated.");
  }

  #parseNumber(): number {
    const rest = this.#source.slice(this.#index);
    const token = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rest)?.[0];
    if (!token) fail("PACKET_JSON_INVALID", "JSON number is invalid.");
    this.#index += token.length;
    const value = Number(token);
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("PACKET_JSON_INVALID", "JSON number is not finite canonical data.");
    }
    return value;
  }

  #consume(token: string): boolean {
    if (!this.#source.startsWith(token, this.#index)) return false;
    this.#index += token.length;
    return true;
  }
}
