import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReadingExplanationIndex } from "../lib/reading-explanation-index";
import { ReadingBranchGuide } from "./reading-branch-guide";

function index(directionRule = "year_stem_yinyang_and_gender"): ReadingExplanationIndex {
  return { sourceSnapshot: { caseId: "case-1", revisionId: "revision-1", input: { sex: "unspecified" },
    ruleProfile: { luckCycle: { directionRule, unknownValuePolicy: "require_manual_direction" } }
  } } as unknown as ReadingExplanationIndex;
}

it("两条路径先说明缺失资料，展开仅改变查看路径，保留补资料的原修订链接", () => {
  const source = index(), snapshot = JSON.stringify(source), onChange = vi.fn();
  render(<ReadingBranchGuide index={source} branches={["forward", "backward"]} onChange={onChange} />);
  expect(screen.getByText(/性别未填写，当前规则不能据此确定大运顺序/)).toBeTruthy();
  expect(screen.getByText("先分别查看").closest("details")).toHaveProperty("open", false);
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("先分别查看"));
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "backward" } });
  expect(onChange).toHaveBeenCalledWith("backward");
  expect(screen.getByText(/查看某一套不代表已确认它正确/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "补充资料" }).getAttribute("href")).toBe("/cases/case-1/revisions/revision-1/revise");
  expect(JSON.stringify(source)).toBe(snapshot);
});

it("未知顺逆规则不借已知规则补出条件", () => {
  render(<ReadingBranchGuide index={index("unrecognized")} branches={["forward", "backward"]} onChange={vi.fn()} needed />);
  expect(screen.getByText(/现有资料和规则不足以确认哪套路径适用/)).toBeTruthy();
  expect(screen.getByText(/未记录可说明的顺逆规则/)).toBeTruthy();
  expect(screen.queryByText(/出生年天干为阳且性别为男/)).toBeNull();
});
