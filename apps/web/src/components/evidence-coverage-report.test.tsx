import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceCoverageReport } from "./evidence-coverage-report";

const { listCasesMock, getCaseMock, listCitationsMock, listRightsMock, reportMock, verifyDigestMock } = vi.hoisted(() => ({
  listCasesMock: vi.fn(),
  getCaseMock: vi.fn(),
  listCitationsMock: vi.fn(),
  listRightsMock: vi.fn(),
  reportMock: vi.fn(),
  verifyDigestMock: vi.fn()
}));

vi.mock("@hakimi/storage", () => ({
  caseRepository: { listCases: listCasesMock, getCase: getCaseMock },
  knowledgeRepository: { listCitations: listCitationsMock, listSourceRights: listRightsMock }
}));
vi.mock("@hakimi/knowledge-core", async (importOriginal) => ({
  ...await importOriginal<typeof import("@hakimi/knowledge-core")>(),
  buildEvidenceCoverageReport: reportMock,
  verifyEvidenceCoverageReportDigest: verifyDigestMock
}));

const subjectId = "bazi.pillar.day.hidden-stems.v1";
const candidateCitationId = "11111111-1111-4111-8111-111111111111";
const candidateCitation = {
  schemaVersion: "1.0.0",
  id: candidateCitationId,
  documentId: "22222222-2222-4222-8222-222222222222",
  documentContentHash: "b".repeat(64),
  locator: { sectionId: "section-1", startLine: 1, endLine: 1 },
  quote: "候选引用原文",
  annotation: "",
  targets: [{ kind: "evidence_subject", subjectId }],
  targetKeys: [`evidence_subject:${subjectId}`],
  status: "user_candidate",
  reviewAttestations: [],
  decisionNote: "",
  editVersion: 1,
  createdAt: "2026-08-23T00:00:00.000Z",
  updatedAt: "2026-08-23T00:00:00.000Z"
};

const candidateCoverageReport = {
  registryVersion: "1.0.0",
  scope: "required_v1_subjects",
  metrics: {
    provenanceCompleteness: { numerator: 0, denominator: 1, rate: 0 },
    structuredLink: { numerator: 1, denominator: 1, rate: 1 },
    doubleReviewed: { numerator: 0, denominator: 1, rate: 0 },
    redistributableSource: { numerator: 0, denominator: 1, rate: 0 }
  },
  provenanceStatusCounts: { gold_verified: 0, adjudicated: 0, disputed: 0, experimental: 0 },
  goldVerifiedCount: 0,
  legacySourceRefCount: 0,
  unregistered: [],
  digest: "a".repeat(64),
  rows: [{
    subject: { subjectId, registryVersion: "1.0.0", status: "active", category: "rule_derived", label: "日柱 · 藏干", requiredForV1: true, algorithmIds: ["algo"], fieldPaths: ["pillars.day.hiddenStems"], ruleProfilePaths: [] },
    provenance: null,
    provenanceCount: 0,
    legacySourceRefs: [],
    candidateCitationIds: [candidateCitationId],
    verifiedCitationIds: [],
    redistributableCitationIds: [],
    gaps: ["missing_provenance", "only_candidate_citations", "no_redistributable_verified_source"]
  }]
};

beforeEach(() => {
  vi.clearAllMocks();
  listCasesMock.mockResolvedValue([]);
  getCaseMock.mockResolvedValue(null);
  listCitationsMock.mockResolvedValue([candidateCitation]);
  listRightsMock.mockResolvedValue([]);
  reportMock.mockResolvedValue(candidateCoverageReport);
  verifyDigestMock.mockResolvedValue(true);
});

describe("EvidenceCoverageReport", () => {
  it("独立展示四项指标且不把候选引用算作双人核验或可分发", async () => {
    render(<EvidenceCoverageReport />);
    expect(await screen.findByRole("heading", { name: "日柱 · 藏干" })).toBeTruthy();
    expect(screen.getByText(/结构化链接 · 1\/1/)).toBeTruthy();
    expect(screen.getByText(/双人结构核验 · 0\/1/)).toBeTruthy();
    expect(screen.getByText(/工程权利门禁来源 · 0\/1/)).toBeTruthy();
    expect(screen.getAllByText("只有候选引用").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/百分比只表示冻结主题分母下的工程输入覆盖/)).toBeTruthy();
    expect(verifyDigestMock).toHaveBeenCalledWith(candidateCoverageReport);
  });

  it("用查看或补充文案链接到精确的 evidence_subject 路由", async () => {
    render(<EvidenceCoverageReport />);

    const link = await screen.findByRole("link", { name: "查看或补充主题来源" });
    const url = new URL(link.getAttribute("href")!, "https://hakimi.test");
    expect(url.pathname).toBe("/knowledge");
    expect(url.search).toBe(`?target=evidence_subject&subject=${subjectId}`);
  });

  it("冻结报告没有主题时展示可操作的空筛选说明", async () => {
    reportMock.mockResolvedValueOnce({
      ...candidateCoverageReport,
      metrics: {
        provenanceCompleteness: { numerator: 0, denominator: 0, rate: null },
        structuredLink: { numerator: 0, denominator: 0, rate: null },
        doubleReviewed: { numerator: 0, denominator: 0, rate: null },
        redistributableSource: { numerator: 0, denominator: 0, rate: null }
      },
      digest: "c".repeat(64),
      rows: []
    });

    render(<EvidenceCoverageReport />);
    expect(await screen.findByText(/当前四项工程筛选没有缺口条目/)).toBeTruthy();
    expect(screen.getByText(/关闭“只看缺口”可浏览全部 0 个主题/)).toBeTruthy();
  });

  it("digest 复算失败时撤下指标与主题明细", async () => {
    verifyDigestMock.mockResolvedValueOnce(false);

    render(<EvidenceCoverageReport />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("覆盖报告 digest 与规范化报告正文不一致");
    expect(screen.queryByRole("heading", { name: "日柱 · 藏干" })).toBeNull();
    expect(screen.queryByText(/结构化链接 · 1\/1/)).toBeNull();
  });
});
