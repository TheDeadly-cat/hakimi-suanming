// Deliberately narrow deep bridge. Both packages keep empty public exports so
// production code cannot import either draft through normal package resolution.
export {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  calculateZiweiNatalFixtureDigests,
  sha256ZiweiCanonicalJson,
  verifyZiweiNatalFixtureDraft
} from "../../ziwei-doushu-contracts-draft/src/index.ts";

export type {
  ZiweiNatalFixtureDraft
} from "../../ziwei-doushu-contracts-draft/src/index.ts";
