import { describe, expect, it } from "vitest";
import {
  formatUtcOffsetSeconds,
  formatVedicCivilBrowserFailureForUi
} from "./ui-format.ts";

describe("Vedic civil fact UI formatting", () => {
  it("formats zero and ordinary minute-aligned offsets", () => {
    expect(formatUtcOffsetSeconds(0)).toBe("UTC+00:00");
    expect(formatUtcOffsetSeconds(28_800)).toBe("UTC+08:00");
    expect(formatUtcOffsetSeconds(-14_400)).toBe("UTC−04:00");
  });

  it("preserves positive and negative historical second-level offsets", () => {
    expect(formatUtcOffsetSeconds(29_143)).toBe("UTC+08:05:43");
    expect(formatUtcOffsetSeconds(-15_451)).toBe("UTC−04:17:31");
  });

  it("rejects fractional, non-finite, and day-sized offsets", () => {
    for (const value of [1.5, Number.NaN, Number.POSITIVE_INFINITY, 86_400, -86_400]) {
      expect(() => formatUtcOffsetSeconds(value)).toThrow("UTC_OFFSET_SECONDS_INVALID");
    }
  });

  it("does not present local wall-time overlap or gap handling as a DST classification", () => {
    expect(formatVedicCivilBrowserFailureForUi("DST_GAP_REJECTED"))
      .toBe("本地墙时空档被拒绝");
    expect(formatVedicCivilBrowserFailureForUi("DST_OVERLAP_REJECTED"))
      .toBe("本地墙时重叠被拒绝");
    expect(formatVedicCivilBrowserFailureForUi("TZDB_UNKNOWN_ZONE"))
      .toBe("TZDB_UNKNOWN_ZONE");
  });
});
