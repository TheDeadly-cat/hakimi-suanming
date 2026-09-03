import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const DEPLOYED_PWA_EVIDENCE_V3_SCHEMA_PATH =
  "docs/release/deployed-pwa-evidence-v3.schema.json";

export const DEPLOYED_PWA_EVIDENCE_V3_SCHEMA_ID =
  "https://hakimi.invalid/schemas/deployed-pwa-evidence-v3.json";

export function compileDeployedPwaEvidenceV3Schema(schema) {
  return compileEvidenceSchemaForId(schema, DEPLOYED_PWA_EVIDENCE_V3_SCHEMA_ID);
}

export async function loadDeployedPwaEvidenceV3SchemaValidator(cwd = process.cwd()) {
  const schemaPath = path.resolve(cwd, DEPLOYED_PWA_EVIDENCE_V3_SCHEMA_PATH);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileDeployedPwaEvidenceV3Schema(schema);
}
