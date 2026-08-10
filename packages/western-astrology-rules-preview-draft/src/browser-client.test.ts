// @vitest-environment node

import { describe, expect, it } from "vitest";
import { validateWesternRulesPreviewResponse } from "./browser-client.ts";

const validResponse = {
  protocolVersion: "western-astronomy-browser-parity/0.1-draft",
  requestId: "a1b2c3d4-e5f6-4a5b-8c9d-0123456789ab",
  workerInstanceId: "x",
  ok: true,
  result: {
    projectionVersion: "western-astronomy-engine-utc-position/0.1-draft",
    frameSemantics: {},
    engineTime: { utcInstant: "2025-03-20T09:01:00.000Z" },
    bodies: [
      {
        bodyId: "sun",
        trueEclipticOfDate: { longitudeDeg: 0.005, latitudeDeg: 0, distanceAu: 0.99 },
        finiteDifference: { longitudeSpeedDegPerDay: 0.99 }
      }
    ]
  },
  stableProjection: {},
  audit: {
    engineName: "astronomy-engine",
    engineVersion: "2.1.19",
    isolation: "fresh_browser_worker_per_seed",
    persistence: "none",
    externalNetworkAccess: "forbidden_by_preview_csp",
    productionEligible: false,
    expertTruthClaimed: false
  }
};

describe("Western rules preview browser client gate", () => {
  it("accepts only a single fresh audited worker response bound to the request id", () => {
    const requestId = "a1b2c3d4-e5f6-4a5b-8c9d-0123456789ab";
    const outcome = validateWesternRulesPreviewResponse(validResponse, requestId);
    expect(outcome.bodies[0]?.bodyId).toBe("sun");
    expect(outcome.audit).toMatchObject({
      isolation: "fresh_browser_worker_per_seed",
      persistence: "none",
      productionEligible: false,
      expertTruthClaimed: false
    });
  });

  it("rejects wrong request ids, fallback claims, stale protocol, or non-finite results", () => {
    const requestId = "a1b2c3d4-e5f6-4a5b-8c9d-0123456789ab";
    const mutations: unknown[] = [
      { ...validResponse, requestId: "ffffffff-ffff-4fff-8fff-ffffffffffff" },
      { ...validResponse, protocolVersion: "stale-protocol" },
      {
        ...validResponse,
        audit: { ...validResponse.audit, isolation: "reused_browser_worker" }
      },
      {
        ...validResponse,
        audit: { ...validResponse.audit, productionEligible: true }
      },
      {
        ...validResponse,
        result: {
          ...validResponse.result,
          bodies: [{
            ...validResponse.result.bodies[0],
            trueEclipticOfDate: { longitudeDeg: Number.NaN, latitudeDeg: 0, distanceAu: 1 }
          }]
        }
      }
    ];
    for (const candidate of mutations) {
      expect(() => validateWesternRulesPreviewResponse(candidate, requestId)).toThrow();
    }
  });
});
