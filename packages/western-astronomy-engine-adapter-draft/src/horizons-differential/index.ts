import {
  westernAstronomyDiagnosticEnvelopeSchema,
  type WesternAstronomyDiagnosticEnvelope
} from "../index.ts";
import {
  createHorizonsDifferentialReport,
  horizonsDifferentialReportSchema,
  type HorizonsDifferentialReport
} from "./differential-report.ts";
import { verifyOfficialHorizonsResponse } from "./official-response.ts";
import { horizonsDifferentialQueryManifest } from "./query-manifest.ts";

export {
  HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  buildHorizonsQueryUrl,
  horizonsDifferentialQueryManifest
} from "./query-manifest.ts";
export {
  HORIZONS_DIFFERENTIAL_REPORT_VERSION,
  computeHorizonsDeltas,
  createHorizonsDifferentialReport,
  horizonsDifferentialReportSchema
} from "./differential-report.ts";
export {
  parseHorizonsVectorRows,
  verifyOfficialHorizonsResponse
} from "./official-response.ts";
export type {
  HorizonsVectorRow,
  OfficialHorizonsEvidenceRecord,
  VerifiedHorizonsResponse
} from "./official-response.ts";
export type {
  HorizonsDifferentialReport
} from "./differential-report.ts";

export function runHorizonsDifferential(input: {
  bytes: Uint8Array;
  evidenceRecord: unknown;
  astronomyEnvelope: unknown;
}): HorizonsDifferentialReport {
  const request = {
    manifestVersion: horizonsDifferentialQueryManifest.manifestVersion,
    utcInstant: horizonsDifferentialQueryManifest.utcInstant,
    providerTargetId: horizonsDifferentialQueryManifest.target.providerTargetId,
    centerId: horizonsDifferentialQueryManifest.target.centerId,
    sourceUrl: horizonsDifferentialQueryManifest.endpoint
  } as const;
  const failed = (code: string, message: string): HorizonsDifferentialReport =>
    horizonsDifferentialReportSchema.parse({
      schemaVersion: "western-horizons-differential-report/0.1-draft",
      systemId: "western-astrology",
      artifactKind: "horizons_astronomy_engine_differential",
      disposition: "diagnostic_only",
      outcome: "failed_closed",
      request,
      execution: null,
      result: null,
      failure: {
        code,
        message: message.slice(0, 500),
        partialResultReturned: false
      },
      digests: { algorithm: "sha256-canonical-json-v1", resultSha256: null }
    });

  let official;
  try {
    official = verifyOfficialHorizonsResponse(input.bytes, input.evidenceRecord);
  } catch (cause) {
    return failed(
      "OFFICIAL_EVIDENCE_INVALID",
      cause instanceof Error ? cause.message : String(cause)
    );
  }

  const parsedEnvelope = westernAstronomyDiagnosticEnvelopeSchema.safeParse(input.astronomyEnvelope);
  if (!parsedEnvelope.success) {
    return failed("ASTRONOMY_ENVELOPE_INVALID", "astronomy envelope did not pass the diagnostic schema");
  }
  const astronomyEnvelope = parsedEnvelope.data as WesternAstronomyDiagnosticEnvelope;
  return createHorizonsDifferentialReport({ astronomyEnvelope, official });
}
