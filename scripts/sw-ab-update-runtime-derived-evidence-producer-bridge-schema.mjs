import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";
import {
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH,
  parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";

export const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.json";

export function compileSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchema(schema) {
  if (
    schema?.$id !== SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_ID
    || schema?.type !== "object"
    || schema?.additionalProperties !== false
    || schema?.properties?.recordType?.const
      !== "sw_ab_update_runtime_derived_evidence_producer_bridge_publication_v1"
  ) {
    throw new Error(
      "SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_ROOT_INVALID: Schema root drifted."
    );
  }
  return compileEvidenceSchemaForId(
    schema,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_ID
  );
}

export async function loadSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchemaValidator(
  cwd = process.cwd()
) {
  const bytes = await readFile(
    path.resolve(cwd, SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH)
  );
  return compileSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchema(
    parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes(bytes, "producer bridge Schema")
  );
}
