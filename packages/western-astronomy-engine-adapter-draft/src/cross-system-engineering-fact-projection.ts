export const WESTERN_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION =
  "hakimi.western.cross-system-engineering-facts/1.0.0" as const;

export const WESTERN_ENGINEERING_FACT_FIELDS = Object.freeze([
  "time.utcInstant",
  "time.modeledDeltaTSeconds",
  "frame.output",
  "body.sun.longitudeDeg",
  "body.moon.longitudeDeg"
] as const);

export type WesternCrossSystemEngineeringProjectedFact = Readonly<{
  field: string;
  value: string;
  sourceRef: "engineering-replay:western.synthetic-e1";
}>;

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function fact(field: string, value: string): WesternCrossSystemEngineeringProjectedFact {
  return Object.freeze({
    field,
    value,
    sourceRef: "engineering-replay:western.synthetic-e1"
  });
}

export function projectWesternCrossSystemEngineeringFacts(
  envelopeCandidate: unknown
): readonly WesternCrossSystemEngineeringProjectedFact[] {
  const envelope = record(envelopeCandidate, "western diagnostic envelope");
  if (envelope.systemId !== "western-astrology"
    || envelope.artifactKind !== "astronomy_engine_utc_position_diagnostic"
    || envelope.outcome !== "computed") {
    throw new Error("western diagnostic identity or outcome mismatch");
  }
  const evidence = record(envelope.evidence, "western diagnostic evidence");
  const strictContractRelation = record(
    envelope.strictContractRelation,
    "western strict-contract relation"
  );
  if (evidence.productionEligible !== false
    || evidence.expertTruthClaimed !== false
    || strictContractRelation.chartFixtureAccepted !== false
    || strictContractRelation.successReceiptIssued !== false) {
    throw new Error("western diagnostic authority boundary mismatch");
  }
  const result = record(envelope.result, "western diagnostic result");
  const engineTime = record(result.engineTime, "western engine time");
  const frame = record(result.frameSemantics, "western frame semantics");
  if (!Array.isArray(result.bodies) || result.bodies.length !== 2) {
    throw new Error("western diagnostic must contain the exact two projected bodies");
  }
  const bodies = new Map<string, Record<string, unknown>>();
  for (const bodyCandidate of result.bodies) {
    const body = record(bodyCandidate, "western body");
    const bodyId = stringValue(body.bodyId, "western body id");
    if (bodies.has(bodyId)) throw new Error("western body id duplicated");
    bodies.set(bodyId, body);
  }
  if (bodies.size !== 2 || !bodies.has("sun") || !bodies.has("moon")) {
    throw new Error("western diagnostic body set mismatch");
  }
  const longitude = (bodyId: "sun" | "moon"): string => {
    const body = bodies.get(bodyId)!;
    const ecliptic = record(body.trueEclipticOfDate, `western ${bodyId} ecliptic facts`);
    return String(finiteNumber(ecliptic.longitudeDeg, `western ${bodyId} longitude`));
  };

  return Object.freeze([
    fact(
      WESTERN_ENGINEERING_FACT_FIELDS[0],
      stringValue(engineTime.utcInstant, "western UTC instant")
    ),
    fact(
      WESTERN_ENGINEERING_FACT_FIELDS[1],
      String(finiteNumber(engineTime.modeledDeltaTSeconds, "western modeled Delta T"))
    ),
    fact(
      WESTERN_ENGINEERING_FACT_FIELDS[2],
      stringValue(frame.outputFrame, "western output frame")
    ),
    fact(WESTERN_ENGINEERING_FACT_FIELDS[3], longitude("sun")),
    fact(WESTERN_ENGINEERING_FACT_FIELDS[4], longitude("moon"))
  ]);
}
