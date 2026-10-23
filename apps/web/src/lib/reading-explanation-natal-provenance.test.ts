import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, researchNoteRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { NATAL_READING_RULE_APPLICATIONS_VERSION } from "../../../../packages/bazi-interpretation/src/natal-reading-rule-application";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { buildLocalReadingReport } from "./local-reading-edition";
import { buildReadingExplanationIndex, readReadingExplanationIndex, appendReadingExplanationIndex, resolveReadingCitationSupport } from "./reading-explanation-index";
import { encodeReadingReportBundle, decodeReadingReportBundle } from "./local-reading-report-bundle";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";

async function fixture(date: string, sex: "male" | "female" | "unspecified", referenceYear = 2026, time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic natal provenance regression", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(),
    revisionNumber: 1, createdAt: "2026-10-24T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const life = await buildLocalLifeOutlook(revision, assessment, referenceYear);
  return { revision, assessment, comprehensive, life };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
let b: Fixture, female: Fixture, child: Fixture, financial: Fixture;
beforeAll(async () => {
  b = await fixture("1995-05-18", "male");
  female = await fixture("1995-08-18", "female");
  child = await fixture("2019-12-22", "female", 2030, "11:23");
  financial = await fixture("1957-09-13", "unspecified", 2026, "00:26");
}, 60000);
function products(input: Fixture) {
  const synthesis = buildReadingSynthesis(input);
  const extras = { sourceRevision: input.revision, comprehensive: input.comprehensive, life: input.life, synthesis, explanationGeneratedAt: "2026-10-24T01:00:00Z" };
  const report = buildBriefReadingReport(input.assessment, null, extras)!;
  const index = buildReadingExplanationIndex({ ...input, synthesis, report, generatedAt: extras.explanationGeneratedAt });
  return { synthesis, extras, report, index };
}

it("attaches only the actual final producer's path, role and task selections to each natal domain", () => {
  for (const input of [b, female, financial]) {
    const before = JSON.stringify(input), { synthesis, report, index } = products(input);
    for (const domain of report.plainReading!.domains) {
      const conclusion = index.conclusions.find(item => item.stableId.endsWith(`/natal:${domain.id}`))!;
      expect(conclusion.evidence.ruleApplications).toEqual(domain.ruleApplications);
      expect(conclusion.evidence.citations).toEqual(domain.sourceIds);
      expect(conclusion.evidence.ruleApplications.length).toBeGreaterThan(0);
      expect(conclusion.evidence.citations.length).toBeGreaterThan(0);
      expect(conclusion.evidence.ruleApplications.every(rule => rule.provenance?.version === NATAL_READING_RULE_APPLICATIONS_VERSION)).toBe(true);
      expect(conclusion.evidence.ruleApplications.some(rule => rule.provenance?.selector === "buildNatalLifeStory.workWealthParagraphs")).toBe(false);
      expect(conclusion.evidence.ruleApplications.every(rule => !rule.provenance?.selection.startsWith("alternative/"))).toBe(true);
      for (const source of conclusion.evidence.citations) expect(resolveReadingCitationSupport(index, conclusion.stableId, source).status).toBe("associated_source");
      for (const rule of conclusion.evidence.ruleApplications.filter(item => ["buildConcreteNatalProse.route", "buildConcreteNatalProse.relationship"].includes(item.provenance!.selector))) {
        expect([rule.decision, ...rule.support].join()).not.toMatch(/resource-output|resource_first|wealth_first|official_joint|rooted_peer_mixed_authority|adult|unspecified/u);
      }
    }
    const projection = synthesis.sections.find(section => section.id === "career")!.ruleApplications!.find(rule => rule.ruleId === "natal-life-domain-projection")!;
    expect([projection.decision, ...projection.support].join()).not.toMatch(/resource-output|adult|unspecified/u);
    expect(projection.provenance.selection).toContain("/adult/unspecified");
    expect(index.conclusions.find(item => item.stableId.endsWith("/natal:relationships"))!.evidence.ruleApplications
      .find(rule => rule.provenance?.selector === "buildConcreteNatalProse.relationship")!.support).toContain("实际关系状态：未填写。");
    const career = report.plainReading!.domains.find(domain => domain.id === "career")!;
    expect(career.ruleApplications!.find(rule => rule.provenance.selector === "selectNatalPatternPath")!.provenance.selection).toBe(input.comprehensive.patternDiagnosis!.primaryPathId);
    const wealth = report.plainReading!.domains.find(domain => domain.id === "wealth")!;
    expect(wealth.ruleApplications!.some(rule => rule.provenance.selector.startsWith("buildNatalPatternDiagnosis."))).toBe(false);
    expect(index.sourceSnapshot.sourceVersions).toContain(NATAL_READING_RULE_APPLICATIONS_VERSION);
    expect(index.limitations.join()).toContain("不等于整句解释已获语义证明");
    expect(JSON.stringify(input)).toBe(before);
  }
});

it("keeps relationship evidence independent and never turns hidden stars or family-only contacts into visible relationship rules", () => {
  const { index } = products(female), f = female.comprehensive.relationshipFoundation!;
  expect(f.perspectives[0]!.occurrences.every(item => item.visibility !== "visible")).toBe(true);
  const relationship = index.conclusions.find(item => item.stableId.endsWith("/natal:relationships"))!;
  expect(relationship.evidence.ruleApplications.some(rule => rule.provenance?.selector === "selectNatalPatternPath")).toBe(false);
  expect(relationship.evidence.ruleApplications.some(rule => rule.provenance?.selection === "visible_star")).toBe(false);
  const used = relationship.evidence.ruleApplications.filter(rule => rule.provenance?.selector === "calculatePillarRelations");
  for (const rule of used) {
    const fact = f.interactions.find(item => item.fact.id === rule.provenance!.factRefs[0])!;
    expect(fact.scope).toBe("day_palace"); expect(rule.ruleId).toBe(fact.fact.ruleId);
  }
  const career = index.conclusions.find(item => item.stableId.endsWith("/natal:career"))!;
  const unrelated = career.evidence.citations.find(id => !relationship.evidence.citations.includes(id))!;
  expect(unrelated).toBeTruthy();
  expect(resolveReadingCitationSupport(index, relationship.stableId, unrelated).status).toBe("unrelated");
});

it("keeps child relationship rule explanations age-neutral and does not reintroduce partner scenarios", () => {
  const { report, index } = products(child);
  const relationship = index.conclusions.find(item => item.stableId.endsWith("/natal:relationships"))!;
  expect(report.plainReading!.domains.find(domain => domain.id === "relationships")!.paragraphs.join()).not.toContain("若已有伴侣");
  expect(relationship.evidence.ruleApplications.map(rule => rule.decision).join()).not.toMatch(/已有伴侣|长期共同生活|工作岗位|报酬/u);
  expect(relationship.evidence.ruleApplications.some(rule => rule.provenance?.selector === "buildNatalRelationshipFoundation.perspectives")).toBe(false);
  expect(relationship.evidence.ruleApplications.some(rule => rule.provenance?.selector === "calculatePillarRelations")).toBe(true);
});

it("keeps unknown-hour selected-column provenance free of hour references", () => {
  // Explicit selected-column projection, not a claim to a complete unknown-time calculation.
  const revision = structuredClone(financial.revision); revision.input.time = null; revision.input.timePrecision = "unknown_hour";
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive });
  for (const section of synthesis.sections.filter(item => ["career", "wealth", "relationships"].includes(item.id))) {
    expect(section.ruleApplications!.flatMap(rule => rule.provenance.factRefs).some(ref => ref.startsWith("hour:"))).toBe(false);
  }
  const projection = synthesis.sections.find(section => section.id === "career")!.ruleApplications!.find(rule => rule.ruleId === "natal-life-domain-projection")!;
  expect(projection.support.join()).toContain("未填写年龄参考");
  expect(projection.support.join()).toContain("已采用身份：未填写");
  expect(projection.provenance.selection).toContain("/unknown/unspecified");
  expect(comprehensive.relationshipFoundation!.perspectives.map(item => item.id)).toEqual(["wealth", "authority"]);
});

