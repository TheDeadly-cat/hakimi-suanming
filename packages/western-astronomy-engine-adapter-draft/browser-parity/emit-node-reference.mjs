import seedLock from "../src/diagnostic-seed-lock.json" with { type: "json" };
import {
  ASTRONOMY_ENGINE_DELTA_T_LOCK_SHA256,
  ASTRONOMY_ENGINE_RUNTIME_ESM_SHA256,
  ASTRONOMY_ENGINE_SOURCE_LOCK_SHA256,
  ASTRONOMY_ENGINE_VERSION,
  WESTERN_ASTRONOMY_PROJECTION_VERSION,
  runWesternAstronomyUtcDiagnostic
} from "../src/index.ts";
import { createHash } from "node:crypto";
import { createWesternCrossRuntimeQuantizedProjection } from "../src/browser-parity/quantized-projection.ts";

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function sha256CanonicalJson(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

const referenceSeeds = [];
for (const seed of seedLock.seeds) {
  const request = {
    protocolVersion: "western-astronomy-utc-diagnostic-request/0.1-draft",
    utcInstant: seed.utcInstant,
    bodyIds: seed.bodyIds
  };
  const envelope = await runWesternAstronomyUtcDiagnostic(request);
  if (envelope.outcome !== "computed") {
    throw new Error(`${seed.id} failed while generating the fresh Node build reference: ${envelope.failure.code}`);
  }
  if (envelope.diagnosticDigests.requestSha256 !== seed.requestSha256
    || envelope.diagnosticDigests.resultSha256 !== seed.resultSha256) {
    throw new Error(`${seed.id} no longer matches diagnostic-seed-lock.json`);
  }
  const stableProjection = createWesternCrossRuntimeQuantizedProjection(envelope.result);
  referenceSeeds.push({
    id: seed.id,
    request,
    requestSha256: envelope.diagnosticDigests.requestSha256,
    nodeRawResult: envelope.result,
    nodeRawResultSha256: envelope.diagnosticDigests.resultSha256,
    stableProjection,
    stableProjectionSha256: sha256CanonicalJson(stableProjection)
  });
}

process.stdout.write(JSON.stringify({
  schemaVersion: "western-astronomy-node-reference/0.1-draft",
  proofScope: "fresh_node_worker_build_reference_for_exact_browser_projection_parity",
  engineVersion: ASTRONOMY_ENGINE_VERSION,
  projectionVersion: WESTERN_ASTRONOMY_PROJECTION_VERSION,
  buildInputEsmSha256: ASTRONOMY_ENGINE_RUNTIME_ESM_SHA256,
  sourceLockSha256: ASTRONOMY_ENGINE_SOURCE_LOCK_SHA256,
  deltaTLockSha256: ASTRONOMY_ENGINE_DELTA_T_LOCK_SHA256,
  generatedAtBuild: true,
  seeds: referenceSeeds
}));
