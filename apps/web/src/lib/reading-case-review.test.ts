import { describe, expect, it } from "vitest";
import { buildReadingCaseReviewEntry, caseReviewNoteReference, emptyReadingCaseReviewDraft, exportReadingCaseReviewThread,
  loadReadingCaseReviewTargets, parseReadingCaseReview, readReadingCaseReviewThread } from "./reading-case-review";
import { syntheticIndexedReport, syntheticReviewIndex, syntheticReviewNote } from "../test/reading-case-review-fixture";
import { encodeReadingReportBundle } from "./local-reading-report-bundle";
import { LOCAL_READING_SNAPSHOT_TAG } from "./local-reading-record";

const facts = () => ({ ...emptyReadingCaseReviewDraft(), fact: { occurredAt: "2027 年 8 月，具体日期不详", description: "实际项目延后交付。\r\n本人原文 🌿 e\u0301" },
  evaluation: { category: "contradicted_by_facts" as const, notes: "这句把承担任务和兑现混在了一起。" } });
async function start() {
  const report = await syntheticIndexedReport(), target = (await loadReadingCaseReviewTargets(report))[0]!;
  const first = syntheticReviewNote(await buildReadingCaseReviewEntry(target, await readReadingCaseReviewThread(target, [report]), facts(), [report]));
  return { report, target, first };
}
describe("specific conclusion case review", () => {
  it("binds the exact saved report, generation time, source snapshot and separate occurrence/recording times", async () => {
    const { report, target, first } = await start(), parsed = parseReadingCaseReview(first.body);
    expect(parsed.kind).toBe("entry"); if (parsed.kind !== "entry") throw new Error();
    expect(parsed.value.target.reportRef).toEqual(await caseReviewNoteReference(report));
    expect(parsed.value.target).toEqual(target);
    expect(parsed.value.fact).toEqual(facts().fact); expect(parsed.value.evaluation).toEqual(facts().evaluation);
    expect(parsed.value.target.generatedAt).toBe("2026-10-24T01:00:00.000Z");
    expect(parsed.value.target.sourceSnapshot.context).toEqual(syntheticReviewIndex().sourceSnapshot.context);
    expect(parsed.value.target.uncertainty.pillarStatus).toBe("unavailable");
    const exported = exportReadingCaseReviewThread(target, await readReadingCaseReviewThread(target, [report, first]));
    expect(exported).toContain(`记录时间：${first.createdAt}`); expect(exported).toContain(facts().fact.occurredAt);
    expect(exported).toContain(target.conclusion.text); expect(exported).toContain(first.body);
    expect(exported).toContain("不计算准确率"); expect(parsed.value).not.toHaveProperty("accuracy");
  });
  it("keeps missing feedback distinct from a review and allows not-yet-due without invented facts", async () => {
    const { report, target } = await start(), empty = await readReadingCaseReviewThread(target, [report]);
    expect(empty).toMatchObject({ entries: [], latest: null, canAppend: true });
    const body = await buildReadingCaseReviewEntry(target, empty, { ...emptyReadingCaseReviewDraft(), evaluation: { category: "not_yet_due", notes: "要等到 2027 年" } }, [report]);
    const parsed = parseReadingCaseReview(body); expect(parsed.kind).toBe("entry");
    if (parsed.kind === "entry") { expect(parsed.value.fact.description).toBe(""); expect(parsed.value.evaluation.category).toBe("not_yet_due"); }
    await expect(buildReadingCaseReviewEntry(target, empty, emptyReadingCaseReviewDraft(), [report])).rejects.toThrow("后续事实");
    await expect(buildReadingCaseReviewEntry(target, empty, { ...emptyReadingCaseReviewDraft(), evaluation: { category: "consistent_with_facts", notes: "感觉符合" } }, [report])).rejects.toThrow("单独填写");
  });
  it("exports the frozen citation text and input uncertainty even before any later facts exist", async () => {
    const index = syntheticReviewIndex(), conclusion = index.conclusions[0]!;
    index.sources = [{ id: "synthetic-source", title: "合成来源", url: "https://example.test/source", locator: "合成段落", excerpt: "声明为合成引文；只验证字节保留。", interpretation: "不用于命理判断。" }];
    conclusion.evidence.citations = ["synthetic-source"];
    index.citationBindings = [{ conclusionId: conclusion.stableId, sourceId: "synthetic-source", producerField: "synthetic.field", usageNote: "合成测试关联" }];
    const report = await syntheticIndexedReport(index), target = (await loadReadingCaseReviewTargets(report))[0]!;
    const text = exportReadingCaseReviewThread(target, await readReadingCaseReviewThread(target, [report]));
    expect(target.evidenceSources).toEqual(index.sources); expect(target.citationBindings).toEqual(index.citationBindings);
    expect(text).toContain(index.sources[0]!.excerpt); expect(text).toContain(index.uncertainty.note); expect(text).toContain(index.limitations[0]!);
    expect(text).toContain("无后续事实或未评价，不自动计为成功或失败");
  });
  it("appends corrections without replacing the original conclusion, prior facts, or evaluation", async () => {
    const { report, target, first } = await start(), before = JSON.stringify([report, first]);
    const firstThread = await readReadingCaseReviewThread(target, [first, report]);
    const second = syntheticReviewNote(await buildReadingCaseReviewEntry(target, firstThread, { ...facts(), correctionOf: firstThread.latest!.ref,
      correctionReason: "核对日历后，更正发生月份。", fact: { occurredAt: "2027 年 9 月", description: "补充实际的验收时间。" },
      evaluation: { category: "evidence_insufficient", notes: "原事实不足以评价全年。" } }, [report, first]), { createdAt: "2026-10-24T04:00:00.000Z", updatedAt: "2026-10-24T04:00:00.000Z" });
    const chain = await readReadingCaseReviewThread(target, [second, report, first]);
    expect(chain.canAppend).toBe(true); expect(chain.entries.map(entry => entry.record.id)).toEqual([first.id, second.id]);
    expect(chain.latest?.value.previous).toEqual(firstThread.latest!.ref); expect(chain.latest?.value.correctionOf).toEqual(firstThread.latest!.ref);
    expect(chain.entries[0]!.value.fact).toEqual(facts().fact); expect(JSON.stringify([report, first])).toBe(before);
    await expect(buildReadingCaseReviewEntry(target, firstThread, { ...facts(), correctionOf: firstThread.latest!.ref, correctionReason: "" }, [report, first])).rejects.toThrow("更正哪一处");
  });
  it("stops on forks, edits, missing prior records and archived records without treating them as no feedback", async () => {
    const { report, target, first } = await start(), firstThread = await readReadingCaseReviewThread(target, [first]);
    const next = syntheticReviewNote(await buildReadingCaseReviewEntry(target, firstThread, facts(), [report, first]));
    const fork = syntheticReviewNote(first.body);
    for (const records of [[first, fork], [next], [{ ...first, editVersion: 2 }], [{ ...first, body: first.body + "被编辑" }],
      [{ ...first, body: "结构被删掉，只留下普通文字。" }], [{ ...first, lifecycle: "archived" as const }]]) {
      const result = await readReadingCaseReviewThread(target, records);
      expect(result.canAppend).toBe(false); expect(result.latest).toBeNull(); expect(result.issues.length).toBeGreaterThan(0);
    }
    expect(parseReadingCaseReview(first.body + "被编辑").kind).toBe("invalid");
    expect(parseReadingCaseReview("<!-- hakimi.reading-case-review/99\n{}\n-->\n\n旧文").kind).toBe("invalid");
  });
  it("leaves legacy reports unindexed and refuses shifted report version, source or generation times", async () => {
    const old = syntheticReviewNote(await encodeReadingReportBundle({ reading: "旧阅读稿", archive: "旧档案", version: "hakimi.local-reading-edition/0.21.1" }), { tags: [LOCAL_READING_SNAPSHOT_TAG] });
    expect(await loadReadingCaseReviewTargets(old)).toEqual([]);
    const report = await syntheticIndexedReport();
    await expect(loadReadingCaseReviewTargets({ ...report, caseId: crypto.randomUUID() })).rejects.toThrow("保存位置");
    await expect(loadReadingCaseReviewTargets({ ...report, createdAt: "2026-10-24T00:00:00.000Z" })).rejects.toThrow("晚于保存");
    const before = JSON.stringify(report); await loadReadingCaseReviewTargets(report); expect(JSON.stringify(report)).toBe(before);
  });
});
