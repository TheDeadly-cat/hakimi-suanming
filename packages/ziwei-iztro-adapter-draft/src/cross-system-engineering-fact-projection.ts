export const ZIWEI_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION =
  "hakimi.ziwei.cross-system-engineering-facts/1.0.0" as const;

export const ZIWEI_ENGINEERING_FACT_FIELDS = Object.freeze([
  "calendar.gregorianDate",
  "calendar.lunarDate",
  "calendar.shichen.branchId",
  "direction.resolved",
  "palace.life.branchId",
  "palace.body.branchId",
  "bureau.fiveElement"
] as const);

export type ZiweiCrossSystemEngineeringProjectedFact = Readonly<{
  field: string;
  value: string;
  sourceRef: "engineering-replay:ziwei.synthetic-e1";
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

function fact(field: string, value: string): ZiweiCrossSystemEngineeringProjectedFact {
  return Object.freeze({
    field,
    value,
    sourceRef: "engineering-replay:ziwei.synthetic-e1"
  });
}

export function projectZiweiCrossSystemEngineeringFacts(
  fixtureCandidate: unknown
): readonly ZiweiCrossSystemEngineeringProjectedFact[] {
  const fixture = record(fixtureCandidate, "ziwei fixture");
  if (fixture.systemId !== "ziwei-doushu"
    || fixture.artifactKind !== "ziwei_natal_engineering_fixture") {
    throw new Error("ziwei fixture identity mismatch");
  }
  const evidence = record(fixture.evidence, "ziwei evidence");
  if (evidence.productionEligible !== false || evidence.expertTruthClaimed !== false) {
    throw new Error("ziwei fixture authority boundary mismatch");
  }
  const receipt = record(fixture.receipt, "ziwei receipt");
  if (receipt.fallbackUsed !== false || receipt.interpretationIncluded !== false) {
    throw new Error("ziwei fixture cannot project fallback or interpretation output");
  }
  const facts = record(fixture.facts, "ziwei facts");
  const calendar = record(facts.calendarFacts, "ziwei calendar facts");
  const lunar = record(calendar.lunarDate, "ziwei lunar date");
  const shichen = record(calendar.shichen, "ziwei shichen");
  const direction = record(facts.directionBasis, "ziwei direction basis");
  const leapKind = lunar.isLeapMonth === true
    ? "leap"
    : lunar.isLeapMonth === false
      ? "regular"
      : null;
  if (leapKind === null) throw new Error("ziwei leap-month flag invalid");
  const lunarValue = [
    finiteNumber(lunar.year, "ziwei lunar year"),
    finiteNumber(lunar.month, "ziwei lunar month"),
    finiteNumber(lunar.day, "ziwei lunar day"),
    leapKind
  ].join("-");

  return Object.freeze([
    fact(
      ZIWEI_ENGINEERING_FACT_FIELDS[0],
      stringValue(calendar.gregorianDate, "ziwei gregorian date")
    ),
    fact(ZIWEI_ENGINEERING_FACT_FIELDS[1], lunarValue),
    fact(
      ZIWEI_ENGINEERING_FACT_FIELDS[2],
      stringValue(shichen.branchId, "ziwei shichen branch")
    ),
    fact(
      ZIWEI_ENGINEERING_FACT_FIELDS[3],
      stringValue(direction.resolvedDirection, "ziwei resolved direction")
    ),
    fact(
      ZIWEI_ENGINEERING_FACT_FIELDS[4],
      stringValue(facts.lifePalaceBranchId, "ziwei life palace branch")
    ),
    fact(
      ZIWEI_ENGINEERING_FACT_FIELDS[5],
      stringValue(facts.bodyPalaceBranchId, "ziwei body palace branch")
    ),
    fact(
      ZIWEI_ENGINEERING_FACT_FIELDS[6],
      stringValue(facts.fiveElementBureauId, "ziwei five-element bureau")
    )
  ]);
}
