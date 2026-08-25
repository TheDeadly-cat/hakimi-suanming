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
const instantPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:Z|[+-]\d{2}:\d{2})$/;
const nodeIdPattern = /^\d{1,16}\.[a-f0-9]{64}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedParams = new Set(["view", "at", "node", "dir", "scale", "track", "event"]);
const MAX_SEARCH_LENGTH = 2_048;

export function canonicalInstant(value: string | number | Date): string {
  const epoch = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(epoch)) throw new Error("无法生成有效的运限瞬时点。");
  const instant = new Date(Math.floor(epoch / 1_000) * 1_000);
  if (!Number.isFinite(instant.getTime())) throw new Error("无法生成有效的运限瞬时点。");
  return instant.toISOString().replace(".000Z", "Z");
}

function parseRouteInstant(value: string): string | null {
  const match = instantPattern.exec(value);
  if (!match) return null;
  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond] = match;
  const [year, month, day, hour, minute, second] = [
    rawYear,
    rawMonth,
    rawDay,
    rawHour,
    rawMinute,
    rawSecond
  ].map(Number);
  const wallClock = new Date(0);
  wallClock.setUTCFullYear(year, month - 1, day);
  wallClock.setUTCHours(hour, minute, second, 0);
  if (
    wallClock.getUTCFullYear() !== year ||
    wallClock.getUTCMonth() !== month - 1 ||
    wallClock.getUTCDate() !== day ||
    wallClock.getUTCHours() !== hour ||
    wallClock.getUTCMinutes() !== minute ||
    wallClock.getUTCSeconds() !== second
  ) {
    return null;
  }
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? canonicalInstant(epoch) : null;
}

function sameTracks(left: readonly TransitNodeType[], right: readonly TransitNodeType[]): boolean {
  return left.length === right.length && left.every((track, index) => track === right[index]);
}

function canonicalTracks(rawTracks: unknown): TransitNodeType[] | null {
  if (
    !Array.isArray(rawTracks)
    || rawTracks.length === 0
    || rawTracks.some((track) => typeof track !== "string")
  ) {
    return null;
  }
  const unique = new Set(rawTracks);
  if (unique.size !== rawTracks.length || rawTracks.some((track) => !nodeTypes.has(track as TransitNodeType))) return null;
  return transitTrackOrder.filter((track) => unique.has(track));
}

function singleRouteValue(
  params: URLSearchParams,
  key: string,
  label: string,
  issues: string[]
): string | null {
  const values = params.getAll(key);
  if (values.length > 1) {
    issues.push(`${label}参数重复，已全部忽略。`);
    return null;
  }
  return values[0] ?? null;
}

export function parseChartRoute(search: string): ChartRouteState {
  const issues: string[] = [];
  if (search.length > MAX_SEARCH_LENGTH) {
    return {
      view: "structure",
      transit: {
        atInstant: null,
        selection: null,
        manualDirection: null,
        scale: "all",
        tracks: [...transitScaleTracks.all]
      },
      research: { eventId: null },
      issues: ["图表链接超过允许长度，所有查询参数均已忽略。"]
    };
  }
  const params = new URLSearchParams(search);
  if ([...params.keys()].some((key) => !allowedParams.has(key))) {
    issues.push("图表链接包含未知参数，未知部分已忽略。");
  }
  const rawView = singleRouteValue(params, "view", "视图", issues);
  const view = chartViews.includes(rawView as ChartView) ? rawView as ChartView : "structure";
  if (rawView !== null && !chartViews.includes(rawView as ChartView)) issues.push("未知视图参数已忽略。");

  const rawAt = singleRouteValue(params, "at", "运限时间", issues);
  let atInstant: string | null = null;
  if (rawAt !== null) {
    atInstant = parseRouteInstant(rawAt);
    if (!atInstant) issues.push("无效的运限时间参数已忽略。");
  }

  const rawNode = singleRouteValue(params, "node", "运限节点", issues);
  let selection: TransitSelection | null = null;
  if (rawNode !== null) {
    const separator = rawNode.indexOf(":");
    const nodeType = rawNode.slice(0, separator) as TransitNodeType;
    const nodeId = rawNode.slice(separator + 1);
    if (separator > 0 && nodeTypes.has(nodeType) && nodeIdPattern.test(nodeId)) selection = { nodeType, nodeId };
    else issues.push("无效的运限节点参数已忽略。");
  }

  const rawDirection = singleRouteValue(params, "dir", "顺逆", issues);
  const manualDirection = rawDirection === "forward" || rawDirection === "backward" ? rawDirection : null;
  if (rawDirection !== null && !manualDirection) issues.push("无效的顺逆参数已忽略。");

  const rawScale = singleRouteValue(params, "scale", "运限缩放", issues);
  const scale = rawScale && scaleTypes.has(rawScale as TransitScale) ? rawScale as TransitScale : "all";
  if (rawScale !== null && !scaleTypes.has(rawScale as TransitScale)) issues.push("无效的运限缩放参数已忽略。");

  const rawTracks = params.getAll("track");
  const parsedTracks = canonicalTracks(rawTracks);
  const tracks = rawTracks.length === 0 || parsedTracks === null ? [...transitScaleTracks[scale]] : parsedTracks;
  if (rawTracks.length > 0 && parsedTracks === null) issues.push("无效的运限轨道筛选已忽略。");

  const rawEvent = singleRouteValue(params, "event", "事件", issues);
  let eventId: string | null = null;
  if (rawEvent !== null) {
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
  if (!chartViews.includes(view)) throw new Error("无法生成未知的图表视图状态。");
  const params = new URLSearchParams();
  if (view !== "structure") params.set("view", view);
  if (view === "transit" || view === "research") {
    if (transit?.atInstant !== undefined && transit.atInstant !== null) {
      if (typeof transit.atInstant !== "string" || transit.atInstant.length === 0) {
        throw new Error("无法生成无效的运限瞬时点状态。");
      }
      params.set("at", canonicalInstant(transit.atInstant));
    }
    if (transit?.selection) {
      if (!nodeTypes.has(transit.selection.nodeType) || !nodeIdPattern.test(transit.selection.nodeId)) {
        throw new Error("无法生成无效的运限节点状态。");
      }
      params.set("node", `${transit.selection.nodeType}:${transit.selection.nodeId}`);
    }
    if (
      transit?.manualDirection !== undefined &&
      transit.manualDirection !== null &&
      transit.manualDirection !== "forward" &&
      transit.manualDirection !== "backward"
    ) {
      throw new Error("无法生成无效的人工顺逆状态。");
    }
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
  if (view === "research" && research?.eventId !== undefined && research.eventId !== null) {
    if (typeof research.eventId !== "string" || !uuidPattern.test(research.eventId)) {
      throw new Error("无法生成有效的事件深链。");
    }
    params.set("event", research.eventId.toLowerCase());
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}
