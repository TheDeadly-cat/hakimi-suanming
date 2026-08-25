import {
  Clock3,
  FileCheck2,
  FileWarning,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  TriangleAlert
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
  type BaziCitationApplicabilityObservationEnvelope,
  type BaziCitationApplicabilityObservationItem,
  type BaziCitationApplicabilityObservationStatus
} from "@hakimi/bazi-review-context";
import { sha256Hex } from "@hakimi/integrity";
import { webReportExportPort } from "@hakimi/platform";
import {
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
  type LocalBaziCitationApplicabilityObservationPreflightProjection,
  type LocalBaziCitationApplicabilityObservationTemplate
} from "../lib/bazi-citation-review-context";
/*
 * The editor intentionally owns freeform observation text and its Blob. Its optional
 * preflight port is a leaf-level test seam; the parent panel must not forward fileText.
 */
import type {
  KnowledgeReviewContextLocator
} from "../lib/knowledge-route";
import { APP_NAVIGATION_INTENT_EVENT } from "../lib/router";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "./prepared-file-delivery-dialog";
import { StatusPill } from "./status-pill";
import "./bazi-citation-applicability-observation-editor.css";

const MAX_ADDITIONAL_SOURCE_URLS = 8;
const MAX_RELATED_CITATIONS = 16;
const MAX_ADDITIONAL_SOURCE_URL_CHARACTERS = 2_000;
const MAX_OBSERVATION_FILE_BYTES = 512 * 1024;
const INITIAL_VISIBLE_CITATIONS = 8;
const VISIBLE_CITATION_STEP = 8;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const observationOptions: readonly Readonly<{
  value: BaziCitationApplicabilityObservationStatus;
  label: string;
}>[] = Object.freeze([
  { value: "unobserved", label: "尚未观察" },
  { value: "applicable_in_bound_context", label: "适用于当前冻结上下文" },
  { value: "partially_applicable_in_bound_context", label: "部分适用于当前冻结上下文" },
  { value: "not_applicable_in_bound_context", label: "不适用于当前冻结上下文" },
  { value: "insufficient_bound_context", label: "当前上下文不足以判断" }
]);

export interface BaziCitationApplicabilityEditorCitation {
  citationId: string;
  title: string;
  author: string;
  edition: string;
}

export interface BaziCitationApplicabilityEditorSeed {
  fileName: "hakimi-bazi-citation-applicability-observation-v01.json";
  templateContent: string;
  binding: LocalBaziCitationApplicabilityObservationTemplate["binding"];
  locator: KnowledgeReviewContextLocator;
  citations: readonly BaziCitationApplicabilityEditorCitation[];
}

export interface BaziCitationApplicabilityEditorSummary {
  dirty: boolean;
  stale: boolean;
  total: number;
  observed: number;
}

export type PreflightBaziCitationApplicabilityObservationForEditor = (
  locator: KnowledgeReviewContextLocator,
  expectedPriorContextPayloadSha256: string,
  fileText: string
) => Promise<unknown>;

interface EditableObservation extends Omit<
  BaziCitationApplicabilityObservationItem,
  "relatedCitationIds" | "additionalSourceUrls"
> {
  relatedCitationIds: string[];
  additionalSourceUrlsText: string;
}

interface EditorDraft {
  envelope: BaziCitationApplicabilityObservationEnvelope;
  reviewer: BaziCitationApplicabilityObservationEnvelope["reviewer"];
  session: BaziCitationApplicabilityObservationEnvelope["session"];
  observations: EditableObservation[];
}

interface DraftCounts {
  total: number;
  unobserved: number;
  applicableInBoundContext: number;
  partiallyApplicableInBoundContext: number;
  notApplicableInBoundContext: number;
  insufficientBoundContext: number;
}

interface DraftValidationFailure {
  message: string;
  fieldKey: string | null;
}

function parseSeed(seed: BaziCitationApplicabilityEditorSeed): EditorDraft | null {
  try {
    const envelope = JSON.parse(seed.templateContent) as BaziCitationApplicabilityObservationEnvelope;
    if (
      !Array.isArray(envelope.observations)
      || envelope.observations.length !== seed.citations.length
      || envelope.observations.some((item, index) => (
        item.citationId !== seed.citations[index]?.citationId
        || item.order !== index + 1
        || item.observation !== "unobserved"
      ))
    ) return null;
    return {
      envelope,
      reviewer: { ...envelope.reviewer },
      session: { ...envelope.session },
      observations: envelope.observations.map((item) => ({
        ...item,
        relatedCitationIds: [...item.relatedCitationIds],
        additionalSourceUrlsText: item.additionalSourceUrls.join("\n")
      }))
    };
  } catch {
    return null;
  }
}

function countObservations(observations: readonly EditableObservation[]): DraftCounts {
  const counts: DraftCounts = {
    total: observations.length,
    unobserved: 0,
    applicableInBoundContext: 0,
    partiallyApplicableInBoundContext: 0,
    notApplicableInBoundContext: 0,
    insufficientBoundContext: 0
  };
  for (const item of observations) {
    if (item.observation === "unobserved") counts.unobserved += 1;
    else if (item.observation === "applicable_in_bound_context") counts.applicableInBoundContext += 1;
    else if (item.observation === "partially_applicable_in_bound_context") {
      counts.partiallyApplicableInBoundContext += 1;
    } else if (item.observation === "not_applicable_in_bound_context") {
      counts.notApplicableInBoundContext += 1;
    } else counts.insufficientBoundContext += 1;
  }
  return counts;
}

