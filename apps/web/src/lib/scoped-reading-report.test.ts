import { describe, expect, it } from "vitest";
import legacyScopedRecord from "../test/fixtures/scoped-reading-plain-012.json";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { syntheticReviewIndex } from "../test/reading-case-review-fixture";
import type { ReadingConclusion, ReadingExplanationIndex, ReadingExplanationQuery } from "./reading-explanation-index";
import { appendReadingExplanationIndex, buildReadingExplanationIndex } from "./reading-explanation-index";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildAnnualDomainReading, ANNUAL_DOMAIN_READING_VERSION } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { prepareKeyMonthYear } from "./key-month-event-source";
import { attachReadingMonthHeadline, bindReadingMonthHeadline, buildReadingMonthPreview } from "./reading-month-preview";
import { buildPlainReadingSummary } from "./reading-plain-summary";
import { decodeReadingReportBundle, encodeReadingReportBundle, ReadingReportCapacityError } from "./local-reading-report-bundle";
import { isPackedReadingSnapshot, packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { buildScopedReadingReport, decodeScopedReadingReport, describeScopedReadingScope, encodeScopedReadingReport,
  isScopedReadingReport, SCOPED_READING_REPORT_MARKER, type ScopedReadingReport } from "./scoped-reading-report";

const natalScope: ReadingConclusion["scope"] = { level: "natal", year: null, branchId: null, startInstant: null, endExclusiveInstant: null };
const reportId = "33333333-3333-4333-8333-333333333333", saveAttemptId = "44444444-4444-4444-8444-444444444444";
const createdAt = "2026-10-29T12:00:00.000Z";
const versions = ["hakimi.plain-ten-year-reading/0.4.1", "hakimi.concrete-period-prose/0.4.2", "hakimi.conditional-content-rules/0.1.0"];
function fixture(): ReadingExplanationIndex {
  const index = syntheticReviewIndex();
  index.sourceSnapshot.includeHour = true;
  index.sourceSnapshot.input.time = "11:42";
  index.sourceSnapshot.input.timePrecision = "exact_minute";
  index.sourceSnapshot.sourceVersions = [...versions];
  index.uncertainty.inputPrecision = "exact_minute";
  index.uncertainty.pillarStatus = "not_assessed";
  const base = index.conclusions[0]!;
  const item = (key: string, domain: ReadingConclusion["domain"], scope: ReadingConclusion["scope"], wording: string): ReadingConclusion => ({
    ...structuredClone(base), stableId: `${index.sourceSnapshot.revisionId}/${key}`, domain, scope, label: key,
    text: wording, sourceVersions: [...versions], evidence: { facts: ["此条原事实"], ruleApplications: [], support: ["此条原支持"],
      limits: ["这不是事件保证。"], unknowns: ["实际处境未确认。"], citations: [] }
  });
  index.conclusions = [
    item("natal:pattern", "natal", { ...natalScope }, "本命结构原文。\r\n原句 🌿 e\u0301\n<script>字面文本</script>"),
    item("natal:career", "career", { ...natalScope }, "本命事业原文。"),
    item("natal:wealth", "wealth", { ...natalScope }, "本命收入原文。"),
    item("year:forward:2027:career-a", "career", { level: "year", year: 2027, branchId: "forward", startInstant: "2027-02-04T00:00:00.000Z", endExclusiveInstant: "2027-07-01T00:00:00.000Z" }, "当年交运前事业原文。"),
    item("year:forward:2027:career-b", "career", { level: "year", year: 2027, branchId: "forward", startInstant: "2027-07-01T00:00:00.000Z", endExclusiveInstant: "2028-02-04T00:00:00.000Z" }, "当年交运后事业原文。"),
    item("year:backward:2027:career", "career", { ...base.scope, branchId: "backward" }, "另一分支事业原文。"),
    item("month:forward:2027:period-a:wealth", "wealth", { level: "month", year: 2027, branchId: "forward", startInstant: "2027-02-04T00:00:00.000Z", endExclusiveInstant: "2027-03-06T00:00:00.000Z" }, "原约定款项需要核对\n\n这是该月完整原文，只有实际约定存在时适用。"),
    item("month:forward:2027:period-b:wealth", "wealth", { level: "month", year: 2027, branchId: "forward", startInstant: "2027-03-06T00:00:00.000Z", endExclusiveInstant: "2027-04-05T00:00:00.000Z" }, "下一月份原文，不得借用。")
  ];
  const selected = index.conclusions[1]!;
  selected.evidence.citations = ["own-source"];
  selected.evidence.ruleApplications = [{ ruleId: "own-rule", title: "原规则", decision: "原决定", support: ["原支持"], limitations: ["该条原条件"],
    sourceIds: ["rule-only-source"], sourceSubjects: ["source-subject"] }];
  index.sources = ["own-source", "rule-only-source", "unrelated-source"].map(id => ({ id, title: id, url: "https://example.test/source", locator: "原定位", excerpt: `原引用 ${id}`, interpretation: "本地解释" }));
  index.citationBindings = [{ conclusionId: selected.stableId, sourceId: "own-source", producerField: "source", usageNote: "此条原关联" }];
  const month = index.conclusions[6]!;
  attachReadingMonthHeadline(month, bindReadingMonthHeadline({ key: month.stableId.slice(index.sourceSnapshot.revisionId.length + 1), scope: month.scope,
    domain: month.domain, title: "收入与开支", headline: "原约定款项需要核对", sourceSubjects: month.sourceSubjects, producerVersion: versions[0]! }));
  return index;
}
const build = (index = fixture(), query: ReadingExplanationQuery = { topic: "summary" }) => buildScopedReadingReport({ index, query, reportId, saveAttemptId, createdAt });
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
const sha = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, "0")).join("");
function envelope(value: string): any { return JSON.parse(value.slice(SCOPED_READING_REPORT_MARKER.length + 1)); }
function wire(value: unknown): string { return `${SCOPED_READING_REPORT_MARKER}\n${JSON.stringify(value)}`; }
async function resign(value: any): Promise<string> {
  for (const part of Object.values(value.parts) as any[]) { part.utf8Bytes = bytes(part.text); part.sha256 = await sha(part.text); }
  const { sha256: _sha256, ...body } = value;
  value.sha256 = await sha(JSON.stringify(body));
  return wire(value);
}

