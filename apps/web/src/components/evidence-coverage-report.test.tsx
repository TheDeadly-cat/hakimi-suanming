import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceCoverageReport } from "./evidence-coverage-report";

const { listCasesMock, getCaseMock, listCitationsMock, listRightsMock, reportMock } = vi.hoisted(() => ({
  listCasesMock: vi.fn(),
  getCaseMock: vi.fn(),
  listCitationsMock: vi.fn(),
  listRightsMock: vi.fn(),
  reportMock: vi.fn()
}));

vi.mock("@hakimi/storage", () => ({
  caseRepository: { listCases: listCasesMock, getCase: getCaseMock },
  knowledgeRepository: { listCitations: listCitationsMock, listSourceRights: listRightsMock }
}));
vi.mock("@hakimi/knowledge-core", async (importOriginal) => ({
  ...await importOriginal<typeof import("@hakimi/knowledge-core")>(),
  buildEvidenceCoverageReport: reportMock
}));

beforeEach(() => {
  listCasesMock.mockResolvedValue([]);
  getCaseMock.mockResolvedValue(null);
  listCitationsMock.mockResolvedValue([]);
  listRightsMock.mockResolvedValue([]);
  reportMock.mockResolvedValue({
    registryVersion: "1.0.0",
    scope: "required_v1_subjects",
    metrics: {
      provenanceCompleteness: { numerator: 0, denominator: 36, rate: 0 },
      structuredLink: { numerator: 1, denominator: 36, rate: 1 / 36 },
      doubleReviewed: { numerator: 0, denominator: 36, rate: 0 },
      redistributableSource: { numerator: 0, denominator: 36, rate: 0 }
    },
    provenanceStatusCounts: { gold_verified: 0, adjudicated: 0, disputed: 0, experimental: 0 },
    goldVerifiedCount: 0,
    legacySourceRefCount: 0,
    unregistered: [],
    digest: "a".repeat(64),
    rows: [{
      subject: { subjectId: "bazi.pillar.day.hidden-stems.v1", registryVersion: "1.0.0", status: "active", category: "rule_derived", label: "日柱 · 藏干", requiredForV1: true, algorithmIds: ["algo"], fieldPaths: ["pillars.day.hiddenStems"], ruleProfilePaths: [] },
      provenance: null,
      provenanceCount: 0,
      legacySourceRefs: [],
      candidateCitationIds: ["candidate"],
      verifiedCitationIds: [],
      redistributableCitationIds: [],
      gaps: ["missing_provenance", "only_candidate_citations", "no_redistributable_verified_source"]
    }]
  });
});

describe("EvidenceCoverageReport", () => {
  it("独立展示四项指标且不把候选引用算作双人核验或可分发", async () => {
    render(<EvidenceCoverageReport />);
    expect(await screen.findByRole("heading", { name: "日柱 · 藏干" })).toBeTruthy();
    expect(screen.getByText(/结构化链接 · 1\/36/)).toBeTruthy();
    expect(screen.getByText(/双人核验 · 0\/36/)).toBeTruthy();
    expect(screen.getByText(/可分发来源 · 0\/36/)).toBeTruthy();
    expect(screen.getByText("只有候选引用")).toBeTruthy();
  });
});