function parseAdditionalSourceUrls(raw: string): readonly string[] {
  const values = raw
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length > MAX_ADDITIONAL_SOURCE_URLS || new Set(values).size !== values.length) {
    throw new Error("补充来源 URL 最多 8 条且不得重复。");
  }
  for (const value of values) {
    if (value.length > MAX_ADDITIONAL_SOURCE_URL_CHARACTERS) {
      throw new Error("单条补充来源 URL 不能超过 2,000 个字符。");
    }
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("补充来源必须是一行一个有效 HTTPS URL。");
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error("补充来源只允许不含账号或密码的 HTTPS URL。");
    }
  }
  return values;
}

function validIsoInstant(value: string): boolean {
  return ISO_INSTANT_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}

function attributionState(draft: EditorDraft): Readonly<{ hasInput: boolean; complete: boolean }> {
  const values = [
    draft.reviewer.reviewerId,
    draft.reviewer.displayName,
    draft.reviewer.affiliation,
    draft.reviewer.expertiseStatement,
    draft.reviewer.identityEvidenceReference,
    draft.session.observedAt,
    draft.session.methodology,
    draft.session.traditionScope,
    draft.session.generalNotes
  ];
  return {
    hasInput: values.some((value) => value.trim()),
    complete: Boolean(
      draft.reviewer.reviewerId.trim()
      && draft.reviewer.displayName.trim()
      && draft.reviewer.expertiseStatement.trim()
      && validIsoInstant(draft.session.observedAt)
      && draft.session.methodology.trim()
      && draft.session.traditionScope.trim()
    )
  };
}

function buildObservationFile(draft: EditorDraft): Readonly<{
  text: string;
  counts: DraftCounts;
  envelope: BaziCitationApplicabilityObservationEnvelope;
}> {
  const counts = countObservations(draft.observations);
  const observations = draft.observations.map(({ additionalSourceUrlsText, ...item }) => ({
    ...item,
    relatedCitationIds: [...item.relatedCitationIds],
    additionalSourceUrls: parseAdditionalSourceUrls(additionalSourceUrlsText)
  }));
  const envelope: BaziCitationApplicabilityObservationEnvelope = {
    ...draft.envelope,
    reviewer: { ...draft.reviewer, identityVerified: false },
    session: { ...draft.session },
    observations,
    declaredCounts: counts
  };
  return { text: `${JSON.stringify(envelope, null, 2)}\n`, counts, envelope };
}

function buildStaleRecoveryFile(draft: EditorDraft): string {
  const counts = countObservations(draft.observations);
  const observations = draft.observations.map(({ additionalSourceUrlsText, ...item }) => ({
    ...item,
    relatedCitationIds: [...item.relatedCitationIds],
    additionalSourceUrls: additionalSourceUrlsText
      .split(/\r?\n/u)
      .map((value) => value.trim())
      .filter(Boolean)
  }));
  return `${JSON.stringify({
    ...draft.envelope,
    reviewer: { ...draft.reviewer, identityVerified: false },
    session: { ...draft.session },
    observations,
    declaredCounts: counts
  }, null, 2)}\n`;
}

type PlainRecord = Record<string, unknown>;

function plainDataRecord(value: unknown, expectedKeys: readonly string[]): PlainRecord | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) return null;
  const keys = ownKeys as string[];
  const sortedKeys = [...keys].sort();
  const sortedExpected = [...expectedKeys].sort();
  if (
    sortedKeys.length !== sortedExpected.length
    || sortedKeys.some((key, index) => key !== sortedExpected[index])
  ) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (keys.some((key) => !("value" in descriptors[key]!) || descriptors[key]?.enumerable !== true)) {
    return null;
  }
  return value as PlainRecord;
}

function samePrimitiveProfile(value: unknown): boolean {
  const expected = LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE;
  const candidate = plainDataRecord(value, Object.keys(expected));
  return Boolean(candidate && Object.entries(expected).every(([key, expectedValue]) => (
    candidate[key] === expectedValue
  )));
}

function sameBinding(
  candidate: LocalBaziCitationApplicabilityObservationPreflightProjection["binding"],
  expected: LocalBaziCitationApplicabilityObservationTemplate["binding"]
): boolean {
  return candidate.caseId === expected.caseId
    && candidate.revisionId === expected.revisionId
    && candidate.evidenceSubjectId === expected.evidenceSubjectId
    && candidate.fieldPath === expected.fieldPath
    && candidate.contextPayloadSha256 === expected.contextPayloadSha256
    && candidate.displayContextBindingSha256 === expected.displayContextBindingSha256
    && candidate.worksetSnapshotSha256 === expected.worksetSnapshotSha256
    && candidate.matchingSourceSetSha256 === expected.matchingSourceSetSha256
    && candidate.citationCount === expected.citationCount;
}

