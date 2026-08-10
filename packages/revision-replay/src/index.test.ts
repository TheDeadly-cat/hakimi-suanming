import { describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import {
  buildCalculatedChartHashPayload,
  type BirthInput,
  type CalculatedChart,
  type RevisionRecord
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  RevisionCalculationReceiptError,
  RevisionCalculationSourceResolutionError,
  RevisionDerivedReplayError,
  buildRevisionDerivedReplayProjectionDigestPayload,
  buildRevisionCalculationReceiptDigestPayload,
  buildRevisionCalculationRequestFingerprintPayload,
  calculateRevisionCalculationRequestFingerprint,
  compareRevisionCalculationReceiptAgainstRevision,
  createRevisionCalculationReceipt,
  replayRevisionDerivedProjection,
  resolveRevisionCalculationSource,
  verifyRevisionCalculationReceiptIntegrity,
  verifyRevisionDerivedReplayProjectionAgainstRevision,
  verifyRevisionDerivedReplayProjectionIntegrity,
  verifyStoredRevisionDerivedReplayProjectionIntegrity,
  type RevisionCalculationReceipt,
  type RevisionDerivedReplayProfile
} from "./index";

const birth: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26:00",
  timePrecision: "exact_second",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: {
    label: "上海",
    latitude: 31.2304,
    longitude: 121.4737,
    precision: "coordinates"
  },
  sourceNote: ""
};

