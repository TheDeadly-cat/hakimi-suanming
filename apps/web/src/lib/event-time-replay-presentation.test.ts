import { describe, expect, it } from "vitest";
import { getEventTimeReplayPresentation } from "./event-time-replay-presentation";

describe("event time replay presentation", () => {
  it.each([
    ["current_exact", "当前工件可复算", null],
    ["retained_exact", "当前应用保留历史工件", null],
    ["legacy_unidentified", "旧版时区工件未识别", "当前应用无法识别原时区工件"],
    ["artifact_unavailable", "当前应用未保留历史工件", "当前应用未保留绑定工件"],
    ["descriptor_mismatch", "时区描述符冲突", "描述符与随包注册表冲突"]
  ] as const)("穷尽呈现 %s 状态", (status, label, boundaryFragment) => {
    const presentation = getEventTimeReplayPresentation(status);

    expect(presentation.label).toBe(label);
    if (boundaryFragment === null) {
      expect(presentation.boundary).toBeNull();
      expect(presentation.tone).toBe("info");
    } else {
      expect(presentation.boundary).toContain(boundaryFragment);
      expect(presentation.boundary).toContain("冻结 UTC 与偏移仅按原记录显示");
      expect(presentation.tone).toBe("warning");
    }
  });
});
