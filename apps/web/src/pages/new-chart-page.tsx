import { ArrowLeft, ArrowRight, Check, Clock3, History, Info, LoaderCircle, MapPin, RotateCcw, Save, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  birthInputSchema,
  caseTagsSchema,
  ruleProfileSchema,
  type BirthInput,
  type CalculatedChart,
  type CaseBundle,
  type DstDisambiguationPolicy,
  type RevisionRecord,
  type RuleProfile
} from "@hakimi/contracts";
import {
  calculateChart,
  calculateUnknownHourCandidates,
  digestRuleProfile,
  type UnknownHourCandidateResult
} from "@hakimi/bazi-core";
import { withDayBoundaryFromProfile, withTimeRules } from "@hakimi/rule-profiles";
import { caseRepository } from "@hakimi/storage";
import { normalizeBirthTime, resolveBirthCalendarInput } from "@hakimi/time-core";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import { AppLink, navigate, useAppLocation } from "../lib/router";
import { shortHash } from "../lib/format";
import { APP_VERSION } from "../lib/app-version";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import {
  loadActiveRulePackContext,
  type ActiveRulePackContext
} from "../lib/active-rule-pack";
import { useLocalAppSettings, type LocalAppSettings } from "../lib/local-app-settings";
import "./new-chart-page.css";

function scrollToWizardTop(): void {
  const reducedMotion = typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
}

const steps = ["案例信息", "出生资料", "时间与规则", "检查生成"] as const;
const MAX_ALIAS_CHARACTERS = 80;
const MAX_TAG_INPUT_CHARACTERS = 640;
const MAX_SOURCE_NOTE_CHARACTERS = 500;
const MAX_TIME_ZONE_CHARACTERS = 128;
const MAX_LOCATION_LABEL_CHARACTERS = 80;

type FormState = {
  alias: string;
  tags: string;
  sourceNote: string;
  calendarType: BirthInput["calendarType"];
  lunarLeapMonth: boolean;
  date: string;
  time: string;
  timePrecision: BirthInput["timePrecision"];
  sex: BirthInput["sex"];
  locationLabel: string;
  latitude: string;
  longitude: string;
  timeZone: string;
  dstPolicy: DstDisambiguationPolicy;
  dayBoundary: RuleProfile["calendar"]["dayBoundary"];
};

type RevisionSource = {
  caseRecord: CaseBundle["caseRecord"];
  revision: RevisionRecord;
};

type NewChartPageProps =
  | { caseId?: never; revisionId?: never }
  | { caseId: string; revisionId: string };

type ValidationField = "alias" | "tags" | "sourceNote" | "date" | "time" | "timeZone" | "locationLabel" | "latitude" | "longitude";
type WizardOperation = "generate" | "save";
type CommitCertainty = "call_unknown" | "returned_unreconciled";
type CommitReceiptIssue = {
  certainty: CommitCertainty;
  kind: "case" | "revision" | "candidate_set";
  href: string;
  linkLabel: string;
  reference: string;
  message: string;
};
type PendingCommitReceipt = Omit<CommitReceiptIssue, "certainty" | "message">;

const blankState: FormState = {
  alias: "",
  tags: "",
  sourceNote: "",
  calendarType: "gregorian",
  lunarLeapMonth: false,
  date: "",
  time: "",
  timePrecision: "exact_minute",
  sex: "unspecified",
  locationLabel: "",
  latitude: "",
  longitude: "",
  timeZone: "Asia/Shanghai",
  dstPolicy: "reject",
  dayBoundary: "zi_start_23"
};

const demoState: FormState = {
  alias: "演示案例 · 辰时研究",
  tags: "演示, P0",
  sourceNote: "用于验证本地工程计算、显式保存与精确重开闭环的固定演示值，不代表真实人物或专家结论。",
  calendarType: "gregorian",
  lunarLeapMonth: false,
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  sex: "male",
  locationLabel: "北京（演示值）",
  latitude: "39.9042",
  longitude: "116.4074",
  timeZone: "Asia/Shanghai",
  dstPolicy: "reject",
  dayBoundary: "zi_start_23"
};

function blankStateWithPreferences(settings: LocalAppSettings): FormState {
  return {
    ...blankState,
    calendarType: settings.defaultCalendarType,
    timeZone: settings.defaultTimeZone
  };
}

function dstPolicyForRevision(revision: RevisionRecord): DstDisambiguationPolicy {
  const storedPolicy = revision.timeCalibration.timeZoneResolution?.policy;
  if (storedPolicy) return storedPolicy;
  return revision.ruleProfile.calendar.dstAmbiguity === "require_user"
    ? "reject"
    : revision.ruleProfile.calendar.dstAmbiguity;
}

function formStateFromRevision(source: RevisionSource): FormState {
  const { caseRecord, revision } = source;
  if (revision.input.timePrecision !== "exact_minute" && revision.input.timePrecision !== "exact_second") {
    throw new Error("只能从精确到分钟或秒的正式历史修订派生新版。");
  }
  return {
    alias: caseRecord.alias,
    tags: caseRecord.tags.join(", "),
    sourceNote: revision.input.sourceNote,
    calendarType: revision.input.calendarType,
    lunarLeapMonth: revision.input.lunarLeapMonth,
    date: revision.input.date,
    time: revision.input.time ?? "",
    timePrecision: revision.input.timePrecision,
    sex: revision.input.sex,
    locationLabel: revision.input.location.label,
    latitude: revision.input.location.latitude === null ? "" : String(revision.input.location.latitude),
    longitude: revision.input.location.longitude === null ? "" : String(revision.input.location.longitude),
    timeZone: revision.timeCalibration.timeZone,
    dstPolicy: dstPolicyForRevision(revision),
    dayBoundary: revision.ruleProfile.calendar.dayBoundary
  };
}

function deriveRevisionRuleProfile(
  sourceProfile: RuleProfile,
  dayBoundary: RuleProfile["calendar"]["dayBoundary"],
  dstAmbiguity: RuleProfile["calendar"]["dstAmbiguity"]
): RuleProfile {
  const boundaryProfile = withDayBoundaryFromProfile(sourceProfile, dayBoundary);
  if (boundaryProfile.calendar.dstAmbiguity === dstAmbiguity) return boundaryProfile;
  const dstLabel = dstAmbiguity === "require_user" ? "DST 必须确认" : `DST ${dstAmbiguity}`;
  return ruleProfileSchema.parse({
    ...boundaryProfile,
    profileId: `${boundaryProfile.profileId}-revise-${dstAmbiguity === "require_user" ? "dst-confirm" : `dst-${dstAmbiguity}`}`,
    status: "experimental",
    label: `${boundaryProfile.label} · ${dstLabel}`,
    notice: `从 ${sourceProfile.profileId}@${sourceProfile.profileVersion} 的历史修订显式派生；只改变表单中明确选择的时间规则，不覆盖原修订。`,
    calendar: {
      ...boundaryProfile.calendar,
      dstAmbiguity
    }
  });
}

function resolveRuleProfileForFormSnapshot(
  state: Pick<FormState, "dayBoundary" | "dstPolicy">,
  revisionSource: RevisionSource | null,
  rulePackContext: ActiveRulePackContext | null,
  timeZoneResolutionIsUnique: boolean
): RuleProfile {
  const dstAmbiguity = state.dstPolicy === "reject"
    ? "require_user"
    : revisionSource || !timeZoneResolutionIsUnique
      ? state.dstPolicy
      : "require_user";
  if (revisionSource) {
    return deriveRevisionRuleProfile(revisionSource.revision.ruleProfile, state.dayBoundary, dstAmbiguity);
  }
  if (rulePackContext?.source === "installed") return rulePackContext.profile;
  return withTimeRules({ dayBoundary: state.dayBoundary, dstAmbiguity });
}

function dayBoundaryLabel(dayBoundary: FormState["dayBoundary"]): string {
  if (dayBoundary === "zi_start_23") return "23:00 子初";
  if (dayBoundary === "midnight") return "00:00 午夜";
  return "早晚子时分流";
}

function parseCoordinate(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function parseTags(value: string): string[] {
  return value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
}

function duplicateIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function sameRevisionBinding(left: RevisionRecord, right: RevisionRecord): boolean {
  return left.id === right.id
    && left.caseId === right.caseId
    && left.revisionNumber === right.revisionNumber
    && left.manifest.resultHash === right.manifest.resultHash
    && left.manifest.ruleProfileDigest === right.manifest.ruleProfileDigest
    && left.ruleProfile.profileId === right.ruleProfile.profileId
    && left.ruleProfile.profileVersion === right.ruleProfile.profileVersion;
}

const NEW_CHART_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy",
  "data-target-schema": "13",
  "data-schema-version": "13",
  "data-db-schema-version": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-evidence-authority": "engineering-only",
  "data-formal-validation-complete": "false",
  "data-scientific-validation-complete": "false",
  "data-mutation-mode": "epoch-governed-user-initiated-writes",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-public-release-authorized": "false",
  "data-expert-truth-claimed": "false",
} as const;

const WIZARD_RUNTIME_PAYLOAD_LIMITS = {
  arrayItems: 256,
  depth: 12,
  // Resolver-relative CandidateSets contain 13 full chart snapshots. Measured
  // legitimate payloads use 14,605 nodes normally, 14,693 with a DST overlap,
  // and 14,909 with an exact rule-pack binding; keep explicit bounded headroom.
  nodes: 20_000,
  objectKeys: 256,
  stringLength: 4_096,
} as const;

const WIZARD_UNSAFE_RUNTIME_TEXT_PATTERN =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function assertBoundedWizardRuntimePayload(value: unknown, label: string): void {
  let visitedNodes = 0;
  const activeObjects = new Set<object>();

  const visit = (entry: unknown, depth: number): void => {
    visitedNodes += 1;
    if (visitedNodes > WIZARD_RUNTIME_PAYLOAD_LIMITS.nodes) {
      throw new Error(`${label} 的运行时节点数量超出页面安全上限。`);
    }
    if (depth > WIZARD_RUNTIME_PAYLOAD_LIMITS.depth) {
      throw new Error(`${label} 的运行时结构深度超出页面安全上限。`);
    }
    if (typeof entry === "string") {
      if (
        entry.length > WIZARD_RUNTIME_PAYLOAD_LIMITS.stringLength ||
        WIZARD_UNSAFE_RUNTIME_TEXT_PATTERN.test(entry)
      ) {
        throw new Error(`${label} 包含过长文本或不安全控制字符。`);
      }
      return;
    }
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) {
        throw new Error(`${label} 包含非有限数值。`);
      }
      return;
    }
    if (entry === null || entry === undefined || typeof entry === "boolean") {
      return;
    }
    if (typeof entry !== "object") {
      throw new Error(`${label} 包含无法展示的运行时值。`);
    }
    if (activeObjects.has(entry)) {
      throw new Error(`${label} 包含循环引用，已拒绝展示。`);
    }

    activeObjects.add(entry);
    if (Array.isArray(entry)) {
      if (entry.length > WIZARD_RUNTIME_PAYLOAD_LIMITS.arrayItems) {
        throw new Error(`${label} 的列表项目数量超出页面安全上限。`);
      }
      entry.forEach((item) => visit(item, depth + 1));
      activeObjects.delete(entry);
      return;
    }

    const keys = Object.keys(entry);
    if (keys.length > WIZARD_RUNTIME_PAYLOAD_LIMITS.objectKeys) {
      throw new Error(`${label} 的字段数量超出页面安全上限。`);
    }
    keys.forEach((key) => {
      if (
        key.length > WIZARD_RUNTIME_PAYLOAD_LIMITS.stringLength ||
        WIZARD_UNSAFE_RUNTIME_TEXT_PATTERN.test(key)
      ) {
        throw new Error(`${label} 包含过长字段名或不安全控制字符。`);
      }
      visit((entry as Record<string, unknown>)[key], depth + 1);
    });
    activeObjects.delete(entry);
  };

  visit(value, 0);
}

