import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart, digestRuleProfile } from "@hakimi/bazi-core";
import { sha256Hex } from "@hakimi/integrity";
import { resolveEventTimeContext } from "@hakimi/time-core";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  createRevisionCalculationReceipt
} from "@hakimi/revision-replay";
import {
  buildCalculatedChartHashPayload,
  type BirthInput,
  type CaseRecord,
  type CitationRecord,
  type EventRecord,
  type EventTimeMigrationReceipt,
  type KnowledgeDocumentRecord,
  type ResearchNoteRecord,
  type RevisionRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  REIDENTIFICATION_WARNING,
  buildSingleChartResearchReport,
  encodeCsvCell,
  exportResearchCsv,
  exportResearchMarkdown,
  exportSingleChartResearchMarkdown,
  type ResearchExportInput,
  type SingleChartReportInput
} from "./index";

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
});

const DOCUMENT_ID = "88888888-8888-4888-8888-888888888888";
const CITATION_ID = "99999999-9999-4999-8999-999999999999";
const DOCUMENT_HASH = "a".repeat(64);

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
    expect(report.citations[0].statusLabel).toBe("用户候选");
    expect(report.citations[0].source.distributionPolicy).toBe("local_private_only");
    expect(report.citations[0].source.reviewStatus).toBe("unreviewed");
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
    provenance.field = sentinel;
    provenance.algorithmId = sentinel;
    provenance.sourceRefs = [sentinel];
    provenance.note = sentinel;
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

  it("单盘 Markdown 与视觉报告共享同一模型和引用状态", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const markdown = exportSingleChartResearchMarkdown(report);

    expect(markdown.suggestedFileName).toBe("hakimi-chart-r1-full.md");
    expect(markdown.content.startsWith([
      "---",
      "schemaVersion: \"1.0.0\"",
      "formatVersion: \"1.4.0\"",
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
      "formatVersion: \"1.4.0\"",
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
    expect(report.formatVersion).toBe("1.4.0");
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

  it("与 v1.4 单盘报告语义黄金文件保持一致，并保留冻结的 v1.0-v1.3 契约", async () => {
    const report = await buildSingleChartResearchReport(singleChartFixture(), { anonymized: false });
    const markdown = exportSingleChartResearchMarkdown(report);
    const projection = {
      schemaVersion: report.schemaVersion,
      formatVersion: report.formatVersion,
      kind: report.kind,
      title: report.title,
      revisionLabel: report.revisionLabel,
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
    const golden = JSON.parse(readFileSync(
      resolve(process.cwd(), "packages/research-export/src/golden/single-chart-report.contract.v1.4.json"),
      "utf8"
    ));
    expect(frozenV10.formatVersion).toBe("1.0.0");
    expect(frozenV10).not.toHaveProperty("events");
    expect(frozenV11.formatVersion).toBe("1.1.0");
    expect(frozenV11.rowLabels.rules).not.toContain("规则包 packDigest");
    expect(frozenV12.formatVersion).toBe("1.2.0");
    expect(frozenV12).not.toHaveProperty("eventTimeDerivations");
    expect(frozenV13.formatVersion).toBe("1.3.0");
    expect(frozenV13).not.toHaveProperty("calculationSource");
    expect(projection).toEqual(golden);
  });

  it("拒绝混入其他修订资料或正文哈希失配的引用", async () => {
    const unrelated = singleChartFixture();
    unrelated.researchNotes = [fixture.researchNotes[0]];
    await expect(buildSingleChartResearchReport(unrelated, { anonymized: false })).rejects.toThrow(/不属于当前单盘/);

    const mismatched = singleChartFixture();
    mismatched.citations = [{ ...mismatched.citations[0], documentContentHash: "b".repeat(64) }];
    await expect(buildSingleChartResearchReport(mismatched, { anonymized: false })).rejects.toThrow(/Citation 正文哈希失配/);
  });
});
