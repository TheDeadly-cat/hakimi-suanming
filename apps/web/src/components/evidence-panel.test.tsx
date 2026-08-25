import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartFacts, RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { EvidencePanel } from "./evidence-panel";
import type { MatrixField } from "./four-pillars-matrix";

const { listCitationsMock, evidenceSubjectIdForFieldMock } = vi.hoisted(() => ({
  listCitationsMock: vi.fn(),
  evidenceSubjectIdForFieldMock: vi.fn()
}));
vi.mock("@hakimi/storage", () => ({ knowledgeRepository: { listCitationsByTarget: listCitationsMock } }));
vi.mock("@hakimi/knowledge-core", () => ({ evidenceSubjectIdForField: evidenceSubjectIdForFieldMock }));

const caseId = "11111111-1111-4111-8111-111111111111";
const revisionId = "22222222-2222-4222-8222-222222222222";
const citationId = "33333333-3333-4333-8333-333333333333";
const documentId = "44444444-4444-4444-8444-444444444444";
const citationTarget = { kind: "chart_field", caseId, revisionId, field: "pillars.day.hiddenStems" } as const;
const candidateCitation = {
  schemaVersion: "1.0.0",
  id: citationId,
  documentId,
  documentContentHash: "c".repeat(64),
  locator: { sectionId: "section-9", startLine: 10, endLine: 10 },
  quote: "巳中藏丙戊庚。",
  annotation: "待复核",
  targets: [citationTarget],
  targetKeys: [`chart_field:${caseId}:${revisionId}:pillars.day.hiddenStems`],
  status: "user_candidate",
  reviewAttestations: [],
  decisionNote: "",
  editVersion: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const dayPillar: ChartFacts["pillars"]["day"] = {
  name: "day",
  label: "日柱",
  ganZhi: "辛巳",
  stem: "辛",
  branch: "巳",
  hiddenStems: ["丙", "戊", "庚"],
  stemTenGod: "日主",
  branchTenGods: ["正官", "正印", "劫财"],
  wuXing: "金火",
  nayin: "白蜡金",
  twelveGrowth: "死",
  xun: "甲戌",
  voidBranches: "申酉"
};

const revision = {
  id: revisionId,
  caseId,
  facts: {
    pillars: { day: dayPillar },
    fieldProvenance: [
      {
        field: "pillars.day.ganZhi",
        kind: "rule_derived",
        algorithmId: "lunar-typescript:eight-char:sect-1",
        sourceRefs: ["干支直接来源"],
        verificationStatus: "experimental",
        note: "仅覆盖干支。"
      },
      {
        field: "pillars.day.hiddenStems",
        kind: "rule_derived",
        algorithmId: "lunar-typescript:hidden-stems",
        sourceRefs: [],
        verificationStatus: "experimental",
        note: "藏干直接证据。"
      }
    ]
  },
  ruleProfile: WORKING_DEFAULT_RULE_PROFILE,
  manifest: {
    engine: { name: "hakimi-bazi-core", version: "0.1.0" },
    resultHash: "a".repeat(64),
    ruleProfileDigest: "b".repeat(64)
  }
} as RevisionRecord;

beforeEach(() => {
  listCitationsMock.mockReset();
  listCitationsMock.mockResolvedValue([]);
  evidenceSubjectIdForFieldMock.mockReset();
  evidenceSubjectIdForFieldMock.mockImplementation((field: string) => (
    field === "pillars.day.hiddenStems" ? "bazi.pillar.day.hidden-stems.v1" : null
  ));
});

describe("EvidencePanel 字段证据", () => {
  it.each([
    ["stemTenGod", "pillars.day.stemTenGod"],
    ["wuXing", "pillars.day.wuXing"],
    ["nayin", "pillars.day.nayin"]
  ] satisfies Array<[MatrixField, string]>)("缺失 %s 直接 provenance 时不回退到干支证据", (field, requestedField) => {
    render(<EvidencePanel revision={revision} selection={{ pillar: "day", field }} open onClose={vi.fn()} />);

    expect(screen.getByTitle(requestedField).textContent).toBe(requestedField);
    expect(screen.getByText("暂无直接来源")).toBeTruthy();
    expect(screen.getAllByText("待补证据").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/不会借用干支字段的算法或来源/)).toBeTruthy();
    expect(screen.queryByText("lunar-typescript:eight-char:sect-1")).toBeNull();
    expect(screen.queryByText("干支直接来源")).toBeNull();
  });

  it("存在字段直接 provenance 时展示该字段自己的算法", () => {
    render(<EvidencePanel revision={revision} selection={{ pillar: "day", field: "hiddenStems" }} open onClose={vi.fn()} />);

    expect(screen.getByTitle("pillars.day.hiddenStems").textContent).toBe("pillars.day.hiddenStems");
    expect(screen.getByText("lunar-typescript:hidden-stems")).toBeTruthy();
    expect(screen.getByText("藏干直接证据。")).toBeTruthy();
    expect(screen.queryByText("暂无直接来源")).toBeNull();
  });

  it("叠加展示独立候选引用并生成带字段 target 的知识库深链", async () => {
    listCitationsMock.mockImplementation(async (target: { kind: string }) => (
      target.kind === "chart_field" ? [candidateCitation] : []
    ));

    render(<EvidencePanel revision={revision} selection={{ pillar: "day", field: "hiddenStems" }} open onClose={vi.fn()} />);

    expect(await screen.findByText("巳中藏丙戊庚。")).toBeTruthy();
    expect(screen.getByText(/先通过当前 Citation schema/)).toBeTruthy();
    const addLink = screen.getByRole("link", { name: /去知识库添加来源/ });
    const url = new URL(addLink.getAttribute("href")!, "https://hakimi.test");
    expect(url.searchParams.get("target")).toBe("chart_field");
    expect(url.searchParams.get("case")).toBe(caseId);
    expect(url.searchParams.get("revision")).toBe(revisionId);
    expect(url.searchParams.get("field")).toBe("pillars.day.hiddenStems");
  });

  it("为注册字段生成绑定当前 Revision 字段的两遍只读复核路由", () => {
    const { rerender } = render(<EvidencePanel revision={revision} selection={{ pillar: "day", field: "hiddenStems" }} open onClose={vi.fn()} />);

    const contextualLink = screen.getByRole("link", { name: "建立两遍只读复核上下文（绑定当前 Revision 字段；不代表真值或最新）" });
    const contextualUrl = new URL(contextualLink.getAttribute("href")!, "https://hakimi.test");
    expect(contextualUrl.pathname).toBe("/knowledge");
    expect(contextualUrl.searchParams.get("target")).toBe("evidence_subject");
    expect(contextualUrl.searchParams.get("subject")).toBe("bazi.pillar.day.hidden-stems.v1");
    expect(contextualUrl.searchParams.get("review")).toBe(`revision_field:${caseId}:${revisionId}:pillars.day.hiddenStems`);
    expect(contextualUrl.searchParams.get("case")).toBeNull();
    expect(contextualUrl.searchParams.get("revision")).toBeNull();
    expect(contextualUrl.searchParams.get("field")).toBeNull();

    const subjectLink = screen.getByRole("link", { name: "审阅通用主题来源（主题级，不绑定当前案例）" });
    const subjectUrl = new URL(subjectLink.getAttribute("href")!, "https://hakimi.test");
    expect(subjectUrl.pathname).toBe("/knowledge");
    expect(subjectUrl.search).toBe("?target=evidence_subject&subject=bazi.pillar.day.hidden-stems.v1");
    expect(subjectUrl.searchParams.get("case")).toBeNull();
    expect(subjectUrl.searchParams.get("revision")).toBeNull();
    expect(subjectUrl.searchParams.get("field")).toBeNull();

    rerender(<EvidencePanel revision={revision} selection={{ pillar: "day", field: "stem" }} open onClose={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /建立两遍只读复核上下文/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /审阅通用主题来源/ })).toBeNull();
  });

  it("正式 Citation 契约失败时不展示近似引用", async () => {
    listCitationsMock.mockImplementation(async (target: { kind: string }) => (
      target.kind === "chart_field"
        ? [{ ...candidateCitation, targetKeys: [] }]
        : []
    ));

    render(<EvidencePanel revision={revision} selection={{ pillar: "day", field: "hiddenStems" }} open onClose={vi.fn()} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("没有通过当前 Citation 契约");
    expect(screen.queryByText("巳中藏丙戊庚。")).toBeNull();
    expect(screen.getByRole("button", { name: /重新读取两侧来源/ })).toBeTruthy();
  });

  it("不可识别的换日规则不会被默认解释为午夜换日", () => {
    const invalidRevision = {
      ...revision,
      ruleProfile: {
        ...revision.ruleProfile,
        calendar: { ...revision.ruleProfile.calendar, dayBoundary: "unsupported" }
      }
    } as unknown as RevisionRecord;

    render(<EvidencePanel revision={invalidRevision} selection={{ pillar: "day", field: "hiddenStems" }} open onClose={vi.fn()} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/当前 Revision 的换日规则不可识别/)).toBeTruthy();
    expect(screen.queryByText(/00:00 午夜换日/)).toBeNull();
    expect(listCitationsMock).not.toHaveBeenCalled();
  });
});
