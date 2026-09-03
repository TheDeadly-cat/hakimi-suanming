import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const DEPLOYED_PWA_EVIDENCE_SCHEMA_PATH =
  "docs/release/deployed-pwa-evidence.schema.json";

export const DEPLOYED_PWA_EVIDENCE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/deployed-pwa-evidence-v1.json";

export function compileDeployedPwaEvidenceSchema(schema) {
  return compileEvidenceSchemaForId(schema, DEPLOYED_PWA_EVIDENCE_SCHEMA_ID);
}

export async function loadDeployedPwaEvidenceSchemaValidator(cwd = process.cwd()) {
  const schemaPath = path.resolve(cwd, DEPLOYED_PWA_EVIDENCE_SCHEMA_PATH);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileDeployedPwaEvidenceSchema(schema);
}
