import { z } from "zod";
import { WESTERN_ASTROLOGY_SYSTEM_ID } from "../contract-bridge.ts";
import { sha256CanonicalJson } from "../rule-layer/canonical.ts";
import {
  buildHorizonsQueryUrl,
  HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  horizonsDifferentialQueryManifest
} from "./query-manifest.ts";
import {
  isMechanicallyVerifiedHorizonsResponse,
  type HorizonsVectorRow,
  type MechanicallyVerifiedHorizonsResponse
} from "./official-response.ts";
import {
  westernAstronomyDiagnosticEnvelopeSchema,
  type WesternAstronomyDiagnosticEnvelope
} from "../index.ts";

export const HORIZONS_DIFFERENTIAL_REPORT_VERSION =
  "western-horizons-differential-report/0.2-draft" as const;

const FROZEN_HORIZONS_QUERY_URL = buildHorizonsQueryUrl(horizonsDifferentialQueryManifest);
const CANONICAL_UTC_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/u;

export type HorizonsDeltas = Readonly<{
  xAuDelta: number;
  yAuDelta: number;
  zAuDelta: number;
  euclideanAuDelta: number;
  distanceAuDelta: number;
}>;

export function computeHorizonsDeltas(
  astronomyVector: Readonly<{ x: number; y: number; z: number; distanceAu: number }>,
  responseVector: Pick<HorizonsVectorRow, "xAu" | "yAu" | "zAu">
): HorizonsDeltas {
  const xAuDelta = astronomyVector.x - responseVector.xAu;
  const yAuDelta = astronomyVector.y - responseVector.yAu;
  const zAuDelta = astronomyVector.z - responseVector.zAu;
  return {
    xAuDelta,
    yAuDelta,
    zAuDelta,
    euclideanAuDelta: Math.hypot(xAuDelta, yAuDelta, zAuDelta),
    distanceAuDelta: astronomyVector.distanceAu
      - Math.hypot(responseVector.xAu, responseVector.yAu, responseVector.zAu)
  };
}

const deltasSchema = z.strictObject({
  xAuDelta: z.number().finite(),
  yAuDelta: z.number().finite(),
  zAuDelta: z.number().finite(),
  euclideanAuDelta: z.number().finite().min(0),
  distanceAuDelta: z.number().finite()
});

const responseEvidenceSchema = z.strictObject({
  recordSchemaVersion: z.literal(2),
  recordKind: z.literal("horizons_response_candidate_evidence"),
  evidenceStatus: z.literal("mechanically_verified_candidate_only"),
  retrievedAtIso: z.string().regex(CANONICAL_UTC_PATTERN).refine((value) =>
    new Date(Date.parse(value)).toISOString() === value,
  "retrievedAtIso must be a real canonical millisecond UTC instant"),
  sourceUrl: z.literal(FROZEN_HORIZONS_QUERY_URL),
  byteLength: z.number().int().positive().max(1_000_000),
  rawResponseSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  evidenceRecordSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  apiVersion: z.string().regex(/^\d+\.\d+(?:\.\d+)?$/u),
  apiSource: z.literal("NASA/JPL Horizons API"),
  targetEphemerisSource: z.string().trim().min(1).max(120),
  centerEphemerisSource: z.string().trim().min(1).max(120),
  eopFile: z.string().trim().min(1).max(120),
  eopCoverage: z.string().trim().min(1).max(300),
  publisherAuthenticityEstablished: z.literal(false),
  networkProvenanceEstablished: z.literal(false),
  rightsCleared: z.literal(false)
});

const reportResultSchema = z.strictObject({
  rawResponseMechanicallyVerified: z.literal(true),
  publisherAuthenticityEstablished: z.literal(false),
  networkProvenanceEstablished: z.literal(false),
  rightsCleared: z.literal(false),
  rowLabel: z.string().min(1).max(120),
  julianDateUt: z.number().finite(),
  responseEvidence: responseEvidenceSchema,
  deltas: deltasSchema,
  truthAdjudicated: z.literal(false),
  passClaim: z.literal(false),
  comparisonSemantics: z.strictObject({
    thresholdAu: z.null(),
    passClaimPolicy: z.literal("never_in_draft")
  })
});

