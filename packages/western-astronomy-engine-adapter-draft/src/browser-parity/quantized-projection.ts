import type { WesternBrowserParityResult } from "./protocol.ts";

export const WESTERN_CROSS_RUNTIME_PROJECTION_VERSION =
  "western-astronomy-cross-runtime-projection/0.1-draft" as const;

export const WESTERN_CROSS_RUNTIME_QUANTIZATION = Object.freeze({
  algorithmId: "cross_runtime_quantized_projection_v1" as const,
  rounding: "ECMAScript_Number_toFixed_then_Number" as const,
  interpretation: "decimal_grid_half_step_not_ieee754_total_error_bound" as const,
  decimalPlaces: Object.freeze({
    engineTimeDays: 12,
    modeledDeltaTSeconds: 9,
    vectorAndDistanceAu: 12,
    eclipticAngleDegrees: 9,
    angularSpeedDegreesPerDay: 9,
    distanceSpeedAuPerDay: 9
  }),
  decimalGridHalfStep: Object.freeze({
    engineTimeDays: 5e-13,
    modeledDeltaTSeconds: 5e-10,
    vectorAndDistanceAu: 5e-13,
    eclipticAngleDegrees: 5e-10,
    angularSpeedDegreesPerDay: 5e-10,
    distanceSpeedAuPerDay: 5e-10
  })
});

export type WesternCrossRuntimeQuantizedProjection = Readonly<{
  schemaVersion: typeof WESTERN_CROSS_RUNTIME_PROJECTION_VERSION;
  proofScope: "javascript_runtime_stable_engineering_projection_not_ephemeris_accuracy";
  inputProjectionVersion: "western-astronomy-engine-utc-position/0.1-draft";
  quantization: typeof WESTERN_CROSS_RUNTIME_QUANTIZATION;
  stableResult: WesternBrowserParityResult;
}>;

export function createWesternCrossRuntimeQuantizedProjection(
  result: WesternBrowserParityResult
): WesternCrossRuntimeQuantizedProjection {
  const places = WESTERN_CROSS_RUNTIME_QUANTIZATION.decimalPlaces;
  return {
    schemaVersion: WESTERN_CROSS_RUNTIME_PROJECTION_VERSION,
    proofScope: "javascript_runtime_stable_engineering_projection_not_ephemeris_accuracy",
    inputProjectionVersion: result.projectionVersion,
    quantization: WESTERN_CROSS_RUNTIME_QUANTIZATION,
    stableResult: {
      ...result,
      engineTime: {
        ...result.engineTime,
        utDaysSinceJ2000: quantize(result.engineTime.utDaysSinceJ2000, places.engineTimeDays),
        ttDaysSinceJ2000: quantize(result.engineTime.ttDaysSinceJ2000, places.engineTimeDays),
        modeledDeltaTSeconds: quantize(result.engineTime.modeledDeltaTSeconds, places.modeledDeltaTSeconds)
      },
      bodies: result.bodies.map((body) => ({
        ...body,
        geoEqjAu: {
          x: quantize(body.geoEqjAu.x, places.vectorAndDistanceAu),
          y: quantize(body.geoEqjAu.y, places.vectorAndDistanceAu),
          z: quantize(body.geoEqjAu.z, places.vectorAndDistanceAu),
          distanceAu: quantize(body.geoEqjAu.distanceAu, places.vectorAndDistanceAu)
        },
        trueEclipticOfDate: {
          longitudeDeg: quantize(body.trueEclipticOfDate.longitudeDeg, places.eclipticAngleDegrees),
          latitudeDeg: quantize(body.trueEclipticOfDate.latitudeDeg, places.eclipticAngleDegrees),
          distanceAu: quantize(body.trueEclipticOfDate.distanceAu, places.vectorAndDistanceAu)
        },
        finiteDifference: {
          ...body.finiteDifference,
          longitudeSpeedDegPerDay: quantize(
            body.finiteDifference.longitudeSpeedDegPerDay,
            places.angularSpeedDegreesPerDay
          ),
          latitudeSpeedDegPerDay: quantize(
            body.finiteDifference.latitudeSpeedDegPerDay,
            places.angularSpeedDegreesPerDay
          ),
          distanceSpeedAuPerDay: quantize(
            body.finiteDifference.distanceSpeedAuPerDay,
            places.distanceSpeedAuPerDay
          )
        }
      }))
    }
  };
}

function quantize(value: number, decimalPlaces: number): number {
  if (!Number.isFinite(value)) throw new Error("cross-runtime projection refuses non-finite input");
  const normalized = Number(value.toFixed(decimalPlaces));
  return Object.is(normalized, -0) ? 0 : normalized;
}
