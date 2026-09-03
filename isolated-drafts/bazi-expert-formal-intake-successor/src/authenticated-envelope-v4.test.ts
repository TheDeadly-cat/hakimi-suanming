import { createSecretKey, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  AUTHENTICATED_PRIVATE_ENVELOPE_V4,
  AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES,
  AUTHORITY_NONE,
  HISTORICAL_RECORD_TYPES,
  PILOT_RECORD_TYPES,
  PREDECESSOR_V2_RECORD_TYPES,
  PURPOSE_RECORD_TYPES,
  RELEASE_GOVERNANCE,
  canonicalStringify,
  createSyntheticDecryptionKeyCapabilityV4,
  createSyntheticOutOfEnvelopeProducerKeyCapabilityV4,
  preflightAuthenticatedPrivateEnvelopeV4Candidate,
  rawSha256,
  type AuthenticatedPrivateEnvelopeV4ExpectedBinding
} from "./index.ts";
import {
  cloneSyntheticV4Envelope,
  encodeSyntheticV4Envelope,
  mintSyntheticV4Capabilities,
  sealSyntheticAuthenticatedEnvelopeV4,
  syntheticOriginalOpinionPayloadV4,
  syntheticV4ExpectedBinding,
  syntheticV4TestMaterial,
  type SyntheticV4TestMaterial
} from "./test-support/authenticated-envelope-v4-fixture.ts";

function expectCode(code: string) {
  return expect.objectContaining({ name: "FormalIntakeSuccessorError", code });
}

function fixture(seed = "default", seat: "domain-expert-a" | "domain-expert-b" = "domain-expert-a") {
  const binding = syntheticV4ExpectedBinding(seed, seat);
  const material = syntheticV4TestMaterial(seed);
  const capabilities = mintSyntheticV4Capabilities(material, binding);
  const sealed = sealSyntheticAuthenticatedEnvelopeV4({ binding, material, seed });
  return { binding, material, capabilities, ...sealed };
}

function resignEnvelope(envelope: Record<string, any>, material: SyntheticV4TestMaterial): void {
  const aadBytes = Buffer.from(
    AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES.aadBytesForEnvelope(envelope)
  );
  const ciphertext = Buffer.from(envelope.ciphertext.valueBase64, "base64");
  envelope.authentication.aadSha256 = rawSha256(aadBytes);
  envelope.ciphertext.byteLength = ciphertext.byteLength;
  envelope.ciphertext.sha256 = rawSha256(ciphertext);
  envelope.authentication.producerSignatureBase64 = sign(
    null,
    AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES.signatureBytesForEnvelope(
      envelope.authentication.aadSha256,
      envelope.ciphertext.byteLength,
      envelope.ciphertext.sha256,
      envelope.authentication.authenticationTagBase64
    ),
    material.signingPrivateKey
  ).toString("base64");
}

function plaintextFor(payload: unknown): Buffer {
  return Buffer.from(canonicalStringify(payload), "utf8");
}

