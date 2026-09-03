import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const ROLLBACK_EVIDENCE_SCHEMA_PATH =
  "docs/release/rollback-evidence.schema.json";

export const ROLLBACK_EVIDENCE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/rollback-evidence-v1.json";

export function compileRollbackEvidenceSchema(schema) {
  return compileEvidenceSchemaForId(schema, ROLLBACK_EVIDENCE_SCHEMA_ID);
}

export async function loadRollbackEvidenceSchemaValidator(cwd = process.cwd()) {
  const schemaPath = path.resolve(cwd, ROLLBACK_EVIDENCE_SCHEMA_PATH);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileRollbackEvidenceSchema(schema);
}
