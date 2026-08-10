import { createHash, randomBytes } from "node:crypto";
import { Worker as NodeWorker } from "node:worker_threads";
import { z } from "zod";
import {
  WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
  WESTERN_ASTROLOGY_SYSTEM_ID,
  WESTERN_BODY_IDS,
  westernFixtureEvidenceDraftSchema
} from "./contract-bridge.ts";

export const WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION =
  "western-astronomy-utc-diagnostic-request/0.1-draft" as const;
export const WESTERN_ASTRONOMY_DIAGNOSTIC_ENVELOPE_VERSION =
  "western-astronomy-utc-diagnostic/0.1-draft" as const;
export const WESTERN_ASTRONOMY_WORKER_PROTOCOL_VERSION =
  "western-astronomy-engine-worker/0.1-draft" as const;
export const WESTERN_ASTRONOMY_PROJECTION_VERSION =
  "western-astronomy-engine-utc-position/0.1-draft" as const;
export const ASTRONOMY_ENGINE_VERSION = "2.1.19" as const;
export const ASTRONOMY_ENGINE_NPM_INTEGRITY =
  "sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==" as const;
export const ASTRONOMY_ENGINE_RUNTIME_ESM_SHA256 =
  "068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7" as const;
export const ASTRONOMY_ENGINE_SOURCE_LOCK_SHA256 =
  "a0d929d78cff75aa543e78350aece6a35636c4c081f5620c5a7cc9aaaf400975" as const;
export const ASTRONOMY_ENGINE_DELTA_T_LOCK_SHA256 =
  "de5cb6ea1dda00ebe230394be38968b93c42b77988ba1d8437a1487fd46265f7" as const;
export const ASTRONOMY_ENGINE_DELTA_T_MODEL_ID =
  "astronomy-engine@2.1.19.DeltaT_EspenakMeeus" as const;

const WORKER_ENTRY_URL = new URL("./astronomy-worker-entry.mjs", import.meta.url);
const DEFAULT_TIMEOUT_MS = 10_000;
const MINIMUM_TIMEOUT_MS = 100;
const MAXIMUM_TIMEOUT_MS = 30_000;
const MINIMUM_UTC_MS = Date.parse("1900-01-01T00:01:00.000Z");
const MAXIMUM_UTC_MS = Date.parse("2100-12-31T23:58:59.999Z");
const CANONICAL_UTC_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const BODY_ORDER = new Map(WESTERN_BODY_IDS.map((bodyId, index) => [bodyId, index]));

const sha256Schema = z.string().regex(SHA256_PATTERN);
const finiteNumberSchema = z.number().finite();
const longitudeSchema = finiteNumberSchema.min(0).lt(360);

export const westernAstronomyUtcDiagnosticRequestSchema = z.strictObject({
  protocolVersion: z.literal(WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION),
  utcInstant: z.string(),
  bodyIds: z.array(z.enum(WESTERN_BODY_IDS)).min(1).max(WESTERN_BODY_IDS.length)
}).superRefine((value, context) => {
  if (!CANONICAL_UTC_PATTERN.test(value.utcInstant)) {
    context.addIssue({
      code: "custom",
      path: ["utcInstant"],
      message: "UTC instant must use canonical YYYY-MM-DDTHH:mm:ss.sssZ form"
    });
  } else {
    const utcMilliseconds = Date.parse(value.utcInstant);
    if (!Number.isFinite(utcMilliseconds) || new Date(utcMilliseconds).toISOString() !== value.utcInstant) {
      context.addIssue({ code: "custom", path: ["utcInstant"], message: "UTC instant is not a real Gregorian instant" });
    } else if (utcMilliseconds < MINIMUM_UTC_MS || utcMilliseconds > MAXIMUM_UTC_MS) {
      context.addIssue({
        code: "custom",
        path: ["utcInstant"],
        message: "UTC instant must leave the fixed 60-second differential window inside 1900-2100"
      });
    }
  }

  let previousIndex = -1;
  value.bodyIds.forEach((bodyId, index) => {
    const currentIndex = BODY_ORDER.get(bodyId) ?? -1;
    if (currentIndex <= previousIndex) {
      context.addIssue({
        code: "custom",
        path: ["bodyIds", index],
        message: "bodyIds must be unique and follow the canonical western body order"
      });
    }
    previousIndex = currentIndex;
  });
});

