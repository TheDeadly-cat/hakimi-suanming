import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parentPort, workerData } from "node:worker_threads";

const WORKER_PROTOCOL_VERSION = "western-astronomy-engine-worker/0.1-draft";
const REQUEST_PROTOCOL_VERSION = "western-astronomy-utc-diagnostic-request/0.1-draft";
const ENGINE_VERSION = "2.1.19";
const ENGINE_NPM_INTEGRITY = "sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==";
const ENGINE_RUNTIME_ESM_SHA256 = "068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7";
const ENGINE_PACKAGE_JSON_SHA256 = "d035702763839ae11f41600cf4b8210005672658dcb19cea4a09591078af4931";
const ENGINE_SOURCE_LOCK_SHA256 = "a0d929d78cff75aa543e78350aece6a35636c4c081f5620c5a7cc9aaaf400975";
const DELTA_T_LOCK_SHA256 = "de5cb6ea1dda00ebe230394be38968b93c42b77988ba1d8437a1487fd46265f7";
const DELTA_T_MODEL_ID = "astronomy-engine@2.1.19.DeltaT_EspenakMeeus";
const DIFFERENCE_WINDOW_SECONDS = 60;
const MINIMUM_UTC_MS = Date.parse("1900-01-01T00:01:00.000Z");
const MAXIMUM_UTC_MS = Date.parse("2100-12-31T23:58:59.999Z");
const CANONICAL_UTC_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/u;
const BODY_IDS = Object.freeze([
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
]);

class DiagnosticWorkerFailure extends Error {
  constructor(stage, code, message) {
    super(message);
    this.name = "DiagnosticWorkerFailure";
    this.stage = stage;
    this.code = code;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function numberToFloat64Hex(value) {
  const bytes = Buffer.allocUnsafe(8);
  bytes.writeDoubleBE(value, 0);
  return bytes.toString("hex");
}

function assertObject(value, stage, code, message) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new DiagnosticWorkerFailure(stage, code, message);
  }
  return value;
}

function validateRequest(value) {
  const request = assertObject(value, "request_validation", "INVALID_REQUEST", "worker request must be an object");
  const keys = Object.keys(request).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["bodyIds", "protocolVersion", "utcInstant"])) {
    throw new DiagnosticWorkerFailure("request_validation", "INVALID_REQUEST", "worker request has stale or extra fields");
  }
  if (request.protocolVersion !== REQUEST_PROTOCOL_VERSION || typeof request.utcInstant !== "string") {
    throw new DiagnosticWorkerFailure("request_validation", "INVALID_REQUEST", "worker request protocol or UTC instant is invalid");
  }
  if (!CANONICAL_UTC_PATTERN.test(request.utcInstant)) {
    throw new DiagnosticWorkerFailure("request_validation", "INVALID_UTC", "UTC instant must use canonical millisecond Z form");
  }
  const utcMilliseconds = Date.parse(request.utcInstant);
  if (!Number.isFinite(utcMilliseconds) || new Date(utcMilliseconds).toISOString() !== request.utcInstant) {
    throw new DiagnosticWorkerFailure("request_validation", "INVALID_UTC", "UTC instant is not a real canonical Gregorian instant");
  }
  if (utcMilliseconds < MINIMUM_UTC_MS || utcMilliseconds > MAXIMUM_UTC_MS) {
    throw new DiagnosticWorkerFailure(
      "request_validation",
      "OUTSIDE_DIAGNOSTIC_RANGE",
      "UTC instant does not leave the fixed 60-second differential window inside 1900-2100"
    );
  }
  if (!Array.isArray(request.bodyIds) || request.bodyIds.length < 1 || request.bodyIds.length > BODY_IDS.length) {
    throw new DiagnosticWorkerFailure("request_validation", "INVALID_BODY_SET", "bodyIds must be a non-empty canonical subset");
  }
  let previousIndex = -1;
  for (const bodyId of request.bodyIds) {
    const bodyIndex = BODY_IDS.indexOf(bodyId);
    if (bodyIndex <= previousIndex) {
      throw new DiagnosticWorkerFailure("request_validation", "INVALID_BODY_SET", "bodyIds must be unique and canonically ordered");
    }
    previousIndex = bodyIndex;
  }
  return { request, utcMilliseconds };
}

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new DiagnosticWorkerFailure("normalization", "NONFINITE_OUTPUT", `${label} is not finite`);
  }
  return Object.is(value, -0) ? 0 : value;
}

