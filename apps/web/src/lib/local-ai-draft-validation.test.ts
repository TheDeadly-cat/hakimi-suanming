import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RevisionRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  LOCAL_AI_DRAFT_MAX_CHARACTERS,
  prepareLocalAiDraftValidationContext,
  validateLocalAiDraftText,
  type LocalAiDraftValidationContext
} from "./local-ai-draft-validation";

let revision: RevisionRecord;
let context: LocalAiDraftValidationContext;

beforeAll(async () => {
  const chart = await calculateChart({
    schemaVersion: "1.0.0",
    calendarType: "gregorian",
    date: "1995-08-18",
    time: "08:26",
    timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai",
    sex: "male",
    lunarLeapMonth: false,
    location: {
      label: "不应进入本机 AI 上下文的地点",
      latitude: null,
      longitude: null,
      precision: "unknown"
    },
    sourceNote: "不应进入本机 AI 上下文的来源备注"
  }, WORKING_DEFAULT_RULE_PROFILE);
  revision = {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 2,
    createdAt: "2026-08-24T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    facts: chart.facts,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    manifest: chart.manifest
  };
  context = await prepareLocalAiDraftValidationContext(revision);
}, 30_000);

function templateDraft() {
  return JSON.parse(context.draftTemplateText) as {
    envelopeV2PayloadSha256: string;
    legacyDraft: {
      envelopePayloadSha256: string;
      assertions: Array<{
        assertionId: string;
        order: number;
        family: string;
        subjectId: string | null;
        content: string;
      }>;
    };
    timeAssertions: unknown[];
  };
}

describe("local AI draft validation", () => {
  it("重建当前 Revision 的 v2 Envelope，且导出上下文不复制原始出生输入", () => {
    expect(context.revisionId).toBe(revision.id);
    expect(context.revisionResultHash).toBe(revision.manifest.resultHash);
    expect(context.envelope.boundary.rawBirthInputCopied).toBe(false);
    expect(context.envelope.boundary.networkTransmissionPerformed).toBe(false);
    expect(context.envelope.boundary.networkTransmissionAuthorized).toBe(false);
    expect(context.envelope.boundary.chartOrStorageMutationPerformed).toBe(false);
    expect(context.contextPacketText).not.toContain("1995-08-18");
    expect(context.contextPacketText).not.toContain("08:26");
    expect(context.contextPacketText).not.toContain("不应进入本机 AI 上下文的地点");
    expect(context.contextPacketText).not.toContain("不应进入本机 AI 上下文的来源备注");
  });

  it("空白模板得到 null 比例，不制造伪 100%，也不调用 fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateLocalAiDraftText(context, context.draftTemplateText);

    expect(result.legacyResult.counts.assertionsTotal).toBe(0);
    expect(result.legacyResult.coverage.coverageRatio).toBeNull();
    expect(result.legacyResult.coverage.faithfulnessRatio).toBeNull();
    expect(result.timeAssessment.overallStatus).toBe("no_time_assertions");
    expect(result.boundary.crossPartitionRatioProduced).toBe(false);
    expect(result.boundary.networkTransmissionPerformed).toBe(false);
    expect(result.boundary.chartOrStorageMutationPerformed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  }, 30_000);

  it("只显示逐字绑定当前 Envelope 的规范事实", async () => {
    const fact = context.envelope.legacyEnvelope.facts.find((item) => item.status === "confirmed");
    if (!fact?.value) throw new Error("测试 Envelope 缺少可见事实");
    const draft = templateDraft();
    draft.legacyDraft.assertions.push({
      assertionId: "fact-1",
      order: 1,
      family: "fact_quote",
      subjectId: fact.factId,
      content: fact.value
    });

    const result = await validateLocalAiDraftText(context, JSON.stringify(draft));

    expect(result.legacyResult.assertions).toHaveLength(1);
    expect(result.legacyResult.assertions[0]).toMatchObject({
      verdict: "supported",
      displayStatus: "visible_with_evidence",
      canonicalContent: fact.value
    });
  }, 30_000);

  it("结果性自由断言保持隐藏，且结果不回显原始文本", async () => {
    const sentinel = "这是不应回显的绝对吉凶断言";
    const draft = templateDraft();
    draft.legacyDraft.assertions.push({
      assertionId: "blocked-1",
      order: 1,
      family: "overall_good_bad",
      subjectId: null,
      content: sentinel
    });

    const result = await validateLocalAiDraftText(context, JSON.stringify(draft));

    expect(result.legacyResult.assertions[0]).toMatchObject({
      verdict: "blocked",
      displayStatus: "withheld",
      canonicalContent: null
    });
    expect(JSON.stringify(result)).not.toContain(sentinel);
  }, 30_000);

  it("拒绝旧 Envelope 换绑、非法 JSON 与超限草稿", async () => {
    const stale = templateDraft();
    stale.envelopeV2PayloadSha256 = "0".repeat(64);
    await expect(validateLocalAiDraftText(context, JSON.stringify(stale)))
      .rejects.toThrow(/没有形成等式闭包/);
    await expect(validateLocalAiDraftText(context, "{"))
      .rejects.toThrow(/不是合法 JSON/);
    await expect(validateLocalAiDraftText(context, "x".repeat(LOCAL_AI_DRAFT_MAX_CHARACTERS + 1)))
      .rejects.toThrow(/不能超过/);
  }, 30_000);
});
