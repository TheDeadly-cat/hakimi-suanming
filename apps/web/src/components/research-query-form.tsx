import { AlertTriangle, Filter, RotateCcw, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { TransitNodeType } from "@hakimi/contracts";
import {
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  RELATION_TYPES,
  TRANSIT_NODE_TYPES,
  defaultResearchQuery,
  researchQueryFromFormState,
  researchQueryToFormState,
  type ResearchQueryFormState,
  type ResearchRuleProfileOption,
  type ResearchQueryScope,
} from "../lib/research-query-form";
import "./research-query-form.css";

type Props = {
  state: ResearchQueryFormState;
  setState: Dispatch<SetStateAction<ResearchQueryFormState>>;
  availableRuleProfiles: ResearchRuleProfileOption[];
  busy: boolean;
  busyReason?: "query" | "view" | "commit" | null;
  onSubmit: () => void;
  onReset: () => void;
};

const scopeOptions: Array<{ value: ResearchQueryScope; label: string; help: string }> = [
  { value: "cases", label: "案例命盘", help: "按确切 Revision、确定性干支关系、规则配置快照、事件与运限检索" },
  { value: "candidate_sets", label: "候选组", help: "只按候选组元数据、收藏与生命周期检索" },
  { value: "events", label: "研究事件", help: "独立检索事件记录正文、反馈与绑定上下文；记录身份不证明现实真实性" },
  { value: "knowledge", label: "知识资料", help: "检索本地私有资料与随包资料" },
];

const relationLabels: Record<string, string> = {
  stem_five_combination: "天干五合",
  stem_clash: "天干冲",
  branch_six_combination: "地支六合",
  branch_six_clash: "地支六冲",
  branch_three_harmony: "地支三合",
  branch_three_meeting: "地支三会",
  branch_three_punishment: "地支三刑",
  branch_binary_punishment: "地支二刑",
  branch_self_punishment: "地支自刑",
  branch_six_harm: "地支六害",
  branch_six_break: "地支六破",
};

const transitLabels: Record<TransitNodeType, string> = {
  dayun: "大运",
  xiaoyun: "小运",
  year: "流年",
  month: "流月",
  day: "流日",
  hour: "流时",
};

const feedbackValues = ["unreviewed", "supports", "contradicts", "mixed"] as const;
const feedbackLabels = { unreviewed: "未复核", supports: "支持", contradicts: "反例", mixed: "混合" };
const knowledgeRecordTypeValues = ["bundled_knowledge_document", "user_knowledge_document"] as const;
const searchMaxLength = 500;
const maxSavedSelectionCount = 256;
const maxRuleProfileOptionCount = 512;
const unsafeVisibleTextPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu;
const unsafeDraftTextPattern = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const canonicalSha256Pattern = /^[a-f0-9]{64}$/;
const draftStringLimits = {
  scope: 64,
  text: searchMaxLength,
  lifecycle: 64,
  favorites: 64,
  revisionScope: 64,
  tagsText: 800,
  transitUtcDateTime: 64,
  manualDirection: 64,
  eventText: 500,
  eventTagsText: 800,
  eventLifecycle: 64,
  caseEventBinding: 64,
  eventBindingKind: 64,
  contextCaseId: 64,
  contextRevisionId: 64,
  contextNodeType: 64,
  contextNodeId: 512,
  sortField: 64,
  sortDirection: 64
} as const;

const QUERY_GOVERNANCE_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-target-schema": "13",
  "data-db-generation": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-current-build-evidence-verified": "false",
  "data-expert-truth-established": "false",
  "data-formal-truth-established": "false",
  "data-formal-validation": "false",
  "data-scientific-validity-claimed": "false",
  "data-scientific-validation": "false",
  "data-source-rights-established": "false",
  "data-good-bad-score": "null",
  "data-result": "null",
  "data-public-release-authorized": "false",
  "data-query-authority": "engineering-filter-only",
  "data-mutation-epoch-bypassed": "false"
} as const;

type QueryIntegrityIssue = { key: string; label: string };

function countCodePoints(value: string): number {
  let count = 0;

  for (let index = 0; index < value.length; index += 1) {
    if ((value.codePointAt(index) ?? 0) > 0xffff) index += 1;
    count += 1;
  }

  return count;
}

function truncateToCodePoints(value: string, maximumCharacters: number): string {
  let end = 0;
  let count = 0;

  while (end < value.length && count < maximumCharacters) {
    end += (value.codePointAt(end) ?? 0) > 0xffff ? 2 : 1;
    count += 1;
  }

  return value.slice(0, end);
}

