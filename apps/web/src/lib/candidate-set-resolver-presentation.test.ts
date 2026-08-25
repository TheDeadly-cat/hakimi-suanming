import { describe, expect, it } from "vitest";
import { getCandidateSetResolverPresentation } from "./candidate-set-resolver-presentation";

describe("candidate-set resolver presentation", () => {
  it.each([
    ["current_exact", "当前 resolver 工件可核对", true],
    ["retained_exact", "保留历史 resolver 工件可核对", true],
    ["legacy_unidentified", "降级读取 · 旧 tzdb 未识别", false],
    ["artifact_unavailable", "降级读取 · 原工件未保留", false],
    ["descriptor_mismatch", "时区工件描述符冲突", false]
  ] as const)("穷尽呈现 %s 状态", (status, label, exactResolverAvailable) => {
    const presentation = getCandidateSetResolverPresentation(status);

    expect(presentation.label).toBe(label);
    expect(presentation.exactResolverAvailable).toBe(exactResolverAvailable);
    expect(presentation.explanation).toMatch(
      exactResolverAvailable ? /尚未重跑/u : /不能|无法/u
    );
    expect(presentation.tone).toBe(exactResolverAvailable ? "info" : "warning");
  });
});
