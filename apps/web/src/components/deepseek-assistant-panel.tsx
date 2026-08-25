import { BotOff, Braces, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziInterpretationAiFaithfulnessV2Result } from "@hakimi/bazi-interpretation";
import type { LocalAiDraftValidationContext } from "../lib/local-ai-draft-validation";
import { StatusPill, type StatusPillTone } from "./status-pill";
import "./deepseek-assistant-panel.css";

type ContextState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "preparing" }>
  | Readonly<{ status: "ready"; context: LocalAiDraftValidationContext }>
  | Readonly<{ status: "failed"; message: string }>;

type ValidationState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "validating" }>
  | Readonly<{ status: "ready"; result: BaziInterpretationAiFaithfulnessV2Result }>
  | Readonly<{ status: "failed"; message: string }>;

const unsafeVisiblePattern =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]+/gu;

function safeVisibleText(value: unknown, fallback: string, maximumCharacters: number): string {
  const raw = typeof value === "string" ? value : fallback;
  const normalized = raw.replace(/\r\n?/gu, "\n").replace(unsafeVisiblePattern, " ").trim();
  const source = normalized || fallback;
  const characters = Array.from(source);
  if (characters.length <= maximumCharacters) return source;
  return `${characters.slice(0, Math.max(0, maximumCharacters - 8)).join("")}…[已截断]`;
}

function visibleFailure(reason: unknown, fallback: string): string {
  try {
    return safeVisibleText(reason instanceof Error ? reason.message : reason, fallback, 600);
  } catch {
    return fallback;
  }
}

