import { describe, expect, it } from "vitest";
import {
  issueWesternCalculationReceiptDraft,
  WESTERN_CALCULATION_RECEIPT_DRAFT_VERSION
} from "./strict-receipt-draft.ts";

const completePrerequisites = {
  timeScaleBound: "ut1_utc_explicit",
  leapSecondsBound: true,
  eopBound: true,
  targetCenterBound: true,
  referenceFrameBound: "icrf",
  licenseBound: true,
  domainReviewBound: true
} as const;

describe("western strict calculation receipt draft", () => {
  it("缺少任何时间/坐标/许可/复核前提时失败关闭并列出缺失项", async () => {
    const receipt = await issueWesternCalculationReceiptDraft({ prerequisites: {} });
    expect(receipt.schemaVersion).toBe(WESTERN_CALCULATION_RECEIPT_DRAFT_VERSION);
    expect(receipt.issued).toBe(false);
    expect(receipt.reason).toBe("PREREQUISITES_MISSING");
    expect(receipt.missing).toContain("timeScaleBound=ut1_utc_explicit");
    expect(receipt.missing).toContain("domainReviewBound");
  });

  it("前提齐全但缺少官方 JPL 字节时不得签发", async () => {
    const receipt = await issueWesternCalculationReceiptDraft({
      prerequisites: completePrerequisites
    });
    expect(receipt.issued).toBe(false);
    expect(receipt.reason).toBe("OFFICIAL_EVIDENCE_MISSING");
  });

  it("官方字节或证据记录无效时以 OFFICIAL_EVIDENCE_INVALID 失败关闭", async () => {
    const receipt = await issueWesternCalculationReceiptDraft({
      prerequisites: completePrerequisites,
      officialResponseBytes: new TextEncoder().encode("not a horizons response"),
      officialEvidenceRecord: { schemaVersion: 1 }
    });
    expect(receipt.issued).toBe(false);
    expect(receipt.reason).toBe("OFFICIAL_EVIDENCE_INVALID");
  });

  it("即使前提与字节看似完整，也绝不会自签领域复核回执", async () => {
    const receipt = await issueWesternCalculationReceiptDraft({
      prerequisites: completePrerequisites,
      officialResponseBytes: new TextEncoder().encode("placeholder"),
      officialEvidenceRecord: { schemaVersion: 1 }
    });
    expect(receipt.issued).toBe(false);
    expect(receipt.reason).toBe("OFFICIAL_EVIDENCE_INVALID");
  });
});