it("retains the complete structured mapping through the real archive, bundle and snapshot codec", async () => {
  const { extras, index } = products(b), saved = buildLocalReadingReport(b.assessment, null, extras);
  const packed = await packReadingSnapshot(await encodeReadingReportBundle(saved));
  const reopened = await decodeReadingReportBundle(await unpackReadingSnapshot(packed));
  expect(reopened).toEqual(saved);
  const restored = readReadingExplanationIndex(reopened!.archive)!;
  expect(restored).toEqual(index);
  for (const domain of ["career", "wealth", "relationships"]) {
    const evidence = restored.conclusions.find(item => item.stableId.endsWith(`/natal:${domain}`))!.evidence;
    expect(evidence.ruleApplications.length).toBeGreaterThan(0); expect(evidence.citations.length).toBeGreaterThan(0);
  }
  const legacy = structuredClone(index);
  for (const conclusion of legacy.conclusions) for (const rule of conclusion.evidence.ruleApplications) delete rule.provenance;
  const oldArchive = appendReadingExplanationIndex("原始旧档案文本", legacy);
  expect(readReadingExplanationIndex(oldArchive)).toEqual(legacy);
  expect(oldArchive.startsWith("原始旧档案文本")).toBe(true);
});

it("preserves a pre-provenance chapter adoption through fresh synthesis and clears all automatic backing", async () => {
  const chapter = b.comprehensive.chapters.find(item => item.id === "career")!;
  const { ruleApplications: _newMetadata, ...oldChapter } = chapter;
  const versions = [b.comprehensive.version];
  expect(versions).toEqual(["hakimi.bazi-comprehensive-reading/0.15.0"]);
  const originalConclusion = `${oldChapter.title} · ${oldChapter.headline}\n${oldChapter.verdict}\n${oldChapter.paragraphs.join("\n")}\n综合解读规则：${b.comprehensive.version}`;
  const choice = { id: "chapter-career", label: chapter.title, originalConclusion, sourceVersions: versions };
  const base = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: b.revision.caseId,
    anchor: { kind: "revision", revisionId: b.revision.id }, bodyFormat: "markdown", body: buildStructuredReadingFeedback(b.assessment,
      { subjectId: choice.id, subjectLabel: choice.label, originalConclusion, sourceVersions: versions, rating: "partial", aspect: "合成事业采用保全", actualSituation: "synthetic" }),
    tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-24T00:00:00Z", updatedAt: "2026-10-24T00:00:00Z" });
  const personalText = "旧版本明确采用的个人原文\n第二行仍逐字保留。";
  const review = researchNoteRecordSchema.parse({ ...base, id: crypto.randomUUID(), body: await buildReadingFeedbackReview(base, null,
    readingFeedbackSource(b.assessment, versions), { state: "revised", notes: "synthetic adoption", revisedConclusion: personalText, occurredAt: "" }),
    createdAt: "2026-10-24T00:01:00Z", updatedAt: "2026-10-24T00:01:00Z" });
  const personalReading = await buildLocalPersonalReading({ revision: b.revision, assessment: b.assessment, records: [base, review], choices: [choice] });
  const synthesis = buildReadingSynthesis({ ...b, personal: personalReading });
  expect(synthesis.sourceVersions).toContain(NATAL_READING_RULE_APPLICATIONS_VERSION);
  const extras = { sourceRevision: b.revision, comprehensive: b.comprehensive, life: b.life, synthesis, personalReading };
  const report = buildBriefReadingReport(b.assessment, null, extras)!;
  const index = buildReadingExplanationIndex({ ...b, report, synthesis, generatedAt: "2026-10-24T01:00:00Z" });
  const adopted = index.conclusions.find(item => item.stableId.endsWith("/natal:career"))!;
  expect(adopted.origin).toBe("personal"); expect(adopted.text).toBe(personalText);
  expect(adopted.evidence.ruleApplications).toEqual([]); expect(adopted.evidence.citations).toEqual([]); expect(adopted.evidence.support).toEqual([]);
  expect(index.conclusions.find(item => item.stableId.endsWith("/natal:wealth"))!.evidence.ruleApplications.length).toBeGreaterThan(0);
});

it("rejects another chart's synthesis instead of lending its rule or citation mapping", () => {
  const own = products(b), foreign = products(female);
  expect(() => buildReadingExplanationIndex({ ...b, report: own.report, synthesis: foreign.synthesis, generatedAt: "2026-10-24T01:00:00Z" })).toThrow("命盘");
});
