import { BAZI_STRENGTH_POLICY } from "./strength-policy";

/** @deprecated Import BAZI_STRENGTH_POLICY.thresholds from strength-policy instead. */
export const BAZI_STRENGTH_BAND_THRESHOLDS = Object.freeze({
  ...BAZI_STRENGTH_POLICY.thresholds,
  evidenceClass: "engineering_candidate_thresholds" as const,
  reviewStatus: BAZI_STRENGTH_POLICY.reviewStatus
});

export {
  BAZI_STRENGTH_BAND_LABELS,
  classifyStrengthBand,
  type StrengthBand
} from "./strength-policy";
