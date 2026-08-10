/// <reference lib="webworker" />

import * as Astronomy from "astronomy-engine";
import sourceLock from "../astronomy-engine-2.1.19-source-lock.json";
import deltaTLock from "../delta-t-model-lock.json";
import {
  WESTERN_BROWSER_PARITY_BODY_IDS,
  WESTERN_BROWSER_PARITY_PROTOCOL_VERSION,
  type WesternBrowserParityBodyId,
  type WesternBrowserParityBodyResult,
  type WesternBrowserParityRequest,
  type WesternBrowserParityResult,
  type WesternBrowserParityWorkerRequest,
  type WesternBrowserParityWorkerResponse
} from "./protocol.ts";
import { createWesternCrossRuntimeQuantizedProjection } from "./quantized-projection.ts";

const workerScope = self as DedicatedWorkerGlobalScope;
const REQUEST_PROTOCOL_VERSION = "western-astronomy-utc-diagnostic-request/0.1-draft" as const;
const PROJECTION_VERSION = "western-astronomy-engine-utc-position/0.1-draft" as const;
const ENGINE_VERSION = "2.1.19" as const;
const ENGINE_NPM_INTEGRITY =
  "sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==" as const;
const ENGINE_RUNTIME_ESM_SHA256 =
  "068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7" as const;
const ENGINE_SOURCE_LOCK_SHA256 =
  "a0d929d78cff75aa543e78350aece6a35636c4c081f5620c5a7cc9aaaf400975" as const;
const DELTA_T_LOCK_SHA256 =
  "de5cb6ea1dda00ebe230394be38968b93c42b77988ba1d8437a1487fd46265f7" as const;
const DELTA_T_MODEL_ID = "astronomy-engine@2.1.19.DeltaT_EspenakMeeus" as const;
const DIFFERENCE_WINDOW_SECONDS = 60 as const;
const MINIMUM_UTC_MS = Date.parse("1900-01-01T00:01:00.000Z");
const MAXIMUM_UTC_MS = Date.parse("2100-12-31T23:58:59.999Z");
const CANONICAL_UTC_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

class BrowserParityFailure extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BrowserParityFailure";
    this.code = code;
  }
}

workerScope.addEventListener("message", (event: MessageEvent<unknown>) => {
  void handleRequest(event.data);
}, { once: true });

async function handleRequest(candidate: unknown): Promise<void> {
  const workerInstanceId = crypto.randomUUID();
  let requestId: string | null = null;
  let response: WesternBrowserParityWorkerResponse;
  try {
    const requestEnvelope = requireWorkerRequest(candidate);
    requestId = requestEnvelope.requestId;
    requireLockedBuildInputs();
    lockAndVerifyDeltaT();
    const result = calculateResult(requestEnvelope.request);
    const stableProjection = createWesternCrossRuntimeQuantizedProjection(result);
    response = {
      protocolVersion: WESTERN_BROWSER_PARITY_PROTOCOL_VERSION,
      requestId,
      workerInstanceId,
      ok: true,
      result,
      stableProjection,
      audit: {
        engineName: "astronomy-engine",
        engineVersion: ENGINE_VERSION,
        buildInputEsmSha256: ENGINE_RUNTIME_ESM_SHA256,
        sourceLockSha256: ENGINE_SOURCE_LOCK_SHA256,
        deltaTLockSha256: DELTA_T_LOCK_SHA256,
        deltaTModelId: DELTA_T_MODEL_ID,
        rawResultSha256: await sha256CanonicalJson(result),
        stableProjectionSha256: await sha256CanonicalJson(stableProjection),
        runtime: "dedicated_browser_worker",
        isolation: "fresh_browser_worker_per_seed",
        persistence: "none",
        externalNetworkAccess: "forbidden_by_preview_csp",
        productionEligible: false,
        expertTruthClaimed: false
      }
    };
  } catch (cause) {
    const failure = cause instanceof BrowserParityFailure
      ? cause
      : new BrowserParityFailure(
        "BROWSER_CALCULATION_FAILED",
        cause instanceof Error ? cause.message : String(cause)
      );
    response = {
      protocolVersion: WESTERN_BROWSER_PARITY_PROTOCOL_VERSION,
      requestId,
      workerInstanceId,
      ok: false,
      error: {
        code: failure.code,
        message: failure.message.slice(0, 500) || "browser parity calculation failed closed"
      }
    };
  }
  workerScope.postMessage(response);
  workerScope.close();
}

