import {
  WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  runWesternAstronomyUtcDiagnostic
} from "./index.ts";

const [
  utcInstant = "2025-03-20T09:01:00.000Z",
  bodyList = "sun,moon"
] = process.argv.slice(2);

const envelope = await runWesternAstronomyUtcDiagnostic({
  protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  utcInstant,
  bodyIds: bodyList.split(",").map((bodyId) => bodyId.trim()).filter(Boolean)
});

console.log(JSON.stringify(envelope, null, 2));
if (envelope.outcome !== "computed") process.exitCode = 1;
