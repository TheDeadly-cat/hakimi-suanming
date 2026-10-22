import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { calculatePillarRelations } from "@hakimi/relations-core";
import { buildBaziPreliminaryAssessment } from "./preliminary-assessment";
import { buildNatalRelationshipFoundation, NATAL_RELATIONSHIP_FOUNDATION_VERSION } from "./natal-relationship-foundation";
import { NATAL_RELATIONSHIP_SOURCES } from "./natal-relationship-sources";

async function revisionFor(date: string, time = "08:26", sex: "male" | "female" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false, location: { label: "Synthetic relationship foundation", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic only" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
const read = (revision: RevisionRecord) => buildNatalRelationshipFoundation(revision, buildBaziPreliminaryAssessment(revision));
let a: RevisionRecord, female: RevisionRecord, onlyHidden: RevisionRecord, hourOnly: RevisionRecord, absent: RevisionRecord[];
beforeAll(async () => {
  [a, female, onlyHidden, hourOnly] = await Promise.all([revisionFor("1995-08-18"), revisionFor("2019-12-22", "11:23", "female"), revisionFor("1995-08-18", "08:26", "female"), revisionFor("1991-07-08", "16:26")]);
  absent = await Promise.all([revisionFor("1991-07-08", "06:26"), revisionFor("1991-07-07", "06:26")]);
});

describe("natal relationship foundation from selected facts", () => {
  it("keeps direct wealth and related indirect wealth distinct, with exact positions and original binary facts", () => {
    const result = read(a), wealth = result.perspectives[0]!;
    expect(result.version).toBe(NATAL_RELATIONSHIP_FOUNDATION_VERSION);
    expect(wealth.id).toBe("wealth"); expect(wealth.primaryTenGods).toEqual(["正财"]); expect(wealth.relatedTenGods).toEqual(["偏财"]);
    expect(wealth.occurrences.filter((o) => o.visibility === "visible").map((o) => [o.position, o.stem, o.tenGod])).toEqual([["year", "乙", "偏财"], ["month", "甲", "正财"]]);
    expect(wealth.occurrences.find((o) => o.position === "hour" && o.stem === "乙")!.visibility).toBe("residual_hidden");
    expect(result.dayPalace.branch).toBe("巳");
    const palace = result.interactions.filter((i) => i.scope === "day_palace");
    expect(palace.map((i) => i.fact.relationType)).toEqual(expect.arrayContaining(["branch_six_combination", "branch_six_clash"]));
    expect(result.relationship.headline).toContain("合冲并存");
    const original = calculatePillarRelations(a.facts).facts;
    for (const interaction of result.interactions) expect(interaction.fact).toEqual(original.find((f) => f.id === interaction.fact.id));
    for (const interaction of palace) expect(interaction.fact.participants.every((p) => p.component === "branch")).toBe(true);
  });

  it("uses the female authority perspective without assuming the same investment theme as a male chart", () => {
    const result = read(female), authority = result.perspectives[0]!;
    expect(authority.id).toBe("authority"); expect(authority.primaryTenGods).toEqual(["正官", "七杀"]);
    expect(authority.occurrences.filter((o) => o.visibility === "visible").map((o) => [o.position, o.stem, o.tenGod])).toEqual([["year", "己", "七杀"], ["hour", "戊", "正官"]]);
    expect(result.relationship.headline).toContain("正官与七杀同透"); expect(result.relationship.verdict).toContain("明确承诺和临时要求");
    expect(result.sources.some((s) => s.id === "relationship-foundation-smt-female-mapping")).toBe(true);
    expect(result.relationship.headline).not.toBe(read(a).relationship.headline);
  });

  it("retains hidden-only authority without manufacturing a visible star or a stem interaction", () => {
    const result = read(onlyHidden), occurrences = result.perspectives[0]!.occurrences;
    expect(occurrences.length).toBeGreaterThan(0); expect(occurrences.every((o) => o.visibility !== "visible")).toBe(true);
    expect(result.relationship.headline).toContain("官杀只在藏干层");
    expect(result.interactions.filter((i) => i.scope === "visible_star")).toEqual([]);
  });

  it("keeps two actual missing-wealth charts empty and still gives substantive palace-based answers", () => {
    for (const revision of absent) {
      const result = read(revision);
      expect(result.perspectives[0]!.occurrences).toEqual([]); expect(result.relationship.headline).toContain("财星未见");
      expect(result.relationship.verdict).toContain("日支"); expect(result.relationship.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(result.conditions.join()).toContain("不据此推出无婚");
    }
  });

  it.each(["unknown_hour", "date_only"] as const)("excludes the actual hour-only star, roots and interactions for %s", (precision) => {
    expect(read(hourOnly).perspectives[0]!.occurrences.every((o) => o.position === "hour")).toBe(true);
    const projection = structuredClone(hourOnly); projection.input.time = null; projection.input.timePrecision = precision;
    const result = read(projection);
    expect(result.sourceBinding.includeHour).toBe(false); expect(result.perspectives[0]!.occurrences).toEqual([]);
    expect(result.interactions.every((i) => i.fact.participants.every((p) => p.position !== "hour"))).toBe(true);
    expect(result.dayPalace.hidden.flatMap((o) => o.roots).every((root) => root.position !== "hour")).toBe(true);
    const changedHour = structuredClone(projection); changedHour.facts.pillars.hour = structuredClone(a.facts.pillars.hour);
    expect(read(changedHour)).toEqual(result);
    // A stored scope projection, not a claimed unknown-birth calculateChart result.
  });

  it("keeps unspecified sex as parallel perspectives rather than selecting one from the facts", async () => {
    const revision = await revisionFor("1995-08-18", "08:26", "unspecified"), result = read(revision);
    expect(result.sourceBinding.sex).toBe("unspecified"); expect(result.perspectives.map((p) => p.id)).toEqual(["wealth", "authority"]);
    expect(result.relationship.headline).toContain("两种视角并列");
    expect(result.sources.some((s) => s.id === "relationship-foundation-smt-female-mapping")).toBe(true);
  });

  it("keeps visible-star stem combinations separate from a day-palace branch combination", () => {
    const result = read(female), interactions = result.interactions.filter((i) => i.scope === "visible_star");
    expect(interactions.length).toBeGreaterThan(0);
    const visibleIds = new Set(result.perspectives.flatMap((p) => p.occurrences.filter((o) => o.visibility === "visible").map((o) => o.id)));
    for (const interaction of interactions) {
      expect(interaction.fact.participants.every((p) => p.component === "stem")).toBe(true);
      expect(interaction.starOccurrenceIds.every((id) => visibleIds.has(id))).toBe(true);
      expect(interaction.fact.relationType).not.toMatch(/^branch_/);
    }
    expect(interactions.some((i) => i.fact.participants.some((p) => p.position === "day"))).toBe(true);
  });

  it("rejects source mismatch and malformed selected facts before using hidden roles", () => {
    const assessment = buildBaziPreliminaryAssessment(a);
    for (const binding of [{ revisionId: "33333333-3333-4333-8333-333333333333" }, { chartResultHash: "f".repeat(64) }, { includeHour: false }]) {
      const wrong = structuredClone(assessment); Object.assign(wrong.sourceBinding, binding);
      expect(() => buildNatalRelationshipFoundation(a, wrong)).toThrow("来源不匹配");
    }
    const names = structuredClone(a); names.facts.pillars.month.name = "year";
    expect(() => buildNatalRelationshipFoundation(names, assessment)).toThrow();
    const mismatch = structuredClone(a); mismatch.facts.pillars.day.branchTenGods.pop();
    expect(() => buildNatalRelationshipFoundation(mismatch, assessment)).toThrow();
    const empty = structuredClone(a); empty.facts.pillars.day.hiddenStems = []; empty.facts.pillars.day.branchTenGods = [];
    expect(() => buildNatalRelationshipFoundation(empty, assessment)).toThrow();
    const invalidGod = structuredClone(a); invalidGod.facts.pillars.day.branchTenGods[1] = "invalid-ten-god";
    expect(() => buildNatalRelationshipFoundation(invalidGod, assessment)).toThrow("十神不可识别");
  });

  it("produces full distinct chapter bodies and preserves the input and preliminary facts", () => {
    const assessment = buildBaziPreliminaryAssessment(a), before = structuredClone({ a, assessment }), result = buildNatalRelationshipFoundation(a, assessment);
    expect({ a, assessment }).toEqual(before);
    for (const chapter of [result.relationship, result.family]) {
      expect(chapter.paragraphs.length).toBeGreaterThanOrEqual(3);
      for (const rows of [chapter.strengths, chapter.cautions, chapter.suggestions, chapter.evidence]) expect(rows.length).toBeGreaterThan(0);
      expect([chapter.headline, chapter.verdict, ...chapter.paragraphs].join()).not.toMatch(/必定结婚|一定离婚|注定无婚|必有外遇|必有二婚/);
      expect(chapter.sourceIds.every((id) => result.sources.some((s) => s.id === id))).toBe(true);
    }
    expect(result.family.verdict).toContain("临时援手、灵活调度");
    expect(result.family.verdict).toContain("固定开销、规律照应");
    expect(result.family.paragraphs[0]).toContain("年柱乙亥明透乙偏财");
    expect(result.family.paragraphs[1]).toContain("月柱甲申明透甲正财");
    expect(result.family.strengths).toEqual([...new Set(result.family.strengths)]);
    expect(result.relationship.headline).not.toBe(result.family.headline);
  });

  it("binds each exact short excerpt to its own digest and distinguishes facsimile from the fixed transcription", () => {
    for (const source of NATAL_RELATIONSHIP_SOURCES) expect(createHash("sha256").update(source.excerpt).digest("hex")).toBe(source.provenance!.excerptSha256);
    expect(NATAL_RELATIONSHIP_SOURCES.filter((s) => s.provenance!.kind === "facsimile_page")).toHaveLength(6);
    expect(NATAL_RELATIONSHIP_SOURCES.find((s) => s.provenance!.kind === "wikisource_revision")!.provenance!.revisionId).toBe(2082208);
  });
  it("distinguishes actual direct/indirect print day-palace roles without turning either into a named relative", async () => {
    const direct=read(await revisionFor("1982-10-02","10:26"));
    const indirect=read(await revisionFor("1982-10-10","10:26"));
    expect(direct.dayPalace.mainTenGod).toBe("正印");expect(indirect.dayPalace.mainTenGod).toBe("偏印");
    expect(direct.relationship.verdict).toContain("理解支持与耐心回应");
    expect(indirect.relationship.verdict).toContain("不同理解与专项帮助");
    expect(direct.relationship.paragraphs.join()).toContain("反复代办");
    expect(indirect.relationship.paragraphs.join()).toContain("针对性的办法");
    expect(direct.relationship.cautions).not.toEqual(indirect.relationship.cautions);
    expect(direct.relationship.paragraphs.filter(line=>line.includes("反复代办"))).toHaveLength(1);
    expect(direct.family.paragraphs.join()).not.toContain("保留保留");
    expect([direct,indirect].flatMap(row=>[row.relationship,row.family]).flatMap(chapter=>[chapter.headline,chapter.verdict,...chapter.paragraphs,...chapter.cautions]).join()).not.toMatch(/继母|生母必|父母职业|兄弟几个|子女性别|一定离婚/);
  });
  it("uses exact role and layer evidence to distinguish two real family patterns", async () => {
    const first=read(a), second=read(await revisionFor("1995-05-18"));
    expect(first.family.verdict).toContain("临时援手");expect(first.family.verdict).toContain("固定开销");
    expect(second.family.verdict).toContain("处理难点时的支援");expect(second.family.verdict).toContain("稳定完成小事");
    expect(first.family.verdict).not.toBe(second.family.verdict);
    expect(second.family.cautions.join()).toContain("家庭支持的习惯与日常责任");
    expect(second.family.cautions.join()).not.toContain("个人共同生活");
    expect(first.family.paragraphs[0]).toContain("藏位");expect(second.family.paragraphs[0]).toContain("藏位");
    for(const result of [first,second]) {
      expect(result.family.sourceIds).toEqual(expect.arrayContaining(["relationship-foundation-zq-family-palaces","relationship-foundation-zq-family-role-method","relationship-foundation-smt-star-position"]));
      for(const text of result.family.sourceIds)expect(result.sources.some(source=>source.id===text)).toBe(true);
      for(const interaction of result.interactions.filter(item=>item.fact.participants.some(part=>part.position==="year"||part.position==="month"))) expect(result.family.paragraphs.join()).toContain(interaction.text);
      expect(result.family.evidence.some(line=>line.includes("年柱")&&line.includes("七杀")||line.includes("年柱")&&line.includes("偏财"))).toBe(true);
    }
  });
  it("keeps actual palace and visible-star contacts in separate life explanations", () => {
    const result=read(a), body=result.relationship.paragraphs.join("\n"), family=result.family.paragraphs.join("\n");
    expect(body).toContain("日支巳同时有合与冲");expect(body).toContain("个人相处与家庭原有安排");
    expect(body).toContain("亲近相处与日常分工");
    expect(family).toContain("若与家人共同生活或已有照料任务");
    expect(body).not.toMatch(/合去|已化|已离婚|已结婚/);
    const feminine=read(female), star=feminine.interactions.find(item=>item.scope==="visible_star"&&item.fact.participants.some(part=>part.position==="day"))!;
    expect(feminine.relationship.paragraphs[3]).toContain(star.text);
    expect(feminine.relationship.paragraphs[3]).toContain("说法、承诺与决定");
    expect(feminine.relationship.paragraphs[3]).not.toContain("家务轮换");
  });

});
