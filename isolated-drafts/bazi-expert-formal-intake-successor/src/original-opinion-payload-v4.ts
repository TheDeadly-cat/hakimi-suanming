import {
  assertExactKeys,
  assertString,
  canonicalStringify,
  fail,
  type JsonValue
} from "./canonical.ts";
import {
  AUTHENTICATED_PRIVATE_ENVELOPE_V4,
  SYNTHETIC_ORIGINAL_OPINION_PAYLOAD_V4_BOUNDARY
} from "./protocol.ts";
import type { AuthenticatedPrivateEnvelopeV4ExpectedBinding } from "./authenticated-envelope-v4.ts";

const SYNTHETIC_FIXTURE_ID = /^synthetic-original-opinion-fixture\/[a-f0-9]{64}$/u;

function assertSameJson(left: unknown, right: unknown, code: string, message: string): void {
  if (canonicalStringify(left) !== canonicalStringify(right)) fail(code, message);
}

export function validateSyntheticOriginalOpinionPayloadV4(
  value: JsonValue,
  binding: AuthenticatedPrivateEnvelopeV4ExpectedBinding
): void {
  assertExactKeys(value, [
    "schemaVersion", "recordType", "purpose", "reviewCycleId", "seatId", "inputManifestRef",
    "reviewScope", "selectedBindingIds", "selectedBindingSetDigest", "evidenceCategoryCode",
    "opaqueArtifactRef", "syntheticFixture", "boundary"
  ], "decrypted v4 payload");
  if (value.schemaVersion !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadSchemaVersion
    || value.recordType !== AUTHENTICATED_PRIVATE_ENVELOPE_V4.payloadRecordType) {
    fail("V4_INNER_PAYLOAD_TYPE_FORBIDDEN", "decrypted payload 不是唯一允许的 v4 synthetic 类型。");
  }
  assertSameJson({
    purpose: value.purpose,
    reviewCycleId: value.reviewCycleId,
    seatId: value.seatId,
    inputManifestRef: value.inputManifestRef,
    reviewScope: value.reviewScope,
    selectedBindingIds: value.selectedBindingIds,
    selectedBindingSetDigest: value.selectedBindingSetDigest,
    evidenceCategoryCode: value.evidenceCategoryCode,
    opaqueArtifactRef: value.opaqueArtifactRef
  }, binding, "V4_INNER_PAYLOAD_BINDING_MISMATCH", "decrypted payload 与 authenticated header 失配。");
  assertExactKeys(value.syntheticFixture!, ["fixtureId", "statementCode"], "decrypted v4 payload.syntheticFixture");
  assertString(value.syntheticFixture.fixtureId!, "decrypted v4 payload.syntheticFixture.fixtureId", 128);
  if (!SYNTHETIC_FIXTURE_ID.test(value.syntheticFixture.fixtureId as string)
    || value.syntheticFixture.statementCode !== "cryptographic_transport_only_no_human_opinion") {
    fail("V4_INNER_PAYLOAD_INVALID", "decrypted payload synthetic fixture identity 无效。");
  }
  assertSameJson(
    value.boundary,
    SYNTHETIC_ORIGINAL_OPINION_PAYLOAD_V4_BOUNDARY,
    "V4_INNER_PAYLOAD_INVALID",
    "decrypted payload synthetic boundary 失配。"
  );
}
