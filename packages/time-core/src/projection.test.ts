import { describe, expect, it } from "vitest";
import { TimeNormalizationError, projectInstantToCivilTime } from "./index";

function expectCode(action: () => unknown, code: TimeNormalizationError["code"]): void {
  try {
    action();
    throw new Error("expected projection to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(TimeNormalizationError);
    expect((error as TimeNormalizationError).code).toBe(code);
  }
}

describe("projectInstantToCivilTime", () => {
  it("projects the same instant into explicit IANA frames including non-hour offsets", () => {
    expect(projectInstantToCivilTime("2024-02-04T08:27:07Z", "Asia/Shanghai")).toEqual({
      instant: "2024-02-04T08:27:07Z",
      timeZone: "Asia/Shanghai",
      wallDateTime: "2024-02-04T16:27:07",
      utcOffset: "+08:00",
      zonedDateTime: "2024-02-04T16:27:07+08:00[Asia/Shanghai]"
    });
    expect(projectInstantToCivilTime("2024-01-15T06:15:00Z", "Asia/Kathmandu")).toMatchObject({
      wallDateTime: "2024-01-15T12:00:00",
      utcOffset: "+05:45"
    });
  });

  it("maps both sides of a DST overlap to the same wall clock with distinct offsets", () => {
    const earlier = projectInstantToCivilTime("2024-11-03T05:30:00Z", "America/New_York");
    const later = projectInstantToCivilTime("2024-11-03T06:30:00Z", "America/New_York");
    expect(earlier).toMatchObject({ wallDateTime: "2024-11-03T01:30:00", utcOffset: "-04:00" });
    expect(later).toMatchObject({ wallDateTime: "2024-11-03T01:30:00", utcOffset: "-05:00" });
    expect(earlier.instant).not.toBe(later.instant);
  });

  it("normalizes an equivalent explicit offset without changing the represented instant", () => {
    const projected = projectInstantToCivilTime("2024-02-04T16:27:07+08:00", "UTC");
    expect(projected).toMatchObject({
      instant: "2024-02-04T08:27:07Z",
      wallDateTime: "2024-02-04T08:27:07",
      utcOffset: "+00:00"
    });
  });

  it("preserves fractional-second precision instead of silently snapping a boundary to a whole second", () => {
    const projected = projectInstantToCivilTime("2024-02-04T08:27:07.123456789Z", "Asia/Shanghai");
    expect(projected.instant).toBe("2024-02-04T08:27:07.123456789Z");
    expect(projected.wallDateTime).toBe("2024-02-04T16:27:07.123456789");
    expect(projected.zonedDateTime).toBe("2024-02-04T16:27:07.123456789+08:00[Asia/Shanghai]");
  });

  it("distinguishes invalid offset-free instants from invalid IANA time zones", () => {
    expectCode(() => projectInstantToCivilTime("2024-02-04T08:27:07", "Asia/Shanghai"), "INVALID_INSTANT");
    expectCode(() => projectInstantToCivilTime("2024-02-04T08:27:07Z", "China/Nowhere"), "INVALID_TIME_ZONE");
  });
});