function signedLongitudeDelta(laterDegrees, earlierDegrees) {
  let difference = (laterDegrees - earlierDegrees) % 360;
  if (difference >= 180) difference -= 360;
  if (difference < -180) difference += 360;
  return difference;
}

async function readJsonWithDigest(url, stage, code) {
  let bytes;
  try {
    bytes = await readFile(url);
  } catch (cause) {
    throw new DiagnosticWorkerFailure(stage, code, cause instanceof Error ? cause.message : String(cause));
  }
  try {
    return { value: JSON.parse(bytes.toString("utf8")), digest: sha256(bytes) };
  } catch (cause) {
    throw new DiagnosticWorkerFailure(stage, code, cause instanceof Error ? cause.message : String(cause));
  }
}

async function loadLockedEngine() {
  const sourceLockRecord = await readJsonWithDigest(
    new URL("./astronomy-engine-2.1.19-source-lock.json", import.meta.url),
    "source_lock",
    "SOURCE_LOCK_INVALID"
  );
  const sourceLock = assertObject(
    sourceLockRecord.value,
    "source_lock",
    "SOURCE_LOCK_INVALID",
    "Astronomy Engine source lock is invalid"
  );
  if (sourceLockRecord.digest !== ENGINE_SOURCE_LOCK_SHA256
    || sourceLock.schemaVersion !== 1
    || sourceLock.package?.version !== ENGINE_VERSION
    || sourceLock.package?.integrity !== ENGINE_NPM_INTEGRITY
    || sourceLock.runtimeFiles?.[0]?.path !== "esm/astronomy.js"
    || sourceLock.runtimeFiles?.[0]?.sha256 !== ENGINE_RUNTIME_ESM_SHA256
    || sourceLock.runtimeFiles?.[1]?.path !== "package.json"
    || sourceLock.runtimeFiles?.[1]?.sha256 !== ENGINE_PACKAGE_JSON_SHA256) {
    throw new DiagnosticWorkerFailure("source_lock", "SOURCE_LOCK_INVALID", "Astronomy Engine source lock identity drifted");
  }

  const engineModuleUrl = import.meta.resolve("astronomy-engine");
  if (!engineModuleUrl.startsWith("file:")) {
    throw new DiagnosticWorkerFailure("source_lock", "ENGINE_RESOLUTION_INVALID", "Astronomy Engine did not resolve to a local file");
  }
  const runtimeBytes = await readFile(new URL(engineModuleUrl));
  if (runtimeBytes.length !== 412025 || sha256(runtimeBytes) !== ENGINE_RUNTIME_ESM_SHA256) {
    throw new DiagnosticWorkerFailure("source_lock", "ENGINE_SOURCE_MISMATCH", "installed Astronomy Engine ESM bytes do not match the lock");
  }
  const packageJsonBytes = await readFile(new URL("../package.json", engineModuleUrl));
  if (packageJsonBytes.length !== 1078 || sha256(packageJsonBytes) !== ENGINE_PACKAGE_JSON_SHA256) {
    throw new DiagnosticWorkerFailure("source_lock", "ENGINE_SOURCE_MISMATCH", "installed Astronomy Engine package metadata does not match the lock");
  }
  const packageJson = JSON.parse(packageJsonBytes.toString("utf8"));
  if (packageJson.name !== "astronomy-engine"
    || packageJson.version !== ENGINE_VERSION
    || packageJson.license !== "MIT"
    || packageJson.dependencies !== undefined) {
    throw new DiagnosticWorkerFailure("source_lock", "ENGINE_PACKAGE_MISMATCH", "installed Astronomy Engine manifest identity drifted");
  }

  const Astronomy = await import("astronomy-engine");
  return { Astronomy, sourceLock, sourceLockSha256: sourceLockRecord.digest };
}

