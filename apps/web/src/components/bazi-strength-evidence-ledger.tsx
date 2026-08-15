import { useEffect, useMemo, useState } from "react";
import type { ChartFacts } from "@hakimi/contracts";
import {
  BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE,
  buildBaziStrengthEvidenceNarrative,
  type BaziInterpretationResult,
  type BaziStrengthClaim,
  type BaziStrengthClaimSource,
  type BaziStrengthClaimSourceBinding,
  type BaziStrengthEvidenceItem,
  type BaziStrengthEvidenceNarrativeResult,
  type StrengthSensitivityReview
} from "@hakimi/bazi-interpretation";
import { StatusPill } from "./status-pill";

type EvidenceState =
  | { bindingKey: string; status: "loading" }
  | { bindingKey: string; status: "ready"; result: BaziStrengthEvidenceNarrativeResult }
  | { bindingKey: string; status: "error"; message: string };

function categoryLabel(item: BaziStrengthEvidenceItem): string {
  if (item.category === "month_command") return "月令主气";
  if (item.category === "visible_stem") return item.status === "excluded_day_master" ? "日主透干（不重复计权）" : "透干";
  if (item.category === "first_hidden_stem") return "首位藏干";
  return "其余藏干";
}

function statusLabel(item: BaziStrengthEvidenceItem): string {
  if (item.status === "included") return item.direction === "support" ? "计入支持侧" : "计入需求侧";
  if (item.status === "excluded_day_master") return "日主锚点 · 不计权";
  return "时辰不可靠 · withheld";
}

function sourceLink(source: BaziStrengthClaimSource) {
  return source.url.startsWith("https://") ? (
    <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
  ) : (
    <strong>{source.title}</strong>
  );
}

