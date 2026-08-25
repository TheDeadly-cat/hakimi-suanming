import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calculateChart } from "@hakimi/bazi-core";
import type { BirthInput, RevisionRecord } from "@hakimi/contracts";
import type { RevisionDerivedReplayRequest } from "@hakimi/revision-replay";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { RevisionDerivedReplayPanel } from "./revision-derived-replay-panel";

const birth: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26:00",
  timePrecision: "exact_second",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "上海", latitude: 31.2304, longitude: 121.4737, precision: "coordinates" },
  sourceNote: ""
};

let revision: RevisionRecord;

beforeAll(async () => {
  const chart = await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE);
  revision = {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    createdAt: "2026-08-03T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
});

describe("RevisionDerivedReplayPanel", () => {
  it("states the provenance boundary and runs all three explicit projections without writing a Revision", async () => {
    const sourceBefore = structuredClone(revision);
    render(
      <RevisionDerivedReplayPanel
        revision={revision}
        atInstant="2025-08-18T00:00:00Z"
        routeManualDirection={null}
      />
    );

    expect(screen.getByText("不冒充旧输出")).not.toBeNull();
    expect(screen.getByText(/不会声称“与旧输出一致”/)).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "生成只读显式派生投影" }));

    expect(await screen.findByText("本次请求所需组件均已生成，源 Revision 未改写")).not.toBeNull();
    expect(screen.getByText(/条关系记录/)).not.toBeNull();
    expect(screen.getByText(/10 柱/)).not.toBeNull();
    expect(screen.getByText(/6 层已解析/)).not.toBeNull();
    expect(screen.getAllByText(/relations-0\.1\.0_luck-0\.1\.0_transit-1\.2\.0/).length).toBeGreaterThan(0);
    const disclosure = screen.getByText("完整执行绑定").closest("details");
    expect(disclosure).not.toBeNull();
    await userEvent.click(within(disclosure!).getByText("完整执行绑定"));
    expect(within(disclosure!).getByText(revision.manifest.resultHash)).not.toBeNull();
    expect(revision).toEqual(sourceBefore);
  });

  it("does not invent a Transit instant and resets a completed projection when the request changes", async () => {
    const { rerender } = render(
      <RevisionDerivedReplayPanel revision={revision} atInstant={null} routeManualDirection={null} />
    );
    await userEvent.click(screen.getByRole("button", { name: "生成只读显式派生投影" }));
    expect(await screen.findByText("本次请求所需组件均已生成，源 Revision 未改写")).not.toBeNull();
    const transitCard = screen.getByRole("heading", { name: "运限切片" }).closest("article");
    expect(transitCard).not.toBeNull();
    expect(transitCard!.getAttribute("data-component-status")).toBe("not_requested");
    expect(within(transitCard!).getAllByText("未请求")).toHaveLength(2);

    rerender(
      <RevisionDerivedReplayPanel
        revision={revision}
        atInstant="2026-01-01T00:00:00.000Z"
        routeManualDirection={null}
      />
    );
    await waitFor(() => expect(screen.queryByText("本次请求所需组件均已生成，源 Revision 未改写")).toBeNull());
    expect(screen.getByText("2026-01-01T00:00:00.000Z")).not.toBeNull();
  });

  it("requires a visible direction choice when sex is unspecified", async () => {
    const chart = await calculateChart({ ...birth, sex: "unspecified" }, WORKING_DEFAULT_RULE_PROFILE);
    const unspecified: RevisionRecord = {
      ...revision,
      id: "33333333-3333-4333-8333-333333333333",
      input: chart.input,
      timeCalibration: chart.timeCalibration,
      ruleProfile: chart.ruleProfile,
      luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
      facts: chart.facts,
      manifest: chart.manifest
    };
    render(
      <RevisionDerivedReplayPanel revision={unspecified} atInstant={null} routeManualDirection={null} />
    );
    expect((screen.getByRole("combobox", { name: "起运顺逆" }) as HTMLSelectElement).value).toBe("");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "起运顺逆" }), "forward");
    await userEvent.click(screen.getByRole("button", { name: "生成只读显式派生投影" }));
    expect(await screen.findByText(/顺行 · 10 柱/)).not.toBeNull();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "起运顺逆" }), "backward");
    expect(screen.queryByText(/顺行 · 10 柱/)).toBeNull();
    expect(screen.queryByText("本次请求所需组件均已生成，源 Revision 未改写")).toBeNull();
  });

  it("does not let an in-flight result from an old target repopulate the changed request", async () => {
    const { rerender } = render(
      <RevisionDerivedReplayPanel
        revision={revision}
        atInstant="2025-08-18T00:00:00.000Z"
        routeManualDirection={null}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "生成只读显式派生投影" }));
    rerender(
      <RevisionDerivedReplayPanel
        revision={revision}
        atInstant="2026-01-01T00:00:00.000Z"
        routeManualDirection={null}
      />
    );
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    expect(screen.getByText("2026-01-01T00:00:00.000Z")).not.toBeNull();
    expect(screen.queryByText("本次请求所需组件均已生成，源 Revision 未改写")).toBeNull();
    expect(screen.queryByText("部分所需组件不可用，源 Revision 未改写")).toBeNull();
  });

  it("only saves an explicitly requested snapshot and passes the request back for repository recalculation", async () => {
    const onSaveSnapshot = vi.fn(async (_request: RevisionDerivedReplayRequest) => "saved" as const);
    render(
      <RevisionDerivedReplayPanel
        revision={revision}
        atInstant="2026-05-01T00:00:00.000Z"
        routeManualDirection={null}
        onSaveSnapshot={onSaveSnapshot}
      />
    );

    expect(screen.queryByRole("button", { name: "显式追加为计算收据" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "生成只读显式派生投影" }));
    await userEvent.click(await screen.findByRole("button", { name: "显式追加为计算收据" }));

    await waitFor(() => expect(onSaveSnapshot).toHaveBeenCalledTimes(1));
    const savedRequest = onSaveSnapshot.mock.calls[0]?.[0];
    if (!savedRequest) throw new Error("保存回调没有收到显式计算请求");
    expect(savedRequest).toMatchObject({
      atInstant: "2026-05-01T00:00:00.000Z"
    });
    expect(savedRequest.profile.profileId).toContain("relations-");
    expect(await screen.findByText(/上层回调报告计算快照已追加/)).not.toBeNull();
    expect(screen.getByText("上层回调状态已返回")).not.toBeNull();
  });

  it("locks an uncertain save, redacts diagnostics, and requires receipt readback before retry", async () => {
    const onSaveSnapshot = vi.fn(async (_request: RevisionDerivedReplayRequest): Promise<"saved" | "already_saved"> => {
      throw new Error("Bearer abc123 C:\\private\\receipt.json https://example.test/write");
    });
    render(
      <RevisionDerivedReplayPanel
        revision={revision}
        atInstant="2026-05-01T00:00:00.000Z"
        routeManualDirection={null}
        onSaveSnapshot={onSaveSnapshot}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "生成只读显式派生投影" }));
    await userEvent.click(await screen.findByRole("button", { name: "显式追加为计算收据" }));

    expect(await screen.findByText("保存提交状态未确认")).not.toBeNull();
    expect(screen.getByText(/凭据已隐藏/)).not.toBeNull();
    expect(screen.getByText(/本地路径已隐藏/)).not.toBeNull();
    expect(screen.getByText(/链接已隐藏/)).not.toBeNull();
    expect(screen.queryByText(/abc123/)).toBeNull();
    const lockedButton = screen.getByRole("button", { name: "保存状态待重新读取" }) as HTMLButtonElement;
    expect(lockedButton.disabled).toBe(true);
    expect(onSaveSnapshot).toHaveBeenCalledTimes(1);
  });
});