function safeVisibleText(value: unknown, fallback: string, maxCodePoints = 160): string {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .slice(0, Math.max(1_024, maxCodePoints * 4))
    .replace(unsafeVisibleTextPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return truncateToCodePoints(normalized, maxCodePoints) || fallback;
}

function isSafeDraftString(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.length <= maxLength
    && !unsafeDraftTextPattern.test(value);
}

function compactIdentifier(value: unknown): string {
  if (typeof value !== "string") return "摘要格式不可识别";
  const trimmed = value.trim();
  const normalized = safeVisibleText(trimmed, "", 512);
  if (!normalized || value !== trimmed || normalized !== trimmed) return "摘要格式不可识别";
  return normalized.length <= 20 ? normalized : `${normalized.slice(0, 10)}…${normalized.slice(-8)}`;
}

function isResearchQueryScope(value: unknown): value is ResearchQueryScope {
  return typeof value === "string" && scopeOptions.some((option) => option.value === value);
}

function isOneOf(values: readonly string[], value: unknown): boolean {
  return typeof value === "string" && values.includes(value);
}

function selectedLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function unsupportedSelectionCount(selected: unknown, allowed: readonly string[]): number {
  if (!Array.isArray(selected)) return 1;
  const allowedValues = new Set(allowed);
  return selected.reduce((count, value) => count + (typeof value !== "string" || !allowedValues.has(value) ? 1 : 0), 0);
}

function duplicateSelectionCount(selected: unknown): number {
  if (!Array.isArray(selected)) return 0;
  const strings = selected.filter((value): value is string => typeof value === "string");
  return strings.length - new Set(strings).size;
}

function hasResearchQueryFormStateShape(value: unknown): value is ResearchQueryFormState {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const candidate = value as Record<string, unknown>;
    const arrayFields = [
      ["dayMasters", 4],
      ["monthBranches", 4],
      ["relationTypes", 80],
      ["ruleProfileDigests", 64],
      ["feedbacks", 64],
      ["knowledgeRecordTypes", 80]
    ] as const;
    if (!Object.entries(draftStringLimits).every(([field, limit]) => isSafeDraftString(candidate[field], limit))) return false;
    if (!arrayFields.every(([field, itemLimit]) => {
      const selection = candidate[field];
      return Array.isArray(selection)
        && selection.length <= maxSavedSelectionCount
        && selection.every((item) => isSafeDraftString(item, itemLimit));
    })) return false;
    if (typeof candidate.transitEnabled !== "boolean" || typeof candidate.caseEventsEnabled !== "boolean") return false;
    if (!candidate.transitMatches || typeof candidate.transitMatches !== "object" || Array.isArray(candidate.transitMatches)) return false;
    const transitMatches = candidate.transitMatches as Record<string, unknown>;
    return TRANSIT_NODE_TYPES.every((nodeType) => {
      const match = transitMatches[nodeType];
      if (!match || typeof match !== "object" || Array.isArray(match)) return false;
      const fields = match as Record<string, unknown>;
      return typeof fields.enabled === "boolean"
        && isSafeDraftString(fields.ganZhi, 4)
        && isSafeDraftString(fields.stemTenGod, 40);
    });
  } catch {
    return false;
  }
}

function invalidIdentifierCount(values: unknown): number {
  if (!Array.isArray(values)) return 1;
  return values.reduce((count, value) => count + (
    typeof value === "string" && canonicalSha256Pattern.test(value) ? 0 : 1
  ), 0);
}

function queryIntegrityIssues(state: ResearchQueryFormState): QueryIntegrityIssue[] {
  if (!isResearchQueryScope(state.scope)) {
    return [{ key: "scope", label: "检索范围不是当前版本支持的值" }];
  }

  const issues: QueryIntegrityIssue[] = [];
  const addEnumIssue = (key: string, label: string, value: unknown, allowed: readonly string[]) => {
    if (!isOneOf(allowed, value)) issues.push({ key, label });
  };
  const addSelectionIssue = (key: string, label: string, selected: unknown, allowed: readonly string[]) => {
    const count = unsupportedSelectionCount(selected, allowed);
    if (count) issues.push({ key: `${key}-unsupported`, label: `${label}含 ${count} 个当前版本不识别的值` });
    const duplicateCount = duplicateSelectionCount(selected);
    if (duplicateCount) issues.push({ key: `${key}-duplicate`, label: `${label}含 ${duplicateCount} 个重复保存值` });
  };

  const labelField = state.scope === "cases" || state.scope === "candidate_sets" ? "alias" : "title";
  addEnumIssue("sort-field", "排序字段不可识别", state.sortField, ["relevance", "updatedAt", "createdAt", labelField]);
  addEnumIssue("sort-direction", "排序方向不可识别", state.sortDirection, ["asc", "desc"]);

  if (state.scope === "cases") {
    addEnumIssue("lifecycle", "案例生命周期不可识别", state.lifecycle, ["active", "trashed", "all"]);
    addEnumIssue("favorites", "收藏范围不可识别", state.favorites, ["any", "only"]);
    addEnumIssue("revision-scope", "Revision 范围不可识别", state.revisionScope, ["latest", "any"]);
    addSelectionIssue("day-masters", "日主条件", state.dayMasters, HEAVENLY_STEMS);
    addSelectionIssue("month-branches", "月令条件", state.monthBranches, EARTHLY_BRANCHES);
    addSelectionIssue("relations", "干支关系条件", state.relationTypes, RELATION_TYPES);
    const digestIssueCount = invalidIdentifierCount(state.ruleProfileDigests);
    if (digestIssueCount) issues.push({ key: "rule-profile-digests", label: `规则配置摘要含 ${digestIssueCount} 个非规范 SHA-256 或不可安全显示的值` });
    const duplicateDigestCount = duplicateSelectionCount(state.ruleProfileDigests);
    if (duplicateDigestCount) issues.push({ key: "rule-profile-digests-duplicate", label: `规则配置摘要含 ${duplicateDigestCount} 个重复保存值` });
    if (state.transitEnabled) addEnumIssue("manual-direction", "运限顺逆条件不可识别", state.manualDirection, ["", "forward", "backward"]);
    if (state.caseEventsEnabled) {
      addEnumIssue("event-lifecycle", "关联事件生命周期不可识别", state.eventLifecycle, ["active", "deleted", "all"]);
      addEnumIssue("case-event-binding", "关联事件绑定范围不可识别", state.caseEventBinding, ["any", "case_only", "matched_revision", "transit_node"]);
      addSelectionIssue("case-event-feedback", "关联事件反馈状态", state.feedbacks, feedbackValues);
    }
  } else if (state.scope === "candidate_sets") {
    addEnumIssue("lifecycle", "候选组生命周期不可识别", state.lifecycle, ["active", "trashed", "all"]);
    addEnumIssue("favorites", "收藏范围不可识别", state.favorites, ["any", "only"]);
  } else if (state.scope === "events") {
    addEnumIssue("lifecycle", "事件生命周期不可识别", state.lifecycle, ["active", "deleted", "all"]);
    addSelectionIssue("feedback", "反馈状态", state.feedbacks, feedbackValues);
    addEnumIssue("event-binding", "事件绑定范围不可识别", state.eventBindingKind, ["any", "case_only", "revision_bound", "node_bound", "context_case", "context_revision", "context_node"]);
    if (state.eventBindingKind === "context_node") addEnumIssue("context-node-type", "节点轨道不可识别", state.contextNodeType, TRANSIT_NODE_TYPES);
  } else {
    addSelectionIssue("knowledge-types", "资料类型", state.knowledgeRecordTypes, knowledgeRecordTypeValues);
  }

  try {
    const formalResult = researchQueryFromFormState(state);
    if (formalResult.issue) {
      issues.push({
        key: "formal-query-contract",
        label: `正式查询契约：${safeVisibleText(formalResult.issue, "查询条件不符合当前正式契约", 320)}`
      });
    }
  } catch {
    issues.push({ key: "formal-query-shape", label: "查询草稿结构不完整，无法安全生成正式查询" });
  }
  return issues;
}

