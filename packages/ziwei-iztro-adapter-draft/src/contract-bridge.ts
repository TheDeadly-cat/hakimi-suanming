// This is the adapter draft's only permitted edge into the isolated contract draft.
// Both packages keep empty exports, so neither can be imported by production code.
export {
  ZIWEI_DIGEST_ALGORITHM,
  ZIWEI_DIGEST_VERIFICATION,
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  ZIWEI_EARTHLY_BRANCH_IDS,
  ZIWEI_SHICHEN_SLOTS,
  canonicalizeZiweiDigestJson,
  calculateZiweiNatalFixtureDigests,
  sha256ZiweiCanonicalJson,
  verifyZiweiNatalFixtureDraft,
  ziweiBirthInputDraftSchema,
  ziweiFactProvenanceDraftSchema,
  ziweiFixtureEvidenceDraftSchema,
  ziweiNatalFactsDraftSchema,
  ziweiNatalFixtureDraftSchema,
  ziweiRuleSnapshotDraftSchema
} from "../../ziwei-doushu-contracts-draft/src/index.ts";

export type {
  ZiweiBirthInputDraft,
  ZiweiNatalFactsDraft,
  ZiweiNatalFixtureDraft,
  ZiweiRuleSnapshotDraft
} from "../../ziwei-doushu-contracts-draft/src/index.ts";
