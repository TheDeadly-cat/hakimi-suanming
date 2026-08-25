import { describe, expect, it } from "vitest";
import {
  buildKnowledgeSearch,
  knowledgeEvidenceSubjectHref,
  parseKnowledgeRoute
} from "./knowledge-route";

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
      target: { kind: "chart_field", caseId, revisionId, field: "pillars.day.hiddenStems" },
      reviewContextLocator: null
    });
  });

  it("丢弃伪造 ID、非法字段、非法 section 和非正行号", () => {
    expect(parseKnowledgeRoute("?document=../x&section=chapter-x&line=-1&target=chart_field&case=x&revision=y&field=<script>"))
      .toEqual({
        view: "library",
        query: "",
        documentId: null,
        sectionId: null,
        lineNumber: null,
        citationId: null,
        target: null,
        reviewContextLocator: null
      });
    expect(parseKnowledgeRoute(`?target=chart_field&case=${caseId}&revision=${revisionId}&field=profile.dayBoundary`).target).toBeNull();
  });

  it("仅在证据主题目标上往返独立的 Revision 字段复核 locator", () => {
    const evidenceSubjectId = "bazi.pillar.day.ganzhi.v1";
    const reviewContextLocator = {
      caseId,
      revisionId,
      evidenceSubjectId,
      fieldPath: "pillars.day.ganZhi"
    };
    const search = buildKnowledgeSearch({
      target: { kind: "evidence_subject", subjectId: evidenceSubjectId },
      reviewContextLocator
    });
    expect(parseKnowledgeRoute(search)).toMatchObject({
      target: { kind: "evidence_subject", subjectId: evidenceSubjectId },
      reviewContextLocator
    });
    expect(parseKnowledgeRoute(
      `?target=chart_field&case=${caseId}&revision=${revisionId}&field=pillars.day.ganZhi&review=revision_field:${caseId}:${revisionId}:pillars.day.ganZhi`
    ).reviewContextLocator).toBeNull();
    expect(() => buildKnowledgeSearch({
      target: { kind: "evidence_subject", subjectId: "bazi.pillar.hour.ganzhi.v1" },
      reviewContextLocator
    })).toThrow(/精确一致/u);
  });

  it("Revision 字段复核 locator 只允许 facade 的九个精确字段", () => {
    const evidenceSubjectId = "bazi.pillar.day.ganzhi.v1";
    const allowedFields = [
      "ganZhi",
      "hiddenStems",
      "stemTenGod",
      "branchTenGods",
      "wuXing",
      "nayin",
      "twelveGrowth",
      "xun",
      "voidBranches"
    ];

    for (const field of allowedFields) {
      const fieldPath = `pillars.day.${field}`;
      const reviewContextLocator = { caseId, revisionId, evidenceSubjectId, fieldPath };
      expect(parseKnowledgeRoute(buildKnowledgeSearch({
        target: { kind: "evidence_subject", subjectId: evidenceSubjectId },
        reviewContextLocator
      })).reviewContextLocator).toEqual(reviewContextLocator);
    }

    for (const fieldPath of [
      "pillars.day.futureField",
      "pillars.day.ganZhi.future",
      "pillars.profile.ganZhi"
    ]) {
      expect(parseKnowledgeRoute(
        `?target=evidence_subject&subject=${evidenceSubjectId}&review=revision_field:${caseId}:${revisionId}:${fieldPath}`
      ).reviewContextLocator).toBeNull();
      expect(() => buildKnowledgeSearch({
        target: { kind: "evidence_subject", subjectId: evidenceSubjectId },
        reviewContextLocator: { caseId, revisionId, evidenceSubjectId, fieldPath }
      })).toThrow(/精确一致/u);
    }
  });

  it("拒绝重复、残缺、额外段与非 library 视图的复核 locator", () => {
    const subject = "bazi.pillar.day.ganzhi.v1";
    const prefix = `?target=evidence_subject&subject=${subject}`;
    const validReview = `revision_field:${caseId}:${revisionId}:pillars.day.ganZhi`;

    for (const search of [
      `${prefix}&review=${validReview}&review=${validReview}`,
      `${prefix}&review=revision_field:${caseId}:${revisionId}`,
      `${prefix}&review=revision_field:${caseId}:${revisionId}:pillars.day.ganZhi:extra`,
      `${prefix}&review=future_revision_field:${caseId}:${revisionId}:pillars.day.ganZhi`,
      `${prefix}&view=rights&review=${validReview}`,
      `${prefix}&view=coverage&review=${validReview}`
    ]) {
      expect(parseKnowledgeRoute(search).reviewContextLocator).toBeNull();
    }

    const locator = {
      caseId,
      revisionId,
      evidenceSubjectId: subject,
      fieldPath: "pillars.day.ganZhi"
    };
    for (const view of ["rights", "coverage"] as const) {
      expect(() => buildKnowledgeSearch({
        view,
        target: { kind: "evidence_subject", subjectId: subject },
        reviewContextLocator: locator
      })).toThrow(/精确一致/u);
    }
  });

  it("规范化 locator UUID，同时保持旧的 subject-only URL 不变", () => {
    const subject = "bazi.pillar.day.ganzhi.v1";
    const upperCaseId = caseId.toUpperCase();
    const upperRevisionId = revisionId.toUpperCase();
    const parsed = parseKnowledgeRoute(
      `?target=evidence_subject&subject=${subject}&review=revision_field:${upperCaseId}:${upperRevisionId}:pillars.day.ganZhi`
    );
    expect(parsed.reviewContextLocator).toEqual({
      caseId,
      revisionId,
      evidenceSubjectId: subject,
      fieldPath: "pillars.day.ganZhi"
    });
    expect(buildKnowledgeSearch({
      target: { kind: "evidence_subject", subjectId: subject },
      reviewContextLocator: {
        caseId: upperCaseId,
        revisionId: upperRevisionId,
        evidenceSubjectId: subject,
        fieldPath: "pillars.day.ganZhi"
      }
    })).toContain(caseId);
    expect(knowledgeEvidenceSubjectHref(subject)).toBe(
      `/knowledge?target=evidence_subject&subject=${subject}`
    );
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
