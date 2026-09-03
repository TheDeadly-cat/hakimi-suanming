// @vitest-environment node

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  runWesternAstronomyUtcDiagnostic
} from "./index.ts";
import {
  buildHorizonsQueryUrl,
  horizonsDifferentialQueryManifest,
  runHorizonsDifferential
} from "./horizons-differential/index.ts";
import {
  computeHorizonsDeltas,
  createHorizonsDifferentialReport,
  failedHorizonsDifferentialReport,
  horizonsDifferentialReportSchema,
  isMechanicallyProducedHorizonsDifferentialReport
} from "./horizons-differential/differential-report.ts";
import {
  isMechanicallyVerifiedHorizonsResponse,
  parseHorizonsVectorRows,
  verifyHorizonsResponseCandidate,
  verifyOfficialHorizonsResponse
} from "./horizons-differential/official-response.ts";

const SAMPLE_TABLE = [
  "STRUCTURE-ONLY TEST FIXTURE; NEVER AN OFFICIAL RESPONSE",
  "API VERSION: 1.2",
  "API SOURCE: NASA/JPL Horizons API",
  "Target body name: Sun (10)                        {source: TEST-FIXTURE}",
  "Center body name: Earth (399)                     {source: TEST-FIXTURE}",
  "Center-site name: BODY CENTER",
  "Start time      : A.D. 2025-Mar-20 09:01:00.0000 UT ",
  "Stop  time      : A.D. 2025-Mar-20 09:01:00.0000 UT ",
  "Step-size       : DISCRETE TIME-LIST",
  "Output units    : AU-D",
  "Calendar mode   : Gregorian",
  "Output type     : LT CORRECTED cartesian states",
  "Output format   : 1 (position only)",
  "EOP file        : structure-only-test-eop",
  "EOP coverage    : STRUCTURE-ONLY TEST FIXTURE; NO EOP PROVENANCE",
  "Reference frame : ICRF",
  "JDUT ",
  "   X     Y     Z",
  "$$SOE",
  "2460754.875694444 = A.D. 2025-Mar-20 09:01:00.0000 UTC ",
  " X = 8.914520620927780E-01 Y =-4.353587314443383E-01 Z =-1.887428179207600E-01",
  "$$EOE",
  "END STRUCTURE-ONLY TEST FIXTURE"
].join("\n");

function encoded(text = SAMPLE_TABLE): Uint8Array {
  return new TextEncoder().encode(text);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function recordWithSha(byteLength: number, digest: string, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 2,
    recordKind: "horizons_response_candidate_evidence",
    manifestVersion: horizonsDifferentialQueryManifest.manifestVersion,
    evidenceStatus: "mechanically_verified_candidate_only",
    utcInstant: "2025-03-20T09:01:00.000Z",
    providerTargetId: "10",
    centerId: "500@399",
    retrievedAtIso: "2026-08-29T00:00:00.000Z",
    sourceUrl: buildHorizonsQueryUrl(),
    byteLength,
    sha256: digest,
    responseFormat: "text",
    apiVersion: "1.2",
    apiSource: "NASA/JPL Horizons API",
    publisherAuthenticityEstablished: false,
    networkProvenanceEstablished: false,
    rightsCleared: false,
    notes: "structure_only_contract_test_fixture; never official",
    ...overrides
  };
}

function verifyFixture(text = SAMPLE_TABLE) {
  const bytes = encoded(text);
  return verifyHorizonsResponseCandidate(
    bytes,
    recordWithSha(bytes.byteLength, sha256(bytes))
  );
}

function expectBodyRejected(text: string): void {
  const bytes = encoded(text);
  expect(() => verifyHorizonsResponseCandidate(
    bytes,
    recordWithSha(bytes.byteLength, sha256(bytes))
  )).toThrow();
}

async function computedSunEnvelope() {
  return runWesternAstronomyUtcDiagnostic({
    protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
    utcInstant: "2025-03-20T09:01:00.000Z",
    bodyIds: ["sun"]
  });
}

