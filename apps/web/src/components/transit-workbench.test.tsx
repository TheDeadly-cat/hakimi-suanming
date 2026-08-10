import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { eventRecordSchema, revisionRecordSchema, type BirthInput } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import { transitTrackOrder, type TransitRouteState } from "../lib/transit-route";
import { TransitWorkbench } from "./transit-workbench";

const input: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26:15",
  timePrecision: "exact_second",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

async function fixture() {
  const chart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  const revision = revisionRecordSchema.parse({
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  });
  const atInstant = "2026-08-01T12:00:00Z";
  return { revision, atInstant, snapshot: await calculateTransitSnapshot({ revision, atInstant }) };
}

function routeState(atInstant: string, selection: TransitRouteState["selection"] = null): TransitRouteState {
  return {
    atInstant,
    selection,
    manualDirection: null,
    scale: "all",
    tracks: [...transitTrackOrder]
  };
}

describe("TransitWorkbench", () => {
  it("以六条并行轨道展示活动区间，并明确标注小运工作口径", async () => {
    const { revision, atInstant, snapshot } = await fixture();
    render(<TransitWorkbench
      revision={revision}
      route={routeState(atInstant)}
      snapshot={snapshot}
      events={[]}
      loading={false}
      error={null}
      onRouteChange={() => undefined}
      onOpenResearch={() => undefined}
    />);

    for (const name of ["大运", "小运", "流年", "流月", "流日", "流时"]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy();
    }
    expect(screen.getAllByText("时柱相邻 · 精确立春增龄（工作口径）")).toHaveLength(2);
    expect(screen.getByText(/当前出生时柱相邻起法及精确立春边界是产品建模选择，尚非唯一流派结论/)).toBeTruthy();
    expect(screen.getAllByText("覆盖目标")).toHaveLength(6);
    expect(screen.getByRole("heading", { name: "当前最细活动节点" })).toBeTruthy();
  });

  it("点击节点把节点类型、稳定 ID 和节点起点交给 URL 状态层", async () => {
    const { revision, atInstant, snapshot } = await fixture();
    const onRouteChange = vi.fn();
    render(<TransitWorkbench
      revision={revision}
      route={routeState(atInstant)}
      snapshot={snapshot}
      events={[]}
      loading={false}
      error={null}
      onRouteChange={onRouteChange}
      onOpenResearch={() => undefined}
    />);

    const yearSection = screen.getByRole("heading", { name: "流年" }).closest("section");
    const yearButtons = within(yearSection!).getAllByRole("button");
    fireEvent.click(yearButtons[0]);

    const expected = snapshot.tracks.year[0];
    expect(onRouteChange).toHaveBeenCalledWith(expect.objectContaining({
      atInstant: expected.startInstant.replace(".000Z", "Z"),
      selection: { nodeType: "year", nodeId: expected.ref.nodeId }
    }));
  });

  it("每条轨道只保留一个 Tab 停靠点，并支持方向键、Home 与 End 浏览", async () => {
    const { revision, atInstant, snapshot } = await fixture();
    render(<TransitWorkbench
      revision={revision}
      route={routeState(atInstant)}
      snapshot={snapshot}
      events={[]}
      loading={false}
      error={null}
      onRouteChange={() => undefined}
      onOpenResearch={() => undefined}
    />);

    const tracks = screen.getByRole("region", { name: "六层运限时间线" });
    for (const list of within(tracks).getAllByRole("list")) {
      expect(list.querySelectorAll("button[tabindex='0']")).toHaveLength(1);
    }

    const yearSection = screen.getByRole("heading", { name: "流年" }).closest("section");
    const yearButtons = within(yearSection!).getAllByRole("button");
    const initialIndex = yearButtons.findIndex((button) => button.tabIndex === 0);
    yearButtons[initialIndex].focus();

    fireEvent.keyDown(yearButtons[initialIndex], { key: "ArrowRight" });
    const nextIndex = Math.min(initialIndex + 1, yearButtons.length - 1);
    expect(document.activeElement).toBe(yearButtons[nextIndex]);
    expect(yearButtons[nextIndex].tabIndex).toBe(0);

    fireEvent.keyDown(yearButtons[nextIndex], { key: "End" });
    expect(document.activeElement).toBe(yearButtons.at(-1));
    expect(yearButtons.at(-1)?.tabIndex).toBe(0);

    fireEvent.keyDown(yearButtons.at(-1)!, { key: "Home" });
    expect(document.activeElement).toBe(yearButtons[0]);
    expect(yearButtons[0].tabIndex).toBe(0);
  });

  it("节点检查器只展示同案例同修订的精确绑定，并生成事件 UUID 研读深链", async () => {
    const { revision, atInstant, snapshot } = await fixture();
    if (snapshot.slots.year.status !== "resolved") throw new Error("测试夹具缺少流年节点");
    const node = snapshot.slots.year.node;
    const event = eventRecordSchema.parse({
      schemaVersion: "1.0.0",
      recordVersion: 2,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      caseId: revision.caseId,
      revisionId: revision.id,
      transitNodeRef: node.ref,
      datePrecision: "day",
      startDate: "2026-08-01",
      endDate: null,
      title: "精确节点事件",
      tags: [],
      sourceRefs: [],
      feedback: "supports",
      bodyFormat: "markdown",
      body: "",
      timeContext: { kind: "calendar_date" },
      deletedAt: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    });
    const wrongRevision = {
      ...event,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      revisionId: "33333333-3333-4333-8333-333333333333"
    };

    render(<TransitWorkbench
      revision={revision}
      route={routeState(atInstant, { nodeType: node.nodeType, nodeId: node.ref.nodeId })}
      snapshot={snapshot}
      events={[event, wrongRevision]}
      loading={false}
      error={null}
      onRouteChange={() => undefined}
      onOpenResearch={() => undefined}
    />);

    expect(screen.getByText("已绑定事件 1 条")).toBeTruthy();
    const link = screen.getByRole("link", { name: "打开事件 精确节点事件" });
    const url = new URL(link.getAttribute("href")!, "https://hakimi.test");
    expect(url.pathname).toBe(`/cases/${revision.caseId}/revisions/${revision.id}`);
    expect(url.searchParams.get("view")).toBe("research");
    expect(url.searchParams.get("event")).toBe(event.id);
    expect(url.searchParams.get("node")).toBe(`${node.nodeType}:${node.ref.nodeId}`);
    expect(url.searchParams.get("at")).toBe(node.ref.startInstant.replace(".000Z", "Z"));
    expect(screen.queryByRole("link", { name: /bbbb/ })).toBeNull();
  });

  it("applies a scale preset without replacing history or recalculating the snapshot", async () => {
    const { revision, atInstant, snapshot } = await fixture();
    const onRouteChange = vi.fn();
    const props = {
      revision,
      snapshot,
      events: [],
      loading: false,
      error: null,
      onRouteChange,
      onOpenResearch: () => undefined
    };
    const { container, rerender } = render(<TransitWorkbench {...props} route={routeState(atInstant)} />);

    const initialHash = container.querySelector(".transit-view-controls")?.getAttribute("data-snapshot-hash");
    const scaleButtons = container.querySelectorAll<HTMLButtonElement>(".transit-scale-control button");
    fireEvent.click(scaleButtons[3]);

    expect(onRouteChange).toHaveBeenCalledTimes(1);
    expect(onRouteChange).toHaveBeenCalledWith(expect.objectContaining({
      atInstant,
      selection: null,
      scale: "day",
      tracks: ["month", "day"]
    }));

    const nextRoute = onRouteChange.mock.calls[0][0] as TransitRouteState;
    rerender(<TransitWorkbench {...props} route={nextRoute} />);
    expect(container.querySelectorAll(".transit-track")).toHaveLength(2);
    expect(container.querySelector("#transit-track-month")).toBeTruthy();
    expect(container.querySelector("#transit-track-day")).toBeTruthy();
    expect(container.querySelector("#transit-track-year")).toBeNull();
    expect(container.querySelector(".transit-view-controls")?.getAttribute("data-snapshot-hash")).toBe(initialHash);
  });

  it("replaces track-filter URL state and keeps a hidden selected node stable", async () => {
    const { revision, atInstant, snapshot } = await fixture();
    if (snapshot.slots.year.status !== "resolved") throw new Error("year fixture missing");
    const selected = snapshot.slots.year.node;
    const onRouteChange = vi.fn();
    const props = {
      revision,
      snapshot,
      events: [],
      loading: false,
      error: null,
      onRouteChange,
      onOpenResearch: () => undefined
    };
    const initialRoute = routeState(atInstant, { nodeType: "year", nodeId: selected.ref.nodeId });
    const { container, rerender } = render(<TransitWorkbench {...props} route={initialRoute} />);

    const trackCheckboxes = container.querySelectorAll<HTMLInputElement>(".transit-track-filter input[type='checkbox']");
    fireEvent.click(trackCheckboxes[2]);

    const filteredRoute = onRouteChange.mock.calls[0][0] as TransitRouteState;
    expect(filteredRoute.selection).toEqual(initialRoute.selection);
    expect(filteredRoute.atInstant).toBe(atInstant);
    expect(filteredRoute.tracks).not.toContain("year");
    expect(onRouteChange.mock.calls[0][1]).toEqual({ replace: true });

    rerender(<TransitWorkbench {...props} route={filteredRoute} />);
    expect(container.querySelector("#transit-track-year")).toBeNull();
    expect(container.querySelector(".transit-hidden-selection")).toBeTruthy();

    fireEvent.click(container.querySelector<HTMLButtonElement>(".transit-hidden-selection button")!);
    const restoredRoute = onRouteChange.mock.calls[1][0] as TransitRouteState;
    expect(restoredRoute.selection).toEqual(initialRoute.selection);
    expect(restoredRoute.tracks).toContain("year");
    expect(onRouteChange.mock.calls[1][1]).toEqual({ replace: true });
  });
});