async function lockDeltaT(Astronomy) {
  const deltaTLockRecord = await readJsonWithDigest(
    new URL("./delta-t-model-lock.json", import.meta.url),
    "delta_t",
    "DELTA_T_LOCK_INVALID"
  );
  const deltaTLock = assertObject(
    deltaTLockRecord.value,
    "delta_t",
    "DELTA_T_LOCK_INVALID",
    "DeltaT lock is invalid"
  );
  if (deltaTLockRecord.digest !== DELTA_T_LOCK_SHA256
    || deltaTLock.schemaVersion !== 1
    || deltaTLock.modelId !== DELTA_T_MODEL_ID
    || deltaTLock.runtimeEsmSha256 !== ENGINE_RUNTIME_ESM_SHA256
    || !Array.isArray(deltaTLock.sentinels)
    || deltaTLock.sentinels.length < 5) {
    throw new DiagnosticWorkerFailure("delta_t", "DELTA_T_LOCK_INVALID", "DeltaT lock identity drifted");
  }

  Astronomy.SetDeltaTFunction(Astronomy.DeltaT_EspenakMeeus);
  for (const sentinel of deltaTLock.sentinels) {
    if (numberToFloat64Hex(sentinel.utDaysSinceJ2000) !== sentinel.utFloat64Hex) {
      throw new DiagnosticWorkerFailure("delta_t", "DELTA_T_LOCK_INVALID", `DeltaT UT sentinel ${String(sentinel.id)} drifted`);
    }
    const actualDeltaT = Astronomy.DeltaT_EspenakMeeus(sentinel.utDaysSinceJ2000);
    if (numberToFloat64Hex(actualDeltaT) !== sentinel.deltaTFloat64Hex
      || !Object.is(actualDeltaT, sentinel.deltaTSeconds)) {
      throw new DiagnosticWorkerFailure("delta_t", "DELTA_T_SENTINEL_MISMATCH", `DeltaT sentinel ${String(sentinel.id)} failed`);
    }
    const sentinelTime = new Astronomy.AstroTime(sentinel.utDaysSinceJ2000);
    if (!Object.is(sentinelTime.tt, sentinelTime.ut + actualDeltaT / 86400)) {
      throw new DiagnosticWorkerFailure("delta_t", "DELTA_T_SETTER_MISMATCH", `DeltaT setter sentinel ${String(sentinel.id)} failed`);
    }
  }
  return { deltaTLock, deltaTLockSha256: deltaTLockRecord.digest };
}