function isDisplayableRuleProfile(value: unknown): value is ResearchRuleProfileOption {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<ResearchRuleProfileOption>;
  if (typeof profile.digest !== "string" || typeof profile.label !== "string" || typeof profile.version !== "string") return false;
  return canonicalSha256Pattern.test(profile.digest)
    && profile.label.length <= 160
    && profile.version.length <= 80
    && profile.label.length > 0
    && profile.version.length > 0
    && profile.label === profile.label.trim()
    && profile.version === profile.version.trim()
    && safeVisibleText(profile.label, "", 160) === profile.label
    && safeVisibleText(profile.version, "", 80) === profile.version;
}

function toggleValue(values: string[], value: string, checked: boolean): string[] {
  if (checked) return values.includes(value) || values.length >= maxSavedSelectionCount ? values : [...values, value];
  return values.includes(value) ? values.filter((item) => item !== value) : values;
}

function advancedFilterGroupCount(state: ResearchQueryFormState): number {
  if (!isResearchQueryScope(state.scope)) return 0;
  const defaults = researchQueryToFormState(defaultResearchQuery(state.scope));
  let count = state.sortField !== defaults.sortField || state.sortDirection !== defaults.sortDirection ? 1 : 0;
  if (state.scope === "cases") {
    count += state.revisionScope !== defaults.revisionScope ? 1 : 0;
    count += selectedLength(state.dayMasters) ? 1 : 0;
    count += selectedLength(state.monthBranches) ? 1 : 0;
    count += selectedLength(state.relationTypes) ? 1 : 0;
    count += selectedLength(state.ruleProfileDigests) ? 1 : 0;
    count += state.transitEnabled ? 1 : 0;
    count += state.caseEventsEnabled ? 1 : 0;
  }
  if (state.scope === "events") {
    count += selectedLength(state.feedbacks) ? 1 : 0;
    count += state.eventBindingKind !== defaults.eventBindingKind ? 1 : 0;
  }
  return count;
}

function updateTransitMatch(
  setState: Props["setState"],
  nodeType: TransitNodeType,
  patch: Partial<ResearchQueryFormState["transitMatches"][TransitNodeType]>
) {
  setState((current) => ({
    ...current,
    transitMatches: {
      ...current.transitMatches,
      [nodeType]: { ...current.transitMatches[nodeType], ...patch },
    },
  }));
}

function ChoiceGrid({
  legend,
  values,
  selected,
  labels,
  onChange,
}: {
  legend: string;
  values: readonly string[];
  selected: string[];
  labels?: Record<string, string>;
  onChange: (next: string[]) => void;
}) {
  const selectedStrings = Array.isArray(selected) ? selected.filter((value): value is string => typeof value === "string") : [];
  const normalizedSelected = Array.from(new Set(selectedStrings));
  const selectedValues = new Set(normalizedSelected);
  const unsupportedCount = unsupportedSelectionCount(selected, values);
  const duplicateCount = duplicateSelectionCount(selected);
  return (
    <fieldset className="research-query-choice-group" data-selected-count={normalizedSelected.length} data-integrity={unsupportedCount || duplicateCount ? "error" : "ok"}>
      <legend>{legend}<span className="sr-only">，{normalizedSelected.length ? `已选择 ${normalizedSelected.length} 项` : "当前允许任意值"}</span></legend>
      <span className="research-query-choice-count" aria-hidden="true">{normalizedSelected.length ? `已选 ${normalizedSelected.length}` : "任意值"}</span>
      <div className="research-query-choice-grid">
        {values.map((value) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={selectedValues.has(value)}
              onChange={(event) => onChange(toggleValue(normalizedSelected, value, event.target.checked))}
            />
            <span>{safeVisibleText(labels?.[value] ?? value, "不可识别值", 80)}</span>
          </label>
        ))}
      </div>
      {unsupportedCount ? <p className="research-query-choice-warning">该组含 {unsupportedCount} 个当前版本不识别的保存值。系统不会静默忽略；请恢复本范围默认条件后重新选择。</p> : null}
      {duplicateCount ? <p className="research-query-choice-warning">该组含 {duplicateCount} 个重复保存值。当前按唯一值显示；请取消并重新选择，避免提交时被静默去重。</p> : null}
    </fieldset>
  );
}

