import { describe, expect, it } from "vitest";
import { buildResearchQuerySearch, parseResearchQueryRoute } from "./research-query-route";

const draftId = "11111111-1111-4111-8111-111111111111";
const viewId = "22222222-2222-4222-8222-222222222222";
const caseId = "33333333-3333-4333-8333-333333333333";

describe("research query route codec", () => {
  it("只生成默认、session draft 或持久视图引用，不把自由文本写入 URL", () => {
    expect(buildResearchQuerySearch({ source: "default", referenceId: null, resultKey: null })).toBe("");
    const draftSearch = buildResearchQuerySearch({
      source: "draft",
      referenceId: draftId,
      resultKey: `case:${caseId}`,
    });
    expect(draftSearch).toBe(`?draft=${draftId}&result=case%3A${caseId}`);
    expect(draftSearch).not.toContain("事业");
    expect(parseResearchQueryRoute(draftSearch)).toEqual({
      state: { source: "draft", referenceId: draftId, resultKey: `case:${caseId}` },
      issue: null,
    });
    expect(parseResearchQueryRoute(`?view=${viewId}`)).toEqual({
      state: { source: "view", referenceId: viewId, resultKey: null },
      issue: null,
    });
  });

  it("对互斥、重复、未知或损坏引用失败关闭", () => {
    for (const search of [
      `?draft=${draftId}&view=${viewId}`,
      `?draft=${draftId}&draft=${viewId}`,
      "?draft=not-a-uuid",
      "?view=not-a-uuid",
      "?q=不能进入地址栏",
      "?result=case:not-a-uuid",
    ]) {
      const parsed = parseResearchQueryRoute(search);
      expect(parsed.state, search).toBeNull();
      expect(parsed.issue, search).toMatch(/未执行任何回退|不会定位到近似结果/);
    }
  });
});
