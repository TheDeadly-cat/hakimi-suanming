import { ArrowLeft, ArrowRight, Check, Clock3, History, Info, LoaderCircle, MapPin, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import {
  loadActiveRulePackContext,
  type ActiveRulePackContext
} from "../lib/active-rule-pack";
import { useLocalAppSettings, type LocalAppSettings } from "../lib/local-app-settings";

const steps = ["案例信息", "出生资料", "时间与规则", "检查生成"] as const;

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
  sourceNote: "用于验证真实计算—保存—重开闭环的固定演示值，不代表真实人物。",
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
  const [rulePackContext, setRulePackContext] = useState<ActiveRulePackContext | null>(null);
  const [rulePackLoading, setRulePackLoading] = useState(!revisionMode);
  const [rulePackError, setRulePackError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationField, setValidationField] = useState<ValidationField | null>(null);
  const [calculated, setCalculated] = useState<CalculatedChart | null>(null);
  const [candidateResult, setCandidateResult] = useState<UnknownHourCandidateResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const formEditedRef = useRef(false);
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

  useEffect(() => {
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
      if (revision.caseId !== props.caseId || !bundle.revisions.some((item) => item.id === revision.id)) {
        throw new Error("指定 Revision 不属于当前 Case，已拒绝跨案例派生。");
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
    }).catch((reason: unknown) => {
      if (active) setSourceError(reason instanceof Error ? reason.message : "无法读取历史修订。");
    }).finally(() => {
      if (active) setSourceLoading(false);
    });
    return () => { active = false; };
  }, [props.caseId, props.revisionId, revisionMode]);

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
        setForm((current) => ({
          ...current,
          dayBoundary: context.profile.calendar.dayBoundary,
          dstPolicy: context.profile.calendar.dstAmbiguity === "require_user"
            ? "reject"
            : context.profile.calendar.dstAmbiguity
        }));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setRulePackContext(null);
        setRulePackError(reason instanceof Error ? reason.message : "无法解析活动规则包。");
      })
      .finally(() => {
        if (active) setRulePackLoading(false);
      });
    return () => { active = false; };
  }, [revisionMode]);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    stageHeadingRef.current?.focus();
  }, [step]);
  const calendarPreview = useMemo(() => {
    try {
      return resolveBirthCalendarInput(buildBirthInput(form)).calendarResolution;
    } catch {
      return null;
    }
  }, [form]);
  const timePreview = useMemo(() => {
    try {
      return normalizeBirthTime(buildBirthInput(form), form.dstPolicy);
    } catch {
      return null;
    }
  }, [form]);
  const activeRule = useMemo(() => {
    const dstAmbiguity = form.dstPolicy === "reject"
      ? "require_user"
      : revisionSource || timePreview?.timeZoneResolution.kind !== "unique"
        ? form.dstPolicy
        : "require_user";
    if (revisionSource) {
      return deriveRevisionRuleProfile(revisionSource.revision.ruleProfile, form.dayBoundary, dstAmbiguity);
    }
    if (rulePackContext?.source === "installed") return rulePackContext.profile;
    return withTimeRules({ dayBoundary: form.dayBoundary, dstAmbiguity });
  }, [form.dayBoundary, form.dstPolicy, revisionSource, rulePackContext, timePreview?.timeZoneResolution.kind]);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    formEditedRef.current = true;
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "date" || key === "time" || key === "timeZone" || key === "lunarLeapMonth") {
        next.dstPolicy = rulePackContext?.source === "installed" && rulePackContext.profile.calendar.dstAmbiguity !== "require_user"
          ? rulePackContext.profile.calendar.dstAmbiguity
          : "reject";
      }
      return next;
    });
    setCalculated(null);
    setCandidateResult(null);
    setError(null);
    setValidationField(null);
  };

  const updateTimePrecision = (timePrecision: FormState["timePrecision"]) => {
    if (revisionMode && timePrecision === "unknown_hour") {
      setError("正式案例修订不能切换为未知时辰候选；请从案例库单独新建候选组。");
      return;
    }
    formEditedRef.current = true;
    setForm((current) => {
      let time = current.time;

      if (timePrecision === "exact_second" && /^\d{2}:\d{2}$/.test(time)) {
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

  const validateCurrentStep = (): boolean => {
    if (step === 0) {
      if (!form.alias.trim()) {
        setError("请先填写案例别名。建议使用匿名编号或研究别名，不要填写不必要的真实姓名。");
        setValidationField("alias");
        focusValidationField("alias");
        return false;
      }
      if (form.alias.trim().length > 80) {
        setError("案例别名最多 80 个字符。");
        setValidationField("alias");
        focusValidationField("alias");
        return false;
      }
      const tagsResult = caseTagsSchema.safeParse(parseTags(form.tags));
      if (!tagsResult.success) {
        setError(tagsResult.error.issues[0]?.message ?? "标签不符合保存规则。");
        setValidationField("tags");
        focusValidationField("tags");
        return false;
      }
      if (form.sourceNote.trim().length > 500) {
        setError("资料来源说明最多 500 个字符。");
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
        setError(issue?.message ?? "出生资料不完整");
        setValidationField(field);
        focusValidationField(field);
        return false;
      }
    }
    setError(null);
    setValidationField(null);
    return true;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const previousStep = () => {
    setError(null);
    setValidationField(null);
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generate = async () => {
    setCalculating(true);
    setError(null);
    try {
      const resolvedRulePackContext = revisionMode
        ? null
        : await loadActiveRulePackContext(APP_VERSION);
      if (!revisionMode) setRulePackContext(resolvedRulePackContext);
      const calculationRule = resolvedRulePackContext?.source === "installed"
        ? resolvedRulePackContext.profile
        : activeRule;
      const sourceRulePackBinding = revisionMode
        ? revisionSource?.revision.rulePackBinding
        : undefined;
      const revisionRulePackBinding = sourceRulePackBinding &&
        await digestRuleProfile(calculationRule) === sourceRulePackBinding.profileDigest
        ? sourceRulePackBinding
        : undefined;
      const rulePackBinding = resolvedRulePackContext?.source === "installed"
        ? resolvedRulePackContext.binding
        : revisionRulePackBinding;
      const input = buildBirthInput(form);
      if (input.timePrecision === "unknown_hour") {
        if (revisionMode) throw new Error("正式案例修订不能生成未知时辰候选组。");
        setCandidateResult(await calculateUnknownHourCandidates(input, calculationRule, {
          rulePackBinding
        }));
        setCalculated(null);
      } else {
        setCalculated(await calculateChart(input, calculationRule, {
          rulePackBinding,
          dstResolutionOverride: form.dstPolicy === "earlier" || form.dstPolicy === "later"
            ? form.dstPolicy
            : undefined
        }));
        setCandidateResult(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "排盘计算失败");
    } finally {
      setCalculating(false);
    }
  };

  const save = async () => {
    if (!calculated) return;
    setSaving(true);
    setError(null);
    try {
      if (revisionMode) {
        if (!props.caseId || !revisionSource) throw new Error("历史修订来源尚未完成校验。");
        const currentBundle = await caseRepository.getCase(props.caseId);
        if (!currentBundle) throw new Error("案例不存在或已经从此浏览器永久删除。");
        if (currentBundle.caseRecord.deletedAt !== null) {
          throw new Error("此案例已在回收站，未写入新修订。请先恢复案例。");
        }
        if (!currentBundle.revisions.some((item) => item.id === revisionSource.revision.id)) {
          throw new Error("历史 Revision 与当前 Case 的关联已失效，未写入新修订。");
        }
        const bundle = await caseRepository.addRevision(props.caseId, calculated);
        const revision = bundle.revisions.find((item) => item.id === bundle.caseRecord.latestRevisionId);
        if (!revision) throw new Error("新修订已写入，但无法解析精确 Revision 深链。");
        navigate(`/cases/${bundle.caseRecord.id}/revisions/${revision.id}`);
        return;
      }
      const bundle = await caseRepository.createCase({
        alias: form.alias.trim(),
        tags: parseTags(form.tags),
        notes: "",
        calculated
      });
      const revision = bundle.revisions[0];
      navigate(`/cases/${bundle.caseRecord.id}/revisions/${revision.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存案例失败");
    } finally {
      setSaving(false);
    }
  };

  const saveCandidateSet = async () => {
    if (!candidateResult) return;
    if (revisionMode) {
      setError("正式案例修订不能保存未知时辰候选组。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const record = await caseRepository.createCandidateSet({
        alias: form.alias.trim(),
        tags: parseTags(form.tags),
        notes: "",
        candidateSet: candidateResult
      });
      navigate(`/candidate-sets/${record.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "候选组保存失败");
    } finally {
      setSaving(false);
    }
  };

  const resetDemo = () => {
    if (!useDemo || revisionMode) return;
    setForm(demoState);
    setStep(0);
    setCalculated(null);
    setCandidateResult(null);
    setError(null);
    setValidationField(null);
    formEditedRef.current = false;
    aliasInputRef.current?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step < steps.length - 1) nextStep();
    else if (form.timePrecision === "unknown_hour") {
      if (candidateResult) void saveCandidateSet();
      else void generate();
    }
    else if (!calculated) void generate();
    else void save();
  };

  if (revisionMode && sourceLoading) {
    return <div className="chart-loading" role="status" aria-label="正在读取历史修订"><span /><span /><span /></div>;
  }
  if (revisionMode && (sourceError || !revisionSource)) {
    return <div className="error-panel page" role="alert"><strong>无法派生历史修订</strong><p>{sourceError ?? "历史修订来源不可用。"}</p><AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink></div>;
  }
  if (!revisionMode && rulePackError) {
    return <div className="error-panel page" role="alert"><strong>活动规则包阻止了新排盘</strong><p>{rulePackError}</p><AppLink href="/settings" className="secondary-action"><ArrowLeft aria-hidden="true" />前往设置停用或更换</AppLink></div>;
  }

  return (
    <div className="page page--wizard">
      <PageHeading
        eyebrow={revisionMode ? "Revise historical chart" : "New chart"}
        title={revisionMode ? "由历史修订派生新版" : "新建排盘"}
        description={revisionMode
          ? `以修订 R${revisionSource!.revision.revisionNumber} 的原始输入、时间校准和规则快照为起点。保存只会追加新 Revision，不覆盖历史版本，也不修改案例别名、标签或笔记。`
          : "每次计算都会保存原始输入、历法转换、UTC 瞬时点、DST 决策、规则快照与确定性哈希。已支持公历、农历/闰月、IANA 校时与固定 +08 节气投影，全部结果仍标记为金标前的工程候选。"}
      />

      {useDemo ? (
        <div className="demo-banner" role="status">
          <Info aria-hidden="true" />
          <p><strong>演示模式</strong> 当前输入是固定演示值（1995-08-18 08:26 北京），不会自动保存；只有显式点击“保存”才会写入本机库。修改字段后可用“重置演示值”恢复。</p>
          <button type="button" className="secondary-action" onClick={resetDemo}>重置演示值</button>
        </div>
      ) : null}

      {revisionMode ? <div className="info-panel" role="status"><History aria-hidden="true" /><p><strong>{revisionSource!.caseRecord.alias} · 来源 R{revisionSource!.revision.revisionNumber}</strong> 案例元数据保持只读；只有下方出生输入与规则会进入新修订。</p></div> : null}
      {!revisionMode && rulePackLoading ? <div className="info-panel" role="status"><LoaderCircle aria-hidden="true" /><p><strong>正在核对活动规则包</strong> 最终生成前会再次读取并完整验真；当前可先填写资料。</p></div> : null}
      {!revisionMode && rulePackContext?.source === "installed" ? <div className="info-panel" role="status"><ShieldCheck aria-hidden="true" /><p><strong>活动规则包：{rulePackContext.title}</strong> 本次按精确 profile 与包摘要计算；包内审核属于作者自述，本机激活不等于来源认证。摘要 {shortHash(rulePackContext.packDigest)}。</p></div> : null}

      <ol className="wizard-steps" aria-label="排盘步骤">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "is-active" : index < step ? "is-complete" : ""} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="wizard-layout" noValidate>
        <section className="wizard-stage" aria-labelledby="wizard-stage-title">
          {step === 0 ? (
            <div className="form-section">
              <div className="section-intro"><p className="eyebrow">步骤 1 / 4</p><h2 ref={stageHeadingRef} id="wizard-stage-title" tabIndex={-1}>{revisionMode ? "确认案例与修订来源" : "先给案例一个研究标识"}</h2><p>{revisionMode ? "别名与标签属于 Case 元数据，本流程只读展示，不会静默修改。资料来源说明属于出生输入，可随新修订调整。" : "别名、标签和笔记不参与排盘，也不进入结果哈希。"}</p></div>
              <label className="field"><span>案例别名 <em>必填</em></span><input ref={aliasInputRef} value={form.alias} onChange={(event) => update("alias", event.target.value)} placeholder="例如：案例 A-017" autoFocus={!revisionMode} required maxLength={80} disabled={revisionMode} aria-invalid={validationField === "alias" || undefined} aria-describedby={describedBy("case-alias-help", "alias")} /><small id="case-alias-help">{revisionMode ? "案例元数据只读；请回到案例库单独修改。" : "最多 80 个字符；建议使用匿名编号或研究别名。"}</small></label>
              <label className="field"><span>标签</span><input ref={tagsInputRef} value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="用逗号分隔，例如：教学、待复核" disabled={revisionMode} aria-invalid={validationField === "tags" || undefined} aria-describedby={describedBy("case-tags-help", "tags")} /><small id="case-tags-help">{revisionMode ? "标签保持当前 Case 值；本次保存不会更新标签。" : "最多 20 个标签；每个不超过 30 个字符，且不能重复。"}</small></label>
              <label className="field"><span>资料来源说明</span><textarea ref={sourceNoteInputRef} value={form.sourceNote} onChange={(event) => update("sourceNote", event.target.value)} placeholder="例如：本人提供、古籍命例第几章；避免录入无关隐私。" rows={4} maxLength={500} aria-invalid={validationField === "sourceNote" || undefined} aria-describedby={describedBy("case-source-note-help", "sourceNote")} /><small id="case-source-note-help">最多 500 个字符；避免录入无关隐私。</small></label>
              <div className="privacy-note"><Info aria-hidden="true" /><p><strong>默认本地</strong> 当前没有账号、云同步或 AI 请求；出生资料只写入此浏览器的 IndexedDB。</p></div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="form-section">
              <div className="section-intro"><p className="eyebrow">步骤 2 / 4</p><h2 ref={stageHeadingRef} id="wizard-stage-title" tabIndex={-1}>录入出生资料</h2><p>保留用户填写的民用时间，再单独归一化时区与 DST；未知时辰不会被自动补成子时。</p></div>
              <div className="field-grid">
                <label className="field"><span>输入历法</span><select value={form.calendarType} onChange={(event) => updateCalendarType(event.target.value as FormState["calendarType"])}><option value="gregorian">公历</option><option value="lunar">农历</option></select><small>切换历法会清空日期，防止同一串数字被静默换一种历法解释。</small></label>
                <label className="field"><span>时间精度</span><select value={form.timePrecision} onChange={(event) => updateTimePrecision(event.target.value as FormState["timePrecision"])}><option value="exact_minute">精确到分钟</option><option value="exact_second">精确到秒 · 边界研究</option><option value="unknown_hour" disabled={revisionMode}>未知时辰 · 生成候选探针</option></select><small>{revisionMode ? "正式 Revision 只能保留精确时间；未知时辰请单独新建候选组。" : "未知时辰不会由 AI 或默认值猜测，而是并列代表性候选。"}</small></label>
                <label className="field"><span>{form.calendarType === "lunar" ? "农历日期" : "出生日期"} <em>必填</em></span>{form.calendarType === "gregorian" ? <input ref={dateInputRef} type="date" min="1900-01-01" max="2100-12-31" value={form.date} onChange={(event) => update("date", event.target.value)} required aria-invalid={validationField === "date" || undefined} aria-describedby={describedBy("birth-date-help", "date")} /> : <input ref={dateInputRef} type="text" inputMode="numeric" pattern="\d{4}-\d{2}-\d{2}" value={form.date} onChange={(event) => update("date", event.target.value)} placeholder="例如 1995-07-23" autoComplete="off" required aria-invalid={validationField === "date" || undefined} aria-describedby={describedBy("birth-date-help", "date")} />}<small id="birth-date-help">{form.calendarType === "lunar" ? "按农历年、月、日填写 YYYY-MM-DD；不是转换后的公历日期。" : "按资料中的公历民用日期填写。"}</small></label>
                {form.calendarType === "lunar" ? <label className={`lunar-leap-toggle${form.lunarLeapMonth ? " is-selected" : ""}`}><input type="checkbox" checked={form.lunarLeapMonth} onChange={(event) => update("lunarLeapMonth", event.target.checked)} /><span><strong>这是闰月</strong><small>仅当该农历年确有同名闰月时勾选；无效组合会明确拒绝。</small></span></label> : null}
                <label className="field"><span>民用时间 {form.timePrecision === "exact_minute" || form.timePrecision === "exact_second" ? <em>必填</em> : null}</span><input ref={timeInputRef} type="time" step={form.timePrecision === "exact_second" ? 1 : 60} value={form.timePrecision === "exact_minute" || form.timePrecision === "exact_second" ? form.time : ""} disabled={form.timePrecision !== "exact_minute" && form.timePrecision !== "exact_second"} onChange={(event) => update("time", event.target.value)} required={form.timePrecision === "exact_minute" || form.timePrecision === "exact_second"} aria-invalid={validationField === "time" || undefined} aria-describedby={describedBy("birth-time-help", "time")} /><small id="birth-time-help">{form.timePrecision === "unknown_hour" ? "保持未知；不会写入任何伪造时刻。" : form.timePrecision === "exact_second" ? "秒级输入只用于节气、换日等边界研究，并原样保存。" : "请填写资料中真实记录的民用时间。"}</small></label>
                <label className="field"><span>IANA 时区 <em>必填</em></span><input ref={timeZoneInputRef} list="iana-time-zones" value={form.timeZone} onChange={(event) => update("timeZone", event.target.value)} placeholder="Asia/Shanghai" autoCapitalize="off" spellCheck={false} required aria-invalid={validationField === "timeZone" || undefined} aria-describedby={describedBy("birth-time-zone-help", "timeZone")} /><small id="birth-time-zone-help">必须使用可识别的 IANA 名称；不用“北京时间”等简称猜测。</small></label>
                <label className="field"><span>出生性别</span><select value={form.sex} onChange={(event) => update("sex", event.target.value as FormState["sex"])}><option value="unspecified">未指定</option><option value="male">男</option><option value="female">女</option></select><small>用于可审计的顺逆与运限规则；不会据此生成吉凶解释。</small></label>
                <label className="field"><span>地点标签</span><span className="input-with-icon"><MapPin aria-hidden="true" /><input ref={locationLabelInputRef} value={form.locationLabel} onChange={(event) => update("locationLabel", event.target.value)} placeholder="例如：北京；可留空" maxLength={80} aria-invalid={validationField === "locationLabel" || undefined} aria-describedby={describedBy("birth-location-help", "locationLabel")} /></span><small id="birth-location-help">最多 80 个字符；当前不调用在线地点搜索。</small></label>
                <label className="field"><span>纬度</span><input ref={latitudeInputRef} type="number" min="-90" max="90" step="any" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} placeholder="例如 39.9042" aria-invalid={validationField === "latitude" || undefined} aria-describedby={describedBy("birth-latitude-help", "latitude")} /><small id="birth-latitude-help">经纬度需同时填写才生成太阳时对照。</small></label>
                <label className="field"><span>经度</span><input ref={longitudeInputRef} type="number" min="-180" max="180" step="any" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} placeholder="东经为正，例如 116.4074" aria-invalid={validationField === "longitude" || undefined} aria-describedby={describedBy("birth-longitude-help", "longitude")} /><small id="birth-longitude-help">只用于地方平/视太阳时对照，默认不改盘。</small></label>
              </div>
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
                    <div role="row"><span role="cell"><Clock3 aria-hidden="true" />原始{form.calendarType === "lunar" ? "农历" : "公历"}输入</span><strong role="cell">{form.date || "未填写"} {form.lunarLeapMonth ? "· 闰月 " : ""}{form.time || "--:--"}</strong><span role="cell"><StatusPill tone="jade">原值保留</StatusPill></span></div>
                    <div role="row"><span role="cell">民用公历日期</span><strong role="cell">{calendarPreview?.resolvedGregorianDate ?? "待校验"}</strong><span role="cell"><StatusPill tone={calendarPreview?.inputCalendarType === "lunar" ? "info" : "neutral"}>{calendarPreview?.inputCalendarType === "lunar" ? "显式转换" : "原样"}</StatusPill></span></div>
                    <div role="row"><span role="cell">IANA 时区 / 偏移</span><strong role="cell">{form.timeZone} {timePreview?.utcOffset ?? "待确认"}</strong><span role="cell"><StatusPill tone={timePreview?.normalizationStatus === "instant_resolved" ? "jade" : "warning"}>{timePreview?.timeZoneResolution.status ?? "未解析"}</StatusPill></span></div>
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
              <div className="info-panel"><Info aria-hidden="true" /><p>{form.calendarType === "lunar" ? "农历日期先按固定版本历法表转换为公历日期，原农历年月日与闰月标记不会被覆盖。" : "公历日期保持原样。"} 年/月柱按同一 UTC 瞬时点投影到 lunar-typescript 的固定 +08 节气基准，日/时柱按 {form.timeZone} 本地民用时与显式换日规则生成；太阳时仍只并列预览。</p></div>
              {(form.timePrecision === "exact_minute" || form.timePrecision === "exact_second") && timePreview?.warnings.length ? <ul className="warning-list time-warning-list">{timePreview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="form-section review-section">
              <div className="section-intro"><p className="eyebrow">步骤 4 / 4</p><h2 ref={stageHeadingRef} id="wizard-stage-title" tabIndex={-1}>{form.timePrecision === "unknown_hour" ? "检查并生成候选探针" : "检查、生成并保存"}</h2><p>{form.timePrecision === "unknown_hour" ? "候选组保留“未知时辰”事实，不会选出或猜出一张主盘。" : "先计算，再决定是否写入案例库。计算失败不会留下半条记录。"}</p></div>
              <dl className="review-list">
                <div><dt>案例</dt><dd>{form.alias}</dd></div>
                <div><dt>出生输入</dt><dd>{form.date} {form.lunarLeapMonth ? "闰月 · " : ""}{form.timePrecision === "unknown_hour" ? "时辰未知" : form.time} · {form.calendarType === "lunar" ? "农历" : "公历"} · {form.timeZone}</dd></div>
                <div><dt>历法解析</dt><dd>{calendarPreview ? `${calendarPreview.inputCalendarType === "lunar" ? "转换至" : "保持"}公历 ${calendarPreview.resolvedGregorianDate} · 往返校验通过` : "日期尚未通过校验"}</dd></div>
                <div><dt>时间归一化</dt><dd>{form.timePrecision === "unknown_hour" ? "13 个代表性探针各自解析；歧义保留待确认" : `${timePreview?.utcInstant ?? "尚未选择唯一瞬时点"} · ${timePreview?.utcOffset ?? "无偏移"}`}</dd></div>
                <div><dt>太阳时</dt><dd>{form.timePrecision === "unknown_hour" ? "探针内可对照，仍不采用" : timePreview?.solarTimePreview ? `${timePreview.solarTimePreview} · 仅对照` : "未提供完整经纬度"}</dd></div>
                <div><dt>规则</dt><dd>{activeRule.label} {activeRule.profileVersion} · {dayBoundaryLabel(form.dayBoundary)}{rulePackContext?.source === "installed" ? ` · 包 ${shortHash(rulePackContext.packDigest)}` : ""}</dd></div>
              </dl>
              {candidateResult ? (
                <div className="candidate-preview" aria-live="polite">
                  <div className="preview-heading"><div><p className="eyebrow">Unknown hour probes</p><h3>13 个代表性候选</h3></div><StatusPill tone="warning">experimental_probe</StatusPill></div>
                  <div className="candidate-grid">
                    {candidateResult.candidates.map((candidate) => (
                      <article key={candidate.candidateId} className={candidate.variants.length ? (candidate.status === "calculated" ? "" : "has-variants") : "is-unresolved"}>
                        <div><strong>{candidate.branch}时</strong><small>{candidate.civilTimeRange.start}—{candidate.civilTimeRange.end} · 代表 {candidate.representativeTime}</small></div>
                        {candidate.chart ? <p>{Object.values(candidate.chart.facts.pillars).map((pillar) => pillar.ganZhi).join(" ")}</p> : candidate.variants.length ? <div className="candidate-variants">{candidate.variants.map((variant) => <p key={variant.variantId}><b>{variant.choice}</b> · {variant.utcOffset} · {Object.values(variant.chart.facts.pillars).map((pillar) => pillar.ganZhi).join(" ")}</p>)}</div> : <p>{candidate.unresolvedReason?.message}</p>}
                        <StatusPill tone={candidate.status === "calculated" ? "neutral" : "warning"}>{candidate.status === "calculated" ? "候选已算" : candidate.variants.length ? `${candidate.variants.length} 个 DST 变体` : "需确认"}</StatusPill>
                      </article>
                    ))}
                  </div>
                  <dl className="hash-preview"><div><dt>候选组哈希</dt><dd>{shortHash(candidateResult.resultHash)}</dd></div><div><dt>规则哈希</dt><dd>{shortHash(candidateResult.ruleProfileDigest)}</dd></div></dl>
                  <ul className="warning-list">{candidateResult.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                  <div className="info-panel"><Info aria-hidden="true" /><p>候选会保存为独立 CandidateSetRecord，顶层继续保留 unknown_hour 与 time=null；任何代表探针或 DST 变体都不会写成真实出生时刻或主盘。</p></div>
                </div>
              ) : !calculated ? (
                <div className="generate-callout"><span className="spine-dot" /><div><h3>{form.timePrecision === "unknown_hour" ? "尚未生成候选组" : "尚未生成命盘"}</h3><p>{form.timePrecision === "unknown_hour" ? "点击“生成 13 个候选”，歧义时刻会保留为未解析，不影响其他探针。" : "点击“生成命盘”后，页面会调用真实历法适配层，并显示所有工程预览警告。"}</p></div></div>
              ) : (
                <div className="calculation-preview" aria-live="polite">
                  <div className="preview-heading"><div><p className="eyebrow">计算完成</p><h3>四柱候选结果</h3></div><StatusPill tone="warning">工程预览</StatusPill></div>
                  <div className="mini-pillars">
                    {Object.values(calculated.facts.pillars).map((pillar) => <div key={pillar.name}><small>{pillar.label}</small><strong>{pillar.stem}</strong><strong>{pillar.branch}</strong><span>{pillar.stemTenGod}</span></div>)}
                  </div>
                  <dl className="hash-preview"><div><dt>结果哈希</dt><dd>{shortHash(calculated.manifest.resultHash)}</dd></div><div><dt>规则哈希</dt><dd>{shortHash(calculated.manifest.ruleProfileDigest)}</dd></div></dl>
                  <ul className="warning-list">{calculated.manifest.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </div>
              )}
            </div>
          ) : null}

          {error ? <div className="inline-error" id="wizard-error" role="alert"><strong>还不能继续</strong><p>{error}</p></div> : null}

          <div className="wizard-actions">
            <button type="button" className="secondary-action" onClick={previousStep} disabled={step === 0 || calculating || saving}><ArrowLeft aria-hidden="true" />上一步</button>
            <button type="submit" className="primary-action" disabled={calculating || saving}>
              {step < 3 ? <>下一步 <ArrowRight aria-hidden="true" /></> : form.timePrecision === "unknown_hour" ? candidateResult ? <>{saving ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />} {saving ? "正在保存候选组" : "保存并打开候选组"}</> : <>{calculating ? <LoaderCircle className="spin" aria-hidden="true" /> : <Clock3 aria-hidden="true" />} {calculating ? "正在生成候选" : "生成 13 个候选"}</> : !calculated ? <>{calculating ? <LoaderCircle className="spin" aria-hidden="true" /> : <Clock3 aria-hidden="true" />} {calculating ? "正在计算" : "生成命盘"}</> : <>{saving ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />} {revisionMode ? saving ? "正在保存新修订" : "保存为新修订并打开" : saving ? "正在保存" : "保存并打开"}</>}
            </button>
          </div>
        </section>

        <aside className="rule-snapshot" aria-label="当前规则快照">
          <div className="snapshot-header"><p className="eyebrow">Rule snapshot</p><h2>当前规则快照</h2><StatusPill tone="warning">{activeRule.status}</StatusPill></div>
          <dl>
            <div><dt>配置</dt><dd>{activeRule.profileId}</dd></div>
            <div><dt>版本</dt><dd>{activeRule.profileVersion}</dd></div>
            <div><dt>界年</dt><dd>{activeRule.calendar.yearBoundary}</dd></div>
            <div><dt>界月</dt><dd>{activeRule.calendar.monthBoundary}</dd></div>
            <div><dt>换日</dt><dd>{dayBoundaryLabel(form.dayBoundary)}</dd></div>
            <div><dt>DST 歧义</dt><dd>{activeRule.calendar.dstAmbiguity === "require_user" ? "遇到时必须确认" : activeRule.calendar.dstAmbiguity}</dd></div>
            <div><dt>时辰基准</dt><dd>{activeRule.calendar.hourBasis}</dd></div>
            <div><dt>真太阳时</dt><dd>{timePreview?.solarTime ? "NOAA 近似对照 · 未采用" : "未启用 · 需要坐标"}</dd></div>
            <div><dt>神煞</dt><dd>{activeRule.layers.shensha ? "开启" : "关闭"}</dd></div>
          </dl>
          <p className="snapshot-notice">{activeRule.notice}</p>
        </aside>
      </form>
    </div>
  );
}
