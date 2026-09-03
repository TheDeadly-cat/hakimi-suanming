// Deliberately narrow same-system bridge: the preview may invoke the audited
// rule layer, but it cannot import the adapter host UI, astronomy worker
// internals, or the contracts package directly.
export {
  WESTERN_RULE_LAYER_REQUEST_VERSION,
  WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
  WESTERN_TROPICAL_ZODIAC_IDENTITY,
  deriveZodiacPlacement,
  runWesternRuleLayer,
  verifyWesternRuleLayerComputedArtifact,
  westernRuleLayerArtifactSchema,
  westernRuleLayerRequestSchema
} from "../../western-astronomy-engine-adapter-draft/src/rule-layer/index.ts";

export type {
  WesternRuleLayerArtifact,
  WesternRuleLayerRequest,
  WesternZodiacIdentityDraft
} from "../../western-astronomy-engine-adapter-draft/src/rule-layer/index.ts";
