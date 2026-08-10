import { afterEach, describe, expect, it } from "vitest";
import { RESEARCH_QUERY_VERSION, type ResearchQuery } from "@hakimi/contracts";
import {
  clearResearchQueryDrafts,
  readResearchQueryDraft,
  writeResearchQueryDraft,
} from "./research-query-session";

const draftId = "55555555-5555-4555-8555-555555555555";
const query: ResearchQuery = {
  version: RESEARCH_QUERY_VERSION,
  scope: "cases",
  text: "事业 调整",
  lifecycle: "active",
  favorites: "any",
  revisionScope: "latest",
  caseTags: [],
  dayMasters: [],
  monthBranches: [],
  relationTypes: [],
  ruleProfileDigests: [],
  transit: null,
  events: null,
  sort: { field: "updatedAt", direction: "desc" },
};

afterEach(() => window.sessionStorage.clear());

describe("research query session draft", () => {
  it("在当前标签页严格往返版本化 ResearchQuery", () => {
    writeResearchQueryDraft(draftId, query);
    expect(readResearchQueryDraft(draftId)).toEqual({
      draft: { contract: "hakimi-research-query-draft@1", query, sourceViewId: null },
      issue: null,
    });
  });

  it("缺失、损坏或未知字段时不回退默认查询", () => {
    expect(readResearchQueryDraft(draftId)).toMatchObject({ draft: null, issue: expect.stringContaining("未执行任何回退") });
    window.sessionStorage.setItem(`hakimi:research-query-draft:v1:${draftId}`, JSON.stringify({
      contract: "hakimi-research-query-draft@1",
      query,
      sourceViewId: null,
      unknown: true,
    }));
    expect(readResearchQueryDraft(draftId)).toMatchObject({ draft: null, issue: expect.stringContaining("损坏") });
  });

  it("完整清理只删除本应用前缀的草稿并保留无关 sessionStorage", () => {
    writeResearchQueryDraft(draftId, query);
    window.sessionStorage.setItem("hakimi:research-query-draft:v1:corrupt", "not-json");
    window.sessionStorage.setItem("hakimi:other-feature", "keep-me");
    window.sessionStorage.setItem("host-page", "keep-me-too");

    expect(clearResearchQueryDrafts()).toEqual({
      matchedDraftCount: 2,
      removedDraftCount: 2,
      failedDraftCount: 0,
    });
    expect(window.sessionStorage.getItem(`hakimi:research-query-draft:v1:${draftId}`)).toBeNull();
    expect(window.sessionStorage.getItem("hakimi:research-query-draft:v1:corrupt")).toBeNull();
    expect(window.sessionStorage.getItem("hakimi:other-feature")).toBe("keep-me");
    expect(window.sessionStorage.getItem("host-page")).toBe("keep-me-too");
  });

  it("单个草稿删除失败时报告精确部分完成计数", () => {
    const keys = [
      `hakimi:research-query-draft:v1:${draftId}`,
      "hakimi:research-query-draft:v1:blocked",
      "unrelated",
    ];
    const storage = {
      length: keys.length,
      key: (index: number) => keys[index] ?? null,
      removeItem: (key: string) => {
        if (key.endsWith(":blocked")) throw new Error("synthetic removal failure");
      },
    };

    expect(clearResearchQueryDrafts(storage)).toEqual({
      matchedDraftCount: 2,
      removedDraftCount: 1,
      failedDraftCount: 1,
    });
  });
});
