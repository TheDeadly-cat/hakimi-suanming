import { sha256Hex } from "@hakimi/integrity";
import { describe, expect, it } from "vitest";
import {
  CALENDAR_CONVERSION_FIXTURE,
  CALENDAR_REVIEW_ATTESTATION_STATEMENT,
  calendarDecisionPayloadSchema,
  createCalendarConversionDecisionEnvelope,
  createCalendarConversionReviewBundle,
  digestCalendarConversionCandidate,
  digestCalendarConversionDataset,
  digestCalendarConversionFixture,
  digestCalendarCrossCheckRun,
  preflightCalendarConversionDecision,
  preflightCalendarConversionReviewBundle,
  serializeCalendarConversionDecisionEnvelope,
  serializeCalendarConversionReviewBundle,
  type CalendarConversionCandidate,
  type CalendarConversionExpectedPair,
  type CalendarConversionSource,
  type CalendarDecisionPayload,
  type CalendarReviewBundleEnvelope
} from "./lunar-conversion";

const BUNDLE_GENERATED_AT = "2026-08-01T01:00:00.000Z";
const PREFLIGHT_NOW = "2026-08-01T06:00:00.000Z";
const PREFLIGHT_CLOCK = { now: PREFLIGHT_NOW, allowedClockSkewMs: 0 } as const;

function expectedPair(candidate: CalendarConversionCandidate): CalendarConversionExpectedPair {
  return {
    lunarDate: candidate.lunarDate,
    lunarLeapMonth: candidate.lunarLeapMonth,
    gregorianDate: candidate.expectedGregorianDate
  };
}

function fixtureSource(sourceId: string): CalendarConversionSource & { artifactSha256: string } {
  const source = CALENDAR_CONVERSION_FIXTURE.sources.find((item) => item.sourceId === sourceId);
  if (!source || source.artifactSha256 === null) {
    throw new Error(`测试来源 ${sourceId} 缺失冻结材料摘要`);
  }
  return source as CalendarConversionSource & { artifactSha256: string };
}

function fixtureCandidate(caseId: string): CalendarConversionCandidate {
  const candidate = CALENDAR_CONVERSION_FIXTURE.cases.find((item) => item.id === caseId);
  if (!candidate) throw new Error(`测试候选 ${caseId} 缺失`);
  return candidate;
}

function crossCheckRun() {
  const run = CALENDAR_CONVERSION_FIXTURE.independentCrossCheckRuns[0];
  if (!run) throw new Error("测试差分运行缺失");
  return run;
}

function authoritativeSourceEvidence(
  candidate: CalendarConversionCandidate,
  sourceId?: string
): CalendarDecisionPayload["sourceEvidence"][number] {
  const observation = candidate.evidence.observations.find((item) =>
    item.role === "authoritative" && (sourceId === undefined || item.sourceId === sourceId)
  );
  if (!observation) throw new Error(`测试候选 ${candidate.id} 缺失指定权威观察`);
  const source = fixtureSource(observation.sourceId);
  return {
    sourceId: source.sourceId,
    lineageId: source.lineageId,
    role: "authoritative",
    sourceType: source.sourceType,
    title: source.title,
    publisher: source.publisher,
    editionOrVersion: source.editionOrVersion,
    locator: observation.locator,
    sourceRef: source.sourceRef,
    accessedAt: source.accessedAt,
    artifactSha256: source.artifactSha256,
    observedPair: {
      lunarDate: observation.observedLunarDate,
      lunarLeapMonth: observation.observedLunarLeapMonth,
      gregorianDate: observation.observedGregorianDate
    },
    runId: null,
    runDigest: null,
    outcome: null,
    note: "冻结的香港天文台逐日历表定位。"
  };
}