const vectorSchema = z.strictObject({
  x: finiteNumberSchema,
  y: finiteNumberSchema,
  z: finiteNumberSchema,
  distanceAu: finiteNumberSchema.positive()
});

const eclipticSchema = z.strictObject({
  longitudeDeg: longitudeSchema,
  latitudeDeg: finiteNumberSchema.min(-90).max(90),
  distanceAu: finiteNumberSchema.positive()
});

export const westernAstronomyBodyDiagnosticSchema = z.strictObject({
  bodyId: z.enum(WESTERN_BODY_IDS),
  engineBodyToken: z.string().min(1).max(40),
  targetCenterEvidence: z.literal("upstream_body_enum_only_not_artifact_inventory"),
  correctionSemantics: z.strictObject({
    lightTime: z.enum([
      "upstream_geo_moon_direct_no_explicit_backdate",
      "upstream_iterative_backdate"
    ]),
    stellarAberration: z.literal(false),
    solarGravitationalDeflection: z.literal("not_exposed_by_astronomy_engine_public_api")
  }),
  geoEqjAu: vectorSchema,
  trueEclipticOfDate: eclipticSchema,
  finiteDifference: z.strictObject({
    algorithmId: z.literal("central_finite_difference_utc_60s_v1"),
    halfWindowSeconds: z.literal(60),
    longitudeSpeedDegPerDay: finiteNumberSchema,
    latitudeSpeedDegPerDay: finiteNumberSchema,
    distanceSpeedAuPerDay: finiteNumberSchema
  })
}).superRefine((value, context) => {
  const expectedLightTime = value.bodyId === "moon"
    ? "upstream_geo_moon_direct_no_explicit_backdate"
    : "upstream_iterative_backdate";
  if (value.correctionSemantics.lightTime !== expectedLightTime) {
    context.addIssue({
      code: "custom",
      path: ["correctionSemantics", "lightTime"],
      message: "Moon must retain its direct GeoMoon correction exception"
    });
  }
});

export const westernAstronomyDiagnosticResultSchema = z.strictObject({
  projectionVersion: z.literal(WESTERN_ASTRONOMY_PROJECTION_VERSION),
  frameSemantics: z.strictObject({
    observerOrigin: z.literal("geocenter"),
    baseFrame: z.literal("astronomy_engine_eqj_j2000_mean_equator"),
    outputFrame: z.literal("astronomy_engine_ect_true_ecliptic_of_date"),
    stellarAberration: z.literal(false),
    solarGravitationalDeflection: z.literal("not_exposed_by_astronomy_engine_public_api"),
    speedAlgorithmId: z.literal("central_finite_difference_utc_60s_v1")
  }),
  engineTime: z.strictObject({
    utcInstant: z.string().regex(CANONICAL_UTC_PATTERN),
    utDaysSinceJ2000: finiteNumberSchema,
    ttDaysSinceJ2000: finiteNumberSchema,
    modeledDeltaTSeconds: finiteNumberSchema,
    utSemantics: z.literal("astronomy_engine_ut1_utc_approximation"),
    deltaTSemantics: z.literal("modeled_espenak_meeus_not_leap_second_eop_provenance")
  }),
  bodies: z.array(westernAstronomyBodyDiagnosticSchema).min(1).max(WESTERN_BODY_IDS.length)
}).superRefine((value, context) => {
  let previousIndex = -1;
  value.bodies.forEach((body, index) => {
    const currentIndex = BODY_ORDER.get(body.bodyId) ?? -1;
    if (currentIndex <= previousIndex) {
      context.addIssue({ code: "custom", path: ["bodies", index, "bodyId"], message: "body results are not canonical" });
    }
    previousIndex = currentIndex;
  });
});

