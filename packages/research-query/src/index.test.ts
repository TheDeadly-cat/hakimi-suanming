import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  RESEARCH_QUERY_VERSION,
  buildTimeZoneDatabaseSnapshotId,
  researchQueryHeavenlyStemSchema,
  type BirthInput,
  type CandidateSetRecord,
  type CaseRecord,
  type EventRecord,
  type KnowledgeDocumentRecord,
  type ResearchNoteRecord,
  type RevisionCalculationReceiptRecord,
  type RevisionRecord
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { buildKnowledgeContentSnapshot } from "@hakimi/knowledge-core";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  buildRevisionCalculationReceiptDigestPayload,
  buildRevisionDerivedReplayProjectionDigestPayload,
  calculateRevisionCalculationRequestFingerprint,
  createRevisionCalculationReceipt,
  type RevisionCalculationReceipt
} from "@hakimi/revision-replay";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  resolveEventTimeContext,
  resolveEventTimeContextForBundledSnapshot
} from "@hakimi/time-core";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import {
  COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1,
  TRANSIT_TIMELINE_VERSION,
  calculateTransitSnapshot
} from "@hakimi/transit-core";
import {
  RESEARCH_QUERY_ENGINE,
  ResearchQueryExecutionError,
  buildResearchQueryExport,
  createDefaultResearchQuery,
  encodeResearchQueryExport,
  executeResearchQuery,
  isResearchResultKey,
  tokenizeResearchText,
  verifyResearchQueryExport,
  type ResearchQuerySnapshot
} from "./index";
import {
  ADVANCED_CASE_DATA_EPOCH,
  ADVANCED_CASE_QUERY,
  ADVANCED_CASE_QUERY_DIGEST,
  ADVANCED_CASE_QUERY_TRUTH_TABLE,
  ADVANCED_CASE_RESULT_DIGEST
} from "../test-fixtures/advanced-case-query";

const CASE_A = "11111111-1111-4111-8111-111111111111";
const CASE_B = "22222222-2222-4222-8222-222222222222";
const REV_A1 = "31111111-1111-4111-8111-111111111111";
const REV_A2 = "32222222-2222-4222-8222-222222222222";
const REV_B1 = "33333333-3333-4333-8333-333333333333";
const NOTE_ACTIVE = "44444444-4444-4444-8444-444444444444";
const NOTE_ARCHIVED = "45555555-5555-4555-8555-555555555555";
const EVENT_WORK = "56666666-6666-4666-8666-666666666666";
const EVENT_RELATIONSHIP = "57777777-7777-4777-8777-777777777777";
const EVENT_TRANSIT = "58888888-8888-4888-8888-888888888888";
const DOCUMENT = "69999999-9999-4999-8999-999999999999";
const CANDIDATE = "7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FIXED_CALCULATED_AT = "2026-07-01T00:00:00.000Z";
const QUERY_RECEIPT = "8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const baseInput: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

async function resignReceiptEnvelope(receipt: RevisionCalculationReceipt): Promise<void> {
  const { projectionDigest: _projectionDigest, ...projectionWithoutDigest } = receipt.projection;
  (receipt.projection as { projectionDigest: string }).projectionDigest = await sha256Hex(
    buildRevisionDerivedReplayProjectionDigestPayload(projectionWithoutDigest)
  );
  (receipt as { requestFingerprint: string }).requestFingerprint =
    await calculateRevisionCalculationRequestFingerprint(receipt);
  const { receiptDigest: _receiptDigest, ...receiptWithoutDigest } = receipt;
  (receipt as { receiptDigest: string }).receiptDigest = await sha256Hex(
    buildRevisionCalculationReceiptDigestPayload(receiptWithoutDigest)
  );
}

function caseRecord(
  id: string,
  alias: string,
  latestRevisionId: string,
  revisionCount: number,
  updatedAt: string,
  favorite = false
): CaseRecord {
  return {
    schemaVersion: "1.0.0",
    recordVersion: 2,
    id,
    alias,
    tags: alias === "甲案例" ? ["长期研究"] : ["对照"],
    notes: alias === "甲案例" ? "案例元数据" : "",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt,
    latestRevisionId,
    revisionCount,
    favorite,
    deletedAt: null
  };
}

function event(
  id: string,
  title: string,
  tags: string[],
  feedback: EventRecord["feedback"],
  revisionId: string | null,
  transitNodeRef: EventRecord["transitNodeRef"] = null
): EventRecord {
  const startDate = "2025-03-12";
  return {
    schemaVersion: "1.0.0",
    recordVersion: 2,
    id,
    caseId: CASE_A,
    revisionId,
    transitNodeRef,
    datePrecision: "day",
    startDate,
    endDate: null,
    title,
    tags,
    sourceRefs: ["访谈记录"],
    feedback,
    bodyFormat: "markdown",
    body: `${title}的详细记录`,
    deletedAt: null,
    timeContext: resolveEventTimeContext({ datePrecision: "day", startDate, endDate: null }),
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z"
  };
}

type ZonedMinuteEventTimeContext = Extract<EventRecord["timeContext"], { kind: "zoned_minute" }>;

function minuteEvent(
  id: string,
  title: string,
  timeContext: ZonedMinuteEventTimeContext,
  updatedAt: string
): EventRecord {
  return {
    ...event(id, title, ["时间边界"], "unreviewed", null),
    datePrecision: "minute",
    startDate: timeContext.start.localDateTime,
    endDate: timeContext.end?.localDateTime ?? null,
    timeContext,
    updatedAt
  };
}

