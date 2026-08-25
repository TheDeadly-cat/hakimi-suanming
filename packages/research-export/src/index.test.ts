import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart, digestRuleProfile } from "@hakimi/bazi-core";
import {
  BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE,
  buildBaziInterpretationEvidenceEnvelope,
  buildStrengthSensitivityReview,
  interpretBaziChart
} from "@hakimi/bazi-interpretation";
import { sha256Hex } from "@hakimi/integrity";
import {
  resolveEventTimeContext,
  resolveEventTimeContextForBundledSnapshot
} from "@hakimi/time-core";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  createRevisionCalculationReceipt
} from "@hakimi/revision-replay";
import {
  buildCalculatedChartHashPayload,
  buildTimeZoneDatabaseSnapshotId,
  citationTargetKeys,
  createEventRecordSchemaForTimeZoneName,
  eventRecordSchema,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  storedEventRecordSchema,
  type BirthInput,
  type CaseRecord,
  type CitationRecord,
  type EventRecord,
  type EventTimeMigrationReceipt,
  type KnowledgeDocumentRecord,
  type ResearchNoteRecord,
  type RevisionRecord,
  type SourceRightsRecord,
  type StoredEventTimeMigrationReceipt
} from "@hakimi/contracts";
import { BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECT_ID_BY_BINDING_ID } from "@hakimi/knowledge-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  REIDENTIFICATION_WARNING,
  SINGLE_CHART_REPORT_PRESENTATION_CONTRACT,
  SINGLE_CHART_REPORT_PRESENTATION_LIMITS,
  buildSingleChartResearchReport,
  encodeCsvCell,
  exportResearchCsv,
  exportResearchCsvWithBundledEventTime,
  exportResearchMarkdown,
  exportResearchMarkdownWithBundledEventTime,
  exportSingleChartResearchMarkdown,
  hasSingleChartReportAggregateTextCapacity,
  singleChartMarkdownDocumentSchema,
  singleChartResearchReportSchema,
  validateSingleChartResearchReport,
  type ResearchExportInput,
  type SingleChartReportInput
} from "./index";
import {
  compareEventsForResearchExport,
  compareVerifiedEventsForResearchExport,
  verifyEventForResearchExport
} from "./event-time";

const CASE_ID = "11111111-1111-4111-8111-111111111111";
const REVISION_1_ID = "22222222-2222-4222-8222-222222222222";
const REVISION_2_ID = "33333333-3333-4333-8333-333333333333";
const NOTE_EARLY_ID = "44444444-4444-4444-8444-444444444444";
const NOTE_LATE_ID = "55555555-5555-4555-8555-555555555555";
const EVENT_EARLY_ID = "66666666-6666-4666-8666-666666666666";
const EVENT_UNKNOWN_ID = "77777777-7777-4777-8777-777777777777";
const RULE_PACK_ID = "hakimi-local-test-pack";
const RULE_PACK_DIGEST = "b".repeat(64);

const birthInput: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: {
    label: "+地点自由文本, \"朝阳\"",
    latitude: 39.9042,
    longitude: 116.4074,
    precision: "coordinates"
  },
  sourceNote: "-出生来源备注\n第二行"
};

let fixture: ResearchExportInput;

beforeAll(async () => {
  const rulePackBinding = {
    kind: "installed_rule_pack" as const,
    packDigest: RULE_PACK_DIGEST,
    profileDigest: await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE),
    packId: RULE_PACK_ID,
    profileId: WORKING_DEFAULT_RULE_PROFILE.profileId,
    profileVersion: WORKING_DEFAULT_RULE_PROFILE.profileVersion,
    useMode: "exact" as const
  };
  const firstChart = await calculateChart(birthInput, WORKING_DEFAULT_RULE_PROFILE, { rulePackBinding });
  const secondChart = await calculateChart({ ...birthInput, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE);
  const revisions: RevisionRecord[] = [
    {
      schemaVersion: "1.0.0",
      id: REVISION_1_ID,
      caseId: CASE_ID,
      revisionNumber: 1,
      createdAt: "2026-07-01T00:00:00.000Z",
      input: firstChart.input,
      timeCalibration: firstChart.timeCalibration,
      ruleProfile: firstChart.ruleProfile,
      luckCycleRuleSnapshot: firstChart.luckCycleRuleSnapshot,
      rulePackBinding,
      facts: firstChart.facts,
      manifest: firstChart.manifest
    },
    {
      schemaVersion: "1.0.0",
      id: REVISION_2_ID,
      caseId: CASE_ID,
      revisionNumber: 2,
      createdAt: "2026-07-02T00:00:00.000Z",
      input: secondChart.input,
      timeCalibration: secondChart.timeCalibration,
      ruleProfile: secondChart.ruleProfile,
      luckCycleRuleSnapshot: secondChart.luckCycleRuleSnapshot,
      facts: secondChart.facts,
      manifest: secondChart.manifest
    }
  ];
  const caseRecord: CaseRecord = {
    schemaVersion: "1.0.0",
    recordVersion: 2,
    id: CASE_ID,
    alias: "=危险案例,\"甲\"",
    tags: ["+案例标签"],
    notes: "@案例备注\n第二行",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-06T00:00:00.000Z",
    latestRevisionId: REVISION_2_ID,
    revisionCount: 2,
    favorite: false,
    deletedAt: null
  };
  const researchNotes: ResearchNoteRecord[] = [
    {
      schemaVersion: "1.0.0",
      id: NOTE_LATE_ID,
      caseId: CASE_ID,
      anchor: { kind: "revision", revisionId: REVISION_2_ID },
      bodyFormat: "markdown",
      body: "@较晚笔记正文\n含,逗号与\"引号\"",
      tags: ["=较晚标签"],
      sourceRefs: ["+较晚来源"],
      lifecycle: "archived",
      editVersion: 2,
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-06T00:00:00.000Z"
    },
    {
      schemaVersion: "1.0.0",
      id: NOTE_EARLY_ID,
      caseId: CASE_ID,
      anchor: { kind: "chart_field", revisionId: REVISION_1_ID, pillar: "day", field: "ganZhi" },
      bodyFormat: "markdown",
      body: "早期笔记正文",
      tags: ["早期标签"],
      sourceRefs: ["早期来源"],
      lifecycle: "active",
      editVersion: 1,
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T00:00:00.000Z"
    }
  ];
  const events: EventRecord[] = [
    {
      schemaVersion: "1.0.0",
      recordVersion: 2,
      id: EVENT_UNKNOWN_ID,
      caseId: CASE_ID,
      revisionId: null,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "+未知日期事件",
      tags: ["@事件标签"],
      sourceRefs: ["-事件来源"],
      feedback: "unreviewed",
      bodyFormat: "markdown",
      body: "\t未知事件正文",
      timeContext: { kind: "legacy_floating" },
      deletedAt: null,
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:00:00.000Z"
    },
    {
      schemaVersion: "1.0.0",
      recordVersion: 2,
      id: EVENT_EARLY_ID,
      caseId: CASE_ID,
      revisionId: REVISION_1_ID,
      transitNodeRef: {
        schemaVersion: "1.0.0",
        namespace: "hakimi-transit-node",
        revisionId: REVISION_1_ID,
        chartResultHash: revisions[0].manifest.resultHash,
        ruleProfileDigest: revisions[0].manifest.ruleProfileDigest,
        luckCycleRuleDigest: revisions[0].manifest.luckCycleRuleDigest!,
        manualDirection: null,
        timelineVersion: "hakimi-transit:1.0.0",
        algorithmId: "hakimi-transit-core:parallel-active-intervals:v1",
        nodeType: "year",
        startInstant: "2020-02-04T09:03:12.000Z",
        nodeId: `1580806992000.${"a".repeat(64)}`
      },
      datePrecision: "minute",
      startDate: "2024-11-03T01:30",
      endDate: null,
      title: "早期事件标题",
      tags: ["早期事件标签"],
      sourceRefs: ["早期事件来源"],
      feedback: "supports",
      bodyFormat: "markdown",
      body: "早期事件正文",
      timeContext: resolveEventTimeContext({
        datePrecision: "minute",
        startDate: "2024-11-03T01:30",
        endDate: null,
        timeZone: "America/New_York",
        startDisambiguation: "earlier"
      }),
      deletedAt: null,
      createdAt: "2026-07-04T00:00:00.000Z",
      updatedAt: "2026-07-04T00:00:00.000Z"
    }
  ];
  fixture = { caseRecord, revisions, researchNotes, events };
});

async function retainedEventFixture(): Promise<ResearchExportInput> {
  const retained = structuredClone(fixture);
  const event = retained.events.find((item) => item.id === EVENT_EARLY_ID);
  if (!event) throw new Error("测试夹具缺少 retained Event 载体");
  event.startDate = "2026-10-01T12:00";
  event.endDate = null;
  event.timeContext = await resolveEventTimeContextForBundledSnapshot({
    datePrecision: "minute",
    startDate: event.startDate,
    endDate: event.endDate,
    timeZone: "Africa/Casablanca"
  }, RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
  return retained;
}

describe("research export privacy boundary", () => {
  it("默认匿名化研究文本与地点，同时保留出生数据再识别警告", () => {
    const markdown = exportResearchMarkdown(fixture);
    const csv = exportResearchCsv(fixture);

    for (const document of [markdown, csv]) {
      expect(document.anonymized).toBe(true);
      expect(document.warnings).toEqual([REIDENTIFICATION_WARNING]);
      expect(document.content).toContain(REIDENTIFICATION_WARNING);
      expect(document.content).toContain("1995-08-18");
      expect(document.content).toContain("08:26");
      expect(document.content).toContain("Asia/Shanghai");
      expect(document.content).not.toContain("危险案例");
      expect(document.content).not.toContain("地点自由文本");
      expect(document.content).not.toContain("出生来源备注");
      expect(document.content).not.toContain("@案例备注");
      expect(document.content).not.toContain("较晚笔记正文");
      expect(document.content).not.toContain("案例标签");
      expect(document.content).not.toContain("较晚来源");
      expect(document.content).not.toContain("未知日期事件");
      expect(document.content).not.toContain("2024-11-03T01:30");
      expect(document.content).not.toContain("America/New_York");
      expect(document.content).not.toContain("2024-11-03T05:30:00Z");
      expect(document.content).not.toContain("legacy_floating");
      expect(document.content).not.toContain(CASE_ID);
      expect(document.content).not.toContain("hakimi-transit-node");
    }
  });

  it("只有显式关闭匿名化时才导出完整研究文本", () => {
    const markdown = exportResearchMarkdown(fixture, { anonymized: false });
    const csv = exportResearchCsv(fixture, { anonymized: false });

    for (const content of [markdown.content, csv.content]) {
      const normalizedContent = content.replaceAll("\\_", "_");
      expect(content).toContain("危险案例");
      expect(content).toContain("地点自由文本");
      expect(content).toContain("出生来源备注");
      expect(content).toContain("较晚笔记正文");
      expect(content).toContain("较晚来源");
      expect(content).toContain("未知日期事件");
      expect(content).toContain("hakimi-transit-node");
      expect(normalizedContent).toContain("legacy_floating");
      expect(normalizedContent).toContain("America/New_York");
      expect(normalizedContent).toContain("resolved_overlap_earlier");
      expect(content).toContain("-04:00");
      expect(content).toContain("2024-11-03T05:30:00Z");
    }
  });

  it("农历修订同时导出原始农历、闰月标记与解析后的公历日期", async () => {
    const lunarChart = await calculateChart({
      ...birthInput,
      calendarType: "lunar",
      date: "2023-02-01",
      lunarLeapMonth: true
    }, WORKING_DEFAULT_RULE_PROFILE);
    const lunarRevision: RevisionRecord = {
      ...fixture.revisions[0],
      input: lunarChart.input,
      timeCalibration: lunarChart.timeCalibration,
      ruleProfile: lunarChart.ruleProfile,
      facts: lunarChart.facts,
      manifest: lunarChart.manifest
    };
    const lunarFixture = {
      ...fixture,
      revisions: [lunarRevision, fixture.revisions[1]],
      events: fixture.events.filter((event) => event.transitNodeRef === null)
    };
    const markdown = exportResearchMarkdown(lunarFixture, { anonymized: false }).content;
    const csv = exportResearchCsv(lunarFixture, { anonymized: false }).content;

    expect(markdown).toContain("原始历法日期：2023-02-01（闰月）");
    expect(markdown).toContain("民用公历日期：2023-03-22");
    expect(markdown).toContain("hakimi-time-core:lunar-typescript-1.8.6-to-solar:v1");
    expect(csv).toContain(encodeCsvCell("lunar_leap_month"));
    expect(csv).toContain(encodeCsvCell("2023-03-22"));
  });
});

describe("rule-pack calculation provenance", () => {
  it("完整与匿名案例导出都保留绑定字段，并明确区分未绑定规则快照", () => {
    const binding = fixture.revisions[0].rulePackBinding;
    if (!binding) throw new Error("测试夹具缺少规则包绑定");

    for (const anonymized of [true, false]) {
      const markdown = exportResearchMarkdown(fixture, { anonymized }).content.replaceAll("\\_", "_");
      const csv = exportResearchCsv(fixture, { anonymized }).content;
      for (const provenanceValue of [
        binding.packId,
        binding.packDigest,
        binding.profileId,
        binding.profileVersion,
        binding.profileDigest,
        binding.useMode
      ]) {
        expect(markdown).toContain(provenanceValue);
        expect(csv).toContain(encodeCsvCell(provenanceValue));
      }
      expect(markdown).toContain("规则包绑定：installed_rule_pack；仅表示计算来源");
      expect(markdown).toContain("规则包绑定：未绑定；本修订仅保留规则方案快照");
      expect(csv).toContain(encodeCsvCell("bound"));
      expect(csv).toContain(encodeCsvCell("unbound_profile_snapshot"));
    }
  });

  it("单盘结构化报告与 Markdown 在匿名模式仍保留非个人的规则包来源", async () => {
    const binding = fixture.revisions[0].rulePackBinding;
    if (!binding) throw new Error("测试夹具缺少规则包绑定");

    for (const anonymized of [true, false]) {
      const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized });
      const rows = new Map(report.ruleRows.map((item) => [item.label, item.value]));
      expect(rows.get("规则包绑定")).toContain("installed_rule_pack");
      expect(rows.get("规则包 packId")).toBe(binding.packId);
      expect(rows.get("规则包 packDigest")).toBe(binding.packDigest);
      expect(rows.get("规则配置 profileId")).toBe(binding.profileId);
      expect(rows.get("规则配置 profileVersion")).toBe(binding.profileVersion);
      expect(rows.get("规则配置 profileDigest")).toBe(binding.profileDigest);
      expect(rows.get("规则包 useMode")).toBe(binding.useMode);

      const markdown = exportSingleChartResearchMarkdown(report).content.replaceAll("\\_", "_");
      for (const provenanceValue of [
        binding.packId,
        binding.packDigest,
        binding.profileId,
        binding.profileVersion,
        binding.profileDigest,
        binding.useMode
      ]) expect(markdown).toContain(provenanceValue);
    }
  });

  it("未绑定单盘只声明规则方案快照，不伪称来自已安装规则包", async () => {
    const unboundFixture = structuredClone(singleChartFixture());
    delete unboundFixture.revision.rulePackBinding;
    await resignRevision(unboundFixture.revision);

    const report = await buildSingleChartResearchReport(unboundFixture);
    const bindingRows = report.ruleRows.filter((item) => item.label.startsWith("规则包") || item.label.startsWith("规则配置"));
    expect(bindingRows).toEqual([{
      label: "规则包绑定",
      value: "未绑定；本修订仅保留规则方案快照，不应推断来自已安装规则包"
    }]);
    const markdown = exportSingleChartResearchMarkdown(report).content;
    expect(markdown).toContain("规则包绑定：未绑定；本修订仅保留规则方案快照");
    expect(markdown).not.toContain(RULE_PACK_ID);
    expect(markdown).not.toContain(RULE_PACK_DIGEST);
  });
});

describe("CSV safety and fidelity", () => {
  it("publishes v0.4 rule-pack provenance while retaining the frozen v0.2/v0.3 headers", () => {
    const markdown = exportResearchMarkdown(fixture, { anonymized: false });
    const csv = exportResearchCsv(fixture, { anonymized: false });
    const currentHeader = csv.content.slice(1).split("\r\n", 1)[0];
    const frozenV02Header = readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/research-export.csv-header.v0.2.txt"),
      "utf8"
    ).trimEnd();
    const frozenV03Header = readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/research-export.csv-header.v0.3.txt"),
      "utf8"
    ).trimEnd();

    expect(markdown.formatVersion).toBe("0.4.0");
    expect(csv.formatVersion).toBe("0.4.0");
    expect(frozenV03Header).not.toBe(frozenV02Header);
    expect(currentHeader).not.toBe(frozenV03Header);
    expect(frozenV02Header).not.toContain("event_time_context_kind");
    expect(frozenV03Header).toContain("event_time_context_kind");
    expect(frozenV03Header).not.toContain("rule_pack_binding_status");
    for (const column of [
      "event_time_context_kind",
      "event_time_zone",
      "event_start_dst_resolution",
      "event_start_utc_offset",
      "event_start_utc",
      "event_end_dst_resolution",
      "event_end_utc_offset",
      "event_end_utc",
      "event_time_notice",
      "rule_pack_binding_status",
      "rule_pack_binding_kind",
      "rule_pack_id",
      "rule_pack_digest",
      "rule_pack_profile_id",
      "rule_pack_profile_version",
      "rule_pack_profile_digest",
      "rule_pack_use_mode"
    ]) expect(currentHeader).toContain(encodeCsvCell(column));
  });

  it.each(["=1+1", "+cmd", "-2+3", "@SUM(1,1)", "\ttab", "\rreturn"])(
    "阻断公式注入前缀 %j",
    (value) => {
      expect(encodeCsvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    }
  );

  it("总是带 BOM，并正确引用逗号、换行和双引号", () => {
    const document = exportResearchCsv(fixture, { anonymized: false });
    expect(document.content.startsWith("\uFEFF")).toBe(true);
    expect(encodeCsvCell('一,二\n"三"')).toBe('"一,二\n""三"""');
    expect(document.content).toContain(encodeCsvCell("@较晚笔记正文\n含,逗号与\"引号\""));
    expect(document.content).toContain(encodeCsvCell("=危险案例,\"甲\""));
  });
});

