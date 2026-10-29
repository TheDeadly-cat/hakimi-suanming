import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart, calculateTransitPillarsAtInstant } from "@hakimi/bazi-core";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { resolveEventTimeContext } from "@hakimi/time-core";
import type { BirthInput, CaseRecord, EventRecord, RevisionRecord } from "@hakimi/contracts";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  EXPLICIT_DERIVED_REPLAY_PROFILE_V1_2_0,
  compareRevisionCalculationReceiptAgainstRevision,
  replayRevisionDerivedProjection,
  resolveRevisionCalculationSource
} from "@hakimi/revision-replay";
import original from "../../revision-replay/src/fixtures/transit-v1.2-midnight-original.json";
import {
  RESEARCH_QUERY_ENGINE,
  RESEARCH_QUERY_ENGINE_TRANSIT_V1_2,
  buildResearchQueryExport,
  createDefaultResearchQuery,
  executeResearchQuery,
  replayResearchQueryWithTransitV1_2,
  verifyResearchQueryExport,
  type ResearchQuerySnapshot
} from "./index";

const atInstant = "2024-02-04T16:30:00.000Z";
const cases = new Map<string, { revision: RevisionRecord; snapshot: ResearchQuerySnapshot }>();
beforeAll(async () => {
  for (const rule of ["midnight", "zi_start_23"] as const) {
    const chart = await calculateChart(original.revision.input as BirthInput, withDayBoundary(rule));
    const revision: RevisionRecord = { ...chart, schemaVersion: "1.0.0", id: original.revision.id,
      caseId: original.revision.caseId, revisionNumber: 1, createdAt: original.revision.createdAt };
    cases.set(rule, { revision, snapshot: { cases: [original.caseRecord as CaseRecord], revisions: [revision],
      candidateSets: [], researchNotes: [], events: [], knowledgeDocuments: [],
      revisionCalculationReceiptLedgerStatus: "schema_unavailable", revisionCalculationReceipts: [] } });
  }
});

