import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { READING_SYNTHESIS_VERSION, type LocalReadingSynthesis } from "../lib/local-reading-synthesis";
import { ReadingSynthesisPanel } from "./reading-synthesis-panel";

const reading: LocalReadingSynthesis = {
  version: READING_SYNTHESIS_VERSION, sourceBinding: { caseId: "case-synthetic", revisionId: "revision-synthetic", chartResultHash: "a".repeat(64), includeHour: true },
  sourceVersions: [READING_SYNTHESIS_VERSION, "synthetic-source/1"], contextRef: null,
  personalRefs: [{ noteId: "12345678-synthetic", editVersion: 1, bodySha256: "b".repeat(64), createdAt: "2026-10-16T01:00:00.000Z" }],
  headline: "让已有积累进入真实成果", summary: "主线是理解、应用与交付之间的衔接。",
  sections: [
    { id: "main", title: "事业与资源当前落点", paragraphs: ["先把已有方法用在具体任务，再核对所需支持。"], sourceSubjects: ["chapter-career"], origin: "calculated", conditions: ["不能把能力方向当作已发生经历。"], evidence: ["合成结构依据"] },
    { id: "context", title: "关系与当前背景", paragraphs: ["按已填写的单身背景，先观察交往与共同安排。"], sourceSubjects: ["contextual-chapter-relationships"], origin: "contextual", conditions: [], evidence: [] },
    { id: "forward", title: "若按顺行 · 当前阶段", paragraphs: ["顺行的阶段原文完整保留。"], sourceSubjects: ["decade-forward"], origin: "calculated", conditions: ["方向尚未锁定。"], evidence: [] },
    { id: "backward", title: "若按逆行 · 当前阶段", paragraphs: ["逆行的相反阶段原文完整保留。"], sourceSubjects: ["decade-backward"], origin: "calculated", conditions: ["方向尚未锁定。"], evidence: [] },
    { id: "personal", title: "你的个人补充", paragraphs: ["<script>我的实际情况与原结论不同。</script>"], sourceSubjects: ["chapter-career"], origin: "personal", conditions: [], evidence: ["本人明确采用的修订"] }
  ], conditions: ["总评保留各分支，未据此新评分。"], evidence: ["总评沿用原判断"]
};
describe("reading synthesis presentation", () => {
  it("shows one leading natal detail and links to its complete decision with only safe HTTPS source links", () => {
    const value = structuredClone(reading);
    value.sources = [
      { id: "checked", title: "已核原典", url: "https://example.org/source", locator: "影印第42页", excerpt: "原文短引", interpretation: "本地解释边界" },
      { id: "unsafe", title: "不可信协议", url: "javascript:alert(1)", locator: "测试拒绝", excerpt: "", interpretation: "保留说明" },
      { id: "credentials", title: "带凭证地址", url: "https://user:secret@example.org/", locator: "测试拒绝", excerpt: "", interpretation: "保留说明" }
    ];
    value.sections.unshift({ id: "natal-detail-dual", title: "辛的双重作用", origin: "calculated", sourceSubjects: ["chapter-structure"],
      answer: "辛既泄身也制杀，不能只按一个作用理解。", paragraphs: [], evidence: ["原局对象及根气依据", "本命补断依据：root · original-root · revision.facts.pillars.day"], conditions: ["不据此认定制杀已足量。"], sourceIds: ["checked", "unsafe", "credentials"] });
    value.sections.push({ id: "natal-detail-second", title: "另一实际补断", origin: "calculated", sourceSubjects: ["chapter-structure"],
      answer: "另一补断保留完整正文。", paragraphs: [], evidence: [], conditions: [] });
    render(<><ReadingSynthesisPanel reading={value} variant="summary" /><ReadingSynthesisPanel reading={value} variant="sections" /></>);
    const opening = screen.getByRole("region", { name: "主线结论摘要" });
    expect(within(opening).getByText(value.sections[0]!.answer!).closest("details")).toBeNull();
    expect(within(opening).queryByText("另一补断保留完整正文。")).toBeNull();
    expect(within(opening).getByRole("link", { name: "查看本命补断的完整依据" }).getAttribute("href")).toBe("#reading-natal-detail-dual");
    const body = screen.getByRole("region", { name: "辛的双重作用" });
    expect(body.id).toBe("reading-natal-detail-dual");
    expect(within(body).getByRole("link", { name: "已核原典" }).getAttribute("href")).toBe("https://example.org/source");
    expect(within(body).queryByRole("link", { name: "不可信协议" })).toBeNull();
    expect(within(body).queryByRole("link", { name: "带凭证地址" })).toBeNull();
    expect(within(body).getByText("原文短引：原文短引")).toBeTruthy();
    const calculation = within(body).getByText("查看计算记录").closest("details")!;
    expect(calculation.open).toBe(false);
    expect(within(calculation).getByText("本命补断依据：root · original-root · revision.facts.pillars.day")).toBeTruthy();
    expect(within(calculation).queryByText("原局对象及根气依据")).toBeNull();
  });

  it("does not reintroduce an automatic detail when its exact dependency is personally adopted", () => {
    const value = structuredClone(reading);
    value.sections = [{ id: "natal-detail-personal", title: "本命作用补充", origin: "personal", sourceSubjects: ["useful-stem-useful-辛"],
      answer: "不得重盖个人文字的自动句", paragraphs: ["我已明确采用的辛字理解。"], evidence: ["原补断保留对照"], conditions: [] }];
    render(<><ReadingSynthesisPanel reading={value} variant="summary" /><ReadingSynthesisPanel reading={value} variant="sections" /></>);
    const opening = screen.getByRole("region", { name: "主线结论摘要" });
    expect(within(opening).getByText("此项已有明确采用的个人修订，正文优先保留你的原文。")).toBeTruthy();
    expect(screen.queryByText("不得重盖个人文字的自动句")).toBeNull();
    expect(screen.getByText("我已明确采用的辛字理解。").closest("details")).toBeNull();
  });

  it("shows a complete family answer once and preserves additional explanation and source data", () => {
    const item = structuredClone(reading);
    item.sections = [{ id: "family", title: "家庭与支持环境", origin: "calculated", sourceSubjects: ["chapter-family"],
      answer: "家庭支持的主结论。\n\n年柱与月柱的具体家庭说明。",
      paragraphs: ["年柱与月柱的具体家庭说明。", "另外保留的解释。"], conditions: [], evidence: ["原家庭依据"] }];
    const before = JSON.stringify(item);
    render(<ReadingSynthesisPanel reading={item} variant="sections" />);
    const family = screen.getByRole("region", { name: "家庭与支持环境" });
    expect(within(family).getAllByText("年柱与月柱的具体家庭说明。")).toHaveLength(1);
    expect(within(family).getByText("年柱与月柱的具体家庭说明。").closest("details")).toBeNull();
    expect(within(family).getByText("另外保留的解释。").closest("details")).toBeTruthy();
    expect(within(family).getByText("原家庭依据")).toBeTruthy();
    expect(JSON.stringify(item)).toBe(before);
  });
  it("separates the short opening from the long reading without dropping or duplicating personal text and sources", () => {
    const before = JSON.stringify(reading);
    render(<><ReadingSynthesisPanel reading={reading} variant="summary" /><ReadingSynthesisPanel reading={reading} variant="sections" /></>);
    const opening = screen.getByRole("region", { name: "主线结论摘要" }), details = screen.getByRole("region", { name: "主线详细解读" });
    expect(within(opening).getByText(reading.headline)).toBeTruthy();
    expect(within(opening).getByText(reading.summary)).toBeTruthy();
    for (const section of reading.sections) for (const text of section.paragraphs) {
      expect(within(opening).queryByText(text)).toBeNull();
      expect(within(details).getByText(text)).toBeTruthy();
      expect(screen.getAllByText(text)).toHaveLength(1);
    }
    expect(within(details).getByText("总评的范围与来源")).toBeTruthy();
    expect(within(details).getByText(reading.evidence[0]!)).toBeTruthy();
    expect(JSON.stringify(reading)).toBe(before);
  });
  it("shows the separate time-bound statements directly without turning them into a giant paragraph", () => {
    const item = structuredClone(reading);
    item.sections[2] = { id: "stage-forward", title: "若按顺行 · 2026—2035年节奏", origin: "calculated", sourceSubjects: ["trajectory-2026-2035-forward"],
      answer: "2026—2027年结构有压力，当前承接条件仍须保留。\n\n2028年交运前后分别看，转运时刻不等于结果立刻改善。\n\n2035年的原判断是结构较顺，其他年份不借用此结论。",
      paragraphs: ["三个窗口的完整原计算说明。"], conditions: ["原条件仍然成立才适用。"], evidence: ["走势锚点：{\"stageIds\":[\"forward-only\"]}"] };
    render(<ReadingSynthesisPanel reading={item} />);
    const region = screen.getByRole("region", { name: item.sections[2]!.title });
    for (const text of item.sections[2]!.answer!.split("\n\n")) expect(within(region).getByText(text).closest("details")).toBeNull();
    expect(region.querySelectorAll(".reading-synthesis-answer")).toHaveLength(3);
    expect(within(region).getByText(item.sections[2]!.evidence[0]!).closest("details")!.open).toBe(false);
    expect(within(region).queryByText("逆行的相反阶段原文完整保留。")).toBeNull();
  });
  it("shows short answers immediately while keeping the full source explanation available", () => {
    const direct = { ...reading, personalRefs: [], keyPoints: [
      { id: "strength" as const, label: "更容易发挥的长处", text: "学习、梳理和讲解，是当前较明确的发挥方向。", sourceSubjects: ["chapter-structure"] },
      { id: "obstacle" as const, label: "最容易卡住的地方", text: "准备多、实际完成少。", sourceSubjects: ["chapter-structure"] }
    ] };
    render(<ReadingSynthesisPanel reading={direct} />);
    const points = screen.getByLabelText("本盘结论摘要");
    expect(within(points).getByText(direct.keyPoints[0]!.text).closest("details")).toBeNull();
    expect(within(points).getByText(direct.keyPoints[1]!.text)).toBeTruthy();
    expect(screen.queryByText(direct.summary)).toBeNull();
    expect(screen.getByText(direct.sections[0]!.paragraphs[0]!)).toBeTruthy();
  });
  it("puts a source-bound answer first, keeps its full explanation available, and never paraphrases personal text", async () => {
    const item = structuredClone(reading);
    item.sections[0]!.answer = "先用已透的辛食神表达成果，印的背景与调候条件分别说明。";
    item.sections[4]!.answer = "不得用这段自动文字覆盖个人原文";
    render(<ReadingSynthesisPanel reading={item} />);
    const main = screen.getByRole("region", { name: item.sections[0]!.title });
    const answer = within(main).getByText(item.sections[0]!.answer!);
    expect(answer.closest("details")).toBeNull();
    const explanation = within(main).getByText("展开这段解读").closest("details")!;
    expect(explanation.open).toBe(false);
    expect(within(explanation).getByText(item.sections[0]!.paragraphs[0]!)).toBeTruthy();
    await userEvent.click(within(main).getByText("展开这段解读"));
    expect(explanation.open).toBe(true);
    const personal = screen.getByRole("region", { name: item.sections[4]!.title });
    expect(within(personal).queryByText(item.sections[4]!.answer!)).toBeNull();
    expect(within(personal).getByText(item.sections[4]!.paragraphs[0]!).closest("details")).toBeNull();
  });

  it("shows the connected conclusion, both current branches and a clearly labelled literal personal quotation", async () => {
    const before = JSON.stringify(reading), { container } = render(<ReadingSynthesisPanel reading={reading} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(reading.headline);
    expect(screen.getByText(reading.summary)).toBeTruthy();
    expect(screen.getByText("顺行的阶段原文完整保留。")).toBeTruthy(); expect(screen.getByText("逆行的相反阶段原文完整保留。")).toBeTruthy();
    const personal = screen.getByRole("region", { name: "你的个人补充" });
    expect(within(personal).getByText("你已采用的个人表述 · 保留原文")).toBeTruthy();
    expect(within(personal).getByText(reading.sections[4]!.paragraphs[0]!)).toBeTruthy(); expect(container.querySelector("script")).toBeNull();
    const sources = screen.getByText("总评的范围与来源").closest("details")!; expect(sources.open).toBe(false);
    await userEvent.click(screen.getByText("总评的范围与来源")); expect(sources.open).toBe(true);
    expect(within(sources).getByText(/12345678/)).toBeTruthy(); expect(JSON.stringify(reading)).toBe(before);
  });
  it("keeps scope/versions behind details and does not add a personal badge to calculated sections", () => {
    render(<ReadingSynthesisPanel reading={reading} />);
    expect(screen.getByText(/来源版本/).closest("details")!.open).toBe(false);
    expect(within(screen.getByRole("region", { name: "事业与资源当前落点" })).queryByText(/你已采用/)).toBeNull();
    expect(screen.getByText("结合已保存的生活背景")).toBeTruthy();
  });
  it("handles missing/loading/error input without showing invented conclusions", () => {
    const { container, rerender } = render(<ReadingSynthesisPanel reading={null} />); expect(container.innerHTML).toBe("");
    rerender(<ReadingSynthesisPanel reading={null} loading />); expect(screen.getByRole("status").textContent).toContain("正在整理");
    rerender(<ReadingSynthesisPanel reading={null} error="当前来源未确认" />); expect(screen.getByRole("alert").textContent).toBe("当前来源未确认"); expect(screen.queryByRole("heading")).toBeNull();
  });
});
