import { createHash } from "node:crypto";
import { LunarUtil } from "lunar-typescript";
import { describe, expect, it } from "vitest";
import { OUTLOOK_CLASSICAL_SOURCES, OUTLOOK_CLASSICAL_SOURCES_VERSION } from "./outlook-classical-sources";

describe("classical month-command source provenance", () => {
  it("keeps distinct source and passage identities and exact UTF-8 quotation digests", () => {
    expect(OUTLOOK_CLASSICAL_SOURCES_VERSION).toBe("hakimi.outlook-classical-sources/0.4.0");
    expect(new Set(OUTLOOK_CLASSICAL_SOURCES.map((source) => source.id)).size).toBe(OUTLOOK_CLASSICAL_SOURCES.length);
    const passages = OUTLOOK_CLASSICAL_SOURCES.flatMap((source) => source.passages);
    expect(new Set(passages.map((passage) => passage.id)).size).toBe(passages.length);
    for (const passage of passages) {
      expect(createHash("sha256").update(passage.text, "utf8").digest("hex"), passage.id).toBe(passage.quoteSha256);
      expect(passage.layer).toBe("original");
    }
    const expected = [
      ["outlook-zq-month-command", "814109.html", "month-command-1"],
      ["outlook-zq-official-month-example", "814132.html", "month-official-xue"],
      ["outlook-zq-killing-month-example", "814140.html", "month-killing-yi"],
    ];
    for (const [id, page, passageId] of expected) {
      const source = OUTLOOK_CLASSICAL_SOURCES.find((entry) => entry.id === id)!;
      expect(source.url).toBe(`https://www.tianyashuku.com/yijing/9643/${page}`);
      expect(source.passages[0].id).toBe(passageId);
      expect(source.excerpt).toBe(source.passages[0].text);
      expect(source.crossChecks).toHaveLength(1);
      expect(source.sourceBoundary).toContain("不是影印本校勘");
      expect(source.sourceBoundary).toContain("不核历史人物身份、生日或事件准确率");
    }
  });

  it("the cited original four pillars actually have hidden month authority and visible companions", () => {
    const examples = [
      { id: "outlook-zq-official-month-example", pillars: ["甲申", "壬申", "乙巳", "戊寅"], main: "庚", god: "正官", companions: [["壬", "正印"], ["戊", "正财"]] },
      { id: "outlook-zq-killing-month-example", pillars: ["乙亥", "乙酉", "乙卯", "丁丑"], main: "辛", god: "七杀", companions: [["丁", "食神"]] },
    ];
    for (const example of examples) {
      const source = OUTLOOK_CLASSICAL_SOURCES.find((entry) => entry.id === example.id)!;
      const day = example.pillars[2][0];
      const main = LunarUtil.ZHI_HIDE_GAN[example.pillars[1][1]][0];
      expect(main).toBe(example.main);
      expect(LunarUtil.SHI_SHEN[day + main]).toBe(example.god);
      expect(example.pillars.some((pillar) => pillar[0] === main)).toBe(false);
      for (const [stem, god] of example.companions) {
        expect(example.pillars.some((pillar) => pillar[0] === stem)).toBe(true);
        expect(LunarUtil.SHI_SHEN[day + stem]).toBe(god);
      }
      for (const pillar of example.pillars) expect(source.interpretation).toContain(pillar);
      expect(source.interpretation).toContain("未透");
    }
    const killing = OUTLOOK_CLASSICAL_SOURCES.find((entry) => entry.id === examples[1].id)!;
    expect(killing.excerpt).toContain("煞旺食強而身健");
    expect(killing.textualNotes.join()).toContain("未见丁火根");
  });
});