const requestSchema = z.strictObject({
  manifestVersion: z.literal(HORIZONS_DIFFERENTIAL_MANIFEST_VERSION),
  utcInstant: z.literal("2025-03-20T09:01:00.000Z"),
  providerTargetId: z.literal("10"),
  centerId: z.literal("500@399"),
  sourceUrl: z.literal(FROZEN_HORIZONS_QUERY_URL)
});

export const horizonsDifferentialReportSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    schemaVersion: z.literal(HORIZONS_DIFFERENTIAL_REPORT_VERSION),
    systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
    artifactKind: z.literal("horizons_astronomy_engine_differential"),
    disposition: z.literal("diagnostic_only"),
    outcome: z.literal("computed"),
    request: requestSchema,
    execution: z.strictObject({
      engine: z.strictObject({
        name: z.literal("astronomy-engine"),
        version: z.literal("2.1.19"),
        deltaTModelId: z.string().min(1).max(120)
      }),
      frameSemantics: z.strictObject({
        astronomyEngineFrame: z.literal("eqj_j2000_mean_equator"),
        responseFrame: z.literal("ICRF"),
        frameBias: z.literal("not_modeled_acknowledged"),
        correction: z.literal("LT")
      })
    }),
    result: reportResultSchema,
    failure: z.null(),
    digests: z.strictObject({
      algorithm: z.literal("sha256-canonical-json-v1"),
      resultSha256: z.string().regex(/^[a-f0-9]{64}$/u),
      payloadSha256: z.string().regex(/^[a-f0-9]{64}$/u)
    })
  }),
  z.strictObject({
    schemaVersion: z.literal(HORIZONS_DIFFERENTIAL_REPORT_VERSION),
    systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
    artifactKind: z.literal("horizons_astronomy_engine_differential"),
    disposition: z.literal("diagnostic_only"),
    outcome: z.literal("failed_closed"),
    request: requestSchema,
    execution: z.null(),
    result: z.null(),
    failure: z.strictObject({
      code: z.string().regex(/^[A-Z][A-Z0-9_]*$/u).max(100),
      message: z.string().trim().min(1).max(500),
      partialResultReturned: z.literal(false)
    }),
    digests: z.strictObject({
      algorithm: z.literal("sha256-canonical-json-v1"),
      resultSha256: z.null(),
      payloadSha256: z.string().regex(/^[a-f0-9]{64}$/u)
    })
  })
]).superRefine((value, context) => {
  const expectedPayloadSha256 = sha256CanonicalJson({
    request: value.request,
    execution: value.execution,
    result: value.result,
    failure: value.failure
  });
  if (value.digests.payloadSha256 !== expectedPayloadSha256) {
    context.addIssue({
      code: "custom",
      path: ["digests", "payloadSha256"],
      message: "payload digest does not bind request, execution, result and failure"
    });
  }
  if (value.outcome === "computed") {
    const expectedResultSha256 = sha256CanonicalJson(value.result);
    if (value.digests.resultSha256 !== expectedResultSha256) {
      context.addIssue({
        code: "custom",
        path: ["digests", "resultSha256"],
        message: "result digest does not bind the computed result"
      });
    }
  }
});

export type HorizonsDifferentialReport = z.infer<typeof horizonsDifferentialReportSchema>;

declare const mechanicallyProducedHorizonsReportBrand: unique symbol;

export type MechanicallyProducedHorizonsDifferentialReport =
  HorizonsDifferentialReport & Readonly<{
    [mechanicallyProducedHorizonsReportBrand]: true;
  }>;

const mechanicallyProducedReports = new WeakSet<object>();

function deepFreezeReportValue(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreezeReportValue(descriptor.value, seen);
  }
  Object.freeze(value);
}

function brandMechanicallyProducedReport(
  report: HorizonsDifferentialReport
): MechanicallyProducedHorizonsDifferentialReport {
  deepFreezeReportValue(report);
  mechanicallyProducedReports.add(report);
  return report as MechanicallyProducedHorizonsDifferentialReport;
}

