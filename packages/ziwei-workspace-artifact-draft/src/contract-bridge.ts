// Deliberately narrow deep bridge. The source contract keeps empty public
// exports, and the draft-boundary registry audits this exact same-system edge.
export {
  ZIWEI_DIGEST_ALGORITHM,
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  canonicalizeZiweiDigestJson,
  sha256ZiweiCanonicalJson,
  verifyZiweiNatalFixtureDraft,
  ziweiNatalFixtureDraftSchema
} from "../../ziwei-doushu-contracts-draft/src/index.ts";

export type {
  ZiweiBirthInputDraft,
  ZiweiNatalFixtureDraft,
  ZiweiNatalFixtureVerificationResult
} from "../../ziwei-doushu-contracts-draft/src/index.ts";
