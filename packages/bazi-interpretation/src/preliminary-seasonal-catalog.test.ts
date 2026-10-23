import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PRELIMINARY_SEASONAL_CATALOG, PRELIMINARY_SEASONAL_COVERAGE, PRELIMINARY_SEASONAL_SOURCES } from "./preliminary-seasonal-catalog";
import { QIONGTONG_SEASONAL_COVERAGE } from "./preliminary-qiongtong-catalog";

const stems = [..."甲乙丙丁戊己庚辛壬癸"];
const branches = [..."寅卯辰巳午未申酉戌亥子丑"];
const rule = (key: string) => PRELIMINARY_SEASONAL_CATALOG.find((entry) => entry.dayStem + entry.monthBranch === key)!;
const source = (key: string) => PRELIMINARY_SEASONAL_SOURCES.find((entry) => entry.id === rule(key).sourceIds[0])!;

describe("checked Qiongtong seasonal catalogue", () => {
  it("covers 120 slots with 119 fixed-transcription rules and one independent facsimile", () => {
    const keys = PRELIMINARY_SEASONAL_CATALOG.map((entry) => entry.dayStem + entry.monthBranch);
    expect(keys).toHaveLength(120);
    expect(new Set(keys).size).toBe(120);
    expect(PRELIMINARY_SEASONAL_COVERAGE).toEqual({ expectedSlots: 120, checkedRules: 120, fixedWikisourceRules: 119, independentFacsimileRules: 1 });
    expect(QIONGTONG_SEASONAL_COVERAGE.checkedRules).toBe(119);
    expect(QIONGTONG_SEASONAL_COVERAGE.unresolved.map((entry) => entry.dayStem + entry.monthBranch)).toEqual(["乙丑"]);
    expect([...keys].sort()).toEqual(stems.flatMap((stem) => branches.map((branch) => stem + branch)).sort());
  });

  it("keeps the previously checked Xin-Shen rule and source identity", () => {
    expect(rule("辛申")).toEqual({
      id: "qiongtong-xin-shen-v1", dayStem: "辛", monthBranch: "申",
      headline: "辛金申月：优先考察壬水，甲戊依条件配合",
      summary: "按《穷通宝鉴》辛金申月条，壬是优先考察的调剂用字；甲疏土、戊节水各有适用条件。已有壬甲时重点在配合与适量，不等于继续增加水木。",
      preferredStems: ["壬"],
      conditionalStems: [
        { stem: "甲", condition: "土重阻水时可疏土；只见藏戊不自动判为土重。" },
        { stem: "戊", condition: "金水偏泛时可节水；水势未过时不能一概增加土。" }
      ],
      cautions: ["原文并不主张壬越多越好；透藏次数不能直接替代水土作用强度。", "此条按节令申月匹配，不按公历七月或农历初一切换。"],
      sourceIds: ["preliminary-qiongtong-xin-shen"]
    });
    expect(source("辛申").excerpt).toBe("壬水为尊，甲戊酌用可也。");
  });

  it("does not flatten the equinox and context-dependent alternatives into primary stems", () => {
    expect(rule("乙酉").preferredStems).toEqual([]);
    expect(rule("乙酉").conditionalStems).toEqual(expect.arrayContaining([
      expect.objectContaining({ stem: "癸", condition: expect.stringContaining("秋分前") }),
      expect.objectContaining({ stem: "丙", condition: expect.stringContaining("秋分后") })
    ]));
    expect(rule("丁午").preferredStems).toEqual([]);
    expect(rule("丁午").conditionalStems.find((entry) => entry.stem === "壬")?.condition).toContain("年干隔位透壬");
    expect(rule("丁午").conditionalStems.find((entry) => entry.stem === "甲")?.condition).toContain("无火局");
    expect(rule("丙亥").preferredStems).toEqual([]);
    expect(rule("癸辰").preferredStems).toEqual(["丙"]);
    expect(rule("癸辰").conditionalStems.every((entry) => entry.condition.includes("谷雨后"))).toBe(true);
  });

  it("uses complete useful short clauses instead of the beginning of arbitrary source paragraphs", () => {
    expect(source("甲寅").excerpt).toBe("癸藏丙透，名寒木向阳");
    expect(source("甲卯").excerpt).toBe("二月甲木，庚金得所，名阳刃驾杀");
    expect(source("甲辰").excerpt).toBe("三月甲木，木气相竭。先取庚金，次用壬水。");
    for (const entry of PRELIMINARY_SEASONAL_SOURCES) {
      expect(entry.excerpt).not.toMatch(/死无棺|刑妻|剋子|克子|残疾|贫贱|富贵双全|必主|方许$/u);
      expect(entry.excerpt).not.toMatch(/[，；：]$/u);
    }
  });

  it("keeps exceptional priorities and month-specific distinctions", () => {
    expect(rule("庚辰").cautions.join("")).toContain("不用庚劈甲");
    expect(rule("辛未").cautions.join("")).toContain("不可见甲");
    expect(rule("壬寅").conditionalStems.find((entry) => entry.stem === "戊")?.condition).toContain("由弱复旺");
    expect(rule("戊午").preferredStems[0]).toBe("壬");
    expect(rule("戊未").preferredStems[0]).toBe("癸");
    expect(rule("辛亥").preferredStems).toEqual(["壬", "丙"]);
    expect(rule("辛丑").preferredStems).toEqual(["丙", "壬"]);
  });

  it("labels seasonal and shared paragraphs honestly instead of inventing monthly originals", () => {
    for (const key of ["丁亥", "丁丑", "己巳", "己午", "己未", "己子", "己丑"]) {
      expect(source(key).provenance?.scope).toBe("season");
    }
    for (const key of ["戊寅", "戊卯", "戊子", "戊丑"]) expect(source(key).provenance?.scope).toBe("month_group");
    expect(QIONGTONG_SEASONAL_COVERAGE.unresolved[0]?.reason).toContain("不能确认适用于丑月");
  });

  it("adds Yi-Chou only from the independently identified large-type twelfth-month facsimile", () => {
    expect(rule("乙丑").preferredStems).toEqual(["丙"]);
    expect(rule("乙丑").conditionalStems).toEqual([
      { stem: "甲", condition: "原文以一派戊己为前提，才另参甲木；不因月支丑或仅有藏己就自动判定土重。" }
    ]);
    expect(rule("乙丑").conditionalStems.some((entry) => entry.stem === "丁")).toBe(false);
    expect(source("乙丑").url).toContain(".pdf#page=69");
    expect(source("乙丑").provenance?.revisionId).toBeUndefined();
    const page = source("乙丑").provenance!.facsimile!;
    expect(page).toMatchObject({ pdfPageOneBased: 69, printedPage: "五九", originalLargeTypeOnly: true });
    expect(page.variantNote).toContain("块144为十一月");
    expect(page.clauses.find((entry) => entry.role === "conditional")?.transcription).toContain("或一派戊己");
    for (const clause of page.clauses) expect(clause.sha256).toBe(createHash("sha256").update(clause.transcription, "utf8").digest("hex"));
  });

  it("binds every used stem and short excerpt to the fixed source witnesses", () => {
    const ids = new Set(PRELIMINARY_SEASONAL_SOURCES.map((entry) => entry.id));
    expect(ids.size).toBe(120);
    for (const entry of PRELIMINARY_SEASONAL_CATALOG) {
      expect(entry.sourceIds).toHaveLength(1);
      expect(ids.has(entry.sourceIds[0]!)).toBe(true);
      const witness = PRELIMINARY_SEASONAL_SOURCES.find((candidate) => candidate.id === entry.sourceIds[0])!;
      expect(witness.provenance?.excerptSha256).toBe(createHash("sha256").update(witness.excerpt, "utf8").digest("hex"));
      if (witness.provenance?.kind === "facsimile_page") {
        expect(witness.provenance.facsimile?.pdfSha256).toMatch(/^[a-f0-9]{64}$/u);
        expect(witness.provenance.facsimile?.pageImageSha256).toMatch(/^[a-f0-9]{64}$/u);
        expect(witness.provenance.paragraphs).toEqual([]);
        expect(witness.provenance.stemEvidence).toEqual([]);
        continue;
      }
      expect(witness.url).toContain("oldid=2294674");
      expect(witness.provenance?.revisionId).toBe(2294674);
      expect(witness.provenance?.paragraphs.length).toBeGreaterThan(0);
      for (const paragraph of witness.provenance!.paragraphs) expect(paragraph.sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(entry.preferredStems.some((stem) => entry.conditionalStems.some((item) => item.stem === stem))).toBe(false);
      for (const [role, selected] of [["preferred", entry.preferredStems], ["conditional", entry.conditionalStems.map((item) => item.stem)]] as const) {
        for (const stem of selected) {
          expect(stems).toContain(stem);
          const mapping = witness.provenance!.stemEvidence.find((item) => item.role === role && item.stem === stem);
          expect(mapping?.paragraphIndexes.length).toBeGreaterThan(0);
          expect(mapping!.paragraphIndexes.every((index) => witness.provenance!.paragraphs.some((p) => p.index === index))).toBe(true);
        }
      }
    }
  });
});
