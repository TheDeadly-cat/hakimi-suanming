import { describe, expect, it } from "vitest";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";

describe("exact interval age scope for reading prose", () => {
  it("splits an actual decade across eighteen without changing its interval", () => {
    const age = buildLocalReadingAgeContext("1995-08-18T00:26:00Z", "2008-12-20T20:58:00.000Z", "2018-12-20T20:58:00.000Z");
    expect(age.stage).toBe("adult_transition"); expect(age.label).toBe("13—23周岁");
    expect(age.segments.map((segment) => segment.stage)).toEqual(["youth", "adult"]);
    expect(age.segments[0]!.endExclusiveInstant).toBe("2013-08-18T00:26:00.000Z");
    expect(age.segments[1]!.startInstant).toBe(age.segments[0]!.endExclusiveInstant);
    expect(age.segments[1]!.endExclusiveInstant).toBe("2018-12-20T20:58:00.000Z");
  });
  it("respects the exclusive endpoint of the eighteenth anniversary and the leap-day convention", () => {
    expect(buildLocalReadingAgeContext("2000-02-29T12:00:00Z", "2018-02-01T00:00:00Z", "2018-03-01T12:00:00Z").stage).toBe("youth");
    expect(buildLocalReadingAgeContext("2000-02-29T12:00:00Z", "2018-03-01T12:00:00Z", "2018-04-01T00:00:00Z").stage).toBe("adult");
  });
  it("clips the birth month to real birth, rejects wholly pre-birth personal scope, and never defaults unknown age to a child", () => {
    const birth = "1995-08-18T00:26:00Z";
    const partial = buildLocalReadingAgeContext(birth, "1995-08-08T00:00:00Z", "1995-09-08T00:00:00Z");
    expect(partial.stage).toBe("young_child"); expect(partial.personalStartInstant).toBe("1995-08-18T00:26:00.000Z");
    expect(partial.segments[0]!.startAge).toBe(0);
    expect(buildLocalReadingAgeContext(birth, "1995-07-01T00:00:00Z", birth).stage).toBe("before_birth");
    expect(buildLocalReadingAgeContext(null, "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z")).toMatchObject({ stage: "unknown", startAge: null, endAge: null, segments: [] });
    expect(() => buildLocalReadingAgeContext(birth, "bad", "2027-01-01T00:00:00Z")).toThrow("区间");
  });
});
