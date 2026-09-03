import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_COMPOSITION_SCHEMA_PATH =
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_COMPOSITION_SCHEMA_ID =
  "https://hakimi.invalid/schemas/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.json";

export function compileSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchema(
  schema
) {
  return compileEvidenceSchemaForId(
    schema,
    SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_COMPOSITION_SCHEMA_ID
  );
}

export async function loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchemaValidator(
  cwd = process.cwd()
) {
  const schemaPath = path.resolve(
    cwd,
    SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_COMPOSITION_SCHEMA_PATH
  );
  return compileSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchema(
    JSON.parse(await readFile(schemaPath, "utf8"))
  );
}