describe("JPL Horizons differential gate (candidate-only offline mechanics)", () => {
  it("locks a valid ordered TLIST query with all output-shaping defaults explicit", () => {
    const url = buildHorizonsQueryUrl();
    expect(horizonsDifferentialQueryManifest.manifestVersion).toBe(
      "western-horizons-differential-query/0.2-draft"
    );
    expect(horizonsDifferentialQueryManifest.requestedParameters).toEqual([
      "format", "COMMAND", "OBJ_DATA", "MAKE_EPHEM", "CENTER", "EPHEM_TYPE",
      "COORD_TYPE", "SITE_COORD", "TLIST", "TLIST_TYPE", "TIME_DIGITS", "TIME_TYPE",
      "CAL_TYPE", "REF_PLANE", "REF_SYSTEM", "OUT_UNITS", "VEC_TABLE", "VEC_CORR",
      "VEC_LABELS", "VEC_DELTA_T", "CSV_FORMAT"
    ]);
    expect(url).toContain("COMMAND=%2710%27");
    expect(url).toContain("CENTER=%27500%40399%27");
    expect(url).toContain("SITE_COORD=%270%2C0%2C0%27");
    expect(url).toContain("TLIST=%272025-03-20%2009%3A01%3A00%27");
    expect(url).toContain("TLIST_TYPE=CAL");
    expect(url).toContain("TIME_DIGITS=FRACSEC");
    expect(url).toContain("CAL_TYPE=GREGORIAN");
    expect(url).toContain("VEC_LABELS=YES");
    expect(url).toContain("VEC_DELTA_T=NO");
    expect(url).not.toContain("START_TIME");
    expect(url).not.toContain("STOP_TIME");
    expect(url).not.toContain("STEP_SIZE");
    expect(url.slice(url.indexOf("?") + 1).split("&")).toHaveLength(21);
  });

  it("parses the real two-line TLIST table shape without treating the fixture as official", () => {
    const rows = parseHorizonsVectorRows(SAMPLE_TABLE);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      label: "A.D. 2025-Mar-20 09:01:00.0000 UTC",
      julianDateUt: 2460754.875694444
    });
    expect(rows[0]?.xAu).toBeCloseTo(0.891452062092778, 12);
    expect(rows[0]?.yAu).toBeCloseTo(-0.4353587314443383, 12);
    expect(rows[0]?.zAu).toBeCloseTo(-0.18874281792076002, 12);
  });

  it("requires an exact v2 record, canonical retrieval time and the full canonical query URL", () => {
    const bytes = encoded();
    const digest = sha256(bytes);
    const invalidRecords = [
      null,
      recordWithSha(bytes.byteLength, "f".repeat(64)),
      recordWithSha(bytes.byteLength + 1, digest),
      recordWithSha(bytes.byteLength, digest, { utcInstant: "2025-03-21T09:01:00.000Z" }),
      recordWithSha(bytes.byteLength, digest, { sourceUrl: `${buildHorizonsQueryUrl()}&EXTRA=1` }),
      recordWithSha(bytes.byteLength, digest, { sourceUrl: "https://ssd.jpl.nasa.gov/api/horizons.api/adjacent" }),
      recordWithSha(bytes.byteLength, digest, { retrievedAtIso: "not-a-date" }),
      recordWithSha(bytes.byteLength, digest, { retrievedAtIso: "2026-08-29T00:00:00Z" }),
      recordWithSha(bytes.byteLength, digest, { manifestVersion: "stale" }),
      recordWithSha(bytes.byteLength, digest, { apiVersion: "1.3" }),
      recordWithSha(bytes.byteLength, digest, { publisherAuthenticityEstablished: true }),
      recordWithSha(bytes.byteLength, digest, { extra: "forbidden" })
    ];
    for (const record of invalidRecords) {
      expect(() => verifyHorizonsResponseCandidate(bytes, record)).toThrow();
    }

    const accessorRecord = recordWithSha(bytes.byteLength, digest);
    Object.defineProperty(accessorRecord, "notes", {
      configurable: true,
      enumerable: true,
      get() { throw new Error("getter must not run"); }
    });
    expect(() => verifyHorizonsResponseCandidate(bytes, accessorRecord)).toThrow(/data property/u);
  });

  it("snapshots exact fixed Uint8Array bytes and rejects subtype/shared/BOM/NUL input", () => {
    const bytes = encoded();
    const digest = sha256(bytes);
    class SubclassBytes extends Uint8Array {}
    const subclass = new SubclassBytes(bytes);
    expect(() => verifyHorizonsResponseCandidate(
      subclass,
      recordWithSha(subclass.byteLength, sha256(subclass))
    )).toThrow(/exact Uint8Array/u);

    if (typeof SharedArrayBuffer !== "undefined") {
      const shared = new Uint8Array(new SharedArrayBuffer(bytes.byteLength));
      shared.set(bytes);
      expect(() => verifyHorizonsResponseCandidate(
        shared,
        recordWithSha(shared.byteLength, sha256(shared))
      )).toThrow(/non-shared/u);
    }

    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytes]);
    expect(() => verifyHorizonsResponseCandidate(
      bom,
      recordWithSha(bom.byteLength, sha256(bom))
    )).toThrow(/BOM/u);
    const nul = new Uint8Array([...bytes, 0]);
    expect(() => verifyHorizonsResponseCandidate(
      nul,
      recordWithSha(nul.byteLength, sha256(nul))
    )).toThrow(/NUL/u);
  });

  it("binds API, target, center, time, units, calendar, correction, format and frame headers", () => {
    const mutations = [
      ["API SOURCE: NASA/JPL Horizons API", "API SOURCE: example.invalid"],
      ["Target body name: Sun (10)", "Target body name: Moon (301)"],
      ["Center body name: Earth (399)", "Center body name: Mars (499)"],
      ["Center-site name: BODY CENTER", "Center-site name: TEST SITE"],
      ["A.D. 2025-Mar-20 09:01:00.0000 UT", "A.D. 2025-Mar-20 09:02:00.0000 UT"],
      ["Step-size       : DISCRETE TIME-LIST", "Step-size       : 1 minute"],
      ["Output units    : AU-D", "Output units    : KM-S"],
      ["Calendar mode   : Gregorian", "Calendar mode   : Mixed Julian/Gregorian"],
      ["Output type     : LT CORRECTED cartesian states", "Output type     : GEOMETRIC cartesian states"],
      ["Output format   : 1 (position only)", "Output format   : 3 (state vectors)"],
      ["Reference frame : ICRF", "Reference frame : B1950"]
    ] as const;
    for (const [from, to] of mutations) {
      expectBodyRejected(SAMPLE_TABLE.replace(from, to));
    }
  });

  it("requires one ordered header block and one unambiguous SOE/EOE table interval", () => {
    expectBodyRejected(SAMPLE_TABLE.replace(
      "API SOURCE: NASA/JPL Horizons API\n",
      ""
    ).replace(
      "$$EOE",
      "$$EOE\nAPI SOURCE: NASA/JPL Horizons API"
    ));
    expectBodyRejected(SAMPLE_TABLE.replace("$$SOE", "$$SOE\n$$SOE"));
    expectBodyRejected(SAMPLE_TABLE.replace("$$SOE", "$$TEMP").replace("$$EOE", "$$SOE").replace("$$TEMP", "$$EOE"));
    expectBodyRejected(`${SAMPLE_TABLE}\n X = 1 Y = 2 Z = 3`);
    expectBodyRejected(SAMPLE_TABLE.replace("2460754.875694444", "2460754.875000000"));
    expectBodyRejected(SAMPLE_TABLE.replace(
      "API SOURCE: NASA/JPL Horizons API",
      "API VERSION: 1.2\nAPI SOURCE: NASA/JPL Horizons API"
    ));
    expectBodyRejected(SAMPLE_TABLE.replace(
      "{source: TEST-FIXTURE}",
      `{source: ${"X".repeat(121)}}`
    ));
    expectBodyRejected(SAMPLE_TABLE.replace(
      "8.914520620927780E-01",
      "1.7976931348623157E+308"
    ));
  });

  it("returns a branded deep-frozen snapshot detached from caller mutations", () => {
    const bytes = encoded();
    const record = recordWithSha(bytes.byteLength, sha256(bytes));
    const verified = verifyHorizonsResponseCandidate(bytes, record);
    expect(isMechanicallyVerifiedHorizonsResponse(verified)).toBe(true);
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.evidence)).toBe(true);
    expect(Object.isFrozen(verified.responseMetadata)).toBe(true);
    expect(Object.isFrozen(verified.rows)).toBe(true);
    expect(Object.isFrozen(verified.rows[0])).toBe(true);
    record.notes = "caller mutation after verification";
    bytes.fill(0);
    expect(verified.evidence.notes).toBe("structure_only_contract_test_fixture; never official");
    expect(verified.rows[0]?.xAu).toBeCloseTo(0.891452062092778, 12);
  });

  it("never promotes mechanical candidate verification through the legacy official-evidence API", () => {
    const bytes = encoded();
    const record = recordWithSha(bytes.byteLength, sha256(bytes));
    expect(() => verifyOfficialHorizonsResponse(bytes, record)).toThrow(
      /does not establish publisher authenticity or network provenance/u
    );
  });

  it("rejects a forged response object at the direct report constructor", async () => {
    const envelope = await computedSunEnvelope();
    expect(envelope.outcome).toBe("computed");
    const forged = {
      evidence: recordWithSha(1, "0".repeat(64)),
      responseMetadata: {},
      rows: parseHorizonsVectorRows(SAMPLE_TABLE)
    };
    const report = createHorizonsDifferentialReport({
      astronomyEnvelope: envelope,
      official: forged as never
    });
    expect(report).toMatchObject({
      outcome: "failed_closed",
      result: null,
      failure: {
        code: "HORIZONS_RESPONSE_NOT_MECHANICALLY_VERIFIED",
        partialResultReturned: false
      }
    });
  });

  it("totalizes malformed direct and orchestration inputs into failed-closed reports", () => {
    const verified = verifyFixture();
    expect(createHorizonsDifferentialReport({
      astronomyEnvelope: undefined,
      official: verified
    })).toMatchObject({
      outcome: "failed_closed",
      failure: { code: "ASTRONOMY_ENVELOPE_INVALID", partialResultReturned: false }
    });
    expect(runHorizonsDifferential(null as never)).toMatchObject({
      outcome: "failed_closed",
      failure: { code: "HORIZONS_DIFFERENTIAL_INPUT_INVALID", partialResultReturned: false }
    });
    const accessorInput = {};
    Object.defineProperties(accessorInput, {
      bytes: { enumerable: true, get() { throw new Error("getter must not run"); } },
      evidenceRecord: { enumerable: true, value: null },
      astronomyEnvelope: { enumerable: true, value: null }
    });
    expect(runHorizonsDifferential(accessorInput as never)).toMatchObject({
      outcome: "failed_closed",
      failure: { code: "HORIZONS_DIFFERENTIAL_INPUT_INVALID", partialResultReturned: false }
    });
    const hostileProxy = new Proxy({}, {
      getPrototypeOf() { throw new Error("   "); }
    });
    expect(runHorizonsDifferential(hostileProxy as never)).toMatchObject({
      outcome: "failed_closed",
      failure: {
        code: "HORIZONS_DIFFERENTIAL_INPUT_INVALID",
        message: "Horizons differential failed closed",
        partialResultReturned: false
      }
    });
    expect(failedHorizonsDifferentialReport("invalid-code", "   ")).toMatchObject({
      outcome: "failed_closed",
      failure: {
        code: "HORIZONS_DIFFERENTIAL_FAILURE",
        message: "Horizons differential failed closed",
        partialResultReturned: false
      }
    });
  });

  it("computes only through the verifier and binds raw bytes, record, request and execution", async () => {
    const deltas = computeHorizonsDeltas(
      { x: 1, y: 0, z: 0, distanceAu: 1 },
      { xAu: 0.99, yAu: 0, zAu: 0 }
    );
    expect(deltas.xAuDelta).toBeCloseTo(0.01, 9);
    expect(deltas.euclideanAuDelta).toBeCloseTo(0.01, 9);

    const envelope = await computedSunEnvelope();
    expect(envelope.outcome).toBe("computed");
    const verified = verifyFixture();
    const report = createHorizonsDifferentialReport({
      astronomyEnvelope: envelope,
      official: verified
    });
    expect(report.outcome).toBe("computed");
    if (report.outcome !== "computed") throw new Error("differential report did not compute");
    expect(report.request.sourceUrl).toBe(buildHorizonsQueryUrl());
    expect(isMechanicallyProducedHorizonsDifferentialReport(report)).toBe(true);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.result)).toBe(true);
    expect(report.result).toMatchObject({
      rawResponseMechanicallyVerified: true,
      publisherAuthenticityEstablished: false,
      networkProvenanceEstablished: false,
      rightsCleared: false,
      truthAdjudicated: false,
      passClaim: false,
      comparisonSemantics: { thresholdAu: null, passClaimPolicy: "never_in_draft" },
      responseEvidence: {
        rawResponseSha256: verified.evidence.sha256,
        sourceUrl: buildHorizonsQueryUrl(),
        apiVersion: "1.2",
        apiSource: "NASA/JPL Horizons API",
        publisherAuthenticityEstablished: false,
        networkProvenanceEstablished: false,
        rightsCleared: false
      }
    });
    expect(report.result.responseEvidence.evidenceRecordSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(report.execution.frameSemantics.frameBias).toBe("not_modeled_acknowledged");
    expect(Number.isFinite(report.result.deltas.euclideanAuDelta)).toBe(true);

    const structurallyParsed = horizonsDifferentialReportSchema.parse(report);
    expect(isMechanicallyProducedHorizonsDifferentialReport(structurallyParsed)).toBe(false);

    const tampered = JSON.parse(JSON.stringify(report)) as Record<string, any>;
    tampered.execution.engine.deltaTModelId = "tampered";
    expect(() => horizonsDifferentialReportSchema.parse(tampered)).toThrow(/payload digest/u);
  });

  it("returns a failed-closed report when candidate bytes are absent", async () => {
    const envelope = await computedSunEnvelope();
    const report = runHorizonsDifferential({
      bytes: new Uint8Array(),
      evidenceRecord: null,
      astronomyEnvelope: envelope
    });
    expect(report).toMatchObject({
      outcome: "failed_closed",
      result: null,
      failure: {
        code: "HORIZONS_RESPONSE_CANDIDATE_INVALID",
        partialResultReturned: false
      }
    });
    expect(report.digests.payloadSha256).toMatch(/^[a-f0-9]{64}$/u);
  });
});
