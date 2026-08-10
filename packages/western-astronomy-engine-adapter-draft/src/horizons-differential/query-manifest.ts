export const HORIZONS_DIFFERENTIAL_MANIFEST_VERSION =
  "western-horizons-differential-query/0.1-draft" as const;

export const horizonsDifferentialQueryManifest = Object.freeze({
  schemaVersion: 1,
  manifestVersion: HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  purpose: "lock the exact official JPL Horizons request and comparison semantics before any official response bytes may be accepted as evidence",
  endpoint: "https://ssd.jpl.nasa.gov/api/horizons.api",
  requestedParameters: Object.freeze([
    "format",
    "COMMAND",
    "CENTER",
    "EPHEM_TYPE",
    "START_TIME",
    "STOP_TIME",
    "STEP_SIZE",
    "TIME_TYPE",
    "REF_PLANE",
    "REF_SYSTEM",
    "OUT_UNITS",
    "VEC_TABLE",
    "VEC_CORR",
    "CSV_FORMAT"
  ]),
  request: Object.freeze({
    format: "text",
    COMMAND: "'10'",
    CENTER: "'500@399'",
    EPHEM_TYPE: "VECTORS",
    START_TIME: "'2025-03-20 09:01:00'",
    STOP_TIME: "'2025-03-20 09:01:00'",
    STEP_SIZE: "'1'",
    TIME_TYPE: "UT",
    REF_PLANE: "FRAME",
    REF_SYSTEM: "ICRF",
    OUT_UNITS: "AU-D",
    VEC_TABLE: "1",
    VEC_CORR: "LT",
    CSV_FORMAT: "NO"
  }),
  utcInstant: "2025-03-20T09:01:00.000Z",
  target: Object.freeze({
    bodyId: "sun",
    providerTargetId: "10",
    centerId: "500@399",
    centerKind: "geocenter"
  }),
  outputSemantics: Object.freeze({
    units: "AU-D",
    referenceFrame: "ICRF",
    referencePlane: "FRAME",
    timeType: "UT",
    correction: "LT",
    positionTableOnly: true
  }),
  comparisonSemantics: Object.freeze({
    astronomyEngineFrame: "eqj_j2000_mean_equator",
    frameBias: "not_modeled_acknowledged",
    passClaimPolicy: "never_in_draft",
    thresholdAu: null
  })
} as const);

export type HorizonsDifferentialQueryManifest =
  typeof horizonsDifferentialQueryManifest;

export function buildHorizonsQueryUrl(
  manifest: HorizonsDifferentialQueryManifest = horizonsDifferentialQueryManifest
): string {
  const parameters = manifest.requestedParameters.map((key) => {
    const value = manifest.request[key as keyof typeof manifest.request];
    return `${key}=${encodeURIComponent(value)}`;
  });
  return `${manifest.endpoint}?${parameters.join("&")}`;
}