function safePreflightReceipt(
  raw: unknown,
  seed: BaziCitationApplicabilityEditorSeed,
  draft: EditorDraft,
  counts: DraftCounts,
  reviewerAttributionComplete: boolean,
  expectedRecordSha256: string
): Readonly<{ recordSha256: string; observedCount: number; allCitationsObserved: boolean }> | null {
  const root = plainDataRecord(raw, [
    "profile",
    "binding",
    "reviewer",
    "counts",
    "observedCount",
    "allCitationsObserved",
    "reviewerAttributionComplete",
    "recordSha256",
    "boundary"
  ]);
  if (!root || !samePrimitiveProfile(root.profile)) return null;
  const preflight = root as unknown as LocalBaziCitationApplicabilityObservationPreflightProjection;
  const binding = plainDataRecord(preflight.binding, [
    "caseId",
    "revisionId",
    "evidenceSubjectId",
    "fieldPath",
    "contextPayloadSha256",
    "displayContextBindingSha256",
    "worksetSnapshotSha256",
    "matchingSourceSetSha256",
    "citationCount"
  ]);
  const reviewer = plainDataRecord(preflight.reviewer, [
    "reviewerId",
    "displayName",
    "affiliation",
    "identityVerified"
  ]);
  const projectedCounts = plainDataRecord(preflight.counts, [
    "total",
    "unobserved",
    "applicableInBoundContext",
    "partiallyApplicableInBoundContext",
    "notApplicableInBoundContext",
    "insufficientBoundContext"
  ]);
  const boundary = plainDataRecord(preflight.boundary, [
    "contextFreshRereadPerformed",
    "priorDisplayedContextDigestMatched",
    "suppliedCurrentContextDigestMatched",
    "freeformObservationTextReturnedToUi",
    "identityVerified",
    "humanReviewAuthenticityVerified",
    "chartApplicabilityAssessed",
    "citationSemanticApplicabilityAssessed",
    "eligibleForFormalActivation",
    "automaticPromotionAllowed",
    "storageMutationPerformed",
    "mutationEpochBypassed",
    "publicExportAuthorized",
    "expertTruthClaimed",
    "scientificValidityClaimed"
  ]);
  const observedCount = counts.total - counts.unobserved;
  if (
    !binding
    || !sameBinding(preflight.binding, seed.binding)
    || !reviewer
    || reviewer.reviewerId !== draft.reviewer.reviewerId
    || reviewer.displayName !== draft.reviewer.displayName
    || reviewer.affiliation !== draft.reviewer.affiliation
    || reviewer.identityVerified !== false
    || !projectedCounts
    || preflight.counts.total !== counts.total
    || preflight.counts.unobserved !== counts.unobserved
    || preflight.counts.applicableInBoundContext !== counts.applicableInBoundContext
    || preflight.counts.partiallyApplicableInBoundContext !== counts.partiallyApplicableInBoundContext
    || preflight.counts.notApplicableInBoundContext !== counts.notApplicableInBoundContext
    || preflight.counts.insufficientBoundContext !== counts.insufficientBoundContext
    || preflight.observedCount !== observedCount
    || preflight.allCitationsObserved !== (observedCount === counts.total)
    || preflight.reviewerAttributionComplete !== reviewerAttributionComplete
    || !SHA256_PATTERN.test(preflight.recordSha256)
    || preflight.recordSha256 !== expectedRecordSha256
  ) return null;
  if (
    !boundary
    || boundary.contextFreshRereadPerformed !== true
    || boundary.priorDisplayedContextDigestMatched !== true
    || boundary.suppliedCurrentContextDigestMatched !== true
    || boundary.freeformObservationTextReturnedToUi !== false
    || boundary.identityVerified !== false
    || boundary.humanReviewAuthenticityVerified !== false
    || boundary.chartApplicabilityAssessed !== false
    || boundary.citationSemanticApplicabilityAssessed !== false
    || boundary.eligibleForFormalActivation !== false
    || boundary.automaticPromotionAllowed !== false
    || boundary.storageMutationPerformed !== false
    || boundary.mutationEpochBypassed !== false
    || boundary.publicExportAuthorized !== false
    || boundary.expertTruthClaimed !== false
    || boundary.scientificValidityClaimed !== false
  ) return null;
  return {
    recordSha256: preflight.recordSha256,
    observedCount,
    allCitationsObserved: preflight.allCitationsObserved
  };
}

async function preflightCurrentObservation(
  locator: KnowledgeReviewContextLocator,
  expectedPriorContextPayloadSha256: string,
  fileText: string
): Promise<unknown> {
  const { preflightCurrentLocalBaziCitationApplicabilityObservation } = await import(
    "../lib/bazi-citation-review-context"
  );
  return preflightCurrentLocalBaziCitationApplicabilityObservation(
    locator,
    expectedPriorContextPayloadSha256,
    fileText
  );
}

