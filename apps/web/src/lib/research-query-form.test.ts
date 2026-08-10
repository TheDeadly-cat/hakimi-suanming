import { describe, expect, it } from "vitest";
import { researchQuerySchema, type ResearchEventQuery } from "@hakimi/contracts";
import { researchQueryFromFormState, researchQueryToFormState } from "./research-query-form";

describe("research query form adapter", () => {
  it("round-trips an exact Case event binding without inventing a Revision", () => {
    const query = researchQuerySchema.parse({
      version: 1,
      scope: "events",
      text: "事业复核",
      tags: ["事业"],
      feedbacks: ["supports"],
      lifecycle: "active",
      binding: {
        kind: "context_case",
        caseId: "10000000-0000-4000-8000-000000000001"
      },
      sort: { field: "updatedAt", direction: "desc" }
    }) as ResearchEventQuery;

    const form = researchQueryToFormState(query);
    expect(form.eventBindingKind).toBe("context_case");
    expect(form.contextCaseId).toBe(query.binding.kind === "context_case" ? query.binding.caseId : "");
    expect(form.contextRevisionId).toBe("");
    expect(researchQueryFromFormState(form)).toEqual({ query, issue: null });
  });
});
