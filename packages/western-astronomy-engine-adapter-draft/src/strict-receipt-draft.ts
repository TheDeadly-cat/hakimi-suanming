import { verifyOfficialHorizonsResponse } from "./horizons-differential/index.ts";

export const WESTERN_CALCULATION_RECEIPT_DRAFT_VERSION = "western-calculation-receipt/0.1-draft" as const;

export type WesternStrictReceiptPrerequisitesDraft = Readonly<{
  timeScaleBound: "ut1_utc_explicit" | "none";
  leapSecondsBound: boolean;
  eopBound: boolean;
  targetCenterBound: boolean;
  referenceFrameBound: "icrf" | "none";
  licenseBound: boolean;
  domainReviewBound: boolean;
}>;

export type WesternCalculationReceiptDraft = Readonly<{
  schemaVersion: typeof WESTERN_CALCULATION_RECEIPT_DRAFT_VERSION;
  issued: false;
  reason:
    | "PREREQUISITES_MISSING"
    | "OFFICIAL_EVIDENCE_MISSING"
    | "OFFICIAL_EVIDENCE_INVALID"
    | "REVIEW_UNBOUND";
  missing: readonly string[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function evaluatePrerequisites(
  candidate: unknown
): { prerequisites: WesternStrictReceiptPrerequisitesDraft | null; missing: string[] } {
  if (!isRecord(candidate)) return { prerequisites: null, missing: ["prerequisites"] };
  const missing: string[] = [];
  if (candidate.timeScaleBound !== "ut1_utc_explicit") missing.push("timeScaleBound=ut1_utc_explicit");
  if (candidate.leapSecondsBound !== true) missing.push("leapSecondsBound");
  if (candidate.eopBound !== true) missing.push("eopBound");
  if (candidate.targetCenterBound !== true) missing.push("targetCenterBound");
  if (candidate.referenceFrameBound !== "icrf") missing.push("referenceFrameBound=icrf");
  if (candidate.licenseBound !== true) missing.push("licenseBound");
  if (candidate.domainReviewBound !== true) missing.push("domainReviewBound");
  if (missing.length) return { prerequisites: null, missing };
  return {
    prerequisites: candidate as unknown as WesternStrictReceiptPrerequisitesDraft,
    missing: []
  };
}

/**
 * Strict receipt gate. It never fabricates a receipt: official JPL bytes must
 * be verified against a locked evidence record, all time/coordinate/license
 * prerequisites must be bound, and a real domain review must be recorded.
 * Until then every call returns `issued:false` with the exact missing set.
 */
export async function issueWesternCalculationReceiptDraft(input: {
  prerequisites: unknown;
  officialResponseBytes?: Uint8Array;
  officialEvidenceRecord?: unknown;
}): Promise<WesternCalculationReceiptDraft> {
  const base = {
    schemaVersion: WESTERN_CALCULATION_RECEIPT_DRAFT_VERSION,
    issued: false as const
  };
  const evaluated = evaluatePrerequisites(input.prerequisites);
  if (evaluated.missing.length) {
    return { ...base, reason: "PREREQUISITES_MISSING", missing: evaluated.missing };
  }
  if (!input.officialResponseBytes || input.officialEvidenceRecord === undefined) {
    return { ...base, reason: "OFFICIAL_EVIDENCE_MISSING", missing: ["officialHorizonsResponseBytes", "officialHorizonsEvidenceRecord"] };
  }
  try {
    await verifyOfficialHorizonsResponse(input.officialResponseBytes, input.officialEvidenceRecord);
  } catch {
    return { ...base, reason: "OFFICIAL_EVIDENCE_INVALID", missing: ["officialHorizonsResponseBytes"] };
  }
  if (!evaluated.prerequisites!.domainReviewBound) {
    return { ...base, reason: "REVIEW_UNBOUND", missing: ["domainReviewBound"] };
  }
  // Deliberately unreachable until a real reviewer record is provided; the
  // return type keeps issued=false so no caller can observe a self-certified
  // receipt.
  return { ...base, reason: "REVIEW_UNBOUND", missing: ["domainReviewBound"] };
}