describe("current scoped reading selection and frozen presentation", () => {
  it("preserves an actual synthetic 0.1.2 saved record byte-exactly after the 0.1.3 condition correction", async () => {
    const captured = structuredClone(legacyScopedRecord);
    const stored = captured.record.body as string;
    const raw = await unpackReadingSnapshot(stored);
    const decoded = await decodeScopedReadingReport(raw);
    expect(decoded!.source.presentationVersion).toBe("hakimi.plain-summary/0.1.2");
    expect(decoded!.presentations.every(item => item.kind !== "plain_summary" || item.literal.contentVersion === "hakimi.plain-summary/0.1.2")).toBe(true);
    expect(await encodeScopedReadingReport(decoded!)).toBe(raw);
    expect(captured.record.body).toBe(stored);
    const mismatched = structuredClone(decoded!);
    mismatched.source.presentationVersion = "hakimi.plain-summary/0.1.3";
    await expect(encodeScopedReadingReport(mismatched)).rejects.toThrow();
  });
  it("saves real producer summary/year/month scopes from a partially prepared current index without preparing the other nine years of months", async () => {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1990-12-19", time: "11:42",
      timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
      location: { label: "合成范围保存Q07", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
      caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-29T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
    const annual = await buildLocalAnnualOutlookRange(revision, assessment, 2026, 2035);
    const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
      includeHour: assessment.sourceBinding.includeHour, startYear: 2026, endYear: 2035,
      years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) };
    const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
    const annualLifeStories = buildReadingAnnualLifeStories({ revision, assessment, annual, annualDomains, annualEvents });
    const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, annual });
    const keyMonthYears = [await prepareKeyMonthYear({ revision, assessment, annual, annualDomains, annualEvents, annualLifeStories }, 2028, [])];
    const brief = buildBriefReadingReport(assessment, annual, { sourceRevision: revision, comprehensive, synthesis,
      annualDomains, annualEvents, annualLifeStories, keyMonthYears })!;
    const index = buildReadingExplanationIndex({ revision, assessment, report: brief, synthesis, generatedAt: "2026-10-29T01:00:00Z" });
    expect(unique(index.conclusions.filter(item => item.scope.level === "month").map(item => item.scope.year))).toEqual([2028]);
    const month = index.conclusions.find(item => item.scope.level === "month" && item.domain === "wealth" && item.scope.branchId === "forward")!;
    const measurements = [];
    for (const query of [{ topic: "summary" }, { topic: "career" }, { topic: "wealth", year: 2030, branchId: "forward" },
      { topic: "month", year: 2028, branchId: "forward", monthId: month.stableId }] satisfies ReadingExplanationQuery[]) {
      const report = await build(index, query), encoded = await encodeScopedReadingReport(report);
      expect(await decodeScopedReadingReport(encoded)).toEqual(report);
      expect(report.index.conclusions.length).toBeLessThan(index.conclusions.length);
      expect(report.index.conclusions.every(item => report.scope.conclusionIds.includes(item.stableId))).toBe(true);
      measurements.push({ selection: report.scope.selection, savedConclusions: report.index.conclusions.length, savedSources: report.index.sources.length, bytes: bytes(encoded) });
    }
    expect(keyMonthYears.map(item => item.year)).toEqual([2028]);
    process.stdout.write(JSON.stringify({ probe: "scoped-current-real-producer", availableConclusions: index.conclusions.length,
      preparedMonthYears: keyMonthYears.map(item => item.year), measurements }) + "\n");
  }, 60_000);

  it("captures the current summary and exact original source closure without mutating or freezing the live index", async () => {
    const index = fixture(), before = JSON.stringify(index), report = await build(index);
    expect(report.scope.conclusionIds).toEqual(index.conclusions.slice(0, 3).map(item => item.stableId));
    expect(report.scope.omittedConclusionCount).toBe(5);
    expect(report.scope.excludedScopeLabels.join(" ")).toContain("不是完整十年报告");
    expect(report.index.sources.map(item => item.id)).toEqual(["own-source", "rule-only-source"]);
    expect(report.index.citationBindings).toEqual(index.citationBindings);
    expect(report.index.conclusions[0]!.text).toBe(index.conclusions[0]!.text);
    expect(report.presentations[0]!.literal).toEqual(buildPlainReadingSummary(index, index.conclusions[0]!));
    expect(report.reading).toContain("原句 🌿 e\u0301");
    expect(report.source).toMatchObject({ caseId: index.sourceSnapshot.caseId, revisionId: index.sourceSnapshot.revisionId,
      availableConclusionCount: 8, includeHour: true });
    expect(report.source.sourceSnapshotSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.isFrozen(report.index.conclusions[0])).toBe(true);
    expect(Object.isFrozen(index.conclusions[0])).toBe(false);
    expect(JSON.stringify(index)).toBe(before);
  });

  it("keeps one natal domain or every handover segment of one selected year/domain/branch, without months", async () => {
    const index = fixture();
    const natal = await build(index, { topic: "career" });
    expect(natal.index.conclusions).toHaveLength(1);
    expect(natal.scope.selection).toEqual({ kind: "domain", domain: "career", year: null, branchId: null });
    const yearly = await build(index, { topic: "career", year: 2027, branchId: "forward" });
    expect(yearly.index.conclusions.map(item => item.text)).toEqual(["当年交运前事业原文。", "当年交运后事业原文。"]);
    expect(yearly.scope.segments).toHaveLength(2);
    expect(yearly.scope.excludedScopeLabels.join(" ")).toContain("不代表确认这条路径真实或更好");
    expect(yearly.index.sources).toEqual([]);
  });

  it("freezes the live month's native headline and condition, then reopens literal text without the WeakMap or recalculation", async () => {
    const index = fixture(), month = index.conclusions[6]!;
    const literal = buildReadingMonthPreview(index, month);
    expect(literal.projectionState).toBe("producer_preview");
    const report = await build(index, { topic: "month", year: 2027, branchId: "forward", monthId: month.stableId });
    expect(report.presentations[0]).toMatchObject({ kind: "month_preview", literal });
    const encoded = await encodeScopedReadingReport(report);
    month.text = "后来当前页面变更的内容";
    const restored = await decodeScopedReadingReport(encoded);
    expect(restored).toEqual(report);
    expect(restored!.presentations[0]!.literal).toEqual(literal);
    expect(buildReadingMonthPreview(restored!.index, restored!.index.conclusions[0]!).projectionState).toBe("original_required");
    expect(restored!.reading).toContain("原约定款项需要核对");
    expect(restored!.reading).not.toContain("后来当前页面");
  });

  it("keeps an adopted personal original and its identity without giving it calculated evidence or replacing its text", async () => {
    const index = fixture(), personal = index.conclusions[2]!;
    personal.origin = "personal";
    personal.personalTextIds = ["adopted-personal-1"];
    personal.text = "明确采用的个人原文。\r\n🌿 e\u0301 不改写。";
    const report = await build(index, { topic: "wealth" });
    expect(report.index.conclusions[0]).toEqual(personal);
    expect(report.presentations[0]!.literal.projectionState).toBe("personal_original");
    expect(report.reading).toContain(personal.text);
    expect(await decodeScopedReadingReport(await encodeScopedReadingReport(report))).toEqual(report);
  });

  it.each<ReadingExplanationQuery>([
    { topic: "career", year: 2027 }, { topic: "career", year: 2099, branchId: "forward" },
    { topic: "month", year: 2027, branchId: "forward" }, { topic: "month", year: 2027 },
    { topic: "year_comparison", year: 2027, comparisonYear: 2028, branchId: "forward" },
    { topic: "report_comparison" }, { topic: "uncertainty" }
  ])("rejects an unavailable, ambiguous or unsupported selection %j", query => {
    expect(() => describeScopedReadingScope(fixture(), query)).toThrow();
  });

  it("rejects a different year/branch for an exact month and unknown-time/candidate results", async () => {
    const index = fixture(), monthId = index.conclusions[6]!.stableId;
    for (const query of [{ topic: "month" as const, monthId, year: 2028, branchId: "forward" },
      { topic: "month" as const, monthId, year: 2027, branchId: "backward" }]) await expect(build(index, query)).rejects.toThrow();
    index.sourceSnapshot.includeHour = false;
    await expect(build(index)).rejects.toThrow("候选组");
  });

  it.each(["rule-source", "citation-source", "revision", "duplicate", "surrogate", "created-before-source"])("refuses incomplete or inconsistent source data: %s", async change => {
    const index = fixture();
    if (change === "rule-source") index.sources = index.sources.filter(item => item.id !== "rule-only-source");
    if (change === "citation-source") index.sources = index.sources.filter(item => item.id !== "own-source");
    if (change === "revision") index.conclusions[1]!.stableId = "another-revision/natal:career";
    if (change === "duplicate") index.conclusions.push(structuredClone(index.conclusions[0]!));
    if (change === "surrogate") index.sourceSnapshot.context = { text: "\ud800" };
    if (change === "created-before-source") index.generatedAt = "2026-10-30T00:00:00.000Z";
    await expect(build(index)).rejects.toThrow();
  });
});