const workerPayloadSchema = z.strictObject({
  runtimeVersion: z.string().min(1).max(80),
  engine: z.strictObject({
    name: z.literal("astronomy-engine"),
    version: z.literal(ASTRONOMY_ENGINE_VERSION),
    npmIntegrity: z.literal(ASTRONOMY_ENGINE_NPM_INTEGRITY),
    upstreamTag: z.literal("v2.1.19"),
    upstreamTagObjectSha: z.literal("03084ee684bdcc490273fe85f9df4f1c8fb66199"),
    upstreamPeeledCommitSha: z.literal("61dc07020aaa6885d2c7f688a4d82beaf6edb9ef"),
    runtimeEsmSha256: z.literal(ASTRONOMY_ENGINE_RUNTIME_ESM_SHA256)
  }),
  sourceLockSha256: z.literal(ASTRONOMY_ENGINE_SOURCE_LOCK_SHA256),
  deltaT: z.strictObject({
    modelId: z.literal(ASTRONOMY_ENGINE_DELTA_T_MODEL_ID),
    lockSha256: z.literal(ASTRONOMY_ENGINE_DELTA_T_LOCK_SHA256),
    sentinelCount: z.number().int().min(5).max(100)
  }),
  result: westernAstronomyDiagnosticResultSchema
});

const diagnosticFailureStageSchema = z.enum([
  "request_validation",
  "source_lock",
  "delta_t",
  "worker",
  "calculation",
  "normalization",
  "digest"
]);

const workerMessageSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    workerProtocolVersion: z.literal(WESTERN_ASTRONOMY_WORKER_PROTOCOL_VERSION),
    nonce: z.string().regex(SHA256_PATTERN),
    ok: z.literal(true),
    payload: workerPayloadSchema
  }),
  z.strictObject({
    workerProtocolVersion: z.literal(WESTERN_ASTRONOMY_WORKER_PROTOCOL_VERSION),
    nonce: z.string().regex(SHA256_PATTERN).nullable(),
    ok: z.literal(false),
    failure: z.strictObject({
      stage: diagnosticFailureStageSchema,
      code: z.string().regex(/^[A-Z][A-Z0-9_]*$/u).max(100),
      message: z.string().min(1).max(500)
    })
  })
]);

const strictContractRelationSchema = z.strictObject({
  contractVersion: z.literal(WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION),
  chartFixtureAccepted: z.literal(false),
  successReceiptIssued: z.literal(false),
  unmetFieldFamilies: z.array(z.string().min(1).max(120)).min(1).max(30)
});

const diagnosticDigestsSchema = z.strictObject({
  algorithm: z.literal("sha256-canonical-json-v1"),
  requestSha256: sha256Schema.nullable(),
  resultSha256: sha256Schema.nullable()
});

const commonEnvelopeShape = {
  schemaVersion: z.literal(WESTERN_ASTRONOMY_DIAGNOSTIC_ENVELOPE_VERSION),
  systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
  artifactKind: z.literal("astronomy_engine_utc_position_diagnostic"),
  disposition: z.literal("diagnostic_only"),
  evidence: westernFixtureEvidenceDraftSchema,
  strictContractRelation: strictContractRelationSchema,
  diagnosticDigests: diagnosticDigestsSchema
} as const;

const executionSchema = z.strictObject({
  engine: workerPayloadSchema.shape.engine,
  sourceLockSha256: sha256Schema,
  deltaT: workerPayloadSchema.shape.deltaT,
  worker: z.strictObject({
    isolation: z.literal("fresh_worker_per_request"),
    freshInstance: z.literal(true),
    runtime: z.literal("node:worker_threads"),
    runtimeVersion: z.string().min(1).max(80),
    threadId: z.number().int().positive(),
    instanceNonceSha256: sha256Schema,
    exitCode: z.literal(0)
  })
});

export const westernAstronomyDiagnosticEnvelopeSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    ...commonEnvelopeShape,
    outcome: z.literal("computed"),
    request: westernAstronomyUtcDiagnosticRequestSchema,
    execution: executionSchema,
    result: westernAstronomyDiagnosticResultSchema,
    failure: z.null()
  }),
  z.strictObject({
    ...commonEnvelopeShape,
    outcome: z.literal("failed_closed"),
    request: westernAstronomyUtcDiagnosticRequestSchema.nullable(),
    execution: z.null(),
    result: z.null(),
    failure: z.strictObject({
      stage: diagnosticFailureStageSchema,
      code: z.string().regex(/^[A-Z][A-Z0-9_]*$/u).max(100),
      message: z.string().min(1).max(500),
      partialResultReturned: z.literal(false)
    })
  })
]);

