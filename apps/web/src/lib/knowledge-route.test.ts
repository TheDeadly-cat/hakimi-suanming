import { describe, expect, it } from "vitest";
import { buildKnowledgeSearch, parseKnowledgeRoute } from "./knowledge-route";

const caseId = "11111111-1111-4111-8111-111111111111";
const revisionId = "22222222-2222-4222-8222-222222222222";

describe("knowledge route", () => {
  it("往返文档、行号与字段引用上下文", () => {
    const search = buildKnowledgeSearch({
      query: "藏干",
      documentId: caseId,
      sectionId: "section-12",
      lineNumber: 18,
      target: { kind: "chart_field", caseId, revisionId, field: "pillars.day.hiddenStems" }
    });
    expect(parseKnowledgeRoute(search)).toEqual({
      view: "library",
      query: "藏干",
      documentId: caseId,
      sectionId: "section-12",
      lineNumber: 18,
      citationId: null,
      target: { kind: "chart_field", caseId, revisionId, field: "pillars.day.hiddenStems" }
    });
  });

  it("丢弃伪造 ID、非法字段、非法 section 和非正行号", () => {
    expect(parseKnowledgeRoute("?document=../x&section=chapter-x&line=-1&target=chart_field&case=x&revision=y&field=<script>"))
      .toEqual({ view: "library", query: "", documentId: null, sectionId: null, lineNumber: null, citationId: null, target: null });
    expect(parseKnowledgeRoute(`?target=chart_field&case=${caseId}&revision=${revisionId}&field=profile.dayBoundary`).target).toBeNull();
  });

  it("往返来源台账、覆盖视图与证据主题", () => {
    expect(parseKnowledgeRoute(buildKnowledgeSearch({
      view: "coverage",
      target: { kind: "evidence_subject", subjectId: "bazi.pillars.day.hidden-stems.v1" }
    }))).toMatchObject({
      view: "coverage",
      target: { kind: "evidence_subject", subjectId: "bazi.pillars.day.hidden-stems.v1" }
    });
    expect(parseKnowledgeRoute("?view=admin&target=evidence_subject&subject=../bad")).toMatchObject({
      view: "library",
      target: null
    });
  });
});
