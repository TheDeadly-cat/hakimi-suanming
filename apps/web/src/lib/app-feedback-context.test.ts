import { describe, expect, it } from "vitest";
import { createAppFeedbackContext, feedbackPageName } from "./app-feedback-context";

describe("local feedback context privacy", () => {
  const chartPath = "/cases/11111111-1111-4111-8111-111111111111/revisions/22222222-2222-4222-8222-222222222222";

  it("keeps a recognizable chart view without identifiers, timestamps or personal query text", () => {
    const text = createAppFeedbackContext(chartPath, "?view=research&at=1992-03-09T17:18:00Z&alias=PrivateName&query=PersonalNote");
    expect(text).toContain("所在页面：档案 / 研读");
    expect(text).toContain("阅读版本：");
    expect(text).toContain("应用版本：");
    expect(text).toContain("构建标识：");
    for (const privateValue of ["11111111", "22222222", "1992-03-09", "17:18", "PrivateName", "PersonalNote", "?view="]) {
      expect(text).not.toContain(privateValue);
    }
  });

  it("omits saved-report query ids and rejects unknown or malformed paths instead of copying them", () => {
    expect(feedbackPageName("/reports", "?report=private-record&name=PrivateName")).toBe("档案 / 已保存报告");
    for (const pathname of ["/private/1992-03-09/PrivateName", "/cases/private/revisions/private", "/settings/private-name"]) {
      const text = createAppFeedbackContext(pathname, "?name=PrivateName");
      expect(text).toContain("所在页面：未识别页面");
      expect(text).not.toContain("PrivateName");
      expect(text).not.toContain(pathname);
    }
  });

  it("reports an unknown-time candidate page without exporting its candidate id", () => {
    const text = createAppFeedbackContext("/candidate-sets/11111111-1111-4111-8111-111111111111", "");
    expect(text).toContain("档案 / 未知时辰候选");
    expect(text).not.toContain("11111111");
  });
});
