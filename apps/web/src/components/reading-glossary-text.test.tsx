import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReadingGlossaryHelp, ReadingGlossaryText } from "./reading-glossary-text";

it("explains the whole 劫财 term rather than misidentifying its 财 substring as a wealth star", () => {
  const view = render(<ReadingGlossaryText text="劫财月令背景" />);
  const trigger = screen.getByRole("button", { name: "解释劫财" });
  expect(screen.getByRole("button", { name: "解释月令" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "解释财" })).toBeNull();
  fireEvent.click(trigger);
  expect(screen.getByRole("complementary", { name: "劫财的说明" }).textContent).toContain("它不是财星");
  view.unmount();

  render(<ReadingGlossaryHelp text="劫财与正财分别保留，不混为一项。" />);
  fireEvent.click(screen.getByText("解释这条里的术语"));
  expect(screen.getByRole("button", { name: "解释劫财" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "解释正财" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "解释财" })).toBeNull();
});