function rewriteStoredStartInstant(
  timeContext: ZonedMinuteEventTimeContext,
  instant: string
): ZonedMinuteEventTimeContext {
  const rewritten = structuredClone(timeContext);
  const selectedChoice = rewritten.start.resolution.selectedCandidate.choice;
  const selected = rewritten.start.resolution.candidates.find((candidate) => candidate.choice === selectedChoice);
  if (!selected) throw new Error("zoned event fixture lacks its selected start candidate");
  selected.instant = instant;
  rewritten.start.resolution.selectedCandidate.instant = instant;
  rewritten.start.canonicalUtc = instant;
  return rewritten;
}

let snapshot: ResearchQuerySnapshot;
let revisionA1: RevisionRecord;
let revisionA2: RevisionRecord;
let revisionB1: RevisionRecord;
let yearNode: Awaited<ReturnType<typeof calculateTransitSnapshot>>["slots"]["year"];

beforeAll(async () => {
  const [chartA1, chartA2, chartB1, candidateResult] = await Promise.all([
    calculateChart(baseInput, WORKING_DEFAULT_RULE_PROFILE),
    calculateChart({ ...baseInput, date: "1995-08-19" }, WORKING_DEFAULT_RULE_PROFILE),
    calculateChart({ ...baseInput, date: "1995-09-03", time: "18:26" }, WORKING_DEFAULT_RULE_PROFILE),
    calculateUnknownHourCandidates({
      ...baseInput,
      time: null,
      timePrecision: "unknown_hour"
    }, WORKING_DEFAULT_RULE_PROFILE)
  ]);
  revisionA1 = {
    schemaVersion: "1.0.0", id: REV_A1, caseId: CASE_A, revisionNumber: 1,
    createdAt: "2026-07-01T00:00:00.000Z", input: chartA1.input,
    timeCalibration: chartA1.timeCalibration, ruleProfile: chartA1.ruleProfile,
    luckCycleRuleSnapshot: chartA1.luckCycleRuleSnapshot,
    facts: chartA1.facts, manifest: { ...chartA1.manifest, calculatedAt: FIXED_CALCULATED_AT }
  };
  revisionA2 = {
    schemaVersion: "1.0.0", id: REV_A2, caseId: CASE_A, revisionNumber: 2,
    createdAt: "2026-07-02T00:00:00.000Z", input: chartA2.input,
    timeCalibration: chartA2.timeCalibration, ruleProfile: chartA2.ruleProfile,
    luckCycleRuleSnapshot: chartA2.luckCycleRuleSnapshot,
    facts: chartA2.facts, manifest: { ...chartA2.manifest, calculatedAt: FIXED_CALCULATED_AT }
  };
  revisionB1 = {
    schemaVersion: "1.0.0", id: REV_B1, caseId: CASE_B, revisionNumber: 1,
    createdAt: "2026-07-01T00:00:00.000Z", input: chartB1.input,
    timeCalibration: chartB1.timeCalibration, ruleProfile: chartB1.ruleProfile,
    luckCycleRuleSnapshot: chartB1.luckCycleRuleSnapshot,
    facts: chartB1.facts, manifest: { ...chartB1.manifest, calculatedAt: FIXED_CALCULATED_AT }
  };
  const transit = await calculateTransitSnapshot({ revision: revisionA2, atInstant: "2025-03-12T04:00:00.000Z" });
  yearNode = transit.slots.year;
  if (yearNode.status !== "resolved") throw new Error("fixture year node must resolve");

  const notes: ResearchNoteRecord[] = [
    {
      schemaVersion: "1.0.0", id: NOTE_ACTIVE, caseId: CASE_A, anchor: { kind: "case" },
      bodyFormat: "markdown", body: "ＡＢＣ 自我探索", tags: ["观察"], sourceRefs: [],
      lifecycle: "active", editVersion: 1,
      createdAt: "2026-07-03T00:00:00.000Z", updatedAt: "2026-07-03T00:00:00.000Z"
    },
    {
      schemaVersion: "1.0.0", id: NOTE_ARCHIVED, caseId: CASE_A, anchor: { kind: "case" },
      bodyFormat: "markdown", body: "只有归档能命中", tags: [], sourceRefs: [],
      lifecycle: "archived", editVersion: 1,
      createdAt: "2026-07-03T00:00:00.000Z", updatedAt: "2026-07-03T00:00:00.000Z"
    }
  ];
  const content = "# 十神笔记\n事业与自我探索。";
  const knowledge = await buildKnowledgeContentSnapshot(content, "markdown");
  const document: KnowledgeDocumentRecord = {
    schemaVersion: "1.0.0", id: DOCUMENT, recordType: "user_knowledge_document",
    title: "十神研究", author: "研究者", edition: "第一版", sourceNote: "本地资料",
    fileName: "十神研究.md", format: "markdown", byteSize: new TextEncoder().encode(content).byteLength,
    content: knowledge.content, contentHash: knowledge.contentHash, lineCount: knowledge.lineCount,
    sections: knowledge.sections, editVersion: 1,
    createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-05T00:00:00.000Z"
  };
  const candidateSet: CandidateSetRecord = {
    schemaVersion: "1.0.0",
    recordVersion: 2,
    recordType: "unknown_hour_candidate_set",
    id: CANDIDATE,
    alias: "未时待定样本",
    tags: ["未知时辰"],
    notes: "仅按元数据研究，不选择代表盘",
    favorite: false,
    deletedAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
    candidateSet: candidateResult,
    snapshotDigest: await sha256Hex(candidateResult)
  };
  snapshot = {
    cases: [
      caseRecord(CASE_A, "甲案例", REV_A2, 2, "2026-07-05T00:00:00.000Z", true),
      caseRecord(CASE_B, "乙案例", REV_B1, 1, "2026-07-04T00:00:00.000Z")
    ],
    revisions: [revisionA1, revisionA2, revisionB1],
    candidateSets: [candidateSet],
    researchNotes: notes,
    events: [
      event(EVENT_WORK, "岗位调整", ["事业"], "supports", REV_A1),
      event(EVENT_RELATIONSHIP, "情感回顾", ["情感"], "contradicts", REV_A1),
      event(EVENT_TRANSIT, "流年节点复核", ["事业"], "supports", REV_A2, yearNode.node.ref)
    ],
    knowledgeDocuments: [document]
  };
});