export type WesternAstronomyUtcDiagnosticRequest = z.infer<typeof westernAstronomyUtcDiagnosticRequestSchema>;
export type WesternAstronomyBodyDiagnostic = z.infer<typeof westernAstronomyBodyDiagnosticSchema>;
export type WesternAstronomyDiagnosticResult = z.infer<typeof westernAstronomyDiagnosticResultSchema>;
export type WesternAstronomyDiagnosticEnvelope = z.infer<typeof westernAstronomyDiagnosticEnvelopeSchema>;
export type WesternAstronomyDiagnosticOptions = Readonly<{ timeoutMs?: number }>;

const DIAGNOSTIC_EVIDENCE = westernFixtureEvidenceDraftSchema.parse({
  evidenceStatus: "differential_diagnostic",
  claimScopes: ["ephemeris_position", "frame_transform"],
  productionEligible: false,
  expertTruthClaimed: false,
  note: "Astronomy Engine UTC position diagnostic only; not a strict chart fixture, success receipt, ICRF proof, or expert truth claim."
});

const STRICT_CONTRACT_RELATION = strictContractRelationSchema.parse({
  contractVersion: WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
  chartFixtureAccepted: false,
  successReceiptIssued: false,
  unmetFieldFamilies: [
    "civil_time_tzdb_dst_resolution",
    "icrf_frame_identity",
    "target_center_artifact_inventory",
    "leap_second_eop_time_provenance",
    "provider_options_flags_and_fallback",
    "instantaneous_speed_contract",
    "zodiac_houses_and_aspects",
    "western_calculation_receipt"
  ]
});

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function sha256CanonicalJson(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function validationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "diagnostic input validation failed";
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`.slice(0, 500);
}

function failedEnvelope(
  request: WesternAstronomyUtcDiagnosticRequest | null,
  stage: z.infer<typeof diagnosticFailureStageSchema>,
  code: string,
  message: string
): WesternAstronomyDiagnosticEnvelope {
  return westernAstronomyDiagnosticEnvelopeSchema.parse({
    schemaVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_ENVELOPE_VERSION,
    systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
    artifactKind: "astronomy_engine_utc_position_diagnostic",
    disposition: "diagnostic_only",
    outcome: "failed_closed",
    request,
    execution: null,
    result: null,
    failure: {
      stage,
      code,
      message: message.slice(0, 500) || "diagnostic failed closed",
      partialResultReturned: false
    },
    evidence: DIAGNOSTIC_EVIDENCE,
    strictContractRelation: STRICT_CONTRACT_RELATION,
    diagnosticDigests: {
      algorithm: "sha256-canonical-json-v1",
      requestSha256: request ? sha256CanonicalJson(request) : null,
      resultSha256: null
    }
  });
}

function computedEnvelope(
  request: WesternAstronomyUtcDiagnosticRequest,
  payload: z.infer<typeof workerPayloadSchema>,
  threadId: number,
  nonce: string
): WesternAstronomyDiagnosticEnvelope {
  return westernAstronomyDiagnosticEnvelopeSchema.parse({
    schemaVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_ENVELOPE_VERSION,
    systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
    artifactKind: "astronomy_engine_utc_position_diagnostic",
    disposition: "diagnostic_only",
    outcome: "computed",
    request,
    execution: {
      engine: payload.engine,
      sourceLockSha256: payload.sourceLockSha256,
      deltaT: payload.deltaT,
      worker: {
        isolation: "fresh_worker_per_request",
        freshInstance: true,
        runtime: "node:worker_threads",
        runtimeVersion: payload.runtimeVersion,
        threadId,
        instanceNonceSha256: createHash("sha256").update(nonce, "utf8").digest("hex"),
        exitCode: 0
      }
    },
    result: payload.result,
    failure: null,
    evidence: DIAGNOSTIC_EVIDENCE,
    strictContractRelation: STRICT_CONTRACT_RELATION,
    diagnosticDigests: {
      algorithm: "sha256-canonical-json-v1",
      requestSha256: sha256CanonicalJson(request),
      resultSha256: sha256CanonicalJson(payload.result)
    }
  });
}

export async function runWesternAstronomyUtcDiagnostic(
  input: unknown,
  options: WesternAstronomyDiagnosticOptions = {}
): Promise<WesternAstronomyDiagnosticEnvelope> {
  const requestResult = westernAstronomyUtcDiagnosticRequestSchema.safeParse(input);
  if (!requestResult.success) {
    return failedEnvelope(null, "request_validation", "INVALID_REQUEST", validationMessage(requestResult.error));
  }
  const request = requestResult.data;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < MINIMUM_TIMEOUT_MS || timeoutMs > MAXIMUM_TIMEOUT_MS) {
    return failedEnvelope(request, "request_validation", "INVALID_TIMEOUT", "timeoutMs must be an integer from 100 through 30000");
  }

  const nonce = randomBytes(32).toString("hex");
  let worker: NodeWorker;
  try {
    worker = new NodeWorker(WORKER_ENTRY_URL, {
      execArgv: [],
      workerData: {
        workerProtocolVersion: WESTERN_ASTRONOMY_WORKER_PROTOCOL_VERSION,
        nonce,
        request
      },
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
        stackSizeMb: 4
      }
    });
  } catch (cause) {
    return failedEnvelope(
      request,
      "worker",
      "WORKER_START_FAILED",
      cause instanceof Error ? cause.message : String(cause)
    );
  }
  const threadId = worker.threadId;

  return await new Promise((resolve) => {
    let settled = false;
    let receivedMessage = false;
    let messageValue: unknown;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      void worker.terminate();
      resolve(failedEnvelope(request, "worker", "WORKER_TIMEOUT", `fresh worker exceeded ${timeoutMs} ms`));
    }, timeoutMs);

    const settle = (envelope: WesternAstronomyDiagnosticEnvelope): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(envelope);
    };

    worker.on("message", (value: unknown) => {
      if (receivedMessage) {
        void worker.terminate();
        settle(failedEnvelope(request, "worker", "WORKER_DUPLICATE_MESSAGE", "fresh worker emitted more than one message"));
        return;
      }
      receivedMessage = true;
      messageValue = value;
    });

    worker.once("messageerror", () => {
      void worker.terminate();
      settle(failedEnvelope(request, "worker", "WORKER_MESSAGE_ERROR", "fresh worker emitted an unreadable message"));
    });

    worker.once("error", (cause) => {
      settle(failedEnvelope(
        request,
        "worker",
        "WORKER_RUNTIME_ERROR",
        cause instanceof Error ? cause.message : String(cause)
      ));
    });

    worker.once("exit", (exitCode) => {
      if (settled) return;
      if (exitCode !== 0) {
        settle(failedEnvelope(request, "worker", "WORKER_EXIT_NONZERO", `fresh worker exited with code ${exitCode}`));
        return;
      }
      if (!receivedMessage) {
        settle(failedEnvelope(request, "worker", "WORKER_NO_MESSAGE", "fresh worker exited without a result"));
        return;
      }
      const parsedMessage = workerMessageSchema.safeParse(messageValue);
      if (!parsedMessage.success) {
        settle(failedEnvelope(request, "worker", "WORKER_PROTOCOL_INVALID", validationMessage(parsedMessage.error)));
        return;
      }
      if (parsedMessage.data.nonce !== nonce) {
        settle(failedEnvelope(request, "worker", "WORKER_NONCE_MISMATCH", "fresh worker nonce did not round-trip"));
        return;
      }
      if (!parsedMessage.data.ok) {
        settle(failedEnvelope(
          request,
          parsedMessage.data.failure.stage,
          parsedMessage.data.failure.code,
          parsedMessage.data.failure.message
        ));
        return;
      }
      if (parsedMessage.data.payload.result.engineTime.utcInstant !== request.utcInstant
        || JSON.stringify(parsedMessage.data.payload.result.bodies.map((body) => body.bodyId)) !== JSON.stringify(request.bodyIds)) {
        settle(failedEnvelope(request, "normalization", "RESULT_REQUEST_MISMATCH", "worker result does not bind the canonical request"));
        return;
      }
      try {
        settle(computedEnvelope(request, parsedMessage.data.payload, threadId, nonce));
      } catch (cause) {
        settle(failedEnvelope(
          request,
          "digest",
          "ENVELOPE_NORMALIZATION_FAILED",
          cause instanceof Error ? cause.message : String(cause)
        ));
      }
    });
  });
}