export function isMechanicallyProducedHorizonsDifferentialReport(
  candidate: unknown
): candidate is MechanicallyProducedHorizonsDifferentialReport {
  return candidate !== null
    && typeof candidate === "object"
    && mechanicallyProducedReports.has(candidate as object);
}

export const HORIZONS_DIFFERENTIAL_REQUEST_FIELDS = Object.freeze({
  manifestVersion: HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  utcInstant: horizonsDifferentialQueryManifest.utcInstant,
  providerTargetId: horizonsDifferentialQueryManifest.target.providerTargetId,
  centerId: horizonsDifferentialQueryManifest.target.centerId,
  sourceUrl: FROZEN_HORIZONS_QUERY_URL
});

export function failedHorizonsDifferentialReport(
  code: string,
  message: string
): MechanicallyProducedHorizonsDifferentialReport {
  const normalizedCode = typeof code === "string"
    && /^[A-Z][A-Z0-9_]*$/u.test(code)
    && code.length <= 100
    ? code
    : "HORIZONS_DIFFERENTIAL_FAILURE";
  const normalizedMessage = typeof message === "string"
    ? message.trim().slice(0, 500) || "Horizons differential failed closed"
    : "Horizons differential failed closed";
  const failure = {
    code: normalizedCode,
    message: normalizedMessage,
    partialResultReturned: false as const
  };
  const payload = {
    request: HORIZONS_DIFFERENTIAL_REQUEST_FIELDS,
    execution: null,
    result: null,
    failure
  };
  return brandMechanicallyProducedReport(horizonsDifferentialReportSchema.parse({
    schemaVersion: HORIZONS_DIFFERENTIAL_REPORT_VERSION,
    systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
    artifactKind: "horizons_astronomy_engine_differential",
    disposition: "diagnostic_only",
    outcome: "failed_closed",
    request: HORIZONS_DIFFERENTIAL_REQUEST_FIELDS,
    execution: null,
    result: null,
    failure,
    digests: {
      algorithm: "sha256-canonical-json-v1",
      resultSha256: null,
      payloadSha256: sha256CanonicalJson(payload)
    }
  }));
}

export function createHorizonsDifferentialReport(input: {
  astronomyEnvelope: unknown;
  official: unknown;
}): MechanicallyProducedHorizonsDifferentialReport {
  try {
    return createHorizonsDifferentialReportInternal(input);
  } catch (cause) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_DIFFERENTIAL_CONSTRUCTION_FAILED",
      cause instanceof Error ? cause.message : String(cause)
    );
  }
}