describe("authenticated private envelope v4 synthetic-only candidate", () => {
  it("authenticates and decrypts one strict synthetic Binding payload without opening formal gates", () => {
    const sample = fixture("positive");
    const result = preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sample.rawEnvelopeBytes,
      sample.capabilities.pin,
      sample.capabilities.decryption
    );

    expect(result).toMatchObject({
      schemaVersion: "4.0.0",
      reportType: "bazi_expert_authenticated_private_envelope_preflight_candidate_v4",
      syntheticOnly: true,
      purpose: "binding_freeze_evidence",
      seatId: "domain-expert-a",
      evidenceCategoryCode: "original_opinion",
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
      closure: {
        formalExpertSeatsVerified: 0,
        formalExpertSeatsRequired: 2,
        bindingsFrozenVerified: 0,
        bindingsRequired: 12
      },
      authorityBoundary: AUTHORITY_NONE,
      releaseGovernance: RELEASE_GOVERNANCE,
      mutationBoundary: {
        persistencePerformed: false,
        schema13MutationEpochAvailable: false,
        schema13MutationEpochReceipt: null,
        crossFileAtomicSnapshot: false,
        intervalMutationExcluded: false,
        abaExcluded: false,
        replayExcluded: false,
        nonceReuseAcrossRunsExcluded: false,
        keyErasureProven: false
      }
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.closure)).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("ciphertext");
    expect(serialized).not.toContain("SignatureBase64");
    expect(serialized).not.toContain("fixture/");
    expect(serialized).not.toContain("KeyObject");
  });

  it("keeps A and B as separate zero-count synthetic observations", () => {
    const left = fixture("pair", "domain-expert-a");
    const right = fixture("pair-b", "domain-expert-b");
    const reports = [left, right].map((sample) => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sample.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
    ));
    expect(reports.map((entry) => entry.seatId)).toEqual(["domain-expert-a", "domain-expert-b"]);
    expect(reports.every((entry) => !entry.pairwiseIndependenceEstablished)).toBe(true);
    expect(reports.reduce((sum, entry) => sum + entry.formalTwoOfTwoCountDelta, 0)).toBe(0);
  });

  it("does not put a public key, AES key, or registry body inside the envelope", () => {
    const sample = fixture("no-key-material");
    const serialized = JSON.stringify(sample.envelope);
    expect(serialized).not.toContain("publicKey");
    expect(serialized).not.toContain("privateKey");
    expect(serialized).not.toContain("contentEncryptionKey\"");
    expect(serialized).not.toContain("BEGIN PUBLIC KEY");
    expect(Object.keys(sample.envelope.protectedHeader)).not.toContain("producerTrustRegistry");
  });

  it("keeps all v3 record identities unchanged", () => {
    expect(PURPOSE_RECORD_TYPES).toEqual({
      usability_only: "bazi_expert_usability_private_envelope_v3",
      binding_freeze_evidence: "bazi_expert_binding_freeze_evidence_private_envelope_v3",
      post_freeze_reaffirmation: "bazi_expert_post_freeze_reaffirmation_private_envelope_v3"
    });
  });

  it("does not claim replay exclusion when the same exact envelope is checked twice", () => {
    const sample = fixture("replay-boundary");
    const first = preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sample.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
    );
    const second = preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sample.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
    );
    expect(first.mutationBoundary.replayExcluded).toBe(false);
    expect(second.mutationBoundary.nonceReuseAcrossRunsExcluded).toBe(false);
  });

  it("makes key capabilities non-JSON-serializable", () => {
    const sample = fixture("nonserializable");
    expect(() => JSON.stringify(sample.capabilities.pin)).toThrow(expectCode("V4_CAPABILITY_NOT_SERIALIZABLE"));
    expect(() => JSON.stringify(sample.capabilities.decryption)).toThrow(expectCode("V4_CAPABILITY_NOT_SERIALIZABLE"));
  });

  it.each([
    ["spread pin", (sample: ReturnType<typeof fixture>) => ({ ...sample.capabilities.pin }), "pin"],
    ["spread decryption", (sample: ReturnType<typeof fixture>) => ({ ...sample.capabilities.decryption }), "decryption"],
    ["plain synthetic producer key", () => ({ capabilityType: "synthetic_out_of_envelope_producer_key_capability_v4" }), "pin"],
    ["plain decryption", () => ({ capabilityType: "synthetic_decryption_key_capability_v4" }), "decryption"],
    ["proxy pin", (sample: ReturnType<typeof fixture>) => new Proxy(sample.capabilities.pin, {}), "pin"],
    ["proxy decryption", (sample: ReturnType<typeof fixture>) => new Proxy(sample.capabilities.decryption, {}), "decryption"]
  ])("rejects forged capability: %s", (_label, forge, position) => {
    const sample = fixture(`capability-${position}-${_label}`);
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sample.rawEnvelopeBytes,
      position === "pin" ? forge(sample) : sample.capabilities.pin,
      position === "decryption" ? forge(sample) : sample.capabilities.decryption
    )).toThrow(expectCode(
      position === "pin" ? "V4_SYNTHETIC_PRODUCER_KEY_CAPABILITY_REQUIRED" : "V4_DECRYPTION_CAPABILITY_REQUIRED"
    ));
  });

  it("rejects structured clones if the runtime can clone the public shell", () => {
    const sample = fixture("structured-clone");
    let clone: unknown;
    try {
      clone = structuredClone(sample.capabilities.pin);
    } catch {
      return;
    }
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sample.rawEnvelopeBytes, clone, sample.capabilities.decryption
    )).toThrow(expectCode("V4_SYNTHETIC_PRODUCER_KEY_CAPABILITY_REQUIRED"));
  });

  it("rejects a non-Ed25519 pin and a non-256-bit AES key", () => {
    const binding = syntheticV4ExpectedBinding("bad-key");
    const material = syntheticV4TestMaterial("bad-key");
    const wrongSigning = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey;
    expect(() => createSyntheticOutOfEnvelopeProducerKeyCapabilityV4({
      syntheticOnly: true,
      expectedBinding: binding,
      producerTrustRegistryRef: material.producerTrustRegistryRef,
      producerId: material.producerId,
      producerSigningKeyId: material.producerSigningKeyId,
      signingPublicKey: wrongSigning,
      realKeyProvenanceEstablished: false,
      authorityEstablished: false
    })).toThrow(expectCode("V4_CAPABILITY_INPUT_INVALID"));
    expect(() => createSyntheticDecryptionKeyCapabilityV4({
      syntheticOnly: true,
      expectedBinding: binding,
      contentEncryptionKeyId: material.contentEncryptionKeyId,
      contentEncryptionKey: createSecretKey(randomBytes(16)),
      keyCustodyEstablished: false,
      authorityEstablished: false
    })).toThrow(expectCode("V4_CAPABILITY_INPUT_INVALID"));
  });

  it.each([
    ["A→B", "domain-expert-a", "domain-expert-b", "d"],
    ["B→A", "domain-expert-b", "domain-expert-a", "e"]
  ] as const)("rejects producer-seat mismatch while issuing a synthetic key capability: %s", (
    _label,
    expectedSeat,
    producerSeat,
    digestDigit
  ) => {
    const binding = syntheticV4ExpectedBinding(`issuer-seat-${_label}`, expectedSeat);
    const material = syntheticV4TestMaterial(`issuer-seat-${_label}`);
    expect(() => createSyntheticOutOfEnvelopeProducerKeyCapabilityV4({
      syntheticOnly: true,
      expectedBinding: binding,
      producerTrustRegistryRef: material.producerTrustRegistryRef,
      producerId: `synthetic-producer/${producerSeat}/${digestDigit.repeat(64)}`,
      producerSigningKeyId: material.producerSigningKeyId,
      signingPublicKey: material.signingPublicKey,
      realKeyProvenanceEstablished: false,
      authorityEstablished: false
    })).toThrow(expectCode("V4_PRODUCER_SEAT_MISMATCH"));
  });

  it.each([
    ["A→B", "domain-expert-b", "domain-expert-a", "f"],
    ["B→A", "domain-expert-a", "domain-expert-b", "0"]
  ] as const)("rejects fully re-encrypted and re-signed producer-seat substitution: %s", (
    _label,
    envelopeSeat,
    producerSeat,
    digestDigit
  ) => {
    const binding = syntheticV4ExpectedBinding(`preflight-seat-${_label}`, envelopeSeat);
    const material = syntheticV4TestMaterial(`preflight-seat-${_label}`);
    const capabilities = mintSyntheticV4Capabilities(material, binding);
    const sealed = sealSyntheticAuthenticatedEnvelopeV4({
      binding,
      material,
      seed: `preflight-seat-${_label}`,
      producerIdOverride: `synthetic-producer/${producerSeat}/${digestDigit.repeat(64)}`
    });
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sealed.rawEnvelopeBytes, capabilities.pin, capabilities.decryption
    )).toThrow(expectCode("V4_PRODUCER_SEAT_MISMATCH"));
  });

  it.each([
    ["random bytes", Buffer.alloc(48, 7)],
    ["rehearsal JSON", Buffer.from(JSON.stringify({
      recordType: "bazi_expert_single_binding_nocode_rehearsal_submission_candidate_v1",
      syntheticOnly: true,
      formalAdmissionAllowed: false
    }), "utf8")]
  ])("rejects non-encrypted smuggling even when attacker re-signs: %s", (_label, bytes) => {
    const sample = fixture(`smuggle-${_label}`);
    const forged = cloneSyntheticV4Envelope(sample.envelope);
    forged.ciphertext.valueBase64 = bytes.toString("base64");
    resignEnvelope(forged, sample.material);
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      encodeSyntheticV4Envelope(forged), sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode("V4_CRYPTOGRAPHIC_AUTHENTICATION_FAILED"));
  });

  it.each([
    ["ciphertext", (value: Record<string, any>) => {
      const bytes = Buffer.from(value.ciphertext.valueBase64, "base64");
      bytes[0] = bytes[0]! ^ 1;
      value.ciphertext.valueBase64 = bytes.toString("base64");
    }],
    ["tag", (value: Record<string, any>) => {
      const bytes = Buffer.from(value.authentication.authenticationTagBase64, "base64");
      bytes[0] = bytes[0]! ^ 1;
      value.authentication.authenticationTagBase64 = bytes.toString("base64");
    }],
    ["nonce", (value: Record<string, any>) => {
      const bytes = Buffer.from(value.protectedHeader.nonceBase64, "base64");
      bytes[0] = bytes[0]! ^ 1;
      value.protectedHeader.nonceBase64 = bytes.toString("base64");
    }]
  ])("rejects re-signed %s tampering at AEAD", (_label, mutate) => {
    const sample = fixture(`aead-tamper-${_label}`);
    const forged = cloneSyntheticV4Envelope(sample.envelope);
    mutate(forged);
    resignEnvelope(forged, sample.material);
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      encodeSyntheticV4Envelope(forged), sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode("V4_CRYPTOGRAPHIC_AUTHENTICATION_FAILED"));
  });

  it("rejects a changed signature", () => {
    const sample = fixture("signature-tamper");
    const forged = cloneSyntheticV4Envelope(sample.envelope);
    const bytes = Buffer.from(forged.authentication.producerSignatureBase64, "base64");
    bytes[0] = bytes[0]! ^ 1;
    forged.authentication.producerSignatureBase64 = bytes.toString("base64");
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      encodeSyntheticV4Envelope(forged), sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode("V4_CRYPTOGRAPHIC_AUTHENTICATION_FAILED"));
  });

  it("rejects a wrong synthetic out-of-envelope public key and a wrong AES key even with matching key IDs", () => {
    const sample = fixture("wrong-keys");
    const attacker = syntheticV4TestMaterial("wrong-keys-attacker");
    const wrongPin = createSyntheticOutOfEnvelopeProducerKeyCapabilityV4({
      syntheticOnly: true,
      expectedBinding: sample.binding,
      producerTrustRegistryRef: sample.material.producerTrustRegistryRef,
      producerId: sample.material.producerId,
      producerSigningKeyId: sample.material.producerSigningKeyId,
      signingPublicKey: attacker.signingPublicKey,
      realKeyProvenanceEstablished: false,
      authorityEstablished: false
    });
    const wrongDecryption = createSyntheticDecryptionKeyCapabilityV4({
      syntheticOnly: true,
      expectedBinding: sample.binding,
      contentEncryptionKeyId: sample.material.contentEncryptionKeyId,
      contentEncryptionKey: attacker.contentEncryptionKey,
      keyCustodyEstablished: false,
      authorityEstablished: false
    });
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sample.rawEnvelopeBytes, wrongPin, sample.capabilities.decryption
    )).toThrow(expectCode("V4_CRYPTOGRAPHIC_AUTHENTICATION_FAILED"));
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sample.rawEnvelopeBytes, sample.capabilities.pin, wrongDecryption
    )).toThrow(expectCode("V4_CRYPTOGRAPHIC_AUTHENTICATION_FAILED"));
  });

  it.each([
    ["purpose", (value: Record<string, any>) => { value.protectedHeader.purpose = "usability_only"; }],
    ["cycle", (value: Record<string, any>) => { value.protectedHeader.reviewCycleId = `bazi-formal-review-cycle/${"1".repeat(64)}`; }],
    ["seat", (value: Record<string, any>) => { value.protectedHeader.seatId = "domain-expert-b"; }],
    ["manifest id", (value: Record<string, any>) => { value.protectedHeader.inputManifestRef.manifestId = `bazi-review-input-manifest/${"2".repeat(64)}`; }],
    ["manifest digest", (value: Record<string, any>) => { value.protectedHeader.inputManifestRef.manifestDigest = "3".repeat(64); }],
    ["scope binding", (value: Record<string, any>) => { value.protectedHeader.reviewScope.bindingId = "binding:policy:weights"; value.protectedHeader.selectedBindingIds = ["binding:policy:weights"]; }],
    ["selected ids", (value: Record<string, any>) => { value.protectedHeader.selectedBindingIds = ["binding:policy:weights"]; }],
    ["selected digest", (value: Record<string, any>) => { value.protectedHeader.selectedBindingSetDigest = "4".repeat(64); }],
    ["category", (value: Record<string, any>) => { value.protectedHeader.evidenceCategoryCode = "first_seen"; }],
    ["opaque ref", (value: Record<string, any>) => { value.protectedHeader.opaqueArtifactRef = `opaque-private-ref/original_opinion/${"5".repeat(64)}`; }]
  ])("rejects cross-binding of %s", (_label, mutate) => {
    const sample = fixture(`cross-bind-${_label}`);
    const forged = cloneSyntheticV4Envelope(sample.envelope);
    mutate(forged);
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      encodeSyntheticV4Envelope(forged), sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow();
  });

  it.each([
    ["registry", (value: Record<string, any>) => { value.protectedHeader.producerTrustRegistryRef.registryDigest = "6".repeat(64); }],
    ["producer", (value: Record<string, any>) => { value.protectedHeader.producerId = `synthetic-producer/domain-expert-a/${"7".repeat(64)}`; }],
    ["signing key", (value: Record<string, any>) => { value.protectedHeader.producerSigningKeyId = `synthetic-ed25519-key/${"8".repeat(64)}`; }],
    ["encryption key", (value: Record<string, any>) => { value.protectedHeader.contentEncryptionKeyId = `synthetic-aes256gcm-key/${"9".repeat(64)}`; }]
  ])("rejects caller replacement of synthetic envelope-outside %s identity", (_label, mutate) => {
    const sample = fixture(`synthetic-key-ref-${_label}`);
    const forged = cloneSyntheticV4Envelope(sample.envelope);
    mutate(forged);
    resignEnvelope(forged, sample.material);
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      encodeSyntheticV4Envelope(forged), sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow();
  });

  it.each([
    ["ciphertext base64 whitespace", (value: Record<string, any>) => { value.ciphertext.valueBase64 += "\n"; }],
    ["wrong nonce length", (value: Record<string, any>) => { value.protectedHeader.nonceBase64 = Buffer.alloc(11).toString("base64"); }],
    ["wrong tag length", (value: Record<string, any>) => { value.authentication.authenticationTagBase64 = Buffer.alloc(15).toString("base64"); }],
    ["wrong signature length", (value: Record<string, any>) => { value.authentication.producerSignatureBase64 = Buffer.alloc(63).toString("base64"); }],
    ["ciphertext length", (value: Record<string, any>) => { value.ciphertext.byteLength += 1; }],
    ["ciphertext digest", (value: Record<string, any>) => { value.ciphertext.sha256 = "a".repeat(64); }],
    ["AAD digest", (value: Record<string, any>) => { value.authentication.aadSha256 = "b".repeat(64); }]
  ])("rejects non-canonical or mismatched envelope field: %s", (_label, mutate) => {
    const sample = fixture(`canonical-${_label}`);
    const forged = cloneSyntheticV4Envelope(sample.envelope);
    mutate(forged);
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      encodeSyntheticV4Envelope(forged), sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow();
  });

  it.each([
    ["algorithm", (value: Record<string, any>) => { value.protectedHeader.contentEncryptionAlgorithm = "aes-256-cbc"; }],
    ["signature algorithm", (value: Record<string, any>) => { value.protectedHeader.signatureAlgorithm = "rsa"; }],
    ["compression", (value: Record<string, any>) => { value.protectedHeader.compression = "gzip"; }],
    ["expected payload type", (value: Record<string, any>) => { value.protectedHeader.payloadRecordType = "bazi_expert_original_opinion_v1"; }],
    ["expected payload schema", (value: Record<string, any>) => { value.protectedHeader.payloadSchemaVersion = "3.0.0"; }],
    ["payload media", (value: Record<string, any>) => { value.protectedHeader.payloadMediaType = "text/plain"; }],
    ["payload encoding", (value: Record<string, any>) => { value.protectedHeader.payloadEncoding = "utf-16"; }],
    ["fail-closed boundary", (value: Record<string, any>) => { value.boundary.formalAdmissionAllowed = true; }],
    ["outer record type", (value: Record<string, any>) => { value.recordType = PURPOSE_RECORD_TYPES.binding_freeze_evidence; }],
    ["embedded public key", (value: Record<string, any>) => { value.publicKey = "attacker-key"; }],
    ["unknown header field", (value: Record<string, any>) => { value.protectedHeader.attackerPin = "self-pin"; }]
  ])("rejects algorithm/type/key-smuggling mutation: %s", (_label, mutate) => {
    const sample = fixture(`header-${_label}`);
    const forged = cloneSyntheticV4Envelope(sample.envelope);
    mutate(forged);
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      encodeSyntheticV4Envelope(forged), sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow();
  });

  it.each([
    ...HISTORICAL_RECORD_TYPES,
    ...PILOT_RECORD_TYPES,
    ...PREDECESSOR_V2_RECORD_TYPES,
    ...Object.values(PURPOSE_RECORD_TYPES)
  ])("rejects decrypted predecessor/pilot/rehearsal payload type %s", (recordType) => {
    const sample = fixture(`inner-type-${recordType}`);
    const payload = syntheticOriginalOpinionPayloadV4(sample.binding, "inner-type");
    payload.recordType = recordType;
    const sealed = sealSyntheticAuthenticatedEnvelopeV4({
      binding: sample.binding,
      material: sample.material,
      plaintextBytes: plaintextFor(payload)
    });
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sealed.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode("V4_INNER_PAYLOAD_TYPE_FORBIDDEN"));
  });

  it("rejects an unknown decrypted field and an inner binding swap", () => {
    const sample = fixture("inner-binding");
    const unknown = syntheticOriginalOpinionPayloadV4(sample.binding, "unknown");
    unknown.unexpected = true;
    const unknownSealed = sealSyntheticAuthenticatedEnvelopeV4({
      binding: sample.binding, material: sample.material, plaintextBytes: plaintextFor(unknown)
    });
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      unknownSealed.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode("INPUT_KEYS_INVALID"));

    const swapped = syntheticOriginalOpinionPayloadV4(sample.binding, "swapped");
    swapped.reviewCycleId = `bazi-formal-review-cycle/${"c".repeat(64)}`;
    const swappedSealed = sealSyntheticAuthenticatedEnvelopeV4({
      binding: sample.binding, material: sample.material, plaintextBytes: plaintextFor(swapped)
    });
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      swappedSealed.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode("V4_INNER_PAYLOAD_BINDING_MISMATCH"));
  });

  it.each([
    ["BOM", (payload: Buffer) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), payload]), "JSON_BOM_FORBIDDEN"],
    ["invalid UTF-8", () => Buffer.from([0xc3, 0x28]), "JSON_UTF8_INVALID"],
    ["duplicate key", () => Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8"), "DUPLICATE_JSON_KEY"]
  ])("rejects decrypted %s", (_label, transform, code) => {
    const sample = fixture(`inner-bytes-${_label}`);
    const base = plaintextFor(syntheticOriginalOpinionPayloadV4(sample.binding, "inner-bytes"));
    const sealed = sealSyntheticAuthenticatedEnvelopeV4({
      binding: sample.binding,
      material: sample.material,
      plaintextBytes: transform(base)
    });
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sealed.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode(code));
  });

  it("rejects over-limit decrypted content before exposing it", () => {
    const sample = fixture("inner-over-limit");
    const sealed = sealSyntheticAuthenticatedEnvelopeV4({
      binding: sample.binding,
      material: sample.material,
      plaintextBytes: Buffer.alloc(AUTHENTICATED_PRIVATE_ENVELOPE_V4.maxPlaintextBytes + 1, 0x20)
    });
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      sealed.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow();
  });

  it("does not echo decrypted sentinel text or cryptographic bytes in errors", () => {
    const sample = fixture("error-redaction");
    const payload = syntheticOriginalOpinionPayloadV4(sample.binding, "error-redaction");
    const sentinel = "SYNTHETIC_PRIVATE_SENTINEL_MUST_NOT_ESCAPE";
    payload.unexpected = sentinel;
    const sealed = sealSyntheticAuthenticatedEnvelopeV4({
      binding: sample.binding,
      material: sample.material,
      plaintextBytes: plaintextFor(payload)
    });
    let thrown: unknown;
    try {
      preflightAuthenticatedPrivateEnvelopeV4Candidate(
        sealed.rawEnvelopeBytes, sample.capabilities.pin, sample.capabilities.decryption
      );
    } catch (error) {
      thrown = error;
    }
    const rendered = String(thrown instanceof Error ? `${thrown.name}:${thrown.message}` : thrown);
    expect(rendered).not.toContain(sentinel);
    expect(rendered).not.toContain(sealed.envelope.ciphertext.valueBase64);
    expect(rendered).not.toContain(sealed.envelope.authentication.producerSignatureBase64);
  });

  it.each([
    ["outer BOM", (bytes: Buffer) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes]), "JSON_BOM_FORBIDDEN"],
    ["outer invalid UTF-8", () => Buffer.from([0xc3, 0x28]), "JSON_UTF8_INVALID"],
    ["outer duplicate key", () => Buffer.from('{"schemaVersion":"4.0.0","schemaVersion":"4.0.0"}', "utf8"), "DUPLICATE_JSON_KEY"],
    ["arbitrary non-JSON bytes", () => Buffer.alloc(48, 0x61), "JSON_INVALID"]
  ])("rejects malformed envelope bytes: %s", (_label, transform, code) => {
    const sample = fixture(`outer-bytes-${_label}`);
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      transform(sample.rawEnvelopeBytes), sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode(code));
  });

  it("rejects a Proxy around raw bytes", () => {
    const sample = fixture("byte-proxy");
    const proxied = new Proxy(sample.rawEnvelopeBytes, {});
    expect(() => preflightAuthenticatedPrivateEnvelopeV4Candidate(
      proxied, sample.capabilities.pin, sample.capabilities.decryption
    )).toThrow(expectCode("V4_ENVELOPE_BYTES_INVALID"));
  });
});
