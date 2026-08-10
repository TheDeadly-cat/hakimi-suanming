/// <reference lib="webworker" />

const WORKER_PROTOCOL_VERSION = "western-astronomy-browser-parity/0.1-draft" as const;
const REQUEST_PROTOCOL_VERSION = "western-astronomy-utc-diagnostic-request/0.1-draft" as const;
const WORKER_TIMEOUT_MS = 20_000;
const WORKER_ISOLATION = "fresh_browser_worker_per_seed" as const;

export type WesternRulesPreviewBodyResult = Readonly<{
  bodyId: string;
  trueEclipticOfDate: Readonly<{ longitudeDeg: number; latitudeDeg: number; distanceAu: number }>;
  finiteDifference: Readonly<{ longitudeSpeedDegPerDay: number }>;
}>;

export type WesternRulesPreviewWorkerOutcome = Readonly<{
  engineTime: Readonly<{ utcInstant: string }>;
  bodies: readonly WesternRulesPreviewBodyResult[];
  audit: Readonly<{
    engineVersion: string;
    isolation: string;
    persistence: string;
    externalNetworkAccess: string;
    productionEligible: boolean;
    expertTruthClaimed: boolean;
  }>;
}>;

function requireRecord(candidate: unknown): Record<string, unknown> {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("browser worker response must be an object");
  }
  return candidate as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`browser worker response field ${key} is missing or invalid`);
  }
  return value;
}

export function validateWesternRulesPreviewResponse(
  candidate: unknown,
  requestId: string
): WesternRulesPreviewWorkerOutcome {
  const envelope = requireRecord(candidate);
  if (envelope.protocolVersion !== WORKER_PROTOCOL_VERSION || envelope.ok !== true) {
    throw new Error("browser worker response protocol or outcome is invalid");
  }
  if (envelope.requestId !== requestId) {
    throw new Error("browser worker response request identity does not round-trip");
  }
  const audit = requireRecord(envelope.audit);
  if (audit.engineVersion !== "2.1.19"
    || audit.isolation !== WORKER_ISOLATION
    || audit.persistence !== "none"
    || audit.externalNetworkAccess !== "forbidden_by_preview_csp"
    || audit.productionEligible !== false
    || audit.expertTruthClaimed !== false) {
    throw new Error("browser worker audit does not satisfy the isolated preview contract");
  }
  const result = requireRecord(envelope.result);
  const engineTime = requireRecord(result.engineTime);
  if (!Array.isArray(result.bodies) || result.bodies.length < 1) {
    throw new Error("browser worker returned no body positions");
  }
  const bodies = result.bodies.map((candidateBody) => {
    const body = requireRecord(candidateBody);
    const ecliptic = requireRecord(body.trueEclipticOfDate);
    const difference = requireRecord(body.finiteDifference);
    const longitude = ecliptic.longitudeDeg;
    const latitude = ecliptic.latitudeDeg;
    const distance = ecliptic.distanceAu;
    const speed = difference.longitudeSpeedDegPerDay;
    if (typeof longitude !== "number" || !Number.isFinite(longitude)
      || typeof latitude !== "number" || !Number.isFinite(latitude)
      || typeof distance !== "number" || !Number.isFinite(distance)
      || typeof speed !== "number" || !Number.isFinite(speed)) {
      throw new Error("browser worker body result contains non-finite values");
    }
    return {
      bodyId: requireString(body, "bodyId"),
      trueEclipticOfDate: { longitudeDeg: longitude, latitudeDeg: latitude, distanceAu: distance },
      finiteDifference: { longitudeSpeedDegPerDay: speed }
    };
  });
  return {
    engineTime: { utcInstant: requireString(engineTime, "utcInstant") },
    bodies,
    audit: {
      engineVersion: requireString(audit, "engineVersion"),
      isolation: requireString(audit, "isolation"),
      persistence: requireString(audit, "persistence"),
      externalNetworkAccess: requireString(audit, "externalNetworkAccess"),
      productionEligible: false,
      expertTruthClaimed: false
    }
  };
}

export async function runWesternRulesPreviewWorker(
  utcInstant: string,
  bodyIds: readonly string[]
): Promise<WesternRulesPreviewWorkerOutcome> {
  const requestId = crypto.randomUUID();
  const worker = new Worker(new URL("../../western-astronomy-engine-adapter-draft/src/browser-parity/browser-worker.ts", import.meta.url));
  return await new Promise((resolve, reject) => {
    let messageCount = 0;
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      void worker.terminate();
      reject(new Error(`browser worker exceeded ${WORKER_TIMEOUT_MS} ms`));
    }, WORKER_TIMEOUT_MS);

    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      messageCount += 1;
      if (settled || messageCount > 1) {
        void worker.terminate();
        return;
      }
      try {
        const outcome = validateWesternRulesPreviewResponse(event.data, requestId);
        settled = true;
        clearTimeout(timer);
        void worker.terminate();
        resolve(outcome);
      } catch (cause) {
        settled = true;
        clearTimeout(timer);
        void worker.terminate();
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      }
    });

    worker.addEventListener("error", (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      reject(new Error(event.message || "browser worker failed closed"));
    });

    worker.postMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      action: "calculate",
      requestId,
      request: {
        protocolVersion: REQUEST_PROTOCOL_VERSION,
        utcInstant,
        bodyIds: [...bodyIds]
      }
    });
  });
}