describe("strictness and deterministic ordering", () => {
  it("数组输入顺序不影响 Markdown 或 CSV 字节", () => {
    const reversed: ResearchExportInput = {
      caseRecord: fixture.caseRecord,
      revisions: [...fixture.revisions].reverse(),
      researchNotes: [...fixture.researchNotes].reverse(),
      events: [...fixture.events].reverse()
    };
    expect(exportResearchMarkdown(reversed, { anonymized: false }).content)
      .toBe(exportResearchMarkdown(fixture, { anonymized: false }).content);
    expect(exportResearchCsv(reversed, { anonymized: false }).content)
      .toBe(exportResearchCsv(fixture, { anonymized: false }).content);
  });

  it("按修订序号、笔记创建时间、事件日期稳定排序", () => {
    const markdown = exportResearchMarkdown(fixture, { anonymized: false }).content;
    expect(markdown.indexOf(REVISION_1_ID)).toBeLessThan(markdown.indexOf(REVISION_2_ID));
    expect(markdown.indexOf(NOTE_EARLY_ID)).toBeLessThan(markdown.indexOf(NOTE_LATE_ID));
    expect(markdown.indexOf(EVENT_EARLY_ID)).toBeLessThan(markdown.indexOf(EVENT_UNKNOWN_ID));
  });

  it("zoned minute 按 canonical UTC 排序，legacy_floating 保持独立墙时域", () => {
    const earlier = fixture.events.find((event) => event.id === EVENT_EARLY_ID)!;
    const later: EventRecord = {
      ...structuredClone(earlier),
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "DST later candidate",
      timeContext: resolveEventTimeContext({
        datePrecision: "minute",
        startDate: "2024-11-03T01:30",
        endDate: null,
        timeZone: "America/New_York",
        startDisambiguation: "later"
      })
    };
    const content = exportResearchMarkdown({
      ...fixture,
      events: [fixture.events[0], later, earlier]
    }, { anonymized: false }).content;

    expect(content.indexOf(EVENT_EARLY_ID)).toBeLessThan(content.indexOf(later.id));
    expect(content.indexOf(later.id)).toBeLessThan(content.indexOf(EVENT_UNKNOWN_ID));
    expect(content).toContain("2024-11-03T05:30:00Z");
    expect(content).toContain("2024-11-03T06:30:00Z");
  });

  it("拒绝未知字段和跨案例引用", () => {
    const withUnknownField = { ...fixture, unexpected: true };
    expect(() => exportResearchMarkdown(withUnknownField as ResearchExportInput)).toThrow();

    const invalidRevision = {
      ...fixture,
      revisions: [{ ...fixture.revisions[0], caseId: crypto.randomUUID() }, fixture.revisions[1]]
    };
    expect(() => exportResearchCsv(invalidRevision)).toThrow(/不属于 Case/);
  });

  it("完整与匿名导出都在投影前拒绝伪造的规范 UTC", async () => {
    const forged = structuredClone(fixture);
    const event = forged.events.find((item) => item.id === EVENT_EARLY_ID);
    if (!event || event.timeContext.kind !== "zoned_minute") throw new Error("测试夹具缺少 zoned minute 事件");
    const resolution = event.timeContext.start.resolution;
    const selected = resolution.candidates.find((candidate) =>
      candidate.choice === resolution.selectedCandidate.choice
    );
    if (!selected) throw new Error("测试夹具缺少已选时区候选");
    selected.instant = "2024-11-03T05:31:00Z";
    resolution.selectedCandidate = structuredClone(selected);
    event.timeContext.start.canonicalUtc = selected.instant;

    expect(() => exportResearchMarkdown(forged)).toThrow(/事件时间上下文/);
    expect(() => exportResearchMarkdown(forged, { anonymized: false })).toThrow(/事件时间上下文/);
    expect(() => exportResearchCsv(forged)).toThrow(/事件时间上下文/);
    expect(() => exportResearchCsv(forged, { anonymized: false })).toThrow(/事件时间上下文/);

    const single = structuredClone(singleChartFixture());
    const singleEvent = single.events.find((item) => item.id === EVENT_EARLY_ID);
    if (!singleEvent || singleEvent.timeContext.kind !== "zoned_minute") {
      throw new Error("单盘测试夹具缺少 zoned minute 事件");
    }
    const singleResolution = singleEvent.timeContext.start.resolution;
    const singleSelected = singleResolution.candidates.find((candidate) =>
      candidate.choice === singleResolution.selectedCandidate.choice
    );
    if (!singleSelected) throw new Error("单盘测试夹具缺少已选时区候选");
    singleSelected.instant = "2024-11-03T05:31:00Z";
    singleResolution.selectedCandidate = structuredClone(singleSelected);
    singleEvent.timeContext.start.canonicalUtc = singleSelected.instant;
    await expect(buildSingleChartResearchReport(single)).rejects.toThrow(/事件时间上下文/);
    await expect(buildSingleChartResearchReport(single, { anonymized: false })).rejects.toThrow(/事件时间上下文/);
  });

  it("同步入口保持 current-exact 字节，异步入口允许官方 retained exact", async () => {
    const [currentMarkdown, currentCsv] = await Promise.all([
      exportResearchMarkdownWithBundledEventTime(fixture, { anonymized: false }),
      exportResearchCsvWithBundledEventTime(fixture, { anonymized: false })
    ]);
    expect(currentMarkdown).toEqual(exportResearchMarkdown(fixture, { anonymized: false }));
    expect(currentCsv).toEqual(exportResearchCsv(fixture, { anonymized: false }));

    const retained = await retainedEventFixture();
    expect(() => exportResearchMarkdown(retained)).toThrow(/exact_retained/);
    expect(() => exportResearchCsv(retained, { anonymized: false })).toThrow(/exact_retained/);
    const retainedEvent = retained.events.find((event) => event.id === EVENT_EARLY_ID)!;
    expect(() => compareEventsForResearchExport(retainedEvent, fixture.events[0]!)).toThrow(/exact_retained/);

    const [retainedMarkdown, retainedCsv] = await Promise.all([
      exportResearchMarkdownWithBundledEventTime(retained, { anonymized: false }),
      exportResearchCsvWithBundledEventTime(retained, { anonymized: false })
    ]);
    for (const document of [retainedMarkdown, retainedCsv]) {
      expect(document.formatVersion).toBe("0.4.0");
      expect(document.content).toContain(RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
      expect(document.content).toContain("2026-10-01T11:00:00Z");
      expect(document.content).toContain("+01:00");
    }
  });

  it("verified comparator 只接受模块签发的不可伪造凭据", () => {
    const current = fixture.events.find((event) => event.id === EVENT_EARLY_ID)!;
    const issued = verifyEventForResearchExport(current);
    const forged = structuredClone(issued);
    expect(() => compareVerifiedEventsForResearchExport(forged, issued)).toThrow(/验证凭据无效/);
  });

  it("stored schema 接受 selected-resolver 名称边界，但 exact gate 不把合成名称当官方 replay", async () => {
    const retained = await retainedEventFixture();
    const event = retained.events.find((item) => item.id === EVENT_EARLY_ID)!;
    if (event.timeContext.kind !== "zoned_minute") throw new Error("测试夹具缺少 retained zoned Event");
    event.timeContext.timeZone = "Historical/Only";
    for (const candidate of event.timeContext.start.resolution.candidates) {
      candidate.zonedDateTime = candidate.zonedDateTime.replace(/\[[^\]]+\]$/u, "[Historical/Only]");
    }
    event.timeContext.start.resolution.selectedCandidate.zonedDateTime =
      event.timeContext.start.resolution.selectedCandidate.zonedDateTime
        .replace(/\[[^\]]+\]$/u, "[Historical/Only]");

    expect(eventRecordSchema.safeParse(event).success).toBe(false);
    expect(createEventRecordSchemaForTimeZoneName((name) => name === "Historical/Only")
      .safeParse(event).success).toBe(true);
    expect(storedEventRecordSchema.safeParse(event).success).toBe(true);
    await expect(exportResearchMarkdownWithBundledEventTime(retained, { anonymized: false }))
      .rejects.toThrow(/时区名称不属于其冻结 resolver/);
  });

  it("异步入口拒绝 unidentified、unavailable、descriptor mismatch 与 retained UTC 篡改", async () => {
    const unidentified = structuredClone(fixture);
    const unidentifiedEvent = unidentified.events.find((item) => item.id === EVENT_EARLY_ID)!;
    if (unidentifiedEvent.timeContext.kind !== "zoned_minute") {
      throw new Error("测试夹具缺少 zoned Event");
    }
    unidentifiedEvent.timeContext.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
    delete unidentifiedEvent.timeContext.timeZoneDatabase;
    await expect(exportResearchMarkdownWithBundledEventTime(unidentified))
      .rejects.toThrow(/structural_legacy_unidentified/);
    expect(() => compareEventsForResearchExport(unidentifiedEvent, fixture.events[0]!))
      .toThrow(/structural_legacy_unidentified/);

    const unavailable = await retainedEventFixture();
    const unavailableEvent = unavailable.events.find((item) => item.id === EVENT_EARLY_ID)!;
    if (unavailableEvent.timeContext.kind !== "zoned_minute" || !unavailableEvent.timeContext.timeZoneDatabase) {
      throw new Error("测试夹具缺少 retained descriptor");
    }
    unavailableEvent.timeContext.timeZoneDatabase.dataSha256 = "0".repeat(64);
    unavailableEvent.timeContext.timeZoneDatabase.snapshotId = buildTimeZoneDatabaseSnapshotId(
      unavailableEvent.timeContext.timeZoneDatabase
    );
    unavailableEvent.timeContext.tzdbVersion = unavailableEvent.timeContext.timeZoneDatabase.snapshotId;
    await expect(exportResearchCsvWithBundledEventTime(unavailable))
      .rejects.toThrow(/structural_artifact_unavailable/);

    const descriptorMismatch = await retainedEventFixture();
    const mismatchEvent = descriptorMismatch.events.find((item) => item.id === EVENT_EARLY_ID)!;
    if (mismatchEvent.timeContext.kind !== "zoned_minute" || !mismatchEvent.timeContext.timeZoneDatabase) {
      throw new Error("测试夹具缺少 retained descriptor");
    }
    mismatchEvent.timeContext.timeZoneDatabase.artifactName = "tampered/packed.json";
    await expect(exportResearchMarkdownWithBundledEventTime(descriptorMismatch))
      .rejects.toThrow(/完整时区描述符/);

    const tampered = await retainedEventFixture();
    const tamperedEvent = tampered.events.find((item) => item.id === EVENT_EARLY_ID)!;
    if (tamperedEvent.timeContext.kind !== "zoned_minute") throw new Error("测试夹具缺少 retained Event");
    const selected = tamperedEvent.timeContext.start.resolution.selectedCandidate;
    selected.instant = "2026-10-01T11:01:00Z";
    const candidate = tamperedEvent.timeContext.start.resolution.candidates.find(
      (item) => item.choice === selected.choice
    );
    if (!candidate) throw new Error("测试夹具缺少 retained selected candidate");
    candidate.instant = selected.instant;
    tamperedEvent.timeContext.start.canonicalUtc = selected.instant;
    await expect(exportResearchMarkdownWithBundledEventTime(tampered, { anonymized: false }))
      .rejects.toThrow(/冻结 IANA 工件/);
  });

  it("异步 exact 入口在首个 await 前隔离完整输入，调用方后续突变不会进入排序或正文", async () => {
    const mutable = await retainedEventFixture();
    const mutableEvent = mutable.events.find((item) => item.id === EVENT_EARLY_ID)!;
    if (mutableEvent.timeContext.kind !== "zoned_minute") throw new Error("测试夹具缺少 retained Event");

    const pending = exportResearchMarkdownWithBundledEventTime(mutable, { anonymized: false });
    mutableEvent.title = "TOCTOU-SENTINEL";
    mutableEvent.startDate = "2026-10-01T13:00";
    mutableEvent.timeContext.start.localDateTime = mutableEvent.startDate;
    mutableEvent.timeContext.start.canonicalUtc = "2026-10-01T12:00:00Z";

    const document = await pending;
    expect(document.content).toContain("2026-10-01T11:00:00Z");
    expect(document.content).not.toContain("2026-10-01T12:00:00Z");
    expect(document.content).not.toContain("TOCTOU-SENTINEL");
  });

  it("legacy 与 calendar 保持独立非 UTC 域，sync/async 字节一致", async () => {
    const nonUtc = structuredClone(fixture);
    const legacy = nonUtc.events.find((event) => event.id === EVENT_UNKNOWN_ID)!;
    const calendar: EventRecord = {
      ...structuredClone(legacy),
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      datePrecision: "day",
      startDate: "2024-02-29",
      endDate: null,
      title: "日历事件",
      timeContext: { kind: "calendar_date" }
    };
    nonUtc.events = [legacy, calendar];

    const synchronous = exportResearchMarkdown(nonUtc, { anonymized: false });
    const asynchronous = await exportResearchMarkdownWithBundledEventTime(nonUtc, { anonymized: false });
    expect(asynchronous).toEqual(synchronous);
    expect(synchronous.content).toContain("历史浮动时间：未记录 IANA 时区");
    expect(synchronous.content).toContain("日历精度：时区、DST 与规范 UTC 不适用");
    expect(synchronous.content).not.toContain("- 起始规范 UTC：");
  });
});

const DOCUMENT_ID = "88888888-8888-4888-8888-888888888888";
const CITATION_ID = "99999999-9999-4999-8999-999999999999";
const DOCUMENT_HASH = "ba7d23ce8665ace72ac6546905d58a18b03c545c11f59fdc298bb48a51726528";
const STRENGTH_EVIDENCE_SUBJECT_IDS = Object.freeze(
  Object.values(BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECT_ID_BY_BINDING_ID)
);

function singleChartFixture(): SingleChartReportInput {
  const content = "# 合成报告引用\n\n仅用于验证单盘报告的引用与权利边界。";
  const knowledgeDocument: KnowledgeDocumentRecord = {
    schemaVersion: "1.0.0",
    id: DOCUMENT_ID,
    recordType: "user_knowledge_document",
    title: "合成报告资料",
    author: "测试作者",
    edition: "本地测试版",
    sourceNote: "仅供测试",
    fileName: "report-source.md",
    format: "markdown",
    byteSize: new TextEncoder().encode(content).byteLength,
    content,
    contentHash: DOCUMENT_HASH,
    lineCount: 3,
    sections: [{ id: "section-1", title: "合成报告引用", level: 1, startLine: 1, endLine: 3 }],
    editVersion: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z"
  };
  const sourceRights: SourceRightsRecord = {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId: DOCUMENT_ID,
    documentContentHash: DOCUMENT_HASH,
    origin: "user_import",
    source: {
      sourceUrl: "https://example.test/report-source",
      publisher: "测试出版方",
      publicationYear: 2026,
      acquiredAt: "2026-07-01T00:00:00.000Z"
    },
    rights: {
      status: "user_unverified",
      workStatus: "unknown",
      editionStatus: "unknown",
      basis: "user_declaration",
      jurisdiction: null,
      licenseId: null,
      copyrightNotice: "",
      evidenceRefs: [],
      distributionPolicy: "local_private_only"
    },
    review: { status: "unreviewed", attestations: [], note: "" },
    editVersion: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z"
  };
  const targets = [
    { kind: "chart_field" as const, caseId: CASE_ID, revisionId: REVISION_1_ID, field: "pillars.day.ganZhi" },
    { kind: "evidence_subject" as const, subjectId: "bazi.pillar.day.ganzhi.v1" }
  ];
  const citation: CitationRecord = {
    schemaVersion: "1.0.0",
    id: CITATION_ID,
    documentId: DOCUMENT_ID,
    documentContentHash: DOCUMENT_HASH,
    locator: { sectionId: "section-1", startLine: 3, endLine: 3 },
    quote: "仅用于验证单盘报告的引用与权利边界。",
    annotation: "合成候选批注",
    targets,
    targetKeys: [
      `chart_field:${CASE_ID}:${REVISION_1_ID}:pillars.day.ganZhi`,
      "evidence_subject:bazi.pillar.day.ganzhi.v1"
    ].sort(),
    status: "user_candidate",
    reviewAttestations: [],
    decisionNote: "",
    editVersion: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z"
  };
  return {
    caseRecord: structuredClone(fixture.caseRecord),
    revision: structuredClone(fixture.revisions[0]),
    researchNotes: [structuredClone(fixture.researchNotes[1])],
    events: structuredClone(fixture.events),
    eventTimeMigrationReceipts: [],
    citations: [citation],
    knowledgeDocuments: [knowledgeDocument],
    sourceRights: [sourceRights]
  };
}

function targetFixtureCitationAtStrengthSubjects(
  input: SingleChartReportInput,
  subjectIds: readonly string[]
): void {
  const citation = input.citations[0];
  if (!citation) throw new Error("测试夹具缺少 Citation");
  citation.targets = [
    ...citation.targets.filter((target) => target.kind !== "evidence_subject"),
    ...subjectIds.map((subjectId) => ({ kind: "evidence_subject" as const, subjectId }))
  ];
  citation.targetKeys = citationTargetKeys(citation.targets);
}

function setFixtureCitationReviewStatus(
  input: SingleChartReportInput,
  status: CitationRecord["status"]
): void {
  const citation = input.citations[0];
  if (!citation) throw new Error("测试夹具缺少 Citation");
  citation.status = status;
  citation.reviewAttestations = status === "verified"
    ? [
        { reviewerId: "synthetic-citation-review-a", reviewedAt: citation.createdAt, note: "测试复核 A" },
        { reviewerId: "synthetic-citation-review-b", reviewedAt: citation.createdAt, note: "测试复核 B" }
      ]
    : [];
  citation.decisionNote = status === "user_candidate"
    ? ""
    : status === "verified"
      ? "合成夹具双人核验，仅验证机械投影"
      : "合成夹具明确拒绝，仅验证机械投影";
}

