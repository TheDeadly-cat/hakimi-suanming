import {
  KeyObject,
  createDecipheriv,
  createPublicKey,
  createSecretKey,
  verify as verifySignature
} from "node:crypto";
import { Buffer } from "node:buffer";
import { types as utilTypes } from "node:util";
import {
  assertArray,
  assertExactKeys,
  assertObject,
  assertString,
  canonicalStringify,
  captureJson,
  fail,
  parseStrictJsonBytes,
  rawSha256,
  type JsonObject,
  type JsonValue
} from "./canonical.ts";
import {
  AUTHENTICATED_PRIVATE_ENVELOPE_V4,
  AUTHENTICATED_PRIVATE_ENVELOPE_V4_BOUNDARY,
  AUTHORITY_NONE,
  BINDING_IDS,
  RELEASE_GOVERNANCE,
  RUNTIME_TRUST_BOUNDARY,
  type BindingId,
  type ReviewInputManifestRef
} from "./protocol.ts";
import { validateSyntheticOriginalOpinionPayloadV4 } from "./original-opinion-payload-v4.ts";

const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTIES = Object.defineProperties;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const UINT8_ARRAY_SLICE = Function.call.bind(Uint8Array.prototype.slice) as (
  value: Uint8Array, start?: number, end?: number
) => Uint8Array;
const WEAK_MAP_GET = Function.call.bind(WeakMap.prototype.get) as (
  map: WeakMap<object, unknown>, key: object
) => unknown;
const WEAK_MAP_SET = Function.call.bind(WeakMap.prototype.set) as (
  map: WeakMap<object, unknown>, key: object, value: unknown
) => WeakMap<object, unknown>;

const IS_PROXY = utilTypes.isProxy;
const SHA256 = /^[a-f0-9]{64}$/u;
const MANIFEST_ID = /^bazi-review-input-manifest\/[a-f0-9]{64}$/u;
const FORMAL_CYCLE = /^bazi-formal-review-cycle\/[a-f0-9]{64}$/u;
const OPAQUE_ORIGINAL_OPINION_REF = /^opaque-private-ref\/original_opinion\/[a-f0-9]{64}$/u;
const SYNTHETIC_REGISTRY_ID = /^synthetic-producer-trust-registry\/[a-f0-9]{64}$/u;
const SYNTHETIC_PRODUCER_ID = /^synthetic-producer\/domain-expert-[ab]\/[a-f0-9]{64}$/u;
const SYNTHETIC_SIGNING_KEY_ID = /^synthetic-ed25519-key\/[a-f0-9]{64}$/u;
const SYNTHETIC_ENCRYPTION_KEY_ID = /^synthetic-aes256gcm-key\/[a-f0-9]{64}$/u;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

export type AuthenticatedPrivateEnvelopeV4ExpectedBinding = Readonly<{
  purpose: "binding_freeze_evidence";
  reviewCycleId: string;
  seatId: "domain-expert-a" | "domain-expert-b";
  inputManifestRef: ReviewInputManifestRef;
  reviewScope: Readonly<{ mode: "single_binding"; bindingId: BindingId }>;
  selectedBindingIds: readonly [BindingId];
  selectedBindingSetDigest: string;
  evidenceCategoryCode: "original_opinion";
  opaqueArtifactRef: string;
}>;

export type SyntheticProducerTrustRegistryRefV4 = Readonly<{
  registryId: string;
  registryDigest: string;
}>;

declare const OUT_OF_ENVELOPE_PRODUCER_CAPABILITY_BRAND: unique symbol;
declare const DECRYPTION_KEY_CAPABILITY_BRAND: unique symbol;

export type SyntheticOutOfEnvelopeProducerKeyCapabilityV4 = Readonly<{
  capabilityType: "synthetic_out_of_envelope_producer_key_capability_v4";
  syntheticOnly: true;
  keyMaterialExposed: false;
  realKeyProvenanceEstablished: false;
  authorityEstablished: false;
  readonly [OUT_OF_ENVELOPE_PRODUCER_CAPABILITY_BRAND]: never;
}>;

export type SyntheticDecryptionKeyCapabilityV4 = Readonly<{
  capabilityType: "synthetic_decryption_key_capability_v4";
  syntheticOnly: true;
  keyMaterialExposed: false;
  keyCustodyEstablished: false;
  authorityEstablished: false;
  readonly [DECRYPTION_KEY_CAPABILITY_BRAND]: never;
}>;

