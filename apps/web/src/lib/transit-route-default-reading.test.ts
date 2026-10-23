import { describe, expect, it } from "vitest";
import { buildChartSearch, parseChartRoute, transitTrackOrder } from "./transit-route";

describe("default reading route preserves explicit and malformed historical routes", () => {
  it.each(["", "?"])("opens reading for an empty query %j and roundtrips the explicit reading link", (query) => {
    const route = parseChartRoute(query);
    expect(route).toMatchObject({ view: "reading", issues: [], transit: { selection: null, atInstant: null, tracks: transitTrackOrder } });
    expect(buildChartSearch(route.view, route.transit, route.research)).toBe("?view=reading");
    expect(parseChartRoute(buildChartSearch(route.view, route.transit, route.research))).toEqual(route);
  });

  it("keeps an explicit old structure link on structure", () => {
    const route = parseChartRoute("?view=structure");
    expect(route.view).toBe("structure");
    expect(route.issues).toEqual([]);
    expect(buildChartSearch(route.view, route.transit, route.research)).toBe("?view=structure");
    expect(parseChartRoute(buildChartSearch(route.view))).toEqual(route);
  });

  it.each([
    "?view=fortune&at=yesterday&node=year:bad&dir=sideways",
    "?view=reading&view=structure", "?unknown=legacy", "?at=not-an-instant",
    `?view=${"x".repeat(2050)}`
  ])("keeps malformed historical input closed on structure: %s", (query) => {
    const route = parseChartRoute(query);
    expect(route.view).toBe("structure");
    expect(route.issues.length).toBeGreaterThan(0);
    expect(route.transit.selection).toBeNull();
    const canonical = buildChartSearch(route.view, route.transit, route.research);
    expect(canonical).toBe("?view=structure");
    expect(parseChartRoute(canonical)).toMatchObject({ view: "structure", issues: [] });
  });
});