describe("ResearchQuery executor v1", () => {
  it("binds query provenance to the transit-core timeline constant", () => {
    expect(RESEARCH_QUERY_ENGINE.transitTimeline).toBe(TRANSIT_TIMELINE_VERSION);
  });

  it("按 NFKC、空白分词与跨字段全词 AND 检索，并排除归档笔记", async () => {
    const query = { ...createDefaultResearchQuery("cases"), text: "abc 探索" };
    const execution = await executeResearchQuery(query, snapshot);
    expect(execution.results.map((result) => result.key)).toEqual([`case:${CASE_A}`]);
    expect(execution.results[0]?.matchingNoteIds).toEqual([NOTE_ACTIVE]);
    expect(tokenizeResearchText("  ＡＢＣ\n探索 ")).toEqual(["abc", "探索"]);

    const archived = await executeResearchQuery(
      { ...createDefaultResearchQuery("cases"), text: "只有归档" }, snapshot
    );
    expect(archived.total).toBe(0);
  });

  it("latest 与 any 都返回一次 Case，但保留确切命中 Revision", async () => {
    expect(revisionA1.facts.pillars.day.stem).not.toBe(revisionA2.facts.pillars.day.stem);
    const base = createDefaultResearchQuery("cases");
    const historicalDayMaster = researchQueryHeavenlyStemSchema.parse(revisionA1.facts.pillars.day.stem);
    const latest = await executeResearchQuery({
      ...base,
      dayMasters: [historicalDayMaster]
    }, snapshot);
    expect(latest.total).toBe(0);

    const any = await executeResearchQuery({
      ...base,
      revisionScope: "any",
      dayMasters: [historicalDayMaster]
    }, snapshot);
    expect(any.results).toHaveLength(1);
    expect(any.results[0]).toMatchObject({
      key: `case:${CASE_A}`,
      matchedRevisionIds: [REV_A1]
    });
    if (any.results[0]?.scope !== "cases") throw new Error("expected case result");
    expect(any.results[0].revisions[0]?.calculationSource).toBeNull();
  });

  it("不同筛选组为 AND、同一多选字段为 OR，并要求同一事件满足全部事件条件", async () => {
    const base = createDefaultResearchQuery("cases");
    const impossible = await executeResearchQuery({
      ...base,
      events: {
        text: "",
        tags: ["事业"],
        feedbacks: ["contradicts"],
        lifecycle: "active",
        binding: "matched_revision"
      }
    }, snapshot);
    expect(impossible.total).toBe(0);

    const possible = await executeResearchQuery({
      ...base,
      revisionScope: "any",
      events: {
        text: "岗位",
        tags: ["事业", "情感"],
        feedbacks: ["supports"],
        lifecycle: "active",
        binding: "matched_revision"
      }
    }, snapshot);
    expect(possible.results[0]?.matchingEventIds).toContain(EVENT_WORK);
  });

  it.each(ADVANCED_CASE_QUERY_TRUTH_TABLE)(
    "固定高级条件真值表：$label",
    async ({ query, expectedMatchedCaseIds, expectedUnmatchedCaseIds }) => {
      const execution = await executeResearchQuery(query, { ...snapshot, candidateSets: [] });
      const matchedCaseIds = execution.results.map((result) => {
        if (result.scope !== "cases") throw new Error("advanced case query returned a non-case result");
        return result.caseId;
      });
      const unmatchedCaseIds = snapshot.cases
        .map((record) => record.id)
        .filter((caseId) => !matchedCaseIds.includes(caseId));

      expect(matchedCaseIds).toEqual(expectedMatchedCaseIds);
      expect(unmatchedCaseIds).toEqual(expectedUnmatchedCaseIds);
    }
  );

  it("派生筛选在旧 schema 无收据时明确标记 explicit_projection", async () => {
    const execution = await executeResearchQuery(ADVANCED_CASE_QUERY, {
      ...snapshot,
      candidateSets: [],
      revisionCalculationReceiptLedgerStatus: "schema_unavailable",
      revisionCalculationReceipts: []
    });
    if (execution.results[0]?.scope !== "cases") throw new Error("expected case result");
    expect(execution.results[0].revisions[0]?.calculationSource).toMatchObject({
      source: "explicit_projection",
      ledgerStatus: "schema_unavailable",
      captureKind: "explicit_calculation_snapshot",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable",
      profileId: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId,
      receipt: null,
      componentStatuses: {
        relations: { projectionStatus: "projected", replayedStatus: null, comparisonStatus: "not_applicable" },
        transit: { projectionStatus: "projected", replayedStatus: null, comparisonStatus: "not_applicable" }
      }
    });

    const currentSchemaExecution = await executeResearchQuery(ADVANCED_CASE_QUERY, {
      ...snapshot,
      candidateSets: [],
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: []
    });
    if (currentSchemaExecution.results[0]?.scope !== "cases") throw new Error("expected case result");
    expect(currentSchemaExecution.results[0].revisions[0]?.calculationSource).toMatchObject({
      source: "explicit_projection",
      ledgerStatus: "available",
      storedHistoricalOutputCompared: false,
      receipt: null
    });
  });

  it("精确请求命中已保存收据，并把 stored_receipt 来源写入结果", async () => {
    const receipt = await createRevisionCalculationReceipt(
      revisionA2,
      {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        atInstant: ADVANCED_CASE_QUERY.transit!.atInstant
      },
      {
        id: QUERY_RECEIPT,
        createdAt: "2026-08-03T10:00:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    );
    const execution = await executeResearchQuery(ADVANCED_CASE_QUERY, {
      ...snapshot,
      candidateSets: [],
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: [receipt as RevisionCalculationReceiptRecord]
    });
    if (execution.results[0]?.scope !== "cases") throw new Error("expected case result");
    expect(execution.results[0].revisions[0]?.calculationSource).toMatchObject({
      source: "stored_receipt",
      ledgerStatus: "available",
      storedHistoricalOutputCompared: true,
      comparisonStatus: "matched",
      projectionDigest: receipt.projection.projectionDigest,
      requestFingerprint: receipt.requestFingerprint,
      receipt: {
        id: QUERY_RECEIPT,
        createdAt: "2026-08-03T10:00:00.000Z",
        receiptDigest: receipt.receiptDigest,
        requestFingerprint: receipt.requestFingerprint
      },
      componentStatuses: {
        relations: { comparisonStatus: "matched" },
        transit: { comparisonStatus: "matched" }
      }
    });
    const exported = await buildResearchQueryExport(execution, {
      appVersion: "0.2.0-p0",
      exportedAt: "2026-08-03T11:00:00.000Z"
    });
    expect(exported.manifest.formatVersion).toBe("1.1.0");
    expect(exported.payload.results[0]).toMatchObject({
      revisions: [expect.objectContaining({
        calculationSource: expect.objectContaining({ source: "stored_receipt" })
      })]
    });
  });

  it("收据账本即使未触发派生筛选也进入默认 dataEpoch", async () => {
    const receipt = await createRevisionCalculationReceipt(
      revisionA2,
      {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        atInstant: ADVANCED_CASE_QUERY.transit!.atInstant
      },
      {
        id: QUERY_RECEIPT,
        createdAt: "2026-08-03T10:00:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    );
    const query = createDefaultResearchQuery("cases");
    const withoutReceipt = await executeResearchQuery(query, {
      ...snapshot,
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: []
    });
    const withReceipt = await executeResearchQuery(query, {
      ...snapshot,
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: [receipt as RevisionCalculationReceiptRecord]
    });
    expect(withReceipt.dataEpoch).not.toBe(withoutReceipt.dataEpoch);
    expect(withReceipt.resultDigest).not.toBe(withoutReceipt.resultDigest);
    if (withReceipt.results[0]?.scope !== "cases") throw new Error("expected case result");
    expect(withReceipt.results[0].revisions[0]?.calculationSource).toBeNull();
  });

  it("已保存收据的所需组件 mismatch 时失败关闭且不回退当前投影", async () => {
    const receipt = structuredClone(await createRevisionCalculationReceipt(
      revisionA2,
      {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        atInstant: ADVANCED_CASE_QUERY.transit!.atInstant
      },
      {
        id: QUERY_RECEIPT,
        createdAt: "2026-08-03T10:00:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    ));
    if (receipt.projection.relations.status !== "projected") throw new Error("expected relations");
    receipt.projection.relations.result.facts.splice(0, 1);
    (receipt.projection.relations as { resultDigest: string }).resultDigest =
      await sha256Hex(receipt.projection.relations.result);
    await resignReceiptEnvelope(receipt);

    const execution = await executeResearchQuery(ADVANCED_CASE_QUERY, {
      ...snapshot,
      candidateSets: [],
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: [receipt as RevisionCalculationReceiptRecord]
    });
    expect(execution.total).toBe(0);
    expect(execution.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "STORED_RELATIONS_COMPARISON_MISMATCH",
        revisionId: REV_A2
      })
    ]));
  });

  it("所需 Transit 组件不可用时产生 not_evaluable 并排除结果", async () => {
    if (yearNode.status !== "resolved") throw new Error("expected year node");
    const chart = await calculateChart({ ...baseInput, sex: "unspecified" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision: RevisionRecord = {
      schemaVersion: "1.0.0",
      id: REV_A1,
      caseId: CASE_A,
      revisionNumber: 1,
      createdAt: "2026-07-01T00:00:00.000Z",
      input: chart.input,
      timeCalibration: chart.timeCalibration,
      ruleProfile: chart.ruleProfile,
      luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
      facts: chart.facts,
      manifest: { ...chart.manifest, calculatedAt: FIXED_CALCULATED_AT }
    };
    const unavailableSnapshot: ResearchQuerySnapshot = {
      cases: [caseRecord(CASE_A, "未指定性别", REV_A1, 1, "2026-07-01T00:00:00.000Z")],
      revisions: [revision],
      candidateSets: [],
      researchNotes: [],
      events: [],
      knowledgeDocuments: [],
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: []
    };
    const execution = await executeResearchQuery({
      ...createDefaultResearchQuery("cases"),
      transit: {
        atInstant: "2025-03-12T04:00:00.000Z",
        manualDirection: null,
        matches: [{ nodeType: "year", ganZhi: yearNode.node.ganZhi, stemTenGod: null }]
      }
    }, unavailableSnapshot);
    expect(execution.total).toBe(0);
    expect(execution.diagnostics.some((item) =>
      item.kind === "not_evaluable" && item.code.includes("TRANSIT")
    )).toBe(true);
  });

  it("schema_unavailable 不得携带收据，收据账本损坏时整次查询失败关闭", async () => {
    const receipt = await createRevisionCalculationReceipt(
      revisionA2,
      {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        atInstant: ADVANCED_CASE_QUERY.transit!.atInstant
      },
      {
        id: QUERY_RECEIPT,
        createdAt: "2026-08-03T10:00:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    );
    await expect(executeResearchQuery(ADVANCED_CASE_QUERY, {
      ...snapshot,
      revisionCalculationReceiptLedgerStatus: "schema_unavailable",
      revisionCalculationReceipts: [receipt as RevisionCalculationReceiptRecord]
    })).rejects.toMatchObject({ code: "INVALID_DATASET" });

    const tampered = structuredClone(receipt) as RevisionCalculationReceiptRecord;
    tampered.receiptDigest = `${tampered.receiptDigest.slice(0, -1)}${tampered.receiptDigest.endsWith("0") ? "1" : "0"}`;
    await expect(executeResearchQuery(ADVANCED_CASE_QUERY, {
      ...snapshot,
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: [tampered]
    })).rejects.toMatchObject({ code: "INVALID_DATASET" });
  });

  it("锁定完整高级查询、精确证据链及 queryDigest/resultDigest", async () => {
    const execution = await executeResearchQuery(
      ADVANCED_CASE_QUERY,
      { ...snapshot, candidateSets: [] },
      { now: () => "2026-08-02T01:00:00.000Z" }
    );

    expect(execution.query).toEqual(ADVANCED_CASE_QUERY);
    expect(execution.queryDigest).toBe(ADVANCED_CASE_QUERY_DIGEST);
    expect(execution.dataEpoch).toBe(ADVANCED_CASE_DATA_EPOCH);
    expect(execution.resultDigest).toBe(ADVANCED_CASE_RESULT_DIGEST);
    expect(execution.results).toEqual([
      expect.objectContaining({
        key: `case:${CASE_A}`,
        caseId: CASE_A,
        matchedRevisionIds: [REV_A2],
        matchingEventIds: [EVENT_TRANSIT],
        revisions: [expect.objectContaining({
          revisionId: REV_A2,
          monthBranch: "申",
          ruleProfileDigest: "de6ff2661989f6557435c02ad84a5d3f33414d845663601f783a130cc9fdb727",
          relationFactIds: [
            "branch_three_harmony|incomplete_set|three-harmony:shen-zi-chen|month:申|hour:辰"
          ],
          transitMatches: [expect.objectContaining({
            revisionId: REV_A2,
            nodeType: "year",
            nodeId: "1738591828000.bd545edbe54548cfc6ffb752b3816661eee32298ec5eef13448fe110952fb3c2",
            ganZhi: "乙巳",
            stemTenGod: "伤官"
          })]
        })]
      })
    ]);
    expect(execution.results[0]?.matchReasons).toEqual(expect.arrayContaining([
      "chart:month_branch",
      "chart:pillar_relation",
      "chart:rule_profile_digest",
      "event:same_record_clause",
      "transit:active_node"
    ]));
    expect(execution.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
      "DETERMINISTIC_RELATIONS_NOT_INTERPRETIVE_STRUCTURE",
      "TRANSIT_ENGINEERING_PREVIEW_NO_GOLD_CASES"
    ]));
  });

  it("事件与知识作用域返回严格深链键和匹配来源", async () => {
    const events = await executeResearchQuery({
      ...createDefaultResearchQuery("events"),
      text: "岗位",
      tags: ["事业"],
      feedbacks: ["supports"],
      binding: { kind: "revision_bound" }
    }, snapshot);
    expect(events.results.map((result) => result.key)).toEqual([`event:${EVENT_WORK}`]);

    const knowledge = await executeResearchQuery({
      ...createDefaultResearchQuery("knowledge"),
      text: "十神 探索",
      sort: { field: "title", direction: "asc" }
    }, snapshot);
    expect(knowledge.results[0]).toMatchObject({
      key: `knowledge:${DOCUMENT}`,
      matchingFields: expect.arrayContaining(["knowledge.content", "knowledge.title"])
    });
    expect(knowledge.results.every((result) => isResearchResultKey(result.key))).toBe(true);
  });

  it("精确复核 retained Event，但不把其 UTC 投影进查询结果", async () => {
    const retainedContext = await resolveEventTimeContextForBundledSnapshot({
      datePrecision: "minute",
      startDate: "2025-03-12T12:00",
      endDate: null,
      timeZone: "Africa/Casablanca"
    }, RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId, RETAINED_TIME_ZONE_DATABASE_2025B);
    if (retainedContext.kind !== "zoned_minute") throw new Error("expected retained zoned-minute fixture");
    const retainedEvent = minuteEvent(
      "5ccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "retained 时区事件",
      retainedContext,
      "2026-07-03T03:00:00.000Z"
    );
    const execution = await executeResearchQuery({
      ...createDefaultResearchQuery("events"),
      text: "retained"
    }, { ...snapshot, events: [retainedEvent] });

    expect(execution.results.map((result) => result.key)).toEqual([`event:${retainedEvent.id}`]);
    expect(JSON.stringify(execution.results)).not.toContain("canonicalUtc");
    expect(execution.diagnostics.some((item) => item.code.startsWith("EVENT_TIME_ZONED_UTC_NOT_EVALUATED")))
      .toBe(false);

    const forgedContext = rewriteStoredStartInstant(retainedContext, "2030-01-01T00:00:00Z");
    await expect(executeResearchQuery(createDefaultResearchQuery("events"), {
      ...snapshot,
      events: [{ ...retainedEvent, timeContext: forgedContext }]
    })).rejects.toMatchObject({ code: "INVALID_DATASET" });
  });

  it("对 unavailable 与 unidentified zoned Event 只检索元数据并给出稳定降级诊断", async () => {
    const current = resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2025-03-12T12:00",
      endDate: null,
      timeZone: "Asia/Shanghai"
    });
    if (current.kind !== "zoned_minute" || !current.timeZoneDatabase) {
      throw new Error("expected identified current zoned-minute fixture");
    }

    const unavailable = rewriteStoredStartInstant(current, "2030-01-01T00:00:00Z");
    if (!unavailable.timeZoneDatabase) throw new Error("expected unavailable descriptor fixture");
    unavailable.timeZoneDatabase.dataSha256 = unavailable.timeZoneDatabase.dataSha256.startsWith("0")
      ? `1${unavailable.timeZoneDatabase.dataSha256.slice(1)}`
      : `0${unavailable.timeZoneDatabase.dataSha256.slice(1)}`;
    unavailable.timeZoneDatabase.snapshotId = buildTimeZoneDatabaseSnapshotId(unavailable.timeZoneDatabase);
    unavailable.tzdbVersion = unavailable.timeZoneDatabase.snapshotId;

    const unidentified = rewriteStoredStartInstant(current, "2020-01-01T00:00:00Z");
    unidentified.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
    delete unidentified.timeZoneDatabase;

    const unavailableEvent = minuteEvent(
      "5ddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "降级工件事件",
      unavailable,
      "2026-07-03T01:00:00.000Z"
    );
    const unidentifiedEvent = minuteEvent(
      "5eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      "降级未知事件",
      unidentified,
      "2026-07-03T02:00:00.000Z"
    );
    const legacyFloatingEvent: EventRecord = {
      ...event("5fffffff-ffff-4fff-8fff-ffffffffffff", "旧浮动事件", [], "unreviewed", null),
      timeContext: { kind: "legacy_floating" }
    };
    const degradedSnapshot = {
      ...snapshot,
      events: [unidentifiedEvent, legacyFloatingEvent, unavailableEvent]
    };
    const query = {
      ...createDefaultResearchQuery("events"),
      text: "降级",
      sort: { field: "updatedAt" as const, direction: "asc" as const }
    };
    const first = await executeResearchQuery(query, degradedSnapshot);
    const second = await executeResearchQuery(query, {
      ...degradedSnapshot,
      events: [...degradedSnapshot.events].reverse()
    });

    expect(first.results.map((result) => result.key)).toEqual([
      `event:${unavailableEvent.id}`,
      `event:${unidentifiedEvent.id}`
    ]);
    expect(second.results).toEqual(first.results);
    expect(second.diagnostics).toEqual(first.diagnostics);
    expect(JSON.stringify(first.results)).not.toMatch(/canonicalUtc|utcOffset/u);
    expect(first.diagnostics.map((item) => item.code)).toEqual([
      "EVENT_TIME_ZONED_UTC_NOT_EVALUATED_ARTIFACT_UNAVAILABLE",
      "EVENT_TIME_ZONED_UTC_NOT_EVALUATED_LEGACY_TZDB"
    ]);
    expect(first.diagnostics.every((item) => item.kind === "warning" && item.message.includes("未用于本查询的 UTC 排序或投影")))
      .toBe(true);

    const legacy = await executeResearchQuery({
      ...createDefaultResearchQuery("events"),
      text: "旧浮动"
    }, degradedSnapshot);
    expect(legacy.diagnostics.map((item) => item.code)).toEqual(["EVENT_TIME_LEGACY_FLOATING_NO_UTC"]);
  });

  it("descriptor mismatch Event 不能降级为结构性可读", async () => {
    const current = resolveEventTimeContext({
      datePrecision: "minute",
      startDate: "2025-03-12T12:00",
      endDate: null,
      timeZone: "Asia/Shanghai"
    });
    if (current.kind !== "zoned_minute" || !current.timeZoneDatabase) {
      throw new Error("expected identified current zoned-minute fixture");
    }
    const mismatched = structuredClone(current);
    if (!mismatched.timeZoneDatabase) throw new Error("expected descriptor mismatch fixture");
    mismatched.timeZoneDatabase.artifactName = "tampered/event-time.json";
    const mismatchedEvent = minuteEvent(
      "51111111-aaaa-4aaa-8aaa-111111111111",
      "描述符冲突事件",
      mismatched,
      "2026-07-03T04:00:00.000Z"
    );

    await expect(executeResearchQuery(createDefaultResearchQuery("events"), {
      ...snapshot,
      events: [mismatchedEvent]
    })).rejects.toMatchObject({ code: "INVALID_DATASET" });
  });

  it("context_case 只命中指定 Case，拒绝同名同标签的跨案例事件", async () => {
    const caseOnlyA = event(
      "5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "跨案例同名复核",
      ["事业"],
      "supports",
      null
    );
    const caseOnlyB = {
      ...event(
        "5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "跨案例同名复核",
        ["事业"],
        "supports",
        null
      ),
      caseId: CASE_B
    };
    const execution = await executeResearchQuery({
      ...createDefaultResearchQuery("events"),
      text: "跨案例同名复核",
      tags: ["事业"],
      feedbacks: ["supports"],
      binding: { kind: "context_case", caseId: CASE_A }
    }, {
      ...snapshot,
      events: [...snapshot.events, caseOnlyA, caseOnlyB]
    });

    expect(execution.results.map((result) => result.key)).toEqual([`event:${caseOnlyA.id}`]);
  });

  it("候选组只按元数据、笔记和事件检索，不把 probe 当正式 Revision", async () => {
    const execution = await executeResearchQuery({
      ...createDefaultResearchQuery("candidate_sets"),
      text: "代表盘",
      tags: ["未知时辰"]
    }, snapshot);
    expect(execution.results).toEqual([
      expect.objectContaining({
        key: `candidate_set:${CANDIDATE}`,
        candidateSetId: CANDIDATE,
        snapshotDigest: expect.stringMatching(/^[a-f0-9]{64}$/)
      })
    ]);
    expect("matchedRevisionIds" in execution.results[0]!).toBe(false);
  });

  it("相同查询与数据产生稳定摘要，执行时间不进入 resultDigest", async () => {
    const query = { ...createDefaultResearchQuery("cases"), sort: { field: "alias" as const, direction: "asc" as const } };
    const first = await executeResearchQuery(query, snapshot, { now: () => "2026-08-02T01:00:00.000Z" });
    const second = await executeResearchQuery(query, snapshot, { now: () => "2026-08-02T02:00:00.000Z" });
    expect(first.results.map((result) => result.alias)).toEqual(["乙案例", "甲案例"]);
    expect(second.queryDigest).toBe(first.queryDigest);
    expect(second.dataEpoch).toBe(first.dataEpoch);
    expect(second.resultDigest).toBe(first.resultDigest);
    expect(second.executedAt).not.toBe(first.executedAt);
  });

  it("生成可复核的独立查询快照导出，并拒绝结果或未知字段篡改", async () => {
    const execution = await executeResearchQuery(
      { ...createDefaultResearchQuery("cases"), text: "岗位" }, snapshot,
      { now: () => "2026-08-02T01:00:00.000Z" }
    );
    const envelope = await buildResearchQueryExport(execution, {
      appVersion: "0.2.0-p0",
      exportedAt: "2026-08-02T02:00:00.000Z"
    });
    expect(RESEARCH_QUERY_ENGINE.version).toBe("0.2.0");
    expect(envelope.manifest.formatVersion).toBe("1.1.0");
    const encoded = encodeResearchQueryExport(envelope);
    await expect(verifyResearchQueryExport(encoded)).resolves.toEqual(envelope);
    expect(envelope.manifest.sensitiveDataWarning).toContain("检索词");

    const tampered = structuredClone(envelope);
    tampered.payload.results[0]!.title = "被篡改";
    await expect(verifyResearchQueryExport(tampered)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    await expect(verifyResearchQueryExport({ ...envelope, unknown: true })).rejects.toMatchObject({
      code: "INVALID_EXPORT"
    });
  });

  it("任一修订摘要损坏时整次查询失败关闭", async () => {
    const tampered = structuredClone(snapshot);
    const current = tampered.revisions[0]!.manifest.resultHash;
    tampered.revisions[0]!.manifest.resultHash = `${current.slice(0, -1)}${current.endsWith("0") ? "1" : "0"}`;
    await expect(executeResearchQuery(createDefaultResearchQuery("cases"), tampered)).rejects.toMatchObject({
      name: "ResearchQueryExecutionError",
      code: "INVALID_DATASET"
    });
  });

  it("在首个 cooperative yield 前快照完整 dataset，后续 Event 与其他分区修改不会混入", async () => {
    const mutable = structuredClone(snapshot);
    const query = createDefaultResearchQuery("events");
    const now = () => "2026-08-02T01:00:00.000Z";
    const baseline = await executeResearchQuery(query, structuredClone(mutable), { now });
    let mutationScheduled = false;
    let resolveMutation!: () => void;
    const mutationApplied = new Promise<void>((resolve) => {
      resolveMutation = resolve;
    });

    const executionPromise = executeResearchQuery(query, mutable, {
      now,
      yieldEvery: 1,
      onProgress(progress) {
        if (mutationScheduled || progress.phase !== "verify" || progress.completed !== 1) return;
        mutationScheduled = true;
        globalThis.setTimeout(() => {
          mutable.events.at(-1)!.title = "yield 后注入的事件标题";
          mutable.knowledgeDocuments[0]!.title = "yield 后注入的知识标题";
          resolveMutation();
        }, 0);
      }
    });

    const [execution] = await Promise.all([executionPromise, mutationApplied]);
    expect(mutationScheduled).toBe(true);
    expect(mutable.events.at(-1)?.title).toBe("yield 后注入的事件标题");
    expect(mutable.knowledgeDocuments[0]?.title).toBe("yield 后注入的知识标题");
    expect(execution).toEqual(baseline);
  });

  it("拒绝 dataset accessor 且不执行 getter，也不进入进度或 yield 窗口", async () => {
    const accessorBacked = structuredClone(snapshot);
    const events = accessorBacked.events;
    let accessorReads = 0;
    let progressCalls = 0;
    Object.defineProperty(accessorBacked, "events", {
      enumerable: true,
      configurable: true,
      get() {
        accessorReads += 1;
        return events;
      }
    });

    await expect(executeResearchQuery(createDefaultResearchQuery("events"), accessorBacked, {
      yieldEvery: 1,
      onProgress() {
        progressCalls += 1;
      }
    })).rejects.toMatchObject({
      name: "ResearchQueryExecutionError",
      code: "INVALID_DATASET"
    });
    expect(accessorReads).toBe(0);
    expect(progressCalls).toBe(0);
  });

  it("对完整 dataset 执行声明式深度预算，并在边界之外失败关闭", async () => {
    const nestedArray = (arrayDepth: number): unknown => {
      let value: unknown = null;
      for (let depth = 0; depth < arrayDepth; depth += 1) value = [value];
      return value;
    };
    const atBoundary = structuredClone(snapshot) as ResearchQuerySnapshot & { budgetProbe: unknown };
    atBoundary.budgetProbe = nestedArray(127);
    await expect(executeResearchQuery(createDefaultResearchQuery("events"), atBoundary))
      .resolves.toBeDefined();

    const beyondBoundary = structuredClone(snapshot) as ResearchQuerySnapshot & { budgetProbe: unknown };
    beyondBoundary.budgetProbe = nestedArray(128);
    await expect(executeResearchQuery(createDefaultResearchQuery("events"), beyondBoundary))
      .rejects.toMatchObject({ code: "INVALID_DATASET" });
  });

  it("拒绝 Symbol、循环与稀疏数组 dataset", async () => {
    const symbolBacked = structuredClone(snapshot);
    Object.defineProperty(symbolBacked, Symbol("hidden"), { value: true, enumerable: true });
    await expect(executeResearchQuery(createDefaultResearchQuery("events"), symbolBacked))
      .rejects.toMatchObject({ code: "INVALID_DATASET" });

    const circular = structuredClone(snapshot) as ResearchQuerySnapshot & { circular?: unknown };
    circular.circular = circular;
    await expect(executeResearchQuery(createDefaultResearchQuery("events"), circular))
      .rejects.toMatchObject({ code: "INVALID_DATASET" });

    const sparse = structuredClone(snapshot);
    sparse.events = new Array<EventRecord>(1);
    await expect(executeResearchQuery(createDefaultResearchQuery("events"), sparse))
      .rejects.toMatchObject({ code: "INVALID_DATASET" });
  });

  it("事件中的正式运限节点引用必须按锁版 Revision 精确复算", async () => {
    const tampered = structuredClone(snapshot);
    const ref = tampered.events.find((record) => record.id === EVENT_TRANSIT)?.transitNodeRef;
    if (!ref || ref.namespace !== "hakimi-transit-node") throw new Error("expected current transit ref fixture");
    const separator = ref.nodeId.indexOf(".");
    const hash = ref.nodeId.slice(separator + 1);
    ref.nodeId = `${ref.nodeId.slice(0, separator + 1)}${hash.slice(0, -1)}${hash.endsWith("0") ? "1" : "0"}`;
    await expect(executeResearchQuery(createDefaultResearchQuery("events"), tampered)).rejects.toMatchObject({
      code: "INVALID_DATASET"
    });
  });

  it("查询 allowlist 内的 v1.1/v2 历史运限引用且不改写原文", async () => {
    if (yearNode.status !== "resolved") throw new Error("fixture year node must resolve");
    const historical = structuredClone(yearNode.node.ref);
    historical.timelineVersion = COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1;
    const factHash = await sha256Hex({
      timelineVersion: historical.timelineVersion,
      algorithmId: historical.algorithmId,
      revisionId: historical.revisionId,
      chartResultHash: historical.chartResultHash,
      ruleProfileDigest: historical.ruleProfileDigest,
      luckCycleRuleDigest: historical.luckCycleRuleDigest,
      manualDirection: historical.manualDirection,
      nodeType: yearNode.node.nodeType,
      startInstant: yearNode.node.startInstant,
      endExclusiveInstant: yearNode.node.endExclusiveInstant,
      frame: yearNode.node.frame,
      ganZhi: yearNode.node.ganZhi,
      index: yearNode.node.index,
      boundaryLabel: yearNode.node.boundaryLabel
    });
    historical.nodeId = `${Date.parse(yearNode.node.startInstant)}.${factHash}`;
    const compatible = structuredClone(snapshot);
    const eventRecord = compatible.events.find((record) => record.id === EVENT_TRANSIT);
    if (!eventRecord) throw new Error("expected transit event fixture");
    eventRecord.transitNodeRef = structuredClone(historical);

    await expect(executeResearchQuery(createDefaultResearchQuery("events"), compatible))
      .resolves.toBeDefined();
    expect(eventRecord.transitNodeRef).toEqual(historical);
  });

  it("严格拒绝未知查询字段、非法 dataEpoch 和已取消执行", async () => {
    await expect(executeResearchQuery({
      ...createDefaultResearchQuery("cases"),
      unknown: true
    } as never, snapshot)).rejects.toMatchObject({ code: "INVALID_QUERY" });
    await expect(executeResearchQuery(createDefaultResearchQuery("cases"), snapshot, {
      dataEpoch: "bad"
    })).rejects.toMatchObject({ code: "INVALID_DATA_EPOCH" });
    const controller = new AbortController();
    controller.abort();
    await expect(executeResearchQuery(createDefaultResearchQuery("cases"), snapshot, {
      signal: controller.signal
    })).rejects.toBeInstanceOf(ResearchQueryExecutionError);
  });

  it("finalize 进度回调触发取消时不返回已完成结果", async () => {
    const controller = new AbortController();
    await expect(executeResearchQuery(createDefaultResearchQuery("cases"), snapshot, {
      signal: controller.signal,
      onProgress(progress) {
        if (progress.phase === "finalize") controller.abort();
      }
    })).rejects.toMatchObject({ code: "ABORTED" });
  });
});
