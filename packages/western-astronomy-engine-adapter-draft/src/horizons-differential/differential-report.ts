import { z } from "zod";
import { WESTERN_ASTROLOGY_SYSTEM_ID } from "../contract-bridge.ts";
import { sha256CanonicalJson } from "../rule-layer/canonical.ts";
import { HORIZONS_DIFFERENTIAL_MANIFEST_VERSION } from "./query-manifest.ts";
import type { HorizonsVectorRow, VerifiedHorizonsResponse } from "./official-response.ts";
import type { WesternAstronomyDiagnosticEnvelope } from "../index.ts";

export const HORIZONS_DIFFERENTIAL_REPORT_VERSION =
  "western-horizons-differential-report/0.1-draft" as const;

export type HorizonsDeltas = Readonly<{
  xAuDelta: number;
  yAuDelta: number;
  zAuDelta: number;
  euclideanAuDelta: number;
  distanceAuDelta: number;
}>;

export function computeHorizonsDeltas(
  astronomyVector: Readonly<{ x: number; y: number; z: number; distanceAu: number }>,
  official: HorizonsVectorRow
): HorizonsDeltas {
  const xAuDelta = astronomyVector.x - official.xAu;
  const yAuDelta = astronomyVector.y - official.yAu;
  const zAuDelta = astronomyVector.z - official.zAu;
  return {
    xAuDelta,
    yAuDelta,
    zAuDelta,
    euclideanAuDelta: Math.hypot(xAuDelta, yAuDelta, zAuDelta),
    distanceAuDelta: astronomyVector.distanceAu - Math.hypot(official.xAu, official.yAu, official.zAu)
  };
}

const deltasSchema = z.strictObject({
  xAuDelta: z.number().finite(),
  yAuDelta: z.number().finite(),
  zAuDelta: z.number().finite(),
  euclideanAuDelta: z.number().finite().min(0),
  distanceAuDelta: z.number().finite()
});

const reportResultSchema = z.strictObject({
  officialLocked: z.literal(true),
  rowLabel: z.string().min(1).max(120),
  deltas: deltasSchema,
  truthAdjudicated: z.literal(false),
  passClaim: z.literal(false),
  comparisonSemantics: z.strictObject({
    thresholdAu: z.null(),
    passClaimPolicy: z.literal("never_in_draft")
  })
});

export const horizonsDifferentialReportSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    schemaVersion: z.literal(HORIZONS_DIFFERENTIAL_REPORT_VERSION),
    systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
    artifactKind: z.literal("horizons_astronomy_engine_differential"),
    disposition: z.literal("diagnostic_only"),
    outcome: z.literal("computed"),
    request: z.strictObject({
      manifestVersion: z.literal(HORIZONS_DIFFERENTIAL_MANIFEST_VERSION),
      utcInstant: z.string(),
      providerTargetId: z.literal("10"),
      centerId: z.literal("500@399"),
      sourceUrl: z.string().url()
    }),
    execution: z.strictObject({
      engine: z.strictObject({
        name: z.literal("astronomy-engine"),
        version: z.literal("2.1.19"),
        deltaTModelId: z.string().min(1).max(120)
      }),
      frameSemantics: z.strictObject({
        astronomyEngineFrame: z.literal("eqj_j2000_mean_equator"),
        officialFrame: z.literal("ICRF"),
        frameBias: z.literal("not_modeled_acknowledged"),
        correction: z.literal("LT")
      })
    }),
    result: reportResultSchema,
    failure: z.null(),
    digests: z.strictObject({
      algorithm: z.literal("sha256-canonical-json-v1"),
      resultSha256: z.string().regex(/^[a-f0-9]{64}$/)
    })
  }),
  z.strictObject({
    schemaVersion: z.literal(HORIZONS_DIFFERENTIAL_REPORT_VERSION),
    systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
    artifactKind: z.literal("horizons_astronomy_engine_differential"),
    disposition: z.literal("diagnostic_only"),
    outcome: z.literal("failed_closed"),
    request: z.strictObject({
      manifestVersion: z.literal(HORIZONS_DIFFERENTIAL_MANIFEST_VERSION),
      utcInstant: z.string(),
      providerTargetId: z.literal("10"),
      centerId: z.literal("500@399"),
      sourceUrl: z.string().url()
    }),
    execution: z.null(),
    result: z.null(),
    failure: z.strictObject({
      code: z.string().regex(/^[A-Z][A-Z0-9_]*$/).max(100),
      message: z.string().trim().min(1).max(500),
      partialResultReturned: z.literal(false)
    }),
    digests: z.strictObject({
      algorithm: z.literal("sha256-canonical-json-v1"),
      resultSha256: z.null()
    })
  })
]);

