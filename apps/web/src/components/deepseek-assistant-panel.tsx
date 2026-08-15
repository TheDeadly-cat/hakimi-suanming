import { Bot, KeyRound, LoaderCircle, Send, X } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { RevisionRecord } from "@hakimi/contracts";
import {
  callDeepSeekAssistant,
  DEEPSEEK_MODELS,
  type DeepSeekAssistantResult,
  type DeepSeekFrozenFact,
  type DeepSeekModel
} from "../lib/deepseek-assistant";

function buildFrozenFacts(revision: RevisionRecord): DeepSeekFrozenFact[] {
  const year = revision.facts.pillars.year?.ganZhi;
  const month = revision.facts.pillars.month?.ganZhi;
  const day = revision.facts.pillars.day?.ganZhi;
  const hour = revision.facts.pillars.hour?.ganZhi;
  return [
    {
      label: "四柱",
      value: [year, month, day, hour].filter(Boolean).join(" "),
      sourceRef: `bazi-revision:${revision.revisionNumber}`
    },
    {
      label: "出生资料",
      value: `${revision.input.date}${revision.input.time ? ` ${revision.input.time}` : " 时辰未知"} · ${revision.timeCalibration.timeZone}`,
      sourceRef: "frozen input"
    },
    {
      label: "规则配置",
      value: revision.ruleProfile.label,
      sourceRef: `${revision.ruleProfile.profileId}@${revision.ruleProfile.profileVersion}`
    }
  ];
}

export function DeepSeekAssistantPanel({ revision }: { revision: RevisionRecord }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<DeepSeekModel>("deepseek-chat");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DeepSeekAssistantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const frozenFacts = useMemo(() => buildFrozenFacts(revision), [revision]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (apiKey.trim().length === 0 || question.trim().length === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const value = await callDeepSeekAssistant({
        apiKey,
        model,
        request: {
          question,
          frozenFacts,
          rulesIdentity: {
            profileId: revision.ruleProfile.profileId,
            profileVersion: revision.ruleProfile.profileVersion
          }
        },
        signal: controller.signal
      });
      setResult(value);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "DeepSeek 请求失败。");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  };

  const cancel = () => abortRef.current?.abort();

  return (
    <section className="flat-section deepseek-assistant-panel" aria-labelledby="deepseek-assistant-title">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">AI research assistant · BYOK</p>
          <h2 id="deepseek-assistant-title">AI 研究助手（DeepSeek）</h2>
        </div>
        <span className="status-pill status-pill--warning">默认关闭</span>
      </div>
      <div className="ai-boundary-note" role="note">
        <Bot aria-hidden="true" />
        <p>
          <strong>AI 生成内容不是专家真值，也不会写入 Revision 或数据库。</strong>
          只发送你当前核对的四柱、规则身份与问题；不发送别名、笔记、事件、附件或研究者资料。
          API Key 只保存在本次页面会话的内存里，关闭页面即消失。
        </p>
      </div>
      <form className="deepseek-assistant-form" onSubmit={submit}>
        <label className="field">
          <span>DeepSeek API Key <em>仅本次会话内存</em></span>
          <span className="input-with-icon"><KeyRound aria-hidden="true" />
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </span>
        </label>
        <label className="field">
          <span>模型</span>
          <select value={model} onChange={(event) => setModel(event.target.value as DeepSeekModel)}>
            {DEEPSEEK_MODELS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          <span>你的研究问题</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="例如：请只依据上方四柱与规则身份，列出需要核对的结构要点；不要重算或预测。"
            rows={4}
            maxLength={2_000}
            required
          />
        </label>
        <div className="button-row">
          <button type="submit" className="primary-action" disabled={busy || apiKey.trim().length === 0 || question.trim().length === 0}>
            {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            {busy ? "正在请求 DeepSeek…" : "发送到 DeepSeek"}
          </button>
          {busy ? <button type="button" className="secondary-action" onClick={cancel}><X aria-hidden="true" />取消请求</button> : null}
        </div>
      </form>
      {error ? <div className="inline-error" role="alert"><strong>DeepSeek 请求未完成</strong><p>{error}</p></div> : null}
      {result ? (
        <div className="deepseek-assistant-result" role="status">
          <div className="ai-result-warning"><strong>{result.warning}</strong><p>{result.scopeNote}</p></div>
          <p className="deepseek-assistant-content">{result.content}</p>
          <p className="muted-copy">DeepSeek {result.model} · {result.requestedAt} · 输入 {result.usage?.promptTokens ?? "未知"} tokens · 输出 {result.usage?.completionTokens ?? "未知"} tokens</p>
        </div>
      ) : null}
    </section>
  );
}