function unique<T>(items: T[]): T[] { return [...new Set(items)]; }

describe("strict scoped report wire and legacy coexistence", () => {
  it("round trips through the unchanged packing codec and makes the old full-report reader explicitly reject the new subtype", async () => {
    const report = await build(), encoded = await encodeScopedReadingReport(report);
    expect(await packReadingSnapshot(encoded)).toBe(encoded); // Existing ordinary/full writers retain their default.
    const stored = await packReadingSnapshot(encoded, { forceEnvelope: true });
    expect(isPackedReadingSnapshot(stored)).toBe(true); // Old journal editors already recognize this read-only guard.
    expect(isScopedReadingReport(encoded)).toBe(true);
    expect(await decodeScopedReadingReport(await unpackReadingSnapshot(stored))).toEqual(report);
    await expect(decodeReadingReportBundle(encoded)).rejects.toThrow("原记录仍保留");
    await expect(decodeReadingReportBundle(await unpackReadingSnapshot(stored))).rejects.toThrow("原记录仍保留");
    const old = await encodeReadingReportBundle({ reading: "旧阅读原句", archive: "旧依据原句", version: "old/1" });
    expect(await decodeScopedReadingReport(old)).toBeNull();
    expect(await decodeReadingReportBundle(old)).toEqual({ reading: "旧阅读原句", archive: "旧依据原句", version: "old/1" });
    expect(await decodeScopedReadingReport("普通旧文字")).toBeNull();
  });

  it("rejects changed manifest, literal text, sources, lengths, hashes and swapped parts", async () => {
    const encoded = await encodeScopedReadingReport(await build());
    const changes = [
      (value: any) => { value.reportId = crypto.randomUUID(); }, (value: any) => { value.source.caseId = crypto.randomUUID(); },
      (value: any) => { value.parts.reading.text += "修改"; }, (value: any) => { value.parts.index.text += "损坏"; },
      (value: any) => { value.parts.presentations.utf8Bytes += 1; }, (value: any) => { value.parts.index.sha256 = "0".repeat(64); },
      (value: any) => { [value.parts.reading, value.parts.presentations] = [value.parts.presentations, value.parts.reading]; }
    ];
    for (const change of changes) { const raw = envelope(encoded); change(raw); await expect(decodeScopedReadingReport(wire(raw))).rejects.toThrow("原记录仍保留"); }
  });

  it("rejects semantic source/selection/presentation inconsistencies even after recomputing checksums", async () => {
    const encoded = await encodeScopedReadingReport(await build());
    const mutations = [
      (value: any) => { value.source.revisionId = crypto.randomUUID(); },
      (value: any) => { value.scope.conclusionIds.reverse(); },
      (value: any) => { value.scope.selection = { kind: "domain", domain: "wealth", year: null, branchId: null }; },
      (value: any) => { value.scope.title = "完整十年报告"; },
      (value: any) => { value.scope.excludedScopeLabels = ["全部内容都已保存"]; },
      (value: any) => { value.parts.reading.text += "看似通过哈希但不属于冻结内容"; },
      (value: any) => { const rows = JSON.parse(value.parts.presentations.text); rows[0].literal.sourceConclusionId = rows[1].conclusionId; value.parts.presentations.text = JSON.stringify(rows); },
      (value: any) => { const rows = JSON.parse(value.parts.presentations.text); rows[1].literal.conditions = []; value.parts.presentations.text = JSON.stringify(rows); },
      (value: any) => { const savedIndex = fixture(); savedIndex.conclusions = savedIndex.conclusions.slice(0, 3); savedIndex.sources = savedIndex.sources.filter(item => item.id !== "rule-only-source"); value.parts.index.text = appendReadingExplanationIndex("", savedIndex); }
    ];
    for (const change of mutations) { const raw = envelope(encoded); change(raw); await expect(decodeScopedReadingReport(await resign(raw))).rejects.toThrow("原记录仍保留"); }
  });

  it("rejects unknown/corrupt reserved formats, noncanonical JSON, duplicate keys, extra fields and invalid Unicode", async () => {
    const encoded = await encodeScopedReadingReport(await build());
    const extra = envelope(encoded); extra.extra = true;
    const badVersion = envelope(encoded); badVersion.format = "hakimi.scoped-reading-report/2";
    const badUnicode = envelope(encoded); badUnicode.parts.reading.text = "\ud800";
    const malformed = [encoded.replace("scoped-v1", "scoped-v99"), `\ufeff${encoded}`, encoded.slice(0, -1), encoded + "\n",
      encoded.replace('{"format":', '{"format":"duplicate","format":'), wire(extra), await resign(badVersion), await resign(badUnicode)];
    for (const value of malformed) {
      expect(isScopedReadingReport(value)).toBe(true);
      await expect(decodeScopedReadingReport(value)).rejects.toThrow("原记录仍保留");
    }
  });

  it("uses the unchanged inclusive 8 MiB UTF-8 budget and rejects the next byte before any storage call", async () => {
    const source = fixture(), base = structuredClone(source.conclusions[0]!);
    source.conclusions = Array.from({ length: 50 }, (_, i) => ({ ...structuredClone(base), stableId: `${source.sourceSnapshot.revisionId}/natal:capacity-${i}`, text: "甲".repeat(26_000) }));
    source.sources = []; source.citationBindings = []; source.sourceSnapshot.input.capacityPadding = "";
    const initial = await encodeScopedReadingReport(await build(source)), limit = 8 * 1024 * 1024;
    const remaining = limit - bytes(initial);
    expect(remaining).toBeGreaterThan(0);
    source.sourceSnapshot.input.capacityPadding = "a".repeat(remaining);
    const exact = await encodeScopedReadingReport(await build(source));
    expect(bytes(exact)).toBe(limit);
    expect((await decodeScopedReadingReport(exact))!.index.conclusions[49]!.text).toBe("甲".repeat(26_000));
    source.sourceSnapshot.input.capacityPadding += "a";
    await expect(encodeScopedReadingReport(await build(source))).rejects.toBeInstanceOf(ReadingReportCapacityError);
    await expect(decodeScopedReadingReport(exact + " ")).rejects.toThrow("原记录仍保留");
  }, 60_000);
});