function shortHash(value: string): string {
  return value.length <= 18 ? value : `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function ratio(value: number | null): string {
  return value === null ? "不适用" : `${Math.round(value * 100)}%`;
}

function LocalAiDraftValidator({ revision }: { revision: RevisionRecord }) {
  const panelId = useId();
  const titleId = `${panelId}-title`;
  const boundaryId = `${panelId}-boundary`;
  const contextTitleId = `${panelId}-context-title`;
  const draftId = `${panelId}-draft`;
  const draftHelpId = `${panelId}-draft-help`;
  const resultTitleId = `${panelId}-result-title`;
  const [contextState, setContextState] = useState<ContextState>({ status: "idle" });
  const [draftText, setDraftText] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>({ status: "idle" });
  const operationEpochRef = useRef(0);
  const mountedRef = useRef(true);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationEpochRef.current += 1;
    };
  }, []);

  const preparing = contextState.status === "preparing";
  const context = contextState.status === "ready" ? contextState.context : null;
  const validating = validationState.status === "validating";
  const validationResult = validationState.status === "ready" ? validationState.result : null;
  const busy = preparing || validating;
  const error = contextState.status === "failed"
    ? contextState.message
    : validationState.status === "failed"
      ? validationState.message
      : null;
  const visibleLegacyAssertions = validationResult?.legacyResult.assertions.filter(
    (assertion) => (
      (assertion.displayStatus === "visible_with_evidence"
        || assertion.displayStatus === "visible_with_caveat")
      && typeof assertion.canonicalContent === "string"
      && assertion.canonicalContent.trim().length > 0
    )
  ) ?? [];
  const visibleTimeAssertions = validationResult?.timeAssertions.filter(
    (assertion) => (
      assertion.displayStatus === "visible_with_caveat"
      && typeof assertion.canonicalContent === "string"
      && assertion.canonicalContent.trim().length > 0
    )
  ) ?? [];
  const totalAssertions = validationResult
    ? validationResult.legacyResult.assertions.length + validationResult.timeAssertions.length
    : 0;
  const displayableAssertions = visibleLegacyAssertions.length + visibleTimeAssertions.length;
  const withheldAssertions = totalAssertions - displayableAssertions;
  const status: { label: string; tone: StatusPillTone } = preparing
    ? { label: "正在重建证据上下文", tone: "info" }
    : validating
      ? { label: "正在本机验证", tone: "info" }
      : error
        ? { label: "本机失败关闭", tone: "cinnabar" }
        : validationResult
          ? { label: "本机校验完成", tone: "warning" }
          : { label: "联网保持关闭", tone: "warning" };

  useEffect(() => {
    if (validationResult) resultRef.current?.focus();
  }, [validationResult]);

  const prepareContext = async () => {
    if (busy) return;
    const epoch = operationEpochRef.current + 1;
    operationEpochRef.current = epoch;
    setContextState({ status: "preparing" });
    setValidationState({ status: "idle" });
    try {
      const { prepareLocalAiDraftValidationContext } =
        await import("../lib/local-ai-draft-validation");
      const prepared = await prepareLocalAiDraftValidationContext(revision);
      if (!mountedRef.current || operationEpochRef.current !== epoch) return;
      setContextState({ status: "ready", context: prepared });
      setDraftText(prepared.draftTemplateText);
    } catch (reason) {
      if (!mountedRef.current || operationEpochRef.current !== epoch) return;
      setContextState({
        status: "failed",
        message: visibleFailure(reason, "当前 Revision 无法形成可验证的本机 AI 上下文。")
      });
    }
  };

  const validateDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (!context || busy) return;
    const epoch = operationEpochRef.current + 1;
    operationEpochRef.current = epoch;
    const draftSnapshot = draftText;
    setValidationState({ status: "validating" });
    try {
      const { validateLocalAiDraftText } = await import("../lib/local-ai-draft-validation");
      const result = await validateLocalAiDraftText(context, draftSnapshot);
      if (!mountedRef.current || operationEpochRef.current !== epoch) return;
      setValidationState({ status: "ready", result });
    } catch (reason) {
      if (!mountedRef.current || operationEpochRef.current !== epoch) return;
      setValidationState({
        status: "failed",
        message: visibleFailure(reason, "AI 断言草稿没有通过当前本机验证合同。")
      });
    }
  };

  return (
    <section
      className="flat-section deepseek-assistant-panel local-ai-draft-validator"
      aria-labelledby={titleId}
      aria-describedby={boundaryId}
      aria-busy={busy}
      data-state={validationResult ? "draft_ready" : error ? "failed" : busy ? "processing" : "idle"}
      data-provider-outbound="blocked"
      data-provider-outbound-authorized="false"
      data-provider-network-transmission-performed="false"
      data-user-data-network-transmission-performed="false"
      data-provider-call-capability="absent"
      data-ai-draft-persisted="false"
      data-local-write-performed="false"
      data-record-write-state="not_started"
      data-mutation-epoch-available="false"
      data-mutation-epoch-bypassed="false"
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-target-schema="13"
      data-db-generation="legacy-v13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-public-release-authorized="false"
      data-expert-truth-established="false"
      data-scientific-validity-established="false"
    >
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Local AI draft validator · no provider call</p>
          <h2 id={titleId}>本机 AI 断言草稿验证器</h2>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      <div className="ai-boundary-note" role="note">
        <span className="ai-boundary-note__icon" aria-hidden="true"><BotOff /></span>
        <p id={boundaryId}>
          <strong>默认 legacy-v13 没有可复核的 mutation epoch，应用内 DeepSeek 外发已关闭。</strong>
          本工具只在当前页面内重建不可变证据 Envelope，并验证你粘贴的结构化断言草稿；不请求 API Key、不调用 Provider、不写 Revision、数据库或 Web Storage。你若把上下文复制到本应用之外，属于另一次由你控制的数据处理，本工具无法替第三方提供隐私保证。
        </p>
        <dl className="ai-boundary-ledger" aria-label="本机 AI 验证权限边界">
          <div><dt>Provider</dt><dd>不调用</dd></div>
          <div><dt>用户数据外发</dt><dd>关闭</dd></div>
          <div><dt>输入</dt><dd>严格 JSON</dd></div>
          <div><dt>持久化</dt><dd>无</dd></div>
          <div><dt>显示</dt><dd>仅白名单逐字匹配项</dd></div>
          <div><dt>Mutation epoch</dt><dd>v13 不可用</dd></div>
        </dl>
        <div className="ai-boundary-contract" aria-label="AI 验证发布基线">
          <span>Release baseline</span>
          <strong>legacy-v13 / targetSchema 13 / migrationId null</strong>
          <small>结构匹配只是本机构件证据，不建立专家真值、科学有效性或公开发布授权。</small>
        </div>
      </div>

      <div className="deepseek-assistant-workspace local-ai-workspace">
        <aside className="deepseek-frozen-context local-ai-context" aria-labelledby={contextTitleId}>
          <header>
            <p className="eyebrow">Verified context</p>
            <h3 id={contextTitleId}>当前 Revision 的验证上下文</h3>
            <p>准备操作会先复演当前 Revision，再计算固定七点民用时间扰动并构建 Envelope v2；任一步不一致都会失败关闭。</p>
          </header>
          <div className="local-ai-context-body">
            <button type="button" className="primary-action" onClick={() => void prepareContext()} disabled={busy} aria-busy={preparing}>
              {preparing ? <LoaderCircle className="spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {preparing ? "正在准备上下文" : context ? "重新准备并清空结果" : "准备本机验证上下文"}
            </button>
            {context ? (
              <>
                <dl className="local-ai-binding-ledger" aria-label="本机验证上下文绑定">
                  <div><dt>Revision</dt><dd>R{context.revisionNumber}</dd></div>
                  <div><dt>result hash</dt><dd><code title={context.revisionResultHash}>{shortHash(context.revisionResultHash)}</code></dd></div>
                  <div><dt>Envelope v2</dt><dd><code title={context.envelope.integrity.payloadSha256}>{shortHash(context.envelope.integrity.payloadSha256)}</code></dd></div>
                  <div><dt>时间扰动</dt><dd>{context.envelope.timePerturbation.calculatedOffsetsMinutes.length} 已算 / {context.envelope.timePerturbation.blockedOffsets.length} 阻断</dd></div>
                </dl>
                <label className="field local-ai-json-field">
                  <span>供外部工具读取的本机上下文 <em>含派生命盘敏感数据</em></span>
                  <textarea value={context.contextPacketText} readOnly rows={12} spellCheck={false} aria-label="本机 AI 验证上下文 JSON" />
                </label>
                <p className="deepseek-frozen-context__footer">上下文不复制原始出生输入，但含派生四柱、规则和证据文本；“没有原始输入”不等于匿名。</p>
              </>
            ) : <p className="local-ai-empty-state">尚未生成上下文。验证模块只在你点击后按需加载；页面不会在后台调用 AI Provider，也不会传输命盘上下文或草稿。</p>}
          </div>
        </aside>

        <form className="deepseek-assistant-form local-ai-draft-form" onSubmit={validateDraft}>
          <div className="local-ai-form-heading">
            <Braces aria-hidden="true" />
            <div><small>Closed assertion grammar</small><strong>粘贴结构化断言草稿</strong></div>
          </div>
          <label className="field local-ai-json-field" htmlFor={draftId}>
            <span>AI assertion draft JSON <em>{draftText.length} / 65536</em></span>
            <textarea
              id={draftId}
              value={draftText}
              onChange={(event) => {
                setDraftText(event.target.value);
                setValidationState({ status: "idle" });
              }}
              disabled={!context || busy}
              rows={18}
              maxLength={65_536}
              spellCheck={false}
              aria-describedby={draftHelpId}
              placeholder="先准备上下文；系统会填入与当前 Envelope 绑定的空白草稿模板。"
            />
          </label>
          <p id={draftHelpId} className="deepseek-assistant-submit-note">只验证封闭断言语法与规范逐字绑定。自由解释、未知引用、吉凶、用神、事件结果、专家真值和科学有效性声明不会显示；本页不会渲染 Provider 原始自由文本。</p>
          <div className="deepseek-submit-readiness" data-state={context && draftText.trim() && !busy ? "ready" : "blocked"} role="status" aria-live="polite">
            <span>LOCAL VALIDATION GATE</span>
            <strong>{context ? "当前草稿将绑定已重建 Envelope" : "先准备当前 Revision 上下文"}</strong>
            <small>{validating ? "正在逐项复核" : "零 Provider 外发 · 零持久化 · 仅白名单逐字匹配项可见"}</small>
          </div>
          <div className="button-row">
            <button type="submit" className="primary-action" disabled={!context || busy || !draftText.trim()} aria-busy={validating}>
              {validating ? <LoaderCircle className="spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {validating ? "正在本机验证" : "验证结构化草稿"}
            </button>
          </div>
        </form>
      </div>

      {error ? <div className="inline-error" role="alert"><strong>本机验证保持关闭</strong><p>{error}</p></div> : null}

      {validationResult ? (
        <div ref={resultRef} className="deepseek-assistant-result local-ai-validation-result" role="region" aria-labelledby={resultTitleId} tabIndex={-1} data-ai-origin="user_supplied_structured_draft" data-persisted="false" data-visible-assertions={displayableAssertions} data-withheld-assertions={withheldAssertions} data-expert-truth-claimed="false">
          <header className="deepseek-assistant-result__heading">
            <div><p className="eyebrow">Local deterministic check</p><h3 id={resultTitleId}>结构化草稿验证结果</h3></div>
            <StatusPill tone="warning">仅工程引用闭合</StatusPill>
          </header>
          <div className="local-ai-result-metrics" aria-label="AI 草稿验证计数">
            <div><span>全部断言</span><strong>{totalAssertions}</strong></div>
            <div><span>允许显示</span><strong>{displayableAssertions}</strong></div>
            <div><span>保持隐藏</span><strong>{withheldAssertions}</strong></div>
            <div><span>legacy 覆盖率</span><strong>{ratio(validationResult.legacyResult.coverage.coverageRatio)}</strong></div>
            <div><span>legacy 忠实率</span><strong>{ratio(validationResult.legacyResult.coverage.faithfulnessRatio)}</strong></div>
            <div><span>跨分区比率</span><strong>不生成</strong></div>
          </div>
          {displayableAssertions ? (
            <ol className="local-ai-visible-assertions" aria-label="允许显示的结构化断言">
              {visibleLegacyAssertions.map((assertion) => (
                <li key={`legacy:${assertion.assertionRef}`}>
                  <div><small>legacy · {safeVisibleText(assertion.family, "未知 family", 80)}</small><StatusPill tone="info">{assertion.verdict === "supported" ? "逐字匹配" : safeVisibleText(assertion.verdict, "未知", 40)}</StatusPill></div>
                  <p>{safeVisibleText(assertion.canonicalContent, "规范内容不可显示", 2_000)}</p>
                  <span>{safeVisibleText(assertion.rationale, "本机校验未提供说明。", 600)}</span>
                </li>
              ))}
              {visibleTimeAssertions.map((assertion) => (
                <li key={`time:${assertion.assertionRef}`}>
                  <div><small>time · {safeVisibleText(assertion.family, "未知 family", 80)}</small><StatusPill tone="warning">{safeVisibleText(assertion.verdict, "未知", 40)}</StatusPill></div>
                  <p>{safeVisibleText(assertion.canonicalContent, "规范内容不可显示", 2_000)}</p>
                  <span>{safeVisibleText(assertion.rationale, "本机校验未提供说明。", 600)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="local-ai-no-visible-claims">当前草稿没有可显示的机器可核断言。比例显示“不适用”，不会生成伪 100%。</p>}
          <div className="ai-result-warning"><strong>{withheldAssertions} 条断言保持隐藏；原始自由文本不会回显。</strong><p>允许显示项只说明逐字绑定当前 verified Envelope；不说明解读质量、术数正确、专家批准、科学有效或公开发布授权。</p></div>
          <dl className="deepseek-assistant-result__meta">
            <div><dt>Envelope</dt><dd><code>{shortHash(validationResult.binding.envelopeV2PayloadSha256)}</code></dd></div>
            <div><dt>草稿摘要</dt><dd><code>{shortHash(validationResult.binding.outerDraftSha256)}</code></dd></div>
            <div><dt>时间投影范围</dt><dd>{validationResult.timeAssessment.projectionScope}</dd></div>
            <div><dt>解释稳定性</dt><dd>not_assessed</dd></div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}

export function DeepSeekAssistantPanel({ revision }: { revision: RevisionRecord }) {
  const key = `${revision.id}:${revision.revisionNumber}:${revision.manifest.resultHash}`;
  return <LocalAiDraftValidator key={key} revision={revision} />;
}
