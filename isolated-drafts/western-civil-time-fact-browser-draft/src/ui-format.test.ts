import { describe, expect, it } from "vitest";

import { formatUtcOffsetSeconds } from "./ui-format.ts";

describe("Western civil fact UI formatting", () => {
  it("formats ordinary minute-aligned offsets", () => {
    expect(formatUtcOffsetSeconds(28_800)).toBe("UTC+08:00");
    expect(formatUtcOffsetSeconds(-14_400)).toBe("UTC−04:00");
  });

  it("preserves historical second-level offsets", () => {
    expect(formatUtcOffsetSeconds(29_143)).toBe("UTC+08:05:43");
    expect(formatUtcOffsetSeconds(-15_451)).toBe("UTC−04:17:31");
  });

  it("rejects non-integer and out-of-range offsets", () => {
    expect(() => formatUtcOffsetSeconds(1.5)).toThrow("UTC_OFFSET_SECONDS_INVALID");
    expect(() => formatUtcOffsetSeconds(86_400)).toThrow("UTC_OFFSET_SECONDS_INVALID");
  });
});
