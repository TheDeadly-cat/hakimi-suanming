import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE } from "@hakimi/bazi-review-context";
import { sha256Hex } from "@hakimi/integrity";
import { webReportExportPort } from "@hakimi/platform";
import {
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
  type LocalBaziCitationApplicabilityObservationPreflightProjection
} from "../lib/bazi-citation-review-context";
import type { KnowledgeReviewContextLocator } from "../lib/knowledge-route";
import { APP_NAVIGATION_INTENT_EVENT } from "../lib/router";
import {
  BaziCitationApplicabilityObservationEditor,
  type BaziCitationApplicabilityEditorSeed
} from "./bazi-citation-applicability-observation-editor";

const CASE_ID = "11111111-1111-4111-8111-111111111111";
const REVISION_ID = "22222222-2222-4222-8222-222222222222";
const CITATION_IDS = [
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444"
] as const;
const CONTEXT_DIGEST = "a".repeat(64);

const locator = Object.freeze({
  caseId: CASE_ID,
  revisionId: REVISION_ID,
  evidenceSubjectId: "bazi.pillars.day.gan-zhi",
  fieldPath: "pillars.day.ganZhi"
}) satisfies KnowledgeReviewContextLocator;

const fileBoundary = Object.freeze({
  contextDigestBindingRequired: true,
  displayContextDigestBindingRequired: true,
  allVerifiedCitationIdsAddressed: true,
  reviewerIdentityBasis: "self_declared_not_verified",
  reviewerIdentityVerified: false,
  humanReviewAuthenticityVerified: false,
  digitalSignaturePresent: false,
  digitalSignatureVerified: false,
  digestIsDigitalSignature: false,
  sourceTextCopied: false,
  rawBirthInputCopied: false,
  caseAliasTagsNotesCopied: false,
  fieldValueCopied: false,
  containsDerivedSensitiveChartBinding: true,
  freeformReviewerTextAcceptedAsUntrustedPlainText: true,
  sourceTextInstructionAuthority: false,
  promptInjectionScreeningPerformed: false,
  chartApplicabilityAssessed: false,
  citationSemanticApplicabilityAssessed: false,
  semanticConflictResolutionPerformed: false,
  winnerSelectionPerformed: false,
  consensusClaimed: false,
  networkTransmissionPerformed: false,
  networkTransmissionAuthorized: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false,
  authenticityClaimed: false,
  result: null
} as const);

const preflightBoundary = Object.freeze({
  contextFreshRereadPerformed: true,
  priorDisplayedContextDigestMatched: true,
  suppliedCurrentContextDigestMatched: true,
  freeformObservationTextReturnedToUi: false,
  identityVerified: false,
  humanReviewAuthenticityVerified: false,
  chartApplicabilityAssessed: false,
  citationSemanticApplicabilityAssessed: false,
  eligibleForFormalActivation: false,
  automaticPromotionAllowed: false,
  storageMutationPerformed: false,
  mutationEpochBypassed: false,
  publicExportAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false
} as const);

function makeSeed(
  citationIds: readonly string[] = CITATION_IDS
): BaziCitationApplicabilityEditorSeed {
  const binding = Object.freeze({
    caseId: CASE_ID,
    revisionId: REVISION_ID,
    evidenceSubjectId: locator.evidenceSubjectId,
    fieldPath: locator.fieldPath,
    contextPayloadSha256: CONTEXT_DIGEST,
    displayContextBindingSha256: "b".repeat(64),
    worksetSnapshotSha256: "c".repeat(64),
    matchingSourceSetSha256: "d".repeat(64),
    citationCount: citationIds.length
  });
  const content = JSON.stringify({
    profile: BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
    contextBinding: {
      releaseIdentity: { dbGeneration: "legacy-v13", targetSchema: 13, migrationId: null },
      caseId: CASE_ID,
      revisionId: REVISION_ID,
      evidenceSubjectId: locator.evidenceSubjectId,
      fieldPath: locator.fieldPath,
      contextPayloadSha256: CONTEXT_DIGEST,
      displayContextBindingSha256: binding.displayContextBindingSha256,
      revisionSnapshotSha256: "e".repeat(64),
      factProjectionSha256: "f".repeat(64),
      ruleProjectionSha256: "1".repeat(64),
      worksetSnapshotSha256: binding.worksetSnapshotSha256,
      packetPayloadSha256: "2".repeat(64),
      matchingSourceSetSha256: binding.matchingSourceSetSha256,
      ruleProfile: {
        profileId: "ziping-working-zi-start-23",
        profileVersion: "1.0.0",
        profileStatus: "working_default",
        ruleProfileDigest: "3".repeat(64),
        revisionRulePackBinding: null
      },
      citationIds: [...citationIds]
    },
    reviewer: {
      reviewerId: "",
      displayName: "",
      affiliation: "",
      expertiseStatement: "",
      identityEvidenceReference: "",
      identityVerified: false
    },
    session: { observedAt: "", methodology: "", traditionScope: "", generalNotes: "" },
    observations: citationIds.map((citationId, index) => ({
      order: index + 1,
      citationId,
      observation: "unobserved",
      reason: "",
      applicabilityConditions: "",
      counterexamples: "",
      relatedCitationIds: [],
      additionalSourceUrls: []
    })),
    declaredCounts: {
      total: citationIds.length,
      unobserved: citationIds.length,
      applicableInBoundContext: 0,
      partiallyApplicableInBoundContext: 0,
      notApplicableInBoundContext: 0,
      insufficientBoundContext: 0
    },
    boundary: fileBoundary
  });
  return {
    fileName: "hakimi-bazi-citation-applicability-observation-v01.json",
    templateContent: content,
    binding,
    locator,
    citations: citationIds.map((citationId, index) => ({
      citationId,
      title: `核验条目 ${index + 1}`,
      author: `作者 ${index + 1}`,
      edition: `版本 ${index + 1}`
    }))
  };
}

