import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { researchNoteRecordSchema, storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { webReportExportPort } from "@hakimi/platform";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { prepareKeyMonthYear } from "./key-month-event-source";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { buildLocalReadingReport } from "./local-reading-edition";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { encodeReadingReportBundle, decodeReadingReportBundle } from "./local-reading-report-bundle";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";
import * as Explanation from "./reading-explanation-index";
import { BriefReadingReportPanel } from "../components/brief-reading-report-panel";
import { ReadingSavedRecord } from "../components/reading-saved-record";
import { resetPreparedFileDeliveryCoordinatorForTests } from "../components/prepared-file-delivery-coordinator";
import development from "./__fixtures__/reading-quality-development.v1.json";

type Source = { id: string; familyId: string; birth: string; sex: string; years: number[] };
type Case = { id: string; sourceId: string; familyId: string; operation: string; parameters: Record<string, any> };
type Manifest = { version: string; split: string; sources: Source[]; cases: Case[] };
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const generatedAt = "2026-10-24T00:00:00.000Z";
const outputDirectory = process.env.READING_QUALITY_OUTPUT_DIR;
if (outputDirectory && existsSync(path.join(outputDirectory, "evaluation-results.json"))) throw new Error("Evaluation output already contains a result; choose a new directory to preserve the original run.");
const parse = (filename: string) => JSON.parse(readFileSync(filename, "utf8").replace(/^\uFEFF/u, ""));
function loadManifest(): Manifest {
  const filename = process.env.READING_QUALITY_HOLDOUT_FILE;
  if (!filename) return development as Manifest;
  // A manual holdout run is intentionally absent from ordinary test discovery.
  // Verify the pre-existing seal and a recorded implementation freeze BEFORE
  // reading the sealed cases, and retain an append-only access record.
  const sealFile = process.env.READING_QUALITY_SPLIT_SEAL;
  const freezeFile = process.env.READING_QUALITY_IMPLEMENTATION_FREEZE;
  if (!sealFile || !freezeFile || !outputDirectory) throw new Error("Holdout requires its seal, implementation freeze and external output directory.");
  const seal = parse(sealFile), freeze = parse(freezeFile);
  if (path.resolve(seal.holdout.path) !== path.resolve(filename) || !(Date.parse(freeze.frozenAt) >= Date.parse(seal.createdAt))) throw new Error("Holdout freeze identity or timing is invalid.");
  if (digest(readFileSync(path.resolve(seal.development.path))) !== seal.development.sha256) throw new Error("Development split changed after sealing.");
  if (!Array.isArray(freeze.files) || !freeze.files.length) throw new Error("Implementation freeze has no source identities.");
  for (const file of freeze.files) {
    if (String(file.path).replaceAll("\\", "/").toLowerCase().endsWith("apps/web/src/lib/local-user-data-cleanup.ts")) throw new Error("Protected source is excluded before any read or hash.");
    if (digest(readFileSync(file.path)) !== file.sha256.toLowerCase()) throw new Error("Implementation changed after holdout freeze: " + file.path);
  }
  const bytes = readFileSync(filename);
  if (digest(bytes) !== seal.holdout.sha256) throw new Error("Sealed holdout bytes changed.");
  appendFileSync(path.join(path.dirname(sealFile), "holdout-access.jsonl"), JSON.stringify({ at: new Date().toISOString(), action: "opened-for-frozen-run", sha256: digest(bytes), freezeFile, outputDirectory }) + "\n");
  return JSON.parse(bytes.toString("utf8"));
}
const manifest = loadManifest();
expect(manifest.cases).toHaveLength(manifest.split === "holdout" ? 10 : 30);
expect(new Set(manifest.cases.map(item => item.id)).size).toBe(manifest.cases.length);
for (const item of manifest.cases) expect(manifest.sources.find(source => source.id === item.sourceId)?.familyId).toBe(item.familyId);
const fixtures = new Map<string, Promise<any>>();
const revisions = new Map<string, Promise<any>>();
const metrics: any[] = [];
const familyIdentities = new Map<string, string>();
const ruleCoverage = new Map<string, Set<string>>();
const severeCategories: Record<string, string> = {
  topic_paraphrase: "question_direction_instability", reverse_assertion: "unsupported_user_assertion",
  unrelated_citation: "unrelated_citation_as_support", saved_export: "page_saved_export_mismatch",
  report_difference: "old_report_mutation_or_false_change_reason", personal_adoption: "personal_text_loss_or_wrong_source_adoption",
  background_replacement: "context_scope_leak", relationship_context: "relationship_context_leak",
  child_language: "age_scope_leak", age_boundary: "age_boundary_loss", before_birth: "before_birth_personal_event",
  unknown_hour: "invented_birth_time", birth_boundary: "hidden_birth_boundary_change",
  neutral_money: "undirected_actor_promoted_to_outcome", no_financial_actor: "invented_financial_actor",
  special_money: "special_wealth_task_misstated_as_income", mixed_scope: "fact_or_rule_scope_mismatch",
  specific_actor: "fact_or_rule_scope_mismatch", foreign_scope: "foreign_source_accepted",
  scope_handover: "branch_or_interval_merge", unknown_direction: "direction_branch_loss", year_comparison: "comparison_scope_error",
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const unique = <T,>(values: T[]) => [...new Set(values)];
const segments = (fixture: any) => fixture.report.plainReading.outlook.branches.flatMap((branch: any) => branch.years.flatMap((year: any) => year.segments));
const textOf = (fixture: any) => fixture.report.plainReading.bodyText as string;
function uuid(seed: string) {
  const value = digest("synthetic-reading-quality-v1:" + seed);
  return value.slice(0, 8) + "-" + value.slice(8, 12) + "-4" + value.slice(13, 16) + "-a" + value.slice(17, 20) + "-" + value.slice(20, 32);
}
function note(revision: any, body: string, seed: string, minute = 0, tags = ["阅读背景"]) {
  const time = new Date(Date.UTC(2026, 9, 24, 0, minute)).toISOString();
  return researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: uuid(seed), caseId: revision.caseId,
    anchor: { kind: "revision", revisionId: revision.id }, bodyFormat: "markdown", body, tags, sourceRefs: [],
    lifecycle: "active", editVersion: 1, createdAt: time, updatedAt: time });
}
function writeArtifact(filename: string, value: unknown) {
  if (!outputDirectory) return;
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(path.join(outputDirectory, filename), typeof value === "string" ? value : JSON.stringify(value, null, 2));
}
async function build(spec: Source, options: Record<string, any> = {}) {
  const key = JSON.stringify([spec.id, options]);
  let cached = fixtures.get(key);
  if (!cached) {
    cached = (async () => {
      const [date, time] = (options.birth ?? spec.birth).split(" ");
      const revisionKey = JSON.stringify([spec.familyId, date, time, options.sex ?? spec.sex]);
      let calculated = revisions.get(revisionKey);
      if (!calculated) {
        calculated = (async () => {
          const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time,
            timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: options.sex ?? spec.sex, lunarLeapMonth: false,
            location: { label: "Public synthetic reading evaluation " + spec.familyId, latitude: null, longitude: null, precision: "unknown" },
            sourceNote: "Synthetic evaluation; not a real person or observed life outcome." }, WORKING_DEFAULT_RULE_PROFILE);
          return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: uuid(revisionKey),
            caseId: uuid(spec.familyId), revisionNumber: 1, createdAt: generatedAt });
        })();
        revisions.set(revisionKey, calculated);
      }
      const revision = clone(await calculated);
      if (options.unknownHour) { revision.input.time = null; revision.input.timePrecision = "unknown_hour"; }
      const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
      const range = options.years ?? spec.years;
      const annual = options.unknownHour ? null : await buildLocalAnnualOutlookRange(revision, assessment, range[0], range[1]);
      const life = options.unknownHour ? null : await buildLocalLifeOutlook(revision, assessment, range[0]);
      const annualDomains = annual ? { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
        includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
        years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) } : null;
      let contextual: any = null;
      if (options.context) {
        const body = await buildReadingContextRecord(revision, null, { work: "unspecified", relationship: "unspecified",
          fromYear: range[0], toYear: range[1], notes: "Explicit synthetic context; no free-text occupation inference.", ...options.context });
        const record = note(revision, body, key + ":context");
        const context = (await resolveReadingContext({ revision, records: [record] })).latest;
        contextual = buildContextualReadingBundle({ revision, assessment, comprehensive, annualDomains, context, referenceYear: range[0] });
      }
      const source: any = { revision, assessment, annual, annualDomains, contextual };
      const annualEvents = annual ? buildReadingAnnualEvents(source) : null;
      const annualLifeStories = annual ? buildReadingAnnualLifeStories({ ...source, annualEvents }) : null;
      const keyMonthYears = [];
      if (annual) for (const year of annual.years) keyMonthYears.push(await prepareKeyMonthYear({ ...source, annualEvents, annualLifeStories }, year.year, []));
      const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, annual, life, contextual });
      const extras: any = { sourceRevision: revision, comprehensive, annualDomains, annualEvents, annualLifeStories, keyMonthYears, synthesis, life, contextual };
      const report = buildBriefReadingReport(assessment, annual, extras)!;
      const edition = buildLocalReadingReport(assessment, annual, extras);
      const index = Explanation.buildReadingExplanationIndex({ report, revision, assessment, synthesis, generatedAt, context: contextual, reportVersion: edition.version });
      const fixture = { spec, ...source, comprehensive, life, extras, report, edition, index };
      if (!Object.keys(options).length) {
        familyIdentities.set(spec.familyId, ["year", "month", "day", "hour"].map(key => revision.facts.pillars[key].ganZhi).join("/"));
        writeArtifact(spec.id + ".base.json", { spec, revision, assessment, annual, report, index, edition });
      }
      return fixture;
    })();
    fixtures.set(key, cached);
  }
  return cached;
}
function originalJudgments(fixture: any) { return fixture.annual?.years.flatMap((year: any) => year.judgmentSegments) ?? []; }
function assertSourceAndScopes(fixture: any) {
  expect(fixture.report.sourceBinding).toMatchObject({ caseId: fixture.revision.caseId, revisionId: fixture.revision.id,
    chartResultHash: fixture.revision.manifest.resultHash, includeHour: fixture.assessment.sourceBinding.includeHour });
  for (const branch of fixture.report.plainReading.outlook.branches) for (const year of branch.years) {
    const raw = fixture.annual.years.find((item: any) => item.year === year.year);
    expect(year.segments.map((part: any) => [part.id, part.startInstant, part.endExclusiveInstant]))
      .toEqual(raw.judgmentSegments.filter((part: any) => part.branchId === branch.id).map((part: any) => [part.id, part.startInstant, part.endExclusiveInstant]));
    for (const part of year.segments) for (const window of part.monthWindows) {
      expect(window.branchId).toBe(branch.id);
      expect(window.startInstant >= part.startInstant && window.endExclusiveInstant <= part.endExclusiveInstant).toBe(true);
      const prepared = fixture.extras.keyMonthYears.find((item: any) => item.year === year.year);
      for (const member of window.members) {
        const original = prepared.monthly.months.find((item: any) => item.id === member.monthId).judgmentSegments.find((item: any) => item.id === member.periodId);
        expect([member.startInstant, member.endExclusiveInstant]).toEqual([original.startInstant, original.endExclusiveInstant]);
      }
    }
    for (const part of year.segments) {
      const original = raw.judgmentSegments.find((item: any) => item.id === part.id).judgment;
      for (const domain of part.domainEvidence) {
        const rules = domain.contentRules;
        expect(rules, "Every generated period domain must expose its actual rule application scope").toBeTruthy();
        expect(rules.scope.sourceBinding).toEqual(original.sourceBinding);
        expect(rules.scope.targetRef).toEqual(original.targetRef);
        expect(rules.scope.backgroundRefs).toEqual(original.backgroundRefs);
        expect(rules.scope.interval).toEqual(original.interval);
        for (const decision of rules.decisions) {
          if (decision.status === "applied") {
            const applications = ruleCoverage.get(decision.ruleId) ?? new Set<string>();
            applications.add(JSON.stringify([rules.scope, decision.id]));
            ruleCoverage.set(decision.ruleId, applications);
          }
          for (const reference of [...decision.support, ...decision.counterFacts]) if (reference.kind === "action") {
            const axis = original.axes.find((item: any) => item.id === reference.axisId);
            expect(axis?.stemActions?.items[reference.index], "Rule action reference must resolve in the exact original axis").toBeTruthy();
          }
        }
        for (const policy of rules.actionPolicies) {
          const action = original.axes.find((item: any) => item.id === policy.axisId)?.stemActions?.items[policy.actionIndex];
          expect(action).toBeTruthy(); expect(policy.effect).toBe(action.effect);
          if (["neutral", "unresolved"].includes(action.effect)) {
            expect(policy.allowedKinds).toEqual(["topic"]); expect(policy.incomeClaimAllowed).toBe(false);
          }
          if (policy.incomeClaimAllowed) {
            expect(["正财", "偏财"]).toContain(action.tenGod);
            expect(["assists", "mixed"]).toContain(action.effect);
            expect(policy.mechanism).toBe("role");
          }
        }
        for (const sentence of domain.sentences) {
          expect(sentence.ruleIds.length).toBeGreaterThan(0);
          for (const id of sentence.ruleDecisionIds) expect(rules.decisions.some((decision: any) => decision.id === id)).toBe(true);
        }
      }
    }
  }
  expect(fixture.edition.reading).toContain(textOf(fixture));
  expect(textOf(fixture)).not.toMatch(/必定升职|保证发财|一定离婚|注定分开|百分之\d/u);
}
function answerIdentity(answer: any) {
  return answer.conclusions.map((item: any) => ({ id: item.stableId, text: item.text, direction: item.direction, scope: item.scope, sourceSubjects: item.sourceSubjects }));
}
async function savedExport(fixture: any) {
  const packed = await packReadingSnapshot(await encodeReadingReportBundle(fixture.edition));
  expect(packed.length).toBeLessThanOrEqual(200000);
  expect(await decodeReadingReportBundle(await unpackReadingSnapshot(packed))).toEqual(fixture.edition);
  const record = note(fixture.revision, packed, fixture.spec.id + ":saved", 3, ["本地解读快照"]), before = JSON.stringify(record);
  const save = vi.spyOn(webReportExportPort, "saveFile").mockImplementation(async (_blob: any, filename: string) => ({ status: "download_requested", filename, method: "browser_download" }));
  const page = render(<BriefReadingReportPanel report={fixture.report}/>);
  for (const domain of fixture.report.plainReading.domains) for (const paragraph of domain.paragraphs) expect(page.container.textContent).toContain(paragraph);
  page.unmount();
  const saved = render(<ReadingSavedRecord record={record}/>);
  fireEvent.click(saved.container.querySelector("summary")!);
  fireEvent.click(await screen.findByRole("button", { name: "导出这份通读报告" }));
  fireEvent.click(screen.getByRole("button", { name: /^下载$/u }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const blob = save.mock.calls[0]![0];
  const text = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob); });
  expect(text).toBe(fixture.edition.reading);
  expect(JSON.stringify(record)).toBe(before);
  return { packedCharacters: packed.length, readingSha256: digest(text), exactExport: true, storedRecordUnchanged: true };
}
async function adoption(fixture: any) {
  const chapter = fixture.comprehensive.chapters.find((item: any) => item.id === "career");
  const choice = { id: "chapter-career", label: chapter.title,
    originalConclusion: chapter.title + " · " + chapter.headline + "\n" + chapter.verdict + "\n" + chapter.paragraphs.join("\n") + "\n综合解读规则：" + fixture.comprehensive.version,
    sourceVersions: [fixture.comprehensive.version] };
  const personalText = "合成个人修订：我保留与自动建议相反的选择。\n这不是已验证人生事实；这一行和标点必须原样保留。\u200b";
  const feedback = note(fixture.revision, buildStructuredReadingFeedback(fixture.assessment, { subjectId: choice.id, subjectLabel: choice.label,
    originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial", aspect: "synthetic", actualSituation: "Synthetic only", requestedRevision: personalText }), choice.id + ":root", 1, ["解读反馈"]);
  const review = note(fixture.revision, await buildReadingFeedbackReview(feedback, null, readingFeedbackSource(fixture.assessment, choice.sourceVersions),
    { state: "revised", notes: "Synthetic adoption", revisedConclusion: personalText, occurredAt: "Synthetic" }), choice.id + ":review", 2, ["解读反馈", "解读反馈复核"]);
  const personalReading = await buildLocalPersonalReading({ revision: fixture.revision, assessment: fixture.assessment, choices: [choice], records: [feedback, review] });
  const synthesis = buildReadingSynthesis({ revision: fixture.revision, assessment: fixture.assessment, comprehensive: fixture.comprehensive,
    annual: fixture.annual, life: fixture.life, contextual: fixture.contextual, personal: personalReading });
  const extras = { ...fixture.extras, personalReading, synthesis };
  const report = buildBriefReadingReport(fixture.assessment, fixture.annual, extras)!;
  expect(report.plainReading!.domains.find(item => item.id === "career")!.origin).toBe("personal");
  expect(report.personalTexts.find(item => item.subjectId === choice.id)!.text).toBe(personalText);
  const index = Explanation.buildReadingExplanationIndex({ report, revision: fixture.revision, assessment: fixture.assessment, synthesis, generatedAt, context: fixture.contextual });
  const answer = Explanation.queryReadingExplanation(index, { topic: "career" });
  expect(JSON.stringify(answer)).toContain(personalText.replaceAll("\n", "\\n"));
  const mismatched = await buildLocalPersonalReading({ revision: fixture.revision, assessment: fixture.assessment,
    choices: [{ ...choice, originalConclusion: choice.originalConclusion + " forged" }], records: [feedback, review] });
  expect(mismatched.entries.some(item => item.state === "adopted")).toBe(false);
  const edition = buildLocalReadingReport(fixture.assessment, fixture.annual, extras);
  expect(edition.reading).toContain(personalText);
  return { personalTextSha256: digest(personalText), exactText: true, wrongOriginalRejected: true };
}

beforeAll(async () => {
  for (const source of manifest.sources) await build(source);
  if (manifest.split === "holdout") {
    const developmentResult = process.env.READING_QUALITY_DEVELOPMENT_RESULT;
    if (!developmentResult) throw new Error("Holdout requires the separately retained development family identities.");
    const current = parse(developmentResult);
    if (current.split !== "development" || current.completedCases !== 30) throw new Error("Invalid development result for split isolation.");
    for (const identity of familyIdentities.values()) expect(Object.values(current.familyIdentities)).not.toContain(identity);
  }
}, 240_000);
afterEach(() => { cleanup(); vi.restoreAllMocks(); resetPreparedFileDeliveryCoordinatorForTests(); });
afterAll(() => {
  const failed = metrics.filter(item => item.status !== "passed");
  writeArtifact("evaluation-results.json", { version: "hakimi.reading-quality-evaluation/1", split: manifest.split, expectedCases: manifest.cases.length,
    completedCases: metrics.length, passedCases: metrics.length - failed.length, failedCases: failed.length, skippedCases: manifest.cases.length - metrics.length,
    familyIdentities: Object.fromEntries(familyIdentities), actualAppliedRuleCoverage: Object.fromEntries([...ruleCoverage].map(([id, applications]) => [id, applications.size])),
    ruleCoverageUnit: "Distinct exact scope and decision ID; repeated assertions do not increase coverage.",
    severeFailures: failed.map(item => ({ caseId: item.id, category: item.category, error: item.error })), metrics, predictionAccuracyClaimed: false,
    limitations: ["Synthetic internal consistency and product-route checks, not real-world predictive accuracy.", "DOM/save/export tests use isolated component adapters, not the installed user browser."] });
});

it.each(manifest.cases)("reading evaluation $id: $operation", async (item: Case) => {
  const startedAt = Date.now(), source = manifest.sources.find(value => value.id === item.sourceId)!;
  const observation: any = { id: item.id, familyId: item.familyId, operation: item.operation, category: severeCategories[item.operation], status: "failed" };
  try {
    const f = await build(source), p = item.parameters;
    assertSourceAndScopes(f);
    switch (item.operation) {
      case "topic_paraphrase": {
        const answers = p.questions.map((question: string) => Explanation.queryReadingExplanation(f.index, { question }));
        for (const answer of answers) { expect(answer.status).toBe("answered"); expect(answer.topic).toBe(p.topic); expect(answer.conclusions.length).toBeGreaterThan(0); }
        for (const answer of answers.slice(1)) expect(answerIdentity(answer)).toEqual(answerIdentity(answers[0]));
        break;
      }
      case "reverse_assertion": {
        const before = JSON.stringify(f.index), direct = Explanation.queryReadingExplanation(f.index, { topic: p.topic });
        const prompted = Explanation.queryReadingExplanation(f.index, { topic: p.topic, question: p.question });
        expect(prompted.status).toBe("answered"); expect(answerIdentity(prompted)).toEqual(answerIdentity(direct)); expect(JSON.stringify(f.index)).toBe(before);
        break;
      }
      case "scope_handover": {
        expect(originalJudgments(f).length).toBeGreaterThan(0);
        for (const part of originalJudgments(f)) expect(segments(f).some((item: any) => item.id === part.id && item.startInstant === part.startInstant && item.endExclusiveInstant === part.endExclusiveInstant)).toBe(true);
        if (source.sex === "unspecified") expect(f.report.plainReading.outlook.branches.map((item: any) => item.id)).toEqual(["forward", "backward"]);
        break;
      }
      case "birth_boundary": {
        const date = source.birth.split(" ")[0], earlier = await build(source, { birth: date + " " + p.earlierTime, years: [2032, 2032] });
        const later = await build(source, { birth: date + " " + p.laterTime, years: [2032, 2032] });
        expect(earlier.revision.facts.pillars.hour).not.toEqual(later.revision.facts.pillars.hour);
        expect(earlier.assessment.sourceBinding.chartResultHash).not.toBe(later.assessment.sourceBinding.chartResultHash);
        expect(() => buildBriefReadingReport(earlier.assessment, earlier.annual, { ...earlier.extras, comprehensive: later.comprehensive })).toThrow();
        const unknown = await build(source, { unknownHour: true });
        const uncertainty = Explanation.queryReadingExplanation(unknown.index, { topic: "uncertainty" });
        expect(uncertainty.status).toBe("answered"); expect(uncertainty.summary).toMatch(/时柱|精度|出生时间/u);
        const perturbation = await Explanation.buildReadingTimeUncertainty(earlier.revision);
        expect(perturbation.pillarStatus).toBe("changed_at_tested_offsets");
        expect(perturbation.changedPillars).toContain("hour"); expect(perturbation.interpretationStatus).toBe("not_assessed");
        expect(unknown.report.plainReading.outlook.branches).toEqual([]);
        break;
      }
      case "saved_export": observation.detail = await savedExport(f); break;
      case "report_difference": {
        const packed = await packReadingSnapshot(await encodeReadingReportBundle(f.edition)), record = note(f.revision, packed, item.id + ":old");
        const before = JSON.stringify(record), oldDecoded = await decodeReadingReportBundle(await unpackReadingSnapshot(record.body));
        const context = await build(source, { context: { work: "retired" } });
        const response = Explanation.queryReadingExplanation(context.index, { topic: "report_comparison", previousIndex: f.index });
        expect(response.status).toBe("answered");
        expect(JSON.stringify(record)).toBe(before); expect(await decodeReadingReportBundle(await unpackReadingSnapshot(record.body))).toEqual(oldDecoded);
        expect(Explanation.readReadingExplanationIndex("# 未包含依据索引的旧稿\n原文不能倒填当前结论。 ")).toBeNull();
        observation.detail = { oldReportSha256: digest(f.edition.reading), oldRecordUnchanged: true };
        break;
      }
      case "special_money": {
        expect(f.comprehensive.patternDiagnosis.wealthResourceTask.task).toBe(p.task);
        const wealth = f.report.plainReading.domains.find((item: any) => item.id === "wealth");
        expect(wealth.paragraphs.join(" ")).toMatch(/支持|帮助|学习|工具|承载|负担/u);
        expect(wealth.paragraphs.join(" ")).not.toMatch(/财星.*(?:所以|因此).*(?:必|会)增收|保证.*收入/u);
        break;
      }
      case "background_replacement": {
        const years = p.year ? [p.year, p.year] : source.years;
        const first = await build(source, { years, context: { work: p.first } }), second = await build(source, { years, context: { work: p.second } });
        expect(first.revision).toEqual(second.revision); expect(first.assessment).toEqual(second.assessment); expect(first.annual).toEqual(second.annual);
        expect(first.contextual.contextSource.reference).not.toEqual(second.contextual.contextSource.reference);
        expect(textOf(first)).not.toBe(textOf(second));
        const natal = second.report.plainReading.domains.flatMap((item: any) => item.paragraphs).join(" ");
        if (["retired", "caregiving", "student"].includes(p.second)) expect(natal).not.toMatch(/若在职|岗位晋升|工资上涨|客户订单/u);
        assertSourceAndScopes(second);
        break;
      }
      case "relationship_context": {
        const first = await build(source, { context: { relationship: p.first } }), second = await build(source, { context: { relationship: p.second } });
        expect(first.annual).toEqual(second.annual);
        const relationship = (fixture: any) => fixture.report.plainReading.domains.find((item: any) => item.id === "relationships").paragraphs.join(" ");
        expect(relationship(first)).not.toBe(relationship(second)); expect(relationship(second)).toMatch(/分开|旧关系|交接|界限/u);
        break;
      }
      case "unrelated_citation": {
        const candidates = f.index.sources.map((citation: any) => ({ citation }));
        let mismatch: any = null;
        for (const conclusion of f.index.conclusions) for (const candidate of candidates) {
          const sourceId = candidate.citation.id;
          if (Explanation.resolveReadingCitationSupport(f.index, conclusion.stableId, sourceId).status === "unrelated") { mismatch = { conclusion, citation: candidate.citation, sourceId }; break; }
          if (mismatch) break;
        }
        expect(mismatch, "A real registry citation must not automatically support every conclusion").toBeTruthy();
        expect(Explanation.resolveReadingCitationSupport(f.index, mismatch.conclusion.stableId, mismatch.sourceId).status).toBe("unrelated");
        const tampered = clone(f.index);
        tampered.conclusions.find((conclusion: any) => conclusion.stableId === mismatch.conclusion.stableId).evidence.citations.push(mismatch.sourceId);
        expect(() => Explanation.validateReadingExplanationIndex(tampered)).toThrow(/引文|关联/u);
        const archivedIndex = Explanation.appendReadingExplanationIndex("Frozen synthetic archive", f.index);
        const payload = JSON.stringify(f.index);
        expect(archivedIndex.includes(payload)).toBe(true);
        const tamperedArchive = archivedIndex.replace(payload, JSON.stringify(tampered));
        expect(() => Explanation.readReadingExplanationIndex(tamperedArchive)).toThrow(/引文|关联/u);
        observation.detail = { target: mismatch.conclusion.stableId, actualButUnrelatedSource: mismatch.sourceId };
        break;
      }
      case "foreign_scope": {
        const foreign = await build(manifest.sources.find(value => value.id === p.foreignSourceId)!);
        expect(() => buildBriefReadingReport(f.assessment, f.annual, { ...f.extras, comprehensive: foreign.comprehensive })).toThrow();
        expect(() => Explanation.buildReadingExplanationIndex({ report: foreign.report, revision: f.revision, assessment: f.assessment, generatedAt })).toThrow();
        break;
      }
      case "year_comparison": {
        const response = Explanation.queryReadingExplanation(f.index, { topic: "year_comparison", year: p.year, comparisonYear: p.comparisonYear });
        expect(response.status).toBe("answered"); expect(response.conclusions.length).toBeGreaterThan(0);
        expect(Explanation.queryReadingExplanation(f.index, { topic: "year_comparison", year: p.year, comparisonYear: 2099 }).status).not.toBe("answered");
        break;
      }
      case "neutral_money": {
        const raw = originalJudgments(f)[0].judgment.axes.find((item: any) => item.axis === "pattern");
        expect(raw.stemActions.items[0]).toMatchObject({ tenGod: "偏财", effect: "unresolved" });
        for (const domain of segments(f)[0].domainEvidence.filter((item: any) => item.domain !== "relationship")) {
          expect(domain.sentences.every((sentence: any) => sentence.kind === "topic")).toBe(true);
          expect(domain.sentences.map((sentence: any) => sentence.text).join(" ")).not.toMatch(/有冲突|更容易受制|已有的财作用帮助|有改善条件/u);
        }
        break;
      }
      case "unknown_hour": {
        const unknown = await build(source, { unknownHour: true });
        expect(unknown.report.sourceBinding.includeHour).toBe(false); expect(unknown.report.plainReading.outlook.branches).toEqual([]);
        expect(unknown.report.plainReading.limitations.join(" ")).toContain("出生时辰未确定");
        expect(Explanation.queryReadingExplanation(unknown.index, { topic: "month", year: source.years[0] }).status).not.toBe("answered");
        break;
      }
      case "personal_adoption": observation.detail = await adoption(f); break;
      case "mixed_scope": case "specific_actor": {
        let checked = 0, checkedMonthActors = 0;
        const observedMonthEffects = new Set<string>();
        for (const part of segments(f)) for (const domain of part.domainEvidence) for (const sentence of domain.sentences) {
          expect(sentence.sources.length).toBeGreaterThan(0); checked++;
        }
        expect(checked).toBeGreaterThan(0);
        for (const prepared of f.extras.keyMonthYears) for (const month of prepared.monthly.months) for (const part of month.judgmentSegments) {
          const plain = segments(f).flatMap((segment: any) => segment.monthWindows.flatMap((window: any) => window.members)).find((member: any) => member.periodId === part.id);
          if (!plain) continue;
          for (const topic of plain.topics) for (const fact of topic.facts) if (fact.actionIndex !== null) {
            const axis = part.judgment.axes.find((item: any) => item.id === fact.axisId);
            const action = axis?.stemActions?.items[fact.actionIndex];
            expect(action?.tenGod).toBe(fact.actor);
            observedMonthEffects.add(action.effect); checkedMonthActors++;
            if (["neutral", "unresolved"].includes(action.effect)) expect(fact.kind).toBe("topic");
          }
        }
        expect(checkedMonthActors).toBeGreaterThan(0);
        if (item.operation === "mixed_scope") {
          // This case mixes resolved and undirected MONTH scopes, not a claim
          // that this family's annual pattern has effect="mixed".
          expect(observedMonthEffects.has("unresolved")).toBe(true);
          expect(observedMonthEffects.has("obstructs")).toBe(true);
        }
        observation.detail = { checkedMonthActors, observedMonthEffects: [...observedMonthEffects], annualMixedEffectClaimed: false };
        break;
      }
      case "no_financial_actor": {
        const prepared = f.extras.keyMonthYears[0], selected = prepared.monthly.months.filter((month: any) => p.months.includes(month.label));
        expect(selected).toHaveLength(p.months.length);
        for (const month of selected) for (const part of month.judgmentSegments) {
          const actions = part.judgment.axes.find((axis: any) => axis.axis === "pattern").stemActions.items;
          expect(actions.some((action: any) => ["正财", "偏财"].includes(action.tenGod))).toBe(false);
          const shown = segments(f).flatMap((segment: any) => segment.monthWindows.flatMap((window: any) => window.members)).find((member: any) => member.periodId === part.id);
          expect(JSON.stringify(shown)).not.toMatch(/已有的财作用帮助|已出现收入增加/u);
        }
        break;
      }
      case "child_language": {
        const child = p.year ? await build(source, { years: [p.year, p.year] }) : f;
        const life = child.report.plainReading.domains.flatMap((domain: any) => [domain.title, domain.headline, ...domain.paragraphs]).join(" ")
          + segments(child).flatMap((part: any) => part.domains.map((domain: any) => domain.text)).join(" ");
        expect(life).not.toMatch(/岗位|工资|升职|订婚|夫妻|伴侣|客户/u);
        break;
      }
      case "age_boundary": {
        const boundary = await build(source, { years: [p.year, p.year] }); assertSourceAndScopes(boundary);
        const rawAges = boundary.extras.annualLifeStories.years.flatMap((year: any) => year.branches.flatMap((branch: any) => branch.segments.map((part: any) => part.age)));
        expect(rawAges.some((age: any) => age.segments?.length > 1)).toBe(true);
        const body = textOf(boundary); expect(body).toMatch(/未成年|成年|岁/u);
        for (const event of boundary.report.eventOutlook.flatMap((group: any) => group.branches.flatMap((branch: any) => branch.items))) if (["romance", "commitment", "separation"].includes(event.category)) {
          const adultBoundary = source.birth.replace(/^\d{4}/u, String(Number(source.birth.slice(0, 4)) + 18)).replace(" ", "T") + ":00+08:00";
          expect(Date.parse(event.startInstant)).toBeGreaterThanOrEqual(Date.parse(adultBoundary));
        }
        break;
      }
      case "before_birth": {
        const before = await build(source, { years: [p.year, p.year] }); assertSourceAndScopes(before);
        expect(textOf(before)).toMatch(/出生前|尚未出生|不作/u);
        expect(before.report.eventOutlook.flatMap((group: any) => group.branches.flatMap((branch: any) => branch.items))).toEqual([]);
        break;
      }
      case "unknown_direction": {
        const unknown = await build(source, { sex: "unspecified" }); assertSourceAndScopes(unknown);
        expect(unknown.report.plainReading.outlook.branches.map((branch: any) => branch.id)).toEqual(["forward", "backward"]);
        break;
      }
      default: throw new Error("Unimplemented evaluation operation: " + item.operation);
    }
    observation.status = "passed";
  } catch (error) { observation.error = String(error); throw error; }
  finally { observation.durationMs = Date.now() - startedAt; metrics.push(observation); }
}, 120_000);
