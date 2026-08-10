export const WESTERN_BROWSER_PARITY_PROTOCOL_VERSION =
  "western-astronomy-browser-parity/0.1-draft" as const;

export const WESTERN_BROWSER_PARITY_REFERENCE_VERSION =
  "western-astronomy-node-reference/0.1-draft" as const;

export const WESTERN_BROWSER_PARITY_BODY_IDS = Object.freeze([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
] as const);

export type WesternBrowserParityBodyId = typeof WESTERN_BROWSER_PARITY_BODY_IDS[number];

export type WesternBrowserParityRequest = Readonly<{
  protocolVersion: "western-astronomy-utc-diagnostic-request/0.1-draft";
  utcInstant: string;
  bodyIds: readonly WesternBrowserParityBodyId[];
}>;

export type WesternBrowserParityWorkerRequest = Readonly<{
  protocolVersion: typeof WESTERN_BROWSER_PARITY_PROTOCOL_VERSION;
  requestId: string;
  action: "calculate";
  request: WesternBrowserParityRequest;
}>;

export type WesternBrowserParityVector = Readonly<{
  x: number;
  y: number;
  z: number;
  distanceAu: number;
}>;

export type WesternBrowserParityEcliptic = Readonly<{
  longitudeDeg: number;
  latitudeDeg: number;
  distanceAu: number;
}>;

export type WesternBrowserParityBodyResult = Readonly<{
  bodyId: WesternBrowserParityBodyId;
  engineBodyToken: string;
  targetCenterEvidence: "upstream_body_enum_only_not_artifact_inventory";
  correctionSemantics: Readonly<{
    lightTime: "upstream_geo_moon_direct_no_explicit_backdate" | "upstream_iterative_backdate";
    stellarAberration: false;
    solarGravitationalDeflection: "not_exposed_by_astronomy_engine_public_api";
  }>;
  geoEqjAu: WesternBrowserParityVector;
  trueEclipticOfDate: WesternBrowserParityEcliptic;
  finiteDifference: Readonly<{
    algorithmId: "central_finite_difference_utc_60s_v1";
    halfWindowSeconds: 60;
    longitudeSpeedDegPerDay: number;
    latitudeSpeedDegPerDay: number;
    distanceSpeedAuPerDay: number;
  }>;
}>;

export type WesternBrowserParityResult = Readonly<{
  projectionVersion: "western-astronomy-engine-utc-position/0.1-draft";
  frameSemantics: Readonly<{
    observerOrigin: "geocenter";
    baseFrame: "astronomy_engine_eqj_j2000_mean_equator";
    outputFrame: "astronomy_engine_ect_true_ecliptic_of_date";
    stellarAberration: false;
    solarGravitationalDeflection: "not_exposed_by_astronomy_engine_public_api";
    speedAlgorithmId: "central_finite_difference_utc_60s_v1";
  }>;
  engineTime: Readonly<{
    utcInstant: string;
    utDaysSinceJ2000: number;
    ttDaysSinceJ2000: number;
    modeledDeltaTSeconds: number;
    utSemantics: "astronomy_engine_ut1_utc_approximation";
    deltaTSemantics: "modeled_espenak_meeus_not_leap_second_eop_provenance";
  }>;
  bodies: readonly WesternBrowserParityBodyResult[];
}>;

export type WesternBrowserParityAudit = Readonly<{
  engineName: "astronomy-engine";
  engineVersion: "2.1.19";
  buildInputEsmSha256: string;
  sourceLockSha256: string;
  deltaTLockSha256: string;
  deltaTModelId: "astronomy-engine@2.1.19.DeltaT_EspenakMeeus";
  rawResultSha256: string;
  stableProjectionSha256: string;
  runtime: "dedicated_browser_worker";
  isolation: "fresh_browser_worker_per_seed";
  persistence: "none";
  externalNetworkAccess: "forbidden_by_preview_csp";
  productionEligible: false;
  expertTruthClaimed: false;
}>;

export type WesternBrowserParityWorkerResponse = Readonly<{
  protocolVersion: typeof WESTERN_BROWSER_PARITY_PROTOCOL_VERSION;
  requestId: string | null;
  workerInstanceId: string;
  ok: true;
  result: WesternBrowserParityResult;
  stableProjection: import("./quantized-projection.ts").WesternCrossRuntimeQuantizedProjection;
  audit: WesternBrowserParityAudit;
}> | Readonly<{
  protocolVersion: typeof WESTERN_BROWSER_PARITY_PROTOCOL_VERSION;
  requestId: string | null;
  workerInstanceId: string;
  ok: false;
  error: Readonly<{
    code: string;
    message: string;
  }>;
}>;

export type WesternBrowserNodeReference = Readonly<{
  schemaVersion: typeof WESTERN_BROWSER_PARITY_REFERENCE_VERSION;
  proofScope: "fresh_node_worker_build_reference_for_exact_browser_projection_parity";
  engineVersion: "2.1.19";
  projectionVersion: "western-astronomy-engine-utc-position/0.1-draft";
  buildInputEsmSha256: string;
  sourceLockSha256: string;
  deltaTLockSha256: string;
  generatedAtBuild: true;
  seeds: readonly Readonly<{
    id: string;
    request: WesternBrowserParityRequest;
    requestSha256: string;
    nodeRawResult: WesternBrowserParityResult;
    nodeRawResultSha256: string;
    stableProjection: import("./quantized-projection.ts").WesternCrossRuntimeQuantizedProjection;
    stableProjectionSha256: string;
  }>[];
}>;
