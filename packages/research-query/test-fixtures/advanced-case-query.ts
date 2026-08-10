import type { ResearchCaseQuery } from "@hakimi/contracts";

export const ADVANCED_QUERY_CASE_A_ID = "11111111-1111-4111-8111-111111111111";
export const ADVANCED_QUERY_CASE_B_ID = "22222222-2222-4222-8222-222222222222";

/**
 * Hand-authored acceptance snapshot. None of these conditions are derived from
 * executeResearchQuery during the test run.
 */
export const ADVANCED_CASE_QUERY: ResearchCaseQuery = {
  version: 1,
  scope: "cases",
  text: "",
  lifecycle: "active",
  favorites: "any",
  revisionScope: "latest",
  caseTags: [],
  dayMasters: [],
  monthBranches: ["申"],
  relationTypes: ["branch_three_harmony"],
  ruleProfileDigests: ["de6ff2661989f6557435c02ad84a5d3f33414d845663601f783a130cc9fdb727"],
  transit: {
    atInstant: "2025-03-12T04:00:00.000Z",
    manualDirection: null,
    matches: [{ nodeType: "year", ganZhi: "乙巳", stemTenGod: "伤官" }]
  },
  events: {
    text: "",
    tags: ["事业"],
    feedbacks: ["supports"],
    lifecycle: "active",
    binding: "transit_node"
  },
  sort: { field: "updatedAt", direction: "desc" }
};

export const ADVANCED_CASE_QUERY_DIGEST = "658ac47eaeead0d2b6937300205c53eaa9444108c7c2097f0f6cab0747aa70b8";
export const ADVANCED_CASE_DATA_EPOCH = "a131688f095bcb5fc202871e45a74c96971e0469e7e224ecdc5c1728b66b88f8";
export const ADVANCED_CASE_RESULT_DIGEST = "405a9498b9fe3c662e7f1cbd45f5856630cf94d316b888a33afd491dba0063c0";

type AdvancedQueryTruthRow = {
  label: string;
  query: ResearchCaseQuery;
  expectedMatchedCaseIds: string[];
  expectedUnmatchedCaseIds: string[];
};

export const ADVANCED_CASE_QUERY_TRUTH_TABLE: AdvancedQueryTruthRow[] = [
  {
    label: "all fixed advanced predicates match",
    query: ADVANCED_CASE_QUERY,
    expectedMatchedCaseIds: [ADVANCED_QUERY_CASE_A_ID],
    expectedUnmatchedCaseIds: [ADVANCED_QUERY_CASE_B_ID]
  },
  {
    label: "month branch mismatch",
    query: { ...ADVANCED_CASE_QUERY, monthBranches: ["子"] },
    expectedMatchedCaseIds: [],
    expectedUnmatchedCaseIds: [ADVANCED_QUERY_CASE_A_ID, ADVANCED_QUERY_CASE_B_ID]
  },
  {
    label: "deterministic pillar relation mismatch",
    query: { ...ADVANCED_CASE_QUERY, relationTypes: ["stem_clash"] },
    expectedMatchedCaseIds: [],
    expectedUnmatchedCaseIds: [ADVANCED_QUERY_CASE_A_ID, ADVANCED_QUERY_CASE_B_ID]
  },
  {
    label: "rule profile snapshot mismatch",
    query: { ...ADVANCED_CASE_QUERY, ruleProfileDigests: ["0000000000000000000000000000000000000000000000000000000000000000"] },
    expectedMatchedCaseIds: [],
    expectedUnmatchedCaseIds: [ADVANCED_QUERY_CASE_A_ID, ADVANCED_QUERY_CASE_B_ID]
  },
  {
    label: "UTC transit node mismatch",
    query: {
      ...ADVANCED_CASE_QUERY,
      transit: {
        atInstant: "2025-03-12T04:00:00.000Z",
        manualDirection: null,
        matches: [{ nodeType: "year", ganZhi: "甲子", stemTenGod: null }]
      }
    },
    expectedMatchedCaseIds: [],
    expectedUnmatchedCaseIds: [ADVANCED_QUERY_CASE_A_ID, ADVANCED_QUERY_CASE_B_ID]
  },
  {
    label: "same transit-bound event tag mismatch",
    query: {
      ...ADVANCED_CASE_QUERY,
      events: {
        text: "",
        tags: ["情感"],
        feedbacks: ["supports"],
        lifecycle: "active",
        binding: "transit_node"
      }
    },
    expectedMatchedCaseIds: [],
    expectedUnmatchedCaseIds: [ADVANCED_QUERY_CASE_A_ID, ADVANCED_QUERY_CASE_B_ID]
  }
];
