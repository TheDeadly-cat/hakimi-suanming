/// <reference lib="webworker" />

import {
  vedicInputDraftSchema,
  vedicInputDraftSchemaIdentity
} from "virtual:vedic-input-draft-schema";
import { runFixedVedicInputPreflight } from "./preflight.ts";
import {
  createVedicInputPreflightFailureResponse,
  createVedicInputPreflightSuccessResponse,
  requireVedicInputPreflightRequest
} from "./protocol.ts";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<unknown>) => {
  void handleOnce(event.data);
}, { once: true });

async function handleOnce(candidate: unknown): Promise<void> {
  let requestId: string | null = null;
  try {
    const request = requireVedicInputPreflightRequest(candidate);
    requestId = request.requestId;
    const result = await runFixedVedicInputPreflight({
      identity: vedicInputDraftSchemaIdentity,
      schema: vedicInputDraftSchema
    });
    workerScope.postMessage(createVedicInputPreflightSuccessResponse(requestId, result));
  } catch (cause) {
    const code = cause instanceof Error && "code" in cause
      && (cause as { code?: unknown }).code === "PREFLIGHT_REQUEST_INVALID"
      ? "PREFLIGHT_REQUEST_INVALID"
      : "PREFLIGHT_EXECUTION_FAILED";
    workerScope.postMessage(createVedicInputPreflightFailureResponse(requestId, code));
  } finally {
    workerScope.close();
  }
}
