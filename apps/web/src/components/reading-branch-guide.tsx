import type { ReadingExplanationIndex } from "../lib/reading-explanation-index";

export function readingBranchLabel(branch: string) {
  return branch === "forward" ? "结果一（顺行）" : branch === "backward" ? "结果二（逆行）" : "其他计算结果";
}

/** Uses only the report's recorded input and rule, including when reopened. */
export function ReadingBranchGuide({ index, branches, selected, onChange, needed = false }: {
  index: ReadingExplanationIndex; branches: string[]; selected?: string;
  onChange: (branch: string | undefined) => void; needed?: boolean;
}) {
  if (branches.length < 2) return null;
  const rule = index.sourceSnapshot.ruleProfile.luckCycle as Record<string, unknown> | undefined;
  const knownRule = rule?.directionRule === "year_stem_yinyang_and_gender"
    && rule.unknownValuePolicy === "require_manual_direction";
  const unspecified = index.sourceSnapshot.input.sex === "unspecified";
  const source = index.sourceSnapshot;
  return <aside className="reading-explanation-limit" aria-label="两套结果的原因与查看方式">
    <strong>先分清：资料已记录，计算路径还未确定</strong>
    <dl className="reading-branch-known-unknown">
      <div><dt>已经知道</dt><dd>这里使用的是这份报告保存的出生资料和规则。</dd></div>
      <div><dt>尚未确定</dt><dd>{knownRule && unspecified ? "性别未填写，当前规则不能据此确定大运顺序。" : "现有资料和规则不足以确认哪套路径适用。"} 两套结果都需保留。</dd></div>
    </dl>
    <p>{knownRule && unspecified
      ? "这份报告的性别未填写。所用规则需要结合出生年的天干阴阳与性别确定大运顺序，因此保留两套计算结果。"
      : "这份报告保留了两套计算结果，尚不能据此指定其中一套适用于你。"}
      你可以先分别查看，或补充资料后再计算；查看某一套不代表已确认它正确。</p>
    <p>下一步可以补充实际资料，或只查看某一套的解释；查看不会修改已保存报告。</p>
    <a href={`/cases/${encodeURIComponent(source.caseId)}/revisions/${encodeURIComponent(source.revisionId)}/revise`}>补充资料</a>
    <details open={needed || Boolean(selected) || undefined}>
      <summary>先分别查看</summary>
      {knownRule ? <p>本报告采用的成立条件：出生年天干为阳且性别为男，或年干为阴且性别为女，对应结果一（顺行）；年干为阴且性别为男，或年干为阳且性别为女，对应结果二（逆行）。年干阴阳以排盘规则为准，不能用公历年份的单双数判断。</p>
        : <p>这份报告未记录可说明的顺逆规则，不能替它补猜成立条件；两套原结论仍分别保留。</p>}
      <label>分别查看结果<select value={selected ?? ""} onChange={event => onChange(event.target.value || undefined)}>
        <option value="">请选择要查看的一套，不是判定哪套正确</option>
        {branches.map(branch => <option key={branch} value={branch}>{readingBranchLabel(branch)}</option>)}
      </select></label>
      <p>两套结果独立阅读，不合并，也不自动挑选更有利的一套。补充资料会派生新修订，已保存报告仍保留当时内容。</p>
    </details>
  </aside>;
}