describe("version-bound midnight query and export", () => {
  const boundaryCases = [
    ["2024-02-04T15:00:00.000Z", "壬子", "甲子"],
    ["2024-02-04T15:59:59.999Z", "壬子", "甲子"],
    ["2024-02-04T16:00:00.000Z", "甲子", "甲子"],
    ["2024-02-04T16:30:00.000Z", "甲子", "甲子"],
    ["2024-02-04T16:59:59.999Z", "甲子", "甲子"],
    ["2024-02-04T17:00:00.000Z", "乙丑", "乙丑"]
  ] as const;
  for (const rule of ["midnight", "zi_start_23"] as const) {
    it.each(boundaryCases)(`${rule}: %s accepts the correct hour and rejects the other hour`, async (instant, midnightHour, ziHour) => {
      const { revision, snapshot } = cases.get(rule)!;
      const expectedHour = rule === "midnight" ? midnightHour : ziHour;
      const wrongHour = expectedHour === "壬子" ? "甲子" : "壬子";
      expect(calculateTransitPillarsAtInstant(instant, revision.input.timeZone, revision.ruleProfile).pillars.hour.ganZhi)
        .toBe(expectedHour);
      for (const [ganZhi, expectedCount] of [[expectedHour, 1], [wrongHour, 0]] as const) {
        const query = { ...createDefaultResearchQuery("cases"), transit: { atInstant: instant, manualDirection: null,
          matches: [{ nodeType: "hour" as const, ganZhi, stemTenGod: null }] } };
        const execution = await executeResearchQuery(query, snapshot);
        const exported = await buildResearchQueryExport(execution, { appVersion: "0.2.0-p0", exportedAt: original.queryExport.manifest.exportedAt });
        expect(execution.total).toBe(expectedCount);
        expect(exported.payload.total).toBe(expectedCount);
        expect(exported.manifest.engine.transitTimeline).toBe("hakimi-transit:1.3.0");
        expect(exported.manifest.engine.derivedReplayProfile).toBe(CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId);
        if (expectedCount === 1) {
          const result = execution.results[0];
          if (result.scope !== "cases") throw new Error("expected case result");
          expect(result.transitMatches[0].ganZhi).toBe(expectedHour);
          expect(Date.parse(result.transitMatches[0].startInstant)).toBeLessThanOrEqual(Date.parse(instant));
          expect(Date.parse(result.transitMatches[0].endExclusiveInstant)).toBeGreaterThan(Date.parse(instant));
          expect(result.revisions[0].calculationSource).toMatchObject({ source: "explicit_projection",
            ledgerStatus: "schema_unavailable", profileId: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId,
            storedHistoricalOutputCompared: false, receipt: null });
        }
        await expect(verifyResearchQueryExport(exported)).resolves.toEqual(exported);
      }
    });
  }

  it("replays the original v1.2 receipt byte-for-byte, including its historical wrong midnight hour", async () => {
    const before = canonicalStringify(original);
    const comparison = await compareRevisionCalculationReceiptAgainstRevision(original.receipt, original.revision);
    expect(comparison.status).toBe("matched");
    expect(comparison.replayedProjection).toEqual(original.receipt.projection);
    const old = await resolveRevisionCalculationSource(original.revision, [original.receipt],
      { profile: EXPLICIT_DERIVED_REPLAY_PROFILE_V1_2_0, atInstant });
    expect(old).toMatchObject({ source: "stored_receipt", comparisonStatus: "matched",
      profileId: EXPLICIT_DERIVED_REPLAY_PROFILE_V1_2_0.profileId });
    expect(old.projection.transit).toEqual(original.receipt.projection.transit);
    const current = await resolveRevisionCalculationSource(original.revision, [original.receipt],
      { profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE, atInstant });
    expect(current).toMatchObject({ source: "explicit_projection", storedHistoricalOutputCompared: false,
      receipt: null, profileId: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId });
    if (current.projection.transit.status !== "projected") throw new Error("expected current transit");
    expect(current.projection.transit.result.slots.hour).toMatchObject({ status: "resolved", node: { ganZhi: "甲子" } });
    expect(current.requestFingerprint).not.toBe(original.receipt.requestFingerprint);
    expect(canonicalStringify(original)).toBe(before);
  });

  it("rejects either known profile ID paired with the other executable descriptor", async () => {
    for (const [profile, foreign] of [[EXPLICIT_DERIVED_REPLAY_PROFILE_V1_2_0, CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE],
      [CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE, EXPLICIT_DERIVED_REPLAY_PROFILE_V1_2_0]]) {
      await expect(replayRevisionDerivedProjection(original.revision,
        { profile: { ...profile, transit: foreign.transit }, atInstant })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    }
  });

  it("verifies the original old export and exactly reproduces its result digest without relabelling it", async () => {
    await expect(verifyResearchQueryExport(original.queryExport)).resolves.toEqual(original.queryExport);
    const execution = await replayResearchQueryWithTransitV1_2(original.queryExport.payload.query as never, {
      cases: [original.caseRecord], revisions: [original.revision], candidateSets: [], researchNotes: [], events: [],
      knowledgeDocuments: [], revisionCalculationReceiptLedgerStatus: "available", revisionCalculationReceipts: [original.receipt]
    } as unknown as ResearchQuerySnapshot);
    expect(execution.resultDigest).toBe(original.queryExport.payload.resultDigest);
    expect(execution.engine).toEqual(RESEARCH_QUERY_ENGINE_TRANSIT_V1_2);
    expect(await buildResearchQueryExport(execution, original.queryExport.manifest)).toEqual(original.queryExport);
  });

  it("rejects an old engine with current result profiles even after every digest is recomputed", async () => {
    const { snapshot } = cases.get("midnight")!;
    const execution = await executeResearchQuery({ ...createDefaultResearchQuery("cases"), transit: { atInstant,
      manualDirection: null, matches: [{ nodeType: "hour", ganZhi: "甲子", stemTenGod: null }] } }, snapshot);
    const mixedExecution = { ...execution, engine: RESEARCH_QUERY_ENGINE_TRANSIT_V1_2 };
    mixedExecution.resultDigest = await sha256Hex({ engine: mixedExecution.engine, queryDigest: execution.queryDigest,
      dataEpoch: execution.dataEpoch, results: execution.results, diagnostics: execution.diagnostics });
    await expect(buildResearchQueryExport(mixedExecution, original.queryExport.manifest)).rejects.toThrow();
    const mixed = await buildResearchQueryExport(execution, original.queryExport.manifest);
    mixed.manifest.engine = RESEARCH_QUERY_ENGINE_TRANSIT_V1_2;
    mixed.payload.resultDigest = mixedExecution.resultDigest;
    mixed.digests.payload = await sha256Hex(mixed.payload);
    const { envelope: _envelope, ...digests } = mixed.digests;
    mixed.digests.envelope = await sha256Hex({ manifest: mixed.manifest, digests, payload: mixed.payload });
    await expect(verifyResearchQueryExport(mixed)).rejects.toMatchObject({ code: "INVALID_EXPORT" });
    const hybrid = structuredClone(original.queryExport);
    hybrid.manifest.engine.transitTimeline = RESEARCH_QUERY_ENGINE.transitTimeline;
    await expect(verifyResearchQueryExport(hybrid)).rejects.toMatchObject({ code: "INVALID_EXPORT" });
  });

  it("reads a retained event reference unchanged but never aliases it to the corrected v1.3 node", async () => {
    const oldHour = original.receipt.projection.transit.result.slots.hour.node;
    const event: EventRecord = { schemaVersion: "1.0.0", recordVersion: 2,
      id: "44444444-4444-4444-8444-444444444444", caseId: original.revision.caseId, revisionId: original.revision.id,
      transitNodeRef: oldHour.ref as EventRecord["transitNodeRef"], datePrecision: "day", startDate: "2024-02-05", endDate: null,
      title: "Synthetic retained hour reference", tags: [], sourceRefs: [], feedback: "unreviewed", bodyFormat: "markdown",
      body: "", deletedAt: null, createdAt: original.revision.createdAt, updatedAt: original.revision.createdAt,
      timeContext: resolveEventTimeContext({ datePrecision: "day", startDate: "2024-02-05", endDate: null }) };
    const snapshot: ResearchQuerySnapshot = { ...cases.get("midnight")!.snapshot,
      revisions: [original.revision as unknown as RevisionRecord], events: [event] };
    const before = canonicalStringify(event);
    expect((await executeResearchQuery(createDefaultResearchQuery("events"), snapshot)).total).toBe(1);
    const query = { ...createDefaultResearchQuery("cases"), transit: { atInstant, manualDirection: null,
      matches: [{ nodeType: "hour" as const, ganZhi: "甲子", stemTenGod: null }] },
      events: { text: "", tags: [], feedbacks: [], lifecycle: "active" as const, binding: "transit_node" as const } };
    expect((await executeResearchQuery(query, snapshot)).total).toBe(0);
    expect(canonicalStringify(event)).toBe(before);
  });
});
