import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ContextualDomainReading } from "../lib/local-contextual-reading";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading } from "../lib/local-personal-reading";
import { ContextualReadingProvider, ContextualReadingScope } from "./contextual-reading-provider";
import { PersonalReadingProvider, PersonalReadingScope } from "./personal-reading-note";

const reading: ContextualDomainReading = { subjectId: "contextual-chapter-relationships", title: "关系", headline: "背景原标题", summary: "背景原结论。",
  paragraphs: ["背景原完整说明。"], examples: [], focus: [], basis: [], contextLabel: "合成单身背景", sourceVersions: ["test-context/1"],
  scope: { kind: "natal", chapterId: "relationships", referenceYear: 2026 } };
const reference = { noteId: "synthetic-context", editVersion: 1, bodySha256: "a".repeat(64) };
const projection = { subjectId: reading.subjectId, reference, referenceYear: 2026, sourceVersions: [...reading.sourceVersions] };
afterEach(cleanup);
function view(projected = projection, personal: LocalPersonalReading | null = null) {
  return <PersonalReadingProvider reading={personal}><ContextualReadingProvider readings={[reading]} contextRef={reference} referenceYear={2026}>
    <ContextualReadingScope baseSubjectId="chapter-relationships" projectedContext={projected}>
      <PersonalReadingScope subjectId="chapter-relationships"><p>本次同源关系答案。</p></PersonalReadingScope>
    </ContextualReadingScope>
  </ContextualReadingProvider></PersonalReadingProvider>;
}
describe("current-context relationship projection", () => {
  it("presents the matched answer and keeps the original contextual panel in a labelled disclosure", () => {
    render(view());
    expect(screen.getByText("本次同源关系答案。").closest("details")).toBeNull();
    expect(screen.getByText("背景原完整说明。").closest("details")!.open).toBe(false);
    expect(screen.getByText("查看背景原说明")).toBeTruthy();
  });
  it("does not promote a projection from another context revision, year, subject or reading version", () => {
    const changed = [
      { ...projection, reference: { ...reference, bodySha256: "b".repeat(64) } },
      { ...projection, referenceYear: 2027 },
      { ...projection, subjectId: "contextual-chapter-career" },
      { ...projection, sourceVersions: ["test-context/0"] }
    ];
    for (const value of changed) {
      const rendered = render(view(value));
      expect(screen.getByText("背景原结论。").closest("details")).toBeNull();
      expect(screen.getByText("本次同源关系答案。").closest("details")!.open).toBe(false);
      rendered.unmount();
    }
  });
  it("retains both chapter and contextual personal-adoption display boundaries", () => {
    for (const subjectId of ["chapter-relationships", reading.subjectId]) {
      const personal: LocalPersonalReading = { version: LOCAL_PERSONAL_READING_VERSION,
        sourceBinding: { caseId: "synthetic", revisionId: "synthetic", chartResultHash: "a".repeat(64), includeHour: true }, sourceVersions: [], issues: [],
        entries: [{ subjectId, subjectLabel: "合成个人关系说明", originalConclusion: "原文", readingVersions: [], state: "adopted", personalText: "本人已采用的关系原文。",
          effectiveConclusion: "本人已采用的关系原文。", feedback: [], selectedReviewRefs: [], issues: [] }] };
      const rendered = render(view(projection, personal));
      expect(screen.getByText("本人已采用的关系原文。").closest("details")).toBeNull();
      expect(screen.getByText("本次同源关系答案。").closest("details")!.open).toBe(false);
      rendered.unmount();
    }
  });
});