function makeFixtureSourceRedistributable(input: SingleChartReportInput): void {
  const document = input.knowledgeDocuments[0];
  const rights = input.sourceRights[0];
  if (!document || !rights) throw new Error("测试夹具缺少资料或 SourceRights");
  document.recordType = "bundled_knowledge_document";
  rights.origin = "bundled";
  rights.rights = {
    status: "project_original_verified",
    workStatus: "project_original_verified",
    editionStatus: "project_original_verified",
    basis: "project_authored",
    jurisdiction: null,
    licenseId: null,
    copyrightNotice: "Synthetic Hakimi test fixture",
    evidenceRefs: ["https://example.test/synthetic-rights-evidence"],
    distributionPolicy: "redistributable"
  };
  rights.review = {
    status: "double_reviewed",
    attestations: [
      { reviewerId: "synthetic-rights-review-a", reviewedAt: rights.createdAt, note: "测试作品层复核" },
      { reviewerId: "synthetic-rights-review-b", reviewedAt: rights.createdAt, note: "测试载体层复核" }
    ],
    note: "合成夹具双人复核，仅验证机械权利投影"
  };
}

async function resignRevision(revision: RevisionRecord): Promise<void> {
  const ruleProfileDigest = await digestRuleProfile(revision.ruleProfile);
  revision.manifest.ruleProfileDigest = ruleProfileDigest;
  if (revision.rulePackBinding) revision.rulePackBinding.profileDigest = ruleProfileDigest;
  if (revision.luckCycleRuleSnapshot) {
    revision.manifest.luckCycleRuleDigest = await sha256Hex(revision.luckCycleRuleSnapshot);
  } else {
    delete revision.manifest.luckCycleRuleDigest;
  }
  revision.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(revision));
}

async function singleChartFixtureWithBaselineReceipt(): Promise<SingleChartReportInput> {
  const input = singleChartFixture();
  const receipt = await createRevisionCalculationReceipt(
    input.revision,
    { profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE },
    {
      id: "12121212-1212-4212-8212-121212121212",
      createdAt: input.revision.createdAt,
      captureKind: "revision_creation_baseline"
    }
  );
  return {
    ...input,
    revisionCalculationReceiptLedgerStatus: "available",
    revisionCalculationReceipts: [receipt]
  };
}

async function singleChartFixtureWithCalendarMigration(): Promise<SingleChartReportInput> {
  const input = singleChartFixture();
  const source = input.events.find((event) => event.id === EVENT_UNKNOWN_ID);
  if (!source) throw new Error("测试夹具缺少旧 Event");
  const createdAt = "2026-08-02T10:30:00.000Z";
  const target: EventRecord = {
    ...structuredClone(source),
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    timeContext: { kind: "calendar_date" },
    createdAt,
    updatedAt: createdAt
  };
  const sourceSnapshot = {
    formatVersion: "1.0.0" as const,
    eventRecordVersion: source.recordVersion,
    caseId: source.caseId,
    revisionId: source.revisionId,
    transitNodeRef: source.transitNodeRef,
    datePrecision: source.datePrecision,
    startDate: source.startDate,
    endDate: source.endDate,
    timeContext: source.timeContext
  };
  const targetSnapshot = {
    ...structuredClone(sourceSnapshot),
    timeContext: target.timeContext
  };
  const receipt: EventTimeMigrationReceipt = {
    schemaVersion: "1.0.0",
    recordVersion: 1,
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    operation: "event_time_semantic_derivation",
    authorization: { kind: "explicit_local_user_confirmation" },
    source: {
      kind: "event",
      recordId: source.id,
      snapshot: sourceSnapshot,
      snapshotDigest: await sha256Hex(sourceSnapshot)
    },
    target: {
      kind: "event",
      recordId: target.id,
      snapshot: targetSnapshot,
      snapshotDigest: await sha256Hex(targetSnapshot)
    },
    interpretation: { kind: "calendar_date" },
    createdAt
  };
  return {
    ...input,
    events: [...input.events, target],
    eventTimeMigrationReceipts: [receipt]
  };
}