function ClaimCard({
  claim,
  bindingById,
  sourceById
}: {
  claim: BaziStrengthClaim;
  bindingById: ReadonlyMap<string, BaziStrengthClaimSourceBinding>;
  sourceById: ReadonlyMap<string, BaziStrengthClaimSource>;
}) {
  const bindings = claim.sourceBindingIds.map((bindingId) => bindingById.get(bindingId));
  if (bindings.some((binding) => !binding)) {
    throw new Error(`旺衰主张 ${claim.claimId} 的来源定位无法解析`);
  }
  return (
    <article
      id={`bazi-strength-claim-${claim.order}`}
      className="bazi-strength-claim-card"
      data-claim-id={claim.claimId}
      data-claim-type={claim.claimType}
      data-tradition={claim.traditionScope.tradition}
      data-source-count={bindings.length}
      data-review-status={claim.reviewStatus}
      data-display-status={claim.displayStatus}
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-formal-activation-allowed="false"
      data-result="null"
    >
      <header>
        <div><small>Claim {String(claim.order).padStart(2, "0")} · {claim.claimType}</small><h4>{claim.candidateStatement}</h4></div>
        <StatusPill tone={claim.displayStatus === "withheld_pending_verified_locator_or_review" ? "warning" : "info"}>
          {claim.displayStatus === "withheld_pending_verified_locator_or_review" ? "来源待核 · 不启用" : "候选可追溯"}
        </StatusPill>
      </header>
      <code>{claim.claimId}</code>
      <div className="bazi-strength-claim-context">
        <section><strong>成立条件</strong><ul>{claim.applicabilityConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></section>
        <section><strong>反例／改写门</strong><ul>{claim.counterexamples.map((counterexample) => <li key={counterexample}>{counterexample}</li>)}</ul></section>
      </div>
      <ul className="bazi-strength-source-bindings" aria-label={`${claim.claimId} 来源定位`}>
        {(bindings as BaziStrengthClaimSourceBinding[]).map((binding) => {
          const source = sourceById.get(binding.sourceId);
          if (!source) throw new Error(`旺衰来源定位 ${binding.bindingId} 的来源无法解析`);
          return (
            <li
              key={binding.bindingId}
              data-binding-id={binding.bindingId}
              data-locator-verification={binding.exactLocator.verificationStatus}
              data-parameter-support={binding.parameterSupport}
            >
              <div>{sourceLink(source)}<span>{binding.evidenceRole}</span></div>
              <p><strong>定位：</strong>{binding.exactLocator.value}</p>
              <p><strong>可支持：</strong>{binding.supports}</p>
              <p><strong>不可支持：</strong>{binding.doesNotSupport.join("；")}</p>
              <small>{source.verificationStatus} · revision {source.stableRevision ?? "unfrozen"} · content hash:null</small>
            </li>
          );
        })}
      </ul>
      <small className="bazi-strength-claim-boundary">
        tradition:{claim.traditionScope.tradition} · expert truth:false · scientific validity:false · formal activation:false · result:null
      </small>
    </article>
  );
}

function EvidenceReady({ result }: { result: BaziStrengthEvidenceNarrativeResult }) {
  const claimById = useMemo(
    () => new Map(result.claims.map((claim) => [claim.claimId, claim] as const)),
    [result.claims]
  );
  const bindingById = useMemo(
    () => new Map(result.sourceBindings.map((binding) => [binding.bindingId, binding] as const)),
    [result.sourceBindings]
  );
  const sourceById = useMemo(
    () => new Map(result.sources.map((source) => [source.sourceId, source] as const)),
    [result.sources]
  );
  const crossing = result.scenarioComparisons.filter((scenario) => scenario.crossesBand);

  return (
    <>
      <dl className="bazi-strength-evidence-summary">
        <div><dt>当前分档</dt><dd>{result.classification.bandLabel}</dd><small>{result.classification.intervalNotation}</small></div>
        <div><dt>支持／需求</dt><dd>{result.classification.supportWeight} / {result.classification.demandWeight}</dd><small>逐项贡献复演</small></div>
        <div><dt>因素／证据项</dt><dd>{result.counts.includedFactors} / {result.counts.evidenceItems}</dd><small>排除与 withheld 单列</small></div>
        <div><dt>跨档场景</dt><dd>{result.counts.crossingScenarios} / {result.counts.scenarioComparisons}</dd><small>仅工程扰动</small></div>
      </dl>

      <p className="bazi-strength-classification-direct">{result.classification.directStatement}</p>
      <div className="bazi-strength-month-duplicate" data-duplicate-detected={result.duplicateMonthMain.detected}>
        <strong>月主气重复计权：{result.duplicateMonthMain.combinedPolicyWeight}</strong>
        <span>{result.duplicateMonthMain.directStatement}</span>
      </div>

      <ol className="bazi-strength-evidence-items" aria-label="当前盘旺衰逐项证据账">
        {result.evidenceItems.map((item) => (
          <li
            key={item.evidenceItemId}
            data-evidence-item-id={item.evidenceItemId}
            data-order={item.order}
            data-category={item.category}
            data-status={item.status}
            data-factor-id={item.factorId ?? "null"}
            data-group={item.policyFactorGroup ?? "null"}
            data-position={item.position}
            data-strength-direction={item.direction ?? "null"}
            data-weight={item.policyWeight ?? "null"}
            data-claim-count={item.claimIds.length}
            data-month-main-duplicate-role={item.duplicateRole ?? "none"}
            data-expert-truth-claimed="false"
            data-good-bad-orientation="null"
            data-result="null"
          >
            <article>
              <header>
                <div><small>{String(item.order).padStart(2, "0")} · {item.positionLabel}</small><h4>{categoryLabel(item)}</h4></div>
                <StatusPill tone={item.status === "included" ? "info" : "warning"}>{statusLabel(item)}</StatusPill>
              </header>
              <p>{item.directStatement}</p>
              <div className="bazi-strength-evidence-meta">
                <span>factor {item.factorId ?? "null"}</span>
                <span>{item.tenGod ?? "无十神"} · {item.policyWeight === null ? "不计权" : `权重 ${item.policyWeight}`}</span>
              </div>
              <nav aria-label={`${item.evidenceItemId} 主张绑定`}>
                {item.claimIds.map((claimId) => {
                  const claim = claimById.get(claimId);
                  if (!claim) throw new Error(`旺衰证据项引用未知主张：${claimId}`);
                  return <a key={claimId} href={`#bazi-strength-claim-${claim.order}`}>{`主张 ${String(claim.order).padStart(2, "0")}`}</a>;
                })}
              </nav>
              <small>{item.doesNotEstablish}</small>
            </article>
          </li>
        ))}
      </ol>

      <details className="bazi-strength-scenario-comparisons">
        <summary>
          <span><strong>哪些工程假设会令当前候选跨档</strong><small>{crossing.length ? `跨档：${crossing.map((item) => item.label).join("、")}` : "六场景均未跨档；这仍不证明规则正确"}</small></span>
          <StatusPill tone="info">{result.counts.crossingScenarios}/{result.counts.scenarioComparisons} 跨档</StatusPill>
        </summary>
        <div role="list" aria-label="旺衰跨档工程场景">
          {result.scenarioComparisons.map((scenario) => (
            <article
              key={scenario.scenarioId}
              role="listitem"
              data-scenario-id={scenario.scenarioId}
              data-crosses-band={scenario.crossesBand}
              data-crosses-direction={scenario.crossesDirection}
              data-official-rule-candidate="false"
              data-result="null"
            >
              <header><strong>{scenario.label}</strong><span>{scenario.baselineBand} → {scenario.scenarioBand}</span></header>
              <p>{scenario.directStatement}</p>
              <small>排除 {scenario.excludedFactorIds.length} · 重计权 {scenario.reweightedFactorIds.length} · support Δ {scenario.supportWeightDelta} · demand Δ {scenario.demandWeightDelta}</small>
            </article>
          ))}
        </div>
      </details>

      <details className="bazi-strength-claim-ledger">
        <summary>
          <span><strong>查看 12 条来源—主张账</strong><small>每条都有 locator、条件、反例与不可支持范围</small></span>
          <StatusPill tone="warning">{result.claims.filter((claim) => claim.displayStatus.startsWith("withheld")).length} 条待核</StatusPill>
        </summary>
        <div className="bazi-strength-claim-list">
          {result.claims.map((claim) => (
            <ClaimCard key={claim.claimId} claim={claim} bindingById={bindingById} sourceById={sourceById} />
          ))}
        </div>
      </details>

      <small className="bazi-strength-evidence-boundary">
        projection {result.profile.projectionVersion} · policy {result.bindings.strengthPolicyVersion} · claim registry {result.bindings.claimRegistryVersion} · review inheritance:false · network:false · mutation:false · expert truth:false · scientific validity:false · formal activation:false · good/bad:null · useful god:null · structure:null · event:null · result:null
      </small>
    </>
  );
}

export function BaziStrengthEvidenceLedgerPanel({
  facts,
  includeHour,
  interpretation,
  strengthSensitivity,
  bindingKey
}: {
  facts: ChartFacts;
  includeHour: boolean;
  interpretation: BaziInterpretationResult;
  strengthSensitivity: StrengthSensitivityReview;
  bindingKey: string;
}) {
  const [state, setState] = useState<EvidenceState>({ bindingKey, status: "loading" });

  useEffect(() => {
    let current = true;
    setState({ bindingKey, status: "loading" });
    void buildBaziStrengthEvidenceNarrative({ facts, includeHour, interpretation, strengthSensitivity })
      .then((result) => {
        if (current) setState({ bindingKey, status: "ready", result });
      })
      .catch((reason: unknown) => {
        if (!current) return;
        setState({
          bindingKey,
          status: "error",
          message: reason instanceof Error ? reason.message : "旺衰证据叙事无法完成完整性校验。"
        });
      });
    return () => {
      current = false;
    };
  }, [bindingKey, facts, includeHour, interpretation, strengthSensitivity]);

  const currentState = state.bindingKey === bindingKey ? state : { bindingKey, status: "loading" as const };
  const result = currentState.status === "ready" ? currentState.result : null;
  return (
    <section
      className="bazi-strength-evidence-ledger"
      aria-labelledby="bazi-strength-evidence-title"
      aria-busy={currentState.status === "loading"}
      data-projection-version={BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE.projectionVersion}
      data-content-version={BAZI_STRENGTH_EVIDENCE_NARRATIVE_PROFILE.contentVersion}
      data-binding-state={currentState.status}
      data-include-hour={includeHour}
      data-factor-count={result?.counts.includedFactors ?? 0}
      data-evidence-item-count={result?.counts.evidenceItems ?? 0}
      data-claim-count={result?.counts.claims ?? 0}
      data-withheld-position-count={result?.executionScope.withheldPositions.length ?? (includeHour ? 0 : 1)}
      data-strength-band={result?.classification.band ?? "null"}
      data-facts-sha256={result?.bindings.factsProjectionSha256 ?? "null"}
      data-strength-policy-sha256={result?.bindings.strengthPolicySha256 ?? "null"}
      data-strength-assessment-sha256={result?.bindings.strengthAssessmentSha256 ?? "null"}
      data-strength-sensitivity-sha256={result?.bindings.strengthSensitivitySha256 ?? "null"}
      data-claim-registry-sha256={result?.bindings.claimRegistrySha256 ?? "null"}
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-formal-activation-allowed="false"
      data-chart-or-storage-mutation-performed="false"
      data-good-bad-orientation="null"
      data-event-outcome="null"
      data-result="null"
    >
      <header>
        <div>
          <small>Source-bound strength evidence · v0.18</small>
          <h3 id="bazi-strength-evidence-title">旺衰为什么落在这一档</h3>
          <p>按“月令 → 全部透干 → 首位藏干 → 其余藏干”逐项展开；每句话可追到当前事实、工程政策、传统语境或待核复核门。</p>
        </div>
        <StatusPill tone={currentState.status === "error" ? "cinnabar" : currentState.status === "ready" ? "info" : "warning"}>
          {currentState.status === "ready" ? `${currentState.result.counts.includedFactors} 因素 · ${currentState.result.counts.claims} 主张` : currentState.status === "error" ? "完整性失败" : "正在建立绑定"}
        </StatusPill>
      </header>
      {currentState.status === "loading" ? <p className="bazi-strength-evidence-loading" role="status">正在从当前命盘与单一政策重新派生证据账…</p> : null}
      {currentState.status === "error" ? <p className="bazi-strength-evidence-error" role="alert">{currentState.message}</p> : null}
      {result ? <EvidenceReady result={result} /> : null}
    </section>
  );
}