function revisionFromChart(chart: CalculatedChart): RevisionRecord {
  return {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    createdAt: "2026-08-03T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    ...(chart.rulePackBinding ? { rulePackBinding: chart.rulePackBinding } : {}),
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
}

async function createRevision(sex: BirthInput["sex"] = "male"): Promise<RevisionRecord> {
  return revisionFromChart(await calculateChart({ ...birth, sex }, WORKING_DEFAULT_RULE_PROFILE));
}

function profileCopy(): RevisionDerivedReplayProfile {
  return structuredClone(CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE);
}

async function resignReceiptEnvelope(receipt: RevisionCalculationReceipt): Promise<void> {
  const { projectionDigest: _projectionDigest, ...projectionWithoutDigest } = receipt.projection;
  (receipt.projection as { projectionDigest: string }).projectionDigest = await sha256Hex(
    buildRevisionDerivedReplayProjectionDigestPayload(projectionWithoutDigest)
  );
  (receipt as { requestFingerprint: string }).requestFingerprint =
    await calculateRevisionCalculationRequestFingerprint(receipt);
  const { receiptDigest: _receiptDigest, ...receiptWithoutDigest } = receipt;
  (receipt as { receiptDigest: string }).receiptDigest = await sha256Hex(
    buildRevisionCalculationReceiptDigestPayload(receiptWithoutDigest)
  );
}

describe("Revision explicit derived replay", () => {
  it("projects relations, luck and a requested Transit snapshot only after an exact natal replay", async () => {
    const revision = await createRevision();
    const sourceBefore = structuredClone(revision);
    const projection = await replayRevisionDerivedProjection(revision, {
      profile: profileCopy(),
      atInstant: "2025-08-18T00:00:00.000Z"
    });

    expect(projection.claim).toBe("explicit_version_projection_not_stored_historical_output_comparison");
    expect(projection.storedHistoricalOutputCompared).toBe(false);
    expect(projection.status).toBe("complete");
    expect(projection.sourceNatalResultHash).toBe(revision.manifest.resultHash);
    expect(projection.relations.status).toBe("projected");
    expect(projection.luckCycle.status).toBe("projected");
    expect(projection.transit.status).toBe("projected");
    if (projection.transit.status === "projected") {
      expect(projection.transit.result.target.instant).toBe("2025-08-18T00:00:00.000Z");
      expect(projection.transit.result.timelineVersion).toBe("hakimi-transit:1.2.0");
    }
    expect(projection.projectionDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.profile.relations.ruleProfile)).toBe(true);
    expect(revision).toEqual(sourceBefore);
    await expect(verifyRevisionDerivedReplayProjectionIntegrity(projection)).resolves.toEqual(projection);
    await expect(verifyRevisionDerivedReplayProjectionAgainstRevision(projection, revision)).resolves.toEqual(projection);
  });

  it("does not infer a Transit target and is deterministic across A/invalid/A calls", async () => {
    const revision = await createRevision();
    const exactRequest = { profile: profileCopy() };
    const first = await replayRevisionDerivedProjection(revision, exactRequest);
    expect(first.transit).toEqual({
      status: "not_requested",
      reason: "未提供目标瞬时点，本次不生成运限时间切片。"
    });

    const invalidProfile = profileCopy();
    (invalidProfile.relations.descriptor.engine as { version: string }).version = "9.9.9";
    const invalid = await replayRevisionDerivedProjection(revision, { profile: invalidProfile });
    expect(invalid.relations).toMatchObject({
      status: "unavailable",
      code: "executor_unavailable"
    });
    expect(invalid.status).toBe("partial");
    expect(invalid.luckCycle.status).toBe("projected");

    const third = await replayRevisionDerivedProjection(revision, exactRequest);
    expect(third.projectionDigest).toBe(first.projectionDigest);
    expect(third.relations).toEqual(first.relations);
  });

  it("fails each unknown downstream descriptor closed without current-version fallback", async () => {
    const revision = await createRevision();

    const unknownLuck = profileCopy();
    (unknownLuck.luckCycle.descriptor as { algorithmId: string }).algorithmId = "unknown";
    const luckProjection = await replayRevisionDerivedProjection(revision, { profile: unknownLuck });
    expect(luckProjection.luckCycle).toMatchObject({
      status: "unavailable",
      code: "executor_unavailable"
    });

    const unknownTransit = profileCopy();
    (unknownTransit.transit.descriptor as { timelineVersion: string }).timelineVersion = "hakimi-transit:1.1.0";
    const transitProjection = await replayRevisionDerivedProjection(revision, {
      profile: unknownTransit,
      atInstant: "2025-08-18T00:00:00.000Z"
    });
    expect(transitProjection.transit).toMatchObject({
      status: "unavailable",
      code: "executor_unavailable"
    });
  });

  it("requires an explicit direction for unspecified sex and rejects an override otherwise", async () => {
    const unspecified = await createRevision("unspecified");
    const missing = await replayRevisionDerivedProjection(unspecified, { profile: profileCopy() });
    expect(missing.luckCycle).toMatchObject({
      status: "unavailable",
      code: "manual_direction_required"
    });

    const explicit = await replayRevisionDerivedProjection(unspecified, {
      profile: profileCopy(),
      manualDirection: "forward"
    });
    expect(explicit.luckCycle.status).toBe("projected");

    const male = await createRevision("male");
    const forbidden = await replayRevisionDerivedProjection(male, {
      profile: profileCopy(),
      manualDirection: "backward"
    });
    expect(forbidden.luckCycle).toMatchObject({
      status: "unavailable",
      code: "manual_direction_not_allowed"
    });
  });

  it("refuses downstream derivation when a re-signed source no longer matches the retained natal executor", async () => {
    const revision = structuredClone(await createRevision());
    revision.facts.pillars.day.stemTenGod = "篡改后重签";
    revision.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload({
      input: revision.input,
      timeCalibration: revision.timeCalibration,
      ruleProfile: revision.ruleProfile,
      luckCycleRuleSnapshot: revision.luckCycleRuleSnapshot,
      facts: revision.facts,
      manifest: revision.manifest
    }));

    await expect(replayRevisionDerivedProjection(revision, { profile: profileCopy() }))
      .rejects.toMatchObject({
        code: "SOURCE_NATAL_REPLAY_MISMATCH"
      } satisfies Partial<RevisionDerivedReplayError>);
  });

  it("rejects unknown request fields and detects a modified embedded result even if the outer digest is retained", async () => {
    const revision = await createRevision();
    await expect(replayRevisionDerivedProjection(revision, {
      profile: profileCopy(),
      futureMeaning: true
    })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    for (const atInstant of ["", "not-an-instant", "2025-08-18T08:00:00.000+08:00", "2025-08-18T00:00:00Z"]) {
      await expect(replayRevisionDerivedProjection(revision, {
        profile: profileCopy(),
        atInstant
      })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    }

    const projection = structuredClone(await replayRevisionDerivedProjection(revision, { profile: profileCopy() }));
    if (projection.relations.status !== "projected") throw new Error("expected projected relations fixture");
    projection.relations.result.facts.splice(0, 1);
    await expect(verifyRevisionDerivedReplayProjectionIntegrity(projection)).rejects.toMatchObject({
      code: "PROJECTION_INTEGRITY_MISMATCH"
    } satisfies Partial<RevisionDerivedReplayError>);

    const forgedExecutor = structuredClone(await replayRevisionDerivedProjection(revision, { profile: profileCopy() }));
    if (forgedExecutor.relations.status !== "projected") throw new Error("expected projected relations fixture");
    (forgedExecutor.relations as { executorId: string }).executorId = "forged-executor";
    const { projectionDigest: _oldDigest, ...forgedWithoutDigest } = forgedExecutor;
    (forgedExecutor as { projectionDigest: string }).projectionDigest = await sha256Hex(
      buildRevisionDerivedReplayProjectionDigestPayload(forgedWithoutDigest)
    );
    await expect(verifyRevisionDerivedReplayProjectionIntegrity(forgedExecutor)).rejects.toMatchObject({
      code: "PROJECTION_INTEGRITY_MISMATCH"
    } satisfies Partial<RevisionDerivedReplayError>);
  });
});

describe("Revision downstream calculation receipts", () => {
  const baselineIdentity = {
    id: "33333333-3333-4333-8333-333333333333",
    createdAt: "2026-08-03T00:00:00.000Z",
    captureKind: "revision_creation_baseline" as const
  };

  it("captures, verifies and truly compares one append-only creation baseline", async () => {
    const revision = await createRevision();
    const revisionBefore = structuredClone(revision);
    const receipt = await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    );

    expect(receipt.recordType).toBe("revision_calculation_receipt");
    expect(receipt.captureKind).toBe("revision_creation_baseline");
    expect(receipt.sourceRevision).toEqual({
      caseId: revision.caseId,
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      snapshotDigest: receipt.projection.sourceRevisionSnapshotDigest,
      natalResultHash: revision.manifest.resultHash
    });
    expect(receipt.projection.transit.status).toBe("not_requested");
    expect(receipt.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.receiptDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.projection.relations)).toBe(true);
    expect(revision).toEqual(revisionBefore);

    await expect(verifyRevisionCalculationReceiptIntegrity(receipt)).resolves.toEqual(receipt);
    const comparison = await compareRevisionCalculationReceiptAgainstRevision(receipt, revision);
    expect(comparison).toMatchObject({
      status: "matched",
      storedHistoricalOutputCompared: true,
      changedComponents: []
    });
    expect(comparison.receipt.projection.storedHistoricalOutputCompared).toBe(false);
    expect(comparison.replayedProjection.projectionDigest).toBe(receipt.projection.projectionDigest);
  });

  it("creates distinct idempotency fingerprints for explicit Transit instants", async () => {
    const revision = await createRevision();
    const first = await createRevisionCalculationReceipt(
      revision,
      {
        profile: profileCopy(),
        atInstant: "2025-08-18T00:00:00.000Z"
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        createdAt: "2026-08-03T02:00:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    );
    const second = await createRevisionCalculationReceipt(
      revision,
      {
        profile: profileCopy(),
        atInstant: "2026-08-18T00:00:00.000Z"
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        createdAt: "2026-08-03T02:01:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    );

    expect(first.projection.transit.status).toBe("projected");
    expect(second.projection.transit.status).toBe("projected");
    expect(first.requestFingerprint).not.toBe(second.requestFingerprint);
    await expect(compareRevisionCalculationReceiptAgainstRevision(first, revision)).resolves.toMatchObject({
      status: "matched",
      changedComponents: []
    });
  });

  it("records unspecified-sex uncertainty without guessing a direction", async () => {
    const revision = await createRevision("unspecified");
    const receipt = await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    );
    expect(receipt.projection.luckCycle).toMatchObject({
      status: "unavailable",
      code: "manual_direction_required"
    });
    expect(receipt.projection.transit.status).toBe("not_requested");
    await expect(compareRevisionCalculationReceiptAgainstRevision(receipt, revision)).resolves.toMatchObject({
      status: "matched"
    });
  });

  it("rejects capture-kind masquerading, unknown identity fields and non-cloneable identity proxies", async () => {
    const revision = await createRevision();
    await expect(createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy(), atInstant: "2025-08-18T00:00:00.000Z" },
      baselineIdentity
    )).rejects.toMatchObject({
      code: "RECEIPT_INTEGRITY_MISMATCH"
    } satisfies Partial<RevisionCalculationReceiptError>);
    await expect(createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      { ...baselineIdentity, futureMeaning: true }
    )).rejects.toMatchObject({
      code: "INVALID_RECEIPT_IDENTITY"
    } satisfies Partial<RevisionCalculationReceiptError>);
    await expect(createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      new Proxy(baselineIdentity, {})
    )).rejects.toMatchObject({
      code: "INVALID_RECEIPT_IDENTITY"
    } satisfies Partial<RevisionCalculationReceiptError>);
  });

  it("separates re-signed stored content from strong executable semantic verification", async () => {
    const revision = await createRevision();
    const forged = structuredClone(await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    ));
    if (forged.projection.relations.status !== "projected") {
      throw new Error("expected projected relations fixture");
    }
    forged.projection.relations.result.facts.splice(0, 1);
    (forged.projection.relations as { resultDigest: string }).resultDigest =
      await sha256Hex(forged.projection.relations.result);
    const { projectionDigest: _projectionDigest, ...projectionWithoutDigest } = forged.projection;
    (forged.projection as { projectionDigest: string }).projectionDigest = await sha256Hex(
      buildRevisionDerivedReplayProjectionDigestPayload(projectionWithoutDigest)
    );
    (forged as { requestFingerprint: string }).requestFingerprint =
      await sha256Hex(buildRevisionCalculationRequestFingerprintPayload(forged));
    const { receiptDigest: _receiptDigest, ...receiptWithoutDigest } = forged;
    (forged as { receiptDigest: string }).receiptDigest = await sha256Hex(
      buildRevisionCalculationReceiptDigestPayload(receiptWithoutDigest)
    );

    await expect(verifyRevisionCalculationReceiptIntegrity(forged)).resolves.toEqual(forged);
    await expect(verifyStoredRevisionDerivedReplayProjectionIntegrity(forged.projection)).resolves.toEqual(forged.projection);
    await expect(verifyRevisionDerivedReplayProjectionIntegrity(forged.projection)).rejects.toMatchObject({
      code: "PROJECTION_INTEGRITY_MISMATCH"
    } satisfies Partial<RevisionDerivedReplayError>);
    await expect(compareRevisionCalculationReceiptAgainstRevision(forged, revision)).resolves.toMatchObject({
      status: "mismatch",
      changedComponents: ["relations"]
    });
  });

  it("keeps an internally intact receipt readable when its exact executor is unavailable", async () => {
    const revision = await createRevision();
    const receipt = structuredClone(await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    ));
    if (receipt.projection.relations.status !== "projected") {
      throw new Error("expected projected relations fixture");
    }
    (receipt.projection.profile.relations.descriptor.engine as { version: string }).version = "9.9.9";
    (receipt.projection.relations.result.manifest.engine as { version: string }).version = "9.9.9";
    (receipt.projection.relations as { resultDigest: string }).resultDigest =
      await sha256Hex(receipt.projection.relations.result);
    const { projectionDigest: _projectionDigest, ...projectionWithoutDigest } = receipt.projection;
    (receipt.projection as { projectionDigest: string }).projectionDigest = await sha256Hex(
      buildRevisionDerivedReplayProjectionDigestPayload(projectionWithoutDigest)
    );
    (receipt as { requestFingerprint: string }).requestFingerprint =
      await sha256Hex(buildRevisionCalculationRequestFingerprintPayload(receipt));
    const { receiptDigest: _receiptDigest, ...receiptWithoutDigest } = receipt;
    (receipt as { receiptDigest: string }).receiptDigest = await sha256Hex(
      buildRevisionCalculationReceiptDigestPayload(receiptWithoutDigest)
    );

    await expect(verifyRevisionCalculationReceiptIntegrity(receipt)).resolves.toEqual(receipt);
    await expect(verifyRevisionDerivedReplayProjectionIntegrity(receipt.projection)).rejects.toMatchObject({
      code: "PROJECTION_INTEGRITY_MISMATCH"
    } satisfies Partial<RevisionDerivedReplayError>);
    await expect(compareRevisionCalculationReceiptAgainstRevision(receipt, revision)).resolves.toMatchObject({
      status: "exact_executor_unavailable",
      changedComponents: ["relations"]
    });
  });

  it("prioritizes a replayable mismatch over another component's unavailable exact executor", async () => {
    const revision = await createRevision();
    const receipt = structuredClone(await createRevisionCalculationReceipt(
      revision,
      {
        profile: profileCopy(),
        atInstant: "2025-08-18T00:00:00.000Z"
      },
      {
        id: "88888888-8888-4888-8888-888888888888",
        createdAt: "2026-08-03T03:30:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    ));
    if (receipt.projection.relations.status !== "projected" ||
      receipt.projection.transit.status !== "projected") {
      throw new Error("expected projected relations and Transit fixtures");
    }

    (receipt.projection.profile.relations.descriptor.engine as { version: string }).version = "9.9.9";
    (receipt.projection.relations.result.manifest.engine as { version: string }).version = "9.9.9";
    (receipt.projection.relations as { resultDigest: string }).resultDigest =
      await sha256Hex(receipt.projection.relations.result);

    receipt.projection.transit.result.warnings.push("可复演组件的重签差异");
    const { resultHash: _resultHash, ...transitWithoutResultHash } = receipt.projection.transit.result;
    (receipt.projection.transit.result as { resultHash: string }).resultHash =
      await sha256Hex(transitWithoutResultHash);
    (receipt.projection.transit as { resultDigest: string }).resultDigest =
      await sha256Hex(receipt.projection.transit.result);
    await resignReceiptEnvelope(receipt);

    await expect(verifyRevisionCalculationReceiptIntegrity(receipt)).resolves.toEqual(receipt);
    await expect(compareRevisionCalculationReceiptAgainstRevision(receipt, revision)).resolves.toMatchObject({
      status: "mismatch",
      changedComponents: ["relations", "transit"],
      componentStatuses: {
        relations: { comparisonStatus: "exact_executor_unavailable" },
        luckCycle: { comparisonStatus: "matched" },
        transit: { comparisonStatus: "mismatch" }
      }
    });
  });

  it("rejects a Transit body whose outer digests were re-signed but internal resultHash was not", async () => {
    const revision = await createRevision();
    const receipt = structuredClone(await createRevisionCalculationReceipt(
      revision,
      {
        profile: profileCopy(),
        atInstant: "2025-08-18T00:00:00.000Z"
      },
      {
        id: "77777777-7777-4777-8777-777777777777",
        createdAt: "2026-08-03T03:00:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    ));
    if (receipt.projection.transit.status !== "projected") {
      throw new Error("expected projected Transit fixture");
    }
    receipt.projection.transit.result.warnings.push("re-signed outer envelope only");
    (receipt.projection.transit as { resultDigest: string }).resultDigest =
      await sha256Hex(receipt.projection.transit.result);
    const { projectionDigest: _projectionDigest, ...projectionWithoutDigest } = receipt.projection;
    (receipt.projection as { projectionDigest: string }).projectionDigest = await sha256Hex(
      buildRevisionDerivedReplayProjectionDigestPayload(projectionWithoutDigest)
    );
    (receipt as { requestFingerprint: string }).requestFingerprint =
      await sha256Hex(buildRevisionCalculationRequestFingerprintPayload(receipt));
    const { receiptDigest: _receiptDigest, ...receiptWithoutDigest } = receipt;
    (receipt as { receiptDigest: string }).receiptDigest = await sha256Hex(
      buildRevisionCalculationReceiptDigestPayload(receiptWithoutDigest)
    );

    await expect(verifyRevisionCalculationReceiptIntegrity(receipt)).rejects.toMatchObject({
      code: "RECEIPT_INTEGRITY_MISMATCH"
    } satisfies Partial<RevisionCalculationReceiptError>);
  });

  it("rejects a baseline whose captured time is not the Revision creation time", async () => {
    const revision = await createRevision();
    const receipt = structuredClone(await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    ));
    (receipt as { createdAt: string }).createdAt = "2026-08-03T00:00:01.000Z";
    const { receiptDigest: _receiptDigest, ...receiptWithoutDigest } = receipt;
    (receipt as { receiptDigest: string }).receiptDigest = await sha256Hex(
      buildRevisionCalculationReceiptDigestPayload(receiptWithoutDigest)
    );

    await expect(verifyRevisionCalculationReceiptIntegrity(receipt)).resolves.toEqual(receipt);
    await expect(compareRevisionCalculationReceiptAgainstRevision(receipt, revision)).rejects.toMatchObject({
      code: "RECEIPT_SOURCE_MISMATCH"
    } satisfies Partial<RevisionCalculationReceiptError>);
  });

  it("rejects a valid receipt paired with a different Revision", async () => {
    const receiptRevision = await createRevision();
    const receipt = await createRevisionCalculationReceipt(
      receiptRevision,
      { profile: profileCopy() },
      baselineIdentity
    );
    const other = {
      ...await createRevision(),
      id: "66666666-6666-4666-8666-666666666666"
    };
    await expect(compareRevisionCalculationReceiptAgainstRevision(receipt, other)).rejects.toMatchObject({
      code: "RECEIPT_SOURCE_MISMATCH"
    } satisfies Partial<RevisionCalculationReceiptError>);
  });
});

describe("Revision downstream calculation source resolution", () => {
  const baselineIdentity = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    createdAt: "2026-08-03T00:00:00.000Z",
    captureKind: "revision_creation_baseline" as const
  };

  it("returns a versioned explicit projection when no exact ledger receipt exists", async () => {
    const revision = await createRevision();
    const resolution = await resolveRevisionCalculationSource(
      revision,
      [],
      {
        profile: profileCopy(),
        atInstant: "2025-08-18T00:00:00.000Z"
      }
    );

    expect(resolution).toMatchObject({
      schemaVersion: "1.0.0",
      source: "explicit_projection",
      captureKind: "explicit_calculation_snapshot",
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable",
      receipt: null,
      replayedProjection: null,
      changedComponents: [],
      componentStatuses: {
        relations: {
          projectionStatus: "projected",
          replayedStatus: null,
          comparisonStatus: "not_applicable"
        },
        luckCycle: {
          projectionStatus: "projected",
          replayedStatus: null,
          comparisonStatus: "not_applicable"
        },
        transit: {
          projectionStatus: "projected",
          replayedStatus: null,
          comparisonStatus: "not_applicable"
        }
      }
    });
    expect(resolution.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(resolution)).toBe(true);
  });

  it("selects the exact profile/request fingerprint instead of the first baseline", async () => {
    const revision = await createRevision();
    const alternateProfile = profileCopy();
    (alternateProfile as { profileId: string }).profileId = `${alternateProfile.profileId}_alternate`;
    const alternate = await createRevisionCalculationReceipt(
      revision,
      { profile: alternateProfile },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        createdAt: revision.createdAt,
        captureKind: "revision_creation_baseline"
      }
    );
    const exact = await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    );

    const resolution = await resolveRevisionCalculationSource(
      revision,
      [alternate, exact],
      { profile: profileCopy() }
    );
    expect(resolution).toMatchObject({
      source: "stored_receipt",
      captureKind: "revision_creation_baseline",
      storedHistoricalOutputCompared: true,
      comparisonStatus: "matched",
      receipt: { id: exact.id },
      projection: { projectionDigest: exact.projection.projectionDigest },
      changedComponents: [],
      componentStatuses: {
        relations: { comparisonStatus: "matched" },
        luckCycle: { comparisonStatus: "matched" },
        transit: { comparisonStatus: "matched" }
      }
    });
    expect(resolution.requestFingerprint).toBe(exact.requestFingerprint);
  });

  it("selects only the exact explicit Transit instant", async () => {
    const revision = await createRevision();
    const otherInstant = await createRevisionCalculationReceipt(
      revision,
      {
        profile: profileCopy(),
        atInstant: "2026-08-18T00:00:00.000Z"
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        createdAt: "2026-08-03T04:00:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    );
    const exact = await createRevisionCalculationReceipt(
      revision,
      {
        profile: profileCopy(),
        atInstant: "2025-08-18T00:00:00.000Z"
      },
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        createdAt: "2026-08-03T04:01:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    );

    const resolution = await resolveRevisionCalculationSource(
      revision,
      [otherInstant, exact],
      {
        profile: profileCopy(),
        atInstant: "2025-08-18T00:00:00.000Z"
      }
    );
    expect(resolution).toMatchObject({
      source: "stored_receipt",
      captureKind: "explicit_calculation_snapshot",
      comparisonStatus: "matched",
      receipt: { id: exact.id },
      projection: {
        request: { atInstant: "2025-08-18T00:00:00.000Z" }
      }
    });
  });

  it("preserves a stored mismatch and never falls back to the fresh explicit projection", async () => {
    const revision = await createRevision();
    const receipt = structuredClone(await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    ));
    if (receipt.projection.relations.status !== "projected") {
      throw new Error("expected projected relations fixture");
    }
    receipt.projection.relations.result.facts.splice(0, 1);
    (receipt.projection.relations as { resultDigest: string }).resultDigest =
      await sha256Hex(receipt.projection.relations.result);
    await resignReceiptEnvelope(receipt);

    const resolution = await resolveRevisionCalculationSource(
      revision,
      [receipt],
      { profile: profileCopy() }
    );
    expect(resolution).toMatchObject({
      source: "stored_receipt",
      comparisonStatus: "mismatch",
      receipt: { id: receipt.id },
      projection: { projectionDigest: receipt.projection.projectionDigest },
      changedComponents: ["relations"],
      componentStatuses: {
        relations: {
          projectionStatus: "projected",
          replayedStatus: "projected",
          comparisonStatus: "mismatch"
        }
      }
    });
    expect(resolution.replayedProjection?.projectionDigest).not.toBe(resolution.projection.projectionDigest);
  });

  it("preserves a stored result when its exact executor is unavailable", async () => {
    const revision = await createRevision();
    const receipt = structuredClone(await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    ));
    if (receipt.projection.relations.status !== "projected") {
      throw new Error("expected projected relations fixture");
    }
    (receipt.projection.profile.relations.descriptor.engine as { version: string }).version = "9.9.9";
    (receipt.projection.relations.result.manifest.engine as { version: string }).version = "9.9.9";
    (receipt.projection.relations as { resultDigest: string }).resultDigest =
      await sha256Hex(receipt.projection.relations.result);
    await resignReceiptEnvelope(receipt);

    const resolution = await resolveRevisionCalculationSource(
      revision,
      [receipt],
      { profile: structuredClone(receipt.projection.profile) }
    );
    expect(resolution).toMatchObject({
      source: "stored_receipt",
      comparisonStatus: "exact_executor_unavailable",
      projection: {
        relations: { status: "projected" }
      },
      replayedProjection: {
        relations: { status: "unavailable", code: "executor_unavailable" }
      },
      componentStatuses: {
        relations: {
          projectionStatus: "projected",
          replayedStatus: "unavailable",
          comparisonStatus: "exact_executor_unavailable"
        }
      }
    });
  });

  it("fails closed for duplicate IDs, duplicate fingerprints and multiple exact receipts", async () => {
    const revision = await createRevision();
    const first = await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      baselineIdentity
    );
    const second = await createRevisionCalculationReceipt(
      revision,
      { profile: profileCopy() },
      {
        ...baselineIdentity,
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
      }
    );

    await expect(resolveRevisionCalculationSource(
      revision,
      [first, first],
      { profile: profileCopy() }
    )).rejects.toMatchObject({
      code: "DUPLICATE_RECEIPT_ID"
    } satisfies Partial<RevisionCalculationSourceResolutionError>);

    await expect(resolveRevisionCalculationSource(
      revision,
      [first, second],
      { profile: profileCopy() }
    )).rejects.toMatchObject({
      code: "MULTIPLE_EXACT_RECEIPTS"
    } satisfies Partial<RevisionCalculationSourceResolutionError>);

    const alternateProfile = profileCopy();
    (alternateProfile as { profileId: string }).profileId = `${alternateProfile.profileId}_absent`;
    await expect(resolveRevisionCalculationSource(
      revision,
      [first, second],
      { profile: alternateProfile }
    )).rejects.toMatchObject({
      code: "DUPLICATE_REQUEST_FINGERPRINT"
    } satisfies Partial<RevisionCalculationSourceResolutionError>);
  });

  it("rejects a non-array receipt collection before making any provenance claim", async () => {
    const revision = await createRevision();
    await expect(resolveRevisionCalculationSource(
      revision,
      { receipt: null },
      { profile: profileCopy() }
    )).rejects.toMatchObject({
      code: "INVALID_RECEIPT_COLLECTION"
    } satisfies Partial<RevisionCalculationSourceResolutionError>);
  });
});
