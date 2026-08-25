import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { BirthInput } from "@hakimi/contracts";
import { createDefaultResearchQuery } from "@hakimi/research-query";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository } from "@hakimi/storage";
import { executeWebResearchQuery } from "./research-query-adapter";

const input: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: "",
};

beforeEach(async () => {
  await caseRepository.clearAll();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await caseRepository.clearAll();
});

describe("executeWebResearchQuery", () => {
  it("默认查询只读取专用原子快照，透传取消信号且不改变结果语义", async () => {
    const bundle = await caseRepository.createCase({
      alias: "默认研究查询样本",
      calculated: await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE),
      duplicateGuard: "allow",
    });

    const readResearchQuerySnapshot = vi.spyOn(caseRepository, "readResearchQuerySnapshot");
    const readFullDataSnapshot = vi.spyOn(caseRepository, "readFullDataSnapshot")
      .mockRejectedValue(new Error("sentinel: legacy full snapshot must not be read"));
    const listAttachments = vi.spyOn(caseRepository, "listAttachments")
      .mockRejectedValue(new Error("sentinel: attachment bodies must not be listed"));
    const attachmentsToArray = vi.spyOn(caseRepository.database.attachments, "toArray")
      .mockRejectedValue(new Error("sentinel: attachment table must not be materialized"));
    const controller = new AbortController();
    const query = createDefaultResearchQuery("cases");

    const result = await executeWebResearchQuery(query, { signal: controller.signal });

    expect(readResearchQuerySnapshot).toHaveBeenCalledTimes(1);
    expect(readResearchQuerySnapshot.mock.calls[0]?.[0]?.signal).toBe(controller.signal);
    expect(readFullDataSnapshot).not.toHaveBeenCalled();
    expect(listAttachments).not.toHaveBeenCalled();
    expect(attachmentsToArray).not.toHaveBeenCalled();
    expect(Object.keys(result.snapshot).sort()).toEqual([
      "candidateSets",
      "cases",
      "events",
      "knowledgeDocuments",
      "researchNotes",
      "revisionCalculationReceiptLedgerStatus",
      "revisionCalculationReceipts",
      "revisions",
    ]);
    expect(result.execution.query).toEqual(query);
    expect(result.execution.total).toBe(1);
    expect(result.execution.results).toEqual([
      expect.objectContaining({
        key: `case:${bundle.caseRecord.id}`,
        scope: "cases",
        caseId: bundle.caseRecord.id,
        title: "默认研究查询样本",
      }),
    ]);
  });
});