async function decisionContext(caseId = crossCheckRun().matchedCaseIds[0]!) {
  const bundle = await createCalendarConversionReviewBundle({ generatedAt: BUNDLE_GENERATED_AT });
  const candidate = fixtureCandidate(caseId);
  const pair = expectedPair(candidate);
  const run = crossCheckRun();
  const software = fixtureSource(run.sourceId);
  const outcome = run.matchedCaseIds.includes(caseId)
    ? "matched"
    : run.unsupportedCaseIds.includes(caseId)
      ? "unsupported"
      : "mismatch";

  const payload: CalendarDecisionPayload = {
    recordVersion: "1.0.0",
    datasetId: CALENDAR_CONVERSION_FIXTURE.datasetId,
    datasetFixtureVersion: CALENDAR_CONVERSION_FIXTURE.fixtureVersion,
    fixtureDigest: bundle.payload.dataset.fixtureDigest,
    datasetDigest: bundle.payload.dataset.datasetDigest,
    reviewBundleDigest: bundle.digest,
    frame: CALENDAR_CONVERSION_FIXTURE.frame,
    caseId,
    candidateDigest: await digestCalendarConversionCandidate(candidate),
    decision: "accept_expected",
    expected: pair,
    sourceEvidence: [
      authoritativeSourceEvidence(candidate),
      {
        sourceId: software.sourceId,
        lineageId: software.lineageId,
        role: "crosscheck",
        sourceType: software.sourceType,
        title: software.title,
        publisher: software.publisher,
        editionOrVersion: software.editionOrVersion,
        locator: `${run.runId}:${caseId}`,
        sourceRef: software.sourceRef,
        accessedAt: software.accessedAt,
        artifactSha256: software.artifactSha256,
        observedPair: pair,
        runId: run.runId,
        runDigest: await digestCalendarCrossCheckRun(run),
        outcome,
        note: "冻结的 .NET Framework 4.8 独立差分结果。"
      }
    ],
    attestations: [
      {
        role: "primary",
        reviewerId: "calendar-reviewer-a",
        displayName: "农历复核人 A",
        reviewedAt: "2026-08-01T02:00:00.000Z",
        statement: CALENDAR_REVIEW_ATTESTATION_STATEMENT
      },
      {
        role: "second",
        reviewerId: "calendar-reviewer-b",
        displayName: "农历复核人 B",
        reviewedAt: "2026-08-01T03:00:00.000Z",
        statement: CALENDAR_REVIEW_ATTESTATION_STATEMENT
      }
    ],
    decidedAt: "2026-08-01T04:00:00.000Z",
    createdAt: "2026-08-01T05:00:00.000Z",
    rationale: "两位复核人独立核对权威历表定位、材料摘要和冻结差分运行。",
    supersedesDecisionDigest: null
  };

  return { bundle, candidate, payload, run };
}

async function resignBundle(envelope: CalendarReviewBundleEnvelope): Promise<void> {
  envelope.digest = await sha256Hex(envelope.payload);
}

describe("农历候选审核包", () => {
  it("固定 generatedAt 时生成可重复、内容寻址且可预检的 24 条审核包", async () => {
    const first = await createCalendarConversionReviewBundle({ generatedAt: BUNDLE_GENERATED_AT });
    const second = await createCalendarConversionReviewBundle({ generatedAt: BUNDLE_GENERATED_AT });

    expect(first).toEqual(second);
    expect(first.payload.candidates).toHaveLength(24);
    expect(new Set(first.payload.candidates.map((candidate) => candidate.id)).size).toBe(24);
    expect(new Set(first.payload.candidates.map((candidate) => candidate.candidateDigest)).size).toBe(24);
    expect(first.payload.reviewPolicy.currentVerifiedCount).toBe(0);
    expect(first.payload.dataset.reviewPolicy.verifiedCountingEnabled).toBe(false);

    const serialized = serializeCalendarConversionReviewBundle(first);
    const preflight = await preflightCalendarConversionReviewBundle(serialized, PREFLIGHT_CLOCK);
    expect(preflight).toEqual(first);
  });

  it("候选内容被修改并同步 fixture 与数据集摘要、重签外层摘要后仍拒绝旧候选摘要", async () => {
    const bundle = await createCalendarConversionReviewBundle({ generatedAt: BUNDLE_GENERATED_AT });
    const tampered = structuredClone(bundle);
    const tamperedFixture = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    const tag = "tampered_candidate_assertion";
    tampered.payload.candidates[0]!.coverageTags.push(tag);
    tamperedFixture.cases[0]!.coverageTags.push(tag);
    tampered.payload.dataset.fixtureDigest = await digestCalendarConversionFixture(tamperedFixture);
    tampered.payload.dataset.datasetDigest = await digestCalendarConversionDataset(tamperedFixture);
    await resignBundle(tampered);

    await expect(
      preflightCalendarConversionReviewBundle(tampered, PREFLIGHT_CLOCK)
    ).rejects.toMatchObject({ code: "CANDIDATE_MISMATCH" });
  });

  it("来源快照或冻结运行被完整重签成自洽审核包后，仍不能冒充当前 fixture", async () => {
    const sourceFixture = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    sourceFixture.sources[0]!.title = `${sourceFixture.sources[0]!.title}（篡改）`;
    const sourceBundle = await createCalendarConversionReviewBundle({
      fixture: sourceFixture,
      generatedAt: BUNDLE_GENERATED_AT
    });
    await expect(
      preflightCalendarConversionReviewBundle(sourceBundle, PREFLIGHT_CLOCK)
    ).rejects.toMatchObject({ code: "FIXTURE_MISMATCH" });

    const runFixture = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    runFixture.independentCrossCheckRuns[0]!.method += "（篡改）";
    const runBundle = await createCalendarConversionReviewBundle({
      fixture: runFixture,
      generatedAt: BUNDLE_GENERATED_AT
    });
    await expect(
      preflightCalendarConversionReviewBundle(runBundle, PREFLIGHT_CLOCK)
    ).rejects.toMatchObject({ code: "FIXTURE_MISMATCH" });
  });

  it("在进入 Zod 前拒绝原型污染键、getter、超深对象和超限文本", async () => {
    await expect(
      preflightCalendarConversionReviewBundle('{"__proto__":{"polluted":true}}', PREFLIGHT_CLOCK)
    ).rejects.toMatchObject({ code: "PROTOTYPE_POLLUTION_KEY" });

    let getterInvoked = false;
    const getterEnvelope: Record<string, unknown> = {};
    Object.defineProperty(getterEnvelope, "payload", {
      enumerable: true,
      get() {
        getterInvoked = true;
        return {};
      }
    });
    await expect(
      preflightCalendarConversionReviewBundle(getterEnvelope, PREFLIGHT_CLOCK)
    ).rejects.toMatchObject({ code: "NON_JSON_VALUE" });
    expect(getterInvoked).toBe(false);

    let deep: Record<string, unknown> = {};
    for (let depth = 0; depth < 102; depth += 1) deep = { nested: deep };
    await expect(
      preflightCalendarConversionReviewBundle(deep, PREFLIGHT_CLOCK)
    ).rejects.toMatchObject({ code: "NON_JSON_VALUE" });

    await expect(
      preflightCalendarConversionReviewBundle(" ".repeat(1024 * 1024 + 1), PREFLIGHT_CLOCK)
    ).rejects.toMatchObject({ code: "INPUT_TOO_LARGE" });
  });
});

