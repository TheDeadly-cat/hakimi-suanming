import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BirthInput } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { EVIDENCE_SUBJECTS } from "@hakimi/knowledge-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, knowledgeRepository } from "@hakimi/storage";
import { buildKnowledgeSearch } from "../lib/knowledge-route";
import { KnowledgePage } from "./knowledge-page";

const input: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

beforeEach(async () => {
  window.history.replaceState({}, "", "/knowledge");
  await caseRepository.clearAll();
});

afterEach(async () => {
  await caseRepository.clearAll();
});

describe("KnowledgePage + IndexedDB", () => {
  it("建立独立 chart_field 引用而不改写修订 facts", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "知识引用样本", calculated });
    const revision = bundle.revisions[0];
    const factsBefore = structuredClone(revision.facts);
    const content = "# 日柱原文\n日柱以日干支记录当日的干支候选。";
    const document = await knowledgeRepository.createDocument({
      title: "日柱研究摘录",
      author: "研究者",
      edition: "第一版",
      sourceNote: "集成测试",
      fileName: "日柱研究摘录.md",
      format: "markdown",
      content,
      byteSize: new Blob([content]).size
    });
    const target = {
      kind: "chart_field" as const,
      caseId: bundle.caseRecord.id,
      revisionId: revision.id,
      field: "pillars.day.ganZhi"
    };
    window.history.replaceState({}, "", `/knowledge${buildKnowledgeSearch({ documentId: document.id, target })}`);

    render(<KnowledgePage />);
    expect((await screen.findByRole("link", { name: "返回当前命盘" })).getAttribute("href"))
      .toBe(`/cases/${bundle.caseRecord.id}/revisions/${revision.id}`);
    fireEvent.click(await screen.findByRole("button", { name: "引用第 2 行" }));
    fireEvent.click(screen.getByRole("button", { name: "建立候选引用" }));

    await waitFor(async () => expect(await knowledgeRepository.listCitationsByDocument(document.id)).toHaveLength(1));
    const [citation] = await knowledgeRepository.listCitationsByDocument(document.id);
    expect(citation).toMatchObject({
      documentId: document.id,
      documentContentHash: document.contentHash,
      locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
      quote: "日柱以日干支记录当日的干支候选。",
      targets: [target],
      status: "user_candidate"
    });
    const after = await caseRepository.getCase(bundle.caseRecord.id);
    expect(after?.revisions[0].facts).toEqual(factsBefore);
  });

  it("把同一原文绑定为全局 evidence_subject，而不是复制到每个案例字段", async () => {
    const subject = EVIDENCE_SUBJECTS.find((item) => item.fieldPaths.includes("pillars.day.hiddenStems"))!;
    const content = "# 藏干\n巳中藏丙戊庚。";
    const document = await knowledgeRepository.createDocument({
      title: "藏干研究摘录",
      author: "研究者",
      edition: "个人摘录",
      sourceNote: "集成测试",
      sourceUrl: null,
      publisher: "",
      publicationYear: null,
      fileName: "藏干研究摘录.md",
      format: "markdown",
      content,
      byteSize: new Blob([content]).size
    });
    const target = { kind: "evidence_subject" as const, subjectId: subject.subjectId };
    window.history.replaceState({}, "", `/knowledge${buildKnowledgeSearch({ documentId: document.id, target })}`);

    render(<KnowledgePage />);
    fireEvent.click(await screen.findByRole("button", { name: "引用第 2 行" }));
    fireEvent.click(screen.getByRole("button", { name: "建立候选引用" }));

    await waitFor(async () => expect(await knowledgeRepository.listCitationsByTarget(target)).toHaveLength(1));
    const [citation] = await knowledgeRepository.listCitationsByTarget(target);
    expect(citation).toMatchObject({
      targets: [target],
      targetKeys: [`evidence_subject:${subject.subjectId}`],
      status: "user_candidate",
      reviewAttestations: []
    });
  });
});
