import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ContextualDomainReading } from "../lib/local-contextual-reading";
import { ContextualReadingPanel } from "./contextual-reading-panel";

const reading: ContextualDomainReading = {
  subjectId: "contextual-chapter-career", title: "事业与能力发展", headline: "把已有方法转为学习与实践成果", summary: "当前先以学业任务和作品完成承接能力方向。",
  paragraphs: ["已选择学生背景，职业解释在此对应学习、训练与实践。"], examples: ["把一个课题完成到可以展示，而不是预设已经就业。"], focus: ["关注训练与实际完成的连接。"],
  basis: ["沿用原命盘结构，背景仅调整生活表述。"], contextLabel: "2026—2028 年 · 学生 · 单身", sourceVersions: ["synthetic-contextual/1"],
  scope: { kind: "natal", chapterId: "career", referenceYear: 2026 }
};
describe("contextual reading presentation", () => {
  it("renders nothing when there is no applicable background reading", () => {
    const { container } = render(<ContextualReadingPanel reading={null} />); expect(container.innerHTML).toBe("");
  });
  it("leads with the applied context, conclusion and concrete example while folding its basis and versions", async () => {
    const before = JSON.stringify(reading), { container } = render(<ContextualReadingPanel reading={reading} />);
    expect(screen.getByText(reading.contextLabel)).toBeTruthy(); expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(reading.headline);
    const body = container.querySelector("section")!;
    expect(body.textContent!.indexOf(reading.examples[0]!)).toBeLessThan(body.textContent!.indexOf(reading.paragraphs[0]!));
    const details = screen.getByText("这份适配的依据与范围").closest("details")!; expect(details.open).toBe(false);
    expect(screen.getByText(/来源版本/).closest("details")).toBe(details);
    await userEvent.click(screen.getByText("这份适配的依据与范围")); expect(details.open).toBe(true); expect(JSON.stringify(reading)).toBe(before);
  });
  it("preserves literal user text and avoids empty sections or fabricated actions", () => {
    const { container } = render(<ContextualReadingPanel reading={{ ...reading, paragraphs: ["<img src=x onerror=alert(1)>用户自述"], examples: [], focus: [], basis: [], sourceVersions: [] }} />);
    expect(container.querySelector("img")).toBeNull(); expect(screen.getByText("<img src=x onerror=alert(1)>用户自述")).toBeTruthy();
    expect(screen.queryByText("放到你的生活里")).toBeNull(); expect(screen.queryByText("当前重点")).toBeNull(); expect(container.querySelector("details")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
