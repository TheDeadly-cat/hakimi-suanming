import {
  westernAstronomyDiagnosticEnvelopeSchema,
  type WesternAstronomyDiagnosticEnvelope
} from "../index.ts";
import {
  createHorizonsDifferentialReport,
  failedHorizonsDifferentialReport,
  horizonsDifferentialReportSchema,
  type HorizonsDifferentialReport
} from "./differential-report.ts";
import { verifyHorizonsResponseCandidate } from "./official-response.ts";

export {
  HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  buildHorizonsQueryUrl,
  horizonsDifferentialQueryManifest
} from "./query-manifest.ts";
export {
  HORIZONS_DIFFERENTIAL_REPORT_VERSION,
  computeHorizonsDeltas,
  createHorizonsDifferentialReport,
  failedHorizonsDifferentialReport,
  HORIZONS_DIFFERENTIAL_REQUEST_FIELDS,
  isMechanicallyProducedHorizonsDifferentialReport,
  horizonsDifferentialReportSchema
} from "./differential-report.ts";
export {
  isMechanicallyVerifiedHorizonsResponse,
  parseHorizonsVectorRows,
  verifyHorizonsResponseCandidate,
  verifyOfficialHorizonsResponse
} from "./official-response.ts";
export type {
  HorizonsResponseEvidenceRecord,
  HorizonsResponseMetadata,
  HorizonsVectorRow,
  MechanicallyVerifiedHorizonsResponse,
  OfficialHorizonsEvidenceRecord,
  VerifiedHorizonsResponse
} from "./official-response.ts";
export type {
  HorizonsDifferentialReport,
  MechanicallyProducedHorizonsDifferentialReport
} from "./differential-report.ts";

export function runHorizonsDifferential(input: {
  bytes: Uint8Array;
  evidenceRecord: unknown;
  astronomyEnvelope: unknown;
}): HorizonsDifferentialReport {
  try {
    return runHorizonsDifferentialInternal(input);
  } catch (cause) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_DIFFERENTIAL_INPUT_INVALID",
      cause instanceof Error ? cause.message : String(cause)
    );
  }
}

function runHorizonsDifferentialInternal(input: unknown): HorizonsDifferentialReport {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_DIFFERENTIAL_INPUT_INVALID",
      "the Horizons differential input must be a plain object"
    );
  }
  const prototype = Object.getPrototypeOf(input);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if ((prototype !== Object.prototype && prototype !== null)
    || keys.length !== 3
    || !keys.includes("bytes")
    || !keys.includes("evidenceRecord")
    || !keys.includes("astronomyEnvelope")
    || !("value" in (descriptors.bytes ?? {}))
    || !("value" in (descriptors.evidenceRecord ?? {}))
    || !("value" in (descriptors.astronomyEnvelope ?? {}))) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_DIFFERENTIAL_INPUT_INVALID",
      "the Horizons differential input must contain exactly three data properties"
    );
  }
  let official;
  try {
    official = verifyHorizonsResponseCandidate(
      descriptors.bytes!.value as Uint8Array,
      descriptors.evidenceRecord!.value
    );
  } catch (cause) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_RESPONSE_CANDIDATE_INVALID",
      cause instanceof Error ? cause.message : String(cause)
    );
  }

  const parsedEnvelope = westernAstronomyDiagnosticEnvelopeSchema.safeParse(
    descriptors.astronomyEnvelope!.value
  );
  if (!parsedEnvelope.success) {
    return failedHorizonsDifferentialReport(
      "ASTRONOMY_ENVELOPE_INVALID",
      "astronomy envelope did not pass the diagnostic schema"
    );
  }
  const astronomyEnvelope = parsedEnvelope.data as WesternAstronomyDiagnosticEnvelope;
  return createHorizonsDifferentialReport({ astronomyEnvelope, official });
}
