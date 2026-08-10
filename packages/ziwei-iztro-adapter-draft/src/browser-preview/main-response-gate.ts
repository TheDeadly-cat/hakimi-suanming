import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  canonicalizeZiweiDigestJson,
  ziweiBirthInputDraftSchema,
  type ZiweiBirthInputDraft
} from "../contract-bridge.ts";
import {
  describeVerificationFailure,
  verifyZiweiBrowserEngineeringArtifactDraft,
  type ZiweiBrowserSourceIdentityDraft
} from "./browser-artifact.ts";
import {
  ZIWEI_BROWSER_PROBE_PROTOCOL,
  type BrowserProbeResponse
} from "./browser-protocol.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * Main-thread acceptance gate. The caller must not render any Worker data until this
 * function has strictly parsed the full Browser artifact and independently recomputed
 * all four canonical SHA-256 digests.
 */
export async function requireVerifiedBrowserProbeResponse(
  candidate: unknown,
  requestId: string,
  expectedInput: ZiweiBirthInputDraft,
  expectedBrowserSourceIdentity: ZiweiBrowserSourceIdentityDraft
): Promise<BrowserProbeResponse> {
  const response = requireRecord(candidate, "一次性 Worker 返回值不是对象") as Partial<BrowserProbeResponse>
    & Record<string, unknown>;
  if (response.protocolVersion !== ZIWEI_BROWSER_PROBE_PROTOCOL || response.requestId !== requestId) {
    throw new Error("一次性 Worker 的协议或请求身份不匹配");
  }
  if (typeof response.workerInstanceId !== "string" || !UUID_PATTERN.test(response.workerInstanceId)) {
    throw new Error("一次性 Worker 缺少规范实例身份");
  }
  requireCanonicalTimestamp(response.startedAt, "startedAt");
  requireCanonicalTimestamp(response.completedAt, "completedAt");
  if (Date.parse(response.completedAt as string) < Date.parse(response.startedAt as string)) {
    throw new Error("一次性 Worker 的完成时间早于开始时间");
  }

  if (response.ok === true) {
    requireExactKeys(response, [
      "ok", "protocolVersion", "requestId", "workerInstanceId", "startedAt", "completedAt", "result"
    ], "一次性 Worker 成功回包字段不完整");
    const result = requireRecord(response.result, "一次性 Worker 成功结果不是对象");
    requireExactKeys(
      result,
      ["artifact"],
      "一次性 Worker 成功结果字段不完整"
    );

    const verified = await verifyZiweiBrowserEngineeringArtifactDraft(result.artifact);
    if (!verified.success) {
      throw new Error(`Browser 工程工件验真失败：${describeVerificationFailure(verified)}`);
    }
    const artifact = verified.data;
    const normalizedInput = ziweiBirthInputDraftSchema.parse(expectedInput);
    if (artifact.contractVersion !== ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION
      || artifact.systemId !== ZIWEI_DOUSHU_SYSTEM_ID
      || canonicalizeZiweiDigestJson(artifact.input) !== canonicalizeZiweiDigestJson(normalizedInput)) {
      throw new Error("Browser 工程工件没有绑定本次主线程输入");
    }
    if (artifact.execution.requestId !== requestId
      || artifact.execution.workerInstanceId !== response.workerInstanceId
      || artifact.execution.startedAt !== response.startedAt
      || artifact.execution.completedAt !== response.completedAt) {
      throw new Error("Browser 工程工件的请求、Worker 或时间身份与回包信封不一致");
    }
    if (canonicalizeZiweiDigestJson(artifact.execution.browserSourceIdentity)
      !== canonicalizeZiweiDigestJson(expectedBrowserSourceIdentity)) {
      throw new Error("Browser 工程工件的源码图身份与当前主线程构建不一致");
    }

    return {
      ok: true,
      protocolVersion: ZIWEI_BROWSER_PROBE_PROTOCOL,
      requestId,
      workerInstanceId: response.workerInstanceId,
      startedAt: response.startedAt as string,
      completedAt: response.completedAt as string,
      result: { artifact }
    };
  }

  if (response.ok === false) {
    requireExactKeys(response, [
      "ok", "protocolVersion", "requestId", "workerInstanceId", "startedAt", "completedAt", "error"
    ], "一次性 Worker 失败回包字段不完整");
    const error = requireRecord(response.error, "一次性 Worker 失败结果不是对象");
    requireExactKeys(error, ["code", "message"], "一次性 Worker 失败结果字段不完整");
    if (typeof error.code === "string" && error.code.length > 0
      && typeof error.message === "string" && error.message.length > 0) {
      return response as BrowserProbeResponse;
    }
  }
  throw new Error("一次性 Worker 返回值不符合封闭协议");
}

function requireRecord(candidate: unknown, message: string): Record<string, any> {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error(message);
  return candidate as Record<string, any>;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[], message: string): void {
  const actual = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(sortedExpected)) throw new Error(message);
}

function requireCanonicalTimestamp(candidate: unknown, field: string): asserts candidate is string {
  if (typeof candidate !== "string" || Number.isNaN(Date.parse(candidate))
    || new Date(candidate).toISOString() !== candidate) {
    throw new Error(`一次性 Worker 的 ${field} 不是规范 UTC 时间`);
  }
}
