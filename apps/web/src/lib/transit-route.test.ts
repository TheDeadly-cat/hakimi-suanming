import { describe, expect, it } from "vitest";
import {
  buildChartSearch,
  canonicalInstant,
  parseChartRoute,
  transitTrackOrder
} from "./transit-route";

const nodeId = `1780000000000.${"a".repeat(64)}`;
const eventId = "10000000-0000-4000-8000-000000000001";

describe("transit route codec", () => {
  it("往返编码可分享的视图、瞬时点、节点与人工方向", () => {
    const search = buildChartSearch("transit", {
      atInstant: "2026-08-01T12:34:56.789Z",
      selection: { nodeType: "month", nodeId },
      manualDirection: "forward"
    });
    const parsed = parseChartRoute(search);

    expect(parsed).toMatchObject({
      view: "transit",
      transit: {
        atInstant: "2026-08-01T12:34:56Z",
        selection: { nodeType: "month", nodeId },
        manualDirection: "forward",
        scale: "all",
        tracks: transitTrackOrder
      },
      research: { eventId: null },
      issues: []
    });
  });

  it("非运限视图不携带运限状态或敏感出生资料", () => {
    expect(buildChartSearch("overview", {
      atInstant: "2026-08-01T12:34:56Z",
      selection: { nodeType: "day", nodeId }
    })).toBe("?view=overview");
  });

  it("拒绝畸形参数并安全回退到结构页", () => {
    const parsed = parseChartRoute("?view=fortune&at=yesterday&node=year:bad&dir=sideways");
    expect(parsed.view).toBe("structure");
    expect(parsed.transit).toEqual({
      atInstant: null,
      selection: null,
      manualDirection: null,
      scale: "all",
      tracks: transitTrackOrder
    });
    expect(parsed.research).toEqual({ eventId: null });
    expect(parsed.issues).toHaveLength(4);
  });

  it("只在研读视图严格往返事件 UUID，并保留节点返回上下文", () => {
    const search = buildChartSearch("research", {
      atInstant: "2026-08-01T12:34:56Z",
      selection: { nodeType: "month", nodeId },
      manualDirection: "backward"
    }, { eventId: eventId.toUpperCase() });

    expect(parseChartRoute(search)).toMatchObject({
      view: "research",
      transit: {
        atInstant: "2026-08-01T12:34:56Z",
        selection: { nodeType: "month", nodeId },
        manualDirection: "backward",
        scale: "all",
        tracks: transitTrackOrder
      },
      research: { eventId },
      issues: []
    });
  });

  it("非研读视图忽略 event，畸形 UUID 显式报错且不近似定位", () => {
    const wrongView = parseChartRoute(`?view=transit&event=${eventId}`);
    expect(wrongView.research.eventId).toBeNull();
    expect(wrongView.issues).toContain("事件深链只适用于研读视图，已忽略。");

    const malformed = parseChartRoute("?view=research&event=10000000-0000-0000-0000-000000000001");
    expect(malformed.research.eventId).toBeNull();
    expect(malformed.issues).toContain("无效的事件参数已忽略；不会定位到近似事件。");
    expect(() => buildChartSearch("research", undefined, { eventId: "not-a-uuid" })).toThrow("无法生成有效的事件深链");
  });

  it("把任意有效日期截到整秒 UTC", () => {
    expect(canonicalInstant("2026-08-01T20:34:56.999+08:00")).toBe("2026-08-01T12:34:56Z");
  });

  it("确定性往返粒度预设与自定义轨道，并按固定六轨顺序序列化", () => {
    const preset = buildChartSearch("transit", {
      scale: "day",
      tracks: ["month", "day"]
    });
    expect(preset).toBe("?view=transit&scale=day");
    expect(parseChartRoute(preset).transit).toMatchObject({
      scale: "day",
      tracks: ["month", "day"]
    });

    const customized = buildChartSearch("transit", {
      scale: "day",
      tracks: ["hour", "dayun", "year"]
    });
    expect(customized).toBe("?view=transit&scale=day&track=dayun&track=year&track=hour");
    expect(parseChartRoute(customized).transit).toMatchObject({
      scale: "day",
      tracks: ["dayun", "year", "hour"]
    });
  });

  it("轨道参数重复、未知或空值时整组失败关闭到当前粒度预设", () => {
    const duplicated = parseChartRoute("?view=transit&scale=month&track=year&track=year");
    expect(duplicated.transit).toMatchObject({ scale: "month", tracks: ["year", "month"] });
    expect(duplicated.issues).toContain("无效的运限轨道筛选已忽略。");

    const unknown = parseChartRoute("?view=transit&scale=hour&track=day&track=fortune");
    expect(unknown.transit).toMatchObject({ scale: "hour", tracks: ["day", "hour"] });
    expect(unknown.issues).toContain("无效的运限轨道筛选已忽略。");

    expect(() => buildChartSearch("transit", {
      scale: "all",
      tracks: []
    })).toThrow("无法生成有效的运限轨道筛选");
  });

  it("无效缩放不透传，回退全景并保留显式问题", () => {
    const parsed = parseChartRoute("?view=transit&scale=decade&track=year");
    expect(parsed.transit).toMatchObject({ scale: "all", tracks: ["year"] });
    expect(parsed.issues).toContain("无效的运限缩放参数已忽略。");
    expect(() => buildChartSearch("transit", {
      scale: "decade" as never,
      tracks: ["year"]
    })).toThrow("无法生成有效的运限缩放状态");
  });
});
