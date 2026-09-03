import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES } from "./authenticated-envelope-v4.ts";

// These expected byte strings are fixed literals authored independently of the
// production canonicalizer. Do not replace them with canonicalStringify calls.
const FIXED_AAD_BYTES =
  "hakimi/bazi/expert-formal-intake-successor/authenticated-private-envelope/v4/aes-gcm-aad\u0000"
  + "{\"boundary\":{\"formalAdmissionAllowed\":false,\"syntheticOnly\":true},"
  + "\"protectedHeader\":{\"nonceBase64\":\"AAECAwQFBgcICQoL\","
  + "\"purpose\":\"binding_freeze_evidence\",\"seatId\":\"domain-expert-a\"},"
  + "\"recordType\":\"kat-record\",\"schemaVersion\":\"4.0.0\"}";

const FIXED_SIGNATURE_STATEMENT_BYTES =
  "hakimi/bazi/expert-formal-intake-successor/authenticated-private-envelope/v4/ed25519-statement\u0000"
  + "{\"aadSha256\":\"1111111111111111111111111111111111111111111111111111111111111111\","
  + "\"authenticationTagBase64\":\"EBESExQVFhcYGRobHB0eHw==\","
  + "\"ciphertextByteLength\":321,"
  + "\"ciphertextSha256\":\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\","
  + "\"statementVersion\":\"hakimi.bazi.authenticated-private-envelope.signature-statement/1.0.0\"}";

describe("authenticated private envelope v4 independent canonical-byte KAT", () => {
  it("matches fixed AAD and signature-statement bytes without a shared expected-value helper", () => {
    const envelope = {
      schemaVersion: "4.0.0",
      recordType: "kat-record",
      protectedHeader: {
        purpose: "binding_freeze_evidence",
        seatId: "domain-expert-a",
        nonceBase64: "AAECAwQFBgcICQoL"
      },
      boundary: {
        syntheticOnly: true,
        formalAdmissionAllowed: false
      }
    };
    const actualAad = AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES.aadBytesForEnvelope(envelope);
    const actualSignatureStatement =
      AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES.signatureBytesForEnvelope(
        "1".repeat(64),
        321,
        "b".repeat(64),
        "EBESExQVFhcYGRobHB0eHw=="
      );

    expect(Buffer.from(actualAad)).toEqual(Buffer.from(FIXED_AAD_BYTES, "utf8"));
    expect(Buffer.from(actualSignatureStatement)).toEqual(
      Buffer.from(FIXED_SIGNATURE_STATEMENT_BYTES, "utf8")
    );
  });

  it("matches an independently fixed full-schema AAD digest", () => {
    const envelope = {
      schemaVersion: "4.0.0",
      recordType: "bazi_expert_binding_freeze_evidence_authenticated_private_envelope_v4",
      protectedHeader: {
        protocolVersion: "hakimi.bazi.authenticated-private-envelope/4.0.0",
        purpose: "binding_freeze_evidence",
        reviewCycleId: `bazi-formal-review-cycle/${"1".repeat(64)}`,
        seatId: "domain-expert-a",
        inputManifestRef: {
          manifestId: `bazi-review-input-manifest/${"2".repeat(64)}`,
          manifestDigest: "3".repeat(64)
        },
        reviewScope: { mode: "single_binding", bindingId: "binding:policy:thresholds" },
        selectedBindingIds: ["binding:policy:thresholds"],
        selectedBindingSetDigest: "4".repeat(64),
        evidenceCategoryCode: "original_opinion",
        opaqueArtifactRef: `opaque-private-ref/original_opinion/${"5".repeat(64)}`,
        payloadRecordType: "bazi_expert_binding_freeze_original_opinion_synthetic_payload_v4",
        payloadSchemaVersion: "1.0.0",
        payloadMediaType: "application/json",
        payloadEncoding: "utf-8",
        compression: "none",
        producerTrustRegistryRef: {
          registryId: `synthetic-producer-trust-registry/${"6".repeat(64)}`,
          registryDigest: "7".repeat(64)
        },
        producerId: `synthetic-producer/domain-expert-a/${"8".repeat(64)}`,
        producerSigningKeyId: `synthetic-ed25519-key/${"9".repeat(64)}`,
        signatureAlgorithm: "ed25519",
        contentEncryptionKeyId: `synthetic-aes256gcm-key/${"a".repeat(64)}`,
        contentEncryptionAlgorithm: "aes-256-gcm",
        nonceBase64: "AAECAwQFBgcICQoL"
      },
      boundary: {
        syntheticOnly: true,
        repositoryStorageAllowed: false,
        plaintextPersistenceAllowed: false,
        envelopeCarriesKeyOrPinMaterial: false,
        sourceAuthenticationMeaning: "synthetic_out_of_envelope_key_holder_mechanical_verification_only",
        payloadSourceAuthenticated: false,
        humanIdentityEstablished: false,
        credentialsEstablished: false,
        participationConsentEstablished: false,
        opinionAuthenticityEstablished: false,
        firstSeenEstablished: false,
        custodyEstablished: false,
        pairwiseIndependenceEstablished: false,
        contentTruthEstablished: false,
        expertTruthEstablished: false,
        replayExcluded: false,
        formalAdmissionAllowed: false
      }
    };
    const actualAad = AUTHENTICATED_PRIVATE_ENVELOPE_V4_CANONICAL_BYTES.aadBytesForEnvelope(envelope);
    expect(createHash("sha256").update(actualAad).digest("hex")).toBe(
      "cd4b8cc49d9fab91215942ea87b9490047d9875190d60292e0e8784be3d6df27"
    );
  });
});
