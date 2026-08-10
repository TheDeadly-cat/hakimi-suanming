import { describe, expect, it } from "vitest";
import {
  WORKING_DEFAULT_RULE_PROFILE,
  WORKING_DEFAULT_SUPPORT_METADATA,
  withDayBoundary,
  withDayBoundaryFromProfile,
  withTimeRules
} from "./index";

describe("工作默认规则配置的支持与验证语义", () => {
  it("把声明支持范围与验证证据分开记录", () => {
    expect(WORKING_DEFAULT_SUPPORT_METADATA.declaredSupportRange).toEqual({
      from: "1900-01-01",
      to: "2100-12-31",
      outsideRangePolicy: "experimental_with_warning"
    });
    expect(WORKING_DEFAULT_SUPPORT_METADATA.verificationEvidence).toEqual({
      status: "not_established",
      evidenceRefs: [],
      requiredGoldCaseCount: 360,
      releaseGatePassed: false
    });
    expect(Object.keys(WORKING_DEFAULT_SUPPORT_METADATA.declaredSupportRange)).not.toContain("stronglyVerifiedFrom");
    expect(WORKING_DEFAULT_RULE_PROFILE.notice).toContain("仅为声明支持范围");
    expect(WORKING_DEFAULT_RULE_PROFILE.notice).toContain("不代表已强验证");
  });

  it("通过兼容桥保留当前规则契约与派生配置调用", () => {
    expect(WORKING_DEFAULT_RULE_PROFILE.supportedRange).toEqual({
      stronglyVerifiedFrom: WORKING_DEFAULT_SUPPORT_METADATA.declaredSupportRange.from,
      stronglyVerifiedTo: WORKING_DEFAULT_SUPPORT_METADATA.declaredSupportRange.to,
      outsideRangePolicy: WORKING_DEFAULT_SUPPORT_METADATA.declaredSupportRange.outsideRangePolicy
    });
    expect(withDayBoundary("midnight").supportedRange).toEqual(WORKING_DEFAULT_RULE_PROFILE.supportedRange);
    expect(withDayBoundary("midnight").calendar.ziHourDayStemBasis).toBe("civil_day");
  });

  it("把显式 DST 选择写入不可变规则快照", () => {
    const profile = withTimeRules({ dayBoundary: "midnight", dstAmbiguity: "later" });
    expect(profile.calendar.dayBoundary).toBe("midnight");
    expect(profile.calendar.dstAmbiguity).toBe("later");
    expect(profile.profileId).toContain("dst-later");
  });

  it("从历史规则派生换日对照时只改变必要字段", () => {
    const source = withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "later" });
    const alternate = withDayBoundaryFromProfile(source, "midnight");

    expect(alternate.status).toBe("experimental");
    expect(alternate.calendar.dayBoundary).toBe("midnight");
    expect(alternate.calendar.ziHourDayStemBasis).toBe("civil_day");
    expect(alternate.calendar.dstAmbiguity).toBe("later");
    expect(alternate.layers).toEqual(source.layers);
    expect(alternate.luckCycle).toEqual(source.luckCycle);
    expect(alternate.supportedRange).toEqual(source.supportedRange);
    expect(alternate.sourceRefs).toEqual(source.sourceRefs);
    expect(source.calendar.dayBoundary).toBe("zi_start_23");
  });
});