function requireWorkerRequest(candidate: unknown): WesternBrowserParityWorkerRequest {
  const envelope = requireRecord(candidate, "INVALID_REQUEST", "worker request must be an object");
  requireExactKeys(
    envelope,
    ["action", "protocolVersion", "request", "requestId"],
    "INVALID_REQUEST",
    "worker request has stale or extra fields"
  );
  if (envelope.protocolVersion !== WESTERN_BROWSER_PARITY_PROTOCOL_VERSION
    || envelope.action !== "calculate") {
    fail("PROTOCOL_MISMATCH", "worker protocol or action is not supported");
  }
  if (typeof envelope.requestId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(envelope.requestId)) {
    fail("INVALID_REQUEST_ID", "worker request identity is invalid");
  }
  return {
    protocolVersion: WESTERN_BROWSER_PARITY_PROTOCOL_VERSION,
    action: "calculate",
    requestId: envelope.requestId,
    request: requireDiagnosticRequest(envelope.request)
  };
}

function requireDiagnosticRequest(candidate: unknown): WesternBrowserParityRequest {
  const request = requireRecord(candidate, "INVALID_REQUEST", "diagnostic request must be an object");
  requireExactKeys(
    request,
    ["bodyIds", "protocolVersion", "utcInstant"],
    "INVALID_REQUEST",
    "diagnostic request has stale or extra fields"
  );
  if (request.protocolVersion !== REQUEST_PROTOCOL_VERSION || typeof request.utcInstant !== "string") {
    fail("INVALID_REQUEST", "diagnostic protocol or UTC instant is invalid");
  }
  if (!CANONICAL_UTC_PATTERN.test(request.utcInstant)) {
    fail("INVALID_UTC", "UTC instant must use canonical millisecond Z form");
  }
  const utcMilliseconds = Date.parse(request.utcInstant);
  if (!Number.isFinite(utcMilliseconds) || new Date(utcMilliseconds).toISOString() !== request.utcInstant) {
    fail("INVALID_UTC", "UTC instant is not a real canonical Gregorian instant");
  }
  if (utcMilliseconds < MINIMUM_UTC_MS || utcMilliseconds > MAXIMUM_UTC_MS) {
    fail("OUTSIDE_DIAGNOSTIC_RANGE", "UTC instant does not leave the fixed differential window inside 1900-2100");
  }
  if (!Array.isArray(request.bodyIds)
    || request.bodyIds.length < 1
    || request.bodyIds.length > WESTERN_BROWSER_PARITY_BODY_IDS.length) {
    fail("INVALID_BODY_SET", "bodyIds must be a non-empty canonical subset");
  }
  const bodyIds: WesternBrowserParityBodyId[] = [];
  let previousIndex = -1;
  for (const candidateBodyId of request.bodyIds) {
    const bodyIndex = WESTERN_BROWSER_PARITY_BODY_IDS.indexOf(candidateBodyId as WesternBrowserParityBodyId);
    if (bodyIndex <= previousIndex) {
      fail("INVALID_BODY_SET", "bodyIds must be unique and canonically ordered");
    }
    bodyIds.push(WESTERN_BROWSER_PARITY_BODY_IDS[bodyIndex]!);
    previousIndex = bodyIndex;
  }
  return {
    protocolVersion: REQUEST_PROTOCOL_VERSION,
    utcInstant: request.utcInstant,
    bodyIds
  };
}

