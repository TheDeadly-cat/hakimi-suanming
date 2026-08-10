import { describe, expect, it } from "vitest";
import { eventRecordSchema, type EventRecord } from "@hakimi/contracts";
import { buildEventResearchQuery } from "./event-research-query";

const CASE_ID = "10000000-0000-4000-8000-000000000001";
const REVISION_ID = "10000000-0000-4000-8000-000000000002";
const HASH = "a".repeat(64);

function eventFixture(patch: Partial<EventRecord> = {}): EventRecord {
  return eventRecordSchema.parse({
    schemaVersion: "1.0.0",
    recordVersion: 2,
    id: "10000000-0000-4000-8000-000000000003",
    caseId: CASE_ID,
    revisionId: REVISION_ID,
    transitNodeRef: null,
    datePrecision: "day",
    startDate: "2026-08-03",
    endDate: null,
    title: "ＡＢＣ　事业转折",
    tags: ["案例", "事业"],
    sourceRefs: [],
    feedback: "supports",
    bodyFormat: "markdown",
    body: "",
    timeContext: { kind: "calendar_date" },
    deletedAt: null,
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    ...patch
  });
}

describe("buildEventResearchQuery", () => {
  it("规范化事件文字并按精确 Revision 建立严格查询", () => {
    expect(buildEventResearchQuery(eventFixture())).toEqual({
      version: 1,
      scope: "events",
      text: "abc 事业转折",
      tags: ["事业", "案例"],
      feedbacks: ["supports"],
      lifecycle: "active",
      binding: { kind: "context_revision", caseId: CASE_ID, revisionId: REVISION_ID },
      sort: { field: "updatedAt", direction: "desc" }
    });
  });

  it("保留稳定节点上下文，并把候选组软删除事件锁定到确切 Case", () => {
    const nodeQuery = buildEventResearchQuery(eventFixture({
      transitNodeRef: {
        schemaVersion: "1.0.0",
        namespace: "hakimi-transit-node",
        revisionId: REVISION_ID,
        chartResultHash: HASH,
        ruleProfileDigest: HASH,
        luckCycleRuleDigest: HASH,
        manualDirection: null,
        timelineVersion: "hakimi-transit:1.0.0",
        algorithmId: "test",
        nodeType: "year",
        startInstant: "2026-01-01T00:00:00.000Z",
        nodeId: `1767225600000.${HASH}`
      }
    }));
    expect(nodeQuery.binding).toEqual({
      kind: "context_node",
      caseId: CASE_ID,
      revisionId: REVISION_ID,
      nodeType: "year",
      nodeId: `1767225600000.${HASH}`
    });

    const caseOnlyQuery = buildEventResearchQuery(eventFixture({
      revisionId: null,
      transitNodeRef: null,
      deletedAt: "2026-08-03T01:00:00.000Z",
      updatedAt: "2026-08-03T01:00:00.000Z"
    }));
    expect(caseOnlyQuery.lifecycle).toBe("deleted");
    expect(caseOnlyQuery.binding).toEqual({ kind: "context_case", caseId: CASE_ID });
  });
});
