import {
  WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  runWesternAstronomyUtcDiagnostic
} from "../index.ts";
import {
  WESTERN_RULE_LAYER_REQUEST_VERSION,
  runWesternRuleLayer
} from "./index.ts";

const [utcInstant = "2025-03-20T09:01:00.000Z"] = process.argv.slice(2);

const diagnostic = await runWesternAstronomyUtcDiagnostic({
  protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  utcInstant,
  bodyIds: ["sun", "moon"]
});

if (diagnostic.outcome !== "computed") {
  console.log(JSON.stringify(diagnostic, null, 2));
  process.exit(1);
}

// Demo-only caller-supplied chart geometry. The rule layer never computes
// RAMC, obliquity or the observer location from the astronomy diagnostic.
const ruleArtifact = runWesternRuleLayer({
  protocolVersion: WESTERN_RULE_LAYER_REQUEST_VERSION,
  inputLabel: `rule-layer demo for ${utcInstant} (Greenwich demo geometry)`,
  bodies: diagnostic.result.bodies.map((body) => ({
    bodyId: body.bodyId,
    eclipticLongitudeDeg: body.trueEclipticOfDate.longitudeDeg,
    longitudeSpeedDegPerDay: body.finiteDifference.longitudeSpeedDegPerDay
  })),
  zodiac: { kind: "tropical", ayanamshaDeg: null },
  houses: {
    systemId: "porphyry_v1",
    ramcDeg: 0,
    geographicLatitudeDeg: 51.4779,
    obliquityTrueOfDateDeg: 23.436
  },
  aspects: {
    definitions: [
      { aspectId: "conjunction", exactAngleDeg: 0, maxOrbDeg: 8 },
      { aspectId: "sextile", exactAngleDeg: 60, maxOrbDeg: 8 },
      { aspectId: "square", exactAngleDeg: 90, maxOrbDeg: 8 },
      { aspectId: "trine", exactAngleDeg: 120, maxOrbDeg: 8 },
      { aspectId: "opposition", exactAngleDeg: 180, maxOrbDeg: 8 }
    ]
  }
});

console.log(JSON.stringify(ruleArtifact, null, 2));
if (ruleArtifact.outcome !== "computed") process.exit(1);