function engineBodyMap(Astronomy) {
  return Object.freeze({
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
}

function calculatePosition(Astronomy, engineBody, time) {
  const eqj = Astronomy.GeoVector(engineBody, time, false);
  const ecliptic = Astronomy.Ecliptic(eqj);
  return {
    eqj: {
      x: assertFiniteNumber(eqj.x, "EQJ x"),
      y: assertFiniteNumber(eqj.y, "EQJ y"),
      z: assertFiniteNumber(eqj.z, "EQJ z"),
      distanceAu: assertFiniteNumber(eqj.Length(), "EQJ distance")
    },
    ecliptic: {
      longitudeDeg: assertFiniteNumber(ecliptic.elon, "ecliptic longitude"),
      latitudeDeg: assertFiniteNumber(ecliptic.elat, "ecliptic latitude"),
      distanceAu: assertFiniteNumber(eqj.Length(), "ecliptic distance")
    }
  };
}

function calculateBody(Astronomy, bodyMap, bodyId, utcMilliseconds) {
  const engineBody = bodyMap[bodyId];
  const centerTime = new Astronomy.AstroTime(new Date(utcMilliseconds));
  const beforeTime = new Astronomy.AstroTime(new Date(utcMilliseconds - DIFFERENCE_WINDOW_SECONDS * 1000));
  const afterTime = new Astronomy.AstroTime(new Date(utcMilliseconds + DIFFERENCE_WINDOW_SECONDS * 1000));
  const center = calculatePosition(Astronomy, engineBody, centerTime);
  const before = calculatePosition(Astronomy, engineBody, beforeTime);
  const after = calculatePosition(Astronomy, engineBody, afterTime);
  const denominatorDays = (2 * DIFFERENCE_WINDOW_SECONDS) / 86400;

  return {
    bodyId,
    engineBodyToken: engineBody,
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
      longitudeSpeedDegPerDay: assertFiniteNumber(
        signedLongitudeDelta(after.ecliptic.longitudeDeg, before.ecliptic.longitudeDeg) / denominatorDays,
        "longitude speed"
      ),
      latitudeSpeedDegPerDay: assertFiniteNumber(
        (after.ecliptic.latitudeDeg - before.ecliptic.latitudeDeg) / denominatorDays,
        "latitude speed"
      ),
      distanceSpeedAuPerDay: assertFiniteNumber(
        (after.ecliptic.distanceAu - before.ecliptic.distanceAu) / denominatorDays,
        "distance speed"
      )
    }
  };
}

async function calculateDiagnostic() {
  if (!parentPort) {
    throw new DiagnosticWorkerFailure("worker", "WORKER_PORT_UNAVAILABLE", "worker parent port is unavailable");
  }
  const workerEnvelope = assertObject(workerData, "worker", "WORKER_PROTOCOL_INVALID", "workerData must be an object");
  if (workerEnvelope.workerProtocolVersion !== WORKER_PROTOCOL_VERSION
    || typeof workerEnvelope.nonce !== "string"
    || !/^[a-f0-9]{64}$/u.test(workerEnvelope.nonce)) {
    throw new DiagnosticWorkerFailure("worker", "WORKER_PROTOCOL_INVALID", "worker protocol identity or nonce is invalid");
  }
  const { request, utcMilliseconds } = validateRequest(workerEnvelope.request);
  const { Astronomy, sourceLock, sourceLockSha256 } = await loadLockedEngine();
  const { deltaTLock, deltaTLockSha256 } = await lockDeltaT(Astronomy);
  const centerTime = new Astronomy.AstroTime(new Date(utcMilliseconds));
  const modeledDeltaTSeconds = Astronomy.DeltaT_EspenakMeeus(centerTime.ut);
  if (!Object.is(centerTime.tt, centerTime.ut + modeledDeltaTSeconds / 86400)) {
    throw new DiagnosticWorkerFailure("delta_t", "DELTA_T_SETTER_MISMATCH", "request time did not use the locked DeltaT function");
  }
  const bodyMap = engineBodyMap(Astronomy);
  const bodies = request.bodyIds.map((bodyId) => calculateBody(Astronomy, bodyMap, bodyId, utcMilliseconds));

  return {
    workerProtocolVersion: WORKER_PROTOCOL_VERSION,
    nonce: workerEnvelope.nonce,
    ok: true,
    payload: {
      runtimeVersion: process.version,
      engine: {
        name: "astronomy-engine",
        version: ENGINE_VERSION,
        npmIntegrity: ENGINE_NPM_INTEGRITY,
        upstreamTag: sourceLock.upstreamGit.tag,
        upstreamTagObjectSha: sourceLock.upstreamGit.tagObjectSha,
        upstreamPeeledCommitSha: sourceLock.upstreamGit.peeledCommitSha,
        runtimeEsmSha256: ENGINE_RUNTIME_ESM_SHA256
      },
      sourceLockSha256,
      deltaT: {
        modelId: DELTA_T_MODEL_ID,
        lockSha256: deltaTLockSha256,
        sentinelCount: deltaTLock.sentinels.length
      },
      result: {
        projectionVersion: "western-astronomy-engine-utc-position/0.1-draft",
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
          utDaysSinceJ2000: assertFiniteNumber(centerTime.ut, "UT days"),
          ttDaysSinceJ2000: assertFiniteNumber(centerTime.tt, "TT days"),
          modeledDeltaTSeconds: assertFiniteNumber(modeledDeltaTSeconds, "modeled DeltaT"),
          utSemantics: "astronomy_engine_ut1_utc_approximation",
          deltaTSemantics: "modeled_espenak_meeus_not_leap_second_eop_provenance"
        },
        bodies
      }
    }
  };
}

async function main() {
  let message;
  try {
    message = await calculateDiagnostic();
  } catch (cause) {
    const failure = cause instanceof DiagnosticWorkerFailure
      ? cause
      : new DiagnosticWorkerFailure(
        "calculation",
        "ENGINE_CALCULATION_FAILED",
        cause instanceof Error ? cause.message : String(cause)
      );
    message = {
      workerProtocolVersion: WORKER_PROTOCOL_VERSION,
      nonce: typeof workerData?.nonce === "string" ? workerData.nonce : null,
      ok: false,
      failure: {
        stage: failure.stage,
        code: failure.code,
        message: failure.message.slice(0, 500)
      }
    };
  }
  parentPort?.postMessage(message);
  parentPort?.close();
}

await main();
