import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";

async function fixture(sex: "male" | "unspecified") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic relationship record", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  return { revision, assessment, comprehensive };
}
let sources: Awaited<ReturnType<typeof fixture>>[];
beforeAll(async () => { sources = await Promise.all([fixture("male"), fixture("unspecified")]); });

describe("relationship foundation survives full reporting", () => {
  it.each([0, 1])("keeps star/palace facts, chapter text and verified sources for fixture %s", async (index) => {
    const source = sources[index]!, before = JSON.stringify(source), foundation = source.comprehensive.relationshipFoundation!;
    const body = buildLocalReadingSnapshot(source.assessment, null, { sourceRevision: source.revision, comprehensive: source.comprehensive });
    for (const field of [foundation.sourceBinding, foundation.perspectives, foundation.dayPalace, foundation.interactions]) expect(body).toContain(JSON.stringify(field));
    for (const text of [foundation.version, ...foundation.conditions]) expect(body).toContain(text);
    for (const text of [foundation.relationship, foundation.family]) {
      for (const value of [text.headline, text.verdict, ...text.paragraphs, ...text.evidence, ...text.strengths, ...text.cautions, ...text.suggestions]) expect(body).toContain(value);
    }
    for (const item of foundation.sources) for (const value of [item.title, item.url, item.locator, item.excerpt, item.interpretation]) expect(body).toContain(value);
    expect(await unpackReadingSnapshot(await packReadingSnapshot(body))).toBe(body);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("rejects changed facts, sex, text, omitted metadata and missing source without modifying originals", () => {
    const source = sources[0]!, before = JSON.stringify(source);
    for (const variant of ["sex", "fact", "text", "omit", "source"] as const) {
      const comprehensive = structuredClone(source.comprehensive);
      if (variant === "sex") comprehensive.relationshipFoundation!.sourceBinding.sex = "female";
      else if (variant === "fact") comprehensive.relationshipFoundation!.conditions.push("新增无来源的相处断语");
      else if (variant === "text") comprehensive.chapters.find((item) => item.id === "relationships")!.verdict = "无依据地改写婚恋结论";
      else if (variant === "omit") delete comprehensive.relationshipFoundation;
      else comprehensive.sources = comprehensive.sources!.filter((item) => item.id !== comprehensive.relationshipFoundation!.sources[0]!.id);
      expect(() => buildLocalReadingSnapshot(source.assessment, null, { sourceRevision: source.revision, comprehensive })).toThrow(/婚恋家庭/);
    }
    expect(() => buildLocalReadingSnapshot(source.assessment, null, { comprehensive: source.comprehensive })).toThrow("婚恋家庭解读缺少本次命盘来源");
    expect(JSON.stringify(source)).toBe(before);
  });
});