function requireLockedBuildInputs(): void {
  if (sourceLock.schemaVersion !== 1
    || sourceLock.proofScope !== "npm_tarball_identity_plus_runtime_source_bytes"
    || sourceLock.package.name !== "astronomy-engine"
    || sourceLock.package.version !== ENGINE_VERSION
    || sourceLock.package.integrity !== ENGINE_NPM_INTEGRITY
    || sourceLock.runtimeFiles[0]?.path !== "esm/astronomy.js"
    || sourceLock.runtimeFiles[0]?.sha256 !== ENGINE_RUNTIME_ESM_SHA256) {
    fail("SOURCE_LOCK_INVALID", "browser build source identity drifted");
  }
  if (!SHA256_PATTERN.test(ENGINE_SOURCE_LOCK_SHA256)
    || !SHA256_PATTERN.test(DELTA_T_LOCK_SHA256)) {
    fail("SOURCE_LOCK_INVALID", "browser source lock constants are invalid");
  }
}

function lockAndVerifyDeltaT(): void {
  if (deltaTLock.schemaVersion !== 1
    || deltaTLock.modelId !== DELTA_T_MODEL_ID
    || deltaTLock.runtimeEsmSha256 !== ENGINE_RUNTIME_ESM_SHA256
    || deltaTLock.setter !== "SetDeltaTFunction(DeltaT_EspenakMeeus)"
    || deltaTLock.sentinels.length < 5) {
    fail("DELTA_T_LOCK_INVALID", "browser DeltaT lock identity drifted");
  }
  Astronomy.SetDeltaTFunction(Astronomy.DeltaT_EspenakMeeus);
  for (const sentinel of deltaTLock.sentinels) {
    if (float64Hex(sentinel.utDaysSinceJ2000) !== sentinel.utFloat64Hex) {
      fail("DELTA_T_LOCK_INVALID", `DeltaT UT sentinel ${sentinel.id} drifted`);
    }
    const actualDeltaT = Astronomy.DeltaT_EspenakMeeus(sentinel.utDaysSinceJ2000);
    if (float64Hex(actualDeltaT) !== sentinel.deltaTFloat64Hex
      || !Object.is(actualDeltaT, sentinel.deltaTSeconds)) {
      fail("DELTA_T_SENTINEL_MISMATCH", `DeltaT sentinel ${sentinel.id} failed`);
    }
    const sentinelTime = new Astronomy.AstroTime(sentinel.utDaysSinceJ2000);
    if (!Object.is(sentinelTime.tt, sentinelTime.ut + actualDeltaT / 86400)) {
      fail("DELTA_T_SETTER_MISMATCH", `DeltaT setter sentinel ${sentinel.id} failed`);
    }
  }
}

function calculateResult(request: WesternBrowserParityRequest): WesternBrowserParityResult {
  const utcMilliseconds = Date.parse(request.utcInstant);
  const centerTime = new Astronomy.AstroTime(new Date(utcMilliseconds));
  const modeledDeltaTSeconds = Astronomy.DeltaT_EspenakMeeus(centerTime.ut);
  if (!Object.is(centerTime.tt, centerTime.ut + modeledDeltaTSeconds / 86400)) {
    fail("DELTA_T_SETTER_MISMATCH", "request time did not use the locked DeltaT function");
  }
  const bodyMap: Readonly<Record<WesternBrowserParityBodyId, Astronomy.Body>> = Object.freeze({
    sun: Astronomy.Body.Sun,
    moon: Astronomy.Body.Moon,
    mercury: Astronomy.Body.Mercury,
    venus: Astronomy.Body.Venus,
    mars: Astronomy.Body.Mars,
    jupiter: Astronomy.Body.Jupiter,
    saturn: Astronomy.Body.Saturn,
    uranus: Astronomy.Body.Uranus,
    neptune: Astronomy.Body.Neptune,
    pluto: Astronomy.Body.Pluto
  });
  return {
    projectionVersion: PROJECTION_VERSION,
    frameSemantics: {
      observerOrigin: "geocenter",
      baseFrame: "astronomy_engine_eqj_j2000_mean_equator",
      outputFrame: "astronomy_engine_ect_true_ecliptic_of_date",
      stellarAberration: false,
      solarGravitationalDeflection: "not_exposed_by_astronomy_engine_public_api",
      speedAlgorithmId: "central_finite_difference_utc_60s_v1"
    },
    engineTime: {
      utcInstant: request.utcInstant,
      utDaysSinceJ2000: finite(centerTime.ut, "UT days"),
      ttDaysSinceJ2000: finite(centerTime.tt, "TT days"),
      modeledDeltaTSeconds: finite(modeledDeltaTSeconds, "modeled DeltaT"),
      utSemantics: "astronomy_engine_ut1_utc_approximation",
      deltaTSemantics: "modeled_espenak_meeus_not_leap_second_eop_provenance"
    },
    bodies: request.bodyIds.map((bodyId) => calculateBody(bodyId, bodyMap[bodyId], utcMilliseconds))
  };
}