export type HorizonsDifferentialReport = z.infer<typeof horizonsDifferentialReportSchema>;

const REQUEST_FIELDS = {
  manifestVersion: HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  utcInstant: "2025-03-20T09:01:00.000Z",
  providerTargetId: "10",
  centerId: "500@399",
  sourceUrl: "https://ssd.jpl.nasa.gov/api/horizons.api"
} as const;

export function createHorizonsDifferentialReport(input: {
  astronomyEnvelope: WesternAstronomyDiagnosticEnvelope;
  official: VerifiedHorizonsResponse;
}): HorizonsDifferentialReport {
  const { astronomyEnvelope, official } = input;
  if (astronomyEnvelope.outcome !== "computed") {
    return horizonsDifferentialReportSchema.parse({
      schemaVersion: HORIZONS_DIFFERENTIAL_REPORT_VERSION,
      systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
      artifactKind: "horizons_astronomy_engine_differential",
      disposition: "diagnostic_only",
      outcome: "failed_closed",
      request: REQUEST_FIELDS,
      execution: null,
      result: null,
      failure: {
        code: "ASTRONOMY_DIAGNOSTIC_NOT_COMPUTED",
        message: "astronomy diagnostic must be computed before a differential can be formed",
        partialResultReturned: false
      },
      digests: { algorithm: "sha256-canonical-json-v1", resultSha256: null }
    });
  }
  const sun = astronomyEnvelope.result.bodies[0];
  if (sun?.bodyId !== "sun") {
    return horizonsDifferentialReportSchema.parse({
      schemaVersion: HORIZONS_DIFFERENTIAL_REPORT_VERSION,
      systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
      artifactKind: "horizons_astronomy_engine_differential",
      disposition: "diagnostic_only",
      outcome: "failed_closed",
      request: REQUEST_FIELDS,
      execution: null,
      result: null,
      failure: {
        code: "SUN_VECTOR_MISSING",
        message: "the frozen differential requires the sun as the first computed body",
        partialResultReturned: false
      },
      digests: { algorithm: "sha256-canonical-json-v1", resultSha256: null }
    });
  }
  const row = official.rows[0]!;
  const deltas = computeHorizonsDeltas(sun.geoEqjAu, row);
  const result = reportResultSchema.parse({
    officialLocked: true,
    rowLabel: row.label,
    deltas,
    truthAdjudicated: false,
    passClaim: false,
    comparisonSemantics: {
      thresholdAu: null,
      passClaimPolicy: "never_in_draft"
    }
  });
  const report = horizonsDifferentialReportSchema.parse({
    schemaVersion: HORIZONS_DIFFERENTIAL_REPORT_VERSION,
    systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
    artifactKind: "horizons_astronomy_engine_differential",
    disposition: "diagnostic_only",
    outcome: "computed",
    request: REQUEST_FIELDS,
    execution: {
      engine: {
        name: "astronomy-engine",
        version: "2.1.19",
        deltaTModelId: astronomyEnvelope.execution.deltaT.modelId
      },
      frameSemantics: {
        astronomyEngineFrame: "eqj_j2000_mean_equator",
        officialFrame: "ICRF",
        frameBias: "not_modeled_acknowledged",
        correction: "LT"
      }
    },
    result,
    failure: null,
    digests: {
      algorithm: "sha256-canonical-json-v1",
      resultSha256: sha256CanonicalJson(result)
    }
  });
  return report;
}
