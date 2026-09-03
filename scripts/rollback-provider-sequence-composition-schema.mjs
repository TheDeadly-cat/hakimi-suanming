import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_PATH =
  "docs/release/rollback-provider-sequence-composition-candidate-v1.schema.json";

export const ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_ID =
  "https://hakimi.invalid/schemas/rollback-provider-sequence-composition-candidate-v1.json";

export function compileRollbackProviderSequenceCompositionSchema(schema) {
  return compileEvidenceSchemaForId(
    schema,
    ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_ID
  );
}

export async function loadRollbackProviderSequenceCompositionSchemaValidator(
  cwd = process.cwd()
) {
  const schemaPath = path.resolve(cwd, ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_PATH);
  return compileRollbackProviderSequenceCompositionSchema(
    JSON.parse(await readFile(schemaPath, "utf8"))
  );
}
