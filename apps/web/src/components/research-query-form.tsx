import { Filter, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { TransitNodeType } from "@hakimi/contracts";
import {
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  RELATION_TYPES,
  TRANSIT_NODE_TYPES,
  defaultResearchQuery,
  researchQueryToFormState,
  type ResearchQueryFormState,
  type ResearchRuleProfileOption,
  type ResearchQueryScope,
} from "../lib/research-query-form";

type Props = {
  state: ResearchQueryFormState;
  setState: Dispatch<SetStateAction<ResearchQueryFormState>>;
  availableRuleProfiles: ResearchRuleProfileOption[];
  busy: boolean;
  onSubmit: () => void;
  onReset: () => void;
};

const scopeOptions: Array<{ value: ResearchQueryScope; label: string; help: string }> = [
  { value: "cases", label: "正式命盘", help: "按确切 Revision、确定性干支关系、规则配置快照、事件与运限检索" },
  { value: "candidate_sets", label: "候选组", help: "只按候选组元数据、收藏与生命周期检索" },
  { value: "events", label: "真实事件", help: "独立检索事件正文、反馈与绑定上下文" },
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

function toggleValue(values: string[], value: string, checked: boolean): string[] {
  return checked ? [...new Set([...values, value])] : values.filter((item) => item !== value);
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
  return (
    <fieldset className="research-query-choice-group">
      <legend>{legend}</legend>
      <div className="research-query-choice-grid">
        {values.map((value) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={(event) => onChange(toggleValue(selected, value, event.target.checked))}
            />
            <span>{labels?.[value] ?? value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FeedbackFields({ state, setState }: Pick<Props, "state" | "setState">) {
  return (
    <ChoiceGrid
      legend="反馈状态"
      values={["unreviewed", "supports", "contradicts", "mixed"]}
      selected={state.feedbacks}
      labels={{ unreviewed: "未复核", supports: "支持", contradicts: "反例", mixed: "混合" }}
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
      <fieldset className="research-query-choice-group">
        <legend>规则配置快照</legend>
        {availableRuleProfiles.length ? (
          <div className="research-query-rule-list">
            {availableRuleProfiles.map((profile) => (
              <label key={profile.digest}>
                <input
                  type="checkbox"
                  checked={state.ruleProfileDigests.includes(profile.digest)}
                  onChange={(event) => setState((current) => ({
                    ...current,
                    ruleProfileDigests: toggleValue(current.ruleProfileDigests, profile.digest, event.target.checked),
                  }))}
                />
                <span><strong>{profile.label}</strong><small>{profile.version} · {profile.digest.slice(0, 12)}…</small></span>
              </label>
            ))}
          </div>
        ) : <p className="research-query-field-help">当前本地数据还没有可列出的正式 Revision 规则配置快照。</p>}
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
              <label className="field"><span>目标瞬时点（UTC）</span><input type="datetime-local" step="60" value={state.transitUtcMinute} onChange={(event) => setState((current) => ({ ...current, transitUtcMinute: event.target.value }))} /><small>明确按 UTC 解释，并规范化为三位毫秒。</small></label>
              <label className="field"><span>未指定性别时顺逆</span><select value={state.manualDirection} onChange={(event) => setState((current) => ({ ...current, manualDirection: event.target.value as ResearchQueryFormState["manualDirection"] }))}><option value="">不推断</option><option value="forward">顺行</option><option value="backward">逆行</option></select></label>
            </div>
            <div className="research-query-transit-list">
              {TRANSIT_NODE_TYPES.map((nodeType) => {
                const match = state.transitMatches[nodeType];
                return (
                  <div key={nodeType} className={match.enabled ? "is-enabled" : ""}>
                    <label><input type="checkbox" checked={match.enabled} onChange={(event) => setState((current) => ({ ...current, transitMatches: { ...current.transitMatches, [nodeType]: { ...current.transitMatches[nodeType], enabled: event.target.checked } } }))} /><span>{transitLabels[nodeType]}</span></label>
                    <label><span className="sr-only">{transitLabels[nodeType]}干支</span><input disabled={!match.enabled} maxLength={2} value={match.ganZhi} onChange={(event) => setState((current) => ({ ...current, transitMatches: { ...current.transitMatches, [nodeType]: { ...current.transitMatches[nodeType], ganZhi: event.target.value } } }))} placeholder="干支" /></label>
                    <label><span className="sr-only">{transitLabels[nodeType]}天干十神</span><input disabled={!match.enabled} maxLength={20} value={match.stemTenGod} onChange={(event) => setState((current) => ({ ...current, transitMatches: { ...current.transitMatches, [nodeType]: { ...current.transitMatches[nodeType], stemTenGod: event.target.value } } }))} placeholder="十神" /></label>
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
          <label className="field"><span>Case UUID</span><input className="mono" value={state.contextCaseId} onChange={(event) => setState((current) => ({ ...current, contextCaseId: event.target.value }))} /></label>
          {state.eventBindingKind !== "context_case" ? <label className="field"><span>Revision UUID</span><input className="mono" value={state.contextRevisionId} onChange={(event) => setState((current) => ({ ...current, contextRevisionId: event.target.value }))} /></label> : null}
          {state.eventBindingKind === "context_node" ? <><label className="field"><span>节点轨道</span><select value={state.contextNodeType} onChange={(event) => setState((current) => ({ ...current, contextNodeType: event.target.value as TransitNodeType }))}>{TRANSIT_NODE_TYPES.map((nodeType) => <option key={nodeType} value={nodeType}>{transitLabels[nodeType]}</option>)}</select></label><label className="field research-query-wide-field"><span>稳定 nodeId</span><input className="mono" value={state.contextNodeId} onChange={(event) => setState((current) => ({ ...current, contextNodeId: event.target.value }))} /></label></> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ResearchQueryForm({ state, setState, availableRuleProfiles, busy, onSubmit, onReset }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(() => typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 768px)").matches : true);
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(); };
  const changeScope = (scope: ResearchQueryScope) => setState(researchQueryToFormState(defaultResearchQuery(scope)));

  return (
    <form className="research-query-form" onSubmit={submit}>
      <fieldset className="research-query-scope-tabs">
        <legend>检索范围</legend>
        <div>
          {scopeOptions.map((option) => <label key={option.value}><input type="radio" name="research-query-scope" value={option.value} checked={state.scope === option.value} onChange={() => changeScope(option.value)} /><span><strong>{option.label}</strong><small>{option.help}</small></span></label>)}
        </div>
      </fieldset>

      <label className="research-query-search">
        <Search aria-hidden="true" />
        <span>{state.scope === "knowledge" ? "检索标题、作者、版本、来源说明或全文" : state.scope === "events" ? "检索事件标题、正文、标签或来源" : "检索别名、标签与研究正文"}</span>
        <input type="search" maxLength={500} value={state.text} onChange={(event) => setState((current) => ({ ...current, text: event.target.value }))} placeholder="输入简体中文关键词；空格分隔的词全部满足" />
      </label>

      {state.scope !== "knowledge" ? <LifecycleAndTags state={state} setState={setState} /> : (
        <ChoiceGrid legend="资料类型" values={["bundled_knowledge_document", "user_knowledge_document"]} selected={state.knowledgeRecordTypes} labels={{ bundled_knowledge_document: "随包资料", user_knowledge_document: "用户私有资料" }} onChange={(knowledgeRecordTypes) => setState((current) => ({ ...current, knowledgeRecordTypes }))} />
      )}

      <details className="research-query-advanced" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
        <summary><SlidersHorizontal aria-hidden="true" /><span><strong>高级筛选</strong><small>组合条件跨组 AND，同组多选 OR</small></span></summary>
        <div className="research-query-advanced-body">
          {state.scope === "cases" ? <CaseAdvancedFields state={state} setState={setState} availableRuleProfiles={availableRuleProfiles} /> : null}
          {state.scope === "events" ? <EventAdvancedFields state={state} setState={setState} /> : null}
          <SortFields state={state} setState={setState} />
        </div>
      </details>

      <div className="research-query-form-actions">
        <button type="submit" className="primary-action" disabled={busy}><Filter aria-hidden="true" />{busy ? "正在执行" : "应用筛选"}</button>
        <button type="button" className="secondary-action" disabled={busy} onClick={onReset}><RotateCcw aria-hidden="true" />恢复此范围默认条件</button>
        <small>自由文本与完整查询只保存在当前会话草稿或本地保存视图，地址栏只含随机 UUID 引用。</small>
      </div>
    </form>
  );
}