type PinState = Readonly<{
  expectedBinding: AuthenticatedPrivateEnvelopeV4ExpectedBinding;
  producerTrustRegistryRef: SyntheticProducerTrustRegistryRefV4;
  producerId: string;
  producerSigningKeyId: string;
  signingPublicKey: KeyObject;
}>;

type DecryptionState = Readonly<{
  expectedBinding: AuthenticatedPrivateEnvelopeV4ExpectedBinding;
  contentEncryptionKeyId: string;
  contentEncryptionKey: KeyObject;
}>;

const PIN_STATES = new WeakMap<object, PinState>();
const DECRYPTION_STATES = new WeakMap<object, DecryptionState>();

type RuntimeRecord = Record<string, unknown>;

function runtimeRecord(input: unknown, expectedKeys: readonly string[], label: string): RuntimeRecord {
  if (input === null || typeof input !== "object" || IS_PROXY(input)) {
    fail("V4_CAPABILITY_INPUT_INVALID", `${label} 必须是非 Proxy 普通对象。`);
  }
  const prototype = OBJECT_GET_PROTOTYPE_OF(input);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("V4_CAPABILITY_INPUT_INVALID", `${label} 原型无效。`);
  }
  const keys = REFLECT_OWN_KEYS(input);
  if (keys.length !== expectedKeys.length
    || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))) {
    fail("V4_CAPABILITY_INPUT_INVALID", `${label} 键集合无效。`);
  }
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(input);
  const result: RuntimeRecord = OBJECT_CREATE(null) as RuntimeRecord;
  for (const key of expectedKeys) {
    const descriptor = OBJECT_HAS_OWN(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value") || !descriptor.enumerable
      || OBJECT_HAS_OWN(descriptor, "get") || OBJECT_HAS_OWN(descriptor, "set")) {
      fail("V4_CAPABILITY_INPUT_INVALID", `${label}.${key} 必须是普通数据属性。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function requireString(value: unknown, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || value.length > 180 || !pattern.test(value)) {
    fail("V4_CAPABILITY_INPUT_INVALID", `${label} 无效。`);
  }
  return value;
}

function validateManifestRef(value: JsonValue, label: string): ReviewInputManifestRef {
  assertExactKeys(value, ["manifestId", "manifestDigest"], label);
  assertString(value.manifestId!, `${label}.manifestId`, 128);
  assertString(value.manifestDigest!, `${label}.manifestDigest`, 64);
  if (!MANIFEST_ID.test(value.manifestId as string) || !SHA256.test(value.manifestDigest as string)) {
    fail("V4_BINDING_INVALID", `${label} identity 无效。`);
  }
  return value as unknown as ReviewInputManifestRef;
}

function validateExpectedBinding(input: unknown, label: string): AuthenticatedPrivateEnvelopeV4ExpectedBinding {
  const value = captureJson(input, label);
  assertExactKeys(value, [
    "purpose", "reviewCycleId", "seatId", "inputManifestRef", "reviewScope",
    "selectedBindingIds", "selectedBindingSetDigest", "evidenceCategoryCode", "opaqueArtifactRef"
  ], label);
  if (value.purpose !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.purpose
    || value.evidenceCategoryCode !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.evidenceCategoryCode) {
    fail("V4_BINDING_INVALID", `${label} 只允许 binding freeze original opinion。`);
  }
  assertString(value.reviewCycleId!, `${label}.reviewCycleId`, 128);
  assertString(value.seatId!, `${label}.seatId`, 32);
  if (!FORMAL_CYCLE.test(value.reviewCycleId as string)
    || !["domain-expert-a", "domain-expert-b"].includes(value.seatId as string)) {
    fail("V4_BINDING_INVALID", `${label} cycle/seat 无效。`);
  }
  const inputManifestRef = validateManifestRef(value.inputManifestRef!, `${label}.inputManifestRef`);
  assertExactKeys(value.reviewScope!, ["mode", "bindingId"], `${label}.reviewScope`);
  if (value.reviewScope.mode !== "single_binding" || typeof value.reviewScope.bindingId !== "string"
    || !BINDING_IDS.includes(value.reviewScope.bindingId as BindingId)) {
    fail("V4_BINDING_INVALID", `${label} 必须精确选择一个当前 binding。`);
  }
  assertArray(value.selectedBindingIds!, `${label}.selectedBindingIds`);
  if (value.selectedBindingIds.length !== 1
    || value.selectedBindingIds[0] !== value.reviewScope.bindingId) {
    fail("V4_BINDING_INVALID", `${label} selected binding 失配。`);
  }
  assertString(value.selectedBindingSetDigest!, `${label}.selectedBindingSetDigest`, 64);
  assertString(value.opaqueArtifactRef!, `${label}.opaqueArtifactRef`, 160);
  if (!SHA256.test(value.selectedBindingSetDigest as string)
    || !OPAQUE_ORIGINAL_OPINION_REF.test(value.opaqueArtifactRef as string)) {
    fail("V4_BINDING_INVALID", `${label} digest/ref 无效。`);
  }
  return OBJECT_FREEZE({
    purpose: AUTHENTICATED_PRIVATE_ENVELOPE_V4.purpose,
    reviewCycleId: value.reviewCycleId as string,
    seatId: value.seatId as "domain-expert-a" | "domain-expert-b",
    inputManifestRef,
    reviewScope: value.reviewScope as unknown as Readonly<{ mode: "single_binding"; bindingId: BindingId }>,
    selectedBindingIds: value.selectedBindingIds as unknown as readonly [BindingId],
    selectedBindingSetDigest: value.selectedBindingSetDigest as string,
    evidenceCategoryCode: AUTHENTICATED_PRIVATE_ENVELOPE_V4.evidenceCategoryCode,
    opaqueArtifactRef: value.opaqueArtifactRef as string
  });
}

function validateRegistryRef(input: unknown, label: string): SyntheticProducerTrustRegistryRefV4 {
  const value = captureJson(input, label);
  assertExactKeys(value, ["registryId", "registryDigest"], label);
  assertString(value.registryId!, `${label}.registryId`, 128);
  assertString(value.registryDigest!, `${label}.registryDigest`, 64);
  if (!SYNTHETIC_REGISTRY_ID.test(value.registryId as string)
    || !SHA256.test(value.registryDigest as string)) {
    fail("V4_CAPABILITY_INPUT_INVALID", `${label} 无效。`);
  }
  return value as unknown as SyntheticProducerTrustRegistryRefV4;
}

function cloneEd25519PublicKey(value: unknown): KeyObject {
  if (!(value instanceof KeyObject) || value.type !== "public" || value.asymmetricKeyType !== "ed25519") {
    fail("V4_CAPABILITY_INPUT_INVALID", "signingPublicKey 必须是 Ed25519 public KeyObject。");
  }
  try {
    const der = value.export({ format: "der", type: "spki" });
    const copy = createPublicKey({ key: der, format: "der", type: "spki" });
    const canonical = copy.export({ format: "der", type: "spki" });
    if (!Buffer.isBuffer(der) || !Buffer.isBuffer(canonical) || !der.equals(canonical)) {
      fail("V4_CAPABILITY_INPUT_INVALID", "signingPublicKey 不是规范 Ed25519 SPKI。");
    }
    return copy;
  } catch {
    return fail("V4_CAPABILITY_INPUT_INVALID", "signingPublicKey 无法解析为规范 Ed25519 SPKI。");
  }
}

function cloneAes256Key(value: unknown): KeyObject {
  if (!(value instanceof KeyObject) || value.type !== "secret" || value.symmetricKeySize !== 32) {
    fail("V4_CAPABILITY_INPUT_INVALID", "contentEncryptionKey 必须是 32-byte secret KeyObject。");
  }
  let raw: Buffer | undefined;
  try {
    const exported = value.export();
    if (!Buffer.isBuffer(exported) || exported.byteLength !== 32) {
      fail("V4_CAPABILITY_INPUT_INVALID", "contentEncryptionKey 长度无效。");
    }
    raw = Buffer.from(exported);
    return createSecretKey(raw);
  } catch {
    return fail("V4_CAPABILITY_INPUT_INVALID", "contentEncryptionKey 无法复制到私有 capability。");
  } finally {
    raw?.fill(0);
  }
}

function opaqueCapability<T extends object>(fields: RuntimeRecord): T {
  const capability = OBJECT_CREATE(null) as RuntimeRecord;
  const properties: PropertyDescriptorMap = {};
  for (const [key, value] of Object.entries(fields)) {
    properties[key] = { configurable: false, enumerable: true, value, writable: false };
  }
  properties.toJSON = {
    configurable: false,
    enumerable: false,
    value: () => fail("V4_CAPABILITY_NOT_SERIALIZABLE", "v4 key capability 不得序列化。"),
    writable: false
  };
  OBJECT_DEFINE_PROPERTIES(capability, properties);
  return OBJECT_FREEZE(capability) as T;
}

export function createSyntheticOutOfEnvelopeProducerKeyCapabilityV4(input: Readonly<{
  syntheticOnly: true;
  expectedBinding: AuthenticatedPrivateEnvelopeV4ExpectedBinding;
  producerTrustRegistryRef: SyntheticProducerTrustRegistryRefV4;
  producerId: string;
  producerSigningKeyId: string;
  signingPublicKey: KeyObject;
  realKeyProvenanceEstablished: false;
  authorityEstablished: false;
}>): SyntheticOutOfEnvelopeProducerKeyCapabilityV4 {
  const value = runtimeRecord(input, [
    "syntheticOnly", "expectedBinding", "producerTrustRegistryRef", "producerId",
    "producerSigningKeyId", "signingPublicKey", "realKeyProvenanceEstablished", "authorityEstablished"
  ], "synthetic out-of-envelope producer capability input");
  if (value.syntheticOnly !== true || value.realKeyProvenanceEstablished !== false
    || value.authorityEstablished !== false) {
    fail("V4_CAPABILITY_INPUT_INVALID", "synthetic out-of-envelope producer capability authority boundary 无效。");
  }
  const expectedBinding = validateExpectedBinding(value.expectedBinding, "synthetic producer expectedBinding");
  const producerId = requireString(value.producerId, SYNTHETIC_PRODUCER_ID, "producerId");
  if (!producerId.startsWith(`synthetic-producer/${expectedBinding.seatId}/`)) {
    fail("V4_PRODUCER_SEAT_MISMATCH", "synthetic producerId 必须与 expectedBinding.seatId 精确一致。");
  }
  const state: PinState = OBJECT_FREEZE({
    expectedBinding,
    producerTrustRegistryRef: validateRegistryRef(
      value.producerTrustRegistryRef, "synthetic producer producerTrustRegistryRef"
    ),
    producerId,
    producerSigningKeyId: requireString(
      value.producerSigningKeyId, SYNTHETIC_SIGNING_KEY_ID, "producerSigningKeyId"
    ),
    signingPublicKey: cloneEd25519PublicKey(value.signingPublicKey)
  });
  const capability = opaqueCapability<SyntheticOutOfEnvelopeProducerKeyCapabilityV4>({
    capabilityType: "synthetic_out_of_envelope_producer_key_capability_v4",
    syntheticOnly: true,
    keyMaterialExposed: false,
    realKeyProvenanceEstablished: false,
    authorityEstablished: false
  });
  WEAK_MAP_SET(PIN_STATES as unknown as WeakMap<object, unknown>, capability, state);
  return capability;
}

export function createSyntheticDecryptionKeyCapabilityV4(input: Readonly<{
  syntheticOnly: true;
  expectedBinding: AuthenticatedPrivateEnvelopeV4ExpectedBinding;
  contentEncryptionKeyId: string;
  contentEncryptionKey: KeyObject;
  keyCustodyEstablished: false;
  authorityEstablished: false;
}>): SyntheticDecryptionKeyCapabilityV4 {
  const value = runtimeRecord(input, [
    "syntheticOnly", "expectedBinding", "contentEncryptionKeyId", "contentEncryptionKey",
    "keyCustodyEstablished", "authorityEstablished"
  ], "decryption capability input");
  if (value.syntheticOnly !== true || value.keyCustodyEstablished !== false
    || value.authorityEstablished !== false) {
    fail("V4_CAPABILITY_INPUT_INVALID", "decryption capability authority boundary 无效。");
  }
  const state: DecryptionState = OBJECT_FREEZE({
    expectedBinding: validateExpectedBinding(value.expectedBinding, "decryption expectedBinding"),
    contentEncryptionKeyId: requireString(
      value.contentEncryptionKeyId, SYNTHETIC_ENCRYPTION_KEY_ID, "contentEncryptionKeyId"
    ),
    contentEncryptionKey: cloneAes256Key(value.contentEncryptionKey)
  });
  const capability = opaqueCapability<SyntheticDecryptionKeyCapabilityV4>({
    capabilityType: "synthetic_decryption_key_capability_v4",
    syntheticOnly: true,
    keyMaterialExposed: false,
    keyCustodyEstablished: false,
    authorityEstablished: false
  });
  WEAK_MAP_SET(DECRYPTION_STATES as unknown as WeakMap<object, unknown>, capability, state);
  return capability;
}

function capabilityState<T>(map: WeakMap<object, T>, input: unknown, code: string): T {
  if (input === null || typeof input !== "object" || IS_PROXY(input)) {
    fail(code, "v4 preflight 需要本模块签发的进程内 key capability。");
  }
  const state = WEAK_MAP_GET(map as unknown as WeakMap<object, unknown>, input) as T | undefined;
  if (state === undefined) fail(code, "v4 preflight 需要本模块签发的进程内 key capability。");
  return state;
}

function canonicalBase64(value: JsonValue, label: string, exactBytes?: number): Buffer {
  assertString(value, label, AUTHENTICATED_PRIVATE_ENVELOPE_V4.maxEnvelopeBytes);
  const decoded = Buffer.from(value, "base64");
  if (!BASE64.test(value) || decoded.toString("base64") !== value
    || (exactBytes !== undefined && decoded.byteLength !== exactBytes)) {
    fail("V4_BASE64_INVALID", `${label} 必须是规范、长度正确的 base64。`);
  }
  return decoded;
}

function integer(value: JsonValue, min: number, max: number, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    fail("V4_ENVELOPE_INVALID", `${label} 无效。`);
  }
  return value;
}

function bindingFromHeader(header: JsonObject): AuthenticatedPrivateEnvelopeV4ExpectedBinding {
  return validateExpectedBinding({
    purpose: header.purpose,
    reviewCycleId: header.reviewCycleId,
    seatId: header.seatId,
    inputManifestRef: header.inputManifestRef,
    reviewScope: header.reviewScope,
    selectedBindingIds: header.selectedBindingIds,
    selectedBindingSetDigest: header.selectedBindingSetDigest,
    evidenceCategoryCode: header.evidenceCategoryCode,
    opaqueArtifactRef: header.opaqueArtifactRef
  }, "v4 protectedHeader binding");
}

function assertSameJson(left: unknown, right: unknown, code: string, message: string): void {
  if (canonicalStringify(left) !== canonicalStringify(right)) fail(code, message);
}

function aadBytesForEnvelope(envelope: JsonObject): Buffer {
  const aadDocument = {
    schemaVersion: envelope.schemaVersion,
    recordType: envelope.recordType,
    protectedHeader: envelope.protectedHeader,
    boundary: envelope.boundary
  };
  return Buffer.from(
    `${AUTHENTICATED_PRIVATE_ENVELOPE_V4.aadDomain}\u0000${canonicalStringify(aadDocument)}`,
    "utf8"
  );
}

function signatureBytesForEnvelope(
  aadSha256: string,
  ciphertextByteLength: number,
  ciphertextSha256: string,
  authenticationTagBase64: string
): Buffer {
  const statement = {
    statementVersion: AUTHENTICATED_PRIVATE_ENVELOPE_V4.signatureStatementVersion,
    aadSha256,
    ciphertextByteLength,
    ciphertextSha256,
    authenticationTagBase64
  };
  return Buffer.from(
    `${AUTHENTICATED_PRIVATE_ENVELOPE_V4.signatureDomain}\u0000${canonicalStringify(statement)}`,
    "utf8"
  );
}

export type AuthenticatedPrivateEnvelopeV4CandidateReport = Readonly<{
  schemaVersion: "4.0.0";
  reportType: "bazi_expert_authenticated_private_envelope_preflight_candidate_v4";
  syntheticOnly: true;
  purpose: "binding_freeze_evidence";
  reviewCycleId: string;
  seatId: "domain-expert-a" | "domain-expert-b";
  inputManifestRef: ReviewInputManifestRef;
  reviewScope: Readonly<{ mode: "single_binding"; bindingId: BindingId }>;
  selectedBindingIds: readonly [BindingId];
  selectedBindingSetDigest: string;
  evidenceCategoryCode: "original_opinion";
  opaqueArtifactRef: string;
  aeadIntegrityVerified: true;
  signatureAgainstSyntheticOutOfEnvelopeKeyVerified: true;
  decryptedSchemaAndBindingMatched: true;
  payloadSourceAuthenticated: false;
  realKeyProvenanceEstablished: false;
  humanIdentityEstablished: false;
  credentialsEstablished: false;
  participationConsentEstablished: false;
  opinionAuthenticityEstablished: false;
  firstSeenEstablished: false;
  custodyEstablished: false;
  pairwiseIndependenceEstablished: false;
  humanAttestationRecorded: false;
  contentTruthEstablished: false;
  expertTruthEstablished: false;
  formalAdmissionAllowed: false;
  eligibleAsStageCBindingEvidenceCandidate: false;
  eligibleForFormal2of2EvaluationCandidate: false;
  formalTwoOfTwoCountDelta: 0;
  expertGateCountDelta: 0;
  bindingFrozenCountDelta: 0;
  closure: Readonly<{
    formalExpertSeatsVerified: 0;
    formalExpertSeatsRequired: 2;
    bindingsFrozenVerified: 0;
    bindingsRequired: 12;
  }>;
  authorityBoundary: typeof AUTHORITY_NONE;
  releaseGovernance: typeof RELEASE_GOVERNANCE;
  runtimeTrustBoundary: typeof RUNTIME_TRUST_BOUNDARY;
  mutationBoundary: Readonly<{
    persistencePerformed: false;
    schema13MutationEpochAvailable: false;
    schema13MutationEpochReceipt: null;
    crossFileAtomicSnapshot: false;
    intervalMutationExcluded: false;
    abaExcluded: false;
    replayExcluded: false;
    nonceReuseAcrossRunsExcluded: false;
    keyErasureProven: false;
  }>;
}>;

export function preflightAuthenticatedPrivateEnvelopeV4Candidate(
  rawEnvelopeBytes: Uint8Array,
  syntheticProducerKeyCapability: unknown,
  decryptionKeyCapability: unknown
): AuthenticatedPrivateEnvelopeV4CandidateReport {
  if (!(rawEnvelopeBytes instanceof Uint8Array) || IS_PROXY(rawEnvelopeBytes)
    || rawEnvelopeBytes.byteLength === 0
    || rawEnvelopeBytes.byteLength > AUTHENTICATED_PRIVATE_ENVELOPE_V4.maxEnvelopeBytes) {
    fail("V4_ENVELOPE_BYTES_INVALID", "v4 envelope 必须是有界 Uint8Array。");
  }
  const envelopeBytes = UINT8_ARRAY_SLICE(rawEnvelopeBytes);
  const pinState = capabilityState(
    PIN_STATES,
    syntheticProducerKeyCapability,
    "V4_SYNTHETIC_PRODUCER_KEY_CAPABILITY_REQUIRED"
  );
  const decryptionState = capabilityState(
    DECRYPTION_STATES, decryptionKeyCapability, "V4_DECRYPTION_CAPABILITY_REQUIRED"
  );
  const envelope = parseStrictJsonBytes(
    envelopeBytes,
    "authenticated private envelope v4",
    AUTHENTICATED_PRIVATE_ENVELOPE_V4.maxEnvelopeBytes
  );
  assertExactKeys(envelope, [
    "schemaVersion", "recordType", "protectedHeader", "ciphertext", "authentication", "boundary"
  ], "authenticated private envelope v4");
  if (envelope.schemaVersion !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.schemaVersion
    || envelope.recordType !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.envelopeRecordType) {
    fail("V4_ENVELOPE_TYPE_INVALID", "v4 envelope identity 无效。 ");
  }
  assertExactKeys(envelope.protectedHeader!, [
    "protocolVersion", "purpose", "reviewCycleId", "seatId", "inputManifestRef", "reviewScope",
    "selectedBindingIds", "selectedBindingSetDigest", "evidenceCategoryCode", "opaqueArtifactRef",
    "payloadRecordType", "payloadSchemaVersion", "payloadMediaType", "payloadEncoding", "compression",
    "producerTrustRegistryRef", "producerId", "producerSigningKeyId", "signatureAlgorithm",
    "contentEncryptionKeyId", "contentEncryptionAlgorithm", "nonceBase64"
  ], "v4 protectedHeader");
  const header = envelope.protectedHeader as JsonObject;
  if (header.protocolVersion !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.protocolVersion
    || header.payloadRecordType !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadRecordType
    || header.payloadSchemaVersion !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadSchemaVersion
    || header.payloadMediaType !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadMediaType
    || header.payloadEncoding !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadEncoding
    || header.compression !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.compression
    || header.signatureAlgorithm !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.signatureAlgorithm
    || header.contentEncryptionAlgorithm !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.aeadAlgorithm) {
    fail("V4_ENVELOPE_HEADER_INVALID", "v4 protectedHeader protocol/payload/algorithm 无效。");
  }
  const binding = bindingFromHeader(header);
  assertSameJson(
    binding,
    pinState.expectedBinding,
    "V4_SYNTHETIC_PRODUCER_KEY_BINDING_MISMATCH",
    "synthetic producer key policy 与 envelope 失配。"
  );
  assertSameJson(
    binding,
    decryptionState.expectedBinding,
    "V4_DECRYPTION_BINDING_MISMATCH",
    "decryption key policy 与 envelope 失配。"
  );
  const registryRef = validateRegistryRef(header.producerTrustRegistryRef, "v4 protectedHeader.producerTrustRegistryRef");
  assertSameJson(
    registryRef,
    pinState.producerTrustRegistryRef,
    "V4_SYNTHETIC_PRODUCER_KEY_BINDING_MISMATCH",
    "producer trust registry ref 与 synthetic envelope-outside key capability 失配。"
  );
  const headerProducerId = requireString(header.producerId, SYNTHETIC_PRODUCER_ID, "v4 protectedHeader.producerId");
  if (!headerProducerId.startsWith(`synthetic-producer/${binding.seatId}/`)) {
    fail("V4_PRODUCER_SEAT_MISMATCH", "synthetic producerId 必须与 envelope seatId 精确一致。");
  }
  if (headerProducerId !== pinState.producerId
    || header.producerSigningKeyId !== pinState.producerSigningKeyId
    || header.contentEncryptionKeyId !== decryptionState.contentEncryptionKeyId) {
    fail("V4_KEY_BINDING_MISMATCH", "v4 envelope producer/signing/encryption key identity 失配。");
  }
  requireString(header.producerSigningKeyId, SYNTHETIC_SIGNING_KEY_ID, "v4 protectedHeader.producerSigningKeyId");
  requireString(
    header.contentEncryptionKeyId,
    SYNTHETIC_ENCRYPTION_KEY_ID,
    "v4 protectedHeader.contentEncryptionKeyId"
  );
  const nonce = canonicalBase64(
    header.nonceBase64!, "v4 protectedHeader.nonceBase64", AUTHENTICATED_PRIVATE_ENVELOPE_V4.nonceBytes
  );
  assertSameJson(
    envelope.boundary,
    AUTHENTICATED_PRIVATE_ENVELOPE_V4_BOUNDARY,
    "V4_ENVELOPE_BOUNDARY_INVALID",
    "v4 envelope boundary 失配。"
  );
  assertExactKeys(envelope.ciphertext!, ["encoding", "byteLength", "sha256", "valueBase64"], "v4 ciphertext");
  const ciphertextRecord = envelope.ciphertext as JsonObject;
  if (ciphertextRecord.encoding !== "base64") fail("V4_ENVELOPE_INVALID", "v4 ciphertext encoding 无效。");
  const ciphertextByteLength = integer(
    ciphertextRecord.byteLength!, 1, AUTHENTICATED_PRIVATE_ENVELOPE_V4.maxCiphertextBytes, "v4 ciphertext.byteLength"
  );
  assertString(ciphertextRecord.sha256!, "v4 ciphertext.sha256", 64);
  if (!SHA256.test(ciphertextRecord.sha256 as string)) fail("V4_ENVELOPE_INVALID", "v4 ciphertext sha256 无效。");
  const ciphertext = canonicalBase64(ciphertextRecord.valueBase64!, "v4 ciphertext.valueBase64");
  if (ciphertext.byteLength !== ciphertextByteLength
    || rawSha256(ciphertext) !== ciphertextRecord.sha256) {
    fail("V4_CIPHERTEXT_IDENTITY_MISMATCH", "v4 ciphertext length/digest 失配。");
  }
  assertExactKeys(
    envelope.authentication!,
    ["aadSha256", "authenticationTagBase64", "producerSignatureBase64"],
    "v4 authentication"
  );
  const authentication = envelope.authentication as JsonObject;
  assertString(authentication.aadSha256!, "v4 authentication.aadSha256", 64);
  if (!SHA256.test(authentication.aadSha256 as string)) fail("V4_ENVELOPE_INVALID", "v4 AAD digest 无效。");
  const authenticationTag = canonicalBase64(
    authentication.authenticationTagBase64!,
    "v4 authentication.authenticationTagBase64",
    AUTHENTICATED_PRIVATE_ENVELOPE_V4.authenticationTagBytes
  );
  const producerSignature = canonicalBase64(
    authentication.producerSignatureBase64!,
    "v4 authentication.producerSignatureBase64",
    AUTHENTICATED_PRIVATE_ENVELOPE_V4.signatureBytes
  );
  const aadBytes = aadBytesForEnvelope(envelope);
  const aadSha256 = rawSha256(aadBytes);
  if (authentication.aadSha256 !== aadSha256) {
    fail("V4_AAD_IDENTITY_MISMATCH", "v4 canonical AAD digest 失配。");
  }
  const signatureBytes = signatureBytesForEnvelope(
    aadSha256,
    ciphertextByteLength,
    ciphertextRecord.sha256 as string,
    authentication.authenticationTagBase64 as string
  );
  let signatureValid = false;
  try {
    signatureValid = verifySignature(null, signatureBytes, pinState.signingPublicKey, producerSignature);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) fail("V4_CRYPTOGRAPHIC_AUTHENTICATION_FAILED", "v4 cryptographic authentication 失败。");
  let plaintext: Buffer | undefined;
  try {
    const decipher = createDecipheriv(
      AUTHENTICATED_PRIVATE_ENVELOPE_V4.aeadAlgorithm,
      decryptionState.contentEncryptionKey,
      nonce,
      { authTagLength: AUTHENTICATED_PRIVATE_ENVELOPE_V4.authenticationTagBytes }
    );
    decipher.setAAD(aadBytes);
    decipher.setAuthTag(authenticationTag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return fail("V4_CRYPTOGRAPHIC_AUTHENTICATION_FAILED", "v4 cryptographic authentication 失败。");
  }
  try {
    const payload = parseStrictJsonBytes(
      plaintext,
      "decrypted v4 payload",
      AUTHENTICATED_PRIVATE_ENVELOPE_V4.maxPlaintextBytes
    );
    validateSyntheticOriginalOpinionPayloadV4(payload, binding);
  } finally {
    plaintext.fill(0);
  }
  return OBJECT_FREEZE({
    schemaVersion: AUTHENTICATED_PRIVATE_ENVELOPE_V4.schemaVersion,
    reportType: "bazi_expert_authenticated_private_envelope_preflight_candidate_v4",
    syntheticOnly: true,
    ...binding,
    aeadIntegrityVerified: true,
    signatureAgainstSyntheticOutOfEnvelopeKeyVerified: true,
    decryptedSchemaAndBindingMatched: true,
    payloadSourceAuthenticated: false,
    realKeyProvenanceEstablished: false,
    humanIdentityEstablished: false,
    credentialsEstablished: false,
    participationConsentEstablished: false,
    opinionAuthenticityEstablished: false,
    firstSeenEstablished: false,
    custodyEstablished: false,
    pairwiseIndependenceEstablished: false,
    humanAttestationRecorded: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    formalAdmissionAllowed: false,
    eligibleAsStageCBindingEvidenceCandidate: false,
    eligibleForFormal2of2EvaluationCandidate: false,
    formalTwoOfTwoCountDelta: 0,
    expertGateCountDelta: 0,
    bindingFrozenCountDelta: 0,
    closure: OBJECT_FREEZE({
      formalExpertSeatsVerified: 0,
      formalExpertSeatsRequired: 2,
      bindingsFrozenVerified: 0,
      bindingsRequired: 12
    }),
    authorityBoundary: AUTHORITY_NONE,
    releaseGovernance: RELEASE_GOVERNANCE,
    runtimeTrustBoundary: RUNTIME_TRUST_BOUNDARY,
    mutationBoundary: OBJECT_FREEZE({
      persistencePerformed: false,
      schema13MutationEpochAvailable: false,
      schema13MutationEpochReceipt: null,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      replayExcluded: false,
      nonceReuseAcrossRunsExcluded: false,
      keyErasureProven: false
    })
  });
}

export const AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES = OBJECT_FREEZE({
  aadBytesForEnvelope: (envelope: JsonObject): Uint8Array => UINT8_ARRAY_SLICE(aadBytesForEnvelope(envelope)),
  signatureBytesForEnvelope: (
    aadSha256: string,
    ciphertextByteLength: number,
    ciphertextSha256: string,
    authenticationTagBase64: string
  ): Uint8Array => UINT8_ARRAY_SLICE(signatureBytesForEnvelope(
    aadSha256, ciphertextByteLength, ciphertextSha256, authenticationTagBase64
  ))
});
