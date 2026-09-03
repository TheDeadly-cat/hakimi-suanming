import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH =
  "docs/release/sw-ab-update-candidate-v1.schema.json";

export const SW_AB_UPDATE_CANDIDATE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/sw-ab-update-candidate-v1.json";

export function compileSwAbUpdateCandidateSchema(schema) {
  return compileEvidenceSchemaForId(schema, SW_AB_UPDATE_CANDIDATE_SCHEMA_ID);
}

export async function loadSwAbUpdateCandidateSchemaValidator(cwd = process.cwd()) {
  const schemaPath = path.resolve(cwd, SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileSwAbUpdateCandidateSchema(schema);
}
