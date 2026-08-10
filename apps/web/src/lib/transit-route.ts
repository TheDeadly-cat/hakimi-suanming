import type { LuckDirection } from "@hakimi/luck-core";
import type { TransitNodeType } from "@hakimi/contracts";

export const chartViews = ["overview", "structure", "transit", "research"] as const;
export type ChartView = (typeof chartViews)[number];

export type TransitSelection = {
  nodeType: TransitNodeType;
  nodeId: string;
};

export const transitTrackOrder = ["dayun", "xiaoyun", "year", "month", "day", "hour"] as const satisfies readonly TransitNodeType[];
export const transitScales = ["all", "year", "month", "day", "hour"] as const;
export type TransitScale = (typeof transitScales)[number];

export const transitScaleTracks: Readonly<Record<TransitScale, readonly TransitNodeType[]>> = {
  all: transitTrackOrder,
  year: ["dayun", "xiaoyun", "year"],
  month: ["year", "month"],
  day: ["month", "day"],
  hour: ["day", "hour"]
};

export type TransitRouteState = {
  atInstant: string | null;
  selection: TransitSelection | null;
  manualDirection: LuckDirection | null;
  scale: TransitScale;
  tracks: TransitNodeType[];
};

export type ResearchRouteState = {
  eventId: string | null;
};

export type ChartRouteState = {
  view: ChartView;
  transit: TransitRouteState;
  research: ResearchRouteState;
  issues: string[];
};

const nodeTypes = new Set<TransitNodeType>(transitTrackOrder);
const scaleTypes = new Set<TransitScale>(transitScales);
const instantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
const nodeIdPattern = /^\d{1,16}\.[a-f0-9]{64}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function canonicalInstant(value: string | number | Date): string {
  const epoch = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(epoch)) throw new Error("无法生成有效的运限瞬时点。");
  return new Date(Math.floor(epoch / 1_000) * 1_000).toISOString().replace(".000Z", "Z");
}

function sameTracks(left: readonly TransitNodeType[], right: readonly TransitNodeType[]): boolean {
  return left.length === right.length && left.every((track, index) => track === right[index]);
}

function canonicalTracks(rawTracks: readonly string[]): TransitNodeType[] | null {
  if (!rawTracks.length) return null;
  const unique = new Set(rawTracks);
  if (unique.size !== rawTracks.length || rawTracks.some((track) => !nodeTypes.has(track as TransitNodeType))) return null;
  return transitTrackOrder.filter((track) => unique.has(track));
}

export function parseChartRoute(search: string): ChartRouteState {
  const params = new URLSearchParams(search);
  const issues: string[] = [];
  const rawView = params.get("view");
  const view = chartViews.includes(rawView as ChartView) ? rawView as ChartView : "structure";
  if (rawView && view === "structure" && rawView !== "structure") issues.push("未知视图参数已忽略。");

  const rawAt = params.get("at");
  let atInstant: string | null = null;
  if (rawAt) {
    if (instantPattern.test(rawAt) && Number.isFinite(Date.parse(rawAt))) atInstant = canonicalInstant(rawAt);
    else issues.push("无效的运限时间参数已忽略。");
  }

  const rawNode = params.get("node");
  let selection: TransitSelection | null = null;
  if (rawNode) {
    const separator = rawNode.indexOf(":");
    const nodeType = rawNode.slice(0, separator) as TransitNodeType;
    const nodeId = rawNode.slice(separator + 1);
    if (separator > 0 && nodeTypes.has(nodeType) && nodeIdPattern.test(nodeId)) selection = { nodeType, nodeId };
    else issues.push("无效的运限节点参数已忽略。");
  }

  const rawDirection = params.get("dir");
  const manualDirection = rawDirection === "forward" || rawDirection === "backward" ? rawDirection : null;
  if (rawDirection && !manualDirection) issues.push("无效的顺逆参数已忽略。");

  const rawScale = params.get("scale");
  const scale = rawScale && scaleTypes.has(rawScale as TransitScale) ? rawScale as TransitScale : "all";
  if (rawScale && rawScale !== scale) issues.push("无效的运限缩放参数已忽略。");

  const rawTracks = params.getAll("track");
  const parsedTracks = canonicalTracks(rawTracks);
  const tracks = rawTracks.length === 0 || parsedTracks === null ? [...transitScaleTracks[scale]] : parsedTracks;
  if (rawTracks.length > 0 && parsedTracks === null) issues.push("无效的运限轨道筛选已忽略。");

  const rawEvent = params.get("event");
  let eventId: string | null = null;
  if (rawEvent) {
    if (view !== "research") issues.push("事件深链只适用于研读视图，已忽略。");
    else if (uuidPattern.test(rawEvent)) eventId = rawEvent.toLowerCase();
    else issues.push("无效的事件参数已忽略；不会定位到近似事件。");
  }

  return { view, transit: { atInstant, selection, manualDirection, scale, tracks }, research: { eventId }, issues };
}

export function buildChartSearch(
  view: ChartView,
  transit?: Partial<TransitRouteState>,
  research?: Partial<ResearchRouteState>
): string {
  const params = new URLSearchParams();
  if (view !== "structure") params.set("view", view);
  if (view === "transit" || view === "research") {
    if (transit?.atInstant) params.set("at", canonicalInstant(transit.atInstant));
    if (transit?.selection) params.set("node", `${transit.selection.nodeType}:${transit.selection.nodeId}`);
    if (transit?.manualDirection) params.set("dir", transit.manualDirection);
    const scale = transit?.scale ?? "all";
    if (!scaleTypes.has(scale)) throw new Error("无法生成有效的运限缩放状态。");
    if (scale !== "all") params.set("scale", scale);
    const requestedTracks = transit?.tracks ?? transitScaleTracks[scale];
    const tracks = canonicalTracks(requestedTracks);
    if (!tracks) throw new Error("无法生成有效的运限轨道筛选。");
    if (!sameTracks(tracks, transitScaleTracks[scale])) {
      for (const track of tracks) params.append("track", track);
    }
  }
  if (view === "research" && research?.eventId) {
    if (!uuidPattern.test(research.eventId)) throw new Error("无法生成有效的事件深链。");
    params.set("event", research.eventId.toLowerCase());
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}