function makeCitationIds(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => (
    `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
  ));
}

async function projectionForText(
  seed: BaziCitationApplicabilityEditorSeed,
  fileText: string,
  boundary = preflightBoundary
): Promise<LocalBaziCitationApplicabilityObservationPreflightProjection> {
  const file = JSON.parse(fileText) as {
    reviewer: { reviewerId: string; displayName: string; affiliation: string };
    declaredCounts: LocalBaziCitationApplicabilityObservationPreflightProjection["counts"];
  };
  const observedCount = file.declaredCounts.total - file.declaredCounts.unobserved;
  return {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
    binding: seed.binding,
    reviewer: {
      reviewerId: file.reviewer.reviewerId,
      displayName: file.reviewer.displayName,
      affiliation: file.reviewer.affiliation,
      identityVerified: false
    },
    counts: file.declaredCounts,
    observedCount,
    allCitationsObserved: observedCount === file.declaredCounts.total,
    reviewerAttributionComplete: true,
    recordSha256: await sha256Hex({
      domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE.recordDigestDomain,
      payload: JSON.parse(fileText) as unknown
    }),
    boundary
  };
}

function fillOneObservation() {
  fireEvent.change(screen.getAllByRole("combobox", { name: "当前冻结上下文中的观察状态" })[0]!, {
    target: { value: "applicable_in_bound_context" }
  });
  fireEvent.change(screen.getByLabelText(/观察者 ID/), { target: { value: "reviewer-local-01" } });
  fireEvent.change(screen.getByLabelText(/显示名/), { target: { value: "本机观察者甲" } });
  fireEvent.change(screen.getByLabelText(/专业说明/), { target: { value: "子平文献复核，自述。" } });
  fireEvent.change(screen.getByLabelText(/观察时间/), { target: { value: "2026-08-24T10:00:00.000Z" } });
  fireEvent.change(screen.getByLabelText(/传统 \/ 流派范围/), { target: { value: "子平法工作范围" } });
  fireEvent.change(screen.getByLabelText(/观察方法/), { target: { value: "逐条对照冻结字段、规则与引用。" } });
  fireEvent.change(screen.getByLabelText("理由（必填）"), { target: { value: "该引文直接讨论当前字段规则。" } });
  fireEvent.change(screen.getByLabelText("成立条件（必填）"), { target: { value: "限于当前冻结换日规则。" } });
  fireEvent.change(screen.getByLabelText("反例 / 失效情形（必填）"), { target: { value: "采用午夜换日时不成立。" } });
}

const projectionForgeries: readonly Readonly<{
  label: string;
  mutate(projection: LocalBaziCitationApplicabilityObservationPreflightProjection): unknown;
}>[] = [
  {
    label: "wrong record digest",
    mutate: (projection) => ({ ...projection, recordSha256: "0".repeat(64) })
  },
  {
    label: "reviewer mismatch",
    mutate: (projection) => ({
      ...projection,
      reviewer: { ...projection.reviewer, displayName: "另一个观察者" }
    })
  },
  {
    label: "extra profile authority",
    mutate: (projection) => ({
      ...projection,
      profile: { ...projection.profile, publicReleaseAuthorized: true }
    })
  },
  {
    label: "extra boundary authority",
    mutate: (projection) => ({
      ...projection,
      boundary: { ...projection.boundary, publicReleaseAuthorized: true }
    })
  },
  {
    label: "extra root authority",
    mutate: (projection) => ({ ...projection, formalActivationAllowed: true })
  }
];

describe("BaziCitationApplicabilityObservationEditor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("keeps freeform text in the leaf, fresh-preflights the exact file, and prepares blocked-sensitive delivery", async () => {
    const seed = makeSeed();
    const summaries: unknown[] = [];
    const preflightObservation = vi.fn(async (
      _locator: KnowledgeReviewContextLocator,
      _digest: string,
      fileText: string
    ) => projectionForText(seed, fileText));
    const { container } = render(
      <BaziCitationApplicabilityObservationEditor
        seed={seed}
        stale={false}
        onSummaryChange={(summary) => summaries.push(summary)}
        onDiscard={vi.fn()}
        preflightObservation={preflightObservation}
      />
    );

    fillOneObservation();
    fireEvent.click(screen.getByRole("button", { name: "严格预检并准备本机文件" }));

    const dialog = await screen.findByRole("dialog", { name: "待交付文件已在本机生成" });
    expect(within(dialog).getByText("字段来源适用性观察文件")).toBeTruthy();
    expect(container.querySelector("[data-share-policy='blocked_sensitive']")).toBeTruthy();
    expect(preflightObservation).toHaveBeenCalledTimes(1);
    const [calledLocator, calledDigest, fileText] = preflightObservation.mock.calls[0]!;
    expect(calledLocator).toEqual(locator);
    expect(calledDigest).toBe(CONTEXT_DIGEST);
    const file = JSON.parse(fileText) as {
      contextBinding: {
        releaseIdentity: { dbGeneration: string; targetSchema: number; migrationId: string | null };
      };
      reviewer: { displayName: string; identityVerified: boolean };
      observations: Array<{ observation: string; reason: string }>;
      declaredCounts: { total: number; unobserved: number; applicableInBoundContext: number };
      boundary: {
        storageMutationPerformed: boolean;
        automaticPromotionAllowed: boolean;
        mutationEpochRevalidationPerformed: boolean;
        mutationEpochBypassed: boolean;
      };
    };
    expect(file.contextBinding.releaseIdentity).toEqual({
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    });
    expect(file.reviewer).toMatchObject({ displayName: "本机观察者甲", identityVerified: false });
    expect(file.observations[0]).toMatchObject({
      observation: "applicable_in_bound_context",
      reason: "该引文直接讨论当前字段规则。"
    });
    expect(file.declaredCounts).toMatchObject({ total: 2, unobserved: 1, applicableInBoundContext: 1 });
    expect(file.boundary).toMatchObject({
      storageMutationPerformed: false,
      automaticPromotionAllowed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false
    });
    expect(JSON.stringify(summaries)).not.toContain("该引文直接讨论当前字段规则");
    expect(screen.getByText(/1 \/ 2 条已填写/)).toBeTruthy();
  });

  it("rejects a forged preflight projection that promotes activation authority", async () => {
    const seed = makeSeed();
    const preflightObservation = vi.fn(async (
      _locator: KnowledgeReviewContextLocator,
      _digest: string,
      fileText: string
    ) => projectionForText(seed, fileText, {
      ...preflightBoundary,
      automaticPromotionAllowed: true
    } as unknown as typeof preflightBoundary));
    render(
      <BaziCitationApplicabilityObservationEditor
        seed={seed}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={preflightObservation}
      />
    );

    fillOneObservation();
    fireEvent.click(screen.getByRole("button", { name: "严格预检并准备本机文件" }));

    expect(await screen.findByText(/严格预检没有闭合/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each(projectionForgeries)("fails closed for a $label preflight projection", async ({ mutate }) => {
    const seed = makeSeed();
    const preflightObservation = vi.fn(async (
      _locator: KnowledgeReviewContextLocator,
      _digest: string,
      fileText: string
    ) => mutate(await projectionForText(seed, fileText)));
    render(
      <BaziCitationApplicabilityObservationEditor
        seed={seed}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={preflightObservation}
      />
    );

    fillOneObservation();
    fireEvent.click(screen.getByRole("button", { name: "严格预检并准备本机文件" }));

    expect(await screen.findByText(/严格预检没有闭合/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("freezes a dirty draft on staleness and only offers an explicitly unpreflighted recovery file", async () => {
    const seed = makeSeed();
    const onSummaryChange = vi.fn();
    const saveFile = vi.spyOn(webReportExportPort, "saveFile").mockResolvedValue({
      status: "download_requested",
      filename: "hakimi-bazi-citation-applicability-observation-v01-stale-recovery.json",
      method: "browser_download"
    });
    const { container, rerender } = render(
      <BaziCitationApplicabilityObservationEditor
        seed={seed}
        stale={false}
        onSummaryChange={onSummaryChange}
        onDiscard={vi.fn()}
        preflightObservation={vi.fn()}
      />
    );
    fillOneObservation();
    fireEvent.click(screen.getByText("可选关联引用与补充来源"));
    const urlField = await screen.findByLabelText(/补充来源 HTTPS URL/);
    fireEvent.change(urlField, { target: { value: "not a url" } });

    rerender(
      <BaziCitationApplicabilityObservationEditor
        seed={seed}
        stale
        onSummaryChange={onSummaryChange}
        onDiscard={vi.fn()}
        preflightObservation={vi.fn()}
      />
    );

    expect(await screen.findByText("旧草稿已冻结")).toBeTruthy();
    expect(screen.getByLabelText(/显示名/)).toHaveProperty("value", "本机观察者甲");
    expect((screen.getByLabelText(/显示名/).closest("fieldset") as HTMLFieldSetElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "准备旧上下文恢复草稿" }));
    const dialog = await screen.findByRole("dialog", { name: "待交付文件已在本机生成" });
    expect(within(dialog).getByText("旧上下文观察恢复草稿")).toBeTruthy();
    expect(container.querySelector("[data-share-policy='blocked_sensitive']")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    const recoveryBlob = saveFile.mock.calls[0]?.[0];
    expect(recoveryBlob).toBeInstanceOf(Blob);
    expect(await recoveryBlob!.text()).toContain('"not a url"');
  });

  it("does not start preflight when staleness arrives in the same rerender", () => {
    const seed = makeSeed();
    const preflightObservation = vi.fn();
    const view = render(
      <BaziCitationApplicabilityObservationEditor
        seed={seed}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={preflightObservation}
      />
    );
    fillOneObservation();

    view.rerender(
      <BaziCitationApplicabilityObservationEditor
        seed={seed}
        stale
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={preflightObservation}
      />
    );
    fireEvent.submit(view.container.querySelector("form")!);

    expect(preflightObservation).not.toHaveBeenCalled();
    expect(screen.getByText("旧草稿已冻结")).toBeTruthy();
  });

  it("rejects a single source URL over 2,000 characters before any context reread", async () => {
    const preflightObservation = vi.fn();
    render(
      <BaziCitationApplicabilityObservationEditor
        seed={makeSeed()}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={preflightObservation}
      />
    );
    fillOneObservation();
    fireEvent.click(screen.getByText("可选关联引用与补充来源"));
    fireEvent.change(await screen.findByLabelText(/补充来源 HTTPS URL/), {
      target: { value: `https://example.test/${"a".repeat(2_001)}` }
    });

    fireEvent.click(screen.getByRole("button", { name: "严格预检并准备本机文件" }));

    expect(await screen.findByText(/不能超过 2,000 个字符/)).toBeTruthy();
    expect(preflightObservation).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reopens closed optional controls and focuses the invalid URL field", async () => {
    render(
      <BaziCitationApplicabilityObservationEditor
        seed={makeSeed()}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={vi.fn()}
      />
    );
    fillOneObservation();
    const optionalSummary = screen.getByText("可选关联引用与补充来源");
    fireEvent.click(optionalSummary);
    const urlField = await screen.findByLabelText(/补充来源 HTTPS URL/);
    fireEvent.change(urlField, { target: { value: "not a url" } });
    const optionalDetails = optionalSummary.closest("details") as HTMLDetailsElement;
    optionalDetails.open = false;
    fireEvent(optionalDetails, new Event("toggle"));
    await waitFor(() => expect(screen.queryByLabelText(/补充来源 HTTPS URL/)).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "严格预检并准备本机文件" }));

    const reopenedUrlField = await screen.findByLabelText(/补充来源 HTTPS URL/);
    await waitFor(() => expect(document.activeElement).toBe(reopenedUrlField));
    expect(screen.getByText(/一行一个有效 HTTPS URL/)).toBeTruthy();
  });

  it("rejects a file over 512 KiB before any context reread", async () => {
    const preflightObservation = vi.fn();
    render(
      <BaziCitationApplicabilityObservationEditor
        seed={makeSeed(makeCitationIds(64))}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={preflightObservation}
      />
    );
    for (let index = 8; index < 64; index += 8) {
      fireEvent.click(screen.getByRole("button", { name: /再显示 .* 条 citation/ }));
    }
    for (const select of screen.getAllByRole("combobox", { name: "当前冻结上下文中的观察状态" })) {
      fireEvent.change(select, { target: { value: "applicable_in_bound_context" } });
    }
    fireEvent.change(screen.getByLabelText(/观察者 ID/), { target: { value: "reviewer-local-64" } });
    fireEvent.change(screen.getByLabelText(/显示名/), { target: { value: "本机观察者六十四" } });
    fireEvent.change(screen.getByLabelText(/专业说明/), { target: { value: "本机结构限额测试，自述。" } });
    fireEvent.change(screen.getByLabelText(/观察时间/), { target: { value: "2026-08-24T10:00:00.000Z" } });
    fireEvent.change(screen.getByLabelText(/传统 \/ 流派范围/), { target: { value: "子平法工作范围" } });
    fireEvent.change(screen.getByLabelText(/观察方法/), { target: { value: "逐条填写到正式合同允许的字段上限。" } });
    const maximumText = "界".repeat(4_000);
    for (const field of screen.getAllByLabelText("理由（必填）")) {
      fireEvent.change(field, { target: { value: maximumText } });
    }
    for (const field of screen.getAllByLabelText("成立条件（必填）")) {
      fireEvent.change(field, { target: { value: maximumText } });
    }
    for (const field of screen.getAllByLabelText("反例 / 失效情形（必填）")) {
      fireEvent.change(field, { target: { value: maximumText } });
    }

    fireEvent.click(screen.getByRole("button", { name: "严格预检并准备本机文件" }));

    expect(await screen.findByText(/超过 512 KiB 上限/)).toBeTruthy();
    expect(preflightObservation).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  }, 20_000);

  it("blocks cancelable in-app navigation while the in-memory draft is dirty", async () => {
    render(
      <BaziCitationApplicabilityObservationEditor
        seed={makeSeed()}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText(/显示名/), { target: { value: "未交付草稿" } });
    const navigationIntent = new CustomEvent(APP_NAVIGATION_INTENT_EVENT, {
      cancelable: true,
      detail: { href: "/knowledge/other", source: "link" }
    });

    expect(window.dispatchEvent(navigationIntent)).toBe(false);
    expect(navigationIntent.defaultPrevented).toBe(true);
    expect(await screen.findByText("已阻止站内离开")).toBeTruthy();
  });

  it("renders citations progressively and mounts optional relation controls only when opened", async () => {
    render(
      <BaziCitationApplicabilityObservationEditor
        seed={makeSeed(makeCitationIds(9))}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={vi.fn()}
        preflightObservation={vi.fn()}
      />
    );

    expect(screen.getAllByRole("combobox", { name: "当前冻结上下文中的观察状态" })).toHaveLength(8);
    expect(screen.queryByLabelText(/关联当前集合中的其他 citation/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "再显示 1 条 citation" }));
    expect(screen.getAllByRole("combobox", { name: "当前冻结上下文中的观察状态" })).toHaveLength(9);
    fireEvent.change(screen.getAllByRole("combobox", { name: "当前冻结上下文中的观察状态" })[0]!, {
      target: { value: "insufficient_bound_context" }
    });
    fireEvent.click(screen.getByText("可选关联引用与补充来源"));
    expect(await screen.findByLabelText(/关联当前集合中的其他 citation/)).toBeTruthy();
  });

  it("requires a second explicit click before discarding a dirty in-memory draft", async () => {
    const onDiscard = vi.fn();
    render(
      <BaziCitationApplicabilityObservationEditor
        seed={makeSeed()}
        stale={false}
        onSummaryChange={vi.fn()}
        onDiscard={onDiscard}
        preflightObservation={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("显示名"), { target: { value: "未交付草稿" } });
    fireEvent.click(screen.getByRole("button", { name: "丢弃内存草稿" }));
    expect(onDiscard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "再次点击确认丢弃" }));
    await waitFor(() => expect(onDiscard).toHaveBeenCalledTimes(1));
  });
});
