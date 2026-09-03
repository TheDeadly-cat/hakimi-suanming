import { readFileSync, existsSync } from "node:fs";
import {
  WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  runWesternAstronomyUtcDiagnostic
} from "../index.ts";
import {
  buildHorizonsQueryUrl,
  horizonsDifferentialQueryManifest,
  runHorizonsDifferential
} from "./index.ts";

const evidenceDirectory = new URL("../../evidence/", import.meta.url);
const recordPath = new URL("horizons-2025-equinox-candidate.json", evidenceDirectory);
const responsePath = new URL("horizons-2025-equinox-candidate.txt", evidenceDirectory);

const astronomyEnvelope = await runWesternAstronomyUtcDiagnostic({
  protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  utcInstant: horizonsDifferentialQueryManifest.utcInstant,
  bodyIds: ["sun"]
});

console.log(JSON.stringify({
  manifestVersion: horizonsDifferentialQueryManifest.manifestVersion,
  queryUrl: buildHorizonsQueryUrl(),
  utcInstant: horizonsDifferentialQueryManifest.utcInstant,
  candidateRecordPresent: existsSync(recordPath),
  candidateResponsePresent: existsSync(responsePath),
  astronomyOutcome: astronomyEnvelope.outcome
}, null, 2));

if (!existsSync(recordPath) || !existsSync(responsePath)) {
  console.log(JSON.stringify({
    note: "No persisted Horizons candidate body and record are present; the differential gate fails closed and creates no synthetic evidence. A transient compatibility read is not a saved source candidate, provenance record, rights decision, or official-authenticity proof.",
    report: runHorizonsDifferential({
      bytes: new Uint8Array(),
      evidenceRecord: null,
      astronomyEnvelope
    })
  }, null, 2));
  process.exit(1);
}

const report = runHorizonsDifferential({
  bytes: new Uint8Array(readFileSync(responsePath)),
  evidenceRecord: JSON.parse(readFileSync(recordPath, "utf8")),
  astronomyEnvelope
});
console.log(JSON.stringify(report, null, 2));
if (report.outcome !== "computed") process.exit(1);