function assertCalculatedChartIntegrity(
  ...args: Parameters<typeof assertCalculatedChartIntegrityUnchecked>
): ReturnType<typeof assertCalculatedChartIntegrityUnchecked> {
  assertBoundedWizardRuntimePayload(args[0], "排盘结果");
  return assertCalculatedChartIntegrityUnchecked(...args);
}

function assertCalculatedChartIntegrityUnchecked(chart: CalculatedChart, expectedRuleDigest: string): void {
  if (!/^[a-f0-9]{64}$/.test(chart.manifest.resultHash)) {
    throw new Error("计算结果没有有效的 SHA-256 结果摘要，已停止展示。");
  }
  if (chart.manifest.ruleProfileDigest !== expectedRuleDigest) {
    throw new Error("计算结果的规则摘要与本次实际规则不一致，已停止展示。");
  }
}

function assertCandidateResultIntegrity(
  ...args: Parameters<typeof assertCandidateResultIntegrityUnchecked>
): ReturnType<typeof assertCandidateResultIntegrityUnchecked> {
  assertBoundedWizardRuntimePayload(args[0], "候选集结果");
  return assertCandidateResultIntegrityUnchecked(...args);
}

function assertCandidateResultIntegrityUnchecked(result: UnknownHourCandidateResult, expectedRuleDigest: string): void {
  if (!/^[a-f0-9]{64}$/.test(result.resultHash)) {
    throw new Error("候选组没有有效的 SHA-256 结果摘要，已停止展示。");
  }
  if (result.ruleProfileDigest !== expectedRuleDigest) {
    throw new Error("候选组的规则摘要与本次实际规则不一致，已停止展示。");
  }
  if (result.candidates.length !== 13) {
    throw new Error(`未知时辰候选应包含 13 个代表探针，实际收到 ${result.candidates.length} 个。`);
  }
  const duplicateCandidateIds = duplicateIds(result.candidates.map((candidate) => candidate.candidateId));
  if (duplicateCandidateIds.length) {
    throw new Error(`候选组包含重复探针：${duplicateCandidateIds.join("、")}。`);
  }
  for (const candidate of result.candidates) {
    const duplicateVariantIds = duplicateIds(candidate.variants.map((variant) => variant.variantId));
    if (duplicateVariantIds.length) {
      throw new Error(`${candidate.branch}时探针包含重复 DST 变体。`);
    }
  }
}

function buildBirthInput(state: FormState): BirthInput {
  const latitude = parseCoordinate(state.latitude);
  const longitude = parseCoordinate(state.longitude);
  const hasExactTime = state.timePrecision === "exact_minute" || state.timePrecision === "exact_second";
  return birthInputSchema.parse({
    schemaVersion: "1.0.0",
    calendarType: state.calendarType,
    date: state.date,
    time: hasExactTime ? state.time || null : null,
    timePrecision: state.timePrecision,
    timeZone: state.timeZone.trim(),
    sex: state.sex,
    lunarLeapMonth: state.calendarType === "lunar" && state.lunarLeapMonth,
    location: {
      label: state.locationLabel,
      latitude,
      longitude,
      precision: latitude !== null && longitude !== null ? "coordinates" : state.locationLabel ? "city" : "unknown"
    },
    sourceNote: state.sourceNote
  });
}

function buildBirthPreviewInput(state: FormState, mode: "calendar" | "time"): BirthInput {
  const calendarOnly = mode === "calendar";
  const hasExactTime = state.timePrecision === "exact_minute" || state.timePrecision === "exact_second";
  return birthInputSchema.parse({
    schemaVersion: "1.0.0",
    calendarType: state.calendarType,
    date: state.date,
    time: calendarOnly ? null : hasExactTime ? state.time || null : null,
    timePrecision: calendarOnly ? "unknown_hour" : state.timePrecision,
    timeZone: calendarOnly ? "UTC" : state.timeZone.trim(),
    sex: "unspecified",
    lunarLeapMonth: state.calendarType === "lunar" && state.lunarLeapMonth,
    location: {
      label: "",
      latitude: null,
      longitude: null,
      precision: "unknown"
    },
    sourceNote: ""
  });
}

