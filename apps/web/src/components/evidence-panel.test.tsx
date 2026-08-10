import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartFacts, RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { EvidencePanel } from "./evidence-panel";
import type { MatrixField } from "./four-pillars-matrix";

const { listCitationsMock } = vi.hoisted(() => ({ listCitationsMock: vi.fn() }));
vi.mock("@hakimi/storage", () => ({ knowledgeRepository: { listCitationsByTarget: listCitationsMock } }));

const caseId = "11111111-1111-4111-8111-111111111111";
const revisionId = "22222222-2222-4222-8222-222222222222";

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
  manifest: { engine: { name: "hakimi-bazi-core", version: "0.1.0" } }
} as RevisionRecord;

beforeEach(() => {
  listCitationsMock.mockReset();
  listCitationsMock.mockResolvedValue([]);
});

describe("EvidencePanel 字段证据", () => {
  it.each([
    ["stemTenGod", "pillars.day.stemTenGod"],
    ["wuXing", "pillars.day.wuXing"],
    ["nayin", "pillars.day.nayin"]
  ] satisfies Array<[MatrixField, string]>)("缺失 %s 直接 provenance 时不回退到干支证据", (field, requestedField) => {
    render(<EvidencePanel revision={revision} selection={{ pillar: "day", field }} open onClose={vi.fn()} />);

    expect(screen.getByText(requestedField)).toBeTruthy();
    expect(screen.getByText("暂无直接来源")).toBeTruthy();
    expect(screen.getAllByText("待补证据").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/不会借用干支字段的算法或来源/)).toBeTruthy();
    expect(screen.queryByText("lunar-typescript:eight-char:sect-1")).toBeNull();
    expect(screen.queryByText("干支直接来源")).toBeNull();
  });

  it("存在字段直接 provenance 时展示该字段自己的算法", () => {
    render(<EvidencePanel revision={revision} selection={{ pillar: "day", field: "hiddenStems" }} open onClose={vi.fn()} />);

    expect(screen.getByText("pillars.day.hiddenStems")).toBeTruthy();
    expect(screen.getByText("lunar-typescript:hidden-stems")).toBeTruthy();
    expect(screen.getByText("藏干直接证据。")).toBeTruthy();
    expect(screen.queryByText("暂无直接来源")).toBeNull();
  });

  it("叠加展示独立候选引用并生成带字段 target 的知识库深链", async () => {
    listCitationsMock.mockResolvedValue([{
      id: "33333333-3333-4333-8333-333333333333",
      documentId: "44444444-4444-4444-8444-444444444444",
      locator: { sectionId: "section-9", startLine: 10, endLine: 10 },
      quote: "巳中藏丙戊庚。",
      annotation: "待复核",
      status: "user_candidate",
      targets: [{ kind: "chart_field", caseId, revisionId, field: "pillars.day.hiddenStems" }],
      updatedAt: "2026-08-01T00:00:00.000Z"
    }]);

    render(<EvidencePanel revision={revision} selection={{ pillar: "day", field: "hiddenStems" }} open onClose={vi.fn()} />);

    expect(await screen.findByText("巳中藏丙戊庚。")).toBeTruthy();
    const addLink = screen.getByRole("link", { name: /去知识库添加来源/ });
    const url = new URL(addLink.getAttribute("href")!, "https://hakimi.test");
    expect(url.searchParams.get("target")).toBe("chart_field");
    expect(url.searchParams.get("case")).toBe(caseId);
    expect(url.searchParams.get("revision")).toBe(revisionId);
    expect(url.searchParams.get("field")).toBe("pillars.day.hiddenStems");
  });
});