function createHorizonsDifferentialReportInternal(
  input: unknown
): MechanicallyProducedHorizonsDifferentialReport {
  const inputCandidate: unknown = input;
  if (inputCandidate === null || typeof inputCandidate !== "object") {
    return failedHorizonsDifferentialReport(
      "HORIZONS_DIFFERENTIAL_INPUT_INVALID",
      "the differential input must be an object"
    );
  }
  const prototype = Object.getPrototypeOf(inputCandidate);
  if (prototype !== Object.prototype && prototype !== null) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_DIFFERENTIAL_INPUT_INVALID",
      "the differential input must be an exact plain object"
    );
  }
  const descriptors = Object.getOwnPropertyDescriptors(inputCandidate);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== 2
    || !keys.includes("astronomyEnvelope")
    || !keys.includes("official")
    || !("value" in (descriptors.astronomyEnvelope ?? {}))
    || !("value" in (descriptors.official ?? {}))) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_DIFFERENTIAL_INPUT_INVALID",
      "the differential input must contain only astronomyEnvelope and official data properties"
    );
  }
  const officialCandidate: unknown = descriptors.official!.value;
  if (!isMechanicallyVerifiedHorizonsResponse(officialCandidate)) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_RESPONSE_NOT_MECHANICALLY_VERIFIED",
      "the differential requires the exact object returned by the raw-response verifier"
    );
  }
  const official = officialCandidate;
  const parsedEnvelope = westernAstronomyDiagnosticEnvelopeSchema.safeParse(
    descriptors.astronomyEnvelope!.value
  );
  if (!parsedEnvelope.success) {
    return failedHorizonsDifferentialReport(
      "ASTRONOMY_ENVELOPE_INVALID",
      "astronomy envelope did not pass the diagnostic schema"
    );
  }
  const astronomyEnvelope: WesternAstronomyDiagnosticEnvelope = parsedEnvelope.data;
  if (astronomyEnvelope.outcome !== "computed") {
    return failedHorizonsDifferentialReport(
      "ASTRONOMY_DIAGNOSTIC_NOT_COMPUTED",
      "astronomy diagnostic must be computed before a differential can be formed"
    );
  }
  const sun = astronomyEnvelope.result.bodies[0];
  if (sun?.bodyId !== "sun") {
    return failedHorizonsDifferentialReport(
      "SUN_VECTOR_MISSING",
      "the frozen differential requires the sun as the first computed body"
    );
  }
  const row = official.rows[0];
  if (!row) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_RESPONSE_ROW_MISSING",
      "the mechanically verified response did not retain its frozen vector row"
    );
  }
  const deltas = computeHorizonsDeltas(sun.geoEqjAu, row);
  if (!Object.values(deltas).every(Number.isFinite)) {
    return failedHorizonsDifferentialReport(
      "HORIZONS_DIFFERENTIAL_NON_FINITE",
      "the frozen vector comparison produced a non-finite delta"
    );
  }
  const responseEvidence = responseEvidenceSchema.parse({
    recordSchemaVersion: official.evidence.schemaVersion,
    recordKind: official.evidence.recordKind,
    evidenceStatus: official.evidence.evidenceStatus,
    retrievedAtIso: official.evidence.retrievedAtIso,
    sourceUrl: official.evidence.sourceUrl,
    byteLength: official.evidence.byteLength,
    rawResponseSha256: official.evidence.sha256,
    evidenceRecordSha256: sha256CanonicalJson(official.evidence),
    apiVersion: official.responseMetadata.apiVersion,
    apiSource: official.responseMetadata.apiSource,
    targetEphemerisSource: official.responseMetadata.targetEphemerisSource,
    centerEphemerisSource: official.responseMetadata.centerEphemerisSource,
    eopFile: official.responseMetadata.eopFile,
    eopCoverage: official.responseMetadata.eopCoverage,
    publisherAuthenticityEstablished: false,
    networkProvenanceEstablished: false,
    rightsCleared: false
  });
  const result = reportResultSchema.parse({
    rawResponseMechanicallyVerified: true,
    publisherAuthenticityEstablished: false,
    networkProvenanceEstablished: false,
    rightsCleared: false,
    rowLabel: row.label,
    julianDateUt: row.julianDateUt,
    responseEvidence,
    deltas,
    truthAdjudicated: false,
    passClaim: false,
    comparisonSemantics: {
      thresholdAu: null,
      passClaimPolicy: "never_in_draft"
    }
  });
  const execution = {
    engine: {
      name: "astronomy-engine" as const,
      version: "2.1.19" as const,
      deltaTModelId: astronomyEnvelope.execution.deltaT.modelId
    },
    frameSemantics: {
      astronomyEngineFrame: "eqj_j2000_mean_equator" as const,
      responseFrame: "ICRF" as const,
      frameBias: "not_modeled_acknowledged" as const,
      correction: "LT" as const
    }
  };
  const payload = {
    request: HORIZONS_DIFFERENTIAL_REQUEST_FIELDS,
    execution,
    result,
    failure: null
  };
  return brandMechanicallyProducedReport(horizonsDifferentialReportSchema.parse({
    schemaVersion: HORIZONS_DIFFERENTIAL_REPORT_VERSION,
    systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
    artifactKind: "horizons_astronomy_engine_differential",
    disposition: "diagnostic_only",
    outcome: "computed",
    request: HORIZONS_DIFFERENTIAL_REQUEST_FIELDS,
    execution,
    result,
    failure: null,
    digests: {
      algorithm: "sha256-canonical-json-v1",
      resultSha256: sha256CanonicalJson(result),
      payloadSha256: sha256CanonicalJson(payload)
    }
  }));
}
