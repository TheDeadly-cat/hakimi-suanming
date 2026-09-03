import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const DEPLOYED_PWA_EVIDENCE_V2_SCHEMA_PATH =
  "docs/release/deployed-pwa-evidence-v2.schema.json";

export const DEPLOYED_PWA_EVIDENCE_V2_SCHEMA_ID =
  "https://hakimi.invalid/schemas/deployed-pwa-evidence-v2.json";

export function compileDeployedPwaEvidenceV2Schema(schema) {
  return compileEvidenceSchemaForId(schema, DEPLOYED_PWA_EVIDENCE_V2_SCHEMA_ID);
}

export async function loadDeployedPwaEvidenceV2SchemaValidator(cwd = process.cwd()) {
  const schemaPath = path.resolve(cwd, DEPLOYED_PWA_EVIDENCE_V2_SCHEMA_PATH);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileDeployedPwaEvidenceV2Schema(schema);
}
