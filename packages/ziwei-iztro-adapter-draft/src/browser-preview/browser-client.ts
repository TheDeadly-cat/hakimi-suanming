import {
  ZIWEI_BROWSER_PROBE_PROTOCOL,
  type BrowserProbeRequest,
  type BrowserProbeSuccessResult
} from "./browser-protocol.ts";
import { requireVerifiedBrowserProbeResponse } from "./main-response-gate.ts";
import browserSourceIdentity from "./generated-browser-source-identity.ts";
import type { ZiweiBirthInputDraft } from "../contract-bridge.ts";

export { createZiweiBrowserDisplayProjection } from "./display-projection.ts";
export {
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_FILENAME,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_MAX_BYTES,
  createZiweiNatalTransformationPalaceReviewFeedbackTemplate,
  preflightZiweiNatalTransformationPalaceReviewFeedback,
  serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate
} from "./natal-transformation-palace-review-feedback.ts";
export {
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES,
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE,
  createZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  preflightZiweiCoreMinorStarSanfangReviewFeedback,
  serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  ziweiCoreMinorStarSanfangReviewFeedbackFilename
} from "./core-minor-star-sanfang-review-feedback.ts";
export type {
  BrowserProbeDisplayProjection,
  BrowserProbeSuccessResult
} from "./browser-protocol.ts";
export type {
  ZiweiNatalTransformationPalaceReviewFeedbackEnvelope,
  ZiweiNatalTransformationPalaceReviewFeedbackPreflight,
  ZiweiNatalTransformationPalaceReviewItem
} from "./natal-transformation-palace-review-feedback.ts";
export type {
  ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope,
  ZiweiCoreMinorStarSanfangReviewFeedbackItem,
  ZiweiCoreMinorStarSanfangReviewFeedbackPreflight
} from "./core-minor-star-sanfang-review-feedback.ts";

export type ZiweiBrowserCalculationOptions = Readonly<{
  timeoutMs?: number;
  signal?: AbortSignal;
}>;

/**
 * Run exactly one request in a newly-created module Worker. The verified
 * engineering artifact is returned only after the host gate re-parses the
 * response and recomputes its bound digests.
 */
export function calculateZiweiInFreshBrowserWorker(
  input: ZiweiBirthInputDraft,
  options: ZiweiBrowserCalculationOptions = {}
): Promise<BrowserProbeSuccessResult> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    return Promise.reject(new Error("一次性 Worker 超时时间必须是 1 至 60000 毫秒的整数"));
  }
  if (options.signal?.aborted) {
    return Promise.reject(new Error("一次性 Worker 计算已取消"));
  }

  const requestId = crypto.randomUUID();
  const request: BrowserProbeRequest = {
    protocolVersion: ZIWEI_BROWSER_PROBE_PROTOCOL,
    requestId,
    action: "calculate",
    input
  };

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./browser-worker.ts", import.meta.url), {
      type: "module",
      name: `hakimi-ziwei-${requestId}`
    });
    let settled = false;
    let messageCount = 0;

    const cleanup = (): void => {
      globalThis.clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };
    const finish = (failure: Error | null, result?: BrowserProbeSuccessResult): void => {
      if (settled) return;
      settled = true;
      cleanup();
      if (failure) reject(failure);
      else if (result) resolve(result);
      else reject(new Error("一次性 Worker 没有返回结构化结果"));
    };
    const onAbort = (): void => finish(new Error("一次性 Worker 计算已取消"));
    const timeout = globalThis.setTimeout(
      () => finish(new Error(`计算超过 ${Math.ceil(timeoutMs / 1000)} 秒，已关闭一次性 Worker`)),
      timeoutMs
    );

    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) {
      onAbort();
      return;
    }

    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      messageCount += 1;
      if (messageCount !== 1) {
        finish(new Error("一次性 Worker 返回了多条消息，结果已拒绝"));
        return;
      }
      void (async () => {
        try {
          const response = await requireVerifiedBrowserProbeResponse(
            event.data,
            requestId,
            input,
            browserSourceIdentity
          );
          if (!response.ok) {
            finish(new Error(`${response.error.code}：${response.error.message}`));
            return;
          }
          finish(null, response.result);
        } catch (cause) {
          finish(cause instanceof Error ? cause : new Error(String(cause)));
        }
      })();
    });
    worker.addEventListener(
      "messageerror",
      () => finish(new Error("一次性 Worker 返回了无法读取的消息")),
      { once: true }
    );
    worker.addEventListener("error", (event) => {
      event.preventDefault();
      finish(new Error(event.message || "一次性 Worker 运行失败"));
    }, { once: true });
    worker.postMessage(request);
  });
}