function FeedbackFields({ state, setState }: Pick<Props, "state" | "setState">) {
  return (
    <ChoiceGrid
      legend="反馈状态"
      values={feedbackValues}
      selected={state.feedbacks}
      labels={feedbackLabels}
      onChange={(feedbacks) => setState((current) => ({ ...current, feedbacks }))}
    />
  );
}

function SortFields({ state, setState }: Pick<Props, "state" | "setState">) {
  const labelField = state.scope === "cases" || state.scope === "candidate_sets" ? "alias" : "title";
  return (
    <div className="research-query-sort-grid">
      <label className="field">
        <span>排序字段</span>
        <select value={state.sortField} onChange={(event) => setState((current) => ({ ...current, sortField: event.target.value }))}>
          <option value="relevance">相关度</option>
          <option value="updatedAt">更新时间</option>
          <option value="createdAt">创建时间</option>
          <option value={labelField}>{labelField === "alias" ? "别名" : "标题"}</option>
        </select>
      </label>
      <label className="field">
        <span>排序方向</span>
        <select value={state.sortDirection} onChange={(event) => setState((current) => ({ ...current, sortDirection: event.target.value as "asc" | "desc" }))}>
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>
      </label>
    </div>
  );
}

function LifecycleAndTags({ state, setState }: Pick<Props, "state" | "setState">) {
  const eventScope = state.scope === "events";
  const lifecycleOptions = eventScope
    ? [["active", "有效"], ["deleted", "已软删除"], ["all", "全部状态"]]
    : [["active", "有效"], ["trashed", "回收站"], ["all", "全部状态"]];
  return (
    <div className="research-query-field-grid">
      <label className="field">
        <span>生命周期</span>
        <select value={state.lifecycle} onChange={(event) => setState((current) => ({ ...current, lifecycle: event.target.value as ResearchQueryFormState["lifecycle"] }))}>
          {lifecycleOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      {state.scope === "cases" || state.scope === "candidate_sets" ? (
        <label className="field">
          <span>收藏范围</span>
          <select value={state.favorites} onChange={(event) => setState((current) => ({ ...current, favorites: event.target.value as "any" | "only" }))}>
            <option value="any">全部记录</option>
            <option value="only">仅收藏</option>
          </select>
        </label>
      ) : null}
      <label className="field research-query-wide-field">
        <span>{eventScope ? "事件标签" : "标签"}</span>
        <input
          value={state.tagsText}
          maxLength={800}
          onChange={(event) => setState((current) => ({ ...current, tagsText: event.target.value }))}
          placeholder="多个标签用逗号分隔"
        />
      </label>
    </div>
  );
}

function CaseAdvancedFields({ state, setState, availableRuleProfiles }: Pick<Props, "state" | "setState" | "availableRuleProfiles">) {
  const ruleProfileLimitId = useId();
  const allProfileCandidates = Array.isArray(availableRuleProfiles) ? availableRuleProfiles : [];
  const profileCandidates = allProfileCandidates.slice(0, maxRuleProfileOptionCount);
  const omittedProfileCount = allProfileCandidates.length - profileCandidates.length;
  const displayableProfiles = profileCandidates.filter(isDisplayableRuleProfile);
  const profileByDigest = new Map<string, ResearchRuleProfileOption>();
  for (const profile of displayableProfiles) {
    if (!profileByDigest.has(profile.digest)) profileByDigest.set(profile.digest, profile);
  }
  const profiles = Array.from(profileByDigest.values());
  const malformedProfileCount = profileCandidates.length - displayableProfiles.length;
  const duplicateProfileCount = displayableProfiles.length - profiles.length;
  const selectedDigests = Array.isArray(state.ruleProfileDigests)
    ? state.ruleProfileDigests.filter((digest): digest is string => typeof digest === "string")
    : [];
  const selectedDigestSet = new Set(selectedDigests);
  const listedDigestSet = new Set(profiles.map((profile) => profile.digest));
  const unlistedSelectedDigests = Array.from(new Set(selectedDigests)).filter((digest) => !listedDigestSet.has(digest));
  const selectedDigestLimitReached = selectedDigests.length >= maxSavedSelectionCount;
  const selectedDigestCountLabel = selectedDigests.length
    ? selectedDigests.length === selectedDigestSet.size
      ? `已选 ${selectedDigestSet.size}`
      : `唯一 ${selectedDigestSet.size} · 保存值 ${selectedDigests.length}`
    : "任意值";
  const updateRuleProfileDigest = (digest: string, checked: boolean) => setState((current) => ({
    ...current,
    ruleProfileDigests: toggleValue(
      Array.isArray(current.ruleProfileDigests) ? current.ruleProfileDigests.filter((value): value is string => typeof value === "string") : [],
      digest,
      checked,
    ),
  }));

  return (
    <div className="research-query-advanced-stack">
      <div className="research-query-field-grid">
        <label className="field">
          <span>Revision 范围</span>
          <select value={state.revisionScope} onChange={(event) => setState((current) => ({ ...current, revisionScope: event.target.value as "latest" | "any" }))}>
            <option value="latest">仅最新 Revision</option>
            <option value="any">任一历史 Revision</option>
          </select>
        </label>
      </div>
      <ChoiceGrid legend="日主" values={HEAVENLY_STEMS} selected={state.dayMasters} onChange={(dayMasters) => setState((current) => ({ ...current, dayMasters }))} />
      <ChoiceGrid legend="月令" values={EARTHLY_BRANCHES} selected={state.monthBranches} onChange={(monthBranches) => setState((current) => ({ ...current, monthBranches }))} />
      <ChoiceGrid legend="确定性干支关系" values={RELATION_TYPES} selected={state.relationTypes} labels={relationLabels} onChange={(relationTypes) => setState((current) => ({ ...current, relationTypes }))} />
      <p className="research-query-field-help">这里只匹配版本化的四柱成员关系事实，不代表格局、旺衰、用神、合化或吉凶判断。</p>
      <fieldset className="research-query-choice-group" data-selection-limit={selectedDigestLimitReached ? "reached" : "available"}>
        <legend>规则配置快照<span className="sr-only">，{selectedDigestCountLabel}</span></legend>
        <span className="research-query-choice-count" aria-hidden="true">{selectedDigestCountLabel}</span>
        {profiles.length || unlistedSelectedDigests.length ? (
          <div className="research-query-rule-list">
            {profiles.map((profile) => {
              const selected = selectedDigestSet.has(profile.digest);
              const selectionBlocked = selectedDigestLimitReached && !selected;
              return (
                <label key={profile.digest} data-selected={selected} data-availability="listed" data-limit-blocked={selectionBlocked}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={selectionBlocked}
                    aria-describedby={selectionBlocked ? ruleProfileLimitId : undefined}
                    onChange={(event) => updateRuleProfileDigest(profile.digest, event.target.checked)}
                  />
                  <span><strong>{safeVisibleText(profile.label, "未命名规则配置", 120)}</strong><small>{safeVisibleText(profile.version, "版本未登记", 80)} · <code title={safeVisibleText(profile.digest, "摘要不可显示", 512)}>{compactIdentifier(profile.digest)}</code></small></span>
                </label>
              );
            })}
            {unlistedSelectedDigests.map((digest, index) => (
              <label key={`${digest}-${index}`} data-selected="true" data-availability="unlisted">
                <input type="checkbox" checked onChange={() => updateRuleProfileDigest(digest, false)} />
                <span><strong>当前目录未列出的已选快照</strong><small><code title={safeVisibleText(digest, "摘要不可显示", 512)}>{compactIdentifier(digest)}</code> · 取消勾选可移除此条件</small></span>
              </label>
            ))}
          </div>
        ) : <p className="research-query-field-help">当前本地数据还没有可列出的正式 Revision 规则配置快照。</p>}
        {malformedProfileCount ? <p className="research-query-field-warning" role="alert">已拒绝显示 {malformedProfileCount} 条摘要缺失或格式异常的规则配置选项。</p> : null}
        {duplicateProfileCount ? <p className="research-query-field-warning" role="alert">规则配置目录含 {duplicateProfileCount} 条重复摘要；当前只显示每个摘要首次出现的记录。</p> : null}
        {omittedProfileCount ? <p className="research-query-field-warning" role="status">规则配置目录超过前台上限，已省略其余 {omittedProfileCount} 条；可缩小上游 Revision 范围后重试。</p> : null}
        {selectedDigestLimitReached ? <p className="research-query-field-warning" id={ruleProfileLimitId} role="status">已占满 {maxSavedSelectionCount} 个规则配置保存槽位；重复值也占用槽位。请先取消不需要或重复的快照。</p> : null}
        <p className="research-query-field-help">按完整 ruleProfileDigest 精确匹配，不等同于只按规则包 ID 或版本筛选。</p>
      </fieldset>

      <fieldset className="research-query-optional-group">
        <legend>指定瞬时点运限</legend>
        <label className="research-query-enable-row">
          <input type="checkbox" checked={state.transitEnabled} onChange={(event) => setState((current) => ({ ...current, transitEnabled: event.target.checked }))} />
          <span>启用运限组合条件</span>
        </label>
        {state.transitEnabled ? (
          <>
            <div className="research-query-field-grid">
              <label className="field"><span>目标瞬时点（UTC）</span><input type="datetime-local" step="0.001" value={state.transitUtcDateTime} onChange={(event) => setState((current) => ({ ...current, transitUtcDateTime: event.target.value }))} /><small>明确按 UTC 解释；保留秒，并规范化为三位毫秒。</small></label>
              <label className="field"><span>未指定性别时顺逆</span><select value={state.manualDirection} onChange={(event) => setState((current) => ({ ...current, manualDirection: event.target.value as ResearchQueryFormState["manualDirection"] }))}><option value="">不推断</option><option value="forward">顺行</option><option value="backward">逆行</option></select></label>
            </div>
            <div className="research-query-transit-list">
              {TRANSIT_NODE_TYPES.map((nodeType) => {
                const match = state.transitMatches[nodeType];
                return (
                  <div key={nodeType} className={match.enabled ? "is-enabled" : ""} data-node-type={nodeType}>
                    <label><input type="checkbox" checked={match.enabled} onChange={(event) => updateTransitMatch(setState, nodeType, { enabled: event.target.checked })} /><span>{transitLabels[nodeType]}</span></label>
                    <label><span className="sr-only">{transitLabels[nodeType]}干支</span><input disabled={!match.enabled} maxLength={2} value={match.ganZhi} onChange={(event) => updateTransitMatch(setState, nodeType, { ganZhi: event.target.value })} placeholder="干支" /></label>
                    <label><span className="sr-only">{transitLabels[nodeType]}天干十神</span><input disabled={!match.enabled} maxLength={20} value={match.stemTenGod} onChange={(event) => updateTransitMatch(setState, nodeType, { stemTenGod: event.target.value })} placeholder="十神" /></label>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </fieldset>

      <fieldset className="research-query-optional-group">
        <legend>关联事件条件</legend>
        <label className="research-query-enable-row"><input type="checkbox" checked={state.caseEventsEnabled} onChange={(event) => setState((current) => ({ ...current, caseEventsEnabled: event.target.checked }))} /><span>要求同一条事件满足以下条件</span></label>
        {state.caseEventsEnabled ? (
          <>
            <div className="research-query-field-grid">
              <label className="field research-query-wide-field"><span>事件关键词</span><input value={state.eventText} maxLength={500} onChange={(event) => setState((current) => ({ ...current, eventText: event.target.value }))} /></label>
              <label className="field"><span>事件生命周期</span><select value={state.eventLifecycle} onChange={(event) => setState((current) => ({ ...current, eventLifecycle: event.target.value as ResearchQueryFormState["eventLifecycle"] }))}><option value="active">有效</option><option value="deleted">已软删除</option><option value="all">全部</option></select></label>
              <label className="field"><span>绑定范围</span><select value={state.caseEventBinding} onChange={(event) => setState((current) => ({ ...current, caseEventBinding: event.target.value as ResearchQueryFormState["caseEventBinding"] }))}><option value="any">任意</option><option value="case_only">仅案例</option><option value="matched_revision">命中 Revision</option><option value="transit_node">命中运限节点</option></select></label>
              <label className="field research-query-wide-field"><span>事件标签</span><input value={state.eventTagsText} maxLength={800} onChange={(event) => setState((current) => ({ ...current, eventTagsText: event.target.value }))} placeholder="多个标签用逗号分隔" /></label>
            </div>
            <FeedbackFields state={state} setState={setState} />
          </>
        ) : null}
      </fieldset>
    </div>
  );
}

function EventAdvancedFields({ state, setState }: Pick<Props, "state" | "setState">) {
  const contextual = state.eventBindingKind === "context_case" || state.eventBindingKind === "context_revision" || state.eventBindingKind === "context_node";
  return (
    <div className="research-query-advanced-stack">
      <FeedbackFields state={state} setState={setState} />
      <label className="field">
        <span>绑定范围</span>
        <select value={state.eventBindingKind} onChange={(event) => setState((current) => ({ ...current, eventBindingKind: event.target.value as ResearchQueryFormState["eventBindingKind"] }))}>
          <option value="any">任意</option><option value="case_only">仅案例</option><option value="revision_bound">已绑定 Revision</option><option value="node_bound">已绑定运限节点</option><option value="context_case">指定 Case</option><option value="context_revision">指定 Case / Revision</option><option value="context_node">指定确切节点</option>
        </select>
      </label>
      {contextual ? (
        <div className="research-query-field-grid">
          <label className="field"><span>Case UUID</span><input className="mono" value={state.contextCaseId} maxLength={36} autoComplete="off" spellCheck={false} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" onChange={(event) => setState((current) => ({ ...current, contextCaseId: event.target.value }))} /></label>
          {state.eventBindingKind !== "context_case" ? <label className="field"><span>Revision UUID</span><input className="mono" value={state.contextRevisionId} maxLength={36} autoComplete="off" spellCheck={false} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" onChange={(event) => setState((current) => ({ ...current, contextRevisionId: event.target.value }))} /></label> : null}
          {state.eventBindingKind === "context_node" ? <><label className="field"><span>节点轨道</span><select value={state.contextNodeType} onChange={(event) => setState((current) => ({ ...current, contextNodeType: event.target.value as TransitNodeType }))}>{TRANSIT_NODE_TYPES.map((nodeType) => <option key={nodeType} value={nodeType}>{transitLabels[nodeType]}</option>)}</select></label><label className="field research-query-wide-field"><span>稳定 nodeId</span><input className="mono" value={state.contextNodeId} maxLength={512} autoComplete="off" spellCheck={false} onChange={(event) => setState((current) => ({ ...current, contextNodeId: event.target.value }))} /></label></> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ResearchQueryForm({ state, setState, availableRuleProfiles, busy, busyReason, onSubmit, onReset }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(() => (
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? true
      : window.matchMedia("(min-width: 768px)").matches
  ));
  const scopeGroupName = useId();
  const searchInputId = useId();
  const searchHelpId = useId();
  const searchCountId = useId();
  const integrityTitleId = useId();
  const boundaryId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stateShapeValid = hasResearchQueryFormStateShape(state);
  const integrityIssues = useMemo(
    () => stateShapeValid ? queryIntegrityIssues(state) : [],
    [state, stateShapeValid],
  );
  const advancedGroupCount = useMemo(
    () => stateShapeValid ? advancedFilterGroupCount(state) : 0,
    [state, stateShapeValid],
  );
  useEffect(() => {
    if (integrityIssues.length > 0) setAdvancedOpen(true);
  }, [integrityIssues.length]);
  if (!stateShapeValid) {
    return (
      <form
        {...QUERY_GOVERNANCE_ATTRIBUTES}
        className="research-query-form"
        data-scope="invalid"
        data-advanced-open="false"
        data-busy={busy}
        data-busy-reason={busy ? busyReason ?? "other" : "none"}
        data-integrity="error"
        data-formal-contract="error"
        data-state-shape="error"
        data-query-generation-state="blocked"
        data-record-write-state="not_started"
        data-mutation-mode="query-draft-only"
        data-write-reconciliation-required={busy && busyReason === "commit" ? "true" : "false"}
        aria-busy={busy}
        onSubmit={(event) => event.preventDefault()}
      >
        <section className="research-query-integrity" role="alert" aria-labelledby={integrityTitleId}>
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong id={integrityTitleId}>查询草稿结构不完整，已停止渲染条件控件</strong>
            <p>至少一个必需字符串、数组或运限轨道容器缺失、包含控制字符或超出长度上限。系统不会猜测、补齐或提交该草稿；请恢复当前范围的默认条件。</p>
          </div>
        </section>
        <div className="research-query-form-actions research-query-form-actions--recovery">
          <button type="button" className="secondary-action" disabled={busy} onClick={onReset}><RotateCcw aria-hidden="true" />恢复默认查询条件</button>
          <small role="status" aria-live="polite" aria-atomic="true">
            {busy ? "当前研究操作尚未结束；完成前不能恢复条件。" : "恢复操作只替换本地查询草稿，不会写入、发布或修改任何案例资料。"}
          </small>
        </div>
      </form>
    );
  }
  const formalContractReady = integrityIssues.length === 0;
  const activeScope = scopeOptions.find((option) => option.value === state.scope) ?? null;
  const searchCharacterCount = countCodePoints(state.text);
  const canSubmit = !busy && integrityIssues.length === 0;
  const formStateLabel = busy
    ? busyReason === "query"
      ? "查询执行中"
      : busyReason === "view"
        ? "视图写入中"
        : busyReason === "commit"
          ? "写入回执待核对"
          : "操作锁定"
    : integrityIssues.length
      ? "条件需处理"
      : "可编辑";
  const submitLabel = busy
    ? busyReason === "query"
      ? "正在执行"
      : "当前不可应用"
    : integrityIssues.length
      ? "先处理异常条件"
      : "应用筛选";
  const busyStatusMessage = busyReason === "query"
    ? "正在按已锁定的提交条件执行；完成前不能修改或重置筛选。"
    : busyReason === "view"
      ? "正在完成保存视图写入；返回明确结果前不能修改、重置或重新应用筛选。"
      : busyReason === "commit"
        ? "保存视图写入已返回但后续回执仍待核对；当前查询路由禁止重复提交。"
        : "当前研究操作尚未结束；完成前不能修改、重置或应用筛选。";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };
  const changeScope = (scope: ResearchQueryScope) => setState(researchQueryToFormState(defaultResearchQuery(scope)));
  const clearSearchText = () => {
    setState((current) => current.text ? { ...current, text: "" } : current);
    searchInputRef.current?.focus({ preventScroll: true });
  };

  return (
    <form
      {...QUERY_GOVERNANCE_ATTRIBUTES}
      className="research-query-form"
      data-scope={state.scope}
      data-advanced-open={advancedOpen}
      data-busy={busy}
      data-busy-reason={busy ? busyReason ?? "other" : "none"}
      data-integrity={integrityIssues.length ? "error" : "ok"}
      data-query-generation-state={busy ? "locked" : integrityIssues.length ? "blocked" : "generatable"}
      data-formal-contract={formalContractReady ? "generatable" : "error"}
      data-state-shape="validated"
      data-mutation-mode={busy && (busyReason === "view" || busyReason === "commit") ? "parent-coordinated-write-lock" : "query-draft-only"}
      data-record-write-state={busy && (busyReason === "view" || busyReason === "commit") ? "parent_coordinated_in_progress" : "not_started"}
      data-write-reconciliation-required={busy && busyReason === "commit" ? "true" : "false"}
      aria-busy={busy}
      aria-describedby={boundaryId}
      onSubmit={submit}
    >
      <div className="research-query-context" aria-label="当前查询状态">
        <div className="research-query-context__scope">
          <span>Query scope</span>
          <strong>{activeScope?.label ?? "范围不可识别"}</strong>
          <small>{activeScope?.help ?? "当前保存条件引用了本版本不支持的检索范围；请选择下方受支持范围。"}</small>
        </div>
        <dl>
          <div>
            <dt>高级条件</dt>
            <dd>{advancedGroupCount ? `${advancedGroupCount} 组` : "默认"}</dd>
          </div>
          <div data-state={busy ? "busy" : integrityIssues.length ? "integrity" : "editable"}>
            <dt>表单状态</dt>
            <dd>{formStateLabel}</dd>
          </div>
          <div data-state={formalContractReady ? "contract" : "integrity"}>
            <dt>查询契约</dt>
            <dd>{formalContractReady ? "可生成" : "已阻断"}</dd>
          </div>
        </dl>
      </div>

      <aside className="research-query-boundary" id={boundaryId}>
        <ShieldCheck aria-hidden="true" />
        <p><strong>查询条件不是研究结论。</strong> 本表单只生成当前范围的工程查询草稿；保存视图等写入由父级 mutation 流程执行，查询命中不构成事实真值、术数判断或公开发布授权。</p>
        <small className="research-query-boundary__baseline">
          legacy-v13 · targetSchema 13 · migrationId null · 仅工程证据
        </small>
      </aside>

      {integrityIssues.length ? (
        <section className="research-query-integrity" role="alert" aria-labelledby={integrityTitleId}>
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong id={integrityTitleId}>检测到 {integrityIssues.length} 组不兼容或不可安全显示的查询条件</strong>
            <p>系统不会静默丢弃、翻译或提交这些值。可在下方改选受支持值；无法定位的旧条件请使用“恢复此范围默认条件”。</p>
            <ul>{integrityIssues.map((issue) => <li key={issue.key}>{issue.label}</li>)}</ul>
          </div>
        </section>
      ) : null}

      <fieldset className="research-query-controls" disabled={busy}>
        <legend className="sr-only">研究检索条件</legend>
        <fieldset className="research-query-scope-tabs">
          <legend>检索范围</legend>
          <div>
            {scopeOptions.map((option) => <label key={option.value} data-scope={option.value}><input type="radio" name={scopeGroupName} value={option.value} checked={state.scope === option.value} onChange={() => changeScope(option.value)} /><span><strong>{option.label}</strong><small>{option.help}</small></span></label>)}
          </div>
          <p className="research-query-scope-boundary">切换范围会恢复目标范围的默认条件；系统不会把当前筛选自动翻译到另一类记录。</p>
        </fieldset>

        <div className="research-query-search">
          <Search aria-hidden="true" />
          <label htmlFor={searchInputId}>
            <strong>查询关键词</strong>
            <span id={searchHelpId}>{state.scope === "knowledge" ? "检索标题、作者、版本、来源说明或全文" : state.scope === "events" ? "检索事件标题、正文、标签或来源" : "检索别名、标签与研究正文"}</span>
          </label>
          <div className="research-query-search__control">
            <input
              ref={searchInputRef}
              id={searchInputId}
              type="search"
              enterKeyHint="search"
              maxLength={searchMaxLength}
              value={state.text}
              aria-describedby={`${searchHelpId} ${searchCountId}`}
              autoComplete="off"
              onChange={(event) => setState((current) => ({ ...current, text: event.target.value }))}
              placeholder="输入简体中文关键词；空格分隔的词全部满足"
            />
            <output id={searchCountId} htmlFor={searchInputId} aria-label={`已输入 ${searchCharacterCount} 个字符`}>{searchCharacterCount}/{searchMaxLength}</output>
            <button type="button" className="research-query-search__clear" disabled={!state.text} onClick={clearSearchText} aria-label="清空查询关键词" title="清空查询关键词">
              <X aria-hidden="true" />
            </button>
          </div>
        </div>

        {state.scope !== "knowledge" ? <LifecycleAndTags state={state} setState={setState} /> : (
          <ChoiceGrid legend="资料类型" values={knowledgeRecordTypeValues} selected={state.knowledgeRecordTypes} labels={{ bundled_knowledge_document: "随包资料", user_knowledge_document: "用户私有资料" }} onChange={(knowledgeRecordTypes) => setState((current) => ({ ...current, knowledgeRecordTypes }))} />
        )}

        <details className="research-query-advanced" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
          <summary>
            <SlidersHorizontal aria-hidden="true" />
            <span><strong>高级筛选</strong><small>组合条件跨组 AND，同组多选 OR</small></span>
            <span
              className="research-query-advanced-count"
              data-active={advancedGroupCount > 0}
              data-integrity={integrityIssues.length ? "error" : "ok"}
            >
              {integrityIssues.length
                ? `${integrityIssues.length} 项需处理`
                : advancedGroupCount
                  ? `${advancedGroupCount} 组启用`
                  : "默认"}
            </span>
          </summary>
          <div className="research-query-advanced-body">
            {state.scope === "cases" ? <CaseAdvancedFields state={state} setState={setState} availableRuleProfiles={availableRuleProfiles} /> : null}
            {state.scope === "events" ? <EventAdvancedFields state={state} setState={setState} /> : null}
            <SortFields state={state} setState={setState} />
          </div>
        </details>
      </fieldset>

      <div className="research-query-form-actions">
        <button type="submit" className="primary-action" disabled={!canSubmit} aria-busy={busy}><Filter aria-hidden="true" />{submitLabel}</button>
        <button type="button" className="secondary-action" disabled={busy} onClick={onReset}><RotateCcw aria-hidden="true" />恢复此范围默认条件</button>
        <small role="status" aria-live="polite" aria-atomic="true">
          {busy
            ? busyStatusMessage
            : integrityIssues.length
              ? "异常条件尚未处理，应用操作保持关闭；恢复默认不会写入或发布资料。"
              : "自由文本与完整查询只保存在当前会话草稿或本地保存视图，地址栏只含随机 UUID 引用。"}
        </small>
      </div>
    </form>
  );
}
