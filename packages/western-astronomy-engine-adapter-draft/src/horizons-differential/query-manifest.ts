export const HORIZONS_DIFFERENTIAL_MANIFEST_VERSION =
  "western-horizons-differential-query/0.2-draft" as const;

export const horizonsDifferentialQueryManifest = Object.freeze({
  schemaVersion: 2,
  manifestVersion: HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  purpose: "lock the exact JPL Horizons candidate request and comparison semantics before response bytes may pass mechanical verification",
  endpoint: "https://ssd.jpl.nasa.gov/api/horizons.api",
  requestedParameters: Object.freeze([
    "format",
    "COMMAND",
    "OBJ_DATA",
    "MAKE_EPHEM",
    "CENTER",
    "EPHEM_TYPE",
    "COORD_TYPE",
    "SITE_COORD",
    "TLIST",
    "TLIST_TYPE",
    "TIME_DIGITS",
    "TIME_TYPE",
    "CAL_TYPE",
    "REF_PLANE",
    "REF_SYSTEM",
    "OUT_UNITS",
    "VEC_TABLE",
    "VEC_CORR",
    "VEC_LABELS",
    "VEC_DELTA_T",
    "CSV_FORMAT"
  ]),
  request: Object.freeze({
    format: "text",
    COMMAND: "'10'",
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    CENTER: "'500@399'",
    EPHEM_TYPE: "VECTORS",
    COORD_TYPE: "GEODETIC",
    SITE_COORD: "'0,0,0'",
    TLIST: "'2025-03-20 09:01:00'",
    TLIST_TYPE: "CAL",
    TIME_DIGITS: "FRACSEC",
    TIME_TYPE: "UT",
    CAL_TYPE: "GREGORIAN",
    REF_PLANE: "FRAME",
    REF_SYSTEM: "ICRF",
    OUT_UNITS: "AU-D",
    VEC_TABLE: "1",
    VEC_CORR: "LT",
    VEC_LABELS: "YES",
    VEC_DELTA_T: "NO",
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
  expectedResponseSemantics: Object.freeze({
    apiSource: "NASA/JPL Horizons API",
    targetBodyName: "Sun",
    targetBodyId: "10",
    centerBodyName: "Earth",
    centerBodyId: "399",
    centerSiteName: "BODY CENTER",
    startTimeHeader: "A.D. 2025-Mar-20 09:01:00.0000 UT",
    stopTimeHeader: "A.D. 2025-Mar-20 09:01:00.0000 UT",
    stepSizeHeader: "DISCRETE TIME-LIST",
    outputUnitsHeader: "AU-D",
    calendarModeHeader: "Gregorian",
    outputTypeHeader: "LT CORRECTED cartesian states",
    outputFormatHeader: "1 (position only)",
    referenceFrameHeader: "ICRF",
    tableTimeHeader: "JDUT",
    tableAxesHeader: "X Y Z",
    rowJulianDateUtText: "2460754.875694444",
    rowCalendarLabel: "A.D. 2025-Mar-20 09:01:00.0000 UTC"
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

function encodeRfc3986QueryComponent(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/gu, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function buildHorizonsQueryUrl(
  manifest: HorizonsDifferentialQueryManifest = horizonsDifferentialQueryManifest
): string {
  const parameters = manifest.requestedParameters.map((key) => {
    const value = manifest.request[key as keyof typeof manifest.request];
    return `${key}=${encodeRfc3986QueryComponent(value)}`;
  });
  return `${manifest.endpoint}?${parameters.join("&")}`;
}
