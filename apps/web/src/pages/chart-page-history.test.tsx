import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { withDayBoundary } from "@hakimi/rule-profiles";
import {
  CaseRepository, ResearchDatabase, ResearchRepository, caseRepository, researchRepository
} from "@hakimi/storage";
import { calculateTransitSnapshot, TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0, requireHistoricalTransitSnapshotExecutor } from "@hakimi/transit-core";
import { sha256Hex } from "@hakimi/integrity";
import type { RevisionRecord, TransitNode } from "@hakimi/contracts";
import { ChartPage } from "./chart-page";
import { buildChartSearch } from "../lib/transit-route";
import { navigate } from "../lib/router";
import { clearBootGovernanceFixture, installLegacyV13BootGovernance } from "../test/boot-governance-fixture";
import * as routeCalculator from "../lib/chart-transit-snapshot";

let database: ResearchDatabase;
let cases: CaseRepository;
let research: ResearchRepository;
let revision: RevisionRecord;

beforeEach(async () => {
  installLegacyV13BootGovernance();
  window.localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  database = new ResearchDatabase(`history-route-synthetic-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
  cases = new CaseRepository(database);
  research = new ResearchRepository(database);
  const chart = await calculateChart({
    schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic route fixture", latitude: null, longitude: null, precision: "city" }, sourceNote: ""
  }, withDayBoundary("midnight"));
  const bundle = await cases.createCase({ alias: "旧节点深链合成案例", calculated: chart });
  revision = bundle.revisions[0]!;
  vi.spyOn(caseRepository, "getCase").mockImplementation((id) => cases.getCase(id));
  vi.spyOn(researchRepository, "listEventsByCase").mockImplementation((id, options) => research.listEventsByCase(id, options));
  vi.spyOn(researchRepository, "listResearchNotesByCase").mockImplementation((id, options) => research.listResearchNotesByCase(id, options));
  vi.spyOn(researchRepository, "readResearchJournalSnapshot").mockImplementation((id, options) => research.readResearchJournalSnapshot(id, options));
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  clearBootGovernanceFixture();
  window.history.replaceState({}, "", "/");
  window.localStorage.clear();
  await database?.delete();
});

function path() { return `/cases/${revision.caseId}/revisions/${revision.id}`; }
function route(node: TransitNode | null, atInstant: string) {
  return `${path()}${buildChartSearch("transit", {
    atInstant, selection: node ? { nodeType: node.nodeType, nodeId: node.ref.nodeId } : null,
    manualDirection: null, scale: "hour", tracks: ["day", "hour"]
  })}`;
}
function hour(snapshot: Awaited<ReturnType<typeof calculateTransitSnapshot>>): TransitNode {
  if (snapshot.slots.hour.status !== "resolved") throw new Error("expected a synthetic hour");
  return snapshot.slots.hour.node;
}

describe("ChartPage historical node deep links", () => {
  it("opens a stored v1.2 event return link with the complete exact historical snapshot", async () => {
    const executor = requireHistoricalTransitSnapshotExecutor(TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0);
    const original = await executor.calculateSnapshot({ revision, atInstant: "2024-02-04T16:30:00Z" });
    const node = hour(original);
    const record = await research.createEvent({
      caseId: revision.caseId, revisionId: revision.id, transitNodeRef: node.ref,
      datePrecision: "day", startDate: "2024-02-05", endDate: null, title: "旧版节点事件",
      tags: [], sourceRefs: [], feedback: "unreviewed", body: "Synthetic historical event"
    });
    window.history.replaceState({}, "", `${path()}?view=research&event=${record.id}`);
    render(<ChartPage caseId={revision.caseId} revisionId={revision.id} />);
    const back = await screen.findByRole("link", { name: /返回绑定运限节点/ });
    const backAt = new URL(back.getAttribute("href")!, "https://synthetic.invalid").searchParams.get("at")!;
    const expected = await executor.calculateSnapshot({ revision, atInstant: backAt });
    fireEvent.click(back);
    await waitFor(() => expect(document.querySelector("[data-snapshot-hash]")?.getAttribute("data-snapshot-hash")).toBe(expected.resultHash));
    const inspector = document.querySelector('[data-inspector-mode="selected"]');
    expect(inspector).not.toBeNull();
    expect(within(inspector as HTMLElement).getByTitle(node.ref.nodeId)).toBeTruthy();
    expect(screen.getByText(/正在查看旧节点的历史计算（v1.2）/)).toBeTruthy();
    expect(screen.queryByText("URL 节点未通过精确复算")).toBeNull();
    expect((await research.getEvent(record.id))?.transitNodeRef).toEqual(node.ref);
  });

  it("switches exact old/current selections at the same instant and always uses current without a selection", async () => {
    const atInstant = "2024-02-04T16:30:00Z";
    const original = await requireHistoricalTransitSnapshotExecutor(TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0).calculateSnapshot({ revision, atInstant });
    const current = await calculateTransitSnapshot({ revision, atInstant });
    // The old node selection is independent of the event index loading.
    vi.spyOn(researchRepository, "listEventsByCase").mockImplementation(() => new Promise(() => undefined));
    window.history.replaceState({}, "", route(hour(original), atInstant));
    render(<ChartPage caseId={revision.caseId} revisionId={revision.id} />);
    await waitFor(() => expect(document.querySelector("[data-snapshot-hash]")?.getAttribute("data-snapshot-hash")).toBe(original.resultHash));
    expect(screen.getByText(/正在查看旧节点的历史计算（v1.2）/)).toBeTruthy();
    await act(async () => { navigate(route(hour(current), atInstant), { scroll: false }); });
    await waitFor(() => expect(document.querySelector("[data-snapshot-hash]")?.getAttribute("data-snapshot-hash")).toBe(current.resultHash));
    expect(screen.queryByText(/正在查看旧节点的历史计算（v1.2）/)).toBeNull();
    expect(document.querySelector('[data-inspector-mode="selected"]')).not.toBeNull();
    await act(async () => { navigate(route(null, atInstant), { scroll: false }); });
    await waitFor(() => expect(document.querySelector("[data-snapshot-hash]")?.getAttribute("data-snapshot-hash")).toBe(current.resultHash));
    expect(document.querySelector('[data-inspector-mode="selected"]')).toBeNull();
  });

  it.each(["tampered", "wrong-track", "v1.1"] as const)("rejects a %s node without selecting an approximate node", async (kind) => {
    const atInstant = "2024-02-04T16:30:00Z";
    const previous = await requireHistoricalTransitSnapshotExecutor(TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0).calculateSnapshot({ revision, atInstant });
    const node = structuredClone(hour(previous));
    if (kind === "tampered") node.ref.nodeId = `${node.ref.nodeId.slice(0, -1)}${node.ref.nodeId.endsWith("0") ? "1" : "0"}`;
    if (kind === "wrong-track") node.nodeType = "day";
    if (kind === "v1.1") {
      const factHash = await sha256Hex({
        timelineVersion: "hakimi-transit:1.1.0", algorithmId: node.ref.algorithmId,
        revisionId: node.ref.revisionId, chartResultHash: node.ref.chartResultHash,
        ruleProfileDigest: node.ref.ruleProfileDigest, luckCycleRuleDigest: node.ref.luckCycleRuleDigest,
        manualDirection: node.ref.manualDirection, nodeType: node.nodeType,
        startInstant: node.startInstant, endExclusiveInstant: node.endExclusiveInstant,
        frame: node.frame, ganZhi: node.ganZhi, index: node.index, boundaryLabel: node.boundaryLabel
      });
      node.ref.nodeId = `${Date.parse(node.startInstant)}.${factHash}`;
    }
    window.history.replaceState({}, "", route(node, atInstant));
    render(<ChartPage caseId={revision.caseId} revisionId={revision.id} />);
    expect(await screen.findByText(/不会定位到同名、相邻或未知版本节点/)).toBeTruthy();
    expect(document.querySelector('[data-inspector-mode="selected"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "到研读页记录事件" })).toBeNull();
    expect(document.querySelector("[data-snapshot-hash]")).toBeNull();
  });

  it("does not publish a late historical selection after the route has moved to current", async () => {
    const atInstant = "2024-02-04T16:30:00Z";
    const previous = await requireHistoricalTransitSnapshotExecutor(TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0).calculateSnapshot({ revision, atInstant });
    const current = await calculateTransitSnapshot({ revision, atInstant });
    let release!: (value: typeof previous) => void;
    const held = new Promise<typeof previous>((resolve) => { release = resolve; });
    const calculate = vi.spyOn(routeCalculator, "calculateChartRouteTransitSnapshot").mockImplementationOnce(() => held);
    window.history.replaceState({}, "", route(hour(previous), atInstant));
    render(<ChartPage caseId={revision.caseId} revisionId={revision.id} />);
    await waitFor(() => expect(calculate).toHaveBeenCalledTimes(1));
    await act(async () => { navigate(route(null, atInstant), { scroll: false }); });
    await waitFor(() => expect(document.querySelector("[data-snapshot-hash]")?.getAttribute("data-snapshot-hash")).toBe(current.resultHash));
    await act(async () => { release(previous); await held; });
    expect(document.querySelector("[data-snapshot-hash]")?.getAttribute("data-snapshot-hash")).toBe(current.resultHash);
    expect(screen.queryByText(/正在查看旧节点的历史计算（v1.2）/)).toBeNull();
  });
});