function calculateBody(
  bodyId: WesternBrowserParityBodyId,
  engineBody: Astronomy.Body,
  utcMilliseconds: number
): WesternBrowserParityBodyResult {
  const center = calculatePosition(engineBody, utcMilliseconds);
  const before = calculatePosition(engineBody, utcMilliseconds - DIFFERENCE_WINDOW_SECONDS * 1000);
  const after = calculatePosition(engineBody, utcMilliseconds + DIFFERENCE_WINDOW_SECONDS * 1000);
  const denominatorDays = (2 * DIFFERENCE_WINDOW_SECONDS) / 86400;
  return {
    bodyId,
    engineBodyToken: String(engineBody),
    targetCenterEvidence: "upstream_body_enum_only_not_artifact_inventory",
    correctionSemantics: {
      lightTime: bodyId === "moon"
        ? "upstream_geo_moon_direct_no_explicit_backdate"
        : "upstream_iterative_backdate",
      stellarAberration: false,
      solarGravitationalDeflection: "not_exposed_by_astronomy_engine_public_api"
    },
    geoEqjAu: center.eqj,
    trueEclipticOfDate: center.ecliptic,
    finiteDifference: {
      algorithmId: "central_finite_difference_utc_60s_v1",
      halfWindowSeconds: DIFFERENCE_WINDOW_SECONDS,
      longitudeSpeedDegPerDay: finite(
        signedLongitudeDelta(after.ecliptic.longitudeDeg, before.ecliptic.longitudeDeg) / denominatorDays,
        "longitude speed"
      ),
      latitudeSpeedDegPerDay: finite(
        (after.ecliptic.latitudeDeg - before.ecliptic.latitudeDeg) / denominatorDays,
        "latitude speed"
      ),
      distanceSpeedAuPerDay: finite(
        (after.ecliptic.distanceAu - before.ecliptic.distanceAu) / denominatorDays,
        "distance speed"
      )
    }
  };
}

function calculatePosition(engineBody: Astronomy.Body, utcMilliseconds: number): Readonly<{
  eqj: WesternBrowserParityBodyResult["geoEqjAu"];
  ecliptic: WesternBrowserParityBodyResult["trueEclipticOfDate"];
}> {
  const eqj = Astronomy.GeoVector(engineBody, new Astronomy.AstroTime(new Date(utcMilliseconds)), false);
  const ecliptic = Astronomy.Ecliptic(eqj);
  const distanceAu = finite(eqj.Length(), "position distance");
  return {
    eqj: {
      x: finite(eqj.x, "EQJ x"),
      y: finite(eqj.y, "EQJ y"),
      z: finite(eqj.z, "EQJ z"),
      distanceAu
    },
    ecliptic: {
      longitudeDeg: finite(ecliptic.elon, "ecliptic longitude"),
      latitudeDeg: finite(ecliptic.elat, "ecliptic latitude"),
      distanceAu
    }
  };
}

function signedLongitudeDelta(laterDegrees: number, earlierDegrees: number): number {
  let difference = (laterDegrees - earlierDegrees) % 360;
  if (difference >= 180) difference -= 360;
  if (difference < -180) difference += 360;
  return difference;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) fail("NONFINITE_OUTPUT", `${label} is not finite`);
  return Object.is(value, -0) ? 0 : value;
}

function float64Hex(value: number): string {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setFloat64(0, value, false);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

async function sha256CanonicalJson(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireRecord(candidate: unknown, code: string, message: string): Record<string, unknown> {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) fail(code, message);
  return candidate as Record<string, unknown>;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  code: string,
  message: string
): void {
  const actual = Object.keys(record).sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) fail(code, message);
}

function fail(code: string, message: string): never {
  throw new BrowserParityFailure(code, message);
}
