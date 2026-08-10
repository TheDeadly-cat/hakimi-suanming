// Deliberately narrow same-system bridge: the preview may invoke the audited
// rule layer, but it cannot import the adapter host UI, astronomy worker
// internals, or the contracts package directly.
export {
  runWesternRuleLayer,
  westernRuleLayerArtifactSchema,
  westernRuleLayerRequestSchema
} from "../../western-astronomy-engine-adapter-draft/src/rule-layer/index.ts";

export type {
  WesternRuleLayerArtifact,
  WesternRuleLayerRequest
} from "../../western-astronomy-engine-adapter-draft/src/rule-layer/index.ts";
