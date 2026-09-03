import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_PATH =
  "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-v1.schema.json";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_ID =
  "https://hakimi.invalid/schemas/sw-ab-update-candidate-runtime-client-capture-composition-v1.json";

export function compileSwAbUpdateCandidateRuntimeClientCaptureCompositionSchema(schema) {
  return compileEvidenceSchemaForId(
    schema,
    SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_ID
  );
}

export async function loadSwAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator(
  cwd = process.cwd()
) {
  const schemaPath = path.resolve(
    cwd,
    SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_PATH
  );
  return compileSwAbUpdateCandidateRuntimeClientCaptureCompositionSchema(
    JSON.parse(await readFile(schemaPath, "utf8"))
  );
}