describe("农历双人裁决预检", () => {
  it("matched 候选的合法双人 accept 只通过结构预检，身份未核验时不能进入 fixture 集成", async () => {
    const { bundle, candidate, payload } = await decisionContext();
    const envelope = await createCalendarConversionDecisionEnvelope(payload);
    const preflight = await preflightCalendarConversionDecision(
      serializeCalendarConversionDecisionEnvelope(envelope),
      { reviewBundle: serializeCalendarConversionReviewBundle(bundle), ...PREFLIGHT_CLOCK }
    );

    expect(preflight.candidate.id).toBe(candidate.id);
    expect(preflight.effectiveExpected).toEqual(expectedPair(candidate));
    expect(preflight.identityVerified).toBe(false);
    expect(preflight.sourceAuthenticityVerified).toBe(false);
    expect(preflight.eligibleForFixtureIntegration).toBe(false);
    expect(preflight.countsAsVerifiedGold).toBe(false);
    expect(preflight.notice).toMatch(/SHA-256 不是人员签名/);
  });

  it("拒绝把 .NET 首条 unsupported 结果包装成正向交叉验证", async () => {
    const unsupportedCaseId = crossCheckRun().unsupportedCaseIds[0];
    if (!unsupportedCaseId) throw new Error("测试缺失 .NET unsupported 案例");
    const { bundle, payload } = await decisionContext(unsupportedCaseId);
    const envelope = await createCalendarConversionDecisionEnvelope(payload);

    await expect(
      preflightCalendarConversionDecision(envelope, { reviewBundle: bundle, ...PREFLIGHT_CLOCK })
    ).rejects.toMatchObject({ code: "UNSUPPORTED_CROSSCHECK" });
  });

  it("拒绝同一复核人、主次复核逆序和早于审核包的复核时间", async () => {
    const duplicate = await decisionContext();
    duplicate.payload.attestations[1]!.reviewerId = duplicate.payload.attestations[0]!.reviewerId;
    expect(calendarDecisionPayloadSchema.safeParse(duplicate.payload).success).toBe(false);

    const reversed = await decisionContext();
    reversed.payload.attestations[0]!.reviewedAt = "2026-08-01T03:30:00.000Z";
    expect(calendarDecisionPayloadSchema.safeParse(reversed.payload).success).toBe(false);

    const replayedBeforeBundle = await decisionContext();
    replayedBeforeBundle.payload.attestations[0]!.reviewedAt = "2026-08-01T00:30:00.000Z";
    const envelope = await createCalendarConversionDecisionEnvelope(replayedBeforeBundle.payload);
    await expect(
      preflightCalendarConversionDecision(envelope, {
        reviewBundle: replayedBeforeBundle.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "TIME_ORDER_INVALID" });
  });

  it("复核人 ID 的大写、首尾空格和 NFKC 兼容变体均不能绕过规范化约束", async () => {
    const { payload } = await decisionContext();
    const nonCanonicalIds = [
      "Calendar-reviewer-a",
      " calendar-reviewer-a",
      "calendar-reviewer-a ",
      "ｃalendar-reviewer-a"
    ];

    for (const reviewerId of nonCanonicalIds) {
      const nonCanonical = structuredClone(payload);
      nonCanonical.attestations[0]!.reviewerId = reviewerId;
      expect(calendarDecisionPayloadSchema.safeParse(nonCanonical).success).toBe(false);
    }
  });

  it("拒绝已登记 sourceId 伪造 lineage、sourceRef 或材料摘要", async () => {
    const { bundle, payload } = await decisionContext();
    const forgeries: Array<(forged: CalendarDecisionPayload) => void> = [
      (forged) => {
        forged.sourceEvidence[0]!.lineageId = "forged-hko-lineage";
      },
      (forged) => {
        forged.sourceEvidence[0]!.sourceRef = "https://evil.example/forged-hko-table.txt";
      },
      (forged) => {
        forged.sourceEvidence[0]!.artifactSha256 = "0".repeat(64);
      }
    ];

    for (const forge of forgeries) {
      const forged = structuredClone(payload);
      forge(forged);
      const envelope = await createCalendarConversionDecisionEnvelope(forged);
      await expect(
        preflightCalendarConversionDecision(envelope, { reviewBundle: bundle, ...PREFLIGHT_CLOCK })
      ).rejects.toMatchObject({ code: "SOURCE_MISMATCH" });
    }
  });

  it("HKO 文本表与同谱系 CSV 不能伪装成两项独立来源", async () => {
    const context = await decisionContext("calendar-hko-2023-regular-02-01");
    context.payload.sourceEvidence[1] = authoritativeSourceEvidence(
      context.candidate,
      "hko-table-2023-csv"
    );

    expect(calendarDecisionPayloadSchema.safeParse(context.payload).success).toBe(false);

    const forgedLineage = structuredClone(context.payload);
    forgedLineage.sourceEvidence[1]!.lineageId = "forged-independent-hko-csv";
    expect(calendarDecisionPayloadSchema.safeParse(forgedLineage).success).toBe(true);
    const envelope = await createCalendarConversionDecisionEnvelope(forgedLineage);
    await expect(
      preflightCalendarConversionDecision(envelope, {
        reviewBundle: context.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "SOURCE_MISMATCH" });
  });

  it("accept 不能偷改日期对，replace 也不能伪装成未修改", async () => {
    const acceptedButChanged = await decisionContext();
    acceptedButChanged.payload.expected = {
      ...acceptedButChanged.payload.expected!,
      gregorianDate: "2000-01-01"
    };
    const acceptEnvelope = await createCalendarConversionDecisionEnvelope(acceptedButChanged.payload);
    await expect(
      preflightCalendarConversionDecision(acceptEnvelope, {
        reviewBundle: acceptedButChanged.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "DECISION_CONFLICT" });

    const replaceWithoutChange = await decisionContext();
    replaceWithoutChange.payload.decision = "replace_expected";
    const replaceEnvelope = await createCalendarConversionDecisionEnvelope(replaceWithoutChange.payload);
    await expect(
      preflightCalendarConversionDecision(replaceEnvelope, {
        reviewBundle: replaceWithoutChange.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "DECISION_CONFLICT" });
  });

  it("reject 必须使用 null，且合法拒绝只保留审计证据、不进入集成或金标计数", async () => {
    const invalidReject = await decisionContext();
    invalidReject.payload.decision = "reject_candidate";
    expect(calendarDecisionPayloadSchema.safeParse(invalidReject.payload).success).toBe(false);

    const rejected = await decisionContext();
    rejected.payload.decision = "reject_candidate";
    rejected.payload.expected = null;
    rejected.payload.rationale = "权威证据仍不足，拒绝当前候选并保留审计记录。";
    const envelope = await createCalendarConversionDecisionEnvelope(rejected.payload);
    const preflight = await preflightCalendarConversionDecision(envelope, {
      reviewBundle: rejected.bundle,
      ...PREFLIGHT_CLOCK
    });

    expect(preflight.effectiveExpected).toBeNull();
    expect(preflight.eligibleForFixtureIntegration).toBe(false);
    expect(preflight.countsAsVerifiedGold).toBe(false);
  });

  it("拒绝旧外层摘要、另一审核包和另一候选摘要的重放", async () => {
    const staleDigest = await decisionContext();
    const staleDigestEnvelope = await createCalendarConversionDecisionEnvelope(staleDigest.payload);
    staleDigestEnvelope.payload.rationale += "（摘要后篡改）";
    await expect(
      preflightCalendarConversionDecision(staleDigestEnvelope, {
        reviewBundle: staleDigest.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    const replayedBundle = await decisionContext();
    const replayedBundleEnvelope = await createCalendarConversionDecisionEnvelope(replayedBundle.payload);
    const anotherBundle = await createCalendarConversionReviewBundle({
      generatedAt: "2026-08-01T01:30:00.000Z"
    });
    await expect(
      preflightCalendarConversionDecision(replayedBundleEnvelope, {
        reviewBundle: anotherBundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "REVIEW_BUNDLE_MISMATCH" });

    const replayedCandidate = await decisionContext();
    const otherCandidate = CALENDAR_CONVERSION_FIXTURE.cases.find(
      (candidate) => candidate.id !== replayedCandidate.candidate.id
    );
    if (!otherCandidate) throw new Error("测试缺失第二个候选");
    replayedCandidate.payload.candidateDigest = await digestCalendarConversionCandidate(otherCandidate);
    const replayedCandidateEnvelope = await createCalendarConversionDecisionEnvelope(replayedCandidate.payload);
    await expect(
      preflightCalendarConversionDecision(replayedCandidateEnvelope, {
        reviewBundle: replayedCandidate.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "CANDIDATE_MISMATCH" });
  });

  it("拒绝重放其他 fixture 或数据集摘要，即使裁决外层摘要已重新计算", async () => {
    const staleFixture = await decisionContext();
    staleFixture.payload.fixtureDigest = "0".repeat(64);
    const staleFixtureEnvelope = await createCalendarConversionDecisionEnvelope(staleFixture.payload);
    await expect(
      preflightCalendarConversionDecision(staleFixtureEnvelope, {
        reviewBundle: staleFixture.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "DATASET_MISMATCH" });

    const staleDataset = await decisionContext();
    staleDataset.payload.datasetDigest = "f".repeat(64);
    const staleDatasetEnvelope = await createCalendarConversionDecisionEnvelope(staleDataset.payload);
    await expect(
      preflightCalendarConversionDecision(staleDatasetEnvelope, {
        reviewBundle: staleDataset.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "DATASET_MISMATCH" });
  });

  it("拒绝未来 createdAt、未知字段与 javascript/data/file 来源协议", async () => {
    const future = await decisionContext();
    future.payload.createdAt = "2026-08-01T07:00:00.000Z";
    const futureEnvelope = await createCalendarConversionDecisionEnvelope(future.payload);
    await expect(
      preflightCalendarConversionDecision(futureEnvelope, {
        reviewBundle: future.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "TIME_ORDER_INVALID" });

    const unknown = await decisionContext();
    const unknownEnvelope = await createCalendarConversionDecisionEnvelope(unknown.payload);
    const payloadWithUnknownField = unknownEnvelope.payload as CalendarDecisionPayload & {
      unexpectedField: string;
    };
    payloadWithUnknownField.unexpectedField = "must-not-be-ignored";
    unknownEnvelope.digest = await sha256Hex(payloadWithUnknownField);
    await expect(
      preflightCalendarConversionDecision(unknownEnvelope, {
        reviewBundle: unknown.bundle,
        ...PREFLIGHT_CLOCK
      })
    ).rejects.toMatchObject({ code: "INVALID_FORMAT" });

    const dangerousRefs = [
      "javascript:alert(1)",
      "data:text/plain,forged-calendar-evidence",
      "file:///C:/private/forged-calendar-evidence.txt"
    ];
    const unsafe = await decisionContext();
    for (const sourceRef of dangerousRefs) {
      const unsafePayload = structuredClone(unsafe.payload);
      unsafePayload.sourceEvidence[0]!.sourceRef = sourceRef;
      expect(calendarDecisionPayloadSchema.safeParse(unsafePayload).success).toBe(false);
    }
  });
});