async function singleChartFixtureWithRetainedMinuteMigration(): Promise<SingleChartReportInput> {
  const input = singleChartFixture();
  const source = input.events.find((event) => event.id === EVENT_UNKNOWN_ID);
  if (!source) throw new Error("测试夹具缺少旧 Event");
  source.datePrecision = "minute";
  source.startDate = "2026-10-01T12:00";
  source.endDate = null;
  source.timeContext = { kind: "legacy_floating" };

  const createdAt = "2026-08-02T10:31:00.000Z";
  const retainedTimeContext = await resolveEventTimeContextForBundledSnapshot({
    datePrecision: "minute",
    startDate: source.startDate,
    endDate: source.endDate,
    timeZone: "Africa/Casablanca"
  }, RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
  if (retainedTimeContext.kind !== "zoned_minute") {
    throw new Error("测试夹具未生成 retained zoned minute 时间上下文");
  }
  const target: SingleChartReportInput["events"][number] = {
    ...structuredClone(source),
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    timeContext: retainedTimeContext,
    createdAt,
    updatedAt: createdAt
  };
  const sourceSnapshot = {
    formatVersion: "1.0.0" as const,
    eventRecordVersion: source.recordVersion,
    caseId: source.caseId,
    revisionId: source.revisionId,
    transitNodeRef: source.transitNodeRef,
    datePrecision: source.datePrecision,
    startDate: source.startDate,
    endDate: source.endDate,
    timeContext: source.timeContext
  };
  const targetSnapshot = {
    ...structuredClone(sourceSnapshot),
    timeContext: target.timeContext
  };
  const receipt: StoredEventTimeMigrationReceipt = {
    schemaVersion: "1.0.0",
    recordVersion: 1,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    operation: "event_time_semantic_derivation",
    authorization: { kind: "explicit_local_user_confirmation" },
    source: {
      kind: "event",
      recordId: source.id,
      snapshot: sourceSnapshot,
      snapshotDigest: await sha256Hex(sourceSnapshot)
    },
    target: {
      kind: "event",
      recordId: target.id,
      snapshot: targetSnapshot,
      snapshotDigest: await sha256Hex(targetSnapshot)
    },
    interpretation: {
      kind: "zoned_minute",
      timeZone: retainedTimeContext.timeZone,
      startDisambiguation: retainedTimeContext.start.resolution.policy,
      endDisambiguation: null
    },
    createdAt
  };
  return {
    ...input,
    events: [...input.events, target],
    eventTimeMigrationReceipts: [receipt]
  };
}

describe("single-chart report projection", () => {
  it("锁定指定历史修订，并完整投影四柱、时间、规则、来源和本地候选权利", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });

    expect(report.revisionLabel).toBe("第 1 版 · 历史修订");
    expect(report.revisionReference).toBe(REVISION_1_ID);
    expect(report.pillars).toHaveLength(4);
    expect(report.pillars.map((pillar) => pillar.key)).toEqual(["year", "month", "day", "hour"]);
    expect(report.pillars.every((pillar) => pillar.xun && pillar.voidBranches)).toBe(true);
    expect(report.calibrationRows.some((item) => item.label === "UTC 瞬时点" && item.value.includes("Z"))).toBe(true);
    expect(report.ruleRows.some((item) => item.label === "规则方案" && item.value.includes(WORKING_DEFAULT_RULE_PROFILE.profileVersion))).toBe(true);
    expect(report.integrityRows.some((item) => item.label === "引擎" && item.value.includes("hakimi-bazi-core"))).toBe(true);
    expect(report.calculationSource).toMatchObject({
      natalSource: "verified_stored_revision",
      downstreamSource: "explicit_projection",
      receiptLedgerStatus: "schema_unavailable",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable",
      expertEvidenceStatus: "not_verified"
    });
    expect(report.provenance.length).toBeGreaterThanOrEqual(36);
    expect(report.researchNotes.map((item) => item.reference)).toEqual([NOTE_EARLY_ID]);
    expect(report.events.map((item) => item.reference)).toEqual([EVENT_EARLY_ID, EVENT_UNKNOWN_ID]);
    expect(report.events[0].meta).toContainEqual({ label: "IANA 时区", value: "America/New_York" });
    expect(report.events[0].meta).toContainEqual({ label: "起始 UTC 偏移", value: "-04:00" });
    expect(report.events[0].meta).toContainEqual({ label: "起始规范 UTC", value: "2024-11-03T05:30:00Z" });
    expect(report.events[1].meta).toContainEqual({
      label: "时间说明",
      value: "历史浮动时间：未记录 IANA 时区，无法换算规范 UTC。"
    });
    expect(report.citations).toHaveLength(1);
    expect(report.citations[0].source.documentReference).toBe("D1");
    expect(report.citations[0].statusLabel).toBe("用户候选");
    expect(report.citations[0].source.distributionPolicy).toBe("local_private_only");
    expect(report.citations[0].source.reviewStatus).toBe("unreviewed");
  });

  it("builder 直接拒绝伪造的资料摘要、章节快照与引用原文", async () => {
    const forgedHash = singleChartFixture();
    const forgedDocumentHash = "f".repeat(64);
    forgedHash.knowledgeDocuments[0]!.contentHash = forgedDocumentHash;
    forgedHash.citations[0]!.documentContentHash = forgedDocumentHash;
    forgedHash.sourceRights[0]!.documentContentHash = forgedDocumentHash;
    await expect(buildSingleChartResearchReport(forgedHash, { anonymized: false }))
      .rejects.toThrow(/内容摘要不匹配/u);

    const forgedSections = singleChartFixture();
    forgedSections.knowledgeDocuments[0]!.sections[0]!.title = "伪造章节快照";
    await expect(buildSingleChartResearchReport(forgedSections, { anonymized: false }))
      .rejects.toThrow(/章节快照不匹配/u);

    const forgedQuote = singleChartFixture();
    forgedQuote.citations[0]!.quote = "伪造且不对应 locator 的引用原文";
    await expect(buildSingleChartResearchReport(forgedQuote, { anonymized: false }))
      .rejects.toThrow(/原文摘录不匹配/u);
  });

  it("从已校验 Revision 重新构建 Envelope，并逐句投影确定性 v1.7 来源治理与机械准入账", async () => {
    const input = singleChartFixture();
    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    const includeHour = input.revision.input.timePrecision === "exact_minute"
      || input.revision.input.timePrecision === "exact_second";
    const interpretation = interpretBaziChart(input.revision.facts, { includeHour });
    const envelope = await buildBaziInterpretationEvidenceEnvelope({
      revision: input.revision,
      includeHour,
      interpretation,
      strengthSensitivity: buildStrengthSensitivityReview(interpretation)
    });
    const bindingById = new Map(envelope.sourceBindings.map((binding) => [binding.bindingId, binding] as const));

    expect(report.formatVersion).toBe("1.7.0");
    expect(report.interpretationEvidence).toMatchObject({
      status: "available",
      reason: null,
      scope: "strength_engineering_candidate_only",
      includeHour: true,
      envelopeProfileVersion: BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE.projectionVersion,
      envelopeContentVersion: BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE.contentVersion,
      sourceRegistry: {
        profileVersion: "hakimi.bazi.strength_claim_registry/0.2.0",
        contentVersion: "0.18.0",
        registrySha256: null
      },
      payloadSha256: envelope.integrity.payloadSha256,
      boundary: {
        referenceResolutionEstablishesSemanticTruth: false,
        citationTargetEstablishesSourceIdentity: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        publicReleaseAuthorized: false,
        authenticityClaimed: false,
        sourceTextIncluded: false,
        locatorReviewEstablishesExactQuote: false,
        locatorVerificationEstablishesContentIdentity: false,
        sourceRegistrationEstablishesDistributionRights: false,
        admissionLedgerCopiesSourceText: false,
        citationReviewEstablishesSemanticTruth: false,
        rightsReviewEstablishesSemanticTruth: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        overallGoodBad: null,
        result: null
      }
    });
    expect(report.interpretationEvidence.statements).toEqual(envelope.claims.map((claim) => ({
      statementId: claim.claimId,
      order: claim.order,
      kind: claim.kind,
      text: claim.displayStatus === "withheld" ? null : claim.text,
      classification: claim.classification,
      displayStatus: claim.displayStatus,
      factIds: [...claim.factIds],
      ruleIds: [...claim.ruleIds],
      sourceBindingIds: [...claim.sourceBindingIds],
      registryLocatorVerifiedBindingIds: claim.sourceBindingIds.filter(
        (id) => bindingById.get(id)?.exactLocator.verificationStatus === "verified"
      ),
      stabilityAssessmentIds: [...claim.stabilityAssessmentIds],
      missingEvidence: [...claim.missingEvidence],
      conflictIds: [...claim.conflictIds],
      rationale: claim.rationale,
      sourceLocatorCoverage: claim.sourceBindingIds.length === 0
        ? "not_applicable"
        : claim.sourceBindingIds.every(
            (id) => bindingById.get(id)?.exactLocator.verificationStatus === "verified"
          ) ? "verified" : "incomplete",
      exactCanonicalRendererMatch: true
    })));
    expect(report.interpretationEvidence.assertionFamilies.map((family) => family.kind)).toEqual([
      "scope",
      "factor_ledger",
      "month_main_duplication",
      "subtotal",
      "classification",
      "sensitivity",
      "boundary"
    ]);
    expect(report.interpretationEvidence.coverage).toMatchObject({
      statementsTotal: envelope.claims.length,
      displayable: envelope.claims.filter((claim) => claim.displayStatus !== "withheld").length,
      withheld: envelope.claims.filter((claim) => claim.displayStatus === "withheld").length,
      referencedSources: 8,
      pinnedRevisionSources: 7,
      registryLocatorVerifiedBindings: 10,
      sourceTextsIncluded: 0
    });
    expect(report.interpretationEvidence.admissionSummary).toEqual({
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsTotal: 12,
      bindingsWithNonRejectedCitation: 0,
      bindingsWithVerifiedCitation: 0,
      bindingsWithRedistributableVerifiedCitation: 0,
      citationRecords: {
        matching: 0,
        structured: 0,
        candidate: 0,
        verified: 0,
        rejected: 0
      },
      knowledgeDocumentsBound: 0,
      sourceRightsRecordsBound: 0,
      sourceTextCopiedIntoAdmissionLedger: false,
      structuredCitationCoverage: "none",
      distributionRightsState: "no_matching_source_text"
    });
    expect(report.interpretationEvidence.sources).toHaveLength(8);
    expect(report.interpretationEvidence.sources.every((source, index) => (
      source.order === index + 1
      && source.sourceRightsRecordStatus === "binding_scoped"
      && source.expertTruthClaimed === false
      && source.scientificValidityClaimed === false
    ))).toBe(true);
    expect(report.interpretationEvidence.sourceBindings).toHaveLength(12);
    expect(report.interpretationEvidence.sourceBindings.every((binding) => (
      binding.locator.contentSha256 === null
      && binding.supports.length > 0
      && binding.doesNotSupport.length > 0
      && binding.mechanicalAdmission.sourceIdentityStatus === "not_assessed"
      && binding.mechanicalAdmission.citationReviewState === "no_citation"
      && binding.mechanicalAdmission.redistributionState === "not_applicable_no_verified"
      && binding.mechanicalAdmission.candidateCitationReferences.length === 0
      && binding.mechanicalAdmission.verifiedCitationReferences.length === 0
      && binding.mechanicalAdmission.rejectedCitationReferences.length === 0
      && binding.mechanicalAdmission.redistributableVerifiedCitationReferences.length === 0
    ))).toBe(true);
    expect(singleChartResearchReportSchema.safeParse(report).success).toBe(true);
  });

  it("按 no、candidate、rejected、verified-private 与 verified-redistributable 投影 binding 准入", async () => {
    const subjectId = STRENGTH_EVIDENCE_SUBJECT_IDS[0];
    if (!subjectId) throw new Error("测试夹具缺少旺衰证据主题");
    const admissionFor = (
      report: Awaited<ReturnType<typeof buildSingleChartResearchReport>>
    ) => {
      const binding = report.interpretationEvidence.sourceBindings.find(
        (candidate) => candidate.evidenceSubjectId === subjectId
      );
      if (!binding) throw new Error("测试报告缺少目标旺衰 binding");
      return binding.mechanicalAdmission;
    };
    const inputFor = (
      status: CitationRecord["status"],
      redistributable: boolean
    ): SingleChartReportInput => {
      const input = singleChartFixture();
      targetFixtureCitationAtStrengthSubjects(input, [subjectId]);
      setFixtureCitationReviewStatus(input, status);
      if (redistributable) makeFixtureSourceRedistributable(input);
      return input;
    };

    const none = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const candidate = await buildSingleChartResearchReport(inputFor("user_candidate", false), { anonymized: false });
    const rejected = await buildSingleChartResearchReport(inputFor("rejected", false), { anonymized: false });
    const verifiedPrivate = await buildSingleChartResearchReport(inputFor("verified", false), { anonymized: false });
    const verifiedRedistributable = await buildSingleChartResearchReport(
      inputFor("verified", true),
      { anonymized: false }
    );

    expect(admissionFor(none)).toEqual({
      sourceIdentityStatus: "not_assessed",
      citationReviewState: "no_citation",
      redistributionState: "not_applicable_no_verified",
      candidateCitationReferences: [],
      verifiedCitationReferences: [],
      rejectedCitationReferences: [],
      redistributableVerifiedCitationReferences: []
    });
    expect(admissionFor(candidate)).toEqual({
      sourceIdentityStatus: "not_assessed",
      citationReviewState: "candidate_only",
      redistributionState: "not_applicable_no_verified",
      candidateCitationReferences: ["C1"],
      verifiedCitationReferences: [],
      rejectedCitationReferences: [],
      redistributableVerifiedCitationReferences: []
    });
    expect(admissionFor(rejected)).toEqual({
      sourceIdentityStatus: "not_assessed",
      citationReviewState: "rejected_only",
      redistributionState: "not_applicable_no_verified",
      candidateCitationReferences: [],
      verifiedCitationReferences: [],
      rejectedCitationReferences: ["C1"],
      redistributableVerifiedCitationReferences: []
    });
    expect(admissionFor(verifiedPrivate)).toEqual({
      sourceIdentityStatus: "not_assessed",
      citationReviewState: "verified_present",
      redistributionState: "no_verified_source_redistributable",
      candidateCitationReferences: [],
      verifiedCitationReferences: ["C1"],
      rejectedCitationReferences: [],
      redistributableVerifiedCitationReferences: []
    });
    expect(admissionFor(verifiedRedistributable)).toEqual({
      sourceIdentityStatus: "not_assessed",
      citationReviewState: "verified_present",
      redistributionState: "all_verified_sources_redistributable",
      candidateCitationReferences: [],
      verifiedCitationReferences: ["C1"],
      rejectedCitationReferences: [],
      redistributableVerifiedCitationReferences: ["C1"]
    });
    expect(candidate.interpretationEvidence.admissionSummary).toMatchObject({
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsWithNonRejectedCitation: 1,
      bindingsWithVerifiedCitation: 0,
      bindingsWithRedistributableVerifiedCitation: 0,
      citationRecords: { matching: 1, structured: 1, candidate: 1, verified: 0, rejected: 0 },
      knowledgeDocumentsBound: 1,
      sourceRightsRecordsBound: 1,
      structuredCitationCoverage: "partial",
      distributionRightsState: "contains_nonredistributable_source_text"
    });
    expect(rejected.interpretationEvidence.admissionSummary).toMatchObject({
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsWithNonRejectedCitation: 0,
      citationRecords: { matching: 1, structured: 0, candidate: 0, verified: 0, rejected: 1 },
      structuredCitationCoverage: "none",
      distributionRightsState: "contains_nonredistributable_source_text"
    });
    expect(verifiedPrivate.interpretationEvidence.admissionSummary).toMatchObject({
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsWithNonRejectedCitation: 1,
      bindingsWithVerifiedCitation: 1,
      bindingsWithRedistributableVerifiedCitation: 0,
      citationRecords: { matching: 1, structured: 1, candidate: 0, verified: 1, rejected: 0 },
      distributionRightsState: "contains_nonredistributable_source_text"
    });
    expect(verifiedRedistributable.interpretationEvidence.admissionSummary).toMatchObject({
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsWithNonRejectedCitation: 1,
      bindingsWithVerifiedCitation: 1,
      bindingsWithRedistributableVerifiedCitation: 1,
      citationRecords: { matching: 1, structured: 1, candidate: 0, verified: 1, rejected: 0 },
      knowledgeDocumentsBound: 1,
      sourceRightsRecordsBound: 1,
      distributionRightsState: "all_matching_source_text_redistributable"
    });
  });

  it("multi-target Citation 按唯一 Citation、资料与权利计数，同时分别命中两个 binding", async () => {
    const subjectIds: readonly string[] = STRENGTH_EVIDENCE_SUBJECT_IDS.slice(0, 2);
    expect(subjectIds).toHaveLength(2);
    const input = singleChartFixture();
    targetFixtureCitationAtStrengthSubjects(input, subjectIds);
    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    const matched = report.interpretationEvidence.sourceBindings.filter(
      (binding) => subjectIds.includes(binding.evidenceSubjectId)
    );

    expect(report.citations[0]!.evidenceSubjectIds).toEqual([...subjectIds].sort());
    expect(matched).toHaveLength(2);
    expect(matched.every((binding) => (
      binding.mechanicalAdmission.sourceIdentityStatus === "not_assessed"
      && binding.mechanicalAdmission.citationReviewState === "candidate_only"
      && binding.mechanicalAdmission.candidateCitationReferences.join("|") === "C1"
    ))).toBe(true);
    expect(report.interpretationEvidence.admissionSummary).toMatchObject({
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsWithNonRejectedCitation: 2,
      bindingsWithVerifiedCitation: 0,
      citationRecords: { matching: 1, structured: 1, candidate: 1, verified: 0, rejected: 0 },
      knowledgeDocumentsBound: 1,
      sourceRightsRecordsBound: 1
    });
  });

  it("按首次 Citation 顺序连续分配 D#，同一 D# 固定正文摘要并与准入 summary 精确闭合", async () => {
    const subjectId = STRENGTH_EVIDENCE_SUBJECT_IDS[0];
    if (!subjectId) throw new Error("测试夹具缺少旺衰证据主题");
    const input = singleChartFixture();
    targetFixtureCitationAtStrengthSubjects(input, [subjectId]);
    const firstCitation = input.citations[0];
    const firstDocument = input.knowledgeDocuments[0];
    const firstRights = input.sourceRights[0];
    if (!firstCitation || !firstDocument || !firstRights) throw new Error("测试夹具缺少引用资料闭合记录");

    const sameDocumentCitation = structuredClone(firstCitation);
    sameDocumentCitation.id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const secondDocument = structuredClone(firstDocument);
    secondDocument.id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const secondRights = structuredClone(firstRights);
    secondRights.documentId = secondDocument.id;
    const secondDocumentCitation = structuredClone(firstCitation);
    secondDocumentCitation.id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    secondDocumentCitation.documentId = secondDocument.id;
    input.citations.push(sameDocumentCitation, secondDocumentCitation);
    input.knowledgeDocuments.push(secondDocument);
    input.sourceRights.push(secondRights);

    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    expect(report.citations.map((citation) => [
      citation.reference,
      citation.source.documentReference,
      citation.source.contentHash
    ])).toEqual([
      ["C1", "D1", DOCUMENT_HASH],
      ["C2", "D1", DOCUMENT_HASH],
      ["C3", "D2", DOCUMENT_HASH]
    ]);
    const binding = report.interpretationEvidence.sourceBindings.find(
      (candidate) => candidate.evidenceSubjectId === subjectId
    );
    expect(binding?.mechanicalAdmission.candidateCitationReferences).toEqual(["C1", "C2", "C3"]);
    expect(report.interpretationEvidence.admissionSummary).toMatchObject({
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsWithNonRejectedCitation: 1,
      citationRecords: { matching: 3, structured: 3, candidate: 3, verified: 0, rejected: 0 },
      knowledgeDocumentsBound: 2,
      sourceRightsRecordsBound: 2
    });

    const skippedDocumentReference = structuredClone(report);
    skippedDocumentReference.citations[2]!.source.documentReference = "D3";
    expect(singleChartResearchReportSchema.safeParse(skippedDocumentReference).success).toBe(false);

    const reusedReferenceWithDifferentHash = structuredClone(report);
    reusedReferenceWithDifferentHash.citations[1]!.source.contentHash = "b".repeat(64);
    expect(singleChartResearchReportSchema.safeParse(reusedReferenceWithDifferentHash).success).toBe(false);

    const forgedSummary = structuredClone(report);
    const summary = forgedSummary.interpretationEvidence.admissionSummary;
    if (summary.visibility !== "full") throw new Error("测试报告缺少完整准入摘要");
    summary.knowledgeDocumentsBound += 1;
    expect(singleChartResearchReportSchema.safeParse(forgedSummary).success).toBe(false);
  });

  it("匿名准入摘要固定 redacted 且不泄露动态 Citation、subject 或权利状态", async () => {
    const subjectId = STRENGTH_EVIDENCE_SUBJECT_IDS[0];
    if (!subjectId) throw new Error("测试夹具缺少旺衰证据主题");
    const input = singleChartFixture();
    targetFixtureCitationAtStrengthSubjects(input, [subjectId]);
    setFixtureCitationReviewStatus(input, "verified");
    makeFixtureSourceRedistributable(input);

    const anonymous = await buildSingleChartResearchReport(input);
    expect(anonymous.interpretationEvidence.admissionSummary).toEqual({
      visibility: "redacted",
      sourceTextCopiedIntoAdmissionLedger: false
    });
    expect(anonymous.interpretationEvidence.sourceBindings).toEqual([]);
    expect(anonymous.citations).toEqual([]);
    const serialized = JSON.stringify(anonymous.interpretationEvidence);
    for (const sensitive of [
      subjectId,
      "C1",
      "verified_present",
      "all_verified_sources_redistributable",
      "all_matching_source_text_redistributable",
      "double_reviewed"
    ]) expect(serialized).not.toContain(sensitive);
  });

  it("Schema 或 validator 拒绝篡改准入 C#、subject、summary、来源身份与 redistributable 投影", async () => {
    const subjectId = STRENGTH_EVIDENCE_SUBJECT_IDS[0];
    const otherSubjectId = STRENGTH_EVIDENCE_SUBJECT_IDS[1];
    if (!subjectId || !otherSubjectId) throw new Error("测试夹具缺少旺衰证据主题");
    const input = singleChartFixture();
    targetFixtureCitationAtStrengthSubjects(input, [subjectId]);
    setFixtureCitationReviewStatus(input, "verified");
    makeFixtureSourceRedistributable(input);
    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    const rejected = async (mutate: (candidate: typeof report) => void) => {
      const candidate = structuredClone(report);
      mutate(candidate);
      const parsed = singleChartResearchReportSchema.safeParse(candidate);
      if (parsed.success) {
        await expect(validateSingleChartResearchReport(candidate, input, { anonymized: false }))
          .rejects.toThrow(/规范重建结果不一致/u);
      } else {
        expect(parsed.success).toBe(false);
      }
    };
    const targetBinding = (candidate: typeof report) => {
      const binding = candidate.interpretationEvidence.sourceBindings.find(
        (entry) => entry.evidenceSubjectId === subjectId
      );
      if (!binding) throw new Error("测试报告缺少目标旺衰 binding");
      return binding;
    };

    await rejected((candidate) => {
      targetBinding(candidate).mechanicalAdmission.verifiedCitationReferences[0] = "C99";
    });
    await rejected((candidate) => {
      targetBinding(candidate).evidenceSubjectId = otherSubjectId;
    });
    await rejected((candidate) => {
      const summary = candidate.interpretationEvidence.admissionSummary;
      if (summary.visibility !== "full") throw new Error("测试报告缺少完整准入摘要");
      summary.bindingsWithVerifiedCitation += 1;
    });
    await rejected((candidate) => {
      Object.assign(targetBinding(candidate).mechanicalAdmission, { sourceIdentityStatus: "verified" });
    });
    await rejected((candidate) => {
      candidate.citations[0]!.source.redistributableSourceRights = false;
    });
  });

  it("重复构建与 Markdown 保持稳定，正文只输出可显示规范句，blocked 句保持留白", async () => {
    const input = singleChartFixture();
    const first = await buildSingleChartResearchReport(input, { anonymized: false });
    const second = await buildSingleChartResearchReport(input, { anonymized: false });
    const anonymous = await buildSingleChartResearchReport(input);
    expect(second).toEqual(first);
    const firstMarkdown = exportSingleChartResearchMarkdown(first);
    const secondMarkdown = exportSingleChartResearchMarkdown(second);
    const anonymousMarkdown = exportSingleChartResearchMarkdown(anonymous);
    expect(secondMarkdown).toEqual(firstMarkdown);
    expect(firstMarkdown.content).toContain("## 旺衰工程候选解读证据");
    expect(firstMarkdown.content).toContain("### 来源注册表快照");
    expect(firstMarkdown.content).toContain("### 最小来源定位账");
    expect(firstMarkdown.content).toContain("作品层权利声明");
    expect(firstMarkdown.content).toContain("载体层权利声明");
    expect(firstMarkdown.content).toContain("locator 核验建立内容身份");
    expect(firstMarkdown.content).toContain("来源登记建立分发权利");
    expect(anonymous.interpretationEvidence).toMatchObject({
      payloadSha256: null,
      sources: [],
      sourceBindings: [],
      coverage: {
        referencedSourceBindings: 12,
        registryLocatorVerifiedBindings: 10,
        referencedSources: 8,
        pinnedRevisionSources: 7,
        sourceTextsIncluded: 0
      },
      admissionSummary: {
        visibility: "redacted",
        sourceTextCopiedIntoAdmissionLedger: false
      }
    });
    const firstSource = first.interpretationEvidence.sources[0];
    const firstBinding = first.interpretationEvidence.sourceBindings[0];
    if (!firstSource || !firstBinding) throw new Error("测试夹具缺少 v1.7 来源治理账");
    expect(firstMarkdown.content).toContain(firstSource.title);
    expect(firstMarkdown.content).toContain(firstSource.url);
    expect(firstMarkdown.content).toContain(firstBinding.locator.value);
    expect(anonymousMarkdown.content).not.toContain("### 来源注册表快照");
    expect(anonymousMarkdown.content).not.toContain("### 最小来源定位账");
    expect(anonymousMarkdown.content).not.toContain(firstSource.title);
    expect(anonymousMarkdown.content).not.toContain(firstSource.url);
    expect(anonymousMarkdown.content).not.toContain(firstBinding.locator.value);

    const interpretation = interpretBaziChart(input.revision.facts, { includeHour: true });
    const envelope = await buildBaziInterpretationEvidenceEnvelope({
      revision: input.revision,
      includeHour: true,
      interpretation,
      strengthSensitivity: buildStrengthSensitivityReview(interpretation)
    });
    const blocked = envelope.claims.filter((claim) => claim.displayStatus === "withheld");
    const visible = envelope.claims.filter((claim) => claim.displayStatus !== "withheld");
    expect(blocked.length).toBeGreaterThan(0);
    expect(first.interpretationEvidence.statements
      .filter((statement) => statement.displayStatus === "withheld")
      .every((statement) => statement.text === null)).toBe(true);
    for (const claim of visible) expect(firstMarkdown.content).toContain(claim.text);
    for (const claim of blocked) expect(firstMarkdown.content).not.toContain(claim.text);
  });

  it("未知时辰的解读证据不纳入或泄露时柱值", async () => {
    const input = singleChartFixture();
    const hourGanZhi = input.revision.facts.pillars.hour.ganZhi;
    input.revision.input.time = null;
    input.revision.input.timePrecision = "unknown_hour";
    await resignRevision(input.revision);

    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    expect(report.interpretationEvidence).toMatchObject({ status: "available", includeHour: false });
    expect(JSON.stringify(report.interpretationEvidence)).not.toContain(hourGanZhi);
    const appendix = exportSingleChartResearchMarkdown(report).content
      .split("## 旺衰工程候选解读证据\n", 2)[1]!
      .split("## 字段来源与验证状态\n", 1)[0]!;
    expect(appendix).not.toContain(hourGanZhi);
  });

  it("DST 未解决时保留事实报告但解读证据严格留白且计数归零", async () => {
    const input = singleChartFixture();
    const chart = structuredClone(await calculateChart({
      ...birthInput,
      date: "2024-11-03",
      time: "01:30",
      timeZone: "America/New_York"
    }, WORKING_DEFAULT_RULE_PROFILE, { dstResolutionOverride: "earlier" }));
    input.revision.input = chart.input;
    input.revision.timeCalibration = chart.timeCalibration;
    input.revision.ruleProfile = chart.ruleProfile;
    input.revision.luckCycleRuleSnapshot = chart.luckCycleRuleSnapshot;
    input.revision.facts = chart.facts;
    input.revision.manifest = chart.manifest;
    delete input.revision.rulePackBinding;
    input.revision.timeCalibration.utcInstant = null;
    input.revision.timeCalibration.utcOffset = null;
    input.revision.timeCalibration.dstStatus = "unresolved";
    input.revision.timeCalibration.normalizationStatus = "wall_time_only";
    input.revision.timeCalibration.timeZoneResolution!.selectedCandidate = null;
    input.revision.timeCalibration.timeZoneResolution!.status = "rejected_overlap";
    input.events = [];
    await resignRevision(input.revision);

    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    expect(report.pillars).toHaveLength(4);
    expect(report.interpretationEvidence).toEqual({
      status: "withheld",
      reason: "dst_unresolved",
      scope: "strength_engineering_candidate_only",
      includeHour: true,
      envelopeProfileVersion: BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE.projectionVersion,
      envelopeContentVersion: BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE.contentVersion,
      sourceRegistry: {
        profileVersion: "hakimi.bazi.strength_claim_registry/0.2.0",
        contentVersion: "0.18.0",
        registrySha256: null
      },
      payloadSha256: null,
      statements: [],
      assertionFamilies: [],
      coverage: {
        statementsTotal: 0,
        displayable: 0,
        withheld: 0,
        assertionFamilies: 0,
        referencedSourceBindings: 0,
        registryLocatorVerifiedBindings: 0,
        referencedSources: 0,
        pinnedRevisionSources: 0,
        sourceTextsIncluded: 0
      },
      admissionSummary: {
        visibility: "full",
        evaluationStatus: "not_evaluated_interpretation_withheld",
        bindingsTotal: 0,
        bindingsWithNonRejectedCitation: 0,
        bindingsWithVerifiedCitation: 0,
        bindingsWithRedistributableVerifiedCitation: 0,
        citationRecords: {
          matching: 0,
          structured: 0,
          candidate: 0,
          verified: 0,
          rejected: 0
        },
        knowledgeDocumentsBound: 0,
        sourceRightsRecordsBound: 0,
        sourceTextCopiedIntoAdmissionLedger: false,
        structuredCitationCoverage: "none",
        distributionRightsState: "no_matching_source_text"
      },
      sources: [],
      sourceBindings: [],
      boundary: {
        referenceResolutionEstablishesSemanticTruth: false,
        citationTargetEstablishesSourceIdentity: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        publicReleaseAuthorized: false,
        authenticityClaimed: false,
        sourceTextIncluded: false,
        locatorReviewEstablishesExactQuote: false,
        locatorVerificationEstablishesContentIdentity: false,
        sourceRegistrationEstablishesDistributionRights: false,
        admissionLedgerCopiesSourceText: false,
        citationReviewEstablishesSemanticTruth: false,
        rightsReviewEstablishesSemanticTruth: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        overallGoodBad: null,
        result: null
      }
    });
    expect(exportSingleChartResearchMarkdown(report).content).toContain("留白原因：dst\\_unresolved");

    const resolved = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const resolvedEvidenceInDstReport = structuredClone(report);
    resolvedEvidenceInDstReport.interpretationEvidence = structuredClone(resolved.interpretationEvidence);
    expect(singleChartResearchReportSchema.safeParse(resolvedEvidenceInDstReport).success).toBe(true);
    expect(() => exportSingleChartResearchMarkdown(resolvedEvidenceInDstReport)).toThrow(
      /必须由当前模块构建或结合原始输入重新校验/
    );
    await expect(validateSingleChartResearchReport(
      resolvedEvidenceInDstReport,
      input,
      { anonymized: false }
    )).rejects.toThrow(/规范重建结果不一致/);
  });

  it("拒绝篡改解读正文、顺序、计数、引用、边界与匿名摘要", async () => {
    const input = singleChartFixture();
    const full = await buildSingleChartResearchReport(input, { anonymized: false });
    const anonymous = await buildSingleChartResearchReport(input);
    const rejected = async (
      report: typeof full,
      anonymized: boolean,
      mutate: (candidate: typeof full) => void
    ) => {
      const candidate = structuredClone(report);
      mutate(candidate);
      await expect(validateSingleChartResearchReport(candidate, input, { anonymized }))
        .rejects.toThrow();
    };
    const firstVisibleIndex = full.interpretationEvidence.statements.findIndex(
      (statement) => statement.displayStatus !== "withheld"
    );
    const firstWithheldIndex = full.interpretationEvidence.statements.findIndex(
      (statement) => statement.displayStatus === "withheld"
    );
    const anonymousMixedIndex = anonymous.interpretationEvidence.statements.findIndex((statement) => (
      statement.sourceLocatorCoverage === "incomplete"
      && statement.registryLocatorVerifiedBindingIds.length > 0
      && statement.registryLocatorVerifiedBindingIds.length < statement.sourceBindingIds.length
    ));
    expect(firstVisibleIndex).toBeGreaterThanOrEqual(0);
    expect(firstWithheldIndex).toBeGreaterThanOrEqual(0);
    expect(anonymousMixedIndex).toBeGreaterThanOrEqual(0);

    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.statements[firstVisibleIndex]!.text = "伪造的专家断语";
    });
    await rejected(full, false, (candidate) => {
      [candidate.interpretationEvidence.statements[0], candidate.interpretationEvidence.statements[1]] = [
        candidate.interpretationEvidence.statements[1]!,
        candidate.interpretationEvidence.statements[0]!
      ];
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.coverage.statementsTotal += 1;
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.coverage.referencedSources += 1;
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.statements[0]!.sourceBindingIds = ["binding:forged"];
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.statements[0]!.registryLocatorVerifiedBindingIds = ["binding:forged"];
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.assertionFamilies[0]!.total += 1;
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.boundary, { expertTruthClaimed: true });
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.boundary, { citationTargetEstablishesSourceIdentity: true });
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.boundary, { sourceTextIncluded: true });
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.boundary, { admissionLedgerCopiesSourceText: true });
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.payloadSha256 = "f".repeat(64);
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.statements[firstWithheldIndex]!.text = "不得泄露的 blocked 正文";
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.sources[0]!.order += 1;
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.sources[0]!.url = "javascript:alert(1)";
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.sources[0]!.stableRevision = null;
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.sources[0]!, {
        registryVerificationStatus: "locator_only_unfrozen"
      });
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.sources[0]!, {
        workRightsStatus: "redistribution_cleared"
      });
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.sources[0]!, {
        carrierRightsStatus: "redistribution_cleared"
      });
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.sourceBindings[0]!.order += 1;
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.sourceBindings[0]!, {
        sourceType: "review_gate_locator"
      });
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.sourceBindings[0]!.locator, {
        verificationScope: "pinned_carrier_heading_only"
      });
    });
    await rejected(full, false, (candidate) => {
      Object.assign(candidate.interpretationEvidence.sourceBindings[0]!.locator, {
        contentSha256: "f".repeat(64)
      });
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.sourceBindings[0]!.supports = "伪造支持范围";
    });
    await rejected(full, false, (candidate) => {
      candidate.interpretationEvidence.sourceBindings[0]!.doesNotSupport = [];
    });
    await rejected(anonymous as typeof full, true, (candidate) => {
      candidate.interpretationEvidence.payloadSha256 = full.interpretationEvidence.payloadSha256;
    });
    await rejected(anonymous as typeof full, true, (candidate) => {
      candidate.interpretationEvidence.sources = structuredClone(full.interpretationEvidence.sources);
    });
    await rejected(anonymous as typeof full, true, (candidate) => {
      candidate.interpretationEvidence.sourceBindings = structuredClone(full.interpretationEvidence.sourceBindings);
    });
    await rejected(anonymous as typeof full, true, (candidate) => {
      candidate.interpretationEvidence.coverage.displayable += 1;
    });
    await rejected(anonymous as typeof full, true, (candidate) => {
      const statement = candidate.interpretationEvidence.statements[anonymousMixedIndex]!;
      statement.registryLocatorVerifiedBindingIds = [...statement.sourceBindingIds];
      statement.sourceLocatorCoverage = "verified";
    });
  });

  it("同步 Markdown 导出只接受整份已登记深冻结实例；clone 必须结合原始输入重新校验", async () => {
    for (const anonymized of [false, true] as const) {
      const input = singleChartFixture();
      const report = await buildSingleChartResearchReport(input, { anonymized });
      const canary = anonymized
        ? "ANONYMOUS-INTERPRETATION-CANARY-1602"
        : "FULL-INTERPRETATION-CANARY-1601";
      expect(Object.isFrozen(report)).toBe(true);
      expect(Object.isFrozen(report.interpretationEvidence)).toBe(true);
      expect(Object.isFrozen(report.interpretationEvidence.statements)).toBe(true);
      expect(() => exportSingleChartResearchMarkdown(report)).not.toThrow();

      const unchangedClone = structuredClone(report);
      expect(singleChartResearchReportSchema.safeParse(unchangedClone).success).toBe(true);
      expect(() => exportSingleChartResearchMarkdown(unchangedClone)).toThrow(
        /必须由当前模块构建或结合原始输入重新校验/
      );
      const revalidated = await validateSingleChartResearchReport(unchangedClone, input, { anonymized });
      expect(revalidated).not.toBe(unchangedClone);
      expect(Object.isFrozen(revalidated)).toBe(true);
      expect(() => exportSingleChartResearchMarkdown(revalidated)).not.toThrow();

      const forged = structuredClone(report);
      const visible = forged.interpretationEvidence.statements.find(
        (statement) => statement.displayStatus !== "withheld"
      );
      if (!visible || visible.text === null) throw new Error("测试夹具缺少可显示解读正文");
      visible.text = canary;
      expect(singleChartResearchReportSchema.safeParse(forged).success).toBe(true);
      const shapeParsed = singleChartResearchReportSchema.parse(forged);

      for (const candidate of [forged, shapeParsed]) {
        let thrown: unknown;
        try {
          exportSingleChartResearchMarkdown(candidate);
        } catch (cause) {
          thrown = cause;
        }
        expect(thrown).toBeInstanceOf(Error);
        expect(String(thrown)).toMatch(/必须由当前模块构建或结合原始输入重新校验/);
        expect(String(thrown)).not.toContain(canary);
      }
      await expect(validateSingleChartResearchReport(forged, input, { anonymized })).rejects.toThrow(
        /规范重建结果不一致/
      );
    }
  });

  it("跨命盘移植解读证据不能借已登记 evidence 绕过整份报告实例门", async () => {
    const sourceInput = singleChartFixture();
    const targetInput = singleChartFixture();
    targetInput.revision.input.time = null;
    targetInput.revision.input.timePrecision = "unknown_hour";
    await resignRevision(targetInput.revision);
    const source = await buildSingleChartResearchReport(sourceInput, { anonymized: false });
    const target = await buildSingleChartResearchReport(targetInput, { anonymized: false });
    expect(source.interpretationEvidence.includeHour).toBe(true);
    expect(target.interpretationEvidence.includeHour).toBe(false);

    const transplanted = structuredClone(target);
    transplanted.interpretationEvidence = structuredClone(source.interpretationEvidence);
    expect(singleChartResearchReportSchema.safeParse(transplanted).success).toBe(true);
    expect(() => exportSingleChartResearchMarkdown(transplanted)).toThrow(
      /必须由当前模块构建或结合原始输入重新校验/
    );
    await expect(validateSingleChartResearchReport(
      transplanted,
      targetInput,
      { anonymized: false }
    )).rejects.toThrow(/规范重建结果不一致/);
    expect(() => exportSingleChartResearchMarkdown(source)).not.toThrow();
    expect(() => exportSingleChartResearchMarkdown(target)).not.toThrow();
  });

  it("构建多份报告不会淘汰或改变既有已登记深冻结实例", async () => {
    const first = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const later = await Promise.all(Array.from({ length: 70 }, (_, index) => (
      buildSingleChartResearchReport(singleChartFixture(), { anonymized: index % 2 === 0 })
    )));
    expect(() => exportSingleChartResearchMarkdown(first)).not.toThrow();
    for (const report of [later[0], later[31], later[63], later[69]]) {
      if (!report) throw new Error("测试未生成预期的历史报告实例");
      expect(Object.isFrozen(report)).toBe(true);
      expect(() => exportSingleChartResearchMarkdown(report)).not.toThrow();
    }
  });

  it("validator 返回深冻结的规范重建报告，验证后的原地突变不能进入导出", async () => {
    const input = singleChartFixture();
    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    const validated = await validateSingleChartResearchReport(report, input, { anonymized: false });
    const visible = validated.interpretationEvidence.statements.find(
      (statement) => statement.displayStatus !== "withheld"
    );
    if (!visible || visible.text === null) throw new Error("测试夹具缺少可展示规范叙事句");

    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated.interpretationEvidence)).toBe(true);
    expect(Object.isFrozen(validated.interpretationEvidence.statements)).toBe(true);
    expect(Object.isFrozen(validated.interpretationEvidence.sources)).toBe(true);
    expect(Object.isFrozen(validated.interpretationEvidence.sources[0])).toBe(true);
    expect(Object.isFrozen(validated.interpretationEvidence.sourceBindings)).toBe(true);
    expect(Object.isFrozen(validated.interpretationEvidence.sourceBindings[0]?.locator)).toBe(true);
    expect(Object.isFrozen(validated.interpretationEvidence.sourceBindings[0]?.doesNotSupport)).toBe(true);
    expect(Object.isFrozen(visible)).toBe(true);
    expect(() => {
      visible.text = "验证后伪造的专家断语";
    }).toThrow(TypeError);

    const markdown = exportSingleChartResearchMarkdown(validated).content;
    expect(markdown).toContain(visible.text);
    expect(markdown).not.toContain("验证后伪造的专家断语");
  });

  it("精确基线收据进入完整报告，匿名报告保留来源类别但移除本地收据标识与摘要", async () => {
    const input = await singleChartFixtureWithBaselineReceipt();
    const receipt = input.revisionCalculationReceipts?.[0];
    if (!receipt) throw new Error("测试夹具缺少计算收据");

    const full = await buildSingleChartResearchReport(input, { anonymized: false });
    expect(full.calculationSource).toMatchObject({
      downstreamSource: "stored_receipt",
      receiptLedgerStatus: "available",
      storedHistoricalOutputCompared: true,
      comparisonStatus: "matched",
      receiptReference: receipt.id,
      receiptDigest: receipt.receiptDigest,
      requestFingerprint: receipt.requestFingerprint,
      capturedAt: receipt.createdAt
    });
    expect(full.calculationSource.components.map((component) => component.status)).toEqual([
      "projected",
      "projected",
      "not_requested"
    ]);
    const fullMarkdown = exportSingleChartResearchMarkdown(full).content.replaceAll("\\_", "_");
    expect(fullMarkdown).toContain("## 下游计算来源");
    expect(fullMarkdown).toContain("已保存计算收据（stored_receipt）");
    expect(fullMarkdown).toContain(receipt.id);

    const anonymous = await buildSingleChartResearchReport(input);
    expect(anonymous.calculationSource).toMatchObject({
      downstreamSource: "stored_receipt",
      comparisonStatus: "matched",
      receiptReference: null,
      receiptDigest: null,
      requestFingerprint: null,
      capturedAt: null,
      projectionDigest: null
    });
    expect(JSON.stringify(anonymous)).not.toContain(receipt.id);
    expect(JSON.stringify(anonymous)).not.toContain(receipt.receiptDigest);
    expect(JSON.stringify(anonymous)).not.toContain(receipt.requestFingerprint);
  });

  it("默认匿名移除自由文本、标识、位置、引用和结果哈希，但保留再识别警告", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture());
    const serialized = JSON.stringify(report);

    for (const sensitive of [
      "危险案例",
      CASE_ID,
      REVISION_1_ID,
      NOTE_EARLY_ID,
      EVENT_EARLY_ID,
      DOCUMENT_ID,
      "地点自由文本",
      "出生来源备注",
      "早期笔记正文",
      "早期事件正文",
      "合成报告资料",
      "测试作者",
      "测试出版方",
      "https://example.test/report-source",
      "仅用于验证单盘报告的引用与权利边界",
      "合成候选批注",
      "本地测试版",
      fixture.revisions[0].manifest.resultHash
    ]) expect(serialized).not.toContain(sensitive);
    expect(serialized).toContain("1995-08-18");
    expect(serialized).toContain("08:26");
    expect(serialized).toContain("Asia/Shanghai");
    expect(report.privacyWarning).toBe(REIDENTIFICATION_WARNING);
    expect(report.researchNotes).toEqual([]);
    expect(report.events).toEqual([]);
    expect(report.citations).toEqual([]);
  });

  it("匿名模式不会泄漏规则与字段来源中的任意自由文本", async () => {
    const sentinel = "PII-SENTINEL-13800138000";
    const fixtureWithUntrustedMetadata = singleChartFixture();
    fixtureWithUntrustedMetadata.revision.ruleProfile.label = sentinel;
    fixtureWithUntrustedMetadata.revision.ruleProfile.notice = sentinel;
    fixtureWithUntrustedMetadata.revision.ruleProfile.sourceRefs = [sentinel];
    const provenance = fixtureWithUntrustedMetadata.revision.facts.fieldProvenance[0];
    if (!provenance) throw new Error("测试夹具缺少字段 provenance");
    fixtureWithUntrustedMetadata.revision.facts.fieldProvenance.push({
      ...provenance,
      field: sentinel,
      algorithmId: sentinel,
      sourceRefs: [sentinel],
      note: sentinel
    });
    await resignRevision(fixtureWithUntrustedMetadata.revision);

    const anonymizedReport = await buildSingleChartResearchReport(fixtureWithUntrustedMetadata);
    const anonymizedMarkdown = exportSingleChartResearchMarkdown(anonymizedReport);
    expect(JSON.stringify(anonymizedReport)).not.toContain(sentinel);
    expect(anonymizedMarkdown.content).not.toContain(sentinel);
    expect(anonymizedReport.ruleRows).toContainEqual({ label: "规则说明", value: "（匿名模式已移除）" });
    expect(anonymizedReport.provenance[0]).toMatchObject({
      algorithmId: "（匿名模式已移除）",
      sourceRefs: [],
      note: "（匿名模式已移除）"
    });

    const fullReport = await buildSingleChartResearchReport(fixtureWithUntrustedMetadata, { anonymized: false });
    expect(JSON.stringify(fullReport)).toContain(sentinel);
  });

  it("直接导出匿名报告时拒绝 provenance 隐私绕过，且错误不回显敏感值", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture());
    const sentinel = "PRIVATE-PROVENANCE-CANARY-4401";

    const expectRejectedWithoutCanary = (mutate: (forged: typeof report) => void) => {
      const forged = structuredClone(report);
      mutate(forged);
      const parsed = singleChartResearchReportSchema.safeParse(forged);
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.message).not.toContain(sentinel);
    };

    expectRejectedWithoutCanary((forged) => {
      Object.assign(forged.provenance[0]!, { sourceRefs: [sentinel] });
    });
    expectRejectedWithoutCanary((forged) => {
      Object.assign(forged.provenance[0]!, { note: sentinel });
    });
    expectRejectedWithoutCanary((forged) => {
      Object.assign(forged.provenance[0]!, { algorithmId: sentinel });
    });
    expectRejectedWithoutCanary((forged) => {
      Object.assign(forged.provenance[0]!, { field: sentinel });
    });
  });

  it("匿名报告拒绝私有集合、摘要与伪造固定身份，且错误不回显 canary", async () => {
    const anonymous = await buildSingleChartResearchReport(singleChartFixture());
    const full = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const migrated = await buildSingleChartResearchReport(
      await singleChartFixtureWithCalendarMigration(),
      { anonymized: false }
    );
    const anonymousReceipt = await buildSingleChartResearchReport(
      await singleChartFixtureWithBaselineReceipt()
    );
    expect(() => exportSingleChartResearchMarkdown(anonymous)).not.toThrow();
    expect(() => exportSingleChartResearchMarkdown(anonymousReceipt)).not.toThrow();

    const expectRejectedWithoutCanary = (
      base: typeof anonymous,
      mutate: (forged: typeof anonymous) => void,
      canary: string
    ) => {
      const forged = structuredClone(base);
      mutate(forged);
      const parsed = singleChartResearchReportSchema.safeParse(forged);
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.message).not.toContain(canary);
    };

    const note = structuredClone(full.researchNotes[0]!);
    note.body = "PRIVATE-NOTE-CANARY-4501";
    expectRejectedWithoutCanary(anonymous, (forged) => {
      forged.researchNotes = [note];
    }, note.body);

    const event = structuredClone(full.events[0]!);
    event.body = "PRIVATE-EVENT-CANARY-4502";
    expectRejectedWithoutCanary(anonymous, (forged) => {
      forged.events = [event];
    }, event.body);

    const derivation = structuredClone(migrated.eventTimeDerivations[0]!);
    derivation.lineage[0]!.value = "PRIVATE-DERIVATION-CANARY-4503";
    expectRejectedWithoutCanary(anonymous, (forged) => {
      forged.eventTimeDerivations = [derivation];
    }, derivation.lineage[0]!.value);

    const citation = structuredClone(full.citations[0]!);
    citation.quote = "PRIVATE-CITATION-CANARY-4504";
    expectRejectedWithoutCanary(anonymous, (forged) => {
      forged.citations = [citation];
    }, citation.quote);

    for (const [field, canary] of [
      ["projectionDigest", "a".repeat(64)],
      ["receiptReference", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      ["receiptDigest", "b".repeat(64)],
      ["requestFingerprint", "c".repeat(64)],
      ["capturedAt", "2026-08-24T01:02:03.000Z"]
    ] as const) {
      expectRejectedWithoutCanary(anonymousReceipt, (forged) => {
        Object.assign(forged.calculationSource, { [field]: canary });
      }, canary);
    }

    const componentDigest = "d".repeat(64);
    expectRejectedWithoutCanary(anonymousReceipt, (forged) => {
      Object.assign(forged.calculationSource.components[0], { resultDigest: componentDigest });
    }, componentDigest);

    for (const [field, canary] of [
      ["caseLabel", "PRIVATE-CASE-LABEL-CANARY-4505"],
      ["caseReference", "PRIVATE-CASE-REFERENCE-CANARY-4506"],
      ["revisionReference", "PRIVATE-REVISION-REFERENCE-CANARY-4507"],
      ["revisionLabel", "PRIVATE-REVISION-LABEL-CANARY-4508"],
      ["suggestedFileBase", "private-file-base-canary-4509"]
    ] as const) {
      expectRejectedWithoutCanary(anonymous, (forged) => {
        Object.assign(forged, { [field]: canary });
      }, canary);
    }
  });

  it("匿名行组与固定删减清单拒绝 canary、重复和额外字段，且错误不回显", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture());
    expect(() => exportSingleChartResearchMarkdown(report)).not.toThrow();

    const expectRejectedWithoutCanary = (
      mutate: (forged: typeof report) => void,
      canary: string
    ) => {
      const forged = structuredClone(report);
      mutate(forged);
      const parsed = singleChartResearchReportSchema.safeParse(forged);
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.message).not.toContain(canary);
    };

    for (const [field, label, canary] of [
      ["caseRows", "案例", "PRIVATE-CASE-NAME-CANARY-4601"],
      ["caseRows", "案例标识", "PRIVATE-CASE-ID-CANARY-4602"],
      ["caseRows", "修订", "PRIVATE-REVISION-ROW-CANARY-4603"],
      ["caseRows", "标签", "PRIVATE-TAGS-CANARY-4604"],
      ["caseRows", "案例备注", "PRIVATE-CASE-NOTES-CANARY-4605"],
      ["birthRows", "地点", "PRIVATE-LOCATION-CANARY-4606"],
      ["birthRows", "坐标", "PRIVATE-COORDINATES-CANARY-4607"],
      ["birthRows", "来源备注", "PRIVATE-SOURCE-NOTE-CANARY-4608"],
      ["calibrationRows", "真太阳时预览", "PRIVATE-SOLAR-TIME-CANARY-4609"],
      ["calibrationRows", "时间校准警告", "PRIVATE-CALIBRATION-WARNING-CANARY-4610"],
      ["calibrationRows", "计算警告", "PRIVATE-CALCULATION-WARNING-CANARY-4611"],
      ["ruleRows", "规则说明", "PRIVATE-RULE-NOTICE-CANARY-4612"],
      ["ruleRows", "规则来源", "PRIVATE-RULE-SOURCE-CANARY-4613"],
      ["integrityRows", "结果哈希", "PRIVATE-RESULT-HASH-CANARY-4614"],
      ["integrityRows", "计算时间", "PRIVATE-CALCULATED-AT-CANARY-4615"]
    ] as const) {
      expectRejectedWithoutCanary((forged) => {
        const row = forged[field].find((item) => item.label === label);
        if (!row) throw new Error(`测试夹具缺少行：${label}`);
        row.value = canary;
      }, canary);
    }

    const redactionsCanary = "PRIVATE-REDACTIONS-CANARY-4616";
    expectRejectedWithoutCanary((forged) => {
      forged.redactions = [redactionsCanary];
    }, redactionsCanary);

    const extraRowCanary = "PRIVATE-EXTRA-ROW-CANARY-4617";
    expectRejectedWithoutCanary((forged) => {
      forged.birthRows.push({ label: "额外私人字段", value: extraRowCanary });
    }, extraRowCanary);

    const duplicated = structuredClone(report);
    duplicated.ruleRows.push({ label: "规则说明", value: "（匿名模式已移除）" });
    expect(() => singleChartResearchReportSchema.parse(duplicated)).toThrow(/固定标签序列|唯一存在/);
  });

  it("非收据来源拒绝收据元数据，并按真实 builder 分支约束投影摘要", async () => {
    const projection = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const storedReceipt = await buildSingleChartResearchReport(
      await singleChartFixtureWithBaselineReceipt(),
      { anonymized: false }
    );
    expect(() => exportSingleChartResearchMarkdown(projection)).not.toThrow();
    expect(() => exportSingleChartResearchMarkdown(storedReceipt)).not.toThrow();

    const expectRejectedWithoutCanary = (
      base: typeof projection,
      mutate: (forged: typeof projection) => void,
      canary: string
    ) => {
      const forged = structuredClone(base);
      mutate(forged);
      const parsed = singleChartResearchReportSchema.safeParse(forged);
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.message).not.toContain(canary);
    };

    for (const [field, canary] of [
      ["receiptReference", "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"],
      ["receiptDigest", "f".repeat(64)],
      ["requestFingerprint", "1".repeat(64)],
      ["capturedAt", "2026-08-24T04:05:06.000Z"]
    ] as const) {
      expectRejectedWithoutCanary(projection, (forged) => {
        Object.assign(forged.calculationSource, { [field]: canary });
      }, canary);
    }

    const missingProjectionDigest = structuredClone(projection);
    missingProjectionDigest.calculationSource.projectionDigest = null;
    expect(() => singleChartResearchReportSchema.parse(missingProjectionDigest)).toThrow(/投影摘要/);

    const missingStoredProjectionDigest = structuredClone(storedReceipt);
    missingStoredProjectionDigest.calculationSource.projectionDigest = null;
    expect(() => singleChartResearchReportSchema.parse(missingStoredProjectionDigest)).toThrow(/投影摘要/);

    for (const field of [
      "receiptReference",
      "receiptDigest",
      "requestFingerprint",
      "capturedAt"
    ] as const) {
      const missingStoredReceiptMetadata = structuredClone(storedReceipt);
      missingStoredReceiptMetadata.calculationSource[field] = null;
      expect(() => singleChartResearchReportSchema.parse(missingStoredReceiptMetadata)).toThrow(/收据元数据/);
    }

    const notEvaluable = structuredClone(projection);
    Object.assign(notEvaluable.calculationSource, {
      downstreamSource: "not_evaluable",
      receiptLedgerStatus: "schema_unavailable",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable",
      projectionDigest: null
    });
    notEvaluable.calculationSource.components.forEach((component) => {
      Object.assign(component, {
        status: "not_evaluable",
        executorId: null,
        resultDigest: null
      });
    });
    expect(singleChartResearchReportSchema.safeParse(notEvaluable).success).toBe(true);

    const notEvaluableWithDigest = structuredClone(notEvaluable);
    notEvaluableWithDigest.calculationSource.projectionDigest = "2".repeat(64);
    expect(() => singleChartResearchReportSchema.parse(notEvaluableWithDigest)).toThrow(/投影摘要/);
  });

  it("复用 contracts provenance 枚举，要求四柱九字段覆盖并允许受支持的额外条目", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const first = report.provenance[0];
    if (!first) throw new Error("测试夹具缺少字段 provenance");

    const withExtra = structuredClone(report);
    withExtra.provenance.push({
      ...first,
      field: "supported.extra.provenance",
      kind: "rule_derived",
      verificationStatus: "experimental"
    });
    expect(singleChartResearchReportSchema.safeParse(withExtra).success).toBe(true);

    const missingCanonical = structuredClone(withExtra);
    missingCanonical.provenance = missingCanonical.provenance.filter(
      (item) => item.field !== "pillars.year.ganZhi"
    );
    expect(() => singleChartResearchReportSchema.parse(missingCanonical)).toThrow(/四柱规范 provenance 字段覆盖/);

    for (const kind of ["calendar_fact", "rule_derived", "interpretive_claim", "ai_expression"] as const) {
      const candidate = structuredClone(report);
      Object.assign(candidate.provenance[0]!, { kind });
      expect(singleChartResearchReportSchema.safeParse(candidate).success).toBe(true);
    }
    for (const verificationStatus of ["gold_verified", "adjudicated", "disputed", "experimental"] as const) {
      const candidate = structuredClone(report);
      Object.assign(candidate.provenance[0]!, { verificationStatus });
      expect(singleChartResearchReportSchema.safeParse(candidate).success).toBe(true);
    }

    const invalidKind = structuredClone(report);
    Object.assign(invalidKind.provenance[0]!, { kind: "future_unreviewed_kind" });
    expect(singleChartResearchReportSchema.safeParse(invalidKind).success).toBe(false);
    const invalidVerification = structuredClone(report);
    Object.assign(invalidVerification.provenance[0]!, { verificationStatus: "future_unreviewed_status" });
    expect(singleChartResearchReportSchema.safeParse(invalidVerification).success).toBe(false);
  });

  it("直接导出时拒绝矛盾 calculationSource，并保留明确的合法分支", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const storedReceiptReport = await buildSingleChartResearchReport(
      await singleChartFixtureWithBaselineReceipt(),
      { anonymized: false }
    );
    const expectCalculationSourceRejected = (
      overrides: Record<string, unknown>
    ) => {
      const forged = structuredClone(report);
      Object.assign(forged.calculationSource, overrides);
      expect(singleChartResearchReportSchema.safeParse(forged).success).toBe(false);
    };

    expect(() => exportSingleChartResearchMarkdown(report)).not.toThrow();

    const exactExecutorUnavailable = structuredClone(storedReceiptReport);
    Object.assign(exactExecutorUnavailable.calculationSource, {
      downstreamSource: "stored_receipt",
      receiptLedgerStatus: "available",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "exact_executor_unavailable"
    });
    expect(singleChartResearchReportSchema.safeParse(exactExecutorUnavailable).success).toBe(true);

    const notEvaluable = structuredClone(report);
    Object.assign(notEvaluable.calculationSource, {
      downstreamSource: "not_evaluable",
      receiptLedgerStatus: "schema_unavailable",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable",
      projectionDigest: null
    });
    notEvaluable.calculationSource.components.forEach((component) => {
      Object.assign(component, {
        status: "not_evaluable",
        executorId: null,
        resultDigest: null
      });
    });
    expect(singleChartResearchReportSchema.safeParse(notEvaluable).success).toBe(true);

    const mismatch = structuredClone(storedReceiptReport);
    Object.assign(mismatch.calculationSource, {
      downstreamSource: "stored_receipt",
      receiptLedgerStatus: "available",
      storedHistoricalOutputCompared: true,
      comparisonStatus: "mismatch"
    });
    expect(singleChartResearchReportSchema.safeParse(mismatch).success).toBe(true);

    expectCalculationSourceRejected({ downstreamSource: "stored_receipt" });
    expectCalculationSourceRejected({
      receiptLedgerStatus: "schema_unavailable",
      downstreamSource: "stored_receipt",
      storedHistoricalOutputCompared: true,
      comparisonStatus: "matched"
    });
    expectCalculationSourceRejected({
      receiptLedgerStatus: "available",
      downstreamSource: "stored_receipt",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "matched"
    });
    expectCalculationSourceRejected({
      receiptLedgerStatus: "available",
      downstreamSource: "stored_receipt",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "mismatch"
    });
    expectCalculationSourceRejected({
      receiptLedgerStatus: "available",
      downstreamSource: "explicit_projection",
      storedHistoricalOutputCompared: true,
      comparisonStatus: "matched"
    });
    expectCalculationSourceRejected({
      receiptLedgerStatus: "available",
      downstreamSource: "stored_receipt",
      storedHistoricalOutputCompared: true,
      comparisonStatus: "exact_executor_unavailable"
    });
    expectCalculationSourceRejected({
      receiptLedgerStatus: "available",
      downstreamSource: "stored_receipt",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable"
    });
  });

  it("导出冻结的单盘展示契约，供 package 与 Web 共享身份、顺序和容量边界", () => {
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.identity)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.rowLabels)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.rowLabels.case)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.citationStatusLabels)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.calculationComponents)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.calculationComponents[0])).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.anonymous)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.anonymous.redactions)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_LIMITS)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections)).toBe(true);
    expect(Object.isFrozen(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections)).toBe(true);

    expect(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.identity).toMatchObject({
      schemaVersion: "1.0.0",
      formatVersion: "1.7.0",
      kind: "single_chart_research_report",
      title: "八字单盘研究报告"
    });
    expect(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.calculationComponents).toEqual([
      { key: "relations", label: "四柱关系" },
      { key: "luckCycle", label: "起运" },
      { key: "transit", label: "Transit" }
    ]);
    expect(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.citationStatusLabels).toEqual({
      user_candidate: "用户候选",
      verified: "双人核验",
      rejected: "已拒绝 / 反证"
    });
    expect(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.rowLabels.case).toEqual([
      "案例",
      "案例标识",
      "修订",
      "标签",
      "案例备注"
    ]);
    expect(SINGLE_CHART_REPORT_PRESENTATION_LIMITS).toMatchObject({
      identifierCharacters: 512,
      labelCharacters: 1_024,
      bodyCharacters: 24_000,
      aggregateCodePoints: 1_000_000,
      markdownUtf8Bytes: 8_388_608,
      rowsPerGroup: 256,
      nestedEntries: 128,
      collections: {
        provenance: 512,
        researchNotes: 256,
        events: 256,
        researchEntries: 256,
        eventTimeDerivations: 256,
        citations: 512,
        redactions: 512,
        components: 3
      }
    });
  });

  it("package 报告 Schema 与 Web 一致拒绝隐形方向控制字符且不回显载荷", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const canary = "INVISIBLE-CONTROL-CANARY";
    const poisoned = structuredClone(report);
    poisoned.subtitle = `${poisoned.subtitle}\u202E${canary}`;

    const parsed = singleChartResearchReportSchema.safeParse(poisoned);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.message).toContain("包含不可安全显示的控制字符");
      expect(parsed.error.message).not.toContain(canary);
    }
  });

  it("whole-report aggregate 预检拒绝访问器而不执行 getter", async () => {
    const report = structuredClone(
      await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false })
    );
    let getterCalled = false;
    Object.defineProperty(report, "subtitle", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalled = true;
        throw new Error("AGGREGATE-GETTER-CANARY");
      }
    });

    expect(hasSingleChartReportAggregateTextCapacity(report)).toBe(false);
    expect(getterCalled).toBe(false);
  });

  it("固定三组件顺序，并联动全局来源、组件状态、执行器与摘要", async () => {
    const full = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const anonymous = await buildSingleChartResearchReport(singleChartFixture());
    expect(singleChartResearchReportSchema.safeParse(full).success).toBe(true);
    expect(singleChartResearchReportSchema.safeParse(anonymous).success).toBe(true);

    const swapped = structuredClone(full);
    const first = swapped.calculationSource.components[0];
    swapped.calculationSource.components[0] = swapped.calculationSource.components[1];
    swapped.calculationSource.components[1] = first;
    expect(singleChartResearchReportSchema.safeParse(swapped).success).toBe(false);

    const wrongLabel = structuredClone(full);
    Object.assign(wrongLabel.calculationSource.components[0], { label: "起运" });
    expect(singleChartResearchReportSchema.safeParse(wrongLabel).success).toBe(false);

    const projectedWithoutExecutor = structuredClone(full);
    projectedWithoutExecutor.calculationSource.components[0].executorId = null;
    expect(singleChartResearchReportSchema.safeParse(projectedWithoutExecutor).success).toBe(false);

    const projectedWithoutDigest = structuredClone(full);
    projectedWithoutDigest.calculationSource.components[0].resultDigest = null;
    expect(singleChartResearchReportSchema.safeParse(projectedWithoutDigest).success).toBe(false);

    const anonymousWithDigest = structuredClone(anonymous);
    anonymousWithDigest.calculationSource.components[0].resultDigest = "3".repeat(64);
    expect(singleChartResearchReportSchema.safeParse(anonymousWithDigest).success).toBe(false);

    const nonProjectedWithDigest = structuredClone(full);
    Object.assign(nonProjectedWithDigest.calculationSource.components[2], {
      status: "not_requested",
      resultDigest: "4".repeat(64)
    });
    expect(singleChartResearchReportSchema.safeParse(nonProjectedWithDigest).success).toBe(false);

    const nonTransitNotRequested = structuredClone(full);
    Object.assign(nonTransitNotRequested.calculationSource.components[0], {
      status: "not_requested",
      executorId: null,
      resultDigest: null
    });
    expect(singleChartResearchReportSchema.safeParse(nonTransitNotRequested).success).toBe(false);

    const inconsistentGlobalFailure = structuredClone(full);
    Object.assign(inconsistentGlobalFailure.calculationSource, {
      downstreamSource: "not_evaluable",
      comparisonStatus: "not_applicable",
      projectionDigest: null
    });
    expect(singleChartResearchReportSchema.safeParse(inconsistentGlobalFailure).success).toBe(false);

    const inconsistentPartialFailure = structuredClone(full);
    Object.assign(inconsistentPartialFailure.calculationSource.components[0], {
      status: "not_evaluable",
      executorId: null,
      resultDigest: null
    });
    expect(singleChartResearchReportSchema.safeParse(inconsistentPartialFailure).success).toBe(false);

    const legitimateUnavailable = structuredClone(full);
    Object.assign(legitimateUnavailable.calculationSource.components[0], {
      status: "unavailable",
      executorId: null,
      resultDigest: null
    });
    expect(singleChartResearchReportSchema.safeParse(legitimateUnavailable).success).toBe(true);

    const legitimateGlobalFailure = structuredClone(full);
    Object.assign(legitimateGlobalFailure.calculationSource, {
      downstreamSource: "not_evaluable",
      receiptLedgerStatus: "schema_unavailable",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable",
      projectionDigest: null
    });
    legitimateGlobalFailure.calculationSource.components.forEach((component) => {
      Object.assign(component, {
        status: "not_evaluable",
        executorId: null,
        resultDigest: null
      });
    });
    expect(singleChartResearchReportSchema.safeParse(legitimateGlobalFailure).success).toBe(true);
  });

  it("联动引用状态标签、复核人数与规范正文哈希，同时保留合法候选和拒绝状态", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });

    const wrongLabel = structuredClone(report);
    wrongLabel.citations[0].statusLabel = "双人核验";
    expect(singleChartResearchReportSchema.safeParse(wrongLabel).success).toBe(false);

    const malformedHash = structuredClone(report);
    malformedHash.citations[0].source.contentHash = "A".repeat(64);
    expect(singleChartResearchReportSchema.safeParse(malformedHash).success).toBe(false);

    const underReviewed = structuredClone(report);
    Object.assign(underReviewed.citations[0], {
      status: "verified",
      statusLabel: "双人核验",
      reviewerCount: 1,
      decisionNote: "已有裁定但复核人数不足"
    });
    expect(singleChartResearchReportSchema.safeParse(underReviewed).success).toBe(false);

    const verified = structuredClone(report);
    Object.assign(verified.citations[0], {
      status: "verified",
      statusLabel: "双人核验",
      reviewerCount: 2,
      decisionNote: "两名不同复核身份已完成裁定"
    });
    expect(singleChartResearchReportSchema.safeParse(verified).success).toBe(true);

    const rejectedWithoutReason = structuredClone(report);
    Object.assign(rejectedWithoutReason.citations[0], {
      status: "rejected",
      statusLabel: "已拒绝 / 反证",
      reviewerCount: 0,
      decisionNote: ""
    });
    expect(singleChartResearchReportSchema.safeParse(rejectedWithoutReason).success).toBe(false);

    const rejected = structuredClone(rejectedWithoutReason);
    rejected.citations[0].decisionNote = "来源与命盘字段不支持该主张";
    expect(singleChartResearchReportSchema.safeParse(rejected).success).toBe(true);

    const historicalCandidateWithOneReviewer = structuredClone(report);
    historicalCandidateWithOneReviewer.citations[0].reviewerCount = 1;
    expect(singleChartResearchReportSchema.safeParse(historicalCandidateWithOneReviewer).success).toBe(true);
  });

  it("来源权利投影使用精确 enum，blocked 或未知权利不能伪造 redistributable", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const invalidEnumValues = [
      ["rightsStatus", "redistribution_cleared"],
      ["workStatus", "redistribution_cleared"],
      ["editionStatus", "redistribution_cleared"],
      ["distributionPolicy", "public_release"],
      ["reviewStatus", "expert_verified"]
    ] as const;
    for (const [field, value] of invalidEnumValues) {
      const candidate = structuredClone(report);
      Object.assign(candidate.citations[0]!.source, { [field]: value });
      expect(singleChartResearchReportSchema.safeParse(candidate).success).toBe(false);
    }

    const blocked = structuredClone(report);
    blocked.citations[0]!.source.rightsStatus = "blocked";
    expect(singleChartResearchReportSchema.safeParse(blocked).success).toBe(false);
    blocked.citations[0]!.source.redistributableSourceRights = true;
    expect(singleChartResearchReportSchema.safeParse(blocked).success).toBe(false);

    const unknownRights = structuredClone(report);
    Object.assign(unknownRights.citations[0]!.source, {
      rightsStatus: "licensed_verified",
      workStatus: "unknown",
      editionStatus: "unknown",
      distributionPolicy: "redistributable",
      reviewStatus: "double_reviewed",
      redistributableSourceRights: true
    });
    expect(singleChartResearchReportSchema.safeParse(unknownRights).success).toBe(false);
  });

  it("Citation evidenceSubjectIds 必须与可见证据主题 target 标签精确闭合", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    expect(report.citations[0]!.evidenceSubjectIds).toEqual(["bazi.pillar.day.ganzhi.v1"]);
    expect(report.citations[0]!.targets).toContain("证据主题 bazi.pillar.day.ganzhi.v1");

    const added = structuredClone(report);
    added.citations[0]!.evidenceSubjectIds.push("bazi.pillar.year.ganzhi.v1");
    expect(singleChartResearchReportSchema.safeParse(added).success).toBe(false);

    const removed = structuredClone(report);
    removed.citations[0]!.evidenceSubjectIds = [];
    expect(singleChartResearchReportSchema.safeParse(removed).success).toBe(false);

    const replaced = structuredClone(report);
    replaced.citations[0]!.evidenceSubjectIds = ["bazi.pillar.year.ganzhi.v1"];
    expect(singleChartResearchReportSchema.safeParse(replaced).success).toBe(false);
  });

  it("完整与匿名报告都要求当前 builder 的必要行组，拒绝空组、缺行与额外行", async () => {
    const reports = [
      await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false }),
      await buildSingleChartResearchReport(singleChartFixture())
    ];
    for (const report of reports) {
      expect(singleChartResearchReportSchema.safeParse(report).success).toBe(true);

      const empty = structuredClone(report);
      empty.caseRows = [];
      expect(singleChartResearchReportSchema.safeParse(empty).success).toBe(false);

      const missing = structuredClone(report);
      missing.integrityRows.pop();
      expect(singleChartResearchReportSchema.safeParse(missing).success).toBe(false);

      const extra = structuredClone(report);
      extra.calibrationRows.push({ label: "额外字段", value: "不可夹带" });
      expect(singleChartResearchReportSchema.safeParse(extra).success).toBe(false);
    }
  });

  it("在 Web 同级展示容量上 fail-closed，按 Unicode code point 计数且不静默截断", async () => {
    const limits = SINGLE_CHART_REPORT_PRESENTATION_LIMITS;
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });

    const exact = structuredClone(report);
    exact.subtitle = "𠀀".repeat(limits.bodyCharacters);
    exact.caseReference = "r".repeat(limits.identifierCharacters);
    exact.caseLabel = "例".repeat(limits.labelCharacters);
    expect(singleChartResearchReportSchema.safeParse(exact).success).toBe(true);

    const overBody = structuredClone(exact);
    overBody.subtitle += "甲";
    expect(singleChartResearchReportSchema.safeParse(overBody).success).toBe(false);
    const overIdentifier = structuredClone(exact);
    overIdentifier.caseReference += "r";
    expect(singleChartResearchReportSchema.safeParse(overIdentifier).success).toBe(false);
    const overLabel = structuredClone(exact);
    overLabel.caseLabel += "例";
    expect(singleChartResearchReportSchema.safeParse(overLabel).success).toBe(false);

    const provenanceAtLimit = structuredClone(report);
    const provenanceSeed = structuredClone(provenanceAtLimit.provenance[0]);
    if (!provenanceSeed) throw new Error("测试夹具缺少 provenance");
    while (provenanceAtLimit.provenance.length < limits.collections.provenance) {
      provenanceAtLimit.provenance.push(structuredClone(provenanceSeed));
    }
    expect(singleChartResearchReportSchema.safeParse(provenanceAtLimit).success).toBe(true);
    provenanceAtLimit.provenance.push(structuredClone(provenanceSeed));
    expect(singleChartResearchReportSchema.safeParse(provenanceAtLimit).success).toBe(false);

    const nestedAtLimit = structuredClone(report);
    nestedAtLimit.provenance[0].sourceRefs = Array.from(
      { length: limits.nestedEntries },
      (_, index) => `source-${index}`
    );
    expect(singleChartResearchReportSchema.safeParse(nestedAtLimit).success).toBe(true);
    nestedAtLimit.provenance[0].sourceRefs.push("source-over-limit");
    expect(singleChartResearchReportSchema.safeParse(nestedAtLimit).success).toBe(false);

    const entriesAtLimit = structuredClone(report);
    const noteSeed = structuredClone(entriesAtLimit.researchNotes[0]);
    if (!noteSeed) throw new Error("测试夹具缺少研究笔记");
    entriesAtLimit.researchNotes = Array.from(
      { length: limits.collections.researchEntries - entriesAtLimit.events.length },
      () => structuredClone(noteSeed)
    );
    expect(singleChartResearchReportSchema.safeParse(entriesAtLimit).success).toBe(true);
    entriesAtLimit.researchNotes.push(structuredClone(noteSeed));
    expect(singleChartResearchReportSchema.safeParse(entriesAtLimit).success).toBe(false);

    const exactBuilderBody = singleChartFixture();
    exactBuilderBody.researchNotes[0].body = "𠀀".repeat(limits.bodyCharacters);
    const exactBuilderReport = await buildSingleChartResearchReport(
      exactBuilderBody,
      { anonymized: false }
    );
    expect(exactBuilderReport.researchNotes[0].body).toBe(exactBuilderBody.researchNotes[0].body);

    const overBuilderBody = singleChartFixture();
    const canary = "PRIVATE-BODY-CAPACITY-CANARY-4701";
    overBuilderBody.researchNotes[0].body = `${canary}${"甲".repeat(limits.bodyCharacters)}`;
    let bodyError: unknown;
    try {
      await buildSingleChartResearchReport(overBuilderBody, { anonymized: false });
    } catch (cause) {
      bodyError = cause;
    }
    expect(bodyError).toBeInstanceOf(Error);
    expect(String(bodyError)).toMatch(/研究笔记正文超过当前单盘报告展示容量/);
    expect(String(bodyError)).not.toContain(canary);

    const overRawCollection = singleChartFixture();
    const rawNote = structuredClone(overRawCollection.researchNotes[0]);
    overRawCollection.researchNotes = Array.from(
      { length: limits.builderInputCollections.researchNotes + 1 },
      () => structuredClone(rawNote)
    );
    await expect(buildSingleChartResearchReport(overRawCollection, { anonymized: false }))
      .rejects.toThrow(/研究笔记集合超过当前单盘报告展示容量/);

    const overRawProvenance = singleChartFixture();
    const rawProvenance = structuredClone(overRawProvenance.revision.facts.fieldProvenance[0]);
    if (!rawProvenance) throw new Error("测试夹具缺少原始 provenance");
    overRawProvenance.revision.facts.fieldProvenance = Array.from(
      { length: limits.builderInputCollections.provenance + 1 },
      () => structuredClone(rawProvenance)
    );
    await expect(buildSingleChartResearchReport(overRawProvenance, { anonymized: false }))
      .rejects.toThrow(/字段 provenance 集合超过当前单盘报告展示容量/);
  });

  it("在 whole-report aggregate 边界按 Unicode code point 精确计数，并在完整性校验前拒绝聚合输入且不回显 canary", async () => {
    const limits = SINGLE_CHART_REPORT_PRESENTATION_LIMITS;
    const exact = structuredClone(
      await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false })
    );
    const codePointCount = (value: string) => {
      let count = 0;
      for (const _character of value) count += 1;
      return count;
    };
    const aggregateCodePointCount = (value: unknown) => {
      let count = 0;
      const pending: unknown[] = [value];
      while (pending.length > 0) {
        const candidate = pending.pop();
        if (typeof candidate === "string") {
          count += codePointCount(candidate);
        } else if (candidate !== null && typeof candidate === "object") {
          pending.push(...Object.values(candidate));
        }
      }
      return count;
    };
    const slots: Array<{ record: Record<string, string>; key: string }> = [
      ...exact.provenance.map((item) => ({
        record: item as unknown as Record<string, string>,
        key: "note"
      })),
      ...exact.researchNotes.map((item) => ({
        record: item as unknown as Record<string, string>,
        key: "body"
      })),
      ...exact.events.map((item) => ({
        record: item as unknown as Record<string, string>,
        key: "body"
      })),
      ...exact.citations.flatMap((item) => ["quote", "annotation", "decisionNote"].map((key) => ({
        record: item as unknown as Record<string, string>,
        key
      })))
    ];
    let aggregateCount = aggregateCodePointCount(exact);
    for (const slot of slots) {
      const currentValue = slot.record[slot.key]!;
      const available = limits.bodyCharacters - codePointCount(currentValue);
      const addition = Math.min(available, limits.aggregateCodePoints - aggregateCount);
      if (addition > 0) {
        slot.record[slot.key] = `${currentValue}${"𠀀".repeat(addition)}`;
        aggregateCount += addition;
      }
      if (aggregateCount === limits.aggregateCodePoints) break;
    }
    expect(aggregateCount).toBe(limits.aggregateCodePoints);
    expect(singleChartResearchReportSchema.safeParse(exact).success).toBe(true);
    expect(() => exportSingleChartResearchMarkdown(exact)).toThrow(
      /必须由当前模块构建或结合原始输入重新校验/
    );

    const canary = "PRIVATE-REPORT-AGGREGATE-CANARY-4811";
    const over = structuredClone(exact);
    over.subtitle += canary;
    let reportError: unknown;
    try {
      singleChartResearchReportSchema.parse(over);
    } catch (cause) {
      reportError = cause;
    }
    expect(reportError).toBeInstanceOf(Error);
    expect(String(reportError)).toMatch(/aggregate 文本超过 1000000 Unicode code points/);
    expect(String(reportError)).not.toContain(canary);

    const overBuilderInput = singleChartFixture();
    const provenanceSeed = structuredClone(overBuilderInput.revision.facts.fieldProvenance[0]);
    if (!provenanceSeed) throw new Error("测试夹具缺少原始 provenance");
    const builderCanary = "PRIVATE-BUILDER-AGGREGATE-CANARY-4812";
    const builderCanaryLength = codePointCount(builderCanary);
    overBuilderInput.revision.facts.fieldProvenance = Array.from({ length: 43 }, (_, index) => ({
      ...structuredClone(provenanceSeed),
      note: index === 0
        ? `${builderCanary}${"𠀀".repeat(limits.bodyCharacters - builderCanaryLength)}`
        : "𠀀".repeat(limits.bodyCharacters)
    }));
    let builderError: unknown;
    try {
      await buildSingleChartResearchReport(overBuilderInput, { anonymized: false });
    } catch (cause) {
      builderError = cause;
    }
    expect(builderError).toBeInstanceOf(Error);
    expect(String(builderError)).toMatch(/aggregate 输入文本超过 1000000 Unicode code points/);
    expect(String(builderError)).not.toContain(builderCanary);
  });

  it("单盘 Markdown 与视觉报告共享同一模型和引用状态", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const markdown = exportSingleChartResearchMarkdown(report);

    expect(markdown.suggestedFileName).toBe("hakimi-chart-r1-full.md");
    expect(markdown.content.startsWith([
      "---",
      "schemaVersion: \"1.0.0\"",
      "formatVersion: \"1.7.0\"",
      "kind: \"single_chart_research_report\"",
      "format: \"markdown\"",
      "anonymized: false",
      "---"
    ].join("\n"))).toBe(true);
    expect(markdown.content).toContain("第 1 版 · 历史修订");
    expect(markdown.content).toContain("| 日柱 |");
    expect(markdown.content).toContain("旬");
    expect(markdown.content).toContain("文献：合成报告资料");
    expect(markdown.content).toContain("版本：本地测试版");
    expect(markdown.content).toContain("用户候选");
    expect(markdown.content).toContain("权利状态：user\\_unverified");
    expect(markdown.content).toContain("作品状态：unknown");
    expect(markdown.content).toContain("版本状态：unknown");
    expect(markdown.content).toContain("分发策略：local\\_private\\_only");
  });

  it("Markdown document Schema 按 UTF-8 bytes 接受精确边界、拒绝超限且不回显 canary", async () => {
    const full = exportSingleChartResearchMarkdown(
      await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false })
    );
    const anonymous = exportSingleChartResearchMarkdown(
      await buildSingleChartResearchReport(singleChartFixture())
    );
    expect(singleChartMarkdownDocumentSchema.safeParse(full).success).toBe(true);
    expect(singleChartMarkdownDocumentSchema.safeParse(anonymous).success).toBe(true);

    const byteLimit = SINGLE_CHART_REPORT_PRESENTATION_LIMITS.markdownUtf8Bytes;
    const exactContent = `${"𠀀".repeat(Math.floor(byteLimit / 4))}${"a".repeat(byteLimit % 4)}`;
    const exact = { ...full, content: exactContent };
    expect(singleChartMarkdownDocumentSchema.safeParse(exact).success).toBe(true);

    const canary = "PRIVATE-MARKDOWN-BYTE-CANARY-4813";
    let markdownError: unknown;
    try {
      singleChartMarkdownDocumentSchema.parse({ ...exact, content: `${exactContent}${canary}` });
    } catch (cause) {
      markdownError = cause;
    }
    expect(markdownError).toBeInstanceOf(Error);
    expect(String(markdownError)).toMatch(/UTF-8 正文超过 8388608 bytes/);
    expect(String(markdownError)).not.toContain(canary);
  });

  it("完整 Markdown 保留记录映射与来源权利审计字段，匿名 Markdown 零泄漏", async () => {
    const input = singleChartFixture();
    const note = input.researchNotes[0];
    const event = input.events[0];
    const citation = input.citations[0];
    const document = input.knowledgeDocuments[0];
    const rights = input.sourceRights[0];
    if (!note || !event || !citation || !document || !rights) throw new Error("单盘审计测试夹具不完整");

    const sentinels = {
      noteSource: "NOTE-SOURCE-SENTINEL-3401",
      eventSource: "EVENT-SOURCE-SENTINEL-3402",
      author: "AUTHOR-SENTINEL-3403",
      edition: "EDITION-SENTINEL-3404",
      publisher: "PUBLISHER-SENTINEL-3405",
      sourceUrl: "https://example.test/SOURCE-URL-SENTINEL-3406",
      annotation: "ANNOTATION-SENTINEL-3407",
      decisionNote: "DECISION-SENTINEL-3408"
    } as const;
    note.sourceRefs = [sentinels.noteSource];
    event.sourceRefs = [sentinels.eventSource];
    document.author = sentinels.author;
    document.edition = sentinels.edition;
    rights.source.publisher = sentinels.publisher;
    rights.source.publicationYear = 2099;
    rights.source.sourceUrl = sentinels.sourceUrl;
    citation.annotation = sentinels.annotation;
    citation.decisionNote = sentinels.decisionNote;
    citation.reviewAttestations = [{
      reviewerId: "reviewer-sentinel-3409",
      reviewedAt: "2026-07-01T01:00:00.000Z",
      note: "synthetic audit attestation"
    }];

    const full = exportSingleChartResearchMarkdown(
      await buildSingleChartResearchReport(input, { anonymized: false })
    ).content;
    const anonymous = exportSingleChartResearchMarkdown(
      await buildSingleChartResearchReport(input)
    ).content;

    expect(full).toContain(`- 记录标识：${NOTE_EARLY_ID}`);
    expect(full).toContain(`- Event ID：${EVENT_EARLY_ID}`);
    expect(full).toContain(`- Event ID：${EVENT_UNKNOWN_ID}`);
    for (const sentinel of Object.values(sentinels)) expect(full).toContain(sentinel);
    for (const expected of [
      `正文哈希：${DOCUMENT_HASH}`,
      "权利状态：user\\_unverified",
      "作品状态：unknown",
      "版本状态：unknown",
      "分发策略：local\\_private\\_only",
      "复核状态：unreviewed",
      "复核人数：1",
      "出版信息：PUBLISHER-SENTINEL-3405 / 2099"
    ]) expect(full).toContain(expected);
    expect(full).not.toContain("reviewer-sentinel-3409");

    expect(anonymous.startsWith([
      "---",
      "schemaVersion: \"1.0.0\"",
      "formatVersion: \"1.7.0\"",
      "kind: \"single_chart_research_report\"",
      "format: \"markdown\"",
      "anonymized: true",
      "---"
    ].join("\n"))).toBe(true);
    for (const sensitive of [
      ...Object.values(sentinels),
      NOTE_EARLY_ID,
      EVENT_EARLY_ID,
      EVENT_UNKNOWN_ID,
      DOCUMENT_HASH,
      "user_unverified",
      "local_private_only"
    ]) expect(anonymous).not.toContain(sensitive);
    expect(anonymous).not.toContain("出版信息：");
    expect(anonymous).not.toContain("复核人数：");
  });

  it("完整模式输出 Event 新 ID 时间迁移血缘，匿名模式整段移除", async () => {
    const input = await singleChartFixtureWithCalendarMigration();
    const receipt = input.eventTimeMigrationReceipts[0];
    if (!receipt) throw new Error("测试夹具缺少迁移凭证");

    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    expect(report.formatVersion).toBe("1.7.0");
    expect(report.eventTimeDerivations).toEqual([expect.objectContaining({
      reference: receipt.id,
      authorization: "explicit_local_user_confirmation",
      sourceReference: receipt.source.recordId,
      targetReference: receipt.target.recordId,
      sourceSnapshotDigest: receipt.source.snapshotDigest,
      targetSnapshotDigest: receipt.target.snapshotDigest
    })]);
    expect(report.eventTimeDerivations[0]?.lineage).toContainEqual({ label: "日期精度", value: "unknown" });
    expect(report.eventTimeDerivations[0]?.interpretation).toContainEqual({
      label: "时间说明",
      value: "日历精度：时区、DST 与规范 UTC 不适用。"
    });
    const markdown = exportSingleChartResearchMarkdown(report).content;
    expect(markdown).toContain("## 事件时间迁移血缘");
    expect(markdown).toContain(receipt.source.snapshotDigest);
    expect(markdown).toContain(receipt.target.recordId);

    const anonymous = await buildSingleChartResearchReport(input);
    expect(anonymous.eventTimeDerivations).toEqual([]);
    expect(JSON.stringify(anonymous)).not.toContain(receipt.id);
    expect(JSON.stringify(anonymous)).not.toContain(receipt.source.snapshotDigest);
  });

  it("单盘 stored receipt 在官方 retained 工件 exact replay 后才输出 UTC 与偏移", async () => {
    const input = await singleChartFixtureWithRetainedMinuteMigration();
    const receipt = input.eventTimeMigrationReceipts[0];
    if (!receipt) throw new Error("测试夹具缺少 retained 迁移凭证");

    const report = await buildSingleChartResearchReport(input, { anonymized: false });
    const retainedEvent = report.events.find((event) => event.reference === receipt.target.recordId);
    expect(retainedEvent?.meta).toContainEqual({
      label: "TZDB",
      value: RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId
    });
    expect(retainedEvent?.meta).toContainEqual({ label: "起始 UTC 偏移", value: "+01:00" });
    expect(retainedEvent?.meta).toContainEqual({ label: "起始规范 UTC", value: "2026-10-01T11:00:00Z" });
    expect(report.eventTimeDerivations).toEqual([expect.objectContaining({
      reference: receipt.id,
      targetReference: receipt.target.recordId,
      interpretation: expect.arrayContaining([
        { label: "TZDB", value: RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId },
        { label: "起始 UTC 偏移", value: "+01:00" },
        { label: "起始规范 UTC", value: "2026-10-01T11:00:00Z" }
      ])
    })]);
  });

  it("拒绝端点不在当前单盘、冻结快照与 Event 不一致或摘要伪造的迁移凭证", async () => {
    const orphan = await singleChartFixtureWithCalendarMigration();
    orphan.events = orphan.events.filter((event) => event.id !== orphan.eventTimeMigrationReceipts[0]?.target.recordId);
    await expect(buildSingleChartResearchReport(orphan, { anonymized: false })).rejects.toThrow(/源与目标必须同时属于当前单盘/);

    const mismatched = await singleChartFixtureWithCalendarMigration();
    const receipt = mismatched.eventTimeMigrationReceipts[0];
    if (!receipt) throw new Error("测试夹具缺少迁移凭证");
    receipt.source.snapshot.caseId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    receipt.target.snapshot.caseId = receipt.source.snapshot.caseId;
    await expect(buildSingleChartResearchReport(mismatched, { anonymized: false })).rejects.toThrow(/冻结快照与当前 Event 时间血缘不一致/);

    const forgedDigest = await singleChartFixtureWithCalendarMigration();
    const forgedReceipt = forgedDigest.eventTimeMigrationReceipts[0];
    if (!forgedReceipt) throw new Error("测试夹具缺少迁移凭证");
    forgedReceipt.source.snapshotDigest = "e".repeat(64);
    await expect(buildSingleChartResearchReport(forgedDigest, { anonymized: false })).rejects.toThrow(/冻结快照摘要与快照正文不一致/);
  });

  it("锁定 v1.7 新机械准入投影，并保留冻结的 v1.0-v1.6 语义契约", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const markdown = exportSingleChartResearchMarkdown(report);
    const projection = {
      schemaVersion: report.schemaVersion,
      formatVersion: report.formatVersion,
      kind: report.kind,
      title: report.title,
      revisionLabel: report.revisionLabel,
      interpretationEvidenceSha256: await sha256Hex(report.interpretationEvidence),
      pillars: report.pillars.map((pillar) => ({
        key: pillar.key,
        label: pillar.label,
        ganZhi: pillar.ganZhi,
        xun: pillar.xun,
        voidBranches: pillar.voidBranches
      })),
      rowLabels: {
        case: report.caseRows.map((row) => row.label),
        birth: report.birthRows.map((row) => row.label),
        calibration: report.calibrationRows.map((row) => row.label),
        rules: report.ruleRows.map((row) => row.label),
        integrity: report.integrityRows.map((row) => row.label)
      },
      calculationSource: {
        natalSource: report.calculationSource.natalSource,
        downstreamSource: report.calculationSource.downstreamSource,
        receiptLedgerStatus: report.calculationSource.receiptLedgerStatus,
        storedHistoricalOutputCompared: report.calculationSource.storedHistoricalOutputCompared,
        comparisonStatus: report.calculationSource.comparisonStatus,
        profileId: report.calculationSource.profileId,
        expertEvidenceStatus: report.calculationSource.expertEvidenceStatus,
        components: report.calculationSource.components.map((component) => ({
          key: component.key,
          label: component.label,
          status: component.status,
          executorId: component.executorId
        }))
      },
      interpretationEvidence: {
        status: report.interpretationEvidence.status,
        reason: report.interpretationEvidence.reason,
        scope: report.interpretationEvidence.scope,
        includeHour: report.interpretationEvidence.includeHour,
        envelopeProfileVersion: report.interpretationEvidence.envelopeProfileVersion,
        envelopeContentVersion: report.interpretationEvidence.envelopeContentVersion,
        sourceRegistry: report.interpretationEvidence.sourceRegistry,
        statementSequence: report.interpretationEvidence.statements.map((statement) => [
          statement.order,
          statement.statementId,
          statement.kind,
          statement.classification,
          statement.displayStatus,
          statement.sourceLocatorCoverage,
          statement.registryLocatorVerifiedBindingIds.length,
          statement.exactCanonicalRendererMatch
        ].join("|")),
        statementEvidence: report.interpretationEvidence.statements.map((statement) => ({
          order: statement.order,
          statementId: statement.statementId,
          text: statement.text,
          rationale: statement.rationale,
          factIds: statement.factIds,
          ruleIds: statement.ruleIds,
          sourceBindingIds: statement.sourceBindingIds,
          registryLocatorVerifiedBindingIds: statement.registryLocatorVerifiedBindingIds
        })),
        assertionFamilies: report.interpretationEvidence.assertionFamilies,
        coverage: report.interpretationEvidence.coverage,
        admissionSummary: report.interpretationEvidence.admissionSummary,
        sourceSequence: report.interpretationEvidence.sources.map((source) => [
          source.order,
          source.sourceId,
          source.sourceType,
          source.title,
          source.editionOrCarrier,
          source.url,
          source.stableRevision ?? "null",
          source.registryVerificationStatus,
          source.workRightsStatus,
          source.carrierRightsStatus,
          source.sourceRightsRecordStatus,
          source.expertTruthClaimed,
          source.scientificValidityClaimed,
          source.usageBoundary
        ].join("|")),
        sourceBindingSequence: report.interpretationEvidence.sourceBindings.map((binding) => [
          binding.order,
          binding.bindingId,
          binding.evidenceSubjectId,
          binding.sourceId,
          binding.sourceType,
          binding.evidenceRole,
          binding.locator.kind,
          binding.locator.value,
          binding.locator.registryVerificationStatus,
          binding.locator.verificationScope,
          binding.locator.contentSha256 ?? "null",
          binding.parameterSupport,
          binding.supports,
          binding.doesNotSupport.join("；"),
          JSON.stringify(binding.mechanicalAdmission)
        ].join("|")),
        boundary: report.interpretationEvidence.boundary
      },
      counts: {
        provenance: report.provenance.length,
        researchNotes: report.researchNotes.length,
        events: report.events.length,
        eventTimeDerivations: report.eventTimeDerivations.length,
        citations: report.citations.length
      },
      events: report.events.map((item) => ({
        reference: item.reference,
        timeRows: item.meta.filter((row) => [
          "时间上下文",
          "时间说明",
          "IANA 时区",
          "TZDB",
          "起始 DST 解析",
          "起始 UTC 偏移",
          "起始规范 UTC",
          "结束 DST 解析",
          "结束 UTC 偏移",
          "结束规范 UTC"
        ].includes(row.label))
      })),
      citation: report.citations.map((item) => ({
        status: item.status,
        targets: item.targets,
        locator: item.locator,
        documentReference: item.source.documentReference,
        distributionPolicy: item.source.distributionPolicy,
        reviewStatus: item.source.reviewStatus
      })),
      markdown: {
        suggestedFileName: markdown.suggestedFileName,
        mimeType: markdown.mimeType,
        frontMatter: markdown.content.split("\n").slice(0, 7),
        headings: markdown.content.split("\n").filter((line) => line.startsWith("## "))
      }
    };
    const frozenV10 = JSON.parse(readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.json"),
      "utf8"
    ));
    const frozenV11 = JSON.parse(readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.1.json"),
      "utf8"
    ));
    const frozenV12 = JSON.parse(readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.2.json"),
      "utf8"
    ));
    const frozenV13 = JSON.parse(readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.3.json"),
      "utf8"
    ));
    const frozenV14 = JSON.parse(readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.4.json"),
      "utf8"
    ));
    const frozenV15Text = readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.5.json"),
      "utf8"
    );
    const frozenV15 = JSON.parse(frozenV15Text);
    const frozenV16Text = readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.6.json"),
      "utf8"
    );
    const frozenV16 = JSON.parse(frozenV16Text);
    const frozenV17Text = readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.7.json"),
      "utf8"
    );
    const frozenV17 = JSON.parse(frozenV17Text);
    expect(frozenV10.formatVersion).toBe("1.0.0");
    expect(frozenV10).not.toHaveProperty("events");
    expect(frozenV11.formatVersion).toBe("1.1.0");
    expect(frozenV11.rowLabels.rules).not.toContain("规则包 packDigest");
    expect(frozenV12.formatVersion).toBe("1.2.0");
    expect(frozenV12).not.toHaveProperty("eventTimeDerivations");
    expect(frozenV13.formatVersion).toBe("1.3.0");
    expect(frozenV13).not.toHaveProperty("calculationSource");
    expect(frozenV14.formatVersion).toBe("1.4.0");
    expect(frozenV14).not.toHaveProperty("interpretationEvidence");
    expect(await sha256Hex(frozenV15Text)).toBe("c14b0b5a988a9da9d633c560e0c1e938989349495ea53a6b0f8df60519223d7d");
    expect(frozenV15.formatVersion).toBe("1.5.0");
    expect(frozenV15.interpretationEvidence).not.toHaveProperty("sources");
    expect(await sha256Hex(frozenV16Text)).toBe("f8202a316fdc4c3917134d690f52ae3ac602a5c54ddda19e883f67fffb049db0");
    expect(frozenV16.formatVersion).toBe("1.6.0");
    expect(frozenV16.interpretationEvidence).not.toHaveProperty("admissionSummary");
    expect(frozenV16.interpretationEvidence.boundary).not.toHaveProperty(
      "citationTargetEstablishesSourceIdentity"
    );
    expect(frozenV16.interpretationEvidence.boundary).not.toHaveProperty("admissionLedgerCopiesSourceText");
    expect(await sha256Hex(frozenV17Text)).toBe("aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29");
    expect(frozenV17.formatVersion).toBe("1.7.0");
    expect(projection).toEqual(frozenV17);

    expect(projection.formatVersion).toBe("1.7.0");
    expect(projection.pillars).toEqual(frozenV16.pillars);
    expect(projection.rowLabels).toEqual(frozenV16.rowLabels);
    expect(projection.calculationSource).toEqual(frozenV16.calculationSource);
    expect(projection.interpretationEvidence.statementSequence)
      .toEqual(frozenV16.interpretationEvidence.statementSequence);
    expect(projection.interpretationEvidence.statementEvidence)
      .toEqual(frozenV16.interpretationEvidence.statementEvidence);
    expect(projection.interpretationEvidence.assertionFamilies)
      .toEqual(frozenV16.interpretationEvidence.assertionFamilies);
    expect(projection.counts).toEqual(frozenV16.counts);
    expect(projection.events).toEqual(frozenV16.events);
    expect(projection.citation.map(({ documentReference: _documentReference, ...citation }) => citation))
      .toEqual(frozenV16.citation);
    expect(projection.citation.map((citation) => citation.documentReference)).toEqual(["D1"]);
    expect(projection.markdown).toMatchObject({
      suggestedFileName: frozenV16.markdown.suggestedFileName,
      mimeType: frozenV16.markdown.mimeType,
      headings: frozenV16.markdown.headings,
      frontMatter: [
        "---",
        "schemaVersion: \"1.0.0\"",
        "formatVersion: \"1.7.0\"",
        "kind: \"single_chart_research_report\"",
        "format: \"markdown\"",
        "anonymized: false",
        "---"
      ]
    });
    expect(projection.interpretationEvidence.coverage).toEqual({
      statementsTotal: 27,
      displayable: 16,
      withheld: 11,
      assertionFamilies: 7,
      referencedSourceBindings: 12,
      registryLocatorVerifiedBindings: 10,
      referencedSources: 8,
      pinnedRevisionSources: 7,
      sourceTextsIncluded: 0
    });
    expect(projection.interpretationEvidence.admissionSummary).toMatchObject({
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsTotal: 12,
      bindingsWithNonRejectedCitation: 0,
      bindingsWithVerifiedCitation: 0,
      bindingsWithRedistributableVerifiedCitation: 0,
      citationRecords: { matching: 0, structured: 0, candidate: 0, verified: 0, rejected: 0 },
      sourceTextCopiedIntoAdmissionLedger: false,
      structuredCitationCoverage: "none",
      distributionRightsState: "no_matching_source_text"
    });
    expect(projection.interpretationEvidence.sourceSequence.every((entry) => (
      entry.includes("|binding_scoped|")
    ))).toBe(true);
    expect(projection.interpretationEvidence.sourceBindingSequence.every((entry) => (
      entry.includes("|bazi.strength.binding.")
      && entry.includes('"sourceIdentityStatus":"not_assessed"')
      && entry.includes('"citationReviewState":"no_citation"')
    ))).toBe(true);
    expect(projection.interpretationEvidence.boundary).toMatchObject({
      citationTargetEstablishesSourceIdentity: false,
      admissionLedgerCopiesSourceText: false,
      citationReviewEstablishesSemanticTruth: false,
      rightsReviewEstablishesSemanticTruth: false
    });
  });

  it("mixed valid subject 不能掩盖后置未知保留证据主题", async () => {
    const unknownReservedSubjectIds = [
      "bazi.pillar.day.unknown.v1",
      "bazi.strength.binding.unknown.v1"
    ] as const;
    for (const subjectId of unknownReservedSubjectIds) {
      const targets: CitationRecord["targets"] = [
        { kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" },
        { kind: "evidence_subject", subjectId }
      ];
      const input = singleChartFixture();
      input.citations[0]!.targets = targets;
      input.citations[0]!.targetKeys = citationTargetKeys(targets);
      await expect(buildSingleChartResearchReport(input, { anonymized: false }))
        .rejects.toThrow(/未知的保留证据主题/u);
    }
  });

  it("builder 拒绝当前 Revision 不存在的 chart_field，mixed target 也不能掩盖无效字段", async () => {
    const invalidChartField = {
      kind: "chart_field" as const,
      caseId: CASE_ID,
      revisionId: REVISION_1_ID,
      field: "pillars.day.nonexistentField"
    };
    const targetSets: CitationRecord["targets"][] = [
      [invalidChartField],
      [
        { kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" },
        { kind: "chart_field", caseId: CASE_ID, revisionId: REVISION_1_ID, field: "pillars.day.ganZhi" },
        invalidChartField
      ]
    ];
    for (const targets of targetSets) {
      const input = singleChartFixture();
      input.citations[0]!.targets = targets;
      input.citations[0]!.targetKeys = citationTargetKeys(targets);
      await expect(buildSingleChartResearchReport(input, { anonymized: false }))
        .rejects.toThrow(/当前 Revision 中不存在的命盘字段/u);
    }
  });

  it("拒绝混入其他修订资料或正文哈希失配的引用", async () => {
    const unrelated = singleChartFixture();
    unrelated.researchNotes = [fixture.researchNotes[0]];
    await expect(buildSingleChartResearchReport(unrelated, { anonymized: false })).rejects.toThrow(/不属于当前单盘/);

    const mismatched = singleChartFixture();
    mismatched.citations = [{ ...mismatched.citations[0], documentContentHash: "b".repeat(64) }];
    await expect(buildSingleChartResearchReport(mismatched, { anonymized: false })).rejects.toThrow(/资料摘要已失配/);
  });
});
