import {
  createCipheriv,
  createHash,
  createSecretKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  type KeyObject
} from "node:crypto";
import { Buffer } from "node:buffer";
import {
  AUTHENTICATED_PRIVATE_ENVELOPE_V4,
  AUTHENTICATED_PRIVATE_ENVELOPE_V4_BOUNDARY,
  AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES,
  BINDING_IDS,
  SYNTHETIC_ORIGINAL_OPINION_PAYLOAD_V4_BOUNDARY,
  canonicalStringify,
  createSyntheticDecryptionKeyCapabilityV4,
  createSyntheticOutOfEnvelopeProducerKeyCapabilityV4,
  rawSha256,
  type AuthenticatedPrivateEnvelopeV4ExpectedBinding,
  type SyntheticDecryptionKeyCapabilityV4,
  type SyntheticOutOfEnvelopeProducerKeyCapabilityV4,
  type SyntheticProducerTrustRegistryRefV4
} from "../index.ts";

function sha(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export type SyntheticV4TestMaterial = Readonly<{
  signingPrivateKey: KeyObject;
  signingPublicKey: KeyObject;
  contentEncryptionKey: KeyObject;
  producerTrustRegistryRef: SyntheticProducerTrustRegistryRefV4;
  producerId: string;
  producerSigningKeyId: string;
  contentEncryptionKeyId: string;
}>;

export function syntheticV4ExpectedBinding(
  seed = "default",
  seatId: "domain-expert-a" | "domain-expert-b" = "domain-expert-a",
  bindingId = BINDING_IDS[5]
): AuthenticatedPrivateEnvelopeV4ExpectedBinding {
  return Object.freeze({
    purpose: "binding_freeze_evidence",
    reviewCycleId: `bazi-formal-review-cycle/${sha(`cycle:${seed}`)}`,
    seatId,
    inputManifestRef: Object.freeze({
      manifestId: `bazi-review-input-manifest/${sha(`manifest-id:${seed}`)}`,
      manifestDigest: sha(`manifest-digest:${seed}`)
    }),
    reviewScope: Object.freeze({ mode: "single_binding", bindingId }),
    selectedBindingIds: Object.freeze([bindingId]) as readonly [typeof bindingId],
    selectedBindingSetDigest: sha(`selected-binding-set:${seed}:${bindingId}`),
    evidenceCategoryCode: "original_opinion",
    opaqueArtifactRef: `opaque-private-ref/original_opinion/${sha(`opaque:${seed}:${seatId}:${bindingId}`)}`
  });
}

export function syntheticV4TestMaterial(seed = "default"): SyntheticV4TestMaterial {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return Object.freeze({
    signingPrivateKey: privateKey,
    signingPublicKey: publicKey,
    contentEncryptionKey: createSecretKey(randomBytes(32)),
    producerTrustRegistryRef: Object.freeze({
      registryId: `synthetic-producer-trust-registry/${sha(`registry-id:${seed}`)}`,
      registryDigest: sha(`registry-digest:${seed}`)
    }),
    producerId: `synthetic-producer/domain-expert-a/${sha(`producer:${seed}`)}`,
    producerSigningKeyId: `synthetic-ed25519-key/${sha(`signing-key:${seed}`)}`,
    contentEncryptionKeyId: `synthetic-aes256gcm-key/${sha(`encryption-key:${seed}`)}`
  });
}

export function mintSyntheticV4Capabilities(
  material: SyntheticV4TestMaterial,
  binding: AuthenticatedPrivateEnvelopeV4ExpectedBinding
): Readonly<{
  pin: SyntheticOutOfEnvelopeProducerKeyCapabilityV4;
  decryption: SyntheticDecryptionKeyCapabilityV4;
}> {
  return Object.freeze({
    pin: createSyntheticOutOfEnvelopeProducerKeyCapabilityV4({
      syntheticOnly: true,
      expectedBinding: binding,
      producerTrustRegistryRef: material.producerTrustRegistryRef,
      producerId: material.producerId.replace("domain-expert-a", binding.seatId),
      producerSigningKeyId: material.producerSigningKeyId,
      signingPublicKey: material.signingPublicKey,
      realKeyProvenanceEstablished: false,
      authorityEstablished: false
    }),
    decryption: createSyntheticDecryptionKeyCapabilityV4({
      syntheticOnly: true,
      expectedBinding: binding,
      contentEncryptionKeyId: material.contentEncryptionKeyId,
      contentEncryptionKey: material.contentEncryptionKey,
      keyCustodyEstablished: false,
      authorityEstablished: false
    })
  });
}

export function syntheticOriginalOpinionPayloadV4(
  binding: AuthenticatedPrivateEnvelopeV4ExpectedBinding,
  seed = "default"
): Record<string, unknown> {
  return {
    schemaVersion: AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadSchemaVersion,
    recordType: AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadRecordType,
    ...binding,
    syntheticFixture: {
      fixtureId: `synthetic-original-opinion-fixture/${sha(`fixture:${seed}`)}`,
      statementCode: "cryptographic_transport_only_no_human_opinion"
    },
    boundary: SYNTHETIC_ORIGINAL_OPINION_PAYLOAD_V4_BOUNDARY
  };
}

export function sealSyntheticAuthenticatedEnvelopeV4(input: Readonly<{
  binding: AuthenticatedPrivateEnvelopeV4ExpectedBinding;
  material: SyntheticV4TestMaterial;
  seed?: string;
  plaintextBytes?: Uint8Array;
  nonce?: Uint8Array;
  producerIdOverride?: string;
}>): Readonly<{ envelope: Record<string, any>; rawEnvelopeBytes: Buffer }> {
  const seed = input.seed ?? "default";
  const nonce = input.nonce === undefined ? randomBytes(AUTHENTICATED_PRIVATE_ENVELOPE_V4.nonceBytes) : Buffer.from(input.nonce);
  const producerId = input.producerIdOverride
    ?? input.material.producerId.replace("domain-expert-a", input.binding.seatId);
  const protectedHeader = {
    protocolVersion: AUTHENTICATED_PRIVATE_ENVELOPE_V4.protocolVersion,
    ...input.binding,
    payloadRecordType: AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadRecordType,
    payloadSchemaVersion: AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadSchemaVersion,
    payloadMediaType: AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadMediaType,
    payloadEncoding: AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadEncoding,
    compression: AUTHENTICATED_PRIVATE_ENVELOPE_V4.compression,
    producerTrustRegistryRef: input.material.producerTrustRegistryRef,
    producerId,
    producerSigningKeyId: input.material.producerSigningKeyId,
    signatureAlgorithm: AUTHENTICATED_PRIVATE_ENVELOPE_V4.signatureAlgorithm,
    contentEncryptionKeyId: input.material.contentEncryptionKeyId,
    contentEncryptionAlgorithm: AUTHENTICATED_PRIVATE_ENVELOPE_V4.aeadAlgorithm,
    nonceBase64: nonce.toString("base64")
  };
  const envelope: Record<string, any> = {
    schemaVersion: AUTHENTICATED_PRIVATE_ENVELOPE_V4.schemaVersion,
    recordType: AUTHENTICATED_PRIVATE_ENVELOPE_V4.envelopeRecordType,
    protectedHeader,
    ciphertext: {
      encoding: "base64",
      byteLength: 0,
      sha256: "0".repeat(64),
      valueBase64: ""
    },
    authentication: {
      aadSha256: "0".repeat(64),
      authenticationTagBase64: "",
      producerSignatureBase64: ""
    },
    boundary: AUTHENTICATED_PRIVATE_ENVELOPE_V4_BOUNDARY
  };
  const aadBytes = Buffer.from(
    AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES.aadBytesForEnvelope(envelope)
  );
  const plaintext = input.plaintextBytes === undefined
    ? Buffer.from(canonicalStringify(syntheticOriginalOpinionPayloadV4(input.binding, seed)), "utf8")
    : Buffer.from(input.plaintextBytes);
  const cipher = createCipheriv(
    AUTHENTICATED_PRIVATE_ENVELOPE_V4.aeadAlgorithm,
    input.material.contentEncryptionKey,
    nonce,
    { authTagLength: AUTHENTICATED_PRIVATE_ENVELOPE_V4.authenticationTagBytes }
  );
  cipher.setAAD(aadBytes);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  plaintext.fill(0);
  const authenticationTag = cipher.getAuthTag();
  const aadSha256 = rawSha256(aadBytes);
  const ciphertextSha256 = rawSha256(ciphertext);
  envelope.ciphertext = {
    encoding: "base64",
    byteLength: ciphertext.byteLength,
    sha256: ciphertextSha256,
    valueBase64: ciphertext.toString("base64")
  };
  envelope.authentication = {
    aadSha256,
    authenticationTagBase64: authenticationTag.toString("base64"),
    producerSignatureBase64: sign(
      null,
      AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES.signatureBytesForEnvelope(
        aadSha256,
        ciphertext.byteLength,
        ciphertextSha256,
        authenticationTag.toString("base64")
      ),
      input.material.signingPrivateKey
    ).toString("base64")
  };
  return Object.freeze({
    envelope,
    rawEnvelopeBytes: Buffer.from(canonicalStringify(envelope), "utf8")
  });
}

export function encodeSyntheticV4Envelope(envelope: unknown): Buffer {
  return Buffer.from(canonicalStringify(envelope), "utf8");
}

export function cloneSyntheticV4Envelope<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