export function NewChartPage(props: NewChartPageProps = {}) {
  const location = useAppLocation();
  const revisionMode = Boolean(props.caseId && props.revisionId);
  const useDemo = !revisionMode && new URLSearchParams(location.search).get("demo") === "1";
  const { settings: localAppSettings, ready: localAppSettingsReady } = useLocalAppSettings();
  const [form, setForm] = useState<FormState>(() => (
    useDemo
      ? demoState
      : !revisionMode && localAppSettingsReady
        ? blankStateWithPreferences(localAppSettings)
        : blankState
  ));
  const [revisionSource, setRevisionSource] = useState<RevisionSource | null>(null);
  const [sourceLoading, setSourceLoading] = useState(revisionMode);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceRetryVersion, setSourceRetryVersion] = useState(0);
  const [rulePackContext, setRulePackContext] = useState<ActiveRulePackContext | null>(null);
  const [rulePackLoading, setRulePackLoading] = useState(!revisionMode);
  const [rulePackError, setRulePackError] = useState<string | null>(null);
  const [rulePackRetryVersion, setRulePackRetryVersion] = useState(0);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationField, setValidationField] = useState<ValidationField | null>(null);
  const [calculated, setCalculated] = useState<CalculatedChart | null>(null);
  const [candidateResult, setCandidateResult] = useState<UnknownHourCandidateResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commitReceiptIssue, setCommitReceiptIssue] = useState<CommitReceiptIssue | null>(null);
  const [writeCommitted, setWriteCommitted] = useState(false);
  const formEditedRef = useRef(false);
  const ruleChoiceEditedRef = useRef(false);
  const operationInFlightRef = useRef<WizardOperation | null>(null);
  const writeCommittedRef = useRef(false);
  const localDefaultsSettledRef = useRef(useDemo || revisionMode || localAppSettingsReady);
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(step);
  const aliasInputRef = useRef<HTMLInputElement>(null);
  const tagsInputRef = useRef<HTMLInputElement>(null);
  const sourceNoteInputRef = useRef<HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const timeZoneInputRef = useRef<HTMLInputElement>(null);
  const locationLabelInputRef = useRef<HTMLInputElement>(null);
  const latitudeInputRef = useRef<HTMLInputElement>(null);
  const longitudeInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!localAppSettingsReady || localDefaultsSettledRef.current) return;
    localDefaultsSettledRef.current = true;
    if (revisionMode || useDemo || formEditedRef.current) return;
    setForm((current) => ({
      ...current,
      calendarType: localAppSettings.defaultCalendarType,
      timeZone: localAppSettings.defaultTimeZone
    }));
  }, [
    localAppSettings.defaultCalendarType,
    localAppSettings.defaultTimeZone,
    localAppSettingsReady,
    revisionMode,
    useDemo
  ]);

  useEffect(() => {
    if (!revisionMode || !props.caseId || !props.revisionId) {
      setRevisionSource(null);
      setSourceLoading(false);
      setSourceError(null);
      return;
    }
    let active = true;
    setSourceLoading(true);
    setSourceError(null);
    setRevisionSource(null);
    Promise.all([
      caseRepository.getCase(props.caseId),
      caseRepository.getRevision(props.revisionId)
    ]).then(([bundle, revision]) => {
      if (!active) return;
      if (!bundle) throw new Error("案例不存在或已经从此浏览器永久删除。");
      if (!revision) throw new Error("指定的历史修订不存在。");
      if (bundle.caseRecord.id !== props.caseId || revision.id !== props.revisionId || revision.caseId !== props.caseId) {
        throw new Error("指定 Revision 不属于当前 Case，已拒绝跨案例派生。");
      }
      const duplicateRevisionIds = duplicateIds(bundle.revisions.map((item) => item.id));
      if (duplicateRevisionIds.length) throw new Error("当前 Case 包含重复 Revision ID，已停止派生。");
      const bundledRevision = bundle.revisions.find((item) => item.id === revision.id);
      if (!bundledRevision || !sameRevisionBinding(bundledRevision, revision)) {
        throw new Error("Revision 索引与 Case Bundle 的不可变摘要不一致，已停止派生。");
      }
      if (bundle.caseRecord.deletedAt !== null) {
        throw new Error("此案例已在回收站。请先恢复案例，再派生新修订。");
      }
      const source = { caseRecord: bundle.caseRecord, revision };
      const nextForm = formStateFromRevision(source);
      setRevisionSource(source);
      setForm(nextForm);
      setStep(0);
      setCalculated(null);
      setCandidateResult(null);
      setError(null);
      setCommitReceiptIssue(null);
      writeCommittedRef.current = false;
      setWriteCommitted(false);
    }).catch((reason: unknown) => {
      if (active) setSourceError(safeVisibleErrorMessage(reason, "无法读取历史修订。"));
    }).finally(() => {
      if (active) setSourceLoading(false);
    });
    return () => { active = false; };
  }, [props.caseId, props.revisionId, revisionMode, sourceRetryVersion]);

  useEffect(() => {
    if (revisionMode) {
      setRulePackContext(null);
      setRulePackLoading(false);
      setRulePackError(null);
      return;
    }
    let active = true;
    setRulePackLoading(true);
    setRulePackError(null);
    void loadActiveRulePackContext(APP_VERSION)
      .then((context) => {
        if (!active) return;
        setRulePackContext(context);
        const lockedByInstalledPack = context.source === "installed";
        setForm((current) => {
          if (!lockedByInstalledPack && ruleChoiceEditedRef.current) return current;
          return {
            ...current,
            dayBoundary: context.profile.calendar.dayBoundary,
            dstPolicy: context.profile.calendar.dstAmbiguity === "require_user"
              ? "reject"
              : context.profile.calendar.dstAmbiguity
          };
        });
        if (lockedByInstalledPack) ruleChoiceEditedRef.current = false;
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setRulePackContext(null);
        setRulePackError(safeVisibleErrorMessage(reason, "无法解析活动规则包。"));
      })
      .finally(() => {
        if (active) setRulePackLoading(false);
      });
    return () => { active = false; };
  }, [revisionMode, rulePackRetryVersion]);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    stageHeadingRef.current?.focus();
  }, [step]);
  const { calendarPreview, timePreview } = useMemo(() => {
    let nextCalendarPreview = null;
    let nextTimePreview = null;
    try {
      nextCalendarPreview = resolveBirthCalendarInput(buildBirthPreviewInput(form, "calendar")).calendarResolution;
    } catch {}
    try {
      nextTimePreview = normalizeBirthTime(buildBirthPreviewInput(form, "time"), form.dstPolicy);
    } catch {}

    return {
      calendarPreview: nextCalendarPreview,
      timePreview: nextTimePreview
    };
  }, [form]);
  const activeRule = useMemo(() => resolveRuleProfileForFormSnapshot(
    form,
    revisionSource,
    rulePackContext,
    timePreview?.timeZoneResolution.kind === "unique"
  ), [form.dayBoundary, form.dstPolicy, revisionSource, rulePackContext, timePreview?.timeZoneResolution.kind]);

  const workflowModeLabel = revisionMode
    ? `派生 R${revisionSource?.revision.revisionNumber ?? "—"}`
    : useDemo
      ? "固定演示输入"
      : "新建本地案例";
  const timeInputLabel = form.timePrecision === "unknown_hour"
    ? "未知时辰候选"
    : form.timePrecision === "exact_second"
      ? "精确到秒"
      : "精确到分钟";
  const parsedTags = parseTags(form.tags);
  const commitCallUnknown = commitReceiptIssue?.certainty === "call_unknown";
  const writeStateLabel = commitReceiptIssue
    ? commitCallUnknown ? "写入调用未知 · 必须核对" : "写入已返回 · 回执待核对"
    : writeCommitted
      ? "写入已返回 · 正在打开记录"
    : saving
    ? "正在写入本机"
    : calculated || candidateResult
      ? "结果待明确保存"
      : "尚未写入案例库";
  const commitState = commitReceiptIssue ? "uncertain" : writeCommitted ? "committed" : saving || calculating ? "busy" : calculated || candidateResult ? "ready" : "idle";
  const commitStateTitle = commitReceiptIssue
    ? commitCallUnknown ? "仓储调用没有返回，禁止推断事务未发生" : "写入已返回，但返回回执未通过核对"
    : writeCommitted
      ? "写入调用已返回，正在打开精确记录"
    : saving
    ? "正在事务写入本机案例库"
    : calculating
      ? form.timePrecision === "unknown_hour" ? "正在生成候选探针" : "正在生成工程候选命盘"
      : calculated || candidateResult
        ? "生成完成，等待明确保存"
        : "尚未生成，本机案例库未写入";
  const commitStateDescription = commitReceiptIssue
    ? commitCallUnknown
      ? "无法证明本次写入没有发生；为避免重复 Case、Revision 或候选组，本页已经永久关闭再次保存，请按下方核对线索检查实际记录。"
      : "写入返回后页面未完成精确回执闭环；本页已经永久关闭再次保存，请通过下方返回引用核对实际记录。"
    : writeCommitted
      ? "本页提交门禁已永久关闭；即使路由切换延迟，也不会再次创建相同记录。"
    : saving
    ? "请保持本页打开；成功后会导航到刚创建的精确记录。"
    : calculating
      ? "计算与时间归一化正在内存中进行，不会留下半条数据库记录。"
      : calculated || candidateResult
        ? "当前结果只存在于本页内存；再次点击主按钮后才会创建本地记录。"
        : "先生成并检查工程预览，再决定是否保存。";

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    if (operationInFlightRef.current) return;
    formEditedRef.current = true;
    if (key === "dayBoundary" || key === "dstPolicy") ruleChoiceEditedRef.current = true;
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "date" || key === "time" || key === "timeZone" || key === "lunarLeapMonth") {
        next.dstPolicy = rulePackContext?.source === "installed" && rulePackContext.profile.calendar.dstAmbiguity !== "require_user"
          ? rulePackContext.profile.calendar.dstAmbiguity
          : "reject";
      }
      return next;
    });
    if (key !== "alias" && key !== "tags") {
      setCalculated(null);
      setCandidateResult(null);
    }
    setError(null);
    setValidationField(null);
  };

  const updateTimePrecision = (timePrecision: FormState["timePrecision"]) => {
    if (operationInFlightRef.current) return;
    if (revisionMode && timePrecision === "unknown_hour") {
      setError("正式案例修订不能切换为未知时辰候选；请从案例库单独新建候选组。");
      return;
    }
    formEditedRef.current = true;
    setForm((current) => {
      let time = current.time;

      if (timePrecision === "unknown_hour") {
        time = "";
      } else if (timePrecision === "exact_second" && /^\d{2}:\d{2}$/.test(time)) {
        time = `${time}:00`;
      } else if (timePrecision === "exact_minute" && /^\d{2}:\d{2}:\d{2}$/.test(time)) {
        time = time.endsWith(":00") ? time.slice(0, 5) : "";
      }

      return { ...current, timePrecision, time, dstPolicy: "reject" };
    });
    setCalculated(null);
    setCandidateResult(null);
    setError(null);
    setValidationField(null);
  };

  const updateCalendarType = (calendarType: FormState["calendarType"]) => {
    if (operationInFlightRef.current) return;
    formEditedRef.current = true;
    setForm((current) => ({
      ...current,
      calendarType,
      date: "",
      lunarLeapMonth: false,
      dstPolicy: "reject"
    }));
    setCalculated(null);
    setCandidateResult(null);
    setError(null);
    setValidationField(null);
  };

  const focusValidationField = (field: ValidationField) => {
    const target = {
      alias: aliasInputRef,
      tags: tagsInputRef,
      sourceNote: sourceNoteInputRef,
      date: dateInputRef,
      time: timeInputRef,
      timeZone: timeZoneInputRef,
      locationLabel: locationLabelInputRef,
      latitude: latitudeInputRef,
      longitude: longitudeInputRef
    }[field];
    target.current?.focus();
  };

  const describedBy = (helpId: string, field: ValidationField) => (
    validationField === field && error ? `${helpId} wizard-error` : helpId
  );

  const beginWizardOperation = (operation: WizardOperation): boolean => {
    if (operationInFlightRef.current || writeCommittedRef.current) return false;
    operationInFlightRef.current = operation;
    if (operation === "generate") setCalculating(true);
    else setSaving(true);
    return true;
  };

  const finishWizardOperation = (operation: WizardOperation): void => {
    if (operationInFlightRef.current !== operation) return;
    operationInFlightRef.current = null;
    if (operation === "generate") setCalculating(false);
    else setSaving(false);
  };

  const validateCurrentStep = (): boolean => {
    if (step === 0) {
      if (!form.alias.trim()) {
        setError("请先填写案例别名。建议使用匿名编号或研究别名，不要填写不必要的真实姓名。");
        setValidationField("alias");
        focusValidationField("alias");
        return false;
      }
      if (form.alias.trim().length > MAX_ALIAS_CHARACTERS) {
        setError(`案例别名最多 ${MAX_ALIAS_CHARACTERS} 个字符。`);
        setValidationField("alias");
        focusValidationField("alias");
        return false;
      }
      const tagsResult = caseTagsSchema.safeParse(parsedTags);
      if (!tagsResult.success) {
        setError(safeVisibleText(tagsResult.error.issues[0]?.message, "标签不符合保存规则。", 400));
        setValidationField("tags");
        focusValidationField("tags");
        return false;
      }
      if (form.sourceNote.length > MAX_SOURCE_NOTE_CHARACTERS) {
        setError(`资料来源说明最多 ${MAX_SOURCE_NOTE_CHARACTERS} 个字符。`);
        setValidationField("sourceNote");
        focusValidationField("sourceNote");
        return false;
      }
    }
    if (step === 1) {
      try {
        buildBirthInput(form);
      } catch (reason) {
        const issue = typeof reason === "object" && reason && "issues" in reason
          ? (reason as { issues?: Array<{ message?: string; path?: PropertyKey[] }> }).issues?.[0]
          : null;
        const path = issue?.path?.map(String) ?? [];
        const field = path[0] === "date"
          ? "date"
          : path[0] === "time"
            ? "time"
            : path[0] === "timeZone"
              ? "timeZone"
              : path[0] === "sourceNote"
                ? "sourceNote"
              : path[0] === "location" && path[1] === "label"
                ? "locationLabel"
              : path[0] === "location" && path[1] === "latitude"
                ? "latitude"
                : path[0] === "location" && path[1] === "longitude"
                  ? "longitude"
                  : issue?.message?.includes("时区")
                    ? "timeZone"
                    : issue?.message?.includes("时间")
                      ? "time"
                      : "date";
        setError(safeVisibleText(issue?.message, "出生资料不完整。", 400));
        setValidationField(field);
        focusValidationField(field);
        return false;
      }
    }
    if (step === 2) {
      if (!calendarPreview) {
        setError("当前历法日期尚未完成可复算解析，请返回出生资料检查日期与闰月标记。");
        setValidationField(null);
        stageHeadingRef.current?.focus();
        return false;
      }
      const hasExactTime = form.timePrecision === "exact_minute" || form.timePrecision === "exact_second";
      if (hasExactTime && (!timePreview || timePreview.normalizationStatus !== "instant_resolved")) {
        setError("当前民用时间尚未解析为唯一 UTC 瞬时点；请明确处理 DST 重叠或空档后再进入生成步骤。");
        setValidationField(null);
        stageHeadingRef.current?.focus();
        return false;
      }
    }
    setError(null);
    setValidationField(null);
    return true;
  };

  const nextStep = () => {
    if (operationInFlightRef.current || writeCommittedRef.current) return;
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
    scrollToWizardTop();
  };

  const previousStep = () => {
    if (operationInFlightRef.current || writeCommittedRef.current) return;
    setError(null);
    setValidationField(null);
    setStep((current) => Math.max(0, current - 1));
    scrollToWizardTop();
  };

  const revisitCompletedStep = (targetStep: number) => {
    if (!Number.isInteger(targetStep) || targetStep < 0 || targetStep >= step) return;
    if (operationInFlightRef.current || writeCommittedRef.current || commitReceiptIssue) return;
    setError(null);
    setValidationField(null);
    setStep(targetStep);
    scrollToWizardTop();
  };

  const generate = async (): Promise<void> => {
    if (commitReceiptIssue || writeCommittedRef.current) return;
    if (!revisionMode && rulePackLoading) {
      setError("活动规则包仍在核对，请等待核对完成后再生成。");
      return;
    }
    if (!beginWizardOperation("generate")) return;
    setError(null);
    try {
      const resolvedRulePackContext = revisionMode
        ? null
        : await loadActiveRulePackContext(APP_VERSION);
      if (!revisionMode) setRulePackContext(resolvedRulePackContext);
      const effectiveDstPolicy = resolvedRulePackContext?.source === "installed" &&
        resolvedRulePackContext.profile.calendar.dstAmbiguity !== "require_user"
        ? resolvedRulePackContext.profile.calendar.dstAmbiguity
        : form.dstPolicy;
      const calculationForm = resolvedRulePackContext?.source === "installed"
        ? {
            ...form,
            dayBoundary: resolvedRulePackContext.profile.calendar.dayBoundary,
            dstPolicy: effectiveDstPolicy
          }
        : form;
      const calculationRule = resolveRuleProfileForFormSnapshot(
        calculationForm,
        revisionSource,
        resolvedRulePackContext,
        timePreview?.timeZoneResolution.kind === "unique"
      );
      const calculationRuleDigest = await digestRuleProfile(calculationRule);
      if (resolvedRulePackContext?.source === "installed") {
        setForm(calculationForm);
      }
      const sourceRulePackBinding = revisionMode
        ? revisionSource?.revision.rulePackBinding
        : undefined;
      const revisionRulePackBinding = sourceRulePackBinding &&
        calculationRuleDigest === sourceRulePackBinding.profileDigest
        ? sourceRulePackBinding
        : undefined;
      const rulePackBinding = resolvedRulePackContext?.source === "installed"
        ? resolvedRulePackContext.binding
        : revisionRulePackBinding;
      const input = buildBirthInput(calculationForm);
      if (input.timePrecision === "unknown_hour") {
        if (revisionMode) throw new Error("正式案例修订不能生成未知时辰候选组。");
        const nextCandidateResult = await calculateUnknownHourCandidates(input, calculationRule, {
          rulePackBinding
        });
        assertCandidateResultIntegrity(nextCandidateResult, calculationRuleDigest);
        setCandidateResult(nextCandidateResult);
        setCalculated(null);
      } else {
        const nextCalculated = await calculateChart(input, calculationRule, {
          rulePackBinding,
          dstResolutionOverride: effectiveDstPolicy === "earlier" || effectiveDstPolicy === "later"
            ? effectiveDstPolicy
            : undefined
        });
        assertCalculatedChartIntegrity(nextCalculated, calculationRuleDigest);
        setCalculated(nextCalculated);
        setCandidateResult(null);
      }
    } catch (reason) {
      setError(safeVisibleErrorMessage(reason, "排盘计算失败。"));
    } finally {
      finishWizardOperation("generate");
    }
  };

  const save = async (): Promise<void> => {
    if (!calculated || commitReceiptIssue || writeCommittedRef.current) return;
    if (!beginWizardOperation("save")) return;
    setError(null);
    let commitAttempt: PendingCommitReceipt | null = null;
    let mutationInvoked = false;
    let committedReceipt: PendingCommitReceipt | null = null;
    try {
      if (revisionMode) {
        if (!props.caseId || !revisionSource) throw new Error("历史修订来源尚未完成校验。");
        const currentBundle = await caseRepository.getCase(props.caseId);
        if (!currentBundle) throw new Error("案例不存在或已经从此浏览器永久删除。");
        if (currentBundle.caseRecord.deletedAt !== null) {
          throw new Error("此案例已在回收站，未写入新修订。请先恢复案例。");
        }
        const currentSourceRevision = currentBundle.revisions.find((item) => item.id === revisionSource.revision.id);
        if (!currentSourceRevision || !sameRevisionBinding(currentSourceRevision, revisionSource.revision)) {
          throw new Error("历史 Revision 与当前 Case 的关联已失效，未写入新修订。");
        }
        commitAttempt = {
          kind: "revision",
          href: "/cases",
          linkLabel: "前往案例库核对",
          reference: `Case ${props.caseId} · expected resultHash ${calculated.manifest.resultHash}`
        };
        mutationInvoked = true;
        const bundle = await caseRepository.addRevision(props.caseId, calculated);
        writeCommittedRef.current = true;
        setWriteCommitted(true);
        committedReceipt = {
          kind: "revision",
          href: "/cases",
          linkLabel: "前往案例库核对",
          reference: `Case ${bundle.caseRecord.id} · latestRevisionId ${bundle.caseRecord.latestRevisionId}`
        };
        const revision = bundle.revisions.find((item) => item.id === bundle.caseRecord.latestRevisionId);
        if (!revision || revision.manifest.resultHash !== calculated.manifest.resultHash || revision.manifest.ruleProfileDigest !== calculated.manifest.ruleProfileDigest) {
          throw new Error("新修订写入调用已经返回，但返回 Bundle 无法证明 latestRevisionId 精确指向本次结果。");
        }
        navigate(`/cases/${encodeURIComponent(bundle.caseRecord.id)}/revisions/${encodeURIComponent(revision.id)}`);
        return;
      }
      commitAttempt = {
        kind: "case",
        href: "/cases",
        linkLabel: "前往案例库核对",
        reference: `Expected resultHash ${calculated.manifest.resultHash}`
      };
      mutationInvoked = true;
      const bundle = await caseRepository.createCase({
        alias: form.alias.trim(),
        tags: parsedTags,
        notes: "",
        calculated
      });
      writeCommittedRef.current = true;
      setWriteCommitted(true);
      committedReceipt = {
        kind: "case",
        href: "/cases",
        linkLabel: "前往案例库核对",
        reference: `Case ${bundle.caseRecord.id} · latestRevisionId ${bundle.caseRecord.latestRevisionId}`
      };
      const revision = bundle.revisions.find((item) => item.id === bundle.caseRecord.latestRevisionId);
      if (!revision || revision.manifest.resultHash !== calculated.manifest.resultHash || revision.manifest.ruleProfileDigest !== calculated.manifest.ruleProfileDigest) {
        throw new Error("案例写入调用已经返回，但返回 Bundle 无法证明最新修订精确对应本次结果。");
      }
      navigate(`/cases/${encodeURIComponent(bundle.caseRecord.id)}/revisions/${encodeURIComponent(revision.id)}`);
    } catch (reason) {
      const message = safeVisibleErrorMessage(reason, "保存案例失败。");
      if (mutationInvoked && commitAttempt) {
        const certainty: CommitCertainty = committedReceipt ? "returned_unreconciled" : "call_unknown";
        writeCommittedRef.current = true;
        setWriteCommitted(true);
        setCommitReceiptIssue({
          ...(committedReceipt ?? commitAttempt),
          certainty,
          message: certainty === "call_unknown"
            ? `${message} 仓储调用没有返回可核对结果，无法证明事务未发生；本页已停止再次保存，避免制造重复记录。`
            : `${message} 写入返回后未完成精确回执闭环；本页已停止再次保存，避免制造重复记录。`
        });
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      finishWizardOperation("save");
    }
  };

  const saveCandidateSet = async (): Promise<void> => {
    if (!candidateResult || commitReceiptIssue || writeCommittedRef.current) return;
    if (revisionMode) {
      setError("正式案例修订不能保存未知时辰候选组。");
      return;
    }
    if (!beginWizardOperation("save")) return;
    setError(null);
    const commitAttempt: PendingCommitReceipt = {
      kind: "candidate_set",
      href: "/cases",
      linkLabel: "前往案例库核对",
      reference: `Expected candidate resultHash ${candidateResult.resultHash}`
    };
    let mutationInvoked = false;
    let committedReceipt: PendingCommitReceipt | null = null;
    try {
      mutationInvoked = true;
      const record = await caseRepository.createCandidateSet({
        alias: form.alias.trim(),
        tags: parsedTags,
        notes: "",
        candidateSet: candidateResult
      });
      writeCommittedRef.current = true;
      setWriteCommitted(true);
      committedReceipt = {
        kind: "candidate_set",
        href: `/candidate-sets/${encodeURIComponent(record.id)}`,
        linkLabel: "打开返回的候选组",
        reference: `CandidateSet ${record.id}`
      };
      if (record.candidateSet.resultHash !== candidateResult.resultHash || record.candidateSet.ruleProfileDigest !== candidateResult.ruleProfileDigest) {
        throw new Error("候选组写入调用已经返回，但返回记录摘要与本次结果不一致。");
      }
      navigate(`/candidate-sets/${encodeURIComponent(record.id)}`);
    } catch (reason) {
      const message = safeVisibleErrorMessage(reason, "候选组保存失败。");
      if (mutationInvoked) {
        const certainty: CommitCertainty = committedReceipt ? "returned_unreconciled" : "call_unknown";
        writeCommittedRef.current = true;
        setWriteCommitted(true);
        setCommitReceiptIssue({
          ...(committedReceipt ?? commitAttempt),
          certainty,
          message: certainty === "call_unknown"
            ? `${message} 仓储调用没有返回可核对结果，无法证明事务未发生；本页已停止再次保存，避免制造重复候选组。`
            : `${message} 写入返回后未完成精确回执闭环；本页已停止再次保存，避免制造重复候选组。`
        });
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      finishWizardOperation("save");
    }
  };

  const resetDemo = () => {
    if (!useDemo || revisionMode || operationInFlightRef.current || writeCommittedRef.current || commitReceiptIssue) return;
    setForm(demoState);
    setStep(0);
    setCalculated(null);
    setCandidateResult(null);
    setError(null);
    setValidationField(null);
    setCommitReceiptIssue(null);
    formEditedRef.current = false;
    ruleChoiceEditedRef.current = false;
    window.setTimeout(() => aliasInputRef.current?.focus(), 0);
  };

  const retryRevisionSource = () => {
    setSourceLoading(true);
    setSourceError(null);
    setSourceRetryVersion((current) => current + 1);
  };

  const retryRulePack = () => {
    setRulePackLoading(true);
    setRulePackError(null);
    setRulePackRetryVersion((current) => current + 1);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (operationInFlightRef.current || writeCommittedRef.current || commitReceiptIssue) return;
    if (step < steps.length - 1) nextStep();
    else if (form.timePrecision === "unknown_hour") {
      if (candidateResult) void saveCandidateSet();
      else void generate();
    }
    else if (!calculated) void generate();
    else void save();
  };

  if (revisionMode && sourceLoading) {
    return (
      <div
        className="page page--wizard page--wizard-bootstrap"
        {...NEW_CHART_SAFETY_ATTRIBUTES}
      >
        <section className="wizard-bootstrap-gate" data-state="loading" role="status" aria-live="polite">
          <LoaderCircle className="spin" aria-hidden="true" />
          <div>
            <p className="eyebrow">Revision source preflight</p>
            <h1>正在核对历史修订来源</h1>
            <p>读取 Case、Revision 及其不可变关联；验证完成前不会显示派生表单或生成新修订。</p>
          </div>
        </section>
      </div>
    );
  }
  if (revisionMode && (sourceError || !revisionSource)) {
    return (
      <div
        className="page page--wizard page--wizard-bootstrap"
        {...NEW_CHART_SAFETY_ATTRIBUTES}
      >
        <section className="wizard-bootstrap-gate" data-state="error" role="alert">
          <History aria-hidden="true" />
          <div>
            <p className="eyebrow">Revision source unavailable</p>
            <h1>无法派生历史修订</h1>
            <p>{safeVisibleText(sourceError, "历史修订来源不可用。", 800)} 未读取到可信来源前，不会显示近似表单或创建新 Revision。</p>
            <div className="button-row">
              <button type="button" className="primary-action" onClick={retryRevisionSource}><RotateCcw aria-hidden="true" />重新核对来源</button>
              <AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink>
            </div>
          </div>
        </section>
      </div>
    );
  }
  if (!revisionMode && rulePackError) {
    return (
      <div
        className="page page--wizard page--wizard-bootstrap"
        {...NEW_CHART_SAFETY_ATTRIBUTES}
      >
        <section className="wizard-bootstrap-gate" data-state="error" role="alert">
          <ShieldCheck aria-hidden="true" />
          <div>
            <p className="eyebrow">Rule pack verification closed</p>
            <h1>活动规则包阻止了新排盘</h1>
            <p>{safeVisibleText(rulePackError, "无法解析活动规则包。", 800)} 当前表单仍保留在本页；规则包重新通过完整性校验前，不会退回默认规则生成结果。</p>
            <div className="button-row">
              <button type="button" className="primary-action" onClick={retryRulePack}><RotateCcw aria-hidden="true" />重新核对规则包</button>
              <AppLink href="/settings" className="secondary-action"><ArrowLeft aria-hidden="true" />前往设置停用或更换</AppLink>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className="page page--wizard"
      {...NEW_CHART_SAFETY_ATTRIBUTES}
      data-active-step={step + 1}
      data-time-precision={form.timePrecision}
      data-workflow-mode={revisionMode ? "revision" : "new"}
    >
      <PageHeading
        eyebrow={revisionMode ? "Revise historical chart" : "New chart"}
        title={revisionMode ? "由历史修订派生新版" : "新建排盘"}
        description={revisionMode
          ? `以修订 R${revisionSource!.revision.revisionNumber} 的原始输入、时间校准和规则快照为起点。保存只会追加新 Revision，不覆盖历史版本，也不修改案例别名、标签或笔记。`
          : "显式保存记录时会一并写入原始输入、历法转换、UTC 瞬时点、DST 决策、规则快照与确定性哈希。已支持公历、农历/闰月、IANA 校时与固定 +08 节气投影，全部结果仍标记为金标前的工程候选。"}
      />

      {useDemo ? (
        <div className="demo-banner" role="status">
          <Info aria-hidden="true" />
          <p><strong>演示模式</strong> 当前输入是固定演示值（1995-08-18 08:26 北京），不会自动保存；只有显式点击“保存”才会写入本机库。修改字段后可用“重置演示值”恢复。</p>
          <button type="button" className="secondary-action" disabled={calculating || saving || writeCommitted || Boolean(commitReceiptIssue)} onClick={resetDemo}>{commitReceiptIssue ? "写入待核对" : writeCommitted ? "写入已返回" : calculating || saving ? "操作处理中" : "重置演示值"}</button>
        </div>
      ) : null}

      {revisionMode ? <div className="info-panel" role="status"><History aria-hidden="true" /><p><strong>{safeVisibleText(revisionSource!.caseRecord.alias, "未命名案例", 120)} · 来源 R{revisionSource!.revision.revisionNumber}</strong> 案例元数据保持只读；只有下方出生输入与规则会进入新修订。</p></div> : null}
      {!revisionMode && rulePackLoading ? <div className="info-panel" role="status"><LoaderCircle aria-hidden="true" /><p><strong>正在核对活动规则包</strong> 最终生成前会再次读取并执行完整性校验；当前可先填写资料。</p></div> : null}
      {!revisionMode && rulePackContext?.source === "installed" ? <div className="info-panel" role="status"><ShieldCheck aria-hidden="true" /><p><strong>活动规则包：{safeVisibleText(rulePackContext.title, "未命名规则包", 160)}</strong> 本次按精确 profile 与包摘要计算；包内审核属于作者自述，本机激活不等于来源认证。摘要 {shortHash(rulePackContext.packDigest)}。</p></div> : null}

      <section className="wizard-command-bar" aria-label="当前录入状态">
        <div className="wizard-command-stage">
          <span>{String(step + 1).padStart(2, "0")}</span>
          <div><small>Active stage</small><strong>{steps[step]}</strong></div>
          <progress className="wizard-command-progress" max={steps.length} value={step + 1} aria-label={`排盘步骤进度：第 ${step + 1} 步，共 ${steps.length} 步`} />
        </div>
        <dl>
          <div><dt>工作模式</dt><dd>{workflowModeLabel}</dd></div>
          <div><dt>时间输入</dt><dd>{timeInputLabel}</dd></div>
          <div><dt>本地写入</dt><dd>{writeStateLabel}</dd></div>
        </dl>
      </section>

      <ol className="wizard-steps" aria-label="排盘步骤">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "is-active" : index < step ? "is-complete" : ""} aria-current={index === step ? "step" : undefined}>
            {index < step ? (
              <button
                type="button"
                className="wizard-step-return"
                disabled={calculating || saving || writeCommitted || Boolean(commitReceiptIssue)}
                aria-label={`返回步骤 ${index + 1}：${label}`}
                title={`返回步骤 ${index + 1}`}
                onClick={() => revisitCompletedStep(index)}
              >
                <span><Check aria-hidden="true" /></span>
                <strong>{label}</strong>
              </button>
            ) : (
              <>
                <span>{index + 1}</span>
                <strong>{label}</strong>
              </>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="wizard-layout" aria-busy={calculating || saving} data-write-state={commitReceiptIssue ? "receipt_issue" : writeCommitted ? "committed" : saving ? "saving" : "editable"} data-commit-certainty={commitReceiptIssue?.certainty ?? "not-applicable"} noValidate>
        <fieldset className="wizard-stage" aria-labelledby="wizard-stage-title" disabled={calculating || saving || writeCommitted || Boolean(commitReceiptIssue)}>
          {step === 0 ? (
            <div className="form-section">
              <div className="section-intro"><p className="eyebrow">步骤 1 / 4</p><h2 ref={stageHeadingRef} id="wizard-stage-title" tabIndex={-1}>{revisionMode ? "确认案例与修订来源" : "先给案例一个研究标识"}</h2><p>{revisionMode ? "别名与标签属于 Case 元数据，本流程只读展示，不会静默修改。资料来源说明属于出生输入，可随新修订调整。" : "别名、标签和笔记不参与排盘，也不进入结果哈希。"}</p></div>
              <label className="field">
                <span>案例别名 <em>必填</em></span>
                <input ref={aliasInputRef} value={form.alias} onChange={(event) => update("alias", event.target.value)} placeholder="例如：案例 A-017" autoFocus={!revisionMode} autoComplete="off" required maxLength={MAX_ALIAS_CHARACTERS} disabled={revisionMode} aria-invalid={validationField === "alias" || undefined} aria-describedby={describedBy("case-alias-help", "alias")} />
                <span className="wizard-field-support"><small id="case-alias-help">{revisionMode ? "案例元数据只读；请回到案例库单独修改。" : `最多 ${MAX_ALIAS_CHARACTERS} 个字符；建议使用匿名编号或研究别名。`}</small><small className="wizard-field-counter" aria-label={`已输入 ${form.alias.length} 个字符，上限 ${MAX_ALIAS_CHARACTERS} 个`}>{form.alias.length}/{MAX_ALIAS_CHARACTERS}</small></span>
              </label>
              <label className="field">
                <span>标签</span>
                <input ref={tagsInputRef} value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="用逗号分隔，例如：教学、待复核" autoComplete="off" maxLength={MAX_TAG_INPUT_CHARACTERS} disabled={revisionMode} aria-invalid={validationField === "tags" || undefined} aria-describedby={describedBy("case-tags-help", "tags")} />
                <span className="wizard-field-support"><small id="case-tags-help">{revisionMode ? "标签保持当前 Case 值；本次保存不会更新标签。" : "最多 20 个标签；每个不超过 30 个字符，且不能重复。"}</small><small className="wizard-field-counter" data-state={parsedTags.length > 20 ? "over" : "ok"} aria-label={`当前解析为 ${parsedTags.length} 个标签`}>{parsedTags.length}/20 项</small></span>
              </label>
              <label className="field">
                <span>资料来源说明</span>
                <textarea ref={sourceNoteInputRef} value={form.sourceNote} onChange={(event) => update("sourceNote", event.target.value)} placeholder="例如：本人提供、古籍命例第几章；避免录入无关隐私。" rows={4} autoComplete="off" maxLength={MAX_SOURCE_NOTE_CHARACTERS} aria-invalid={validationField === "sourceNote" || undefined} aria-describedby={describedBy("case-source-note-help", "sourceNote")} />
                <span className="wizard-field-support"><small id="case-source-note-help">最多 {MAX_SOURCE_NOTE_CHARACTERS} 个字符；避免录入无关隐私。</small><small className="wizard-field-counter" aria-label={`已输入 ${form.sourceNote.length} 个字符，上限 ${MAX_SOURCE_NOTE_CHARACTERS} 个`}>{form.sourceNote.length}/{MAX_SOURCE_NOTE_CHARACTERS}</small></span>
              </label>
              <div className="privacy-note"><Info aria-hidden="true" /><p><strong>默认本地</strong> 当前没有账号、云同步或 AI 请求；出生资料只写入此浏览器的 IndexedDB。</p></div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="form-section">
              <div className="section-intro"><p className="eyebrow">步骤 2 / 4</p><h2 ref={stageHeadingRef} id="wizard-stage-title" tabIndex={-1}>录入出生资料</h2><p>保留用户填写的民用时间，再单独归一化时区与 DST；未知时辰不会被自动补成子时。</p></div>
              <div className="field-grid">
                <label className="field"><span>输入历法</span><select value={form.calendarType} onChange={(event) => updateCalendarType(event.target.value as FormState["calendarType"])}><option value="gregorian">公历</option><option value="lunar">农历</option></select><small>切换历法会清空日期，防止同一串数字被静默换一种历法解释。</small></label>
                <label className="field"><span>时间精度</span><select value={form.timePrecision} onChange={(event) => updateTimePrecision(event.target.value as FormState["timePrecision"])}><option value="exact_minute">精确到分钟</option><option value="exact_second">精确到秒 · 边界研究</option><option value="unknown_hour" disabled={revisionMode}>未知时辰 · 生成候选探针</option></select><small>{revisionMode ? "正式 Revision 只能保留精确时间；未知时辰请单独新建候选组。" : "未知时辰不会由 AI 或默认值猜测，而是并列代表性候选。"}</small></label>
                <label className="field"><span>{form.calendarType === "lunar" ? "农历日期" : "出生日期"} <em>必填</em></span>{form.calendarType === "gregorian" ? <input ref={dateInputRef} type="date" min="1900-01-01" max="2100-12-31" value={form.date} onChange={(event) => update("date", event.target.value)} autoComplete="off" required aria-invalid={validationField === "date" || undefined} aria-describedby={describedBy("birth-date-help", "date")} /> : <input ref={dateInputRef} type="text" inputMode="numeric" pattern="\d{4}-\d{2}-\d{2}" maxLength={10} value={form.date} onChange={(event) => update("date", event.target.value)} placeholder="例如 1995-07-23" autoComplete="off" required aria-invalid={validationField === "date" || undefined} aria-describedby={describedBy("birth-date-help", "date")} />}<small id="birth-date-help">{form.calendarType === "lunar" ? "按农历年、月、日填写 YYYY-MM-DD；不是转换后的公历日期。" : "按资料中的公历民用日期填写。"}</small></label>
                {form.calendarType === "lunar" ? <label className={`lunar-leap-toggle${form.lunarLeapMonth ? " is-selected" : ""}`}><input type="checkbox" checked={form.lunarLeapMonth} onChange={(event) => update("lunarLeapMonth", event.target.checked)} /><span><strong>这是闰月</strong><small>仅当该农历年确有同名闰月时勾选；无效组合会明确拒绝。</small></span></label> : null}
                <label className="field"><span>民用时间 {form.timePrecision === "exact_minute" || form.timePrecision === "exact_second" ? <em>必填</em> : null}</span><input ref={timeInputRef} type="time" step={form.timePrecision === "exact_second" ? 1 : 60} value={form.timePrecision === "exact_minute" || form.timePrecision === "exact_second" ? form.time : ""} disabled={form.timePrecision !== "exact_minute" && form.timePrecision !== "exact_second"} onChange={(event) => update("time", event.target.value)} required={form.timePrecision === "exact_minute" || form.timePrecision === "exact_second"} aria-invalid={validationField === "time" || undefined} aria-describedby={describedBy("birth-time-help", "time")} /><small id="birth-time-help">{form.timePrecision === "unknown_hour" ? "保持未知；不会写入任何伪造时刻。" : form.timePrecision === "exact_second" ? "秒级输入只用于节气、换日等边界研究，并原样保存。" : "请填写资料中真实记录的民用时间。"}</small></label>
                <label className="field"><span>IANA 时区 <em>必填</em></span><input ref={timeZoneInputRef} list="iana-time-zones" value={form.timeZone} onChange={(event) => update("timeZone", event.target.value)} placeholder="Asia/Shanghai" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={MAX_TIME_ZONE_CHARACTERS} required aria-invalid={validationField === "timeZone" || undefined} aria-describedby={describedBy("birth-time-zone-help", "timeZone")} /><small id="birth-time-zone-help">必须使用可识别的 IANA 名称；不用“北京时间”等简称猜测。</small></label>
                <label className="field"><span>出生性别</span><select value={form.sex} onChange={(event) => update("sex", event.target.value as FormState["sex"])}><option value="unspecified">未指定</option><option value="male">男</option><option value="female">女</option></select><small>用于可审计的顺逆与运限规则；不会据此生成吉凶解释。</small></label>
                <label className="field"><span>地点标签</span><span className="input-with-icon"><MapPin aria-hidden="true" /><input ref={locationLabelInputRef} value={form.locationLabel} onChange={(event) => update("locationLabel", event.target.value)} placeholder="例如：北京；可留空" autoComplete="off" maxLength={MAX_LOCATION_LABEL_CHARACTERS} aria-invalid={validationField === "locationLabel" || undefined} aria-describedby={describedBy("birth-location-help", "locationLabel")} /></span><small id="birth-location-help">最多 {MAX_LOCATION_LABEL_CHARACTERS} 个字符；当前不调用在线地点搜索。</small></label>
                <label className="field"><span>纬度</span><input ref={latitudeInputRef} type="number" min="-90" max="90" step="any" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} placeholder="例如 39.9042" aria-invalid={validationField === "latitude" || undefined} aria-describedby={describedBy("birth-latitude-help", "latitude")} /><small id="birth-latitude-help">经纬度需同时填写才生成太阳时对照。</small></label>
                <label className="field"><span>经度</span><input ref={longitudeInputRef} type="number" min="-180" max="180" step="any" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} placeholder="东经为正，例如 116.4074" aria-invalid={validationField === "longitude" || undefined} aria-describedby={describedBy("birth-longitude-help", "longitude")} /><small id="birth-longitude-help">只用于地方平/视太阳时对照，默认不改盘。</small></label>
              </div>
              <section className="birth-input-ledger" aria-labelledby="birth-input-ledger-title">
                <header className="birth-input-ledger__heading">
                  <div>
                    <p className="eyebrow">Input certainty ledger</p>
                    <h3 id="birth-input-ledger-title">输入确定性账本</h3>
                  </div>
                  <p>这里只说明资料能否被工程解析以及不确定性是否保留，不评价命盘内容、术数效力或专家真值。</p>
                </header>
                <div className="birth-input-ledger__grid">
                  <article data-state={calendarPreview ? "ready" : form.date ? "review" : "missing"}>
                    <span className="birth-input-ledger__index">01</span>
                    <div>
                      <small>Calendar source</small>
                      <h4>{form.calendarType === "lunar" ? "农历原始输入" : "公历原始输入"}</h4>
                      <p>{calendarPreview
                        ? `${form.date} 已解析为公历 ${calendarPreview.resolvedGregorianDate}，原始历法标记继续保留。`
                        : form.date
                          ? `${form.date} 尚未通过历法解析，进入下一步时会明确拒绝无效组合。`
                          : "尚未填写日期；系统不会补入当前日期或推测日期。"}</p>
                    </div>
                    <strong>{calendarPreview ? "已解析" : form.date ? "需核对" : "未填写"}</strong>
                  </article>

                  <article data-state={form.timePrecision === "unknown_hour" ? "guarded" : timePreview?.normalizationStatus === "instant_resolved" ? "ready" : form.time ? "review" : "missing"}>
                    <span className="birth-input-ledger__index">02</span>
                    <div>
                      <small>Civil time</small>
                      <h4>{form.timePrecision === "unknown_hour" ? "未知时辰保持未知" : form.time || "尚未填写民用时间"}</h4>
                      <p>{form.timePrecision === "unknown_hour"
                        ? "保存时顶层仍为 time=null，只生成并列代表性探针，不选主盘。"
                        : form.timePrecision === "exact_second"
                          ? "秒级原值会用于边界研究并原样保存，不会截断为分钟。"
                          : "分钟级民用原值与后续 UTC 归一化结果分开保留。"}</p>
                    </div>
                    <strong>{form.timePrecision === "unknown_hour" ? "不猜测" : timePreview?.normalizationStatus === "instant_resolved" ? "已归一化" : form.time ? "待解析" : "未填写"}</strong>
                  </article>

                  <article data-state={form.timePrecision === "unknown_hour" ? "guarded" : timePreview?.timeZoneResolution.kind === "unique" ? "ready" : timePreview ? "review" : form.timeZone.trim() ? "review" : "missing"}>
                    <span className="birth-input-ledger__index">03</span>
                    <div>
                      <small>Time-zone instant</small>
                      <h4>{safeVisibleText(form.timeZone, "未填写 IANA 时区", 120)}</h4>
                      <p>{form.timePrecision === "unknown_hour"
                        ? "13 个候选探针会分别解析时区；DST 空档或重叠继续标记为需确认。"
                        : timePreview?.timeZoneResolution.kind === "unique"
                          ? `已得到唯一 UTC 瞬时点 ${timePreview.utcInstant ?? ""}。`
                          : timePreview
                            ? `当前存在 ${timePreview.timeZoneResolution.candidates.length} 个候选偏移，必须在下一步显式处理。`
                            : "需要有效日期、民用时间和 IANA 时区后才能建立瞬时点。"}</p>
                    </div>
                    <strong>{form.timePrecision === "unknown_hour" ? "候选内解析" : timePreview?.timeZoneResolution.kind === "unique" ? "唯一" : timePreview ? "需确认" : "待解析"}</strong>
                  </article>

                  <article data-state={form.latitude.trim() && form.longitude.trim() ? "ready" : form.latitude.trim() || form.longitude.trim() ? "review" : "optional"}>
                    <span className="birth-input-ledger__index">04</span>
                    <div>
                      <small>Location precision</small>
                      <h4>{form.latitude.trim() && form.longitude.trim()
                        ? `${form.latitude}, ${form.longitude}`
                        : safeVisibleText(form.locationLabel, "未提供地点", 120)}</h4>
                      <p>{form.latitude.trim() && form.longitude.trim()
                        ? "经纬度已成对提供，只用于生成并列太阳时对照，默认不改盘。"
                        : form.latitude.trim() || form.longitude.trim()
                          ? "坐标只填写了一半；必须成对补全，否则进入下一步时会明确拒绝。"
                          : form.locationLabel.trim()
                            ? "当前只有地点标签，不会在线查询或反推经纬度。"
                            : "地点可留空；系统不会根据时区自动猜测出生地点。"}</p>
                    </div>
                    <strong>{form.latitude.trim() && form.longitude.trim() ? "坐标对照" : form.latitude.trim() || form.longitude.trim() ? "需成对填写" : form.locationLabel.trim() ? "城市标签" : "可留空"}</strong>
                  </article>
                </div>
              </section>
              <datalist id="iana-time-zones"><option value="Asia/Shanghai" /><option value="Asia/Hong_Kong" /><option value="Asia/Taipei" /><option value="Asia/Singapore" /><option value="Asia/Kathmandu" /><option value="America/New_York" /><option value="Europe/London" /><option value="Pacific/Kiritimati" /></datalist>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="form-section calibration-section">
              <div className="section-intro"><p className="eyebrow">步骤 3 / 4</p><h2 ref={stageHeadingRef} id="wizard-stage-title" tabIndex={-1}>确认时间基准与换日规则</h2><p>{form.timePrecision === "unknown_hour" ? "原始时辰保持未知；系统将生成同一民用日期中的 13 个代表性探针，不猜测哪一个更可能。" : "民用时、UTC 瞬时点和太阳时始终并列；空档或重叠时刻必须明确选择，不会静默改盘。"}</p></div>
              {form.timePrecision === "unknown_hour" ? (
                <div className="unknown-hour-callout"><Clock3 aria-hidden="true" /><div><strong>未知时辰候选入口</strong><p>00:30 子段、01:30 丑时至 21:30 亥时，再加 23:30 子初，共 13 个代表点。DST 空档/重叠探针会保留为“需确认”，不会静默选偏移。</p></div></div>
              ) : (
                <>
                  <div className="calibration-table" role="table" aria-label="时间推导">
                    <div role="row" className="calibration-table-header"><span role="columnheader">推导项目</span><span role="columnheader">当前值</span><span role="columnheader">状态</span></div>
                    <div role="row"><span role="cell"><Clock3 aria-hidden="true" />原始{form.calendarType === "lunar" ? "农历" : "公历"}输入</span><strong role="cell">{form.date || "未填写"} {form.lunarLeapMonth ? "· 闰月 " : ""}{form.time || "--:--"}</strong><span role="cell"><StatusPill tone="info">原值保留</StatusPill></span></div>
                    <div role="row"><span role="cell">民用公历日期</span><strong role="cell">{calendarPreview?.resolvedGregorianDate ?? "待校验"}</strong><span role="cell"><StatusPill tone={calendarPreview?.inputCalendarType === "lunar" ? "info" : "neutral"}>{calendarPreview?.inputCalendarType === "lunar" ? "显式转换" : "原样"}</StatusPill></span></div>
                    <div role="row"><span role="cell">IANA 时区 / 偏移</span><strong role="cell">{safeVisibleText(form.timeZone, "时区不可显示", 120)} {safeVisibleText(timePreview?.utcOffset, "待确认", 40)}</strong><span role="cell"><StatusPill tone={timePreview?.normalizationStatus === "instant_resolved" ? "info" : "warning"}>{safeVisibleText(timePreview?.timeZoneResolution.status, "未解析", 80)}</StatusPill></span></div>
                    <div role="row"><span role="cell">UTC 瞬时点</span><strong role="cell">{timePreview?.utcInstant ?? "未选择有效瞬时点"}</strong><span role="cell"><StatusPill>{timePreview?.timeZoneResolution.candidates.length ?? 0} 个候选</StatusPill></span></div>
                    <div role="row"><span role="cell">地方平太阳时</span><strong role="cell">{timePreview?.solarTime?.variants.find((item) => item.candidateChoice === timePreview.timeZoneResolution.selectedCandidate?.choice)?.meanSolarDateTime ?? "需要完整经纬度"}</strong><span role="cell"><StatusPill tone="info">仅对照</StatusPill></span></div>
                    <div role="row"><span role="cell">地方视太阳时</span><strong role="cell">{timePreview?.solarTimePreview ?? "需要完整经纬度"}</strong><span role="cell"><StatusPill tone="info">未采用</StatusPill></span></div>
                  </div>
                </>
              )}
              {(form.timePrecision === "exact_minute" || form.timePrecision === "exact_second") && timePreview && timePreview.timeZoneResolution.kind !== "unique" ? (
                <fieldset className="choice-group">
                  <legend>DST {timePreview.timeZoneResolution.kind === "overlap" ? "重叠" : "空档"}处理</legend>
                  <label className={form.dstPolicy === "reject" ? "is-selected" : ""}><input type="radio" name="dst-policy" value="reject" checked={form.dstPolicy === "reject"} disabled={rulePackContext?.source === "installed" && rulePackContext.profile.calendar.dstAmbiguity !== "require_user"} onChange={() => update("dstPolicy", "reject")} /><span><strong>先不选择（推荐）</strong><small>保留原始输入和候选值，不生成活动瞬时点。</small></span></label>
                  {timePreview.timeZoneResolution.candidates.map((candidate) => (
                    <label key={candidate.choice} className={form.dstPolicy === candidate.choice ? "is-selected" : ""}><input type="radio" name="dst-policy" value={candidate.choice} checked={form.dstPolicy === candidate.choice} disabled={rulePackContext?.source === "installed" && rulePackContext.profile.calendar.dstAmbiguity !== "require_user"} onChange={() => update("dstPolicy", candidate.choice as "earlier" | "later")} /><span><strong>{candidate.choice === "earlier" ? "较早方案" : "较晚方案"} · {candidate.utcOffset}</strong><small>{candidate.resolvedWallTime} → {candidate.instant}{candidate.matchesInputWallTime ? "" : "（将调整活动墙上时间）"}</small></span></label>
                  ))}
                </fieldset>
              ) : null}
              <fieldset className="choice-group">
                <legend>日柱换日</legend>
                <label className={form.dayBoundary === "zi_start_23" ? "is-selected" : ""}><input type="radio" name="day-boundary" value="zi_start_23" checked={form.dayBoundary === "zi_start_23"} disabled={rulePackContext?.source === "installed"} onChange={() => update("dayBoundary", "zi_start_23")} /><span><strong>23:00 子初换日</strong><small>当前工作默认；映射到 lunar-typescript sect 1。</small></span></label>
                <label className={form.dayBoundary === "midnight" ? "is-selected" : ""}><input type="radio" name="day-boundary" value="midnight" checked={form.dayBoundary === "midnight"} disabled={rulePackContext?.source === "installed"} onChange={() => update("dayBoundary", "midnight")} /><span><strong>00:00 午夜换日</strong><small>用于规则对照；23 点时柱组合仍需金标准验证。</small></span></label>
                {revisionSource?.revision.ruleProfile.calendar.dayBoundary === "split_zi" ? <label className={form.dayBoundary === "split_zi" ? "is-selected" : ""}><input type="radio" name="day-boundary" value="split_zi" checked={form.dayBoundary === "split_zi"} onChange={() => update("dayBoundary", "split_zi")} /><span><strong>早晚子时分流</strong><small>仅为精确保留历史规则快照；仍是实验配置。</small></span></label> : null}
              </fieldset>
              {rulePackContext?.source === "installed" ? <p className="field-help">活动规则包按精确摘要使用，换日规则已锁定；如需改动，请先在设置页停用，再以工作默认规则显式派生。</p> : null}
              <div className="info-panel"><Info aria-hidden="true" /><p>{form.calendarType === "lunar" ? "农历日期先按固定版本历法表转换为公历日期，原农历年月日与闰月标记不会被覆盖。" : "公历日期保持原样。"} 年/月柱按同一 UTC 瞬时点投影到 lunar-typescript 的固定 +08 节气基准，日/时柱按 {safeVisibleText(form.timeZone, "时区不可显示", 120)} 本地民用时与显式换日规则生成；太阳时仍只并列预览。</p></div>
              {(form.timePrecision === "exact_minute" || form.timePrecision === "exact_second") && timePreview?.warnings.length ? <ul className="warning-list time-warning-list">{timePreview.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{safeVisibleText(warning, "时间预览返回了不可显示的警告。")}</li>)}</ul> : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="form-section review-section">
              <div className="section-intro"><p className="eyebrow">步骤 4 / 4</p><h2 ref={stageHeadingRef} id="wizard-stage-title" tabIndex={-1}>{form.timePrecision === "unknown_hour" ? "检查并生成候选探针" : "检查、生成并保存"}</h2><p>{form.timePrecision === "unknown_hour" ? "候选组保留“未知时辰”事实，不会选出或猜出一张主盘。" : "先计算，再决定是否写入案例库。计算失败不会留下半条记录。"}</p></div>
              <dl className="review-list">
                <div><dt>案例</dt><dd>{safeVisibleText(form.alias, "未命名案例", 120)}</dd></div>
                <div><dt>标签</dt><dd>{parsedTags.length ? safeVisibleText(parsedTags.join("、"), "标签不可显示", 320) : "未设置标签"}</dd></div>
                <div><dt>来源说明</dt><dd>{form.sourceNote.trim() ? safeVisibleText(form.sourceNote, "来源说明不可显示", MAX_SOURCE_NOTE_CHARACTERS) : "未填写来源说明"}</dd></div>
                <div><dt>出生输入</dt><dd>{form.date} {form.lunarLeapMonth ? "闰月 · " : ""}{form.timePrecision === "unknown_hour" ? "时辰未知" : form.time} · {form.calendarType === "lunar" ? "农历" : "公历"} · {safeVisibleText(form.timeZone, "时区不可显示", 120)}</dd></div>
                <div><dt>地点证据</dt><dd>{form.locationLabel.trim() ? safeVisibleText(form.locationLabel, "地点不可显示", MAX_LOCATION_LABEL_CHARACTERS) : "未提供地点标签"} · {form.latitude.trim() && form.longitude.trim() ? safeVisibleText(`${form.latitude}, ${form.longitude}`, "坐标不可显示", 120) : "未提供成对坐标"}</dd></div>
                <div><dt>历法解析</dt><dd>{calendarPreview ? `${calendarPreview.inputCalendarType === "lunar" ? "转换至" : "保持"}公历 ${calendarPreview.resolvedGregorianDate} · 往返校验通过` : "日期尚未通过校验"}</dd></div>
                <div><dt>时间归一化</dt><dd>{form.timePrecision === "unknown_hour" ? "13 个代表性探针各自解析；歧义保留待确认" : `${timePreview?.utcInstant ?? "尚未选择唯一瞬时点"} · ${timePreview?.utcOffset ?? "无偏移"}`}</dd></div>
                <div><dt>太阳时</dt><dd>{form.timePrecision === "unknown_hour" ? "探针内可对照，仍不采用" : timePreview?.solarTimePreview ? `${timePreview.solarTimePreview} · 仅对照` : "未提供完整经纬度"}</dd></div>
                <div><dt>规则</dt><dd>{safeVisibleText(activeRule.label, "未命名规则", 160)} {safeVisibleText(activeRule.profileVersion, "版本不可显示", 80)} · {dayBoundaryLabel(form.dayBoundary)}{rulePackContext?.source === "installed" ? ` · 包 ${shortHash(rulePackContext.packDigest)}` : ""}</dd></div>
              </dl>
              <div className="wizard-submit-contract" role="group" aria-label="生成与保存提交契约">
                <div data-contract-state={candidateResult || calculated ? "ready" : "pending"}>
                  <small>01 · 生成阶段</small>
                  <strong>{candidateResult || calculated ? "只读结果已生成" : "尚未生成结果"}</strong>
                  <span>{form.timePrecision === "unknown_hour" ? "生成 13 个探针，不选主盘" : "先计算候选四柱，不写仓储"}</span>
                </div>
                <div data-contract-state={form.timePrecision === "unknown_hour" ? "guarded" : timePreview?.utcInstant ? "ready" : "pending"}>
                  <small>02 · 时间语义</small>
                  <strong>{form.timePrecision === "unknown_hour" ? "unknown_hour 保持未知" : timePreview?.utcInstant ?? "唯一瞬时点未锁定"}</strong>
                  <span>{form.timePrecision === "unknown_hour" ? "DST 歧义留在各探针" : `${safeVisibleText(form.timeZone, "时区不可显示", 120)} · ${form.timePrecision}`}</span>
                </div>
                <div data-contract-state={!revisionMode && rulePackLoading ? "pending" : "ready"}>
                  <small>03 · 规则身份</small>
                  <strong>{!revisionMode && rulePackLoading ? "活动规则包仍在核对" : `${safeVisibleText(activeRule.profileId, "规则 ID 不可显示", 160)}@${safeVisibleText(activeRule.profileVersion, "版本不可显示", 80)}`}</strong>
                  <span>{!revisionMode && rulePackLoading ? "生成前必须完成同一快照核对" : rulePackContext?.source === "installed" ? `规则包 ${shortHash(rulePackContext.packDigest)}` : `${dayBoundaryLabel(form.dayBoundary)} · 工作默认规则`}</span>
                </div>
                <div data-contract-state={commitReceiptIssue || writeCommitted ? "locked" : saving ? "busy" : "ready"}>
                  <small>04 · 写入对象</small>
                  <strong>{revisionMode ? "追加新 Revision" : form.timePrecision === "unknown_hour" ? "新 CandidateSetRecord" : "新 Case + 初始 Revision"}</strong>
                  <span>{commitReceiptIssue ? "提交待核对 · 本页锁定" : writeCommitted ? "写入已返回 · 本页锁定" : saving ? "仓储调用执行中" : "仅在下一次显式点击时写入"}</span>
                </div>
                <p>生成阶段始终零写入；保存调用一旦结果不确定，本页不会把异常解释为“未写入”，也不会开放重复提交。</p>
              </div>
              {candidateResult ? (
                <div className="candidate-preview" aria-live="polite">
                  <div className="preview-heading"><div><p className="eyebrow">Unknown hour probes</p><h3>13 个代表性候选</h3></div><StatusPill tone="warning">experimental_probe</StatusPill></div>
                  <div className="candidate-grid">
                    {candidateResult.candidates.map((candidate) => (
                      <article key={candidate.candidateId} className={candidate.variants.length ? (candidate.status === "calculated" ? "" : "has-variants") : "is-unresolved"}>
                        <div><strong>{safeVisibleText(candidate.branch, "未知", 20)}时</strong><small>{safeVisibleText(candidate.civilTimeRange.start, "起点不可用", 40)}—{safeVisibleText(candidate.civilTimeRange.end, "终点不可用", 40)} · 代表 {safeVisibleText(candidate.representativeTime, "不可用", 40)}</small></div>
                        {candidate.chart ? <p>{Object.values(candidate.chart.facts.pillars).map((pillar) => pillar.ganZhi).join(" ")}</p> : candidate.variants.length ? <div className="candidate-variants">{candidate.variants.map((variant) => <p key={variant.variantId}><b>{safeVisibleText(variant.choice, "未识别", 40)}</b> · {safeVisibleText(variant.utcOffset, "偏移不可用", 40)} · {Object.values(variant.chart.facts.pillars).map((pillar) => pillar.ganZhi).join(" ")}</p>)}</div> : <p>{safeVisibleText(candidate.unresolvedReason?.message, "候选探针未提供可显示的未解析原因。")}</p>}
                        <StatusPill tone={candidate.status === "calculated" ? "neutral" : "warning"}>{candidate.status === "calculated" ? "候选已算" : candidate.variants.length ? `${candidate.variants.length} 个 DST 变体` : "需确认"}</StatusPill>
                      </article>
                    ))}
                  </div>
                  <dl className="hash-preview"><div><dt>候选组哈希</dt><dd title={candidateResult.resultHash}>{shortHash(candidateResult.resultHash)}</dd></div><div><dt>规则哈希</dt><dd title={candidateResult.ruleProfileDigest}>{shortHash(candidateResult.ruleProfileDigest)}</dd></div></dl>
                  <ul className="warning-list">{candidateResult.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{safeVisibleText(warning, "候选组返回了不可显示的警告。")}</li>)}</ul>
                  <div className="info-panel"><Info aria-hidden="true" /><p>候选会保存为独立 CandidateSetRecord，顶层继续保留 unknown_hour 与 time=null；任何代表探针或 DST 变体都不会写成真实出生时刻或主盘。</p></div>
                </div>
              ) : !calculated ? (
                <div className="generate-callout"><span className="spine-dot" /><div><h3>{form.timePrecision === "unknown_hour" ? "尚未生成候选组" : "尚未生成命盘"}</h3><p>{form.timePrecision === "unknown_hour" ? "点击“生成 13 个候选”，歧义时刻会保留为未解析，不影响其他探针。" : "点击“生成命盘”后，页面会调用当前本地历法适配层，并显示所有工程预览警告；生成本身不会写入案例库。"}</p></div></div>
              ) : (
                <div className="calculation-preview" aria-live="polite">
                  <div className="preview-heading"><div><p className="eyebrow">计算完成</p><h3>四柱候选结果</h3></div><StatusPill tone="warning">工程预览</StatusPill></div>
                  <div className="mini-pillars">
                    {Object.values(calculated.facts.pillars).map((pillar) => <div key={pillar.name}><small>{pillar.label}</small><strong>{pillar.stem}</strong><strong>{pillar.branch}</strong><span>{pillar.stemTenGod}</span></div>)}
                  </div>
                  <dl className="hash-preview"><div><dt>结果哈希</dt><dd title={calculated.manifest.resultHash}>{shortHash(calculated.manifest.resultHash)}</dd></div><div><dt>规则哈希</dt><dd title={calculated.manifest.ruleProfileDigest}>{shortHash(calculated.manifest.ruleProfileDigest)}</dd></div></dl>
                  <ul className="warning-list">{calculated.manifest.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{safeVisibleText(warning, "计算结果返回了不可显示的警告。")}</li>)}</ul>
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="wizard-commit-state" data-state={commitState} data-certainty={commitReceiptIssue?.certainty ?? "not-applicable"} role="status" aria-live="polite" aria-atomic="true">
              <span className="wizard-commit-indicator" aria-hidden="true" />
              <div><strong>{commitStateTitle}</strong><small>{commitStateDescription}</small></div>
            </div>
          ) : null}

          {commitReceiptIssue ? (
            <div className="wizard-write-receipt-issue" data-certainty={commitReceiptIssue.certainty} role="alert" aria-labelledby="wizard-write-receipt-title">
              <TriangleAlert aria-hidden="true" />
              <div>
                <p className="eyebrow">{commitCallUnknown ? "Call unknown · reconciliation required" : "Write returned · receipt unresolved"}</p>
                <h3 id="wizard-write-receipt-title">{commitCallUnknown ? "写入调用未知，不要在本页再次保存" : "写入已返回，不要在本页再次保存"}</h3>
                <p>{safeVisibleText(commitReceiptIssue.message, "写入回执返回了不可显示的核对信息。")}</p>
                <dl>
                  <div><dt>写入类型</dt><dd>{commitReceiptIssue.kind === "revision" ? "新 Revision" : commitReceiptIssue.kind === "candidate_set" ? "未知时辰候选组" : "新 Case"}</dd></div>
                  <div><dt>{commitCallUnknown ? "核对线索" : "返回引用"}</dt><dd><code>{safeVisibleText(commitReceiptIssue.reference, "引用不可显示", 700)}</code></dd></div>
                </dl>
                <div className="button-row">
                  <AppLink href={commitReceiptIssue.href} className="secondary-action">{commitReceiptIssue.linkLabel}<ArrowRight aria-hidden="true" /></AppLink>
                  <AppLink href="/settings/data" className="text-link">先导出完整备份</AppLink>
                </div>
                <small>{commitCallUnknown ? "仓储调用抛错不等于事务未发生。请按预期结果摘要在案例库中核对，确认没有对应记录后，才能决定是否重新录入。" : "页面后续错误不等于事务失败。只有在案例库或候选组详情中核对返回引用后，才能决定是否需要重新录入。"}</small>
              </div>
            </div>
          ) : null}

          {error ? <div className="inline-error" id="wizard-error" role="alert"><strong>还不能继续</strong><p>{safeVisibleText(error, "排盘流程未能继续。", 900)}</p></div> : null}

          <div className="wizard-actions">
            <button type="button" className="secondary-action" onClick={previousStep} disabled={step === 0 || calculating || saving || writeCommitted || Boolean(commitReceiptIssue)}><ArrowLeft aria-hidden="true" />上一步</button>
            <button type="submit" className="primary-action" disabled={calculating || saving || writeCommitted || Boolean(commitReceiptIssue)} aria-busy={calculating || saving}>
              {step < 3 ? <>下一步 <ArrowRight aria-hidden="true" /></> : form.timePrecision === "unknown_hour" ? candidateResult ? <>{saving ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />} {saving ? "正在保存候选组" : "保存并打开候选组"}</> : <>{calculating ? <LoaderCircle className="spin" aria-hidden="true" /> : <Clock3 aria-hidden="true" />} {calculating ? "正在生成候选" : "生成 13 个候选"}</> : !calculated ? <>{calculating ? <LoaderCircle className="spin" aria-hidden="true" /> : <Clock3 aria-hidden="true" />} {calculating ? "正在计算" : "生成命盘"}</> : <>{saving ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />} {revisionMode ? saving ? "正在保存新修订" : "保存为新修订并打开" : saving ? "正在保存" : "保存并打开"}</>}
            </button>
          </div>
        </fieldset>

        <aside className="rule-snapshot" aria-label="当前规则快照">
          <div className="snapshot-header"><p className="eyebrow">Rule snapshot</p><h2>当前规则快照</h2><StatusPill tone="warning">{safeVisibleText(activeRule.status, "状态不可用", 80)}</StatusPill></div>
          <dl>
            <div><dt>配置</dt><dd>{safeVisibleText(activeRule.profileId, "规则 ID 不可显示", 160)}</dd></div>
            <div><dt>版本</dt><dd>{safeVisibleText(activeRule.profileVersion, "版本不可显示", 80)}</dd></div>
            <div><dt>界年</dt><dd>{activeRule.calendar.yearBoundary}</dd></div>
            <div><dt>界月</dt><dd>{activeRule.calendar.monthBoundary}</dd></div>
            <div><dt>换日</dt><dd>{dayBoundaryLabel(form.dayBoundary)}</dd></div>
            <div><dt>DST 歧义</dt><dd>{activeRule.calendar.dstAmbiguity === "require_user" ? "遇到时必须确认" : activeRule.calendar.dstAmbiguity}</dd></div>
            <div><dt>时辰基准</dt><dd>{activeRule.calendar.hourBasis}</dd></div>
            <div><dt>真太阳时</dt><dd>{timePreview?.solarTime ? "NOAA 近似对照 · 未采用" : "未启用 · 需要坐标"}</dd></div>
            <div><dt>神煞</dt><dd>{activeRule.layers.shensha ? "开启" : "关闭"}</dd></div>
          </dl>
          <p className="snapshot-notice">{safeVisibleText(activeRule.notice, "当前规则没有可显示的说明。", 800)}</p>
        </aside>
      </form>
    </div>
  );
}