function shortDigest(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function BaziCitationApplicabilityObservationEditor({
  seed,
  stale,
  onSummaryChange,
  onDiscard,
  preflightObservation = preflightCurrentObservation
}: {
  seed: BaziCitationApplicabilityEditorSeed;
  stale: boolean;
  onSummaryChange: (summary: BaziCitationApplicabilityEditorSummary) => void;
  onDiscard: () => void;
  preflightObservation?: PreflightBaziCitationApplicabilityObservationForEditor;
}) {
  const titleId = useId();
  const errorId = useId();
  const citationHeadingPrefix = useId();
  const editorRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const observationSelectRefs = useRef(new Map<string, HTMLSelectElement>());
  const operationTokenRef = useRef(0);
  const stalePropRef = useRef(stale);
  stalePropRef.current = stale;
  const initialDraft = useMemo(() => parseSeed(seed), [seed]);
  const [draft, setDraft] = useState<EditorDraft | null>(initialDraft);
  const [dirty, setDirty] = useState(false);
  const [bindingState, setBindingState] = useState<"current" | "checking" | "stale">(
    stale ? "stale" : "current"
  );
  const [ioState, setIoState] = useState<"idle" | "validating" | "export_prepared">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrorKey, setFieldErrorKey] = useState<string | null>(null);
  const [navigationBlocked, setNavigationBlocked] = useState(false);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedFileArtifact | null>(null);
  const [recordReceipt, setRecordReceipt] = useState<Readonly<{
    recordSha256: string;
    observedCount: number;
    allCitationsObserved: boolean;
  }> | null>(null);
  const [discardArmed, setDiscardArmed] = useState(false);
  const [pendingResetCitationId, setPendingResetCitationId] = useState<string | null>(null);
  const [visibleCitationLimit, setVisibleCitationLimit] = useState(INITIAL_VISIBLE_CITATIONS);
  const [openRelatedCitationIds, setOpenRelatedCitationIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const counts = useMemo(
    () => countObservations(draft?.observations ?? []),
    [draft?.observations]
  );
  const observedCount = counts.total - counts.unobserved;
  const effectiveStale = stale || bindingState === "stale";
  const frozen = effectiveStale || bindingState !== "current" || ioState === "validating";

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!stale) return;
    operationTokenRef.current += 1;
    setBindingState("stale");
    setIoState("idle");
    setPreparedDelivery(null);
    setRecordReceipt(null);
    setFieldErrorKey(null);
    setErrorMessage("绑定上下文已经失效；草稿已冻结，不能再作为当前上下文文件预检。可准备旧上下文恢复草稿，或确认丢弃后重新读取。");
  }, [stale]);

  useEffect(() => {
    onSummaryChange({
      dirty,
      stale: effectiveStale,
      total: counts.total,
      observed: observedCount
    });
  }, [counts.total, dirty, effectiveStale, observedCount, onSummaryChange]);

  useEffect(() => {
    if (!dirty || typeof window === "undefined") return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    const blockAppNavigation = (event: Event) => {
      event.preventDefault();
      setNavigationBlocked(true);
    };
    const blockExternalAnchorNavigation = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!element) return;
      let target: URL;
      try {
        target = new URL(element.href, window.location.href);
      } catch {
        return;
      }
      if (target.origin === window.location.origin && target.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setNavigationBlocked(true);
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blockAppNavigation);
    document.addEventListener("click", blockExternalAnchorNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blockAppNavigation);
      document.removeEventListener("click", blockExternalAnchorNavigation, true);
    };
  }, [dirty]);

  useEffect(() => () => {
    operationTokenRef.current += 1;
  }, []);

  const markChanged = () => {
    setDirty(true);
    onSummaryChange({
      dirty: true,
      stale: effectiveStale,
      total: counts.total,
      observed: observedCount
    });
    setDiscardArmed(false);
    setErrorMessage(null);
    setFieldErrorKey(null);
    setNavigationBlocked(false);
    setPreparedDelivery(null);
    setRecordReceipt(null);
    if (bindingState === "current") setIoState("idle");
  };

  const updateReviewer = (
    field: keyof Omit<EditorDraft["reviewer"], "identityVerified">,
    value: string
  ) => {
    if (!draft || frozen) return;
    markChanged();
    setDraft({ ...draft, reviewer: { ...draft.reviewer, [field]: value, identityVerified: false } });
  };

  const updateSession = (field: keyof EditorDraft["session"], value: string) => {
    if (!draft || frozen) return;
    markChanged();
    setDraft({ ...draft, session: { ...draft.session, [field]: value } });
  };

  const updateObservation = (citationId: string, patch: Partial<EditableObservation>) => {
    if (!draft || frozen) return;
    markChanged();
    setDraft({
      ...draft,
      observations: draft.observations.map((item) => item.citationId === citationId
        ? { ...item, ...patch }
        : item)
    });
  };

  const changeObservationStatus = (
    item: EditableObservation,
    nextStatus: BaziCitationApplicabilityObservationStatus
  ) => {
    if (frozen) return;
    if (nextStatus === "unobserved" && (
      item.reason.trim()
      || item.applicabilityConditions.trim()
      || item.counterexamples.trim()
      || item.relatedCitationIds.length
      || item.additionalSourceUrlsText.trim()
    )) {
      setPendingResetCitationId(item.citationId);
      return;
    }
    updateObservation(item.citationId, { observation: nextStatus });
  };

  const confirmResetObservation = (citationId: string) => {
    updateObservation(citationId, {
      observation: "unobserved",
      reason: "",
      applicabilityConditions: "",
      counterexamples: "",
      relatedCitationIds: [],
      additionalSourceUrlsText: ""
    });
    setPendingResetCitationId(null);
    queueMicrotask(() => observationSelectRefs.current.get(citationId)?.focus());
  };

  const validateDraft = (): DraftValidationFailure | null => {
    if (!draft) return { message: "空白观察模板未形成，不能准备文件。", fieldKey: null };
    const attribution = attributionState(draft);
    if ((observedCount > 0 || attribution.hasInput) && !attribution.complete) {
      const fieldKey = !draft.reviewer.reviewerId.trim()
        ? "reviewer.reviewerId"
        : !draft.reviewer.displayName.trim()
          ? "reviewer.displayName"
          : !draft.reviewer.expertiseStatement.trim()
            ? "reviewer.expertiseStatement"
            : !validIsoInstant(draft.session.observedAt)
              ? "session.observedAt"
              : !draft.session.methodology.trim()
                ? "session.methodology"
                : "session.traditionScope";
      return {
        message: "填写任何观察或归属字段后，必须补全观察者 ID、显示名、专业说明、ISO 时间、方法与传统范围。",
        fieldKey
      };
    }
    for (const item of draft.observations) {
      if (item.relatedCitationIds.length > MAX_RELATED_CITATIONS) {
        return {
          message: `citation ${item.order} 的关联引用超过 16 条。`,
          fieldKey: `observation.${item.citationId}.relatedCitationIds`
        };
      }
      if (item.observation === "unobserved") continue;
      if (!item.reason.trim()) return {
        message: `citation ${item.order} 已选择观察状态，但尚未填写理由。`,
        fieldKey: `observation.${item.citationId}.reason`
      };
      if (
        item.observation !== "insufficient_bound_context"
        && !item.applicabilityConditions.trim()
      ) return {
        message: `citation ${item.order} 必须同时填写成立条件与反例。`,
        fieldKey: `observation.${item.citationId}.applicabilityConditions`
      };
      if (
        item.observation !== "insufficient_bound_context"
        && !item.counterexamples.trim()
      ) return {
        message: `citation ${item.order} 必须同时填写成立条件与反例。`,
        fieldKey: `observation.${item.citationId}.counterexamples`
      };
      try {
        parseAdditionalSourceUrls(item.additionalSourceUrlsText);
      } catch (cause) {
        return {
          message: cause instanceof Error ? `citation ${item.order}：${cause.message}` : "补充来源 URL 无效。",
          fieldKey: `observation.${item.citationId}.additionalSourceUrls`
        };
      }
    }
    return null;
  };

  const prepareCurrentFile = async () => {
    if (!draft || stale || bindingState !== "current" || ioState === "validating") return;
    const localError = validateDraft();
    if (localError) {
      setErrorMessage(localError.message);
      setFieldErrorKey(localError.fieldKey);
      const relatedMatch = localError.fieldKey?.match(/^observation\.([^.]+)\.(?:relatedCitationIds|additionalSourceUrls)$/u);
      if (relatedMatch?.[1]) {
        setOpenRelatedCitationIds((current) => new Set(current).add(relatedMatch[1]!));
      }
      requestAnimationFrame(() => {
        const firstInvalid = localError.fieldKey
          ? formRef.current?.querySelector<HTMLElement>(`[data-field-key="${localError.fieldKey}"]`)
          : formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
        firstInvalid?.focus();
      });
      return;
    }
    let built: ReturnType<typeof buildObservationFile>;
    try {
      built = buildObservationFile(draft);
    } catch {
      setErrorMessage("观察草稿包含无效或超限字段；没有准备文件。");
      return;
    }
    if (new TextEncoder().encode(built.text).byteLength > MAX_OBSERVATION_FILE_BYTES) {
      setFieldErrorKey(null);
      setErrorMessage("观察文件超过 512 KiB 上限；请缩短理由、条件、反例、总注或补充 URL 后再试。没有启动上下文重读。");
      return;
    }
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setBindingState("checking");
    setIoState("validating");
    setErrorMessage(null);
    setFieldErrorKey(null);
    setPreparedDelivery(null);
    setRecordReceipt(null);
    try {
      const rawPreflight = await preflightObservation(
        seed.locator,
        seed.binding.contextPayloadSha256,
        built.text
      );
      if (operationTokenRef.current !== token || stalePropRef.current) return;
      const expectedRecordSha256 = await sha256Hex({
        domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE.recordDigestDomain,
        payload: built.envelope
      });
      if (operationTokenRef.current !== token || stalePropRef.current) return;
      const receipt = safePreflightReceipt(
        rawPreflight,
        seed,
        draft,
        built.counts,
        attributionState(draft).complete,
        expectedRecordSha256
      );
      if (!receipt) throw new Error("unsafe preflight projection");
      setBindingState("current");
      setRecordReceipt(receipt);
      setPreparedDelivery({
        blob: new Blob([built.text], { type: "application/json;charset=utf-8" }),
        filename: seed.fileName,
        title: "字段来源适用性观察文件",
        description: "含自述观察者信息、方法、理由、条件、反例及可能的补充 URL，也含 Case/Revision 与命盘派生摘要绑定；属于敏感本机文件。预检只证明结构与两个读取时点的当前上下文闭合，不证明身份、真实性、术数真值或发布授权。",
        sharePolicy: "blocked_sensitive"
      });
      setIoState("export_prepared");
    } catch {
      if (operationTokenRef.current !== token) return;
      if (stalePropRef.current) {
        setBindingState("stale");
        setIoState("idle");
        return;
      }
      setBindingState("current");
      setIoState("idle");
      setErrorMessage("新的两遍上下文读取或 observation 严格预检没有闭合；草稿仍仅留在内存，未准备文件。若上下文已变化，请丢弃后重新读取。");
    }
  };

  const prepareStaleRecovery = () => {
    if (!draft || bindingState !== "stale" || !dirty) return;
    let text: string;
    try {
      text = buildStaleRecoveryFile(draft);
    } catch {
      setErrorMessage("旧上下文恢复草稿包含无法序列化的字段；没有准备恢复文件。");
      return;
    }
    setPreparedDelivery({
      blob: new Blob([text], { type: "application/json;charset=utf-8" }),
      filename: "hakimi-bazi-citation-applicability-observation-v01-stale-recovery.json",
      title: "旧上下文观察恢复草稿",
      description: "这是失效绑定下的未预检恢复草稿，可能不完整，也不能作为当前上下文观察采用。它含自述自由文本和派生敏感绑定，仅用于本机防丢失恢复。",
      sharePolicy: "blocked_sensitive"
    });
    setIoState("export_prepared");
  };

  const discardDraft = () => {
    if (dirty && !discardArmed) {
      setDiscardArmed(true);
      return;
    }
    onDiscard();
  };

  if (!draft) {
    return (
      <section className="bazi-applicability-editor" role="region" aria-label="字段来源适用性观察编辑器">
        <div className="bazi-applicability-editor__error" role="alert">
          <TriangleAlert aria-hidden="true" />
          <p>已验证模板没有形成可编辑的固定 citation 顺序；编辑器失败关闭。</p>
        </div>
      </section>
    );
  }

  const status = effectiveStale
    ? { tone: "cinnabar" as const, label: "旧上下文草稿已冻结" }
    : ioState === "validating"
      ? { tone: "info" as const, label: "正在重新读取并预检" }
      : ioState === "export_prepared"
        ? { tone: "warning" as const, label: "文件待本机交付确认" }
        : dirty
          ? { tone: "warning" as const, label: "未保存的内存草稿" }
          : { tone: "neutral" as const, label: "空白内存草稿" };

  return (
    <section
      ref={editorRef}
      className="bazi-applicability-editor"
      role="region"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-binding-state={effectiveStale ? "stale" : bindingState}
      data-content-state={dirty ? "dirty" : "clean"}
      data-io-state={ioState}
      data-storage-mutation-performed="false"
      data-network-transmission-performed="false"
      data-identity-verified="false"
      data-human-review-authenticity-verified="false"
      data-formal-activation-allowed="false"
      data-automatic-promotion-allowed="false"
    >
      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery}
          exportPort={webReportExportPort}
          onClose={() => setPreparedDelivery(null)}
        />
      ) : null}

      <header className="bazi-applicability-editor__header">
        <div>
          <p className="eyebrow">Context-bound human observation · in-memory only</p>
          <h3 id={titleId}>本机字段来源适用性观察编辑器</h3>
          <p>自由文本由本叶组件收集；显式准备时只在本机严格预检链中短暂处理，不进入父组件显示投影、IndexedDB、localStorage、Case、Revision、规则包或来源台账。</p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </header>

      <div className="bazi-applicability-editor__privacy" role="note">
        <ShieldCheck aria-hidden="true" />
        <p>本应用代码不主动持久化或联网传输这些字段；浏览器、操作系统、输入法或扩展仍可能在应用控制之外处理输入。无自动保存，关闭页面、崩溃或确认丢弃会失去未交付草稿；观察者身份始终只是自述且未核验。任何 URL 与身份材料引用都不会被本应用打开、预览或请求。</p>
      </div>

      {navigationBlocked ? (
        <div className="bazi-applicability-editor__stale" role="alert">
          <FileWarning aria-hidden="true" />
          <div><strong>已阻止站内离开</strong><p>内存草稿仍有未交付修改。请先准备本机文件或恢复草稿，再明确丢弃草稿后导航。</p></div>
        </div>
      ) : null}

      {effectiveStale ? (
        <div className="bazi-applicability-editor__stale" role="alert">
          <FileWarning aria-hidden="true" />
          <div><strong>旧草稿已冻结</strong><p>{errorMessage}</p></div>
        </div>
      ) : errorMessage ? (
        <div id={errorId} className="bazi-applicability-editor__error" role="alert">
          <TriangleAlert aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <form
        ref={formRef}
        className="bazi-applicability-editor__form"
        autoComplete="off"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void prepareCurrentFile();
        }}
      >
        <fieldset disabled={frozen}>
          <legend>观察者自述归属</legend>
          <p className="bazi-applicability-editor__hint">只记录自述，不构成现实身份核验、专家资格确认或数字签名。</p>
          <div className="bazi-applicability-editor__grid">
            <label>
              <span>观察者 ID{observedCount ? "（必填）" : ""}</span>
              <input
                data-field-key="reviewer.reviewerId"
                value={draft.reviewer.reviewerId}
                maxLength={200}
                required={observedCount > 0}
                aria-invalid={(observedCount > 0 && !draft.reviewer.reviewerId.trim()) || fieldErrorKey === "reviewer.reviewerId"}
                aria-describedby={fieldErrorKey === "reviewer.reviewerId" ? errorId : undefined}
                onChange={(event) => updateReviewer("reviewerId", event.currentTarget.value)}
              />
            </label>
            <label>
              <span>显示名{observedCount ? "（必填）" : ""}</span>
              <input
                data-field-key="reviewer.displayName"
                value={draft.reviewer.displayName}
                maxLength={200}
                required={observedCount > 0}
                aria-invalid={(observedCount > 0 && !draft.reviewer.displayName.trim()) || fieldErrorKey === "reviewer.displayName"}
                aria-describedby={fieldErrorKey === "reviewer.displayName" ? errorId : undefined}
                onChange={(event) => updateReviewer("displayName", event.currentTarget.value)}
              />
            </label>
            <label>
              <span>机构 / 师承（可选）</span>
              <input
                value={draft.reviewer.affiliation}
                maxLength={500}
                onChange={(event) => updateReviewer("affiliation", event.currentTarget.value)}
              />
            </label>
            <label>
              <span>身份材料引用（可选纯文本）</span>
              <input
                value={draft.reviewer.identityEvidenceReference}
                maxLength={1000}
                onChange={(event) => updateReviewer("identityEvidenceReference", event.currentTarget.value)}
              />
            </label>
            <label className="bazi-applicability-editor__wide">
              <span>专业说明{observedCount ? "（必填）" : ""}</span>
              <textarea
                data-field-key="reviewer.expertiseStatement"
                value={draft.reviewer.expertiseStatement}
                maxLength={1000}
                rows={3}
                required={observedCount > 0}
                aria-invalid={(observedCount > 0 && !draft.reviewer.expertiseStatement.trim()) || fieldErrorKey === "reviewer.expertiseStatement"}
                aria-describedby={fieldErrorKey === "reviewer.expertiseStatement" ? errorId : undefined}
                onChange={(event) => updateReviewer("expertiseStatement", event.currentTarget.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset disabled={frozen}>
          <legend>观察会话</legend>
          <div className="bazi-applicability-editor__grid">
            <label>
              <span>观察时间（ISO instant）{observedCount ? "（必填）" : ""}</span>
              <input
                data-field-key="session.observedAt"
                value={draft.session.observedAt}
                maxLength={100}
                required={observedCount > 0}
                aria-invalid={(observedCount > 0 && !validIsoInstant(draft.session.observedAt)) || fieldErrorKey === "session.observedAt"}
                aria-describedby={fieldErrorKey === "session.observedAt" ? errorId : undefined}
                placeholder="2026-08-24T12:34:56.000Z"
                onChange={(event) => updateSession("observedAt", event.currentTarget.value)}
              />
            </label>
            <button
              type="button"
              className="secondary-action bazi-applicability-editor__time-button"
              onClick={() => updateSession("observedAt", new Date().toISOString())}
            >
              <Clock3 aria-hidden="true" />
              使用当前本机时间
            </button>
            <label>
              <span>传统 / 流派范围{observedCount ? "（必填）" : ""}</span>
              <input
                data-field-key="session.traditionScope"
                value={draft.session.traditionScope}
                maxLength={1000}
                required={observedCount > 0}
                aria-invalid={(observedCount > 0 && !draft.session.traditionScope.trim()) || fieldErrorKey === "session.traditionScope"}
                aria-describedby={fieldErrorKey === "session.traditionScope" ? errorId : undefined}
                onChange={(event) => updateSession("traditionScope", event.currentTarget.value)}
              />
            </label>
            <label className="bazi-applicability-editor__wide">
              <span>观察方法{observedCount ? "（必填）" : ""}</span>
              <textarea
                data-field-key="session.methodology"
                value={draft.session.methodology}
                maxLength={2000}
                rows={3}
                required={observedCount > 0}
                aria-invalid={(observedCount > 0 && !draft.session.methodology.trim()) || fieldErrorKey === "session.methodology"}
                aria-describedby={fieldErrorKey === "session.methodology" ? errorId : undefined}
                onChange={(event) => updateSession("methodology", event.currentTarget.value)}
              />
            </label>
            <label className="bazi-applicability-editor__wide">
              <span>会话总注（可选）</span>
              <textarea
                value={draft.session.generalNotes}
                maxLength={4000}
                rows={3}
                onChange={(event) => updateSession("generalNotes", event.currentTarget.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="bazi-applicability-editor__citations" disabled={frozen}>
          <legend>逐条 citation 观察</legend>
          <div className="bazi-applicability-editor__counts" aria-label="观察草稿计数">
            <span>全部 <strong>{counts.total}</strong></span>
            <span>已观察 <strong>{observedCount}</strong></span>
            <span>未观察 <strong>{counts.unobserved}</strong></span>
          </div>
          {draft.observations.slice(0, visibleCitationLimit).map((item, index) => {
            const citation = seed.citations[index];
            const observed = item.observation !== "unobserved";
            const requiresConditions = observed && item.observation !== "insufficient_bound_context";
            const citationHeadingId = `${citationHeadingPrefix}-citation-${item.citationId}`;
            return (
              <section
                key={item.citationId}
                className="bazi-applicability-editor__citation"
                aria-labelledby={citationHeadingId}
              >
                <header>
                  <div>
                    <p className="eyebrow">Citation {item.order}</p>
                    <h4 id={citationHeadingId}>{citation?.title || "未命名 citation"}</h4>
                    <p>{[citation?.author, citation?.edition].filter(Boolean).join(" · ") || "未提供作者与版本标签"}</p>
                  </div>
                  <code>{item.citationId.slice(0, 8)}</code>
                </header>
                <label>
                  <span>当前冻结上下文中的观察状态</span>
                  <select
                    ref={(element) => {
                      if (element) observationSelectRefs.current.set(item.citationId, element);
                      else observationSelectRefs.current.delete(item.citationId);
                    }}
                    value={item.observation}
                    onChange={(event) => changeObservationStatus(
                      item,
                      event.currentTarget.value as BaziCitationApplicabilityObservationStatus
                    )}
                  >
                    {observationOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                {pendingResetCitationId === item.citationId ? (
                  <div className="bazi-applicability-editor__reset-confirm" role="alert">
                    <p>改回“尚未观察”必须清空这条 citation 的理由、条件、反例、关联引用与 URL。</p>
                    <div>
                      <button type="button" className="danger-action" onClick={() => confirmResetObservation(item.citationId)}>确认清空</button>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => {
                          setPendingResetCitationId(null);
                          queueMicrotask(() => observationSelectRefs.current.get(item.citationId)?.focus());
                        }}
                      >取消</button>
                    </div>
                  </div>
                ) : null}

                {observed ? (
                  <div className="bazi-applicability-editor__citation-fields">
                    <label>
                      <span>理由（必填）</span>
                      <textarea
                        data-field-key={`observation.${item.citationId}.reason`}
                        value={item.reason}
                        maxLength={4000}
                        rows={3}
                        required
                        aria-invalid={!item.reason.trim() || fieldErrorKey === `observation.${item.citationId}.reason`}
                        aria-describedby={fieldErrorKey === `observation.${item.citationId}.reason` ? errorId : undefined}
                        onChange={(event) => updateObservation(item.citationId, { reason: event.currentTarget.value })}
                      />
                    </label>
                    <label>
                      <span>成立条件{requiresConditions ? "（必填）" : "（可选）"}</span>
                      <textarea
                        data-field-key={`observation.${item.citationId}.applicabilityConditions`}
                        value={item.applicabilityConditions}
                        maxLength={4000}
                        rows={3}
                        required={requiresConditions}
                        aria-invalid={(requiresConditions && !item.applicabilityConditions.trim()) || fieldErrorKey === `observation.${item.citationId}.applicabilityConditions`}
                        aria-describedby={fieldErrorKey === `observation.${item.citationId}.applicabilityConditions` ? errorId : undefined}
                        onChange={(event) => updateObservation(item.citationId, {
                          applicabilityConditions: event.currentTarget.value
                        })}
                      />
                    </label>
                    <label>
                      <span>反例 / 失效情形{requiresConditions ? "（必填）" : "（可选）"}</span>
                      <textarea
                        data-field-key={`observation.${item.citationId}.counterexamples`}
                        value={item.counterexamples}
                        maxLength={4000}
                        rows={3}
                        required={requiresConditions}
                        aria-invalid={(requiresConditions && !item.counterexamples.trim()) || fieldErrorKey === `observation.${item.citationId}.counterexamples`}
                        aria-describedby={fieldErrorKey === `observation.${item.citationId}.counterexamples` ? errorId : undefined}
                        onChange={(event) => updateObservation(item.citationId, {
                          counterexamples: event.currentTarget.value
                        })}
                      />
                    </label>
                    <details
                      onToggle={(event) => {
                        const open = event.currentTarget.open;
                        setOpenRelatedCitationIds((current) => {
                          const next = new Set(current);
                          if (open) next.add(item.citationId);
                          else next.delete(item.citationId);
                          return next;
                        });
                      }}
                    >
                      <summary>可选关联引用与补充来源</summary>
                      {openRelatedCitationIds.has(item.citationId) ? <><label>
                        <span>关联当前集合中的其他 citation（最多 16 条）</span>
                        <select
                          data-field-key={`observation.${item.citationId}.relatedCitationIds`}
                          multiple
                          size={Math.min(5, Math.max(2, seed.citations.length - 1))}
                          value={item.relatedCitationIds}
                          aria-invalid={fieldErrorKey === `observation.${item.citationId}.relatedCitationIds`}
                          aria-describedby={fieldErrorKey === `observation.${item.citationId}.relatedCitationIds` ? errorId : undefined}
                          onChange={(event) => {
                            const selected = Array.from(
                              event.currentTarget.selectedOptions,
                              (option) => option.value
                            );
                            if (selected.length > MAX_RELATED_CITATIONS) {
                              setFieldErrorKey(`observation.${item.citationId}.relatedCitationIds`);
                              setErrorMessage("每条观察最多关联 16 个当前 citation。");
                              return;
                            }
                            updateObservation(item.citationId, { relatedCitationIds: selected });
                          }}
                        >
                          {seed.citations
                            .filter((candidate) => candidate.citationId !== item.citationId)
                            .map((candidate) => (
                              <option key={candidate.citationId} value={candidate.citationId}>
                                {candidate.title} · {candidate.citationId.slice(0, 8)}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        <span>补充来源 HTTPS URL（每行一条，最多 8 条）</span>
                        <textarea
                          data-field-key={`observation.${item.citationId}.additionalSourceUrls`}
                          value={item.additionalSourceUrlsText}
                          rows={3}
                          maxLength={16_000}
                          spellCheck={false}
                          aria-invalid={fieldErrorKey === `observation.${item.citationId}.additionalSourceUrls`}
                          aria-describedby={fieldErrorKey === `observation.${item.citationId}.additionalSourceUrls` ? errorId : undefined}
                          onChange={(event) => updateObservation(item.citationId, {
                            additionalSourceUrlsText: event.currentTarget.value
                          })}
                        />
                      </label></> : null}
                    </details>
                  </div>
                ) : null}
              </section>
            );
          })}
          {visibleCitationLimit < draft.observations.length ? (
            <button
              type="button"
              className="secondary-action bazi-applicability-editor__show-more"
              onClick={() => setVisibleCitationLimit((current) => Math.min(
                current + VISIBLE_CITATION_STEP,
                draft.observations.length
              ))}
            >
              再显示 {Math.min(VISIBLE_CITATION_STEP, draft.observations.length - visibleCitationLimit)} 条 citation
            </button>
          ) : null}
        </fieldset>

        {recordReceipt ? (
          <div className="bazi-applicability-editor__receipt" role="status">
            <FileCheck2 aria-hidden="true" />
            <div>
              <strong>{recordReceipt.allCitationsObserved ? "全部 citation 已通过结构预检" : "部分观察已通过结构预检"}</strong>
              <p>{recordReceipt.observedCount} / {counts.total} 条已填写；记录摘要 <code>{shortDigest(recordReceipt.recordSha256)}</code>。摘要不是签名或真实性证明。</p>
            </div>
          </div>
        ) : null}

        <div className="bazi-applicability-editor__actions">
          {effectiveStale && dirty ? (
            <button type="button" className="secondary-action" onClick={prepareStaleRecovery}>
              <FileWarning aria-hidden="true" />
              准备旧上下文恢复草稿
            </button>
          ) : (
            <button
              type="submit"
              className="primary-action"
              disabled={frozen}
              aria-busy={ioState === "validating"}
            >
              {ioState === "validating"
                ? <LoaderCircle className="spin" aria-hidden="true" />
                : <FileCheck2 aria-hidden="true" />}
              {ioState === "validating" ? "正在重新读取并预检" : "严格预检并准备本机文件"}
            </button>
          )}
          <button type="button" className={discardArmed ? "danger-action" : "secondary-action"} onClick={discardDraft}>
            <Trash2 aria-hidden="true" />
            {discardArmed ? "再次点击确认丢弃" : "丢弃内存草稿"}
          </button>
        </div>
      </form>

      <div className="bazi-applicability-editor__boundary" role="note">
        <ShieldCheck aria-hidden="true" />
        <p>正常文件只有在显式点击后，经新的两遍上下文读取、固定 citation 覆盖与 0.1 严格合同预检才进入交付对话框。storage write、mutation epoch bypass、身份核验、自动晋级、正式激活、专家真值、科学有效性和公开发布授权始终为 false。</p>
      </div>
    </section>
  );
}
