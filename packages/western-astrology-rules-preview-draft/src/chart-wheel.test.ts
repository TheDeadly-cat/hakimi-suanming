// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  annularSectorPath,
  midLongitude,
  wheelPoint
} from "./browser-app/chart-wheel.ts";

describe("Western chart wheel geometry", () => {
  it("places 0° at the left and increases counter-clockwise", () => {
    expect(wheelPoint(240, 100, 0).x).toBeCloseTo(140, 9);
    expect(wheelPoint(240, 100, 0).y).toBeCloseTo(240, 9);
    expect(wheelPoint(240, 100, 90).y).toBeGreaterThan(240);
    expect(wheelPoint(240, 100, 180).x).toBeCloseTo(340, 9);
    expect(wheelPoint(240, 100, 180).y).toBeCloseTo(240, 9);
    expect(wheelPoint(240, 100, 270).y).toBeLessThan(240);
  });

  it("computes wrap-aware mid-longitudes and annular sector paths", () => {
    expect(midLongitude(350, 10)).toBeCloseTo(0, 9);
    expect(midLongitude(0, 90)).toBeCloseTo(45, 9);
    const path = annularSectorPath(240, 100, 120, 0, 90);
    expect(path).toContain("M 120.000 240.000");
    expect(path).toContain("A 120 120 0 0 1");
    expect(path.split(" ")).toContain("Z");
    const wrap = annularSectorPath(240, 100, 120, 350, 10);
    expect(wrap).toContain("A 120 120 0 0 1");
  });
});
