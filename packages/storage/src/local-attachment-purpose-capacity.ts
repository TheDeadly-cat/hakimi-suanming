export const LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS = 256;
export const LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS = 64 * 1024 * 1024;
export const LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES = 64;
export const LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES = 32 * 1024 * 1024;

export type LocalAttachmentPurposeMetadataSnapshotLimitCode =
  | "SCAN_ROW_LIMIT_EXCEEDED"
  | "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED"
  | "MATCH_LIMIT_EXCEEDED"
  | "MATCHED_BYTE_LIMIT_EXCEEDED";

export class LocalAttachmentPurposeMetadataSnapshotLimitError extends Error {
  constructor(
    readonly code: LocalAttachmentPurposeMetadataSnapshotLimitCode,
    message: string
  ) {
    super(message);
    this.name = "LocalAttachmentPurposeMetadataSnapshotLimitError";
  }
}

export type ExactUnlinkedAttachmentCreateCapacityInput = Readonly<{
  sameMediaRows: number;
  scannedEncodedCharacters: number;
  exactPurposeMatches: number;
  matchedDeclaredBytes: number;
  successorEncodedCharacters: number;
  successorDeclaredBytes: number;
}>;

export type LocalAttachmentPurposeCapacityTotals = Readonly<{
  sameMediaRows: number;
  scannedEncodedCharacters: number;
  exactPurposeMatches: number;
  matchedDeclaredBytes: number;
}>;

/** Pure current-total check used while scanning the exact-purpose collection. */
export function assertLocalAttachmentPurposeCapacityTotals(
  totals: LocalAttachmentPurposeCapacityTotals
): void {
  if (totals.sameMediaRows > LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS) {
    throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
      "SCAN_ROW_LIMIT_EXCEEDED",
      `Exact unlinked attachment admission cannot exceed ${LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS} same-media rows.`
    );
  }
  if (
    totals.scannedEncodedCharacters >
    LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS
  ) {
    throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
      "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED",
      "Exact unlinked attachment admission exceeded its Base64 encoded-character scan budget."
    );
  }
  if (totals.exactPurposeMatches > LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES) {
    throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
      "MATCH_LIMIT_EXCEEDED",
      `Exact unlinked attachment admission cannot exceed ${LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES} matches.`
    );
  }
  if (
    totals.matchedDeclaredBytes >
    LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES
  ) {
    throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
      "MATCHED_BYTE_LIMIT_EXCEEDED",
      "Exact unlinked attachment admission exceeded its matched declared-byte budget."
    );
  }
}

/** Pure prospective-capacity check shared by the write transaction and boundary tests. */
export function assertExactUnlinkedAttachmentCreateCapacity(
  input: ExactUnlinkedAttachmentCreateCapacityInput
): void {
  assertLocalAttachmentPurposeCapacityTotals({
    sameMediaRows: input.sameMediaRows + 1,
    scannedEncodedCharacters: input.scannedEncodedCharacters + input.successorEncodedCharacters,
    exactPurposeMatches: input.exactPurposeMatches + 1,
    matchedDeclaredBytes: input.matchedDeclaredBytes + input.successorDeclaredBytes
  });
}
