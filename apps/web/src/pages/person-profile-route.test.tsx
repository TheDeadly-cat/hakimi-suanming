import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../app";

vi.mock("./person-profile-page", () => ({ PersonProfilePage: ({ caseId }: { caseId: string }) => <h1>个人档案路由 {caseId}</h1> }));
afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); });

describe("个人档案入口", () => {
  it("直接打开个人档案链接，采用精确 UUID 并更新页面标题", async () => {
    const id = "AA111111-1111-4111-8111-111111111111";
    window.history.replaceState({}, "", `/cases/${id}`);
    render(<App />);
    expect(await screen.findByRole("heading", { name: `个人档案路由 ${id.toLowerCase()}` })).toBeTruthy();
    expect(document.title).toBe("个人档案 · 哈基米八字研究台");
  });

  it("无效档案路径保留未找到页，不误打开个人资料", async () => {
    window.history.replaceState({}, "", "/cases/not-a-local-id");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "这条研究路径不存在" })).toBeTruthy();
    expect(screen.queryByText(/个人档案路由/)).toBeNull();
  });
});
